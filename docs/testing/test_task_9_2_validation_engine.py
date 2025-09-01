#!/usr/bin/env python3
"""
Test Task 9.2: Enhanced Validation Engine
Tests comprehensive employee data validation with configurable rules
"""

import os
import sys
import unittest
from decimal import Decimal
from datetime import datetime, timezone

# Set up environment for testing
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.validation_engine import (
    ValidationEngine,
    ValidationRule,
    ValidationSeverity,
    ValidationIssueType,
    AmountMismatchRule,
    MissingReceiptRule,
    MissingEmployeeIDRule,
    PolicyViolationRule,
    DuplicateEmployeeRule,
    LowConfidenceRule,
    IncompleteDataRule,
    create_validation_engine
)
from app.models import ValidationStatus


class TestValidationRules(unittest.TestCase):
    """Test individual validation rules"""
    
    def test_missing_receipt_rule(self):
        """Test missing receipt validation rule"""
        rule = MissingReceiptRule()
        
        # Test employee with missing receipt
        employee_missing = {
            "employee_name": "John Doe",
            "employee_id": "EMP001",
            "car_amount": Decimal('500.00')
        }
        issue = rule.validate(employee_missing)
        self.assertIsNotNone(issue)
        self.assertEqual(issue["type"], ValidationIssueType.MISSING_RECEIPT.value)
        self.assertEqual(issue["severity"], ValidationSeverity.HIGH.value)
        
        # Test employee with zero receipt
        employee_zero = {
            "employee_name": "Jane Smith",
            "receipt_amount": Decimal('0.00')
        }
        issue = rule.validate(employee_zero)
        self.assertIsNotNone(issue)
        
        # Test employee with valid receipt
        employee_valid = {
            "employee_name": "Bob Johnson",
            "receipt_amount": Decimal('250.00')
        }
        issue = rule.validate(employee_valid)
        self.assertIsNone(issue)
    
    def test_amount_mismatch_rule(self):
        """Test amount mismatch validation rule"""
        rule = AmountMismatchRule(threshold_dollars=5.00, threshold_percentage=0.05)
        
        # Test significant mismatch
        employee_mismatch = {
            "employee_name": "John Doe",
            "car_amount": Decimal('1000.00'),
            "receipt_amount": Decimal('850.00')
        }
        issue = rule.validate(employee_mismatch)
        self.assertIsNotNone(issue)
        self.assertEqual(issue["type"], ValidationIssueType.AMOUNT_MISMATCH.value)
        self.assertIn("details", issue)
        
        # Test small acceptable difference
        employee_small_diff = {
            "employee_name": "Jane Smith",
            "car_amount": Decimal('1000.00'),
            "receipt_amount": Decimal('998.00')
        }
        issue = rule.validate(employee_small_diff)
        self.assertIsNone(issue)
        
        # Test exact match
        employee_match = {
            "employee_name": "Bob Johnson",
            "car_amount": Decimal('500.00'),
            "receipt_amount": Decimal('500.00')
        }
        issue = rule.validate(employee_match)
        self.assertIsNone(issue)
    
    def test_missing_employee_id_rule(self):
        """Test missing employee ID validation rule"""
        rule = MissingEmployeeIDRule()
        
        # Test missing employee ID
        employee_missing_id = {
            "employee_name": "John Doe",
            "car_amount": Decimal('500.00')
        }
        issue = rule.validate(employee_missing_id)
        self.assertIsNotNone(issue)
        self.assertEqual(issue["type"], ValidationIssueType.MISSING_EMPLOYEE_ID.value)
        
        # Test empty employee ID
        employee_empty_id = {
            "employee_name": "Jane Smith",
            "employee_id": ""
        }
        issue = rule.validate(employee_empty_id)
        self.assertIsNotNone(issue)
        
        # Test valid employee ID
        employee_valid_id = {
            "employee_name": "Bob Johnson",
            "employee_id": "EMP001"
        }
        issue = rule.validate(employee_valid_id)
        self.assertIsNone(issue)
    
    def test_policy_violation_rule(self):
        """Test policy violation validation rule"""
        rule = PolicyViolationRule(max_amount=2000.00)
        
        # Test amount exceeding policy
        employee_violation = {
            "employee_name": "John Doe",
            "car_amount": Decimal('2500.00'),
            "receipt_amount": Decimal('2500.00')
        }
        issue = rule.validate(employee_violation)
        self.assertIsNotNone(issue)
        self.assertEqual(issue["type"], ValidationIssueType.POLICY_VIOLATION.value)
        
        # Test amount within policy
        employee_valid = {
            "employee_name": "Jane Smith",
            "car_amount": Decimal('1500.00'),
            "receipt_amount": Decimal('1500.00')
        }
        issue = rule.validate(employee_valid)
        self.assertIsNone(issue)
    
    def test_duplicate_employee_rule(self):
        """Test duplicate employee validation rule"""
        rule = DuplicateEmployeeRule()
        
        # Create context with duplicate employees
        employees = [
            {"employee_name": "John Doe", "employee_id": "EMP001"},
            {"employee_name": "Jane Smith", "employee_id": "EMP002"},
            {"employee_name": "John Doe", "employee_id": "EMP003"},  # Duplicate name
        ]
        
        context = {"all_employees": employees}
        
        # Test first employee (duplicate name)
        issue = rule.validate(employees[0], context)
        self.assertIsNotNone(issue)
        self.assertEqual(issue["type"], ValidationIssueType.DUPLICATE_EMPLOYEE.value)
        
        # Test unique employee
        issue = rule.validate(employees[1], context)
        self.assertIsNone(issue)
    
    def test_low_confidence_rule(self):
        """Test low confidence validation rule"""
        rule = LowConfidenceRule(min_confidence=0.8)
        
        # Test low confidence
        employee_low_confidence = {
            "employee_name": "John Doe",
            "confidence": 0.6
        }
        issue = rule.validate(employee_low_confidence)
        self.assertIsNotNone(issue)
        self.assertEqual(issue["type"], ValidationIssueType.CONFIDENCE_LOW.value)
        
        # Test high confidence
        employee_high_confidence = {
            "employee_name": "Jane Smith",
            "confidence": 0.95
        }
        issue = rule.validate(employee_high_confidence)
        self.assertIsNone(issue)
    
    def test_incomplete_data_rule(self):
        """Test incomplete data validation rule"""
        rule = IncompleteDataRule(required_fields=["employee_name", "employee_id"])
        
        # Test incomplete data
        employee_incomplete = {
            "employee_name": "John Doe"
            # Missing employee_id
        }
        issue = rule.validate(employee_incomplete)
        self.assertIsNotNone(issue)
        self.assertEqual(issue["type"], ValidationIssueType.INCOMPLETE_DATA.value)
        
        # Test complete data
        employee_complete = {
            "employee_name": "Jane Smith",
            "employee_id": "EMP002"
        }
        issue = rule.validate(employee_complete)
        self.assertIsNone(issue)


