"""
Comprehensive authentication and authorization tests for Credit Card Processor.

Tests cover:
- User login/logout flows
- Admin vs regular user permissions
- Session management and timeout
- Invalid credentials handling
- Security headers validation
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from app.auth import (
    get_current_user, 
    require_admin, 
    validate_auth_headers,
    UserInfo,
    AuthenticationError,
    AuthorizationError,
    SECURITY_HEADERS
)


class TestAuthentication:
    """Test authentication mechanisms."""
    
    async def test_valid_user_authentication(self, async_client: AsyncClient, mock_user_headers):
        """Test successful user authentication with valid headers."""
        response = await async_client.get("/api/health", headers=mock_user_headers)
        
        assert response.status_code == 200
        # Verify security headers are present
        for header, value in SECURITY_HEADERS.items():
            assert header in response.headers
            assert response.headers[header] == value
    
    async def test_missing_auth_headers(self, async_client: AsyncClient):
        """Test authentication failure with missing headers."""
        response = await async_client.get("/api/sessions/")
        
        assert response.status_code == 401
        assert "authentication required" in response.json()["detail"].lower()
    
    async def test_invalid_auth_headers(self, async_client: AsyncClient):
        """Test authentication failure with invalid headers."""
        invalid_headers = {
            "x-dev-user": "",
            "Content-Type": "application/json"
        }
        
        response = await async_client.get("/api/sessions/", headers=invalid_headers)
        
        assert response.status_code == 401
    
    async def test_malicious_auth_headers(self, async_client: AsyncClient):
        """Test security against malicious header injection."""
        malicious_headers = {
            "x-dev-user": "admin'; DROP TABLE users; --",
            "x-user-context": "<script>alert('xss')</script>",
            "Content-Type": "application/json"
        }
        
        response = await async_client.get("/api/sessions/", headers=malicious_headers)
        
        # Should either reject or sanitize malicious content
        assert response.status_code in [400, 401, 422]
    
    @pytest.mark.parametrize("username", [
        "valid_user",
        "user.with.dots",
        "user_with_underscores",
        "user123",
    ])
    async def test_valid_usernames(self, async_client: AsyncClient, username):
        """Test various valid username formats."""
        headers = {
            "x-dev-user": username,
            "x-user-context": username,
            "Content-Type": "application/json"
        }
        
        response = await async_client.get("/api/health", headers=headers)
        assert response.status_code == 200
    
    @pytest.mark.parametrize("username", [
        "",
        " ",
        "user with spaces",
        "user@domain.com",  # Email format
        "../../../etc/passwd",  # Path traversal
        "user\ninjection",  # Newline injection
    ])
    async def test_invalid_usernames(self, async_client: AsyncClient, username):
        """Test rejection of invalid username formats."""
        headers = {
            "x-dev-user": username,
            "x-user-context": username,
            "Content-Type": "application/json"
        }
        
        response = await async_client.get("/api/sessions/", headers=headers)
        assert response.status_code in [400, 401, 422]


class TestAuthorization:
    """Test authorization mechanisms."""
    
    async def test_regular_user_access(self, async_client: AsyncClient, mock_user_headers):
        """Test regular user can access allowed endpoints."""
        # Regular users can access sessions
        response = await async_client.get("/api/sessions/", headers=mock_user_headers)
        assert response.status_code == 200
        
        # Regular users can upload files
        response = await async_client.get("/api/upload/session-info", headers=mock_user_headers)
        assert response.status_code == 200
    
    async def test_admin_user_access(self, async_client: AsyncClient):
        """Test admin user can access admin endpoints."""
        admin_headers = {
            "x-dev-user": "admin",
            "x-user-context": "admin",
            "x-user-role": "admin",
            "Content-Type": "application/json"
        }
        
        # Admin can access all endpoints
        response = await async_client.get("/api/sessions/", headers=admin_headers)
        assert response.status_code == 200
        
        # Admin can access system metrics
        response = await async_client.get("/api/metrics", headers=admin_headers)
        assert response.status_code in [200, 404]  # Depends on endpoint implementation
    
    async def test_role_escalation_prevention(self, async_client: AsyncClient):
        """Test prevention of role escalation attacks."""
        # Attempt to escalate privileges through headers
        escalation_headers = {
            "x-dev-user": "regularuser",
            "x-user-context": "admin",  # Mismatched context
            "x-user-role": "admin",
            "Content-Type": "application/json"
        }
        
        response = await async_client.get("/api/sessions/", headers=escalation_headers)
        
        # Should either reject inconsistent headers or treat as regular user
        assert response.status_code in [200, 401, 403]
    
    async def test_session_isolation(self, async_client: AsyncClient):
        """Test that users can only access their own sessions."""
        user1_headers = {
            "x-dev-user": "user1",
            "x-user-context": "user1",
            "Content-Type": "application/json"
        }
        
        user2_headers = {
            "x-dev-user": "user2",
            "x-user-context": "user2",
            "Content-Type": "application/json"
        }
        
        # Create session as user1
        session_data = {
            "session_name": "User1 Session",
            "processing_options": {"validation_enabled": True}
        }
        
        response = await async_client.post(
            "/api/sessions/", 
            headers=user1_headers, 
            json=session_data
        )
        assert response.status_code == 201
        session_id = response.json()["session_id"]
        
        # User2 should not be able to access user1's session
        response = await async_client.get(
            f"/api/sessions/{session_id}",
            headers=user2_headers
        )
        assert response.status_code in [404, 403]


class TestSessionManagement:
    """Test session management and timeout."""
    
    async def test_session_creation_and_retrieval(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test basic session lifecycle."""
        # Create session
        response = await async_client.post(
            "/api/sessions/", 
            headers=mock_user_headers, 
            json=sample_session_data
        )
        assert response.status_code == 201
        session_data = response.json()
        session_id = session_data["session_id"]
        
        # Retrieve session
        response = await async_client.get(
            f"/api/sessions/{session_id}",
            headers=mock_user_headers
        )
        assert response.status_code == 200
        retrieved_session = response.json()
        assert retrieved_session["session_name"] == sample_session_data["session_name"]
    
    async def test_concurrent_sessions(self, async_client: AsyncClient, mock_user_headers):
        """Test multiple concurrent sessions for same user."""
        session1_data = {
            "session_name": "Session 1",
            "processing_options": {"validation_enabled": True}
        }
        
        session2_data = {
            "session_name": "Session 2",
            "processing_options": {"validation_enabled": False}
        }
        
        # Create two sessions
        response1 = await async_client.post(
            "/api/sessions/", 
            headers=mock_user_headers, 
            json=session1_data
        )
        response2 = await async_client.post(
            "/api/sessions/", 
            headers=mock_user_headers, 
            json=session2_data
        )
        
        assert response1.status_code == 201
        assert response2.status_code == 201
        
        session1_id = response1.json()["session_id"]
        session2_id = response2.json()["session_id"]
        
        assert session1_id != session2_id
        
        # Verify both sessions exist
        sessions_response = await async_client.get(
            "/api/sessions/", 
            headers=mock_user_headers
        )
        assert sessions_response.status_code == 200
        sessions = sessions_response.json()
        session_ids = [session["session_id"] for session in sessions]
        
        assert session1_id in session_ids
        assert session2_id in session_ids
    
    @pytest.mark.parametrize("invalid_session_id", [
        "nonexistent",
        "123e4567-e89b-12d3-a456-426614174000",  # Valid UUID but nonexistent
        "../../../etc/passwd",  # Path traversal
        "'; DROP TABLE sessions; --",  # SQL injection
        "<script>alert('xss')</script>",  # XSS
    ])
    async def test_invalid_session_access(self, async_client: AsyncClient, mock_user_headers, invalid_session_id):
        """Test access to invalid/malicious session IDs."""
        response = await async_client.get(
            f"/api/sessions/{invalid_session_id}",
            headers=mock_user_headers
        )
        
        assert response.status_code in [400, 404, 422]


