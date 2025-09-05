<template>
  <div class="bg-white rounded-lg shadow-sm border p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Upload Updated Receipts</h3>
        <p class="text-sm text-gray-600 mt-1">
          Upload receipt files that have changed since the last processing session
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <span v-if="uploadStatus" :class="statusClasses" class="px-2 py-1 rounded-full text-xs font-medium">
          {{ uploadStatus }}
        </span>
        <button 
          v-if="canReset"
          @click="resetUpload"
          class="text-gray-400 hover:text-gray-600 transition-colors"
          title="Reset upload"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Base Session Info -->
    <div v-if="baseSession" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-medium text-blue-900">Base Processing Session</h4>
          <p class="text-sm text-blue-700 mt-1">{{ baseSession.session_name }}</p>
          <div class="text-xs text-blue-600 mt-1 space-x-4">
            <span>{{ formatDate(baseSession.created_at) }}</span>
            <span>{{ baseSession.total_employees }} employees</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Area -->
    <div class="space-y-4">
      <!-- Drag & Drop Zone -->
      <div 
        @drop="handleDrop"
        @dragover.prevent
        @dragenter.prevent
        @dragleave="isDragOver = false"
        @dragover="isDragOver = true"
        :class="[
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          isUploading ? 'opacity-50 pointer-events-none' : ''
        ]"
      >
        <div class="space-y-3">
          <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div>
            <h4 class="text-sm font-medium text-gray-900">Upload updated receipt files</h4>
            <p class="text-sm text-gray-600 mt-1">
              Drag and drop files here, or 
              <button 
                @click="triggerFileInput"
                class="text-blue-600 hover:text-blue-700 font-medium"
                :disabled="isUploading"
              >
                browse to choose files
              </button>
            </p>
            <p class="text-xs text-gray-500 mt-2">
              Supported formats: PDF, JPG, PNG, HEIC • Max {{ maxFileSizeMB }}MB per file
            </p>
          </div>
        </div>
        
        <input 
          ref="fileInput"
          type="file" 
          multiple 
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          @change="handleFileSelect"
          class="hidden"
        />
      </div>

      <!-- File List -->
      <div v-if="selectedFiles.length > 0" class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium text-gray-900">
            Selected Files ({{ selectedFiles.length }})
          </h4>
          <button 
            @click="clearFiles"
            class="text-sm text-gray-600 hover:text-gray-800"
            :disabled="isUploading"
          >
            Clear all
          </button>
        </div>
        
        <div class="max-h-60 overflow-y-auto space-y-2">
          <div 
            v-for="(file, index) in selectedFiles" 
            :key="index"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
          >
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <svg v-if="file.type === 'application/pdf'" class="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                </svg>
                <svg v-else class="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ file.name }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <div v-if="file.uploadProgress !== undefined" class="flex items-center space-x-2">
                <div class="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    :style="{ width: file.uploadProgress + '%' }"
                  ></div>
                </div>
                <span class="text-xs text-gray-600">{{ file.uploadProgress }}%</span>
              </div>
              
              <button 
                @click="removeFile(index)"
                class="text-gray-400 hover:text-red-500 transition-colors"
                :disabled="isUploading"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Controls -->
    <div class="flex items-center justify-between pt-4 border-t">
      <div class="text-sm text-gray-600">
        <span v-if="selectedFiles.length > 0">
          {{ selectedFiles.length }} file(s) selected ({{ totalFileSize }})
        </span>
      </div>
      
      <div class="flex items-center space-x-3">
        <button 
          @click="$emit('cancel')"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          :disabled="isUploading"
        >
          Cancel
        </button>
        <button 
          @click="uploadFiles"
          :disabled="!canUpload"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            canUpload
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-gray-400 bg-gray-200 cursor-not-allowed'
          ]"
        >
          <span v-if="isUploading" class="flex items-center space-x-2">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Uploading...</span>
          </span>
          <span v-else>Upload & Process</span>
        </button>
      </div>
    </div>

    <!-- Progress Summary -->
    <div v-if="isUploading" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-blue-900">Upload Progress</span>
        <span class="text-sm text-blue-700">{{ overallProgress }}%</span>
      </div>
      <div class="w-full bg-blue-200 rounded-full h-2">
        <div 
          class="bg-blue-600 h-2 rounded-full transition-all duration-300"
          :style="{ width: overallProgress + '%' }"
        ></div>
      </div>
      <p class="text-xs text-blue-600 mt-2">
        {{ uploadedCount }} of {{ selectedFiles.length }} files uploaded
      </p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'UpdatedReceiptsUpload',
  props: {
    baseSession: {
      type: Object,
      default: null
    },
    changedEmployeeIds: {
      type: Array,
      default: () => []
    }
  },
  emits: ['upload-complete', 'upload-error', 'cancel'],
  setup(props, { emit }) {
    // Reactive data
    const selectedFiles = ref([])
    const isDragOver = ref(false)
    const isUploading = ref(false)
    const uploadStatus = ref('')
    const fileInput = ref(null)

    // Constants
    const maxFileSizeMB = 10
    const maxFileSize = maxFileSizeMB * 1024 * 1024
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic']

    // Computed properties
    const canUpload = computed(() => {
      return selectedFiles.value.length > 0 && !isUploading.value
    })

    const canReset = computed(() => {
      return selectedFiles.value.length > 0 || uploadStatus.value
    })

    const statusClasses = computed(() => {
      switch (uploadStatus.value) {
        case 'Uploading':
          return 'bg-blue-100 text-blue-800'
        case 'Complete':
          return 'bg-green-100 text-green-800'
        case 'Error':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    })

    const totalFileSize = computed(() => {
      const total = selectedFiles.value.reduce((sum, file) => sum + file.size, 0)
      return formatFileSize(total)
    })

    const overallProgress = computed(() => {
      if (selectedFiles.value.length === 0) return 0
      const totalProgress = selectedFiles.value.reduce((sum, file) => {
        return sum + (file.uploadProgress || 0)
      }, 0)
      return Math.round(totalProgress / selectedFiles.value.length)
    })

    const uploadedCount = computed(() => {
      return selectedFiles.value.filter(file => file.uploadProgress === 100).length
    })

    // Methods
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const validateFile = (file) => {
      const errors = []
      
      if (!allowedTypes.includes(file.type)) {
        errors.push('Invalid file type. Only PDF, JPG, PNG, and HEIC files are allowed.')
      }
      
      if (file.size > maxFileSize) {
        errors.push(`File size exceeds ${maxFileSizeMB}MB limit.`)
      }
      
      return errors
    }

    const addFiles = (files) => {
      const validFiles = []
      const errors = []

      for (const file of files) {
        const fileErrors = validateFile(file)
        if (fileErrors.length === 0) {
          // Check for duplicates
          const isDuplicate = selectedFiles.value.some(existing => 
            existing.name === file.name && existing.size === file.size
          )
          
          if (!isDuplicate) {
            validFiles.push({
              ...file,
              uploadProgress: undefined
            })
          }
        } else {
          errors.push({ file: file.name, errors: fileErrors })
        }
      }

      selectedFiles.value.push(...validFiles)

      if (errors.length > 0) {
        console.warn('File validation errors:', errors)
        // Could emit validation errors for user feedback
      }
    }

    const triggerFileInput = () => {
      fileInput.value?.click()
    }

    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files)
      addFiles(files)
      event.target.value = '' // Reset input
    }

    const handleDrop = (event) => {
      event.preventDefault()
      isDragOver.value = false
      
      const files = Array.from(event.dataTransfer.files)
      addFiles(files)
    }

    const removeFile = (index) => {
      selectedFiles.value.splice(index, 1)
    }

    const clearFiles = () => {
      selectedFiles.value = []
    }

    const resetUpload = () => {
      selectedFiles.value = []
      uploadStatus.value = ''
      isUploading.value = false
    }

    const uploadFiles = async () => {
      if (!canUpload.value) return

      isUploading.value = true
      uploadStatus.value = 'Uploading'

      try {
        // Initialize progress for all files
        selectedFiles.value.forEach(file => {
          file.uploadProgress = 0
        })

        // Upload files with progress tracking
        const uploadPromises = selectedFiles.value.map(async (file, index) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('baseSessionId', props.baseSession?.session_id || '')
          formData.append('changedEmployeeIds', JSON.stringify(props.changedEmployeeIds))

          const response = await fetch('/api/files/upload-updated-receipts', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Upload failed for ${file.name}`)
          }

          // Simulate progress (in real implementation, use XMLHttpRequest for progress events)
          file.uploadProgress = 100

          return await response.json()
        })

        const results = await Promise.all(uploadPromises)
        
        uploadStatus.value = 'Complete'
        emit('upload-complete', {
          files: selectedFiles.value,
          results: results,
          baseSession: props.baseSession
        })

      } catch (error) {
        uploadStatus.value = 'Error'
        emit('upload-error', {
          error: error.message,
          files: selectedFiles.value
        })
      } finally {
        isUploading.value = false
      }
    }

    return {
      // Reactive data
      selectedFiles,
      isDragOver,
      isUploading,
      uploadStatus,
      fileInput,

      // Constants
      maxFileSizeMB,

      // Computed
      canUpload,
      canReset,
      statusClasses,
      totalFileSize,
      overallProgress,
      uploadedCount,

      // Methods
      formatDate,
      formatFileSize,
      triggerFileInput,
      handleFileSelect,
      handleDrop,
      removeFile,
      clearFiles,
      resetUpload,
      uploadFiles
    }
  }
}
</script>