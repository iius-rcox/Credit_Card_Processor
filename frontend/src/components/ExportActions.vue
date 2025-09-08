<template>
  <div class="card">
    <!-- Export Section Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Export Results</h3>
        <p class="text-sm text-gray-600 mt-1">
          Generate reports and export data in various formats
        </p>
      </div>

      <!-- Export All Button -->
      <button
        v-if="canExport && !hasActiveExports"
        :disabled="isExportingAll"
        class="btn btn-primary"
        @click="exportAll"
      >
        <svg
          v-if="isExportingAll"
          class="w-4 h-4 mr-2 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <svg
          v-else
          class="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          ></path>
        </svg>
        Export All
      </button>
    </div>

    <!-- Export Status Message -->
    <div
      v-if="!canExport"
      class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md"
    >
      <div class="flex items-center">
        <svg
          class="w-5 h-5 text-yellow-400 mr-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <h4 class="text-sm font-medium text-yellow-800">
            Exports Not Available
          </h4>
          <p class="text-sm text-yellow-700 mt-1">
            Complete processing successfully to enable exports.
          </p>
        </div>
      </div>
    </div>

    <!-- Export Buttons Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- pVault CSV Export -->
      <div class="export-card">
        <div class="export-card-header">
          <div class="flex items-center">
            <div class="export-icon bg-green-100 text-green-600">
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
            <div class="ml-3">
              <h4 class="font-medium text-gray-900">pVault CSV</h4>
              <p class="text-sm text-gray-600">Integration format</p>
            </div>
          </div>
        </div>

        <div class="export-card-body">
          <p class="text-sm text-gray-600 mb-4">
            CSV format for pVault system integration with employee data ready
            for import.
          </p>

          <!-- Progress Bar -->
          <div v-if="pvaultStatus.status === 'exporting'" class="mb-4">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: pvaultStatus.progress + '%' }"
              ></div>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ pvaultStatus.progress }}% Complete
            </p>
          </div>

          <!-- Export Button -->
          <button
            :disabled="!canExport || pvaultStatus.status === 'exporting'"
            class="w-full btn"
            :class="getExportButtonClass('pvault')"
            @click="exportPVault"
          >
            <component
              :is="getExportButtonIcon('pvault')"
              class="w-4 h-4 mr-2"
            />
            {{ getExportButtonText('pvault') }}
          </button>

          <!-- Error Message -->
          <div v-if="pvaultStatus.error" class="mt-2 text-xs text-red-600">
            {{ pvaultStatus.error }}
          </div>
        </div>
      </div>

      <!-- Follow-up Excel Export -->
      <div class="export-card">
        <div class="export-card-header">
          <div class="flex items-center">
            <div class="export-icon bg-blue-100 text-blue-600">
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
            <div class="ml-3">
              <h4 class="font-medium text-gray-900">Follow-up Excel</h4>
              <p class="text-sm text-gray-600">Action items</p>
            </div>
          </div>
        </div>

        <div class="export-card-body">
          <p class="text-sm text-gray-600 mb-4">
            Excel spreadsheet with follow-up actions and employee issues
            requiring attention.
          </p>

          <!-- Progress Bar -->
          <div v-if="followupStatus.status === 'exporting'" class="mb-4">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: followupStatus.progress + '%' }"
              ></div>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ followupStatus.progress }}% Complete
            </p>
          </div>

          <!-- Export Button -->
          <button
            :disabled="!canExport || followupStatus.status === 'exporting'"
            class="w-full btn"
            :class="getExportButtonClass('followup')"
            @click="exportFollowup"
          >
            <component
              :is="getExportButtonIcon('followup')"
              class="w-4 h-4 mr-2"
            />
            {{ getExportButtonText('followup') }}
          </button>

          <!-- Error Message -->
          <div v-if="followupStatus.error" class="mt-2 text-xs text-red-600">
            {{ followupStatus.error }}
          </div>
        </div>
      </div>

      <!-- Issues Report Export -->
      <div class="export-card">
        <div class="export-card-header">
          <div class="flex items-center">
            <div class="export-icon bg-orange-100 text-orange-600">
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
            <div class="ml-3">
              <h4 class="font-medium text-gray-900">Issues Report</h4>
              <p class="text-sm text-gray-600">Detailed analysis</p>
            </div>
          </div>
        </div>

        <div class="export-card-body">
          <p class="text-sm text-gray-600 mb-4">
            Comprehensive PDF report with detailed analysis of processing issues
            and resolutions.
          </p>

          <!-- Progress Bar -->
          <div v-if="issuesStatus.status === 'exporting'" class="mb-4">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: issuesStatus.progress + '%' }"
              ></div>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ issuesStatus.progress }}% Complete
            </p>
          </div>

          <!-- Export Button -->
          <button
            :disabled="!canExport || issuesStatus.status === 'exporting'"
            class="w-full btn"
            :class="getExportButtonClass('issues')"
            @click="exportIssues"
          >
            <component
              :is="getExportButtonIcon('issues')"
              class="w-4 h-4 mr-2"
            />
            {{ getExportButtonText('issues') }}
          </button>

          <!-- Error Message -->
          <div v-if="issuesStatus.error" class="mt-2 text-xs text-red-600">
            {{ issuesStatus.error }}
          </div>
        </div>
      </div>
    </div>

    <!-- Export History -->
    <div v-if="exportHistory.length > 0" class="border-t pt-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-medium text-gray-900">Recent Exports</h4>
        <button
          class="text-sm text-gray-500 hover:text-gray-700"
          @click="clearHistory"
        >
          Clear History
        </button>
      </div>

      <div class="space-y-2">
        <div
          v-for="export_ in exportHistory.slice(0, 5)"
          :key="export_.id"
          class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
        >
          <div class="flex items-center">
            <div
              class="export-type-badge"
              :class="getExportTypeBadgeClass(export_.type)"
            >
              {{ getExportTypeLabel(export_.type) }}
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-900">
                {{ export_.filename }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatTimestamp(export_.timestamp) }} •
                {{ formatFileSize(export_.size) }}
              </p>
            </div>
          </div>

          <button
            class="text-sm text-primary-600 hover:text-primary-700"
            @click="redownloadExport(export_)"
          >
            Re-download
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, h } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useApi } from '@/composables/useApi'

