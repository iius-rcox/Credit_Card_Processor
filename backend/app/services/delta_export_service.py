"""
Delta Export Service for Phase 4

Handles delta exports to prevent duplicate data in pVault and maintain export history.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case

from ..models import (
    ProcessingSession, EmployeeRevision, ExportHistory,
    SessionStatus, ValidationStatus
)
from ..schemas import UserInfo

logger = logging.getLogger(__name__)


class DeltaExportService:
    """Service for handling delta exports and export tracking"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_export_summary(self, session_id: str) -> Dict[str, Any]:
        """
        Get export summary for a session showing what can be exported
        
        Returns:
            Dict containing export statistics and recommendations
        """
        logger.info(f"Getting export summary for session {session_id}")
        
        # Get session info
        session = self.db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Get employee statistics
        employee_stats = self._get_employee_export_stats(session_id)
        
        # Get export history
        export_history = self._get_export_history(session_id)
        
        # Calculate recommendations
        recommendations = self._calculate_export_recommendations(employee_stats, export_history)
        
        return {
            'session_id': session_id,
            'session_name': session.session_name,
            'employee_stats': employee_stats,
            'export_history': export_history,
            'recommendations': recommendations,
            'last_export': export_history[-1] if export_history else None
        }
    
    def _get_employee_export_stats(self, session_id: str) -> Dict[str, int]:
        """Get employee export statistics for a session"""
        stats = self.db.query(
            func.count(EmployeeRevision.revision_id).label('total'),
            func.sum(case([(EmployeeRevision.exported_to_pvault == True, 1)], else_=0)).label('exported'),
            func.sum(case([(EmployeeRevision.exported_to_pvault == False, 1)], else_=0)).label('pending'),
            func.sum(case([(EmployeeRevision.amount_changed == True, 1)], else_=0)).label('changed'),
            func.sum(case([(EmployeeRevision.validation_status == ValidationStatus.VALID, 1)], else_=0)).label('valid')
        ).filter(
            EmployeeRevision.session_id == session_id
        ).first()
        
        return {
            'total_employees': stats.total or 0,
            'already_exported': stats.exported or 0,
            'pending_export': stats.pending or 0,
            'changed_employees': stats.changed or 0,
            'valid_employees': stats.valid or 0
        }
    
    def _get_export_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get export history for a session"""
        exports = self.db.query(ExportHistory).filter(
            ExportHistory.session_id == session_id
        ).order_by(ExportHistory.export_timestamp.desc()).all()
        
        return [
            {
                'export_id': str(export.export_id),
                'export_type': export.export_type,
                'export_batch_id': export.export_batch_id,
                'employee_count': export.employee_count,
                'exported_by': export.exported_by,
                'export_timestamp': export.export_timestamp,
                'delta_only': export.delta_only,
                'new_employees': export.new_employees,
                'changed_employees': export.changed_employees,
                'previously_exported': export.previously_exported,
                'export_status': export.export_status,
                'file_size': export.file_size
            }
            for export in exports
        ]
    
    def _calculate_export_recommendations(self, 
                                        employee_stats: Dict[str, int], 
                                        export_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate export recommendations based on current state"""
        recommendations = {
            'should_use_delta': True,
            'recommended_export_type': 'delta',
            'estimated_new_records': employee_stats['pending_export'],
            'estimated_changed_records': employee_stats['changed_employees'],
            'warnings': [],
            'suggestions': []
        }
        
        # Check if delta export is recommended
        if employee_stats['already_exported'] == 0:
            recommendations['should_use_delta'] = False
            recommendations['recommended_export_type'] = 'full'
            recommendations['suggestions'].append("No previous exports found. Use full export.")
        elif employee_stats['pending_export'] == 0:
            recommendations['warnings'].append("No new or changed records to export.")
            recommendations['suggestions'].append("Consider reviewing session for changes.")
        
        # Check for validation issues
        if employee_stats['valid_employees'] < employee_stats['total_employees']:
            recommendations['warnings'].append(f"{employee_stats['total_employees'] - employee_stats['valid_employees']} employees have validation issues.")
            recommendations['suggestions'].append("Review and resolve validation issues before exporting.")
        
        # Check for recent changes
        if employee_stats['changed_employees'] > 0:
            recommendations['suggestions'].append(f"{employee_stats['changed_employees']} employees have amount changes since last export.")
        
        return recommendations
    
    def generate_delta_export(self, 
                             session_id: str, 
                             export_type: str, 
                             include_exported: bool = False,
                             user: UserInfo = None) -> Dict[str, Any]:
        """
        Generate delta export data for a session
        
        Args:
            session_id: UUID of the session
            export_type: Type of export ('pvault' or 'exceptions')
            include_exported: Whether to include previously exported records
            user: User information for tracking
        
        Returns:
            Dict containing export data and metadata
        """
        logger.info(f"Generating delta export for session {session_id}, type: {export_type}")
        
        # Get session
        session = self.db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Get employees to export
        if include_exported:
            employees = self.db.query(EmployeeRevision).filter(
                EmployeeRevision.session_id == session_id
            ).all()
        else:
            employees = self.db.query(EmployeeRevision).filter(
                and_(
                    EmployeeRevision.session_id == session_id,
                    EmployeeRevision.exported_to_pvault == False
                )
            ).all()
        
        # Filter by export type
        if export_type == 'exceptions':
            employees = [emp for emp in employees if emp.validation_status != ValidationStatus.VALID]
        elif export_type == 'pvault':
            employees = [emp for emp in employees if emp.validation_status == ValidationStatus.VALID]
        
        # Generate export data
        export_data = self._generate_export_data(employees, export_type)
        
        # Create export batch
        export_batch_id = str(uuid.uuid4())
        
        # Calculate statistics
        stats = self._calculate_export_statistics(employees, include_exported)
        
        # Create export history record
        export_record = self._create_export_record(
            session_id, export_type, export_batch_id, 
            len(employees), user.username if user else 'system',
            not include_exported, stats
        )
        
        self.db.commit()
        
        logger.info(f"Delta export generated: {len(employees)} employees, batch: {export_batch_id}")
        
        return {
            'export_batch_id': export_batch_id,
            'export_type': export_type,
            'employee_count': len(employees),
            'export_data': export_data,
            'statistics': stats,
            'delta_only': not include_exported,
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    
    def _generate_export_data(self, employees: List[EmployeeRevision], export_type: str) -> List[Dict[str, Any]]:
        """Generate export data for employees"""
        export_data = []
        
        for emp in employees:
            if export_type == 'pvault':
                # pVault format
                record = {
                    'employee_id': emp.employee_id or '',
                    'employee_name': emp.employee_name,
                    'car_amount': float(emp.car_amount) if emp.car_amount else 0.0,
                    'receipt_amount': float(emp.receipt_amount) if emp.receipt_amount else 0.0,
                    'difference': float(emp.car_amount - emp.receipt_amount) if emp.car_amount and emp.receipt_amount else 0.0,
                    'validation_status': emp.validation_status.value,
                    'revision_id': str(emp.revision_id)
                }
            elif export_type == 'exceptions':
                # Exceptions format
                record = {
                    'employee_id': emp.employee_id or '',
                    'employee_name': emp.employee_name,
                    'validation_status': emp.validation_status.value,
                    'validation_flags': emp.validation_flags or {},
                    'car_amount': float(emp.car_amount) if emp.car_amount else 0.0,
                    'receipt_amount': float(emp.receipt_amount) if emp.receipt_amount else 0.0,
                    'resolved_by': emp.resolved_by,
                    'resolution_notes': emp.resolution_notes,
                    'revision_id': str(emp.revision_id)
                }
            
            export_data.append(record)
        
        return export_data
    
    def _calculate_export_statistics(self, 
                                   employees: List[EmployeeRevision], 
                                   include_exported: bool) -> Dict[str, int]:
        """Calculate export statistics"""
        stats = {
            'total_employees': len(employees),
            'new_employees': 0,
            'changed_employees': 0,
            'previously_exported': 0
        }
        
        for emp in employees:
            if emp.exported_to_pvault:
                stats['previously_exported'] += 1
            else:
                stats['new_employees'] += 1
            
            if emp.amount_changed:
                stats['changed_employees'] += 1
        
        return stats
    
    def _create_export_record(self, 
                             session_id: str, 
                             export_type: str, 
                             export_batch_id: str, 
                             employee_count: int, 
                             exported_by: str, 
                             delta_only: bool, 
                             stats: Dict[str, int]) -> ExportHistory:
        """Create export history record"""
        export_record = ExportHistory(
            session_id=session_id,
            export_type=export_type,
            export_batch_id=export_batch_id,
            employee_count=employee_count,
            exported_by=exported_by,
            export_timestamp=datetime.now(timezone.utc),
            delta_only=delta_only,
            new_employees=stats['new_employees'],
            changed_employees=stats['changed_employees'],
            previously_exported=stats['previously_exported'],
            export_status='completed'
        )
        
        self.db.add(export_record)
        return export_record
    
    def mark_records_as_exported(self, 
                                session_id: str, 
                                export_batch_id: str, 
                                employee_ids: List[str], 
                                export_type: str,
                                user: UserInfo = None) -> Dict[str, Any]:
        """
        Mark specific employee records as exported
        
        Args:
            session_id: UUID of the session
            export_batch_id: Batch ID for the export
            employee_ids: List of employee revision IDs to mark as exported
            export_type: Type of export
            user: User information for tracking
        
        Returns:
            Dict containing confirmation and summary
        """
        logger.info(f"Marking {len(employee_ids)} records as exported for session {session_id}")
        
        # Update employee records
        updated_count = self.db.query(EmployeeRevision).filter(
            and_(
                EmployeeRevision.session_id == session_id,
                EmployeeRevision.revision_id.in_(employee_ids)
            )
        ).update({
            'exported_to_pvault': True,
            'export_timestamp': datetime.now(timezone.utc),
            'export_batch_id': export_batch_id,
            'updated_at': datetime.now(timezone.utc)
        })
        
        # Update export history record
        export_record = self.db.query(ExportHistory).filter(
            and_(
                ExportHistory.session_id == session_id,
                ExportHistory.export_batch_id == export_batch_id
            )
        ).first()
        
        if export_record:
            export_record.employee_count = updated_count
            export_record.export_status = 'completed'
        
        # Log activity
        self._log_export_activity(session_id, export_batch_id, updated_count, user.username if user else 'system')
        
        self.db.commit()
        
        logger.info(f"Marked {updated_count} records as exported")
        
        return {
            'success': True,
            'export_batch_id': export_batch_id,
            'marked_count': updated_count,
            'message': f"Successfully marked {updated_count} records as exported"
        }
    
    def _log_export_activity(self, 
                            session_id: str, 
                            export_batch_id: str, 
                            record_count: int, 
                            user: str):
        """Log export activity"""
        from ..models import ProcessingActivity, ActivityType
        
        activity = ProcessingActivity(
            session_id=session_id,
            activity_type=ActivityType.EXPORT,
            activity_message=f"Marked {record_count} records as exported (batch: {export_batch_id})",
            created_by=user
        )
        
        self.db.add(activity)
    
    def get_export_history_summary(self, session_id: str) -> Dict[str, Any]:
        """Get comprehensive export history summary for a session"""
        logger.info(f"Getting export history summary for session {session_id}")
        
        # Get all exports
        exports = self.db.query(ExportHistory).filter(
            ExportHistory.session_id == session_id
        ).order_by(ExportHistory.export_timestamp.desc()).all()
        
        # Calculate summary statistics
        total_exports = len(exports)
        total_employees_exported = sum(export.employee_count for export in exports)
        delta_exports = sum(1 for export in exports if export.delta_only)
        full_exports = total_exports - delta_exports
        
        # Get latest export
        latest_export = exports[0] if exports else None
        
        # Calculate export frequency
        if len(exports) > 1:
            time_diff = exports[0].export_timestamp - exports[-1].export_timestamp
            avg_frequency_days = time_diff.total_seconds() / (len(exports) - 1) / 86400
        else:
            avg_frequency_days = None
        
        return {
            'session_id': session_id,
            'total_exports': total_exports,
            'total_employees_exported': total_employees_exported,
            'delta_exports': delta_exports,
            'full_exports': full_exports,
            'latest_export': {
                'export_timestamp': latest_export.export_timestamp.isoformat() if latest_export else None,
                'export_type': latest_export.export_type if latest_export else None,
                'employee_count': latest_export.employee_count if latest_export else 0,
                'delta_only': latest_export.delta_only if latest_export else False
            } if latest_export else None,
            'avg_frequency_days': avg_frequency_days,
            'exports': [
                {
                    'export_id': str(export.export_id),
                    'export_type': export.export_type,
                    'export_batch_id': export.export_batch_id,
                    'employee_count': export.employee_count,
                    'exported_by': export.exported_by,
                    'export_timestamp': export.export_timestamp.isoformat(),
                    'delta_only': export.delta_only,
                    'export_status': export.export_status
                }
                for export in exports
            ]
        }

