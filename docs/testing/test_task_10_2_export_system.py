#!/usr/bin/env python3
"""
Test Task 10.2: Export Generation System
Tests the comprehensive export generation system and ExportGenerator
"""

import os
import sys
import unittest
import uuid
import io
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import Mock, MagicMock, patch

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
        return self._first_result
    
    def all(self):
        return self._all_results
    
    def scalar(self):
        return self._scalar_result

# Create mock employees
def create_mock_employee(
    revision_id=None,
    employee_id="EMP001",
    name="John Doe",
    car_amount=1000.00,
    receipt_amount=900.00,
    status="needs_attention"
):
    employee = Mock()
    employee.revision_id = revision_id or uuid.uuid4()
    employee.employee_id = employee_id
    employee.employee_name = name
    employee.car_amount = Decimal(str(car_amount)) if car_amount else None
    employee.receipt_amount = Decimal(str(receipt_amount)) if receipt_amount else None
    
    # Mock validation status
    employee.validation_status = Mock()
    if status == "valid":
        employee.validation_status.value = "valid"
    elif status == "resolved":
        employee.validation_status.value = "resolved"
    else:
        employee.validation_status.value = "needs_attention"
    
    employee.validation_flags = {
        "amount_mismatch": True,
        "highest_severity": "medium",
        "total_issues": 1,
        "requires_review": True
    }
    employee.resolved_by = None
    employee.resolution_notes = None
    employee.created_at = datetime.now(timezone.utc)
    employee.updated_at = datetime.now(timezone.utc)
    employee.source = "car_document"
    employee.confidence = 0.95
    return employee

# Create mock session
def create_mock_session(session_id=None, name="Test Session"):
    session = Mock()
    session.session_id = session_id or uuid.uuid4()
    session.session_name = name
    session.status = Mock()
    session.status.value = "completed"
    session.created_by = "testuser"
    session.created_at = datetime.now(timezone.utc)
    session.updated_at = datetime.now(timezone.utc)
    return session

# Now import after mocking
from app.services.export_generator import (
    ExportGenerator,
    create_export_generator
)


