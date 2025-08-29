from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SessionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ProcessingActivityType(str, Enum):
    PROCESSING = "processing"
    VALIDATION = "validation"
    ERROR = "error"
    INFO = "info"

class ResolutionStatus(str, Enum):
    RESOLVED = "resolved"
    PENDING = "pending"
    ESCALATED = "escalated"

# Request schemas
class SessionCreateRequest(BaseModel):
    session_name: str = Field(..., min_length=1, max_length=200)
    skip_unchanged_employees: bool = True
    amount_mismatch_threshold: float = Field(5.0, ge=0, le=100)
    auto_resolve_minor_issues: bool = True

class IssueResolutionRequest(BaseModel):
    resolution_status: ResolutionStatus
    resolution_notes: Optional[str] = None

# Response schemas
class FileUploadResponse(BaseModel):
    file_id: str
    file_type: str
    original_filename: str
    file_size_bytes: int
    checksum_sha256: str
    upload_status: str

class ProcessingActivityResponse(BaseModel):
    id: str
    created_at: datetime
    activity_type: str
    activity_message: str
    employee_name: Optional[str]
    duration_seconds: Optional[float]

class EmployeeRevisionResponse(BaseModel):
    id: str
    employee_id: Optional[str]
    employee_name: Optional[str]
    car_total: Optional[int]  # Cents
    receipt_total: Optional[int]  # Cents
    processing_status: str
    has_missing_receipt: bool
    has_amount_mismatch: bool
    has_missing_employee_id: bool
    has_custom_issue: bool
    validation_notes: Optional[str]
    resolution_status: Optional[str]
    resolution_notes: Optional[str]
    is_changed_from_previous: bool

class SessionStatusResponse(BaseModel):
    status: SessionStatus
    current_employee: int
    total_employees: int
    percent_complete: float
    completed_employees: int
    processing_employees: int
    issues_employees: int
    pending_employees: int
    estimated_time_remaining: Optional[int]  # seconds
    recent_activities: List[ProcessingActivityResponse]

class SessionResponse(BaseModel):
    id: str
    created_at: datetime
    session_name: str
    created_by: str
    status: SessionStatus
    is_delta_session: bool
    based_on_session_id: Optional[str]
    total_employees: int
    completed_employees: int
    file_uploads: List[FileUploadResponse]

class ResultsResponse(BaseModel):
    session: SessionResponse
    employees: List[EmployeeRevisionResponse]
    summary: Dict[str, Any]

class DeltaDetectionResponse(BaseModel):
    has_matching_files: bool
    previous_session_id: Optional[str]
    previous_session_name: Optional[str]
    matching_files: List[str]  # ["car", "receipt"]
    recommendation: str
    message: str