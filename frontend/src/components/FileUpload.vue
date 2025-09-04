<template>
  <div class="file-upload-container">
    <!-- Header -->
    <div class="card">
      <div class="text-center">
        <h2 class="text-2xl font-semibold text-gray-900" id="upload-section-title">
          Upload Documents
        </h2>
        <p class="mt-2 text-sm text-gray-600" id="upload-section-description">
          Upload both CAR and Receipt PDF files to begin processing. Maximum file sizes: CAR 100MB, Receipt 300MB.
        </p>
      </div>
    </div>

    <!-- File Upload Cards -->
    <div class="grid md:grid-cols-2 gap-6">
      <!-- CAR File Upload -->
      <div class="card">
        <div class="text-center">
          <h3 class="text-lg font-medium text-gray-900 mb-4" id="car-upload-title">
            CAR File
          </h3>

          <!-- Upload Zone -->
          <div
            :class="[
              'border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              carDragActive
                ? 'border-primary-500 bg-primary-50'
                : carFile
                  ? 'border-success-500 bg-success-50'
                  : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50',
            ]"
            role="button"
            tabindex="0"
            :aria-labelledby="carFile ? 'car-file-selected' : 'car-upload-instructions'"
            :aria-describedby="carFile ? 'car-file-info' : 'car-upload-help'"
            @drop.prevent="handleCarDrop"
            @dragover.prevent="handleDragOver"
            @dragenter.prevent="carDragActive = true"
            @dragleave.prevent="carDragActive = false"
            @click="triggerCarInput"
            @keydown.enter="triggerCarInput"
            @keydown.space.prevent="triggerCarInput"
          >
            <input
              ref="carInput"
              type="file"
              accept=".pdf,application/pdf"
              class="sr-only"
              aria-labelledby="car-upload-title"
              aria-describedby="car-upload-help"
              @change="handleCarSelect"
            />

            <div v-if="!carFile" class="space-y-2">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p 
                class="text-sm text-gray-600"
                id="car-upload-instructions"
              >
                {{ carDragActive ? 'Drop CAR file here' : 'Upload CAR PDF' }}
              </p>
              <p 
                class="text-xs text-gray-400"
                id="car-upload-help"
              >
                Click to browse or drag and drop a PDF file (maximum 100MB)
              </p>
            </div>

            <!-- Selected File Display -->
            <div v-else class="space-y-2">
              <svg
                class="mx-auto h-12 w-12 text-success-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clip-rule="evenodd"
                />
              </svg>
              <p 
                class="text-sm font-medium text-gray-900"
                id="car-file-selected"
              >
                CAR file selected: {{ carFile.name }}
              </p>
              <p 
                class="text-xs text-gray-500"
                id="car-file-info"
              >
                File size: {{ formatFileSize(carFile.size) }}
              </p>

              <button
                type="button"
                @click.stop="removeCarFile"
                class="inline-flex items-center px-2 py-1 text-xs text-error-600 hover:text-error-800 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 rounded touch-friendly"
                :aria-label="`Remove CAR file ${carFile.name}`"
              >
                <svg
                  class="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
                Remove
              </button>
            </div>
          </div>

          <!-- File Status -->
          <div v-if="carUploadStatus" class="mt-3">
            <div class="text-xs" :class="getStatusColor(carUploadStatus)">
              {{ getStatusText(carUploadStatus) }}
            </div>
            <div
              v-if="carUploadStatus === 'uploading'"
              class="w-full bg-gray-200 rounded-full h-1.5 mt-1"
            >
              <div
                class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: `${carProgress}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Receipt File Upload -->
      <div class="card">
        <div class="text-center">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Receipt File</h3>

          <!-- Upload Zone -->
          <div
            :class="[
              'border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all',
              receiptDragActive
                ? 'border-blue-500 bg-blue-50'
                : receiptFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
            ]"
            @drop.prevent="handleReceiptDrop"
            @dragover.prevent="handleDragOver"
            @dragenter.prevent="receiptDragActive = true"
            @dragleave.prevent="receiptDragActive = false"
            @click="triggerReceiptInput"
          >
            <input
              ref="receiptInput"
              type="file"
              accept=".pdf,application/pdf"
              class="hidden"
              @change="handleReceiptSelect"
            />

            <div v-if="!receiptFile" class="space-y-2">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p class="text-sm text-gray-600">
                {{
                  receiptDragActive
                    ? 'Drop Receipt file here'
                    : 'Upload Receipt PDF'
                }}
              </p>
              <p class="text-xs text-gray-400">Click to browse or drag and drop a PDF file (maximum 300MB)</p>
            </div>

            <!-- Selected File Display -->
            <div v-else class="space-y-2">
              <svg
                class="mx-auto h-12 w-12 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clip-rule="evenodd"
                />
              </svg>
              <p class="text-sm font-medium text-gray-900">
                {{ receiptFile.name }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatFileSize(receiptFile.size) }}
              </p>

              <button
                @click.stop="removeReceiptFile"
                class="inline-flex items-center px-2 py-1 text-xs text-red-600 hover:text-red-800"
              >
                <svg
                  class="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
                Remove
              </button>
            </div>
          </div>

          <!-- File Status -->
          <div v-if="receiptUploadStatus" class="mt-3">
            <div class="text-xs" :class="getStatusColor(receiptUploadStatus)">
              {{ getStatusText(receiptUploadStatus) }}
            </div>
            <div
              v-if="receiptUploadStatus === 'uploading'"
              class="w-full bg-gray-200 rounded-full h-1.5 mt-1"
            >
              <div
                class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: `${receiptProgress}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Delta Recognition Alert -->
    <div v-if="deltaAlert.show" 
         class="card" 
         :class="deltaAlert.matchType === 'exact' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'" 
         data-testid="delta-alert">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <svg v-if="deltaAlert.matchType === 'exact'" 
               class="w-5 h-5 text-red-500" 
               fill="currentColor" 
               viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <svg v-else 
               class="w-5 h-5 text-yellow-400" 
               fill="currentColor" 
               viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-medium" 
              :class="deltaAlert.matchType === 'exact' ? 'text-red-800' : 'text-yellow-800'">
            {{ deltaAlert.matchType === 'exact' ? 'Duplicate File Detection' : 'Delta Processing Alert' }}
          </h3>
          <div class="mt-2 text-sm" 
               :class="deltaAlert.matchType === 'exact' ? 'text-red-700' : 'text-yellow-700'">
            <p>{{ deltaAlert.message }}</p>
            <ul v-if="deltaAlert.details.length" class="mt-2 list-none space-y-1 text-xs font-mono">
              <li v-for="detail in deltaAlert.details" :key="detail" class="pl-4">{{ detail }}</li>
            </ul>
          </div>
          <div class="mt-3 flex items-center space-x-3">
            <label class="flex items-center text-sm text-yellow-800">
              <input
                v-model="processingOptions.enableDeltaProcessing"
                type="checkbox"
                class="mr-2 h-4 w-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
              />
              Enable delta processing for this upload
            </label>
          </div>
        </div>
        <button
          @click="dismissDeltaAlert"
          class="flex-shrink-0 text-yellow-400 hover:text-yellow-600"
          aria-label="Dismiss delta alert"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Processing Options -->
    <div class="card">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Processing Options</h3>
      
      <div class="space-y-4">
        <!-- Validation Options -->
        <div>
          <label class="flex items-center text-sm font-medium text-gray-700">
            <input
              v-model="processingOptions.enableValidation"
              type="checkbox"
              class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            Enable data validation
          </label>
          <p class="text-xs text-gray-500 mt-1">Validate extracted data for completeness and accuracy</p>
        </div>

        <!-- Auto-resolution -->
        <div>
          <label class="flex items-center text-sm font-medium text-gray-700">
            <input
              v-model="processingOptions.enableAutoResolution"
              type="checkbox"
              class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            Enable automatic issue resolution
          </label>
          <p class="text-xs text-gray-500 mt-1">Automatically attempt to resolve common data extraction issues</p>
        </div>

        <!-- Email Notifications -->
        <div>
          <label class="flex items-center text-sm font-medium text-gray-700">
            <input
              v-model="processingOptions.enableEmailNotifications"
              type="checkbox"
              class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            Send email notifications
          </label>
          <p class="text-xs text-gray-500 mt-1">Receive notifications when processing is complete</p>
        </div>

        <!-- Processing Priority -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Processing Priority</label>
          <select
            v-model="processingOptions.priority"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low - Process when resources are available</option>
            <option value="normal">Normal - Standard processing queue</option>
            <option value="high">High - Prioritize this processing job</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Upload Actions -->
    <div class="card">
      <div class="flex items-center justify-between">
        <!-- Status -->
        <div class="text-sm text-gray-600">
          <span v-if="!hasFiles"
            >Select both CAR and Receipt files to upload</span
          >
          <span v-else-if="isUploading">Uploading files...</span>
          <span v-else-if="uploadCompleted" class="text-green-600 font-medium">
            Upload completed successfully
          </span>
          <span v-else-if="hasFiles && !hasBothFiles" class="text-yellow-600">
            Both files required for upload
          </span>
          <span v-else-if="hasFiles" class="text-blue-600">
            Ready to upload
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-2">
          <button
            v-if="hasFiles && !isUploading"
            @click="clearFiles"
            class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear Files
          </button>

          <!-- Upload Button -->
          <button
            v-if="!uploadCompleted"
            :disabled="!canUpload"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center',
              canUpload
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            ]"
            @click="uploadFiles"
            data-testid="upload-button"
          >
            <svg
              v-if="isUploading"
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              v-else-if="!isUploading && canUpload"
              class="-ml-1 mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {{ isUploading ? 'Uploading...' : 'Upload Files' }}
          </button>

          <!-- Start Processing Button -->
          <button
            v-if="uploadCompleted"
            @click="startProcessing"
            :disabled="isProcessingStarted"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center',
              !isProcessingStarted
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            ]"
            data-testid="start-processing-button"
          >
            <svg
              v-if="isProcessingStarted"
              class="animate-spin -ml-1 mr-2 h-4 w-4"
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
              class="-ml-1 mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {{ isProcessingStarted ? 'Starting...' : 'Start Processing' }}
          </button>
        </div>
      </div>

      <!-- Overall Progress -->
      <div v-if="isUploading" class="mt-4">
        <div
          class="flex justify-between text-sm font-medium text-gray-900 mb-2"
        >
          <span>Upload Progress</span>
          <span>{{ Math.round((carProgress + receiptProgress) / 2) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{
              width: `${Math.round((carProgress + receiptProgress) / 2)}%`,
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useFileWorker } from '@/composables/useFileWorker'
import { useNotificationStore } from '@/stores/notification'

// Props
const props = defineProps({
  sessionId: {
    type: String,
    required: true,
  },
})

// Emits
const emit = defineEmits(['upload-complete', 'upload-error', 'processing-started'])

// Stores and composables
const sessionStore = useSessionStore()
const notificationStore = useNotificationStore()
const { calculateHash, validateFile, isWorkerSupported } = useFileWorker()

// File state
const carFile = ref(null)
const receiptFile = ref(null)
const carDragActive = ref(false)
const receiptDragActive = ref(false)

// Upload state
const isUploading = ref(false)
const carUploadStatus = ref(null)
const receiptUploadStatus = ref(null)
const carProgress = ref(0)
const receiptProgress = ref(0)
const isProcessingStarted = ref(false)

// File input refs
const carInput = ref(null)
const receiptInput = ref(null)

// Delta recognition
const deltaAlert = ref({
  show: false,
  message: '',
  details: []
})

// Processing options
const processingOptions = ref({
  enableValidation: true,
  enableAutoResolution: false,
  enableEmailNotifications: false,
  enableDeltaProcessing: false,
  priority: 'normal'
})

// Constants
const MAX_CAR_FILE_SIZE = 100 * 1024 * 1024 // 100MB for CAR files
const MAX_RECEIPT_FILE_SIZE = 300 * 1024 * 1024 // 300MB for Receipt files
const UPLOAD_TIMEOUT = 60 * 60 * 1000 // 1 hour for large files
const CHUNK_UPLOAD_TIMEOUT = 10 * 60 * 1000 // 10 minutes per chunk for large files

// Security utilities for comprehensive filename handling
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file.pdf'
  }
  
  // Remove or replace dangerous characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Windows forbidden chars
    .replace(/^\.+/, '') // Leading dots
    .replace(/\.+$/, '.pdf') // Trailing dots (keep extension)
    .replace(/\s+/g, '_') // Multiple spaces to single underscore
    .replace(/_+/g, '_') // Multiple underscores to single
    .replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
  
  // Prevent reserved names (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 
    'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 
    'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]
  
  const nameWithoutExt = sanitized.replace(/\.[^.]*$/, '')
  if (reservedNames.includes(nameWithoutExt.toUpperCase())) {
    sanitized = `file_${nameWithoutExt}.pdf`
  }
  
  // Ensure filename isn't too long (255 char limit on most filesystems)
  if (sanitized.length > 255) {
    const ext = '.pdf'
    sanitized = sanitized.substring(0, 255 - ext.length) + ext
  }
  
  // Ensure it has a valid extension
  if (!sanitized.toLowerCase().endsWith('.pdf')) {
    sanitized += '.pdf'
  }
  
  // Final fallback if sanitization failed
  if (!sanitized || sanitized === '.pdf') {
    sanitized = `upload_${Date.now()}.pdf`
  }
  
  return sanitized
}

function validateFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Filename is required and must be a string' }
  }
  
  // Length validation (Windows limit is 255 chars for filename, 260 for full path)
  if (filename.length < 1) {
    return { valid: false, error: 'Filename cannot be empty' }
  }
  
  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' }
  }
  
  // Windows forbidden characters: < > : " | ? * \0 and control chars (0x00-0x1F)
  // Also block path separators for security: \ /
  const forbiddenCharsPattern = /[<>:"|?*\\\\/\x00-\x1f]/
  if (forbiddenCharsPattern.test(filename)) {
    return { valid: false, error: 'Filename contains forbidden characters. Cannot contain: < > : " | ? * \\ / or control characters.' }
  }
  
  // Cannot end with dot or space (Windows restriction)
  if (filename.endsWith('.') || filename.endsWith(' ')) {
    return { valid: false, error: 'Filename cannot end with a dot or space' }
  }
  
  // Check for reserved Windows names (case-insensitive)
  const baseName = filename.split('.')[0].toUpperCase()
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(baseName)) {
    return { valid: false, error: `Filename cannot be a reserved Windows name: ${baseName}` }
  }
  
  // Ensure proper extension
  if (!filename.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Filename must have .pdf extension' }
  }
  
  return { valid: true, error: null }
}

// Centralized error handling system
const errorHandler = {
  // Error severity levels
  SEVERITY: {
    INFO: 'info',
    WARNING: 'warning', 
    ERROR: 'error',
    CRITICAL: 'critical'
  },
  
  // Error categories for consistent handling
  CATEGORY: {
    VALIDATION: 'validation',
    UPLOAD: 'upload',
    NETWORK: 'network',
    SECURITY: 'security',
    PROCESSING: 'processing'
  },
  
  // Handle error with consistent logging and user notification
  handle(error, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message || error,
      category: context.category || this.CATEGORY.VALIDATION,
      severity: context.severity || this.SEVERITY.ERROR,
      context: context.details || {},
      stack: error.stack
    }
    
    // Log error appropriately based on severity
    switch (errorInfo.severity) {
      case this.SEVERITY.CRITICAL:
      case this.SEVERITY.ERROR:
        console.error(`[${errorInfo.category.toUpperCase()}] ${errorInfo.message}`, errorInfo)
        break
      case this.SEVERITY.WARNING:
        console.warn(`[${errorInfo.category.toUpperCase()}] ${errorInfo.message}`, errorInfo)
        break
      default:
        console.log(`[${errorInfo.category.toUpperCase()}] ${errorInfo.message}`, errorInfo)
    }
    
    // Show user-friendly message based on category and severity
    const userMessage = this.getUserMessage(errorInfo)
    if (errorInfo.severity === this.SEVERITY.CRITICAL || errorInfo.severity === this.SEVERITY.ERROR) {
      sessionStore.setError(userMessage)
    } else if (errorInfo.severity === this.SEVERITY.WARNING) {
      sessionStore.setWarning?.(userMessage) || console.warn(userMessage)
    }
    
    return errorInfo
  },
  
  // Generate user-friendly error messages
  getUserMessage(errorInfo) {
    const baseMessage = errorInfo.message
    
    switch (errorInfo.category) {
      case this.CATEGORY.VALIDATION:
        return `File validation error: ${baseMessage}`
      case this.CATEGORY.UPLOAD:
        return `Upload failed: ${baseMessage}`
      case this.CATEGORY.NETWORK:
        return `Network error: ${baseMessage}. Please check your connection and try again.`
      case this.CATEGORY.SECURITY:
        return `Security error: ${baseMessage}`
      case this.CATEGORY.PROCESSING:
        return `Processing error: ${baseMessage}`
      default:
        return baseMessage
    }
  },
  
  // Create standardized error objects
  createError(message, category, severity = this.SEVERITY.ERROR, details = {}) {
    const error = new Error(message)
    error.category = category
    error.severity = severity  
    error.details = details
    return error
  }
}

