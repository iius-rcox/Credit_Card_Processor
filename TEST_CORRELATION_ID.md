# Testing Correlation ID Implementation

## Overview
Correlation IDs have been implemented to track requests end-to-end from frontend through backend for better debugging and monitoring.

## What Was Implemented

### Frontend Changes
1. **Correlation ID Utility** (`frontend/src/utils/correlationId.js`)
   - Generates unique correlation IDs for each request
   - Format: `timestamp-random-counter` (e.g., `1234567890123-ab12-0001`)
   - Stores correlations for debugging

2. **API Integration** (`frontend/src/composables/useApi.js`)
   - Automatically adds correlation ID to all API requests
   - Sends via `x-correlation-id` header
   - Logs correlation IDs in browser console (development mode only)
   - Extracts and logs correlation IDs from responses

### Backend Changes
1. **Middleware Updates** (`backend/app/middleware.py`)
   - Accepts correlation IDs from frontend headers
   - Generates ID if not provided
   - Sets correlation ID in logging context
   - Returns correlation ID in response headers

2. **Logging Configuration** (`backend/app/logging_config.py`)
   - Added correlation ID to log format
   - All log messages now include `[correlation-id]` field
   - Context variable for correlation ID tracking

## How to Test

### 1. Check Browser Console
1. Open the application at http://localhost:3000
2. Open browser DevTools (F12)
3. Navigate to Console tab
4. Perform any action that triggers an API call (e.g., view sessions)
5. Look for console messages like:
   ```
   [API Request] GET /api/sessions - Correlation ID: 1736566842123-ab12-0001
   [API Response] GET /api/sessions - Correlation ID: 1736566842123-ab12-0001
   ```

### 2. Check Backend Logs
1. Monitor the backend terminal running uvicorn
2. When API requests are made, logs should show correlation IDs:
   ```
   2025-01-11 10:30:45 - request - INFO [1736566842123-ab12-0001] - REQUEST START GET /api/sessions - User: rcox
   2025-01-11 10:30:45 - security - INFO [1736566842123-ab12-0001] - API REQUEST: GET /api/sessions from rcox
   2025-01-11 10:30:45 - request - INFO [1736566842123-ab12-0001] - REQUEST END GET /api/sessions - Status: 200
   ```

### 3. Check Network Tab
1. In browser DevTools, go to Network tab
2. Make an API request
3. Click on the request
4. Check Headers:
   - Request Headers should include: `x-correlation-id: 1736566842123-ab12-0001`
   - Response Headers should echo back: `x-correlation-id: 1736566842123-ab12-0001`

### 4. Test Different Scenarios
- **New Session Creation**: Create a new processing session
- **File Upload**: Upload a PDF/CSV file
- **Export Operations**: Try exporting data
- **Error Scenarios**: Trigger an error to see correlation ID in error logs

## Verification Checklist
- [ ] Correlation IDs generated for each request
- [ ] IDs visible in browser console
- [ ] IDs included in request headers
- [ ] IDs echoed back in response headers
- [ ] Backend logs show correlation IDs
- [ ] Error logs include correlation IDs
- [ ] IDs remain consistent throughout request lifecycle

## Benefits
1. **Debugging**: Easily trace a specific request through the entire system
2. **Performance Monitoring**: Identify slow requests by correlation ID
3. **Error Tracking**: Link frontend errors to backend logs
4. **Audit Trail**: Complete request history with unique identifiers

## Example Correlation Flow
```
Frontend generates: 1736566842123-ab12-0001
  ↓ Sends in header: x-correlation-id
Backend receives: 1736566842123-ab12-0001
  ↓ Adds to all log messages
  ↓ Processes request
Backend responds: x-correlation-id: 1736566842123-ab12-0001
Frontend receives: Logs correlation for debugging
```

## Troubleshooting
- If correlation IDs not appearing in logs, check backend has reloaded
- If browser console not showing IDs, ensure running in development mode
- Check both `x-correlation-id` and `x-request-id` headers (both supported)