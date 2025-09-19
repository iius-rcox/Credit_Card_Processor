import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useStateManagementErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // State management specific error types
  const STATE_MANAGEMENT_ERRORS = {
    STORE_INITIALIZATION_FAILED: 'store-initialization-failed',
    STORE_UPDATE_FAILED: 'store-update-failed',
    STORE_RESET_FAILED: 'store-reset-failed',
    STORE_SUBSCRIPTION_FAILED: 'store-subscription-failed',
    STORE_UNSUBSCRIPTION_FAILED: 'store-unsubscription-failed',
    STORE_PERSISTENCE_FAILED: 'store-persistence-failed',
    STORE_HYDRATION_FAILED: 'store-hydration-failed',
    STORE_SERIALIZATION_FAILED: 'store-serialization-failed',
    STORE_DESERIALIZATION_FAILED: 'store-deserialization-failed',
    STORE_VALIDATION_FAILED: 'store-validation-failed',
    STORE_MIGRATION_FAILED: 'store-migration-failed',
    STORE_BACKUP_FAILED: 'store-backup-failed',
    STORE_RESTORE_FAILED: 'store-restore-failed',
    STORE_SYNC_FAILED: 'store-sync-failed',
    STORE_CONFLICT_FAILED: 'store-conflict-failed'
  }
  
  // Handle store initialization errors
  function handleStoreInitializationError(error, storeName, context = {}) {
    const errorContext = {
      operation: 'store-initialization',
      storeName,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_INITIALIZATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to initialize ${storeName} store. Please refresh the page.`
    )
  }
  
  // Handle store update errors
  function handleStoreUpdateError(error, storeName, updateData, context = {}) {
    const errorContext = {
      operation: 'store-update',
      storeName,
      updateData,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_UPDATE_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to update ${storeName} store. Some changes may not be saved.`
    )
  }
  
  // Handle store reset errors
  function handleStoreResetError(error, storeName, context = {}) {
    const errorContext = {
      operation: 'store-reset',
      storeName,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_RESET_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to reset ${storeName} store. Please try again.`
    )
  }
  
  // Handle store subscription errors
  function handleStoreSubscriptionError(error, storeName, subscriptionType, context = {}) {
    const errorContext = {
      operation: 'store-subscription',
      storeName,
      subscriptionType,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_SUBSCRIPTION_FAILED,
      error,
      errorContext
    )
    
    // Subscription errors are usually non-critical
    console.warn(`Store subscription failed for ${storeName}:`, subscriptionType)
  }
  
  // Handle store unsubscription errors
  function handleStoreUnsubscriptionError(error, storeName, subscriptionType, context = {}) {
    const errorContext = {
      operation: 'store-unsubscription',
      storeName,
      subscriptionType,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_UNSUBSCRIPTION_FAILED,
      error,
      errorContext
    )
    
    // Unsubscription errors are usually non-critical
    console.warn(`Store unsubscription failed for ${storeName}:`, subscriptionType)
  }
  
  // Handle store persistence errors
  function handleStorePersistenceError(error, storeName, persistenceType, context = {}) {
    const errorContext = {
      operation: 'store-persistence',
      storeName,
      persistenceType,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_PERSISTENCE_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to persist ${storeName} store. Changes may not be saved.`
    )
  }
  
  // Handle store hydration errors
  function handleStoreHydrationError(error, storeName, hydrationData, context = {}) {
    const errorContext = {
      operation: 'store-hydration',
      storeName,
      hydrationData,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_HYDRATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to hydrate ${storeName} store. Using default state.`
    )
  }
  
  // Handle store serialization errors
  function handleStoreSerializationError(error, storeName, data, context = {}) {
    const errorContext = {
      operation: 'store-serialization',
      storeName,
      data,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_SERIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Serialization errors are usually non-critical
    console.warn(`Store serialization failed for ${storeName}:`, error)
  }
  
  // Handle store deserialization errors
  function handleStoreDeserializationError(error, storeName, serializedData, context = {}) {
    const errorContext = {
      operation: 'store-deserialization',
      storeName,
      serializedData,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_DESERIALIZATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to deserialize ${storeName} store. Using default state.`
    )
  }
  
  // Handle store validation errors
  function handleStoreValidationError(error, storeName, validationData, context = {}) {
    const errorContext = {
      operation: 'store-validation',
      storeName,
      validationData,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_VALIDATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Invalid data in ${storeName} store. Please refresh the page.`
    )
  }
  
  // Handle store migration errors
  function handleStoreMigrationError(error, storeName, fromVersion, toVersion, context = {}) {
    const errorContext = {
      operation: 'store-migration',
      storeName,
      fromVersion,
      toVersion,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_MIGRATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to migrate ${storeName} store from version ${fromVersion} to ${toVersion}. Using default state.`
    )
  }
  
  // Handle store backup errors
  function handleStoreBackupError(error, storeName, context = {}) {
    const errorContext = {
      operation: 'store-backup',
      storeName,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_BACKUP_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to backup ${storeName} store. Please try again.`
    )
  }
  
  // Handle store restore errors
  function handleStoreRestoreError(error, storeName, backupData, context = {}) {
    const errorContext = {
      operation: 'store-restore',
      storeName,
      backupData,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_RESTORE_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to restore ${storeName} store. Please try again.`
    )
  }
  
  // Handle store sync errors
  function handleStoreSyncError(error, storeName, syncType, context = {}) {
    const errorContext = {
      operation: 'store-sync',
      storeName,
      syncType,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_SYNC_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to sync ${storeName} store. Some changes may not be synchronized.`
    )
  }
  
  // Handle store conflict errors
  function handleStoreConflictError(error, storeName, conflictData, context = {}) {
    const errorContext = {
      operation: 'store-conflict',
      storeName,
      conflictData,
      ...context
    }
    
    errorHandling.addError(
      STATE_MANAGEMENT_ERRORS.STORE_CONFLICT_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Data conflict in ${storeName} store. Please refresh the page.`
    )
  }
  
  // Execute store operation with error handling
  async function executeStoreOperation(operation, operationFunction, storeName, context = {}) {
    try {
      return await errorHandling.executeWithErrorHandling(
        operationFunction,
        { operation, storeName, ...context }
      )
    } catch (error) {
      // The error handling is already done by executeWithErrorHandling
      throw error
    }
  }
  
  // Get state management error summary
  function getStateManagementErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add state management specific analysis
    summary.stateManagementErrors = {
      initializationErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_INITIALIZATION_FAILED] || 0,
      updateErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_UPDATE_FAILED] || 0,
      resetErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_RESET_FAILED] || 0,
      subscriptionErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_SUBSCRIPTION_FAILED] || 0,
      unsubscriptionErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_UNSUBSCRIPTION_FAILED] || 0,
      persistenceErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_PERSISTENCE_FAILED] || 0,
      hydrationErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_HYDRATION_FAILED] || 0,
      serializationErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_SERIALIZATION_FAILED] || 0,
      deserializationErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_DESERIALIZATION_FAILED] || 0,
      validationErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_VALIDATION_FAILED] || 0,
      migrationErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_MIGRATION_FAILED] || 0,
      backupErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_BACKUP_FAILED] || 0,
      restoreErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_RESTORE_FAILED] || 0,
      syncErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_SYNC_FAILED] || 0,
      conflictErrors: summary.errorTypes[STATE_MANAGEMENT_ERRORS.STORE_CONFLICT_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear state management errors
  function clearStateManagementErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // State management specific methods
    handleStoreInitializationError,
    handleStoreUpdateError,
    handleStoreResetError,
    handleStoreSubscriptionError,
    handleStoreUnsubscriptionError,
    handleStorePersistenceError,
    handleStoreHydrationError,
    handleStoreSerializationError,
    handleStoreDeserializationError,
    handleStoreValidationError,
    handleStoreMigrationError,
    handleStoreBackupError,
    handleStoreRestoreError,
    handleStoreSyncError,
    handleStoreConflictError,
    
    // Utility methods
    executeStoreOperation,
    getStateManagementErrorSummary,
    clearStateManagementErrors,
    
    // Constants
    STATE_MANAGEMENT_ERRORS
  }
}




