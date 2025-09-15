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
from pathlib import Path
import json
import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func

from ..database import get_db, create_isolated_session, safe_commit, atomic_transaction, cleanup_session
from ..resilience import PROCESSING_CIRCUIT_BREAKER, CircuitBreakerOpenException
from ..degradation import get_degradation_manager, handle_database_failure
from ..consistency import validate_and_checkpoint, get_consistency_manager
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
from ..config import settings

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/sessions", tags=["processing"])

# Global storage for processing state and control
_processing_state: Dict[str, Dict[str, Any]] = {}
_processing_locks: Dict[str, asyncio.Lock] = {}

# Global background task health monitoring
_background_task_stats = {
    "tasks_started": 0,
    "tasks_completed": 0,
    "tasks_failed": 0,
    "active_tasks": set(),
    "last_task_start": None,
    "last_task_completion": None
}


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

def _track_task_start(session_id: str):
    """Track background task start"""
    _background_task_stats["tasks_started"] += 1
    _background_task_stats["active_tasks"].add(session_id)
    _background_task_stats["last_task_start"] = datetime.now(timezone.utc).isoformat()

def _track_task_completion(session_id: str, success: bool):
    """Track background task completion"""
    _background_task_stats["active_tasks"].discard(session_id)
    _background_task_stats["last_task_completion"] = datetime.now(timezone.utc).isoformat()
    if success:
        _background_task_stats["tasks_completed"] += 1
    else:
        _background_task_stats["tasks_failed"] += 1

def _calculate_success_rate() -> float:
    """Calculate background task success rate"""
    total = _background_task_stats["tasks_completed"] + _background_task_stats["tasks_failed"]
    if total == 0:
        return 100.0
    return (_background_task_stats["tasks_completed"] / total) * 100.0