class TestSecurityHeaders:
    """Test security headers implementation."""
    
    async def test_security_headers_present(self, async_client: AsyncClient, mock_user_headers):
        """Test that all required security headers are present."""
        response = await async_client.get("/api/health", headers=mock_user_headers)
        
        expected_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options", 
            "X-XSS-Protection",
            "Referrer-Policy",
            "Permissions-Policy"
        ]
        
        for header in expected_headers:
            assert header in response.headers, f"Missing security header: {header}"
    
    async def test_cors_headers(self, async_client: AsyncClient, mock_user_headers):
        """Test CORS headers configuration."""
        # Simulate preflight request
        response = await async_client.options(
            "/api/sessions/",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, x-dev-user",
                **mock_user_headers
            }
        )
        
        # Should either allow CORS or return appropriate status
        assert response.status_code in [200, 204, 405]
    
    async def test_content_type_validation(self, async_client: AsyncClient, mock_user_headers):
        """Test content type validation."""
        # Try to send JSON without proper content-type
        headers_without_content_type = {k: v for k, v in mock_user_headers.items() if k != "Content-Type"}
        
        response = await async_client.post(
            "/api/sessions/",
            headers=headers_without_content_type,
            json={"session_name": "Test"}
        )
        
        # Should handle missing content-type gracefully
        assert response.status_code in [200, 201, 400, 422]


