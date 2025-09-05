"""
File Cleanup and Retention Service
Manages cleanup of split documents and temporary files with configurable retention policies
"""

import os
import logging
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ProcessingSession, ProcessingActivity, ActivityType

# Configure logger
logger = logging.getLogger(__name__)


class FileCleanupService:
    """
    Service for managing file cleanup and retention policies for split documents
    """
    
    def __init__(self, split_documents_dir: str = None):
        self.split_documents_dir = Path(split_documents_dir) if split_documents_dir else Path("./split_documents")
        
        # Default retention policies (can be configured)
        self.retention_policies = {
            'default_retention_days': 30,  # Keep split files for 30 days by default
            'max_session_files': 1000,     # Maximum files per session
            'max_total_size_gb': 10,       # Maximum total storage for all split files
            'cleanup_batch_size': 100      # Process cleanup in batches
        }
    
    def cleanup_expired_files(self, db: Session, retention_days: int = None) -> Dict[str, Any]:
        """
        Clean up split document files that have exceeded retention period
        
        Args:
            db: Database session
            retention_days: Override default retention period
            
        Returns:
            Dictionary with cleanup results
        """
        retention_days = retention_days or self.retention_policies['default_retention_days']
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        
        logger.info(f"Starting cleanup of files older than {retention_days} days (cutoff: {cutoff_date})")
        
        cleanup_results = {
            'sessions_processed': 0,
            'files_deleted': 0,
            'bytes_freed': 0,
            'directories_removed': 0,
            'errors': []
        }
        
        if not self.split_documents_dir.exists():
            logger.info("Split documents directory does not exist, nothing to clean")
            return cleanup_results
        
        try:
            # Process each session directory
            for session_dir in self.split_documents_dir.iterdir():
                if not session_dir.is_dir():
                    continue
                
                try:
                    # Validate session directory name (should be UUID)
                    session_id = session_dir.name
                    if len(session_id) != 36:  # Basic UUID length check
                        logger.warning(f"Skipping non-UUID directory: {session_id}")
                        continue
                    
                    # Check if session exists and get its last activity
                    session_result = self._cleanup_session_files(
                        db, session_id, session_dir, cutoff_date
                    )
                    
                    cleanup_results['sessions_processed'] += 1
                    cleanup_results['files_deleted'] += session_result['files_deleted']
                    cleanup_results['bytes_freed'] += session_result['bytes_freed']
                    if session_result['directory_removed']:
                        cleanup_results['directories_removed'] += 1
                    
                except Exception as e:
                    error_msg = f"Failed to cleanup session {session_dir.name}: {str(e)}"
                    logger.error(error_msg)
                    cleanup_results['errors'].append(error_msg)
                    continue
            
            # Log cleanup activity if anything was cleaned
            if cleanup_results['files_deleted'] > 0:
                self._log_cleanup_activity(db, cleanup_results, retention_days)
            
            logger.info(f"Cleanup completed: {cleanup_results}")
            return cleanup_results
            
        except Exception as e:
            logger.error(f"File cleanup failed: {str(e)}")
            cleanup_results['errors'].append(f"General cleanup error: {str(e)}")
            return cleanup_results
    
    def _cleanup_session_files(
        self, 
        db: Session, 
        session_id: str, 
        session_dir: Path, 
        cutoff_date: datetime
    ) -> Dict[str, Any]:
        """
        Clean up files for a specific session
        """
        result = {
            'files_deleted': 0,
            'bytes_freed': 0,
            'directory_removed': False
        }
        
        # Check if session exists in database
        try:
            from uuid import UUID
            session_uuid = UUID(session_id)
            db_session = db.query(ProcessingSession).filter(
                ProcessingSession.session_id == session_uuid
            ).first()
        except ValueError:
            logger.warning(f"Invalid UUID format for session: {session_id}")
            return result
        
        # If session doesn't exist in DB, it's safe to remove
        if not db_session:
            logger.info(f"Session {session_id} not found in database, removing directory")
            try:
                total_size = sum(f.stat().st_size for f in session_dir.rglob('*') if f.is_file())
                shutil.rmtree(session_dir)
                result['files_deleted'] = len(list(session_dir.rglob('*.pdf'))) if session_dir.exists() else 0
                result['bytes_freed'] = total_size
                result['directory_removed'] = True
                return result
            except Exception as e:
                logger.error(f"Failed to remove orphaned session directory {session_id}: {str(e)}")
                return result
        
        # Check session's last activity to determine if files should be cleaned
        should_cleanup = False
        
        # Check session updated time
        if db_session.updated_at and db_session.updated_at < cutoff_date:
            should_cleanup = True
            logger.debug(f"Session {session_id} last updated {db_session.updated_at}, marking for cleanup")
        
        # Check last activity time
        last_activity = db.query(ProcessingActivity).filter(
            ProcessingActivity.session_id == session_uuid
        ).order_by(ProcessingActivity.created_at.desc()).first()
        
        if last_activity and last_activity.created_at < cutoff_date:
            should_cleanup = True
            logger.debug(f"Session {session_id} last activity {last_activity.created_at}, marking for cleanup")
        elif not last_activity and db_session.created_at < cutoff_date:
            should_cleanup = True
            logger.debug(f"Session {session_id} has no activities and created {db_session.created_at}, marking for cleanup")
        
        if should_cleanup:
            # Remove all PDF files in the session directory
            pdf_files = list(session_dir.glob('*.pdf'))
            total_size = 0
            
            for pdf_file in pdf_files:
                try:
                    file_size = pdf_file.stat().st_size
                    pdf_file.unlink()
                    result['files_deleted'] += 1
                    result['bytes_freed'] += file_size
                    total_size += file_size
                    logger.debug(f"Deleted file: {pdf_file.name}")
                except Exception as e:
                    logger.error(f"Failed to delete file {pdf_file}: {str(e)}")
            
            # Remove directory if empty
            try:
                if not any(session_dir.iterdir()):
                    session_dir.rmdir()
                    result['directory_removed'] = True
                    logger.debug(f"Removed empty directory: {session_id}")
            except Exception as e:
                logger.error(f"Failed to remove directory {session_id}: {str(e)}")
            
            logger.info(f"Cleaned up session {session_id}: {result['files_deleted']} files, {result['bytes_freed']} bytes")
        
        return result
    
    def cleanup_session_files(self, db: Session, session_id: str) -> Dict[str, Any]:
        """
        Manually clean up files for a specific session (immediate cleanup)
        
        Args:
            db: Database session
            session_id: UUID of the session to clean up
            
        Returns:
            Dictionary with cleanup results
        """
        logger.info(f"Manual cleanup requested for session {session_id}")
        
        result = {
            'session_id': session_id,
            'files_deleted': 0,
            'bytes_freed': 0,
            'directory_removed': False,
            'success': False
        }
        
        try:
            session_dir = self.split_documents_dir / session_id
            
            if not session_dir.exists():
                logger.info(f"No split documents directory found for session {session_id}")
                result['success'] = True
                return result
            
            # Get file count and size before deletion
            pdf_files = list(session_dir.glob('*.pdf'))
            total_size = sum(f.stat().st_size for f in pdf_files)
            
            # Remove all files
            for pdf_file in pdf_files:
                try:
                    pdf_file.unlink()
                    result['files_deleted'] += 1
                except Exception as e:
                    logger.error(f"Failed to delete file {pdf_file}: {str(e)}")
            
            result['bytes_freed'] = total_size
            
            # Remove directory
            try:
                if session_dir.exists():
                    shutil.rmtree(session_dir)
                    result['directory_removed'] = True
            except Exception as e:
                logger.error(f"Failed to remove directory {session_dir}: {str(e)}")
            
            result['success'] = True
            
            # Log cleanup activity
            try:
                from uuid import UUID
                session_uuid = UUID(session_id)
                
                # Note: We can't add to the same session we might be cleaning up
                # So we'll just log it without associating with the session
                logger.info(f"Manual cleanup completed for session {session_id}: {result}")
                
            except Exception as e:
                logger.warning(f"Failed to log cleanup activity: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Manual cleanup failed for session {session_id}: {str(e)}")
            result['error'] = str(e)
            return result
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get current storage statistics for split documents
        
        Returns:
            Dictionary with storage statistics
        """
        stats = {
            'total_sessions': 0,
            'total_files': 0,
            'total_size_bytes': 0,
            'total_size_mb': 0,
            'total_size_gb': 0,
            'sessions': []
        }
        
        if not self.split_documents_dir.exists():
            return stats
        
        try:
            for session_dir in self.split_documents_dir.iterdir():
                if not session_dir.is_dir():
                    continue
                
                session_stats = {
                    'session_id': session_dir.name,
                    'file_count': 0,
                    'size_bytes': 0,
                    'last_modified': None
                }
                
                # Count PDF files and calculate size
                pdf_files = list(session_dir.glob('*.pdf'))
                session_stats['file_count'] = len(pdf_files)
                
                if pdf_files:
                    total_size = sum(f.stat().st_size for f in pdf_files)
                    session_stats['size_bytes'] = total_size
                    
                    # Find most recent modification time
                    latest_mtime = max(f.stat().st_mtime for f in pdf_files)
                    session_stats['last_modified'] = datetime.fromtimestamp(latest_mtime).isoformat()
                
                stats['sessions'].append(session_stats)
                stats['total_files'] += session_stats['file_count']
                stats['total_size_bytes'] += session_stats['size_bytes']
                stats['total_sessions'] += 1
            
            # Calculate derived values
            stats['total_size_mb'] = round(stats['total_size_bytes'] / (1024 * 1024), 2)
            stats['total_size_gb'] = round(stats['total_size_bytes'] / (1024 * 1024 * 1024), 2)
            
            # Sort sessions by size (largest first)
            stats['sessions'].sort(key=lambda x: x['size_bytes'], reverse=True)
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get storage stats: {str(e)}")
            stats['error'] = str(e)
            return stats
    
    def _log_cleanup_activity(self, db: Session, cleanup_results: Dict[str, Any], retention_days: int):
        """
        Log cleanup activity to the database
        """
        try:
            # Create a general system activity (not associated with a specific session)
            activity = ProcessingActivity(
                session_id=None,  # System-wide activity
                user_id=None,     # System activity
                activity_type=ActivityType.PROCESSING,  # Use processing type for system activities
                description=f"Automated file cleanup: {cleanup_results['files_deleted']} files deleted, {round(cleanup_results['bytes_freed'] / (1024*1024), 2)} MB freed",
                metadata={
                    'cleanup_type': 'automated',
                    'retention_days': retention_days,
                    'sessions_processed': cleanup_results['sessions_processed'],
                    'files_deleted': cleanup_results['files_deleted'],
                    'bytes_freed': cleanup_results['bytes_freed'],
                    'directories_removed': cleanup_results['directories_removed'],
                    'errors': cleanup_results['errors']
                }
            )
            
            db.add(activity)
            db.commit()
            logger.debug("Cleanup activity logged to database")
            
        except Exception as e:
            logger.warning(f"Failed to log cleanup activity: {str(e)}")
            db.rollback()


# Factory function for easy instantiation
def create_file_cleanup_service(split_documents_dir: str = None) -> FileCleanupService:
    """
    Factory function to create FileCleanupService instance
    
    Args:
        split_documents_dir: Optional custom directory for split documents
        
    Returns:
        FileCleanupService instance
    """
    return FileCleanupService(split_documents_dir=split_documents_dir)