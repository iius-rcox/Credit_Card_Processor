"""
Configuration management for Credit Card Processor
"""

import os
from pathlib import Path
from typing import List, Optional
import logging
from functools import lru_cache

class Settings:
    """Application settings with environment variable support"""
    
    # Application
    APP_NAME: str = "Credit Card Processor"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    EXPORT_DIR: Path = DATA_DIR / "exports"
    LOG_DIR: Path = BASE_DIR / "logs"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{DATA_DIR}/database.db"
    
    # Azure Document Intelligence
    DOC_INTELLIGENCE_ENDPOINT: Optional[str] = os.getenv("DOC_INTELLIGENCE_ENDPOINT")
    DOC_INTELLIGENCE_KEY: Optional[str] = os.getenv("DOC_INTELLIGENCE_KEY")
    
    # Authentication
    ADMIN_USERS: List[str] = os.getenv("ADMIN_USERS", "rcox,mikeh,tomj").split(",")
    REQUIRE_AUTH: bool = os.getenv("REQUIRE_AUTH", "true").lower() == "true"
    
    # Processing
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "100")) * 1024 * 1024  # 100MB default
    MAX_CONCURRENT_PROCESSING: int = int(os.getenv("MAX_CONCURRENT_PROCESSING", "10"))
    PROCESSING_TIMEOUT: int = int(os.getenv("PROCESSING_TIMEOUT", "1800"))  # 30 minutes
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: Path = LOG_DIR / "app.log"
    LOG_MAX_BYTES: int = int(os.getenv("LOG_MAX_BYTES", "10485760"))  # 10MB
    LOG_BACKUP_COUNT: int = int(os.getenv("LOG_BACKUP_COUNT", "5"))
    
    # CORS
    ALLOWED_ORIGINS: List[str] = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    
    # File types
    ALLOWED_EXTENSIONS: set = {".pdf", ".PDF"}
    
    def __init__(self):
        """Initialize settings and create directories"""
        self._create_directories()
        self._setup_logging()
    
    def _create_directories(self):
        """Create necessary directories if they don't exist"""
        for directory in [self.DATA_DIR, self.UPLOAD_DIR, self.EXPORT_DIR, self.LOG_DIR]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def _setup_logging(self):
        """Setup application logging configuration"""
        logging.basicConfig(
            level=getattr(logging, self.LOG_LEVEL.upper()),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.handlers.RotatingFileHandler(
                    self.LOG_FILE,
                    maxBytes=self.LOG_MAX_BYTES,
                    backupCount=self.LOG_BACKUP_COUNT
                )
            ]
        )
    
    def is_admin(self, username: str) -> bool:
        """Check if user is an admin"""
        return username.lower() in [admin.lower().strip() for admin in self.ADMIN_USERS]
    
    def validate_azure_config(self) -> bool:
        """Validate Azure Document Intelligence configuration"""
        return bool(self.DOC_INTELLIGENCE_ENDPOINT and self.DOC_INTELLIGENCE_KEY)

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# Constants
class ProcessingStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class EmployeeStatus:
    UNFINISHED = "unfinished"
    FINISHED = "finished"
    ISSUES = "issues"

class FileType:
    CAR = "car"
    RECEIPT = "receipt"

class LogLevel:
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"