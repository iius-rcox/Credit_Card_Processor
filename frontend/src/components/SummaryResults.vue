<template>
  <div class="summary-results">
    <!-- Main Processing Summary -->
    <SummaryCard
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
          
          <!-- Issue Categories -->
          <div class="issue-categories">
            <div 
              v-for="category in issueCategories" 
              :key="category.key"
              class="issue-category"
              :class="{ 'has-issues': category.count > 0 }"
            >
              <div class="category-header" @click="toggleCategory(category.key)">
                <div class="category-info">
                  <div class="category-icon" :class="`icon-${category.type}`">
                    <component :is="getCategoryIcon(category.type)" class="w-5 h-5" />
                  </div>
                  <div class="category-content">
                    <div class="category-name">{{ category.name }}</div>
                    <div class="category-description">{{ category.description }}</div>
                  </div>
                </div>
                <div class="category-count">
                  <span class="count-badge" :class="`badge-${category.type}`">
                    {{ category.count }}
                  </span>
                  <svg 
                    class="expand-icon"
                    :class="{ 'rotated': expandedCategories.includes(category.key) }"
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
              </div>
              
              <!-- Expandable Employee List -->
              <transition
                name="slide-down"
                enter-active-class="transition-all duration-300 ease-out"
                leave-active-class="transition-all duration-300 ease-in"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-96"
                leave-from-class="opacity-100 max-h-96"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="expandedCategories.includes(category.key)" class="employee-list">
                  <div 
                    v-for="employee in category.employees.slice(0, 5)" 
                    :key="employee.id"
                    class="employee-item"
                  >
                    <div class="employee-info">
                      <div class="employee-name">{{ employee.name }}</div>
                      <div class="employee-issue">{{ employee.issue }}</div>
                    </div>
                    <button 
                      class="resolve-btn"
                      @click="handleResolveEmployee(employee)"
                      :aria-label="`Resolve issues for ${employee.name}`"
                    >
                      Fix
                    </button>
                  </div>
                  
                  <div v-if="category.employees.length > 5" class="show-more">
                    <button 
                      class="show-more-btn"
                      @click="handleShowAllIssues(category)"
                    >
                      View all {{ category.employees.length }} employees
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </template>
    </SummaryCard>

    <!-- Quick Actions Panel (when issues exist) -->
    <div v-if="hasIssues" class="quick-actions-panel">
      <div class="quick-actions-header">
        <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p class="text-sm text-gray-600">Resolve common issues quickly</p>
      </div>
      
      <div class="quick-actions-grid">
        <button
          v-for="action in quickActions"
          :key="action.key"
          @click="handleQuickAction(action)"
          class="quick-action-card"
          :class="`action-${action.type}`"
          :disabled="action.disabled"
        >
          <div class="action-icon">
            <component :is="getActionIcon(action.type)" class="w-6 h-6" />
          </div>
          <div class="action-content">
            <div class="action-title">{{ action.title }}</div>
            <div class="action-description">{{ action.description }}</div>
            <div v-if="action.count" class="action-count">
              Affects {{ action.count }} employees
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SummaryCard from './SummaryCard.vue'
import { useApi } from '../composables/useApi.js'
import { useNotificationStore } from '../stores/notification.js'

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
  'bulk-action',
  'view-all-issues',
  'export-ready'
])

// Reactive state
const loading = ref(false)
const summary = ref({})
const exceptions = ref([])
const expandedCategories = ref([])

// Services
const api = useApi()
const notificationStore = useNotificationStore()

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
    buttons.push({
      key: 'export-pvault',
      label: 'Export pVault CSV',
      type: 'success',
      disabled: false
    })
  }
  
  if (summary.value.need_attention > 0) {
    buttons.push({
      key: 'view-issues',
      label: 'View All Issues',
      type: 'primary',
      disabled: false
    })
  }
  
  return buttons
})

const hasIssues = computed(() => {
  return summary.value.need_attention > 0
})

const showExceptionDetails = computed(() => {
  return hasIssues.value && exceptions.value.length > 0
})

const issueCategories = computed(() => {
  const categories = []
  const breakdown = summary.value.issues_breakdown || {}
  
  if (breakdown.missing_receipts > 0) {
    categories.push({
      key: 'missing_receipts',
      name: 'Missing Receipts',
      description: 'Employees without receipt data',
      type: 'error',
      count: breakdown.missing_receipts,
      employees: exceptions.value.filter(emp => emp.issue_category === 'missing_receipts')
    })
  }
  
  if (breakdown.coding_incomplete > 0) {
    categories.push({
      key: 'coding_issues',
      name: 'Coding Issues',
      description: 'Incomplete expense coding',
      type: 'warning',
      count: breakdown.coding_incomplete,
      employees: exceptions.value.filter(emp => emp.issue_category === 'coding_issues')
    })
  }
  
  if (breakdown.data_mismatches > 0) {
    categories.push({
      key: 'data_mismatches',
      name: 'Data Mismatches',
      description: 'CAR vs Receipt discrepancies',
      type: 'error',
      count: breakdown.data_mismatches,
      employees: exceptions.value.filter(emp => emp.issue_category === 'data_mismatches')
    })
  }
  
  return categories
})

