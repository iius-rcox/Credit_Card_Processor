"""
Mock Document Processing Service
Provides realistic document processing simulation for Credit Card Processor
Generates employee data, simulates validation issues, and tracks progress incrementally
"""

import asyncio
import logging
import random
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session

from ..models import (
    ProcessingSession, SessionStatus, EmployeeRevision, ProcessingActivity,
    ValidationStatus, ActivityType
)

# Configure logger
logger = logging.getLogger(__name__)

# Mock employee names for realistic simulation
MOCK_FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Nancy", "Daniel", "Betty",
    "Matthew", "Helen", "Anthony", "Sandra", "Mark", "Donna", "Donald", "Carol",
    "Steven", "Ruth", "Paul", "Sharon", "Andrew", "Michelle", "Joshua", "Laura",
    "Kenneth", "Sarah", "Kevin", "Kimberly", "Brian", "Deborah", "George", "Dorothy"
]

MOCK_LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
    "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
    "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell"
]

DEPARTMENTS = [
    "Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "IT", "Legal",
    "Customer Service", "Research", "Quality Assurance", "Business Development"
]

POSITIONS = [
    "Software Engineer", "Senior Developer", "Project Manager", "Business Analyst",
    "Sales Representative", "Marketing Specialist", "HR Coordinator", "Financial Analyst",
    "Operations Manager", "System Administrator", "Legal Counsel", "Customer Success Manager"
]

# Validation issue types and descriptions
VALIDATION_ISSUE_TYPES = [
    {
        "type": "amount_mismatch",
        "description_template": "Amount mismatch: CAR shows ${car_amount:.2f}, Receipt shows ${receipt_amount:.2f}",
        "severity": "medium"
    },
    {
        "type": "missing_receipt_info",
        "description_template": "Missing receipt information for employee {employee_name}",
        "severity": "high"
    },
    {
        "type": "employee_not_found",
        "description_template": "Employee ID {employee_id} not found in system directory",
        "severity": "high"
    },
    {
        "type": "policy_violation",
        "description_template": "Amount ${amount:.2f} exceeds policy limit ($2000.00)",
        "severity": "medium"
    },
    {
        "type": "duplicate_submission",
        "description_template": "Potential duplicate submission detected for {employee_name}",
        "severity": "low"
    },
    {
        "type": "incomplete_documentation",
        "description_template": "Incomplete documentation: missing required fields",
        "severity": "medium"
    }
]


def generate_mock_employee_data(count: int = 45) -> List[Dict[str, Any]]:
    """
    Generate realistic employee data for processing simulation
    
    Args:
        count: Number of employees to generate (default 45)
        
    Returns:
        List of employee data dictionaries with realistic information
    """
    employees = []
    used_names = set()  # Avoid duplicate names
    
    for i in range(1, count + 1):
        # Generate unique employee name
        while True:
            first_name = random.choice(MOCK_FIRST_NAMES)
            last_name = random.choice(MOCK_LAST_NAMES)
            full_name = f"{first_name} {last_name}"
            
            if full_name not in used_names:
                used_names.add(full_name)
                break
        
        # Generate realistic financial amounts
        base_amount = round(random.uniform(150.00, 1800.00), 2)
        
        # Most employees have matching amounts (90%)
        if random.random() < 0.9:
            car_amount = receipt_amount = base_amount
        else:
            # Some have slight differences (up to $50)
            difference = round(random.uniform(-50.00, 50.00), 2)
            car_amount = base_amount
            receipt_amount = max(0.01, base_amount + difference)
        
        employee_data = {
            "employee_id": f"EMP{i:03d}",
            "employee_name": full_name,
            "car_amount": Decimal(str(car_amount)),
            "receipt_amount": Decimal(str(receipt_amount)),
            "department": random.choice(DEPARTMENTS),
            "position": random.choice(POSITIONS),
            "validation_status": ValidationStatus.VALID,
            "validation_flags": {}
        }
        
        employees.append(employee_data)
    
    logger.info(f"Generated {count} mock employee records")
    return employees


