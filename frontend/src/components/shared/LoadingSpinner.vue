<template>
  <div 
    :class="[
      'loading-spinner-container',
      inline ? 'inline-flex items-center' : 'flex items-center justify-center',
      size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
    ]"
    role="status"
    :aria-label="accessibleLabel"
    :aria-live="announceChanges ? 'polite' : null"
  >
    <!-- Spinner -->
    <div 
      :class="[
        'animate-spin rounded-full border-2',
        spinnerSizeClasses,
        colorClasses,
        { 'mr-2': showLabel && inline }
      ]"
      aria-hidden="true"
    ></div>

    <!-- Loading text -->
    <span 
      v-if="showLabel" 
      :class="[
        'loading-text',
        inline ? '' : 'mt-2'
      ]"
    >
      {{ label }}
    </span>

    <!-- Screen reader only text -->
    <span v-else class="sr-only">
      {{ accessibleLabel }}
    </span>

    <!-- Progress indicator for determinate loading -->
    <div v-if="progress !== null && showProgress" class="ml-2">
      <span class="sr-only">{{ Math.round(progress) }}% complete</span>
      <span aria-hidden="true">({{ Math.round(progress) }}%)</span>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  /**
   * Loading message to display
   */
  label: {
    type: String,
    default: 'Loading...'
  },

  /**
   * Size variant
   */
  size: {
    type: String,
    default: 'medium',
    validator: value => ['small', 'medium', 'large'].includes(value)
  },

  /**
   * Color theme
   */
  color: {
    type: String,
    default: 'primary',
    validator: value => ['primary', 'secondary', 'white'].includes(value)
  },

  /**
   * Whether to display inline
   */
  inline: {
    type: Boolean,
    default: false
  },

  /**
   * Whether to show the text label
   */
  showLabel: {
    type: Boolean,
    default: true
  },

  /**
   * Progress percentage (0-100) for determinate loading
   */
  progress: {
    type: Number,
    default: null,
    validator: value => value === null || (value >= 0 && value <= 100)
  },

  /**
   * Whether to show progress percentage
   */
  showProgress: {
    type: Boolean,
    default: false
  },

  /**
   * Whether to announce loading state changes to screen readers
   */
  announceChanges: {
    type: Boolean,
    default: false
  },

  /**
   * Custom accessible label for screen readers
   */
  accessibleLabel: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['progress-update'])

/**
 * Generate spinner size classes
 */
const spinnerSizeClasses = computed(() => {
  const sizeMap = {
    small: 'h-4 w-4 border-2',
    medium: 'h-6 w-6 border-2', 
    large: 'h-8 w-8 border-2'
  }
  return sizeMap[props.size] || sizeMap.medium
})

/**
 * Generate color classes
 */
const colorClasses = computed(() => {
  const colorMap = {
    primary: 'border-primary-200 border-t-primary-600',
    secondary: 'border-neutral-200 border-t-neutral-600',
    white: 'border-white border-opacity-30 border-t-white'
  }
  return colorMap[props.color] || colorMap.primary
})

/**
 * Accessible label for screen readers
 */
const accessibleLabel = computed(() => {
  if (props.accessibleLabel) {
    return props.accessibleLabel
  }
  
  let label = props.label
  
  if (props.progress !== null) {
    label += ` ${Math.round(props.progress)}% complete`
  }
  
  return label
})

/**
 * Watch progress changes for announcements
 */
watch(() => props.progress, (newProgress, oldProgress) => {
  if (newProgress !== null && oldProgress !== null && props.announceChanges) {
    // Announce progress at 25%, 50%, 75%, and 100%
    const milestones = [25, 50, 75, 100]
    const currentMilestone = milestones.find(m => 
      oldProgress < m && newProgress >= m
    )
    
    if (currentMilestone) {
      emit('progress-update', {
        progress: newProgress,
        milestone: currentMilestone,
        announcement: `Loading ${currentMilestone}% complete`
      })
    }
  }
})
</script>

<style scoped>
.loading-spinner-container {
  color: inherit;
}

.loading-text {
  color: inherit;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
  
  /* Show alternative loading indicator for reduced motion */
  .animate-spin::after {
    content: '●';
    animation: pulse 2s ease-in-out infinite alternate;
  }
}

@keyframes pulse {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 1;
  }
}
</style>