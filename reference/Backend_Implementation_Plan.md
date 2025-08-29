# Credit Card Processor - Backend Implementation Plan

## Executive Summary

This comprehensive backend implementation plan addresses critical issues found in the historic codebase and provides a detailed roadmap for building a robust FastAPI backend that integrates seamlessly with the Vue.js frontend and existing Azure infrastructure.

## Major Issues Identified in Historic Code

### 1. **Database Schema Issues (database_schema.sql:13)**
- **Critical Error**: Missing quote in enum definition: `'processor', reviewer'` should be `'processor', 'reviewer'`
- This syntax error would prevent database creation entirely

### 2. **API Specification Issues (backend_api_specification.py)**
- Line 214: Deprecated `regex` parameter should be `pattern`
- Line 623: Missing import for `ValidationError` from `pydantic`
- Many placeholder functions with `pass` - incomplete implementation

### 3. **Security Implementation Gaps (security_layer.py)**
- Functions like `get_database()` and `get_redis()` are incomplete (lines 756-765)
- Missing actual Azure AD token validation logic
- Placeholder implementations throughout

### 4. **Processing Pipeline Complexity (pdf_processing_pipeline.py)**
- Overly complex architecture with Celery, Redis, and async processing
- Potential issues with PDF splitting and page range calculations
- Complex error handling that could fail silently

## Comprehensive Backend Implementation Plan

### Phase 1: Simplified Backend Architecture (Weeks 1-2)

#### **Core API Structure**
```python
# main.py - Corrected FastAPI Application
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy import create_engine, Column, String, DateTime, Integer, Text, Decimal
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, Field
import asyncio
import json
from datetime import datetime
from typing import Optional, List
import hashlib
import os

app = FastAPI(title="Credit Card Processor", version="2.0.0")

# Fixed CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### **Corrected Database Models**
```python
# models.py - Fixed SQLAlchemy Models
from sqlalchemy import Column, String, DateTime, Integer, Text, Decimal, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class ProcessingSession(Base):
    __tablename__ = "processing_sessions"
    
    session_id = Column(String, primary_key=True)
    username = Column(String, nullable=False)
    session_name = Column(String, nullable=False)
    status = Column(String, default="processing")
    car_file_path = Column(String)
    receipt_file_path = Column(String)
    car_file_checksum = Column(String)
    receipt_file_checksum = Column(String)
    total_employees = Column(Integer, default=0)
    completed_employees = Column(Integer, default=0)
    parent_session_id = Column(String, ForeignKey("processing_sessions.session_id"))
    revision_number = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    employee_revisions = relationship("EmployeeRevision", back_populates="session")

class EmployeeRevision(Base):
    __tablename__ = "employee_revisions"
    
    revision_id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("processing_sessions.session_id"))
    employee_name = Column(String, nullable=False)
    employee_id = Column(String)
    card_number = Column(String)
    car_total = Column(Decimal(15, 2), default=0.00)
    receipt_total = Column(Decimal(15, 2), default=0.00)
    status = Column(String, default="unfinished")
    validation_flags = Column(Text)  # JSON string
    issues_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ProcessingSession", back_populates="employee_revisions")
```

#### **API Endpoints with Frontend Integration**

```python
# API Endpoints optimized for Vue.js frontend

