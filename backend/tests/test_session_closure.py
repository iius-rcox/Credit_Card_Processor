"""
Unit tests for session closure functionality
Tests the permanent closure behavior implemented in Phase 2
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.models import ProcessingSession, SessionStatus
from app.database import get_db
from app.auth import get_current_user


class TestSessionClosure:
    """Test suite for session closure functionality"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()
    
    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user"""
        user = Mock()
        user.username = "testuser"
        user.is_admin = False
        return user
    
    @pytest.fixture
    def mock_admin_user(self):
        """Mock admin user"""
        user = Mock()
        user.username = "admin"
        user.is_admin = True
        return user
    
    @pytest.fixture
    def sample_session(self):
        """Create a sample session for testing"""
        session = ProcessingSession()
        session.session_id = "test-session-id"
        session.session_name = "Test Session"
        session.status = SessionStatus.PROCESSING
        session.is_closed = False
        session.created_by = "DOMAIN\\testuser"
        session.created_at = datetime.now(timezone.utc)
        session.updated_at = datetime.now(timezone.utc)
        session.total_employees = 10
        session.processed_employees = 5
        session.processing_options = {}
        session.delta_session_id = None
        session.closure_reason = None
        session.closed_by = None
        session.closed_at = None
        return session
    
    def test_close_session_success(self, client, mock_db, mock_user, sample_session):
        """Test successful session closure"""
        # Mock database query to return our sample session
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.sessions.get_db', return_value=mock_db), \
             patch('app.api.sessions.get_current_user', return_value=mock_user), \
             patch('app.api.sessions.check_session_access', return_value=True):
            
            response = client.post(
                f"/api/sessions/{sample_session.session_id}/close",
                json={"closure_reason": "Test closure"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Session permanently closed successfully"
            assert data["status"] == "closed"
            assert data["closed_by"] == mock_user.username
            
            # Verify session was updated
            assert sample_session.is_closed == True
            assert sample_session.status == SessionStatus.CLOSED
            assert sample_session.closed_by == mock_user.username
            assert sample_session.closure_reason == "Test closure"
            assert sample_session.closed_at is not None
    
    def test_close_already_closed_session(self, client, mock_db, mock_user, sample_session):
        """Test closing an already closed session"""
        sample_session.is_closed = True
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.sessions.get_db', return_value=mock_db), \
             patch('app.api.sessions.get_current_user', return_value=mock_user), \
             patch('app.api.sessions.check_session_access', return_value=True):
            
            response = client.post(f"/api/sessions/{sample_session.session_id}/close")
            
            assert response.status_code == 400
            assert "already permanently closed" in response.json()["detail"]
    
    def test_resume_closed_session_blocked(self, client, mock_db, mock_user, sample_session):
        """Test that closed sessions cannot be resumed"""
        sample_session.is_closed = True
        sample_session.status = SessionStatus.CLOSED
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.sessions.get_db', return_value=mock_db), \
             patch('app.api.sessions.get_current_user', return_value=mock_user), \
             patch('app.api.sessions.check_session_access', return_value=True):
            
            response = client.post(f"/api/sessions/{sample_session.session_id}/resume")
            
            assert response.status_code == 400
            assert "Cannot resume a permanently closed session" in response.json()["detail"]
    
    def test_close_all_sessions_admin_only(self, client, mock_db, mock_user):
        """Test that only admins can close all sessions"""
        with patch('app.api.sessions.get_db', return_value=mock_db), \
             patch('app.api.sessions.get_current_user', return_value=mock_user):
            
            response = client.post("/api/sessions/close-all")
            
            assert response.status_code == 403
            assert "Admin access required" in response.json()["detail"]
    
    def test_close_all_sessions_success(self, client, mock_db, mock_admin_user, sample_session):
        """Test successful bulk session closure"""
        # Create multiple sessions
        session1 = sample_session
        session2 = ProcessingSession()
        session2.session_id = "test-session-2"
        session2.session_name = "Test Session 2"
        session2.status = SessionStatus.COMPLETED
        session2.is_closed = False
        session2.created_by = "DOMAIN\\testuser"
        session2.created_at = datetime.now(timezone.utc)
        session2.updated_at = datetime.now(timezone.utc)
        session2.total_employees = 5
        session2.processed_employees = 5
        session2.processing_options = {}
        session2.delta_session_id = None
        session2.closure_reason = None
        session2.closed_by = None
        session2.closed_at = None
        
        sessions = [session1, session2]
        mock_db.query.return_value.filter.return_value.all.return_value = sessions
        
        with patch('app.api.sessions.get_db', return_value=mock_db), \
             patch('app.api.sessions.get_current_user', return_value=mock_admin_user):
            
            response = client.post(
                "/api/sessions/close-all",
                json={"closure_reason": "Bulk test closure"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["closed_count"] == 2
            assert "Permanently closed 2 sessions successfully" in data["message"]
            
            # Verify both sessions were closed
            for session in sessions:
                assert session.is_closed == True
                assert session.status == SessionStatus.CLOSED
                assert session.closed_by == mock_admin_user.username
                assert session.closure_reason == "Bulk test closure"
                assert session.closed_at is not None
    
    def test_session_response_includes_closure_fields(self, sample_session):
        """Test that session response includes closure tracking fields"""
        from app.api.sessions import convert_session_to_response
        
        # Test with closed session
        sample_session.is_closed = True
        sample_session.closure_reason = "Test closure"
        sample_session.closed_by = "testuser"
        sample_session.closed_at = datetime.now(timezone.utc)
        
        response = convert_session_to_response(sample_session)
        
        assert response.is_closed == True
        assert response.closure_reason == "Test closure"
        assert response.closed_by == "testuser"
        assert response.closed_at is not None
    
    def test_session_response_handles_missing_closure_fields(self, sample_session):
        """Test that session response handles missing closure fields gracefully"""
        from app.api.sessions import convert_session_to_response
        
        # Test with session that doesn't have closure fields (backward compatibility)
        response = convert_session_to_response(sample_session)
        
        assert response.is_closed == False
        assert response.closure_reason is None
        assert response.closed_by is None
        assert response.closed_at is None


class TestSessionClosureIntegration:
    """Integration tests for session closure functionality"""
    
    def test_closed_sessions_not_in_active_list(self):
        """Test that closed sessions are properly filtered from active sessions list"""
        # This would be an integration test that verifies the /api/sessions/active
        # endpoint properly handles closed sessions
        pass
    
    def test_closed_sessions_in_status_filter(self):
        """Test that closed sessions appear in status filter"""
        # This would test that the frontend can filter by closed status
        pass


if __name__ == "__main__":
    pytest.main([__file__])

