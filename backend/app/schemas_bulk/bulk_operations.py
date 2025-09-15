"""
Pydantic schemas for bulk operations
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class BulkActionType(str, Enum):
    """Enumeration of bulk action types"""
    DELETE = "delete"
    CLOSE = "close"
    ARCHIVE = "archive"
    EXPORT = "export"

class ExportFormat(str, Enum):
    """Enumeration of export formats"""
    CSV = "csv"
    JSON = "json"
    EXCEL = "excel"

class SessionStatus(str, Enum):
    """Enumeration of session statuses"""
    IDLE = "IDLE"
    PROCESSING = "PROCESSING"
    EXTRACTING = "EXTRACTING"
    ANALYZING = "ANALYZING"
    UPLOADING = "UPLOADING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"

# Request Schemas

class BulkActionRequest(BaseModel):
    """Base request for bulk actions"""
    session_ids: List[str] = Field(..., min_length=1, max_length=1000)
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @field_validator('session_ids')
    @classmethod
    def validate_session_ids(cls, v):
        """Ensure session IDs are unique"""
        if len(v) != len(set(v)):
            raise ValueError("Duplicate session IDs not allowed")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_ids": ["session-123", "session-456", "session-789"],
                "options": {}
            }
        }
    )

class BulkDeleteRequest(BulkActionRequest):
    """Request for bulk delete operation"""
    soft_delete: bool = Field(True, description="Perform soft delete instead of hard delete")
    cascade_exports: bool = Field(False, description="Also delete associated exports")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_ids": ["session-123", "session-456"],
                "soft_delete": True,
                "cascade_exports": False,
                "options": {"reason": "Cleanup old sessions"}
            }
        }
    )

class BulkExportRequest(BulkActionRequest):
    """Request for bulk export operation"""
    format: ExportFormat = Field(ExportFormat.CSV, description="Export format")
    include_details: bool = Field(False, description="Include detailed information")
    include_results: bool = Field(False, description="Include session results")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_ids": ["session-123", "session-456"],
                "format": "csv",
                "include_details": True,
                "include_results": False,
                "options": {"compress": True}
            }
        }
    )

class BulkCloseRequest(BulkActionRequest):
    """Request for bulk closing sessions"""
    reason: Optional[str] = Field(None, description="Reason for closing")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_ids": ["session-123", "session-456"],
                "reason": "Processing completed"
            }
        }
    )

class BulkArchiveRequest(BulkActionRequest):
    """Request for bulk archiving sessions"""
    compress: bool = Field(default=False, description="Whether to compress archived data")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_ids": ["session-123", "session-456"],
                "compress": True
            }
        }
    )

class BulkValidationRequest(BaseModel):
    """Request for validating bulk action"""
    session_ids: List[str] = Field(..., min_length=1, max_length=1000)
    action: BulkActionType = Field(..., description="Action to validate")
    
    @field_validator('session_ids')
    @classmethod
    def validate_session_ids(cls, v):
        """Ensure session IDs are unique"""
        if len(v) != len(set(v)):
            raise ValueError("Duplicate session IDs not allowed")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_ids": ["session-123", "session-456"],
                "action": "delete"
            }
        }
    )

# Response Schemas

class SessionValidationInfo(BaseModel):
    """Information about a session's validation status"""
    session_id: str
    session_name: str
    status: str
    reason: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra= {
            "example": {
                "session_id": "session-123",
                "session_name": "Processing Session 2024-01-10",
                "status": "COMPLETED",
                "reason": None
            }
        }
    )

class ValidationResult(BaseModel):
    """Result of bulk validation"""
    eligible: List[SessionValidationInfo] = Field(default_factory=list)
    ineligible: List[SessionValidationInfo] = Field(default_factory=list)
    not_found: List[str] = Field(default_factory=list)
    eligible_count: int = 0
    ineligible_count: int = 0
    not_found_count: int = 0
    
    model_config = ConfigDict(
        json_schema_extra= {
            "example": {
                "eligible": [
                    {
                        "session_id": "session-123",
                        "session_name": "Session 1",
                        "status": "COMPLETED"
                    }
                ],
                "ineligible": [
                    {
                        "session_id": "session-456",
                        "session_name": "Session 2",
                        "status": "PROCESSING",
                        "reason": "Session is currently processing"
                    }
                ],
                "not_found": ["session-789"],
                "eligible_count": 1,
                "ineligible_count": 1,
                "not_found_count": 1
            }
        }
    )

class BulkOperationResponse(BaseModel):
    """Response for bulk operations"""
    success: bool
    operation_id: str
    action: str
    total_requested: int
    processed_count: int
    failed_count: int
    processed_items: Optional[List[str]] = Field(default_factory=list)
    failed_items: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    message: str
    download_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(
        json_schema_extra= {
            "example": {
                "success": True,
                "operation_id": "op-abc123",
                "action": "delete",
                "total_requested": 3,
                "processed_count": 2,
                "failed_count": 1,
                "processed_items": ["session-123", "session-456"],
                "failed_items": [
                    {
                        "session_id": "session-789",
                        "reason": "Session is currently processing"
                    }
                ],
                "message": "Successfully deleted 2 sessions",
                "download_url": None,
                "metadata": None
            }
        }
    )

