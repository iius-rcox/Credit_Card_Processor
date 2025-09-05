<template>
  <ErrorBoundary>
    <div id="app" class="min-h-screen bg-neutral-50">
      <!-- Skip Navigation Link -->
      <a 
        href="#main-content" 
        class="skip-link sr-only focus:not-sr-only"
        @focus="announceSkipLink"
      >
        Skip to main content
      </a>
    
    <!-- Header -->
    <header class="app-header bg-white shadow-card border-b border-neutral-300">
      <div class="container-responsive">
        <div class="flex justify-between items-center h-full">
          <div class="flex items-center">
            <h1 class="logo text-neutral-900" role="banner">
              <span class="desktop-only">Credit Card Processor</span>
              <span class="tablet-only">Credit Card Proc</span>
              <span class="mobile-only">CCP</span>
            </h1>
          </div>
          <div class="nav-items flex items-center">
            <!-- Session Status -->
            <div v-if="sessionStore.hasSession" class="hidden sm:flex items-center space-x-2 text-secondary">
              <div
                :class="[
                  'w-2 h-2 rounded-full',
                  sessionStore.hasSession ? 'bg-success-500' : 'bg-neutral-400',
                ]"
                :title="sessionStore.hasSession ? 'Session Active' : 'No Session'"
              ></div>
              <span>Session: {{ sessionStore.sessionId?.slice(-8) }}</span>
            </div>

            <!-- Windows Authentication Display -->
            <AuthDisplay 
              layout="header" 
              variant="minimal"
              :show-details="false"
              :show-admin-access="true"
              :show-logout="false"
              @admin-panel-clicked="handleAdminPanel"
              @auth-error="handleAuthError"
            />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main id="main-content" class="container-responsive main-content" role="main">
      <div class="content-section">
        <!-- Session Setup (when no active session) -->
        <div v-if="!sessionStore.hasSession">
          <SessionSetup 
            @session-created="handleSessionCreated"
            @session-resumed="handleSessionResumed"
          />
        </div>

        <!-- Active Session Content -->
        <div v-else>
          <!-- Session Header -->
          <div class="card card-responsive">
            <div class="card-header-responsive">
              <div>
                <h2 class="card-title-responsive text-neutral-900 mb-2">
                  {{ sessionStore.currentSession?.session_name || 'Active Session' }}
                </h2>
                <div class="flex flex-wrap items-center gap-2 tablet:gap-4 text-secondary">
                  <div class="flex items-center space-x-2">
                    <span class="text-neutral-500">Status:</span>
                    <span
                      :class="getStatusBadgeClasses(sessionStore.processingStatus)"
                      class="status-badge"
                    >
                      {{ formatStatus(sessionStore.processingStatus) }}
                    </span>
                  </div>
                  <div
                    v-if="sessionStore.hasFiles"
                    class="flex items-center space-x-2"
                  >
                    <span class="text-neutral-500 tablet-up">Files:</span>
                    <span class="text-neutral-500 mobile-only">F:</span>
                    <span class="text-neutral-900 font-medium">
                      {{ sessionStore.uploadedFiles.length }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-neutral-500 tablet-up">Session ID:</span>
                    <span class="text-neutral-500 mobile-only">ID:</span>
                    <span class="text-neutral-900 font-mono text-small-text">
                      {{ sessionStore.sessionId?.slice(-8) }}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                @click="handleNewSession"
                class="btn-secondary btn-small btn-responsive touch-friendly mt-2 tablet:mt-0"
                aria-label="Start a new processing session"
                :disabled="sessionStore.isProcessing"
              >
                New Session
              </button>
            </div>
          </div>

          <!-- File Upload Section -->
          <FileUpload
            :session-id="sessionStore.sessionId"
            @upload-complete="handleUploadComplete"
            @upload-error="handleUploadError"
          />
        </div>

        <!-- Progress Tracker -->
        <div v-if="sessionStore.hasFiles">
          <ProgressTracker :session-id="sessionStore.sessionId" />
        </div>

        <!-- Results Section -->
        <div v-if="sessionStore.hasResults">
          <SummaryResults 
            :session-id="sessionStore.sessionId"
            @employee-resolve="handleEmployeeResolve"
            @bulk-action="handleBulkAction"
            @view-all-issues="handleViewAllIssues"
            @export-ready="handleExportReady"
          />
        </div>

        <!-- Export Section -->
        <div v-if="sessionStore.canExport">
          <ExportActions />
        </div>
        
        <!-- Spacer for fixed action bar -->
        <div v-if="sessionStore.hasSession" class="action-bar-spacer"></div>

        <!-- Error Display -->
        <div v-if="sessionStore.hasError" class="notification error">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-error-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h4 class="text-body-secondary font-medium text-error-800">Error</h4>
              <p class="text-body-secondary text-error-700 mt-1">
                {{ sessionStore.error }}
              </p>
              <button
                @click="sessionStore.setError(null)"
                class="mt-2 text-small-text text-error-600 hover:text-error-800 underline"
                aria-label="Dismiss error message"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

      <!-- Footer -->
      <footer class="bg-white border-t border-neutral-300 mt-8 tablet:mt-12 desktop:mt-xxl">
        <div class="container-responsive py-4">
          <p class="text-center text-small-text text-neutral-600">
            <span class="desktop-only">Credit Card Processor v1.0.0 - Built with Vue 3, Vite & Tailwind CSS</span>
            <span class="tablet-only">Credit Card Processor v1.0.0</span>
            <span class="mobile-only">CCP v1.0.0</span>
          </p>
        </div>
      </footer>
    </div>

    <!-- Action Bar -->
    <ActionBar
      :processing-progress="progress.percentage || 0"
      :available-downloads="getAvailableDownloads()"
      @process-new="handleProcessNew"
      @download-results="handleDownloadResults"
      @upload-updates="handleUploadUpdates"
    />

    <!-- Global Notification Container -->
    <NotificationContainer />

    <!-- ARIA Live Region for Announcements -->
    <div 
      class="sr-only" 
      aria-live="polite" 
      aria-atomic="false"
      id="aria-live-region"
    >
      {{ announcements }}
    </div>
  </ErrorBoundary>
</template>

<script setup>
import { ref, onMounted, watch, defineAsyncComponent } from 'vue'
import { useSessionStore } from './stores/session.js'
import { useNotificationStore } from './stores/notification.js'
import { useApi } from './composables/useApi.js'
import { useProgress } from './composables/useProgress.js'
import { useWebSocket } from './composables/useWebSocket.js'
import AuthDisplay from './components/shared/AuthDisplay.vue'
import SessionSetup from './components/core/SessionSetup.vue'
import ErrorBoundary from './components/shared/ErrorBoundary.vue'
import NotificationContainer from './components/shared/NotificationContainer.vue'

// Lazy-load components for better performance
const FileUpload = defineAsyncComponent(
  () => import('./components/FileUpload.vue')
)
const ProgressTracker = defineAsyncComponent(
  () => import('./components/ProgressTracker.vue')
)
const ResultsDisplay = defineAsyncComponent(
  () => import('./components/ResultsDisplay.vue')
)
const SummaryResults = defineAsyncComponent(
  () => import('./components/SummaryResults.vue')
)
const ExportActions = defineAsyncComponent(
  () => import('./components/ExportActions.vue')
)
const ActionBar = defineAsyncComponent(
  () => import('./components/ActionBar.vue')
)

const sessionStore = useSessionStore()
const notificationStore = useNotificationStore()
const api = useApi()
const progress = useProgress()
const webSocket = useWebSocket()

// Accessibility state
const announcements = ref('')

/**
 * Initialize app without auto-creating session
 */
onMounted(async () => {
  // Let users choose their session instead of auto-creating
  // This provides better UX and follows Task 6.2 requirements
  
  // Set up global error handling
  setupGlobalErrorHandling()
  
  // Set up online/offline detection
  setupConnectionMonitoring()
  
  // Set up WebSocket event listeners
  setupWebSocketEventHandlers()
})

/**
 * Watch for processing status changes and manage WebSocket/polling
 */
watch(
  () => sessionStore.status,
  (newStatus, oldStatus) => {
    if (newStatus === 'processing' && oldStatus !== 'processing' && sessionStore.sessionId) {
      console.log('Processing started...')
      
      // If WebSocket is connected, use real-time updates, otherwise fallback to polling
      if (webSocket.isConnected.value) {
        sessionStore.enableRealTime()
        console.log('Using WebSocket for real-time updates')
      } else {
        console.log('WebSocket not connected, using polling fallback')
        progress.startPolling(sessionStore.sessionId)
      }
    } else if (newStatus !== 'processing' && progress.isPolling) {
      console.log('Processing ended, stopping progress monitoring...')
      progress.stopPolling()
    }
  }
)

/**
 * Watch WebSocket connection status and manage polling fallback
 */
watch(
  () => webSocket.isConnected.value,
  (isConnected) => {
    if (isConnected) {
      console.log('WebSocket connected - enabling real-time updates')
      sessionStore.enableRealTime()
      
      // Stop polling since WebSocket will provide updates
      if (progress.isPolling) {
        progress.stopPolling()
      }
    } else {
      console.log('WebSocket disconnected - falling back to polling if needed')
      sessionStore.disableRealTime()
      
      // Resume polling if processing is active
      if (sessionStore.status === 'processing' && sessionStore.sessionId) {
        progress.startPolling(sessionStore.sessionId)
      }
    }
  }
)

/**
 * Set up global error handling for API calls
 */
function setupGlobalErrorHandling() {
  // Intercept API errors globally
  api.interceptors?.response?.use(
    response => response,
    error => {
      notificationStore.handleApiError(error)
      return Promise.reject(error)
    }
  )
}

/**
 * Set up connection monitoring
 */
function setupConnectionMonitoring() {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      notificationStore.addSuccess('Connection restored')
    })
    
    window.addEventListener('offline', () => {
      notificationStore.handleOffline()
    })
  }
}

