#!/usr/bin/env python3
"""
Authentication Performance Testing Suite for Credit Card Processor
Comprehensive performance testing with proper authentication headers
"""

import asyncio
import json
import logging
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Dict, List, Optional

import pytest
import requests
from fastapi.testclient import TestClient

from app.main import app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuthPerformanceTester:
    """Performance tester for authenticated endpoints"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = TestClient(app)
        self.results = {}
        
    def create_auth_headers(self, username: str, auth_method: str = "windows") -> Dict[str, str]:
        """Create proper authentication headers for testing"""
        if auth_method == "windows":
            return {
                "remote_user": username,
                "content-type": "application/json"
            }
        elif auth_method == "development":
            return {
                "x-dev-user": username,
                "content-type": "application/json"
            }
        else:
            return {"content-type": "application/json"}
    
    def create_admin_headers(self) -> Dict[str, str]:
        """Create admin user authentication headers"""
        return self.create_auth_headers("rcox")
    
    def create_regular_user_headers(self) -> Dict[str, str]:
        """Create regular user authentication headers"""
        return self.create_auth_headers("testuser")
    
    def measure_request_time(self, method: str, endpoint: str, headers: Dict[str, str], 
                           json_data: Optional[Dict] = None) -> Dict[str, any]:
        """Measure single request execution time"""
        start_time = time.perf_counter()
        
        try:
            if method.upper() == "GET":
                response = self.client.get(endpoint, headers=headers)
            elif method.upper() == "POST":
                response = self.client.post(endpoint, headers=headers, json=json_data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            end_time = time.perf_counter()
            duration_ms = (end_time - start_time) * 1000
            
            return {
                "success": True,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "response_size": len(response.content),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            end_time = time.perf_counter()
            duration_ms = (end_time - start_time) * 1000
            return {
                "success": False,
                "error": str(e),
                "duration_ms": duration_ms,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def run_concurrent_requests(self, method: str, endpoint: str, headers: Dict[str, str],
                              json_data: Optional[Dict] = None, num_requests: int = 10) -> List[Dict]:
        """Run concurrent requests and measure performance"""
        results = []
        
        with ThreadPoolExecutor(max_workers=min(num_requests, 10)) as executor:
            futures = []
            for _ in range(num_requests):
                future = executor.submit(
                    self.measure_request_time, method, endpoint, headers, json_data
                )
                futures.append(future)
            
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=30)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Request failed: {e}")
                    results.append({
                        "success": False,
                        "error": str(e),
                        "duration_ms": 0,
                        "timestamp": datetime.utcnow().isoformat()
                    })
        
        return results
    
    def analyze_performance_results(self, results: List[Dict], test_name: str) -> Dict[str, any]:
        """Analyze performance test results and generate statistics"""
        successful_results = [r for r in results if r.get("success", False)]
        failed_results = [r for r in results if not r.get("success", False)]
        
        if not successful_results:
            return {
                "test_name": test_name,
                "total_requests": len(results),
                "success_count": 0,
                "failure_count": len(failed_results),
                "success_rate": 0.0,
                "error": "All requests failed"
            }
        
        durations = [r["duration_ms"] for r in successful_results]
        status_codes = [r["status_code"] for r in successful_results]
        
        analysis = {
            "test_name": test_name,
            "total_requests": len(results),
            "success_count": len(successful_results),
            "failure_count": len(failed_results),
            "success_rate": len(successful_results) / len(results) * 100,
            "performance_metrics": {
                "avg_response_time_ms": statistics.mean(durations),
                "median_response_time_ms": statistics.median(durations),
                "min_response_time_ms": min(durations),
                "max_response_time_ms": max(durations),
                "p95_response_time_ms": sorted(durations)[int(0.95 * len(durations))],
                "std_dev_ms": statistics.stdev(durations) if len(durations) > 1 else 0
            },
            "status_codes": {
                "200": status_codes.count(200),
                "401": status_codes.count(401),
                "403": status_codes.count(403),
                "404": status_codes.count(404),
                "500": status_codes.count(500)
            }
        }
        
        # Performance thresholds and assessment
        avg_time = analysis["performance_metrics"]["avg_response_time_ms"]
        analysis["performance_assessment"] = {
            "meets_target": avg_time < 20,  # Target: <20ms auth overhead
            "performance_grade": self.get_performance_grade(avg_time),
            "recommendations": self.get_performance_recommendations(analysis)
        }
        
        return analysis
    
    def get_performance_grade(self, avg_time_ms: float) -> str:
        """Get performance grade based on average response time"""
        if avg_time_ms < 10:
            return "A+ (Excellent)"
        elif avg_time_ms < 20:
            return "A (Good)"
        elif avg_time_ms < 50:
            return "B (Fair)"
        elif avg_time_ms < 100:
            return "C (Poor)"
        else:
            return "D (Unacceptable)"
    
    def get_performance_recommendations(self, analysis: Dict) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        avg_time = analysis["performance_metrics"]["avg_response_time_ms"]
        std_dev = analysis["performance_metrics"]["std_dev_ms"]
        success_rate = analysis["success_rate"]
        
        if avg_time > 20:
            recommendations.append("Average response time exceeds 20ms target - consider auth caching")
        
        if std_dev > avg_time * 0.5:
            recommendations.append("High response time variability - investigate inconsistent performance")
        
        if success_rate < 95:
            recommendations.append("Success rate below 95% - investigate request failures")
        
        if analysis["status_codes"]["500"] > 0:
            recommendations.append("Internal server errors detected - check application logs")
        
        if not recommendations:
            recommendations.append("Performance meets all targets - no optimization needed")
        
        return recommendations

class TestSessionEndpointPerformance:
    """Performance tests for session management endpoints"""
    
    def setUp(self):
        """Set up test environment"""
        self.tester = AuthPerformanceTester()
        
    def test_create_session_performance_admin(self):
        """Test session creation performance with admin authentication"""
        self.setUp()
        
        headers = self.tester.create_admin_headers()
        test_data = {
            "session_name": "Performance Test Session",
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05,
                "auto_resolve_minor": False
            }
        }
        
        # Run performance test
        results = self.tester.run_concurrent_requests(
            "POST", "/api/sessions", headers, test_data, num_requests=20
        )
        
        # Analyze results
        analysis = self.tester.analyze_performance_results(results, "Create Session - Admin")
        
        # Assertions
        assert analysis["success_rate"] >= 95, f"Success rate too low: {analysis['success_rate']}%"
        assert analysis["performance_metrics"]["avg_response_time_ms"] < 100, "Average response time too high"
        
        # Log results
        logger.info(f"Session Creation Performance: {json.dumps(analysis, indent=2)}")
        return analysis
    
    def test_create_session_performance_regular_user(self):
        """Test session creation performance with regular user authentication"""
        self.setUp()
        
        headers = self.tester.create_regular_user_headers()
        test_data = {
            "session_name": "User Performance Test Session",
            "processing_options": {
                "skip_duplicates": True,
                "validation_threshold": 0.05
            }
        }
        
        # Run performance test
        results = self.tester.run_concurrent_requests(
            "POST", "/api/sessions", headers, test_data, num_requests=15
        )
        
        # Analyze results
        analysis = self.tester.analyze_performance_results(results, "Create Session - Regular User")
        
        # Assertions
        assert analysis["success_rate"] >= 95, f"Success rate too low: {analysis['success_rate']}%"
        
        # Log results
        logger.info(f"Session Creation (User) Performance: {json.dumps(analysis, indent=2)}")
        return analysis
    
    def test_get_session_performance_admin(self):
        """Test session retrieval performance with admin authentication"""
        self.setUp()
        
        # First create a session to retrieve
        headers = self.tester.create_admin_headers()
        create_data = {
            "session_name": "Test Session for Retrieval",
            "processing_options": {"skip_duplicates": True, "validation_threshold": 0.05}
        }
        
        create_response = self.tester.client.post("/api/sessions", headers=headers, json=create_data)
        assert create_response.status_code == 201
        session_id = create_response.json()["session_id"]
        
        # Run performance test
        results = self.tester.run_concurrent_requests(
            "GET", f"/api/sessions/{session_id}", headers, num_requests=25
        )
        
        # Analyze results
        analysis = self.tester.analyze_performance_results(results, "Get Session - Admin")
        
        # Assertions
        assert analysis["success_rate"] >= 98, f"Success rate too low: {analysis['success_rate']}%"
        assert analysis["performance_metrics"]["avg_response_time_ms"] < 50, "Average response time too high"
        
        # Log results
        logger.info(f"Session Retrieval Performance: {json.dumps(analysis, indent=2)}")
        return analysis
    
    def test_list_sessions_performance_admin(self):
        """Test session listing performance with admin authentication"""
        self.setUp()
        
        headers = self.tester.create_admin_headers()
        
        # Run performance test
        results = self.tester.run_concurrent_requests(
            "GET", "/api/sessions?page=1&page_size=20", headers, num_requests=30
        )
        
        # Analyze results
        analysis = self.tester.analyze_performance_results(results, "List Sessions - Admin")
        
        # Assertions
        assert analysis["success_rate"] >= 98, f"Success rate too low: {analysis['success_rate']}%"
        assert analysis["performance_metrics"]["avg_response_time_ms"] < 100, "Average response time too high"
        
        # Log results
        logger.info(f"Session Listing Performance: {json.dumps(analysis, indent=2)}")
        return analysis
    
    def test_list_sessions_performance_regular_user(self):
        """Test session listing performance with regular user authentication"""
        self.setUp()
        
        headers = self.tester.create_regular_user_headers()
        
        # Run performance test
        results = self.tester.run_concurrent_requests(
            "GET", "/api/sessions?page=1&page_size=10", headers, num_requests=20
        )
        
        # Analyze results
        analysis = self.tester.analyze_performance_results(results, "List Sessions - Regular User")
        
        # Assertions
        assert analysis["success_rate"] >= 95, f"Success rate too low: {analysis['success_rate']}%"
        
        # Log results
        logger.info(f"Session Listing (User) Performance: {json.dumps(analysis, indent=2)}")
        return analysis

class TestAuthenticationPerformanceOverhead:
    """Test authentication overhead and processing time"""
    
    def setUp(self):
        """Set up test environment"""
        self.tester = AuthPerformanceTester()
    
    def test_authentication_overhead_measurement(self):
        """Measure authentication processing overhead"""
        self.setUp()
        
        # Test unauthenticated endpoint (health check)
        no_auth_results = self.tester.run_concurrent_requests(
            "GET", "/health", {}, num_requests=50
        )
        no_auth_analysis = self.tester.analyze_performance_results(
            no_auth_results, "Health Check - No Auth"
        )
        
        # Test authenticated endpoint
        auth_headers = self.tester.create_admin_headers()
        auth_results = self.tester.run_concurrent_requests(
            "GET", "/api/auth/current-user", auth_headers, num_requests=50
        )
        auth_analysis = self.tester.analyze_performance_results(
            auth_results, "Current User - With Auth"
        )
        
        # Calculate authentication overhead
        no_auth_avg = no_auth_analysis["performance_metrics"]["avg_response_time_ms"]
        auth_avg = auth_analysis["performance_metrics"]["avg_response_time_ms"]
        overhead_ms = auth_avg - no_auth_avg
        overhead_percentage = (overhead_ms / no_auth_avg) * 100
        
        overhead_analysis = {
            "no_auth_avg_ms": no_auth_avg,
            "auth_avg_ms": auth_avg,
            "overhead_ms": overhead_ms,
            "overhead_percentage": overhead_percentage,
            "meets_target": overhead_ms < 20,  # Target: <20ms overhead
            "performance_impact": self.get_overhead_impact_assessment(overhead_ms, overhead_percentage)
        }
        
        # Assertions
        assert overhead_ms < 50, f"Authentication overhead too high: {overhead_ms}ms"
        assert auth_analysis["success_rate"] >= 95, "Authentication success rate too low"
        
        # Log results
        logger.info(f"Authentication Overhead Analysis: {json.dumps(overhead_analysis, indent=2)}")
        return overhead_analysis
    
    def get_overhead_impact_assessment(self, overhead_ms: float, overhead_percentage: float) -> str:
        """Assess the impact of authentication overhead"""
        if overhead_ms < 5:
            return "Negligible impact"
        elif overhead_ms < 10:
            return "Low impact"
        elif overhead_ms < 20:
            return "Moderate impact"
        elif overhead_ms < 50:
            return "High impact - optimization recommended"
        else:
            return "Critical impact - immediate optimization required"
    
    def test_concurrent_authentication_performance(self):
        """Test authentication performance under concurrent load"""
        self.setUp()
        
        # Test with multiple users authenticating simultaneously
        test_users = ["rcox", "mikeh", "tomj", "testuser1", "testuser2"]
        all_results = []
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for user in test_users:
                headers = self.tester.create_auth_headers(user)
                future = executor.submit(
                    self.tester.run_concurrent_requests,
                    "GET", "/api/auth/current-user", headers, None, 10
                )
                futures.append((user, future))
            
            for user, future in futures:
                try:
                    results = future.result(timeout=60)
                    analysis = self.tester.analyze_performance_results(
                        results, f"Concurrent Auth - {user}"
                    )
                    all_results.append(analysis)
                    logger.info(f"User {user} concurrent auth performance: "
                              f"{analysis['performance_metrics']['avg_response_time_ms']:.2f}ms avg")
                except Exception as e:
                    logger.error(f"Concurrent test failed for user {user}: {e}")
        
        # Overall concurrent performance analysis
        if all_results:
            avg_times = [r["performance_metrics"]["avg_response_time_ms"] for r in all_results]
            success_rates = [r["success_rate"] for r in all_results]
            
            concurrent_analysis = {
                "total_users_tested": len(all_results),
                "avg_response_time_across_users": statistics.mean(avg_times),
                "max_response_time_across_users": max(avg_times),
                "min_response_time_across_users": min(avg_times),
                "avg_success_rate": statistics.mean(success_rates),
                "min_success_rate": min(success_rates)
            }
            
            # Assertions
            assert concurrent_analysis["avg_success_rate"] >= 90, "Concurrent success rate too low"
            assert concurrent_analysis["avg_response_time_across_users"] < 100, "Concurrent response time too high"
            
            # Log results
            logger.info(f"Concurrent Authentication Analysis: {json.dumps(concurrent_analysis, indent=2)}")
            return concurrent_analysis
        
        return {"error": "No successful concurrent tests"}

def run_comprehensive_performance_tests():
    """Run all authentication performance tests"""
    print("🚀 Starting Comprehensive Authentication Performance Testing")
    print("=" * 80)
    
    # Initialize test results
    test_results = {
        "timestamp": datetime.utcnow().isoformat(),
        "session_endpoint_tests": {},
        "authentication_overhead_tests": {},
        "overall_assessment": {}
    }
    
    try:
        # Session Endpoint Performance Tests
        session_tester = TestSessionEndpointPerformance()
        
        print("\n📊 Testing Session Endpoint Performance...")
        test_results["session_endpoint_tests"]["create_admin"] = session_tester.test_create_session_performance_admin()
        test_results["session_endpoint_tests"]["create_user"] = session_tester.test_create_session_performance_regular_user()
        test_results["session_endpoint_tests"]["get_admin"] = session_tester.test_get_session_performance_admin()
        test_results["session_endpoint_tests"]["list_admin"] = session_tester.test_list_sessions_performance_admin()
        test_results["session_endpoint_tests"]["list_user"] = session_tester.test_list_sessions_performance_regular_user()
        
        # Authentication Overhead Tests
        auth_tester = TestAuthenticationPerformanceOverhead()
        
        print("\n⏱️  Testing Authentication Overhead...")
        test_results["authentication_overhead_tests"]["overhead"] = auth_tester.test_authentication_overhead_measurement()
        test_results["authentication_overhead_tests"]["concurrent"] = auth_tester.test_concurrent_authentication_performance()
        
        # Overall Assessment
        test_results["overall_assessment"] = generate_overall_assessment(test_results)
        
        # Save results to file
        results_file = f"/Users/rogercox/Credit_Card_Processor/backend/auth_performance_results_{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump(test_results, f, indent=2)
        
        print(f"\n✅ Performance testing completed successfully!")
        print(f"📊 Results saved to: {results_file}")
        print("\n" + "=" * 80)
        print_performance_summary(test_results)
        
        return True, test_results
        
    except Exception as e:
        logger.error(f"Performance testing failed: {e}")
        print(f"\n❌ Performance testing failed: {e}")
        return False, test_results

def generate_overall_assessment(test_results: Dict) -> Dict:
    """Generate overall performance assessment"""
    session_tests = test_results.get("session_endpoint_tests", {})
    auth_tests = test_results.get("authentication_overhead_tests", {})
    
    # Calculate overall metrics
    all_success_rates = []
    all_avg_times = []
    
    for test_name, result in session_tests.items():
        if result and "success_rate" in result:
            all_success_rates.append(result["success_rate"])
        if result and "performance_metrics" in result:
            all_avg_times.append(result["performance_metrics"]["avg_response_time_ms"])
    
    # Authentication overhead assessment
    overhead_meets_target = auth_tests.get("overhead", {}).get("meets_target", False)
    
    overall_assessment = {
        "avg_success_rate": statistics.mean(all_success_rates) if all_success_rates else 0,
        "avg_response_time_ms": statistics.mean(all_avg_times) if all_avg_times else 0,
        "authentication_overhead_acceptable": overhead_meets_target,
        "endpoints_tested": len(session_tests),
        "overall_score": 0,
        "performance_grade": "F",
        "recommendations": []
    }
    
    # Calculate overall score (out of 100)
    score = 0
    if overall_assessment["avg_success_rate"] >= 95:
        score += 30
    elif overall_assessment["avg_success_rate"] >= 90:
        score += 20
    elif overall_assessment["avg_success_rate"] >= 80:
        score += 10
    
    if overall_assessment["avg_response_time_ms"] <= 20:
        score += 30
    elif overall_assessment["avg_response_time_ms"] <= 50:
        score += 20
    elif overall_assessment["avg_response_time_ms"] <= 100:
        score += 10
    
    if overall_assessment["authentication_overhead_acceptable"]:
        score += 25
    
    if all_success_rates and min(all_success_rates) >= 90:
        score += 15  # Consistency bonus
    
    overall_assessment["overall_score"] = score
    overall_assessment["performance_grade"] = get_overall_grade(score)
    overall_assessment["recommendations"] = generate_overall_recommendations(overall_assessment)
    
    return overall_assessment

def get_overall_grade(score: int) -> str:
    """Get overall performance grade"""
    if score >= 90:
        return "A+ (Excellent)"
    elif score >= 80:
        return "A (Good)"
    elif score >= 70:
        return "B (Fair)"
    elif score >= 60:
        return "C (Poor)"
    else:
        return "D (Unacceptable)"

def generate_overall_recommendations(assessment: Dict) -> List[str]:
    """Generate overall performance recommendations"""
    recommendations = []
    
    if assessment["avg_success_rate"] < 95:
        recommendations.append("Improve request success rate - investigate failures")
    
    if assessment["avg_response_time_ms"] > 50:
        recommendations.append("Optimize response times - consider caching and database optimization")
    
    if not assessment["authentication_overhead_acceptable"]:
        recommendations.append("Reduce authentication overhead - implement auth result caching")
    
    if assessment["overall_score"] >= 90:
        recommendations.append("Performance meets all targets - maintain current optimization level")
    elif assessment["overall_score"] >= 70:
        recommendations.append("Performance is acceptable with room for improvement")
    else:
        recommendations.append("Critical performance issues - immediate optimization required")
    
    return recommendations

def print_performance_summary(test_results: Dict):
    """Print performance test summary"""
    assessment = test_results.get("overall_assessment", {})
    
    print("PERFORMANCE TEST SUMMARY")
    print("=" * 40)
    print(f"Overall Score: {assessment.get('overall_score', 0)}/100")
    print(f"Performance Grade: {assessment.get('performance_grade', 'N/A')}")
    print(f"Average Success Rate: {assessment.get('avg_success_rate', 0):.1f}%")
    print(f"Average Response Time: {assessment.get('avg_response_time_ms', 0):.1f}ms")
    print(f"Auth Overhead Acceptable: {assessment.get('authentication_overhead_acceptable', False)}")
    
    print("\nRECOMMENDATIONS:")
    for rec in assessment.get("recommendations", []):
        print(f"• {rec}")

if __name__ == "__main__":
    success, results = run_comprehensive_performance_tests()
    exit(0 if success else 1)