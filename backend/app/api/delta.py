"""
Delta Detection API Endpoints

Provides endpoints for file comparison, delta detection, and processing
optimization recommendations for incremental employee data processing.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel, Field

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..models import ProcessingSession
from ..services.delta_processor import (
    DeltaProcessor, 
    DeltaDetectionResult, 
    DeltaMatchType, 
    ProcessingRecommendation
)


# Request/Response models
class DeltaDetectionRequest(BaseModel):
    """Request model for delta detection"""
    car_checksum: str = Field(..., min_length=64, max_length=64, description="SHA-256 checksum of CAR file")
    receipt_checksum: str = Field(..., min_length=64, max_length=64, description="SHA-256 checksum of Receipt file")
    exclude_session_id: Optional[str] = Field(None, description="Session ID to exclude from comparison")
    
    class Config:
        json_schema_extra = {
            "example": {
                "car_checksum": "a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234",
                "receipt_checksum": "f6e5d4c3b2a1987654321098765432109876543210fedcba0987654321098765",
                "exclude_session_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class FileComparisonInfo(BaseModel):
    """File comparison details"""
    car_checksum: str = Field(..., description="CAR file checksum")
    receipt_checksum: str = Field(..., description="Receipt file checksum")
    car_match: bool = Field(..., description="Whether CAR file matches base session")
    receipt_match: bool = Field(..., description="Whether Receipt file matches base session")
    base_session_id: Optional[str] = Field(None, description="Base session ID for comparison")
    base_session_date: Optional[str] = Field(None, description="Base session creation date")
    changed_files: Optional[List[str]] = Field(None, description="List of files that changed")
    matches_found: Optional[int] = Field(None, description="Number of potential matches found")
    exact_matches_count: Optional[int] = Field(None, description="Number of exact matches found")


class SessionSummary(BaseModel):
    """Summary information about a session"""
    session_id: str = Field(..., description="Session UUID")
    session_name: str = Field(..., description="Session name")
    created_at: datetime = Field(..., description="Session creation timestamp")
    status: str = Field(..., description="Session status")
    total_employees: int = Field(..., description="Number of employees processed")
    processed_employees: int = Field(..., description="Number of successfully processed employees")


class DeltaDetectionResponse(BaseModel):
    """Response model for delta detection"""
    match_type: DeltaMatchType = Field(..., description="Type of delta match found")
    recommendation: ProcessingRecommendation = Field(..., description="Processing recommendation")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0.0-1.0)")
    
    # Base session information
    base_session: Optional[SessionSummary] = Field(None, description="Recommended base session")
    alternative_sessions: List[SessionSummary] = Field(default_factory=list, description="Alternative base sessions")
    
    # File comparison details
    file_comparisons: FileComparisonInfo = Field(..., description="File comparison analysis")
    
    # Processing estimates
    processing_time_estimate: Optional[int] = Field(None, description="Estimated processing time in seconds")
    employee_change_estimate: Optional[int] = Field(None, description="Estimated number of changed employees")
    
    # Analysis metadata
    analysis_timestamp: datetime = Field(..., description="When the analysis was performed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "match_type": "exact_match",
                "recommendation": "delta_processing",
                "confidence_score": 0.9,
                "base_session": {
                    "session_id": "550e8400-e29b-41d4-a716-446655440000",
                    "session_name": "Weekly Processing - March 2024",
                    "created_at": "2024-03-15T10:00:00Z",
                    "status": "completed",
                    "total_employees": 45,
                    "processed_employees": 43
                },
                "file_comparisons": {
                    "car_checksum": "a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234",
                    "receipt_checksum": "f6e5d4c3b2a1987654321098765432109876543210fedcba0987654321098765",
                    "car_match": True,
                    "receipt_match": True,
                    "base_session_id": "550e8400-e29b-41d4-a716-446655440000",
                    "base_session_date": "2024-03-15T10:00:00Z"
                },
                "processing_time_estimate": 60,
                "employee_change_estimate": 0,
                "analysis_timestamp": "2024-03-22T14:30:00Z"
            }
        }


class SessionFileInfoResponse(BaseModel):
    """Response model for session file information"""
    session_id: str = Field(..., description="Session UUID")
    car_checksum: Optional[str] = Field(None, description="CAR file checksum")
    receipt_checksum: Optional[str] = Field(None, description="Receipt file checksum")
    created_at: datetime = Field(..., description="Session creation timestamp")
    total_employees: int = Field(..., description="Number of employees processed")
    status: str = Field(..., description="Session status")


# Configure security logger
security_logger = logging.getLogger('security.delta_api')

router = APIRouter(prefix="/api/sessions", tags=["delta-detection"])


def _convert_to_session_summary(session: ProcessingSession) -> SessionSummary:
    """Convert ProcessingSession to SessionSummary"""
    return SessionSummary(
        session_id=str(session.session_id),
        session_name=session.session_name,
        created_at=session.created_at,
        status=session.status.value,
        total_employees=session.total_employees,
        processed_employees=session.processed_employees
    )


@router.post("/detect-delta", response_model=DeltaDetectionResponse)
async def detect_delta_files(
    request: DeltaDetectionRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Detect potential delta base sessions by comparing file checksums
    
    This endpoint analyzes uploaded file checksums against previous processing
    sessions to identify opportunities for delta (incremental) processing.
    
    **Delta Processing Benefits:**
    - Faster processing times for unchanged files
    - Efficient handling of incremental updates
    - Smart recommendations based on file comparison
    
    **Match Types:**
    - `exact_match`: Both files identical to previous session
    - `partial_match`: One file matches, other differs  
    - `no_match`: No matching files found
    - `multiple_matches`: Multiple potential base sessions found
    
    **Recommendations:**
    - `skip_processing`: Files identical, can reuse previous results
    - `delta_processing`: Use optimized incremental processing
    - `full_processing`: Process normally (no optimizations available)
    - `review_required`: Multiple matches require user decision
    """
    # Enhanced security validation
    try:
        # Log security event
        security_logger.info(f"Delta detection requested by user: {current_user.username}")
        
        # Rate limiting check (basic)
        # TODO: Implement proper rate limiting middleware
        
        # Initialize processor with security context
        processor = DeltaProcessor(db)
        
        # Strict input validation with security logging
        if not processor.validate_checksums(request.car_checksum, request.receipt_checksum):
            security_logger.warning(
                f"Invalid checksums provided by user {current_user.username}: "
                f"car_len={len(request.car_checksum)}, receipt_len={len(request.receipt_checksum)}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid checksum format"
            )
        
        # Additional authorization checks
        if not current_user.username:
            security_logger.error("Unauthenticated user attempted delta detection")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Perform delta detection with enhanced error handling
        result = processor.detect_delta_files(
            car_checksum=request.car_checksum,
            receipt_checksum=request.receipt_checksum,
            current_user=current_user.username,
            exclude_session_id=request.exclude_session_id
        )
        
        # Log successful operation
        security_logger.info(
            f"Delta detection completed for user {current_user.username}: "
            f"match_type={result.match_type}, confidence={result.confidence_score}"
        )
    
    except ValueError as e:
        security_logger.warning(f"Validation error in delta detection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid input parameters"
        )
    except SQLAlchemyError as e:
        security_logger.error(f"Database error in delta detection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database operation failed"
        )
    except Exception as e:
        security_logger.error(f"Unexpected error in delta detection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
    
    try:
        
        # Convert result to response model
        response = DeltaDetectionResponse(
            match_type=result.match_type,
            recommendation=result.recommendation,
            confidence_score=result.confidence_score,
            base_session=_convert_to_session_summary(result.base_session) if result.base_session else None,
            alternative_sessions=[
                _convert_to_session_summary(session) for session in result.alternative_sessions
            ],
            file_comparisons=FileComparisonInfo(**result.file_comparisons),
            processing_time_estimate=result.processing_time_estimate,
            employee_change_estimate=result.employee_change_estimate,
            analysis_timestamp=result.analysis_timestamp
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delta detection failed: {str(e)}"
        )


@router.get("/{session_id}/file-info", response_model=SessionFileInfoResponse)
async def get_session_file_info(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get file checksum information for a specific session
    
    Retrieves the file checksums and metadata for a processing session,
    useful for manual delta comparison or debugging purposes.
    """
    processor = DeltaProcessor(db)
    
    # Get session info
    file_info = processor.get_session_file_info(session_id)
    
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Verify user has access to this session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # For now, users can only access their own sessions
    # In production, you might want more sophisticated access control
    if session.created_by != current_user.username and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this session"
        )
    
    return SessionFileInfoResponse(
        session_id=file_info["session_id"],
        car_checksum=file_info["car_checksum"],
        receipt_checksum=file_info["receipt_checksum"],
        created_at=datetime.fromisoformat(file_info["created_at"]),
        total_employees=file_info["total_employees"],
        status=file_info["status"]
    )


@router.post("/calculate-checksum")
async def calculate_file_checksum(
    request: Request,
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Calculate SHA-256 checksum for uploaded file content
    
    Utility endpoint for calculating file checksums that can be used
    with the delta detection API. Useful for testing and debugging.
    
    **Note**: This endpoint accepts raw file content in the request body.
    """
    try:
        # Read the raw body content
        file_content = await request.body()
        processor = DeltaProcessor(None)  # No DB needed for checksum calculation
        checksum = processor.calculate_file_checksum(file_content)
        
        return {
            "checksum": checksum,
            "algorithm": "SHA-256",
            "file_size": len(file_content),
            "calculated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Checksum calculation failed: {str(e)}"
        )