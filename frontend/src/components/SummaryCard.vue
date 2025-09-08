<template>
  <div class="summary-card">
    <!-- Main Summary Header -->
    <div class="summary-header">
      <div class="summary-title">
        <h2 class="text-2xl font-bold text-gray-900">
          {{ title }}
        </h2>
        <div class="summary-subtitle text-gray-600">
          {{ subtitle }}
        </div>
      </div>
      
      <div class="summary-actions">
        <button
          v-if="showExpandToggle"
          @click="toggleExpanded"
          @keydown.enter="toggleExpanded"
          @keydown.space.prevent="toggleExpanded"
          class="expand-button"
          :class="{ 'expanded': expanded }"
          :aria-label="expanded ? 'Hide details' : 'Show details'"
          :aria-expanded="expanded"
          type="button"
        >
          <span class="expand-text">{{ expandButtonText }}</span>
          <svg 
            class="expand-icon"
            :class="{ 'rotated': expanded }"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Key Metrics Cards -->
    <div class="metrics-grid">
      <div 
        v-for="metric in primaryMetrics" 
        :key="metric.key"
        class="metric-card"
        :class="[`metric-${metric.type}`, { 'clickable': metric.clickable }]"
        @click="metric.clickable ? handleMetricClick(metric) : null"
      >
        <div class="metric-icon">
          <!-- Success Icon -->
          <svg v-if="metric.type === 'success'" class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.25a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
          <!-- Warning Icon -->
          <svg v-else-if="metric.type === 'warning'" class="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
          <!-- Error Icon -->
          <svg v-else-if="metric.type === 'error'" class="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
          </svg>
          <!-- Users Icon -->
          <svg v-else-if="metric.type === 'users'" class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
          </svg>
          <!-- Clock Icon -->
          <svg v-else-if="metric.type === 'clock'" class="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd" />
          </svg>
          <!-- Chart Icon -->
          <svg v-else-if="metric.type === 'chart'" class="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z" />
          </svg>
          <!-- Document Icon -->
          <svg v-else-if="metric.type === 'document'" class="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06L13.94 3.44A1.5 1.5 0 0012.879 3H4.5zm7 5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V8.06l-1.22 1.22a.75.75 0 11-1.06-1.06L10.94 6.75H10a.75.75 0 010-1.5h1.5A.75.75 0 0112.25 6v1.5z" clip-rule="evenodd" />
          </svg>
          <!-- Info Icon (default) -->
          <svg v-else class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="metric-content">
          <div class="metric-value">
            {{ formatMetricValue(metric.value) }}
          </div>
          <div class="metric-label">
            {{ metric.label }}
          </div>
          <div v-if="metric.subtitle" class="metric-subtitle">
            {{ metric.subtitle }}
          </div>
        </div>
        <div v-if="metric.badge" class="metric-badge" :class="`badge-${metric.badge.type}`">
          {{ metric.badge.text }}
        </div>
      </div>
    </div>

    <!-- Status Message -->
    <div class="status-message" :class="`status-${statusType}`">
      <div class="status-content">
        <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <!-- Success Icon -->
          <path v-if="statusType === 'success'" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          <!-- Warning Icon -->
          <path v-else-if="statusType === 'warning'" stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          <!-- Error Icon -->
          <path v-else-if="statusType === 'error'" stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <!-- Info Icon (default) -->
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span class="status-text">{{ statusMessage }}</span>
      </div>
      <div v-if="actionButtons.length > 0" class="status-actions">
        <button
          v-for="action in actionButtons"
          :key="action.key"
          @click="handleActionClick(action)"
          class="status-action-btn"
          :class="`btn-${action.type}`"
          :disabled="action.disabled"
        >
          {{ action.label }}
        </button>
      </div>
    </div>

    <!-- Preview Section (collapsed state) -->
    <transition
      name="preview-fade"
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showPreviewSection" class="preview-section">
        <div class="preview-header">
          <span class="preview-title">Quick Overview</span>
          <span v-if="remainingMetricsCount > 0" class="preview-more">
            +{{ remainingMetricsCount }} more details
          </span>
        </div>
        <div class="preview-grid">
          <div 
            v-for="detail in previewMetrics" 
            :key="`preview-${detail.key}`"
            class="preview-item"
          >
            <span class="preview-label">{{ detail.label }}:</span>
            <span class="preview-value" :class="`value-${detail.type || 'default'}`">
              {{ formatMetricValue(detail.value) }}
            </span>
          </div>
        </div>
      </div>
    </transition>

    <!-- Expandable Details Section -->
    <transition
      name="expand"
      :enter-active-class="`transition-all duration-${animationDuration} ease-out`"
      :leave-active-class="`transition-all duration-${animationDuration} ease-in`"
      enter-from-class="opacity-0 max-h-0 transform scale-y-0"
      enter-to-class="opacity-100 max-h-[1000px] transform scale-y-100"
      leave-from-class="opacity-100 max-h-[1000px] transform scale-y-100"
      leave-to-class="opacity-0 max-h-0 transform scale-y-0"
    >
      <div v-if="expanded" class="details-section">
        <div class="details-grid">
          <div 
            v-for="detail in detailMetrics" 
            :key="detail.key"
            class="detail-item"
          >
            <span class="detail-label">{{ detail.label }}:</span>
            <span class="detail-value" :class="`value-${detail.type || 'default'}`">
              {{ formatMetricValue(detail.value) }}
            </span>
          </div>
        </div>
        
        <!-- Additional Details Slot -->
        <div v-if="$slots.details" class="additional-details">
          <slot name="details"></slot>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, useSlots, defineExpose } from 'vue'

