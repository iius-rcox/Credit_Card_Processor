"""SQLAlchemy models for Credit Card Processor"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional, Dict, Any

from sqlalchemy import (
    Column, String, DateTime, Text, Integer, BigInteger, Numeric,
    ForeignKey, Boolean, JSON, Index, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.sqlite import BLOB
# Removed deprecated declarative_base import - using DeclarativeBase from database.py
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR

from .database import Base


# Custom UUID type for SQLite compatibility
class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(UUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                try:
                    # Validate UUID format to prevent injection
                    validated_uuid = uuid.UUID(str(value))
                    return str(validated_uuid)
                except (ValueError, TypeError) as e:
                    raise ValueError(f"Invalid UUID format: {value}") from e
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                try:
                    # Validate UUID format from database
                    return uuid.UUID(str(value))
                except (ValueError, TypeError) as e:
                    raise ValueError(f"Invalid UUID in database: {value}") from e
            return value


# Enums for status fields
class SessionStatus(PyEnum):
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


class ValidationStatus(PyEnum):
    VALID = "valid"
    NEEDS_ATTENTION = "needs_attention"
    RESOLVED = "resolved"


class ActivityType(PyEnum):
    PROCESSING = "processing"
    VALIDATION = "validation"
    RESOLUTION = "resolution"
    EXPORT = "export"
    PROCESSING_STARTED = "processing_started"
    PROCESSING_PROGRESS = "processing_progress"
    PROCESSING_PAUSED = "processing_paused"
    PROCESSING_RESUMED = "processing_resumed"
    PROCESSING_COMPLETED = "processing_completed"
    PROCESSING_FAILED = "processing_failed"
    PROCESSING_CANCELLED = "processing_cancelled"
    DOCUMENT_SPLIT = "document_split"


class FileType(PyEnum):
    CAR = "car"
    RECEIPT = "receipt"


class UploadStatus(PyEnum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingSession(Base):
    """Main processing session table"""
    __tablename__ = "processing_sessions"
    
    # Primary key
    session_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic session info
    session_name = Column(String(255), nullable=False, index=True)
    created_by = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Status tracking
    status = Column(Enum(SessionStatus), default=SessionStatus.PENDING, nullable=False, index=True)
    
    # Session closure tracking
    is_closed = Column(Boolean, default=False, nullable=False, index=True)
    closure_reason = Column(String(500), nullable=True)
    closed_by = Column(String(100), nullable=True, index=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # File paths and checksums
    car_file_path = Column(String(500), nullable=True)
    receipt_file_path = Column(String(500), nullable=True)
    car_checksum = Column(String(64), nullable=True)  # SHA-256 hash
    receipt_checksum = Column(String(64), nullable=True)  # SHA-256 hash
    
    # Processing statistics
    total_employees = Column(Integer, default=0, nullable=False)
    processed_employees = Column(Integer, default=0, nullable=False)
    
    # Delta processing support
    delta_session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=True, index=True)
    last_receipt_upload = Column(DateTime(timezone=True), nullable=True)
    receipt_file_versions = Column(Integer, default=1, nullable=False)
    
    # Processing configuration
    processing_options = Column(JSON, default=dict, nullable=False)
    
    # Relationships
    employee_revisions = relationship("EmployeeRevision", back_populates="session", cascade="all, delete-orphan")
    processing_activities = relationship("ProcessingActivity", back_populates="session", cascade="all, delete-orphan")
    file_uploads = relationship("FileUpload", back_populates="session", cascade="all, delete-orphan")
    
    # Phase 4 relationships
    receipt_versions = relationship("ReceiptVersion", back_populates="session", cascade="all, delete-orphan")
    employee_change_log = relationship("EmployeeChangeLog", back_populates="session", cascade="all, delete-orphan")
    export_history = relationship("ExportHistory", back_populates="session", cascade="all, delete-orphan")
    processing_states = relationship("SessionProcessingState", back_populates="session", cascade="all, delete-orphan")
    notifications = relationship("UserNotification", back_populates="session", cascade="all, delete-orphan")
    
    # Self-referential relationship for delta processing
    delta_base_session = relationship("ProcessingSession", remote_side=[session_id])
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_session_status_created', 'status', 'created_at'),
        Index('idx_session_created_by_status', 'created_by', 'status'),
        # Composite index for session listing queries (user filter + status + order by created_at)
        Index('idx_session_created_by_status_created', 'created_by', 'status', 'created_at'),
        # Index for closed sessions filtering
        Index('idx_session_closed_status', 'is_closed', 'status'),
    )
    
    def __repr__(self):
        return f"<ProcessingSession(id={self.session_id}, name='{self.session_name}', status='{self.status.value}')>"


class EmployeeRevision(Base):
    """Employee revision data from documents"""
    __tablename__ = "employee_revisions"
    
    # Primary key
    revision_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to session
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=False, index=True)
    
    # Employee identification
    employee_id = Column(String(50), nullable=True, index=True)  # May be null initially
    employee_name = Column(String(255), nullable=False, index=True)
    
    # Financial amounts (using Decimal for precision)
    car_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    receipt_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    
    # Validation status and flags
    validation_status = Column(Enum(ValidationStatus), default=ValidationStatus.VALID, nullable=False, index=True)
    validation_flags = Column(JSON, default=dict, nullable=False)  # Store validation issues
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Resolution tracking
    resolved_by = Column(String(100), nullable=True, index=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Export tracking for delta processing
    exported_to_pvault = Column(Boolean, default=False, nullable=False, index=True)
    export_timestamp = Column(DateTime(timezone=True), nullable=True)
    export_batch_id = Column(String(50), nullable=True, index=True)
    receipt_version_processed = Column(Integer, default=1, nullable=False)
    
    # Change tracking for delta processing
    previous_car_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    previous_receipt_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    amount_changed = Column(Boolean, default=False, nullable=False)
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="employee_revisions")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_employee_session_status', 'session_id', 'validation_status'),
        Index('idx_employee_name_session', 'employee_name', 'session_id'),
        Index('idx_employee_id_session', 'employee_id', 'session_id'),
        # Export tracking indexes for delta processing
        Index('idx_employee_export_status', 'exported_to_pvault', 'session_id'),
        Index('idx_employee_export_batch', 'export_batch_id'),
        Index('idx_employee_receipt_version', 'receipt_version_processed', 'session_id'),
    )
    
    def __repr__(self):
        return f"<EmployeeRevision(id={self.revision_id}, name='{self.employee_name}', status='{self.validation_status.value}')>"


class ProcessingActivity(Base):
    """Activity logging for processing sessions"""
    __tablename__ = "processing_activities"
    
    # Primary key
    activity_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to session
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=False, index=True)
    
    # Activity details
    activity_type = Column(Enum(ActivityType), nullable=False, index=True)
    activity_message = Column(Text, nullable=False)
    
    # Optional employee reference
    employee_id = Column(String(50), nullable=True, index=True)
    
    # Timestamp and user
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_by = Column(String(100), nullable=False, index=True)
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="processing_activities")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_activity_session_type', 'session_id', 'activity_type'),
        Index('idx_activity_created_at', 'created_at'),
        Index('idx_activity_employee', 'employee_id', 'session_id'),
    )
    
    def __repr__(self):
        return f"<ProcessingActivity(id={self.activity_id}, type='{self.activity_type.value}', session_id={self.session_id})>"


class FileUpload(Base):
    """File upload tracking and management"""
    __tablename__ = "file_uploads"
    
    # Primary key
    upload_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to session
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=False, index=True)
    
    # File details
    file_type = Column(Enum(FileType), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    checksum = Column(String(64), nullable=False)  # SHA-256 hash
    
    # Upload status
    upload_status = Column(Enum(UploadStatus), default=UploadStatus.UPLOADED, nullable=False, index=True)
    
    # Timestamps and user
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    uploaded_by = Column(String(100), nullable=False, index=True)
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="file_uploads")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_upload_session_type', 'session_id', 'file_type'),
        Index('idx_upload_status', 'upload_status'),
        Index('idx_upload_checksum', 'checksum'),
    )
    
    def __repr__(self):
        return f"<FileUpload(id={self.upload_id}, filename='{self.original_filename}', type='{self.file_type.value}')>"


class ReceiptVersion(Base):
    """Track receipt file versions for reprocessing"""
    __tablename__ = "receipt_versions"
    
    # Primary key
    version_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to session
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=False, index=True)
    
    # Version tracking
    version_number = Column(Integer, nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    file_checksum = Column(String(64), nullable=False, index=True)
    
    # Upload metadata
    uploaded_by = Column(String(100), nullable=False, index=True)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Processing metadata
    employee_count = Column(Integer, nullable=True)
    processing_status = Column(String(50), default='pending', nullable=False, index=True)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="receipt_versions")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_receipt_version_session', 'session_id', 'version_number'),
        Index('idx_receipt_version_status', 'processing_status'),
        Index('idx_receipt_version_uploaded', 'uploaded_at'),
    )
    
    def __repr__(self):
        return f"<ReceiptVersion(id={self.version_id}, session={self.session_id}, version={self.version_number})>"


class EmployeeChangeLog(Base):
    """Track individual employee changes during reprocessing"""
    __tablename__ = "employee_change_log"
    
    # Primary key
    change_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to session
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=False, index=True)
    
    # Employee identification
    employee_id = Column(String(50), nullable=True, index=True)
    employee_name = Column(String(255), nullable=False, index=True)
    
    # Change tracking
    change_type = Column(String(50), nullable=False, index=True)  # 'new', 'amount_changed', 'removed', 'validated'
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    
    # Timestamps and metadata
    change_timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    changed_by = Column(String(100), nullable=False, index=True)
    receipt_version = Column(Integer, nullable=False, index=True)
    
    # Change details
    change_confidence = Column(Numeric(precision=3, scale=2), nullable=True)  # 0.00 to 1.00
    change_reason = Column(String(255), nullable=True)
    requires_review = Column(Boolean, default=False, nullable=False, index=True)
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="employee_change_log")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_employee_change_session', 'session_id', 'change_type'),
        Index('idx_employee_change_timestamp', 'change_timestamp'),
        Index('idx_employee_change_review', 'requires_review'),
        Index('idx_employee_change_employee', 'employee_id', 'session_id'),
    )
    
    def __repr__(self):
        return f"<EmployeeChangeLog(id={self.change_id}, employee='{self.employee_name}', type='{self.change_type}')>"


class ExportHistory(Base):
    """Track export history for audit trail and delta processing"""
    __tablename__ = "export_history"
    
    # Primary key
    export_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to session
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=False, index=True)
    
    # Export metadata
    export_type = Column(String(50), nullable=False, index=True)  # 'pvault', 'exceptions', 'delta'
    export_batch_id = Column(String(50), nullable=False, index=True)
    employee_count = Column(Integer, nullable=False)
    
    # Export details
    exported_by = Column(String(100), nullable=False, index=True)
    export_timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    file_size = Column(BigInteger, nullable=True)
    file_path = Column(String(500), nullable=True)
    
    # Delta processing
    delta_only = Column(Boolean, default=False, nullable=False, index=True)
    new_employees = Column(Integer, default=0, nullable=False)
    changed_employees = Column(Integer, default=0, nullable=False)
    previously_exported = Column(Integer, default=0, nullable=False)
    
    # Export status
    export_status = Column(String(50), default='completed', nullable=False, index=True)  # 'pending', 'completed', 'failed'
    error_message = Column(Text, nullable=True)
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="export_history")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_export_history_session', 'session_id', 'export_timestamp'),
        Index('idx_export_history_batch', 'export_batch_id'),
        Index('idx_export_history_type', 'export_type', 'export_timestamp'),
        Index('idx_export_history_delta', 'delta_only', 'export_timestamp'),
    )
    
    def __repr__(self):
        return f"<ExportHistory(id={self.export_id}, session={self.session_id}, type='{self.export_type}')>"


class SessionProcessingState(Base):
    """Track session processing states for state management"""
    __tablename__ = "session_processing_states"
    
    # Primary key
    state_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to session
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=False, index=True)
    
    # State tracking
    state_type = Column(String(50), nullable=False, index=True)  # 'initial', 'reprocessed', 'exported'
    state_data = Column(JSON, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_by = Column(String(100), nullable=False, index=True)
    
    # State metadata
    state_version = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="processing_states")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_session_state_type', 'session_id', 'state_type'),
        Index('idx_session_state_active', 'is_active', 'created_at'),
    )
    
    def __repr__(self):
        return f"<SessionProcessingState(id={self.state_id}, session={self.session_id}, type='{self.state_type}')>"


class UserNotification(Base):
    """User notifications for system events"""
    __tablename__ = "user_notifications"
    
    # Primary key
    notification_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # User and session references
    user_id = Column(String(100), nullable=False, index=True)
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=True, index=True)
    
    # Notification details
    notification_type = Column(String(50), nullable=False, index=True)  # 'reprocessing_complete', 'export_ready', 'error'
    message = Column(Text, nullable=False)
    title = Column(String(255), nullable=True)
    
    # Status tracking
    read_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Notification metadata
    priority = Column(String(20), default='normal', nullable=False, index=True)  # 'low', 'normal', 'high', 'urgent'
    action_required = Column(Boolean, default=False, nullable=False, index=True)
    action_url = Column(String(500), nullable=True)
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="notifications")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_notification_user', 'user_id', 'read_at'),
        Index('idx_notification_type', 'notification_type', 'created_at'),
        Index('idx_notification_priority', 'priority', 'created_at'),
        Index('idx_notification_action', 'action_required', 'created_at'),
    )
    
    def __repr__(self):
        return f"<UserNotification(id={self.notification_id}, user='{self.user_id}', type='{self.notification_type}')>"


# Add ProcessingStatus as alias for SessionStatus for compatibility
ProcessingStatus = SessionStatus


class SessionResult(Base):
    """Results from processing sessions"""
    __tablename__ = "session_results"
    
    # Primary key
    result_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    
    # Session reference
    session_id = Column(GUID(), ForeignKey('processing_sessions.session_id'), nullable=False, index=True)
    
    # Result details
    result_type = Column(String(50), nullable=False)  # 'final', 'intermediate', 'validation'
    result_data = Column(JSON, nullable=False)
    
    # Statistics
    total_processed = Column(Integer, default=0)
    successful_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    validation_issues = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationship
    session = relationship("ProcessingSession", backref="results")
    
    def __repr__(self):
        return f"<SessionResult(id={self.result_id}, session={self.session_id}, type='{self.result_type}')>"


class BulkOperation(Base):
    """Track bulk operations on sessions"""
    __tablename__ = "bulk_operations"
    
    # Primary key
    operation_id = Column(String(50), primary_key=True, index=True)
    
    # Operation details
    action = Column(String(50), nullable=False)  # delete, close, archive, export
    status = Column(String(50), nullable=False, default='PENDING')  # PENDING, IN_PROGRESS, COMPLETED, FAILED
    
    # Counts
    total_count = Column(Integer, nullable=False)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    # Progress tracking
    progress = Column(Numeric(5, 2), default=0.0)  # 0.0 to 100.0
    current_item = Column(String(100), nullable=True)
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    estimated_completion = Column(DateTime(timezone=True), nullable=True)
    
    # User tracking
    user_id = Column(String(50), nullable=True)
    user_email = Column(String(255), nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Results
    result_summary = Column(JSON, nullable=True)
    processed_items = Column(JSON, nullable=True)
    failed_items = Column(JSON, nullable=True)
    
    # Export specific
    export_file_path = Column(String(500), nullable=True)
    export_format = Column(String(20), nullable=True)
    export_size_bytes = Column(BigInteger, nullable=True)
    
    # Metadata
    options = Column(JSON, nullable=True)
    operation_metadata = Column(JSON, nullable=True)
    
    # Soft delete
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<BulkOperation(id={self.operation_id}, action={self.action}, status={self.status})>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'operation_id': self.operation_id,
            'action': self.action,
            'status': self.status,
            'total_count': self.total_count,
            'success_count': self.success_count,
            'failed_count': self.failed_count,
            'progress': float(self.progress) if self.progress else 0.0,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'user_id': self.user_id,
            'error_message': self.error_message,
            'result_summary': self.result_summary
        }
    
    def update_progress(self, processed: int):
        """Update operation progress"""
        if self.total_count > 0:
            self.progress = Decimal(str((processed / self.total_count) * 100.0))
            
    def mark_completed(self, success_count: int, failed_count: int):
        """Mark operation as completed"""
        self.status = 'COMPLETED'
        self.success_count = success_count
        self.failed_count = failed_count
        self.progress = Decimal('100.0')
        self.completed_at = datetime.now(timezone.utc)
        
    def mark_failed(self, error_message: str, error_details: dict = None):
        """Mark operation as failed"""
        self.status = 'FAILED'
        self.error_message = error_message
        self.error_details = error_details
        self.completed_at = datetime.now(timezone.utc)


class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"
    
    # Primary key
    user_id = Column(String(100), primary_key=True, index=True)
    
    # User details
    username = Column(String(100), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    full_name = Column(String(255), nullable=True)
    
    # Authorization
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # User preferences
    settings = Column(JSON, nullable=True)
    preferences = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<User(id={self.user_id}, username='{self.username}', admin={self.is_admin})>"