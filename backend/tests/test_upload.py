"""
Comprehensive Test Suite for File Upload API
Tests file upload functionality including validation, security, and integration
"""

import pytest
import uuid
import hashlib
import tempfile
import os
from pathlib import Path
from typing import Dict, Any
from io import BytesIO

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models import ProcessingSession, FileUpload, SessionStatus, FileType
from app.auth import get_current_user, UserInfo

# Test client
client = TestClient(app)

# Mock user data
from datetime import datetime

test_user = UserInfo(
    username="testuser",
    is_admin=False,
    is_authenticated=True,
    auth_method="development",
    timestamp=datetime.utcnow()
)

admin_user = UserInfo(
    username="adminuser",
    is_admin=True,
    is_authenticated=True,
    auth_method="development",
    timestamp=datetime.utcnow()
)


def create_test_pdf(size_mb: float = 0.1) -> bytes:
    """
    Create a minimal valid PDF file for testing
    
    Args:
        size_mb: Approximate size in MB
        
    Returns:
        PDF content as bytes
    """
    # Minimal PDF structure
    pdf_header = b"%PDF-1.4\n"
    pdf_body = (
        b"1 0 obj\n"
        b"<<\n"
        b"/Type /Catalog\n"
        b"/Pages 2 0 R\n"
        b">>\n"
        b"endobj\n\n"
        b"2 0 obj\n"
        b"<<\n"
        b"/Type /Pages\n"
        b"/Kids [3 0 R]\n"
        b"/Count 1\n"
        b">>\n"
        b"endobj\n\n"
        b"3 0 obj\n"
        b"<<\n"
        b"/Type /Page\n"
        b"/Parent 2 0 R\n"
        b"/Resources <<\n"
        b"/Font <<\n"
        b"/F1 <<\n"
        b"/Type /Font\n"
        b"/Subtype /Type1\n"
        b"/BaseFont /Helvetica\n"
        b">>\n"
        b">>\n"
        b">>\n"
        b"/MediaBox [0 0 612 792]\n"
        b"/Contents 4 0 R\n"
        b">>\n"
        b"endobj\n\n"
        b"4 0 obj\n"
        b"<<\n"
        b"/Length 44\n"
        b">>\n"
        b"stream\n"
        b"BT\n"
        b"/F1 12 Tf\n"
        b"100 700 Td\n"
        b"(Test PDF) Tj\n"
        b"ET\n"
        b"endstream\n"
        b"endobj\n\n"
    )
    
    # Calculate target size and pad if necessary
    target_size = int(size_mb * 1024 * 1024)
    current_size = len(pdf_header) + len(pdf_body)
    
    if target_size > current_size:
        padding_size = target_size - current_size - 50  # Reserve space for trailer
        padding = b" " * max(0, padding_size)
    else:
        padding = b""
    
    pdf_trailer = (
        b"xref\n"
        b"0 5\n"
        b"0000000000 65535 f \n"
        b"0000000010 00000 n \n"
        b"0000000079 00000 n \n"
        b"0000000173 00000 n \n"
        b"0000000301 00000 n \n"
        b"trailer\n"
        b"<<\n"
        b"/Size 5\n"
        b"/Root 1 0 R\n"
        b">>\n"
        b"startxref\n"
        b"379\n"
        b"%%EOF\n"
    )
    
    return pdf_header + pdf_body + padding + pdf_trailer


def create_invalid_pdf() -> bytes:
    """
    Create an invalid PDF file for testing validation
    
    Returns:
        Invalid PDF content as bytes
    """
    return b"This is not a valid PDF file content"


def override_get_current_user_regular():
    """Override for regular user authentication"""
    return test_user


def override_get_current_user_admin():
    """Override for admin user authentication"""
    return admin_user


