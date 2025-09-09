<template>
  <div class="summary-results">
    <!-- Main Processing Summary -->
    <SummaryCard
      ref="summaryCardRef"
      :title="summaryTitle"
      :subtitle="summarySubtitle"
      :primary-metrics="primaryMetrics"
      :detail-metrics="detailMetrics"
      :status-message="statusMessage"
      :status-type="statusType"
      :action-buttons="actionButtons"
      :expandable="true"
      :default-expanded="false"
      @metric-click="handleMetricClick"
      @action-click="handleActionClick"
      @expand-change="handleExpandChange"
    >
      <template #details v-if="showExceptionDetails">
        <div class="exception-details">
          <h4 class="text-lg font-semibold text-gray-900 mb-4">Issues Requiring Attention</h4>
          <ExceptionsTable 
            :employees="exceptions" 
            @resolve-employee="handleEmployeeResolve"
          />
        </div>
      </template>
    </SummaryCard>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SummaryCard from './SummaryCard.vue'
import ExceptionsTable from './ExceptionsTable.vue'
import { useApi } from '../composables/useApi.js'
import { useNotificationStore } from '../stores/notification.js'
import { useSessionStore } from '../stores/session.js'

// Props
const props = defineProps({
  sessionId: {
    type: String,
    required: true
  },
  autoRefresh: {
    type: Boolean,
    default: true
  },
  refreshInterval: {
    type: Number,
    default: 30000 // 30 seconds
  }
})

// Emits
const emit = defineEmits([
  'employee-resolve',
  'view-all-issues',
  'export-ready'
])

// Reactive state
const loading = ref(false)
const summary = ref({})
const exceptions = ref([])
const summaryCardRef = ref(null)

// Services
const api = useApi()
const notificationStore = useNotificationStore()
const sessionStore = useSessionStore()

// Computed properties
const summaryTitle = computed(() => {
  return `Processing Results - ${summary.value.session_name || 'Session'}`
})

const summarySubtitle = computed(() => {
  if (loading.value) return 'Loading...'
  if (!summary.value.processing_completed) return 'Processing in progress...'
  
  const total = summary.value.total_employees || 0
  const ready = summary.value.ready_for_pvault || 0
  const issues = summary.value.need_attention || 0
  
  return `${total} employees processed • ${ready} ready for export • ${issues} need attention`
})

const primaryMetrics = computed(() => [
  {
    key: 'ready',
    type: 'success',
    value: summary.value.ready_for_pvault || 0,
    label: 'Ready for pVault',
    subtitle: `${getReadinessPercentage()}% export ready`,
    clickable: true,
    badge: summary.value.ready_for_pvault > 0 ? { type: 'success', text: 'Ready' } : null
  },
  {
    key: 'issues',
    type: summary.value.need_attention > 0 ? 'warning' : 'success',
    value: summary.value.need_attention || 0,
    label: 'Need Attention',
    subtitle: summary.value.need_attention > 0 ? 'Issues to resolve' : 'All clear',
    clickable: summary.value.need_attention > 0
  },
  {
    key: 'total',
    type: 'info',
    value: summary.value.total_employees || 0,
    label: 'Total Processed',
    subtitle: 'All employees'
  },
  {
    key: 'export-ready',
    type: 'chart',
    value: `${getReadinessPercentage()}%`,
    label: 'Export Readiness',
    subtitle: 'Ready vs Total'
  }
])

const detailMetrics = computed(() => [
  {
    key: 'missing_receipts',
    label: 'Missing Receipts',
    value: summary.value.issues_breakdown?.missing_receipts || 0,
    type: summary.value.issues_breakdown?.missing_receipts > 0 ? 'error' : 'success'
  },
  {
    key: 'coding_incomplete',
    label: 'Coding Issues',
    value: summary.value.issues_breakdown?.coding_incomplete || 0,
    type: summary.value.issues_breakdown?.coding_incomplete > 0 ? 'warning' : 'success'
  },
  {
    key: 'data_mismatches',
    label: 'Data Mismatches',
    value: summary.value.issues_breakdown?.data_mismatches || 0,
    type: summary.value.issues_breakdown?.data_mismatches > 0 ? 'error' : 'success'
  },
  {
    key: 'processing_time',
    label: 'Processing Time',
    value: summary.value.processing_time || 'N/A',
    type: 'default'
  }
])

const statusMessage = computed(() => {
  if (loading.value) return 'Loading summary...'
  
  if (!summary.value.processing_completed) {
    return 'Processing in progress. Results will update automatically.'
  }
  
  if (summary.value.need_attention === 0) {
    return `🎉 All ${summary.value.total_employees} employees are ready for pVault export!`
  }
  
  return summary.value.status_message || `${summary.value.ready_for_pvault} ready | ${summary.value.need_attention} need attention`
})

