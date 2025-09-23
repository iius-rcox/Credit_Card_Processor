import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useUIStateErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // UI state specific error types
  const UI_STATE_ERRORS = {
    STATE_INITIALIZATION_FAILED: 'state-initialization-failed',
    STATE_UPDATE_FAILED: 'state-update-failed',
    STATE_RESET_FAILED: 'state-reset-failed',
    STATE_PERSISTENCE_FAILED: 'state-persistence-failed',
    STATE_HYDRATION_FAILED: 'state-hydration-failed',
    STATE_SYNCHRONIZATION_FAILED: 'state-synchronization-failed',
    STATE_VALIDATION_FAILED: 'state-validation-failed',
    STATE_MIGRATION_FAILED: 'state-migration-failed',
    STATE_BACKUP_FAILED: 'state-backup-failed',
    STATE_RESTORE_FAILED: 'state-restore-failed',
    STATE_CLEANUP_FAILED: 'state-cleanup-failed',
    STATE_ARCHIVAL_FAILED: 'state-archival-failed',
    STATE_COMPRESSION_FAILED: 'state-compression-failed',
    STATE_ENCRYPTION_FAILED: 'state-encryption-failed',
    STATE_DECRYPTION_FAILED: 'state-decryption-failed'
  }
  
  // Handle state initialization errors
  function handleStateInitializationError(error, stateName, context = {}) {
    const errorContext = {
      operation: 'state-initialization',
      stateName,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_INITIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // State initialization errors are usually non-critical
    console.warn(`State initialization failed for ${stateName}:`, error)
  }
  
  // Handle state update errors
  function handleStateUpdateError(error, stateName, update, context = {}) {
    const errorContext = {
      operation: 'state-update',
      stateName,
      update,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_UPDATE_FAILED,
      error,
      errorContext
    )
    
    // State update errors are usually non-critical
    console.warn(`State update failed for ${stateName}:`, update)
  }
  
  // Handle state reset errors
  function handleStateResetError(error, stateName, context = {}) {
    const errorContext = {
      operation: 'state-reset',
      stateName,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_RESET_FAILED,
      error,
      errorContext
    )
    
    // State reset errors are usually non-critical
    console.warn(`State reset failed for ${stateName}:`, error)
  }
  
  // Handle state persistence errors
  function handleStatePersistenceError(error, stateName, persistence, context = {}) {
    const errorContext = {
      operation: 'state-persistence',
      stateName,
      persistence,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_PERSISTENCE_FAILED,
      error,
      errorContext
    )
    
    // State persistence errors are usually non-critical
    console.warn(`State persistence failed for ${stateName}:`, persistence)
  }
  
  // Handle state hydration errors
  function handleStateHydrationError(error, stateName, hydration, context = {}) {
    const errorContext = {
      operation: 'state-hydration',
      stateName,
      hydration,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_HYDRATION_FAILED,
      error,
      errorContext
    )
    
    // State hydration errors are usually non-critical
    console.warn(`State hydration failed for ${stateName}:`, hydration)
  }
  
  // Handle state synchronization errors
  function handleStateSynchronizationError(error, stateName, sync, context = {}) {
    const errorContext = {
      operation: 'state-synchronization',
      stateName,
      sync,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_SYNCHRONIZATION_FAILED,
      error,
      errorContext
    )
    
    // State synchronization errors are usually non-critical
    console.warn(`State synchronization failed for ${stateName}:`, sync)
  }
  
  // Handle state validation errors
  function handleStateValidationError(error, stateName, validation, context = {}) {
    const errorContext = {
      operation: 'state-validation',
      stateName,
      validation,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_VALIDATION_FAILED,
      error,
      errorContext
    )
    
    // State validation errors are usually non-critical
    console.warn(`State validation failed for ${stateName}:`, validation)
  }
  
  // Handle state migration errors
  function handleStateMigrationError(error, stateName, migration, context = {}) {
    const errorContext = {
      operation: 'state-migration',
      stateName,
      migration,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_MIGRATION_FAILED,
      error,
      errorContext
    )
    
    // State migration errors are usually non-critical
    console.warn(`State migration failed for ${stateName}:`, migration)
  }
  
  // Handle state backup errors
  function handleStateBackupError(error, stateName, backup, context = {}) {
    const errorContext = {
      operation: 'state-backup',
      stateName,
      backup,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_BACKUP_FAILED,
      error,
      errorContext
    )
    
    // State backup errors are usually non-critical
    console.warn(`State backup failed for ${stateName}:`, backup)
  }
  
  // Handle state restore errors
  function handleStateRestoreError(error, stateName, restore, context = {}) {
    const errorContext = {
      operation: 'state-restore',
      stateName,
      restore,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_RESTORE_FAILED,
      error,
      errorContext
    )
    
    // State restore errors are usually non-critical
    console.warn(`State restore failed for ${stateName}:`, restore)
  }
  
  // Handle state cleanup errors
  function handleStateCleanupError(error, stateName, cleanup, context = {}) {
    const errorContext = {
      operation: 'state-cleanup',
      stateName,
      cleanup,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_CLEANUP_FAILED,
      error,
      errorContext
    )
    
    // State cleanup errors are usually non-critical
    console.warn(`State cleanup failed for ${stateName}:`, cleanup)
  }
  
  // Handle state archival errors
  function handleStateArchivalError(error, stateName, archival, context = {}) {
    const errorContext = {
      operation: 'state-archival',
      stateName,
      archival,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_ARCHIVAL_FAILED,
      error,
      errorContext
    )
    
    // State archival errors are usually non-critical
    console.warn(`State archival failed for ${stateName}:`, archival)
  }
  
  // Handle state compression errors
  function handleStateCompressionError(error, stateName, compression, context = {}) {
    const errorContext = {
      operation: 'state-compression',
      stateName,
      compression,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_COMPRESSION_FAILED,
      error,
      errorContext
    )
    
    // State compression errors are usually non-critical
    console.warn(`State compression failed for ${stateName}:`, compression)
  }
  
  // Handle state encryption errors
  function handleStateEncryptionError(error, stateName, encryption, context = {}) {
    const errorContext = {
      operation: 'state-encryption',
      stateName,
      encryption,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_ENCRYPTION_FAILED,
      error,
      errorContext
    )
    
    // State encryption errors are usually non-critical
    console.warn(`State encryption failed for ${stateName}:`, encryption)
  }
  
  // Handle state decryption errors
  function handleStateDecryptionError(error, stateName, decryption, context = {}) {
    const errorContext = {
      operation: 'state-decryption',
      stateName,
      decryption,
      ...context
    }
    
    errorHandling.addError(
      UI_STATE_ERRORS.STATE_DECRYPTION_FAILED,
      error,
      errorContext
    )
    
    // State decryption errors are usually non-critical
    console.warn(`State decryption failed for ${stateName}:`, decryption)
  }
  
  // Execute UI state operation with error handling
  async function executeUIStateOperation(operation, operationFunction, context = {}) {
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
  
  // Get UI state error summary
  function getUIStateErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add UI state specific analysis
    summary.uiStateErrors = {
      initializationErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_INITIALIZATION_FAILED] || 0,
      updateErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_UPDATE_FAILED] || 0,
      resetErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_RESET_FAILED] || 0,
      persistenceErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_PERSISTENCE_FAILED] || 0,
      hydrationErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_HYDRATION_FAILED] || 0,
      synchronizationErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_SYNCHRONIZATION_FAILED] || 0,
      validationErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_VALIDATION_FAILED] || 0,
      migrationErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_MIGRATION_FAILED] || 0,
      backupErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_BACKUP_FAILED] || 0,
      restoreErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_RESTORE_FAILED] || 0,
      cleanupErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_CLEANUP_FAILED] || 0,
      archivalErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_ARCHIVAL_FAILED] || 0,
      compressionErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_COMPRESSION_FAILED] || 0,
      encryptionErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_ENCRYPTION_FAILED] || 0,
      decryptionErrors: summary.errorTypes[UI_STATE_ERRORS.STATE_DECRYPTION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear UI state errors
  function clearUIStateErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // UI state specific methods
    handleStateInitializationError,
    handleStateUpdateError,
    handleStateResetError,
    handleStatePersistenceError,
    handleStateHydrationError,
    handleStateSynchronizationError,
    handleStateValidationError,
    handleStateMigrationError,
    handleStateBackupError,
    handleStateRestoreError,
    handleStateCleanupError,
    handleStateArchivalError,
    handleStateCompressionError,
    handleStateEncryptionError,
    handleStateDecryptionError,
    
    // Utility methods
    executeUIStateOperation,
    getUIStateErrorSummary,
    clearUIStateErrors,
    
    // Constants
    UI_STATE_ERRORS
  }
}







