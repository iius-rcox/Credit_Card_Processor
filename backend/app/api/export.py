"""
Export API endpoints for Credit Card Processor

Provides endpoints for generating and downloading various export formats:
- pVault CSV exports for system integration
- Follow-up Excel reports for manual review
- Issues PDF reports for management reporting
"""

import io
import csv
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, Path, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

try:
    import pandas as pd
except ImportError:
    pd = None

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import inch
except ImportError:
    # PDF generation will be disabled if reportlab is not available
    pass

from ..database import get_db
from ..auth import get_current_user, UserInfo
from ..models import (
    ProcessingSession, EmployeeRevision, ProcessingActivity,
    SessionStatus, ValidationStatus, ActivityType
)
from ..services.export_generator import ExportGenerator, create_export_generator
from pydantic import BaseModel, Field
from pathlib import Path as PathLib


# Response models for exports
class ExportResponse(BaseModel):
    """Response model for export operations"""
    export_id: str = Field(..., description="Export operation UUID")
    session_id: str = Field(..., description="Session UUID")
    export_type: str = Field(..., description="Type of export (csv, excel, pdf)")
    filename: str = Field(..., description="Generated filename")
    file_size: int = Field(..., description="File size in bytes")
    record_count: int = Field(..., description="Number of records exported")
    created_by: str = Field(..., description="User who initiated export")
    created_at: datetime = Field(..., description="Export creation timestamp")
    download_url: str = Field(..., description="URL for downloading the export")


class ExportHistoryResponse(BaseModel):
    """Response model for export history"""
    exports: List[ExportResponse] = Field(..., description="List of previous exports")
    total_count: int = Field(..., description="Total number of exports")
    session_id: str = Field(..., description="Session UUID")


router = APIRouter(prefix="/api/export", tags=["exports"])


def _generate_filename(session_name: str, session_id: str, export_type: str, extension: str) -> str:
    """Generate a standardized filename for exports"""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_session_name = "".join(c for c in session_name if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_session_name = safe_session_name.replace(' ', '_')
    
    return f"Session_{session_id[:8]}_{safe_session_name}_{export_type}_{timestamp}.{extension}"


def _log_export_activity(db: Session, session_id: str, export_type: str, filename: str, username: str):
    """Log export activity to the database"""
    try:
        activity = ProcessingActivity(
            session_id=session_id,
            activity_type=ActivityType.EXPORT,
            activity_message=f"Generated {export_type} export: {filename}",
            created_by=username
        )
        db.add(activity)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to log export activity: {str(e)}")
        # Don't raise - logging failure shouldn't break export


@router.get("/{session_id}/pvault")
async def export_pvault_csv(
    session_id: str = Path(..., description="Session UUID"),
    include_resolved: bool = True,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Export pVault-compatible CSV file with employee data
    
    Generates a CSV file containing employee records in the format
    expected by the pVault system for automated processing.
    """
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if session has results
    if session.status not in [SessionStatus.COMPLETED, SessionStatus.FAILED]:
        raise HTTPException(
            status_code=400,
            detail=f"Session not ready for export. Status: {session.status.value}"
        )
    
    # Build query for employees to export
    employee_query = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_id
    )
    
    # Filter based on validation status
    if include_resolved:
        employee_query = employee_query.filter(
            EmployeeRevision.validation_status.in_([
                ValidationStatus.VALID,
                ValidationStatus.RESOLVED
            ])
        )
    else:
        employee_query = employee_query.filter(
            EmployeeRevision.validation_status == ValidationStatus.VALID
        )
    
    employees = employee_query.all()
    
    if not employees:
        raise HTTPException(
            status_code=404,
            detail="No employees available for export"
        )
    
    # Generate CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # CSV headers for pVault compatibility
    headers = [
        "Employee_ID",
        "Employee_Name",
        "Card_Amount",
        "Receipt_Amount",
        "Total_Amount",
        "Validation_Status",
        "Processing_Date",
        "Resolved_By",
        "Resolution_Notes"
    ]
    writer.writerow(headers)
    
    # Write employee data
    for employee in employees:
        car_amount = float(employee.car_amount) if employee.car_amount else 0.0
        receipt_amount = float(employee.receipt_amount) if employee.receipt_amount else 0.0
        total_amount = car_amount + receipt_amount
        
        writer.writerow([
            employee.employee_id or "",
            employee.employee_name,
            f"{car_amount:.2f}",
            f"{receipt_amount:.2f}",
            f"{total_amount:.2f}",
            employee.validation_status.value,
            employee.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            employee.resolved_by or "",
            employee.resolution_notes or ""
        ])
    
    # Generate filename
    filename = _generate_filename(
        session.session_name,
        str(session.session_id),
        "pVault",
        "csv"
    )
    
    # Log export activity
    _log_export_activity(db, str(session.session_id), "pVault CSV", filename, current_user.username)
    
    # Prepare response
    csv_content = output.getvalue()
    output.close()
    
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Length": str(len(csv_content.encode('utf-8')))
        }
    )


@router.get("/{session_id}/followup")
async def export_followup_excel(
    session_id: str = Path(..., description="Session UUID"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Export Excel file with employees requiring follow-up
    
    Generates an Excel file containing employees with validation issues
    that need manual review and resolution.
    """
    if pd is None:
        raise HTTPException(
            status_code=500,
            detail="Excel export not available - pandas not installed"
        )
    
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get employees needing attention
    employees = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_id,
        EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
    ).all()
    
    if not employees:
        raise HTTPException(
            status_code=404,
            detail="No employees requiring follow-up"
        )
    
    # Prepare data for Excel
    data = []
    for employee in employees:
        validation_issues = ", ".join(employee.validation_flags.keys()) if employee.validation_flags else "None"
        
        data.append({
            "Employee ID": employee.employee_id or "N/A",
            "Employee Name": employee.employee_name,
            "Car Allowance": float(employee.car_amount) if employee.car_amount else 0.0,
            "Receipt Amount": float(employee.receipt_amount) if employee.receipt_amount else 0.0,
            "Validation Issues": validation_issues,
            "Processing Date": employee.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "Status": employee.validation_status.value,
            "Notes": employee.resolution_notes or ""
        })
    
    # Create DataFrame and Excel file
    df = pd.DataFrame(data)
    
    # Generate filename
    filename = _generate_filename(
        session.session_name,
        str(session.session_id),
        "Followup",
        "xlsx"
    )
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Follow-up Required', index=False)
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Follow-up Required']
        for column in worksheet.columns:
            max_length = 0
            column = [cell for cell in column]
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column[0].column_letter].width = adjusted_width
    
    # Log export activity
    _log_export_activity(db, str(session.session_id), "Follow-up Excel", filename, current_user.username)
    
    # Prepare response
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Length": str(len(output.getvalue()))
        }
    )


