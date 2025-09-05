<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Multi-Format Export System</h3>
          <p class="text-sm text-gray-600 mt-1">
            Export data in PDF, Excel, JSON, and other formats with custom configurations
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
      <!-- Export Format Selection -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Export Format</h4>
        <div class="grid grid-cols-4 gap-4">
          <div 
            v-for="format in exportFormats" 
            :key="format.id"
            @click="selectFormat(format.id)"
            :class="[
              'p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
              selectedFormat === format.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <div class="text-center">
              <div class="mb-2">
                <svg :class="format.iconClass" class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="format.iconPath" />
                </svg>
              </div>
              <h5 class="text-sm font-semibold text-gray-900">{{ format.name }}</h5>
              <p class="text-xs text-gray-600 mt-1">{{ format.description }}</p>
              <div class="flex items-center justify-center mt-2 space-x-2">
                <span class="text-xs text-gray-500">{{ format.fileSize }}</span>
                <span v-if="format.features.length" class="text-xs text-blue-600">
                  {{ format.features.length }} features
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Format-Specific Options -->
      <div v-if="selectedFormat" class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">
          {{ getSelectedFormatName() }} Options
        </h4>

        <!-- PDF Options -->
        <div v-if="selectedFormat === 'pdf'" class="grid grid-cols-2 gap-6">
          <div class="space-y-4">
            <h5 class="text-sm font-medium text-gray-700">Layout & Design</h5>
            <div class="space-y-3">
              <div>
                <label class="text-sm text-gray-600">Page Size:</label>
                <select v-model="pdfOptions.pageSize" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="A4">A4 (8.27 × 11.69 in)</option>
                  <option value="Letter">Letter (8.5 × 11 in)</option>
                  <option value="Legal">Legal (8.5 × 14 in)</option>
                  <option value="A3">A3 (11.69 × 16.54 in)</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-600">Orientation:</label>
                <div class="mt-1 flex space-x-4">
                  <label class="flex items-center">
                    <input v-model="pdfOptions.orientation" value="portrait" type="radio" class="text-blue-600">
                    <span class="ml-2 text-sm">Portrait</span>
                  </label>
                  <label class="flex items-center">
                    <input v-model="pdfOptions.orientation" value="landscape" type="radio" class="text-blue-600">
                    <span class="ml-2 text-sm">Landscape</span>
                  </label>
                </div>
              </div>
              <div>
                <label class="text-sm text-gray-600">Template:</label>
                <select v-model="pdfOptions.template" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="standard">Standard Report</option>
                  <option value="executive">Executive Summary</option>
                  <option value="detailed">Detailed Analysis</option>
                  <option value="compliance">Compliance Report</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <h5 class="text-sm font-medium text-gray-700">Content Options</h5>
            <div class="space-y-2">
              <label class="flex items-center">
                <input v-model="pdfOptions.includeSummary" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include executive summary</span>
              </label>
              <label class="flex items-center">
                <input v-model="pdfOptions.includeCharts" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include charts and graphs</span>
              </label>
              <label class="flex items-center">
                <input v-model="pdfOptions.includeDetails" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include detailed data tables</span>
              </label>
              <label class="flex items-center">
                <input v-model="pdfOptions.includeMetadata" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include export metadata</span>
              </label>
              <label class="flex items-center">
                <input v-model="pdfOptions.includeWatermark" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Add watermark</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Excel Options -->
        <div v-else-if="selectedFormat === 'excel'" class="grid grid-cols-2 gap-6">
          <div class="space-y-4">
            <h5 class="text-sm font-medium text-gray-700">Workbook Structure</h5>
            <div class="space-y-3">
              <div>
                <label class="text-sm text-gray-600">Sheet Organization:</label>
                <select v-model="excelOptions.sheetStructure" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="single">Single Sheet</option>
                  <option value="byCategory">Separate by Category</option>
                  <option value="byEmployee">Separate by Employee</option>
                  <option value="byDate">Separate by Date Range</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-600">Data Format:</label>
                <select v-model="excelOptions.dataFormat" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="table">Formatted Table</option>
                  <option value="raw">Raw Data</option>
                  <option value="pivot">Pivot Table Ready</option>
                  <option value="dashboard">Dashboard Format</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-600">File Format:</label>
                <select v-model="excelOptions.fileFormat" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="xlsx">Excel 2007+ (.xlsx)</option>
                  <option value="xls">Excel 97-2003 (.xls)</option>
                  <option value="csv">CSV (.csv)</option>
                  <option value="ods">OpenDocument (.ods)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <h5 class="text-sm font-medium text-gray-700">Features & Formatting</h5>
            <div class="space-y-2">
              <label class="flex items-center">
                <input v-model="excelOptions.includeFormulas" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include calculation formulas</span>
              </label>
              <label class="flex items-center">
                <input v-model="excelOptions.includeCharts" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include embedded charts</span>
              </label>
              <label class="flex items-center">
                <input v-model="excelOptions.enableFilters" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Enable auto-filters</span>
              </label>
              <label class="flex items-center">
                <input v-model="excelOptions.freezeHeaders" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Freeze header rows</span>
              </label>
              <label class="flex items-center">
                <input v-model="excelOptions.applyFormatting" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Apply cell formatting</span>
              </label>
              <label class="flex items-center">
                <input v-model="excelOptions.includeMetadata" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include document properties</span>
              </label>
            </div>
          </div>
        </div>

        <!-- JSON Options -->
        <div v-else-if="selectedFormat === 'json'" class="grid grid-cols-2 gap-6">
          <div class="space-y-4">
            <h5 class="text-sm font-medium text-gray-700">JSON Structure</h5>
            <div class="space-y-3">
              <div>
                <label class="text-sm text-gray-600">Format Style:</label>
                <select v-model="jsonOptions.format" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="pretty">Pretty Print (Human Readable)</option>
                  <option value="compact">Compact (Minified)</option>
                  <option value="streaming">Streaming (Large Datasets)</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-600">Data Structure:</label>
                <select v-model="jsonOptions.structure" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="flat">Flat Array</option>
                  <option value="nested">Nested Objects</option>
                  <option value="grouped">Grouped by Category</option>
                  <option value="hierarchical">Hierarchical Structure</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-600">Date Format:</label>
                <select v-model="jsonOptions.dateFormat" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="iso">ISO 8601 (2024-03-15T10:30:00Z)</option>
                  <option value="timestamp">Unix Timestamp</option>
                  <option value="readable">Human Readable</option>
                  <option value="custom">Custom Format</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <h5 class="text-sm font-medium text-gray-700">Advanced Options</h5>
            <div class="space-y-2">
              <label class="flex items-center">
                <input v-model="jsonOptions.includeSchema" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include JSON Schema</span>
              </label>
              <label class="flex items-center">
                <input v-model="jsonOptions.includeMetadata" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include export metadata</span>
              </label>
              <label class="flex items-center">
                <input v-model="jsonOptions.validateData" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Validate data integrity</span>
              </label>
              <label class="flex items-center">
                <input v-model="jsonOptions.compressOutput" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Compress output (gzip)</span>
              </label>
              <label class="flex items-center">
                <input v-model="jsonOptions.includeComments" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include field descriptions</span>
              </label>
            </div>
          </div>
        </div>

        <!-- CSV Options -->
        <div v-else-if="selectedFormat === 'csv'" class="grid grid-cols-2 gap-6">
          <div class="space-y-4">
            <h5 class="text-sm font-medium text-gray-700">CSV Format</h5>
            <div class="space-y-3">
              <div>
                <label class="text-sm text-gray-600">Delimiter:</label>
                <select v-model="csvOptions.delimiter" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-600">Text Qualifier:</label>
                <select v-model="csvOptions.textQualifier" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="\"">Double Quote (")</option>
                  <option value="'">Single Quote (')</option>
                  <option value="">None</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-600">Encoding:</label>
                <select v-model="csvOptions.encoding" class="mt-1 w-full text-sm border-gray-300 rounded-md">
                  <option value="utf8">UTF-8</option>
                  <option value="utf16">UTF-16</option>
                  <option value="ascii">ASCII</option>
                  <option value="iso88591">ISO-8859-1</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <h5 class="text-sm font-medium text-gray-700">Content Options</h5>
            <div class="space-y-2">
              <label class="flex items-center">
                <input v-model="csvOptions.includeHeaders" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include column headers</span>
              </label>
              <label class="flex items-center">
                <input v-model="csvOptions.includeRowNumbers" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Include row numbers</span>
              </label>
              <label class="flex items-center">
                <input v-model="csvOptions.escapeNewlines" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Escape newlines in text</span>
              </label>
              <label class="flex items-center">
                <input v-model="csvOptions.trimWhitespace" type="checkbox" class="rounded border-gray-300 text-blue-600">
                <span class="ml-2 text-sm text-gray-700">Trim whitespace</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Source Selection -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Data Source</h4>
        <div class="grid grid-cols-2 gap-6">
          <div>
            <label class="text-sm font-medium text-gray-700">Data Set:</label>
            <select v-model="dataSource.type" class="mt-1 w-full text-sm border-gray-300 rounded-md">
              <option value="current_session">Current Processing Session</option>
              <option value="all_sessions">All Sessions</option>
              <option value="date_range">Date Range</option>
              <option value="custom_query">Custom Query</option>
              <option value="filtered_data">Filtered Results</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700">Record Count:</label>
            <div class="mt-1 flex items-center space-x-2">
              <input 
                v-model.number="dataSource.limit"
                type="number"
                min="1"
                placeholder="All records"
                class="flex-1 text-sm border-gray-300 rounded-md"
              >
              <span class="text-xs text-gray-500">records</span>
            </div>
          </div>
        </div>

        <!-- Date Range (if applicable) -->
        <div v-if="dataSource.type === 'date_range'" class="grid grid-cols-2 gap-6">
          <div>
            <label class="text-sm font-medium text-gray-700">From Date:</label>
            <input 
              v-model="dataSource.fromDate"
              type="date"
              class="mt-1 w-full text-sm border-gray-300 rounded-md"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700">To Date:</label>
            <input 
              v-model="dataSource.toDate"
              type="date"
              class="mt-1 w-full text-sm border-gray-300 rounded-md"
            >
          </div>
        </div>
      </div>

      <!-- Field Selection -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-md font-semibold text-gray-900">Field Selection</h4>
          <div class="flex items-center space-x-2">
            <button 
              @click="selectAllFields"
              class="text-sm text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            <button 
              @click="selectEssentialFields"
              class="text-sm text-blue-600 hover:text-blue-700"
            >
              Essential Only
            </button>
            <button 
              @click="clearFieldSelection"
              class="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto border rounded-lg p-4">
          <label 
            v-for="field in availableFields" 
            :key="field.name"
            class="flex items-center space-x-2"
          >
            <input 
              v-model="selectedFields"
              :value="field.name"
              type="checkbox" 
              class="rounded border-gray-300 text-blue-600"
            >
            <span class="text-sm text-gray-700 truncate" :title="field.description">
              {{ field.label }}
            </span>
          </label>
        </div>
      </div>

      <!-- Export Preview -->
      <div class="space-y-4">
        <h4 class="text-md font-semibold text-gray-900">Export Preview</h4>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Format:</span>
              <span class="ml-2 text-gray-900">{{ getSelectedFormatName() }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Fields:</span>
              <span class="ml-2 text-gray-900">{{ selectedFields.length }} selected</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Estimated Size:</span>
              <span class="ml-2 text-gray-900">{{ estimatedFileSize }}</span>
            </div>
          </div>
          
          <div class="mt-3 pt-3 border-t border-gray-200">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Filename:</span>
              <div class="flex items-center space-x-2">
                <input 
                  v-model="exportConfig.filename"
                  type="text"
                  placeholder="Auto-generated"
                  class="text-sm border-gray-300 rounded-md"
                >
                <span class="text-sm text-gray-500">.{{ getFileExtension() }}</span>
              </div>
            </div>
          </div>

          <!-- Advanced Preview -->
          <div v-if="showAdvancedPreview" class="mt-4 pt-4 border-t border-gray-200">
            <div class="text-xs text-gray-600 space-y-2">
              <div>Compression: {{ getCompressionInfo() }}</div>
              <div>Processing Time: {{ estimatedProcessingTime }}</div>
              <div>Memory Usage: {{ estimatedMemoryUsage }}</div>
              <div>Compatibility: {{ getCompatibilityInfo() }}</div>
            </div>
          </div>
          
          <button 
            @click="showAdvancedPreview = !showAdvancedPreview"
            class="mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            {{ showAdvancedPreview ? 'Hide' : 'Show' }} Advanced Details
          </button>
        </div>
      </div>

      <!-- Export Actions -->
      <div class="flex items-center justify-between pt-4 border-t">
        <div class="text-sm text-gray-600">
          {{ getTotalRecordCount() }} records ready for export
        </div>
        
        <div class="flex items-center space-x-3">
          <button 
            @click="previewExport"
            :disabled="!canExport || isProcessing"
            class="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview
          </button>
          <button 
            @click="saveAsTemplate"
            :disabled="!canExport"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save as Template
          </button>
          <button 
            @click="exportData"
            :disabled="!canExport || isProcessing"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              canExport && !isProcessing
                ? 'text-white bg-blue-600 hover:bg-blue-700'
                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
            ]"
          >
            <span v-if="isProcessing" class="flex items-center space-x-2">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Exporting...</span>
            </span>
            <span v-else>Export {{ getSelectedFormatName() }}</span>
          </button>
        </div>
      </div>

      <!-- Export Progress -->
      <div v-if="isProcessing" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
        <p class="text-xs text-blue-600 mt-2">{{ exportProgressMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'

export default {
  name: 'MultiFormatExporter',
  props: {
    sessionData: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['export-completed', 'export-error', 'template-saved'],
  setup(props, { emit }) {
    // Reactive data
    const selectedFormat = ref('')
    const exportStatus = ref('')
    const isProcessing = ref(false)
    const exportProgress = ref(0)
    const exportProgressMessage = ref('')
    const showAdvancedPreview = ref(false)
    
    // Field selection
    const selectedFields = ref([
      'employee_id', 'employee_name', 'expense_date', 
      'amount', 'category', 'merchant'
    ])

    // Export configuration
    const exportConfig = ref({
      filename: ''
    })

    // Data source configuration
    const dataSource = ref({
      type: 'current_session',
      limit: null,
      fromDate: '',
      toDate: ''
    })

    // Format-specific options
    const pdfOptions = ref({
      pageSize: 'A4',
      orientation: 'portrait',
      template: 'standard',
      includeSummary: true,
      includeCharts: true,
      includeDetails: true,
      includeMetadata: false,
      includeWatermark: false
    })

    const excelOptions = ref({
      sheetStructure: 'single',
      dataFormat: 'table',
      fileFormat: 'xlsx',
      includeFormulas: false,
      includeCharts: false,
      enableFilters: true,
      freezeHeaders: true,
      applyFormatting: true,
      includeMetadata: false
    })

    const jsonOptions = ref({
      format: 'pretty',
      structure: 'flat',
      dateFormat: 'iso',
      includeSchema: false,
      includeMetadata: true,
      validateData: true,
      compressOutput: false,
      includeComments: false
    })

    const csvOptions = ref({
      delimiter: ',',
      textQualifier: '"',
      encoding: 'utf8',
      includeHeaders: true,
      includeRowNumbers: false,
      escapeNewlines: true,
      trimWhitespace: true
    })

    // Export formats configuration
    const exportFormats = [
      {
        id: 'pdf',
        name: 'PDF Report',
        description: 'Professional formatted reports',
        fileSize: 'Medium',
        features: ['Charts', 'Formatting', 'Print-ready'],
        iconClass: 'text-red-500',
        iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
      },
      {
        id: 'excel',
        name: 'Excel Workbook',
        description: 'Spreadsheet with formulas',
        fileSize: 'Large',
        features: ['Formulas', 'Charts', 'Multi-sheet'],
        iconClass: 'text-green-500',
        iconPath: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z'
      },
      {
        id: 'json',
        name: 'JSON Data',
        description: 'Structured data format',
        fileSize: 'Small',
        features: ['API-ready', 'Structured', 'Lightweight'],
        iconClass: 'text-blue-500',
        iconPath: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
      },
      {
        id: 'csv',
        name: 'CSV File',
        description: 'Universal data format',
        fileSize: 'Small',
        features: ['Universal', 'Simple', 'Fast'],
        iconClass: 'text-gray-500',
        iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
      }
    ]

    // Available fields
    const availableFields = [
      { name: 'employee_id', label: 'Employee ID', description: 'Unique employee identifier', essential: true },
      { name: 'employee_name', label: 'Employee Name', description: 'Full employee name', essential: true },
      { name: 'expense_date', label: 'Expense Date', description: 'Date of expense', essential: true },
      { name: 'amount', label: 'Amount', description: 'Expense amount', essential: true },
      { name: 'category', label: 'Category', description: 'Expense category', essential: true },
      { name: 'merchant', label: 'Merchant', description: 'Merchant name', essential: true },
      { name: 'description', label: 'Description', description: 'Expense description', essential: false },
      { name: 'receipt_status', label: 'Receipt Status', description: 'Receipt availability', essential: false },
      { name: 'approval_status', label: 'Approval Status', description: 'Approval status', essential: false },
      { name: 'department', label: 'Department', description: 'Employee department', essential: false },
      { name: 'project_code', label: 'Project Code', description: 'Project identifier', essential: false },
      { name: 'tax_amount', label: 'Tax Amount', description: 'Tax portion', essential: false },
      { name: 'currency', label: 'Currency', description: 'Currency code', essential: false },
      { name: 'exchange_rate', label: 'Exchange Rate', description: 'Currency exchange rate', essential: false },
      { name: 'created_at', label: 'Created Date', description: 'Record creation date', essential: false },
      { name: 'updated_at', label: 'Updated Date', description: 'Last update date', essential: false }
    ]

    // Computed properties
    const statusClasses = computed(() => {
      switch (exportStatus.value) {
        case 'Processing':
          return 'bg-blue-100 text-blue-800'
        case 'Complete':
          return 'bg-green-100 text-green-800'
        case 'Error':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    })

    const canExport = computed(() => {
      return selectedFormat.value && selectedFields.value.length > 0
    })

    const estimatedFileSize = computed(() => {
      const recordCount = getTotalRecordCount()
      const fieldCount = selectedFields.value.length
      let bytesPerRecord = fieldCount * 50 // Base estimate

      switch (selectedFormat.value) {
        case 'pdf':
          bytesPerRecord *= 3 // PDFs are larger
          break
        case 'excel':
          bytesPerRecord *= 2.5 // Excel has overhead
          break
        case 'json':
          bytesPerRecord *= 1.5 // JSON has structure overhead
          break
        case 'csv':
          bytesPerRecord *= 1 // CSV is compact
          break
      }

      const totalBytes = recordCount * bytesPerRecord
      
      if (totalBytes < 1024) return `${totalBytes} B`
      if (totalBytes < 1024 * 1024) return `${Math.round(totalBytes / 1024)} KB`
      return `${Math.round(totalBytes / (1024 * 1024) * 10) / 10} MB`
    })

    const estimatedProcessingTime = computed(() => {
      const recordCount = getTotalRecordCount()
      let baseTime = Math.ceil(recordCount / 1000) // 1 second per 1000 records
      
      switch (selectedFormat.value) {
        case 'pdf':
          baseTime *= 3
          break
        case 'excel':
          baseTime *= 2
          break
        case 'json':
          baseTime *= 1.2
          break
        case 'csv':
          baseTime *= 1
          break
      }

      return baseTime < 60 ? `${baseTime}s` : `${Math.round(baseTime / 60)}m`
    })

    const estimatedMemoryUsage = computed(() => {
      const recordCount = getTotalRecordCount()
      const fieldCount = selectedFields.value.length
      const memoryMB = Math.ceil((recordCount * fieldCount * 100) / (1024 * 1024))
      return `${memoryMB}MB`
    })

    // Methods
    const selectFormat = (formatId) => {
      selectedFormat.value = formatId
      generateDefaultFilename()
    }

    const getSelectedFormatName = () => {
      const format = exportFormats.find(f => f.id === selectedFormat.value)
      return format?.name || 'Unknown'
    }

    const getFileExtension = () => {
      const extensions = {
        'pdf': 'pdf',
        'excel': excelOptions.value.fileFormat === 'csv' ? 'csv' : excelOptions.value.fileFormat,
        'json': jsonOptions.value.compressOutput ? 'json.gz' : 'json',
        'csv': 'csv'
      }
      return extensions[selectedFormat.value] || 'txt'
    }

    const getCompressionInfo = () => {
      switch (selectedFormat.value) {
        case 'json':
          return jsonOptions.value.compressOutput ? 'gzip enabled' : 'none'
        case 'pdf':
          return 'built-in compression'
        case 'excel':
          return 'zip-based compression'
        default:
          return 'none'
      }
    }

    const getCompatibilityInfo = () => {
      const compatibility = {
        'pdf': 'Adobe Reader, browsers, mobile',
        'excel': 'Microsoft Excel, Google Sheets, LibreOffice',
        'json': 'All programming languages, APIs',
        'csv': 'Universal - all applications'
      }
      return compatibility[selectedFormat.value] || 'Unknown'
    }

    const generateDefaultFilename = () => {
      const timestamp = new Date().toISOString().split('T')[0]
      const formatName = selectedFormat.value
      const sourceType = dataSource.value.type.replace('_', '-')
      exportConfig.value.filename = `export-${formatName}-${sourceType}-${timestamp}`
    }

    const getTotalRecordCount = () => {
      // Mock record count - in real implementation, this would be calculated based on data source
      switch (dataSource.value.type) {
        case 'current_session':
          return 156
        case 'all_sessions':
          return 2847
        case 'date_range':
          return 892
        case 'filtered_data':
          return 234
        default:
          return 0
      }
    }

    const selectAllFields = () => {
      selectedFields.value = availableFields.map(field => field.name)
    }

    const selectEssentialFields = () => {
      selectedFields.value = availableFields
        .filter(field => field.essential)
        .map(field => field.name)
    }

    const clearFieldSelection = () => {
      selectedFields.value = []
    }

    const previewExport = () => {
      // Generate preview data
      const previewData = {
        format: selectedFormat.value,
        fields: selectedFields.value,
        options: getFormatOptions(),
        sampleData: generateSampleData()
      }
      
      emit('preview-data', previewData)
    }

    const getFormatOptions = () => {
      switch (selectedFormat.value) {
        case 'pdf':
          return pdfOptions.value
        case 'excel':
          return excelOptions.value
        case 'json':
          return jsonOptions.value
        case 'csv':
          return csvOptions.value
        default:
          return {}
      }
    }

    const generateSampleData = () => {
      // Generate sample data for preview
      return [
        {
          employee_id: 'EMP001',
          employee_name: 'John Doe',
          expense_date: '2024-03-15',
          amount: 125.50,
          category: 'Business Meals',
          merchant: 'Restaurant ABC'
        },
        {
          employee_id: 'EMP002',
          employee_name: 'Jane Smith',
          expense_date: '2024-03-14',
          amount: 45.00,
          category: 'Transportation',
          merchant: 'Uber'
        }
      ]
    }

    const saveAsTemplate = () => {
      const template = {
        name: `${getSelectedFormatName()} Template`,
        format: selectedFormat.value,
        fields: selectedFields.value,
        options: getFormatOptions(),
        dataSource: dataSource.value,
        createdAt: new Date().toISOString()
      }

      emit('template-saved', template)
      exportStatus.value = 'Template Saved'
      
      setTimeout(() => {
        exportStatus.value = ''
      }, 2000)
    }

    const exportData = async () => {
      if (!canExport.value) return

      isProcessing.value = true
      exportStatus.value = 'Processing'
      exportProgress.value = 0
      exportProgressMessage.value = 'Initializing export...'

      try {
        // Simulate export process with progress updates
        const steps = [
          { message: 'Fetching data...', progress: 20 },
          { message: 'Processing records...', progress: 40 },
          { message: 'Applying formatting...', progress: 60 },
          { message: 'Generating file...', progress: 80 },
          { message: 'Finalizing export...', progress: 100 }
        ]

        for (const step of steps) {
          exportProgressMessage.value = step.message
          exportProgress.value = step.progress
          await new Promise(resolve => setTimeout(resolve, 800))
        }

        // Generate filename
        const filename = exportConfig.value.filename || 
          `export-${selectedFormat.value}-${Date.now()}`
        const fullFilename = `${filename}.${getFileExtension()}`

        // In real implementation, generate and download the actual file
        const exportResult = {
          filename: fullFilename,
          format: selectedFormat.value,
          recordCount: getTotalRecordCount(),
          fields: selectedFields.value,
          fileSize: estimatedFileSize.value,
          processingTime: estimatedProcessingTime.value,
          options: getFormatOptions()
        }

        exportStatus.value = 'Complete'
        emit('export-completed', exportResult)

      } catch (error) {
        exportStatus.value = 'Error'
        emit('export-error', {
          error: error.message,
          format: selectedFormat.value
        })
      } finally {
        setTimeout(() => {
          isProcessing.value = false
          exportStatus.value = ''
          exportProgress.value = 0
          exportProgressMessage.value = ''
        }, 2000)
      }
    }

    // Initialize with default format
    onMounted(() => {
      selectFormat('excel')
    })

    return {
      // Reactive data
      selectedFormat,
      exportStatus,
      isProcessing,
      exportProgress,
      exportProgressMessage,
      showAdvancedPreview,
      selectedFields,
      exportConfig,
      dataSource,
      pdfOptions,
      excelOptions,
      jsonOptions,
      csvOptions,
      exportFormats,
      availableFields,

      // Computed
      statusClasses,
      canExport,
      estimatedFileSize,
      estimatedProcessingTime,
      estimatedMemoryUsage,

      // Methods
      selectFormat,
      getSelectedFormatName,
      getFileExtension,
      getCompressionInfo,
      getCompatibilityInfo,
      getTotalRecordCount,
      selectAllFields,
      selectEssentialFields,
      clearFieldSelection,
      previewExport,
      saveAsTemplate,
      exportData
    }
  }
}
</script>