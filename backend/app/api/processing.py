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
from ..services.document_intelligence import create_document_processor
from ..services.mock_processor import simulate_document_processing, log_processing_activity, update_session_status
from ..services.delta_aware_processor import (
    DeltaAwareProcessor, create_delta_processing_config, should_use_delta_processing
)
from ..websocket import notifier
from ..services.auto_export_service import trigger_auto_exports

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



async def process_documents_with_intelligence(
    session_id: str,
    db: Session,
    processor,
    processing_state: Dict[str, Any],
    processing_config: Dict[str, Any]
) -> bool:
    """
    Process documents using Azure Document Intelligence or fallback processor
    
    Args:
        session_id: UUID of the session to process
        db: Database session
        processor: Document processor instance (Azure or mock)
        processing_state: Processing state tracking
        processing_config: Processing configuration
        
    Returns:
        True if processing completed successfully, False otherwise
    """
    try:
        session_uuid = uuid.UUID(session_id)
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.error(f"Session not found for processing: {session_id}")
            return False
        
        # Get uploaded files
        car_file = db.query(FileUpload).filter(
            FileUpload.session_id == session_uuid,
            FileUpload.file_type == FileType.CAR
        ).first()
        
        receipt_file = db.query(FileUpload).filter(
            FileUpload.session_id == session_uuid,
            FileUpload.file_type == FileType.RECEIPT
        ).first()
        
        if not car_file or not receipt_file:
            logger.error(f"Required files not found for session {session_id}")
            return False
        
        # Update session status
        await update_session_status(db, session_id, SessionStatus.PROCESSING)
        
        # Notify WebSocket clients that processing started
        await notifier.notify_processing_started(session_id, processing_config)
        
        # Log processing start
        await log_processing_activity(
            db, session_id, ActivityType.PROCESSING,
            "Real document processing started - analyzing PDF files with OCR",
            created_by="system"
        )
        
        # Process CAR document
        logger.info(f"Processing CAR document: {car_file.file_path}")
        car_employees = await processor.process_car_document(car_file.file_path)
        
        # Process Receipt document  
        logger.info(f"Processing Receipt document: {receipt_file.file_path}")
        receipt_employees = await processor.process_receipt_document(receipt_file.file_path)
        
        # Merge and validate employee data
        logger.info(f"Starting merge of employee data - CAR: {len(car_employees)} employees, Receipt: {len(receipt_employees)} employees")
        all_employees = merge_employee_data(car_employees, receipt_employees)
        logger.info(f"Successfully merged employee data - Total employees: {len(all_employees)}")
        
        # Save employee data to database
        total_employees = len(all_employees)
        logger.info(f"Starting database operations for {total_employees} employees")
        processed_count = 0
        
        for i, employee_data in enumerate(all_employees):
            logger.debug(f"Processing employee {i+1}/{total_employees}: {employee_data.get('employee_name', 'Unknown')}")
            
            # Check for cancellation
            if processing_state.get("status") == "cancelled":
                logger.info(f"Processing cancelled for session {session_id}")
                return False
            
            try:
                # Create employee revision
                logger.debug(f"Creating EmployeeRevision object for employee {i+1}")
                employee = EmployeeRevision(
                    session_id=session_uuid,
                    employee_id=employee_data.get('employee_id'),
                    employee_name=employee_data.get('employee_name'),
                    car_amount=employee_data.get('car_amount'),
                    receipt_amount=employee_data.get('receipt_amount'),
                    validation_status=employee_data.get('validation_status', ValidationStatus.VALID),
                    validation_flags=employee_data.get('validation_flags', {})
                )
                
                logger.debug(f"Adding employee {i+1} to database session")
                db.add(employee)
                processed_count += 1
                logger.debug(f"Successfully processed employee {i+1}, total processed: {processed_count}")
                
            except Exception as emp_error:
                logger.error(f"ERROR processing employee {i+1} ({employee_data.get('employee_name', 'Unknown')}): {type(emp_error).__name__}: {str(emp_error)}")
                raise
            
            # Update progress
            percent_complete = int((processed_count / total_employees) * 100)
            
            # Send WebSocket progress update
            await notifier.notify_processing_progress(
                session_id, processed_count, total_employees, "processing"
            )
            
            # Log progress periodically
            if processed_count % 5 == 0 or processed_count == total_employees:
                await log_processing_activity(
                    db, session_id, ActivityType.PROCESSING,
                    f"Processing progress: {processed_count}/{total_employees} employees ({percent_complete}%)",
                    created_by="system"
                )
                
            # Small delay for progress tracking
            await asyncio.sleep(0.1)
        
        # Update session totals
        logger.info(f"Updating session totals - total: {total_employees}, processed: {processed_count}")
        db_session.total_employees = total_employees
        db_session.processed_employees = processed_count
        logger.info(f"Successfully updated session totals")
        
        # Complete processing
        logger.info(f"Attempting to update session status to COMPLETED for session {session_id}")
        await update_session_status(db, session_id, SessionStatus.COMPLETED)
        logger.info(f"Successfully updated session status to COMPLETED")
        
        # Log completion
        logger.info(f"Calculating completion statistics for {processed_count} employees")
        issues_count = sum(1 for emp in all_employees if emp.get('validation_status') == ValidationStatus.NEEDS_ATTENTION)
        logger.info(f"Completion stats - processed: {processed_count}, issues: {issues_count}, valid: {processed_count - issues_count}")
        
        logger.info(f"Logging completion activity for session {session_id}")
        await log_processing_activity(
            db, session_id, ActivityType.PROCESSING,
            f"Real document processing completed successfully - {processed_count} employees processed ({processed_count - issues_count} valid, {issues_count} with issues)",
            created_by="system"
        )
        logger.info(f"Successfully logged completion activity")
        
        logger.info(f"Committing database transaction for session {session_id}")
        db.commit()
        logger.info(f"Successfully committed database transaction")
        logger.info(f"Real document processing completed successfully for session {session_id} - {processed_count} employees, {issues_count} issues detected")
        
        # Notify WebSocket clients of completion
        await notifier.notify_processing_completed(session_id, {
            "total_employees": processed_count,
            "valid_employees": processed_count - issues_count,
            "issues_count": issues_count,
            "processing_time": f"{(time.time() - processing_state.get('start_time', time.time())):.1f}s"
        })
        
        # Trigger automatic exports
        try:
            logger.info(f"Starting auto-export generation for session {session_id}")
            export_results = await trigger_auto_exports(session_id, notify_clients=True)
            logger.info(f"Auto-export completed for session {session_id}: "
                       f"{len(export_results.get('exports_generated', []))} files generated")
        except Exception as export_error:
            logger.error(f"Auto-export failed for session {session_id}: {str(export_error)}")
            # Don't fail the processing if export fails
        
        return True
        
    except Exception as e:
        import traceback
        error_details = {
            'session_id': session_id,
            'error_type': type(e).__name__,
            'error_message': str(e),
            'error_args': e.args,
            'traceback': traceback.format_exc()
        }
        logger.error(f"DETAILED ERROR in real document processing for session {session_id}:")
        logger.error(f"Error Type: {error_details['error_type']}")
        logger.error(f"Error Message: {error_details['error_message']}")
        logger.error(f"Error Args: {error_details['error_args']}")
        logger.error(f"Full Traceback:\n{error_details['traceback']}")
        
        try:
            await update_session_status(db, session_id, SessionStatus.FAILED)
            logger.info(f"Successfully updated session status to FAILED for session {session_id}")
            
            # Notify WebSocket clients of failure
            await notifier.notify_processing_failed(session_id, str(e))
        except Exception as status_error:
            logger.error(f"FAILED to update session status: {type(status_error).__name__}: {str(status_error)}")
            logger.error(f"Status update traceback:\n{traceback.format_exc()}")
        
        try:
            db.rollback()
            logger.info(f"Successfully rolled back database transaction for session {session_id}")
        except Exception as rollback_error:
            logger.error(f"FAILED to rollback database: {type(rollback_error).__name__}: {str(rollback_error)}")
        
        return False


