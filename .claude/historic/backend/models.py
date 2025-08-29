"""
SQLAlchemy models for Credit Card Processor
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
import json

from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Boolean, DECIMAL, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator, VARCHAR

from config import ProcessingStatus, EmployeeStatus

Base = declarative_base()

class JSONType(TypeDecorator):
    """Custom type for storing JSON data in SQLite"""
    impl = VARCHAR
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None

class ProcessingSession(Base):
    """Main table for tracking processing sessions"""
    __tablename__ = 'processing_sessions'

    session_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), nullable=False)
    session_name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    status = Column(String(20), default=ProcessingStatus.PENDING)
    
    # File information
    car_file_path = Column(String(500))
    receipt_file_path = Column(String(500))
    car_file_checksum = Column(String(64))
    receipt_file_checksum = Column(String(64))
    car_file_size = Column(Integer)
    receipt_file_size = Column(Integer)
    
    # Processing stats
    total_employees = Column(Integer, default=0)
    completed_employees = Column(Integer, default=0)
    processing_progress = Column(Integer, default=0)  # Percentage 0-100
    
    # Revision tracking
    parent_session_id = Column(String(36), ForeignKey('processing_sessions.session_id'))
    revision_number = Column(Integer, default=1)
    
    # Processing metadata
    processing_started_at = Column(DateTime)
    processing_completed_at = Column(DateTime)
    error_message = Column(Text)
    processing_config = Column(JSONType)  # Store processing parameters
    
    # Relationships
    employee_revisions = relationship("EmployeeRevision", back_populates="session", cascade="all, delete-orphan")
    processing_logs = relationship("ProcessingLog", back_populates="session", cascade="all, delete-orphan")
    parent_session = relationship("ProcessingSession", remote_side=[session_id])
    child_sessions = relationship("ProcessingSession", remote_side=[parent_session_id])

    @validates('status')
    def validate_status(self, key, status):
        valid_statuses = [ProcessingStatus.PENDING, ProcessingStatus.PROCESSING, 
                         ProcessingStatus.COMPLETED, ProcessingStatus.FAILED, 
                         ProcessingStatus.CANCELLED]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}")
        return status

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'session_id': self.session_id,
            'username': self.username,
            'session_name': self.session_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'status': self.status,
            'car_file_path': self.car_file_path,
            'receipt_file_path': self.receipt_file_path,
            'total_employees': self.total_employees,
            'completed_employees': self.completed_employees,
            'processing_progress': self.processing_progress,
            'revision_number': self.revision_number,
            'parent_session_id': self.parent_session_id,
            'processing_started_at': self.processing_started_at.isoformat() if self.processing_started_at else None,
            'processing_completed_at': self.processing_completed_at.isoformat() if self.processing_completed_at else None,
            'error_message': self.error_message
        }

    def __repr__(self):
        return f"<ProcessingSession(id={self.session_id}, name={self.session_name}, status={self.status})>"

class EmployeeRevision(Base):
    """Table for storing employee expense data with revision tracking"""
    __tablename__ = 'employee_revisions'

    revision_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey('processing_sessions.session_id'), nullable=False)
    
    # Employee information
    employee_name = Column(String(200), nullable=False)
    employee_id = Column(String(50))
    card_number = Column(String(20))
    
    # Financial data
    car_total = Column(DECIMAL(15, 2), default=Decimal('0.00'))
    receipt_total = Column(DECIMAL(15, 2), default=Decimal('0.00'))
    difference = Column(DECIMAL(15, 2), default=Decimal('0.00'))
    
    # Status and validation
    status = Column(String(20), default=EmployeeStatus.UNFINISHED)
    validation_flags = Column(JSONType)  # Store validation results
    issues_count = Column(Integer, default=0)
    confidence_score = Column(DECIMAL(5, 4))  # AI confidence 0-1
    
    # Processing metadata
    created_at = Column(DateTime, default=func.now())
    processed_at = Column(DateTime)
    ai_extracted_data = Column(JSONType)  # Raw AI extraction results
    manual_overrides = Column(JSONType)  # User manual corrections
    
    # Change tracking
    previous_revision_id = Column(String(36), ForeignKey('employee_revisions.revision_id'))
    change_summary = Column(JSONType)  # Summary of changes from previous revision
    
    # Relationships
    session = relationship("ProcessingSession", back_populates="employee_revisions")
    previous_revision = relationship("EmployeeRevision", remote_side=[revision_id])

    @validates('status')
    def validate_status(self, key, status):
        valid_statuses = [EmployeeStatus.UNFINISHED, EmployeeStatus.FINISHED, EmployeeStatus.ISSUES]
        if status not in valid_statuses:
            raise ValueError(f"Invalid employee status: {status}")
        return status

    @property
    def has_issues(self) -> bool:
        """Check if employee has validation issues"""
        return self.issues_count > 0 or self.status == EmployeeStatus.ISSUES

    @property
    def difference_amount(self) -> Decimal:
        """Calculate difference between CAR and receipt totals"""
        if self.car_total and self.receipt_total:
            return abs(self.car_total - self.receipt_total)
        return Decimal('0.00')

    def calculate_difference(self):
        """Update the difference field"""
        self.difference = self.difference_amount

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'revision_id': self.revision_id,
            'session_id': self.session_id,
            'employee_name': self.employee_name,
            'employee_id': self.employee_id,
            'card_number': self.card_number,
            'car_total': float(self.car_total) if self.car_total else 0.0,
            'receipt_total': float(self.receipt_total) if self.receipt_total else 0.0,
            'difference': float(self.difference) if self.difference else 0.0,
            'status': self.status,
            'validation_flags': self.validation_flags or {},
            'issues_count': self.issues_count,
            'confidence_score': float(self.confidence_score) if self.confidence_score else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'has_issues': self.has_issues
        }

    def __repr__(self):
        return f"<EmployeeRevision(id={self.revision_id}, name={self.employee_name}, status={self.status})>"

class ProcessingLog(Base):
    """Table for storing processing logs and audit trail"""
    __tablename__ = 'processing_logs'

    log_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey('processing_sessions.session_id'), nullable=False)
    timestamp = Column(DateTime, default=func.now())
    level = Column(String(10), nullable=False)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    message = Column(Text, nullable=False)
    details = Column(JSONType)  # Additional structured data
    component = Column(String(50))  # Which component logged this
    employee_name = Column(String(200))  # If log relates to specific employee
    
    # Relationships
    session = relationship("ProcessingSession", back_populates="processing_logs")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'log_id': self.log_id,
            'session_id': self.session_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'level': self.level,
            'message': self.message,
            'details': self.details or {},
            'component': self.component,
            'employee_name': self.employee_name
        }

    def __repr__(self):
        return f"<ProcessingLog(id={self.log_id}, level={self.level}, message={self.message[:50]})>"

class SystemHealth(Base):
    """Table for storing system health metrics"""
    __tablename__ = 'system_health'

    health_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=func.now())
    component = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)  # healthy, degraded, unhealthy
    metrics = Column(JSONType)  # Component-specific metrics
    error_message = Column(Text)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'health_id': self.health_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'component': self.component,
            'status': self.status,
            'metrics': self.metrics or {},
            'error_message': self.error_message
        }

# Create indexes for better performance
Index('idx_sessions_username', ProcessingSession.username)
Index('idx_sessions_created', ProcessingSession.created_at)
Index('idx_sessions_status', ProcessingSession.status)
Index('idx_revisions_session', EmployeeRevision.session_id)
Index('idx_revisions_name', EmployeeRevision.employee_name)
Index('idx_revisions_status', EmployeeRevision.status)
Index('idx_logs_session', ProcessingLog.session_id)
Index('idx_logs_timestamp', ProcessingLog.timestamp)
Index('idx_logs_level', ProcessingLog.level)
Index('idx_health_component', SystemHealth.component)
Index('idx_health_timestamp', SystemHealth.timestamp)