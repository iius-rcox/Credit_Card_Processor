"""
Delta-Aware Processing Engine

Implements optimized processing for delta sessions by identifying changed
employees and skipping unchanged ones to improve processing performance.
"""

import asyncio
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple, Set
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import desc, text
from sqlalchemy.exc import SQLAlchemyError

from ..models import (
    ProcessingSession, EmployeeRevision, SessionStatus, 
    ValidationStatus, ActivityType
)
from ..services.mock_processor import (
    simulate_document_processing, log_processing_activity, 
    update_session_status, generate_mock_employee_data
)

# Configure logger
logger = logging.getLogger(__name__)

# Global locks for concurrent access protection
_session_locks = {}
_lock_manager_lock = threading.Lock()


class EmployeeChangeInfo:
    """Information about employee changes between sessions"""
    
    def __init__(
        self, 
        employee_name: str,
        change_type: str,
        current_data: Optional[Dict] = None,
        previous_data: Optional[Dict] = None,
        changes: Optional[Dict] = None
    ):
        self.employee_name = employee_name
        self.change_type = change_type  # 'new', 'modified', 'unchanged'
        self.current_data = current_data or {}
        self.previous_data = previous_data or {}
        self.changes = changes or {}


class DeltaProcessingConfig:
    """Configuration for delta processing behavior"""
    
    def __init__(
        self,
        enable_delta_processing: bool = True,
        skip_unchanged_employees: bool = True,
        amount_change_threshold: float = 0.01,  # $0.01 threshold
        force_reprocess_validation_issues: bool = True,
        max_unchanged_skip_percentage: float = 0.8  # Skip at most 80% of employees
    ):
        self.enable_delta_processing = enable_delta_processing
        self.skip_unchanged_employees = skip_unchanged_employees
        self.amount_change_threshold = amount_change_threshold
        self.force_reprocess_validation_issues = force_reprocess_validation_issues
        self.max_unchanged_skip_percentage = max_unchanged_skip_percentage


def _get_session_lock(session_id: str) -> threading.Lock:
    """Get or create a lock for a specific session to prevent concurrent processing"""
    with _lock_manager_lock:
        if session_id not in _session_locks:
            _session_locks[session_id] = threading.Lock()
        return _session_locks[session_id]

def _cleanup_session_lock(session_id: str):
    """Clean up session lock after processing completion"""
    with _lock_manager_lock:
        _session_locks.pop(session_id, None)


