"""
Correlation ID middleware for request tracking
Extracts correlation IDs from incoming requests and adds them to logs
"""

import uuid
import logging
from typing import Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import contextvars

# Create a context variable to store the correlation ID
correlation_id_context = contextvars.ContextVar('correlation_id', default=None)

logger = logging.getLogger(__name__)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle correlation IDs for request tracking
    """
    
    async def dispatch(self, request: Request, call_next):
        # Extract correlation ID from headers (try multiple header names)
        correlation_id = (
            request.headers.get('x-correlation-id') or
            request.headers.get('x-request-id') or
            request.headers.get('correlation-id') or
            str(uuid.uuid4())  # Generate if not provided
        )
        
        # Store in context for use in logging
        correlation_id_context.set(correlation_id)
        
        # Log the incoming request with correlation ID
        logger.info(
            f"Incoming request - Correlation ID: {correlation_id}, "
            f"Method: {request.method}, Path: {request.url.path}, "
            f"Client: {request.client.host if request.client else 'unknown'}"
        )
        
        # Process the request
        try:
            response = await call_next(request)
            
            # Add correlation ID to response headers
            response.headers['x-correlation-id'] = correlation_id
            
            # Log successful response
            logger.info(
                f"Request completed - Correlation ID: {correlation_id}, "
                f"Status: {response.status_code}"
            )
            
            return response
            
        except Exception as e:
            # Log error with correlation ID
            logger.error(
                f"Request failed - Correlation ID: {correlation_id}, "
                f"Error: {str(e)}",
                exc_info=True
            )
            raise


def get_correlation_id() -> Optional[str]:
    """
    Get the current correlation ID from context
    """
    return correlation_id_context.get()


class CorrelationLogFilter(logging.Filter):
    """
    Logging filter to add correlation ID to all log records
    """
    
    def filter(self, record):
        # Add correlation ID to log record
        record.correlation_id = get_correlation_id() or 'no-correlation-id'
        return True


def setup_correlation_logging():
    """
    Configure logging to include correlation IDs
    """
    # Add correlation filter to all handlers
    root_logger = logging.getLogger()
    correlation_filter = CorrelationLogFilter()
    
    for handler in root_logger.handlers:
        handler.addFilter(correlation_filter)
    
    # Update formatter to include correlation ID
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] - %(message)s'
    )
    
    for handler in root_logger.handlers:
        handler.setFormatter(formatter)