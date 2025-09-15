"""
Minimal logging configuration for authentication and security events.
Provides essential security logging without external dependencies.
"""

import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pathlib import Path
import contextvars

# Context variable for correlation ID
correlation_id_var = contextvars.ContextVar('correlation_id', default=None)

# Configure logger
logger = logging.getLogger("security")
logger.setLevel(logging.INFO)

# Create logs directory if it doesn't exist
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Configure file handler for security events
security_handler = logging.FileHandler(log_dir / "security.log")
security_handler.setLevel(logging.INFO)

# Configure console handler for warnings and errors
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.WARNING)

# Custom filter to add correlation ID to log records
class CorrelationIdFilter(logging.Filter):
    def filter(self, record):
        correlation_id = correlation_id_var.get()
        record.correlation_id = f"[{correlation_id}]" if correlation_id else ""
        return True

# Create formatter with correlation ID
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s %(correlation_id)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
security_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add correlation ID filter to handlers
correlation_filter = CorrelationIdFilter()
security_handler.addFilter(correlation_filter)
console_handler.addFilter(correlation_filter)

# Add handlers to logger
logger.addHandler(security_handler)
logger.addHandler(console_handler)


def log_authentication_attempt(
    username: str,
    success: bool,
    ip_address: Optional[str] = None,
    method: Optional[str] = None
) -> None:
    """
    Log authentication attempts for security auditing.
    
    Args:
        username: Username attempting authentication
        success: Whether authentication was successful
        ip_address: Client IP address
        method: Authentication method used (e.g., 'windows', 'development')
    """
    event = {
        "event_type": "authentication",
        "username": username,
        "success": success,
        "ip_address": ip_address or "unknown",
        "method": method or "unknown",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if success:
        # Only log authentication success in debug mode to reduce log noise
        logger.debug(f"Authentication SUCCESS: {username} from {ip_address} via {method}")
    else:
        # Only log authentication failures that are actual security concerns
        # Skip routine development authentication attempts
        if method != "windows_headers" or username != "unknown":
            logger.warning(f"Authentication FAILED: {username} from {ip_address} via {method}")
        else:
            logger.debug(f"Development authentication attempt: {username} from {ip_address} via {method}")
    
    # Also log as JSON for parsing
    logger.debug(json.dumps(event))


def log_authorization_failure(
    username: str,
    resource: str,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None
) -> None:
    """
    Log authorization failures for security monitoring.
    
    Args:
        username: Username that failed authorization
        resource: Resource or endpoint being accessed
        ip_address: Client IP address
        reason: Reason for authorization failure
    """
    event = {
        "event_type": "authorization_failure",
        "username": username,
        "resource": resource,
        "ip_address": ip_address or "unknown",
        "reason": reason or "insufficient_privileges",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    logger.warning(
        f"Authorization DENIED: {username} accessing {resource} "
        f"from {ip_address} - {reason or 'insufficient privileges'}"
    )
    
    # Also log as JSON for parsing
    logger.debug(json.dumps(event))


def log_suspicious_activity(
    description: str,
    details: Optional[Dict[str, Any]] = None,
    severity: str = "warning"
) -> None:
    """
    Log suspicious activities that might indicate security threats.
    
    Args:
        description: Description of the suspicious activity
        details: Additional details about the activity
        severity: Severity level ('info', 'warning', 'error', 'critical')
    """
    event = {
        "event_type": "suspicious_activity",
        "description": description,
        "details": details or {},
        "severity": severity,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Log with appropriate severity
    log_message = f"SUSPICIOUS ACTIVITY: {description}"
    if details:
        log_message += f" - Details: {json.dumps(details, default=str)}"
    
    if severity == "critical":
        logger.critical(log_message)
    elif severity == "error":
        logger.error(log_message)
    elif severity == "warning":
        logger.warning(log_message)
    else:
        logger.info(log_message)
    
    # Also log as JSON for parsing
    logger.debug(json.dumps(event, default=str))


def configure_logging(
    log_level: str = "INFO",
    log_file: Optional[str] = None,
    enable_json: bool = False
) -> None:
    """
    Configure logging settings dynamically.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Custom log file path
        enable_json: Enable JSON formatting for all logs
    """
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    if log_file:
        # Remove existing file handler
        for handler in logger.handlers[:]:
            if isinstance(handler, logging.FileHandler):
                logger.removeHandler(handler)
        
        # Add new file handler
        new_handler = logging.FileHandler(log_file)
        new_handler.setLevel(logger.level)
        new_handler.setFormatter(formatter)
        logger.addHandler(new_handler)
    
    if enable_json:
        # Switch to JSON formatter
        json_formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
            '"module": "%(name)s", "message": "%(message)s"}'
        )
        for handler in logger.handlers:
            handler.setFormatter(json_formatter)


def setup_logging(log_level: str = "INFO") -> None:
    """
    Setup application logging configuration.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    configure_logging(log_level=log_level)
    logger.info("Logging system initialized")


def log_startup_event(message: str) -> None:
    """
    Log application startup events.
    
    Args:
        message: Startup event message
    """
    logger.info(f"STARTUP: {message}")


def log_shutdown_event(message: str) -> None:
    """
    Log application shutdown events.
    
    Args:
        message: Shutdown event message
    """
    logger.info(f"SHUTDOWN: {message}")


def log_api_request(
    method: str = None,
    path: str = None,
    endpoint: str = None,
    user: Optional[str] = None,
    ip_address: Optional[str] = None,
    **kwargs
) -> None:
    """
    Log API request events.
    
    Args:
        method: HTTP method (GET, POST, etc.)
        path: Request path (deprecated, use endpoint)
        endpoint: Request endpoint
        user: Username making the request
        ip_address: Client IP address
    """
    endpoint_path = endpoint or path or 'unknown'
    logger.info(f"API REQUEST: {method} {endpoint_path} from {user or 'anonymous'} at {ip_address or 'unknown'}")


def log_api_error(
    method: str = None,
    path: str = None,
    endpoint: str = None,
    error: str = None,
    user: Optional[str] = None,
    status_code: Optional[int] = None,
    **kwargs
) -> None:
    """
    Log API error events.
    
    Args:
        method: HTTP method
        path: Request path (deprecated, use endpoint)
        endpoint: Request endpoint
        error: Error message
        user: Username making the request
        status_code: HTTP status code
    """
    endpoint_path = endpoint or path or 'unknown'
    logger.error(f"API ERROR: {method} {endpoint_path} - {error} (Status: {status_code or 'unknown'}) User: {user or 'anonymous'}")


def set_correlation_id(correlation_id: str) -> None:
    """
    Set the correlation ID for the current context.
    
    Args:
        correlation_id: The correlation ID to set
    """
    correlation_id_var.set(correlation_id)


def get_correlation_id() -> Optional[str]:
    """
    Get the current correlation ID from context.
    
    Returns:
        The current correlation ID or None
    """
    return correlation_id_var.get()


# Export logger for direct use if needed
__all__ = [
    'log_authentication_attempt',
    'log_authorization_failure', 
    'log_suspicious_activity',
    'configure_logging',
    'setup_logging',
    'log_startup_event',
    'log_shutdown_event',
    'log_api_request',
    'log_api_error',
    'logger',
    'set_correlation_id',
    'get_correlation_id'
]