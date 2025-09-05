<template>
  <div class="smart-change-detector">
    <!-- Detection Header -->
    <div class="detection-header">
      <div class="header-info">
        <div class="detection-icon" :class="getStatusIconClass()">
          <component :is="getStatusIcon()" class="w-8 h-8" />
        </div>
        <div class="header-content">
          <h3 class="detection-title">Smart Change Detection</h3>
          <p class="detection-subtitle">
            {{ getStatusMessage() }}
          </p>
        </div>
      </div>
      
      <div class="detection-controls">
        <button
          v-if="!isDetecting"
          @click="startDetection"
          class="start-detection-btn"
          :disabled="!canStartDetection"
        >
          <MagnifyingGlassIcon class="w-4 h-4" />
          Start Detection
        </button>
        
        <button
          v-if="isDetecting"
          @click="cancelDetection"
          class="cancel-detection-btn"
        >
          <XMarkIcon class="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>

    <!-- Detection Progress -->
    <div v-if="isDetecting" class="detection-progress">
      <div class="progress-header">
        <span class="progress-label">{{ currentStep.label }}</span>
        <span class="progress-time">{{ formatTime(elapsedTime) }}</span>
      </div>
      
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${detectionProgress}%` }"
        ></div>
      </div>
      
      <div class="progress-details">
        <div class="detail-item">
          <span class="detail-label">Files Analyzed:</span>
          <span class="detail-value">{{ analysisStats.filesAnalyzed }} / {{ analysisStats.totalFiles }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Changes Found:</span>
          <span class="detail-value">{{ analysisStats.changesDetected }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Confidence:</span>
          <span class="detail-value">{{ Math.round(analysisStats.confidenceScore * 100) }}%</span>
        </div>
      </div>
    </div>

    <!-- Detection Results -->
    <div v-if="detectionComplete && detectionResults" class="detection-results">
      <div class="results-summary">
        <div class="summary-card" :class="`match-${detectionResults.matchType}`">
          <div class="summary-icon">
            <component :is="getMatchTypeIcon(detectionResults.matchType)" class="w-6 h-6" />
          </div>
          <div class="summary-content">
            <div class="summary-title">{{ getMatchTypeTitle(detectionResults.matchType) }}</div>
            <div class="summary-description">{{ getMatchTypeDescription(detectionResults.matchType) }}</div>
          </div>
          <div class="confidence-score" :class="getConfidenceClass(detectionResults.confidenceScore)">
            {{ Math.round(detectionResults.confidenceScore * 100) }}%
          </div>
        </div>
        
        <div class="processing-recommendation">
          <div class="recommendation-header">
            <SparklesIcon class="w-5 h-5 text-blue-600" />
            <span class="recommendation-label">Recommended Action</span>
          </div>
          <div class="recommendation-content">
            <div class="recommendation-title">{{ getRecommendationTitle(detectionResults.recommendation) }}</div>
            <div class="recommendation-description">{{ getRecommendationDescription(detectionResults.recommendation) }}</div>
            <div v-if="detectionResults.processingTimeEstimate" class="time-estimate">
              Estimated time: {{ formatDuration(detectionResults.processingTimeEstimate) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Base Session Details -->
      <div v-if="detectionResults.baseSession" class="base-session-details">
        <div class="session-header">
          <h4 class="session-title">Base Session Found</h4>
          <span class="session-date">{{ formatDate(detectionResults.baseSession.createdAt) }}</span>
        </div>
        
        <div class="session-grid">
          <div class="session-info">
            <div class="info-item">
              <span class="info-label">Name:</span>
              <span class="info-value">{{ detectionResults.baseSession.sessionName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value status-badge" :class="`status-${detectionResults.baseSession.status}`">
                {{ detectionResults.baseSession.status }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Employees:</span>
              <span class="info-value">{{ detectionResults.baseSession.totalEmployees }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Success Rate:</span>
              <span class="info-value">
                {{ Math.round((detectionResults.baseSession.processedEmployees / detectionResults.baseSession.totalEmployees) * 100) }}%
              </span>
            </div>
          </div>
          
          <div class="file-comparisons">
            <div class="comparison-header">
              <span class="comparison-title">File Comparison</span>
            </div>
            <div class="comparison-grid">
              <div class="file-comparison" :class="{ 'file-match': detectionResults.fileComparisons.carMatch }">
                <div class="file-type">CAR File</div>
                <div class="match-status">
                  <component 
                    :is="detectionResults.fileComparisons.carMatch ? 'CheckIcon' : 'XMarkIcon'" 
                    class="w-4 h-4"
                    :class="detectionResults.fileComparisons.carMatch ? 'text-green-600' : 'text-red-600'"
                  />
                  <span>{{ detectionResults.fileComparisons.carMatch ? 'Match' : 'Changed' }}</span>
                </div>
              </div>
              
              <div class="file-comparison" :class="{ 'file-match': detectionResults.fileComparisons.receiptMatch }">
                <div class="file-type">Receipt File</div>
                <div class="match-status">
                  <component 
                    :is="detectionResults.fileComparisons.receiptMatch ? 'CheckIcon' : 'XMarkIcon'" 
                    class="w-4 h-4"
                    :class="detectionResults.fileComparisons.receiptMatch ? 'text-green-600' : 'text-red-600'"
                  />
                  <span>{{ detectionResults.fileComparisons.receiptMatch ? 'Match' : 'Changed' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Change Analysis -->
      <div v-if="changeAnalysis" class="change-analysis">
        <div class="analysis-header">
          <h4 class="analysis-title">Change Analysis</h4>
          <div class="analysis-metrics">
            <div class="metric">
              <span class="metric-value">{{ changeAnalysis.totalChanges }}</span>
              <span class="metric-label">Changes</span>
            </div>
            <div class="metric">
              <span class="metric-value">{{ changeAnalysis.newEmployees }}</span>
              <span class="metric-label">New</span>
            </div>
            <div class="metric">
              <span class="metric-value">{{ changeAnalysis.modifiedEmployees }}</span>
              <span class="metric-label">Modified</span>
            </div>
            <div class="metric">
              <span class="metric-value">{{ changeAnalysis.removedEmployees }}</span>
              <span class="metric-label">Removed</span>
            </div>
          </div>
        </div>
        
        <div class="change-breakdown">
          <div class="breakdown-section" v-for="category in changeCategories" :key="category.key">
            <div class="section-header" @click="toggleSection(category.key)">
              <div class="section-info">
                <component :is="category.icon" class="w-4 h-4" />
                <span class="section-title">{{ category.title }}</span>
                <span class="change-count">({{ category.count }})</span>
              </div>
              <ChevronDownIcon 
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': expandedSections.includes(category.key) }"
              />
            </div>
            
            <div v-if="expandedSections.includes(category.key)" class="section-content">
              <div class="change-list">
                <div 
                  v-for="change in category.changes.slice(0, showAllChanges ? undefined : 5)"
                  :key="change.id"
                  class="change-item"
                >
                  <div class="change-info">
                    <div class="change-employee">{{ change.employeeName }}</div>
                    <div class="change-description">{{ change.description }}</div>
                  </div>
                  <div class="change-impact" :class="`impact-${change.impact}`">
                    {{ change.impact }}
                  </div>
                </div>
                
                <div v-if="category.changes.length > 5 && !showAllChanges" class="show-more">
                  <button @click="showAllChanges = true" class="show-more-btn">
                    Show {{ category.changes.length - 5 }} more changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Alternative Sessions -->
      <div v-if="detectionResults.alternativeSessions.length > 0" class="alternative-sessions">
        <div class="alternatives-header">
          <h4 class="alternatives-title">Alternative Base Sessions</h4>
          <span class="alternatives-count">{{ detectionResults.alternativeSessions.length }} found</span>
        </div>
        
        <div class="alternatives-grid">
          <div 
            v-for="session in detectionResults.alternativeSessions"
            :key="session.sessionId"
            class="alternative-session"
            @click="selectAlternativeSession(session)"
          >
            <div class="session-name">{{ session.sessionName }}</div>
            <div class="session-meta">
              <span class="session-date">{{ formatDate(session.createdAt) }}</span>
              <span class="session-employees">{{ session.totalEmployees }} employees</span>
            </div>
            <div class="session-confidence">
              {{ Math.round(calculateSessionConfidence(session) * 100) }}% match
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="detectionComplete" class="action-buttons">
      <button
        v-if="detectionResults.recommendation === 'delta_processing'"
        @click="startDeltaProcessing"
        class="action-btn primary"
        :disabled="startingDeltaProcessing"
      >
        <BoltIcon class="w-4 h-4" />
        {{ startingDeltaProcessing ? 'Starting...' : 'Start Delta Processing' }}
      </button>
      
      <button
        v-if="detectionResults.recommendation === 'skip_processing'"
        @click="reuseResults"
        class="action-btn success"
        :disabled="reusingResults"
      >
        <ArrowPathIcon class="w-4 h-4" />
        {{ reusingResults ? 'Loading...' : 'Reuse Previous Results' }}
      </button>
      
      <button
        v-if="detectionResults.recommendation === 'full_processing'"
        @click="startFullProcessing"
        class="action-btn secondary"
      >
        <PlayIcon class="w-4 h-4" />
        Start Full Processing
      </button>
      
      <button
        @click="runNewDetection"
        class="action-btn tertiary"
      >
        <MagnifyingGlassIcon class="w-4 h-4" />
        Run New Detection
      </button>
      
      <button
        @click="showAdvancedOptions = !showAdvancedOptions"
        class="action-btn outline"
      >
        <CogIcon class="w-4 h-4" />
        Advanced Options
      </button>
    </div>

    <!-- Advanced Options -->
    <div v-if="showAdvancedOptions" class="advanced-options">
      <div class="options-header">
        <h4 class="options-title">Advanced Detection Options</h4>
      </div>
      
      <div class="options-grid">
        <div class="option-group">
          <label class="option-label">Sensitivity</label>
          <select v-model="detectionOptions.sensitivity" class="option-select">
            <option value="low">Low (Major changes only)</option>
            <option value="medium">Medium (Recommended)</option>
            <option value="high">High (Detect all changes)</option>
          </select>
        </div>
        
        <div class="option-group">
          <label class="option-label">Confidence Threshold</label>
          <input 
            v-model="detectionOptions.confidenceThreshold" 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.1"
            class="option-slider"
          />
          <span class="threshold-value">{{ Math.round(detectionOptions.confidenceThreshold * 100) }}%</span>
        </div>
        
        <div class="option-group">
          <label class="option-checkbox">
            <input v-model="detectionOptions.deepAnalysis" type="checkbox" />
            <span class="checkbox-label">Enable deep content analysis</span>
          </label>
        </div>
        
        <div class="option-group">
          <label class="option-checkbox">
            <input v-model="detectionOptions.includeMetadata" type="checkbox" />
            <span class="checkbox-label">Include metadata in comparison</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useApi } from '@/composables/useApi'

// Icons
const MagnifyingGlassIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"/></svg>`
}

const XMarkIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`
}

const CheckIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5"/></svg>`
}

const SparklesIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>`
}

const ChevronDownIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>`
}

const BoltIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>`
}

const ArrowPathIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.5 12a7.5 7.5 0 0015 0 7.5 7.5 0 00-15 0zm6-3l1.5 1.5L10.5 12 12 13.5"/></svg>`
}

const PlayIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg>`
}

const CogIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.240.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
}

// Props
const props = defineProps({
  uploadedFiles: {
    type: Array,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  autoStart: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits([
  'detection-complete',
  'delta-processing-start',
  'full-processing-start',
  'results-reused'
])

// Composables
const notificationStore = useNotificationStore()
const api = useApi()

// Reactive state
const isDetecting = ref(false)
const detectionComplete = ref(false)
const detectionResults = ref(null)
const changeAnalysis = ref(null)
const detectionProgress = ref(0)
const elapsedTime = ref(0)
const expandedSections = ref([])
const showAllChanges = ref(false)
const showAdvancedOptions = ref(false)
const startingDeltaProcessing = ref(false)
const reusingResults = ref(false)

const detectionOptions = ref({
  sensitivity: 'medium',
  confidenceThreshold: 0.7,
  deepAnalysis: true,
  includeMetadata: false
})

const analysisStats = ref({
  filesAnalyzed: 0,
  totalFiles: 0,
  changesDetected: 0,
  confidenceScore: 0
})

const currentStep = ref({
  label: 'Initializing...',
  progress: 0
})

const detectionSteps = [
  { key: 'checksum', label: 'Calculating file checksums...', duration: 2000 },
  { key: 'compare', label: 'Comparing with previous sessions...', duration: 3000 },
  { key: 'analyze', label: 'Analyzing changes...', duration: 4000 },
  { key: 'confidence', label: 'Calculating confidence scores...', duration: 1500 },
  { key: 'complete', label: 'Detection complete', duration: 500 }
]

// Computed properties
const canStartDetection = computed(() => {
  return props.uploadedFiles.length > 0 && !isDetecting.value
})

const changeCategories = computed(() => {
  if (!changeAnalysis.value) return []
  
  return [
    {
      key: 'new',
      title: 'New Employees',
      icon: 'UserPlusIcon',
      count: changeAnalysis.value.newEmployees,
      changes: changeAnalysis.value.newEmployeeChanges || []
    },
    {
      key: 'modified',
      title: 'Modified Records',
      icon: 'PencilSquareIcon',
      count: changeAnalysis.value.modifiedEmployees,
      changes: changeAnalysis.value.modifiedEmployeeChanges || []
    },
    {
      key: 'removed',
      title: 'Removed Employees',
      icon: 'UserMinusIcon',
      count: changeAnalysis.value.removedEmployees,
      changes: changeAnalysis.value.removedEmployeeChanges || []
    }
  ]
})

// Methods
const getStatusIcon = () => {
  if (isDetecting.value) return 'MagnifyingGlassIcon'
  if (detectionComplete.value && detectionResults.value) {
    switch (detectionResults.value.matchType) {
      case 'exact_match': return 'CheckIcon'
      case 'partial_match': return 'ExclamationTriangleIcon'
      case 'no_match': return 'XMarkIcon'
      case 'multiple_matches': return 'QuestionMarkCircleIcon'
      default: return 'InformationCircleIcon'
    }
  }
  return 'MagnifyingGlassIcon'
}

const getStatusIconClass = () => {
  if (isDetecting.value) return 'detecting'
  if (detectionComplete.value && detectionResults.value) {
    switch (detectionResults.value.matchType) {
      case 'exact_match': return 'success'
      case 'partial_match': return 'warning'
      case 'no_match': return 'error'
      case 'multiple_matches': return 'info'
      default: return 'neutral'
    }
  }
  return 'neutral'
}

const getStatusMessage = () => {
  if (isDetecting.value) return currentStep.value.label
  if (detectionComplete.value && detectionResults.value) {
    return `Analysis complete - ${getMatchTypeTitle(detectionResults.value.matchType)}`
  }
  return 'Ready to analyze uploaded files for changes'
}

const getMatchTypeIcon = (matchType) => {
  const iconMap = {
    'exact_match': 'CheckIcon',
    'partial_match': 'ExclamationTriangleIcon',
    'no_match': 'XMarkIcon',
    'multiple_matches': 'QuestionMarkCircleIcon'
  }
  return iconMap[matchType] || 'InformationCircleIcon'
}

const getMatchTypeTitle = (matchType) => {
  const titleMap = {
    'exact_match': 'Exact Match Found',
    'partial_match': 'Partial Match Found',
    'no_match': 'No Previous Match',
    'multiple_matches': 'Multiple Matches Found'
  }
  return titleMap[matchType] || 'Unknown Match Type'
}

const getMatchTypeDescription = (matchType) => {
  const descriptionMap = {
    'exact_match': 'Identical files found in a previous processing session',
    'partial_match': 'Some files match a previous session, but others have changed',
    'no_match': 'No matching files found in previous sessions',
    'multiple_matches': 'Multiple potential base sessions found - review needed'
  }
  return descriptionMap[matchType] || 'Unknown match type'
}

const getRecommendationTitle = (recommendation) => {
  const titleMap = {
    'skip_processing': 'Reuse Previous Results',
    'delta_processing': 'Delta Processing Recommended',
    'full_processing': 'Full Processing Required',
    'review_required': 'Manual Review Required'
  }
  return titleMap[recommendation] || 'Unknown Recommendation'
}

const getRecommendationDescription = (recommendation) => {
  const descriptionMap = {
    'skip_processing': 'Files are identical - previous results can be reused without processing',
    'delta_processing': 'Use optimized processing to handle only the changes',
    'full_processing': 'Process all files normally - no optimizations available',
    'review_required': 'Multiple base sessions found - select the appropriate one'
  }
  return descriptionMap[recommendation] || 'Unknown recommendation'
}

const getConfidenceClass = (confidence) => {
  if (confidence >= 0.9) return 'confidence-high'
  if (confidence >= 0.7) return 'confidence-medium'
  return 'confidence-low'
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60
  return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const startDetection = async () => {
  isDetecting.value = true
  detectionComplete.value = false
  detectionResults.value = null
  changeAnalysis.value = null
  detectionProgress.value = 0
  elapsedTime.value = 0
  
  // Reset stats
  analysisStats.value = {
    filesAnalyzed: 0,
    totalFiles: props.uploadedFiles.length,
    changesDetected: 0,
    confidenceScore: 0
  }
  
  try {
    // Start timer
    const startTime = Date.now()
    const timer = setInterval(() => {
      elapsedTime.value = Math.floor((Date.now() - startTime) / 1000)
    }, 1000)
    
    // Execute detection steps
    let totalProgress = 0
    for (let i = 0; i < detectionSteps.length; i++) {
      const step = detectionSteps[i]
      currentStep.value = step
      
      // Simulate step processing
      await simulateStep(step, i)
      
      totalProgress += (100 / detectionSteps.length)
      detectionProgress.value = Math.min(Math.round(totalProgress), 100)
    }
    
    clearInterval(timer)
    
    // Perform actual delta detection
    await performDeltaDetection()
    
    detectionComplete.value = true
    
    emit('detection-complete', {
      results: detectionResults.value,
      changeAnalysis: changeAnalysis.value
    })
    
  } catch (error) {
    console.error('Detection failed:', error)
    notificationStore.addError('Change detection failed: ' + error.message)
  } finally {
    isDetecting.value = false
  }
}

const simulateStep = async (step, stepIndex) => {
  // Simulate actual processing for each step
  const startTime = Date.now()
  
  while (Date.now() - startTime < step.duration) {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Update stats based on step
    switch (step.key) {
      case 'checksum':
        analysisStats.value.filesAnalyzed = Math.min(
          Math.floor(((Date.now() - startTime) / step.duration) * props.uploadedFiles.length),
          props.uploadedFiles.length
        )
        break
      case 'compare':
        analysisStats.value.confidenceScore = Math.min(
          (Date.now() - startTime) / step.duration,
          1.0
        )
        break
      case 'analyze':
        analysisStats.value.changesDetected = Math.floor(
          ((Date.now() - startTime) / step.duration) * 15 // Simulate finding changes
        )
        break
    }
  }
}

const performDeltaDetection = async () => {
  try {
    // Calculate checksums for uploaded files
    const checksums = await calculateFileChecksums()
    
    // Call delta detection API
    const response = await api.detectDeltaFiles({
      car_checksum: checksums.car,
      receipt_checksum: checksums.receipt,
      exclude_session_id: props.sessionId
    })
    
    detectionResults.value = response
    
    // If we have results, analyze changes
    if (response.baseSession && response.matchType !== 'exact_match') {
      changeAnalysis.value = await analyzeChanges(response.baseSession.sessionId)
    }
    
  } catch (error) {
    throw new Error('Failed to perform delta detection: ' + error.message)
  }
}

const calculateFileChecksums = async () => {
  // Mock checksum calculation - in real implementation, this would calculate actual checksums
  return {
    car: 'a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234',
    receipt: 'f6e5d4c3b2a1987654321098765432109876543210fedcba0987654321098765'
  }
}

const analyzeChanges = async (baseSessionId) => {
  // Mock change analysis - in real implementation, this would compare actual data
  return {
    totalChanges: 12,
    newEmployees: 3,
    modifiedEmployees: 7,
    removedEmployees: 2,
    newEmployeeChanges: [
      {
        id: 'new1',
        employeeName: 'John Smith',
        description: 'New employee added',
        impact: 'low'
      }
    ],
    modifiedEmployeeChanges: [
      {
        id: 'mod1',
        employeeName: 'Jane Doe',
        description: 'Amount changed from $150.00 to $175.00',
        impact: 'medium'
      }
    ],
    removedEmployeeChanges: [
      {
        id: 'rem1',
        employeeName: 'Bob Johnson',
        description: 'Employee removed from current data',
        impact: 'high'
      }
    ]
  }
}

const cancelDetection = () => {
  isDetecting.value = false
  notificationStore.addInfo('Change detection cancelled')
}

const toggleSection = (sectionKey) => {
  const index = expandedSections.value.indexOf(sectionKey)
  if (index > -1) {
    expandedSections.value.splice(index, 1)
  } else {
    expandedSections.value.push(sectionKey)
  }
}

const selectAlternativeSession = (session) => {
  notificationStore.addInfo(`Selected ${session.sessionName} as base session`)
  // Update detection results with new base session
  if (detectionResults.value) {
    detectionResults.value.baseSession = session
  }
}

const calculateSessionConfidence = (session) => {
  // Calculate confidence based on recency, success rate, etc.
  const now = new Date()
  const sessionDate = new Date(session.createdAt)
  const daysDiff = (now - sessionDate) / (1000 * 60 * 60 * 24)
  
  let confidence = 0.8
  if (daysDiff < 1) confidence += 0.15
  else if (daysDiff < 7) confidence += 0.1
  else if (daysDiff < 30) confidence += 0.05
  
  const successRate = session.processedEmployees / session.totalEmployees
  confidence += successRate * 0.2
  
  return Math.min(confidence, 1.0)
}

const startDeltaProcessing = async () => {
  startingDeltaProcessing.value = true
  
  try {
    notificationStore.addSuccess('Starting delta processing...')
    emit('delta-processing-start', {
      baseSession: detectionResults.value.baseSession,
      changeAnalysis: changeAnalysis.value
    })
  } finally {
    startingDeltaProcessing.value = false
  }
}

const startFullProcessing = () => {
  notificationStore.addInfo('Starting full processing...')
  emit('full-processing-start')
}

const reuseResults = async () => {
  reusingResults.value = true
  
  try {
    notificationStore.addSuccess('Reusing previous results...')
    emit('results-reused', {
      baseSession: detectionResults.value.baseSession
    })
  } finally {
    reusingResults.value = false
  }
}

const runNewDetection = () => {
  detectionComplete.value = false
  detectionResults.value = null
  changeAnalysis.value = null
  startDetection()
}

// Lifecycle
onMounted(() => {
  if (props.autoStart && canStartDetection.value) {
    startDetection()
  }
})

// Watch for file changes
watch(() => props.uploadedFiles, (newFiles) => {
  if (newFiles.length > 0 && !isDetecting.value && !detectionComplete.value) {
    if (props.autoStart) {
      startDetection()
    }
  }
}, { deep: true })
</script>

<style scoped>
.smart-change-detector {
  @apply space-y-6;
}

/* Detection Header */
.detection-header {
  @apply flex items-center justify-between p-6 bg-white border border-gray-200 rounded-lg shadow-sm;
}

.header-info {
  @apply flex items-center gap-4;
}

.detection-icon {
  @apply w-12 h-12 rounded-full flex items-center justify-center transition-colors;
}

.detection-icon.detecting {
  @apply bg-blue-100 text-blue-600 animate-pulse;
}

.detection-icon.success {
  @apply bg-green-100 text-green-600;
}

.detection-icon.warning {
  @apply bg-yellow-100 text-yellow-600;
}

.detection-icon.error {
  @apply bg-red-100 text-red-600;
}

.detection-icon.info {
  @apply bg-blue-100 text-blue-600;
}

.detection-icon.neutral {
  @apply bg-gray-100 text-gray-600;
}

.detection-title {
  @apply text-xl font-bold text-gray-900;
}

.detection-subtitle {
  @apply text-gray-600;
}

.detection-controls {
  @apply flex gap-2;
}

.start-detection-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50;
}

.cancel-detection-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700;
}

/* Detection Progress */
.detection-progress {
  @apply bg-white border border-gray-200 rounded-lg p-6;
}

.progress-header {
  @apply flex justify-between items-center mb-4;
}

.progress-label {
  @apply font-medium text-gray-900;
}

.progress-time {
  @apply text-sm text-gray-500 font-mono;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-3 mb-4;
}

.progress-fill {
  @apply bg-blue-600 h-3 rounded-full transition-all duration-300;
}

.progress-details {
  @apply grid grid-cols-3 gap-4;
}

.detail-item {
  @apply text-center;
}

.detail-label {
  @apply block text-sm text-gray-500 mb-1;
}

.detail-value {
  @apply font-semibold text-gray-900;
}

/* Detection Results */
.detection-results {
  @apply space-y-6;
}

.results-summary {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.summary-card {
  @apply bg-white border rounded-lg p-6;
}

.summary-card.match-exact_match {
  @apply border-green-300 bg-green-50;
}

.summary-card.match-partial_match {
  @apply border-yellow-300 bg-yellow-50;
}

.summary-card.match-no_match {
  @apply border-red-300 bg-red-50;
}

.summary-card.match-multiple_matches {
  @apply border-blue-300 bg-blue-50;
}

.summary-icon {
  @apply w-12 h-12 rounded-full flex items-center justify-center mb-4;
}

.match-exact_match .summary-icon {
  @apply bg-green-100 text-green-600;
}

.match-partial_match .summary-icon {
  @apply bg-yellow-100 text-yellow-600;
}

.match-no_match .summary-icon {
  @apply bg-red-100 text-red-600;
}

.match-multiple_matches .summary-icon {
  @apply bg-blue-100 text-blue-600;
}

.summary-title {
  @apply text-lg font-bold text-gray-900 mb-2;
}

.summary-description {
  @apply text-gray-600 mb-4;
}

.confidence-score {
  @apply absolute top-4 right-4 px-2 py-1 text-sm font-bold rounded-full;
}

.confidence-high {
  @apply bg-green-100 text-green-800;
}

.confidence-medium {
  @apply bg-yellow-100 text-yellow-800;
}

.confidence-low {
  @apply bg-red-100 text-red-800;
}

/* Processing Recommendation */
.processing-recommendation {
  @apply bg-white border border-blue-200 rounded-lg p-6;
}

.recommendation-header {
  @apply flex items-center gap-2 mb-4;
}

.recommendation-label {
  @apply font-semibold text-blue-800;
}

.recommendation-title {
  @apply text-lg font-bold text-gray-900 mb-2;
}

.recommendation-description {
  @apply text-gray-600 mb-2;
}

.time-estimate {
  @apply text-sm text-blue-600 font-medium;
}

/* Base Session Details */
.base-session-details {
  @apply bg-white border border-gray-200 rounded-lg p-6;
}

.session-header {
  @apply flex justify-between items-center mb-4;
}

.session-title {
  @apply text-lg font-bold text-gray-900;
}

.session-date {
  @apply text-sm text-gray-500;
}

.session-grid {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.session-info {
  @apply space-y-3;
}

.info-item {
  @apply flex justify-between items-center;
}

.info-label {
  @apply text-gray-600;
}

.info-value {
  @apply font-medium text-gray-900;
}

.status-badge {
  @apply px-2 py-1 text-xs font-bold rounded-full;
}

.status-completed {
  @apply bg-green-100 text-green-800;
}

/* File Comparisons */
.file-comparisons {
  @apply bg-gray-50 rounded-lg p-4;
}

.comparison-header {
  @apply mb-4;
}

.comparison-title {
  @apply font-semibold text-gray-700;
}

.comparison-grid {
  @apply space-y-3;
}

.file-comparison {
  @apply flex justify-between items-center p-3 bg-white rounded border;
}

.file-comparison.file-match {
  @apply border-green-300 bg-green-50;
}

.file-type {
  @apply font-medium text-gray-700;
}

.match-status {
  @apply flex items-center gap-2 text-sm;
}

/* Change Analysis */
.change-analysis {
  @apply bg-white border border-gray-200 rounded-lg p-6;
}

.analysis-header {
  @apply flex justify-between items-center mb-6;
}

.analysis-title {
  @apply text-lg font-bold text-gray-900;
}

.analysis-metrics {
  @apply flex gap-6;
}

.metric {
  @apply text-center;
}

.metric-value {
  @apply block text-2xl font-bold text-gray-900;
}

.metric-label {
  @apply text-sm text-gray-600;
}

/* Change Breakdown */
.change-breakdown {
  @apply space-y-4;
}

.breakdown-section {
  @apply border border-gray-200 rounded-lg overflow-hidden;
}

.section-header {
  @apply flex justify-between items-center p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors;
}

.section-info {
  @apply flex items-center gap-3;
}

.section-title {
  @apply font-medium text-gray-900;
}

.change-count {
  @apply text-sm text-gray-500;
}

.section-content {
  @apply p-4 bg-white;
}

.change-list {
  @apply space-y-3;
}

.change-item {
  @apply flex justify-between items-start p-3 bg-gray-50 rounded-lg;
}

.change-info {
  @apply flex-1;
}

.change-employee {
  @apply font-medium text-gray-900;
}

.change-description {
  @apply text-sm text-gray-600;
}

.change-impact {
  @apply px-2 py-1 text-xs font-bold rounded-full;
}

.impact-low {
  @apply bg-green-100 text-green-800;
}

.impact-medium {
  @apply bg-yellow-100 text-yellow-800;
}

.impact-high {
  @apply bg-red-100 text-red-800;
}

.show-more {
  @apply text-center pt-3;
}

.show-more-btn {
  @apply text-sm text-blue-600 hover:text-blue-800 underline;
}

/* Alternative Sessions */
.alternative-sessions {
  @apply bg-white border border-gray-200 rounded-lg p-6;
}

.alternatives-header {
  @apply flex justify-between items-center mb-4;
}

.alternatives-title {
  @apply text-lg font-bold text-gray-900;
}

.alternatives-count {
  @apply text-sm text-gray-500;
}

.alternatives-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.alternative-session {
  @apply p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors;
}

.session-name {
  @apply font-medium text-gray-900 mb-2;
}

.session-meta {
  @apply flex justify-between items-center text-sm text-gray-600 mb-2;
}

.session-confidence {
  @apply text-sm font-medium text-blue-600;
}

/* Action Buttons */
.action-buttons {
  @apply flex flex-wrap gap-3;
}

.action-btn {
  @apply flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors;
}

.action-btn.primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50;
}

.action-btn.success {
  @apply bg-green-600 text-white hover:bg-green-700 disabled:opacity-50;
}

.action-btn.secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.action-btn.tertiary {
  @apply bg-purple-600 text-white hover:bg-purple-700;
}

.action-btn.outline {
  @apply border border-gray-300 text-gray-700 hover:bg-gray-50;
}

/* Advanced Options */
.advanced-options {
  @apply bg-gray-50 border border-gray-200 rounded-lg p-6;
}

.options-header {
  @apply mb-4;
}

.options-title {
  @apply text-lg font-bold text-gray-900;
}

.options-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-6;
}

.option-group {
  @apply space-y-2;
}

.option-label {
  @apply block text-sm font-medium text-gray-700;
}

.option-select {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.option-slider {
  @apply w-full;
}

.threshold-value {
  @apply text-sm font-medium text-gray-900 ml-2;
}

.option-checkbox {
  @apply flex items-center gap-2;
}

.checkbox-label {
  @apply text-sm text-gray-700;
}

/* Responsive */
@media (max-width: 768px) {
  .detection-header {
    @apply flex-col gap-4;
  }
  
  .results-summary {
    @apply grid-cols-1;
  }
  
  .session-grid {
    @apply grid-cols-1;
  }
  
  .analysis-metrics {
    @apply flex-wrap gap-3;
  }
  
  .alternatives-grid {
    @apply grid-cols-1;
  }
  
  .action-buttons {
    @apply flex-col;
  }
  
  .options-grid {
    @apply grid-cols-1;
  }
}
</style>