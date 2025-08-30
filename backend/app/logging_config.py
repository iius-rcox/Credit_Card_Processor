"""
Comprehensive Logging Configuration for Credit Card Processor
Provides structured logging with appropriate levels, formatting, and security considerations
"""

import logging
import logging.config
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from .config import settings

# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

class SecurityFilter(logging.Filter):
    """Filter to prevent logging sensitive information"""
    
    SENSITIVE_PATTERNS = [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'credential',
        'ssn',
        'social security',
        'card number'
    ]
    
    def filter(self, record):
        """Filter out potentially sensitive information from log records"""
        if hasattr(record, 'msg') and isinstance(record.msg, str):
            msg_lower = record.msg.lower()
            for pattern in self.SENSITIVE_PATTERNS:
                if pattern in msg_lower:
                    # Don't completely block, but sanitize the message
                    record.msg = "[REDACTED - Contains sensitive information]"
                    break
        return True

class RequestIdFilter(logging.Filter):
    """Add request ID to log records for tracing"""
    
    def filter(self, record):
        # In a real application, you'd get this from request context
        # For now, we'll use a simple counter or timestamp
        if not hasattr(record, 'request_id'):
            record.request_id = getattr(self, '_request_id', 'unknown')
        return True

def get_logging_config() -> Dict[str, Any]:
    """Get comprehensive logging configuration"""
    
    # Determine log level based on environment
    log_level = "DEBUG" if settings.debug else "INFO"
    
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'detailed': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(funcName)s:%(lineno)d - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'simple': {
                'format': '%(asctime)s - %(levelname)s - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'security': {
                'format': '%(asctime)s - SECURITY - %(levelname)s - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'json': {
                'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "request_id": "%(request_id)s", "function": "%(funcName)s", "line": %(lineno)d, "message": "%(message)s"}',
                'datefmt': '%Y-%m-%dT%H:%M:%S'
            }
        },
        'filters': {
            'security_filter': {
                '()': SecurityFilter
            },
            'request_id_filter': {
                '()': RequestIdFilter
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': log_level,
                'formatter': 'simple',
                'filters': ['security_filter', 'request_id_filter'],
                'stream': sys.stdout
            },
            'file_general': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'detailed',
                'filters': ['security_filter', 'request_id_filter'],
                'filename': str(LOGS_DIR / 'application.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'file_error': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'ERROR',
                'formatter': 'detailed',
                'filters': ['security_filter', 'request_id_filter'],
                'filename': str(LOGS_DIR / 'error.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'file_security': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'security',
                'filters': ['security_filter'],
                'filename': str(LOGS_DIR / 'security.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 10  # Keep more security logs
            },
            'file_api': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'json',
                'filters': ['security_filter', 'request_id_filter'],
                'filename': str(LOGS_DIR / 'api.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            }
        },
        'loggers': {
            # Application loggers
            'app': {
                'level': log_level,
                'handlers': ['console', 'file_general', 'file_error'],
                'propagate': False
            },
            'app.api': {
                'level': 'INFO',
                'handlers': ['file_api', 'console'],
                'propagate': False
            },
            'app.database': {
                'level': 'INFO',
                'handlers': ['console', 'file_general'],
                'propagate': False
            },
            'app.auth': {
                'level': 'INFO',
                'handlers': ['console', 'file_general', 'file_security'],
                'propagate': False
            },
            'security': {
                'level': 'INFO',
                'handlers': ['file_security', 'console'],
                'propagate': False
            },
            # Third-party library loggers
            'sqlalchemy.engine': {
                'level': 'WARNING',
                'handlers': ['file_general'],
                'propagate': False
            },
            'uvicorn': {
                'level': 'INFO',
                'handlers': ['console', 'file_general'],
                'propagate': False
            },
            'uvicorn.access': {
                'level': 'INFO',
                'handlers': ['file_api'],
                'propagate': False
            },
            'fastapi': {
                'level': 'INFO',
                'handlers': ['console', 'file_general'],
                'propagate': False
            }
        },
        'root': {
            'level': 'WARNING',
            'handlers': ['console', 'file_general']
        }
    }
    
    # In production, remove console handler from most loggers to reduce noise
    if not settings.debug:
        # Remove console handlers from file-focused loggers
        config['loggers']['app.api']['handlers'] = ['file_api']
        config['loggers']['security']['handlers'] = ['file_security']
        config['loggers']['uvicorn.access']['handlers'] = ['file_api']
    
    return config

def setup_logging():
    """Initialize comprehensive logging configuration"""
    config = get_logging_config()
    logging.config.dictConfig(config)
    
    # Log startup message
    logger = logging.getLogger('app')
    logger.info("="*60)
    logger.info(f"Credit Card Processor starting up")
    logger.info(f"Environment: {'Development' if settings.debug else 'Production'}")
    logger.info(f"Log level: {logger.level}")
    logger.info(f"Logs directory: {LOGS_DIR.absolute()}")
    logger.info("="*60)
    
    return logger

def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name"""
    return logging.getLogger(name)

# Security-specific logging functions
def log_authentication_attempt(username: str, success: bool, ip_address: str = "unknown", method: str = "unknown"):
    """Log authentication attempts with security context"""
    security_logger = logging.getLogger('security')
    if success:
        security_logger.info(f"Authentication SUCCESS - User: {username}, IP: {ip_address}, Method: {method}")
    else:
        security_logger.warning(f"Authentication FAILED - User: {username}, IP: {ip_address}, Method: {method}")

def log_authorization_failure(username: str, resource: str, action: str, ip_address: str = "unknown"):
    """Log authorization failures"""
    security_logger = logging.getLogger('security')
    security_logger.warning(f"Authorization DENIED - User: {username}, Resource: {resource}, Action: {action}, IP: {ip_address}")

def log_data_access(username: str, resource: str, action: str, record_count: int = 0):
    """Log sensitive data access"""
    security_logger = logging.getLogger('security')
    security_logger.info(f"Data ACCESS - User: {username}, Resource: {resource}, Action: {action}, Records: {record_count}")

def log_suspicious_activity(username: str, activity: str, details: str = "", ip_address: str = "unknown"):
    """Log suspicious security-related activities"""
    security_logger = logging.getLogger('security')
    security_logger.error(f"Suspicious ACTIVITY - User: {username}, Activity: {activity}, Details: {details}, IP: {ip_address}")

# API-specific logging functions
def log_api_request(method: str, endpoint: str, username: str = "anonymous", response_code: int = 0, duration_ms: int = 0):
    """Log API requests in structured format"""
    api_logger = logging.getLogger('app.api')
    api_logger.info(f"API Request - {method} {endpoint} - User: {username} - Status: {response_code} - Duration: {duration_ms}ms")

def log_api_error(method: str, endpoint: str, error: str, username: str = "anonymous"):
    """Log API errors"""
    api_logger = logging.getLogger('app.api')
    api_logger.error(f"API Error - {method} {endpoint} - User: {username} - Error: {error}")

# Database logging functions
def log_database_operation(operation: str, table: str, username: str = "system", affected_rows: int = 0):
    """Log database operations"""
    db_logger = logging.getLogger('app.database')
    db_logger.info(f"Database {operation} - Table: {table} - User: {username} - Rows: {affected_rows}")

def log_database_error(operation: str, table: str, error: str, username: str = "system"):
    """Log database errors"""
    db_logger = logging.getLogger('app.database')
    db_logger.error(f"Database ERROR - Operation: {operation} - Table: {table} - User: {username} - Error: {error}")

# Application lifecycle logging
def log_startup_event(event: str, details: str = ""):
    """Log application startup events"""
    app_logger = logging.getLogger('app')
    app_logger.info(f"Startup Event: {event} - {details}")

def log_shutdown_event(event: str, details: str = ""):
    """Log application shutdown events"""
    app_logger = logging.getLogger('app')
    app_logger.info(f"Shutdown Event: {event} - {details}")