/**
 * Set up WebSocket event handlers
 */
function setupWebSocketEventHandlers() {
  if (typeof window !== 'undefined') {
    // Listen for processing completion events from WebSocket
    window.addEventListener('processing-complete', (event) => {
      const { summary } = event.detail
      console.log('Processing completed via WebSocket:', summary)
      
      // Fetch updated results
      if (sessionStore.sessionId) {
        api.getResults(sessionStore.sessionId)
          .then(results => {
            sessionStore.setResults(results)
            
            // Show completion notification
            notificationStore.addSuccess(
              `Processing completed! ${summary.ready_for_pvault || 0} employees ready for export.`,
              {
                title: 'Processing Complete',
                duration: 10000,
                actions: [
                  {
                    label: 'Download Results',
                    handler: () => handleDownloadResults({ hasFiles: true, fileCount: 2 })
                  }
                ]
              }
            )
          })
          .catch(error => {
            console.error('Failed to fetch results after WebSocket completion:', error)
            sessionStore.setError('Failed to fetch processing results')
          })
      }
    })
  }
}

/**
 * Announce skip link focus for screen readers
 */
function announceSkipLink() {
  announcements.value = 'Skip to main content link focused. Press Enter to skip navigation.'
}

/**
 * Status badge classes helper for template usage (updated for new design system)
 */
