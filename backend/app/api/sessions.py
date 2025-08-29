from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ProcessingSession
from ..schemas import SessionCreateRequest, SessionResponse, SessionStatusResponse
from typing import List

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.post("", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreateRequest,
    db: Session = Depends(get_db),
    # current_user: str = Depends(get_current_username)  # TODO: Add auth dependency
):
    """Create new processing session"""
    # TODO: Extract current user from auth
    current_user = "test_user"  # Placeholder for development
    
    new_session = ProcessingSession(
        session_name=session_data.session_name,
        created_by=current_user,
        skip_unchanged_employees=session_data.skip_unchanged_employees,
        amount_mismatch_threshold=session_data.amount_mismatch_threshold,
        auto_resolve_minor_issues=session_data.auto_resolve_minor_issues
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return SessionResponse(
        id=new_session.id,
        created_at=new_session.created_at,
        session_name=new_session.session_name,
        created_by=new_session.created_by,
        status=new_session.status,
        is_delta_session=new_session.is_delta_session,
        based_on_session_id=new_session.based_on_session_id,
        total_employees=new_session.total_employees,
        completed_employees=new_session.completed_employees,
        file_uploads=[]
    )

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get session details"""
    session = db.query(ProcessingSession).filter(ProcessingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionResponse(
        id=session.id,
        created_at=session.created_at,
        session_name=session.session_name,
        created_by=session.created_by,
        status=session.status,
        is_delta_session=session.is_delta_session,
        based_on_session_id=session.based_on_session_id,
        total_employees=session.total_employees,
        completed_employees=session.completed_employees,
        file_uploads=[{
            "file_id": f.id,
            "file_type": f.file_type,
            "original_filename": f.original_filename,
            "file_size_bytes": f.file_size_bytes,
            "checksum_sha256": f.checksum_sha256,
            "upload_status": f.upload_status
        } for f in session.file_uploads]
    )

@router.get("/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get session processing status for polling"""
    session = db.query(ProcessingSession).filter(ProcessingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get recent activities (last 5)
    recent_activities = (
        db.query(ProcessingActivity)
        .filter(ProcessingActivity.session_id == session_id)
        .order_by(ProcessingActivity.created_at.desc())
        .limit(5)
        .all()
    )
    
    # Calculate progress percentage
    percent_complete = 0.0
    if session.total_employees > 0:
        percent_complete = (session.completed_employees / session.total_employees) * 100
    
    # Estimate time remaining (simple calculation)
    estimated_time_remaining = None
    if session.status == "processing" and session.total_employees > 0:
        remaining_employees = session.total_employees - session.completed_employees
        # Assume 1 second per employee for estimation
        estimated_time_remaining = remaining_employees
    
    return SessionStatusResponse(
        status=session.status,
        current_employee=session.completed_employees + 1,
        total_employees=session.total_employees,
        percent_complete=percent_complete,
        completed_employees=session.completed_employees,
        processing_employees=session.processing_employees,
        issues_employees=session.issues_employees,
        pending_employees=session.pending_employees,
        estimated_time_remaining=estimated_time_remaining,
        recent_activities=[{
            "id": activity.id,
            "created_at": activity.created_at,
            "activity_type": activity.activity_type,
            "activity_message": activity.activity_message,
            "employee_name": activity.employee_name,
            "duration_seconds": activity.duration_seconds
        } for activity in recent_activities]
    )