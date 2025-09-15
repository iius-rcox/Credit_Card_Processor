"""
SQLAlchemy model for Bulk Operations
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Float, JSON
from sqlalchemy.sql import func
from datetime import datetime

from ..database import Base

class BulkOperation(Base):
    """Model for tracking bulk operations"""
    
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
    progress = Column(Float, default=0.0)  # 0.0 to 100.0
    current_item = Column(String(100), nullable=True)  # Currently processing item
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    estimated_completion = Column(DateTime(timezone=True), nullable=True)
    
    # User tracking
    user_id = Column(String(50), nullable=True)
    user_email = Column(String(255), nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Results
    result_summary = Column(JSON, nullable=True)  # Summary of operation results
    processed_items = Column(JSON, nullable=True)  # List of successfully processed items
    failed_items = Column(JSON, nullable=True)  # List of failed items with reasons
    
    # Export specific
    export_file_path = Column(String(500), nullable=True)
    export_format = Column(String(20), nullable=True)
    export_size_bytes = Column(Integer, nullable=True)
    
    # Metadata
    options = Column(JSON, nullable=True)  # Options used for the operation
    metadata = Column(JSON, nullable=True)  # Additional metadata
    
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
            'progress': self.progress,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'user_id': self.user_id,
            'error_message': self.error_message,
            'result_summary': self.result_summary
        }
    
    def update_progress(self, processed: int):
        """Update operation progress"""
        if self.total_count > 0:
            self.progress = (processed / self.total_count) * 100.0
            
    def mark_completed(self, success_count: int, failed_count: int):
        """Mark operation as completed"""
        self.status = 'COMPLETED'
        self.success_count = success_count
        self.failed_count = failed_count
        self.progress = 100.0
        self.completed_at = datetime.utcnow()
        
    def mark_failed(self, error_message: str, error_details: dict = None):
        """Mark operation as failed"""
        self.status = 'FAILED'
        self.error_message = error_message
        self.error_details = error_details
        self.completed_at = datetime.utcnow()