"""
Windows Authentication Module for Credit Card Processor
Implements secure Windows-based authentication with role-based access control

Security Features:
- Header injection prevention
- Input sanitization and validation
- Secure error handling
- Audit logging
- Development environment fallback
"""

import logging
import re
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import HTTPException, Request, Depends, status, WebSocket
from pydantic import BaseModel

from .config import settings
from .logging_config import log_authentication_attempt, log_authorization_failure, log_suspicious_activity

# Configure authentication logger
auth_logger = logging.getLogger("auth")
auth_logger.setLevel(logging.INFO)
if not auth_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    auth_logger.addHandler(handler)

# Security configurations
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9._-]{1,50}$')  # Restrict username format
DOMAIN_PATTERN = re.compile(r'^[a-zA-Z0-9.-]{1,100}\\[a-zA-Z0-9._-]{1,50}$')  # Domain\username format

class UserInfo(BaseModel):
    """User information model with security validation"""
    username: str
    is_admin: bool
    is_authenticated: bool
    auth_method: str
    timestamp: datetime

class AuthenticationError(HTTPException):
    """Custom authentication error with secure error messages"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Windows"}
        )

class AuthorizationError(HTTPException):
    """Custom authorization error for access control"""
    def __init__(self, detail: str = "Insufficient privileges"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )

def sanitize_username(username: str) -> Optional[str]:
    """
    Sanitize and validate username to prevent injection attacks
    
    Args:
        username: Raw username string
        
    Returns:
        Sanitized username or None if invalid
        
    Security:
        - Removes dangerous characters
        - Validates against pattern
        - Limits length to prevent DoS
        - Prevents header injection attacks
        - Detects suspicious patterns
    """
    if not username or not isinstance(username, str):
        return None
    
    # Prevent excessively long usernames (DoS protection)
    if len(username) > 200:
        auth_logger.warning(f"Username too long: {len(username)} characters")
        log_suspicious_activity(
            description="Unusually long username attempted",
            details={"username_length": len(username), "truncated": username[:50]}
        )
        return None
    
    # Detect potential injection patterns before processing
    suspicious_patterns = [
        r'[<>"\'\n\r\t]',  # HTML/script injection
        r'[\x00-\x1f\x7f-\x9f]',  # Control characters
        r'(script|javascript|vbscript|onload|onerror)',  # Script injection keywords
        r'(\|\||&&|;|`|\$\()',  # Command injection
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, username, re.IGNORECASE):
            auth_logger.warning(f"Suspicious pattern detected in username: {pattern}")
            log_suspicious_activity(
                description="Potential injection attempt in username",
                details={"pattern": pattern, "username_sample": username[:30]}
            )
            return None
    
    # Strip whitespace and convert to lowercase for consistency
    username = username.strip().lower()
    
    # Handle domain\username format
    if '\\' in username:
        if not DOMAIN_PATTERN.match(username):
            auth_logger.warning(f"Invalid domain username format: {username[:20]}...")
            return None
        # Extract just the username part after domain
        username = username.split('\\', 1)[1]
    
    # Validate username format with stricter pattern
    if not USERNAME_PATTERN.match(username):
        auth_logger.warning(f"Invalid username format: {username[:20]}...")
        return None
    
    # Additional length check after processing
    if len(username) > 50:
        auth_logger.warning(f"Processed username still too long: {len(username)}")
        return None
    
    return username

def extract_windows_username(request: Request) -> Optional[str]:
    """
    Securely extract Windows username from HTTP headers
    
    Args:
        request: FastAPI request object
        
    Returns:
        Sanitized username or None
        
    Security:
        - Checks multiple header locations
        - Sanitizes input to prevent injection
        - Logs authentication attempts
        - Rate limiting consideration
    """
    # Priority order for Windows authentication headers
    auth_headers = [
        'remote_user',          # Standard Windows auth header
        'http_remote_user',     # HTTP version
        'x-forwarded-user',     # Proxy forwarded user
        'auth_user',           # Alternative header name
        'http_x_forwarded_user' # HTTP proxy version
    ]
    
    username = None
    header_used = None
    
    # Check each header in priority order with additional security validation
    for header in auth_headers:
        header_value = request.headers.get(header)
        if header_value:
            # Additional header security validation
            if len(header_value) > 500:  # Prevent excessively long headers
                auth_logger.warning(f"Excessively long auth header: {header}")
                log_suspicious_activity(
                    description="Unusually long authentication header",
                    details={"header": header, "length": len(header_value)}
                )
                continue
                
            # Check for suspicious header manipulation patterns
            if '\n' in header_value or '\r' in header_value:
                auth_logger.warning(f"Header injection attempt detected in {header}")
                log_suspicious_activity(
                    description="Header injection attempt detected",
                    details={"header": header, "sample": header_value[:50]}
                )
                continue
                
            username = sanitize_username(header_value)
            if username:
                header_used = header
                break
    
    # Log authentication attempt using security logging
    client_ip = request.client.host if request.client else "unknown"
    if username:
        log_authentication_attempt(
            username=username,
            success=True,
            ip_address=client_ip,
            method=f"windows_header:{header_used}"
        )
    else:
        log_authentication_attempt(
            username="unknown",
            success=False,
            ip_address=client_ip,
            method="windows_headers"
        )
    
    return username

def get_development_user(request: Request) -> Optional[str]:
    """
    Development environment fallback authentication
    
    Args:
        request: FastAPI request object
        
    Returns:
        Development username or None
        
    Security:
        - Only works in development mode
        - Logs all development authentication
        - Provides secure fallback for testing
    """
    if not settings.debug:
        return None
    
    # Check for development user header or query parameter
    dev_user = (
        request.headers.get('x-dev-user') or
        request.query_params.get('dev_user')
    )
    
    if dev_user:
        sanitized_user = sanitize_username(dev_user)
        if sanitized_user:
            auth_logger.info(f"Development authentication - User: {sanitized_user}")
            return sanitized_user
    
    # No development authentication provided - require explicit headers
    auth_logger.info("Development mode: no dev headers provided, authentication required")
    return None

async def get_current_user(request: Request) -> UserInfo:
    """
    FastAPI dependency to get current authenticated user
    
    Args:
        request: FastAPI request object
        
    Returns:
        UserInfo object with user details
        
    Raises:
        AuthenticationError: If authentication fails
        
    Security:
        - Validates all input headers
        - Implements secure error handling
        - Provides audit logging
        - Supports development fallback
    """
    try:
        # Try Windows authentication first
        username = extract_windows_username(request)
        auth_method = "windows"
        
        # Fall back to development authentication if needed
        if not username and settings.debug:
            username = get_development_user(request)
            auth_method = "development"
        
        if not username:
            auth_logger.error("Authentication failed - no valid username found")
            raise AuthenticationError("Authentication required")
        
        # Check if user is admin using secure method (case-insensitive for better security)
        is_admin = settings.is_admin_user(username)
        
        user_info = UserInfo(
            username=username,
            is_admin=is_admin,
            is_authenticated=True,
            auth_method=auth_method,
            timestamp=datetime.now(timezone.utc)
        )
        
        # Log successful authentication
        auth_logger.info(
            f"User authenticated - Username: {username}, "
            f"Admin: {is_admin}, Method: {auth_method}"
        )
        
        return user_info
        
    except AuthenticationError:
        raise
    except Exception as e:
        auth_logger.error(f"Authentication error: {str(e)}")
        raise AuthenticationError("Authentication system error")

async def require_admin(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    """
    FastAPI dependency to require admin privileges
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        UserInfo object for admin user
        
    Raises:
        AuthorizationError: If user is not admin
        
    Security:
        - Enforces role-based access control
        - Logs authorization attempts
        - Prevents privilege escalation
    """
    if not current_user.is_admin:
        auth_logger.warning(
            f"Authorization failed - User: {current_user.username} "
            f"attempted admin access"
        )
        raise AuthorizationError("Administrative privileges required")
    
    auth_logger.info(f"Admin access granted - User: {current_user.username}")
    return current_user

async def optional_auth(request: Request) -> Optional[UserInfo]:
    """
    Optional authentication for endpoints that can work with or without auth
    
    Args:
        request: FastAPI request object
        
    Returns:
        UserInfo object or None if not authenticated
        
    Security:
        - Provides graceful degradation
        - Doesn't raise exceptions for missing auth
        - Still logs authentication attempts
    """
    try:
        return await get_current_user(request)
    except AuthenticationError:
        auth_logger.info("Optional authentication - no valid credentials found")
        return None

def validate_auth_headers(request: Request) -> Dict[str, Any]:
    """
    Validate authentication headers for security assessment
    
    Args:
        request: FastAPI request object
        
    Returns:
        Dictionary with validation results
        
    Security:
        - Checks for header injection attempts
        - Validates header formats
        - Provides security assessment data
    """
    validation_results = {
        "valid_headers": [],
        "invalid_headers": [],
        "security_warnings": [],
        "timestamp": datetime.now(timezone.utc)
    }
    
    auth_headers = [
        'remote_user', 'http_remote_user', 'x-forwarded-user',
        'auth_user', 'http_x_forwarded_user'
    ]
    
    for header in auth_headers:
        header_value = request.headers.get(header)
        if header_value:
            # Check for potential injection attempts
            if any(char in header_value for char in ['<', '>', '&', '"', "'"]):
                validation_results["security_warnings"].append(
                    f"Potential injection in header {header}"
                )
                validation_results["invalid_headers"].append(header)
                continue
            
            # Validate format
            if sanitize_username(header_value):
                validation_results["valid_headers"].append(header)
            else:
                validation_results["invalid_headers"].append(header)
    
    return validation_results

# Security headers for enhanced protection
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
}


async def get_current_user_ws(websocket: WebSocket) -> UserInfo:
    """
    WebSocket authentication dependency
    
    Extracts and validates user from WebSocket headers for authentication.
    Similar to get_current_user but adapted for WebSocket connections.
    
    Args:
        websocket: WebSocket connection with headers
        
    Returns:
        UserInfo: Authenticated user information
        
    Raises:
        WebSocketException: If authentication fails
        
    Security:
        - Uses same authentication logic as HTTP requests
        - Validates Windows authentication headers
        - Supports development fallback
    """
    try:
        # Extract headers from WebSocket
        headers = dict(websocket.headers)
        
        # Try to extract username from various header sources
        username = None
        auth_method = "unknown"
        
        # Check Windows authentication headers (same order as HTTP auth)
        auth_headers = [
            ('remote-user', 'windows'),
            ('http-remote-user', 'windows'),
            ('x-forwarded-user', 'proxy'),
            ('auth-user', 'basic'),
        ]
        
        for header_name, method in auth_headers:
            header_value = headers.get(header_name)
            if header_value:
                username = header_value
                auth_method = method
                break
        
        # Development fallback (same as HTTP auth)
        if not username and settings.debug:
            username = headers.get('x-dev-user', 'dev_user')
            auth_method = 'development'
        
        if not username:
            # Close WebSocket with authentication error
            await websocket.close(code=4001, reason="Authentication required")
            raise AuthenticationError("No authentication credentials provided")
        
        # Sanitize username
        clean_username = sanitize_username(username)
        if not clean_username:
            await websocket.close(code=4001, reason="Invalid username format")
            raise AuthenticationError("Invalid username format")
        
        # Check if user is admin (same logic as HTTP auth)
        is_admin = clean_username.lower() in settings.admin_users
        
        # Log authentication attempt
        log_authentication_attempt(clean_username, "websocket", True, auth_method)
        
        return UserInfo(
            username=clean_username,
            is_admin=is_admin,
            is_authenticated=True,
            auth_method=auth_method,
            timestamp=datetime.now(timezone.utc)
        )
        
    except AuthenticationError:
        raise
    except Exception as e:
        auth_logger.error(f"WebSocket authentication error: {str(e)}")
        await websocket.close(code=4000, reason="Authentication failed")
        raise AuthenticationError("Authentication failed")