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

# Bulk operations schemas will be imported when needed
# For now, keep them in the separate bulk_operations.py file


class SessionStatus(str, Enum):
    """Session status enumeration"""
    PENDING = "PENDING"
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    EXTRACTING = "EXTRACTING"
    ANALYZING = "ANALYZING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    CLOSED = "CLOSED"
    RECEIPT_REPROCESSING = "RECEIPT_REPROCESSING"
    COMPARING_RECEIPTS = "COMPARING_RECEIPTS"


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


class SessionUpdateRequest(BaseModel):
    """Request model for updating an existing processing session"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_name": "Updated Monthly Processing - March 2024",
                "status": "processing",
                "processing_options": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05,
                    "auto_resolve_minor": False
                }
            }
        }
    )
    
    session_name: Optional[str] = Field(default=None, min_length=1, max_length=255, description="Updated name for the processing session")
    status: Optional[SessionStatus] = Field(default=None, description="Updated session status")
    processing_options: Optional[ProcessingOptions] = Field(default=None, description="Updated processing configuration")

    @field_validator('session_name')
    @classmethod
    def validate_session_name(cls, v):
        """Validate session name"""
        if v is not None and not v.strip():
            raise ValueError('Session name cannot be empty or whitespace only')
        return v.strip() if v else v


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
    
    # Receipt processing tracking
    last_receipt_upload: Optional[datetime] = Field(default=None, description="Timestamp of last receipt file upload")
    receipt_file_versions: int = Field(default=1, description="Number of receipt file versions processed")
    
    # Session closure tracking
    is_closed: bool = Field(default=False, description="Whether the session is permanently closed")
    closure_reason: Optional[str] = Field(default=None, description="Reason for session closure")
    closed_by: Optional[str] = Field(default=None, description="Username who closed the session")
    closed_at: Optional[datetime] = Field(default=None, description="Session closure timestamp")


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
    completed_employees: int = Field(..., ge=0, description="Number of employees processed (all statuses)")
    ready_for_export: int = Field(..., ge=0, description="Number of employees ready for export (VALID + RESOLVED)")
    valid_employees: int = Field(..., ge=0, description="Number of valid employees")
    processing_employees: int = Field(..., ge=0, description="Number of employees currently processing")
    issues_employees: int = Field(..., ge=0, description="Number of employees with issues")
    resolved_employees: int = Field(..., ge=0, description="Number of resolved employees")
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


# Export Tracking Schemas for Phase 3

class ExportTrackingRequest(BaseModel):
    """Request model for marking records as exported"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "export_batch_id": "batch_2024_03_01_001",
                "employee_ids": ["emp_123", "emp_456", "emp_789"],
                "export_type": "pvault"
            }
        }
    )
    
    export_batch_id: str = Field(..., min_length=1, max_length=100, description="Unique batch identifier")
    employee_ids: List[str] = Field(..., min_items=1, max_items=10000, description="List of employee revision IDs")
    export_type: str = Field(..., description="Type of export (pvault/exceptions)")
    
    @field_validator('export_type')
    @classmethod
    def validate_export_type(cls, v):
        if v not in ['pvault', 'exceptions']:
            raise ValueError('export_type must be pvault or exceptions')
        return v


