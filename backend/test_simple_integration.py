#!/usr/bin/env python3
"""
Simple Session Management Integration Test using TestClient
Tests session CRUD operations with proper authentication
"""

import json
import uuid
from fastapi.testclient import TestClient

# Import the app
from app.main import app

def test_session_management_integration():
    """Test complete session management workflow using TestClient"""
    
    print("🔧 Session Management Integration Test (TestClient)")
    print("=" * 60)
    
    client = TestClient(app)
    
    # Test 1: Health Check
    print("\n1. Testing health endpoint...")
    response = client.get("/health")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Health check passed")
        print(f"   Response: {response.json()}")
    else:
        print(f"   ❌ Health check failed: {response.text}")
        return False
    
    # Test 2: Unauthenticated Access
    print("\n2. Testing unauthenticated access...")
    response = client.get("/api/sessions")
    if response.status_code == 401:
        print("   ✅ Correctly blocked unauthenticated access")
        print(f"   Response: {response.json()}")
    else:
        print(f"   ❌ Expected 401, got {response.status_code}")
        return False
    
    # Test 3: Authenticated Session Creation
    print("\n3. Testing authenticated session creation...")
    headers = {
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
    
    response = client.post("/api/sessions", headers=headers, json=session_data)
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
    
    # Test 4: Session Retrieval
    print("\n4. Testing session retrieval...")
    response = client.get(f"/api/sessions/{session_id}", headers=headers)
    if response.status_code == 200:
        retrieved_session = response.json()
        print("   ✅ Session retrieved successfully")
        print(f"   Session ID: {retrieved_session.get('session_id')}")
        print(f"   Session Name: {retrieved_session.get('session_name')}")
        print(f"   Created By: {retrieved_session.get('created_by')}")
        print(f"   Status: {retrieved_session.get('status')}")
    else:
        print(f"   ❌ Session retrieval failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False
    
    # Test 5: Session List
    print("\n5. Testing session listing...")
    response = client.get("/api/sessions", headers=headers)
    if response.status_code == 200:
        session_list = response.json()
        print("   ✅ Session list retrieved successfully")
        print(f"   Total sessions: {session_list.get('total_count', 0)}")
        print(f"   Sessions returned: {len(session_list.get('sessions', []))}")
    else:
        print(f"   ❌ Session listing failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False
    
    # Test 6: Authorization Test (Regular User Access)
    print("\n6. Testing authorization controls...")
    regular_headers = {"REMOTE_USER": "regularuser"}  # Non-admin user
    
    response = client.get(f"/api/sessions/{session_id}", headers=regular_headers)
    if response.status_code == 403:
        print("   ✅ Access correctly denied for non-admin user")
        print(f"   Error: {response.json()}")
    else:
        print(f"   ❌ Expected 403, got {response.status_code}")
        print(f"   Response: {response.text}")
        return False
    
    # Test 7: User can access their own session
    print("\n7. Testing user accessing own session...")
    # Create a session as regular user first
    user_session_data = {
        "session_name": "Regular User Session",
        "processing_options": {
            "skip_duplicates": True,
            "validation_threshold": 0.05
        }
    }
    
    response = client.post("/api/sessions", headers=regular_headers, json=user_session_data)
    if response.status_code == 201:
        user_session = response.json()
        user_session_id = user_session.get("session_id")
        print(f"   User session created: {user_session_id}")
        
        # Now try to access it
        response = client.get(f"/api/sessions/{user_session_id}", headers=regular_headers)
        if response.status_code == 200:
            print("   ✅ User can access their own session")
        else:
            print(f"   ❌ User cannot access their own session: {response.status_code}")
            return False
    else:
        print(f"   ❌ Failed to create user session: {response.status_code}")
        return False
    
    # Test 8: Input Validation
    print("\n8. Testing input validation...")
    invalid_session_data = {
        "session_name": "",  # Invalid empty name
        "processing_options": {
            "skip_duplicates": True,
            "validation_threshold": 0.05
        }
    }
    
    response = client.post("/api/sessions", headers=headers, json=invalid_session_data)
    if response.status_code == 422:
        print("   ✅ Input validation working correctly")
        print(f"   Validation error: {response.json()}")
    else:
        print(f"   ❌ Expected validation error 422, got {response.status_code}")
        return False
    
    # Test 9: Invalid Session ID Format
    print("\n9. Testing invalid session ID format...")
    response = client.get("/api/sessions/invalid-uuid", headers=headers)
    if response.status_code == 400:
        print("   ✅ Invalid UUID format correctly rejected")
        print(f"   Error: {response.json()}")
    else:
        print(f"   ❌ Expected 400, got {response.status_code}")
        return False
    
    # Test 10: Session Not Found
    print("\n10. Testing session not found...")
    fake_uuid = str(uuid.uuid4())
    response = client.get(f"/api/sessions/{fake_uuid}", headers=headers)
    if response.status_code == 404:
        print("   ✅ Non-existent session correctly returns 404")
        print(f"   Error: {response.json()}")
    else:
        print(f"   ❌ Expected 404, got {response.status_code}")
        return False
    
    print("\n🎉 All integration tests passed!")
    print("✅ Session Management API is working correctly with authentication!")
    return True

if __name__ == "__main__":
    success = test_session_management_integration()
    exit(0 if success else 1)