// Stores and composables
const sessionStore = useSessionStore()
const api = useApi()

// Reactive state
const isExportingAll = ref(false)
const retryCount = ref({})

// Computed properties
const canExport = computed(() => sessionStore.canExport)
const hasActiveExports = computed(() => sessionStore.hasActiveExports)
const exportHistory = computed(() => sessionStore.exportHistory)

// Export status computed properties
const pvaultStatus = computed(() => sessionStore.getExportStatus('pvault'))
const followupStatus = computed(() => sessionStore.getExportStatus('followup'))
const issuesStatus = computed(() => sessionStore.getExportStatus('issues'))

// Export methods
async function exportPVault() {
  await performExport('pvault', 'exportPVault')
}

async function exportFollowup() {
  await performExport('followup', 'exportFollowup')
}

async function exportIssues() {
  await performExport('issues', 'exportIssues')
}

async function exportAll() {
  isExportingAll.value = true

  try {
    const exports = ['pvault', 'followup', 'issues']
    const promises = exports.map(type => {
      const apiMethod = {
        pvault: 'exportPVault',
        followup: 'exportFollowup',
        issues: 'exportIssues',
      }[type]

      return performExport(type, apiMethod)
    })

    await Promise.allSettled(promises)
  } finally {
    isExportingAll.value = false
  }
}

