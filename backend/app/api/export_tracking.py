"""
Export Tracking API Endpoints
Implements Phase 3 export tracking functionality with comprehensive error handling and performance monitoring
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..models import ProcessingSession, EmployeeRevision, ValidationStatus
from ..schemas import (
    ExportTrackingRequest,
    ExportDeltaResponse,
    ExportHistoryResponse,
    MarkExportedRequest
)
from ..utils.error_handlers import db_error_handler, db_transaction_handler, log_and_track_error
from ..utils.performance_monitor import performance_monitor, export_metrics
from ..exceptions.export_exceptions import (
    ExportError, ExportGenerationError, ExportTrackingError, 
    DuplicateExportError, ExportValidationError
)

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/sessions", tags=["export-tracking"])


def check_session_access(db_session: ProcessingSession, current_user: UserInfo) -> bool:
    """
    Check if user has access to a session
    
    Args:
        db_session: Database session object
        current_user: Current authenticated user
        
    Returns:
        True if user has access, False otherwise
        
    Rules:
        - Admins can access any session
        - Non-admins can only access their own sessions
    """
    if current_user.is_admin:
        return True
    
    # Extract username from domain format if present
    session_creator = db_session.created_by.lower()
    if '\\' in session_creator:
        session_creator = session_creator.split('\\')[-1]
    
    # Additional security: validate that username doesn't contain dangerous characters
    import re
    if not re.match(r'^[a-zA-Z0-9._-]+$', session_creator):
        logger.warning(f"Invalid session creator format: {db_session.created_by}")
        return False
    
    return session_creator == current_user.username.lower()


@router.post("/{session_id}/export-delta/{export_type}", response_model=ExportDeltaResponse)
async def get_delta_export(
    session_id: str,
    export_type: str,
    request: ExportTrackingRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get delta export data - only employees not previously exported to pVault
    
    This endpoint prevents duplicate exports by tracking which employees
    have already been exported in previous operations.
    
    Args:
        session_id: UUID of the session
        export_type: Type of export (pvault, exceptions, etc.)
        request: Export tracking request with batch ID and optional filters
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        ExportDeltaResponse: Delta export data with tracking information
        
    Raises:
        HTTPException: 400 for validation errors, 403 for access denied,
                      404 for not found, 409 for duplicate export
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for delta export: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for delta export: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} denied access to delta export for session {session_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Monitor export performance
        with performance_monitor.monitor_export(
            export_type=f"delta_{export_type}", 
            employee_count=0,  # Will be updated below
            metadata={
                "session_id": session_id,
                "batch_id": request.export_batch_id,
                "user": current_user.username
            }
        ):
            # Use database error handler
            with db_error_handler(db, f"delta export {export_type}"):
                
                # Check for duplicate export batch
                existing_export = db.query(EmployeeRevision).filter(
                    EmployeeRevision.session_id == session_uuid,
                    EmployeeRevision.export_batch_id == request.export_batch_id
                ).first()
                
                if existing_export:
                    raise DuplicateExportError(
                        f"Export batch {request.export_batch_id} already exists",
                        session_id=session_id,
                        existing_batch_id=request.export_batch_id
                    )
                
                # Build query for employees not yet exported
                query = db.query(EmployeeRevision).filter(
                    EmployeeRevision.session_id == session_uuid,
                    EmployeeRevision.exported_to_pvault == False
                )
                
                # Apply employee ID filter if provided
                if request.employee_ids:
                    if len(request.employee_ids) > 10000:
                        raise ExportValidationError(
                            "Too many employee IDs specified (max 10,000)",
                            validation_errors=["employee_ids: exceeds maximum limit"]
                        )
                    query = query.filter(EmployeeRevision.employee_id.in_(request.employee_ids))
                
                # Apply export type filter
                if export_type == "pvault":
                    # Only valid and resolved employees for pVault
                    query = query.filter(
                        EmployeeRevision.validation_status.in_([ValidationStatus.VALID, ValidationStatus.RESOLVED])
                    )
                elif export_type == "exceptions":
                    # Only employees with issues for exceptions export
                    query = query.filter(
                        EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
                    )
                
                # Get delta employees
                delta_employees = query.all()
                
                if not delta_employees:
                    logger.info(f"No delta employees found for export {export_type} in session {session_id}")
                    return ExportDeltaResponse(
                        session_id=session_id,
                        export_type=export_type,
                        export_batch_id=request.export_batch_id,
                        delta_employees=[],
                        total_count=0,
                        exported_count=0,
                        skipped_count=0,
                        export_ready=False,
                        message="No new employees available for export"
                    )
                
                # Convert to export format
                export_data = []
                for employee in delta_employees:
                    export_data.append({
                        "employee_id": employee.employee_id,
                        "employee_name": employee.employee_name,
                        "validation_status": employee.validation_status.value,
                        "car_total": float(employee.car_total or 0),
                        "receipt_total": float(employee.receipt_total or 0),
                        "total_expenses": float(employee.total_expenses or 0),
                        "last_updated": employee.updated_at,
                        "processing_notes": employee.processing_notes,
                        "car_pages": employee.car_pages,
                        "receipt_pages": employee.receipt_pages
                    })
                
                logger.info(
                    f"Delta export prepared: {len(export_data)} employees for {export_type} "
                    f"in session {session_id} (batch: {request.export_batch_id})"
                )
                
                return ExportDeltaResponse(
                    session_id=session_id,
                    export_type=export_type,
                    export_batch_id=request.export_batch_id,
                    delta_employees=export_data,
                    total_count=len(export_data),
                    exported_count=0,  # Will be updated when marked as exported
                    skipped_count=0,
                    export_ready=len(export_data) > 0,
                    message=f"Found {len(export_data)} employees ready for {export_type} export"
                )
                
    except (ExportError, DuplicateExportError, ExportValidationError) as e:
        log_and_track_error(e, {"session_id": session_id, "export_type": export_type})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST if isinstance(e, ExportValidationError) else status.HTTP_409_CONFLICT,
            detail=e.message,
            headers={"X-Error-Code": e.error_code}
        )
    except HTTPException:
        raise
    except Exception as e:
        log_and_track_error(e, {"session_id": session_id, "export_type": export_type})
        logger.error(f"Unexpected error in delta export for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate delta export"
        )


@router.post("/{session_id}/mark-exported")
async def mark_employees_exported(
    session_id: str,
    request: MarkExportedRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Mark employees as successfully exported to prevent duplicates
    
    This endpoint updates the export tracking fields after a successful
    export operation to pVault or other external systems.
    
    Args:
        session_id: UUID of the session
        request: Mark exported request with batch ID and employee list
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Dictionary with tracking update results
        
    Raises:
        HTTPException: 400 for validation errors, 403 for access denied,
                      404 for not found
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for mark exported: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for mark exported: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} denied access to mark exported for session {session_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Use database transaction handler
        with db_transaction_handler(db, "mark employees exported"):
            
            # Validate employee IDs exist in session
            valid_employees = db.query(EmployeeRevision).filter(
                EmployeeRevision.session_id == session_uuid,
                EmployeeRevision.employee_id.in_(request.employee_ids)
            ).all()
            
            if len(valid_employees) != len(request.employee_ids):
                found_ids = {emp.employee_id for emp in valid_employees}
                missing_ids = set(request.employee_ids) - found_ids
                raise ExportTrackingError(
                    f"Some employee IDs not found: {list(missing_ids)}",
                    session_id=session_id,
                    batch_id=request.export_batch_id
                )
            
            # Update export tracking fields
            export_timestamp = datetime.now(timezone.utc)
            updated_count = 0
            
            for employee in valid_employees:
                if not employee.exported_to_pvault:  # Only update if not already exported
                    employee.exported_to_pvault = True
                    employee.export_timestamp = export_timestamp
                    employee.export_batch_id = request.export_batch_id
                    employee.last_export_type = request.export_type
                    if request.export_notes:
                        employee.export_notes = request.export_notes
                    updated_count += 1
                
            # Record export metrics
            export_metrics.record_export(
                export_type=request.export_type,
                export_format=request.export_type,
                employee_count=updated_count,
                duration=0.1,  # Minimal duration for marking
                success=True,
                session_id=session_id
            )
            
            logger.info(
                f"Marked {updated_count} employees as exported in session {session_id} "
                f"(batch: {request.export_batch_id}, type: {request.export_type})"
            )
            
            return {
                "session_id": session_id,
                "export_batch_id": request.export_batch_id,
                "export_type": request.export_type,
                "employees_marked": updated_count,
                "already_exported": len(request.employee_ids) - updated_count,
                "export_timestamp": export_timestamp.isoformat(),
                "message": f"Successfully marked {updated_count} employees as exported"
            }
            
    except ExportTrackingError as e:
        log_and_track_error(e, {"session_id": session_id, "batch_id": request.export_batch_id})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
            headers={"X-Error-Code": e.error_code}
        )
    except HTTPException:
        raise
    except Exception as e:
        log_and_track_error(e, {"session_id": session_id, "batch_id": request.export_batch_id})
        logger.error(f"Unexpected error marking employees exported for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark employees as exported"
        )


@router.get("/{session_id}/export-history", response_model=ExportHistoryResponse)
async def get_export_history(
    session_id: str,
    export_type: Optional[str] = Query(None, description="Filter by export type"),
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of records"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get export history for a session
    
    This endpoint provides a complete audit trail of all export operations
    performed on the session's employee data.
    
    Args:
        session_id: UUID of the session
        export_type: Optional filter by export type
        limit: Maximum number of history records to return
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        ExportHistoryResponse: Complete export history with statistics
        
    Raises:
        HTTPException: 400 for validation errors, 403 for access denied,
                      404 for not found
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for export history: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for export history: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} denied access to export history for session {session_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Build query for exported employees
        query = db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session_uuid,
            EmployeeRevision.exported_to_pvault == True
        )
        
        # Apply export type filter if provided
        if export_type:
            query = query.filter(EmployeeRevision.last_export_type == export_type)
        
        # Order by export timestamp (most recent first)
        query = query.order_by(EmployeeRevision.export_timestamp.desc())
        
        # Apply limit
        exported_employees = query.limit(limit).all()
        
        # Build export history records
        export_records = []
        batch_summary = {}
        
        for employee in exported_employees:
            record = {
                "employee_id": employee.employee_id,
                "employee_name": employee.employee_name,
                "export_batch_id": employee.export_batch_id,
                "export_type": employee.last_export_type,
                "export_timestamp": employee.export_timestamp,
                "total_expenses": float(employee.total_expenses or 0),
                "validation_status": employee.validation_status.value,
                "export_notes": employee.export_notes
            }
            export_records.append(record)
            
            # Aggregate batch statistics
            batch_id = employee.export_batch_id
            if batch_id not in batch_summary:
                batch_summary[batch_id] = {
                    "batch_id": batch_id,
                    "export_type": employee.last_export_type,
                    "export_timestamp": employee.export_timestamp,
                    "employee_count": 0,
                    "total_expenses": 0.0
                }
            
            batch_summary[batch_id]["employee_count"] += 1
            batch_summary[batch_id]["total_expenses"] += float(employee.total_expenses or 0)
        
        # Calculate overall statistics
        total_exported = db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session_uuid,
            EmployeeRevision.exported_to_pvault == True
        ).count()
        
        total_employees = db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session_uuid
        ).count()
        
        # Get unique export types
        export_types = db.query(EmployeeRevision.last_export_type).filter(
            EmployeeRevision.session_id == session_uuid,
            EmployeeRevision.exported_to_pvault == True,
            EmployeeRevision.last_export_type.isnot(None)
        ).distinct().all()
        
        export_type_list = [et[0] for et in export_types if et[0]]
        
        logger.info(
            f"Export history retrieved for session {session_id}: "
            f"{len(export_records)} records, {len(batch_summary)} batches"
        )
        
        return ExportHistoryResponse(
            session_id=session_id,
            export_records=export_records,
            batch_summary=list(batch_summary.values()),
            statistics={
                "total_exported_employees": total_exported,
                "total_session_employees": total_employees,
                "export_completion_rate": round(total_exported / max(total_employees, 1) * 100, 2),
                "unique_export_types": export_type_list,
                "total_export_batches": len(batch_summary)
            },
            query_metadata={
                "export_type_filter": export_type,
                "limit_applied": limit,
                "records_returned": len(export_records)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log_and_track_error(e, {"session_id": session_id, "export_type": export_type})
        logger.error(f"Unexpected error retrieving export history for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve export history"
        )