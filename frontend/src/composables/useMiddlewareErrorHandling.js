import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useMiddlewareErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Middleware specific error types
  const MIDDLEWARE_ERRORS = {
    MIDDLEWARE_INITIALIZATION_FAILED: 'middleware-initialization-failed',
    MIDDLEWARE_CONFIGURATION_FAILED: 'middleware-configuration-failed',
    MIDDLEWARE_EXECUTION_FAILED: 'middleware-execution-failed',
    MIDDLEWARE_CHAIN_FAILED: 'middleware-chain-failed',
    MIDDLEWARE_ORDER_FAILED: 'middleware-order-failed',
    MIDDLEWARE_PRIORITY_FAILED: 'middleware-priority-failed',
    MIDDLEWARE_CONDITION_FAILED: 'middleware-condition-failed',
    MIDDLEWARE_FILTER_FAILED: 'middleware-filter-failed',
    MIDDLEWARE_TRANSFORM_FAILED: 'middleware-transform-failed',
    MIDDLEWARE_VALIDATE_FAILED: 'middleware-validate-failed',
    MIDDLEWARE_AUTHENTICATE_FAILED: 'middleware-authenticate-failed',
    MIDDLEWARE_AUTHORIZE_FAILED: 'middleware-authorize-failed',
    MIDDLEWARE_RATE_LIMIT_FAILED: 'middleware-rate-limit-failed',
    MIDDLEWARE_CACHE_FAILED: 'middleware-cache-failed',
    MIDDLEWARE_LOGGING_FAILED: 'middleware-logging-failed'
  }
  
  // Handle middleware initialization errors
  function handleMiddlewareInitializationError(error, middlewareName, context = {}) {
    const errorContext = {
      operation: 'middleware-initialization',
      middlewareName,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_INITIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Middleware initialization errors are usually non-critical
    console.warn(`Middleware initialization failed for ${middlewareName}:`, error)
  }
  
  // Handle middleware configuration errors
  function handleMiddlewareConfigurationError(error, middlewareName, config, context = {}) {
    const errorContext = {
      operation: 'middleware-configuration',
      middlewareName,
      config,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_CONFIGURATION_FAILED,
      error,
      errorContext
    }
    
    // Middleware configuration errors are usually non-critical
    console.warn(`Middleware configuration failed for ${middlewareName}:`, config)
  }
  
  // Handle middleware execution errors
  function handleMiddlewareExecutionError(error, middlewareName, execution, context = {}) {
    const errorContext = {
      operation: 'middleware-execution',
      middlewareName,
      execution,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_EXECUTION_FAILED,
      error,
      errorContext
    }
    
    // Middleware execution errors are usually non-critical
    console.warn(`Middleware execution failed for ${middlewareName}:`, execution)
  }
  
  // Handle middleware chain errors
  function handleMiddlewareChainError(error, middlewareName, chain, context = {}) {
    const errorContext = {
      operation: 'middleware-chain',
      middlewareName,
      chain,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_CHAIN_FAILED,
      error,
      errorContext
    }
    
    // Middleware chain errors are usually non-critical
    console.warn(`Middleware chain failed for ${middlewareName}:`, chain)
  }
  
  // Handle middleware order errors
  function handleMiddlewareOrderError(error, middlewareName, order, context = {}) {
    const errorContext = {
      operation: 'middleware-order',
      middlewareName,
      order,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_ORDER_FAILED,
      error,
      errorContext
    }
    
    // Middleware order errors are usually non-critical
    console.warn(`Middleware order failed for ${middlewareName}:`, order)
  }
  
  // Handle middleware priority errors
  function handleMiddlewarePriorityError(error, middlewareName, priority, context = {}) {
    const errorContext = {
      operation: 'middleware-priority',
      middlewareName,
      priority,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_PRIORITY_FAILED,
      error,
      errorContext
    }
    
    // Middleware priority errors are usually non-critical
    console.warn(`Middleware priority failed for ${middlewareName}:`, priority)
  }
  
  // Handle middleware condition errors
  function handleMiddlewareConditionError(error, middlewareName, condition, context = {}) {
    const errorContext = {
      operation: 'middleware-condition',
      middlewareName,
      condition,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_CONDITION_FAILED,
      error,
      errorContext
    }
    
    // Middleware condition errors are usually non-critical
    console.warn(`Middleware condition failed for ${middlewareName}:`, condition)
  }
  
  // Handle middleware filter errors
  function handleMiddlewareFilterError(error, middlewareName, filter, context = {}) {
    const errorContext = {
      operation: 'middleware-filter',
      middlewareName,
      filter,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_FILTER_FAILED,
      error,
      errorContext
    }
    
    // Middleware filter errors are usually non-critical
    console.warn(`Middleware filter failed for ${middlewareName}:`, filter)
  }
  
  // Handle middleware transform errors
  function handleMiddlewareTransformError(error, middlewareName, transform, context = {}) {
    const errorContext = {
      operation: 'middleware-transform',
      middlewareName,
      transform,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_TRANSFORM_FAILED,
      error,
      errorContext
    }
    
    // Middleware transform errors are usually non-critical
    console.warn(`Middleware transform failed for ${middlewareName}:`, transform)
  }
  
  // Handle middleware validate errors
  function handleMiddlewareValidateError(error, middlewareName, validation, context = {}) {
    const errorContext = {
      operation: 'middleware-validate',
      middlewareName,
      validation,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_VALIDATE_FAILED,
      error,
      errorContext
    }
    
    // Middleware validate errors are usually non-critical
    console.warn(`Middleware validate failed for ${middlewareName}:`, validation)
  }
  
  // Handle middleware authenticate errors
  function handleMiddlewareAuthenticateError(error, middlewareName, authentication, context = {}) {
    const errorContext = {
      operation: 'middleware-authenticate',
      middlewareName,
      authentication,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_AUTHENTICATE_FAILED,
      error,
      errorContext
    }
    
    // Middleware authenticate errors are usually non-critical
    console.warn(`Middleware authenticate failed for ${middlewareName}:`, authentication)
  }
  
  // Handle middleware authorize errors
  function handleMiddlewareAuthorizeError(error, middlewareName, authorization, context = {}) {
    const errorContext = {
      operation: 'middleware-authorize',
      middlewareName,
      authorization,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_AUTHORIZE_FAILED,
      error,
      errorContext
    }
    
    // Middleware authorize errors are usually non-critical
    console.warn(`Middleware authorize failed for ${middlewareName}:`, authorization)
  }
  
  // Handle middleware rate limit errors
  function handleMiddlewareRateLimitError(error, middlewareName, rateLimit, context = {}) {
    const errorContext = {
      operation: 'middleware-rate-limit',
      middlewareName,
      rateLimit,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_RATE_LIMIT_FAILED,
      error,
      errorContext
    }
    
    // Middleware rate limit errors are usually non-critical
    console.warn(`Middleware rate limit failed for ${middlewareName}:`, rateLimit)
  }
  
  // Handle middleware cache errors
  function handleMiddlewareCacheError(error, middlewareName, cache, context = {}) {
    const errorContext = {
      operation: 'middleware-cache',
      middlewareName,
      cache,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_CACHE_FAILED,
      error,
      errorContext
    }
    
    // Middleware cache errors are usually non-critical
    console.warn(`Middleware cache failed for ${middlewareName}:`, cache)
  }
  
  // Handle middleware logging errors
  function handleMiddlewareLoggingError(error, middlewareName, logging, context = {}) {
    const errorContext = {
      operation: 'middleware-logging',
      middlewareName,
      logging,
      ...context
    }
    
    errorHandling.addError(
      MIDDLEWARE_ERRORS.MIDDLEWARE_LOGGING_FAILED,
      error,
      errorContext
    }
    
    // Middleware logging errors are usually non-critical
    console.warn(`Middleware logging failed for ${middlewareName}:`, logging)
  }
  
  // Execute middleware operation with error handling
  async function executeMiddlewareOperation(operation, operationFunction, context = {}) {
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
  
  // Get middleware error summary
  function getMiddlewareErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add middleware specific analysis
    summary.middlewareErrors = {
      initializationErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_INITIALIZATION_FAILED] || 0,
      configurationErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_CONFIGURATION_FAILED] || 0,
      executionErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_EXECUTION_FAILED] || 0,
      chainErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_CHAIN_FAILED] || 0,
      orderErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_ORDER_FAILED] || 0,
      priorityErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_PRIORITY_FAILED] || 0,
      conditionErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_CONDITION_FAILED] || 0,
      filterErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_FILTER_FAILED] || 0,
      transformErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_TRANSFORM_FAILED] || 0,
      validateErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_VALIDATE_FAILED] || 0,
      authenticateErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_AUTHENTICATE_FAILED] || 0,
      authorizeErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_AUTHORIZE_FAILED] || 0,
      rateLimitErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_RATE_LIMIT_FAILED] || 0,
      cacheErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_CACHE_FAILED] || 0,
      loggingErrors: summary.errorTypes[MIDDLEWARE_ERRORS.MIDDLEWARE_LOGGING_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear middleware errors
  function clearMiddlewareErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Middleware specific methods
    handleMiddlewareInitializationError,
    handleMiddlewareConfigurationError,
    handleMiddlewareExecutionError,
    handleMiddlewareChainError,
    handleMiddlewareOrderError,
    handleMiddlewarePriorityError,
    handleMiddlewareConditionError,
    handleMiddlewareFilterError,
    handleMiddlewareTransformError,
    handleMiddlewareValidateError,
    handleMiddlewareAuthenticateError,
    handleMiddlewareAuthorizeError,
    handleMiddlewareRateLimitError,
    handleMiddlewareCacheError,
    handleMiddlewareLoggingError,
    
    // Utility methods
    executeMiddlewareOperation,
    getMiddlewareErrorSummary,
    clearMiddlewareErrors,
    
    // Constants
    MIDDLEWARE_ERRORS
  }
}


