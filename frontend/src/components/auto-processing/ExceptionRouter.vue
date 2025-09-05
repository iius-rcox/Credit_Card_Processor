<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Exception Handling & Routing</h3>
          <p class="text-sm text-gray-600 mt-1">
            Automated flagging, routing, and resolution of processing exceptions
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="routingStatus" :class="statusClasses" class="px-2 py-1 rounded-full text-xs font-medium">
            {{ routingStatus }}
          </span>
          <button 
            @click="toggleAutoRouting"
            :class="[
              'px-3 py-1 text-sm font-medium rounded-md transition-colors',
              autoRouting 
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Auto-Route: {{ autoRouting ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Exception Dashboard -->
      <div class="grid grid-cols-5 gap-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-red-700">{{ dashboard.critical }}</div>
          <div class="text-sm text-red-600">Critical</div>
        </div>
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-orange-700">{{ dashboard.high }}</div>
          <div class="text-sm text-orange-600">High Priority</div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-yellow-700">{{ dashboard.medium }}</div>
          <div class="text-sm text-yellow-600">Medium Priority</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-700">{{ dashboard.resolved }}</div>
          <div class="text-sm text-blue-600">Resolved</div>
        </div>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-gray-700">{{ Math.round(dashboard.resolutionRate * 100) }}%</div>
          <div class="text-sm text-gray-600">Resolution Rate</div>
        </div>
      </div>

      <!-- Exception Types Configuration -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Exception Types & Routing Rules</h4>
        <div class="grid grid-cols-2 gap-6">
          <!-- Exception Types -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">Exception Types:</label>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div 
                v-for="exceptionType in exceptionTypes" 
                :key="exceptionType.id"
                class="flex items-center justify-between p-3 border rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <div :class="getSeverityClasses(exceptionType.severity)" class="w-3 h-3 rounded-full"></div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ exceptionType.name }}</p>
                    <p class="text-xs text-gray-600">{{ exceptionType.description }}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">{{ exceptionType.count }} active</span>
                  <button 
                    @click="editExceptionType(exceptionType)"
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

          <!-- Routing Rules -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">Routing Rules:</label>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div 
                v-for="rule in routingRules" 
                :key="rule.id"
                class="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ rule.name }}</p>
                  <p class="text-xs text-gray-600">{{ rule.condition }} → {{ rule.action }}</p>
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
                    @click="editRoutingRule(rule)"
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

      <!-- Active Exceptions Queue -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-md font-semibold text-gray-900">Active Exceptions</h4>
          <div class="flex items-center space-x-2">
            <select v-model="exceptionFilter" class="text-sm border-gray-300 rounded-md">
              <option value="all">All Exceptions</option>
              <option value="critical">Critical Only</option>
              <option value="unassigned">Unassigned</option>
              <option value="overdue">Overdue</option>
              <option value="my-queue">My Queue</option>
            </select>
            <button 
              @click="refreshExceptions"
              :disabled="isProcessing"
              class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg :class="{ 'animate-spin': isProcessing }" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div 
            v-for="exception in filteredExceptions" 
            :key="exception.id"
            class="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between">
              <!-- Exception Details -->
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <div :class="getSeverityClasses(exception.severity)" class="w-4 h-4 rounded-full"></div>
                  <h5 class="text-sm font-semibold text-gray-900">{{ exception.title }}</h5>
                  <span :class="getStatusClasses(exception.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                    {{ exception.status }}
                  </span>
                  <span v-if="isOverdue(exception)" class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    Overdue
                  </span>
                </div>
                
                <p class="text-sm text-gray-600 mb-2">{{ exception.description }}</p>
                
                <div class="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Type: {{ exception.type }}</span>
                  <span>Employee: {{ exception.employee }}</span>
                  <span>Amount: {{ formatCurrency(exception.amount) }}</span>
                  <span>Created: {{ formatDate(exception.created_at) }}</span>
                  <span v-if="exception.assigned_to">Assigned: {{ exception.assigned_to }}</span>
                </div>

                <!-- Exception Context -->
                <div v-if="exception.context" class="mt-3 p-2 bg-gray-100 rounded text-sm">
                  <div class="grid grid-cols-2 gap-4">
                    <div v-for="(value, key) in exception.context" :key="key">
                      <span class="font-medium text-gray-700">{{ formatContextKey(key) }}:</span>
                      <span class="text-gray-600 ml-1">{{ value }}</span>
                    </div>
                  </div>
                </div>

                <!-- Resolution History -->
                <div v-if="exception.resolution_history?.length" class="mt-3">
                  <button 
                    @click="toggleHistory(exception.id)"
                    class="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <svg 
                      :class="{ 'rotate-180': expandedHistory.has(exception.id) }"
                      class="w-3 h-3 transition-transform"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>{{ exception.resolution_history.length }} resolution attempt(s)</span>
                  </button>
                  
                  <div v-if="expandedHistory.has(exception.id)" class="mt-2 pl-4 border-l-2 border-gray-200">
                    <div 
                      v-for="(attempt, index) in exception.resolution_history" 
                      :key="index"
                      class="text-xs text-gray-600 mb-2"
                    >
                      <div class="font-medium">{{ formatDate(attempt.timestamp) }} - {{ attempt.action }}</div>
                      <div>{{ attempt.details }}</div>
                      <div v-if="attempt.user" class="text-gray-500">By: {{ attempt.user }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex flex-col items-end space-y-2 ml-4">
                <div class="flex items-center space-x-2">
                  <button 
                    @click="assignToMe(exception.id)"
                    :disabled="exception.assigned_to"
                    class="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ exception.assigned_to ? 'Assigned' : 'Take' }}
                  </button>
                  <button 
                    @click="escalateException(exception.id)"
                    class="px-3 py-1 text-xs font-medium text-orange-600 bg-orange-100 rounded hover:bg-orange-200"
                  >
                    Escalate
                  </button>
                </div>
                
                <div class="flex items-center space-x-2">
                  <button 
                    @click="resolveException(exception.id)"
                    class="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded hover:bg-green-200"
                  >
                    Resolve
                  </button>
                  <button 
                    @click="viewExceptionDetails(exception)"
                    class="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Details
                  </button>
                </div>
                
                <!-- Priority Actions -->
                <div class="flex items-center space-x-1">
                  <button 
                    @click="changePriority(exception.id, 'critical')"
                    :class="exception.severity === 'critical' ? 'bg-red-200' : 'bg-red-100'"
                    class="p-1 text-red-600 rounded hover:bg-red-200"
                    title="Set Critical"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </button>
                  <button 
                    @click="changePriority(exception.id, 'high')"
                    :class="exception.severity === 'high' ? 'bg-orange-200' : 'bg-orange-100'"
                    class="p-1 text-orange-600 rounded hover:bg-orange-200"
                    title="Set High"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                  <button 
                    @click="changePriority(exception.id, 'medium')"
                    :class="exception.severity === 'medium' ? 'bg-yellow-200' : 'bg-yellow-100'"
                    class="p-1 text-yellow-600 rounded hover:bg-yellow-200"
                    title="Set Medium"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredExceptions.length === 0" class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="mt-2 text-sm text-gray-600">No exceptions match your current filter</p>
        </div>
      </div>

      <!-- Automated Resolution -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Automated Resolution</h4>
        <div class="grid grid-cols-2 gap-6">
          <!-- Resolution Strategies -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">Resolution Strategies:</label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input 
                  v-model="autoResolution.retryFailedProcessing"
                  type="checkbox" 
                  class="rounded border-gray-300 text-blue-600"
                >
                <span class="ml-2 text-sm text-gray-700">Auto-retry failed processing</span>
              </label>
              <label class="flex items-center">
                <input 
                  v-model="autoResolution.applyDefaultValues"
                  type="checkbox" 
                  class="rounded border-gray-300 text-blue-600"
                >
                <span class="ml-2 text-sm text-gray-700">Apply default values for missing data</span>
              </label>
              <label class="flex items-center">
                <input 
                  v-model="autoResolution.escalateAfterRetries"
                  type="checkbox" 
                  class="rounded border-gray-300 text-blue-600"
                >
                <span class="ml-2 text-sm text-gray-700">Escalate after max retries</span>
              </label>
              <label class="flex items-center">
                <input 
                  v-model="autoResolution.notifyOnCritical"
                  type="checkbox" 
                  class="rounded border-gray-300 text-blue-600"
                >
                <span class="ml-2 text-sm text-gray-700">Immediate notification for critical exceptions</span>
              </label>
            </div>
          </div>

          <!-- Resolution Settings -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700">Resolution Settings:</label>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-gray-600">Max Retry Attempts:</label>
                <input 
                  v-model.number="autoResolution.maxRetries"
                  type="number"
                  min="1"
                  max="10"
                  class="mt-1 w-full text-sm border-gray-300 rounded-md"
                >
              </div>
              <div>
                <label class="text-xs text-gray-600">Retry Delay (minutes):</label>
                <input 
                  v-model.number="autoResolution.retryDelay"
                  type="number"
                  min="1"
                  max="60"
                  class="mt-1 w-full text-sm border-gray-300 rounded-md"
                >
              </div>
              <div>
                <label class="text-xs text-gray-600">Auto-Escalation Time (hours):</label>
                <input 
                  v-model.number="autoResolution.escalationTime"
                  type="number"
                  min="1"
                  max="48"
                  class="mt-1 w-full text-sm border-gray-300 rounded-md"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Analytics -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Performance Analytics</h4>
        <div class="grid grid-cols-3 gap-6">
          <!-- Resolution Times -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 mb-2">Average Resolution Time</h5>
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">Critical:</span>
                <span class="font-medium">{{ analytics.avgResolutionTime.critical }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">High:</span>
                <span class="font-medium">{{ analytics.avgResolutionTime.high }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">Medium:</span>
                <span class="font-medium">{{ analytics.avgResolutionTime.medium }}</span>
              </div>
            </div>
          </div>

          <!-- Exception Trends -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 mb-2">Exception Trends (7 days)</h5>
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">New Exceptions:</span>
                <span class="font-medium text-red-600">↑ {{ analytics.trends.newExceptions }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">Resolved:</span>
                <span class="font-medium text-green-600">↑ {{ analytics.trends.resolved }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">Auto-Resolved:</span>
                <span class="font-medium text-blue-600">{{ analytics.trends.autoResolved }}%</span>
              </div>
            </div>
          </div>

          <!-- Top Exception Types -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 mb-2">Most Common Types</h5>
            <div class="space-y-2">
              <div 
                v-for="type in analytics.topTypes" 
                :key="type.name"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-600">{{ type.name }}:</span>
                <span class="font-medium">{{ type.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-4 border-t">
        <div class="text-sm text-gray-600">
          {{ activeExceptionsCount }} active exceptions • 
          {{ unassignedCount }} unassigned
        </div>
        
        <div class="flex items-center space-x-3">
          <button 
            @click="runAutoResolution"
            :disabled="isProcessing || !autoRouting"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isProcessing" class="flex items-center space-x-2">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
            <span v-else>Run Auto-Resolution</span>
          </button>
          <button 
            @click="generateReport"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'ExceptionRouter',
  props: {
    sessionId: {
      type: String,
      required: true
    }
  },
  emits: ['exception-resolved', 'exception-escalated', 'exception-assigned', 'auto-resolution-completed'],
  setup(props, { emit }) {
    // Reactive data
    const autoRouting = ref(true)
    const routingStatus = ref('')
    const isProcessing = ref(false)
    const exceptionFilter = ref('all')
    const expandedHistory = ref(new Set())

    // Dashboard data
    const dashboard = ref({
      critical: 3,
      high: 12,
      medium: 28,
      resolved: 156,
      resolutionRate: 0.89
    })

    // Auto-resolution settings
    const autoResolution = ref({
      retryFailedProcessing: true,
      applyDefaultValues: true,
      escalateAfterRetries: true,
      notifyOnCritical: true,
      maxRetries: 3,
      retryDelay: 5,
      escalationTime: 2
    })

    // Analytics data
    const analytics = ref({
      avgResolutionTime: {
        critical: '2.3 hours',
        high: '4.7 hours',
        medium: '1.2 days'
      },
      trends: {
        newExceptions: 23,
        resolved: 45,
        autoResolved: 67
      },
      topTypes: [
        { name: 'Missing Receipt', count: 45 },
        { name: 'Data Mismatch', count: 32 },
        { name: 'Policy Violation', count: 28 }
      ]
    })

    // Exception types configuration
    const exceptionTypes = ref([
      {
        id: '1',
        name: 'Missing Receipt',
        description: 'Expense without required receipt documentation',
        severity: 'high',
        count: 45
      },
      {
        id: '2',
        name: 'Data Mismatch',
        description: 'CAR vs Receipt data inconsistencies',
        severity: 'medium',
        count: 32
      },
      {
        id: '3',
        name: 'Policy Violation',
        description: 'Expense exceeds policy limits',
        severity: 'critical',
        count: 8
      },
      {
        id: '4',
        name: 'Duplicate Expense',
        description: 'Potential duplicate expense detected',
        severity: 'medium',
        count: 15
      }
    ])

    // Routing rules
    const routingRules = ref([
      {
        id: '1',
        name: 'Critical Auto-Escalate',
        condition: 'Severity = Critical',
        action: 'Escalate to Manager',
        enabled: true
      },
      {
        id: '2',
        name: 'High Amount Review',
        condition: 'Amount > $500',
        action: 'Route to Senior Reviewer',
        enabled: true
      },
      {
        id: '3',
        name: 'Missing Receipt Auto-Flag',
        condition: 'Receipt = Missing',
        action: 'Flag for Document Upload',
        enabled: false
      }
    ])

    // Active exceptions
    const exceptions = ref([
      {
        id: '1',
        title: 'Missing Receipt for High-Value Expense',
        description: 'Expense of $347.50 submitted without receipt documentation',
        type: 'Missing Receipt',
        severity: 'critical',
        status: 'open',
        employee: 'John Doe',
        amount: 347.50,
        created_at: '2024-03-15T10:30:00Z',
        assigned_to: null,
        context: {
          merchant: 'Tech Conference Inc',
          category: 'Training',
          expense_date: '2024-03-14'
        },
        resolution_history: [
          {
            timestamp: '2024-03-15T11:00:00Z',
            action: 'Auto-flagged for review',
            details: 'System detected missing receipt for amount over $100',
            user: 'System'
          }
        ]
      },
      {
        id: '2',
        title: 'CAR vs Receipt Amount Mismatch',
        description: 'CAR shows $125.00 but receipt shows $127.50',
        type: 'Data Mismatch',
        severity: 'high',
        status: 'assigned',
        employee: 'Jane Smith',
        amount: 125.00,
        created_at: '2024-03-15T09:15:00Z',
        assigned_to: 'Reviewer A',
        context: {
          merchant: 'Restaurant ABC',
          category: 'Business Meals',
          car_amount: 125.00,
          receipt_amount: 127.50
        }
      },
      {
        id: '3',
        title: 'Policy Limit Exceeded',
        description: 'Meal expense of $89.99 exceeds daily limit of $75',
        type: 'Policy Violation',
        severity: 'medium',
        status: 'in_progress',
        employee: 'Mike Johnson',
        amount: 89.99,
        created_at: '2024-03-14T16:45:00Z',
        assigned_to: 'Policy Team'
      }
    ])

    // Computed properties
    const statusClasses = computed(() => {
      switch (routingStatus.value) {
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

    const filteredExceptions = computed(() => {
      let filtered = exceptions.value

      switch (exceptionFilter.value) {
        case 'critical':
          return filtered.filter(ex => ex.severity === 'critical')
        case 'unassigned':
          return filtered.filter(ex => !ex.assigned_to)
        case 'overdue':
          return filtered.filter(ex => isOverdue(ex))
        case 'my-queue':
          return filtered.filter(ex => ex.assigned_to === 'Current User')
        default:
          return filtered
      }
    })

    const activeExceptionsCount = computed(() => {
      return exceptions.value.filter(ex => ex.status !== 'resolved').length
    })

    const unassignedCount = computed(() => {
      return exceptions.value.filter(ex => !ex.assigned_to && ex.status !== 'resolved').length
    })

    // Methods
    const getSeverityClasses = (severity) => {
      const classes = {
        'critical': 'bg-red-500',
        'high': 'bg-orange-500',
        'medium': 'bg-yellow-500',
        'low': 'bg-green-500'
      }
      return classes[severity] || 'bg-gray-500'
    }

    const getStatusClasses = (status) => {
      const classes = {
        'open': 'bg-red-100 text-red-800',
        'assigned': 'bg-yellow-100 text-yellow-800',
        'in_progress': 'bg-blue-100 text-blue-800',
        'resolved': 'bg-green-100 text-green-800'
      }
      return classes[status] || 'bg-gray-100 text-gray-800'
    }

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const formatContextKey = (key) => {
      return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const isOverdue = (exception) => {
      const now = new Date()
      const created = new Date(exception.created_at)
      const hoursDiff = (now - created) / (1000 * 60 * 60)
      
      // Define overdue thresholds by severity
      const thresholds = {
        'critical': 2,
        'high': 8,
        'medium': 24,
        'low': 48
      }
      
      return hoursDiff > thresholds[exception.severity]
    }

    const toggleAutoRouting = () => {
      autoRouting.value = !autoRouting.value
      routingStatus.value = autoRouting.value ? 'Active' : 'Paused'
    }

    const toggleHistory = (exceptionId) => {
      if (expandedHistory.value.has(exceptionId)) {
        expandedHistory.value.delete(exceptionId)
      } else {
        expandedHistory.value.add(exceptionId)
      }
    }

    const assignToMe = async (exceptionId) => {
      try {
        const exception = exceptions.value.find(ex => ex.id === exceptionId)
        if (exception) {
          exception.assigned_to = 'Current User'
          exception.status = 'assigned'
          
          emit('exception-assigned', {
            exceptionId,
            assignedTo: 'Current User'
          })
        }
      } catch (error) {
        console.error('Failed to assign exception:', error)
      }
    }

    const escalateException = async (exceptionId) => {
      try {
        const exception = exceptions.value.find(ex => ex.id === exceptionId)
        if (exception) {
          exception.severity = 'critical'
          exception.assigned_to = 'Manager'
          
          emit('exception-escalated', {
            exceptionId,
            escalatedTo: 'Manager'
          })
        }
      } catch (error) {
        console.error('Failed to escalate exception:', error)
      }
    }

    const resolveException = async (exceptionId) => {
      try {
        const exception = exceptions.value.find(ex => ex.id === exceptionId)
        if (exception) {
          exception.status = 'resolved'
          dashboard.value.resolved += 1
          
          emit('exception-resolved', {
            exceptionId,
            resolutionMethod: 'manual'
          })
        }
      } catch (error) {
        console.error('Failed to resolve exception:', error)
      }
    }

    const changePriority = async (exceptionId, newSeverity) => {
      try {
        const exception = exceptions.value.find(ex => ex.id === exceptionId)
        if (exception) {
          exception.severity = newSeverity
          
          // Update dashboard counts
          dashboard.value[newSeverity] = (dashboard.value[newSeverity] || 0) + 1
        }
      } catch (error) {
        console.error('Failed to change priority:', error)
      }
    }

    const viewExceptionDetails = (exception) => {
      // Emit event to show exception details modal
      emit('view-exception-details', exception)
    }

    const editExceptionType = (exceptionType) => {
      // Open exception type editor
      console.log('Edit exception type:', exceptionType)
    }

    const editRoutingRule = (rule) => {
      // Open routing rule editor
      console.log('Edit routing rule:', rule)
    }

    const refreshExceptions = async () => {
      isProcessing.value = true
      routingStatus.value = 'Processing'
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        routingStatus.value = 'Complete'
      } catch (error) {
        routingStatus.value = 'Error'
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          routingStatus.value = ''
        }, 2000)
      }
    }

    const runAutoResolution = async () => {
      if (!autoRouting.value) return

      isProcessing.value = true
      routingStatus.value = 'Processing'

      try {
        // Simulate auto-resolution process
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Mock resolution of some exceptions
        let resolved = 0
        exceptions.value.forEach(exception => {
          if (exception.severity === 'medium' && Math.random() > 0.5) {
            exception.status = 'resolved'
            resolved++
          }
        })

        dashboard.value.resolved += resolved
        routingStatus.value = 'Complete'
        
        emit('auto-resolution-completed', {
          resolvedCount: resolved,
          totalProcessed: exceptions.value.length
        })

      } catch (error) {
        routingStatus.value = 'Error'
        console.error('Auto-resolution failed:', error)
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          routingStatus.value = ''
        }, 2000)
      }
    }

    const generateReport = () => {
      // Generate exception handling report
      const reportData = {
        dashboard: dashboard.value,
        analytics: analytics.value,
        exceptions: exceptions.value
      }
      
      console.log('Generating report with data:', reportData)
      // In real implementation, generate and download report
    }

    onMounted(() => {
      routingStatus.value = 'Active'
    })

    return {
      // Reactive data
      autoRouting,
      routingStatus,
      isProcessing,
      exceptionFilter,
      expandedHistory,
      dashboard,
      autoResolution,
      analytics,
      exceptionTypes,
      routingRules,
      exceptions,

      // Computed
      statusClasses,
      filteredExceptions,
      activeExceptionsCount,
      unassignedCount,

      // Methods
      getSeverityClasses,
      getStatusClasses,
      formatCurrency,
      formatDate,
      formatContextKey,
      isOverdue,
      toggleAutoRouting,
      toggleHistory,
      assignToMe,
      escalateException,
      resolveException,
      changePriority,
      viewExceptionDetails,
      editExceptionType,
      editRoutingRule,
      refreshExceptions,
      runAutoResolution,
      generateReport
    }
  }
}
</script>