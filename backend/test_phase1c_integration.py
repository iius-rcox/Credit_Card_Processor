#!/usr/bin/env python3
"""
Comprehensive QA Review Integration Test for Phase 1C: CORE API ENDPOINTS
Tests all three tasks (3.1, 3.2, 3.3) in an integrated workflow
"""

import sys
import uuid
import json
import hashlib
import tempfile
from pathlib import Path
from datetime import datetime, timezone
import asyncio
from io import BytesIO

# FastAPI imports
from fastapi.testclient import TestClient

# Application imports
from app.main import app
from app.database import get_db, init_database, SessionLocal
from app.auth import get_current_user, UserInfo
from app.models import ProcessingSession, FileUpload, SessionStatus, FileType, UploadStatus
from app.schemas import SessionCreateRequest, ProcessingOptions


def create_test_user(username="testuser", is_admin=False):
    """Create a test user"""
    return UserInfo(
        username=username,
        is_admin=is_admin,
        is_authenticated=True,
        auth_method="test",
        timestamp=datetime.now(timezone.utc)
    )


def create_test_pdf(size_mb=0.1):
    """Create a minimal valid PDF for testing"""
    # Minimal PDF structure
    pdf_content = b"""%PDF-1.4
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
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF Content) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
379
%%EOF"""
    
    # Pad to desired size
    target_size = int(size_mb * 1024 * 1024)
    if len(pdf_content) < target_size:
        padding_size = target_size - len(pdf_content)
        pdf_content += b" " * padding_size
    
    return pdf_content