def cleanup_abandoned_sessions():
    """Clean up processing state for abandoned sessions (older than 24 hours)"""
    import time
    current_time = time.time()
    sessions_to_remove = []
    
    for session_id, state in _processing_state.items():
        start_time = state.get('start_time')
        if start_time and (current_time - start_time) > 86400:  # 24 hours
            sessions_to_remove.append(session_id)
        elif not start_time and state.get('status') == 'idle':
            # Clean up idle sessions older than 1 hour
            sessions_to_remove.append(session_id)
    
    for session_id in sessions_to_remove:
        clear_processing_state(session_id)
        logger.info(f"Cleaned up abandoned session state: {session_id}")
    
    return len(sessions_to_remove)


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
        try:
            from ..websocket import websocket_manager as notifier
            await notifier.notify_processing_started(session_id, processing_config)
        except Exception as notify_error:
            logger.warning(f"Failed to notify clients of processing start: {notify_error}")
        
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

        # Phase 2: Persist line-level artifacts if enabled (scaffolding)
        try:
            if settings.lines_enabled:
                session_dir = Path(settings.upload_path) / session_id / "parsed"
                session_dir.mkdir(parents=True, exist_ok=True)

                # Collect lines from processors (best-effort)
                from ..services.pdf_processor import create_pdf_processor
                car_proc = create_pdf_processor('car')
                rcpt_proc = create_pdf_processor('receipt')
                car_lines = []
                receipt_lines = []
                try:
                    car_lines = car_proc.collect_car_lines(car_file.file_path)
                except Exception as e:
                    logger.warning(f"collect_car_lines failed: {e}")
                try:
                    receipt_lines = rcpt_proc.collect_receipt_entries(receipt_file.file_path)
                except Exception as e:
                    logger.warning(f"collect_receipt_entries failed: {e}")

                # Group by employee key
                def emp_key(name: str) -> str:
                    return (name or "").replace(" ", "").upper()

                def group_lines(lines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
                    grouped: Dict[str, Dict[str, Any]] = {}
                    for ln in lines:
                        key = emp_key(ln.get('employee_name'))
                        if key not in grouped:
                            grouped[key] = {
                                'employee_key': key,
                                'employee_id': ln.get('employee_id'),
                                'employee_name': ln.get('employee_name'),
                                'lines': []
                            }
                        grouped[key]['lines'].append(ln)
                    return list(grouped.values())

                receipts_json = {
                    'version': '1.0',
                    'session_id': session_id,
                    'source': 'receipts',
                    'employees': group_lines(receipt_lines)
                }
                car_json = {
                    'version': '1.0',
                    'session_id': session_id,
                    'source': 'car',
                    'employees': group_lines(car_lines)
                }

                # Atomic write helpers
                def atomic_write(path: Path, payload: Dict[str, Any]):
                    tmp = path.with_suffix(path.suffix + ".tmp")
                    with open(tmp, "w", encoding="utf-8") as f:
                        json.dump(payload, f, ensure_ascii=False, indent=2)
                    os.replace(tmp, path)

                receipts_path = session_dir / "receipts.lines.json"
                car_path = session_dir / "car.lines.json"
                atomic_write(receipts_path, receipts_json)
                atomic_write(car_path, car_json)

                # Optional matching
                if settings.line_matching_enabled:
                    try:
                        from ..services.line_matching import build_matches_payload
                        matches_payload = build_matches_payload(session_id, receipts_json, car_json)
                        atomic_write(session_dir / "matches.json", matches_payload)
                    except Exception as match_err:
                        logger.warning(f"Line matching failed (non-fatal): {match_err}")
        except Exception as persist_err:
            logger.warning(f"Line-artifact write failed (non-fatal): {persist_err}")
        
        # Merge and validate employee data
        logger.info(f"Starting merge of employee data - CAR: {len(car_employees)} employees, Receipt: {len(receipt_employees)} employees")
        all_employees = merge_employee_data(car_employees, receipt_employees)
        logger.info(f"Successfully merged employee data - Total employees: {len(all_employees)}")

        # Guard: If no employees detected, fail fast with clear message
        if len(all_employees) == 0:
            logger.error(f"No employees detected in CAR / Receipt for session {session_id}. Marking as FAILED.")
            await update_session_status(db, session_id, SessionStatus.FAILED)
            try:
                from ..websocket import websocket_manager as notifier
                await notifier.notify_processing_failed(
                    session_id,
                    "No employees detected in CAR / Receipt. Please verify document formats or regex patterns."
                )
            except Exception as notify_error:
                logger.warning(f"Failed to notify clients of processing failure: {notify_error}")
            return False
        
        # Check for cancellation BEFORE starting database operations
        if processing_state.get("status") == "cancelled":
            logger.info(f"Processing cancelled before database operations for session {session_id}")
            return False
        
        # Set totals immediately after merge so UI can show determinate progress
        total_employees = len(all_employees)
        
        # Use circuit breaker for initial database setup
        try:
            with PROCESSING_CIRCUIT_BREAKER.protect():
                if not safe_commit(db):
                    raise Exception("Failed to commit initial session setup")
                
                # Update session totals with isolated transaction
                with atomic_transaction() as session:
                    session_obj = session.query(ProcessingSession).filter(
                        ProcessingSession.session_id == session_uuid
                    ).first()
                    if session_obj:
                        session_obj.total_employees = total_employees
                        session_obj.processed_employees = 0

        except CircuitBreakerOpenException:
            logger.error("Circuit breaker is open - processing unavailable")
            return handle_database_failure("processing", session_id)
        except Exception as e:
            logger.error(f"Failed to initialize processing session: {e}")
            return handle_database_failure("processing", session_id)

        # Send initial 0% progress update with known total
        try:
            from ..websocket import websocket_manager as notifier
            await notifier.notify_processing_progress(
                session_id, 0, total_employees, "processing"
            )
        except Exception as notify_error:
            logger.warning(f"Failed to notify clients of processing progress: {notify_error}")

        # Process employees in batches with consistency checks
        logger.info(f"Starting batch processing for {total_employees} employees")
        processed_count = 0
        batch_size = 5
        batch_number = 0
        
        # Build index mappings while saving revisions
        index_records: List[Dict[str, Any]] = []
        
        # Process in batches to avoid long-running transactions
        for batch_start in range(0, total_employees, batch_size):
            batch_end = min(batch_start + batch_size, total_employees)
            batch_employees = all_employees[batch_start:batch_end]
            batch_number += 1
            
            logger.debug(f"Processing batch {batch_number}: employees {batch_start+1}-{batch_end}")
            
            # Check for cancellation before each batch
            if processing_state.get("status") == "cancelled":
                logger.info(f"Processing cancelled during batch {batch_number} for session {session_id}")
                return False
            
            # Validate batch data and create checkpoint
            validation_result, checkpoint = validate_and_checkpoint(
                session_id=session_id,
                batch_number=batch_number,
                processed_count=processed_count,
                total_count=total_employees,
                employee_data=batch_employees
            )
            
            if not validation_result.is_valid:
                logger.warning(f"Batch {batch_number} validation failed: {validation_result.errors}")
                # Continue with warnings, but log errors
                for error in validation_result.errors:
                    logger.error(f"Validation error: {error}")
            
            # Process batch with circuit breaker protection
            batch_success = False
            try:
                with PROCESSING_CIRCUIT_BREAKER.protect():
                    batch_success = await _process_employee_batch(
                        batch_employees, session_uuid, batch_number, 
                        processed_count, index_records
                    )
                    
                if batch_success:
                    processed_count += len(batch_employees)
                    
                    # Update progress with status update circuit breaker
                    await _update_batch_progress(
                        session_uuid, session_id, processed_count, total_employees
                    )
                    
                else:
                    logger.error(f"Batch {batch_number} processing failed")
                    break
                    
            except CircuitBreakerOpenException:
                logger.error(f"Circuit breaker open during batch {batch_number}")
                return handle_database_failure("processing", session_id, batch_number=batch_number)
            except Exception as e:
                logger.error(f"Error processing batch {batch_number}: {e}")
                return handle_database_failure("processing", session_id, batch_number=batch_number)
            
            # Clean up old checkpoints periodically
            if batch_number % 10 == 0:
                get_consistency_manager().cleanup_checkpoints(session_id)

        # Verify final processing count
        if processed_count != total_employees:
            logger.warning(f"Processing incomplete: {processed_count}/{total_employees} employees processed")
            
        # Final integrity check
        consistency_manager = get_consistency_manager()
        try:
            with atomic_transaction() as integrity_session:
                integrity_result = consistency_manager.verify_data_integrity(integrity_session, session_id)
                
                if not integrity_result.is_valid:
                    logger.error(f"Data integrity check failed: {integrity_result.errors}")
                    # Don't fail the entire processing, but log for investigation
                    
        except Exception as e:
            logger.warning(f"Could not perform integrity check: {e}")
        
        # Update session totals and complete processing
        logger.info(f"Finalizing processing - total: {total_employees}, processed: {processed_count}")
        
        # Use circuit breaker for final session updates
        try:
            with PROCESSING_CIRCUIT_BREAKER.protect():
                with atomic_transaction() as final_session:
                    # Update session totals
                    db_session = final_session.query(ProcessingSession).filter(
                        ProcessingSession.session_id == session_uuid
                    ).first()
                    
                    if db_session:
                        db_session.total_employees = total_employees
                        db_session.processed_employees = processed_count
                        db_session.status = SessionStatus.COMPLETED
                        db_session.updated_at = datetime.now(timezone.utc)
                        logger.info(f"Successfully updated session {session_id} status to COMPLETED")
                    else:
                        logger.error(f"Failed to find session {session_id} for status update")
                        raise ValueError(f"Session {session_id} not found for status update")
                
                # Log completion with separate session to avoid conflicts
                issues_count = sum(1 for emp in all_employees if emp.get('validation_status') == ValidationStatus.NEEDS_ATTENTION)
                logger.info(f"Completion stats - processed: {processed_count}, issues: {issues_count}, valid: {processed_count - issues_count}")
                
                # Use a separate database session for logging
                with atomic_transaction() as log_session:
                    await log_processing_activity(
                        log_session, session_id, ActivityType.PROCESSING,
                        f"Batch processing completed successfully - {processed_count} employees processed ({processed_count - issues_count} valid, {issues_count} with issues)",
                        created_by="system"
                    )
                
        except CircuitBreakerOpenException:
            logger.error(f"Circuit breaker open during final processing steps for session {session_id}")
            return handle_database_failure("processing", session_id, final_step=True)
        except Exception as e:
            logger.error(f"Failed to finalize processing for session {session_id}: {e}")
            logger.error(f"Session {session_id} remains in PROCESSING status due to update failure")
            return handle_database_failure("processing", session_id, final_step=True)
        
        # Write index.json last (after revisions exist)
        try:
            if settings.lines_enabled:
                session_dir = Path(settings.upload_path) / session_id / "parsed"
                session_dir.mkdir(parents=True, exist_ok=True)
                tmp = session_dir / "index.json.tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump({
                        'version': '1.0',
                        'session_id': session_id,
                        'employees': index_records
                    }, f, ensure_ascii=False, indent=2)
                os.replace(tmp, session_dir / "index.json")
        except Exception as idx_err:
            logger.warning(f"Failed to write index.json (non-fatal): {idx_err}")

        # Final cleanup and completion
        get_consistency_manager().cleanup_checkpoints(session_id, keep_latest=1)
        
        logger.info(f"Batch processing completed successfully for session {session_id} - {processed_count} employees processed")
        
        # Notify WebSocket clients of completion
        issues_count = sum(1 for emp in all_employees if emp.get('validation_status') == ValidationStatus.NEEDS_ATTENTION)
        try:
            from ..websocket import websocket_manager as notifier
            await notifier.notify_processing_completed(session_id, {
                "total_employees": processed_count,
                "valid_employees": processed_count - issues_count,
                "issues_count": issues_count,
                "processing_time": f"{(time.time() - processing_state.get('start_time', time.time())):.1f}s",
                "batch_processing": True
            })
        except Exception as e:
            logger.warning(f"Failed to send completion notification: {e}")
        
        # Trigger automatic exports with circuit breaker protection
        try:
            from ..resilience import EXPORT_CIRCUIT_BREAKER
            with EXPORT_CIRCUIT_BREAKER.protect():
                logger.info(f"Starting auto-export generation for session {session_id}")
                export_results = await trigger_auto_exports(session_id, notify_clients=True)
                logger.info(f"Auto-export completed for session {session_id}: "
                           f"{len(export_results.get('exports_generated', []))} files generated")
        except CircuitBreakerOpenException:
            logger.warning("Export circuit breaker open - auto-export skipped")
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
        
        # Handle failure with circuit breaker and graceful degradation
        try:
            # Try to update session status with isolated transaction
            with atomic_transaction() as failure_session:
                db_session = failure_session.query(ProcessingSession).filter(
                    ProcessingSession.session_id == session_uuid
                ).first()
                
                if db_session:
                    db_session.status = SessionStatus.FAILED
                    db_session.updated_at = datetime.now(timezone.utc)
            
            logger.info(f"Successfully updated session status to FAILED for session {session_id}")
            
            # Notify WebSocket clients of failure
            try:
                from ..websocket import websocket_manager as notifier
                await notifier.notify_processing_failed(session_id, str(e))
            except Exception as notify_error:
                logger.warning(f"Failed to notify clients of processing failure: {notify_error}")
            
        except Exception as status_error:
            logger.error(f"FAILED to update session status: {type(status_error).__name__}: {str(status_error)}")
            # Use degradation system to handle this failure
            return handle_database_failure("processing", session_id, error=str(e))
        
        # Preserve any checkpoints for potential recovery
        try:
            latest_checkpoint = get_consistency_manager().get_latest_checkpoint(session_id)
            if latest_checkpoint:
                logger.info(f"Processing failed but checkpoint {latest_checkpoint.checkpoint_id[:8]} preserved for recovery")
        except Exception as checkpoint_error:
            logger.warning(f"Could not preserve checkpoint: {checkpoint_error}")
        
        return False


