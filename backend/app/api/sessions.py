"""
Session Management API Endpoints
Implements CRUD operations for processing sessions with proper authentication and authorization
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    
    # Extract username from domain format if present
    session_creator = db_session.created_by.lower()
    if '\\' in session_creator:
        session_creator = session_creator.split('\\')[1]
    
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