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

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

# Enhanced security imports
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False

# Setup logging
logger = logging.getLogger(__name__)

# Log warning if python-magic not available
if not MAGIC_AVAILABLE:
    logger.warning("python-magic not available. Using basic MIME type validation only.")

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..models import ProcessingSession, FileUpload, FileType, UploadStatus, SessionStatus, ProcessingActivity, ActivityType
from ..config import settings
from ..websocket import notifier

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/sessions", tags=["file-upload"])

# File validation constants
MAX_CAR_FILE_SIZE = settings.max_car_file_size_mb * 1024 * 1024  # Convert MB to bytes
MAX_RECEIPT_FILE_SIZE = settings.max_receipt_file_size_gb * 1024 * 1024 * 1024  # Convert GB to bytes
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
    
    # Sanitize filename to prevent path traversal
    safe_filename = Path(file.filename).name
    if safe_filename != file.filename:
        validation_result['warnings'].append("Filename was sanitized for security")
        validation_result['file_info']['sanitized_filename'] = safe_filename
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        validation_result['valid'] = False
        validation_result['errors'].append(f"Invalid file extension: {file_ext}. Only PDF files (.pdf) are allowed")
    
    # Check declared MIME type (client-provided, can be spoofed)
    if file.content_type not in ALLOWED_MIME_TYPES:
        validation_result['valid'] = False
        validation_result['errors'].append(f"Invalid declared content type: {file.content_type}. Only PDF files are allowed")
    
    return validation_result