// Computed
const hasFiles = computed(() => carFile.value || receiptFile.value)
const hasBothFiles = computed(() => carFile.value && receiptFile.value)
const canUpload = computed(
  () => hasBothFiles.value && !isUploading.value && props.sessionId
)
const uploadCompleted = computed(
  () =>
    carUploadStatus.value === 'completed' &&
    receiptUploadStatus.value === 'completed'
)

// File validation with enhanced security checks and consistent error handling
function validateUploadedFile(file, fileType = 'car') {
  if (!file) {
    return { 
      valid: false, 
      error: 'No file selected', 
      severity: errorHandler.SEVERITY.ERROR,
      category: errorHandler.CATEGORY.VALIDATION
    }
  }

  try {
    // Comprehensive filename sanitization to prevent path traversal and other attacks
    const sanitizedName = sanitizeFilename(file.name)
    if (sanitizedName !== file.name) {
      // Log filename sanitization for debugging but don't show to user (this is normal behavior)
      console.info(`[SECURITY] File name sanitized for security: ${file.name} -> ${sanitizedName}`)
    }
    
    // Additional security validation for filename
    const filenameValidation = validateFilename(sanitizedName)
    if (!filenameValidation.valid) {
      return {
        valid: false,
        error: `Invalid filename: ${filenameValidation.error}`,
        severity: errorHandler.SEVERITY.ERROR,
        category: errorHandler.CATEGORY.SECURITY,
        securityNote: 'Filename security validation failed'
      }
    }

    // Enhanced file type validation using multiple methods
    const hasValidExtension = file.name.toLowerCase().endsWith('.pdf')
    const hasValidMimeType = file.type === 'application/pdf'
    
    // Require both extension and MIME type for security
    if (!hasValidExtension || !hasValidMimeType) {
      return { 
        valid: false, 
        error: 'Only PDF files are allowed (both extension and MIME type must be PDF)',
        severity: errorHandler.SEVERITY.ERROR,
        category: errorHandler.CATEGORY.SECURITY,
        securityNote: 'File validation failed - potential security risk'
      }
    }

    // Enhanced size validation based on file type
    const maxSize = fileType === 'receipt' ? MAX_RECEIPT_FILE_SIZE : MAX_CAR_FILE_SIZE
    if (file.size > maxSize) {
      const maxSizeDisplay = fileType === 'receipt' ? '300MB' : '100MB'
      return { 
        valid: false, 
        error: `File size exceeds ${maxSizeDisplay} limit`,
        severity: errorHandler.SEVERITY.ERROR,
        category: errorHandler.CATEGORY.VALIDATION,
        serverValidationRequired: true
      }
    }

    if (file.size === 0) {
      return { 
        valid: false, 
        error: 'File is empty or corrupted',
        severity: errorHandler.SEVERITY.ERROR,
        category: errorHandler.CATEGORY.VALIDATION
      }
    }

    // Enhanced corruption detection
    if (file.size < 1000) {
      return { 
        valid: false, 
        error: 'File appears to be corrupted or invalid (too small for a valid PDF)',
        severity: errorHandler.SEVERITY.WARNING,
        category: errorHandler.CATEGORY.VALIDATION,
        serverValidationRequired: true
      }
    }

    // Check for suspiciously large files that might cause DoS
    const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024 // 50MB
    const requiresChunking = file.size > LARGE_FILE_THRESHOLD

    return { 
      valid: true, 
      error: null,
      sanitizedName,
      requiresChunking,
      serverValidationRequired: true, // Always require server-side validation
      securityChecks: {
        nameStandard: sanitizedName === file.name,
        extensionValid: hasValidExtension,
        mimeTypeValid: hasValidMimeType,
        sizeAppropriate: file.size >= 1000 && file.size <= (fileType === 'receipt' ? MAX_RECEIPT_FILE_SIZE : MAX_CAR_FILE_SIZE)
      }
    }
    
  } catch (error) {
    errorHandler.handle(error, {
      category: errorHandler.CATEGORY.VALIDATION,
      severity: errorHandler.SEVERITY.ERROR,
      details: { fileName: file.name, fileSize: file.size }
    })
    
    return {
      valid: false,
      error: 'File validation failed due to unexpected error',
      severity: errorHandler.SEVERITY.ERROR,
      category: errorHandler.CATEGORY.VALIDATION
    }
  }
}

