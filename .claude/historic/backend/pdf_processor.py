"""
Azure Document Intelligence integration for PDF processing
"""

import logging
import asyncio
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal, InvalidOperation
import re
from datetime import datetime

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import AzureError

from config import get_settings, FileType
from database import LogManager

logger = logging.getLogger(__name__)

class ProcessingError(Exception):
    """Custom exception for processing errors"""
    pass

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

class DocumentProcessor:
    """Azure Document Intelligence processor for PDFs"""
    
    def __init__(self):
        self.settings = get_settings()
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Azure Document Intelligence client"""
        if not self.settings.validate_azure_config():
            logger.warning("Azure Document Intelligence not configured - processing will be limited")
            return
        
        try:
            self.client = DocumentIntelligenceClient(
                endpoint=self.settings.DOC_INTELLIGENCE_ENDPOINT,
                credential=AzureKeyCredential(self.settings.DOC_INTELLIGENCE_KEY)
            )
            logger.info("Azure Document Intelligence client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Azure client: {e}")
            raise ProcessingError(f"Azure client initialization failed: {e}")
    
    async def process_car_pdf(
        self,
        file_path: Path,
        session_id: str
    ) -> Dict[str, Any]:
        """Process Corporate American Express (CAR) PDF"""
        logger.info(f"Processing CAR PDF: {file_path}")
        
        await LogManager.log_event(
            session_id=session_id,
            level="INFO",
            message=f"Starting CAR PDF processing: {file_path.name}",
            component="pdf_processor"
        )
        
        try:
            # Analyze document with Azure
            analysis_result = await self._analyze_document(file_path, "prebuilt-invoice")
            
            if not analysis_result:
                raise ProcessingError("Failed to analyze CAR document")
            
            # Extract employee expenses
            employees = self._extract_car_data(analysis_result)
            
            await LogManager.log_event(
                session_id=session_id,
                level="INFO",
                message=f"Extracted {len(employees)} employees from CAR PDF",
                component="pdf_processor",
                details={"employee_count": len(employees)}
            )
            
            return {
                "file_type": FileType.CAR,
                "employees": employees,
                "metadata": {
                    "total_employees": len(employees),
                    "processing_confidence": self._calculate_confidence(analysis_result),
                    "processed_at": datetime.utcnow().isoformat()
                }
            }
            
        except Exception as e:
            await LogManager.log_event(
                session_id=session_id,
                level="ERROR",
                message=f"CAR PDF processing failed: {str(e)}",
                component="pdf_processor",
                details={"error": str(e), "file_path": str(file_path)}
            )
            raise ProcessingError(f"CAR PDF processing failed: {e}")
    
    async def process_receipt_pdf(
        self,
        file_path: Path,
        session_id: str
    ) -> Dict[str, Any]:
        """Process Receipt PDF"""
        logger.info(f"Processing Receipt PDF: {file_path}")
        
        await LogManager.log_event(
            session_id=session_id,
            level="INFO",
            message=f"Starting Receipt PDF processing: {file_path.name}",
            component="pdf_processor"
        )
        
        try:
            # Analyze document with Azure
            analysis_result = await self._analyze_document(file_path, "prebuilt-receipt")
            
            if not analysis_result:
                raise ProcessingError("Failed to analyze Receipt document")
            
            # Extract employee expenses
            employees = self._extract_receipt_data(analysis_result)
            
            await LogManager.log_event(
                session_id=session_id,
                level="INFO",
                message=f"Extracted {len(employees)} employees from Receipt PDF",
                component="pdf_processor",
                details={"employee_count": len(employees)}
            )
            
            return {
                "file_type": FileType.RECEIPT,
                "employees": employees,
                "metadata": {
                    "total_employees": len(employees),
                    "processing_confidence": self._calculate_confidence(analysis_result),
                    "processed_at": datetime.utcnow().isoformat()
                }
            }
            
        except Exception as e:
            await LogManager.log_event(
                session_id=session_id,
                level="ERROR",
                message=f"Receipt PDF processing failed: {str(e)}",
                component="pdf_processor",
                details={"error": str(e), "file_path": str(file_path)}
            )
            raise ProcessingError(f"Receipt PDF processing failed: {e}")
    
    async def _analyze_document(
        self,
        file_path: Path,
        model_id: str
    ) -> Optional[Any]:
        """Analyze document using Azure Document Intelligence"""
        if not self.client:
            # Fallback to mock processing for development
            return await self._mock_document_analysis(file_path, model_id)
        
        try:
            with open(file_path, "rb") as document:
                poller = self.client.begin_analyze_document(
                    model_id=model_id,
                    analyze_request=AnalyzeDocumentRequest(bytes_source=document.read())
                )
                
                # Wait for analysis to complete
                result = await asyncio.get_event_loop().run_in_executor(
                    None, poller.result
                )
                
                return result
                
        except AzureError as e:
            logger.error(f"Azure Document Intelligence error: {e}")
            raise ProcessingError(f"Azure processing failed: {e}")
        except Exception as e:
            logger.error(f"Document analysis error: {e}")
            raise ProcessingError(f"Document analysis failed: {e}")
    
    async def _mock_document_analysis(
        self,
        file_path: Path,
        model_id: str
    ) -> Dict[str, Any]:
        """Mock document analysis for development/testing"""
        logger.warning(f"Using mock analysis for {file_path} (Azure not configured)")
        
        # Simulate processing delay
        await asyncio.sleep(1)
        
        # Return mock data based on file type
        if "car" in file_path.name.lower():
            return {
                "documents": [{
                    "fields": {
                        "Items": {
                            "value": [
                                {
                                    "properties": {
                                        "Description": {"value": "John Smith - Travel Expenses"},
                                        "Amount": {"value": 1250.50},
                                        "CardNumber": {"value": "****1234"}
                                    }
                                },
                                {
                                    "properties": {
                                        "Description": {"value": "Jane Doe - Meal Expenses"},
                                        "Amount": {"value": 789.25},
                                        "CardNumber": {"value": "****5678"}
                                    }
                                }
                            ]
                        }
                    }
                }]
            }
        else:
            return {
                "documents": [{
                    "fields": {
                        "Items": {
                            "value": [
                                {
                                    "properties": {
                                        "Description": {"value": "John Smith Receipt Total"},
                                        "Amount": {"value": 1248.75}
                                    }
                                },
                                {
                                    "properties": {
                                        "Description": {"value": "Jane Doe Receipt Total"},
                                        "Amount": {"value": 792.10}
                                    }
                                }
                            ]
                        }
                    }
                }]
            }
    
    def _extract_car_data(self, analysis_result: Any) -> List[Dict[str, Any]]:
        """Extract employee data from CAR analysis results"""
        employees = []
        
        try:
            if not analysis_result.get("documents"):
                return employees
            
            document = analysis_result["documents"][0]
            items = document.get("fields", {}).get("Items", {}).get("value", [])
            
            for item in items:
                try:
                    properties = item.get("properties", {})
                    
                    # Extract employee name from description
                    description = properties.get("Description", {}).get("value", "")
                    employee_name = self._extract_employee_name(description)
                    
                    if not employee_name:
                        continue
                    
                    # Extract amount
                    amount = properties.get("Amount", {}).get("value", 0)
                    if isinstance(amount, str):
                        amount = self._parse_currency_amount(amount)
                    
                    # Extract card number
                    card_number = properties.get("CardNumber", {}).get("value", "")
                    
                    employee_data = {
                        "employee_name": employee_name,
                        "car_total": float(amount),
                        "card_number": self._clean_card_number(card_number),
                        "raw_description": description,
                        "confidence_score": properties.get("confidence", 0.8)
                    }
                    
                    employees.append(employee_data)
                    
                except Exception as e:
                    logger.warning(f"Error processing CAR item: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error extracting CAR data: {e}")
            raise ProcessingError(f"CAR data extraction failed: {e}")
        
        return employees
    
    def _extract_receipt_data(self, analysis_result: Any) -> List[Dict[str, Any]]:
        """Extract employee data from Receipt analysis results"""
        employees = []
        
        try:
            if not analysis_result.get("documents"):
                return employees
            
            document = analysis_result["documents"][0]
            items = document.get("fields", {}).get("Items", {}).get("value", [])
            
            for item in items:
                try:
                    properties = item.get("properties", {})
                    
                    # Extract employee name from description
                    description = properties.get("Description", {}).get("value", "")
                    employee_name = self._extract_employee_name(description)
                    
                    if not employee_name:
                        continue
                    
                    # Extract amount
                    amount = properties.get("Amount", {}).get("value", 0)
                    if isinstance(amount, str):
                        amount = self._parse_currency_amount(amount)
                    
                    employee_data = {
                        "employee_name": employee_name,
                        "receipt_total": float(amount),
                        "raw_description": description,
                        "confidence_score": properties.get("confidence", 0.8)
                    }
                    
                    employees.append(employee_data)
                    
                except Exception as e:
                    logger.warning(f"Error processing Receipt item: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error extracting Receipt data: {e}")
            raise ProcessingError(f"Receipt data extraction failed: {e}")
        
        return employees
    
    def _extract_employee_name(self, description: str) -> Optional[str]:
        """Extract employee name from description text"""
        if not description:
            return None
        
        # Common patterns for employee names in expense reports
        patterns = [
            r"^([A-Za-z]+\s+[A-Za-z]+)",  # First Last at start
            r"([A-Za-z]+,\s*[A-Za-z]+)",  # Last, First
            r"Employee:\s*([A-Za-z\s]+)",  # Employee: Name
            r"Name:\s*([A-Za-z\s]+)",     # Name: Name
        ]
        
        for pattern in patterns:
            match = re.search(pattern, description.strip())
            if match:
                name = match.group(1).strip()
                # Clean up name (remove extra spaces, etc.)
                name = re.sub(r'\s+', ' ', name)
                if len(name.split()) >= 2:  # Ensure first and last name
                    return name
        
        return None
    
    def _clean_card_number(self, card_number: str) -> str:
        """Clean and format card number"""
        if not card_number:
            return ""
        
        # Remove non-digit characters except *
        cleaned = re.sub(r'[^\d*]', '', card_number)
        
        # Ensure it's in ****1234 format
        if cleaned and not cleaned.startswith('*'):
            # If it's a full number, mask it
            if len(cleaned) >= 4:
                cleaned = '****' + cleaned[-4:]
        
        return cleaned
    
    def _parse_currency_amount(self, amount_str: str) -> float:
        """Parse currency amount from string"""
        if not amount_str:
            return 0.0
        
        try:
            # Remove currency symbols and commas
            cleaned = re.sub(r'[$,\s]', '', str(amount_str))
            return float(cleaned)
        except (ValueError, InvalidOperation):
            logger.warning(f"Could not parse amount: {amount_str}")
            return 0.0
    
    def _calculate_confidence(self, analysis_result: Any) -> float:
        """Calculate overall confidence score for the analysis"""
        if not analysis_result or not analysis_result.get("documents"):
            return 0.0
        
        confidences = []
        document = analysis_result["documents"][0]
        items = document.get("fields", {}).get("Items", {}).get("value", [])
        
        for item in items:
            properties = item.get("properties", {})
            for field in properties.values():
                if isinstance(field, dict) and "confidence" in field:
                    confidences.append(field["confidence"])
        
        if not confidences:
            return 0.8  # Default confidence
        
        return sum(confidences) / len(confidences)
    
    def validate_processing_results(
        self,
        car_data: Optional[Dict[str, Any]],
        receipt_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate and cross-reference processing results"""
        validation_results = {
            "valid": True,
            "warnings": [],
            "errors": [],
            "employee_matches": []
        }
        
        if not car_data and not receipt_data:
            validation_results["valid"] = False
            validation_results["errors"].append("No data extracted from either file")
            return validation_results
        
        # Cross-reference employees between CAR and Receipt data
        if car_data and receipt_data:
            car_employees = {emp["employee_name"]: emp for emp in car_data.get("employees", [])}
            receipt_employees = {emp["employee_name"]: emp for emp in receipt_data.get("employees", [])}
            
            # Find matches and mismatches
            all_employees = set(car_employees.keys()) | set(receipt_employees.keys())
            
            for emp_name in all_employees:
                car_emp = car_employees.get(emp_name)
                receipt_emp = receipt_employees.get(emp_name)
                
                match_info = {
                    "employee_name": emp_name,
                    "in_car": bool(car_emp),
                    "in_receipt": bool(receipt_emp),
                    "car_total": car_emp.get("car_total", 0.0) if car_emp else 0.0,
                    "receipt_total": receipt_emp.get("receipt_total", 0.0) if receipt_emp else 0.0,
                    "difference": 0.0,
                    "issues": []
                }
                
                if car_emp and receipt_emp:
                    difference = abs(match_info["car_total"] - match_info["receipt_total"])
                    match_info["difference"] = difference
                    
                    # Flag significant differences
                    if difference > 10.0:  # $10 threshold
                        match_info["issues"].append(f"Large difference: ${difference:.2f}")
                        validation_results["warnings"].append(
                            f"{emp_name}: Large difference between CAR (${match_info['car_total']:.2f}) "
                            f"and Receipt (${match_info['receipt_total']:.2f})"
                        )
                
                elif car_emp and not receipt_emp:
                    match_info["issues"].append("Missing receipt data")
                    validation_results["warnings"].append(f"{emp_name}: CAR data found but no receipt data")
                
                elif receipt_emp and not car_emp:
                    match_info["issues"].append("Missing CAR data")
                    validation_results["warnings"].append(f"{emp_name}: Receipt data found but no CAR data")
                
                validation_results["employee_matches"].append(match_info)
        
        # Overall validation
        if validation_results["errors"]:
            validation_results["valid"] = False
        
        return validation_results

# Global processor instance
document_processor = DocumentProcessor()

# Utility functions

def calculate_file_checksum(file_path: Path) -> str:
    """Calculate MD5 checksum for file"""
    hash_md5 = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception as e:
        logger.error(f"Error calculating checksum for {file_path}: {e}")
        return ""

async def detect_file_changes(
    current_checksum: str,
    previous_checksum: Optional[str]
) -> Dict[str, Any]:
    """Detect if file has changed since last processing"""
    if not previous_checksum:
        return {
            "changed": True,
            "change_type": "new_file",
            "message": "New file detected"
        }
    
    if current_checksum != previous_checksum:
        return {
            "changed": True,
            "change_type": "modified_file",
            "message": "File has been modified since last processing"
        }
    
    return {
        "changed": False,
        "change_type": "unchanged",
        "message": "File unchanged since last processing"
    }

def estimate_processing_time(file_size_mb: float) -> int:
    """Estimate processing time in seconds based on file size"""
    # Base time: 30 seconds + 5 seconds per MB
    base_time = 30
    size_factor = max(1, file_size_mb) * 5
    return int(base_time + size_factor)