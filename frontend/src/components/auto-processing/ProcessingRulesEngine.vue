<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Processing Rules Engine</h3>
          <p class="text-sm text-gray-600 mt-1">
            Configure business rules, validation logic, and automated processing workflows
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="engineStatus" :class="statusClasses" class="px-2 py-1 rounded-full text-xs font-medium">
            {{ engineStatus }}
          </span>
          <button 
            @click="toggleEngine"
            :class="[
              'px-3 py-1 text-sm font-medium rounded-md transition-colors',
              engineEnabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            ]"
          >
            Engine: {{ engineEnabled ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Engine Statistics -->
      <div class="grid grid-cols-4 gap-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-700">{{ stats.activeRules }}</div>
          <div class="text-sm text-blue-600">Active Rules</div>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-700">{{ stats.rulesExecuted }}</div>
          <div class="text-sm text-green-600">Rules Executed</div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-yellow-700">{{ stats.ruleViolations }}</div>
          <div class="text-sm text-yellow-600">Violations</div>
        </div>
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-purple-700">{{ Math.round(stats.accuracy * 100) }}%</div>
          <div class="text-sm text-purple-600">Accuracy</div>
        </div>
      </div>

      <!-- Rule Categories -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Rule Categories</h4>
        <div class="grid grid-cols-2 gap-6">
          <!-- Validation Rules -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h5 class="text-sm font-semibold text-gray-900">Validation Rules</h5>
              <button 
                @click="addRule('validation')"
                class="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
              >
                Add Rule
              </button>
            </div>
            <div class="space-y-2">
              <div 
                v-for="rule in validationRules" 
                :key="rule.id"
                class="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">{{ rule.name }}</p>
                  <p class="text-xs text-gray-600">{{ rule.description }}</p>
                </div>
                <div class="flex items-center space-x-2">
                  <label class="flex items-center">
                    <input 
                      v-model="rule.enabled"
                      type="checkbox" 
                      class="rounded border-gray-300 text-blue-600 text-xs"
                    >
                  </label>
                  <button 
                    @click="editRule(rule)"
                    class="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Business Rules -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h5 class="text-sm font-semibold text-gray-900">Business Rules</h5>
              <button 
                @click="addRule('business')"
                class="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded hover:bg-green-200"
              >
                Add Rule
              </button>
            </div>
            <div class="space-y-2">
              <div 
                v-for="rule in businessRules" 
                :key="rule.id"
                class="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">{{ rule.name }}</p>
                  <p class="text-xs text-gray-600">{{ rule.description }}</p>
                </div>
                <div class="flex items-center space-x-2">
                  <label class="flex items-center">
                    <input 
                      v-model="rule.enabled"
                      type="checkbox" 
                      class="rounded border-gray-300 text-green-600 text-xs"
                    >
                  </label>
                  <button 
                    @click="editRule(rule)"
                    class="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rule Builder -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-md font-semibold text-gray-900">Rule Builder</h4>
          <div class="flex items-center space-x-2">
            <select v-model="ruleBuilderMode" class="text-sm border-gray-300 rounded-md">
              <option value="visual">Visual Builder</option>
              <option value="code">Code Editor</option>
              <option value="template">Templates</option>
            </select>
          </div>
        </div>

        <!-- Visual Rule Builder -->
        <div v-if="ruleBuilderMode === 'visual'" class="border rounded-lg p-4">
          <div class="space-y-4">
            <!-- Rule Basic Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-700">Rule Name:</label>
                <input 
                  v-model="newRule.name"
                  type="text"
                  placeholder="Enter rule name..."
                  class="mt-1 w-full text-sm border-gray-300 rounded-md"
                >
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700">Category:</label>
                <select v-model="newRule.category" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="validation">Validation</option>
                  <option value="business">Business</option>
                  <option value="approval">Approval</option>
                  <option value="notification">Notification</option>
                </select>
              </div>
            </div>

            <!-- Rule Conditions -->
            <div class="space-y-3">
              <label class="text-sm font-medium text-gray-700">Conditions:</label>
              <div 
                v-for="(condition, index) in newRule.conditions" 
                :key="index"
                class="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg"
              >
                <select v-model="condition.field" class="text-sm border-gray-300 rounded-md">
                  <option value="">Select field...</option>
                  <option value="amount">Amount</option>
                  <option value="category">Category</option>
                  <option value="employee">Employee</option>
                  <option value="merchant">Merchant</option>
                  <option value="date">Date</option>
                  <option value="receipt_status">Receipt Status</option>
                </select>
                
                <select v-model="condition.operator" class="text-sm border-gray-300 rounded-md">
                  <option value="">Operator...</option>
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="contains">Contains</option>
                  <option value="starts_with">Starts With</option>
                  <option value="is_empty">Is Empty</option>
                </select>
                
                <input 
                  v-model="condition.value"
                  type="text"
                  placeholder="Value..."
                  class="text-sm border-gray-300 rounded-md"
                >
                
                <button 
                  @click="removeCondition(index)"
                  class="p-1 text-red-600 hover:text-red-700"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <button 
                @click="addCondition"
                class="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
              >
                Add Condition
              </button>
            </div>

            <!-- Rule Actions -->
            <div class="space-y-3">
              <label class="text-sm font-medium text-gray-700">Actions:</label>
              <div 
                v-for="(action, index) in newRule.actions" 
                :key="index"
                class="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg"
              >
                <select v-model="action.type" class="text-sm border-gray-300 rounded-md">
                  <option value="">Select action...</option>
                  <option value="approve">Auto Approve</option>
                  <option value="reject">Auto Reject</option>
                  <option value="flag">Flag for Review</option>
                  <option value="notify">Send Notification</option>
                  <option value="assign_category">Assign Category</option>
                  <option value="set_priority">Set Priority</option>
                </select>
                
                <input 
                  v-if="needsActionValue(action.type)"
                  v-model="action.value"
                  type="text"
                  placeholder="Action value..."
                  class="text-sm border-gray-300 rounded-md"
                >
                
                <button 
                  @click="removeAction(index)"
                  class="p-1 text-red-600 hover:text-red-700"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <button 
                @click="addAction"
                class="px-3 py-1 text-sm font-medium text-green-600 bg-green-100 rounded hover:bg-green-200"
              >
                Add Action
              </button>
            </div>

            <!-- Rule Settings -->
            <div class="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label class="text-sm font-medium text-gray-700">Priority:</label>
                <select v-model="newRule.priority" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700">Execution Order:</label>
                <input 
                  v-model.number="newRule.order"
                  type="number"
                  min="1"
                  class="mt-1 w-full text-sm border-gray-300 rounded-md"
                >
              </div>
              <div class="flex items-end">
                <label class="flex items-center">
                  <input 
                    v-model="newRule.enabled"
                    type="checkbox" 
                    class="rounded border-gray-300 text-blue-600"
                  >
                  <span class="ml-2 text-sm text-gray-700">Enabled</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Code Editor -->
        <div v-else-if="ruleBuilderMode === 'code'" class="border rounded-lg p-4">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700">Rule Code (JavaScript):</label>
              <button 
                @click="validateRuleCode"
                class="px-3 py-1 text-sm font-medium text-purple-600 bg-purple-100 rounded hover:bg-purple-200"
              >
                Validate Syntax
              </button>
            </div>
            <textarea 
              v-model="newRule.code"
              rows="12"
              placeholder="// Enter JavaScript rule code here
function evaluateRule(expense) {
  // Rule logic here
  if (expense.amount > 500 && !expense.receipt) {
    return {
      action: 'flag',
      reason: 'High amount expense missing receipt'
    };
  }
  return { action: 'approve' };
}"
              class="w-full text-sm font-mono border-gray-300 rounded-md"
            ></textarea>
            <div v-if="codeValidation.message" :class="codeValidation.isValid ? 'text-green-600' : 'text-red-600'" class="text-sm">
              {{ codeValidation.message }}
            </div>
          </div>
        </div>

        <!-- Templates -->
        <div v-else class="border rounded-lg p-4">
          <div class="space-y-4">
            <label class="text-sm font-medium text-gray-700">Rule Templates:</label>
            <div class="grid grid-cols-2 gap-4">
              <div 
                v-for="template in ruleTemplates" 
                :key="template.id"
                class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                @click="useTemplate(template)"
              >
                <h6 class="text-sm font-medium text-gray-900">{{ template.name }}</h6>
                <p class="text-xs text-gray-600 mt-1">{{ template.description }}</p>
                <div class="flex items-center justify-between mt-2">
                  <span class="text-xs text-gray-500">{{ template.category }}</span>
                  <span class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Use Template</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rule Testing -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Rule Testing</h4>
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="grid grid-cols-2 gap-6">
            <!-- Test Data Input -->
            <div class="space-y-3">
              <label class="text-sm font-medium text-gray-700">Test with sample data:</label>
              <div class="space-y-2">
                <input 
                  v-model="testData.amount"
                  type="number"
                  placeholder="Amount"
                  class="w-full text-sm border-gray-300 rounded-md"
                >
                <input 
                  v-model="testData.category"
                  type="text"
                  placeholder="Category"
                  class="w-full text-sm border-gray-300 rounded-md"
                >
                <input 
                  v-model="testData.merchant"
                  type="text"
                  placeholder="Merchant"
                  class="w-full text-sm border-gray-300 rounded-md"
                >
                <select v-model="testData.receipt_status" class="w-full text-sm border-gray-300 rounded-md">
                  <option value="">Receipt status...</option>
                  <option value="present">Present</option>
                  <option value="missing">Missing</option>
                  <option value="invalid">Invalid</option>
                </select>
              </div>
              <button 
                @click="testRule"
                :disabled="isTestingRule"
                class="w-full px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {{ isTestingRule ? 'Testing...' : 'Test Rule' }}
              </button>
            </div>

            <!-- Test Results -->
            <div class="space-y-3">
              <label class="text-sm font-medium text-gray-700">Test Results:</label>
              <div v-if="testResult" class="p-3 border rounded">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">Rule Evaluation:</span>
                  <span :class="testResult.passed ? 'text-green-600' : 'text-red-600'" class="text-sm">
                    {{ testResult.passed ? 'PASSED' : 'FAILED' }}
                  </span>
                </div>
                <div class="text-sm text-gray-600 space-y-1">
                  <div>Action: {{ testResult.action || 'None' }}</div>
                  <div v-if="testResult.reason">Reason: {{ testResult.reason }}</div>
                  <div v-if="testResult.executionTime">Execution: {{ testResult.executionTime }}ms</div>
                </div>
              </div>
              <div v-else class="p-3 border rounded text-sm text-gray-500 italic">
                Run a test to see results here
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Rules List -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-md font-semibold text-gray-900">Active Rules ({{ activeRulesCount }})</h4>
          <div class="flex items-center space-x-2">
            <button 
              @click="refreshRules"
              :disabled="isProcessing"
              class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg :class="{ 'animate-spin': isProcessing }" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <select v-model="rulesFilter" class="text-sm border-gray-300 rounded-md">
              <option value="all">All Rules</option>
              <option value="enabled">Enabled Only</option>
              <option value="disabled">Disabled Only</option>
              <option value="validation">Validation Rules</option>
              <option value="business">Business Rules</option>
            </select>
          </div>
        </div>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div 
            v-for="rule in filteredRules" 
            :key="rule.id"
            class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <div :class="rule.enabled ? 'bg-green-500' : 'bg-gray-400'" class="w-2 h-2 rounded-full"></div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ rule.name }}</p>
                  <p class="text-xs text-gray-600">{{ rule.description }}</p>
                  <div class="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                    <span class="capitalize">{{ rule.category }}</span>
                    <span>Priority: {{ rule.priority }}</span>
                    <span>Executed: {{ rule.executionCount || 0 }} times</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button 
                @click="duplicateRule(rule)"
                class="p-1 text-blue-600 hover:text-blue-700"
                title="Duplicate"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button 
                @click="editRule(rule)"
                class="p-1 text-gray-600 hover:text-gray-700"
                title="Edit"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button 
                @click="deleteRule(rule.id)"
                class="p-1 text-red-600 hover:text-red-700"
                title="Delete"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-4 border-t">
        <div class="text-sm text-gray-600">
          {{ allRules.length }} total rules • {{ activeRulesCount }} active
        </div>
        
        <div class="flex items-center space-x-3">
          <button 
            @click="clearRule"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Form
          </button>
          <button 
            @click="saveRule"
            :disabled="!canSaveRule || isProcessing"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ editingRule ? 'Update Rule' : 'Save Rule' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'ProcessingRulesEngine',
  props: {
    sessionId: {
      type: String,
      required: true
    }
  },
  emits: ['rule-created', 'rule-updated', 'rule-deleted', 'rule-executed'],
  setup(props, { emit }) {
    // Reactive data
    const engineEnabled = ref(true)
    const engineStatus = ref('')
    const isProcessing = ref(false)
    const isTestingRule = ref(false)
    const ruleBuilderMode = ref('visual')
    const rulesFilter = ref('all')
    const editingRule = ref(null)

    // New rule data
    const newRule = ref({
      name: '',
      category: 'validation',
      conditions: [{ field: '', operator: '', value: '' }],
      actions: [{ type: '', value: '' }],
      priority: 'medium',
      order: 1,
      enabled: true,
      code: ''
    })

    // Test data
    const testData = ref({
      amount: 0,
      category: '',
      merchant: '',
      receipt_status: ''
    })

    const testResult = ref(null)
    const codeValidation = ref({ isValid: false, message: '' })

    // Statistics
    const stats = ref({
      activeRules: 12,
      rulesExecuted: 1456,
      ruleViolations: 89,
      accuracy: 0.94
    })

    // Mock rules data
    const validationRules = ref([
      {
        id: '1',
        name: 'Required Receipt for High Amounts',
        description: 'Expenses over $100 must have receipts',
        enabled: true,
        executionCount: 234
      },
      {
        id: '2',
        name: 'Valid Merchant Names',
        description: 'Merchant names cannot be empty or generic',
        enabled: true,
        executionCount: 567
      }
    ])

    const businessRules = ref([
      {
        id: '3',
        name: 'Auto-Approve Office Supplies',
        description: 'Office supplies under $50 auto-approve',
        enabled: true,
        executionCount: 123
      },
      {
        id: '4',
        name: 'Meal Expense Time Validation',
        description: 'Meal expenses must be during business hours',
        enabled: false,
        executionCount: 45
      }
    ])

    const ruleTemplates = ref([
      {
        id: 't1',
        name: 'Amount Threshold',
        description: 'Flag expenses above specified amount',
        category: 'validation'
      },
      {
        id: 't2',
        name: 'Category Auto-Assignment',
        description: 'Auto-assign category based on merchant',
        category: 'business'
      },
      {
        id: 't3',
        name: 'Approval Workflow',
        description: 'Route to appropriate approver',
        category: 'approval'
      },
      {
        id: 't4',
        name: 'Duplicate Detection',
        description: 'Flag potential duplicate expenses',
        category: 'validation'
      }
    ])

    // Computed properties
    const statusClasses = computed(() => {
      switch (engineStatus.value) {
        case 'Running':
          return 'bg-green-100 text-green-800'
        case 'Error':
          return 'bg-red-100 text-red-800'
        case 'Stopped':
          return 'bg-yellow-100 text-yellow-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    })

    const allRules = computed(() => {
      return [...validationRules.value, ...businessRules.value]
    })

    const activeRulesCount = computed(() => {
      return allRules.value.filter(rule => rule.enabled).length
    })

    const filteredRules = computed(() => {
      let rules = allRules.value

      switch (rulesFilter.value) {
        case 'enabled':
          return rules.filter(rule => rule.enabled)
        case 'disabled':
          return rules.filter(rule => !rule.enabled)
        case 'validation':
          return validationRules.value
        case 'business':
          return businessRules.value
        default:
          return rules
      }
    })

    const canSaveRule = computed(() => {
      return newRule.value.name && 
             newRule.value.category && 
             (newRule.value.conditions.some(c => c.field && c.operator) || newRule.value.code)
    })

    // Methods
    const toggleEngine = () => {
      engineEnabled.value = !engineEnabled.value
      engineStatus.value = engineEnabled.value ? 'Running' : 'Stopped'
    }

    const needsActionValue = (actionType) => {
      return ['notify', 'assign_category', 'set_priority'].includes(actionType)
    }

    const addCondition = () => {
      newRule.value.conditions.push({ field: '', operator: '', value: '' })
    }

    const removeCondition = (index) => {
      newRule.value.conditions.splice(index, 1)
    }

    const addAction = () => {
      newRule.value.actions.push({ type: '', value: '' })
    }

    const removeAction = (index) => {
      newRule.value.actions.splice(index, 1)
    }

    const validateRuleCode = () => {
      try {
        // Basic syntax validation
        if (!newRule.value.code.trim()) {
          codeValidation.value = { isValid: false, message: 'Code cannot be empty' }
          return
        }

        // Try to create function to validate syntax
        new Function('expense', newRule.value.code)
        codeValidation.value = { isValid: true, message: 'Syntax is valid' }
      } catch (error) {
        codeValidation.value = { isValid: false, message: `Syntax error: ${error.message}` }
      }
    }

    const useTemplate = (template) => {
      // Load template into rule builder
      newRule.value.name = template.name
      newRule.value.category = template.category
      
      // Set template-specific defaults
      switch (template.id) {
        case 't1':
          newRule.value.conditions = [
            { field: 'amount', operator: 'greater_than', value: '100' }
          ]
          newRule.value.actions = [
            { type: 'flag', value: '' }
          ]
          break
        case 't2':
          newRule.value.conditions = [
            { field: 'merchant', operator: 'contains', value: 'Office' }
          ]
          newRule.value.actions = [
            { type: 'assign_category', value: 'Office Supplies' }
          ]
          break
      }
    }

    const testRule = async () => {
      if (!canSaveRule.value) return

      isTestingRule.value = true
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Simulate rule evaluation
        const mockResult = {
          passed: true,
          action: 'flag',
          reason: 'Amount exceeds threshold',
          executionTime: 12
        }

        testResult.value = mockResult

      } catch (error) {
        testResult.value = {
          passed: false,
          error: error.message
        }
      } finally {
        isTestingRule.value = false
      }
    }

    const addRule = (category) => {
      clearRule()
      newRule.value.category = category
    }

    const editRule = (rule) => {
      editingRule.value = rule
      // Load rule data into form
      newRule.value = { ...rule }
      if (!newRule.value.conditions) {
        newRule.value.conditions = [{ field: '', operator: '', value: '' }]
      }
      if (!newRule.value.actions) {
        newRule.value.actions = [{ type: '', value: '' }]
      }
    }

    const duplicateRule = (rule) => {
      newRule.value = { 
        ...rule, 
        name: rule.name + ' (Copy)',
        id: undefined,
        enabled: false
      }
      editingRule.value = null
    }

    const deleteRule = async (ruleId) => {
      if (!confirm('Are you sure you want to delete this rule?')) return

      try {
        // Remove from appropriate array
        let index = validationRules.value.findIndex(r => r.id === ruleId)
        if (index !== -1) {
          validationRules.value.splice(index, 1)
        } else {
          index = businessRules.value.findIndex(r => r.id === ruleId)
          if (index !== -1) {
            businessRules.value.splice(index, 1)
          }
        }

        emit('rule-deleted', { ruleId })
        
      } catch (error) {
        console.error('Failed to delete rule:', error)
      }
    }

    const saveRule = async () => {
      if (!canSaveRule.value) return

      isProcessing.value = true
      engineStatus.value = 'Processing'

      try {
        await new Promise(resolve => setTimeout(resolve, 1000))

        const ruleData = {
          ...newRule.value,
          id: editingRule.value?.id || Date.now().toString(),
          createdAt: new Date().toISOString(),
          executionCount: 0
        }

        if (editingRule.value) {
          // Update existing rule
          const targetArray = ruleData.category === 'validation' ? validationRules : businessRules
          const index = targetArray.value.findIndex(r => r.id === editingRule.value.id)
          if (index !== -1) {
            targetArray.value[index] = ruleData
          }
          emit('rule-updated', ruleData)
        } else {
          // Add new rule
          const targetArray = ruleData.category === 'validation' ? validationRules : businessRules
          targetArray.value.push(ruleData)
          emit('rule-created', ruleData)
        }

        clearRule()
        engineStatus.value = 'Complete'

      } catch (error) {
        engineStatus.value = 'Error'
        console.error('Failed to save rule:', error)
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          engineStatus.value = ''
        }, 2000)
      }
    }

    const clearRule = () => {
      newRule.value = {
        name: '',
        category: 'validation',
        conditions: [{ field: '', operator: '', value: '' }],
        actions: [{ type: '', value: '' }],
        priority: 'medium',
        order: 1,
        enabled: true,
        code: ''
      }
      editingRule.value = null
      testResult.value = null
      codeValidation.value = { isValid: false, message: '' }
    }

    const refreshRules = async () => {
      isProcessing.value = true
      
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        // In real implementation, fetch rules from API
        
      } finally {
        isProcessing.value = false
      }
    }

    onMounted(() => {
      engineStatus.value = 'Running'
    })

    return {
      // Reactive data
      engineEnabled,
      engineStatus,
      isProcessing,
      isTestingRule,
      ruleBuilderMode,
      rulesFilter,
      editingRule,
      newRule,
      testData,
      testResult,
      codeValidation,
      stats,
      validationRules,
      businessRules,
      ruleTemplates,

      // Computed
      statusClasses,
      allRules,
      activeRulesCount,
      filteredRules,
      canSaveRule,

      // Methods
      toggleEngine,
      needsActionValue,
      addCondition,
      removeCondition,
      addAction,
      removeAction,
      validateRuleCode,
      useTemplate,
      testRule,
      addRule,
      editRule,
      duplicateRule,
      deleteRule,
      saveRule,
      clearRule,
      refreshRules
    }
  }
}
</script>