import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useVoiceRecognitionErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Voice recognition specific error types
  const VOICE_RECOGNITION_ERRORS = {
    VR_AUDIO_FAILED: 'vr-audio-failed',
    VR_MICROPHONE_FAILED: 'vr-microphone-failed',
    VR_PROCESSING_FAILED: 'vr-processing-failed',
    VR_RECOGNITION_FAILED: 'vr-recognition-failed',
    VR_TRANSCRIPTION_FAILED: 'vr-transcription-failed',
    VR_LANGUAGE_FAILED: 'vr-language-failed',
    VR_ACCENT_FAILED: 'vr-accent-failed',
    VR_NOISE_FAILED: 'vr-noise-failed',
    VR_QUALITY_FAILED: 'vr-quality-failed',
    VR_LATENCY_FAILED: 'vr-latency-failed',
    VR_BANDWIDTH_FAILED: 'vr-bandwidth-failed',
    VR_NETWORK_FAILED: 'vr-network-failed',
    VR_SERVER_FAILED: 'vr-server-failed',
    VR_MODEL_FAILED: 'vr-model-failed',
    VR_CONFIGURATION_FAILED: 'vr-configuration-failed',
    VR_PERMISSION_FAILED: 'vr-permission-failed'
  }
  
  // Handle VR audio errors
  function handleVRAudioError(error, audio, context = {}) {
    const errorContext = {
      operation: 'vr-audio',
      audio,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_AUDIO_FAILED,
      error,
      errorContext
    }
    
    // VR audio errors are usually non-critical
    console.warn(`VR audio failed:`, audio)
  }
  
  // Handle VR microphone errors
  function handleVRMicrophoneError(error, microphone, context = {}) {
    const errorContext = {
      operation: 'vr-microphone',
      microphone,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_MICROPHONE_FAILED,
      error,
      errorContext
    }
    
    // VR microphone errors are usually non-critical
    console.warn(`VR microphone failed:`, microphone)
  }
  
  // Handle VR processing errors
  function handleVRProcessingError(error, processing, context = {}) {
    const errorContext = {
      operation: 'vr-processing',
      processing,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_PROCESSING_FAILED,
      error,
      errorContext
    }
    
    // VR processing errors are usually non-critical
    console.warn(`VR processing failed:`, processing)
  }
  
  // Handle VR recognition errors
  function handleVRRecognitionError(error, recognition, context = {}) {
    const errorContext = {
      operation: 'vr-recognition',
      recognition,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_RECOGNITION_FAILED,
      error,
      errorContext
    }
    
    // VR recognition errors are usually non-critical
    console.warn(`VR recognition failed:`, recognition)
  }
  
  // Handle VR transcription errors
  function handleVRTranscriptionError(error, transcription, context = {}) {
    const errorContext = {
      operation: 'vr-transcription',
      transcription,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_TRANSCRIPTION_FAILED,
      error,
      errorContext
    }
    
    // VR transcription errors are usually non-critical
    console.warn(`VR transcription failed:`, transcription)
  }
  
  // Handle VR language errors
  function handleVRLanguageError(error, language, context = {}) {
    const errorContext = {
      operation: 'vr-language',
      language,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_LANGUAGE_FAILED,
      error,
      errorContext
    }
    
    // VR language errors are usually non-critical
    console.warn(`VR language failed:`, language)
  }
  
  // Handle VR accent errors
  function handleVRAccentError(error, accent, context = {}) {
    const errorContext = {
      operation: 'vr-accent',
      accent,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_ACCENT_FAILED,
      error,
      errorContext
    }
    
    // VR accent errors are usually non-critical
    console.warn(`VR accent failed:`, accent)
  }
  
  // Handle VR noise errors
  function handleVRNoiseError(error, noise, context = {}) {
    const errorContext = {
      operation: 'vr-noise',
      noise,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_NOISE_FAILED,
      error,
      errorContext
    }
    
    // VR noise errors are usually non-critical
    console.warn(`VR noise failed:`, noise)
  }
  
  // Handle VR quality errors
  function handleVRQualityError(error, quality, context = {}) {
    const errorContext = {
      operation: 'vr-quality',
      quality,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_QUALITY_FAILED,
      error,
      errorContext
    }
    
    // VR quality errors are usually non-critical
    console.warn(`VR quality failed:`, quality)
  }
  
  // Handle VR latency errors
  function handleVRLatencyError(error, latency, context = {}) {
    const errorContext = {
      operation: 'vr-latency',
      latency,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_LATENCY_FAILED,
      error,
      errorContext
    }
    
    // VR latency errors are usually non-critical
    console.warn(`VR latency failed:`, latency)
  }
  
  // Handle VR bandwidth errors
  function handleVRBandwidthError(error, bandwidth, context = {}) {
    const errorContext = {
      operation: 'vr-bandwidth',
      bandwidth,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_BANDWIDTH_FAILED,
      error,
      errorContext
    }
    
    // VR bandwidth errors are usually non-critical
    console.warn(`VR bandwidth failed:`, bandwidth)
  }
  
  // Handle VR network errors
  function handleVRNetworkError(error, network, context = {}) {
    const errorContext = {
      operation: 'vr-network',
      network,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_NETWORK_FAILED,
      error,
      errorContext
    }
    
    // VR network errors are usually non-critical
    console.warn(`VR network failed:`, network)
  }
  
  // Handle VR server errors
  function handleVRServerError(error, server, context = {}) {
    const errorContext = {
      operation: 'vr-server',
      server,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_SERVER_FAILED,
      error,
      errorContext
    }
    
    // VR server errors are usually non-critical
    console.warn(`VR server failed:`, server)
  }
  
  // Handle VR model errors
  function handleVRModelError(error, model, context = {}) {
    const errorContext = {
      operation: 'vr-model',
      model,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_MODEL_FAILED,
      error,
      errorContext
    }
    
    // VR model errors are usually non-critical
    console.warn(`VR model failed:`, model)
  }
  
  // Handle VR configuration errors
  function handleVRConfigurationError(error, configuration, context = {}) {
    const errorContext = {
      operation: 'vr-configuration',
      configuration,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_CONFIGURATION_FAILED,
      error,
      errorContext
    }
    
    // VR configuration errors are usually non-critical
    console.warn(`VR configuration failed:`, configuration)
  }
  
  // Handle VR permission errors
  function handleVRPermissionError(error, permission, context = {}) {
    const errorContext = {
      operation: 'vr-permission',
      permission,
      ...context
    }
    
    errorHandling.addError(
      VOICE_RECOGNITION_ERRORS.VR_PERMISSION_FAILED,
      error,
      errorContext
    }
    
    // VR permission errors are usually non-critical
    console.warn(`VR permission failed:`, permission)
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
      audioErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_AUDIO_FAILED] || 0,
      microphoneErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_MICROPHONE_FAILED] || 0,
      processingErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_PROCESSING_FAILED] || 0,
      recognitionErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_RECOGNITION_FAILED] || 0,
      transcriptionErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_TRANSCRIPTION_FAILED] || 0,
      languageErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_LANGUAGE_FAILED] || 0,
      accentErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_ACCENT_FAILED] || 0,
      noiseErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_NOISE_FAILED] || 0,
      qualityErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_QUALITY_FAILED] || 0,
      latencyErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_LATENCY_FAILED] || 0,
      bandwidthErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_BANDWIDTH_FAILED] || 0,
      networkErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_NETWORK_FAILED] || 0,
      serverErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_SERVER_FAILED] || 0,
      modelErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_MODEL_FAILED] || 0,
      configurationErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_CONFIGURATION_FAILED] || 0,
      permissionErrors: summary.errorTypes[VOICE_RECOGNITION_ERRORS.VR_PERMISSION_FAILED] || 0
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
    handleVRAudioError,
    handleVRMicrophoneError,
    handleVRProcessingError,
    handleVRRecognitionError,
    handleVRTranscriptionError,
    handleVRLanguageError,
    handleVRAccentError,
    handleVRNoiseError,
    handleVRQualityError,
    handleVRLatencyError,
    handleVRBandwidthError,
    handleVRNetworkError,
    handleVRServerError,
    handleVRModelError,
    handleVRConfigurationError,
    handleVRPermissionError,
    
    // Utility methods
    executeVROperation,
    getVRErrorSummary,
    clearVRErrors,
    
    // Constants
    VOICE_RECOGNITION_ERRORS
  }
}