@router.get("/{session_id}/issues")
async def export_issues_report(
    session_id: str = Path(..., description="Session UUID"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Export PDF report of validation issues and processing summary
    
    Generates a comprehensive PDF report containing processing statistics,
    validation issues, and resolution status for management review.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        from reportlab.lib.units import inch
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF export not available - reportlab not installed"
        )
    
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all employees for statistics
    all_employees = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_id
    ).all()
    
    # Get employees with issues
    problem_employees = db.query(EmployeeRevision).filter(
        EmployeeRevision.session_id == session_id,
        EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
    ).all()
    
    # Generate filename
    filename = _generate_filename(
        session.session_name,
        str(session.session_id),
        "IssuesReport",
        "pdf"
    )
    
    # Create PDF in memory
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title = Paragraph(f"Processing Issues Report", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Session information
    session_info = [
        ["Session Name:", session.session_name],
        ["Session ID:", str(session.session_id)[:8] + "..."],
        ["Created By:", session.created_by],
        ["Processing Date:", session.created_at.strftime("%Y-%m-%d %H:%M:%S")],
        ["Status:", session.status.value],
    ]
    
    session_table = Table(session_info, colWidths=[2*inch, 4*inch])
    session_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(session_table)
    story.append(Spacer(1, 20))
    
    # Statistics summary
    total_count = len(all_employees)
    valid_count = sum(1 for e in all_employees if e.validation_status == ValidationStatus.VALID)
    issues_count = sum(1 for e in all_employees if e.validation_status == ValidationStatus.NEEDS_ATTENTION)
    resolved_count = sum(1 for e in all_employees if e.validation_status == ValidationStatus.RESOLVED)
    
    stats_header = Paragraph("Processing Statistics", styles['Heading2'])
    story.append(stats_header)
    story.append(Spacer(1, 12))
    
    stats_data = [
        ["Total Employees Processed:", str(total_count)],
        ["Valid (No Issues):", str(valid_count)],
        ["Issues Requiring Attention:", str(issues_count)],
        ["Issues Resolved:", str(resolved_count)],
        ["Success Rate:", f"{(valid_count/total_count*100):.1f}%" if total_count > 0 else "N/A"]
    ]
    
    stats_table = Table(stats_data, colWidths=[3*inch, 2*inch])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(stats_table)
    story.append(Spacer(1, 20))
    
    # Issues details
    if problem_employees:
        issues_header = Paragraph("Employees Requiring Attention", styles['Heading2'])
        story.append(issues_header)
        story.append(Spacer(1, 12))
        
        issues_data = [["Employee Name", "Employee ID", "Issues", "Status"]]
        
        for employee in problem_employees[:20]:  # Limit to first 20 to prevent huge PDFs
            issues = ", ".join(employee.validation_flags.keys()) if employee.validation_flags else "Validation failed"
            issues_data.append([
                employee.employee_name,
                employee.employee_id or "N/A",
                issues[:50] + "..." if len(issues) > 50 else issues,
                employee.validation_status.value
            ])
        
        if len(problem_employees) > 20:
            issues_data.append(["...", "...", f"And {len(problem_employees)-20} more", "..."])
        
        issues_table = Table(issues_data, colWidths=[2*inch, 1.5*inch, 2.5*inch, 1*inch])
        issues_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))
        
        story.append(issues_table)
    
    # Build PDF
    doc.build(story)
    
    # Log export activity
    _log_export_activity(db, str(session.session_id), "Issues PDF Report", filename, current_user.username)
    
    # Prepare response
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Length": str(len(output.getvalue()))
        }
    )


