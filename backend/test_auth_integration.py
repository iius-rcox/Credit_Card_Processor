#!/usr/bin/env python3
"""
Authentication Integration Testing
Tests complete authentication and authorization integration with session APIs
"""

import requests
import json
import uuid


def test_unauthenticated_access():
    """Test that unauthenticated requests are properly rejected"""
    
    base_url = "http://127.0.0.1:8001"
    session = requests.Session()
    # No authentication headers
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    print("🔐 Testing Unauthenticated Access")
    print("=" * 40)
    
    test_data = {
        "session_name": "Unauthorized Test",
        "processing_options": {"skip_duplicates": True}
    }
    
    # Test POST /api/sessions without auth
    response = session.post(f"{base_url}/api/sessions", json=test_data)
    if response.status_code != 401:
        print(f"❌ Expected 401 for POST, got {response.status_code}")
        return False
    print("✅ POST /api/sessions properly requires authentication")
    
    # Test GET /api/sessions/{id} without auth
    fake_id = str(uuid.uuid4())
    response = session.get(f"{base_url}/api/sessions/{fake_id}")
    if response.status_code != 401:
        print(f"❌ Expected 401 for GET session, got {response.status_code}")
        return False
    print("✅ GET /api/sessions/{id} properly requires authentication")
    
    # Test GET /api/sessions without auth
    response = session.get(f"{base_url}/api/sessions")
    if response.status_code != 401:
        print(f"❌ Expected 401 for GET sessions, got {response.status_code}")
        return False
    print("✅ GET /api/sessions properly requires authentication")
    
    return True


def test_admin_vs_regular_user():
    """Test admin vs regular user permissions"""
    
    base_url = "http://127.0.0.1:8001"
    
    # Admin session
    admin_session = requests.Session()
    admin_session.headers.update({
        'X-Dev-User': 'rcox',  # rcox is an admin user
        'Content-Type': 'application/json'
    })
    
    # Regular user session  
    user_session = requests.Session()
    user_session.headers.update({
        'X-Dev-User': 'johndoe',  # johndoe is not in admin_users list
        'Content-Type': 'application/json'
    })
    
    print("\n👤 Testing Admin vs Regular User Permissions")
    print("=" * 50)
    
    # Create session as admin
    admin_data = {
        "session_name": "Admin Test Session - " + str(uuid.uuid4())[:8],
        "processing_options": {"skip_duplicates": True}
    }
    
    response = admin_session.post(f"{base_url}/api/sessions", json=admin_data)
    if response.status_code != 201:
        print(f"❌ Admin failed to create session: {response.status_code}")
        return False
    
    admin_session_id = response.json()["session_id"]
    print(f"✅ Admin successfully created session: {admin_session_id}")
    
    # Create session as regular user
    user_data = {
        "session_name": "User Test Session - " + str(uuid.uuid4())[:8],
        "processing_options": {"skip_duplicates": True}
    }
    
    response = user_session.post(f"{base_url}/api/sessions", json=user_data)
    if response.status_code != 201:
        print(f"❌ User failed to create session: {response.status_code}")
        return False
    
    user_session_id = response.json()["session_id"]
    print(f"✅ User successfully created session: {user_session_id}")
    
    # Test: Admin can see all sessions
    response = admin_session.get(f"{base_url}/api/sessions")
    if response.status_code != 200:
        print(f"❌ Admin failed to list sessions: {response.status_code}")
        return False
    
    admin_sessions = response.json()["sessions"]
    admin_total = response.json()["total_count"]
    print(f"✅ Admin sees {admin_total} total sessions")
    
    # Test: Regular user sees only their sessions
    response = user_session.get(f"{base_url}/api/sessions")
    if response.status_code != 200:
        print(f"❌ User failed to list sessions: {response.status_code}")
        return False
    
    user_sessions = response.json()["sessions"]
    user_total = response.json()["total_count"]
    print(f"✅ User sees {user_total} sessions (filtered to their own)")
    
    # Verify user sees fewer sessions than admin (unless user has many sessions)
    if user_total > admin_total:
        print("⚠️ Warning: User sees more sessions than admin (unexpected)")
    
    # Verify all user's sessions are created by them
    for session in user_sessions:
        if not session["created_by"].lower().endswith("johndoe"):
            print(f"❌ User sees session not created by them: {session['created_by']}")
            return False
    print("✅ User only sees sessions they created")
    
    # Test: Admin can access user's session
    response = admin_session.get(f"{base_url}/api/sessions/{user_session_id}")
    if response.status_code != 200:
        print(f"❌ Admin cannot access user session: {response.status_code}")
        return False
    print("✅ Admin can access user's session")
    
    # Test: User cannot access admin's session
    response = user_session.get(f"{base_url}/api/sessions/{admin_session_id}")
    if response.status_code != 403:
        print(f"❌ Expected 403 for user accessing admin session, got {response.status_code}")
        return False
    print("✅ User properly denied access to admin's session")
    
    return True


