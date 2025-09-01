/**
 * Web Worker for CPU-intensive file processing operations
 * Handles file hashing, validation, and analysis without blocking the main thread
 */

// Worker message types
const MESSAGE_TYPES = {
  CALCULATE_HASH: 'CALCULATE_HASH',
  VALIDATE_FILE: 'VALIDATE_FILE',
  ANALYZE_CONTENT: 'ANALYZE_CONTENT',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
}

// File validation constants
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const PDF_MAGIC_BYTES = '%PDF-'
const CHUNK_SIZE = 64 * 1024 // 64KB chunks for progress updates

/**
 * Calculate secure content hash with progress updates
 * @param {File} file - File object
 * @param {string} taskId - Unique task identifier
 */
async function calculateFileHash(file, taskId) {
  try {
    // Post initial progress
    postMessage({
      type: MESSAGE_TYPES.PROGRESS_UPDATE,
      taskId,
      progress: 0,
      status: 'Starting hash calculation...'
    })

    const SAMPLE_SIZE = 1024 * 1024 // 1MB sample for large files
    let contentToHash = null
    const samples = []

    if (file.size <= SAMPLE_SIZE) {
      // Small files: hash entire content with progress updates
      contentToHash = await readFileWithProgress(file, taskId, 'Reading file content...')
    } else {
      // Large files: hash beginning, middle, and end samples
      const sampleSize = CHUNK_SIZE

      postMessage({
        type: MESSAGE_TYPES.PROGRESS_UPDATE,
        taskId,
        progress: 10,
        status: 'Reading file samples...'
      })

      // Beginning sample
      const beginBlob = file.slice(0, sampleSize)
      const beginSample = await beginBlob.arrayBuffer()
      samples.push(beginSample)

      postMessage({
        type: MESSAGE_TYPES.PROGRESS_UPDATE,
        taskId,
        progress: 30,
        status: 'Processing beginning sample...'
      })

      // Middle sample
      const midStart = Math.floor(file.size / 2) - Math.floor(sampleSize / 2)
      const midBlob = file.slice(midStart, midStart + sampleSize)
      const midSample = await midBlob.arrayBuffer()
      samples.push(midSample)

      postMessage({
        type: MESSAGE_TYPES.PROGRESS_UPDATE,
        taskId,
        progress: 50,
        status: 'Processing middle sample...'
      })

      // End sample
      const endStart = Math.max(file.size - sampleSize, sampleSize * 2)
      const endBlob = file.slice(endStart)
      const endSample = await endBlob.arrayBuffer()
      samples.push(endSample)

      postMessage({
        type: MESSAGE_TYPES.PROGRESS_UPDATE,
        taskId,
        progress: 70,
        status: 'Processing end sample...'
      })

      // Combine samples with metadata
      const combinedSize = samples.reduce((total, sample) => total + sample.byteLength, 0) + 32
      contentToHash = new ArrayBuffer(combinedSize)
      const view = new Uint8Array(contentToHash)

      // Add file metadata
      const encoder = new TextEncoder()
      const metadataBuffer = encoder.encode(`${file.name}-${file.size}-${file.type}`)
      view.set(metadataBuffer.slice(0, 32), 0)

      // Add content samples
      let offset = 32
      for (const sample of samples) {
        view.set(new Uint8Array(sample), offset)
        offset += sample.byteLength
      }
    }

    postMessage({
      type: MESSAGE_TYPES.PROGRESS_UPDATE,
      taskId,
      progress: 80,
      status: 'Generating secure hash...'
    })

    // Generate secure hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', contentToHash)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    postMessage({
      type: MESSAGE_TYPES.SUCCESS,
      taskId,
      data: {
        hash,
        size: file.size,
        type: file.type,
        name: file.name,
        samplingMethod: file.size <= SAMPLE_SIZE ? 'full' : 'sampled'
      }
    })

    // Cleanup
    contentToHash = null
    samples.length = 0

  } catch (error) {
    postMessage({
      type: MESSAGE_TYPES.ERROR,
      taskId,
      error: {
        message: error.message,
        name: error.name,
        details: 'Hash calculation failed'
      }
    })
  }
}

/**
 * Validate file content and structure
 * @param {File} file - File object
 * @param {string} taskId - Unique task identifier
 */
