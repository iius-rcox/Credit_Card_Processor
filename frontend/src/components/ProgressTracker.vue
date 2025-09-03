<template>
  <div class="progress-tracker">
    <!-- Main Progress Display -->
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Processing Progress</h2>
        <div class="flex items-center space-x-2">
          <div
            :class="[
              'w-3 h-3 rounded-full',
              progress.isPolling ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
            ]"
            :title="progress.isPolling ? 'Polling active' : 'Polling inactive'"
          ></div>
          <span class="text-sm text-gray-600">
            {{ progress.isPolling ? 'Live' : 'Offline' }}
          </span>
        </div>
      </div>

      <!-- Session Info -->
      <div v-if="progress.sessionInfo.session_name" class="mb-4">
        <h3 class="text-lg font-medium text-gray-800">
          {{ progress.sessionInfo.session_name }}
        </h3>
      </div>

      <!-- Main Progress Bar -->
      <div class="space-y-4">
        <div class="relative">
          <!-- Primary Progress Bar -->
          <div class="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              :class="[
                'h-6 rounded-full transition-all duration-500 ease-out',
                progress.progressColor,
              ]"
              :style="{ width: `${progress.progressPercentage}%` }"
            >
              <!-- Animated stripes for processing state -->
              <div
                v-if="progress.isProcessing"
                class="absolute inset-0 bg-gradient-to-r from-transparent via-white via-50% to-transparent opacity-30 animate-stripe"
                style="
                  background-size: 30px 30px;
                  background-image: linear-gradient(
                    45deg,
                    rgba(255, 255, 255, 0.2) 25%,
                    transparent 25%,
                    transparent 50%,
                    rgba(255, 255, 255, 0.2) 50%,
                    rgba(255, 255, 255, 0.2) 75%,
                    transparent 75%,
                    transparent
                  );
                  animation: stripe-animation 2s linear infinite;
                "
              ></div>
            </div>
          </div>
          <!-- Progress percentage overlay -->
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-sm font-semibold text-white drop-shadow-sm">
              {{ progress.progressPercentage }}%
            </span>
          </div>
        </div>

        <!-- Progress Status and Time -->
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center space-x-2">
            <span
              :class="[
                'px-2 py-1 rounded-full text-xs font-medium',
                progress.hasError
                  ? 'bg-red-100 text-red-800'
                  : progress.isComplete
                    ? 'bg-green-100 text-green-800'
                    : progress.isProcessing
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800',
              ]"
            >
              {{ progress.statusLabel }}
            </span>
          </div>
          <div class="text-right space-y-1">
            <div v-if="progress.processingDuration" class="text-gray-600">
              Duration: {{ progress.processingDuration }}
            </div>
            <div
              v-if="progress.formattedEstimatedTime"
              class="text-blue-600 font-medium"
            >
              {{ progress.formattedEstimatedTime }}
            </div>
          </div>
        </div>

        <!-- Processing Message -->
        <div v-if="progress.message" class="text-center text-gray-600 text-sm">
          {{ progress.message }}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Current Employee Display -->
      <div class="lg:col-span-2">
        <div class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Current Employee
          </h3>

          <div v-if="progress.currentEmployee.employee_id" class="space-y-4">
            <!-- Employee Info Card -->
            <div class="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
              <div class="flex-shrink-0">
                <!-- Employee Avatar -->
                <div
                  class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold"
                >
                  {{
                    getEmployeeInitials(progress.currentEmployee.employee_name)
                  }}
                </div>
              </div>
              <div class="flex-1">
                <h4 class="text-lg font-medium text-gray-900">
                  {{ progress.currentEmployee.employee_name }}
                </h4>
                <p class="text-sm text-gray-600">
                  ID: {{ progress.currentEmployee.employee_id }}
                </p>
                <div class="mt-1">
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {{
                      formatProcessingStage(
                        progress.currentEmployee.processing_stage
                      )
                    }}
                  </span>
                </div>
              </div>
              <div class="flex-shrink-0">
                <!-- Processing indicator -->
                <div
                  class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-500">
            <div
              class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <p>No employee currently being processed</p>
          </div>
        </div>
      </div>

      <!-- Processing Statistics -->
      <div>
        <div class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Statistics</h3>

          <div class="space-y-4">
            <!-- Total Employees -->
            <div
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div
                  class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-1.658-.316-3.264-.888-4.712M7 20H2v-2a3 3 0 015.196-2.121M7 20v-2m5-12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <span class="font-medium">Total</span>
              </div>
              <span class="text-xl font-bold">{{
                progress.statistics.total_employees
              }}</span>
            </div>

            <!-- Completed Employees -->
            <div
              class="flex items-center justify-between p-3 bg-green-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div
                  class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span class="font-medium">Completed</span>
              </div>
              <span class="text-xl font-bold text-green-600">{{
                progress.statistics.completed_employees
              }}</span>
            </div>

            <!-- Processing Employees -->
            <div
              class="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div
                  class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-white animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <span class="font-medium">Processing</span>
              </div>
              <span class="text-xl font-bold text-blue-600">{{
                progress.statistics.processing_employees
              }}</span>
            </div>

            <!-- Issues/Needs Attention -->
            <div
              class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div
                  class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span class="font-medium">Issues</span>
              </div>
              <span class="text-xl font-bold text-yellow-600">{{
                progress.statistics.issues_employees
              }}</span>
            </div>

            <!-- Pending Employees -->
            <div
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div
                  class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span class="font-medium">Pending</span>
              </div>
              <span class="text-xl font-bold text-gray-600">{{
                progress.statistics.pending_employees
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Processing Controls -->
    <div v-if="sessionStore.hasSession" class="card mt-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">
        Processing Controls
      </h3>

      <div class="flex items-center justify-center space-x-4">
        <!-- Start Processing -->
        <button
          v-if="!progress.isProcessing && !progress.isComplete"
          :disabled="!sessionStore.hasFiles || api.isLoading"
          class="flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="handleStartProcessing"
        >
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4v8a2 2 0 002 2h8a2 2 0 002-2v-8M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2M9 6h6"
            />
          </svg>
          Start Processing
        </button>

        <!-- Pause Processing -->
        <button
          v-if="progress.isProcessing"
          :disabled="api.isLoading"
          class="flex items-center px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="handlePauseProcessing"
        >
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 9v6m4-6v6"
            />
          </svg>
          Pause
        </button>

        <!-- Resume Processing -->
        <button
          v-if="progress.status === 'paused'"
          :disabled="api.isLoading"
          class="flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="handleResumeProcessing"
        >
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4v8a2 2 0 002 2h8a2 2 0 002-2v-8M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2M9 6h6"
            />
          </svg>
          Resume
        </button>

        <!-- Cancel Processing -->
        <button
          v-if="progress.isProcessing || progress.status === 'paused'"
          :disabled="api.isLoading"
          class="flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="showCancelConfirmation = true"
        >
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Cancel
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="api.isLoading" class="flex items-center justify-center mt-4">
        <div class="flex items-center space-x-2 text-gray-600">
          <div
            class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"
          ></div>
          <span class="text-sm">Processing request...</span>
        </div>
      </div>
    </div>

    <!-- Activity Feed -->
    <div v-if="progress.recentActivities.length > 0" class="card mt-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>

      <div class="space-y-3 max-h-64 overflow-y-auto">
        <div
          v-for="(activity, index) in progress.recentActivities"
          :key="`activity-${index}`"
          class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
        >
          <div class="flex-shrink-0 mt-1">
            <div
              :class="getActivityIconClass(activity.type)"
              class="w-6 h-6 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="getActivityIconPath(activity.type)"
                />
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900">
              {{ activity.message || activity.description }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ formatActivityTime(activity.timestamp) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Confirmation Modal -->
    <div
      v-if="showCancelConfirmation"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Cancel Processing
        </h3>
        <p class="text-sm text-gray-600 mb-6">
          Are you sure you want to cancel processing? This action cannot be
          undone and all progress will be lost.
        </p>
        <div class="flex space-x-4">
          <button
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            @click="showCancelConfirmation = false"
          >
            Keep Processing
          </button>
          <button
            :disabled="api.isLoading"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="handleCancelProcessing"
          >
            {{ api.isLoading ? 'Canceling...' : 'Cancel Processing' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="progress.hasError" class="card border-red-200 bg-red-50 mt-6">
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <svg
            class="h-5 w-5 text-red-400"
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
          <h4 class="text-sm font-medium text-red-800">Processing Error</h4>
          <p class="text-sm text-red-700 mt-1">
            {{ progress.error }}
          </p>
        </div>
        <div class="flex-shrink-0 ml-auto">
          <button
            class="text-red-600 hover:text-red-800"
            @click="progress.error = null"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSessionStore } from '../stores/session.js'
import { useApi } from '../composables/useApi.js'
import { useProgress } from '../composables/useProgress.js'

// Stores and composables
const sessionStore = useSessionStore()
const api = useApi()
const progress = useProgress()

// Local state
const showCancelConfirmation = ref(false)

// Props (if needed for parent communication)
const props = defineProps({
  sessionId: {
    type: String,
    default: null,
  },
  autoStart: {
    type: Boolean,
    default: false,
  },
})

// Start polling when component mounts if session exists
onMounted(() => {
  const targetSessionId = props.sessionId || sessionStore.sessionId

  if (targetSessionId) {
    // Fetch initial status
    progress.fetchProgress(targetSessionId).catch(error => {
      console.warn('Failed to fetch initial progress:', error)
    })

    // Start polling if processing is active
    if (progress.isProcessing || props.autoStart) {
      progress.startPolling(targetSessionId)
    }
  }
})

// Stop polling when component unmounts
onUnmounted(() => {
  progress.stopPolling()
})

// Watch for session changes and restart polling if needed
watch(
  () => sessionStore.sessionId,
  (newSessionId, oldSessionId) => {
    if (newSessionId !== oldSessionId) {
      progress.stopPolling()
      progress.clearError() // Clear any previous errors when switching sessions
      if (newSessionId) {
        progress.fetchProgress(newSessionId).catch(error => {
          console.warn('Failed to fetch progress for new session:', error)
        })
      }
    }
  }
)

// Watch for file uploads and clear errors
watch(
  () => sessionStore.uploadedFiles.length,
  (newCount, oldCount) => {
    if (newCount > oldCount) {
      // Files were uploaded, clear any previous errors
      progress.clearError()
    }
  }
)

// Processing control handlers
async function handleStartProcessing() {
  const targetSessionId = props.sessionId || sessionStore.sessionId
  if (!targetSessionId) return

  try {
    await api.startProcessing(targetSessionId)
    progress.startPolling(targetSessionId)
    sessionStore.setProcessingStatus('processing')
  } catch (error) {
    console.error('Failed to start processing:', error)
    sessionStore.setError(`Failed to start processing: ${error.message}`)
  }
}

async function handlePauseProcessing() {
  const targetSessionId = props.sessionId || sessionStore.sessionId
  if (!targetSessionId) return

  try {
    await api.pauseProcessing(targetSessionId)
    // Continue polling to see status update
  } catch (error) {
    console.error('Failed to pause processing:', error)
    progress.error = `Failed to pause processing: ${error.message}`
  }
}

async function handleResumeProcessing() {
  const targetSessionId = props.sessionId || sessionStore.sessionId
  if (!targetSessionId) return

  try {
    await api.resumeProcessing(targetSessionId)
    // Continue polling to see status update
  } catch (error) {
    console.error('Failed to resume processing:', error)
    progress.error = `Failed to resume processing: ${error.message}`
  }
}

async function handleCancelProcessing() {
  const targetSessionId = props.sessionId || sessionStore.sessionId
  if (!targetSessionId) return

  try {
    await api.cancelProcessing(targetSessionId)
    showCancelConfirmation.value = false
    progress.stopPolling()
    sessionStore.setProcessingStatus('idle')
  } catch (error) {
    console.error('Failed to cancel processing:', error)
    progress.error = `Failed to cancel processing: ${error.message}`
  }
}

// Helper functions
function getEmployeeInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function formatProcessingStage(stage) {
  if (!stage) return 'Processing'

  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getActivityIconClass(type) {
  const classes = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    default: 'bg-gray-500',
  }
  return classes[type] || classes.default
}

function getActivityIconPath(type) {
  const paths = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    success: 'M5 13l4 4L19 7',
    warning: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    error: 'M6 18L18 6M6 6l12 12',
    processing:
      'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    completed: 'M5 13l4 4L19 7',
    default: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  }
  return paths[type] || paths.default
}

function formatActivityTime(timestamp) {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`

  return date.toLocaleDateString()
}

// Keyboard shortcuts
function handleKeydown(event) {
  // Spacebar to pause/resume (when not in input field)
  if (event.code === 'Space' && !event.target.matches('input, textarea')) {
    event.preventDefault()
    if (progress.isProcessing) {
      handlePauseProcessing()
    } else if (progress.status === 'paused') {
      handleResumeProcessing()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
@keyframes stripe-animation {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 30px 0;
  }
}

.animate-stripe {
  animation: stripe-animation 2s linear infinite;
}

/* Card styles */
.card {
  @apply bg-white rounded-lg border border-gray-200 shadow-sm p-6;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .progress-tracker .grid {
    @apply grid-cols-1;
  }

  .progress-tracker .card {
    @apply p-4;
  }

  .progress-tracker .flex.space-x-4 {
    @apply flex-col space-x-0 space-y-2;
  }
}

/* Focus styles for better accessibility */
.progress-tracker button:focus {
  @apply outline-none ring-2 ring-offset-2;
}

/* Activity feed scrollbar styling */
.progress-tracker .overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175) transparent;
}

.progress-tracker .overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.progress-tracker .overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.progress-tracker .overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgb(156 163 175);
  border-radius: 3px;
}
</style>
