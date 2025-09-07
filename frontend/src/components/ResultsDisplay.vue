<template>
  <div class="results-display">
    <!-- Results Summary Header -->
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Processing Results</h2>
        <div class="flex items-center space-x-4">
          <button
            v-if="hasIssues && selectedEmployees.length > 0"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            @click="showBulkResolutionModal = true"
          >
            Resolve Selected ({{ selectedEmployees.length }})
          </button>
          <button
            :disabled="isLoading"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            @click="refreshResults"
          >
            {{ isLoading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <!-- Session Summary -->
      <div
        v-if="sessionSummary"
        class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-blue-900">
            {{ sessionSummary.total_employees }}
          </div>
          <div class="text-sm text-blue-600">Total Employees</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-green-900">
            {{ sessionSummary.completed_employees }}
          </div>
          <div class="text-sm text-green-600">Ready for Export</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-yellow-900">
            {{ sessionSummary.issues_employees }}
          </div>
          <div class="text-sm text-yellow-600">Need Attention</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-gray-900">
            {{ sessionSummary.processing_duration }}
          </div>
          <div class="text-sm text-gray-600">Processing Time</div>
        </div>
      </div>

      <!-- Delta Comparison Info (if applicable) -->
      <div v-if="isDeltaSession" class="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div class="flex items-center space-x-3 mb-3">
          <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 class="text-lg font-semibold text-purple-900">Delta Comparison Session</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="bg-white p-3 rounded border">
            <div class="font-medium text-gray-900 mb-1">Baseline Session</div>
            <div class="text-purple-600">{{ sessionSummary.delta_baseline_session || 'N/A' }}</div>
          </div>
          
          <div class="bg-white p-3 rounded border">
            <div class="font-medium text-gray-900 mb-1">Changes Detected</div>
            <div class="text-purple-600">{{ deltaChanges.total || 0 }} employee(s)</div>
          </div>
          
          <div class="bg-white p-3 rounded border">
            <div class="font-medium text-gray-900 mb-1">Change Types</div>
            <div class="text-purple-600 text-xs">
              <span v-if="deltaChanges.new > 0" class="inline-block mr-2">+{{ deltaChanges.new }} new</span>
              <span v-if="deltaChanges.modified > 0" class="inline-block mr-2">~{{ deltaChanges.modified }} changed</span>
              <span v-if="deltaChanges.removed > 0" class="inline-block">-{{ deltaChanges.removed }} removed</span>
            </div>
          </div>
        </div>
        
        <div class="mt-3 text-xs text-purple-700">
          <span class="font-medium">Legend:</span>
          <span class="ml-2">🆕 New employees</span>
          <span class="ml-2">📝 Modified data</span>
          <span class="ml-2">❌ No longer present</span>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Search Employees</label
          >
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name, ID, or department..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Status Filter</label
          >
          <select
            v-model="statusFilter"
            class="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="VALID">Ready for Export</option>
            <option value="NEEDS_ATTENTION">Needs Attention</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Sort By</label
          >
          <select
            v-model="sortBy"
            class="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Employee Name</option>
            <option value="department">Department</option>
            <option value="amount">CAR Amount</option>
            <option value="variance">Variance</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !results" class="card text-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
      ></div>
      <p class="text-gray-600">Loading results...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card border-red-200 bg-red-50">
      <div class="flex items-center space-x-3">
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
        <div>
          <h4 class="text-sm font-medium text-red-800">
            Failed to Load Results
          </h4>
          <p class="text-sm text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- No Results -->
    <div v-else-if="!results?.employees?.length" class="card text-center py-12">
      <svg
        class="mx-auto h-12 w-12 text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No Results Available
      </h3>
      <p class="text-gray-600">No employee results found for this session.</p>
    </div>

    <!-- Employee Groups -->
    <div v-else class="space-y-6">
      <!-- Ready for Export Group -->
      <div v-if="validEmployees.length > 0" class="card">
        <div
          class="flex items-center justify-between p-4 cursor-pointer"
          @click="toggleGroup('valid')"
        >
          <div class="flex items-center space-x-3">
            <svg
              :class="[
                'w-5 h-5 text-gray-500 transition-transform',
                expandedGroups.valid ? 'rotate-90' : '',
              ]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
            <h3 class="text-lg font-semibold text-gray-900">
              Ready for Export
            </h3>
            <span
              class="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full"
            >
              {{ validEmployees.length }}
            </span>
          </div>
          <div class="text-sm text-gray-500">All validations passed</div>
        </div>

        <div v-show="expandedGroups.valid" class="px-4 pb-4">
          <div class="space-y-3">
            <EmployeeCard
              v-for="employee in validEmployees"
              :key="employee.revision_id"
              :employee="employee"
              :is-selected="selectedEmployees.includes(employee.revision_id)"
              @select="toggleEmployeeSelection"
              @resolve="handleResolveIssue"
            />
          </div>
        </div>
      </div>

      <!-- Needs Attention Group -->
      <div v-if="issuesEmployees.length > 0" class="card">
        <div
          class="flex items-center justify-between p-4 cursor-pointer"
          @click="toggleGroup('issues')"
        >
          <div class="flex items-center space-x-3">
            <svg
              :class="[
                'w-5 h-5 text-gray-500 transition-transform',
                expandedGroups.issues ? 'rotate-90' : '',
              ]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <h3 class="text-lg font-semibold text-gray-900">Needs Attention</h3>
            <span
              class="bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded-full"
            >
              {{ issuesEmployees.length }}
            </span>
          </div>
          <div class="flex items-center space-x-2">
            <input
              type="checkbox"
              :checked="allIssuesSelected"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              @change="toggleAllIssuesSelection"
            />
            <span class="text-sm text-gray-500">Select All</span>
          </div>
        </div>

        <div v-show="expandedGroups.issues" class="px-4 pb-4">
          <div class="space-y-3">
            <EmployeeCard
              v-for="employee in issuesEmployees"
              :key="employee.revision_id"
              :employee="employee"
              :is-selected="selectedEmployees.includes(employee.revision_id)"
              show-selection
              @select="toggleEmployeeSelection"
              @resolve="handleResolveIssue"
            />
          </div>
        </div>
      </div>

      <!-- Resolved Group -->
      <div v-if="resolvedEmployees.length > 0" class="card">
        <div
          class="flex items-center justify-between p-4 cursor-pointer"
          @click="toggleGroup('resolved')"
        >
          <div class="flex items-center space-x-3">
            <svg
              :class="[
                'w-5 h-5 text-gray-500 transition-transform',
                expandedGroups.resolved ? 'rotate-90' : '',
              ]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h3 class="text-lg font-semibold text-gray-900">Resolved</h3>
            <span
              class="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full"
            >
              {{ resolvedEmployees.length }}
            </span>
          </div>
          <div class="text-sm text-gray-500">Previously resolved issues</div>
        </div>

        <div v-show="expandedGroups.resolved" class="px-4 pb-4">
          <div class="space-y-3">
            <EmployeeCard
              v-for="employee in resolvedEmployees"
              :key="employee.revision_id"
              :employee="employee"
              @resolve="handleResolveIssue"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Export Actions Integration -->
    <div v-if="results?.employees?.length > 0" class="mt-6">
      <ExportActions :session-id="sessionId" />
    </div>

    <!-- Single Employee Resolution Modal -->
    <ResolutionModal
      v-if="showResolutionModal"
      :employee="selectedEmployee"
      @close="showResolutionModal = false"
      @resolve="handleEmployeeResolution"
    />

    <!-- Bulk Resolution Modal -->
    <BulkResolutionModal
      v-if="showBulkResolutionModal"
      :employees="selectedEmployeesData"
      @close="showBulkResolutionModal = false"
      @resolve="handleBulkResolution"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useApi } from '@/composables/useApi'