async def _process_employee_batch(
    batch_employees: List[Dict[str, Any]], 
    session_uuid: str, 
    batch_number: int,
    processed_count: int,
    index_records: List[Dict[str, Any]]
) -> bool:
    """
    Process a batch of employees with isolated database session
    
    Args:
        batch_employees: List of employee data to process
        session_uuid: Processing session UUID
        batch_number: Current batch number
        processed_count: Number of employees already processed
        index_records: List to append index data to
        
    Returns:
        True if batch processed successfully, False otherwise
    """
    logger.debug(f"Processing batch {batch_number} with {len(batch_employees)} employees")
    
    batch_index_records = []  # Temporary index records for this batch
    
    try:
        with atomic_transaction() as session:
            for i, employee_data in enumerate(batch_employees):
                employee_name = employee_data.get('employee_name', 'Unknown')
                logger.debug(f"Processing employee {i+1}/{len(batch_employees)} in batch {batch_number}: {employee_name}")
                
                try:
                    # Derive validation flags and status
                    car_amount_val = employee_data.get('car_amount')
                    receipt_amount_val = employee_data.get('receipt_amount')
                    
                    try:
                        car_amount_f = float(car_amount_val) if car_amount_val is not None else None
                    except (TypeError, ValueError):
                        car_amount_f = None
                        logger.warning(f"Invalid car_amount for {employee_name}: {car_amount_val}")
                        
                    try:
                        receipt_amount_f = float(receipt_amount_val) if receipt_amount_val is not None else None
                    except (TypeError, ValueError):
                        receipt_amount_f = None
                        logger.warning(f"Invalid receipt_amount for {employee_name}: {receipt_amount_val}")

                    validation_flags = {}
                    needs_attention = False

                    # Missing receipts
                    if receipt_amount_f is None or receipt_amount_f <= 0:
                        validation_flags['missing_receipt'] = True
                        needs_attention = True

                    # Amount mismatch when both present
                    if car_amount_f is not None and receipt_amount_f is not None:
                        if abs(car_amount_f - receipt_amount_f) > 0.01:
                            validation_flags['amount_mismatch'] = True
                            needs_attention = True

                    validation_status = ValidationStatus.NEEDS_ATTENTION if needs_attention else ValidationStatus.VALID
                    
                    # Add convenience counts placeholder (will be populated when entries persisted)
                    if settings.lines_enabled:
                        validation_flags['receipt_entry_count'] = validation_flags.get('receipt_entry_count', 0)
                        validation_flags['car_line_count'] = validation_flags.get('car_line_count', 0)

                    # Create employee revision
                    employee = EmployeeRevision(
                        session_id=session_uuid,
                        employee_id=employee_data.get('employee_id'),
                        employee_name=employee_data.get('employee_name'),
                        car_amount=employee_data.get('car_amount'),
                        receipt_amount=employee_data.get('receipt_amount'),
                        validation_status=validation_status,
                        validation_flags=validation_flags
                    )
                    
                    session.add(employee)
                    session.flush()  # Get the revision_id
                    
                    # Add to temporary index records for this batch
                    if settings.lines_enabled:
                        batch_index_records.append({
                            'employee_key': (employee.employee_name or '').replace(' ', '').upper(),
                            'employee_id': employee.employee_id,
                            'employee_name': employee.employee_name,
                            'revision_id': str(employee.revision_id)
                        })
                    
                except Exception as emp_error:
                    logger.error(f"Error processing employee {i+1} ({employee_name}) in batch {batch_number}: {emp_error}")
                    # Continue with other employees in the batch, but log the error
                    # The transaction will still complete for valid employees
                    continue
        
        # Only add to main index records if the entire batch transaction succeeded
        index_records.extend(batch_index_records)
        logger.debug(f"Successfully processed batch {batch_number} with {len(batch_index_records)} employees")
        return True
        
    except Exception as e:
        logger.error(f"Error processing employee batch {batch_number}: {e}")
        # Don't extend index_records since the batch failed
        return False


