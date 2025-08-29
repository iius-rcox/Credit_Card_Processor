from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid
from datetime import datetime

class ProcessingSession(Base):
    """Processing sessions table"""
    __tablename__ = "processing_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Session metadata
    session_name = Column(String, nullable=False)
    created_by = Column(String, nullable=False)  # Windows username
    status = Column(String, default="pending")  # pending, processing, completed, failed, cancelled
    
    # Processing configuration
    skip_unchanged_employees = Column(Boolean, default=True)
    amount_mismatch_threshold = Column(Float, default=5.0)
    auto_resolve_minor_issues = Column(Boolean, default=True)
    
    # Delta session information
    is_delta_session = Column(Boolean, default=False)
    based_on_session_id = Column(String, ForeignKey("processing_sessions.id"), nullable=True)
    
    # Progress tracking
    total_employees = Column(Integer, default=0)
    completed_employees = Column(Integer, default=0)
    processing_employees = Column(Integer, default=0)
    issues_employees = Column(Integer, default=0)
    pending_employees = Column(Integer, default=0)
    
    # Relationships
    file_uploads = relationship("FileUpload", back_populates="session")
    employee_revisions = relationship("EmployeeRevision", back_populates="session")
    activities = relationship("ProcessingActivity", back_populates="session")


class EmployeeRevision(Base):
    """Employee revision tracking - never update, only create new revisions"""
    __tablename__ = "employee_revisions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Session and revision tracking
    session_id = Column(String, ForeignKey("processing_sessions.id"), nullable=False)
    revision_number = Column(Integer, nullable=False, default=1)
    
    # Employee identification
    employee_id = Column(String, nullable=True)  # From CAR document
    employee_name = Column(String, nullable=True)
    
    # Financial data (stored as INTEGER cents to avoid floating point issues)
    car_total = Column(Integer, nullable=True)  # Total from CAR document in cents
    receipt_total = Column(Integer, nullable=True)  # Total from receipt in cents
    
    # Processing status
    processing_status = Column(String, default="pending")  # pending, processing, completed, issues, resolved
    
    # Document extraction data (stored as JSON TEXT)
    car_document_data = Column(Text, nullable=True)  # json.dumps of extracted data
    receipt_document_data = Column(Text, nullable=True)  # json.dumps of extracted data
    
    # Validation flags
    has_missing_receipt = Column(Boolean, default=False)
    has_amount_mismatch = Column(Boolean, default=False)
    has_missing_employee_id = Column(Boolean, default=False)
    has_custom_issue = Column(Boolean, default=False)
    
    # Issue details
    validation_notes = Column(Text, nullable=True)
    resolution_status = Column(String, nullable=True)  # resolved, pending, escalated
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Delta tracking
    is_changed_from_previous = Column(Boolean, default=True)
    previous_revision_id = Column(String, nullable=True)
    
    # Relationships
    session = relationship("ProcessingSession", back_populates="employee_revisions")


class ProcessingActivity(Base):
    """Activity logging for processing transparency"""
    __tablename__ = "processing_activities"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Session reference
    session_id = Column(String, ForeignKey("processing_sessions.id"), nullable=False)
    
    # Activity details
    activity_type = Column(String, nullable=False)  # processing, validation, error, info
    activity_message = Column(String, nullable=False)
    employee_name = Column(String, nullable=True)
    
    # Activity metadata
    duration_seconds = Column(Float, nullable=True)
    additional_data = Column(Text, nullable=True)  # JSON for extra context
    
    # Relationships
    session = relationship("ProcessingSession", back_populates="activities")


class FileUpload(Base):
    """File upload tracking"""
    __tablename__ = "file_uploads"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Session reference
    session_id = Column(String, ForeignKey("processing_sessions.id"), nullable=False)
    
    # File metadata
    file_type = Column(String, nullable=False)  # "car" or "receipt"
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    checksum_sha256 = Column(String, nullable=False)
    
    # Upload status
    upload_status = Column(String, default="uploaded")  # uploaded, processed, error
    
    # Relationships
    session = relationship("ProcessingSession", back_populates="file_uploads")