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
          <component :is="getMetricIcon(metric.type)" class="w-8 h-8" />
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
          <component :is="getStatusIcon(statusType)" />
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
import { ref, computed, watch, useSlots } from 'vue'

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

const getStatusIcon = (type) => {
  switch (type) {
    case 'success':
      return 'path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"'
    case 'warning':
      return 'path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"'
    case 'error':
      return 'path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"'
    default:
      return 'path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"'
  }
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

// Watch for expand changes
watch(expanded, (newValue) => {
  emit('expand-change', newValue)
})

// Icon components (simplified inline icons)
const CheckCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
}

const ExclamationTriangleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`
}

const XCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
}

const InformationCircleIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>`
}

const UsersIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>`
}

const ClockIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
}

const ChartBarIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>`
}

const DocumentTextIcon = {
  template: `<svg viewBox="0 0 24 24" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>`
}
</script>

<style scoped>
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
  @apply border-t border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-25 to-gray-50;
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