const getStatusBadgeClasses = status => {
  const statusMap = {
    idle: 'idle',
    pending: 'idle',
    uploading: 'processing',
    processing: 'processing',
    completed: 'completed',
    error: 'error',
    failed: 'error',
    cancelled: 'cancelled',
  }
  return statusMap[status] || 'idle'
}

/**
 * Status label formatter for consistent display
 */
const formatStatus = status => {
  const statusLabels = {
    idle: 'Ready',
    pending: 'Pending',
    uploading: 'Uploading',
    processing: 'Processing',
    completed: 'Complete',
    error: 'Error',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }
  return statusLabels[status] || status
}

/**
 * Handle successful file upload
 */
function handleUploadComplete(data) {
  // Upload completed successfully - data processed
  // Files are automatically added to session store by FileUpload component
  // Start progress monitoring if processing begins automatically
  if (sessionStore.processingStatus === 'processing') {
    progress.startPolling(sessionStore.sessionId)
  }
}

/**
 * Handle file upload errors
 */
function handleUploadError(data) {
  console.error('Upload error:', data)
  
  // Use notification system instead of session store error
  notificationStore.addError(data.error || 'File upload failed', {
    title: 'Upload Error',
    actions: [{
      label: 'Try Again',
      handler: () => {
        // Could implement retry logic here
        announcements.value = 'You can try uploading the file again'
      }
    }]
  })
  
  // Still set in session store for component compatibility
  sessionStore.setError(data.error)
}

/**
 * Handle admin panel access request
 */
function handleAdminPanel(user) {
  console.log('Admin panel access requested for user:', user)
  
  // Use notification instead of alert for better accessibility
  notificationStore.addInfo(`Admin panel access requested for ${user?.username || 'user'}. Feature coming soon!`, {
    title: 'Admin Panel',
    duration: 8000
  })
  
  announcements.value = 'Admin panel feature is coming soon'
}

/**
 * Handle authentication errors
 */
function handleAuthError(error) {
  console.error('Authentication error:', error)
  
  const errorMessage = `Authentication failed: ${error.message || error}`
  
  // Use notification system for better UX
  notificationStore.addError(errorMessage, {
    title: 'Authentication Error',
    actions: [{
      label: 'Refresh Page',
      handler: () => {
        window.location.reload()
      }
    }]
  })
  
  // Still set in session store for component compatibility
  sessionStore.setError(errorMessage)
  
  announcements.value = 'Authentication error occurred. Please refresh the page.'
}

/**
 * Handle session creation from SessionSetup component
 */
function handleSessionCreated(event) {
  console.log('Session created:', event)
  
  // Session is already created and stored by SessionSetup component
  // The session store has been updated via sessionStore.createSession()
  
  if (event.isDelta) {
    console.log('Delta session created against baseline:', event.deltaSessionId)
  }
}

/**
 * Handle session resumption from SessionSetup component
 */
function handleSessionResumed(event) {
  console.log('Session resumed:', event)
  
  // Session is already loaded by SessionSetup component
  // The session store has been updated via sessionStore.switchSession()
  
  // Start progress monitoring if session is in processing state
  if (sessionStore.isProcessing) {
    progress.startPolling(event.sessionId)
  }
}

/**
 * Handle new session button click
 */
function handleNewSession() {
  // Clear current session to show SessionSetup component
  sessionStore.clearSession()
  progress.stopPolling()
}

/**
 * Watch progress updates and sync with session store
 */
watch(
  () => progress.status,
  (status, oldStatus) => {
    // Progress status changed - update UI accordingly

    if (status === 'completed') {
      sessionStore.setProcessingStatus('completed')
      // Fetch results when processing is complete
      api
        .getResults(sessionStore.sessionId)
        .then(results => {
          sessionStore.setResults(results)
        })
        .catch(error => {
          console.error('Failed to fetch results:', error)
          sessionStore.setError('Failed to fetch processing results')
        })
    } else if (status === 'error') {
      sessionStore.setProcessingStatus('error')
      if (progress.error) {
        sessionStore.setError(progress.error)
      }
    } else if (['processing', 'extracting', 'analyzing'].includes(status)) {
      sessionStore.setProcessingStatus('processing')
    }
  }
)

/**
 * Watch for session changes and update progress monitoring
 */
watch(
  () => sessionStore.sessionId,
  (newSessionId, oldSessionId) => {
    if (newSessionId !== oldSessionId) {
      progress.resetProgress()
      if (newSessionId && sessionStore.processingStatus === 'processing') {
        progress.startPolling(newSessionId)
      }
    }
  }
)

/**
 * Get available downloads count
 */
function getAvailableDownloads() {
  // This would be populated by checking available exports
  // For now, return a placeholder value
  if (sessionStore.hasResults && sessionStore.canExport) {
    return 2 // pVault CSV + Exception Report
  }
  return 0
}

/**
 * Handle process new action from ActionBar
 */
function handleProcessNew(event) {
  const { action } = event
  
  switch (action) {
    case 'create-session':
      // Clear current session to show SessionSetup
      sessionStore.clearSession()
      progress.stopPolling()
      break
      
    case 'upload-files':
      // Focus on file upload area or show upload modal
      // This could scroll to FileUpload component or trigger a modal
      announcements.value = 'Please upload both CAR and Receipt files to proceed'
      break
      
    case 'start-processing':
      // Start processing the uploaded files
      if (sessionStore.sessionId && sessionStore.hasFiles) {
        startProcessing()
      }
      break
      
    default:
      console.warn('Unknown process action:', action)
  }
}

/**
 * Handle download results action from ActionBar
 */
