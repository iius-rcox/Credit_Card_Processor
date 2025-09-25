import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useStorageErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Storage specific error types
  const STORAGE_ERRORS = {
    STORAGE_INITIALIZATION_FAILED: 'storage-initialization-failed',
    STORAGE_CONFIGURATION_FAILED: 'storage-configuration-failed',
    STORAGE_CONNECTION_FAILED: 'storage-connection-failed',
    STORAGE_QUOTA_EXCEEDED: 'storage-quota-exceeded',
    STORAGE_ACCESS_DENIED: 'storage-access-denied',
    STORAGE_READ_FAILED: 'storage-read-failed',
    STORAGE_WRITE_FAILED: 'storage-write-failed',
    STORAGE_DELETE_FAILED: 'storage-delete-failed',
    STORAGE_CLEAR_FAILED: 'storage-clear-failed',
    STORAGE_SYNC_FAILED: 'storage-sync-failed',
    STORAGE_BACKUP_FAILED: 'storage-backup-failed',
    STORAGE_RESTORE_FAILED: 'storage-restore-failed',
    STORAGE_MIGRATION_FAILED: 'storage-migration-failed',
    STORAGE_ENCRYPTION_FAILED: 'storage-encryption-failed',
    STORAGE_DECRYPTION_FAILED: 'storage-decryption-failed'
  }
  
  // Handle storage initialization errors
  function handleStorageInitializationError(error, storageType, context = {}) {
    const errorContext = {
      operation: 'storage-initialization',
      storageType,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_INITIALIZATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to initialize ${storageType} storage. Please refresh the page.`
    )
  }
  
  // Handle storage configuration errors
  function handleStorageConfigurationError(error, storageType, config, context = {}) {
    const errorContext = {
      operation: 'storage-configuration',
      storageType,
      config,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_CONFIGURATION_FAILED,
      error,
      errorContext
    )
    
    // Storage configuration errors are usually non-critical
    console.warn(`Storage configuration failed for ${storageType}:`, config)
  }
  
  // Handle storage connection errors
  function handleStorageConnectionError(error, storageType, context = {}) {
    const errorContext = {
      operation: 'storage-connection',
      storageType,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_CONNECTION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to connect to ${storageType} storage. Please check your connection.`
    )
  }
  
  // Handle storage quota exceeded errors
  function handleStorageQuotaExceededError(error, storageType, quota, used, context = {}) {
    const errorContext = {
      operation: 'storage-quota-exceeded',
      storageType,
      quota,
      used,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_QUOTA_EXCEEDED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `${storageType} storage quota exceeded. Please free up some space.`
    )
  }
  
  // Handle storage access denied errors
  function handleStorageAccessDeniedError(error, storageType, operation, context = {}) {
    const errorContext = {
      operation: 'storage-access-denied',
      storageType,
      operation,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_ACCESS_DENIED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Access denied to ${storageType} storage for ${operation} operation.`
    )
  }
  
  // Handle storage read errors
  function handleStorageReadError(error, storageType, key, context = {}) {
    const errorContext = {
      operation: 'storage-read',
      storageType,
      key,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_READ_FAILED,
      error,
      errorContext
    )
    
    // Storage read errors are usually non-critical
    console.warn(`Storage read failed for ${storageType}:`, key)
  }
  
  // Handle storage write errors
  function handleStorageWriteError(error, storageType, key, value, context = {}) {
    const errorContext = {
      operation: 'storage-write',
      storageType,
      key,
      value,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_WRITE_FAILED,
      error,
      errorContext
    )
    
    // Storage write errors are usually non-critical
    console.warn(`Storage write failed for ${storageType}:`, key)
  }
  
  // Handle storage delete errors
  function handleStorageDeleteError(error, storageType, key, context = {}) {
    const errorContext = {
      operation: 'storage-delete',
      storageType,
      key,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_DELETE_FAILED,
      error,
      errorContext
    )
    
    // Storage delete errors are usually non-critical
    console.warn(`Storage delete failed for ${storageType}:`, key)
  }
  
  // Handle storage clear errors
  function handleStorageClearError(error, storageType, context = {}) {
    const errorContext = {
      operation: 'storage-clear',
      storageType,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_CLEAR_FAILED,
      error,
      errorContext
    )
    
    // Storage clear errors are usually non-critical
    console.warn(`Storage clear failed for ${storageType}:`, error)
  }
  
  // Handle storage sync errors
  function handleStorageSyncError(error, storageType, sync, context = {}) {
    const errorContext = {
      operation: 'storage-sync',
      storageType,
      sync,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_SYNC_FAILED,
      error,
      errorContext
    )
    
    // Storage sync errors are usually non-critical
    console.warn(`Storage sync failed for ${storageType}:`, sync)
  }
  
  // Handle storage backup errors
  function handleStorageBackupError(error, storageType, backup, context = {}) {
    const errorContext = {
      operation: 'storage-backup',
      storageType,
      backup,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_BACKUP_FAILED,
      error,
      errorContext
    )
    
    // Storage backup errors are usually non-critical
    console.warn(`Storage backup failed for ${storageType}:`, backup)
  }
  
  // Handle storage restore errors
  function handleStorageRestoreError(error, storageType, restore, context = {}) {
    const errorContext = {
      operation: 'storage-restore',
      storageType,
      restore,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_RESTORE_FAILED,
      error,
      errorContext
    )
    
    // Storage restore errors are usually non-critical
    console.warn(`Storage restore failed for ${storageType}:`, restore)
  }
  
  // Handle storage migration errors
  function handleStorageMigrationError(error, storageType, migration, context = {}) {
    const errorContext = {
      operation: 'storage-migration',
      storageType,
      migration,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_MIGRATION_FAILED,
      error,
      errorContext
    )
    
    // Storage migration errors are usually non-critical
    console.warn(`Storage migration failed for ${storageType}:`, migration)
  }
  
  // Handle storage encryption errors
  function handleStorageEncryptionError(error, storageType, data, context = {}) {
    const errorContext = {
      operation: 'storage-encryption',
      storageType,
      data,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_ENCRYPTION_FAILED,
      error,
      errorContext
    )
    
    // Storage encryption errors are usually non-critical
    console.warn(`Storage encryption failed for ${storageType}:`, data)
  }
  
  // Handle storage decryption errors
  function handleStorageDecryptionError(error, storageType, data, context = {}) {
    const errorContext = {
      operation: 'storage-decryption',
      storageType,
      data,
      ...context
    }
    
    errorHandling.addError(
      STORAGE_ERRORS.STORAGE_DECRYPTION_FAILED,
      error,
      errorContext
    )
    
    // Storage decryption errors are usually non-critical
    console.warn(`Storage decryption failed for ${storageType}:`, data)
  }
  
  // Execute storage operation with error handling
  async function executeStorageOperation(operation, operationFunction, context = {}) {
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
  
  // Get storage error summary
  function getStorageErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add storage specific analysis
    summary.storageErrors = {
      initializationErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_INITIALIZATION_FAILED] || 0,
      configurationErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_CONFIGURATION_FAILED] || 0,
      connectionErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_CONNECTION_FAILED] || 0,
      quotaExceededErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_QUOTA_EXCEEDED] || 0,
      accessDeniedErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_ACCESS_DENIED] || 0,
      readErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_READ_FAILED] || 0,
      writeErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_WRITE_FAILED] || 0,
      deleteErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_DELETE_FAILED] || 0,
      clearErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_CLEAR_FAILED] || 0,
      syncErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_SYNC_FAILED] || 0,
      backupErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_BACKUP_FAILED] || 0,
      restoreErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_RESTORE_FAILED] || 0,
      migrationErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_MIGRATION_FAILED] || 0,
      encryptionErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_ENCRYPTION_FAILED] || 0,
      decryptionErrors: summary.errorTypes[STORAGE_ERRORS.STORAGE_DECRYPTION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear storage errors
  function clearStorageErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Storage specific methods
    handleStorageInitializationError,
    handleStorageConfigurationError,
    handleStorageConnectionError,
    handleStorageQuotaExceededError,
    handleStorageAccessDeniedError,
    handleStorageReadError,
    handleStorageWriteError,
    handleStorageDeleteError,
    handleStorageClearError,
    handleStorageSyncError,
    handleStorageBackupError,
    handleStorageRestoreError,
    handleStorageMigrationError,
    handleStorageEncryptionError,
    handleStorageDecryptionError,
    
    // Utility methods
    executeStorageOperation,
    getStorageErrorSummary,
    clearStorageErrors,
    
    // Constants
    STORAGE_ERRORS
  }
}








