import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useSecurityErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Security specific error types
  const SECURITY_ERRORS = {
    AUTHENTICATION_FAILED: 'authentication-failed',
    AUTHORIZATION_FAILED: 'authorization-failed',
    SESSION_EXPIRED: 'session-expired',
    SESSION_INVALID: 'session-invalid',
    TOKEN_EXPIRED: 'token-expired',
    TOKEN_INVALID: 'token-invalid',
    CSRF_TOKEN_FAILED: 'csrf-token-failed',
    XSS_ATTEMPT: 'xss-attempt',
    INJECTION_ATTEMPT: 'injection-attempt',
    UNAUTHORIZED_ACCESS: 'unauthorized-access',
    PRIVILEGE_ESCALATION: 'privilege-escalation',
    DATA_BREACH: 'data-breach',
    SECURITY_HEADER_FAILED: 'security-header-failed',
    CONTENT_SECURITY_POLICY_FAILED: 'content-security-policy-failed',
    HTTPS_REQUIRED: 'https-required'
  }
  
  // Handle authentication errors
  function handleAuthenticationError(error, context = {}) {
    const errorContext = {
      operation: 'authentication',
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.AUTHENTICATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Authentication failed. Please log in again.'
    )
  }
  
  // Handle authorization errors
  function handleAuthorizationError(error, resource, action, context = {}) {
    const errorContext = {
      operation: 'authorization',
      resource,
      action,
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.AUTHORIZATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Access denied. You do not have permission to perform this action.'
    )
  }
  
  // Handle session expired errors
  function handleSessionExpiredError(error, context = {}) {
    const errorContext = {
      operation: 'session-expired',
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.SESSION_EXPIRED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Your session has expired. Please log in again.'
    )
  }
  
  // Handle session invalid errors
  function handleSessionInvalidError(error, context = {}) {
    const errorContext = {
      operation: 'session-invalid',
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.SESSION_INVALID,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Invalid session. Please log in again.'
    )
  }
  
  // Handle token expired errors
  function handleTokenExpiredError(error, context = {}) {
    const errorContext = {
      operation: 'token-expired',
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.TOKEN_EXPIRED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Your access token has expired. Please log in again.'
    )
  }
  
  // Handle token invalid errors
  function handleTokenInvalidError(error, context = {}) {
    const errorContext = {
      operation: 'token-invalid',
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.TOKEN_INVALID,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Invalid access token. Please log in again.'
    )
  }
  
  // Handle CSRF token errors
  function handleCSRFTokenError(error, context = {}) {
    const errorContext = {
      operation: 'csrf-token',
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.CSRF_TOKEN_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Security token validation failed. Please refresh the page and try again.'
    )
  }
  
  // Handle XSS attempt errors
  function handleXSSAttemptError(error, input, context = {}) {
    const errorContext = {
      operation: 'xss-attempt',
      input,
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.XSS_ATTEMPT,
      error,
      errorContext
    )
    
    // XSS attempts should be logged but not shown to user
    console.warn('XSS attempt detected:', input)
  }
  
  // Handle injection attempt errors
  function handleInjectionAttemptError(error, input, context = {}) {
    const errorContext = {
      operation: 'injection-attempt',
      input,
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.INJECTION_ATTEMPT,
      error,
      errorContext
    )
    
    // Injection attempts should be logged but not shown to user
    console.warn('Injection attempt detected:', input)
  }
  
  // Handle unauthorized access errors
  function handleUnauthorizedAccessError(error, resource, context = {}) {
    const errorContext = {
      operation: 'unauthorized-access',
      resource,
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.UNAUTHORIZED_ACCESS,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Unauthorized access attempt detected. Please log in again.'
    )
  }
  
  // Handle privilege escalation errors
  function handlePrivilegeEscalationError(error, context = {}) {
    const errorContext = {
      operation: 'privilege-escalation',
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.PRIVILEGE_ESCALATION,
      error,
      errorContext
    )
    
    // Privilege escalation attempts should be logged but not shown to user
    console.warn('Privilege escalation attempt detected')
  }
  
  // Handle data breach errors
  function handleDataBreachError(error, dataType, context = {}) {
    const errorContext = {
      operation: 'data-breach',
      dataType,
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.DATA_BREACH,
      error,
      errorContext
    )
    
    // Data breach errors should be logged but not shown to user
    console.error('Data breach detected:', dataType)
  }
  
  // Handle security header errors
  function handleSecurityHeaderError(error, header, context = {}) {
    const errorContext = {
      operation: 'security-header',
      header,
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.SECURITY_HEADER_FAILED,
      error,
      errorContext
    )
    
    // Security header errors are usually non-critical
    console.warn(`Security header failed for ${header}:`, error)
  }
  
  // Handle content security policy errors
  function handleContentSecurityPolicyError(error, policy, context = {}) {
    const errorContext = {
      operation: 'content-security-policy',
      policy,
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.CONTENT_SECURITY_POLICY_FAILED,
      error,
      errorContext
    )
    
    // CSP errors are usually non-critical
    console.warn(`Content Security Policy failed for ${policy}:`, error)
  }
  
  // Handle HTTPS required errors
  function handleHTTPSRequiredError(error, context = {}) {
    const errorContext = {
      operation: 'https-required',
      ...context
    }
    
    errorHandling.addError(
      SECURITY_ERRORS.HTTPS_REQUIRED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Secure connection required. Please use HTTPS.'
    )
  }
  
  // Execute security operation with error handling
  async function executeSecurityOperation(operation, operationFunction, context = {}) {
    try {
      return await errorHandling.executeWithErrorHandling(
        operationFunction,
        { operation, ...context }
      )
    } catch (error) {
      // The error handling is already done by executeWithErrorHandling
      throw error
    }
  }
  
  // Get security error summary
  function getSecurityErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add security specific analysis
    summary.securityErrors = {
      authErrors: summary.errorTypes[SECURITY_ERRORS.AUTHENTICATION_FAILED] || 0,
      authzErrors: summary.errorTypes[SECURITY_ERRORS.AUTHORIZATION_FAILED] || 0,
      sessionExpiredErrors: summary.errorTypes[SECURITY_ERRORS.SESSION_EXPIRED] || 0,
      sessionInvalidErrors: summary.errorTypes[SECURITY_ERRORS.SESSION_INVALID] || 0,
      tokenExpiredErrors: summary.errorTypes[SECURITY_ERRORS.TOKEN_EXPIRED] || 0,
      tokenInvalidErrors: summary.errorTypes[SECURITY_ERRORS.TOKEN_INVALID] || 0,
      csrfErrors: summary.errorTypes[SECURITY_ERRORS.CSRF_TOKEN_FAILED] || 0,
      xssAttempts: summary.errorTypes[SECURITY_ERRORS.XSS_ATTEMPT] || 0,
      injectionAttempts: summary.errorTypes[SECURITY_ERRORS.INJECTION_ATTEMPT] || 0,
      unauthorizedAccess: summary.errorTypes[SECURITY_ERRORS.UNAUTHORIZED_ACCESS] || 0,
      privilegeEscalation: summary.errorTypes[SECURITY_ERRORS.PRIVILEGE_ESCALATION] || 0,
      dataBreach: summary.errorTypes[SECURITY_ERRORS.DATA_BREACH] || 0,
      securityHeaderErrors: summary.errorTypes[SECURITY_ERRORS.SECURITY_HEADER_FAILED] || 0,
      cspErrors: summary.errorTypes[SECURITY_ERRORS.CONTENT_SECURITY_POLICY_FAILED] || 0,
      httpsRequiredErrors: summary.errorTypes[SECURITY_ERRORS.HTTPS_REQUIRED] || 0
    }
    
    return summary
  }
  
  // Clear security errors
  function clearSecurityErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Security specific methods
    handleAuthenticationError,
    handleAuthorizationError,
    handleSessionExpiredError,
    handleSessionInvalidError,
    handleTokenExpiredError,
    handleTokenInvalidError,
    handleCSRFTokenError,
    handleXSSAttemptError,
    handleInjectionAttemptError,
    handleUnauthorizedAccessError,
    handlePrivilegeEscalationError,
    handleDataBreachError,
    handleSecurityHeaderError,
    handleContentSecurityPolicyError,
    handleHTTPSRequiredError,
    
    // Utility methods
    executeSecurityOperation,
    getSecurityErrorSummary,
    clearSecurityErrors,
    
    // Constants
    SECURITY_ERRORS
  }
}







