# Frontend Implementation Plan: Credit Card Processor Web Application

Based on rules.md requirements, here's the aligned frontend implementation plan following the "don't overengineer" principle:

## Core Requirements from rules.md

**Immutable Technology Stack:**
- Vue 3 + Vite + Pinia + Tailwind CSS
- Status polling every 5 seconds (NOT Server-Sent Events)
- Single Page Application (no routing)
- Simple beats complex

**Required API Endpoints (from rules.md):**
- `POST /api/sessions` - Create session
- `GET /api/sessions/{id}` - Get session
- `POST /api/sessions/{id}/upload` - Upload files
- `GET /api/sessions/{id}/status` - Check status (polling)
- `GET /api/sessions/{id}/results` - Get results
- `POST /api/sessions/{id}/export` - Generate export

## Project Structure (EXACT from rules.md)

```
frontend/
├── src/
│   ├── App.vue          # Root component ONLY
│   ├── components/
│   │   ├── FileUpload.vue
│   │   ├── ProgressTracker.vue
│   │   ├── ResultsDisplay.vue
│   │   └── ExportActions.vue
│   ├── composables/
│   │   ├── useApi.js
│   │   ├── useFileUpload.js
│   │   └── useProgress.js
│   ├── stores/
│   │   └── session.js   # Pinia store
│   └── styles/
│       └── main.css
└── package.json
```

## Component Architecture (Simplified)

**4 Required Components (ONE job each):**
1. **FileUpload.vue** - Handle file selection and upload
2. **ProgressTracker.vue** - Show processing progress
3. **ResultsDisplay.vue** - Display results table
4. **ExportActions.vue** - Handle export generation

**NO Complex Nested Structure** - All components are siblings under App.vue

## Pinia Store (Single Source of Truth)

```javascript
// stores/session.js - REQUIRED pattern from rules.md
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

## Status Polling Pattern (REQUIRED)

```javascript
// EXACT pattern from rules.md - NO Server-Sent Events
const pollInterval = setInterval(async () => {
    const status = await fetch(`/api/sessions/${sessionId}/status`)
    if (status.data.status !== 'processing') {
        clearInterval(pollInterval)
    }
}, 5000)
```

**Backend Status Response Format:**
```python
{
    "status": "processing|completed|failed",
    "current_employee": 23,
    "total_employees": 45,
    "message": "Processing employee: John Smith",
    "percent_complete": 51
}
```

## Composables (Simplified)

**3 Required Composables:**
1. **useApi.js** - Centralized API client
2. **useFileUpload.js** - File handling logic
3. **useProgress.js** - Status polling logic

**API Integration Pattern:**
```javascript
// useApi.js - Simple fetch wrapper
export function useApi() {
  const baseURL = '/api'
  
  return {
    get: (endpoint) => fetch(`${baseURL}${endpoint}`).then(r => r.json()),
    post: (endpoint, data) => fetch(`${baseURL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json())
  }
}
```

**Technology Stack (Locked):**
- **Build Tool**: Vite
- **Framework**: Vue 3 Composition API
- **State Management**: Pinia (SINGLE source of truth)
- **Styling**: Tailwind CSS utilities ONLY
- **HTTP**: Native Fetch API

## Implementation Phases (Simplified)

### Phase 1: Foundation (Week 1)
**Setup & Pinia Store**
- Initialize Vite + Vue 3 + Pinia + Tailwind project
- Create session.js Pinia store as single source of truth
- Build App.vue root component
- Create useApi.js composable

### Phase 2: Core Components (Week 2)
**4 Required Components**
- Build FileUpload.vue (file selection and upload only)
- Build ProgressTracker.vue (status polling display only)  
- Build ResultsDisplay.vue (results table only)
- Build ExportActions.vue (export generation only)

### Phase 3: Integration (Week 3)
**Connect Everything**
- Create useFileUpload.js composable
- Create useProgress.js composable with 5-second polling
- Wire all components to Pinia store
- Add Tailwind styling (utilities only, no custom CSS)

### Phase 4: Production (Week 4)
**Testing & Deployment**
- Basic functionality testing
- Build production assets
- Integration with backend
- Documentation

## Key Implementation Details

**Critical Patterns (from rules.md):**

1. **Status Polling**: EXACTLY every 5 seconds, NOT Server-Sent Events
2. **Pinia Store**: SINGLE source of truth, no local component state for shared data  
3. **Components**: Each has ONE job, no complex nesting
4. **Tailwind Only**: No custom CSS unless absolutely necessary
5. **Simple API**: Basic fetch() calls, no complex HTTP client

**Error Handling Pattern (from rules.md):**
```javascript
// All errors MUST follow this format:
{
    "error": "human_readable_message",
    "detail": "technical_details_for_logging", 
    "code": "ERROR_CODE",
    "timestamp": "2025-01-01T12:00:00Z"
}
```

**Authentication:**
- Trust Windows domain headers completely (from rules.md)
- No complex authentication flows
- Simple header-based user detection

## Design Principles Applied

**Don't Overengineer:**
- 4 components instead of 9+
- 3 composables instead of 6+
- Status polling instead of complex SSE
- Tailwind utilities instead of custom styling system

**One Way to Do Things:**
- Pinia store for ALL shared state
- Fetch API for ALL HTTP requests  
- Status polling for ALL progress updates
- Tailwind classes for ALL styling

**No Fallbacks:**
- One polling mechanism, no backup methods
- One state store, no local state duplication
- One API pattern, no alternative approaches

This simplified plan eliminates complexity while delivering the required functionality, following rules.md principles of simplicity over engineering elegance.

---

**Document Version**: 2.0 (Aligned with rules.md)
**Date**: August 29, 2025  
**Status**: Ready for Implementation