import EmployeeCard from './EmployeeCard.vue'
import ResolutionModal from './ResolutionModal.vue'
import BulkResolutionModal from './BulkResolutionModal.vue'
import ExportActions from './ExportActions.vue'

// Props
const props = defineProps({
  sessionId: {
    type: String,
    required: true,
  },
})

// Store and API
const sessionStore = useSessionStore()
const api = useApi()

// State
const results = ref(null)
const isLoading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const statusFilter = ref('all')
const sortBy = ref('name')
const selectedEmployees = ref([])
const expandedGroups = ref({
  valid: true,
  issues: true,
  resolved: false,
})

// Modals
const showResolutionModal = ref(false)
const showBulkResolutionModal = ref(false)
const selectedEmployee = ref(null)

// Computed Properties
const sessionSummary = computed(() => results.value?.session_summary)

const employees = computed(() => {
  try {
    if (!results.value?.employees) return []

    let filtered = results.value.employees

    // Apply search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      filtered = filtered.filter(
        emp => {
          try {
            return emp.employee_name?.toLowerCase().includes(query) ||
                   emp.employee_id?.toLowerCase().includes(query) ||
                   emp.department?.toLowerCase().includes(query)
          } catch (e) {
            console.warn('Error filtering employee:', emp, e)
            return false
          }
        }
      )
    }

    // Apply status filter
    if (statusFilter.value !== 'all') {
      filtered = filtered.filter(
        emp => {
          try {
            return emp.validation_status === statusFilter.value
          } catch (e) {
            console.warn('Error status filtering employee:', emp, e)
            return false
          }
        }
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      try {
        switch (sortBy.value) {
          case 'name':
            return (a.employee_name || '').localeCompare(b.employee_name || '')
          case 'department':
            return (a.department || '').localeCompare(b.department || '')
          case 'amount':
            return (b.car_amount || 0) - (a.car_amount || 0)
          case 'variance': {
            const varianceA = Math.abs(
              (a.car_amount || 0) - (a.receipt_amount || 0)
            )
            const varianceB = Math.abs(
              (b.car_amount || 0) - (b.receipt_amount || 0)
            )
            return varianceB - varianceA
          }
          case 'status':
            return (a.validation_status || '').localeCompare(
              b.validation_status || ''
            )
          default:
            return 0
        }
      } catch (e) {
        console.warn('Error sorting employees:', a, b, e)
        return 0
      }
    })

    return filtered
  } catch (e) {
    console.error('Error in employees computed property:', e)
    return []
  }
})

