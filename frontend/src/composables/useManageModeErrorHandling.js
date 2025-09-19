import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useManageModeErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Manage mode specific error types
  const MANAGE_MODE_ERRORS = {
    SESSION_SELECTION_FAILED: 'session-selection-failed',
    BULK_DELETE_FAILED: 'bulk-delete-failed',
    BULK_EXPORT_FAILED: 'bulk-export-failed',
    BULK_CLOSE_FAILED: 'bulk-close-failed',
    SESSION_LOAD_FAILED: 'session-load-failed',
    SELECTION_STATS_FAILED: 'selection-stats-failed',
    RANGE_SELECTION_FAILED: 'range-selection-failed',
    KEYBOARD_NAVIGATION_FAILED: 'keyboard-navigation-failed'
  }
  
  // Error recovery strategies for manage mode
  const manageModeRecoveryStrategies = {
    [MANAGE_MODE_ERRORS.SESSION_SELECTION_FAILED]: {
      canRetry: true,
      maxRetries: 2,
      delay: 500,
      fallback: 'manual-selection'
    },
    [MANAGE_MODE_ERRORS.BULK_DELETE_FAILED]: {
      canRetry: true,
      maxRetries: 3,
      delay: 1000,
      fallback: 'individual-delete'
    },
    [MANAGE_MODE_ERRORS.BULK_EXPORT_FAILED]: {
      canRetry: true,
      maxRetries: 2,
      delay: 2000,
      fallback: 'individual-export'
    },
    [MANAGE_MODE_ERRORS.BULK_CLOSE_FAILED]: {
      canRetry: true,
      maxRetries: 2,
      delay: 1000,
      fallback: 'individual-close'
    },
    [MANAGE_MODE_ERRORS.SESSION_LOAD_FAILED]: {
      canRetry: true,
      maxRetries: 3,
      delay: 1000,
      fallback: 'refresh-page'
    },
    [MANAGE_MODE_ERRORS.SELECTION_STATS_FAILED]: {
      canRetry: false,
      maxRetries: 0,
      delay: 0,
      fallback: 'manual-count'
    },
    [MANAGE_MODE_ERRORS.RANGE_SELECTION_FAILED]: {
      canRetry: false,
      maxRetries: 0,
      delay: 0,
      fallback: 'individual-selection'
    },
    [MANAGE_MODE_ERRORS.KEYBOARD_NAVIGATION_FAILED]: {
      canRetry: false,
      maxRetries: 0,
      delay: 0,
      fallback: 'mouse-navigation'
    }
  }
  
  // Handle session selection errors
  function handleSessionSelectionError(error, sessionId, context = {}) {
    const errorContext = {
      sessionId,
      operation: 'session-selection',
      ...context
    }
    
    errorHandling.addError(
      `${MANAGE_MODE_ERRORS.SESSION_SELECTION_FAILED}-${sessionId}`,
      error,
      errorContext
    )
    
    // Provide user feedback
    notificationStore.addWarning(
      `Failed to select session. Please try clicking on the session card again.`
    )
  }
  
  // Handle bulk operation errors
  function handleBulkOperationError(operation, error, sessionIds, context = {}) {
    const errorKey = `bulk-${operation}-${Date.now()}`
    const errorContext = {
      operation,
      sessionIds,
      sessionCount: sessionIds.length,
      ...context
    }
    
    errorHandling.addError(errorKey, error, errorContext)
    
    // Provide specific feedback based on operation
    const operationNames = {
      delete: 'delete',
      export: 'export',
      close: 'close'
    }
    
    const operationName = operationNames[operation] || operation
    notificationStore.addError(
      `Failed to ${operationName} selected sessions. Some sessions may have been processed successfully.`
    )
  }
  
  // Handle partial bulk operation success
  function handlePartialBulkSuccess(operation, results, errors) {
    const { successCount, errorCount, totalCount } = results
    
    if (errorCount > 0) {
      const operationNames = {
        delete: 'deleted',
        export: 'exported',
        close: 'closed'
      }
      
      const operationName = operationNames[operation] || operation
      notificationStore.addWarning(
        `${successCount} of ${totalCount} sessions were ${operationName} successfully. ${errorCount} sessions failed.`
      )
    } else {
      notificationStore.addSuccess(
        `All ${totalCount} sessions were processed successfully.`
      )
    }
  }
  
  // Handle session loading errors
  function handleSessionLoadError(error, context = {}) {
    errorHandling.addError(
      MANAGE_MODE_ERRORS.SESSION_LOAD_FAILED,
      error,
      { operation: 'load-sessions', ...context }
    )
    
    notificationStore.addError(
      'Failed to load sessions. Please refresh the page to try again.'
    )
  }
  
  // Handle selection statistics errors
  function handleSelectionStatsError(error, context = {}) {
    errorHandling.addError(
      MANAGE_MODE_ERRORS.SELECTION_STATS_FAILED,
      error,
      { operation: 'update-selection-stats', ...context }
    )
    
    // This is a non-critical error, so just log it
    console.warn('Selection statistics update failed:', error)
  }
  
  // Handle range selection errors
  function handleRangeSelectionError(error, startIndex, endIndex, context = {}) {
    errorHandling.addError(
      MANAGE_MODE_ERRORS.RANGE_SELECTION_FAILED,
      error,
      { 
        operation: 'range-selection',
        startIndex,
        endIndex,
        ...context 
      }
    )
    
    notificationStore.addInfo(
      'Range selection failed. Please select sessions individually.'
    )
  }
  
  // Handle keyboard navigation errors
  function handleKeyboardNavigationError(error, key, context = {}) {
    errorHandling.addError(
      MANAGE_MODE_ERRORS.KEYBOARD_NAVIGATION_FAILED,
      error,
      { 
        operation: 'keyboard-navigation',
        key,
        ...context 
      }
    )
    
    notificationStore.addInfo(
      'Keyboard navigation failed. Please use mouse to navigate.'
    )
  }
  
  // Execute bulk delete with error handling
  async function executeBulkDeleteWithErrorHandling(sessionIds, deleteFunction, context = {}) {
    try {
      const results = await errorHandling.executeBulkOperation(
        sessionIds.map(id => () => deleteFunction(id)),
        { operation: 'bulk-delete', ...context }
      )
      
      handlePartialBulkSuccess('delete', results, results.errors)
      return results
    } catch (error) {
      handleBulkOperationError('delete', error, sessionIds, context)
      throw error
    }
  }
  
  // Execute bulk export with error handling
  async function executeBulkExportWithErrorHandling(sessionIds, exportFunction, context = {}) {
    try {
      const results = await errorHandling.executeBulkOperation(
        sessionIds.map(id => () => exportFunction(id)),
        { operation: 'bulk-export', ...context }
      )
      
      handlePartialBulkSuccess('export', results, results.errors)
      return results
    } catch (error) {
      handleBulkOperationError('export', error, sessionIds, context)
      throw error
    }
  }
  
  // Execute bulk close with error handling
  async function executeBulkCloseWithErrorHandling(sessionIds, closeFunction, context = {}) {
    try {
      const results = await errorHandling.executeBulkOperation(
        sessionIds.map(id => () => closeFunction(id)),
        { operation: 'bulk-close', ...context }
      )
      
      handlePartialBulkSuccess('close', results, results.errors)
      return results
    } catch (error) {
      handleBulkOperationError('close', error, sessionIds, context)
      throw error
    }
  }
  
  // Get error recovery suggestion
  function getErrorRecoverySuggestion(errorType) {
    const strategies = manageModeRecoveryStrategies[errorType]
    if (!strategies) return 'Please try again or contact support.'
    
    switch (strategies.fallback) {
      case 'manual-selection':
        return 'Please try selecting sessions individually by clicking on them.'
      case 'individual-delete':
        return 'Please try deleting sessions one by one using the individual delete button.'
      case 'individual-export':
        return 'Please try exporting sessions one by one using the individual export button.'
      case 'individual-close':
        return 'Please try closing sessions one by one using the individual close button.'
      case 'refresh-page':
        return 'Please refresh the page to reload the session list.'
      case 'manual-count':
        return 'Selection count may be inaccurate. Please check the selected sessions manually.'
      case 'mouse-navigation':
        return 'Please use mouse clicks instead of keyboard navigation.'
      case 'login-required':
        return 'Please log in again to continue.'
      default:
        return 'Please try again or contact support if the problem persists.'
    }
  }
  
  // Clear manage mode errors
  function clearManageModeErrors() {
    errorHandling.clearErrors()
    notificationStore.clearNotifications()
  }
  
  // Get error summary for debugging
  function getErrorSummary() {
    const errors = errorHandling.errors.value
    const summary = {
      totalErrors: errors.length,
      errorTypes: {},
      recentErrors: errors.slice(-5).map(error => ({
        key: error.key,
        type: error.classification.type,
        severity: error.classification.severity,
        timestamp: error.timestamp,
        retryCount: error.retryCount
      }))
    }
    
    // Count error types
    errors.forEach(error => {
      const type = error.classification.type
      summary.errorTypes[type] = (summary.errorTypes[type] || 0) + 1
    })
    
    return summary
  }
  
  return {
    // Error handling
    ...errorHandling,
    
    // Manage mode specific methods
    handleSessionSelectionError,
    handleBulkOperationError,
    handlePartialBulkSuccess,
    handleSessionLoadError,
    handleSelectionStatsError,
    handleRangeSelectionError,
    handleKeyboardNavigationError,
    
    // Bulk operation methods
    executeBulkDeleteWithErrorHandling,
    executeBulkExportWithErrorHandling,
    executeBulkCloseWithErrorHandling,
    
    // Utility methods
    getErrorRecoverySuggestion,
    clearManageModeErrors,
    getErrorSummary,
    
    // Constants
    MANAGE_MODE_ERRORS
  }
}




