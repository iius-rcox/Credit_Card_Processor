import { ref, computed, onUnmounted, watch } from 'vue'
import { useApi } from './useApi.js'
import { useSessionStore } from '@/stores/session'

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
  const sessionStore = useSessionStore()

  const isPolling = ref(false)
  const pollingInterval = ref(null)
  const currentSessionId = ref(null) // Track current session to prevent stale closures
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

  // Progress counters for determinate/indeterminate display
  const totalEmployees = ref(0)
  const completedEmployees = ref(0)
  const readyForExport = ref(0)
  const validEmployees = ref(0)
  const issuesEmployees = ref(0)
  const resolvedEmployees = ref(0)

  const estimatedTimeRemaining = ref(null)
  const recentActivities = ref([])
  const processingStartTime = ref(null)

  // Sync status with real-time WebSocket-driven session store
  // Initialize from store on composable creation
  if (sessionStore?.processingStatus) {
    status.value = sessionStore.processingStatus
  }

  // React to future changes pushed via WebSocket
  watch(
    () => sessionStore.processingStatus,
    (newStatus) => {
      if (!newStatus) return
      status.value = newStatus
      lastUpdated.value = new Date()
      if (newStatus === 'processing' && !processingStartTime.value) {
        processingStartTime.value = new Date()
      }
    },
    { immediate: false }
  )

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
    currentSessionId.value = sessionId // Store current session ID to prevent stale closures
    pollingAttempts = 0
    currentInterval = intervalMs
    error.value = null
    pollingMetrics.value.pollingStartTime = performance.now()

    const poll = async () => {
      // Always use the current session ID to prevent stale closure issues
      const activeSessionId = currentSessionId.value
      if (!activeSessionId || !isPolling.value) {
        return // Stop if session was cleared or polling stopped
      }
      
      const pollStartTime = performance.now()
      
      try {
        pollingAttempts++
        pollingMetrics.value.totalPolls++

        console.log('[Progress Debug] Polling for session:', activeSessionId)
        const response = await getProcessingStatus(activeSessionId)
        console.log('[Progress Debug] Polling response:', response)
        updateProgress(response)
        
        // Track polling performance
        const pollTime = performance.now() - pollStartTime
        pollingMetrics.value.lastPollTime = pollTime
        pollingMetrics.value.averageResponseTime = 
          (pollingMetrics.value.averageResponseTime * (pollingMetrics.value.totalPolls - 1) + pollTime) / 
          pollingMetrics.value.totalPolls
        
        if (pollTime > 1000) { // Mark polls over 1 second as slow
          pollingMetrics.value.slowPolls++
          console.warn(`Slow polling response: ${pollTime.toFixed(2)}ms for session ${activeSessionId}`)
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
    currentSessionId.value = null // Clear session ID to prevent stale closures
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

    console.log('[Progress Debug] Full response received:', response)
    status.value = response.status || 'idle'

    // Update employee counters
    totalEmployees.value = response.total_employees ?? 0
    completedEmployees.value = response.completed_employees ?? 0
    readyForExport.value = response.ready_for_export ?? 0
    validEmployees.value = response.valid_employees ?? 0
    issuesEmployees.value = response.issues_employees ?? 0
    resolvedEmployees.value = response.resolved_employees ?? 0

    // Use backend's percent_complete when available, otherwise calculate from counters
    if (typeof response.percent_complete === 'number' && !isNaN(response.percent_complete)) {
      console.log('[Progress Debug] Backend percent_complete:', response.percent_complete, 'completed:', response.completed_employees, 'total:', response.total_employees)
      progress.value = Math.max(0, Math.min(100, response.percent_complete))
    } else if (totalEmployees.value > 0) {
      // Fallback calculation from counters
      const calculated = Math.max(0, Math.min(100, Math.round((completedEmployees.value / totalEmployees.value) * 100)))
      console.log('[Progress Debug] Calculated progress:', calculated, 'completed:', completedEmployees.value, 'total:', totalEmployees.value)
      progress.value = calculated
    } else {
      console.log('[Progress Debug] No progress data - setting to 0')
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

    // Removed unused currentEmployee and statistics update logic

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
   * Clears error state without resetting other progress data
   */
  function clearError() {
    error.value = null
    if (status.value === 'error') {
      status.value = 'idle'
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
    // Reset additional counters
    readyForExport.value = 0
    validEmployees.value = 0
    issuesEmployees.value = 0
    resolvedEmployees.value = 0
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

  // Progress display logic
  const isIndeterminate = computed(() => {
    // Show indeterminate ONLY when:
    // 1. We're in a processing status AND
    // 2. We have no meaningful progress data (no total AND no progress percentage)
    const isProcessingStatus = ['processing', 'uploading', 'extracting', 'analyzing'].includes(status.value)
    const hasProgressData = totalEmployees.value > 0 || progress.value > 0
    const result = isProcessingStatus && !hasProgressData
    
    console.log('[Progress Debug] isIndeterminate:', result, 'status:', status.value, 'totalEmployees:', totalEmployees.value, 'progress:', progress.value, 'hasProgressData:', hasProgressData)
    return result
  })

  const progressPercentage = computed(() => {
    const percentage = Math.max(0, Math.min(100, progress.value))
    console.log('[Progress Debug] Display percentage:', percentage, 'from progress.value:', progress.value)
    return percentage
  })

  const progressCounters = computed(() => {
    if (totalEmployees.value > 0) {
      // Show actual processed count during processing
      const processedCount = completedEmployees.value || 0
      const readyCount = readyForExport.value || 0
      
      if (status.value === 'completed') {
        // After completion, show both processed and export-ready
        return `${processedCount} of ${totalEmployees.value} processed (${readyCount} ready for export)`
      } else {
        // During processing, show progress
        return `${processedCount} of ${totalEmployees.value} processed`
      }
    } else if (completedEmployees.value > 0) {
      return `${completedEmployees.value} processed (total unknown)`
    } else if (status.value === 'processing') {
      return 'Analyzing documents...'
    } else if (status.value === 'idle') {
      return 'Ready to process'
    } else {
      return ''
    }
  })

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
    
    // Reset counters
    totalEmployees.value = 0
    completedEmployees.value = 0
    readyForExport.value = 0
    validEmployees.value = 0
    issuesEmployees.value = 0
    resolvedEmployees.value = 0
    
    // Clear session info
    sessionInfo.value = {
      session_id: null,
      session_name: null,
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
    // Progress counters
    totalEmployees,
    completedEmployees,
    readyForExport,
    validEmployees,
    issuesEmployees,
    resolvedEmployees,
    estimatedTimeRemaining,
    recentActivities,
    processingStartTime,

    // Computed
    isProcessing,
    isComplete,
    hasError,
    isIndeterminate,
    progressPercentage,
    progressCounters,
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
    clearError,
    
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
