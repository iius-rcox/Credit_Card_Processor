import os
from pathlib import Path
from pydantic_settings import BaseSettings

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
    
    # Authentication
    admin_users: list = ["rcox", "mikeh", "tomj"]
    
    # Azure Document Intelligence (when available)
    doc_intelligence_endpoint: str = ""
    doc_intelligence_key: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()

# Create required directories
def init_directories():
    """Create required directories if they don't exist"""
    Path(settings.upload_path).mkdir(parents=True, exist_ok=True)
    Path(settings.export_path).mkdir(parents=True, exist_ok=True)
    Path(os.path.dirname(settings.database_path)).mkdir(parents=True, exist_ok=True)