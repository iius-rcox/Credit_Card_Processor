#!/usr/bin/env python3
"""
Test Task 9.1: Azure Document Intelligence Integration Prep
Tests the document processing interface and implementations
"""

import asyncio
import os
import tempfile
import unittest
from unittest.mock import Mock, patch, mock_open

# Set up environment for testing
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.document_intelligence import (
    DocumentProcessor,
    AzureDocumentIntelligenceProcessor,
    MockDocumentProcessor,
    create_document_processor
)


class TestDocumentIntelligenceIntegration(unittest.TestCase):
    """Test Azure Document Intelligence integration preparation"""
    
    def setUp(self):
        """Set up test environment"""
        # Create temporary test files
        self.temp_dir = tempfile.mkdtemp()
        self.test_car_file = os.path.join(self.temp_dir, "test_car.pdf")
        self.test_receipt_file = os.path.join(self.temp_dir, "test_receipt.pdf")
        
        # Create mock PDF files
        pdf_header = b'%PDF-1.4\n%Test PDF content\n'
        with open(self.test_car_file, 'wb') as f:
            f.write(pdf_header)
        with open(self.test_receipt_file, 'wb') as f:
            f.write(pdf_header)
    
    def tearDown(self):
        """Clean up test files"""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_factory_function_creates_processor(self):
        """Test that factory function creates document processor"""
        # Test auto-detection (should use mock without Azure config)
        processor = create_document_processor()
        self.assertIsInstance(processor, DocumentProcessor)
        self.assertEqual(processor.processor_type, "mock")
        
        # Test forced mock
        processor = create_document_processor(use_azure=False)
        self.assertEqual(processor.processor_type, "mock")
        
        # Test forced azure (will fallback to mock without credentials)
        processor = create_document_processor(use_azure=True)
        # Should still be using mock fallback without credentials
        self.assertIsInstance(processor, DocumentProcessor)
    
    def test_mock_processor_interface(self):
        """Test mock processor implementation"""
        processor = MockDocumentProcessor()
        
        # Test document validation
        result = asyncio.run(processor.validate_document(self.test_car_file))
        self.assertTrue(result["valid"])
        self.assertEqual(result["file_type"], "PDF")
        self.assertEqual(result["processor"], "mock")
        
        # Test invalid file
        result = asyncio.run(processor.validate_document("/nonexistent/file.pdf"))
        self.assertFalse(result["valid"])
        self.assertEqual(result["error"], "File does not exist")
    
    def test_mock_car_document_processing(self):
        """Test mock CAR document processing"""
        processor = MockDocumentProcessor()
        
        employees = asyncio.run(processor.process_car_document(self.test_car_file))
        
        # Validate response structure
        self.assertIsInstance(employees, list)
        self.assertEqual(len(employees), 45)  # Default employee count
        
        # Validate employee structure
        employee = employees[0]
        required_fields = ["employee_id", "employee_name", "car_amount", "department", "position", "source", "confidence"]
        for field in required_fields:
            self.assertIn(field, employee)
        
        self.assertEqual(employee["source"], "mock_car_document")
        self.assertEqual(employee["confidence"], 1.0)
    
    def test_mock_receipt_document_processing(self):
        """Test mock Receipt document processing"""
        processor = MockDocumentProcessor()
        
        employees = asyncio.run(processor.process_receipt_document(self.test_receipt_file))
        
        # Validate response structure
        self.assertIsInstance(employees, list)
        self.assertEqual(len(employees), 45)  # Default employee count
        
        # Validate employee structure
        employee = employees[0]
        required_fields = ["employee_id", "employee_name", "receipt_amount", "source", "confidence"]
        for field in required_fields:
            self.assertIn(field, employee)
        
        self.assertEqual(employee["source"], "mock_receipt_document")
        self.assertEqual(employee["confidence"], 1.0)
    
    @patch('app.services.document_intelligence.settings')
    def test_azure_processor_configuration(self, mock_settings):
        """Test Azure processor configuration detection"""
        
        # Test without Azure configuration
        mock_settings.azure_document_intelligence_endpoint = None
        mock_settings.azure_document_intelligence_key = None
        processor = AzureDocumentIntelligenceProcessor()
        self.assertFalse(processor._configured)
        
        # Test with Azure configuration
        mock_settings.azure_document_intelligence_endpoint = "https://test.cognitiveservices.azure.com/"
        mock_settings.azure_document_intelligence_key = "test-key"
        processor = AzureDocumentIntelligenceProcessor()
        self.assertTrue(processor._configured)
    
    @patch('app.services.document_intelligence.settings')
    def test_azure_processor_fallback(self, mock_settings):
        """Test Azure processor fallback to mock when not configured"""
        
        # Configure Azure processor without credentials
        mock_settings.azure_document_intelligence_endpoint = None
        mock_settings.azure_document_intelligence_key = None
        processor = AzureDocumentIntelligenceProcessor()
        
        # Should fallback to mock processing
        employees = asyncio.run(processor.process_car_document(self.test_car_file))
        
        self.assertIsInstance(employees, list)
        self.assertEqual(len(employees), 45)
        
        # Should have fallback source
        employee = employees[0]
        self.assertEqual(employee["source"], "mock_car_fallback")
    
    def test_document_processor_validation(self):
        """Test document processor validation"""
        processor = DocumentProcessor(use_azure=False)  # Force mock
        
        # Test valid document
        result = asyncio.run(processor.validate_document(self.test_car_file))
        self.assertTrue(result["valid"])
        
        # Test invalid document
        result = asyncio.run(processor.validate_document("/nonexistent/file.pdf"))
        self.assertFalse(result["valid"])
    
    def test_session_documents_processing(self):
        """Test processing both CAR and Receipt documents for a session"""
        processor = DocumentProcessor(use_azure=False)  # Force mock
        
        result = asyncio.run(processor.process_session_documents(self.test_car_file, self.test_receipt_file))
        
        # Validate response structure
        self.assertIn("employees", result)
        self.assertIn("car_count", result)
        self.assertIn("receipt_count", result)
        self.assertIn("merged_count", result)
        self.assertIn("processor_type", result)
        
        self.assertEqual(result["processor_type"], "mock")
        self.assertEqual(result["car_count"], 45)
        self.assertEqual(result["receipt_count"], 45)
        self.assertEqual(result["merged_count"], 45)  # Same employees in both docs
        
        # Validate merged employee structure
        employees = result["employees"]
        self.assertIsInstance(employees, list)
        
        employee = employees[0]
        required_fields = ["employee_name", "employee_id", "car_amount", "receipt_amount", "sources", "confidence"]
        for field in required_fields:
            self.assertIn(field, employee)
        
        # Should have both sources
        self.assertIn("car", employee["sources"])
        self.assertIn("receipt", employee["sources"])
    
    def test_document_processor_error_handling(self):
        """Test document processor error handling"""
        processor = DocumentProcessor(use_azure=False)  # Force mock
        
        # Test processing non-existent file
        with self.assertRaises(ValueError):
            asyncio.run(processor.process_car_document("/nonexistent/file.pdf"))
    
    def test_azure_document_validation_limits(self):
        """Test Azure document validation with file size limits"""
        processor = AzureDocumentIntelligenceProcessor()
        
        # Test file size validation
        large_file = os.path.join(self.temp_dir, "large_file.pdf")
        with open(large_file, 'wb') as f:
            # Write PDF header
            f.write(b'%PDF-1.4\n')
            # Write large content (simulate 600MB file)
            # We'll mock the file size check instead of actually creating a large file
        
        with patch('os.path.getsize', return_value=600 * 1024 * 1024):  # 600MB
            result = asyncio.run(processor.validate_document(large_file))
            self.assertFalse(result["valid"])
            self.assertIn("too large", result["error"])
    
    def test_invalid_pdf_validation(self):
        """Test validation of invalid PDF files"""
        processor = AzureDocumentIntelligenceProcessor()
        
        # Create invalid PDF file
        invalid_file = os.path.join(self.temp_dir, "invalid.pdf")
        with open(invalid_file, 'wb') as f:
            f.write(b'Not a PDF file')
        
        result = asyncio.run(processor.validate_document(invalid_file))
        self.assertFalse(result["valid"])
        self.assertEqual(result["error"], "Invalid PDF format")


