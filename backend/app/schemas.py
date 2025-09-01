"""
Pydantic schemas for Credit Card Processor API
Defines request/response models with validation
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum


class SessionStatus(str, Enum):
    """Session status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ValidationStatus(str, Enum):
    """Validation status enumeration"""
    VALID = "valid"
    NEEDS_ATTENTION = "needs_attention"
    RESOLVED = "resolved"


class ProcessingOptions(BaseModel):
    """Processing configuration options"""
    model_config = ConfigDict(extra="allow")  # Allow additional options
    
    skip_duplicates: bool = Field(default=True, description="Skip duplicate employee records")
    validation_threshold: float = Field(default=0.05, ge=0.0, le=1.0, description="Validation threshold (0.0-1.0)")
    auto_resolve_minor: bool = Field(default=False, description="Automatically resolve minor validation issues")
    
    # Delta processing options
    enable_delta_processing: bool = Field(default=True, description="Enable delta processing optimization")
    skip_unchanged_employees: bool = Field(default=True, description="Skip processing unchanged employees in delta mode")
    amount_change_threshold: float = Field(default=0.01, ge=0.0, description="Minimum amount change to trigger reprocessing (dollars)")
    force_reprocess_validation_issues: bool = Field(default=True, description="Always reprocess employees that had validation issues")
    max_unchanged_skip_percentage: float = Field(default=0.8, ge=0.0, le=1.0, description="Maximum percentage of employees to skip (0.0-1.0)")


class SessionCreateRequest(BaseModel):
    """Request model for creating a new processing session"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_name": "Monthly Processing - March 2024",
                "processing_options": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05,
                    "auto_resolve_minor": False
                },
                "delta_session_id": None
            }
        }
    )
    
    session_name: str = Field(..., min_length=1, max_length=255, description="Name for the processing session")
    processing_options: ProcessingOptions = Field(default_factory=ProcessingOptions, description="Processing configuration")
    delta_session_id: Optional[str] = Field(default=None, description="UUID of base session for delta processing")

    @field_validator('session_name')
    @classmethod
    def validate_session_name(cls, v):
        """Validate session name"""
        if not v.strip():
            raise ValueError('Session name cannot be empty or whitespace only')
        return v.strip()

    @field_validator('delta_session_id')
    @classmethod
    def validate_delta_session_id(cls, v):
        """Validate delta session ID format"""
        if v is not None:
            try:
                uuid.UUID(v)
            except ValueError:
                raise ValueError('delta_session_id must be a valid UUID')
        return v


class SessionResponse(BaseModel):
    """Response model for session information"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "session_name": "Monthly Processing - March 2024",
                "status": "pending",
                "created_by": "DOMAIN\\rcox",
                "created_at": "2024-03-01T10:00:00Z",
                "updated_at": "2024-03-01T10:00:00Z",
                "total_employees": 0,
                "processed_employees": 0,
                "processing_options": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05,
                    "auto_resolve_minor": False
                },
                "delta_session_id": None
            }
        }
    )
    
    session_id: str = Field(..., description="UUID of the session")
    session_name: str = Field(..., description="Name of the session")
    status: SessionStatus = Field(..., description="Current session status")
    created_by: str = Field(..., description="Username who created the session")
    created_at: datetime = Field(..., description="Session creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    total_employees: int = Field(..., ge=0, description="Total number of employees")
    processed_employees: int = Field(..., ge=0, description="Number of processed employees")
    processing_options: Dict[str, Any] = Field(..., description="Processing configuration")
    delta_session_id: Optional[str] = Field(default=None, description="Base session UUID for delta processing")


class SessionListResponse(BaseModel):
    """Response model for listing sessions"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "sessions": [
                    {
                        "session_id": "550e8400-e29b-41d4-a716-446655440000",
                        "session_name": "Monthly Processing - March 2024",
                        "status": "pending",
                        "created_by": "DOMAIN\\rcox",
                        "created_at": "2024-03-01T10:00:00Z",
                        "updated_at": "2024-03-01T10:00:00Z",
                        "total_employees": 0,
                        "processed_employees": 0,
                        "processing_options": {
                            "skip_duplicates": True,
                            "validation_threshold": 0.05,
                            "auto_resolve_minor": False
                        },
                        "delta_session_id": None
                    }
                ],
                "total_count": 1,
                "page": 1,
                "page_size": 20
            }
        }
    )
    
    sessions: List[SessionResponse] = Field(..., description="List of sessions")
    total_count: int = Field(..., ge=0, description="Total number of sessions")
    page: int = Field(default=1, ge=1, description="Current page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Number of items per page")


class FileUploadInfo(BaseModel):
    """Information about an uploaded file"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "file_type": "car",
                "original_filename": "car_documents.pdf",
                "file_size": 2048576,
                "checksum": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
                "upload_status": "completed"
            }
        }
    )
    
    file_type: str = Field(..., description="Type of file (car or receipt)")
    original_filename: str = Field(..., description="Original filename as uploaded")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    checksum: str = Field(..., min_length=64, max_length=64, description="SHA256 checksum of file content")
    upload_status: str = Field(..., description="Upload status (completed, failed, etc.)")


