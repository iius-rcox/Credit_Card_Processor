import { ref, inject } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useNotificationStore } from '@/stores/notification'
import { 
  generateCorrelationId, 
  storeCorrelation, 
  formatCorrelationInfo,
  extractCorrelationId 
} from '@/utils/correlationId'

/**
 * Enhanced API integration composable for Credit Card Processor backend
 * Provides HTTP client with comprehensive error handling, retry logic, and Pinia store integration
 * Phase 2 enhancements: interceptors, retry logic, consistent error handling, performance monitoring
 * Phase 3 enhancements: correlation IDs for end-to-end request tracking
 */
export function useApi() {
  const store = inject('sessionStore', null) || useSessionStore()
  const notificationStore = useNotificationStore()
  const isLoading = ref(false)
  const error = ref(null)
  
  // Performance monitoring
  const performanceMetrics = ref({
    requestCount: 0,
    averageResponseTime: 0,
    lastRequestTime: null,
    slowRequests: 0,
    failedRequests: 0
  })

  // Use environment variable for API base URL, fallback to proxy
  const apiBase = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : '/api'

  // Retry configuration
  const RETRY_ATTEMPTS = 3
  const RETRY_DELAY_BASE = 1000 // 1 second
  const RETRY_STATUSES = [408, 429, 500, 502, 503, 504]

  /**
   * Get authentication headers for Windows authentication
   * @param {string} correlationId - Optional correlation ID for request tracking
   * @returns {Object} Headers object
   */
  function getAuthHeaders(correlationId = null) {
    const headers = {}
    
    // Add correlation ID for request tracking
    if (correlationId) {
      headers['x-correlation-id'] = correlationId
      headers['x-request-id'] = correlationId // Alternative header name for compatibility
    }
    
    // For local development without IIS, simulate Windows authentication
    // This will be replaced by actual Windows auth headers when deployed with IIS
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Simulate Windows authentication header for local development
      // Use double backslash for proper escaping in the header value
      headers['remote-user'] = 'INSULATIONSINC\\\\rcox'
      headers['x-remote-user'] = 'INSULATIONSINC\\\\rcox'
      console.debug('Adding simulated Windows auth headers for local development')
    }
    
    // In development mode, always add dev user header
    // Check if we're in development environment
    const isDevelopment = import.meta.env.NODE_ENV === 'development' || 
                         import.meta.env.MODE === 'development' ||
                         import.meta.env.DEV === true
    
    if (isDevelopment) {
      // Use environment variable or fallback to default test user
      const devUser = import.meta.env.VITE_DEV_USER || 'rcox'
      headers['x-dev-user'] = devUser
      console.debug('Adding dev user header:', devUser)
    }
    
    // Add any additional headers from store or context
    if (store?.user?.value?.username) {
      headers['x-user-context'] = store.user.value.username
    }
    
    return headers
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to wait
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Determines if error should trigger a retry
   * @param {Error} error - Error object
   * @param {number} attempt - Current attempt number
   * @returns {boolean}
   */
  function shouldRetry(error, attempt) {
    if (attempt >= RETRY_ATTEMPTS) return false
    
    // Retry on specific HTTP status codes
    if (error.status && RETRY_STATUSES.includes(error.status)) {
      return true
    }
    
    // Retry on network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true
    }
    
    return false
  }

  /**
   * Enhanced error handling with consistent error format
   * @param {Response|Error} error - Response or Error object
   * @returns {Error} Standardized error object
   */
  async function handleApiError(error) {
    let standardError
    
    if (error instanceof Response) {
      // Handle HTTP response errors
      let errorData = {}
      let errorMessage = `HTTP ${error.status}: ${error.statusText}`
      
      try {
        errorData = await error.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
      } catch (parseErr) {
        // Use default error message if parsing fails
        console.debug('Failed to parse error response:', parseErr)
      }
      
      standardError = new Error(errorMessage)
      standardError.status = error.status
      standardError.statusText = error.statusText
      standardError.code = error.headers?.get?.('X-Error-Code') || null
      standardError.data = errorData
      standardError.timestamp = new Date().toISOString()
      standardError.type = 'api_error'
      standardError.name = 'ApiError'
    } else {
      // Handle network/other errors with safe property access
      const message = error?.message || 'Network error occurred'
      standardError = new Error(message)
      standardError.name = error?.name || 'NetworkError'
      standardError.timestamp = new Date().toISOString()
      standardError.type = 'network_error'
      standardError.originalError = error
    }
    
    // Update store error state with consistent format
    if (store) {
      const errorInfo = {
        message: standardError.message,
        type: standardError.type,
        timestamp: standardError.timestamp,
        status: standardError.status
      }
      
      // Also send to notification system for user feedback
      notificationStore.handleApiError(standardError)
      
      if (standardError.status === 401 && store.setAuthError) {
        store.setAuthError(errorInfo.message)
      } else if (store.setSessionError) {
        store.setSessionError(standardError.message)
      }
    }
    
    return standardError
  }

  /**
   * Enhanced API request handler with retry logic and comprehensive error management
   * @param {string} endpoint - API endpoint path
   * @param {RequestInit} options - Fetch options
   * @param {number} attempt - Current attempt number (for retry logic)
   * @returns {Promise<any>} Response data
   */
  async function request(endpoint, options = {}, attempt = 1) {
    const requestStartTime = performance.now()
    const correlationId = generateCorrelationId()
    
    // Log correlation ID for debugging (only in development)
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${options.method || 'GET'} ${endpoint} - Correlation ID: ${correlationId}`)
    }
    
    if (attempt === 1) {
      isLoading.value = true
      error.value = null
      performanceMetrics.value.requestCount++
    }

    try {
      // Request interceptor - prepare headers with correlation ID
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(correlationId),
      }
      
      // Don't set Content-Type for FormData (let browser handle it)
      if (options.body instanceof FormData) {
        delete defaultHeaders['Content-Type']
      }
      
      const requestOptions = {
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        ...options,
      }

      // Make the request
      const response = await fetch(`${apiBase}${endpoint}`, requestOptions)

      // Response interceptor - handle errors
      if (!response.ok) {
        const apiError = await handleApiError(response)
        
        // Attempt retry if conditions are met
        if (shouldRetry(apiError, attempt)) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1) // Exponential backoff
          console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${RETRY_ATTEMPTS}):`, apiError.message)
          
          await sleep(delay)
          return request(endpoint, options, attempt + 1)
        }
        
        throw apiError
      }

      // Extract correlation ID from response headers
      const responseCorrelationId = response.headers.get('x-correlation-id') || 
                                   response.headers.get('x-request-id')
      
      // Log correlation ID echo for debugging
      if (import.meta.env.DEV && responseCorrelationId) {
        console.log(`[API Response] ${options.method || 'GET'} ${endpoint} - Correlation ID: ${responseCorrelationId}`)
      }
      
      // Parse response based on content type
      const contentType = response.headers.get('content-type')
      let data
      
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else if (contentType?.includes('text/')) {
        data = await response.text()
      } else {
        // For binary data (files), return the response for further processing
        data = response
      }

      // Update store on successful operations (but avoid infinite loops)
      // Only trigger store.updateSession for POST (creation), not PUT (updates)
      if (store && endpoint.includes('/sessions') && data.session_id && 
          (options.method || 'GET').toUpperCase() === 'POST') {
        store.updateSession(data.session_id, data)
      }

      // Update performance metrics
      const requestTime = performance.now() - requestStartTime
      performanceMetrics.value.lastRequestTime = requestTime
      performanceMetrics.value.averageResponseTime = 
        (performanceMetrics.value.averageResponseTime * (performanceMetrics.value.requestCount - 1) + requestTime) / 
        performanceMetrics.value.requestCount
      
      if (requestTime > 2000) { // Mark requests over 2 seconds as slow
        performanceMetrics.value.slowRequests++
        console.warn(`Slow API request detected: ${endpoint} took ${requestTime.toFixed(2)}ms`)
      }
      
      // Store successful correlation for debugging
      storeCorrelation(correlationId, {
        endpoint,
        method: options.method || 'GET',
        status: response.status,
        duration: Math.round(requestTime),
        success: true
      })

      return data
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(String(err))
      }
      
      // Attempt retry for network errors
      if (shouldRetry(err, attempt)) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1)
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${RETRY_ATTEMPTS}):`, err.message)
        
        await sleep(delay)
        return request(endpoint, options, attempt + 1)
      }
      
      const standardError = await handleApiError(err)
      error.value = standardError.message
      
      // Update error metrics
      performanceMetrics.value.failedRequests++
      
      // Store failed correlation for debugging
      const requestTime = performance.now() - requestStartTime
      storeCorrelation(correlationId, {
        endpoint,
        method: options.method || 'GET',
        status: standardError.status || 0,
        duration: Math.round(requestTime),
        error: standardError.message,
        success: false
      })
      
      // Add correlation ID to error for tracking
      standardError.correlationId = correlationId
      
      throw standardError
    } finally {
      if (attempt === 1 || attempt >= RETRY_ATTEMPTS) {
        isLoading.value = false
      }
    }
  }

  /**
   * Create a new processing session
   * @param {Object} sessionData - Session configuration
   * @returns {Promise<{session_id: string}>}
   */
  async function createSession(sessionData = {}) {
    const defaultData = {
      session_name:
        sessionData.session_name ||
        `Processing Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      processing_options: {
        validation_enabled: true,
        auto_resolution_enabled: false,
        email_notifications: false,
        ...sessionData.processing_options,
      },
      delta_session_id: sessionData.delta_session_id || null,
    }

    return request('/sessions', {
      method: 'POST',
      body: JSON.stringify(defaultData),
    })
  }

  /**
   * Get session status and details
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function getSession(sessionId) {
    return request(`/sessions/${sessionId}`)
  }

  /**
   * Upload file to session
   * @param {string} sessionId - Session identifier
   * @param {File} file - File to upload
   * @returns {Promise<Object>}
   */
  async function uploadFile(sessionId, file) {
    const formData = new FormData()
    formData.append('file', file)

    return request(`/sessions/${sessionId}/upload`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    })
  }

  /**
   * Start processing uploaded files in session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function startProcessing(sessionId) {
    return request(`/sessions/${sessionId}/process`, {
      method: 'POST',
    })
  }

  /**
   * Get processing status for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function getProcessingStatus(sessionId) {
    return request(`/sessions/${sessionId}/status`)
  }

  /**
   * Get processing results for completed session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function getResults(sessionId) {
    return request(`/sessions/${sessionId}/results`)
  }

  /**
   * Resolve employee validation issue
   * @param {string} sessionId - Session identifier
   * @param {string} revisionId - Employee revision identifier
   * @param {Object} resolutionData - Resolution details
   * @returns {Promise<Object>}
   */
  async function resolveEmployeeIssue(sessionId, revisionId, resolutionData) {
    return request(`/sessions/${sessionId}/employees/${revisionId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(resolutionData),
    })
  }

  /**
   * Bulk resolve multiple employee issues
   * @param {string} sessionId - Session identifier
   * @param {Array} resolutions - Array of resolution objects
   * @returns {Promise<Object>}
   */
  async function bulkResolveIssues(sessionId, resolutions) {
    return request(`/sessions/${sessionId}/resolve-bulk`, {
      method: 'POST',
      body: JSON.stringify({ resolutions }),
    })
  }

  /**
   * Pause processing for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function pauseProcessing(sessionId) {
    return request(`/sessions/${sessionId}/pause`, {
      method: 'POST',
    })
  }

  /**
   * Resume processing for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function resumeProcessing(sessionId) {
    return request(`/sessions/${sessionId}/resume`, {
      method: 'POST',
    })
  }

  /**
   * Cancel processing for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function cancelProcessing(sessionId) {
    return request(`/sessions/${sessionId}/cancel`, {
      method: 'POST',
    })
  }

  /**
   * Export results in specified format
   * @param {string} sessionId - Session identifier
   * @param {string} format - Export format (csv, excel, json)
   * @returns {Promise<Blob>}
   */
  async function exportResults(sessionId, format = 'csv') {
    const response = await fetch(
      `${apiBase}/sessions/${sessionId}/export?format=${format}`
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.detail || `Export failed: ${response.statusText}`
      )
    }

    return response.blob()
  }

  /**
   * Export pVault CSV for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  async function exportPVault(sessionId) {
    const response = await fetch(`${apiBase}/export/${sessionId}/pvault`, {
      headers: {
        Accept: 'text/csv',
        ...getAuthHeaders(),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.detail || `pVault export failed: ${response.statusText}`
      )
    }

    const blob = await response.blob()
    const filename =
      getFilenameFromResponse(response) ||
      generateFilename('pvault', sessionId, 'csv')

    return { blob, filename }
  }

  /**
   * Export follow-up Excel for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  async function exportFollowup(sessionId) {
    const response = await fetch(`${apiBase}/export/${sessionId}/followup`, {
      headers: {
        Accept:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ...getAuthHeaders(),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.detail || `Follow-up export failed: ${response.statusText}`
      )
    }

    const blob = await response.blob()
    const filename =
      getFilenameFromResponse(response) ||
      generateFilename('followup', sessionId, 'xlsx')

    return { blob, filename }
  }

  /**
   * Export issues report for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  async function exportIssues(sessionId) {
    const response = await fetch(`${apiBase}/export/${sessionId}/issues`, {
      headers: {
        Accept: 'application/pdf',
        ...getAuthHeaders(),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.detail ||
          `Issues report export failed: ${response.statusText}`
      )
    }

    const blob = await response.blob()
    const filename =
      getFilenameFromResponse(response) ||
      generateFilename('issues', sessionId, 'pdf')

    return { blob, filename }
  }

  /**
   * Export auto-generated pVault CSV file
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Blob>} CSV blob for download
   */
  async function exportPvaultCSV(sessionId) {
    const response = await request(`/export/download/${sessionId}/pvault/pvault_${sessionId.slice(0, 8)}.csv`, {
      method: 'GET',
      headers: {
        Accept: 'text/csv',
        ...getAuthHeaders(),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.detail || `pVault CSV export failed: ${response.statusText}`
      )
    }

    return await response.blob()
  }

  /**
   * Export auto-generated exception report
   * @param {string} sessionId - Session UUID  
   * @returns {Promise<Blob>} CSV blob for download
   */
  async function exportExceptionReport(sessionId) {
    const response = await request(`/export/download/${sessionId}/exceptions/exceptions_${sessionId.slice(0, 8)}.csv`, {
      method: 'GET',
      headers: {
        Accept: 'text/csv',
        ...getAuthHeaders(),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.detail || `Exception report export failed: ${response.statusText}`
      )
    }

    return await response.blob()
  }

  /**
   * Get session summary with problem-focused metrics
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} Session summary data
   */
  async function getSummary(sessionId) {
    return request(`/sessions/${sessionId}/summary`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
      },
    })
  }

  /**
   * Get employees with issues (exception-based filtering)
   * @param {string} sessionId - Session UUID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Exception data with employees needing attention
   */
  async function getExceptions(sessionId, options = {}) {
    const params = new URLSearchParams()
    
    if (options.issueType) {
      params.append('issue_type', options.issueType)
    }
    if (options.limit) {
      params.append('limit', options.limit)
    }
    if (options.offset) {
      params.append('offset', options.offset)
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    
    return request(`/sessions/${sessionId}/exceptions${queryString}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
      },
    })
  }

  async function getEmployeeLines(sessionId, revisionId, options = {}) {
    const params = new URLSearchParams()
    if (options.source) params.append('source', options.source)
    if (options.limit) params.append('limit', options.limit)
    if (options.offset) params.append('offset', options.offset)
    if (options.include_raw) params.append('include_raw', options.include_raw)
    if (options.min_confidence) params.append('min_confidence', options.min_confidence)

    const qs = params.toString() ? `?${params.toString()}` : ''
    return request(`/sessions/${sessionId}/employees/${revisionId}/lines${qs}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
      },
    })
  }

  /**
   * Request interceptor for authentication and common headers
   * @param {RequestInit} options - Original request options
   * @returns {RequestInit} Enhanced request options
   */
  function requestInterceptor(options) {
    const enhancedOptions = { ...options }
    
    // Ensure headers object exists
    if (!enhancedOptions.headers) {
      enhancedOptions.headers = {}
    }
    
    // Add authentication headers
    Object.assign(enhancedOptions.headers, getAuthHeaders())
    
    // Add request ID for tracing
    enhancedOptions.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Add timestamp
    enhancedOptions.headers['X-Request-Time'] = new Date().toISOString()
    
    return enhancedOptions
  }

  /**
   * Response interceptor for consistent data handling
   * @param {Response} response - Fetch response
   * @param {string} endpoint - Original endpoint
   * @returns {Promise<any>} Processed response data
   */
  async function responseInterceptor(response, endpoint) {
    // Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Success: ${endpoint}`, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      })
    }
    
    // Handle different response types
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      
      // Auto-update store for session status polling only
      if (store && endpoint.includes('/sessions/') && endpoint.includes('/status')) {
        store.updateProcessingStatus(data)
      }
      
      return data
    }
    
    if (contentType?.includes('text/')) {
      return response.text()
    }
    
    // Return response object for binary data (files)
    return response
  }

  /**
   * Extract filename from Content-Disposition header
   * @param {Response} response - Fetch response
   * @returns {string|null} Filename or null
   */
  function getFilenameFromResponse(response) {
    const contentDisposition = response.headers.get('Content-Disposition')
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      )
      if (filenameMatch && filenameMatch[1]) {
        return filenameMatch[1].replace(/['"]/g, '')
      }
    }
    return null
  }

  /**
   * Generate standard filename for exports
   * @param {string} exportType - Type of export (pvault, followup, issues)
   * @param {string} sessionId - Session identifier
   * @param {string} extension - File extension
   * @returns {string} Generated filename
   */
  function generateFilename(exportType, sessionId, extension) {
    const timestamp = new Date().toISOString().split('T')[0]
    const typeMap = {
      pvault: 'pVault',
      followup: 'Followup',
      issues: 'Issues',
    }

    const typeName = typeMap[exportType] || exportType
    return `Session_${sessionId}_${typeName}_${timestamp}.${extension}`
  }

  /**
   * Clear all errors and reset state
   */
  function clearErrors() {
    error.value = null
    if (store) {
      if (store.clearAuthError) store.clearAuthError()
      if (store.clearSessionError) store.clearSessionError()
    }
  }

  /**
   * Check if API is available (health check)
   * @returns {Promise<boolean>}
   */
  async function checkHealth() {
    try {
      const response = await fetch(`${apiBase}/health`, {
        method: 'GET',
        headers: getAuthHeaders()
      })
      return response.ok
    } catch {
      return false
    }
  }

  return {
    // State
    isLoading,
    error,

    // Core Methods
    request,
    clearErrors,
    checkHealth,

    // Session Management
    createSession,
    getSession,
    
    // File Operations
    uploadFile,
    
    // Processing Control
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    getProcessingStatus,
    
    // Results
    getResults,
    
    // Employee Resolution
    resolveEmployeeIssue,
    bulkResolveIssues,
    
    // Export Functions
    exportResults,
    exportPVault,
    exportFollowup,
    exportIssues,
    exportPvaultCSV,
    exportExceptionReport,
    
    // Summary and Exception Functions
    getSummary,
    getExceptions,
    getEmployeeLines,
    
    // Utility Functions
    getAuthHeaders,
    
    // Performance
    performanceMetrics,
    
    // Constants
    RETRY_ATTEMPTS,
    RETRY_DELAY_BASE,
  }
}
