<template>
  <div class="coding-issues-view">
    <!-- Header with Smart Categorization -->
    <div class="view-header">
      <div class="header-info">
        <div class="issue-icon">
          <TagIcon class="w-8 h-8 text-yellow-600" />
        </div>
        <div class="header-content">
          <h3 class="view-title">Coding Issues</h3>
          <p class="view-description">
            {{ employees.length }} employees with incomplete expense coding
          </p>
        </div>
      </div>
      
      <div class="header-actions">
        <div v-if="selectedEmployees.length > 0" class="selection-info">
          <span class="selection-count">{{ selectedEmployees.length }} selected</span>
          <button @click="clearSelection" class="clear-selection-btn">Clear</button>
        </div>
        
        <div class="coding-actions">
          <button
            v-if="selectedEmployees.length > 0"
            @click="handleBulkAutoCode"
            class="bulk-action-btn primary"
            :disabled="autoCoding"
          >
            <SparklesIcon class="w-4 h-4" />
            Auto-Code ({{ selectedEmployees.length }})
          </button>
          
          <button
            v-if="selectedEmployees.length > 0"
            @click="handleBulkManualCode"
            class="bulk-action-btn secondary"
          >
            <PencilIcon class="w-4 h-4" />
            Manual Code
          </button>
          
          <button
            @click="handleSelectAll"
            class="select-all-btn"
            :class="{ 'active': allSelected }"
          >
            {{ allSelected ? 'Deselect All' : 'Select All' }}
          </button>
        </div>
      </div>
    </div>

    <!-- AI Suggestions Summary -->
    <div v-if="aiSuggestions.length > 0" class="ai-suggestions-panel">
      <div class="suggestions-header">
        <div class="suggestions-icon">
          <SparklesIcon class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h4 class="suggestions-title">AI Coding Suggestions</h4>
          <p class="suggestions-subtitle">
            {{ aiSuggestions.length }} smart suggestions ready for your review
          </p>
        </div>
        <button
          @click="handleApplyAllSuggestions"
          class="apply-all-btn"
          :disabled="applyingAll"
        >
          {{ applyingAll ? 'Applying...' : 'Apply All Confident Suggestions' }}
        </button>
      </div>
      
      <div class="suggestions-preview">
        <div
          v-for="suggestion in aiSuggestions.slice(0, 3)"
          :key="suggestion.id"
          class="suggestion-preview"
        >
          <span class="vendor-name">{{ suggestion.vendor }}</span>
          <ArrowRightIcon class="w-4 h-4 text-gray-400" />
          <span class="suggested-category">{{ suggestion.suggestedCategory }}</span>
          <span class="confidence-badge" :class="`confidence-${suggestion.confidence}`">
            {{ Math.round(suggestion.confidence * 100) }}%
          </span>
        </div>
        <div v-if="aiSuggestions.length > 3" class="more-suggestions">
          +{{ aiSuggestions.length - 3 }} more suggestions
        </div>
      </div>
    </div>

    <!-- Coding Categories Quick Filter -->
    <div class="category-filter">
      <div class="filter-header">
        <span class="filter-label">Quick Filter by Issue:</span>
        <button
          @click="resetFilters"
          class="reset-filter-btn"
          :class="{ 'active': hasActiveFilters }"
        >
          Reset Filters
        </button>
      </div>
      
      <div class="category-badges">
        <button
          v-for="category in codingCategories"
          :key="category.key"
          @click="toggleCategoryFilter(category.key)"
          class="category-badge"
          :class="{
            'active': activeCategoryFilters.includes(category.key),
            [`severity-${category.severity}`]: true
          }"
        >
          <component :is="category.icon" class="w-4 h-4" />
          {{ category.name }}
          <span class="count">({{ category.count }})</span>
        </button>
      </div>
    </div>

    <!-- Smart Controls -->
    <div class="smart-controls">
      <div class="control-group">
        <label class="control-label">Sort by:</label>
        <select v-model="sortBy" class="control-select">
          <option value="confidence">AI Confidence</option>
          <option value="amount">Transaction Amount</option>
          <option value="frequency">Vendor Frequency</option>
          <option value="date">Transaction Date</option>
          <option value="complexity">Complexity Score</option>
        </select>
      </div>
      
      <div class="control-group">
        <label class="control-label">View:</label>
        <div class="view-toggle">
          <button
            v-for="view in ['cards', 'table']"
            :key="view"
            @click="currentView = view"
            class="view-btn"
            :class="{ 'active': currentView === view }"
          >
            <component :is="getViewIcon(view)" class="w-4 h-4" />
            {{ view.charAt(0).toUpperCase() + view.slice(1) }}
          </button>
        </div>
      </div>
      
      <div class="control-group">
        <label class="control-label">Confidence Threshold:</label>
        <input
          v-model="confidenceThreshold"
          type="range"
          min="0"
          max="100"
          class="confidence-slider"
        />
        <span class="threshold-value">{{ confidenceThreshold }}%</span>
      </div>
    </div>

    <!-- Employee Coding List -->
    <div class="employee-list" :class="`view-${currentView}`">
      <!-- Cards View -->
      <div v-if="currentView === 'cards'" class="coding-cards">
        <TransitionGroup
          name="coding-card"
          tag="div"
          class="cards-grid"
        >
          <div
            v-for="employee in sortedAndFilteredEmployees"
            :key="employee.id"
            class="coding-card"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="selection-area">
                <input
                  type="checkbox"
                  :checked="selectedEmployees.includes(employee.id)"
                  @change="toggleEmployeeSelection(employee.id)"
                  class="checkbox"
                />
              </div>
              
              <div class="employee-info">
                <div class="employee-name">{{ employee.name }}</div>
                <div class="employee-details">
                  <span>{{ employee.employee_id }}</span>
                  <span>{{ employee.department }}</span>
                </div>
              </div>
              
              <div class="issue-badges">
                <span
                  v-for="issue in employee.codingIssues"
                  :key="issue"
                  class="issue-badge"
                  :class="`issue-${getIssueSeverity(issue)}`"
                >
                  {{ formatIssueType(issue) }}
                </span>
              </div>
            </div>

            <!-- Transaction Details -->
            <div class="transaction-details">
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="amount">{{ formatCurrency(employee.amount) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Vendor:</span>
                <span class="vendor">{{ employee.vendor || 'Unknown' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="date">{{ formatDate(employee.transaction_date) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Current Category:</span>
                <span class="current-category">
                  {{ employee.currentCategory || 'Uncategorized' }}
                </span>
              </div>
            </div>

            <!-- AI Suggestion -->
            <div v-if="employee.aiSuggestion" class="ai-suggestion">
              <div class="suggestion-header">
                <SparklesIcon class="w-4 h-4 text-blue-600" />
                <span class="suggestion-label">AI Suggestion</span>
                <div
                  class="confidence-badge"
                  :class="`confidence-${getConfidenceLevel(employee.aiSuggestion.confidence)}`"
                >
                  {{ Math.round(employee.aiSuggestion.confidence * 100) }}%
                </div>
              </div>
              
              <div class="suggestion-content">
                <div class="suggested-category">
                  {{ employee.aiSuggestion.category }}
                </div>
                <div v-if="employee.aiSuggestion.reasoning" class="suggestion-reasoning">
                  {{ employee.aiSuggestion.reasoning }}
                </div>
                <div v-if="employee.aiSuggestion.similarTransactions" class="similar-transactions">
                  Based on {{ employee.aiSuggestion.similarTransactions }} similar transactions
                </div>
              </div>
            </div>

            <!-- Coding Actions -->
            <div class="coding-actions">
              <div class="primary-actions">
                <button
                  v-if="employee.aiSuggestion && employee.aiSuggestion.confidence > 0.8"
                  @click="handleAcceptSuggestion(employee)"
                  class="action-btn accept"
                  :disabled="processing.includes(employee.id)"
                >
                  <CheckIcon class="w-4 h-4" />
                  Accept AI Suggestion
                </button>
                
                <button
                  @click="handleManualCode(employee)"
                  class="action-btn manual"
                >
                  <PencilIcon class="w-4 h-4" />
                  Manual Code
                </button>
                
                <button
                  @click="handleQuickCode(employee)"
                  class="action-btn quick"
                >
                  <BoltIcon class="w-4 h-4" />
                  Quick Code
                </button>
              </div>
              
              <div class="secondary-actions">
                <button
                  @click="handleViewSimilar(employee)"
                  class="secondary-btn"
                  title="View similar transactions"
                >
                  <EyeIcon class="w-4 h-4" />
                </button>
                <button
                  @click="handleReportIssue(employee)"
                  class="secondary-btn"
                  title="Report coding issue"
                >
                  <FlagIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Table View -->
      <div v-else-if="currentView === 'table'" class="coding-table-container">
        <table class="coding-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  @change="handleSelectAll"
                  class="checkbox"
                />
              </th>
              <th class="employee-col">Employee</th>
              <th class="amount-col">Amount</th>
              <th class="vendor-col">Vendor</th>
              <th class="current-col">Current Category</th>
              <th class="suggestion-col">AI Suggestion</th>
              <th class="confidence-col">Confidence</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="employee in sortedAndFilteredEmployees"
              :key="employee.id"
              class="table-row"
            >
              <td>
                <input
                  type="checkbox"
                  :checked="selectedEmployees.includes(employee.id)"
                  @change="toggleEmployeeSelection(employee.id)"
                  class="checkbox"
                />
              </td>
              <td>
                <div class="employee-cell">
                  <div class="employee-name">{{ employee.name }}</div>
                  <div class="employee-meta">{{ employee.employee_id }} • {{ employee.department }}</div>
                </div>
              </td>
              <td class="amount-cell">{{ formatCurrency(employee.amount) }}</td>
              <td class="vendor-cell">{{ employee.vendor || 'Unknown' }}</td>
              <td class="category-cell">
                <span class="current-category">
                  {{ employee.currentCategory || 'Uncategorized' }}
                </span>
              </td>
              <td class="suggestion-cell">
                <div v-if="employee.aiSuggestion" class="table-suggestion">
                  {{ employee.aiSuggestion.category }}
                </div>
                <span v-else class="no-suggestion">No suggestion</span>
              </td>
              <td class="confidence-cell">
                <div
                  v-if="employee.aiSuggestion"
                  class="confidence-badge"
                  :class="`confidence-${getConfidenceLevel(employee.aiSuggestion.confidence)}`"
                >
                  {{ Math.round(employee.aiSuggestion.confidence * 100) }}%
                </div>
              </td>
              <td class="actions-cell">
                <div class="table-actions">
                  <button
                    v-if="employee.aiSuggestion"
                    @click="handleAcceptSuggestion(employee)"
                    class="table-action-btn accept"
                    title="Accept AI suggestion"
                  >
                    <CheckIcon class="w-3 h-3" />
                  </button>
                  <button
                    @click="handleManualCode(employee)"
                    class="table-action-btn manual"
                    title="Manual code"
                  >
                    <PencilIcon class="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk Coding Progress -->
    <div v-if="bulkProgress.show" class="bulk-progress">
      <div class="progress-header">
        <span>Processing bulk coding...</span>
        <button @click="cancelBulkOperation" class="cancel-btn">Cancel</button>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${bulkProgress.percentage}%` }"
        ></div>
      </div>
      <div class="progress-info">
        {{ bulkProgress.completed }} of {{ bulkProgress.total }} completed
      </div>
    </div>

    <!-- Coding Modals -->
    <ManualCodingModal
      v-if="showManualCodingModal"
      :employee="manualCodingEmployee"
      :categories="availableCategories"
      @close="showManualCodingModal = false"
      @coding-complete="handleManualCodingComplete"
    />
    
    <QuickCodingModal
      v-if="showQuickCodingModal"
      :employee="quickCodingEmployee"
      :recent-categories="recentCategories"
      @close="showQuickCodingModal = false"
      @coding-complete="handleQuickCodingComplete"
    />
    
    <SimilarTransactionsModal
      v-if="showSimilarModal"
      :employee="similarModalEmployee"
      :similar-transactions="similarTransactions"
      @close="showSimilarModal = false"
      @apply-pattern="handleApplyPattern"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useApi } from '@/composables/useApi'
import ManualCodingModal from '../modals/ManualCodingModal.vue'
import QuickCodingModal from '../modals/QuickCodingModal.vue'
import SimilarTransactionsModal from '../modals/SimilarTransactionsModal.vue'

// Icons (simplified for brevity)
const TagIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>`
}

const SparklesIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>`
}

const PencilIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>`
}

const CheckIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5"/></svg>`
}

const BoltIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>`
}

const EyeIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
}

const FlagIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5v12z"/></svg>`
}

const ArrowRightIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>`
}

const Squares2X2Icon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>`
}

const TableCellsIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 0A2.25 2.25 0 015.625 3.375h13.5A2.25 2.25 0 0121.375 5.625m-19.5 0v3.75m0 0a2.25 2.25 0 002.25-2.25M21.375 5.625a2.25 2.25 0 00-2.25-2.25m2.25 2.25v3.75m0 0A2.25 2.25 0 0119.125 9h-2.25M21.375 8.625v0a2.25 2.25 0 00-2.25-2.25M19.125 9H17.25"/></svg>`
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
  'employee-coded',
  'bulk-coding-complete',
  'ai-training-data'
])

