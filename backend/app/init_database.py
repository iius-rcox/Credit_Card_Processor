"""Database initialization script with sample data

This script initializes the database tables and optionally loads sample data
for development and testing purposes.
"""

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from .database import engine, SessionLocal, init_database
from .models import (
    ProcessingSession, EmployeeRevision, ProcessingActivity, FileUpload,
    SessionStatus, ValidationStatus, ActivityType, FileType, UploadStatus
)


def create_sample_data():
    """Create sample data for development and testing"""
    db = SessionLocal()
    
    try:
        # Create sample processing session
        session1 = ProcessingSession(
            session_name="January 2024 Processing",
            created_by="rcox",
            status=SessionStatus.COMPLETED,
            car_file_path="./data/uploads/jan_2024_car.pdf",
            receipt_file_path="./data/uploads/jan_2024_receipts.pdf",
            car_checksum="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
            receipt_checksum="def456ghi789jkl012mno345pqr678stu901vwx234yz567890abc123",
            total_employees=15,
            processed_employees=15,
            processing_options={
                "auto_resolve_threshold": 5.00,
                "validation_rules": ["amount_match", "name_validation"],
                "export_format": "excel"
            }
        )
        db.add(session1)
        db.flush()  # Get the session_id
        
        # Create sample employee revisions
        employees = [
            {"name": "John Smith", "employee_id": "EMP001", "car": 125.75, "receipt": 125.75, "status": ValidationStatus.VALID},
            {"name": "Jane Doe", "employee_id": "EMP002", "car": 89.50, "receipt": 87.50, "status": ValidationStatus.NEEDS_ATTENTION},
            {"name": "Bob Johnson", "employee_id": "EMP003", "car": 156.25, "receipt": 156.25, "status": ValidationStatus.VALID},
            {"name": "Alice Wilson", "employee_id": "EMP004", "car": 203.00, "receipt": 203.00, "status": ValidationStatus.VALID},
            {"name": "Charlie Brown", "employee_id": "EMP005", "car": 75.80, "receipt": None, "status": ValidationStatus.NEEDS_ATTENTION},
        ]
        
        for emp_data in employees:
            revision = EmployeeRevision(
                session_id=session1.session_id,
                employee_id=emp_data["employee_id"],
                employee_name=emp_data["name"],
                car_amount=Decimal(str(emp_data["car"])) if emp_data["car"] else None,
                receipt_amount=Decimal(str(emp_data["receipt"])) if emp_data["receipt"] else None,
                validation_status=emp_data["status"],
                validation_flags={
                    "amount_mismatch": emp_data["car"] != emp_data.get("receipt") if emp_data.get("receipt") else False,
                    "missing_receipt": emp_data.get("receipt") is None,
                    "name_verified": True
                } if emp_data["status"] == ValidationStatus.NEEDS_ATTENTION else {}
            )
            db.add(revision)
        
        # Create sample file uploads
        car_upload = FileUpload(
            session_id=session1.session_id,
            file_type=FileType.CAR,
            original_filename="january_2024_car_report.pdf",
            file_path="./data/uploads/jan_2024_car.pdf",
            file_size=2048576,  # 2MB
            checksum="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
            upload_status=UploadStatus.COMPLETED,
            uploaded_by="rcox"
        )
        
        receipt_upload = FileUpload(
            session_id=session1.session_id,
            file_type=FileType.RECEIPT,
            original_filename="january_2024_receipts.pdf",
            file_path="./data/uploads/jan_2024_receipts.pdf",
            file_size=3145728,  # 3MB
            checksum="def456ghi789jkl012mno345pqr678stu901vwx234yz567890abc123",
            upload_status=UploadStatus.COMPLETED,
            uploaded_by="rcox"
        )
        
        db.add(car_upload)
        db.add(receipt_upload)
        
        # Create sample processing activities
        activities = [
            {
                "type": ActivityType.PROCESSING,
                "message": "Started processing session: January 2024 Processing",
                "employee_id": None
            },
            {
                "type": ActivityType.PROCESSING,
                "message": "Successfully processed CAR file with 15 employees",
                "employee_id": None
            },
            {
                "type": ActivityType.VALIDATION,
                "message": "Amount mismatch detected: CAR $89.50, Receipt $87.50",
                "employee_id": "EMP002"
            },
            {
                "type": ActivityType.VALIDATION,
                "message": "Missing receipt data detected",
                "employee_id": "EMP005"
            },
            {
                "type": ActivityType.EXPORT,
                "message": "Session processing completed successfully",
                "employee_id": None
            }
        ]
        
        for i, activity_data in enumerate(activities):
            activity = ProcessingActivity(
                session_id=session1.session_id,
                activity_type=activity_data["type"],
                activity_message=activity_data["message"],
                employee_id=activity_data["employee_id"],
                created_by="rcox",
                created_at=datetime.now(timezone.utc) - timedelta(minutes=30-i*5)  # Stagger timestamps
            )
            db.add(activity)
        
        # Create a second sample session (in progress)
        session2 = ProcessingSession(
            session_name="February 2024 Processing",
            created_by="mikeh",
            status=SessionStatus.PROCESSING,
            car_file_path="./data/uploads/feb_2024_car.pdf",
            total_employees=8,
            processed_employees=3,
            processing_options={
                "auto_resolve_threshold": 10.00,
                "validation_rules": ["amount_match", "name_validation", "duplicate_check"],
                "export_format": "csv"
            }
        )
        db.add(session2)
        db.flush()
        
        # Add one activity for the second session
        activity = ProcessingActivity(
            session_id=session2.session_id,
            activity_type=ActivityType.PROCESSING,
            activity_message="Started processing session: February 2024 Processing",
            created_by="mikeh"
        )
        db.add(activity)
        
        # Commit all changes
        db.commit()
        print("Sample data created successfully!")
        
        # Print summary
        print(f"\nSample data summary:")
        print(f"- Created 2 processing sessions")
        print(f"- Session 1: '{session1.session_name}' - {session1.status.value}")
        print(f"- Session 2: '{session2.session_name}' - {session2.status.value}")
        print(f"- Created {len(employees)} employee revisions")
        print(f"- Created 2 file uploads")
        print(f"- Created {len(activities) + 1} processing activities")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating sample data: {e}")
        raise
    finally:
        db.close()


def reset_database():
    """Reset database by dropping and recreating all tables"""
    print("Dropping all tables...")
    from .database import Base
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables...")
    init_database()
    print("Database reset complete!")


def main():
    """Main function to initialize database with options"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Initialize Credit Card Processor database")
    parser.add_argument(
        "--reset", 
        action="store_true", 
        help="Reset database (drop and recreate all tables)"
    )
    parser.add_argument(
        "--sample-data", 
        action="store_true", 
        help="Load sample data for testing"
    )
    parser.add_argument(
        "--tables-only",
        action="store_true",
        help="Create tables only (no sample data)"
    )
    
    args = parser.parse_args()
    
    if args.reset:
        reset_database()
    elif args.tables_only:
        print("Creating database tables...")
        init_database()
        print("Database tables created successfully!")
    else:
        # Default: create tables and sample data
        print("Initializing database...")
        init_database()
        print("Database tables created successfully!")
        
        if args.sample_data or not any([args.reset, args.tables_only]):
            print("\nCreating sample data...")
            create_sample_data()


if __name__ == "__main__":
    main()