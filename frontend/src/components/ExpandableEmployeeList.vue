<template>
  <div class="expandable-employee-list">
    <!-- Category Header -->
    <div 
      class="category-header" 
      :class="{ 'has-issues': employeeCount > 0 }"
      @click="toggleExpanded"
    >
      <div class="category-info">
        <div class="category-icon" :class="`icon-${issueType}`">
          <component :is="getCategoryIcon(issueType)" class="w-5 h-5" />
        </div>
        <div class="category-content">
          <div class="category-name">{{ categoryName }}</div>
          <div class="category-description">{{ description }}</div>
        </div>
      </div>
      <div class="category-count">
        <span class="count-badge" :class="`badge-${issueType}`">
          {{ employeeCount }}
        </span>
        <svg 
          class="expand-icon"
          :class="{ 'rotated': expanded }"
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
      name="employee-list"
      enter-active-class="transition-all duration-400 ease-out"
      leave-active-class="transition-all duration-300 ease-in"
      enter-from-class="opacity-0 max-h-0 transform scale-y-0"
      enter-to-class="opacity-100 max-h-[800px] transform scale-y-100"
      leave-from-class="opacity-100 max-h-[800px] transform scale-y-100"
      leave-to-class="opacity-0 max-h-0 transform scale-y-0"
    >
      <div v-if="expanded" class="employee-list-container">
        <div class="employee-list">
          <!-- Display Mode Toggle -->
          <div v-if="employees.length > displayModeThreshold" class="display-controls">
            <div class="view-toggle">
              <button
                v-for="mode in ['compact', 'detailed']"
                :key="mode"
                @click="displayMode = mode"
                class="view-button"
                :class="{ 'active': displayMode === mode }"
              >
                <component :is="getViewIcon(mode)" class="w-4 h-4" />
                {{ mode === 'compact' ? 'Compact' : 'Detailed' }}
              </button>
            </div>
            
            <!-- Search/Filter -->
            <div v-if="enableSearch && employees.length > searchThreshold" class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search employees..."
                class="search-input"
              >
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
          </div>

          <!-- Employee Items -->
          <div class="employee-items" :class="`mode-${displayMode}`">
            <transition-group
              name="employee"
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-200 ease-in"
              enter-from-class="opacity-0 transform translate-x-4"
              enter-to-class="opacity-100 transform translate-x-0"
              leave-from-class="opacity-100 transform translate-x-0"
              leave-to-class="opacity-0 transform -translate-x-4"
            >
              <div 
                v-for="employee in visibleEmployees" 
                :key="employee.id"
                class="employee-item"
                :class="{ 'detailed': displayMode === 'detailed' }"
              >
                <div class="employee-main">
                  <div class="employee-info">
                    <div class="employee-name">{{ employee.name }}</div>
                    <div class="employee-issue">{{ employee.issue }}</div>
                    <div v-if="displayMode === 'detailed' && employee.details" class="employee-details">
                      <div v-for="detail in employee.details" :key="detail.key" class="detail-item">
                        <span class="detail-label">{{ detail.label }}:</span>
                        <span class="detail-value">{{ detail.value }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="employee-actions">
                    <div v-if="employee.severity" class="severity-badge" :class="`severity-${employee.severity}`">
                      {{ employee.severity.toUpperCase() }}
                    </div>
                    
                    <button 
                      class="resolve-btn"
                      @click="handleResolveEmployee(employee)"
                      :aria-label="`Resolve issues for ${employee.name}`"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      Fix
                    </button>
                  </div>
                </div>
                
                <!-- Quick Actions (detailed mode) -->
                <div v-if="displayMode === 'detailed' && employee.quickActions" class="quick-actions">
                  <button
                    v-for="action in employee.quickActions"
                    :key="action.key"
                    @click="handleQuickAction(employee, action)"
                    class="quick-action-btn"
                    :class="`action-${action.type}`"
                  >
                    <component :is="getActionIcon(action.type)" class="w-3 h-3" />
                    {{ action.label }}
                  </button>
                </div>
              </div>
            </transition-group>
          </div>
          
          <!-- Pagination/Load More -->
          <div v-if="showPagination" class="pagination-controls">
            <div class="pagination-info">
              Showing {{ visibleEmployees.length }} of {{ filteredEmployees.length }} employees
              <span v-if="searchQuery">(filtered from {{ employees.length }} total)</span>
            </div>
            
            <div class="pagination-actions">
              <button
                v-if="canLoadMore"
                @click="loadMore"
                class="load-more-btn"
                :disabled="loading"
              >
                <svg v-if="loading" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span v-else>Load {{ Math.min(itemsPerPage, remainingItems) }} More</span>
              </button>
              
              <button
                v-if="currentPage > 1"
                @click="showLess"
                class="show-less-btn"
              >
                Show Less
              </button>
              
              <button
                v-if="canShowAll && !showingAll"
                @click="showAll"
                class="show-all-btn"
              >
                Show All {{ filteredEmployees.length }}
              </button>
            </div>
          </div>
          
          <!-- Bulk Actions -->
          <div v-if="selectedEmployees.length > 0" class="bulk-actions-bar">
            <div class="selection-info">
              {{ selectedEmployees.length }} employee{{ selectedEmployees.length !== 1 ? 's' : '' }} selected
            </div>
            <div class="bulk-actions">
              <button
                @click="handleBulkResolve"
                class="bulk-action-btn primary"
              >
                Resolve Selected
              </button>
              <button
                @click="clearSelection"
                class="bulk-action-btn secondary"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  categoryName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  employees: {
    type: Array,
    required: true
  },
  issueType: {
    type: String,
    default: 'warning',
    validator: (value) => ['error', 'warning', 'success', 'info'].includes(value)
  },
  defaultExpanded: {
    type: Boolean,
    default: false
  },
  itemsPerPage: {
    type: Number,
    default: 10
  },
  enableSearch: {
    type: Boolean,
    default: true
  },
  enableBulkActions: {
    type: Boolean,
    default: true
  },
  displayModeThreshold: {
    type: Number,
    default: 5
  },
  searchThreshold: {
    type: Number,
    default: 10
  }
})