const validEmployees = computed(() => {
  try {
    return employees.value.filter(emp => emp?.validation_status === 'VALID')
  } catch (e) {
    console.error('Error in validEmployees computed:', e)
    return []
  }
})

const issuesEmployees = computed(() => {
  try {
    return employees.value.filter(emp => emp?.validation_status === 'NEEDS_ATTENTION')
  } catch (e) {
    console.error('Error in issuesEmployees computed:', e)
    return []
  }
})

const resolvedEmployees = computed(() => {
  try {
    return employees.value.filter(emp => emp?.validation_status === 'RESOLVED')
  } catch (e) {
    console.error('Error in resolvedEmployees computed:', e)
    return []
  }
})

const hasIssues = computed(() => {
  try {
    return issuesEmployees.value.length > 0
  } catch (e) {
    console.error('Error in hasIssues computed:', e)
    return false
  }
})

const allIssuesSelected = computed(() => {
  try {
    if (issuesEmployees.value.length === 0) return false
    return issuesEmployees.value.every(emp =>
      selectedEmployees.value.includes(emp?.revision_id)
    )
  } catch (e) {
    console.error('Error in allIssuesSelected computed:', e)
    return false
  }
})

const selectedEmployeesData = computed(() => {
  try {
    return employees.value.filter(emp =>
      selectedEmployees.value.includes(emp?.revision_id)
    )
  } catch (e) {
    console.error('Error in selectedEmployeesData computed:', e)
    return []
  }
})

const isDeltaSession = computed(() => {
  return results.value?.session_summary?.is_delta_session || false
})

const deltaChanges = computed(() => {
  if (!isDeltaSession.value || !results.value?.employees) {
    return { total: 0, new: 0, modified: 0, removed: 0 }
  }
  
  const changes = { total: 0, new: 0, modified: 0, removed: 0 }
  
  results.value.employees.forEach(emp => {
    if (emp.delta_change) {
      changes.total++
      switch (emp.delta_change) {
        case 'new':
          changes.new++
          break
        case 'modified':
          changes.modified++
          break
        case 'removed':
          changes.removed++
          break
      }
    }
  })
  
  return changes
})

