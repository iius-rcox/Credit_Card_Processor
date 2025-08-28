"""
Credit Card Processor - FastAPI Backend Architecture Specification
Enterprise-grade API design with async support, dependency injection, and comprehensive error handling
"""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import List, Optional, Dict, Any, Union
from uuid import UUID

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator, root_validator
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
from celery import Celery


# ========================================
# 1. PYDANTIC MODELS & SCHEMAS
# ========================================

class UserRole(str, Enum):
    ADMIN = "admin"
    PROCESSOR = "processor"
    REVIEWER = "reviewer"
    READ_ONLY = "read_only"


class SessionStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class EmployeeStatus(str, Enum):
    UNFINISHED = "unfinished"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"
    ON_HOLD = "on_hold"


class IssueType(str, Enum):
    MISSING_CODING_INFO = "missing_coding_info"
    MISSING_RECEIPT = "missing_receipt"
    MISSING_ALL_RECEIPTS = "missing_all_receipts"
    TOTAL_MISMATCH = "total_mismatch"
    INVALID_AMOUNT = "invalid_amount"
    DUPLICATE_TRANSACTION = "duplicate_transaction"


class CodingType(str, Enum):
    JOB_CODING = "job_coding"
    GL_CODING = "gl_coding"


# ========================================
# 2. REQUEST/RESPONSE MODELS
# ========================================

class UserResponse(BaseModel):
    user_id: UUID
    azure_ad_object_id: str
    email: str
    display_name: str
    role: UserRole
    is_active: bool
    last_login_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessingSessionRequest(BaseModel):
    session_name: str = Field(..., min_length=1, max_length=255)
    parent_session_id: Optional[UUID] = None
    change_summary: Optional[str] = Field(None, max_length=1000)


class ProcessingSessionResponse(BaseModel):
    session_id: UUID
    session_name: str
    status: SessionStatus
    user_id: UUID
    user_name: str
    
    # File information
    car_file_name: str
    car_file_size: Optional[int]
    receipt_file_name: Optional[str]
    receipt_file_size: Optional[int]
    
    # Statistics
    total_employees: int
    employees_completed: int
    employees_with_issues: int
    total_amount: Decimal
    completion_percentage: Decimal
    
    # Revision tracking
    parent_session_id: Optional[UUID]
    revision_number: int
    change_summary: Optional[str]
    
    # Timestamps
    processing_started_at: datetime
    processing_completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeRevisionResponse(BaseModel):
    revision_id: UUID
    employee_name: str
    employee_id: Optional[str]
    card_number: Optional[str]
    status: EmployeeStatus
    
    # Financial data
    car_total: Decimal
    receipt_total: Decimal
    amount_difference: Decimal
    
    # Validation
    validation_flags: Dict[str, Any]
    issues_resolved_count: int
    total_issues_count: int
    
    # Metadata
    processed_at: datetime
    changed_from_previous: bool
    change_details: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    transaction_id: UUID
    external_transaction_id: str
    transaction_date: date
    amount: Decimal
    description: Optional[str]
    purpose: Optional[str]
    
    # Merchant info
    merchant_name: Optional[str]
    merchant_address: Optional[str]
    
    # Coding
    coding_type: Optional[CodingType]
    job_number: Optional[str]
    job_phase: Optional[str]
    cost_type: Optional[str]
    gl_account: Optional[str]
    gl_description: Optional[str]
    
    # Validation
    has_attachment: bool
    is_coded: bool
    confidence_score: Optional[Decimal]
    manual_review_required: bool
    
    created_at: datetime

    class Config:
        from_attributes = True


class ValidationIssueResponse(BaseModel):
    issue_id: UUID
    issue_type: IssueType
    severity: str
    description: str
    suggested_resolution: Optional[str]
    amount_impact: Decimal
    
    # Resolution
    is_resolved: bool
    resolved_by: Optional[UUID]
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    
    # Metadata
    identified_at: datetime
    due_date: Optional[date]

    class Config:
        from_attributes = True


class ValidationIssueUpdateRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=1, max_length=1000)
    resolution_method: Optional[str] = Field(None, max_length=100)


class FileUploadResponse(BaseModel):
    file_id: UUID
    file_name: str
    file_size: int
    blob_url: str
    processing_status: str
    uploaded_at: datetime


class ReportExportRequest(BaseModel):
    report_type: str = Field(..., regex=r'^(excel_summary|csv_import|audit_trail)$')
    date_range_start: Optional[date]
    date_range_end: Optional[date]
    employee_filter: Optional[List[str]] = Field(None, max_items=100)
    status_filter: Optional[List[EmployeeStatus]]


class ReportExportResponse(BaseModel):
    export_id: UUID
    report_name: str
    file_size: int
    blob_url: str
    expires_at: datetime
    created_at: datetime


# ========================================
# 3. PAGINATED RESPONSES
# ========================================

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(50, ge=1, le=100)
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = Field("desc", regex=r'^(asc|desc)$')


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool


# ========================================
# 4. ERROR MODELS
# ========================================

class ErrorDetail(BaseModel):
    type: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    details: List[ErrorDetail] = []
    request_id: str


# ========================================
# 5. FASTAPI APPLICATION SETUP
# ========================================

app = FastAPI(
    title="Credit Card Processor API",
    description="Enterprise expense processing system with revision tracking",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # Configure appropriately
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security
security = HTTPBearer()

# ========================================
# 6. DEPENDENCY INJECTION
# ========================================

async def get_database() -> AsyncSession:
    """Dependency to get database session"""
    # Implementation will use AsyncSession from SQLAlchemy
    pass


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_database)
) -> UserResponse:
    """Dependency to get current authenticated user from JWT token"""
    # Implementation will validate JWT and return user
    pass


async def require_permission(required_role: UserRole):
    """Dependency factory for role-based access control"""
    def permission_check(current_user: UserResponse = Depends(get_current_user)):
        if current_user.role not in get_allowed_roles(required_role):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return permission_check


def get_allowed_roles(required_role: UserRole) -> List[UserRole]:
    """Get list of roles that satisfy the required permission level"""
    role_hierarchy = {
        UserRole.READ_ONLY: [UserRole.READ_ONLY, UserRole.REVIEWER, UserRole.PROCESSOR, UserRole.ADMIN],
        UserRole.REVIEWER: [UserRole.REVIEWER, UserRole.PROCESSOR, UserRole.ADMIN],
        UserRole.PROCESSOR: [UserRole.PROCESSOR, UserRole.ADMIN],
        UserRole.ADMIN: [UserRole.ADMIN]
    }
    return role_hierarchy[required_role]


# ========================================
# 7. API ENDPOINTS SPECIFICATION
# ========================================

# 7.1 Authentication & User Management
@app.post("/api/v1/auth/login", response_model=UserResponse)
async def login(token: str, db: AsyncSession = Depends(get_database)):
    """Authenticate user with Azure AD token"""
    pass


@app.post("/api/v1/auth/logout", status_code=204)
async def logout(current_user: UserResponse = Depends(get_current_user)):
    """Logout current user"""
    pass


