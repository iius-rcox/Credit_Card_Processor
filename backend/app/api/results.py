"""
Results API endpoints for Credit Card Processor

Provides endpoints for retrieving processing results, managing employee data,
and handling issue resolution workflows.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Request
import json
from pathlib import Path as FilePath
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func, and_, or_, Boolean

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..models import (
    ProcessingSession, EmployeeRevision, ProcessingActivity,
    SessionStatus, ValidationStatus, ActivityType
)
from ..schemas import ErrorResponse
from ..services.results_formatter import ResultsFormatter, create_results_formatter
from pydantic import BaseModel, Field
import time
from functools import wraps
from typing import Callable


# Circuit breaker for database resilience
class DatabaseCircuitBreaker:
    """
    Circuit breaker pattern for database operations
    
    Prevents cascading failures by:
    - Opening circuit after repeated failures
    - Allowing gradual recovery with half-open state
    - Fast-failing when database is down
    """
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
        
        # Logging
        import logging
        self.logger = logging.getLogger(f"{__name__}.circuit_breaker")
    
    def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        current_time = time.time()
        
        # Check if we should transition from OPEN to HALF_OPEN
        if self.state == 'OPEN':
            if current_time - self.last_failure_time > self.timeout:
                self.state = 'HALF_OPEN'
                self.logger.info("Circuit breaker transitioning to HALF_OPEN")
            else:
                raise Exception("Circuit breaker is OPEN - database operations blocked")
        
        try:
            # Execute the function
            result = func(*args, **kwargs)
            
            # Success - reset failure count and close circuit if half-open
            if self.state == 'HALF_OPEN':
                self.state = 'CLOSED'
                self.failure_count = 0
                self.logger.info("Circuit breaker closed after successful operation")
                
            return result
            
        except Exception as e:
            # Failure - increment counter and potentially open circuit
            self.failure_count += 1
            self.last_failure_time = current_time
            
            if self.failure_count >= self.failure_threshold:
                if self.state != 'OPEN':
                    self.state = 'OPEN'
                    self.logger.error(f"Circuit breaker OPENED after {self.failure_count} failures")
            
            raise

# Global circuit breaker instance
db_circuit_breaker = DatabaseCircuitBreaker()


# Response models for results
class EmployeeResultsResponse(BaseModel):
    """Employee data with validation details"""
    revision_id: str = Field(..., description="Employee revision UUID")
    employee_id: Optional[str] = Field(None, description="Employee ID")
    employee_name: str = Field(..., description="Employee name")
    car_amount: Optional[float] = Field(None, description="Car allowance amount")
    receipt_amount: Optional[float] = Field(None, description="Receipt amount")
    validation_status: str = Field(..., description="Validation status")
    validation_flags: Dict[str, Any] = Field(default_factory=dict, description="Validation issues")
    resolved_by: Optional[str] = Field(None, description="User who resolved issues")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Delta comparison fields (if applicable)
    delta_change: Optional[str] = Field(None, description="Delta change type (new, modified, removed)")
    delta_previous_values: Optional[Dict[str, Any]] = Field(None, description="Previous values for delta comparison")


class SessionSummaryStats(BaseModel):
    """Session summary statistics"""
    total_employees: int = Field(..., description="Total employees processed")
    ready_for_export: int = Field(..., description="Employees ready for export")
    needs_attention: int = Field(..., description="Employees needing attention")
    resolved_issues: int = Field(..., description="Resolved issues")
    validation_success_rate: float = Field(..., description="Validation success rate percentage")
    
    # Delta session info
    is_delta_session: bool = Field(default=False, description="Whether this is a delta session")
    delta_base_session_name: Optional[str] = Field(None, description="Base session name for delta")
    new_employees: int = Field(default=0, description="New employees in delta")
    modified_employees: int = Field(default=0, description="Modified employees in delta") 
    removed_employees: int = Field(default=0, description="Removed employees in delta")


class SessionResultsResponse(BaseModel):
    """Complete session results response"""
    session_id: str = Field(..., description="Session UUID")
    session_name: str = Field(..., description="Session name")
    status: str = Field(..., description="Session status")
    created_by: str = Field(..., description="Session creator")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    session_summary: SessionSummaryStats = Field(..., description="Summary statistics")
    employees: List[EmployeeResultsResponse] = Field(default_factory=list, description="Employee results")


class BulkResolutionRequest(BaseModel):
    """Request model for bulk issue resolution"""
    revision_ids: List[str] = Field(..., description="List of revision IDs to resolve")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")


class ResolutionRequest(BaseModel):
    """Request model for individual issue resolution"""
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")


class ResolutionResponse(BaseModel):
    """Response model for resolution operations"""
    revision_id: str = Field(..., description="Resolved revision ID")
    success: bool = Field(..., description="Resolution success status")
    message: str = Field(..., description="Resolution result message")
    resolved_by: str = Field(..., description="User who resolved the issue")
    timestamp: datetime = Field(..., description="Resolution timestamp")


class BulkResolutionResponse(BaseModel):
    """Response model for bulk resolution operations"""
    total_requested: int = Field(..., description="Total revisions requested for resolution")
    successful_resolutions: int = Field(..., description="Number of successful resolutions")
    failed_resolutions: int = Field(..., description="Number of failed resolutions")
    results: List[ResolutionResponse] = Field(..., description="Individual resolution results")
    message: str = Field(..., description="Overall operation result")


router = APIRouter(prefix="/api/sessions", tags=["results"])
@router.get("/{session_id}/employees/{revision_id}/lines", response_model=Dict[str, Any])
async def get_employee_lines(
    session_id: str = Path(..., description="Session UUID"),
    revision_id: str = Path(..., description="Employee revision UUID"),
    source: str = Query("all", description="Source filter: all|car|receipts"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    include_raw: bool = Query(False, description="Include raw excerpts when available"),
    min_confidence: str = Query("low", description="Minimum match confidence: low|medium|high"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Return per-employee line-level data from persisted artifacts when available.
    Falls back to empty lists if artifacts are not present or feature is disabled.
    """
    from uuid import UUID
    try:
        # Access checks
        session_uuid = UUID(session_id)
        session = db.query(ProcessingSession).filter(ProcessingSession.session_id == session_uuid).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if not current_user.is_admin:
            session_creator = session.created_by.lower()
            if '\\' in session_creator:
                session_creator = session_creator.split('\\')[1]
            if session_creator != current_user.username.lower():
                raise HTTPException(status_code=403, detail="Access denied")

        # Locate employee to map revision->name/id key
        employee = db.query(EmployeeRevision).filter(
            EmployeeRevision.revision_id == revision_id,
            EmployeeRevision.session_id == session_uuid
        ).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee revision not found")

        # Feature flag gate
        from ..config import settings
        if not settings.lines_enabled:
            return {
                "employee": {
                    "revision_id": str(employee.revision_id),
                    "employee_id": employee.employee_id,
                    "employee_name": employee.employee_name,
                },
                "car_lines": [],
                "receipt_lines": [],
                "matches": [],
                "unmatched": {"car": [], "receipts": []},
                "confidence_breakdown": {"high": 0, "medium": 0, "low": 0},
                "available": False
            }

        # Build paths
        from ..config import settings as app_settings
        base_dir = FilePath(app_settings.upload_path) / session_id / "parsed"
        receipts_path = base_dir / "receipts.lines.json"
        car_path = base_dir / "car.lines.json"
        matches_path = base_dir / "matches.json"
        index_path = base_dir / "index.json"

        def safe_load(path: FilePath) -> Dict[str, Any]:
            if not path.exists():
                return {}
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}

        receipts_json = safe_load(receipts_path)
        car_json = safe_load(car_path)
        matches_json = safe_load(matches_path)
        index_json = safe_load(index_path)

        # Map to employee_key via index
        employee_key = None
        for item in (index_json.get("employees", []) or []):
            if item.get("revision_id") == str(employee.revision_id):
                employee_key = item.get("employee_key")
                break

        # Fallback key if index missing
        if not employee_key:
            employee_key = (employee.employee_name or "").replace(" ", "").upper()

        # Collect lines
        def collect(src_json: Dict[str, Any], key: str) -> List[Dict[str, Any]]:
            employees = src_json.get("employees", []) or []
            for rec in employees:
                if rec.get("employee_key") == key:
                    return rec.get("lines", [])
            return []

        car_lines = collect(car_json, employee_key)
        receipt_lines = collect(receipts_json, employee_key)

        # Apply include_raw flag
        if not include_raw:
            for arr in (car_lines, receipt_lines):
                for it in arr:
                    it.pop("raw_excerpt", None)

        # Paginate
        def paginate(arr: List[Dict[str, Any]]):
            return arr[offset: offset + limit]

        # Matches per employee
        employee_matches = []
        unmatched = {"car": [], "receipts": []}
        confidence_breakdown = {"high": 0, "medium": 0, "low": 0}
        if matches_json:
            for rec in (matches_json.get("employees", []) or []):
                if rec.get("employee_key") == employee_key:
                    # Filter by min_confidence
                    def conf_ok(c: str) -> bool:
                        order = {"low": 0, "medium": 1, "high": 2}
                        return order.get(c, 0) >= order.get(min_confidence, 0)
                    employee_matches = [m for m in (rec.get("matches", []) or []) if conf_ok(m.get("confidence", "low"))]
                    unmatched = {
                        "car": rec.get("unmatched_car", []),
                        "receipts": rec.get("unmatched_receipts", [])
                    }
                    for m in rec.get("matches", []) or []:
                        confidence_breakdown[m.get("confidence", "low")] = confidence_breakdown.get(m.get("confidence", "low"), 0) + 1
                    break

        # Source filter
        if source == "car":
            receipt_lines = []
            employee_matches = []
            unmatched["receipts"] = []
        elif source == "receipts":
            car_lines = []
            employee_matches = []
            unmatched["car"] = []

        return {
            "employee": {
                "revision_id": str(employee.revision_id),
                "employee_id": employee.employee_id,
                "employee_name": employee.employee_name,
            },
            "car_lines": paginate(car_lines),
            "receipt_lines": paginate(receipt_lines),
            "matches": employee_matches,
            "unmatched": unmatched,
            "confidence_breakdown": confidence_breakdown,
            "available": bool(car_lines or receipt_lines)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load line items: {str(e)}")


def _calculate_delta_info(session: ProcessingSession, db: Session) -> Dict[str, Any]:
    """Calculate delta session information"""
    if not session.delta_session_id:
        return {
            "is_delta_session": False,
            "delta_base_session_name": None,
            "new_employees": 0,
            "modified_employees": 0,
            "removed_employees": 0
        }
    
    # Get base session info
    base_session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session.delta_session_id
    ).first()
    
    # Count delta changes (simplified - would need more complex logic in real implementation)
    current_employees = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session.session_id
    ).all()
    
    # Simplified delta calculation - in real implementation would compare against base session
    new_count = len([e for e in current_employees if e.employee_id and e.employee_id.startswith("NEW_")])
    modified_count = len([e for e in current_employees if e.employee_id and e.employee_id.startswith("MOD_")])
    removed_count = 0  # Would need to query base session to determine removed employees
    
    return {
        "is_delta_session": True,
        "delta_base_session_name": base_session.session_name if base_session else "Unknown",
        "new_employees": new_count,
        "modified_employees": modified_count,
        "removed_employees": removed_count
    }