async def _update_batch_progress(
    session_uuid: str,
    session_id: str, 
    processed_count: int,
    total_employees: int
):
    """
    Update processing progress with isolated database session
    
    Args:
        session_uuid: Processing session UUID
        session_id: Processing session ID string
        processed_count: Number of employees processed so far
        total_employees: Total number of employees to process
    """
    from ..resilience import STATUS_UPDATE_CIRCUIT_BREAKER
    
    try:
        with STATUS_UPDATE_CIRCUIT_BREAKER.protect():
            with atomic_transaction() as session:
                # Update session progress
                db_session = session.query(ProcessingSession).filter(
                    ProcessingSession.session_id == session_uuid
                ).first()
                
                if db_session:
                    db_session.processed_employees = processed_count
            
            # Send WebSocket progress update
            from ..websocket import websocket_manager as notifier
            await notifier.notify_processing_progress(
                session_id, processed_count, total_employees, "processing"
            )
            
            # Log progress periodically
            if processed_count % 10 == 0 or processed_count == total_employees:
                percent_complete = int((processed_count / total_employees) * 100)
                # Use a separate database session for logging
                with atomic_transaction() as log_session:
                    await log_processing_activity(
                        log_session, session_id, ActivityType.PROCESSING,
                        f"Batch processing progress: {processed_count}/{total_employees} employees ({percent_complete}%)",
                        created_by="system"
                    )
                
    except Exception as e:
        # Import here since CircuitBreakerOpenException is only used in except block
        from ..resilience import CircuitBreakerOpenException
        if isinstance(e, CircuitBreakerOpenException):
            logger.warning("Status update circuit breaker open - progress update skipped")
        else:
            logger.warning(f"Failed to update batch progress: {e}")


