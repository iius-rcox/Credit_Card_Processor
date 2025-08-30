"""
Background Processing API Endpoints
Implements background task processing with AsyncIO for Credit Card Processor
Provides processing control, activity logging, and error handling
"""

import uuid
import logging
import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..models import (
    ProcessingSession, SessionStatus, EmployeeRevision, ProcessingActivity, 
    FileUpload, ValidationStatus, ActivityType, FileType
)
from ..schemas import (
    ProcessingStartRequest, ProcessingResponse, ProcessingControlResponse,
    ProcessingConfig, ErrorResponse
)

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/sessions", tags=["processing"])

# Global storage for processing state and control
_processing_state: Dict[str, Dict[str, Any]] = {}
_processing_locks: Dict[str, asyncio.Lock] = {}


def get_processing_state(session_id: str) -> Dict[str, Any]:
    """Get or create processing state for a session"""
    if session_id not in _processing_state:
        _processing_state[session_id] = {
            "status": "idle",
            "should_pause": False,
            "should_cancel": False,
            "current_employee_index": 0,
            "total_employees": 0,
            "start_time": None,
            "config": None
        }
    
    if session_id not in _processing_locks:
        _processing_locks[session_id] = asyncio.Lock()
    
    return _processing_state[session_id]


def clear_processing_state(session_id: str):
    """Clear processing state for a session"""
    _processing_state.pop(session_id, None)
    _processing_locks.pop(session_id, None)


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


async def log_processing_activity(
    db: Session,
    session_id: str,
    activity_type: ActivityType,
    message: str,
    employee_id: Optional[str] = None,
    created_by: str = "SYSTEM"
):
    """
    Log processing activity to database
    
    Args:
        db: Database session
        session_id: UUID of the processing session
        activity_type: Type of activity being logged
        message: Activity message
        employee_id: Optional employee ID if activity is employee-specific
        created_by: User who created the activity (default: SYSTEM)
    """
    try:
        activity = ProcessingActivity(
            session_id=uuid.UUID(session_id),
            activity_type=activity_type,
            activity_message=message,
            employee_id=employee_id,
            created_by=created_by
        )
        
        db.add(activity)
        db.commit()
        
        logger.info(f"Activity logged - Session: {session_id}, Type: {activity_type.value}, Message: {message}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to log activity for session {session_id}: {str(e)}")


async def update_session_status(
    db: Session,
    session_id: str,
    new_status: SessionStatus,
    processed_employees: Optional[int] = None
):
    """
    Update session status and processing statistics
    
    Args:
        db: Database session
        session_id: UUID of the processing session
        new_status: New status to set
        processed_employees: Optional count of processed employees
    """
    try:
        session_uuid = uuid.UUID(session_id)
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if db_session:
            db_session.status = new_status
            
            if processed_employees is not None:
                db_session.processed_employees = processed_employees
            
            db.commit()
            
            logger.info(f"Session status updated - ID: {session_id}, Status: {new_status.value}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update session status for {session_id}: {str(e)}")


