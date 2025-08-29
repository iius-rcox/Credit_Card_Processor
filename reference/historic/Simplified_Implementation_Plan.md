# Credit Card Processor - Simplified Implementation Plan

## Executive Summary

This implementation plan outlines a 6-week development approach for the Credit Card Processor, using a simplified modern architecture that provides 90% of the user experience benefits with 30% of the technical complexity. The system combines a modern Vue 3 frontend with a streamlined FastAPI + SQLite backend.

**Key Simplifications:**
- Single FastAPI app with background tasks (no Celery/Kubernetes)
- SQLite database (no PostgreSQL maintenance)
- Local file storage (no Azure Blob Storage)
- Vue 3 + Vite frontend (no React complexity)
- Server-Sent Events for progress (no WebSocket complexity)
- Header-based Windows authentication (no Azure AD)
- Single VM deployment (no container orchestration)

---

## Technology Stack

### **Backend Architecture**
```python
# Single FastAPI Application
├── main.py                 # FastAPI app with background tasks
├── models.py              # SQLAlchemy models for SQLite
├── pdf_processor.py       # Azure Document Intelligence integration
├── database.py            # SQLite connection and operations
├── config.py              # Configuration management
├── auth.py                # Windows username extraction
├── data/
│   ├── database.db        # SQLite database file
│   ├── uploads/           # PDF file storage
│   └── exports/           # Generated reports
└── logs/                  # Application logs
```

**Core Dependencies:**
- FastAPI + Uvicorn (web framework and server)
- SQLAlchemy + SQLite (database ORM and engine)
- Azure Document Intelligence SDK (PDF parsing)
- Pandas (Excel/CSV generation)
- BackgroundTasks (async processing without Celery)

### **Frontend Architecture**
```javascript
// Vue 3 + Vite Application
frontend/
├── src/
│   ├── App.vue            # Single-page root component
│   ├── components/
│   │   ├── FileUpload.vue # Drag-and-drop file upload
│   │   ├── ProgressBar.vue # SSE-powered progress tracking
│   │   ├── ResultsTable.vue # Employee results display
│   │   └── AdminPanel.vue  # Admin-only features
│   ├── composables/
│   │   ├── useFileUpload.js # File handling logic
│   │   ├── useProgress.js   # SSE progress tracking
│   │   └── useAuth.js       # Username and admin check
│   ├── services/
│   │   ├── api.js          # FastAPI integration
│   │   └── sse.js          # Server-Sent Events handling
│   └── styles/
│       └── main.css        # Tailwind CSS customizations
├── dist/                  # Built static files
└── vite.config.js         # Build configuration
```

**Core Dependencies:**
- Vue 3 (reactive framework)
- Vite (build tool and dev server)
- Tailwind CSS (styling framework)

---

## Implementation Timeline

### **Week 1: Backend Foundation**

#### **Day 1-2: Project Setup**
- [ ] Initialize FastAPI project structure
- [ ] Configure SQLite database with SQLAlchemy
- [ ] Set up basic logging and configuration
- [ ] Create Windows authentication endpoint (`/api/auth/current-user`)

#### **Day 3-4: Core Data Models**
- [ ] Design SQLite schema for revision tracking
- [ ] Implement database models:
  - `processing_sessions` table
  - `employee_revisions` table  
  - `processing_logs` table
- [ ] Create database initialization and migration scripts

#### **Day 5: File Handling**
- [ ] Implement local file storage system
- [ ] Create file upload endpoints (`/api/upload`)
- [ ] Add file validation and checksum calculation
- [ ] Set up organized folder structure for PDFs

**Week 1 Deliverables:**
- ✅ Working FastAPI server with Windows auth
- ✅ SQLite database with core schema
- ✅ File upload and storage system
- ✅ Basic logging and error handling

### **Week 2: Document Processing**

#### **Day 6-8: Azure Document Intelligence Integration**
- [ ] Set up Azure Document Intelligence client
- [ ] Implement CAR PDF processing with confidence scoring
- [ ] Implement Receipt PDF processing with validation
- [ ] Add fallback error handling for AI service failures

#### **Day 9-10: Background Processing**
- [ ] Implement FastAPI BackgroundTasks for PDF processing
- [ ] Create processing pipeline:
  - File validation → Document Intelligence → Data extraction → Database storage