// Composables
const notificationStore = useNotificationStore()
const api = useApi()

// Reactive state
const selectedEmployees = ref([])
const activeCategoryFilters = ref([])
const sortBy = ref('confidence')
const currentView = ref('cards')
const confidenceThreshold = ref(70)
const processing = ref([])
const autoCoding = ref(false)
const applyingAll = ref(false)

// Modal state
const showManualCodingModal = ref(false)
const showQuickCodingModal = ref(false)
const showSimilarModal = ref(false)
const manualCodingEmployee = ref(null)
const quickCodingEmployee = ref(null)
const similarModalEmployee = ref(null)
const similarTransactions = ref([])

// Bulk progress
const bulkProgress = ref({
  show: false,
  completed: 0,
  total: 0,
  percentage: 0
})

// Data arrays
const availableCategories = ref([
  'Travel & Entertainment',
  'Office Supplies',
  'Professional Services',
  'Equipment & Hardware',
  'Training & Development',
  'Marketing & Advertising',
  'Telecommunications',
  'Utilities',
  'Insurance',
  'Subscriptions & Software'
])

const recentCategories = ref([])

// Computed properties
const allSelected = computed(() => {
  return props.employees.length > 0 && selectedEmployees.value.length === props.employees.length
})

const hasActiveFilters = computed(() => {
  return activeCategoryFilters.value.length > 0
})