def _get_employee_delta_info(employee: EmployeeRevision, session: ProcessingSession) -> Dict[str, Any]:
    """Get delta change information for an employee"""
    if not session.delta_session_id:
        return {"delta_change": None, "delta_previous_values": None}
    
    # Simplified delta detection based on employee_id pattern
    if employee.employee_id:
        if employee.employee_id.startswith("NEW_"):
            return {"delta_change": "new", "delta_previous_values": None}
        elif employee.employee_id.startswith("MOD_"):
            # In real implementation, would query base session for previous values
            return {
                "delta_change": "modified",
                "delta_previous_values": {
                    "car_amount": float(employee.car_amount or 0) - 100,  # Mock previous value
                    "receipt_amount": float(employee.receipt_amount or 0) - 50,  # Mock previous value
                    "employee_name": employee.employee_name + " (Previous)"  # Mock previous name
                }
            }
    
    return {"delta_change": None, "delta_previous_values": None}


@router.get("/{session_id}/exceptions", response_model=Dict[str, Any])
async def get_session_exceptions(
    session_id: str = Path(..., description="Session UUID"),
    issue_type: Optional[str] = Query(None, description="Filter by issue type (missing_receipts, coding_issues, data_mismatches)"),
    sort_by: str = Query("employee_name", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc/desc)"),
    limit: int = Query(100, ge=1, le=500, description="Maximum results to return"),
    offset: int = Query(0, ge=0, description="Results offset for pagination"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get only employees that need attention (exception-based filtering)
    
    This endpoint returns only employees with issues that require attention,
    implementing the exception-based approach where users only see problems
    that need to be resolved.
    
    Returns employees with:
    - Missing receipt data (receipt_amount <= 0 or None)
    - Incomplete coding (validation flags indicate coding issues)
    - Data mismatches (CAR vs Receipt amount discrepancies)
    - Other validation failures
    """
    try:
        # Validate session UUID
        from uuid import UUID
        session_uuid = UUID(session_id)
        
        # Get session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check access permissions
        if not current_user.is_admin:
            session_creator = db_session.created_by.lower()
            if '\\' in session_creator:
                session_creator = session_creator.split('\\')[1]
            
            if session_creator != current_user.username.lower():
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Build query for employees with issues only
        employees_query = db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session_uuid
        )
        
        # Filter for problematic employees only
        problem_conditions = []
        
        if issue_type == "missing_receipts":
            # Only employees with missing or zero receipt amounts
            problem_conditions.append(
                or_(
                    EmployeeRevision.receipt_amount.is_(None),
                    EmployeeRevision.receipt_amount <= 0
                )
            )
        elif issue_type == "coding_issues":
            # Only employees with coding validation issues
            problem_conditions.append(
                and_(
                    EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION,
                    func.json_extract(EmployeeRevision.validation_flags, '$.coding_incomplete') == 'true'
                )
            )
        elif issue_type == "data_mismatches":
            # Only employees with amount mismatches
            problem_conditions.append(
                and_(
                    EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION,
                    func.json_extract(EmployeeRevision.validation_flags, '$.amount_mismatch') == 'true'
                )
            )
        else:
            # All problematic employees (default exception filter)
            problem_conditions.append(
                or_(
                    # Missing receipts
                    EmployeeRevision.receipt_amount.is_(None),
                    EmployeeRevision.receipt_amount <= 0,
                    # Validation issues
                    EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
                )
            )
        
        employees_query = employees_query.filter(or_(*problem_conditions))
        
        # Apply sorting
        sort_column = getattr(EmployeeRevision, sort_by, EmployeeRevision.employee_name)
        if sort_order.lower() == "desc":
            employees_query = employees_query.order_by(desc(sort_column))
        else:
            employees_query = employees_query.order_by(asc(sort_column))
        
        # Get total count before pagination
        total_count = employees_query.count()
        
        # Apply pagination
        employees = employees_query.offset(offset).limit(limit).all()
        
        # Convert to simple dicts expected by frontend ExpandableEmployeeList
        employees_data = []
        for emp in employees:
            issue_category = _categorize_employee_issues(emp)
            # Compute difference when both amounts exist
            car_amount_val = float(emp.car_amount) if emp.car_amount is not None else None
            receipt_amount_val = float(emp.receipt_amount) if emp.receipt_amount is not None else None
            difference_val = None
            if car_amount_val is not None and receipt_amount_val is not None:
                try:
                    difference_val = round(receipt_amount_val - car_amount_val, 2)
                except Exception:
                    difference_val = None
            employees_data.append({
                "revision_id": str(emp.revision_id),
                "employee_id": emp.employee_id,
                "employee_name": emp.employee_name or "Unknown",
                "car_amount": float(emp.car_amount) if emp.car_amount else None,
                "receipt_amount": float(emp.receipt_amount) if emp.receipt_amount else None,
                "difference": difference_val,
                "validation_status": emp.validation_status.value,
                "validation_flags": emp.validation_flags or {},
                "issue_category": issue_category,
                "required_action": _get_required_action(emp),
                "created_at": emp.created_at.isoformat() if emp.created_at else None,
                "updated_at": emp.updated_at.isoformat() if emp.updated_at else None
            })
        
        # Calculate summary statistics focused on issues
        issue_stats = _calculate_issue_statistics(db, session_uuid)
        
        return {
            "session_id": session_id,
            "session_name": db_session.session_name,
            "session_status": db_session.status.value,
            "employees": employees_data,
            "total_count": total_count,
            "returned_count": len(employees_data),
            "summary_statistics": issue_stats.model_dump() if hasattr(issue_stats, 'model_dump') else issue_stats.dict(),
            "processing_metadata": {
                "last_updated": db_session.updated_at.isoformat() if db_session.updated_at else None,
                "processing_completed": db_session.status == SessionStatus.COMPLETED,
                "filter_applied": "exceptions_only",
                "issue_type_filter": issue_type or "all_issues"
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid session ID: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve exceptions: {str(e)}")


@router.get("/{session_id}/summary", response_model=Dict[str, Any])
async def get_session_summary(
    request: Request,
    session_id: str = Path(..., description="Session UUID"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Enhanced session summary with comprehensive error handling and circuit breaker protection
    
    Features:
    - Circuit breaker protection for database operations
    - Comprehensive error handling with proper HTTP status codes
    - Request correlation for debugging
    - Graceful degradation during failures
    - Security-focused error messages
    """
    # Get correlation ID for request tracking
    correlation_id = getattr(request.state, 'correlation_id', 'unknown')
    
    # Import logger
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Input validation with detailed error handling
        session_uuid = _validate_session_id(session_id, correlation_id)
        
        # Database operations with circuit breaker protection
        db_session = db_circuit_breaker.call(
            _get_session_with_access_check, db, session_uuid, current_user, correlation_id
        )
        
        # Statistics calculation with circuit breaker protection
        stats = db_circuit_breaker.call(
            _calculate_comprehensive_statistics, db, session_uuid
        )
        
        # Add session metadata safely
        try:
            stats.update({
                "session_id": session_id,
                "session_name": db_session.session_name or "Unnamed Session",
                "session_status": db_session.status.value.lower(),
                "processing_completed": db_session.status == SessionStatus.COMPLETED,
                "last_updated": db_session.updated_at.isoformat() if db_session.updated_at else None,
                "created_at": db_session.created_at.isoformat() if db_session.created_at else None
            })
        except Exception as meta_error:
            logger.warning(f"[{correlation_id}] Failed to add metadata to session {session_id}: {meta_error}")
            # Continue with stats even if metadata fails
        
        # Success logging
        logger.info(f"[{correlation_id}] Session summary generated successfully for {session_id}")
        
        return stats
        
    except ValueError as e:
        logger.warning(f"[{correlation_id}] Invalid input for session {session_id}: {e}")
        raise HTTPException(status_code=400, detail="Invalid session ID format")
        
    except PermissionError as e:
        logger.warning(f"[{correlation_id}] Access denied for session {session_id}: {e}")
        raise HTTPException(status_code=403, detail="Access denied to this session")
        
    except FileNotFoundError as e:
        logger.info(f"[{correlation_id}] Session not found: {session_id}")
        raise HTTPException(status_code=404, detail="Session not found")
        
    except TimeoutError as e:
        logger.error(f"[{correlation_id}] Timeout calculating summary for {session_id}: {e}")
        raise HTTPException(status_code=504, detail="Request timeout - please try again")
        
    except ConnectionError as e:
        logger.error(f"[{correlation_id}] Database connection error for {session_id}: {e}")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
        
    except Exception as e:
        # Check if it's a circuit breaker exception
        if "Circuit breaker is OPEN" in str(e):
            logger.error(f"[{correlation_id}] Circuit breaker blocked request for {session_id}")
            raise HTTPException(status_code=503, detail="Service temporarily unavailable - please try again later")
        
        # Generic error handling - don't expose internal details
        logger.error(f"[{correlation_id}] Unexpected error in session summary {session_id}: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


def _validate_session_id(session_id: str, correlation_id: str) -> "UUID":
    """Validate and parse session ID with detailed error context"""
    try:
        from uuid import UUID
        return UUID(session_id)
    except ValueError as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[{correlation_id}] Invalid session UUID format: {session_id}")
        raise ValueError("Invalid session ID format")


def _get_session_with_access_check(db: Session, session_uuid: "UUID", current_user: "UserInfo", correlation_id: str) -> "ProcessingSession":
    """Get session with comprehensive access control and error handling"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Database query with timeout protection (using circuit breaker timeout)
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.info(f"[{correlation_id}] Session not found in database: {session_uuid}")
            raise FileNotFoundError("Session not found")
        
        # Access control check
        if not current_user.is_admin:
            if not db_session.created_by:
                logger.warning(f"[{correlation_id}] Session {session_uuid} has no creator information")
                raise PermissionError("Session access information unavailable")
            
            session_creator = db_session.created_by.lower()
            if '\\' in session_creator:
                session_creator = session_creator.split('\\')[1]
            
            if session_creator != current_user.username.lower():
                logger.warning(f"[{correlation_id}] User {current_user.username} attempted to access session owned by {session_creator}")
                raise PermissionError(f"Session belongs to different user")
        
        return db_session
        
    except (FileNotFoundError, PermissionError):
        raise  # Re-raise known exceptions
    except Exception as e:
        logger.error(f"[{correlation_id}] Database error retrieving session {session_uuid}: {e}")
        raise ConnectionError("Database operation failed")


def _categorize_employee_issues(emp: EmployeeRevision) -> str:
    """Categorize the primary issue for an employee"""
    if not emp.receipt_amount or emp.receipt_amount <= 0:
        return "missing_receipts"
    
    if emp.validation_status == ValidationStatus.NEEDS_ATTENTION:
        flags = emp.validation_flags or {}
        if flags.get("coding_incomplete"):
            return "coding_issues"
        if flags.get("amount_mismatch"):
            return "data_mismatches"
    
    return "validation_errors"


def _get_required_action(emp: EmployeeRevision) -> str:
    """Get the required action for resolving an employee's issues"""
    issue_category = _categorize_employee_issues(emp)
    
    action_map = {
        "missing_receipts": "Upload missing receipts",
        "coding_issues": "Complete expense category coding",
        "data_mismatches": "Review and correct amount discrepancies",
        "validation_errors": "Review employee data for accuracy"
    }
    
    return action_map.get(issue_category, "Review and resolve validation issues")


def _calculate_issue_statistics(db: Session, session_uuid) -> SessionSummaryStats:
    """Calculate statistics focused on issues and exceptions"""
    total_employees = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_uuid
    ).count()
    
    # Ready for export (no issues)
    ready_query = db.query(EmployeeRevision).filter(
        and_(
            EmployeeRevision.session_id == session_uuid,
            EmployeeRevision.receipt_amount > 0,
            EmployeeRevision.validation_status == ValidationStatus.VALID
        )
    )
    ready_count = ready_query.count()
    
    # Issues breakdown
    missing_receipts = db.query(EmployeeRevision).filter(
        and_(
            EmployeeRevision.session_id == session_uuid,
            or_(
                EmployeeRevision.receipt_amount.is_(None),
                EmployeeRevision.receipt_amount <= 0
            )
        )
    ).count()
    
    coding_issues = db.query(EmployeeRevision).filter(
        and_(
            EmployeeRevision.session_id == session_uuid,
            EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION,
            func.json_extract(EmployeeRevision.validation_flags, '$.coding_incomplete') == 'true'
        )
    ).count()
    
    data_mismatches = db.query(EmployeeRevision).filter(
        and_(
            EmployeeRevision.session_id == session_uuid,
            EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION,
            func.json_extract(EmployeeRevision.validation_flags, '$.amount_mismatch') == 'true'
        )
    ).count()
    
    # Needs attention: employees flagged or with missing / zero receipts
    needs_attention = db.query(EmployeeRevision).filter(
        and_(
            EmployeeRevision.session_id == session_uuid,
            or_(
                EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION,
                EmployeeRevision.receipt_amount.is_(None),
                EmployeeRevision.receipt_amount <= 0
            )
        )
    ).count()
    
    # Calculate resolved issues (those with RESOLVED validation status)
    resolved_count = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_uuid,
        EmployeeRevision.validation_status == ValidationStatus.RESOLVED
    ).count()
    
    return SessionSummaryStats(
        total_employees=total_employees,
        ready_for_export=ready_count,
        needs_attention=needs_attention,
        resolved_issues=resolved_count,
        validation_success_rate=round((ready_count / total_employees) * 100, 1) if total_employees > 0 else 0.0
    )


def _calculate_comprehensive_statistics(db: Session, session_uuid) -> Dict[str, Any]:
    """
    Efficient statistics calculation with database aggregation and chunked fallback
    
    Performance optimizations:
    - Try database-level aggregation first (fastest)
    - Fall back to memory-efficient chunked processing  
    - Never load entire dataset into memory
    - Graceful degradation for database issues
    """
    try:
        # Method 1: Try efficient database aggregation first
        stats = _try_database_aggregation(db, session_uuid)
        if stats:
            return stats
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Database aggregation failed, falling back to chunked processing: {e}")
    
    # Method 2: Fallback to memory-efficient chunked processing
    try:
        return _chunked_statistics_calculation(db, session_uuid)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Chunked processing failed, using minimal stats: {e}")
        return _get_minimal_stats(db, session_uuid)


def _try_database_aggregation(db: Session, session_uuid) -> Optional[Dict[str, Any]]:
    """Try database-level aggregation for optimal performance"""
    from typing import Optional
    from sqlalchemy import func, and_, or_
    
    # Get basic issue stats (this works reliably)
    issue_stats = _calculate_issue_statistics(db, session_uuid)
    
    base_query = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_uuid
    )
    
    # Try database JSON functions (may not be available in all SQLite versions)
    try:
        missing_receipts = base_query.filter(
            or_(
                func.json_extract(EmployeeRevision.validation_flags, '$.missing_receipt') == 'true',
                func.json_extract(EmployeeRevision.validation_flags, '$.missing_receipt') == True,
                func.json_extract(EmployeeRevision.validation_flags, '$.missing_receipt') == 1
            )
        ).count()
        
        coding_incomplete = base_query.filter(
            and_(
                EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION,
                or_(
                    func.json_extract(EmployeeRevision.validation_flags, '$.coding_incomplete') == 'true',
                    func.json_extract(EmployeeRevision.validation_flags, '$.coding_incomplete') == True,
                    func.json_extract(EmployeeRevision.validation_flags, '$.coding_incomplete') == 1
                )
            )
        ).count()
        
        data_mismatches = base_query.filter(
            and_(
                EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION,
                or_(
                    func.json_extract(EmployeeRevision.validation_flags, '$.amount_mismatch') == 'true',
                    func.json_extract(EmployeeRevision.validation_flags, '$.amount_mismatch') == True,
                    func.json_extract(EmployeeRevision.validation_flags, '$.amount_mismatch') == 1
                )
            )
        ).count()
        
    except Exception:
        # JSON functions not available or failed
        return None
    
    # Calculate processing time
    processing_time = _calculate_processing_time(db, session_uuid)
    
    return {
        "total_employees": issue_stats.total_employees,
        "ready_for_pvault": issue_stats.ready_for_export,
        "need_attention": issue_stats.needs_attention,
        "issues_breakdown": {
            "missing_receipts": missing_receipts,
            "coding_incomplete": coding_incomplete,
            "data_mismatches": data_mismatches
        },
        "export_readiness": {
            "percentage": issue_stats.validation_success_rate,
            "ready_count": issue_stats.ready_for_export,
            "total_count": issue_stats.total_employees
        },
        "status_message": f"{issue_stats.ready_for_export} ready for pVault | {issue_stats.needs_attention} need attention",
        "processing_time": processing_time
    }


