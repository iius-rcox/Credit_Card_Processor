import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useUtilityErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Utility specific error types
  const UTILITY_ERRORS = {
    UTILITY_INITIALIZATION_FAILED: 'utility-initialization-failed',
    UTILITY_CONFIGURATION_FAILED: 'utility-configuration-failed',
    UTILITY_EXECUTION_FAILED: 'utility-execution-failed',
    UTILITY_VALIDATION_FAILED: 'utility-validation-failed',
    UTILITY_TRANSFORMATION_FAILED: 'utility-transformation-failed',
    UTILITY_FORMATTING_FAILED: 'utility-formatting-failed',
    UTILITY_PARSING_FAILED: 'utility-parsing-failed',
    UTILITY_SERIALIZATION_FAILED: 'utility-serialization-failed',
    UTILITY_DESERIALIZATION_FAILED: 'utility-deserialization-failed',
    UTILITY_ENCRYPTION_FAILED: 'utility-encryption-failed',
    UTILITY_DECRYPTION_FAILED: 'utility-decryption-failed',
    UTILITY_HASHING_FAILED: 'utility-hashing-failed',
    UTILITY_COMPRESSION_FAILED: 'utility-compression-failed',
    UTILITY_DECOMPRESSION_FAILED: 'utility-decompression-failed',
    UTILITY_ENCODING_FAILED: 'utility-encoding-failed'
  }
  
  // Handle utility initialization errors
  function handleUtilityInitializationError(error, utilityName, context = {}) {
    const errorContext = {
      operation: 'utility-initialization',
      utilityName,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_INITIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Utility initialization errors are usually non-critical
    console.warn(`Utility initialization failed for ${utilityName}:`, error)
  }
  
  // Handle utility configuration errors
  function handleUtilityConfigurationError(error, utilityName, config, context = {}) {
    const errorContext = {
      operation: 'utility-configuration',
      utilityName,
      config,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_CONFIGURATION_FAILED,
      error,
      errorContext
    )
    
    // Utility configuration errors are usually non-critical
    console.warn(`Utility configuration failed for ${utilityName}:`, config)
  }
  
  // Handle utility execution errors
  function handleUtilityExecutionError(error, utilityName, input, context = {}) {
    const errorContext = {
      operation: 'utility-execution',
      utilityName,
      input,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_EXECUTION_FAILED,
      error,
      errorContext
    )
    
    // Utility execution errors are usually non-critical
    console.warn(`Utility execution failed for ${utilityName}:`, input)
  }
  
  // Handle utility validation errors
  function handleUtilityValidationError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-validation',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_VALIDATION_FAILED,
      error,
      errorContext
    )
    
    // Utility validation errors are usually non-critical
    console.warn(`Utility validation failed for ${utilityName}:`, data)
  }
  
  // Handle utility transformation errors
  function handleUtilityTransformationError(error, utilityName, input, output, context = {}) {
    const errorContext = {
      operation: 'utility-transformation',
      utilityName,
      input,
      output,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_TRANSFORMATION_FAILED,
      error,
      errorContext
    )
    
    // Utility transformation errors are usually non-critical
    console.warn(`Utility transformation failed for ${utilityName}:`, input)
  }
  
  // Handle utility formatting errors
  function handleUtilityFormattingError(error, utilityName, format, data, context = {}) {
    const errorContext = {
      operation: 'utility-formatting',
      utilityName,
      format,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_FORMATTING_FAILED,
      error,
      errorContext
    )
    
    // Utility formatting errors are usually non-critical
    console.warn(`Utility formatting failed for ${utilityName}:`, format)
  }
  
  // Handle utility parsing errors
  function handleUtilityParsingError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-parsing',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_PARSING_FAILED,
      error,
      errorContext
    )
    
    // Utility parsing errors are usually non-critical
    console.warn(`Utility parsing failed for ${utilityName}:`, data)
  }
  
  // Handle utility serialization errors
  function handleUtilitySerializationError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-serialization',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_SERIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Utility serialization errors are usually non-critical
    console.warn(`Utility serialization failed for ${utilityName}:`, data)
  }
  
  // Handle utility deserialization errors
  function handleUtilityDeserializationError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-deserialization',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_DESERIALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Utility deserialization errors are usually non-critical
    console.warn(`Utility deserialization failed for ${utilityName}:`, data)
  }
  
  // Handle utility encryption errors
  function handleUtilityEncryptionError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-encryption',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_ENCRYPTION_FAILED,
      error,
      errorContext
    )
    
    // Utility encryption errors are usually non-critical
    console.warn(`Utility encryption failed for ${utilityName}:`, data)
  }
  
  // Handle utility decryption errors
  function handleUtilityDecryptionError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-decryption',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_DECRYPTION_FAILED,
      error,
      errorContext
    )
    
    // Utility decryption errors are usually non-critical
    console.warn(`Utility decryption failed for ${utilityName}:`, data)
  }
  
  // Handle utility hashing errors
  function handleUtilityHashingError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-hashing',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_HASHING_FAILED,
      error,
      errorContext
    )
    
    // Utility hashing errors are usually non-critical
    console.warn(`Utility hashing failed for ${utilityName}:`, data)
  }
  
  // Handle utility compression errors
  function handleUtilityCompressionError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-compression',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_COMPRESSION_FAILED,
      error,
      errorContext
    )
    
    // Utility compression errors are usually non-critical
    console.warn(`Utility compression failed for ${utilityName}:`, data)
  }
  
  // Handle utility decompression errors
  function handleUtilityDecompressionError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-decompression',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_DECOMPRESSION_FAILED,
      error,
      errorContext
    )
    
    // Utility decompression errors are usually non-critical
    console.warn(`Utility decompression failed for ${utilityName}:`, data)
  }
  
  // Handle utility encoding errors
  function handleUtilityEncodingError(error, utilityName, data, context = {}) {
    const errorContext = {
      operation: 'utility-encoding',
      utilityName,
      data,
      ...context
    }
    
    errorHandling.addError(
      UTILITY_ERRORS.UTILITY_ENCODING_FAILED,
      error,
      errorContext
    )
    
    // Utility encoding errors are usually non-critical
    console.warn(`Utility encoding failed for ${utilityName}:`, data)
  }
  
  // Execute utility operation with error handling
  async function executeUtilityOperation(operation, operationFunction, context = {}) {
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
  
  // Get utility error summary
  function getUtilityErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add utility specific analysis
    summary.utilityErrors = {
      initializationErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_INITIALIZATION_FAILED] || 0,
      configurationErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_CONFIGURATION_FAILED] || 0,
      executionErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_EXECUTION_FAILED] || 0,
      validationErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_VALIDATION_FAILED] || 0,
      transformationErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_TRANSFORMATION_FAILED] || 0,
      formattingErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_FORMATTING_FAILED] || 0,
      parsingErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_PARSING_FAILED] || 0,
      serializationErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_SERIALIZATION_FAILED] || 0,
      deserializationErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_DESERIALIZATION_FAILED] || 0,
      encryptionErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_ENCRYPTION_FAILED] || 0,
      decryptionErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_DECRYPTION_FAILED] || 0,
      hashingErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_HASHING_FAILED] || 0,
      compressionErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_COMPRESSION_FAILED] || 0,
      decompressionErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_DECOMPRESSION_FAILED] || 0,
      encodingErrors: summary.errorTypes[UTILITY_ERRORS.UTILITY_ENCODING_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear utility errors
  function clearUtilityErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Utility specific methods
    handleUtilityInitializationError,
    handleUtilityConfigurationError,
    handleUtilityExecutionError,
    handleUtilityValidationError,
    handleUtilityTransformationError,
    handleUtilityFormattingError,
    handleUtilityParsingError,
    handleUtilitySerializationError,
    handleUtilityDeserializationError,
    handleUtilityEncryptionError,
    handleUtilityDecryptionError,
    handleUtilityHashingError,
    handleUtilityCompressionError,
    handleUtilityDecompressionError,
    handleUtilityEncodingError,
    
    // Utility methods
    executeUtilityOperation,
    getUtilityErrorSummary,
    clearUtilityErrors,
    
    // Constants
    UTILITY_ERRORS
  }
}








