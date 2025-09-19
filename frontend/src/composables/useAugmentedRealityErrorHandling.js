import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useAugmentedRealityErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Augmented reality specific error types
  const AUGMENTED_REALITY_ERRORS = {
    AR_TRACKING_FAILED: 'ar-tracking-failed',
    AR_RENDERING_FAILED: 'ar-rendering-failed',
    AR_CALIBRATION_FAILED: 'ar-calibration-failed',
    AR_ANCHORING_FAILED: 'ar-anchoring-failed',
    AR_OCCLUSION_FAILED: 'ar-occlusion-failed',
    AR_LIGHTING_FAILED: 'ar-lighting-failed',
    AR_MESH_FAILED: 'ar-mesh-failed',
    AR_PLANE_FAILED: 'ar-plane-failed',
    AR_FACE_FAILED: 'ar-face-failed',
    AR_HAND_FAILED: 'ar-hand-failed',
    AR_BODY_FAILED: 'ar-body-failed',
    AR_OBJECT_FAILED: 'ar-object-failed',
    AR_SCENE_FAILED: 'ar-scene-failed',
    AR_INTERACTION_FAILED: 'ar-interaction-failed',
    AR_ANIMATION_FAILED: 'ar-animation-failed',
    AR_AUDIO_FAILED: 'ar-audio-failed'
  }
  
  // Handle AR tracking errors
  function handleARTrackingError(error, tracking, context = {}) {
    const errorContext = {
      operation: 'ar-tracking',
      tracking,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_TRACKING_FAILED,
      error,
      errorContext
    }
    
    // AR tracking errors are usually non-critical
    console.warn(`AR tracking failed:`, tracking)
  }
  
  // Handle AR rendering errors
  function handleARRenderingError(error, rendering, context = {}) {
    const errorContext = {
      operation: 'ar-rendering',
      rendering,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_RENDERING_FAILED,
      error,
      errorContext
    }
    
    // AR rendering errors are usually non-critical
    console.warn(`AR rendering failed:`, rendering)
  }
  
  // Handle AR calibration errors
  function handleARCalibrationError(error, calibration, context = {}) {
    const errorContext = {
      operation: 'ar-calibration',
      calibration,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_CALIBRATION_FAILED,
      error,
      errorContext
    }
    
    // AR calibration errors are usually non-critical
    console.warn(`AR calibration failed:`, calibration)
  }
  
  // Handle AR anchoring errors
  function handleARAnchoringError(error, anchoring, context = {}) {
    const errorContext = {
      operation: 'ar-anchoring',
      anchoring,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_ANCHORING_FAILED,
      error,
      errorContext
    }
    
    // AR anchoring errors are usually non-critical
    console.warn(`AR anchoring failed:`, anchoring)
  }
  
  // Handle AR occlusion errors
  function handleAROcclusionError(error, occlusion, context = {}) {
    const errorContext = {
      operation: 'ar-occlusion',
      occlusion,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_OCCLUSION_FAILED,
      error,
      errorContext
    }
    
    // AR occlusion errors are usually non-critical
    console.warn(`AR occlusion failed:`, occlusion)
  }
  
  // Handle AR lighting errors
  function handleARLightingError(error, lighting, context = {}) {
    const errorContext = {
      operation: 'ar-lighting',
      lighting,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_LIGHTING_FAILED,
      error,
      errorContext
    }
    
    // AR lighting errors are usually non-critical
    console.warn(`AR lighting failed:`, lighting)
  }
  
  // Handle AR mesh errors
  function handleARMeshError(error, mesh, context = {}) {
    const errorContext = {
      operation: 'ar-mesh',
      mesh,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_MESH_FAILED,
      error,
      errorContext
    }
    
    // AR mesh errors are usually non-critical
    console.warn(`AR mesh failed:`, mesh)
  }
  
  // Handle AR plane errors
  function handleARPlaneError(error, plane, context = {}) {
    const errorContext = {
      operation: 'ar-plane',
      plane,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_PLANE_FAILED,
      error,
      errorContext
    }
    
    // AR plane errors are usually non-critical
    console.warn(`AR plane failed:`, plane)
  }
  
  // Handle AR face errors
  function handleARFaceError(error, face, context = {}) {
    const errorContext = {
      operation: 'ar-face',
      face,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_FACE_FAILED,
      error,
      errorContext
    }
    
    // AR face errors are usually non-critical
    console.warn(`AR face failed:`, face)
  }
  
  // Handle AR hand errors
  function handleARHandError(error, hand, context = {}) {
    const errorContext = {
      operation: 'ar-hand',
      hand,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_HAND_FAILED,
      error,
      errorContext
    }
    
    // AR hand errors are usually non-critical
    console.warn(`AR hand failed:`, hand)
  }
  
  // Handle AR body errors
  function handleARBodyError(error, body, context = {}) {
    const errorContext = {
      operation: 'ar-body',
      body,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_BODY_FAILED,
      error,
      errorContext
    }
    
    // AR body errors are usually non-critical
    console.warn(`AR body failed:`, body)
  }
  
  // Handle AR object errors
  function handleARObjectError(error, object, context = {}) {
    const errorContext = {
      operation: 'ar-object',
      object,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_OBJECT_FAILED,
      error,
      errorContext
    }
    
    // AR object errors are usually non-critical
    console.warn(`AR object failed:`, object)
  }
  
  // Handle AR scene errors
  function handleARSceneError(error, scene, context = {}) {
    const errorContext = {
      operation: 'ar-scene',
      scene,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_SCENE_FAILED,
      error,
      errorContext
    }
    
    // AR scene errors are usually non-critical
    console.warn(`AR scene failed:`, scene)
  }
  
  // Handle AR interaction errors
  function handleARInteractionError(error, interaction, context = {}) {
    const errorContext = {
      operation: 'ar-interaction',
      interaction,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_INTERACTION_FAILED,
      error,
      errorContext
    }
    
    // AR interaction errors are usually non-critical
    console.warn(`AR interaction failed:`, interaction)
  }
  
  // Handle AR animation errors
  function handleARAnimationError(error, animation, context = {}) {
    const errorContext = {
      operation: 'ar-animation',
      animation,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_ANIMATION_FAILED,
      error,
      errorContext
    }
    
    // AR animation errors are usually non-critical
    console.warn(`AR animation failed:`, animation)
  }
  
  // Handle AR audio errors
  function handleARAudioError(error, audio, context = {}) {
    const errorContext = {
      operation: 'ar-audio',
      audio,
      ...context
    }
    
    errorHandling.addError(
      AUGMENTED_REALITY_ERRORS.AR_AUDIO_FAILED,
      error,
      errorContext
    }
    
    // AR audio errors are usually non-critical
    console.warn(`AR audio failed:`, audio)
  }
  
  // Execute AR operation with error handling
  async function executeAROperation(operation, operationFunction, context = {}) {
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
  
  // Get AR error summary
  function getARErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add AR specific analysis
    summary.arErrors = {
      trackingErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_TRACKING_FAILED] || 0,
      renderingErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_RENDERING_FAILED] || 0,
      calibrationErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_CALIBRATION_FAILED] || 0,
      anchoringErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_ANCHORING_FAILED] || 0,
      occlusionErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_OCCLUSION_FAILED] || 0,
      lightingErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_LIGHTING_FAILED] || 0,
      meshErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_MESH_FAILED] || 0,
      planeErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_PLANE_FAILED] || 0,
      faceErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_FACE_FAILED] || 0,
      handErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_HAND_FAILED] || 0,
      bodyErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_BODY_FAILED] || 0,
      objectErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_OBJECT_FAILED] || 0,
      sceneErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_SCENE_FAILED] || 0,
      interactionErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_INTERACTION_FAILED] || 0,
      animationErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_ANIMATION_FAILED] || 0,
      audioErrors: summary.errorTypes[AUGMENTED_REALITY_ERRORS.AR_AUDIO_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear AR errors
  function clearARErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // AR specific methods
    handleARTrackingError,
    handleARRenderingError,
    handleARCalibrationError,
    handleARAnchoringError,
    handleAROcclusionError,
    handleARLightingError,
    handleARMeshError,
    handleARPlaneError,
    handleARFaceError,
    handleARHandError,
    handleARBodyError,
    handleARObjectError,
    handleARSceneError,
    handleARInteractionError,
    handleARAnimationError,
    handleARAudioError,
    
    // Utility methods
    executeAROperation,
    getARErrorSummary,
    clearARErrors,
    
    // Constants
    AUGMENTED_REALITY_ERRORS
  }
}




