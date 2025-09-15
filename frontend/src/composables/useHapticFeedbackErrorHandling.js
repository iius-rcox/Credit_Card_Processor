import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useHapticFeedbackErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Haptic feedback specific error types
  const HAPTIC_FEEDBACK_ERRORS = {
    HF_DEVICE_FAILED: 'hf-device-failed',
    HF_SENSOR_FAILED: 'hf-sensor-failed',
    HF_ACTUATOR_FAILED: 'hf-actuator-failed',
    HF_VIBRATION_FAILED: 'hf-vibration-failed',
    HF_FORCE_FAILED: 'hf-force-failed',
    HF_PRESSURE_FAILED: 'hf-pressure-failed',
    HF_TEMPERATURE_FAILED: 'hf-temperature-failed',
    HF_TEXTURE_FAILED: 'hf-texture-failed',
    HF_PATTERN_FAILED: 'hf-pattern-failed',
    HF_INTENSITY_FAILED: 'hf-intensity-failed',
    HF_DURATION_FAILED: 'hf-duration-failed',
    HF_FREQUENCY_FAILED: 'hf-frequency-failed',
    HF_AMPLITUDE_FAILED: 'hf-amplitude-failed',
    HF_CALIBRATION_FAILED: 'hf-calibration-failed',
    HF_SYNC_FAILED: 'hf-sync-failed',
    HF_PERMISSION_FAILED: 'hf-permission-failed'
  }
  
  // Handle HF device errors
  function handleHFDeviceError(error, device, context = {}) {
    const errorContext = {
      operation: 'hf-device',
      device,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_DEVICE_FAILED,
      error,
      errorContext
    }
    
    // HF device errors are usually non-critical
    console.warn(`HF device failed:`, device)
  }
  
  // Handle HF sensor errors
  function handleHFSensorError(error, sensor, context = {}) {
    const errorContext = {
      operation: 'hf-sensor',
      sensor,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_SENSOR_FAILED,
      error,
      errorContext
    }
    
    // HF sensor errors are usually non-critical
    console.warn(`HF sensor failed:`, sensor)
  }
  
  // Handle HF actuator errors
  function handleHFActuatorError(error, actuator, context = {}) {
    const errorContext = {
      operation: 'hf-actuator',
      actuator,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_ACTUATOR_FAILED,
      error,
      errorContext
    }
    
    // HF actuator errors are usually non-critical
    console.warn(`HF actuator failed:`, actuator)
  }
  
  // Handle HF vibration errors
  function handleHFVibrationError(error, vibration, context = {}) {
    const errorContext = {
      operation: 'hf-vibration',
      vibration,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_VIBRATION_FAILED,
      error,
      errorContext
    }
    
    // HF vibration errors are usually non-critical
    console.warn(`HF vibration failed:`, vibration)
  }
  
  // Handle HF force errors
  function handleHFForceError(error, force, context = {}) {
    const errorContext = {
      operation: 'hf-force',
      force,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_FORCE_FAILED,
      error,
      errorContext
    }
    
    // HF force errors are usually non-critical
    console.warn(`HF force failed:`, force)
  }
  
  // Handle HF pressure errors
  function handleHFPressureError(error, pressure, context = {}) {
    const errorContext = {
      operation: 'hf-pressure',
      pressure,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_PRESSURE_FAILED,
      error,
      errorContext
    }
    
    // HF pressure errors are usually non-critical
    console.warn(`HF pressure failed:`, pressure)
  }
  
  // Handle HF temperature errors
  function handleHFTemperatureError(error, temperature, context = {}) {
    const errorContext = {
      operation: 'hf-temperature',
      temperature,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_TEMPERATURE_FAILED,
      error,
      errorContext
    }
    
    // HF temperature errors are usually non-critical
    console.warn(`HF temperature failed:`, temperature)
  }
  
  // Handle HF texture errors
  function handleHFTextureError(error, texture, context = {}) {
    const errorContext = {
      operation: 'hf-texture',
      texture,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_TEXTURE_FAILED,
      error,
      errorContext
    }
    
    // HF texture errors are usually non-critical
    console.warn(`HF texture failed:`, texture)
  }
  
  // Handle HF pattern errors
  function handleHFPatternError(error, pattern, context = {}) {
    const errorContext = {
      operation: 'hf-pattern',
      pattern,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_PATTERN_FAILED,
      error,
      errorContext
    }
    
    // HF pattern errors are usually non-critical
    console.warn(`HF pattern failed:`, pattern)
  }
  
  // Handle HF intensity errors
  function handleHFIntensityError(error, intensity, context = {}) {
    const errorContext = {
      operation: 'hf-intensity',
      intensity,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_INTENSITY_FAILED,
      error,
      errorContext
    }
    
    // HF intensity errors are usually non-critical
    console.warn(`HF intensity failed:`, intensity)
  }
  
  // Handle HF duration errors
  function handleHFDurationError(error, duration, context = {}) {
    const errorContext = {
      operation: 'hf-duration',
      duration,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_DURATION_FAILED,
      error,
      errorContext
    }
    
    // HF duration errors are usually non-critical
    console.warn(`HF duration failed:`, duration)
  }
  
  // Handle HF frequency errors
  function handleHFFrequencyError(error, frequency, context = {}) {
    const errorContext = {
      operation: 'hf-frequency',
      frequency,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_FREQUENCY_FAILED,
      error,
      errorContext
    }
    
    // HF frequency errors are usually non-critical
    console.warn(`HF frequency failed:`, frequency)
  }
  
  // Handle HF amplitude errors
  function handleHFAmplitudeError(error, amplitude, context = {}) {
    const errorContext = {
      operation: 'hf-amplitude',
      amplitude,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_AMPLITUDE_FAILED,
      error,
      errorContext
    }
    
    // HF amplitude errors are usually non-critical
    console.warn(`HF amplitude failed:`, amplitude)
  }
  
  // Handle HF calibration errors
  function handleHFCalibrationError(error, calibration, context = {}) {
    const errorContext = {
      operation: 'hf-calibration',
      calibration,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_CALIBRATION_FAILED,
      error,
      errorContext
    }
    
    // HF calibration errors are usually non-critical
    console.warn(`HF calibration failed:`, calibration)
  }
  
  // Handle HF sync errors
  function handleHFSyncError(error, sync, context = {}) {
    const errorContext = {
      operation: 'hf-sync',
      sync,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_SYNC_FAILED,
      error,
      errorContext
    }
    
    // HF sync errors are usually non-critical
    console.warn(`HF sync failed:`, sync)
  }
  
  // Handle HF permission errors
  function handleHFPermissionError(error, permission, context = {}) {
    const errorContext = {
      operation: 'hf-permission',
      permission,
      ...context
    }
    
    errorHandling.addError(
      HAPTIC_FEEDBACK_ERRORS.HF_PERMISSION_FAILED,
      error,
      errorContext
    }
    
    // HF permission errors are usually non-critical
    console.warn(`HF permission failed:`, permission)
  }
  
  // Execute HF operation with error handling
  async function executeHFOperation(operation, operationFunction, context = {}) {
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
  
  // Get HF error summary
  function getHFErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add HF specific analysis
    summary.hfErrors = {
      deviceErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_DEVICE_FAILED] || 0,
      sensorErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_SENSOR_FAILED] || 0,
      actuatorErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_ACTUATOR_FAILED] || 0,
      vibrationErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_VIBRATION_FAILED] || 0,
      forceErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_FORCE_FAILED] || 0,
      pressureErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_PRESSURE_FAILED] || 0,
      temperatureErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_TEMPERATURE_FAILED] || 0,
      textureErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_TEXTURE_FAILED] || 0,
      patternErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_PATTERN_FAILED] || 0,
      intensityErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_INTENSITY_FAILED] || 0,
      durationErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_DURATION_FAILED] || 0,
      frequencyErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_FREQUENCY_FAILED] || 0,
      amplitudeErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_AMPLITUDE_FAILED] || 0,
      calibrationErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_CALIBRATION_FAILED] || 0,
      syncErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_SYNC_FAILED] || 0,
      permissionErrors: summary.errorTypes[HAPTIC_FEEDBACK_ERRORS.HF_PERMISSION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear HF errors
  function clearHFErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // HF specific methods
    handleHFDeviceError,
    handleHFSensorError,
    handleHFActuatorError,
    handleHFVibrationError,
    handleHFForceError,
    handleHFPressureError,
    handleHFTemperatureError,
    handleHFTextureError,
    handleHFPatternError,
    handleHFIntensityError,
    handleHFDurationError,
    handleHFFrequencyError,
    handleHFAmplitudeError,
    handleHFCalibrationError,
    handleHFSyncError,
    handleHFPermissionError,
    
    // Utility methods
    executeHFOperation,
    getHFErrorSummary,
    clearHFErrors,
    
    // Constants
    HAPTIC_FEEDBACK_ERRORS
  }
}


