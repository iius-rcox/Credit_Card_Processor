import { ref, onUnmounted } from 'vue'

/**
 * Composable for managing file processing Web Worker
 * Handles CPU-intensive operations like hashing and validation without blocking UI
 */
export function useFileWorker() {
  const worker = ref(null)
  const isWorkerSupported = ref(false)
  const activeTasks = ref(new Map())
  
  // Message types for worker communication
  const MESSAGE_TYPES = {
    CALCULATE_HASH: 'CALCULATE_HASH',
    VALIDATE_FILE: 'VALIDATE_FILE',
    ANALYZE_CONTENT: 'ANALYZE_CONTENT',
    PROGRESS_UPDATE: 'PROGRESS_UPDATE',
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS'
  }

  /**
   * Initialize the Web Worker
   */
  function initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        worker.value = new Worker('/workers/fileProcessor.js')
        isWorkerSupported.value = true
        
        // Set up message handler
        worker.value.onmessage = handleWorkerMessage
        
        worker.value.onerror = (error) => {
          console.error('Worker error:', error)
          // Fallback to main thread processing
          isWorkerSupported.value = false
        }
        
        console.log('File processing worker initialized')
      } catch (error) {
        console.warn('Worker initialization failed, falling back to main thread:', error)
        isWorkerSupported.value = false
      }
    } else {
      console.warn('Web Workers not supported, using main thread processing')
      isWorkerSupported.value = false
    }
  }

  /**
   * Handle messages from worker
   */
  function handleWorkerMessage(event) {
    const { type, taskId, data, error, progress, status } = event.data
    const task = activeTasks.value.get(taskId)
    
    if (!task) {
      console.warn('Received message for unknown task:', taskId)
      return
    }

    switch (type) {
      case MESSAGE_TYPES.PROGRESS_UPDATE:
        if (task.onProgress) {
          task.onProgress({ progress, status })
        }
        break

      case MESSAGE_TYPES.SUCCESS:
        if (task.resolve) {
          task.resolve(data)
        }
        activeTasks.value.delete(taskId)
        break

      case MESSAGE_TYPES.ERROR:
        if (task.reject) {
          const workerError = new Error(error.message || 'Worker operation failed')
          workerError.name = error.name || 'WorkerError'
          workerError.details = error.details
          task.reject(workerError)
        }
        activeTasks.value.delete(taskId)
        break

      default:
        console.warn('Unknown worker message type:', type)
    }
  }

  /**
   * Generate unique task ID
   */
  function generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Calculate file hash using Web Worker
   * @param {File} file - File to process
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Hash result
   */
  async function calculateHash(file, onProgress = null) {
    if (!isWorkerSupported.value || !worker.value) {
      // Fallback to main thread
      return calculateHashMainThread(file, onProgress)
    }

    const taskId = generateTaskId()
    
    return new Promise((resolve, reject) => {
      // Store task for message handling
      activeTasks.value.set(taskId, {
        resolve,
        reject,
        onProgress,
        startTime: Date.now()
      })

      // Post message to worker
      worker.value.postMessage({
        type: MESSAGE_TYPES.CALCULATE_HASH,
        taskId,
        data: { file }
      })

      // Set timeout for long-running operations
      setTimeout(() => {
        if (activeTasks.value.has(taskId)) {
          activeTasks.value.delete(taskId)
          reject(new Error('Hash calculation timeout'))
        }
      }, 60000) // 60 second timeout
    })
  }

  /**
   * Validate file using Web Worker
   * @param {File} file - File to validate
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Validation result
   */
  async function validateFile(file, onProgress = null) {
    if (!isWorkerSupported.value || !worker.value) {
      // Fallback to main thread
      return validateFileMainThread(file, onProgress)
    }

    const taskId = generateTaskId()
    
    return new Promise((resolve, reject) => {
      // Store task for message handling
      activeTasks.value.set(taskId, {
        resolve,
        reject,
        onProgress,
        startTime: Date.now()
      })

      // Post message to worker
      worker.value.postMessage({
        type: MESSAGE_TYPES.VALIDATE_FILE,
        taskId,
        data: { file }
      })

      // Set timeout
      setTimeout(() => {
        if (activeTasks.value.has(taskId)) {
          activeTasks.value.delete(taskId)
          reject(new Error('File validation timeout'))
        }
      }, 30000) // 30 second timeout
    })
  }

  /**
   * Fallback hash calculation on main thread
   */
  async function calculateHashMainThread(file, onProgress) {
    try {
      if (onProgress) {
        onProgress({ progress: 0, status: 'Starting hash calculation (main thread)...' })
      }

      const SAMPLE_SIZE = 1024 * 1024 // 1MB
      let contentToHash = null

      if (file.size <= SAMPLE_SIZE) {
        if (onProgress) {
          onProgress({ progress: 25, status: 'Reading file content...' })
        }
        contentToHash = await file.arrayBuffer()
      } else {
        if (onProgress) {
          onProgress({ progress: 25, status: 'Reading file samples...' })
        }
        
        // Simplified sampling for main thread
        const beginBlob = file.slice(0, 64 * 1024)
        const endBlob = file.slice(-64 * 1024)
        const beginSample = await beginBlob.arrayBuffer()
        const endSample = await endBlob.arrayBuffer()
        
        const combinedSize = beginSample.byteLength + endSample.byteLength + 32
        contentToHash = new ArrayBuffer(combinedSize)
        const view = new Uint8Array(contentToHash)
        
        const encoder = new TextEncoder()
        const metadata = encoder.encode(`${file.name}-${file.size}-${file.type}`)
        view.set(metadata.slice(0, 32), 0)
        view.set(new Uint8Array(beginSample), 32)
        view.set(new Uint8Array(endSample), 32 + beginSample.byteLength)
      }

      if (onProgress) {
        onProgress({ progress: 75, status: 'Generating hash...' })
      }

      const hashBuffer = await crypto.subtle.digest('SHA-256', contentToHash)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      if (onProgress) {
        onProgress({ progress: 100, status: 'Hash calculation complete' })
      }

      return {
        hash,
        size: file.size,
        type: file.type,
        name: file.name,
        samplingMethod: file.size <= SAMPLE_SIZE ? 'full' : 'sampled'
      }
    } catch (error) {
      console.error('Main thread hash calculation failed:', error)
      throw error
    }
  }

  /**
   * Fallback file validation on main thread
   */
  async function validateFileMainThread(file, onProgress) {
    try {
      if (onProgress) {
        onProgress({ progress: 0, status: 'Starting validation (main thread)...' })
      }

      const validation = {
        valid: true,
        errors: [],
        warnings: [],
        checks: {}
      }

      // Basic checks
      const MAX_SIZE = 100 * 1024 * 1024
      validation.checks.sizeCheck = file.size <= MAX_SIZE && file.size >= 100
      
      if (!validation.checks.sizeCheck) {
        validation.valid = false
        if (file.size > MAX_SIZE) {
          validation.errors.push(`File too large: ${file.size} bytes`)
        } else {
          validation.errors.push('File too small to be valid PDF')
        }
      }

      if (onProgress) {
        onProgress({ progress: 50, status: 'Checking file format...' })
      }

      // Basic PDF check
      const headerChunk = file.slice(0, 256)
      const headerBuffer = await headerChunk.arrayBuffer()
      const headerString = new TextDecoder().decode(headerBuffer)
      
      validation.checks.pdfHeader = headerString.startsWith('%PDF-')
      if (!validation.checks.pdfHeader) {
        validation.valid = false
        validation.errors.push('Invalid PDF header')
      }

      if (onProgress) {
        onProgress({ progress: 100, status: 'Validation complete' })
      }

      return validation
    } catch (error) {
      console.error('Main thread validation failed:', error)
      throw error
    }
  }

  /**
   * Cancel all active tasks
   */
  function cancelAllTasks() {
    for (const [taskId, task] of activeTasks.value) {
      if (task.reject) {
        task.reject(new Error('Task cancelled'))
      }
    }
    activeTasks.value.clear()
  }

  /**
   * Terminate worker
   */
  function terminateWorker() {
    if (worker.value) {
      cancelAllTasks()
      worker.value.terminate()
      worker.value = null
      isWorkerSupported.value = false
    }
  }

  // Initialize worker on first use
  if (!worker.value && typeof window !== 'undefined') {
    initWorker()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    terminateWorker()
  })

  return {
    // State
    isWorkerSupported,
    activeTasks: activeTasks.value,
    
    // Methods
    calculateHash,
    validateFile,
    cancelAllTasks,
    terminateWorker,
    initWorker
  }
}