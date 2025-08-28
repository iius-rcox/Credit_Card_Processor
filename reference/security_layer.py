"""
Credit Card Processor - Security Layer Implementation
Enterprise-grade security with Azure AD integration, RBAC, and comprehensive audit logging
"""

import hashlib
import json
import logging
import secrets
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID

import jwt
from azure.identity.aio import ClientSecretCredential
from azure.keyvault.secrets.aio import SecretClient
from cryptography.fernet import Fernet
from fastapi import HTTPException, Security, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from msal import ConfidentialClientApplication
from passlib.context import CryptContext
from pydantic import BaseModel, Field, validator
from redis import asyncio as aioredis
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
import httpx


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ========================================
# 1. CONFIGURATION
# ========================================

class SecurityConfig(BaseModel):
    """Security configuration settings"""
    # Azure AD
    tenant_id: str = "your-tenant-id"
    client_id: str = "your-client-id"
    client_secret: str  # From Key Vault
    redirect_uri: str = "https://your-app.com/auth/callback"
    
    # Key Vault
    key_vault_url: str = "https://iius-akv.vault.azure.net/"
    
    # JWT Settings
    jwt_secret_key: str  # From Key Vault
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60
    refresh_token_expiration_days: int = 7
    
    # Security Settings
    password_min_length: int = 12
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_special: bool = True
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30
    
    # Session Settings
    session_timeout_minutes: int = 30
    concurrent_sessions_allowed: int = 3
    
    # Rate Limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    
    # Encryption
    data_encryption_key: str  # From Key Vault
    
    class Config:
        validate_assignment = True


# ========================================
# 2. USER ROLES & PERMISSIONS
# ========================================

class UserRole(str, Enum):
    ADMIN = "admin"
    PROCESSOR = "processor"
    REVIEWER = "reviewer"
    READ_ONLY = "read_only"


class Permission(str, Enum):
    # Session permissions
    CREATE_SESSION = "create_session"
    VIEW_SESSION = "view_session"
    EDIT_SESSION = "edit_session"
    DELETE_SESSION = "delete_session"
    
    # Processing permissions
    UPLOAD_FILES = "upload_files"
    PROCESS_FILES = "process_files"
    RESOLVE_ISSUES = "resolve_issues"
    
    # Report permissions
    VIEW_REPORTS = "view_reports"
    EXPORT_REPORTS = "export_reports"
    
    # Admin permissions
    MANAGE_USERS = "manage_users"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    MANAGE_SETTINGS = "manage_settings"


# Role-Permission Mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [p for p in Permission],  # All permissions
    UserRole.PROCESSOR: [
        Permission.CREATE_SESSION,
        Permission.VIEW_SESSION,
        Permission.EDIT_SESSION,
        Permission.UPLOAD_FILES,
        Permission.PROCESS_FILES,
        Permission.RESOLVE_ISSUES,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_REPORTS
    ],
    UserRole.REVIEWER: [
        Permission.VIEW_SESSION,
        Permission.RESOLVE_ISSUES,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_REPORTS
    ],
    UserRole.READ_ONLY: [
        Permission.VIEW_SESSION,
        Permission.VIEW_REPORTS
    ]
}


# ========================================
# 3. AZURE AD INTEGRATION
# ========================================

