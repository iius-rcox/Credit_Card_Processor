"""Database utility functions for Credit Card Processor

This module provides utility functions for common database operations,
maintenance, and monitoring tasks.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Any
from sqlalchemy import text, func, and_
from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from .models import (
    ProcessingSession, EmployeeRevision, ProcessingActivity, FileUpload,
    SessionStatus, ValidationStatus, ActivityType, FileType, UploadStatus
)


class DatabaseUtils:
    """Database utility class with common operations"""
    
    @staticmethod
    def get_session_stats() -> Dict[str, Any]:
        """Get overall database statistics"""
        db = SessionLocal()
        try:
            stats = {}
            
            # Session counts by status
            session_stats = db.query(
                ProcessingSession.status,
                func.count(ProcessingSession.session_id)
            ).group_by(ProcessingSession.status).all()
            
            stats['sessions_by_status'] = {status.value: count for status, count in session_stats}
            stats['total_sessions'] = sum(stats['sessions_by_status'].values())
            
            # Employee revision stats
            revision_stats = db.query(
                EmployeeRevision.validation_status,
                func.count(EmployeeRevision.revision_id)
            ).group_by(EmployeeRevision.validation_status).all()
            
            stats['employees_by_validation'] = {status.value: count for status, count in revision_stats}
            stats['total_employee_revisions'] = sum(stats['employees_by_validation'].values())
            
            # Recent activity count (last 24 hours)
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            recent_activities = db.query(ProcessingActivity).filter(
                ProcessingActivity.created_at >= yesterday
            ).count()
            stats['recent_activities_24h'] = recent_activities
            
            # File upload stats
            upload_stats = db.query(
                FileUpload.upload_status,
                func.count(FileUpload.upload_id)
            ).group_by(FileUpload.upload_status).all()
            
            stats['uploads_by_status'] = {status.value: count for status, count in upload_stats}
            stats['total_uploads'] = sum(stats['uploads_by_status'].values())
            
            return stats
            
        finally:
            db.close()
    
    @staticmethod
    def get_sessions_needing_attention() -> List[Dict[str, Any]]:
        """Get sessions with employees needing attention"""
        db = SessionLocal()
        try:
            results = db.query(
                ProcessingSession.session_id,
                ProcessingSession.session_name,
                ProcessingSession.created_by,
                ProcessingSession.created_at,
                func.count(EmployeeRevision.revision_id).label('employees_needing_attention')
            ).join(EmployeeRevision).filter(
                EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION
            ).group_by(
                ProcessingSession.session_id,
                ProcessingSession.session_name,
                ProcessingSession.created_by,
                ProcessingSession.created_at
            ).all()
            
            return [
                {
                    'session_id': str(r.session_id),
                    'session_name': r.session_name,
                    'created_by': r.created_by,
                    'created_at': r.created_at.isoformat(),
                    'employees_needing_attention': r.employees_needing_attention
                }
                for r in results
            ]
            
        finally:
            db.close()
    
    @staticmethod
    def get_recent_activities(limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent processing activities"""
        db = SessionLocal()
        try:
            activities = db.query(
                ProcessingActivity.activity_type,
                ProcessingActivity.activity_message,
                ProcessingActivity.employee_id,
                ProcessingActivity.created_at,
                ProcessingActivity.created_by,
                ProcessingSession.session_name
            ).join(ProcessingSession).order_by(
                ProcessingActivity.created_at.desc()
            ).limit(limit).all()
            
            return [
                {
                    'activity_type': a.activity_type.value,
                    'message': a.activity_message,
                    'employee_id': a.employee_id,
                    'created_at': a.created_at.isoformat(),
                    'created_by': a.created_by,
                    'session_name': a.session_name
                }
                for a in activities
            ]
            
        finally:
            db.close()
    
    @staticmethod
    def cleanup_old_sessions(days_old: int = 90) -> int:
        """Clean up sessions older than specified days (with completed status)"""
        db = SessionLocal()
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
            
            # Only delete completed sessions that are old
            old_sessions = db.query(ProcessingSession).filter(
                and_(
                    ProcessingSession.created_at < cutoff_date,
                    ProcessingSession.status == SessionStatus.COMPLETED
                )
            )
            
            count = old_sessions.count()
            old_sessions.delete()
            db.commit()
            
            return count
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
    
    @staticmethod
    def backup_database(backup_path: str) -> bool:
        """Create a backup of the database (SQLite specific)"""
        try:
            import shutil
            import os
            from .config import settings
            
            # For SQLite, we can just copy the database file
            if os.path.exists(settings.database_path):
                shutil.copy2(settings.database_path, backup_path)
                return True
            return False
            
        except Exception as e:
            print(f"Backup failed: {e}")
            return False
    
    @staticmethod
    def check_database_health() -> Dict[str, Any]:
        """Perform basic database health checks"""
        db = SessionLocal()
        health_check = {
            'status': 'healthy',
            'issues': [],
            'recommendations': []
        }
        
        try:
            # Check database connectivity
            db.execute(text("SELECT 1")).scalar()
            
            # Check for sessions stuck in processing
            stuck_sessions = db.query(ProcessingSession).filter(
                and_(
                    ProcessingSession.status == SessionStatus.PROCESSING,
                    ProcessingSession.updated_at < datetime.now(timezone.utc) - timedelta(hours=2)
                )
            ).count()
            
            if stuck_sessions > 0:
                health_check['issues'].append(f"{stuck_sessions} sessions stuck in processing state")
                health_check['recommendations'].append("Review sessions stuck in processing state")
            
            # Check for employees without resolution that are old
            old_unresolved = db.query(EmployeeRevision).filter(
                and_(
                    EmployeeRevision.validation_status == ValidationStatus.NEEDS_ATTENTION,
                    EmployeeRevision.created_at < datetime.now(timezone.utc) - timedelta(days=7)
                )
            ).count()
            
            if old_unresolved > 0:
                health_check['issues'].append(f"{old_unresolved} employee revisions need attention for over 7 days")
                health_check['recommendations'].append("Resolve old employee validation issues")
            
            # Check database size (SQLite specific)
            try:
                result = db.execute(text("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")).scalar()
                db_size_mb = result / (1024 * 1024) if result else 0
                
                if db_size_mb > 1000:  # > 1GB
                    health_check['recommendations'].append("Database size is large, consider archiving old data")
            except:
                pass  # Not critical if this fails
            
            # Set overall status
            if health_check['issues']:
                health_check['status'] = 'warning' if len(health_check['issues']) < 3 else 'critical'
            
            return health_check
            
        except Exception as e:
            health_check['status'] = 'error'
            health_check['issues'].append(f"Database connectivity error: {str(e)}")
            return health_check
        finally:
            db.close()
    
    @staticmethod
    def get_performance_metrics() -> Dict[str, Any]:
        """Get basic performance metrics"""
        db = SessionLocal()
        try:
            metrics = {}
            
            # Average processing time (for completed sessions)
            avg_processing = db.query(
                func.avg(
                    func.julianday(ProcessingSession.updated_at) - 
                    func.julianday(ProcessingSession.created_at)
                ).label('avg_days')
            ).filter(
                ProcessingSession.status == SessionStatus.COMPLETED
            ).scalar()
            
            metrics['avg_processing_time_days'] = float(avg_processing) if avg_processing else 0
            
            # Sessions processed per day (last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            sessions_last_30 = db.query(ProcessingSession).filter(
                and_(
                    ProcessingSession.created_at >= thirty_days_ago,
                    ProcessingSession.status == SessionStatus.COMPLETED
                )
            ).count()
            
            metrics['sessions_per_day_30d_avg'] = sessions_last_30 / 30.0
            
            # Employee processing rate
            total_employees_processed = db.query(
                func.sum(ProcessingSession.processed_employees)
            ).filter(
                ProcessingSession.status == SessionStatus.COMPLETED
            ).scalar()
            
            metrics['total_employees_processed'] = int(total_employees_processed) if total_employees_processed else 0
            
            return metrics
            
        finally:
            db.close()


