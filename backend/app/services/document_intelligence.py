"""
Azure Document Intelligence Integration Service

Provides integration with Azure Document Intelligence for automated document processing
of CAR and Receipt files with fallback to mock processing for development.

Task 9.1: Azure Document Intelligence Integration Prep
"""

import asyncio
import logging
import os
import json
from typing import Dict, List, Optional, Any
from decimal import Decimal
from abc import ABC, abstractmethod

from ..config import settings

# Configure logger
logger = logging.getLogger(__name__)


class DocumentProcessorInterface(ABC):
    """Abstract interface for document processing implementations"""
    
    @abstractmethod
    async def process_car_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process CAR (Corporate Account Receipt) PDF document
        
        Args:
            file_path: Path to the CAR PDF file
            
        Returns:
            List of employee records extracted from the document
        """
        pass
    
    @abstractmethod
    async def process_receipt_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process Receipt PDF document
        
        Args:
            file_path: Path to the Receipt PDF file
            
        Returns:
            List of employee records extracted from the document
        """
        pass
    
    @abstractmethod
    async def validate_document(self, file_path: str) -> Dict[str, Any]:
        """
        Validate document before processing
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Validation result with status and any issues
        """
        pass


class AzureDocumentIntelligenceProcessor(DocumentProcessorInterface):
    """
    Azure Document Intelligence implementation for document processing
    
    Uses Azure Form Recognizer/Document Intelligence API to extract structured data
    from CAR and Receipt PDF documents.
    """
    
    def __init__(self):
        """Initialize Azure Document Intelligence processor"""
        self.endpoint = settings.azure_document_intelligence_endpoint
        self.api_key = settings.azure_document_intelligence_key
        self.api_version = "2024-02-29-preview"  # Latest stable version
        
        # Validate configuration
        if not self.endpoint or not self.api_key:
            logger.warning("Azure Document Intelligence credentials not configured, falling back to mock processing")
            self._configured = False
        else:
            self._configured = True
            logger.info(f"Azure Document Intelligence configured with endpoint: {self.endpoint}")
    
    async def process_car_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process CAR document using Azure Document Intelligence
        
        Args:
            file_path: Path to the CAR PDF file
            
        Returns:
            List of employee records from CAR document
        """
        if not self._configured:
            logger.warning("Azure Document Intelligence not configured, using fallback")
            return await self._fallback_car_processing(file_path)
        
        try:
            logger.info(f"Processing CAR document with Azure DI: {file_path}")
            
            # Read file for Azure API
            with open(file_path, 'rb') as file:
                file_content = file.read()
            
            # Use custom model for CAR documents if available, otherwise use general document model
            model_id = settings.azure_car_model_id or "prebuilt-document"
            
            # Submit document for analysis
            analysis_result = await self._analyze_document(file_content, model_id)
            
            # Extract employee data from analysis result
            employees = await self._extract_car_employee_data(analysis_result)
            
            logger.info(f"Successfully processed CAR document: {len(employees)} employees extracted")
            return employees
            
        except Exception as e:
            logger.error(f"Azure Document Intelligence CAR processing failed: {str(e)}")
            # Fallback to mock processing
            logger.info("Falling back to mock CAR processing")
            return await self._fallback_car_processing(file_path)
    
    async def process_receipt_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process Receipt document using Azure Document Intelligence
        
        Args:
            file_path: Path to the Receipt PDF file
            
        Returns:
            List of employee records from Receipt document
        """
        if not self._configured:
            logger.warning("Azure Document Intelligence not configured, using fallback")
            return await self._fallback_receipt_processing(file_path)
        
        try:
            logger.info(f"Processing Receipt document with Azure DI: {file_path}")
            
            # Read file for Azure API
            with open(file_path, 'rb') as file:
                file_content = file.read()
            
            # Use custom model for Receipt documents if available, otherwise use general document model
            model_id = settings.azure_receipt_model_id or "prebuilt-receipt"
            
            # Submit document for analysis
            analysis_result = await self._analyze_document(file_content, model_id)
            
            # Extract employee data from analysis result
            employees = await self._extract_receipt_employee_data(analysis_result)
            
            logger.info(f"Successfully processed Receipt document: {len(employees)} employees extracted")
            return employees
            
        except Exception as e:
            logger.error(f"Azure Document Intelligence Receipt processing failed: {str(e)}")
            # Fallback to mock processing
            logger.info("Falling back to mock Receipt processing")
            return await self._fallback_receipt_processing(file_path)
    
    async def validate_document(self, file_path: str) -> Dict[str, Any]:
        """
        Validate document format and readability
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Validation result dictionary
        """
        try:
            # Basic file validation
            if not os.path.exists(file_path):
                return {
                    "valid": False,
                    "error": "File does not exist",
                    "details": f"File path: {file_path}"
                }
            
            # Check file size (Azure has 500MB limit)
            file_size = os.path.getsize(file_path)
            max_size = 500 * 1024 * 1024  # 500MB
            
            if file_size > max_size:
                return {
                    "valid": False,
                    "error": "File too large for Azure Document Intelligence",
                    "details": f"File size: {file_size} bytes, Maximum: {max_size} bytes"
                }
            
            # Check if it's a PDF file
            with open(file_path, 'rb') as file:
                header = file.read(4)
                if header != b'%PDF':
                    return {
                        "valid": False,
                        "error": "Invalid PDF format",
                        "details": "File does not appear to be a valid PDF document"
                    }
            
            return {
                "valid": True,
                "file_size": file_size,
                "file_type": "PDF"
            }
            
        except Exception as e:
            logger.error(f"Document validation failed: {str(e)}")
            return {
                "valid": False,
                "error": "Validation error",
                "details": str(e)
            }
    
    async def _analyze_document(self, file_content: bytes, model_id: str) -> Dict[str, Any]:
        """
        Submit document to Azure Document Intelligence for analysis
        
        Args:
            file_content: Binary content of the document
            model_id: Azure model ID to use for analysis
            
        Returns:
            Analysis result from Azure API
        """
        try:
            # This would be the actual Azure API call
            # For now, return mock structure that matches Azure response format
            
            # TODO: Implement actual Azure Document Intelligence API call
            # import aiohttp
            # 
            # headers = {
            #     "Ocp-Apim-Subscription-Key": self.api_key,
            #     "Content-Type": "application/pdf"
            # }
            # 
            # url = f"{self.endpoint}/formrecognizer/documentModels/{model_id}:analyze"
            # 
            # async with aiohttp.ClientSession() as session:
            #     async with session.post(url, headers=headers, data=file_content) as response:
            #         if response.status == 202:
            #             # Poll for results
            #             operation_location = response.headers.get("Operation-Location")
            #             return await self._poll_analysis_result(operation_location)
            #         else:
            #             raise Exception(f"Azure API error: {response.status}")
            
            # Mock response structure for development
            return {
                "status": "succeeded",
                "analyzeResult": {
                    "documents": [
                        {
                            "docType": "document",
                            "boundingRegions": [],
                            "fields": {},
                            "confidence": 0.99
                        }
                    ],
                    "tables": [],
                    "pages": [
                        {
                            "pageNumber": 1,
                            "width": 612,
                            "height": 792,
                            "unit": "pixel"
                        }
                    ]
                }
            }
            
        except Exception as e:
            logger.error(f"Azure Document Intelligence analysis failed: {str(e)}")
            raise
    
    async def _extract_car_employee_data(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract employee data from CAR document analysis result
        
        Args:
            analysis_result: Result from Azure Document Intelligence
            
        Returns:
            List of employee records
        """
        # TODO: Implement actual data extraction from Azure response
        # This would parse the fields, tables, and text from the Azure analysis result
        
        # For now, return mock data structure
        from .mock_processor import generate_mock_employee_data
        
        logger.warning("Using mock data extraction - implement Azure response parsing")
        mock_employees = generate_mock_employee_data(45)
        
        # Convert to format expected by processing engine
        employees = []
        for emp in mock_employees:
            employees.append({
                "employee_id": emp["employee_id"],
                "employee_name": emp["employee_name"],
                "car_amount": emp["car_amount"],
                "department": emp.get("department", "Unknown"),
                "position": emp.get("position", "Unknown"),
                "source": "car_document",
                "confidence": 0.95  # Azure confidence score
            })
        
        return employees
    
    async def _extract_receipt_employee_data(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract employee data from Receipt document analysis result
        
        Args:
            analysis_result: Result from Azure Document Intelligence
            
        Returns:
            List of employee records
        """
        # TODO: Implement actual data extraction from Azure response
        # This would parse the receipt items, amounts, and employee information
        
        # For now, return mock data structure
        from .mock_processor import generate_mock_employee_data
        
        logger.warning("Using mock data extraction - implement Azure response parsing")
        mock_employees = generate_mock_employee_data(45)
        
        # Convert to format expected by processing engine
        employees = []
        for emp in mock_employees:
            employees.append({
                "employee_id": emp["employee_id"],
                "employee_name": emp["employee_name"],
                "receipt_amount": emp["receipt_amount"],
                "source": "receipt_document",
                "confidence": 0.93  # Azure confidence score
            })
        
        return employees
    
    async def _fallback_car_processing(self, file_path: str) -> List[Dict[str, Any]]:
        """Fallback to mock CAR processing"""
        from .mock_processor import generate_mock_employee_data
        
        logger.info("Using mock CAR processing fallback")
        mock_employees = generate_mock_employee_data(45)
        
        employees = []
        for emp in mock_employees:
            employees.append({
                "employee_id": emp["employee_id"],
                "employee_name": emp["employee_name"],
                "car_amount": emp["car_amount"],
                "department": emp.get("department", "Unknown"),
                "position": emp.get("position", "Unknown"),
                "source": "mock_car_fallback",
                "confidence": 1.0  # Mock data is always "confident"
            })
        
        return employees
    
    async def _fallback_receipt_processing(self, file_path: str) -> List[Dict[str, Any]]:
        """Fallback to mock Receipt processing"""
        from .mock_processor import generate_mock_employee_data
        
        logger.info("Using mock Receipt processing fallback")
        mock_employees = generate_mock_employee_data(45)
        
        employees = []
        for emp in mock_employees:
            employees.append({
                "employee_id": emp["employee_id"],
                "employee_name": emp["employee_name"],
                "receipt_amount": emp["receipt_amount"],
                "source": "mock_receipt_fallback",
                "confidence": 1.0  # Mock data is always "confident"
            })
        
        return employees


class MockDocumentProcessor(DocumentProcessorInterface):
    """
    Mock document processor for development and testing
    
    Provides the same interface as Azure Document Intelligence but generates
    realistic mock data for testing and development purposes.
    """
    
    def __init__(self):
        """Initialize mock document processor"""
        logger.info("Mock Document Processor initialized for development use")
    
    async def process_car_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Mock processing of CAR document
        
        Args:
            file_path: Path to the CAR PDF file (not actually read)
            
        Returns:
            List of mock employee records from CAR document
        """
        logger.info(f"Mock processing CAR document: {file_path}")
        
        # Simulate processing delay
        await asyncio.sleep(0.5)
        
        # Use consistent seed for mock data to ensure same employees across CAR and Receipt
        import random
        original_state = random.getstate()
        random.seed(42)  # Consistent seed for reproducible results
        
        try:
            from .mock_processor import generate_mock_employee_data
            mock_employees = generate_mock_employee_data(45)
            
            employees = []
            for emp in mock_employees:
                employees.append({
                    "employee_id": emp["employee_id"],
                    "employee_name": emp["employee_name"],
                    "car_amount": emp["car_amount"],
                    "department": emp.get("department", "Unknown"),
                    "position": emp.get("position", "Unknown"),
                    "source": "mock_car_document",
                    "confidence": 1.0  # Mock data is always "confident"
                })
            
            logger.info(f"Mock CAR processing completed: {len(employees)} employees")
            return employees
        finally:
            random.setstate(original_state)  # Restore original random state
    
    async def process_receipt_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Mock processing of Receipt document
        
        Args:
            file_path: Path to the Receipt PDF file (not actually read)
            
        Returns:
            List of mock employee records from Receipt document
        """
        logger.info(f"Mock processing Receipt document: {file_path}")
        
        # Simulate processing delay
        await asyncio.sleep(0.5)
        
        # Use consistent seed for mock data to ensure same employees across CAR and Receipt
        import random
        original_state = random.getstate()
        random.seed(42)  # Same seed as CAR document for consistent employee names
        
        try:
            from .mock_processor import generate_mock_employee_data
            mock_employees = generate_mock_employee_data(45)
            
            employees = []
            for emp in mock_employees:
                employees.append({
                    "employee_id": emp["employee_id"],
                    "employee_name": emp["employee_name"],
                    "receipt_amount": emp["receipt_amount"],
                    "source": "mock_receipt_document",
                    "confidence": 1.0  # Mock data is always "confident"
                })
            
            logger.info(f"Mock Receipt processing completed: {len(employees)} employees")
            return employees
        finally:
            random.setstate(original_state)  # Restore original random state
    
    async def validate_document(self, file_path: str) -> Dict[str, Any]:
        """
        Mock document validation (always returns valid for existing files)
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Mock validation result
        """
        if not os.path.exists(file_path):
            return {
                "valid": False,
                "error": "File does not exist",
                "details": f"File path: {file_path}"
            }
        
        file_size = os.path.getsize(file_path)
        
        return {
            "valid": True,
            "file_size": file_size,
            "file_type": "PDF",
            "processor": "mock"
        }


class DocumentProcessor:
    """
    Main document processor that chooses between Azure and Mock implementation
    
    This is the primary interface used by the processing engine. It automatically
    selects Azure Document Intelligence if configured, otherwise falls back to
    mock processing for development.
    """
    
    def __init__(self, use_azure: bool = None):
        """
        Initialize document processor with appropriate implementation
        
        Args:
            use_azure: Force Azure usage (True) or mock (False). 
                      If None, auto-detect based on configuration.
        """
        if use_azure is None:
            # Auto-detect based on Azure configuration
            use_azure = (
                hasattr(settings, 'azure_document_intelligence_endpoint') and
                hasattr(settings, 'azure_document_intelligence_key') and
                settings.azure_document_intelligence_endpoint and
                settings.azure_document_intelligence_key
            )
        
        if use_azure:
            self._processor = AzureDocumentIntelligenceProcessor()
            self._processor_type = "azure"
            logger.info("Document processor initialized with Azure Document Intelligence")
        else:
            self._processor = MockDocumentProcessor()
            self._processor_type = "mock"
            logger.info("Document processor initialized with Mock processor for development")
    
    @property
    def processor_type(self) -> str:
        """Get the type of processor being used"""
        return self._processor_type
    
    async def process_car_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process CAR PDF document
        
        Args:
            file_path: Path to the CAR PDF file
            
        Returns:
            List of employee records extracted from the document
        """
        try:
            # Validate document first
            validation_result = await self._processor.validate_document(file_path)
            if not validation_result["valid"]:
                raise ValueError(f"Document validation failed: {validation_result['error']}")
            
            # Process document
            return await self._processor.process_car_document(file_path)
            
        except Exception as e:
            logger.error(f"CAR document processing failed: {str(e)}")
            raise
    
    async def process_receipt_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process Receipt PDF document
        
        Args:
            file_path: Path to the Receipt PDF file
            
        Returns:
            List of employee records extracted from the document
        """
        try:
            # Validate document first
            validation_result = await self._processor.validate_document(file_path)
            if not validation_result["valid"]:
                raise ValueError(f"Document validation failed: {validation_result['error']}")
            
            # Process document
            return await self._processor.process_receipt_document(file_path)
            
        except Exception as e:
            logger.error(f"Receipt document processing failed: {str(e)}")
            raise
    
    async def validate_document(self, file_path: str) -> Dict[str, Any]:
        """
        Validate document before processing
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Validation result with status and any issues
        """
        return await self._processor.validate_document(file_path)
    
    async def process_session_documents(self, car_file_path: str, receipt_file_path: str) -> Dict[str, Any]:
        """
        Process both CAR and Receipt documents for a session
        
        Args:
            car_file_path: Path to the CAR PDF file
            receipt_file_path: Path to the Receipt PDF file
            
        Returns:
            Dictionary containing employee data from both documents
        """
        try:
            logger.info(f"Processing session documents - CAR: {car_file_path}, Receipt: {receipt_file_path}")
            
            # Process both documents concurrently for better performance
            car_task = self.process_car_document(car_file_path)
            receipt_task = self.process_receipt_document(receipt_file_path)
            
            car_employees, receipt_employees = await asyncio.gather(car_task, receipt_task)
            
            # Merge employee data from both sources
            merged_employees = self._merge_employee_data(car_employees, receipt_employees)
            
            logger.info(f"Session document processing completed: {len(merged_employees)} employees merged")
            
            return {
                "employees": merged_employees,
                "car_count": len(car_employees),
                "receipt_count": len(receipt_employees),
                "merged_count": len(merged_employees),
                "processor_type": self._processor_type
            }
            
        except Exception as e:
            logger.error(f"Session document processing failed: {str(e)}")
            raise
    
    def _merge_employee_data(self, car_employees: List[Dict], receipt_employees: List[Dict]) -> List[Dict]:
        """
        Merge employee data from CAR and Receipt documents
        
        Args:
            car_employees: Employee data from CAR document
            receipt_employees: Employee data from Receipt document
            
        Returns:
            List of merged employee records
        """
        # Create lookup maps by employee name
        car_map = {emp["employee_name"]: emp for emp in car_employees}
        receipt_map = {emp["employee_name"]: emp for emp in receipt_employees}
        
        # Get all unique employee names
        all_names = set(car_map.keys()) | set(receipt_map.keys())
        
        merged_employees = []
        for name in all_names:
            car_data = car_map.get(name, {})
            receipt_data = receipt_map.get(name, {})
            
            # Merge data with preference for more complete records
            merged_employee = {
                "employee_name": name,
                "employee_id": car_data.get("employee_id") or receipt_data.get("employee_id"),
                "car_amount": car_data.get("car_amount", Decimal('0.00')),
                "receipt_amount": receipt_data.get("receipt_amount", Decimal('0.00')),
                "department": car_data.get("department") or receipt_data.get("department", "Unknown"),
                "position": car_data.get("position") or receipt_data.get("position", "Unknown"),
                "sources": []
            }
            
            # Track which documents contained this employee
            if car_data:
                merged_employee["sources"].append("car")
            if receipt_data:
                merged_employee["sources"].append("receipt")
            
            # Calculate confidence as average of source confidences
            confidences = []
            if car_data.get("confidence"):
                confidences.append(car_data["confidence"])
            if receipt_data.get("confidence"):
                confidences.append(receipt_data["confidence"])
            
            merged_employee["confidence"] = sum(confidences) / len(confidences) if confidences else 0.5
            
            merged_employees.append(merged_employee)
        
        # Sort by employee name for consistency
        merged_employees.sort(key=lambda emp: emp["employee_name"])
        
        return merged_employees


# Factory function for easy integration
def create_document_processor(use_azure: bool = None) -> DocumentProcessor:
    """
    Factory function to create document processor instance
    
    Args:
        use_azure: Force Azure usage (True) or mock (False). 
                  If None, auto-detect based on configuration.
                  
    Returns:
        DocumentProcessor instance
    """
    return DocumentProcessor(use_azure=use_azure)