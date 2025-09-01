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
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
      >
        <!-- Header -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100"
              >
                <svg
                  class="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
              <div class="ml-4">
                <h3
                  id="modal-title"
                  class="text-lg leading-6 font-medium text-gray-900"
                >
                  Bulk Resolve Issues
                </h3>
                <p class="text-sm text-gray-500">
                  Resolve {{ employees.length }} selected employee issue(s)
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
          <!-- Selected Employees Summary -->
          <div class="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3">
              Selected Employees ({{ employees.length }})
            </h4>

            <!-- Compact list view -->
            <div v-if="!showFullList" class="space-y-2">
              <div
                v-for="employee in employees.slice(0, 3)"
                :key="employee.revision_id"
                class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <div class="flex items-center space-x-3">
                  <span class="font-medium">{{ employee.employee_name }}</span>
                  <span class="text-gray-500">{{ employee.employee_id }}</span>
                </div>
                <StatusBadge :status="employee.validation_status" size="xs" />
              </div>
              <button
                v-if="employees.length > 3"
                class="text-blue-600 hover:text-blue-800 text-sm"
                @click="showFullList = true"
              >
                Show {{ employees.length - 3 }} more...
              </button>
            </div>

            <!-- Full list view -->
            <div v-else class="space-y-2">
              <div
                v-for="employee in employees"
                :key="employee.revision_id"
                class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <div class="flex items-center space-x-3">
                  <span class="font-medium">{{ employee.employee_name }}</span>
                  <span class="text-gray-500">{{ employee.employee_id }}</span>
                  <span class="text-gray-500">{{ employee.department }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-600">{{
                    formatCurrency(employee.car_amount)
                  }}</span>
                  <StatusBadge :status="employee.validation_status" size="xs" />
                </div>
              </div>
              <button
                class="text-blue-600 hover:text-blue-800 text-sm"
                @click="showFullList = false"
              >
                Show less
              </button>
            </div>
          </div>

          <!-- Issue Summary -->
          <div class="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3">
              Issue Summary
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div
                v-for="(count, issueType) in issueSummary"
                :key="issueType"
                class="text-center"
              >
                <div class="text-lg font-bold text-gray-900">{{ count }}</div>
                <div class="text-gray-600">
                  {{ formatIssueType(issueType) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Bulk Resolution Form -->
          <form @submit.prevent="handleResolve">
            <!-- Resolution Action -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Bulk Resolution Action</label
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
                    >Mark all as Resolved</span
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
                    >Flag all for Follow-up</span
                  >
                </label>
                <label class="flex items-center">
                  <input
                    v-model="form.action"
                    type="radio"
                    value="escalate_manager"
                    class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span class="ml-2 text-sm text-gray-900"
                    >Escalate all to Manager</span
                  >
                </label>
              </div>
            </div>

            <!-- Individual Resolution Toggle -->
            <div class="mb-4">
              <label class="flex items-center">
                <input
                  v-model="allowIndividualResolution"
                  type="checkbox"
                  class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <span class="ml-2 text-sm text-gray-900"
                  >Allow individual resolution notes</span
                >
              </label>
              <p class="text-xs text-gray-500 mt-1">
                When enabled, you can add specific notes for each employee
              </p>
            </div>

            <!-- Individual Notes (if enabled) -->
            <div v-if="allowIndividualResolution" class="mb-4">
              <h5 class="text-sm font-medium text-gray-700 mb-2">
                Individual Notes
              </h5>
              <div class="space-y-3 max-h-60 overflow-y-auto">
                <div
                  v-for="employee in employees"
                  :key="employee.revision_id"
                  class="p-3 bg-white border border-gray-200 rounded"
                >
                  <div class="text-sm font-medium text-gray-900 mb-1">
                    {{ employee.employee_name }} ({{ employee.employee_id }})
                  </div>
                  <textarea
                    v-model="individualNotes[employee.revision_id]"
                    rows="2"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    :placeholder="`Specific notes for ${employee.employee_name}...`"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Bulk Resolution Notes -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ allowIndividualResolution ? 'General' : '' }} Resolution
                Notes
                <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="form.notes"
                rows="4"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the bulk resolution details, common actions taken, or reasons for the decision..."
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

            <!-- Warning Message -->
            <div
              class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div class="flex">
                <svg
                  class="flex-shrink-0 h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-yellow-800">
                    Bulk Resolution Warning
                  </h3>
                  <p class="text-sm text-yellow-700 mt-1">
                    This action will apply the selected resolution to all
                    {{ employees.length }} selected employees. This action
                    cannot be undone. Please review carefully before proceeding.
                  </p>
                </div>
              </div>
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
                class="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{
                  isSubmitting
                    ? 'Resolving...'
                    : `Resolve ${employees.length} Issues`
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  employees: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['close', 'resolve'])

// State
const isSubmitting = ref(false)
const showFullList = ref(false)
const allowIndividualResolution = ref(false)
const individualNotes = reactive({})

const form = ref({
  action: '',
  notes: '',
  priority: 'normal',
})

// Computed Properties
const issueSummary = computed(() => {
  const summary = {}
  props.employees.forEach(employee => {
    if (employee.validation_flags?.issue_type) {
      const issueType = employee.validation_flags.issue_type
      summary[issueType] = (summary[issueType] || 0) + 1
    } else {
      summary['unknown'] = (summary['unknown'] || 0) + 1
    }
  })
  return summary
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

function formatIssueType(issueType) {
  if (!issueType) return 'Unknown'
  return issueType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
      bulk_resolution: true,
      employee_count: props.employees.length,
    }

    // Add individual notes if enabled
    if (allowIndividualResolution.value) {
      resolutionData.individual_notes = individualNotes
    }

    emit('resolve', resolutionData)
  } catch (error) {
    console.error('Error submitting bulk resolution:', error)
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

/* Scrollable areas */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f7fafc;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e0;
  border-radius: 3px;
}
</style>
