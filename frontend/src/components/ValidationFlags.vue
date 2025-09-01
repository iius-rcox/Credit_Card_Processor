<template>
  <div class="validation-flags">
    <div class="flex items-center justify-between mb-2">
      <h5 class="text-sm font-medium text-gray-900">Validation Issues</h5>
      <span class="text-xs text-gray-500">{{ flagCount }} issue(s)</span>
    </div>

    <div class="space-y-2">
      <!-- Amount Mismatch -->
      <div
        v-if="flags.issue_type === 'amount_mismatch'"
        class="validation-flag"
      >
        <div class="flex items-start space-x-2">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="w-4 h-4 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900">Amount Mismatch</div>
            <div class="text-sm text-gray-600">{{ flags.description }}</div>
            <div
              v-if="flags.variance_amount"
              class="text-xs text-gray-500 mt-1"
            >
              Variance: {{ formatCurrency(flags.variance_amount) }}
              <span v-if="flags.variance_percentage"
                >({{ flags.variance_percentage }}%)</span
              >
            </div>
          </div>
          <SeverityBadge :severity="flags.severity" />
        </div>
      </div>

      <!-- Missing Receipt -->
      <div
        v-if="flags.issue_type === 'missing_receipt'"
        class="validation-flag"
      >
        <div class="flex items-start space-x-2">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="w-4 h-4 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900">Missing Receipt</div>
            <div class="text-sm text-gray-600">
              {{ flags.description || 'Receipt information not found' }}
            </div>
          </div>
          <SeverityBadge :severity="flags.severity" />
        </div>
      </div>

      <!-- Employee Not Found -->
      <div
        v-if="flags.issue_type === 'employee_not_found'"
        class="validation-flag"
      >
        <div class="flex items-start space-x-2">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="w-4 h-4 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900">
              Employee Not Found
            </div>
            <div class="text-sm text-gray-600">
              {{ flags.description || 'Employee ID not found in system' }}
            </div>
          </div>
          <SeverityBadge :severity="flags.severity" />
        </div>
      </div>

      <!-- Policy Limit Violation -->
      <div
        v-if="flags.issue_type === 'policy_limit_violation'"
        class="validation-flag"
      >
        <div class="flex items-start space-x-2">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="w-4 h-4 text-orange-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900">
              Policy Limit Exceeded
            </div>
            <div class="text-sm text-gray-600">{{ flags.description }}</div>
            <div v-if="flags.policy_limit" class="text-xs text-gray-500 mt-1">
              Policy Limit: {{ formatCurrency(flags.policy_limit) }}
            </div>
          </div>
          <SeverityBadge :severity="flags.severity" />
        </div>
      </div>

      <!-- Duplicate Submission -->
      <div
        v-if="flags.issue_type === 'duplicate_submission'"
        class="validation-flag"
      >
        <div class="flex items-start space-x-2">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="w-4 h-4 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"
              />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900">
              Duplicate Submission
            </div>
            <div class="text-sm text-gray-600">
              {{
                flags.description ||
                'Multiple submissions found for this employee'
              }}
            </div>
            <div
              v-if="flags.duplicate_count"
              class="text-xs text-gray-500 mt-1"
            >
              {{ flags.duplicate_count }} duplicate(s) found
            </div>
          </div>
          <SeverityBadge :severity="flags.severity" />
        </div>
      </div>

      <!-- Generic Issue -->
      <div
        v-if="!recognizedIssueTypes.includes(flags.issue_type)"
        class="validation-flag"
      >
        <div class="flex items-start space-x-2">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="w-4 h-4 text-gray-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900">
              {{ formatIssueType(flags.issue_type) }}
            </div>
            <div class="text-sm text-gray-600">
              {{ flags.description || 'Additional validation required' }}
            </div>
          </div>
          <SeverityBadge :severity="flags.severity" />
        </div>
      </div>
    </div>

    <!-- Additional Details (if any) -->
    <div
      v-if="flags.additional_details"
      class="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600"
    >
      <strong>Additional Details:</strong> {{ flags.additional_details }}
    </div>

    <!-- Suggested Actions -->
    <div v-if="suggestedActions.length" class="mt-3">
      <div class="text-xs font-medium text-gray-700 mb-1">
        Suggested Actions:
      </div>
      <ul class="text-xs text-gray-600 space-y-1">
        <li
          v-for="action in suggestedActions"
          :key="action"
          class="flex items-start"
        >
          <span class="text-gray-400 mr-1">•</span>
          <span>{{ action }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SeverityBadge from './SeverityBadge.vue'

const props = defineProps({
  flags: {
    type: Object,
    required: true,
  },
})

const recognizedIssueTypes = [
  'amount_mismatch',
  'missing_receipt',
  'employee_not_found',
  'policy_limit_violation',
  'duplicate_submission',
]

const flagCount = computed(() => {
  return Object.keys(props.flags).length > 0 ? 1 : 0
})

const suggestedActions = computed(() => {
  const actions = []

  switch (props.flags.issue_type) {
    case 'amount_mismatch':
      actions.push('Verify receipt amount against CAR data')
      actions.push('Check for receipt calculation errors')
      if (props.flags.variance_percentage > 5) {
        actions.push('Escalate to manager for approval')
      }
      break
    case 'missing_receipt':
      actions.push('Locate and upload missing receipt')
      actions.push('Contact employee for receipt submission')
      break
    case 'employee_not_found':
      actions.push('Verify employee ID in HR system')
      actions.push('Check for ID format issues')
      break
    case 'policy_limit_violation':
      actions.push('Review company expense policy')
      actions.push('Require manager approval')
      break
    case 'duplicate_submission':
      actions.push('Review all submissions for this employee')
      actions.push('Remove duplicate entries')
      break
  }

  return actions
})

function formatCurrency(amount) {
  if (amount == null || amount === '') return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount))
}

function formatIssueType(issueType) {
  if (!issueType) return 'Unknown Issue'
  return issueType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>

<style scoped>
.validation-flags {
  @apply border border-yellow-200 rounded-lg p-3 bg-yellow-50;
}

.validation-flag {
  @apply p-2 bg-white rounded border border-gray-200;
}

.validation-flag:not(:last-child) {
  @apply mb-2;
}
</style>
