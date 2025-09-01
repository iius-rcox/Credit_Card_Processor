#!/usr/bin/env python3
"""
Results Formatter for Credit Card Processor

Provides comprehensive data formatting services for processing results.
Handles employee data formatting, session summaries, and delta comparisons
for frontend consumption.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import (
    ProcessingSession, 
    EmployeeRevision,
    ValidationStatus,
    SessionStatus
)

logger = logging.getLogger(__name__)


class ResultsFormatter:
    """
    Comprehensive results formatting service
    
    Handles:
    - Employee data formatting for frontend consumption
    - Session summary statistics calculation
    - Delta session comparison and formatting
    - Validation flags processing and enhancement
    - Data normalization and type conversion
    """
    
    def __init__(self, db: Session):
        """
        Initialize results formatter
        
        Args:
            db: Database session
        """
        self.db = db
        logger.info("Results Formatter initialized")
    
    def format_employee_data(
        self, 
        employees: List[EmployeeRevision],
        session: ProcessingSession,
        include_delta_info: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Format employee data for frontend consumption
        
        Args:
            employees: List of employee revision records
            session: Processing session
            include_delta_info: Whether to include delta comparison data
            
        Returns:
            List of formatted employee dictionaries
        """
        formatted_employees = []
        
        try:
            for employee in employees:
                # Get delta information if requested
                delta_info = {}
                if include_delta_info and session.delta_session_id:
                    delta_info = self._get_employee_delta_info(employee, session)
                
                # Format validation flags with enhanced details
                validation_flags = self._enhance_validation_flags(employee.validation_flags or {})
                
                # Build formatted employee data
                employee_data = {
                    "revision_id": str(employee.revision_id),
                    "employee_id": employee.employee_id,
                    "employee_name": employee.employee_name,
                    "car_amount": self._format_amount(employee.car_amount),
                    "receipt_amount": self._format_amount(employee.receipt_amount),
                    "validation_status": employee.validation_status.value,
                    "validation_flags": validation_flags,
                    "resolved_by": employee.resolved_by,
                    "resolution_notes": employee.resolution_notes,
                    "created_at": employee.created_at.isoformat() if employee.created_at else None,
                    "updated_at": employee.updated_at.isoformat() if employee.updated_at else None,
                    
                    # Additional computed fields for frontend
                    "has_issues": employee.validation_status == ValidationStatus.NEEDS_ATTENTION,
                    "is_resolved": employee.validation_status == ValidationStatus.RESOLVED,
                    "is_valid": employee.validation_status == ValidationStatus.VALID,
                    "amount_difference": self._calculate_amount_difference(employee),
                    
                    # Meta information
                    "source": employee.source or "system",
                    "confidence": employee.confidence if employee.confidence is not None else 1.0,
                }
                
                # Add delta information if available
                employee_data.update(delta_info)
                
                formatted_employees.append(employee_data)
                
            logger.info(f"Formatted {len(formatted_employees)} employee records")
            return formatted_employees
            
        except Exception as e:
            logger.error(f"Employee data formatting error: {str(e)}")
            raise ValueError(f"Failed to format employee data: {str(e)}")
    
    def format_session_summary(
        self, 
        session: ProcessingSession,
        total_employees: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Format session summary statistics
        
        Args:
            session: Processing session
            total_employees: Optional total count (if already computed)
            
        Returns:
            Formatted session summary dictionary
        """
        try:
            # Calculate statistics if not provided
            if total_employees is None:
                total_employees = self._count_employees_by_status(session.session_id)
                
            stats = self._calculate_session_statistics(session.session_id)
            
            # Calculate delta information
            delta_info = self._calculate_delta_session_info(session)
            
            # Build comprehensive summary
            summary = {
                # Basic session information
                "session_id": str(session.session_id),
                "session_name": session.session_name,
                "status": session.status.value,
                "created_by": session.created_by,
                "created_at": session.created_at.isoformat() if session.created_at else None,
                "updated_at": session.updated_at.isoformat() if session.updated_at else None,
                
                # Processing statistics
                "total_employees": stats["total_employees"],
                "ready_for_export": stats["ready_for_export"],
                "needs_attention": stats["needs_attention"],
                "resolved_issues": stats["resolved_issues"],
                "validation_success_rate": stats["validation_success_rate"],
                
                # Processing progress
                "completion_percentage": self._calculate_completion_percentage(stats),
                "processing_time": self._calculate_processing_time(session),
                
                # Issue analysis
                "issue_breakdown": self._analyze_issue_breakdown(session.session_id),
                "resolution_summary": self._get_resolution_summary(session.session_id),
                
                # Export readiness
                "export_ready": stats["ready_for_export"] + stats["resolved_issues"],
                "export_ready_percentage": self._calculate_export_ready_percentage(stats),
            }
            
            # Add delta information
            summary.update(delta_info)
            
            logger.info(f"Formatted session summary for session {session.session_name}")
            return summary
            
        except Exception as e:
            logger.error(f"Session summary formatting error: {str(e)}")
            raise ValueError(f"Failed to format session summary: {str(e)}")
    
    def format_complete_results(
        self,
        session: ProcessingSession,
        employees: List[EmployeeRevision],
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Format complete session results with all data
        
        Args:
            session: Processing session
            employees: List of employee revisions
            include_metadata: Whether to include additional metadata
            
        Returns:
            Complete formatted results dictionary
        """
        try:
            # Format employee data
            formatted_employees = self.format_employee_data(employees, session)
            
            # Format session summary
            session_summary = self.format_session_summary(session, len(employees))
            
            # Build complete results
            results = {
                "session_summary": session_summary,
                "employees": formatted_employees,
                "total_records": len(formatted_employees),
                "pagination": {
                    "total": len(formatted_employees),
                    "offset": 0,
                    "limit": len(formatted_employees)
                }
            }
            
            # Add metadata if requested
            if include_metadata:
                results["metadata"] = self._generate_results_metadata(session, employees)
            
            logger.info(f"Formatted complete results for session {session.session_name}")
            return results
            
        except Exception as e:
            logger.error(f"Complete results formatting error: {str(e)}")
            raise ValueError(f"Failed to format complete results: {str(e)}")
    
    def _format_amount(self, amount: Optional[Decimal]) -> Optional[float]:
        """Format decimal amount to float for JSON serialization"""
        return float(amount) if amount is not None else None
    
    def _calculate_amount_difference(self, employee: EmployeeRevision) -> Optional[float]:
        """Calculate difference between car and receipt amounts"""
        if employee.car_amount is not None and employee.receipt_amount is not None:
            return float(abs(employee.car_amount - employee.receipt_amount))
        return None
    
    def _enhance_validation_flags(self, validation_flags: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance validation flags with additional frontend-friendly information"""
        enhanced_flags = validation_flags.copy()
        
        # Add summary information
        if validation_flags:
            enhanced_flags["total_issues"] = validation_flags.get("total_issues", 0)
            enhanced_flags["highest_severity"] = validation_flags.get("highest_severity", "low")
            enhanced_flags["requires_review"] = validation_flags.get("requires_review", False)
            enhanced_flags["has_suggestions"] = any(
                isinstance(v, dict) and "suggestion" in v 
                for v in validation_flags.values()
            )
        
        return enhanced_flags
    
    def _get_employee_delta_info(
        self, 
        employee: EmployeeRevision, 
        session: ProcessingSession
    ) -> Dict[str, Any]:
        """Get delta change information for an employee"""
        if not session.delta_session_id:
            return {
                "delta_change": None,
                "delta_previous_values": None,
                "is_delta_change": False
            }
        
        # Enhanced delta detection logic
        delta_change = None
        delta_previous_values = None
        
        if employee.employee_id:
            # Detect change type based on employee ID patterns
            if employee.employee_id.startswith("NEW_"):
                delta_change = "new"
            elif employee.employee_id.startswith("MOD_"):
                delta_change = "modified"
                # In a real implementation, would query base session for previous values
                delta_previous_values = {
                    "car_amount": None,  # Would be populated from base session
                    "receipt_amount": None
                }
            elif employee.employee_id.startswith("REM_"):
                delta_change = "removed"
        
        return {
            "delta_change": delta_change,
            "delta_previous_values": delta_previous_values,
            "is_delta_change": delta_change is not None
        }
    
    def _count_employees_by_status(self, session_id: str) -> int:
        """Count total employees in session"""
        return self.db.query(func.count(EmployeeRevision.revision_id)).filter(
            EmployeeRevision.session_id == session_id
        ).scalar()
    
    def _calculate_session_statistics(self, session_id: str) -> Dict[str, Any]:
        """Calculate comprehensive session statistics"""
        # Count by validation status
        total_employees = self.db.query(func.count(EmployeeRevision.revision_id)).filter(
            EmployeeRevision.session_id == session_id
        ).scalar()
        
        ready_for_export = self.db.query(func.count(EmployeeRevision.revision_id)).filter(
            EmployeeRevision.session_id == session_id,
            EmployeeRevision.validation_status == ValidationStatus.VALID
        ).scalar()
        
        needs_attention = self.db.query(func.count(EmployeeRevision.revision_id)).filter(
            EmployeeRevision.session_id == session_id,
            EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
        ).scalar()
        
        resolved_issues = self.db.query(func.count(EmployeeRevision.revision_id)).filter(
            EmployeeRevision.session_id == session_id,
            EmployeeRevision.validation_status == ValidationStatus.RESOLVED
        ).scalar()
        
        # Calculate success rate
        validation_success_rate = (ready_for_export / total_employees * 100) if total_employees > 0 else 0
        
        return {
            "total_employees": total_employees,
            "ready_for_export": ready_for_export,
            "needs_attention": needs_attention,
            "resolved_issues": resolved_issues,
            "validation_success_rate": round(validation_success_rate, 2)
        }
    
    def _calculate_delta_session_info(self, session: ProcessingSession) -> Dict[str, Any]:
        """Calculate delta session information"""
        if not session.delta_session_id:
            return {
                "is_delta_session": False,
                "delta_base_session_name": None,
                "new_employees": 0,
                "modified_employees": 0,
                "removed_employees": 0,
                "delta_summary": "Not a delta session"
            }
        
        # Get base session info
        base_session = self.db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session.delta_session_id
        ).first()
        
        # Count delta changes
        current_employees = self.db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session.session_id
        ).all()
        
        # Enhanced delta calculation
        new_count = len([e for e in current_employees if e.employee_id and e.employee_id.startswith("NEW_")])
        modified_count = len([e for e in current_employees if e.employee_id and e.employee_id.startswith("MOD_")])
        removed_count = len([e for e in current_employees if e.employee_id and e.employee_id.startswith("REM_")])
        
        return {
            "is_delta_session": True,
            "delta_base_session_name": base_session.session_name if base_session else "Unknown",
            "new_employees": new_count,
            "modified_employees": modified_count,
            "removed_employees": removed_count,
            "delta_summary": f"{new_count} new, {modified_count} modified, {removed_count} removed"
        }
    
    def _calculate_completion_percentage(self, stats: Dict[str, Any]) -> float:
        """Calculate processing completion percentage"""
        total = stats["total_employees"]
        if total == 0:
            return 100.0
        
        completed = stats["ready_for_export"] + stats["resolved_issues"]
        return round((completed / total) * 100, 2)
    
    def _calculate_processing_time(self, session: ProcessingSession) -> Optional[str]:
        """Calculate processing time duration"""
        if session.created_at and session.updated_at:
            duration = session.updated_at - session.created_at
            total_seconds = int(duration.total_seconds())
            
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            
            if hours > 0:
                return f"{hours}h {minutes}m {seconds}s"
            elif minutes > 0:
                return f"{minutes}m {seconds}s"
            else:
                return f"{seconds}s"
        return None
    
    def _analyze_issue_breakdown(self, session_id: str) -> Dict[str, int]:
        """Analyze breakdown of validation issues"""
        # This would be enhanced with actual validation flag analysis
        employees_with_issues = self.db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session_id,
            EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
        ).all()
        
        issue_breakdown = {
            "amount_mismatch": 0,
            "missing_receipt": 0,
            "missing_employee_id": 0,
            "policy_violation": 0,
            "duplicate_employee": 0,
            "confidence_low": 0,
            "incomplete_data": 0
        }
        
        for employee in employees_with_issues:
            if employee.validation_flags:
                for issue_type in issue_breakdown.keys():
                    if employee.validation_flags.get(issue_type):
                        issue_breakdown[issue_type] += 1
        
        return issue_breakdown
    
    def _get_resolution_summary(self, session_id: str) -> Dict[str, Any]:
        """Get summary of resolution activities"""
        resolved_employees = self.db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session_id,
            EmployeeRevision.validation_status == ValidationStatus.RESOLVED
        ).all()
        
        resolvers = set()
        resolution_notes_count = 0
        
        for employee in resolved_employees:
            if employee.resolved_by:
                resolvers.add(employee.resolved_by)
            if employee.resolution_notes:
                resolution_notes_count += 1
        
        return {
            "total_resolved": len(resolved_employees),
            "unique_resolvers": len(resolvers),
            "with_notes": resolution_notes_count,
            "resolvers": list(resolvers)
        }
    
    def _calculate_export_ready_percentage(self, stats: Dict[str, Any]) -> float:
        """Calculate percentage of employees ready for export"""
        total = stats["total_employees"]
        if total == 0:
            return 0.0
        
        export_ready = stats["ready_for_export"] + stats["resolved_issues"]
        return round((export_ready / total) * 100, 2)
    
    def _generate_results_metadata(
        self, 
        session: ProcessingSession, 
        employees: List[EmployeeRevision]
    ) -> Dict[str, Any]:
        """Generate additional metadata for results"""
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "session_type": "delta" if session.delta_session_id else "full",
            "processing_engine_version": "3.0",
            "data_source_info": {
                "car_document_processed": any(e.source == "car_document" for e in employees),
                "receipt_document_processed": any(e.source == "receipt_document" for e in employees),
                "manual_entries": len([e for e in employees if e.source == "manual"])
            },
            "quality_metrics": {
                "avg_confidence": sum(e.confidence or 0 for e in employees) / len(employees) if employees else 0,
                "high_confidence_count": len([e for e in employees if (e.confidence or 0) >= 0.9]),
                "low_confidence_count": len([e for e in employees if (e.confidence or 0) < 0.7])
            }
        }


def create_results_formatter(db: Session) -> ResultsFormatter:
    """
    Factory function to create a ResultsFormatter instance
    
    Args:
        db: Database session
        
    Returns:
        ResultsFormatter instance
    """
    return ResultsFormatter(db)