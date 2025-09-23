import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useValidationErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Validation specific error types
  const VALIDATION_ERRORS = {
    VALIDATION_RULE_FAILED: 'validation-rule-failed',
    VALIDATION_SCHEMA_FAILED: 'validation-schema-failed',
    VALIDATION_FORMAT_FAILED: 'validation-format-failed',
    VALIDATION_TYPE_FAILED: 'validation-type-failed',
    VALIDATION_RANGE_FAILED: 'validation-range-failed',
    VALIDATION_LENGTH_FAILED: 'validation-length-failed',
    VALIDATION_PATTERN_FAILED: 'validation-pattern-failed',
    VALIDATION_REQUIRED_FAILED: 'validation-required-failed',
    VALIDATION_UNIQUE_FAILED: 'validation-unique-failed',
    VALIDATION_REFERENCE_FAILED: 'validation-reference-failed',
    VALIDATION_CONDITIONAL_FAILED: 'validation-conditional-failed',
    VALIDATION_CUSTOM_FAILED: 'validation-custom-failed',
    VALIDATION_ASYNC_FAILED: 'validation-async-failed',
    VALIDATION_TRANSFORM_FAILED: 'validation-transform-failed',
    VALIDATION_SANITIZATION_FAILED: 'validation-sanitization-failed'
  }
  
  // Handle validation rule errors
  function handleValidationRuleError(error, rule, value, context = {}) {
    const errorContext = {
      operation: 'validation-rule',
      rule,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_RULE_FAILED,
      error,
      errorContext
    )
    
    // Validation rule errors are usually non-critical
    console.warn(`Validation rule failed for ${rule}:`, value)
  }
  
  // Handle validation schema errors
  function handleValidationSchemaError(error, schema, data, context = {}) {
    const errorContext = {
      operation: 'validation-schema',
      schema,
      data,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_SCHEMA_FAILED,
      error,
      errorContext
    )
    
    // Validation schema errors are usually non-critical
    console.warn(`Validation schema failed:`, schema)
  }
  
  // Handle validation format errors
  function handleValidationFormatError(error, format, value, context = {}) {
    const errorContext = {
      operation: 'validation-format',
      format,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_FORMAT_FAILED,
      error,
      errorContext
    )
    
    // Validation format errors are usually non-critical
    console.warn(`Validation format failed for ${format}:`, value)
  }
  
  // Handle validation type errors
  function handleValidationTypeError(error, expectedType, actualType, value, context = {}) {
    const errorContext = {
      operation: 'validation-type',
      expectedType,
      actualType,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_TYPE_FAILED,
      error,
      errorContext
    )
    
    // Validation type errors are usually non-critical
    console.warn(`Validation type failed: expected ${expectedType}, got ${actualType}`)
  }
  
  // Handle validation range errors
  function handleValidationRangeError(error, min, max, value, context = {}) {
    const errorContext = {
      operation: 'validation-range',
      min,
      max,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_RANGE_FAILED,
      error,
      errorContext
    )
    
    // Validation range errors are usually non-critical
    console.warn(`Validation range failed: ${value} not in range [${min}, ${max}]`)
  }
  
  // Handle validation length errors
  function handleValidationLengthError(error, minLength, maxLength, value, context = {}) {
    const errorContext = {
      operation: 'validation-length',
      minLength,
      maxLength,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_LENGTH_FAILED,
      error,
      errorContext
    )
    
    // Validation length errors are usually non-critical
    console.warn(`Validation length failed: ${value.length} not in range [${minLength}, ${maxLength}]`)
  }
  
  // Handle validation pattern errors
  function handleValidationPatternError(error, pattern, value, context = {}) {
    const errorContext = {
      operation: 'validation-pattern',
      pattern,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_PATTERN_FAILED,
      error,
      errorContext
    )
    
    // Validation pattern errors are usually non-critical
    console.warn(`Validation pattern failed for ${pattern}:`, value)
  }
  
  // Handle validation required errors
  function handleValidationRequiredError(error, field, context = {}) {
    const errorContext = {
      operation: 'validation-required',
      field,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_REQUIRED_FAILED,
      error,
      errorContext
    )
    
    // Validation required errors are usually non-critical
    console.warn(`Validation required failed for field:`, field)
  }
  
  // Handle validation unique errors
  function handleValidationUniqueError(error, field, value, context = {}) {
    const errorContext = {
      operation: 'validation-unique',
      field,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_UNIQUE_FAILED,
      error,
      errorContext
    )
    
    // Validation unique errors are usually non-critical
    console.warn(`Validation unique failed for field ${field}:`, value)
  }
  
  // Handle validation reference errors
  function handleValidationReferenceError(error, field, reference, context = {}) {
    const errorContext = {
      operation: 'validation-reference',
      field,
      reference,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_REFERENCE_FAILED,
      error,
      errorContext
    )
    
    // Validation reference errors are usually non-critical
    console.warn(`Validation reference failed for field ${field}:`, reference)
  }
  
  // Handle validation conditional errors
  function handleValidationConditionalError(error, condition, value, context = {}) {
    const errorContext = {
      operation: 'validation-conditional',
      condition,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_CONDITIONAL_FAILED,
      error,
      errorContext
    )
    
    // Validation conditional errors are usually non-critical
    console.warn(`Validation conditional failed for condition ${condition}:`, value)
  }
  
  // Handle validation custom errors
  function handleValidationCustomError(error, validator, value, context = {}) {
    const errorContext = {
      operation: 'validation-custom',
      validator,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_CUSTOM_FAILED,
      error,
      errorContext
    )
    
    // Validation custom errors are usually non-critical
    console.warn(`Validation custom failed for validator ${validator}:`, value)
  }
  
  // Handle validation async errors
  function handleValidationAsyncError(error, validator, value, context = {}) {
    const errorContext = {
      operation: 'validation-async',
      validator,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_ASYNC_FAILED,
      error,
      errorContext
    )
    
    // Validation async errors are usually non-critical
    console.warn(`Validation async failed for validator ${validator}:`, value)
  }
  
  // Handle validation transform errors
  function handleValidationTransformError(error, transformer, value, context = {}) {
    const errorContext = {
      operation: 'validation-transform',
      transformer,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_TRANSFORM_FAILED,
      error,
      errorContext
    )
    
    // Validation transform errors are usually non-critical
    console.warn(`Validation transform failed for transformer ${transformer}:`, value)
  }
  
  // Handle validation sanitization errors
  function handleValidationSanitizationError(error, sanitizer, value, context = {}) {
    const errorContext = {
      operation: 'validation-sanitization',
      sanitizer,
      value,
      ...context
    }
    
    errorHandling.addError(
      VALIDATION_ERRORS.VALIDATION_SANITIZATION_FAILED,
      error,
      errorContext
    )
    
    // Validation sanitization errors are usually non-critical
    console.warn(`Validation sanitization failed for sanitizer ${sanitizer}:`, value)
  }
  
  // Execute validation operation with error handling
  async function executeValidationOperation(operation, operationFunction, context = {}) {
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
  
  // Get validation error summary
  function getValidationErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add validation specific analysis
    summary.validationErrors = {
      ruleErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_RULE_FAILED] || 0,
      schemaErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_SCHEMA_FAILED] || 0,
      formatErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_FORMAT_FAILED] || 0,
      typeErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_TYPE_FAILED] || 0,
      rangeErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_RANGE_FAILED] || 0,
      lengthErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_LENGTH_FAILED] || 0,
      patternErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_PATTERN_FAILED] || 0,
      requiredErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_REQUIRED_FAILED] || 0,
      uniqueErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_UNIQUE_FAILED] || 0,
      referenceErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_REFERENCE_FAILED] || 0,
      conditionalErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_CONDITIONAL_FAILED] || 0,
      customErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_CUSTOM_FAILED] || 0,
      asyncErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_ASYNC_FAILED] || 0,
      transformErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_TRANSFORM_FAILED] || 0,
      sanitizationErrors: summary.errorTypes[VALIDATION_ERRORS.VALIDATION_SANITIZATION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear validation errors
  function clearValidationErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Validation specific methods
    handleValidationRuleError,
    handleValidationSchemaError,
    handleValidationFormatError,
    handleValidationTypeError,
    handleValidationRangeError,
    handleValidationLengthError,
    handleValidationPatternError,
    handleValidationRequiredError,
    handleValidationUniqueError,
    handleValidationReferenceError,
    handleValidationConditionalError,
    handleValidationCustomError,
    handleValidationAsyncError,
    handleValidationTransformError,
    handleValidationSanitizationError,
    
    // Utility methods
    executeValidationOperation,
    getValidationErrorSummary,
    clearValidationErrors,
    
    // Constants
    VALIDATION_ERRORS
  }
}







