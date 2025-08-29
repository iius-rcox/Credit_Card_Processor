# Credit Card Processor - Development Rules

> **Purpose**: Maintain consistency across AI agents (Claude Code, ChatGPT, Cursor) and prevent architectural drift over time.
> 
> **Philosophy**: Simplicity over complexity. Working code over perfect code. Set-and-forget over constant maintenance.

### Design Principles
- **Don't overengineer**: Simple beats complex
- **No fallbacks**: One correct path, no alternatives
- **One way**: One way to do things, not many
- **Clarity over compatibility**: Clear code beats backward compatibility
- **Throw errors**: Fail fast when preconditions aren't met
- **No backups**: Trust the primary mechanism
- **Separation of concerns**: Each function should have a single responsibility

### Development Methodology
- **Surgical changes only**: Make minimal, focused fixes
- **Evidence-based debugging**: Add minimal, targeted logging
- **Fix root causes**: Address the underlying issue, not just symptoms
- **Simple > Complex**: Let TypeScript catch errors instead of excessive runtime checks
- **Collaborative process**: Work with user to identify most efficient solution

## 1. IMMUTABLE ARCHITECTURE DECISIONS

These decisions are final and MUST NOT be changed by any AI agent:

### Core Stack
- **Backend**: FastAPI with SQLite (local to application)
- **Frontend**: Vue 3 + Vite + Pinia + Tailwind CSS
- **PDF Processing**: Azure Document Intelligence (always available)
- **Deployment**: Local VM with systemd services
- **Authentication**: Trust Windows domain headers completely

### Non-Negotiable Constraints
- NO Kubernetes complexity
- NO Azure Blob Storage for working files
- NO Celery/Redis for background tasks
- NO complex authentication flows
- NO database migrations to PostgreSQL

## 2. PROJECT STRUCTURE

Every file MUST follow this exact structure:
```
credit-card-processor/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point ONLY
│   │   ├── config.py         # All configuration in ONE file
│   │   ├── database.py       # SQLite setup and connection
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── sessions.py   # Session endpoints
│   │   │   ├── upload.py     # File upload endpoints
│   │   │   ├── processing.py # Processing endpoints
│   │   │   └── export.py     # Export endpoints
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── document_intelligence.py
│   │       ├── pdf_processor.py
│   │       └── report_generator.py
│   ├── tests/
│   │   └── test_*.py         # Mirror structure of app/
│   ├── data/
│   │   ├── database.db       # SQLite database
│   │   ├── uploads/          # Temporary upload storage
│   │   └── exports/          # Generated reports
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.vue          # Root component ONLY
│   │   ├── components/
│   │   │   ├── FileUpload.vue
│   │   │   ├── ProgressTracker.vue
│   │   │   ├── ResultsDisplay.vue
│   │   │   └── ExportActions.vue
│   │   ├── composables/
│   │   │   ├── useApi.js
│   │   │   ├── useFileUpload.js
│   │   │   └── useProgress.js
│   │   ├── stores/
│   │   │   └── session.js   # Pinia store
│   │   └── styles/
│   │       └── main.css
│   └── package.json
└── deployment/
    ├── install.sh            # One-time setup script
    └── systemd/
        └── credit-card.service
```

**AI Agent Instruction**: NEVER create files outside this structure. If you think you need a new file, you probably don't.

## 3. NAMING CONVENTIONS

### Python (Backend)
```python
# Classes: PascalCase
class ProcessingSession:

# Functions/Methods: snake_case
def process_car_report():

# Constants: SCREAMING_SNAKE_CASE
MAX_FILE_SIZE_MB = 100

# Private methods: single underscore prefix
def _validate_file():
```

### JavaScript/Vue (Frontend)
```javascript
// Components: PascalCase
FileUpload.vue

// Composables: use prefix
useFileUpload.js

// Methods: camelCase
const processFiles = () => {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3
```

### Database Tables
All table names MUST be plural and snake_case:
- processing_sessions
- employee_revisions
- validation_issues

## 4. API DESIGN RULES

### Endpoint Patterns
All endpoints MUST follow RESTful conventions:
```
POST   /api/sessions                 # Create session
GET    /api/sessions/{id}            # Get session
POST   /api/sessions/{id}/upload     # Upload files
GET    /api/sessions/{id}/status     # Check status (polling)
GET    /api/sessions/{id}/results    # Get results
POST   /api/sessions/{id}/export     # Generate export
```

