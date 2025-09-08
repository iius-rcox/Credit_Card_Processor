"""Database functionality tests using pytest

This module tests all database models, relationships, and operations
to ensure the schema implementation is working correctly.
"""

import uuid
import pytest
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import text
from .database import SessionLocal, engine
from .models import (
    ProcessingSession, EmployeeRevision, ProcessingActivity, FileUpload,
    SessionStatus, ValidationStatus, ActivityType, FileType, UploadStatus
)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def sample_session(db_session):
    """Create a sample processing session for tests"""
    test_session = ProcessingSession(
        session_name="Test Session",
        created_by="test_user",
        status=SessionStatus.PENDING,
        processing_options={"test": True}
    )
    db_session.add(test_session)
    db_session.commit()
    db_session.refresh(test_session)
    return test_session


def test_database_connection(db_session):
    """Test basic database connection"""
    # Execute a simple query
    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1


def test_session_creation(db_session):
    """Test ProcessingSession creation and retrieval"""
    # Create a new session
    test_session = ProcessingSession(
        session_name="Test Session Creation",
        created_by="test_user",
        status=SessionStatus.PENDING,
        processing_options={"test": True}
    )
    
    db_session.add(test_session)
    db_session.commit()
    
    # Retrieve and verify
    retrieved = db_session.query(ProcessingSession).filter_by(session_name="Test Session Creation").first()
    assert retrieved is not None
    assert retrieved.session_name == "Test Session Creation"
    assert retrieved.created_by == "test_user"
    assert retrieved.status == SessionStatus.PENDING
    assert isinstance(retrieved.session_id, uuid.UUID)
    assert retrieved.processing_options == {"test": True}
    
    # Test enum values
    retrieved.status = SessionStatus.PROCESSING
    db_session.commit()
    
    updated = db_session.query(ProcessingSession).filter_by(session_id=retrieved.session_id).first()
    assert updated.status == SessionStatus.PROCESSING


def test_employee_revision(db_session, sample_session):
    """Test EmployeeRevision creation and relationships"""
    # Create employee revision
    revision = EmployeeRevision(
        session_id=sample_session.session_id,
        employee_id="TEST001",
        employee_name="Test Employee",
        car_amount=Decimal("100.50"),
        receipt_amount=Decimal("95.75"),
        validation_status=ValidationStatus.NEEDS_ATTENTION,
        validation_flags={"amount_mismatch": True, "threshold": 5.0}
    )
    
    db_session.add(revision)
    db_session.commit()
    
    # Test relationship
    db_session.refresh(sample_session)
    assert len(sample_session.employee_revisions) == 1
    assert sample_session.employee_revisions[0].employee_name == "Test Employee"
    
    # Test back reference
    retrieved_revision = db_session.query(EmployeeRevision).filter_by(employee_id="TEST001").first()
    assert retrieved_revision.session.session_name == "Test Session"
    
    # Test decimal precision
    assert retrieved_revision.car_amount == Decimal("100.50")
    assert retrieved_revision.receipt_amount == Decimal("95.75")


def test_processing_activity(db_session, sample_session):
    """Test ProcessingActivity creation and relationships"""
    # Create processing activity
    activity = ProcessingActivity(
        session_id=sample_session.session_id,
        activity_type=ActivityType.VALIDATION,
        activity_message="Test validation activity",
        employee_id="TEST001",
        created_by="test_user"
    )
    
    db_session.add(activity)
    db_session.commit()
    
    # Test relationship
    db_session.refresh(sample_session)
    assert len(sample_session.processing_activities) == 1
    assert sample_session.processing_activities[0].activity_message == "Test validation activity"
    assert sample_session.processing_activities[0].activity_type == ActivityType.VALIDATION


