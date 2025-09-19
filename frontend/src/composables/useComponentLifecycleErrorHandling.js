import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useComponentLifecycleErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Component lifecycle specific error types
  const COMPONENT_LIFECYCLE_ERRORS = {
    COMPONENT_CREATION_FAILED: 'component-creation-failed',
    COMPONENT_MOUNTING_FAILED: 'component-mounting-failed',
    COMPONENT_UPDATING_FAILED: 'component-updating-failed',
    COMPONENT_UNMOUNTING_FAILED: 'component-unmounting-failed',
    COMPONENT_DESTRUCTION_FAILED: 'component-destruction-failed',
    COMPONENT_RENDERING_FAILED: 'component-rendering-failed',
    COMPONENT_PATCHING_FAILED: 'component-patching-failed',
    COMPONENT_HYDRATION_FAILED: 'component-hydration-failed',
    COMPONENT_ACTIVATION_FAILED: 'component-activation-failed',
    COMPONENT_DEACTIVATION_FAILED: 'component-deactivation-failed',
    COMPONENT_SUSPENSION_FAILED: 'component-suspension-failed',
    COMPONENT_RESUMPTION_FAILED: 'component-resumption-failed',
    COMPONENT_ERROR_BOUNDARY_FAILED: 'component-error-boundary-failed',
    COMPONENT_FALLBACK_FAILED: 'component-fallback-failed',
    COMPONENT_RECOVERY_FAILED: 'component-recovery-failed'
  }
  
  // Handle component creation errors
  function handleComponentCreationError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-creation',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_CREATION_FAILED,
      error,
      errorContext
    )
    
    // Component creation errors are usually non-critical
    console.warn(`Component creation failed for ${componentName}:`, error)
  }
  
  // Handle component mounting errors
  function handleComponentMountingError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-mounting',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_MOUNTING_FAILED,
      error,
      errorContext
    )
    
    // Component mounting errors are usually non-critical
    console.warn(`Component mounting failed for ${componentName}:`, error)
  }
  
  // Handle component updating errors
  function handleComponentUpdatingError(error, componentName, update, context = {}) {
    const errorContext = {
      operation: 'component-updating',
      componentName,
      update,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_UPDATING_FAILED,
      error,
      errorContext
    )
    
    // Component updating errors are usually non-critical
    console.warn(`Component updating failed for ${componentName}:`, update)
  }
  
  // Handle component unmounting errors
  function handleComponentUnmountingError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-unmounting',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_UNMOUNTING_FAILED,
      error,
      errorContext
    )
    
    // Component unmounting errors are usually non-critical
    console.warn(`Component unmounting failed for ${componentName}:`, error)
  }
  
  // Handle component destruction errors
  function handleComponentDestructionError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-destruction',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_DESTRUCTION_FAILED,
      error,
      errorContext
    )
    
    // Component destruction errors are usually non-critical
    console.warn(`Component destruction failed for ${componentName}:`, error)
  }
  
  // Handle component rendering errors
  function handleComponentRenderingError(error, componentName, render, context = {}) {
    const errorContext = {
      operation: 'component-rendering',
      componentName,
      render,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_RENDERING_FAILED,
      error,
      errorContext
    )
    
    // Component rendering errors are usually non-critical
    console.warn(`Component rendering failed for ${componentName}:`, render)
  }
  
  // Handle component patching errors
  function handleComponentPatchingError(error, componentName, patch, context = {}) {
    const errorContext = {
      operation: 'component-patching',
      componentName,
      patch,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_PATCHING_FAILED,
      error,
      errorContext
    )
    
    // Component patching errors are usually non-critical
    console.warn(`Component patching failed for ${componentName}:`, patch)
  }
  
  // Handle component hydration errors
  function handleComponentHydrationError(error, componentName, hydration, context = {}) {
    const errorContext = {
      operation: 'component-hydration',
      componentName,
      hydration,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_HYDRATION_FAILED,
      error,
      errorContext
    )
    
    // Component hydration errors are usually non-critical
    console.warn(`Component hydration failed for ${componentName}:`, hydration)
  }
  
  // Handle component activation errors
  function handleComponentActivationError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-activation',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_ACTIVATION_FAILED,
      error,
      errorContext
    )
    
    // Component activation errors are usually non-critical
    console.warn(`Component activation failed for ${componentName}:`, error)
  }
  
  // Handle component deactivation errors
  function handleComponentDeactivationError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-deactivation',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_DEACTIVATION_FAILED,
      error,
      errorContext
    )
    
    // Component deactivation errors are usually non-critical
    console.warn(`Component deactivation failed for ${componentName}:`, error)
  }
  
  // Handle component suspension errors
  function handleComponentSuspensionError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-suspension',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_SUSPENSION_FAILED,
      error,
      errorContext
    )
    
    // Component suspension errors are usually non-critical
    console.warn(`Component suspension failed for ${componentName}:`, error)
  }
  
  // Handle component resumption errors
  function handleComponentResumptionError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-resumption',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_RESUMPTION_FAILED,
      error,
      errorContext
    )
    
    // Component resumption errors are usually non-critical
    console.warn(`Component resumption failed for ${componentName}:`, error)
  }
  
  // Handle component error boundary errors
  function handleComponentErrorBoundaryError(error, componentName, boundary, context = {}) {
    const errorContext = {
      operation: 'component-error-boundary',
      componentName,
      boundary,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_ERROR_BOUNDARY_FAILED,
      error,
      errorContext
    )
    
    // Component error boundary errors are usually non-critical
    console.warn(`Component error boundary failed for ${componentName}:`, boundary)
  }
  
  // Handle component fallback errors
  function handleComponentFallbackError(error, componentName, fallback, context = {}) {
    const errorContext = {
      operation: 'component-fallback',
      componentName,
      fallback,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_FALLBACK_FAILED,
      error,
      errorContext
    )
    
    // Component fallback errors are usually non-critical
    console.warn(`Component fallback failed for ${componentName}:`, fallback)
  }
  
  // Handle component recovery errors
  function handleComponentRecoveryError(error, componentName, recovery, context = {}) {
    const errorContext = {
      operation: 'component-recovery',
      componentName,
      recovery,
      ...context
    }
    
    errorHandling.addError(
      COMPONENT_LIFECYCLE_ERRORS.COMPONENT_RECOVERY_FAILED,
      error,
      errorContext
    )
    
    // Component recovery errors are usually non-critical
    console.warn(`Component recovery failed for ${componentName}:`, recovery)
  }
  
  // Execute component lifecycle operation with error handling
  async function executeComponentLifecycleOperation(operation, operationFunction, context = {}) {
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
  
  // Get component lifecycle error summary
  function getComponentLifecycleErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add component lifecycle specific analysis
    summary.componentLifecycleErrors = {
      creationErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_CREATION_FAILED] || 0,
      mountingErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_MOUNTING_FAILED] || 0,
      updatingErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_UPDATING_FAILED] || 0,
      unmountingErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_UNMOUNTING_FAILED] || 0,
      destructionErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_DESTRUCTION_FAILED] || 0,
      renderingErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_RENDERING_FAILED] || 0,
      patchingErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_PATCHING_FAILED] || 0,
      hydrationErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_HYDRATION_FAILED] || 0,
      activationErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_ACTIVATION_FAILED] || 0,
      deactivationErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_DEACTIVATION_FAILED] || 0,
      suspensionErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_SUSPENSION_FAILED] || 0,
      resumptionErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_RESUMPTION_FAILED] || 0,
      errorBoundaryErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_ERROR_BOUNDARY_FAILED] || 0,
      fallbackErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_FALLBACK_FAILED] || 0,
      recoveryErrors: summary.errorTypes[COMPONENT_LIFECYCLE_ERRORS.COMPONENT_RECOVERY_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear component lifecycle errors
  function clearComponentLifecycleErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Component lifecycle specific methods
    handleComponentCreationError,
    handleComponentMountingError,
    handleComponentUpdatingError,
    handleComponentUnmountingError,
    handleComponentDestructionError,
    handleComponentRenderingError,
    handleComponentPatchingError,
    handleComponentHydrationError,
    handleComponentActivationError,
    handleComponentDeactivationError,
    handleComponentSuspensionError,
    handleComponentResumptionError,
    handleComponentErrorBoundaryError,
    handleComponentFallbackError,
    handleComponentRecoveryError,
    
    // Utility methods
    executeComponentLifecycleOperation,
    getComponentLifecycleErrorSummary,
    clearComponentLifecycleErrors,
    
    // Constants
    COMPONENT_LIFECYCLE_ERRORS
  }
}




