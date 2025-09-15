import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useServiceWorkerErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Service worker specific error types
  const SERVICE_WORKER_ERRORS = {
    SERVICE_WORKER_REGISTRATION_FAILED: 'service-worker-registration-failed',
    SERVICE_WORKER_UNREGISTRATION_FAILED: 'service-worker-unregistration-failed',
    SERVICE_WORKER_ACTIVATION_FAILED: 'service-worker-activation-failed',
    SERVICE_WORKER_INSTALLATION_FAILED: 'service-worker-installation-failed',
    SERVICE_WORKER_UPDATE_FAILED: 'service-worker-update-failed',
    SERVICE_WORKER_MESSAGE_FAILED: 'service-worker-message-failed',
    SERVICE_WORKER_SYNC_FAILED: 'service-worker-sync-failed',
    SERVICE_WORKER_PUSH_FAILED: 'service-worker-push-failed',
    SERVICE_WORKER_NOTIFICATION_FAILED: 'service-worker-notification-failed',
    SERVICE_WORKER_CACHE_FAILED: 'service-worker-cache-failed',
    SERVICE_WORKER_FETCH_FAILED: 'service-worker-fetch-failed',
    SERVICE_WORKER_BACKGROUND_FAILED: 'service-worker-background-failed',
    SERVICE_WORKER_FOREGROUND_FAILED: 'service-worker-foreground-failed',
    SERVICE_WORKER_LIFECYCLE_FAILED: 'service-worker-lifecycle-failed',
    SERVICE_WORKER_PERMISSION_FAILED: 'service-worker-permission-failed'
  }
  
  // Handle service worker registration errors
  function handleServiceWorkerRegistrationError(error, serviceWorker, context = {}) {
    const errorContext = {
      operation: 'service-worker-registration',
      serviceWorker,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_REGISTRATION_FAILED,
      error,
      errorContext
    }
    
    // Service worker registration errors are usually non-critical
    console.warn(`Service worker registration failed for ${serviceWorker}:`, error)
  }
  
  // Handle service worker unregistration errors
  function handleServiceWorkerUnregistrationError(error, serviceWorker, context = {}) {
    const errorContext = {
      operation: 'service-worker-unregistration',
      serviceWorker,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_UNREGISTRATION_FAILED,
      error,
      errorContext
    }
    
    // Service worker unregistration errors are usually non-critical
    console.warn(`Service worker unregistration failed for ${serviceWorker}:`, error)
  }
  
  // Handle service worker activation errors
  function handleServiceWorkerActivationError(error, serviceWorker, context = {}) {
    const errorContext = {
      operation: 'service-worker-activation',
      serviceWorker,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_ACTIVATION_FAILED,
      error,
      errorContext
    }
    
    // Service worker activation errors are usually non-critical
    console.warn(`Service worker activation failed for ${serviceWorker}:`, error)
  }
  
  // Handle service worker installation errors
  function handleServiceWorkerInstallationError(error, serviceWorker, context = {}) {
    const errorContext = {
      operation: 'service-worker-installation',
      serviceWorker,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_INSTALLATION_FAILED,
      error,
      errorContext
    }
    
    // Service worker installation errors are usually non-critical
    console.warn(`Service worker installation failed for ${serviceWorker}:`, error)
  }
  
  // Handle service worker update errors
  function handleServiceWorkerUpdateError(error, serviceWorker, update, context = {}) {
    const errorContext = {
      operation: 'service-worker-update',
      serviceWorker,
      update,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_UPDATE_FAILED,
      error,
      errorContext
    }
    
    // Service worker update errors are usually non-critical
    console.warn(`Service worker update failed for ${serviceWorker}:`, update)
  }
  
  // Handle service worker message errors
  function handleServiceWorkerMessageError(error, serviceWorker, message, context = {}) {
    const errorContext = {
      operation: 'service-worker-message',
      serviceWorker,
      message,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_MESSAGE_FAILED,
      error,
      errorContext
    }
    
    // Service worker message errors are usually non-critical
    console.warn(`Service worker message failed for ${serviceWorker}:`, message)
  }
  
  // Handle service worker sync errors
  function handleServiceWorkerSyncError(error, serviceWorker, sync, context = {}) {
    const errorContext = {
      operation: 'service-worker-sync',
      serviceWorker,
      sync,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_SYNC_FAILED,
      error,
      errorContext
    }
    
    // Service worker sync errors are usually non-critical
    console.warn(`Service worker sync failed for ${serviceWorker}:`, sync)
  }
  
  // Handle service worker push errors
  function handleServiceWorkerPushError(error, serviceWorker, push, context = {}) {
    const errorContext = {
      operation: 'service-worker-push',
      serviceWorker,
      push,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_PUSH_FAILED,
      error,
      errorContext
    }
    
    // Service worker push errors are usually non-critical
    console.warn(`Service worker push failed for ${serviceWorker}:`, push)
  }
  
  // Handle service worker notification errors
  function handleServiceWorkerNotificationError(error, serviceWorker, notification, context = {}) {
    const errorContext = {
      operation: 'service-worker-notification',
      serviceWorker,
      notification,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_NOTIFICATION_FAILED,
      error,
      errorContext
    }
    
    // Service worker notification errors are usually non-critical
    console.warn(`Service worker notification failed for ${serviceWorker}:`, notification)
  }
  
  // Handle service worker cache errors
  function handleServiceWorkerCacheError(error, serviceWorker, cache, context = {}) {
    const errorContext = {
      operation: 'service-worker-cache',
      serviceWorker,
      cache,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_CACHE_FAILED,
      error,
      errorContext
    }
    
    // Service worker cache errors are usually non-critical
    console.warn(`Service worker cache failed for ${serviceWorker}:`, cache)
  }
  
  // Handle service worker fetch errors
  function handleServiceWorkerFetchError(error, serviceWorker, fetch, context = {}) {
    const errorContext = {
      operation: 'service-worker-fetch',
      serviceWorker,
      fetch,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_FETCH_FAILED,
      error,
      errorContext
    }
    
    // Service worker fetch errors are usually non-critical
    console.warn(`Service worker fetch failed for ${serviceWorker}:`, fetch)
  }
  
  // Handle service worker background errors
  function handleServiceWorkerBackgroundError(error, serviceWorker, background, context = {}) {
    const errorContext = {
      operation: 'service-worker-background',
      serviceWorker,
      background,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_BACKGROUND_FAILED,
      error,
      errorContext
    }
    
    // Service worker background errors are usually non-critical
    console.warn(`Service worker background failed for ${serviceWorker}:`, background)
  }
  
  // Handle service worker foreground errors
  function handleServiceWorkerForegroundError(error, serviceWorker, foreground, context = {}) {
    const errorContext = {
      operation: 'service-worker-foreground',
      serviceWorker,
      foreground,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_FOREGROUND_FAILED,
      error,
      errorContext
    }
    
    // Service worker foreground errors are usually non-critical
    console.warn(`Service worker foreground failed for ${serviceWorker}:`, foreground)
  }
  
  // Handle service worker lifecycle errors
  function handleServiceWorkerLifecycleError(error, serviceWorker, lifecycle, context = {}) {
    const errorContext = {
      operation: 'service-worker-lifecycle',
      serviceWorker,
      lifecycle,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_LIFECYCLE_FAILED,
      error,
      errorContext
    }
    
    // Service worker lifecycle errors are usually non-critical
    console.warn(`Service worker lifecycle failed for ${serviceWorker}:`, lifecycle)
  }
  
  // Handle service worker permission errors
  function handleServiceWorkerPermissionError(error, serviceWorker, permission, context = {}) {
    const errorContext = {
      operation: 'service-worker-permission',
      serviceWorker,
      permission,
      ...context
    }
    
    errorHandling.addError(
      SERVICE_WORKER_ERRORS.SERVICE_WORKER_PERMISSION_FAILED,
      error,
      errorContext
    }
    
    // Service worker permission errors are usually non-critical
    console.warn(`Service worker permission failed for ${serviceWorker}:`, permission)
  }
  
  // Execute service worker operation with error handling
  async function executeServiceWorkerOperation(operation, operationFunction, context = {}) {
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
  
  // Get service worker error summary
  function getServiceWorkerErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add service worker specific analysis
    summary.serviceWorkerErrors = {
      registrationErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_REGISTRATION_FAILED] || 0,
      unregistrationErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_UNREGISTRATION_FAILED] || 0,
      activationErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_ACTIVATION_FAILED] || 0,
      installationErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_INSTALLATION_FAILED] || 0,
      updateErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_UPDATE_FAILED] || 0,
      messageErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_MESSAGE_FAILED] || 0,
      syncErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_SYNC_FAILED] || 0,
      pushErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_PUSH_FAILED] || 0,
      notificationErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_NOTIFICATION_FAILED] || 0,
      cacheErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_CACHE_FAILED] || 0,
      fetchErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_FETCH_FAILED] || 0,
      backgroundErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_BACKGROUND_FAILED] || 0,
      foregroundErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_FOREGROUND_FAILED] || 0,
      lifecycleErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_LIFECYCLE_FAILED] || 0,
      permissionErrors: summary.errorTypes[SERVICE_WORKER_ERRORS.SERVICE_WORKER_PERMISSION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear service worker errors
  function clearServiceWorkerErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Service worker specific methods
    handleServiceWorkerRegistrationError,
    handleServiceWorkerUnregistrationError,
    handleServiceWorkerActivationError,
    handleServiceWorkerInstallationError,
    handleServiceWorkerUpdateError,
    handleServiceWorkerMessageError,
    handleServiceWorkerSyncError,
    handleServiceWorkerPushError,
    handleServiceWorkerNotificationError,
    handleServiceWorkerCacheError,
    handleServiceWorkerFetchError,
    handleServiceWorkerBackgroundError,
    handleServiceWorkerForegroundError,
    handleServiceWorkerLifecycleError,
    handleServiceWorkerPermissionError,
    
    // Utility methods
    executeServiceWorkerOperation,
    getServiceWorkerErrorSummary,
    clearServiceWorkerErrors,
    
    // Constants
    SERVICE_WORKER_ERRORS
  }
}


