from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# SQLite setup and connection
SQLALCHEMY_DATABASE_URL = f"sqlite:///{settings.DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Database dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """Initialize database tables"""
    from .models import ProcessingSession, EmployeeRevision, ProcessingActivity, FileUpload
    Base.metadata.create_all(bind=engine)

def backup_database():
    """Backup database (to be called daily)"""
    import shutil
    from datetime import date
    import os
    
    backup_dir = os.path.join(os.path.dirname(settings.DATABASE_PATH), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    backup_path = os.path.join(backup_dir, f"db_{date.today()}.db")
    shutil.copy(settings.DATABASE_PATH, backup_path)
    
    # Keep only last 30 backups
    import glob
    backups = sorted(glob.glob(os.path.join(backup_dir, "db_*.db")))
    if len(backups) > 30:
        for old_backup in backups[:-30]:
            os.remove(old_backup)