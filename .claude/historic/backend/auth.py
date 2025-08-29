"""
Windows Authentication and Authorization for Credit Card Processor
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import re

from fastapi import HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from config import get_settings

logger = logging.getLogger(__name__)

class UserInfo(BaseModel):
    """User information model"""
    username: str
    is_admin: bool
    authenticated_at: datetime
    source: str  # "header" or "token"
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AuthenticationError(Exception):
    """Custom authentication error"""
    pass

class AuthorizationError(Exception):
    """Custom authorization error"""
    pass

class WindowsAuthManager:
    """Manager for Windows-based authentication"""
    
    def __init__(self):
        self.settings = get_settings()
        self._cache = {}  # Simple in-memory cache for user lookups
        self._cache_ttl = timedelta(minutes=15)
    
    def extract_username_from_header(self, request: Request) -> Optional[str]:
        """Extract Windows username from HTTP headers"""
        try:
            # Try multiple header variations commonly used by IIS/Windows auth
            possible_headers = [
                "REMOTE_USER",
                "HTTP_REMOTE_USER", 
                "X-Remote-User",
                "X-Authenticated-User",
                "Authorization-User",
                "LOGON_USER"
            ]
            
            for header_name in possible_headers:
                username = request.headers.get(header_name)
                if username:
                    # Clean up the username (remove domain if present)
                    username = self._clean_username(username)
                    if self._validate_username(username):
                        logger.debug(f"Found username '{username}' in header '{header_name}'")
                        return username
            
            # For development/testing, check query parameters
            if self.settings.DEBUG:
                test_user = request.query_params.get("test_user")
                if test_user and self._validate_username(test_user):
                    logger.debug(f"Using test user '{test_user}' from query params")
                    return test_user
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting username from headers: {e}")
            return None
    
    def _clean_username(self, raw_username: str) -> str:
        """Clean and normalize username"""
        if not raw_username:
            return ""
        
        # Remove domain prefix (DOMAIN\username -> username)
        if "\\" in raw_username:
            username = raw_username.split("\\")[-1]
        else:
            username = raw_username
        
        # Remove @domain suffix (username@domain.com -> username)
        if "@" in username:
            username = username.split("@")[0]
        
        # Clean whitespace and convert to lowercase
        username = username.strip().lower()
        
        return username
    
    def _validate_username(self, username: str) -> bool:
        """Validate username format"""
        if not username:
            return False
        
        # Basic validation: alphanumeric plus common characters
        if not re.match(r'^[a-zA-Z0-9._-]+$', username):
            return False
        
        # Length check
        if len(username) < 2 or len(username) > 50:
            return False
        
        return True
    
    def is_admin_user(self, username: str) -> bool:
        """Check if user is an admin"""
        if not username:
            return False
        
        # Check cache first
        cache_key = f"admin_{username}"
        cached_result = self._get_from_cache(cache_key)
        if cached_result is not None:
            return cached_result
        
        # Check against admin list
        is_admin = self.settings.is_admin(username)
        
        # Cache the result
        self._set_cache(cache_key, is_admin)
        
        return is_admin
    
    def get_user_info(self, username: str, source: str = "header") -> UserInfo:
        """Get complete user information"""
        if not username:
            raise AuthenticationError("Username is required")
        
        is_admin = self.is_admin_user(username)
        
        return UserInfo(
            username=username,
            is_admin=is_admin,
            authenticated_at=datetime.utcnow(),
            source=source
        )
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if datetime.utcnow() - timestamp < self._cache_ttl:
                return value
            else:
                # Remove expired entry
                del self._cache[key]
        return None
    
    def _set_cache(self, key: str, value: Any):
        """Set value in cache with timestamp"""
        self._cache[key] = (value, datetime.utcnow())
        
        # Simple cleanup: remove old entries if cache gets too large
        if len(self._cache) > 1000:
            cutoff = datetime.utcnow() - self._cache_ttl
            expired_keys = [
                k for k, (_, timestamp) in self._cache.items()
                if timestamp < cutoff
            ]
            for key in expired_keys:
                del self._cache[key]

# Global auth manager instance
auth_manager = WindowsAuthManager()

# FastAPI dependency functions

async def get_current_user(request: Request) -> UserInfo:
    """FastAPI dependency to get current authenticated user"""
    if not get_settings().REQUIRE_AUTH:
        # For testing/development, create a default user
        return UserInfo(
            username="testuser",
            is_admin=True,
            authenticated_at=datetime.utcnow(),
            source="bypass"
        )
    
    username = auth_manager.extract_username_from_header(request)
    
    if not username:
        logger.warning("No valid username found in request headers")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required - no valid username found",
            headers={"WWW-Authenticate": "Negotiate"}
        )
    
    try:
        user_info = auth_manager.get_user_info(username)
        logger.debug(f"Authenticated user: {username} (admin: {user_info.is_admin})")
        return user_info
    
    except AuthenticationError as e:
        logger.error(f"Authentication failed for user {username}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Negotiate"}
        )

async def get_admin_user(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    """FastAPI dependency to ensure user is admin"""
    if not current_user.is_admin:
        logger.warning(f"Non-admin user {current_user.username} attempted admin operation")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required"
        )
    
    return current_user

async def get_user_or_admin(
    request: Request,
    target_username: Optional[str] = None
) -> UserInfo:
    """Allow access if user is admin OR accessing their own data"""
    current_user = await get_current_user(request)
    
    # Admins can access anything
    if current_user.is_admin:
        return current_user
    
    # Users can only access their own data
    if target_username and target_username.lower() != current_user.username.lower():
        logger.warning(
            f"User {current_user.username} attempted to access data for {target_username}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied - can only access your own data"
        )
    
    return current_user

# Utility functions

def create_auth_response(user_info: UserInfo) -> Dict[str, Any]:
    """Create standardized auth response"""
    return {
        "username": user_info.username,
        "is_admin": user_info.is_admin,
        "authenticated_at": user_info.authenticated_at.isoformat(),
        "source": user_info.source
    }

def log_auth_event(
    username: str,
    event: str,
    success: bool,
    details: Optional[Dict] = None
):
    """Log authentication/authorization events for auditing"""
    log_level = logging.INFO if success else logging.WARNING
    message = f"Auth event: {event} for user {username} - {'SUCCESS' if success else 'FAILED'}"
    
    logger.log(log_level, message, extra=details or {})

# Security middleware

class SecurityHeaders:
    """Security headers middleware"""
    
    @staticmethod
    def add_security_headers(response):
        """Add security headers to response"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

