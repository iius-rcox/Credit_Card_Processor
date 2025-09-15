"""
Utility modules for Credit Card Processor
"""

from .error_handling import (
    StandardError,
    create_error_response,
    authentication_error,
    authorization_error,
    session_not_found_error,
    invalid_uuid_error,
    database_error,
    validation_error
)

from .error_handlers import (
    db_error_handler,
    db_transaction_handler,
    log_and_track_error,
    retry_async_operation,
    retry_sync_operation,
    timeout_handler,
    async_timeout_handler,
    ErrorMetrics,
    error_metrics
)

__all__ = [
    # Error handling functions
    "StandardError",
    "create_error_response", 
    "authentication_error",
    "authorization_error",
    "session_not_found_error",
    "invalid_uuid_error",
    "database_error",
    "validation_error",
    # Database error handlers
    "db_error_handler",
    "db_transaction_handler",
    "log_and_track_error",
    # Retry and timeout utilities
    "retry_async_operation",
    "retry_sync_operation",
    "timeout_handler",
    "async_timeout_handler",
    # Error metrics
    "ErrorMetrics",
    "error_metrics"
]