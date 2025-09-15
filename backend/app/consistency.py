"""
Data consistency framework for processing operations

This module provides checkpoint-based consistency guarantees during batch processing
operations to ensure data integrity and enable recovery from failures.
"""

import logging
import json
import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import text
from .config import settings
from .models import ProcessingSession, EmployeeRevision

logger = logging.getLogger(__name__)


@dataclass
class ProcessingCheckpoint:
    """Checkpoint data for processing state"""
    checkpoint_id: str
    session_id: str
    batch_number: int
    processed_count: int
    total_count: int
    created_at: datetime
    employee_data: List[Dict[str, Any]]
    validation_hash: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationResult:
    """Result of data validation"""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class ConsistencyManager:
    """
    Manages data consistency through checkpoints and validation
    """
    
    def __init__(self):
        self.checkpoint_dir = Path(settings.upload_path).parent / "checkpoints"
        self.checkpoint_dir.mkdir(exist_ok=True)
        
        # Validation rules for employee data
        self.validation_rules = {
            "required_fields": ["employee_name"],  # Only employee_name is truly required
            "numeric_fields": ["car_amount", "receipt_amount"],
            "max_amount": 10000.0,  # Maximum reasonable amount
            "min_amount": -1000.0   # Minimum reasonable amount (for refunds)
        }
        
        logger.info("Consistency manager initialized")
    
    def create_checkpoint(
        self,
        session_id: str,
        batch_number: int,
        processed_count: int,
        total_count: int,
        employee_data: List[Dict[str, Any]],
        metadata: Dict[str, Any] = None
    ) -> ProcessingCheckpoint:
        """
        Create a processing checkpoint
        
        Args:
            session_id: Processing session ID
            batch_number: Current batch number
            processed_count: Number of employees processed so far
            total_count: Total number of employees to process
            employee_data: Current batch of employee data
            metadata: Additional metadata
            
        Returns:
            Created checkpoint
        """
        checkpoint_id = str(uuid.uuid4())
        
        # Create validation hash for integrity checking
        validation_hash = self._create_validation_hash(employee_data)
        
        checkpoint = ProcessingCheckpoint(
            checkpoint_id=checkpoint_id,
            session_id=session_id,
            batch_number=batch_number,
            processed_count=processed_count,
            total_count=total_count,
            created_at=datetime.now(timezone.utc),
            employee_data=employee_data,
            validation_hash=validation_hash,
            metadata=metadata or {}
        )
        
        # Save checkpoint to disk
        self._save_checkpoint(checkpoint)
        
        logger.info(f"Created checkpoint {checkpoint_id[:8]} for session {session_id} "
                   f"(batch {batch_number}, {processed_count}/{total_count} processed)")
        
        return checkpoint
    
    def get_latest_checkpoint(self, session_id: str) -> Optional[ProcessingCheckpoint]:
        """
        Get the latest checkpoint for a session
        
        Args:
            session_id: Processing session ID
            
        Returns:
            Latest checkpoint if found, None otherwise
        """
        try:
            checkpoint_pattern = f"{session_id}_checkpoint_*.json"
            checkpoint_files = list(self.checkpoint_dir.glob(checkpoint_pattern))
            
            if not checkpoint_files:
                return None
            
            # Find the latest checkpoint by batch number
            latest_file = None
            latest_batch = -1
            
            for file_path in checkpoint_files:
                try:
                    with open(file_path, 'r') as f:
                        checkpoint_data = json.load(f)
                    
                    if checkpoint_data["batch_number"] > latest_batch:
                        latest_batch = checkpoint_data["batch_number"]
                        latest_file = file_path
                        
                except Exception as e:
                    logger.warning(f"Error reading checkpoint file {file_path}: {e}")
                    continue
            
            if latest_file:
                return self._load_checkpoint(latest_file)
            
        except Exception as e:
            logger.error(f"Error getting latest checkpoint for session {session_id}: {e}")
        
        return None
    
    def validate_batch_data(self, employee_data: List[Dict[str, Any]]) -> ValidationResult:
        """
        Validate a batch of employee data
        
        Args:
            employee_data: List of employee data dictionaries
            
        Returns:
            Validation result
        """
        result = ValidationResult(is_valid=True)
        
        for i, employee in enumerate(employee_data):
            try:
                # Check required fields
                for field in self.validation_rules["required_fields"]:
                    if field not in employee or employee[field] is None:
                        result.errors.append(f"Employee {i+1}: Missing required field '{field}'")
                        result.is_valid = False
                
                # Validate numeric fields
                for field in self.validation_rules["numeric_fields"]:
                    if field in employee and employee[field] is not None:
                        try:
                            amount = float(employee[field])
                            
                            if amount > self.validation_rules["max_amount"]:
                                result.warnings.append(
                                    f"Employee {i+1}: Large amount in '{field}': ${amount:.2f}"
                                )
                            
                            if amount < self.validation_rules["min_amount"]:
                                result.errors.append(
                                    f"Employee {i+1}: Invalid negative amount in '{field}': ${amount:.2f}"
                                )
                                result.is_valid = False
                                
                        except (ValueError, TypeError):
                            result.errors.append(
                                f"Employee {i+1}: Invalid numeric value in '{field}': {employee[field]}"
                            )
                            result.is_valid = False
                
                # Check for duplicate employee names within batch
                employee_name = employee.get("employee_name", "").strip()
                if employee_name:
                    duplicates = [
                        j for j, other in enumerate(employee_data[i+1:], i+1)
                        if other.get("employee_name", "").strip().lower() == employee_name.lower()
                    ]
                    if duplicates:
                        result.warnings.append(
                            f"Employee {i+1}: Potential duplicate name '{employee_name}' "
                            f"found at positions {duplicates}"
                        )
                
            except Exception as e:
                result.errors.append(f"Employee {i+1}: Validation error: {str(e)}")
                result.is_valid = False
        
        # Overall batch validation
        if len(employee_data) == 0:
            result.errors.append("Batch contains no employee data")
            result.is_valid = False
        elif len(employee_data) > 50:  # Large batch warning
            result.warnings.append(f"Large batch size: {len(employee_data)} employees")
        
        result.metadata.update({
            "batch_size": len(employee_data),
            "validation_timestamp": datetime.now(timezone.utc).isoformat(),
            "error_count": len(result.errors),
            "warning_count": len(result.warnings)
        })
        
        logger.debug(f"Batch validation completed: {len(result.errors)} errors, "
                    f"{len(result.warnings)} warnings for {len(employee_data)} employees")
        
        return result
    
    def verify_data_integrity(self, session: Session, session_id: str) -> ValidationResult:
        """
        Verify data integrity for a processing session
        
        Args:
            session: Database session
            session_id: Processing session ID
            
        Returns:
            Integrity verification result
        """
        result = ValidationResult(is_valid=True)
        
        try:
            # Get processing session
            processing_session = session.query(ProcessingSession).filter(
                ProcessingSession.session_id == session_id
            ).first()
            
            if not processing_session:
                result.errors.append(f"Processing session {session_id} not found")
                result.is_valid = False
                return result
            
            # Count employee revisions
            revision_count = session.query(EmployeeRevision).filter(
                EmployeeRevision.session_id == session_id
            ).count()
            
            # Check if counts are reasonable (allow for some variance due to retries, etc.)
            expected_count = processing_session.processed_employees
            if expected_count > 0 and revision_count == 0:
                result.errors.append(
                    f"No employee revisions found for session with {expected_count} processed employees"
                )
                result.is_valid = False
            elif expected_count > 0 and revision_count < expected_count * 0.5:
                result.warnings.append(
                    f"Low employee revision count: expected ~{expected_count}, found {revision_count}"
                )
            elif expected_count > 0 and revision_count > expected_count * 2:
                result.warnings.append(
                    f"High employee revision count: expected ~{expected_count}, found {revision_count} (possible duplicates)"
                )
            
            # Check for orphaned revisions (revisions without valid session)
            orphaned_count = session.execute(text("""
                SELECT COUNT(*) FROM employee_revisions er 
                WHERE er.session_id = :session_id 
                AND NOT EXISTS (
                    SELECT 1 FROM processing_sessions ps 
                    WHERE ps.session_id = er.session_id
                )
            """), {"session_id": session_id}).scalar()
            
            if orphaned_count > 0:
                result.errors.append(f"Found {orphaned_count} orphaned employee revisions")
                result.is_valid = False
            
            # Validate amount totals
            amount_query = session.execute(text("""
                SELECT 
                    COUNT(*) as revision_count,
                    SUM(CASE WHEN car_amount IS NOT NULL THEN 1 ELSE 0 END) as car_count,
                    SUM(CASE WHEN receipt_amount IS NOT NULL THEN 1 ELSE 0 END) as receipt_count,
                    SUM(CAST(car_amount AS DECIMAL)) as total_car_amount,
                    SUM(CAST(receipt_amount AS DECIMAL)) as total_receipt_amount
                FROM employee_revisions 
                WHERE session_id = :session_id
            """), {"session_id": session_id}).fetchone()
            
            if amount_query:
                result.metadata.update({
                    "revision_count": amount_query.revision_count,
                    "car_count": amount_query.car_count,
                    "receipt_count": amount_query.receipt_count,
                    "total_car_amount": float(amount_query.total_car_amount or 0),
                    "total_receipt_amount": float(amount_query.total_receipt_amount or 0)
                })
                
                # Check for unreasonably large totals
                if amount_query.total_car_amount and amount_query.total_car_amount > 100000:
                    result.warnings.append(
                        f"Very large total CAR amount: ${amount_query.total_car_amount:.2f}"
                    )
                
                if amount_query.total_receipt_amount and amount_query.total_receipt_amount > 100000:
                    result.warnings.append(
                        f"Very large total receipt amount: ${amount_query.total_receipt_amount:.2f}"
                    )
            
            result.metadata.update({
                "session_id": session_id,
                "verification_timestamp": datetime.now(timezone.utc).isoformat(),
                "expected_employee_count": expected_count,
                "actual_revision_count": revision_count
            })
            
        except Exception as e:
            result.errors.append(f"Integrity verification failed: {str(e)}")
            result.is_valid = False
            logger.error(f"Data integrity verification failed for session {session_id}: {e}")
        
        return result
    
    def cleanup_checkpoints(self, session_id: str, keep_latest: int = 3):
        """
        Clean up old checkpoints, keeping only the most recent ones
        
        Args:
            session_id: Processing session ID
            keep_latest: Number of latest checkpoints to keep
        """
        try:
            checkpoint_pattern = f"{session_id}_checkpoint_*.json"
            checkpoint_files = list(self.checkpoint_dir.glob(checkpoint_pattern))
            
            if len(checkpoint_files) <= keep_latest:
                return
            
            # Sort by batch number (extracted from filename)
            sorted_files = []
            for file_path in checkpoint_files:
                try:
                    with open(file_path, 'r') as f:
                        checkpoint_data = json.load(f)
                    sorted_files.append((checkpoint_data["batch_number"], file_path))
                except:
                    continue
            
            sorted_files.sort(key=lambda x: x[0], reverse=True)
            
            # Keep only the latest checkpoints
            files_to_delete = sorted_files[keep_latest:]
            
            for _, file_path in files_to_delete:
                try:
                    file_path.unlink()
                    logger.debug(f"Deleted old checkpoint: {file_path.name}")
                except Exception as e:
                    logger.warning(f"Failed to delete checkpoint {file_path.name}: {e}")
            
            logger.info(f"Cleaned up {len(files_to_delete)} old checkpoints for session {session_id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up checkpoints for session {session_id}: {e}")
    
    def recover_from_checkpoint(self, checkpoint: ProcessingCheckpoint) -> Dict[str, Any]:
        """
        Prepare recovery data from a checkpoint
        
        Args:
            checkpoint: Checkpoint to recover from
            
        Returns:
            Recovery information
        """
        # Validate checkpoint integrity
        current_hash = self._create_validation_hash(checkpoint.employee_data)
        
        if current_hash != checkpoint.validation_hash:
            logger.error(f"Checkpoint {checkpoint.checkpoint_id} integrity validation failed")
            return {
                "success": False,
                "error": "Checkpoint data integrity compromised"
            }
        
        recovery_info = {
            "success": True,
            "checkpoint_id": checkpoint.checkpoint_id,
            "session_id": checkpoint.session_id,
            "resume_from_batch": checkpoint.batch_number + 1,
            "processed_count": checkpoint.processed_count,
            "total_count": checkpoint.total_count,
            "remaining_count": checkpoint.total_count - checkpoint.processed_count,
            "recovery_timestamp": datetime.now(timezone.utc).isoformat(),
            "checkpoint_age_seconds": (
                datetime.now(timezone.utc) - checkpoint.created_at
            ).total_seconds()
        }
        
        logger.info(f"Recovery prepared from checkpoint {checkpoint.checkpoint_id[:8]} "
                   f"for session {checkpoint.session_id} "
                   f"({recovery_info['remaining_count']} employees remaining)")
        
        return recovery_info
    
    def _create_validation_hash(self, employee_data: List[Dict[str, Any]]) -> str:
        """Create a validation hash for employee data"""
        import hashlib
        
        # Create a deterministic string representation
        data_str = json.dumps(employee_data, sort_keys=True, default=str)
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    def _save_checkpoint(self, checkpoint: ProcessingCheckpoint):
        """Save checkpoint to disk"""
        checkpoint_file = (
            self.checkpoint_dir / 
            f"{checkpoint.session_id}_checkpoint_{checkpoint.batch_number:04d}.json"
        )
        
        checkpoint_data = {
            "checkpoint_id": checkpoint.checkpoint_id,
            "session_id": checkpoint.session_id,
            "batch_number": checkpoint.batch_number,
            "processed_count": checkpoint.processed_count,
            "total_count": checkpoint.total_count,
            "created_at": checkpoint.created_at.isoformat(),
            "employee_data": checkpoint.employee_data,
            "validation_hash": checkpoint.validation_hash,
            "metadata": checkpoint.metadata
        }
        
        with open(checkpoint_file, 'w') as f:
            json.dump(checkpoint_data, f, indent=2, default=str)
    
    def _load_checkpoint(self, file_path: Path) -> ProcessingCheckpoint:
        """Load checkpoint from disk"""
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        return ProcessingCheckpoint(
            checkpoint_id=data["checkpoint_id"],
            session_id=data["session_id"],
            batch_number=data["batch_number"],
            processed_count=data["processed_count"],
            total_count=data["total_count"],
            created_at=datetime.fromisoformat(data["created_at"]),
            employee_data=data["employee_data"],
            validation_hash=data["validation_hash"],
            metadata=data.get("metadata", {})
        )