// Enhanced delta recognition with content-based detection
async function checkForDeltaFiles(file, fileType) {
  try {
    console.log(`Starting delta detection for ${fileType}...`)
    
    // Calculate secure content hash of the current file
    const fileHash = await calculateFileHashWorker(file)
    console.log(`Generated hash for ${file.name}: ${fileHash.substring(0, 16)}...`)
    
    // Get recent sessions from session store to check for similar files
    const recentSessions = sessionStore.sessions || []
    const exactMatches = []
    const potentialMatches = []

    for (const session of recentSessions.slice(0, 20)) { // Check last 20 sessions for better detection
      if (session.uploaded_files) {
        for (const uploadedFile of session.uploaded_files) {
          if (uploadedFile.file_type === fileType) {
            
            // Check for exact hash match (identical files)
            if (uploadedFile.checksum && uploadedFile.checksum === fileHash) {
              exactMatches.push({
                sessionName: session.session_name,
                fileName: uploadedFile.original_filename,
                fileSize: uploadedFile.file_size,
                createdAt: session.created_at,
                matchType: 'exact'
              })
            }
            // Check for similar files (size-based heuristic as fallback)
            else if (uploadedFile.file_size) {
              const sizeDiff = Math.abs(file.size - uploadedFile.file_size) / Math.max(uploadedFile.file_size, 1)
              // Tightened similarity threshold for better accuracy
              if (sizeDiff < 0.05 && Math.abs(file.size - uploadedFile.file_size) < 10240) { // 5% or 10KB difference
                potentialMatches.push({
                  sessionName: session.session_name,
                  fileName: uploadedFile.original_filename,
                  fileSize: uploadedFile.file_size,
                  createdAt: session.created_at,
                  sizeDifference: Math.abs(file.size - uploadedFile.file_size),
                  matchType: 'similar'
                })
              }
            }
          }
        }
      }
    }

    // Prioritize exact matches over potential matches
    if (exactMatches.length > 0) {
      console.log(`Found ${exactMatches.length} exact matches for ${fileType}`)
      showDeltaAlert(fileType, exactMatches, 'exact')
    } else if (potentialMatches.length > 0) {
      console.log(`Found ${potentialMatches.length} potential matches for ${fileType}`)
      // Sort by smallest size difference for best matches first
      potentialMatches.sort((a, b) => a.sizeDifference - b.sizeDifference)
      showDeltaAlert(fileType, potentialMatches, 'similar')
    }
    
    // Store hash for future delta detection
    file._contentHash = fileHash
    
  } catch (error) {
    errorHandler.handle(error, {
      category: errorHandler.CATEGORY.PROCESSING,
      severity: errorHandler.SEVERITY.WARNING,
      details: { fileName: file.name, fileType }
    })
    // Don't let delta detection failures block file upload - continue gracefully
  }
}