const statusType = computed(() => {
  if (loading.value) return 'info'
  if (!summary.value.processing_completed) return 'info'
  if (summary.value.need_attention === 0) return 'success'
  if (summary.value.need_attention > summary.value.ready_for_pvault) return 'warning'
  return 'info'
})

const actionButtons = computed(() => {
  const buttons = []
  if (summary.value.ready_for_pvault > 0) {
    buttons.push({ key: 'export-pvault', label: 'Export pVault CSV', type: 'success', disabled: false })
  }
  if (summary.value.need_attention > 0) {
    buttons.push({ key: 'view-issues', label: 'View All Issues', type: 'primary', disabled: false })
  }
  return buttons
})


const showExceptionDetails = computed(() => exceptions.value.length > 0)


// Methods
const getReadinessPercentage = () => {
  const total = summary.value.total_employees || 0
  const ready = summary.value.ready_for_pvault || 0
  if (total === 0) return 0
  return Math.round((ready / total) * 100)
}

const loadSummary = async () => {
  if (!props.sessionId) return
  
  loading.value = true
  try {
    const response = await api.getSummary(props.sessionId)
    summary.value = response
  } catch (error) {
    console.error('Failed to load summary:', error)
    notificationStore.addError('Failed to load session summary')
  } finally {
    loading.value = false
  }
}

const loadExceptions = async () => {
  if (!props.sessionId) return
  
  try {
    const response = await api.getExceptions(props.sessionId)
    exceptions.value = response.employees || []
  } catch (error) {
    console.error('Failed to load exceptions:', error)
  }
}

const handleMetricClick = (metric) => {
  switch (metric.key) {
    case 'ready':
      if (metric.value > 0) {
        emit('export-ready', metric)
      }
      break
    case 'issues':
      if (metric.value > 0) {
        try { summaryCardRef.value?.expand?.() } catch (e) {}
        loadExceptions()
        emit('view-all-issues', metric)
      }
      break
  }
}

const handleActionClick = (action) => {
  switch (action.key) {
    case 'export-pvault':
      emit('export-ready', { type: 'pvault' })
      break
    case 'view-issues':
      try { summaryCardRef.value?.expand?.() } catch (e) {}
      loadExceptions()
      emit('view-all-issues', { type: 'all' })
      break
  }
}

const handleExpandChange = (expanded) => {
  if (expanded) {
    loadExceptions()
  }
}


// Employee resolution handler
const handleEmployeeResolve = (employee) => {
  // Emit event to parent component to handle resolution modal
  emit('employee-resolve', employee)
}

const handleShowAllIssues = (category) => {
  emit('view-all-issues', { 
    type: 'category',
    category: category.key,
    employees: category.employees 
  })
}



// Lifecycle
onMounted(() => {
  loadSummary()
  
  // Set up auto-refresh only if real-time updates are not enabled
  let refreshInterval = null
  
  const setupRefresh = () => {
    // Only use polling if real-time updates are disabled and auto-refresh is enabled
    if (props.autoRefresh && !sessionStore.realTimeEnabled) {
      refreshInterval = setInterval(() => {
        if (!loading.value && !sessionStore.realTimeEnabled) {
          loadSummary()
        }
      }, props.refreshInterval)
    }
  }
  
  // Set up initial refresh
  setupRefresh()
  
  // Watch for real-time status changes
  const stopRefreshWatcher = sessionStore.$subscribe((mutation, state) => {
    // Safely check if mutation.events is an array before using .some()
    const events = Array.isArray(mutation.events) ? mutation.events : []
    const realTimeEvent = events.find(e => e.key === 'realTimeEnabled')
    
    if (realTimeEvent) {
      // Clear existing interval
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
      
      // Set up refresh based on new real-time status
      setupRefresh()
    }
  })
  
  // Clean up on unmount
  onUnmounted(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }
    if (stopRefreshWatcher) {
      stopRefreshWatcher()
    }
  })
})
</script>

<style scoped>
.summary-results {
  @apply space-y-6;
}

.exception-details {
  @apply mt-6;
}

.issue-categories {
  @apply space-y-4;
}


.exception-details {
  @apply mt-4;
}

/* Mobile responsive adjustments */
@media (max-width: 640px) {
  .category-header {
    @apply flex-col items-start gap-3;
  }
  
  .category-count {
    @apply self-end;
  }
}
</style>