# Global consistency manager instance
consistency_manager = ConsistencyManager()


def get_consistency_manager() -> ConsistencyManager:
    """Get the global consistency manager instance"""
    return consistency_manager


def validate_and_checkpoint(
    session_id: str,
    batch_number: int,
    processed_count: int,
    total_count: int,
    employee_data: List[Dict[str, Any]],
    metadata: Dict[str, Any] = None
) -> tuple[ValidationResult, Optional[ProcessingCheckpoint]]:
    """
    Validate employee data and create checkpoint if valid
    
    Args:
        session_id: Processing session ID
        batch_number: Current batch number
        processed_count: Number of employees processed so far
        total_count: Total number of employees to process
        employee_data: Current batch of employee data
        metadata: Additional metadata
        
    Returns:
        Tuple of (validation_result, checkpoint)
    """
    validation_result = consistency_manager.validate_batch_data(employee_data)
    
    checkpoint = None
    if validation_result.is_valid:
        checkpoint = consistency_manager.create_checkpoint(
            session_id=session_id,
            batch_number=batch_number,
            processed_count=processed_count,
            total_count=total_count,
            employee_data=employee_data,
            metadata=metadata
        )
    else:
        logger.warning(f"Skipping checkpoint creation due to validation errors: "
                      f"{len(validation_result.errors)} errors found")
    
    return validation_result, checkpoint