"""
PDF Processing Services
Local PDF text extraction and employee data parsing using PyMuPDF
Replaces Azure Document Intelligence for structured documents
"""

import re
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

# Configure logger
logger = logging.getLogger(__name__)


class PDFProcessorError(Exception):
    """Base exception for PDF processing errors"""
    pass


class CARProcessor:
    """
    Processes Cardholder Activity Report (CAR) PDFs
    Extracts employee data with page range tracking
    """
    
    def __init__(self):
        if not fitz:
            raise PDFProcessorError("PyMuPDF (fitz) is not installed. Please install with: pip install PyMuPDF")
        
        # Regex patterns for CAR document parsing
        # Updated pattern to match actual document structure
        self.employee_header_pattern = re.compile(
            r'Employee ID:\s*(\d{6})\s*([A-Z]+(?:[A-Z]+)?)\s*(556735XXXXXX\d{4})',
            re.MULTILINE
        )
        
        self.totals_marker_pattern = re.compile(
            r'Totals For:\s*(556735XXXXXX\d{4})',
            re.MULTILINE
        )
        
        self.transaction_totals_pattern = re.compile(
            r'Transaction Totals:\s*\$?([\d,]+\.\d{2})',
            re.MULTILINE
        )
        
        self.fuel_maintenance_pattern = re.compile(
            r'(Fuel|Maintenance)\s+([\d,]+\.\d{2})',
            re.MULTILINE
        )
    
    def parse_car_document(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract all employees from CAR document with page ranges
        
        Args:
            pdf_path: Path to the CAR PDF file
            
        Returns:
            Dictionary of employee data keyed by normalized employee name
        """
        logger.info(f"Processing CAR document: {pdf_path}")
        
        try:
            doc = fitz.open(pdf_path)
            full_text = ""
            page_text_mapping = {}
            
            # Extract text from all pages
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                page_text = page.get_text()
                page_text_mapping[page_num + 1] = page_text  # 1-indexed pages
                full_text += f"\n--- PAGE {page_num + 1} ---\n" + page_text
            
            doc.close()
            
            # Find employee sections
            employee_sections = self._extract_employee_sections(full_text, page_text_mapping)
            
            # Parse each employee section
            employee_data = {}
            for section in employee_sections:
                parsed_employee = self._parse_employee_section(section)
                if parsed_employee:
                    employee_key = parsed_employee['employee_name'].replace(' ', '').upper()
                    employee_data[employee_key] = parsed_employee
            
            logger.info(f"Successfully extracted {len(employee_data)} employees from CAR document")
            return employee_data
            
        except Exception as e:
            logger.error(f"Failed to process CAR document {pdf_path}: {str(e)}")
            raise PDFProcessorError(f"CAR processing failed: {str(e)}")
    
    def _extract_employee_sections(self, full_text: str, page_text_mapping: Dict[int, str]) -> List[Dict[str, Any]]:
        """
        Split full document text into individual employee sections
        Track page ranges for each employee
        """
        sections = []
        
        # Find all employee headers
        employee_matches = list(self.employee_header_pattern.finditer(full_text))
        
        # Find all totals markers
        totals_matches = list(self.totals_marker_pattern.finditer(full_text))
        
        logger.debug(f"Found {len(employee_matches)} employee headers and {len(totals_matches)} totals markers")
        
        for i, emp_match in enumerate(employee_matches):
            start_pos = emp_match.start()
            employee_id = emp_match.group(1)
            employee_name = emp_match.group(2)
            card_number = emp_match.group(3)
            
            # Find corresponding totals marker
            totals_match = None
            for tot_match in totals_matches:
                if tot_match.group(1) == card_number and tot_match.start() > start_pos:
                    totals_match = tot_match
                    break
            
            if totals_match:
                end_pos = totals_match.end()
            else:
                # If no totals found, use start of next employee or end of document
                if i + 1 < len(employee_matches):
                    end_pos = employee_matches[i + 1].start()
                else:
                    end_pos = len(full_text)
            
            # Extract section text
            section_text = full_text[start_pos:end_pos]
            
            # Determine page range
            page_range = self._determine_page_range(start_pos, end_pos, full_text, page_text_mapping)
            
            sections.append({
                'card_number': card_number,
                'employee_name': employee_name,
                'employee_id': employee_id,
                'section_text': section_text,
                'page_range': page_range
            })
        
        return sections
    
    def _determine_page_range(self, start_pos: int, end_pos: int, full_text: str, page_text_mapping: Dict[int, str]) -> List[int]:
        """
        Determine which pages contain the employee section
        """
        pages_in_section = []
        text_so_far = 0
        
        for page_num in sorted(page_text_mapping.keys()):
            page_text = page_text_mapping[page_num]
            page_start = text_so_far + full_text[text_so_far:].find(f"--- PAGE {page_num} ---")
            page_end = page_start + len(page_text) + 20  # Account for page marker
            
            # Check if this page overlaps with the section
            if not (end_pos <= page_start or start_pos >= page_end):
                pages_in_section.append(page_num)
            
            text_so_far = page_end
        
        return pages_in_section
    
    def _parse_employee_section(self, section: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse individual employee section to extract data
        """
        try:
            section_text = section['section_text']
            
            # Extract transaction totals
            car_total = 0.0
            fuel_total = 0.0
            maintenance_total = 0.0
            
            # Find all transaction totals in the section
            transaction_matches = self.transaction_totals_pattern.findall(section_text)
            if transaction_matches:
                # Sum all transaction totals (last one is usually the final total)
                for amount_str in transaction_matches:
                    try:
                        amount = float(amount_str.replace(',', ''))
                        car_total += amount
                    except ValueError:
                        continue
            
            # Extract fuel and maintenance totals
            fuel_maintenance_matches = self.fuel_maintenance_pattern.findall(section_text)
            for category, amount_str in fuel_maintenance_matches:
                try:
                    amount = float(amount_str.replace(',', ''))
                    if category.lower() == 'fuel':
                        fuel_total = amount
                    elif category.lower() == 'maintenance':
                        maintenance_total = amount
                except ValueError:
                    continue
            
            # Clean up employee name (split concatenated first/last names)
            raw_name = section['employee_name']
            cleaned_name = self._clean_employee_name(raw_name)
            
            return {
                'employee_id': section['employee_id'],
                'employee_name': cleaned_name,
                'card_number': section['card_number'],
                'car_total': round(car_total, 2),
                'car_page_range': section['page_range'],
                'fuel_total': round(fuel_total, 2),
                'maintenance_total': round(maintenance_total, 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to parse employee section: {str(e)}")
            return None
    
    def _clean_employee_name(self, raw_name: str) -> str:
        """
        Clean and format employee name
        Split concatenated names like 'WILLIAMBURT' -> 'WILLIAM BURT'
        """
        # Simple heuristic: if name is all caps and longer than typical first name,
        # try to split it intelligently
        if raw_name.isupper() and len(raw_name) > 10:
            # This is a simplified approach - in production you might want
            # a more sophisticated name parsing algorithm
            # For now, we'll return the raw name and let manual processing handle it
            return raw_name
        
        return raw_name


class ReceiptProcessor:
    """
    Processes Receipt PDFs containing individual employee expense entries
    Extracts employee data with transaction details and page range tracking
    """
    
    def __init__(self):
        if not fitz:
            raise PDFProcessorError("PyMuPDF (fitz) is not installed. Please install with: pip install PyMuPDF")
        
        # Regex patterns for Receipt document parsing
        # Pattern to match employee name (Aaron Cortez format)
        self.employee_name_pattern = re.compile(
            r'^([A-Z][a-z]+\s+[A-Z][a-z]+)$',
            re.MULTILINE
        )
        
        # Pattern to match Employee ID on separate line
        self.employee_id_pattern = re.compile(
            r'Employee ID:\s*(\d+)',
            re.MULTILINE
        )
        
        # Pattern to match standalone amount (line with just digits and optional decimal)
        self.amount_line_pattern = re.compile(
            r'^([\d,]+\.?\d*)$',
            re.MULTILINE
        )
        
        # Pattern to extract expense category
        self.expense_category_pattern = re.compile(
            r'(General Expense|Meals & Entertainment|Maintenance|Fuel|Travel|Office Supplies)',
            re.MULTILINE
        )
    
    def parse_receipt_document(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract all employees from Receipt document with page ranges
        
        Args:
            pdf_path: Path to the Receipt PDF file
            
        Returns:
            Dictionary of employee data keyed by normalized employee name
        """
        logger.info(f"Processing Receipt document: {pdf_path}")
        
        try:
            doc = fitz.open(pdf_path)
            full_text = ""
            page_text_mapping = {}
            
            # Extract text from all pages
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                page_text = page.get_text()
                page_text_mapping[page_num + 1] = page_text  # 1-indexed pages
                full_text += f"\n--- PAGE {page_num + 1} ---\n" + page_text
            
            doc.close()
            
            # Extract individual receipt entries
            receipt_entries = self._extract_receipt_entries(full_text, page_text_mapping)
            
            # Aggregate employee data (sum amounts per employee)
            employee_data = self._aggregate_employee_receipts(receipt_entries)
            
            logger.info(f"Successfully extracted {len(employee_data)} employees from Receipt document")
            return employee_data
            
        except Exception as e:
            logger.error(f"Failed to process Receipt document {pdf_path}: {str(e)}")
            raise PDFProcessorError(f"Receipt processing failed: {str(e)}")
    
    def _extract_receipt_entries(self, full_text: str, page_text_mapping: Dict[int, str]) -> List[Dict[str, Any]]:
        """
        Extract individual receipt entries from the document text (optimized page-by-page processing)
        """
        entries = []
        
        # Process each page individually for better performance
        for page_num, page_text in page_text_mapping.items():
            try:
                # Find employee names on this page
                name_matches = list(self.employee_name_pattern.finditer(page_text))
                id_matches = list(self.employee_id_pattern.finditer(page_text))
                amount_matches = list(self.amount_line_pattern.finditer(page_text))
                
                # Only process if we have both name and ID on the same page
                if name_matches and id_matches:
                    employee_name = name_matches[0].group(1)  # Take first name found
                    employee_id = id_matches[0].group(1)      # Take first ID found
                    
                    # Look for reasonable amount on the same page (skip very large numbers like transaction IDs)
                    amount = 0.0
                    if amount_matches:
                        for match in amount_matches:
                            try:
                                amount_str = match.group(1)
                                potential_amount = float(amount_str.replace(',', ''))
                                # Only use amounts that are reasonable for expenses (< $10,000)
                                if 0.01 <= potential_amount <= 10000:
                                    amount = potential_amount
                                    break
                            except (ValueError, IndexError):
                                continue
                    
                    # Extract expense category if available
                    category_match = self.expense_category_pattern.search(page_text)
                    expense_category = category_match.group(1) if category_match else "Unknown"
                    
                    entries.append({
                        'employee_name': employee_name,
                        'employee_id': employee_id,
                        'amount': amount,
                        'expense_category': expense_category,
                        'page_range': [page_num],
                        'page_text_preview': page_text[:200] + "..." if len(page_text) > 200 else page_text
                    })
                    
            except Exception as e:
                logger.warning(f"Failed to process page {page_num}: {str(e)}")
                continue
        
        logger.info(f"Successfully extracted {len(entries)} receipt entries from {len(page_text_mapping)} pages")
        return entries
    
    def _determine_entry_page_range(self, start_pos: int, end_pos: int, full_text: str, page_text_mapping: Dict[int, str]) -> List[int]:
        """
        Determine which pages contain the receipt entry
        """
        pages_in_entry = []
        text_so_far = 0
        
        for page_num in sorted(page_text_mapping.keys()):
            page_text = page_text_mapping[page_num]
            page_start = text_so_far + full_text[text_so_far:].find(f"--- PAGE {page_num} ---")
            page_end = page_start + len(page_text) + 20  # Account for page marker
            
            # Check if this page overlaps with the entry
            if not (end_pos <= page_start or start_pos >= page_end):
                pages_in_entry.append(page_num)
            
            text_so_far = page_end
        
        return pages_in_entry if pages_in_entry else [1]  # Default to page 1 if no match
    
    def _aggregate_employee_receipts(self, receipt_entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregate receipt entries by employee, summing amounts and collecting page ranges
        """
        employee_aggregates = {}
        
        for entry in receipt_entries:
            employee_name = entry['employee_name']
            employee_id = entry['employee_id']
            
            # Use employee name as the key (normalized)
            key = employee_name.replace(' ', '').upper()
            
            if key not in employee_aggregates:
                employee_aggregates[key] = {
                    'employee_id': employee_id,
                    'employee_name': employee_name,
                    'receipt_total': 0.0,
                    'receipt_page_range': [],
                    'expense_categories': set(),
                    'entry_count': 0
                }
            
            # Aggregate data
            aggregate = employee_aggregates[key]
            aggregate['receipt_total'] += entry['amount']
            aggregate['receipt_page_range'].extend(entry['page_range'])
            aggregate['expense_categories'].add(entry['expense_category'])
            aggregate['entry_count'] += 1
        
        # Clean up aggregated data
        for key, aggregate in employee_aggregates.items():
            # Remove duplicate pages and sort
            aggregate['receipt_page_range'] = sorted(list(set(aggregate['receipt_page_range'])))
            # Convert set to list for JSON serialization
            aggregate['expense_categories'] = list(aggregate['expense_categories'])
            # Round the total
            aggregate['receipt_total'] = round(aggregate['receipt_total'], 2)
        
        return employee_aggregates


# Factory function to create the appropriate processor
def create_pdf_processor(document_type: str, **kwargs):
    """
    Factory function to create appropriate PDF processor
    
    Args:
        document_type: 'car' or 'receipt'
        **kwargs: Additional arguments for processor initialization
        
    Returns:
        Appropriate processor instance
    """
    if document_type.lower() == 'car':
        return CARProcessor()
    elif document_type.lower() == 'receipt':
        return ReceiptProcessor()
    else:
        raise ValueError(f"Unsupported document type: {document_type}")