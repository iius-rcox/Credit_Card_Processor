import { useManageModeErrorHandling } from './useManageModeErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useBulkOperationErrorHandling() {
  const manageModeErrorHandling = useManageModeErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Bulk operation specific error types
  const BULK_OPERATION_ERRORS = {
    BULK_DELETE_FAILED: 'bulk-delete-failed',
    BULK_EXPORT_FAILED: 'bulk-export-failed',
    BULK_CLOSE_FAILED: 'bulk-close-failed',
    BULK_RENAME_FAILED: 'bulk-rename-failed',
    BULK_REPROCESS_FAILED: 'bulk-reprocess-failed',
    PARTIAL_BULK_SUCCESS: 'partial-bulk-success',
    BULK_VALIDATION_FAILED: 'bulk-validation-failed',
    BULK_PERMISSION_DENIED: 'bulk-permission-denied',
    BULK_RATE_LIMITED: 'bulk-rate-limited',
    BULK_TIMEOUT: 'bulk-timeout'
  }
  
  // Bulk operation configuration
  const BULK_OPERATION_CONFIG = {
    delete: {
      maxConcurrent: 5,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    export: {
      maxConcurrent: 3,
      timeout: 60000,
      retryAttempts: 2,
      retryDelay: 2000
    },
    close: {
      maxConcurrent: 10,
      timeout: 20000,
      retryAttempts: 2,
      retryDelay: 1000
    },
    rename: {
      maxConcurrent: 5,
      timeout: 15000,
      retryAttempts: 2,
      retryDelay: 1000
    },
    reprocess: {
      maxConcurrent: 2,
      timeout: 120000,
      retryAttempts: 1,
      retryDelay: 5000
    }
  }
  
  // Handle bulk operation validation errors
  function handleBulkValidationError(operation, sessionIds, validationErrors, context = {}) {
    const errorContext = {
      operation: `bulk-${operation}-validation`,
      sessionIds,
      validationErrors,
      ...context
    }
    
    manageModeErrorHandling.addError(
      BULK_OPERATION_ERRORS.BULK_VALIDATION_FAILED,
      new Error(`Validation failed for ${operation} operation`),
      errorContext
    )
    
    const errorMessages = validationErrors.map(error => error.message).join(', ')
    notificationStore.addError(
      `Cannot ${operation} selected sessions: ${errorMessages}`
    )
  }
  
  // Handle bulk operation permission errors
  function handleBulkPermissionError(operation, sessionIds, context = {}) {
    const errorContext = {
      operation: `bulk-${operation}-permission`,
      sessionIds,
      ...context
    }
    
    manageModeErrorHandling.addError(
      BULK_OPERATION_ERRORS.BULK_PERMISSION_DENIED,
      new Error(`Permission denied for ${operation} operation`),
      errorContext
    )
    
    notificationStore.addError(
      `You do not have permission to ${operation} the selected sessions.`
    )
  }
  
  // Handle bulk operation rate limiting
  function handleBulkRateLimitError(operation, sessionIds, retryAfter, context = {}) {
    const errorContext = {
      operation: `bulk-${operation}-rate-limit`,
      sessionIds,
      retryAfter,
      ...context
    }
    
    manageModeErrorHandling.addError(
      BULK_OPERATION_ERRORS.BULK_RATE_LIMITED,
      new Error(`Rate limited for ${operation} operation`),
      errorContext
    )
    
    const retryTime = Math.ceil(retryAfter / 1000)
    notificationStore.addWarning(
      `Too many ${operation} requests. Please wait ${retryTime} seconds before trying again.`
    )
  }
  
  // Handle bulk operation timeout
  function handleBulkTimeoutError(operation, sessionIds, timeout, context = {}) {
    const errorContext = {
      operation: `bulk-${operation}-timeout`,
      sessionIds,
      timeout,
      ...context
    }
    
    manageModeErrorHandling.addError(
      BULK_OPERATION_ERRORS.BULK_TIMEOUT,
      new Error(`Timeout for ${operation} operation`),
      errorContext
    )
    
    notificationStore.addError(
      `${operation} operation timed out. Some sessions may have been processed.`
    )
  }
  
  // Handle partial bulk operation success
  function handlePartialBulkSuccess(operation, results, context = {}) {
    const { successCount, errorCount, totalCount, errors } = results
    
    const errorContext = {
      operation: `bulk-${operation}-partial-success`,
      successCount,
      errorCount,
      totalCount,
      errors,
      ...context
    }
    
    manageModeErrorHandling.addError(
      BULK_OPERATION_ERRORS.PARTIAL_BULK_SUCCESS,
      new Error(`Partial success for ${operation} operation`),
      errorContext
    )
    
    if (errorCount > 0) {
      const operationNames = {
        delete: 'deleted',
        export: 'exported',
        close: 'closed',
        rename: 'renamed',
        reprocess: 'reprocessed'
      }
      
      const operationName = operationNames[operation] || operation
      notificationStore.addWarning(
        `${successCount} of ${totalCount} sessions were ${operationName} successfully. ${errorCount} sessions failed.`
      )
    } else {
      notificationStore.addSuccess(
        `All ${totalCount} sessions were ${operation}ed successfully.`
      )
    }
  }
  
  // Execute bulk operation with error handling
  async function executeBulkOperation(operation, sessionIds, operationFunction, context = {}) {
    const config = BULK_OPERATION_CONFIG[operation]
    if (!config) {
      throw new Error(`Unknown bulk operation: ${operation}`)
    }
    
    // Validate session IDs
    if (!sessionIds || sessionIds.length === 0) {
      throw new Error('No sessions selected for bulk operation')
    }
    
    // Check for duplicate session IDs
    const uniqueSessionIds = [...new Set(sessionIds)]
    if (uniqueSessionIds.length !== sessionIds.length) {
      console.warn('Duplicate session IDs found in bulk operation')
    }
    
    try {
      // Execute the bulk operation with concurrency control
      const results = await executeBulkOperationWithConcurrency(
        operation,
        uniqueSessionIds,
        operationFunction,
        config,
        context
      )
      
      // Handle partial success if there were errors
      if (results.errorCount > 0) {
        handlePartialBulkSuccess(operation, results, context)
      } else {
        notificationStore.addSuccess(
          `All ${results.totalCount} sessions were ${operation}ed successfully.`
        )
      }
      
      return results
    } catch (error) {
      // Handle specific error types
      if (error.name === 'ValidationError') {
        handleBulkValidationError(operation, sessionIds, error.errors, context)
      } else if (error.response?.status === 403) {
        handleBulkPermissionError(operation, sessionIds, context)
      } else if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60000
        handleBulkRateLimitError(operation, sessionIds, retryAfter, context)
      } else if (error.name === 'TimeoutError') {
        handleBulkTimeoutError(operation, sessionIds, config.timeout, context)
      } else {
        manageModeErrorHandling.handleBulkOperationError(operation, error, sessionIds, context)
      }
      
      throw error
    }
  }
  
  // Execute bulk operation with concurrency control
  async function executeBulkOperationWithConcurrency(operation, sessionIds, operationFunction, config, context) {
    const results = {
      successCount: 0,
      errorCount: 0,
      totalCount: sessionIds.length,
      errors: [],
      successfulSessions: [],
      failedSessions: []
    }
    
    // Process sessions in batches to control concurrency
    const batches = []
    for (let i = 0; i < sessionIds.length; i += config.maxConcurrent) {
      batches.push(sessionIds.slice(i, i + config.maxConcurrent))
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (sessionId) => {
        try {
          const result = await Promise.race([
            operationFunction(sessionId),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('TimeoutError')), config.timeout)
            )
          ])
          
          results.successCount++
          results.successfulSessions.push(sessionId)
          return { sessionId, success: true, result }
        } catch (error) {
          results.errorCount++
          results.failedSessions.push(sessionId)
          results.errors.push({ sessionId, error })
          return { sessionId, success: false, error }
        }
      })
      
      await Promise.allSettled(batchPromises)
    }
    
    return results
  }
  
  // Execute bulk delete with error handling
  async function executeBulkDelete(sessionIds, deleteFunction, context = {}) {
    return executeBulkOperation('delete', sessionIds, deleteFunction, context)
  }
  
  // Execute bulk export with error handling
  async function executeBulkExport(sessionIds, exportFunction, context = {}) {
    return executeBulkOperation('export', sessionIds, exportFunction, context)
  }
  
  // Execute bulk close with error handling
  async function executeBulkClose(sessionIds, closeFunction, context = {}) {
    return executeBulkOperation('close', sessionIds, closeFunction, context)
  }
  
  // Execute bulk rename with error handling
  async function executeBulkRename(sessionIds, renameFunction, context = {}) {
    return executeBulkOperation('rename', sessionIds, renameFunction, context)
  }
  
  // Execute bulk reprocess with error handling
  async function executeBulkReprocess(sessionIds, reprocessFunction, context = {}) {
    return executeBulkOperation('reprocess', sessionIds, reprocessFunction, context)
  }
  
  // Get bulk operation error summary
  function getBulkOperationErrorSummary() {
    const summary = manageModeErrorHandling.getErrorSummary()
    
    // Add bulk operation specific analysis
    summary.bulkOperationErrors = {
      deleteErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_DELETE_FAILED] || 0,
      exportErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_EXPORT_FAILED] || 0,
      closeErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_CLOSE_FAILED] || 0,
      renameErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_RENAME_FAILED] || 0,
      reprocessErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_REPROCESS_FAILED] || 0,
      validationErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_VALIDATION_FAILED] || 0,
      permissionErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_PERMISSION_DENIED] || 0,
      rateLimitErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_RATE_LIMITED] || 0,
      timeoutErrors: summary.errorTypes[BULK_OPERATION_ERRORS.BULK_TIMEOUT] || 0,
      partialSuccesses: summary.errorTypes[BULK_OPERATION_ERRORS.PARTIAL_BULK_SUCCESS] || 0
    }
    
    return summary
  }
  
  // Clear bulk operation errors
  function clearBulkOperationErrors() {
    manageModeErrorHandling.clearManageModeErrors()
  }
  
  return {
    // Inherit all manage mode error handling
    ...manageModeErrorHandling,
    
    // Bulk operation specific methods
    handleBulkValidationError,
    handleBulkPermissionError,
    handleBulkRateLimitError,
    handleBulkTimeoutError,
    handlePartialBulkSuccess,
    
    // Bulk operation execution methods
    executeBulkOperation,
    executeBulkDelete,
    executeBulkExport,
    executeBulkClose,
    executeBulkRename,
    executeBulkReprocess,
    
    // Utility methods
    getBulkOperationErrorSummary,
    clearBulkOperationErrors,
    
    // Constants
    BULK_OPERATION_ERRORS,
    BULK_OPERATION_CONFIG
  }
}