def test_authentication_methods():
    """Test different authentication methods and headers"""
    
    base_url = "http://127.0.0.1:8001"
    
    print("\n🔑 Testing Authentication Methods")
    print("=" * 40)
    
    # Test X-Dev-User header (development mode)
    dev_session = requests.Session()
    dev_session.headers.update({
        'X-Dev-User': 'testauth',
        'Content-Type': 'application/json'
    })
    
    response = dev_session.get(f"{base_url}/api/auth/current-user")
    if response.status_code != 200:
        print(f"❌ X-Dev-User authentication failed: {response.status_code}")
        return False
    
    user_info = response.json()
    if user_info["username"] != "testauth":
        print(f"❌ Wrong username returned: {user_info['username']}")
        return False
    
    print("✅ X-Dev-User authentication working")
    print(f"    Username: {user_info['username']}")
    print(f"    Is Admin: {user_info['is_admin']}")
    print(f"    Auth Method: {user_info['auth_method']}")
    
    # Test auth status endpoint
    response = dev_session.get(f"{base_url}/api/auth/status")
    if response.status_code != 200:
        print(f"❌ Auth status endpoint failed: {response.status_code}")
        return False
    
    auth_status = response.json()
    if not auth_status["authenticated"]:
        print("❌ Auth status shows not authenticated")
        return False
    
    print("✅ Auth status endpoint working")
    print(f"    Debug Mode: {auth_status['debug_mode']}")
    print(f"    Available Methods: {auth_status['auth_methods_available']}")
    
    return True


def test_session_ownership_enforcement():
    """Test that session ownership is properly enforced"""
    
    base_url = "http://127.0.0.1:8001"
    
    print("\n🏠 Testing Session Ownership Enforcement")
    print("=" * 45)
    
    # Create two different users
    user1_session = requests.Session()
    user1_session.headers.update({
        'X-Dev-User': 'alice',
        'Content-Type': 'application/json'
    })
    
    user2_session = requests.Session()
    user2_session.headers.update({
        'X-Dev-User': 'bob',
        'Content-Type': 'application/json'
    })
    
    # User1 creates a session
    session_data = {
        "session_name": "Alice's Private Session - " + str(uuid.uuid4())[:8],
        "processing_options": {"skip_duplicates": True}
    }
    
    response = user1_session.post(f"{base_url}/api/sessions", json=session_data)
    if response.status_code != 201:
        print(f"❌ Alice failed to create session: {response.status_code}")
        return False
    
    alice_session_id = response.json()["session_id"]
    print(f"✅ Alice created session: {alice_session_id}")
    
    # User2 creates a session
    session_data2 = {
        "session_name": "Bob's Private Session - " + str(uuid.uuid4())[:8],
        "processing_options": {"skip_duplicates": True}
    }
    
    response = user2_session.post(f"{base_url}/api/sessions", json=session_data2)
    if response.status_code != 201:
        print(f"❌ Bob failed to create session: {response.status_code}")
        return False
    
    bob_session_id = response.json()["session_id"]
    print(f"✅ Bob created session: {bob_session_id}")
    
    # Test: Alice can access her own session
    response = user1_session.get(f"{base_url}/api/sessions/{alice_session_id}")
    if response.status_code != 200:
        print(f"❌ Alice cannot access her own session: {response.status_code}")
        return False
    print("✅ Alice can access her own session")
    
    # Test: Bob can access his own session
    response = user2_session.get(f"{base_url}/api/sessions/{bob_session_id}")
    if response.status_code != 200:
        print(f"❌ Bob cannot access his own session: {response.status_code}")
        return False
    print("✅ Bob can access his own session")
    
    # Test: Alice cannot access Bob's session
    response = user1_session.get(f"{base_url}/api/sessions/{bob_session_id}")
    if response.status_code != 403:
        print(f"❌ Expected 403 for Alice accessing Bob's session, got {response.status_code}")
        return False
    print("✅ Alice properly denied access to Bob's session")
    
    # Test: Bob cannot access Alice's session
    response = user2_session.get(f"{base_url}/api/sessions/{alice_session_id}")
    if response.status_code != 403:
        print(f"❌ Expected 403 for Bob accessing Alice's session, got {response.status_code}")
        return False
    print("✅ Bob properly denied access to Alice's session")
    
    # Test: Users only see their own sessions in list
    response = user1_session.get(f"{base_url}/api/sessions")
    alice_sessions = response.json()["sessions"]
    for session in alice_sessions:
        if not session["created_by"].lower().endswith("alice"):
            print(f"❌ Alice sees session not created by her: {session['created_by']}")
            return False
    print("✅ Alice only sees her own sessions in list")
    
    response = user2_session.get(f"{base_url}/api/sessions")
    bob_sessions = response.json()["sessions"]
    for session in bob_sessions:
        if not session["created_by"].lower().endswith("bob"):
            print(f"❌ Bob sees session not created by him: {session['created_by']}")
            return False
    print("✅ Bob only sees his own sessions in list")
    
    return True


if __name__ == "__main__":
    print("🔒 Authentication Integration Testing")
    print("=" * 60)
    
    try:
        # Test unauthenticated access
        unauth_success = test_unauthenticated_access()
        
        # Test admin vs regular user permissions
        admin_success = test_admin_vs_regular_user()
        
        # Test authentication methods
        auth_methods_success = test_authentication_methods()
        
        # Test session ownership enforcement
        ownership_success = test_session_ownership_enforcement()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 AUTHENTICATION TESTING SUMMARY")
        print("=" * 60)
        
        results = [
            ("Unauthenticated Access Control", unauth_success),
            ("Admin vs Regular User Permissions", admin_success),
            ("Authentication Methods", auth_methods_success),
            ("Session Ownership Enforcement", ownership_success)
        ]
        
        passed = sum(1 for _, success in results if success)
        total = len(results)
        
        for test_name, success in results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} - {test_name}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL AUTHENTICATION TESTS PASSED!")
            print("✅ Authentication system is fully functional")
            print("✅ Authorization controls working correctly")
            print("✅ Session ownership properly enforced")
            print("✅ Development authentication working")
        else:
            print("❌ Some authentication tests failed!")
            
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()