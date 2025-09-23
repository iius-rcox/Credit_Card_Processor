import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useDepthSensingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Depth sensing specific error types
  const DEPTH_SENSING_ERRORS = {
    DS_CAMERA_FAILED: 'ds-camera-failed',
    DS_SENSOR_FAILED: 'ds-sensor-failed',
    DS_DEPTH_FAILED: 'ds-depth-failed',
    DS_RANGE_FAILED: 'ds-range-failed',
    DS_ACCURACY_FAILED: 'ds-accuracy-failed',
    DS_RESOLUTION_FAILED: 'ds-resolution-failed',
    DS_FRAME_FAILED: 'ds-frame-failed',
    DS_CALIBRATION_FAILED: 'ds-calibration-failed',
    DS_ALIGNMENT_FAILED: 'ds-alignment-failed',
    DS_SYNC_FAILED: 'ds-sync-failed',
    DS_NOISE_FAILED: 'ds-noise-failed',
    DS_ARTIFACT_FAILED: 'ds-artifact-failed',
    DS_QUALITY_FAILED: 'ds-quality-failed',
    DS_LIGHTING_FAILED: 'ds-lighting-failed',
    DS_REFLECTION_FAILED: 'ds-reflection-failed',
    DS_ABSORPTION_FAILED: 'ds-absorption-failed'
  }
  
  // Handle DS camera errors
  function handleDSCameraError(error, camera, context = {}) {
    const errorContext = {
      operation: 'ds-camera',
      camera,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_CAMERA_FAILED,
      error,
      errorContext
    }
    
    // DS camera errors are usually non-critical
    console.warn(`DS camera failed:`, camera)
  }
  
  // Handle DS sensor errors
  function handleDSSensorError(error, sensor, context = {}) {
    const errorContext = {
      operation: 'ds-sensor',
      sensor,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_SENSOR_FAILED,
      error,
      errorContext
    }
    
    // DS sensor errors are usually non-critical
    console.warn(`DS sensor failed:`, sensor)
  }
  
  // Handle DS depth errors
  function handleDSDepthError(error, depth, context = {}) {
    const errorContext = {
      operation: 'ds-depth',
      depth,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_DEPTH_FAILED,
      error,
      errorContext
    }
    
    // DS depth errors are usually non-critical
    console.warn(`DS depth failed:`, depth)
  }
  
  // Handle DS range errors
  function handleDSRangeError(error, range, context = {}) {
    const errorContext = {
      operation: 'ds-range',
      range,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_RANGE_FAILED,
      error,
      errorContext
    }
    
    // DS range errors are usually non-critical
    console.warn(`DS range failed:`, range)
  }
  
  // Handle DS accuracy errors
  function handleDSAccuracyError(error, accuracy, context = {}) {
    const errorContext = {
      operation: 'ds-accuracy',
      accuracy,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_ACCURACY_FAILED,
      error,
      errorContext
    }
    
    // DS accuracy errors are usually non-critical
    console.warn(`DS accuracy failed:`, accuracy)
  }
  
  // Handle DS resolution errors
  function handleDSResolutionError(error, resolution, context = {}) {
    const errorContext = {
      operation: 'ds-resolution',
      resolution,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_RESOLUTION_FAILED,
      error,
      errorContext
    }
    
    // DS resolution errors are usually non-critical
    console.warn(`DS resolution failed:`, resolution)
  }
  
  // Handle DS frame errors
  function handleDSFrameError(error, frame, context = {}) {
    const errorContext = {
      operation: 'ds-frame',
      frame,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_FRAME_FAILED,
      error,
      errorContext
    }
    
    // DS frame errors are usually non-critical
    console.warn(`DS frame failed:`, frame)
  }
  
  // Handle DS calibration errors
  function handleDSCalibrationError(error, calibration, context = {}) {
    const errorContext = {
      operation: 'ds-calibration',
      calibration,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_CALIBRATION_FAILED,
      error,
      errorContext
    }
    
    // DS calibration errors are usually non-critical
    console.warn(`DS calibration failed:`, calibration)
  }
  
  // Handle DS alignment errors
  function handleDSAlignmentError(error, alignment, context = {}) {
    const errorContext = {
      operation: 'ds-alignment',
      alignment,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_ALIGNMENT_FAILED,
      error,
      errorContext
    }
    
    // DS alignment errors are usually non-critical
    console.warn(`DS alignment failed:`, alignment)
  }
  
  // Handle DS sync errors
  function handleDSSyncError(error, sync, context = {}) {
    const errorContext = {
      operation: 'ds-sync',
      sync,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_SYNC_FAILED,
      error,
      errorContext
    }
    
    // DS sync errors are usually non-critical
    console.warn(`DS sync failed:`, sync)
  }
  
  // Handle DS noise errors
  function handleDSNoiseError(error, noise, context = {}) {
    const errorContext = {
      operation: 'ds-noise',
      noise,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_NOISE_FAILED,
      error,
      errorContext
    }
    
    // DS noise errors are usually non-critical
    console.warn(`DS noise failed:`, noise)
  }
  
  // Handle DS artifact errors
  function handleDSArtifactError(error, artifact, context = {}) {
    const errorContext = {
      operation: 'ds-artifact',
      artifact,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_ARTIFACT_FAILED,
      error,
      errorContext
    }
    
    // DS artifact errors are usually non-critical
    console.warn(`DS artifact failed:`, artifact)
  }
  
  // Handle DS quality errors
  function handleDSQualityError(error, quality, context = {}) {
    const errorContext = {
      operation: 'ds-quality',
      quality,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_QUALITY_FAILED,
      error,
      errorContext
    }
    
    // DS quality errors are usually non-critical
    console.warn(`DS quality failed:`, quality)
  }
  
  // Handle DS lighting errors
  function handleDSLightingError(error, lighting, context = {}) {
    const errorContext = {
      operation: 'ds-lighting',
      lighting,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_LIGHTING_FAILED,
      error,
      errorContext
    }
    
    // DS lighting errors are usually non-critical
    console.warn(`DS lighting failed:`, lighting)
  }
  
  // Handle DS reflection errors
  function handleDSReflectionError(error, reflection, context = {}) {
    const errorContext = {
      operation: 'ds-reflection',
      reflection,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_REFLECTION_FAILED,
      error,
      errorContext
    }
    
    // DS reflection errors are usually non-critical
    console.warn(`DS reflection failed:`, reflection)
  }
  
  // Handle DS absorption errors
  function handleDSAbsorptionError(error, absorption, context = {}) {
    const errorContext = {
      operation: 'ds-absorption',
      absorption,
      ...context
    }
    
    errorHandling.addError(
      DEPTH_SENSING_ERRORS.DS_ABSORPTION_FAILED,
      error,
      errorContext
    }
    
    // DS absorption errors are usually non-critical
    console.warn(`DS absorption failed:`, absorption)
  }
  
  // Execute DS operation with error handling
  async function executeDSOperation(operation, operationFunction, context = {}) {
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
  
  // Get DS error summary
  function getDSErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add DS specific analysis
    summary.dsErrors = {
      cameraErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_CAMERA_FAILED] || 0,
      sensorErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_SENSOR_FAILED] || 0,
      depthErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_DEPTH_FAILED] || 0,
      rangeErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_RANGE_FAILED] || 0,
      accuracyErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_ACCURACY_FAILED] || 0,
      resolutionErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_RESOLUTION_FAILED] || 0,
      frameErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_FRAME_FAILED] || 0,
      calibrationErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_CALIBRATION_FAILED] || 0,
      alignmentErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_ALIGNMENT_FAILED] || 0,
      syncErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_SYNC_FAILED] || 0,
      noiseErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_NOISE_FAILED] || 0,
      artifactErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_ARTIFACT_FAILED] || 0,
      qualityErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_QUALITY_FAILED] || 0,
      lightingErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_LIGHTING_FAILED] || 0,
      reflectionErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_REFLECTION_FAILED] || 0,
      absorptionErrors: summary.errorTypes[DEPTH_SENSING_ERRORS.DS_ABSORPTION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear DS errors
  function clearDSErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // DS specific methods
    handleDSCameraError,
    handleDSSensorError,
    handleDSDepthError,
    handleDSRangeError,
    handleDSAccuracyError,
    handleDSResolutionError,
    handleDSFrameError,
    handleDSCalibrationError,
    handleDSAlignmentError,
    handleDSSyncError,
    handleDSNoiseError,
    handleDSArtifactError,
    handleDSQualityError,
    handleDSLightingError,
    handleDSReflectionError,
    handleDSAbsorptionError,
    
    // Utility methods
    executeDSOperation,
    getDSErrorSummary,
    clearDSErrors,
    
    // Constants
    DEPTH_SENSING_ERRORS
  }
}







