import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function usePerformanceErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Performance specific error types
  const PERFORMANCE_ERRORS = {
    PERFORMANCE_MARK_FAILED: 'performance-mark-failed',
    PERFORMANCE_MEASURE_FAILED: 'performance-measure-failed',
    PERFORMANCE_OBSERVER_FAILED: 'performance-observer-failed',
    PERFORMANCE_ENTRY_FAILED: 'performance-entry-failed',
    PERFORMANCE_TIMING_FAILED: 'performance-timing-failed',
    PERFORMANCE_MEMORY_FAILED: 'performance-memory-failed',
    PERFORMANCE_CPU_FAILED: 'performance-cpu-failed',
    PERFORMANCE_NETWORK_FAILED: 'performance-network-failed',
    PERFORMANCE_RENDER_FAILED: 'performance-render-failed',
    PERFORMANCE_LAYOUT_FAILED: 'performance-layout-failed',
    PERFORMANCE_PAINT_FAILED: 'performance-paint-failed',
    PERFORMANCE_SCRIPT_FAILED: 'performance-script-failed',
    PERFORMANCE_STYLE_FAILED: 'performance-style-failed',
    PERFORMANCE_IMAGE_FAILED: 'performance-image-failed',
    PERFORMANCE_FONT_FAILED: 'performance-font-failed'
  }
  
  // Handle performance mark errors
  function handlePerformanceMarkError(error, markName, context = {}) {
    const errorContext = {
      operation: 'performance-mark',
      markName,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_MARK_FAILED,
      error,
      errorContext
    )
    
    // Performance mark errors are usually non-critical
    console.warn(`Performance mark failed for ${markName}:`, error)
  }
  
  // Handle performance measure errors
  function handlePerformanceMeasureError(error, measureName, startMark, endMark, context = {}) {
    const errorContext = {
      operation: 'performance-measure',
      measureName,
      startMark,
      endMark,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_MEASURE_FAILED,
      error,
      errorContext
    )
    
    // Performance measure errors are usually non-critical
    console.warn(`Performance measure failed for ${measureName}:`, error)
  }
  
  // Handle performance observer errors
  function handlePerformanceObserverError(error, observerType, context = {}) {
    const errorContext = {
      operation: 'performance-observer',
      observerType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_OBSERVER_FAILED,
      error,
      errorContext
    )
    
    // Performance observer errors are usually non-critical
    console.warn(`Performance observer failed for ${observerType}:`, error)
  }
  
  // Handle performance entry errors
  function handlePerformanceEntryError(error, entryType, context = {}) {
    const errorContext = {
      operation: 'performance-entry',
      entryType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_ENTRY_FAILED,
      error,
      errorContext
    )
    
    // Performance entry errors are usually non-critical
    console.warn(`Performance entry failed for ${entryType}:`, error)
  }
  
  // Handle performance timing errors
  function handlePerformanceTimingError(error, timingType, context = {}) {
    const errorContext = {
      operation: 'performance-timing',
      timingType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_TIMING_FAILED,
      error,
      errorContext
    )
    
    // Performance timing errors are usually non-critical
    console.warn(`Performance timing failed for ${timingType}:`, error)
  }
  
  // Handle performance memory errors
  function handlePerformanceMemoryError(error, memoryType, context = {}) {
    const errorContext = {
      operation: 'performance-memory',
      memoryType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_MEMORY_FAILED,
      error,
      errorContext
    )
    
    // Performance memory errors are usually non-critical
    console.warn(`Performance memory failed for ${memoryType}:`, error)
  }
  
  // Handle performance CPU errors
  function handlePerformanceCPUError(error, cpuType, context = {}) {
    const errorContext = {
      operation: 'performance-cpu',
      cpuType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_CPU_FAILED,
      error,
      errorContext
    )
    
    // Performance CPU errors are usually non-critical
    console.warn(`Performance CPU failed for ${cpuType}:`, error)
  }
  
  // Handle performance network errors
  function handlePerformanceNetworkError(error, networkType, context = {}) {
    const errorContext = {
      operation: 'performance-network',
      networkType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_NETWORK_FAILED,
      error,
      errorContext
    )
    
    // Performance network errors are usually non-critical
    console.warn(`Performance network failed for ${networkType}:`, error)
  }
  
  // Handle performance render errors
  function handlePerformanceRenderError(error, renderType, context = {}) {
    const errorContext = {
      operation: 'performance-render',
      renderType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_RENDER_FAILED,
      error,
      errorContext
    )
    
    // Performance render errors are usually non-critical
    console.warn(`Performance render failed for ${renderType}:`, error)
  }
  
  // Handle performance layout errors
  function handlePerformanceLayoutError(error, layoutType, context = {}) {
    const errorContext = {
      operation: 'performance-layout',
      layoutType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_LAYOUT_FAILED,
      error,
      errorContext
    )
    
    // Performance layout errors are usually non-critical
    console.warn(`Performance layout failed for ${layoutType}:`, error)
  }
  
  // Handle performance paint errors
  function handlePerformancePaintError(error, paintType, context = {}) {
    const errorContext = {
      operation: 'performance-paint',
      paintType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_PAINT_FAILED,
      error,
      errorContext
    )
    
    // Performance paint errors are usually non-critical
    console.warn(`Performance paint failed for ${paintType}:`, error)
  }
  
  // Handle performance script errors
  function handlePerformanceScriptError(error, scriptType, context = {}) {
    const errorContext = {
      operation: 'performance-script',
      scriptType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_SCRIPT_FAILED,
      error,
      errorContext
    )
    
    // Performance script errors are usually non-critical
    console.warn(`Performance script failed for ${scriptType}:`, error)
  }
  
  // Handle performance style errors
  function handlePerformanceStyleError(error, styleType, context = {}) {
    const errorContext = {
      operation: 'performance-style',
      styleType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_STYLE_FAILED,
      error,
      errorContext
    )
    
    // Performance style errors are usually non-critical
    console.warn(`Performance style failed for ${styleType}:`, error)
  }
  
  // Handle performance image errors
  function handlePerformanceImageError(error, imageType, context = {}) {
    const errorContext = {
      operation: 'performance-image',
      imageType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_IMAGE_FAILED,
      error,
      errorContext
    )
    
    // Performance image errors are usually non-critical
    console.warn(`Performance image failed for ${imageType}:`, error)
  }
  
  // Handle performance font errors
  function handlePerformanceFontError(error, fontType, context = {}) {
    const errorContext = {
      operation: 'performance-font',
      fontType,
      ...context
    }
    
    errorHandling.addError(
      PERFORMANCE_ERRORS.PERFORMANCE_FONT_FAILED,
      error,
      errorContext
    )
    
    // Performance font errors are usually non-critical
    console.warn(`Performance font failed for ${fontType}:`, error)
  }
  
  // Execute performance operation with error handling
  async function executePerformanceOperation(operation, operationFunction, context = {}) {
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
  
  // Get performance error summary
  function getPerformanceErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add performance specific analysis
    summary.performanceErrors = {
      markErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_MARK_FAILED] || 0,
      measureErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_MEASURE_FAILED] || 0,
      observerErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_OBSERVER_FAILED] || 0,
      entryErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_ENTRY_FAILED] || 0,
      timingErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_TIMING_FAILED] || 0,
      memoryErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_MEMORY_FAILED] || 0,
      cpuErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_CPU_FAILED] || 0,
      networkErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_NETWORK_FAILED] || 0,
      renderErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_RENDER_FAILED] || 0,
      layoutErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_LAYOUT_FAILED] || 0,
      paintErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_PAINT_FAILED] || 0,
      scriptErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_SCRIPT_FAILED] || 0,
      styleErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_STYLE_FAILED] || 0,
      imageErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_IMAGE_FAILED] || 0,
      fontErrors: summary.errorTypes[PERFORMANCE_ERRORS.PERFORMANCE_FONT_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear performance errors
  function clearPerformanceErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Performance specific methods
    handlePerformanceMarkError,
    handlePerformanceMeasureError,
    handlePerformanceObserverError,
    handlePerformanceEntryError,
    handlePerformanceTimingError,
    handlePerformanceMemoryError,
    handlePerformanceCPUError,
    handlePerformanceNetworkError,
    handlePerformanceRenderError,
    handlePerformanceLayoutError,
    handlePerformancePaintError,
    handlePerformanceScriptError,
    handlePerformanceStyleError,
    handlePerformanceImageError,
    handlePerformanceFontError,
    
    // Utility methods
    executePerformanceOperation,
    getPerformanceErrorSummary,
    clearPerformanceErrors,
    
    // Constants
    PERFORMANCE_ERRORS
  }
}