# Rate limiting (simple implementation)

class RateLimiter:
    """Simple rate limiter for authentication attempts"""
    
    def __init__(self, max_attempts: int = 10, window_minutes: int = 15):
        self.max_attempts = max_attempts
        self.window = timedelta(minutes=window_minutes)
        self.attempts = {}  # IP -> [(timestamp, success), ...]
    
    def is_rate_limited(self, client_ip: str) -> bool:
        """Check if client IP is rate limited"""
        now = datetime.utcnow()
        
        if client_ip not in self.attempts:
            return False
        
        # Clean old attempts
        self.attempts[client_ip] = [
            (timestamp, success) for timestamp, success in self.attempts[client_ip]
            if now - timestamp < self.window
        ]
        
        # Count recent failed attempts
        recent_failures = sum(
            1 for timestamp, success in self.attempts[client_ip]
            if not success
        )
        
        return recent_failures >= self.max_attempts
    
    def record_attempt(self, client_ip: str, success: bool):
        """Record an authentication attempt"""
        if client_ip not in self.attempts:
            self.attempts[client_ip] = []
        
        self.attempts[client_ip].append((datetime.utcnow(), success))

# Global rate limiter
rate_limiter = RateLimiter()

# Development/testing helpers

def create_test_user(username: str, is_admin: bool = False) -> UserInfo:
    """Create a test user for development/testing"""
    return UserInfo(
        username=username,
        is_admin=is_admin,
        authenticated_at=datetime.utcnow(),
        source="test"
    )

def simulate_windows_auth_headers(username: str) -> Dict[str, str]:
    """Generate headers that simulate Windows authentication"""
    return {
        "REMOTE_USER": username,
        "X-Remote-User": username
    }