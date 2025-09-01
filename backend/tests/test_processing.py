"""
Comprehensive tests for Background Processing Framework
Tests all processing endpoints, background tasks, and error handling
"""

import pytest
import uuid
import asyncio
import time
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import (
    ProcessingSession, SessionStatus, EmployeeRevision, ProcessingActivity, 
    FileUpload, ValidationStatus, ActivityType, FileType
)
from app.schemas import ProcessingConfig
from app.api.processing import get_processing_state, clear_processing_state


@pytest.fixture
def client():
    """Create FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def test_session_id():
    """Create a test session ID"""
    return str(uuid.uuid4())


@pytest.fixture
def mock_user_headers():
    """Mock authentication headers"""
    return {"X-Dev-User": "testuser"}


@pytest.fixture
def admin_headers():
    """Mock admin authentication headers"""
    return {"X-Dev-User": "admin"}


@pytest.fixture
def sample_processing_config():
    """Sample processing configuration"""
    return {
        "skip_duplicates": True,
        "validation_threshold": 0.05,
        "auto_resolve_minor": False,
        "batch_size": 5,
        "max_processing_time": 1800
    }


class TestProcessingStartEndpoint:
    """Tests for the start processing endpoint"""
    
    def test_start_processing_success(self, client, mock_user_headers, sample_processing_config):
        """Test successful processing start"""
        # First create a session
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Test Processing Session",
                "processing_options": {}
            }
        )
        assert session_response.status_code == 201
        session_id = session_response.json()["session_id"]
        
        # Upload files to meet requirements
        with patch('app.api.upload.save_uploaded_file') as mock_save:
            mock_save.return_value = ("test_path", "test_checksum")
            
            # Upload CAR file
            car_response = client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"car_file": ("car.pdf", b"test car content", "application/pdf")}
            )
            assert car_response.status_code == 200
            
            # Upload Receipt file
            receipt_response = client.post(
                f"/api/sessions/{session_id}/upload", 
                headers=mock_user_headers,
                files={"receipt_file": ("receipt.pdf", b"test receipt content", "application/pdf")}
            )
            assert receipt_response.status_code == 200
        
        # Start processing
        processing_response = client.post(
            f"/api/sessions/{session_id}/process",
            headers=mock_user_headers,
            json={"processing_config": sample_processing_config}
        )
        
        assert processing_response.status_code == 202
        response_data = processing_response.json()
        assert response_data["session_id"] == session_id
        assert response_data["status"] == "processing"
        assert response_data["message"] == "Background processing started successfully"
        assert response_data["processing_config"] == sample_processing_config
        assert "timestamp" in response_data
    
    def test_start_processing_invalid_session_id(self, client, mock_user_headers):
        """Test start processing with invalid session ID"""
        response = client.post(
            "/api/sessions/invalid-uuid/process",
            headers=mock_user_headers,
            json={}
        )
        
        assert response.status_code == 400
        assert "Invalid session ID format" in response.json()["detail"]
    
    def test_start_processing_session_not_found(self, client, mock_user_headers):
        """Test start processing with non-existent session"""
        fake_session_id = str(uuid.uuid4())
        response = client.post(
            f"/api/sessions/{fake_session_id}/process",
            headers=mock_user_headers,
            json={}
        )
        
        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]
    
    def test_start_processing_no_files_uploaded(self, client, mock_user_headers):
        """Test start processing without uploaded files"""
        # Create session without files
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Test Session",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Try to start processing
        response = client.post(
            f"/api/sessions/{session_id}/process",
            headers=mock_user_headers,
            json={}
        )
        
        assert response.status_code == 400
        assert "Session must have files uploaded before processing" in response.json()["detail"]
    
    def test_start_processing_missing_file_type(self, client, mock_user_headers):
        """Test start processing with only one file type"""
        # Create session
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Test Session",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Upload only CAR file
        with patch('app.api.upload.save_uploaded_file') as mock_save:
            mock_save.return_value = ("test_path", "test_checksum")
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"car_file": ("car.pdf", b"test content", "application/pdf")}
            )
        
        # Try to start processing
        response = client.post(
            f"/api/sessions/{session_id}/process",
            headers=mock_user_headers,
            json={}
        )
        
        assert response.status_code == 400
        assert "Session must have both CAR and RECEIPT files uploaded" in response.json()["detail"]


class TestProcessingControlEndpoints:
    """Tests for pause, resume, and cancel endpoints"""
    
    def setup_processing_session(self, client, mock_user_headers):
        """Helper to create a session with files and start processing"""
        # Create session
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Test Processing Session",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Upload files
        with patch('app.api.upload.save_uploaded_file') as mock_save:
            mock_save.return_value = ("test_path", "test_checksum")
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"car_file": ("car.pdf", b"test car content", "application/pdf")}
            )
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"receipt_file": ("receipt.pdf", b"test receipt content", "application/pdf")}
            )
        
        # Start processing
        client.post(
            f"/api/sessions/{session_id}/process",
            headers=mock_user_headers,
            json={"processing_config": {"batch_size": 3}}
        )
        
        return session_id
    
    def test_pause_processing_success(self, client, mock_user_headers):
        """Test successful processing pause"""
        session_id = self.setup_processing_session(client, mock_user_headers)
        
        # Pause processing
        response = client.post(
            f"/api/sessions/{session_id}/pause",
            headers=mock_user_headers
        )
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["session_id"] == session_id
        assert response_data["action"] == "pause"
        assert response_data["message"] == "Processing pause requested"
        assert "timestamp" in response_data
    
    def test_pause_processing_not_running(self, client, mock_user_headers):
        """Test pause processing when not running"""
        # Create session without starting processing
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Test Session",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Try to pause
        response = client.post(
            f"/api/sessions/{session_id}/pause",
            headers=mock_user_headers
        )
        
        assert response.status_code == 409
        assert "Session is not currently processing" in response.json()["detail"]
    
    def test_resume_processing_success(self, client, mock_user_headers):
        """Test successful processing resume"""
        session_id = self.setup_processing_session(client, mock_user_headers)
        
        # Pause first
        client.post(f"/api/sessions/{session_id}/pause", headers=mock_user_headers)
        
        # Wait a bit for pause to take effect
        time.sleep(0.1)
        
        # Resume processing
        response = client.post(
            f"/api/sessions/{session_id}/resume",
            headers=mock_user_headers
        )
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["session_id"] == session_id
        assert response_data["action"] == "resume"
        assert response_data["message"] == "Processing resume requested"
    
    def test_cancel_processing_success(self, client, mock_user_headers):
        """Test successful processing cancel"""
        session_id = self.setup_processing_session(client, mock_user_headers)
        
        # Cancel processing
        response = client.post(
            f"/api/sessions/{session_id}/cancel",
            headers=mock_user_headers
        )
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["session_id"] == session_id
        assert response_data["action"] == "cancel"
        assert response_data["message"] == "Processing cancellation requested"
    
    def test_access_denied_other_user_session(self, client):
        """Test access denied for other user's session"""
        # Create session with one user
        session_response = client.post(
            "/api/sessions",
            headers={"X-Dev-User": "user1"},
            json={
                "session_name": "User1 Session",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Try to control processing with different user
        response = client.post(
            f"/api/sessions/{session_id}/pause",
            headers={"X-Dev-User": "user2"}
        )
        
        assert response.status_code == 403
        assert "Access denied to this session" in response.json()["detail"]


class TestBackgroundProcessingFunction:
    """Tests for the main background processing function"""
    
    @patch('app.api.processing.log_processing_activity')
    @patch('app.api.processing.update_session_status')
    async def test_background_processing_completion(self, mock_update_status, mock_log_activity):
        """Test successful background processing completion"""
        from app.api.processing import process_session
        from app.database import SessionLocal
        
        # Setup
        session_id = str(uuid.uuid4())
        config = {"batch_size": 3, "validation_threshold": 0.05}
        db_url = "sqlite:///test.db"
        
        # Mock database session
        with patch('app.api.processing.SessionLocal') as mock_session_local:
            mock_db = MagicMock()
            mock_session_local.return_value = mock_db
            
            # Mock session query
            mock_session = MagicMock()
            mock_session.session_id = uuid.UUID(session_id)
            mock_session.total_employees = 0
            mock_db.query.return_value.filter.return_value.first.return_value = mock_session
            
            # Run background processing
            await process_session(session_id, config, db_url)
            
            # Verify processing completed
            assert mock_log_activity.call_count >= 2  # At least start and completion
            assert mock_update_status.call_count >= 2  # At least initial and final status
            
            # Check final status call
            final_status_call = mock_update_status.call_args_list[-1]
            assert final_status_call[0][2] == SessionStatus.COMPLETED
    
    @patch('app.api.processing.log_processing_activity')
    @patch('app.api.processing.update_session_status')
    async def test_background_processing_cancellation(self, mock_update_status, mock_log_activity):
        """Test background processing cancellation"""
        from app.api.processing import process_session
        
        session_id = str(uuid.uuid4())
        config = {"batch_size": 3}
        db_url = "sqlite:///test.db"
        
        # Set cancellation flag
        processing_state = get_processing_state(session_id)
        processing_state["should_cancel"] = True
        
        with patch('app.api.processing.SessionLocal') as mock_session_local:
            mock_db = MagicMock()
            mock_session_local.return_value = mock_db
            
            mock_session = MagicMock()
            mock_session.session_id = uuid.UUID(session_id)
            mock_session.total_employees = 0
            mock_db.query.return_value.filter.return_value.first.return_value = mock_session
            
            await process_session(session_id, config, db_url)
            
            # Verify cancellation was handled
            cancelled_call = next(
                (call for call in mock_log_activity.call_args_list 
                 if call[0][2] == ActivityType.PROCESSING_CANCELLED),
                None
            )
            assert cancelled_call is not None
    
    async def test_processing_state_management(self):
        """Test processing state management functions"""
        session_id = str(uuid.uuid4())
        
        # Test getting initial state
        state = get_processing_state(session_id)
        assert state["status"] == "idle"
        assert state["should_pause"] is False
        assert state["should_cancel"] is False
        
        # Test state modification
        state["status"] = "processing"
        state["should_pause"] = True
        
        # Get state again
        same_state = get_processing_state(session_id)
        assert same_state["status"] == "processing"
        assert same_state["should_pause"] is True
        
        # Test clearing state
        clear_processing_state(session_id)
        new_state = get_processing_state(session_id)
        assert new_state["status"] == "idle"
        assert new_state["should_pause"] is False


class TestProcessingIntegration:
    """Integration tests with existing session and status systems"""
    
    def test_processing_updates_session_status(self, client, mock_user_headers):
        """Test that processing properly updates session status"""
        # Create session
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Integration Test Session",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Upload files
        with patch('app.api.upload.save_uploaded_file') as mock_save:
            mock_save.return_value = ("test_path", "test_checksum")
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"car_file": ("car.pdf", b"test car content", "application/pdf")}
            )
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"receipt_file": ("receipt.pdf", b"test receipt content", "application/pdf")}
            )
        
        # Check initial status
        status_response = client.get(
            f"/api/sessions/{session_id}/status",
            headers=mock_user_headers
        )
        assert status_response.json()["status"] == "pending"
        
        # Start processing
        client.post(
            f"/api/sessions/{session_id}/process",
            headers=mock_user_headers,
            json={"processing_config": {"batch_size": 2}}
        )
        
        # Check status updated to processing
        status_response = client.get(
            f"/api/sessions/{session_id}/status",
            headers=mock_user_headers
        )
        status_data = status_response.json()
        assert status_data["status"] in ["processing", "completed"]  # May complete quickly
    
    def test_processing_creates_activities(self, client, mock_user_headers):
        """Test that processing creates activity logs"""
        # Setup processing session
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Activity Test Session",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Upload files and start processing
        with patch('app.api.upload.save_uploaded_file') as mock_save:
            mock_save.return_value = ("test_path", "test_checksum")
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"car_file": ("car.pdf", b"test car content", "application/pdf")}
            )
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"receipt_file": ("receipt.pdf", b"test receipt content", "application/pdf")}
            )
        
        # Start processing
        client.post(
            f"/api/sessions/{session_id}/process",
            headers=mock_user_headers,
            json={"processing_config": {"batch_size": 1}}
        )
        
        # Wait a moment for processing to start
        time.sleep(0.5)
        
        # Check status endpoint shows recent activities
        status_response = client.get(
            f"/api/sessions/{session_id}/status",
            headers=mock_user_headers
        )
        
        activities = status_response.json()["recent_activities"]
        assert len(activities) > 0
        
        # Should have at least processing started activity
        activity_types = [activity["activity_type"] for activity in activities]
        assert any("processing" in activity_type for activity_type in activity_types)


