import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useCachingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Caching specific error types
  const CACHING_ERRORS = {
    CACHE_INITIALIZATION_FAILED: 'cache-initialization-failed',
    CACHE_CONFIGURATION_FAILED: 'cache-configuration-failed',
    CACHE_STORAGE_FAILED: 'cache-storage-failed',
    CACHE_RETRIEVAL_FAILED: 'cache-retrieval-failed',
    CACHE_UPDATE_FAILED: 'cache-update-failed',
    CACHE_DELETE_FAILED: 'cache-delete-failed',
    CACHE_CLEAR_FAILED: 'cache-clear-failed',
    CACHE_EXPIRATION_FAILED: 'cache-expiration-failed',
    CACHE_INVALIDATION_FAILED: 'cache-invalidation-failed',
    CACHE_EVICTION_FAILED: 'cache-eviction-failed',
    CACHE_COMPRESSION_FAILED: 'cache-compression-failed',
    CACHE_SERIALIZATION_FAILED: 'cache-serialization-failed',
    CACHE_DESERIALIZATION_FAILED: 'cache-deserialization-failed',
    CACHE_SYNC_FAILED: 'cache-sync-failed',
    CACHE_BACKUP_FAILED: 'cache-backup-failed'
  }
  
  // Handle cache initialization errors
  function handleCacheInitializationError(error, cacheName, context = {}) {
    const errorContext = {
      operation: 'cache-initialization',
      cacheName,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_INITIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Cache initialization errors are usually non-critical
    console.warn(`Cache initialization failed for ${cacheName}:`, error)
  }
  
  // Handle cache configuration errors
  function handleCacheConfigurationError(error, cacheName, config, context = {}) {
    const errorContext = {
      operation: 'cache-configuration',
      cacheName,
      config,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_CONFIGURATION_FAILED,
      error,
      errorContext
    )
    
    // Cache configuration errors are usually non-critical
    console.warn(`Cache configuration failed for ${cacheName}:`, config)
  }
  
  // Handle cache storage errors
  function handleCacheStorageError(error, cacheName, key, value, context = {}) {
    const errorContext = {
      operation: 'cache-storage',
      cacheName,
      key,
      value,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_STORAGE_FAILED,
      error,
      errorContext
    )
    
    // Cache storage errors are usually non-critical
    console.warn(`Cache storage failed for ${cacheName}:`, key)
  }
  
  // Handle cache retrieval errors
  function handleCacheRetrievalError(error, cacheName, key, context = {}) {
    const errorContext = {
      operation: 'cache-retrieval',
      cacheName,
      key,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_RETRIEVAL_FAILED,
      error,
      errorContext
    )
    
    // Cache retrieval errors are usually non-critical
    console.warn(`Cache retrieval failed for ${cacheName}:`, key)
  }
  
  // Handle cache update errors
  function handleCacheUpdateError(error, cacheName, key, value, context = {}) {
    const errorContext = {
      operation: 'cache-update',
      cacheName,
      key,
      value,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_UPDATE_FAILED,
      error,
      errorContext
    )
    
    // Cache update errors are usually non-critical
    console.warn(`Cache update failed for ${cacheName}:`, key)
  }
  
  // Handle cache delete errors
  function handleCacheDeleteError(error, cacheName, key, context = {}) {
    const errorContext = {
      operation: 'cache-delete',
      cacheName,
      key,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_DELETE_FAILED,
      error,
      errorContext
    )
    
    // Cache delete errors are usually non-critical
    console.warn(`Cache delete failed for ${cacheName}:`, key)
  }
  
  // Handle cache clear errors
  function handleCacheClearError(error, cacheName, context = {}) {
    const errorContext = {
      operation: 'cache-clear',
      cacheName,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_CLEAR_FAILED,
      error,
      errorContext
    )
    
    // Cache clear errors are usually non-critical
    console.warn(`Cache clear failed for ${cacheName}:`, error)
  }
  
  // Handle cache expiration errors
  function handleCacheExpirationError(error, cacheName, key, ttl, context = {}) {
    const errorContext = {
      operation: 'cache-expiration',
      cacheName,
      key,
      ttl,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_EXPIRATION_FAILED,
      error,
      errorContext
    )
    
    // Cache expiration errors are usually non-critical
    console.warn(`Cache expiration failed for ${cacheName}:`, key)
  }
  
  // Handle cache invalidation errors
  function handleCacheInvalidationError(error, cacheName, pattern, context = {}) {
    const errorContext = {
      operation: 'cache-invalidation',
      cacheName,
      pattern,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_INVALIDATION_FAILED,
      error,
      errorContext
    )
    
    // Cache invalidation errors are usually non-critical
    console.warn(`Cache invalidation failed for ${cacheName}:`, pattern)
  }
  
  // Handle cache eviction errors
  function handleCacheEvictionError(error, cacheName, eviction, context = {}) {
    const errorContext = {
      operation: 'cache-eviction',
      cacheName,
      eviction,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_EVICTION_FAILED,
      error,
      errorContext
    )
    
    // Cache eviction errors are usually non-critical
    console.warn(`Cache eviction failed for ${cacheName}:`, eviction)
  }
  
  // Handle cache compression errors
  function handleCacheCompressionError(error, cacheName, compression, context = {}) {
    const errorContext = {
      operation: 'cache-compression',
      cacheName,
      compression,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_COMPRESSION_FAILED,
      error,
      errorContext
    )
    
    // Cache compression errors are usually non-critical
    console.warn(`Cache compression failed for ${cacheName}:`, compression)
  }
  
  // Handle cache serialization errors
  function handleCacheSerializationError(error, cacheName, data, context = {}) {
    const errorContext = {
      operation: 'cache-serialization',
      cacheName,
      data,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_SERIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Cache serialization errors are usually non-critical
    console.warn(`Cache serialization failed for ${cacheName}:`, data)
  }
  
  // Handle cache deserialization errors
  function handleCacheDeserializationError(error, cacheName, data, context = {}) {
    const errorContext = {
      operation: 'cache-deserialization',
      cacheName,
      data,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_DESERIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Cache deserialization errors are usually non-critical
    console.warn(`Cache deserialization failed for ${cacheName}:`, data)
  }
  
  // Handle cache sync errors
  function handleCacheSyncError(error, cacheName, sync, context = {}) {
    const errorContext = {
      operation: 'cache-sync',
      cacheName,
      sync,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_SYNC_FAILED,
      error,
      errorContext
    )
    
    // Cache sync errors are usually non-critical
    console.warn(`Cache sync failed for ${cacheName}:`, sync)
  }
  
  // Handle cache backup errors
  function handleCacheBackupError(error, cacheName, backup, context = {}) {
    const errorContext = {
      operation: 'cache-backup',
      cacheName,
      backup,
      ...context
    }
    
    errorHandling.addError(
      CACHING_ERRORS.CACHE_BACKUP_FAILED,
      error,
      errorContext
    )
    
    // Cache backup errors are usually non-critical
    console.warn(`Cache backup failed for ${cacheName}:`, backup)
  }
  
  // Execute caching operation with error handling
  async function executeCachingOperation(operation, operationFunction, context = {}) {
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
  
  // Get caching error summary
  function getCachingErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add caching specific analysis
    summary.cachingErrors = {
      initializationErrors: summary.errorTypes[CACHING_ERRORS.CACHE_INITIALIZATION_FAILED] || 0,
      configurationErrors: summary.errorTypes[CACHING_ERRORS.CACHE_CONFIGURATION_FAILED] || 0,
      storageErrors: summary.errorTypes[CACHING_ERRORS.CACHE_STORAGE_FAILED] || 0,
      retrievalErrors: summary.errorTypes[CACHING_ERRORS.CACHE_RETRIEVAL_FAILED] || 0,
      updateErrors: summary.errorTypes[CACHING_ERRORS.CACHE_UPDATE_FAILED] || 0,
      deleteErrors: summary.errorTypes[CACHING_ERRORS.CACHE_DELETE_FAILED] || 0,
      clearErrors: summary.errorTypes[CACHING_ERRORS.CACHE_CLEAR_FAILED] || 0,
      expirationErrors: summary.errorTypes[CACHING_ERRORS.CACHE_EXPIRATION_FAILED] || 0,
      invalidationErrors: summary.errorTypes[CACHING_ERRORS.CACHE_INVALIDATION_FAILED] || 0,
      evictionErrors: summary.errorTypes[CACHING_ERRORS.CACHE_EVICTION_FAILED] || 0,
      compressionErrors: summary.errorTypes[CACHING_ERRORS.CACHE_COMPRESSION_FAILED] || 0,
      serializationErrors: summary.errorTypes[CACHING_ERRORS.CACHE_SERIALIZATION_FAILED] || 0,
      deserializationErrors: summary.errorTypes[CACHING_ERRORS.CACHE_DESERIALIZATION_FAILED] || 0,
      syncErrors: summary.errorTypes[CACHING_ERRORS.CACHE_SYNC_FAILED] || 0,
      backupErrors: summary.errorTypes[CACHING_ERRORS.CACHE_BACKUP_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear caching errors
  function clearCachingErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Caching specific methods
    handleCacheInitializationError,
    handleCacheConfigurationError,
    handleCacheStorageError,
    handleCacheRetrievalError,
    handleCacheUpdateError,
    handleCacheDeleteError,
    handleCacheClearError,
    handleCacheExpirationError,
    handleCacheInvalidationError,
    handleCacheEvictionError,
    handleCacheCompressionError,
    handleCacheSerializationError,
    handleCacheDeserializationError,
    handleCacheSyncError,
    handleCacheBackupError,
    
    // Utility methods
    executeCachingOperation,
    getCachingErrorSummary,
    clearCachingErrors,
    
    // Constants
    CACHING_ERRORS
  }
}




