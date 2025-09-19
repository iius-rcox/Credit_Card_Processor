import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useComputerVisionErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Computer vision specific error types
  const COMPUTER_VISION_ERRORS = {
    CV_IMAGE_FAILED: 'cv-image-failed',
    CV_VIDEO_FAILED: 'cv-video-failed',
    CV_CAMERA_FAILED: 'cv-camera-failed',
    CV_DETECTION_FAILED: 'cv-detection-failed',
    CV_RECOGNITION_FAILED: 'cv-recognition-failed',
    CV_TRACKING_FAILED: 'cv-tracking-failed',
    CV_SEGMENTATION_FAILED: 'cv-segmentation-failed',
    CV_CLASSIFICATION_FAILED: 'cv-classification-failed',
    CV_FEATURE_FAILED: 'cv-feature-failed',
    CV_MATCHING_FAILED: 'cv-matching-failed',
    CV_OPTICAL_FAILED: 'cv-optical-failed',
    CV_STEREO_FAILED: 'cv-stereo-failed',
    CV_DEPTH_FAILED: 'cv-depth-failed',
    CV_3D_FAILED: 'cv-3d-failed',
    CV_POSE_FAILED: 'cv-pose-failed',
    CV_ANALYSIS_FAILED: 'cv-analysis-failed'
  }
  
  // Handle CV image errors
  function handleCVImageError(error, image, context = {}) {
    const errorContext = {
      operation: 'cv-image',
      image,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_IMAGE_FAILED,
      error,
      errorContext
    }
    
    // CV image errors are usually non-critical
    console.warn(`CV image failed:`, image)
  }
  
  // Handle CV video errors
  function handleCVVideoError(error, video, context = {}) {
    const errorContext = {
      operation: 'cv-video',
      video,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_VIDEO_FAILED,
      error,
      errorContext
    }
    
    // CV video errors are usually non-critical
    console.warn(`CV video failed:`, video)
  }
  
  // Handle CV camera errors
  function handleCVCameraError(error, camera, context = {}) {
    const errorContext = {
      operation: 'cv-camera',
      camera,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_CAMERA_FAILED,
      error,
      errorContext
    }
    
    // CV camera errors are usually non-critical
    console.warn(`CV camera failed:`, camera)
  }
  
  // Handle CV detection errors
  function handleCVDetectionError(error, detection, context = {}) {
    const errorContext = {
      operation: 'cv-detection',
      detection,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_DETECTION_FAILED,
      error,
      errorContext
    }
    
    // CV detection errors are usually non-critical
    console.warn(`CV detection failed:`, detection)
  }
  
  // Handle CV recognition errors
  function handleCVRecognitionError(error, recognition, context = {}) {
    const errorContext = {
      operation: 'cv-recognition',
      recognition,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_RECOGNITION_FAILED,
      error,
      errorContext
    }
    
    // CV recognition errors are usually non-critical
    console.warn(`CV recognition failed:`, recognition)
  }
  
  // Handle CV tracking errors
  function handleCVTrackingError(error, tracking, context = {}) {
    const errorContext = {
      operation: 'cv-tracking',
      tracking,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_TRACKING_FAILED,
      error,
      errorContext
    }
    
    // CV tracking errors are usually non-critical
    console.warn(`CV tracking failed:`, tracking)
  }
  
  // Handle CV segmentation errors
  function handleCVSegmentationError(error, segmentation, context = {}) {
    const errorContext = {
      operation: 'cv-segmentation',
      segmentation,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_SEGMENTATION_FAILED,
      error,
      errorContext
    }
    
    // CV segmentation errors are usually non-critical
    console.warn(`CV segmentation failed:`, segmentation)
  }
  
  // Handle CV classification errors
  function handleCVClassificationError(error, classification, context = {}) {
    const errorContext = {
      operation: 'cv-classification',
      classification,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_CLASSIFICATION_FAILED,
      error,
      errorContext
    }
    
    // CV classification errors are usually non-critical
    console.warn(`CV classification failed:`, classification)
  }
  
  // Handle CV feature errors
  function handleCVFeatureError(error, feature, context = {}) {
    const errorContext = {
      operation: 'cv-feature',
      feature,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_FEATURE_FAILED,
      error,
      errorContext
    }
    
    // CV feature errors are usually non-critical
    console.warn(`CV feature failed:`, feature)
  }
  
  // Handle CV matching errors
  function handleCVMatchingError(error, matching, context = {}) {
    const errorContext = {
      operation: 'cv-matching',
      matching,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_MATCHING_FAILED,
      error,
      errorContext
    }
    
    // CV matching errors are usually non-critical
    console.warn(`CV matching failed:`, matching)
  }
  
  // Handle CV optical errors
  function handleCVOpticalError(error, optical, context = {}) {
    const errorContext = {
      operation: 'cv-optical',
      optical,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_OPTICAL_FAILED,
      error,
      errorContext
    }
    
    // CV optical errors are usually non-critical
    console.warn(`CV optical failed:`, optical)
  }
  
  // Handle CV stereo errors
  function handleCVStereoError(error, stereo, context = {}) {
    const errorContext = {
      operation: 'cv-stereo',
      stereo,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_STEREO_FAILED,
      error,
      errorContext
    }
    
    // CV stereo errors are usually non-critical
    console.warn(`CV stereo failed:`, stereo)
  }
  
  // Handle CV depth errors
  function handleCVDepthError(error, depth, context = {}) {
    const errorContext = {
      operation: 'cv-depth',
      depth,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_DEPTH_FAILED,
      error,
      errorContext
    }
    
    // CV depth errors are usually non-critical
    console.warn(`CV depth failed:`, depth)
  }
  
  // Handle CV 3D errors
  function handleCV3DError(error, threeD, context = {}) {
    const errorContext = {
      operation: 'cv-3d',
      threeD,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_3D_FAILED,
      error,
      errorContext
    }
    
    // CV 3D errors are usually non-critical
    console.warn(`CV 3D failed:`, threeD)
  }
  
  // Handle CV pose errors
  function handleCVPoseError(error, pose, context = {}) {
    const errorContext = {
      operation: 'cv-pose',
      pose,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_POSE_FAILED,
      error,
      errorContext
    }
    
    // CV pose errors are usually non-critical
    console.warn(`CV pose failed:`, pose)
  }
  
  // Handle CV analysis errors
  function handleCVAnalysisError(error, analysis, context = {}) {
    const errorContext = {
      operation: 'cv-analysis',
      analysis,
      ...context
    }
    
    errorHandling.addError(
      COMPUTER_VISION_ERRORS.CV_ANALYSIS_FAILED,
      error,
      errorContext
    }
    
    // CV analysis errors are usually non-critical
    console.warn(`CV analysis failed:`, analysis)
  }
  
  // Execute CV operation with error handling
  async function executeCVOperation(operation, operationFunction, context = {}) {
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
  
  // Get CV error summary
  function getCVErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add CV specific analysis
    summary.cvErrors = {
      imageErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_IMAGE_FAILED] || 0,
      videoErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_VIDEO_FAILED] || 0,
      cameraErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_CAMERA_FAILED] || 0,
      detectionErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_DETECTION_FAILED] || 0,
      recognitionErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_RECOGNITION_FAILED] || 0,
      trackingErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_TRACKING_FAILED] || 0,
      segmentationErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_SEGMENTATION_FAILED] || 0,
      classificationErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_CLASSIFICATION_FAILED] || 0,
      featureErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_FEATURE_FAILED] || 0,
      matchingErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_MATCHING_FAILED] || 0,
      opticalErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_OPTICAL_FAILED] || 0,
      stereoErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_STEREO_FAILED] || 0,
      depthErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_DEPTH_FAILED] || 0,
      threeDErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_3D_FAILED] || 0,
      poseErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_POSE_FAILED] || 0,
      analysisErrors: summary.errorTypes[COMPUTER_VISION_ERRORS.CV_ANALYSIS_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear CV errors
  function clearCVErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // CV specific methods
    handleCVImageError,
    handleCVVideoError,
    handleCVCameraError,
    handleCVDetectionError,
    handleCVRecognitionError,
    handleCVTrackingError,
    handleCVSegmentationError,
    handleCVClassificationError,
    handleCVFeatureError,
    handleCVMatchingError,
    handleCVOpticalError,
    handleCVStereoError,
    handleCVDepthError,
    handleCV3DError,
    handleCVPoseError,
    handleCVAnalysisError,
    
    // Utility methods
    executeCVOperation,
    getCVErrorSummary,
    clearCVErrors,
    
    // Constants
    COMPUTER_VISION_ERRORS
  }
}