async def process_session(session_id: str, config: Dict[str, Any], db_url: str):
    """
    Main background processing function
    
    This function performs the actual document processing in the background.
    It includes progress tracking, error handling, and state management.
    
    Args:
        session_id: UUID of the session to process
        config: Processing configuration dictionary
        db_url: Database connection URL
    """
    from ..database import SessionLocal  # Import here to avoid circular imports
    
    db = None
    processing_state = get_processing_state(session_id)
    
    try:
        # Initialize database connection
        db = SessionLocal()
        
        # Validate session exists
        session_uuid = uuid.UUID(session_id)
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.error(f"Session not found for processing: {session_id}")
            return
        
        # Update processing state
        processing_state["status"] = "processing"
        processing_state["start_time"] = time.time()
        processing_state["config"] = config
        
        # Log processing start
        await log_processing_activity(
            db, session_id, ActivityType.PROCESSING_STARTED,
            f"Background processing started with config: {config}"
        )
        
        # Update session status
        await update_session_status(db, session_id, SessionStatus.PROCESSING)
        
        # Simulate document processing with mock data
        # In a real implementation, this would:
        # 1. Load and parse uploaded PDF files
        # 2. Extract employee data from documents
        # 3. Validate data consistency
        # 4. Create EmployeeRevision records
        
        # Mock processing: Create sample employees
        mock_employees = [
            {"id": f"EMP{i:03d}", "name": f"Employee {i:03d}", "car_amount": 100.00 + i, "receipt_amount": 95.00 + i}
            for i in range(1, config.get("batch_size", 10) + 1)
        ]
        
        processing_state["total_employees"] = len(mock_employees)
        
        # Update session with total count
        db_session.total_employees = len(mock_employees)
        db.commit()
        
        logger.info(f"Processing {len(mock_employees)} employees for session {session_id}")
        
        # Process each employee
        for index, employee_data in enumerate(mock_employees):
            # Check for cancellation
            if processing_state.get("should_cancel", False):
                logger.info(f"Processing cancelled for session {session_id}")
                await log_processing_activity(
                    db, session_id, ActivityType.PROCESSING_CANCELLED,
                    f"Processing cancelled by user at employee {index + 1}"
                )
                await update_session_status(db, session_id, SessionStatus.CANCELLED, index)
                processing_state["status"] = "cancelled"
                return
            
            # Check for pause
            while processing_state.get("should_pause", False) and not processing_state.get("should_cancel", False):
                if processing_state["status"] != "paused":
                    processing_state["status"] = "paused"
                    await log_processing_activity(
                        db, session_id, ActivityType.PROCESSING_PAUSED,
                        f"Processing paused at employee {index + 1}"
                    )
                    await update_session_status(db, session_id, SessionStatus.PAUSED, index)
                
                # Wait for resume or cancel
                await asyncio.sleep(1)
            
            # Resume processing
            if processing_state["status"] == "paused":
                processing_state["status"] = "processing"
                await log_processing_activity(
                    db, session_id, ActivityType.PROCESSING_RESUMED,
                    f"Processing resumed at employee {index + 1}"
                )
                await update_session_status(db, session_id, SessionStatus.PROCESSING, index)
            
            processing_state["current_employee_index"] = index
            
            # Log processing progress
            await log_processing_activity(
                db, session_id, ActivityType.PROCESSING_PROGRESS,
                f"Processing employee {employee_data['name']} (ID: {employee_data['id']})",
                employee_id=employee_data['id']
            )
            
            # Create employee revision record
            employee_revision = EmployeeRevision(
                session_id=session_uuid,
                employee_id=employee_data['id'],
                employee_name=employee_data['name'],
                car_amount=employee_data['car_amount'],
                receipt_amount=employee_data['receipt_amount'],
                validation_status=ValidationStatus.VALID if abs(employee_data['car_amount'] - employee_data['receipt_amount']) <= config.get("validation_threshold", 0.05) * 100 else ValidationStatus.NEEDS_ATTENTION,
                validation_flags={}
            )
            
            db.add(employee_revision)
            
            # Simulate processing time (0.5-2 seconds per employee)
            processing_delay = 0.5 + (index % 3) * 0.5
            await asyncio.sleep(processing_delay)
            
            # Update progress
            completed = index + 1
            await update_session_status(db, session_id, SessionStatus.PROCESSING, completed)
            
            # Log progress periodically
            if completed % max(1, len(mock_employees) // 10) == 0:
                progress_percent = int((completed / len(mock_employees)) * 100)
                await log_processing_activity(
                    db, session_id, ActivityType.PROCESSING_PROGRESS,
                    f"Processing progress: {completed}/{len(mock_employees)} employees ({progress_percent}%)"
                )
        
        # Processing completed successfully
        processing_state["status"] = "completed"
        
        await log_processing_activity(
            db, session_id, ActivityType.PROCESSING_COMPLETED,
            f"Processing completed successfully - {len(mock_employees)} employees processed"
        )
        
        await update_session_status(db, session_id, SessionStatus.COMPLETED, len(mock_employees))
        
        logger.info(f"Processing completed successfully for session {session_id}")
        
    except asyncio.CancelledError:
        logger.info(f"Processing task cancelled for session {session_id}")
        processing_state["status"] = "cancelled"
        
        if db:
            await log_processing_activity(
                db, session_id, ActivityType.PROCESSING_CANCELLED,
                "Processing task cancelled"
            )
            await update_session_status(db, session_id, SessionStatus.CANCELLED)
        
    except Exception as e:
        logger.error(f"Processing failed for session {session_id}: {str(e)}")
        processing_state["status"] = "failed"
        
        if db:
            await log_processing_activity(
                db, session_id, ActivityType.PROCESSING_FAILED,
                f"Processing failed with error: {str(e)}"
            )
            await update_session_status(db, session_id, SessionStatus.FAILED)
        
        raise
        
    finally:
        if db:
            db.close()


@router.post("/{session_id}/process", response_model=ProcessingResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_processing(
    session_id: str,
    request: Optional[ProcessingStartRequest] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: UserInfo = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start background processing for a session
    
    This endpoint initiates background document processing for the specified session.
    It validates the session, checks permissions, and starts the processing task.
    
    Args:
        session_id: UUID of the session to process
        request: Optional processing configuration
        background_tasks: FastAPI background tasks
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        ProcessingResponse: Processing start confirmation
        
    Raises:
        HTTPException: 400 for invalid session/status, 403 for access denied, 
                      404 for session not found, 409 for already processing
        
    Security:
        - Requires authentication
        - Only session owners and admins can start processing
        - Validates session has required files uploaded
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for processing: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session from database
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for processing: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to start processing for session {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Check session status
        if db_session.status in [SessionStatus.PROCESSING, SessionStatus.COMPLETED]:
            logger.warning(f"Session {session_id} is already processing or completed")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Session is already {db_session.status.value}"
            )
        
        # Check if files are uploaded
        uploaded_files = db.query(FileUpload).filter(
            FileUpload.session_id == session_uuid
        ).all()
        
        if not uploaded_files:
            logger.warning(f"No files uploaded for session {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session must have files uploaded before processing"
            )
        
        # Validate we have both required file types
        file_types = {file.file_type for file in uploaded_files}
        if FileType.CAR not in file_types or FileType.RECEIPT not in file_types:
            logger.warning(f"Missing required file types for session {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session must have both CAR and RECEIPT files uploaded"
            )
        
        # Get processing configuration
        processing_config = request.processing_config if request else ProcessingConfig()
        config_dict = processing_config.model_dump()
        
        # Update session with processing options
        db_session.processing_options.update(config_dict)
        db.commit()
        
        # Clear any existing processing state
        clear_processing_state(session_id)
        
        # Get database URL for background task
        db_url = str(db.get_bind().url)
        
        # Start background processing
        background_tasks.add_task(
            process_session,
            session_id,
            config_dict,
            db_url
        )
        
        logger.info(
            f"Background processing started - Session: {session_id}, "
            f"User: {current_user.username}, Config: {config_dict}"
        )
        
        return ProcessingResponse(
            session_id=session_id,
            status=SessionStatus.PROCESSING,
            message="Background processing started successfully",
            processing_config=config_dict,
            timestamp=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error starting processing for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start processing due to database error"
        )
    except Exception as e:
        logger.error(f"Unexpected error starting processing for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start processing due to internal error"
        )


@router.post("/{session_id}/pause", response_model=ProcessingControlResponse)
async def pause_processing(
    session_id: str,
    current_user: UserInfo = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pause currently running processing
    
    This endpoint pauses the background processing for a session.
    The processing can be resumed later from the same point.
    
    Args:
        session_id: UUID of the session to pause
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        ProcessingControlResponse: Pause operation result
        
    Raises:
        HTTPException: 400 for invalid session, 403 for access denied, 
                      404 for not found, 409 for invalid state
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for pause: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session from database
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for pause: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to pause processing for session {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Check if processing is running
        if db_session.status != SessionStatus.PROCESSING:
            logger.warning(f"Session {session_id} is not currently processing")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Session is not currently processing (status: {db_session.status.value})"
            )
        
        # Set pause flag
        processing_state = get_processing_state(session_id)
        processing_state["should_pause"] = True
        
        logger.info(
            f"Processing pause requested - Session: {session_id}, User: {current_user.username}"
        )
        
        return ProcessingControlResponse(
            session_id=session_id,
            action="pause",
            status=SessionStatus.PROCESSING,  # Will be updated to PAUSED by background task
            message="Processing pause requested",
            timestamp=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error pausing processing for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause processing due to internal error"
        )


@router.post("/{session_id}/resume", response_model=ProcessingControlResponse)
async def resume_processing(
    session_id: str,
    current_user: UserInfo = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resume paused processing
    
    This endpoint resumes paused background processing for a session.
    Processing continues from where it was paused.
    
    Args:
        session_id: UUID of the session to resume
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        ProcessingControlResponse: Resume operation result
        
    Raises:
        HTTPException: 400 for invalid session, 403 for access denied, 
                      404 for not found, 409 for invalid state
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for resume: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session from database
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for resume: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to resume processing for session {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Check if processing is paused
        if db_session.status != SessionStatus.PAUSED:
            logger.warning(f"Session {session_id} is not currently paused")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Session is not paused (status: {db_session.status.value})"
            )
        
        # Clear pause flag
        processing_state = get_processing_state(session_id)
        processing_state["should_pause"] = False
        
        logger.info(
            f"Processing resume requested - Session: {session_id}, User: {current_user.username}"
        )
        
        return ProcessingControlResponse(
            session_id=session_id,
            action="resume",
            status=SessionStatus.PAUSED,  # Will be updated to PROCESSING by background task
            message="Processing resume requested",
            timestamp=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error resuming processing for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resume processing due to internal error"
        )


@router.post("/{session_id}/cancel", response_model=ProcessingControlResponse)
async def cancel_processing(
    session_id: str,
    current_user: UserInfo = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel currently running or paused processing
    
    This endpoint cancels background processing for a session.
    Cancellation cannot be undone - the session will need to be restarted.
    
    Args:
        session_id: UUID of the session to cancel
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        ProcessingControlResponse: Cancel operation result
        
    Raises:
        HTTPException: 400 for invalid session, 403 for access denied, 
                      404 for not found, 409 for invalid state
    """
    try:
        # Validate UUID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format for cancel: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Query session from database
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for cancel: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not check_session_access(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to cancel processing for session {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Check if processing can be cancelled
        if db_session.status not in [SessionStatus.PROCESSING, SessionStatus.PAUSED]:
            logger.warning(f"Session {session_id} cannot be cancelled in current state")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Session cannot be cancelled (status: {db_session.status.value})"
            )
        
        # Set cancel flag
        processing_state = get_processing_state(session_id)
        processing_state["should_cancel"] = True
        processing_state["should_pause"] = False  # Clear pause flag if set
        
        logger.info(
            f"Processing cancellation requested - Session: {session_id}, User: {current_user.username}"
        )
        
        return ProcessingControlResponse(
            session_id=session_id,
            action="cancel",
            status=db_session.status,  # Will be updated to CANCELLED by background task
            message="Processing cancellation requested",
            timestamp=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error cancelling processing for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel processing due to internal error"
        )