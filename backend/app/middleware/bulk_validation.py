"""
Validation Middleware for Bulk Operations
Provides request validation, rate limiting, and error handling
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import time
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta

from ..logging_config import get_logger

logger = get_logger(__name__)

class BulkOperationValidator:
    """Validator for bulk operation requests"""
    
    def __init__(self):
        # Rate limiting configuration
        self.rate_limits = {
            'delete': {'requests': 10, 'window': 60},  # 10 deletes per minute
            'export': {'requests': 30, 'window': 60},  # 30 exports per minute
            'close': {'requests': 20, 'window': 60},   # 20 closes per minute
            'archive': {'requests': 15, 'window': 60}  # 15 archives per minute
        }
        
        # Track request counts per user
        self.request_counts = defaultdict(lambda: defaultdict(list))
        
        # Validation rules
        self.max_session_ids = 1000
        self.min_session_ids = 1
        
    def validate_session_ids(self, session_ids: list) -> Dict[str, Any]:
        """Validate session IDs list"""
        errors = []
        
        # Check count
        if len(session_ids) < self.min_session_ids:
            errors.append(f"At least {self.min_session_ids} session ID required")
        
        if len(session_ids) > self.max_session_ids:
            errors.append(f"Maximum {self.max_session_ids} session IDs allowed")
        
        # Check for duplicates
        if len(session_ids) != len(set(session_ids)):
            errors.append("Duplicate session IDs not allowed")
        
        # Check format
        invalid_ids = []
        for sid in session_ids:
            if not self._is_valid_session_id(sid):
                invalid_ids.append(sid)
        
        if invalid_ids:
            errors.append(f"Invalid session ID format: {', '.join(invalid_ids[:5])}")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'unique_count': len(set(session_ids)),
            'total_count': len(session_ids)
        }
    
    def _is_valid_session_id(self, session_id: str) -> bool:
        """Check if session ID has valid format"""
        if not session_id:
            return False
        
        # Session ID should be a string with reasonable length
        if len(session_id) < 3 or len(session_id) > 100:
            return False
        
        # Add more specific validation if needed
        return True
    
    def check_rate_limit(self, user_id: str, action: str) -> Dict[str, Any]:
        """Check if user has exceeded rate limit for action"""
        if action not in self.rate_limits:
            return {'allowed': True}
        
        limit_config = self.rate_limits[action]
        now = time.time()
        window_start = now - limit_config['window']
        
        # Clean old requests
        user_requests = self.request_counts[user_id][action]
        user_requests[:] = [req_time for req_time in user_requests if req_time > window_start]
        
        # Check limit
        if len(user_requests) >= limit_config['requests']:
            reset_time = min(user_requests) + limit_config['window']
            return {
                'allowed': False,
                'limit': limit_config['requests'],
                'window': limit_config['window'],
                'reset_in': int(reset_time - now),
                'message': f"Rate limit exceeded for {action}. Try again in {int(reset_time - now)} seconds."
            }
        
        # Record this request
        user_requests.append(now)
        
        return {
            'allowed': True,
            'remaining': limit_config['requests'] - len(user_requests),
            'reset_in': limit_config['window']
        }
    
    def validate_bulk_request(self, request_data: Dict[str, Any], action: str) -> Dict[str, Any]:
        """Comprehensive validation for bulk requests"""
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Validate session IDs
        if 'session_ids' in request_data:
            id_validation = self.validate_session_ids(request_data['session_ids'])
            if not id_validation['valid']:
                validation_result['valid'] = False
                validation_result['errors'].extend(id_validation['errors'])
        else:
            validation_result['valid'] = False
            validation_result['errors'].append("session_ids field is required")
        
        # Action-specific validation
        if action == 'delete':
            self._validate_delete_request(request_data, validation_result)
        elif action == 'export':
            self._validate_export_request(request_data, validation_result)
        elif action == 'close':
            self._validate_close_request(request_data, validation_result)
        elif action == 'archive':
            self._validate_archive_request(request_data, validation_result)
        
        return validation_result
    
    def _validate_delete_request(self, request_data: Dict, result: Dict):
        """Validate delete-specific parameters"""
        if 'soft_delete' in request_data:
            if not isinstance(request_data['soft_delete'], bool):
                result['errors'].append("soft_delete must be a boolean")
        
        if 'cascade_exports' in request_data:
            if not isinstance(request_data['cascade_exports'], bool):
                result['errors'].append("cascade_exports must be a boolean")
            
            if request_data.get('cascade_exports') and not request_data.get('soft_delete', True):
                result['warnings'].append("cascade_exports has no effect with hard delete")
    
    def _validate_export_request(self, request_data: Dict, result: Dict):
        """Validate export-specific parameters"""
        valid_formats = ['csv', 'json', 'excel']
        
        if 'format' in request_data:
            if request_data['format'] not in valid_formats:
                result['errors'].append(f"Invalid format. Must be one of: {', '.join(valid_formats)}")
        
        if 'include_details' in request_data:
            if not isinstance(request_data['include_details'], bool):
                result['errors'].append("include_details must be a boolean")
    
    def _validate_close_request(self, request_data: Dict, result: Dict):
        """Validate close-specific parameters"""
        # Close requests are simple, just validate options if present
        if 'options' in request_data and not isinstance(request_data['options'], dict):
            result['errors'].append("options must be a dictionary")
    
    def _validate_archive_request(self, request_data: Dict, result: Dict):
        """Validate archive-specific parameters"""
        if 'options' in request_data:
            options = request_data['options']
            if 'compress' in options and not isinstance(options['compress'], bool):
                result['errors'].append("compress option must be a boolean")

# Middleware function
async def bulk_operation_validation_middleware(request: Request, call_next):
    """Middleware to validate bulk operation requests"""
    
    # Only apply to bulk operation endpoints
    if not request.url.path.startswith("/api/bulk"):
        return await call_next(request)
    
    # Skip GET requests
    if request.method == "GET":
        return await call_next(request)
    
    try:
        # Get request body
        body = await request.body()
        request._body = body  # Store for later use
        
        # Parse JSON
        import json
        try:
            request_data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "Invalid JSON in request body"}
            )
        
        # Extract action from path
        path_parts = request.url.path.split('/')
        if len(path_parts) >= 4:
            action = path_parts[3]  # /api/bulk/sessions/{action}
        else:
            return await call_next(request)
        
        # Create validator
        validator = BulkOperationValidator()
        
        # Check rate limit (assuming user_id from headers or auth)
        user_id = request.headers.get("X-User-ID", "anonymous")
        rate_check = validator.check_rate_limit(user_id, action)
        
        if not rate_check['allowed']:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": rate_check['message'],
                    "reset_in": rate_check['reset_in']
                },
                headers={
                    "X-RateLimit-Limit": str(rate_check.get('limit', 0)),
                    "X-RateLimit-Reset": str(rate_check.get('reset_in', 0))
                }
            )
        
        # Validate request
        validation = validator.validate_bulk_request(request_data, action)
        
        if not validation['valid']:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "detail": "Validation failed",
                    "errors": validation['errors'],
                    "warnings": validation.get('warnings', [])
                }
            )
        
        # Add validation info to request state
        request.state.validation = validation
        request.state.rate_limit = rate_check
        
        # Continue processing
        response = await call_next(request)
        
        # Add rate limit headers to response
        if 'remaining' in rate_check:
            response.headers["X-RateLimit-Remaining"] = str(rate_check['remaining'])
            response.headers["X-RateLimit-Reset"] = str(rate_check['reset_in'])
        
        return response
        
    except Exception as e:
        logger.error(f"Validation middleware error: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal validation error"}
        )

# Error handler for bulk operations
def handle_bulk_operation_error(error: Exception, action: str, session_ids: list) -> Dict[str, Any]:
    """Handle errors in bulk operations gracefully"""
    
    logger.error(f"Bulk {action} error for {len(session_ids)} sessions: {str(error)}")
    
    error_response = {
        "success": False,
        "operation_id": None,
        "action": action,
        "total_requested": len(session_ids),
        "processed_count": 0,
        "failed_count": len(session_ids),
        "message": "Operation failed",
        "error": str(error)
    }
    
    # Customize error message based on error type
    if "timeout" in str(error).lower():
        error_response["message"] = "Operation timed out. Please try with fewer sessions."
    elif "permission" in str(error).lower():
        error_response["message"] = "Permission denied for this operation."
    elif "database" in str(error).lower():
        error_response["message"] = "Database error occurred. Please try again."
    else:
        error_response["message"] = f"Failed to {action} sessions: {str(error)}"
    
    return error_response

# Request size limiter
class RequestSizeLimiter:
    """Limit request body size for bulk operations"""
    
    def __init__(self, max_size_mb: int = 10):
        self.max_size = max_size_mb * 1024 * 1024  # Convert to bytes
    
    async def __call__(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            
            if content_length and int(content_length) > self.max_size:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "detail": f"Request body too large. Maximum size is {self.max_size // 1024 // 1024}MB"
                    }
                )
        
        return await call_next(request)