<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Smart Receipt Matching</h3>
          <p class="text-sm text-gray-600 mt-1">
            AI-powered matching of receipts to expense entries
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="matchingStatus" :class="statusClasses" class="px-2 py-1 rounded-full text-xs font-medium">
            {{ matchingStatus }}
          </span>
          <button 
            @click="toggleAutoMode"
            :class="[
              'px-3 py-1 text-sm font-medium rounded-md transition-colors',
              autoMode 
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Auto: {{ autoMode ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Matching Configuration -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Matching Configuration</h4>
        
        <div class="grid grid-cols-2 gap-6">
          <!-- AI Model Settings -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">AI Model Settings:</label>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Confidence Threshold</span>
                <div class="flex items-center space-x-2">
                  <input 
                    v-model.number="config.confidenceThreshold"
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    class="w-20"
                  >
                  <span class="text-sm font-medium text-gray-900 w-12">{{ Math.round(config.confidenceThreshold * 100) }}%</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Max Suggestions</span>
                <select v-model="config.maxSuggestions" class="text-sm border-gray-300 rounded-md">
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                </select>
              </div>
              <label class="flex items-center">
                <input 
                  v-model="config.enableFuzzyMatching"
                  type="checkbox" 
                  class="rounded border-gray-300 text-blue-600"
                >
                <span class="ml-2 text-sm text-gray-700">Enable fuzzy text matching</span>
              </label>
            </div>
          </div>

          <!-- Matching Criteria -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">Matching Criteria Weights:</label>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Amount Match</span>
                <input 
                  v-model.number="config.weights.amount"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  class="w-20"
                >
                <span class="text-sm font-medium text-gray-900 w-8">{{ config.weights.amount }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Date Proximity</span>
                <input 
                  v-model.number="config.weights.date"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  class="w-20"
                >
                <span class="text-sm font-medium text-gray-900 w-8">{{ config.weights.date }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Merchant Match</span>
                <input 
                  v-model.number="config.weights.merchant"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  class="w-20"
                >
                <span class="text-sm font-medium text-gray-900 w-8">{{ config.weights.merchant }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Category Match</span>
                <input 
                  v-model.number="config.weights.category"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  class="w-20"
                >
                <span class="text-sm font-medium text-gray-900 w-8">{{ config.weights.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics Dashboard -->
      <div class="grid grid-cols-4 gap-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-700">{{ stats.totalReceipts }}</div>
          <div class="text-sm text-blue-600">Total Receipts</div>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-700">{{ stats.matched }}</div>
          <div class="text-sm text-green-600">Auto Matched</div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-yellow-700">{{ stats.pending }}</div>
          <div class="text-sm text-yellow-600">Pending Review</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-red-700">{{ stats.unmatched }}</div>
          <div class="text-sm text-red-600">Unmatched</div>
        </div>
      </div>

      <!-- Matching Queue -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-md font-semibold text-gray-900">Matching Queue</h4>
          <div class="flex items-center space-x-2">
            <button 
              @click="refreshQueue"
              :disabled="isProcessing"
              class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg :class="{ 'animate-spin': isProcessing }" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <select v-model="queueFilter" class="text-sm border-gray-300 rounded-md">
              <option value="all">All Items</option>
              <option value="high-confidence">High Confidence</option>
              <option value="needs-review">Needs Review</option>
              <option value="unmatched">Unmatched</option>
            </select>
          </div>
        </div>

        <!-- Queue Items -->
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div 
            v-for="item in filteredQueue" 
            :key="item.id"
            class="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between">
              <!-- Receipt Info -->
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <div class="flex-shrink-0">
                    <img 
                      v-if="item.receipt.thumbnail"
                      :src="item.receipt.thumbnail"
                      :alt="item.receipt.filename"
                      class="w-12 h-12 object-cover rounded border"
                    >
                    <div v-else class="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center">
                      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ item.receipt.filename }}</p>
                    <p class="text-xs text-gray-500">
                      {{ formatCurrency(item.receipt.amount) }} • {{ item.receipt.merchant }} • {{ formatDate(item.receipt.date) }}
                    </p>
                  </div>
                </div>

                <!-- AI Suggestions -->
                <div v-if="item.suggestions.length > 0" class="space-y-2">
                  <div 
                    v-for="(suggestion, index) in item.suggestions" 
                    :key="index"
                    :class="[
                      'flex items-center justify-between p-2 rounded border-2 transition-colors cursor-pointer',
                      suggestion.confidence >= config.confidenceThreshold 
                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                        : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                    ]"
                    @click="selectSuggestion(item.id, suggestion)"
                  >
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0">
                        <div :class="[
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                          suggestion.confidence >= config.confidenceThreshold 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        ]">
                          {{ Math.round(suggestion.confidence * 100) }}
                        </div>
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">{{ suggestion.expense.description }}</p>
                        <p class="text-xs text-gray-600">
                          {{ formatCurrency(suggestion.expense.amount) }} • 
                          {{ suggestion.expense.category }} • 
                          {{ suggestion.expense.employee_name }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="text-xs text-gray-500">{{ suggestion.matchReason }}</span>
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div v-else class="text-sm text-gray-500 italic">
                  No matching suggestions found
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2 ml-4">
                <button 
                  v-if="item.suggestions.length > 0"
                  @click="acceptBestMatch(item)"
                  :disabled="item.suggestions[0].confidence < config.confidenceThreshold"
                  class="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Accept Best
                </button>
                <button 
                  @click="skipItem(item.id)"
                  class="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Skip
                </button>
                <button 
                  @click="manualMatch(item)"
                  class="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                >
                  Manual
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredQueue.length === 0" class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-2 text-sm text-gray-600">No items in queue</p>
        </div>
      </div>

      <!-- Bulk Actions -->
      <div class="flex items-center justify-between pt-4 border-t">
        <div class="text-sm text-gray-600">
          {{ filteredQueue.length }} items in queue
        </div>
        
        <div class="flex items-center space-x-3">
          <button 
            @click="processHighConfidence"
            :disabled="!hasHighConfidenceItems || isProcessing"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isProcessing" class="flex items-center space-x-2">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
            <span v-else>Process High Confidence ({{ highConfidenceCount }})</span>
          </button>
          <button 
            @click="runMatching"
            :disabled="isProcessing"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Matching
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'

export default {
  name: 'SmartReceiptMatcher',
  props: {
    sessionId: {
      type: String,
      required: true
    }
  },
  emits: ['match-completed', 'match-error', 'manual-match-required'],
  setup(props, { emit }) {
    // Reactive data
    const isProcessing = ref(false)
    const matchingStatus = ref('')
    const autoMode = ref(true)
    const queueFilter = ref('all')

    // Configuration
    const config = ref({
      confidenceThreshold: 0.8,
      maxSuggestions: 5,
      enableFuzzyMatching: true,
      weights: {
        amount: 0.4,
        date: 0.2,
        merchant: 0.3,
        category: 0.1
      }
    })

    // Mock data - in real implementation, this would come from API
    const stats = ref({
      totalReceipts: 156,
      matched: 89,
      pending: 34,
      unmatched: 33
    })

    const queue = ref([
      {
        id: '1',
        receipt: {
          id: 'r1',
          filename: 'starbucks_receipt_001.pdf',
          amount: 12.45,
          merchant: 'Starbucks',
          date: '2024-03-15',
          thumbnail: null
        },
        suggestions: [
          {
            confidence: 0.92,
            expense: {
              id: 'e1',
              description: 'Coffee meeting with client',
              amount: 12.45,
              category: 'Business Meals',
              employee_name: 'John Doe',
              date: '2024-03-15'
            },
            matchReason: 'Amount + merchant exact match'
          },
          {
            confidence: 0.75,
            expense: {
              id: 'e2',
              description: 'Team coffee break',
              amount: 15.20,
              category: 'Office Supplies',
              employee_name: 'John Doe',
              date: '2024-03-15'
            },
            matchReason: 'Merchant + date match'
          }
        ]
      },
      {
        id: '2',
        receipt: {
          id: 'r2',
          filename: 'uber_receipt_002.pdf',
          amount: 28.50,
          merchant: 'Uber',
          date: '2024-03-14',
          thumbnail: null
        },
        suggestions: [
          {
            confidence: 0.88,
            expense: {
              id: 'e3',
              description: 'Client meeting transportation',
              amount: 28.50,
              category: 'Transportation',
              employee_name: 'Jane Smith',
              date: '2024-03-14'
            },
            matchReason: 'Perfect amount + date match'
          }
        ]
      },
      {
        id: '3',
        receipt: {
          id: 'r3',
          filename: 'office_depot_receipt.pdf',
          amount: 156.78,
          merchant: 'Office Depot',
          date: '2024-03-13',
          thumbnail: null
        },
        suggestions: []
      }
    ])

    // Computed properties
    const statusClasses = computed(() => {
      switch (matchingStatus.value) {
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

    const filteredQueue = computed(() => {
      switch (queueFilter.value) {
        case 'high-confidence':
          return queue.value.filter(item => 
            item.suggestions.length > 0 && item.suggestions[0].confidence >= config.value.confidenceThreshold
          )
        case 'needs-review':
          return queue.value.filter(item => 
            item.suggestions.length > 0 && item.suggestions[0].confidence < config.value.confidenceThreshold
          )
        case 'unmatched':
          return queue.value.filter(item => item.suggestions.length === 0)
        default:
          return queue.value
      }
    })

    const hasHighConfidenceItems = computed(() => {
      return queue.value.some(item => 
        item.suggestions.length > 0 && item.suggestions[0].confidence >= config.value.confidenceThreshold
      )
    })

    const highConfidenceCount = computed(() => {
      return queue.value.filter(item => 
        item.suggestions.length > 0 && item.suggestions[0].confidence >= config.value.confidenceThreshold
      ).length
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

    const toggleAutoMode = () => {
      autoMode.value = !autoMode.value
      if (autoMode.value) {
        // Auto-process high confidence matches
        processHighConfidence()
      }
    }

    const refreshQueue = async () => {
      isProcessing.value = true
      matchingStatus.value = 'Processing'
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // In real implementation, fetch updated queue from API
        matchingStatus.value = 'Complete'
        
      } catch (error) {
        matchingStatus.value = 'Error'
        console.error('Failed to refresh queue:', error)
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          matchingStatus.value = ''
        }, 2000)
      }
    }

    const selectSuggestion = (itemId, suggestion) => {
      const item = queue.value.find(q => q.id === itemId)
      if (!item) return

      // Apply the match
      applyMatch(item, suggestion)
    }

    const acceptBestMatch = (item) => {
      if (item.suggestions.length === 0) return
      
      const bestSuggestion = item.suggestions[0]
      if (bestSuggestion.confidence >= config.value.confidenceThreshold) {
        applyMatch(item, bestSuggestion)
      }
    }

    const applyMatch = async (item, suggestion) => {
      try {
        // Simulate API call to apply match
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Remove item from queue
        const index = queue.value.findIndex(q => q.id === item.id)
        if (index !== -1) {
          queue.value.splice(index, 1)
        }
        
        // Update stats
        stats.value.matched += 1
        stats.value.pending -= 1
        
        emit('match-completed', {
          receiptId: item.receipt.id,
          expenseId: suggestion.expense.id,
          confidence: suggestion.confidence,
          matchType: 'auto'
        })
        
      } catch (error) {
        emit('match-error', {
          receiptId: item.receipt.id,
          error: error.message
        })
      }
    }

    const skipItem = (itemId) => {
      // Move item to end of queue or mark as skipped
      const index = queue.value.findIndex(q => q.id === itemId)
      if (index !== -1) {
        const item = queue.value.splice(index, 1)[0]
        queue.value.push(item)
      }
    }

    const manualMatch = (item) => {
      emit('manual-match-required', {
        receipt: item.receipt,
        suggestions: item.suggestions
      })
    }

    const processHighConfidence = async () => {
      if (!hasHighConfidenceItems.value) return
      
      isProcessing.value = true
      matchingStatus.value = 'Processing'
      
      try {
        const highConfidenceItems = queue.value.filter(item => 
          item.suggestions.length > 0 && item.suggestions[0].confidence >= config.value.confidenceThreshold
        )
        
        for (const item of highConfidenceItems) {
          await applyMatch(item, item.suggestions[0])
          // Small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        matchingStatus.value = 'Complete'
        
      } catch (error) {
        matchingStatus.value = 'Error'
        emit('match-error', { error: error.message })
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          matchingStatus.value = ''
        }, 2000)
      }
    }

    const runMatching = async () => {
      isProcessing.value = true
      matchingStatus.value = 'Processing'
      
      try {
        // Simulate AI matching process
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // In real implementation, call AI matching API
        // This would update the queue with new suggestions
        
        matchingStatus.value = 'Complete'
        
      } catch (error) {
        matchingStatus.value = 'Error'
        emit('match-error', { error: error.message })
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          matchingStatus.value = ''
        }, 2000)
      }
    }

    // Watch for auto-mode processing
    watch(autoMode, (newValue) => {
      if (newValue && hasHighConfidenceItems.value) {
        processHighConfidence()
      }
    })

    onMounted(() => {
      refreshQueue()
    })

    return {
      // Reactive data
      isProcessing,
      matchingStatus,
      autoMode,
      queueFilter,
      config,
      stats,
      queue,

      // Computed
      statusClasses,
      filteredQueue,
      hasHighConfidenceItems,
      highConfidenceCount,

      // Methods
      formatCurrency,
      formatDate,
      toggleAutoMode,
      refreshQueue,
      selectSuggestion,
      acceptBestMatch,
      skipItem,
      manualMatch,
      processHighConfidence,
      runMatching
    }
  }
}
</script>