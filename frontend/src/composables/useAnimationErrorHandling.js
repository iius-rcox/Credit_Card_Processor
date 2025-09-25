import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useAnimationErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Animation specific error types
  const ANIMATION_ERRORS = {
    ANIMATION_START_FAILED: 'animation-start-failed',
    ANIMATION_END_FAILED: 'animation-end-failed',
    ANIMATION_PAUSE_FAILED: 'animation-pause-failed',
    ANIMATION_RESUME_FAILED: 'animation-resume-failed',
    ANIMATION_CANCEL_FAILED: 'animation-cancel-failed',
    ANIMATION_REVERSE_FAILED: 'animation-reverse-failed',
    ANIMATION_LOOP_FAILED: 'animation-loop-failed',
    ANIMATION_TIMING_FAILED: 'animation-timing-failed',
    ANIMATION_EASING_FAILED: 'animation-easing-failed',
    ANIMATION_DURATION_FAILED: 'animation-duration-failed',
    ANIMATION_DELAY_FAILED: 'animation-delay-failed',
    ANIMATION_ITERATION_FAILED: 'animation-iteration-failed',
    ANIMATION_DIRECTION_FAILED: 'animation-direction-failed',
    ANIMATION_FILL_FAILED: 'animation-fill-failed',
    ANIMATION_PLAY_STATE_FAILED: 'animation-play-state-failed'
  }
  
  // Handle animation start errors
  function handleAnimationStartError(error, animationName, element, context = {}) {
    const errorContext = {
      operation: 'animation-start',
      animationName,
      element,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_START_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation start failed for ${animationName}:`, error)
  }
  
  // Handle animation end errors
  function handleAnimationEndError(error, animationName, element, context = {}) {
    const errorContext = {
      operation: 'animation-end',
      animationName,
      element,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_END_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation end failed for ${animationName}:`, error)
  }
  
  // Handle animation pause errors
  function handleAnimationPauseError(error, animationName, element, context = {}) {
    const errorContext = {
      operation: 'animation-pause',
      animationName,
      element,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_PAUSE_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation pause failed for ${animationName}:`, error)
  }
  
  // Handle animation resume errors
  function handleAnimationResumeError(error, animationName, element, context = {}) {
    const errorContext = {
      operation: 'animation-resume',
      animationName,
      element,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_RESUME_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation resume failed for ${animationName}:`, error)
  }
  
  // Handle animation cancel errors
  function handleAnimationCancelError(error, animationName, element, context = {}) {
    const errorContext = {
      operation: 'animation-cancel',
      animationName,
      element,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_CANCEL_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation cancel failed for ${animationName}:`, error)
  }
  
  // Handle animation reverse errors
  function handleAnimationReverseError(error, animationName, element, context = {}) {
    const errorContext = {
      operation: 'animation-reverse',
      animationName,
      element,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_REVERSE_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation reverse failed for ${animationName}:`, error)
  }
  
  // Handle animation loop errors
  function handleAnimationLoopError(error, animationName, element, context = {}) {
    const errorContext = {
      operation: 'animation-loop',
      animationName,
      element,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_LOOP_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation loop failed for ${animationName}:`, error)
  }
  
  // Handle animation timing errors
  function handleAnimationTimingError(error, animationName, timing, context = {}) {
    const errorContext = {
      operation: 'animation-timing',
      animationName,
      timing,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_TIMING_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation timing failed for ${animationName}:`, error)
  }
  
  // Handle animation easing errors
  function handleAnimationEasingError(error, animationName, easing, context = {}) {
    const errorContext = {
      operation: 'animation-easing',
      animationName,
      easing,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_EASING_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation easing failed for ${animationName}:`, error)
  }
  
  // Handle animation duration errors
  function handleAnimationDurationError(error, animationName, duration, context = {}) {
    const errorContext = {
      operation: 'animation-duration',
      animationName,
      duration,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_DURATION_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation duration failed for ${animationName}:`, error)
  }
  
  // Handle animation delay errors
  function handleAnimationDelayError(error, animationName, delay, context = {}) {
    const errorContext = {
      operation: 'animation-delay',
      animationName,
      delay,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_DELAY_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation delay failed for ${animationName}:`, error)
  }
  
  // Handle animation iteration errors
  function handleAnimationIterationError(error, animationName, iteration, context = {}) {
    const errorContext = {
      operation: 'animation-iteration',
      animationName,
      iteration,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_ITERATION_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation iteration failed for ${animationName}:`, error)
  }
  
  // Handle animation direction errors
  function handleAnimationDirectionError(error, animationName, direction, context = {}) {
    const errorContext = {
      operation: 'animation-direction',
      animationName,
      direction,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_DIRECTION_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation direction failed for ${animationName}:`, error)
  }
  
  // Handle animation fill errors
  function handleAnimationFillError(error, animationName, fill, context = {}) {
    const errorContext = {
      operation: 'animation-fill',
      animationName,
      fill,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_FILL_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation fill failed for ${animationName}:`, error)
  }
  
  // Handle animation play state errors
  function handleAnimationPlayStateError(error, animationName, playState, context = {}) {
    const errorContext = {
      operation: 'animation-play-state',
      animationName,
      playState,
      ...context
    }
    
    errorHandling.addError(
      ANIMATION_ERRORS.ANIMATION_PLAY_STATE_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation play state failed for ${animationName}:`, error)
  }
  
  // Execute animation operation with error handling
  async function executeAnimationOperation(operation, operationFunction, context = {}) {
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
  
  // Get animation error summary
  function getAnimationErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add animation specific analysis
    summary.animationErrors = {
      startErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_START_FAILED] || 0,
      endErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_END_FAILED] || 0,
      pauseErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_PAUSE_FAILED] || 0,
      resumeErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_RESUME_FAILED] || 0,
      cancelErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_CANCEL_FAILED] || 0,
      reverseErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_REVERSE_FAILED] || 0,
      loopErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_LOOP_FAILED] || 0,
      timingErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_TIMING_FAILED] || 0,
      easingErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_EASING_FAILED] || 0,
      durationErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_DURATION_FAILED] || 0,
      delayErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_DELAY_FAILED] || 0,
      iterationErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_ITERATION_FAILED] || 0,
      directionErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_DIRECTION_FAILED] || 0,
      fillErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_FILL_FAILED] || 0,
      playStateErrors: summary.errorTypes[ANIMATION_ERRORS.ANIMATION_PLAY_STATE_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear animation errors
  function clearAnimationErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Animation specific methods
    handleAnimationStartError,
    handleAnimationEndError,
    handleAnimationPauseError,
    handleAnimationResumeError,
    handleAnimationCancelError,
    handleAnimationReverseError,
    handleAnimationLoopError,
    handleAnimationTimingError,
    handleAnimationEasingError,
    handleAnimationDurationError,
    handleAnimationDelayError,
    handleAnimationIterationError,
    handleAnimationDirectionError,
    handleAnimationFillError,
    handleAnimationPlayStateError,
    
    // Utility methods
    executeAnimationOperation,
    getAnimationErrorSummary,
    clearAnimationErrors,
    
    // Constants
    ANIMATION_ERRORS
  }
}








