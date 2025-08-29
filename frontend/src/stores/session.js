import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Pinia store for managing PDF processing session state
 * Handles session lifecycle, file uploads, processing status, and results
 *
 * @typedef {Object} FileItem
 * @property {string|number} id - Unique identifier for the file
 * @property {string} name - Original filename
 * @property {number} [size] - File size in bytes
 * @property {string} [type] - MIME type of the file
 *
 * @typedef {Object} ProcessingResults
 * @property {Array} transactions - Extracted credit card transactions
 * @property {Object} summary - Processing summary statistics
 * @property {Array} [errors] - Any processing errors encountered
 */
export const useSessionStore = defineStore('session', () => {
  // State
  /** @type {import('vue').Ref<string|null>} Current session identifier */
  const sessionId = ref(null)

  /** @type {import('vue').Ref<FileItem[]>} Array of uploaded files in the session */
  const uploadedFiles = ref([])

  /** @type {import('vue').Ref<'idle'|'uploading'|'processing'|'completed'|'error'>} Current processing status */
  const processingStatus = ref('idle') // idle, uploading, processing, completed, error

  /** @type {import('vue').Ref<ProcessingResults|null>} Processing results from the backend */
  const results = ref(null)

  /** @type {import('vue').Ref<string|null>} Error message if processing failed */
  const error = ref(null)

  // Computed Properties

  /**
   * Indicates whether a session is currently active
   * @returns {boolean} True if sessionId is set
   */
  const hasSession = computed(() => !!sessionId.value)

  /**
   * Indicates whether files have been uploaded to the session
   * @returns {boolean} True if uploadedFiles array contains items
   */
  const hasFiles = computed(() => uploadedFiles.value.length > 0)

  /**
   * Indicates whether files are currently being processed
   * @returns {boolean} True if status is 'processing'
   */
  const isProcessing = computed(() => processingStatus.value === 'processing')

  /**
   * Indicates whether processing results are available
   * @returns {boolean} True if results object is set
   */
  const hasResults = computed(() => !!results.value)

  /**
   * Indicates whether an error occurred during processing
   * @returns {boolean} True if error message is set
   */
  const hasError = computed(() => !!error.value)

  // Actions

  /**
   * Creates a new processing session with the given ID
   * Resets all session state to initial values
   * @param {string} id - Unique session identifier from backend
   */
  function createSession(id) {
    sessionId.value = id
    uploadedFiles.value = []
    processingStatus.value = 'idle'
    results.value = null
    error.value = null
  }

  /**
   * Adds a file to the current session's upload list
   * @param {FileItem} file - File object with id, name, and optional metadata
   */
  function addFile(file) {
    uploadedFiles.value.push(file)
  }

  /**
   * Removes a specific file from the upload list
   * @param {string|number} fileId - ID of the file to remove
   */
  function removeFile(fileId) {
    uploadedFiles.value = uploadedFiles.value.filter(file => file.id !== fileId)
  }

  /**
   * Clears all files from the current session
   * Does not affect other session state
   */
  function clearFiles() {
    uploadedFiles.value = []
  }

  /**
   * Updates the current processing status
   * Automatically clears errors when starting processing
   * @param {'idle'|'uploading'|'processing'|'completed'|'error'} status - New processing status
   */
  function setProcessingStatus(status) {
    processingStatus.value = status
    if (status === 'processing') {
      error.value = null
    }
  }

  /**
   * Sets the processing results and marks processing as completed
   * Automatically clears any existing errors
   * @param {ProcessingResults} data - Results from the PDF processing backend
   */
  function setResults(data) {
    results.value = data
    processingStatus.value = 'completed'
    error.value = null
  }

  /**
   * Sets an error message and marks processing as failed
   * @param {string} errorMessage - Human-readable error description
   */
  function setError(errorMessage) {
    error.value = errorMessage
    processingStatus.value = 'error'
  }

  /**
   * Completely clears all session data
   * Returns store to initial state
   */
  function clearSession() {
    sessionId.value = null
    uploadedFiles.value = []
    processingStatus.value = 'idle'
    results.value = null
    error.value = null
  }

  /**
   * Resets processing state while preserving session and files
   * Useful for retrying processing after an error
   */
  function resetProcessing() {
    processingStatus.value = 'idle'
    results.value = null
    error.value = null
  }

  return {
    // State
    sessionId,
    uploadedFiles,
    processingStatus,
    results,
    error,

    // Computed
    hasSession,
    hasFiles,
    isProcessing,
    hasResults,
    hasError,

    // Actions
    createSession,
    addFile,
    removeFile,
    clearFiles,
    setProcessingStatus,
    setResults,
    setError,
    clearSession,
    resetProcessing,
  }
})
