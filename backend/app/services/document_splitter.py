"""
Document Splitter Service
Splits combined CAR and Receipt PDFs into individual employee documents
Uses PyMuPDF for PDF page extraction and merging
"""

import os
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import re

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

from .employee_merger import EmployeeDataMerger

# Configure logger
logger = logging.getLogger(__name__)


class DocumentSplitterError(Exception):
    """Base exception for document splitting errors"""
    pass


class DocumentSplitter:
    """
    Splits combined CAR and Receipt PDFs into individual employee documents
    Creates properly named files with employee-specific pages
    """
    
    def __init__(self, output_dir: str = None):
        if not fitz:
            raise DocumentSplitterError("PyMuPDF (fitz) is not installed. Please install with: pip install PyMuPDF")
        
        self.output_dir = Path(output_dir) if output_dir else Path("./split_documents")
        self.output_dir.mkdir(exist_ok=True, parents=True)
        
        # Initialize employee merger for data validation
        self.employee_merger = EmployeeDataMerger()
    
    def split_employee_documents(
        self,
        car_pdf_path: str,
        receipt_pdf_path: str,
        merged_employee_data: Dict[str, Any],
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Split CAR and Receipt PDFs into individual employee documents
        
        Args:
            car_pdf_path: Path to the CAR PDF file
            receipt_pdf_path: Path to the Receipt PDF file
            merged_employee_data: Employee data from merger service
            session_id: Optional session ID for organizing output files
            
        Returns:
            Dictionary with split results and file paths
        """
        logger.info(f"Starting document split for {len(merged_employee_data)} employees")
        
        try:
            # Create session-specific output directory
            if session_id:
                session_output_dir = self.output_dir / session_id
                session_output_dir.mkdir(exist_ok=True, parents=True)
            else:
                session_output_dir = self.output_dir / f"split_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                session_output_dir.mkdir(exist_ok=True, parents=True)
            
            # Open source PDFs
            car_doc = fitz.open(car_pdf_path)
            receipt_doc = fitz.open(receipt_pdf_path)
            
            split_results = {
                'success_count': 0,
                'error_count': 0,
                'output_directory': str(session_output_dir),
                'split_files': [],
                'errors': []
            }
            
            # Split documents for each employee
            for employee_key, employee_data in merged_employee_data.items():
                try:
                    result = self._create_employee_document(
                        employee_data,
                        car_doc,
                        receipt_doc,
                        session_output_dir
                    )
                    
                    if result['success']:
                        split_results['success_count'] += 1
                        split_results['split_files'].append(result)
                    else:
                        split_results['error_count'] += 1
                        split_results['errors'].append({
                            'employee': employee_data.get('employee_name', 'Unknown'),
                            'error': result['error']
                        })
                        
                except Exception as e:
                    logger.error(f"Failed to create document for {employee_data.get('employee_name', 'Unknown')}: {str(e)}")
                    split_results['error_count'] += 1
                    split_results['errors'].append({
                        'employee': employee_data.get('employee_name', 'Unknown'),
                        'error': str(e)
                    })
            
            # Close source documents
            car_doc.close()
            receipt_doc.close()
            
            logger.info(f"Document split completed: {split_results['success_count']} successful, {split_results['error_count']} errors")
            return split_results
            
        except Exception as e:
            logger.error(f"Document splitting failed: {str(e)}")
            raise DocumentSplitterError(f"Split operation failed: {str(e)}")
    
    def _create_employee_document(
        self,
        employee_data: Dict[str, Any],
        car_doc: fitz.Document,
        receipt_doc: fitz.Document,
        output_dir: Path
    ) -> Dict[str, Any]:
        """
        Create individual employee document by merging CAR and Receipt pages
        """
        try:
            employee_name = employee_data.get('employee_name', 'Unknown')
            employee_id = employee_data.get('employee_id', '000000')
            
            # Generate safe filename
            safe_filename = self._generate_safe_filename(employee_name, employee_id)
            output_path = output_dir / f"{safe_filename}.pdf"
            
            # Create new PDF document
            new_doc = fitz.open()
            
            pages_added = 0
            page_details = []
            
            # Add CAR pages if available
            car_pages = employee_data.get('car_page_range', [])
            if car_pages:
                for page_num in car_pages:
                    try:
                        # PyMuPDF uses 0-based indexing, but our page_ranges are 1-based
                        source_page = car_doc.load_page(page_num - 1)
                        new_doc.insert_pdf(car_doc, from_page=page_num - 1, to_page=page_num - 1)
                        pages_added += 1
                        page_details.append({
                            'source': 'CAR',
                            'original_page': page_num,
                            'new_page': pages_added
                        })
                    except Exception as e:
                        logger.warning(f"Failed to add CAR page {page_num} for {employee_name}: {str(e)}")
            
            # Add Receipt pages if available
            receipt_pages = employee_data.get('receipt_page_range', [])
            if receipt_pages:
                for page_num in receipt_pages:
                    try:
                        # PyMuPDF uses 0-based indexing, but our page_ranges are 1-based
                        source_page = receipt_doc.load_page(page_num - 1)
                        new_doc.insert_pdf(receipt_doc, from_page=page_num - 1, to_page=page_num - 1)
                        pages_added += 1
                        page_details.append({
                            'source': 'Receipt',
                            'original_page': page_num,
                            'new_page': pages_added
                        })
                    except Exception as e:
                        logger.warning(f"Failed to add Receipt page {page_num} for {employee_name}: {str(e)}")
            
            if pages_added == 0:
                new_doc.close()
                return {
                    'success': False,
                    'error': f'No pages found for employee {employee_name}'
                }
            
            # Save the new document
            new_doc.save(str(output_path))
            new_doc.close()
            
            # Calculate file size
            file_size = output_path.stat().st_size
            
            return {
                'success': True,
                'employee_name': employee_name,
                'employee_id': employee_id,
                'filename': safe_filename + '.pdf',
                'file_path': str(output_path),
                'file_size_bytes': file_size,
                'pages_added': pages_added,
                'page_details': page_details,
                'car_total': employee_data.get('car_total', 0.0),
                'receipt_total': employee_data.get('receipt_total', 0.0),
                'combined_total': employee_data.get('car_total', 0.0) + employee_data.get('receipt_total', 0.0)
            }
            
        except Exception as e:
            logger.error(f"Failed to create document for {employee_data.get('employee_name', 'Unknown')}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_safe_filename(self, employee_name: str, employee_id: str) -> str:
        """
        Generate safe filename from employee name and ID
        """
        # Clean employee name - remove spaces, special characters
        clean_name = re.sub(r'[^A-Za-z0-9]', '_', employee_name)
        clean_name = re.sub(r'_+', '_', clean_name)  # Replace multiple underscores with single
        clean_name = clean_name.strip('_')  # Remove leading/trailing underscores
        
        # Ensure employee_id is clean
        clean_id = re.sub(r'[^0-9]', '', str(employee_id))
        
        # Create filename: Name_ID format
        filename = f"{clean_name}_{clean_id}"
        
        # Truncate if too long (max 200 chars to leave room for .pdf extension)
        if len(filename) > 200:
            filename = filename[:200]
        
        return filename
    
    def get_split_summary(self, split_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate summary statistics for split operation
        """
        total_files = split_results['success_count']
        total_pages = sum(file_info.get('pages_added', 0) for file_info in split_results['split_files'] if isinstance(file_info, dict))
        total_size = sum(file_info.get('file_size_bytes', 0) for file_info in split_results['split_files'] if isinstance(file_info, dict))
        
        # Calculate totals by expense type
        car_total = sum(file_info.get('car_total', 0) for file_info in split_results['split_files'] if isinstance(file_info, dict))
        receipt_total = sum(file_info.get('receipt_total', 0) for file_info in split_results['split_files'] if isinstance(file_info, dict))
        
        return {
            'total_employees': total_files,
            'total_pages_split': total_pages,
            'total_file_size_mb': round(total_size / (1024 * 1024), 2),
            'total_car_amount': round(car_total, 2),
            'total_receipt_amount': round(receipt_total, 2),
            'combined_total_amount': round(car_total + receipt_total, 2),
            'success_rate': round((split_results['success_count'] / (split_results['success_count'] + split_results['error_count']) * 100), 2) if (split_results['success_count'] + split_results['error_count']) > 0 else 0,
            'output_directory': split_results['output_directory']
        }
    
    def validate_split_requirements(self, merged_employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate that employee data has required information for splitting
        """
        splittable_employees = []
        missing_data_employees = []
        
        for employee_key, employee_data in merged_employee_data.items():
            employee_name = employee_data.get('employee_name', 'Unknown')
            car_pages = employee_data.get('car_page_range', [])
            receipt_pages = employee_data.get('receipt_page_range', [])
            
            if car_pages or receipt_pages:
                splittable_employees.append({
                    'name': employee_name,
                    'car_pages': len(car_pages),
                    'receipt_pages': len(receipt_pages),
                    'total_pages': len(car_pages) + len(receipt_pages)
                })
            else:
                missing_data_employees.append({
                    'name': employee_name,
                    'issue': 'No page ranges found'
                })
        
        return {
            'splittable_count': len(splittable_employees),
            'missing_data_count': len(missing_data_employees),
            'splittable_employees': splittable_employees,
            'missing_data_employees': missing_data_employees,
            'ready_for_split': len(missing_data_employees) == 0
        }


# Factory function for easy instantiation
def create_document_splitter(output_dir: str = None) -> DocumentSplitter:
    """
    Factory function to create DocumentSplitter instance
    
    Args:
        output_dir: Optional custom output directory
        
    Returns:
        DocumentSplitter instance
    """
    return DocumentSplitter(output_dir=output_dir)