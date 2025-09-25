import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useOfflineErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Offline specific error types
  const OFFLINE_ERRORS = {
    OFFLINE_DETECTION_FAILED: 'offline-detection-failed',
    OFFLINE_SYNC_FAILED: 'offline-sync-failed',
    OFFLINE_STORAGE_FAILED: 'offline-storage-failed',
    OFFLINE_QUEUE_FAILED: 'offline-queue-failed',
    OFFLINE_RETRY_FAILED: 'offline-retry-failed',
    OFFLINE_BACKOFF_FAILED: 'offline-backoff-failed',
    OFFLINE_CONFLICT_FAILED: 'offline-conflict-failed',
    OFFLINE_MERGE_FAILED: 'offline-merge-failed',
    OFFLINE_ROLLBACK_FAILED: 'offline-rollback-failed',
    OFFLINE_COMMIT_FAILED: 'offline-commit-failed',
    OFFLINE_ABORT_FAILED: 'offline-abort-failed',
    OFFLINE_TIMEOUT_FAILED: 'offline-timeout-failed',
    OFFLINE_THROTTLE_FAILED: 'offline-throttle-failed',
    OFFLINE_DEBOUNCE_FAILED: 'offline-debounce-failed',
    OFFLINE_PRIORITY_FAILED: 'offline-priority-failed'
  }
  
  // Handle offline detection errors
  function handleOfflineDetectionError(error, detection, context = {}) {
    const errorContext = {
      operation: 'offline-detection',
      detection,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_DETECTION_FAILED,
      error,
      errorContext
    }
    
    // Offline detection errors are usually non-critical
    console.warn(`Offline detection failed:`, detection)
  }
  
  // Handle offline sync errors
  function handleOfflineSyncError(error, sync, context = {}) {
    const errorContext = {
      operation: 'offline-sync',
      sync,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_SYNC_FAILED,
      error,
      errorContext
    }
    
    // Offline sync errors are usually non-critical
    console.warn(`Offline sync failed:`, sync)
  }
  
  // Handle offline storage errors
  function handleOfflineStorageError(error, storage, context = {}) {
    const errorContext = {
      operation: 'offline-storage',
      storage,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_STORAGE_FAILED,
      error,
      errorContext
    }
    
    // Offline storage errors are usually non-critical
    console.warn(`Offline storage failed:`, storage)
  }
  
  // Handle offline queue errors
  function handleOfflineQueueError(error, queue, context = {}) {
    const errorContext = {
      operation: 'offline-queue',
      queue,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_QUEUE_FAILED,
      error,
      errorContext
    }
    
    // Offline queue errors are usually non-critical
    console.warn(`Offline queue failed:`, queue)
  }
  
  // Handle offline retry errors
  function handleOfflineRetryError(error, retry, context = {}) {
    const errorContext = {
      operation: 'offline-retry',
      retry,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_RETRY_FAILED,
      error,
      errorContext
    }
    
    // Offline retry errors are usually non-critical
    console.warn(`Offline retry failed:`, retry)
  }
  
  // Handle offline backoff errors
  function handleOfflineBackoffError(error, backoff, context = {}) {
    const errorContext = {
      operation: 'offline-backoff',
      backoff,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_BACKOFF_FAILED,
      error,
      errorContext
    }
    
    // Offline backoff errors are usually non-critical
    console.warn(`Offline backoff failed:`, backoff)
  }
  
  // Handle offline conflict errors
  function handleOfflineConflictError(error, conflict, context = {}) {
    const errorContext = {
      operation: 'offline-conflict',
      conflict,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_CONFLICT_FAILED,
      error,
      errorContext
    }
    
    // Offline conflict errors are usually non-critical
    console.warn(`Offline conflict failed:`, conflict)
  }
  
  // Handle offline merge errors
  function handleOfflineMergeError(error, merge, context = {}) {
    const errorContext = {
      operation: 'offline-merge',
      merge,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_MERGE_FAILED,
      error,
      errorContext
    }
    
    // Offline merge errors are usually non-critical
    console.warn(`Offline merge failed:`, merge)
  }
  
  // Handle offline rollback errors
  function handleOfflineRollbackError(error, rollback, context = {}) {
    const errorContext = {
      operation: 'offline-rollback',
      rollback,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_ROLLBACK_FAILED,
      error,
      errorContext
    }
    
    // Offline rollback errors are usually non-critical
    console.warn(`Offline rollback failed:`, rollback)
  }
  
  // Handle offline commit errors
  function handleOfflineCommitError(error, commit, context = {}) {
    const errorContext = {
      operation: 'offline-commit',
      commit,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_COMMIT_FAILED,
      error,
      errorContext
    }
    
    // Offline commit errors are usually non-critical
    console.warn(`Offline commit failed:`, commit)
  }
  
  // Handle offline abort errors
  function handleOfflineAbortError(error, abort, context = {}) {
    const errorContext = {
      operation: 'offline-abort',
      abort,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_ABORT_FAILED,
      error,
      errorContext
    }
    
    // Offline abort errors are usually non-critical
    console.warn(`Offline abort failed:`, abort)
  }
  
  // Handle offline timeout errors
  function handleOfflineTimeoutError(error, timeout, context = {}) {
    const errorContext = {
      operation: 'offline-timeout',
      timeout,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_TIMEOUT_FAILED,
      error,
      errorContext
    }
    
    // Offline timeout errors are usually non-critical
    console.warn(`Offline timeout failed:`, timeout)
  }
  
  // Handle offline throttle errors
  function handleOfflineThrottleError(error, throttle, context = {}) {
    const errorContext = {
      operation: 'offline-throttle',
      throttle,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_THROTTLE_FAILED,
      error,
      errorContext
    }
    
    // Offline throttle errors are usually non-critical
    console.warn(`Offline throttle failed:`, throttle)
  }
  
  // Handle offline debounce errors
  function handleOfflineDebounceError(error, debounce, context = {}) {
    const errorContext = {
      operation: 'offline-debounce',
      debounce,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_DEBOUNCE_FAILED,
      error,
      errorContext
    }
    
    // Offline debounce errors are usually non-critical
    console.warn(`Offline debounce failed:`, debounce)
  }
  
  // Handle offline priority errors
  function handleOfflinePriorityError(error, priority, context = {}) {
    const errorContext = {
      operation: 'offline-priority',
      priority,
      ...context
    }
    
    errorHandling.addError(
      OFFLINE_ERRORS.OFFLINE_PRIORITY_FAILED,
      error,
      errorContext
    }
    
    // Offline priority errors are usually non-critical
    console.warn(`Offline priority failed:`, priority)
  }
  
  // Execute offline operation with error handling
  async function executeOfflineOperation(operation, operationFunction, context = {}) {
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
  
  // Get offline error summary
  function getOfflineErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add offline specific analysis
    summary.offlineErrors = {
      detectionErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_DETECTION_FAILED] || 0,
      syncErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_SYNC_FAILED] || 0,
      storageErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_STORAGE_FAILED] || 0,
      queueErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_QUEUE_FAILED] || 0,
      retryErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_RETRY_FAILED] || 0,
      backoffErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_BACKOFF_FAILED] || 0,
      conflictErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_CONFLICT_FAILED] || 0,
      mergeErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_MERGE_FAILED] || 0,
      rollbackErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_ROLLBACK_FAILED] || 0,
      commitErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_COMMIT_FAILED] || 0,
      abortErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_ABORT_FAILED] || 0,
      timeoutErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_TIMEOUT_FAILED] || 0,
      throttleErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_THROTTLE_FAILED] || 0,
      debounceErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_DEBOUNCE_FAILED] || 0,
      priorityErrors: summary.errorTypes[OFFLINE_ERRORS.OFFLINE_PRIORITY_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear offline errors
  function clearOfflineErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Offline specific methods
    handleOfflineDetectionError,
    handleOfflineSyncError,
    handleOfflineStorageError,
    handleOfflineQueueError,
    handleOfflineRetryError,
    handleOfflineBackoffError,
    handleOfflineConflictError,
    handleOfflineMergeError,
    handleOfflineRollbackError,
    handleOfflineCommitError,
    handleOfflineAbortError,
    handleOfflineTimeoutError,
    handleOfflineThrottleError,
    handleOfflineDebounceError,
    handleOfflinePriorityError,
    
    // Utility methods
    executeOfflineOperation,
    getOfflineErrorSummary,
    clearOfflineErrors,
    
    // Constants
    OFFLINE_ERRORS
  }
}








