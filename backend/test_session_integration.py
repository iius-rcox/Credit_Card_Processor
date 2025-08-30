#!/usr/bin/env python3
"""
Direct Session Management API Integration Test
Tests session CRUD operations with proper authentication
"""

import json
import uuid
import requests
import time

def test_session_management_integration():
    """Test complete session management workflow"""
    
    print("🔧 Session Management Integration Test")
    print("=" * 50)
    
    base_url = "http://127.0.0.1:8000"
    
    # Test 1: Health Check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", 
                              headers={"Host": "127.0.0.1:8000"})
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Health check passed")
        else:
            print(f"   ❌ Health check failed: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Health check connection failed: {e}")
        return False
    
    # Test 2: Unauthenticated Access
    print("\n2. Testing unauthenticated access...")
    try:
        response = requests.get(f"{base_url}/api/sessions", 
                              headers={"Host": "127.0.0.1:8000"})
        if response.status_code == 401:
            print("   ✅ Correctly blocked unauthenticated access")
        else:
            print(f"   ❌ Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False
    
    # Test 3: Authenticated Session Creation
    print("\n3. Testing authenticated session creation...")
    headers = {
        "Host": "127.0.0.1:8000",
        "Content-Type": "application/json",
        "REMOTE_USER": "rcox"  # Windows authentication header
    }
    
    session_data = {
        "session_name": "QA Integration Test Session",
        "processing_options": {
            "skip_duplicates": True,
            "validation_threshold": 0.05,
            "auto_resolve_minor": False
        }
    }
    
    try:
        response = requests.post(f"{base_url}/api/sessions", 
                               headers=headers,
                               json=session_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 201:
            session_result = response.json()
            session_id = session_result.get("session_id")
            print(f"   ✅ Session created successfully: {session_id}")
            print(f"   Session Name: {session_result.get('session_name')}")
            print(f"   Created By: {session_result.get('created_by')}")
            print(f"   Status: {session_result.get('status')}")
        else:
            print(f"   ❌ Session creation failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False
    
    # Test 4: Session Retrieval
    print("\n4. Testing session retrieval...")
    try:
        response = requests.get(f"{base_url}/api/sessions/{session_id}", 
                              headers=headers)
        if response.status_code == 200:
            retrieved_session = response.json()
            print("   ✅ Session retrieved successfully")
            print(f"   Session ID: {retrieved_session.get('session_id')}")
            print(f"   Session Name: {retrieved_session.get('session_name')}")
        else:
            print(f"   ❌ Session retrieval failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False
    
    # Test 5: Session List
    print("\n5. Testing session listing...")
    try:
        response = requests.get(f"{base_url}/api/sessions", 
                              headers=headers)
        if response.status_code == 200:
            session_list = response.json()
            print("   ✅ Session list retrieved successfully")
            print(f"   Total sessions: {session_list.get('total_count', 0)}")
            print(f"   Sessions returned: {len(session_list.get('sessions', []))}")
        else:
            print(f"   ❌ Session listing failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False
    
    # Test 6: Authorization Test (Regular User Access)
    print("\n6. Testing authorization controls...")
    regular_headers = headers.copy()
    regular_headers["REMOTE_USER"] = "regularuser"  # Non-admin user
    
    try:
        response = requests.get(f"{base_url}/api/sessions/{session_id}", 
                              headers=regular_headers)
        if response.status_code == 403:
            print("   ✅ Access correctly denied for non-admin user")
        else:
            print(f"   ❌ Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False
    
    # Test 7: Input Validation
    print("\n7. Testing input validation...")
    invalid_session_data = {
        "session_name": "",  # Invalid empty name
        "processing_options": {
            "skip_duplicates": True,
            "validation_threshold": 0.05
        }
    }
    
    try:
        response = requests.post(f"{base_url}/api/sessions", 
                               headers=headers,
                               json=invalid_session_data)
        if response.status_code == 422:
            print("   ✅ Input validation working correctly")
        else:
            print(f"   ❌ Expected validation error 422, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False
    
    print("\n🎉 All integration tests passed!")
    return True

if __name__ == "__main__":
    success = test_session_management_integration()
    exit(0 if success else 1)