### Status Polling Pattern (REQUIRED)
```python
# Backend must return:
{
    "status": "processing|completed|failed",
    "current_employee": 23,
    "total_employees": 45,
    "message": "Processing employee: John Smith",
    "percent_complete": 51
}

# Frontend must poll every 5 seconds:
const pollInterval = setInterval(async () => {
    const status = await fetch(`/api/sessions/${sessionId}/status`)
    if (status.data.status !== 'processing') {
        clearInterval(pollInterval)
    }
}, 5000)
```

### Error Response Format (STRICT)
```python
# All errors MUST follow this format:
{
    "error": "human_readable_message",
    "detail": "technical_details_for_logging",
    "code": "ERROR_CODE",
    "timestamp": "2025-01-01T12:00:00Z"
}
```

## 5. DATABASE RULES

### Schema Principles
- Every table MUST have: id, created_at, updated_at
- Use TEXT for strings (no VARCHAR limits in SQLite)
- Store money as INTEGER (cents) to avoid floating point issues
- Store JSON as TEXT with json.dumps/json.loads

### Revision Tracking Pattern
We track revisions, not updates. NEVER update existing records:
```python
# WRONG - Don't do this:
session.car_total = new_total
db.commit()

# RIGHT - Create new revision:
new_revision = EmployeeRevision(
    session_id=session.id,
    revision_number=session.revision_number + 1,
    car_total=new_total
)
```

### Backup Strategy
SQLite database MUST be backed up daily:
```python
# In services/backup.py
def backup_database():
    shutil.copy('data/database.db', f'data/backups/db_{date.today()}.db')
    # Keep only last 30 backups
```

## 6. FRONTEND COMPONENT RULES

### Component Responsibilities
Each component has ONE job:
- **FileUpload.vue**: Handle file selection and upload
- **ProgressTracker.vue**: Show processing progress
- **ResultsDisplay.vue**: Display results table
- **ExportActions.vue**: Handle export generation

### Pinia Store Usage
The session store is the SINGLE source of truth:
```javascript
// stores/session.js
export const useSessionStore = defineStore('session', {
    state: () => ({
        sessionId: null,
        status: 'idle',
        currentEmployee: 0,
        totalEmployees: 0,
        results: []
    })
})

// Components ONLY read from store, never maintain local state for shared data
```

### Tailwind Classes
We use Tailwind utilities directly. NO custom CSS unless absolutely necessary:
```vue
<!-- RIGHT -->
<div class="bg-white rounded-lg shadow-md p-6">

<!-- WRONG -->
<div class="custom-card-style">
```

## 7. ERROR HANDLING PATTERNS

### Backend Retry Logic
Document Intelligence calls MUST retry 3 times:
```python
async def call_document_intelligence(file_bytes, attempt=1):
    try:
        return await client.analyze_document(file_bytes)
    except Exception as e:
        if attempt < 3:
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
            return await call_document_intelligence(file_bytes, attempt + 1)
        raise HTTPException(400, f"Document processing failed after 3 attempts: {str(e)}")
```

### User Notifications
We show errors simply and clearly:
```javascript
// Simple toast notification, not modal dialogs
toast.error('Failed to process files. Please try again.')
```

## 8. TESTING REQUIREMENTS

### What MUST Be Tested
Critical paths only (you MUST write tests for these):
- File upload endpoint
- Document Intelligence integration
- Status polling endpoint
- Export generation

### Test Structure for AI Agents
When asked to write tests, AI agents MUST follow this pattern:
```python
# test_<module_name>.py
import pytest
from fastapi.testclient import TestClient

def test_endpoint_success_case():
    """Test the happy path first"""
    # Arrange
    # Act  
    # Assert

def test_endpoint_handles_errors():
    """Test error conditions"""
    # Should return proper error format
```

### Testing Instructions for AI
When generating tests, include this context:
> "Write pytest tests for [specific function]. Test the success case and main error case only. Use simple mocks for external services. Don't test edge cases."

## 9. PERFORMANCE GUIDELINES

### Acceptable Performance
- File upload: < 10 seconds for 50MB PDF
- Processing: < 2 minutes for 50 employees
- UI response: < 500ms for all interactions

