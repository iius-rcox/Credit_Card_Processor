"""
Results API endpoints for Credit Card Processor

Provides endpoints for retrieving processing results, managing employee data,
and handling issue resolution workflows.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Path
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


@router.get("/{session_id}/exceptions", response_model=SessionResultsResponse)
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
        
        # Convert to response format with issue categorization
        employees_data = []
        for emp in employees:
            emp_data = EmployeeResultsResponse(
                revision_id=str(emp.revision_id),
                employee_id=emp.employee_id,
                employee_name=emp.employee_name or "Unknown",
                car_amount=float(emp.car_amount) if emp.car_amount else None,
                receipt_amount=float(emp.receipt_amount) if emp.receipt_amount else None,
                validation_status=emp.validation_status.value,
                validation_flags=emp.validation_flags or {},
                resolved_by=emp.resolved_by,
                resolution_notes=emp.resolution_notes,
                created_at=emp.created_at,
                updated_at=emp.updated_at
            )
            
            # Add issue categorization
            emp_data.validation_flags["issue_category"] = _categorize_employee_issues(emp)
            emp_data.validation_flags["required_action"] = _get_required_action(emp)
            
            employees_data.append(emp_data)
        
        # Calculate summary statistics focused on issues
        issue_stats = _calculate_issue_statistics(db, session_uuid)
        
        return SessionResultsResponse(
            session_id=session_id,
            session_name=db_session.session_name,
            session_status=db_session.status.value,
            employees=employees_data,
            total_count=total_count,
            returned_count=len(employees_data),
            summary_statistics=issue_stats,
            processing_metadata={
                "last_updated": db_session.updated_at.isoformat() if db_session.updated_at else None,
                "processing_completed": db_session.status == SessionStatus.COMPLETED,
                "filter_applied": "exceptions_only",
                "issue_type_filter": issue_type or "all_issues"
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid session ID: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve exceptions: {str(e)}")


@router.get("/{session_id}/summary", response_model=Dict[str, Any])
async def get_session_summary(
    session_id: str = Path(..., description="Session UUID"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get session summary with problem-focused metrics
    
    Returns a concise summary showing:
    - Total employees processed
    - Ready for pVault export count
    - Issues requiring attention count
    - Categorized issue breakdown
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
        
        # Calculate comprehensive statistics
        stats = _calculate_comprehensive_statistics(db, session_uuid)
        
        # Add session metadata
        stats.update({
            "session_id": session_id,
            "session_name": db_session.session_name,
            "session_status": db_session.status.value,
            "processing_completed": db_session.status == SessionStatus.COMPLETED,
            "last_updated": db_session.updated_at.isoformat() if db_session.updated_at else None,
            "created_at": db_session.created_at.isoformat() if db_session.created_at else None
        })
        
        return stats
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid session ID: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve summary: {str(e)}")


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
    
    issues_count = total_employees - ready_count
    
    # Calculate resolved issues (those with RESOLVED validation status)
    resolved_count = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_uuid,
        EmployeeRevision.is_current == True,
        EmployeeRevision.validation_status == ValidationStatus.RESOLVED
    ).count()
    
    return SessionSummaryStats(
        total_employees=total_employees,
        ready_for_export=ready_count,
        needs_attention=issues_count,
        resolved_issues=resolved_count,
        validation_success_rate=round((ready_count / total_employees) * 100, 1) if total_employees > 0 else 0.0
    )


def _calculate_comprehensive_statistics(db: Session, session_uuid) -> Dict[str, Any]:
    """Calculate comprehensive statistics for session summary"""
    issue_stats = _calculate_issue_statistics(db, session_uuid)
    
    # Calculate actual issues breakdown from validation_flags JSON column
    base_query = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_uuid,
        EmployeeRevision.is_current == True
    )
    
    # Count specific validation flag issues using proper JSON syntax
    missing_receipts = base_query.filter(
        func.json_extract(EmployeeRevision.validation_flags, '$.missing_receipt') == 'true'
    ).count()
    
    coding_incomplete = base_query.filter(
        func.json_extract(EmployeeRevision.validation_flags, '$.coding_incomplete') == 'true'
    ).count()
    
    data_mismatches = base_query.filter(
        func.json_extract(EmployeeRevision.validation_flags, '$.data_mismatch') == 'true'
    ).count()
    
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
        "status_message": f"{issue_stats.ready_for_export} ready for pVault | {issue_stats.needs_attention} need attention"
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