def merge_employee_data(car_employees: List[Dict], receipt_employees: List[Dict]) -> List[Dict]:
    """
    Merge employee data from CAR and Receipt documents
    
    Args:
        car_employees: Employee data from CAR document
        receipt_employees: Employee data from Receipt document
        
    Returns:
        Merged list of employee data
    """
    # Normalize Employee IDs to digits-only for reliable matching
    import re
    def _norm_emp_id(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        norm = re.sub(r"\D+", "", str(value))
        return norm if norm else None

    # Create dictionaries for quick lookup by normalized Employee ID
    receipt_lookup = { _norm_emp_id(emp.get('employee_id')): emp for emp in receipt_employees if _norm_emp_id(emp.get('employee_id')) }
    car_lookup = { _norm_emp_id(emp.get('employee_id')): emp for emp in car_employees if _norm_emp_id(emp.get('employee_id')) }
    
    merged_employees = []
    processed_ids = set()
    
    # Process CAR employees first (with potential receipt matches)
    for car_emp in car_employees:
        raw_emp_id = car_emp.get('employee_id')
        employee_id = _norm_emp_id(raw_emp_id)
        receipt_emp = receipt_lookup.get(employee_id) if employee_id else None
        if not receipt_emp:
            receipt_emp = {}
        
        # Merge data with CAR taking priority for identity; use standard keys from processors
        car_amount = car_emp.get('car_amount') if isinstance(car_emp, dict) else None
        receipt_amount = receipt_emp.get('receipt_amount') if isinstance(receipt_emp, dict) else None

        merged_emp = {
            'employee_id': employee_id,
            'employee_name': car_emp.get('employee_name', receipt_emp.get('employee_name')),
            'department': car_emp.get('department', receipt_emp.get('department')),
            'position': car_emp.get('position', receipt_emp.get('position')),
            'car_amount': car_amount,
            'receipt_amount': receipt_amount,
            'car_data': car_emp,
            'receipt_data': receipt_emp,
            'validation_status': ValidationStatus.VALID
        }

        # Basic validation: require a name and at least one amount > 0
        if (not merged_emp['employee_name'] or
                ((merged_emp['car_amount'] is None or float(merged_emp['car_amount']) <= 0) and
                 (merged_emp['receipt_amount'] is None or float(merged_emp['receipt_amount']) <= 0))):
            merged_emp['validation_status'] = ValidationStatus.NEEDS_ATTENTION
        
        merged_employees.append(merged_emp)
        if employee_id:
            processed_ids.add(employee_id)
    
    # Process receipt-only employees (not found in CAR)
    for receipt_emp in receipt_employees:
        employee_id = _norm_emp_id(receipt_emp.get('employee_id'))
        
        # Skip if already processed from CAR data
        if employee_id and employee_id in processed_ids:
            continue
            
        # Create receipt-only employee record
        merged_emp = {
            'employee_id': employee_id,
            'employee_name': receipt_emp.get('employee_name'),
            'department': receipt_emp.get('department'),
            'position': receipt_emp.get('position'),
            'car_amount': None,
            'receipt_amount': receipt_emp.get('receipt_amount'),
            'car_data': {},
            'receipt_data': receipt_emp,
            'validation_status': ValidationStatus.NEEDS_ATTENTION  # Receipt-only needs attention
        }
        
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
            _track_task_completion(session_id, True)
            logger.info(f"Document processing completed successfully for session {session_id}")
        else:
            _track_task_completion(session_id, False)
            logger.info(f"Document processing was cancelled or failed for session {session_id}")
        
    except asyncio.CancelledError:
        _track_task_completion(session_id, False)
        logger.info(f"Processing task cancelled for session {session_id}")
        processing_state["status"] = "cancelled"
        
        if db:
            await log_processing_activity(
                db, session_id, ActivityType.PROCESSING_CANCELLED,
                "Processing task cancelled"
            )
            await update_session_status(db, session_id, SessionStatus.CANCELLED)
        
    except Exception as e:
        _track_task_completion(session_id, False)
        logger.error(f"Enhanced processing failed for session {session_id}: {str(e)}")
        processing_state["status"] = "failed"
        
        if db:
            await log_processing_activity(
                db, session_id, ActivityType.PROCESSING_FAILED,
                f"Enhanced processing failed with error: {str(e)}"
            )
            await update_session_status(db, session_id, SessionStatus.FAILED)
            # Also notify clients immediately about the failure
            try:
                from ..websocket import websocket_manager as notifier
                await notifier.notify_processing_failed(session_id, str(e))
            except Exception:
                pass
        
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
        
        # ENHANCED STUCK SESSION DETECTION: Check for stuck processing state
        if session_id in _processing_state:
            state = _processing_state[session_id]
            if state.get("status") == "processing" and state.get("start_time"):
                age = time.time() - state["start_time"]
                if age > 900:  # 15 minutes
                    logger.warning(f"Clearing stuck processing state for {session_id} (age: {age:.0f}s)")
                    clear_processing_state(session_id)
                    
                    # Reset database status to allow restart
                    if db_session.status == SessionStatus.PROCESSING:
                        db_session.status = SessionStatus.READY
                        db_session.processed_employees = 0
                        db.commit()
                        logger.info(f"Reset stuck session {session_id} from PROCESSING to READY")
                        
        session_lock = _processing_locks.get(session_id)
        
        if not session_lock:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to acquire session lock"
            )
        
        # Try to acquire lock with timeout to prevent race condition
        try:
            # Use asyncio.wait_for with try_acquire pattern to avoid race condition
            # Increased timeout to 1.0 seconds to prevent false conflicts under load
            acquired = await asyncio.wait_for(session_lock.acquire(), timeout=1.0)
            if not acquired:
                logger.warning(f"Session {session_id} is already being processed by another request")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Session is currently being processed by another request"
                )
        except asyncio.TimeoutError:
            logger.warning(f"Session {session_id} lock acquisition timeout - system may be under load")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Session is currently being processed by another request or system is under load"
            )
        
        try:
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
            
            # Add comprehensive logging around background task execution
            logger.info(f"Starting background processing task for session {session_id}")
            logger.info(f"Background task configuration: {config_dict}")
            logger.info(f"Database URL: {db_url}")

            # Add success/failure callbacks
            def on_task_success(session_id: str):
                logger.info(f"Background processing task completed successfully for session {session_id}")

            def on_task_failure(session_id: str, error: Exception):
                logger.error(f"Background processing task failed for session {session_id}: {error}")

            try:
                # Track task start
                _track_task_start(session_id)
                
                # Start background processing with enhanced logging
                background_tasks.add_task(
                    process_session,
                    session_id,
                    config_dict,
                    db_url
                )
                logger.info(f"Background task added successfully for session {session_id}")
                
                # Add a fallback execution method
                asyncio.create_task(
                    process_session(session_id, config_dict, db_url)
                )
                logger.info(f"Fallback async task created for session {session_id}")
                
            except Exception as e:
                _track_task_completion(session_id, False)
                logger.error(f"Failed to start background processing for session {session_id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to start background processing: {str(e)}"
                )
            
            # Notify WebSocket clients that processing was requested
            try:
                from ..websocket import websocket_manager as notifier
                await notifier.notify_processing_started(session_id, config_dict)
            except Exception as notify_error:
                logger.warning(f"Failed to notify clients of processing start: {notify_error}")
            
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
        finally:
            # Always release the lock
            if session_lock.locked():
                session_lock.release()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fatal error in start_processing for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start processing"
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


