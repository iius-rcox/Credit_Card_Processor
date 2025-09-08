"""
Unit tests for the authentication system
"""
import pytest
from unittest.mock import Mock, patch
from fastapi import Request, HTTPException
from backend.app.auth import (
    get_current_user,
    require_admin,
    validate_auth_headers,
    UserInfo,
    AuthenticationError,
    AuthorizationError
)
from backend.app.config import settings


class TestAuthenticationHeaders:
    """Test authentication header validation"""
    
    def test_validate_auth_headers_with_dev_user(self):
        """Test validation with x-dev-user header"""
        # Mock request with x-dev-user header
        request = Mock(spec=Request)
        request.headers = {"x-dev-user": "testuser"}
        
        result = validate_auth_headers(request)
        
        assert len(result["valid_headers"]) == 1
        assert "x-dev-user" in result["valid_headers"]
        assert result["valid_headers"]["x-dev-user"] == "testuser"
        assert len(result["security_warnings"]) == 0
    
    def test_validate_auth_headers_no_headers(self):
        """Test validation with no auth headers"""
        request = Mock(spec=Request)
        request.headers = {}
        
        result = validate_auth_headers(request)
        
        assert len(result["valid_headers"]) == 0
        assert len(result["security_warnings"]) == 0
    
    def test_validate_auth_headers_multiple_headers(self):
        """Test validation with multiple auth headers"""
        request = Mock(spec=Request)
        request.headers = {
            "x-dev-user": "testuser",
            "remote-user": "anotheruser",
            "authorization": "Bearer token123"
        }
        
        result = validate_auth_headers(request)
        
        # Should prioritize x-dev-user in development
        assert "x-dev-user" in result["valid_headers"]
        assert result["valid_headers"]["x-dev-user"] == "testuser"


class TestUserInfo:
    """Test UserInfo model"""
    
    def test_user_info_creation(self):
        """Test creating UserInfo instance"""
        user = UserInfo(
            username="testuser",
            is_admin=True,
            auth_method="development"
        )
        
        assert user.username == "testuser"
        assert user.is_admin is True
        assert user.auth_method == "development"
        assert user.is_authenticated is True
    
    def test_user_info_non_admin(self):
        """Test creating non-admin UserInfo"""
        user = UserInfo(
            username="regularuser",
            is_admin=False,
            auth_method="windows"
        )
        
        assert user.username == "regularuser"
        assert user.is_admin is False
        assert user.is_authenticated is True


class TestGetCurrentUser:
    """Test get_current_user dependency"""
    
    @pytest.mark.asyncio
    async def test_get_current_user_with_dev_header(self):
        """Test getting current user with x-dev-user header"""
        request = Mock(spec=Request)
        request.headers = {"x-dev-user": "rcox"}
        
        with patch('backend.app.auth.settings') as mock_settings:
            mock_settings.admin_users = ["rcox"]
            
            user = await get_current_user(request)
            
            assert user.username == "rcox"
            assert user.is_admin is True
            assert user.auth_method == "development"
    
    @pytest.mark.asyncio
    async def test_get_current_user_non_admin(self):
        """Test getting current user who is not admin"""
        request = Mock(spec=Request)
        request.headers = {"x-dev-user": "regularuser"}
        
        with patch('backend.app.auth.settings') as mock_settings:
            mock_settings.admin_users = ["admin"]
            
            user = await get_current_user(request)
            
            assert user.username == "regularuser"
            assert user.is_admin is False
            assert user.auth_method == "development"
    
    @pytest.mark.asyncio
    async def test_get_current_user_no_header(self):
        """Test authentication failure with no header"""
        request = Mock(spec=Request)
        request.headers = {}
        
        with pytest.raises(AuthenticationError) as exc_info:
            await get_current_user(request)
        
        assert exc_info.value.status_code == 401
        assert "required" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_get_current_user_empty_header(self):
        """Test authentication failure with empty header"""
        request = Mock(spec=Request)
        request.headers = {"x-dev-user": ""}
        
        with pytest.raises(AuthenticationError) as exc_info:
            await get_current_user(request)
        
        assert exc_info.value.status_code == 401


class TestRequireAdmin:
    """Test require_admin dependency"""
    
    @pytest.mark.asyncio
    async def test_require_admin_with_admin_user(self):
        """Test admin requirement with admin user"""
        admin_user = UserInfo(
            username="admin",
            is_admin=True,
            auth_method="development"
        )
        
        result = await require_admin(admin_user)
        assert result == admin_user
    
    @pytest.mark.asyncio
    async def test_require_admin_with_regular_user(self):
        """Test admin requirement with regular user"""
        regular_user = UserInfo(
            username="user",
            is_admin=False,
            auth_method="development"
        )
        
        with pytest.raises(AuthorizationError) as exc_info:
            await require_admin(regular_user)
        
        assert exc_info.value.status_code == 403
        assert "admin" in exc_info.value.detail.lower()


class TestAuthExceptions:
    """Test authentication exception classes"""
    
    def test_authentication_error_creation(self):
        """Test AuthenticationError creation"""
        error = AuthenticationError("Test auth error")
        
        assert error.status_code == 401
        assert error.detail == "Test auth error"
        assert isinstance(error.headers, dict)
    
    def test_authentication_error_with_custom_headers(self):
        """Test AuthenticationError with custom headers"""
        custom_headers = {"X-Custom": "value"}
        error = AuthenticationError("Test error", headers=custom_headers)
        
        assert error.headers == custom_headers
    
    def test_authorization_error_creation(self):
        """Test AuthorizationError creation"""
        error = AuthorizationError("Access denied")
        
        assert error.status_code == 403
        assert error.detail == "Access denied"


class TestAuthIntegration:
    """Integration tests for authentication flow"""
    
    @pytest.mark.asyncio
    async def test_full_auth_flow_admin(self):
        """Test complete authentication flow for admin user"""
        request = Mock(spec=Request)
        request.headers = {"x-dev-user": "admin"}
        
        with patch('backend.app.auth.settings') as mock_settings:
            mock_settings.admin_users = ["admin"]
            
            # Test get_current_user
            user = await get_current_user(request)
            assert user.username == "admin"
            assert user.is_admin is True
            
            # Test require_admin
            admin_user = await require_admin(user)
            assert admin_user == user
    
    @pytest.mark.asyncio
    async def test_full_auth_flow_regular_user(self):
        """Test complete authentication flow for regular user"""
        request = Mock(spec=Request)
        request.headers = {"x-dev-user": "user"}
        
        with patch('backend.app.auth.settings') as mock_settings:
            mock_settings.admin_users = ["admin"]
            
            # Test get_current_user
            user = await get_current_user(request)
            assert user.username == "user"
            assert user.is_admin is False
            
            # Test require_admin should fail
            with pytest.raises(AuthorizationError):
                await require_admin(user)
    
    def test_header_validation_comprehensive(self):
        """Test comprehensive header validation"""
        request = Mock(spec=Request)
        request.headers = {
            "x-dev-user": "testuser",
            "content-type": "application/json",
            "user-agent": "test-client",
            "authorization": "Bearer token123"
        }
        
        result = validate_auth_headers(request)
        
        # Should identify authentication headers
        assert "x-dev-user" in result["valid_headers"]
        assert len(result["valid_headers"]) >= 1
        assert "timestamp" in result


if __name__ == "__main__":
    pytest.main([__file__])