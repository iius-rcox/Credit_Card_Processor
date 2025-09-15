<template>
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="session-modal-title"
    role="dialog"
    aria-modal="true"
  >
    <!-- Background overlay -->
    <div
      class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
    >
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        aria-hidden="true"
        @click="$emit('close')"
      ></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full"
      >
        <!-- Header -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
          <div class="flex items-start justify-between">
            <div class="flex items-center">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100"
              >
                <svg
                  class="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div class="ml-4">
                <h3
                  id="session-modal-title"
                  class="text-lg leading-6 font-medium text-gray-900"
                >
                  Session Details
                </h3>
                <p class="text-sm text-gray-500">
                  {{ session.session_name || 'Unnamed Session' }}
                </p>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span class="sr-only">Close</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="bg-gray-50 px-4 py-5 sm:p-6">
          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-2 text-gray-600">Loading session details...</span>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="text-center py-12">
            <div class="text-red-600 mb-4">
              <svg class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Failed to Load Session Details</h3>
            <p class="text-gray-600 mb-4">{{ error }}</p>
            <button
              @click="loadSessionDetails"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>

          <!-- Session Details Content -->
          <div v-else class="space-y-6">
            <!-- Session Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="bg-white p-4 rounded-lg shadow-sm border">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-500">Status</p>
                    <p class="text-lg font-semibold text-gray-900">
                      <span :class="getStatusBadgeClass(session.status)">
                        {{ session.status }}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg shadow-sm border">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-500">Employees</p>
                    <p class="text-lg font-semibold text-gray-900">{{ session.employee_count || 0 }}</p>
                  </div>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg shadow-sm border">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-500">Progress</p>
                    <p class="text-lg font-semibold text-gray-900">{{ session.progress?.percentage || 0 }}%</p>
                  </div>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg shadow-sm border">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg class="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-500">Duration</p>
                    <p class="text-lg font-semibold text-gray-900">{{ formatDuration(session.duration) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Session Info -->
            <div class="bg-white rounded-lg shadow-sm border">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Session Information</h3>
                <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Session ID</dt>
                    <dd class="mt-1 text-sm text-gray-900 font-mono">{{ session.session_id }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Created By</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ session.created_by || 'Unknown' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Created At</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ formatDate(session.created_at) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ formatDate(session.updated_at) }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Progress Details (if session has detailed data) -->
            <div v-if="sessionDetails" class="bg-white rounded-lg shadow-sm border">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Processing Details</h3>
                
                <!-- Progress Bar -->
                <div v-if="sessionDetails.progress" class="mb-6">
                  <div class="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{{ sessionDetails.progress.percentage || 0 }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: (sessionDetails.progress.percentage || 0) + '%' }"
                    ></div>
                  </div>
                </div>

                <!-- Summary Statistics -->
                <div v-if="sessionDetails.summary" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="text-center p-3 bg-gray-50 rounded-lg">
                    <div class="text-2xl font-bold text-gray-900">{{ sessionDetails.summary.total_employees || 0 }}</div>
                    <div class="text-sm text-gray-500">Total</div>
                  </div>
                  <div class="text-center p-3 bg-green-50 rounded-lg">
                    <div class="text-2xl font-bold text-green-600">{{ sessionDetails.summary.valid_employees || 0 }}</div>
                    <div class="text-sm text-gray-500">Valid</div>
                  </div>
                  <div class="text-center p-3 bg-yellow-50 rounded-lg">
                    <div class="text-2xl font-bold text-yellow-600">{{ sessionDetails.summary.issues_employees || 0 }}</div>
                    <div class="text-sm text-gray-500">Issues</div>
                  </div>
                  <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600">{{ sessionDetails.summary.resolved_employees || 0 }}</div>
                    <div class="text-sm text-gray-500">Resolved</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
          <button
            v-if="session.status === 'COMPLETED'"
            @click="viewResults"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            View Results
          </button>
          <button
            @click="$emit('close')"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useApi } from '@/composables/useApi.js'

export default {
  name: 'SessionDetailsModal',
  props: {
    session: {
      type: Object,
      required: true
    }
  },
  emits: ['close'],
  data() {
    return {
      loading: false,
      error: null,
      sessionDetails: null
    }
  },
  setup() {
    const api = useApi()
    return { api }
  },
  mounted() {
    this.loadSessionDetails()
  },
  methods: {
    async loadSessionDetails() {
      if (!this.session.session_id) return

      this.loading = true
      this.error = null

      try {
        // Try to get more detailed session information
        const details = await this.api.getSession(this.session.session_id)
        this.sessionDetails = details

        // If completed, also try to get summary data
        if (this.session.status === 'COMPLETED') {
          try {
            const summary = await this.api.getSummary(this.session.session_id)
            this.sessionDetails.summary = summary
          } catch (summaryError) {
            console.warn('Could not load session summary:', summaryError)
          }
        }
      } catch (error) {
        console.error('Failed to load session details:', error)
        this.error = error.message || 'Failed to load session details'
      } finally {
        this.loading = false
      }
    },

    viewResults() {
      // Emit event to parent to handle results viewing
      this.$emit('view-results', this.session.session_id)
      this.$emit('close')
    },

    getStatusBadgeClass(status) {
      const statusClasses = {
        'PENDING': 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full',
        'UPLOADING': 'px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full',
        'PROCESSING': 'px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full',
        'EXTRACTING': 'px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full',
        'ANALYZING': 'px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full',
        'PAUSED': 'px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full',
        'COMPLETED': 'px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full',
        'FAILED': 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full',
        'CANCELLED': 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full'
      }
      return statusClasses[status] || statusClasses['PENDING']
    },

    formatDate(dateString) {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleString()
    },

    formatDuration(ms) {
      if (!ms || ms <= 0) return '0s'
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`
      } else {
        return `${seconds}s`
      }
    }
  }
}
</script>

<style scoped>
/* Additional styles if needed */
</style>