### Database Queries
We optimize for simplicity, not perfect performance:
```python
# This is FINE for 2-3 users:
all_sessions = db.query(ProcessingSession).all()

# Don't over-optimize with complex joins unless proven necessary
```

## 10. DEPLOYMENT RULES

### VM Setup Requirements
The deployment MUST be scriptable:
```bash
#!/bin/bash
# install.sh - One command to rule them all
sudo apt update
sudo apt install python3.11 python3-pip nodejs npm
pip install -r backend/requirements.txt
npm install --prefix frontend
npm run build --prefix frontend
sudo cp deployment/systemd/credit-card.service /etc/systemd/system/
sudo systemctl enable credit-card
sudo systemctl start credit-card
```

### Service Management
We use systemd for "set and forget" operation:
```ini
[Unit]
Description=Credit Card Processor
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/credit-card-processor
ExecStart=/usr/bin/python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 11. AI AGENT INSTRUCTIONS

### Context Every AI Agent Needs
When starting a new conversation, provide this context:
> "Working on Credit Card Processor. Vue 3 + FastAPI + SQLite. Simple implementation for 2-3 users. Check rules.md for patterns."

### Forbidden Patterns
AI agents MUST NOT:
- Suggest PostgreSQL/MySQL migrations
- Add complexity "for scalability"
- Implement complex caching
- Add user registration/login flows
- Create new folders outside the structure
- Suggest Kubernetes/Docker unless specifically asked

### Required Patterns
AI agents MUST:
- Keep solutions simple and direct
- Write tests for any new endpoint
- Use existing patterns from codebase
- Explain WHY when deviating from rules

## 12. MAINTENANCE OPERATIONS

### Daily Automated Tasks
```python
# These run via FastAPI background tasks
@app.on_event("startup")
async def startup_tasks():
    # Start daily backup at 2 AM
    scheduler.add_job(backup_database, 'cron', hour=2)
    # Clean old uploads weekly
    scheduler.add_job(cleanup_old_files, 'cron', day_of_week='sun')
```

### Azure Storage Cleanup
Files older than 90 days are automatically removed:
```python
async def cleanup_azure_archives():
    cutoff = datetime.now() - timedelta(days=90)
    # Delete blobs older than cutoff
```

## 13. DECISION ESCALATION

### When to deviate from these rules:
- **NEVER** deviate from Section 1 (Immutable Architecture)
- **RARELY** deviate from Sections 2-4 (Structure & Patterns)
- **SOMETIMES** optimize Sections 9-10 if performance requires
- **DOCUMENT** any deviation in code comments with justification

## 14. COMMON PITFALLS TO AVOID

### Backend Pitfalls
- Don't add async where not needed (SQLite is synchronous)
- Don't optimize prematurely for users you don't have
- Don't add middleware beyond basic CORS
- Don't implement rate limiting for 2-3 users

### Frontend Pitfalls
- Don't create deeply nested component hierarchies
- Don't duplicate state between Pinia and components
- Don't add routing - it's a single page application
- Don't implement fancy animations that slow things down

### Testing Pitfalls
- Don't aim for 100% coverage
- Don't test UI interactions in detail
- Don't mock what you can use directly
- Don't write tests for tests

---

## APPENDIX: Quick Reference

### Key File Paths
- Database: `backend/data/database.db`
- Uploads: `backend/data/uploads/`
- Exports: `backend/data/exports/`
- Logs: `/var/log/credit-card-processor.log`

### Key Environment Variables
```bash
DOC_INTELLIGENCE_ENDPOINT=https://iius-doc-intelligence.cognitiveservices.azure.com/
DOC_INTELLIGENCE_KEY=<from-key-vault>
DATABASE_PATH=./data/database.db
UPLOAD_PATH=./data/uploads
EXPORT_PATH=./data/exports
```

### Emergency Procedures
- **System Down**: `sudo systemctl restart credit-card`
- **Database Corrupt**: Restore from `data/backups/`
- **Disk Full**: Check `data/uploads/` for orphaned files
- **Document Intelligence Failing**: Check Azure portal for service health

---

**Last Updated**: 8/28/2025
**Version**: 1.0  
**Owner**: Roger Cox
**Review Schedule**: After first production deployment