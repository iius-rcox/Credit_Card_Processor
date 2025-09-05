<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Bulk Operations</h3>
          <p class="text-sm text-gray-600 mt-1">
            Mass approval, rejection, and modification workflows
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="operationStatus" :class="statusClasses" class="px-2 py-1 rounded-full text-xs font-medium">
            {{ operationStatus }}
          </span>
          <button 
            @click="toggleBatchMode"
            :class="[
              'px-3 py-1 text-sm font-medium rounded-md transition-colors',
              batchMode 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Batch: {{ batchMode ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Quick Actions Bar -->
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center space-x-4">
          <span class="text-sm font-medium text-gray-700">Quick Actions:</span>
          <button 
            @click="selectAll"
            class="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded"
          >
            Select All
          </button>
          <button 
            @click="selectNone"
            class="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded"
          >
            Select None
          </button>
          <button 
            @click="selectByFilter"
            class="px-3 py-1 text-sm font-medium text-purple-600 hover:bg-purple-100 rounded"
          >
            Smart Select
          </button>
        </div>
        <div class="text-sm text-gray-600">
          {{ selectedCount }} of {{ filteredItems.length }} selected
        </div>
      </div>

      <!-- Filter and Search -->
      <div class="grid grid-cols-4 gap-4">
        <div>
          <label class="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select v-model="filters.status" class="mt-1 w-full text-sm border-gray-300 rounded-md">
            <option value="all">All Items</option>
            <option value="pending">Pending Review</option>
            <option value="flagged">Flagged Issues</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700">Filter by Type:</label>
          <select v-model="filters.type" class="mt-1 w-full text-sm border-gray-300 rounded-md">
            <option value="all">All Types</option>
            <option value="missing-receipt">Missing Receipts</option>
            <option value="coding-issue">Coding Issues</option>
            <option value="data-mismatch">Data Mismatches</option>
            <option value="policy-violation">Policy Violations</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700">Amount Range:</label>
          <select v-model="filters.amountRange" class="mt-1 w-full text-sm border-gray-300 rounded-md">
            <option value="all">All Amounts</option>
            <option value="under-25">Under $25</option>
            <option value="25-100">$25 - $100</option>
            <option value="100-500">$100 - $500</option>
            <option value="over-500">Over $500</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700">Search:</label>
          <input 
            v-model="searchTerm"
            type="text"
            placeholder="Employee, merchant, description..."
            class="mt-1 w-full text-sm border-gray-300 rounded-md"
          >
        </div>
      </div>

      <!-- Bulk Actions Panel -->
      <div v-if="selectedCount > 0" class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-md font-semibold text-blue-900">
            Bulk Actions ({{ selectedCount }} items)
          </h4>
          <button 
            @click="clearSelection"
            class="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Selection
          </button>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <!-- Approval Actions -->
          <div class="space-y-2">
            <h5 class="text-sm font-medium text-gray-700">Approval Actions</h5>
            <div class="space-y-1">
              <button 
                @click="showBulkActionModal('approve')"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Approve All
              </button>
              <button 
                @click="showBulkActionModal('reject')"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                Reject All
              </button>
              <button 
                @click="showBulkActionModal('flag')"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 disabled:opacity-50"
              >
                Flag for Review
              </button>
            </div>
          </div>

          <!-- Modification Actions -->
          <div class="space-y-2">
            <h5 class="text-sm font-medium text-gray-700">Modification Actions</h5>
            <div class="space-y-1">
              <button 
                @click="showBulkActionModal('reassign')"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Reassign Category
              </button>
              <button 
                @click="showBulkActionModal('update-policy')"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 border border-purple-300 rounded hover:bg-purple-200 disabled:opacity-50"
              >
                Apply Policy
              </button>
              <button 
                @click="showBulkActionModal('add-notes')"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Add Notes
              </button>
            </div>
          </div>

          <!-- Export Actions -->
          <div class="space-y-2">
            <h5 class="text-sm font-medium text-gray-700">Export Actions</h5>
            <div class="space-y-1">
              <button 
                @click="exportSelected('csv')"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Export to CSV
              </button>
              <button 
                @click="exportSelected('pdf')"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Generate Report
              </button>
              <button 
                @click="scheduleFollowUp"
                :disabled="isProcessing"
                class="w-full px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded hover:bg-indigo-200 disabled:opacity-50"
              >
                Schedule Follow-up
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Items List -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-md font-semibold text-gray-900">Items ({{ filteredItems.length }})</h4>
          <div class="flex items-center space-x-2">
            <select v-model="sortBy" class="text-sm border-gray-300 rounded-md">
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="employee">Sort by Employee</option>
              <option value="status">Sort by Status</option>
              <option value="priority">Sort by Priority</option>
            </select>
            <select v-model="viewMode" class="text-sm border-gray-300 rounded-md">
              <option value="list">List View</option>
              <option value="grid">Grid View</option>
              <option value="compact">Compact View</option>
            </select>
          </div>
        </div>

        <!-- List View -->
        <div v-if="viewMode === 'list'" class="space-y-2 max-h-96 overflow-y-auto">
          <div 
            v-for="item in paginatedItems" 
            :key="item.id"
            :class="[
              'flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer',
              selectedItems.has(item.id) ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
            ]"
            @click="toggleSelection(item.id)"
          >
            <div class="flex items-center space-x-4 flex-1">
              <input 
                :checked="selectedItems.has(item.id)"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600"
                @click.stop
                @change="toggleSelection(item.id)"
              >
              <div class="flex-shrink-0">
                <div :class="getPriorityClasses(item.priority)" class="w-3 h-3 rounded-full"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ item.employee_name }}</p>
                  <span :class="getStatusClasses(item.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                    {{ item.status }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 truncate">{{ item.description }}</p>
                <div class="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span>{{ formatCurrency(item.amount) }}</span>
                  <span>{{ item.merchant }}</span>
                  <span>{{ formatDate(item.date) }}</span>
                  <span class="capitalize">{{ item.type.replace('-', ' ') }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button 
                @click.stop="quickApprove(item.id)"
                class="p-1 text-green-600 hover:bg-green-100 rounded"
                title="Quick Approve"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button 
                @click.stop="quickReject(item.id)"
                class="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Quick Reject"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button 
                @click.stop="viewDetails(item)"
                class="p-1 text-gray-600 hover:bg-gray-100 rounded"
                title="View Details"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Grid View -->
        <div v-else-if="viewMode === 'grid'" class="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          <div 
            v-for="item in paginatedItems" 
            :key="item.id"
            :class="[
              'p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer',
              selectedItems.has(item.id) ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
            ]"
            @click="toggleSelection(item.id)"
          >
            <div class="flex items-center justify-between mb-3">
              <input 
                :checked="selectedItems.has(item.id)"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600"
                @click.stop
                @change="toggleSelection(item.id)"
              >
              <span :class="getStatusClasses(item.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                {{ item.status }}
              </span>
            </div>
            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-900 truncate">{{ item.employee_name }}</p>
              <p class="text-sm text-gray-600 truncate">{{ item.description }}</p>
              <div class="flex items-center justify-between">
                <span class="text-lg font-bold text-gray-900">{{ formatCurrency(item.amount) }}</span>
                <div :class="getPriorityClasses(item.priority)" class="w-3 h-3 rounded-full"></div>
              </div>
              <p class="text-xs text-gray-500">{{ item.merchant }} • {{ formatDate(item.date) }}</p>
            </div>
          </div>
        </div>

        <!-- Compact View -->
        <div v-else class="space-y-1 max-h-96 overflow-y-auto">
          <div 
            v-for="item in paginatedItems" 
            :key="item.id"
            :class="[
              'flex items-center justify-between p-2 border-b hover:bg-gray-50 transition-colors cursor-pointer',
              selectedItems.has(item.id) ? 'bg-blue-50' : ''
            ]"
            @click="toggleSelection(item.id)"
          >
            <div class="flex items-center space-x-3">
              <input 
                :checked="selectedItems.has(item.id)"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600"
                @click.stop
                @change="toggleSelection(item.id)"
              >
              <div :class="getPriorityClasses(item.priority)" class="w-2 h-2 rounded-full"></div>
              <span class="text-sm font-medium text-gray-900">{{ item.employee_name }}</span>
              <span class="text-sm text-gray-600">{{ formatCurrency(item.amount) }}</span>
              <span class="text-xs text-gray-500">{{ item.merchant }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span :class="getStatusClasses(item.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                {{ item.status }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredItems.length === 0" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p class="mt-2 text-sm text-gray-600">No items match your current filters</p>
          <button 
            @click="clearFilters"
            class="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="filteredItems.length > itemsPerPage" class="flex items-center justify-between pt-4 border-t">
        <div class="text-sm text-gray-600">
          Showing {{ startIndex + 1 }} to {{ Math.min(startIndex + itemsPerPage, filteredItems.length) }} of {{ filteredItems.length }} items
        </div>
        <div class="flex items-center space-x-2">
          <button 
            @click="previousPage"
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span class="text-sm text-gray-600">Page {{ currentPage }} of {{ totalPages }}</span>
          <button 
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Action Modal -->
    <div 
      v-if="showModal" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="closeModal"
    >
      <div 
        class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full m-4"
        @click.stop
      >
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ modalTitle }}</h3>
        <p class="text-sm text-gray-600 mb-4">{{ modalDescription }}</p>
        
        <!-- Modal Content Based on Action -->
        <div v-if="currentBulkAction === 'reassign'" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700">New Category:</label>
            <select v-model="bulkActionData.newCategory" class="mt-1 w-full text-sm border-gray-300 rounded-md">
              <option value="">Select category...</option>
              <option value="office-supplies">Office Supplies</option>
              <option value="business-meals">Business Meals</option>
              <option value="transportation">Transportation</option>
              <option value="software">Software</option>
            </select>
          </div>
        </div>

        <div v-else-if="currentBulkAction === 'add-notes'" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700">Notes:</label>
            <textarea 
              v-model="bulkActionData.notes"
              rows="3"
              class="mt-1 w-full text-sm border-gray-300 rounded-md"
              placeholder="Add notes for selected items..."
            ></textarea>
          </div>
        </div>

        <div v-else-if="currentBulkAction === 'reject'" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700">Rejection Reason:</label>
            <select v-model="bulkActionData.rejectionReason" class="mt-1 w-full text-sm border-gray-300 rounded-md">
              <option value="">Select reason...</option>
              <option value="missing-receipt">Missing Receipt</option>
              <option value="policy-violation">Policy Violation</option>
              <option value="duplicate-expense">Duplicate Expense</option>
              <option value="insufficient-documentation">Insufficient Documentation</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3 mt-6">
          <button 
            @click="closeModal"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            @click="executeBulkAction"
            :disabled="!canExecuteAction"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ getExecuteButtonText(currentBulkAction) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Progress Modal -->
    <div 
      v-if="showProgress" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full m-4">
        <div class="text-center">
          <svg class="animate-spin mx-auto h-8 w-8 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Processing...</h3>
          <p class="text-sm text-gray-600 mb-4">{{ progressMessage }}</p>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 mt-2">{{ processedCount }} of {{ totalToProcess }} items</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'