async function calculateFileHashWorker(file) {
  // Use Web Worker for large file processing when available
  if (isWorkerSupported.value) {
    try {
      console.log(`Using Web Worker for hash calculation of ${file.name}`)
      
      // Show progress notification for large files
      let progressNotificationId = null
      if (file.size > 10 * 1024 * 1024) { // Files > 10MB
        progressNotificationId = notificationStore.addInfo('Processing large file...', {
          title: 'File Processing',
          duration: 0,
          dismissible: false
        })
      }
      
      const result = await calculateHash(file, (progress) => {
        console.log(`Hash calculation progress: ${progress.progress}% - ${progress.status}`)
      })
      
      // Remove progress notification
      if (progressNotificationId) {
        notificationStore.removeNotification(progressNotificationId)
        notificationStore.addSuccess(`File processed successfully: ${file.name}`, {
          title: 'Processing Complete'
        })
      }
      
      return result.hash
    } catch (error) {
      console.warn('Web Worker hash calculation failed, falling back to main thread:', error)
      notificationStore.addWarning('Using fallback processing method for better compatibility')
      return calculateFileHashMainThread(file)
    }
  } else {
    console.log(`Using main thread for hash calculation of ${file.name}`)
    return calculateFileHashMainThread(file)
  }
}

async function calculateFileHashMainThread(file) {
  // Enhanced hash using actual file content for security with proper memory management
  let contentToHash = null
  let samples = []
  let blobs = [] // Track blob references for cleanup
  let views = [] // Track typed array views for cleanup
  
  try {
    // For large files, use a sample-based approach to balance security and performance
    const SAMPLE_SIZE = 1024 * 1024 // 1MB sample for large files
    const CHUNK_SIZE = 64 * 1024 // 64KB chunks for reading
    
    if (file.size <= SAMPLE_SIZE) {
      // Small files: hash entire content
      contentToHash = await file.arrayBuffer()
    } else {
      // Large files: hash beginning, middle, and end samples
      const sampleSize = CHUNK_SIZE
      
      try {
        // Beginning sample
        const beginBlob = file.slice(0, sampleSize)
        blobs.push(beginBlob)
        const beginSample = await beginBlob.arrayBuffer()
        samples.push(beginSample)
        
        // Middle sample
        const midStart = Math.floor(file.size / 2) - Math.floor(sampleSize / 2)
        const midBlob = file.slice(midStart, midStart + sampleSize)
        blobs.push(midBlob)
        const midSample = await midBlob.arrayBuffer()
        samples.push(midSample)
        
        // End sample
        const endStart = Math.max(file.size - sampleSize, sampleSize * 2)
        const endBlob = file.slice(endStart)
        blobs.push(endBlob)
        const endSample = await endBlob.arrayBuffer()
        samples.push(endSample)
        
        // Combine samples with metadata for comprehensive hash
        const combinedSize = samples.reduce((total, sample) => total + sample.byteLength, 0) + 32
        contentToHash = new ArrayBuffer(combinedSize)
        const view = new Uint8Array(contentToHash)
        views.push(view)
        
        // Add file metadata to prevent simple content substitution
        const metadataBuffer = new TextEncoder().encode(`${file.name}-${file.size}-${file.type}`)
        const metadataSlice = metadataBuffer.slice(0, 32)
        view.set(metadataSlice, 0)
        
        // Add content samples
        let offset = 32
        for (const sample of samples) {
          const sampleView = new Uint8Array(sample)
          views.push(sampleView)
          view.set(sampleView, offset)
          offset += sample.byteLength
        }
        
      } catch (sampleError) {
        // Clean up samples on error
        samples = []
        throw sampleError
      }
    }
    
    // Generate secure hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', contentToHash)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const result = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Clean up memory
    contentToHash = null
    samples = []
    
    return result
    
  } catch (error) {
    errorHandler.handle(error, {
      category: errorHandler.CATEGORY.PROCESSING,
      severity: errorHandler.SEVERITY.WARNING,
      details: { fileName: file.name, fileSize: file.size }
    })
    
    // Clean up memory on error
    contentToHash = null
    samples = []
    
    // Fallback to metadata-only hash if content hashing fails
    try {
      const data = `${file.name}-${file.size}-${file.lastModified}-fallback`
      const encoder = new TextEncoder()
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (fallbackError) {
      errorHandler.handle(fallbackError, {
        category: errorHandler.CATEGORY.PROCESSING,
        severity: errorHandler.SEVERITY.ERROR,
        details: { fileName: file.name, message: 'Both content and metadata hashing failed' }
      })
      // Return a simple hash as last resort
      return `fallback-${file.name}-${file.size}-${Date.now()}`
    }
  } finally {
    // Comprehensive memory cleanup regardless of success or failure
    try {
      // Clear ArrayBuffer references
      if (contentToHash) {
        contentToHash = null
      }
      
      // Clear sample ArrayBuffers
      if (samples && samples.length > 0) {
        for (let i = 0; i < samples.length; i++) {
          samples[i] = null
        }
        samples.length = 0
        samples = null
      }
      
      // Clear blob references (help GC detect these are no longer needed)
      if (blobs && blobs.length > 0) {
        for (let i = 0; i < blobs.length; i++) {
          blobs[i] = null
        }
        blobs.length = 0
        blobs = null
      }
      
      // Clear typed array view references
      if (views && views.length > 0) {
        for (let i = 0; i < views.length; i++) {
          views[i] = null
        }
        views.length = 0
        views = null
      }
      
      // Request garbage collection if available (development/testing)
      if (typeof window !== 'undefined' && window.gc && process.env.NODE_ENV === 'development') {
        setTimeout(() => window.gc(), 0)
      }
    } catch (cleanupError) {
      console.warn('Memory cleanup warning:', cleanupError)
    }
  }
}

function showDeltaAlert(fileType, matches, matchType = 'similar') {
  const fileTypeDisplay = fileType === 'car_file' ? 'CAR' : 'Receipt'
  
  let message = ''
  let alertClass = 'alert-warning'
  
  if (matchType === 'exact') {
    message = `⚠️ EXACT ${fileTypeDisplay} files detected! These files appear identical to previously uploaded files.`
    alertClass = 'alert-danger'
  } else {
    message = `Similar ${fileTypeDisplay} files detected in recent sessions. Consider enabling delta processing to identify changes.`
    alertClass = 'alert-warning'
  }
  
  deltaAlert.value = {
    show: true,
    message,
    alertClass,
    matchType,
    details: matches.map(match => {
      const matchTypeDisplay = match.matchType === 'exact' ? '🎯 EXACT' : '📋 Similar'
      const sizeInfo = match.sizeDifference !== undefined 
        ? ` (±${formatFileSize(match.sizeDifference)})` 
        : ''
      return `${matchTypeDisplay}: ${match.fileName} in "${match.sessionName}" (${formatFileSize(match.fileSize)})${sizeInfo}`
    }).slice(0, 4) // Show max 4 matches with more detail
  }
}

function dismissDeltaAlert() {
  deltaAlert.value.show = false
}

// CAR File handlers
function triggerCarInput() {
  carInput.value?.click()
}

function handleCarSelect(event) {
  const file = event.target.files[0]
  setCarFile(file)
  event.target.value = '' // Reset input
}

function handleCarDrop(event) {
  carDragActive.value = false
  const file = event.dataTransfer.files[0]
  setCarFile(file)
}

async function setCarFile(file) {
  if (!file) return

  const validation = validateUploadedFile(file, 'car')
  if (!validation.valid) {
    // Use centralized error handling for consistent reporting
    const validationError = errorHandler.createError(
      `CAR file: ${validation.error}`,
      validation.category || errorHandler.CATEGORY.VALIDATION,
      validation.severity || errorHandler.SEVERITY.ERROR,
      { 
        fileName: file.name, 
        fileSize: file.size, 
        mimeType: file.type,
        securityNote: validation.securityNote 
      }
    )
    
    errorHandler.handle(validationError)
    return
  }

  // Use sanitized filename if available
  const processedFile = validation.sanitizedName && validation.sanitizedName !== file.name
    ? new File([file], validation.sanitizedName, { type: file.type, lastModified: file.lastModified })
    : file

  carFile.value = processedFile
  carUploadStatus.value = null
  carProgress.value = 0

  // Store validation metadata for server communication
  carFile.value._validationMeta = {
    requiresChunking: validation.requiresChunking,
    serverValidationRequired: validation.serverValidationRequired,
    securityChecks: validation.securityChecks
  }

  // Check for delta files
  await checkForDeltaFiles(file, 'car_file')
}

function removeCarFile() {
  carFile.value = null
  carUploadStatus.value = null
  carProgress.value = 0
}

// Receipt File handlers
function triggerReceiptInput() {
  receiptInput.value?.click()
}

function handleReceiptSelect(event) {
  const file = event.target.files[0]
  setReceiptFile(file)
  event.target.value = '' // Reset input
}

function handleReceiptDrop(event) {
  receiptDragActive.value = false
  const file = event.dataTransfer.files[0]
  setReceiptFile(file)
}

async function setReceiptFile(file) {
  if (!file) return

  const validation = validateUploadedFile(file, 'receipt')
  if (!validation.valid) {
    // Use centralized error handling for consistent reporting
    const validationError = errorHandler.createError(
      `Receipt file: ${validation.error}`,
      validation.category || errorHandler.CATEGORY.VALIDATION,
      validation.severity || errorHandler.SEVERITY.ERROR,
      { 
        fileName: file.name, 
        fileSize: file.size, 
        mimeType: file.type,
        securityNote: validation.securityNote 
      }
    )
    
    errorHandler.handle(validationError)
    return
  }

  // Use sanitized filename if available
  const processedFile = validation.sanitizedName && validation.sanitizedName !== file.name
    ? new File([file], validation.sanitizedName, { type: file.type, lastModified: file.lastModified })
    : file

  receiptFile.value = processedFile
  receiptUploadStatus.value = null
  receiptProgress.value = 0

  // Store validation metadata for server communication
  receiptFile.value._validationMeta = {
    requiresChunking: validation.requiresChunking,
    serverValidationRequired: validation.serverValidationRequired,
    securityChecks: validation.securityChecks
  }

  // Check for delta files
  await checkForDeltaFiles(file, 'receipt_file')
}

function removeReceiptFile() {
  receiptFile.value = null
  receiptUploadStatus.value = null
  receiptProgress.value = 0
}

// Common handlers
function handleDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

function clearFiles() {
  carFile.value = null
  receiptFile.value = null
  carUploadStatus.value = null
  receiptUploadStatus.value = null
  carProgress.value = 0
  receiptProgress.value = 0
  deltaAlert.value.show = false
}

// Upload functionality with chunked support
async function uploadFiles() {
  if (!canUpload.value) return

  isUploading.value = true
  carUploadStatus.value = 'uploading'
  receiptUploadStatus.value = 'uploading'
  carProgress.value = 0
  receiptProgress.value = 0

  try {
    // Temporarily disable chunked upload until backend endpoints are implemented
    // Use standard upload for all files since backend can handle large files
    console.log('Using standard upload for all files')
    await performStandardUpload()

    // Mark both files as completed
    carUploadStatus.value = 'completed'
    receiptUploadStatus.value = 'completed'
    carProgress.value = 100
    receiptProgress.value = 100

    // Register uploaded files with session store
    sessionStore.addFile({
      id: `car-${Date.now()}`,
      name: carFile.value.name,
      type: carFile.value.type,
      size: carFile.value.size,
      status: 'completed',
      progress: 100,
      fileType: 'car'
    })
    
    sessionStore.addFile({
      id: `receipt-${Date.now() + 1}`,
      name: receiptFile.value.name,
      type: receiptFile.value.type,
      size: receiptFile.value.size,
      status: 'completed',
      progress: 100,
      fileType: 'receipt'
    })

    // Show success notification to user
    notificationStore.addSuccess('Files uploaded successfully!', {
      title: 'Upload Complete',
      duration: 5000
    })

  } catch (error) {
    // Use centralized error handling for upload failures
    errorHandler.handle(error, {
      category: errorHandler.CATEGORY.UPLOAD,
      severity: errorHandler.SEVERITY.ERROR,
      details: { sessionId: props.sessionId }
    })
    
    carUploadStatus.value = 'error'
    receiptUploadStatus.value = 'error'
  } finally {
    isUploading.value = false
  }
}

// Standard upload for smaller files
async function performStandardUpload() {
  const formData = new FormData()
  formData.append('car_file', carFile.value)
  formData.append('receipt_file', receiptFile.value)
  
  // Add processing options
  formData.append('processing_options', JSON.stringify({
    enable_validation: processingOptions.value.enableValidation,
    enable_auto_resolution: processingOptions.value.enableAutoResolution,
    enable_email_notifications: processingOptions.value.enableEmailNotifications,
    enable_delta_processing: processingOptions.value.enableDeltaProcessing,
    priority: processingOptions.value.priority
  }))

  const xhr = new XMLHttpRequest()

  // Track upload progress
  xhr.upload.addEventListener('progress', event => {
    if (event.lengthComputable) {
      const progress = Math.round((event.loaded / event.total) * 100)
      
      // Update progress for both files (they upload together)
      carProgress.value = progress
      receiptProgress.value = progress
      
      // Update status based on progress
      if (progress < 100) {
        carUploadStatus.value = 'uploading'
        receiptUploadStatus.value = 'uploading'
      }
    }
  })

  // Handle upload start
  xhr.upload.addEventListener('loadstart', () => {
    carUploadStatus.value = 'uploading'
    receiptUploadStatus.value = 'uploading'
  })

  const uploadPromise = new Promise((resolve, reject) => {
    // Set up timeout handling
    const timeoutId = setTimeout(() => {
      xhr.abort()
      const timeoutError = errorHandler.createError(
        `Upload timed out after ${UPLOAD_TIMEOUT / 1000} seconds`,
        errorHandler.CATEGORY.UPLOAD,
        errorHandler.SEVERITY.ERROR,
        { timeout: UPLOAD_TIMEOUT }
      )
      reject(timeoutError)
    }, UPLOAD_TIMEOUT)
    
    xhr.addEventListener('load', () => {
      clearTimeout(timeoutId)
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const result = JSON.parse(xhr.responseText)
          resolve(result)
        } catch (error) {
          const parseError = errorHandler.createError(
            'Invalid response from server',
            errorHandler.CATEGORY.UPLOAD,
            errorHandler.SEVERITY.ERROR
          )
          reject(parseError)
        }
      } else {
        let errorMessage = `Upload failed: ${xhr.statusText}`
        try {
          const errorData = JSON.parse(xhr.responseText)
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          // Use default error message
        }
        const uploadError = errorHandler.createError(
          errorMessage,
          errorHandler.CATEGORY.UPLOAD,
          errorHandler.SEVERITY.ERROR,
          { status: xhr.status, statusText: xhr.statusText }
        )
        reject(uploadError)
      }
    })

    xhr.addEventListener('error', () => {
      clearTimeout(timeoutId)
      const networkError = errorHandler.createError(
        'Network error during upload',
        errorHandler.CATEGORY.NETWORK,
        errorHandler.SEVERITY.ERROR
      )
      reject(networkError)
    })

    xhr.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      const abortError = errorHandler.createError(
        'Upload cancelled or timed out',
        errorHandler.CATEGORY.UPLOAD,
        errorHandler.SEVERITY.WARNING
      )
      reject(abortError)
    })
  })

  xhr.open('POST', `/api/sessions/${props.sessionId}/upload`)
  
  // Only add dev auth header in development environment
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_USER) {
    xhr.setRequestHeader('x-dev-user', import.meta.env.VITE_DEV_USER)
  }
  
  // Add CSRF token if available
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  if (csrfToken) {
    xhr.setRequestHeader('X-CSRF-Token', csrfToken)
  }
  
  xhr.send(formData)

  return await uploadPromise
}