- [ ] Add processing status tracking and progress updates
- [ ] Implement delta detection for repeat processing

**Week 2 Deliverables:**
- ✅ AI-powered PDF processing pipeline
- ✅ Background task execution
- ✅ Delta recognition system
- ✅ Processing progress tracking

### **Week 3: Frontend Foundation**

#### **Day 11-13: Vue 3 Setup**
- [ ] Initialize Vite + Vue 3 project
- [ ] Configure Tailwind CSS with custom theme
- [ ] Create main App.vue with progressive sections
- [ ] Set up API service layer with fetch

#### **Day 14-15: Core Components**
- [ ] Build drag-and-drop FileUpload component
- [ ] Create progress tracking with Server-Sent Events
- [ ] Implement authentication state management
- [ ] Add basic routing and section navigation

**Week 3 Deliverables:**
- ✅ Working Vue 3 application with modern styling
- ✅ File upload with drag-and-drop
- ✅ Real-time progress updates via SSE
- ✅ Responsive layout foundation

### **Week 4: Integration & Core Features**

#### **Day 16-18: Frontend-Backend Integration**
- [ ] Connect file upload to FastAPI endpoints
- [ ] Implement processing trigger and status polling
- [ ] Add error handling and user feedback
- [ ] Create delta recognition UI feedback

#### **Day 19-20: Results Display**
- [ ] Build ResultsTable component with employee grouping
- [ ] Implement action-oriented export buttons:
  - "Generate pVault File" (CSV download)
  - "Generate Follow-up List" (Excel download)
- [ ] Add issue resolution interface
- [ ] Create admin panel for system analytics

**Week 4 Deliverables:**
- ✅ Full integration between frontend and backend
- ✅ Complete file processing workflow
- ✅ Results display with export functionality
- ✅ Admin features for system monitoring

### **Week 5: Polish & Advanced Features**

#### **Day 21-23: User Experience Enhancements**
- [ ] Add smooth transitions and loading states
- [ ] Implement optimistic UI updates
- [ ] Enhance error messages and validation feedback
- [ ] Add keyboard navigation and accessibility features

#### **Day 24-25: Data Management**
- [ ] Implement session history and comparison features
- [ ] Add data export with multiple format options
- [ ] Create backup and cleanup procedures
- [ ] Optimize database queries and indexing

**Week 5 Deliverables:**
- ✅ Polished user interface with smooth interactions
- ✅ Complete session management system
- ✅ Optimized performance and data handling
- ✅ Comprehensive error handling and validation

### **Week 6: Testing & Deployment**

#### **Day 26-28: Testing & Validation**
- [ ] Write unit tests for critical backend functions
- [ ] Test file processing with real PDF data
- [ ] Validate delta processing accuracy
- [ ] Perform load testing with expected user volumes

#### **Day 29-30: Deployment & Documentation**
- [ ] Set up production configuration
- [ ] Deploy to INSCOLVSQL VM or dedicated server
- [ ] Create user documentation and training materials
- [ ] Implement backup procedures and monitoring

**Week 6 Deliverables:**
- ✅ Production-ready application
- ✅ Complete testing and validation
- ✅ Deployment on target infrastructure
- ✅ User documentation and training

---

## Architecture Details

### **Database Schema (SQLite)**

```sql
-- Core tables for revision tracking
CREATE TABLE processing_sessions (
    session_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    session_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'processing',
    car_file_path TEXT,
    receipt_file_path TEXT,
    car_file_checksum TEXT,
    receipt_file_checksum TEXT,
    total_employees INTEGER DEFAULT 0,
    completed_employees INTEGER DEFAULT 0,
    parent_session_id TEXT,
    revision_number INTEGER DEFAULT 1
);

CREATE TABLE employee_revisions (
    revision_id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES processing_sessions(session_id),
    employee_name TEXT NOT NULL,
    employee_id TEXT,
    card_number TEXT,
    car_total DECIMAL(15,2) DEFAULT 0.00,
    receipt_total DECIMAL(15,2) DEFAULT 0.00,
    status TEXT DEFAULT 'unfinished',
    validation_flags TEXT, -- JSON string
    issues_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE processing_logs (
    log_id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES processing_sessions(session_id),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT -- JSON string for additional context
);

-- Indexes for performance
CREATE INDEX idx_sessions_username ON processing_sessions(username);
CREATE INDEX idx_sessions_created ON processing_sessions(created_at);
CREATE INDEX idx_revisions_session ON employee_revisions(session_id);
CREATE INDEX idx_revisions_name ON employee_revisions(employee_name);
```

