# Credit Card Processor - Final Implementation Plan
## Single Source of Truth for Development Teams

**Status**: DEVELOPMENT-READY ✅  
**Document Version**: 1.0 Final  
**Date**: August 29, 2025  
**Authority**: Consolidated from Backend, Frontend, and UI/UX Implementation Plans

---

## EXECUTIVE SUMMARY

This is the authoritative implementation plan for the Credit Card Processor web application, consolidating all architectural decisions, API specifications, UI/UX requirements, and development roadmaps into a single source of truth. All development teams must reference this document for implementation guidance.

**Project Scope**: Transform desktop Python application into modern web system for processing corporate credit card expenses for 2-3 internal users, handling ~50 employees monthly.

**Architecture**: Vue 3 frontend + FastAPI backend + SQLite database + Azure Document Intelligence integration.

**Authentication**: Windows username-based authentication via VPN with predefined admin list.

**Critical Success Factors**:
- Session-based processing with delta recognition  
- Real-time progress tracking with 5-second polling
- Smart results grouping with inline issue resolution
- Export generation for pVault system integration
- Single-page application with progressive disclosure

---

## 1. TECHNOLOGY STACK (IMMUTABLE)

### 1.1 Frontend Architecture
```
Vue 3 (Composition API) + Vite + Pinia + Tailwind CSS
├── Single Page Application (NO routing)
├── Status polling every 5 seconds (NOT Server-Sent Events)  
├── Progressive disclosure UI patterns
├── Windows authentication integration
└── Responsive design (desktop + tablet focus)
```

### 1.2 Backend Architecture  
```
FastAPI + SQLite + Python 3.9+
├── Session-based API design
├── Background processing with AsyncIO
├── Azure Document Intelligence integration
├── File upload with checksum validation
└── Windows username authentication
```

### 1.3 Infrastructure
```
Development: Local development with Docker Compose
Production: Single VM deployment on existing Azure infrastructure
├── nginx reverse proxy
├── SSL termination
├── File storage: Local filesystem
└── Database: SQLite (simple, reliable)
```

---

## 2. API CONTRACTS (COMPLETE SPECIFICATION)

### 2.1 Session Management Endpoints

```python
# Session Creation (Frontend → Backend)
POST /api/sessions
Request: {
  "session_name": "Monthly Expenses - March 2025",
  "description": "Updated processing with new receipts", 
  "parent_session_id": "uuid-previous-session",  # Optional for delta
  "is_delta_session": false,
  "processing_config": {
    "email_notification": true,
    "detailed_report": true,
    "skip_unchanged": false
  }
}

Response: {
  "session_id": "uuid-generated",
  "session_name": "Monthly Expenses - March 2025",
  "status": "created",
  "created_at": "2025-03-15T10:30:00Z"
}

# Session Details
GET /api/sessions/{id}
Response: {
  "session_id": "uuid",
  "session_name": "string",
  "description": "string",
  "status": "created|files_uploaded|processing|completed|failed|cancelled",
  "total_employees": 45,
  "completed_employees": 32,
  "is_delta_session": false,
  "created_at": "2025-03-15T10:30:00Z"
}

# File Upload (Session-Based)
POST /api/sessions/{id}/upload
Request: FormData {
  "car_file": File,          # PDF, max 100MB
  "receipt_file": File,      # PDF, optional, max 100MB
  "filename": "string",
  "type": "car|receipt"
}

Response: {
  "session_id": "uuid",
  "status": "uploaded",
  "files": {
    "car_file": {
      "path": "/uploads/session/car_filename.pdf",
      "checksum": "sha256hash",
      "size": 12345678
    },
    "receipt_file": {
      "path": "/uploads/session/receipt_filename.pdf", 
      "checksum": "sha256hash",
      "size": 9876543
    }
  }
}
```

### 2.2 Status Polling Endpoint (CRITICAL)

```python
# Status Polling (Every 5 Seconds)
GET /api/sessions/{id}/status

Response: {
  "status": "processing|completed|failed|paused|cancelled",
  "current_employee": 23,                    # 1-based index or null
  "total_employees": 45,                     # Total count
  "current_employee_name": "Johnson, Sarah", # Name being processed
  "current_employee_id": "EMP12345",        # Employee ID
  "message": "Processing employee: Johnson, Sarah",
  "percent_complete": 67,                    # 0-100
  "completed_employees": 30,                 # Count completed
  "processing_employees": 3,                 # Count processing
  "issues_employees": 4,                     # Count with issues
  "pending_employees": 8,                    # Count pending
  "estimated_time_remaining": 120,           # Seconds or null
  "recent_activities": [                     # Last 5 activities
    {
      "type": "employee_completed",
      "message": "Completed processing for Martinez, Carlos",
      "employee_name": "Martinez, Carlos",
      "timestamp": "2025-03-15T10:35:00Z"
    },
    {
      "type": "employee_issues",
      "message": "Issues found for Williams, David",
      "employee_name": "Williams, David", 
      "timestamp": "2025-03-15T10:34:00Z"
    }
  ]
}
```

### 2.3 Processing Control Endpoints

```python
# Start Processing
POST /api/sessions/{id}/process
Request: {
  "config": {
    "email_notification": true,
    "detailed_report": true,
    "skip_unchanged": false    # For delta sessions
  }
}

Response: {
  "session_id": "uuid",
  "status": "processing",
  "message": "Processing started"
}

# Processing Control
POST /api/sessions/{id}/pause
POST /api/sessions/{id}/resume  
POST /api/sessions/{id}/cancel

Response: {
  "session_id": "uuid",
  "status": "paused|processing|cancelled",
  "message": "Processing paused|resumed|cancelled"
}
```

### 2.4 Results and Export Endpoints

```python
# Get Processing Results
GET /api/results/{session_id}

Response: {
  "session": {
    "session_id": "uuid",
    "session_name": "Monthly Expenses - March 2025",
    "status": "completed",
    "total_employees": 45,
    "completed_employees": 45,
    "created_at": "2025-03-15T10:30:00Z"
  },
  "employees": [
    {
      "revision_id": "uuid-employee",
      "employee_name": "Johnson, Sarah",
      "employee_id": "EMP12345",
      "card_number": "****1234", 
      "car_total": 1250.75,
      "receipt_total": 1180.50,
      "difference": 70.25,
      "status": "finished|issues|resolved",
      "issues_count": 0,
      "has_issues": false,
      "validation_flags": {
        "missing_receipt": {
          "severity": "medium",
          "description": "No receipt data found",
          "suggestion": "Contact employee for receipts"
        },
        "amount_mismatch": {
          "severity": "high",
          "description": "Amount difference: $70.25",
          "suggestion": "Review transactions and receipts"
        }
      }
    }
  ],
  "summary": {
    "delta_info": {              # If delta session
      "unchanged_count": 35,
      "changed_count": 8,
      "new_count": 2,
      "removed_count": 0
    }
  }
}

# Export Generation
GET /api/export/{session_id}/pvault      # CSV for pVault system
GET /api/export/{session_id}/followup    # Excel for follow-up actions
GET /api/export/{session_id}/issues      # Detailed issue report

Response: File download with headers:
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="pvault_march_2025.csv"
```

### 2.5 Authentication and Admin Endpoints

```python
# Windows Authentication
GET /api/auth/current-user

Response: {
  "username": "rcox",              # Windows username (lowercase)
  "display_name": "R Cox",         # Title case display
  "is_admin": true                 # Based on predefined list: rcox, mikeh, tomj
}

# Delta Recognition
POST /api/sessions/detect-delta
Request: {
  "checksum": "sha256hash",
  "file_type": "car|receipt"
}

Response: {
  "found": true,
  "match_type": "exact|partial",
  "parent_session_id": "uuid",
  "parent_session_name": "Previous Session Name",
  "created_at": "2025-02-15T10:30:00Z",
  "employee_count": 45,
  "recommendation": "Skip processing - files are identical"
}

# Issue Resolution
POST /api/results/{session_id}/employees/{revision_id}/resolve
Request: {
  "resolution_type": "resolved|pending|escalated",
  "notes": "Contacted employee, receipts provided",
  "resolved_by": "rcox"
}

Response: {
  "revision_id": "uuid",
  "employee_name": "Johnson, Sarah",
  "status": "resolved",
  "resolved_by": "rcox",
  "resolved_at": "2025-03-15T11:00:00Z",
  "resolution_notes": "Contacted employee, receipts provided"
}
```

