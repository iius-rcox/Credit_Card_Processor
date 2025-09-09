<template>
  <div class="exceptions-table">
    <!-- Search and Controls -->
    <div class="table-header">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Exception Details</h3>
        <div class="flex items-center space-x-4">
          <div class="sort-controls">
            <label class="text-sm font-medium text-gray-700">Sort by:</label>
            <select v-model="sortBy" class="ml-2 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500">
              <option value="name">Employee Name</option>
              <option value="department">Department</option>
              <option value="issue_category">Issue Category</option>
              <option value="car_amount">CAR Amount</option>
              <option value="difference">Difference</option>
              <option value="validation_status">Status</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Search Bar -->
      <div class="search-bar mb-4">
        <div class="relative max-w-md">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by employee name, ID, department..."
            class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
            title="Clear search"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="min-w-full text-left text-sm">
        <thead>
          <tr>
            <th class="px-4 py-3 cursor-pointer hover:bg-gray-100" @click="setSort('name')">
              <div class="flex items-center space-x-1">
                <span>Employee Name (ID)</span>
                <svg v-if="sortBy === 'name'" class="w-4 h-4" :class="{ 'rotate-180': sortDir === 'desc' }" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14l5-5 5 5z"/>
                </svg>
              </div>
            </th>
            <th class="px-4 py-3 cursor-pointer hover:bg-gray-100" @click="setSort('department')">
              <div class="flex items-center space-x-1">
                <span>Department</span>
                <svg v-if="sortBy === 'department'" class="w-4 h-4" :class="{ 'rotate-180': sortDir === 'desc' }" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14l5-5 5 5z"/>
                </svg>
              </div>
            </th>
            <th class="px-4 py-3 cursor-pointer hover:bg-gray-100" @click="setSort('issue_category')">
              <div class="flex items-center space-x-1">
                <span>Issue Category</span>
                <svg v-if="sortBy === 'issue_category'" class="w-4 h-4" :class="{ 'rotate-180': sortDir === 'desc' }" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14l5-5 5 5z"/>
                </svg>
              </div>
            </th>
            <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" @click="setSort('car_amount')">
              <div class="flex items-center justify-end space-x-1">
                <span>CAR Amount</span>
                <svg v-if="sortBy === 'car_amount'" class="w-4 h-4" :class="{ 'rotate-180': sortDir === 'desc' }" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14l5-5 5 5z"/>
                </svg>
              </div>
            </th>
            <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" @click="setSort('receipt_amount')">
              <div class="flex items-center justify-end space-x-1">
                <span>Receipt Amount</span>
                <svg v-if="sortBy === 'receipt_amount'" class="w-4 h-4" :class="{ 'rotate-180': sortDir === 'desc' }" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14l5-5 5 5z"/>
                </svg>
              </div>
            </th>
            <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" @click="setSort('difference')">
              <div class="flex items-center justify-end space-x-1">
                <span>Difference</span>
                <svg v-if="sortBy === 'difference'" class="w-4 h-4" :class="{ 'rotate-180': sortDir === 'desc' }" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14l5-5 5 5z"/>
                </svg>
              </div>
            </th>
            <th class="px-4 py-3 text-center cursor-pointer hover:bg-gray-100" @click="setSort('validation_status')">
              <div class="flex items-center justify-center space-x-1">
                <span>Status</span>
                <svg v-if="sortBy === 'validation_status'" class="w-4 h-4" :class="{ 'rotate-180': sortDir === 'desc' }" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14l5-5 5 5z"/>
                </svg>
              </div>
            </th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in pagedRows" :key="e.revision_id" class="border-t hover:bg-gray-50" :class="getRowClass(e)">
            <td class="px-4 py-3 font-medium">
              <div class="employee-info">
                <div class="employee-name">{{ formatNameId(e) }}</div>
                <div v-if="e.delta_change" class="mt-1">
                  <span
                    v-if="e.delta_change === 'new'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    title="New employee in this session"
                  >
                    🆕 New
                  </span>
                  <span
                    v-else-if="e.delta_change === 'modified'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    title="Changes detected compared to baseline"
                  >
                    📝 Modified
                  </span>
                  <span
                    v-else-if="e.delta_change === 'removed'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                    title="No longer present in current data"
                  >
                    ❌ Removed
                  </span>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">{{ e.department || 'N/A' }}</td>
            <td class="px-4 py-3">{{ getIssueCategory(e) }}</td>
            <td class="px-4 py-3 text-right font-mono text-blue-700">{{ formatAmount(e.car_amount) }}</td>
            <td class="px-4 py-3 text-right font-mono text-green-700">{{ formatAmount(e.receipt_amount) }}</td>
            <td class="px-4 py-3 text-right font-mono" :class="getDifferenceClass(e)">{{ formatDifference(e) }}</td>
            <td class="px-4 py-3 text-center">
              <StatusBadge :status="e.validation_status" size="sm" />
            </td>
            <td class="px-4 py-3 text-center">
              <button
                v-if="canResolve(e)"
                @click="handleResolve(e)"
                class="inline-flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                title="Resolve this issue"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>Resolve</span>
              </button>
              <span v-else class="text-sm text-gray-500 font-medium">Resolved</span>
            </td>
          </tr>
          <tr v-if="pagedRows.length === 0">
            <td class="px-4 py-8 text-center text-gray-500" colspan="8">
              <div class="flex flex-col items-center">
                <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">No exceptions found</h3>
                <p class="text-gray-600">
                  {{ searchQuery ? 'No employees match your search criteria.' : 'No exception records to display.' }}
                </p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 px-4 py-3 border-t border-gray-200 bg-gray-50">
      <div class="text-sm text-gray-700">
        Showing {{ startItem + 1 }}-{{ endItem }} of {{ filteredRows.length }} employees
        <span v-if="searchQuery">(filtered from {{ props.employees.length }} total)</span>
      </div>
      <div class="flex items-center space-x-2">
        <button 
          class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
          :disabled="currentPage === 1" 
          @click="prevPage"
        >
          Previous
        </button>
        
        <div class="flex space-x-1">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="goToPage(page)"
            :class="['w-8 h-8 text-sm font-medium rounded-md transition-colors', 
                     page === currentPage 
                       ? 'bg-blue-600 text-white border-blue-600' 
                       : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    ]"
            :disabled="page === currentPage"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
          :disabled="currentPage === totalPages" 
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  employees: { type: Array, default: () => [] },
  defaultSort: { type: String, default: 'name' },
  pageSize: { type: Number, default: 25 }
})