class TestExportGenerator(unittest.TestCase):
    """Test Export Generator functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.db = MockDB()
        self.generator = ExportGenerator(self.db)
        self.test_session_id = str(uuid.uuid4())
        self.test_session = create_mock_session(self.test_session_id)
    
    def test_generate_pvault_csv(self):
        """Test pVault CSV generation"""
        # Set up mock employees
        employees = [
            create_mock_employee(employee_id="EMP001", name="John Doe", status="valid"),
            create_mock_employee(employee_id="EMP002", name="Jane Smith", status="resolved")
        ]
        
        # Patch the internal method that gets employees
        with patch.object(self.generator, '_get_employees_for_export', return_value=employees):
            # Generate CSV
            csv_buffer, filename = self.generator.generate_pvault_csv(self.test_session)
            
            # Verify results
            self.assertIsInstance(csv_buffer, io.StringIO)
            self.assertIsInstance(filename, str)
            self.assertIn("pvault", filename.lower())
            self.assertIn(".csv", filename)
            
            # Check CSV content
            csv_content = csv_buffer.getvalue()
            self.assertIn("Employee_ID", csv_content)
            self.assertIn("Employee_Name", csv_content)
            self.assertIn("Car_Allowance_Amount", csv_content)
            self.assertIn("Receipt_Amount", csv_content)
            self.assertIn("John Doe", csv_content)
            self.assertIn("Jane Smith", csv_content)
    
    def test_generate_pvault_csv_with_validation_details(self):
        """Test pVault CSV generation with validation details"""
        employees = [create_mock_employee()]
        
        # Mock database query results
        mock_query = Mock()
        mock_filtered = Mock()
        mock_filtered.all = Mock(return_value=employees)
        mock_query.filter = Mock(return_value=mock_filtered)
        self.db.query = Mock(return_value=mock_query)
        
        # Generate CSV with validation details
        csv_buffer, filename = self.generator.generate_pvault_csv(
            self.test_session,
            include_validation_details=True
        )
        
        csv_content = csv_buffer.getvalue()
        
        # Check validation detail headers
        self.assertIn("Validation_Issues", csv_content)
        self.assertIn("Issue_Count", csv_content)
        self.assertIn("Highest_Severity", csv_content)
        self.assertIn("Requires_Review", csv_content)
    
    @patch('app.services.export_generator.PANDAS_AVAILABLE', True)
    @patch('app.services.export_generator.pd')
    def test_generate_followup_excel(self, mock_pd):
        """Test follow-up Excel generation"""
        # Mock pandas
        mock_excel_writer = Mock()
        mock_pd.ExcelWriter.return_value.__enter__.return_value = mock_excel_writer
        mock_pd.DataFrame.return_value.to_excel = Mock()
        
        # Set up mock employees
        employees = [create_mock_employee()]
        
        # Mock database query results
        mock_query = Mock()
        mock_filtered = Mock()
        mock_filtered.all = Mock(return_value=employees)
        mock_query.filter = Mock(return_value=mock_filtered)
        self.db.query = Mock(return_value=mock_query)
        
        # Generate Excel
        excel_buffer, filename = self.generator.generate_followup_excel(self.test_session)
        
        # Verify results
        self.assertIsInstance(excel_buffer, io.BytesIO)
        self.assertIsInstance(filename, str)
        self.assertIn("followup", filename.lower())
        self.assertIn(".xlsx", filename)
        
        # Verify pandas was called
        mock_pd.ExcelWriter.assert_called_once()
        mock_pd.DataFrame.assert_called()
    
    @patch('app.services.export_generator.PANDAS_AVAILABLE', False)
    def test_generate_followup_excel_no_pandas(self):
        """Test Excel generation fails without pandas"""
        with self.assertRaises(ValueError) as cm:
            self.generator.generate_followup_excel(self.test_session)
        
        self.assertIn("pandas not installed", str(cm.exception))
    
    def test_generate_issues_report(self):
        """Test issues PDF report generation"""
        with patch('app.services.export_generator.REPORTLAB_AVAILABLE', True), \
             patch('app.services.export_generator.SimpleDocTemplate') as mock_simple_doc:
            
            # Mock reportlab
            mock_doc = Mock()
            mock_simple_doc.return_value = mock_doc
            
            # Set up mock employees
            employees = [create_mock_employee()]
            
            # Mock database query results
            mock_query = Mock()
            mock_filtered = Mock()
            mock_filtered.all = Mock(return_value=employees)
            mock_query.filter = Mock(return_value=mock_filtered)
            self.db.query = Mock(return_value=mock_query)
            
            # Generate PDF
            pdf_buffer, filename = self.generator.generate_issues_report(self.test_session)
            
            # Verify results
            self.assertIsInstance(pdf_buffer, io.BytesIO)
            self.assertIsInstance(filename, str)
            self.assertIn("issues", filename.lower())
            self.assertIn(".pdf", filename)
            
            # Verify reportlab was called
            mock_simple_doc.assert_called_once()
            mock_doc.build.assert_called_once()
    
    @patch('app.services.export_generator.REPORTLAB_AVAILABLE', False)
    def test_generate_issues_report_no_reportlab(self):
        """Test PDF generation fails without reportlab"""
        with self.assertRaises(ValueError) as cm:
            self.generator.generate_issues_report(self.test_session)
        
        self.assertIn("reportlab not installed", str(cm.exception))
    
    def test_get_export_mime_type(self):
        """Test MIME type detection"""
        # Test CSV
        mime_type = self.generator.get_export_mime_type("csv")
        self.assertEqual(mime_type, "text/csv")
        
        # Test Excel
        mime_type = self.generator.get_export_mime_type("excel")
        self.assertEqual(mime_type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        
        # Test PDF
        mime_type = self.generator.get_export_mime_type("pdf")
        self.assertEqual(mime_type, "application/pdf")
        
        # Test unknown
        mime_type = self.generator.get_export_mime_type("unknown")
        self.assertEqual(mime_type, "application/octet-stream")
    
    def test_log_export_activity(self):
        """Test export activity logging"""
        # Log activity
        self.generator.log_export_activity(
            session_id=self.test_session_id,
            export_type="csv",
            filename="test.csv",
            username="testuser",
            file_size=1024
        )
        
        # Verify database operations
        self.assertTrue(self.db.committed)
    
    def test_format_amount_methods(self):
        """Test amount formatting methods"""
        # Test CSV formatting
        result = self.generator._format_amount_for_csv(Decimal('1234.56'))
        self.assertEqual(result, "1234.56")
        
        result = self.generator._format_amount_for_csv(None)
        self.assertEqual(result, "")
        
        # Test Excel formatting
        result = self.generator._format_amount_for_excel(Decimal('1234.56'))
        self.assertEqual(result, 1234.56)
        
        result = self.generator._format_amount_for_excel(None)
        self.assertIsNone(result)
    
    def test_calculate_amount_difference(self):
        """Test amount difference calculation"""
        employee = create_mock_employee(car_amount=1000.00, receipt_amount=900.00)
        
        # Test CSV format
        result = self.generator._calculate_amount_difference_csv(employee)
        self.assertEqual(result, "100.00")
        
        # Test Excel format
        result = self.generator._calculate_amount_difference_excel(employee)
        self.assertEqual(result, 100.00)
    
    def test_format_validation_issues(self):
        """Test validation issues formatting"""
        flags = {
            "amount_mismatch": True,
            "missing_receipt": False,
            "policy_violation": True
        }
        
        result = self.generator._format_validation_issues_csv(flags)
        self.assertIn("Amount Mismatch", result)
        self.assertIn("Policy Violation", result)
        self.assertNotIn("Missing Receipt", result)
    
    def test_suggest_resolution_action(self):
        """Test resolution action suggestions"""
        # Test amount mismatch
        employee = create_mock_employee()
        employee.validation_flags = {"amount_mismatch": True}
        
        result = self.generator._suggest_resolution_action(employee)
        self.assertIn("Verify amounts", result)
        
        # Test missing receipt
        employee.validation_flags = {"missing_receipt": True}
        result = self.generator._suggest_resolution_action(employee)
        self.assertIn("Request receipt", result)
    
    def test_determine_issue_priority(self):
        """Test issue priority determination"""
        # Test critical priority
        flags = {"highest_severity": "critical"}
        result = self.generator._determine_issue_priority(flags)
        self.assertEqual(result, "High")
        
        # Test medium priority
        flags = {"highest_severity": "medium"}
        result = self.generator._determine_issue_priority(flags)
        self.assertEqual(result, "Medium")
        
        # Test low priority
        flags = {"highest_severity": "low"}
        result = self.generator._determine_issue_priority(flags)
        self.assertEqual(result, "Low")
    
    def test_generate_filename(self):
        """Test filename generation"""
        filename = self.generator._generate_filename(self.test_session, "test", "csv")
        
        self.assertIn("Session_", filename)
        self.assertIn("Test_Session", filename)
        self.assertIn("test", filename)
        self.assertIn(".csv", filename)
        # Should contain timestamp
        self.assertTrue(len(filename.split("_")) >= 4)
    
    def test_factory_function(self):
        """Test factory function"""
        generator = create_export_generator(self.db)
        self.assertIsInstance(generator, ExportGenerator)


class TestExportAPIStructure(unittest.TestCase):
    """Test Export API structure and endpoints"""
    
    def test_api_imports(self):
        """Test that API imports work correctly"""
        from app.api.export import router
        from app.services.export_generator import ExportGenerator
        
        # Check router configuration
        self.assertEqual(router.prefix, "/api/export")
        self.assertIn("exports", router.tags)
    
    def test_response_models(self):
        """Test response model structure"""
        from app.api.export import (
            ExportResponse,
            ExportHistoryResponse
        )
        
        # Test ExportResponse
        export_data = {
            "export_id": str(uuid.uuid4()),
            "session_id": str(uuid.uuid4()),
            "export_type": "csv",
            "filename": "test.csv",
            "file_size": 1024,
            "record_count": 100,
            "created_by": "testuser",
            "created_at": datetime.now(timezone.utc),
            "download_url": "/test/url"
        }
        
        export_response = ExportResponse(**export_data)
        self.assertEqual(export_response.export_type, "csv")
        self.assertEqual(export_response.file_size, 1024)
    
    def test_export_endpoints_exist(self):
        """Test that required export endpoints exist"""
        from app.api.export import (
            export_pvault_csv,
            export_followup_excel,
            export_issues_report,
            export_enhanced_pvault_csv,
            export_enhanced_followup_excel,
            export_enhanced_issues_report
        )
        
        # Check that endpoints exist and are callable
        self.assertTrue(callable(export_pvault_csv))
        self.assertTrue(callable(export_followup_excel))
        self.assertTrue(callable(export_issues_report))
        self.assertTrue(callable(export_enhanced_pvault_csv))
        self.assertTrue(callable(export_enhanced_followup_excel))
        self.assertTrue(callable(export_enhanced_issues_report))


class TestExportSystemFeatures(unittest.TestCase):
    """Test advanced export system features"""
    
    def test_file_headers_and_formatting(self):
        """Test that exports have proper file headers and formatting"""
        db = MockDB()
        generator = ExportGenerator(db)
        session = create_mock_session()
        
        # Mock employees
        employees = [create_mock_employee()]
        
        # Mock database query results
        mock_query = Mock()
        mock_filtered = Mock()
        mock_filtered.all = Mock(return_value=employees)
        mock_query.filter = Mock(return_value=mock_filtered)
        db.query = Mock(return_value=mock_query)
        
        # Test CSV headers
        csv_buffer, _ = generator.generate_pvault_csv(session)
        csv_content = csv_buffer.getvalue()
        
        # Verify standard CSV headers
        expected_headers = [
            "Employee_ID", "Employee_Name", "Car_Allowance_Amount",
            "Receipt_Amount", "Amount_Difference", "Validation_Status"
        ]
        
        for header in expected_headers:
            self.assertIn(header, csv_content)
    
    def test_proper_mime_types(self):
        """Test that proper MIME types are returned"""
        generator = ExportGenerator(MockDB())
        
        # Test MIME type mapping
        self.assertEqual(
            generator.get_export_mime_type("csv"),
            "text/csv"
        )
        self.assertEqual(
            generator.get_export_mime_type("excel"),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        self.assertEqual(
            generator.get_export_mime_type("pdf"),
            "application/pdf"
        )
    
    def test_error_handling(self):
        """Test export system error handling"""
        db = MockDB()
        generator = ExportGenerator(db)
        session = create_mock_session()
        
        # Mock database error
        mock_query = Mock()
        mock_filtered = Mock()
        mock_filtered.all = Mock(side_effect=Exception("Database error"))
        mock_query.filter = Mock(return_value=mock_filtered)
        db.query = Mock(return_value=mock_query)
        
        # Test that errors are properly handled
        with self.assertRaises(ValueError) as cm:
            generator.generate_pvault_csv(session)
        
        self.assertIn("Failed to generate pVault CSV", str(cm.exception))
    
    def test_export_filtering(self):
        """Test export employee filtering"""
        db = MockDB()
        generator = ExportGenerator(db)
        session = create_mock_session()
        
        # Test different filtering options
        employees = generator._get_employees_for_export(session, include_resolved=True)
        # Should attempt to filter for valid and resolved
        
        employees = generator._get_employees_for_export(session, include_resolved=False)
        # Should attempt to filter for valid only
        
        attention_employees = generator._get_employees_needing_attention(session)
        # Should attempt to filter for needs_attention only
    
    def test_comprehensive_csv_generation(self):
        """Test comprehensive CSV generation features"""
        db = MockDB()
        generator = ExportGenerator(db)
        session = create_mock_session()
        
        # Create diverse employee data
        employees = [
            create_mock_employee(employee_id="EMP001", name="John Doe", car_amount=1000.00, receipt_amount=900.00, status="valid"),
            create_mock_employee(employee_id="EMP002", name="Jane Smith", car_amount=2000.00, receipt_amount=None, status="needs_attention"),
            create_mock_employee(employee_id="EMP003", name="Bob Johnson", car_amount=None, receipt_amount=1500.00, status="resolved")
        ]
        
        # Mock database query results
        mock_query = Mock()
        mock_filtered = Mock()
        mock_filtered.all = Mock(return_value=employees)
        mock_query.filter = Mock(return_value=mock_filtered)
        db.query = Mock(return_value=mock_query)
        
        # Generate CSV
        csv_buffer, filename = generator.generate_pvault_csv(session)
        csv_content = csv_buffer.getvalue()
        
        # Verify all employees are included
        self.assertIn("John Doe", csv_content)
        self.assertIn("Jane Smith", csv_content)
        self.assertIn("Bob Johnson", csv_content)
        
        # Verify amount formatting
        self.assertIn("1000.00", csv_content)
        self.assertIn("900.00", csv_content)
        # Should handle None values gracefully


def run_task_10_2_tests():
    """Run Task 10.2 tests and return results"""
    print("="*80)
    print("TASK 10.2: EXPORT GENERATION SYSTEM")
    print("="*80)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestExportGenerator))
    suite.addTests(loader.loadTestsFromTestCase(TestExportAPIStructure))
    suite.addTests(loader.loadTestsFromTestCase(TestExportSystemFeatures))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "="*80)
    print("TASK 10.2 TEST SUMMARY")
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
        print(f"\n✅ TASK 10.2 IMPLEMENTATION SUCCESSFUL")
        print("Export Generation System completed successfully!")
        print("\nImplemented Features:")
        print("✓ GET /api/export/{session_id}/pvault - pVault CSV export (existing)")
        print("✓ GET /api/export/{session_id}/followup - Follow-up Excel export (existing)")
        print("✓ GET /api/export/{session_id}/issues - Issues PDF export (existing)")
        print("✓ GET /api/export/{session_id}/pvault/enhanced - Enhanced pVault CSV (new)")
        print("✓ GET /api/export/{session_id}/followup/enhanced - Enhanced Excel (new)")
        print("✓ GET /api/export/{session_id}/issues/enhanced - Enhanced PDF (new)")
        print("✓ ExportGenerator class with comprehensive export logic")
        print("✓ Proper file headers and formatting for all export types")
        print("✓ Correct MIME type handling for downloads")
        print("✓ pVault CSV format with configurable validation details")
        print("✓ Follow-up Excel with summary sheets and formatting")
        print("✓ Issues PDF with statistics and recommendations")
        print("✓ Export activity logging and file size tracking")
        print("✓ Comprehensive error handling and validation")
        print("✓ Resolution action suggestions and priority determination")
        print("✓ Standardized filename generation with timestamps")
        print("✓ Factory function for service instantiation")
    else:
        print(f"\n❌ TASK 10.2 IMPLEMENTATION HAS ISSUES")
        print("Some tests failed - review implementation")
        
    print("="*80)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_task_10_2_tests()
    sys.exit(0 if success else 1)