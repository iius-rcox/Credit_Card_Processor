"""
Comprehensive test suite for Session Management APIs
Tests all endpoints with authentication, authorization, validation, and error handling
"""

import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import Mock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, UserInfo
from app.models import ProcessingSession, SessionStatus, EmployeeRevision, ProcessingActivity, FileUpload, ValidationStatus, ActivityType, FileType
from app.schemas import SessionCreateRequest, ProcessingOptions, SessionStatusResponse
from app.api.sessions import router as sessions_router


# Create a test app without middleware that causes issues
def create_test_app():
    """Create a test FastAPI app without problematic middleware"""
    test_app = FastAPI(title="Test API")
    test_app.include_router(sessions_router)
    return test_app


# Test client
test_app = create_test_app()
client = TestClient(test_app)


# Mock database session
@pytest.fixture
def mock_db():
    """Mock database session for testing"""
    db_mock = Mock(spec=Session)
    return db_mock


# Mock user fixtures
@pytest.fixture
def mock_admin_user():
    """Mock admin user for testing"""
    return UserInfo(
        username="rcox",
        is_admin=True,
        is_authenticated=True,
        auth_method="test",
        timestamp=datetime.now(timezone.utc)
    )


@pytest.fixture
def mock_regular_user():
    """Mock regular user for testing"""
    return UserInfo(
        username="testuser",
        is_admin=False,
        is_authenticated=True,
        auth_method="test",
        timestamp=datetime.now(timezone.utc)
    )


# Helper function to create properly mocked sessions
def create_mock_session(session_name="Test Session", created_by="DOMAIN\\rcox", session_id=None):
    """Create a properly mocked session with all required attributes"""
    session = Mock()
    session.session_id = session_id or uuid.uuid4()
    session.session_name = session_name
    session.created_by = created_by
    session.status = SessionStatus.PENDING
    session.total_employees = 0
    session.processed_employees = 0
    session.processing_options = {"skip_duplicates": True, "validation_threshold": 0.05}
    session.delta_session_id = None
    session.created_at = datetime.now(timezone.utc)
    session.updated_at = datetime.now(timezone.utc)
    return session


# Mock processing session
@pytest.fixture
def mock_session():
    """Mock processing session for testing"""
    return create_mock_session()


class TestCreateSession:
    """Test cases for POST /api/sessions endpoint"""

    def test_create_session_success(self, mock_db, mock_admin_user, mock_session):
        """Test successful session creation"""
        # Setup mocks
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.rollback.return_value = None
        
        # Mock refresh to set up the session with proper attributes
        def mock_refresh(session):
            session.session_id = mock_session.session_id
            session.created_at = mock_session.created_at
            session.updated_at = mock_session.updated_at
            session.total_employees = mock_session.total_employees
            session.processed_employees = mock_session.processed_employees
        
        mock_db.refresh.side_effect = mock_refresh
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Test data
        request_data = {
            "session_name": "Test Session",
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05,
                "auto_resolve_minor": False
            }
        }
        
        # Make request
        response = client.post("/api/sessions", json=request_data)
        
        # Verify response
        assert response.status_code == 201
        data = response.json()
        assert "session_id" in data
        assert data["session_name"] == "Test Session"
        assert data["status"] == "pending"
        assert data["created_by"] == "DOMAIN\\rcox"
        assert data["total_employees"] == 0
        assert data["processed_employees"] == 0
        
        # Verify database operations
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_create_session_validation_error(self, mock_db, mock_admin_user):
        """Test session creation with invalid data"""
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Test data with empty session name
        request_data = {
            "session_name": "",
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05
            }
        }
        
        # Make request
        response = client.post("/api/sessions", json=request_data)
        
        # Verify error response
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        
        # Verify database rollback
        mock_db.rollback.assert_not_called()  # Validation happens before DB operations
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_create_session_with_delta(self, mock_db, mock_admin_user, mock_session):
        """Test session creation with delta session reference"""
        # Setup mocks
        delta_session_id = str(uuid.uuid4())
        delta_session = Mock()
        delta_session.session_id = uuid.UUID(delta_session_id)
        delta_session.created_by = "DOMAIN\\rcox"
        
        mock_db.query.return_value.filter.return_value.first.return_value = delta_session
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.rollback.return_value = None
        
        # Mock refresh to set up the session with proper attributes
        def mock_refresh(session):
            session.session_id = mock_session.session_id
            session.created_at = mock_session.created_at
            session.updated_at = mock_session.updated_at
            session.total_employees = mock_session.total_employees
            session.processed_employees = mock_session.processed_employees
        
        mock_db.refresh.side_effect = mock_refresh
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Test data
        request_data = {
            "session_name": "Delta Test Session",
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05
            },
            "delta_session_id": delta_session_id
        }
        
        # Make request
        response = client.post("/api/sessions", json=request_data)
        
        # Verify response
        assert response.status_code == 201
        data = response.json()
        assert data["session_name"] == "Delta Test Session"
        
        # Verify database query for delta session
        mock_db.query.assert_called()
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_create_session_delta_not_found(self, mock_db, mock_admin_user):
        """Test session creation with non-existent delta session"""
        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.rollback.return_value = None
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Test data
        request_data = {
            "session_name": "Test Session",
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05
            },
            "delta_session_id": str(uuid.uuid4())
        }
        
        # Make request
        response = client.post("/api/sessions", json=request_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.json()
        assert "not found" in data["detail"]
        
        # Verify database rollback
        mock_db.rollback.assert_called_once()
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_create_session_invalid_delta_uuid(self, mock_db, mock_admin_user):
        """Test session creation with invalid delta session UUID"""
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Test data
        request_data = {
            "session_name": "Test Session",
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05
            },
            "delta_session_id": "invalid-uuid"
        }
        
        # Make request
        response = client.post("/api/sessions", json=request_data)
        
        # Verify error response
        assert response.status_code == 422  # Pydantic validation error
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_create_session_unauthenticated(self, mock_db):
        """Test session creation without authentication"""
        # Mock dependencies (no user)
        test_app.dependency_overrides[get_db] = lambda: mock_db
        
        # Test data
        request_data = {
            "session_name": "Test Session",
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05
            }
        }
        
        # Make request
        response = client.post("/api/sessions", json=request_data)
        
        # Verify authentication error
        assert response.status_code == 401
        
        # Cleanup
        test_app.dependency_overrides.clear()