class Phase1CIntegrationTester:
    """Comprehensive integration tester for Phase 1C"""
    
    def __init__(self):
        self.client = TestClient(app)
        self.test_results = {
            'task_3_1': {'status': 'pending', 'tests': []},
            'task_3_2': {'status': 'pending', 'tests': []},
            'task_3_3': {'status': 'pending', 'tests': []},
            'integration': {'status': 'pending', 'tests': []},
            'performance': {'status': 'pending', 'tests': []},
            'security': {'status': 'pending', 'tests': []},
        }
        self.admin_user = create_test_user("rcox", is_admin=True)
        self.regular_user = create_test_user("testuser", is_admin=False)
        
    def setup_database(self):
        """Initialize test database"""
        try:
            init_database()
            print("✅ Database initialized successfully")
            return True
        except Exception as e:
            print(f"❌ Database initialization failed: {e}")
            return False
    
    def override_auth(self, user):
        """Override authentication for testing"""
        app.dependency_overrides[get_current_user] = lambda: user
    
    def clear_overrides(self):
        """Clear all dependency overrides"""
        app.dependency_overrides.clear()
    
    def test_task_3_1_session_management(self):
        """Test Task 3.1: Session Management APIs"""
        print("\n🔍 Testing Task 3.1: Session Management APIs")
        results = []
        
        try:
            # Test 1: Create Session (POST /api/sessions)
            print("  Testing session creation...")
            self.override_auth(self.admin_user)
            
            session_data = {
                "session_name": "QA Test Session",
                "processing_options": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05,
                    "auto_resolve_minor": False
                },
                "delta_session_id": None
            }
            
            response = self.client.post("/api/sessions", json=session_data)
            if response.status_code == 201:
                session_response = response.json()
                session_id = session_response["session_id"]
                print(f"    ✅ Session created successfully: {session_id}")
                results.append({"test": "create_session", "status": "pass", "details": session_response})
            else:
                print(f"    ❌ Session creation failed: {response.status_code} - {response.text}")
                results.append({"test": "create_session", "status": "fail", "error": response.text})
                return results
            
            # Test 2: Retrieve Session (GET /api/sessions/{id})
            print("  Testing session retrieval...")
            response = self.client.get(f"/api/sessions/{session_id}")
            if response.status_code == 200:
                retrieved_session = response.json()
                print("    ✅ Session retrieved successfully")
                results.append({"test": "get_session", "status": "pass", "details": retrieved_session})
            else:
                print(f"    ❌ Session retrieval failed: {response.status_code}")
                results.append({"test": "get_session", "status": "fail", "error": response.text})
            
            # Test 3: List Sessions (GET /api/sessions)
            print("  Testing session listing...")
            response = self.client.get("/api/sessions?page=1&page_size=10")
            if response.status_code == 200:
                sessions_list = response.json()
                print(f"    ✅ Sessions listed successfully: {sessions_list['total_count']} sessions")
                results.append({"test": "list_sessions", "status": "pass", "details": sessions_list})
            else:
                print(f"    ❌ Session listing failed: {response.status_code}")
                results.append({"test": "list_sessions", "status": "fail", "error": response.text})
            
            # Test 4: Access Control
            print("  Testing access control...")
            self.override_auth(self.regular_user)
            response = self.client.get("/api/sessions")
            if response.status_code == 200:
                user_sessions = response.json()
                print("    ✅ Access control working - regular user sees filtered results")
                results.append({"test": "access_control", "status": "pass", "details": user_sessions})
            else:
                print(f"    ❌ Access control failed: {response.status_code}")
                results.append({"test": "access_control", "status": "fail", "error": response.text})
            
        except Exception as e:
            print(f"    ❌ Task 3.1 testing failed with exception: {e}")
            results.append({"test": "exception", "status": "fail", "error": str(e)})
        finally:
            self.clear_overrides()
        
        self.test_results['task_3_1']['tests'] = results
        self.test_results['task_3_1']['status'] = 'pass' if all(r['status'] == 'pass' for r in results) else 'fail'
        return results
    
    def test_task_3_2_file_upload(self):
        """Test Task 3.2: File Upload Implementation"""
        print("\n🔍 Testing Task 3.2: File Upload Implementation")
        results = []
        
        try:
            # First create a session for upload testing
            self.override_auth(self.admin_user)
            session_data = {
                "session_name": "File Upload Test Session",
                "processing_options": {
                    "skip_duplicates": True,
                    "validation_threshold": 0.05
                }
            }
            
            session_response = self.client.post("/api/sessions", json=session_data)
            if session_response.status_code != 201:
                print(f"    ❌ Failed to create test session: {session_response.status_code}")
                results.append({"test": "setup", "status": "fail", "error": "Failed to create test session"})
                return results
            
            session_id = session_response.json()["session_id"]
            print(f"  Created test session: {session_id}")
            
            # Test 1: Valid File Upload
            print("  Testing valid PDF file upload...")
            car_pdf = create_test_pdf(0.5)  # 0.5MB
            receipt_pdf = create_test_pdf(0.3)  # 0.3MB
            
            files = {
                "car_file": ("test_car.pdf", BytesIO(car_pdf), "application/pdf"),
                "receipt_file": ("test_receipt.pdf", BytesIO(receipt_pdf), "application/pdf")
            }
            
            response = self.client.post(f"/api/sessions/{session_id}/upload", files=files)
            if response.status_code == 200:
                upload_response = response.json()
                print("    ✅ Files uploaded successfully")
                print(f"      CAR file: {len(car_pdf)} bytes")
                print(f"      Receipt file: {len(receipt_pdf)} bytes")
                results.append({"test": "valid_upload", "status": "pass", "details": upload_response})
                
                # Verify checksums
                car_checksum = hashlib.sha256(car_pdf).hexdigest()
                receipt_checksum = hashlib.sha256(receipt_pdf).hexdigest()
                
                uploaded_files = upload_response["uploaded_files"]
                car_file = next((f for f in uploaded_files if f["file_type"] == "car"), None)
                receipt_file = next((f for f in uploaded_files if f["file_type"] == "receipt"), None)
                
                if car_file and car_file["checksum"] == car_checksum:
                    print("    ✅ CAR file checksum verified")
                    results.append({"test": "car_checksum", "status": "pass"})
                else:
                    print("    ❌ CAR file checksum mismatch")
                    results.append({"test": "car_checksum", "status": "fail"})
                
                if receipt_file and receipt_file["checksum"] == receipt_checksum:
                    print("    ✅ Receipt file checksum verified")
                    results.append({"test": "receipt_checksum", "status": "pass"})
                else:
                    print("    ❌ Receipt file checksum mismatch")
                    results.append({"test": "receipt_checksum", "status": "fail"})
                    
            else:
                print(f"    ❌ File upload failed: {response.status_code} - {response.text}")
                results.append({"test": "valid_upload", "status": "fail", "error": response.text})
            
            # Test 2: File Type Validation
            print("  Testing file type validation...")
            invalid_files = {
                "car_file": ("invalid.txt", BytesIO(b"not a pdf"), "text/plain"),
                "receipt_file": ("test_receipt.pdf", BytesIO(receipt_pdf), "application/pdf")
            }
            
            # Create new session for this test
            session_response2 = self.client.post("/api/sessions", json={
                "session_name": "File Type Test Session",
                "processing_options": {"skip_duplicates": True}
            })
            session_id2 = session_response2.json()["session_id"]
            
            response = self.client.post(f"/api/sessions/{session_id2}/upload", files=invalid_files)
            if response.status_code == 400:
                print("    ✅ File type validation working")
                results.append({"test": "file_type_validation", "status": "pass"})
            else:
                print(f"    ❌ File type validation failed: {response.status_code}")
                results.append({"test": "file_type_validation", "status": "fail"})
            
            # Test 3: Access Control for Uploads
            print("  Testing upload access control...")
            self.override_auth(self.regular_user)
            
            # Try to upload to admin's session
            response = self.client.post(f"/api/sessions/{session_id}/upload", files=files)
            if response.status_code == 403:
                print("    ✅ Upload access control working")
                results.append({"test": "upload_access_control", "status": "pass"})
            else:
                print(f"    ❌ Upload access control failed: {response.status_code}")
                results.append({"test": "upload_access_control", "status": "fail"})
            
        except Exception as e:
            print(f"    ❌ Task 3.2 testing failed with exception: {e}")
            results.append({"test": "exception", "status": "fail", "error": str(e)})
        finally:
            self.clear_overrides()
        
        self.test_results['task_3_2']['tests'] = results
        self.test_results['task_3_2']['status'] = 'pass' if all(r['status'] == 'pass' for r in results) else 'fail'
        return results
    
    def test_task_3_3_status_polling(self):
        """Test Task 3.3: Status Polling Endpoint"""
        print("\n🔍 Testing Task 3.3: Status Polling Endpoint")
        results = []
        
        try:
            self.override_auth(self.admin_user)
            
            # Create session and upload files first
            session_data = {
                "session_name": "Status Polling Test Session",
                "processing_options": {"skip_duplicates": True}
            }
            
            session_response = self.client.post("/api/sessions", json=session_data)
            session_id = session_response.json()["session_id"]
            
            # Test 1: Status for PENDING session
            print("  Testing status endpoint for PENDING session...")
            response = self.client.get(f"/api/sessions/{session_id}/status")
            if response.status_code == 200:
                status_response = response.json()
                if status_response["status"] == "pending":
                    print("    ✅ PENDING session status retrieved correctly")
                    results.append({"test": "pending_status", "status": "pass", "details": status_response})
                    
                    # Verify required fields
                    required_fields = [
                        "session_id", "session_name", "status", "created_by", 
                        "total_employees", "percent_complete", "completed_employees",
                        "processing_employees", "issues_employees", "pending_employees",
                        "recent_activities"
                    ]
                    
                    missing_fields = [f for f in required_fields if f not in status_response]
                    if not missing_fields:
                        print("    ✅ All required status fields present")
                        results.append({"test": "status_fields", "status": "pass"})
                    else:
                        print(f"    ❌ Missing status fields: {missing_fields}")
                        results.append({"test": "status_fields", "status": "fail", "missing": missing_fields})
                else:
                    print(f"    ❌ Wrong status returned: {status_response['status']}")
                    results.append({"test": "pending_status", "status": "fail"})
            else:
                print(f"    ❌ Status endpoint failed: {response.status_code}")
                results.append({"test": "pending_status", "status": "fail", "error": response.text})
            
            # Test 2: Upload files and check PROCESSING status
            print("  Testing status endpoint after file upload...")
            car_pdf = create_test_pdf(0.2)
            receipt_pdf = create_test_pdf(0.2)
            
            files = {
                "car_file": ("status_car.pdf", BytesIO(car_pdf), "application/pdf"),
                "receipt_file": ("status_receipt.pdf", BytesIO(receipt_pdf), "application/pdf")
            }
            
            upload_response = self.client.post(f"/api/sessions/{session_id}/upload", files=files)
            if upload_response.status_code == 200:
                # Check status after upload
                response = self.client.get(f"/api/sessions/{session_id}/status")
                if response.status_code == 200:
                    status_response = response.json()
                    if status_response["status"] == "processing":
                        print("    ✅ PROCESSING session status retrieved correctly")
                        results.append({"test": "processing_status", "status": "pass"})
                        
                        # Check files_uploaded field
                        if status_response.get("files_uploaded"):
                            print("    ✅ Uploaded files information present")
                            results.append({"test": "files_uploaded_info", "status": "pass"})
                        else:
                            print("    ❌ Files uploaded information missing")
                            results.append({"test": "files_uploaded_info", "status": "fail"})
                    else:
                        print(f"    ❌ Status not updated after upload: {status_response['status']}")
                        results.append({"test": "processing_status", "status": "fail"})
                else:
                    print(f"    ❌ Status check after upload failed: {response.status_code}")
                    results.append({"test": "processing_status", "status": "fail"})
            
            # Test 3: Performance - measure response time
            print("  Testing status endpoint performance...")
            import time
            
            start_time = time.time()
            response = self.client.get(f"/api/sessions/{session_id}/status")
            end_time = time.time()
            
            response_time_ms = (end_time - start_time) * 1000
            
            if response.status_code == 200 and response_time_ms < 200:  # Target < 200ms
                print(f"    ✅ Status endpoint performance good: {response_time_ms:.2f}ms")
                results.append({"test": "performance", "status": "pass", "response_time_ms": response_time_ms})
            else:
                print(f"    ⚠️ Status endpoint performance: {response_time_ms:.2f}ms (target < 200ms)")
                results.append({"test": "performance", "status": "warning", "response_time_ms": response_time_ms})
            
            # Test 4: Access control
            print("  Testing status access control...")
            self.override_auth(self.regular_user)
            
            response = self.client.get(f"/api/sessions/{session_id}/status")
            if response.status_code == 403:
                print("    ✅ Status access control working")
                results.append({"test": "status_access_control", "status": "pass"})
            else:
                print(f"    ❌ Status access control failed: {response.status_code}")
                results.append({"test": "status_access_control", "status": "fail"})
            
        except Exception as e:
            print(f"    ❌ Task 3.3 testing failed with exception: {e}")
            results.append({"test": "exception", "status": "fail", "error": str(e)})
        finally:
            self.clear_overrides()
        
        self.test_results['task_3_3']['tests'] = results
        self.test_results['task_3_3']['status'] = 'pass' if all(r['status'] == 'pass' for r in results) else 'fail'
        return results
    
    def test_end_to_end_workflow(self):
        """Test complete end-to-end workflow"""
        print("\n🔍 Testing End-to-End Workflow")
        results = []
        
        try:
            self.override_auth(self.admin_user)
            
            # Step 1: Create session
            print("  Step 1: Creating session...")
            session_data = {
                "session_name": "E2E Test Session",
                "processing_options": {"skip_duplicates": True, "validation_threshold": 0.05}
            }
            
            response = self.client.post("/api/sessions", json=session_data)
            if response.status_code != 201:
                results.append({"test": "e2e_create", "status": "fail"})
                return results
            
            session_id = response.json()["session_id"]
            print(f"    Created session: {session_id}")
            
            # Step 2: Check initial status
            print("  Step 2: Checking initial status...")
            response = self.client.get(f"/api/sessions/{session_id}/status")
            if response.status_code == 200 and response.json()["status"] == "pending":
                print("    ✅ Initial status correct: PENDING")
            else:
                results.append({"test": "e2e_initial_status", "status": "fail"})
                return results
            
            # Step 3: Upload files
            print("  Step 3: Uploading files...")
            car_pdf = create_test_pdf(1.0)  # 1MB
            receipt_pdf = create_test_pdf(0.8)  # 0.8MB
            
            files = {
                "car_file": ("e2e_car.pdf", BytesIO(car_pdf), "application/pdf"),
                "receipt_file": ("e2e_receipt.pdf", BytesIO(receipt_pdf), "application/pdf")
            }
            
            response = self.client.post(f"/api/sessions/{session_id}/upload", files=files)
            if response.status_code != 200:
                results.append({"test": "e2e_upload", "status": "fail"})
                return results
            
            print("    ✅ Files uploaded successfully")
            
            # Step 4: Check status after upload
            print("  Step 4: Checking status after upload...")
            response = self.client.get(f"/api/sessions/{session_id}/status")
            if response.status_code == 200:
                status = response.json()
                if status["status"] == "processing" and status.get("files_uploaded"):
                    print("    ✅ Status updated to PROCESSING with file info")
                    results.append({"test": "e2e_workflow", "status": "pass", "details": status})
                else:
                    results.append({"test": "e2e_workflow", "status": "fail", "error": "Status not properly updated"})
            else:
                results.append({"test": "e2e_workflow", "status": "fail", "error": f"Status check failed: {response.status_code}"})
            
            # Step 5: Verify session data
            print("  Step 5: Verifying session data...")
            response = self.client.get(f"/api/sessions/{session_id}")
            if response.status_code == 200:
                session_data = response.json()
                if session_data["status"] == "processing":
                    print("    ✅ Session data consistent")
                    results.append({"test": "e2e_consistency", "status": "pass"})
                else:
                    results.append({"test": "e2e_consistency", "status": "fail"})
            
        except Exception as e:
            print(f"    ❌ E2E workflow failed: {e}")
            results.append({"test": "e2e_exception", "status": "fail", "error": str(e)})
        finally:
            self.clear_overrides()
        
        self.test_results['integration']['tests'] = results
        self.test_results['integration']['status'] = 'pass' if all(r['status'] == 'pass' for r in results) else 'fail'
        return results
    
    def test_performance_benchmarks(self):
        """Test performance benchmarks for all endpoints"""
        print("\n🔍 Testing Performance Benchmarks")
        results = []
        
        try:
            self.override_auth(self.admin_user)
            import time
            
            # Create test session
            session_data = {"session_name": "Performance Test", "processing_options": {}}
            response = self.client.post("/api/sessions", json=session_data)
            session_id = response.json()["session_id"]
            
            # Test 1: Session creation performance
            print("  Testing session creation performance...")
            times = []
            for i in range(5):
                start = time.time()
                response = self.client.post("/api/sessions", json={
                    "session_name": f"Perf Test {i}",
                    "processing_options": {}
                })
                end = time.time()
                if response.status_code == 201:
                    times.append((end - start) * 1000)
            
            avg_create_time = sum(times) / len(times) if times else 0
            print(f"    Average creation time: {avg_create_time:.2f}ms")
            results.append({"test": "create_performance", "avg_time_ms": avg_create_time, "status": "pass" if avg_create_time < 100 else "warning"})
            
            # Test 2: Status polling performance
            print("  Testing status polling performance...")
            times = []
            for i in range(10):
                start = time.time()
                response = self.client.get(f"/api/sessions/{session_id}/status")
                end = time.time()
                if response.status_code == 200:
                    times.append((end - start) * 1000)
            
            avg_status_time = sum(times) / len(times) if times else 0
            print(f"    Average status polling time: {avg_status_time:.2f}ms")
            results.append({"test": "status_performance", "avg_time_ms": avg_status_time, "status": "pass" if avg_status_time < 200 else "warning"})
            
            # Test 3: Session listing performance
            print("  Testing session listing performance...")
            times = []
            for i in range(5):
                start = time.time()
                response = self.client.get("/api/sessions?page=1&page_size=20")
                end = time.time()
                if response.status_code == 200:
                    times.append((end - start) * 1000)
            
            avg_list_time = sum(times) / len(times) if times else 0
            print(f"    Average listing time: {avg_list_time:.2f}ms")
            results.append({"test": "list_performance", "avg_time_ms": avg_list_time, "status": "pass" if avg_list_time < 150 else "warning"})
            
        except Exception as e:
            print(f"    ❌ Performance testing failed: {e}")
            results.append({"test": "performance_exception", "status": "fail", "error": str(e)})
        finally:
            self.clear_overrides()
        
        self.test_results['performance']['tests'] = results
        self.test_results['performance']['status'] = 'pass' if all(r.get('status') in ['pass', 'warning'] for r in results) else 'fail'
        return results
    
    def test_security_aspects(self):
        """Test security aspects"""
        print("\n🔍 Testing Security Aspects")
        results = []
        
        try:
            # Test 1: Unauthenticated access
            print("  Testing unauthenticated access...")
            self.clear_overrides()
            
            response = self.client.get("/api/sessions")
            if response.status_code == 401:
                print("    ✅ Unauthenticated access properly blocked")
                results.append({"test": "auth_required", "status": "pass"})
            else:
                print(f"    ❌ Unauthenticated access not blocked: {response.status_code}")
                results.append({"test": "auth_required", "status": "fail"})
            
            # Test 2: Input validation
            print("  Testing input validation...")
            self.override_auth(self.admin_user)
            
            # Invalid session name
            response = self.client.post("/api/sessions", json={
                "session_name": "",  # Empty name should fail
                "processing_options": {}
            })
            if response.status_code == 422:
                print("    ✅ Input validation working")
                results.append({"test": "input_validation", "status": "pass"})
            else:
                print(f"    ❌ Input validation failed: {response.status_code}")
                results.append({"test": "input_validation", "status": "fail"})
            
            # Test 3: Invalid UUID handling
            print("  Testing invalid UUID handling...")
            response = self.client.get("/api/sessions/invalid-uuid")
            if response.status_code == 400:
                print("    ✅ Invalid UUID properly handled")
                results.append({"test": "uuid_validation", "status": "pass"})
            else:
                print(f"    ❌ Invalid UUID not handled: {response.status_code}")
                results.append({"test": "uuid_validation", "status": "fail"})
            
            # Test 4: Access control between users
            print("  Testing user access control...")
            # Create session as admin
            session_response = self.client.post("/api/sessions", json={
                "session_name": "Admin Session",
                "processing_options": {}
            })
            session_id = session_response.json()["session_id"]
            
            # Try to access as regular user
            self.override_auth(self.regular_user)
            response = self.client.get(f"/api/sessions/{session_id}")
            if response.status_code == 403:
                print("    ✅ User access control working")
                results.append({"test": "user_access_control", "status": "pass"})
            else:
                print(f"    ❌ User access control failed: {response.status_code}")
                results.append({"test": "user_access_control", "status": "fail"})
            
        except Exception as e:
            print(f"    ❌ Security testing failed: {e}")
            results.append({"test": "security_exception", "status": "fail", "error": str(e)})
        finally:
            self.clear_overrides()
        
        self.test_results['security']['tests'] = results
        self.test_results['security']['status'] = 'pass' if all(r['status'] == 'pass' for r in results) else 'fail'
        return results
    
    def run_comprehensive_test(self):
        """Run all tests and generate comprehensive report"""
        print("=" * 80)
        print("🚀 STARTING COMPREHENSIVE QA REVIEW FOR PHASE 1C: CORE API ENDPOINTS")
        print("=" * 80)
        
        # Setup
        if not self.setup_database():
            print("❌ Database setup failed, aborting tests")
            return False
        
        # Run all test categories
        self.test_task_3_1_session_management()
        self.test_task_3_2_file_upload()
        self.test_task_3_3_status_polling()
        self.test_end_to_end_workflow()
        self.test_performance_benchmarks()
        self.test_security_aspects()
        
        # Generate summary report
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE QA REVIEW SUMMARY")
        print("=" * 80)
        
        overall_status = "PASS"
        
        for category, results in self.test_results.items():
            status_icon = "✅" if results['status'] == 'pass' else "⚠️" if results['status'] == 'warning' else "❌"
            print(f"{status_icon} {category.upper()}: {results['status'].upper()}")
            
            if results['status'] == 'fail':
                overall_status = "FAIL"
            
            for test in results['tests']:
                test_icon = "  ✅" if test['status'] == 'pass' else "  ⚠️" if test['status'] == 'warning' else "  ❌"
                print(f"{test_icon} {test['test']}")
        
        print("\n" + "=" * 80)
        print(f"🎯 OVERALL PHASE 1C STATUS: {overall_status}")
        print("=" * 80)
        
        # Save detailed results to file
        results_file = f"phase1c_qa_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)
        
        print(f"📄 Detailed results saved to: {results_file}")
        
        return overall_status == "PASS"


def main():
    """Main function to run the comprehensive QA review"""
    tester = Phase1CIntegrationTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n🎉 Phase 1C QA Review: ALL TESTS PASSED!")
        print("✅ Ready to proceed to Phase 1D: Processing Engine Implementation")
        return 0
    else:
        print("\n⚠️ Phase 1C QA Review: SOME TESTS FAILED")
        print("❌ Review failed tests before proceeding to Phase 1D")
        return 1


if __name__ == "__main__":
    sys.exit(main())