import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

/**
 * Complete Pinia store for Credit Card Processor application
 * Handles authentication, sessions, uploads, processing, and results with 5-second polling
 *
 * @typedef {Object} User
 * @property {string} id - User identifier
 * @property {string} username - Username
 * @property {string} email - User email
 * @property {boolean} isAdmin - Admin privileges flag
 * @property {string} department - User department
 *
 * @typedef {Object} FileItem
 * @property {string|number} id - Unique identifier for the file
 * @property {string} name - Original filename
 * @property {number} [size] - File size in bytes
 * @property {string} [type] - MIME type of the file
 * @property {string} status - Upload status
 * @property {number} progress - Upload progress percentage
 * @property {string} [error] - Upload error message
 *
 * @typedef {Object} Session
 * @property {string} session_id - Session identifier
 * @property {string} session_name - Human readable session name
 * @property {string} status - Session status
 * @property {string} created_at - Creation timestamp
 * @property {string} created_by - Creator username
 * @property {Object} processing_options - Processing configuration
 * @property {Array} uploaded_files - Files in session
 * @property {Object} session_summary - Processing summary
 *
 * @typedef {Object} ProcessingResults
 * @property {Array} transactions - Extracted credit card transactions
 * @property {Array} employees - Employee data with validation status
 * @property {Object} session_summary - Processing summary statistics
 * @property {Array} activities - Processing activity log
 * @property {Array} [errors] - Any processing errors encountered
 */