def _chunked_statistics_calculation(db: Session, session_uuid, chunk_size: int = 1000) -> Dict[str, Any]:
    """
    Memory-efficient chunked processing for large datasets
    
    Processes data in chunks to avoid:
    - Memory exhaustion
    - Database timeouts
    - Connection issues
    """
    import gc
    
    # Initialize counters
    total_employees = 0
    missing_receipts = 0
    coding_incomplete = 0 
    data_mismatches = 0
    needs_attention = 0
    
    # Process in chunks to avoid memory issues
    offset = 0
    processed_chunks = 0
    
    while True:
        # Get chunk with only needed columns for efficiency
        chunk = db.query(
            EmployeeRevision.validation_status,
            EmployeeRevision.validation_flags
        ).filter(
            EmployeeRevision.session_id == session_uuid
        ).offset(offset).limit(chunk_size).all()
        
        if not chunk:
            break
        
        # Process this chunk
        for revision in chunk:
            total_employees += 1
            
            # Count needs attention
            if revision.validation_status == ValidationStatus.NEEDS_ATTENTION:
                needs_attention += 1
            
            # Safe JSON parsing
            flags = _parse_validation_flags_safely(revision.validation_flags)
            
            # Count specific issues
            if flags.get('missing_receipt') is True:
                missing_receipts += 1
                
            if flags.get('coding_incomplete') is True:
                coding_incomplete += 1
                
            if flags.get('amount_mismatch') is True:
                data_mismatches += 1
        
        offset += chunk_size
        processed_chunks += 1
        
        # Memory management for very large datasets
        if processed_chunks % 10 == 0:  # Every 10k records
            gc.collect()
    
    # Calculate derived statistics
    ready_for_export = total_employees - needs_attention
    validation_success_rate = round((ready_for_export / total_employees) * 100, 1) if total_employees > 0 else 0.0
    
    # Calculate processing time
    processing_time = _calculate_processing_time(db, session_uuid)
    
    return {
        "total_employees": total_employees,
        "ready_for_pvault": ready_for_export,
        "need_attention": needs_attention,
        "issues_breakdown": {
            "missing_receipts": missing_receipts,
            "coding_incomplete": coding_incomplete,
            "data_mismatches": data_mismatches
        },
        "export_readiness": {
            "percentage": validation_success_rate,
            "ready_count": ready_for_export,
            "total_count": total_employees
        },
        "status_message": f"{ready_for_export} ready for pVault | {needs_attention} need attention",
        "processing_time": processing_time
    }


