import { ref, computed } from 'vue'
import { useNotificationStore } from '@/stores/notification'

export function useErrorHandling() {
  const notificationStore = useNotificationStore()
  
  // Error state
  const errors = ref(new Map())
  const isRetrying = ref(false)
  const retryCount = ref(0)
  const maxRetries = ref(3)
  
  // Error types
  const ERROR_TYPES = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    PERMISSION: 'permission',
    TIMEOUT: 'timeout',
    UNKNOWN: 'unknown'
  }
  
  // Error severity levels
  const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
  
  // Computed properties
  const hasErrors = computed(() => errors.value.size > 0)
  const errorCount = computed(() => errors.value.size)
  const canRetry = computed(() => retryCount.value < maxRetries.value && !isRetrying.value)
  
  // Error classification
  function classifyError(error) {
    if (!error) return { type: ERROR_TYPES.UNKNOWN, severity: SEVERITY_LEVELS.MEDIUM }
    
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      return { type: ERROR_TYPES.NETWORK, severity: SEVERITY_LEVELS.HIGH }
    }
    
    // Timeout errors
    if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      return { type: ERROR_TYPES.TIMEOUT, severity: SEVERITY_LEVELS.MEDIUM }
    }
    
    // Validation errors
    if (error.status === 400 || error.message?.includes('validation')) {
      return { type: ERROR_TYPES.VALIDATION, severity: SEVERITY_LEVELS.LOW }
    }
    
    // Permission errors
    if (error.status === 403 || error.message?.includes('permission')) {
      return { type: ERROR_TYPES.PERMISSION, severity: SEVERITY_LEVELS.HIGH }
    }
    
    // Server errors
    if (error.status >= 500) {
      return { type: ERROR_TYPES.NETWORK, severity: SEVERITY_LEVELS.CRITICAL }
    }
    
    return { type: ERROR_TYPES.UNKNOWN, severity: SEVERITY_LEVELS.MEDIUM }
  }
  
  // Add error
  function addError(key, error, context = {}) {
    const classification = classifyError(error)
    const errorData = {
      key,
      error,
      context,
      classification,
      timestamp: new Date().toISOString(),
      retryCount: 0
    }
    
    errors.value.set(key, errorData)
    
    // Show notification based on severity
    const message = getErrorMessage(error, context)
    switch (classification.severity) {
      case SEVERITY_LEVELS.CRITICAL:
        notificationStore.addError(message, { persistent: true })
        break
      case SEVERITY_LEVELS.HIGH:
        notificationStore.addError(message)
        break
      case SEVERITY_LEVELS.MEDIUM:
        notificationStore.addWarning(message)
        break
      case SEVERITY_LEVELS.LOW:
        notificationStore.addInfo(message)
        break
    }
    
    console.error(`[ErrorHandler] ${key}:`, error, context)
  }
  
  // Remove error
  function removeError(key) {
    errors.value.delete(key)
  }
  
  // Clear all errors
  function clearErrors() {
    errors.value.clear()
    retryCount.value = 0
    isRetrying.value = false
  }
  
  // Get error message
  function getErrorMessage(error, context = {}) {
    if (error.message) {
      return error.message
    }
    
    // Default messages based on error type
    const classification = classifyError(error)
    switch (classification.type) {
      case ERROR_TYPES.NETWORK:
        return 'Network connection failed. Please check your internet connection.'
      case ERROR_TYPES.TIMEOUT:
        return 'Request timed out. Please try again.'
      case ERROR_TYPES.VALIDATION:
        return 'Invalid data provided. Please check your input.'
      case ERROR_TYPES.PERMISSION:
        return 'You do not have permission to perform this action.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }
  
  // Retry mechanism
  async function retryOperation(operation, key, delay = 1000) {
    if (!canRetry.value) {
      throw new Error('Maximum retry attempts exceeded')
    }
    
    isRetrying.value = true
    retryCount.value++
    
    try {
      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, retryCount.value - 1)
      await new Promise(resolve => setTimeout(resolve, backoffDelay))
      
      const result = await operation()
      
      // Success - remove error and reset retry count
      removeError(key)
      retryCount.value = 0
      isRetrying.value = false
      
      notificationStore.addSuccess('Operation completed successfully')
      return result
    } catch (error) {
      isRetrying.value = false
      
      // Update error with retry count
      const existingError = errors.value.get(key)
      if (existingError) {
        existingError.retryCount = retryCount.value
        errors.value.set(key, existingError)
      }
      
      // If max retries reached, show final error
      if (retryCount.value >= maxRetries.value) {
        notificationStore.addError(`Operation failed after ${maxRetries.value} attempts`)
        throw error
      }
      
      // Otherwise, throw to allow another retry
      throw error
    }
  }
  
  // Error recovery strategies
  const recoveryStrategies = {
    [ERROR_TYPES.NETWORK]: {
      canRetry: true,
      maxRetries: 3,
      delay: 1000,
      fallback: 'offline-mode'
    },
    [ERROR_TYPES.TIMEOUT]: {
      canRetry: true,
      maxRetries: 2,
      delay: 500,
      fallback: 'reduced-timeout'
    },
    [ERROR_TYPES.VALIDATION]: {
      canRetry: false,
      maxRetries: 0,
      delay: 0,
      fallback: 'user-input'
    },
    [ERROR_TYPES.PERMISSION]: {
      canRetry: false,
      maxRetries: 0,
      delay: 0,
      fallback: 'login-required'
    }
  }
  
  // Get recovery strategy for error
  function getRecoveryStrategy(error) {
    const classification = classifyError(error)
    return recoveryStrategies[classification.type] || recoveryStrategies[ERROR_TYPES.UNKNOWN]
  }
  
  // Execute operation with error handling
  async function executeWithErrorHandling(operation, key, context = {}) {
    try {
      return await operation()
    } catch (error) {
      addError(key, error, context)
      
      const strategy = getRecoveryStrategy(error)
      if (strategy.canRetry && canRetry.value) {
        return await retryOperation(operation, key, strategy.delay)
      }
      
      throw error
    }
  }
  
  // Bulk operation error handling
  async function executeBulkOperation(operations, context = {}) {
    const results = []
    const errors = []
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await executeWithErrorHandling(
          operations[i],
          `bulk-operation-${i}`,
          { ...context, operationIndex: i }
        )
        results.push(result)
      } catch (error) {
        errors.push({ index: i, error })
      }
    }
    
    return {
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
      totalCount: operations.length
    }
  }
  
  // Error reporting
  function reportError(error, context = {}) {
    // In a real application, this would send to an error reporting service
    console.error('[ErrorReport]', {
      error: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })
  }
  
  return {
    // State
    errors: computed(() => Array.from(errors.value.values())),
    hasErrors,
    errorCount,
    isRetrying,
    canRetry,
    retryCount,
    
    // Methods
    addError,
    removeError,
    clearErrors,
    retryOperation,
    executeWithErrorHandling,
    executeBulkOperation,
    getErrorMessage,
    getRecoveryStrategy,
    reportError,
    
    // Constants
    ERROR_TYPES,
    SEVERITY_LEVELS
  }
}


