"""
Employee Data Merger Service

Merges employee data from CAR and Receipt documents, identifies matches,
and prepares data for document splitting functionality.
"""

import logging
import re
from typing import Dict, List, Any, Optional, Tuple, Set
from decimal import Decimal
from difflib import SequenceMatcher

# Configure logger
logger = logging.getLogger(__name__)


class EmployeeMergerError(Exception):
    """Base exception for employee merger errors"""
    pass


class EmployeeDataMerger:
    """
    Merges and matches employee data from CAR and Receipt documents
    Provides functionality for data validation and splitting preparation
    """
    
    def __init__(self, similarity_threshold: float = 0.8):
        """
        Initialize merger with similarity threshold for name matching
        
        Args:
            similarity_threshold: Minimum similarity score for name matching (0.0 to 1.0)
        """
        self.similarity_threshold = similarity_threshold
        self.name_variations = {
            # Common name variations that should be treated as same person
            'WILLIAM': ['WILLIAMBURT', 'BILL'],
            'ROBERT': ['BOB', 'BOBBY'],
            'RICHARD': ['RICK', 'DICK'],
            'MICHAEL': ['MIKE'],
            'CHRISTOPHER': ['CHRIS'],
            'ANTHONY': ['TONY'],
            'JOSEPH': ['JOE'],
            'BENJAMIN': ['BEN'],
            'MATTHEW': ['MATT'],
            'ANDREW': ['ANDY']
        }
    
    def merge_employee_data(self, car_employees: Dict[str, Any], receipt_employees: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge employee data from CAR and Receipt documents
        
        Args:
            car_employees: Employee data from CAR document processing
            receipt_employees: Employee data from Receipt document processing
            
        Returns:
            Merged employee data with match information
        """
        logger.info(f"Merging {len(car_employees)} CAR employees with {len(receipt_employees)} receipt employees")
        
        try:
            # Normalize names and create lookup maps
            car_normalized = self._normalize_employee_data(car_employees, 'car')
            receipt_normalized = self._normalize_employee_data(receipt_employees, 'receipt')
            
            # Find matches between CAR and Receipt employees
            matches = self._find_employee_matches(car_normalized, receipt_normalized)
            
            # Create merged dataset
            merged_data = self._create_merged_dataset(car_normalized, receipt_normalized, matches)
            
            # Generate summary statistics
            summary = self._generate_merge_summary(merged_data, matches)
            
            logger.info(f"Merge completed: {summary['matched_count']} matched, "
                       f"{summary['car_only_count']} CAR-only, "
                       f"{summary['receipt_only_count']} Receipt-only")
            
            return {
                'employees': merged_data,
                'summary': summary,
                'matches': matches
            }
            
        except Exception as e:
            logger.error(f"Failed to merge employee data: {str(e)}")
            raise EmployeeMergerError(f"Employee data merge failed: {str(e)}")
    
    def _normalize_employee_data(self, employee_data: Dict[str, Any], source_type: str) -> Dict[str, Dict[str, Any]]:
        """
        Normalize employee data for consistent processing
        """
        normalized = {}
        
        for key, employee in employee_data.items():
            # Create normalized entry
            normalized_employee = {
                'employee_id': employee.get('employee_id'),
                'employee_name': employee.get('employee_name'),
                'normalized_name': self._normalize_name(employee.get('employee_name', '')),
                'source_type': source_type,
                'original_key': key
            }
            
            # Add source-specific fields
            if source_type == 'car':
                normalized_employee.update({
                    'card_number': employee.get('card_number'),
                    'car_total': float(employee.get('car_total', 0.0)),
                    'car_page_range': employee.get('car_page_range', []),
                    'fuel_total': float(employee.get('fuel_total', 0.0)),
                    'maintenance_total': float(employee.get('maintenance_total', 0.0))
                })
            elif source_type == 'receipt':
                normalized_employee.update({
                    'receipt_total': float(employee.get('receipt_total', 0.0)),
                    'receipt_page_range': employee.get('receipt_page_range', []),
                    'expense_categories': employee.get('expense_categories', []),
                    'entry_count': employee.get('entry_count', 0)
                })
            
            normalized[key] = normalized_employee
        
        return normalized
    
    def _normalize_name(self, name: str) -> str:
        """
        Normalize employee name for consistent matching
        """
        if not name:
            return ""
        
        # Remove extra spaces and convert to uppercase
        normalized = ' '.join(name.upper().split())
        
        # Handle concatenated names like "WILLIAMBURT" -> "WILLIAM BURT"
        normalized = self._split_concatenated_names(normalized)
        
        # Apply known name variations
        for standard_name, variations in self.name_variations.items():
            for variation in variations:
                if variation in normalized:
                    normalized = normalized.replace(variation, standard_name)
        
        return normalized
    
    def _split_concatenated_names(self, name: str) -> str:
        """
        Attempt to split concatenated names like 'WILLIAMBURT' -> 'WILLIAM BURT'
        """
        if ' ' in name or len(name) < 8:
            return name
        
        # Simple heuristic: look for common name patterns
        common_first_names = [
            'WILLIAM', 'RICHARD', 'ROBERT', 'MICHAEL', 'DAVID', 'JAMES', 'JOHN',
            'CHRISTOPHER', 'DANIEL', 'MATTHEW', 'ANTHONY', 'MARK', 'DONALD',
            'STEVEN', 'ANDREW', 'KENNETH', 'JOSHUA', 'KEVIN', 'BRIAN', 'GEORGE',
            'AARON', 'ADOLFO', 'CHARLES', 'HECTOR', 'BENNY', 'SPENCER', 'AUBREY'
        ]
        
        for first_name in common_first_names:
            if name.startswith(first_name) and len(name) > len(first_name):
                potential_last = name[len(first_name):]
                if len(potential_last) >= 3:  # Reasonable last name length
                    return f"{first_name} {potential_last}"
        
        return name
    
    def _find_employee_matches(self, car_data: Dict, receipt_data: Dict) -> List[Dict[str, Any]]:
        """
        Find matches between CAR and Receipt employees
        """
        matches = []
        
        for car_key, car_employee in car_data.items():
            best_match = None
            best_score = 0.0
            
            car_name = car_employee['normalized_name']
            car_id = car_employee.get('employee_id')
            
            for receipt_key, receipt_employee in receipt_data.items():
                receipt_name = receipt_employee['normalized_name']
                receipt_id = receipt_employee.get('employee_id')
                
                # Calculate match score
                score = self._calculate_match_score(
                    car_name, car_id,
                    receipt_name, receipt_id
                )
                
                if score > best_score and score >= self.similarity_threshold:
                    best_score = score
                    best_match = {
                        'car_key': car_key,
                        'receipt_key': receipt_key,
                        'car_employee': car_employee,
                        'receipt_employee': receipt_employee,
                        'match_score': score,
                        'match_reason': self._get_match_reason(car_name, car_id, receipt_name, receipt_id)
                    }
            
            if best_match:
                matches.append(best_match)
                logger.debug(f"Found match: {car_employee['employee_name']} <-> "
                           f"{best_match['receipt_employee']['employee_name']} "
                           f"(score: {best_score:.2f})")
        
        return matches
    
    def _calculate_match_score(self, car_name: str, car_id: str, receipt_name: str, receipt_id: str) -> float:
        """
        Calculate similarity score between two employee records
        """
        # Exact ID match has highest priority
        if car_id and receipt_id and car_id == receipt_id:
            return 1.0
        
        # Name similarity
        name_similarity = SequenceMatcher(None, car_name, receipt_name).ratio()
        
        # Bonus for partial ID match (if IDs exist)
        id_bonus = 0.0
        if car_id and receipt_id:
            id_similarity = SequenceMatcher(None, car_id, receipt_id).ratio()
            id_bonus = id_similarity * 0.3  # Weight ID similarity lower than name
        
        return min(1.0, name_similarity + id_bonus)
    
    def _get_match_reason(self, car_name: str, car_id: str, receipt_name: str, receipt_id: str) -> str:
        """
        Generate human-readable reason for the match
        """
        if car_id and receipt_id and car_id == receipt_id:
            return "Exact Employee ID match"
        elif car_name == receipt_name:
            return "Exact name match"
        else:
            similarity = SequenceMatcher(None, car_name, receipt_name).ratio()
            return f"Name similarity ({similarity:.2f})"
    
    def _create_merged_dataset(self, car_data: Dict, receipt_data: Dict, matches: List[Dict]) -> Dict[str, Dict[str, Any]]:
        """
        Create merged dataset from CAR and Receipt data
        """
        merged = {}
        matched_receipt_keys = {match['receipt_key'] for match in matches}
        
        # Process matches first
        for match in matches:
            car_emp = match['car_employee']
            receipt_emp = match['receipt_employee']
            
            merged_key = car_emp['original_key']  # Use CAR key as primary
            
            merged[merged_key] = {
                'employee_id': car_emp['employee_id'],
                'employee_name': car_emp['employee_name'],
                'normalized_name': car_emp['normalized_name'],
                'match_status': 'matched',
                'match_score': match['match_score'],
                'match_reason': match['match_reason'],
                
                # CAR data
                'card_number': car_emp.get('card_number'),
                'car_total': car_emp['car_total'],
                'car_page_range': car_emp['car_page_range'],
                'fuel_total': car_emp['fuel_total'],
                'maintenance_total': car_emp['maintenance_total'],
                
                # Receipt data
                'receipt_total': receipt_emp['receipt_total'],
                'receipt_page_range': receipt_emp['receipt_page_range'],
                'expense_categories': receipt_emp['expense_categories'],
                'entry_count': receipt_emp['entry_count'],
                
                # Computed fields
                'total_expenses': car_emp['car_total'] + receipt_emp['receipt_total'],
                'has_car_data': True,
                'has_receipt_data': True,
                'sources': ['car', 'receipt']
            }
        
        # Add unmatched CAR employees
        for car_key, car_emp in car_data.items():
            if car_key not in merged:
                merged[car_key] = {
                    'employee_id': car_emp['employee_id'],
                    'employee_name': car_emp['employee_name'],
                    'normalized_name': car_emp['normalized_name'],
                    'match_status': 'car_only',
                    'match_score': 0.0,
                    'match_reason': 'No receipt data found',
                    
                    # CAR data
                    'card_number': car_emp.get('card_number'),
                    'car_total': car_emp['car_total'],
                    'car_page_range': car_emp['car_page_range'],
                    'fuel_total': car_emp['fuel_total'],
                    'maintenance_total': car_emp['maintenance_total'],
                    
                    # Empty receipt data
                    'receipt_total': 0.0,
                    'receipt_page_range': [],
                    'expense_categories': [],
                    'entry_count': 0,
                    
                    # Computed fields
                    'total_expenses': car_emp['car_total'],
                    'has_car_data': True,
                    'has_receipt_data': False,
                    'sources': ['car']
                }
        
        # Add unmatched Receipt employees
        for receipt_key, receipt_emp in receipt_data.items():
            if receipt_key not in matched_receipt_keys:
                merged[f"receipt_{receipt_key}"] = {
                    'employee_id': receipt_emp['employee_id'],
                    'employee_name': receipt_emp['employee_name'],
                    'normalized_name': receipt_emp['normalized_name'],
                    'match_status': 'receipt_only',
                    'match_score': 0.0,
                    'match_reason': 'No CAR data found',
                    
                    # Empty CAR data
                    'card_number': None,
                    'car_total': 0.0,
                    'car_page_range': [],
                    'fuel_total': 0.0,
                    'maintenance_total': 0.0,
                    
                    # Receipt data
                    'receipt_total': receipt_emp['receipt_total'],
                    'receipt_page_range': receipt_emp['receipt_page_range'],
                    'expense_categories': receipt_emp['expense_categories'],
                    'entry_count': receipt_emp['entry_count'],
                    
                    # Computed fields
                    'total_expenses': receipt_emp['receipt_total'],
                    'has_car_data': False,
                    'has_receipt_data': True,
                    'sources': ['receipt']
                }
        
        return merged
    
    def _generate_merge_summary(self, merged_data: Dict, matches: List[Dict]) -> Dict[str, Any]:
        """
        Generate summary statistics for the merge operation
        """
        matched_count = len(matches)
        car_only_count = len([emp for emp in merged_data.values() if emp['match_status'] == 'car_only'])
        receipt_only_count = len([emp for emp in merged_data.values() if emp['match_status'] == 'receipt_only'])
        
        total_car_amount = sum(emp['car_total'] for emp in merged_data.values())
        total_receipt_amount = sum(emp['receipt_total'] for emp in merged_data.values())
        
        return {
            'total_employees': len(merged_data),
            'matched_count': matched_count,
            'car_only_count': car_only_count,
            'receipt_only_count': receipt_only_count,
            'match_percentage': (matched_count / len(merged_data)) * 100 if merged_data else 0,
            'total_car_amount': round(total_car_amount, 2),
            'total_receipt_amount': round(total_receipt_amount, 2),
            'total_combined_amount': round(total_car_amount + total_receipt_amount, 2)
        }
    
    def get_splittable_employees(self, merged_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get list of employees that have both CAR and Receipt data for document splitting
        
        Args:
            merged_data: Merged employee data
            
        Returns:
            List of employees suitable for document splitting
        """
        splittable = []
        
        for emp_key, employee in merged_data.items():
            if employee['match_status'] == 'matched' and employee['has_car_data'] and employee['has_receipt_data']:
                splittable.append({
                    'employee_key': emp_key,
                    'employee_name': employee['employee_name'],
                    'employee_id': employee['employee_id'],
                    'car_pages': employee['car_page_range'],
                    'receipt_pages': employee['receipt_page_range'],
                    'car_total': employee['car_total'],
                    'receipt_total': employee['receipt_total'],
                    'total_expenses': employee['total_expenses'],
                    'expense_categories': employee['expense_categories']
                })
        
        # Sort by total expenses (highest first)
        splittable.sort(key=lambda x: x['total_expenses'], reverse=True)
        
        logger.info(f"Found {len(splittable)} employees suitable for document splitting")
        return splittable
    
    def validate_employee_data(self, merged_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate merged employee data and identify potential issues
        
        Args:
            merged_data: Merged employee data to validate
            
        Returns:
            Validation report with issues and recommendations
        """
        issues = []
        warnings = []
        recommendations = []
        
        for emp_key, employee in merged_data.items():
            name = employee['employee_name']
            
            # Check for missing employee IDs
            if not employee.get('employee_id'):
                issues.append(f"{name}: Missing employee ID")
            
            # Check for unusual amounts
            if employee['car_total'] > 10000:
                warnings.append(f"{name}: High CAR total (${employee['car_total']:.2f})")
            
            if employee['receipt_total'] > 5000:
                warnings.append(f"{name}: High receipt total (${employee['receipt_total']:.2f})")
            
            # Check for employees with only one data source
            if employee['match_status'] == 'car_only':
                recommendations.append(f"{name}: Consider checking if receipt data exists under different name")
            elif employee['match_status'] == 'receipt_only':
                recommendations.append(f"{name}: Consider checking if CAR data exists under different name")
            
            # Check for empty page ranges
            if employee['has_car_data'] and not employee['car_page_range']:
                issues.append(f"{name}: CAR data present but no page range")
            
            if employee['has_receipt_data'] and not employee['receipt_page_range']:
                issues.append(f"{name}: Receipt data present but no page range")
        
        return {
            'validation_status': 'passed' if not issues else 'failed',
            'issues_count': len(issues),
            'warnings_count': len(warnings),
            'recommendations_count': len(recommendations),
            'issues': issues,
            'warnings': warnings,
            'recommendations': recommendations
        }


def create_employee_merger(similarity_threshold: float = 0.8) -> EmployeeDataMerger:
    """
    Factory function to create EmployeeDataMerger instance
    
    Args:
        similarity_threshold: Minimum similarity for name matching (default: 0.8)
        
    Returns:
        EmployeeDataMerger instance
    """
    return EmployeeDataMerger(similarity_threshold=similarity_threshold)