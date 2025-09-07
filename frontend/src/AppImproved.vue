<template>
  <ErrorBoundary>
    <div class="app-container min-h-screen bg-neutral-50 flex flex-col">
      <!-- Skip Navigation Link -->
      <a 
        href="#main-content" 
        class="skip-link sr-only focus:not-sr-only fixed top-4 left-4 z-50 bg-primary-600 text-white px-4 py-2 rounded-md transition-all"
        @focus="announceSkipLink"
      >
        Skip to main content
      </a>
    
      <!-- Compact Header -->
      <header class="app-header bg-white shadow-sm border-b border-neutral-200 flex-shrink-0">
        <div class="container-responsive py-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center">
              <h1 class="logo text-xl font-bold text-neutral-900" role="banner">
                <span class="desktop-only">Credit Card Processor</span>
                <span class="tablet-only">Credit Card Proc</span>
                <span class="mobile-only">CCP</span>
              </h1>
              <!-- Session Status Indicator (compact) -->
              <div 
                v-if="sessionStore.hasSession" 
                class="ml-4 flex items-center space-x-2 text-sm text-success-600"
              >
                <div class="w-2 h-2 rounded-full bg-success-500" title="Session Active"></div>
                <span class="hidden sm:inline">Session Active</span>
              </div>
            </div>
            
            <!-- User Auth (compact) -->
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
      </header>

      <!-- Main Content Area -->
      <main id="main-content" class="flex-1 container-responsive py-6" role="main">
        
        <!-- Welcome Section (only shown when no session) -->
        <div v-if="!sessionStore.hasSession" class="text-center mb-8">
          <h2 class="text-3xl font-bold text-neutral-900 mb-4">
            Upload Credit Card Files
          </h2>
          <p class="text-lg text-neutral-600 max-w-2xl mx-auto">
            Get started by uploading your CAR and Receipt PDF files. 
            We'll automatically create a session and guide you through the process.
          </p>
        </div>

        <!-- Upload-First Interface -->
        <div class="space-y-6">
          
          <!-- Upload Section - Primary Focus -->
          <div 
            class="upload-hero-section"
            :class="[
              'bg-white rounded-xl shadow-lg border-2 transition-all duration-300',
              !sessionStore.hasSession 
                ? 'border-primary-200 p-8' 
                : 'border-neutral-200 p-6'
            ]"
          >
            <!-- Auto-create session for simplified workflow -->
            <FileUpload
              :session-id="sessionStore.sessionId || generateTempSessionId()"
              :hero-mode="!sessionStore.hasSession"
              @upload-complete="handleUploadComplete"
              @upload-error="handleUploadError"
              @session-created="handleSessionCreated"
            />
          </div>

          <!-- Processing Section - Progressive Disclosure -->
          <div 
            v-if="sessionStore.hasFiles || sessionStore.isProcessing"
            class="processing-section bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden"
          >
            <div class="p-6">
              <h3 class="text-xl font-semibold text-neutral-900 mb-4 flex items-center">
                <svg class="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Processing Status
              </h3>
              
              <ProgressTracker 
                :session-id="sessionStore.sessionId"
                :compact-mode="true"
              />
            </div>
          </div>

          <!-- Results Section - Conditional Display -->
          <div 
            v-if="sessionStore.hasResults"
            class="results-section bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden"
          >
            <div class="p-6">
              <h3 class="text-xl font-semibold text-neutral-900 mb-4 flex items-center">
                <svg class="w-6 h-6 mr-2 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Processing Results
              </h3>
              
              <SummaryResults 
                :session-id="sessionStore.sessionId"
                :compact-mode="true"
                @employee-resolve="handleEmployeeResolve"
                @bulk-action="handleBulkAction"
                @view-all-issues="handleViewAllIssues"
                @export-ready="handleExportReady"
              />
            </div>
          </div>

          <!-- Export Section - Only when ready -->
          <div 
            v-if="sessionStore.canExport"
            class="export-section bg-gradient-to-r from-success-50 to-primary-50 rounded-xl border border-success-200 p-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold text-neutral-900 mb-2 flex items-center">
                  <svg class="w-6 h-6 mr-2 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ready to Export
                </h3>
                <p class="text-neutral-600">Your files have been processed and are ready for download.</p>
              </div>
              
              <ExportActions :compact-mode="true" />
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="sessionStore.hasError" class="mt-6">
          <div class="bg-error-50 border border-error-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-error-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <div class="flex-1">
                <h4 class="font-medium text-error-800">Processing Error</h4>
                <p class="text-error-700 mt-1">{{ sessionStore.error }}</p>
                <button
                  @click="sessionStore.setError(null)"
                  class="mt-2 text-sm text-error-600 hover:text-error-800 underline focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Compact Footer -->
      <footer class="bg-white border-t border-neutral-200 mt-auto">
        <div class="container-responsive py-4">
          <div class="flex justify-between items-center text-sm text-neutral-500">
            <p>
              <span class="desktop-only">Credit Card Processor v1.0.0</span>
              <span class="tablet-only">CCP v1.0.0</span>
              <span class="mobile-only">v1.0.0</span>
            </p>
            
            <!-- Quick Actions -->
            <div v-if="sessionStore.hasSession" class="flex items-center space-x-4">
              <button
                @click="handleNewSession"
                class="text-neutral-500 hover:text-primary-600 transition-colors"
                :disabled="sessionStore.isProcessing"
              >
                New Session
              </button>
            </div>
          </div>
        </div>
      </footer>

      <!-- Floating Action Button for Mobile (when needed) -->
      <div 
        v-if="shouldShowFloatingAction"
        class="fixed bottom-6 right-6 md:hidden z-40"
      >
        <button
          @click="handleFloatingAction"
          class="w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all duration-200 flex items-center justify-center"
          :aria-label="getFloatingActionLabel()"
        >
          <svg v-if="!sessionStore.isProcessing" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <div v-else class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </button>
      </div>

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
    </div>
  </ErrorBoundary>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineAsyncComponent } from 'vue'
