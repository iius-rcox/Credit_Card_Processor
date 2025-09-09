<template>
  <div
    class="employee-card border rounded-lg p-4 hover:shadow-md transition-shadow"
  >
    <div class="flex items-start justify-between">
      <!-- Selection Checkbox -->
      <div v-if="showSelection" class="flex-shrink-0 mr-3">
        <input
          type="checkbox"
          :checked="isSelected"
          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          @change="$emit('select', employee.revision_id)"
        />
      </div>

      <!-- Employee Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="flex items-center space-x-2 mb-1">
              <h4 class="text-lg font-semibold text-gray-900">
                {{ formatEmployeeName(employee) }}
              </h4>
              <!-- Delta Change Indicator -->
              <div v-if="employee.delta_change" class="flex items-center">
                <span 
                  v-if="employee.delta_change === 'new'" 
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  title="New employee in this session"
                >
                  🆕 New
                </span>
                <span 
                  v-else-if="employee.delta_change === 'modified'" 
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  title="Changes detected compared to baseline"
                >
                  📝 Modified
                </span>
                <span 
                  v-else-if="employee.delta_change === 'removed'" 
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                  title="No longer present in current data"
                >
                  ❌ Removed
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-4 text-sm text-gray-600">
              <span>{{ employee.department }}</span>
              <span v-if="employee.position">{{ employee.position }}</span>
            </div>
          </div>

          <!-- Status Badge -->
          <div class="flex-shrink-0">
            <StatusBadge :status="employee.validation_status" />
          </div>
        </div>

        <!-- Financial Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <!-- CAR Amount -->
          <div class="bg-blue-50 p-3 rounded-lg">
            <div
              class="text-xs text-blue-600 font-medium uppercase tracking-wide"
            >
              CAR Amount
            </div>
            <div class="text-lg font-bold text-blue-900">
              {{ formatCurrency(employee.car_amount) }}
            </div>
          </div>

          <!-- Receipt Amount -->
          <div class="bg-green-50 p-3 rounded-lg">
            <div
              class="text-xs text-green-600 font-medium uppercase tracking-wide"
            >
              Receipt Amount
            </div>
            <div class="text-lg font-bold text-green-900">
              {{ formatCurrency(employee.receipt_amount) }}
            </div>
          </div>
        </div>

        <!-- Variance Display -->
        <div v-if="hasVariance" class="mb-4">
          <div
            class="flex items-center justify-between p-3 rounded-lg"
            :class="varianceClasses"
          >
            <div>
              <div class="text-xs font-medium uppercase tracking-wide">
                Variance
              </div>
              <div class="text-sm font-semibold">
                {{ formatCurrency(Math.abs(variance)) }}
                <span class="text-xs">({{ variancePercentage }}%)</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs">
                {{ variance > 0 ? 'CAR Higher' : 'Receipt Higher' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Processing Metadata -->
        <div class="text-xs text-gray-500 mb-3">
          <span>Processed: {{ formatDate(employee.created_at) }}</span>
          <span v-if="employee.processing_duration" class="ml-4"
            >Duration: {{ employee.processing_duration }}</span
          >
        </div>

        <!-- Validation Issues -->
        <div v-if="hasValidationFlags" class="mb-4">
          <ValidationFlags :flags="employee.validation_flags" />
        </div>

        <!-- Actions -->
        <div
          class="flex items-center justify-between pt-3 border-t border-gray-200"
        >
          <div class="flex items-center space-x-2">
            <!-- Resolution Status -->
            <div v-if="employee.resolved_at" class="text-xs text-blue-600">
              <svg
                class="inline w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              Resolved {{ formatDate(employee.resolved_at) }}
            </div>
          </div>

          <div class="flex items-center space-x-2">

            <!-- Resolve Button -->
            <button
              v-if="canResolve"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              @click="$emit('resolve', employee)"
            >
              {{
                employee.validation_status === 'RESOLVED'
                  ? 'Re-resolve'
                  : 'Resolve'
              }}
            </button>
          </div>
        </div>

        <!-- Detailed Information -->
        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <!-- Employee Details -->
            <div>
              <h5 class="font-medium text-gray-900 mb-2">Employee Details</h5>
              <div class="space-y-1 text-gray-600">
                <div>
                  <span class="font-medium">Full Name:</span>
                  {{ employee.employee_name }}
                </div>
                <div>
                  <span class="font-medium">Employee ID:</span>
                  {{ employee.employee_id }}
                </div>
                <div>
                  <span class="font-medium">Department:</span>
                  {{ employee.department }}
                </div>
                <div v-if="employee.position">
                  <span class="font-medium">Position:</span>
                  {{ employee.position }}
                </div>
                <div v-if="employee.manager">
                  <span class="font-medium">Manager:</span>
                  {{ employee.manager }}
                </div>
              </div>
            </div>

            <!-- Financial Details -->
            <div>
              <h5 class="font-medium text-gray-900 mb-2">Financial Details</h5>
              <div class="space-y-1 text-gray-600">
                <div>
                  <span class="font-medium">CAR Amount:</span>
                  {{ formatCurrency(employee.car_amount) }}
                </div>
                <div>
                  <span class="font-medium">Receipt Amount:</span>
                  {{ formatCurrency(employee.receipt_amount) }}
                </div>
                <div v-if="hasVariance">
                  <span class="font-medium">Variance:</span>
                  {{ formatCurrency(Math.abs(variance)) }}
                </div>
                <div v-if="employee.policy_limit">
                  <span class="font-medium">Policy Limit:</span>
                  {{ formatCurrency(employee.policy_limit) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Delta Comparison Details -->
          <div v-if="employee.delta_comparison" class="mt-4">
            <h5 class="font-medium text-gray-900 mb-2">Delta Comparison</h5>
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div class="font-medium text-purple-900 mb-2">Previous Values</div>
                  <div class="space-y-1 text-gray-700">
                    <div v-if="employee.delta_comparison.previous_car_amount">
                      <span class="font-medium">CAR:</span>
                      {{ formatCurrency(employee.delta_comparison.previous_car_amount) }}
                    </div>
                    <div v-if="employee.delta_comparison.previous_receipt_amount">
                      <span class="font-medium">Receipt:</span>
                      {{ formatCurrency(employee.delta_comparison.previous_receipt_amount) }}
                    </div>
                    <div v-if="employee.delta_comparison.previous_department">
                      <span class="font-medium">Department:</span>
                      {{ employee.delta_comparison.previous_department }}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div class="font-medium text-purple-900 mb-2">Current Values</div>
                  <div class="space-y-1 text-gray-700">
                    <div>
                      <span class="font-medium">CAR:</span>
                      {{ formatCurrency(employee.car_amount) }}
                    </div>
                    <div>
                      <span class="font-medium">Receipt:</span>
                      {{ formatCurrency(employee.receipt_amount) }}
                    </div>
                    <div>
                      <span class="font-medium">Department:</span>
                      {{ employee.department }}
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-if="employee.delta_comparison.changed_fields" class="mt-3 pt-3 border-t border-purple-200">
                <div class="font-medium text-purple-900 text-xs mb-1">Changed Fields:</div>
                <div class="flex flex-wrap gap-1">
                  <span 
                    v-for="field in employee.delta_comparison.changed_fields" 
                    :key="field"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                  >
                    {{ formatFieldName(field) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Resolution History -->
          <div v-if="employee.resolution_history?.length" class="mt-4">
            <h5 class="font-medium text-gray-900 mb-2">Resolution History</h5>
            <div class="space-y-2">
              <div
                v-for="resolution in employee.resolution_history"
                :key="resolution.id"
                class="p-2 bg-gray-50 rounded text-sm"
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium">{{ resolution.action }}</span>
                  <span class="text-gray-500">{{
                    formatDate(resolution.created_at)
                  }}</span>
                </div>
                <div v-if="resolution.notes" class="text-gray-600 mt-1">
                  {{ resolution.notes }}
                </div>
                <div class="text-gray-500 text-xs mt-1">
                  by {{ resolution.resolved_by }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import ValidationFlags from './ValidationFlags.vue'

// Props
const props = defineProps({
  employee: {
    type: Object,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
  showSelection: {
    type: Boolean,
    default: false,
  },
})

// Emits
defineEmits(['select', 'resolve'])

// State removed - always show details

// Computed Properties
const variance = computed(() => {
  return (props.employee.car_amount || 0) - (props.employee.receipt_amount || 0)
})

const hasVariance = computed(() => {
  return Math.abs(variance.value) > 0.01 // Account for floating point precision
})

const variancePercentage = computed(() => {
  const base = props.employee.car_amount || 0
  if (base === 0) return '0.00'
  return Math.abs((variance.value / base) * 100).toFixed(2)
})

const varianceClasses = computed(() => {
  if (!hasVariance.value) return 'bg-green-50 text-green-800'

  const percentage = parseFloat(variancePercentage.value)
  if (percentage < 1) return 'bg-yellow-50 text-yellow-800'
  if (percentage < 5) return 'bg-orange-50 text-orange-800'
  return 'bg-red-50 text-red-800'
})

const hasValidationFlags = computed(() => {
  // Check if validation_flags exists and is either a non-empty string or a non-empty object
  const flags = props.employee.validation_flags
  
  if (!flags) {
    return false
  }
  
  // Handle string validation flags (e.g., "NEEDS_ATTENTION")
  if (typeof flags === 'string') {
    return flags.trim().length > 0
  }
  
  // Handle object validation flags
  if (typeof flags === 'object' && !Array.isArray(flags)) {
    return Object.keys(flags).length > 0
  }
  
  return false
})

const canResolve = computed(() => {
  return (
    props.employee.validation_status === 'NEEDS_ATTENTION' ||
    props.employee.validation_status === 'RESOLVED'
  )
})

// Methods
function formatEmployeeName(employee) {
  const name = employee.employee_name || 'Unknown'
  const id = employee.employee_id || 'N/A'
  return `${name} (${id})`
}

function formatCurrency(amount) {
  if (amount == null || amount === '') return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount))
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    return 'Invalid Date'
  }
}

function formatFieldName(fieldName) {
  if (!fieldName) return ''
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>

<style scoped>
.employee-card {
  @apply bg-white border-gray-200;
}

.employee-card:hover {
  @apply border-blue-200;
}

/* Smooth transitions */
.employee-card * {
  transition: all 0.2s ease;
}

/* Selection state */
.employee-card.selected {
  @apply border-blue-400 bg-blue-50;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .employee-card .grid {
    @apply grid-cols-1;
  }
}
</style>
