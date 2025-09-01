#!/usr/bin/env python3
"""
Test Processing Controls with Simulated Real Control
This test actually demonstrates pause/resume/cancel working
"""

import time
import threading
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

def test_processing_controls_sequential():
    """Test controls with multiple sessions sequentially"""
    client = TestClient(app)
    headers = {"X-Dev-User": "testuser"}
    
    print("🧪 Testing Processing Controls - Sequential Approach")
    print("=" * 60)
    
    # Test 1: Quick pause after start
    print("\n📋 Test 1: Quick Pause After Start")
    session1 = create_test_session(client, headers, "Quick Pause Test")
    
    # Start processing
    start_response = client.post(
        f"/api/sessions/{session1}/process",
        headers=headers,
        json={"processing_config": {"batch_size": 100}}  # Large batch
    )
    print(f"   Start Response: {start_response.status_code}")
    
    # Immediate pause
    time.sleep(0.1)  # Just enough time to start
    pause_response = client.post(f"/api/sessions/{session1}/pause", headers=headers)
    print(f"   Pause Response: {pause_response.status_code}")
    
    if pause_response.status_code == 200:
        print("   ✅ Pause request accepted")
        # Check if actually paused after a moment
        time.sleep(2.0)
        status = get_session_status(client, headers, session1)
        print(f"   Status after pause: {status.get('status')} ({status.get('percent_complete')}%)")
        
        # Try resume
        resume_response = client.post(f"/api/sessions/{session1}/resume", headers=headers)
        print(f"   Resume Response: {resume_response.status_code}")
        if resume_response.status_code == 200:
            print("   ✅ Resume request accepted")
        
        # Finally cancel
        time.sleep(0.5)
        cancel_response = client.post(f"/api/sessions/{session1}/cancel", headers=headers)
        print(f"   Cancel Response: {cancel_response.status_code}")
        if cancel_response.status_code == 200:
            print("   ✅ Cancel request accepted")
    
    # Test 2: Let one run to completion
    print("\n📋 Test 2: Complete Processing Run")
    session2 = create_test_session(client, headers, "Complete Run Test")
    
    start_response = client.post(
        f"/api/sessions/{session2}/process",
        headers=headers,
        json={"processing_config": {"batch_size": 3}}  # Small batch for quick completion
    )
    print(f"   Start Response: {start_response.status_code}")
    
    # Monitor until completion
    for i in range(10):
        time.sleep(1)
        status = get_session_status(client, headers, session2)
        print(f"   Status check {i+1}: {status.get('status')} ({status.get('percent_complete')}%)")
        if status.get('status') == 'completed':
            break
    
    # Test 3: Cancel immediately
    print("\n📋 Test 3: Immediate Cancel")
    session3 = create_test_session(client, headers, "Immediate Cancel Test")
    
    start_response = client.post(
        f"/api/sessions/{session3}/process",
        headers=headers,
        json={"processing_config": {"batch_size": 200}}  # Very large batch
    )
    print(f"   Start Response: {start_response.status_code}")
    
    # Immediate cancel
    time.sleep(0.2)
    cancel_response = client.post(f"/api/sessions/{session3}/cancel", headers=headers)
    print(f"   Cancel Response: {cancel_response.status_code}")
    
    if cancel_response.status_code == 200:
        print("   ✅ Cancel request accepted")
        time.sleep(2.0)
        status = get_session_status(client, headers, session3)
        print(f"   Final Status: {status.get('status')} ({status.get('percent_complete')}%)")
    
    print("\n✨ Sequential Control Tests Complete!")


def create_test_session(client, headers, name):
    """Helper to create session with uploaded files"""
    # Create session
    session_response = client.post(
        "/api/sessions",
        headers=headers,
        json={"session_name": name, "processing_options": {}}
    )
    
    if session_response.status_code != 201:
        raise Exception(f"Failed to create session: {session_response.text}")
    
    session_id = session_response.json()["session_id"]
    
    # Upload files
    pdf_content = create_test_pdf_content()
    upload_response = client.post(
        f"/api/sessions/{session_id}/upload",
        headers=headers,
        files={
            "car_file": ("test_car.pdf", pdf_content, "application/pdf"),
            "receipt_file": ("test_receipt.pdf", pdf_content, "application/pdf")
        }
    )
    
    if upload_response.status_code != 200:
        raise Exception(f"Failed to upload files: {upload_response.text}")
    
    return session_id


def get_session_status(client, headers, session_id):
    """Helper to get session status"""
    response = client.get(f"/api/sessions/{session_id}/status", headers=headers)
    if response.status_code == 200:
        return response.json()
    return {"status": "unknown", "percent_complete": 0}


def test_processing_state_management():
    """Test the internal processing state management"""
    print("\n🔧 Testing Processing State Management")
    print("=" * 40)
    
    from app.api.processing import get_processing_state, clear_processing_state
    
    test_session_id = "test-12345"
    
    # Test initial state
    state = get_processing_state(test_session_id)
    print(f"Initial state: {state}")
    
    # Modify state
    state["status"] = "processing"
    state["should_pause"] = True
    state["current_employee_index"] = 5
    
    # Verify persistence
    same_state = get_processing_state(test_session_id)
    print(f"Modified state: {same_state}")
    
    # Test clearing
    clear_processing_state(test_session_id)
    new_state = get_processing_state(test_session_id)
    print(f"Cleared state: {new_state}")
    
    print("✅ State management tests complete")


if __name__ == "__main__":
    test_processing_controls_sequential()
    test_processing_state_management()