export default {
  name: 'BulkOperationsWorkflow',
  props: {
    sessionId: {
      type: String,
      required: true
    }
  },
  emits: ['bulk-action-completed', 'bulk-action-error', 'item-updated'],
  setup(props, { emit }) {
    // Reactive data
    const batchMode = ref(true)
    const operationStatus = ref('')
    const isProcessing = ref(false)
    const searchTerm = ref('')
    const selectedItems = ref(new Set())
    const currentPage = ref(1)
    const itemsPerPage = ref(20)
    const sortBy = ref('date')
    const viewMode = ref('list')

    // Filters
    const filters = ref({
      status: 'all',
      type: 'all',
      amountRange: 'all'
    })

    // Modal state
    const showModal = ref(false)
    const showProgress = ref(false)
    const currentBulkAction = ref('')
    const bulkActionData = ref({})
    const progressMessage = ref('')
    const progressPercentage = ref(0)
    const processedCount = ref(0)
    const totalToProcess = ref(0)

    // Mock data - in real implementation, this would come from API
    const items = ref([
      {
        id: '1',
        employee_name: 'John Doe',
        description: 'Coffee meeting with client',
        amount: 12.45,
        merchant: 'Starbucks',
        date: '2024-03-15',
        status: 'pending',
        type: 'missing-receipt',
        priority: 'medium'
      },
      {
        id: '2',
        employee_name: 'Jane Smith',
        description: 'Uber ride to airport',
        amount: 45.67,
        merchant: 'Uber',
        date: '2024-03-14',
        status: 'flagged',
        type: 'coding-issue',
        priority: 'high'
      },
      {
        id: '3',
        employee_name: 'Mike Johnson',
        description: 'Office supplies purchase',
        amount: 123.45,
        merchant: 'Staples',
        date: '2024-03-13',
        status: 'pending',
        type: 'data-mismatch',
        priority: 'low'
      },
      {
        id: '4',
        employee_name: 'Sarah Wilson',
        description: 'Team lunch',
        amount: 89.99,
        merchant: 'Restaurant ABC',
        date: '2024-03-12',
        status: 'approved',
        type: 'policy-violation',
        priority: 'medium'
      },
      {
        id: '5',
        employee_name: 'Tom Brown',
        description: 'Software subscription',
        amount: 299.00,
        merchant: 'Software Inc',
        date: '2024-03-11',
        status: 'rejected',
        type: 'missing-receipt',
        priority: 'high'
      }
    ])

    // Computed properties
    const statusClasses = computed(() => {
      switch (operationStatus.value) {
        case 'Processing':
          return 'bg-blue-100 text-blue-800'
        case 'Complete':
          return 'bg-green-100 text-green-800'
        case 'Error':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    })

    const filteredItems = computed(() => {
      let filtered = items.value

      // Apply filters
      if (filters.value.status !== 'all') {
        filtered = filtered.filter(item => item.status === filters.value.status)
      }

      if (filters.value.type !== 'all') {
        filtered = filtered.filter(item => item.type === filters.value.type)
      }

      if (filters.value.amountRange !== 'all') {
        filtered = filtered.filter(item => {
          switch (filters.value.amountRange) {
            case 'under-25': return item.amount < 25
            case '25-100': return item.amount >= 25 && item.amount <= 100
            case '100-500': return item.amount >= 100 && item.amount <= 500
            case 'over-500': return item.amount > 500
            default: return true
          }
        })
      }

      // Apply search
      if (searchTerm.value) {
        const term = searchTerm.value.toLowerCase()
        filtered = filtered.filter(item =>
          item.employee_name.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          item.merchant.toLowerCase().includes(term)
        )
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch (sortBy.value) {
          case 'date':
            return new Date(b.date) - new Date(a.date)
          case 'amount':
            return b.amount - a.amount
          case 'employee':
            return a.employee_name.localeCompare(b.employee_name)
          case 'status':
            return a.status.localeCompare(b.status)
          case 'priority':
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
            return priorityOrder[b.priority] - priorityOrder[a.priority]
          default:
            return 0
        }
      })

      return filtered
    })

    const paginatedItems = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredItems.value.slice(start, end)
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredItems.value.length / itemsPerPage.value)
    })

    const startIndex = computed(() => {
      return (currentPage.value - 1) * itemsPerPage.value
    })

    const selectedCount = computed(() => {
      return selectedItems.value.size
    })

    const modalTitle = computed(() => {
      const titles = {
        'approve': 'Approve Items',
        'reject': 'Reject Items',
        'flag': 'Flag Items',
        'reassign': 'Reassign Category',
        'update-policy': 'Apply Policy',
        'add-notes': 'Add Notes'
      }
      return titles[currentBulkAction.value] || 'Bulk Action'
    })

    const modalDescription = computed(() => {
      const descriptions = {
        'approve': `Approve ${selectedCount.value} selected items?`,
        'reject': `Reject ${selectedCount.value} selected items?`,
        'flag': `Flag ${selectedCount.value} items for review?`,
        'reassign': `Reassign category for ${selectedCount.value} items?`,
        'update-policy': `Apply policy to ${selectedCount.value} items?`,
        'add-notes': `Add notes to ${selectedCount.value} items?`
      }
      return descriptions[currentBulkAction.value] || `Process ${selectedCount.value} items?`
    })

    const canExecuteAction = computed(() => {
      switch (currentBulkAction.value) {
        case 'reassign':
          return bulkActionData.value.newCategory
        case 'add-notes':
          return bulkActionData.value.notes?.trim()
        case 'reject':
          return bulkActionData.value.rejectionReason
        default:
          return true
      }
    })

    // Methods
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const getStatusClasses = (status) => {
      const classes = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'approved': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800',
        'flagged': 'bg-orange-100 text-orange-800'
      }
      return classes[status] || 'bg-gray-100 text-gray-800'
    }

    const getPriorityClasses = (priority) => {
      const classes = {
        'high': 'bg-red-500',
        'medium': 'bg-yellow-500',
        'low': 'bg-green-500'
      }
      return classes[priority] || 'bg-gray-500'
    }

    const getExecuteButtonText = (action) => {
      const texts = {
        'approve': 'Approve',
        'reject': 'Reject',
        'flag': 'Flag',
        'reassign': 'Reassign',
        'update-policy': 'Apply',
        'add-notes': 'Add Notes'
      }
      return texts[action] || 'Execute'
    }

    const toggleBatchMode = () => {
      batchMode.value = !batchMode.value
      if (!batchMode.value) {
        selectedItems.value.clear()
      }
    }

    const toggleSelection = (itemId) => {
      if (selectedItems.value.has(itemId)) {
        selectedItems.value.delete(itemId)
      } else {
        selectedItems.value.add(itemId)
      }
    }

    const selectAll = () => {
      filteredItems.value.forEach(item => {
        selectedItems.value.add(item.id)
      })
    }

    const selectNone = () => {
      selectedItems.value.clear()
    }

    const selectByFilter = () => {
      // Smart select based on common criteria
      selectedItems.value.clear()
      filteredItems.value.forEach(item => {
        if (item.status === 'pending' || item.priority === 'high') {
          selectedItems.value.add(item.id)
        }
      })
    }

    const clearSelection = () => {
      selectedItems.value.clear()
    }

    const clearFilters = () => {
      filters.value = {
        status: 'all',
        type: 'all',
        amountRange: 'all'
      }
      searchTerm.value = ''
      currentPage.value = 1
    }

    const previousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }

    const showBulkActionModal = (action) => {
      currentBulkAction.value = action
      bulkActionData.value = {}
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      currentBulkAction.value = ''
      bulkActionData.value = {}
    }

    const executeBulkAction = async () => {
      if (!canExecuteAction.value) return

      closeModal()
      showProgress.value = true
      isProcessing.value = true
      operationStatus.value = 'Processing'

      const selectedIds = Array.from(selectedItems.value)
      totalToProcess.value = selectedIds.length
      processedCount.value = 0

      try {
        for (const itemId of selectedIds) {
          // Simulate processing each item
          await new Promise(resolve => setTimeout(resolve, 200))
          
          const item = items.value.find(i => i.id === itemId)
          if (item) {
            // Apply the action
            switch (currentBulkAction.value) {
              case 'approve':
                item.status = 'approved'
                break
              case 'reject':
                item.status = 'rejected'
                break
              case 'flag':
                item.status = 'flagged'
                break
              case 'reassign':
                // Update category logic here
                break
            }

            emit('item-updated', { itemId, action: currentBulkAction.value, data: bulkActionData.value })
          }

          processedCount.value++
          progressPercentage.value = (processedCount.value / totalToProcess.value) * 100
          progressMessage.value = `Processing item ${processedCount.value} of ${totalToProcess.value}`
        }

        operationStatus.value = 'Complete'
        selectedItems.value.clear()

        emit('bulk-action-completed', {
          action: currentBulkAction.value,
          itemIds: selectedIds,
          data: bulkActionData.value
        })

      } catch (error) {
        operationStatus.value = 'Error'
        emit('bulk-action-error', {
          action: currentBulkAction.value,
          error: error.message
        })
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          showProgress.value = false
          operationStatus.value = ''
        }, 2000)
      }
    }

    const quickApprove = async (itemId) => {
      try {
        const item = items.value.find(i => i.id === itemId)
        if (item) {
          item.status = 'approved'
          emit('item-updated', { itemId, action: 'approve' })
        }
      } catch (error) {
        emit('bulk-action-error', { error: error.message })
      }
    }

    const quickReject = async (itemId) => {
      try {
        const item = items.value.find(i => i.id === itemId)
        if (item) {
          item.status = 'rejected'
          emit('item-updated', { itemId, action: 'reject' })
        }
      } catch (error) {
        emit('bulk-action-error', { error: error.message })
      }
    }

    const viewDetails = (item) => {
      // Emit event to show item details
      emit('view-item-details', item)
    }

    const exportSelected = async (format) => {
      const selectedIds = Array.from(selectedItems.value)
      const selectedItemsData = items.value.filter(item => selectedIds.includes(item.id))

      // Simulate export
      console.log(`Exporting ${selectedItemsData.length} items as ${format}`)
      
      // In real implementation, generate and download file
      emit('export-completed', {
        format,
        itemIds: selectedIds,
        count: selectedItemsData.length
      })
    }

    const scheduleFollowUp = () => {
      const selectedIds = Array.from(selectedItems.value)
      // Open follow-up scheduling interface
      emit('schedule-follow-up', { itemIds: selectedIds })
    }

    // Watch for filter changes to reset pagination
    watch([filters, searchTerm], () => {
      currentPage.value = 1
    }, { deep: true })

    return {
      // Reactive data
      batchMode,
      operationStatus,
      isProcessing,
      searchTerm,
      selectedItems,
      currentPage,
      itemsPerPage,
      sortBy,
      viewMode,
      filters,
      showModal,
      showProgress,
      currentBulkAction,
      bulkActionData,
      progressMessage,
      progressPercentage,
      processedCount,
      totalToProcess,
      items,

      // Computed
      statusClasses,
      filteredItems,
      paginatedItems,
      totalPages,
      startIndex,
      selectedCount,
      modalTitle,
      modalDescription,
      canExecuteAction,

      // Methods
      formatCurrency,
      formatDate,
      getStatusClasses,
      getPriorityClasses,
      getExecuteButtonText,
      toggleBatchMode,
      toggleSelection,
      selectAll,
      selectNone,
      selectByFilter,
      clearSelection,
      clearFilters,
      previousPage,
      nextPage,
      showBulkActionModal,
      closeModal,
      executeBulkAction,
      quickApprove,
      quickReject,
      viewDetails,
      exportSelected,
      scheduleFollowUp
    }
  }
}
</script>