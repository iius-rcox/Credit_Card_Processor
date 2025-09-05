<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Delta Comparison Analysis</h3>
          <p class="text-sm text-gray-600 mt-1">
            Detailed comparison between base session and current changes
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <button 
            @click="refreshAnalysis"
            :disabled="isLoading"
            class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh analysis"
          >
            <svg :class="{ 'animate-spin': isLoading }" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div class="flex rounded-lg border">
            <button 
              v-for="view in viewOptions"
              :key="view.value"
              @click="currentView = view.value"
              :class="[
                'px-3 py-1 text-sm font-medium transition-colors',
                currentView === view.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              ]"
            >
              {{ view.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-12 text-center">
      <div class="inline-flex items-center space-x-3">
        <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-gray-600">Analyzing changes...</span>
      </div>
    </div>

    <!-- Comparison Content -->
    <div v-else class="p-6">
      <!-- Summary Stats -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-700">{{ stats.unchanged }}</div>
          <div class="text-sm text-green-600">Unchanged</div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-yellow-700">{{ stats.modified }}</div>
          <div class="text-sm text-yellow-600">Modified</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-700">{{ stats.added }}</div>
          <div class="text-sm text-blue-600">Added</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-red-700">{{ stats.removed }}</div>
          <div class="text-sm text-red-600">Removed</div>
        </div>
      </div>

      <!-- File Changes Overview -->
      <div class="mb-6 space-y-4">
        <h4 class="text-md font-semibold text-gray-900">File Changes</h4>
        <div class="grid grid-cols-2 gap-4">
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">CAR File</span>
              <span :class="fileStatusClasses(comparison.car_match)" class="px-2 py-1 rounded-full text-xs font-medium">
                {{ comparison.car_match ? 'Unchanged' : 'Changed' }}
              </span>
            </div>
            <div class="text-xs text-gray-500 font-mono break-all">
              {{ comparison.car_checksum }}
            </div>
          </div>
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">Receipt File</span>
              <span :class="fileStatusClasses(comparison.receipt_match)" class="px-2 py-1 rounded-full text-xs font-medium">
                {{ comparison.receipt_match ? 'Unchanged' : 'Changed' }}
              </span>
            </div>
            <div class="text-xs text-gray-500 font-mono break-all">
              {{ comparison.receipt_checksum }}
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Views -->
      <div class="space-y-6">
        <!-- Summary View -->
        <div v-if="currentView === 'summary'" class="space-y-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <h5 class="text-sm font-semibold text-gray-900 mb-2">Processing Impact</h5>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-gray-600">Estimated Processing Time</div>
                <div class="text-lg font-semibold text-gray-900">{{ formatTime(estimate.processing_time) }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-600">Confidence Score</div>
                <div class="flex items-center space-x-2">
                  <div class="text-lg font-semibold text-gray-900">{{ Math.round(comparison.confidence_score * 100) }}%</div>
                  <div class="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full"
                      :style="{ width: (comparison.confidence_score * 100) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 class="text-sm font-semibold text-blue-900 mb-2">Recommendation</h5>
            <div class="flex items-center space-x-3">
              <span :class="recommendationClasses" class="px-3 py-1 rounded-full text-sm font-medium">
                {{ formatRecommendation(comparison.recommendation) }}
              </span>
              <span class="text-sm text-blue-700">{{ getRecommendationDescription(comparison.recommendation) }}</span>
            </div>
          </div>
        </div>

        <!-- Employee Changes View -->
        <div v-else-if="currentView === 'employees'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h5 class="text-sm font-semibold text-gray-900">Employee Changes</h5>
            <div class="flex items-center space-x-2">
              <button 
                @click="expandAll"
                class="text-sm text-blue-600 hover:text-blue-700"
              >
                Expand All
              </button>
              <button 
                @click="collapseAll"
                class="text-sm text-blue-600 hover:text-blue-700"
              >
                Collapse All
              </button>
            </div>
          </div>

          <!-- Change Categories -->
          <div class="space-y-3">
            <div v-if="employeeChanges.added.length > 0" class="border rounded-lg">
              <button 
                @click="toggleExpand('added')"
                class="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
              >
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-medium text-blue-900">
                    Added Employees ({{ employeeChanges.added.length }})
                  </span>
                </div>
                <svg 
                  :class="{ 'rotate-180': expandedSections.added }"
                  class="w-4 h-4 text-blue-600 transition-transform"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-if="expandedSections.added" class="p-4 border-t border-blue-200">
                <div class="space-y-2">
                  <div v-for="employee in employeeChanges.added" :key="employee.id" class="flex items-center justify-between p-2 bg-white rounded border">
                    <span class="font-medium">{{ employee.name }}</span>
                    <span class="text-sm text-gray-600">{{ employee.email }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="employeeChanges.modified.length > 0" class="border rounded-lg">
              <button 
                @click="toggleExpand('modified')"
                class="w-full px-4 py-3 bg-yellow-50 hover:bg-yellow-100 transition-colors flex items-center justify-between"
              >
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-medium text-yellow-900">
                    Modified Employees ({{ employeeChanges.modified.length }})
                  </span>
                </div>
                <svg 
                  :class="{ 'rotate-180': expandedSections.modified }"
                  class="w-4 h-4 text-yellow-600 transition-transform"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-if="expandedSections.modified" class="p-4 border-t border-yellow-200">
                <div class="space-y-3">
                  <div v-for="employee in employeeChanges.modified" :key="employee.id" class="border rounded-lg p-3 bg-white">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-medium">{{ employee.name }}</span>
                      <span class="text-sm text-gray-600">{{ employee.changes.length }} changes</span>
                    </div>
                    <div class="space-y-1">
                      <div v-for="change in employee.changes" :key="change.field" class="text-sm">
                        <span class="font-medium text-gray-700">{{ change.field }}:</span>
                        <span class="text-red-600 line-through ml-2">{{ change.old }}</span>
                        <span class="text-green-600 ml-2">→ {{ change.new }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="employeeChanges.removed.length > 0" class="border rounded-lg">
              <button 
                @click="toggleExpand('removed')"
                class="w-full px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-between"
              >
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-medium text-red-900">
                    Removed Employees ({{ employeeChanges.removed.length }})
                  </span>
                </div>
                <svg 
                  :class="{ 'rotate-180': expandedSections.removed }"
                  class="w-4 h-4 text-red-600 transition-transform"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-if="expandedSections.removed" class="p-4 border-t border-red-200">
                <div class="space-y-2">
                  <div v-for="employee in employeeChanges.removed" :key="employee.id" class="flex items-center justify-between p-2 bg-white rounded border">
                    <span class="font-medium">{{ employee.name }}</span>
                    <span class="text-sm text-gray-600">{{ employee.email }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Technical Details View -->
        <div v-else-if="currentView === 'technical'" class="space-y-4">
          <div class="grid grid-cols-2 gap-6">
            <div>
              <h5 class="text-sm font-semibold text-gray-900 mb-3">Base Session</h5>
              <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Session ID:</span>
                  <span class="text-gray-600 ml-2 font-mono text-xs">{{ baseSession?.session_id }}</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Created:</span>
                  <span class="text-gray-600 ml-2">{{ formatDate(baseSession?.created_at) }}</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Employees:</span>
                  <span class="text-gray-600 ml-2">{{ baseSession?.total_employees }}</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Status:</span>
                  <span class="text-gray-600 ml-2 capitalize">{{ baseSession?.status }}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h5 class="text-sm font-semibold text-gray-900 mb-3">Analysis Details</h5>
              <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Match Type:</span>
                  <span class="text-gray-600 ml-2 capitalize">{{ comparison.match_type?.replace('_', ' ') }}</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Analysis Time:</span>
                  <span class="text-gray-600 ml-2">{{ formatDate(comparison.analysis_timestamp) }}</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Processing Est.:</span>
                  <span class="text-gray-600 ml-2">{{ formatTime(comparison.processing_time_estimate) }}</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-gray-700">Change Est.:</span>
                  <span class="text-gray-600 ml-2">{{ comparison.employee_change_estimate || 0 }} employees</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'DeltaComparisonView',
  props: {
    baseSession: {
      type: Object,
      required: true
    },
    comparison: {
      type: Object,
      required: true
    },
    employeeChanges: {
      type: Object,
      default: () => ({
        added: [],
        modified: [],
        removed: [],
        unchanged: []
      })
    }
  },
  emits: ['refresh', 'export-changes'],
  setup(props, { emit }) {
    // Reactive data
    const isLoading = ref(false)
    const currentView = ref('summary')
    const expandedSections = ref({
      added: false,
      modified: false,
      removed: false
    })

    // View options
    const viewOptions = [
      { value: 'summary', label: 'Summary' },
      { value: 'employees', label: 'Employees' },
      { value: 'technical', label: 'Technical' }
    ]

    // Computed properties
    const stats = computed(() => ({
      unchanged: props.employeeChanges.unchanged?.length || 0,
      modified: props.employeeChanges.modified?.length || 0,
      added: props.employeeChanges.added?.length || 0,
      removed: props.employeeChanges.removed?.length || 0
    }))

    const estimate = computed(() => ({
      processing_time: props.comparison.processing_time_estimate || 0
    }))

    const recommendationClasses = computed(() => {
      switch (props.comparison.recommendation) {
        case 'skip_processing':
          return 'bg-green-100 text-green-800'
        case 'delta_processing':
          return 'bg-yellow-100 text-yellow-800'
        case 'full_processing':
          return 'bg-red-100 text-red-800'
        case 'review_required':
          return 'bg-blue-100 text-blue-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    })

    // Methods
    const fileStatusClasses = (isMatch) => {
      return isMatch 
        ? 'bg-green-100 text-green-800' 
        : 'bg-yellow-100 text-yellow-800'
    }

    const formatRecommendation = (recommendation) => {
      const map = {
        'skip_processing': 'Skip Processing',
        'delta_processing': 'Delta Processing',
        'full_processing': 'Full Processing',
        'review_required': 'Review Required'
      }
      return map[recommendation] || recommendation
    }

    const getRecommendationDescription = (recommendation) => {
      const map = {
        'skip_processing': 'Files are identical, reuse previous results',
        'delta_processing': 'Process only changed data for efficiency',
        'full_processing': 'Complete processing required',
        'review_required': 'Multiple options available, manual selection needed'
      }
      return map[recommendation] || ''
    }

    const formatTime = (seconds) => {
      if (!seconds) return '0s'
      if (seconds < 60) return `${seconds}s`
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const toggleExpand = (section) => {
      expandedSections.value[section] = !expandedSections.value[section]
    }

    const expandAll = () => {
      Object.keys(expandedSections.value).forEach(key => {
        expandedSections.value[key] = true
      })
    }

    const collapseAll = () => {
      Object.keys(expandedSections.value).forEach(key => {
        expandedSections.value[key] = false
      })
    }

    const refreshAnalysis = () => {
      isLoading.value = true
      emit('refresh')
      setTimeout(() => {
        isLoading.value = false
      }, 1000)
    }

    return {
      // Reactive data
      isLoading,
      currentView,
      expandedSections,

      // Constants
      viewOptions,

      // Computed
      stats,
      estimate,
      recommendationClasses,

      // Methods
      fileStatusClasses,
      formatRecommendation,
      getRecommendationDescription,
      formatTime,
      formatDate,
      toggleExpand,
      expandAll,
      collapseAll,
      refreshAnalysis
    }
  }
}
</script>