class TestFileUploadValidation:
    """Test file upload validation functionality"""
    
    def test_valid_pdf_files(self, test_db: Session):
        """Test uploading valid PDF files"""
        # Create test session
        session = ProcessingSession(
            session_name="Test Upload Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        # Create test PDF files
        car_pdf = create_test_pdf(0.5)  # 0.5MB
        receipt_pdf = create_test_pdf(0.3)  # 0.3MB
        
        # Upload files
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("car_test.pdf", BytesIO(car_pdf), "application/pdf"),
                "receipt_file": ("receipt_test.pdf", BytesIO(receipt_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        assert data["session_id"] == str(session.session_id)
        assert data["session_status"] == "processing"
        assert len(data["uploaded_files"]) == 2
        
        # Verify file details
        car_file = next(f for f in data["uploaded_files"] if f["file_type"] == "car")
        assert car_file["original_filename"] == "car_test.pdf"
        assert car_file["file_size"] == len(car_pdf)
        assert len(car_file["checksum"]) == 64  # SHA256 length
        
        receipt_file = next(f for f in data["uploaded_files"] if f["file_type"] == "receipt")
        assert receipt_file["original_filename"] == "receipt_test.pdf"
        assert receipt_file["file_size"] == len(receipt_pdf)
        assert len(receipt_file["checksum"]) == 64
    
    def test_file_size_validation(self, test_db: Session):
        """Test file size validation (max 100MB)"""
        # Create test session
        session = ProcessingSession(
            session_name="Test Size Validation Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        # Create oversized PDF (mock - don't actually create 100MB+)
        large_pdf = create_test_pdf(0.1)  # Small for testing
        normal_pdf = create_test_pdf(0.1)
        
        # Mock the file size check by creating a large content buffer
        # This simulates the upload of a file larger than 100MB
        oversized_content = b"a" * (101 * 1024 * 1024)  # 101MB of 'a' characters
        
        # Test with oversized file - this should fail
        with pytest.raises(Exception):  # Should fail during processing
            response = client.post(
                f"/api/sessions/{session.session_id}/upload",
                files={
                    "car_file": ("large_car.pdf", BytesIO(oversized_content), "application/pdf"),
                    "receipt_file": ("receipt.pdf", BytesIO(normal_pdf), "application/pdf")
                }
            )
        
        # Clean up override
        app.dependency_overrides.clear()
    
    def test_invalid_file_type_validation(self, test_db: Session):
        """Test file type validation (only PDF allowed)"""
        # Create test session
        session = ProcessingSession(
            session_name="Test File Type Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        # Create invalid file content (not PDF)
        invalid_content = b"This is a text file, not a PDF"
        valid_pdf = create_test_pdf(0.1)
        
        # Upload invalid file type
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("car_file.txt", BytesIO(invalid_content), "text/plain"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        # Should fail validation
        assert response.status_code == 400
        assert "validation failed" in response.json()["detail"].lower()
    
    def test_invalid_pdf_content_validation(self, test_db: Session):
        """Test PDF content validation"""
        # Create test session
        session = ProcessingSession(
            session_name="Test PDF Content Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        # Create invalid PDF content
        invalid_pdf = create_invalid_pdf()
        valid_pdf = create_test_pdf(0.1)
        
        # Upload file with invalid PDF content
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("car_file.pdf", BytesIO(invalid_pdf), "application/pdf"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        # Should fail PDF validation
        assert response.status_code == 400
        assert "valid PDF" in response.json()["detail"]


class TestFileUploadSecurity:
    """Test security aspects of file upload"""
    
    def test_authentication_required(self, test_db: Session):
        """Test that authentication is required for upload"""
        # Create test session
        session = ProcessingSession(
            session_name="Test Auth Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Don't override auth - should fail
        valid_pdf = create_test_pdf(0.1)
        
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("car.pdf", BytesIO(valid_pdf), "application/pdf"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Should require authentication
        assert response.status_code == 401
    
    def test_session_ownership_access_control(self, test_db: Session):
        """Test that users can only upload to their own sessions"""
        # Create session owned by different user
        session = ProcessingSession(
            session_name="Other User Session",
            created_by="DOMAIN\\otheruser",  # Different from test_user
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth with regular user
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        valid_pdf = create_test_pdf(0.1)
        
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("car.pdf", BytesIO(valid_pdf), "application/pdf"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        # Should be forbidden
        assert response.status_code == 403
    
    def test_admin_can_upload_to_any_session(self, test_db: Session):
        """Test that admin users can upload to any session"""
        # Create session owned by different user
        session = ProcessingSession(
            session_name="Other User Session",
            created_by="DOMAIN\\otheruser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth with admin user
        app.dependency_overrides[get_current_user] = override_get_current_user_admin
        
        valid_pdf = create_test_pdf(0.1)
        
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("car.pdf", BytesIO(valid_pdf), "application/pdf"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        # Should succeed for admin
        assert response.status_code == 200
    
    def test_session_status_upload_restriction(self, test_db: Session):
        """Test that uploads are only allowed for PENDING sessions"""
        # Create session in non-pending status
        session = ProcessingSession(
            session_name="Processing Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PROCESSING  # Not PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        valid_pdf = create_test_pdf(0.1)
        
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("car.pdf", BytesIO(valid_pdf), "application/pdf"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        # Should be forbidden due to status
        assert response.status_code == 403


class TestFileUploadIntegration:
    """Test integration with session management and database"""
    
    def test_session_status_update_after_upload(self, test_db: Session):
        """Test that session status is updated after successful upload"""
        # Create test session
        session = ProcessingSession(
            session_name="Status Update Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        session_id = session.session_id
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        valid_pdf = create_test_pdf(0.1)
        
        response = client.post(
            f"/api/sessions/{session_id}/upload",
            files={
                "car_file": ("car.pdf", BytesIO(valid_pdf), "application/pdf"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        
        # Check session status in database
        updated_session = test_db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        assert updated_session.status == SessionStatus.PROCESSING
        assert updated_session.car_file_path is not None
        assert updated_session.receipt_file_path is not None
        assert updated_session.car_checksum is not None
        assert updated_session.receipt_checksum is not None
    
    def test_file_upload_records_created(self, test_db: Session):
        """Test that FileUpload records are created in database"""
        # Create test session
        session = ProcessingSession(
            session_name="FileUpload Records Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        session_id = session.session_id
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        car_pdf = create_test_pdf(0.2)
        receipt_pdf = create_test_pdf(0.3)
        
        response = client.post(
            f"/api/sessions/{session_id}/upload",
            files={
                "car_file": ("test_car.pdf", BytesIO(car_pdf), "application/pdf"),
                "receipt_file": ("test_receipt.pdf", BytesIO(receipt_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        
        # Check FileUpload records
        file_uploads = test_db.query(FileUpload).filter(
            FileUpload.session_id == session_id
        ).all()
        
        assert len(file_uploads) == 2
        
        # Verify file details
        car_upload = next(f for f in file_uploads if f.file_type == FileType.CAR)
        assert car_upload.original_filename == "test_car.pdf"
        assert car_upload.file_size == len(car_pdf)
        assert len(car_upload.checksum) == 64
        
        receipt_upload = next(f for f in file_uploads if f.file_type == FileType.RECEIPT)
        assert receipt_upload.original_filename == "test_receipt.pdf"
        assert receipt_upload.file_size == len(receipt_pdf)
        assert len(receipt_upload.checksum) == 64
    
    def test_checksum_calculation_accuracy(self, test_db: Session):
        """Test that checksums are calculated correctly"""
        # Create test session
        session = ProcessingSession(
            session_name="Checksum Test Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        test_content = create_test_pdf(0.1)
        expected_checksum = hashlib.sha256(test_content).hexdigest()
        
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("checksum_test.pdf", BytesIO(test_content), "application/pdf"),
                "receipt_file": ("checksum_test2.pdf", BytesIO(test_content), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify checksums match expected values
        for file_info in data["uploaded_files"]:
            assert file_info["checksum"] == expected_checksum


class TestFileUploadErrorHandling:
    """Test error handling in file upload"""
    
    def test_invalid_session_id(self):
        """Test upload with invalid session ID"""
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        valid_pdf = create_test_pdf(0.1)
        invalid_session_id = "invalid-uuid"
        
        response = client.post(
            f"/api/sessions/{invalid_session_id}/upload",
            files={
                "car_file": ("car.pdf", BytesIO(valid_pdf), "application/pdf"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        assert response.status_code == 400
        assert "Invalid session ID format" in response.json()["detail"]
    
    def test_nonexistent_session(self):
        """Test upload to non-existent session"""
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        valid_pdf = create_test_pdf(0.1)
        nonexistent_session_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/sessions/{nonexistent_session_id}/upload",
            files={
                "car_file": ("car.pdf", BytesIO(valid_pdf), "application/pdf"),
                "receipt_file": ("receipt.pdf", BytesIO(valid_pdf), "application/pdf")
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]
    
    def test_missing_files(self, test_db: Session):
        """Test upload with missing required files"""
        # Create test session
        session = ProcessingSession(
            session_name="Missing Files Session",
            created_by="DOMAIN\\testuser",
            status=SessionStatus.PENDING
        )
        test_db.add(session)
        test_db.commit()
        
        # Override auth
        app.dependency_overrides[get_current_user] = override_get_current_user_regular
        
        valid_pdf = create_test_pdf(0.1)
        
        # Upload with only one file (missing receipt_file)
        response = client.post(
            f"/api/sessions/{session.session_id}/upload",
            files={
                "car_file": ("car.pdf", BytesIO(valid_pdf), "application/pdf")
                # Missing receipt_file
            }
        )
        
        # Clean up override
        app.dependency_overrides.clear()
        
        # Should fail due to missing required file
        assert response.status_code == 422  # FastAPI validation error


# Fixture for test database
@pytest.fixture
def test_db():
    """Provide a test database session"""
    from app.database import Base, engine, SessionLocal
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = SessionLocal()
    
    try:
        # Override database dependency
        def get_test_db():
            return db
        
        app.dependency_overrides[get_db] = get_test_db
        yield db
    finally:
        # Clean up
        db.close()
        app.dependency_overrides.clear()
        # Drop tables
        Base.metadata.drop_all(bind=engine)


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])