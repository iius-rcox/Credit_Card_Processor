import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useTextToSpeechErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Text-to-speech specific error types
  const TEXT_TO_SPEECH_ERRORS = {
    TTS_AUDIO_FAILED: 'tts-audio-failed',
    TTS_SPEAKER_FAILED: 'tts-speaker-failed',
    TTS_SYNTHESIS_FAILED: 'tts-synthesis-failed',
    TTS_VOICE_FAILED: 'tts-voice-failed',
    TTS_LANGUAGE_FAILED: 'tts-language-failed',
    TTS_ACCENT_FAILED: 'tts-accent-failed',
    TTS_SPEED_FAILED: 'tts-speed-failed',
    TTS_PITCH_FAILED: 'tts-pitch-failed',
    TTS_VOLUME_FAILED: 'tts-volume-failed',
    TTS_QUALITY_FAILED: 'tts-quality-failed',
    TTS_LATENCY_FAILED: 'tts-latency-failed',
    TTS_BANDWIDTH_FAILED: 'tts-bandwidth-failed',
    TTS_NETWORK_FAILED: 'tts-network-failed',
    TTS_SERVER_FAILED: 'tts-server-failed',
    TTS_MODEL_FAILED: 'tts-model-failed',
    TTS_CONFIGURATION_FAILED: 'tts-configuration-failed'
  }
  
  // Handle TTS audio errors
  function handleTTSAudioError(error, audio, context = {}) {
    const errorContext = {
      operation: 'tts-audio',
      audio,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_AUDIO_FAILED,
      error,
      errorContext
    }
    
    // TTS audio errors are usually non-critical
    console.warn(`TTS audio failed:`, audio)
  }
  
  // Handle TTS speaker errors
  function handleTTSSpeakerError(error, speaker, context = {}) {
    const errorContext = {
      operation: 'tts-speaker',
      speaker,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_SPEAKER_FAILED,
      error,
      errorContext
    }
    
    // TTS speaker errors are usually non-critical
    console.warn(`TTS speaker failed:`, speaker)
  }
  
  // Handle TTS synthesis errors
  function handleTTSSynthesisError(error, synthesis, context = {}) {
    const errorContext = {
      operation: 'tts-synthesis',
      synthesis,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_SYNTHESIS_FAILED,
      error,
      errorContext
    }
    
    // TTS synthesis errors are usually non-critical
    console.warn(`TTS synthesis failed:`, synthesis)
  }
  
  // Handle TTS voice errors
  function handleTTSVoiceError(error, voice, context = {}) {
    const errorContext = {
      operation: 'tts-voice',
      voice,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_VOICE_FAILED,
      error,
      errorContext
    }
    
    // TTS voice errors are usually non-critical
    console.warn(`TTS voice failed:`, voice)
  }
  
  // Handle TTS language errors
  function handleTTSLanguageError(error, language, context = {}) {
    const errorContext = {
      operation: 'tts-language',
      language,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_LANGUAGE_FAILED,
      error,
      errorContext
    }
    
    // TTS language errors are usually non-critical
    console.warn(`TTS language failed:`, language)
  }
  
  // Handle TTS accent errors
  function handleTTSAccentError(error, accent, context = {}) {
    const errorContext = {
      operation: 'tts-accent',
      accent,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_ACCENT_FAILED,
      error,
      errorContext
    }
    
    // TTS accent errors are usually non-critical
    console.warn(`TTS accent failed:`, accent)
  }
  
  // Handle TTS speed errors
  function handleTTSSpeedError(error, speed, context = {}) {
    const errorContext = {
      operation: 'tts-speed',
      speed,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_SPEED_FAILED,
      error,
      errorContext
    }
    
    // TTS speed errors are usually non-critical
    console.warn(`TTS speed failed:`, speed)
  }
  
  // Handle TTS pitch errors
  function handleTTSPitchError(error, pitch, context = {}) {
    const errorContext = {
      operation: 'tts-pitch',
      pitch,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_PITCH_FAILED,
      error,
      errorContext
    }
    
    // TTS pitch errors are usually non-critical
    console.warn(`TTS pitch failed:`, pitch)
  }
  
  // Handle TTS volume errors
  function handleTTSVolumeError(error, volume, context = {}) {
    const errorContext = {
      operation: 'tts-volume',
      volume,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_VOLUME_FAILED,
      error,
      errorContext
    }
    
    // TTS volume errors are usually non-critical
    console.warn(`TTS volume failed:`, volume)
  }
  
  // Handle TTS quality errors
  function handleTTSQualityError(error, quality, context = {}) {
    const errorContext = {
      operation: 'tts-quality',
      quality,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_QUALITY_FAILED,
      error,
      errorContext
    }
    
    // TTS quality errors are usually non-critical
    console.warn(`TTS quality failed:`, quality)
  }
  
  // Handle TTS latency errors
  function handleTTSLatencyError(error, latency, context = {}) {
    const errorContext = {
      operation: 'tts-latency',
      latency,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_LATENCY_FAILED,
      error,
      errorContext
    }
    
    // TTS latency errors are usually non-critical
    console.warn(`TTS latency failed:`, latency)
  }
  
  // Handle TTS bandwidth errors
  function handleTTSBandwidthError(error, bandwidth, context = {}) {
    const errorContext = {
      operation: 'tts-bandwidth',
      bandwidth,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_BANDWIDTH_FAILED,
      error,
      errorContext
    }
    
    // TTS bandwidth errors are usually non-critical
    console.warn(`TTS bandwidth failed:`, bandwidth)
  }
  
  // Handle TTS network errors
  function handleTTSNetworkError(error, network, context = {}) {
    const errorContext = {
      operation: 'tts-network',
      network,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_NETWORK_FAILED,
      error,
      errorContext
    }
    
    // TTS network errors are usually non-critical
    console.warn(`TTS network failed:`, network)
  }
  
  // Handle TTS server errors
  function handleTTSServerError(error, server, context = {}) {
    const errorContext = {
      operation: 'tts-server',
      server,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_SERVER_FAILED,
      error,
      errorContext
    }
    
    // TTS server errors are usually non-critical
    console.warn(`TTS server failed:`, server)
  }
  
  // Handle TTS model errors
  function handleTTSModelError(error, model, context = {}) {
    const errorContext = {
      operation: 'tts-model',
      model,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_MODEL_FAILED,
      error,
      errorContext
    }
    
    // TTS model errors are usually non-critical
    console.warn(`TTS model failed:`, model)
  }
  
  // Handle TTS configuration errors
  function handleTTSConfigurationError(error, configuration, context = {}) {
    const errorContext = {
      operation: 'tts-configuration',
      configuration,
      ...context
    }
    
    errorHandling.addError(
      TEXT_TO_SPEECH_ERRORS.TTS_CONFIGURATION_FAILED,
      error,
      errorContext
    }
    
    // TTS configuration errors are usually non-critical
    console.warn(`TTS configuration failed:`, configuration)
  }
  
  // Execute TTS operation with error handling
  async function executeTTSOperation(operation, operationFunction, context = {}) {
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
  
  // Get TTS error summary
  function getTTSErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add TTS specific analysis
    summary.ttsErrors = {
      audioErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_AUDIO_FAILED] || 0,
      speakerErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_SPEAKER_FAILED] || 0,
      synthesisErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_SYNTHESIS_FAILED] || 0,
      voiceErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_VOICE_FAILED] || 0,
      languageErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_LANGUAGE_FAILED] || 0,
      accentErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_ACCENT_FAILED] || 0,
      speedErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_SPEED_FAILED] || 0,
      pitchErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_PITCH_FAILED] || 0,
      volumeErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_VOLUME_FAILED] || 0,
      qualityErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_QUALITY_FAILED] || 0,
      latencyErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_LATENCY_FAILED] || 0,
      bandwidthErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_BANDWIDTH_FAILED] || 0,
      networkErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_NETWORK_FAILED] || 0,
      serverErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_SERVER_FAILED] || 0,
      modelErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_MODEL_FAILED] || 0,
      configurationErrors: summary.errorTypes[TEXT_TO_SPEECH_ERRORS.TTS_CONFIGURATION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear TTS errors
  function clearTTSErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // TTS specific methods
    handleTTSAudioError,
    handleTTSSpeakerError,
    handleTTSSynthesisError,
    handleTTSVoiceError,
    handleTTSLanguageError,
    handleTTSAccentError,
    handleTTSSpeedError,
    handleTTSPitchError,
    handleTTSVolumeError,
    handleTTSQualityError,
    handleTTSLatencyError,
    handleTTSBandwidthError,
    handleTTSNetworkError,
    handleTTSServerError,
    handleTTSModelError,
    handleTTSConfigurationError,
    
    // Utility methods
    executeTTSOperation,
    getTTSErrorSummary,
    clearTTSErrors,
    
    // Constants
    TEXT_TO_SPEECH_ERRORS
  }
}








