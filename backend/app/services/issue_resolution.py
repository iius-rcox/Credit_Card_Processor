#!/usr/bin/env python3
"""
Issue Resolution Manager for Credit Card Processor

Provides centralized issue resolution logic and workflow management.
Handles resolution tracking, logging, and status updates.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from enum import Enum
from sqlalchemy.orm import Session

from ..models import (
    EmployeeRevision, 
    ProcessingSession, 
    ProcessingActivity, 
    ValidationStatus,
    ActivityType
)

logger = logging.getLogger(__name__)


class ResolutionType(str, Enum):
    """Resolution types for issue management"""
    RESOLVED = "resolved"      # Issue has been fully resolved
    PENDING = "pending"        # Issue acknowledged but pending action
    ESCALATED = "escalated"    # Issue escalated to supervisor/admin
    AUTO_RESOLVED = "auto_resolved"  # Issue resolved automatically


class ResolutionPriority(str, Enum):
    """Priority levels for issue resolution"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueResolutionManager:
    """
    Centralized manager for issue resolution workflow
    
    Handles:
    - Individual and bulk issue resolution
    - Resolution tracking and logging
    - Status updates and workflow management
    - Resolution statistics and reporting
    """
    
    def __init__(self, db: Session):
        """
        Initialize issue resolution manager
        
        Args:
            db: Database session
        """
        self.db = db
        logger.info("Issue Resolution Manager initialized")
    
    def resolve_issue(
        self,
        revision_id: str,
        resolved_by: str,
        resolution_type: ResolutionType = ResolutionType.RESOLVED,
        resolution_notes: Optional[str] = None,
        priority: ResolutionPriority = ResolutionPriority.MEDIUM
    ) -> Dict[str, Any]:
        """
        Resolve an issue for a specific employee revision
        
        Args:
            revision_id: Employee revision UUID
            resolved_by: Username of resolver
            resolution_type: Type of resolution
            resolution_notes: Optional resolution notes
            priority: Resolution priority level
            
        Returns:
            Dictionary with resolution result details
        """
        try:
            # Get employee revision
            employee = self.db.query(EmployeeRevision).filter(
                EmployeeRevision.revision_id == revision_id
            ).first()
            
            if not employee:
                return {
                    "success": False,
                    "message": "Employee revision not found",
                    "revision_id": revision_id,
                    "resolved_by": resolved_by,
                    "timestamp": datetime.now(timezone.utc)
                }
            
            # Check if already resolved
            if employee.validation_status == ValidationStatus.RESOLVED:
                return {
                    "success": True,
                    "message": "Issue already resolved",
                    "revision_id": revision_id,
                    "resolved_by": employee.resolved_by or resolved_by,
                    "timestamp": employee.updated_at,
                    "resolution_type": ResolutionType.RESOLVED.value,
                    "already_resolved": True
                }
            
            # Check if there are issues to resolve
            if employee.validation_status != ValidationStatus.NEEDS_ATTENTION:
                return {
                    "success": False,
                    "message": "No issues requiring resolution",
                    "revision_id": revision_id,
                    "resolved_by": resolved_by,
                    "timestamp": datetime.now(timezone.utc),
                    "current_status": employee.validation_status.value
                }
            
            # Resolve the issue
            original_status = employee.validation_status
            employee.validation_status = ValidationStatus.RESOLVED
            employee.resolved_by = resolved_by
            employee.resolution_notes = resolution_notes
            employee.updated_at = datetime.now(timezone.utc)
            
            # Log resolution activity
            activity_message = f"Issue resolved for {employee.employee_name} ({employee.employee_id})"
            if resolution_notes:
                activity_message += f" - Notes: {resolution_notes[:100]}..."
            
            activity = ProcessingActivity(
                session_id=employee.session_id,
                activity_type=ActivityType.RESOLUTION,
                activity_message=activity_message,
                employee_id=employee.employee_id,
                created_by=resolved_by
            )
            self.db.add(activity)
            
            # Create resolution record
            resolution_result = {
                "success": True,
                "message": f"Issue resolved successfully ({resolution_type.value})",
                "revision_id": revision_id,
                "resolved_by": resolved_by,
                "timestamp": employee.updated_at,
                "resolution_type": resolution_type.value,
                "priority": priority.value,
                "original_status": original_status.value,
                "new_status": ValidationStatus.RESOLVED.value,
                "employee_name": employee.employee_name,
                "employee_id": employee.employee_id
            }
            
            if resolution_notes:
                resolution_result["resolution_notes"] = resolution_notes
            
            # Commit changes
            self.db.commit()
            
            logger.info(f"Issue resolved for revision {revision_id} by {resolved_by}")
            return resolution_result
            
        except Exception as e:
            self.db.rollback()
            error_message = f"Resolution failed: {str(e)}"
            logger.error(f"Issue resolution error for revision {revision_id}: {error_message}")
            
            return {
                "success": False,
                "message": error_message,
                "revision_id": revision_id,
                "resolved_by": resolved_by,
                "timestamp": datetime.now(timezone.utc),
                "error": str(e)
            }
    
    def resolve_multiple_issues(
        self,
        revision_ids: List[str],
        resolved_by: str,
        resolution_type: ResolutionType = ResolutionType.RESOLVED,
        resolution_notes: Optional[str] = None,
        priority: ResolutionPriority = ResolutionPriority.MEDIUM
    ) -> Dict[str, Any]:
        """
        Resolve multiple issues in a batch operation
        
        Args:
            revision_ids: List of revision UUIDs to resolve
            resolved_by: Username of resolver
            resolution_type: Type of resolution
            resolution_notes: Optional resolution notes
            priority: Resolution priority level
            
        Returns:
            Dictionary with batch resolution results
        """
        results = []
        successful_count = 0
        failed_count = 0
        
        try:
            for revision_id in revision_ids:
                result = self.resolve_issue(
                    revision_id=revision_id,
                    resolved_by=resolved_by,
                    resolution_type=resolution_type,
                    resolution_notes=resolution_notes,
                    priority=priority
                )
                
                results.append(result)
                if result["success"]:
                    successful_count += 1
                else:
                    failed_count += 1
            
            return {
                "total_requested": len(revision_ids),
                "successful_resolutions": successful_count,
                "failed_resolutions": failed_count,
                "results": results,
                "message": f"Batch resolution completed: {successful_count} successful, {failed_count} failed",
                "resolved_by": resolved_by,
                "timestamp": datetime.now(timezone.utc),
                "resolution_type": resolution_type.value,
                "priority": priority.value
            }
            
        except Exception as e:
            error_message = f"Batch resolution failed: {str(e)}"
            logger.error(f"Batch resolution error: {error_message}")
            
            return {
                "total_requested": len(revision_ids),
                "successful_resolutions": successful_count,
                "failed_resolutions": failed_count,
                "results": results,
                "message": error_message,
                "resolved_by": resolved_by,
                "timestamp": datetime.now(timezone.utc),
                "error": str(e)
            }
    
    def get_resolution_statistics(self, session_id: str) -> Dict[str, Any]:
        """
        Get resolution statistics for a session
        
        Args:
            session_id: Processing session UUID
            
        Returns:
            Dictionary with resolution statistics
        """
        try:
            from sqlalchemy import func
            
            # Get session
            session = self.db.query(ProcessingSession).filter(
                ProcessingSession.session_id == session_id
            ).first()
            
            if not session:
                return {
                    "success": False,
                    "message": "Session not found",
                    "session_id": session_id
                }
            
            # Count by validation status
            status_counts = self.db.query(
                EmployeeRevision.validation_status,
                func.count(EmployeeRevision.revision_id).label('count')
            ).filter(
                EmployeeRevision.session_id == session_id
            ).group_by(EmployeeRevision.validation_status).all()
            
            statistics = {
                "session_id": session_id,
                "session_name": session.session_name,
                "total_employees": sum(count for _, count in status_counts),
                "valid_employees": 0,
                "needs_attention": 0,
                "resolved_employees": 0,
                "resolution_rate": 0.0,
                "pending_issues": 0
            }
            
            # Process status counts
            for status, count in status_counts:
                if status == ValidationStatus.VALID:
                    statistics["valid_employees"] = count
                elif status == ValidationStatus.NEEDS_ATTENTION:
                    statistics["needs_attention"] = count
                    statistics["pending_issues"] = count
                elif status == ValidationStatus.RESOLVED:
                    statistics["resolved_employees"] = count
            
            # Calculate resolution rate
            total_issues = statistics["needs_attention"] + statistics["resolved_employees"]
            if total_issues > 0:
                statistics["resolution_rate"] = round(
                    (statistics["resolved_employees"] / total_issues) * 100, 2
                )
            
            # Get resolution activities
            resolution_activities = self.db.query(ProcessingActivity).filter(
                ProcessingActivity.session_id == session_id,
                ProcessingActivity.activity_type == ActivityType.RESOLUTION
            ).count()
            
            statistics["total_resolution_activities"] = resolution_activities
            statistics["success"] = True
            
            return statistics
            
        except Exception as e:
            error_message = f"Statistics retrieval failed: {str(e)}"
            logger.error(f"Resolution statistics error for session {session_id}: {error_message}")
            
            return {
                "success": False,
                "message": error_message,
                "session_id": session_id,
                "error": str(e)
            }
    
    def get_pending_issues(
        self, 
        session_id: str, 
        limit: int = 100,
        priority_filter: Optional[ResolutionPriority] = None
    ) -> Dict[str, Any]:
        """
        Get list of pending issues for a session
        
        Args:
            session_id: Processing session UUID
            limit: Maximum number of issues to return
            priority_filter: Optional priority level filter
            
        Returns:
            Dictionary with pending issues list
        """
        try:
            # Get pending issues
            query = self.db.query(EmployeeRevision).filter(
                EmployeeRevision.session_id == session_id,
                EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
            )
            
            # Apply limit
            pending_employees = query.limit(limit).all()
            
            issues = []
            for employee in pending_employees:
                issue = {
                    "revision_id": str(employee.revision_id),
                    "employee_id": employee.employee_id,
                    "employee_name": employee.employee_name,
                    "validation_status": employee.validation_status.value,
                    "validation_flags": employee.validation_flags or {},
                    "car_amount": float(employee.car_amount) if employee.car_amount else None,
                    "receipt_amount": float(employee.receipt_amount) if employee.receipt_amount else None,
                    "created_at": employee.created_at,
                    "updated_at": employee.updated_at
                }
                
                # Add priority based on validation flags
                if employee.validation_flags:
                    highest_severity = employee.validation_flags.get("highest_severity", "low")
                    if highest_severity in ["critical", "high"]:
                        issue["priority"] = ResolutionPriority.HIGH.value
                    elif highest_severity == "medium":
                        issue["priority"] = ResolutionPriority.MEDIUM.value
                    else:
                        issue["priority"] = ResolutionPriority.LOW.value
                else:
                    issue["priority"] = ResolutionPriority.LOW.value
                
                issues.append(issue)
            
            # Sort by priority and creation date
            priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            issues.sort(key=lambda x: (priority_order.get(x["priority"], 3), x["created_at"]))
            
            return {
                "success": True,
                "session_id": session_id,
                "total_pending": len(pending_employees),
                "issues": issues,
                "message": f"Retrieved {len(issues)} pending issues"
            }
            
        except Exception as e:
            error_message = f"Pending issues retrieval failed: {str(e)}"
            logger.error(f"Pending issues error for session {session_id}: {error_message}")
            
            return {
                "success": False,
                "message": error_message,
                "session_id": session_id,
                "error": str(e)
            }


def create_issue_resolution_manager(db: Session) -> IssueResolutionManager:
    """
    Factory function to create an IssueResolutionManager instance
    
    Args:
        db: Database session
        
    Returns:
        IssueResolutionManager instance
    """
    return IssueResolutionManager(db)