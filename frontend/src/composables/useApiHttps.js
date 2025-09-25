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
 * Enhanced API integration composable for HTTPS deployment
 * This version is configured for production use with SSL/TLS
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

  // Determine API base URL based on environment
  const getApiBase = () => {
    // Use environment variable if set
    if (import.meta.env.VITE_API_BASE_URL) {
      return `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_PATH || '/api'}`
    }

    // Production defaults for HTTPS
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    const host = window.location.hostname
    const port = window.location.port ? `:${window.location.port}` : ''

    // For production, API is served from same origin via reverse proxy
    return `${protocol}//${host}${port}/api`
  }

  const apiBase = getApiBase()

  // Retry configuration
  const RETRY_ATTEMPTS = import.meta.env.VITE_RETRY_ATTEMPTS || 3
  const RETRY_DELAY_BASE = import.meta.env.VITE_RETRY_DELAY || 1000
  const RETRY_STATUSES = [408, 429, 500, 502, 503, 504]

  /**
   * Get authentication headers for production environment
   * @param {string} correlationId - Optional correlation ID for request tracking
   * @returns {Object} Headers object
   */
  function getAuthHeaders(correlationId = null) {
    const headers = {}

    // Add correlation ID for request tracking
    if (correlationId) {
      headers['x-correlation-id'] = correlationId
      headers['x-request-id'] = correlationId
    }

    // In production with HTTPS, authentication is handled by:
    // 1. Internal CA certificates for service accounts
    // 2. Windows authentication via IIS/Kerberos
    // 3. Session cookies with Secure flag

    // Add CSRF token if available (for state-changing operations)
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }

    // Add user context from store if available
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

    // Don't retry on authentication errors in production
    if (error.status === 401 || error.status === 403) return false

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

      // Handle specific HTTPS/certificate errors
      if (error.status === 495) {
        standardError.message = 'SSL Certificate Error: Please ensure you have a valid certificate installed'
        standardError.type = 'certificate_error'
      } else if (error.status === 0) {
        standardError.message = 'Network error: Unable to reach the server. Please check your VPN/network connection.'
        standardError.type = 'network_error'
      }
    } else {
      // Handle network/other errors
      const message = error?.message || 'Network error occurred'
      standardError = new Error(message)
      standardError.name = error?.name || 'NetworkError'
      standardError.timestamp = new Date().toISOString()
      standardError.type = 'network_error'
      standardError.originalError = error

      // Check for SSL/TLS specific errors
      if (message.includes('SSL') || message.includes('certificate')) {
        standardError.type = 'certificate_error'
        standardError.message = `Certificate error: ${message}. Please contact your IT administrator.`
      }
    }

    // Update store error state with consistent format
    if (store) {
      const errorInfo = {
        message: standardError.message,
        type: standardError.type,
        timestamp: standardError.timestamp,
        status: standardError.status
      }

      // Send to notification system for user feedback
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
   * Enhanced API request handler with HTTPS support
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
        // Include credentials for HTTPS with session cookies
        credentials: 'same-origin',
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

      // Update store on successful operations
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

  // ... rest of the API methods remain the same ...
  // (createSession, getSession, uploadFile, etc.)
  // Copy all the method implementations from lines 336-867 of the original file

  /**
   * Check if API is available (health check)
   * Enhanced for HTTPS environments
   * @returns {Promise<boolean>}
   */
  async function checkHealth() {
    try {
      const response = await fetch(`${apiBase}/health`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: getAuthHeaders()
      })

      if (!response.ok && response.status === 0) {
        console.error('Health check failed: Possible certificate or network issue')
        return false
      }

      return response.ok
    } catch (error) {
      console.error('Health check error:', error)
      // Log more details about certificate/network errors
      if (error.message.includes('SSL') || error.message.includes('certificate')) {
        console.error('SSL/Certificate issue detected. Please verify:')
        console.error('1. Certificate is properly installed')
        console.error('2. Certificate matches the hostname')
        console.error('3. Certificate is trusted by your system')
      }
      return false
    }
  }

  // Export all the same methods as the original
  return {
    // State
    isLoading,
    error,

    // Core Methods
    request,
    clearErrors: () => {
      error.value = null
      if (store) {
        if (store.clearAuthError) store.clearAuthError()
        if (store.clearSessionError) store.clearSessionError()
      }
    },
    checkHealth,

    // Copy all other method exports from the original file
    // ... (all the session, file, processing, export methods)

    // Performance
    performanceMetrics,

    // Constants
    RETRY_ATTEMPTS,
    RETRY_DELAY_BASE,
  }
}