import { useSessionStore } from './stores/session.js'
import { useNotificationStore } from './stores/notification.js'
import { useApi } from './composables/useApi.js'
import { useProgress } from './composables/useProgress.js'
import { useWebSocket } from './composables/useWebSocket.js'
import AuthDisplay from './components/shared/AuthDisplay.vue'
import ErrorBoundary from './components/shared/ErrorBoundary.vue'
import NotificationContainer from './components/shared/NotificationContainer.vue'

// Lazy-load components for better performance
const FileUpload = defineAsyncComponent({
  loader: () => import('./components/FileUpload.vue'),
  errorComponent: { template: '<div class="text-red-600">Failed to load FileUpload component</div>' },
  delay: 200,
  timeout: 10000
})
const ProgressTracker = defineAsyncComponent({
  loader: () => import('./components/ProgressTracker.vue'),
  errorComponent: { template: '<div class="text-red-600">Failed to load ProgressTracker component</div>' },
  delay: 200,
  timeout: 10000
})
const SummaryResults = defineAsyncComponent({
  loader: () => import('./components/SummaryResults.vue'),
  errorComponent: { template: '<div class="text-red-600">Failed to load SummaryResults component</div>' },
  delay: 200,
  timeout: 10000
})
const ExportActions = defineAsyncComponent({
  loader: () => import('./components/ExportActions.vue'),
  errorComponent: { template: '<div class="text-red-600">Failed to load ExportActions component</div>' },
  delay: 200,
  timeout: 10000
})

const sessionStore = useSessionStore()
const notificationStore = useNotificationStore()
const api = useApi()
const progress = useProgress()
const webSocket = useWebSocket()

// Accessibility state
const announcements = ref('')

// Computed properties for enhanced UX
const shouldShowFloatingAction = computed(() => {
  // Show floating action on mobile when there's an active session but no files yet
  return sessionStore.hasSession && !sessionStore.hasFiles && !sessionStore.isProcessing
})

/**
 * Initialize app with simplified workflow
 */
onMounted(async () => {
  // Set up global error handling
  setupGlobalErrorHandling()
  
  // Set up online/offline detection
  setupConnectionMonitoring()
  
  // Set up WebSocket event handlers
  setupWebSocketEventHandlers()
  
  // Auto-create session if user lands here directly
  if (!sessionStore.hasSession) {
    console.log('No active session, ready for simplified upload workflow')
  }
})

/**
 * Generate temporary session ID for initial upload
 */
function generateTempSessionId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Handle session creation from upload
 */
function handleSessionCreated(sessionData) {
  sessionStore.setSession(sessionData)
  announcements.value = 'Session created successfully. You can now upload files.'
  
  notificationStore.addSuccess('Session created! Continue uploading your files.', {
    title: 'Getting Started',
    duration: 5000
  })
}

/**
 * Watch for processing status changes and manage WebSocket/polling
 */
