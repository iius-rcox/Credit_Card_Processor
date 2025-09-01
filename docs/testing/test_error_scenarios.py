#!/usr/bin/env python3
"""
Test Error Scenarios for Processing Framework
Tests various failure conditions and recovery mechanisms
"""

import time
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

def create_test_pdf_content():
    """Create a minimal valid PDF content for testing"""
    return b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj

xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
178
%%EOF"""

def test_error_scenarios():
    """Test various error scenarios and recovery"""
    client = TestClient(app)
    headers = {"X-Dev-User": "testuser"}
    
    print("🚨 Testing Error Scenarios and Recovery")
    print("=" * 50)
    
    # Test 1: Invalid UUIDs
    print("\n📋 Test 1: Invalid UUID Handling")
    
    invalid_uuids = [
        "invalid-uuid",
        "12345",
        "",
        "not-a-uuid-at-all",
        "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    ]
    
    for invalid_uuid in invalid_uuids:
        response = client.post(f"/api/sessions/{invalid_uuid}/process", headers=headers, json={})
        if response.status_code == 400:
            print(f"   ✅ Correctly rejected invalid UUID: {invalid_uuid}")
        else:
            print(f"   ❌ Failed to reject invalid UUID: {invalid_uuid} (got {response.status_code})")
    
    # Test 2: Non-existent sessions
    print("\n📋 Test 2: Non-existent Session Handling")
    
    fake_sessions = [str(uuid.uuid4()) for _ in range(3)]
    
    endpoints = [
        ("process", "POST"),
        ("pause", "POST"),
        ("resume", "POST"),
        ("cancel", "POST"),
        ("status", "GET")
    ]
    
    for session_id in fake_sessions[:2]:  # Test with 2 fake sessions
        for endpoint, method in endpoints:
            if method == "POST":
                response = client.post(f"/api/sessions/{session_id}/{endpoint}", headers=headers, json={})
            else:
                response = client.get(f"/api/sessions/{session_id}/{endpoint}", headers=headers)
            
            if response.status_code == 404:
                print(f"   ✅ Correctly rejected non-existent session for {endpoint}")
            else:
                print(f"   ⚠️ Unexpected response for {endpoint}: {response.status_code}")
    
    # Test 3: Authorization failures
    print("\n📋 Test 3: Authorization Failures")
    
    # Create session with one user
    session_response = client.post(
        "/api/sessions",
        headers={"X-Dev-User": "user1"},
        json={"session_name": "Authorization Test", "processing_options": {}}
    )
    
    if session_response.status_code == 201:
        session_id = session_response.json()["session_id"]
        
        # Try to access with different user (non-admin)
        other_user_headers = {"X-Dev-User": "user2"}
        
        auth_test_endpoints = [
            ("process", "POST"),
            ("pause", "POST"),
            ("resume", "POST"),
            ("cancel", "POST")
        ]
        
        for endpoint, method in auth_test_endpoints:
            response = client.post(f"/api/sessions/{session_id}/{endpoint}", headers=other_user_headers, json={})
            if response.status_code == 403:
                print(f"   ✅ Correctly blocked unauthorized {endpoint}")
            else:
                print(f"   ❌ Failed to block unauthorized {endpoint}: {response.status_code}")
        
        # Test admin access should work
        admin_headers = {"X-Dev-User": "admin"}
        response = client.get(f"/api/sessions/{session_id}/status", headers=admin_headers)
        if response.status_code == 200:
            print("   ✅ Admin access correctly allowed")
        else:
            print(f"   ⚠️ Admin access issue: {response.status_code}")
    
    # Test 4: Invalid processing states
    print("\n📋 Test 4: Invalid State Transitions")
    
    # Create session and upload files
    test_session = create_test_session(client, headers, "State Test Session")
    
    # Try to pause/resume/cancel without starting processing
    state_tests = [
        ("pause", "Session is not currently processing"),
        ("resume", "Session is not paused"),
        ("cancel", "Session cannot be cancelled")
    ]
    
    for endpoint, expected_message in state_tests:
        response = client.post(f"/api/sessions/{test_session}/{endpoint}", headers=headers)
        if response.status_code == 409:
            print(f"   ✅ Correctly blocked {endpoint} on non-processing session")
        else:
            print(f"   ⚠️ Unexpected response for {endpoint}: {response.status_code}")
    
    # Test 5: File validation errors
    print("\n📋 Test 5: File Upload Validation")
    
    validation_session = client.post(
        "/api/sessions",
        headers=headers,
        json={"session_name": "File Validation Test", "processing_options": {}}
    ).json()["session_id"]
    
    # Try to start processing without files
    response = client.post(f"/api/sessions/{validation_session}/process", headers=headers, json={})
    if response.status_code == 400 and "files uploaded" in response.json()["detail"]:
        print("   ✅ Correctly blocked processing without files")
    else:
        print(f"   ❌ Failed to block processing without files: {response.status_code}")
    
    # Upload only one file type
    pdf_content = create_test_pdf_content()
    client.post(
        f"/api/sessions/{validation_session}/upload",
        headers=headers,
        files={"car_file": ("car.pdf", pdf_content, "application/pdf"), "receipt_file": ("", b"", "application/pdf")}
    )
    
    # Try to process with incomplete files
    response = client.post(f"/api/sessions/{validation_session}/process", headers=headers, json={})
    if response.status_code == 400:
        print("   ✅ Correctly handled incomplete file uploads")
    else:
        print(f"   ⚠️ Incomplete file upload handling: {response.status_code}")
    
    # Test 6: Configuration validation
    print("\n📋 Test 6: Configuration Validation")
    
    config_session = create_test_session(client, headers, "Config Validation Test")
    
    invalid_configs = [
        {"batch_size": -1},  # Negative batch size
        {"batch_size": 1000},  # Too large
        {"validation_threshold": -0.1},  # Invalid threshold
        {"validation_threshold": 1.5},  # Too high
        {"max_processing_time": 30},  # Too short
        {"max_processing_time": 50000}  # Too long
    ]
    
    for config in invalid_configs:
        response = client.post(
            f"/api/sessions/{config_session}/process",
            headers=headers,
            json={"processing_config": config}
        )
        # Some configs might be accepted but bounded, others rejected
        print(f"   Config {config}: {response.status_code}")
    
    print("\n✨ Error Scenario Tests Complete!")


def create_test_session(client, headers, name):
    """Helper to create session with uploaded files"""
    # Create session
    session_response = client.post(
        "/api/sessions",
        headers=headers,
        json={"session_name": name, "processing_options": {}}
    )
    
    session_id = session_response.json()["session_id"]
    
    # Upload files
    pdf_content = create_test_pdf_content()
    client.post(
        f"/api/sessions/{session_id}/upload",
        headers=headers,
        files={
            "car_file": ("test_car.pdf", pdf_content, "application/pdf"),
            "receipt_file": ("test_receipt.pdf", pdf_content, "application/pdf")
        }
    )
    
    return session_id


def test_database_error_simulation():
    """Test database error handling"""
    print("\n🗄️ Testing Database Error Scenarios")
    print("=" * 40)
    
    client = TestClient(app)
    headers = {"X-Dev-User": "testuser"}
    
    # We can't easily mock database errors in this test environment,
    # but we can test the error response handling
    
    # Test extremely long session names (potential database constraint issues)
    long_name = "x" * 1000  # Very long name
    
    response = client.post(
        "/api/sessions",
        headers=headers,
        json={"session_name": long_name, "processing_options": {}}
    )
    
    print(f"Long session name test: {response.status_code}")
    
    # Test with malformed JSON-like data
    try:
        malformed_response = client.post(
            "/api/sessions",
            headers=headers,
            json={"session_name": "Test", "processing_options": "not-a-dict"}
        )
        print(f"Malformed data test: {malformed_response.status_code}")
    except Exception as e:
        print(f"Malformed data properly rejected: {type(e).__name__}")


if __name__ == "__main__":
    test_error_scenarios()
    test_database_error_simulation()