class ExportDeltaResponse(BaseModel):
    """Response model for delta export data"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "export_type": "pvault",
                "delta_only": True,
                "employee_count": 25,
                "new_employees": 20,
                "changed_employees": 5,
                "already_exported": 75,
                "export_batch_id": "batch_2024_03_01_002",
                "generated_at": "2024-03-01T10:00:00Z"
            }
        }
    )
    
    session_id: str = Field(..., description="UUID of the session")
    export_type: str = Field(..., description="Type of export (pvault/exceptions)")
    delta_only: bool = Field(..., description="Whether this is a delta export")
    employee_count: int = Field(..., ge=0, description="Number of employees in export")
    new_employees: int = Field(..., ge=0, description="Number of new employees")
    changed_employees: int = Field(..., ge=0, description="Number of employees with changes")
    already_exported: int = Field(..., ge=0, description="Number of previously exported employees")
    export_data: List[Dict[str, Any]] = Field(default_factory=list, description="Export data records")
    export_batch_id: str = Field(..., description="Unique batch identifier for this export")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Export generation timestamp")


class ExportRecord(BaseModel):
    """Individual export record for history"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "export_batch_id": "batch_2024_03_01_001",
                "export_type": "pvault",
                "employee_count": 100,
                "exported_by": "rcox",
                "export_timestamp": "2024-03-01T10:00:00Z",
                "file_size_bytes": 51200
            }
        }
    )
    
    export_batch_id: str = Field(..., description="Unique batch identifier")
    export_type: str = Field(..., description="Type of export (pvault/exceptions)")
    employee_count: int = Field(..., ge=0, description="Number of employees exported")
    exported_by: str = Field(..., description="Username who performed the export")
    export_timestamp: datetime = Field(..., description="When the export was completed")
    file_size_bytes: Optional[int] = Field(default=None, ge=0, description="Size of generated file in bytes")


class ExportHistoryResponse(BaseModel):
    """Response model for export history"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "total_exports": 3,
                "last_export": "2024-03-01T10:00:00Z",
                "export_summary": {
                    "total_employees_exported": 150,
                    "unique_employees_exported": 100,
                    "duplicate_exports_prevented": 50
                }
            }
        }
    )
    
    session_id: str = Field(..., description="UUID of the session")
    export_history: List[ExportRecord] = Field(..., description="List of export records")
    total_exports: int = Field(..., ge=0, description="Total number of exports performed")
    last_export: Optional[datetime] = Field(default=None, description="Timestamp of most recent export")
    export_summary: Dict[str, Any] = Field(default_factory=dict, description="Summary statistics")


class ExportStatusResponse(BaseModel):
    """Response model for export status and statistics"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "total_employees": 100,
                "exported_employees": 75,
                "pending_export": 25,
                "has_export_history": True,
                "last_export_date": "2024-03-01T10:00:00Z",
                "export_readiness": "ready"
            }
        }
    )
    
    session_id: str = Field(..., description="UUID of the session")
    total_employees: int = Field(..., ge=0, description="Total employees in session")
    exported_employees: int = Field(..., ge=0, description="Number of employees already exported")
    pending_export: int = Field(..., ge=0, description="Number of employees pending export")
    has_export_history: bool = Field(..., description="Whether session has any export history")
    last_export_date: Optional[datetime] = Field(default=None, description="Date of last export")
    export_readiness: str = Field(..., description="Export readiness status (ready/not_ready/completed)")
    
    @field_validator('export_readiness')
    @classmethod
    def validate_export_readiness(cls, v):
        if v not in ['ready', 'not_ready', 'completed']:
            raise ValueError('export_readiness must be ready, not_ready, or completed')
        return v


class ExportPerformanceMetrics(BaseModel):
    """Performance metrics for export operations"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_exports": 150,
                "success_rate": 0.98,
                "avg_duration_seconds": 12.5,
                "largest_export_size": 5000,
                "system_health": "healthy"
            }
        }
    )
    
    total_exports: int = Field(..., ge=0, description="Total number of exports performed")
    success_rate: float = Field(..., ge=0.0, le=1.0, description="Export success rate (0.0-1.0)")
    failure_rate: float = Field(..., ge=0.0, le=1.0, description="Export failure rate (0.0-1.0)")
    avg_duration_seconds: float = Field(..., ge=0.0, description="Average export duration in seconds")
    largest_export_size: int = Field(..., ge=0, description="Largest export size (number of employees)")
    system_health: str = Field(..., description="Overall system health status")
    recent_performance: Dict[str, Any] = Field(default_factory=dict, description="Recent performance statistics")
    
    @field_validator('system_health')
    @classmethod
    def validate_system_health(cls, v):
        if v not in ['healthy', 'degraded', 'unhealthy', 'unknown']:
            raise ValueError('system_health must be healthy, degraded, unhealthy, or unknown')
        return v


# Phase 4 Schemas
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


class UserInfo(BaseModel):
    """User information from authentication"""
    username: str
    is_admin: bool = False
    display_name: Optional[str] = None
    email: Optional[str] = None