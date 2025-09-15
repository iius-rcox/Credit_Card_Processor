import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useEventHandlingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Event handling specific error types
  const EVENT_HANDLING_ERRORS = {
    EVENT_REGISTRATION_FAILED: 'event-registration-failed',
    EVENT_UNREGISTRATION_FAILED: 'event-unregistration-failed',
    EVENT_EMISSION_FAILED: 'event-emission-failed',
    EVENT_LISTENING_FAILED: 'event-listening-failed',
    EVENT_PROPAGATION_FAILED: 'event-propagation-failed',
    EVENT_PREVENTION_FAILED: 'event-prevention-failed',
    EVENT_STOPPING_FAILED: 'event-stopping-failed',
    EVENT_DELEGATION_FAILED: 'event-delegation-failed',
    EVENT_BUBBLING_FAILED: 'event-bubbling-failed',
    EVENT_CAPTURING_FAILED: 'event-capturing-failed',
    EVENT_SYNTHETIC_FAILED: 'event-synthetic-failed',
    EVENT_CUSTOM_FAILED: 'event-custom-failed',
    EVENT_ASYNC_FAILED: 'event-async-failed',
    EVENT_DEBOUNCE_FAILED: 'event-debounce-failed',
    EVENT_THROTTLE_FAILED: 'event-throttle-failed'
  }
  
  // Handle event registration errors
  function handleEventRegistrationError(error, eventType, handler, context = {}) {
    const errorContext = {
      operation: 'event-registration',
      eventType,
      handler,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_REGISTRATION_FAILED,
      error,
      errorContext
    )
    
    // Event registration errors are usually non-critical
    console.warn(`Event registration failed for ${eventType}:`, handler)
  }
  
  // Handle event unregistration errors
  function handleEventUnregistrationError(error, eventType, handler, context = {}) {
    const errorContext = {
      operation: 'event-unregistration',
      eventType,
      handler,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_UNREGISTRATION_FAILED,
      error,
      errorContext
    )
    
    // Event unregistration errors are usually non-critical
    console.warn(`Event unregistration failed for ${eventType}:`, handler)
  }
  
  // Handle event emission errors
  function handleEventEmissionError(error, eventType, data, context = {}) {
    const errorContext = {
      operation: 'event-emission',
      eventType,
      data,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_EMISSION_FAILED,
      error,
      errorContext
    )
    
    // Event emission errors are usually non-critical
    console.warn(`Event emission failed for ${eventType}:`, data)
  }
  
  // Handle event listening errors
  function handleEventListeningError(error, eventType, listener, context = {}) {
    const errorContext = {
      operation: 'event-listening',
      eventType,
      listener,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_LISTENING_FAILED,
      error,
      errorContext
    )
    
    // Event listening errors are usually non-critical
    console.warn(`Event listening failed for ${eventType}:`, listener)
  }
  
  // Handle event propagation errors
  function handleEventPropagationError(error, eventType, phase, context = {}) {
    const errorContext = {
      operation: 'event-propagation',
      eventType,
      phase,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_PROPAGATION_FAILED,
      error,
      errorContext
    )
    
    // Event propagation errors are usually non-critical
    console.warn(`Event propagation failed for ${eventType}:`, phase)
  }
  
  // Handle event prevention errors
  function handleEventPreventionError(error, eventType, context = {}) {
    const errorContext = {
      operation: 'event-prevention',
      eventType,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_PREVENTION_FAILED,
      error,
      errorContext
    )
    
    // Event prevention errors are usually non-critical
    console.warn(`Event prevention failed for ${eventType}`)
  }
  
  // Handle event stopping errors
  function handleEventStoppingError(error, eventType, context = {}) {
    const errorContext = {
      operation: 'event-stopping',
      eventType,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_STOPPING_FAILED,
      error,
      errorContext
    )
    
    // Event stopping errors are usually non-critical
    console.warn(`Event stopping failed for ${eventType}`)
  }
  
  // Handle event delegation errors
  function handleEventDelegationError(error, eventType, selector, context = {}) {
    const errorContext = {
      operation: 'event-delegation',
      eventType,
      selector,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_DELEGATION_FAILED,
      error,
      errorContext
    )
    
    // Event delegation errors are usually non-critical
    console.warn(`Event delegation failed for ${eventType}:`, selector)
  }
  
  // Handle event bubbling errors
  function handleEventBubblingError(error, eventType, context = {}) {
    const errorContext = {
      operation: 'event-bubbling',
      eventType,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_BUBBLING_FAILED,
      error,
      errorContext
    )
    
    // Event bubbling errors are usually non-critical
    console.warn(`Event bubbling failed for ${eventType}`)
  }
  
  // Handle event capturing errors
  function handleEventCapturingError(error, eventType, context = {}) {
    const errorContext = {
      operation: 'event-capturing',
      eventType,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_CAPTURING_FAILED,
      error,
      errorContext
    )
    
    // Event capturing errors are usually non-critical
    console.warn(`Event capturing failed for ${eventType}`)
  }
  
  // Handle event synthetic errors
  function handleEventSyntheticError(error, eventType, syntheticEvent, context = {}) {
    const errorContext = {
      operation: 'event-synthetic',
      eventType,
      syntheticEvent,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_SYNTHETIC_FAILED,
      error,
      errorContext
    )
    
    // Event synthetic errors are usually non-critical
    console.warn(`Event synthetic failed for ${eventType}:`, syntheticEvent)
  }
  
  // Handle event custom errors
  function handleEventCustomError(error, eventType, customEvent, context = {}) {
    const errorContext = {
      operation: 'event-custom',
      eventType,
      customEvent,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_CUSTOM_FAILED,
      error,
      errorContext
    )
    
    // Event custom errors are usually non-critical
    console.warn(`Event custom failed for ${eventType}:`, customEvent)
  }
  
  // Handle event async errors
  function handleEventAsyncError(error, eventType, asyncHandler, context = {}) {
    const errorContext = {
      operation: 'event-async',
      eventType,
      asyncHandler,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_ASYNC_FAILED,
      error,
      errorContext
    )
    
    // Event async errors are usually non-critical
    console.warn(`Event async failed for ${eventType}:`, asyncHandler)
  }
  
  // Handle event debounce errors
  function handleEventDebounceError(error, eventType, debounce, context = {}) {
    const errorContext = {
      operation: 'event-debounce',
      eventType,
      debounce,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_DEBOUNCE_FAILED,
      error,
      errorContext
    )
    
    // Event debounce errors are usually non-critical
    console.warn(`Event debounce failed for ${eventType}:`, debounce)
  }
  
  // Handle event throttle errors
  function handleEventThrottleError(error, eventType, throttle, context = {}) {
    const errorContext = {
      operation: 'event-throttle',
      eventType,
      throttle,
      ...context
    }
    
    errorHandling.addError(
      EVENT_HANDLING_ERRORS.EVENT_THROTTLE_FAILED,
      error,
      errorContext
    )
    
    // Event throttle errors are usually non-critical
    console.warn(`Event throttle failed for ${eventType}:`, throttle)
  }
  
  // Execute event handling operation with error handling
  async function executeEventHandlingOperation(operation, operationFunction, context = {}) {
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
  
  // Get event handling error summary
  function getEventHandlingErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add event handling specific analysis
    summary.eventHandlingErrors = {
      registrationErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_REGISTRATION_FAILED] || 0,
      unregistrationErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_UNREGISTRATION_FAILED] || 0,
      emissionErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_EMISSION_FAILED] || 0,
      listeningErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_LISTENING_FAILED] || 0,
      propagationErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_PROPAGATION_FAILED] || 0,
      preventionErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_PREVENTION_FAILED] || 0,
      stoppingErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_STOPPING_FAILED] || 0,
      delegationErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_DELEGATION_FAILED] || 0,
      bubblingErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_BUBBLING_FAILED] || 0,
      capturingErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_CAPTURING_FAILED] || 0,
      syntheticErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_SYNTHETIC_FAILED] || 0,
      customErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_CUSTOM_FAILED] || 0,
      asyncErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_ASYNC_FAILED] || 0,
      debounceErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_DEBOUNCE_FAILED] || 0,
      throttleErrors: summary.errorTypes[EVENT_HANDLING_ERRORS.EVENT_THROTTLE_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear event handling errors
  function clearEventHandlingErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Event handling specific methods
    handleEventRegistrationError,
    handleEventUnregistrationError,
    handleEventEmissionError,
    handleEventListeningError,
    handleEventPropagationError,
    handleEventPreventionError,
    handleEventStoppingError,
    handleEventDelegationError,
    handleEventBubblingError,
    handleEventCapturingError,
    handleEventSyntheticError,
    handleEventCustomError,
    handleEventAsyncError,
    handleEventDebounceError,
    handleEventThrottleError,
    
    // Utility methods
    executeEventHandlingOperation,
    getEventHandlingErrorSummary,
    clearEventHandlingErrors,
    
    // Constants
    EVENT_HANDLING_ERRORS
  }
}


