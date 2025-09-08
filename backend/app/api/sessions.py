"""
Session Management API Endpoints
Implements CRUD operations for processing sessions with proper authentication and authorization
"""

import uuid
import logging
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, select

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..cache import cached, cache, invalidate_cache_pattern
from ..models import ProcessingSession, EmployeeRevision, ProcessingActivity, FileUpload, ValidationStatus, ActivityType, FileType
from ..models import SessionStatus as ModelSessionStatus
from ..schemas import (
    SessionCreateRequest,
    SessionUpdateRequest,
    SessionResponse, 
    SessionListResponse,
    SessionStatusResponse,
    SessionStatus as SchemaSessionStatus,
    CurrentEmployee,
    RecentActivity,
    ErrorResponse
)

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/sessions", tags=["sessions"])


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
    
    # Extract username from domain format if present - fix session hijacking vulnerability
    session_creator = db_session.created_by.lower()
    if '\\' in session_creator:
        # Use rsplit to handle multiple backslashes correctly (take last part)
        session_creator = session_creator.split('\\')[-1]
    
    # Additional security: validate that username doesn't contain dangerous characters
    import re
    if not re.match(r'^[a-zA-Z0-9._-]+$', session_creator):
        logger.warning(f"Invalid session creator format: {db_session.created_by}")
        return False
    
    return session_creator == current_user.username.lower()