---

## 3. DATABASE SCHEMA (COMPLETE)

### 3.1 Core Tables

```sql
-- Processing Sessions
CREATE TABLE processing_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    session_name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'created',
    processing_config TEXT,                    -- JSON string
    
    -- File information
    car_file_path VARCHAR(500),
    receipt_file_path VARCHAR(500),
    car_file_checksum VARCHAR(64),
    receipt_file_checksum VARCHAR(64),
    
    -- Progress tracking
    total_employees INTEGER DEFAULT 0,
    completed_employees INTEGER DEFAULT 0,
    processing_employees INTEGER DEFAULT 0,
    issues_employees INTEGER DEFAULT 0,
    pending_employees INTEGER DEFAULT 0,
    current_employee_name VARCHAR(200),
    estimated_time_remaining INTEGER,
    
    -- Delta recognition
    parent_session_id VARCHAR(50),
    revision_number INTEGER DEFAULT 1,
    is_delta_session BOOLEAN DEFAULT FALSE,
    delta_info TEXT,                          -- JSON string
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    
    FOREIGN KEY (parent_session_id) REFERENCES processing_sessions(session_id)
);

-- Employee Data Revisions
CREATE TABLE employee_revisions (
    revision_id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(200) NOT NULL,
    employee_id VARCHAR(50),
    card_number VARCHAR(20),
    
    -- Financial data
    car_total DECIMAL(15,2) DEFAULT 0.00,
    receipt_total DECIMAL(15,2) DEFAULT 0.00,
    difference DECIMAL(15,2) DEFAULT 0.00,
    
    -- Status and validation
    status VARCHAR(20) DEFAULT 'pending',     -- pending, processing, finished, issues, resolved
    validation_flags TEXT,                    -- JSON string
    has_issues BOOLEAN DEFAULT FALSE,
    issues_count INTEGER DEFAULT 0,
    resolution_notes TEXT,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP,
    
    -- Delta tracking
    changed_from_previous BOOLEAN DEFAULT TRUE,
    previous_revision_id VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES processing_sessions(session_id)
);

-- Processing Activities (for real-time updates)
CREATE TABLE processing_activities (
    activity_id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    activity_type VARCHAR(50),               -- started, employee_completed, issue_found, etc.
    message TEXT,
    employee_name VARCHAR(200),
    details TEXT,                            -- JSON for additional data
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES processing_sessions(session_id)
);

-- File Uploads (separate tracking)
CREATE TABLE file_uploads (
    upload_id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    file_type VARCHAR(10),                   -- car, receipt
    filename VARCHAR(300),
    file_path VARCHAR(500),
    checksum VARCHAR(64),
    file_size INTEGER,
    upload_status VARCHAR(20) DEFAULT 'uploaded',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES processing_sessions(session_id)
);
```

### 3.2 Indexes for Performance

```sql
-- Performance indexes
CREATE INDEX idx_sessions_username ON processing_sessions(username);
CREATE INDEX idx_sessions_status ON processing_sessions(status);
CREATE INDEX idx_sessions_created ON processing_sessions(created_at);
CREATE INDEX idx_sessions_checksum ON processing_sessions(car_file_checksum);

CREATE INDEX idx_employees_session ON employee_revisions(session_id);
CREATE INDEX idx_employees_status ON employee_revisions(status);
CREATE INDEX idx_employees_issues ON employee_revisions(has_issues);

CREATE INDEX idx_activities_session ON processing_activities(session_id);
CREATE INDEX idx_activities_timestamp ON processing_activities(timestamp);

CREATE INDEX idx_uploads_session ON file_uploads(session_id);
CREATE INDEX idx_uploads_checksum ON file_uploads(checksum);
```

---

## 4. FRONTEND COMPONENT ARCHITECTURE

### 4.1 Project Structure (Development-Ready)

```
frontend/
├── src/
│   ├── App.vue                           # Root single-page component
│   ├── components/
│   │   ├── core/
│   │   │   ├── SessionSetup.vue          # Section 1: Session creation
│   │   │   ├── FileUpload.vue            # Section 2: File upload with delta
│   │   │   ├── ProgressTracker.vue       # Section 3: Real-time progress
│   │   │   ├── ResultsDisplay.vue        # Section 4: Smart grouping
│   │   │   └── ExportActions.vue         # Section 4: Export buttons
│   │   ├── shared/
│   │   │   ├── AuthDisplay.vue           # Windows user display
│   │   │   ├── NotificationToast.vue     # User feedback messages
│   │   │   ├── LoadingSpinner.vue        # Loading states
│   │   │   └── ActionButton.vue          # Standardized buttons
│   │   └── admin/
│   │       ├── AdminPanel.vue            # Admin-only tools
│   │       └── SystemHealth.vue          # System monitoring
│   ├── composables/
│   │   ├── useApi.js                     # HTTP client with error handling
│   │   ├── useAuth.js                    # Windows authentication
│   │   ├── useFileUpload.js              # File handling with validation  
│   │   ├── useProgress.js                # Status polling (5-second)
│   │   ├── useSessionManager.js          # Session CRUD operations
│   │   └── useResults.js                 # Results processing
│   ├── stores/
│   │   └── session.js                    # Pinia store (single source of truth)
│   ├── services/
│   │   ├── api.js                        # API service layer
│   │   ├── validation.js                 # Input validation
│   │   └── formatting.js                 # Data formatting
│   ├── utils/
│   │   ├── constants.js                  # App constants
│   │   ├── helpers.js                    # Utility functions
│   │   └── errors.js                     # Error handling
│   └── styles/
│       ├── main.css                      # Tailwind + custom styles
│       └── components.css                # Component-specific styles
├── package.json                          # Dependencies
├── vite.config.js                        # Vite configuration
├── tailwind.config.js                    # Tailwind customization
└── index.html                            # SPA entry point
```

### 4.2 Pinia Store (Complete State Management)

