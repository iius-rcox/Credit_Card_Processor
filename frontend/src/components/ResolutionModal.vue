<template>
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <!-- Background overlay -->
    <div
      class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
    >
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        aria-hidden="true"
        @click="$emit('close')"
      ></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
      >
        <!-- Header -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100"
              >
                <svg
                  class="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div class="ml-4">
                <h3
                  id="modal-title"
                  class="text-lg leading-6 font-medium text-gray-900"
                >
                  Resolve Issue
                </h3>
                <p class="text-sm text-gray-500">
                  {{ employee.employee_name }} ({{ employee.employee_id }})
                </p>
              </div>
            </div>
            <button
              class="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              @click="$emit('close')"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="bg-gray-50 px-4 py-5 sm:p-6">
          <!-- Employee Summary -->
          <div class="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3">
              Employee Information
            </h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Name:</span>
                <span class="ml-2 font-medium">{{
                  employee.employee_name
                }}</span>
              </div>
              <div>
                <span class="text-gray-500">ID:</span>
                <span class="ml-2 font-medium">{{ employee.employee_id }}</span>
              </div>
              <div>
                <span class="text-gray-500">Department:</span>
                <span class="ml-2">{{ employee.department }}</span>
              </div>
              <div>
                <span class="text-gray-500">Status:</span>
                <span class="ml-2">
                  <StatusBadge :status="employee.validation_status" size="xs" />
                </span>
              </div>
            </div>
          </div>

          <!-- Financial Summary -->
          <div class="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3">
              Financial Details
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-3 bg-blue-50 rounded">
                <div class="text-xs text-blue-600 font-medium">CAR Amount</div>
                <div class="text-lg font-bold text-blue-900">
                  {{ formatCurrency(employee.car_amount) }}
                </div>
              </div>
              <div class="text-center p-3 bg-green-50 rounded">
                <div class="text-xs text-green-600 font-medium">
                  Receipt Amount
                </div>
                <div class="text-lg font-bold text-green-900">
                  {{ formatCurrency(employee.receipt_amount) }}
                </div>
              </div>
            </div>
            <div
              v-if="hasVariance"
              class="mt-3 text-center p-2 bg-yellow-50 rounded"
            >
              <div class="text-xs text-yellow-600 font-medium">Variance</div>
              <div class="text-sm font-semibold text-yellow-900">
                {{ formatCurrency(Math.abs(variance)) }} ({{
                  variancePercentage
                }}%)
              </div>
            </div>
          </div>

          <!-- Validation Issues -->
          <div v-if="hasValidationFlags" class="mb-6">
            <ValidationFlags :flags="employee.validation_flags" />
          </div>

          <!-- Resolution Form -->
          <form @submit.prevent="handleResolve">
            <!-- Resolution Action -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Resolution Action</label
              >
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="form.action"
                    type="radio"
                    value="mark_resolved"
                    class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span class="ml-2 text-sm text-gray-900"
                    >Mark as Resolved</span
                  >
                </label>
                <label class="flex items-center">
                  <input
                    v-model="form.action"
                    type="radio"
                    value="flag_followup"
                    class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span class="ml-2 text-sm text-gray-900"
                    >Flag for Follow-up</span
                  >
                </label>
              </div>
            </div>


            <!-- Resolution Notes -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes
                <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="form.notes"
                rows="4"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the resolution details, actions taken, or reasons for the decision..."
              ></textarea>
            </div>

            <!-- Priority Level -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Priority Level</label
              >
              <select
                v-model="form.priority"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <!-- Action Buttons -->
            <div
              class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200"
            >
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="$emit('close')"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!form.action || !form.notes.trim() || isSubmitting"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Resolving...' : 'Resolve Issue' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import ValidationFlags from './ValidationFlags.vue'

const props = defineProps({
  employee: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'resolve'])

// State
const isSubmitting = ref(false)
const form = ref({
  action: '',
  notes: '',
  priority: 'normal'
})

// Computed Properties
const variance = computed(() => {
  return (props.employee.car_amount || 0) - (props.employee.receipt_amount || 0)
})

const hasVariance = computed(() => {
  return Math.abs(variance.value) > 0.01
})

const variancePercentage = computed(() => {
  const base = props.employee.car_amount || 0
  if (base === 0) return '0.00'
  return Math.abs((variance.value / base) * 100).toFixed(2)
})

const hasValidationFlags = computed(() => {
  return (
    props.employee.validation_flags &&
    Object.keys(props.employee.validation_flags).length > 0
  )
})

// Methods
function formatCurrency(amount) {
  if (amount == null || amount === '') return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount))
}

async function handleResolve() {
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    const resolutionData = {
      action: form.value.action,
      notes: form.value.notes,
      priority: form.value.priority,
      resolved_by: 'Current User', // This should come from auth context
      resolved_at: new Date().toISOString(),
    }


    emit('resolve', resolutionData)
  } catch (error) {
    console.error('Error submitting resolution:', error)
  } finally {
    isSubmitting.value = false
  }
}

</script>

<style scoped>
/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Focus trap for accessibility */
.modal-panel:focus {
  outline: none;
}
</style>
