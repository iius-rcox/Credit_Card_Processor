<template>
  <div class="action-bar-container">
    <!-- Fixed Action Bar -->
    <div class="action-bar">
      <div class="action-bar-content">
        <!-- Process New Documents -->
        <button
          :disabled="isProcessing || isUploading"
          :class="[
            'action-button primary',
            { 'disabled': isProcessing || isUploading, 'pulsing': canProcess && !hasActiveSession }
          ]"
          @click="handleProcessNew"
          :aria-label="getProcessButtonLabel()"
        >
          <div class="button-content">
            <svg v-if="!isProcessing && !isUploading" class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <div v-else class="spinner"></div>
            <span class="button-text">{{ getProcessButtonText() }}</span>
          </div>
          <div v-if="processingProgress > 0" class="progress-bar">
            <div class="progress-fill" :style="{ width: `${processingProgress}%` }"></div>
          </div>
        </button>

        <!-- Download Results -->
        <button
          :disabled="!hasResults || isProcessing"
          :class="[
            'action-button secondary',
            { 'disabled': !hasResults || isProcessing, 'highlight': hasResults && !downloadsAvailable }
          ]"
          @click="handleDownloadResults"
          :aria-label="getDownloadButtonLabel()"
        >
          <div class="button-content">
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span class="button-text">{{ getDownloadButtonText() }}</span>
            <div v-if="availableDownloads > 0" class="badge">{{ availableDownloads }}</div>
          </div>
        </button>

        <!-- Upload Receipt Updates -->
        <button
          :disabled="!canUploadUpdates || isProcessing"
          :class="[
            'action-button tertiary',
            { 'disabled': !canUploadUpdates || isProcessing }
          ]"
          @click="handleUploadUpdates"
          :aria-label="getUpdatesButtonLabel()"
        >
          <div class="button-content">
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            <span class="button-text">{{ getUpdatesButtonText() }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Status Summary (collapsible) -->
    <div 
      v-if="showStatusSummary" 
      class="status-summary"
      :class="{ 'expanded': statusExpanded }"
    >
      <button 
        class="status-toggle"
        @click="statusExpanded = !statusExpanded"
        :aria-label="statusExpanded ? 'Hide status details' : 'Show status details'"
      >
        <div class="status-header">
          <span class="status-text">{{ getStatusMessage() }}</span>
          <svg 
            class="toggle-icon"
            :class="{ 'rotated': statusExpanded }"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </button>

      <div v-if="statusExpanded" class="status-details">
        <div class="status-grid">
          <div class="status-item">
            <span class="label">Ready for pVault:</span>
            <span class="value success">{{ summary.ready_for_pvault || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="label">Need Attention:</span>
            <span class="value warning">{{ summary.need_attention || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="label">Total Processed:</span>
            <span class="value">{{ summary.total_employees || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="label">Export Readiness:</span>
            <span class="value">{{ getReadinessPercentage() }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useSessionStore } from '../stores/session.js'
import { useNotificationStore } from '../stores/notification.js'
import { useApi } from '../composables/useApi.js'

// Props
const props = defineProps({
  processingProgress: {
    type: Number,
    default: 0
  },
  availableDownloads: {
    type: Number,
    default: 0
  }
})

// Emits
const emit = defineEmits([
  'process-new',
  'download-results', 
  'upload-updates',
  'status-clicked'
])

// Reactive state
const statusExpanded = ref(false)
const summary = ref({
  ready_for_pvault: 0,
  need_attention: 0,
  total_employees: 0,
  export_ready_percentage: 0
})

// Store instances
const sessionStore = useSessionStore()
const notificationStore = useNotificationStore()
const api = useApi()

// Computed properties
const hasActiveSession = computed(() => sessionStore.hasSession)
const isProcessing = computed(() => sessionStore.isProcessing)
const isUploading = computed(() => sessionStore.isUploading)
const hasResults = computed(() => sessionStore.hasResults)
const canProcess = computed(() => {
  return hasActiveSession.value && sessionStore.hasFiles && !isProcessing.value
})

const canUploadUpdates = computed(() => {
  return hasActiveSession.value && hasResults.value && !isProcessing.value
})

const showStatusSummary = computed(() => {
  return hasActiveSession.value && (hasResults.value || isProcessing.value)
})

const downloadsAvailable = computed(() => {
  return props.availableDownloads > 0
})

// Button text methods
const getProcessButtonText = () => {
  if (isUploading.value) return 'Uploading...'
  if (isProcessing.value) return 'Processing...'
  if (!hasActiveSession.value) return 'Start New Session'
  if (!sessionStore.hasFiles) return 'Upload Documents'
  return 'Process Documents'
}

const getProcessButtonLabel = () => {
  if (isProcessing.value) return 'Processing documents, please wait'
  if (!hasActiveSession.value) return 'Start a new processing session'
  return 'Process uploaded documents automatically'
}

const getDownloadButtonText = () => {
  if (!hasResults.value) return 'Download Results'
  if (downloadsAvailable.value) return `Download (${props.availableDownloads})`
  return 'Generate Downloads'
}

const getDownloadButtonLabel = () => {
  if (!hasResults.value) return 'No results available for download'
  return `Download processing results (${props.availableDownloads} files available)`
}

const getUpdatesButtonText = () => {
  return 'Upload Updates'
}

const getUpdatesButtonLabel = () => {
  if (!canUploadUpdates.value) return 'Upload updated receipts (requires completed processing)'
  return 'Upload updated receipts for delta processing'
}

const getStatusMessage = () => {
  if (isProcessing.value) {
    return `Processing... ${props.processingProgress}% complete`
  }
  
  if (summary.value.total_employees > 0) {
    return `${summary.value.ready_for_pvault} ready | ${summary.value.need_attention} need attention`
  }
  
  return 'Ready to process documents'
}

const getReadinessPercentage = () => {
  const total = summary.value.total_employees
  if (total === 0) return 0
  return Math.round((summary.value.ready_for_pvault / total) * 100)
}

// Event handlers
const handleProcessNew = () => {
  if (!hasActiveSession.value) {
    // Need to create a new session first
    emit('process-new', { action: 'create-session' })
  } else if (!sessionStore.hasFiles) {
    // Need to upload files first
    emit('process-new', { action: 'upload-files' })
  } else {
    // Ready to process
    emit('process-new', { action: 'start-processing' })
  }
}

const handleDownloadResults = () => {
  if (hasResults.value) {
    emit('download-results', {
      hasFiles: downloadsAvailable.value,
      fileCount: props.availableDownloads
    })
  }
}

const handleUploadUpdates = () => {
  if (canUploadUpdates.value) {
    emit('upload-updates', {
      baseSessionId: sessionStore.sessionId,
      sessionName: sessionStore.currentSession?.session_name
    })
  }
}

// Load summary data
const loadSummary = async () => {
  if (!hasActiveSession.value) return
  
  try {
    const response = await api.getSummary(sessionStore.sessionId)
    summary.value = response
  } catch (error) {
    console.error('Failed to load summary:', error)
  }
}

// Watchers
watch(() => sessionStore.sessionId, (newSessionId) => {
  if (newSessionId) {
    loadSummary()
  }
})

// Update summary when processing status changes or WebSocket provides updates
watch(() => sessionStore.processingStatus, (newStatus) => {
  if (newStatus === 'completed') {
    // Reload summary when processing completes (with slight delay to ensure backend is updated)
    setTimeout(loadSummary, 1500)
  }
})

// Listen for real-time updates if WebSocket is enabled
watch(() => sessionStore.realTimeEnabled, (enabled) => {
  if (enabled && hasActiveSession.value) {
    // Real-time updates are active, summary will be updated via WebSocket
    console.log('ActionBar: Real-time updates enabled')
  }
})

// Lifecycle
onMounted(() => {
  if (hasActiveSession.value) {
    loadSummary()
  }
})
</script>

<style scoped>
.action-bar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid #e5e5e5;
}

.action-bar {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.action-bar-content {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1rem;
  align-items: center;
}

@media (max-width: 768px) {
  .action-bar-content {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

.action-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 4rem;
  overflow: hidden;
}

.action-button.primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
}

.action-button.primary:hover:not(.disabled) {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.action-button.primary.pulsing {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.action-button.secondary {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
}

.action-button.secondary:hover:not(.disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.action-button.secondary.highlight {
  animation: highlight 3s infinite;
}

@keyframes highlight {
  0%, 100% { box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); }
  50% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.6); }
}

.action-button.tertiary {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);
}

.action-button.tertiary:hover:not(.disabled) {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

.action-button.disabled {
  background: #9ca3af;
  color: #6b7280;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.button-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.button-icon {
  width: 1.5rem;
  height: 1.5rem;
  stroke-width: 2;
}

.button-text {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.badge {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  min-width: 1.25rem;
  text-align: center;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 0 0 0.75rem 0.75rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  transition: width 0.3s ease;
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-summary {
  border-top: 1px solid #e5e5e5;
  background: #f9fafb;
}

.status-toggle {
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.status-toggle:hover {
  background: #f3f4f6;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
}

.status-text {
  font-weight: 600;
  color: #374151;
}

.toggle-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.3s ease;
  color: #6b7280;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.status-details {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  border-top: 1px solid #e5e5e5;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e5e5e5;
}

.status-item .label {
  font-size: 0.875rem;
  color: #6b7280;
}

.status-item .value {
  font-weight: 700;
  font-size: 1rem;
}

.status-item .value.success {
  color: #10b981;
}

.status-item .value.warning {
  color: #f59e0b;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .action-bar {
    padding: 0.75rem;
  }
  
  .action-button {
    min-height: 3.5rem;
    padding: 0.75rem;
  }
  
  .button-text {
    font-size: 0.75rem;
  }
  
  .button-icon {
    width: 1.25rem;
    height: 1.25rem;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>