@router.get("/{session_id}/history", response_model=ExportHistoryResponse)
async def get_export_history(
    session_id: str = Path(..., description="Session UUID"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get export history for a session
    
    Returns a list of all previous exports generated for the session,
    including export type, creation time, and download information.
    """
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get export activities
    export_activities = db.query(ProcessingActivity).filter(
        ProcessingActivity.session_id == session_id,
        ProcessingActivity.activity_type == ActivityType.EXPORT
    ).order_by(ProcessingActivity.created_at.desc()).all()
    
    # Mock export responses (in real implementation, would store export metadata)
    exports = []
    for i, activity in enumerate(export_activities):
        export_type = "csv" if "pVault" in activity.activity_message else \
                     "excel" if "Follow-up" in activity.activity_message else "pdf"
        
        exports.append(ExportResponse(
            export_id=str(activity.activity_id),
            session_id=str(session_id),
            export_type=export_type,
            filename=activity.activity_message.split(": ")[-1] if ": " in activity.activity_message else "unknown",
            file_size=1024 * (i + 1),  # Mock file size
            record_count=len(session.employee_revisions) if hasattr(session, 'employee_revisions') else 0,
            created_by=activity.created_by,
            created_at=activity.created_at,
            download_url=f"/api/export/{session_id}/{export_type}"  # Mock download URL
        ))
    
    return ExportHistoryResponse(
        exports=exports,
        total_count=len(exports),
        session_id=str(session_id)
    )


# Enhanced export endpoints using ExportGenerator

@router.get("/{session_id}/pvault/enhanced")
async def export_enhanced_pvault_csv(
    session_id: str = Path(..., description="Session UUID"),
    include_resolved: bool = True,
    include_validation_details: bool = False,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Export enhanced pVault-compatible CSV using ExportGenerator
    
    Generates a comprehensive CSV file with additional formatting options
    and enhanced data validation using the ExportGenerator service.
    """
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # Create export generator
        generator = create_export_generator(db)
        
        # Generate CSV
        csv_buffer, filename = generator.generate_pvault_csv(
            session=session,
            include_resolved=include_resolved,
            include_validation_details=include_validation_details
        )
        
        # Get file size for logging
        csv_content = csv_buffer.getvalue()
        file_size = len(csv_content.encode('utf-8'))
        
        # Log export activity
        generator.log_export_activity(
            session_id=session_id,
            export_type="enhanced_pvault_csv",
            filename=filename,
            username=current_user.username,
            file_size=file_size
        )
        
        # Return file download
        csv_buffer.seek(0)
        return StreamingResponse(
            io.StringIO(csv_content),
            media_type=generator.get_export_mime_type("csv"),
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(file_size)
            }
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export generation failed: {str(e)}")


@router.get("/{session_id}/followup/enhanced")
async def export_enhanced_followup_excel(
    session_id: str = Path(..., description="Session UUID"),
    include_summary: bool = True,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Export enhanced follow-up Excel using ExportGenerator
    
    Generates a comprehensive Excel report with advanced formatting
    and summary sheets using the ExportGenerator service.
    """
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # Create export generator
        generator = create_export_generator(db)
        
        # Generate Excel
        excel_buffer, filename = generator.generate_followup_excel(
            session=session,
            include_summary=include_summary
        )
        
        # Get file size for logging
        excel_content = excel_buffer.getvalue()
        file_size = len(excel_content)
        
        # Log export activity
        generator.log_export_activity(
            session_id=session_id,
            export_type="enhanced_followup_excel",
            filename=filename,
            username=current_user.username,
            file_size=file_size
        )
        
        # Return file download
        excel_buffer.seek(0)
        return StreamingResponse(
            io.BytesIO(excel_content),
            media_type=generator.get_export_mime_type("excel"),
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(file_size)
            }
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export generation failed: {str(e)}")


@router.get("/{session_id}/issues/enhanced")
async def export_enhanced_issues_report(
    session_id: str = Path(..., description="Session UUID"),
    include_statistics: bool = True,
    include_recommendations: bool = True,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Export enhanced issues PDF report using ExportGenerator
    
    Generates a comprehensive PDF report with detailed statistics
    and recommendations using the ExportGenerator service.
    """
    # Get session
    session = db.query(ProcessingSession).filter(
        ProcessingSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # Create export generator
        generator = create_export_generator(db)
        
        # Generate PDF
        pdf_buffer, filename = generator.generate_issues_report(
            session=session,
            include_statistics=include_statistics,
            include_recommendations=include_recommendations
        )
        
        # Get file size for logging
        pdf_content = pdf_buffer.getvalue()
        file_size = len(pdf_content)
        
        # Log export activity
        generator.log_export_activity(
            session_id=session_id,
            export_type="enhanced_issues_pdf",
            filename=filename,
            username=current_user.username,
            file_size=file_size
        )
        
        # Return file download
        pdf_buffer.seek(0)
        return StreamingResponse(
            io.BytesIO(pdf_content),
            media_type=generator.get_export_mime_type("pdf"),
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(file_size)
            }
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export generation failed: {str(e)}")


@router.get("/download/{session_id}/pvault/{filename}")
async def download_auto_pvault_csv(
    session_id: str = Path(..., description="Session UUID"),
    filename: str = Path(..., description="Auto-generated filename"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Download auto-generated pVault CSV file
    
    This endpoint serves auto-generated pVault CSV files that were created
    automatically after processing completion for employees ready for export.
    """
    try:
        # Validate session exists and user has access
        from uuid import UUID
        session_uuid = UUID(session_id)
        
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions (same as other endpoints)
        if not current_user.is_admin:
            session_creator = db_session.created_by.lower()
            if "\\" in session_creator:
                session_creator = session_creator.split("\\")[1]
            
            if session_creator != current_user.username.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        # Validate filename to prevent path traversal
        safe_filename = PathLib(filename).name
        if safe_filename != filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        # Construct file path using proper export directory
        from ..config import settings
        export_dir = PathLib(settings.export_path)
        file_path = export_dir / safe_filename
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or expired"
            )
        
        # Log download activity
        _log_export_activity(db, session_id, "pVault CSV Download", filename, current_user.username)
        
        # Return file
        return StreamingResponse(
            open(file_path, "rb"),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={safe_filename}",
                "Content-Length": str(file_path.stat().st_size)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download pVault CSV {filename}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Download failed"
        )


@router.get("/download/{session_id}/exceptions/{filename}")
async def download_auto_exception_report(
    session_id: str = Path(..., description="Session UUID"),
    filename: str = Path(..., description="Auto-generated filename"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Download auto-generated exception report
    
    This endpoint serves auto-generated exception reports that list employees
    needing attention with categorized issues and recommended actions.
    """
    try:
        # Validate session exists and user has access
        from uuid import UUID
        session_uuid = UUID(session_id)
        
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check access permissions
        if not current_user.is_admin:
            session_creator = db_session.created_by.lower()
            if "\\" in session_creator:
                session_creator = session_creator.split("\\")[1]
            
            if session_creator != current_user.username.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        # Validate filename
        safe_filename = PathLib(filename).name
        if safe_filename != filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        # Construct file path using proper export directory
        from ..config import settings
        export_dir = PathLib(settings.export_path)
        file_path = export_dir / safe_filename
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or expired"
            )
        
        # Log download activity
        _log_export_activity(db, session_id, "Exception Report Download", filename, current_user.username)
        
        # Return file
        return StreamingResponse(
            open(file_path, "rb"),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={safe_filename}",
                "Content-Length": str(file_path.stat().st_size)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download exception report {filename}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Download failed"
        )

