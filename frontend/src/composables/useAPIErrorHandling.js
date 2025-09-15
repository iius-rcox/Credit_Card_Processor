import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useAPIErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // API specific error types
  const API_ERRORS = {
    NETWORK_ERROR: 'network-error',
    TIMEOUT_ERROR: 'timeout-error',
    CONNECTION_REFUSED: 'connection-refused',
    DNS_RESOLUTION_FAILED: 'dns-resolution-failed',
    SSL_CERTIFICATE_ERROR: 'ssl-certificate-error',
    AUTHENTICATION_FAILED: 'authentication-failed',
    AUTHORIZATION_FAILED: 'authorization-failed',
    RATE_LIMITED: 'rate-limited',
    SERVER_ERROR: 'server-error',
    BAD_REQUEST: 'bad-request',
    NOT_FOUND: 'not-found',
    CONFLICT: 'conflict',
    UNPROCESSABLE_ENTITY: 'unprocessable-entity',
    INTERNAL_SERVER_ERROR: 'internal-server-error',
    SERVICE_UNAVAILABLE: 'service-unavailable',
    GATEWAY_TIMEOUT: 'gateway-timeout',
    REQUEST_TOO_LARGE: 'request-too-large',
    UNSUPPORTED_MEDIA_TYPE: 'unsupported-media-type',
    VALIDATION_ERROR: 'validation-error',
    PARSING_ERROR: 'parsing-error',
    CORS_ERROR: 'cors-error'
  }
  
  // HTTP status code to error type mapping
  const HTTP_STATUS_ERRORS = {
    400: API_ERRORS.BAD_REQUEST,
    401: API_ERRORS.AUTHENTICATION_FAILED,
    403: API_ERRORS.AUTHORIZATION_FAILED,
    404: API_ERRORS.NOT_FOUND,
    409: API_ERRORS.CONFLICT,
    413: API_ERRORS.REQUEST_TOO_LARGE,
    415: API_ERRORS.UNSUPPORTED_MEDIA_TYPE,
    422: API_ERRORS.UNPROCESSABLE_ENTITY,
    429: API_ERRORS.RATE_LIMITED,
    500: API_ERRORS.INTERNAL_SERVER_ERROR,
    502: API_ERRORS.SERVER_ERROR,
    503: API_ERRORS.SERVICE_UNAVAILABLE,
    504: API_ERRORS.GATEWAY_TIMEOUT
  }
  
  // Handle network errors
  function handleNetworkError(error, endpoint, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      errorType: 'network',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.NETWORK_ERROR,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Network error occurred. Please check your internet connection and try again.'
    )
  }
  
  // Handle timeout errors
  function handleTimeoutError(error, endpoint, timeout, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      timeout,
      errorType: 'timeout',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.TIMEOUT_ERROR,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Request timed out after ${timeout}ms. Please try again.`
    )
  }
  
  // Handle connection refused errors
  function handleConnectionRefusedError(error, endpoint, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      errorType: 'connection-refused',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.CONNECTION_REFUSED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Cannot connect to server. Please check if the server is running and try again.'
    )
  }
  
  // Handle DNS resolution errors
  function handleDNSResolutionError(error, endpoint, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      errorType: 'dns-resolution',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.DNS_RESOLUTION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Cannot resolve server address. Please check your network configuration.'
    )
  }
  
  // Handle SSL certificate errors
  function handleSSLCertificateError(error, endpoint, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      errorType: 'ssl-certificate',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.SSL_CERTIFICATE_ERROR,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'SSL certificate error. Please check your connection security.'
    )
  }
  
  // Handle authentication errors
  function handleAuthenticationError(error, endpoint, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      errorType: 'authentication',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.AUTHENTICATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Authentication failed. Please log in again.'
    )
  }
  
  // Handle authorization errors
  function handleAuthorizationError(error, endpoint, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      errorType: 'authorization',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.AUTHORIZATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Access denied. You do not have permission to perform this action.'
    )
  }
  
  // Handle rate limiting errors
  function handleRateLimitError(error, endpoint, retryAfter, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      retryAfter,
      errorType: 'rate-limit',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.RATE_LIMITED,
      error,
      errorContext
    )
    
    const retryTime = Math.ceil(retryAfter / 1000)
    notificationStore.addWarning(
      `Too many requests. Please wait ${retryTime} seconds before trying again.`
    )
  }
  
  // Handle server errors
  function handleServerError(error, endpoint, statusCode, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      statusCode,
      errorType: 'server',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.SERVER_ERROR,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Server error occurred (${statusCode}). Please try again later.`
    )
  }
  
  // Handle bad request errors
  function handleBadRequestError(error, endpoint, validationErrors, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      validationErrors,
      errorType: 'bad-request',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.BAD_REQUEST,
      error,
      errorContext
    )
    
    if (validationErrors && validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => err.message).join(', ')
      notificationStore.addError(
        `Invalid request: ${errorMessages}`
      )
    } else {
      notificationStore.addError(
        'Invalid request. Please check your input and try again.'
      )
    }
  }
  
  // Handle not found errors
  function handleNotFoundError(error, endpoint, resource, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      resource,
      errorType: 'not-found',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.NOT_FOUND,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `${resource || 'Resource'} not found. It may have been deleted.`
    )
  }
  
  // Handle conflict errors
  function handleConflictError(error, endpoint, conflictReason, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      conflictReason,
      errorType: 'conflict',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.CONFLICT,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Conflict occurred: ${conflictReason || 'Resource conflict'}. Please try again.`
    )
  }
  
  // Handle validation errors
  function handleValidationError(error, endpoint, validationErrors, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      validationErrors,
      errorType: 'validation',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.VALIDATION_ERROR,
      error,
      errorContext
    )
    
    if (validationErrors && validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => err.message).join(', ')
      notificationStore.addError(
        `Validation failed: ${errorMessages}`
      )
    } else {
      notificationStore.addError(
        'Validation failed. Please check your input and try again.'
      )
    }
  }
  
  // Handle parsing errors
  function handleParsingError(error, endpoint, responseData, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      responseData,
      errorType: 'parsing',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.PARSING_ERROR,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Failed to parse server response. Please try again.'
    )
  }
  
  // Handle CORS errors
  function handleCORSError(error, endpoint, context = {}) {
    const errorContext = {
      operation: 'api-request',
      endpoint,
      errorType: 'cors',
      ...context
    }
    
    errorHandling.addError(
      API_ERRORS.CORS_ERROR,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Cross-origin request blocked. Please check your server configuration.'
    )
  }
  
  // Handle HTTP response errors
  function handleHTTPResponseError(error, endpoint, statusCode, context = {}) {
    const errorType = HTTP_STATUS_ERRORS[statusCode] || API_ERRORS.SERVER_ERROR
    
    const errorContext = {
      operation: 'api-request',
      endpoint,
      statusCode,
      errorType: 'http-response',
      ...context
    }
    
    errorHandling.addError(
      errorType,
      error,
      errorContext
    )
    
    // Provide specific error messages based on status code
    switch (statusCode) {
      case 400:
        handleBadRequestError(error, endpoint, error.response?.data?.errors, context)
        break
      case 401:
        handleAuthenticationError(error, endpoint, context)
        break
      case 403:
        handleAuthorizationError(error, endpoint, context)
        break
      case 404:
        handleNotFoundError(error, endpoint, context.resource, context)
        break
      case 409:
        handleConflictError(error, endpoint, error.response?.data?.message, context)
        break
      case 422:
        handleValidationError(error, endpoint, error.response?.data?.errors, context)
        break
      case 429:
        const retryAfter = error.response?.headers?.['retry-after'] || 60000
        handleRateLimitError(error, endpoint, retryAfter, context)
        break
      case 500:
      case 502:
      case 503:
      case 504:
        handleServerError(error, endpoint, statusCode, context)
        break
      default:
        notificationStore.addError(
          `Request failed with status ${statusCode}. Please try again.`
        )
    }
  }
  
  // Execute API request with error handling
  async function executeAPIRequest(requestFunction, endpoint, context = {}) {
    try {
      return await errorHandling.executeWithErrorHandling(
        requestFunction,
        { operation: 'api-request', endpoint, ...context }
      )
    } catch (error) {
      // Handle specific error types
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        handleNetworkError(error, endpoint, context)
      } else if (error.name === 'TimeoutError') {
        handleTimeoutError(error, endpoint, context.timeout, context)
      } else if (error.code === 'ECONNREFUSED') {
        handleConnectionRefusedError(error, endpoint, context)
      } else if (error.code === 'ENOTFOUND') {
        handleDNSResolutionError(error, endpoint, context)
      } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'CERT_UNTRUSTED') {
        handleSSLCertificateError(error, endpoint, context)
      } else if (error.response) {
        handleHTTPResponseError(error, endpoint, error.response.status, context)
      } else if (error.name === 'SyntaxError') {
        handleParsingError(error, endpoint, error.response?.data, context)
      } else if (error.name === 'CORS') {
        handleCORSError(error, endpoint, context)
      } else {
        // Generic error handling
        errorHandling.addError(
          API_ERRORS.SERVER_ERROR,
          error,
          { operation: 'api-request', endpoint, ...context }
        )
        notificationStore.addError(
          'An unexpected error occurred. Please try again.'
        )
      }
      
      throw error
    }
  }
  
  // Get API error summary
  function getAPIErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add API specific analysis
    summary.apiErrors = {
      networkErrors: summary.errorTypes[API_ERRORS.NETWORK_ERROR] || 0,
      timeoutErrors: summary.errorTypes[API_ERRORS.TIMEOUT_ERROR] || 0,
      connectionErrors: summary.errorTypes[API_ERRORS.CONNECTION_REFUSED] || 0,
      dnsErrors: summary.errorTypes[API_ERRORS.DNS_RESOLUTION_FAILED] || 0,
      sslErrors: summary.errorTypes[API_ERRORS.SSL_CERTIFICATE_ERROR] || 0,
      authErrors: summary.errorTypes[API_ERRORS.AUTHENTICATION_FAILED] || 0,
      authzErrors: summary.errorTypes[API_ERRORS.AUTHORIZATION_FAILED] || 0,
      rateLimitErrors: summary.errorTypes[API_ERRORS.RATE_LIMITED] || 0,
      serverErrors: summary.errorTypes[API_ERRORS.SERVER_ERROR] || 0,
      badRequestErrors: summary.errorTypes[API_ERRORS.BAD_REQUEST] || 0,
      notFoundErrors: summary.errorTypes[API_ERRORS.NOT_FOUND] || 0,
      conflictErrors: summary.errorTypes[API_ERRORS.CONFLICT] || 0,
      validationErrors: summary.errorTypes[API_ERRORS.VALIDATION_ERROR] || 0,
      parsingErrors: summary.errorTypes[API_ERRORS.PARSING_ERROR] || 0,
      corsErrors: summary.errorTypes[API_ERRORS.CORS_ERROR] || 0
    }
    
    return summary
  }
  
  // Clear API errors
  function clearAPIErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // API specific methods
    handleNetworkError,
    handleTimeoutError,
    handleConnectionRefusedError,
    handleDNSResolutionError,
    handleSSLCertificateError,
    handleAuthenticationError,
    handleAuthorizationError,
    handleRateLimitError,
    handleServerError,
    handleBadRequestError,
    handleNotFoundError,
    handleConflictError,
    handleValidationError,
    handleParsingError,
    handleCORSError,
    handleHTTPResponseError,
    
    // Utility methods
    executeAPIRequest,
    getAPIErrorSummary,
    clearAPIErrors,
    
    // Constants
    API_ERRORS,
    HTTP_STATUS_ERRORS
  }
}