async function validateFile(file, taskId) {
  try {
    postMessage({
      type: MESSAGE_TYPES.PROGRESS_UPDATE,
      taskId,
      progress: 0,
      status: 'Starting file validation...'
    })

    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {}
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      validation.valid = false
      validation.errors.push(`File size (${file.size} bytes) exceeds maximum (${MAX_FILE_SIZE} bytes)`)
    }

    if (file.size < 100) {
      validation.valid = false
      validation.errors.push('File is too small to be a valid PDF')
    }

    validation.checks.sizeCheck = file.size <= MAX_FILE_SIZE && file.size >= 100

    postMessage({
      type: MESSAGE_TYPES.PROGRESS_UPDATE,
      taskId,
      progress: 25,
      status: 'Checking file format...'
    })

    // Read beginning of file for format validation
    const headerChunk = file.slice(0, 1024)
    const headerBuffer = await headerChunk.arrayBuffer()
    const headerBytes = new Uint8Array(headerBuffer)
    const headerString = new TextDecoder().decode(headerBytes.slice(0, 256))

    // PDF magic bytes check
    validation.checks.pdfHeader = headerString.startsWith(PDF_MAGIC_BYTES)
    if (!validation.checks.pdfHeader) {
      validation.valid = false
      validation.errors.push('File does not have valid PDF header')
    }

    postMessage({
      type: MESSAGE_TYPES.PROGRESS_UPDATE,
      taskId,
      progress: 50,
      status: 'Checking file structure...'
    })

    // Check for basic PDF structure in a larger sample
    if (file.size > 1024) {
      const sampleSize = Math.min(file.size, 10 * 1024) // 10KB sample
      const sampleBlob = file.slice(0, sampleSize)
      const sampleBuffer = await sampleBlob.arrayBuffer()
      const sampleString = new TextDecoder('latin1').decode(sampleBuffer)

      validation.checks.hasObjects = sampleString.includes('obj') && sampleString.includes('endobj')
      validation.checks.hasXref = sampleString.includes('xref') || sampleString.includes('trailer')

      if (!validation.checks.hasObjects) {
        validation.warnings.push('PDF structure elements not found in file beginning')
      }
    }

    postMessage({
      type: MESSAGE_TYPES.PROGRESS_UPDATE,
      taskId,
      progress: 75,
      status: 'Checking file ending...'
    })

    // Check for PDF EOF marker
    if (file.size > 1024) {
      const endChunk = file.slice(-1024)
      const endBuffer = await endChunk.arrayBuffer()
      const endString = new TextDecoder('latin1').decode(endBuffer)
      
      validation.checks.hasEOF = endString.includes('%%EOF')
      if (!validation.checks.hasEOF) {
        validation.warnings.push('PDF EOF marker not found')
      }
    }

    postMessage({
      type: MESSAGE_TYPES.SUCCESS,
      taskId,
      data: validation
    })

  } catch (error) {
    postMessage({
      type: MESSAGE_TYPES.ERROR,
      taskId,
      error: {
        message: error.message,
        name: error.name,
        details: 'File validation failed'
      }
    })
  }
}

/**
 * Read file with progress updates
 * @param {File} file - File to read
 * @param {string} taskId - Task identifier
 * @param {string} status - Status message
 * @returns {Promise<ArrayBuffer>} File content
 */
async function readFileWithProgress(file, taskId, status) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    let lastProgress = 0

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        // Only post updates for significant progress changes
        if (progress - lastProgress >= 10) {
          postMessage({
            type: MESSAGE_TYPES.PROGRESS_UPDATE,
            taskId,
            progress: Math.min(progress, 95), // Reserve 95-100 for processing
            status
          })
          lastProgress = progress
        }
      }
    }

    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('File reading failed'))
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Main message handler
 */
self.onmessage = async function(event) {
  const { type, taskId, data } = event.data

  try {
    switch (type) {
      case MESSAGE_TYPES.CALCULATE_HASH:
        await calculateFileHash(data.file, taskId)
        break

      case MESSAGE_TYPES.VALIDATE_FILE:
        await validateFile(data.file, taskId)
        break

      case MESSAGE_TYPES.ANALYZE_CONTENT:
        // Future enhancement: implement content analysis
        postMessage({
          type: MESSAGE_TYPES.ERROR,
          taskId,
          error: {
            message: 'Content analysis not yet implemented',
            name: 'NotImplementedError'
          }
        })
        break

      default:
        postMessage({
          type: MESSAGE_TYPES.ERROR,
          taskId,
          error: {
            message: `Unknown message type: ${type}`,
            name: 'UnknownMessageType'
          }
        })
    }
  } catch (error) {
    postMessage({
      type: MESSAGE_TYPES.ERROR,
      taskId,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      }
    })
  }
}

// Handle worker termination
self.onclose = function() {
  // Cleanup any ongoing operations
  console.log('File processor worker terminated')
}