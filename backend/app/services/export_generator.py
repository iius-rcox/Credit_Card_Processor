#!/usr/bin/env python3
"""
Export Generator for Credit Card Processor

Provides comprehensive export generation services for multiple file formats.
Handles pVault CSV exports, follow-up Excel reports, and issue PDF reports
with proper formatting and MIME type handling.
"""

import io
import csv
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple, BinaryIO
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

# Optional dependencies
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from ..models import (
    ProcessingSession,
    EmployeeRevision,
    ProcessingActivity,
    ValidationStatus,
    ActivityType
)

logger = logging.getLogger(__name__)


class ExportGenerator:
    """
    Comprehensive export generation service
    
    Handles:
    - pVault CSV export generation with proper formatting
    - Follow-up Excel reports for manual review
    - Issues PDF reports for management
    - File download preparation with correct MIME types
    - Export activity logging and tracking
    """
    
    def __init__(self, db: Session):
        """
        Initialize export generator
        
        Args:
            db: Database session
        """
        self.db = db
        logger.info("Export Generator initialized")
    
    def generate_pvault_csv(
        self,
        session: ProcessingSession,
        include_resolved: bool = True,
        include_validation_details: bool = False
    ) -> Tuple[io.StringIO, str]:
        """
        Generate pVault-compatible CSV file
        
        Args:
            session: Processing session
            include_resolved: Whether to include resolved issues
            include_validation_details: Whether to include validation flags
            
        Returns:
            Tuple of (StringIO buffer, filename)
        """
        try:
            # Get employees for export
            employees = self._get_employees_for_export(session, include_resolved)
            
            # Create CSV buffer
            csv_buffer = io.StringIO()
            
            # Define CSV headers for pVault compatibility
            headers = [
                "Employee_ID",
                "Employee_Name", 
                "Car_Allowance_Amount",
                "Receipt_Amount",
                "Amount_Difference",
                "Validation_Status",
                "Department",
                "Position",
                "Manager",
                "Cost_Center",
                "Processing_Date",
                "Source_Document",
                "Confidence_Score",
                "Resolved_By",
                "Resolution_Notes"
            ]
            
            # Add validation details if requested
            if include_validation_details:
                headers.extend([
                    "Validation_Issues",
                    "Issue_Count",
                    "Highest_Severity",
                    "Requires_Review"
                ])
            
            writer = csv.writer(csv_buffer)
            writer.writerow(headers)
            
            # Write employee data
            for employee in employees:
                row_data = [
                    employee.employee_id or "",
                    employee.employee_name or "",
                    self._format_amount_for_csv(employee.car_amount),
                    self._format_amount_for_csv(employee.receipt_amount),
                    self._calculate_amount_difference_csv(employee),
                    employee.validation_status.value if employee.validation_status else "unknown",
                    getattr(employee, 'department', '') or "",
                    getattr(employee, 'position', '') or "",
                    getattr(employee, 'manager', '') or "",
                    getattr(employee, 'cost_center', '') or "",
                    employee.created_at.strftime("%Y-%m-%d %H:%M:%S") if employee.created_at else "",
                    employee.source or "system",
                    employee.confidence if employee.confidence is not None else 1.0,
                    employee.resolved_by or "",
                    employee.resolution_notes or ""
                ]
                
                # Add validation details if requested
                if include_validation_details:
                    flags = employee.validation_flags or {}
                    row_data.extend([
                        self._format_validation_issues_csv(flags),
                        flags.get("total_issues", 0),
                        flags.get("highest_severity", "none"),
                        flags.get("requires_review", False)
                    ])
                
                writer.writerow(row_data)
            
            # Generate filename
            filename = self._generate_filename(session, "pvault", "csv")
            
            logger.info(f"Generated pVault CSV with {len(employees)} employees for session {session.session_name}")
            return csv_buffer, filename
            
        except Exception as e:
            logger.error(f"pVault CSV generation error: {str(e)}")
            raise ValueError(f"Failed to generate pVault CSV: {str(e)}")
    
    def generate_followup_excel(
        self,
        session: ProcessingSession,
        include_summary: bool = True
    ) -> Tuple[io.BytesIO, str]:
        """
        Generate follow-up Excel report
        
        Args:
            session: Processing session
            include_summary: Whether to include summary sheet
            
        Returns:
            Tuple of (BytesIO buffer, filename)
        """
        if not PANDAS_AVAILABLE:
            raise ValueError("Excel export not available - pandas not installed")
        
        try:
            # Get employees needing attention
            employees = self._get_employees_needing_attention(session)
            
            # Create Excel buffer
            excel_buffer = io.BytesIO()
            
            # Prepare data for Excel
            excel_data = []
            for employee in employees:
                flags = employee.validation_flags or {}
                
                row = {
                    "Employee ID": employee.employee_id,
                    "Employee Name": employee.employee_name,
                    "Car Amount": self._format_amount_for_excel(employee.car_amount),
                    "Receipt Amount": self._format_amount_for_excel(employee.receipt_amount),
                    "Amount Difference": self._calculate_amount_difference_excel(employee),
                    "Validation Status": employee.validation_status.value if employee.validation_status else "unknown",
                    "Issues Summary": self._format_validation_issues_excel(flags),
                    "Issue Count": flags.get("total_issues", 0),
                    "Highest Severity": flags.get("highest_severity", "none"),
                    "Requires Review": "Yes" if flags.get("requires_review", False) else "No",
                    "Source": employee.source or "system",
                    "Confidence": employee.confidence if employee.confidence is not None else 1.0,
                    "Created Date": employee.created_at.strftime("%Y-%m-%d") if employee.created_at else "",
                    "Updated Date": employee.updated_at.strftime("%Y-%m-%d") if employee.updated_at else "",
                    "Resolution Action": self._suggest_resolution_action(employee),
                    "Priority": self._determine_issue_priority(flags)
                }
                excel_data.append(row)
            
            # Create Excel workbook with pandas
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                # Main data sheet
                df = pd.DataFrame(excel_data)
                df.to_excel(writer, sheet_name='Follow-up Actions', index=False)
                
                # Summary sheet if requested
                if include_summary:
                    summary_data = self._generate_summary_data(session, employees)
                    summary_df = pd.DataFrame(summary_data)
                    summary_df.to_excel(writer, sheet_name='Summary', index=False)
                
                # Format worksheets
                self._format_excel_worksheets(writer, df, include_summary)
            
            # Generate filename
            filename = self._generate_filename(session, "followup", "xlsx")
            
            logger.info(f"Generated follow-up Excel with {len(employees)} employees for session {session.session_name}")
            return excel_buffer, filename
            
        except Exception as e:
            logger.error(f"Follow-up Excel generation error: {str(e)}")
            raise ValueError(f"Failed to generate follow-up Excel: {str(e)}")
    
    def generate_issues_report(
        self,
        session: ProcessingSession,
        include_statistics: bool = True,
        include_recommendations: bool = True
    ) -> Tuple[io.BytesIO, str]:
        """
        Generate detailed issues PDF report
        
        Args:
            session: Processing session
            include_statistics: Whether to include statistics
            include_recommendations: Whether to include recommendations
            
        Returns:
            Tuple of (BytesIO buffer, filename)
        """
        if not REPORTLAB_AVAILABLE:
            raise ValueError("PDF export not available - reportlab not installed")
        
        try:
            # Create PDF buffer
            pdf_buffer = io.BytesIO()
            
            # Create PDF document
            doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, 
                                  rightMargin=72, leftMargin=72, 
                                  topMargin=72, bottomMargin=18)
            
            # Build content
            story = []
            styles = getSampleStyleSheet()
            
            # Title
            title = Paragraph(f"Issues Report - {session.session_name}", styles['Title'])
            story.append(title)
            story.append(Spacer(1, 12))
            
            # Session information
            session_info = self._generate_session_info_content(session, styles)
            story.extend(session_info)
            
            # Statistics section
            if include_statistics:
                stats_content = self._generate_statistics_content(session, styles)
                story.extend(stats_content)
            
            # Issues breakdown
            issues_content = self._generate_issues_breakdown_content(session, styles)
            story.extend(issues_content)
            
            # Detailed issues table
            issues_table = self._generate_issues_table(session)
            if issues_table:
                story.append(issues_table)
                story.append(Spacer(1, 12))
            
            # Recommendations section
            if include_recommendations:
                recommendations_content = self._generate_recommendations_content(session, styles)
                story.extend(recommendations_content)
            
            # Build PDF
            doc.build(story)
            
            # Generate filename
            filename = self._generate_filename(session, "issues", "pdf")
            
            logger.info(f"Generated issues PDF report for session {session.session_name}")
            return pdf_buffer, filename
            
        except Exception as e:
            logger.error(f"Issues PDF generation error: {str(e)}")
            raise ValueError(f"Failed to generate issues PDF: {str(e)}")
    
    def get_export_mime_type(self, export_type: str) -> str:
        """
        Get MIME type for export format
        
        Args:
            export_type: Export format (csv, excel, pdf)
            
        Returns:
            MIME type string
        """
        mime_types = {
            "csv": "text/csv",
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pdf": "application/pdf"
        }
        return mime_types.get(export_type.lower(), "application/octet-stream")
    
    def log_export_activity(
        self,
        session_id: str,
        export_type: str,
        filename: str,
        username: str,
        file_size: Optional[int] = None
    ) -> None:
        """
        Log export activity to database
        
        Args:
            session_id: Session UUID
            export_type: Type of export (csv, excel, pdf)
            filename: Generated filename
            username: User who performed export
            file_size: Optional file size in bytes
        """
        try:
            activity_message = f"Generated {export_type} export: {filename}"
            if file_size:
                activity_message += f" ({file_size} bytes)"
            
            activity = ProcessingActivity(
                session_id=session_id,
                activity_type=ActivityType.EXPORT,
                activity_message=activity_message,
                created_by=username
            )
            self.db.add(activity)
            self.db.commit()
            
            logger.info(f"Logged export activity: {export_type} for session {session_id}")
            
        except Exception as e:
            logger.error(f"Export activity logging error: {str(e)}")
    
    # Private helper methods
    
    def _get_employees_for_export(
        self,
        session: ProcessingSession,
        include_resolved: bool = True
    ) -> List[EmployeeRevision]:
        """Get employees for export based on criteria"""
        query = self.db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session.session_id
        )
        
        if include_resolved:
            # Include valid and resolved employees
            query = query.filter(
                EmployeeRevision.validation_status.in_([
                    ValidationStatus.VALID,
                    ValidationStatus.RESOLVED
                ])
            )
        else:
            # Only valid employees
            query = query.filter(
                EmployeeRevision.validation_status == ValidationStatus.VALID
            )
        
        return query.all()
    
    def _get_employees_needing_attention(self, session: ProcessingSession) -> List[EmployeeRevision]:
        """Get employees that need manual attention"""
        return self.db.query(EmployeeRevision).filter(
            EmployeeRevision.session_id == session.session_id,
            EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
        ).all()
    
    def _format_amount_for_csv(self, amount: Optional[Decimal]) -> str:
        """Format amount for CSV output"""
        if amount is None:
            return ""
        return f"{float(amount):.2f}"
    
    def _format_amount_for_excel(self, amount: Optional[Decimal]) -> Optional[float]:
        """Format amount for Excel output"""
        return float(amount) if amount is not None else None
    
    def _calculate_amount_difference_csv(self, employee: EmployeeRevision) -> str:
        """Calculate amount difference for CSV"""
        if employee.car_amount is not None and employee.receipt_amount is not None:
            diff = abs(employee.car_amount - employee.receipt_amount)
            return f"{float(diff):.2f}"
        return ""
    
    def _calculate_amount_difference_excel(self, employee: EmployeeRevision) -> Optional[float]:
        """Calculate amount difference for Excel"""
        if employee.car_amount is not None and employee.receipt_amount is not None:
            diff = abs(employee.car_amount - employee.receipt_amount)
            return float(diff)
        return None
    
    def _format_validation_issues_csv(self, flags: Dict[str, Any]) -> str:
        """Format validation issues for CSV"""
        issues = []
        issue_types = ["amount_mismatch", "missing_receipt", "missing_employee_id", 
                      "policy_violation", "duplicate_employee", "confidence_low", 
                      "incomplete_data"]
        
        for issue_type in issue_types:
            if flags.get(issue_type):
                issues.append(issue_type.replace("_", " ").title())
        
        return "; ".join(issues)
    
    def _format_validation_issues_excel(self, flags: Dict[str, Any]) -> str:
        """Format validation issues for Excel"""
        return self._format_validation_issues_csv(flags)
    
    def _suggest_resolution_action(self, employee: EmployeeRevision) -> str:
        """Suggest resolution action based on issues"""
        flags = employee.validation_flags or {}
        
        if flags.get("amount_mismatch"):
            return "Verify amounts with original documents"
        elif flags.get("missing_receipt"):
            return "Request receipt from employee"
        elif flags.get("missing_employee_id"):
            return "Look up employee ID in HR system"
        elif flags.get("policy_violation"):
            return "Review with supervisor for approval"
        elif flags.get("duplicate_employee"):
            return "Consolidate duplicate entries"
        elif flags.get("confidence_low"):
            return "Manual review of document processing"
        elif flags.get("incomplete_data"):
            return "Complete missing information"
        else:
            return "General review required"
    
    def _determine_issue_priority(self, flags: Dict[str, Any]) -> str:
        """Determine issue priority level"""
        severity = flags.get("highest_severity", "low")
        
        if severity == "critical":
            return "High"
        elif severity == "high":
            return "High"
        elif severity == "medium":
            return "Medium"
        else:
            return "Low"
    
    def _generate_filename(self, session: ProcessingSession, export_type: str, extension: str) -> str:
        """Generate standardized filename"""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_session_name = "".join(c for c in session.session_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_session_name = safe_session_name.replace(' ', '_')
        
        return f"Session_{str(session.session_id)[:8]}_{safe_session_name}_{export_type}_{timestamp}.{extension}"
    
    def _generate_summary_data(self, session: ProcessingSession, employees: List[EmployeeRevision]) -> List[Dict[str, Any]]:
        """Generate summary data for Excel"""
        total_issues = len(employees)
        issue_breakdown = {}
        
        for employee in employees:
            flags = employee.validation_flags or {}
            for issue_type in ["amount_mismatch", "missing_receipt", "missing_employee_id", 
                             "policy_violation", "duplicate_employee", "confidence_low", "incomplete_data"]:
                if flags.get(issue_type):
                    issue_breakdown[issue_type] = issue_breakdown.get(issue_type, 0) + 1
        
        summary = [
            {"Metric": "Total Issues", "Value": total_issues},
            {"Metric": "Session Name", "Value": session.session_name},
            {"Metric": "Created Date", "Value": session.created_at.strftime("%Y-%m-%d") if session.created_at else ""},
            {"Metric": "Created By", "Value": session.created_by}
        ]
        
        # Add issue breakdown
        for issue_type, count in issue_breakdown.items():
            summary.append({
                "Metric": issue_type.replace("_", " ").title(),
                "Value": count
            })
        
        return summary
    
    def _format_excel_worksheets(self, writer: Any, df: Any, include_summary: bool) -> None:
        """Format Excel worksheets for better presentation"""
        if not PANDAS_AVAILABLE:
            return
        
        try:
            # Access workbook and worksheets
            workbook = writer.book
            worksheet = writer.sheets['Follow-up Actions']
            
            # Auto-adjust column widths
            for column in worksheet.columns:
                max_length = 0
                column = [cell for cell in column]
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = (max_length + 2)
                worksheet.column_dimensions[column[0].column_letter].width = adjusted_width
                
        except Exception as e:
            logger.warning(f"Excel formatting error: {str(e)}")
    
    def _generate_session_info_content(self, session: ProcessingSession, styles: Any) -> List[Any]:
        """Generate session information content for PDF"""
        content = []
        
        # Session details
        session_header = Paragraph("Session Information", styles['Heading2'])
        content.append(session_header)
        content.append(Spacer(1, 12))
        
        session_data = [
            ["Session Name:", session.session_name],
            ["Session ID:", str(session.session_id)],
            ["Status:", session.status.value if session.status else "Unknown"],
            ["Created By:", session.created_by],
            ["Created Date:", session.created_at.strftime("%Y-%m-%d %H:%M:%S") if session.created_at else ""],
            ["Last Updated:", session.updated_at.strftime("%Y-%m-%d %H:%M:%S") if session.updated_at else ""]
        ]
        
        session_table = Table(session_data, colWidths=[2*inch, 3*inch])
        session_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        
        content.append(session_table)
        content.append(Spacer(1, 20))
        
        return content
    
    def _generate_statistics_content(self, session: ProcessingSession, styles: Any) -> List[Any]:
        """Generate statistics content for PDF"""
        # This would include comprehensive statistics
        content = []
        
        stats_header = Paragraph("Processing Statistics", styles['Heading2'])
        content.append(stats_header)
        content.append(Spacer(1, 12))
        
        # Add placeholder statistics table
        # In real implementation, would calculate actual statistics
        
        return content
    
    def _generate_issues_breakdown_content(self, session: ProcessingSession, styles: Any) -> List[Any]:
        """Generate issues breakdown content for PDF"""
        content = []
        
        issues_header = Paragraph("Issues Breakdown", styles['Heading2'])
        content.append(issues_header)
        content.append(Spacer(1, 12))
        
        return content
    
    def _generate_issues_table(self, session: ProcessingSession) -> Optional[Any]:
        """Generate issues table for PDF"""
        employees = self._get_employees_needing_attention(session)
        
        if not employees:
            return None
        
        # Create table data
        table_data = [["Employee Name", "Employee ID", "Issues", "Priority"]]
        
        for employee in employees[:10]:  # Limit to first 10 for space
            flags = employee.validation_flags or {}
            issues = self._format_validation_issues_csv(flags)
            priority = self._determine_issue_priority(flags)
            
            table_data.append([
                employee.employee_name or "Unknown",
                employee.employee_id or "N/A",
                issues[:50] + "..." if len(issues) > 50 else issues,
                priority
            ])
        
        table = Table(table_data, colWidths=[2*inch, 1.5*inch, 2.5*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        
        return table
    
    def _generate_recommendations_content(self, session: ProcessingSession, styles: Any) -> List[Any]:
        """Generate recommendations content for PDF"""
        content = []
        
        recommendations_header = Paragraph("Recommendations", styles['Heading2'])
        content.append(recommendations_header)
        content.append(Spacer(1, 12))
        
        # Add general recommendations
        recommendations = [
            "Review all high-priority issues first",
            "Verify amount mismatches with original documents",
            "Contact employees for missing receipts",
            "Escalate policy violations to supervisors",
            "Complete data entry for incomplete records"
        ]
        
        for rec in recommendations:
            bullet = Paragraph(f"• {rec}", styles['Normal'])
            content.append(bullet)
        
        content.append(Spacer(1, 12))
        
        return content


def create_export_generator(db: Session) -> ExportGenerator:
    """
    Factory function to create an ExportGenerator instance
    
    Args:
        db: Database session
        
    Returns:
        ExportGenerator instance
    """
    return ExportGenerator(db)