def _parse_validation_flags_safely(validation_flags) -> Dict[str, Any]:
    """Safely parse validation flags with comprehensive error handling"""
    if not validation_flags:
        return {}
    
    try:
        if isinstance(validation_flags, dict):
            return validation_flags
        elif isinstance(validation_flags, str):
            import json
            parsed = json.loads(validation_flags)
            return parsed if isinstance(parsed, dict) else {}
        else:
            return {}
    except (json.JSONDecodeError, TypeError, ValueError, AttributeError):
        return {}


def _calculate_processing_time(db: Session, session_uuid) -> Optional[str]:
    """Calculate formatted processing time for session"""
    try:
        session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not session or not session.created_at:
            return None
        
        from datetime import datetime, timezone
        end_time = session.updated_at or datetime.now(timezone.utc)
        delta = end_time - session.created_at
        
        # Format as HH:MM:SS
        total_seconds = int(delta.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60 
        seconds = total_seconds % 60
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
    except Exception:
        return None


def _get_minimal_stats(db: Session, session_uuid) -> Dict[str, Any]:
    """Fallback minimal stats when all else fails"""
    try:
        # Just count total revisions - most basic operation
        total = db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session_uuid
        ).count()
        
        processing_time = _calculate_processing_time(db, session_uuid)
        
        return {
            "total_employees": total,
            "ready_for_pvault": total,  # Assume all ready if we can't calculate  
            "need_attention": 0,
            "issues_breakdown": {
                "missing_receipts": 0,
                "coding_incomplete": 0,
                "data_mismatches": 0
            },
            "export_readiness": {
                "percentage": 100.0,
                "ready_count": total,
                "total_count": total
            },
            "status_message": f"{total} employees processed (detailed stats unavailable)",
            "processing_time": processing_time
        }
        
    except Exception:
        return {
            "total_employees": 0,
            "ready_for_pvault": 0,
            "need_attention": 0,
            "issues_breakdown": {
                "missing_receipts": 0,
                "coding_incomplete": 0,
                "data_mismatches": 0
            },
            "export_readiness": {
                "percentage": 0.0,
                "ready_count": 0,
                "total_count": 0
            },
            "status_message": "Statistics unavailable",
            "processing_time": None
        }