### **API Endpoints**

```python
# Authentication
GET  /api/auth/current-user              # Get Windows username and admin status

# File Management
POST /api/upload                         # Upload CAR and/or Receipt PDFs
GET  /api/files/{session_id}             # List files for session

# Processing
POST /api/process                        # Start background processing
GET  /api/progress/{session_id}          # Server-Sent Events for progress
GET  /api/status/{session_id}            # Get current processing status

# Sessions & History  
GET  /api/sessions                       # List user's sessions
GET  /api/sessions/{session_id}          # Get session details
POST /api/sessions/{session_id}/revision # Create revision from existing session

# Results & Export
GET  /api/results/{session_id}           # Get processing results
GET  /api/export/{session_id}/pvault     # Generate pVault CSV file
GET  /api/export/{session_id}/followup   # Generate follow-up Excel file

# Admin (restricted by username)
GET  /api/admin/analytics                # System usage analytics
GET  /api/admin/sessions                 # All sessions across users
GET  /api/admin/health                   # System health status
```

### **Key Implementation Patterns**

#### **Background Processing with FastAPI**
```python
from fastapi import BackgroundTasks, FastAPI
import asyncio

app = FastAPI()

@app.post("/api/process")
async def start_processing(
    session_id: str,
    background_tasks: BackgroundTasks
):
    # Start processing in background
    background_tasks.add_task(process_pdfs, session_id)
    return {"status": "processing_started", "session_id": session_id}

async def process_pdfs(session_id: str):
    # Update status to processing
    update_session_status(session_id, "processing")
    
    try:
        # Process with Document Intelligence
        car_data = await extract_car_data(session_id)
        receipt_data = await extract_receipt_data(session_id)
        
        # Validate and store results
        results = validate_and_store(car_data, receipt_data)
        
        # Update status to completed
        update_session_status(session_id, "completed")
        
    except Exception as e:
        # Handle errors and update status
        update_session_status(session_id, "failed")
        log_error(session_id, str(e))
```

#### **Server-Sent Events for Progress**
```python
from fastapi.responses import StreamingResponse
import json

@app.get("/api/progress/{session_id}")
async def progress_stream(session_id: str):
    async def generate():
        while True:
            progress = get_processing_progress(session_id)
            yield f"data: {json.dumps(progress)}\n\n"
            
            if progress.get('status') in ['completed', 'failed']:
                break
                
            await asyncio.sleep(1)  # Update every second
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"}
    )
```

#### **Vue 3 Composable for File Upload**
```javascript
import { ref, reactive } from 'vue'

export function useFileUpload() {
  const uploadState = reactive({
    carFile: null,
    receiptFile: null,
    uploading: false,
    error: null
  })

  const uploadFiles = async () => {
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
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Upload failed')
      
      return await response.json()
      
    } catch (error) {
      uploadState.error = error.message
      throw error
    } finally {
      uploadState.uploading = false
    }
  }
  
  return { uploadState, uploadFiles }
}
```

---

## Deployment Strategy

### **Single VM Deployment**

#### **Server Setup (INSCOLVSQL or dedicated VM)**
```bash
# Install Python 3.11 and dependencies
sudo apt update
sudo apt install python3.11 python3.11-pip nginx

# Install Node.js for frontend build
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Create application directory
sudo mkdir -p /opt/credit-card-processor
sudo chown $USER:$USER /opt/credit-card-processor
```

#### **Application Structure**
```
/opt/credit-card-processor/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
├── frontend/
│   ├── dist/              # Built static files
│   └── ...
├── data/
│   ├── database.db        # SQLite database
│   ├── uploads/           # PDF storage
│   └── exports/           # Generated files
├── logs/                  # Application logs
└── config/
    ├── nginx.conf         # Nginx configuration
    └── app.env            # Environment variables
```

#### **Nginx Configuration**
```nginx
server {
    listen 8080;
    server_name _;
    
    # Serve static frontend files
    location / {
        root /opt/credit-card-processor/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header REMOTE_USER $remote_user;
    }
    
    # Server-Sent Events
    location /api/progress/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
}
```