const aiSuggestions = computed(() => {
  return props.employees
    .filter(emp => emp.aiSuggestion && emp.aiSuggestion.confidence >= confidenceThreshold.value / 100)
    .map(emp => ({
      id: emp.id,
      vendor: emp.vendor,
      suggestedCategory: emp.aiSuggestion.category,
      confidence: emp.aiSuggestion.confidence
    }))
})

const codingCategories = computed(() => {
  const categories = [
    { key: 'uncategorized', name: 'Uncategorized', severity: 'high', icon: 'TagIcon' },
    { key: 'low_confidence', name: 'Low AI Confidence', severity: 'medium', icon: 'SparklesIcon' },
    { key: 'policy_violation', name: 'Policy Issues', severity: 'high', icon: 'FlagIcon' },
    { key: 'manual_review', name: 'Needs Manual Review', severity: 'medium', icon: 'EyeIcon' }
  ]
  
  // Calculate counts for each category
  return categories.map(cat => ({
    ...cat,
    count: props.employees.filter(emp => 
      emp.codingIssues && emp.codingIssues.includes(cat.key)
    ).length
  }))
})

const sortedAndFilteredEmployees = computed(() => {
  let filtered = [...props.employees]
  
  // Apply category filters
  if (activeCategoryFilters.value.length > 0) {
    filtered = filtered.filter(emp => 
      activeCategoryFilters.value.some(filter => 
        emp.codingIssues && emp.codingIssues.includes(filter)
      )
    )
  }
  
  // Apply sorting
  return filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'confidence':
        const confA = a.aiSuggestion?.confidence || 0
        const confB = b.aiSuggestion?.confidence || 0
        return confB - confA
      case 'amount':
        return (b.amount || 0) - (a.amount || 0)
      case 'frequency':
        // Sort by how common this vendor is
        return (b.vendorFrequency || 0) - (a.vendorFrequency || 0)
      case 'date':
        return new Date(b.transaction_date) - new Date(a.transaction_date)
      case 'complexity':
        return (b.complexityScore || 0) - (a.complexityScore || 0)
      default:
        return 0
    }
  })
})

