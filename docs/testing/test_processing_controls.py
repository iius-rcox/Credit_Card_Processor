#!/usr/bin/env python3
"""
Test Processing Control Functions (Pause/Resume/Cancel)
Specifically tests with slower processing to allow for controls testing
"""

import time
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

def test_processing_controls():
    """Test pause, resume, and cancel controls with slower processing"""
    client = TestClient(app)
    headers = {"X-Dev-User": "testuser"}
    
    print("🧪 Testing Processing Controls with Slower Processing")
    print("=" * 60)
    
    # Create session
    session_response = client.post(
        "/api/sessions",
        headers=headers,
        json={
            "session_name": "Control Test Session",
            "processing_options": {}
        }
    )
    
    if session_response.status_code != 201:
        print("❌ Failed to create session")
        return
    
    session_id = session_response.json()["session_id"]
    print(f"✅ Created session: {session_id}")
    
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
        print("❌ Failed to upload files")
        return
    
    print("✅ Files uploaded successfully")
    
    # Start processing with large batch to have time for controls
    start_response = client.post(
        f"/api/sessions/{session_id}/process",
        headers=headers,
        json={
            "processing_config": {
                "batch_size": 50,  # Large batch for longer processing
                "max_processing_time": 600
            }
        }
    )
    
    if start_response.status_code != 202:
        print(f"❌ Failed to start processing: {start_response.text}")
        return
    
    print("✅ Processing started successfully")
    
    # Wait a bit for processing to actually start
    time.sleep(1.5)
    
    # Test pause
    print("\n🔲 Testing Pause Control")
    pause_response = client.post(f"/api/sessions/{session_id}/pause", headers=headers)
    
    if pause_response.status_code == 200:
        print("✅ Pause request successful")
        pause_data = pause_response.json()
        print(f"   Action: {pause_data.get('action')}")
        print(f"   Message: {pause_data.get('message')}")
    else:
        print(f"❌ Pause failed: {pause_response.text}")
    
    # Wait for pause to take effect
    time.sleep(2.0)
    
    # Check status after pause
    status_response = client.get(f"/api/sessions/{session_id}/status", headers=headers)
    if status_response.status_code == 200:
        status_data = status_response.json()
        print(f"   Status after pause: {status_data.get('status')}")
        print(f"   Progress: {status_data.get('percent_complete')}%")
    
    # Test resume
    print("\n▶️ Testing Resume Control")
    resume_response = client.post(f"/api/sessions/{session_id}/resume", headers=headers)
    
    if resume_response.status_code == 200:
        print("✅ Resume request successful")
        resume_data = resume_response.json()
        print(f"   Action: {resume_data.get('action')}")
        print(f"   Message: {resume_data.get('message')}")
    elif resume_response.status_code == 409:
        print("⚠️ Resume returned 409 (expected if processing completed quickly)")
        print(f"   Message: {resume_response.json().get('detail')}")
    else:
        print(f"❌ Resume failed: {resume_response.text}")
    
    # Wait a bit more
    time.sleep(1.5)
    
    # Test cancel
    print("\n❌ Testing Cancel Control")
    cancel_response = client.post(f"/api/sessions/{session_id}/cancel", headers=headers)
    
    if cancel_response.status_code == 200:
        print("✅ Cancel request successful")
        cancel_data = cancel_response.json()
        print(f"   Action: {cancel_data.get('action')}")
        print(f"   Message: {cancel_data.get('message')}")
    elif cancel_response.status_code == 409:
        print("⚠️ Cancel returned 409 (expected if processing already completed)")
        print(f"   Message: {cancel_response.json().get('detail')}")
    else:
        print(f"❌ Cancel failed: {cancel_response.text}")
    
    # Final status check
    time.sleep(2.0)
    final_status_response = client.get(f"/api/sessions/{session_id}/status", headers=headers)
    if final_status_response.status_code == 200:
        status_data = final_status_response.json()
        print(f"\n📊 Final Status:")
        print(f"   Status: {status_data.get('status')}")
        print(f"   Progress: {status_data.get('percent_complete')}%")
        print(f"   Activities: {len(status_data.get('recent_activities', []))}")
        
        # Show recent activities
        activities = status_data.get('recent_activities', [])
        if activities:
            print("   Recent Activities:")
            for activity in activities[-3:]:  # Show last 3 activities
                print(f"     - {activity.get('activity_type')}: {activity.get('activity_message')}")
    
    print("\n✨ Processing Controls Test Complete!")

if __name__ == "__main__":
    test_processing_controls()