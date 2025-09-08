import { ref, computed, inject, onUnmounted } from 'vue'
import { useApi } from './useApi.js'
import { useSessionStore } from '@/stores/session'

/**
 * Enhanced file upload composable with validation, progress tracking, and Pinia store integration
 * Handles CAR and Receipt PDF validation, upload with retry logic, and comprehensive error handling
 * Phase 2 enhancements: Store integration, advanced validation, retry logic
 */
export function useFileUpload() {
  const api = useApi()
  const store = inject('sessionStore', null) || useSessionStore()

  const files = ref([])
  const isUploading = ref(false)
  const uploadProgress = ref({})
  const uploadErrors = ref({})
  const globalError = ref(null)
  const recoveryQueue = ref([])  // Store failed uploads for recovery
  
  // Upload performance metrics
  const uploadMetrics = ref({
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    averageUploadTime: 0,
    averageUploadSpeed: 0, // bytes per second
    totalBytesUploaded: 0,
    fastestUpload: null,
    slowestUpload: null
  })

  // Enhanced file validation constants - matches backend requirements
  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB to match backend
  const MIN_FILE_SIZE = 1024 // 1KB minimum
  const ALLOWED_TYPES = ['application/pdf']
  const ALLOWED_EXTENSIONS = ['.pdf']
  const MAX_FILES_PER_SESSION = 50 // Reasonable limit
  const SUPPORTED_FILE_CATEGORIES = ['CAR', 'Receipt', 'Statement'] // Expected file types
  
  // Retry configuration
  const UPLOAD_RETRY_ATTEMPTS = 3
  const UPLOAD_RETRY_DELAY = 2000 // 2 seconds
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks for large files
  const CHUNK_THRESHOLD = 25 * 1024 * 1024 // Use chunking for files > 25MB

  /**
   * Enhanced file validation with comprehensive checks
   * @param {File} file - File to validate
   * @param {Array} existingFiles - Already added files for duplicate checking
   * @returns {{valid: boolean, error: string|null, warnings: Array}}
   */
  function validateFile(file, existingFiles = []) {
    const warnings = []
    
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const extension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf('.'))
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return {
          valid: false,
          error: 'Only PDF files are supported',
          warnings
        }
      }
    }

    // Check file size constraints
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit`,
        warnings
      }
    }

    if (file.size < MIN_FILE_SIZE) {
      return {
        valid: false,
        error: `File is too small (minimum ${MIN_FILE_SIZE} bytes)`,
        warnings
      }
    }

    // Check for duplicate files by name and size
    const duplicate = existingFiles.find(f => 
      f.name === file.name && f.size === file.size
    )
    if (duplicate) {
      return {
        valid: false,
        error: 'Duplicate file already selected',
        warnings
      }
    }

    // Check total file count
    if (existingFiles.length >= MAX_FILES_PER_SESSION) {
      return {
        valid: false,
        error: `Maximum ${MAX_FILES_PER_SESSION} files per session`,
        warnings
      }
    }

    // File name validation
    if (file.name.length > 255) {
      return {
        valid: false,
        error: 'File name is too long (maximum 255 characters)',
        warnings
      }
    }

    // Check for potentially problematic characters in filename
    const problematicChars = /[<>:"|?*\x00-\x1f]/
    if (problematicChars.test(file.name)) {
      warnings.push('File name contains special characters that may cause issues')
    }

    // Suggest file category based on filename
    const fileName = file.name.toLowerCase()
    let suggestedCategory = 'Unknown'
    if (fileName.includes('car') || fileName.includes('corporate')) {
      suggestedCategory = 'CAR'
    } else if (fileName.includes('receipt') || fileName.includes('expense')) {
      suggestedCategory = 'Receipt'
    } else if (fileName.includes('statement') || fileName.includes('card')) {
      suggestedCategory = 'Statement'
    }

    return { 
      valid: true, 
      error: null, 
      warnings,
      suggestedCategory
    }
  }

  /**
   * Generate a unique ID for a file
   * @returns {string}
   */
  function generateFileId() {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Add files to the upload queue with enhanced validation
   * @param {FileList|File[]} fileList - Files to add
   * @returns {Array} Array of added file objects
   */
  function addFiles(fileList) {
    const fileArray = Array.from(fileList)
    const addedFiles = []
    globalError.value = null

    fileArray.forEach(file => {
      const validation = validateFile(file, files.value)
      const fileId = generateFileId()

      const fileObj = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validation.valid ? 'pending' : 'error',
        error: validation.error,
        warnings: validation.warnings || [],
        progress: 0,
        category: validation.suggestedCategory || 'Unknown',
        uploadAttempts: 0,
        lastModified: file.lastModified,
        checksum: null, // Will be set after upload
        serverFilename: null, // Will be set after upload
        uploadedAt: null,
      }

      files.value.push(fileObj)
      addedFiles.push(fileObj)

      if (validation.valid) {
        uploadProgress.value[fileId] = 0
      } else {
        uploadErrors.value[fileId] = validation.error
      }
    })

    // Update store with file count
    if (store && store.updateUploadCount) {
      store.updateUploadCount(files.value.length)
    }

    return addedFiles
  }

  /**
   * Remove a specific file from the queue
   * @param {string} fileId - ID of file to remove
   */
  function removeFile(fileId) {
    const index = files.value.findIndex(f => f.id === fileId)
    if (index > -1) {
      const removedFile = files.value[index]
      files.value.splice(index, 1)
      delete uploadProgress.value[fileId]
      delete uploadErrors.value[fileId]
      
      // Update store
      if (store && store.removeUploadedFile) {
        store.removeUploadedFile(fileId)
      }
      
      console.log(`Removed file: ${removedFile.name}`, { fileId })
    }
  }

  /**
   * Store files in recovery queue before removal
   * @param {Array} filesToStore - Files to store for recovery
   */
  function storeInRecoveryQueue(filesToStore) {
    const timestamp = Date.now()
    filesToStore.forEach(file => {
      // Only store files that were being uploaded or failed
      if (file.status === 'error' || file.status === 'uploading') {
        recoveryQueue.value.push({
          ...file,
          recoveryTimestamp: timestamp,
          originalProgress: uploadProgress.value[file.id] || 0,
          originalError: uploadErrors.value[file.id] || null
        })
      }
    })
    
    // Limit recovery queue to 50 items to prevent memory leaks
    if (recoveryQueue.value.length > 50) {
      recoveryQueue.value.splice(0, recoveryQueue.value.length - 50)
    }
  }

  /**
   * Clear all files from the upload queue
   * @param {string} status - Only clear files with specific status (optional)
   */
  function clearFiles(status = null) {
    if (status) {
      // Store files with specific status in recovery queue before clearing
      const filesToRemove = files.value.filter(f => f.status === status)
      storeInRecoveryQueue(filesToRemove)
      
      // Clear only files with specific status
      const filesToKeep = files.value.filter(f => f.status !== status)
      const removedIds = filesToRemove.map(f => f.id)
        
      files.value = filesToKeep
      
      // Clean up progress and error tracking
      removedIds.forEach(id => {
        delete uploadProgress.value[id]
        delete uploadErrors.value[id]
      })
    } else {
      // Store all files in recovery queue before clearing
      storeInRecoveryQueue(files.value)
      
      // Clear all files
      files.value = []
      uploadProgress.value = {}
      uploadErrors.value = {}
    }
    
    globalError.value = null
    if (!files.value.length) {
      isUploading.value = false
    }
    
    // Update store
    if (store && store.clearUploadedFiles) {
      store.clearUploadedFiles()
    }
  }

  /**
   * Upload a large file in chunks for improved reliability and memory efficiency
   * @param {string} sessionId - Session ID to upload to
   * @param {Object} fileObj - File object to upload
   * @param {number} attempt - Current attempt number (for retry logic)
   * @returns {Promise<Object>}
   */
  async function uploadFileInChunks(sessionId, fileObj, attempt = 1) {
    const file = fileObj.file
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const startTime = Date.now()
    let uploadedBytes = 0
    
    // Generate unique upload session ID for this chunked upload
    const uploadSessionId = `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)
        
        const formData = new FormData()
        formData.append('chunk', chunk)
        formData.append('chunk_index', chunkIndex.toString())
        formData.append('total_chunks', totalChunks.toString())
        formData.append('upload_session_id', uploadSessionId)
        formData.append('client_filename', fileObj.name)
        formData.append('file_size', file.size.toString())
        formData.append('chunk_size', chunk.size.toString())
        
        if (fileObj.category) {
          formData.append('category', fileObj.category)
        }
        
        // Upload chunk with retry on failure
        await uploadChunk(formData, chunkIndex, totalChunks, fileObj, startTime, uploadedBytes, end)
        
        uploadedBytes = end
        
        // Update progress after each chunk
        const progress = Math.round((uploadedBytes / file.size) * 100)
        const elapsed = Math.max(Date.now() - startTime, 1)
        const speed = (uploadedBytes / elapsed) * 1000
        
        updateProgressSafely(fileObj.id, progress, {
          uploadedBytes,
          totalBytes: file.size,
          speed: Math.round(speed),
          estimatedTimeRemaining: Math.round((file.size - uploadedBytes) / speed),
          chunkProgress: `${chunkIndex + 1}/${totalChunks}`,
          chunkedUpload: true
        })
      }
      
      // All chunks uploaded successfully
      const finalResponse = {
        fileId: uploadSessionId,
        fileName: fileObj.name,
        fileSize: file.size,
        uploadTime: Date.now() - startTime,
        chunked: true,
        totalChunks
      }
      
      updateUploadMetrics(file.size, Date.now() - startTime)
      return finalResponse
      
    } catch (error) {
      console.error(`Chunked upload failed for ${fileObj.name}:`, error)
      throw error
    }
  }
  
  /**
   * Upload a single chunk with retry logic
   * @param {FormData} formData - Chunk data and metadata
   * @param {number} chunkIndex - Current chunk index
   * @param {number} totalChunks - Total number of chunks
   * @param {Object} fileObj - File object being uploaded
   * @param {number} startTime - Upload start time
   * @param {number} uploadedBytes - Bytes uploaded so far
   * @param {number} chunkEndByte - End byte position of this chunk
   * @returns {Promise<void>}
   */
  async function uploadChunk(formData, chunkIndex, totalChunks, fileObj, startTime, uploadedBytes, chunkEndByte) {
    const maxChunkRetries = 3
    let chunkRetries = 0
    
    while (chunkRetries < maxChunkRetries) {
      try {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          
          xhr.upload.addEventListener('progress', event => {
            if (event.lengthComputable) {
              // Calculate overall progress including this chunk's progress
              const chunkProgress = event.loaded / event.total
              const totalProgress = (uploadedBytes + (event.loaded)) / fileObj.size
              const progress = Math.round(totalProgress * 100)
              const elapsed = Math.max(Date.now() - startTime, 1)
              const speed = ((uploadedBytes + event.loaded) / elapsed) * 1000
              
              updateProgressSafely(fileObj.id, progress, {
                uploadedBytes: uploadedBytes + event.loaded,
                totalBytes: fileObj.size,
                speed: Math.round(speed),
                estimatedTimeRemaining: Math.round((fileObj.size - uploadedBytes - event.loaded) / speed),
                chunkProgress: `${chunkIndex + 1}/${totalChunks} (${Math.round(chunkProgress * 100)}%)`,
                chunkedUpload: true
              })
            }
          })
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText || '{}'))
            } else {
              reject(new Error(`Chunk upload failed: ${xhr.status} ${xhr.statusText}`))
            }
          }
          
          xhr.onerror = () => reject(new Error('Chunk upload network error'))
          xhr.ontimeout = () => reject(new Error('Chunk upload timeout'))
          
          xhr.timeout = 30000 // 30 second timeout per chunk
          xhr.open('POST', `/api/sessions/${fileObj.sessionId}/upload-chunk`)
          xhr.send(formData)
        })
        
        // Chunk uploaded successfully, break retry loop
        break
        
      } catch (error) {
        chunkRetries++
        if (chunkRetries >= maxChunkRetries) {
          throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks} after ${maxChunkRetries} retries: ${error.message}`)
        }
        
        // Wait before retrying chunk
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, chunkRetries) * 1000))
        console.warn(`Retrying chunk ${chunkIndex + 1}/${totalChunks}, attempt ${chunkRetries + 1}`)
      }
    }
  }

  /**
   * Upload a single file with retry logic and comprehensive error handling
   * Uses chunked upload for large files to improve reliability and performance
   * @param {string} sessionId - Session ID to upload to
   * @param {Object} fileObj - File object to upload
   * @param {number} attempt - Current attempt number (for retry logic)
   * @returns {Promise<Object>}
   */
  async function uploadSingleFile(sessionId, fileObj, attempt = 1) {
    // Use chunked upload for large files
    if (fileObj.size > CHUNK_THRESHOLD) {
      return uploadFileInChunks(sessionId, fileObj, attempt)
    }
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      const startTime = Date.now()
      
      formData.append('file', fileObj.file)
      
      // Add metadata if available
      if (fileObj.category) {
        formData.append('category', fileObj.category)
      }
      formData.append('client_filename', fileObj.name)
      formData.append('file_size', fileObj.size.toString())
      formData.append('upload_attempt', attempt.toString())

      // Track upload progress with enhanced metrics
      xhr.upload.addEventListener('progress', event => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          const elapsed = Math.max(Date.now() - startTime, 1) // Ensure minimum 1ms to prevent division by zero
          const speed = (event.loaded / elapsed) * 1000 // bytes per second
          const remaining = speed > 0 && event.loaded < event.total ? (event.total - event.loaded) / speed : 0
          
          // Apply smoothing to avoid jittery progress updates
          const currentProgress = uploadProgress.value[fileObj.id] || 0
          const smoothedProgress = progress > currentProgress ? progress : Math.max(currentProgress, progress - 1)
          
          uploadProgress.value[fileObj.id] = smoothedProgress
          fileObj.progress = smoothedProgress
          
          // Apply smoothing to speed calculation using exponential moving average
          const prevSpeed = fileObj.uploadSpeed || 0
          const smoothedSpeed = prevSpeed > 0 ? (prevSpeed * 0.7 + speed * 0.3) : speed
          fileObj.uploadSpeed = smoothedSpeed
          
          // Recalculate remaining time with smoothed speed
          const smoothedRemaining = smoothedSpeed > 0 && event.loaded < event.total ? 
            (event.total - event.loaded) / smoothedSpeed : 0
          fileObj.timeRemaining = smoothedRemaining
          
          // Update store progress if available
          if (store && store.updateFileProgress) {
            store.updateFileProgress(fileObj.id, progress, speed)
          }
        }
      })

      xhr.addEventListener('load', () => {
        const uploadTime = Date.now() - startTime
        
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const result = JSON.parse(xhr.responseText)
            fileObj.status = 'completed'
            fileObj.progress = 100
            fileObj.uploadedAt = new Date().toISOString()
            fileObj.uploadTime = uploadTime
            uploadProgress.value[fileObj.id] = 100
            delete uploadErrors.value[fileObj.id]
            
            // Update upload performance metrics
            uploadMetrics.value.successfulUploads++
            uploadMetrics.value.totalBytesUploaded += fileObj.size
            uploadMetrics.value.averageUploadTime = 
              (uploadMetrics.value.averageUploadTime * (uploadMetrics.value.successfulUploads - 1) + uploadTime) / 
              uploadMetrics.value.successfulUploads
            
            const uploadSpeed = fileObj.size / (uploadTime / 1000) // bytes per second
            uploadMetrics.value.averageUploadSpeed = 
              (uploadMetrics.value.averageUploadSpeed * (uploadMetrics.value.successfulUploads - 1) + uploadSpeed) / 
              uploadMetrics.value.successfulUploads
            
            // Track fastest/slowest uploads
            if (!uploadMetrics.value.fastestUpload || uploadTime < uploadMetrics.value.fastestUpload.time) {
              uploadMetrics.value.fastestUpload = { time: uploadTime, filename: fileObj.name, size: fileObj.size }
            }
            if (!uploadMetrics.value.slowestUpload || uploadTime > uploadMetrics.value.slowestUpload.time) {
              uploadMetrics.value.slowestUpload = { time: uploadTime, filename: fileObj.name, size: fileObj.size }
            }

            // Store comprehensive server response data
            if (result.uploaded_files && result.uploaded_files.length > 0) {
              const uploadedFile = result.uploaded_files[0]
              fileObj.checksum = uploadedFile.checksum
              fileObj.uploadStatus = uploadedFile.upload_status
              fileObj.serverFilename = uploadedFile.server_filename
              fileObj.processingStatus = uploadedFile.processing_status || 'pending'
            }
            
            // Update store with successful upload
            if (store && store.addUploadedFile) {
              store.addUploadedFile({
                ...fileObj,
                sessionId,
                result
              })
            }

            console.log(`Upload completed: ${fileObj.name}`, { 
              fileId: fileObj.id, 
              time: uploadTime,
              size: fileObj.size 
            })
            
            resolve({ success: true, fileId: fileObj.id, data: result, uploadTime })
          } catch (parseError) {
            console.error('Upload response parse error:', parseError)
            const errorMsg = 'Invalid response from server'
            fileObj.status = 'error'
            fileObj.error = errorMsg
            uploadErrors.value[fileObj.id] = errorMsg
            
            reject({
              success: false,
              fileId: fileObj.id,
              error: errorMsg,
              originalError: parseError
            })
          }
        } else {
          let errorMessage = `Upload failed: ${xhr.statusText} (${xhr.status})`
          try {
            const errorData = JSON.parse(xhr.responseText)
            errorMessage = errorData.detail || errorData.message || errorMessage
          } catch (e) {
            // Use default error message
          }
          
          console.error(`Upload failed: ${fileObj.name}`, { 
            status: xhr.status, 
            error: errorMessage,
            attempt 
          })
          
          // Check if we should retry
          if (attempt < UPLOAD_RETRY_ATTEMPTS && [408, 429, 500, 502, 503, 504].includes(xhr.status)) {
            console.log(`Retrying upload: ${fileObj.name} (attempt ${attempt + 1}/${UPLOAD_RETRY_ATTEMPTS})`)
            fileObj.uploadAttempts = attempt
            
            setTimeout(() => {
              uploadSingleFile(sessionId, fileObj, attempt + 1)
                .then(resolve)
                .catch(reject)
            }, UPLOAD_RETRY_DELAY * attempt)
            return
          }
          
          fileObj.status = 'error'
          fileObj.error = errorMessage
          fileObj.uploadAttempts = attempt
          uploadErrors.value[fileObj.id] = errorMessage
          
          // Track failed upload
          uploadMetrics.value.failedUploads++
          
          reject({ 
            success: false, 
            fileId: fileObj.id, 
            error: errorMessage,
            status: xhr.status,
            attempt
          })
        }
      })

      xhr.addEventListener('error', () => {
        const errorMessage = 'Network error during upload'
        console.error(`Network error uploading: ${fileObj.name}`, { attempt })
        
        // Retry on network errors
        if (attempt < UPLOAD_RETRY_ATTEMPTS) {
          console.log(`Retrying upload after network error: ${fileObj.name} (attempt ${attempt + 1}/${UPLOAD_RETRY_ATTEMPTS})`)
          fileObj.uploadAttempts = attempt
          
          setTimeout(() => {
            uploadSingleFile(sessionId, fileObj, attempt + 1)
              .then(resolve)
              .catch(reject)
          }, UPLOAD_RETRY_DELAY * attempt)
          return
        }
        
        fileObj.status = 'error'
        fileObj.error = errorMessage
        fileObj.uploadAttempts = attempt
        uploadErrors.value[fileObj.id] = errorMessage
        
        reject({ 
          success: false, 
          fileId: fileObj.id, 
          error: errorMessage,
          attempt
        })
      })

      xhr.addEventListener('abort', () => {
        const errorMessage = 'Upload cancelled by user'
        console.log(`Upload cancelled: ${fileObj.name}`)
        fileObj.status = 'cancelled'
        fileObj.error = errorMessage
        uploadErrors.value[fileObj.id] = errorMessage
        
        reject({ 
          success: false, 
          fileId: fileObj.id, 
          error: errorMessage,
          cancelled: true
        })
      })

      // Set uploading status and make request
      fileObj.status = 'uploading'
      fileObj.uploadAttempts = attempt
      xhr.open('POST', `/api/sessions/${sessionId}/upload`)
      
      // Add authentication headers
      if (process.env.NODE_ENV === 'development') {
        xhr.setRequestHeader('x-dev-user', 'testuser')
      }
      
      xhr.send(formData)
      
      // Store xhr reference for potential cancellation
      fileObj._xhr = xhr
      
      // Ensure cleanup happens in all cases
      const cleanup = () => {
        if (fileObj._xhr) {
          delete fileObj._xhr
        }
      }
      
      // Add cleanup to all completion paths
      const originalResolve = resolve
      const originalReject = reject
      
      resolve = (...args) => {
        cleanup()
        return originalResolve(...args)
      }
      
      reject = (...args) => {
        cleanup()
        return originalReject(...args)
      }
    })
  }

  /**
   * Upload all pending files to the session with parallel processing
   * @param {string} sessionId - Session ID to upload to
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload results summary
   */
  async function uploadAllFiles(sessionId, options = {}) {
    if (!sessionId) {
      throw new Error('Session ID is required for file upload')
    }

    const { 
      maxConcurrent = 3, // Concurrent uploads
      onProgress = null,  // Progress callback
      onFileComplete = null, // Individual file completion callback
    } = options

    const pendingFiles = files.value.filter(f => f.status === 'pending')

    if (pendingFiles.length === 0) {
      throw new Error('No files available for upload')
    }

    isUploading.value = true
    globalError.value = null
    const results = {
      successful: [],
      failed: [],
      cancelled: [],
      totalFiles: pendingFiles.length,
      totalSize: pendingFiles.reduce((sum, f) => sum + f.size, 0),
      startTime: Date.now(),
      endTime: null
    }

    try {
      // Update store with upload start
      if (store && store.setUploadStatus) {
        store.setUploadStatus('uploading')
      }

      // Process uploads with controlled concurrency
      const uploadPromises = []
      const semaphore = new Array(maxConcurrent).fill(null)
      let fileIndex = 0

      const processNext = async (slotIndex) => {
        while (fileIndex < pendingFiles.length) {
          const currentIndex = fileIndex++
          const fileObj = pendingFiles[currentIndex]

          try {
            const result = await uploadSingleFile(sessionId, fileObj)
            results.successful.push({ ...result, fileIndex: currentIndex })
            
            if (onFileComplete) {
              onFileComplete(fileObj, result, true)
            }
          } catch (error) {
            if (error.cancelled) {
              results.cancelled.push({ ...error, fileIndex: currentIndex })
            } else {
              results.failed.push({ ...error, fileIndex: currentIndex })
            }
            
            if (onFileComplete) {
              onFileComplete(fileObj, error, false)
            }
          }

          // Call progress callback
          if (onProgress) {
            const completed = results.successful.length + results.failed.length + results.cancelled.length
            onProgress(completed, results.totalFiles, results)
          }
        }
      }

      // Start concurrent upload workers
      for (let i = 0; i < maxConcurrent; i++) {
        uploadPromises.push(processNext(i))
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises)
      
      results.endTime = Date.now()
      results.totalTime = results.endTime - results.startTime
      
      // Update store with completion
      if (store) {
        if (store.setUploadStatus) {
          const status = results.failed.length > 0 ? 'partial' : 'completed'
          store.setUploadStatus(status)
        }
        if (store.setUploadResults) {
          store.setUploadResults(results)
        }
      }

      console.log('Upload batch completed:', {
        successful: results.successful.length,
        failed: results.failed.length,
        cancelled: results.cancelled.length,
        totalTime: results.totalTime
      })

      return results
    } catch (error) {
      globalError.value = error.message
      throw error
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Cancel upload for a specific file
   * @param {string} fileId - ID of file to cancel
   */
  function cancelUpload(fileId) {
    const fileObj = files.value.find(f => f.id === fileId)
    if (fileObj && fileObj._xhr) {
      fileObj._xhr.abort()
      fileObj.status = 'cancelled'
      fileObj.error = 'Upload cancelled by user'
      delete fileObj._xhr
      
      console.log(`Cancelled upload: ${fileObj.name}`)
    }
  }

  /**
   * Cancel all active uploads
   */
  function cancelAllUploads() {
    const uploadingFiles = files.value.filter(f => f.status === 'uploading')
    uploadingFiles.forEach(fileObj => {
      if (fileObj._xhr) {
        fileObj._xhr.abort()
        delete fileObj._xhr
      }
      fileObj.status = 'cancelled'
      fileObj.error = 'Upload cancelled by user'
    })
    
    isUploading.value = false
    console.log(`Cancelled ${uploadingFiles.length} uploads`)
  }

  /**
   * Retry failed uploads
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Retry results
   */
  async function retryFailedUploads(sessionId) {
    const failedFiles = files.value.filter(f => f.status === 'error')
    
    if (failedFiles.length === 0) {
      return []
    }

    // Reset failed files to pending
    failedFiles.forEach(fileObj => {
      fileObj.status = 'pending'
      fileObj.error = null
      fileObj.progress = 0
      fileObj.uploadAttempts = 0
      delete uploadErrors.value[fileObj.id]
    })

    return uploadAllFiles(sessionId)
  }

  // Computed properties
  const hasFiles = computed(() => files.value.length > 0)
  const pendingFiles = computed(() =>
    files.value.filter(f => f.status === 'pending')
  )
  const uploadingFiles = computed(() =>
    files.value.filter(f => f.status === 'uploading')
  )
  const completedFiles = computed(() =>
    files.value.filter(f => f.status === 'completed')
  )
  const errorFiles = computed(() =>
    files.value.filter(f => f.status === 'error')
  )

  const hasPendingFiles = computed(() => pendingFiles.value.length > 0)
  const hasErrors = computed(() => errorFiles.value.length > 0)
  const allCompleted = computed(
    () => hasFiles.value && completedFiles.value.length === files.value.length
  )

  const totalFiles = computed(() => files.value.length)
  const completedCount = computed(() => completedFiles.value.length)
  const overallProgress = computed(() => {
    if (!hasFiles.value) return 0

    const totalProgress = files.value.reduce(
      (sum, file) => sum + (file.progress || 0),
      0
    )
    return Math.round(totalProgress / files.value.length)
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

  // Enhanced computed properties
  const totalUploadSize = computed(() => 
    files.value.reduce((sum, file) => sum + file.size, 0)
  )
  
  const uploadStats = computed(() => {
    const stats = {
      total: files.value.length,
      pending: 0,
      uploading: 0,
      completed: 0,
      error: 0,
      cancelled: 0,
      totalSize: totalUploadSize.value,
      uploadedSize: 0,
      averageSpeed: 0
    }
    
    files.value.forEach(file => {
      stats[file.status] = (stats[file.status] || 0) + 1
      if (file.status === 'completed') {
        stats.uploadedSize += file.size
      }
    })
    
    // Calculate average upload speed
    const completedWithSpeed = files.value.filter(f => 
      f.status === 'completed' && f.uploadSpeed
    )
    if (completedWithSpeed.length > 0) {
      stats.averageSpeed = completedWithSpeed.reduce((sum, f) => 
        sum + f.uploadSpeed, 0
      ) / completedWithSpeed.length
    }
    
    return stats
  })

  const canUpload = computed(() => 
    hasPendingFiles.value && !isUploading.value
  )
  
  const hasActiveUploads = computed(() => 
    uploadingFiles.value.length > 0
  )
  
  const uploadSummary = computed(() => {
    const stats = uploadStats.value
    const messages = []
    
    if (stats.completed > 0) {
      messages.push(`${stats.completed} completed`)
    }
    if (stats.error > 0) {
      messages.push(`${stats.error} failed`)
    }
    if (stats.cancelled > 0) {
      messages.push(`${stats.cancelled} cancelled`)
    }
    if (stats.uploading > 0) {
      messages.push(`${stats.uploading} uploading`)
    }
    
    return messages.join(', ') || 'No uploads'
  })

  // Comprehensive cleanup on unmount to prevent memory leaks
  onUnmounted(() => {
    // Cancel all active uploads
    cancelAllUploads()
    
    // Additional cleanup of any remaining xhr references
    files.value.forEach(fileObj => {
      if (fileObj._xhr) {
        try {
          fileObj._xhr.abort()
        } catch (err) {
          console.debug('Error aborting XHR during cleanup:', err)
        }
        delete fileObj._xhr
      }
    })
    
    // Clear upload queue to release memory
    files.value = []
  })

  /**
   * Recover files from recovery queue
   * @param {Array} fileIds - Specific file IDs to recover (optional)
   */
  function recoverFilesFromQueue(fileIds = null) {
    const filesToRecover = fileIds 
      ? recoveryQueue.value.filter(f => fileIds.includes(f.id))
      : [...recoveryQueue.value]
    
    filesToRecover.forEach(recoveryFile => {
      // Remove recovery metadata
      const { recoveryTimestamp, originalProgress, originalError, ...fileData } = recoveryFile
      
      // Reset file state for retry
      fileData.status = 'pending'
      fileData.progress = 0
      fileData.error = null
      fileData.uploadAttempts = 0
      
      // Add back to files array if not already present
      if (!files.value.find(f => f.id === fileData.id)) {
        files.value.push(fileData)
      }
      
      // Remove from recovery queue
      const index = recoveryQueue.value.findIndex(f => f.id === fileData.id)
      if (index !== -1) {
        recoveryQueue.value.splice(index, 1)
      }
    })
    
    console.log(`Recovered ${filesToRecover.length} files from recovery queue`)
  }

  /**
   * Clear all files from recovery queue
   */
  function clearRecoveryQueue() {
    recoveryQueue.value = []
    console.log('Recovery queue cleared')
  }

  return {
    // State
    files,
    isUploading,
    uploadProgress,
    uploadErrors,
    globalError,

    // Computed
    hasFiles,
    pendingFiles,
    uploadingFiles,
    completedFiles,
    errorFiles,
    hasPendingFiles,
    hasErrors,
    allCompleted,
    totalFiles,
    completedCount,
    overallProgress,
    totalUploadSize,
    uploadStats,
    canUpload,
    hasActiveUploads,
    uploadSummary,

    // Core Methods
    validateFile,
    addFiles,
    removeFile,
    clearFiles,
    
    // Upload Methods
    uploadAllFiles,
    cancelUpload,
    cancelAllUploads,
    retryFailedUploads,
    
    // Utility Methods
    formatFileSize,
    generateFileId,
    
    // Recovery Methods
    recoveryQueue,
    recoverFilesFromQueue,
    clearRecoveryQueue,
    
    // Performance
    uploadMetrics,

    // Constants
    MAX_FILE_SIZE,
    MIN_FILE_SIZE,
    ALLOWED_TYPES,
    ALLOWED_EXTENSIONS,
    MAX_FILES_PER_SESSION,
    SUPPORTED_FILE_CATEGORIES,
    UPLOAD_RETRY_ATTEMPTS,
    CHUNK_SIZE,
  }
}
