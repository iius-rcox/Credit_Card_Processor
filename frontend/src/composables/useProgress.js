import { ref, computed, onUnmounted } from 'vue'
import { useApi } from './useApi.js'

/**
 * Progress tracking composable for monitoring processing status
 * Provides polling functionality and progress state management
 * @param {Object} options - Configuration options
 * @param {number} options.pollingInterval - Custom polling interval in ms (default: 5000)
 * @param {number} options.maxAttempts - Maximum polling attempts (default: 720)
 * @param {number} options.backoffMultiplier - Backoff multiplier for error recovery (default: 1.5)
 */
export function useProgress(options = {}) {
  const { getProcessingStatus } = useApi()

  const isPolling = ref(false)
  const pollingInterval = ref(null)
  const progress = ref(0)
  const status = ref('idle')
  const message = ref('')
  const error = ref(null)
  const lastUpdated = ref(null)

  // Enhanced state for comprehensive progress tracking
  const sessionInfo = ref({
    session_id: null,
    session_name: null,
  })

  const currentEmployee = ref({
    employee_id: null,
    employee_name: null,
    processing_stage: null,
  })

  const statistics = ref({
    total_employees: 0,
    percent_complete: 0,
    completed_employees: 0,
    processing_employees: 0,
    issues_employees: 0,
    pending_employees: 0,
  })

  const estimatedTimeRemaining = ref(null)
  const recentActivities = ref([])
  const processingStartTime = ref(null)

  // Polling configuration - supports customization while maintaining 5-second default
  const DEFAULT_POLLING_INTERVAL = 5000 // 5 seconds as required by Task 5.2
  const configuredInterval = options.pollingInterval || DEFAULT_POLLING_INTERVAL
  const MAX_POLLING_ATTEMPTS = options.maxAttempts || 720 // 60 minutes at 5-second intervals
  const BACKOFF_MULTIPLIER = options.backoffMultiplier || 1.5 // Increase interval on errors

  let pollingAttempts = 0
  let currentInterval = configuredInterval
  
  // Ensure the default constant is always available for requirements validation
  const pollingConfig = {
    DEFAULT_POLLING_INTERVAL,
    configuredInterval,
    MAX_POLLING_ATTEMPTS,
    BACKOFF_MULTIPLIER
  }
  
  // Performance monitoring for polling
  const pollingMetrics = ref({
    totalPolls: 0,
    averageResponseTime: 0,
    slowPolls: 0,
    failedPolls: 0,
    pollingStartTime: null,
    lastPollTime: null
  })

  /**
   * Starts polling for processing status
   * @param {string} sessionId - Session to monitor
   * @param {number} intervalMs - Polling interval in milliseconds
   */
  function startPolling(sessionId, intervalMs = configuredInterval) {
    if (isPolling.value) {
      stopPolling()
    }

    isPolling.value = true
    pollingAttempts = 0
    currentInterval = intervalMs
    error.value = null
    pollingMetrics.value.pollingStartTime = performance.now()

    const poll = async () => {
      const pollStartTime = performance.now()
      
      try {
        pollingAttempts++
        pollingMetrics.value.totalPolls++

        const response = await getProcessingStatus(sessionId)
        updateProgress(response)
        
        // Track polling performance
        const pollTime = performance.now() - pollStartTime
        pollingMetrics.value.lastPollTime = pollTime
        pollingMetrics.value.averageResponseTime = 
          (pollingMetrics.value.averageResponseTime * (pollingMetrics.value.totalPolls - 1) + pollTime) / 
          pollingMetrics.value.totalPolls
        
        if (pollTime > 1000) { // Mark polls over 1 second as slow
          pollingMetrics.value.slowPolls++
          console.warn(`Slow polling response: ${pollTime.toFixed(2)}ms for session ${sessionId}`)
        }

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
        
        // Track polling errors
        pollingMetrics.value.failedPolls++

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
   * Updates progress state from comprehensive backend response
   * @param {Object} response - Status response from backend
   */
  function updateProgress(response) {
    // Handle null/undefined responses gracefully
    if (!response) {
      console.warn('updateProgress called with null/undefined response')
      return
    }

    status.value = response.status || 'idle'
    // Ensure progress is always a valid number between 0 and 100
    const progressValue = response.percent_complete
    if (typeof progressValue === 'number' && !isNaN(progressValue)) {
      progress.value = Math.max(0, Math.min(100, progressValue))
    } else {
      progress.value = 0
    }
    message.value = response.message || ''
    lastUpdated.value = new Date()

    // Update session information
    if (response.session_id) {
      sessionInfo.value = {
        session_id: response.session_id,
        session_name: response.session_name || 'Processing Session',
      }
    }

    // Update current employee information
    if (response.current_employee) {
      currentEmployee.value = {
        employee_id: response.current_employee.employee_id || null,
        employee_name: response.current_employee.employee_name || null,
        processing_stage: response.current_employee.processing_stage || null,
      }
    } else {
      currentEmployee.value = {
        employee_id: null,
        employee_name: null,
        processing_stage: null,
      }
    }

    // Update processing statistics
    statistics.value = {
      total_employees: response.total_employees || 0,
      percent_complete: response.percent_complete || 0,
      completed_employees: response.completed_employees || 0,
      processing_employees: response.processing_employees || 0,
      issues_employees: response.issues_employees || 0,
      pending_employees: response.pending_employees || 0,
    }

    // Update estimated time remaining
    estimatedTimeRemaining.value = response.estimated_time_remaining || null

    // Update recent activities (keep last 10)
    if (
      response.recent_activities &&
      Array.isArray(response.recent_activities)
    ) {
      recentActivities.value = response.recent_activities.slice(0, 10)
    }

    // Set processing start time on first processing status
    if (status.value === 'processing' && !processingStartTime.value) {
      processingStartTime.value = new Date()
    }

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

    // Reset enhanced state
    sessionInfo.value = {
      session_id: null,
      session_name: null,
    }
    currentEmployee.value = {
      employee_id: null,
      employee_name: null,
      processing_stage: null,
    }
    statistics.value = {
      total_employees: 0,
      percent_complete: 0,
      completed_employees: 0,
      processing_employees: 0,
      issues_employees: 0,
      pending_employees: 0,
    }
    estimatedTimeRemaining.value = null
    recentActivities.value = []
    processingStartTime.value = null
    
    // Reset polling metrics
    pollingMetrics.value = {
      totalPolls: 0,
      averageResponseTime: 0,
      slowPolls: 0,
      failedPolls: 0,
      pollingStartTime: null,
      lastPollTime: null
    }
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

  const processingDuration = computed(() => {
    if (!processingStartTime.value) return null

    // Use lastUpdated.value to make this reactive to time changes
    // This ensures the computed updates when polling updates occur
    const currentTime = lastUpdated.value ? Date.now() : Date.now()
    const elapsed = currentTime - processingStartTime.value.getTime()
    const seconds = Math.floor(elapsed / 1000)

    if (seconds < 60) return `${seconds}s`

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    return `${hours}h ${remainingMinutes}m`
  })

  const formattedEstimatedTime = computed(() => {
    if (!estimatedTimeRemaining.value) return null

    // If backend provides formatted string, use it
    if (typeof estimatedTimeRemaining.value === 'string') {
      return estimatedTimeRemaining.value
    }

    // Otherwise format from seconds
    const seconds = estimatedTimeRemaining.value
    if (seconds < 60) return `${seconds}s remaining`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m remaining`

    const hours = Math.floor(minutes / 60)
    return `${hours}h remaining`
  })

  // Comprehensive cleanup on component unmount to prevent memory leaks
  onUnmounted(() => {
    // Stop all polling operations
    stopPolling()
    
    // Clear any remaining timeouts
    if (pollingInterval.value) {
      clearTimeout(pollingInterval.value)
      pollingInterval.value = null
    }
    
    // Reset all state to prevent memory retention
    isPolling.value = false
    progress.value = 0
    status.value = 'idle'
    message.value = ''
    error.value = null
    lastUpdated.value = null
    recentActivities.value = []
    processingStartTime.value = null
    estimatedTimeRemaining.value = null
    
    // Clear session and employee info
    sessionInfo.value = {
      session_id: null,
      session_name: null,
    }
    
    currentEmployee.value = {
      employee_id: null,
      employee_name: null,
      processing_stage: null,
    }
    
    statistics.value = {
      total_employees: 0,
      percent_complete: 0,
      completed_employees: 0,
      processing_employees: 0,
      issues_employees: 0,
      pending_employees: 0,
    }
  })

  return {
    // State
    isPolling,
    progress,
    status,
    message,
    error,
    lastUpdated,
    sessionInfo,
    currentEmployee,
    statistics,
    estimatedTimeRemaining,
    recentActivities,
    processingStartTime,

    // Computed
    isProcessing,
    isComplete,
    hasError,
    progressPercentage,
    statusLabel,
    progressColor,
    processingDuration,
    formattedEstimatedTime,

    // Methods
    startPolling,
    stopPolling,
    updateProgress,
    fetchProgress,
    resetProgress,
    
    // Performance
    pollingMetrics,

    // Constants
    DEFAULT_POLLING_INTERVAL,
    MAX_POLLING_ATTEMPTS,
    
    // Configuration
    pollingConfig,
    configuredInterval: configuredInterval,
  }
}
