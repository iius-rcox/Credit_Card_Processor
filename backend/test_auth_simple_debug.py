#!/usr/bin/env python3
"""
Simple Authentication Test for Debugging
Tests core authentication functionality without external dependencies
"""

import sys
import os

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_imports():
    """Test that all authentication modules can be imported"""
    try:
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
        print("✅ Authentication module imports successful")
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_username_validation():
    """Test username validation patterns"""
    try:
        from app.auth import sanitize_username, USERNAME_PATTERN
        
        # Valid usernames
        valid_usernames = ['rcox', 'mikeh', 'tomj', 'user123']
        for username in valid_usernames:
            result = sanitize_username(username)
            if result != username.lower():
                print(f"❌ Valid username failed: {username} -> {result}")
                return False
        
        # Invalid usernames
        invalid_usernames = ["user'; DROP TABLE;--", "user<script>", "", "a" * 51]
        for username in invalid_usernames:
            result = sanitize_username(username)
            if result is not None:
                print(f"❌ Invalid username allowed: {username} -> {result}")
                return False
        
        print("✅ Username validation tests passed")
        return True
    except Exception as e:
        print(f"❌ Username validation failed: {e}")
        return False

def test_auth_module():
    """Test basic authentication module functionality"""
    try:
        from app.auth import UserInfo
        from datetime import datetime
        
        # Test UserInfo model
        user = UserInfo(
            username='rcox',
            is_admin=True,
            is_authenticated=True,
            auth_method='test',
            timestamp=datetime.utcnow()
        )
        
        print(f"✅ UserInfo model works: {user.username}")
        return True
    except Exception as e:
        print(f"❌ Auth module test failed: {e}")
        return False

def test_config_access():
    """Test configuration access"""
    try:
        from app.config import settings
        print(f"✅ Config access works - Debug: {settings.debug}")
        return True
    except Exception as e:
        print(f"❌ Config access failed: {e}")
        return False

def main():
    """Run all debug tests"""
    print("🔍 Running Authentication Debug Tests")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_config_access,
        test_username_validation,
        test_auth_module
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
    
    print("=" * 50)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All authentication debug tests passed!")
        return 0
    else:
        print("❌ Some authentication tests failed")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)