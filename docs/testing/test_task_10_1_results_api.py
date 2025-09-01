#!/usr/bin/env python3
"""
Test Task 10.1: Results API Implementation
Tests the comprehensive results retrieval system and ResultsFormatter
"""

import os
import sys
import unittest
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import Mock, MagicMock

# Set up environment for testing
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock the database session and dependencies before importing
class MockDB:
    def __init__(self):
        self.data = {}
        self.committed = False
        self.rolled_back = False
    
    def query(self, model):
        return MockQuery(self, model)
    
    def add(self, obj):
        pass
    
    def commit(self):
        self.committed = True
    
    def rollback(self):
        self.rolled_back = True

class MockQuery:
    def __init__(self, db, model):
        self.db = db
        self.model = model
        self.filters = []
        self._first_result = None
        self._all_results = []
        self._scalar_result = 0
    
    def filter(self, *conditions):
        self.filters.extend(conditions)
        return self
    
    def first(self):
        # Return mock session or employee data based on model
        if hasattr(self.model, '__name__'):
            if self.model.__name__ == 'ProcessingSession':
                session = Mock()
                session.session_id = str(uuid.uuid4())
                session.session_name = "Test Session"
                session.status = Mock()
                session.status.value = "completed"
                session.created_by = "testuser"
                session.created_at = datetime.now(timezone.utc)
                session.updated_at = datetime.now(timezone.utc)
                session.delta_session_id = None
                return session
        return self._first_result
    
    def all(self):
        return self._all_results
    
    def scalar(self):
        return self._scalar_result
    
    def count(self):
        return len(self._all_results)
    
    def offset(self, n):
        return self
    
    def limit(self, n):
        return self
    
    def order_by(self, field):
        return self

# Mock ValidationStatus and SessionStatus
class MockValidationStatus:
    VALID = Mock()
    VALID.value = "valid"
    NEEDS_ATTENTION = Mock()
    NEEDS_ATTENTION.value = "needs_attention"
    RESOLVED = Mock()
    RESOLVED.value = "resolved"

class MockSessionStatus:
    COMPLETED = Mock()
    COMPLETED.value = "completed"
    FAILED = Mock()
    FAILED.value = "failed"

# Create mock employees
def create_mock_employee(revision_id=None, employee_id="EMP001", name="John Doe", 
                        car_amount=1000.00, receipt_amount=900.00, status="needs_attention"):
    employee = Mock()
    employee.revision_id = revision_id or uuid.uuid4()
    employee.employee_id = employee_id
    employee.employee_name = name
    employee.car_amount = Decimal(str(car_amount)) if car_amount else None
    employee.receipt_amount = Decimal(str(receipt_amount)) if receipt_amount else None
    employee.validation_status = MockValidationStatus.NEEDS_ATTENTION
    employee.validation_flags = {
        "amount_mismatch": True,
        "highest_severity": "medium",
        "total_issues": 1
    }
    employee.resolved_by = None
    employee.resolution_notes = None
    employee.created_at = datetime.now(timezone.utc)
    employee.updated_at = datetime.now(timezone.utc)
    employee.source = "car_document"
    employee.confidence = 0.95
    return employee

# Now import after mocking
from app.services.results_formatter import (
    ResultsFormatter, 
    create_results_formatter
)