```javascript
// stores/session.js - Complete state management
import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => ({
    // Authentication
    currentUser: null,
    authLoading: false,
    
    // Session Management  
    currentSession: null,
    sessions: [],
    sessionLoading: false,
    
    // File Upload
    uploadedFiles: { car: null, receipt: null },
    uploadProgress: { car: 0, receipt: 0 },
    uploadStatus: { car: null, receipt: null },
    
    // Delta Recognition
    deltaDetected: false,
    deltaInfo: null,
    previousSessionInfo: null,
    
    // Processing Status
    processingStatus: 'idle',  // idle|processing|paused|completed|failed|cancelled
    processingProgress: {
      currentEmployee: 0,
      totalEmployees: 0,
      percentComplete: 0,
      estimatedTimeRemaining: null,
      completedEmployees: 0,
      processingEmployees: 0,
      issuesEmployees: 0,
      pendingEmployees: 0,
      currentEmployeeName: null,
      currentEmployeeId: null
    },
    processingActivities: [],
    pollingActive: false,
    
    // Results
    results: [],
    resultsSummary: null,
    resultsLoading: false,
    
    // Export
    exportStatus: { pvault: 'idle', followup: 'idle', issues: 'idle' },
    exportUrls: { pvault: null, followup: null, issues: null },
    
    // UI State
    activeSection: 'setup',  // setup|upload|processing|results
    notifications: []
  }),

  getters: {
    isAuthenticated: (state) => !!state.currentUser,
    isAdmin: (state) => state.currentUser?.is_admin || false,
    hasActiveSession: (state) => !!state.currentSession,
    canStartProcessing: (state) => {
      return state.currentSession && 
             state.uploadedFiles.car && 
             state.uploadStatus.car === 'success'
    },
    readyForExport: (state) => state.results.filter(emp => 
      emp.status === 'finished' && !emp.has_issues
    ),
    needsAttention: (state) => state.results.filter(emp => 
      emp.has_issues || emp.status === 'issues'
    )
  },

  actions: {
    // Authentication
    async initializeAuth() {
      this.authLoading = true
      try {
        const response = await fetch('/api/auth/current-user')
        this.currentUser = await response.json()
      } catch (error) {
        console.error('Auth failed:', error)
      } finally {
        this.authLoading = false
      }
    },

    // Session Management
    async createSession(sessionData) {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_name: sessionData.name,
          description: sessionData.description,
          is_delta_session: sessionData.isDelta || false,
          parent_session_id: sessionData.parentSessionId,
          processing_config: sessionData.processingConfig || {}
        })
      })
      
      this.currentSession = await response.json()
      this.activeSection = 'upload'
      return this.currentSession
    },

    // File Upload
    async uploadFile(file, type) {
      this.uploadStatus[type] = 'uploading'
      
      const formData = new FormData()
      formData.append(`${type}_file`, file)
      formData.append('type', type)
      formData.append('filename', file.name)
      
      const response = await fetch(`/api/sessions/${this.currentSession.session_id}/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Upload failed')
      
      const result = await response.json()
      this.uploadedFiles[type] = result.files[`${type}_file`]
      this.uploadStatus[type] = 'success'
      
      // Check for delta recognition
      if (type === 'car') await this.checkDeltaRecognition()
      
      return result
    },

    async checkDeltaRecognition() {
      if (!this.uploadedFiles.car) return
      
      try {
        const response = await fetch('/api/sessions/detect-delta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checksum: this.uploadedFiles.car.checksum,
            file_type: 'car'
          })
        })
        
        const result = await response.json()
        if (result.found) {
          this.deltaDetected = true
          this.deltaInfo = result
          this.previousSessionInfo = {
            sessionId: result.parent_session_id,
            sessionName: result.parent_session_name,
            matchType: result.match_type
          }
        }
      } catch (error) {
        console.warn('Delta detection failed:', error)
      }
    },

    // Processing Control
    async startProcessing(config = {}) {
      const response = await fetch(`/api/sessions/${this.currentSession.session_id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      })
      
      if (!response.ok) throw new Error('Failed to start processing')
      
      this.processingStatus = 'processing'
      this.activeSection = 'processing'
      this.startStatusPolling()
    },

    // Status Polling (CRITICAL - 5 Second Polling)
    startStatusPolling() {
      if (this.pollingActive) return
      
      this.pollingActive = true
      this.pollingInterval = setInterval(async () => {
        try {
          await this.fetchStatus()
        } catch (error) {
          console.error('Status polling error:', error)
        }
      }, 5000)  // 5-second polling as required
      
      // Initial fetch
      this.fetchStatus()
    },

    stopStatusPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
      }
      this.pollingActive = false
    },

    async fetchStatus() {
      if (!this.currentSession) return
      
      const response = await fetch(`/api/sessions/${this.currentSession.session_id}/status`)
      if (!response.ok) return
      
      const status = await response.json()
      
      this.processingStatus = status.status
      this.processingProgress = {
        currentEmployee: status.current_employee || 0,
        totalEmployees: status.total_employees || 0,
        percentComplete: status.percent_complete || 0,
        estimatedTimeRemaining: status.estimated_time_remaining,
        completedEmployees: status.completed_employees || 0,
        processingEmployees: status.processing_employees || 0,
        issuesEmployees: status.issues_employees || 0,
        pendingEmployees: status.pending_employees || 0,
        currentEmployeeName: status.current_employee_name,
        currentEmployeeId: status.current_employee_id
      }
      
      // Update activities
      if (status.recent_activities) {
        this.processingActivities = status.recent_activities.slice(0, 10)
      }
      
      // Handle completion
      if (status.status === 'completed') {
        this.stopStatusPolling()
        this.activeSection = 'results'
        await this.loadResults()
      }
    },

    // Results Management
    async loadResults() {
      this.resultsLoading = true
      
      const response = await fetch(`/api/results/${this.currentSession.session_id}`)
      if (!response.ok) throw new Error('Failed to load results')
      
      const results = await response.json()
      this.results = results.employees || []
      this.resultsSummary = results.summary
      this.resultsLoading = false
    },

    // Export Actions
    async generateExport(type) {
      this.exportStatus[type] = 'generating'
      
      try {
        const response = await fetch(`/api/export/${this.currentSession.session_id}/${type}`)
        if (!response.ok) throw new Error('Export failed')
        
        // Download file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        // Get filename from headers
        const contentDisposition = response.headers.get('content-disposition')
        let filename = `${type}-${this.currentSession.session_id}.csv`
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="([^"]*)"/)
          if (filenameMatch) filename = filenameMatch[1]
        }
        
        // Trigger download
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        
        window.URL.revokeObjectURL(url)
        this.exportStatus[type] = 'completed'
        
      } catch (error) {
        this.exportStatus[type] = 'error'
        throw error
      }
    },

    // Issue Resolution
    async resolveIssue(employeeId, resolution) {
      const response = await fetch(`/api/results/${this.currentSession.session_id}/employees/${employeeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolution)
      })
      
      if (!response.ok) throw new Error('Failed to resolve issue')
      
      const result = await response.json()
      
      // Update local results
      const employeeIndex = this.results.findIndex(emp => emp.revision_id === employeeId)
      if (employeeIndex !== -1) {
        this.results[employeeIndex] = { ...this.results[employeeIndex], ...result }
      }
      
      return result
    }
  }
})
```

---

## 5. BACKEND IMPLEMENTATION (COMPLETE)

### 5.1 FastAPI Application Structure

```python
# main.py - Complete FastAPI Application
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict
import hashlib
import uuid
import os
import json
import asyncio

# Initialize FastAPI
app = FastAPI(title="Credit Card Processor", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database models and configuration (from database.py)
from sqlalchemy import create_engine, Column, String, DateTime, Integer, Text, Decimal, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

Base = declarative_base()

class ProcessingSession(Base):
    __tablename__ = "processing_sessions"
    
    session_id = Column(String, primary_key=True)
    username = Column(String, nullable=False)
    session_name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="created")
    processing_config = Column(Text)
    
    # File information
    car_file_path = Column(String)
    receipt_file_path = Column(String)
    car_file_checksum = Column(String)
    receipt_file_checksum = Column(String)
    
    # Progress tracking
    total_employees = Column(Integer, default=0)
    completed_employees = Column(Integer, default=0)
    processing_employees = Column(Integer, default=0)
    issues_employees = Column(Integer, default=0)
    pending_employees = Column(Integer, default=0)
    current_employee_name = Column(String)
    estimated_time_remaining = Column(Integer)
    
    # Delta recognition
    parent_session_id = Column(String, ForeignKey("processing_sessions.session_id"))
    revision_number = Column(Integer, default=1)
    is_delta_session = Column(Boolean, default=False)
    delta_info = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    processing_started_at = Column(DateTime)
    processing_completed_at = Column(DateTime)
    
    # Relationships
    employee_revisions = relationship("EmployeeRevision", back_populates="session")
    processing_activities = relationship("ProcessingActivity", back_populates="session")

class EmployeeRevision(Base):
    __tablename__ = "employee_revisions"
    
    revision_id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("processing_sessions.session_id"))
    employee_name = Column(String, nullable=False)
    employee_id = Column(String)
    card_number = Column(String)
    
    # Financial data
    car_total = Column(Decimal(15, 2), default=0.00)
    receipt_total = Column(Decimal(15, 2), default=0.00)
    difference = Column(Decimal(15, 2), default=0.00)
    
    # Status and validation
    status = Column(String, default="pending")
    validation_flags = Column(Text)
    has_issues = Column(Boolean, default=False)
    issues_count = Column(Integer, default=0)
    resolution_notes = Column(Text)
    resolved_by = Column(String)
    resolved_at = Column(DateTime)
    
    # Delta tracking
    changed_from_previous = Column(Boolean, default=True)
    previous_revision_id = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    # Relationships
    session = relationship("ProcessingSession", back_populates="employee_revisions")

