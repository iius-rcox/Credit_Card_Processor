"""
Database connection and operations for Credit Card Processor
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, List, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy import func, and_, or_, desc

from models import Base, ProcessingSession, EmployeeRevision, ProcessingLog, SystemHealth
from config import get_settings, ProcessingStatus, EmployeeStatus, LogLevel

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database connection and operations manager"""
    
    def __init__(self):
        self.settings = get_settings()
        self.engine = None
        self.async_engine = None
        self.SessionLocal = None
        self.AsyncSessionLocal = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize database connections and create tables"""
        if self._initialized:
            return
        
        try:
            # Create sync engine for migrations and setup
            database_url = self.settings.DATABASE_URL
            self.engine = create_engine(
                database_url,
                poolclass=StaticPool,
                connect_args={
                    "check_same_thread": False,
                    "timeout": 30
                },
                echo=self.settings.DEBUG
            )
            
            # Create async engine for application use
            async_database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")
            self.async_engine = create_async_engine(
                async_database_url,
                poolclass=StaticPool,
                connect_args={
                    "check_same_thread": False,
                    "timeout": 30
                },
                echo=self.settings.DEBUG
            )
            
            # Create session factories
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
            self.AsyncSessionLocal = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Enable WAL mode for better concurrency
            @event.listens_for(self.engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA cache_size=10000")
                cursor.execute("PRAGMA temp_store=MEMORY")
                cursor.close()
            
            # Create all tables
            Base.metadata.create_all(bind=self.engine)
            
            self._initialized = True
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    async def close(self):
        """Close database connections"""
        if self.async_engine:
            await self.async_engine.dispose()
        if self.engine:
            self.engine.dispose()
        self._initialized = False
        logger.info("Database connections closed")
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get async database session with automatic cleanup"""
        if not self._initialized:
            await self.initialize()
        
        async with self.AsyncSessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    def get_sync_session(self) -> Session:
        """Get synchronous database session"""
        if not self._initialized:
            # Initialize sync components only
            database_url = self.settings.DATABASE_URL
            self.engine = create_engine(database_url, poolclass=StaticPool)
            self.SessionLocal = sessionmaker(bind=self.engine)
            Base.metadata.create_all(bind=self.engine)
        
        return self.SessionLocal()
    
    async def health_check(self) -> Dict[str, Any]:
        """Check database health"""
        try:
            async with self.get_session() as session:
                result = await session.execute(text("SELECT 1"))
                result.fetchone()
                
                # Check table counts
                sessions_count = await session.scalar(
                    text("SELECT COUNT(*) FROM processing_sessions")
                )
                
                return {
                    "status": "healthy",
                    "connection": "ok",
                    "sessions_count": sessions_count,
                    "timestamp": datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

# Global database manager instance
db_manager = DatabaseManager()

class SessionManager:
    """Manager for processing sessions operations"""
    
    @staticmethod
    async def create_session(
        username: str,
        session_name: str,
        car_file_path: Optional[str] = None,
        receipt_file_path: Optional[str] = None,
        car_checksum: Optional[str] = None,
        receipt_checksum: Optional[str] = None,
        parent_session_id: Optional[str] = None
    ) -> ProcessingSession:
        """Create a new processing session"""
        async with db_manager.get_session() as session:
            # Determine revision number
            revision_number = 1
            if parent_session_id:
                parent = await session.get(ProcessingSession, parent_session_id)
                if parent:
                    revision_number = parent.revision_number + 1
            
            new_session = ProcessingSession(
                username=username,
                session_name=session_name,
                car_file_path=car_file_path,
                receipt_file_path=receipt_file_path,
                car_file_checksum=car_checksum,
                receipt_file_checksum=receipt_checksum,
                parent_session_id=parent_session_id,
                revision_number=revision_number
            )
            
            session.add(new_session)
            await session.commit()
            await session.refresh(new_session)
            
            logger.info(f"Created session {new_session.session_id} for user {username}")
            return new_session
    
    @staticmethod
    async def get_session(session_id: str) -> Optional[ProcessingSession]:
        """Get session by ID"""
        async with db_manager.get_session() as session:
            return await session.get(ProcessingSession, session_id)
    
    @staticmethod
    async def update_session_status(
        session_id: str,
        status: str,
        error_message: Optional[str] = None,
        progress: Optional[int] = None
    ):
        """Update session status and progress"""
        async with db_manager.get_session() as session:
            processing_session = await session.get(ProcessingSession, session_id)
            if processing_session:
                processing_session.status = status
                processing_session.updated_at = datetime.utcnow()
                
                if error_message:
                    processing_session.error_message = error_message
                
                if progress is not None:
                    processing_session.processing_progress = progress
                
                if status == ProcessingStatus.PROCESSING and not processing_session.processing_started_at:
                    processing_session.processing_started_at = datetime.utcnow()
                elif status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]:
                    processing_session.processing_completed_at = datetime.utcnow()
                
                await session.commit()
                logger.info(f"Updated session {session_id} status to {status}")
    
    @staticmethod
    async def get_user_sessions(
        username: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[ProcessingSession]:
        """Get sessions for a specific user"""
        async with db_manager.get_session() as session:
            result = await session.execute(
                text("""
                    SELECT * FROM processing_sessions 
                    WHERE username = :username 
                    ORDER BY created_at DESC 
                    LIMIT :limit OFFSET :offset
                """),
                {"username": username, "limit": limit, "offset": offset}
            )
            return result.fetchall()
    
    @staticmethod
    async def get_all_sessions(
        limit: int = 100,
        offset: int = 0,
        status_filter: Optional[str] = None
    ) -> List[ProcessingSession]:
        """Get all sessions (admin only)"""
        async with db_manager.get_session() as session:
            query = "SELECT * FROM processing_sessions"
            params = {"limit": limit, "offset": offset}
            
            if status_filter:
                query += " WHERE status = :status"
                params["status"] = status_filter
            
            query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
            
            result = await session.execute(text(query), params)
            return result.fetchall()

class EmployeeManager:
    """Manager for employee revision operations"""
    
    @staticmethod
    async def create_employee_revision(
        session_id: str,
        employee_name: str,
        employee_id: Optional[str] = None,
        card_number: Optional[str] = None,
        car_total: Optional[float] = None,
        receipt_total: Optional[float] = None,
        ai_data: Optional[Dict] = None
    ) -> EmployeeRevision:
        """Create a new employee revision"""
        async with db_manager.get_session() as session:
            revision = EmployeeRevision(
                session_id=session_id,
                employee_name=employee_name,
                employee_id=employee_id,
                card_number=card_number,
                car_total=car_total or 0.0,
                receipt_total=receipt_total or 0.0,
                ai_extracted_data=ai_data
            )
            
            revision.calculate_difference()
            session.add(revision)
            await session.commit()
            await session.refresh(revision)
            
            return revision
    
    @staticmethod
    async def get_session_employees(session_id: str) -> List[EmployeeRevision]:
        """Get all employees for a session"""
        async with db_manager.get_session() as session:
            result = await session.execute(
                text("""
                    SELECT * FROM employee_revisions 
                    WHERE session_id = :session_id 
                    ORDER BY employee_name
                """),
                {"session_id": session_id}
            )
            return result.fetchall()
    
    @staticmethod
    async def update_employee_status(
        revision_id: str,
        status: str,
        issues_count: Optional[int] = None,
        validation_flags: Optional[Dict] = None
    ):
        """Update employee status and validation"""
        async with db_manager.get_session() as session:
            employee = await session.get(EmployeeRevision, revision_id)
            if employee:
                employee.status = status
                employee.processed_at = datetime.utcnow()
                
                if issues_count is not None:
                    employee.issues_count = issues_count
                
                if validation_flags:
                    employee.validation_flags = validation_flags
                
                await session.commit()

class LogManager:
    """Manager for processing logs"""
    
    @staticmethod
    async def log_event(
        session_id: str,
        level: str,
        message: str,
        details: Optional[Dict] = None,
        component: Optional[str] = None,
        employee_name: Optional[str] = None
    ):
        """Log a processing event"""
        async with db_manager.get_session() as session:
            log_entry = ProcessingLog(
                session_id=session_id,
                level=level,
                message=message,
                details=details,
                component=component,
                employee_name=employee_name
            )
            
            session.add(log_entry)
            await session.commit()
            
            # Also log to application logger
            log_level = getattr(logging, level.upper(), logging.INFO)
            logger.log(log_level, f"[{session_id}] {message}", extra=details or {})
    
    @staticmethod
    async def get_session_logs(
        session_id: str,
        limit: int = 100,
        level_filter: Optional[str] = None
    ) -> List[ProcessingLog]:
        """Get logs for a session"""
        async with db_manager.get_session() as session:
            query = "SELECT * FROM processing_logs WHERE session_id = :session_id"
            params = {"session_id": session_id, "limit": limit}
            
            if level_filter:
                query += " AND level = :level"
                params["level"] = level_filter
            
            query += " ORDER BY timestamp DESC LIMIT :limit"
            
            result = await session.execute(text(query), params)
            return result.fetchall()
    
    @staticmethod
    async def cleanup_old_logs(days_to_keep: int = 30):
        """Clean up old logs to save space"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        async with db_manager.get_session() as session:
            result = await session.execute(
                text("DELETE FROM processing_logs WHERE timestamp < :cutoff"),
                {"cutoff": cutoff_date}
            )
            await session.commit()
            
            logger.info(f"Cleaned up {result.rowcount} old log entries")

class HealthManager:
    """Manager for system health tracking"""
    
    @staticmethod
    async def record_health_metric(
        component: str,
        status: str,
        metrics: Optional[Dict] = None,
        error_message: Optional[str] = None
    ):
        """Record a health metric"""
        async with db_manager.get_session() as session:
            health_record = SystemHealth(
                component=component,
                status=status,
                metrics=metrics,
                error_message=error_message
            )
            
            session.add(health_record)
            await session.commit()
    
    @staticmethod
    async def get_latest_health_status() -> Dict[str, Any]:
        """Get latest health status for all components"""
        async with db_manager.get_session() as session:
            # Get latest health record for each component
            result = await session.execute(text("""
                SELECT component, status, metrics, error_message, timestamp
                FROM system_health s1
                WHERE timestamp = (
                    SELECT MAX(timestamp) 
                    FROM system_health s2 
                    WHERE s2.component = s1.component
                )
                ORDER BY component
            """))
            
            health_status = {}
            for row in result:
                health_status[row.component] = {
                    "status": row.status,
                    "metrics": row.metrics or {},
                    "error_message": row.error_message,
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None
                }
            
            return health_status

# Initialize database on module import
async def init_database():
    """Initialize database (called during startup)"""
    await db_manager.initialize()

# Cleanup function
async def close_database():
    """Close database connections (called during shutdown)"""
    await db_manager.close()