class TestGetSession:
    """Test cases for GET /api/sessions/{session_id} endpoint"""

    def test_get_session_success(self, mock_db, mock_admin_user, mock_session):
        """Test successful session retrieval"""
        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.return_value = mock_session
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(mock_session.session_id)
        response = client.get(f"/api/sessions/{session_id}")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id
        assert data["session_name"] == mock_session.session_name
        assert data["status"] == mock_session.status.value
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_session_not_found(self, mock_db, mock_admin_user):
        """Test retrieval of non-existent session"""
        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(uuid.uuid4())
        response = client.get(f"/api/sessions/{session_id}")
        
        # Verify error response
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"]
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_session_invalid_uuid(self, mock_db, mock_admin_user):
        """Test retrieval with invalid session UUID"""
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request with invalid UUID
        response = client.get("/api/sessions/invalid-uuid")
        
        # Verify error response
        assert response.status_code == 400
        data = response.json()
        assert "Invalid session ID format" in data["detail"]
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_session_access_denied(self, mock_db, mock_regular_user, mock_session):
        """Test access denied for non-admin user accessing others' sessions"""
        # Setup mocks - session created by different user
        other_session = create_mock_session("Other Session", "DOMAIN\\otheradmin")
        mock_db.query.return_value.filter.return_value.first.return_value = other_session
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_regular_user
        
        # Make request
        session_id = str(other_session.session_id)
        response = client.get(f"/api/sessions/{session_id}")
        
        # Verify access denied
        assert response.status_code == 403
        data = response.json()
        assert "Access denied" in data["detail"]
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_session_user_own_session(self, mock_db, mock_regular_user, mock_session):
        """Test user can access their own session"""
        # Setup mocks - session created by same user
        user_session = create_mock_session("User's Own Session", "DOMAIN\\testuser")
        mock_db.query.return_value.filter.return_value.first.return_value = user_session
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_regular_user
        
        # Make request
        session_id = str(user_session.session_id)
        response = client.get(f"/api/sessions/{session_id}")
        
        # Verify success
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_session_unauthenticated(self, mock_db):
        """Test session retrieval without authentication"""
        # Mock dependencies (no user)
        test_app.dependency_overrides[get_db] = lambda: mock_db
        
        # Make request
        session_id = str(uuid.uuid4())
        response = client.get(f"/api/sessions/{session_id}")
        
        # Verify authentication error
        assert response.status_code == 401
        
        # Cleanup
        test_app.dependency_overrides.clear()