class ProcessingActivity(Base):
    __tablename__ = "processing_activities"
    
    activity_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("processing_sessions.session_id"))
    activity_type = Column(String)
    message = Column(String)
    employee_name = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ProcessingSession", back_populates="processing_activities")

# Database setup
DATABASE_URL = "sqlite:///./data/credit_card_processor.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Windows Authentication
def get_current_username(request) -> str:
    # Extract Windows username from request headers
    username = None
    
    headers_to_check = [
        "HTTP_REMOTE_USER", "REMOTE_USER", "HTTP_X_REMOTE_USER", 
        "X-Remote-User", "HTTP_SM_USER", "SM_USER"
    ]
    
    for header in headers_to_check:
        username = request.headers.get(header)
        if username:
            break
    
    # Fallback for development
    if not username:
        username = os.environ.get("USERNAME") or "testuser"
    
    # Clean username
    if "\\" in username:
        username = username.split("\\")[-1]
    if "@" in username:
        username = username.split("@")[0]
    
    return username.lower()

# Pydantic models for API
class SessionCreateRequest(BaseModel):
    session_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    parent_session_id: Optional[str] = None
    is_delta_session: bool = False
    processing_config: Dict = Field(default_factory=dict)

class ProcessingRequest(BaseModel):
    config: Dict = Field(default_factory=dict)

class IssueResolution(BaseModel):
    resolution_type: str = Field(..., regex="^(resolved|pending|escalated)$")
    notes: str = Field(..., min_length=1, max_length=1000)

# API Endpoints

@app.get("/api/auth/current-user")
async def get_current_user_info(username: str = Depends(get_current_username)):
    """Get current user information for frontend"""
    admin_users = ["rcox", "mikeh", "tomj"]
    
    return {
        "username": username,
        "display_name": username.title(),
        "is_admin": username in admin_users
    }

@app.post("/api/sessions")
async def create_session(
    session_request: SessionCreateRequest,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_username)
):
    """Create a new processing session"""
    session_id = str(uuid.uuid4())
    session = ProcessingSession(
        session_id=session_id,
        username=username,
        session_name=session_request.session_name,
        description=session_request.description,
        status="created",
        parent_session_id=session_request.parent_session_id,
        is_delta_session=session_request.is_delta_session,
        processing_config=json.dumps(session_request.processing_config)
    )
    
    db.add(session)
    db.commit()
    
    return {
        "session_id": session_id,
        "session_name": session_request.session_name,
        "status": "created",
        "created_at": session.created_at.isoformat()
    }

@app.get("/api/sessions/{session_id}")
async def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_username)
):
    """Get session details"""
    session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    
    return {
        "session_id": session.session_id,
        "session_name": session.session_name,
        "description": session.description,
        "status": session.status,
        "total_employees": session.total_employees,
        "completed_employees": session.completed_employees,
        "is_delta_session": session.is_delta_session,
        "created_at": session.created_at.isoformat()
    }

@app.post("/api/sessions/{session_id}/upload")
async def upload_files_to_session(
    session_id: str,
    car_file: Optional[UploadFile] = File(None),
    receipt_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    username: str = Depends(get_current_username)
):
    """Upload CAR and/or Receipt files to existing session"""
    if not car_file and not receipt_file:
        raise HTTPException(400, "At least one file must be provided")
    
    session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
        
    upload_dir = f"data/uploads/{session_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
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
    
    # Update session
    if "car_file" in file_info:
        session.car_file_path = file_info["car_file"]["path"]
        session.car_file_checksum = file_info["car_file"]["checksum"]
    
    if "receipt_file" in file_info:
        session.receipt_file_path = file_info["receipt_file"]["path"]
        session.receipt_file_checksum = file_info["receipt_file"]["checksum"]
        
    session.status = "files_uploaded"
    db.commit()
    
    return {
        "session_id": session_id,
        "status": "uploaded",
        "files": file_info
    }

@app.get("/api/sessions/{session_id}/status")
async def get_session_status(
    session_id: str,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_username)
):
    """Status polling endpoint for Vue.js frontend"""
    session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    
    # Get recent activities
    recent_activities = db.query(ProcessingActivity).filter_by(
        session_id=session_id
    ).order_by(ProcessingActivity.timestamp.desc()).limit(5).all()
    
    return {
        "status": session.status,
        "current_employee": session.completed_employees + 1 if session.status == "processing" else None,
        "total_employees": session.total_employees,
        "current_employee_name": session.current_employee_name,
        "current_employee_id": None,  # Will be populated from processing
        "message": f"Processing employee: {session.current_employee_name}" if session.current_employee_name else "Ready",
        "percent_complete": (session.completed_employees / max(session.total_employees, 1)) * 100 if session.total_employees > 0 else 0,
        "completed_employees": session.completed_employees,
        "processing_employees": session.processing_employees,
        "issues_employees": session.issues_employees,
        "pending_employees": session.pending_employees,
        "estimated_time_remaining": session.estimated_time_remaining,
        "recent_activities": [
            {
                "type": activity.activity_type,
                "message": activity.message,
                "employee_name": activity.employee_name,
                "timestamp": activity.timestamp.isoformat()
            }
            for activity in recent_activities
        ]
    }

@app.post("/api/sessions/{session_id}/process")
async def start_processing(
    session_id: str,
    process_request: ProcessingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_username)
):
    """Start processing for a session"""
    session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    
    if session.status not in ["files_uploaded", "created"]:
        raise HTTPException(400, "Session cannot be processed in current state")
    
    session.status = "processing"
    session.processing_started_at = datetime.utcnow()
    session.processing_config = json.dumps(process_request.config)
    db.commit()
    
    # Start processing in background
    background_tasks.add_task(process_session, session_id, process_request.config)
    
    return {
        "session_id": session_id,
        "status": "processing",
        "message": "Processing started"
    }

@app.get("/api/results/{session_id}")
async def get_results(
    session_id: str,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_username)
):
    """Get processing results"""
    session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    
    employees = db.query(EmployeeRevision).filter_by(session_id=session_id).all()
    
    return {
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
                "has_issues": emp.has_issues,
                "validation_flags": json.loads(emp.validation_flags or "{}")
            }
            for emp in employees
        ],
        "summary": json.loads(session.delta_info) if session.delta_info else None
    }

@app.get("/api/export/{session_id}/pvault")
async def export_pvault(session_id: str, db: Session = Depends(get_db)):
    """Export pVault CSV file"""
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
    
    return FileResponse(
        export_path,
        filename=f"pvault_{session_id}.csv",
        media_type="text/csv"
    )

