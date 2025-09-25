import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useFacialRecognitionErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Facial recognition specific error types
  const FACIAL_RECOGNITION_ERRORS = {
    FR_CAMERA_FAILED: 'fr-camera-failed',
    FR_IMAGE_FAILED: 'fr-image-failed',
    FR_DETECTION_FAILED: 'fr-detection-failed',
    FR_RECOGNITION_FAILED: 'fr-recognition-failed',
    FR_IDENTIFICATION_FAILED: 'fr-identification-failed',
    FR_VERIFICATION_FAILED: 'fr-verification-failed',
    FR_ANALYSIS_FAILED: 'fr-analysis-failed',
    FR_FEATURE_FAILED: 'fr-feature-failed',
    FR_MATCHING_FAILED: 'fr-matching-failed',
    FR_QUALITY_FAILED: 'fr-quality-failed',
    FR_LIGHTING_FAILED: 'fr-lighting-failed',
    FR_ANGLE_FAILED: 'fr-angle-failed',
    FR_DISTANCE_FAILED: 'fr-distance-failed',
    FR_MOTION_FAILED: 'fr-motion-failed',
    FR_OCCLUSION_FAILED: 'fr-occlusion-failed',
    FR_EMOTION_FAILED: 'fr-emotion-failed'
  }
  
  // Handle FR camera errors
  function handleFRCameraError(error, camera, context = {}) {
    const errorContext = {
      operation: 'fr-camera',
      camera,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_CAMERA_FAILED,
      error,
      errorContext
    }
    
    // FR camera errors are usually non-critical
    console.warn(`FR camera failed:`, camera)
  }
  
  // Handle FR image errors
  function handleFRImageError(error, image, context = {}) {
    const errorContext = {
      operation: 'fr-image',
      image,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_IMAGE_FAILED,
      error,
      errorContext
    }
    
    // FR image errors are usually non-critical
    console.warn(`FR image failed:`, image)
  }
  
  // Handle FR detection errors
  function handleFRDetectionError(error, detection, context = {}) {
    const errorContext = {
      operation: 'fr-detection',
      detection,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_DETECTION_FAILED,
      error,
      errorContext
    }
    
    // FR detection errors are usually non-critical
    console.warn(`FR detection failed:`, detection)
  }
  
  // Handle FR recognition errors
  function handleFRRecognitionError(error, recognition, context = {}) {
    const errorContext = {
      operation: 'fr-recognition',
      recognition,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_RECOGNITION_FAILED,
      error,
      errorContext
    }
    
    // FR recognition errors are usually non-critical
    console.warn(`FR recognition failed:`, recognition)
  }
  
  // Handle FR identification errors
  function handleFRIdentificationError(error, identification, context = {}) {
    const errorContext = {
      operation: 'fr-identification',
      identification,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_IDENTIFICATION_FAILED,
      error,
      errorContext
    }
    
    // FR identification errors are usually non-critical
    console.warn(`FR identification failed:`, identification)
  }
  
  // Handle FR verification errors
  function handleFRVerificationError(error, verification, context = {}) {
    const errorContext = {
      operation: 'fr-verification',
      verification,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_VERIFICATION_FAILED,
      error,
      errorContext
    }
    
    // FR verification errors are usually non-critical
    console.warn(`FR verification failed:`, verification)
  }
  
  // Handle FR analysis errors
  function handleFRAnalysisError(error, analysis, context = {}) {
    const errorContext = {
      operation: 'fr-analysis',
      analysis,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_ANALYSIS_FAILED,
      error,
      errorContext
    }
    
    // FR analysis errors are usually non-critical
    console.warn(`FR analysis failed:`, analysis)
  }
  
  // Handle FR feature errors
  function handleFRFeatureError(error, feature, context = {}) {
    const errorContext = {
      operation: 'fr-feature',
      feature,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_FEATURE_FAILED,
      error,
      errorContext
    }
    
    // FR feature errors are usually non-critical
    console.warn(`FR feature failed:`, feature)
  }
  
  // Handle FR matching errors
  function handleFRMatchingError(error, matching, context = {}) {
    const errorContext = {
      operation: 'fr-matching',
      matching,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_MATCHING_FAILED,
      error,
      errorContext
    }
    
    // FR matching errors are usually non-critical
    console.warn(`FR matching failed:`, matching)
  }
  
  // Handle FR quality errors
  function handleFRQualityError(error, quality, context = {}) {
    const errorContext = {
      operation: 'fr-quality',
      quality,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_QUALITY_FAILED,
      error,
      errorContext
    }
    
    // FR quality errors are usually non-critical
    console.warn(`FR quality failed:`, quality)
  }
  
  // Handle FR lighting errors
  function handleFRLightingError(error, lighting, context = {}) {
    const errorContext = {
      operation: 'fr-lighting',
      lighting,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_LIGHTING_FAILED,
      error,
      errorContext
    }
    
    // FR lighting errors are usually non-critical
    console.warn(`FR lighting failed:`, lighting)
  }
  
  // Handle FR angle errors
  function handleFRAngleError(error, angle, context = {}) {
    const errorContext = {
      operation: 'fr-angle',
      angle,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_ANGLE_FAILED,
      error,
      errorContext
    }
    
    // FR angle errors are usually non-critical
    console.warn(`FR angle failed:`, angle)
  }
  
  // Handle FR distance errors
  function handleFRDistanceError(error, distance, context = {}) {
    const errorContext = {
      operation: 'fr-distance',
      distance,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_DISTANCE_FAILED,
      error,
      errorContext
    }
    
    // FR distance errors are usually non-critical
    console.warn(`FR distance failed:`, distance)
  }
  
  // Handle FR motion errors
  function handleFRMotionError(error, motion, context = {}) {
    const errorContext = {
      operation: 'fr-motion',
      motion,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_MOTION_FAILED,
      error,
      errorContext
    }
    
    // FR motion errors are usually non-critical
    console.warn(`FR motion failed:`, motion)
  }
  
  // Handle FR occlusion errors
  function handleFROcclusionError(error, occlusion, context = {}) {
    const errorContext = {
      operation: 'fr-occlusion',
      occlusion,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_OCCLUSION_FAILED,
      error,
      errorContext
    }
    
    // FR occlusion errors are usually non-critical
    console.warn(`FR occlusion failed:`, occlusion)
  }
  
  // Handle FR emotion errors
  function handleFREmotionError(error, emotion, context = {}) {
    const errorContext = {
      operation: 'fr-emotion',
      emotion,
      ...context
    }
    
    errorHandling.addError(
      FACIAL_RECOGNITION_ERRORS.FR_EMOTION_FAILED,
      error,
      errorContext
    }
    
    // FR emotion errors are usually non-critical
    console.warn(`FR emotion failed:`, emotion)
  }
  
  // Execute FR operation with error handling
  async function executeFROperation(operation, operationFunction, context = {}) {
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
  
  // Get FR error summary
  function getFRErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add FR specific analysis
    summary.frErrors = {
      cameraErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_CAMERA_FAILED] || 0,
      imageErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_IMAGE_FAILED] || 0,
      detectionErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_DETECTION_FAILED] || 0,
      recognitionErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_RECOGNITION_FAILED] || 0,
      identificationErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_IDENTIFICATION_FAILED] || 0,
      verificationErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_VERIFICATION_FAILED] || 0,
      analysisErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_ANALYSIS_FAILED] || 0,
      featureErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_FEATURE_FAILED] || 0,
      matchingErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_MATCHING_FAILED] || 0,
      qualityErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_QUALITY_FAILED] || 0,
      lightingErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_LIGHTING_FAILED] || 0,
      angleErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_ANGLE_FAILED] || 0,
      distanceErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_DISTANCE_FAILED] || 0,
      motionErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_MOTION_FAILED] || 0,
      occlusionErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_OCCLUSION_FAILED] || 0,
      emotionErrors: summary.errorTypes[FACIAL_RECOGNITION_ERRORS.FR_EMOTION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear FR errors
  function clearFRErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // FR specific methods
    handleFRCameraError,
    handleFRImageError,
    handleFRDetectionError,
    handleFRRecognitionError,
    handleFRIdentificationError,
    handleFRVerificationError,
    handleFRAnalysisError,
    handleFRFeatureError,
    handleFRMatchingError,
    handleFRQualityError,
    handleFRLightingError,
    handleFRAngleError,
    handleFRDistanceError,
    handleFRMotionError,
    handleFROcclusionError,
    handleFREmotionError,
    
    // Utility methods
    executeFROperation,
    getFRErrorSummary,
    clearFRErrors,
    
    // Constants
    FACIAL_RECOGNITION_ERRORS
  }
}








