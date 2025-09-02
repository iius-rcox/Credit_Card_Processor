import { ref, inject } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useNotificationStore } from '@/stores/notification'

/**
 * Enhanced API integration composable for Credit Card Processor backend
 * Provides HTTP client with comprehensive error handling, retry logic, and Pinia store integration
 * Phase 2 enhancements: interceptors, retry logic, consistent error handling, performance monitoring
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

  const apiBase = '/api' // Uses Vite proxy to backend

  // Retry configuration
  const RETRY_ATTEMPTS = 3
  const RETRY_DELAY_BASE = 1000 // 1 second
  const RETRY_STATUSES = [408, 429, 500, 502, 503, 504]

  /**
   * Get authentication headers for Windows authentication
   * @returns {Object} Headers object
   */
  function getAuthHeaders() {
    const headers = {}
    
    // In development, use test user header
    if (process.env.NODE_ENV === 'development') {
      headers['x-dev-user'] = 'testuser'
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
    
    if (attempt === 1) {
      isLoading.value = true
      error.value = null
      performanceMetrics.value.requestCount++
    }

    try {
      // Request interceptor - prepare headers
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
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

      // Update store on successful operations
      if (store && endpoint.includes('/sessions') && data.session_id) {
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
      
      // Auto-update store for session-related responses
      if (store) {
        if (endpoint.includes('/sessions/') && endpoint.includes('/status')) {
          store.updateProcessingStatus(data)
        } else if (endpoint.includes('/sessions') && data.session_id) {
          store.updateSessionData(data)
        }
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
    
    // Utility Functions
    getAuthHeaders,
    
    // Performance
    performanceMetrics,
    
    // Constants
    RETRY_ATTEMPTS,
    RETRY_DELAY_BASE,
  }
}