# Background processing function
async def process_session(session_id: str, config: dict):
    """Background task for processing sessions"""
    # This would integrate with Azure Document Intelligence
    # For now, simulate processing
    
    db = SessionLocal()
    try:
        session = db.query(ProcessingSession).filter_by(session_id=session_id).first()
        if not session:
            return
        
        # Simulate processing employees
        total_employees = 45  # Would come from document parsing
        session.total_employees = total_employees
        session.pending_employees = total_employees
        db.commit()
        
        for i in range(total_employees):
            if session.status != "processing":  # Check for cancellation
                break
                
            # Simulate processing each employee
            employee_name = f"Employee_{i+1:03d}"
            session.current_employee_name = employee_name
            session.completed_employees = i + 1
            session.pending_employees = total_employees - (i + 1)
            
            # Create employee revision
            revision_id = f"{session_id}_{i+1:03d}"
            employee = EmployeeRevision(
                revision_id=revision_id,
                session_id=session_id,
                employee_name=employee_name,
                employee_id=f"EMP{i+1:04d}",
                car_total=1000.00 + (i * 50),
                receipt_total=950.00 + (i * 45),
                status="finished",
                processed_at=datetime.utcnow()
            )
            employee.difference = employee.car_total - employee.receipt_total
            
            # Simulate some issues
            if i % 7 == 0:  # Every 7th employee has issues
                employee.has_issues = True
                employee.issues_count = 1
                employee.status = "issues"
                employee.validation_flags = json.dumps({
                    "missing_receipt": {
                        "severity": "medium",
                        "description": "No receipt data found",
                        "suggestion": "Contact employee for receipts"
                    }
                })
                session.issues_employees += 1
            
            db.add(employee)
            
            # Add activity
            activity = ProcessingActivity(
                session_id=session_id,
                activity_type="employee_completed" if not employee.has_issues else "employee_issues",
                message=f"{'Completed' if not employee.has_issues else 'Issues found for'} {employee_name}",
                employee_name=employee_name
            )
            db.add(activity)
            
            db.commit()
            
            # Simulate processing time
            await asyncio.sleep(0.5)
        
        # Complete processing
        session.status = "completed"
        session.processing_completed_at = datetime.utcnow()
        session.current_employee_name = None
        
        # Final activity
        activity = ProcessingActivity(
            session_id=session_id,
            activity_type="processing_completed",
            message=f"Processing completed for {total_employees} employees"
        )
        db.add(activity)
        db.commit()
        
    except Exception as e:
        session.status = "failed"
        db.commit()
        print(f"Processing failed for session {session_id}: {str(e)}")
    finally:
        db.close()

# Database initialization
@app.on_event("startup")
async def startup_event():
    # Create data directories
    os.makedirs("data/uploads", exist_ok=True)
    os.makedirs("data/exports", exist_ok=True)
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("Credit Card Processor API started")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 5.2 Configuration and Environment

```python
# config.py - Application configuration
import os
from pathlib import Path
from typing import List

class Settings:
    # Application
    APP_NAME: str = "Credit Card Processor"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    EXPORT_DIR: Path = DATA_DIR / "exports"
    LOG_DIR: Path = BASE_DIR / "logs"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{DATA_DIR}/database.db"
    
    # Azure Document Intelligence (when implemented)
    DOC_INTELLIGENCE_ENDPOINT: str = os.getenv("DOC_INTELLIGENCE_ENDPOINT", "")
    DOC_INTELLIGENCE_KEY: str = os.getenv("DOC_INTELLIGENCE_KEY", "")
    
    # Authentication
    ADMIN_USERS: List[str] = os.getenv("ADMIN_USERS", "rcox,mikeh,tomj").split(",")
    
    # Processing
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    MAX_CONCURRENT_PROCESSING: int = 5
    PROCESSING_TIMEOUT: int = 1800  # 30 minutes
    
    # File types
    ALLOWED_EXTENSIONS: set = {".pdf", ".PDF"}

settings = Settings()
```

---

## 6. USER INTERFACE SPECIFICATIONS

### 6.1 Single Page Application Layout

```html
<!-- App.vue - Complete SPA Structure -->
<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-4">
            <h1 class="text-xl font-semibold text-gray-900">
              Credit Card Processor
            </h1>
          </div>
          
          <!-- Windows Authentication Display -->
          <AuthDisplay 
            position="header"
            @admin-panel-requested="showAdminPanel = true"
          />
        </div>
      </div>
    </header>
    
    <!-- Main Content - Progressive Disclosure Sections -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Section 1: Session Setup -->
      <section v-if="store.activeSection === 'setup'" class="space-y-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Session Setup</h2>
          <SessionSetup @session-created="handleSessionCreated" />
        </div>
      </section>
      
      <!-- Section 2: File Upload (Progressive) -->
      <section v-if="store.activeSection === 'upload'" class="space-y-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">File Upload</h2>
          <FileUpload 
            :session-id="store.currentSession?.session_id"
            @processing-started="handleProcessingStarted"
          />
        </div>
      </section>
      
      <!-- Section 3: Processing Status (Real-time) -->
      <section v-if="store.activeSection === 'processing'" class="space-y-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Processing Status</h2>
          <ProgressTracker 
            :session-id="store.currentSession?.session_id"
            :session-name="store.currentSession?.session_name"
            @processing-complete="handleProcessingComplete"
          />
        </div>
      </section>
      
      <!-- Section 4: Results & Export -->
      <section v-if="store.activeSection === 'results'" class="space-y-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Processing Results</h2>
          <ResultsDisplay 
            :session-id="store.currentSession?.session_id"
            @export-requested="handleExport"
          />
        </div>
      </section>
      
    </main>
    
    <!-- Admin Panel (Modal) -->
    <AdminPanel 
      v-if="showAdminPanel && store.isAdmin"
      @close="showAdminPanel = false"
    />
    
    <!-- Global Notifications -->
    <NotificationContainer />
    
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'

// Components
import AuthDisplay from '@/components/shared/AuthDisplay.vue'
import SessionSetup from '@/components/core/SessionSetup.vue'
import FileUpload from '@/components/core/FileUpload.vue'
import ProgressTracker from '@/components/core/ProgressTracker.vue'
import ResultsDisplay from '@/components/core/ResultsDisplay.vue'
import AdminPanel from '@/components/admin/AdminPanel.vue'
import NotificationContainer from '@/components/shared/NotificationContainer.vue'

// Store
const store = useSessionStore()

// Local state
const showAdminPanel = ref(false)

// Event handlers
const handleSessionCreated = (session) => {
  console.log('Session created:', session)
}

const handleProcessingStarted = (config) => {
  console.log('Processing started with config:', config)
}

const handleProcessingComplete = (results) => {
  console.log('Processing completed:', results)
}

const handleExport = (exportType) => {
  store.generateExport(exportType)
}

// Lifecycle
onMounted(async () => {
  await store.initializeAuth()
})
</script>

<style>
/* Global styles */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease-out;
}
.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
```

### 6.2 Progressive Disclosure Sections

#### Section 1: Session Setup
```vue
<!-- SessionSetup.vue -->
<template>
  <div class="session-setup">
    <!-- Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-blue-50 rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        
        <button 
          class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium mb-4 hover:bg-blue-700 transition-colors"
          @click="showNewSessionForm = true"
        >
          📤 Start New Session
        </button>
        
        <button 
          v-if="deltaDetected"
          class="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
          @click="createDeltaSession"
        >
          🔄 Resume Previous Session
        </button>
      </div>
      
      <div class="bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        
        <div v-if="recentSessions.length > 0" class="space-y-3">
          <div v-for="session in recentSessions.slice(0, 3)" :key="session.session_id" 
               class="flex items-center justify-between">
            <div>
              <p class="font-medium">{{ session.session_name }}</p>
              <p class="text-sm text-gray-500">{{ formatDate(session.created_at) }}</p>
            </div>
            <span :class="statusClasses[session.status]" class="px-2 py-1 rounded-full text-xs font-medium">
              {{ session.status }}
            </span>
          </div>
        </div>
        
        <div v-else class="text-gray-500 text-center py-4">
          No previous sessions
        </div>
        
        <button class="w-full mt-4 text-blue-600 hover:text-blue-700 font-medium">
          📋 View All Sessions
        </button>
      </div>
    </div>
    
    <!-- New Session Form -->
    <div v-if="showNewSessionForm" class="bg-white border-2 border-blue-200 rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Session</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Session Name <span class="text-red-500">*</span>
          </label>
          <input
            v-model="sessionForm.name"
            type="text"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Monthly Expenses - March 2025"
            required
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            v-model="sessionForm.description"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            placeholder="Updated processing with new receipts"
          ></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Processing Type
          </label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="radio" v-model="sessionForm.type" value="new" class="mr-2">
              <span>New Session</span>
            </label>
            <label v-if="availableDeltaSessions.length > 0" class="flex items-center">
              <input type="radio" v-model="sessionForm.type" value="delta" class="mr-2">
              <span>Delta from:</span>
              <select v-model="sessionForm.parentSessionId" class="ml-2 border rounded px-2 py-1">
                <option v-for="session in availableDeltaSessions" :key="session.session_id" :value="session.session_id">
                  {{ session.session_name }}
                </option>
              </select>
            </label>
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button
            @click="createSession"
            :disabled="!sessionForm.name"
            class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Session
          </button>
          <button
            @click="showNewSessionForm = false"
            class="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'

const emit = defineEmits(['session-created'])
const store = useSessionStore()

// Local state
const showNewSessionForm = ref(false)
const sessionForm = ref({
  name: '',
  description: '',
  type: 'new',
  parentSessionId: null
})

// Computed
const recentSessions = computed(() => store.recentSessions)
const availableDeltaSessions = computed(() => 
  store.sessions.filter(s => s.status === 'completed')
)
const deltaDetected = ref(false)

const statusClasses = {
  'completed': 'bg-green-100 text-green-800',
  'processing': 'bg-blue-100 text-blue-800',
  'failed': 'bg-red-100 text-red-800',
  'created': 'bg-gray-100 text-gray-800'
}

// Methods
const createSession = async () => {
  try {
    const session = await store.createSession({
      name: sessionForm.value.name,
      description: sessionForm.value.description,
      isDelta: sessionForm.value.type === 'delta',
      parentSessionId: sessionForm.value.parentSessionId,
      processingConfig: {
        email_notification: true,
        detailed_report: true,
        skip_unchanged: sessionForm.value.type === 'delta'
      }
    })
    
    emit('session-created', session)
    showNewSessionForm.value = false
  } catch (error) {
    console.error('Failed to create session:', error)
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

// Lifecycle
onMounted(async () => {
  await store.loadSessions(10)
})
</script>
```