def convert_session_to_response(db_session: ProcessingSession) -> SessionResponse:
    """
    Convert database session model to API response model
    
    Args:
        db_session: Database session object
        
    Returns:
        SessionResponse object
    """
    return SessionResponse(
        session_id=str(db_session.session_id),
        session_name=db_session.session_name,
        status=db_session.status.value,
        created_by=db_session.created_by,
        created_at=db_session.created_at,
        updated_at=db_session.updated_at,
        total_employees=db_session.total_employees,
        processed_employees=db_session.processed_employees,
        processing_options=db_session.processing_options or {},
        delta_session_id=str(db_session.delta_session_id) if db_session.delta_session_id else None
    )


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: SessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Create a new processing session
    
    Args:
        request: Session creation request data
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        SessionResponse: Created session information
        
    Raises:
        HTTPException: 400 for validation errors, 500 for database errors
        
    Security:
        - Requires authentication
        - All authenticated users can create sessions
        - Session creator is automatically set to current user
    """
    try:
        # Validate delta session exists if specified
        delta_session = None
        if request.delta_session_id:
            try:
                delta_session_uuid = uuid.UUID(request.delta_session_id)
                delta_session = db.query(ProcessingSession).filter(
                    ProcessingSession.session_id == delta_session_uuid
                ).first()
                
                if not delta_session:
                    logger.warning(f"Delta session not found: {request.delta_session_id}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Delta session not found",
                        headers={"X-Error-Code": "DELTA_SESSION_NOT_FOUND"}
                    )
                
                # Check if user has access to delta session
                if not check_session_access(delta_session, current_user):
                    logger.warning(
                        f"User {current_user.username} attempted to access delta session {request.delta_session_id} without permission"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to specified delta session",
                        headers={"X-Error-Code": "ACCESS_DENIED"}
                    )
                    
            except ValueError:
                logger.warning(f"Invalid delta session UUID: {request.delta_session_id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid delta_session_id format",
                    headers={"X-Error-Code": "INVALID_UUID_FORMAT"}
                )
        
        # Create new session
        new_session = ProcessingSession(
            session_name=request.session_name,
            created_by=f"DOMAIN\\{current_user.username}",  # Format as domain user
            status=ModelSessionStatus.PENDING,
            processing_options=request.processing_options.model_dump(),
            delta_session_id=delta_session.session_id if delta_session else None
        )
        
        # Add to database with transaction
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        logger.info(
            f"Session created successfully - ID: {new_session.session_id}, "
            f"Name: {request.session_name}, User: {current_user.username}"
        )
        
        # Convert to response model
        return convert_session_to_response(new_session)
        
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error creating session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session due to database error",
            headers={"X-Error-Code": "DATABASE_ERROR"}
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error creating session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session due to internal error"
        )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Retrieve session details by ID
    
    Args:
        session_id: UUID of the session to retrieve
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        SessionResponse: Session information
        
    Raises:
        HTTPException: 400 for invalid UUID, 403 for access denied, 404 for not found
        
    Security:
        - Requires authentication
        - Admins can access any session
        - Non-admins can only access their own sessions
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session from database
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to access session {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        logger.info(f"Session retrieved - ID: {session_id}, User: {current_user.username}")
        
        # Convert to response model
        return convert_session_to_response(db_session)
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session due to database error"
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session due to internal error"
        )


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    request: SessionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Update an existing processing session
    
    Args:
        session_id: UUID of the session to update
        request: Session update request data
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        SessionResponse: Updated session information
        
    Raises:
        HTTPException: 400 for validation errors, 403 for access denied, 404 for not found, 500 for database errors
        
    Security:
        - Requires authentication
        - Admins can update any session
        - Non-admins can only update their own sessions
        - Some status transitions may be restricted based on current state
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for update: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session from database
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for update: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to update session {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Update fields that were provided
        updated_fields = []
        
        if request.session_name is not None:
            db_session.session_name = request.session_name
            updated_fields.append("session_name")
        
        if request.status is not None:
            # Convert schema enum to model enum
            model_status = ModelSessionStatus(request.status.value)
            
            # Validate status transition (basic validation - can be enhanced based on business rules)
            if db_session.status == ModelSessionStatus.COMPLETED and model_status != ModelSessionStatus.COMPLETED:
                logger.warning(f"Invalid status transition from {db_session.status} to {model_status}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change status of completed session"
                )
            
            db_session.status = model_status
            updated_fields.append("status")
        
        if request.processing_options is not None:
            db_session.processing_options = request.processing_options.model_dump()
            updated_fields.append("processing_options")
        
        # Update timestamp
        db_session.updated_at = datetime.now(timezone.utc)
        
        # Commit changes
        db.commit()
        db.refresh(db_session)
        
        logger.info(
            f"Session updated successfully - ID: {session_id}, "
            f"Updated fields: {', '.join(updated_fields)}, User: {current_user.username}"
        )
        
        # Convert to response model
        return convert_session_to_response(db_session)
        
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error updating session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update session due to database error",
            headers={"X-Error-Code": "DATABASE_ERROR"}
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error updating session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update session due to internal error"
        )


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[SchemaSessionStatus] = Query(None, description="Filter by session status"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    List sessions with pagination and filtering
    
    Args:
        page: Page number (1-based)
        page_size: Number of items per page (max 100)
        status_filter: Optional status filter
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        SessionListResponse: Paginated list of sessions
        
    Security:
        - Requires authentication
        - Admins see all sessions
        - Non-admins see only their own sessions
    """
    try:
        # Build base query
        query = db.query(ProcessingSession)
        
        # Apply user-based filtering
        if not current_user.is_admin:
            # Non-admin users only see their own sessions
            user_filter = f"DOMAIN\\{current_user.username}"
            query = query.filter(ProcessingSession.created_by == user_filter)
        
        # Apply status filter if provided
        if status_filter:
            model_status = ModelSessionStatus(status_filter.value)
            query = query.filter(ProcessingSession.status == model_status)
        
        # Order by creation date (newest first)
        query = query.order_by(ProcessingSession.created_at.desc())
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        sessions = query.offset(offset).limit(page_size).all()
        
        # Convert to response models
        session_responses = [convert_session_to_response(session) for session in sessions]
        
        logger.info(
            f"Sessions listed - User: {current_user.username}, "
            f"Page: {page}, Count: {len(session_responses)}, Total: {total_count}"
        )
        
        return SessionListResponse(
            sessions=session_responses,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
        
    except SQLAlchemyError as e:
        logger.error(f"Database error listing sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list sessions due to database error"
        )
    except Exception as e:
        logger.error(f"Unexpected error listing sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list sessions due to internal error"
        )


def calculate_progress_statistics(session: ProcessingSession, db: Session = None) -> dict:
    """
    Calculate comprehensive progress statistics for a processing session
    Optimized to use preloaded relationships to prevent N+1 queries
    
    Args:
        session: ProcessingSession database object with preloaded employee_revisions
        db: Database session (optional, kept for backward compatibility)
        
    Returns:
        Dictionary containing progress statistics
    """
    # Use preloaded employee_revisions to avoid additional queries
    if hasattr(session, 'employee_revisions') and session.employee_revisions:
        # Count by validation status using preloaded data
        status_counts = {}
        for revision in session.employee_revisions:
            status = revision.validation_status
            status_counts[status] = status_counts.get(status, 0) + 1
        employee_counts = [(status, count) for status, count in status_counts.items()]
    else:
        # Fallback to database query if preloaded data not available
        employee_counts = db.query(
            EmployeeRevision.validation_status,
            func.count(EmployeeRevision.revision_id).label('count')
        ).filter(
            EmployeeRevision.session_id == session.session_id
        ).group_by(EmployeeRevision.validation_status).all()
    
    # Initialize counts
    completed_employees = 0
    issues_employees = 0
    processing_employees = 0
    
    # Process counts from query results or preloaded data
    for status_enum, count in employee_counts:
        if status_enum == ValidationStatus.VALID:
            completed_employees = count
        elif status_enum == ValidationStatus.NEEDS_ATTENTION:
            issues_employees = count
        elif status_enum == ValidationStatus.RESOLVED:
            completed_employees += count
    
    # Calculate remaining employees
    total_employees = session.total_employees or 0
    pending_employees = max(0, total_employees - completed_employees - issues_employees - processing_employees)
    
    # Calculate progress percentage
    if total_employees > 0:
        percent_complete = min(100, int((completed_employees / total_employees) * 100))
    else:
        percent_complete = 0 if session.status == ModelSessionStatus.PENDING else 100
    
    return {
        'total_employees': total_employees,
        'completed_employees': completed_employees,
        'processing_employees': processing_employees,
        'issues_employees': issues_employees,
        'pending_employees': pending_employees,
        'percent_complete': percent_complete
    }


def get_current_employee(session: ProcessingSession, db: Session = None) -> Optional[CurrentEmployee]:
    """
    Get information about the currently processing employee
    Optimized to use preloaded relationships to prevent N+1 queries
    
    Args:
        session: ProcessingSession database object with preloaded processing_activities
        db: Database session (optional, kept for backward compatibility)
        
    Returns:
        CurrentEmployee object if processing, None otherwise
    """
    if session.status != ModelSessionStatus.PROCESSING:
        return None
    
    # Use preloaded processing_activities to avoid additional queries
    if hasattr(session, 'processing_activities') and session.processing_activities:
        # Find most recent processing activity with employee info from preloaded data
        recent_activity = None
        for activity in session.processing_activities:
            if (activity.employee_id and 
                activity.activity_type in [ActivityType.PROCESSING, ActivityType.VALIDATION]):
                if not recent_activity or activity.created_at > recent_activity.created_at:
                    recent_activity = activity
    else:
        # Fallback to database query if preloaded data not available
        recent_activity = db.query(ProcessingActivity).filter(
            ProcessingActivity.session_id == session.session_id,
            ProcessingActivity.employee_id.isnot(None),
            ProcessingActivity.activity_type.in_([ActivityType.PROCESSING, ActivityType.VALIDATION])
        ).order_by(ProcessingActivity.created_at.desc()).first()
    
    if not recent_activity:
        return None
    
    # Get employee details
    employee = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session.session_id,
        EmployeeRevision.employee_id == recent_activity.employee_id
    ).first()
    
    if not employee:
        return None
    
    # Determine processing stage based on activity type
    processing_stage = "validation" if recent_activity.activity_type == ActivityType.VALIDATION else "processing"
    
    return CurrentEmployee(
        employee_id=employee.employee_id,
        employee_name=employee.employee_name,
        processing_stage=processing_stage
    )