const quickActions = computed(() => {
  const actions = []
  const breakdown = summary.value.issues_breakdown || {}
  
  if (breakdown.missing_receipts > 0) {
    actions.push({
      key: 'bulk-upload-receipts',
      type: 'upload',
      title: 'Bulk Upload Receipts',
      description: 'Upload missing receipt files',
      count: breakdown.missing_receipts,
      disabled: false
    })
  }
  
  if (breakdown.coding_incomplete > 0) {
    actions.push({
      key: 'auto-code-expenses',
      type: 'auto',
      title: 'Auto-Code Expenses',
      description: 'Apply standard expense codes',
      count: breakdown.coding_incomplete,
      disabled: false
    })
  }
  
  if (breakdown.data_mismatches > 0) {
    actions.push({
      key: 'resolve-mismatches',
      type: 'fix',
      title: 'Resolve Mismatches',
      description: 'Review amount discrepancies',
      count: breakdown.data_mismatches,
      disabled: false
    })
  }
  
  return actions
})

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
      emit('view-all-issues', { type: 'all' })
      break
  }
}

const handleExpandChange = (expanded) => {
  if (expanded && hasIssues.value) {
    loadExceptions()
  }
}

const toggleCategory = (categoryKey) => {
  const index = expandedCategories.value.indexOf(categoryKey)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(categoryKey)
  }
}

const handleResolveEmployee = (employee) => {
  emit('employee-resolve', employee)
}

const handleShowAllIssues = (category) => {
  emit('view-all-issues', { 
    type: 'category',
    category: category.key,
    employees: category.employees 
  })
}

const handleQuickAction = (action) => {
  emit('bulk-action', action)
}

// Icon methods
const getCategoryIcon = (type) => {
  const icons = {
    error: 'ExclamationCircleIcon',
    warning: 'ExclamationTriangleIcon',
    success: 'CheckCircleIcon'
  }
  return icons[type] || 'InformationCircleIcon'
}

const getActionIcon = (type) => {
  const icons = {
    upload: 'CloudArrowUpIcon',
    auto: 'SparklesIcon', 
    fix: 'WrenchScrewdriverIcon'
  }
  return icons[type] || 'CogIcon'
}

// Lifecycle
onMounted(() => {
  loadSummary()
  
  // Set up auto-refresh
  if (props.autoRefresh) {
    const interval = setInterval(() => {
      if (!loading.value) {
        loadSummary()
      }
    }, props.refreshInterval)
    
    // Clean up interval on unmount
    onUnmounted(() => clearInterval(interval))
  }
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

.issue-category {
  @apply border border-gray-200 rounded-lg overflow-hidden;
}

.issue-category.has-issues {
  @apply border-yellow-300 bg-yellow-50;
}

.category-header {
  @apply flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200;
}

.category-info {
  @apply flex items-center gap-3;
}

.category-icon {
  @apply flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center;
}

.icon-error {
  @apply bg-red-100 text-red-600;
}

.icon-warning {
  @apply bg-yellow-100 text-yellow-600;
}

.icon-success {
  @apply bg-green-100 text-green-600;
}

.category-content {
  @apply flex-1;
}

.category-name {
  @apply font-semibold text-gray-900;
}

.category-description {
  @apply text-sm text-gray-600;
}

.category-count {
  @apply flex items-center gap-2;
}

.count-badge {
  @apply px-2 py-1 text-sm font-bold rounded-full;
}

.badge-error {
  @apply bg-red-500 text-white;
}

.badge-warning {
  @apply bg-yellow-500 text-white;
}

.badge-success {
  @apply bg-green-500 text-white;
}

.expand-icon {
  @apply w-5 h-5 text-gray-400 transition-transform duration-200;
}

.expand-icon.rotated {
  @apply rotate-180;
}

.employee-list {
  @apply border-t border-gray-200 bg-white overflow-hidden;
}

.employee-item {
  @apply flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50;
}

.employee-info {
  @apply flex-1;
}

.employee-name {
  @apply font-medium text-gray-900;
}

.employee-issue {
  @apply text-sm text-gray-600;
}

.resolve-btn {
  @apply px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded transition-colors duration-200;
}

.show-more {
  @apply p-3 text-center border-t border-gray-200 bg-gray-50;
}

.show-more-btn {
  @apply text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline;
}

.quick-actions-panel {
  @apply bg-white rounded-xl shadow-lg border border-gray-200 p-6;
}

.quick-actions-header {
  @apply mb-4;
}

.quick-actions-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.quick-action-card {
  @apply flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left;
}

.quick-action-card:disabled {
  @apply opacity-50 cursor-not-allowed hover:border-gray-200 hover:shadow-none;
}

.action-upload {
  @apply hover:border-green-300 hover:bg-green-50;
}

.action-auto {
  @apply hover:border-purple-300 hover:bg-purple-50;
}

.action-fix {
  @apply hover:border-orange-300 hover:bg-orange-50;
}

.action-icon {
  @apply flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center;
}

.action-upload .action-icon {
  @apply bg-green-100 text-green-600;
}

.action-auto .action-icon {
  @apply bg-purple-100 text-purple-600;
}

.action-fix .action-icon {
  @apply bg-orange-100 text-orange-600;
}

.action-content {
  @apply flex-1;
}

.action-title {
  @apply font-semibold text-gray-900 mb-1;
}

.action-description {
  @apply text-sm text-gray-600 mb-1;
}

.action-count {
  @apply text-xs text-gray-500 font-medium;
}

/* Mobile responsive adjustments */
@media (max-width: 640px) {
  .quick-actions-grid {
    @apply grid-cols-1;
  }
  
  .category-header {
    @apply flex-col items-start gap-3;
  }
  
  .category-count {
    @apply self-end;
  }
}
</style>