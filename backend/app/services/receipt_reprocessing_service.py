"""
Receipt Reprocessing Service for Phase 4

Handles receipt reprocessing, change detection, and employee matching
for iterative session management workflows.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from difflib import SequenceMatcher
import re

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models import (
    ProcessingSession, EmployeeRevision, ReceiptVersion, EmployeeChangeLog,
    SessionStatus, ValidationStatus, ActivityType
)
from ..schemas import UserInfo

logger = logging.getLogger(__name__)


class ReceiptComparisonEngine:
    """Engine for comparing receipts and detecting changes"""
    
    def __init__(self):
        self.amount_tolerance = Decimal('0.01')  # $0.01 tolerance for amount changes
        self.name_similarity_threshold = 0.85  # 85% similarity for name matching
        self.employee_id_pattern = re.compile(r'^[A-Z0-9\-_]+$', re.IGNORECASE)
    
    def detect_changes(self, 
                      old_employees: List[EmployeeRevision], 
                      new_receipt_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect changes between old employee data and new receipt data
        
        Returns:
            Dict containing:
            - new_employees: List of new employees found
            - changed_employees: List of employees with changes
            - unchanged_employees: List of employees without changes
            - removed_employees: List of employees no longer in receipts
            - change_summary: Summary statistics
        """
        logger.info(f"Detecting changes for {len(old_employees)} existing employees vs {len(new_receipt_data)} new receipts")
        
        # Convert new receipt data to standardized format
        new_employees = self._standardize_receipt_data(new_receipt_data)
        
        # Match employees between old and new data
        matches = self._match_employees(old_employees, new_employees)
        
        # Categorize changes
        changes = {
            'new_employees': [],
            'changed_employees': [],
            'unchanged_employees': [],
            'removed_employees': [],
            'change_summary': {
                'total_old': len(old_employees),
                'total_new': len(new_employees),
                'new_count': 0,
                'changed_count': 0,
                'unchanged_count': 0,
                'removed_count': 0
            }
        }
        
        # Process matches
        for old_emp, new_emp, confidence in matches:
            if new_emp is None:
                # Employee removed
                changes['removed_employees'].append({
                    'employee': old_emp,
                    'reason': 'Not found in new receipts'
                })
                changes['change_summary']['removed_count'] += 1
            elif old_emp is None:
                # New employee
                changes['new_employees'].append({
                    'employee': new_emp,
                    'confidence': confidence,
                    'reason': 'New employee in receipts'
                })
                changes['change_summary']['new_count'] += 1
            else:
                # Check for changes
                change_details = self._detect_employee_changes(old_emp, new_emp)
                if change_details['has_changes']:
                    changes['changed_employees'].append({
                        'old_employee': old_emp,
                        'new_employee': new_emp,
                        'changes': change_details,
                        'confidence': confidence
                    })
                    changes['change_summary']['changed_count'] += 1
                else:
                    changes['unchanged_employees'].append({
                        'employee': old_emp,
                        'confidence': confidence
                    })
                    changes['change_summary']['unchanged_count'] += 1
        
        logger.info(f"Change detection complete: {changes['change_summary']}")
        return changes
    
    def _standardize_receipt_data(self, receipt_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Standardize receipt data format for comparison"""
        standardized = []
        
        for receipt in receipt_data:
            # Extract employee information
            employee_name = self._normalize_name(receipt.get('employee_name', ''))
            employee_id = receipt.get('employee_id', '').strip()
            amount = self._parse_amount(receipt.get('amount', 0))
            
            if not employee_name:
                logger.warning(f"Skipping receipt with no employee name: {receipt}")
                continue
            
            standardized.append({
                'employee_name': employee_name,
                'employee_id': employee_id,
                'amount': amount,
                'raw_data': receipt
            })
        
        return standardized
    
    def _normalize_name(self, name: str) -> str:
        """Normalize employee name for comparison"""
        if not name:
            return ""
        
        # Remove extra whitespace and convert to title case
        normalized = ' '.join(name.strip().split())
        
        # Remove common suffixes and prefixes
        suffixes = ['JR', 'SR', 'II', 'III', 'IV', 'V']
        for suffix in suffixes:
            if normalized.upper().endswith(f' {suffix}'):
                normalized = normalized[:-len(f' {suffix}')].strip()
        
        return normalized
    
    def _parse_amount(self, amount: Any) -> Decimal:
        """Parse amount to Decimal with error handling"""
        try:
            if isinstance(amount, (int, float)):
                return Decimal(str(amount)).quantize(Decimal('0.01'))
            elif isinstance(amount, str):
                # Remove currency symbols and commas
                cleaned = re.sub(r'[^\d.-]', '', amount)
                return Decimal(cleaned).quantize(Decimal('0.01'))
            else:
                return Decimal('0.00')
        except (ValueError, TypeError):
            logger.warning(f"Could not parse amount: {amount}")
            return Decimal('0.00')
    
    def _match_employees(self, 
                        old_employees: List[EmployeeRevision], 
                        new_employees: List[Dict[str, Any]]) -> List[Tuple[Optional[EmployeeRevision], Optional[Dict], float]]:
        """Match employees between old and new data using fuzzy matching"""
        matches = []
        used_new_indices = set()
        
        for old_emp in old_employees:
            best_match = None
            best_confidence = 0.0
            best_index = -1
            
            for i, new_emp in enumerate(new_employees):
                if i in used_new_indices:
                    continue
                
                confidence = self._calculate_match_confidence(old_emp, new_emp)
                
                if confidence > best_confidence and confidence >= self.name_similarity_threshold:
                    best_match = new_emp
                    best_confidence = confidence
                    best_index = i
            
            if best_match:
                matches.append((old_emp, best_match, best_confidence))
                used_new_indices.add(best_index)
            else:
                matches.append((old_emp, None, 0.0))
        
        # Add unmatched new employees
        for i, new_emp in enumerate(new_employees):
            if i not in used_new_indices:
                matches.append((None, new_emp, 1.0))
        
        return matches
    
    def _calculate_match_confidence(self, old_emp: EmployeeRevision, new_emp: Dict[str, Any]) -> float:
        """Calculate confidence score for employee matching"""
        confidence_factors = []
        
        # Name similarity (primary factor)
        name_similarity = SequenceMatcher(
            None, 
            old_emp.employee_name.lower(), 
            new_emp['employee_name'].lower()
        ).ratio()
        confidence_factors.append(('name', name_similarity, 0.6))
        
        # Employee ID match (if both exist)
        if old_emp.employee_id and new_emp['employee_id']:
            if old_emp.employee_id.upper() == new_emp['employee_id'].upper():
                confidence_factors.append(('id', 1.0, 0.3))
            else:
                confidence_factors.append(('id', 0.0, 0.3))
        else:
            confidence_factors.append(('id', 0.5, 0.1))  # Neutral if one missing
        
        # Amount similarity (secondary factor)
        if old_emp.receipt_amount and new_emp['amount']:
            amount_diff = abs(old_emp.receipt_amount - new_emp['amount'])
            if amount_diff <= self.amount_tolerance:
                confidence_factors.append(('amount', 1.0, 0.1))
            else:
                # Calculate similarity based on percentage difference
                max_amount = max(old_emp.receipt_amount, new_emp['amount'])
                if max_amount > 0:
                    amount_similarity = 1.0 - (amount_diff / max_amount)
                    confidence_factors.append(('amount', max(0, amount_similarity), 0.1))
                else:
                    confidence_factors.append(('amount', 0.0, 0.1))
        else:
            confidence_factors.append(('amount', 0.5, 0.1))
        
        # Calculate weighted confidence
        total_weight = sum(weight for _, _, weight in confidence_factors)
        weighted_confidence = sum(score * weight for _, score, weight in confidence_factors) / total_weight
        
        return min(1.0, weighted_confidence)
    
    def _detect_employee_changes(self, old_emp: EmployeeRevision, new_emp: Dict[str, Any]) -> Dict[str, Any]:
        """Detect specific changes between old and new employee data"""
        changes = {
            'has_changes': False,
            'amount_changed': False,
            'name_changed': False,
            'id_changed': False,
            'change_details': []
        }
        
        # Check amount changes
        if old_emp.receipt_amount and new_emp['amount']:
            amount_diff = abs(old_emp.receipt_amount - new_emp['amount'])
            if amount_diff > self.amount_tolerance:
                changes['amount_changed'] = True
                changes['has_changes'] = True
                changes['change_details'].append({
                    'field': 'receipt_amount',
                    'old_value': float(old_emp.receipt_amount),
                    'new_value': float(new_emp['amount']),
                    'difference': float(amount_diff)
                })
        
        # Check name changes
        if old_emp.employee_name != new_emp['employee_name']:
            changes['name_changed'] = True
            changes['has_changes'] = True
            changes['change_details'].append({
                'field': 'employee_name',
                'old_value': old_emp.employee_name,
                'new_value': new_emp['employee_name']
            })
        
        # Check ID changes
        if old_emp.employee_id != new_emp['employee_id']:
            changes['id_changed'] = True
            changes['has_changes'] = True
            changes['change_details'].append({
                'field': 'employee_id',
                'old_value': old_emp.employee_id,
                'new_value': new_emp['employee_id']
            })
        
        return changes


class ReceiptReprocessingService:
    """Main service for handling receipt reprocessing workflows"""
    
    def __init__(self, db: Session):
        self.db = db
        self.comparison_engine = ReceiptComparisonEngine()
    
    def reprocess_receipts(self, 
                          session_id: str, 
                          new_receipt_file_path: str, 
                          uploaded_by: str) -> Dict[str, Any]:
        """
        Reprocess receipts for a completed session
        
        Args:
            session_id: UUID of the session to reprocess
            new_receipt_file_path: Path to the new receipt file
            uploaded_by: Username of the user uploading receipts
        
        Returns:
            Dict containing reprocessing results and change summary
        """
        logger.info(f"Starting receipt reprocessing for session {session_id}")
        
        try:
            # Get the session
            session = self.db.query(ProcessingSession).filter(
                ProcessingSession.session_id == session_id
            ).first()
            
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            if session.is_closed:
                raise ValueError(f"Session {session_id} is permanently closed and cannot be reprocessed")
            
            # Create new receipt version
            version_number = self._get_next_version_number(session_id)
            receipt_version = self._create_receipt_version(
                session_id, version_number, new_receipt_file_path, uploaded_by
            )
            
            # Update session status
            session.status = SessionStatus.RECEIPT_REPROCESSING
            session.last_receipt_upload = datetime.now(timezone.utc)
            session.receipt_file_versions = version_number
            session.updated_at = datetime.now(timezone.utc)
            
            # Get existing employee data
            old_employees = self.db.query(EmployeeRevision).filter(
                EmployeeRevision.session_id == session_id
            ).all()
            
            # Parse new receipt data (simplified - would need actual file parsing)
            new_receipt_data = self._parse_receipt_file(new_receipt_file_path)
            
            # Detect changes
            changes = self.comparison_engine.detect_changes(old_employees, new_receipt_data)
            
            # Apply changes to database
            self._apply_changes(session_id, changes, version_number, uploaded_by)
            
            # Update session status
            session.status = SessionStatus.COMPLETED
            session.updated_at = datetime.now(timezone.utc)
            
            # Log activity
            self._log_reprocessing_activity(session_id, changes, uploaded_by)
            
            self.db.commit()
            
            logger.info(f"Receipt reprocessing completed for session {session_id}")
            
            return {
                'success': True,
                'version_number': version_number,
                'changes': changes,
                'message': f"Successfully reprocessed receipts. Version {version_number} created."
            }
            
        except Exception as e:
            logger.error(f"Receipt reprocessing failed for session {session_id}: {e}")
            self.db.rollback()
            raise
    
    def _get_next_version_number(self, session_id: str) -> int:
        """Get the next version number for a session"""
        max_version = self.db.query(ReceiptVersion).filter(
            ReceiptVersion.session_id == session_id
        ).with_entities(ReceiptVersion.version_number).order_by(
            ReceiptVersion.version_number.desc()
        ).first()
        
        return (max_version[0] if max_version else 0) + 1
    
    def _create_receipt_version(self, 
                               session_id: str, 
                               version_number: int, 
                               file_path: str, 
                               uploaded_by: str) -> ReceiptVersion:
        """Create a new receipt version record"""
        # Calculate file checksum
        file_checksum = self._calculate_file_checksum(file_path)
        
        receipt_version = ReceiptVersion(
            session_id=session_id,
            version_number=version_number,
            file_path=file_path,
            file_checksum=file_checksum,
            uploaded_by=uploaded_by,
            uploaded_at=datetime.now(timezone.utc),
            processing_status='completed'
        )
        
        self.db.add(receipt_version)
        return receipt_version
    
    def _calculate_file_checksum(self, file_path: str) -> str:
        """Calculate SHA-256 checksum of file"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except Exception as e:
            logger.warning(f"Could not calculate checksum for {file_path}: {e}")
            return "unknown"
    
    def _parse_receipt_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse receipt file and extract employee data"""
        # This is a simplified implementation
        # In production, this would parse CSV/Excel files and extract employee data
        logger.info(f"Parsing receipt file: {file_path}")
        
        # Mock data for now - would be replaced with actual file parsing
        return [
            {
                'employee_name': 'John Doe',
                'employee_id': 'EMP001',
                'amount': 150.00
            },
            {
                'employee_name': 'Jane Smith',
                'employee_id': 'EMP002',
                'amount': 200.50
            }
        ]
    
    def _apply_changes(self, 
                      session_id: str, 
                      changes: Dict[str, Any], 
                      version_number: int, 
                      changed_by: str):
        """Apply detected changes to the database"""
        logger.info(f"Applying changes for session {session_id}, version {version_number}")
        
        # Process new employees
        for new_emp_data in changes['new_employees']:
            new_emp = new_emp_data['employee']
            self._create_new_employee(session_id, new_emp, version_number, changed_by)
        
        # Process changed employees
        for changed_emp_data in changes['changed_employees']:
            old_emp = changed_emp_data['old_employee']
            new_emp = changed_emp_data['new_employee']
            changes_detail = changed_emp_data['changes']
            
            self._update_employee(old_emp, new_emp, changes_detail, version_number, changed_by)
        
        # Process removed employees (mark as removed, don't delete)
        for removed_emp_data in changes['removed_employees']:
            old_emp = removed_emp_data['employee']
            self._mark_employee_removed(old_emp, version_number, changed_by)
    
    def _create_new_employee(self, 
                            session_id: str, 
                            new_emp: Dict[str, Any], 
                            version_number: int, 
                            created_by: str):
        """Create a new employee revision"""
        employee = EmployeeRevision(
            session_id=session_id,
            employee_id=new_emp['employee_id'],
            employee_name=new_emp['employee_name'],
            receipt_amount=new_emp['amount'],
            validation_status=ValidationStatus.VALID,
            receipt_version_processed=version_number
        )
        
        self.db.add(employee)
        
        # Log the change
        self._log_employee_change(
            session_id, employee.employee_id, employee.employee_name,
            'new', None, new_emp, version_number, created_by, 1.0
        )
    
    def _update_employee(self, 
                        old_emp: EmployeeRevision, 
                        new_emp: Dict[str, Any], 
                        changes_detail: Dict[str, Any], 
                        version_number: int, 
                        changed_by: str):
        """Update an existing employee with new data"""
        # Store old values for change tracking
        old_values = {
            'employee_id': old_emp.employee_id,
            'employee_name': old_emp.employee_name,
            'receipt_amount': float(old_emp.receipt_amount) if old_emp.receipt_amount else None
        }
        
        # Update employee data
        old_emp.employee_id = new_emp['employee_id']
        old_emp.employee_name = new_emp['employee_name']
        old_emp.receipt_amount = new_emp['amount']
        old_emp.receipt_version_processed = version_number
        old_emp.amount_changed = changes_detail['amount_changed']
        old_emp.updated_at = datetime.now(timezone.utc)
        
        # Store previous amounts for delta tracking
        if changes_detail['amount_changed']:
            old_emp.previous_receipt_amount = old_values['receipt_amount']
        
        # Log the change
        new_values = {
            'employee_id': new_emp['employee_id'],
            'employee_name': new_emp['employee_name'],
            'receipt_amount': float(new_emp['amount'])
        }
        
        self._log_employee_change(
            old_emp.session_id, old_emp.employee_id, old_emp.employee_name,
            'amount_changed', old_values, new_values, version_number, changed_by, 0.9
        )
    
    def _mark_employee_removed(self, 
                              employee: EmployeeRevision, 
                              version_number: int, 
                              changed_by: str):
        """Mark an employee as removed (soft delete)"""
        old_values = {
            'employee_id': employee.employee_id,
            'employee_name': employee.employee_name,
            'receipt_amount': float(employee.receipt_amount) if employee.receipt_amount else None
        }
        
        # Mark as removed (could add a status field for this)
        employee.validation_status = ValidationStatus.NEEDS_ATTENTION
        employee.updated_at = datetime.now(timezone.utc)
        
        # Log the change
        self._log_employee_change(
            employee.session_id, employee.employee_id, employee.employee_name,
            'removed', old_values, None, version_number, changed_by, 1.0
        )
    
    def _log_employee_change(self, 
                            session_id: str, 
                            employee_id: Optional[str], 
                            employee_name: str, 
                            change_type: str, 
                            old_values: Optional[Dict], 
                            new_values: Optional[Dict], 
                            version_number: int, 
                            changed_by: str, 
                            confidence: float):
        """Log an employee change to the change log"""
        change_log = EmployeeChangeLog(
            session_id=session_id,
            employee_id=employee_id,
            employee_name=employee_name,
            change_type=change_type,
            old_values=old_values,
            new_values=new_values,
            receipt_version=version_number,
            changed_by=changed_by,
            change_confidence=confidence,
            requires_review=confidence < 0.8
        )
        
        self.db.add(change_log)
    
    def _log_reprocessing_activity(self, 
                                  session_id: str, 
                                  changes: Dict[str, Any], 
                                  user: str):
        """Log reprocessing activity"""
        summary = changes['change_summary']
        message = f"Receipt reprocessing completed: {summary['new_count']} new, {summary['changed_count']} changed, {summary['removed_count']} removed employees"
        
        activity = ProcessingActivity(
            session_id=session_id,
            activity_type=ActivityType.PROCESSING,
            activity_message=message,
            created_by=user
        )
        
        self.db.add(activity)