watch(
  () => sessionStore.status,
  (newStatus, oldStatus) => {
    if (newStatus === 'processing' && oldStatus !== 'processing' && sessionStore.sessionId) {
      console.log('Processing started...')
      
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
 * Watch WebSocket connection status
 */
watch(
  () => webSocket.isConnected.value,
  (isConnected) => {
    if (isConnected) {
      console.log('WebSocket connected - enabling real-time updates')
      sessionStore.enableRealTime()
      
      if (progress.isPolling) {
        progress.stopPolling()
      }
    } else {
      console.log('WebSocket disconnected - falling back to polling if needed')
      sessionStore.disableRealTime()
      
      if (sessionStore.status === 'processing' && sessionStore.sessionId) {
        progress.startPolling(sessionStore.sessionId)
      }
    }
  }
)

/**
 * Set up global error handling
 */
function setupGlobalErrorHandling() {
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
    window.addEventListener('processing-complete', (event) => {
      const { summary } = event.detail
      console.log('Processing completed via WebSocket:', summary)
      
      if (sessionStore.sessionId) {
        api.getResults(sessionStore.sessionId)
          .then(results => {
            sessionStore.setResults(results)
            
            notificationStore.addSuccess(
              `Processing completed! ${summary.ready_for_pvault || 0} employees ready for export.`,
              {
                title: 'Processing Complete',
                duration: 10000,
                actions: [
                  {
                    label: 'View Results',
                    handler: () => announcements.value = 'Processing results are now available'
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
 * Handle successful file upload
 */
function handleUploadComplete(data) {
  announcements.value = 'Files uploaded successfully. Processing will begin automatically.'
  
  if (sessionStore.processingStatus === 'processing') {
    progress.startPolling(sessionStore.sessionId)
  }
}

/**
 * Handle file upload errors
 */
function handleUploadError(data) {
  console.error('Upload error:', data)
  
  notificationStore.addError(data.error || 'File upload failed', {
    title: 'Upload Error',
    actions: [{
      label: 'Try Again',
      handler: () => {
        announcements.value = 'You can try uploading the files again'
      }
    }]
  })
  
  sessionStore.setError(data.error)
}

/**
 * Handle skip link announcement
 */
function announceSkipLink() {
  announcements.value = 'Skip to main content link focused. Press Enter to skip navigation.'
}

/**
 * Handle admin panel access
 */
function handleAdminPanel(user) {
  console.log('Admin panel access requested for user:', user)
  
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
  
  notificationStore.addError(errorMessage, {
    title: 'Authentication Error',
    actions: [{
      label: 'Refresh Page',
      handler: () => {
        window.location.reload()
      }
    }]
  })
  
  sessionStore.setError(errorMessage)
  announcements.value = 'Authentication error occurred. Please refresh the page.'
}

/**
 * Handle new session creation
 */
function handleNewSession() {
  sessionStore.clearSession()
  progress.stopPolling()
  announcements.value = 'New session started. You can now upload files.'
}

/**
 * Handle floating action button
 */
function handleFloatingAction() {
  // Scroll to upload section or focus first file input
  const uploadSection = document.querySelector('.upload-hero-section')
  if (uploadSection) {
    uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

/**
 * Get floating action button label
 */
function getFloatingActionLabel() {
  if (sessionStore.isProcessing) return 'Processing files...'
  if (!sessionStore.hasFiles) return 'Upload files'
  return 'View upload section'
}

/**
 * Handle employee resolution
 */
function handleEmployeeResolve(employee) {
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
 * Handle bulk actions
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
 * Handle view all issues
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
 * Handle export ready
 */
function handleExportReady(options) {
  if (options.type === 'pvault') {
    // Trigger pVault download
    announcements.value = 'pVault export ready for download'
  } else {
    announcements.value = 'Processing results are ready for export'
  }
}

/**
 * Watch progress updates and sync with session store
 */
watch(
  () => progress.status,
  (status, oldStatus) => {
    if (status === 'completed') {
      sessionStore.setProcessingStatus('completed')
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
 * Watch for session changes
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
</script>

<style scoped>
/* Enhanced styling for improved workflow */
.upload-hero-section {
  transition: all 0.3s ease;
}

.upload-hero-section:hover {
  transform: translateY(-2px);
}

.skip-link {
  transform: translateY(-100%);
}

.skip-link:focus {
  transform: translateY(0);
}

/* Progressive disclosure animations */
.processing-section,
.results-section,
.export-section {
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile-specific improvements */
@media (max-width: 768px) {
  .upload-hero-section {
    margin: 0 -1rem;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}

/* Focus improvements for accessibility */
.focus\:ring-primary:focus {
  --tw-ring-color: rgb(59 130 246 / 0.5);
}

/* Loading state styling */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>