def estimate_remaining_time(session: ProcessingSession, progress_stats: dict, db: Session) -> Optional[str]:
    """
    Estimate remaining processing time based on current progress
    
    Args:
        session: ProcessingSession database object
        progress_stats: Progress statistics dictionary
        db: Database session
        
    Returns:
        Formatted time string (HH:MM:SS) or None
    """
    if session.status not in [ModelSessionStatus.PROCESSING] or progress_stats['total_employees'] == 0:
        return None
    
    # Get processing start time from first processing activity
    first_activity = db.query(ProcessingActivity).filter(
        ProcessingActivity.session_id == session.session_id,
        ProcessingActivity.activity_type == ActivityType.PROCESSING
    ).order_by(ProcessingActivity.created_at.asc()).first()
    
    if not first_activity:
        return None
    
    # Calculate processing rate
    # Ensure both datetimes have timezone info for proper subtraction
    now_utc = datetime.now(timezone.utc)
    activity_time = first_activity.created_at
    if activity_time.tzinfo is None:
        activity_time = activity_time.replace(tzinfo=timezone.utc)
    elapsed_time = now_utc - activity_time
    completed = progress_stats['completed_employees']
    
    if completed == 0 or elapsed_time.total_seconds() == 0:
        return None
    
    # Calculate rate (employees per second)
    processing_rate = completed / elapsed_time.total_seconds()
    remaining_employees = progress_stats['pending_employees'] + progress_stats['issues_employees']
    
    if processing_rate > 0 and remaining_employees > 0:
        remaining_seconds = int(remaining_employees / processing_rate)
        hours, remainder = divmod(remaining_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    
    return "00:00:00"


def get_processing_start_time(session: ProcessingSession, db: Session) -> Optional[datetime]:
    """
    Get the processing start time from the first processing activity
    
    Args:
        session: ProcessingSession database object
        db: Database session
        
    Returns:
        Processing start datetime or None
    """
    first_activity = db.query(ProcessingActivity).filter(
        ProcessingActivity.session_id == session.session_id,
        ProcessingActivity.activity_type == ActivityType.PROCESSING
    ).order_by(ProcessingActivity.created_at.asc()).first()
    
    return first_activity.created_at if first_activity else None


def get_files_uploaded(session: ProcessingSession, db: Session) -> Optional[Dict[str, str]]:
    """
    Get uploaded files information for the session
    
    Args:
        session: ProcessingSession database object
        db: Database session
        
    Returns:
        Dictionary of uploaded files or None
    """
    files = db.query(FileUpload).filter(
        FileUpload.session_id == session.session_id
    ).all()
    
    if not files:
        return None
    
    files_dict = {}
    for file in files:
        if file.file_type == FileType.CAR:
            files_dict['car_file'] = file.original_filename
        elif file.file_type == FileType.RECEIPT:
            files_dict['receipt_file'] = file.original_filename
    
    return files_dict if files_dict else None


def format_recent_activities(session: ProcessingSession, db: Session) -> List[RecentActivity]:
    """
    Get and format recent activities for the session
    
    Args:
        session: ProcessingSession database object
        db: Database session
        
    Returns:
        List of formatted recent activities (last 5)
    """
    activities = db.query(ProcessingActivity).filter(
        ProcessingActivity.session_id == session.session_id
    ).order_by(ProcessingActivity.created_at.desc()).limit(5).all()
    
    return [
        RecentActivity(
            activity_id=str(activity.activity_id),
            activity_type=activity.activity_type.value,
            activity_message=activity.activity_message,
            employee_id=activity.employee_id,
            created_at=activity.created_at,
            created_by=activity.created_by
        )
        for activity in activities
    ]


@router.get("/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get comprehensive status information for a processing session
    
    This endpoint provides real-time status polling for processing sessions,
    including progress statistics, current processing state, and recent activities.
    Optimized for sub-200ms response times to support efficient polling.
    
    Args:
        session_id: UUID of the session to get status for
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        SessionStatusResponse: Comprehensive session status information
        
    Raises:
        HTTPException: 400 for invalid UUID, 403 for access denied, 404 for not found
        
    Security:
        - Requires authentication
        - Admins can access any session status
        - Non-admins can only access their own session status
        
    Performance:
        - Optimized database queries with selective loading
        - Target response time: <200ms for efficient polling
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for status: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session with optimized loading using eager loading to prevent N+1 queries
        db_session = db.query(ProcessingSession).options(
            selectinload(ProcessingSession.employee_revisions),
            selectinload(ProcessingSession.processing_activities),
            selectinload(ProcessingSession.file_uploads)
        ).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for status: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to access session status {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Calculate progress statistics
        progress_stats = calculate_progress_statistics(db_session, db)
        
        # Get current processing employee
        current_employee = get_current_employee(db_session, db)
        
        # Calculate estimated time remaining
        estimated_time = estimate_remaining_time(db_session, progress_stats, db)
        
        # Get processing start time
        processing_start = get_processing_start_time(db_session, db)
        
        # Get uploaded files information
        files_uploaded = get_files_uploaded(db_session, db)
        
        # Get recent activities
        recent_activities = format_recent_activities(db_session, db)
        
        logger.info(f"Session status retrieved - ID: {session_id}, User: {current_user.username}")
        
        # Build comprehensive response
        return SessionStatusResponse(
            session_id=str(db_session.session_id),
            session_name=db_session.session_name,
            status=db_session.status,
            created_by=db_session.created_by,
            created_at=db_session.created_at,
            updated_at=db_session.updated_at,
            current_employee=current_employee,
            total_employees=progress_stats['total_employees'],
            percent_complete=progress_stats['percent_complete'],
            completed_employees=progress_stats['completed_employees'],
            processing_employees=progress_stats['processing_employees'],
            issues_employees=progress_stats['issues_employees'],
            pending_employees=progress_stats['pending_employees'],
            estimated_time_remaining=estimated_time,
            processing_start_time=processing_start,
            files_uploaded=files_uploaded,
            recent_activities=recent_activities
        )
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving session status {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session status due to database error"
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving session status {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session status due to internal error"
        )


@router.get("/{session_id}/employee-analysis")
async def get_employee_analysis(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get advanced employee analysis and merge statistics for a session
    
    This endpoint provides detailed employee analysis including:
    - Match statistics between CAR and Receipt data
    - Employees suitable for document splitting
    - Data validation report
    - Expense category analysis
    
    Args:
        session_id: UUID of the session to analyze
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Dictionary with employee analysis results
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for analysis: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for analysis: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to access employee analysis {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Get session file uploads
        car_file = db.query(FileUpload).filter(
            FileUpload.session_id == session_uuid,
            FileUpload.file_type == FileType.CAR
        ).first()
        
        receipt_file = db.query(FileUpload).filter(
            FileUpload.session_id == session_uuid,
            FileUpload.file_type == FileType.RECEIPT
        ).first()
        
        if not car_file or not receipt_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session must have both CAR and Receipt files for analysis"
            )
        
        # Process documents with local processors
        from ..services.pdf_processor import CARProcessor, ReceiptProcessor
        from ..services.employee_merger import EmployeeDataMerger
        
        logger.info(f"Starting employee analysis for session {session_id}")
        
        # Extract data from documents
        car_processor = CARProcessor()
        receipt_processor = ReceiptProcessor()
        
        car_data = car_processor.parse_car_document(car_file.file_path)
        receipt_data = receipt_processor.parse_receipt_document(receipt_file.file_path)
        
        # Perform advanced merge analysis
        merger = EmployeeDataMerger(similarity_threshold=0.8)
        merge_result = merger.merge_employee_data(car_data, receipt_data)
        
        # Get splittable employees
        splittable_employees = merger.get_splittable_employees(merge_result['employees'])
        
        # Validate data
        validation_report = merger.validate_employee_data(merge_result['employees'])
        
        # Generate expense analysis
        expense_analysis = _generate_expense_analysis(merge_result['employees'])
        
        logger.info(f"Employee analysis completed for session {session_id}")
        
        return {
            "session_id": session_id,
            "analysis_timestamp": datetime.now(timezone.utc),
            "summary": merge_result['summary'],
            "matches": [{
                "car_employee": match['car_employee']['employee_name'],
                "receipt_employee": match['receipt_employee']['employee_name'],
                "match_score": match['match_score'],
                "match_reason": match['match_reason']
            } for match in merge_result['matches']],
            "splittable_employees": [{
                "employee_name": emp['employee_name'],
                "employee_id": emp['employee_id'],
                "total_expenses": emp['total_expenses'],
                "car_pages": emp['car_pages'],
                "receipt_pages": emp['receipt_pages'],
                "expense_categories": emp['expense_categories']
            } for emp in splittable_employees],
            "validation": validation_report,
            "expense_analysis": expense_analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing employee analysis for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform employee analysis"
        )


def _generate_expense_analysis(employees_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate expense category and amount analysis
    """
    category_totals = {}
    total_car_expenses = 0
    total_receipt_expenses = 0
    high_expense_employees = []
    
    for emp_key, employee in employees_data.items():
        total_car_expenses += employee['car_total']
        total_receipt_expenses += employee['receipt_total']
        
        # Track high expense employees (over $2000)
        if employee['total_expenses'] > 2000:
            high_expense_employees.append({
                'name': employee['employee_name'],
                'total': employee['total_expenses']
            })
        
        # Aggregate expense categories
        for category in employee.get('expense_categories', []):
            if category not in category_totals:
                category_totals[category] = 0
            category_totals[category] += employee['receipt_total']
    
    # Sort high expense employees
    high_expense_employees.sort(key=lambda x: x['total'], reverse=True)
    
    return {
        'total_car_expenses': round(total_car_expenses, 2),
        'total_receipt_expenses': round(total_receipt_expenses, 2),
        'total_combined_expenses': round(total_car_expenses + total_receipt_expenses, 2),
        'category_breakdown': category_totals,
        'high_expense_employees': high_expense_employees[:10],  # Top 10
        'average_car_expense': round(total_car_expenses / len(employees_data), 2) if employees_data else 0,
        'average_receipt_expense': round(total_receipt_expenses / len(employees_data), 2) if employees_data else 0
    }


@router.post("/{session_id}/split-documents")
async def split_session_documents(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Split combined CAR and Receipt PDFs into individual employee documents
    
    This endpoint creates separate PDF files for each employee containing
    their relevant pages from both CAR and Receipt documents.
    
    Args:
        session_id: UUID of the session to split documents for
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Dictionary with split operation results and file information
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for document split: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session with file uploads
        db_session = db.query(ProcessingSession).options(
            selectinload(ProcessingSession.file_uploads)
        ).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for document split: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(f"User {current_user.id} denied access to session {session_id} for document split")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Import document splitter service
        from ..services.document_splitter import create_document_splitter
        from ..services.employee_merger import EmployeeDataMerger
        from ..services.document_intelligence import DocumentProcessor
        
        # Find CAR and Receipt files
        car_file = None
        receipt_file = None
        
        for file_upload in db_session.file_uploads:
            if file_upload.file_type == FileType.CAR:
                car_file = file_upload
            elif file_upload.file_type == FileType.RECEIPT:
                receipt_file = file_upload
        
        if not car_file or not receipt_file:
            missing_types = []
            if not car_file:
                missing_types.append("CAR")
            if not receipt_file:
                missing_types.append("Receipt")
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required file types: {', '.join(missing_types)}"
            )
        
        # Process documents to get employee data
        logger.info(f"Processing documents for split operation in session {session_id}")
        
        doc_processor = DocumentProcessor(use_local=True)
        
        # Process CAR document
        car_data = doc_processor.process_car_document(car_file.file_path)
        
        # Process Receipt document  
        receipt_data = doc_processor.process_receipt_document(receipt_file.file_path)
        
        # Merge employee data
        merger = EmployeeDataMerger()
        merged_employees = merger.merge_employee_data(car_data, receipt_data)
        
        if not merged_employees:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No employee data found to split"
            )
        
        # Validate split requirements
        splitter = create_document_splitter()
        validation_result = splitter.validate_split_requirements(merged_employees)
        
        if not validation_result['ready_for_split']:
            logger.warning(f"Session {session_id} not ready for split: {validation_result['missing_data_count']} employees missing data")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Some employees are missing required data for splitting",
                    "validation_details": validation_result
                }
            )
        
        # Perform document split
        logger.info(f"Starting document split for session {session_id} with {len(merged_employees)} employees")
        
        split_results = splitter.split_employee_documents(
            car_pdf_path=car_file.file_path,
            receipt_pdf_path=receipt_file.file_path,
            merged_employee_data=merged_employees,
            session_id=str(session_uuid)
        )
        
        # Generate summary statistics
        summary = splitter.get_split_summary(split_results)
        
        # Update session status if all documents were split successfully
        if split_results['error_count'] == 0:
            db_session.status = ModelSessionStatus.completed
            db_session.updated_at = datetime.now(timezone.utc)
            
            # Log successful split activity
            activity = ProcessingActivity(
                session_id=session_uuid,
                user_id=current_user.id,
                activity_type=ActivityType.DOCUMENT_SPLIT,
                description=f"Successfully split documents for {split_results['success_count']} employees",
                metadata={
                    'split_summary': summary,
                    'success_count': split_results['success_count']
                }
            )
            db.add(activity)
        
        db.commit()
        
        logger.info(f"Document split completed for session {session_id}: {split_results['success_count']} successful, {split_results['error_count']} errors")
        
        return {
            'session_id': session_id,
            'split_results': split_results,
            'summary': summary,
            'validation': validation_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to split documents for session {session_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document split operation failed: {str(e)}"
        )


@router.get("/{session_id}/split-validation")
async def validate_split_requirements(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Validate if a session is ready for document splitting
    
    This endpoint checks if the session has the required employee data
    and page ranges needed for successful document splitting.
    
    Args:
        session_id: UUID of the session to validate
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Dictionary with validation results and requirements
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for split validation: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session with file uploads
        db_session = db.query(ProcessingSession).options(
            selectinload(ProcessingSession.file_uploads)
        ).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for split validation: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(f"User {current_user.id} denied access to session {session_id} for split validation")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Import required services
        from ..services.document_splitter import create_document_splitter
        from ..services.employee_merger import EmployeeDataMerger
        from ..services.document_intelligence import DocumentProcessor
        
        # Find CAR and Receipt files
        car_file = None
        receipt_file = None
        
        for file_upload in db_session.file_uploads:
            if file_upload.file_type == FileType.CAR:
                car_file = file_upload
            elif file_upload.file_type == FileType.RECEIPT:
                receipt_file = file_upload
        
        file_validation = {
            'has_car_file': car_file is not None,
            'has_receipt_file': receipt_file is not None,
            'car_file_path': car_file.file_path if car_file else None,
            'receipt_file_path': receipt_file.file_path if receipt_file else None
        }
        
        if not car_file or not receipt_file:
            return {
                'session_id': session_id,
                'ready_for_split': False,
                'file_validation': file_validation,
                'missing_files': [ft for ft in ['CAR', 'Receipt'] if (ft == 'CAR' and not car_file) or (ft == 'Receipt' and not receipt_file)],
                'employee_validation': None
            }
        
        # Process documents to get employee data
        logger.info(f"Validating split requirements for session {session_id}")
        
        doc_processor = DocumentProcessor(use_local=True)
        
        try:
            # Process CAR document
            car_data = doc_processor.process_car_document(car_file.file_path)
            
            # Process Receipt document  
            receipt_data = doc_processor.process_receipt_document(receipt_file.file_path)
            
            # Merge employee data
            merger = EmployeeDataMerger()
            merged_employees = merger.merge_employee_data(car_data, receipt_data)
            
            # Validate split requirements
            splitter = create_document_splitter()
            validation_result = splitter.validate_split_requirements(merged_employees)
            
            return {
                'session_id': session_id,
                'ready_for_split': validation_result['ready_for_split'],
                'file_validation': file_validation,
                'employee_validation': validation_result,
                'total_employees': len(merged_employees)
            }
            
        except Exception as e:
            logger.error(f"Failed to process documents for split validation in session {session_id}: {str(e)}")
            return {
                'session_id': session_id,
                'ready_for_split': False,
                'file_validation': file_validation,
                'processing_error': str(e),
                'employee_validation': None
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate split requirements for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Split validation failed: {str(e)}"
        )


@router.get("/{session_id}/split-files")
async def list_split_files(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    List all split document files for a session
    
    This endpoint returns information about all individual employee PDF files
    that have been created for this session.
    
    Args:
        session_id: UUID of the session to list files for
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Dictionary with file listing and metadata
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for file listing: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for file listing: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(f"User {current_user.id} denied access to session {session_id} for file listing")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Check for split documents directory
        from ..services.document_splitter import create_document_splitter
        splitter = create_document_splitter()
        
        session_output_dir = splitter.output_dir / str(session_uuid)
        
        if not session_output_dir.exists():
            return {
                'session_id': session_id,
                'files': [],
                'total_files': 0,
                'total_size_bytes': 0,
                'directory_exists': False
            }
        
        # List PDF files in the directory
        files = []
        total_size = 0
        
        for pdf_file in session_output_dir.glob("*.pdf"):
            try:
                stat_info = pdf_file.stat()
                files.append({
                    'filename': pdf_file.name,
                    'file_path': str(pdf_file),
                    'size_bytes': stat_info.st_size,
                    'size_mb': round(stat_info.st_size / (1024 * 1024), 2),
                    'created_at': datetime.fromtimestamp(stat_info.st_ctime).isoformat(),
                    'modified_at': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
                })
                total_size += stat_info.st_size
            except Exception as e:
                logger.warning(f"Failed to get info for file {pdf_file}: {str(e)}")
                continue
        
        # Sort by filename
        files.sort(key=lambda x: x['filename'])
        
        return {
            'session_id': session_id,
            'files': files,
            'total_files': len(files),
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'directory_exists': True,
            'directory_path': str(session_output_dir)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list split files for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File listing failed: {str(e)}"
        )


@router.get("/{session_id}/split-files/{filename}")
async def download_split_file(
    session_id: str,
    filename: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Download an individual split document file
    
    This endpoint provides direct download access to individual employee PDF files.
    
    Args:
        session_id: UUID of the session
        filename: Name of the PDF file to download
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        FileResponse with the requested PDF file
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for file download: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for file download: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(f"User {current_user.id} denied access to session {session_id} for file download")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Validate filename (security check)
        if not filename.endswith('.pdf') or '..' in filename or '/' in filename or '\\' in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        # Locate the file
        from ..services.document_splitter import create_document_splitter
        splitter = create_document_splitter()
        
        session_output_dir = splitter.output_dir / str(session_uuid)
        file_path = session_output_dir / filename
        
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Log download activity
        activity = ProcessingActivity(
            session_id=session_uuid,
            user_id=current_user.id,
            activity_type=ActivityType.EXPORT,
            description=f"Downloaded split document: {filename}",
            metadata={
                'filename': filename,
                'file_size': file_path.stat().st_size
            }
        )
        db.add(activity)
        db.commit()
        
        logger.info(f"User {current_user.id} downloading file {filename} from session {session_id}")
        
        return FileResponse(
            path=str(file_path),
            media_type='application/pdf',
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download file {filename} for session {session_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File download failed: {str(e)}"
        )


@router.get("/{session_id}/split-files-zip")
async def download_all_split_files(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Download all split document files as a ZIP archive
    
    This endpoint creates and streams a ZIP file containing all individual
    employee PDF files for the session.
    
    Args:
        session_id: UUID of the session
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        StreamingResponse with ZIP file containing all PDFs
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for ZIP download: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for ZIP download: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(f"User {current_user.id} denied access to session {session_id} for ZIP download")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Locate the split files directory
        from ..services.document_splitter import create_document_splitter
        splitter = create_document_splitter()
        
        session_output_dir = splitter.output_dir / str(session_uuid)
        
        if not session_output_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No split documents found for this session"
            )
        
        # Find PDF files
        pdf_files = list(session_output_dir.glob("*.pdf"))
        
        if not pdf_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No PDF files found in split documents"
            )
        
        # Generate ZIP filename with session info
        session_name = db_session.name or f"session_{session_id[:8]}"
        zip_filename = f"{session_name}_split_documents_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        
        def generate_zip():
            """Generator function to create ZIP file on-the-fly"""
            import io
            
            # Create in-memory buffer for ZIP
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED, compresslevel=1) as zip_file:
                for pdf_file in pdf_files:
                    try:
                        # Add file to ZIP with just the filename (no directory structure)
                        zip_file.write(pdf_file, pdf_file.name)
                        logger.debug(f"Added {pdf_file.name} to ZIP archive")
                    except Exception as e:
                        logger.warning(f"Failed to add {pdf_file.name} to ZIP: {str(e)}")
                        continue
            
            zip_buffer.seek(0)
            
            # Read and yield the ZIP data in chunks
            while True:
                chunk = zip_buffer.read(8192)  # 8KB chunks
                if not chunk:
                    break
                yield chunk
        
        # Log bulk download activity
        activity = ProcessingActivity(
            session_id=session_uuid,
            user_id=current_user.id,
            activity_type=ActivityType.EXPORT,
            description=f"Downloaded all split documents as ZIP ({len(pdf_files)} files)",
            metadata={
                'zip_filename': zip_filename,
                'file_count': len(pdf_files),
                'total_size_estimate': sum(f.stat().st_size for f in pdf_files)
            }
        )
        db.add(activity)
        db.commit()
        
        logger.info(f"User {current_user.id} downloading ZIP of {len(pdf_files)} split files from session {session_id}")
        
        return StreamingResponse(
            generate_zip(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={zip_filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create ZIP download for session {session_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ZIP download failed: {str(e)}"
        )


@router.delete("/{session_id}/split-files")
async def cleanup_session_files(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Clean up all split document files for a session
    
    This endpoint permanently deletes all individual employee PDF files
    for the specified session.
    
    Args:
        session_id: UUID of the session to clean up
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Dictionary with cleanup results
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for cleanup: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for cleanup: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(f"User {current_user.id} denied access to session {session_id} for cleanup")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Perform cleanup
        from ..services.file_cleanup import create_file_cleanup_service
        cleanup_service = create_file_cleanup_service()
        
        cleanup_result = cleanup_service.cleanup_session_files(db, str(session_uuid))
        
        # Log cleanup activity
        if cleanup_result['success']:
            activity = ProcessingActivity(
                session_id=session_uuid,
                user_id=current_user.id,
                activity_type=ActivityType.PROCESSING,
                description=f"Manual cleanup: deleted {cleanup_result['files_deleted']} split document files ({round(cleanup_result['bytes_freed'] / (1024*1024), 2)} MB)",
                metadata=cleanup_result
            )
            db.add(activity)
            db.commit()
        
        logger.info(f"User {current_user.id} cleaned up split files for session {session_id}: {cleanup_result}")
        
        return {
            'session_id': session_id,
            'cleanup_result': cleanup_result,
            'message': f"Successfully deleted {cleanup_result['files_deleted']} files, freed {round(cleanup_result['bytes_freed'] / (1024*1024), 2)} MB"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cleanup files for session {session_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File cleanup failed: {str(e)}"
        )


@router.get("/split-files/storage-stats")
async def get_storage_stats(
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get storage statistics for all split document files
    
    This endpoint provides information about disk usage and file counts
    across all sessions.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Dictionary with storage statistics
    """
    try:
        from ..services.file_cleanup import create_file_cleanup_service
        cleanup_service = create_file_cleanup_service()
        
        stats = cleanup_service.get_storage_stats()
        
        logger.debug(f"User {current_user.id} requested storage statistics")
        
        return {
            'storage_stats': stats,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get storage statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve storage statistics: {str(e)}"
        )


@router.post("/split-files/cleanup-expired")
async def cleanup_expired_files(
    retention_days: int = Query(30, ge=1, le=365, description="Number of days to retain files"),
    current_user: UserInfo = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clean up expired split document files across all sessions
    
    This endpoint removes split document files that are older than the
    specified retention period.
    
    Args:
        retention_days: Number of days to retain files (1-365)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dictionary with cleanup results
    """
    try:
        from ..services.file_cleanup import create_file_cleanup_service
        cleanup_service = create_file_cleanup_service()
        
        logger.info(f"User {current_user.id} initiated cleanup of files older than {retention_days} days")
        
        cleanup_result = cleanup_service.cleanup_expired_files(db, retention_days)
        
        return {
            'cleanup_result': cleanup_result,
            'retention_days': retention_days,
            'timestamp': datetime.now().isoformat(),
            'message': f"Cleanup completed: {cleanup_result['files_deleted']} files deleted, {round(cleanup_result['bytes_freed'] / (1024*1024), 2)} MB freed from {cleanup_result['sessions_processed']} sessions"
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup expired files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Expired file cleanup failed: {str(e)}"
        )