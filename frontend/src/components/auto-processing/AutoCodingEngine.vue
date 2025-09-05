<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Auto-Coding Engine</h3>
          <p class="text-sm text-gray-600 mt-1">
            AI-powered expense category classification and coding suggestions
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="processingStatus" :class="statusClasses" class="px-2 py-1 rounded-full text-xs font-medium">
            {{ processingStatus }}
          </span>
          <button 
            @click="toggleLearningMode"
            :class="[
              'px-3 py-1 text-sm font-medium rounded-md transition-colors',
              learningMode 
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Learning: {{ learningMode ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Engine Configuration -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Engine Configuration</h4>
        
        <div class="grid grid-cols-3 gap-6">
          <!-- ML Model Settings -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">ML Model:</label>
            <select v-model="config.model" class="w-full text-sm border-gray-300 rounded-md">
              <option value="neural-network">Neural Network</option>
              <option value="random-forest">Random Forest</option>
              <option value="gradient-boost">Gradient Boosting</option>
              <option value="ensemble">Ensemble Model</option>
            </select>
            <div class="text-xs text-gray-500">
              Accuracy: {{ getModelAccuracy(config.model) }}%
            </div>
          </div>

          <!-- Confidence Settings -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">Auto-Apply Threshold:</label>
            <div class="flex items-center space-x-2">
              <input 
                v-model.number="config.autoApplyThreshold"
                type="range"
                min="0.7"
                max="0.98"
                step="0.02"
                class="flex-1"
              >
              <span class="text-sm font-medium text-gray-900 w-12">{{ Math.round(config.autoApplyThreshold * 100) }}%</span>
            </div>
            <div class="text-xs text-gray-500">
              Suggestions above this confidence will be auto-applied
            </div>
          </div>

          <!-- Feature Weights -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">Feature Importance:</label>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600">Description</span>
                <span class="text-xs font-medium">{{ config.featureWeights.description }}%</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600">Merchant</span>
                <span class="text-xs font-medium">{{ config.featureWeights.merchant }}%</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600">Amount</span>
                <span class="text-xs font-medium">{{ config.featureWeights.amount }}%</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600">Context</span>
                <span class="text-xs font-medium">{{ config.featureWeights.context }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Dashboard -->
      <div class="grid grid-cols-5 gap-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-700">{{ performance.totalProcessed }}</div>
          <div class="text-sm text-blue-600">Total Processed</div>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-700">{{ performance.autoCoded }}</div>
          <div class="text-sm text-green-600">Auto-Coded</div>
          <div class="text-xs text-green-500 mt-1">{{ autoCodedPercentage }}%</div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-yellow-700">{{ performance.needsReview }}</div>
          <div class="text-sm text-yellow-600">Needs Review</div>
        </div>
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-purple-700">{{ Math.round(performance.accuracy * 100) }}%</div>
          <div class="text-sm text-purple-600">Accuracy</div>
        </div>
        <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-indigo-700">{{ performance.learningSessions }}</div>
          <div class="text-sm text-indigo-600">Training Sessions</div>
        </div>
      </div>

      <!-- Coding Suggestions Queue -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-md font-semibold text-gray-900">Coding Suggestions</h4>
          <div class="flex items-center space-x-2">
            <select v-model="suggestionFilter" class="text-sm border-gray-300 rounded-md">
              <option value="all">All Suggestions</option>
              <option value="high-confidence">High Confidence ({{ highConfidenceCount }})</option>
              <option value="needs-review">Needs Review ({{ needsReviewCount }})</option>
              <option value="uncertain">Uncertain ({{ uncertainCount }})</option>
            </select>
            <button 
              @click="refreshSuggestions"
              :disabled="isProcessing"
              class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg :class="{ 'animate-spin': isProcessing }" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Suggestion Items -->
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div 
            v-for="item in filteredSuggestions" 
            :key="item.id"
            class="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between">
              <!-- Expense Info -->
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ item.expense.description }}</p>
                    <p class="text-xs text-gray-500">
                      {{ formatCurrency(item.expense.amount) }} • 
                      {{ item.expense.merchant }} • 
                      {{ item.expense.employee_name }} • 
                      {{ formatDate(item.expense.date) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <div class="text-xs text-gray-500">Current: {{ item.expense.current_category || 'Uncategorized' }}</div>
                  </div>
                </div>

                <!-- AI Suggestions -->
                <div class="space-y-2">
                  <div 
                    v-for="(suggestion, index) in item.suggestions" 
                    :key="index"
                    :class="[
                      'flex items-center justify-between p-3 rounded border transition-colors cursor-pointer',
                      suggestion.confidence >= config.autoApplyThreshold 
                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                        : suggestion.confidence >= 0.7
                        ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                        : 'border-red-200 bg-red-50 hover:bg-red-100'
                    ]"
                    @click="applySuggestion(item.id, suggestion)"
                  >
                    <div class="flex items-center space-x-3">
                      <div :class="[
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                        suggestion.confidence >= config.autoApplyThreshold 
                          ? 'bg-green-100 text-green-700'
                          : suggestion.confidence >= 0.7
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      ]">
                        {{ Math.round(suggestion.confidence * 100) }}
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">{{ suggestion.category }}</p>
                        <p class="text-xs text-gray-600">{{ suggestion.subcategory }}</p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="text-right">
                        <p class="text-xs text-gray-500">{{ suggestion.reasoning }}</p>
                        <div class="flex items-center space-x-1 mt-1">
                          <span 
                            v-for="feature in suggestion.keyFeatures" 
                            :key="feature"
                            class="px-1 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {{ feature }}
                          </span>
                        </div>
                      </div>
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <!-- Learning Feedback -->
                <div v-if="learningMode && item.appliedSuggestion" class="mt-3 p-2 bg-blue-50 rounded border">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-blue-900">Was this suggestion helpful?</span>
                    <div class="flex items-center space-x-2">
                      <button 
                        @click="provideFeedback(item.id, 'positive')"
                        class="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 8v12m-6-4h6m-3 0V8" />
                        </svg>
                      </button>
                      <button 
                        @click="provideFeedback(item.id, 'negative')"
                        class="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 16v-4M9 10h6m-3 0v8" />
                        </svg>
                      </button>
                      <button 
                        @click="provideCorrection(item.id)"
                        class="px-2 py-1 text-xs text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                      >
                        Correct
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex flex-col items-end space-y-2 ml-4">
                <div class="flex items-center space-x-2">
                  <button 
                    v-if="item.suggestions.length > 0 && item.suggestions[0].confidence >= config.autoApplyThreshold"
                    @click="applyBestSuggestion(item)"
                    class="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    Auto Apply
                  </button>
                  <button 
                    @click="skipSuggestion(item.id)"
                    class="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Skip
                  </button>
                </div>
                <button 
                  @click="manualCoding(item)"
                  class="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                >
                  Manual Code
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredSuggestions.length === 0" class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p class="mt-2 text-sm text-gray-600">No coding suggestions available</p>
        </div>
      </div>

      <!-- Category Statistics -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Category Distribution</h4>
        <div class="grid grid-cols-2 gap-6">
          <!-- Top Categories -->
          <div class="space-y-3">
            <h5 class="text-sm font-medium text-gray-700">Most Common Categories</h5>
            <div class="space-y-2">
              <div 
                v-for="category in topCategories" 
                :key="category.name"
                class="flex items-center justify-between"
              >
                <span class="text-sm text-gray-600">{{ category.name }}</span>
                <div class="flex items-center space-x-2">
                  <div class="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full"
                      :style="{ width: (category.percentage) + '%' }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium text-gray-900 w-8">{{ category.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Model Performance -->
          <div class="space-y-3">
            <h5 class="text-sm font-medium text-gray-700">Model Performance by Category</h5>
            <div class="space-y-2">
              <div 
                v-for="category in categoryPerformance" 
                :key="category.name"
                class="flex items-center justify-between"
              >
                <span class="text-sm text-gray-600">{{ category.name }}</span>
                <div class="flex items-center space-x-2">
                  <div class="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      :class="[
                        'h-2 rounded-full',
                        category.accuracy >= 0.9 ? 'bg-green-600' :
                        category.accuracy >= 0.8 ? 'bg-yellow-600' : 'bg-red-600'
                      ]"
                      :style="{ width: (category.accuracy * 100) + '%' }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium text-gray-900 w-12">{{ Math.round(category.accuracy * 100) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Actions -->
      <div class="flex items-center justify-between pt-4 border-t">
        <div class="text-sm text-gray-600">
          {{ filteredSuggestions.length }} suggestions • 
          {{ highConfidenceCount }} high confidence
        </div>
        
        <div class="flex items-center space-x-3">
          <button 
            @click="retrainModel"
            :disabled="isProcessing || !learningMode"
            class="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Retrain Model
          </button>
          <button 
            @click="processHighConfidence"
            :disabled="!highConfidenceCount || isProcessing"
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
            @click="runCoding"
            :disabled="isProcessing"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Auto-Coding
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'AutoCodingEngine',
  props: {
    sessionId: {
      type: String,
      required: true
    }
  },
  emits: ['coding-completed', 'coding-error', 'manual-coding-required', 'model-updated'],
  setup(props, { emit }) {
    // Reactive data
    const isProcessing = ref(false)
    const processingStatus = ref('')
    const learningMode = ref(true)
    const suggestionFilter = ref('all')

    // Configuration
    const config = ref({
      model: 'ensemble',
      autoApplyThreshold: 0.9,
      featureWeights: {
        description: 45,
        merchant: 30,
        amount: 15,
        context: 10
      }
    })

    // Performance data
    const performance = ref({
      totalProcessed: 1247,
      autoCoded: 856,
      needsReview: 234,
      accuracy: 0.89,
      learningSessions: 23
    })

    // Mock suggestions data
    const suggestions = ref([
      {
        id: '1',
        expense: {
          id: 'e1',
          description: 'Starbucks coffee meeting',
          amount: 12.45,
          merchant: 'Starbucks',
          employee_name: 'John Doe',
          date: '2024-03-15',
          current_category: null
        },
        suggestions: [
          {
            confidence: 0.94,
            category: 'Business Meals',
            subcategory: 'Client Entertainment',
            reasoning: 'Coffee + meeting keywords detected',
            keyFeatures: ['meeting', 'starbucks', 'amount-pattern']
          },
          {
            confidence: 0.78,
            category: 'Office Supplies',
            subcategory: 'Refreshments',
            reasoning: 'Coffee expense pattern',
            keyFeatures: ['beverage', 'office-hours']
          }
        ]
      },
      {
        id: '2',
        expense: {
          id: 'e2',
          description: 'Uber ride to client site',
          amount: 28.50,
          merchant: 'Uber',
          employee_name: 'Jane Smith',
          date: '2024-03-14',
          current_category: 'Transportation'
        },
        suggestions: [
          {
            confidence: 0.96,
            category: 'Transportation',
            subcategory: 'Business Travel',
            reasoning: 'Client + transportation keywords',
            keyFeatures: ['client', 'uber', 'business-hours']
          }
        ]
      },
      {
        id: '3',
        expense: {
          id: 'e3',
          description: 'Office supplies purchase',
          amount: 89.99,
          merchant: 'Staples',
          employee_name: 'Mike Johnson',
          date: '2024-03-13',
          current_category: null
        },
        suggestions: [
          {
            confidence: 0.85,
            category: 'Office Supplies',
            subcategory: 'General Supplies',
            reasoning: 'Merchant and description match',
            keyFeatures: ['office', 'supplies', 'staples']
          }
        ]
      }
    ])

    // Category statistics
    const topCategories = ref([
      { name: 'Office Supplies', count: 234, percentage: 35 },
      { name: 'Business Meals', count: 156, percentage: 28 },
      { name: 'Transportation', count: 123, percentage: 22 },
      { name: 'Software', count: 89, percentage: 15 }
    ])

    const categoryPerformance = ref([
      { name: 'Office Supplies', accuracy: 0.94 },
      { name: 'Transportation', accuracy: 0.91 },
      { name: 'Business Meals', accuracy: 0.87 },
      { name: 'Software', accuracy: 0.82 }
    ])

    // Computed properties
    const statusClasses = computed(() => {
      switch (processingStatus.value) {
        case 'Processing':
          return 'bg-blue-100 text-blue-800'
        case 'Training':
          return 'bg-purple-100 text-purple-800'
        case 'Complete':
          return 'bg-green-100 text-green-800'
        case 'Error':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    })

    const autoCodedPercentage = computed(() => {
      return Math.round((performance.value.autoCoded / performance.value.totalProcessed) * 100)
    })

    const filteredSuggestions = computed(() => {
      switch (suggestionFilter.value) {
        case 'high-confidence':
          return suggestions.value.filter(item => 
            item.suggestions.length > 0 && item.suggestions[0].confidence >= config.value.autoApplyThreshold
          )
        case 'needs-review':
          return suggestions.value.filter(item => 
            item.suggestions.length > 0 && item.suggestions[0].confidence >= 0.7 && 
            item.suggestions[0].confidence < config.value.autoApplyThreshold
          )
        case 'uncertain':
          return suggestions.value.filter(item => 
            item.suggestions.length === 0 || item.suggestions[0].confidence < 0.7
          )
        default:
          return suggestions.value
      }
    })

    const highConfidenceCount = computed(() => {
      return suggestions.value.filter(item => 
        item.suggestions.length > 0 && item.suggestions[0].confidence >= config.value.autoApplyThreshold
      ).length
    })

    const needsReviewCount = computed(() => {
      return suggestions.value.filter(item => 
        item.suggestions.length > 0 && item.suggestions[0].confidence >= 0.7 && 
        item.suggestions[0].confidence < config.value.autoApplyThreshold
      ).length
    })

    const uncertainCount = computed(() => {
      return suggestions.value.filter(item => 
        item.suggestions.length === 0 || item.suggestions[0].confidence < 0.7
      ).length
    })

    // Methods
    const getModelAccuracy = (modelType) => {
      const accuracies = {
        'neural-network': 89,
        'random-forest': 85,
        'gradient-boost': 87,
        'ensemble': 92
      }
      return accuracies[modelType] || 85
    }

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

    const toggleLearningMode = () => {
      learningMode.value = !learningMode.value
    }

    const refreshSuggestions = async () => {
      isProcessing.value = true
      processingStatus.value = 'Processing'
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        processingStatus.value = 'Complete'
      } catch (error) {
        processingStatus.value = 'Error'
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          processingStatus.value = ''
        }, 2000)
      }
    }

    const applySuggestion = async (itemId, suggestion) => {
      try {
        const item = suggestions.value.find(s => s.id === itemId)
        if (!item) return

        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Apply the coding
        item.expense.current_category = suggestion.category
        item.appliedSuggestion = suggestion
        
        // Remove from suggestions or mark as completed
        const index = suggestions.value.findIndex(s => s.id === itemId)
        if (index !== -1) {
          suggestions.value.splice(index, 1)
        }

        // Update stats
        performance.value.autoCoded += 1
        
        emit('coding-completed', {
          expenseId: item.expense.id,
          category: suggestion.category,
          subcategory: suggestion.subcategory,
          confidence: suggestion.confidence,
          method: 'ai-suggestion'
        })

      } catch (error) {
        emit('coding-error', {
          expenseId: itemId,
          error: error.message
        })
      }
    }

    const applyBestSuggestion = (item) => {
      if (item.suggestions.length === 0) return
      applySuggestion(item.id, item.suggestions[0])
    }

    const skipSuggestion = (itemId) => {
      // Move to end of queue or mark as skipped
      const index = suggestions.value.findIndex(s => s.id === itemId)
      if (index !== -1) {
        const item = suggestions.value.splice(index, 1)[0]
        suggestions.value.push(item)
      }
    }

    const manualCoding = (item) => {
      emit('manual-coding-required', {
        expense: item.expense,
        suggestions: item.suggestions
      })
    }

    const provideFeedback = async (itemId, feedback) => {
      if (!learningMode.value) return

      try {
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // In real implementation, send feedback to ML model
        console.log(`Feedback for ${itemId}: ${feedback}`)
        
        // Update learning session count
        if (feedback === 'positive' || feedback === 'negative') {
          // This would trigger model retraining in production
        }

      } catch (error) {
        console.error('Failed to provide feedback:', error)
      }
    }

    const provideCorrection = (itemId) => {
      const item = suggestions.value.find(s => s.id === itemId)
      if (!item) return

      // Open manual coding interface with correction context
      manualCoding(item)
    }

    const processHighConfidence = async () => {
      if (!highConfidenceCount.value) return

      isProcessing.value = true
      processingStatus.value = 'Processing'

      try {
        const highConfidenceItems = suggestions.value.filter(item => 
          item.suggestions.length > 0 && item.suggestions[0].confidence >= config.value.autoApplyThreshold
        )

        for (const item of highConfidenceItems) {
          await applySuggestion(item.id, item.suggestions[0])
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        processingStatus.value = 'Complete'

      } catch (error) {
        processingStatus.value = 'Error'
        emit('coding-error', { error: error.message })
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          processingStatus.value = ''
        }, 2000)
      }
    }

    const retrainModel = async () => {
      if (!learningMode.value) return

      isProcessing.value = true
      processingStatus.value = 'Training'

      try {
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Update performance metrics
        performance.value.learningSessions += 1
        performance.value.accuracy = Math.min(performance.value.accuracy + 0.02, 0.98)

        processingStatus.value = 'Complete'
        
        emit('model-updated', {
          accuracy: performance.value.accuracy,
          sessions: performance.value.learningSessions
        })

      } catch (error) {
        processingStatus.value = 'Error'
        emit('coding-error', { error: error.message })
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          processingStatus.value = ''
        }, 2000)
      }
    }

    const runCoding = async () => {
      isProcessing.value = true
      processingStatus.value = 'Processing'

      try {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Simulate generating new suggestions
        processingStatus.value = 'Complete'

      } catch (error) {
        processingStatus.value = 'Error'
        emit('coding-error', { error: error.message })
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          processingStatus.value = ''
        }, 2000)
      }
    }

    onMounted(() => {
      refreshSuggestions()
    })

    return {
      // Reactive data
      isProcessing,
      processingStatus,
      learningMode,
      suggestionFilter,
      config,
      performance,
      suggestions,
      topCategories,
      categoryPerformance,

      // Computed
      statusClasses,
      autoCodedPercentage,
      filteredSuggestions,
      highConfidenceCount,
      needsReviewCount,
      uncertainCount,

      // Methods
      getModelAccuracy,
      formatCurrency,
      formatDate,
      toggleLearningMode,
      refreshSuggestions,
      applySuggestion,
      applyBestSuggestion,
      skipSuggestion,
      manualCoding,
      provideFeedback,
      provideCorrection,
      processHighConfidence,
      retrainModel,
      runCoding
    }
  }
}
</script>