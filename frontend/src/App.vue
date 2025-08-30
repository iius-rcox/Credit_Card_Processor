<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">
              Credit Card Processor
            </h1>
          </div>
          <div class="flex items-center space-x-4">
            <div v-if="sessionStore.hasSession" class="text-sm text-gray-600">
              Session: {{ sessionStore.sessionId }}
            </div>
            <div class="flex items-center space-x-2">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  sessionStore.hasSession ? 'bg-success-500' : 'bg-gray-300',
                ]"
                :title="sessionStore.hasSession ? 'Connected' : 'No Session'"
              ></div>
              <span class="text-sm text-gray-600">
                {{ sessionStore.hasSession ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="space-y-8">
        <!-- Welcome Card -->
        <div class="card">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Credit Card Processor
            </h2>
            <p class="text-gray-600 mb-6">
              Upload your PDF documents to extract and process credit card data
              efficiently.
            </p>

            <!-- Status Display -->
            <div class="inline-flex items-center space-x-4 text-sm">
              <div class="flex items-center space-x-2">
                <span class="text-gray-500">Status:</span>
                <span
                  :class="getStatusColor(sessionStore.processingStatus)"
                  class="px-2 py-1 rounded-full text-xs font-medium capitalize"
                >
                  {{ sessionStore.processingStatus }}
                </span>
              </div>
              <div
                v-if="sessionStore.hasFiles"
                class="flex items-center space-x-2"
              >
                <span class="text-gray-500">Files:</span>
                <span class="text-gray-900 font-medium">
                  {{ sessionStore.uploadedFiles.length }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- File Upload Section -->
        <div class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">File Upload</h3>
          <div
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400',
            ]"
            @drop.prevent="handleFileDrop"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @click="triggerFileInput"
          >
            <input
              ref="fileInput"
              type="file"
              multiple
              accept=".pdf,application/pdf"
              class="hidden"
              @change="handleFileSelect"
            />
            <div class="text-gray-500">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <p class="mt-2 text-sm">
                {{
                  isDragOver
                    ? 'Drop files here'
                    : 'Click to upload or drag and drop PDF files here'
                }}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                Supported formats: PDF (max 10MB per file)
              </p>
            </div>
          </div>

          <!-- File List -->
          <div v-if="fileUpload.hasFiles" class="mt-4">
            <h4 class="text-sm font-medium text-gray-900 mb-2">
              Selected Files
            </h4>
            <div class="space-y-2">
              <div
                v-for="file in fileUpload.files"
                :key="file.id"
                class="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <svg
                    class="h-8 w-8 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <p class="text-sm font-medium text-gray-900">
                      {{ file.name }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ fileUpload.formatFileSize(file.size) }}
                    </p>
                    <div v-if="file.status === 'uploading'" class="mt-1">
                      <div class="w-32 bg-gray-200 rounded-full h-1">
                        <div
                          class="bg-blue-600 h-1 rounded-full transition-all"
                          :style="{
                            width: `${fileUpload.uploadProgress[file.id] || 0}%`,
                          }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      file.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : file.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : file.status === 'uploading'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800',
                    ]"
                  >
                    {{ file.status }}
                  </span>
                  <button
                    class="text-red-600 hover:text-red-800"
                    @click="fileUpload.removeFile(file.id)"
                  >
                    <svg
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Upload Actions -->
            <div class="mt-4 flex items-center justify-between">
              <div class="text-sm text-gray-600">
                {{ fileUpload.totalFiles }} file(s) selected,
                {{ fileUpload.completedFiles }} uploaded
              </div>
              <div class="space-x-2">
                <button
                  class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  @click="fileUpload.clearFiles"
                >
                  Clear All
                </button>
                <button
                  :disabled="
                    !fileUpload.hasPendingFiles || !sessionStore.hasSession
                  "
                  class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="handleUploadFiles"
                >
                  {{ fileUpload.isUploading ? 'Uploading...' : 'Upload Files' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Processing Status -->
        <div v-if="progress.isProcessing || progress.isComplete" class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Processing Status
          </h3>
          <div class="space-y-4">
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div
                :class="[
                  'h-3 rounded-full transition-all duration-300',
                  progress.progressColor,
                ]"
                :style="{ width: `${progress.progressPercentage}%` }"
              ></div>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">{{ progress.statusLabel }}</span>
              <span class="font-medium"
                >{{ progress.progressPercentage }}%</span
              >
            </div>
            <div
              v-if="progress.message"
              class="text-sm text-gray-600 text-center"
            >
              {{ progress.message }}
            </div>
            <div
              v-if="progress.estimatedTimeRemaining"
              class="text-xs text-gray-500 text-center"
            >
              {{ progress.estimatedTimeRemaining }}
            </div>

            <!-- Processing Actions -->
            <div
              v-if="sessionStore.hasFiles && !progress.isPolling"
              class="text-center"
            >
              <button
                :disabled="!sessionStore.hasSession || progress.isProcessing"
                class="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="handleStartProcessing"
              >
                Start Processing
              </button>
            </div>
          </div>
        </div>

        <!-- Results Section -->
        <div v-if="sessionStore.hasResults" class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Processing Results
          </h3>
          <div class="text-center text-gray-600">
            <p>Results will be displayed here once processing is complete.</p>
          </div>
        </div>

        <!-- Error Display -->
        <div
          v-if="sessionStore.hasError"
          class="card border-error-200 bg-error-50"
        >
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-error-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h4 class="text-sm font-medium text-error-800">Error</h4>
              <p class="text-sm text-error-700 mt-1">
                {{ sessionStore.error }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p class="text-center text-sm text-gray-500">
          Credit Card Processor v1.0.0 - Built with Vue 3, Vite & Tailwind CSS
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useSessionStore } from './stores/session.js'
import { useApi } from './composables/useApi.js'
import { useFileUpload } from './composables/useFileUpload.js'
import { useProgress } from './composables/useProgress.js'

const sessionStore = useSessionStore()
const api = useApi()
const fileUpload = useFileUpload()
const progress = useProgress()

// UI state
const isDragOver = ref(false)
const fileInput = ref(null)

/**
 * Initialize a new session on app mount
 */
onMounted(async () => {
  if (!sessionStore.hasSession) {
    try {
      const response = await api.createSession()
      sessionStore.createSession(response.session_id)
    } catch (error) {
      console.error('Failed to create session:', error)
      sessionStore.setError('Failed to initialize session')
    }
  }
})

/**
 * Watch for file uploads and update session store
 */
watch(
  () => fileUpload.files,
  files => {
    sessionStore.clearFiles()
    files.forEach(file => {
      if (file.status === 'completed') {
        sessionStore.addFile({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
        })
      }
    })
  },
  { deep: true }
)

/**
 * Status color helper for legacy template usage
 */
const getStatusColor = status => {
  const colors = {
    idle: 'bg-gray-100 text-gray-800',
    uploading: 'bg-primary-100 text-primary-800',
    processing: 'bg-warning-100 text-warning-800',
    completed: 'bg-success-100 text-success-800',
    error: 'bg-error-100 text-error-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Trigger file input click
 */
function triggerFileInput() {
  fileInput.value?.click()
}

/**
 * Handle file selection from input
 */
function handleFileSelect(event) {
  const files = event.target.files
  if (files && files.length > 0) {
    fileUpload.addFiles(files)
    event.target.value = '' // Clear input for reselection
  }
}

/**
 * Handle file drop
 */
function handleFileDrop(event) {
  isDragOver.value = false
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    fileUpload.addFiles(files)
  }
}

/**
 * Upload all selected files to the current session
 */
async function handleUploadFiles() {
  if (!sessionStore.hasSession) {
    sessionStore.setError('No active session')
    return
  }

  try {
    sessionStore.setProcessingStatus('uploading')
    const results = await fileUpload.uploadAllFiles(sessionStore.sessionId)

    // Check for upload failures
    const failures = results.filter(r => !r.success)
    if (failures.length > 0) {
      sessionStore.setError(`Failed to upload ${failures.length} file(s)`)
    } else {
      sessionStore.setProcessingStatus('idle')
    }
  } catch (error) {
    console.error('Upload error:', error)
    sessionStore.setError(`Upload failed: ${error.message}`)
  }
}

/**
 * Start processing uploaded files
 */
async function handleStartProcessing() {
  if (!sessionStore.hasSession || !sessionStore.hasFiles) {
    return
  }

  try {
    sessionStore.setProcessingStatus('processing')
    await api.startProcessing(sessionStore.sessionId)

    // Start polling for progress
    progress.startPolling(sessionStore.sessionId)
  } catch (error) {
    console.error('Processing error:', error)
    sessionStore.setError(`Failed to start processing: ${error.message}`)
  }
}

/**
 * Watch progress updates and sync with session store
 */
watch(
  () => progress.status,
  status => {
    if (status === 'completed') {
      sessionStore.setProcessingStatus('completed')
      // TODO: Fetch and set results
    } else if (status === 'error') {
      sessionStore.setProcessingStatus('error')
      if (progress.error) {
        sessionStore.setError(progress.error)
      }
    } else if (['processing', 'extracting', 'analyzing'].includes(status)) {
      sessionStore.setProcessingStatus('processing')
    }
  }
)
</script>