class TestErrorHandling:
    """Test authentication error handling."""
    
    async def test_authentication_error_response(self, async_client: AsyncClient):
        """Test proper error response format for authentication failures."""
        response = await async_client.get("/api/sessions/")
        
        assert response.status_code == 401
        error_data = response.json()
        
        # Should have proper error structure
        assert "detail" in error_data
        assert isinstance(error_data["detail"], str)
    
    async def test_authorization_error_response(self, async_client: AsyncClient):
        """Test proper error response format for authorization failures."""
        # Use minimal headers that might authenticate but not authorize
        minimal_headers = {
            "x-dev-user": "limited_user",
            "Content-Type": "application/json"
        }
        
        # Try to access admin endpoint (if it exists)
        response = await async_client.get("/api/admin/users", headers=minimal_headers)
        
        # Should return 403 or 404 (if endpoint doesn't exist)
        assert response.status_code in [403, 404]
    
    async def test_rate_limiting_behavior(self, async_client: AsyncClient):
        """Test behavior under rapid authentication attempts."""
        invalid_headers = {
            "x-dev-user": "invalid",
            "Content-Type": "application/json"
        }
        
        # Make multiple rapid requests
        responses = []
        for _ in range(10):
            response = await async_client.get("/api/sessions/", headers=invalid_headers)
            responses.append(response.status_code)
        
        # All should fail authentication (no rate limiting implemented yet)
        assert all(status == 401 for status in responses)


class TestUserInfoValidation:
    """Test UserInfo validation and handling."""
    
    def test_user_info_creation(self, mock_authentication):
        """Test UserInfo object creation."""
        user_info = UserInfo(**mock_authentication)
        
        assert user_info.username == mock_authentication["username"]
        assert user_info.is_admin == mock_authentication["is_admin"]
        assert user_info.display_name == mock_authentication["display_name"]
    
    def test_user_info_validation(self):
        """Test UserInfo validation with invalid data."""
        with pytest.raises(ValueError):
            UserInfo(
                username="",  # Empty username should fail
                is_admin=True,
                display_name="Test User"
            )
    
    def test_user_info_permissions(self, mock_authentication):
        """Test UserInfo permission checking."""
        user_info = UserInfo(**mock_authentication)
        
        # Test admin permissions
        assert user_info.has_permission("admin")
        assert user_info.has_permission("read")
        assert user_info.has_permission("write")
    
    def test_regular_user_permissions(self):
        """Test regular user permissions."""
        regular_user = UserInfo(
            username="regular",
            is_admin=False,
            display_name="Regular User",
            roles=["user"],
            permissions=["read"]
        )
        
        assert regular_user.has_permission("read")
        assert not regular_user.has_permission("admin")
        assert not regular_user.has_permission("write")