@app.get("/api/v1/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@app.get("/api/v1/users", response_model=PaginatedResponse)
async def list_users(
    pagination: PaginationParams = Depends(),
    current_user: UserResponse = Depends(require_permission(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_database)
):
    """List all users (admin only)"""
    pass


# 7.2 Processing Sessions Management
@app.post("/api/v1/sessions", response_model=ProcessingSessionResponse, status_code=201)
async def create_processing_session(
    session_request: ProcessingSessionRequest,
    background_tasks: BackgroundTasks,
    current_user: UserResponse = Depends(require_permission(UserRole.PROCESSOR)),
    db: AsyncSession = Depends(get_database)
):
    """Create new processing session"""
    pass


@app.get("/api/v1/sessions", response_model=PaginatedResponse)
async def list_processing_sessions(
    pagination: PaginationParams = Depends(),
    status: Optional[SessionStatus] = Query(None),
    user_id: Optional[UUID] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """List processing sessions with filtering"""
    pass


@app.get("/api/v1/sessions/{session_id}", response_model=ProcessingSessionResponse)
async def get_processing_session(
    session_id: UUID = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get specific processing session"""
    pass


@app.delete("/api/v1/sessions/{session_id}", status_code=204)
async def cancel_processing_session(
    session_id: UUID = Path(...),
    current_user: UserResponse = Depends(require_permission(UserRole.PROCESSOR)),
    db: AsyncSession = Depends(get_database)
):
    """Cancel processing session"""
    pass


# 7.3 File Upload & Management
@app.post("/api/v1/sessions/{session_id}/upload/car", response_model=FileUploadResponse)
async def upload_car_file(
    session_id: UUID = Path(...),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: UserResponse = Depends(require_permission(UserRole.PROCESSOR)),
    db: AsyncSession = Depends(get_database)
):
    """Upload CAR (Cardholder Activity Report) PDF file"""
    pass


@app.post("/api/v1/sessions/{session_id}/upload/receipt", response_model=FileUploadResponse)
async def upload_receipt_file(
    session_id: UUID = Path(...),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: UserResponse = Depends(require_permission(UserRole.PROCESSOR)),
    db: AsyncSession = Depends(get_database)
):
    """Upload Receipt Report PDF file"""
    pass


@app.post("/api/v1/sessions/{session_id}/process", status_code=202)
async def start_processing(
    session_id: UUID = Path(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: UserResponse = Depends(require_permission(UserRole.PROCESSOR)),
    db: AsyncSession = Depends(get_database)
):
    """Start processing uploaded files"""
    pass


# 7.4 Employee Data & Revisions
@app.get("/api/v1/sessions/{session_id}/employees", response_model=PaginatedResponse)
async def list_employee_revisions(
    session_id: UUID = Path(...),
    pagination: PaginationParams = Depends(),
    status: Optional[EmployeeStatus] = Query(None),
    has_issues: Optional[bool] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """List employee revisions for a session"""
    pass


@app.get("/api/v1/employees/{revision_id}", response_model=EmployeeRevisionResponse)
async def get_employee_revision(
    revision_id: UUID = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get specific employee revision"""
    pass


@app.get("/api/v1/employees/{revision_id}/transactions", response_model=List[TransactionResponse])
async def get_employee_transactions(
    revision_id: UUID = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get transactions for specific employee revision"""
    pass


@app.patch("/api/v1/employees/{revision_id}/status")
async def update_employee_status(
    revision_id: UUID = Path(...),
    status: EmployeeStatus,
    current_user: UserResponse = Depends(require_permission(UserRole.PROCESSOR)),
    db: AsyncSession = Depends(get_database)
):
    """Update employee status"""
    pass


# 7.5 Validation Issues Management
@app.get("/api/v1/employees/{revision_id}/issues", response_model=List[ValidationIssueResponse])
async def get_employee_issues(
    revision_id: UUID = Path(...),
    resolved: Optional[bool] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get validation issues for employee"""
    pass


@app.get("/api/v1/sessions/{session_id}/issues", response_model=PaginatedResponse)
async def list_session_issues(
    session_id: UUID = Path(...),
    pagination: PaginationParams = Depends(),
    issue_type: Optional[IssueType] = Query(None),
    resolved: Optional[bool] = Query(None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """List all issues for a session"""
    pass


@app.patch("/api/v1/issues/{issue_id}/resolve", response_model=ValidationIssueResponse)
async def resolve_issue(
    issue_id: UUID = Path(...),
    resolution: ValidationIssueUpdateRequest,
    current_user: UserResponse = Depends(require_permission(UserRole.PROCESSOR)),
    db: AsyncSession = Depends(get_database)
):
    """Resolve validation issue"""
    pass


# 7.6 Reports & Exports
@app.post("/api/v1/sessions/{session_id}/export", response_model=ReportExportResponse, status_code=202)
async def export_report(
    session_id: UUID = Path(...),
    export_request: ReportExportRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Export session data as report"""
    pass


@app.get("/api/v1/exports/{export_id}", response_model=ReportExportResponse)
async def get_export_status(
    export_id: UUID = Path(...),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get export status and download URL"""
    pass


@app.get("/api/v1/exports", response_model=PaginatedResponse)
async def list_exports(
    pagination: PaginationParams = Depends(),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """List user's exports"""
    pass


# 7.7 Analytics & Dashboard
@app.get("/api/v1/analytics/overview")
async def get_analytics_overview(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get dashboard analytics overview"""
    return {
        "total_sessions": 0,
        "active_sessions": 0,
        "completed_sessions": 0,
        "outstanding_issues": 0,
        "total_amount_processed": "0.00",
        "completion_rate": "0.00",
        "recent_activity": []
    }


@app.get("/api/v1/analytics/trends")
async def get_analytics_trends(
    days: int = Query(30, ge=7, le=365),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get processing trends over time"""
    pass


# 7.8 Health & System Status
@app.get("/api/health", include_in_schema=False)
async def health_check():
    """Health check endpoint for load balancer"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}


@app.get("/api/v1/system/status")
async def system_status(
    current_user: UserResponse = Depends(require_permission(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_database)
):
    """Get system status and metrics"""
    return {
        "database_status": "connected",
        "blob_storage_status": "connected",
        "document_intelligence_status": "connected",
        "celery_workers": 3,
        "pending_tasks": 0,
        "system_load": "normal"
    }


# ========================================
# 8. ERROR HANDLERS
# ========================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "error": exc.detail,
        "status_code": exc.status_code,
        "request_id": getattr(request.state, 'request_id', 'unknown')
    }


@app.exception_handler(ValidationError)
async def validation_exception_handler(request, exc):
    return {
        "error": "Validation failed",
        "details": [
            {
                "type": error["type"],
                "message": error["msg"],
                "field": ".".join(str(x) for x in error["loc"])
            }
            for error in exc.errors()
        ],
        "request_id": getattr(request.state, 'request_id', 'unknown')
    }


# ========================================
# 9. BACKGROUND TASK DEFINITIONS
# ========================================

async def process_car_pdf(session_id: UUID, file_path: str, user_id: UUID):
    """Background task to process CAR PDF with Azure Document Intelligence"""
    pass


async def process_receipt_pdf(session_id: UUID, file_path: str, user_id: UUID):
    """Background task to process Receipt PDF with Azure Document Intelligence"""
    pass


async def generate_reports(session_id: UUID, export_id: UUID, report_type: str):
    """Background task to generate and upload reports"""
    pass


async def cleanup_old_files(retention_days: int = 90):
    """Background task to clean up old files and data"""
    pass


# ========================================
# 10. MIDDLEWARE FUNCTIONS
# ========================================

@app.middleware("http")
async def add_request_id_middleware(request, call_next):
    """Add unique request ID for tracing"""
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def log_requests_middleware(request, call_next):
    """Log all API requests for audit trail"""
    start_time = datetime.utcnow()
    
    response = await call_next(request)
    
    process_time = (datetime.utcnow() - start_time).total_seconds()
    
    # Log request details (implement proper logging)
    log_data = {
        "method": request.method,
        "url": str(request.url),
        "status_code": response.status_code,
        "process_time": process_time,
        "request_id": getattr(request.state, 'request_id', 'unknown')
    }
    
    return response


# ========================================
# 11. STARTUP/SHUTDOWN EVENTS
# ========================================

@app.on_event("startup")
async def startup_event():
    """Initialize application resources"""
    # Initialize database connection pool
    # Initialize blob storage client
    # Initialize Azure Document Intelligence client
    # Start background task workers
    pass


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up application resources"""
    # Close database connections
    # Close blob storage connections
    # Stop background workers
    pass


# ========================================
# 12. API VERSIONING STRATEGY
# ========================================

# All endpoints are versioned with /api/v1/ prefix
# Future versions will use /api/v2/, etc.
# Backward compatibility maintained for at least 2 major versions
# Deprecation warnings in headers for old versions


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend_api_specification:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )