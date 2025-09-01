<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      statusClasses,
    ]"
  >
    <svg
      v-if="statusIcon"
      :class="iconClasses"
      class="w-3 h-3 mr-1"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path :d="statusIcon" />
    </svg>
    {{ statusText }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    default: 'sm', // sm, md, lg
    validator: value => ['xs', 'sm', 'md', 'lg'].includes(value),
  },
})

const statusConfig = {
  VALID: {
    text: 'Ready for Export',
    classes: 'bg-green-100 text-green-800',
    icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
  },
  NEEDS_ATTENTION: {
    text: 'Needs Attention',
    classes: 'bg-yellow-100 text-yellow-800',
    icon: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z',
  },
  RESOLVED: {
    text: 'Resolved',
    classes: 'bg-blue-100 text-blue-800',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  PROCESSING: {
    text: 'Processing',
    classes: 'bg-purple-100 text-purple-800',
    icon: 'M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z',
  },
  ERROR: {
    text: 'Error',
    classes: 'bg-red-100 text-red-800',
    icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
  },
  PENDING: {
    text: 'Pending',
    classes: 'bg-gray-100 text-gray-800',
    icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z',
  },
}

const statusText = computed(() => {
  const config = statusConfig[props.status]
  return config ? config.text : props.status
})

const statusClasses = computed(() => {
  const config = statusConfig[props.status]
  const baseClasses = config ? config.classes : 'bg-gray-100 text-gray-800'

  // Size variations
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-sm',
  }

  return `${baseClasses} ${sizeClasses[props.size] || sizeClasses.sm}`
})

const statusIcon = computed(() => {
  const config = statusConfig[props.status]
  return config ? config.icon : null
})

const iconClasses = computed(() => {
  const sizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return sizeClasses[props.size] || sizeClasses.sm
})
</script>

<style scoped>
/* Add any custom styling if needed */
</style>
