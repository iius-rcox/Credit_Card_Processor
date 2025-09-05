"""
Test configuration and fixtures for Credit Card Processor backend.
"""

import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Import your FastAPI app and database dependencies
from app.main import app
from app.database import Base, get_db, get_async_db


# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"
TEST_ASYNC_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Synchronous test database engine
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

# Asynchronous test database engine
test_async_engine = create_async_engine(
    TEST_ASYNC_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
TestAsyncSessionLocal = async_sessionmaker(
    bind=test_async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def async_db_session():
    """Create a clean async database session for each test."""
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestAsyncSessionLocal() as session:
        yield session
    
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def db_session():
    """Create a clean sync database session for each test."""
    Base.metadata.create_all(bind=test_engine)
    
    with TestSessionLocal() as session:
        yield session
    
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
async def async_client(async_db_session):
    """Create a test client with database dependency override."""
    
    async def override_get_async_db():
        yield async_db_session
    
    def override_get_db():
        yield next(iter([async_db_session]))
    
    # Override the dependency
    app.dependency_overrides[get_async_db] = override_get_async_db
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client
    
    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def mock_user_headers():
    """Standard mock user headers for authenticated requests."""
    return {
        "x-dev-user": "testuser",
        "x-user-context": "testuser",
        "Content-Type": "application/json",
    }


@pytest.fixture(scope="function")
def sample_session_data():
    """Sample session data for testing."""
    return {
        "session_name": "Test Processing Session",
        "processing_options": {
            "validation_enabled": True,
            "auto_resolution_enabled": False,
            "email_notifications": False,
        },
        "delta_session_id": None,
    }


@pytest.fixture(scope="function")
def sample_pdf_file():
    """Create a mock PDF file for testing."""
    from io import BytesIO
    
    # Create minimal PDF content
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj

xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
174
%%EOF"""
    
    return BytesIO(pdf_content)


@pytest.fixture(scope="function")
def mock_authentication():
    """Mock authentication data."""
    return {
        "username": "testuser",
        "is_admin": True,
        "display_name": "Test User",
        "roles": ["user", "admin"],
        "permissions": ["read", "write", "admin"],
    }


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Setup test environment variables."""
    monkeypatch.setenv("TESTING", "true")
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    monkeypatch.setenv("LOG_LEVEL", "INFO")


class MockFileUpload:
    """Mock file upload for testing."""
    
    def __init__(self, filename: str = "test.pdf", content: bytes = None):
        self.filename = filename
        self.content = content or b"mock pdf content"
        self.content_type = "application/pdf"
        self.size = len(self.content)
    
    async def read(self) -> bytes:
        return self.content
    
    async def seek(self, offset: int):
        pass


@pytest.fixture
def mock_pdf_upload():
    """Create a mock PDF file upload."""
    return MockFileUpload("test_car_statement.pdf", b"mock car statement content")


@pytest.fixture
def mock_receipt_upload():
    """Create a mock receipt file upload."""
    return MockFileUpload("receipt_001.pdf", b"mock receipt content")


# Async utilities for testing
async def wait_for_condition(condition_func, timeout=5.0, interval=0.1):
    """Wait for a condition to become true."""
    import time
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if await condition_func():
            return True
        await asyncio.sleep(interval)
    
    raise TimeoutError(f"Condition not met within {timeout} seconds")


@pytest.fixture
def wait_for():
    """Provide wait_for_condition utility to tests."""
    return wait_for_condition