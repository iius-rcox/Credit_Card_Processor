import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useMotionTrackingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Motion tracking specific error types
  const MOTION_TRACKING_ERRORS = {
    MT_CAMERA_FAILED: 'mt-camera-failed',
    MT_SENSOR_FAILED: 'mt-sensor-failed',
    MT_TRACKING_FAILED: 'mt-tracking-failed',
    MT_DETECTION_FAILED: 'mt-detection-failed',
    MT_RECOGNITION_FAILED: 'mt-recognition-failed',
    MT_CLASSIFICATION_FAILED: 'mt-classification-failed',
    MT_POSE_FAILED: 'mt-pose-failed',
    MT_MOTION_FAILED: 'mt-motion-failed',
    MT_GESTURE_FAILED: 'mt-gesture-failed',
    MT_HAND_FAILED: 'mt-hand-failed',
    MT_FACE_FAILED: 'mt-face-failed',
    MT_BODY_FAILED: 'mt-body-failed',
    MT_EYE_FAILED: 'mt-eye-failed',
    MT_HEAD_FAILED: 'mt-head-failed',
    MT_ARM_FAILED: 'mt-arm-failed',
    MT_LEG_FAILED: 'mt-leg-failed'
  }
  
  // Handle MT camera errors
  function handleMTCameraError(error, camera, context = {}) {
    const errorContext = {
      operation: 'mt-camera',
      camera,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_CAMERA_FAILED,
      error,
      errorContext
    }
    
    // MT camera errors are usually non-critical
    console.warn(`MT camera failed:`, camera)
  }
  
  // Handle MT sensor errors
  function handleMTSensorError(error, sensor, context = {}) {
    const errorContext = {
      operation: 'mt-sensor',
      sensor,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_SENSOR_FAILED,
      error,
      errorContext
    }
    
    // MT sensor errors are usually non-critical
    console.warn(`MT sensor failed:`, sensor)
  }
  
  // Handle MT tracking errors
  function handleMTTrackingError(error, tracking, context = {}) {
    const errorContext = {
      operation: 'mt-tracking',
      tracking,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_TRACKING_FAILED,
      error,
      errorContext
    }
    
    // MT tracking errors are usually non-critical
    console.warn(`MT tracking failed:`, tracking)
  }
  
  // Handle MT detection errors
  function handleMTDetectionError(error, detection, context = {}) {
    const errorContext = {
      operation: 'mt-detection',
      detection,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_DETECTION_FAILED,
      error,
      errorContext
    }
    
    // MT detection errors are usually non-critical
    console.warn(`MT detection failed:`, detection)
  }
  
  // Handle MT recognition errors
  function handleMTRecognitionError(error, recognition, context = {}) {
    const errorContext = {
      operation: 'mt-recognition',
      recognition,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_RECOGNITION_FAILED,
      error,
      errorContext
    }
    
    // MT recognition errors are usually non-critical
    console.warn(`MT recognition failed:`, recognition)
  }
  
  // Handle MT classification errors
  function handleMTClassificationError(error, classification, context = {}) {
    const errorContext = {
      operation: 'mt-classification',
      classification,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_CLASSIFICATION_FAILED,
      error,
      errorContext
    }
    
    // MT classification errors are usually non-critical
    console.warn(`MT classification failed:`, classification)
  }
  
  // Handle MT pose errors
  function handleMTPoseError(error, pose, context = {}) {
    const errorContext = {
      operation: 'mt-pose',
      pose,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_POSE_FAILED,
      error,
      errorContext
    }
    
    // MT pose errors are usually non-critical
    console.warn(`MT pose failed:`, pose)
  }
  
  // Handle MT motion errors
  function handleMTMotionError(error, motion, context = {}) {
    const errorContext = {
      operation: 'mt-motion',
      motion,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_MOTION_FAILED,
      error,
      errorContext
    }
    
    // MT motion errors are usually non-critical
    console.warn(`MT motion failed:`, motion)
  }
  
  // Handle MT gesture errors
  function handleMTGestureError(error, gesture, context = {}) {
    const errorContext = {
      operation: 'mt-gesture',
      gesture,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_GESTURE_FAILED,
      error,
      errorContext
    }
    
    // MT gesture errors are usually non-critical
    console.warn(`MT gesture failed:`, gesture)
  }
  
  // Handle MT hand errors
  function handleMTHandError(error, hand, context = {}) {
    const errorContext = {
      operation: 'mt-hand',
      hand,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_HAND_FAILED,
      error,
      errorContext
    }
    
    // MT hand errors are usually non-critical
    console.warn(`MT hand failed:`, hand)
  }
  
  // Handle MT face errors
  function handleMTFaceError(error, face, context = {}) {
    const errorContext = {
      operation: 'mt-face',
      face,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_FACE_FAILED,
      error,
      errorContext
    }
    
    // MT face errors are usually non-critical
    console.warn(`MT face failed:`, face)
  }
  
  // Handle MT body errors
  function handleMTBodyError(error, body, context = {}) {
    const errorContext = {
      operation: 'mt-body',
      body,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_BODY_FAILED,
      error,
      errorContext
    }
    
    // MT body errors are usually non-critical
    console.warn(`MT body failed:`, body)
  }
  
  // Handle MT eye errors
  function handleMTEyeError(error, eye, context = {}) {
    const errorContext = {
      operation: 'mt-eye',
      eye,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_EYE_FAILED,
      error,
      errorContext
    }
    
    // MT eye errors are usually non-critical
    console.warn(`MT eye failed:`, eye)
  }
  
  // Handle MT head errors
  function handleMTHeadError(error, head, context = {}) {
    const errorContext = {
      operation: 'mt-head',
      head,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_HEAD_FAILED,
      error,
      errorContext
    }
    
    // MT head errors are usually non-critical
    console.warn(`MT head failed:`, head)
  }
  
  // Handle MT arm errors
  function handleMTArmError(error, arm, context = {}) {
    const errorContext = {
      operation: 'mt-arm',
      arm,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_ARM_FAILED,
      error,
      errorContext
    }
    
    // MT arm errors are usually non-critical
    console.warn(`MT arm failed:`, arm)
  }
  
  // Handle MT leg errors
  function handleMTLegError(error, leg, context = {}) {
    const errorContext = {
      operation: 'mt-leg',
      leg,
      ...context
    }
    
    errorHandling.addError(
      MOTION_TRACKING_ERRORS.MT_LEG_FAILED,
      error,
      errorContext
    }
    
    // MT leg errors are usually non-critical
    console.warn(`MT leg failed:`, leg)
  }
  
  // Execute MT operation with error handling
  async function executeMTOperation(operation, operationFunction, context = {}) {
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
  
  // Get MT error summary
  function getMTErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add MT specific analysis
    summary.mtErrors = {
      cameraErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_CAMERA_FAILED] || 0,
      sensorErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_SENSOR_FAILED] || 0,
      trackingErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_TRACKING_FAILED] || 0,
      detectionErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_DETECTION_FAILED] || 0,
      recognitionErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_RECOGNITION_FAILED] || 0,
      classificationErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_CLASSIFICATION_FAILED] || 0,
      poseErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_POSE_FAILED] || 0,
      motionErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_MOTION_FAILED] || 0,
      gestureErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_GESTURE_FAILED] || 0,
      handErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_HAND_FAILED] || 0,
      faceErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_FACE_FAILED] || 0,
      bodyErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_BODY_FAILED] || 0,
      eyeErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_EYE_FAILED] || 0,
      headErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_HEAD_FAILED] || 0,
      armErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_ARM_FAILED] || 0,
      legErrors: summary.errorTypes[MOTION_TRACKING_ERRORS.MT_LEG_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear MT errors
  function clearMTErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // MT specific methods
    handleMTCameraError,
    handleMTSensorError,
    handleMTTrackingError,
    handleMTDetectionError,
    handleMTRecognitionError,
    handleMTClassificationError,
    handleMTPoseError,
    handleMTMotionError,
    handleMTGestureError,
    handleMTHandError,
    handleMTFaceError,
    handleMTBodyError,
    handleMTEyeError,
    handleMTHeadError,
    handleMTArmError,
    handleMTLegError,
    
    // Utility methods
    executeMTOperation,
    getMTErrorSummary,
    clearMTErrors,
    
    // Constants
    MOTION_TRACKING_ERRORS
  }
}