async function performExport(exportType, apiMethodName) {
  if (!sessionStore.sessionId) {
    console.error('No active session')
    return
  }

  try {
    // Set exporting status
    sessionStore.setExportStatus(exportType, 'exporting', 0)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      const currentStatus = sessionStore.getExportStatus(exportType)
      if (currentStatus.status === 'exporting' && currentStatus.progress < 90) {
        sessionStore.setExportStatus(
          exportType,
          'exporting',
          currentStatus.progress + 10
        )
      }
    }, 200)

    // Call API method
    const result = await api[apiMethodName](sessionStore.sessionId)

    // Clear progress interval
    clearInterval(progressInterval)

    // Complete the progress
    sessionStore.setExportStatus(exportType, 'exporting', 100)

    // Create blob URL and trigger download
    const blobUrl = URL.createObjectURL(result.blob)
    downloadFile(blobUrl, result.filename)

    // Add to export history
    sessionStore.addExportToHistory({
      type: exportType,
      filename: result.filename,
      size: result.blob.size,
      url: blobUrl,
    })

    // Auto-cleanup blob URL after 5 minutes to prevent memory leaks
    // Users should download within this time window
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl)
        console.debug(`Auto-revoked blob URL for ${result.filename} after 5 minutes`)
      } catch (e) {
        // Ignore errors if URL was already revoked
        console.debug('Blob URL was already revoked or invalid:', e.message)
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Set completed status
    sessionStore.setExportStatus(exportType, 'completed')

    // Reset retry count
    retryCount.value[exportType] = 0
  } catch (error) {
    console.error(`Export ${exportType} failed:`, error)

    // Set error status
    sessionStore.setExportStatus(exportType, 'error', 0, error.message)

    // Increment retry count
    retryCount.value[exportType] = (retryCount.value[exportType] || 0) + 1
  }
}

function downloadFile(blobUrl, filename) {
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function redownloadExport(exportItem) {
  if (exportItem.url) {
    downloadFile(exportItem.url, exportItem.filename)
  }
}

function clearHistory() {
  sessionStore.clearExportHistory()
}

// UI helper methods
function getExportButtonClass(exportType) {
  const status = sessionStore.getExportStatus(exportType)

  switch (status.status) {
    case 'exporting':
      return 'btn-secondary cursor-wait'
    case 'completed':
      return 'btn-success'
    case 'error':
      return 'btn-danger'
    default:
      return canExport.value ? 'btn-primary' : 'btn-secondary'
  }
}

function getExportButtonText(exportType) {
  const status = sessionStore.getExportStatus(exportType)

  switch (status.status) {
    case 'exporting':
      return 'Generating...'
    case 'completed':
      return 'Export Again'
    case 'error': {
      const retries = retryCount.value[exportType] || 0
      return retries > 0 ? `Retry (${retries})` : 'Retry Export'
    }
    default:
      return 'Export'
  }
}

function getExportButtonIcon(exportType) {
  const status = sessionStore.getExportStatus(exportType)

  if (status.status === 'exporting') {
    return h(
      'svg',
      {
        class: 'animate-spin',
        fill: 'none',
        viewBox: '0 0 24 24',
      },
      [
        h('circle', {
          class: 'opacity-25',
          cx: '12',
          cy: '12',
          r: '10',
          stroke: 'currentColor',
          'stroke-width': '4',
        }),
        h('path', {
          class: 'opacity-75',
          fill: 'currentColor',
          d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
        }),
      ]
    )
  }

  return h(
    'svg',
    {
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24',
    },
    [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
      }),
    ]
  )
}

function getExportTypeBadgeClass(exportType) {
  const classMap = {
    pvault: 'bg-green-100 text-green-800',
    followup: 'bg-blue-100 text-blue-800',
    issues: 'bg-orange-100 text-orange-800',
  }

  return classMap[exportType] || 'bg-gray-100 text-gray-800'
}

function getExportTypeLabel(exportType) {
  const labelMap = {
    pvault: 'CSV',
    followup: 'Excel',
    issues: 'PDF',
  }

  return labelMap[exportType] || exportType.toUpperCase()
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString()
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.export-card {
  @apply bg-white border border-gray-200 rounded-lg overflow-hidden;
}

.export-card-header {
  @apply p-4 border-b border-gray-100 bg-gray-50;
}

.export-card-body {
  @apply p-4;
}

.export-icon {
  @apply w-10 h-10 rounded-lg flex items-center justify-center;
}

.export-type-badge {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium;
}
</style>
