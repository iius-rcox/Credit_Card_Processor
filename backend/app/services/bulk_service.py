"""
Bulk Operation Service
Handles database operations for bulk actions on sessions
"""

from typing import List, Dict, Any, Optional, Set
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, update, delete
from sqlalchemy.exc import SQLAlchemyError
import uuid
import json

from ..models import ProcessingSession, SessionResult, BulkOperation, FileUpload
import logging

logger = logging.getLogger(__name__)

class BulkOperationService:
    """Service for handling bulk operations on sessions"""
    
    # Session statuses that block operations
    ACTIVE_STATUSES = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING']
    DELETABLE_STATUSES = ['COMPLETED', 'FAILED', 'CLOSED', 'ARCHIVED']
    CLOSABLE_STATUSES = ['COMPLETED', 'FAILED', 'IDLE']
    ARCHIVABLE_STATUSES = ['CLOSED']
    
    def __init__(self, db: Session):
        self.db = db
        self.operation_cache = {}
    
    def validate_sessions(
        self,
        session_ids: List[str],
        action: str
    ) -> Dict[str, Any]:
        """
        Validate sessions for a specific action
        Returns eligible, ineligible, and not found sessions
        """
        result = {
            'eligible': [],
            'eligible_ids': [],
            'ineligible': [],
            'not_found': [],
            'eligible_count': 0,
            'ineligible_count': 0,
            'not_found_count': 0
        }
        
        # Get all sessions
        sessions = self.db.query(ProcessingSession).filter(
            ProcessingSession.session_id.in_(session_ids)
        ).all()
        
        found_ids = {session.session_id for session in sessions}
        
        # Check for not found sessions
        for session_id in session_ids:
            if session_id not in found_ids:
                result['not_found'].append(session_id)
                result['not_found_count'] += 1
        
        # Validate each session
        for session in sessions:
            eligibility = self._check_eligibility(session, action)
            
            if eligibility['eligible']:
                result['eligible'].append({
                    'session_id': session.session_id,
                    'session_name': session.session_name,
                    'status': session.status
                })
                result['eligible_ids'].append(session.session_id)
                result['eligible_count'] += 1
            else:
                result['ineligible'].append({
                    'session_id': session.session_id,
                    'session_name': session.session_name,
                    'status': session.status,
                    'reason': eligibility['reason']
                })
                result['ineligible_count'] += 1
        
        return result
    
    def _check_eligibility(
        self,
        session: ProcessingSession,
        action: str
    ) -> Dict[str, Any]:
        """Check if a session is eligible for an action"""
        
        if action == 'delete':
            return self._check_delete_eligibility(session)
        elif action == 'close':
            return self._check_close_eligibility(session)
        elif action == 'archive':
            return self._check_archive_eligibility(session)
        elif action == 'export':
            return self._check_export_eligibility(session)
        else:
            return {
                'eligible': False,
                'reason': f'Unknown action: {action}'
            }
    
    def _check_delete_eligibility(self, session: ProcessingSession) -> Dict[str, Any]:
        """Check if session can be deleted"""
        if session.status in self.ACTIVE_STATUSES:
            return {
                'eligible': False,
                'reason': f'Session is currently {session.status.lower()}'
            }
        
        if session.locked_by:
            return {
                'eligible': False,
                'reason': 'Session is locked by another user'
            }
        
        # Check for active exports
        if hasattr(session, 'active_exports') and session.active_exports > 0:
            return {
                'eligible': False,
                'reason': 'Session has active exports'
            }
        
        return {'eligible': True, 'reason': None}
    
    def _check_close_eligibility(self, session: ProcessingSession) -> Dict[str, Any]:
        """Check if session can be closed"""
        if session.status == 'CLOSED':
            return {
                'eligible': False,
                'reason': 'Session is already closed'
            }
        
        if session.status == 'ARCHIVED':
            return {
                'eligible': False,
                'reason': 'Session is archived'
            }
        
        if session.status in self.ACTIVE_STATUSES:
            return {
                'eligible': False,
                'reason': f'Session is currently {session.status.lower()}'
            }
        
        return {'eligible': True, 'reason': None}
    
    def _check_archive_eligibility(self, session: ProcessingSession) -> Dict[str, Any]:
        """Check if session can be archived"""
        if session.status == 'ARCHIVED':
            return {
                'eligible': False,
                'reason': 'Session is already archived'
            }
        
        if session.status != 'CLOSED':
            return {
                'eligible': False,
                'reason': 'Session must be closed before archiving'
            }
        
        # Check for active references
        if hasattr(session, 'active_references') and session.active_references > 0:
            return {
                'eligible': False,
                'reason': 'Session has active references'
            }
        
        return {'eligible': True, 'reason': None}
    
    def _check_export_eligibility(self, session: ProcessingSession) -> Dict[str, Any]:
        """Check if session can be exported"""
        if not session.has_results:
            return {
                'eligible': False,
                'reason': 'Session has no results to export'
            }
        
        return {'eligible': True, 'reason': None}
    
    def perform_bulk_delete(
        self,
        session_ids: List[str],
        soft_delete: bool = True,
        cascade_exports: bool = False,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform bulk deletion of sessions
        Can do soft delete (mark as deleted) or hard delete
        """
        result = {
            'deleted_count': 0,
            'failed_count': 0,
            'deleted_ids': [],
            'failed_items': []
        }
        
        try:
            for session_id in session_ids:
                try:
                    session = self.db.query(ProcessingSession).filter(
                        ProcessingSession.session_id == session_id
                    ).first()
                    
                    if not session:
                        result['failed_items'].append({
                            'session_id': session_id,
                            'reason': 'Session not found'
                        })
                        result['failed_count'] += 1
                        continue
                    
                    if soft_delete:
                        # Soft delete - mark as deleted
                        session.status = 'DELETED'
                        session.deleted_at = datetime.utcnow()
                        session.deleted_by = user_id
                    else:
                        # Hard delete - remove from database
                        if cascade_exports:
                            # Delete related data first
                            self._cascade_delete_session_data(session_id)
                        
                        self.db.delete(session)
                    
                    result['deleted_ids'].append(session_id)
                    result['deleted_count'] += 1
                    
                except SQLAlchemyError as e:
                    logger.error(f"Failed to delete session {session_id}: {str(e)}")
                    result['failed_items'].append({
                        'session_id': session_id,
                        'reason': str(e)
                    })
                    result['failed_count'] += 1
            
            # Record operation
            self._record_bulk_operation(
                action='delete',
                total_count=len(session_ids),
                success_count=result['deleted_count'],
                failed_count=result['failed_count'],
                user_id=user_id
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Bulk delete failed: {str(e)}")
            raise
    
    def _cascade_delete_session_data(self, session_id: str):
        """Delete all related data for a session"""
        try:
            # Delete results
            self.db.query(SessionResult).filter(
                SessionResult.session_id == session_id
            ).delete()
            
            # Delete files
            self.db.query(FileUpload).filter(
                FileUpload.session_id == session_id
            ).delete()
            
            # Delete other related data as needed
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to cascade delete for session {session_id}: {str(e)}")
            raise
    
    def perform_bulk_close(
        self,
        session_ids: List[str],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Close multiple sessions"""
        result = {
            'closed_count': 0,
            'failed_count': 0,
            'closed_ids': [],
            'failed_items': []
        }
        
        try:
            timestamp = datetime.utcnow()
            
            # Bulk update for efficiency
            updated = self.db.query(ProcessingSession).filter(
                and_(
                    ProcessingSession.session_id.in_(session_ids),
                    ProcessingSession.status.in_(self.CLOSABLE_STATUSES)
                )
            ).update({
                'status': 'CLOSED',
                'closed_at': timestamp,
                'closed_by': user_id,
                'updated_at': timestamp
            }, synchronize_session=False)
            
            result['closed_count'] = updated
            
            # Get the IDs that were actually closed
            closed_sessions = self.db.query(ProcessingSession.session_id).filter(
                and_(
                    ProcessingSession.session_id.in_(session_ids),
                    ProcessingSession.status == 'CLOSED',
                    ProcessingSession.closed_at == timestamp
                )
            ).all()
            
            result['closed_ids'] = [s[0] for s in closed_sessions]
            
            # Find failed sessions
            closed_set = set(result['closed_ids'])
            for session_id in session_ids:
                if session_id not in closed_set:
                    result['failed_items'].append({
                        'session_id': session_id,
                        'reason': 'Session not eligible for closure'
                    })
                    result['failed_count'] += 1
            
            # Record operation
            self._record_bulk_operation(
                action='close',
                total_count=len(session_ids),
                success_count=result['closed_count'],
                failed_count=result['failed_count'],
                user_id=user_id
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Bulk close failed: {str(e)}")
            raise
    
    def perform_bulk_archive(
        self,
        session_ids: List[str],
        compress: bool = True,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Archive multiple sessions"""
        result = {
            'archived_count': 0,
            'failed_count': 0,
            'archived_ids': [],
            'failed_items': []
        }
        
        try:
            timestamp = datetime.utcnow()
            
            for session_id in session_ids:
                try:
                    session = self.db.query(ProcessingSession).filter(
                        ProcessingSession.session_id == session_id
                    ).first()
                    
                    if not session or session.status != 'CLOSED':
                        result['failed_items'].append({
                            'session_id': session_id,
                            'reason': 'Session not found or not closed'
                        })
                        result['failed_count'] += 1
                        continue
                    
                    # Archive the session
                    session.status = 'ARCHIVED'
                    session.archived_at = timestamp
                    session.archived_by = user_id
                    session.updated_at = timestamp
                    
                    if compress:
                        # Compress session data (implementation depends on your needs)
                        session.is_compressed = True
                        session.original_size = self._calculate_session_size(session)
                        session.compressed_size = session.original_size * 0.3  # Estimated
                    
                    result['archived_ids'].append(session_id)
                    result['archived_count'] += 1
                    
                except SQLAlchemyError as e:
                    logger.error(f"Failed to archive session {session_id}: {str(e)}")
                    result['failed_items'].append({
                        'session_id': session_id,
                        'reason': str(e)
                    })
                    result['failed_count'] += 1
            
            # Record operation
            self._record_bulk_operation(
                action='archive',
                total_count=len(session_ids),
                success_count=result['archived_count'],
                failed_count=result['failed_count'],
                user_id=user_id
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Bulk archive failed: {str(e)}")
            raise
    
    def get_sessions_by_ids(self, session_ids: List[str]) -> List[ProcessingSession]:
        """Get multiple sessions by their IDs"""
        return self.db.query(ProcessingSession).filter(
            ProcessingSession.session_id.in_(session_ids)
        ).all()
    
    def get_sessions_bulk_info(self, session_ids: List[str]) -> List[Dict[str, Any]]:
        """Get bulk information for sessions"""
        sessions = self.get_sessions_by_ids(session_ids)
        
        info = []
        for session in sessions:
            info.append({
                'session_id': session.session_id,
                'session_name': session.session_name,
                'status': session.status,
                'created_at': session.created_at.isoformat() if session.created_at else None,
                'file_count': session.file_count or 0,
                'has_results': session.has_results,
                'can_delete': self._check_delete_eligibility(session)['eligible'],
                'can_close': self._check_close_eligibility(session)['eligible'],
                'can_archive': self._check_archive_eligibility(session)['eligible'],
                'can_export': self._check_export_eligibility(session)['eligible']
            })
        
        return info
    
    def get_operation_status(self, operation_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a bulk operation"""
        operation = self.db.query(BulkOperation).filter(
            BulkOperation.operation_id == operation_id
        ).first()
        
        if not operation:
            return None
        
        return {
            'operation_id': operation.operation_id,
            'action': operation.action,
            'status': operation.status,
            'total_count': operation.total_count,
            'success_count': operation.success_count,
            'failed_count': operation.failed_count,
            'started_at': operation.started_at.isoformat() if operation.started_at else None,
            'completed_at': operation.completed_at.isoformat() if operation.completed_at else None,
            'error_message': operation.error_message
        }
    
    def _record_bulk_operation(
        self,
        action: str,
        total_count: int,
        success_count: int,
        failed_count: int,
        user_id: Optional[str] = None
    ):
        """Record a bulk operation in the database"""
        try:
            operation = BulkOperation(
                operation_id=str(uuid.uuid4()),
                action=action,
                status='COMPLETED',
                total_count=total_count,
                success_count=success_count,
                failed_count=failed_count,
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
                user_id=user_id
            )
            
            self.db.add(operation)
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to record bulk operation: {str(e)}")
            # Don't raise - this is not critical
    
    def _calculate_session_size(self, session: ProcessingSession) -> int:
        """Calculate approximate size of session data"""
        # This is a simplified calculation
        # In real implementation, you would calculate actual data size
        base_size = 1024  # 1KB base
        file_size = (session.file_count or 0) * 10240  # 10KB per file estimate
        result_size = (session.transaction_count or 0) * 100  # 100 bytes per transaction
        
        return base_size + file_size + result_size
    
    def get_selection_statistics(
        self,
        session_ids: List[str],
        action: str
    ) -> Dict[str, Any]:
        """Get statistics for a selection of sessions"""
        validation = self.validate_sessions(session_ids, action)
        
        sessions = self.get_sessions_by_ids(session_ids)
        
        total_files = sum(s.file_count or 0 for s in sessions)
        total_transactions = sum(s.transaction_count or 0 for s in sessions)
        total_exceptions = sum(s.exception_count or 0 for s in sessions)
        
        status_breakdown = {}
        for session in sessions:
            status = session.status
            status_breakdown[status] = status_breakdown.get(status, 0) + 1
        
        return {
            'total_sessions': len(session_ids),
            'found_sessions': len(sessions),
            'eligible_count': validation['eligible_count'],
            'ineligible_count': validation['ineligible_count'],
            'not_found_count': validation['not_found_count'],
            'total_files': total_files,
            'total_transactions': total_transactions,
            'total_exceptions': total_exceptions,
            'status_breakdown': status_breakdown,
            'estimated_duration': self._estimate_operation_duration(len(sessions), action)
        }
    
    def _estimate_operation_duration(self, count: int, action: str) -> int:
        """Estimate operation duration in seconds"""
        # Simple estimation based on action and count
        per_item_duration = {
            'delete': 0.1,
            'close': 0.05,
            'archive': 0.2,
            'export': 0.01
        }
        
        base_duration = per_item_duration.get(action, 0.1)
        return int(count * base_duration) + 1  # Add 1 second base overhead