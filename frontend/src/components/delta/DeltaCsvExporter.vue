<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Delta Export</h3>
          <p class="text-sm text-gray-600 mt-1">
            Export only new and changed employee records
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="exportStatus" :class="statusClasses" class="px-2 py-1 rounded-full text-xs font-medium">
            {{ exportStatus }}
          </span>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Export Options -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Export Configuration</h4>
        
        <!-- Change Types Selection -->
        <div class="space-y-3">
          <label class="text-sm font-medium text-gray-700">Include Change Types:</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input 
                v-model="exportConfig.includeAdded"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
              <span class="ml-3 text-sm text-gray-700">
                Added Employees <span class="text-blue-600 font-medium">({{ stats.added }})</span>
              </span>
            </label>
            <label class="flex items-center">
              <input 
                v-model="exportConfig.includeModified"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
              <span class="ml-3 text-sm text-gray-700">
                Modified Employees <span class="text-yellow-600 font-medium">({{ stats.modified }})</span>
              </span>
            </label>
            <label class="flex items-center">
              <input 
                v-model="exportConfig.includeRemoved"
                type="checkbox" 
                class="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
              <span class="ml-3 text-sm text-gray-700">
                Removed Employees <span class="text-red-600 font-medium">({{ stats.removed }})</span>
              </span>
            </label>
            <label class="flex items-center">
              <input 
                v-model="exportConfig.includeUnchanged"
                type="checkbox" 
                class="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
              <span class="ml-3 text-sm text-gray-700">
                Unchanged Employees <span class="text-green-600 font-medium">({{ stats.unchanged }})</span>
              </span>
            </label>
          </div>
        </div>

        <!-- Export Format -->
        <div class="space-y-3">
          <label class="text-sm font-medium text-gray-700">Export Format:</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input 
                v-model="exportConfig.format"
                value="delta-only"
                type="radio" 
                class="border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
              <span class="ml-3 text-sm text-gray-700">
                Delta Only - Only changed records with change indicators
              </span>
            </label>
            <label class="flex items-center">
              <input 
                v-model="exportConfig.format"
                value="full-snapshot"
                type="radio" 
                class="border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
              <span class="ml-3 text-sm text-gray-700">
                Full Snapshot - Complete employee data for selected changes
              </span>
            </label>
            <label class="flex items-center">
              <input 
                v-model="exportConfig.format"
                value="comparison"
                type="radio" 
                class="border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
              <span class="ml-3 text-sm text-gray-700">
                Comparison - Before/after values for modified records
              </span>
            </label>
          </div>
        </div>

        <!-- Additional Options -->
        <div class="space-y-3">
          <label class="text-sm font-medium text-gray-700">Additional Options:</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input 
                v-model="exportConfig.includeTimestamp"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
              <span class="ml-3 text-sm text-gray-700">Include analysis timestamp</span>
            </label>
            <label class="flex items-center">
              <input 
                v-model="exportConfig.includeSessionInfo"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
              <span class="ml-3 text-sm text-gray-700">Include session metadata</span>
            </label>
            <label class="flex items-center">
              <input 
                v-model="exportConfig.includeConfidenceScore"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
              <span class="ml-3 text-sm text-gray-700">Include confidence scores</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Export Preview -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Export Preview</h4>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-sm text-gray-600 space-y-1">
            <div>Records to export: <span class="font-medium text-gray-900">{{ estimatedRecordCount }}</span></div>
            <div>Estimated file size: <span class="font-medium text-gray-900">{{ estimatedFileSize }}</span></div>
            <div>Export format: <span class="font-medium text-gray-900">{{ formatDescription }}</span></div>
          </div>
        </div>
      </div>

      <!-- Custom Fields Selection -->
      <div v-if="availableFields.length > 0" class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Field Selection</h4>
        <div class="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
          <label 
            v-for="field in availableFields" 
            :key="field.name"
            class="flex items-center"
          >
            <input 
              v-model="exportConfig.selectedFields"
              :value="field.name"
              type="checkbox" 
              class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
            <span class="ml-2 text-sm text-gray-700 truncate" :title="field.description">
              {{ field.label }}
            </span>
          </label>
        </div>
        <div class="flex justify-between text-sm">
          <button 
            @click="selectAllFields"
            class="text-blue-600 hover:text-blue-700"
          >
            Select All
          </button>
          <button 
            @click="selectEssentialFields"
            class="text-blue-600 hover:text-blue-700"
          >
            Essential Fields Only
          </button>
          <button 
            @click="clearFieldSelection"
            class="text-red-600 hover:text-red-700"
          >
            Clear All
          </button>
        </div>
      </div>

      <!-- Export Actions -->
      <div class="flex items-center justify-between pt-4 border-t">
        <div class="text-sm text-gray-600">
          <span v-if="lastExportDate">
            Last export: {{ formatDate(lastExportDate) }}
          </span>
        </div>
        
        <div class="flex items-center space-x-3">
          <button 
            @click="previewExport"
            :disabled="!canExport || isExporting"
            class="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview
          </button>
          <button 
            @click="exportToCsv"
            :disabled="!canExport || isExporting"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              canExport && !isExporting
                ? 'text-white bg-blue-600 hover:bg-blue-700'
                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
            ]"
          >
            <span v-if="isExporting" class="flex items-center space-x-2">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Exporting...</span>
            </span>
            <span v-else>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Export Progress -->
      <div v-if="isExporting" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-blue-900">Export Progress</span>
          <span class="text-sm text-blue-700">{{ exportProgress }}%</span>
        </div>
        <div class="w-full bg-blue-200 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: exportProgress + '%' }"
          ></div>
        </div>
        <p class="text-xs text-blue-600 mt-2">{{ exportStatusMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'

export default {
  name: 'DeltaCsvExporter',
  props: {
    baseSession: {
      type: Object,
      required: true
    },
    comparison: {
      type: Object,
      required: true
    },
    employeeChanges: {
      type: Object,
      required: true
    },
    availableFields: {
      type: Array,
      default: () => [
        { name: 'employee_id', label: 'Employee ID', essential: true },
        { name: 'name', label: 'Name', essential: true },
        { name: 'email', label: 'Email', essential: true },
        { name: 'department', label: 'Department', essential: false },
        { name: 'position', label: 'Position', essential: false },
        { name: 'hire_date', label: 'Hire Date', essential: false },
        { name: 'salary', label: 'Salary', essential: false },
        { name: 'expense_total', label: 'Expense Total', essential: true },
        { name: 'receipt_count', label: 'Receipt Count', essential: false },
        { name: 'missing_receipts', label: 'Missing Receipts', essential: true },
        { name: 'coding_issues', label: 'Coding Issues', essential: true },
        { name: 'data_mismatches', label: 'Data Mismatches', essential: true }
      ]
    }
  },
  emits: ['export-complete', 'export-error', 'preview-data'],
  setup(props, { emit }) {
    // Reactive data
    const isExporting = ref(false)
    const exportStatus = ref('')
    const exportProgress = ref(0)
    const exportStatusMessage = ref('')
    const lastExportDate = ref(null)

    // Export configuration
    const exportConfig = ref({
      includeAdded: true,
      includeModified: true,
      includeRemoved: false,
      includeUnchanged: false,
      format: 'delta-only',
      includeTimestamp: true,
      includeSessionInfo: true,
      includeConfidenceScore: false,
      selectedFields: ['employee_id', 'name', 'email', 'expense_total', 'missing_receipts', 'coding_issues', 'data_mismatches']
    })

    // Computed properties
    const stats = computed(() => ({
      added: props.employeeChanges.added?.length || 0,
      modified: props.employeeChanges.modified?.length || 0,
      removed: props.employeeChanges.removed?.length || 0,
      unchanged: props.employeeChanges.unchanged?.length || 0
    }))

    const estimatedRecordCount = computed(() => {
      let count = 0
      if (exportConfig.value.includeAdded) count += stats.value.added
      if (exportConfig.value.includeModified) count += stats.value.modified
      if (exportConfig.value.includeRemoved) count += stats.value.removed
      if (exportConfig.value.includeUnchanged) count += stats.value.unchanged
      
      // For comparison format, modified records are doubled (before/after)
      if (exportConfig.value.format === 'comparison') {
        count += stats.value.modified
      }
      
      return count
    })

    const estimatedFileSize = computed(() => {
      const avgBytesPerRecord = 200 // Estimate
      const totalBytes = estimatedRecordCount.value * avgBytesPerRecord * exportConfig.value.selectedFields.length / 10
      
      if (totalBytes < 1024) return `${totalBytes} B`
      if (totalBytes < 1024 * 1024) return `${Math.round(totalBytes / 1024)} KB`
      return `${Math.round(totalBytes / (1024 * 1024) * 10) / 10} MB`
    })

    const formatDescription = computed(() => {
      const descriptions = {
        'delta-only': 'Only changed fields with change indicators',
        'full-snapshot': 'Complete employee records',
        'comparison': 'Before/after comparison for changes'
      }
      return descriptions[exportConfig.value.format]
    })

    const canExport = computed(() => {
      return (
        (exportConfig.value.includeAdded || exportConfig.value.includeModified || 
         exportConfig.value.includeRemoved || exportConfig.value.includeUnchanged) &&
        exportConfig.value.selectedFields.length > 0 &&
        estimatedRecordCount.value > 0
      )
    })

    const statusClasses = computed(() => {
      switch (exportStatus.value) {
        case 'Exporting':
          return 'bg-blue-100 text-blue-800'
        case 'Complete':
          return 'bg-green-100 text-green-800'
        case 'Error':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    })

    // Methods
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const selectAllFields = () => {
      exportConfig.value.selectedFields = props.availableFields.map(field => field.name)
    }

    const selectEssentialFields = () => {
      exportConfig.value.selectedFields = props.availableFields
        .filter(field => field.essential)
        .map(field => field.name)
    }

    const clearFieldSelection = () => {
      exportConfig.value.selectedFields = []
    }

    const buildExportData = () => {
      const data = []
      const timestamp = new Date().toISOString()

      // Helper function to create base record
      const createBaseRecord = (employee, changeType) => {
        const record = {}
        
        // Add selected fields
        exportConfig.value.selectedFields.forEach(fieldName => {
          record[fieldName] = employee[fieldName] || ''
        })

        // Add delta-specific fields
        record.change_type = changeType
        
        if (exportConfig.value.includeTimestamp) {
          record.analysis_timestamp = timestamp
        }
        
        if (exportConfig.value.includeSessionInfo) {
          record.base_session_id = props.baseSession.session_id
          record.base_session_name = props.baseSession.session_name
        }
        
        if (exportConfig.value.includeConfidenceScore) {
          record.confidence_score = props.comparison.confidence_score
        }

        return record
      }

      // Add records based on configuration
      if (exportConfig.value.includeAdded) {
        props.employeeChanges.added.forEach(employee => {
          data.push(createBaseRecord(employee, 'ADDED'))
        })
      }

      if (exportConfig.value.includeModified) {
        props.employeeChanges.modified.forEach(employee => {
          if (exportConfig.value.format === 'comparison') {
            // Add before record
            const beforeRecord = createBaseRecord(employee.before || employee, 'BEFORE')
            beforeRecord.comparison_pair = employee.id
            data.push(beforeRecord)

            // Add after record  
            const afterRecord = createBaseRecord(employee.after || employee, 'AFTER')
            afterRecord.comparison_pair = employee.id
            data.push(afterRecord)
          } else {
            const record = createBaseRecord(employee, 'MODIFIED')
            
            // Add change details for delta-only format
            if (exportConfig.value.format === 'delta-only' && employee.changes) {
              record.changed_fields = employee.changes.map(c => c.field).join(', ')
              record.change_summary = employee.changes.length + ' field(s) changed'
            }
            
            data.push(record)
          }
        })
      }

      if (exportConfig.value.includeRemoved) {
        props.employeeChanges.removed.forEach(employee => {
          data.push(createBaseRecord(employee, 'REMOVED'))
        })
      }

      if (exportConfig.value.includeUnchanged) {
        props.employeeChanges.unchanged.forEach(employee => {
          data.push(createBaseRecord(employee, 'UNCHANGED'))
        })
      }

      return data
    }

    const convertToCsv = (data) => {
      if (data.length === 0) return ''

      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header] || ''
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value
          }).join(',')
        )
      ].join('\n')

      return csvContent
    }

    const downloadCsv = (csvContent, filename) => {
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(url)
    }

    const generateFilename = () => {
      const timestamp = new Date().toISOString().split('T')[0]
      const sessionName = props.baseSession.session_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'session'
      return `delta_export_${sessionName}_${timestamp}.csv`
    }

    const previewExport = () => {
      const data = buildExportData()
      const previewData = data.slice(0, 10) // Show first 10 records
      
      emit('preview-data', {
        data: previewData,
        totalRecords: data.length,
        config: exportConfig.value
      })
    }

    const exportToCsv = async () => {
      if (!canExport.value) return

      isExporting.value = true
      exportStatus.value = 'Exporting'
      exportProgress.value = 0
      exportStatusMessage.value = 'Preparing export data...'

      try {
        // Simulate progress updates
        const updateProgress = (progress, message) => {
          exportProgress.value = progress
          exportStatusMessage.value = message
        }

        updateProgress(20, 'Building export data...')
        await new Promise(resolve => setTimeout(resolve, 500))

        const data = buildExportData()
        
        updateProgress(50, 'Converting to CSV format...')
        await new Promise(resolve => setTimeout(resolve, 300))

        const csvContent = convertToCsv(data)
        
        updateProgress(80, 'Preparing download...')
        await new Promise(resolve => setTimeout(resolve, 200))

        const filename = generateFilename()
        downloadCsv(csvContent, filename)

        updateProgress(100, 'Export complete!')
        exportStatus.value = 'Complete'
        lastExportDate.value = new Date().toISOString()

        emit('export-complete', {
          filename,
          recordCount: data.length,
          fileSize: new Blob([csvContent]).size
        })

      } catch (error) {
        exportStatus.value = 'Error'
        exportStatusMessage.value = 'Export failed: ' + error.message
        
        emit('export-error', {
          error: error.message,
          config: exportConfig.value
        })
      } finally {
        setTimeout(() => {
          isExporting.value = false
          if (exportStatus.value !== 'Error') {
            exportStatus.value = ''
          }
        }, 2000)
      }
    }

    // Initialize essential fields selection
    onMounted(() => {
      selectEssentialFields()
    })

    return {
      // Reactive data
      isExporting,
      exportStatus,
      exportProgress,
      exportStatusMessage,
      lastExportDate,
      exportConfig,

      // Computed
      stats,
      estimatedRecordCount,
      estimatedFileSize,
      formatDescription,
      canExport,
      statusClasses,

      // Methods
      formatDate,
      selectAllFields,
      selectEssentialFields,
      clearFieldSelection,
      previewExport,
      exportToCsv
    }
  }
}
</script>