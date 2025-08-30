#!/usr/bin/env python3
"""
Comprehensive Test Runner for Authentication Performance Validation
Executes all authentication-related performance and integration tests
"""

import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Dict, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'auth_test_run_{int(time.time())}.log')
    ]
)
logger = logging.getLogger(__name__)

class AuthPerformanceTestRunner:
    """Comprehensive test runner for authentication performance validation"""
    
    def __init__(self):
        self.test_results = {
            "timestamp": datetime.utcnow().isoformat(),
            "test_suite_version": "1.0",
            "environment": self.get_environment_info(),
            "performance_tests": {},
            "integration_tests": {},
            "overall_assessment": {}
        }
        self.start_time = time.time()
    
    def get_environment_info(self) -> Dict:
        """Get environment information for the test run"""
        return {
            "python_version": sys.version,
            "platform": sys.platform,
            "working_directory": os.getcwd(),
            "test_runner_path": __file__
        }
    
    def run_performance_tests(self) -> bool:
        """Run all authentication performance tests"""
        print("🚀 Running Authentication Performance Tests...")
        print("=" * 60)
        
        try:
            # Import and run performance tests
            from test_auth_performance import run_comprehensive_performance_tests
            
            success, results = run_comprehensive_performance_tests()
            
            self.test_results["performance_tests"] = {
                "success": success,
                "results": results,
                "duration_seconds": time.time() - self.start_time
            }
            
            if success:
                logger.info("✅ Authentication performance tests completed successfully")
            else:
                logger.error("❌ Authentication performance tests failed")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Performance tests failed with exception: {e}")
            self.test_results["performance_tests"] = {
                "success": False,
                "error": str(e),
                "duration_seconds": time.time() - self.start_time
            }
            return False
    
    def run_integration_tests(self) -> bool:
        """Run all authentication integration tests"""
        print("\n🔗 Running Authentication Integration Tests...")
        print("=" * 60)
        
        try:
            # Import and run integration tests
            from test_auth_integration import run_integration_tests
            
            success, results = run_integration_tests()
            
            self.test_results["integration_tests"] = {
                "success": success,
                "results": results,
                "duration_seconds": time.time() - self.start_time
            }
            
            if success:
                logger.info("✅ Authentication integration tests completed successfully")
            else:
                logger.error("❌ Authentication integration tests failed")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Integration tests failed with exception: {e}")
            self.test_results["integration_tests"] = {
                "success": False,
                "error": str(e),
                "duration_seconds": time.time() - self.start_time
            }
            return False
    
    def run_existing_session_tests(self) -> bool:
        """Run existing session API tests to ensure no regression"""
        print("\n🧪 Running Existing Session API Tests...")
        print("=" * 60)
        
        try:
            import subprocess
            import pytest
            
            # Run existing pytest tests
            result = subprocess.run([
                sys.executable, "-m", "pytest", 
                "backend/tests/test_sessions.py",
                "-v", "--tb=short"
            ], capture_output=True, text=True, cwd="/Users/rogercox/Credit_Card_Processor")
            
            success = result.returncode == 0
            
            self.test_results["existing_tests"] = {
                "success": success,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode
            }
            
            if success:
                logger.info("✅ Existing session tests passed")
            else:
                logger.error("❌ Existing session tests failed")
                logger.error(f"Error output: {result.stderr}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Failed to run existing tests: {e}")
            self.test_results["existing_tests"] = {
                "success": False,
                "error": str(e)
            }
            return False
    
    def generate_overall_assessment(self) -> Dict:
        """Generate overall assessment of all test results"""
        performance_success = self.test_results.get("performance_tests", {}).get("success", False)
        integration_success = self.test_results.get("integration_tests", {}).get("success", False)
        existing_success = self.test_results.get("existing_tests", {}).get("success", False)
        
        # Calculate scores
        total_score = 0
        max_score = 300  # 100 points each for performance, integration, existing
        
        if performance_success:
            # Get detailed performance score if available
            perf_results = self.test_results["performance_tests"].get("results", {})
            perf_assessment = perf_results.get("overall_assessment", {})
            perf_score = perf_assessment.get("overall_score", 0)
            total_score += perf_score
        else:
            total_score += 0
        
        if integration_success:
            # Get integration success rate
            int_results = self.test_results["integration_tests"].get("results", {})
            int_success_rate = int_results.get("success_rate", 0)
            total_score += int_success_rate
        else:
            total_score += 0
        
        if existing_success:
            total_score += 100  # Full points for existing tests passing
        
        # Overall assessment
        percentage_score = (total_score / max_score) * 100
        
        if percentage_score >= 90:
            grade = "A+ (Excellent)"
            status = "ALL_SYSTEMS_GO"
        elif percentage_score >= 80:
            grade = "A (Good)" 
            status = "READY_FOR_PRODUCTION"
        elif percentage_score >= 70:
            grade = "B (Fair)"
            status = "MINOR_ISSUES_IDENTIFIED"
        elif percentage_score >= 60:
            grade = "C (Poor)"
            status = "SIGNIFICANT_ISSUES_FOUND"
        else:
            grade = "D (Unacceptable)"
            status = "CRITICAL_ISSUES_BLOCKING"
        
        assessment = {
            "overall_score": total_score,
            "max_possible_score": max_score,
            "percentage_score": percentage_score,
            "grade": grade,
            "status": status,
            "performance_tests_passed": performance_success,
            "integration_tests_passed": integration_success,
            "existing_tests_passed": existing_success,
            "test_completion_time": time.time() - self.start_time,
            "recommendations": self.generate_recommendations(percentage_score, performance_success, integration_success, existing_success)
        }
        
        return assessment
    
    def generate_recommendations(self, score: float, perf: bool, integ: bool, exist: bool) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        if not exist:
            recommendations.append("CRITICAL: Fix existing session API tests - regression detected")
        
        if not perf:
            recommendations.append("HIGH: Address authentication performance issues")
        
        if not integ:
            recommendations.append("HIGH: Fix authentication integration workflow issues")
        
        if score < 70:
            recommendations.append("BLOCKER: Test score below acceptable threshold - do not deploy")
        elif score < 80:
            recommendations.append("WARNING: Test score indicates issues need attention before deployment")
        elif score < 90:
            recommendations.append("CAUTION: Minor optimizations recommended for better performance")
        else:
            recommendations.append("SUCCESS: All authentication tests passing - ready for deployment")
        
        # Add specific recommendations based on available results
        perf_results = self.test_results.get("performance_tests", {}).get("results", {})
        if perf_results and "overall_assessment" in perf_results:
            perf_recs = perf_results["overall_assessment"].get("recommendations", [])
            recommendations.extend([f"Performance: {rec}" for rec in perf_recs])
        
        return recommendations
    
    def save_comprehensive_report(self) -> str:
        """Save comprehensive test report"""
        timestamp = int(time.time())
        report_file = f"/Users/rogercox/Credit_Card_Processor/backend/auth_comprehensive_test_report_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        # Also create a summary report
        summary_file = f"/Users/rogercox/Credit_Card_Processor/backend/auth_test_summary_{timestamp}.txt"
        with open(summary_file, 'w') as f:
            f.write("AUTHENTICATION PERFORMANCE VALIDATION REPORT\n")
            f.write("=" * 60 + "\n")
            f.write(f"Generated: {self.test_results['timestamp']}\n")
            f.write(f"Duration: {self.test_results['overall_assessment']['test_completion_time']:.1f} seconds\n\n")
            
            assessment = self.test_results["overall_assessment"]
            f.write(f"OVERALL SCORE: {assessment['overall_score']:.1f}/{assessment['max_possible_score']} ({assessment['percentage_score']:.1f}%)\n")
            f.write(f"GRADE: {assessment['grade']}\n")
            f.write(f"STATUS: {assessment['status']}\n\n")
            
            f.write("TEST RESULTS:\n")
            f.write(f"  Performance Tests: {'✅ PASSED' if assessment['performance_tests_passed'] else '❌ FAILED'}\n")
            f.write(f"  Integration Tests: {'✅ PASSED' if assessment['integration_tests_passed'] else '❌ FAILED'}\n")
            f.write(f"  Existing Tests:    {'✅ PASSED' if assessment['existing_tests_passed'] else '❌ FAILED'}\n\n")
            
            f.write("RECOMMENDATIONS:\n")
            for rec in assessment["recommendations"]:
                f.write(f"  • {rec}\n")
        
        return report_file, summary_file
    
    def print_final_summary(self):
        """Print final test summary to console"""
        assessment = self.test_results["overall_assessment"]
        
        print("\n" + "=" * 80)
        print("AUTHENTICATION PERFORMANCE VALIDATION - FINAL SUMMARY")
        print("=" * 80)
        
        print(f"Overall Score: {assessment['overall_score']:.1f}/{assessment['max_possible_score']} ({assessment['percentage_score']:.1f}%)")
        print(f"Grade: {assessment['grade']}")
        print(f"Status: {assessment['status']}")
        print(f"Total Duration: {assessment['test_completion_time']:.1f} seconds")
        
        print("\nTest Results:")
        print(f"  🚀 Performance Tests: {'✅ PASSED' if assessment['performance_tests_passed'] else '❌ FAILED'}")
        print(f"  🔗 Integration Tests: {'✅ PASSED' if assessment['integration_tests_passed'] else '❌ FAILED'}")
        print(f"  🧪 Existing Tests:    {'✅ PASSED' if assessment['existing_tests_passed'] else '❌ FAILED'}")
        
        print("\nKey Recommendations:")
        for i, rec in enumerate(assessment["recommendations"][:5], 1):  # Show top 5
            print(f"  {i}. {rec}")
        
        if assessment['percentage_score'] >= 80:
            print(f"\n🎉 AUTHENTICATION SYSTEM READY FOR PRODUCTION! 🎉")
        elif assessment['percentage_score'] >= 60:
            print(f"\n⚠️  AUTHENTICATION SYSTEM NEEDS ATTENTION BEFORE DEPLOYMENT")
        else:
            print(f"\n🚨 CRITICAL ISSUES - DO NOT DEPLOY TO PRODUCTION 🚨")
        
        print("=" * 80)

def main():
    """Main test runner function"""
    print("🔐 AUTHENTICATION PERFORMANCE VALIDATION SUITE")
    print("Credit Card Processor - Comprehensive Testing")
    print("=" * 80)
    
    runner = AuthPerformanceTestRunner()
    
    # Run all test suites
    performance_success = runner.run_performance_tests()
    integration_success = runner.run_integration_tests()
    existing_success = runner.run_existing_session_tests()
    
    # Generate overall assessment
    runner.test_results["overall_assessment"] = runner.generate_overall_assessment()
    
    # Save comprehensive report
    report_file, summary_file = runner.save_comprehensive_report()
    
    # Print final summary
    runner.print_final_summary()
    
    print(f"\n📊 Detailed results saved to: {report_file}")
    print(f"📋 Summary report saved to: {summary_file}")
    
    # Return exit code based on overall success
    overall_success = (
        performance_success and 
        integration_success and 
        existing_success and
        runner.test_results["overall_assessment"]["percentage_score"] >= 70
    )
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)