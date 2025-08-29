"""
File upload and storage management for Credit Card Processor
"""

import logging
import shutil
import aiofiles
from pathlib import Path
from typing import Optional, Dict, List, Any, Tuple
from datetime import datetime
import hashlib
import magic
import os

from fastapi import UploadFile, HTTPException, status

from config import get_settings, FileType
from database import LogManager

logger = logging.getLogger(__name__)

class FileValidationError(Exception):
    """Custom exception for file validation errors"""
    pass

class StorageError(Exception):
    """Custom exception for file storage errors"""
    pass

class FileManager:
    """Manager for file upload and storage operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.upload_dir = self.settings.UPLOAD_DIR
        self.export_dir = self.settings.EXPORT_DIR
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure upload and export directories exist"""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.export_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"File directories initialized: {self.upload_dir}, {self.export_dir}")
    
    async def save_uploaded_file(
        self,
        file: UploadFile,
        session_id: str,
        file_type: str
    ) -> Dict[str, Any]:
        """Save uploaded file and return file information"""
        logger.info(f"Saving uploaded file: {file.filename} for session {session_id}")
        
        try:
            # Validate file
            await self._validate_uploaded_file(file)
            
            # Create session directory
            session_dir = self.upload_dir / session_id
            session_dir.mkdir(exist_ok=True)
            
            # Generate safe filename
            safe_filename = self._generate_safe_filename(file.filename, file_type)
            file_path = session_dir / safe_filename
            
            # Save file
            file_size = await self._save_file_content(file, file_path)
            
            # Calculate checksum
            checksum = await self._calculate_file_checksum(file_path)
            
            # Get file metadata
            metadata = await self._get_file_metadata(file_path)
            
            file_info = {
                "file_path": str(file_path),
                "filename": safe_filename,
                "original_filename": file.filename,
                "file_size": file_size,
                "file_type": file_type,
                "checksum": checksum,
                "content_type": file.content_type,
                "metadata": metadata,
                "uploaded_at": datetime.utcnow().isoformat()
            }
            
            await LogManager.log_event(
                session_id=session_id,
                level="INFO",
                message=f"File uploaded successfully: {safe_filename}",
                component="file_manager",
                details=file_info
            )
            
            return file_info
            
        except Exception as e:
            await LogManager.log_event(
                session_id=session_id,
                level="ERROR",
                message=f"File upload failed: {str(e)}",
                component="file_manager",
                details={"filename": file.filename, "error": str(e)}
            )
            raise StorageError(f"File upload failed: {e}")
    
    async def _validate_uploaded_file(self, file: UploadFile):
        """Validate uploaded file"""
        # Check if file is provided
        if not file or not file.filename:
            raise FileValidationError("No file provided")
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in self.settings.ALLOWED_EXTENSIONS:
            raise FileValidationError(
                f"Invalid file type: {file_ext}. Allowed: {', '.join(self.settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > self.settings.MAX_FILE_SIZE:
            max_size_mb = self.settings.MAX_FILE_SIZE / (1024 * 1024)
            raise FileValidationError(
                f"File too large: {file_size / (1024*1024):.1f}MB. Maximum: {max_size_mb:.1f}MB"
            )
        
        if file_size == 0:
            raise FileValidationError("File is empty")
        
        # Validate content type
        if file.content_type and not file.content_type.startswith('application/pdf'):
            logger.warning(f"Unexpected content type: {file.content_type} for {file.filename}")
    
    def _generate_safe_filename(self, original_filename: str, file_type: str) -> str:
        """Generate a safe filename for storage"""
        # Clean the original filename
        safe_name = "".join(c for c in original_filename if c.isalnum() or c in '._-')
        
        # Ensure it has the correct extension
        if not safe_name.lower().endswith('.pdf'):
            safe_name += '.pdf'
        
        # Add timestamp and file type prefix
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{file_type}_{timestamp}_{safe_name}"
        
        return safe_filename
    
    async def _save_file_content(self, file: UploadFile, file_path: Path) -> int:
        """Save file content to disk"""
        total_size = 0
        
        try:
            async with aiofiles.open(file_path, 'wb') as out_file:
                while content := await file.read(8192):  # Read in 8KB chunks
                    total_size += len(content)
                    await out_file.write(content)
            
            logger.debug(f"Saved {total_size} bytes to {file_path}")
            return total_size
            
        except Exception as e:
            # Clean up partial file
            if file_path.exists():
                file_path.unlink()
            raise StorageError(f"Failed to save file content: {e}")
    
    async def _calculate_file_checksum(self, file_path: Path) -> str:
        """Calculate MD5 checksum of file"""
        hash_md5 = hashlib.md5()
        
        try:
            async with aiofiles.open(file_path, 'rb') as f:
                while chunk := await f.read(8192):
                    hash_md5.update(chunk)
            
            return hash_md5.hexdigest()
            
        except Exception as e:
            logger.error(f"Error calculating checksum for {file_path}: {e}")
            return ""
    
    async def _get_file_metadata(self, file_path: Path) -> Dict[str, Any]:
        """Get file metadata"""
        try:
            stat = file_path.stat()
            
            # Try to get MIME type
            mime_type = "application/pdf"  # Default
            try:
                mime_type = magic.from_file(str(file_path), mime=True)
            except Exception:
                pass  # Use default if magic fails
            
            return {
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "mime_type": mime_type,
                "readable": os.access(file_path, os.R_OK),
                "exists": file_path.exists()
            }
            
        except Exception as e:
            logger.warning(f"Could not get metadata for {file_path}: {e}")
            return {}
    
    def get_session_files(self, session_id: str) -> List[Dict[str, Any]]:
        """Get list of files for a session"""
        session_dir = self.upload_dir / session_id
        
        if not session_dir.exists():
            return []
        
        files = []
        for file_path in session_dir.iterdir():
            if file_path.is_file():
                try:
                    stat = file_path.stat()
                    file_info = {
                        "filename": file_path.name,
                        "file_path": str(file_path),
                        "size_bytes": stat.st_size,
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "file_type": self._determine_file_type(file_path.name)
                    }
                    files.append(file_info)
                except Exception as e:
                    logger.warning(f"Error getting info for {file_path}: {e}")
        
        return sorted(files, key=lambda x: x["created_at"], reverse=True)
    
    def _determine_file_type(self, filename: str) -> str:
        """Determine file type from filename"""
        filename_lower = filename.lower()
        
        if "car" in filename_lower:
            return FileType.CAR
        elif "receipt" in filename_lower:
            return FileType.RECEIPT
        else:
            return "unknown"
    
    def delete_session_files(self, session_id: str) -> Dict[str, Any]:
        """Delete all files for a session"""
        session_dir = self.upload_dir / session_id
        
        if not session_dir.exists():
            return {"deleted": 0, "errors": []}
        
        deleted_count = 0
        errors = []
        
        try:
            for file_path in session_dir.iterdir():
                try:
                    if file_path.is_file():
                        file_path.unlink()
                        deleted_count += 1
                except Exception as e:
                    errors.append(f"Error deleting {file_path.name}: {e}")
            
            # Remove directory if empty
            if not list(session_dir.iterdir()):
                session_dir.rmdir()
            
        except Exception as e:
            errors.append(f"Error accessing session directory: {e}")
        
        logger.info(f"Deleted {deleted_count} files for session {session_id}")
        return {"deleted": deleted_count, "errors": errors}
    
    def get_file_path(self, session_id: str, filename: str) -> Optional[Path]:
        """Get full path to a file"""
        session_dir = self.upload_dir / session_id
        file_path = session_dir / filename
        
        if file_path.exists() and file_path.is_file():
            return file_path
        
        return None
    
    def create_export_file(
        self,
        session_id: str,
        filename: str,
        content: bytes
    ) -> Path:
        """Create an export file"""
        session_export_dir = self.export_dir / session_id
        session_export_dir.mkdir(exist_ok=True)
        
        file_path = session_export_dir / filename
        
        try:
            with open(file_path, 'wb') as f:
                f.write(content)
            
            logger.info(f"Created export file: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error creating export file {file_path}: {e}")
            raise StorageError(f"Failed to create export file: {e}")
    
    def get_export_files(self, session_id: str) -> List[Dict[str, Any]]:
        """Get list of export files for a session"""
        export_dir = self.export_dir / session_id
        
        if not export_dir.exists():
            return []
        
        files = []
        for file_path in export_dir.iterdir():
            if file_path.is_file():
                try:
                    stat = file_path.stat()
                    file_info = {
                        "filename": file_path.name,
                        "file_path": str(file_path),
                        "size_bytes": stat.st_size,
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "export_type": self._determine_export_type(file_path.name)
                    }
                    files.append(file_info)
                except Exception as e:
                    logger.warning(f"Error getting export file info for {file_path}: {e}")
        
        return sorted(files, key=lambda x: x["created_at"], reverse=True)
    
    def _determine_export_type(self, filename: str) -> str:
        """Determine export type from filename"""
        filename_lower = filename.lower()
        
        if "pvault" in filename_lower:
            return "pvault"
        elif "followup" in filename_lower:
            return "followup"
        elif "summary" in filename_lower:
            return "summary"
        else:
            return "unknown"
    
    def cleanup_old_files(self, days_to_keep: int = 30):
        """Clean up old files to save disk space"""
        cutoff_time = datetime.utcnow().timestamp() - (days_to_keep * 24 * 60 * 60)
        
        cleaned_count = 0
        errors = []
        
        # Clean upload files
        try:
            for session_dir in self.upload_dir.iterdir():
                if session_dir.is_dir():
                    for file_path in session_dir.iterdir():
                        try:
                            if file_path.is_file() and file_path.stat().st_ctime < cutoff_time:
                                file_path.unlink()
                                cleaned_count += 1
                        except Exception as e:
                            errors.append(f"Error deleting {file_path}: {e}")
                    
                    # Remove empty session directories
                    try:
                        if not list(session_dir.iterdir()):
                            session_dir.rmdir()
                    except Exception:
                        pass  # Ignore errors removing directories
        
        except Exception as e:
            errors.append(f"Error cleaning upload directory: {e}")
        
        # Clean export files
        try:
            for session_dir in self.export_dir.iterdir():
                if session_dir.is_dir():
                    for file_path in session_dir.iterdir():
                        try:
                            if file_path.is_file() and file_path.stat().st_ctime < cutoff_time:
                                file_path.unlink()
                                cleaned_count += 1
                        except Exception as e:
                            errors.append(f"Error deleting {file_path}: {e}")
                    
                    # Remove empty session directories
                    try:
                        if not list(session_dir.iterdir()):
                            session_dir.rmdir()
                    except Exception:
                        pass  # Ignore errors removing directories
        
        except Exception as e:
            errors.append(f"Error cleaning export directory: {e}")
        
        logger.info(f"Cleaned up {cleaned_count} old files")
        return {"cleaned_files": cleaned_count, "errors": errors}
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get storage usage information"""
        try:
            upload_size = self._get_directory_size(self.upload_dir)
            export_size = self._get_directory_size(self.export_dir)
            
            # Get disk usage for the base directory
            disk_usage = shutil.disk_usage(self.settings.BASE_DIR)
            
            return {
                "upload_directory": {
                    "path": str(self.upload_dir),
                    "size_bytes": upload_size,
                    "size_mb": upload_size / (1024 * 1024)
                },
                "export_directory": {
                    "path": str(self.export_dir),
                    "size_bytes": export_size,
                    "size_mb": export_size / (1024 * 1024)
                },
                "disk_usage": {
                    "total_bytes": disk_usage.total,
                    "used_bytes": disk_usage.used,
                    "free_bytes": disk_usage.free,
                    "used_percent": (disk_usage.used / disk_usage.total) * 100
                }
            }
        except Exception as e:
            logger.error(f"Error getting storage info: {e}")
            return {"error": str(e)}
    
    def _get_directory_size(self, directory: Path) -> int:
        """Get total size of directory and all subdirectories"""
        total_size = 0
        
        try:
            for file_path in directory.rglob('*'):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
        except Exception as e:
            logger.warning(f"Error calculating directory size for {directory}: {e}")
        
        return total_size

# Global file manager instance
file_manager = FileManager()