class TestValidationEngine(unittest.TestCase):
    """Test validation engine functionality"""
    
    def setUp(self):
        """Set up test validation engine"""
        config = {
            "amount_mismatch_threshold_dollars": 10.00,
            "amount_mismatch_threshold_percentage": 0.10,
            "policy_amount_limit": 2000.00,
            "min_confidence_threshold": 0.8,
            "required_fields": ["employee_name", "employee_id"]
        }
        self.engine = ValidationEngine(config)
    
    def test_validate_employee_data_valid(self):
        """Test validation of valid employee data"""
        employee_data = {
            "employee_name": "John Doe",
            "employee_id": "EMP001",
            "car_amount": Decimal('500.00'),
            "receipt_amount": Decimal('500.00'),
            "confidence": 0.95
        }
        
        result = self.engine.validate_employee_data(employee_data)
        
        self.assertEqual(result["validation_status"], ValidationStatus.VALID)
        self.assertEqual(result["issues_count"], 0)
        self.assertEqual(result["validation_flags"], {})
    
    def test_validate_employee_data_with_issues(self):
        """Test validation of employee data with issues"""
        employee_data = {
            "employee_name": "John Doe",
            # Missing employee_id
            "car_amount": Decimal('1000.00'),
            "receipt_amount": Decimal('800.00'),  # Mismatch
            "confidence": 0.6  # Low confidence
        }
        
        result = self.engine.validate_employee_data(employee_data)
        
        self.assertEqual(result["validation_status"], ValidationStatus.NEEDS_ATTENTION)
        self.assertGreater(result["issues_count"], 0)
        self.assertIn("has_issues", result["validation_flags"])
        self.assertTrue(result["validation_flags"]["has_issues"])
    
    def test_validate_batch(self):
        """Test batch validation of multiple employees"""
        employees = [
            {
                "employee_name": "John Doe",
                "employee_id": "EMP001",
                "car_amount": Decimal('500.00'),
                "receipt_amount": Decimal('500.00'),
                "confidence": 0.95
            },
            {
                "employee_name": "Jane Smith",
                # Missing employee_id
                "car_amount": Decimal('300.00'),
                "receipt_amount": Decimal('250.00'),  # Small mismatch
                "confidence": 0.85
            },
            {
                "employee_name": "Bob Johnson",
                "employee_id": "EMP003",
                "car_amount": Decimal('2500.00'),  # Policy violation
                "receipt_amount": Decimal('2500.00'),
                "confidence": 0.9
            }
        ]
        
        results = self.engine.validate_batch(employees)
        
        self.assertEqual(len(results), 3)
        
        # First employee should be valid
        self.assertEqual(results[0]["validation_status"], ValidationStatus.VALID)
        
        # Second employee should have issues
        self.assertEqual(results[1]["validation_status"], ValidationStatus.NEEDS_ATTENTION)
        
        # Third employee should have policy violation
        self.assertEqual(results[2]["validation_status"], ValidationStatus.NEEDS_ATTENTION)
    
    def test_validation_statistics(self):
        """Test validation statistics generation"""
        validation_results = [
            {
                "validation_status": ValidationStatus.VALID,
                "issues_count": 0,
                "highest_severity": ValidationSeverity.LOW.value
            },
            {
                "validation_status": ValidationStatus.NEEDS_ATTENTION,
                "issues_count": 2,
                "highest_severity": ValidationSeverity.MEDIUM.value
            },
            {
                "validation_status": ValidationStatus.NEEDS_ATTENTION,
                "issues_count": 1,
                "highest_severity": ValidationSeverity.HIGH.value
            }
        ]
        
        stats = self.engine.get_validation_statistics(validation_results)
        
        self.assertEqual(stats["total_employees"], 3)
        self.assertEqual(stats["valid_employees"], 1)
        self.assertEqual(stats["issues_employees"], 2)
        self.assertEqual(stats["total_issues"], 3)
        self.assertTrue(stats["requires_review"])
    
    def test_custom_rule_addition(self):
        """Test adding custom validation rules"""
        
        class CustomRule(ValidationRule):
            def __init__(self):
                super().__init__(
                    name="custom_test",
                    description="Custom test rule",
                    severity=ValidationSeverity.LOW
                )
            
            def validate(self, employee_data, context=None):
                if employee_data.get("employee_name") == "INVALID":
                    return {
                        "type": "custom_violation",
                        "severity": self.severity.value,
                        "description": "Custom rule violation",
                        "suggestion": "Fix the custom issue",
                        "fields_affected": ["employee_name"],
                        "auto_resolvable": False
                    }
                return None
        
        # Add custom rule
        custom_rule = CustomRule()
        self.engine.add_custom_rule(custom_rule)
        
        # Test with employee that triggers custom rule
        employee_data = {
            "employee_name": "INVALID",
            "employee_id": "EMP001"
        }
        
        result = self.engine.validate_employee_data(employee_data)
        
        # Should have the custom rule issue
        self.assertGreater(result["issues_count"], 0)
        self.assertIn("custom_violation", result["validation_flags"])
    
    def test_factory_function(self):
        """Test validation engine factory function"""
        config = {"policy_amount_limit": 1500.00}
        engine = create_validation_engine(config)
        
        self.assertIsInstance(engine, ValidationEngine)
        self.assertEqual(engine.config["policy_amount_limit"], 1500.00)
    
    def test_validation_flags_generation(self):
        """Test detailed validation flags generation"""
        issues = [
            {
                "type": ValidationIssueType.AMOUNT_MISMATCH.value,
                "severity": ValidationSeverity.MEDIUM.value,
                "description": "Test amount mismatch",
                "suggestion": "Fix the amounts",
                "fields_affected": ["car_amount", "receipt_amount"],
                "auto_resolvable": False,
                "detected_at": datetime.now(timezone.utc).isoformat(),
                "details": {"difference": 50.0}
            }
        ]
        
        flags = self.engine.generate_validation_flags(issues)
        
        self.assertIn("amount_mismatch", flags)
        self.assertTrue(flags["has_issues"])
        self.assertEqual(flags["total_issues"], 1)
        self.assertEqual(flags["highest_severity"], ValidationSeverity.MEDIUM.value)
        self.assertTrue(flags["requires_review"])


