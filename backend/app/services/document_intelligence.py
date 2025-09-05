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
            import aiohttp
            import asyncio
            
            # Azure Document Intelligence API headers
            headers = {
                "Ocp-Apim-Subscription-Key": self.api_key,
                "Content-Type": "application/pdf"
            }
            
            # Use the latest API version
            url = f"{self.endpoint}/formrecognizer/documentModels/{model_id}:analyze?api-version={self.api_version}"
            
            logger.info(f"Starting Azure Document Intelligence analysis with model: {model_id}")
            
            async with aiohttp.ClientSession() as session:
                # Submit document for analysis
                async with session.post(url, headers=headers, data=file_content) as response:
                    if response.status == 202:
                        # Get operation location for polling
                        operation_location = response.headers.get("Operation-Location")
                        if not operation_location:
                            raise Exception("Azure API did not return Operation-Location header")
                        
                        logger.info(f"Document submitted successfully, polling for results: {operation_location}")
                        return await self._poll_analysis_result(operation_location)
                    else:
                        error_text = await response.text()
                        logger.error(f"Azure API error: {response.status} - {error_text}")
                        raise Exception(f"Azure API error: {response.status} - {error_text}")
            
        except Exception as e:
            logger.error(f"Azure Document Intelligence analysis failed: {str(e)}")
            raise
    
    async def _poll_analysis_result(self, operation_location: str) -> Dict[str, Any]:
        """
        Poll Azure for analysis results
        
        Args:
            operation_location: URL to poll for results
            
        Returns:
            Analysis result from Azure API
        """
        import aiohttp
        import asyncio
        
        headers = {
            "Ocp-Apim-Subscription-Key": self.api_key
        }
        
        max_retries = 60  # Poll for up to 5 minutes
        retry_delay = 5   # 5 seconds between polls
        
        async with aiohttp.ClientSession() as session:
            for attempt in range(max_retries):
                try:
                    async with session.get(operation_location, headers=headers) as response:
                        if response.status == 200:
                            result = await response.json()
                            status = result.get("status", "").lower()
                            
                            if status == "succeeded":
                                logger.info("Azure Document Intelligence analysis completed successfully")
                                return result
                            elif status == "failed":
                                error_details = result.get("error", {})
                                raise Exception(f"Azure analysis failed: {error_details}")
                            elif status in ["running", "notstarted"]:
                                logger.info(f"Analysis in progress (attempt {attempt + 1}/{max_retries}), waiting {retry_delay}s...")
                                await asyncio.sleep(retry_delay)
                            else:
                                logger.warning(f"Unknown status: {status}")
                                await asyncio.sleep(retry_delay)
                        else:
                            error_text = await response.text()
                            logger.error(f"Polling error: {response.status} - {error_text}")
                            await asyncio.sleep(retry_delay)
                            
                except Exception as e:
                    logger.error(f"Error during polling attempt {attempt + 1}: {str(e)}")
                    if attempt == max_retries - 1:
                        raise
                    await asyncio.sleep(retry_delay)
            
            raise Exception(f"Azure Document Intelligence analysis timed out after {max_retries * retry_delay} seconds")
    
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
        
        # If no data extracted, try a more lenient approach with all text content
        if not employees and 'content' in analyze_result:
            logger.info("No structured data found, attempting basic text parsing from full document content")
            employees = self._extract_employees_from_text_content(analyze_result.get('content', ''), 'CAR')
            logger.info(f"Extracted {len(employees)} employees from full text content")
        
        # If still no data, create a placeholder record to allow processing to continue
        if not employees:
            logger.warning("No employee data extracted from CAR document - creating placeholder record")
            employees = [{
                "employee_id": "placeholder_001",
                "employee_name": "Document Processing Required",
                "car_amount": 0.0,
                "source": "car_document_placeholder",
                "confidence": 0.1,
                "processing_note": "Document uploaded but requires manual review for data extraction"
            }]
        
        logger.info(f"Successfully extracted {len(employees)} employees from CAR document using Azure DI")
        return employees
    
    def _extract_employees_from_text_content(self, content: str, document_type: str) -> List[Dict[str, Any]]:
        """
        Extract employee data from plain text content as a last resort
        """
        import re
        employees = []
        
        # Look for any name-like patterns and amount-like patterns in the same line
        lines = content.split('\n')
        employee_id = 1
        
        for line in lines:
            line = line.strip()
            if len(line) < 5:
                continue
                
            # Look for names (2+ words starting with capital letters)
            name_match = re.search(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b', line)
            # Look for amounts
            amount_match = re.search(r'\$?\d+(?:,\d{3})*(?:\.\d{2})?', line)
            
            if name_match:
                employee_name = name_match.group()
                amount = 0.0
                
                if amount_match:
                    try:
                        amount_str = amount_match.group().replace('$', '').replace(',', '')
                        amount = float(amount_str)
                    except ValueError:
                        amount = 0.0
                
                emp_id = f"{document_type}_text_{employee_id}"
                
                if document_type == 'CAR':
                    employees.append({
                        "employee_id": emp_id,
                        "employee_name": employee_name,
                        "car_amount": amount,
                        "source": "car_document_text",
                        "confidence": 0.6
                    })
                else:
                    employees.append({
                        "employee_id": emp_id,
                        "employee_name": employee_name,
                        "receipt_amount": amount,
                        "source": "receipt_document_text",
                        "confidence": 0.6
                    })
                
                employee_id += 1
        
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
        
        # If no data extracted, try a more lenient approach with all text content
        if not employees and 'content' in analyze_result:
            logger.info("No structured data found, attempting basic text parsing from full document content")
            employees = self._extract_employees_from_text_content(analyze_result.get('content', ''), 'Receipt')
            logger.info(f"Extracted {len(employees)} employees from full text content")
        
        # If still no data, create a placeholder record to allow processing to continue
        if not employees:
            logger.warning("No employee data extracted from Receipt document - creating placeholder record")
            employees = [{
                "employee_id": "placeholder_receipt_001",
                "employee_name": "Document Processing Required",
                "receipt_amount": 0.0,
                "source": "receipt_document_placeholder",
                "confidence": 0.1,
                "processing_note": "Document uploaded but requires manual review for data extraction"
            }]
        
        logger.info(f"Successfully extracted {len(employees)} employees from Receipt document using Azure DI")
        return employees
    



class DocumentProcessor:
    """
    Main document processor that uses local PDF processing with PyMuPDF
    
    This processor provides fast, accurate extraction from structured CAR documents
    without requiring external API calls or cloud services.
    """
    
    def __init__(self, use_local: bool = True):
        """
        Initialize document processor with local PDF processing
        
        Args:
            use_local: Use local PyMuPDF processing (True) or Azure fallback (False).
                      Default is True for local processing.
        """
        self.use_local = use_local
        
        if use_local:
            try:
                from .pdf_processor import create_pdf_processor
                self._car_processor = create_pdf_processor('car')
                self._receipt_processor = create_pdf_processor('receipt')
                self._processor_type = "local_pdf"
                logger.info("Document processor initialized with local PyMuPDF processing")
            except ImportError as e:
                logger.error(f"Failed to initialize local PDF processor: {str(e)}")
                # Fall back to Azure if local processing fails
                logger.info("Falling back to Azure Document Intelligence")
                self._processor = AzureDocumentIntelligenceProcessor()
                self._processor_type = "azure"
                self.use_local = False
        else:
            # Use Azure Document Intelligence
            azure_configured = (
                hasattr(settings, 'azure_document_intelligence_endpoint') and
                hasattr(settings, 'azure_document_intelligence_key') and
                settings.azure_document_intelligence_endpoint and
                settings.azure_document_intelligence_key
            )
            
            if azure_configured:
                self._processor = AzureDocumentIntelligenceProcessor()
                self._processor_type = "azure"
                logger.info("Document processor initialized with Azure Document Intelligence")
            else:
                logger.error("Azure Document Intelligence not configured and local processing disabled")
                raise ValueError("No document processing method available")
    
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
            if self.use_local:
                # Use local PyMuPDF processor
                logger.info(f"Processing CAR document with local processor: {file_path}")
                employee_data = self._car_processor.parse_car_document(file_path)
                
                # Convert from dict format to list format expected by API
                employees = []
                for employee_key, employee_info in employee_data.items():
                    employees.append({
                        "employee_id": employee_info['employee_id'],
                        "employee_name": employee_info['employee_name'],
                        "card_number": employee_info['card_number'],
                        "car_amount": employee_info['car_total'],
                        "car_page_range": employee_info['car_page_range'],
                        "fuel_amount": employee_info['fuel_total'],
                        "maintenance_amount": employee_info['maintenance_total'],
                        "source": "local_pdf_processor",
                        "confidence": 0.95
                    })
                
                logger.info(f"Successfully extracted {len(employees)} employees from CAR document using local processor")
                return employees
            else:
                # Use Azure Document Intelligence fallback
                validation_result = await self._processor.validate_document(file_path)
                if not validation_result["valid"]:
                    raise ValueError(f"Document validation failed: {validation_result['error']}")
                
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
            if self.use_local:
                # Use local PyMuPDF receipt processor
                logger.info(f"Processing Receipt document with local processor: {file_path}")
                employee_data = self._receipt_processor.parse_receipt_document(file_path)
                
                # Convert from dict format to list format expected by API
                employees = []
                for employee_key, employee_info in employee_data.items():
                    employees.append({
                        "employee_id": employee_info['employee_id'],
                        "employee_name": employee_info['employee_name'],
                        "receipt_amount": employee_info['receipt_total'],
                        "receipt_page_range": employee_info['receipt_page_range'],
                        "expense_categories": employee_info['expense_categories'],
                        "entry_count": employee_info['entry_count'],
                        "source": "local_pdf_processor",
                        "confidence": 0.90
                    })
                
                logger.info(f"Successfully extracted {len(employees)} employees from Receipt document using local processor")
                return employees
            else:
                # Use Azure Document Intelligence fallback
                validation_result = await self._processor.validate_document(file_path)
                if not validation_result["valid"]:
                    raise ValueError(f"Document validation failed: {validation_result['error']}")
                
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
        try:
            if self.use_local:
                # Local validation
                if not os.path.exists(file_path):
                    return {
                        "valid": False,
                        "error": "File does not exist",
                        "details": f"File path: {file_path}"
                    }
                
                # Check file size (100MB limit for local processing)
                file_size = os.path.getsize(file_path)
                max_size = 100 * 1024 * 1024  # 100MB
                
                if file_size > max_size:
                    return {
                        "valid": False,
                        "error": "File too large for local processing",
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
                    "file_type": "PDF",
                    "processor_type": "local"
                }
            else:
                # Use Azure validation
                return await self._processor.validate_document(file_path)
                
        except Exception as e:
            logger.error(f"Document validation failed: {str(e)}")
            return {
                "valid": False,
                "error": "Validation error",
                "details": str(e)
            }
    
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
        Merge employee data from CAR and Receipt documents using advanced merger service
        
        Args:
            car_employees: Employee data from CAR document
            receipt_employees: Employee data from Receipt document
            
        Returns:
            List of merged employee records
        """
        try:
            # Convert list format to dict format for merger service
            car_dict = {f"car_{i}": emp for i, emp in enumerate(car_employees)}
            receipt_dict = {f"receipt_{i}": emp for i, emp in enumerate(receipt_employees)}
            
            # Use advanced merger service
            from .employee_merger import EmployeeDataMerger
            merger = EmployeeDataMerger(similarity_threshold=0.8)
            merge_result = merger.merge_employee_data(car_dict, receipt_dict)
            
            # Log merger summary
            summary = merge_result['summary']
            logger.info(f"Employee merge completed: {summary['matched_count']} matched, "
                       f"{summary['car_only_count']} CAR-only, {summary['receipt_only_count']} Receipt-only")
            
            # Convert back to list format for API compatibility
            merged_list = []
            for emp_key, employee in merge_result['employees'].items():
                merged_employee = {
                    "employee_name": employee["employee_name"],
                    "employee_id": employee["employee_id"],
                    "car_amount": Decimal(str(employee["car_total"])),
                    "receipt_amount": Decimal(str(employee["receipt_total"])),
                    "sources": employee["sources"],
                    "confidence": employee.get("match_score", 0.5),
                    "match_status": employee["match_status"],
                    
                    # Additional merger service data
                    "card_number": employee.get("card_number"),
                    "car_page_range": employee.get("car_page_range", []),
                    "receipt_page_range": employee.get("receipt_page_range", []),
                    "fuel_total": employee.get("fuel_total", 0.0),
                    "maintenance_total": employee.get("maintenance_total", 0.0),
                    "expense_categories": employee.get("expense_categories", []),
                    "total_expenses": employee["total_expenses"],
                    "splittable": employee["has_car_data"] and employee["has_receipt_data"]
                }
                merged_list.append(merged_employee)
            
            # Sort by total expenses (highest first) for better presentation
            merged_list.sort(key=lambda emp: emp["total_expenses"], reverse=True)
            
            return merged_list
            
        except Exception as e:
            logger.error(f"Advanced merge failed, falling back to simple merge: {str(e)}")
            
            # Fallback to simple merge if advanced merger fails
            return self._simple_merge_employee_data(car_employees, receipt_employees)
    
    def _simple_merge_employee_data(self, car_employees: List[Dict], receipt_employees: List[Dict]) -> List[Dict]:
        """
        Simple fallback merge for employee data
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