def merge_employee_data(car_employees: List[Dict], receipt_employees: List[Dict]) -> List[Dict]:
    """
    Merge employee data from CAR and Receipt documents
    
    Args:
        car_employees: Employee data from CAR document
        receipt_employees: Employee data from Receipt document
        
    Returns:
        Merged list of employee data
    """
    # Create a dictionary for quick lookup
    receipt_lookup = {emp.get('employee_id'): emp for emp in receipt_employees}
    
    merged_employees = []
    
    for car_emp in car_employees:
        employee_id = car_emp.get('employee_id')
        receipt_emp = receipt_lookup.get(employee_id, {})
        
        # Merge data with CAR taking priority for basic info
        merged_emp = {
            'employee_id': employee_id,
            'employee_name': car_emp.get('employee_name', receipt_emp.get('employee_name')),
            'department': car_emp.get('department', receipt_emp.get('department')),
            'position': car_emp.get('position', receipt_emp.get('position')),
            'amount': car_emp.get('amount', receipt_emp.get('amount')),
            'car_data': car_emp,
            'receipt_data': receipt_emp,
            'validation_status': ValidationStatus.VALID
        }
        
        # Basic validation
        if not merged_emp['employee_name'] or not merged_emp['amount']:
            merged_emp['validation_status'] = ValidationStatus.NEEDS_ATTENTION
        
        merged_employees.append(merged_emp)
    
    return merged_employees