class TestListSessions:
    """Test cases for GET /api/sessions endpoint"""

    def test_list_sessions_admin_success(self, mock_db, mock_admin_user):
        """Test admin user can list all sessions"""
        # Setup mocks
        mock_sessions = [
            create_mock_session("Session 1", "DOMAIN\\rcox"),
            create_mock_session("Session 2", "DOMAIN\\testuser")
        ]
        mock_db.query.return_value.order_by.return_value.count.return_value = 2
        mock_db.query.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_sessions
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        response = client.get("/api/sessions")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "total_count" in data
        assert "page" in data
        assert "page_size" in data
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_list_sessions_regular_user_filtered(self, mock_db, mock_regular_user):
        """Test regular user only sees their own sessions"""
        # Setup mocks
        mock_sessions = [create_mock_session("User Session", "DOMAIN\\testuser")]
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.offset.return_value.limit.return_value.all.return_value = mock_sessions
        mock_db.query.return_value = mock_query
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_regular_user
        
        # Make request
        response = client.get("/api/sessions")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        
        # Verify filtering was applied for non-admin user
        mock_query.filter.assert_called()
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_list_sessions_with_pagination(self, mock_db, mock_admin_user):
        """Test session listing with pagination parameters"""
        # Setup mocks
        mock_sessions = [create_mock_session("Paginated Session", "DOMAIN\\rcox")]
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.offset.return_value.limit.return_value.all.return_value = mock_sessions
        mock_db.query.return_value = mock_query
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request with pagination
        response = client.get("/api/sessions?page=2&page_size=10")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["page_size"] == 10
        
        # Verify offset was calculated correctly (page 2, size 10 = offset 10)
        mock_query.offset.assert_called_with(10)
        mock_query.offset.return_value.limit.assert_called_with(10)
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_list_sessions_with_status_filter(self, mock_db, mock_admin_user):
        """Test session listing with status filter"""
        # Setup mocks
        mock_sessions = [create_mock_session("Filtered Session", "DOMAIN\\rcox")]
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.offset.return_value.limit.return_value.all.return_value = mock_sessions
        mock_db.query.return_value = mock_query
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request with status filter
        response = client.get("/api/sessions?status_filter=completed")
        
        # Verify response
        assert response.status_code == 200
        
        # Verify filter was applied
        mock_query.filter.assert_called()
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_list_sessions_unauthenticated(self, mock_db):
        """Test session listing without authentication"""
        # Mock dependencies (no user)
        test_app.dependency_overrides[get_db] = lambda: mock_db
        
        # Make request
        response = client.get("/api/sessions")
        
        # Verify authentication error
        assert response.status_code == 401
        
        # Cleanup
        test_app.dependency_overrides.clear()


class TestSessionPermissions:
    """Test cases for session access control logic"""

    def test_check_session_access_admin(self):
        """Test admin user has access to any session"""
        from app.api.sessions import check_session_access
        
        # Create mock session and admin user
        mock_session = Mock()
        mock_session.created_by = "DOMAIN\\otheradmin"
        
        admin_user = UserInfo(
            username="rcox",
            is_admin=True,
            is_authenticated=True,
            auth_method="test",
            timestamp=datetime.now(timezone.utc)
        )
        
        # Test access
        assert check_session_access(mock_session, admin_user) == True

    def test_check_session_access_owner(self):
        """Test user has access to their own session"""
        from app.api.sessions import check_session_access
        
        # Create mock session and user
        mock_session = Mock()
        mock_session.created_by = "DOMAIN\\testuser"
        
        regular_user = UserInfo(
            username="testuser",
            is_admin=False,
            is_authenticated=True,
            auth_method="test",
            timestamp=datetime.now(timezone.utc)
        )
        
        # Test access
        assert check_session_access(mock_session, regular_user) == True

    def test_check_session_access_denied(self):
        """Test user cannot access others' sessions"""
        from app.api.sessions import check_session_access
        
        # Create mock session and user
        mock_session = Mock()
        mock_session.created_by = "DOMAIN\\otheradmin"
        
        regular_user = UserInfo(
            username="testuser",
            is_admin=False,
            is_authenticated=True,
            auth_method="test",
            timestamp=datetime.now(timezone.utc)
        )
        
        # Test access
        assert check_session_access(mock_session, regular_user) == False

    def test_check_session_access_case_insensitive(self):
        """Test session access is case insensitive"""
        from app.api.sessions import check_session_access
        
        # Create mock session and user with different cases
        mock_session = Mock()
        mock_session.created_by = "DOMAIN\\TestUser"
        
        regular_user = UserInfo(
            username="testuser",
            is_admin=False,
            is_authenticated=True,
            auth_method="test",
            timestamp=datetime.now(timezone.utc)
        )
        
        # Test access
        assert check_session_access(mock_session, regular_user) == True