// Props
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  primaryMetrics: {
    type: Array,
    required: true
  },
  detailMetrics: {
    type: Array,
    default: () => []
  },
  statusMessage: {
    type: String,
    default: ''
  },
  statusType: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'warning', 'error', 'info'].includes(value)
  },
  actionButtons: {
    type: Array,
    default: () => []
  },
  expandable: {
    type: Boolean,
    default: true
  },
  defaultExpanded: {
    type: Boolean,
    default: false
  },
  showPreview: {
    type: Boolean,
    default: true
  },
  previewItems: {
    type: Number,
    default: 3
  },
  animationDuration: {
    type: Number,
    default: 300
  }
})

// Emits
const emit = defineEmits(['metric-click', 'action-click', 'expand-change'])

// Reactive state
const expanded = ref(props.defaultExpanded)
const slots = useSlots()

// Computed properties
const showExpandToggle = computed(() => {
  return props.expandable && (props.detailMetrics.length > 0 || !!slots.details)
})

const previewMetrics = computed(() => {
  if (!props.showPreview || expanded.value) {
    return []
  }
  return props.detailMetrics.slice(0, props.previewItems)
})

const remainingMetricsCount = computed(() => {
  return Math.max(0, props.detailMetrics.length - props.previewItems)
})

const showPreviewSection = computed(() => {
  return props.showPreview && !expanded.value && previewMetrics.value.length > 0
})

const expandButtonText = computed(() => {
  if (expanded.value) {
    return 'Hide Details'
  }
  if (remainingMetricsCount.value > 0) {
    return `View All ${props.detailMetrics.length} Details`
  }
  return 'View Details'
})

// Methods
const getMetricIcon = (type) => {
  const icons = {
    success: 'CheckCircleIcon',
    warning: 'ExclamationTriangleIcon', 
    error: 'XCircleIcon',
    info: 'InformationCircleIcon',
    users: 'UsersIcon',
    clock: 'ClockIcon',
    chart: 'ChartBarIcon',
    document: 'DocumentTextIcon'
  }
  return icons[type] || 'InformationCircleIcon'
}


const formatMetricValue = (value) => {
  if (typeof value === 'number') {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k'
    }
    return value.toLocaleString()
  }
  return value
}

const handleMetricClick = (metric) => {
  if (metric.clickable) {
    emit('metric-click', metric)
  }
}

const handleActionClick = (action) => {
  emit('action-click', action)
}

const toggleExpanded = () => {
  expanded.value = !expanded.value
}

// Programmatic control for parent components
const expand = () => {
  if (!expanded.value) expanded.value = true
}
const collapse = () => {
  if (expanded.value) expanded.value = false
}
defineExpose({ expand, collapse, toggle: toggleExpanded })

// Watch for expand changes
watch(expanded, (newValue) => {
  emit('expand-change', newValue)
})

</script>

<style scoped lang="postcss">
.summary-card {
  @apply bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden;
}

.summary-header {
  @apply flex justify-between items-start p-6 pb-4;
}

.summary-title h2 {
  @apply text-2xl font-bold text-gray-900 mb-1;
}

.summary-subtitle {
  @apply text-sm text-gray-600;
}