class SessionBulkInfo(BaseModel):
    """Bulk information about a session"""
    session_id: str
    session_name: str
    status: SessionStatus
    created_at: Optional[datetime]
    file_count: int = 0
    transaction_count: int = 0
    has_results: bool = False
    can_delete: bool = False
    can_close: bool = False
    can_archive: bool = False
    can_export: bool = False
    
    model_config = ConfigDict(
        json_schema_extra= {
            "example": {
                "session_id": "session-123",
                "session_name": "Processing Session 2024-01-10",
                "status": "COMPLETED",
                "created_at": "2024-01-10T10:00:00Z",
                "file_count": 5,
                "transaction_count": 150,
                "has_results": True,
                "can_delete": True,
                "can_close": False,
                "can_archive": False,
                "can_export": True
            }
        }
    )

class BulkOperationStatus(BaseModel):
    """Status of a bulk operation"""
    operation_id: str
    action: BulkActionType
    status: str
    total_count: int
    success_count: int
    failed_count: int
    progress: float = Field(0.0, ge=0.0, le=100.0)
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra= {
            "example": {
                "operation_id": "op-abc123",
                "action": "delete",
                "status": "IN_PROGRESS",
                "total_count": 100,
                "success_count": 45,
                "failed_count": 0,
                "progress": 45.0,
                "started_at": "2024-01-10T10:00:00Z",
                "completed_at": None,
                "error_message": None
            }
        }
    )

class BulkOperationProgress(BaseModel):
    """Progress update for bulk operation"""
    operation_id: str
    processed_count: int
    total_count: int
    progress: float = Field(0.0, ge=0.0, le=100.0)
    current_item: Optional[str] = None
    timestamp: datetime
    
    model_config = ConfigDict(
        json_schema_extra= {
            "example": {
                "operation_id": "op-abc123",
                "processed_count": 45,
                "total_count": 100,
                "progress": 45.0,
                "current_item": "session-456",
                "timestamp": "2024-01-10T10:01:30Z"
            }
        }
    )

class BulkSelectionStats(BaseModel):
    """Statistics for a bulk selection"""
    total_sessions: int
    found_sessions: int
    eligible_count: int
    ineligible_count: int
    not_found_count: int
    total_files: int
    total_transactions: int
    total_exceptions: int
    status_breakdown: Dict[str, int]
    estimated_duration: int  # seconds
    
    model_config = ConfigDict(
        json_schema_extra= {
            "example": {
                "total_sessions": 10,
                "found_sessions": 9,
                "eligible_count": 7,
                "ineligible_count": 2,
                "not_found_count": 1,
                "total_files": 45,
                "total_transactions": 1250,
                "total_exceptions": 23,
                "status_breakdown": {
                    "COMPLETED": 5,
                    "FAILED": 2,
                    "PROCESSING": 2
                },
                "estimated_duration": 5
            }
        }
    )

# WebSocket Message Schemas

class WebSocketMessage(BaseModel):
    """Base WebSocket message"""
    type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class BulkOperationStartedMessage(WebSocketMessage):
    """Message when bulk operation starts"""
    type: str = "bulk_operation_started"
    operation_id: str
    action: BulkActionType
    total_count: int
    progress: float = 0.0

class BulkOperationProgressMessage(WebSocketMessage):
    """Message for bulk operation progress"""
    type: str = "bulk_operation_progress"
    operation_id: str
    processed_count: int
    total_count: int
    progress: float
    current_item: Optional[str] = None

class BulkOperationCompletedMessage(WebSocketMessage):
    """Message when bulk operation completes"""
    type: str = "bulk_operation_completed"
    operation_id: str
    action: BulkActionType
    result: Dict[str, Any]

class BulkOperationFailedMessage(WebSocketMessage):
    """Message when bulk operation fails"""
    type: str = "bulk_operation_failed"
    operation_id: str
    action: BulkActionType
    error: str
    partial_result: Optional[Dict[str, Any]] = None

class SessionsUpdatedMessage(WebSocketMessage):
    """Message when sessions are updated"""
    type: str = "sessions_updated"
    session_ids: List[str]
    update_type: str
    details: Optional[Dict[str, Any]] = None


class BulkOperationError(BaseModel):
    """Error details for bulk operations"""
    session_id: str
    error_code: str
    error_message: str
    details: Optional[Dict[str, Any]] = None


class WebSocketMessageType(str, Enum):
    """WebSocket message types"""
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    OPERATION_STARTED = "bulk_operation_started"
    OPERATION_PROGRESS = "bulk_operation_progress"
    OPERATION_COMPLETED = "bulk_operation_completed"
    OPERATION_FAILED = "bulk_operation_failed"
    SESSIONS_UPDATED = "sessions_updated"


class OperationSubscription(BaseModel):
    """WebSocket subscription to operation updates"""
    operation_id: str
    action: BulkActionType
    subscribe: bool = True