def create_validation_issue(employee_index: int, employee_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create validation issues for problematic employees (every 7th)
    
    Args:
        employee_index: 0-based index of the employee
        employee_data: Employee data dictionary
        
    Returns:
        Dictionary with validation status and flags
    """
    # Every 7th employee gets a validation issue (positions 6, 13, 20, 27, 34, 41)
    if (employee_index + 1) % 7 == 0:
        issue_type = random.choice(VALIDATION_ISSUE_TYPES)
        
        # Create description based on issue type
        if issue_type["type"] == "amount_mismatch":
            # Force amount mismatch for these employees
            car_amount = float(employee_data["car_amount"])
            receipt_amount = car_amount + random.uniform(-100.00, 100.00)
            employee_data["receipt_amount"] = Decimal(str(round(receipt_amount, 2)))
            
            description = issue_type["description_template"].format(
                car_amount=car_amount,
                receipt_amount=float(employee_data["receipt_amount"])
            )
        elif issue_type["type"] == "policy_violation":
            # Set high amount for policy violation
            high_amount = round(random.uniform(2100.00, 2500.00), 2)
            employee_data["car_amount"] = Decimal(str(high_amount))
            employee_data["receipt_amount"] = Decimal(str(high_amount))
            
            description = issue_type["description_template"].format(amount=high_amount)
        else:
            description = issue_type["description_template"].format(
                employee_name=employee_data["employee_name"],
                employee_id=employee_data["employee_id"]
            )
        
        validation_flags = {
            "issue_type": issue_type["type"],
            "description": description,
            "severity": issue_type["severity"],
            "requires_review": True,
            "detected_at": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "validation_status": ValidationStatus.NEEDS_ATTENTION,
            "validation_flags": validation_flags
        }
    
    return {
        "validation_status": ValidationStatus.VALID,
        "validation_flags": {}
    }


async def log_processing_activity(
    db: Session,
    session_id: str,
    activity_type: ActivityType,
    message: str,
    employee_id: Optional[str] = None,
    created_by: str = "SYSTEM"
):
    """
    Log processing activity to database with error handling
    
    Args:
        db: Database session
        session_id: UUID of the processing session
        activity_type: Type of activity being logged
        message: Activity message
        employee_id: Optional employee ID if activity is employee-specific
        created_by: User who created the activity
    """
    try:
        activity = ProcessingActivity(
            session_id=uuid.UUID(session_id),
            activity_type=activity_type,
            activity_message=message,
            employee_id=employee_id,
            created_by=created_by
        )
        
        db.add(activity)
        db.commit()
        
        logger.debug(f"Activity logged - Session: {session_id}, Type: {activity_type.value}, Message: {message}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to log activity for session {session_id}: {str(e)}")


async def update_session_status(
    db: Session,
    session_id: str,
    new_status: SessionStatus,
    processed_employees: Optional[int] = None,
    total_employees: Optional[int] = None
):
    """
    Update session status and processing statistics
    
    Args:
        db: Database session
        session_id: UUID of the processing session
        new_status: New status to set
        processed_employees: Optional count of processed employees
        total_employees: Optional total count of employees
    """
    try:
        session_uuid = uuid.UUID(session_id)
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if db_session:
            db_session.status = new_status
            
            if processed_employees is not None:
                db_session.processed_employees = processed_employees
            
            if total_employees is not None:
                db_session.total_employees = total_employees
            
            db.commit()
            
            logger.debug(f"Session status updated - ID: {session_id}, Status: {new_status.value}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update session status for {session_id}: {str(e)}")


def calculate_progress(processed: int, total: int = 45) -> int:
    """
    Calculate progress percentage
    
    Args:
        processed: Number of employees processed
        total: Total number of employees
        
    Returns:
        Progress percentage (0-100)
    """
    if total == 0:
        return 0
    return min(100, int((processed / total) * 100))


async def simulate_document_processing(
    session_id: str,
    db: Session,
    processing_state: Dict[str, Any],
    processing_config: Dict[str, Any] = None
) -> bool:
    """
    Simulate realistic document processing for 45 employees
    
    This function provides a comprehensive simulation of document processing including:
    - Generation of 45 realistic employees with mock data
    - Sequential processing at 1 employee per second
    - Validation issues for every 7th employee
    - Incremental progress updates and activity logging
    - Support for processing control (pause/resume/cancel)
    
    Args:
        session_id: UUID of the processing session
        db: Database session
        processing_state: Processing state dictionary for control
        processing_config: Optional processing configuration
        
    Returns:
        True if processing completed successfully, False if cancelled/failed
    """
    try:
        # Initialize configuration with defaults
        config = processing_config or {}
        employee_count = config.get("employee_count", 45)
        processing_delay = config.get("processing_delay", 1.0)  # 1 second per employee
        
        logger.info(f"Starting mock document processing for session {session_id} - {employee_count} employees")
        
        # Generate mock employee data
        employees = generate_mock_employee_data(employee_count)
        
        # Update session with total count
        await update_session_status(db, session_id, SessionStatus.PROCESSING, 0, employee_count)
        
        # Update processing state
        processing_state["total_employees"] = employee_count
        processing_state["current_employee_index"] = 0
        
        # Log processing start
        await log_processing_activity(
            db, session_id, ActivityType.PROCESSING_STARTED,
            f"Mock document processing started - {employee_count} employees to process"
        )
        
        # Process each employee sequentially
        for index, employee_data in enumerate(employees):
            # Check for cancellation
            if processing_state.get("should_cancel", False):
                logger.info(f"Processing cancelled for session {session_id} at employee {index + 1}")
                await log_processing_activity(
                    db, session_id, ActivityType.PROCESSING_CANCELLED,
                    f"Processing cancelled by user at employee {index + 1}/{employee_count}"
                )
                await update_session_status(db, session_id, SessionStatus.CANCELLED, index)
                processing_state["status"] = "cancelled"
                return False
            
            # Handle pause/resume logic
            while processing_state.get("should_pause", False) and not processing_state.get("should_cancel", False):
                if processing_state.get("status") != "paused":
                    processing_state["status"] = "paused"
                    await log_processing_activity(
                        db, session_id, ActivityType.PROCESSING_PAUSED,
                        f"Processing paused at employee {index + 1}/{employee_count}"
                    )
                    await update_session_status(db, session_id, SessionStatus.PAUSED, index)
                
                # Wait for resume or cancel
                await asyncio.sleep(0.5)
            
            # Resume processing if we were paused
            if processing_state.get("status") == "paused":
                processing_state["status"] = "processing"
                await log_processing_activity(
                    db, session_id, ActivityType.PROCESSING_RESUMED,
                    f"Processing resumed at employee {index + 1}/{employee_count}"
                )
                await update_session_status(db, session_id, SessionStatus.PROCESSING, index)
            
            # Update current employee index
            processing_state["current_employee_index"] = index
            
            # Create validation issues for every 7th employee
            validation_result = create_validation_issue(index, employee_data)
            employee_data.update(validation_result)
            
            # Log start of employee processing
            status_text = "with validation issues" if employee_data["validation_status"] == ValidationStatus.NEEDS_ATTENTION else "valid"
            await log_processing_activity(
                db, session_id, ActivityType.PROCESSING_PROGRESS,
                f"Processing employee {employee_data['employee_name']} (ID: {employee_data['employee_id']}) - {status_text}",
                employee_id=employee_data['employee_id']
            )
            
            # Create employee revision record in database
            employee_revision = EmployeeRevision(
                session_id=uuid.UUID(session_id),
                employee_id=employee_data['employee_id'],
                employee_name=employee_data['employee_name'],
                car_amount=employee_data['car_amount'],
                receipt_amount=employee_data['receipt_amount'],
                validation_status=employee_data['validation_status'],
                validation_flags=employee_data['validation_flags']
            )
            
            db.add(employee_revision)
            db.commit()
            
            # Log validation issues if any
            if employee_data['validation_status'] == ValidationStatus.NEEDS_ATTENTION:
                issue_description = employee_data['validation_flags'].get('description', 'Validation issue detected')
                await log_processing_activity(
                    db, session_id, ActivityType.VALIDATION,
                    f"Validation issue detected for {employee_data['employee_name']}: {issue_description}",
                    employee_id=employee_data['employee_id']
                )
            
            # Simulate processing time (1 second per employee with slight variation)
            processing_time = processing_delay + random.uniform(-0.1, 0.1)
            await asyncio.sleep(processing_time)
            
            # Update progress
            completed = index + 1
            await update_session_status(db, session_id, SessionStatus.PROCESSING, completed, employee_count)
            
            # Log progress at key milestones (every 10% or every 5 employees, whichever is smaller)
            milestone_interval = min(5, max(1, employee_count // 10))
            if completed % milestone_interval == 0 or completed == employee_count:
                progress_percent = calculate_progress(completed, employee_count)
                await log_processing_activity(
                    db, session_id, ActivityType.PROCESSING_PROGRESS,
                    f"Processing progress: {completed}/{employee_count} employees ({progress_percent}%)"
                )
                logger.info(f"Session {session_id}: {completed}/{employee_count} employees processed ({progress_percent}%)")
        
        # Calculate final statistics
        valid_employees = sum(1 for emp in employees if emp['validation_status'] == ValidationStatus.VALID)
        issue_employees = employee_count - valid_employees
        
        # Processing completed successfully
        processing_state["status"] = "completed"
        processing_state["current_employee_index"] = employee_count
        
        await log_processing_activity(
            db, session_id, ActivityType.PROCESSING_COMPLETED,
            f"Mock document processing completed successfully - {employee_count} employees processed "
            f"({valid_employees} valid, {issue_employees} with issues)"
        )
        
        await update_session_status(db, session_id, SessionStatus.COMPLETED, employee_count, employee_count)
        
        logger.info(f"Mock processing completed successfully for session {session_id} - "
                   f"{employee_count} employees, {issue_employees} issues detected")
        
        return True
        
    except asyncio.CancelledError:
        logger.info(f"Processing task cancelled for session {session_id}")
        processing_state["status"] = "cancelled"
        
        await log_processing_activity(
            db, session_id, ActivityType.PROCESSING_CANCELLED,
            "Processing task cancelled"
        )
        await update_session_status(db, session_id, SessionStatus.CANCELLED)
        return False
        
    except Exception as e:
        logger.error(f"Mock processing failed for session {session_id}: {str(e)}")
        processing_state["status"] = "failed"
        
        await log_processing_activity(
            db, session_id, ActivityType.PROCESSING_FAILED,
            f"Processing failed with error: {str(e)}"
        )
        await update_session_status(db, session_id, SessionStatus.FAILED)
        
        raise


def get_mock_processing_statistics() -> Dict[str, Any]:
    """
    Get statistics about mock processing configuration
    
    Returns:
        Dictionary with processing statistics and configuration
    """
    return {
        "default_employee_count": 45,
        "default_processing_time": "45 seconds (1 per second)",
        "validation_issue_frequency": "Every 7th employee (~6-7 issues per batch)",
        "issue_types": len(VALIDATION_ISSUE_TYPES),
        "supported_departments": len(DEPARTMENTS),
        "supported_positions": len(POSITIONS),
        "mock_names_available": len(MOCK_FIRST_NAMES) * len(MOCK_LAST_NAMES)
    }