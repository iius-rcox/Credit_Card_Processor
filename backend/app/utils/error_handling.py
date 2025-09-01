"""
Standardized Error Handling Utilities
Provides consistent error handling patterns and standardized error responses
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from datetime import datetime, timezone


class StandardError:
    """Standard error codes and messages for consistent error handling"""
    
    # Authentication and Authorization Errors
    AUTH_REQUIRED = ("AUTHENTICATION_REQUIRED", "Authentication is required to access this resource")
    AUTH_INVALID = ("AUTHENTICATION_INVALID", "Invalid authentication credentials")
    ACCESS_DENIED = ("ACCESS_DENIED", "Access denied: insufficient permissions")
    ADMIN_REQUIRED = ("ADMIN_REQUIRED", "Administrator privileges required")
    
    # Session Management Errors
    SESSION_NOT_FOUND = ("SESSION_NOT_FOUND", "Session not found")
    SESSION_INVALID = ("SESSION_INVALID", "Invalid session ID format")
    SESSION_ACCESS_DENIED = ("SESSION_ACCESS_DENIED", "Access denied to this session")
    SESSION_NOT_READY = ("SESSION_NOT_READY", "Session is not ready for this operation")
    
    # File Upload Errors
    FILE_INVALID_TYPE = ("FILE_INVALID_TYPE", "Invalid file type")
    FILE_TOO_LARGE = ("FILE_TOO_LARGE", "File size exceeds maximum limit")
    FILE_CORRUPTED = ("FILE_CORRUPTED", "File appears to be corrupted")
    FILES_MISSING = ("FILES_MISSING", "Required files are missing")
    
    # Processing Errors
    PROCESSING_ALREADY_STARTED = ("PROCESSING_ALREADY_STARTED", "Processing has already started")
    PROCESSING_NOT_STARTED = ("PROCESSING_NOT_STARTED", "Processing has not been started")
    PROCESSING_CANNOT_CONTROL = ("PROCESSING_CANNOT_CONTROL", "Cannot control processing in current state")
    
    # Database Errors
    DATABASE_ERROR = ("DATABASE_ERROR", "Database operation failed")
    CONSTRAINT_VIOLATION = ("CONSTRAINT_VIOLATION", "Database constraint violation")
    
    # Validation Errors
    VALIDATION_ERROR = ("VALIDATION_ERROR", "Request validation failed")
    INVALID_UUID = ("INVALID_UUID_FORMAT", "Invalid UUID format")
    
    # Server Errors
    INTERNAL_ERROR = ("INTERNAL_ERROR", "Internal server error occurred")
    SERVICE_UNAVAILABLE = ("SERVICE_UNAVAILABLE", "Service temporarily unavailable")


def create_error_response(
    status_code: int,
    error_code: str,
    detail: str,
    headers: Optional[Dict[str, str]] = None,
    additional_data: Optional[Dict[str, Any]] = None
) -> HTTPException:
    """
    Create a standardized HTTPException with consistent error format
    
    Args:
        status_code: HTTP status code
        error_code: Internal error code for client handling
        detail: Human-readable error message
        headers: Additional HTTP headers
        additional_data: Additional error context data
    
    Returns:
        HTTPException: Standardized error response
    """
    error_headers = headers or {}
    error_headers["X-Error-Code"] = error_code
    error_headers["X-Error-Timestamp"] = datetime.now(timezone.utc).isoformat()
    
    error_content = {
        "detail": detail,
        "error_code": error_code,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if additional_data:
        error_content.update(additional_data)
    
    return HTTPException(
        status_code=status_code,
        detail=error_content,
        headers=error_headers
    )


def authentication_error(detail: Optional[str] = None) -> HTTPException:
    """Create a standardized authentication error"""
    error_code, default_message = StandardError.AUTH_REQUIRED
    return create_error_response(
        status_code=status.HTTP_401_UNAUTHORIZED,
        error_code=error_code,
        detail=detail or default_message
    )


def authorization_error(detail: Optional[str] = None) -> HTTPException:
    """Create a standardized authorization error"""
    error_code, default_message = StandardError.ACCESS_DENIED
    return create_error_response(
        status_code=status.HTTP_403_FORBIDDEN,
        error_code=error_code,
        detail=detail or default_message
    )


def session_not_found_error(session_id: str) -> HTTPException:
    """Create a standardized session not found error"""
    error_code, default_message = StandardError.SESSION_NOT_FOUND
    return create_error_response(
        status_code=status.HTTP_404_NOT_FOUND,
        error_code=error_code,
        detail=default_message,
        additional_data={"session_id": session_id}
    )


def invalid_uuid_error(uuid_value: str) -> HTTPException:
    """Create a standardized invalid UUID error"""
    error_code, default_message = StandardError.INVALID_UUID
    return create_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        error_code=error_code,
        detail=default_message,
        additional_data={"provided_value": uuid_value}
    )


def database_error(detail: Optional[str] = None) -> HTTPException:
    """Create a standardized database error"""
    error_code, default_message = StandardError.DATABASE_ERROR
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code=error_code,
        detail=detail or default_message
    )


def validation_error(detail: str, field: Optional[str] = None) -> HTTPException:
    """Create a standardized validation error"""
    error_code, _ = StandardError.VALIDATION_ERROR
    additional_data = {"field": field} if field else {}
    
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code=error_code,
        detail=detail,
        additional_data=additional_data
    )