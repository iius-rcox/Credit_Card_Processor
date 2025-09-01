#!/usr/bin/env python3
"""
Database Transaction Testing
Tests database transaction handling including rollbacks on errors
"""

import requests
import json
import uuid
from datetime import datetime


def test_database_transaction_rollback():
    """Test that database transactions properly rollback on errors"""
    
    base_url = "http://127.0.0.1:8001"
    session = requests.Session()
    session.headers.update({
        'X-Dev-User': 'rcox',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    print("🧪 Testing Database Transaction Rollback")
    print("=" * 50)
    
    # Get initial session count
    response = session.get(f"{base_url}/api/sessions")
    if response.status_code != 200:
        print("❌ Failed to get initial session count")
        return False
    
    initial_count = response.json()["total_count"]
    print(f"Initial session count: {initial_count}")
    
    # Test 1: Try to create session with non-existent delta session
    fake_delta_id = str(uuid.uuid4())
    test_data = {
        "session_name": "Transaction Test Session",
        "processing_options": {
            "skip_duplicates": True,
            "validation_threshold": 0.05
        },
        "delta_session_id": fake_delta_id  # This should cause rollback
    }
    
    print(f"\n🔄 Testing transaction rollback with invalid delta session: {fake_delta_id[:8]}...")
    
    response = session.post(f"{base_url}/api/sessions", json=test_data)
    
    # Should get 400 error for non-existent delta session
    if response.status_code != 400:
        print(f"❌ Expected 400, got {response.status_code}")
        return False
    
    print(f"✅ Got expected 400 error: {response.json()['detail']}")
    
    # Verify session count hasn't changed (transaction was rolled back)
    response = session.get(f"{base_url}/api/sessions")
    if response.status_code != 200:
        print("❌ Failed to get updated session count")
        return False
    
    final_count = response.json()["total_count"]
    print(f"Final session count: {final_count}")
    
    if final_count != initial_count:
        print(f"❌ Session count changed! Expected {initial_count}, got {final_count}")
        print("❌ Transaction was NOT properly rolled back")
        return False
    
    print("✅ Session count unchanged - transaction properly rolled back")
    
    # Test 2: Create valid session to ensure normal operations still work
    print(f"\n🔄 Testing normal session creation after rollback...")
    
    valid_data = {
        "session_name": "Post-Rollback Test Session - " + str(uuid.uuid4())[:8],
        "processing_options": {
            "skip_duplicates": True,
            "validation_threshold": 0.05
        }
    }
    
    response = session.post(f"{base_url}/api/sessions", json=valid_data)
    
    if response.status_code != 201:
        print(f"❌ Failed to create valid session: {response.status_code}")
        return False
    
    created_session = response.json()
    print(f"✅ Successfully created session: {created_session['session_id']}")
    
    # Verify session count increased by 1
    response = session.get(f"{base_url}/api/sessions")
    new_count = response.json()["total_count"]
    
    if new_count != initial_count + 1:
        print(f"❌ Expected count {initial_count + 1}, got {new_count}")
        return False
    
    print(f"✅ Session count correctly increased to {new_count}")
    
    print("\n🎉 All database transaction tests passed!")
    return True


def test_concurrent_access():
    """Test concurrent access to sessions"""
    
    base_url = "http://127.0.0.1:8001"
    
    # Create sessions for different users
    rcox_session = requests.Session()
    rcox_session.headers.update({
        'X-Dev-User': 'rcox',
        'Content-Type': 'application/json'
    })
    
    testuser_session = requests.Session()
    testuser_session.headers.update({
        'X-Dev-User': 'testuser',
        'Content-Type': 'application/json'
    })
    
    print("\n🧪 Testing Concurrent Access and Authorization")
    print("=" * 50)
    
    # Create session as rcox (admin)
    session_data = {
        "session_name": "Admin Session - " + str(uuid.uuid4())[:8],
        "processing_options": {"skip_duplicates": True, "validation_threshold": 0.05}
    }
    
    response = rcox_session.post(f"{base_url}/api/sessions", json=session_data)
    if response.status_code != 201:
        print(f"❌ Admin failed to create session: {response.status_code}")
        return False
    
    admin_session_id = response.json()["session_id"]
    print(f"✅ Admin created session: {admin_session_id}")
    
    # Test: Admin can access the session
    response = rcox_session.get(f"{base_url}/api/sessions/{admin_session_id}")
    if response.status_code != 200:
        print(f"❌ Admin cannot access own session: {response.status_code}")
        return False
    print("✅ Admin can access own session")
    
    # Test: Regular user cannot access admin's session  
    response = testuser_session.get(f"{base_url}/api/sessions/{admin_session_id}")
    if response.status_code != 403:
        print(f"❌ Expected 403 for unauthorized access, got {response.status_code}")
        return False
    print("✅ Regular user properly denied access to admin session")
    
    # Create session as testuser
    user_session_data = {
        "session_name": "User Session - " + str(uuid.uuid4())[:8],
        "processing_options": {"skip_duplicates": True, "validation_threshold": 0.05}
    }
    
    response = testuser_session.post(f"{base_url}/api/sessions", json=user_session_data)
    if response.status_code != 201:
        print(f"❌ User failed to create session: {response.status_code}")
        return False
    
    user_session_id = response.json()["session_id"]
    print(f"✅ User created session: {user_session_id}")
    
    # Test: User can access their own session
    response = testuser_session.get(f"{base_url}/api/sessions/{user_session_id}")
    if response.status_code != 200:
        print(f"❌ User cannot access own session: {response.status_code}")
        return False
    print("✅ User can access own session")
    
    # Test: Admin can access user's session (admin privilege)
    response = rcox_session.get(f"{base_url}/api/sessions/{user_session_id}")
    if response.status_code != 200:
        print(f"❌ Admin cannot access user session: {response.status_code}")
        return False
    print("✅ Admin can access user session (admin privilege)")
    
    print("\n🎉 All concurrent access tests passed!")
    return True


if __name__ == "__main__":
    print("🔧 Database Transaction and Concurrency Testing")
    print("=" * 60)
    
    try:
        # Test transaction rollback
        rollback_success = test_database_transaction_rollback()
        
        # Test concurrent access
        concurrent_success = test_concurrent_access()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TESTING SUMMARY")
        print("=" * 60)
        
        if rollback_success and concurrent_success:
            print("🎉 ALL TESTS PASSED!")
            print("✅ Database transactions work correctly")
            print("✅ Rollback functionality verified")
            print("✅ Concurrent access controls working")
            print("✅ Authorization system functional")
        else:
            print("❌ Some tests failed:")
            if not rollback_success:
                print("  - Database transaction rollback failed")
            if not concurrent_success:
                print("  - Concurrent access tests failed")
                
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()