from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker as async_sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from .config import settings, init_directories
import logging
import time
import threading
import uuid
import sqlite3
import atexit
from datetime import datetime, timezone
from typing import Dict, Optional
from contextlib import contextmanager

# Create synchronous database engine with performance optimizations
engine = create_engine(
    f"sqlite:///{settings.database_path}",
    connect_args={
        "check_same_thread": False,
        "timeout": 60,  # Increased timeout to 60 seconds for better concurrency
        # Removed isolation_level=None to prevent autocommit issues
    },
    pool_pre_ping=True,
    pool_recycle=1800,  # Recycle connections every 30 minutes for better health
    pool_size=10,  # Increased pool size for better concurrent access
    max_overflow=15,  # Increased overflow connections
    echo=False  # Disable SQL echo for production
)

# Create asynchronous database engine for async operations
async_engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.database_path}",
    connect_args={"check_same_thread": False},
    echo=False
)

# PRAGMA configuration lock to prevent race conditions
_pragma_lock = threading.Lock()

# Configure SQLite for better concurrency and reduced locking
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Configure SQLite for optimal performance and reduced locking"""
    cursor = dbapi_connection.cursor()
    
    try:
        with _pragma_lock:
            # Enable WAL mode for better concurrency - this is the critical operation
            # that can cause race conditions if multiple connections try it simultaneously
            cursor.execute("PRAGMA journal_mode=WAL")
            
            # Set busy timeout to 60 seconds for better concurrency
            cursor.execute("PRAGMA busy_timeout=60000")
            
            # Enable foreign key constraints
            cursor.execute("PRAGMA foreign_keys=ON")
            
            # Optimize SQLite performance
            cursor.execute("PRAGMA synchronous=NORMAL")  # Faster than FULL, safer than OFF
            cursor.execute("PRAGMA cache_size=10000")    # Increase cache size
            cursor.execute("PRAGMA temp_store=MEMORY")   # Use memory for temp storage
            
    except Exception as e:
        # Log PRAGMA configuration errors but don't fail connection
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error configuring SQLite PRAGMA settings: {e}")
    finally:
        cursor.close()

# Connection and session monitoring 
connection_metrics = {
    "active_connections": 0,
    "total_connections": 0,
    "failed_connections": 0,
    "last_health_check": None,
    "health_status": "unknown"
}
connection_metrics_lock = threading.Lock()

# Session tracking for lifecycle management
active_sessions = {}
session_metrics = {
    "total_sessions_created": 0,
    "active_session_count": 0,
    "max_session_lifetime": 300,  # 5 minutes max
    "session_timeouts": 0
}
session_metrics_lock = threading.Lock()

# Add missing lock for session cleanup worker
active_sessions_lock = threading.Lock()

# Track connection events with proper thread safety
@event.listens_for(engine, "connect")
def on_connect(dbapi_connection, connection_record):
    """Track new database connections"""
    try:
        with connection_metrics_lock:
            # Atomically update both counters
            connection_metrics["active_connections"] += 1
            connection_metrics["total_connections"] += 1
            # Add connection timestamp for debugging
            connection_record.info['connected_at'] = datetime.now(timezone.utc)
    except Exception as e:
        # Never let metrics tracking break database connections
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to track connection event: {e}")

@event.listens_for(engine, "close")
def on_close(dbapi_connection, connection_record):
    """Track closed database connections"""
    try:
        with connection_metrics_lock:
            # Ensure we never go negative
            if connection_metrics["active_connections"] > 0:
                connection_metrics["active_connections"] -= 1
            else:
                logger = logging.getLogger(__name__)
                logger.warning("Connection close event but no active connections tracked")
    except Exception as e:
        # Never let metrics tracking break database connections
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to track connection close event: {e}")

@event.listens_for(engine, "checkout")
def on_checkout(dbapi_connection, connection_record, connection_proxy):
    """Track connection checkouts from pool"""
    try:
        with connection_metrics_lock:
            connection_record.info['checked_out_at'] = datetime.now(timezone.utc)
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to track connection checkout: {e}")

@event.listens_for(engine, "checkin") 
def on_checkin(dbapi_connection, connection_record):
    """Track connection checkins to pool"""
    try:
        with connection_metrics_lock:
            # Calculate connection usage time for metrics
            checked_out_at = connection_record.info.get('checked_out_at')
            if checked_out_at:
                usage_time = (datetime.now(timezone.utc) - checked_out_at).total_seconds()
                connection_record.info['usage_time'] = usage_time
                connection_record.info.pop('checked_out_at', None)
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to track connection checkin: {e}")

def perform_health_check() -> Dict[str, any]:
    """
    Perform a comprehensive database health check
    
    Returns:
        Dictionary with health check results
    """
    logger = logging.getLogger(__name__)
    health_result = {
        "timestamp": datetime.now(timezone.utc),
        "status": "healthy",
        "details": {},
        "metrics": {}
    }
    
    try:
        # Test basic connectivity
        start_time = time.time()
        with engine.connect() as conn:
            result = conn.execute("SELECT 1").scalar()
            if result != 1:
                raise Exception("Basic connectivity test failed")
        
        connection_time = time.time() - start_time
        health_result["details"]["connection_time_ms"] = round(connection_time * 1000, 2)
        
        # Check WAL mode status with proper synchronization
        try:
            with _pragma_lock:
                with engine.connect() as conn:
                    wal_result = conn.execute("PRAGMA journal_mode").scalar()
                    health_result["details"]["journal_mode"] = wal_result
                    if wal_result.upper() != "WAL":
                        health_result["status"] = "degraded"
                        health_result["details"]["warning"] = "WAL mode not active"
        except Exception as e:
            logger.warning(f"Could not check WAL mode status: {e}")
            health_result["details"]["journal_mode"] = "unknown"
        
        # Get connection pool status
        pool = engine.pool
        health_result["metrics"].update({
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid()
        })
        
        # Update global metrics
        with connection_metrics_lock:
            connection_metrics["last_health_check"] = health_result["timestamp"]
            connection_metrics["health_status"] = health_result["status"]
            health_result["metrics"]["active_connections"] = connection_metrics["active_connections"]
            health_result["metrics"]["total_connections"] = connection_metrics["total_connections"]
            health_result["metrics"]["failed_connections"] = connection_metrics["failed_connections"]
        
        logger.debug(f"Database health check completed: {health_result['status']}")
        
    except Exception as e:
        health_result["status"] = "unhealthy"
        health_result["details"]["error"] = str(e)
        
        with connection_metrics_lock:
            connection_metrics["failed_connections"] += 1
            connection_metrics["health_status"] = "unhealthy"
        
        logger.error(f"Database health check failed: {e}")
    
    return health_result

def get_connection_metrics() -> Dict[str, any]:
    """Get current connection metrics"""
    with connection_metrics_lock:
        return connection_metrics.copy()

def create_isolated_session() -> Session:
    """
    Create an isolated database session with tracking and lifecycle management
    
    Returns:
        New SQLAlchemy session with unique ID and timeout tracking
    """
    logger = logging.getLogger(__name__)
    session_id = str(uuid.uuid4())[:8]
    
    try:
        session = SessionLocal()
        
        # Track session creation
        with session_metrics_lock:
            session_metrics["total_sessions_created"] += 1
            session_metrics["active_session_count"] += 1
            active_sessions[session_id] = {
                "created_at": datetime.now(timezone.utc),
                "session": session,
                "thread_id": threading.get_ident()
            }
        
        # Add session ID as attribute for tracking
        session._session_id = session_id
        
        logger.debug(f"Created isolated session {session_id}")
        return session
        
    except Exception as e:
        logger.error(f"Failed to create isolated session: {e}")
        raise

def cleanup_session(session: Session):
    """
    Properly cleanup a database session
    
    Args:
        session: SQLAlchemy session to cleanup
    """
    logger = logging.getLogger(__name__)
    session_id = getattr(session, '_session_id', 'unknown')
    
    try:
        # Close the session
        session.close()
        
        # Remove from tracking
        with session_metrics_lock:
            if session_id in active_sessions:
                del active_sessions[session_id]
            session_metrics["active_session_count"] = max(0, session_metrics["active_session_count"] - 1)
        
        logger.debug(f"Cleaned up session {session_id}")
        
    except Exception as e:
        logger.warning(f"Error cleaning up session {session_id}: {e}")

def validate_session(session: Session) -> bool:
    """
    Validate that a session is still usable
    
    Args:
        session: SQLAlchemy session to validate
        
    Returns:
        True if session is valid, False otherwise
    """
    session_id = getattr(session, '_session_id', 'unknown')
    logger = logging.getLogger(__name__)
    
    try:
        # Check if session is still in active tracking
        with session_metrics_lock:
            if session_id not in active_sessions:
                logger.debug(f"Session {session_id} not found in active tracking")
                return False
            
            session_info = active_sessions[session_id]
            age = (datetime.now(timezone.utc) - session_info["created_at"]).total_seconds()
            
            # Check for timeout
            if age > session_metrics["max_session_lifetime"]:
                session_metrics["session_timeouts"] += 1
                logger.debug(f"Session {session_id} timed out after {age:.1f}s")
                return False
        
        # Test basic connectivity with timeout and proper error handling
        try:
            # Use a simple SELECT that should work on any database
            result = session.execute("SELECT 1").scalar()
            if result != 1:
                logger.warning(f"Session {session_id} connectivity test returned unexpected result: {result}")
                return False
                
            logger.debug(f"Session {session_id} validation successful")
            return True
            
        except (sqlite3.OperationalError, SQLAlchemyError) as db_error:
            error_msg = str(db_error).lower()
            if "database is locked" in error_msg or "database locked" in error_msg:
                logger.debug(f"Session {session_id} validation failed: database locked")
            else:
                logger.warning(f"Session {session_id} validation failed with database error: {db_error}")
            return False
            
        except Exception as e:
            logger.warning(f"Session {session_id} validation failed with unexpected error: {e}")
            return False
        
    except Exception as e:
        logger.error(f"Session validation failed for {session_id}: {e}")
        return False

@contextmanager
def with_fresh_session():
    """
    Context manager for creating and automatically cleaning up a fresh session
    
    Yields:
        Fresh SQLAlchemy session that will be automatically cleaned up
    """
    session = create_isolated_session()
    try:
        yield session
    finally:
        cleanup_session(session)

def get_session_metrics() -> Dict[str, any]:
    """Get current session metrics"""
    with session_metrics_lock:
        # Clean up any expired sessions
        current_time = datetime.now(timezone.utc)
        expired_sessions = []
        
        for session_id, info in active_sessions.items():
            age = (current_time - info["created_at"]).total_seconds()
            if age > session_metrics["max_session_lifetime"]:
                expired_sessions.append(session_id)
        
        # Remove expired sessions
        for session_id in expired_sessions:
            try:
                active_sessions[session_id]["session"].close()
            except:
                pass
            del active_sessions[session_id]
            session_metrics["session_timeouts"] += 1
        
        session_metrics["active_session_count"] = len(active_sessions)
        
        return {
            **session_metrics,
            "active_sessions": [{
                "session_id": sid,
                "created_at": info["created_at"],
                "age_seconds": (current_time - info["created_at"]).total_seconds(),
                "thread_id": info["thread_id"]
            } for sid, info in active_sessions.items()]
        }

# Create session factories
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models using modern SQLAlchemy 2.0+ pattern
Base = declarative_base()

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


def reset_database_session(session: Session):
    """
    Reset a database session after an error to make it usable again
    
    Args:
        session: SQLAlchemy session to reset
    """
    try:
        # Rollback any pending transactions
        session.rollback()
        
        # Clear all objects from the session
        session.expunge_all()
        
        # Close and recreate the connection
        session.close()
        
    except Exception as e:
        # If reset fails, log but don't raise
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error resetting database session: {e}")


def create_fresh_session():
    """
    Create a fresh database session
    
    Returns:
        New SQLAlchemy session
    """
    return SessionLocal()


def safe_batch_operation(session: Session, operation_func, batch_data, batch_size: int = 5, max_retries: int = 3) -> tuple[bool, int]:
    """
    Safely execute batch operations with retry logic and consistency checks
    
    Args:
        session: SQLAlchemy session to use
        operation_func: Function to execute for each batch item (takes session and item)
        batch_data: List of data items to process
        batch_size: Number of items to process per transaction
        max_retries: Maximum number of retry attempts per batch
        
    Returns:
        Tuple of (success: bool, processed_count: int)
    """
    logger = logging.getLogger(__name__)
    
    processed_count = 0
    total_items = len(batch_data)
    
    for batch_start in range(0, total_items, batch_size):
        batch_end = min(batch_start + batch_size, total_items)
        batch_items = batch_data[batch_start:batch_end]
        
        for attempt in range(max_retries + 1):
            try:
                # Process each item in the batch
                for item in batch_items:
                    operation_func(session, item)
                
                # Commit the batch
                session.commit()
                processed_count += len(batch_items)
                logger.debug(f"Successfully processed batch {batch_start//batch_size + 1}, items {batch_start+1}-{batch_end}")
                break
                
            except (sqlite3.OperationalError, SQLAlchemyError) as e:
                error_msg = str(e).lower()
                is_retryable = (
                    "database is locked" in error_msg or 
                    "database locked" in error_msg or
                    "transaction has been rolled back" in error_msg
                )
                
                if is_retryable and attempt < max_retries:
                    wait_time = 0.1 * (2 ** attempt)
                    logger.warning(f"Batch operation failed, retrying in {wait_time:.2f}s: {str(e)}")
                    
                    try:
                        session.rollback()
                        session.expunge_all()
                    except:
                        pass
                    
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Batch operation failed after {max_retries + 1} attempts: {str(e)}")
                    session.rollback()
                    return False, processed_count
                    
            except Exception as e:
                logger.error(f"Unexpected error during batch operation: {str(e)}")
                session.rollback()
                return False, processed_count
    
    return True, processed_count

@contextmanager
def atomic_transaction(session: Session = None, max_retries: int = 3):
    """
    Context manager for atomic transactions with retry logic
    
    Args:
        session: Optional existing session to use, creates new one if None
        max_retries: Maximum number of retry attempts
        
    Yields:
        SQLAlchemy session within atomic transaction context
    """
    logger = logging.getLogger(__name__)
    
    if session is None:
        session = create_isolated_session()
        should_cleanup = True
    else:
        should_cleanup = False
    
    transaction_success = False
    session_state = "active"  # Track session state: active, reset, corrupt
    last_exception = None
    
    try:
        for attempt in range(max_retries + 1):
            try:
                # Validate session is still usable before yielding
                if session_state == "corrupt":
                    logger.error("Cannot continue with corrupted session")
                    break
                
                yield session
                session.commit()
                transaction_success = True
                session_state = "committed"
                break
                
            except (sqlite3.OperationalError, SQLAlchemyError) as e:
                last_exception = e
                error_msg = str(e).lower()
                is_retryable = (
                    "database is locked" in error_msg or 
                    "database locked" in error_msg or
                    "transaction has been rolled back" in error_msg
                )
                
                if is_retryable and attempt < max_retries:
                    wait_time = 0.1 * (2 ** attempt)
                    logger.warning(f"Transaction failed, retrying in {wait_time:.2f}s: {str(e)}")
                    
                    try:
                        session.rollback()
                        session.expunge_all()
                        session_state = "reset"
                    except Exception as rollback_error:
                        logger.error(f"Failed to reset session: {rollback_error}")
                        session_state = "corrupt"
                        break  # Cannot continue with corrupted session
                    
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Transaction failed after {max_retries + 1} attempts: {str(e)}")
                    try:
                        session.rollback()
                        session_state = "rolled_back"
                    except Exception as rollback_error:
                        logger.error(f"Failed to rollback session: {rollback_error}")
                        session_state = "corrupt"
                    raise
                    
            except Exception as e:
                last_exception = e
                logger.error(f"Unexpected error in transaction: {str(e)}")
                try:
                    session.rollback()
                    session_state = "rolled_back"
                except Exception as rollback_error:
                    logger.error(f"Failed to rollback session after unexpected error: {rollback_error}")
                    session_state = "corrupt"
                raise
        
        # If we exit the loop without success and no exception was raised, 
        # it means we exhausted retries or hit a corrupt session
        if not transaction_success and last_exception:
            raise last_exception
            
    finally:
        # Cleanup rules:
        # 1. Always cleanup if we created the session
        # 2. Always cleanup if session is corrupt (regardless of who created it)
        # 3. Never cleanup sessions provided by caller unless corrupt
        if session is not None:
            if should_cleanup or session_state == "corrupt":
                try:
                    cleanup_session(session)
                    logger.debug(f"Cleaned up session in state: {session_state}")
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup session: {cleanup_error}")
            elif session_state in ["reset", "rolled_back"] and not should_cleanup:
                # For external sessions, ensure they're in a clean state
                try:
                    session.expunge_all()
                    logger.debug("Reset external session state")
                except Exception as reset_error:
                    logger.warning(f"Failed to reset external session: {reset_error}")

def safe_commit(session: Session, max_retries: int = 3) -> bool:
    """
    Safely commit a database session with retry logic and duration monitoring
    
    Args:
        session: SQLAlchemy session to commit
        max_retries: Maximum number of retry attempts
        
    Returns:
        True if commit succeeded, False otherwise
    """
    logger = logging.getLogger(__name__)
    session_id = getattr(session, '_session_id', 'unknown')
    start_time = time.time()
    
    for attempt in range(max_retries + 1):
        try:
            session.commit()
            duration = time.time() - start_time
            if duration > 1.0:  # Log slow commits
                logger.warning(f"Slow commit detected for session {session_id}: {duration:.2f}s")
            else:
                logger.debug(f"Commit successful for session {session_id}: {duration:.3f}s")
            return True
            
        except (sqlite3.OperationalError, SQLAlchemyError) as e:
            error_msg = str(e).lower()
            
            is_retryable = (
                "database is locked" in error_msg or 
                "database locked" in error_msg or
                "transaction has been rolled back" in error_msg
            )
            
            if is_retryable and attempt < max_retries:
                wait_time = 0.1 * (2 ** attempt)
                logger.warning(f"Database commit failed, retrying in {wait_time:.2f}s: {str(e)}")
                
                try:
                    session.rollback()
                    session.expunge_all()
                except:
                    pass  # Ignore reset errors
                
                time.sleep(wait_time)
                continue
            else:
                duration = time.time() - start_time
                logger.error(f"Database commit failed after {max_retries + 1} attempts for session {session_id} (total time: {duration:.2f}s): {str(e)}")
                session.rollback()
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Unexpected error during commit for session {session_id} (total time: {duration:.2f}s): {str(e)}")
            session.rollback()
            return False
    
    return False

# Session cleanup background task
_cleanup_thread = None
_cleanup_stop_event = threading.Event()

def _session_cleanup_worker():
    """Background worker to periodically clean up expired sessions"""
    logger = logging.getLogger(__name__)
    logger.info("Session cleanup worker started")
    
    while not _cleanup_stop_event.is_set():
        try:
            current_time = datetime.now(timezone.utc)
            expired_sessions = []
            
            # Find expired sessions (older than 1 hour)
            with active_sessions_lock:
                for session_id, session_info in list(active_sessions.items()):
                    created_at = session_info.get('created_at', current_time)
                    age_seconds = (current_time - created_at).total_seconds()
                    
                    # Consider sessions older than 1 hour as expired
                    if age_seconds > 3600:  # 1 hour
                        expired_sessions.append((session_id, session_info))
                        logger.debug(f"Found expired session: {session_id} (age: {age_seconds:.0f}s)")
            
            # Clean up expired sessions
            if expired_sessions:
                logger.info(f"Cleaning up {len(expired_sessions)} expired sessions")
                
                for session_id, session_info in expired_sessions:
                    try:
                        with active_sessions_lock:
                            if session_id in active_sessions:
                                # Close the session if it exists
                                session = session_info.get('session')
                                if session:
                                    try:
                                        session.close()
                                    except Exception as e:
                                        logger.warning(f"Error closing expired session {session_id}: {e}")
                                
                                # Remove from tracking
                                del active_sessions[session_id]
                                logger.debug(f"Cleaned up expired session: {session_id}")
                                
                    except Exception as e:
                        logger.error(f"Error cleaning up session {session_id}: {e}")
            
            # Update metrics
            with active_sessions_lock:
                session_count = len(active_sessions)
                logger.debug(f"Active sessions after cleanup: {session_count}")
            
            # Wait for 5 minutes before next cleanup cycle
            if not _cleanup_stop_event.wait(300):  # 5 minutes
                continue
            else:
                break
                
        except Exception as e:
            logger.error(f"Error in session cleanup worker: {e}")
            # Wait a bit before retrying
            if not _cleanup_stop_event.wait(60):  # 1 minute
                continue
            else:
                break
    
    logger.info("Session cleanup worker stopped")

def start_session_cleanup():
    """Start the session cleanup background task"""
    global _cleanup_thread
    
    if _cleanup_thread is None or not _cleanup_thread.is_alive():
        _cleanup_stop_event.clear()
        _cleanup_thread = threading.Thread(target=_session_cleanup_worker, daemon=True)
        _cleanup_thread.start()
        
        logger = logging.getLogger(__name__)
        logger.info("Session cleanup background task started")

def stop_session_cleanup():
    """Stop the session cleanup background task"""
    global _cleanup_thread
    
    if _cleanup_thread and _cleanup_thread.is_alive():
        _cleanup_stop_event.set()
        _cleanup_thread.join(timeout=5)  # Wait up to 5 seconds
        
        logger = logging.getLogger(__name__)
        logger.info("Session cleanup background task stopped")

# Register cleanup stop on exit
atexit.register(stop_session_cleanup)

# Database initialization
def init_database():
    """Initialize database and create all tables"""
    init_directories()
    Base.metadata.create_all(bind=engine)
    
    # Start session cleanup background task
    start_session_cleanup()