// Methods
const toggleEmployeeSelection = (employeeId) => {
  const index = selectedEmployees.value.indexOf(employeeId)
  if (index > -1) {
    selectedEmployees.value.splice(index, 1)
  } else {
    selectedEmployees.value.push(employeeId)
  }
}

const handleSelectAll = () => {
  if (allSelected.value) {
    selectedEmployees.value = []
  } else {
    selectedEmployees.value = props.employees.map(emp => emp.id)
  }
}

const clearSelection = () => {
  selectedEmployees.value = []
}

const toggleCategoryFilter = (categoryKey) => {
  const index = activeCategoryFilters.value.indexOf(categoryKey)
  if (index > -1) {
    activeCategoryFilters.value.splice(index, 1)
  } else {
    activeCategoryFilters.value.push(categoryKey)
  }
}

const resetFilters = () => {
  activeCategoryFilters.value = []
  confidenceThreshold.value = 70
}

const getViewIcon = (view) => {
  return view === 'cards' ? 'Squares2X2Icon' : 'TableCellsIcon'
}

const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.9) return 'high'
  if (confidence >= 0.7) return 'medium'
  return 'low'
}

const getIssueSeverity = (issue) => {
  const severityMap = {
    uncategorized: 'high',
    low_confidence: 'medium',
    policy_violation: 'high',
    manual_review: 'medium'
  }
  return severityMap[issue] || 'low'
}