@router.get("/{session_id}/results", response_model=SessionResultsResponse)
async def get_session_results(
    session_id: str = Path(..., description="Session UUID"),
    search: Optional[str] = Query(None, description="Search filter for employee names"),
    status_filter: Optional[str] = Query(None, description="Filter by validation status"),
    sort_by: str = Query("employee_name", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc/desc)"),
    limit: int = Query(100, ge=1, le=500, description="Maximum results to return"),
    offset: int = Query(0, ge=0, description="Results offset for pagination"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get comprehensive results for a processing session
    
    Returns session information, summary statistics, and employee data
    with optional filtering, searching, and pagination.
    """
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if session is completed
    if session.status not in [SessionStatus.COMPLETED, SessionStatus.FAILED]:
        raise HTTPException(
            status_code=400,
            detail=f"Session results not available. Status: {session.status.value}"
        )
    
    # Build employee query with filters
    employee_query = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_id
    )
    
    # Apply search filter
    if search:
        employee_query = employee_query.filter(
            or_(
                EmployeeRevision.employee_name.ilike(f"%{search}%"),
                EmployeeRevision.employee_id.ilike(f"%{search}%")
            )
        )
    
    # Apply status filter
    if status_filter:
        try:
            status_enum = ValidationStatus(status_filter.lower())
            employee_query = employee_query.filter(
                EmployeeRevision.validation_status == status_enum
            )
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status filter: {status_filter}")
    
    # Apply sorting
    sort_column = getattr(EmployeeRevision, sort_by, None)
    if not sort_column:
        raise HTTPException(status_code=400, detail=f"Invalid sort field: {sort_by}")
    
    if sort_order.lower() == "desc":
        employee_query = employee_query.order_by(desc(sort_column))
    else:
        employee_query = employee_query.order_by(asc(sort_column))
    
    # Apply pagination
    employees = employee_query.offset(offset).limit(limit).all()
    
    # Calculate summary statistics
    total_employees = db.query(func.count(EmployeeRevision.revision_id)).filter(
        EmployeeRevision.session_id == session_id
    ).scalar()
    
    ready_for_export = db.query(func.count(EmployeeRevision.revision_id)).filter(
        EmployeeRevision.session_id == session_id,
        EmployeeRevision.validation_status == ValidationStatus.VALID
    ).scalar()
    
    needs_attention = db.query(func.count(EmployeeRevision.revision_id)).filter(
        EmployeeRevision.session_id == session_id,
        EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
    ).scalar()
    
    resolved_issues = db.query(func.count(EmployeeRevision.revision_id)).filter(
        EmployeeRevision.session_id == session_id,
        EmployeeRevision.validation_status == ValidationStatus.RESOLVED
    ).scalar()
    
    validation_success_rate = (ready_for_export / total_employees * 100) if total_employees > 0 else 0
    
    # Calculate delta information
    delta_info = _calculate_delta_info(session, db)
    
    # Build session summary
    session_summary = SessionSummaryStats(
        total_employees=total_employees,
        ready_for_export=ready_for_export,
        needs_attention=needs_attention,
        resolved_issues=resolved_issues,
        validation_success_rate=round(validation_success_rate, 2),
        **delta_info
    )
    
    # Build employee results with delta information
    employee_results = []
    for employee in employees:
        delta_employee_info = _get_employee_delta_info(employee, session)
        
        employee_result = EmployeeResultsResponse(
            revision_id=str(employee.revision_id),
            employee_id=employee.employee_id,
            employee_name=employee.employee_name,
            car_amount=float(employee.car_amount) if employee.car_amount else None,
            receipt_amount=float(employee.receipt_amount) if employee.receipt_amount else None,
            validation_status=employee.validation_status.value,
            validation_flags=employee.validation_flags or {},
            resolved_by=employee.resolved_by,
            resolution_notes=employee.resolution_notes,
            created_at=employee.created_at,
            updated_at=employee.updated_at,
            **delta_employee_info
        )
        employee_results.append(employee_result)
    
    return SessionResultsResponse(
        session_id=str(session.session_id),
        session_name=session.session_name,
        status=session.status.value,
        created_by=session.created_by,
        created_at=session.created_at,
        updated_at=session.updated_at,
        session_summary=session_summary,
        employees=employee_results
    )


@router.get("/{session_id}/results/enhanced")
async def get_enhanced_session_results(
    session_id: str = Path(..., description="Session UUID"),
    search: Optional[str] = Query(None, description="Search filter for employee names"),
    status_filter: Optional[str] = Query(None, description="Filter by validation status"),
    sort_by: str = Query("employee_name", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc/desc)"),
    limit: int = Query(100, ge=1, le=500, description="Maximum results to return"),
    offset: int = Query(0, ge=0, description="Results offset for pagination"),
    include_metadata: bool = Query(True, description="Include additional metadata"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get enhanced comprehensive results for a processing session using ResultsFormatter
    
    Returns session information, summary statistics, and formatted employee data
    with enhanced validation flags, delta information, and additional metadata.
    Provides improved formatting for frontend consumption.
    """
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if session is completed
    if session.status not in [SessionStatus.COMPLETED, SessionStatus.FAILED]:
        raise HTTPException(
            status_code=400,
            detail=f"Session results not available. Status: {session.status.value}"
        )
    
    try:
        # Build employee query with filters
        employee_query = db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session_id
        )
        
        # Apply search filter
        if search:
            employee_query = employee_query.filter(
                or_(
                    EmployeeRevision.employee_name.ilike(f"%{search}%"),
                    EmployeeRevision.employee_id.ilike(f"%{search}%")
                )
            )
        
        # Apply status filter
        if status_filter:
            try:
                status_enum = ValidationStatus(status_filter.lower())
                employee_query = employee_query.filter(
                    EmployeeRevision.validation_status == status_enum
                )
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status filter: {status_filter}")
        
        # Apply sorting
        sort_column = getattr(EmployeeRevision, sort_by, None)
        if not sort_column:
            raise HTTPException(status_code=400, detail=f"Invalid sort field: {sort_by}")
        
        if sort_order.lower() == "desc":
            employee_query = employee_query.order_by(desc(sort_column))
        else:
            employee_query = employee_query.order_by(asc(sort_column))
        
        # Apply pagination
        employees = employee_query.offset(offset).limit(limit).all()
        
        # Create results formatter and format results
        formatter = create_results_formatter(db)
        results = formatter.format_complete_results(
            session=session,
            employees=employees,
            include_metadata=include_metadata
        )
        
        # Add pagination information
        total_count = employee_query.count()
        results["pagination"] = {
            "total": total_count,
            "offset": offset,
            "limit": limit,
            "has_more": offset + limit < total_count
        }
        
        # Add filter information
        results["applied_filters"] = {
            "search": search,
            "status_filter": status_filter,
            "sort_by": sort_by,
            "sort_order": sort_order
        }
        
        return results
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve results: {str(e)}")


@router.post("/{session_id}/employees/{revision_id}/resolve", response_model=ResolutionResponse)
async def resolve_employee_issue(
    session_id: str = Path(..., description="Session UUID"),
    revision_id: str = Path(..., description="Employee revision UUID"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
    resolution_request: Optional[ResolutionRequest] = None
):
    """
    Resolve validation issues for a specific employee revision
    
    Marks the employee revision as resolved and records resolution details.
    """
    # Verify session exists and is accessible
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get employee revision
    employee = db.query(EmployeeRevision).filter(
        EmployeeRevision.revision_id == revision_id,
        EmployeeRevision.session_id == session_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee revision not found")
    
    # Check if already resolved
    if employee.validation_status == ValidationStatus.RESOLVED:
        return ResolutionResponse(
            revision_id=str(employee.revision_id),
            success=True,
            message="Employee issue already resolved",
            resolved_by=employee.resolved_by or current_user.username,
            timestamp=employee.updated_at
        )
    
    # Only resolve if there are issues
    if employee.validation_status != ValidationStatus.NEEDS_ATTENTION:
        raise HTTPException(
            status_code=400,
            detail="Employee has no issues to resolve"
        )
    
    try:
        # Update employee resolution
        employee.validation_status = ValidationStatus.RESOLVED
        employee.resolved_by = current_user.username
        employee.resolution_notes = resolution_request.resolution_notes if resolution_request else None
        employee.updated_at = datetime.now(timezone.utc)
        
        # Log resolution activity
        activity = ProcessingActivity(
            session_id=session.session_id,
            activity_type=ActivityType.RESOLUTION,
            activity_message=f"Resolved issues for employee {employee.employee_name} ({employee.employee_id})",
            employee_id=employee.employee_id,
            created_by=current_user.username
        )
        db.add(activity)
        
        # Update session timestamp
        session.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return ResolutionResponse(
            revision_id=str(employee.revision_id),
            success=True,
            message="Employee issues resolved successfully",
            resolved_by=current_user.username,
            timestamp=employee.updated_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resolve employee issues: {str(e)}"
        )


@router.post("/{session_id}/resolve-bulk", response_model=BulkResolutionResponse)
async def bulk_resolve_issues(
    bulk_request: BulkResolutionRequest,
    session_id: str = Path(..., description="Session UUID"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Bulk resolve validation issues for multiple employee revisions
    
    Efficiently processes multiple resolution requests in a single transaction.
    """
    # Verify session exists
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not bulk_request.revision_ids:
        raise HTTPException(status_code=400, detail="No revision IDs provided")
    
    results = []
    successful_count = 0
    failed_count = 0
    
    try:
        # Process each revision
        for revision_id in bulk_request.revision_ids:
            try:
                # Get employee revision
                employee = db.query(EmployeeRevision).filter(
                    EmployeeRevision.revision_id == revision_id,
                    EmployeeRevision.session_id == session_id
                ).first()
                
                if not employee:
                    results.append(ResolutionResponse(
                        revision_id=revision_id,
                        success=False,
                        message="Employee revision not found",
                        resolved_by=current_user.username,
                        timestamp=datetime.now(timezone.utc)
                    ))
                    failed_count += 1
                    continue
                
                # Skip if already resolved
                if employee.validation_status == ValidationStatus.RESOLVED:
                    results.append(ResolutionResponse(
                        revision_id=revision_id,
                        success=True,
                        message="Already resolved",
                        resolved_by=employee.resolved_by or current_user.username,
                        timestamp=employee.updated_at
                    ))
                    successful_count += 1
                    continue
                
                # Only resolve if has issues
                if employee.validation_status != ValidationStatus.NEEDS_ATTENTION:
                    results.append(ResolutionResponse(
                        revision_id=revision_id,
                        success=False,
                        message="No issues to resolve",
                        resolved_by=current_user.username,
                        timestamp=datetime.now(timezone.utc)
                    ))
                    failed_count += 1
                    continue
                
                # Resolve the issue
                employee.validation_status = ValidationStatus.RESOLVED
                employee.resolved_by = current_user.username
                employee.resolution_notes = bulk_request.resolution_notes
                employee.updated_at = datetime.now(timezone.utc)
                
                # Log activity
                activity = ProcessingActivity(
                    session_id=session.session_id,
                    activity_type=ActivityType.RESOLUTION,
                    activity_message=f"Bulk resolved issues for employee {employee.employee_name} ({employee.employee_id})",
                    employee_id=employee.employee_id,
                    created_by=current_user.username
                )
                db.add(activity)
                
                results.append(ResolutionResponse(
                    revision_id=revision_id,
                    success=True,
                    message="Resolved successfully",
                    resolved_by=current_user.username,
                    timestamp=employee.updated_at
                ))
                successful_count += 1
                
            except Exception as e:
                results.append(ResolutionResponse(
                    revision_id=revision_id,
                    success=False,
                    message=f"Resolution failed: {str(e)}",
                    resolved_by=current_user.username,
                    timestamp=datetime.now(timezone.utc)
                ))
                failed_count += 1
        
        # Update session timestamp
        session.updated_at = datetime.now(timezone.utc)
        
        # Commit all changes
        db.commit()
        
        return BulkResolutionResponse(
            total_requested=len(bulk_request.revision_ids),
            successful_resolutions=successful_count,
            failed_resolutions=failed_count,
            results=results,
            message=f"Bulk resolution completed: {successful_count} successful, {failed_count} failed"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Bulk resolution failed: {str(e)}"
        )