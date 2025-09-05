<template>
  <div class="data-mismatches-view">
    <!-- Header with Resolution Summary -->
    <div class="view-header">
      <div class="header-info">
        <div class="issue-icon">
          <ExclamationTriangleIcon class="w-8 h-8 text-red-600" />
        </div>
        <div class="header-content">
          <h3 class="view-title">Data Mismatches</h3>
          <p class="view-description">
            {{ employees.length }} employees with CAR vs Receipt discrepancies
          </p>
          <div class="mismatch-summary">
            <div class="summary-stat">
              <span class="stat-label">Total Variance:</span>
              <span class="stat-value variance" :class="totalVarianceClass">
                {{ formatCurrency(totalVariance) }}
              </span>
            </div>
            <div class="summary-stat">
              <span class="stat-label">Avg Variance:</span>
              <span class="stat-value">{{ formatCurrency(averageVariance) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="header-actions">
        <div v-if="selectedEmployees.length > 0" class="selection-info">
          <span class="selection-count">{{ selectedEmployees.length }} selected</span>
          <button @click="clearSelection" class="clear-selection-btn">Clear</button>
        </div>
        
        <div class="resolution-actions">
          <button
            v-if="selectedEmployees.length > 0"
            @click="handleBulkResolution('accept_car')"
            class="bulk-action-btn car"
            :disabled="resolving"
          >
            <DocumentTextIcon class="w-4 h-4" />
            Accept CAR ({{ selectedEmployees.length }})
          </button>
          
          <button
            v-if="selectedEmployees.length > 0"
            @click="handleBulkResolution('accept_receipt')"
            class="bulk-action-btn receipt"
            :disabled="resolving"
          >
            <ReceiptPercentIcon class="w-4 h-4" />
            Accept Receipt ({{ selectedEmployees.length }})
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

    <!-- Variance Analysis -->
    <div class="variance-analysis">
      <div class="analysis-header">
        <h4 class="analysis-title">Variance Analysis</h4>
        <div class="analysis-controls">
          <select v-model="varianceThreshold" class="threshold-select">
            <option value="0">Show All Variances</option>
            <option value="25">$25+ Variances</option>
            <option value="100">$100+ Variances</option>
            <option value="500">$500+ Variances</option>
          </select>
        </div>
      </div>
      
      <div class="variance-distribution">
        <div class="distribution-chart">
          <div
            v-for="range in varianceRanges"
            :key="range.label"
            class="variance-bar"
            :style="{ height: `${range.percentage}%` }"
            :class="`severity-${range.severity}`"
            :title="`${range.count} employees with ${range.label} variance`"
          >
            <div class="bar-label">{{ range.label }}</div>
            <div class="bar-count">{{ range.count }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Smart Filters -->
    <div class="smart-filters">
      <div class="filter-group">
        <label class="filter-label">Variance Type:</label>
        <div class="filter-buttons">
          <button
            v-for="type in varianceTypes"
            :key="type.key"
            @click="toggleVarianceFilter(type.key)"
            class="filter-btn"
            :class="{
              'active': activeVarianceFilters.includes(type.key),
              [`type-${type.key}`]: true
            }"
          >
            <component :is="type.icon" class="w-4 h-4" />
            {{ type.name }}
            <span class="count">({{ type.count }})</span>
          </button>
        </div>
      </div>
      
      <div class="filter-group">
        <label class="filter-label">Sort & View:</label>
        <div class="sort-controls">
          <select v-model="sortBy" class="sort-select">
            <option value="variance_desc">Highest Variance</option>
            <option value="variance_asc">Lowest Variance</option>
            <option value="percentage_desc">Highest Percentage</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="complexity">Most Complex</option>
          </select>
          
          <div class="view-toggle">
            <button
              v-for="view in ['comparison', 'details']"
              :key="view"
              @click="currentView = view"
              class="view-btn"
              :class="{ 'active': currentView === view }"
            >
              <component :is="getViewIcon(view)" class="w-4 h-4" />
              {{ view === 'comparison' ? 'Compare' : 'Details' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Employee Mismatch List -->
    <div class="employee-list" :class="`view-${currentView}`">
      <!-- Comparison View -->
      <div v-if="currentView === 'comparison'" class="comparison-cards">
        <TransitionGroup
          name="mismatch-card"
          tag="div"
          class="comparison-grid"
        >
          <div
            v-for="employee in sortedAndFilteredEmployees"
            :key="employee.id"
            class="mismatch-card"
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
                  <span>{{ formatDate(employee.transaction_date) }}</span>
                </div>
              </div>
              
              <div class="variance-indicator" :class="getVarianceSeverityClass(employee)">
                <div class="variance-amount">{{ formatCurrency(Math.abs(employee.variance)) }}</div>
                <div class="variance-percentage">{{ getVariancePercentage(employee) }}%</div>
              </div>
            </div>

            <!-- Amount Comparison -->
            <div class="amount-comparison">
              <div class="comparison-section car-section">
                <div class="section-header">
                  <DocumentTextIcon class="w-5 h-5 text-blue-600" />
                  <span class="section-label">CAR Amount</span>
                </div>
                <div class="amount-value car-amount">
                  {{ formatCurrency(employee.car_amount) }}
                </div>
                <div class="amount-details">
                  <div v-if="employee.car_details" class="detail-list">
                    <div class="detail-item">
                      <span class="detail-label">Date:</span>
                      <span>{{ formatDate(employee.car_details.date) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Vendor:</span>
                      <span>{{ employee.car_details.vendor }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Reference:</span>
                      <span>{{ employee.car_details.reference }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="comparison-divider">
                <div class="vs-indicator">VS</div>
                <div class="variance-arrow" :class="employee.variance > 0 ? 'car-higher' : 'receipt-higher'">
                  <ArrowRightIcon class="w-6 h-6" />
                </div>
              </div>
              
              <div class="comparison-section receipt-section">
                <div class="section-header">
                  <ReceiptPercentIcon class="w-5 h-5 text-green-600" />
                  <span class="section-label">Receipt Amount</span>
                </div>
                <div class="amount-value receipt-amount">
                  {{ formatCurrency(employee.receipt_amount) }}
                </div>
                <div class="amount-details">
                  <div v-if="employee.receipt_details" class="detail-list">
                    <div class="detail-item">
                      <span class="detail-label">Type:</span>
                      <span>{{ employee.receipt_details.type }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Quality:</span>
                      <span class="quality-badge" :class="`quality-${employee.receipt_details.quality}`">
                        {{ employee.receipt_details.quality }}
                      </span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">OCR Confidence:</span>
                      <span>{{ employee.receipt_details.ocr_confidence }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Resolution Actions -->
            <div class="resolution-actions">
              <div class="primary-actions">
                <button
                  @click="handleQuickResolution(employee, 'accept_car')"
                  class="resolution-btn car-action"
                  :disabled="processing.includes(employee.id)"
                >
                  <CheckIcon class="w-4 h-4" />
                  Accept CAR
                </button>
                
                <button
                  @click="handleQuickResolution(employee, 'accept_receipt')"
                  class="resolution-btn receipt-action"
                  :disabled="processing.includes(employee.id)"
                >
                  <CheckIcon class="w-4 h-4" />
                  Accept Receipt
                </button>
                
                <button
                  @click="handleManualReview(employee)"
                  class="resolution-btn manual-review"
                >
                  <MagnifyingGlassIcon class="w-4 h-4" />
                  Manual Review
                </button>
              </div>
              
              <div class="secondary-actions">
                <button
                  @click="handleViewEvidence(employee)"
                  class="secondary-btn"
                  title="View supporting documents"
                >
                  <EyeIcon class="w-4 h-4" />
                </button>
                <button
                  @click="handleFlag(employee)"
                  class="secondary-btn"
                  title="Flag for investigation"
                >
                  <FlagIcon class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Investigation Notes -->
            <div v-if="employee.investigation_notes" class="investigation-notes">
              <div class="notes-header">
                <InformationCircleIcon class="w-4 h-4 text-blue-600" />
                <span class="notes-label">Investigation Notes</span>
              </div>
              <div class="notes-content">
                {{ employee.investigation_notes }}
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Details View (Table) -->
      <div v-else-if="currentView === 'details'" class="details-table-container">
        <table class="mismatch-table">
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
              <th class="car-amount-col">CAR Amount</th>
              <th class="receipt-amount-col">Receipt Amount</th>
              <th class="variance-col">Variance</th>
              <th class="percentage-col">%</th>
              <th class="quality-col">Receipt Quality</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="employee in sortedAndFilteredEmployees"
              :key="employee.id"
              class="table-row"
              :class="getVarianceSeverityClass(employee)"
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
                  <div class="employee-meta">
                    {{ employee.employee_id }} • {{ employee.department }}
                  </div>
                </div>
              </td>
              <td class="car-amount-cell">{{ formatCurrency(employee.car_amount) }}</td>
              <td class="receipt-amount-cell">{{ formatCurrency(employee.receipt_amount) }}</td>
              <td class="variance-cell">
                <div class="variance-display" :class="employee.variance > 0 ? 'car-higher' : 'receipt-higher'">
                  {{ formatCurrency(Math.abs(employee.variance)) }}
                </div>
              </td>
              <td class="percentage-cell">{{ getVariancePercentage(employee) }}%</td>
              <td class="quality-cell">
                <span 
                  v-if="employee.receipt_details"
                  class="quality-badge" 
                  :class="`quality-${employee.receipt_details.quality}`"
                >
                  {{ employee.receipt_details.quality }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="table-actions">
                  <button
                    @click="handleQuickResolution(employee, 'accept_car')"
                    class="table-action-btn car-action"
                    title="Accept CAR amount"
                  >
                    CAR
                  </button>
                  <button
                    @click="handleQuickResolution(employee, 'accept_receipt')"
                    class="table-action-btn receipt-action"
                    title="Accept Receipt amount"
                  >
                    RCP
                  </button>
                  <button
                    @click="handleManualReview(employee)"
                    class="table-action-btn manual-action"
                    title="Manual review"
                  >
                    <MagnifyingGlassIcon class="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Resolution Progress -->
    <div v-if="resolutionProgress.show" class="resolution-progress">
      <div class="progress-header">
        <span>Resolving mismatches...</span>
        <button @click="cancelResolution" class="cancel-btn">Cancel</button>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${resolutionProgress.percentage}%` }"
        ></div>
      </div>
      <div class="progress-info">
        {{ resolutionProgress.completed }} of {{ resolutionProgress.total }} resolved
      </div>
    </div>

    <!-- Resolution Modals -->
    <ManualReviewModal
      v-if="showManualReviewModal"
      :employee="manualReviewEmployee"
      :supporting-documents="supportingDocuments"
      @close="showManualReviewModal = false"
      @resolution-complete="handleManualResolutionComplete"
    />
    
    <EvidenceModal
      v-if="showEvidenceModal"
      :employee="evidenceModalEmployee"
      :car-details="carEvidence"
      :receipt-details="receiptEvidence"
      @close="showEvidenceModal = false"
    />
    
    <InvestigationModal
      v-if="showInvestigationModal"
      :employee="investigationEmployee"
      @close="showInvestigationModal = false"
      @flag-submitted="handleFlagSubmitted"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useApi } from '@/composables/useApi'
import ManualReviewModal from '../modals/ManualReviewModal.vue'
import EvidenceModal from '../modals/EvidenceModal.vue'
import InvestigationModal from '../modals/InvestigationModal.vue'

// Icons (simplified)
const ExclamationTriangleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>`
}

const DocumentTextIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`
}

const ReceiptPercentIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"/></svg>`
}

const CheckIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5"/></svg>`
}

const MagnifyingGlassIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"/></svg>`
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

const InformationCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.67-1.34l.04-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>`
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
  'mismatch-resolved',
  'bulk-resolution-complete',
  'investigation-flagged'
])

// Composables
const notificationStore = useNotificationStore()
const api = useApi()

// Reactive state
const selectedEmployees = ref([])
const activeVarianceFilters = ref([])
const varianceThreshold = ref(0)
const sortBy = ref('variance_desc')
const currentView = ref('comparison')
const processing = ref([])
const resolving = ref(false)

// Modal state
const showManualReviewModal = ref(false)
const showEvidenceModal = ref(false)
const showInvestigationModal = ref(false)
const manualReviewEmployee = ref(null)
const evidenceModalEmployee = ref(null)
const investigationEmployee = ref(null)
const supportingDocuments = ref([])
const carEvidence = ref(null)
const receiptEvidence = ref(null)

// Resolution progress
const resolutionProgress = ref({
  show: false,
  completed: 0,
  total: 0,
  percentage: 0
})

// Computed properties
const allSelected = computed(() => {
  return props.employees.length > 0 && selectedEmployees.value.length === props.employees.length
})

const totalVariance = computed(() => {
  return props.employees.reduce((sum, emp) => sum + Math.abs(emp.variance || 0), 0)
})

const averageVariance = computed(() => {
  return props.employees.length > 0 ? totalVariance.value / props.employees.length : 0
})

const totalVarianceClass = computed(() => {
  if (totalVariance.value > 10000) return 'high-variance'
  if (totalVariance.value > 5000) return 'medium-variance'
  return 'low-variance'
})

const varianceRanges = computed(() => {
  const ranges = [
    { label: '$0-25', min: 0, max: 25, severity: 'low' },
    { label: '$25-100', min: 25, max: 100, severity: 'medium' },
    { label: '$100-500', min: 100, max: 500, severity: 'high' },
    { label: '$500+', min: 500, max: Infinity, severity: 'critical' }
  ]
  
  const maxCount = Math.max(...ranges.map(r => r.count))
  
  return ranges.map(range => {
    const count = props.employees.filter(emp => {
      const variance = Math.abs(emp.variance || 0)
      return variance >= range.min && (range.max === Infinity || variance < range.max)
    }).length
    
    return {
      ...range,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0
    }
  })
})

const varianceTypes = computed(() => {
  return [
    {
      key: 'car_higher',
      name: 'CAR Higher',
      icon: 'DocumentTextIcon',
      count: props.employees.filter(emp => (emp.variance || 0) > 0).length
    },
    {
      key: 'receipt_higher',
      name: 'Receipt Higher',
      icon: 'ReceiptPercentIcon',
      count: props.employees.filter(emp => (emp.variance || 0) < 0).length
    },
    {
      key: 'low_quality',
      name: 'Poor Receipt Quality',
      icon: 'ExclamationTriangleIcon',
      count: props.employees.filter(emp => 
        emp.receipt_details && emp.receipt_details.quality === 'low'
      ).length
    }
  ]
})

const sortedAndFilteredEmployees = computed(() => {
  let filtered = [...props.employees]
  
  // Apply variance threshold filter
  if (varianceThreshold.value > 0) {
    filtered = filtered.filter(emp => Math.abs(emp.variance || 0) >= varianceThreshold.value)
  }
  
  // Apply variance type filters
  if (activeVarianceFilters.value.length > 0) {
    filtered = filtered.filter(emp => {
      return activeVarianceFilters.value.some(filter => {
        switch (filter) {
          case 'car_higher':
            return (emp.variance || 0) > 0
          case 'receipt_higher':
            return (emp.variance || 0) < 0
          case 'low_quality':
            return emp.receipt_details && emp.receipt_details.quality === 'low'
          default:
            return false
        }
      })
    })
  }
  
  // Apply sorting
  return filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'variance_desc':
        return Math.abs(b.variance || 0) - Math.abs(a.variance || 0)
      case 'variance_asc':
        return Math.abs(a.variance || 0) - Math.abs(b.variance || 0)
      case 'percentage_desc':
        const percA = getVariancePercentage(a)
        const percB = getVariancePercentage(b)
        return percB - percA
      case 'amount_desc':
        return Math.max(b.car_amount || 0, b.receipt_amount || 0) - 
               Math.max(a.car_amount || 0, a.receipt_amount || 0)
      case 'complexity':
        return (b.complexity_score || 0) - (a.complexity_score || 0)
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

const toggleVarianceFilter = (filterKey) => {
  const index = activeVarianceFilters.value.indexOf(filterKey)
  if (index > -1) {
    activeVarianceFilters.value.splice(index, 1)
  } else {
    activeVarianceFilters.value.push(filterKey)
  }
}

const getViewIcon = (view) => {
  return view === 'comparison' ? 'DocumentTextIcon' : 'TableCellsIcon'
}

const getVariancePercentage = (employee) => {
  const base = Math.max(employee.car_amount || 0, employee.receipt_amount || 0)
  if (base === 0) return 0
  return Math.round((Math.abs(employee.variance || 0) / base) * 100)
}

const getVarianceSeverityClass = (employee) => {
  const variance = Math.abs(employee.variance || 0)
  const percentage = getVariancePercentage(employee)
  
  if (variance >= 500 || percentage >= 25) return 'severity-critical'
  if (variance >= 100 || percentage >= 10) return 'severity-high'
  if (variance >= 25 || percentage >= 5) return 'severity-medium'
  return 'severity-low'
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
const handleQuickResolution = async (employee, resolutionType) => {
  processing.value.push(employee.id)
  
  try {
    const acceptedAmount = resolutionType === 'accept_car' ? 
      employee.car_amount : employee.receipt_amount
    
    await api.resolveMismatch({
      employee_id: employee.employee_id,
      session_id: props.sessionId,
      resolution_type: resolutionType,
      accepted_amount: acceptedAmount,
      variance: employee.variance,
      notes: `Quick resolution: ${resolutionType.replace('_', ' ')}`
    })
    
    notificationStore.addSuccess(
      `Resolved mismatch for ${employee.name} (${resolutionType.replace('_', ' ')})`
    )
    
    emit('mismatch-resolved', { 
      employee, 
      resolution: resolutionType,
      accepted_amount: acceptedAmount
    })
    
  } catch (error) {
    console.error('Mismatch resolution failed:', error)
    notificationStore.addError(`Failed to resolve mismatch for ${employee.name}`)
  } finally {
    processing.value = processing.value.filter(id => id !== employee.id)
  }
}

const handleBulkResolution = async (resolutionType) => {
  resolving.value = true
  resolutionProgress.value = {
    show: true,
    completed: 0,
    total: selectedEmployees.value.length,
    percentage: 0
  }
  
  const results = []
  
  for (const employeeId of selectedEmployees.value) {
    const employee = props.employees.find(emp => emp.id === employeeId)
    if (employee) {
      try {
        const acceptedAmount = resolutionType === 'accept_car' ? 
          employee.car_amount : employee.receipt_amount
        
        await api.resolveMismatch({
          employee_id: employee.employee_id,
          session_id: props.sessionId,
          resolution_type: resolutionType,
          accepted_amount: acceptedAmount,
          variance: employee.variance,
          notes: `Bulk resolution: ${resolutionType.replace('_', ' ')}`
        })
        
        results.push({ employee, success: true, resolution: resolutionType })
      } catch (error) {
        results.push({ employee, success: false, error })
      }
    }
    
    resolutionProgress.value.completed++
    resolutionProgress.value.percentage = (resolutionProgress.value.completed / resolutionProgress.value.total) * 100
  }
  
  resolutionProgress.value.show = false
  resolving.value = false
  selectedEmployees.value = []
  
  const successful = results.filter(r => r.success).length
  notificationStore.addSuccess(`Successfully resolved ${successful} mismatches`)
  
  emit('bulk-resolution-complete', { 
    action: resolutionType,
    results
  })
}

const handleManualReview = async (employee) => {
  try {
    // Load supporting documents
    supportingDocuments.value = await api.getSupportingDocuments({
      employee_id: employee.employee_id,
      session_id: props.sessionId
    })
    
    manualReviewEmployee.value = employee
    showManualReviewModal.value = true
    
  } catch (error) {
    console.error('Failed to load supporting documents:', error)
    notificationStore.addError('Failed to load supporting documents')
  }
}

const handleViewEvidence = async (employee) => {
  try {
    const evidence = await api.getEvidenceDetails({
      employee_id: employee.employee_id,
      session_id: props.sessionId
    })
    
    carEvidence.value = evidence.car_details
    receiptEvidence.value = evidence.receipt_details
    evidenceModalEmployee.value = employee
    showEvidenceModal.value = true
    
  } catch (error) {
    console.error('Failed to load evidence:', error)
    notificationStore.addError('Failed to load evidence details')
  }
}

const handleFlag = (employee) => {
  investigationEmployee.value = employee
  showInvestigationModal.value = true
}

const handleManualResolutionComplete = (result) => {
  notificationStore.addSuccess(`Manual review completed for ${result.employee.name}`)
  emit('mismatch-resolved', result)
  showManualReviewModal.value = false
}

const handleFlagSubmitted = (result) => {
  notificationStore.addInfo(`Investigation flagged for ${result.employee.name}`)
  emit('investigation-flagged', result)
  showInvestigationModal.value = false
}

const cancelResolution = () => {
  resolutionProgress.value.show = false
  resolving.value = false
}

// Watch for employee list changes
watch(() => props.employees.length, () => {
  selectedEmployees.value = selectedEmployees.value.filter(id => 
    props.employees.some(emp => emp.id === id)
  )
})
</script>

<style scoped>
.data-mismatches-view {
  @apply space-y-6;
}

/* Header */
.view-header {
  @apply flex items-start justify-between p-6 bg-red-50 border border-red-200 rounded-lg;
}

.header-info {
  @apply flex items-start gap-4;
}

.issue-icon {
  @apply flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center;
}

.view-title {
  @apply text-xl font-bold text-red-900;
}

.view-description {
  @apply text-red-700 mb-2;
}

.mismatch-summary {
  @apply flex gap-6;
}

.summary-stat {
  @apply space-y-1;
}

.stat-label {
  @apply text-sm text-red-600;
}

.stat-value {
  @apply font-bold;
}

.stat-value.variance.high-variance {
  @apply text-red-800;
}

.stat-value.variance.medium-variance {
  @apply text-yellow-800;
}

.stat-value.variance.low-variance {
  @apply text-green-800;
}

.header-actions {
  @apply flex items-center gap-4;
}

.resolution-actions {
  @apply flex gap-2;
}

.bulk-action-btn {
  @apply flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200;
}

.bulk-action-btn.car {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.bulk-action-btn.receipt {
  @apply bg-green-600 text-white hover:bg-green-700;
}

/* Variance Analysis */
.variance-analysis {
  @apply bg-white border border-gray-200 rounded-lg p-4;
}

.analysis-header {
  @apply flex justify-between items-center mb-4;
}

.analysis-title {
  @apply font-semibold text-gray-900;
}

.threshold-select {
  @apply px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500;
}

.variance-distribution {
  @apply bg-gray-50 rounded-lg p-4;
}

.distribution-chart {
  @apply flex items-end justify-around h-32 gap-2;
}

.variance-bar {
  @apply relative flex-1 max-w-20 rounded-t transition-all duration-300 cursor-pointer hover:opacity-75;
}

.variance-bar.severity-low {
  @apply bg-green-400;
}

.variance-bar.severity-medium {
  @apply bg-yellow-400;
}

.variance-bar.severity-high {
  @apply bg-orange-400;
}

.variance-bar.severity-critical {
  @apply bg-red-400;
}

.bar-label {
  @apply absolute -bottom-6 left-0 right-0 text-xs text-center text-gray-600;
}

.bar-count {
  @apply absolute -top-6 left-0 right-0 text-xs text-center font-medium;
}

/* Smart Filters */
.smart-filters {
  @apply bg-white border border-gray-200 rounded-lg p-4 space-y-4;
}

.filter-group {
  @apply flex items-center gap-4;
}

.filter-label {
  @apply text-sm font-medium text-gray-700 min-w-24;
}

.filter-buttons {
  @apply flex flex-wrap gap-2;
}

.filter-btn {
  @apply flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-200;
}

.filter-btn.type-car_higher {
  @apply border-blue-300 text-blue-700 hover:bg-blue-50;
}

.filter-btn.type-receipt_higher {
  @apply border-green-300 text-green-700 hover:bg-green-50;
}

.filter-btn.type-low_quality {
  @apply border-red-300 text-red-700 hover:bg-red-50;
}

.filter-btn.active {
  @apply bg-gray-800 text-white border-gray-800;
}

.sort-controls {
  @apply flex items-center gap-3;
}

.sort-select {
  @apply px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500;
}

.view-toggle {
  @apply flex gap-1;
}

.view-btn {
  @apply flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all;
}

.view-btn.active {
  @apply bg-white text-red-600 shadow-sm;
}

/* Comparison Cards */
.comparison-cards .comparison-grid {
  @apply grid grid-cols-1 xl:grid-cols-2 gap-6;
}

.mismatch-card {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.card-header {
  @apply flex items-start justify-between mb-4;
}

.selection-area {
  @apply flex-shrink-0 mr-3;
}

.checkbox {
  @apply rounded border-gray-300 text-red-600 focus:ring-red-500;
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

.variance-indicator {
  @apply text-right;
}

.variance-amount {
  @apply font-bold text-lg;
}

.variance-percentage {
  @apply text-sm opacity-75;
}

.severity-critical .variance-amount {
  @apply text-red-600;
}

.severity-high .variance-amount {
  @apply text-orange-600;
}

.severity-medium .variance-amount {
  @apply text-yellow-600;
}

.severity-low .variance-amount {
  @apply text-green-600;
}

/* Amount Comparison */
.amount-comparison {
  @apply grid grid-cols-5 gap-4 mb-4;
}

.comparison-section {
  @apply col-span-2 bg-gray-50 rounded-lg p-3;
}

.car-section {
  @apply bg-blue-50 border border-blue-200;
}

.receipt-section {
  @apply bg-green-50 border border-green-200;
}

.section-header {
  @apply flex items-center gap-2 mb-2;
}

.section-label {
  @apply text-sm font-medium;
}

.amount-value {
  @apply text-lg font-bold mb-2;
}

.car-amount {
  @apply text-blue-700;
}

.receipt-amount {
  @apply text-green-700;
}

.amount-details {
  @apply text-xs;
}

.detail-list {
  @apply space-y-1;
}

.detail-item {
  @apply flex justify-between;
}

.detail-label {
  @apply text-gray-500;
}

.quality-badge {
  @apply px-1 py-0.5 text-xs font-medium rounded;
}

.quality-high {
  @apply bg-green-100 text-green-800;
}

.quality-medium {
  @apply bg-yellow-100 text-yellow-800;
}

.quality-low {
  @apply bg-red-100 text-red-800;
}

.comparison-divider {
  @apply col-span-1 flex flex-col items-center justify-center;
}

.vs-indicator {
  @apply text-xs font-bold text-gray-500 mb-2;
}

.variance-arrow {
  @apply p-1 rounded-full;
}

.variance-arrow.car-higher {
  @apply text-blue-600 bg-blue-100;
}

.variance-arrow.receipt-higher {
  @apply text-green-600 bg-green-100;
}

/* Resolution Actions */
.resolution-actions {
  @apply flex justify-between items-center mb-4;
}

.primary-actions {
  @apply flex gap-2;
}

.resolution-btn {
  @apply flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200;
}

.resolution-btn.car-action {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.resolution-btn.receipt-action {
  @apply bg-green-600 text-white hover:bg-green-700;
}

.resolution-btn.manual-review {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.secondary-actions {
  @apply flex gap-1;
}

.secondary-btn {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors;
}

/* Investigation Notes */
.investigation-notes {
  @apply bg-blue-50 border border-blue-200 rounded-lg p-3;
}

.notes-header {
  @apply flex items-center gap-2 mb-2;
}

.notes-label {
  @apply text-sm font-medium text-blue-700;
}

.notes-content {
  @apply text-sm text-blue-800;
}

/* Details Table */
.details-table-container {
  @apply bg-white border border-gray-200 rounded-lg overflow-hidden;
}

.mismatch-table {
  @apply w-full;
}

.mismatch-table th {
  @apply px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50;
}

.mismatch-table td {
  @apply px-4 py-4 whitespace-nowrap text-sm border-b border-gray-200;
}

.table-row:hover {
  @apply bg-gray-50;
}

.table-row.severity-critical {
  @apply bg-red-50;
}

.table-row.severity-high {
  @apply bg-orange-50;
}

.employee-cell {
  @apply space-y-1;
}

.employee-meta {
  @apply text-gray-500 text-xs;
}

.car-amount-cell {
  @apply font-medium text-blue-700;
}

.receipt-amount-cell {
  @apply font-medium text-green-700;
}

.variance-display {
  @apply font-bold;
}

.variance-display.car-higher {
  @apply text-blue-600;
}

.variance-display.receipt-higher {
  @apply text-green-600;
}

.table-actions {
  @apply flex gap-1;
}

.table-action-btn {
  @apply px-2 py-1 text-xs font-medium rounded transition-colors;
}

.table-action-btn.car-action {
  @apply bg-blue-100 text-blue-700 hover:bg-blue-200;
}

.table-action-btn.receipt-action {
  @apply bg-green-100 text-green-700 hover:bg-green-200;
}

.table-action-btn.manual-action {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

/* Resolution Progress */
.resolution-progress {
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
  @apply bg-red-600 h-2 rounded-full transition-all duration-300;
}

.progress-info {
  @apply text-sm text-gray-600;
}

/* Animations */
.mismatch-card-enter-active,
.mismatch-card-leave-active {
  @apply transition-all duration-300;
}

.mismatch-card-enter-from,
.mismatch-card-leave-to {
  @apply opacity-0 transform scale-95;
}

/* Responsive */
@media (max-width: 1280px) {
  .comparison-cards .comparison-grid {
    @apply grid-cols-1;
  }
}

@media (max-width: 768px) {
  .view-header {
    @apply flex-col gap-4 items-start;
  }
  
  .amount-comparison {
    @apply grid-cols-1 gap-3;
  }
  
  .comparison-divider {
    @apply hidden;
  }
  
  .primary-actions {
    @apply flex-col gap-2;
  }
  
  .resolution-actions {
    @apply flex-col gap-3;
  }
  
  .smart-filters .filter-group {
    @apply flex-col items-start gap-2;
  }
}
</style>