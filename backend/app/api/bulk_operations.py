"""
Bulk Operations API Endpoints
Handles bulk delete, export, and validation for multiple sessions
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import asyncio
import json
import csv
import io
import uuid
from pathlib import Path

from ..database import get_db
from ..models import ProcessingSession
from ..schemas_bulk.bulk_operations import (
    BulkActionRequest,
    BulkDeleteRequest,
    BulkExportRequest,
    BulkValidationRequest,
    BulkOperationResponse,
    ValidationResult,
    SessionBulkInfo
)
from ..auth import get_current_user
from ..services.bulk_service import BulkOperationService
from ..websocket import manager as ws_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/bulk", tags=["bulk-operations"])

# Constants for bulk operations
MAX_BULK_SIZE = 1000
MAX_EXPORT_SIZE = 10000
OPERATION_TIMEOUT = 300  # 5 minutes
EXPORT_RETENTION_HOURS = 24

@router.post("/sessions/validate", response_model=ValidationResult)
async def validate_bulk_action(
    request: BulkValidationRequest,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Pre-validate bulk action feasibility
    Returns eligible, ineligible, and not found sessions
    """
    try:
        logger.info(f"Validating bulk {request.action} for {len(request.session_ids)} sessions")
        
        if len(request.session_ids) > MAX_BULK_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {MAX_BULK_SIZE} sessions allowed per operation"
            )
        
        service = BulkOperationService(db)
        result = service.validate_sessions(request.session_ids, request.action)
        
        logger.info(
            f"Validation complete: {result['eligible_count']} eligible, "
            f"{result['ineligible_count']} ineligible, {result['not_found_count']} not found"
        )
        
        return ValidationResult(**result)
        
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/delete", response_model=BulkOperationResponse)
async def bulk_delete_sessions(
    request: BulkDeleteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete multiple sessions atomically
    Includes soft delete option and cascade handling
    """
    try:
        logger.info(f"Bulk delete requested for {len(request.session_ids)} sessions")
        
        # Validate request
        if len(request.session_ids) == 0:
            raise HTTPException(status_code=400, detail="No sessions provided")
        
        if len(request.session_ids) > MAX_BULK_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {MAX_BULK_SIZE} sessions allowed per operation"
            )
        
        service = BulkOperationService(db)
        
        # Validate sessions first
        validation = service.validate_sessions(request.session_ids, 'delete')
        
        if validation['eligible_count'] == 0:
            return BulkOperationResponse(
                success=False,
                operation_id=str(uuid.uuid4()),
                action='delete',
                total_requested=len(request.session_ids),
                processed_count=0,
                failed_count=validation['ineligible_count'],
                failed_items=validation['ineligible'],
                message="No eligible sessions to delete"
            )
        
        # Perform deletion
        operation_id = str(uuid.uuid4())
        
        # Start transaction
        try:
            result = service.perform_bulk_delete(
                session_ids=validation['eligible_ids'],
                soft_delete=request.soft_delete,
                cascade_exports=request.cascade_exports,
                user_id=current_user.get('id')
            )
            
            db.commit()
            
            # Notify via WebSocket
            background_tasks.add_task(
                notify_bulk_operation_complete,
                operation_id,
                'delete',
                result
            )
            
            return BulkOperationResponse(
                success=True,
                operation_id=operation_id,
                action='delete',
                total_requested=len(request.session_ids),
                processed_count=result['deleted_count'],
                failed_count=result['failed_count'],
                processed_items=result['deleted_ids'],
                failed_items=result['failed_items'],
                message=f"Successfully deleted {result['deleted_count']} sessions"
            )
            
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk delete transaction failed: {str(e)}")
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk delete error: {str(e)}")
        return handle_bulk_operation_error(e, 'delete', request.session_ids)

@router.post("/sessions/export-metadata", response_model=BulkOperationResponse)
async def export_session_metadata(
    request: BulkExportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Export metadata for selected sessions
    Supports CSV and JSON formats
    """
    try:
        logger.info(f"Bulk export requested for {len(request.session_ids)} sessions")
        
        if len(request.session_ids) > MAX_EXPORT_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {MAX_EXPORT_SIZE} sessions allowed for export"
            )
        
        service = BulkOperationService(db)
        
        # Get session data
        sessions = service.get_sessions_by_ids(request.session_ids)
        
        if not sessions:
            raise HTTPException(status_code=404, detail="No sessions found")
        
        # Generate export
        operation_id = str(uuid.uuid4())
        export_format = request.format.lower()
        
        if export_format == 'csv':
            export_data = generate_csv_export(sessions, request.include_details)
            file_extension = 'csv'
            content_type = 'text/csv'
        elif export_format == 'json':
            export_data = generate_json_export(sessions, request.include_details)
            file_extension = 'json'
            content_type = 'application/json'
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")
        
        # Save export file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"session_export_{timestamp}_{operation_id[:8]}.{file_extension}"
        file_path = save_export_file(export_data, filename)
        
        # Schedule cleanup
        background_tasks.add_task(
            cleanup_export_file,
            file_path,
            EXPORT_RETENTION_HOURS
        )
        
        # Notify via WebSocket
        background_tasks.add_task(
            notify_bulk_operation_complete,
            operation_id,
            'export',
            {'file_path': str(file_path), 'count': len(sessions)}
        )
        
        return BulkOperationResponse(
            success=True,
            operation_id=operation_id,
            action='export',
            total_requested=len(request.session_ids),
            processed_count=len(sessions),
            failed_count=len(request.session_ids) - len(sessions),
            download_url=f"/api/download/{filename}",
            message=f"Exported {len(sessions)} sessions",
            metadata={
                'format': export_format,
                'file_size': len(export_data),
                'expires_at': (datetime.now() + timedelta(hours=EXPORT_RETENTION_HOURS)).isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        return handle_bulk_operation_error(e, 'export', request.session_ids)

@router.post("/sessions/close", response_model=BulkOperationResponse)
async def bulk_close_sessions(
    request: BulkActionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Close multiple sessions
    Sets status to CLOSED and updates timestamps
    """
    try:
        logger.info(f"Bulk close requested for {len(request.session_ids)} sessions")
        
        service = BulkOperationService(db)
        
        # Validate sessions
        validation = service.validate_sessions(request.session_ids, 'close')
        
        if validation['eligible_count'] == 0:
            return BulkOperationResponse(
                success=False,
                operation_id=str(uuid.uuid4()),
                action='close',
                total_requested=len(request.session_ids),
                processed_count=0,
                failed_count=validation['ineligible_count'],
                failed_items=validation['ineligible'],
                message="No eligible sessions to close"
            )
        
        # Perform closure
        operation_id = str(uuid.uuid4())
        
        try:
            result = service.perform_bulk_close(
                session_ids=validation['eligible_ids'],
                user_id=current_user.get('id')
            )
            
            db.commit()
            
            # Notify via WebSocket
            background_tasks.add_task(
                notify_bulk_operation_complete,
                operation_id,
                'close',
                result
            )
            
            return BulkOperationResponse(
                success=True,
                operation_id=operation_id,
                action='close',
                total_requested=len(request.session_ids),
                processed_count=result['closed_count'],
                failed_count=result['failed_count'],
                processed_items=result['closed_ids'],
                failed_items=result['failed_items'],
                message=f"Successfully closed {result['closed_count']} sessions"
            )
            
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk close transaction failed: {str(e)}")
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk close error: {str(e)}")
        return handle_bulk_operation_error(e, 'close', request.session_ids)

@router.post("/sessions/archive", response_model=BulkOperationResponse)
async def bulk_archive_sessions(
    request: BulkActionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Archive multiple closed sessions
    Moves sessions to archived state with compression
    """
    try:
        logger.info(f"Bulk archive requested for {len(request.session_ids)} sessions")
        
        service = BulkOperationService(db)
        
        # Validate sessions
        validation = service.validate_sessions(request.session_ids, 'archive')
        
        if validation['eligible_count'] == 0:
            return BulkOperationResponse(
                success=False,
                operation_id=str(uuid.uuid4()),
                action='archive',
                total_requested=len(request.session_ids),
                processed_count=0,
                failed_count=validation['ineligible_count'],
                failed_items=validation['ineligible'],
                message="No eligible sessions to archive"
            )
        
        # Perform archival
        operation_id = str(uuid.uuid4())
        
        try:
            result = service.perform_bulk_archive(
                session_ids=validation['eligible_ids'],
                compress=request.options.get('compress', True),
                user_id=current_user.get('id')
            )
            
            db.commit()
            
            # Notify via WebSocket
            background_tasks.add_task(
                notify_bulk_operation_complete,
                operation_id,
                'archive',
                result
            )
            
            return BulkOperationResponse(
                success=True,
                operation_id=operation_id,
                action='archive',
                total_requested=len(request.session_ids),
                processed_count=result['archived_count'],
                failed_count=result['failed_count'],
                processed_items=result['archived_ids'],
                failed_items=result['failed_items'],
                message=f"Successfully archived {result['archived_count']} sessions"
            )
            
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk archive transaction failed: {str(e)}")
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk archive error: {str(e)}")
        return handle_bulk_operation_error(e, 'archive', request.session_ids)

@router.get("/operations/{operation_id}/status")
async def get_operation_status(
    operation_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get status of a bulk operation
    """
    service = BulkOperationService(db)
    status = service.get_operation_status(operation_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    return status

@router.get("/sessions/info", response_model=List[SessionBulkInfo])
async def get_sessions_bulk_info(
    session_ids: List[str] = Query(...),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get bulk information for multiple sessions
    Used for pre-validation in frontend
    """
    if len(session_ids) > MAX_BULK_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_BULK_SIZE} sessions allowed"
        )
    
    service = BulkOperationService(db)
    sessions = service.get_sessions_bulk_info(session_ids)
    
    return sessions

# Helper functions

def generate_csv_export(sessions: List[ProcessingSession], include_details: bool) -> str:
    """Generate CSV export of sessions"""
    output = io.StringIO()
    
    # Define fields based on detail level
    if include_details:
        fields = [
            'session_id', 'session_name', 'status', 'created_at', 'updated_at',
            'file_count', 'transaction_count', 'exception_count', 'error_count',
            'created_by', 'closed_at', 'closed_by'
        ]
    else:
        fields = [
            'session_id', 'session_name', 'status', 'created_at',
            'file_count', 'transaction_count'
        ]
    
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    
    for session in sessions:
        row = {
            'session_id': session.session_id,
            'session_name': session.session_name,
            'status': session.status,
            'created_at': session.created_at.isoformat() if session.created_at else '',
            'file_count': session.file_count or 0,
            'transaction_count': session.transaction_count or 0
        }
        
        if include_details:
            row.update({
                'updated_at': session.updated_at.isoformat() if session.updated_at else '',
                'exception_count': session.exception_count or 0,
                'error_count': session.error_count or 0,
                'created_by': session.created_by or '',
                'closed_at': session.closed_at.isoformat() if session.closed_at else '',
                'closed_by': session.closed_by or ''
            })
        
        writer.writerow(row)
    
    return output.getvalue()

def generate_json_export(sessions: List[ProcessingSession], include_details: bool) -> str:
    """Generate JSON export of sessions"""
    data = []
    
    for session in sessions:
        item = {
            'session_id': session.session_id,
            'session_name': session.session_name,
            'status': session.status,
            'created_at': session.created_at.isoformat() if session.created_at else None,
            'file_count': session.file_count or 0,
            'transaction_count': session.transaction_count or 0
        }
        
        if include_details:
            item.update({
                'updated_at': session.updated_at.isoformat() if session.updated_at else None,
                'exception_count': session.exception_count or 0,
                'error_count': session.error_count or 0,
                'created_by': session.created_by,
                'closed_at': session.closed_at.isoformat() if session.closed_at else None,
                'closed_by': session.closed_by,
                'metadata': session.metadata if hasattr(session, 'metadata') else {}
            })
        
        data.append(item)
    
    return json.dumps(data, indent=2)

def save_export_file(data: str, filename: str) -> Path:
    """Save export data to file"""
    export_dir = Path("backend/data/exports/bulk")
    export_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = export_dir / filename
    file_path.write_text(data)
    
    return file_path

async def cleanup_export_file(file_path: Path, hours: int):
    """Clean up export file after retention period"""
    await asyncio.sleep(hours * 3600)
    try:
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Cleaned up export file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to clean up export file {file_path}: {str(e)}")

async def notify_bulk_operation_complete(operation_id: str, action: str, result: Dict):
    """Notify clients of bulk operation completion via WebSocket"""
    try:
        await ws_manager.broadcast({
            'type': 'bulk_operation_complete',
            'operation_id': operation_id,
            'action': action,
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to send WebSocket notification: {str(e)}")