class UploadResponse(BaseModel):
    """Response model for file upload operations"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "uploaded_files": [
                    {
                        "file_type": "car",
                        "original_filename": "car_documents.pdf",
                        "file_size": 2048576,
                        "checksum": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
                        "upload_status": "completed"
                    },
                    {
                        "file_type": "receipt",
                        "original_filename": "receipts.pdf",
                        "file_size": 1024576,
                        "checksum": "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1",
                        "upload_status": "completed"
                    }
                ],
                "session_status": "processing",
                "message": "Files uploaded successfully"
            }
        }
    )
    
    session_id: str = Field(..., description="UUID of the session")
    uploaded_files: List[FileUploadInfo] = Field(..., description="List of uploaded files with details")
    session_status: str = Field(..., description="Updated session status after upload")
    message: str = Field(..., description="Upload result message")


class CurrentEmployee(BaseModel):
    """Information about currently processing employee"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "employee_id": "EMP123",
                "employee_name": "John Smith",
                "processing_stage": "validation"
            }
        }
    )
    
    employee_id: Optional[str] = Field(default=None, description="Employee ID")
    employee_name: Optional[str] = Field(default=None, description="Employee name")
    processing_stage: Optional[str] = Field(default=None, description="Current processing stage")


class RecentActivity(BaseModel):
    """Information about recent processing activity"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "activity_id": "550e8400-e29b-41d4-a716-446655440000",
                "activity_type": "processing",
                "activity_message": "Processing employee EMP123 - John Smith",
                "employee_id": "EMP123",
                "created_at": "2024-03-01T10:15:32Z",
                "created_by": "SYSTEM"
            }
        }
    )
    
    activity_id: str = Field(..., description="UUID of the activity")
    activity_type: str = Field(..., description="Type of activity")
    activity_message: str = Field(..., description="Activity message")
    employee_id: Optional[str] = Field(default=None, description="Related employee ID")
    created_at: datetime = Field(..., description="Activity timestamp")
    created_by: str = Field(..., description="User who created the activity")


class SessionStatusResponse(BaseModel):
    """Comprehensive response model for session status polling"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "session_name": "Monthly Processing - March 2024",
                "status": "processing",
                "created_by": "DOMAIN\\username",
                "created_at": "2024-03-01T10:00:00Z",
                "updated_at": "2024-03-01T10:15:32Z",
                "current_employee": {
                    "employee_id": "EMP123",
                    "employee_name": "John Smith",
                    "processing_stage": "validation"
                },
                "total_employees": 45,
                "percent_complete": 67,
                "completed_employees": 30,
                "processing_employees": 1,
                "issues_employees": 8,
                "pending_employees": 6,
                "estimated_time_remaining": "00:12:45",
                "processing_start_time": "2024-03-01T10:05:00Z",
                "files_uploaded": {
                    "car_file": "car_documents.pdf",
                    "receipt_file": "receipts.pdf"
                },
                "recent_activities": [
                    {
                        "activity_id": "550e8400-e29b-41d4-a716-446655440000",
                        "activity_type": "processing",
                        "activity_message": "Processing employee EMP123 - John Smith",
                        "employee_id": "EMP123",
                        "created_at": "2024-03-01T10:15:32Z",
                        "created_by": "SYSTEM"
                    }
                ]
            }
        }
    )
    
    # Basic session information
    session_id: str = Field(..., description="UUID of the session")
    session_name: str = Field(..., description="Name of the session")
    status: SessionStatus = Field(..., description="Current session status")
    created_by: str = Field(..., description="Username who created the session")
    created_at: datetime = Field(..., description="Session creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Current processing state
    current_employee: Optional[CurrentEmployee] = Field(default=None, description="Currently processing employee")
    
    # Progress statistics
    total_employees: int = Field(..., ge=0, description="Total number of employees")
    percent_complete: int = Field(..., ge=0, le=100, description="Processing completion percentage")
    completed_employees: int = Field(..., ge=0, description="Number of completed employees")
    processing_employees: int = Field(..., ge=0, description="Number of employees currently processing")
    issues_employees: int = Field(..., ge=0, description="Number of employees with issues")
    pending_employees: int = Field(..., ge=0, description="Number of employees pending processing")
    
    # Time estimates
    estimated_time_remaining: Optional[str] = Field(default=None, description="Estimated time remaining (HH:MM:SS)")
    processing_start_time: Optional[datetime] = Field(default=None, description="When processing started")
    
    # File information
    files_uploaded: Optional[Dict[str, str]] = Field(default=None, description="Uploaded files information")
    
    # Recent activities
    recent_activities: List[RecentActivity] = Field(default_factory=list, description="Recent processing activities")


class ProcessingConfig(BaseModel):
    """Enhanced processing configuration for background tasks and mock processing"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "skip_duplicates": True,
                "validation_threshold": 0.05,
                "auto_resolve_minor": False,
                "batch_size": 10,
                "max_processing_time": 3600,
                "employee_count": 45,
                "processing_delay": 1.0,
                "enable_mock_processing": True
            }
        }
    )
    
    skip_duplicates: bool = Field(default=True, description="Skip duplicate employee records")
    validation_threshold: float = Field(default=0.05, ge=0.0, le=1.0, description="Validation threshold (0.0-1.0)")
    auto_resolve_minor: bool = Field(default=False, description="Automatically resolve minor validation issues")
    batch_size: int = Field(default=10, ge=1, le=100, description="Number of employees to process in each batch")
    max_processing_time: int = Field(default=3600, ge=60, le=14400, description="Maximum processing time in seconds (1-4 hours)")
    
    # Mock Processing Configuration
    employee_count: int = Field(default=45, ge=1, le=100, description="Number of mock employees to process (mock mode only)")
    processing_delay: float = Field(default=1.0, ge=0.1, le=5.0, description="Processing delay per employee in seconds (mock mode)")
    enable_mock_processing: bool = Field(default=True, description="Enable mock document processing simulation")


class ProcessingStartRequest(BaseModel):
    """Request model for starting background processing"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "processing_config": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05,
                    "auto_resolve_minor": False,
                    "batch_size": 10,
                    "max_processing_time": 3600,
                    "employee_count": 45,
                    "processing_delay": 1.0,
                    "enable_mock_processing": True
                }
            }
        }
    )
    
    processing_config: Optional[ProcessingConfig] = Field(default_factory=ProcessingConfig, description="Processing configuration options")