// Constants for status polling
const POLLING_INTERVAL = 5000 // 5 seconds
const POLLING_STATUSES = ['processing', 'uploading', 'validating']
export const useSessionStore = defineStore('session', () => {
  // Initialize API composable
  const api = useApi()

  // Authentication State
  /** @type {import('vue').Ref<User|null>} Current authenticated user */
  const user = ref(null)
  /** @type {import('vue').Ref<boolean>} Authentication status */
  const isAuthenticated = ref(false)
  /** @type {import('vue').Ref<boolean>} Admin privileges */
  const isAdmin = ref(false)
  /** @type {import('vue').Ref<boolean>} Authentication loading state */
  const authLoading = ref(false)
  /** @type {import('vue').Ref<string|null>} Authentication error */
  const authError = ref(null)

  // Session Management State
  /** @type {import('vue').Ref<string|null>} Current session identifier */
  const sessionId = ref(null)
  /** @type {import('vue').Ref<Array<Session>>} All user sessions */
  const sessions = ref([])
  /** @type {import('vue').Ref<Session|null>} Current active session */
  const currentSession = ref(null)
  /** @type {import('vue').Ref<boolean>} Session loading state */
  const sessionLoading = ref(false)
  /** @type {import('vue').Ref<string|null>} Session error */
  const sessionError = ref(null)

  // Upload State
  /** @type {import('vue').Ref<FileItem[]>} Array of uploaded files in the session */
  const uploadedFiles = ref([])
  /** @type {import('vue').Ref<Object>} Upload progress by file ID */
  const uploadProgress = ref({})
  /** @type {import('vue').Ref<Object>} Upload errors by file ID */
  const uploadErrors = ref({})
  /** @type {import('vue').Ref<boolean>} Upload loading state */
  const uploadLoading = ref(false)

  // Processing State
  /** @type {import('vue').Ref<'idle'|'uploading'|'processing'|'validating'|'completed'|'error'|'paused'|'cancelled'>} Current processing status */
  const status = ref('idle')
  /** @type {import('vue').Ref<number>} Processing progress percentage */
  const progress = ref(0)
  /** @type {import('vue').Ref<Array>} Processing activity log */
  const activities = ref([])
  /** @type {import('vue').Ref<Array>} Employee data with validation status */
  const employees = ref([])
  /** @type {import('vue').Ref<boolean>} Processing loading state */
  const processLoading = ref(false)
  /** @type {import('vue').Ref<string|null>} Processing error */
  const processError = ref(null)

  // Results State
  /** @type {import('vue').Ref<ProcessingResults|null>} Processing results from the backend */
  const results = ref(null)
  /** @type {import('vue').Ref<Array>} Resolved issues */
  const issues = ref([])
  /** @type {import('vue').Ref<Array>} Issue resolutions */
  const resolutions = ref([])
  /** @type {import('vue').Ref<boolean>} Results loading state */
  const resultsLoading = ref(false)
  /** @type {import('vue').Ref<string|null>} Results error */
  const resultsError = ref(null)

  // Polling State
  /** @type {import('vue').Ref<number|null>} Polling timer ID */
  const pollingTimer = ref(null)
  /** @type {import('vue').Ref<boolean>} Polling active status */
  const isPolling = ref(false)

  // Export State
  /** @type {import('vue').Ref<Object>} Export status and progress tracking */
  const exportStatus = ref({
    pvault: { status: 'idle', progress: 0, error: null },
    followup: { status: 'idle', progress: 0, error: null },
    issues: { status: 'idle', progress: 0, error: null },
  })
  /** @type {import('vue').Ref<Array>} Export history for re-downloads */
  const exportHistory = ref([])

  // Legacy compatibility
  /** @type {import('vue').Ref<string|null>} Legacy error field */
  const error = ref(null)
  /** @type {import('vue').Ref<'idle'|'uploading'|'processing'|'completed'|'error'>} Legacy processing status */
  const processingStatus = ref('idle')

  // Getters (Computed Properties)

  // Authentication Getters
  /**
   * Check if user is currently authenticated
   * @returns {boolean} True if user is authenticated
   */
  const userIsAuthenticated = computed(
    () => isAuthenticated.value && !!user.value
  )

  /**
   * Check if current user has admin privileges
   * @returns {boolean} True if user is admin
   */
  const userIsAdmin = computed(() => isAdmin.value && userIsAuthenticated.value)

  /**
   * Get current user's display name
   * @returns {string} User display name or 'Guest'
   */
  const userDisplayName = computed(() => {
    if (!user.value) return 'Guest'
    return user.value.username || user.value.email || 'User'
  })

  // Session Getters
  /**
   * Indicates whether a session is currently active
   * @returns {boolean} True if sessionId is set
   */
  const hasSession = computed(() => !!sessionId.value)

  /**
   * Get current session status
   * @returns {string} Current session status
   */
  const sessionStatus = computed(() => {
    return currentSession.value?.status || status.value
  })

  /**
   * Get active sessions count
   * @returns {number} Number of active sessions
   */
  const activeSessionsCount = computed(() => {
    return sessions.value.filter(
      s => s.status !== 'completed' && s.status !== 'cancelled'
    ).length
  })

  // Upload Getters
  /**
   * Indicates whether files have been uploaded to the session
   * @returns {boolean} True if uploadedFiles array contains items
   */
  const hasFiles = computed(() => uploadedFiles.value.length > 0)

  /**
   * Get total upload progress percentage
   * @returns {number} Average upload progress
   */
  const totalUploadProgress = computed(() => {
    if (uploadedFiles.value.length === 0) return 0
    const total = Object.values(uploadProgress.value).reduce(
      (sum, progress) => sum + progress,
      0
    )
    return Math.round(total / uploadedFiles.value.length)
  })

  /**
   * Check if any uploads have errors
   * @returns {boolean} True if upload errors exist
   */
  const hasUploadErrors = computed(() => {
    return Object.keys(uploadErrors.value).length > 0
  })

  /**
   * Get uploaded files with validation status
   * @returns {Array} Files with enhanced status info
   */
  const validatedFiles = computed(() => {
    return uploadedFiles.value.filter(file => file.status === 'validated')
  })

  // Processing Getters
  /**
   * Indicates whether files are currently being processed
   * @returns {boolean} True if status is 'processing'
   */
  const isProcessing = computed(() => status.value === 'processing')

  /**
   * Check if processing can be started
   * @returns {boolean} True if files are ready for processing
   */
  const canStartProcessing = computed(() => {
    return hasFiles.value && status.value === 'idle' && !hasUploadErrors.value
  })

  /**
   * Check if processing can be paused
   * @returns {boolean} True if processing can be paused
   */
  const canPauseProcessing = computed(() => {
    return status.value === 'processing'
  })

  /**
   * Check if processing can be resumed
   * @returns {boolean} True if processing can be resumed
   */
  const canResumeProcessing = computed(() => {
    return status.value === 'paused'
  })

  /**
   * Check if processing can be cancelled
   * @returns {boolean} True if processing can be cancelled
   */
  const canCancelProcessing = computed(() => {
    return ['processing', 'paused'].includes(status.value)
  })

  /**
   * Get processing progress details
   * @returns {Object} Progress information
   */
  const processingProgress = computed(() => {
    return {
      percentage: progress.value,
      status: status.value,
      currentActivity:
        activities.value[activities.value.length - 1]?.message || 'Ready',
      totalActivities: activities.value.length,
    }
  })

  // Results Getters
  /**
   * Indicates whether processing results are available
   * @returns {boolean} True if results object is set
   */
  const hasResults = computed(() => !!results.value)

  /**
   * Get employees requiring attention
   * @returns {Array} Employees with validation issues
   */
  const employeesNeedingAttention = computed(() => {
    return employees.value.filter(
      emp => emp.validation_status === 'NEEDS_ATTENTION'
    )
  })

  /**
   * Get resolved employees count
   * @returns {number} Number of resolved employees
   */
  const resolvedEmployeesCount = computed(() => {
    return employees.value.filter(emp => emp.validation_status === 'RESOLVED')
      .length
  })

  /**
   * Get issues requiring resolution
   * @returns {Array} Unresolved issues
   */
  const unresolvedIssues = computed(() => {
    return issues.value.filter(issue => !issue.resolved)
  })

  /**
   * Get processing summary statistics
   * @returns {Object} Summary stats
   */
  const processingSummary = computed(() => {
    if (!results.value?.session_summary) return null

    return {
      ...results.value.session_summary,
      needsAttention: employeesNeedingAttention.value.length,
      resolved: resolvedEmployeesCount.value,
      unresolvedIssues: unresolvedIssues.value.length,
    }
  })

  // Error State Getters
  /**
   * Indicates whether any error occurred
   * @returns {boolean} True if any error exists
   */
  const hasError = computed(() => {
    return !!(
      error.value ||
      authError.value ||
      sessionError.value ||
      processError.value ||
      resultsError.value
    )
  })

  /**
   * Get all current errors
   * @returns {Array} Array of error messages
   */
  const allErrors = computed(() => {
    const errors = []
    if (error.value) errors.push({ type: 'general', message: error.value })
    if (authError.value) errors.push({ type: 'auth', message: authError.value })
    if (sessionError.value)
      errors.push({ type: 'session', message: sessionError.value })
    if (processError.value)
      errors.push({ type: 'processing', message: processError.value })
    if (resultsError.value)
      errors.push({ type: 'results', message: resultsError.value })

    Object.entries(uploadErrors.value).forEach(([fileId, error]) => {
      errors.push({ type: 'upload', fileId, message: error })
    })

    return errors
  })

  // Export Getters
  /**
   * Indicates whether exports are available (session completed successfully)
   * @returns {boolean} True if results are available and no processing errors
   */
  const canExport = computed(() => {
    return hasResults.value && status.value === 'completed' && !hasError.value
  })

  /**
   * Indicates whether any export is currently in progress
   * @returns {boolean} True if any export is in progress
   */
  const hasActiveExports = computed(() => {
    return Object.values(exportStatus.value).some(
      exportInfo => exportInfo.status === 'exporting'
    )
  })

  /**
   * Get export status for specific export type
   * @param {string} exportType - Type of export (pvault, followup, issues)
   * @returns {Object} Export status object
   */
  const getExportStatus = exportType => {
    return (
      exportStatus.value[exportType] || {
        status: 'idle',
        progress: 0,
        error: null,
      }
    )
  }

  // Polling Getters
  /**
   * Check if status polling should be active
   * @returns {boolean} True if polling should be active
   */
  const shouldPoll = computed(() => {
    return POLLING_STATUSES.includes(status.value) && hasSession.value
  })

  // Legacy compatibility getters
  /**
   * Legacy processing status getter
   * @returns {string} Legacy processing status
   */
  const legacyProcessingStatus = computed(() => {
    // Map new status to legacy status
    const statusMap = {
      idle: 'idle',
      uploading: 'uploading',
      processing: 'processing',
      validating: 'processing',
      completed: 'completed',
      error: 'error',
      cancelled: 'error',
      paused: 'processing',
    }
    return statusMap[status.value] || 'idle'
  })

  // Actions

  /**
   * Creates a new processing session with the given ID (legacy)
   * Resets all session state to initial values
   * @param {string} id - Unique session identifier from backend
   */
  function legacyCreateSession(id) {
    sessionId.value = id
    uploadedFiles.value = []
    processingStatus.value = 'idle'
    results.value = null
    error.value = null
  }

  /**
   * Adds a file to the current session's upload list
   * @param {FileItem} file - File object with id, name, and optional metadata
   */
  function addFile(file) {
    uploadedFiles.value.push(file)
  }

  /**
   * Removes a specific file from the upload list
   * @param {string|number} fileId - ID of the file to remove
   */
  function removeFile(fileId) {
    uploadedFiles.value = uploadedFiles.value.filter(file => file.id !== fileId)
  }

  /**
   * Clears all files from the current session
   * Does not affect other session state
   */
  function clearFiles() {
    uploadedFiles.value = []
  }

  /**
   * Updates the current processing status
   * Automatically clears errors when starting processing
   * @param {'idle'|'uploading'|'processing'|'completed'|'error'} status - New processing status
   */
  function setProcessingStatus(status) {
    processingStatus.value = status
    if (status === 'processing') {
      error.value = null
    }
  }

  /**
   * Sets the processing results and marks processing as completed
   * Automatically clears any existing errors
   * @param {ProcessingResults} data - Results from the PDF processing backend
   */
  function setResults(data) {
    results.value = data
    processingStatus.value = 'completed'
    error.value = null
  }

  /**
   * Updates a specific employee's resolution status
   * @param {string} revisionId - Employee revision identifier
   * @param {Object} resolutionData - Resolution details
   */
  function updateEmployeeResolution(revisionId, resolutionData) {
    if (!results.value?.employees) return

    const employeeIndex = results.value.employees.findIndex(
      emp => emp.revision_id === revisionId
    )

    if (employeeIndex > -1) {
      const employee = results.value.employees[employeeIndex]
      employee.validation_status = 'RESOLVED'
      employee.resolved_at = resolutionData.resolved_at
      employee.resolved_by = resolutionData.resolved_by
      employee.resolution_notes = resolutionData.notes

      // Add to resolution history
      if (!employee.resolution_history) {
        employee.resolution_history = []
      }
      employee.resolution_history.push({
        id: Date.now(),
        action: resolutionData.action,
        notes: resolutionData.notes,
        resolved_by: resolutionData.resolved_by,
        created_at: resolutionData.resolved_at,
      })
    }
  }

  /**
   * Updates multiple employees' resolution status (bulk operation)
   * @param {Array} revisionIds - Array of employee revision identifiers
   * @param {Object} resolutionData - Resolution details
   */
  function updateBulkEmployeeResolution(revisionIds, resolutionData) {
    if (!results.value?.employees) return

    revisionIds.forEach(revisionId => {
      updateEmployeeResolution(revisionId, resolutionData)
    })

    // Update session summary counts
    if (results.value.session_summary) {
      const resolvedCount = results.value.employees.filter(
        emp => emp.validation_status === 'RESOLVED'
      ).length

      const issuesCount = results.value.employees.filter(
        emp => emp.validation_status === 'NEEDS_ATTENTION'
      ).length

      results.value.session_summary.resolved_employees = resolvedCount
      results.value.session_summary.issues_employees = issuesCount
    }
  }

  /**
   * Sets an error message and marks processing as failed (legacy)
   * @param {string} errorMessage - Human-readable error description
   */
  function legacySetError(errorMessage) {
    error.value = errorMessage
    processingStatus.value = 'error'
  }

  /**
   * Completely clears all session data (legacy)
   * Returns store to initial state
   */
  function legacyClearSession() {
    sessionId.value = null
    uploadedFiles.value = []
    processingStatus.value = 'idle'
    results.value = null
    error.value = null
    resetExportStatus()
    clearExportHistory()
  }

  /**
   * Resets processing state while preserving session and files
   * Useful for retrying processing after an error
   */
  function resetProcessing() {
    processingStatus.value = 'idle'
    results.value = null
    error.value = null
  }

  /**
   * Sets export status for specific export type
   * @param {string} exportType - Type of export (pvault, followup, issues)
   * @param {string} status - Export status (idle, exporting, completed, error)
   * @param {number} progress - Progress percentage (0-100)
   * @param {string|null} errorMessage - Error message if status is 'error'
   */
  function setExportStatus(
    exportType,
    status,
    progress = 0,
    errorMessage = null
  ) {
    if (exportStatus.value[exportType]) {
      exportStatus.value[exportType] = {
        status,
        progress,
        error: errorMessage,
      }
    }
  }

  /**
   * Adds completed export to history for re-download
   * @param {Object} exportInfo - Export information
   */
  function addExportToHistory(exportInfo) {
    const historyItem = {
      id: Date.now(),
      type: exportInfo.type,
      filename: exportInfo.filename,
      size: exportInfo.size,
      sessionId: sessionId.value,
      timestamp: new Date().toISOString(),
      url: exportInfo.url, // Temporary blob URL
    }

    exportHistory.value.unshift(historyItem)

    // Keep only last 10 exports
    if (exportHistory.value.length > 10) {
      exportHistory.value = exportHistory.value.slice(0, 10)
    }
  }

  /**
   * Clears export history and revokes blob URLs
   */
  function clearExportHistory() {
    // Revoke blob URLs to free memory
    exportHistory.value.forEach(item => {
      if (item.url && item.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url)
      }
    })

    exportHistory.value = []
  }

  /**
   * Resets all export states to idle
   */
  function resetExportStatus() {
    exportStatus.value = {
      pvault: { status: 'idle', progress: 0, error: null },
      followup: { status: 'idle', progress: 0, error: null },
      issues: { status: 'idle', progress: 0, error: null },
    }
  }

  // Polling Actions
  /**
   * Start 5-second status polling for active processing
   */
  function startStatusPolling() {
    // Don't start if already polling
    if (isPolling.value || !sessionId.value) {
      return
    }

    isPolling.value = true

    const poll = async () => {
      try {
        if (!sessionId.value || !shouldPoll.value) {
          stopStatusPolling()
          return
        }

        const statusData = await api.getProcessingStatus(sessionId.value)

        // Update status and progress
        status.value = statusData.status
        progress.value = statusData.percent_complete || statusData.progress || 0

        // Add new activities if any
        const responseActivities = statusData.recent_activities || statusData.activities || []
        if (responseActivities.length > activities.value.length) {
          const newActivities = responseActivities.slice(
            activities.value.length
          )
          activities.value.push(...newActivities)
        }

        // Check if processing completed or failed
        if (['completed', 'error', 'cancelled'].includes(statusData.status)) {
          if (statusData.status === 'completed') {
            // Fetch results when completed
            await getResults()
          } else if (statusData.status === 'error') {
            processError.value = statusData.error || 'Processing failed'
            addActivity(statusData.error || 'Processing failed', 'error')
          }

          stopStatusPolling()
          return
        }

        // Schedule next poll if still active
        if (isPolling.value && shouldPoll.value) {
          pollingTimer.value = setTimeout(poll, POLLING_INTERVAL)
        }
      } catch (err) {
        console.error('Polling error:', err)
        // Continue polling on error, but with longer interval
        if (isPolling.value && shouldPoll.value) {
          pollingTimer.value = setTimeout(poll, POLLING_INTERVAL * 2)
        }
      }
    }

    // Start first poll immediately
    setTimeout(poll, 100)
  }

  /**
   * Stop status polling
   */
  function stopStatusPolling() {
    isPolling.value = false

    if (pollingTimer.value) {
      clearTimeout(pollingTimer.value)
      pollingTimer.value = null
    }
  }

  // Results Actions
  /**
   * Get processing results for current session
   * @returns {Promise<ProcessingResults>} Processing results
   */
  async function getResults() {
    if (!sessionId.value) {
      throw new Error('No active session')
    }

    resultsLoading.value = true
    resultsError.value = null

    try {
      const data = await api.getResults(sessionId.value)

      results.value = data
      employees.value = data.employees || []
      issues.value = data.issues || []

      // Update status if completed
      if (data.session_summary?.status === 'completed') {
        status.value = 'completed'
        addActivity('Processing completed successfully', 'success')

        // Stop polling when completed
        stopStatusPolling()
      }

      return data
    } catch (err) {
      resultsError.value = err.message
      throw err
    } finally {
      resultsLoading.value = false
    }
  }

  /**
   * Resolve issues for employees
   * @param {Array} issueResolutions - Array of issue resolutions
   * @returns {Promise<Object>} Resolution response
   */
  async function resolveIssues(issueResolutions) {
    if (!sessionId.value) {
      throw new Error('No active session')
    }

    try {
      const response = await api.bulkResolveIssues(
        sessionId.value,
        issueResolutions
      )

      // Update local state with resolutions
      issueResolutions.forEach(resolution => {
        updateEmployeeResolution(resolution.revision_id, {
          action: resolution.action,
          notes: resolution.notes,
          resolved_by: user.value?.username || 'unknown',
          resolved_at: new Date().toISOString(),
        })
      })

      // Add resolutions to history
      resolutions.value.push(
        ...issueResolutions.map(r => ({
          ...r,
          resolved_at: new Date().toISOString(),
          resolved_by: user.value?.username || 'unknown',
        }))
      )

      addActivity(`Resolved ${issueResolutions.length} issues`, 'success')

      return response
    } catch (err) {
      resultsError.value = err.message
      throw err
    }
  }

  /**
   * Update employee data
   * @param {Array} employeeUpdates - Employee updates
   * @returns {Promise<Object>} Update response
   */
  async function updateEmployees(employeeUpdates) {
    if (!sessionId.value) {
      throw new Error('No active session')
    }

    try {
      const response = await api.request(
        `/sessions/${sessionId.value}/employees`,
        {
          method: 'PUT',
          body: JSON.stringify({ employees: employeeUpdates }),
        }
      )

      // Update local employee data
      employeeUpdates.forEach(update => {
        const empIndex = employees.value.findIndex(
          emp => emp.revision_id === update.revision_id
        )
        if (empIndex >= 0) {
          employees.value[empIndex] = {
            ...employees.value[empIndex],
            ...update,
          }
        }
      })

      addActivity(`Updated ${employeeUpdates.length} employees`, 'info')

      return response
    } catch (err) {
      resultsError.value = err.message
      throw err
    }
  }

  // Processing Actions
  /**
   * Start processing uploaded files
   * @returns {Promise<Object>} Processing start response
   */
  async function startProcessing() {
    if (!sessionId.value) {
      throw new Error('No active session')
    }

    if (uploadedFiles.value.length === 0) {
      throw new Error('No files to process')
    }

    processLoading.value = true
    processError.value = null

    try {
      const response = await api.startProcessing(sessionId.value)

      status.value = 'processing'
      progress.value = 0
      activities.value = [
        {
          id: Date.now(),
          message: 'Processing started',
          timestamp: new Date().toISOString(),
          type: 'info',
        },
      ]

      // Start status polling
      startStatusPolling()

      return response
    } catch (err) {
      processError.value = err.message
      status.value = 'error'
      throw err
    } finally {
      processLoading.value = false
    }
  }

  /**
   * Pause current processing
   * @returns {Promise<Object>} Pause response
   */
  async function pauseProcessing() {
    if (!sessionId.value) {
      throw new Error('No active session')
    }

    try {
      const response = await api.pauseProcessing(sessionId.value)

      status.value = 'paused'
      addActivity('Processing paused', 'warning')

      // Stop polling when paused
      stopStatusPolling()

      return response
    } catch (err) {
      processError.value = err.message
      throw err
    }
  }

  /**
   * Resume paused processing
   * @returns {Promise<Object>} Resume response
   */
  async function resumeProcessing() {
    if (!sessionId.value) {
      throw new Error('No active session')
    }

    try {
      const response = await api.resumeProcessing(sessionId.value)

      status.value = 'processing'
      addActivity('Processing resumed', 'info')

      // Restart polling
      startStatusPolling()

      return response
    } catch (err) {
      processError.value = err.message
      throw err
    }
  }

  /**
   * Cancel current processing
   * @returns {Promise<Object>} Cancel response
   */
  async function cancelProcessing() {
    if (!sessionId.value) {
      throw new Error('No active session')
    }

    try {
      const response = await api.cancelProcessing(sessionId.value)

      status.value = 'cancelled'
      addActivity('Processing cancelled', 'error')

      // Stop polling
      stopStatusPolling()

      return response
    } catch (err) {
      processError.value = err.message
      throw err
    }
  }

  /**
   * Add activity to the processing log
   * @param {string} message - Activity message
   * @param {string} type - Activity type (info, warning, error, success)
   */
  function addActivity(message, type = 'info') {
    activities.value.push({
      id: Date.now(),
      message,
      timestamp: new Date().toISOString(),
      type,
    })

    // Keep only last 100 activities
    if (activities.value.length > 100) {
      activities.value = activities.value.slice(-100)
    }
  }

  // Upload Actions
  /**
   * Upload files to current session
   * @param {FileList|File[]} files - Files to upload
   * @returns {Promise<Array>} Upload results
   */
  async function uploadFiles(files) {
    if (!sessionId.value) {
      throw new Error('No active session')
    }

    uploadLoading.value = true
    status.value = 'uploading'

    const fileArray = Array.from(files)
    const uploadPromises = fileArray.map(file => uploadSingleFile(file))

    try {
      const results = await Promise.allSettled(uploadPromises)

      // Check if all uploads succeeded
      const hasErrors = results.some(result => result.status === 'rejected')

      if (hasErrors) {
        status.value = 'error'
        error.value = 'Some files failed to upload'
      } else {
        status.value = 'idle'
        error.value = null
      }

      return results.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : { error: result.reason.message }
      )
    } finally {
      uploadLoading.value = false
    }
  }

  /**
   * Upload a single file with progress tracking
   * @param {File} file - File to upload
   * @returns {Promise<Object>} Upload result
   */
  async function uploadSingleFile(file) {
    const fileId = `${file.name}_${Date.now()}`

    // Add file to upload list
    const fileItem = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
    }

    uploadedFiles.value.push(fileItem)
    uploadProgress.value[fileId] = 0

    try {
      const response = await api.uploadFile(sessionId.value, file)

      // Update file status
      const fileIndex = uploadedFiles.value.findIndex(f => f.id === fileId)
      if (fileIndex >= 0) {
        uploadedFiles.value[fileIndex].status = 'completed'
        uploadedFiles.value[fileIndex].progress = 100
        uploadProgress.value[fileId] = 100
      }

      return { fileId, ...response }
    } catch (err) {
      // Update file with error
      const fileIndex = uploadedFiles.value.findIndex(f => f.id === fileId)
      if (fileIndex >= 0) {
        uploadedFiles.value[fileIndex].status = 'error'
        uploadedFiles.value[fileIndex].error = err.message
      }

      uploadErrors.value[fileId] = err.message
      throw err
    }
  }

  /**
   * Validate uploaded files
   * @returns {Promise<Object>} Validation results
   */
  async function validateFiles() {
    if (!sessionId.value || uploadedFiles.value.length === 0) {
      throw new Error('No files to validate')
    }

    try {
      const response = await api.request(
        `/sessions/${sessionId.value}/validate`,
        {
          method: 'POST',
        }
      )

      // Update file validation status
      uploadedFiles.value.forEach(file => {
        const validationResult = response.files?.find(f => f.name === file.name)
        if (validationResult) {
          file.status = validationResult.valid ? 'validated' : 'invalid'
          file.validationMessage = validationResult.message
        }
      })

      return response
    } catch (err) {
      uploadErrors.value.validation = err.message
      throw err
    }
  }

  /**
   * Track upload progress for a file
   * @param {string} fileId - File identifier
   * @param {number} progress - Progress percentage
   */
  function trackProgress(fileId, progress) {
    uploadProgress.value[fileId] = progress

    const fileIndex = uploadedFiles.value.findIndex(f => f.id === fileId)
    if (fileIndex >= 0) {
      uploadedFiles.value[fileIndex].progress = progress
    }
  }

  // Authentication Actions
  /**
   * Get current user information
   * @returns {Promise<User>} Current user data
   */
  async function getCurrentUser() {
    authLoading.value = true
    authError.value = null

    try {
      // For now, simulate Windows authentication
      // In production, this would call the auth endpoint
      const userData = {
        id: 'dev-user-001',
        username: 'testuser',
        email: 'testuser@company.com',
        department: 'Finance',
        isAdmin: true,
      }

      user.value = userData
      isAuthenticated.value = true
      isAdmin.value = userData.isAdmin

      return userData
    } catch (err) {
      authError.value = err.message
      throw err
    } finally {
      authLoading.value = false
    }
  }

  /**
   * Check if current user has admin privileges
   * @returns {Promise<boolean>} Admin status
   */
  async function checkAdmin() {
    if (!userIsAuthenticated.value) {
      await getCurrentUser()
    }
    return isAdmin.value
  }

  /**
   * Logout current user
   */
  function logout() {
    user.value = null
    isAuthenticated.value = false
    isAdmin.value = false
    authError.value = null

    // Clear all session data on logout
    clearSession()
  }

  // Session Management Actions
  /**
   * Create a new processing session
   * @param {Object} sessionData - Session configuration
   * @returns {Promise<string>} Session ID
   */
  async function createSession(sessionData = {}) {
    sessionLoading.value = true
    sessionError.value = null

    try {
      // Validate input data
      if (!sessionData.session_name?.trim()) {
        throw new Error('Session name is required')
      }

      const response = await api.createSession(sessionData)
      
      // Validate API response
      if (!response?.session_id) {
        throw new Error('Invalid response: missing session ID')
      }
      
      const newSessionId = response.session_id

      // Initialize new session state
      sessionId.value = newSessionId
      currentSession.value = {
        session_id: newSessionId,
        session_name: sessionData.session_name.trim(),
        status: response.status || 'idle',
        created_at: response.created_at || new Date().toISOString(),
        created_by: user.value?.username || 'unknown',
        processing_options: sessionData.processing_options || {},
        uploaded_files: [],
        session_summary: null,
      }

      // Add to sessions list
      sessions.value.unshift(currentSession.value)

      // Reset all state for new session
      resetSessionState()

      return newSessionId
    } catch (err) {
      // Enhanced error handling with categorization
      let errorMessage = err.message || 'Unknown error occurred'
      let errorType = 'general'
      
      if (err.status === 400) {
        errorType = 'validation'
        errorMessage = 'Invalid session data provided'
      } else if (err.status === 401) {
        errorType = 'authentication'
        errorMessage = 'Authentication required to create session'
      } else if (err.status === 403) {
        errorType = 'authorization'
        errorMessage = 'Not authorized to create sessions'
      } else if (err.status === 409) {
        errorType = 'conflict'
        errorMessage = 'A session with this name already exists'
      } else if (err.status >= 500) {
        errorType = 'server'
        errorMessage = 'Server error occurred while creating session'
      } else if (err.code === 'NETWORK_ERROR' || err.message?.includes('fetch')) {
        errorType = 'network'
        errorMessage = 'Network error: unable to connect to server'
      }
      
      sessionError.value = {
        message: errorMessage,
        type: errorType,
        originalError: err
      }
      
      throw new Error(errorMessage)
    } finally {
      sessionLoading.value = false
    }
  }

  /**
   * Get session details by ID
   * @param {string} id - Session identifier
   * @returns {Promise<Session>} Session data
   */
  async function getSession(id) {
    sessionLoading.value = true
    sessionError.value = null

    try {
      const session = await api.getSession(id)

      // Update current session if it matches
      if (sessionId.value === id) {
        currentSession.value = session
        status.value = session.status
        uploadedFiles.value = session.uploaded_files || []

        // Update session in list
        const sessionIndex = sessions.value.findIndex(s => s.session_id === id)
        if (sessionIndex >= 0) {
          sessions.value[sessionIndex] = session
        }
      }

      return session
    } catch (err) {
      sessionError.value = err.message
      throw err
    } finally {
      sessionLoading.value = false
    }
  }

  /**
   * Update session configuration
   * @param {string} id - Session identifier
   * @param {Object} updates - Session updates
   * @returns {Promise<Session>} Updated session
   */
  async function updateSession(id, updates) {
    sessionLoading.value = true
    sessionError.value = null

    try {
      const updatedSession = await api.request(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      // Update current session if it matches
      if (sessionId.value === id) {
        currentSession.value = { ...currentSession.value, ...updatedSession }
      }

      // Update session in list
      const sessionIndex = sessions.value.findIndex(s => s.session_id === id)
      if (sessionIndex >= 0) {
        sessions.value[sessionIndex] = {
          ...sessions.value[sessionIndex],
          ...updatedSession,
        }
      }

      return updatedSession
    } catch (err) {
      sessionError.value = err.message
      throw err
    } finally {
      sessionLoading.value = false
    }
  }

  /**
   * Switch to different session
   * @param {string} id - Session ID to switch to
   */
  async function switchSession(id) {
    if (!id) {
      throw new Error('Session ID is required')
    }

    sessionLoading.value = true
    sessionError.value = null

    try {
      // Stop current polling
      stopStatusPolling()

      // Clear current session state
      resetSessionState()

      // Load new session
      sessionId.value = id
      const session = await getSession(id)

      if (!session) {
        throw new Error(`Session ${id} not found or inaccessible`)
      }

      // Start polling if session is active
      if (shouldPoll.value) {
        startStatusPolling()
      }

      return session
    } catch (err) {
      // Enhanced error handling for session switching
      let errorMessage = err.message || 'Failed to switch session'
      let errorType = 'general'
      
      if (err.status === 404) {
        errorType = 'notfound'
        errorMessage = 'Session not found or has been deleted'
      } else if (err.status === 403) {
        errorType = 'authorization'
        errorMessage = 'Not authorized to access this session'
      } else if (err.status >= 500) {
        errorType = 'server'
        errorMessage = 'Server error while loading session'
      } else if (err.code === 'NETWORK_ERROR' || err.message?.includes('fetch')) {
        errorType = 'network'
        errorMessage = 'Network error: unable to connect to server'
      }
      
      sessionError.value = {
        message: errorMessage,
        type: errorType,
        originalError: err
      }
      
      // Reset session ID on failure
      sessionId.value = null
      currentSession.value = null
      
      throw new Error(errorMessage)
    } finally {
      sessionLoading.value = false
    }
  }

  // Session Management Helpers
  /**
   * Reset session state (without clearing session ID)
   */
  function resetSessionState() {
    uploadedFiles.value = []
    uploadProgress.value = {}
    uploadErrors.value = {}
    status.value = 'idle'
    progress.value = 0
    activities.value = []
    employees.value = []
    results.value = null
    issues.value = []
    resolutions.value = []

    // Clear all errors
    clearErrors()

    // Reset export status
    resetExportStatus()

    // Stop polling
    stopStatusPolling()

    // Legacy compatibility
    processingStatus.value = 'idle'
  }

  /**
   * Completely clears all session data
   * Returns store to initial state
   */
  function clearSession() {
    // Stop polling first
    stopStatusPolling()

    // Clear session data
    sessionId.value = null
    currentSession.value = null
    sessions.value = []

    // Reset all state
    resetSessionState()
    clearExportHistory()
  }

  // Error Handling Actions
  /**
   * Set general error message
   * @param {string} errorMessage - Human-readable error description
   */
  function setError(errorMessage) {
    error.value = errorMessage
    status.value = 'error'
    processingStatus.value = 'error' // Legacy compatibility

    // Stop polling on error
    stopStatusPolling()

    addActivity(`Error: ${errorMessage}`, 'error')
  }

  /**
   * Clear all errors
   */
  function clearErrors() {
    error.value = null
    authError.value = null
    sessionError.value = null
    processError.value = null
    resultsError.value = null
    uploadErrors.value = {}
  }

  /**
   * Clear specific error type
   * @param {string} errorType - Error type to clear
   */
  function clearError(errorType) {
    switch (errorType) {
      case 'auth':
        authError.value = null
        break
      case 'session':
        sessionError.value = null
        break
      case 'process':
        processError.value = null
        break
      case 'results':
        resultsError.value = null
        break
      case 'upload':
        uploadErrors.value = {}
        break
      default:
        error.value = null
    }
  }

  return {
    // Authentication State
    user,
    isAuthenticated,
    isAdmin,
    authLoading,
    authError,

    // Session State
    sessionId,
    sessions,
    currentSession,
    sessionLoading,
    sessionError,

    // Upload State
    uploadedFiles,
    uploadProgress,
    uploadErrors,
    uploadLoading,

    // Processing State
    status,
    progress,
    activities,
    employees,
    processLoading,
    processError,

    // Results State
    results,
    issues,
    resolutions,
    resultsLoading,
    resultsError,

    // Polling State
    isPolling,
    pollingTimer,

    // Export State
    exportStatus,
    exportHistory,

    // Legacy State (for backward compatibility)
    error,
    processingStatus,

    // Authentication Getters
    userIsAuthenticated,
    userIsAdmin,
    userDisplayName,

    // Session Getters
    hasSession,
    sessionStatus,
    activeSessionsCount,

    // Upload Getters
    hasFiles,
    totalUploadProgress,
    hasUploadErrors,
    validatedFiles,

    // Processing Getters
    isProcessing,
    canStartProcessing,
    canPauseProcessing,
    canResumeProcessing,
    canCancelProcessing,
    processingProgress,

    // Results Getters
    hasResults,
    employeesNeedingAttention,
    resolvedEmployeesCount,
    unresolvedIssues,
    processingSummary,

    // Error Getters
    hasError,
    allErrors,

    // Export Getters
    canExport,
    hasActiveExports,
    getExportStatus,

    // Polling Getters
    shouldPoll,

    // Legacy Getters
    legacyProcessingStatus,

    // Authentication Actions
    getCurrentUser,
    checkAdmin,
    logout,

    // Session Actions
    createSession,
    legacyCreateSession,
    getSession,
    updateSession,
    switchSession,

    // Upload Actions
    uploadFiles,
    uploadSingleFile,
    validateFiles,
    trackProgress,
    addFile,
    removeFile,
    clearFiles,

    // Processing Actions
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    addActivity,
    setProcessingStatus,

    // Results Actions
    getResults,
    setResults,
    resolveIssues,
    updateEmployees,
    updateEmployeeResolution,
    updateBulkEmployeeResolution,

    // Polling Actions
    startStatusPolling,
    stopStatusPolling,

    // Error Actions
    setError,
    legacySetError,
    clearErrors,
    clearError,

    // Session Management
    clearSession,
    legacyClearSession,
    resetProcessing,
    resetSessionState,

    // Export Actions (preserved from original)
    setExportStatus,
    addExportToHistory,
    clearExportHistory,
    resetExportStatus,
  }
})
