"""
Error handling utilities for Credit Card Processor
Provides standardized error handling and response creation
"""

import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class StandardError(BaseModel):
    """Standard error response model"""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


def create_error_response(
    error: str,
    message: str,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    details: Optional[Dict[str, Any]] = None
) -> HTTPException:
    """Create a standardized error response"""
    error_data = {
        "error": error,
        "message": message,
        "details": details
    }
    
    logger.error(f"API Error: {error} - {message}", extra={"details": details})
    
    return HTTPException(
        status_code=status_code,
        detail=error_data
    )


def authentication_error(message: str = "Authentication required") -> HTTPException:
    """Create authentication error response"""
    return create_error_response(
        error="AUTHENTICATION_ERROR",
        message=message,
        status_code=status.HTTP_401_UNAUTHORIZED
    )


def authorization_error(message: str = "Access denied") -> HTTPException:
    """Create authorization error response"""
    return create_error_response(
        error="AUTHORIZATION_ERROR", 
        message=message,
        status_code=status.HTTP_403_FORBIDDEN
    )


def session_not_found_error(session_id: str) -> HTTPException:
    """Create session not found error response"""
    return create_error_response(
        error="SESSION_NOT_FOUND",
        message=f"Session {session_id} not found",
        status_code=status.HTTP_404_NOT_FOUND,
        details={"session_id": session_id}
    )


def invalid_uuid_error(uuid_string: str) -> HTTPException:
    """Create invalid UUID error response"""
    return create_error_response(
        error="INVALID_UUID",
        message=f"Invalid UUID format: {uuid_string}",
        status_code=status.HTTP_400_BAD_REQUEST,
        details={"invalid_uuid": uuid_string}
    )


def database_error(operation: str, original_error: str) -> HTTPException:
    """Create database error response"""
    return create_error_response(
        error="DATABASE_ERROR",
        message=f"Database operation failed: {operation}",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        details={"operation": operation, "original_error": original_error}
    )


def validation_error(field: str, message: str, value: Any = None) -> HTTPException:
    """Create validation error response"""
    details = {"field": field, "value": value}
    return create_error_response(
        error="VALIDATION_ERROR",
        message=f"Validation failed for {field}: {message}",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=details
    )

