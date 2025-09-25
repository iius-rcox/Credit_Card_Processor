import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useSpeechRecognitionErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Speech recognition specific error types
  const SPEECH_RECOGNITION_ERRORS = {
    SR_AUDIO_FAILED: 'sr-audio-failed',
    SR_MICROPHONE_FAILED: 'sr-microphone-failed',
    SR_PROCESSING_FAILED: 'sr-processing-failed',
    SR_RECOGNITION_FAILED: 'sr-recognition-failed',
    SR_TRANSCRIPTION_FAILED: 'sr-transcription-failed',
    SR_LANGUAGE_FAILED: 'sr-language-failed',
    SR_ACCENT_FAILED: 'sr-accent-failed',
    SR_NOISE_FAILED: 'sr-noise-failed',
    SR_QUALITY_FAILED: 'sr-quality-failed',
    SR_LATENCY_FAILED: 'sr-latency-failed',
    SR_BANDWIDTH_FAILED: 'sr-bandwidth-failed',
    SR_NETWORK_FAILED: 'sr-network-failed',
    SR_SERVER_FAILED: 'sr-server-failed',
    SR_MODEL_FAILED: 'sr-model-failed',
    SR_CONFIGURATION_FAILED: 'sr-configuration-failed',
    SR_PERMISSION_FAILED: 'sr-permission-failed'
  }
  
  // Handle SR audio errors
  function handleSRAudioError(error, audio, context = {}) {
    const errorContext = {
      operation: 'sr-audio',
      audio,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_AUDIO_FAILED,
      error,
      errorContext
    }
    
    // SR audio errors are usually non-critical
    console.warn(`SR audio failed:`, audio)
  }
  
  // Handle SR microphone errors
  function handleSRMicrophoneError(error, microphone, context = {}) {
    const errorContext = {
      operation: 'sr-microphone',
      microphone,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_MICROPHONE_FAILED,
      error,
      errorContext
    }
    
    // SR microphone errors are usually non-critical
    console.warn(`SR microphone failed:`, microphone)
  }
  
  // Handle SR processing errors
  function handleSRProcessingError(error, processing, context = {}) {
    const errorContext = {
      operation: 'sr-processing',
      processing,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_PROCESSING_FAILED,
      error,
      errorContext
    }
    
    // SR processing errors are usually non-critical
    console.warn(`SR processing failed:`, processing)
  }
  
  // Handle SR recognition errors
  function handleSRRecognitionError(error, recognition, context = {}) {
    const errorContext = {
      operation: 'sr-recognition',
      recognition,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_RECOGNITION_FAILED,
      error,
      errorContext
    }
    
    // SR recognition errors are usually non-critical
    console.warn(`SR recognition failed:`, recognition)
  }
  
  // Handle SR transcription errors
  function handleSRTranscriptionError(error, transcription, context = {}) {
    const errorContext = {
      operation: 'sr-transcription',
      transcription,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_TRANSCRIPTION_FAILED,
      error,
      errorContext
    }
    
    // SR transcription errors are usually non-critical
    console.warn(`SR transcription failed:`, transcription)
  }
  
  // Handle SR language errors
  function handleSRLanguageError(error, language, context = {}) {
    const errorContext = {
      operation: 'sr-language',
      language,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_LANGUAGE_FAILED,
      error,
      errorContext
    }
    
    // SR language errors are usually non-critical
    console.warn(`SR language failed:`, language)
  }
  
  // Handle SR accent errors
  function handleSRAccentError(error, accent, context = {}) {
    const errorContext = {
      operation: 'sr-accent',
      accent,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_ACCENT_FAILED,
      error,
      errorContext
    }
    
    // SR accent errors are usually non-critical
    console.warn(`SR accent failed:`, accent)
  }
  
  // Handle SR noise errors
  function handleSRNoiseError(error, noise, context = {}) {
    const errorContext = {
      operation: 'sr-noise',
      noise,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_NOISE_FAILED,
      error,
      errorContext
    }
    
    // SR noise errors are usually non-critical
    console.warn(`SR noise failed:`, noise)
  }
  
  // Handle SR quality errors
  function handleSRQualityError(error, quality, context = {}) {
    const errorContext = {
      operation: 'sr-quality',
      quality,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_QUALITY_FAILED,
      error,
      errorContext
    }
    
    // SR quality errors are usually non-critical
    console.warn(`SR quality failed:`, quality)
  }
  
  // Handle SR latency errors
  function handleSRLatencyError(error, latency, context = {}) {
    const errorContext = {
      operation: 'sr-latency',
      latency,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_LATENCY_FAILED,
      error,
      errorContext
    }
    
    // SR latency errors are usually non-critical
    console.warn(`SR latency failed:`, latency)
  }
  
  // Handle SR bandwidth errors
  function handleSRBandwidthError(error, bandwidth, context = {}) {
    const errorContext = {
      operation: 'sr-bandwidth',
      bandwidth,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_BANDWIDTH_FAILED,
      error,
      errorContext
    }
    
    // SR bandwidth errors are usually non-critical
    console.warn(`SR bandwidth failed:`, bandwidth)
  }
  
  // Handle SR network errors
  function handleSRNetworkError(error, network, context = {}) {
    const errorContext = {
      operation: 'sr-network',
      network,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_NETWORK_FAILED,
      error,
      errorContext
    }
    
    // SR network errors are usually non-critical
    console.warn(`SR network failed:`, network)
  }
  
  // Handle SR server errors
  function handleSRServerError(error, server, context = {}) {
    const errorContext = {
      operation: 'sr-server',
      server,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_SERVER_FAILED,
      error,
      errorContext
    }
    
    // SR server errors are usually non-critical
    console.warn(`SR server failed:`, server)
  }
  
  // Handle SR model errors
  function handleSRModelError(error, model, context = {}) {
    const errorContext = {
      operation: 'sr-model',
      model,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_MODEL_FAILED,
      error,
      errorContext
    }
    
    // SR model errors are usually non-critical
    console.warn(`SR model failed:`, model)
  }
  
  // Handle SR configuration errors
  function handleSRConfigurationError(error, configuration, context = {}) {
    const errorContext = {
      operation: 'sr-configuration',
      configuration,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_CONFIGURATION_FAILED,
      error,
      errorContext
    }
    
    // SR configuration errors are usually non-critical
    console.warn(`SR configuration failed:`, configuration)
  }
  
  // Handle SR permission errors
  function handleSRPermissionError(error, permission, context = {}) {
    const errorContext = {
      operation: 'sr-permission',
      permission,
      ...context
    }
    
    errorHandling.addError(
      SPEECH_RECOGNITION_ERRORS.SR_PERMISSION_FAILED,
      error,
      errorContext
    }
    
    // SR permission errors are usually non-critical
    console.warn(`SR permission failed:`, permission)
  }
  
  // Execute SR operation with error handling
  async function executeSROperation(operation, operationFunction, context = {}) {
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
  
  // Get SR error summary
  function getSRErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add SR specific analysis
    summary.srErrors = {
      audioErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_AUDIO_FAILED] || 0,
      microphoneErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_MICROPHONE_FAILED] || 0,
      processingErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_PROCESSING_FAILED] || 0,
      recognitionErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_RECOGNITION_FAILED] || 0,
      transcriptionErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_TRANSCRIPTION_FAILED] || 0,
      languageErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_LANGUAGE_FAILED] || 0,
      accentErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_ACCENT_FAILED] || 0,
      noiseErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_NOISE_FAILED] || 0,
      qualityErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_QUALITY_FAILED] || 0,
      latencyErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_LATENCY_FAILED] || 0,
      bandwidthErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_BANDWIDTH_FAILED] || 0,
      networkErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_NETWORK_FAILED] || 0,
      serverErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_SERVER_FAILED] || 0,
      modelErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_MODEL_FAILED] || 0,
      configurationErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_CONFIGURATION_FAILED] || 0,
      permissionErrors: summary.errorTypes[SPEECH_RECOGNITION_ERRORS.SR_PERMISSION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear SR errors
  function clearSRErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // SR specific methods
    handleSRAudioError,
    handleSRMicrophoneError,
    handleSRProcessingError,
    handleSRRecognitionError,
    handleSRTranscriptionError,
    handleSRLanguageError,
    handleSRAccentError,
    handleSRNoiseError,
    handleSRQualityError,
    handleSRLatencyError,
    handleSRBandwidthError,
    handleSRNetworkError,
    handleSRServerError,
    handleSRModelError,
    handleSRConfigurationError,
    handleSRPermissionError,
    
    // Utility methods
    executeSROperation,
    getSRErrorSummary,
    clearSRErrors,
    
    // Constants
    SPEECH_RECOGNITION_ERRORS
  }
}