function handleDownloadResults(event) {
  const { hasFiles, fileCount } = event
  
  if (hasFiles && fileCount > 0) {
    // Trigger download of available files
    notificationStore.addInfo(`${fileCount} files available for download`, {
      title: 'Downloads Ready',
      actions: [
        {
          label: 'Download pVault CSV',
          handler: () => downloadPvaultCSV()
        },
        {
          label: 'Download Exception Report', 
          handler: () => downloadExceptionReport()
        }
      ]
    })
  } else {
    // No files available yet, show generation options
    notificationStore.addInfo('Generating export files...', {
      title: 'Preparing Downloads'
    })
  }
}

/**
 * Handle upload updates action from ActionBar
 */
function handleUploadUpdates(event) {
  const { baseSessionId, sessionName } = event
  
  // This would trigger delta processing workflow
  notificationStore.addInfo(
    `Upload updated receipts for session: ${sessionName}`,
    {
      title: 'Delta Processing',
      actions: [
        {
          label: 'Start Delta Upload',
          handler: () => {
            // Implementation would create new delta session
            announcements.value = 'Delta processing feature will allow you to upload updated receipts'
          }
        }
      ]
    }
  )
}

/**
 * Start processing current session
 */
async function startProcessing() {
  try {
    const response = await api.startProcessing(sessionStore.sessionId)
    
    if (response.status === 'processing') {
      sessionStore.setProcessingStatus('processing')
      progress.startPolling(sessionStore.sessionId)
      
      notificationStore.addSuccess('Processing started successfully', {
        title: 'Processing Started'
      })
    }
  } catch (error) {
    console.error('Failed to start processing:', error)
    notificationStore.addError('Failed to start processing', {
      title: 'Processing Error'
    })
  }
}

/**
 * Download pVault CSV
 */
async function downloadPvaultCSV() {
  try {
    const blob = await api.exportPvaultCSV(sessionStore.sessionId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pvault_${sessionStore.sessionId.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    notificationStore.addSuccess('pVault CSV downloaded successfully')
  } catch (error) {
    console.error('Failed to download pVault CSV:', error)
    notificationStore.addError('Failed to download pVault CSV')
  }
}

/**
 * Download exception report
 */
async function downloadExceptionReport() {
  try {
    const blob = await api.exportExceptionReport(sessionStore.sessionId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exceptions_${sessionStore.sessionId.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    notificationStore.addSuccess('Exception report downloaded successfully')
  } catch (error) {
    console.error('Failed to download exception report:', error)
    notificationStore.addError('Failed to download exception report')
  }
}

/**
 * Handle employee resolution from SummaryResults
 */
function handleEmployeeResolve(employee) {
  // This would open a resolution modal or navigate to employee detail
  notificationStore.addInfo(`Resolving issues for ${employee.name}`, {
    title: 'Employee Resolution',
    actions: [
      {
        label: 'Open Resolution Dialog',
        handler: () => {
          announcements.value = `Opening resolution dialog for ${employee.name}`
        }
      }
    ]
  })
}

/**
 * Handle bulk actions from SummaryResults
 */
function handleBulkAction(action) {
  switch (action.key) {
    case 'bulk-upload-receipts':
      notificationStore.addInfo('Bulk receipt upload feature coming soon', {
        title: 'Bulk Upload'
      })
      break
    case 'auto-code-expenses':
      notificationStore.addInfo('Auto-coding feature will apply standard codes', {
        title: 'Auto Code Expenses'
      })
      break
    case 'resolve-mismatches':
      notificationStore.addInfo('Opening mismatch resolution wizard', {
        title: 'Resolve Mismatches'
      })
      break
    default:
      console.log('Bulk action:', action)
  }
}

/**
 * Handle view all issues from SummaryResults
 */
function handleViewAllIssues(options) {
  switch (options.type) {
    case 'category':
      notificationStore.addInfo(`Viewing all ${options.category} issues`, {
        title: 'Issue Details'
      })
      break
    case 'all':
      notificationStore.addInfo('Viewing all employee issues', {
        title: 'All Issues'
      })
      break
    default:
      console.log('View issues:', options)
  }
}

/**
 * Handle export ready from SummaryResults
 */
function handleExportReady(options) {
  if (options.type === 'pvault') {
    downloadPvaultCSV()
  } else {
    // Show available exports
    handleDownloadResults({ hasFiles: true, fileCount: 2 })
  }
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
}

.action-bar-spacer {
  height: 8rem; /* Space for the fixed action bar */
}

@media (max-width: 768px) {
  .action-bar-spacer {
    height: 12rem; /* More space on mobile where buttons stack */
  }
}
</style>
