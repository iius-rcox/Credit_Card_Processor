import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useGestureRecognitionErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Gesture recognition specific error types
  const GESTURE_RECOGNITION_ERRORS = {
    GR_CAMERA_FAILED: 'gr-camera-failed',
    GR_SENSOR_FAILED: 'gr-sensor-failed',
    GR_TRACKING_FAILED: 'gr-tracking-failed',
    GR_DETECTION_FAILED: 'gr-detection-failed',
    GR_RECOGNITION_FAILED: 'gr-recognition-failed',
    GR_CLASSIFICATION_FAILED: 'gr-classification-failed',
    GR_POSE_FAILED: 'gr-pose-failed',
    GR_MOTION_FAILED: 'gr-motion-failed',
    GR_GESTURE_FAILED: 'gr-gesture-failed',
    GR_HAND_FAILED: 'gr-hand-failed',
    GR_FACE_FAILED: 'gr-face-failed',
    GR_BODY_FAILED: 'gr-body-failed',
    GR_EYE_FAILED: 'gr-eye-failed',
    GR_HEAD_FAILED: 'gr-head-failed',
    GR_ARM_FAILED: 'gr-arm-failed',
    GR_LEG_FAILED: 'gr-leg-failed'
  }
  
  // Handle GR camera errors
  function handleGRCameraError(error, camera, context = {}) {
    const errorContext = {
      operation: 'gr-camera',
      camera,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_CAMERA_FAILED,
      error,
      errorContext
    }
    
    // GR camera errors are usually non-critical
    console.warn(`GR camera failed:`, camera)
  }
  
  // Handle GR sensor errors
  function handleGRSensorError(error, sensor, context = {}) {
    const errorContext = {
      operation: 'gr-sensor',
      sensor,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_SENSOR_FAILED,
      error,
      errorContext
    }
    
    // GR sensor errors are usually non-critical
    console.warn(`GR sensor failed:`, sensor)
  }
  
  // Handle GR tracking errors
  function handleGRTrackingError(error, tracking, context = {}) {
    const errorContext = {
      operation: 'gr-tracking',
      tracking,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_TRACKING_FAILED,
      error,
      errorContext
    }
    
    // GR tracking errors are usually non-critical
    console.warn(`GR tracking failed:`, tracking)
  }
  
  // Handle GR detection errors
  function handleGRDetectionError(error, detection, context = {}) {
    const errorContext = {
      operation: 'gr-detection',
      detection,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_DETECTION_FAILED,
      error,
      errorContext
    }
    
    // GR detection errors are usually non-critical
    console.warn(`GR detection failed:`, detection)
  }
  
  // Handle GR recognition errors
  function handleGRRecognitionError(error, recognition, context = {}) {
    const errorContext = {
      operation: 'gr-recognition',
      recognition,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_RECOGNITION_FAILED,
      error,
      errorContext
    }
    
    // GR recognition errors are usually non-critical
    console.warn(`GR recognition failed:`, recognition)
  }
  
  // Handle GR classification errors
  function handleGRClassificationError(error, classification, context = {}) {
    const errorContext = {
      operation: 'gr-classification',
      classification,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_CLASSIFICATION_FAILED,
      error,
      errorContext
    }
    
    // GR classification errors are usually non-critical
    console.warn(`GR classification failed:`, classification)
  }
  
  // Handle GR pose errors
  function handleGRPoseError(error, pose, context = {}) {
    const errorContext = {
      operation: 'gr-pose',
      pose,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_POSE_FAILED,
      error,
      errorContext
    }
    
    // GR pose errors are usually non-critical
    console.warn(`GR pose failed:`, pose)
  }
  
  // Handle GR motion errors
  function handleGRMotionError(error, motion, context = {}) {
    const errorContext = {
      operation: 'gr-motion',
      motion,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_MOTION_FAILED,
      error,
      errorContext
    }
    
    // GR motion errors are usually non-critical
    console.warn(`GR motion failed:`, motion)
  }
  
  // Handle GR gesture errors
  function handleGRGestureError(error, gesture, context = {}) {
    const errorContext = {
      operation: 'gr-gesture',
      gesture,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_GESTURE_FAILED,
      error,
      errorContext
    }
    
    // GR gesture errors are usually non-critical
    console.warn(`GR gesture failed:`, gesture)
  }
  
  // Handle GR hand errors
  function handleGRHandError(error, hand, context = {}) {
    const errorContext = {
      operation: 'gr-hand',
      hand,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_HAND_FAILED,
      error,
      errorContext
    }
    
    // GR hand errors are usually non-critical
    console.warn(`GR hand failed:`, hand)
  }
  
  // Handle GR face errors
  function handleGRFaceError(error, face, context = {}) {
    const errorContext = {
      operation: 'gr-face',
      face,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_FACE_FAILED,
      error,
      errorContext
    }
    
    // GR face errors are usually non-critical
    console.warn(`GR face failed:`, face)
  }
  
  // Handle GR body errors
  function handleGRBodyError(error, body, context = {}) {
    const errorContext = {
      operation: 'gr-body',
      body,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_BODY_FAILED,
      error,
      errorContext
    }
    
    // GR body errors are usually non-critical
    console.warn(`GR body failed:`, body)
  }
  
  // Handle GR eye errors
  function handleGREyeError(error, eye, context = {}) {
    const errorContext = {
      operation: 'gr-eye',
      eye,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_EYE_FAILED,
      error,
      errorContext
    }
    
    // GR eye errors are usually non-critical
    console.warn(`GR eye failed:`, eye)
  }
  
  // Handle GR head errors
  function handleGRHeadError(error, head, context = {}) {
    const errorContext = {
      operation: 'gr-head',
      head,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_HEAD_FAILED,
      error,
      errorContext
    }
    
    // GR head errors are usually non-critical
    console.warn(`GR head failed:`, head)
  }
  
  // Handle GR arm errors
  function handleGRArmError(error, arm, context = {}) {
    const errorContext = {
      operation: 'gr-arm',
      arm,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_ARM_FAILED,
      error,
      errorContext
    }
    
    // GR arm errors are usually non-critical
    console.warn(`GR arm failed:`, arm)
  }
  
  // Handle GR leg errors
  function handleGRLegError(error, leg, context = {}) {
    const errorContext = {
      operation: 'gr-leg',
      leg,
      ...context
    }
    
    errorHandling.addError(
      GESTURE_RECOGNITION_ERRORS.GR_LEG_FAILED,
      error,
      errorContext
    }
    
    // GR leg errors are usually non-critical
    console.warn(`GR leg failed:`, leg)
  }
  
  // Execute GR operation with error handling
  async function executeGROperation(operation, operationFunction, context = {}) {
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
  
  // Get GR error summary
  function getGRErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add GR specific analysis
    summary.grErrors = {
      cameraErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_CAMERA_FAILED] || 0,
      sensorErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_SENSOR_FAILED] || 0,
      trackingErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_TRACKING_FAILED] || 0,
      detectionErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_DETECTION_FAILED] || 0,
      recognitionErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_RECOGNITION_FAILED] || 0,
      classificationErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_CLASSIFICATION_FAILED] || 0,
      poseErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_POSE_FAILED] || 0,
      motionErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_MOTION_FAILED] || 0,
      gestureErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_GESTURE_FAILED] || 0,
      handErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_HAND_FAILED] || 0,
      faceErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_FACE_FAILED] || 0,
      bodyErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_BODY_FAILED] || 0,
      eyeErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_EYE_FAILED] || 0,
      headErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_HEAD_FAILED] || 0,
      armErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_ARM_FAILED] || 0,
      legErrors: summary.errorTypes[GESTURE_RECOGNITION_ERRORS.GR_LEG_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear GR errors
  function clearGRErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // GR specific methods
    handleGRCameraError,
    handleGRSensorError,
    handleGRTrackingError,
    handleGRDetectionError,
    handleGRRecognitionError,
    handleGRClassificationError,
    handleGRPoseError,
    handleGRMotionError,
    handleGRGestureError,
    handleGRHandError,
    handleGRFaceError,
    handleGRBodyError,
    handleGREyeError,
    handleGRHeadError,
    handleGRArmError,
    handleGRLegError,
    
    // Utility methods
    executeGROperation,
    getGRErrorSummary,
    clearGRErrors,
    
    // Constants
    GESTURE_RECOGNITION_ERRORS
  }
}