class DeltaAwareProcessor:
    """
    Delta-aware processing engine that optimizes processing by identifying
    and skipping unchanged employees from previous sessions.
    
    ENHANCED: Includes concurrent access protection
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.logger = logger
    
    async def process_delta_session(
        self, 
        session_id: str, 
        config: DeltaProcessingConfig,
        processing_state: Dict[str, Any],
        user: str
    ) -> Dict[str, Any]:
        """
        Process a session with delta optimization
        ENHANCED: Concurrent access protection
        
        Args:
            session_id: Current session ID to process
            config: Delta processing configuration
            processing_state: Current processing state for control
            user: Username for activity logging
            
        Returns:
            Dict containing processing results and delta statistics
        """
        # CONCURRENT ACCESS PROTECTION: Acquire session lock
        session_lock = _get_session_lock(session_id)
        
        if not session_lock.acquire(blocking=False):
            self.logger.warning(f"Session {session_id} is already being processed")
            raise ValueError("Session is currently being processed by another request")
        
        try:
            session = self._get_session(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            # Check if session is already processing
            if session.status == SessionStatus.PROCESSING:
                raise ValueError("Session is already in processing state")
        
        except Exception as e:
            session_lock.release()
            _cleanup_session_lock(session_id)
            raise
        
        try:
            if not session.delta_session_id or not config.enable_delta_processing:
                # Fall back to regular processing if no delta session or disabled
                return await self._process_regular_session(session, processing_state, user)
            
            # Get the base session for comparison
            base_session = self._get_session(str(session.delta_session_id))
            if not base_session:
                self.logger.warning(f"Base session {session.delta_session_id} not found, falling back to regular processing")
                return await self._process_regular_session(session, processing_state, user)
            
            # Log delta processing start
            await log_processing_activity(
                self.db, session_id, ActivityType.PROCESSING_STARTED,
                f"Starting delta processing using base session {base_session.session_name}",
                user
            )
            
            # Analyze changes between sessions
            change_analysis = await self.identify_changed_employees(session, base_session, config)
            
            # Log change analysis results
            await self._log_delta_analysis(session_id, change_analysis, user)
            
            # Process based on change analysis
            processing_results = await self._execute_delta_processing(
                session, base_session, change_analysis, config, processing_state, user
            )
            
            return processing_results
            
        finally:
            # ALWAYS release the session lock
            session_lock.release()
            _cleanup_session_lock(session_id)
    
    async def identify_changed_employees(
        self, 
        current_session: ProcessingSession,
        base_session: ProcessingSession,
        config: DeltaProcessingConfig
    ) -> Dict[str, Any]:
        """
        Identify changes between current and base session employees
        
        Args:
            current_session: Current session being processed
            base_session: Base session for comparison
            config: Delta processing configuration
            
        Returns:
            Dictionary containing change analysis results
        """
        # MEMORY OPTIMIZATION: Load base employees with pagination to prevent memory issues
        try:
            # First get total count to decide on pagination strategy
            total_base_employees = self.db.query(EmployeeRevision).filter(
                EmployeeRevision.session_id == base_session.session_id
            ).count()
            
            # Use pagination for large datasets to prevent memory exhaustion
            BATCH_SIZE = 1000  # Process in batches to manage memory
            base_employees = []
            
            if total_base_employees > BATCH_SIZE:
                self.logger.info(f"Loading {total_base_employees} base employees in batches of {BATCH_SIZE}")
                
                for offset in range(0, total_base_employees, BATCH_SIZE):
                    batch = self.db.query(EmployeeRevision).filter(
                        EmployeeRevision.session_id == base_session.session_id
                    ).offset(offset).limit(BATCH_SIZE).all()
                    base_employees.extend(batch)
                    
                    # Periodic memory cleanup
                    if offset % (BATCH_SIZE * 5) == 0:  # Every 5 batches
                        import gc
                        gc.collect()
            else:
                base_employees = self.db.query(EmployeeRevision).filter(
                    EmployeeRevision.session_id == base_session.session_id
                ).options(
                    # Load all needed relationships in single query to prevent N+1
                    # (add joinedload if there are relationships to load)
                ).all()
                
        except SQLAlchemyError as e:
            self.logger.error(f"Failed to load base session employees: {str(e)}")
            raise
        
        # Create lookup for base employees by name
        base_employee_map = {emp.employee_name: emp for emp in base_employees}
        
        # Generate current session data (simulated from files)
        current_employee_data = generate_mock_employee_data(
            num_employees=45,  # Configurable based on file content
            base_session_data=base_employees if config.enable_delta_processing else None
        )
        
        # Analyze changes
        changes = []
        unchanged = []
        new_employees = []
        modified_employees = []
        
        for current_emp_data in current_employee_data:
            emp_name = current_emp_data['name']
            
            if emp_name in base_employee_map:
                base_emp = base_employee_map[emp_name]
                change_info = self._compare_employee_data(
                    current_emp_data, base_emp, config
                )
                
                if change_info.change_type == 'unchanged':
                    unchanged.append(change_info)
                else:
                    modified_employees.append(change_info)
                    changes.append(change_info)
            else:
                # New employee
                change_info = EmployeeChangeInfo(
                    employee_name=emp_name,
                    change_type='new',
                    current_data=current_emp_data
                )
                new_employees.append(change_info)
                changes.append(change_info)
        
        # Calculate statistics
        total_employees = len(current_employee_data)
        changed_count = len(changes)
        unchanged_count = len(unchanged)
        
        return {
            'total_employees': total_employees,
            'changed_employees': changed_count,
            'unchanged_employees': unchanged_count,
            'new_employees': len(new_employees),
            'modified_employees': len(modified_employees),
            'change_percentage': (changed_count / total_employees) * 100 if total_employees > 0 else 0,
            'skip_eligible': unchanged_count,
            'changes': changes,
            'unchanged': unchanged,
            'new': new_employees,
            'modified': modified_employees,
            'current_data': current_employee_data,
            'base_session_id': str(base_session.session_id),
            'base_session_name': base_session.session_name
        }
    
    def _compare_employee_data(
        self, 
        current_data: Dict, 
        base_employee: EmployeeRevision,
        config: DeltaProcessingConfig
    ) -> EmployeeChangeInfo:
        """
        Compare current employee data with base session employee
        
        Args:
            current_data: Current employee data from files
            base_employee: Employee revision from base session
            config: Delta processing configuration
            
        Returns:
            EmployeeChangeInfo object with comparison results
        """
        changes = {}
        
        # Compare CAR amount
        current_car = Decimal(str(current_data.get('car_amount', 0)))
        base_car = base_employee.car_amount or Decimal('0')
        if abs(current_car - base_car) > Decimal(str(config.amount_change_threshold)):
            changes['car_amount'] = {
                'old': float(base_car),
                'new': float(current_car),
                'diff': float(current_car - base_car)
            }
        
        # Compare Receipt amount
        current_receipt = Decimal(str(current_data.get('receipt_amount', 0)))
        base_receipt = base_employee.receipt_amount or Decimal('0')
        if abs(current_receipt - base_receipt) > Decimal(str(config.amount_change_threshold)):
            changes['receipt_amount'] = {
                'old': float(base_receipt),
                'new': float(current_receipt),
                'diff': float(current_receipt - base_receipt)
            }
        
        # Check for validation status changes (always reprocess if had issues)
        if config.force_reprocess_validation_issues:
            if base_employee.validation_status != ValidationStatus.VALID:
                changes['validation_status'] = {
                    'old': base_employee.validation_status.value,
                    'reason': 'Previous validation issues require reprocessing'
                }
        
        # Determine change type
        if changes:
            change_type = 'modified'
        else:
            change_type = 'unchanged'
        
        return EmployeeChangeInfo(
            employee_name=current_data['name'],
            change_type=change_type,
            current_data=current_data,
            previous_data={
                'car_amount': float(base_car),
                'receipt_amount': float(base_receipt),
                'validation_status': base_employee.validation_status.value,
                'employee_id': base_employee.employee_id
            },
            changes=changes
        )
    
    async def _execute_delta_processing(
        self,
        session: ProcessingSession,
        base_session: ProcessingSession,
        change_analysis: Dict[str, Any],
        config: DeltaProcessingConfig,
        processing_state: Dict[str, Any],
        user: str
    ) -> Dict[str, Any]:
        """
        Execute the actual delta processing based on change analysis
        ENHANCED: Proper transaction management with rollbacks
        """
        start_time = time.time()
        processed_count = 0
        skipped_count = 0
        errors = []
        
        # Begin transaction for delta processing
        transaction = self.db.begin()
        
        try:
            # Update session status within transaction
            await update_session_status(
                self.db, str(session.session_id), 
                SessionStatus.PROCESSING, 
                total_employees=change_analysis['total_employees'],
                processed_employees=0  # Start at 0 for proper progress tracking
            )
            
            # Determine processing strategy
            skip_eligible_count = change_analysis['skip_eligible']
            total_count = change_analysis['total_employees']
            
            # Check if we should skip unchanged employees
            should_skip_unchanged = (
                config.skip_unchanged_employees and 
                skip_eligible_count > 0 and
                (skip_eligible_count / total_count) <= config.max_unchanged_skip_percentage
            )
            
            if should_skip_unchanged:
                # Copy unchanged employees from base session
                await self._copy_unchanged_employees(session, base_session, change_analysis['unchanged'], user)
                skipped_count = len(change_analysis['unchanged'])
                
                # Process only changed employees
                employees_to_process = change_analysis['changes']
                await log_processing_activity(
                    self.db, str(session.session_id), ActivityType.PROCESSING_PROGRESS,
                    f"Delta optimization: Skipping {skipped_count} unchanged employees, processing {len(employees_to_process)} changed",
                    user
                )
            else:
                # Process all employees (delta disabled or too many changes)
                employees_to_process = change_analysis['current_data']
                await log_processing_activity(
                    self.db, str(session.session_id), ActivityType.PROCESSING_PROGRESS,
                    f"Processing all {len(employees_to_process)} employees (delta optimization bypassed)",
                    user
                )
            
            # Process the selected employees
            for i, emp_data in enumerate(employees_to_process):
                # Check for pause/cancel requests
                if processing_state.get("should_pause", False):
                    processing_state["status"] = "paused"
                    await update_session_status(self.db, str(session.session_id), SessionStatus.PAUSED)
                    await log_processing_activity(
                        self.db, str(session.session_id), ActivityType.PROCESSING_PAUSED,
                        f"Processing paused at employee {processed_count + 1}",
                        user
                    )
                    break
                
                if processing_state.get("should_cancel", False):
                    processing_state["status"] = "cancelled"
                    await update_session_status(self.db, str(session.session_id), SessionStatus.CANCELLED)
                    await log_processing_activity(
                        self.db, str(session.session_id), ActivityType.PROCESSING_CANCELLED,
                        f"Processing cancelled at employee {processed_count + 1}",
                        user
                    )
                    break
                
                try:
                    # Process individual employee
                    if isinstance(emp_data, EmployeeChangeInfo):
                        employee_data = emp_data.current_data
                        change_type = emp_data.change_type
                    else:
                        employee_data = emp_data
                        change_type = 'regular'
                    
                    # Process individual employee (simplified for delta processing)
                    employee_result = await self._process_individual_employee(
                        session, employee_data, user
                    )
                    
                    if employee_result:
                        processed_count += 1
                        processing_state["current_employee_index"] = processed_count + skipped_count
                        
                        # Update session's processed_employees counter for progress tracking
                        if processed_count % 10 == 0 or processed_count == len(employees_to_process):  # Update every 10 employees or at end
                            await update_session_status(
                                self.db, str(session.session_id),
                                SessionStatus.PROCESSING,
                                processed_employees=processed_count + skipped_count  # Include skipped in total processed
                            )
                        
                        # Log delta-specific information
                        if change_type in ['modified', 'new']:
                            await log_processing_activity(
                                self.db, str(session.session_id), ActivityType.PROCESSING_PROGRESS,
                                f"Processed {change_type} employee: {employee_data['name']}",
                                user
                            )
                    else:
                        errors.append(f"Failed to process {employee_data['name']}")
                        
                except Exception as e:
                    self.logger.error(f"Error processing employee {employee_data.get('name', 'unknown')}: {e}")
                    errors.append(f"Error processing {employee_data.get('name', 'unknown')}: {str(e)}")
                
                # Small delay to prevent overwhelming the system
                await asyncio.sleep(0.1)
            
            # Update final session status within transaction
            if not processing_state.get("should_pause", False) and not processing_state.get("should_cancel", False):
                total_processed = processed_count + skipped_count
                await update_session_status(
                    self.db, str(session.session_id), 
                    SessionStatus.COMPLETED,
                    processed_employees=total_processed
                )
                
                processing_state["status"] = "completed"
                
                await log_processing_activity(
                    self.db, str(session.session_id), ActivityType.PROCESSING_COMPLETED,
                    f"Delta processing completed: {processed_count} processed, {skipped_count} skipped from base session",
                    user
                )
            
            # Commit transaction if everything succeeded
            transaction.commit()
            
            processing_time = time.time() - start_time
            
            return {
                'success': True,
                'processing_time': processing_time,
                'processed_count': processed_count,
                'skipped_count': skipped_count,
                'total_employees': change_analysis['total_employees'],
                'errors': errors,
                'delta_stats': {
                    'base_session_id': change_analysis['base_session_id'],
                    'base_session_name': change_analysis['base_session_name'],
                    'changed_employees': change_analysis['changed_employees'],
                    'unchanged_employees': change_analysis['unchanged_employees'],
                    'change_percentage': change_analysis['change_percentage'],
                    'optimization_used': should_skip_unchanged
                }
            }
            
        except Exception as e:
            # Rollback transaction on any error
            transaction.rollback()
            self.logger.error(f"Delta processing failed, transaction rolled back: {str(e)}")
            
            # Update session status to failed
            try:
                await update_session_status(
                    self.db, str(session.session_id), 
                    SessionStatus.FAILED
                )
                await log_processing_activity(
                    self.db, str(session.session_id), ActivityType.PROCESSING_FAILED,
                    f"Delta processing failed: {str(e)}",
                    user
                )
            except Exception as status_error:
                self.logger.error(f"Failed to update session status after error: {status_error}")
            
            # Return error result
            return {
                'success': False,
                'processing_time': time.time() - start_time,
                'processed_count': processed_count,
                'skipped_count': skipped_count,
                'total_employees': change_analysis['total_employees'],
                'errors': errors + [f"Processing failed: {str(e)}"],
                'delta_stats': {}
            }
    
    async def _copy_unchanged_employees(
        self,
        current_session: ProcessingSession,
        base_session: ProcessingSession,
        unchanged_employees: List[EmployeeChangeInfo],
        user: str
    ):
        """
        Copy unchanged employees from base session to current session
        OPTIMIZED: Uses bulk operations to prevent N+1 queries
        """
        if not unchanged_employees:
            return
        
        try:
            # Get all employee names to copy (bulk query preparation)
            employee_names = [emp.employee_name for emp in unchanged_employees]
            
            # PERFORMANCE FIX: Single query instead of N queries
            base_employees = self.db.query(EmployeeRevision).filter(
                EmployeeRevision.session_id == base_session.session_id,
                EmployeeRevision.employee_name.in_(employee_names)
            ).all()
            
            # Create lookup map for fast access
            base_emp_map = {emp.employee_name: emp for emp in base_employees}
            
            # Prepare bulk insert data
            new_employees = []
            current_time = datetime.now(timezone.utc)
            
            for emp_change in unchanged_employees:
                base_emp = base_emp_map.get(emp_change.employee_name)
                if base_emp:
                    new_employee = EmployeeRevision(
                        session_id=current_session.session_id,
                        employee_id=base_emp.employee_id,
                        employee_name=base_emp.employee_name,
                        car_amount=base_emp.car_amount,
                        receipt_amount=base_emp.receipt_amount,
                        validation_status=base_emp.validation_status,
                        validation_flags=base_emp.validation_flags.copy() if base_emp.validation_flags else {},
                        created_at=current_time,
                        updated_at=current_time,
                        resolved_by=base_emp.resolved_by,
                        resolution_notes=f"Copied from base session {base_session.session_name} (unchanged)"
                    )
                    new_employees.append(new_employee)
            
            # MEMORY & PERFORMANCE OPTIMIZATION: Batch bulk inserts for large datasets
            # Note: Transaction management handled at higher level
            if new_employees:
                BULK_INSERT_BATCH_SIZE = 500  # Prevent memory issues with large bulk inserts
                total_employees = len(new_employees)
                
                if total_employees > BULK_INSERT_BATCH_SIZE:
                    self.logger.info(f"Bulk inserting {total_employees} employees in batches of {BULK_INSERT_BATCH_SIZE}")
                    
                    for i in range(0, total_employees, BULK_INSERT_BATCH_SIZE):
                        batch = new_employees[i:i + BULK_INSERT_BATCH_SIZE]
                        self.db.bulk_save_objects(batch)
                        
                        # Periodic memory cleanup for large datasets
                        if i % (BULK_INSERT_BATCH_SIZE * 5) == 0:  # Every 5 batches
                            import gc
                            gc.collect()
                else:
                    self.db.bulk_save_objects(new_employees)
                # Don't commit here - let the main transaction handle it
                
        except Exception as e:
            self.logger.error(f"Failed to copy unchanged employees: {str(e)}")
            # Don't rollback here - let the main transaction handle it
            raise
    
    async def _process_regular_session(
        self, 
        session: ProcessingSession, 
        processing_state: Dict[str, Any], 
        user: str
    ) -> Dict[str, Any]:
        """
        Fallback to regular processing when delta processing is not available
        """
        await log_processing_activity(
            self.db, str(session.session_id), ActivityType.PROCESSING_STARTED,
            "Starting regular processing (delta processing not available)",
            user
        )
        
        # Use existing mock processor for regular processing
        # This would integrate with the existing processing logic
        return {
            'success': True,
            'processing_type': 'regular',
            'message': 'Regular processing completed (delta processing not used)'
        }
    
    async def _log_delta_analysis(
        self, 
        session_id: str, 
        change_analysis: Dict[str, Any], 
        user: str
    ):
        """
        Log delta analysis results for debugging and monitoring
        """
        stats_message = (
            f"Delta analysis completed: {change_analysis['total_employees']} total employees, "
            f"{change_analysis['changed_employees']} changed ({change_analysis['change_percentage']:.1f}%), "
            f"{change_analysis['unchanged_employees']} unchanged, "
            f"{change_analysis['new_employees']} new, "
            f"{change_analysis['modified_employees']} modified"
        )
        
        await log_processing_activity(
            self.db, session_id, ActivityType.PROCESSING_PROGRESS,
            stats_message, user
        )
    
    async def _process_individual_employee(
        self,
        session: ProcessingSession,
        employee_data: Dict[str, Any],
        user: str
    ) -> bool:
        """
        Process an individual employee and create EmployeeRevision record
        """
        try:
            # Create employee revision record
            employee = EmployeeRevision(
                session_id=session.session_id,
                employee_id=employee_data.get('employee_id'),
                employee_name=employee_data['name'],
                car_amount=Decimal(str(employee_data.get('car_amount', 0))),
                receipt_amount=Decimal(str(employee_data.get('receipt_amount', 0))),
                validation_status=ValidationStatus.VALID,  # Simplified for delta processing
                validation_flags={},
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            self.db.add(employee)
            # Transaction management handled at higher level
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error processing individual employee {employee_data.get('name', 'unknown')}: {e}")
            # Transaction management handled at higher level
            raise
    
    def _get_session(self, session_id: str) -> Optional[ProcessingSession]:
        """Get session by ID"""
        try:
            return self.db.query(ProcessingSession).filter(
                ProcessingSession.session_id == session_id
            ).first()
        except Exception as e:
            self.logger.error(f"Error retrieving session {session_id}: {e}")
            return None


# Utility functions for integration with existing processing system
def create_delta_processing_config(processing_options: Dict[str, Any]) -> DeltaProcessingConfig:
    """
    Create delta processing configuration from session processing options
    """
    return DeltaProcessingConfig(
        enable_delta_processing=processing_options.get('enable_delta_processing', True),
        skip_unchanged_employees=processing_options.get('skip_unchanged_employees', True),
        amount_change_threshold=processing_options.get('amount_change_threshold', 0.01),
        force_reprocess_validation_issues=processing_options.get('force_reprocess_validation_issues', True),
        max_unchanged_skip_percentage=processing_options.get('max_unchanged_skip_percentage', 0.8)
    )


def should_use_delta_processing(session: ProcessingSession) -> bool:
    """
    Determine if delta processing should be used for a session
    """
    return (
        session.delta_session_id is not None and 
        session.processing_options.get('enable_delta_processing', True)
    )