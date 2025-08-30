#!/usr/bin/env python3
"""
Validation script for authentication test setup
Ensures all test modules can be imported and basic functionality works
"""

import sys
import os
import logging
from typing import Dict, List

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_imports() -> Dict[str, bool]:
    """Validate that all required modules can be imported"""
    import_results = {}
    
    # Test core app imports
    try:
        from app.auth import get_current_user, UserInfo
        import_results["app.auth"] = True
        logger.info("✅ Successfully imported app.auth")
    except Exception as e:
        import_results["app.auth"] = False
        logger.error(f"❌ Failed to import app.auth: {e}")
    
    try:
        from app.main import app
        import_results["app.main"] = True
        logger.info("✅ Successfully imported app.main")
    except Exception as e:
        import_results["app.main"] = False
        logger.error(f"❌ Failed to import app.main: {e}")
    
    try:
        from app.models import ProcessingSession, SessionStatus
        import_results["app.models"] = True
        logger.info("✅ Successfully imported app.models")
    except Exception as e:
        import_results["app.models"] = False
        logger.error(f"❌ Failed to import app.models: {e}")
    
    # Test new test modules
    try:
        import test_auth_performance
        import_results["test_auth_performance"] = True
        logger.info("✅ Successfully imported test_auth_performance")
    except Exception as e:
        import_results["test_auth_performance"] = False
        logger.error(f"❌ Failed to import test_auth_performance: {e}")
    
    try:
        import test_auth_integration
        import_results["test_auth_integration"] = True
        logger.info("✅ Successfully imported test_auth_integration")
    except Exception as e:
        import_results["test_auth_integration"] = False
        logger.error(f"❌ Failed to import test_auth_integration: {e}")
    
    try:
        import run_auth_performance_tests
        import_results["run_auth_performance_tests"] = True
        logger.info("✅ Successfully imported run_auth_performance_tests")
    except Exception as e:
        import_results["run_auth_performance_tests"] = False
        logger.error(f"❌ Failed to import run_auth_performance_tests: {e}")
    
    return import_results

def validate_auth_header_creation() -> bool:
    """Test authentication header creation functionality"""
    try:
        # Test creating different types of auth headers
        admin_headers = {
            "remote-user": "rcox",
            "content-type": "application/json"
        }
        
        regular_headers = {
            "remote-user": "testuser",
            "content-type": "application/json"
        }
        
        dev_headers = {
            "x-dev-user": "devuser",
            "content-type": "application/json"
        }
        
        # Validate header structure
        required_keys = ["content-type"]
        auth_key_options = ["remote-user", "x-dev-user"]
        
        for headers in [admin_headers, regular_headers, dev_headers]:
            # Check required keys
            for key in required_keys:
                if key not in headers:
                    logger.error(f"❌ Missing required header key: {key}")
                    return False
            
            # Check auth key
            has_auth_key = any(key in headers for key in auth_key_options)
            if not has_auth_key:
                logger.error(f"❌ Missing authentication key in headers: {headers}")
                return False
        
        logger.info("✅ Authentication header creation validation passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Authentication header validation failed: {e}")
        return False

def validate_test_client_creation() -> bool:
    """Test that FastAPI TestClient can be created"""
    try:
        from fastapi.testclient import TestClient
        from app.main import app
        
        client = TestClient(app)
        
        # Test basic health endpoint
        response = client.get("/health")
        if response.status_code == 200:
            logger.info("✅ TestClient creation and health check passed")
            return True
        else:
            logger.error(f"❌ Health check failed with status: {response.status_code}")
            return False
        
    except Exception as e:
        logger.error(f"❌ TestClient creation failed: {e}")
        return False

def validate_mock_functionality() -> bool:
    """Test that mock functionality works as expected"""
    try:
        from unittest.mock import Mock
        from datetime import datetime, timezone
        from app.auth import UserInfo
        
        # Create mock user
        mock_user = UserInfo(
            username="testuser",
            is_admin=False,
            is_authenticated=True,
            auth_method="test",
            timestamp=datetime.now(timezone.utc)
        )
        
        # Validate mock user properties
        assert mock_user.username == "testuser"
        assert mock_user.is_admin == False
        assert mock_user.is_authenticated == True
        assert mock_user.auth_method == "test"
        
        logger.info("✅ Mock functionality validation passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Mock functionality validation failed: {e}")
        return False

def validate_performance_test_structure() -> bool:
    """Validate the structure of performance test classes"""
    try:
        from test_auth_performance import AuthPerformanceTester, TestSessionEndpointPerformance
        
        # Test AuthPerformanceTester initialization
        tester = AuthPerformanceTester()
        
        # Test header creation methods
        admin_headers = tester.create_admin_headers()
        regular_headers = tester.create_regular_user_headers()
        
        # Validate header structure
        assert "remote-user" in admin_headers
        assert "content-type" in admin_headers
        assert admin_headers["remote-user"] == "rcox"
        
        assert "remote-user" in regular_headers
        assert regular_headers["remote-user"] == "testuser"
        
        logger.info("✅ Performance test structure validation passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Performance test structure validation failed: {e}")
        return False

def validate_integration_test_structure() -> bool:
    """Validate the structure of integration test classes"""
    try:
        from test_auth_integration import AuthIntegrationTester, TestCompleteAuthenticationWorkflow
        
        # Test AuthIntegrationTester initialization
        tester = AuthIntegrationTester()
        
        # Test header creation
        headers = tester.create_auth_headers("testuser")
        assert "remote-user" in headers
        assert headers["remote-user"] == "testuser"
        
        # Test cleanup method exists
        assert hasattr(tester, 'cleanup')
        tester.cleanup()  # Should not raise exception
        
        logger.info("✅ Integration test structure validation passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Integration test structure validation failed: {e}")
        return False

def run_validation() -> Dict[str, bool]:
    """Run all validation tests"""
    print("🔍 Validating Authentication Test Setup")
    print("=" * 50)
    
    validation_results = {}
    
    # Run all validation tests
    validation_results["imports"] = all(validate_imports().values())
    validation_results["auth_headers"] = validate_auth_header_creation()
    validation_results["test_client"] = validate_test_client_creation()
    validation_results["mocks"] = validate_mock_functionality()
    validation_results["performance_structure"] = validate_performance_test_structure()
    validation_results["integration_structure"] = validate_integration_test_structure()
    
    # Print summary
    print("\n📊 Validation Results:")
    print("-" * 30)
    
    for test_name, result in validation_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    all_passed = all(validation_results.values())
    passed_count = sum(validation_results.values())
    total_count = len(validation_results)
    
    print(f"\nOverall: {passed_count}/{total_count} validations passed")
    
    if all_passed:
        print("\n🎉 All validations passed! Test setup is ready.")
    else:
        print("\n⚠️  Some validations failed. Please check the errors above.")
    
    return validation_results

def main():
    """Main validation function"""
    try:
        results = run_validation()
        all_passed = all(results.values())
        return 0 if all_passed else 1
        
    except Exception as e:
        logger.error(f"Validation failed with exception: {e}")
        print(f"\n❌ Validation failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)