#### **Service Management**
```bash
# Systemd service for FastAPI
sudo tee /etc/systemd/system/credit-card-processor.service << EOF
[Unit]
Description=Credit Card Processor API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/credit-card-processor/backend
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl enable credit-card-processor
sudo systemctl start credit-card-processor
sudo systemctl enable nginx
sudo systemctl start nginx
```

### **Configuration Management**

#### **Environment Variables**
```bash
# /opt/credit-card-processor/config/app.env
DATABASE_URL=sqlite:///data/database.db
UPLOAD_DIR=/opt/credit-card-processor/data/uploads
EXPORT_DIR=/opt/credit-card-processor/data/exports
LOG_LEVEL=INFO
LOG_FILE=/opt/credit-card-processor/logs/app.log

# Azure Document Intelligence
DOC_INTELLIGENCE_ENDPOINT=https://iius-doc-intelligence.cognitiveservices.azure.com/
DOC_INTELLIGENCE_KEY=your-key-here

# Admin usernames (comma-separated)
ADMIN_USERS=rcox,mikeh,tomj
```

---

## Risk Mitigation & Operations

### **Data Backup Strategy**
```bash
# Daily database backup script
#!/bin/bash
BACKUP_DIR="/opt/credit-card-processor/backups"
mkdir -p $BACKUP_DIR

# SQLite backup with date stamp
sqlite3 /opt/credit-card-processor/data/database.db \
  ".backup $BACKUP_DIR/database_$(date +%Y%m%d_%H%M%S).db"

# Keep last 30 days of backups
find $BACKUP_DIR -name "database_*.db" -mtime +30 -delete

# Optional: Copy to network drive
# rsync -av $BACKUP_DIR/ /mnt/network-backup/credit-card-processor/
```

### **Monitoring & Health Checks**
```python
# Health check endpoint
@app.get("/api/health")
async def health_check():
    try:
        # Check database
        db_status = check_database_connection()
        
        # Check file system
        disk_usage = get_disk_usage()
        
        # Check Document Intelligence
        ai_status = await check_document_intelligence()
        
        return {
            "status": "healthy" if all([db_status, ai_status]) else "degraded",
            "database": db_status,
            "document_intelligence": ai_status,
            "disk_usage_percent": disk_usage,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### **Scaling Considerations**

**Current Limits (Single VM):**
- **Concurrent Users**: ~50 simultaneous
- **File Processing**: ~10 parallel jobs
- **Database**: ~1000 transactions/second
- **Storage**: Limited by VM disk size

**Scaling Indicators:**
- Response time > 5 seconds
- CPU usage > 80% sustained
- Memory usage > 90%
- Disk usage > 80%

**Simple Scaling Options:**
1. **Vertical Scaling**: Increase VM resources
2. **Load Balancing**: Add second VM with shared database
3. **Database Replication**: Add read replica for reporting

---

## Success Metrics

### **Technical Metrics**
- **Deployment Time**: 6 weeks from start to production
- **Processing Speed**: <2 minutes for 50-employee reports
- **Parsing Accuracy**: >95% with Document Intelligence
- **Uptime**: >99% during business hours
- **Response Time**: <3 seconds for UI interactions

### **User Experience Metrics**
- **Task Completion**: <5 minutes for standard workflow
- **Error Rate**: <5% for file uploads and processing
- **User Satisfaction**: >4.5/5 in post-implementation survey
- **Adoption Rate**: >90% of users complete first session successfully

### **Business Impact**
- **Time Savings**: 70% reduction vs manual processing
- **Error Reduction**: 85% fewer manual data entry errors
- **Compliance**: 100% audit trail for all processing decisions
- **Cost Savings**: Eliminate desktop deployment and maintenance overhead

---

## Conclusion

This simplified implementation plan provides a practical path to a modern, efficient credit card processing system. By leveraging proven technologies in a simplified architecture, the project delivers significant value while minimizing complexity and maintenance overhead.

The 6-week timeline is achievable with focused development, and the resulting system will be reliable, maintainable, and capable of handling the expected workload for years to come.

**Next Steps:**
1. Provision VM and development environment
2. Set up Azure Document Intelligence service
3. Begin Week 1 implementation tasks
4. Schedule weekly progress reviews
5. Plan user training and rollout strategy

---

**Document Version**: 1.0  
**Date**: August 28, 2025  
**Status**: Ready for Implementation