"""
Phase 4 API Endpoints

Advanced session management, receipt reprocessing, and delta export functionality.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..models import ProcessingSession, SessionStatus
from ..services.receipt_reprocessing_service import ReceiptReprocessingService
from ..services.delta_export_service import DeltaExportService
from ..schemas import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/phase4", tags=["Phase 4 - Advanced Session Management"])


# Request/Response Models
class ReprocessReceiptsRequest(BaseModel):
    """Request model for receipt reprocessing"""
    session_id: str = Field(..., description="Session UUID to reprocess")
    closure_reason: Optional[str] = Field(None, description="Reason for reprocessing")


class ReprocessReceiptsResponse(BaseModel):
    """Response model for receipt reprocessing"""
    success: bool
    version_number: int
    changes: Dict[str, Any]
    message: str


class ExportSummaryResponse(BaseModel):
    """Response model for export summary"""
    session_id: str
    session_name: str
    employee_stats: Dict[str, int]
    export_history: List[Dict[str, Any]]
    recommendations: Dict[str, Any]
    last_export: Optional[Dict[str, Any]]


class DeltaExportRequest(BaseModel):
    """Request model for delta export"""
    export_type: str = Field(..., description="Type of export (pvault or exceptions)")
    include_exported: bool = Field(False, description="Include previously exported records")
    mark_as_exported: bool = Field(True, description="Mark records as exported after generation")


class DeltaExportResponse(BaseModel):
    """Response model for delta export"""
    export_batch_id: str
    export_type: str
    employee_count: int
    export_data: List[Dict[str, Any]]
    statistics: Dict[str, int]
    delta_only: bool
    generated_at: str


class MarkExportedRequest(BaseModel):
    """Request model for marking records as exported"""
    export_batch_id: str = Field(..., description="Export batch ID")
    employee_ids: List[str] = Field(..., description="List of employee revision IDs")
    export_type: str = Field(..., description="Type of export")


class MarkExportedResponse(BaseModel):
    """Response model for marking records as exported"""
    success: bool
    export_batch_id: str
    marked_count: int
    message: str


# Receipt Reprocessing Endpoints
@router.post("/sessions/{session_id}/reprocess-receipts", 
             response_model=ReprocessReceiptsResponse,
             summary="Reprocess receipts for a completed session")
async def reprocess_receipts(
    session_id: str,
    file: UploadFile = File(..., description="New receipt file"),
    closure_reason: Optional[str] = Form(None, description="Reason for reprocessing"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Upload new receipts and reprocess a completed session.
    
    This endpoint allows users to add new receipts to a completed session,
    triggering reprocessing to detect changes and update employee data.
    """
    try:
        # Validate session exists and can be reprocessed
        session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session.is_closed:
            raise HTTPException(status_code=400, detail="Cannot reprocess a permanently closed session")
        
        if session.status not in [SessionStatus.COMPLETED, SessionStatus.FAILED]:
            raise HTTPException(status_code=400, detail="Session must be completed or failed to reprocess")
        
        # Check access permissions
        if not current_user.is_admin and session.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        # Save uploaded file
        file_path = f"data/uploads/receipts/{session_id}_{file.filename}"
        logger.info(f"Processing receipt file: {file.filename} (type: {file.content_type}, size: {file.size})")
        
        # Ensure upload directory exists
        import os
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"Receipt file saved to: {file_path}")
        
        # Process receipts
        reprocessing_service = ReceiptReprocessingService(db)
        result = reprocessing_service.reprocess_receipts(
            session_id, file_path, current_user.username
        )
        
        logger.info(f"Receipt reprocessing completed for session {session_id} by {current_user.username}")
        
        return ReprocessReceiptsResponse(
            success=result['success'],
            version_number=result['version_number'],
            changes=result['changes'],
            message=result['message']
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to reprocess receipts for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to reprocess receipts")


@router.get("/sessions/{session_id}/reprocess-status",
            summary="Get reprocessing status and progress")
async def get_reprocess_status(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Get current reprocessing status and progress for a session"""
    try:
        session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check access permissions
        if not current_user.is_admin and session.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        # Get latest receipt version
        from ..models import ReceiptVersion
        latest_version = db.query(ReceiptVersion).filter(
            ReceiptVersion.session_id == session_id
        ).order_by(ReceiptVersion.version_number.desc()).first()
        
        # Get change summary
        from ..models import EmployeeChangeLog
        recent_changes = db.query(EmployeeChangeLog).filter(
            EmployeeChangeLog.session_id == session_id
        ).order_by(EmployeeChangeLog.change_timestamp.desc()).limit(10).all()
        
        return {
            'session_id': session_id,
            'session_status': session.status.value,
            'receipt_versions': session.receipt_file_versions,
            'last_receipt_upload': session.last_receipt_upload.isoformat() if session.last_receipt_upload else None,
            'latest_version': {
                'version_number': latest_version.version_number if latest_version else 0,
                'processing_status': latest_version.processing_status if latest_version else None,
                'uploaded_at': latest_version.uploaded_at.isoformat() if latest_version else None
            } if latest_version else None,
            'recent_changes': [
                {
                    'change_type': change.change_type,
                    'employee_name': change.employee_name,
                    'change_timestamp': change.change_timestamp.isoformat(),
                    'requires_review': change.requires_review
                }
                for change in recent_changes
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get reprocess status for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get reprocess status")


# Delta Export Endpoints
@router.get("/sessions/{session_id}/export-summary",
            response_model=ExportSummaryResponse,
            summary="Get export summary and recommendations")
async def get_export_summary(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Get export summary showing what can be exported and recommendations"""
    try:
        # Log the incoming request
        logger.info(f"Export summary requested - session_id: {session_id}, user: {current_user.username}")
        
        session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            logger.warning(f"Export summary failed - session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check access permissions
        if not current_user.is_admin and session.created_by != current_user.username:
            logger.warning(f"Export summary access denied - session: {session_id}, user: {current_user.username}, owner: {session.created_by}")
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        # Get export summary
        export_service = DeltaExportService(db)
        summary = export_service.get_export_summary(session_id)
        
        # Log successful summary generation
        logger.info(f"Export summary generated - session: {session_id}, total_employees: {summary.get('employee_stats', {}).get('total_employees', 0)}, pending_export: {summary.get('employee_stats', {}).get('pending_export', 0)}")
        
        return ExportSummaryResponse(**summary)
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Failed to get export summary for session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get export summary: {str(e)}")


@router.post("/sessions/{session_id}/export-delta",
             response_model=DeltaExportResponse,
             summary="Generate delta export data")
async def generate_delta_export(
    session_id: str,
    request: DeltaExportRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Generate delta export data for a session"""
    try:
        # Log the incoming request
        logger.info(f"Delta export requested - session_id: {session_id}, user: {current_user.username}, export_scope: {request.export_scope}")
        
        session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            logger.warning(f"Delta export failed - session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check access permissions
        if not current_user.is_admin and session.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        # Validate export type
        if request.export_type not in ['pvault', 'exceptions']:
            raise HTTPException(status_code=400, detail="Export type must be 'pvault' or 'exceptions'")
        
        # Generate delta export
        export_service = DeltaExportService(db)
        result = export_service.generate_delta_export(
            session_id, request.export_type, request.include_exported, current_user
        )
        
        # Mark as exported if requested
        if request.mark_as_exported and result['employee_count'] > 0:
            employee_ids = [emp['revision_id'] for emp in result['export_data']]
            export_service.mark_records_as_exported(
                session_id, result['export_batch_id'], employee_ids, request.export_type, current_user
            )
        
        logger.info(f"Delta export generated for session {session_id}: {result['employee_count']} employees")
        
        return DeltaExportResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to generate delta export for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate delta export")


@router.post("/sessions/{session_id}/mark-exported",
             response_model=MarkExportedResponse,
             summary="Mark records as exported")
async def mark_records_as_exported(
    session_id: str,
    request: MarkExportedRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Mark specific employee records as exported"""
    try:
        session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check access permissions
        if not current_user.is_admin and session.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        # Mark records as exported
        export_service = DeltaExportService(db)
        result = export_service.mark_records_as_exported(
            session_id, request.export_batch_id, request.employee_ids, request.export_type, current_user
        )
        
        logger.info(f"Marked {result['marked_count']} records as exported for session {session_id}")
        
        return MarkExportedResponse(**result)
        
    except Exception as e:
        logger.error(f"Failed to mark records as exported for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark records as exported")


@router.get("/sessions/{session_id}/export-history",
            summary="Get complete export history")
async def get_export_history(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Get complete export history for audit trail"""
    try:
        session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check access permissions
        if not current_user.is_admin and session.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        # Get export history summary
        export_service = DeltaExportService(db)
        history = export_service.get_export_history_summary(session_id)
        
        return history
        
    except Exception as e:
        logger.error(f"Failed to get export history for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get export history")


@router.get("/sessions/{session_id}/change-summary",
            summary="Get summary of changes since last export")
async def get_change_summary(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Get summary of changes since last export"""
    try:
        session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check access permissions
        if not current_user.is_admin and session.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied to this session")
        
        # Get change summary
        from ..models import EmployeeChangeLog
        changes = db.query(EmployeeChangeLog).filter(
            EmployeeChangeLog.session_id == session_id
        ).order_by(EmployeeChangeLog.change_timestamp.desc()).all()
        
        # Group changes by type
        change_summary = {
            'total_changes': len(changes),
            'by_type': {},
            'recent_changes': [],
            'requires_review': 0
        }
        
        for change in changes:
            change_type = change.change_type
            if change_type not in change_summary['by_type']:
                change_summary['by_type'][change_type] = 0
            change_summary['by_type'][change_type] += 1
            
            if change.requires_review:
                change_summary['requires_review'] += 1
            
            if len(change_summary['recent_changes']) < 10:
                change_summary['recent_changes'].append({
                    'change_type': change.change_type,
                    'employee_name': change.employee_name,
                    'change_timestamp': change.change_timestamp.isoformat(),
                    'requires_review': change.requires_review,
                    'confidence': float(change.change_confidence) if change.change_confidence else None
                })
        
        return change_summary
        
    except Exception as e:
        logger.error(f"Failed to get change summary for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get change summary")


# Admin Endpoints
@router.get("/admin/sessions/analytics",
            summary="Get session analytics (admin only)")
async def get_session_analytics(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Get comprehensive session analytics (admin only)"""
    try:
        # Check admin permissions
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Build date filter
        date_filter = []
        if date_from:
            date_filter.append(ProcessingSession.created_at >= date_from)
        if date_to:
            date_filter.append(ProcessingSession.created_at <= date_to)
        
        # Get session statistics
        sessions = db.query(ProcessingSession).filter(*date_filter).all()
        
        # Calculate analytics
        analytics = {
            'total_sessions': len(sessions),
            'by_status': {},
            'by_user': {},
            'reprocessing_stats': {
                'sessions_with_reprocessing': 0,
                'total_receipt_versions': 0
            },
            'export_stats': {
                'sessions_with_exports': 0,
                'total_exports': 0
            }
        }
        
        for session in sessions:
            # Status breakdown
            status = session.status.value
            if status not in analytics['by_status']:
                analytics['by_status'][status] = 0
            analytics['by_status'][status] += 1
            
            # User breakdown
            user = session.created_by
            if user not in analytics['by_user']:
                analytics['by_user'][user] = 0
            analytics['by_user'][user] += 1
            
            # Reprocessing stats
            if session.receipt_file_versions > 1:
                analytics['reprocessing_stats']['sessions_with_reprocessing'] += 1
            analytics['reprocessing_stats']['total_receipt_versions'] += session.receipt_file_versions
            
            # Export stats
            from ..models import ExportHistory
            export_count = db.query(ExportHistory).filter(
                ExportHistory.session_id == session.session_id
            ).count()
            if export_count > 0:
                analytics['export_stats']['sessions_with_exports'] += 1
                analytics['export_stats']['total_exports'] += export_count
        
        return analytics
        
    except Exception as e:
        logger.error(f"Failed to get session analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session analytics")
