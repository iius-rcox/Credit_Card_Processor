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
          <!-- Indeterminate Progress (when total unknown) -->
          <div
            v-if="progress.isIndeterminate"
            class="w-full bg-gray-200 rounded-full h-6 overflow-hidden"
          >
            <div class="h-6 relative overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full indeterminate-progress"></div>
            </div>
          </div>

          <!-- Determinate Progress (when total known) -->
          <div
            v-else
            class="w-full bg-gray-200 rounded-full h-6 overflow-hidden"
          >
            <div
              :class="[
                'h-6 rounded-full',
                progress.totalEmployees > 0 ? 'transition-all duration-500 ease-out' : '',
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

          <!-- Progress percentage overlay (only for determinate) -->
          <div
            v-if="!progress.isIndeterminate"
            class="absolute inset-0 flex items-center justify-center"
          >
            <span class="text-sm font-semibold text-white drop-shadow-sm">
              {{ progress.progressPercentage }}%
            </span>
          </div>
        </div>

        <!-- Progress Counters -->
        <div class="text-center text-gray-600 text-sm">
          {{ progress.progressCounters }}
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



    <!-- Activity Feed -->
    <div v-if="progress.recentActivities.length > 0" class="card mt-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>

      <div class="space-y-3 max-h-64 overflow-y-auto">
        <div
          v-for="(activity, index) in progress.recentActivities"
          :key="activity.id || activity.activity_id || activity.timestamp || index"
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

// Local state (removed unused showCancelConfirmation)

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

// Processing control handlers removed (no longer needed)

// Helper functions (removed unused employee and processing stage formatters)

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

// Keyboard shortcuts removed (were only for processing controls)
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

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
    width: 30%;
  }
  50% {
    transform: translateX(50%);
    width: 60%;
  }
  100% {
    transform: translateX(400%);
    width: 30%;
  }
}

.animate-stripe {
  animation: stripe-animation 2s linear infinite;
}

.indeterminate-progress {
  animation: indeterminate 2s ease-in-out infinite;
}

/* Card styles */
.card {
  @apply bg-white rounded-lg border border-gray-200 shadow-sm p-6;
}

/* Responsive adjustments (simplified after removing sections) */
@media (max-width: 768px) {
  .progress-tracker .card {
    @apply p-4;
  }
}

/* Focus styles removed (no buttons remaining) */

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
