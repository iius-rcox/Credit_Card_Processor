import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useMixedRealityErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Mixed reality specific error types
  const MIXED_REALITY_ERRORS = {
    MR_TRACKING_FAILED: 'mr-tracking-failed',
    MR_RENDERING_FAILED: 'mr-rendering-failed',
    MR_CALIBRATION_FAILED: 'mr-calibration-failed',
    MR_ANCHORING_FAILED: 'mr-anchoring-failed',
    MR_OCCLUSION_FAILED: 'mr-occlusion-failed',
    MR_LIGHTING_FAILED: 'mr-lighting-failed',
    MR_MESH_FAILED: 'mr-mesh-failed',
    MR_PLANE_FAILED: 'mr-plane-failed',
    MR_FACE_FAILED: 'mr-face-failed',
    MR_HAND_FAILED: 'mr-hand-failed',
    MR_BODY_FAILED: 'mr-body-failed',
    MR_OBJECT_FAILED: 'mr-object-failed',
    MR_SCENE_FAILED: 'mr-scene-failed',
    MR_INTERACTION_FAILED: 'mr-interaction-failed',
    MR_ANIMATION_FAILED: 'mr-animation-failed',
    MR_AUDIO_FAILED: 'mr-audio-failed'
  }
  
  // Handle MR tracking errors
  function handleMRTrackingError(error, tracking, context = {}) {
    const errorContext = {
      operation: 'mr-tracking',
      tracking,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_TRACKING_FAILED,
      error,
      errorContext
    }
    
    // MR tracking errors are usually non-critical
    console.warn(`MR tracking failed:`, tracking)
  }
  
  // Handle MR rendering errors
  function handleMRRenderingError(error, rendering, context = {}) {
    const errorContext = {
      operation: 'mr-rendering',
      rendering,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_RENDERING_FAILED,
      error,
      errorContext
    }
    
    // MR rendering errors are usually non-critical
    console.warn(`MR rendering failed:`, rendering)
  }
  
  // Handle MR calibration errors
  function handleMRCalibrationError(error, calibration, context = {}) {
    const errorContext = {
      operation: 'mr-calibration',
      calibration,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_CALIBRATION_FAILED,
      error,
      errorContext
    }
    
    // MR calibration errors are usually non-critical
    console.warn(`MR calibration failed:`, calibration)
  }
  
  // Handle MR anchoring errors
  function handleMRAnchoringError(error, anchoring, context = {}) {
    const errorContext = {
      operation: 'mr-anchoring',
      anchoring,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_ANCHORING_FAILED,
      error,
      errorContext
    }
    
    // MR anchoring errors are usually non-critical
    console.warn(`MR anchoring failed:`, anchoring)
  }
  
  // Handle MR occlusion errors
  function handleMROcclusionError(error, occlusion, context = {}) {
    const errorContext = {
      operation: 'mr-occlusion',
      occlusion,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_OCCLUSION_FAILED,
      error,
      errorContext
    }
    
    // MR occlusion errors are usually non-critical
    console.warn(`MR occlusion failed:`, occlusion)
  }
  
  // Handle MR lighting errors
  function handleMRLightingError(error, lighting, context = {}) {
    const errorContext = {
      operation: 'mr-lighting',
      lighting,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_LIGHTING_FAILED,
      error,
      errorContext
    }
    
    // MR lighting errors are usually non-critical
    console.warn(`MR lighting failed:`, lighting)
  }
  
  // Handle MR mesh errors
  function handleMRMeshError(error, mesh, context = {}) {
    const errorContext = {
      operation: 'mr-mesh',
      mesh,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_MESH_FAILED,
      error,
      errorContext
    }
    
    // MR mesh errors are usually non-critical
    console.warn(`MR mesh failed:`, mesh)
  }
  
  // Handle MR plane errors
  function handleMRPlaneError(error, plane, context = {}) {
    const errorContext = {
      operation: 'mr-plane',
      plane,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_PLANE_FAILED,
      error,
      errorContext
    }
    
    // MR plane errors are usually non-critical
    console.warn(`MR plane failed:`, plane)
  }
  
  // Handle MR face errors
  function handleMRFaceError(error, face, context = {}) {
    const errorContext = {
      operation: 'mr-face',
      face,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_FACE_FAILED,
      error,
      errorContext
    }
    
    // MR face errors are usually non-critical
    console.warn(`MR face failed:`, face)
  }
  
  // Handle MR hand errors
  function handleMRHandError(error, hand, context = {}) {
    const errorContext = {
      operation: 'mr-hand',
      hand,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_HAND_FAILED,
      error,
      errorContext
    }
    
    // MR hand errors are usually non-critical
    console.warn(`MR hand failed:`, hand)
  }
  
  // Handle MR body errors
  function handleMRBodyError(error, body, context = {}) {
    const errorContext = {
      operation: 'mr-body',
      body,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_BODY_FAILED,
      error,
      errorContext
    }
    
    // MR body errors are usually non-critical
    console.warn(`MR body failed:`, body)
  }
  
  // Handle MR object errors
  function handleMRObjectError(error, object, context = {}) {
    const errorContext = {
      operation: 'mr-object',
      object,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_OBJECT_FAILED,
      error,
      errorContext
    }
    
    // MR object errors are usually non-critical
    console.warn(`MR object failed:`, object)
  }
  
  // Handle MR scene errors
  function handleMRSceneError(error, scene, context = {}) {
    const errorContext = {
      operation: 'mr-scene',
      scene,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_SCENE_FAILED,
      error,
      errorContext
    }
    
    // MR scene errors are usually non-critical
    console.warn(`MR scene failed:`, scene)
  }
  
  // Handle MR interaction errors
  function handleMRInteractionError(error, interaction, context = {}) {
    const errorContext = {
      operation: 'mr-interaction',
      interaction,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_INTERACTION_FAILED,
      error,
      errorContext
    }
    
    // MR interaction errors are usually non-critical
    console.warn(`MR interaction failed:`, interaction)
  }
  
  // Handle MR animation errors
  function handleMRAnimationError(error, animation, context = {}) {
    const errorContext = {
      operation: 'mr-animation',
      animation,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_ANIMATION_FAILED,
      error,
      errorContext
    }
    
    // MR animation errors are usually non-critical
    console.warn(`MR animation failed:`, animation)
  }
  
  // Handle MR audio errors
  function handleMRAudioError(error, audio, context = {}) {
    const errorContext = {
      operation: 'mr-audio',
      audio,
      ...context
    }
    
    errorHandling.addError(
      MIXED_REALITY_ERRORS.MR_AUDIO_FAILED,
      error,
      errorContext
    }
    
    // MR audio errors are usually non-critical
    console.warn(`MR audio failed:`, audio)
  }
  
  // Execute MR operation with error handling
  async function executeMROperation(operation, operationFunction, context = {}) {
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
  
  // Get MR error summary
  function getMRErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add MR specific analysis
    summary.mrErrors = {
      trackingErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_TRACKING_FAILED] || 0,
      renderingErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_RENDERING_FAILED] || 0,
      calibrationErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_CALIBRATION_FAILED] || 0,
      anchoringErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_ANCHORING_FAILED] || 0,
      occlusionErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_OCCLUSION_FAILED] || 0,
      lightingErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_LIGHTING_FAILED] || 0,
      meshErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_MESH_FAILED] || 0,
      planeErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_PLANE_FAILED] || 0,
      faceErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_FACE_FAILED] || 0,
      handErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_HAND_FAILED] || 0,
      bodyErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_BODY_FAILED] || 0,
      objectErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_OBJECT_FAILED] || 0,
      sceneErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_SCENE_FAILED] || 0,
      interactionErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_INTERACTION_FAILED] || 0,
      animationErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_ANIMATION_FAILED] || 0,
      audioErrors: summary.errorTypes[MIXED_REALITY_ERRORS.MR_AUDIO_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear MR errors
  function clearMRErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // MR specific methods
    handleMRTrackingError,
    handleMRRenderingError,
    handleMRCalibrationError,
    handleMRAnchoringError,
    handleMROcclusionError,
    handleMRLightingError,
    handleMRMeshError,
    handleMRPlaneError,
    handleMRFaceError,
    handleMRHandError,
    handleMRBodyError,
    handleMRObjectError,
    handleMRSceneError,
    handleMRInteractionError,
    handleMRAnimationError,
    handleMRAudioError,
    
    // Utility methods
    executeMROperation,
    getMRErrorSummary,
    clearMRErrors,
    
    // Constants
    MIXED_REALITY_ERRORS
  }
}


