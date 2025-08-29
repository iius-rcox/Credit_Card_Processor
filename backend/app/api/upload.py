from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ProcessingSession, FileUpload
from ..config import settings
import hashlib
import os
import aiofiles
from typing import List

router = APIRouter(prefix="/api/sessions", tags=["upload"])

async def calculate_checksum(content: bytes) -> str:
    """Calculate SHA256 checksum for file content"""
    return hashlib.sha256(content).hexdigest()

def validate_file_upload(file: UploadFile) -> dict:
    """Validate uploaded file"""
    if not file.filename.lower().endswith('.pdf'):
        return {"valid": False, "error": "Only PDF files are allowed"}
    
    # Note: file.size is not always available, we'll check size after reading
    return {"valid": True}

@router.post("/{session_id}/upload")
async def upload_files_to_session(
    session_id: str,
    car_file: UploadFile = File(...),
    receipt_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload CAR and Receipt files to session"""
    
    # Verify session exists
    session = db.query(ProcessingSession).filter(ProcessingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create session-specific upload directory
    session_upload_dir = os.path.join(settings.UPLOAD_PATH, session_id)
    os.makedirs(session_upload_dir, exist_ok=True)
    
    uploaded_files = []
    
    for file, file_type in [(car_file, "car"), (receipt_file, "receipt")]:
        # Validate file
        validation = validate_file_upload(file)
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail=f"{file_type.upper()} file: {validation['error']}")
        
        # Read file content
        content = await file.read()
        
        # Check file size (100MB limit)
        file_size_mb = len(content) / (1024 * 1024)
        if file_size_mb > settings.MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400, 
                detail=f"{file_type.upper()} file size ({file_size_mb:.1f}MB) exceeds limit ({settings.MAX_FILE_SIZE_MB}MB)"
            )
        
        # Calculate checksum
        checksum = await calculate_checksum(content)
        
        # Generate file path
        file_path = os.path.join(session_upload_dir, f"{file_type}_{file.filename}")
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Create database record
        file_upload = FileUpload(
            session_id=session_id,
            file_type=file_type,
            original_filename=file.filename,
            file_path=file_path,
            file_size_bytes=len(content),
            checksum_sha256=checksum
        )
        
        db.add(file_upload)
        uploaded_files.append({
            "file_id": file_upload.id,
            "file_type": file_type,
            "original_filename": file.filename,
            "file_size_bytes": len(content),
            "checksum_sha256": checksum,
            "upload_status": "uploaded"
        })
    
    # Update session status
    session.status = "ready_to_process"
    db.commit()
    
    return {
        "message": "Files uploaded successfully",
        "session_id": session_id,
        "files": uploaded_files
    }

@router.post("/{session_id}/detect-delta")
async def detect_delta_files(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Detect if uploaded files match previous sessions (delta detection)"""
    
    session = db.query(ProcessingSession).filter(ProcessingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get uploaded files for this session
    uploaded_files = db.query(FileUpload).filter(FileUpload.session_id == session_id).all()
    
    if len(uploaded_files) < 2:
        return {
            "has_matching_files": False,
            "message": "Upload CAR and Receipt files to check for delta sessions"
        }
    
    # Get checksums for current files
    current_checksums = {f.file_type: f.checksum_sha256 for f in uploaded_files}
    
    # Find previous sessions by same user with matching checksums
    previous_sessions = (
        db.query(ProcessingSession)
        .filter(
            ProcessingSession.created_by == session.created_by,
            ProcessingSession.id != session_id,
            ProcessingSession.status == "completed"
        )
        .order_by(ProcessingSession.created_at.desc())
        .all()
    )
    
    for prev_session in previous_sessions:
        prev_files = {f.file_type: f.checksum_sha256 for f in prev_session.file_uploads}
        
        matching_files = []
        if "car" in prev_files and "car" in current_checksums:
            if prev_files["car"] == current_checksums["car"]:
                matching_files.append("car")
        
        if "receipt" in prev_files and "receipt" in current_checksums:
            if prev_files["receipt"] == current_checksums["receipt"]:
                matching_files.append("receipt")
        
        if matching_files:
            # Found matching files
            return {
                "has_matching_files": True,
                "previous_session_id": prev_session.id,
                "previous_session_name": prev_session.session_name,
                "matching_files": matching_files,
                "recommendation": "delta_session" if len(matching_files) == 2 else "partial_match",
                "message": f"Found matching {' and '.join(matching_files)} file(s) from session '{prev_session.session_name}'"
            }
    
    return {
        "has_matching_files": False,
        "message": "No matching files found in previous sessions"
    }