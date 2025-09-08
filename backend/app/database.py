from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from .config import settings, init_directories

# Create synchronous database engine with performance optimizations
engine = create_engine(
    f"sqlite:///{settings.database_path}",
    connect_args={
        "check_same_thread": False,
        "timeout": 20,
        # Removed isolation_level=None to prevent autocommit issues
    },
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections every hour
    pool_size=10,  # Limit connection pool size
    max_overflow=20,  # Allow temporary overflow connections
    echo=False  # Disable SQL echo for production
)

# Create asynchronous database engine for async operations
async_engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.database_path}",
    connect_args={"check_same_thread": False},
    echo=False
)

# Create session factories
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models using modern SQLAlchemy 2.0+ pattern
class Base(DeclarativeBase):
    pass

# Database dependencies
def get_db():
    """Synchronous database dependency for FastAPI endpoints"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db():
    """Asynchronous database dependency for FastAPI endpoints"""
    async with AsyncSessionLocal() as session:
        yield session

# Database initialization
def init_database():
    """Initialize database and create all tables"""
    init_directories()
    Base.metadata.create_all(bind=engine)