def check_processing_timeouts():
    """Check for stuck processing sessions and reset them"""
    logger = logging.getLogger(__name__)
    current_time = time.time()
    stuck_sessions = []
    
    # Check all processing states for timeouts
    for session_id, state in _processing_state.items():
        start_time = state.get('start_time')
        if start_time and (current_time - start_time) > 900:  # 15 minutes
            stuck_sessions.append(session_id)
            logger.warning(f"Session {session_id} has been processing for {current_time - start_time:.0f} seconds - marking as stuck")
    
    # Reset stuck sessions
    for session_id in stuck_sessions:
        try:
            # Update database status
            from ..database import SessionLocal
            db = SessionLocal()
            try:
                session_uuid = uuid.UUID(session_id)
                db_session = db.query(ProcessingSession).filter(
                    ProcessingSession.session_id == session_uuid
                ).first()
                
                if db_session and db_session.status == SessionStatus.PROCESSING:
                    db_session.status = SessionStatus.FAILED
                    db.commit()
                    logger.info(f"Reset stuck session {session_id} to FAILED status")
                    
                    # Clear processing state
                    clear_processing_state(session_id)
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to reset stuck session {session_id}: {e}")

# Add periodic timeout checking
import threading
def start_timeout_monitor():
    """Start background timeout monitoring"""
    def timeout_worker():
        while True:
            try:
                check_processing_timeouts()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error in timeout monitor: {e}")
                time.sleep(60)
    
    timeout_thread = threading.Thread(target=timeout_worker, daemon=True)
    timeout_thread.start()
    logger.info("Processing timeout monitor started")

