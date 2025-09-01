from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings, init_directories

# Create database engine with performance optimizations
engine = create_engine(
    f"sqlite:///{settings.database_path}",
    connect_args={
        "check_same_thread": False,
        "timeout": 20,
        "isolation_level": None  # Enable autocommit mode for better performance
    },
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections every hour
    echo=False  # Disable SQL echo for production
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models using modern SQLAlchemy 2.0+ pattern
class Base(DeclarativeBase):
    pass

# Database dependency
def get_db():
    """Database dependency for FastAPI endpoints"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database initialization
def init_database():
    """Initialize database and create all tables"""
    init_directories()
    Base.metadata.create_all(bind=engine)