// Methods
async function loadResults() {
  if (!props.sessionId) return

  isLoading.value = true
  error.value = null

  try {
    console.log('ResultsDisplay: Loading results for session:', props.sessionId)
    const response = await api.getResults(props.sessionId)
    console.log('ResultsDisplay: Received response:', { 
      employees: response?.employees?.length || 0, 
      sessionSummary: !!response?.session_summary 
    })
    
    // Defensive validation of response data
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response data received from API')
    }
    
    // Ensure employees array is valid
    if (response.employees && !Array.isArray(response.employees)) {
      console.error('Invalid employees data type:', typeof response.employees)
      response.employees = []
    }
    
    // Validate each employee record has required fields
    if (response.employees) {
      response.employees = response.employees.map((emp, index) => {
        if (!emp || typeof emp !== 'object') {
          console.warn(`Invalid employee at index ${index}:`, emp)
          return {
            revision_id: `invalid-${index}`,
            employee_name: 'Invalid Data',
            employee_id: `invalid-${index}`,
            validation_status: 'NEEDS_ATTENTION'
          }
        }
        
        // Ensure required fields exist
        return {
          revision_id: emp.revision_id || `emp-${index}`,
          employee_name: emp.employee_name || 'Unknown',
          employee_id: emp.employee_id || 'Unknown',
          validation_status: emp.validation_status || 'NEEDS_ATTENTION',
          department: emp.department || '',
          car_amount: emp.car_amount || 0,
          receipt_amount: emp.receipt_amount || 0,
          ...emp // Keep other properties
        }
      })
    }
    
    results.value = response
    console.log('ResultsDisplay: Results set successfully')

    // Update session store with results
    sessionStore.setResults(response)
  } catch (err) {
    error.value = err.message
    console.error('ResultsDisplay: Failed to load results:', err)
    console.error('ResultsDisplay: Error stack:', err.stack)
  } finally {
    isLoading.value = false
  }
}

async function refreshResults() {
  await loadResults()
}

function toggleGroup(group) {
  expandedGroups.value[group] = !expandedGroups.value[group]
}

function toggleEmployeeSelection(revisionId) {
  const index = selectedEmployees.value.indexOf(revisionId)
  if (index > -1) {
    selectedEmployees.value.splice(index, 1)
  } else {
    selectedEmployees.value.push(revisionId)
  }
}

function toggleAllIssuesSelection(event) {
  if (event.target.checked) {
    // Select all issues employees
    issuesEmployees.value.forEach(emp => {
      if (!selectedEmployees.value.includes(emp.revision_id)) {
        selectedEmployees.value.push(emp.revision_id)
      }
    })
  } else {
    // Deselect all issues employees
    issuesEmployees.value.forEach(emp => {
      const index = selectedEmployees.value.indexOf(emp.revision_id)
      if (index > -1) {
        selectedEmployees.value.splice(index, 1)
      }
    })
  }
}

function handleResolveIssue(employee) {
  selectedEmployee.value = employee
  showResolutionModal.value = true
}

async function handleEmployeeResolution(resolutionData) {
  try {
    await api.resolveEmployeeIssue(
      props.sessionId,
      selectedEmployee.value.revision_id,
      resolutionData
    )

    // Refresh results to show updated status
    await loadResults()

    // Clear selection
    selectedEmployee.value = null
    showResolutionModal.value = false

    // Remove from selected employees if it was selected
    const index = selectedEmployees.value.indexOf(
      selectedEmployee.value?.revision_id
    )
    if (index > -1) {
      selectedEmployees.value.splice(index, 1)
    }
  } catch (err) {
    error.value = `Failed to resolve issue: ${err.message}`
  }
}

async function handleBulkResolution(resolutionData) {
  try {
    const resolutions = selectedEmployeesData.value.map(emp => ({
      revision_id: emp.revision_id,
      ...resolutionData,
    }))

    await api.bulkResolveIssues(props.sessionId, resolutions)

    // Refresh results
    await loadResults()

    // Clear selections
    selectedEmployees.value = []
    showBulkResolutionModal.value = false
  } catch (err) {
    error.value = `Failed to resolve issues: ${err.message}`
  }
}

// Lifecycle
onMounted(() => {
  loadResults()
})

// Watch for session changes
watch(
  () => props.sessionId,
  () => {
    if (props.sessionId) {
      loadResults()
    }
  }
)
</script>

<style scoped>
.results-display {
  @apply space-y-6;
}

.card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200;
}

.card:not(.mb-6) {
  @apply p-6;
}

/* Transition animations */
.group-enter-active,
.group-leave-active {
  transition: all 0.3s ease;
}

.group-enter-from,
.group-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Loading spinner */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
