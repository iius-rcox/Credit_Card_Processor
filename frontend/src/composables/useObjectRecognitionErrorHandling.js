import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useObjectRecognitionErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Object recognition specific error types
  const OBJECT_RECOGNITION_ERRORS = {
    OR_CAMERA_FAILED: 'or-camera-failed',
    OR_IMAGE_FAILED: 'or-image-failed',
    OR_DETECTION_FAILED: 'or-detection-failed',
    OR_RECOGNITION_FAILED: 'or-recognition-failed',
    OR_CLASSIFICATION_FAILED: 'or-classification-failed',
    OR_IDENTIFICATION_FAILED: 'or-identification-failed',
    OR_LOCALIZATION_FAILED: 'or-localization-failed',
    OR_SEGMENTATION_FAILED: 'or-segmentation-failed',
    OR_TRACKING_FAILED: 'or-tracking-failed',
    OR_ANALYSIS_FAILED: 'or-analysis-failed',
    OR_FEATURE_FAILED: 'or-feature-failed',
    OR_MATCHING_FAILED: 'or-matching-failed',
    OR_QUALITY_FAILED: 'or-quality-failed',
    OR_LIGHTING_FAILED: 'or-lighting-failed',
    OR_ANGLE_FAILED: 'or-angle-failed',
    OR_DISTANCE_FAILED: 'or-distance-failed'
  }
  
  // Handle OR camera errors
  function handleORCameraError(error, camera, context = {}) {
    const errorContext = {
      operation: 'or-camera',
      camera,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_CAMERA_FAILED,
      error,
      errorContext
    }
    
    // OR camera errors are usually non-critical
    console.warn(`OR camera failed:`, camera)
  }
  
  // Handle OR image errors
  function handleORImageError(error, image, context = {}) {
    const errorContext = {
      operation: 'or-image',
      image,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_IMAGE_FAILED,
      error,
      errorContext
    }
    
    // OR image errors are usually non-critical
    console.warn(`OR image failed:`, image)
  }
  
  // Handle OR detection errors
  function handleORDetectionError(error, detection, context = {}) {
    const errorContext = {
      operation: 'or-detection',
      detection,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_DETECTION_FAILED,
      error,
      errorContext
    }
    
    // OR detection errors are usually non-critical
    console.warn(`OR detection failed:`, detection)
  }
  
  // Handle OR recognition errors
  function handleORRecognitionError(error, recognition, context = {}) {
    const errorContext = {
      operation: 'or-recognition',
      recognition,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_RECOGNITION_FAILED,
      error,
      errorContext
    }
    
    // OR recognition errors are usually non-critical
    console.warn(`OR recognition failed:`, recognition)
  }
  
  // Handle OR classification errors
  function handleORClassificationError(error, classification, context = {}) {
    const errorContext = {
      operation: 'or-classification',
      classification,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_CLASSIFICATION_FAILED,
      error,
      errorContext
    }
    
    // OR classification errors are usually non-critical
    console.warn(`OR classification failed:`, classification)
  }
  
  // Handle OR identification errors
  function handleORIdentificationError(error, identification, context = {}) {
    const errorContext = {
      operation: 'or-identification',
      identification,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_IDENTIFICATION_FAILED,
      error,
      errorContext
    }
    
    // OR identification errors are usually non-critical
    console.warn(`OR identification failed:`, identification)
  }
  
  // Handle OR localization errors
  function handleORLocalizationError(error, localization, context = {}) {
    const errorContext = {
      operation: 'or-localization',
      localization,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_LOCALIZATION_FAILED,
      error,
      errorContext
    }
    
    // OR localization errors are usually non-critical
    console.warn(`OR localization failed:`, localization)
  }
  
  // Handle OR segmentation errors
  function handleORSegmentationError(error, segmentation, context = {}) {
    const errorContext = {
      operation: 'or-segmentation',
      segmentation,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_SEGMENTATION_FAILED,
      error,
      errorContext
    }
    
    // OR segmentation errors are usually non-critical
    console.warn(`OR segmentation failed:`, segmentation)
  }
  
  // Handle OR tracking errors
  function handleORTrackingError(error, tracking, context = {}) {
    const errorContext = {
      operation: 'or-tracking',
      tracking,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_TRACKING_FAILED,
      error,
      errorContext
    }
    
    // OR tracking errors are usually non-critical
    console.warn(`OR tracking failed:`, tracking)
  }
  
  // Handle OR analysis errors
  function handleORAnalysisError(error, analysis, context = {}) {
    const errorContext = {
      operation: 'or-analysis',
      analysis,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_ANALYSIS_FAILED,
      error,
      errorContext
    }
    
    // OR analysis errors are usually non-critical
    console.warn(`OR analysis failed:`, analysis)
  }
  
  // Handle OR feature errors
  function handleORFeatureError(error, feature, context = {}) {
    const errorContext = {
      operation: 'or-feature',
      feature,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_FEATURE_FAILED,
      error,
      errorContext
    }
    
    // OR feature errors are usually non-critical
    console.warn(`OR feature failed:`, feature)
  }
  
  // Handle OR matching errors
  function handleORMatchingError(error, matching, context = {}) {
    const errorContext = {
      operation: 'or-matching',
      matching,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_MATCHING_FAILED,
      error,
      errorContext
    }
    
    // OR matching errors are usually non-critical
    console.warn(`OR matching failed:`, matching)
  }
  
  // Handle OR quality errors
  function handleORQualityError(error, quality, context = {}) {
    const errorContext = {
      operation: 'or-quality',
      quality,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_QUALITY_FAILED,
      error,
      errorContext
    }
    
    // OR quality errors are usually non-critical
    console.warn(`OR quality failed:`, quality)
  }
  
  // Handle OR lighting errors
  function handleORLightingError(error, lighting, context = {}) {
    const errorContext = {
      operation: 'or-lighting',
      lighting,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_LIGHTING_FAILED,
      error,
      errorContext
    }
    
    // OR lighting errors are usually non-critical
    console.warn(`OR lighting failed:`, lighting)
  }
  
  // Handle OR angle errors
  function handleORAngleError(error, angle, context = {}) {
    const errorContext = {
      operation: 'or-angle',
      angle,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_ANGLE_FAILED,
      error,
      errorContext
    }
    
    // OR angle errors are usually non-critical
    console.warn(`OR angle failed:`, angle)
  }
  
  // Handle OR distance errors
  function handleORDistanceError(error, distance, context = {}) {
    const errorContext = {
      operation: 'or-distance',
      distance,
      ...context
    }
    
    errorHandling.addError(
      OBJECT_RECOGNITION_ERRORS.OR_DISTANCE_FAILED,
      error,
      errorContext
    }
    
    // OR distance errors are usually non-critical
    console.warn(`OR distance failed:`, distance)
  }
  
  // Execute OR operation with error handling
  async function executeOROperation(operation, operationFunction, context = {}) {
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
  
  // Get OR error summary
  function getORErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add OR specific analysis
    summary.orErrors = {
      cameraErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_CAMERA_FAILED] || 0,
      imageErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_IMAGE_FAILED] || 0,
      detectionErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_DETECTION_FAILED] || 0,
      recognitionErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_RECOGNITION_FAILED] || 0,
      classificationErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_CLASSIFICATION_FAILED] || 0,
      identificationErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_IDENTIFICATION_FAILED] || 0,
      localizationErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_LOCALIZATION_FAILED] || 0,
      segmentationErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_SEGMENTATION_FAILED] || 0,
      trackingErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_TRACKING_FAILED] || 0,
      analysisErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_ANALYSIS_FAILED] || 0,
      featureErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_FEATURE_FAILED] || 0,
      matchingErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_MATCHING_FAILED] || 0,
      qualityErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_QUALITY_FAILED] || 0,
      lightingErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_LIGHTING_FAILED] || 0,
      angleErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_ANGLE_FAILED] || 0,
      distanceErrors: summary.errorTypes[OBJECT_RECOGNITION_ERRORS.OR_DISTANCE_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear OR errors
  function clearORErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // OR specific methods
    handleORCameraError,
    handleORImageError,
    handleORDetectionError,
    handleORRecognitionError,
    handleORClassificationError,
    handleORIdentificationError,
    handleORLocalizationError,
    handleORSegmentationError,
    handleORTrackingError,
    handleORAnalysisError,
    handleORFeatureError,
    handleORMatchingError,
    handleORQualityError,
    handleORLightingError,
    handleORAngleError,
    handleORDistanceError,
    
    // Utility methods
    executeOROperation,
    getORErrorSummary,
    clearORErrors,
    
    // Constants
    OBJECT_RECOGNITION_ERRORS
  }
}







