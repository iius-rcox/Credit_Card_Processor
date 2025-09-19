import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useDataProcessingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Data processing specific error types
  const DATA_PROCESSING_ERRORS = {
    DATA_LOADING_FAILED: 'data-loading-failed',
    DATA_PARSING_FAILED: 'data-parsing-failed',
    DATA_VALIDATION_FAILED: 'data-validation-failed',
    DATA_TRANSFORMATION_FAILED: 'data-transformation-failed',
    DATA_FILTERING_FAILED: 'data-filtering-failed',
    DATA_SORTING_FAILED: 'data-sorting-failed',
    DATA_GROUPING_FAILED: 'data-grouping-failed',
    DATA_AGGREGATION_FAILED: 'data-aggregation-failed',
    DATA_MAPPING_FAILED: 'data-mapping-failed',
    DATA_REDUCING_FAILED: 'data-reducing-failed',
    DATA_MERGING_FAILED: 'data-merging-failed',
    DATA_SPLITTING_FAILED: 'data-splitting-failed',
    DATA_NORMALIZATION_FAILED: 'data-normalization-failed',
    DATA_DENORMALIZATION_FAILED: 'data-denormalization-failed',
    DATA_CLEANING_FAILED: 'data-cleaning-failed'
  }
  
  // Handle data loading errors
  function handleDataLoadingError(error, dataSource, context = {}) {
    const errorContext = {
      operation: 'data-loading',
      dataSource,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_LOADING_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to load data from ${dataSource}. Please try again.`
    )
  }
  
  // Handle data parsing errors
  function handleDataParsingError(error, dataType, data, context = {}) {
    const errorContext = {
      operation: 'data-parsing',
      dataType,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_PARSING_FAILED,
      error,
      errorContext
    )
    
    // Data parsing errors are usually non-critical
    console.warn(`Data parsing failed for ${dataType}:`, data)
  }
  
  // Handle data validation errors
  function handleDataValidationError(error, validationRule, data, context = {}) {
    const errorContext = {
      operation: 'data-validation',
      validationRule,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_VALIDATION_FAILED,
      error,
      errorContext
    )
    
    // Data validation errors are usually non-critical
    console.warn(`Data validation failed for ${validationRule}:`, data)
  }
  
  // Handle data transformation errors
  function handleDataTransformationError(error, transformation, input, output, context = {}) {
    const errorContext = {
      operation: 'data-transformation',
      transformation,
      input,
      output,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_TRANSFORMATION_FAILED,
      error,
      errorContext
    )
    
    // Data transformation errors are usually non-critical
    console.warn(`Data transformation failed for ${transformation}:`, input)
  }
  
  // Handle data filtering errors
  function handleDataFilteringError(error, filter, data, context = {}) {
    const errorContext = {
      operation: 'data-filtering',
      filter,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_FILTERING_FAILED,
      error,
      errorContext
    )
    
    // Data filtering errors are usually non-critical
    console.warn(`Data filtering failed for ${filter}:`, data)
  }
  
  // Handle data sorting errors
  function handleDataSortingError(error, sortKey, data, context = {}) {
    const errorContext = {
      operation: 'data-sorting',
      sortKey,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_SORTING_FAILED,
      error,
      errorContext
    )
    
    // Data sorting errors are usually non-critical
    console.warn(`Data sorting failed for ${sortKey}:`, data)
  }
  
  // Handle data grouping errors
  function handleDataGroupingError(error, groupKey, data, context = {}) {
    const errorContext = {
      operation: 'data-grouping',
      groupKey,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_GROUPING_FAILED,
      error,
      errorContext
    )
    
    // Data grouping errors are usually non-critical
    console.warn(`Data grouping failed for ${groupKey}:`, data)
  }
  
  // Handle data aggregation errors
  function handleDataAggregationError(error, aggregation, data, context = {}) {
    const errorContext = {
      operation: 'data-aggregation',
      aggregation,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_AGGREGATION_FAILED,
      error,
      errorContext
    )
    
    // Data aggregation errors are usually non-critical
    console.warn(`Data aggregation failed for ${aggregation}:`, data)
  }
  
  // Handle data mapping errors
  function handleDataMappingError(error, mapping, input, output, context = {}) {
    const errorContext = {
      operation: 'data-mapping',
      mapping,
      input,
      output,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_MAPPING_FAILED,
      error,
      errorContext
    )
    
    // Data mapping errors are usually non-critical
    console.warn(`Data mapping failed for ${mapping}:`, input)
  }
  
  // Handle data reducing errors
  function handleDataReducingError(error, reducer, data, context = {}) {
    const errorContext = {
      operation: 'data-reducing',
      reducer,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_REDUCING_FAILED,
      error,
      errorContext
    )
    
    // Data reducing errors are usually non-critical
    console.warn(`Data reducing failed for ${reducer}:`, data)
  }
  
  // Handle data merging errors
  function handleDataMergingError(error, mergeStrategy, datasets, context = {}) {
    const errorContext = {
      operation: 'data-merging',
      mergeStrategy,
      datasets,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_MERGING_FAILED,
      error,
      errorContext
    )
    
    // Data merging errors are usually non-critical
    console.warn(`Data merging failed for ${mergeStrategy}:`, datasets)
  }
  
  // Handle data splitting errors
  function handleDataSplittingError(error, splitStrategy, data, context = {}) {
    const errorContext = {
      operation: 'data-splitting',
      splitStrategy,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_SPLITTING_FAILED,
      error,
      errorContext
    )
    
    // Data splitting errors are usually non-critical
    console.warn(`Data splitting failed for ${splitStrategy}:`, data)
  }
  
  // Handle data normalization errors
  function handleDataNormalizationError(error, normalization, data, context = {}) {
    const errorContext = {
      operation: 'data-normalization',
      normalization,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_NORMALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Data normalization errors are usually non-critical
    console.warn(`Data normalization failed for ${normalization}:`, data)
  }
  
  // Handle data denormalization errors
  function handleDataDenormalizationError(error, denormalization, data, context = {}) {
    const errorContext = {
      operation: 'data-denormalization',
      denormalization,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_DENORMALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Data denormalization errors are usually non-critical
    console.warn(`Data denormalization failed for ${denormalization}:`, data)
  }
  
  // Handle data cleaning errors
  function handleDataCleaningError(error, cleaningRule, data, context = {}) {
    const errorContext = {
      operation: 'data-cleaning',
      cleaningRule,
      data,
      ...context
    }
    
    errorHandling.addError(
      DATA_PROCESSING_ERRORS.DATA_CLEANING_FAILED,
      error,
      errorContext
    )
    
    // Data cleaning errors are usually non-critical
    console.warn(`Data cleaning failed for ${cleaningRule}:`, data)
  }
  
  // Execute data processing operation with error handling
  async function executeDataProcessingOperation(operation, operationFunction, context = {}) {
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
  
  // Get data processing error summary
  function getDataProcessingErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add data processing specific analysis
    summary.dataProcessingErrors = {
      loadingErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_LOADING_FAILED] || 0,
      parsingErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_PARSING_FAILED] || 0,
      validationErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_VALIDATION_FAILED] || 0,
      transformationErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_TRANSFORMATION_FAILED] || 0,
      filteringErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_FILTERING_FAILED] || 0,
      sortingErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_SORTING_FAILED] || 0,
      groupingErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_GROUPING_FAILED] || 0,
      aggregationErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_AGGREGATION_FAILED] || 0,
      mappingErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_MAPPING_FAILED] || 0,
      reducingErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_REDUCING_FAILED] || 0,
      mergingErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_MERGING_FAILED] || 0,
      splittingErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_SPLITTING_FAILED] || 0,
      normalizationErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_NORMALIZATION_FAILED] || 0,
      denormalizationErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_DENORMALIZATION_FAILED] || 0,
      cleaningErrors: summary.errorTypes[DATA_PROCESSING_ERRORS.DATA_CLEANING_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear data processing errors
  function clearDataProcessingErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Data processing specific methods
    handleDataLoadingError,
    handleDataParsingError,
    handleDataValidationError,
    handleDataTransformationError,
    handleDataFilteringError,
    handleDataSortingError,
    handleDataGroupingError,
    handleDataAggregationError,
    handleDataMappingError,
    handleDataReducingError,
    handleDataMergingError,
    handleDataSplittingError,
    handleDataNormalizationError,
    handleDataDenormalizationError,
    handleDataCleaningError,
    
    // Utility methods
    executeDataProcessingOperation,
    getDataProcessingErrorSummary,
    clearDataProcessingErrors,
    
    // Constants
    DATA_PROCESSING_ERRORS
  }
}




