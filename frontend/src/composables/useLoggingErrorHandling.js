import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useLoggingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Logging specific error types
  const LOGGING_ERRORS = {
    LOG_INITIALIZATION_FAILED: 'log-initialization-failed',
    LOG_CONFIGURATION_FAILED: 'log-configuration-failed',
    LOG_LEVEL_FAILED: 'log-level-failed',
    LOG_FORMAT_FAILED: 'log-format-failed',
    LOG_OUTPUT_FAILED: 'log-output-failed',
    LOG_TRANSPORT_FAILED: 'log-transport-failed',
    LOG_FILTER_FAILED: 'log-filter-failed',
    LOG_ROTATION_FAILED: 'log-rotation-failed',
    LOG_COMPRESSION_FAILED: 'log-compression-failed',
    LOG_ARCHIVAL_FAILED: 'log-archival-failed',
    LOG_CLEANUP_FAILED: 'log-cleanup-failed',
    LOG_METADATA_FAILED: 'log-metadata-failed',
    LOG_CORRELATION_FAILED: 'log-correlation-failed',
    LOG_STRUCTURED_FAILED: 'log-structured-failed',
    LOG_ANALYTICS_FAILED: 'log-analytics-failed'
  }
  
  // Handle log initialization errors
  function handleLogInitializationError(error, loggerName, context = {}) {
    const errorContext = {
      operation: 'log-initialization',
      loggerName,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_INITIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Log initialization errors are usually non-critical
    console.warn(`Log initialization failed for ${loggerName}:`, error)
  }
  
  // Handle log configuration errors
  function handleLogConfigurationError(error, loggerName, config, context = {}) {
    const errorContext = {
      operation: 'log-configuration',
      loggerName,
      config,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_CONFIGURATION_FAILED,
      error,
      errorContext
    )
    
    // Log configuration errors are usually non-critical
    console.warn(`Log configuration failed for ${loggerName}:`, config)
  }
  
  // Handle log level errors
  function handleLogLevelError(error, loggerName, level, context = {}) {
    const errorContext = {
      operation: 'log-level',
      loggerName,
      level,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_LEVEL_FAILED,
      error,
      errorContext
    )
    
    // Log level errors are usually non-critical
    console.warn(`Log level failed for ${loggerName}:`, level)
  }
  
  // Handle log format errors
  function handleLogFormatError(error, loggerName, format, context = {}) {
    const errorContext = {
      operation: 'log-format',
      loggerName,
      format,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_FORMAT_FAILED,
      error,
      errorContext
    )
    
    // Log format errors are usually non-critical
    console.warn(`Log format failed for ${loggerName}:`, format)
  }
  
  // Handle log output errors
  function handleLogOutputError(error, loggerName, output, context = {}) {
    const errorContext = {
      operation: 'log-output',
      loggerName,
      output,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_OUTPUT_FAILED,
      error,
      errorContext
    )
    
    // Log output errors are usually non-critical
    console.warn(`Log output failed for ${loggerName}:`, output)
  }
  
  // Handle log transport errors
  function handleLogTransportError(error, loggerName, transport, context = {}) {
    const errorContext = {
      operation: 'log-transport',
      loggerName,
      transport,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_TRANSPORT_FAILED,
      error,
      errorContext
    )
    
    // Log transport errors are usually non-critical
    console.warn(`Log transport failed for ${loggerName}:`, transport)
  }
  
  // Handle log filter errors
  function handleLogFilterError(error, loggerName, filter, context = {}) {
    const errorContext = {
      operation: 'log-filter',
      loggerName,
      filter,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_FILTER_FAILED,
      error,
      errorContext
    )
    
    // Log filter errors are usually non-critical
    console.warn(`Log filter failed for ${loggerName}:`, filter)
  }
  
  // Handle log rotation errors
  function handleLogRotationError(error, loggerName, rotation, context = {}) {
    const errorContext = {
      operation: 'log-rotation',
      loggerName,
      rotation,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_ROTATION_FAILED,
      error,
      errorContext
    )
    
    // Log rotation errors are usually non-critical
    console.warn(`Log rotation failed for ${loggerName}:`, rotation)
  }
  
  // Handle log compression errors
  function handleLogCompressionError(error, loggerName, compression, context = {}) {
    const errorContext = {
      operation: 'log-compression',
      loggerName,
      compression,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_COMPRESSION_FAILED,
      error,
      errorContext
    )
    
    // Log compression errors are usually non-critical
    console.warn(`Log compression failed for ${loggerName}:`, compression)
  }
  
  // Handle log archival errors
  function handleLogArchivalError(error, loggerName, archival, context = {}) {
    const errorContext = {
      operation: 'log-archival',
      loggerName,
      archival,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_ARCHIVAL_FAILED,
      error,
      errorContext
    )
    
    // Log archival errors are usually non-critical
    console.warn(`Log archival failed for ${loggerName}:`, archival)
  }
  
  // Handle log cleanup errors
  function handleLogCleanupError(error, loggerName, cleanup, context = {}) {
    const errorContext = {
      operation: 'log-cleanup',
      loggerName,
      cleanup,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_CLEANUP_FAILED,
      error,
      errorContext
    )
    
    // Log cleanup errors are usually non-critical
    console.warn(`Log cleanup failed for ${loggerName}:`, cleanup)
  }
  
  // Handle log metadata errors
  function handleLogMetadataError(error, loggerName, metadata, context = {}) {
    const errorContext = {
      operation: 'log-metadata',
      loggerName,
      metadata,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_METADATA_FAILED,
      error,
      errorContext
    )
    
    // Log metadata errors are usually non-critical
    console.warn(`Log metadata failed for ${loggerName}:`, metadata)
  }
  
  // Handle log correlation errors
  function handleLogCorrelationError(error, loggerName, correlation, context = {}) {
    const errorContext = {
      operation: 'log-correlation',
      loggerName,
      correlation,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_CORRELATION_FAILED,
      error,
      errorContext
    )
    
    // Log correlation errors are usually non-critical
    console.warn(`Log correlation failed for ${loggerName}:`, correlation)
  }
  
  // Handle log structured errors
  function handleLogStructuredError(error, loggerName, structured, context = {}) {
    const errorContext = {
      operation: 'log-structured',
      loggerName,
      structured,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_STRUCTURED_FAILED,
      error,
      errorContext
    )
    
    // Log structured errors are usually non-critical
    console.warn(`Log structured failed for ${loggerName}:`, structured)
  }
  
  // Handle log analytics errors
  function handleLogAnalyticsError(error, loggerName, analytics, context = {}) {
    const errorContext = {
      operation: 'log-analytics',
      loggerName,
      analytics,
      ...context
    }
    
    errorHandling.addError(
      LOGGING_ERRORS.LOG_ANALYTICS_FAILED,
      error,
      errorContext
    )
    
    // Log analytics errors are usually non-critical
    console.warn(`Log analytics failed for ${loggerName}:`, analytics)
  }
  
  // Execute logging operation with error handling
  async function executeLoggingOperation(operation, operationFunction, context = {}) {
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
  
  // Get logging error summary
  function getLoggingErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add logging specific analysis
    summary.loggingErrors = {
      initializationErrors: summary.errorTypes[LOGGING_ERRORS.LOG_INITIALIZATION_FAILED] || 0,
      configurationErrors: summary.errorTypes[LOGGING_ERRORS.LOG_CONFIGURATION_FAILED] || 0,
      levelErrors: summary.errorTypes[LOGGING_ERRORS.LOG_LEVEL_FAILED] || 0,
      formatErrors: summary.errorTypes[LOGGING_ERRORS.LOG_FORMAT_FAILED] || 0,
      outputErrors: summary.errorTypes[LOGGING_ERRORS.LOG_OUTPUT_FAILED] || 0,
      transportErrors: summary.errorTypes[LOGGING_ERRORS.LOG_TRANSPORT_FAILED] || 0,
      filterErrors: summary.errorTypes[LOGGING_ERRORS.LOG_FILTER_FAILED] || 0,
      rotationErrors: summary.errorTypes[LOGGING_ERRORS.LOG_ROTATION_FAILED] || 0,
      compressionErrors: summary.errorTypes[LOGGING_ERRORS.LOG_COMPRESSION_FAILED] || 0,
      archivalErrors: summary.errorTypes[LOGGING_ERRORS.LOG_ARCHIVAL_FAILED] || 0,
      cleanupErrors: summary.errorTypes[LOGGING_ERRORS.LOG_CLEANUP_FAILED] || 0,
      metadataErrors: summary.errorTypes[LOGGING_ERRORS.LOG_METADATA_FAILED] || 0,
      correlationErrors: summary.errorTypes[LOGGING_ERRORS.LOG_CORRELATION_FAILED] || 0,
      structuredErrors: summary.errorTypes[LOGGING_ERRORS.LOG_STRUCTURED_FAILED] || 0,
      analyticsErrors: summary.errorTypes[LOGGING_ERRORS.LOG_ANALYTICS_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear logging errors
  function clearLoggingErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Logging specific methods
    handleLogInitializationError,
    handleLogConfigurationError,
    handleLogLevelError,
    handleLogFormatError,
    handleLogOutputError,
    handleLogTransportError,
    handleLogFilterError,
    handleLogRotationError,
    handleLogCompressionError,
    handleLogArchivalError,
    handleLogCleanupError,
    handleLogMetadataError,
    handleLogCorrelationError,
    handleLogStructuredError,
    handleLogAnalyticsError,
    
    // Utility methods
    executeLoggingOperation,
    getLoggingErrorSummary,
    clearLoggingErrors,
    
    // Constants
    LOGGING_ERRORS
  }
}







