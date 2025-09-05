<template>
  <div class="problem-focused-workflow">
    <!-- Workflow Header -->
    <div class="workflow-header">
      <div class="workflow-info">
        <div class="workflow-icon">
          <component :is="getCurrentWorkflowIcon()" class="w-8 h-8" :class="getCurrentWorkflowColor()" />
        </div>
        <div class="workflow-content">
          <h2 class="workflow-title">{{ currentWorkflow.title }}</h2>
          <p class="workflow-description">{{ currentWorkflow.description }}</p>
        </div>
      </div>
      
      <div class="workflow-controls">
        <div class="workflow-selector">
          <label class="selector-label">Issue Type:</label>
          <select
            v-model="selectedWorkflowType"
            @change="handleWorkflowChange"
            class="workflow-select"
          >
            <option value="missing_receipts">Missing Receipts ({{ getIssueCount('missing_receipts') }})</option>
            <option value="coding_issues">Coding Issues ({{ getIssueCount('coding_issues') }})</option>
            <option value="data_mismatches">Data Mismatches ({{ getIssueCount('data_mismatches') }})</option>
            <option value="all_issues">All Issues Overview</option>
          </select>
        </div>
        
        <div class="workflow-progress">
          <div class="progress-info">
            <span class="progress-label">Resolution Progress:</span>
            <span class="progress-value">{{ resolutionProgress.resolved }} / {{ resolutionProgress.total }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${resolutionProgress.percentage}%` }"
              :class="getProgressBarClass()"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Workflow-Specific Smart Actions -->
    <div class="smart-actions-bar">
      <div class="smart-suggestions">
        <component :is="getSmartSuggestionIcon()" class="w-5 h-5 text-blue-600" />
        <span class="suggestion-text">{{ currentSmartSuggestion }}</span>
      </div>
      
      <div class="quick-actions">
        <button
          v-for="action in currentWorkflow.quickActions"
          :key="action.key"
          @click="handleQuickAction(action)"
          class="quick-action-btn"
          :class="`action-${action.type}`"
          :disabled="action.disabled || processingQuickAction"
        >
          <component :is="action.icon" class="w-4 h-4" />
          {{ action.label }}
          <span v-if="action.count" class="action-count">({{ action.count }})</span>
        </button>
      </div>
    </div>

    <!-- Guided Resolution Steps -->
    <div v-if="showGuidedMode" class="guided-resolution">
      <div class="guided-header">
        <div class="guided-title">
          <WrenchScrewdriverIcon class="w-6 h-6 text-green-600" />
          <span>Guided Resolution</span>
        </div>
        <button
          @click="toggleGuidedMode"
          class="toggle-guided-btn"
        >
          Switch to Expert Mode
        </button>
      </div>
      
      <div class="resolution-steps">
        <div
          v-for="(step, index) in currentWorkflow.guidedSteps"
          :key="step.key"
          class="resolution-step"
          :class="{
            'active': guidedState.currentStep === index,
            'completed': guidedState.completedSteps.includes(index),
            'available': index <= guidedState.currentStep
          }"
        >
          <div class="step-indicator">
            <div v-if="guidedState.completedSteps.includes(index)" class="step-check">
              <CheckIcon class="w-4 h-4 text-white" />
            </div>
            <div v-else class="step-number">{{ index + 1 }}</div>
          </div>
          
          <div class="step-content">
            <div class="step-header">
              <h4 class="step-title">{{ step.title }}</h4>
              <span v-if="step.estimatedTime" class="step-duration">
                ~{{ step.estimatedTime }}
              </span>
            </div>
            <p class="step-description">{{ step.description }}</p>
            
            <div v-if="guidedState.currentStep === index" class="step-actions">
              <button
                v-for="stepAction in step.actions"
                :key="stepAction.key"
                @click="handleStepAction(stepAction, index)"
                class="step-action-btn"
                :class="`action-${stepAction.type}`"
                :disabled="processingStepAction"
              >
                <component :is="stepAction.icon" class="w-4 h-4" />
                {{ stepAction.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Issue-Specific Component -->
    <div class="workflow-content-area">
      <MissingReceiptsView
        v-if="selectedWorkflowType === 'missing_receipts'"
        :employees="filteredEmployees.missing_receipts"
        :session-id="sessionId"
        @employee-resolved="handleEmployeeResolved"
        @bulk-action-complete="handleBulkActionComplete"
      />
      
      <CodingIssuesView
        v-else-if="selectedWorkflowType === 'coding_issues'"
        :employees="filteredEmployees.coding_issues"
        :session-id="sessionId"
        @employee-coded="handleEmployeeCoded"
        @bulk-coding-complete="handleBulkCodingComplete"
        @ai-training-data="handleAITrainingData"
      />
      
      <DataMismatchesView
        v-else-if="selectedWorkflowType === 'data_mismatches'"
        :employees="filteredEmployees.data_mismatches"
        :session-id="sessionId"
        @mismatch-resolved="handleMismatchResolved"
        @bulk-resolution-complete="handleBulkResolutionComplete"
        @investigation-flagged="handleInvestigationFlagged"
      />
      
      <!-- All Issues Overview -->
      <div v-else-if="selectedWorkflowType === 'all_issues'" class="all-issues-overview">
        <div class="overview-grid">
          <div
            v-for="issueType in issueTypes"
            :key="issueType.key"
            class="issue-overview-card"
            @click="selectedWorkflowType = issueType.key"
          >
            <div class="card-icon" :class="`bg-${issueType.color}-100`">
              <component :is="issueType.icon" class="w-8 h-8" :class="`text-${issueType.color}-600`" />
            </div>
            <div class="card-content">
              <div class="card-header">
                <h3 class="card-title">{{ issueType.name }}</h3>
                <span class="issue-count" :class="`bg-${issueType.color}-100 text-${issueType.color}-800`">
                  {{ issueType.count }}
                </span>
              </div>
              <p class="card-description">{{ issueType.description }}</p>
              <div class="card-metrics">
                <div class="metric">
                  <span class="metric-label">Avg Resolution:</span>
                  <span class="metric-value">{{ issueType.avgResolutionTime }}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Priority:</span>
                  <span class="metric-value" :class="`priority-${issueType.priority}`">
                    {{ issueType.priority }}
                  </span>
                </div>
              </div>
            </div>
            <div class="card-action">
              <ArrowRightIcon class="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        <!-- Quick Stats Dashboard -->
        <div class="stats-dashboard">
          <div class="dashboard-header">
            <h3 class="dashboard-title">Resolution Analytics</h3>
            <select v-model="statsTimeframe" class="timeframe-select">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon bg-green-100">
                <CheckCircleIcon class="w-6 h-6 text-green-600" />
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ resolutionStats.resolved }}</div>
                <div class="stat-label">Resolved Today</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon bg-blue-100">
                <ClockIcon class="w-6 h-6 text-blue-600" />
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ resolutionStats.avgTime }}</div>
                <div class="stat-label">Avg Resolution Time</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon bg-purple-100">
                <SparklesIcon class="w-6 h-6 text-purple-600" />
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ resolutionStats.aiAccuracy }}%</div>
                <div class="stat-label">AI Accuracy</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon bg-orange-100">
                <UserGroupIcon class="w-6 h-6 text-orange-600" />
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ resolutionStats.totalEmployees }}</div>
                <div class="stat-label">Total Employees</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Workflow Completion Modal -->
    <WorkflowCompletionModal
      v-if="showCompletionModal"
      :workflow-type="completedWorkflowType"
      :completion-stats="completionStats"
      @close="showCompletionModal = false"
      @start-next-workflow="handleStartNextWorkflow"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useSessionStore } from '@/stores/session'
import MissingReceiptsView from './MissingReceiptsView.vue'
import CodingIssuesView from './CodingIssuesView.vue'
import DataMismatchesView from './DataMismatchesView.vue'
import WorkflowCompletionModal from '../modals/WorkflowCompletionModal.vue'

// Icons (simplified)
const CheckIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5"/></svg>`
}

const WrenchScrewdriverIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655-4.653a2.548 2.548 0 010-3.586l6.837-6.837a2.548 2.548 0 013.586 0l-6.837 6.837a2.548 2.548 0 000 3.586L11.42 15.17z"/></svg>`
}

const SparklesIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>`
}

const CheckCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd"/></svg>`
}

const ClockIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
}

const UserGroupIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>`
}

const ArrowRightIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>`
}

// Props
const props = defineProps({
  employees: {
    type: Array,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits([
  'workflow-complete',
  'resolution-progress',
  'ai-feedback'
])

// Composables
const notificationStore = useNotificationStore()
const sessionStore = useSessionStore()

// Reactive state
const selectedWorkflowType = ref('missing_receipts')
const showGuidedMode = ref(false)
const processingQuickAction = ref(false)
const processingStepAction = ref(false)
const showCompletionModal = ref(false)
const completedWorkflowType = ref(null)
const statsTimeframe = ref('today')

const guidedState = ref({
  currentStep: 0,
  completedSteps: [],
  skippedSteps: []
})

const completionStats = ref({
  totalResolved: 0,
  timeSpent: 0,
  efficiencyScore: 0,
  nextRecommendation: null
})

const resolutionStats = ref({
  resolved: 0,
  avgTime: '0m',
  aiAccuracy: 0,
  totalEmployees: 0
})

// Computed properties
const filteredEmployees = computed(() => {
  return {
    missing_receipts: props.employees.filter(emp => 
      emp.issue_category === 'missing_receipts' || 
      (emp.codingIssues && emp.codingIssues.includes('missing_receipts'))
    ),
    coding_issues: props.employees.filter(emp => 
      emp.issue_category === 'coding_issues' ||
      (emp.codingIssues && emp.codingIssues.some(issue => 
        ['uncategorized', 'low_confidence', 'manual_review'].includes(issue)
      ))
    ),
    data_mismatches: props.employees.filter(emp => 
      emp.issue_category === 'data_mismatches' ||
      (emp.variance && Math.abs(emp.variance) > 0.01)
    )
  }
})

const issueTypes = computed(() => {
  return [
    {
      key: 'missing_receipts',
      name: 'Missing Receipts',
      description: 'Employees without receipt documentation',
      icon: 'ReceiptRefundIcon',
      color: 'red',
      count: filteredEmployees.value.missing_receipts.length,
      priority: 'high',
      avgResolutionTime: '5m'
    },
    {
      key: 'coding_issues',
      name: 'Coding Issues',
      description: 'Incomplete or incorrect expense coding',
      icon: 'TagIcon',
      color: 'yellow',
      count: filteredEmployees.value.coding_issues.length,
      priority: 'medium',
      avgResolutionTime: '3m'
    },
    {
      key: 'data_mismatches',
      name: 'Data Mismatches',
      description: 'CAR vs Receipt amount discrepancies',
      icon: 'ExclamationTriangleIcon',
      color: 'orange',
      count: filteredEmployees.value.data_mismatches.length,
      priority: 'high',
      avgResolutionTime: '7m'
    }
  ]
})

const resolutionProgress = computed(() => {
  const total = props.employees.length
  const resolved = props.employees.filter(emp => 
    emp.resolution_status === 'resolved' || emp.validation_status === 'RESOLVED'
  ).length
  
  return {
    total,
    resolved,
    remaining: total - resolved,
    percentage: total > 0 ? Math.round((resolved / total) * 100) : 0
  }
})

const currentWorkflow = computed(() => {
  const workflows = {
    missing_receipts: {
      title: 'Missing Receipts Resolution',
      description: 'Systematically resolve employees missing receipt documentation',
      icon: 'ReceiptRefundIcon',
      color: 'text-red-600',
      quickActions: [
        {
          key: 'bulk_upload',
          label: 'Bulk Upload',
          icon: 'CloudArrowUpIcon',
          type: 'primary',
          count: filteredEmployees.value.missing_receipts.length
        },
        {
          key: 'mark_exempt',
          label: 'Mark Exempt',
          icon: 'ShieldCheckIcon',
          type: 'secondary',
          count: null
        },
        {
          key: 'request_receipts',
          label: 'Request from Employees',
          icon: 'EnvelopeIcon',
          type: 'tertiary',
          count: null
        }
      ],
      guidedSteps: [
        {
          key: 'identify',
          title: 'Identify Missing Receipts',
          description: 'Review employees missing receipt documentation and prioritize by amount/urgency',
          estimatedTime: '2 minutes',
          actions: [
            { key: 'sort_by_amount', label: 'Sort by Amount', icon: 'BanknotesIcon', type: 'primary' },
            { key: 'filter_urgent', label: 'Show Urgent Only', icon: 'ExclamationTriangleIcon', type: 'secondary' }
          ]
        },
        {
          key: 'collect',
          title: 'Collect Receipts',
          description: 'Upload available receipts or request them from employees',
          estimatedTime: '10 minutes',
          actions: [
            { key: 'bulk_upload', label: 'Bulk Upload', icon: 'CloudArrowUpIcon', type: 'primary' },
            { key: 'individual_upload', label: 'Upload Individual', icon: 'DocumentPlusIcon', type: 'secondary' }
          ]
        },
        {
          key: 'verify',
          title: 'Verify & Process',
          description: 'Review uploaded receipts and process matches',
          estimatedTime: '5 minutes',
          actions: [
            { key: 'auto_match', label: 'Auto-Match', icon: 'SparklesIcon', type: 'primary' },
            { key: 'manual_review', label: 'Manual Review', icon: 'MagnifyingGlassIcon', type: 'secondary' }
          ]
        }
      ]
    },
    coding_issues: {
      title: 'Expense Coding Resolution',
      description: 'Fix incomplete or incorrect expense categorization with AI assistance',
      icon: 'TagIcon',
      color: 'text-yellow-600',
      quickActions: [
        {
          key: 'ai_code',
          label: 'AI Auto-Code',
          icon: 'SparklesIcon',
          type: 'primary',
          count: filteredEmployees.value.coding_issues.filter(emp => 
            emp.aiSuggestion && emp.aiSuggestion.confidence > 0.8
          ).length
        },
        {
          key: 'bulk_manual',
          label: 'Bulk Manual Code',
          icon: 'PencilIcon',
          type: 'secondary',
          count: null
        }
      ],
      guidedSteps: [
        {
          key: 'analyze',
          title: 'Analyze Coding Issues',
          description: 'Review AI suggestions and identify patterns for bulk resolution',
          estimatedTime: '3 minutes',
          actions: [
            { key: 'review_suggestions', label: 'Review AI Suggestions', icon: 'SparklesIcon', type: 'primary' },
            { key: 'identify_patterns', label: 'Find Patterns', icon: 'ChartBarIcon', type: 'secondary' }
          ]
        },
        {
          key: 'apply',
          title: 'Apply Coding',
          description: 'Accept high-confidence AI suggestions and manually code remaining items',
          estimatedTime: '8 minutes',
          actions: [
            { key: 'accept_confident', label: 'Accept Confident AI', icon: 'CheckIcon', type: 'primary' },
            { key: 'manual_code', label: 'Manual Code Rest', icon: 'PencilIcon', type: 'secondary' }
          ]
        },
        {
          key: 'validate',
          title: 'Validate Results',
          description: 'Review applied coding and train AI on corrections',
          estimatedTime: '2 minutes',
          actions: [
            { key: 'review_coding', label: 'Review Coding', icon: 'EyeIcon', type: 'primary' },
            { key: 'train_ai', label: 'Train AI', icon: 'AcademicCapIcon', type: 'secondary' }
          ]
        }
      ]
    },
    data_mismatches: {
      title: 'Data Mismatch Resolution',
      description: 'Resolve discrepancies between CAR and Receipt amounts',
      icon: 'ExclamationTriangleIcon',
      color: 'text-red-600',
      quickActions: [
        {
          key: 'accept_car',
          label: 'Accept CAR Amounts',
          icon: 'DocumentTextIcon',
          type: 'primary',
          count: filteredEmployees.value.data_mismatches.filter(emp => 
            emp.variance > 0
          ).length
        },
        {
          key: 'accept_receipts',
          label: 'Accept Receipt Amounts',
          icon: 'ReceiptPercentIcon',
          type: 'secondary',
          count: filteredEmployees.value.data_mismatches.filter(emp => 
            emp.variance < 0
          ).length
        }
      ],
      guidedSteps: [
        {
          key: 'assess',
          title: 'Assess Mismatches',
          description: 'Analyze variance patterns and receipt quality to prioritize resolution',
          estimatedTime: '4 minutes',
          actions: [
            { key: 'sort_by_variance', label: 'Sort by Variance', icon: 'ArrowsUpDownIcon', type: 'primary' },
            { key: 'check_quality', label: 'Check Receipt Quality', icon: 'MagnifyingGlassIcon', type: 'secondary' }
          ]
        },
        {
          key: 'resolve',
          title: 'Resolve Discrepancies',
          description: 'Make decisions on which amounts to accept based on evidence quality',
          estimatedTime: '12 minutes',
          actions: [
            { key: 'auto_resolve', label: 'Auto-Resolve Simple', icon: 'BoltIcon', type: 'primary' },
            { key: 'manual_resolve', label: 'Manual Resolution', icon: 'ScaleIcon', type: 'secondary' }
          ]
        },
        {
          key: 'document',
          title: 'Document Decisions',
          description: 'Add resolution notes and flag items for future investigation',
          estimatedTime: '3 minutes',
          actions: [
            { key: 'add_notes', label: 'Add Notes', icon: 'DocumentTextIcon', type: 'primary' },
            { key: 'flag_investigation', label: 'Flag for Investigation', icon: 'FlagIcon', type: 'secondary' }
          ]
        }
      ]
    }
  }
  
  return workflows[selectedWorkflowType.value] || workflows.missing_receipts
})

const currentSmartSuggestion = computed(() => {
  const suggestions = {
    missing_receipts: `Start with highest-value transactions (${filteredEmployees.value.missing_receipts.filter(emp => (emp.amount || 0) > 500).length} over $500)`,
    coding_issues: `${filteredEmployees.value.coding_issues.filter(emp => emp.aiSuggestion?.confidence > 0.9).length} items have high-confidence AI suggestions ready`,
    data_mismatches: `Focus on ${filteredEmployees.value.data_mismatches.filter(emp => Math.abs(emp.variance || 0) > 100).length} items with $100+ variance first`,
    all_issues: `Recommended workflow order: Missing Receipts → Data Mismatches → Coding Issues`
  }
  
  return suggestions[selectedWorkflowType.value] || suggestions.all_issues
})

// Methods
const getIssueCount = (issueType) => {
  return filteredEmployees.value[issueType]?.length || 0
}

const getCurrentWorkflowIcon = () => {
  const iconMap = {
    missing_receipts: 'ReceiptRefundIcon',
    coding_issues: 'TagIcon',
    data_mismatches: 'ExclamationTriangleIcon',
    all_issues: 'ChartBarIcon'
  }
  return iconMap[selectedWorkflowType.value] || 'ChartBarIcon'
}

const getCurrentWorkflowColor = () => {
  const colorMap = {
    missing_receipts: 'text-red-600',
    coding_issues: 'text-yellow-600',
    data_mismatches: 'text-orange-600',
    all_issues: 'text-blue-600'
  }
  return colorMap[selectedWorkflowType.value] || 'text-blue-600'
}

const getSmartSuggestionIcon = () => {
  return 'SparklesIcon'
}

const getProgressBarClass = () => {
  const percentage = resolutionProgress.value.percentage
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 60) return 'bg-blue-500'
  if (percentage >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

const handleWorkflowChange = () => {
  // Reset guided state when switching workflows
  guidedState.value = {
    currentStep: 0,
    completedSteps: [],
    skippedSteps: []
  }
  
  // Auto-enable guided mode for complex workflows
  if (['data_mismatches', 'coding_issues'].includes(selectedWorkflowType.value)) {
    showGuidedMode.value = true
  }
}

const toggleGuidedMode = () => {
  showGuidedMode.value = !showGuidedMode.value
}

const handleQuickAction = async (action) => {
  processingQuickAction.value = true
  
  try {
    switch (action.key) {
      case 'bulk_upload':
        notificationStore.addInfo('Opening bulk upload interface...')
        break
      case 'ai_code':
        notificationStore.addInfo('Applying AI coding suggestions...')
        break
      case 'accept_car':
        notificationStore.addInfo('Accepting CAR amounts for selected items...')
        break
      default:
        notificationStore.addInfo(`Executing ${action.label}...`)
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } finally {
    processingQuickAction.value = false
  }
}

const handleStepAction = async (action, stepIndex) => {
  processingStepAction.value = true
  
  try {
    // Execute the step action
    notificationStore.addInfo(`${action.label}...`)
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Mark step as completed
    if (!guidedState.value.completedSteps.includes(stepIndex)) {
      guidedState.value.completedSteps.push(stepIndex)
    }
    
    // Move to next step
    if (stepIndex === guidedState.value.currentStep && 
        stepIndex < currentWorkflow.value.guidedSteps.length - 1) {
      guidedState.value.currentStep = stepIndex + 1
    }
    
    // Check if workflow is complete
    if (guidedState.value.completedSteps.length === currentWorkflow.value.guidedSteps.length) {
      handleWorkflowComplete()
    }
    
  } finally {
    processingStepAction.value = false
  }
}

const handleWorkflowComplete = () => {
  completedWorkflowType.value = selectedWorkflowType.value
  completionStats.value = {
    totalResolved: filteredEmployees.value[selectedWorkflowType.value].length,
    timeSpent: estimateTimeSpent(),
    efficiencyScore: calculateEfficiencyScore(),
    nextRecommendation: getNextRecommendation()
  }
  
  showCompletionModal.value = true
  
  emit('workflow-complete', {
    workflowType: selectedWorkflowType.value,
    stats: completionStats.value
  })
}

const estimateTimeSpent = () => {
  // Estimate based on completed steps
  return guidedState.value.completedSteps.length * 3 // 3 minutes per step average
}

const calculateEfficiencyScore = () => {
  // Calculate based on completion rate and time
  const completionRate = guidedState.value.completedSteps.length / currentWorkflow.value.guidedSteps.length
  return Math.round(completionRate * 100)
}

const getNextRecommendation = () => {
  const order = ['missing_receipts', 'data_mismatches', 'coding_issues']
  const currentIndex = order.indexOf(selectedWorkflowType.value)
  const nextIndex = (currentIndex + 1) % order.length
  
  return {
    workflowType: order[nextIndex],
    reason: 'Based on typical resolution order and dependencies'
  }
}

const handleStartNextWorkflow = (workflowType) => {
  selectedWorkflowType.value = workflowType
  showCompletionModal.value = false
  showGuidedMode.value = true
  
  guidedState.value = {
    currentStep: 0,
    completedSteps: [],
    skippedSteps: []
  }
}

// Event handlers from child components
const handleEmployeeResolved = (data) => {
  updateResolutionStats('resolved', 1)
  emit('resolution-progress', data)
}

const handleEmployeeCoded = (data) => {
  updateResolutionStats('coded', 1)
  if (data.action === 'ai_suggestion_accepted') {
    emit('ai-feedback', { type: 'acceptance', data })
  }
}

const handleMismatchResolved = (data) => {
  updateResolutionStats('mismatch_resolved', 1)
}

const handleBulkActionComplete = (data) => {
  updateResolutionStats('bulk_resolved', data.successful || 0)
}

const handleBulkCodingComplete = (data) => {
  updateResolutionStats('bulk_coded', data.results?.filter(r => r.success).length || 0)
}

const handleBulkResolutionComplete = (data) => {
  updateResolutionStats('bulk_mismatch_resolved', data.results?.filter(r => r.success).length || 0)
}

const handleInvestigationFlagged = (data) => {
  notificationStore.addInfo(`Investigation flagged for ${data.employee.name}`)
}

const handleAITrainingData = (data) => {
  emit('ai-feedback', { type: 'training', data })
}

const updateResolutionStats = (type, count) => {
  resolutionStats.value.resolved += count
  resolutionStats.value.totalEmployees = props.employees.length
  
  // Update AI accuracy based on feedback
  // This would be calculated based on actual acceptance rates
}

// Lifecycle
onMounted(() => {
  // Initialize stats
  resolutionStats.value.totalEmployees = props.employees.length
  
  // Auto-select workflow with most issues
  const maxIssues = Math.max(
    ...Object.values(filteredEmployees.value).map(arr => arr.length)
  )
  
  const workflowWithMostIssues = Object.entries(filteredEmployees.value)
    .find(([_, employees]) => employees.length === maxIssues)?.[0]
  
  if (workflowWithMostIssues) {
    selectedWorkflowType.value = workflowWithMostIssues
  }
})
</script>

<style scoped>
.problem-focused-workflow {
  @apply space-y-6;
}

/* Workflow Header */
.workflow-header {
  @apply flex items-start justify-between p-6 bg-white border border-gray-200 rounded-lg shadow-sm;
}

.workflow-info {
  @apply flex items-start gap-4;
}

.workflow-icon {
  @apply flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center;
}

.workflow-title {
  @apply text-xl font-bold text-gray-900 mb-1;
}

.workflow-description {
  @apply text-gray-600;
}

.workflow-controls {
  @apply space-y-4 text-right;
}

.workflow-selector {
  @apply flex items-center gap-2;
}

.selector-label {
  @apply text-sm font-medium text-gray-700;
}

.workflow-select {
  @apply px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.workflow-progress {
  @apply space-y-2;
}

.progress-info {
  @apply flex items-center gap-2 text-sm;
}

.progress-label {
  @apply text-gray-600;
}

.progress-value {
  @apply font-medium text-gray-900;
}

.progress-bar {
  @apply w-48 h-2 bg-gray-200 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full transition-all duration-300 rounded-full;
}

/* Smart Actions Bar */
.smart-actions-bar {
  @apply flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg;
}

.smart-suggestions {
  @apply flex items-center gap-2 text-blue-800;
}

.suggestion-text {
  @apply font-medium;
}

.quick-actions {
  @apply flex gap-2;
}

.quick-action-btn {
  @apply flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200;
}

.quick-action-btn.action-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.quick-action-btn.action-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.quick-action-btn.action-tertiary {
  @apply bg-purple-600 text-white hover:bg-purple-700;
}

.action-count {
  @apply ml-1 text-xs opacity-75;
}

/* Guided Resolution */
.guided-resolution {
  @apply bg-green-50 border border-green-200 rounded-lg p-4;
}

.guided-header {
  @apply flex items-center justify-between mb-4;
}

.guided-title {
  @apply flex items-center gap-2 font-semibold text-green-800;
}

.toggle-guided-btn {
  @apply text-sm text-green-700 hover:text-green-900 underline;
}

.resolution-steps {
  @apply space-y-4;
}

.resolution-step {
  @apply flex gap-4 p-4 rounded-lg transition-all duration-200;
}

.resolution-step.available {
  @apply bg-white border border-gray-200;
}

.resolution-step.active {
  @apply bg-green-100 border border-green-300;
}

.resolution-step.completed {
  @apply bg-gray-50 border border-gray-200 opacity-75;
}

.step-indicator {
  @apply flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center;
}

.step-number {
  @apply w-full h-full bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold text-sm;
}

.resolution-step.active .step-number {
  @apply bg-green-600 text-white;
}

.step-check {
  @apply w-full h-full bg-green-600 rounded-full flex items-center justify-center;
}

.step-content {
  @apply flex-1;
}

.step-header {
  @apply flex items-center justify-between mb-2;
}

.step-title {
  @apply font-semibold text-gray-900;
}

.step-duration {
  @apply text-sm text-gray-500;
}

.step-description {
  @apply text-gray-600 mb-3;
}

.step-actions {
  @apply flex gap-2;
}

.step-action-btn {
  @apply flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200;
}

.step-action-btn.action-primary {
  @apply bg-green-600 text-white hover:bg-green-700;
}

.step-action-btn.action-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

/* All Issues Overview */
.all-issues-overview {
  @apply space-y-8;
}

.overview-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6;
}

.issue-overview-card {
  @apply bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all duration-200;
}

.card-icon {
  @apply w-16 h-16 rounded-full flex items-center justify-center mb-4;
}

.card-header {
  @apply flex items-center justify-between mb-2;
}

.card-title {
  @apply font-semibold text-gray-900;
}

.issue-count {
  @apply px-2 py-1 text-sm font-bold rounded-full;
}

.card-description {
  @apply text-gray-600 mb-4;
}

.card-metrics {
  @apply flex justify-between text-sm;
}

.metric {
  @apply space-x-1;
}

.metric-label {
  @apply text-gray-500;
}

.metric-value {
  @apply font-medium text-gray-900;
}

.metric-value.priority-high {
  @apply text-red-600;
}

.metric-value.priority-medium {
  @apply text-yellow-600;
}

.metric-value.priority-low {
  @apply text-green-600;
}

.card-action {
  @apply absolute top-6 right-6;
}

/* Stats Dashboard */
.stats-dashboard {
  @apply bg-white border border-gray-200 rounded-lg p-6;
}

.dashboard-header {
  @apply flex items-center justify-between mb-6;
}

.dashboard-title {
  @apply text-lg font-semibold text-gray-900;
}

.timeframe-select {
  @apply px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4;
}

.stat-card {
  @apply flex items-center gap-3 p-4 bg-gray-50 rounded-lg;
}

.stat-icon {
  @apply w-12 h-12 rounded-full flex items-center justify-center;
}

.stat-content {
  @apply space-y-1;
}

.stat-value {
  @apply text-2xl font-bold text-gray-900;
}

.stat-label {
  @apply text-sm text-gray-600;
}

/* Workflow Content Area */
.workflow-content-area {
  @apply bg-gray-50 rounded-lg p-1;
}

/* Responsive */
@media (max-width: 768px) {
  .workflow-header {
    @apply flex-col gap-4;
  }
  
  .smart-actions-bar {
    @apply flex-col gap-4;
  }
  
  .overview-grid {
    @apply grid-cols-1;
  }
  
  .stats-grid {
    @apply grid-cols-1 sm:grid-cols-2;
  }
}
</style>