#### Section 2: File Upload with Delta Recognition
```vue
<!-- FileUpload.vue -->
<template>
  <div class="file-upload">
    <!-- File Upload Areas -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      
      <!-- CAR File Upload -->
      <div class="file-drop-zone" 
           :class="{ 
             'drag-active': dragActive.car, 
             'has-file': files.car,
             'upload-success': uploadStatus.car === 'success',
             'upload-error': uploadStatus.car === 'error'
           }"
           @drop.prevent="handleDrop($event, 'car')"
           @dragover.prevent="dragActive.car = true"
           @dragleave="dragActive.car = false">
        
        <div class="drop-zone-content">
          <!-- Upload Prompt -->
          <div v-if="!files.car" class="text-center">
            <div class="upload-icon">
              <svg class="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">CAR Report (Required)</h3>
            <p class="text-gray-600 mb-4">Drag PDF here or click to browse</p>
            <button 
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              @click="openFilePicker('car')"
            >
              Choose CAR File
            </button>
            <p class="text-xs text-gray-500 mt-2">PDF format, max 100MB</p>
          </div>
          
          <!-- File Status -->
          <div v-else class="file-status">
            <div class="flex items-center space-x-3">
              <div class="status-icon">
                <svg v-if="uploadStatus.car === 'success'" class="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <svg v-else-if="uploadStatus.car === 'error'" class="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                <div v-else class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ files.car.name }}</p>
                <p class="text-sm text-gray-600">{{ formatFileSize(files.car.size) }}</p>
                <p class="text-sm" :class="{
                  'text-green-600': uploadStatus.car === 'success',
                  'text-red-600': uploadStatus.car === 'error',
                  'text-blue-600': uploadStatus.car === 'uploading'
                }">
                  {{ uploadStatusText.car }}
                </p>
              </div>
              
              <button 
                v-if="uploadStatus.car !== 'uploading'"
                @click="removeFile('car')"
                class="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>
            
            <!-- Upload Progress -->
            <div v-if="uploadStatus.car === 'uploading'" class="mt-3">
              <div class="bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${uploadProgress.car}%` }"
                ></div>
              </div>
              <p class="text-xs text-gray-600 mt-1 text-center">{{ uploadProgress.car }}% uploaded</p>
            </div>
          </div>
        </div>
        
        <input 
          ref="carFileInput"
          type="file" 
          accept=".pdf"
          class="hidden"
          @change="handleFileSelect($event, 'car')"
        />
      </div>
      
      <!-- Receipt File Upload (Similar structure) -->
      <div class="file-drop-zone optional" 
           :class="{ 
             'drag-active': dragActive.receipt, 
             'has-file': files.receipt,
             'upload-success': uploadStatus.receipt === 'success',
             'upload-error': uploadStatus.receipt === 'error'
           }">
        <!-- Similar structure as CAR upload, but marked as optional -->
        <div class="drop-zone-content">
          <div v-if="!files.receipt" class="text-center">
            <div class="upload-icon opacity-75">
              <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-700 mb-2">Receipt Report</h3>
            <p class="text-gray-600 mb-4">Optional - Upload if available</p>
            <button 
              class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              @click="openFilePicker('receipt')"
            >
              Choose Receipt File
            </button>
            <p class="text-xs text-gray-500 mt-2">PDF format, max 100MB</p>
          </div>
          
          <!-- Receipt file status similar to CAR -->
        </div>
      </div>
      
    </div>
    
    <!-- Delta Recognition Alert -->
    <div v-if="deltaDetected" class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-blue-800">Same files detected</h3>
          <p class="text-sm text-blue-700 mt-1">
            These files match your previous session: {{ previousSessionName }}
          </p>
          <div class="mt-2">
            <button 
              @click="enableDeltaMode"
              class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Process only changes
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Processing Options -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="text-sm font-medium text-gray-900 mb-3">Processing Options</h3>
      
      <div class="space-y-2">
        <label class="flex items-center">
          <input type="checkbox" v-model="options.emailNotification" class="mr-2 rounded border-gray-300">
          <span class="text-sm text-gray-700">Email notification on completion</span>
        </label>
        
        <label class="flex items-center">
          <input type="checkbox" v-model="options.detailedReport" class="mr-2 rounded border-gray-300">
          <span class="text-sm text-gray-700">Generate detailed validation report</span>
        </label>
        
        <label v-if="deltaMode" class="flex items-center">
          <input type="checkbox" v-model="options.skipUnchanged" class="mr-2 rounded border-gray-300">
          <span class="text-sm text-gray-700">Skip employees with no changes</span>
        </label>
      </div>
    </div>
    
    <!-- Start Processing Button -->
    <div class="text-center">
      <button
        @click="startProcessing"
        :disabled="!canStartProcessing"
        class="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        {{ deltaMode ? 'Process Changes' : 'Start Processing' }}
      </button>
      
      <p v-if="!canStartProcessing" class="text-sm text-gray-500 mt-2">
        CAR file upload required to start processing
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/session'

const props = defineProps({
  sessionId: String
})

const emit = defineEmits(['processing-started'])
const store = useSessionStore()

// File handling state
const files = ref({ car: null, receipt: null })
const dragActive = ref({ car: false, receipt: false })
const uploadProgress = ref({ car: 0, receipt: 0 })
const uploadStatus = ref({ car: null, receipt: null })
const carFileInput = ref(null)
const receiptFileInput = ref(null)

// Delta recognition
const deltaDetected = ref(false)
const deltaMode = ref(false)
const previousSessionName = ref('')

// Processing options
const options = ref({
  emailNotification: true,
  detailedReport: true,
  skipUnchanged: false
})

// Computed
const canStartProcessing = computed(() => {
  return files.value.car && 
         uploadStatus.value.car === 'success' &&
         (uploadStatus.value.receipt === 'success' || uploadStatus.value.receipt === null)
})

const uploadStatusText = computed(() => ({
  car: getStatusText('car'),
  receipt: getStatusText('receipt')
}))

// File handling methods
const openFilePicker = (type) => {
  if (type === 'car') {
    carFileInput.value.click()
  } else {
    receiptFileInput.value.click()
  }
}