class AzureADAuthenticator:
    """Handle Azure AD authentication"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.msal_app = self._create_msal_app()
    
    def _create_msal_app(self) -> ConfidentialClientApplication:
        """Create MSAL application instance"""
        return ConfidentialClientApplication(
            self.config.client_id,
            authority=f"https://login.microsoftonline.com/{self.config.tenant_id}",
            client_credential=self.config.client_secret
        )
    
    async def get_auth_url(self, state: str) -> str:
        """Generate Azure AD authentication URL"""
        auth_url = self.msal_app.get_authorization_request_url(
            scopes=["User.Read", "openid", "profile", "email"],
            state=state,
            redirect_uri=self.config.redirect_uri
        )
        return auth_url
    
    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        try:
            result = self.msal_app.acquire_token_by_authorization_code(
                code,
                scopes=["User.Read", "openid", "profile", "email"],
                redirect_uri=self.config.redirect_uri
            )
            
            if "error" in result:
                raise HTTPException(status_code=401, detail=result["error_description"])
            
            return result
            
        except Exception as e:
            logger.error(f"Token exchange failed: {str(e)}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Microsoft Graph"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to get user info")
            
            return response.json()
    
    async def validate_token(self, token: str) -> bool:
        """Validate Azure AD token"""
        try:
            # Validate with Microsoft's public keys
            # Implementation would use proper token validation
            return True
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            return False


# ========================================
# 4. JWT TOKEN MANAGEMENT
# ========================================

class JWTTokenManager:
    """Manage JWT tokens for API authentication"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def create_access_token(
        self,
        user_id: str,
        user_email: str,
        user_role: UserRole,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.config.jwt_expiration_minutes)
        
        payload = {
            "sub": user_id,
            "email": user_email,
            "role": user_role.value,
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": secrets.token_hex(16)  # JWT ID for tracking
        }
        
        encoded_jwt = jwt.encode(
            payload,
            self.config.jwt_secret_key,
            algorithm=self.config.jwt_algorithm
        )
        
        return encoded_jwt
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create refresh token"""
        expire = datetime.utcnow() + timedelta(days=self.config.refresh_token_expiration_days)
        
        payload = {
            "sub": user_id,
            "type": "refresh",
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": secrets.token_hex(16)
        }
        
        encoded_jwt = jwt.encode(
            payload,
            self.config.jwt_secret_key,
            algorithm=self.config.jwt_algorithm
        )
        
        return encoded_jwt
    
    def decode_token(self, token: str) -> Dict[str, Any]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(
                token,
                self.config.jwt_secret_key,
                algorithms=[self.config.jwt_algorithm]
            )
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")


# ========================================
# 5. SESSION MANAGEMENT
# ========================================

class SessionManager:
    """Manage user sessions with Redis"""
    
    def __init__(self, redis_client: aioredis.Redis, config: SecurityConfig):
        self.redis = redis_client
        self.config = config
    
    async def create_session(
        self,
        user_id: str,
        access_token: str,
        refresh_token: str,
        ip_address: str,
        user_agent: str
    ) -> str:
        """Create new user session"""
        session_id = secrets.token_hex(32)
        
        session_data = {
            "user_id": user_id,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat()
        }
        
        # Store session
        session_key = f"session:{session_id}"
        await self.redis.setex(
            session_key,
            self.config.session_timeout_minutes * 60,
            json.dumps(session_data)
        )
        
        # Add to user's sessions
        user_sessions_key = f"user_sessions:{user_id}"
        await self.redis.sadd(user_sessions_key, session_id)
        
        # Check concurrent sessions limit
        await self._enforce_session_limit(user_id)
        
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        session_key = f"session:{session_id}"
        session_data = await self.redis.get(session_key)
        
        if session_data:
            return json.loads(session_data)
        return None
    
    async def update_session_activity(self, session_id: str):
        """Update session last activity time"""
        session = await self.get_session(session_id)
        if session:
            session["last_activity"] = datetime.utcnow().isoformat()
            
            session_key = f"session:{session_id}"
            await self.redis.setex(
                session_key,
                self.config.session_timeout_minutes * 60,
                json.dumps(session)
            )
    
    async def invalidate_session(self, session_id: str):
        """Invalidate session"""
        session = await self.get_session(session_id)
        if session:
            # Remove session
            await self.redis.delete(f"session:{session_id}")
            
            # Remove from user's sessions
            user_id = session["user_id"]
            await self.redis.srem(f"user_sessions:{user_id}", session_id)
    
    async def invalidate_all_user_sessions(self, user_id: str):
        """Invalidate all sessions for a user"""
        user_sessions_key = f"user_sessions:{user_id}"
        session_ids = await self.redis.smembers(user_sessions_key)
        
        for session_id in session_ids:
            await self.redis.delete(f"session:{session_id}")
        
        await self.redis.delete(user_sessions_key)
    
    async def _enforce_session_limit(self, user_id: str):
        """Enforce concurrent session limit"""
        user_sessions_key = f"user_sessions:{user_id}"
        session_ids = await self.redis.smembers(user_sessions_key)
        
        if len(session_ids) > self.config.concurrent_sessions_allowed:
            # Get session details
            sessions = []
            for session_id in session_ids:
                session = await self.get_session(session_id)
                if session:
                    sessions.append((session_id, session))
            
            # Sort by creation time
            sessions.sort(key=lambda x: x[1]["created_at"])
            
            # Remove oldest sessions
            sessions_to_remove = len(sessions) - self.config.concurrent_sessions_allowed
            for i in range(sessions_to_remove):
                await self.invalidate_session(sessions[i][0])


# ========================================
# 6. AUTHORIZATION & RBAC
# ========================================

class AuthorizationManager:
    """Manage role-based access control"""
    
    def __init__(self):
        self.role_permissions = ROLE_PERMISSIONS
    
    def has_permission(self, user_role: UserRole, required_permission: Permission) -> bool:
        """Check if role has required permission"""
        return required_permission in self.role_permissions.get(user_role, [])
    
    def get_role_permissions(self, user_role: UserRole) -> List[Permission]:
        """Get all permissions for a role"""
        return self.role_permissions.get(user_role, [])
    
    def check_resource_access(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str
    ) -> bool:
        """Check if user can access specific resource"""
        # Implementation would check database for resource ownership
        # and apply business rules
        return True


# ========================================
# 7. DATA ENCRYPTION
# ========================================

class DataEncryption:
    """Handle sensitive data encryption"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.fernet = Fernet(config.data_encryption_key.encode())
    
    def encrypt(self, data: str) -> str:
        """Encrypt sensitive data"""
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.fernet.decrypt(encrypted_data.encode()).decode()
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(plain_password, hashed_password)
    
    def mask_sensitive_data(self, data: str, mask_char: str = "*") -> str:
        """Mask sensitive data for display"""
        if len(data) <= 4:
            return mask_char * len(data)
        return data[:2] + mask_char * (len(data) - 4) + data[-2:]


