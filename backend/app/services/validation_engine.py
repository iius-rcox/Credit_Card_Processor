"""
Enhanced Validation Engine for Credit Card Processor

Provides comprehensive employee data validation with configurable rules,
detailed validation flags, and helpful suggestions for issue resolution.

Task 9.2: Enhanced Validation Engine
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from ..models import ValidationStatus
from ..config import settings

# Configure logger
logger = logging.getLogger(__name__)


class ValidationSeverity(str, Enum):
    """Validation issue severity levels"""
    LOW = "low"           # Minor issues that don't block processing
    MEDIUM = "medium"     # Issues that need attention but can be processed
    HIGH = "high"         # Critical issues that should block processing
    CRITICAL = "critical" # Issues that must be resolved before processing


class ValidationIssueType(str, Enum):
    """Types of validation issues"""
    MISSING_RECEIPT = "missing_receipt"
    AMOUNT_MISMATCH = "amount_mismatch"
    MISSING_EMPLOYEE_ID = "missing_employee_id"
    INVALID_AMOUNT = "invalid_amount"
    DUPLICATE_EMPLOYEE = "duplicate_employee"
    POLICY_VIOLATION = "policy_violation"
    INCOMPLETE_DATA = "incomplete_data"
    CONFIDENCE_LOW = "confidence_low"
    CUSTOM_RULE_VIOLATION = "custom_rule_violation"


class ValidationRule:
    """Base class for validation rules"""
    
    def __init__(self, name: str, description: str, severity: ValidationSeverity):
        self.name = name
        self.description = description
        self.severity = severity
    
    def validate(self, employee_data: Dict[str, Any], context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """
        Validate employee data against this rule
        
        Args:
            employee_data: Employee data to validate
            context: Additional context for validation (e.g., other employees, configuration)
            
        Returns:
            Validation issue dictionary if rule fails, None if passes
        """
        raise NotImplementedError("Validation rules must implement validate method")


class MissingReceiptRule(ValidationRule):
    """Rule to detect missing receipt information"""
    
    def __init__(self):
        super().__init__(
            name="missing_receipt",
            description="Detect employees missing receipt information",
            severity=ValidationSeverity.HIGH
        )
    
    def validate(self, employee_data: Dict[str, Any], context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        receipt_amount = employee_data.get("receipt_amount")
        
        # Check if receipt amount is missing or zero
        if receipt_amount is None or receipt_amount == 0:
            return {
                "type": ValidationIssueType.MISSING_RECEIPT.value,
                "severity": self.severity.value,
                "description": f"Missing receipt information for employee {employee_data.get('employee_name', 'Unknown')}",
                "suggestion": "Obtain and enter the receipt amount for this employee",
                "fields_affected": ["receipt_amount"],
                "auto_resolvable": False
            }
        
        return None


class AmountMismatchRule(ValidationRule):
    """Rule to detect amount mismatches between CAR and Receipt"""
    
    def __init__(self, threshold_dollars: float = 5.00, threshold_percentage: float = 0.05):
        super().__init__(
            name="amount_mismatch",
            description="Detect mismatches between CAR and Receipt amounts",
            severity=ValidationSeverity.MEDIUM
        )
        self.threshold_dollars = threshold_dollars
        self.threshold_percentage = threshold_percentage
    
    def validate(self, employee_data: Dict[str, Any], context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        car_amount = employee_data.get("car_amount", Decimal('0.00'))
        receipt_amount = employee_data.get("receipt_amount", Decimal('0.00'))
        
        # Convert to Decimal if needed
        try:
            if not isinstance(car_amount, Decimal):
                car_amount = Decimal(str(car_amount))
            if not isinstance(receipt_amount, Decimal):
                receipt_amount = Decimal(str(receipt_amount))
        except (InvalidOperation, ValueError):
            return {
                "type": ValidationIssueType.INVALID_AMOUNT.value,
                "severity": ValidationSeverity.HIGH.value,
                "description": "Invalid amount format in employee data",
                "suggestion": "Verify and correct the amount values",
                "fields_affected": ["car_amount", "receipt_amount"],
                "auto_resolvable": False
            }
        
        # Skip if either amount is zero (handled by other rules)
        if car_amount == 0 or receipt_amount == 0:
            return None
        
        # Calculate absolute and percentage differences
        difference = abs(car_amount - receipt_amount)
        larger_amount = max(car_amount, receipt_amount)
        percentage_diff = (difference / larger_amount) if larger_amount > 0 else 0
        
        # Check if difference exceeds thresholds
        if difference > Decimal(str(self.threshold_dollars)) and percentage_diff > self.threshold_percentage:
            severity = ValidationSeverity.HIGH if percentage_diff > 0.20 else ValidationSeverity.MEDIUM
            
            return {
                "type": ValidationIssueType.AMOUNT_MISMATCH.value,
                "severity": severity.value,
                "description": f"Amount mismatch: CAR shows ${car_amount:.2f}, Receipt shows ${receipt_amount:.2f} (${difference:.2f} difference)",
                "suggestion": "Verify the correct amount and update the record with the accurate value",
                "fields_affected": ["car_amount", "receipt_amount"],
                "auto_resolvable": False,
                "details": {
                    "car_amount": float(car_amount),
                    "receipt_amount": float(receipt_amount),
                    "difference": float(difference),
                    "percentage_difference": float(percentage_diff)
                }
            }
        
        return None


class MissingEmployeeIDRule(ValidationRule):
    """Rule to detect missing employee IDs"""
    
    def __init__(self):
        super().__init__(
            name="missing_employee_id",
            description="Detect employees missing employee ID",
            severity=ValidationSeverity.HIGH
        )
    
    def validate(self, employee_data: Dict[str, Any], context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        employee_id = employee_data.get("employee_id")
        
        if not employee_id or str(employee_id).strip() == "":
            return {
                "type": ValidationIssueType.MISSING_EMPLOYEE_ID.value,
                "severity": self.severity.value,
                "description": f"Missing employee ID for {employee_data.get('employee_name', 'Unknown')}",
                "suggestion": "Look up and assign the correct employee ID",
                "fields_affected": ["employee_id"],
                "auto_resolvable": False
            }
        
        return None


class PolicyViolationRule(ValidationRule):
    """Rule to detect policy violations (amount limits)"""
    
    def __init__(self, max_amount: float = 2000.00):
        super().__init__(
            name="policy_violation",
            description="Detect policy violations such as exceeding amount limits",
            severity=ValidationSeverity.MEDIUM
        )
        self.max_amount = Decimal(str(max_amount))
    
    def validate(self, employee_data: Dict[str, Any], context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        # Check both CAR and receipt amounts
        car_amount = employee_data.get("car_amount", Decimal('0.00'))
        receipt_amount = employee_data.get("receipt_amount", Decimal('0.00'))
        
        try:
            if not isinstance(car_amount, Decimal):
                car_amount = Decimal(str(car_amount))
            if not isinstance(receipt_amount, Decimal):
                receipt_amount = Decimal(str(receipt_amount))
        except (InvalidOperation, ValueError):
            return None  # Invalid amounts handled by other rules
        
        max_amount = max(car_amount, receipt_amount)
        
        if max_amount > self.max_amount:
            return {
                "type": ValidationIssueType.POLICY_VIOLATION.value,
                "severity": self.severity.value,
                "description": f"Amount ${max_amount:.2f} exceeds policy limit (${self.max_amount:.2f})",
                "suggestion": "Verify the amount is correct and obtain approval if it exceeds policy limits",
                "fields_affected": ["car_amount", "receipt_amount"],
                "auto_resolvable": False,
                "details": {
                    "amount": float(max_amount),
                    "policy_limit": float(self.max_amount),
                    "excess_amount": float(max_amount - self.max_amount)
                }
            }
        
        return None


class DuplicateEmployeeRule(ValidationRule):
    """Rule to detect duplicate employee entries within a session"""
    
    def __init__(self):
        super().__init__(
            name="duplicate_employee",
            description="Detect duplicate employee entries",
            severity=ValidationSeverity.MEDIUM
        )
    
    def validate(self, employee_data: Dict[str, Any], context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        if not context or "all_employees" not in context:
            return None
        
        employee_name = employee_data.get("employee_name", "").strip().lower()
        employee_id = employee_data.get("employee_id", "").strip()
        
        if not employee_name and not employee_id:
            return None
        
        # Count occurrences of this employee
        all_employees = context["all_employees"]
        name_matches = 0
        id_matches = 0
        
        for emp in all_employees:
            emp_name = emp.get("employee_name", "").strip().lower()
            emp_id = emp.get("employee_id", "").strip()
            
            if employee_name and emp_name == employee_name:
                name_matches += 1
            if employee_id and emp_id == employee_id:
                id_matches += 1
        
        if name_matches > 1 or id_matches > 1:
            return {
                "type": ValidationIssueType.DUPLICATE_EMPLOYEE.value,
                "severity": self.severity.value,
                "description": f"Duplicate employee detected: {employee_data.get('employee_name', employee_id)}",
                "suggestion": "Review duplicate entries and remove or consolidate as appropriate",
                "fields_affected": ["employee_name", "employee_id"],
                "auto_resolvable": False,
                "details": {
                    "name_matches": name_matches,
                    "id_matches": id_matches
                }
            }
        
        return None


class LowConfidenceRule(ValidationRule):
    """Rule to detect low confidence scores from document processing"""
    
    def __init__(self, min_confidence: float = 0.8):
        super().__init__(
            name="low_confidence",
            description="Detect low confidence scores from document processing",
            severity=ValidationSeverity.LOW
        )
        self.min_confidence = min_confidence
    
    def validate(self, employee_data: Dict[str, Any], context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        confidence = employee_data.get("confidence", 1.0)
        
        if confidence < self.min_confidence:
            return {
                "type": ValidationIssueType.CONFIDENCE_LOW.value,
                "severity": self.severity.value,
                "description": f"Low confidence score ({confidence:.2f}) for {employee_data.get('employee_name', 'Unknown')}",
                "suggestion": "Review and verify the extracted data for accuracy",
                "fields_affected": ["all"],
                "auto_resolvable": False,
                "details": {
                    "confidence": confidence,
                    "min_confidence": self.min_confidence
                }
            }
        
        return None


class IncompleteDataRule(ValidationRule):
    """Rule to detect incomplete employee data"""
    
    def __init__(self, required_fields: List[str] = None):
        super().__init__(
            name="incomplete_data",
            description="Detect incomplete employee data",
            severity=ValidationSeverity.MEDIUM
        )
        self.required_fields = required_fields or ["employee_name", "employee_id"]
    
    def validate(self, employee_data: Dict[str, Any], context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        missing_fields = []
        
        for field in self.required_fields:
            value = employee_data.get(field)
            if value is None or str(value).strip() == "":
                missing_fields.append(field)
        
        if missing_fields:
            return {
                "type": ValidationIssueType.INCOMPLETE_DATA.value,
                "severity": self.severity.value,
                "description": f"Incomplete data: missing {', '.join(missing_fields)}",
                "suggestion": "Complete the missing required fields",
                "fields_affected": missing_fields,
                "auto_resolvable": False,
                "details": {
                    "missing_fields": missing_fields
                }
            }
        
        return None


class ValidationEngine:
    """
    Enhanced validation engine for comprehensive employee data validation
    
    Provides configurable validation rules, detailed validation flags,
    and helpful suggestions for issue resolution.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize validation engine with configuration
        
        Args:
            config: Configuration dictionary with validation settings
        """
        self.config = config or {}
        self.rules = []
        self._setup_default_rules()
        
        logger.info("Enhanced Validation Engine initialized")
    
    def _setup_default_rules(self):
        """Set up default validation rules"""
        
        # Amount mismatch rule with configurable thresholds
        amount_threshold = self.config.get("amount_mismatch_threshold_dollars", 5.00)
        percentage_threshold = self.config.get("amount_mismatch_threshold_percentage", 0.05)
        self.rules.append(AmountMismatchRule(amount_threshold, percentage_threshold))
        
        # Missing receipt rule
        self.rules.append(MissingReceiptRule())
        
        # Missing employee ID rule
        self.rules.append(MissingEmployeeIDRule())
        
        # Policy violation rule with configurable limit
        policy_limit = self.config.get("policy_amount_limit", 2000.00)
        self.rules.append(PolicyViolationRule(policy_limit))
        
        # Duplicate employee rule
        self.rules.append(DuplicateEmployeeRule())
        
        # Low confidence rule with configurable threshold
        min_confidence = self.config.get("min_confidence_threshold", 0.8)
        self.rules.append(LowConfidenceRule(min_confidence))
        
        # Incomplete data rule
        required_fields = self.config.get("required_fields", ["employee_name", "employee_id"])
        self.rules.append(IncompleteDataRule(required_fields))
        
        logger.info(f"Validation engine configured with {len(self.rules)} rules")
    
    def add_custom_rule(self, rule: ValidationRule):
        """
        Add a custom validation rule
        
        Args:
            rule: Custom validation rule instance
        """
        self.rules.append(rule)
        logger.info(f"Added custom validation rule: {rule.name}")
    
    def validate_employee_data(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate employee data against all configured rules
        
        Args:
            employee_data: Employee data dictionary to validate
            
        Returns:
            Validation result dictionary with status and detailed flags
        """
        try:
            validation_issues = []
            
            # Run each validation rule
            for rule in self.rules:
                try:
                    issue = rule.validate(employee_data, {"all_employees": []})  # Context can be enhanced
                    if issue:
                        issue["rule_name"] = rule.name
                        issue["detected_at"] = datetime.now(timezone.utc).isoformat()
                        validation_issues.append(issue)
                except Exception as e:
                    logger.error(f"Error in validation rule {rule.name}: {str(e)}")
                    # Continue with other rules
            
            # Determine overall validation status
            if not validation_issues:
                validation_status = ValidationStatus.VALID
            else:
                # Any validation issues should trigger NEEDS_ATTENTION
                validation_status = ValidationStatus.NEEDS_ATTENTION
            
            # Generate validation flags
            validation_flags = self.generate_validation_flags(validation_issues)
            
            return {
                "validation_status": validation_status,
                "validation_flags": validation_flags,
                "issues_count": len(validation_issues),
                "highest_severity": self._get_highest_severity(validation_issues),
                "validation_summary": self._generate_summary(validation_issues)
            }
            
        except Exception as e:
            logger.error(f"Validation engine error: {str(e)}")
            return {
                "validation_status": ValidationStatus.NEEDS_ATTENTION,
                "validation_flags": {
                    "validation_error": True,
                    "error_message": f"Validation engine error: {str(e)}",
                    "severity": ValidationSeverity.HIGH.value
                },
                "issues_count": 1,
                "highest_severity": ValidationSeverity.HIGH.value,
                "validation_summary": "Validation engine encountered an error"
            }
    
    def validate_batch(self, employees: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate a batch of employees with context-aware validation
        
        Args:
            employees: List of employee data dictionaries
            
        Returns:
            List of validation results for each employee
        """
        results = []
        
        for i, employee_data in enumerate(employees):
            try:
                validation_issues = []
                
                # Create context with all employees for duplicate detection
                context = {"all_employees": employees}
                
                # Run each validation rule with full context
                for rule in self.rules:
                    try:
                        issue = rule.validate(employee_data, context)
                        if issue:
                            issue["rule_name"] = rule.name
                            issue["detected_at"] = datetime.now(timezone.utc).isoformat()
                            validation_issues.append(issue)
                    except Exception as e:
                        logger.error(f"Error in validation rule {rule.name} for employee {i}: {str(e)}")
                
                # Determine validation status
                if not validation_issues:
                    validation_status = ValidationStatus.VALID
                else:
                    # Any validation issues should trigger NEEDS_ATTENTION
                    validation_status = ValidationStatus.NEEDS_ATTENTION
                
                # Generate validation flags
                validation_flags = self.generate_validation_flags(validation_issues)
                
                result = {
                    "validation_status": validation_status,
                    "validation_flags": validation_flags,
                    "issues_count": len(validation_issues),
                    "highest_severity": self._get_highest_severity(validation_issues),
                    "validation_summary": self._generate_summary(validation_issues)
                }
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Batch validation error for employee {i}: {str(e)}")
                results.append({
                    "validation_status": ValidationStatus.NEEDS_ATTENTION,
                    "validation_flags": {
                        "validation_error": True,
                        "error_message": f"Validation error: {str(e)}",
                        "severity": ValidationSeverity.HIGH.value
                    },
                    "issues_count": 1,
                    "highest_severity": ValidationSeverity.HIGH.value,
                    "validation_summary": "Validation encountered an error"
                })
        
        return results
    
    def generate_validation_flags(self, issues: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate validation flags from validation issues
        
        Args:
            issues: List of validation issues
            
        Returns:
            Dictionary of validation flags formatted for API response
        """
        if not issues:
            return {}
        
        flags = {}
        
        # Group issues by type
        issues_by_type = {}
        for issue in issues:
            issue_type = issue["type"]
            if issue_type not in issues_by_type:
                issues_by_type[issue_type] = []
            issues_by_type[issue_type].append(issue)
        
        # Create flags for each issue type
        for issue_type, type_issues in issues_by_type.items():
            if len(type_issues) == 1:
                issue = type_issues[0]
                flags[issue_type] = {
                    "present": True,
                    "severity": issue["severity"],
                    "description": issue["description"],
                    "suggestion": issue["suggestion"],
                    "fields_affected": issue["fields_affected"],
                    "auto_resolvable": issue["auto_resolvable"],
                    "details": issue.get("details", {}),
                    "detected_at": issue["detected_at"]
                }
            else:
                # Multiple issues of same type
                highest_severity = self._get_highest_severity(type_issues)
                flags[issue_type] = {
                    "present": True,
                    "severity": highest_severity,
                    "description": f"Multiple {issue_type} issues detected",
                    "suggestion": "Review all instances of this issue type",
                    "count": len(type_issues),
                    "issues": type_issues,
                    "auto_resolvable": False
                }
        
        # Add summary flags
        flags["has_issues"] = True
        flags["total_issues"] = len(issues)
        flags["highest_severity"] = self._get_highest_severity(issues)
        flags["requires_review"] = any(
            issue["severity"] in [ValidationSeverity.MEDIUM.value, ValidationSeverity.HIGH.value, ValidationSeverity.CRITICAL.value]
            for issue in issues
        )
        
        return flags
    
    def _get_highest_severity(self, issues: List[Dict[str, Any]]) -> str:
        """Get the highest severity level from a list of issues"""
        if not issues:
            return ValidationSeverity.LOW.value
        
        severity_order = [
            ValidationSeverity.LOW.value,
            ValidationSeverity.MEDIUM.value,
            ValidationSeverity.HIGH.value,
            ValidationSeverity.CRITICAL.value
        ]
        
        highest = ValidationSeverity.LOW.value
        for issue in issues:
            severity = issue["severity"]
            if severity_order.index(severity) > severity_order.index(highest):
                highest = severity
        
        return highest
    
    def _generate_summary(self, issues: List[Dict[str, Any]]) -> str:
        """Generate a summary of validation issues"""
        if not issues:
            return "All validations passed"
        
        issue_counts = {}
        for issue in issues:
            severity = issue["severity"]
            issue_counts[severity] = issue_counts.get(severity, 0) + 1
        
        summary_parts = []
        for severity in [ValidationSeverity.CRITICAL.value, ValidationSeverity.HIGH.value, 
                        ValidationSeverity.MEDIUM.value, ValidationSeverity.LOW.value]:
            count = issue_counts.get(severity, 0)
            if count > 0:
                summary_parts.append(f"{count} {severity}")
        
        return f"{len(issues)} issues found: {', '.join(summary_parts)}"
    
    def get_validation_statistics(self, validation_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Get validation statistics for a batch of results
        
        Args:
            validation_results: List of validation results from validate_batch
            
        Returns:
            Dictionary with validation statistics
        """
        total_employees = len(validation_results)
        valid_employees = sum(1 for result in validation_results 
                             if result["validation_status"] == ValidationStatus.VALID)
        issues_employees = total_employees - valid_employees
        
        # Count issues by severity
        severity_counts = {
            ValidationSeverity.LOW.value: 0,
            ValidationSeverity.MEDIUM.value: 0,
            ValidationSeverity.HIGH.value: 0,
            ValidationSeverity.CRITICAL.value: 0
        }
        
        total_issues = 0
        for result in validation_results:
            total_issues += result["issues_count"]
            highest_severity = result.get("highest_severity", ValidationSeverity.LOW.value)
            if highest_severity in severity_counts:
                severity_counts[highest_severity] += 1
        
        return {
            "total_employees": total_employees,
            "valid_employees": valid_employees,
            "issues_employees": issues_employees,
            "validation_pass_rate": valid_employees / total_employees if total_employees > 0 else 0,
            "total_issues": total_issues,
            "issues_per_employee": total_issues / total_employees if total_employees > 0 else 0,
            "severity_breakdown": severity_counts,
            "requires_review": any(
                result["highest_severity"] in [ValidationSeverity.HIGH.value, ValidationSeverity.CRITICAL.value]
                for result in validation_results
            )
        }


# Factory function for easy integration
def create_validation_engine(config: Dict[str, Any] = None) -> ValidationEngine:
    """
    Factory function to create validation engine instance
    
    Args:
        config: Configuration dictionary with validation settings
        
    Returns:
        ValidationEngine instance
    """
    return ValidationEngine(config)