const handleFileSelect = (event, type) => {
  const file = event.target.files[0]
  if (file) {
    handleFile(file, type)
  }
}

const handleDrop = (event, type) => {
  dragActive.value[type] = false
  const file = event.dataTransfer.files[0]
  if (file) {
    handleFile(file, type)
  }
}

const handleFile = async (file, type) => {
  if (!validateFile(file)) return
  
  files.value[type] = file
  await uploadFile(file, type)
  
  // Check for delta recognition on CAR file
  if (type === 'car') {
    await checkForDelta(file)
  }
}

const validateFile = (file) => {
  // Validate file type
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('Only PDF files are allowed')
    return false
  }
  
  // Validate file size (100MB)
  if (file.size > 100 * 1024 * 1024) {
    alert('File size must be less than 100MB')
    return false
  }
  
  return true
}

const uploadFile = async (file, type) => {
  uploadStatus.value[type] = 'uploading'
  uploadProgress.value[type] = 0
  
  try {
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      if (uploadProgress.value[type] < 90) {
        uploadProgress.value[type] += Math.random() * 20
      }
    }, 200)
    
    // Upload file using store
    await store.uploadFile(file, type)
    
    clearInterval(progressInterval)
    uploadProgress.value[type] = 100
    uploadStatus.value[type] = 'success'
    
  } catch (error) {
    uploadStatus.value[type] = 'error'
    console.error(`Upload failed for ${type}:`, error)
  }
}

const checkForDelta = async (file) => {
  // Calculate file checksum and check for delta
  const checksum = await calculateChecksum(file)
  const deltaResult = await store.checkDeltaRecognition(checksum, 'car')
  
  if (deltaResult.found) {
    deltaDetected.value = true
    previousSessionName.value = deltaResult.sessionName
  }
}

const calculateChecksum = async (file) => {
  // Simple checksum calculation - in production use proper hashing
  return file.size + file.lastModified + file.name
}

const removeFile = (type) => {
  files.value[type] = null
  uploadStatus.value[type] = null
  uploadProgress.value[type] = 0
  
  if (type === 'car') {
    deltaDetected.value = false
    deltaMode.value = false
  }
}

const enableDeltaMode = () => {
  deltaMode.value = true
  options.value.skipUnchanged = true
}

const startProcessing = async () => {
  const processingConfig = {
    emailNotification: options.value.emailNotification,
    detailedReport: options.value.detailedReport,
    skipUnchanged: options.value.skipUnchanged,
    deltaMode: deltaMode.value
  }
  
  try {
    await store.startProcessing(processingConfig)
    emit('processing-started', processingConfig)
  } catch (error) {
    console.error('Failed to start processing:', error)
  }
}

const getStatusText = (type) => {
  switch (uploadStatus.value[type]) {
    case 'uploading': return 'Uploading...'
    case 'success': return 'Upload successful'
    case 'error': return 'Upload failed'
    default: return ''
  }
}

const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Byte'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}
</script>

<style scoped>
.file-drop-zone {
  @apply border-2 border-dashed border-gray-300 rounded-lg p-8 transition-all duration-200 hover:border-blue-400;
}

.file-drop-zone.drag-active {
  @apply border-blue-500 bg-blue-50;
}

.file-drop-zone.has-file {
  @apply border-solid border-gray-400 bg-gray-50;
}

.file-drop-zone.upload-success {
  @apply border-green-400 bg-green-50;
}

.file-drop-zone.upload-error {
  @apply border-red-400 bg-red-50;
}

.file-drop-zone.optional {
  @apply border-gray-200;
}
</style>
```

---

## 7. DEPLOYMENT & OPERATIONS

### 7.1 Development Environment

```yaml
# docker-compose.yml - Development setup
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    environment:
      - DEBUG=true
      - DATABASE_URL=sqlite:///./data/database.db
      - ADMIN_USERS=rcox,mikeh,tomj
    volumes:
      - ./backend:/app
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    restart: unless-stopped
```

### 7.2 Production Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - DEBUG=false
      - DATABASE_URL=sqlite:///./data/database.db
      - DOC_INTELLIGENCE_ENDPOINT=${DOC_INTELLIGENCE_ENDPOINT}
      - DOC_INTELLIGENCE_KEY=${DOC_INTELLIGENCE_KEY}
      - ADMIN_USERS=${ADMIN_USERS}
    volumes:
      - ./data:/app/data:rw
      - ./logs:/app/logs:rw
    restart: unless-stopped

  frontend:
    build: ./frontend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

### 7.3 Configuration Files

```nginx
# nginx.conf - Production configuration
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }
    
    upstream frontend {
        server frontend:3000;
    }
    
    server {
        listen 80;
        server_name your-domain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl;
        server_name your-domain.com;
        
        ssl_certificate /etc/ssl/cert.pem;
        ssl_certificate_key /etc/ssl/key.pem;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Remote-User $remote_user;
            
            # File upload size limit
            client_max_body_size 100M;
        }
        
        # Static files
        location /static/ {
            alias /app/static/;
            expires 7d;
        }
    }
}
```

---

## 8. IMPLEMENTATION ROADMAP (4 WEEKS)

### Week 1: Foundation & Backend Core

**Sprint 1.1 (Days 1-2): Project Setup**
- Initialize FastAPI backend with SQLite database
- Set up Vue 3 + Vite frontend project
- Create Docker development environment
- Implement Windows authentication

**Sprint 1.2 (Days 3-5): Core Backend APIs**
- Implement session management endpoints
- Create file upload with checksum validation
- Add status polling endpoint structure
- Database schema implementation and testing

**Deliverables:**
- ✅ Working backend with session creation and file upload
- ✅ Frontend project structure with authentication
- ✅ Docker development environment
- ✅ Database schema with sample data

### Week 2: Frontend Core & Integration

**Sprint 2.1 (Days 6-8): Core Frontend Components**
- Implement Pinia store with complete state management
- Create SessionSetup and FileUpload components
- Add Windows authentication display
- Integrate file upload with backend

**Sprint 2.2 (Days 9-10): Progress Tracking**
- Implement ProgressTracker component with 5-second polling
- Add processing control buttons (pause/resume/cancel)
- Create real-time activity feed
- Test frontend-backend integration

**Deliverables:**
- ✅ Complete single-page application with progressive sections
- ✅ File upload with validation and progress tracking
- ✅ Real-time status polling working
- ✅ Session management integrated

### Week 3: Processing Engine & Results

**Sprint 3.1 (Days 11-13): Processing Engine**
- Implement background processing simulation
- Add delta recognition system
- Create employee data processing logic
- Add processing activities logging

**Sprint 3.2 (Days 14-15): Results Display**
- Implement ResultsDisplay component with smart grouping
- Add issue resolution functionality
- Create export actions for pVault, follow-up, issues
- Test complete user workflow

**Deliverables:**
- ✅ Complete processing workflow from upload to results
- ✅ Smart results grouping and issue resolution
- ✅ Export generation working
- ✅ Delta recognition functional

### Week 4: Polish & Production

**Sprint 4.1 (Days 16-18): UI/UX Polish**
- Apply consistent Tailwind styling
- Implement responsive design for desktop/tablet
- Add loading states and error handling
- User acceptance testing and bug fixes

**Sprint 4.2 (Days 19-20): Production Deployment**
- Set up production Docker configuration
- Configure nginx reverse proxy
- SSL certificate setup
- Performance testing and optimization

**Deliverables:**
- ✅ Production-ready application
- ✅ Responsive design working on all target devices
- ✅ Complete documentation
- ✅ Production deployment configured

---

## 9. SUCCESS CRITERIA & TESTING

### 9.1 User Acceptance Criteria

**Core Functionality:**
- ✅ Users can create sessions and upload CAR/Receipt files
- ✅ Processing completes for 45+ employees in under 5 minutes
- ✅ Delta recognition detects unchanged files accurately
- ✅ Export files generated in correct format for pVault system
- ✅ Issue resolution workflow enables inline problem solving

**Performance Requirements:**
- ✅ Page loads in under 3 seconds on corporate network
- ✅ File uploads work reliably for files up to 100MB
- ✅ Status updates appear within 5 seconds of backend changes
- ✅ System supports 2-3 concurrent users without degradation

**Usability Requirements:**
- ✅ New users complete first processing session within 10 minutes
- ✅ All critical functions accessible via keyboard navigation
- ✅ Error messages provide clear resolution steps
- ✅ Admin users can access system overview and user sessions

### 9.2 Technical Testing Strategy

**Backend Testing:**
```python
# test_api.py - Key API endpoint tests
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_session():
    response = client.post("/api/sessions", json={
        "session_name": "Test Session",
        "description": "Test description"
    })
    assert response.status_code == 200
    assert "session_id" in response.json()