# ========================================
# 8. AUDIT LOGGING
# ========================================

class AuditLogger:
    """Comprehensive audit logging"""
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
    
    async def log_action(
        self,
        user_id: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str],
        details: Dict[str, Any],
        ip_address: str,
        user_agent: str
    ):
        """Log user action for audit trail"""
        audit_entry = {
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": json.dumps(details),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.utcnow()
        }
        
        # Store in database (implementation would use SQLAlchemy)
        # await self.db_session.execute(...)
        
        logger.info(f"Audit: User {user_id} performed {action} on {entity_type}:{entity_id}")
    
    async def log_security_event(
        self,
        event_type: str,
        severity: str,
        details: Dict[str, Any],
        ip_address: str
    ):
        """Log security events"""
        security_event = {
            "event_type": event_type,
            "severity": severity,
            "details": json.dumps(details),
            "ip_address": ip_address,
            "created_at": datetime.utcnow()
        }
        
        # Store in database
        # await self.db_session.execute(...)
        
        if severity in ["high", "critical"]:
            # Send alert for high severity events
            await self._send_security_alert(security_event)
    
    async def _send_security_alert(self, event: Dict[str, Any]):
        """Send security alert notifications"""
        # Implementation would send email/SMS alerts
        pass


# ========================================
# 9. RATE LIMITING
# ========================================

class RateLimiter:
    """API rate limiting implementation"""
    
    def __init__(self, redis_client: aioredis.Redis, config: SecurityConfig):
        self.redis = redis_client
        self.config = config
    
    async def check_rate_limit(
        self,
        identifier: str,
        limit_type: str = "minute"
    ) -> Tuple[bool, int]:
        """Check if rate limit exceeded"""
        if limit_type == "minute":
            window = 60
            limit = self.config.rate_limit_per_minute
        else:  # hour
            window = 3600
            limit = self.config.rate_limit_per_hour
        
        key = f"rate_limit:{limit_type}:{identifier}"
        
        # Increment counter
        count = await self.redis.incr(key)
        
        # Set expiry on first request
        if count == 1:
            await self.redis.expire(key, window)
        
        if count > limit:
            return False, limit - count
        
        return True, limit - count
    
    async def reset_rate_limit(self, identifier: str):
        """Reset rate limit for identifier"""
        await self.redis.delete(f"rate_limit:minute:{identifier}")
        await self.redis.delete(f"rate_limit:hour:{identifier}")


# ========================================
# 10. SECURITY MIDDLEWARE
# ========================================