class TestGetSessionStatus:
    """Test cases for GET /api/sessions/{session_id}/status endpoint"""

    def create_mock_employee_revision(self, session_id, employee_id="EMP123", employee_name="John Smith", validation_status=ValidationStatus.VALID):
        """Create a mock employee revision"""
        revision = Mock()
        revision.revision_id = uuid.uuid4()
        revision.session_id = session_id
        revision.employee_id = employee_id
        revision.employee_name = employee_name
        revision.validation_status = validation_status
        revision.created_at = datetime.now(timezone.utc)
        revision.updated_at = datetime.now(timezone.utc)
        return revision

    def create_mock_activity(self, session_id, activity_type=ActivityType.PROCESSING, employee_id="EMP123", message="Processing employee"):
        """Create a mock processing activity"""
        activity = Mock()
        activity.activity_id = uuid.uuid4()
        activity.session_id = session_id
        activity.activity_type = activity_type
        activity.activity_message = message
        activity.employee_id = employee_id
        activity.created_at = datetime.now(timezone.utc)
        activity.created_by = "SYSTEM"
        return activity

    def create_mock_file_upload(self, session_id, file_type=FileType.CAR, filename="test.pdf"):
        """Create a mock file upload"""
        upload = Mock()
        upload.upload_id = uuid.uuid4()
        upload.session_id = session_id
        upload.file_type = file_type
        upload.original_filename = filename
        upload.uploaded_at = datetime.now(timezone.utc)
        upload.uploaded_by = "DOMAIN\\rcox"
        return upload

    def test_get_status_pending_session(self, mock_db, mock_admin_user, mock_session):
        """Test status endpoint for pending session"""
        # Setup session
        mock_session.status = SessionStatus.PENDING
        mock_session.total_employees = 0
        
        # Setup comprehensive mock database responses for all queries
        def mock_query_side_effect(*args, **kwargs):
            query_mock = Mock()
            if args and args[0] == ProcessingSession:
                # Session query
                query_mock.filter.return_value.first.return_value = mock_session
                return query_mock
            elif args and len(args) == 2:
                # Employee counts query (EmployeeRevision.validation_status, func.count(...))
                query_mock.filter.return_value.group_by.return_value.all.return_value = []
                return query_mock
            else:
                # All other queries (activities, files, etc.)
                query_mock.filter.return_value.first.return_value = None
                query_mock.filter.return_value.all.return_value = []
                query_mock.filter.return_value.order_by.return_value.first.return_value = None
                query_mock.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
                return query_mock
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(mock_session.session_id)
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        # Check basic fields
        assert data["session_id"] == session_id
        assert data["session_name"] == mock_session.session_name
        assert data["status"] == "pending"
        assert data["created_by"] == mock_session.created_by
        
        # Check progress fields for pending session
        assert data["total_employees"] == 0
        assert data["percent_complete"] == 0
        assert data["completed_employees"] == 0
        assert data["processing_employees"] == 0
        assert data["issues_employees"] == 0
        assert data["pending_employees"] == 0
        assert data["current_employee"] is None
        assert data["estimated_time_remaining"] is None
        assert data["processing_start_time"] is None
        assert data["files_uploaded"] is None
        assert data["recent_activities"] == []
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_processing_session(self, mock_db, mock_admin_user, mock_session):
        """Test status endpoint for actively processing session"""
        # Setup processing session
        mock_session.status = SessionStatus.PROCESSING
        mock_session.total_employees = 50
        
        # Mock employee counts query
        mock_counts = [
            (ValidationStatus.VALID, 30),  # completed
            (ValidationStatus.NEEDS_ATTENTION, 5)  # issues
        ]
        
        # Create mock employee for current processing
        current_employee = self.create_mock_employee_revision(mock_session.session_id)
        
        # Create mock activity
        current_activity = self.create_mock_activity(mock_session.session_id)
        first_activity = self.create_mock_activity(mock_session.session_id)
        first_activity.created_at = datetime.now(timezone.utc).replace(hour=10, minute=0, second=0)
        
        # Create mock file uploads
        car_file = self.create_mock_file_upload(mock_session.session_id, FileType.CAR, "car_docs.pdf")
        receipt_file = self.create_mock_file_upload(mock_session.session_id, FileType.RECEIPT, "receipts.pdf")
        
        # Setup database mocks with proper call ordering
        def mock_query_side_effect(*args, **kwargs):
            query_mock = Mock()
            if args and args[0] == ProcessingSession:
                # Session query
                query_mock.filter.return_value.first.return_value = mock_session
                return query_mock
            elif args and len(args) == 2 and hasattr(args[1], 'label'):
                # Employee counts query (EmployeeRevision.validation_status, func.count(...))
                query_mock.filter.return_value.group_by.return_value.all.return_value = mock_counts
                return query_mock
            elif args and args[0] == ProcessingActivity:
                # Activity queries - return different results based on order/filter
                if hasattr(query_mock, 'order_by'):
                    order_mock = Mock()
                    if 'desc' in str(query_mock.order_by):
                        # Recent activity query (desc order)
                        order_mock.first.return_value = current_activity
                        order_mock.limit.return_value.all.return_value = [current_activity]
                        query_mock.filter.return_value.order_by.return_value = order_mock
                    else:
                        # First activity query (asc order)  
                        order_mock.first.return_value = first_activity
                        query_mock.filter.return_value.order_by.return_value = order_mock
                    return query_mock
                else:
                    query_mock.filter.return_value.order_by.return_value.first.return_value = current_activity
                    query_mock.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [current_activity]
                    return query_mock
            elif args and args[0] == EmployeeRevision:
                # Employee details query
                query_mock.filter.return_value.first.return_value = current_employee
                return query_mock
            elif args and args[0] == FileUpload:
                # File uploads query
                query_mock.filter.return_value.all.return_value = [car_file, receipt_file]
                return query_mock
            
            return query_mock
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(mock_session.session_id)
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        # Check basic fields
        assert data["session_id"] == session_id
        assert data["status"] == "processing"
        
        # Check progress calculations
        assert data["total_employees"] == 50
        assert data["completed_employees"] == 30
        assert data["issues_employees"] == 5
        assert data["pending_employees"] == 15  # 50 - 30 - 5 - 0
        assert data["processing_employees"] == 0
        assert data["percent_complete"] == 60  # 30/50 * 100
        
        # Check current employee
        assert data["current_employee"] is not None
        assert data["current_employee"]["employee_id"] == "EMP123"
        assert data["current_employee"]["employee_name"] == "John Smith"
        assert data["current_employee"]["processing_stage"] == "processing"
        
        # Check time estimates
        assert data["estimated_time_remaining"] is not None
        assert data["processing_start_time"] is not None
        
        # Check files
        assert data["files_uploaded"] is not None
        assert data["files_uploaded"]["car_file"] == "car_docs.pdf"
        assert data["files_uploaded"]["receipt_file"] == "receipts.pdf"
        
        # Check activities
        assert len(data["recent_activities"]) == 1
        assert data["recent_activities"][0]["employee_id"] == "EMP123"
        assert data["recent_activities"][0]["activity_type"] == "processing"
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_completed_session(self, mock_db, mock_admin_user, mock_session):
        """Test status endpoint for completed session"""
        # Setup completed session
        mock_session.status = SessionStatus.COMPLETED
        mock_session.total_employees = 25
        
        # Mock employee counts - all completed
        mock_counts = [(ValidationStatus.VALID, 25)]
        
        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.return_value = mock_session
        mock_db.query.return_value.filter.return_value.group_by.return_value.all.return_value = mock_counts
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(mock_session.session_id)
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "completed"
        assert data["total_employees"] == 25
        assert data["completed_employees"] == 25
        assert data["percent_complete"] == 100
        assert data["pending_employees"] == 0
        assert data["current_employee"] is None
        assert data["estimated_time_remaining"] is None
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_failed_session(self, mock_db, mock_admin_user, mock_session):
        """Test status endpoint for failed session"""
        # Setup failed session
        mock_session.status = SessionStatus.FAILED
        mock_session.total_employees = 10
        
        # Mock partial completion
        mock_counts = [(ValidationStatus.VALID, 3), (ValidationStatus.NEEDS_ATTENTION, 2)]
        
        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.return_value = mock_session
        mock_db.query.return_value.filter.return_value.group_by.return_value.all.return_value = mock_counts
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(mock_session.session_id)
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "failed"
        assert data["total_employees"] == 10
        assert data["completed_employees"] == 3
        assert data["issues_employees"] == 2
        assert data["pending_employees"] == 5
        assert data["percent_complete"] == 30  # 3/10 * 100
        assert data["current_employee"] is None
        assert data["estimated_time_remaining"] is None
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_not_found(self, mock_db, mock_admin_user):
        """Test status endpoint for non-existent session"""
        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(uuid.uuid4())
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify error response
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"]
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_invalid_uuid(self, mock_db, mock_admin_user):
        """Test status endpoint with invalid UUID"""
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request with invalid UUID
        response = client.get("/api/sessions/invalid-uuid/status")
        
        # Verify error response
        assert response.status_code == 400
        data = response.json()
        assert "Invalid session ID format" in data["detail"]
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_access_denied(self, mock_db, mock_regular_user, mock_session):
        """Test status access denied for unauthorized user"""
        # Setup session from different user
        other_session = create_mock_session("Other Session", "DOMAIN\\otheradmin")
        mock_db.query.return_value.filter.return_value.first.return_value = other_session
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_regular_user
        
        # Make request
        session_id = str(other_session.session_id)
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify access denied
        assert response.status_code == 403
        data = response.json()
        assert "Access denied" in data["detail"]
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_unauthenticated(self, mock_db):
        """Test status endpoint without authentication"""
        # Mock dependencies (no user)
        test_app.dependency_overrides[get_db] = lambda: mock_db
        
        # Make request
        session_id = str(uuid.uuid4())
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify authentication error
        assert response.status_code == 401
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_with_recent_activities(self, mock_db, mock_admin_user, mock_session):
        """Test status endpoint includes recent activities"""
        # Setup session
        mock_session.status = SessionStatus.PROCESSING
        mock_session.total_employees = 10
        
        # Create multiple mock activities
        activities = [
            self.create_mock_activity(mock_session.session_id, ActivityType.PROCESSING, "EMP001", "Processing employee EMP001"),
            self.create_mock_activity(mock_session.session_id, ActivityType.VALIDATION, "EMP002", "Validating employee EMP002"),
            self.create_mock_activity(mock_session.session_id, ActivityType.RESOLUTION, "EMP003", "Resolving issues for EMP003"),
        ]
        
        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.return_value = mock_session
        mock_db.query.return_value.filter.return_value.group_by.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = activities
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(mock_session.session_id)
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        # Check activities
        assert len(data["recent_activities"]) == 3
        assert data["recent_activities"][0]["employee_id"] == "EMP001"
        assert data["recent_activities"][0]["activity_type"] == "processing"
        assert data["recent_activities"][1]["employee_id"] == "EMP002"
        assert data["recent_activities"][1]["activity_type"] == "validation"
        assert data["recent_activities"][2]["employee_id"] == "EMP003"
        assert data["recent_activities"][2]["activity_type"] == "resolution"
        
        # Cleanup
        test_app.dependency_overrides.clear()

    def test_get_status_performance_optimized(self, mock_db, mock_admin_user, mock_session):
        """Test status endpoint performance with minimal database calls"""
        # Setup session
        mock_session.status = SessionStatus.PROCESSING
        mock_session.total_employees = 100
        
        # Setup mocks to track query calls
        query_call_count = 0
        
        def track_query_calls(*args, **kwargs):
            nonlocal query_call_count
            query_call_count += 1
            query_mock = Mock()
            query_mock.filter.return_value.first.return_value = mock_session
            query_mock.filter.return_value.group_by.return_value.all.return_value = []
            query_mock.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
            query_mock.filter.return_value.all.return_value = []
            return query_mock
        
        mock_db.query.side_effect = track_query_calls
        
        # Mock dependencies
        test_app.dependency_overrides[get_db] = lambda: mock_db
        test_app.dependency_overrides[get_current_user] = lambda: mock_admin_user
        
        # Make request
        session_id = str(mock_session.session_id)
        response = client.get(f"/api/sessions/{session_id}/status")
        
        # Verify response
        assert response.status_code == 200
        
        # Verify reasonable number of database queries (should be optimized)
        # Expecting: session query, employee counts, current employee, activities, files, time calc
        assert query_call_count <= 10  # Should be optimized for performance
        
        # Cleanup
        test_app.dependency_overrides.clear()