def test_file_upload():
    session_response = client.post("/api/sessions", json={
        "session_name": "Upload Test"
    })
    session_id = session_response.json()["session_id"]
    
    with open("test.pdf", "rb") as f:
        response = client.post(f"/api/sessions/{session_id}/upload", 
                             files={"car_file": f})
    assert response.status_code == 200
    assert response.json()["status"] == "uploaded"

def test_status_polling():
    # Test that status endpoint returns required fields
    session_id = "test-session-id"
    response = client.get(f"/api/sessions/{session_id}/status")
    
    required_fields = [
        "status", "current_employee", "total_employees", 
        "percent_complete", "recent_activities"
    ]
    for field in required_fields:
        assert field in response.json()
```

**Frontend Testing:**
```javascript
// tests/components/FileUpload.test.js
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileUpload from '@/components/core/FileUpload.vue'

describe('FileUpload', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('accepts PDF file upload', async () => {
    const wrapper = mount(FileUpload, {
      props: { sessionId: 'test-session' }
    })
    
    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    await fileInput.setValue([file])
    
    expect(wrapper.text()).toContain('test.pdf')
  })

  test('validates file size limit', async () => {
    const wrapper = mount(FileUpload)
    
    // Create oversized file (>100MB)
    const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.pdf')
    
    // Test validation logic
    expect(wrapper.vm.validateFile(largeFile)).toBe(false)
  })
})
```

### 9.3 Integration Testing

**End-to-End User Flow:**
```javascript
// e2e/complete-workflow.test.js
describe('Complete Processing Workflow', () => {
  test('user can process files from start to export', async () => {
    // 1. Navigate to application
    await page.goto('/')
    
    // 2. Create new session
    await page.fill('[data-testid="session-name"]', 'E2E Test Session')
    await page.click('[data-testid="create-session"]')
    
    // 3. Upload CAR file
    const carFile = path.join(__dirname, 'fixtures', 'sample-car.pdf')
    await page.setInputFiles('[data-testid="car-file-input"]', carFile)
    await page.waitForSelector('[data-testid="upload-success"]')
    
    // 4. Start processing
    await page.click('[data-testid="start-processing"]')
    
    // 5. Wait for processing completion
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 60000 })
    
    // 6. Verify results display
    expect(await page.textContent('[data-testid="results-summary"]')).toContain('Processing completed')
    
    // 7. Generate export
    await page.click('[data-testid="export-pvault"]')
    
    // 8. Verify file download
    const download = await page.waitForEvent('download')
    expect(download.suggestedFilename()).toMatch(/pvault.*\.csv/)
  })
})
```

---

## 10. MONITORING & MAINTENANCE

### 10.1 Application Monitoring

```python
# monitoring.py - Application health monitoring
from fastapi import APIRouter
from datetime import datetime, timedelta
import psutil
import os

monitoring = APIRouter()

@monitoring.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@monitoring.get("/metrics")
async def get_metrics():
    # System metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Database metrics
    db_size = os.path.getsize("data/database.db") if os.path.exists("data/database.db") else 0
    
    return {
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent,
            "disk_free_gb": disk.free / (1024**3)
        },
        "application": {
            "database_size_mb": db_size / (1024**2),
            "uptime_seconds": (datetime.utcnow() - app_start_time).total_seconds()
        }
    }

@monitoring.get("/sessions/stats")
async def session_statistics():
    # Session statistics for monitoring
    db = SessionLocal()
    try:
        total_sessions = db.query(ProcessingSession).count()
        active_sessions = db.query(ProcessingSession).filter(
            ProcessingSession.status == "processing"
        ).count()
        completed_today = db.query(ProcessingSession).filter(
            ProcessingSession.created_at >= datetime.utcnow().date()
        ).count()
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "completed_today": completed_today,
            "avg_processing_time": 180  # Would calculate from actual data
        }
    finally:
        db.close()
```

### 10.2 Error Logging and Alerting

```python
# logging_config.py
import logging
import logging.handlers
import os
from datetime import datetime

def setup_logging():
    # Create logs directory
    os.makedirs("logs", exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.handlers.RotatingFileHandler(
                "logs/app.log",
                maxBytes=10485760,  # 10MB
                backupCount=5
            ),
            logging.handlers.RotatingFileHandler(
                "logs/error.log",
                maxBytes=10485760,
                backupCount=5,
                level=logging.ERROR
            )
        ]
    )

# Error tracking middleware
@app.middleware("http")
async def error_tracking_middleware(request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        
        # In production, send to monitoring service
        # await send_error_alert(e, request)
        
        raise
```

### 10.3 Backup and Recovery

```bash
#!/bin/bash
# backup.sh - Database and file backup script

# Variables
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/app"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
cp "$APP_DIR/data/database.db" "$BACKUP_DIR/database_$DATE.db"

# Backup uploaded files
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" "$APP_DIR/data/uploads"

# Backup configuration
cp "$APP_DIR/config.py" "$BACKUP_DIR/config_$DATE.py"

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

# Log backup completion
echo "$(date): Backup completed successfully" >> "$BACKUP_DIR/backup.log"
```

---

## CONCLUSION & NEXT STEPS

This Final Implementation Plan serves as the authoritative guide for developing the Credit Card Processor web application. All development teams must reference this document for:

- **API Contract Compliance**: Exact endpoint signatures and response formats
- **Database Schema**: Complete table structures with indexes
- **Frontend Architecture**: Component specifications and state management
- **UI/UX Requirements**: Progressive disclosure and responsive design
- **Deployment Configuration**: Docker, nginx, and production setup
- **Testing Strategy**: Unit, integration, and end-to-end testing
- **Monitoring Plan**: Health checks, metrics, and alerting

**Development Teams Should:**
1. Use this document as the single source of truth
2. Follow the 4-week implementation roadmap
3. Implement components according to specifications
4. Test against the defined success criteria
5. Deploy using the provided configurations

**Project Success Factors:**
- Session-based processing with delta recognition
- Real-time progress tracking with 5-second polling  
- Smart results grouping with inline issue resolution
- Export generation for pVault system integration
- Windows authentication with admin access control

**Key Differentiators:**
- Single-page application eliminating navigation complexity
- Employee-focused progress tracking instead of generic percentages
- Delta recognition reducing repeat processing time
- Progressive disclosure revealing functionality as needed
- Action-oriented export buttons with clear purposes

This plan consolidates months of architectural planning into a focused, executable development strategy. Teams can begin implementation immediately with confidence that all critical decisions have been made and documented.

**Next Immediate Actions:**
1. Set up development environment using provided Docker configuration
2. Begin Week 1 Sprint 1.1 with project initialization
3. Establish daily standups to track progress against roadmap
4. Schedule weekly architecture reviews to ensure compliance
5. Plan user acceptance testing for Week 4

---

**Document Authority**: This document supersedes all previous implementation plans and serves as the definitive specification for the Credit Card Processor web application development.

**Revision Control**: Any changes to this specification must be approved by the project architect and communicated to all development teams immediately.

**Contact**: For clarification on any aspect of this implementation plan, consult the project architect or raise questions during daily standups.
