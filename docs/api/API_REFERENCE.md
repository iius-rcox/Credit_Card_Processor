# API Reference Guide
## Credit Card Processor Application

### Document Information
- **Version**: 1.0
- **Date**: December 2024
- **Base URL**: `http://localhost:8001` (development), `https://your-domain.com` (production)

---

## Table of Contents

1. [Authentication](#authentication)
2. [File Upload & Management](#file-upload--management)
3. [Processing Operations](#processing-operations)
4. [Results & Export](#results--export)
5. [Monitoring & Health](#monitoring--health)
6. [Administrative Functions](#administrative-functions)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Response Formats](#response-formats)

---

## Authentication

### Overview
The API uses header-based authentication with configurable methods including Windows authentication and development authentication for testing purposes.

### Authentication Headers
```http
Remote-User: username
# or
X-Forwarded-User: username  
# or
Auth-User: username
# or (development only)
X-Dev-User: username
```

### Get Authentication Status
```http
GET /api/auth/status
```

**Description**: Check current authentication status and available methods

**Response**:
```json
{
  "authenticated": true,
  "user": {
    "username": "john.doe",
    "is_admin": false,
    "timestamp": "2024-12-01T10:30:00Z",
    "auth_method": "windows"
  },
  "auth_methods_available": ["windows"],
  "header_validation": {
    "valid_headers_found": 1,
    "security_warnings": 0,
    "timestamp": "2024-12-01T10:30:00Z"
  }
}
```

### Get Current User Information
```http
GET /api/auth/current-user
```

**Description**: Get detailed information about the current authenticated user

**Authentication**: Required

**Response**:
```json
{
  "username": "john.doe",
  "is_admin": false,
  "timestamp": "2024-12-01T10:30:00Z",
  "auth_method": "windows"
}
```

### Get Detailed User Information
```http
GET /api/auth/user-info
```

**Description**: Get comprehensive user information including permissions

**Authentication**: Required

**Response**:
```json
{
  "user": {
    "username": "john.doe",
    "is_admin": false,
    "timestamp": "2024-12-01T10:30:00Z",
    "auth_method": "windows"
  },
  "permissions": {
    "can_upload": true,
    "can_process": true,
    "can_export": false,
    "can_manage_sessions": false,
    "can_view_all_data": false
  },
  "session": {
    "authenticated_at": "2024-12-01T10:30:00Z",
    "auth_method": "windows",
    "session_valid": true
  }
}
```

### Test Admin Access
```http
GET /api/auth/admin-test
```

**Description**: Test endpoint requiring admin privileges

**Authentication**: Required (Admin only)

**Response**:
```json
{
  "message": "Admin access confirmed",
  "user": "admin.user",
  "admin": true,
  "timestamp": "2024-12-01T10:30:00Z"
}
```

---

## File Upload & Management

### Upload File
```http
POST /api/upload/
```

**Description**: Upload a PDF file for processing

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Parameters**:
- `file` (file, required): PDF file to upload (max 100MB)

**Example**:
```bash
curl -X POST \
  -H "Remote-User: john.doe" \
  -F "file=@statement.pdf" \
  http://localhost:8001/api/upload/
```

**Response**:
```json
{
  "message": "File uploaded successfully",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "statement.pdf",
  "file_size": 1234567,
  "content_type": "application/pdf",
  "upload_timestamp": "2024-12-01T10:30:00Z",
  "file_hash": "a1b2c3d4e5f6...",
  "validation_results": {
    "is_valid_pdf": true,
    "file_structure_ok": true,
    "size_acceptable": true
  }
}
```

### Get Upload Status
```http
GET /api/upload/{session_id}/status
```

**Description**: Get the status of an uploaded file

**Authentication**: Required

**Parameters**:
- `session_id` (string, required): Session ID from upload response

**Response**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "uploaded",
  "filename": "statement.pdf",
  "upload_time": "2024-12-01T10:30:00Z",
  "file_info": {
    "size": 1234567,
    "content_type": "application/pdf",
    "hash": "a1b2c3d4e5f6..."
  }
}
```

---

## Processing Operations

### Start Processing
```http
POST /api/processing/{session_id}/start
```

**Description**: Start processing an uploaded file

**Authentication**: Required

**Parameters**:
- `session_id` (string, required): Session ID of uploaded file

**Request Body**:
```json
{
  "processing_type": "standard",
  "validation_rules": ["required_fields", "data_types"],
  "options": {
    "extract_transactions": true,
    "validate_amounts": true,
    "detect_duplicates": true
  }
}
```

**Response**:
```json
{
  "message": "Processing started",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "processing_id": "proc-123456",
  "status": "processing",
  "started_at": "2024-12-01T10:35:00Z",
  "estimated_completion": "2024-12-01T10:37:00Z"
}
```

### Get Processing Status
```http
GET /api/processing/{session_id}/status
```

**Description**: Get current processing status

**Authentication**: Required

**Response**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "started_at": "2024-12-01T10:35:00Z",
  "completed_at": "2024-12-01T10:37:00Z",
  "processing_time_seconds": 120,
  "results_summary": {
    "transactions_extracted": 45,
    "validation_errors": 2,
    "data_quality_score": 0.94
  }
}
```

### Get Processing Progress
```http
GET /api/processing/{session_id}/progress
```

**Description**: Get detailed processing progress

**Authentication**: Required

**Response**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "overall_progress": 75,
  "current_stage": "data_extraction",
  "stages": [
    {
      "name": "file_validation",
      "status": "completed",
      "progress": 100
    },
    {
      "name": "data_extraction", 
      "status": "processing",
      "progress": 75
    },
    {
      "name": "validation",
      "status": "pending",
      "progress": 0
    }
  ],
  "estimated_completion": "2024-12-01T10:37:00Z"
}
```

---

## Results & Export

### Get Processing Results
```http
GET /api/results/{session_id}
```

**Description**: Get processing results for a session

**Authentication**: Required

**Query Parameters**:
- `page` (integer, optional): Page number for pagination (default: 1)
- `limit` (integer, optional): Results per page (default: 100, max: 1000)
- `format` (string, optional): Response format ("json", "summary")

**Response**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "processing_summary": {
    "total_transactions": 45,
    "successful_extractions": 43,
    "validation_errors": 2,
    "data_quality_score": 0.956,
    "processing_time_seconds": 120
  },
  "transactions": [
    {
      "id": 1,
      "date": "2024-11-15",
      "description": "GROCERY STORE",
      "amount": -89.45,
      "category": "groceries",
      "confidence": 0.98
    }
  ],
  "validation_issues": [
    {
      "transaction_id": 2,
      "issue_type": "missing_date",
      "message": "Transaction date could not be extracted",
      "severity": "warning"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total_pages": 1,
    "total_results": 45
  }
}
```

### Export Results
```http
POST /api/export/{session_id}
```

**Description**: Export results in various formats

**Authentication**: Required

**Request Body**:
```json
{
  "format": "csv",
  "options": {
    "include_metadata": true,
    "date_format": "YYYY-MM-DD",
    "currency_format": "USD"
  },
  "filters": {
    "date_from": "2024-11-01",
    "date_to": "2024-11-30",
    "categories": ["groceries", "gas"]
  }
}
```

**Supported Formats**:
- `csv`: Comma-separated values
- `xlsx`: Excel spreadsheet
- `json`: JSON format

**Response**:
```json
{
  "export_id": "export-789012",
  "format": "csv",
  "status": "completed",
  "download_url": "/api/export/download/export-789012",
  "expires_at": "2024-12-02T10:30:00Z",
  "file_size_bytes": 12345,
  "record_count": 45
}
```

### Download Export
```http
GET /api/export/download/{export_id}
```

**Description**: Download exported file

**Authentication**: Required

**Response**: Binary file download with appropriate Content-Type header

---

## Monitoring & Health

### Basic Health Check
```http
GET /health
```

**Description**: Simple health check for load balancers

**Authentication**: Not required

**Response**:
```json
{
  "status": "healthy"
}
```

### Detailed Health Check
```http
GET /api/health/detailed
```

**Description**: Comprehensive system health diagnostics

**Authentication**: Not required

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T10:30:00Z",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "message": "Database responsive: 15.23ms",
      "details": {
        "query_time_ms": 15.23,
        "pool_info": {
          "size": 10,
          "checked_out": 2
        }
      },
      "duration_ms": 20.1,
      "critical": true
    }
  ],
  "summary": {
    "total_checks": 6,
    "healthy": 6,
    "degraded": 0,
    "unhealthy": 0,
    "critical_issues": 0
  }
}
```

### Critical Health Check
```http
GET /api/health/critical
```

**Description**: Health check showing only critical issues

**Authentication**: Not required

**Response**: Similar to detailed health check but only includes failed or critical checks

### System Metrics
```http
GET /api/monitoring/system
```

**Description**: Get current system resource metrics

**Authentication**: Not required

**Response**:
```json
{
  "cpu_percent": 25.5,
  "memory_percent": 68.2,
  "memory_available_mb": 2048.5,
  "disk_usage_percent": 45.8,
  "disk_free_gb": 15.2,
  "load_average": [1.2, 1.1, 0.9],
  "process_count": 156,
  "timestamp": "2024-12-01T10:30:00Z"
}
```

### Application Metrics
```http
GET /api/monitoring/application
```

**Description**: Get application performance metrics

**Authentication**: Not required

**Response**:
```json
{
  "active_sessions": 5,
  "total_requests": 1250,
  "error_rate_percent": 1.2,
  "avg_response_time_ms": 185.5,
  "cache_hit_rate_percent": 89.2,
  "database_connections": 3,
  "uptime_seconds": 86400,
  "timestamp": "2024-12-01T10:30:00Z"
}
```

### Combined Metrics
```http
GET /api/monitoring/metrics
```

**Description**: Get comprehensive metrics dashboard data

**Authentication**: Not required

**Response**:
```json
{
  "timestamp": "2024-12-01T10:30:00Z",
  "system": {
    "cpu_percent": 25.5,
    "memory_percent": 68.2
  },
  "application": {
    "total_requests": 1250,
    "error_rate_percent": 1.2
  },
  "alerts": []
}
```

### Prometheus Metrics
```http
GET /metrics
```

**Description**: Prometheus-compatible metrics endpoint

**Authentication**: Not required

**Content-Type**: `text/plain`

**Response**: Prometheus metrics format
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/health",status_code="200"} 1250

# HELP system_cpu_usage_percent Current CPU usage percentage  
# TYPE system_cpu_usage_percent gauge
system_cpu_usage_percent 25.5
```

---

## Administrative Functions

### Get Active Alerts
```http
GET /api/alerts
```

**Description**: Get all active system alerts

**Authentication**: Required

**Response**:
```json
{
  "timestamp": "2024-12-01T10:30:00Z",
  "alerts": [
    {
      "id": "system_1234",
      "severity": "warning", 
      "component": "system",
      "title": "High Memory Usage",
      "message": "Memory usage is above 80%",
      "metric_value": 85.2,
      "threshold": 80.0,
      "timestamp": "2024-12-01T10:25:00Z",
      "acknowledged": false
    }
  ],
  "summary": {
    "total_active": 1,
    "by_severity": {
      "critical": 0,
      "warning": 1,
      "info": 0
    }
  }
}
```

### Acknowledge Alert
```http
POST /api/alerts/{alert_id}/acknowledge
```

**Description**: Acknowledge an alert to stop notifications

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "alert_id": "system_1234",
  "acknowledged_by": "john.doe",
  "timestamp": "2024-12-01T10:30:00Z"
}
```

### Resolve Alert
```http
POST /api/alerts/{alert_id}/resolve
```

**Description**: Mark an alert as resolved (admin only)

**Authentication**: Required (Admin)

**Response**:
```json
{
  "success": true,
  "alert_id": "system_1234", 
  "resolved_by": "admin.user",
  "timestamp": "2024-12-01T10:30:00Z"
}
```

### Alert Summary
```http
GET /api/alerts/summary
```

**Description**: Get alert summary statistics

**Authentication**: Required

**Response**:
```json
{
  "timestamp": "2024-12-01T10:30:00Z",
  "total_active": 3,
  "critical_count": 0,
  "warning_count": 3,
  "by_component": {
    "system": 2,
    "application": 1
  },
  "suppressed_patterns": 0,
  "notification_channels": 3
}
```

---

## Error Handling

### Standard Error Response Format
All API errors follow a consistent format:

```json
{
  "detail": "Descriptive error message",
  "type": "error_type",
  "code": "ERROR_CODE",
  "timestamp": "2024-12-01T10:30:00Z",
  "request_id": "req-123456",
  "context": {
    "additional": "error details"
  }
}
```

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 413 | Payload Too Large | File size exceeds limits |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Types

#### Authentication Errors
```json
{
  "detail": "Authentication required",
  "type": "authentication_error",
  "code": "AUTH_REQUIRED"
}
```

#### Validation Errors  
```json
{
  "detail": "Validation failed",
  "type": "validation_error",
  "code": "VALIDATION_FAILED",
  "errors": [
    {
      "field": "file",
      "message": "File size exceeds maximum limit",
      "code": "FILE_TOO_LARGE"
    }
  ]
}
```

#### Rate Limit Errors
```json
{
  "detail": "Rate limit exceeded. Please try again later.",
  "type": "rate_limit_error", 
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60,
  "limit": 50,
  "window": 60
}
```

---

## Rate Limiting

### Rate Limit Headers
All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

### Default Limits
- **General API**: 100 requests per minute
- **File Upload**: 10 requests per minute  
- **Authentication**: 20 requests per minute
- **Admin Functions**: 50 requests per minute

### Rate Limit Exceeded Response
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Window: 60
X-RateLimit-Reset: 1638360000

{
  "detail": "Rate limit exceeded. Please try again later.",
  "retry_after": 60,
  "limit": 100,
  "window": 60
}
```