class ProcessingResponse(BaseModel):
    """Response model for processing operations"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "processing",
                "message": "Mock document processing started successfully",
                "processing_config": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05,
                    "auto_resolve_minor": False,
                    "batch_size": 10,
                    "max_processing_time": 3600,
                    "employee_count": 45,
                    "processing_delay": 1.0,
                    "enable_mock_processing": True
                },
                "timestamp": "2024-03-01T10:00:00Z"
            }
        }
    )
    
    session_id: str = Field(..., description="UUID of the session")
    status: SessionStatus = Field(..., description="Current session status")
    message: str = Field(..., description="Operation result message")
    processing_config: Optional[Dict[str, Any]] = Field(default=None, description="Applied processing configuration")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Operation timestamp")


class ProcessingControlResponse(BaseModel):
    """Response model for processing control operations (pause, resume, cancel)"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "action": "pause",
                "status": "paused",
                "message": "Processing paused successfully",
                "timestamp": "2024-03-01T10:00:00Z"
            }
        }
    )
    
    session_id: str = Field(..., description="UUID of the session")
    action: str = Field(..., description="Action performed (pause, resume, cancel)")
    status: SessionStatus = Field(..., description="Current session status after action")
    message: str = Field(..., description="Action result message")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Action timestamp")


class ErrorResponse(BaseModel):
    """Standard error response model"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Session not found",
                "error_code": "SESSION_NOT_FOUND",
                "timestamp": "2024-03-01T10:00:00Z"
            }
        }
    )
    
    detail: str = Field(..., description="Error detail message")
    error_code: Optional[str] = Field(default=None, description="Specific error code")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Error timestamp")