class TestErrorHandling:
    """Tests for error handling and recovery"""
    
    @patch('app.api.processing.SessionLocal')
    async def test_processing_database_error_handling(self, mock_session_local):
        """Test handling of database errors during processing"""
        from app.api.processing import process_session
        
        # Setup mock to raise exception
        mock_session_local.side_effect = Exception("Database connection failed")
        
        session_id = str(uuid.uuid4())
        config = {"batch_size": 1}
        db_url = "sqlite:///test.db"
        
        # Processing should handle the error gracefully
        with pytest.raises(Exception, match="Database connection failed"):
            await process_session(session_id, config, db_url)
        
        # State should be updated to failed
        state = get_processing_state(session_id)
        assert state["status"] == "failed"
    
    def test_invalid_uuid_error_handling(self, client, mock_user_headers):
        """Test error handling for invalid UUIDs across all endpoints"""
        invalid_id = "not-a-uuid"
        
        # Test all endpoints with invalid UUID
        endpoints = [
            ("POST", f"/api/sessions/{invalid_id}/process", {}),
            ("POST", f"/api/sessions/{invalid_id}/pause", {}),
            ("POST", f"/api/sessions/{invalid_id}/resume", {}),
            ("POST", f"/api/sessions/{invalid_id}/cancel", {})
        ]
        
        for method, endpoint, json_data in endpoints:
            if method == "POST":
                response = client.post(endpoint, headers=mock_user_headers, json=json_data)
            
            assert response.status_code == 400
            assert "Invalid session ID format" in response.json()["detail"]