def run_task_9_2_tests():
    """Run Task 9.2 tests and return results"""
    print("="*80)
    print("TASK 9.2: ENHANCED VALIDATION ENGINE")
    print("="*80)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestValidationRules))
    suite.addTests(loader.loadTestsFromTestCase(TestValidationEngine))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "="*80)
    print("TASK 9.2 TEST SUMMARY")
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
        print(f"\n✅ TASK 9.2 IMPLEMENTATION SUCCESSFUL")
        print("Enhanced Validation Engine completed successfully!")
        print("\nImplemented Features:")
        print("✓ Comprehensive validation rule system")
        print("✓ Missing receipt validation")
        print("✓ Amount mismatch detection with configurable thresholds")
        print("✓ Missing employee ID detection")
        print("✓ Policy violation detection")
        print("✓ Duplicate employee detection")
        print("✓ Low confidence score detection")
        print("✓ Incomplete data validation")
        print("✓ Custom validation rules support")
        print("✓ Detailed validation flags with suggestions")
        print("✓ Batch validation with context-aware rules")
        print("✓ Validation statistics and reporting")
        print("✓ Configurable validation thresholds")
    else:
        print(f"\n❌ TASK 9.2 IMPLEMENTATION HAS ISSUES")
        print("Some tests failed - review implementation")
        
    print("="*80)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_task_9_2_tests()
    sys.exit(0 if success else 1)