// Emits
const emit = defineEmits([
  'employee-resolve',
  'quick-action',
  'bulk-resolve',
  'expand-change'
])

// Reactive state
const expanded = ref(props.defaultExpanded)
const displayMode = ref('compact')
const searchQuery = ref('')
const currentPage = ref(1)
const showingAll = ref(false)
const loading = ref(false)
const selectedEmployees = ref([])

// Computed properties
const employeeCount = computed(() => props.employees.length)

const filteredEmployees = computed(() => {
  if (!searchQuery.value) {
    return props.employees
  }
  
  const query = searchQuery.value.toLowerCase()
  return props.employees.filter(employee => 
    employee.name.toLowerCase().includes(query) ||
    employee.issue.toLowerCase().includes(query)
  )
})

const visibleEmployees = computed(() => {
  if (showingAll.value) {
    return filteredEmployees.value
  }
  
  const endIndex = currentPage.value * props.itemsPerPage
  return filteredEmployees.value.slice(0, endIndex)
})

const remainingItems = computed(() => {
  return filteredEmployees.value.length - visibleEmployees.value.length
})

const canLoadMore = computed(() => {
  return remainingItems.value > 0 && !showingAll.value
})

const canShowAll = computed(() => {
  return remainingItems.value > 0 && remainingItems.value <= 50 // Don't show "Show All" for massive lists
})

const showPagination = computed(() => {
  return filteredEmployees.value.length > props.itemsPerPage
})

// Methods
const toggleExpanded = () => {
  expanded.value = !expanded.value
  emit('expand-change', expanded.value)
}

const loadMore = async () => {
  loading.value = true
  
  // Simulate API delay for better UX
  await new Promise(resolve => setTimeout(resolve, 300))
  
  currentPage.value++
  loading.value = false
}

const showLess = () => {
  currentPage.value = Math.max(1, currentPage.value - 1)
  showingAll.value = false
}

const showAll = () => {
  showingAll.value = true
}

const handleResolveEmployee = (employee) => {
  emit('employee-resolve', employee)
}

const handleQuickAction = (employee, action) => {
  emit('quick-action', { employee, action })
}

const handleBulkResolve = () => {
  emit('bulk-resolve', selectedEmployees.value)
  selectedEmployees.value = []
}

const clearSelection = () => {
  selectedEmployees.value = []
}

// Icon methods
const getCategoryIcon = (type) => {
  const iconMap = {
    error: 'ExclamationCircleIcon',
    warning: 'ExclamationTriangleIcon',
    success: 'CheckCircleIcon',
    info: 'InformationCircleIcon'
  }
  return iconMap[type] || 'InformationCircleIcon'
}

const getViewIcon = (mode) => {
  return mode === 'compact' ? 'ListBulletIcon' : 'Squares2X2Icon'
}

const getActionIcon = (type) => {
  const iconMap = {
    upload: 'CloudArrowUpIcon',
    edit: 'PencilIcon',
    delete: 'TrashIcon',
    view: 'EyeIcon'
  }
  return iconMap[type] || 'CogIcon'
}

// Watch for search changes to reset pagination
watch(searchQuery, () => {
  currentPage.value = 1
  showingAll.value = false
})

// Simplified icon components
const ExclamationCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" /></svg>`
}

const ExclamationTriangleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" /></svg>`
}

const CheckCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" /></svg>`
}

const InformationCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.67-1.34l.04-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" /></svg>`
}

const ListBulletIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>`
}

const Squares2X2Icon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>`
}

const CloudArrowUpIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 19l3-3m0 0l-3-3m3 3H9" /></svg>`
}

const PencilIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`
}
</script>

<style scoped>
.expandable-employee-list {
  @apply border border-gray-200 rounded-lg overflow-hidden;
}

.category-header {
  @apply flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200;
}

.category-header.has-issues {
  @apply border-l-4 border-yellow-400 bg-yellow-50;
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

.icon-info {
  @apply bg-blue-100 text-blue-600;
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

.badge-info {
  @apply bg-blue-500 text-white;
}

.expand-icon {
  @apply w-5 h-5 text-gray-400 transition-transform duration-200;
}

.expand-icon.rotated {
  @apply rotate-180;
}

.employee-list-container {
  @apply border-t border-gray-200 bg-white overflow-hidden;
  transform-origin: top;
}

.employee-list {
  @apply p-0;
}

/* Display Controls */
.display-controls {
  @apply flex justify-between items-center p-4 bg-gray-50 border-b border-gray-100;
}

.view-toggle {
  @apply flex gap-1;
}

.view-button {
  @apply flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all duration-150;
}

.view-button.active {
  @apply bg-white text-blue-600 shadow-sm;
}

.search-box {
  @apply relative;
}

.search-input {
  @apply w-64 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.search-icon {
  @apply absolute left-2.5 top-2 w-4 h-4 text-gray-400;
}

/* Employee Items */
.employee-items {
  @apply space-y-0;
}

.employee-items.mode-compact .employee-item {
  @apply border-b border-gray-100 p-3 hover:bg-gray-50;
}

.employee-items.mode-detailed .employee-item {
  @apply border border-gray-200 rounded-lg m-3 p-4 hover:shadow-md;
}

.employee-item.detailed {
  @apply bg-white shadow-sm;
}

.employee-main {
  @apply flex items-start justify-between;
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

.employee-details {
  @apply mt-2 grid grid-cols-2 gap-2 text-xs;
}

.detail-item {
  @apply flex justify-between;
}

.detail-label {
  @apply text-gray-500;
}

.detail-value {
  @apply font-medium text-gray-900;
}

.employee-actions {
  @apply flex items-center gap-2;
}

.severity-badge {
  @apply px-2 py-1 text-xs font-bold rounded-full;
}

.severity-high {
  @apply bg-red-100 text-red-800;
}

.severity-medium {
  @apply bg-yellow-100 text-yellow-800;
}

.severity-low {
  @apply bg-green-100 text-green-800;
}

.resolve-btn {
  @apply flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded transition-colors duration-200;
}

.quick-actions {
  @apply flex gap-2 mt-3 pt-3 border-t border-gray-100;
}

.quick-action-btn {
  @apply flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors duration-150;
}

.action-upload {
  @apply text-green-700 bg-green-100 hover:bg-green-200;
}

.action-edit {
  @apply text-blue-700 bg-blue-100 hover:bg-blue-200;
}

/* Pagination */
.pagination-controls {
  @apply p-4 bg-gray-50 border-t border-gray-100;
}

.pagination-info {
  @apply text-sm text-gray-600 mb-3 text-center;
}

.pagination-actions {
  @apply flex justify-center gap-2;
}

.load-more-btn,
.show-less-btn,
.show-all-btn {
  @apply px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200;
}

.load-more-btn {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50;
}

.show-less-btn {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.show-all-btn {
  @apply bg-green-600 text-white hover:bg-green-700;
}

/* Bulk Actions */
.bulk-actions-bar {
  @apply flex justify-between items-center p-3 bg-blue-50 border-t border-blue-200;
}

.selection-info {
  @apply text-sm font-medium text-blue-800;
}

.bulk-actions {
  @apply flex gap-2;
}

.bulk-action-btn {
  @apply px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200;
}

.bulk-action-btn.primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.bulk-action-btn.secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

/* Animations */
.employee-list-enter-active,
.employee-list-leave-active {
  transform-origin: top;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.employee-list-enter-from,
.employee-list-leave-to {
  transform: scaleY(0);
  opacity: 0;
}

.employee-enter-active,
.employee-leave-active {
  transition: all 0.2s ease;
}

.employee-enter-from,
.employee-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .display-controls {
    @apply flex-col gap-3;
  }
  
  .search-input {
    @apply w-full;
  }
  
  .employee-details {
    @apply grid-cols-1;
  }
  
  .pagination-actions {
    @apply flex-col;
  }
  
  .bulk-actions-bar {
    @apply flex-col gap-3 text-center;
  }
}
</style>