async def process_session(session_id: str, config: Dict[str, Any], db_url: str):
    """
    Enhanced main background processing function with mock document processing
    
    This function performs comprehensive document processing simulation including:
    - Realistic employee data generation (45 employees by default)
    - Sequential processing with proper timing (1 employee per second)
    - Validation issues for every 7th employee
    - Complete processing control support (pause/resume/cancel)
    - Progress tracking and activity logging
    
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
        
        logger.info(f"Starting processing for session {session_id}")
        
        # Check if delta processing should be used
        if should_use_delta_processing(db_session):
            logger.info(f"Using delta processing for session {session_id} with base session {db_session.delta_session_id}")
            
            # Create delta processing configuration
            delta_config = create_delta_processing_config(db_session.processing_options)
            
            # Initialize delta processor
            delta_processor = DeltaAwareProcessor(db)
            
            # Get current user from processing context (we'll need to pass this through)
            # For now, extract from session created_by field
            user = db_session.created_by
            if '\\' in user:
                user = user.split('\\')[1]  # Extract username from domain format
            
            # Execute delta-aware processing
            result = await delta_processor.process_delta_session(
                session_id=session_id,
                config=delta_config,
                processing_state=processing_state,
                user=user
            )
            
            success = result.get('success', False)
            
            if success:
                logger.info(f"Delta processing completed - Processed: {result.get('processed_count', 0)}, "
                           f"Skipped: {result.get('skipped_count', 0)}, "
                           f"Total: {result.get('total_employees', 0)}")
        else:
            logger.info(f"Using real document processing for session {session_id}")
            
            # Get the document processor (Azure or fallback)
            processor = create_document_processor()
            
            # Execute real document processing
            success = await process_documents_with_intelligence(
                session_id=session_id,
                db=db,
                processor=processor,
                processing_state=processing_state,
                processing_config=config
            )
        
        if success:
            logger.info(f"Document processing completed successfully for session {session_id}")
        else:
            logger.info(f"Document processing was cancelled or failed for session {session_id}")
        
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
        logger.error(f"Enhanced processing failed for session {session_id}: {str(e)}")
        processing_state["status"] = "failed"
        
        if db:
            await log_processing_activity(
                db, session_id, ActivityType.PROCESSING_FAILED,
                f"Enhanced processing failed with error: {str(e)}"
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
        
        # CONCURRENT ACCESS PROTECTION: Acquire session lock
        processing_state = get_processing_state(session_id)
        session_lock = _processing_locks.get(session_id)
        
        if not session_lock:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to acquire session lock"
            )
        
        # Try to acquire lock without blocking
        if session_lock.locked():
            logger.warning(f"Session {session_id} is already being processed by another request")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Session is currently being processed by another request"
            )
        
        async with session_lock:
            # Re-check session status after acquiring lock
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
            
            # Get processing configuration with mock processing defaults
            processing_config = request.processing_config if request else ProcessingConfig()
            config_dict = processing_config.model_dump()
            
            # Set default employee count for mock processing if not specified
            if "employee_count" not in config_dict:
                config_dict["employee_count"] = 45
            if "processing_delay" not in config_dict:
                config_dict["processing_delay"] = 1.0  # 1 second per employee
            
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
            
            # Notify WebSocket clients that processing was requested
            await notifier.notify_processing_started(session_id, config_dict)
            
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