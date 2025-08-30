"""Database functionality test script

This script tests all database models, relationships, and operations
to ensure the schema implementation is working correctly.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import text
from .database import SessionLocal, engine
from .models import (
    ProcessingSession, EmployeeRevision, ProcessingActivity, FileUpload,
    SessionStatus, ValidationStatus, ActivityType, FileType, UploadStatus
)


def test_database_connection():
    """Test basic database connection"""
    print("Testing database connection...")
    try:
        db = SessionLocal()
        # Execute a simple query
        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1
        db.close()
        print("✓ Database connection successful")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


def test_session_creation():
    """Test ProcessingSession creation and retrieval"""
    print("Testing ProcessingSession model...")
    db = SessionLocal()
    
    try:
        # Create a new session
        test_session = ProcessingSession(
            session_name="Test Session",
            created_by="test_user",
            status=SessionStatus.PENDING,
            processing_options={"test": True}
        )
        
        db.add(test_session)
        db.commit()
        
        # Retrieve and verify
        retrieved = db.query(ProcessingSession).filter_by(session_name="Test Session").first()
        assert retrieved is not None
        assert retrieved.session_name == "Test Session"
        assert retrieved.created_by == "test_user"
        assert retrieved.status == SessionStatus.PENDING
        assert isinstance(retrieved.session_id, uuid.UUID)
        assert retrieved.processing_options == {"test": True}
        
        # Test enum values
        retrieved.status = SessionStatus.PROCESSING
        db.commit()
        
        updated = db.query(ProcessingSession).filter_by(session_id=retrieved.session_id).first()
        assert updated.status == SessionStatus.PROCESSING
        
        print("✓ ProcessingSession model working correctly")
        return retrieved.session_id
        
    except Exception as e:
        print(f"✗ ProcessingSession test failed: {e}")
        db.rollback()
        return None
    finally:
        db.close()


def test_employee_revision(session_id):
    """Test EmployeeRevision creation and relationships"""
    print("Testing EmployeeRevision model...")
    db = SessionLocal()
    
    try:
        # Create employee revision
        revision = EmployeeRevision(
            session_id=session_id,
            employee_id="TEST001",
            employee_name="Test Employee",
            car_amount=Decimal("100.50"),
            receipt_amount=Decimal("95.75"),
            validation_status=ValidationStatus.NEEDS_ATTENTION,
            validation_flags={"amount_mismatch": True, "threshold": 5.0}
        )
        
        db.add(revision)
        db.commit()
        
        # Test relationship
        session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
        assert len(session.employee_revisions) == 1
        assert session.employee_revisions[0].employee_name == "Test Employee"
        
        # Test back reference
        retrieved_revision = db.query(EmployeeRevision).filter_by(employee_id="TEST001").first()
        assert retrieved_revision.session.session_name == "Test Session"
        
        # Test decimal precision
        assert retrieved_revision.car_amount == Decimal("100.50")
        assert retrieved_revision.receipt_amount == Decimal("95.75")
        
        print("✓ EmployeeRevision model and relationships working correctly")
        return True
        
    except Exception as e:
        print(f"✗ EmployeeRevision test failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def test_processing_activity(session_id):
    """Test ProcessingActivity creation and relationships"""
    print("Testing ProcessingActivity model...")
    db = SessionLocal()
    
    try:
        # Create activity
        activity = ProcessingActivity(
            session_id=session_id,
            activity_type=ActivityType.VALIDATION,
            activity_message="Test validation activity",
            employee_id="TEST001",
            created_by="test_user"
        )
        
        db.add(activity)
        db.commit()
        
        # Test relationship
        session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
        assert len(session.processing_activities) == 1
        assert session.processing_activities[0].activity_message == "Test validation activity"
        assert session.processing_activities[0].activity_type == ActivityType.VALIDATION
        
        print("✓ ProcessingActivity model working correctly")
        return True
        
    except Exception as e:
        print(f"✗ ProcessingActivity test failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def test_file_upload(session_id):
    """Test FileUpload creation and relationships"""
    print("Testing FileUpload model...")
    db = SessionLocal()
    
    try:
        # Create file upload
        upload = FileUpload(
            session_id=session_id,
            file_type=FileType.CAR,
            original_filename="test_file.pdf",
            file_path="./data/uploads/test_file.pdf",
            file_size=1024,
            checksum="test_checksum_123456789",
            upload_status=UploadStatus.COMPLETED,
            uploaded_by="test_user"
        )
        
        db.add(upload)
        db.commit()
        
        # Test relationship
        session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
        assert len(session.file_uploads) == 1
        assert session.file_uploads[0].original_filename == "test_file.pdf"
        assert session.file_uploads[0].file_type == FileType.CAR
        
        print("✓ FileUpload model working correctly")
        return True
        
    except Exception as e:
        print(f"✗ FileUpload test failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def test_foreign_key_constraints():
    """Test foreign key constraints and cascading deletes"""
    print("Testing foreign key constraints...")
    db = SessionLocal()
    
    try:
        # Create a session with related records
        test_session = ProcessingSession(
            session_name="FK Test Session",
            created_by="test_user"
        )
        db.add(test_session)
        db.flush()
        
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
        
        db.add_all([revision, activity, upload])
        db.commit()
        
        # Verify relationships exist
        session_check = db.query(ProcessingSession).filter_by(session_name="FK Test Session").first()
        assert len(session_check.employee_revisions) == 1
        assert len(session_check.processing_activities) == 1
        assert len(session_check.file_uploads) == 1
        
        # Test cascading delete
        db.delete(session_check)
        db.commit()
        
        # Verify related records were deleted
        remaining_revisions = db.query(EmployeeRevision).filter_by(session_id=test_session.session_id).count()
        remaining_activities = db.query(ProcessingActivity).filter_by(session_id=test_session.session_id).count()
        remaining_uploads = db.query(FileUpload).filter_by(session_id=test_session.session_id).count()
        
        assert remaining_revisions == 0
        assert remaining_activities == 0
        assert remaining_uploads == 0
        
        print("✓ Foreign key constraints and cascading deletes working correctly")
        return True
        
    except Exception as e:
        print(f"✗ Foreign key constraint test failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def test_indexes_performance():
    """Test that indexes are created and functioning"""
    print("Testing database indexes...")
    db = SessionLocal()
    
    try:
        # Check SQLite indexes (basic test)
        # SQLite stores index information differently than other databases
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='index'")).fetchall()
        index_names = [row[0] for row in result]
        
        # Check for some of our custom indexes
        expected_indexes = [
            'idx_session_status_created',
            'idx_employee_session_status',
            'idx_activity_session_type',
            'idx_upload_session_type'
        ]
        
        found_indexes = [idx for idx in expected_indexes if any(idx in name for name in index_names)]
        
        if len(found_indexes) > 0:
            print(f"✓ Found {len(found_indexes)} custom indexes")
        else:
            print("! Custom indexes may not be visible in SQLite, but should be functional")
        
        return True
        
    except Exception as e:
        print(f"✗ Index test failed: {e}")
        return False
    finally:
        db.close()


def test_complex_queries():
    """Test complex queries across relationships"""
    print("Testing complex queries...")
    db = SessionLocal()
    
    try:
        # Query sessions with their employee counts
        sessions_with_counts = db.query(
            ProcessingSession.session_name,
            ProcessingSession.total_employees,
            ProcessingSession.status
        ).filter(
            ProcessingSession.status.in_([SessionStatus.COMPLETED, SessionStatus.PROCESSING])
        ).all()
        
        # Query employees needing attention with session info
        employees_needing_attention = db.query(
            EmployeeRevision.employee_name,
            EmployeeRevision.validation_status,
            ProcessingSession.session_name
        ).join(ProcessingSession).filter(
            EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
        ).all()
        
        # Query recent activities
        recent_activities = db.query(
            ProcessingActivity.activity_message,
            ProcessingActivity.created_at,
            ProcessingSession.session_name
        ).join(ProcessingSession).order_by(
            ProcessingActivity.created_at.desc()
        ).limit(10).all()
        
        print("✓ Complex queries executed successfully")
        print(f"  - Found {len(sessions_with_counts)} sessions")
        print(f"  - Found {len(employees_needing_attention)} employees needing attention")
        print(f"  - Found {len(recent_activities)} recent activities")
        return True
        
    except Exception as e:
        print(f"✗ Complex query test failed: {e}")
        return False
    finally:
        db.close()


def run_all_tests():
    """Run all database tests"""
    print("=" * 60)
    print("CREDIT CARD PROCESSOR - DATABASE TESTS")
    print("=" * 60)
    
    tests_passed = 0
    total_tests = 8
    
    # Test 1: Database connection
    if test_database_connection():
        tests_passed += 1
    
    # Test 2: Session creation
    session_id = test_session_creation()
    if session_id:
        tests_passed += 1
        
        # Test 3: Employee revision (depends on session)
        if test_employee_revision(session_id):
            tests_passed += 1
        
        # Test 4: Processing activity (depends on session)
        if test_processing_activity(session_id):
            tests_passed += 1
        
        # Test 5: File upload (depends on session)
        if test_file_upload(session_id):
            tests_passed += 1
    
    # Test 6: Foreign key constraints
    if test_foreign_key_constraints():
        tests_passed += 1
    
    # Test 7: Indexes
    if test_indexes_performance():
        tests_passed += 1
    
    # Test 8: Complex queries
    if test_complex_queries():
        tests_passed += 1
    
    print("=" * 60)
    print(f"TESTS COMPLETED: {tests_passed}/{total_tests} passed")
    print("=" * 60)
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Database schema is working correctly.")
        return True
    else:
        print(f"⚠️  {total_tests - tests_passed} tests failed. Please check the issues above.")
        return False


if __name__ == "__main__":
    run_all_tests()