@router.get("/health/background-tasks")
async def get_background_task_health():
    """
    Get background task execution statistics and health status
    
    Returns:
        Dict[str, Any]: Background task health information including statistics,
                       active task count, and success rate
    """
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "tasks_started": _background_task_stats["tasks_started"],
            "tasks_completed": _background_task_stats["tasks_completed"],
            "tasks_failed": _background_task_stats["tasks_failed"],
            "active_count": len(_background_task_stats["active_tasks"]),
            "success_rate_percent": round(_calculate_success_rate(), 2)
        },
        "active_tasks": list(_background_task_stats["active_tasks"]),
        "last_task_start": _background_task_stats["last_task_start"],
        "last_task_completion": _background_task_stats["last_task_completion"],
        "health_status": "healthy" if _calculate_success_rate() > 80.0 else "degraded"
    }


@router.get("/health/circuit-breakers")
async def get_circuit_breaker_health():
    """
    Get circuit breaker status for all registered circuit breakers
    
    Returns:
        Dict[str, Any]: Circuit breaker status information including state, metrics,
                       and configuration for diagnostic purposes
    """
    from ..resilience import get_circuit_breaker_status
    
    circuit_status = get_circuit_breaker_status()
    
    # Calculate overall health
    overall_health = "healthy"
    open_breakers = []
    
    for name, status in circuit_status.items():
        if status["state"] == "open":
            open_breakers.append(name)
            overall_health = "degraded"
        elif status["state"] == "half_open":
            overall_health = "recovering"
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "overall_health": overall_health,
        "open_breakers": open_breakers,
        "total_breakers": len(circuit_status),
        "circuit_breakers": circuit_status
    }