def validate_file_content_security(content: bytes, filename: str, file_type: str = 'car') -> Dict[str, Any]:
    """
    Enhanced server-side content validation using multiple detection methods
    
    Args:
        content: File content as bytes
        filename: Original filename
        
    Returns:
        Dict with detailed validation results
    """
    validation_result = {
        'valid': True,
        'errors': [],
        'warnings': [],
        'detected_type': None,
        'magic_mime': None,
        'content_analysis': {}
    }
    
    # Size validation based on file type
    file_size = len(content)
    validation_result['content_analysis']['size'] = file_size
    
    max_size = MAX_RECEIPT_FILE_SIZE if file_type == 'receipt' else MAX_CAR_FILE_SIZE
    max_size_display = "300GB" if file_type == 'receipt' else "100MB"
    
    if file_size > max_size:
        validation_result['valid'] = False
        validation_result['errors'].append(f"File size ({file_size} bytes) exceeds maximum allowed size ({max_size_display})")
        return validation_result
    
    if file_size < 100:  # Minimum reasonable PDF size
        validation_result['valid'] = False
        validation_result['errors'].append("File is too small to be a valid PDF")
        return validation_result
    
    # Enhanced MIME type detection using python-magic if available
    if MAGIC_AVAILABLE:
        try:
            # Detect MIME type from content (more reliable than client declaration)
            detected_mime = magic.from_buffer(content, mime=True)
            validation_result['magic_mime'] = detected_mime
            validation_result['detected_type'] = detected_mime
            
            # Validate detected MIME type
            if detected_mime not in ALLOWED_MIME_TYPES:
                validation_result['valid'] = False
                validation_result['errors'].append(f"Content analysis detected invalid file type: {detected_mime}. File may be disguised or corrupted.")
            
            # Get human-readable file type description
            file_description = magic.from_buffer(content)
            validation_result['content_analysis']['description'] = file_description
            
        except Exception as magic_error:
            logger.warning(f"Magic library error for file {filename}: {magic_error}")
            validation_result['warnings'].append("Enhanced content detection failed, using basic validation")
    
    # Fallback: Basic PDF content validation
    if not validate_pdf_content(content):
        validation_result['valid'] = False
        validation_result['errors'].append("File content is not a valid PDF document")
    
    # Additional security checks
    validation_result['content_analysis']['has_pdf_header'] = content.startswith(PDF_MAGIC_BYTES)
    validation_result['content_analysis']['has_pdf_footer'] = b'%%EOF' in content[-1024:]
    
    # Check for potentially dangerous content patterns
    dangerous_patterns = [
        b'<script',  # JavaScript in PDF
        b'javascript:',  # JavaScript URLs
        b'/JS',  # PDF JavaScript objects
        b'/JavaScript',  # PDF JavaScript
        b'this.print',  # Auto-print attempts
        b'app.alert',  # JavaScript alerts
    ]
    
    dangerous_found = []
    for pattern in dangerous_patterns:
        if pattern.lower() in content.lower():
            dangerous_found.append(pattern.decode('utf-8', errors='ignore'))
    
    if dangerous_found:
        validation_result['warnings'].append(f"Potentially dangerous content detected: {', '.join(dangerous_found)}")
        validation_result['content_analysis']['security_flags'] = dangerous_found
    
    # Log validation results for security monitoring
    logger.info(f"File validation for {filename}: valid={validation_result['valid']}, "
               f"detected_type={validation_result.get('detected_type', 'unknown')}, "
               f"size={file_size}, security_flags={len(dangerous_found)}")
    
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
    # Modern PDFs may not have all traditional elements, so check for essential ones only
    essential_elements = [b'obj', b'endobj']
    for element in essential_elements:
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
    receipt_file: UploadFile = File(..., description="Receipt file (PDF, max 300GB)"),
    auto_process: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Upload CAR and Receipt files to a processing session with optional auto-processing
    
    Args:
        session_id: UUID of the target session
        car_file: CAR PDF file
        receipt_file: Receipt PDF file
        auto_process: Whether to automatically start processing after upload (default: True)
        background_tasks: FastAPI background tasks
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
                
                # Enhanced security validation of file content
                file_type_str = 'receipt' if file_type == FileType.RECEIPT else 'car'
                content_validation = validate_file_content_security(content, file_obj.filename, file_type_str)
                if not content_validation['valid']:
                    security_errors = ', '.join(content_validation['errors'])
                    logger.warning(f"Security validation failed for {file_name}: {security_errors}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{file_name} failed security validation: {security_errors}"
                    )
                
                # Log security warnings for monitoring
                if content_validation['warnings']:
                    security_warnings = ', '.join(content_validation['warnings'])
                    logger.warning(f"Security warnings for {file_name}: {security_warnings}")
                
                # Log detected file type for audit trail
                if content_validation.get('detected_type'):
                    logger.info(f"File {file_name} detected as: {content_validation['detected_type']}")
                
                # Store validation metadata for potential future analysis
                validation_metadata = {
                    'magic_mime': content_validation.get('magic_mime'),
                    'content_analysis': content_validation.get('content_analysis', {}),
                    'security_flags': content_validation.get('content_analysis', {}).get('security_flags', [])
                }
                
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
        # Keep session in PENDING status - processing starts only when explicitly requested
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
        
        # Auto-processing logic
        response_status = "pending"
        response_message = "Files uploaded successfully"
        
        if auto_process:
            try:
                # Import here to avoid circular imports
                from .processing import process_session
                
                # Default processing configuration for auto-processing
                config_dict = {
                    "employee_count": 45,
                    "processing_delay": 1.0,
                    "auto_processing": True
                }
                
                # Update session processing options
                db_session.processing_options = config_dict
                db.commit()
                
                # Get database URL for background task
                db_url = str(db.get_bind().url)
                
                # Start background processing
                background_tasks.add_task(
                    process_session,
                    session_id,
                    config_dict,
                    db_url
                )
                
                # Notify WebSocket clients
                await notifier.notify_processing_started(session_id, config_dict)
                
                response_status = "processing"
                response_message = "Files uploaded successfully and processing started automatically"
                
                logger.info(
                    f"Auto-processing started for session {session_id} after file upload"
                )
                
            except Exception as e:
                logger.error(f"Failed to start auto-processing for session {session_id}: {str(e)}")
                # Don't fail the upload if auto-processing fails
                response_message = "Files uploaded successfully, but auto-processing failed to start. You can manually start processing."
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "session_id": session_id,
                "uploaded_files": uploaded_files,
                "session_status": response_status,
                "auto_processing": auto_process,
                "message": response_message
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