class TestStatusUtilityFunctions:
    """Test cases for status calculation utility functions"""

    def test_calculate_progress_statistics(self, mock_db):
        """Test progress statistics calculation"""
        from app.api.sessions import calculate_progress_statistics
        
        # Create mock session
        mock_session = Mock()
        mock_session.session_id = uuid.uuid4()
        mock_session.total_employees = 50
        mock_session.status = SessionStatus.PROCESSING
        
        # Mock employee counts
        mock_counts = [
            (ValidationStatus.VALID, 20),
            (ValidationStatus.NEEDS_ATTENTION, 5),
            (ValidationStatus.RESOLVED, 10)
        ]
        
        mock_db.query.return_value.filter.return_value.group_by.return_value.all.return_value = mock_counts
        
        # Calculate stats
        stats = calculate_progress_statistics(mock_session, mock_db)
        
        # Verify calculations
        assert stats['total_employees'] == 50
        assert stats['completed_employees'] == 30  # 20 + 10 (valid + resolved)
        assert stats['issues_employees'] == 5
        assert stats['pending_employees'] == 15  # 50 - 30 - 5 - 0
        assert stats['percent_complete'] == 60  # 30/50 * 100

    def test_get_current_employee_processing(self, mock_db):
        """Test current employee detection for processing session"""
        from app.api.sessions import get_current_employee
        
        # Create processing session
        mock_session = Mock()
        mock_session.session_id = uuid.uuid4()
        mock_session.status = SessionStatus.PROCESSING
        
        # Create mock activity and employee
        mock_activity = Mock()
        mock_activity.employee_id = "EMP123"
        mock_activity.activity_type = ActivityType.PROCESSING
        
        mock_employee = Mock()
        mock_employee.employee_id = "EMP123"
        mock_employee.employee_name = "Jane Doe"
        
        # Setup query mocks
        def query_side_effect(*args, **kwargs):
            query_mock = Mock()
            if args[0] == ProcessingActivity:
                query_mock.filter.return_value.order_by.return_value.first.return_value = mock_activity
            elif args[0] == EmployeeRevision:
                query_mock.filter.return_value.first.return_value = mock_employee
            return query_mock
        
        mock_db.query.side_effect = query_side_effect
        
        # Get current employee
        current = get_current_employee(mock_session, mock_db)
        
        # Verify result
        assert current is not None
        assert current.employee_id == "EMP123"
        assert current.employee_name == "Jane Doe"
        assert current.processing_stage == "processing"

    def test_get_current_employee_not_processing(self, mock_db):
        """Test current employee for non-processing session"""
        from app.api.sessions import get_current_employee
        
        # Create non-processing session
        mock_session = Mock()
        mock_session.session_id = uuid.uuid4()
        mock_session.status = SessionStatus.COMPLETED
        
        # Get current employee
        current = get_current_employee(mock_session, mock_db)
        
        # Should return None for non-processing session
        assert current is None

    def test_estimate_remaining_time(self, mock_db):
        """Test time estimation calculation"""
        from app.api.sessions import estimate_remaining_time
        
        # Create session and stats
        mock_session = Mock()
        mock_session.session_id = uuid.uuid4()
        mock_session.status = SessionStatus.PROCESSING
        
        progress_stats = {
            'total_employees': 100,
            'completed_employees': 25,
            'pending_employees': 60,
            'issues_employees': 15
        }
        
        # Create mock first activity (1 hour ago)
        mock_activity = Mock()
        mock_activity.created_at = datetime.now(timezone.utc).replace(hour=datetime.now(timezone.utc).hour-1)
        
        mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_activity
        
        # Estimate time
        estimated = estimate_remaining_time(mock_session, progress_stats, mock_db)
        
        # Should return a time estimate
        assert estimated is not None
        assert ":" in estimated  # Should be in HH:MM:SS format
        parts = estimated.split(":")
        assert len(parts) == 3  # HH:MM:SS


# Integration tests that would require a real database (commented out for now)
"""
class TestSessionIntegration:
    '''Integration tests with real database (requires test database setup)'''
    
    @pytest.mark.integration
    def test_create_and_retrieve_session_integration(self):
        '''Test full create and retrieve flow with real database'''
        # Would test actual database persistence
        pass
    
    @pytest.mark.integration 
    def test_session_concurrent_access(self):
        '''Test concurrent session access'''
        # Would test race conditions and locking
        pass
"""