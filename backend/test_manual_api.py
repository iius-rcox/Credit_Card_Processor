#!/usr/bin/env python3
"""
Manual API testing script for Session Management endpoints
Tests all endpoints with real HTTP requests to validate complete functionality
"""

import requests
import json
import uuid
from datetime import datetime


class SessionAPITester:
    def __init__(self, base_url="http://127.0.0.1:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        
        # Test authentication headers (development mode)
        self.session.headers.update({
            'X-Dev-User': 'rcox',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        self.test_results = []
        
    def log_result(self, test_name, success, details=None, response=None):
        """Log test result with details"""
        result = {
            'test_name': test_name,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'details': details or {},
        }
        
        if response:
            result['status_code'] = response.status_code
            try:
                result['response_body'] = response.json()
            except:
                result['response_body'] = response.text
        
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if response and not success:
            print(f"    Status: {response.status_code}, Body: {response.text[:200]}")
        print()

    def test_server_health(self):
        """Test if the server is running"""
        try:
            response = self.session.get(f"{self.base_url}/docs")
            success = response.status_code == 200
            self.log_result(
                "Server Health Check", 
                success, 
                {"url": f"{self.base_url}/docs"}, 
                response
            )
            return success
        except Exception as e:
            self.log_result("Server Health Check", False, {"error": str(e)})
            return False

    def test_create_session(self):
        """Test POST /api/sessions"""
        test_data = {
            "session_name": "API Test Session - " + str(uuid.uuid4())[:8],
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05,
                "auto_resolve_minor": False
            }
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/sessions", 
                json=test_data
            )
            
            success = response.status_code == 201
            details = {"request_data": test_data}
            
            if success:
                data = response.json()
                details["session_id"] = data.get("session_id")
                details["session_name"] = data.get("session_name")
                details["status"] = data.get("status")
                
                # Store session ID for further tests
                self.created_session_id = data.get("session_id")
            
            self.log_result("Create Session", success, details, response)
            return success, response.json() if success else None
            
        except Exception as e:
            self.log_result("Create Session", False, {"error": str(e)})
            return False, None

    def test_create_session_validation_error(self):
        """Test POST /api/sessions with validation error"""
        test_data = {
            "session_name": "",  # Empty name should fail
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05
            }
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/sessions", 
                json=test_data
            )
            
            # Should return 422 for validation error
            success = response.status_code == 422
            
            self.log_result(
                "Create Session - Validation Error", 
                success, 
                {"expected_status": 422}, 
                response
            )
            return success
            
        except Exception as e:
            self.log_result("Create Session - Validation Error", False, {"error": str(e)})
            return False

    def test_get_session(self, session_id=None):
        """Test GET /api/sessions/{session_id}"""
        if not session_id and hasattr(self, 'created_session_id'):
            session_id = self.created_session_id
        
        if not session_id:
            self.log_result("Get Session", False, {"error": "No session ID available"})
            return False
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/sessions/{session_id}"
            )
            
            success = response.status_code == 200
            details = {"session_id": session_id}
            
            if success:
                data = response.json()
                details.update({
                    "retrieved_id": data.get("session_id"),
                    "session_name": data.get("session_name"),
                    "status": data.get("status")
                })
            
            self.log_result("Get Session", success, details, response)
            return success
            
        except Exception as e:
            self.log_result("Get Session", False, {"error": str(e)})
            return False

    def test_get_session_not_found(self):
        """Test GET /api/sessions/{session_id} with non-existent ID"""
        fake_id = str(uuid.uuid4())
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/sessions/{fake_id}"
            )
            
            # Should return 404 for not found
            success = response.status_code == 404
            
            self.log_result(
                "Get Session - Not Found", 
                success, 
                {"fake_id": fake_id, "expected_status": 404}, 
                response
            )
            return success
            
        except Exception as e:
            self.log_result("Get Session - Not Found", False, {"error": str(e)})
            return False

    def test_get_session_invalid_uuid(self):
        """Test GET /api/sessions/{session_id} with invalid UUID"""
        invalid_id = "invalid-uuid-format"
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/sessions/{invalid_id}"
            )
            
            # Should return 400 for bad request
            success = response.status_code == 400
            
            self.log_result(
                "Get Session - Invalid UUID", 
                success, 
                {"invalid_id": invalid_id, "expected_status": 400}, 
                response
            )
            return success
            
        except Exception as e:
            self.log_result("Get Session - Invalid UUID", False, {"error": str(e)})
            return False

    def test_list_sessions(self):
        """Test GET /api/sessions"""
        try:
            response = self.session.get(f"{self.base_url}/api/sessions")
            
            success = response.status_code == 200
            details = {}
            
            if success:
                data = response.json()
                details.update({
                    "total_count": data.get("total_count", 0),
                    "page": data.get("page", 1),
                    "page_size": data.get("page_size", 20),
                    "sessions_count": len(data.get("sessions", []))
                })
            
            self.log_result("List Sessions", success, details, response)
            return success
            
        except Exception as e:
            self.log_result("List Sessions", False, {"error": str(e)})
            return False

    def test_list_sessions_with_pagination(self):
        """Test GET /api/sessions with pagination"""
        try:
            response = self.session.get(
                f"{self.base_url}/api/sessions?page=1&page_size=5"
            )
            
            success = response.status_code == 200
            details = {"params": "page=1&page_size=5"}
            
            if success:
                data = response.json()
                details.update({
                    "page": data.get("page"),
                    "page_size": data.get("page_size"),
                    "total_count": data.get("total_count")
                })
                
                # Verify pagination parameters are correct
                success = (data.get("page") == 1 and data.get("page_size") == 5)
            
            self.log_result("List Sessions - Pagination", success, details, response)
            return success
            
        except Exception as e:
            self.log_result("List Sessions - Pagination", False, {"error": str(e)})
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Manual API Testing for Session Management")
        print("=" * 60)
        
        # Check server health first
        if not self.test_server_health():
            print("\n❌ Server is not running. Please start the API server first.")
            print("Run: uvicorn app.main:app --reload")
            return
        
        # Run all tests
        print("Running Session API Tests...")
        print("-" * 40)
        
        # Create session tests
        self.test_create_session()
        self.test_create_session_validation_error()
        
        # Get session tests
        self.test_get_session()
        self.test_get_session_not_found()
        self.test_get_session_invalid_uuid()
        
        # List session tests
        self.test_list_sessions()
        self.test_list_sessions_with_pagination()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        failed = total - passed
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if failed > 0:
            print(f"\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test_name']}")
                    if result.get('details'):
                        print(f"    Details: {result['details']}")
        else:
            print(f"\n🎉 All tests passed!")
        
        # Save detailed results
        with open('manual_api_test_results.json', 'w') as f:
            json.dump(self.test_results, f, indent=2)
        print(f"\nDetailed results saved to 'manual_api_test_results.json'")


if __name__ == "__main__":
    tester = SessionAPITester()
    tester.run_all_tests()