.expand-button {
  @apply flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200;
}

.expand-icon {
  @apply w-4 h-4 transition-transform duration-200;
}

.expand-icon.rotated {
  @apply rotate-180;
}

.metrics-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-4;
}

.metric-card {
  @apply relative bg-gradient-to-br rounded-xl p-4 transition-all duration-200;
}

.metric-card.clickable {
  @apply cursor-pointer hover:scale-105 hover:shadow-md;
}

.metric-success {
  @apply from-green-50 to-green-100 border border-green-200;
}

.metric-warning {
  @apply from-yellow-50 to-yellow-100 border border-yellow-200;
}

.metric-error {
  @apply from-red-50 to-red-100 border border-red-200;
}

.metric-info {
  @apply from-blue-50 to-blue-100 border border-blue-200;
}

.metric-icon {
  @apply mb-3;
}

.metric-success .metric-icon {
  @apply text-green-600;
}

.metric-warning .metric-icon {
  @apply text-yellow-600;
}

.metric-error .metric-icon {
  @apply text-red-600;
}

.metric-info .metric-icon {
  @apply text-blue-600;
}

.metric-value {
  @apply text-2xl font-bold text-gray-900 mb-1;
}

.metric-label {
  @apply text-sm font-medium text-gray-700 mb-1;
}

.metric-subtitle {
  @apply text-xs text-gray-500;
}

.metric-badge {
  @apply absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-full;
}

.badge-success {
  @apply bg-green-500 text-white;
}

.badge-warning {
  @apply bg-yellow-500 text-white;
}

.badge-error {
  @apply bg-red-500 text-white;
}

.status-message {
  @apply mx-6 mb-6 p-4 rounded-lg border-l-4;
}

.status-success {
  @apply bg-green-50 border-green-400;
}

.status-warning {
  @apply bg-yellow-50 border-yellow-400;
}

.status-error {
  @apply bg-red-50 border-red-400;
}

.status-info {
  @apply bg-blue-50 border-blue-400;
}

.status-content {
  @apply flex items-center gap-3 mb-3;
}

.status-icon {
  @apply w-5 h-5 flex-shrink-0;
}

.status-success .status-icon {
  @apply text-green-600;
}

.status-warning .status-icon {
  @apply text-yellow-600;
}

.status-error .status-icon {
  @apply text-red-600;
}

.status-info .status-icon {
  @apply text-blue-600;
}

.status-text {
  @apply font-medium text-gray-900;
}

.status-actions {
  @apply flex gap-2 flex-wrap;
}

.status-action-btn {
  @apply px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-success {
  @apply bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.details-section {
  @apply border-t border-gray-200 p-6 bg-gray-50 overflow-hidden;
}

.details-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4;
}

.detail-item {
  @apply flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200;
}

.detail-label {
  @apply text-sm text-gray-600 font-medium;
}

.detail-value {
  @apply text-sm font-semibold;
}

.value-success {
  @apply text-green-600;
}

.value-warning {
  @apply text-yellow-600;
}

.value-error {
  @apply text-red-600;
}

.value-default {
  @apply text-gray-900;
}

.additional-details {
  @apply pt-4 border-t border-gray-200;
}

/* Preview Section Styles */
.preview-section {
  @apply border-t border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100;
}

.preview-header {
  @apply flex justify-between items-center mb-3;
}

.preview-title {
  @apply text-sm font-semibold text-gray-700;
}

.preview-more {
  @apply text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full;
}

.preview-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3;
}

.preview-item {
  @apply flex justify-between items-center p-2 bg-white rounded-md border border-gray-100 hover:border-gray-200 transition-colors duration-150;
}

.preview-label {
  @apply text-xs text-gray-500 font-medium;
}

.preview-value {
  @apply text-xs font-bold;
}

/* Enhanced animations */
.expand-enter-active,
.expand-leave-active {
  transform-origin: top;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-enter-from,
.expand-leave-to {
  transform: scaleY(0);
  opacity: 0;
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: all 0.2s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Mobile responsive adjustments */
@media (max-width: 640px) {
  .summary-header {
    @apply flex-col items-start gap-3;
  }
  
  .metrics-grid {
    @apply grid-cols-1;
  }
  
  .details-grid {
    @apply grid-cols-1;
  }
  
  .status-actions {
    @apply flex-col;
  }
  
  .status-action-btn {
    @apply w-full justify-center;
  }
}
</style>