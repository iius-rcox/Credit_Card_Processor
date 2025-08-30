"""
File Upload API Endpoints
Implements secure file upload functionality with validation, checksums, and session management
"""

import os
import uuid
import hashlib
import logging
import mimetypes
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..models import ProcessingSession, FileUpload, FileType, UploadStatus, SessionStatus, ProcessingActivity, ActivityType
from ..config import settings

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/sessions", tags=["file-upload"])

# File validation constants
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes
ALLOWED_MIME_TYPES = {'application/pdf'}
ALLOWED_EXTENSIONS = {'.pdf'}
PDF_MAGIC_BYTES = b'%PDF-'

# Upload directory configuration
UPLOAD_BASE_DIR = Path(settings.upload_path)


def validate_file_upload(file: UploadFile) -> Dict[str, Any]:
    """
    Validate uploaded file for type, size, and basic security
    
    Args:
        file: FastAPI UploadFile object
        
    Returns:
        Dict with validation results
        
    Raises:
        HTTPException: For validation failures
    """
    validation_result = {
        'valid': True,
        'errors': [],
        'warnings': [],
        'file_info': {
            'original_filename': file.filename,
            'content_type': file.content_type,
            'size': 0
        }
    }
    
    # Check filename
    if not file.filename:
        validation_result['valid'] = False
        validation_result['errors'].append("Filename is required")
        return validation_result
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        validation_result['valid'] = False
        validation_result['errors'].append(f"Invalid file type. Only PDF files are allowed")
    
    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        validation_result['valid'] = False
        validation_result['errors'].append(f"Invalid content type: {file.content_type}. Only PDF files are allowed")
    
    return validation_result


def validate_pdf_content(content: bytes) -> bool:
    """
    Validate PDF file content structure
    
    Args:
        content: File content as bytes
        
    Returns:
        True if valid PDF, False otherwise
    """
    if len(content) < 5:
        return False
    
    # Check PDF magic bytes
    if not content.startswith(PDF_MAGIC_BYTES):
        return False
    
    # Basic structure validation - look for EOF marker
    if b'%%EOF' not in content[-1024:]:
        return False
    
    # Check for basic PDF structure elements
    required_elements = [b'obj', b'endobj', b'trailer']
    for element in required_elements:
        if element not in content:
            return False
    
    return True


def calculate_checksum(content: bytes) -> str:
    """
    Calculate SHA256 checksum for file content
    
    Args:
        content: File content as bytes
        
    Returns:
        SHA256 hex digest
    """
    sha256_hash = hashlib.sha256()
    sha256_hash.update(content)
    return sha256_hash.hexdigest()


def create_upload_directory(session_id: str) -> Path:
    """
    Create session-specific upload directory
    
    Args:
        session_id: Session UUID string
        
    Returns:
        Path to created directory
        
    Raises:
        OSError: If directory creation fails
    """
    upload_dir = UPLOAD_BASE_DIR / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def store_file_metadata(session_id: str, files_info: List[Dict[str, Any]]) -> None:
    """
    Store file metadata as JSON in upload directory
    
    Args:
        session_id: Session UUID string
        files_info: List of file information dictionaries
    """
    import json
    
    upload_dir = UPLOAD_BASE_DIR / session_id
    metadata_file = upload_dir / "metadata.json"
    
    metadata = {
        'session_id': session_id,
        'upload_timestamp': datetime.now(timezone.utc).isoformat(),
        'files': files_info
    }
    
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)


FILE_TYPES_TO_NAMES = {
    FileType.CAR: 'car_file.pdf',
    FileType.RECEIPT: 'receipt_file.pdf'
}


def check_session_access_for_upload(db_session: ProcessingSession, current_user: UserInfo) -> bool:
    """
    Check if user has upload access to a session
    
    Args:
        db_session: Database session object
        current_user: Current authenticated user
        
    Returns:
        True if user has upload access, False otherwise
        
    Rules:
        - Admins can upload to any session
        - Session owners can upload to their own sessions
        - Session must be in PENDING status for uploads
    """
    # Check if session allows uploads (must be PENDING)
    if db_session.status != SessionStatus.PENDING:
        return False
    
    if current_user.is_admin:
        return True
    
    # Extract username from domain format if present
    session_creator = db_session.created_by.lower()
    if '\\' in session_creator:
        session_creator = session_creator.split('\\')[1]
    
    return session_creator == current_user.username.lower()