---

## Response Formats

### Success Response Format
```json
{
  "status": "success",
  "data": {
    "key": "value"
  },
  "timestamp": "2024-12-01T10:30:00Z"
}
```

### Error Response Format
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  },
  "timestamp": "2024-12-01T10:30:00Z"
}
```

### Pagination Format
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total_pages": 5,
    "total_results": 450,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## API Client Examples

### Python Example
```python
import requests

# Authentication
headers = {'Remote-User': 'john.doe'}

# Upload file
with open('statement.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8001/api/upload/',
        files={'file': f},
        headers=headers
    )
    result = response.json()
    session_id = result['session_id']

# Start processing
requests.post(
    f'http://localhost:8001/api/processing/{session_id}/start',
    json={'processing_type': 'standard'},
    headers=headers
)

# Check status
status = requests.get(
    f'http://localhost:8001/api/processing/{session_id}/status',
    headers=headers
).json()

print(f"Processing status: {status['status']}")
```

### JavaScript Example
```javascript
// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const uploadResponse = await fetch('/api/upload/', {
  method: 'POST',
  headers: {
    'Remote-User': 'john.doe'
  },
  body: formData
});

const uploadResult = await uploadResponse.json();
const sessionId = uploadResult.session_id;

// Start processing
await fetch(`/api/processing/${sessionId}/start`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Remote-User': 'john.doe'
  },
  body: JSON.stringify({
    processing_type: 'standard'
  })
});

// Poll for completion
const checkStatus = async () => {
  const response = await fetch(`/api/processing/${sessionId}/status`, {
    headers: {'Remote-User': 'john.doe'}
  });
  const status = await response.json();
  
  if (status.status === 'completed') {
    console.log('Processing completed!');
  } else {
    setTimeout(checkStatus, 2000); // Check again in 2 seconds
  }
};

checkStatus();
```

### cURL Examples
```bash
# Upload file
curl -X POST \
  -H "Remote-User: john.doe" \
  -F "file=@statement.pdf" \
  http://localhost:8001/api/upload/

# Get health status
curl http://localhost:8001/health

# Get system metrics
curl http://localhost:8001/api/monitoring/system

# Start processing with options
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Remote-User: john.doe" \
  -d '{"processing_type": "standard", "validation_rules": ["required_fields"]}' \
  http://localhost:8001/api/processing/550e8400-e29b-41d4-a716-446655440000/start
```

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Interactive Documentation**: Available at `/docs` and `/redoc` endpoints