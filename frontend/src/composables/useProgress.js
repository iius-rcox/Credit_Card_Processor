import { ref, computed, onUnmounted } from 'vue'
import { useApi } from './useApi.js'

/**
 * Progress tracking composable for monitoring processing status
 * Provides polling functionality and progress state management
 */
export function useProgress() {
  const { getProcessingStatus } = useApi()

  const isPolling = ref(false)
  const pollingInterval = ref(null)
  const progress = ref(0)
  const status = ref('idle')
  const message = ref('')
  const error = ref(null)
  const lastUpdated = ref(null)

  // Polling configuration
  const DEFAULT_POLLING_INTERVAL = 2000 // 2 seconds
  const MAX_POLLING_ATTEMPTS = 300 // 10 minutes at 2-second intervals
  const BACKOFF_MULTIPLIER = 1.5 // Increase interval on errors

  let pollingAttempts = 0
  let currentInterval = DEFAULT_POLLING_INTERVAL

  /**
   * Starts polling for processing status
   * @param {string} sessionId - Session to monitor
   * @param {number} intervalMs - Polling interval in milliseconds
   */
  function startPolling(sessionId, intervalMs = DEFAULT_POLLING_INTERVAL) {
    if (isPolling.value) {
      stopPolling()
    }

    isPolling.value = true
    pollingAttempts = 0
    currentInterval = intervalMs
    error.value = null

    const poll = async () => {
      try {
        pollingAttempts++

        const response = await getProcessingStatus(sessionId)
        updateProgress(response)

        // Reset interval on successful request
        currentInterval = intervalMs

        // Stop polling if processing is complete or failed
        if (['completed', 'error', 'cancelled'].includes(response.status)) {
          stopPolling()
          return
        }

        // Stop if we've exceeded max attempts
        if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
          error.value = 'Polling timeout - maximum attempts reached'
          stopPolling()
          return
        }

        // Continue polling
        if (isPolling.value) {
          pollingInterval.value = setTimeout(poll, currentInterval)
        }
      } catch (err) {
        console.warn('Polling error:', err.message)

        // Implement exponential backoff on errors
        currentInterval = Math.min(currentInterval * BACKOFF_MULTIPLIER, 30000) // Max 30 seconds

        // Stop polling after too many failures
        if (pollingAttempts >= 10) {
          error.value = `Polling failed: ${err.message}`
          stopPolling()
          return
        }

        // Retry with backoff
        if (isPolling.value) {
          pollingInterval.value = setTimeout(poll, currentInterval)
        }
      }
    }

    // Start polling immediately
    poll()
  }

  /**
   * Stops polling for processing status
   */
  function stopPolling() {
    isPolling.value = false
    if (pollingInterval.value) {
      clearTimeout(pollingInterval.value)
      pollingInterval.value = null
    }
    pollingAttempts = 0
    currentInterval = DEFAULT_POLLING_INTERVAL
  }

  /**
   * Updates progress state from backend response
   * @param {Object} response - Status response from backend
   */
  function updateProgress(response) {
    status.value = response.status || 'idle'
    progress.value = response.progress || 0
    message.value = response.message || ''
    lastUpdated.value = new Date()

    if (response.error) {
      error.value = response.error
    }
  }

  /**
   * Manually fetches progress for a session (single request)
   * @param {string} sessionId - Session to check
   * @returns {Promise<Object>}
   */
  async function fetchProgress(sessionId) {
    try {
      const response = await getProcessingStatus(sessionId)
      updateProgress(response)
      return response
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Resets progress state to initial values
   */
  function resetProgress() {
    stopPolling()
    progress.value = 0
    status.value = 'idle'
    message.value = ''
    error.value = null
    lastUpdated.value = null
  }

  // Computed properties
  const isProcessing = computed(() => {
    return ['uploading', 'processing', 'extracting', 'analyzing'].includes(
      status.value
    )
  })

  const isComplete = computed(() => status.value === 'completed')
  const hasError = computed(() => !!error.value || status.value === 'error')
  const progressPercentage = computed(() =>
    Math.max(0, Math.min(100, progress.value))
  )

  const statusLabel = computed(() => {
    const labels = {
      idle: 'Ready',
      uploading: 'Uploading files...',
      processing: 'Processing documents...',
      extracting: 'Extracting data...',
      analyzing: 'Analyzing results...',
      completed: 'Processing complete',
      error: 'Processing failed',
      cancelled: 'Processing cancelled',
    }
    return labels[status.value] || status.value
  })

  const progressColor = computed(() => {
    if (hasError.value) return 'bg-red-500'
    if (isComplete.value) return 'bg-green-500'
    if (isProcessing.value) return 'bg-blue-500'
    return 'bg-gray-300'
  })

  const estimatedTimeRemaining = computed(() => {
    if (!isProcessing.value || progress.value === 0) return null

    const elapsed = lastUpdated.value
      ? Date.now() - lastUpdated.value.getTime()
      : 0
    const rate = progress.value / elapsed
    const remaining = (100 - progress.value) / rate

    if (!isFinite(remaining) || remaining <= 0) return null

    const seconds = Math.round(remaining / 1000)
    if (seconds < 60) return `${seconds}s remaining`

    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m remaining`

    const hours = Math.round(minutes / 60)
    return `${hours}h remaining`
  })

  // Cleanup on component unmount
  onUnmounted(() => {
    stopPolling()
  })

  return {
    // State
    isPolling,
    progress,
    status,
    message,
    error,
    lastUpdated,

    // Computed
    isProcessing,
    isComplete,
    hasError,
    progressPercentage,
    statusLabel,
    progressColor,
    estimatedTimeRemaining,

    // Methods
    startPolling,
    stopPolling,
    updateProgress,
    fetchProgress,
    resetProgress,

    // Constants
    DEFAULT_POLLING_INTERVAL,
    MAX_POLLING_ATTEMPTS,
  }
}
