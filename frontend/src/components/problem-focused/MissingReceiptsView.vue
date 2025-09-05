<template>
  <div class="missing-receipts-view">
    <!-- Header with Bulk Actions -->
    <div class="view-header">
      <div class="header-info">
        <div class="issue-icon">
          <ReceiptIcon class="w-8 h-8 text-red-600" />
        </div>
        <div class="header-content">
          <h3 class="view-title">Missing Receipts</h3>
          <p class="view-description">
            {{ employees.length }} employees missing receipt documentation
          </p>
        </div>
      </div>
      
      <div class="header-actions">
        <div v-if="selectedEmployees.length > 0" class="selection-info">
          <span class="selection-count">{{ selectedEmployees.length }} selected</span>
          <button
            @click="clearSelection"
            class="clear-selection-btn"
          >
            Clear
          </button>
        </div>
        
        <div class="bulk-actions">
          <button
            v-if="selectedEmployees.length > 0"
            @click="handleBulkUpload"
            class="bulk-action-btn primary"
            :disabled="uploading"
          >
            <CloudArrowUpIcon class="w-4 h-4" />
            Bulk Upload ({{ selectedEmployees.length }})
          </button>
          
          <button
            v-if="selectedEmployees.length > 0"
            @click="handleBulkExempt"
            class="bulk-action-btn secondary"
          >
            <ShieldCheckIcon class="w-4 h-4" />
            Mark Exempt
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

    <!-- Filter and Sort Controls -->
    <div class="controls-bar">
      <div class="filter-controls">
        <select v-model="sortBy" class="sort-select">
          <option value="amount">Sort by Amount</option>
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name</option>
          <option value="urgency">Sort by Urgency</option>
        </select>
        
        <select v-model="filterBy" class="filter-select">
          <option value="all">All Employees</option>
          <option value="high-priority">High Priority</option>
          <option value="recent">Recent Transactions</option>
          <option value="high-amount">High Amount (>${highAmountThreshold})</option>
        </select>
      </div>
      
      <div class="view-controls">
        <button
          v-for="view in ['card', 'compact', 'table']"
          :key="view"
          @click="currentView = view"
          class="view-toggle-btn"
          :class="{ 'active': currentView === view }"
        >
          <component :is="getViewIcon(view)" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Employee List -->
    <div class="employee-list" :class="`view-${currentView}`">
      <TransitionGroup
        name="employee-item"
        tag="div"
        class="employee-grid"
      >
        <div
          v-for="employee in sortedAndFilteredEmployees"
          :key="employee.id"
          class="employee-item-wrapper"
        >
          <!-- Card View -->
          <div v-if="currentView === 'card'" class="employee-card">
            <div class="card-header">
              <div class="selection-checkbox">
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
                  <span class="employee-id">ID: {{ employee.employee_id }}</span>
                  <span class="department">{{ employee.department }}</span>
                </div>
              </div>
              
              <div class="urgency-badge" :class="`urgency-${getUrgencyLevel(employee)}`">
                {{ getUrgencyLevel(employee).toUpperCase() }}
              </div>
            </div>
            
            <div class="card-content">
              <!-- Transaction Details -->
              <div class="transaction-info">
                <div class="transaction-row">
                  <span class="label">Amount:</span>
                  <span class="amount">{{ formatCurrency(employee.amount) }}</span>
                </div>
                <div class="transaction-row">
                  <span class="label">Date:</span>
                  <span class="date">{{ formatDate(employee.transaction_date) }}</span>
                </div>
                <div class="transaction-row">
                  <span class="label">Vendor:</span>
                  <span class="vendor">{{ employee.vendor || 'Unknown' }}</span>
                </div>
                <div class="transaction-row">
                  <span class="label">Category:</span>
                  <span class="category">{{ employee.category || 'Uncategorized' }}</span>
                </div>
              </div>
              
              <!-- Receipt Status -->
              <div class="receipt-status">
                <div class="status-info">
                  <XCircleIcon class="w-5 h-5 text-red-500" />
                  <span>No receipt found</span>
                </div>
                <div v-if="employee.days_overdue" class="overdue-info">
                  {{ employee.days_overdue }} days overdue
                </div>
              </div>
              
              <!-- Quick Actions -->
              <div class="quick-actions">
                <button
                  @click="handleUploadReceipt(employee)"
                  class="quick-action-btn primary"
                  :disabled="uploading && uploadingEmployeeId === employee.id"
                >
                  <CloudArrowUpIcon class="w-4 h-4" />
                  <span v-if="uploading && uploadingEmployeeId === employee.id">
                    Uploading...
                  </span>
                  <span v-else>Upload Receipt</span>
                </button>
                
                <button
                  @click="handleMarkExempt(employee)"
                  class="quick-action-btn secondary"
                >
                  <ShieldCheckIcon class="w-4 h-4" />
                  Mark Exempt
                </button>
                
                <button
                  @click="handleRequestFromEmployee(employee)"
                  class="quick-action-btn tertiary"
                >
                  <EnvelopeIcon class="w-4 h-4" />
                  Request Receipt
                </button>
              </div>
            </div>
          </div>
          
          <!-- Compact View -->
          <div v-else-if="currentView === 'compact'" class="employee-compact">
            <div class="compact-selection">
              <input
                type="checkbox"
                :checked="selectedEmployees.includes(employee.id)"
                @change="toggleEmployeeSelection(employee.id)"
                class="checkbox"
              />
            </div>
            
            <div class="compact-info">
              <div class="compact-main">
                <span class="employee-name">{{ employee.name }}</span>
                <span class="amount">{{ formatCurrency(employee.amount) }}</span>
                <span class="urgency-badge compact" :class="`urgency-${getUrgencyLevel(employee)}`">
                  {{ getUrgencyLevel(employee).charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="compact-details">
                {{ employee.vendor || 'Unknown vendor' }} • {{ formatDate(employee.transaction_date) }}
              </div>
            </div>
            
            <div class="compact-actions">
              <button
                @click="handleUploadReceipt(employee)"
                class="compact-action-btn"
                title="Upload Receipt"
              >
                <CloudArrowUpIcon class="w-4 h-4" />
              </button>
              <button
                @click="handleMarkExempt(employee)"
                class="compact-action-btn"
                title="Mark Exempt"
              >
                <ShieldCheckIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <!-- Table View (handled separately for better performance) -->
        </div>
      </TransitionGroup>
      
      <!-- Table View -->
      <div v-if="currentView === 'table'" class="table-container">
        <table class="employee-table">
          <thead>
            <tr>
              <th class="checkbox-column">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  @change="handleSelectAll"
                  class="checkbox"
                />
              </th>
              <th class="employee-column">Employee</th>
              <th class="amount-column">Amount</th>
              <th class="date-column">Date</th>
              <th class="vendor-column">Vendor</th>
              <th class="urgency-column">Urgency</th>
              <th class="actions-column">Actions</th>
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
                  <div class="employee-id">{{ employee.employee_id }} • {{ employee.department }}</div>
                </div>
              </td>
              <td class="amount-cell">{{ formatCurrency(employee.amount) }}</td>
              <td class="date-cell">{{ formatDate(employee.transaction_date) }}</td>
              <td class="vendor-cell">{{ employee.vendor || 'Unknown' }}</td>
              <td>
                <span class="urgency-badge" :class="`urgency-${getUrgencyLevel(employee)}`">
                  {{ getUrgencyLevel(employee) }}
                </span>
              </td>
              <td>
                <div class="table-actions">
                  <button
                    @click="handleUploadReceipt(employee)"
                    class="table-action-btn primary"
                    title="Upload Receipt"
                  >
                    <CloudArrowUpIcon class="w-3 h-3" />
                  </button>
                  <button
                    @click="handleMarkExempt(employee)"
                    class="table-action-btn secondary"
                    title="Mark Exempt"
                  >
                    <ShieldCheckIcon class="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Upload Progress -->
    <div v-if="uploadProgress.show" class="upload-progress">
      <div class="progress-header">
        <span>Uploading receipts...</span>
        <button @click="cancelUpload" class="cancel-btn">Cancel</button>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${uploadProgress.percentage}%` }"
        ></div>
      </div>
      <div class="progress-info">
        {{ uploadProgress.completed }} of {{ uploadProgress.total }} completed
      </div>
    </div>

    <!-- Bulk Upload Modal -->
    <BulkReceiptUploadModal
      v-if="showBulkUploadModal"
      :employees="selectedEmployeeData"
      @close="showBulkUploadModal = false"
      @upload-complete="handleBulkUploadComplete"
    />
    
    <!-- Exemption Modal -->
    <ExemptionModal
      v-if="showExemptionModal"
      :employees="exemptionModalEmployees"
      @close="showExemptionModal = false"
      @exemption-complete="handleExemptionComplete"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useApi } from '@/composables/useApi'
import BulkReceiptUploadModal from '../modals/BulkReceiptUploadModal.vue'
import ExemptionModal from '../modals/ExemptionModal.vue'

// Icons (simplified)
const ReceiptIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`
}

const CloudArrowUpIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 19l3-3m0 0l-3-3m3 3H9"/></svg>`
}

const ShieldCheckIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>`
}

const XCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clip-rule="evenodd"/></svg>`
}

const EnvelopeIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`
}

const Squares2X2Icon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>`
}

const ListBulletIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`
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
  'employee-resolved',
  'bulk-action-complete',
  'employee-exempted'
])

// Composables
const notificationStore = useNotificationStore()
const api = useApi()

// Reactive state
const selectedEmployees = ref([])
const sortBy = ref('urgency')
const filterBy = ref('all')
const currentView = ref('card')
const uploading = ref(false)
const uploadingEmployeeId = ref(null)
const showBulkUploadModal = ref(false)
const showExemptionModal = ref(false)
const exemptionModalEmployees = ref([])
const highAmountThreshold = ref(500)

const uploadProgress = ref({
  show: false,
  completed: 0,
  total: 0,
  percentage: 0
})

// Computed properties
const allSelected = computed(() => {
  return props.employees.length > 0 && selectedEmployees.value.length === props.employees.length
})

const selectedEmployeeData = computed(() => {
  return props.employees.filter(emp => selectedEmployees.value.includes(emp.id))
})

const sortedAndFilteredEmployees = computed(() => {
  let filtered = [...props.employees]
  
  // Apply filters
  switch (filterBy.value) {
    case 'high-priority':
      filtered = filtered.filter(emp => getUrgencyLevel(emp) === 'high')
      break
    case 'recent':
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = filtered.filter(emp => new Date(emp.transaction_date) >= weekAgo)
      break
    case 'high-amount':
      filtered = filtered.filter(emp => (emp.amount || 0) > highAmountThreshold.value)
      break
  }
  
  // Apply sorting
  return filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'amount':
        return (b.amount || 0) - (a.amount || 0)
      case 'date':
        return new Date(b.transaction_date) - new Date(a.transaction_date)
      case 'name':
        return a.name.localeCompare(b.name)
      case 'urgency':
        const urgencyOrder = { high: 3, medium: 2, low: 1 }
        return urgencyOrder[getUrgencyLevel(b)] - urgencyOrder[getUrgencyLevel(a)]
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

const getUrgencyLevel = (employee) => {
  const amount = employee.amount || 0
  const daysOverdue = employee.days_overdue || 0
  
  if (amount > 1000 || daysOverdue > 30) return 'high'
  if (amount > 250 || daysOverdue > 14) return 'medium'
  return 'low'
}

const getViewIcon = (view) => {
  switch (view) {
    case 'card': return 'Squares2X2Icon'
    case 'compact': return 'ListBulletIcon'
    case 'table': return 'TableCellsIcon'
    default: return 'Squares2X2Icon'
  }
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
const handleUploadReceipt = async (employee) => {
  uploading.value = true
  uploadingEmployeeId.value = employee.id
  
  try {
    // Create file input dynamically
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.multiple = false
    
    input.onchange = async (event) => {
      const file = event.target.files[0]
      if (file) {
        await uploadReceiptFile(employee, file)
      }
    }
    
    input.click()
  } finally {
    uploading.value = false
    uploadingEmployeeId.value = null
  }
}

const uploadReceiptFile = async (employee, file) => {
  try {
    const formData = new FormData()
    formData.append('receipt', file)
    formData.append('employee_id', employee.employee_id)
    formData.append('session_id', props.sessionId)
    
    await api.uploadReceipt(formData)
    
    notificationStore.addSuccess(`Receipt uploaded for ${employee.name}`)
    emit('employee-resolved', { employee, action: 'receipt_uploaded' })
    
  } catch (error) {
    console.error('Receipt upload failed:', error)
    notificationStore.addError(`Failed to upload receipt for ${employee.name}`)
  }
}

const handleMarkExempt = (employee) => {
  exemptionModalEmployees.value = [employee]
  showExemptionModal.value = true
}

const handleRequestFromEmployee = async (employee) => {
  try {
    await api.requestReceiptFromEmployee({
      employee_id: employee.employee_id,
      session_id: props.sessionId,
      amount: employee.amount,
      transaction_date: employee.transaction_date,
      vendor: employee.vendor
    })
    
    notificationStore.addSuccess(`Receipt request sent to ${employee.name}`)
  } catch (error) {
    console.error('Failed to send receipt request:', error)
    notificationStore.addError(`Failed to send receipt request to ${employee.name}`)
  }
}

const handleBulkUpload = () => {
  showBulkUploadModal.value = true
}

const handleBulkExempt = () => {
  exemptionModalEmployees.value = selectedEmployeeData.value
  showExemptionModal.value = true
}

const handleBulkUploadComplete = (results) => {
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  if (successful > 0) {
    notificationStore.addSuccess(`Successfully uploaded receipts for ${successful} employees`)
  }
  if (failed > 0) {
    notificationStore.addWarning(`Failed to upload receipts for ${failed} employees`)
  }
  
  emit('bulk-action-complete', {
    action: 'bulk_receipt_upload',
    successful,
    failed,
    results
  })
  
  // Clear selection
  selectedEmployees.value = []
  showBulkUploadModal.value = false
}

const handleExemptionComplete = (results) => {
  const successful = results.filter(r => r.success).length
  
  notificationStore.addSuccess(`Successfully exempted ${successful} employees from receipt requirements`)
  
  emit('bulk-action-complete', {
    action: 'bulk_exemption',
    successful,
    results
  })
  
  // Clear selection and close modal
  selectedEmployees.value = []
  showExemptionModal.value = false
}

const cancelUpload = () => {
  // Implementation would cancel ongoing uploads
  uploadProgress.value.show = false
}

// Watch for changes in employee list to update selection
watch(() => props.employees.length, () => {
  // Remove any selected IDs that no longer exist
  selectedEmployees.value = selectedEmployees.value.filter(id => 
    props.employees.some(emp => emp.id === id)
  )
})
</script>

<style scoped>
.missing-receipts-view {
  @apply space-y-6;
}

/* Header */
.view-header {
  @apply flex items-center justify-between p-6 bg-red-50 border border-red-200 rounded-lg;
}

.header-info {
  @apply flex items-center gap-4;
}

.issue-icon {
  @apply flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center;
}

.view-title {
  @apply text-xl font-bold text-red-900;
}

.view-description {
  @apply text-red-700;
}

.header-actions {
  @apply flex items-center gap-4;
}

.selection-info {
  @apply flex items-center gap-2 text-sm;
}

.selection-count {
  @apply font-medium text-red-800;
}

.clear-selection-btn {
  @apply text-red-600 hover:text-red-800 underline;
}

.bulk-actions {
  @apply flex gap-2;
}

.bulk-action-btn {
  @apply flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200;
}

.bulk-action-btn.primary {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.bulk-action-btn.secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.select-all-btn {
  @apply px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors;
}

.select-all-btn.active {
  @apply bg-red-600 text-white border-red-600;
}

/* Controls */
.controls-bar {
  @apply flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg;
}

.filter-controls {
  @apply flex gap-3;
}

.sort-select,
.filter-select {
  @apply px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500;
}

.view-controls {
  @apply flex gap-1;
}

.view-toggle-btn {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors;
}

.view-toggle-btn.active {
  @apply bg-red-100 text-red-600;
}

/* Employee List */
.employee-list.view-card .employee-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4;
}

.employee-list.view-compact .employee-grid {
  @apply space-y-2;
}

.employee-card {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.card-header {
  @apply flex items-start justify-between mb-4;
}

.selection-checkbox {
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

.urgency-badge {
  @apply px-2 py-1 text-xs font-bold rounded-full;
}

.urgency-high {
  @apply bg-red-100 text-red-800;
}

.urgency-medium {
  @apply bg-yellow-100 text-yellow-800;
}

.urgency-low {
  @apply bg-green-100 text-green-800;
}

.urgency-badge.compact {
  @apply w-6 h-6 rounded-full flex items-center justify-center;
}

.card-content {
  @apply space-y-4;
}

.transaction-info {
  @apply space-y-2;
}

.transaction-row {
  @apply flex justify-between items-center text-sm;
}

.transaction-row .label {
  @apply text-gray-600;
}

.transaction-row .amount {
  @apply font-semibold text-red-600;
}

.receipt-status {
  @apply flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg;
}

.status-info {
  @apply flex items-center gap-2 text-sm text-red-700;
}

.overdue-info {
  @apply text-xs text-red-600 font-medium;
}

.quick-actions {
  @apply flex gap-2;
}

.quick-action-btn {
  @apply flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200;
}

.quick-action-btn.primary {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.quick-action-btn.secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.quick-action-btn.tertiary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

/* Compact View */
.employee-compact {
  @apply flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow;
}

.compact-selection {
  @apply flex-shrink-0;
}

.compact-info {
  @apply flex-1 min-w-0;
}

.compact-main {
  @apply flex items-center gap-3 mb-1;
}

.compact-details {
  @apply text-sm text-gray-600;
}

.compact-actions {
  @apply flex gap-1;
}

.compact-action-btn {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors;
}

/* Table View */
.table-container {
  @apply bg-white border border-gray-200 rounded-lg overflow-hidden;
}

.employee-table {
  @apply w-full;
}

.employee-table th {
  @apply px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50;
}

.employee-table td {
  @apply px-4 py-4 whitespace-nowrap text-sm border-b border-gray-200;
}

.table-row:hover {
  @apply bg-gray-50;
}

.employee-cell {
  @apply space-y-1;
}

.employee-id {
  @apply text-gray-500;
}

.amount-cell {
  @apply font-semibold text-red-600;
}

.table-actions {
  @apply flex gap-1;
}

.table-action-btn {
  @apply p-1.5 rounded transition-colors;
}

.table-action-btn.primary {
  @apply text-red-600 hover:bg-red-100;
}

.table-action-btn.secondary {
  @apply text-gray-600 hover:bg-gray-100;
}

/* Upload Progress */
.upload-progress {
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
.employee-item-enter-active,
.employee-item-leave-active {
  @apply transition-all duration-200;
}

.employee-item-enter-from,
.employee-item-leave-to {
  @apply opacity-0 transform scale-95;
}

/* Responsive */
@media (max-width: 768px) {
  .view-header {
    @apply flex-col gap-4 items-start;
  }
  
  .controls-bar {
    @apply flex-col gap-4;
  }
  
  .employee-list.view-card .employee-grid {
    @apply grid-cols-1;
  }
  
  .quick-actions {
    @apply flex-col;
  }
}
</style>