class TestProcessingConfiguration:
    """Tests for processing configuration handling"""
    
    def test_default_processing_config(self, client, mock_user_headers):
        """Test processing with default configuration"""
        # Setup session
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Default Config Test",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Upload files
        with patch('app.api.upload.save_uploaded_file') as mock_save:
            mock_save.return_value = ("test_path", "test_checksum")
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"car_file": ("car.pdf", b"test content", "application/pdf")}
            )
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"receipt_file": ("receipt.pdf", b"test content", "application/pdf")}
            )
        
        # Start processing without config
        response = client.post(
            f"/api/sessions/{session_id}/process",
            headers=mock_user_headers,
            json={}
        )
        
        assert response.status_code == 202
        config = response.json()["processing_config"]
        
        # Should have default values
        assert config["skip_duplicates"] is True
        assert config["validation_threshold"] == 0.05
        assert config["auto_resolve_minor"] is False
        assert config["batch_size"] == 10
        assert config["max_processing_time"] == 3600
    
    def test_custom_processing_config(self, client, mock_user_headers):
        """Test processing with custom configuration"""
        custom_config = {
            "skip_duplicates": False,
            "validation_threshold": 0.1,
            "auto_resolve_minor": True,
            "batch_size": 20,
            "max_processing_time": 7200
        }
        
        # Setup session
        session_response = client.post(
            "/api/sessions",
            headers=mock_user_headers,
            json={
                "session_name": "Custom Config Test",
                "processing_options": {}
            }
        )
        session_id = session_response.json()["session_id"]
        
        # Upload files
        with patch('app.api.upload.save_uploaded_file') as mock_save:
            mock_save.return_value = ("test_path", "test_checksum")
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"car_file": ("car.pdf", b"test content", "application/pdf")}
            )
            
            client.post(
                f"/api/sessions/{session_id}/upload",
                headers=mock_user_headers,
                files={"receipt_file": ("receipt.pdf", b"test content", "application/pdf")}
            )
        
        # Start processing with custom config
        response = client.post(
            f"/api/sessions/{session_id}/process",
            headers=mock_user_headers,
            json={"processing_config": custom_config}
        )
        
        assert response.status_code == 202
        returned_config = response.json()["processing_config"]
        
        # Should match custom values
        assert returned_config == custom_config


if __name__ == "__main__":
    pytest.main([__file__, "-v"])