@app.post("/api/upload")
async def upload_files(
    car_file: Optional[UploadFile] = File(None),
    receipt_file: Optional[UploadFile] = File(None),
    session_name: str = Form(...),
    background_tasks: BackgroundTasks,
    username: str = Depends(get_current_username)
):
    """Upload CAR and/or Receipt files - Vue frontend integration"""
    
    if not car_file and not receipt_file:
        raise HTTPException(400, "At least one file must be provided")
    
    session_id = str(uuid.uuid4())
    upload_dir = f"data/uploads/{session_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save files and calculate checksums
    file_info = {}
    
    if car_file:
        car_content = await car_file.read()
        car_path = f"{upload_dir}/car_{car_file.filename}"
        with open(car_path, "wb") as f:
            f.write(car_content)
        file_info["car_file"] = {
            "path": car_path,
            "checksum": hashlib.sha256(car_content).hexdigest(),
            "size": len(car_content)
        }
    
    if receipt_file:
        receipt_content = await receipt_file.read()
        receipt_path = f"{upload_dir}/receipt_{receipt_file.filename}"
        with open(receipt_path, "wb") as f:
            f.write(receipt_content)
        file_info["receipt_file"] = {
            "path": receipt_path,
            "checksum": hashlib.sha256(receipt_content).hexdigest(),
            "size": len(receipt_content)
        }
    
    # Create session in database
    session = ProcessingSession(
        session_id=session_id,
        username=username,
        session_name=session_name,
        car_file_path=file_info.get("car_file", {}).get("path"),
        receipt_file_path=file_info.get("receipt_file", {}).get("path"),
        car_file_checksum=file_info.get("car_file", {}).get("checksum"),
        receipt_file_checksum=file_info.get("receipt_file", {}).get("checksum")
    )
    
    db = SessionLocal()
    db.add(session)
    db.commit()
    db.close()
    
    # Start processing in background
    background_tasks.add_task(process_files, session_id)
    
    return {
        "session_id": session_id,
        "status": "uploaded",
        "files": file_info
    }

