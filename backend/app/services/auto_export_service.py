"""
Auto Export Service for Credit Card Processor

This service handles automatic generation of pVault CSV files and other exports
when processing completes, based on employee data completeness criteria.
"""

import csv
import io
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import SessionLocal
from ..models import (
    ProcessingSession, EmployeeRevision, SessionStatus, 
    ValidationStatus, FileUpload, ProcessingActivity, ActivityType
)
from ..websocket import notifier

logger = logging.getLogger(__name__)


class AutoExportService:
    """Service for automatic export generation after processing completion"""
    
    def __init__(self, db: Session = None):
        self.db = db or SessionLocal()
        self.close_db = db is None
    
    def __del__(self):
        """Clean up database connection if created internally"""
        if self.close_db and hasattr(self, 'db'):
            self.db.close()
    
    async def process_completion_exports(
        self, 
        session_id: str,
        notify_clients: bool = True
    ) -> Dict[str, Any]:
        """
        Generate all automatic exports after processing completion
        
        Args:
            session_id: UUID of the completed session
            notify_clients: Whether to send WebSocket notifications
            
        Returns:
            Dictionary with export results and statistics
        """
        try:
            results = {
                "session_id": session_id,
                "exports_generated": [],
                "statistics": {},
                "errors": []
            }
            
            # Get session data
            from uuid import UUID
            session_uuid = UUID(session_id)
            
            db_session = self.db.query(ProcessingSession).filter(
                ProcessingSession.session_id == session_uuid
            ).first()
            
            if not db_session:
                raise ValueError(f"Session {session_id} not found")
            
            if db_session.status != SessionStatus.COMPLETED:
                logger.warning(f"Session {session_id} is not completed, skipping auto-exports")
                return results
            
            # Get employee data
            employees = self.db.query(EmployeeRevision).filter(
                EmployeeRevision.session_id == session_uuid
            ).all()
            
            # Calculate statistics
            stats = self._calculate_export_statistics(employees)
            results["statistics"] = stats
            
            # Generate pVault CSV if we have ready employees
            if stats["ready_for_pvault"] > 0:
                try:
                    pvault_result = await self._generate_pvault_csv(
                        session_id, db_session, employees
                    )
                    results["exports_generated"].append(pvault_result)
                    
                    if notify_clients:
                        await notifier.notify_export_ready(
                            session_id,
                            "pVault CSV",
                            pvault_result["filename"],
                            pvault_result["download_url"]
                        )
                        
                except Exception as e:
                    error_msg = f"Failed to generate pVault CSV: {str(e)}"
                    logger.error(error_msg)
                    results["errors"].append(error_msg)
            
            # Generate exception report if we have issues
            if stats["need_attention"] > 0:
                try:
                    exception_result = await self._generate_exception_report(
                        session_id, db_session, employees
                    )
                    results["exports_generated"].append(exception_result)
                    
                    if notify_clients:
                        await notifier.notify_export_ready(
                            session_id,
                            "Exception Report",
                            exception_result["filename"],
                            exception_result["download_url"]
                        )
                        
                except Exception as e:
                    error_msg = f"Failed to generate exception report: {str(e)}"
                    logger.error(error_msg)
                    results["errors"].append(error_msg)
            
            # Log activity
            await self._log_export_activity(session_id, results)
            
            logger.info(f"Auto-export completed for session {session_id}: "
                       f"{len(results['exports_generated'])} files generated")
            
            return results
            
        except Exception as e:
            logger.error(f"Auto-export failed for session {session_id}: {str(e)}")
            raise
    
    def _calculate_export_statistics(self, employees: List[EmployeeRevision]) -> Dict[str, int]:
        """Calculate export statistics for employees"""
        stats = {
            "total_employees": len(employees),
            "ready_for_pvault": 0,
            "need_attention": 0,
            "missing_receipts": 0,
            "coding_incomplete": 0,
            "data_mismatches": 0
        }
        
        for emp in employees:
            # Check if ready for pVault export
            has_receipt_data = emp.receipt_amount and emp.receipt_amount > 0
            is_valid = emp.validation_status == ValidationStatus.VALID
            
            if has_receipt_data and is_valid:
                stats["ready_for_pvault"] += 1
            else:
                stats["need_attention"] += 1
                
                # Categorize issues
                if not has_receipt_data:
                    stats["missing_receipts"] += 1
                
                if emp.validation_status == ValidationStatus.NEEDS_ATTENTION:
                    if emp.validation_flags:
                        flags = emp.validation_flags
                        if flags.get("coding_incomplete"):
                            stats["coding_incomplete"] += 1
                        if flags.get("amount_mismatch"):
                            stats["data_mismatches"] += 1
        
        return stats
    
    async def _generate_pvault_csv(
        self,
        session_id: str,
        db_session: ProcessingSession,
        employees: List[EmployeeRevision]
    ) -> Dict[str, Any]:
        """Generate pVault-compatible CSV file for ready employees"""
        
        # Filter employees ready for pVault
        ready_employees = [
            emp for emp in employees
            if (emp.receipt_amount and emp.receipt_amount > 0 and 
                emp.validation_status == ValidationStatus.VALID)
        ]
        
        if not ready_employees:
            raise ValueError("No employees ready for pVault export")
        
        # Generate CSV content
        csv_content = self._create_pvault_csv_content(ready_employees)
        
        # Create filename
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        session_name = db_session.session_name.replace(" ", "_") if db_session.session_name else "Session"
        filename = f"pVault_{session_name}_{session_id[:8]}_{timestamp}.csv"
        
        # Save file (in production, this would save to proper storage)
        file_path = Path(f"/tmp/{filename}")  # This should be configurable
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            f.write(csv_content)
        
        return {
            "type": "pVault_CSV",
            "filename": filename,
            "file_path": str(file_path),
            "record_count": len(ready_employees),
            "file_size": file_path.stat().st_size if file_path.exists() else 0,
            "download_url": f"/api/export/download/{session_id}/pvault/{filename}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _create_pvault_csv_content(self, employees: List[EmployeeRevision]) -> str:
        """Create pVault-compatible CSV content"""
        output = io.StringIO()
        
        # pVault CSV headers (adjust based on actual pVault requirements)
        headers = [
            "Employee_ID",
            "Employee_Name",
            "Department",
            "Amount",
            "Receipt_Total",
            "Processing_Date",
            "Validation_Status"
        ]
        
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for emp in employees:
            writer.writerow({
                "Employee_ID": emp.employee_id or "",
                "Employee_Name": emp.employee_name or "",
                "Department": emp.validation_flags.get("department", "") if emp.validation_flags else "",
                "Amount": float(emp.car_amount) if emp.car_amount else 0.0,
                "Receipt_Total": float(emp.receipt_amount) if emp.receipt_amount else 0.0,
                "Processing_Date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "Validation_Status": emp.validation_status.value
            })
        
        return output.getvalue()
    
    async def _generate_exception_report(
        self,
        session_id: str,
        db_session: ProcessingSession,
        employees: List[EmployeeRevision]
    ) -> Dict[str, Any]:
        """Generate exception report for employees needing attention"""
        
        # Filter employees with issues
        problem_employees = [
            emp for emp in employees
            if (not emp.receipt_amount or emp.receipt_amount <= 0 or 
                emp.validation_status != ValidationStatus.VALID)
        ]
        
        if not problem_employees:
            raise ValueError("No employees with issues found")
        
        # Generate CSV content
        csv_content = self._create_exception_csv_content(problem_employees)
        
        # Create filename
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        session_name = db_session.session_name.replace(" ", "_") if db_session.session_name else "Session"
        filename = f"Exceptions_{session_name}_{session_id[:8]}_{timestamp}.csv"
        
        # Save file
        file_path = Path(f"/tmp/{filename}")
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            f.write(csv_content)
        
        return {
            "type": "Exception_Report",
            "filename": filename,
            "file_path": str(file_path),
            "record_count": len(problem_employees),
            "file_size": file_path.stat().st_size if file_path.exists() else 0,
            "download_url": f"/api/export/download/{session_id}/exceptions/{filename}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _create_exception_csv_content(self, employees: List[EmployeeRevision]) -> str:
        """Create exception report CSV content"""
        output = io.StringIO()
        
        headers = [
            "Employee_ID",
            "Employee_Name",
            "Issue_Type",
            "Issue_Description",
            "CAR_Amount",
            "Receipt_Amount",
            "Validation_Status",
            "Required_Action"
        ]
        
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for emp in employees:
            # Determine issue type and description
            issue_type, issue_desc, required_action = self._analyze_employee_issues(emp)
            
            writer.writerow({
                "Employee_ID": emp.employee_id or "",
                "Employee_Name": emp.employee_name or "",
                "Issue_Type": issue_type,
                "Issue_Description": issue_desc,
                "CAR_Amount": float(emp.car_amount) if emp.car_amount else 0.0,
                "Receipt_Amount": float(emp.receipt_amount) if emp.receipt_amount else 0.0,
                "Validation_Status": emp.validation_status.value,
                "Required_Action": required_action
            })
        
        return output.getvalue()
    
    def _analyze_employee_issues(self, emp: EmployeeRevision) -> Tuple[str, str, str]:
        """Analyze employee issues and return categorized information"""
        
        if not emp.receipt_amount or emp.receipt_amount <= 0:
            return (
                "Missing Receipts",
                f"No receipt data found (Receipt amount: ${emp.receipt_amount or 0})",
                "Upload missing receipts"
            )
        
        if emp.validation_status == ValidationStatus.NEEDS_ATTENTION:
            flags = emp.validation_flags or {}
            
            if flags.get("coding_incomplete"):
                return (
                    "Coding Issues",
                    "Expense coding is incomplete",
                    "Complete expense category coding"
                )
            
            if flags.get("amount_mismatch"):
                return (
                    "Data Mismatch", 
                    f"CAR amount (${emp.car_amount}) doesn't match receipt amount (${emp.receipt_amount})",
                    "Review and correct amount discrepancies"
                )
        
        return (
            "Validation Error",
            "Employee data failed validation checks",
            "Review employee data for accuracy"
        )
    
    async def _log_export_activity(self, session_id: str, results: Dict[str, Any]):
        """Log export activity to database"""
        try:
            from uuid import UUID
            session_uuid = UUID(session_id)
            
            activity_message = (
                f"Auto-export completed: {len(results['exports_generated'])} files generated, "
                f"{results['statistics']['ready_for_pvault']} employees ready for pVault"
            )
            
            activity = ProcessingActivity(
                session_id=session_uuid,
                activity_type=ActivityType.EXPORT,
                activity_message=activity_message,
                created_by="auto_export_service"
            )
            
            self.db.add(activity)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to log export activity: {str(e)}")


# Global service instance
auto_export_service = AutoExportService()


async def trigger_auto_exports(session_id: str, notify_clients: bool = True) -> Dict[str, Any]:
    """
    Trigger automatic exports for a completed session
    
    Args:
        session_id: Session UUID
        notify_clients: Whether to send WebSocket notifications
        
    Returns:
        Export results dictionary
    """
    return await auto_export_service.process_completion_exports(session_id, notify_clients)