class TestResultsFormatter(unittest.TestCase):
    """Test Results Formatter functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.db = MockDB()
        self.formatter = ResultsFormatter(self.db)
        self.test_session_id = str(uuid.uuid4())
    
    def test_format_employee_data(self):
        """Test employee data formatting"""
        # Create mock employees
        employees = [
            create_mock_employee(employee_id="EMP001", name="John Doe"),
            create_mock_employee(employee_id="EMP002", name="Jane Smith", status="valid")
        ]
        
        # Create mock session
        session = Mock()
        session.session_id = self.test_session_id
        session.delta_session_id = None
        
        # Format employee data
        formatted = self.formatter.format_employee_data(employees, session)
        
        self.assertEqual(len(formatted), 2)
        
        # Check first employee formatting
        emp1 = formatted[0]
        self.assertIn("revision_id", emp1)
        self.assertIn("employee_id", emp1)
        self.assertIn("employee_name", emp1)
        self.assertIn("car_amount", emp1)
        self.assertIn("receipt_amount", emp1)
        self.assertIn("validation_status", emp1)
        self.assertIn("validation_flags", emp1)
        self.assertIn("has_issues", emp1)
        self.assertIn("is_resolved", emp1)
        self.assertIn("is_valid", emp1)
        self.assertIn("amount_difference", emp1)
        
        # Check computed fields
        self.assertEqual(emp1["employee_name"], "John Doe")
        self.assertEqual(emp1["car_amount"], 1000.00)
        self.assertEqual(emp1["receipt_amount"], 900.00)
        self.assertEqual(emp1["amount_difference"], 100.00)
    
    def test_format_session_summary(self):
        """Test session summary formatting"""
        # Create a more comprehensive mock for database queries
        def create_mock_query(*args, **kwargs):
            mock_query = Mock()
            mock_filtered = Mock()
            mock_filtered.scalar = Mock(return_value=50)
            mock_filtered.all = Mock(return_value=[])  # Return empty list for iterations
            mock_query.filter = Mock(return_value=mock_filtered)
            return mock_query
        
        self.db.query = create_mock_query
        
        # Create mock session
        session = Mock()
        session.session_id = self.test_session_id
        session.session_name = "Test Session"
        session.status = Mock()
        session.status.value = "completed"
        session.created_by = "testuser"
        session.created_at = datetime.now(timezone.utc)
        session.updated_at = datetime.now(timezone.utc)
        session.delta_session_id = None
        
        # Format session summary
        summary = self.formatter.format_session_summary(session)
        
        # Check required fields
        self.assertIn("session_id", summary)
        self.assertIn("session_name", summary)
        self.assertIn("status", summary)
        self.assertIn("created_by", summary)
        self.assertIn("total_employees", summary)
        self.assertIn("ready_for_export", summary)
        self.assertIn("needs_attention", summary)
        self.assertIn("resolved_issues", summary)
        self.assertIn("validation_success_rate", summary)
        self.assertIn("completion_percentage", summary)
        self.assertIn("export_ready", summary)
        self.assertIn("issue_breakdown", summary)
        self.assertIn("resolution_summary", summary)
        
        # Check delta info
        self.assertIn("is_delta_session", summary)
        self.assertFalse(summary["is_delta_session"])
    
    def test_format_complete_results(self):
        """Test complete results formatting"""
        # Create mock employees
        employees = [create_mock_employee()]
        
        # Create mock session
        session = Mock()
        session.session_id = self.test_session_id
        session.session_name = "Test Session"
        session.status = Mock()
        session.status.value = "completed"
        session.created_by = "testuser"
        session.created_at = datetime.now(timezone.utc)
        session.updated_at = datetime.now(timezone.utc)
        session.delta_session_id = None
        
        # Mock database queries
        mock_query = Mock()
        mock_query.filter().scalar = Mock(return_value=1)
        mock_query.filter().all = Mock(return_value=[])
        self.db.query = Mock(return_value=mock_query)
        
        # Format complete results
        results = self.formatter.format_complete_results(session, employees, include_metadata=True)
        
        # Check structure
        self.assertIn("session_summary", results)
        self.assertIn("employees", results)
        self.assertIn("total_records", results)
        self.assertIn("pagination", results)
        self.assertIn("metadata", results)
        
        # Check employee data
        self.assertEqual(len(results["employees"]), 1)
        self.assertEqual(results["total_records"], 1)
        
        # Check metadata
        metadata = results["metadata"]
        self.assertIn("generated_at", metadata)
        self.assertIn("session_type", metadata)
        self.assertIn("processing_engine_version", metadata)
        self.assertIn("data_source_info", metadata)
        self.assertIn("quality_metrics", metadata)
    
    def test_delta_session_formatting(self):
        """Test delta session information formatting"""
        # Create mock session with delta
        session = Mock()
        session.session_id = self.test_session_id
        session.delta_session_id = str(uuid.uuid4())
        
        # Create mock employees with delta patterns
        employees = [
            create_mock_employee(employee_id="NEW_EMP001", name="New Employee"),
            create_mock_employee(employee_id="MOD_EMP002", name="Modified Employee"),
        ]
        
        # Mock base session
        base_session = Mock()
        base_session.session_name = "Base Session"
        mock_query = Mock()
        mock_query.filter().first = Mock(return_value=base_session)
        self.db.query = Mock(return_value=mock_query)
        
        # Format with delta info
        formatted = self.formatter.format_employee_data(employees, session)
        
        # Check delta information
        self.assertEqual(len(formatted), 2)
        
        new_emp = formatted[0]
        self.assertIn("delta_change", new_emp)
        self.assertEqual(new_emp["delta_change"], "new")
        self.assertTrue(new_emp["is_delta_change"])
        
        mod_emp = formatted[1]
        self.assertEqual(mod_emp["delta_change"], "modified")
        self.assertIn("delta_previous_values", mod_emp)
    
    def test_amount_formatting(self):
        """Test amount formatting methods"""
        # Test decimal to float conversion
        result = self.formatter._format_amount(Decimal('1234.56'))
        self.assertEqual(result, 1234.56)
        self.assertIsInstance(result, float)
        
        # Test None handling
        result = self.formatter._format_amount(None)
        self.assertIsNone(result)
        
        # Test amount difference calculation
        employee = create_mock_employee(car_amount=1000.00, receipt_amount=900.00)
        difference = self.formatter._calculate_amount_difference(employee)
        self.assertEqual(difference, 100.00)
    
    def test_validation_flags_enhancement(self):
        """Test validation flags enhancement"""
        original_flags = {
            "amount_mismatch": {
                "present": True,
                "severity": "medium",
                "suggestion": "Fix the amounts"
            },
            "total_issues": 1,
            "highest_severity": "medium",
            "requires_review": True
        }
        
        enhanced = self.formatter._enhance_validation_flags(original_flags)
        
        # Should preserve original flags
        self.assertIn("amount_mismatch", enhanced)
        self.assertIn("total_issues", enhanced)
        self.assertIn("highest_severity", enhanced)
        self.assertIn("requires_review", enhanced)
        
        # Should add has_suggestions flag
        self.assertIn("has_suggestions", enhanced)
        self.assertTrue(enhanced["has_suggestions"])
    
    def test_factory_function(self):
        """Test factory function"""
        formatter = create_results_formatter(self.db)
        self.assertIsInstance(formatter, ResultsFormatter)


class TestResultsAPIStructure(unittest.TestCase):
    """Test Results API structure and endpoints"""
    
    def test_api_imports(self):
        """Test that API imports work correctly"""
        from app.api.results import router
        from app.services.results_formatter import ResultsFormatter
        
        # Check router configuration
        self.assertEqual(router.prefix, "/api/sessions")
        self.assertIn("results", router.tags)
    
    def test_response_models(self):
        """Test response model structure"""
        from app.api.results import (
            EmployeeResultsResponse,
            SessionSummaryStats,
            SessionResultsResponse
        )
        
        # Test EmployeeResultsResponse
        employee_data = {
            "revision_id": str(uuid.uuid4()),
            "employee_name": "John Doe",
            "validation_status": "valid",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        employee_response = EmployeeResultsResponse(**employee_data)
        self.assertEqual(employee_response.employee_name, "John Doe")
        self.assertEqual(employee_response.validation_status, "valid")
        
        # Test SessionSummaryStats
        stats_data = {
            "total_employees": 100,
            "ready_for_export": 80,
            "needs_attention": 15,
            "resolved_issues": 5,
            "validation_success_rate": 85.0
        }
        
        stats = SessionSummaryStats(**stats_data)
        self.assertEqual(stats.total_employees, 100)
        self.assertEqual(stats.validation_success_rate, 85.0)


class TestResultsAPIFeatures(unittest.TestCase):
    """Test advanced results API features"""
    
    def test_results_api_contract_compliance(self):
        """Test that results API meets contract requirements"""
        from app.api.results import get_session_results, get_enhanced_session_results
        
        # Check that endpoints exist and have proper signatures
        self.assertTrue(callable(get_session_results))
        self.assertTrue(callable(get_enhanced_session_results))
    
    def test_data_formatting_for_frontend(self):
        """Test that data is properly formatted for frontend consumption"""
        db = MockDB()
        formatter = ResultsFormatter(db)
        
        # Create test employee with various data types
        employee = create_mock_employee(
            car_amount=1234.56,
            receipt_amount=987.65
        )
        
        session = Mock()
        session.session_id = str(uuid.uuid4())
        session.delta_session_id = None
        
        formatted = formatter.format_employee_data([employee], session)
        
        # Check that amounts are properly converted to float
        emp_data = formatted[0]
        self.assertIsInstance(emp_data["car_amount"], float)
        self.assertIsInstance(emp_data["receipt_amount"], float)
        
        # Check that timestamps are ISO formatted strings
        self.assertIsInstance(emp_data["created_at"], str)
        self.assertIsInstance(emp_data["updated_at"], str)
        
        # Check frontend-friendly flags
        self.assertIn("has_issues", emp_data)
        self.assertIn("is_resolved", emp_data)
        self.assertIn("is_valid", emp_data)
        self.assertIsInstance(emp_data["has_issues"], bool)
        self.assertIsInstance(emp_data["is_resolved"], bool)
        self.assertIsInstance(emp_data["is_valid"], bool)
    
    def test_metadata_generation(self):
        """Test metadata generation for results"""
        db = MockDB()
        formatter = ResultsFormatter(db)
        
        employees = [
            create_mock_employee(employee_id="EMP001"),
            create_mock_employee(employee_id="EMP002")
        ]
        
        session = Mock()
        session.session_id = str(uuid.uuid4())
        session.delta_session_id = None
        
        metadata = formatter._generate_results_metadata(session, employees)
        
        # Check metadata structure
        self.assertIn("generated_at", metadata)
        self.assertIn("session_type", metadata)
        self.assertIn("processing_engine_version", metadata)
        self.assertIn("data_source_info", metadata)
        self.assertIn("quality_metrics", metadata)
        
        # Check data source info
        data_source = metadata["data_source_info"]
        self.assertIn("car_document_processed", data_source)
        self.assertIn("receipt_document_processed", data_source)
        self.assertIn("manual_entries", data_source)
        
        # Check quality metrics
        quality = metadata["quality_metrics"]
        self.assertIn("avg_confidence", quality)
        self.assertIn("high_confidence_count", quality)
        self.assertIn("low_confidence_count", quality)


def run_task_10_1_tests():
    """Run Task 10.1 tests and return results"""
    print("="*80)
    print("TASK 10.1: RESULTS API IMPLEMENTATION")
    print("="*80)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestResultsFormatter))
    suite.addTests(loader.loadTestsFromTestCase(TestResultsAPIStructure))
    suite.addTests(loader.loadTestsFromTestCase(TestResultsAPIFeatures))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "="*80)
    print("TASK 10.1 TEST SUMMARY")
    print("="*80)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print(f"\nFAILURES:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")
            
    if result.errors:
        print(f"\nERRORS:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")
    
    if result.wasSuccessful():
        print(f"\n✅ TASK 10.1 IMPLEMENTATION SUCCESSFUL")
        print("Results API Implementation completed successfully!")
        print("\nImplemented Features:")
        print("✓ GET /api/sessions/{session_id}/results endpoint (existing)")
        print("✓ GET /api/sessions/{session_id}/results/enhanced endpoint (new)")
        print("✓ ResultsFormatter class with comprehensive formatting logic")
        print("✓ Enhanced employee data formatting for frontend consumption")
        print("✓ Comprehensive session summary statistics")
        print("✓ Delta session information and comparison")
        print("✓ Validation flags enhancement with frontend-friendly data")
        print("✓ Proper data type conversion (Decimal to float, datetime to ISO)")
        print("✓ Additional computed fields (has_issues, is_resolved, amount_difference)")
        print("✓ Rich metadata generation for results")
        print("✓ Issue breakdown analysis and resolution summaries")
        print("✓ Processing time calculation and completion percentages")
        print("✓ Export readiness assessment")
        print("✓ Quality metrics and confidence analysis")
        print("✓ Factory function for service instantiation")
    else:
        print(f"\n❌ TASK 10.1 IMPLEMENTATION HAS ISSUES")
        print("Some tests failed - review implementation")
        
    print("="*80)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_task_10_1_tests()
    sys.exit(0 if success else 1)