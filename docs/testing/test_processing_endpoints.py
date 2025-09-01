#!/usr/bin/env python3
"""
Manual Test Script for Processing API Endpoints
Tests Task 4.1: Background Processing Framework
"""

import asyncio
import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from fastapi.testclient import TestClient

# Import our application
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

class ProcessingAPITester:
    def __init__(self):
        self.client = TestClient(app)
        self.headers = {"X-Dev-User": "testuser"}
        self.admin_headers = {"X-Dev-User": "admin"} 
        self.session_id = None
        
    def print_result(self, test_name: str, response, expected_status: int = 200):
        """Print test result with formatting"""
        status_icon = "✅" if response.status_code == expected_status else "❌"
        print(f"{status_icon} {test_name}")
        print(f"   Status: {response.status_code} (expected: {expected_status})")
        
        if response.status_code != expected_status:
            print(f"   Response: {response.text[:200]}...")
        else:
            try:
                data = response.json()
                if isinstance(data, dict):
                    key_info = {k: v for k, v in data.items() if k in ['session_id', 'status', 'action', 'message', 'timestamp']}
                    print(f"   Data: {key_info}")
            except:
                print(f"   Text: {response.text[:100]}...")
        print()
    
    def create_session(self) -> str:
        """Create a test session"""
        response = self.client.post(
            "/api/sessions",
            headers=self.headers,
            json={
                "session_name": "Processing API Test Session",
                "processing_options": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05
                }
            }
        )
        
        self.print_result("Create Session", response, 201)
        if response.status_code == 201:
            self.session_id = response.json()["session_id"]
            return self.session_id
        return None
    
    def upload_files(self) -> bool:
        """Upload test files to the session"""
        if not self.session_id:
            print("❌ No session ID available for file upload")
            return False
        
        # Create test PDF content
        pdf_content = create_test_pdf_content()
        
        # Upload both files
        response = self.client.post(
            f"/api/sessions/{self.session_id}/upload",
            headers=self.headers,
            files={
                "car_file": ("test_car.pdf", pdf_content, "application/pdf"),
                "receipt_file": ("test_receipt.pdf", pdf_content, "application/pdf")
            }
        )
        
        self.print_result("Upload Files", response, 200)
        return response.status_code == 200
    
    def test_start_processing(self):
        """Test the start processing endpoint"""
        if not self.session_id:
            print("❌ No session ID available for processing")
            return False
        
        response = self.client.post(
            f"/api/sessions/{self.session_id}/process",
            headers=self.headers,
            json={
                "processing_config": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05,
                    "batch_size": 5,
                    "max_processing_time": 300
                }
            }
        )
        
        self.print_result("Start Processing", response, 202)
        return response.status_code == 202
    
    def test_pause_processing(self):
        """Test the pause processing endpoint"""
        if not self.session_id:
            return False
        
        response = self.client.post(
            f"/api/sessions/{self.session_id}/pause",
            headers=self.headers
        )
        
        self.print_result("Pause Processing", response, 200)
        return response.status_code == 200
    
    def test_resume_processing(self):
        """Test the resume processing endpoint"""
        if not self.session_id:
            return False
        
        # Wait a moment for pause to take effect
        time.sleep(0.2)
        
        response = self.client.post(
            f"/api/sessions/{self.session_id}/resume",
            headers=self.headers
        )
        
        # This might fail if processing completed too quickly
        expected_codes = [200, 409]  # 409 if not paused
        success = response.status_code in expected_codes
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} Resume Processing")
        print(f"   Status: {response.status_code} (expected: {expected_codes})")
        try:
            data = response.json()
            print(f"   Data: {data}")
        except:
            print(f"   Text: {response.text[:100]}...")
        print()
        
        return success
    
    def test_cancel_processing(self):
        """Test the cancel processing endpoint"""
        if not self.session_id:
            return False
        
        response = self.client.post(
            f"/api/sessions/{self.session_id}/cancel",
            headers=self.headers
        )
        
        # May succeed or fail depending on processing state
        expected_codes = [200, 409]  # 409 if not in cancellable state
        success = response.status_code in expected_codes
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} Cancel Processing")
        print(f"   Status: {response.status_code} (expected: {expected_codes})")
        try:
            data = response.json()
            print(f"   Data: {data}")
        except:
            print(f"   Text: {response.text[:100]}...")
        print()
        
        return success
    
    def test_session_status(self):
        """Test session status polling integration"""
        if not self.session_id:
            return False
        
        response = self.client.get(
            f"/api/sessions/{self.session_id}/status",
            headers=self.headers
        )
        
        self.print_result("Session Status Polling", response, 200)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Status: {data.get('status')}")
            print(f"   Progress: {data.get('percent_complete', 0)}%")
            print(f"   Activities: {len(data.get('recent_activities', []))}")
        
        return response.status_code == 200
    
    def test_error_scenarios(self):
        """Test error handling scenarios"""
        print("🧪 Testing Error Scenarios:")
        print("=" * 50)
        
        # Test invalid session ID
        response = self.client.post(
            "/api/sessions/invalid-uuid/process",
            headers=self.headers,
            json={}
        )
        self.print_result("Invalid Session ID", response, 400)
        
        # Test non-existent session
        fake_id = str(uuid.uuid4())
        response = self.client.post(
            f"/api/sessions/{fake_id}/process",
            headers=self.headers,
            json={}
        )
        self.print_result("Non-existent Session", response, 404)
        
        # Test unauthorized access (different user)
        response = self.client.post(
            f"/api/sessions/{self.session_id}/pause",
            headers={"X-Dev-User": "otheruser"}
        )
        self.print_result("Unauthorized Access", response, 403)
    
    def test_processing_config_variations(self):
        """Test different processing configurations"""
        print("⚙️ Testing Configuration Variations:")
        print("=" * 50)
        
        # Create new session for config tests
        config_session = self.client.post(
            "/api/sessions",
            headers=self.headers,
            json={"session_name": "Config Test Session", "processing_options": {}}
        ).json()["session_id"]
        
        # Upload files
        pdf_content = create_test_pdf_content()
        self.client.post(
            f"/api/sessions/{config_session}/upload",
            headers=self.headers,
            files={
                "car_file": ("config_car.pdf", pdf_content, "application/pdf"),
                "receipt_file": ("config_receipt.pdf", pdf_content, "application/pdf")
            }
        )
        
        # Test with custom config
        response = self.client.post(
            f"/api/sessions/{config_session}/process",
            headers=self.headers,
            json={
                "processing_config": {
                    "skip_duplicates": False,
                    "validation_threshold": 0.1,
                    "batch_size": 20,
                    "max_processing_time": 7200
                }
            }
        )
        
        self.print_result("Custom Processing Config", response, 202)
        
        if response.status_code == 202:
            config = response.json().get("processing_config", {})
            print(f"   Applied Config: batch_size={config.get('batch_size')}, threshold={config.get('validation_threshold')}")
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Credit Card Processor - Task 4.1: Background Processing Framework Test")
        print("=" * 80)
        print()
        
        # Test authentication endpoints first
        print("🔐 Testing Authentication:")
        print("=" * 30)
        
        response = self.client.get("/api/auth/current-user", headers=self.headers)
        self.print_result("Current User", response, 200)
        
        response = self.client.get("/api/auth/status", headers=self.headers)
        self.print_result("Auth Status", response, 200)
        
        # Basic workflow test
        print("🏗️ Testing Basic Workflow:")
        print("=" * 30)
        
        if not self.create_session():
            print("❌ Cannot proceed without valid session")
            return
        
        if not self.upload_files():
            print("❌ Cannot proceed without uploaded files")
            return
        
        # Test processing endpoints
        print("⚡ Testing Processing Endpoints:")
        print("=" * 35)
        
        self.test_start_processing()
        time.sleep(0.5)  # Give processing time to start
        
        self.test_pause_processing()
        time.sleep(0.3)  # Give pause time to take effect
        
        self.test_resume_processing()
        time.sleep(0.3)  # Give resume time to take effect
        
        self.test_cancel_processing()
        
        # Test status polling
        print("📊 Testing Status Integration:")
        print("=" * 30)
        
        self.test_session_status()
        
        # Test error scenarios
        self.test_error_scenarios()
        
        # Test config variations
        self.test_processing_config_variations()
        
        print("✨ Test Suite Complete!")
        print("=" * 30)
        
        # Final status check
        if self.session_id:
            response = self.client.get(f"/api/sessions/{self.session_id}/status", headers=self.headers)
            if response.status_code == 200:
                data = response.json()
                print(f"Final Session Status: {data.get('status')}")
                print(f"Activities Logged: {len(data.get('recent_activities', []))}")


if __name__ == "__main__":
    tester = ProcessingAPITester()
    tester.run_comprehensive_test()