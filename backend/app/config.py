import os
import secrets
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator, Field

class Settings(BaseSettings):
    # Application
    app_name: str = "Credit Card Processor"
    version: str = "1.0.0"
    debug: bool = False
    
    # Database
    database_path: str = "./data/database.db"
    
    # File paths
    upload_path: str = "./data/uploads"
    export_path: str = "./data/exports"
    
    # File size limits
    max_file_size_mb: int = 100
    
    # Processing
    max_employees: int = 100
    
    # Authentication & Security
    # Admin users loaded from environment variable (comma-separated)
    admin_users_env: Optional[str] = Field(
        default=None, 
        alias="ADMIN_USERS",
        description="Comma-separated list of admin usernames - must be set via environment variable"
    )
    
    # Session and security settings
    session_timeout_minutes: int = Field(default=480, alias="SESSION_TIMEOUT_MINUTES")  # 8 hours
    session_secret_key: str = Field(
        default=None,
        alias="SESSION_SECRET_KEY",
        min_length=32,
        description="Secret key for session management - required in production"
    )
    max_login_attempts: int = Field(default=5, alias="MAX_LOGIN_ATTEMPTS")
    login_lockout_minutes: int = Field(default=15, alias="LOGIN_LOCKOUT_MINUTES")
    
    # CORS and host security
    allowed_origins_env: Optional[str] = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
        description="Comma-separated list of allowed CORS origins"
    )
    trusted_hosts_env: Optional[str] = Field(
        default="localhost,127.0.0.1,*.local",
        alias="TRUSTED_HOSTS", 
        description="Comma-separated list of trusted hosts"
    )
    
    # Security headers and settings
    enable_security_headers: bool = Field(default=True, alias="ENABLE_SECURITY_HEADERS")
    force_https: bool = Field(default=False, alias="FORCE_HTTPS")
    hsts_max_age: int = Field(default=31536000, alias="HSTS_MAX_AGE")  # 1 year
    
    # Rate limiting
    rate_limit_requests: int = Field(default=100, alias="RATE_LIMIT_REQUESTS")
    rate_limit_period: int = Field(default=60, alias="RATE_LIMIT_PERIOD")  # seconds
    
    # Azure Document Intelligence (when available)
    azure_document_intelligence_endpoint: Optional[str] = Field(
        default=None,
        alias="AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT",
        description="Azure Document Intelligence service endpoint URL"
    )
    azure_document_intelligence_key: Optional[str] = Field(
        default=None,
        alias="AZURE_DOCUMENT_INTELLIGENCE_KEY", 
        description="Azure Document Intelligence API key"
    )
    azure_car_model_id: Optional[str] = Field(
        default=None,
        alias="AZURE_CAR_MODEL_ID",
        description="Custom Azure model ID for CAR document processing"
    )
    azure_receipt_model_id: Optional[str] = Field(
        default=None,
        alias="AZURE_RECEIPT_MODEL_ID", 
        description="Custom Azure model ID for Receipt document processing"
    )
    
    model_config = {"env_file": ".env", "case_sensitive": False}
    
    @field_validator("session_secret_key")
    @classmethod
    def validate_session_secret(cls, v: Optional[str]) -> str:
        """
        Ensure session secret key is secure enough for production
        Auto-generates a secure key if none provided in development
        """
        # If no key provided, generate one automatically
        if not v:
            # In production, this should be provided via environment variable
            if os.getenv("ENVIRONMENT", "development").lower() == "production":
                raise ValueError(
                    "SESSION_SECRET_KEY environment variable is required in production. "
                    "Generate a secure key using: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            else:
                # Auto-generate secure key for development
                generated_key = secrets.token_urlsafe(64)
                import warnings
                warnings.warn(
                    f"No SESSION_SECRET_KEY provided. Auto-generated secure key for development. "
                    f"For production, set SESSION_SECRET_KEY environment variable.",
                    UserWarning,
                    stacklevel=2
                )
                return generated_key
        
        # Validate minimum length
        if len(v) < 32:
            raise ValueError("Session secret key must be at least 32 characters long")
        
        # Check for weak/default keys
        weak_keys = [
            "dev-session-secret-change-in-production",
            "development-key",
            "test-key",
            "changeme",
            "default"
        ]
        
        if v.lower() in [key.lower() for key in weak_keys]:
            if os.getenv("ENVIRONMENT", "development").lower() == "production":
                raise ValueError(
                    "Weak or default session secret key detected in production. "
                    "Please use a strong, randomly generated key."
                )
            else:
                import warnings
                warnings.warn(
                    "Using a weak session secret key. Generate a secure key for production!",
                    UserWarning,
                    stacklevel=2
                )
        
        return v
    
    @property
    def admin_users(self) -> List[str]:
        """Parse comma-separated admin users from environment variable"""
        if not self.admin_users_env:
            return []
        users = [user.strip().lower() for user in self.admin_users_env.split(",")]
        return [user for user in users if user]  # Filter out empty strings
    
    @property
    def allowed_origins(self) -> List[str]:
        """Parse comma-separated CORS origins from environment variable"""
        if not self.allowed_origins_env:
            return []
        origins = [origin.strip() for origin in self.allowed_origins_env.split(",")]
        return [origin for origin in origins if origin]
    
    @property
    def trusted_hosts(self) -> List[str]:
        """Parse comma-separated trusted hosts from environment variable"""
        if not self.trusted_hosts_env:
            return []
        hosts = [host.strip() for host in self.trusted_hosts_env.split(",")]
        return [host for host in hosts if host]
    
    def is_admin_user(self, username: str) -> bool:
        """
        Check if a username is in the admin users list (case-insensitive)
        
        Args:
            username: The username to check
            
        Returns:
            bool: True if user is admin, False otherwise
        """
        if not username:
            return False
        return username.lower() in self.admin_users
    
    def get_security_headers(self) -> dict:
        """
        Get security headers based on configuration
        
        Returns:
            dict: Security headers to include in responses
        """
        headers = {}
        
        if self.enable_security_headers:
            headers.update({
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "X-XSS-Protection": "1; mode=block",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "Content-Security-Policy": (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self'; "
                    "connect-src 'self'"
                )
            })
            
            if self.force_https:
                headers["Strict-Transport-Security"] = f"max-age={self.hsts_max_age}; includeSubDomains"
        
        return headers

# Global settings instance
settings = Settings()

# Create required directories
def init_directories():
    """Create required directories if they don't exist"""
    Path(settings.upload_path).mkdir(parents=True, exist_ok=True)
    Path(settings.export_path).mkdir(parents=True, exist_ok=True)
    Path(os.path.dirname(settings.database_path)).mkdir(parents=True, exist_ok=True)