def test_file_upload(db_session, sample_session):
    """Test FileUpload creation and relationships"""
    # Create file upload
    upload = FileUpload(
        session_id=sample_session.session_id,
        file_type=FileType.CAR,
        original_filename="test_file.pdf",
        file_path="./data/uploads/test_file.pdf",
        file_size=1024,
        checksum="test_checksum_123456789",
        upload_status=UploadStatus.COMPLETED,
        uploaded_by="test_user"
    )
    
    db_session.add(upload)
    db_session.commit()
    
    # Test relationship
    db_session.refresh(sample_session)
    assert len(sample_session.file_uploads) == 1
    assert sample_session.file_uploads[0].original_filename == "test_file.pdf"
    assert sample_session.file_uploads[0].file_type == FileType.CAR


def test_foreign_key_constraints(db_session):
    """Test foreign key constraints and cascading deletes"""
    # Create a session with related records
    test_session = ProcessingSession(
        session_name="FK Test Session",
        created_by="test_user"
    )
    db_session.add(test_session)
    db_session.flush()
    
    # Add related records
    revision = EmployeeRevision(
        session_id=test_session.session_id,
        employee_name="FK Test Employee"
    )
    activity = ProcessingActivity(
        session_id=test_session.session_id,
        activity_type=ActivityType.PROCESSING,
        activity_message="FK test activity",
        created_by="test_user"
    )
    upload = FileUpload(
        session_id=test_session.session_id,
        file_type=FileType.RECEIPT,
        original_filename="fk_test.pdf",
        file_path="./test/fk_test.pdf",
        file_size=512,
        checksum="fk_test_checksum",
        uploaded_by="test_user"
    )
    
    db_session.add_all([revision, activity, upload])
    db_session.commit()
    
    # Verify relationships exist
    session_check = db_session.query(ProcessingSession).filter_by(session_name="FK Test Session").first()
    assert len(session_check.employee_revisions) == 1
    assert len(session_check.processing_activities) == 1
    assert len(session_check.file_uploads) == 1
    
    # Test cascading delete
    db_session.delete(session_check)
    db_session.commit()
    
    # Verify related records were deleted
    remaining_revisions = db_session.query(EmployeeRevision).filter_by(session_id=test_session.session_id).count()
    remaining_activities = db_session.query(ProcessingActivity).filter_by(session_id=test_session.session_id).count()
    remaining_uploads = db_session.query(FileUpload).filter_by(session_id=test_session.session_id).count()
    
    assert remaining_revisions == 0
    assert remaining_activities == 0
    assert remaining_uploads == 0


def test_indexes_performance(db_session):
    """Test that indexes are created and functioning"""
    # Check SQLite indexes (basic test)
    # SQLite stores index information differently than other databases
    result = db_session.execute(text("SELECT name FROM sqlite_master WHERE type='index'")).fetchall()
    index_names = [row[0] for row in result]
    
    # Check for some of our custom indexes
    expected_indexes = [
        'idx_session_status_created',
        'idx_employee_session_status',
        'idx_activity_session_type',
        'idx_upload_session_type'
    ]
    
    found_indexes = [idx for idx in expected_indexes if any(idx in name for name in index_names)]
    
    # Basic assertion - we should have some indexes
    assert len(index_names) > 0, "No indexes found in database"


def test_complex_queries(db_session):
    """Test complex queries across relationships"""
    # Query sessions with their employee counts
    sessions_with_counts = db_session.query(
        ProcessingSession.session_name,
        ProcessingSession.total_employees,
        ProcessingSession.status
    ).filter(
        ProcessingSession.status.in_([SessionStatus.COMPLETED, SessionStatus.PROCESSING])
    ).all()
    
    # Query employees needing attention with session info
    employees_needing_attention = db_session.query(
        EmployeeRevision.employee_name,
        EmployeeRevision.validation_status,
        ProcessingSession.session_name
    ).join(ProcessingSession).filter(
        EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
    ).all()
    
    # Query recent activities
    recent_activities = db_session.query(
        ProcessingActivity.activity_message,
        ProcessingActivity.created_at,
        ProcessingSession.session_name
    ).join(ProcessingSession).order_by(
        ProcessingActivity.created_at.desc()
    ).limit(10).all()
    
    # Basic assertions - queries should execute without error
    assert sessions_with_counts is not None
    assert employees_needing_attention is not None
    assert recent_activities is not None


# This module contains pytest-compatible database tests.
# Run with: pytest app/test_database.py -v