// Chunked upload implementation for large files  
async function performChunkedUpload() {
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
  
  // Upload CAR file in chunks if it's large
  const carResult = await uploadFileInChunks(carFile.value, 'car_file', CHUNK_SIZE)
  
  // Upload Receipt file in chunks if it's large  
  const receiptResult = await uploadFileInChunks(receiptFile.value, 'receipt_file', CHUNK_SIZE)
  
  // Combine results and finalize upload
  return await finalizeChunkedUpload(carResult.fileId, receiptResult.fileId)
}

async function uploadFileInChunks(file, fileType, chunkSize) {
  const totalChunks = Math.ceil(file.size / chunkSize)
  const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${fileType}`
  
  console.log(`Starting chunked upload for ${file.name}: ${totalChunks} chunks`)
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    
    const chunkFormData = new FormData()
    chunkFormData.append('chunk', chunk)
    chunkFormData.append('file_id', fileId)
    chunkFormData.append('chunk_index', chunkIndex.toString())
    chunkFormData.append('total_chunks', totalChunks.toString())
    chunkFormData.append('file_type', fileType)
    chunkFormData.append('original_filename', file.name)
    chunkFormData.append('total_size', file.size.toString())
    
    if (chunkIndex === 0) {
      // Include file hash and validation metadata in first chunk
      chunkFormData.append('file_hash', file._contentHash || '')
      if (file._validationMeta) {
        chunkFormData.append('validation_meta', JSON.stringify(file._validationMeta))
      }
    }
    
    const xhr = new XMLHttpRequest()
    
    // Track upload progress for this chunk
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) {
        const chunkProgress = (event.loaded / event.total) * 100
        const overallProgress = ((chunkIndex / totalChunks) * 100) + (chunkProgress / totalChunks)
        
        // Update appropriate file progress
        if (fileType === 'car_file') {
          carProgress.value = Math.round(overallProgress)
        } else {
          receiptProgress.value = Math.round(overallProgress)
        }
      }
    })
    
    const chunkPromise = new Promise((resolve, reject) => {
      // Set up timeout handling for chunk uploads
      const chunkTimeoutId = setTimeout(() => {
        xhr.abort()
        const timeoutError = errorHandler.createError(
          `Chunk upload timed out after ${CHUNK_UPLOAD_TIMEOUT / 1000} seconds`,
          errorHandler.CATEGORY.UPLOAD,
          errorHandler.SEVERITY.ERROR,
          { chunkIndex, timeout: CHUNK_UPLOAD_TIMEOUT }
        )
        reject(timeoutError)
      }, CHUNK_UPLOAD_TIMEOUT)
      
      xhr.addEventListener('load', () => {
        clearTimeout(chunkTimeoutId)
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const result = JSON.parse(xhr.responseText)
            resolve(result)
          } catch (error) {
            const parseError = errorHandler.createError(
              'Invalid response from server for chunk upload',
              errorHandler.CATEGORY.UPLOAD,
              errorHandler.SEVERITY.ERROR
            )
            reject(parseError)
          }
        } else {
          let errorMessage = `Chunk upload failed: ${xhr.statusText}`
          try {
            const errorData = JSON.parse(xhr.responseText)
            errorMessage = errorData.detail || errorMessage
          } catch (e) {
            // Use default error message
          }
          const chunkError = errorHandler.createError(
            errorMessage,
            errorHandler.CATEGORY.UPLOAD,
            errorHandler.SEVERITY.ERROR,
            { chunkIndex, status: xhr.status }
          )
          reject(chunkError)
        }
      })

      xhr.addEventListener('error', () => {
        clearTimeout(chunkTimeoutId)
        const networkError = errorHandler.createError(
          'Network error during chunk upload',
          errorHandler.CATEGORY.NETWORK,
          errorHandler.SEVERITY.ERROR,
          { chunkIndex }
        )
        reject(networkError)
      })

      xhr.addEventListener('abort', () => {
        clearTimeout(chunkTimeoutId)
        const abortError = errorHandler.createError(
          'Chunk upload cancelled or timed out',
          errorHandler.CATEGORY.UPLOAD,
          errorHandler.SEVERITY.WARNING,
          { chunkIndex }
        )
        reject(abortError)
      })
    })
    
    xhr.open('POST', `/api/sessions/${props.sessionId}/upload-chunk`)
    
    // Add authentication headers
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_USER) {
      xhr.setRequestHeader('x-dev-user', import.meta.env.VITE_DEV_USER)
    }
    
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken)
    }
    
    xhr.send(chunkFormData)
    
    await chunkPromise
    
    console.log(`Uploaded chunk ${chunkIndex + 1}/${totalChunks} for ${file.name}`)
  }
  
  return { fileId, fileName: file.name, fileSize: file.size }
}

async function finalizeChunkedUpload(carFileId, receiptFileId) {
  const finalizationData = new FormData()
  finalizationData.append('car_file_id', carFileId)
  finalizationData.append('receipt_file_id', receiptFileId)
  
  // Add processing options
  finalizationData.append('processing_options', JSON.stringify({
    enable_validation: processingOptions.value.enableValidation,
    enable_auto_resolution: processingOptions.value.enableAutoResolution,
    enable_email_notifications: processingOptions.value.enableEmailNotifications,
    enable_delta_processing: processingOptions.value.enableDeltaProcessing,
    priority: processingOptions.value.priority
  }))
  
  const xhr = new XMLHttpRequest()
  
  const finalizePromise = new Promise((resolve, reject) => {
    // Set up timeout handling for finalization
    const finalizeTimeoutId = setTimeout(() => {
      xhr.abort()
      const timeoutError = errorHandler.createError(
        `Upload finalization timed out after ${UPLOAD_TIMEOUT / 1000} seconds`,
        errorHandler.CATEGORY.UPLOAD,
        errorHandler.SEVERITY.ERROR,
        { timeout: UPLOAD_TIMEOUT }
      )
      reject(timeoutError)
    }, UPLOAD_TIMEOUT)
    
    xhr.addEventListener('load', () => {
      clearTimeout(finalizeTimeoutId)
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const result = JSON.parse(xhr.responseText)
          resolve(result)
        } catch (error) {
          const parseError = errorHandler.createError(
            'Invalid response from server during finalization',
            errorHandler.CATEGORY.UPLOAD,
            errorHandler.SEVERITY.ERROR
          )
          reject(parseError)
        }
      } else {
        let errorMessage = `Upload finalization failed: ${xhr.statusText}`
        try {
          const errorData = JSON.parse(xhr.responseText)
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          // Use default error message
        }
        const finalizeError = errorHandler.createError(
          errorMessage,
          errorHandler.CATEGORY.UPLOAD,
          errorHandler.SEVERITY.ERROR,
          { status: xhr.status }
        )
        reject(finalizeError)
      }
    })

    xhr.addEventListener('error', () => {
      clearTimeout(finalizeTimeoutId)
      const networkError = errorHandler.createError(
        'Network error during upload finalization',
        errorHandler.CATEGORY.NETWORK,
        errorHandler.SEVERITY.ERROR
      )
      reject(networkError)
    })
    
    xhr.addEventListener('abort', () => {
      clearTimeout(finalizeTimeoutId)
      const abortError = errorHandler.createError(
        'Upload finalization cancelled or timed out',
        errorHandler.CATEGORY.UPLOAD,
        errorHandler.SEVERITY.WARNING
      )
      reject(abortError)
    })
  })
  
  xhr.open('POST', `/api/sessions/${props.sessionId}/finalize-upload`)
  
  // Add authentication headers
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_USER) {
    xhr.setRequestHeader('x-dev-user', import.meta.env.VITE_DEV_USER)
  }
  
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  if (csrfToken) {
    xhr.setRequestHeader('X-CSRF-Token', csrfToken)
  }
  
  xhr.send(finalizationData)
  
  return await finalizePromise
}

// Processing functionality
async function startProcessing() {
  if (!uploadCompleted.value || isProcessingStarted.value) return

  try {
    isProcessingStarted.value = true
    
    // Use session store's startProcessing method which includes status polling
    await sessionStore.startProcessing()
    
    // Emit processing started event
    emit('processing-started', {
      sessionId: props.sessionId,
      message: 'Processing started successfully'
    })

  } catch (error) {
    console.error('Failed to start processing:', error)
    sessionStore.setError(error.message)
    isProcessingStarted.value = false
  }
}

// Helper functions
function getStatusColor(status) {
  const colors = {
    uploading: 'text-blue-600',
    completed: 'text-green-600',
    error: 'text-red-600',
  }
  return colors[status] || 'text-gray-600'
}

function getStatusText(status) {
  const texts = {
    uploading: 'Uploading...',
    completed: 'Completed',
    error: 'Error',
  }
  return texts[status] || ''
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.file-upload-container {
  @apply space-y-6;
}

.card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
}

/* Drag and drop animations */
.transition-all {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
