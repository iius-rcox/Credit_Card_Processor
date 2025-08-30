#!/usr/bin/env python3
"""
Quick test to verify authentication system is working correctly
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from unittest.mock import Mock

def test_auth_integration():
    """Test authentication integration with API endpoints"""
    print("=== Testing Authentication Integration ===")
    
    try:
        # Import main app
        from app.main import app
        client = TestClient(app)
        
        # Test 1: Unauthenticated request should get 401
        print("\nTest 1: Unauthenticated access...")
        response = client.get("/api/sessions")
        print(f"Status: {response.status_code}")
        print(f"Raw Response: {response.text}")
        
        try:
            response_json = response.json()
            print(f"JSON Response: {response_json}")
        except:
            print("Response is not JSON")
        
        if response.status_code != 401:
            print("❌ FAILED: Should return 401 for unauthenticated requests")
            return False
        else:
            print("✅ PASSED: Correctly returns 401 for unauthenticated requests")
        
        # Test 2: Development user authentication
        print("\nTest 2: Development authentication...")
        response = client.get("/api/sessions", headers={"x-dev-user": "rcox"})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test 3: Check auth status endpoint
        print("\nTest 3: Auth status endpoint...")
        response = client.get("/api/auth/status")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test 4: Admin test endpoint without auth
        print("\nTest 4: Admin endpoint without auth...")
        response = client.get("/api/auth/admin-test")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code != 401:
            print("❌ FAILED: Admin endpoint should require authentication")
            return False
        else:
            print("✅ PASSED: Admin endpoint correctly requires authentication")
        
        # Test 5: Admin test endpoint with auth
        print("\nTest 5: Admin endpoint with dev auth...")
        response = client.get("/api/auth/admin-test", headers={"x-dev-user": "rcox"})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_config():
    """Test configuration settings"""
    print("=== Testing Configuration ===")
    
    try:
        from app.config import settings
        print(f"Debug mode: {settings.debug}")
        print(f"Admin users: {settings.admin_users}")
        print(f"Database path: {settings.database_path}")
        return True
    except Exception as e:
        print(f"❌ ERROR loading config: {str(e)}")
        return False

def test_windows_authentication():
    """Test Windows authentication specifically"""
    print("Testing Windows authentication...")
    
    try:
        from app.main import app
        client = TestClient(app)
        
        # Test with Windows authentication header (trying different header names)
        headers_to_test = [
            ("remote-user", "DOMAIN\\rcox"),
            ("Remote-User", "DOMAIN\\rcox"), 
            ("REMOTE_USER", "DOMAIN\\rcox"),
            ("remote_user", "DOMAIN\\rcox")
        ]
        
        for header_name, header_value in headers_to_test:
            response = client.get("/api/sessions", headers={header_name: header_value})
            print(f"Testing header '{header_name}': Status {response.status_code}")
            if response.status_code == 200:
                print(f"✅ Windows Auth Success with header '{header_name}'")
                return True
        
        # If none of the headers worked
        print("❌ Windows Auth Failed with all header formats")
        return False
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    print("Authentication Integration Test")
    print("=" * 50)
    
    # Test configuration
    config_ok = test_config()
    
    if config_ok:
        # Test authentication
        auth_ok = test_auth_integration()
        
        # Test Windows authentication
        print("\n=== Additional Windows Authentication Test ===")
        windows_auth_test = test_windows_authentication()
        
        if auth_ok and windows_auth_test:
            print("\n✅ All tests passed!")
            sys.exit(0)
        else:
            print("\n❌ Authentication tests failed!")
            sys.exit(1)
    else:
        print("\n❌ Configuration test failed!")
        sys.exit(1)