def main():
    """CLI interface for database utilities"""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description="Database utilities for Credit Card Processor")
    parser.add_argument('--stats', action='store_true', help='Show database statistics')
    parser.add_argument('--health', action='store_true', help='Run health check')
    parser.add_argument('--attention', action='store_true', help='Show sessions needing attention')
    parser.add_argument('--activities', type=int, default=20, help='Show recent activities (default: 20)')
    parser.add_argument('--cleanup', type=int, metavar='DAYS', help='Clean up sessions older than DAYS')
    parser.add_argument('--backup', type=str, metavar='PATH', help='Backup database to PATH')
    parser.add_argument('--metrics', action='store_true', help='Show performance metrics')
    
    args = parser.parse_args()
    
    utils = DatabaseUtils()
    
    if args.stats:
        print("=== DATABASE STATISTICS ===")
        stats = utils.get_session_stats()
        print(json.dumps(stats, indent=2))
    
    if args.health:
        print("=== HEALTH CHECK ===")
        health = utils.check_database_health()
        print(f"Status: {health['status'].upper()}")
        if health['issues']:
            print("Issues:")
            for issue in health['issues']:
                print(f"  - {issue}")
        if health['recommendations']:
            print("Recommendations:")
            for rec in health['recommendations']:
                print(f"  - {rec}")
    
    if args.attention:
        print("=== SESSIONS NEEDING ATTENTION ===")
        sessions = utils.get_sessions_needing_attention()
        for session in sessions:
            print(f"Session: {session['session_name']}")
            print(f"  ID: {session['session_id']}")
            print(f"  Created by: {session['created_by']}")
            print(f"  Employees needing attention: {session['employees_needing_attention']}")
            print()
    
    if args.activities:
        print(f"=== RECENT ACTIVITIES (last {args.activities}) ===")
        activities = utils.get_recent_activities(args.activities)
        for activity in activities:
            print(f"{activity['created_at']} - {activity['activity_type'].upper()}")
            print(f"  {activity['message']}")
            print(f"  Session: {activity['session_name']} | User: {activity['created_by']}")
            if activity['employee_id']:
                print(f"  Employee: {activity['employee_id']}")
            print()
    
    if args.cleanup:
        print(f"=== CLEANING UP SESSIONS OLDER THAN {args.cleanup} DAYS ===")
        count = utils.cleanup_old_sessions(args.cleanup)
        print(f"Cleaned up {count} old sessions")
    
    if args.backup:
        print(f"=== BACKING UP DATABASE TO {args.backup} ===")
        success = utils.backup_database(args.backup)
        print("Backup successful!" if success else "Backup failed!")
    
    if args.metrics:
        print("=== PERFORMANCE METRICS ===")
        metrics = utils.get_performance_metrics()
        print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()