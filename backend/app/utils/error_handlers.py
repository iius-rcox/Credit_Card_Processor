"""
Error handling utilities for export operations
Provides context managers and retry logic for robust error handling
"""

import asyncio
import logging
import time
from contextlib import contextmanager
from typing import Callable, Any, Optional
from functools import wraps

from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from sqlalchemy.orm import Session

from ..exceptions.export_exceptions import DatabaseError, ExportTimeoutError

logger = logging.getLogger(__name__)


@contextmanager
def db_error_handler(db_session: Session, operation_name: str = "database operation"):
    """Handle database errors with proper cleanup and logging"""
    try:
        yield
    except IntegrityError as e:
        db_session.rollback()
        logger.error(f"Database integrity error during {operation_name}: {e}")
        raise DatabaseError(
            f"Data integrity violation during {operation_name}",
            original_error=str(e)
        )
    except OperationalError as e:
        db_session.rollback()
        logger.error(f"Database operational error during {operation_name}: {e}")
        raise DatabaseError(
            f"Database operation failed during {operation_name}",
            original_error=str(e)
        )
    except SQLAlchemyError as e:
        db_session.rollback()
        logger.error(f"SQLAlchemy error during {operation_name}: {e}")
        raise DatabaseError(
            f"Database error during {operation_name}",
            original_error=str(e)
        )
    except Exception as e:
        db_session.rollback()
        logger.error(f"Unexpected error during {operation_name}: {e}")
        raise


@contextmanager 
def db_transaction_handler(db_session: Session, operation_name: str = "transaction"):
    """Handle database transactions with automatic rollback on failure"""
    try:
        yield db_session
        db_session.commit()
        logger.debug(f"Transaction committed successfully: {operation_name}")
    except Exception as e:
        db_session.rollback()
        logger.error(f"Transaction failed and rolled back: {operation_name} - {e}")
        raise


async def retry_async_operation(
    operation: Callable,
    max_retries: int = 3,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    retryable_exceptions: tuple = (ConnectionError, TimeoutError, OperationalError)
) -> Any:
    """
    Retry async operation with exponential backoff
    
    Args:
        operation: Async function to retry
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries (seconds)
        backoff_factor: Multiplier for delay on each retry
        retryable_exceptions: Tuple of exceptions that should trigger retry
    
    Returns:
        Result of the operation
        
    Raises:
        Last exception if all retries fail
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            result = await operation()
            if attempt > 0:
                logger.info(f"Operation succeeded on attempt {attempt + 1}")
            return result
            
        except retryable_exceptions as e:
            last_exception = e
            
            if attempt == max_retries:
                logger.error(f"Operation failed after {max_retries + 1} attempts: {e}")
                break
                
            wait_time = delay * (backoff_factor ** attempt)
            logger.warning(
                f"Operation failed (attempt {attempt + 1}/{max_retries + 1}), "
                f"retrying in {wait_time:.1f}s: {e}"
            )
            await asyncio.sleep(wait_time)
            
        except Exception as e:
            # Non-retryable exception
            logger.error(f"Non-retryable error in operation: {e}")
            raise
    
    # All retries exhausted
    raise last_exception


def retry_sync_operation(
    operation: Callable,
    max_retries: int = 3,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    retryable_exceptions: tuple = (ConnectionError, TimeoutError, OperationalError)
) -> Any:
    """
    Retry synchronous operation with exponential backoff
    
    Similar to retry_async_operation but for sync functions
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            result = operation()
            if attempt > 0:
                logger.info(f"Operation succeeded on attempt {attempt + 1}")
            return result
            
        except retryable_exceptions as e:
            last_exception = e
            
            if attempt == max_retries:
                logger.error(f"Operation failed after {max_retries + 1} attempts: {e}")
                break
                
            wait_time = delay * (backoff_factor ** attempt)
            logger.warning(
                f"Operation failed (attempt {attempt + 1}/{max_retries + 1}), "
                f"retrying in {wait_time:.1f}s: {e}"
            )
            time.sleep(wait_time)
            
        except Exception as e:
            logger.error(f"Non-retryable error in operation: {e}")
            raise
    
    raise last_exception


def timeout_handler(timeout_seconds: int):
    """Decorator to add timeout to sync operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                elapsed = time.time() - start_time
                if elapsed > timeout_seconds:
                    logger.warning(f"Operation took {elapsed:.1f}s (timeout: {timeout_seconds}s)")
                
                return result
                
            except Exception as e:
                elapsed = time.time() - start_time
                if elapsed > timeout_seconds:
                    raise ExportTimeoutError(
                        f"Operation timed out after {elapsed:.1f}s",
                        timeout_seconds=timeout_seconds
                    )
                raise
                
        return wrapper
    return decorator


async def async_timeout_handler(operation: Callable, timeout_seconds: int) -> Any:
    """Add timeout to async operations"""
    try:
        result = await asyncio.wait_for(operation(), timeout=timeout_seconds)
        return result
    except asyncio.TimeoutError:
        raise ExportTimeoutError(
            f"Async operation timed out after {timeout_seconds}s",
            timeout_seconds=timeout_seconds
        )


class ErrorMetrics:
    """Track error metrics for monitoring and alerting"""
    
    def __init__(self):
        self.error_counts = {}
        self.last_errors = []
        self.max_recent_errors = 100
    
    def record_error(self, error_type: str, error_message: str, context: dict = None):
        """Record an error occurrence"""
        # Count by error type
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        # Store recent errors
        error_record = {
            'type': error_type,
            'message': error_message,
            'context': context or {},
            'timestamp': time.time()
        }
        
        self.last_errors.append(error_record)
        
        # Keep only recent errors
        if len(self.last_errors) > self.max_recent_errors:
            self.last_errors = self.last_errors[-self.max_recent_errors:]
    
    def get_error_summary(self) -> dict:
        """Get summary of recent errors"""
        return {
            'total_error_types': len(self.error_counts),
            'error_counts': self.error_counts.copy(),
            'recent_errors_count': len(self.last_errors),
            'most_recent_errors': self.last_errors[-10:] if self.last_errors else []
        }
    
    def clear_metrics(self):
        """Clear all error metrics"""
        self.error_counts.clear()
        self.last_errors.clear()


# Global error metrics instance
error_metrics = ErrorMetrics()


def log_and_track_error(error: Exception, context: dict = None):
    """Log error and add to metrics tracking"""
    error_type = type(error).__name__
    error_message = str(error)
    
    logger.error(f"Error tracked: {error_type} - {error_message}", extra=context)
    error_metrics.record_error(error_type, error_message, context)