const emit = defineEmits(['resolve-employee'])

const sortBy = ref(props.defaultSort)
const sortDir = ref('asc')
const currentPage = ref(1)
const searchQuery = ref('')

watch(() => props.employees, () => { currentPage.value = 1 })
watch(searchQuery, () => { currentPage.value = 1 })

const filteredRows = computed(() => {
  let filtered = Array.isArray(props.employees) ? props.employees.slice() : []
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(employee => {
      return (
        employee.employee_name?.toLowerCase().includes(query) ||
        employee.employee_id?.toLowerCase().includes(query) ||
        employee.department?.toLowerCase().includes(query) ||
        getIssueCategory(employee).toLowerCase().includes(query)
      )
    })
  }
  
  return filtered
})

const rows = computed(() => {
  const list = filteredRows.value
  const key = sortBy.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  
  return list.sort((a, b) => {
    let av, bv
    
    switch (key) {
      case 'name':
        av = `${a.employee_name || ''} (${a.employee_id || 'N/A'})`
        bv = `${b.employee_name || ''} (${b.employee_id || 'N/A'})`
        break
      case 'department':
        av = a.department || ''
        bv = b.department || ''
        break
      case 'issue_category':
        av = getIssueCategory(a)
        bv = getIssueCategory(b)
        break
      case 'difference':
        av = calculateDifference(a)
        bv = calculateDifference(b)
        break
      case 'validation_status':
        av = a.validation_status || ''
        bv = b.validation_status || ''
        break
      default:
        av = a[key]
        bv = b[key]
    }
    
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / props.pageSize)))

const startItem = computed(() => (currentPage.value - 1) * props.pageSize)
const endItem = computed(() => Math.min(startItem.value + props.pageSize, rows.value.length))

const pagedRows = computed(() => {
  const start = startItem.value
  return rows.value.slice(start, start + props.pageSize)
})

const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

function setSort(key) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

function prevPage() { if (currentPage.value > 1) currentPage.value-- }
function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function formatNameId(e) {
  return `${e.employee_name || 'Unknown'} (${e.employee_id || 'N/A'})`
}

function formatAmount(v) {
  if (v == null || Number.isNaN(Number(v))) return '$0.00'
  const num = Number(v)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num)
}

function calculateDifference(employee) {
  const car = Number(employee.car_amount) || 0
  const receipt = Number(employee.receipt_amount) || 0
  return car - receipt
}

function formatDifference(employee) {
  const diff = calculateDifference(employee)
  if (Math.abs(diff) < 0.01) return '$0.00'
  return formatAmount(Math.abs(diff))
}

function getDifferenceClass(employee) {
  const diff = calculateDifference(employee)
  if (Math.abs(diff) < 0.01) return 'text-gray-500'
  if (diff > 0) return 'text-red-600 font-semibold'
  return 'text-orange-600 font-semibold'
}

function getIssueCategory(employee) {
  if (!employee.validation_flags) return 'General Issue'
  
  if (typeof employee.validation_flags === 'string') {
    return employee.validation_flags.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  
  if (typeof employee.validation_flags === 'object') {
    const flags = Object.keys(employee.validation_flags)
    if (flags.length > 0) {
      return flags[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }
  
  return 'Needs Attention'
}

function getRowClass(employee) {
  const classes = []
  
  if (employee.validation_status === 'RESOLVED') {
    classes.push('bg-green-50')
  } else if (employee.validation_status === 'NEEDS_ATTENTION') {
    classes.push('bg-yellow-50')
  }
  
  return classes.join(' ')
}

function canResolve(employee) {
  return employee.validation_status === 'NEEDS_ATTENTION'
}

function handleResolve(employee) {
  emit('resolve-employee', employee)
}
</script>

<style scoped>
.exceptions-table {
  @apply bg-white rounded-lg border border-gray-200 overflow-hidden;
}

.table-header {
  @apply p-4 border-b border-gray-200 bg-gray-50;
}

.table-wrapper { 
  @apply overflow-x-auto bg-white; 
}

th { 
  @apply text-xs font-semibold text-gray-600 uppercase tracking-wide bg-gray-50 border-b border-gray-200; 
}

td { 
  @apply text-sm text-gray-800; 
}

button:disabled { 
  @apply opacity-50 cursor-not-allowed; 
}

.employee-info {
  @apply space-y-1;
}

.employee-name {
  @apply text-gray-900 font-semibold;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .table-header {
    @apply p-3;
  }
  
  .table-header > div {
    @apply flex-col space-y-3 items-start;
  }
  
  .search-bar .relative {
    @apply max-w-full;
  }
}
</style>


