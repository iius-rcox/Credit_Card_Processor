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
            logger.error("Azure Document Intelligence not configured")
            raise ValueError("Azure Document Intelligence not configured - cannot process CAR document")
        
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
            raise RuntimeError(f"Failed to process CAR document with Azure Document Intelligence: {str(e)}")
    
    async def process_receipt_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process Receipt document using Azure Document Intelligence
        
        Args:
            file_path: Path to the Receipt PDF file
            
        Returns:
            List of employee records from Receipt document
        """
        if not self._configured:
            logger.error("Azure Document Intelligence not configured")
            raise ValueError("Azure Document Intelligence not configured - cannot process Receipt document")
        
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
            raise RuntimeError(f"Failed to process Receipt document with Azure Document Intelligence: {str(e)}")
    
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
        # Log the actual Azure response for debugging (avoiding sensitive word filters)
        logger.info(f"Azure DI analysis result properties: {list(analysis_result.keys())}")
        logger.info(f"Azure DI analysis result type: {type(analysis_result)}")
        
        # Navigate to the actual analysis results
        analyze_result = analysis_result.get('analyzeResult', {})
        logger.info(f"analyzeResult contents: {list(analyze_result.keys())}")
        
        # Check if we have table data
        if 'tables' in analyze_result and analyze_result['tables']:
            tables = analyze_result['tables']
            logger.info(f"Found {len(tables)} tables in CAR document")
            for i, table in enumerate(tables):
                logger.info(f"Table {i}: {table.get('rowCount', 0)} rows, {table.get('columnCount', 0)} columns")
                if 'cells' in table:
                    logger.info(f"First few cells: {str(table['cells'][:5])}")
        else:
            logger.info(f"No tables found in CAR document. analyzeResult keys: {list(analyze_result.keys())}")
        
        # Check if we have field-value pairs
        if 'keyValuePairs' in analyze_result and analyze_result['keyValuePairs']:
            logger.info(f"Found {len(analyze_result['keyValuePairs'])} field-value pairs")
        
        # Check if we have paragraphs/text
        if 'paragraphs' in analyze_result and analyze_result['paragraphs']:
            logger.info(f"Found {len(analyze_result['paragraphs'])} paragraphs")
            # Log a few paragraphs to see what text we're getting
            for i, para in enumerate(analyze_result['paragraphs'][:3]):
                content = para.get('content', '')[:100]
                logger.info(f"Paragraph {i}: {content}...")
        
        # Implement actual data extraction from Azure response
        employees = []
        
        # Try to extract employee data from tables
        if 'tables' in analyze_result and analyze_result['tables']:
            tables = analyze_result['tables']
            logger.info(f"Extracting employee data from {len(tables)} tables")
            
            for table_idx, table in enumerate(tables):
                employees_from_table = self._extract_employees_from_table(table, 'CAR')
                employees.extend(employees_from_table)
                logger.info(f"Extracted {len(employees_from_table)} employees from table {table_idx}")
        
        # If no tables found or no data extracted, try paragraphs
        if not employees and 'paragraphs' in analyze_result and analyze_result['paragraphs']:
            logger.info("No table data found, attempting to extract from paragraphs")
            employees = self._extract_employees_from_paragraphs(analyze_result['paragraphs'], 'CAR')
            logger.info(f"Extracted {len(employees)} employees from paragraphs")
        
        # If no data extracted, raise an error - no more fallback to mock data
        if not employees:
            logger.error("No employee data extracted from CAR document - processing failed")
            raise ValueError("Failed to extract any employee data from CAR document using Azure Document Intelligence")
        
        logger.info(f"Successfully extracted {len(employees)} employees from CAR document using Azure DI")
        return employees
    
    def _extract_employees_from_table(self, table: Dict[str, Any], document_type: str) -> List[Dict[str, Any]]:
        """
        Extract employee data from a table structure
        """
        employees = []
        cells = table.get('cells', [])
        row_count = table.get('rowCount', 0)
        column_count = table.get('columnCount', 0)
        
        logger.info(f"Processing table with {row_count} rows and {column_count} columns")
        
        if not cells:
            return employees
        
        # Create a grid from cells
        grid = {}
        for cell in cells:
            row = cell.get('rowIndex', 0)
            col = cell.get('columnIndex', 0)
            content = cell.get('content', '').strip()
            if row not in grid:
                grid[row] = {}
            grid[row][col] = content
        
        # Find header row (usually row 0)
        headers = grid.get(0, {})
        logger.info(f"Table headers: {headers}")
        
        # Extract data rows
        for row_idx in range(1, row_count):  # Skip header row
            row_data = grid.get(row_idx, {})
            
            # Try to find employee name and amount columns
            employee_name = ""
            amount = 0.0
            
            for col_idx, cell_content in row_data.items():
                # Look for names (typically text with spaces)
                if ' ' in cell_content and not cell_content.replace('.', '').replace(',', '').replace('$', '').replace('-', '').replace(' ', '').isdigit():
                    employee_name = cell_content
                
                # Look for amounts (currency format)
                if '$' in cell_content or cell_content.replace('.', '').replace(',', '').replace('-', '').isdigit():
                    try:
                        amount_str = cell_content.replace('$', '').replace(',', '').strip()
                        if amount_str:
                            amount = float(amount_str)
                    except ValueError:
                        pass
            
            # Create employee record if we found meaningful data
            if employee_name and len(employee_name) > 2:
                employee_id = f"{document_type}_{row_idx}_{hash(employee_name) % 10000}"
                
                if document_type == 'CAR':
                    employees.append({
                        "employee_id": employee_id,
                        "employee_name": employee_name,
                        "car_amount": amount,
                        "source": "car_document",
                        "confidence": 0.85
                    })
                else:  # Receipt
                    employees.append({
                        "employee_id": employee_id,
                        "employee_name": employee_name,
                        "receipt_amount": amount,
                        "source": "receipt_document", 
                        "confidence": 0.85
                    })
        
        return employees
    
    def _extract_employees_from_paragraphs(self, paragraphs: List[Dict[str, Any]], document_type: str) -> List[Dict[str, Any]]:
        """
        Extract employee data from paragraph text using pattern matching
        """
        import re
        employees = []
        employee_id = 1
        
        logger.info(f"Attempting paragraph-based extraction for {document_type} from {len(paragraphs)} paragraphs")
        
        # Patterns to match names and amounts
        name_patterns = [
            r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b',  # First Last (or more names)
            r'\b[A-Z]{2,}\s+[A-Z]{2,}\b',  # FIRST LAST (all caps)
        ]
        
        amount_patterns = [
            r'\$\d+(?:,\d{3})*(?:\.\d{2})?',  # $123.45 or $1,234.56
            r'\b\d+\.\d{2}\b',  # 123.45
            r'\b\d{1,3}(?:,\d{3})*\b'  # 1,234 or 123
        ]
        
        # Process each paragraph
        for para_idx, paragraph in enumerate(paragraphs):
            content = paragraph.get('content', '').strip()
            if not content or len(content) < 5:
                continue
                
            # Look for potential employee names
            found_names = []
            for pattern in name_patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    if len(match.split()) >= 2 and len(match) <= 50:  # Reasonable name length
                        found_names.append(match)
            
            # Look for amounts in the same paragraph
            found_amounts = []
            for pattern in amount_patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    try:
                        # Convert to float
                        amount_str = match.replace('$', '').replace(',', '')
                        amount = float(amount_str)
                        if 0.01 <= amount <= 999999:  # Reasonable amount range
                            found_amounts.append(amount)
                    except ValueError:
                        continue
            
            # Create employee records when we find both names and amounts
            if found_names and found_amounts:
                for name in found_names[:3]:  # Limit to 3 names per paragraph
                    amount = found_amounts[0] if found_amounts else 0.0
                    
                    employee_record = {
                        "employee_id": f"{document_type}_{employee_id}_{hash(name) % 10000}",
                        "employee_name": name.title(),
                        "source": f"{document_type.lower()}_document_paragraphs",
                        "confidence": 0.7  # Lower confidence for paragraph extraction
                    }
                    
                    if document_type == 'CAR':
                        employee_record["car_amount"] = amount
                    else:  # Receipt
                        employee_record["receipt_amount"] = amount
                    
                    employees.append(employee_record)
                    employee_id += 1
                    
                    logger.debug(f"Extracted from paragraph {para_idx}: {name} - ${amount}")
        
        logger.info(f"Paragraph extraction completed for {document_type}: {len(employees)} employees found")
        return employees
    
    async def _extract_receipt_employee_data(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract employee data from Receipt document analysis result
        
        Args:
            analysis_result: Result from Azure Document Intelligence
            
        Returns:
            List of employee records
        """
        # Log the actual Azure response for debugging (avoiding sensitive word filters)
        logger.info(f"Azure DI receipt analysis result properties: {list(analysis_result.keys())}")
        logger.info(f"Azure DI receipt analysis result type: {type(analysis_result)}")
        
        # Navigate to the actual analysis results
        analyze_result = analysis_result.get('analyzeResult', {})
        logger.info(f"Receipt analyzeResult contents: {list(analyze_result.keys())}")
        
        # Check if we have table data
        if 'tables' in analyze_result and analyze_result['tables']:
            tables = analyze_result['tables']
            logger.info(f"Found {len(tables)} tables in Receipt document")
            for i, table in enumerate(tables):
                logger.info(f"Table {i}: {table.get('rowCount', 0)} rows, {table.get('columnCount', 0)} columns")
                if 'cells' in table:
                    logger.info(f"First few cells: {str(table['cells'][:5])}")
        else:
            logger.info(f"No tables found in Receipt document. analyzeResult keys: {list(analyze_result.keys())}")
        
        # Check if we have field-value pairs
        if 'keyValuePairs' in analyze_result and analyze_result['keyValuePairs']:
            logger.info(f"Found {len(analyze_result['keyValuePairs'])} field-value pairs")
        
        # Check if we have paragraphs/text
        if 'paragraphs' in analyze_result and analyze_result['paragraphs']:
            logger.info(f"Found {len(analyze_result['paragraphs'])} paragraphs")
            # Log a few paragraphs to see what text we're getting
            for i, para in enumerate(analyze_result['paragraphs'][:3]):
                content = para.get('content', '')[:100]
                logger.info(f"Receipt Paragraph {i}: {content}...")
        
        # Implement actual data extraction from Azure response
        employees = []
        
        # Try to extract employee data from tables
        if 'tables' in analyze_result and analyze_result['tables']:
            tables = analyze_result['tables']
            logger.info(f"Extracting employee data from {len(tables)} tables")
            
            for table_idx, table in enumerate(tables):
                employees_from_table = self._extract_employees_from_table(table, 'Receipt')
                employees.extend(employees_from_table)
                logger.info(f"Extracted {len(employees_from_table)} employees from table {table_idx}")
        
        # If no tables found or no data extracted, try paragraphs
        if not employees and 'paragraphs' in analyze_result and analyze_result['paragraphs']:
            logger.info("No table data found, attempting to extract from paragraphs")
            employees = self._extract_employees_from_paragraphs(analyze_result['paragraphs'], 'Receipt')
            logger.info(f"Extracted {len(employees)} employees from paragraphs")
        
        # If no data extracted, raise an error - no more fallback to mock data
        if not employees:
            logger.error("No employee data extracted from Receipt document - processing failed")
            raise ValueError("Failed to extract any employee data from Receipt document using Azure Document Intelligence")
        
        logger.info(f"Successfully extracted {len(employees)} employees from Receipt document using Azure DI")
        return employees
    



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
            logger.error("Azure Document Intelligence must be configured - no mock processing allowed")
            raise ValueError("Azure Document Intelligence configuration required - mock processing disabled")
    
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