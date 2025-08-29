from pydantic import BaseSettings
import os
from pathlib import Path

class Settings(BaseSettings):
    """All configuration in ONE file"""
    
    # Database Configuration
    DATABASE_PATH: str = "./data/database.db"
    
    # File Storage Configuration
    UPLOAD_PATH: str = "./data/uploads"
    EXPORT_PATH: str = "./data/exports"
    MAX_FILE_SIZE_MB: int = 100
    
    # Azure Document Intelligence Configuration
    DOC_INTELLIGENCE_ENDPOINT: str = ""
    DOC_INTELLIGENCE_KEY: str = ""
    USE_AZURE_DOC_INTELLIGENCE: bool = False  # Default to mock for development
    
    # Processing Configuration
    MAX_RETRY_ATTEMPTS: int = 3
    POLL_INTERVAL_SECONDS: int = 5
    
    # Authentication Configuration
    ADMIN_USERS: list = ["rcox", "mikeh", "tomj"]
    
    # Development/Production Configuration
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()

# Ensure data directories exist
def ensure_directories():
    """Create necessary directories if they don't exist"""
    Path(settings.UPLOAD_PATH).mkdir(parents=True, exist_ok=True)
    Path(settings.EXPORT_PATH).mkdir(parents=True, exist_ok=True)
    Path(os.path.dirname(settings.DATABASE_PATH)).mkdir(parents=True, exist_ok=True)

# Call on import
ensure_directories()