@app.get("/api/progress/{session_id}")
async def get_progress_stream(session_id: str):
    """Server-Sent Events for Vue.js real-time updates"""
    
    async def event_generator():
        while True:
            # Get current progress from database
            db = SessionLocal()
            session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
            
            if not session:
                yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
                break
            
            progress_data = {
                "session_id": session_id,
                "status": session.status,
                "total_employees": session.total_employees,
                "completed_employees": session.completed_employees,
                "progress_percent": (session.completed_employees / max(session.total_employees, 1)) * 100,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            yield f"data: {json.dumps(progress_data)}\n\n"
            
            if session.status in ["completed", "failed"]:
                break
                
            await asyncio.sleep(1)  # Update every second
            db.close()
    
    return StreamingResponse(
        event_generator(), 
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@app.get("/api/results/{session_id}")
async def get_results(session_id: str, username: str = Depends(get_current_username)):
    """Get processing results for Vue.js results display"""
    
    db = SessionLocal()
    session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
    
    if not session:
        raise HTTPException(404, "Session not found")
    
    # Get employee data
    employees = db.query(EmployeeRevision).filter_by(session_id=session_id).all()
    
    result = {
        "session": {
            "session_id": session.session_id,
            "session_name": session.session_name,
            "status": session.status,
            "total_employees": session.total_employees,
            "completed_employees": session.completed_employees,
            "created_at": session.created_at.isoformat()
        },
        "employees": [
            {
                "revision_id": emp.revision_id,
                "employee_name": emp.employee_name,
                "employee_id": emp.employee_id,
                "car_total": float(emp.car_total),
                "receipt_total": float(emp.receipt_total),
                "difference": float(emp.car_total - emp.receipt_total),
                "status": emp.status,
                "issues_count": emp.issues_count,
                "validation_flags": json.loads(emp.validation_flags or "{}")
            }
            for emp in employees
        ]
    }
    
    db.close()
    return result

@app.get("/api/export/{session_id}/pvault")
async def export_pvault(session_id: str):
    """Export pVault CSV file"""
    
    db = SessionLocal()
    employees = db.query(EmployeeRevision).filter_by(session_id=session_id).all()
    
    if not employees:
        raise HTTPException(404, "No data found for session")
    
    # Generate CSV content
    csv_content = "Employee Name,Employee ID,Card Number,CAR Total,Receipt Total,Difference,Status\n"
    for emp in employees:
        csv_content += f"{emp.employee_name},{emp.employee_id or ''},{emp.card_number or ''},{emp.car_total},{emp.receipt_total},{emp.car_total - emp.receipt_total},{emp.status}\n"
    
    # Save to exports directory
    export_path = f"data/exports/{session_id}_pvault.csv"
    os.makedirs(os.path.dirname(export_path), exist_ok=True)
    with open(export_path, "w") as f:
        f.write(csv_content)
    
    db.close()
    
    return FileResponse(
        export_path,
        filename=f"pvault_export_{session_id}.csv",
        media_type="text/csv"
    )
```

### Phase 2: Document Processing Integration (Week 2)

#### **Azure Document Intelligence Integration**
```python
# document_processor.py - Simplified and robust implementation
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
import json
import logging

class DocumentProcessor:
    def __init__(self, endpoint: str, key: str):
        self.client = DocumentIntelligenceClient(
            endpoint=endpoint, 
            credential=AzureKeyCredential(key)
        )
        self.logger = logging.getLogger(__name__)
    
    async def process_car_pdf(self, file_path: str, session_id: str) -> List[dict]:
        """Process CAR PDF with error handling"""
        try:
            with open(file_path, "rb") as f:
                file_content = f.read()
            
            # Use prebuilt-invoice model for CAR files
            poller = self.client.begin_analyze_document(
                "prebuilt-invoice", file_content
            )
            result = poller.result()
            
            employees = []
            for document in result.documents:
                employee_data = self._extract_employee_data(document)
                if employee_data:
                    employees.append(employee_data)
            
            # Update database with extracted data
            await self._save_employee_data(session_id, employees)
            
            return employees
            
        except Exception as e:
            self.logger.error(f"Error processing CAR PDF {file_path}: {str(e)}")
            raise HTTPException(500, f"Document processing failed: {str(e)}")
    
    def _extract_employee_data(self, document) -> dict:
        """Extract employee data from document intelligence result"""
        try:
            return {
                "employee_name": self._get_field_value(document, "CustomerName"),
                "employee_id": self._get_field_value(document, "CustomerID"),
                "car_total": float(self._get_field_value(document, "TotalAmount", "0")),
                "status": "extracted"
            }
        except Exception as e:
            self.logger.warning(f"Failed to extract employee data: {str(e)}")
            return None
    
    def _get_field_value(self, document, field_name: str, default=""):
        """Safely extract field value"""
        if hasattr(document, 'fields') and field_name in document.fields:
            field = document.fields[field_name]
            return field.value if field and hasattr(field, 'value') else default
        return default
```

### Phase 3: Frontend Integration Patterns (Weeks 3-4)

#### **Vue.js Composables for API Integration**
```javascript
// composables/useFileUpload.js - Vue 3 integration
import { ref, reactive } from 'vue'

export function useFileUpload() {
  const uploadState = reactive({
    carFile: null,
    receiptFile: null,
    sessionName: '',
    uploading: false,
    error: null,
    sessionId: null
  })

  const uploadFiles = async () => {
    if (!uploadState.carFile && !uploadState.receiptFile) {
      uploadState.error = 'At least one file is required'
      return false
    }

    uploadState.uploading = true
    uploadState.error = null

    try {
      const formData = new FormData()
      if (uploadState.carFile) {
        formData.append('car_file', uploadState.carFile)
      }
      if (uploadState.receiptFile) {
        formData.append('receipt_file', uploadState.receiptFile)
      }
      formData.append('session_name', uploadState.sessionName)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      uploadState.sessionId = result.session_id
      
      return result
    } catch (error) {
      uploadState.error = error.message
      return false
    } finally {
      uploadState.uploading = false
    }
  }

  const resetUpload = () => {
    uploadState.carFile = null
    uploadState.receiptFile = null
    uploadState.sessionName = ''
    uploadState.error = null
    uploadState.sessionId = null
  }

  return {
    uploadState,
    uploadFiles,
    resetUpload
  }
}
```

#### **Real-time Progress Tracking**
```javascript
// composables/useProgressTracking.js
import { ref, onUnmounted } from 'vue'

export function useProgressTracking() {
  const progress = ref({
    status: 'idle',
    total_employees: 0,
    completed_employees: 0,
    progress_percent: 0
  })

  const error = ref(null)
  let eventSource = null

  const startTracking = (sessionId) => {
    if (eventSource) {
      eventSource.close()
    }

    eventSource = new EventSource(`/api/progress/${sessionId}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.error) {
          error.value = data.error
          eventSource.close()
        } else {
          progress.value = data
          
          // Close connection when processing is complete
          if (data.status === 'completed' || data.status === 'failed') {
            eventSource.close()
          }
        }
      } catch (e) {
        error.value = 'Failed to parse progress data'
      }
    }

    eventSource.onerror = () => {
      error.value = 'Connection to progress stream lost'
      eventSource.close()
    }
  }

  const stopTracking = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  onUnmounted(() => {
    stopTracking()
  })

  return {
    progress,
    error,
    startTracking,
    stopTracking
  }
}
```

### Phase 4: Deployment Strategy

#### **Azure Infrastructure Integration**
```yaml
# docker-compose.yml - Simplified deployment
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./data/database.db
      - DOC_INTELLIGENCE_ENDPOINT=${DOC_INTELLIGENCE_ENDPOINT}
      - DOC_INTELLIGENCE_KEY=${DOC_INTELLIGENCE_KEY}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

#### **Production Configuration**
```python
# config.py - Environment-based configuration
import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./data/database.db"
    
    # Azure Document Intelligence
    doc_intelligence_endpoint: str = os.getenv("DOC_INTELLIGENCE_ENDPOINT")
    doc_intelligence_key: str = os.getenv("DOC_INTELLIGENCE_KEY")
    
    # File Storage
    upload_dir: str = "./data/uploads"
    export_dir: str = "./data/exports"
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    
    # Authentication (Windows headers)
    admin_users: list = ["rcox", "mikeh", "tomj"]
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "./logs/app.log"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Critical Implementation Recommendations

### **Key Fixes for Historic Code Issues:**

1. **Database Schema**: Fix line 13 in `database_schema.sql` - add missing quote in enum
2. **API Specification**: Replace `regex` with `pattern` in Pydantic models (line 214)
3. **Import Statements**: Add missing `ValidationError` import in API specification
4. **Simplified Architecture**: Avoid the complex Celery/Redis setup from historic code

### **Backend-Frontend Integration Strategy:**

#### **Week 1-2: Core Backend (focus:backend_api_specification.py:214)**
- Fix database schema syntax errors
- Implement simplified FastAPI with SQLite
- Create working file upload endpoints
- Basic Windows authentication via headers

#### **Week 3-4: Vue.js Integration (focus:Simplified_Implementation_Plan.md:355)**  
- Server-Sent Events for progress tracking
- Real-time UI updates without WebSocket complexity
- Drag-and-drop file upload with progress bars
- Results display with export functionality

#### **Week 5-6: Production Deployment (focus:azure-resources-reference.md:131)**
- Deploy to existing Azure infrastructure
- Integrate with `iius-doc-intelligence` service  
- Use existing `INSCOLVSQL` database server if needed
- Configure monitoring with existing Azure Monitor setup

### **Success Metrics:**
- **Processing Time**: <2 minutes for 50-employee reports
- **Accuracy**: >95% with Document Intelligence  
- **User Experience**: Single-page workflow with real-time feedback
- **Deployment**: Single VM deployment using existing Azure resources

---

## Conclusion

This implementation plan addresses all the critical issues found in the historic code while providing a robust, maintainable solution that integrates seamlessly with the Vue.js frontend and existing Azure infrastructure. The simplified architecture reduces complexity while maintaining enterprise-grade functionality.

**Next Steps:**
1. Fix critical database schema errors
2. Implement corrected FastAPI backend
3. Set up Azure Document Intelligence integration
4. Create Vue.js frontend with real-time progress tracking
5. Deploy using existing Azure infrastructure

---

**Document Version**: 1.0  
**Date**: August 29, 2025  
**Status**: Ready for Implementation