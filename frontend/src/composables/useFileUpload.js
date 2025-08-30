import { ref, computed } from 'vue'
import { useApi } from './useApi.js'

/**
 * File upload composable with validation, progress tracking, and error handling
 * Handles PDF file validation and upload to the Credit Card Processor backend
 */
export function useFileUpload() {
  const { uploadFile: _uploadFile } = useApi()

  const files = ref([])
  const uploadProgress = ref({})
  const isUploading = ref(false)
  const errors = ref({})

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['application/pdf']
  const ALLOWED_EXTENSIONS = ['.pdf']

  /**
   * Validates a single file against upload constraints
   * @param {File} file - File to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  function validateFile(file) {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const extension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf('.'))
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return {
          valid: false,
          error: 'Only PDF files are supported',
        }
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
      }
    }

    // Check for empty files
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty',
      }
    }

    return { valid: true, error: null }
  }

  /**
   * Adds files to upload queue with validation
   * @param {FileList|File[]} fileList - Files to add
   * @returns {Array} Array of validation results
   */
  function addFiles(fileList) {
    const fileArray = Array.from(fileList)
    const results = []

    fileArray.forEach(file => {
      const validation = validateFile(file)
      const fileId = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const fileItem = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validation.valid ? 'pending' : 'error',
        error: validation.error,
        uploadedAt: null,
      }

      if (validation.valid) {
        files.value.push(fileItem)
        uploadProgress.value[fileId] = 0
      } else {
        errors.value[fileId] = validation.error
      }

      results.push({
        file: fileItem,
        ...validation,
      })
    })

    return results
  }

  /**
   * Removes a file from upload queue
   * @param {string} fileId - ID of file to remove
   */
  function removeFile(fileId) {
    files.value = files.value.filter(f => f.id !== fileId)
    delete uploadProgress.value[fileId]
    delete errors.value[fileId]
  }

  /**
   * Clears all files from upload queue
   */
  function clearFiles() {
    files.value = []
    uploadProgress.value = {}
    errors.value = {}
  }

  /**
   * Uploads a single file to the specified session
   * @param {string} sessionId - Session ID to upload to
   * @param {Object} fileItem - File item from upload queue
   * @returns {Promise<Object>}
   */
  async function uploadSingleFile(sessionId, fileItem) {
    const { id, file } = fileItem

    try {
      // Update file status
      const fileIndex = files.value.findIndex(f => f.id === id)
      if (fileIndex >= 0) {
        files.value[fileIndex].status = 'uploading'
      }

      uploadProgress.value[id] = 0

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', file)

        // Track upload progress
        xhr.upload.addEventListener('progress', event => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            uploadProgress.value[id] = progress
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const result = JSON.parse(xhr.responseText)

              // Update file status
              if (fileIndex >= 0) {
                files.value[fileIndex].status = 'completed'
                files.value[fileIndex].uploadedAt = new Date()
              }

              uploadProgress.value[id] = 100
              resolve(result)
            } catch (parseError) {
              reject(new Error('Invalid response from server'))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'))
        })

        xhr.open('POST', `/api/sessions/${sessionId}/upload`)
        xhr.send(formData)
      })
    } catch (error) {
      // Update file status on error
      const fileIndex = files.value.findIndex(f => f.id === id)
      if (fileIndex >= 0) {
        files.value[fileIndex].status = 'error'
        files.value[fileIndex].error = error.message
      }

      errors.value[id] = error.message
      throw error
    }
  }

  /**
   * Uploads all pending files in queue
   * @param {string} sessionId - Session ID to upload to
   * @returns {Promise<Array>}
   */
  async function uploadAllFiles(sessionId) {
    const pendingFiles = files.value.filter(f => f.status === 'pending')

    if (pendingFiles.length === 0) {
      return []
    }

    isUploading.value = true
    const results = []

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const fileItem of pendingFiles) {
        try {
          const result = await uploadSingleFile(sessionId, fileItem)
          results.push({ success: true, file: fileItem, result })
        } catch (error) {
          results.push({ success: false, file: fileItem, error: error.message })
        }
      }

      return results
    } finally {
      isUploading.value = false
    }
  }

  // Computed properties
  const hasFiles = computed(() => files.value.length > 0)
  const hasPendingFiles = computed(() =>
    files.value.some(f => f.status === 'pending')
  )
  const hasUploadedFiles = computed(() =>
    files.value.some(f => f.status === 'completed')
  )
  const hasErrors = computed(() => Object.keys(errors.value).length > 0)
  const totalFiles = computed(() => files.value.length)
  const completedFiles = computed(
    () => files.value.filter(f => f.status === 'completed').length
  )
  const overallProgress = computed(() => {
    if (totalFiles.value === 0) return 0
    return Math.round((completedFiles.value / totalFiles.value) * 100)
  })

  /**
   * Formats file size in human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string}
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return {
    // State
    files,
    uploadProgress,
    isUploading,
    errors,

    // Computed
    hasFiles,
    hasPendingFiles,
    hasUploadedFiles,
    hasErrors,
    totalFiles,
    completedFiles,
    overallProgress,

    // Methods
    validateFile,
    addFiles,
    removeFile,
    clearFiles,
    uploadSingleFile,
    uploadAllFiles,
    formatFileSize,

    // Constants
    MAX_FILE_SIZE,
    ALLOWED_TYPES,
    ALLOWED_EXTENSIONS,
  }
}
