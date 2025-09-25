import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useVirtualRealityErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Virtual reality specific error types
  const VIRTUAL_REALITY_ERRORS = {
    VR_TRACKING_FAILED: 'vr-tracking-failed',
    VR_RENDERING_FAILED: 'vr-rendering-failed',
    VR_CALIBRATION_FAILED: 'vr-calibration-failed',
    VR_CONTROLLER_FAILED: 'vr-controller-failed',
    VR_HEADSET_FAILED: 'vr-headset-failed',
    VR_AUDIO_FAILED: 'vr-audio-failed',
    VR_HAPTIC_FAILED: 'vr-haptic-failed',
    VR_EYE_FAILED: 'vr-eye-failed',
    VR_HAND_FAILED: 'vr-hand-failed',
    VR_BODY_FAILED: 'vr-body-failed',
    VR_SPACE_FAILED: 'vr-space-failed',
    VR_SCENE_FAILED: 'vr-scene-failed',
    VR_INTERACTION_FAILED: 'vr-interaction-failed',
    VR_ANIMATION_FAILED: 'vr-animation-failed',
    VR_PHYSICS_FAILED: 'vr-physics-failed',
    VR_AI_FAILED: 'vr-ai-failed'
  }
  
  // Handle VR tracking errors
  function handleVRTrackingError(error, tracking, context = {}) {
    const errorContext = {
      operation: 'vr-tracking',
      tracking,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_TRACKING_FAILED,
      error,
      errorContext
    }
    
    // VR tracking errors are usually non-critical
    console.warn(`VR tracking failed:`, tracking)
  }
  
  // Handle VR rendering errors
  function handleVRRenderingError(error, rendering, context = {}) {
    const errorContext = {
      operation: 'vr-rendering',
      rendering,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_RENDERING_FAILED,
      error,
      errorContext
    }
    
    // VR rendering errors are usually non-critical
    console.warn(`VR rendering failed:`, rendering)
  }
  
  // Handle VR calibration errors
  function handleVRCalibrationError(error, calibration, context = {}) {
    const errorContext = {
      operation: 'vr-calibration',
      calibration,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_CALIBRATION_FAILED,
      error,
      errorContext
    }
    
    // VR calibration errors are usually non-critical
    console.warn(`VR calibration failed:`, calibration)
  }
  
  // Handle VR controller errors
  function handleVRControllerError(error, controller, context = {}) {
    const errorContext = {
      operation: 'vr-controller',
      controller,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_CONTROLLER_FAILED,
      error,
      errorContext
    }
    
    // VR controller errors are usually non-critical
    console.warn(`VR controller failed:`, controller)
  }
  
  // Handle VR headset errors
  function handleVRHeadsetError(error, headset, context = {}) {
    const errorContext = {
      operation: 'vr-headset',
      headset,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_HEADSET_FAILED,
      error,
      errorContext
    }
    
    // VR headset errors are usually non-critical
    console.warn(`VR headset failed:`, headset)
  }
  
  // Handle VR audio errors
  function handleVRAudioError(error, audio, context = {}) {
    const errorContext = {
      operation: 'vr-audio',
      audio,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_AUDIO_FAILED,
      error,
      errorContext
    }
    
    // VR audio errors are usually non-critical
    console.warn(`VR audio failed:`, audio)
  }
  
  // Handle VR haptic errors
  function handleVRHapticError(error, haptic, context = {}) {
    const errorContext = {
      operation: 'vr-haptic',
      haptic,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_HAPTIC_FAILED,
      error,
      errorContext
    }
    
    // VR haptic errors are usually non-critical
    console.warn(`VR haptic failed:`, haptic)
  }
  
  // Handle VR eye errors
  function handleVREyeError(error, eye, context = {}) {
    const errorContext = {
      operation: 'vr-eye',
      eye,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_EYE_FAILED,
      error,
      errorContext
    }
    
    // VR eye errors are usually non-critical
    console.warn(`VR eye failed:`, eye)
  }
  
  // Handle VR hand errors
  function handleVRHandError(error, hand, context = {}) {
    const errorContext = {
      operation: 'vr-hand',
      hand,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_HAND_FAILED,
      error,
      errorContext
    }
    
    // VR hand errors are usually non-critical
    console.warn(`VR hand failed:`, hand)
  }
  
  // Handle VR body errors
  function handleVRBodyError(error, body, context = {}) {
    const errorContext = {
      operation: 'vr-body',
      body,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_BODY_FAILED,
      error,
      errorContext
    }
    
    // VR body errors are usually non-critical
    console.warn(`VR body failed:`, body)
  }
  
  // Handle VR space errors
  function handleVRSpaceError(error, space, context = {}) {
    const errorContext = {
      operation: 'vr-space',
      space,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_SPACE_FAILED,
      error,
      errorContext
    }
    
    // VR space errors are usually non-critical
    console.warn(`VR space failed:`, space)
  }
  
  // Handle VR scene errors
  function handleVRSceneError(error, scene, context = {}) {
    const errorContext = {
      operation: 'vr-scene',
      scene,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_SCENE_FAILED,
      error,
      errorContext
    }
    
    // VR scene errors are usually non-critical
    console.warn(`VR scene failed:`, scene)
  }
  
  // Handle VR interaction errors
  function handleVRInteractionError(error, interaction, context = {}) {
    const errorContext = {
      operation: 'vr-interaction',
      interaction,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_INTERACTION_FAILED,
      error,
      errorContext
    }
    
    // VR interaction errors are usually non-critical
    console.warn(`VR interaction failed:`, interaction)
  }
  
  // Handle VR animation errors
  function handleVRAnimationError(error, animation, context = {}) {
    const errorContext = {
      operation: 'vr-animation',
      animation,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_ANIMATION_FAILED,
      error,
      errorContext
    }
    
    // VR animation errors are usually non-critical
    console.warn(`VR animation failed:`, animation)
  }
  
  // Handle VR physics errors
  function handleVRPhysicsError(error, physics, context = {}) {
    const errorContext = {
      operation: 'vr-physics',
      physics,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_PHYSICS_FAILED,
      error,
      errorContext
    }
    
    // VR physics errors are usually non-critical
    console.warn(`VR physics failed:`, physics)
  }
  
  // Handle VR AI errors
  function handleVRAIError(error, ai, context = {}) {
    const errorContext = {
      operation: 'vr-ai',
      ai,
      ...context
    }
    
    errorHandling.addError(
      VIRTUAL_REALITY_ERRORS.VR_AI_FAILED,
      error,
      errorContext
    }
    
    // VR AI errors are usually non-critical
    console.warn(`VR AI failed:`, ai)
  }
  
  // Execute VR operation with error handling
  async function executeVROperation(operation, operationFunction, context = {}) {
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
  
  // Get VR error summary
  function getVRErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add VR specific analysis
    summary.vrErrors = {
      trackingErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_TRACKING_FAILED] || 0,
      renderingErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_RENDERING_FAILED] || 0,
      calibrationErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_CALIBRATION_FAILED] || 0,
      controllerErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_CONTROLLER_FAILED] || 0,
      headsetErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_HEADSET_FAILED] || 0,
      audioErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_AUDIO_FAILED] || 0,
      hapticErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_HAPTIC_FAILED] || 0,
      eyeErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_EYE_FAILED] || 0,
      handErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_HAND_FAILED] || 0,
      bodyErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_BODY_FAILED] || 0,
      spaceErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_SPACE_FAILED] || 0,
      sceneErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_SCENE_FAILED] || 0,
      interactionErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_INTERACTION_FAILED] || 0,
      animationErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_ANIMATION_FAILED] || 0,
      physicsErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_PHYSICS_FAILED] || 0,
      aiErrors: summary.errorTypes[VIRTUAL_REALITY_ERRORS.VR_AI_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear VR errors
  function clearVRErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // VR specific methods
    handleVRTrackingError,
    handleVRRenderingError,
    handleVRCalibrationError,
    handleVRControllerError,
    handleVRHeadsetError,
    handleVRAudioError,
    handleVRHapticError,
    handleVREyeError,
    handleVRHandError,
    handleVRBodyError,
    handleVRSpaceError,
    handleVRSceneError,
    handleVRInteractionError,
    handleVRAnimationError,
    handleVRPhysicsError,
    handleVRAIError,
    
    // Utility methods
    executeVROperation,
    getVRErrorSummary,
    clearVRErrors,
    
    // Constants
    VIRTUAL_REALITY_ERRORS
  }
}