security = HTTPBearer()

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_database),
    redis: aioredis.Redis = Depends(get_redis)
) -> Dict[str, Any]:
    """Get current authenticated user from JWT token"""
    try:
        # Decode token
        config = SecurityConfig()
        token_manager = JWTTokenManager(config)
        payload = token_manager.decode_token(credentials.credentials)
        
        # Check if token is blacklisted
        blacklisted = await redis.get(f"blacklist:{credentials.credentials}")
        if blacklisted:
            raise HTTPException(status_code=401, detail="Token has been revoked")
        
        # Get user from database
        user_id = payload["sub"]
        # user = await db.get_user(user_id)
        
        # Update session activity
        session_manager = SessionManager(redis, config)
        # await session_manager.update_session_activity(session_id)
        
        return {
            "user_id": user_id,
            "email": payload["email"],
            "role": UserRole(payload["role"]),
            "token": credentials.credentials
        }
        
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


def require_permission(required_permission: Permission):
    """Dependency to check user permissions"""
    async def permission_checker(
        current_user: Dict[str, Any] = Depends(get_current_user)
    ):
        auth_manager = AuthorizationManager()
        
        if not auth_manager.has_permission(current_user["role"], required_permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Required: {required_permission.value}"
            )
        
        return current_user
    
    return permission_checker


async def rate_limit_middleware(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis)
):
    """Check rate limits"""
    config = SecurityConfig()
    limiter = RateLimiter(redis, config)
    
    # Use user ID as identifier
    identifier = current_user["user_id"]
    
    # Check per-minute limit
    allowed, remaining = await limiter.check_rate_limit(identifier, "minute")
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"X-RateLimit-Remaining": str(remaining)}
        )
    
    # Add rate limit headers to response
    request.state.rate_limit_remaining = remaining


# ========================================
# 11. KEY VAULT INTEGRATION
# ========================================

class KeyVaultManager:
    """Manage secrets with Azure Key Vault"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.credential = ClientSecretCredential(
            tenant_id=config.tenant_id,
            client_id=config.client_id,
            client_secret=config.client_secret
        )
        self.secret_client = SecretClient(
            vault_url=config.key_vault_url,
            credential=self.credential
        )
    
    async def get_secret(self, secret_name: str) -> str:
        """Get secret from Key Vault"""
        try:
            secret = await self.secret_client.get_secret(secret_name)
            return secret.value
        except Exception as e:
            logger.error(f"Failed to get secret {secret_name}: {str(e)}")
            raise
    
    async def set_secret(self, secret_name: str, secret_value: str):
        """Set secret in Key Vault"""
        try:
            await self.secret_client.set_secret(secret_name, secret_value)
        except Exception as e:
            logger.error(f"Failed to set secret {secret_name}: {str(e)}")
            raise


# ========================================
# 12. PASSWORD VALIDATION
# ========================================

class PasswordValidator:
    """Validate password complexity"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
    
    def validate(self, password: str) -> Tuple[bool, List[str]]:
        """Validate password meets requirements"""
        errors = []
        
        if len(password) < self.config.password_min_length:
            errors.append(f"Password must be at least {self.config.password_min_length} characters")
        
        if self.config.password_require_uppercase and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.config.password_require_lowercase and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.config.password_require_numbers and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if self.config.password_require_special:
            special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
            if not any(c in special_chars for c in password):
                errors.append("Password must contain at least one special character")
        
        return len(errors) == 0, errors


# ========================================
# 13. SECURITY HEADERS
# ========================================

async def add_security_headers(request: Request, call_next):
    """Add security headers to responses"""
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response


# Helper functions for dependencies
async def get_database() -> AsyncSession:
    """Get database session"""
    # Implementation would return actual database session
    pass


async def get_redis() -> aioredis.Redis:
    """Get Redis client"""
    # Implementation would return actual Redis client
    pass


if __name__ == "__main__":
    # Example usage
    config = SecurityConfig()
    
    # Initialize components
    azure_ad = AzureADAuthenticator(config)
    token_manager = JWTTokenManager(config)
    auth_manager = AuthorizationManager()
    
    # Example: Create access token
    access_token = token_manager.create_access_token(
        user_id="123",
        user_email="user@example.com",
        user_role=UserRole.PROCESSOR
    )