@router.post("/{session_id}/upload")
async def upload_files_to_session(
    session_id: str,
    car_file: UploadFile = File(..., description="CAR file (PDF, max 100MB)"),
    receipt_file: UploadFile = File(..., description="Receipt file (PDF, max 100MB)"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Upload CAR and Receipt files to a processing session
    
    Args:
        session_id: UUID of the target session
        car_file: CAR PDF file
        receipt_file: Receipt PDF file
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        JSON response with upload results
        
    Raises:
        HTTPException: For validation errors, access denied, or system errors
        
    Security:
        - Requires authentication
        - Only session owners and admins can upload
        - Files are validated for type, size, and content
        - Checksums are calculated for integrity verification
    """
    try:
        # Validate session ID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            logger.warning(f"Invalid session UUID format: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid session ID format"
            )
        
        # Get session from database
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            logger.warning(f"Session not found for upload: {session_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check upload access
        if not check_session_access_for_upload(db_session, current_user):
            logger.warning(
                f"User {current_user.username} attempted to upload to session {session_id} without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied or session not in uploadable state"
            )
        
        # Validate both files
        files_to_process = [
            (car_file, FileType.CAR, "CAR"),
            (receipt_file, FileType.RECEIPT, "Receipt")
        ]
        
        validation_errors = []
        for file_obj, file_type, file_name in files_to_process:
            validation = validate_file_upload(file_obj)
            if not validation['valid']:
                validation_errors.extend([f"{file_name}: {error}" for error in validation['errors']])
        
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File validation failed: {', '.join(validation_errors)}"
            )
        
        # Create upload directory
        try:
            upload_dir = create_upload_directory(session_id)
        except OSError as e:
            logger.error(f"Failed to create upload directory for session {session_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create upload directory"
            )
        
        # Process and store files
        uploaded_files = []
        files_info = []
        
        for file_obj, file_type, file_name in files_to_process:
            try:
                # Read file content
                content = await file_obj.read()
                
                # Check file size
                if len(content) > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"{file_name} file exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)}MB"
                    )
                
                # Validate PDF content
                if not validate_pdf_content(content):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{file_name} file is not a valid PDF"
                    )
                
                # Calculate checksum
                checksum = calculate_checksum(content)
                
                # Store file
                filename = FILE_TYPES_TO_NAMES[file_type]
                file_path = upload_dir / filename
                
                with open(file_path, 'wb') as f:
                    f.write(content)
                
                # Create file upload record
                file_upload = FileUpload(
                    session_id=session_uuid,
                    file_type=file_type,
                    original_filename=file_obj.filename,
                    file_path=str(file_path),
                    file_size=len(content),
                    checksum=checksum,
                    upload_status=UploadStatus.COMPLETED,
                    uploaded_by=f"DOMAIN\\{current_user.username}"
                )
                
                db.add(file_upload)
                
                # Prepare response data
                uploaded_files.append({
                    "file_type": file_type.value,
                    "original_filename": file_obj.filename,
                    "file_size": len(content),
                    "checksum": checksum,
                    "upload_status": "completed"
                })
                
                files_info.append({
                    "file_type": file_type.value,
                    "original_filename": file_obj.filename,
                    "stored_filename": filename,
                    "file_size": len(content),
                    "checksum": checksum,
                    "upload_timestamp": datetime.now(timezone.utc).isoformat()
                })
                
                logger.info(
                    f"{file_name} file uploaded successfully - Session: {session_id}, "
                    f"Size: {len(content)} bytes, Checksum: {checksum[:16]}..."
                )
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error processing {file_name} file: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to process {file_name} file"
                )
        
        # Update session with file information
        db_session.car_file_path = str(upload_dir / FILE_TYPES_TO_NAMES[FileType.CAR])
        db_session.receipt_file_path = str(upload_dir / FILE_TYPES_TO_NAMES[FileType.RECEIPT])
        db_session.car_checksum = next(f["checksum"] for f in files_info if f["file_type"] == "car")
        db_session.receipt_checksum = next(f["checksum"] for f in files_info if f["file_type"] == "receipt")
        db_session.status = SessionStatus.PROCESSING  # Update status to indicate files uploaded
        db_session.updated_at = datetime.now(timezone.utc)
        
        # Log activity
        activity = ProcessingActivity(
            session_id=session_uuid,
            activity_type=ActivityType.PROCESSING,
            activity_message=f"Files uploaded: {', '.join([f['original_filename'] for f in files_info])}",
            created_by=f"DOMAIN\\{current_user.username}"
        )
        
        db.add(activity)
        
        # Store metadata file
        try:
            store_file_metadata(session_id, files_info)
        except Exception as e:
            logger.warning(f"Failed to store metadata file: {str(e)}")
            # Don't fail the upload for metadata storage issues
        
        # Commit all changes
        db.commit()
        
        logger.info(
            f"File upload completed successfully - Session: {session_id}, "
            f"User: {current_user.username}, Files: {len(uploaded_files)}"
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "session_id": session_id,
                "uploaded_files": uploaded_files,
                "session_status": "processing",
                "message": "Files uploaded successfully"
            }
        )
        
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during file upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload files due to database error"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during file upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload files due to internal error"
        )