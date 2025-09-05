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
                return str(uuid.UUID(value))
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value


# Enums for status fields
class SessionStatus(PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


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
    
    # Processing configuration
    processing_options = Column(JSON, default=dict, nullable=False)
    
    # Relationships
    employee_revisions = relationship("EmployeeRevision", back_populates="session", cascade="all, delete-orphan")
    processing_activities = relationship("ProcessingActivity", back_populates="session", cascade="all, delete-orphan")
    file_uploads = relationship("FileUpload", back_populates="session", cascade="all, delete-orphan")
    
    # Self-referential relationship for delta processing
    delta_base_session = relationship("ProcessingSession", remote_side=[session_id])
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_session_status_created', 'status', 'created_at'),
        Index('idx_session_created_by_status', 'created_by', 'status'),
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
    
    # Relationship to session
    session = relationship("ProcessingSession", back_populates="employee_revisions")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_employee_session_status', 'session_id', 'validation_status'),
        Index('idx_employee_name_session', 'employee_name', 'session_id'),
        Index('idx_employee_id_session', 'employee_id', 'session_id'),
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