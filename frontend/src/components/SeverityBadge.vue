<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
      severityClasses,
    ]"
  >
    {{ severityText }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  severity: {
    type: String,
    default: 'medium',
    validator: value => ['low', 'medium', 'high', 'critical'].includes(value),
  },
})

const severityConfig = {
  low: {
    text: 'Low',
    classes: 'bg-green-100 text-green-800',
  },
  medium: {
    text: 'Medium',
    classes: 'bg-yellow-100 text-yellow-800',
  },
  high: {
    text: 'High',
    classes: 'bg-orange-100 text-orange-800',
  },
  critical: {
    text: 'Critical',
    classes: 'bg-red-100 text-red-800',
  },
}

const severityText = computed(() => {
  const config = severityConfig[props.severity]
  return config ? config.text : 'Medium'
})

const severityClasses = computed(() => {
  const config = severityConfig[props.severity]
  return config ? config.classes : severityConfig.medium.classes
})
</script>
