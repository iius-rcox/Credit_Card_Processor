"""
Request correlation and logging middleware for enhanced debugging
"""
import time
import uuid
import json
from typing import Callable
from datetime import datetime, timezone
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from .logging_config import logger, set_correlation_id
from .config import settings
import logging

# Create a dedicated logger for request logging that outputs to console
request_logger = logging.getLogger("request")
request_logger.setLevel(logging.INFO)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
if not request_logger.handlers:
    request_logger.addHandler(console_handler)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request correlation and comprehensive logging"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract correlation ID from headers, or generate if not provided
        correlation_id = (
            request.headers.get('x-correlation-id') or
            request.headers.get('x-request-id') or
            str(uuid.uuid4())[:8]
        )
        request.state.correlation_id = correlation_id
        
        # Set correlation ID in logging context
        set_correlation_id(correlation_id)
        
        # Extract user info securely from headers only (never query parameters)
        user_id = self._extract_user_from_headers(request)
        
        # Record request start time
        start_time = time.time()
        
        # Log request start if enabled
        if settings.enable_request_logging:
            self._log_request_start(request, correlation_id, user_id)
        
        # Process request
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            
            # Log successful request completion
            if settings.enable_request_logging:
                self._log_request_end(request, response, correlation_id, user_id, duration)
                
            # Add correlation ID to response headers (use the same header names as frontend expects)
            response.headers['x-correlation-id'] = correlation_id
            response.headers['x-request-id'] = correlation_id  # Also add alternative header for compatibility
            if hasattr(settings, 'request_id_header'):
                response.headers[settings.request_id_header] = correlation_id
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Log request error
            self._log_request_error(request, e, correlation_id, user_id, duration)
            raise
    
    def _log_request_start(self, request: Request, correlation_id: str, user_id: str):
        """Log request initiation"""
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "INFO",
            "component": "request_middleware",
            "event": "request_start",
            "correlation_id": correlation_id,
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "user": user_id,
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "content_type": request.headers.get("content-type"),
            "content_length": request.headers.get("content-length")
        }
        
        if settings.log_format == "json":
            request_logger.info(json.dumps(log_data))
        else:
            request_logger.info(f"REQUEST START [{correlation_id}] {request.method} {request.url.path} - User: {user_id}")
    
    def _log_request_end(self, request: Request, response: Response, 
                        correlation_id: str, user_id: str, duration: float):
        """Log request completion"""
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "INFO", 
            "component": "request_middleware",
            "event": "request_end",
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "user": user_id,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "response_size": response.headers.get("content-length"),
            "content_type": response.headers.get("content-type")
        }
        
        if settings.log_format == "json":
            request_logger.info(json.dumps(log_data))
        else:
            request_logger.info(f"REQUEST END [{correlation_id}] {request.method} {request.url.path} - "
                       f"Status: {response.status_code} - Duration: {duration:.2f}s")
    
    def _log_request_error(self, request: Request, error: Exception, 
                          correlation_id: str, user_id: str, duration: float):
        """Log request errors with context"""
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "ERROR",
            "component": "request_middleware", 
            "event": "request_error",
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "user": user_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "duration_ms": round(duration * 1000, 2)
        }
        
        if settings.log_format == "json":
            request_logger.error(json.dumps(log_data))
        else:
            request_logger.error(f"REQUEST ERROR [{correlation_id}] {request.method} {request.url.path} - "
                        f"Error: {type(error).__name__}: {str(error)} - Duration: {duration:.2f}s")
    
    def _extract_user_from_headers(self, request: Request) -> str:
        """
        Extract username from headers only - NEVER query parameters for security
        
        This prevents usernames from appearing in:
        - Access logs
        - Browser history  
        - Server logs
        - URL sharing
        """
        try:
            # Windows authentication headers (production environment)
            windows_headers = [
                'remote-user', 'http-remote-user',
                'x-forwarded-user', 'auth-user'
            ]
            
            for header in windows_headers:
                value = request.headers.get(header)
                if value and value.strip():
                    # Handle DOMAIN\username format
                    if '\\' in value:
                        username = value.split('\\')[-1].strip().lower()
                        if username:
                            return username
                    else:
                        username = value.strip().lower()
                        if username:
                            return username
            
            # Development environment fallback (headers only, never query params)
            if settings.debug:
                dev_user = request.headers.get('x-dev-user')
                if dev_user and dev_user.strip():
                    username = dev_user.strip().lower()
                    # Basic sanitization for logging safety
                    if len(username) <= 50 and username.replace('_', '').replace('-', '').replace('.', '').isalnum():
                        return username
            
            return 'anonymous'
            
        except Exception:
            # Fail safely - never expose internal errors in logs
            return 'anonymous'

# Correlation ID helper functions
def get_correlation_id(request: Request) -> str:
    """Get correlation ID from request state"""
    return getattr(request.state, 'correlation_id', 'unknown')