def run_task_9_1_tests():
    """Run Task 9.1 tests and return results"""
    print("="*80)
    print("TASK 9.1: AZURE DOCUMENT INTELLIGENCE INTEGRATION PREP")
    print("="*80)
    
    # Create test suite
    test_suite = unittest.TestLoader().loadTestsFromTestCase(TestDocumentIntelligenceIntegration)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "="*80)
    print("TASK 9.1 TEST SUMMARY")
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
        print(f"\n✅ TASK 9.1 IMPLEMENTATION SUCCESSFUL")
        print("Azure Document Intelligence Integration Prep completed successfully!")
        print("\nImplemented Features:")
        print("✓ Abstract DocumentProcessorInterface for multiple implementations")
        print("✓ AzureDocumentIntelligenceProcessor with configuration detection")
        print("✓ MockDocumentProcessor for development and testing")
        print("✓ DocumentProcessor main interface with automatic fallback")
        print("✓ Comprehensive document validation (size, format, existence)")
        print("✓ Session document processing with data merging")
        print("✓ Error handling and graceful fallbacks")
        print("✓ Configuration management for Azure credentials")
    else:
        print(f"\n❌ TASK 9.1 IMPLEMENTATION HAS ISSUES")
        print("Some tests failed - review implementation")
        
    print("="*80)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_task_9_1_tests()
    sys.exit(0 if success else 1)