const formatIssueType = (issue) => {
  return issue.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

const formatCurrency = (amount) => {
  if (!amount) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Action handlers
const handleAcceptSuggestion = async (employee) => {
  processing.value.push(employee.id)
  
  try {
    await api.acceptAICodingSuggestion({
      employee_id: employee.employee_id,
      session_id: props.sessionId,
      suggested_category: employee.aiSuggestion.category,
      confidence: employee.aiSuggestion.confidence
    })
    
    notificationStore.addSuccess(`Accepted AI suggestion for ${employee.name}`)
    emit('employee-coded', { 
      employee, 
      action: 'ai_suggestion_accepted',
      category: employee.aiSuggestion.category 
    })
    
  } catch (error) {
    console.error('Failed to accept AI suggestion:', error)
    notificationStore.addError(`Failed to accept suggestion for ${employee.name}`)
  } finally {
    processing.value = processing.value.filter(id => id !== employee.id)
  }
}

const handleManualCode = (employee) => {
  manualCodingEmployee.value = employee
  showManualCodingModal.value = true
}

const handleQuickCode = (employee) => {
  quickCodingEmployee.value = employee
  showQuickCodingModal.value = true
}

const handleViewSimilar = async (employee) => {
  try {
    const similar = await api.getSimilarTransactions({
      employee_id: employee.employee_id,
      vendor: employee.vendor,
      amount: employee.amount,
      session_id: props.sessionId
    })
    
    similarTransactions.value = similar
    similarModalEmployee.value = employee
    showSimilarModal.value = true
    
  } catch (error) {
    console.error('Failed to load similar transactions:', error)
    notificationStore.addError('Failed to load similar transactions')
  }
}

const handleReportIssue = async (employee) => {
  // Implementation for reporting coding issues
  notificationStore.addInfo(`Issue reported for ${employee.name}. Our team will review this case.`)
}

const handleBulkAutoCode = async () => {
  autoCoding.value = true
  bulkProgress.value = {
    show: true,
    completed: 0,
    total: selectedEmployees.value.length,
    percentage: 0
  }
  
  const results = []
  
  for (const employeeId of selectedEmployees.value) {
    const employee = props.employees.find(emp => emp.id === employeeId)
    if (employee && employee.aiSuggestion) {
      try {
        await api.acceptAICodingSuggestion({
          employee_id: employee.employee_id,
          session_id: props.sessionId,
          suggested_category: employee.aiSuggestion.category,
          confidence: employee.aiSuggestion.confidence
        })
        results.push({ employee, success: true })
      } catch (error) {
        results.push({ employee, success: false, error })
      }
    }
    
    bulkProgress.value.completed++
    bulkProgress.value.percentage = (bulkProgress.value.completed / bulkProgress.value.total) * 100
  }
  
  bulkProgress.value.show = false
  autoCoding.value = false
  selectedEmployees.value = []
  
  const successful = results.filter(r => r.success).length
  notificationStore.addSuccess(`Successfully auto-coded ${successful} employees`)
  
  emit('bulk-coding-complete', { action: 'bulk_auto_code', results })
}

const handleBulkManualCode = () => {
  // Open bulk manual coding interface
  notificationStore.addInfo('Bulk manual coding interface opening...')
}

const handleApplyAllSuggestions = async () => {
  applyingAll.value = true
  
  const highConfidenceSuggestions = aiSuggestions.value.filter(s => s.confidence >= 0.9)
  const results = []
  
  for (const suggestion of highConfidenceSuggestions) {
    const employee = props.employees.find(emp => emp.id === suggestion.id)
    if (employee) {
      try {
        await api.acceptAICodingSuggestion({
          employee_id: employee.employee_id,
          session_id: props.sessionId,
          suggested_category: suggestion.suggestedCategory,
          confidence: suggestion.confidence
        })
        results.push({ employee, success: true })
      } catch (error) {
        results.push({ employee, success: false, error })
      }
    }
  }
  
  applyingAll.value = false
  
  const successful = results.filter(r => r.success).length
  notificationStore.addSuccess(`Applied ${successful} high-confidence AI suggestions`)
  
  emit('bulk-coding-complete', { action: 'apply_all_suggestions', results })
}

const handleManualCodingComplete = (result) => {
  notificationStore.addSuccess(`Successfully coded ${result.employee.name}`)
  emit('employee-coded', {
    employee: result.employee,
    action: 'manual_coding',
    category: result.category
  })
  showManualCodingModal.value = false
}

const handleQuickCodingComplete = (result) => {
  // Add to recent categories for future quick access
  if (!recentCategories.value.includes(result.category)) {
    recentCategories.value.unshift(result.category)
    if (recentCategories.value.length > 10) {
      recentCategories.value.pop()
    }
  }
  
  notificationStore.addSuccess(`Quick-coded ${result.employee.name}`)
  emit('employee-coded', result)
  showQuickCodingModal.value = false
}

const handleApplyPattern = (pattern) => {
  notificationStore.addInfo(`Applied coding pattern: ${pattern.name}`)
  showSimilarModal.value = false
}

const cancelBulkOperation = () => {
  bulkProgress.value.show = false
  autoCoding.value = false
  applyingAll.value = false
}

// Watch for employee list changes
watch(() => props.employees.length, () => {
  selectedEmployees.value = selectedEmployees.value.filter(id => 
    props.employees.some(emp => emp.id === id)
  )
})
</script>

<style scoped>
.coding-issues-view {
  @apply space-y-6;
}

/* Header */
.view-header {
  @apply flex items-center justify-between p-6 bg-yellow-50 border border-yellow-200 rounded-lg;
}

.header-info {
  @apply flex items-center gap-4;
}

.issue-icon {
  @apply flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center;
}

.view-title {
  @apply text-xl font-bold text-yellow-900;
}

.view-description {
  @apply text-yellow-700;
}

.header-actions {
  @apply flex items-center gap-4;
}

.coding-actions {
  @apply flex gap-2;
}

.bulk-action-btn {
  @apply flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200;
}

.bulk-action-btn.primary {
  @apply bg-yellow-600 text-white hover:bg-yellow-700;
}

.bulk-action-btn.secondary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

/* AI Suggestions Panel */
.ai-suggestions-panel {
  @apply bg-blue-50 border border-blue-200 rounded-lg p-4;
}

.suggestions-header {
  @apply flex items-center justify-between mb-3;
}

.suggestions-icon {
  @apply flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3;
}

.suggestions-title {
  @apply font-semibold text-blue-900;
}

.suggestions-subtitle {
  @apply text-sm text-blue-700;
}

.apply-all-btn {
  @apply px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50;
}

.suggestions-preview {
  @apply flex flex-wrap items-center gap-4;
}

.suggestion-preview {
  @apply flex items-center gap-2 text-sm;
}

.vendor-name {
  @apply font-medium text-gray-900;
}

.suggested-category {
  @apply text-blue-700 font-medium;
}

.confidence-badge {
  @apply px-2 py-1 text-xs font-bold rounded-full;
}

.confidence-high {
  @apply bg-green-100 text-green-800;
}

.confidence-medium {
  @apply bg-yellow-100 text-yellow-800;
}

.confidence-low {
  @apply bg-red-100 text-red-800;
}

/* Category Filter */
.category-filter {
  @apply bg-white border border-gray-200 rounded-lg p-4;
}

.filter-header {
  @apply flex justify-between items-center mb-3;
}

.filter-label {
  @apply font-medium text-gray-700;
}

.reset-filter-btn {
  @apply text-sm text-gray-600 hover:text-gray-900 underline;
}

.reset-filter-btn.active {
  @apply text-blue-600 hover:text-blue-800;
}

.category-badges {
  @apply flex flex-wrap gap-2;
}

.category-badge {
  @apply flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-200;
}

.category-badge.severity-high {
  @apply border-red-300 text-red-700 hover:bg-red-50;
}

.category-badge.severity-medium {
  @apply border-yellow-300 text-yellow-700 hover:bg-yellow-50;
}

.category-badge.active {
  @apply bg-blue-600 text-white border-blue-600;
}

.count {
  @apply ml-1 text-xs opacity-75;
}

/* Smart Controls */
.smart-controls {
  @apply flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg;
}

.control-group {
  @apply flex items-center gap-2;
}

.control-label {
  @apply text-sm font-medium text-gray-700;
}

.control-select {
  @apply px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500;
}

.view-toggle {
  @apply flex gap-1;
}

.view-btn {
  @apply flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all;
}

.view-btn.active {
  @apply bg-white text-yellow-600 shadow-sm;
}

.confidence-slider {
  @apply w-24;
}

.threshold-value {
  @apply text-sm font-medium text-gray-700;
}

/* Coding Cards */
.coding-cards .cards-grid {
  @apply grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6;
}

.coding-card {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.card-header {
  @apply flex items-start justify-between mb-4;
}

.selection-area {
  @apply flex-shrink-0 mr-3;
}

.checkbox {
  @apply rounded border-gray-300 text-yellow-600 focus:ring-yellow-500;
}

.employee-info {
  @apply flex-1 min-w-0;
}

.employee-name {
  @apply font-semibold text-gray-900;
}

.employee-details {
  @apply text-sm text-gray-600 space-x-2;
}

.issue-badges {
  @apply flex flex-wrap gap-1;
}

.issue-badge {
  @apply px-2 py-1 text-xs font-medium rounded-full;
}

.issue-high {
  @apply bg-red-100 text-red-800;
}

.issue-medium {
  @apply bg-yellow-100 text-yellow-800;
}

.issue-low {
  @apply bg-blue-100 text-blue-800;
}

.transaction-details {
  @apply space-y-2 mb-4;
}

.detail-row {
  @apply flex justify-between items-center text-sm;
}

.detail-row .label {
  @apply text-gray-600;
}

.detail-row .amount {
  @apply font-semibold text-green-600;
}

/* AI Suggestion in Card */
.ai-suggestion {
  @apply bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4;
}

.suggestion-header {
  @apply flex items-center justify-between mb-2;
}

.suggestion-label {
  @apply text-sm font-medium text-blue-700;
}

.suggestion-content {
  @apply space-y-1;
}

.suggested-category {
  @apply font-semibold text-blue-900;
}

.suggestion-reasoning {
  @apply text-xs text-blue-700;
}

.similar-transactions {
  @apply text-xs text-blue-600;
}

/* Coding Actions */
.coding-actions {
  @apply flex justify-between items-center;
}

.primary-actions {
  @apply flex gap-2;
}

.action-btn {
  @apply flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200;
}

.action-btn.accept {
  @apply bg-green-600 text-white hover:bg-green-700;
}

.action-btn.manual {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.action-btn.quick {
  @apply bg-purple-600 text-white hover:bg-purple-700;
}

.secondary-actions {
  @apply flex gap-1;
}

.secondary-btn {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors;
}

/* Table View */
.coding-table-container {
  @apply bg-white border border-gray-200 rounded-lg overflow-hidden;
}

.coding-table {
  @apply w-full;
}

.coding-table th {
  @apply px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50;
}

.coding-table td {
  @apply px-4 py-4 whitespace-nowrap text-sm border-b border-gray-200;
}

.table-row:hover {
  @apply bg-gray-50;
}

.employee-cell {
  @apply space-y-1;
}

.employee-meta {
  @apply text-gray-500 text-xs;
}

.table-suggestion {
  @apply font-medium text-blue-700;
}

.no-suggestion {
  @apply text-gray-400 text-xs;
}

.table-actions {
  @apply flex gap-1;
}

.table-action-btn {
  @apply p-1.5 rounded transition-colors;
}

.table-action-btn.accept {
  @apply text-green-600 hover:bg-green-100;
}

.table-action-btn.manual {
  @apply text-blue-600 hover:bg-blue-100;
}

/* Bulk Progress */
.bulk-progress {
  @apply fixed bottom-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50;
}

.progress-header {
  @apply flex justify-between items-center mb-2;
}

.cancel-btn {
  @apply text-sm text-red-600 hover:text-red-800 underline;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-2 mb-2;
}

.progress-fill {
  @apply bg-yellow-600 h-2 rounded-full transition-all duration-300;
}

.progress-info {
  @apply text-sm text-gray-600;
}

/* Animations */
.coding-card-enter-active,
.coding-card-leave-active {
  @apply transition-all duration-300;
}

.coding-card-enter-from,
.coding-card-leave-to {
  @apply opacity-0 transform scale-95;
}

/* Responsive */
@media (max-width: 1024px) {
  .coding-cards .cards-grid {
    @apply grid-cols-1 lg:grid-cols-2;
  }
  
  .smart-controls {
    @apply flex-col gap-4;
  }
}

@media (max-width: 768px) {
  .view-header {
    @apply flex-col gap-4 items-start;
  }
  
  .coding-cards .cards-grid {
    @apply grid-cols-1;
  }
  
  .primary-actions {
    @apply flex-col gap-2;
  }
  
  .coding-actions {
    @apply flex-col gap-3;
  }
}
</style>