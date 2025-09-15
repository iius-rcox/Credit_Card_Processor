import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useEdgeComputingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Edge computing specific error types
  const EDGE_COMPUTING_ERRORS = {
    EDGE_DEVICE_FAILED: 'edge-device-failed',
    EDGE_NETWORK_FAILED: 'edge-network-failed',
    EDGE_COMPUTATION_FAILED: 'edge-computation-failed',
    EDGE_STORAGE_FAILED: 'edge-storage-failed',
    EDGE_SYNC_FAILED: 'edge-sync-failed',
    EDGE_OFFLOADING_FAILED: 'edge-offloading-failed',
    EDGE_CACHING_FAILED: 'edge-caching-failed',
    EDGE_PROCESSING_FAILED: 'edge-processing-failed',
    EDGE_ANALYTICS_FAILED: 'edge-analytics-failed',
    EDGE_ML_FAILED: 'edge-ml-failed',
    EDGE_AI_FAILED: 'edge-ai-failed',
    EDGE_IOT_FAILED: 'edge-iot-failed',
    EDGE_SECURITY_FAILED: 'edge-security-failed',
    EDGE_MONITORING_FAILED: 'edge-monitoring-failed',
    EDGE_OPTIMIZATION_FAILED: 'edge-optimization-failed',
    EDGE_SCALING_FAILED: 'edge-scaling-failed'
  }
  
  // Handle edge device errors
  function handleEdgeDeviceError(error, device, context = {}) {
    const errorContext = {
      operation: 'edge-device',
      device,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_DEVICE_FAILED,
      error,
      errorContext
    }
    
    // Edge device errors are usually non-critical
    console.warn(`Edge device failed:`, device)
  }
  
  // Handle edge network errors
  function handleEdgeNetworkError(error, network, context = {}) {
    const errorContext = {
      operation: 'edge-network',
      network,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_NETWORK_FAILED,
      error,
      errorContext
    }
    
    // Edge network errors are usually non-critical
    console.warn(`Edge network failed:`, network)
  }
  
  // Handle edge computation errors
  function handleEdgeComputationError(error, computation, context = {}) {
    const errorContext = {
      operation: 'edge-computation',
      computation,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_COMPUTATION_FAILED,
      error,
      errorContext
    }
    
    // Edge computation errors are usually non-critical
    console.warn(`Edge computation failed:`, computation)
  }
  
  // Handle edge storage errors
  function handleEdgeStorageError(error, storage, context = {}) {
    const errorContext = {
      operation: 'edge-storage',
      storage,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_STORAGE_FAILED,
      error,
      errorContext
    }
    
    // Edge storage errors are usually non-critical
    console.warn(`Edge storage failed:`, storage)
  }
  
  // Handle edge sync errors
  function handleEdgeSyncError(error, sync, context = {}) {
    const errorContext = {
      operation: 'edge-sync',
      sync,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_SYNC_FAILED,
      error,
      errorContext
    }
    
    // Edge sync errors are usually non-critical
    console.warn(`Edge sync failed:`, sync)
  }
  
  // Handle edge offloading errors
  function handleEdgeOffloadingError(error, offloading, context = {}) {
    const errorContext = {
      operation: 'edge-offloading',
      offloading,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_OFFLOADING_FAILED,
      error,
      errorContext
    }
    
    // Edge offloading errors are usually non-critical
    console.warn(`Edge offloading failed:`, offloading)
  }
  
  // Handle edge caching errors
  function handleEdgeCachingError(error, caching, context = {}) {
    const errorContext = {
      operation: 'edge-caching',
      caching,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_CACHING_FAILED,
      error,
      errorContext
    }
    
    // Edge caching errors are usually non-critical
    console.warn(`Edge caching failed:`, caching)
  }
  
  // Handle edge processing errors
  function handleEdgeProcessingError(error, processing, context = {}) {
    const errorContext = {
      operation: 'edge-processing',
      processing,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_PROCESSING_FAILED,
      error,
      errorContext
    }
    
    // Edge processing errors are usually non-critical
    console.warn(`Edge processing failed:`, processing)
  }
  
  // Handle edge analytics errors
  function handleEdgeAnalyticsError(error, analytics, context = {}) {
    const errorContext = {
      operation: 'edge-analytics',
      analytics,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_ANALYTICS_FAILED,
      error,
      errorContext
    }
    
    // Edge analytics errors are usually non-critical
    console.warn(`Edge analytics failed:`, analytics)
  }
  
  // Handle edge ML errors
  function handleEdgeMLError(error, ml, context = {}) {
    const errorContext = {
      operation: 'edge-ml',
      ml,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_ML_FAILED,
      error,
      errorContext
    }
    
    // Edge ML errors are usually non-critical
    console.warn(`Edge ML failed:`, ml)
  }
  
  // Handle edge AI errors
  function handleEdgeAIError(error, ai, context = {}) {
    const errorContext = {
      operation: 'edge-ai',
      ai,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_AI_FAILED,
      error,
      errorContext
    }
    
    // Edge AI errors are usually non-critical
    console.warn(`Edge AI failed:`, ai)
  }
  
  // Handle edge IoT errors
  function handleEdgeIoTError(error, iot, context = {}) {
    const errorContext = {
      operation: 'edge-iot',
      iot,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_IOT_FAILED,
      error,
      errorContext
    }
    
    // Edge IoT errors are usually non-critical
    console.warn(`Edge IoT failed:`, iot)
  }
  
  // Handle edge security errors
  function handleEdgeSecurityError(error, security, context = {}) {
    const errorContext = {
      operation: 'edge-security',
      security,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_SECURITY_FAILED,
      error,
      errorContext
    }
    
    // Edge security errors are usually non-critical
    console.warn(`Edge security failed:`, security)
  }
  
  // Handle edge monitoring errors
  function handleEdgeMonitoringError(error, monitoring, context = {}) {
    const errorContext = {
      operation: 'edge-monitoring',
      monitoring,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_MONITORING_FAILED,
      error,
      errorContext
    }
    
    // Edge monitoring errors are usually non-critical
    console.warn(`Edge monitoring failed:`, monitoring)
  }
  
  // Handle edge optimization errors
  function handleEdgeOptimizationError(error, optimization, context = {}) {
    const errorContext = {
      operation: 'edge-optimization',
      optimization,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_OPTIMIZATION_FAILED,
      error,
      errorContext
    }
    
    // Edge optimization errors are usually non-critical
    console.warn(`Edge optimization failed:`, optimization)
  }
  
  // Handle edge scaling errors
  function handleEdgeScalingError(error, scaling, context = {}) {
    const errorContext = {
      operation: 'edge-scaling',
      scaling,
      ...context
    }
    
    errorHandling.addError(
      EDGE_COMPUTING_ERRORS.EDGE_SCALING_FAILED,
      error,
      errorContext
    }
    
    // Edge scaling errors are usually non-critical
    console.warn(`Edge scaling failed:`, scaling)
  }
  
  // Execute edge operation with error handling
  async function executeEdgeOperation(operation, operationFunction, context = {}) {
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
  
  // Get edge error summary
  function getEdgeErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add edge specific analysis
    summary.edgeErrors = {
      deviceErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_DEVICE_FAILED] || 0,
      networkErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_NETWORK_FAILED] || 0,
      computationErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_COMPUTATION_FAILED] || 0,
      storageErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_STORAGE_FAILED] || 0,
      syncErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_SYNC_FAILED] || 0,
      offloadingErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_OFFLOADING_FAILED] || 0,
      cachingErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_CACHING_FAILED] || 0,
      processingErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_PROCESSING_FAILED] || 0,
      analyticsErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_ANALYTICS_FAILED] || 0,
      mlErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_ML_FAILED] || 0,
      aiErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_AI_FAILED] || 0,
      iotErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_IOT_FAILED] || 0,
      securityErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_SECURITY_FAILED] || 0,
      monitoringErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_MONITORING_FAILED] || 0,
      optimizationErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_OPTIMIZATION_FAILED] || 0,
      scalingErrors: summary.errorTypes[EDGE_COMPUTING_ERRORS.EDGE_SCALING_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear edge errors
  function clearEdgeErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Edge specific methods
    handleEdgeDeviceError,
    handleEdgeNetworkError,
    handleEdgeComputationError,
    handleEdgeStorageError,
    handleEdgeSyncError,
    handleEdgeOffloadingError,
    handleEdgeCachingError,
    handleEdgeProcessingError,
    handleEdgeAnalyticsError,
    handleEdgeMLError,
    handleEdgeAIError,
    handleEdgeIoTError,
    handleEdgeSecurityError,
    handleEdgeMonitoringError,
    handleEdgeOptimizationError,
    handleEdgeScalingError,
    
    // Utility methods
    executeEdgeOperation,
    getEdgeErrorSummary,
    clearEdgeErrors,
    
    // Constants
    EDGE_COMPUTING_ERRORS
  }
}


