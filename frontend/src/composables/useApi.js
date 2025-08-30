import { ref } from 'vue'

/**
 * API integration composable for Credit Card Processor backend
 * Provides HTTP client with error handling and response management
 */
export function useApi() {
  const isLoading = ref(false)
  const error = ref(null)

  const apiBase = '/api' // Uses Vite proxy to backend

  /**
   * Generic API request handler with error management
   * @param {string} endpoint - API endpoint path
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async function request(endpoint, options = {}) {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      return await response.json()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new processing session
   * @returns {Promise<{session_id: string}>}
   */
  async function createSession() {
    return request('/sessions', {
      method: 'POST',
    })
  }

  /**
   * Get session status and details
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function getSession(sessionId) {
    return request(`/sessions/${sessionId}`)
  }

  /**
   * Upload file to session
   * @param {string} sessionId - Session identifier
   * @param {File} file - File to upload
   * @returns {Promise<Object>}
   */
  async function uploadFile(sessionId, file) {
    const formData = new FormData()
    formData.append('file', file)

    return request(`/sessions/${sessionId}/upload`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    })
  }

  /**
   * Start processing uploaded files in session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function startProcessing(sessionId) {
    return request(`/sessions/${sessionId}/process`, {
      method: 'POST',
    })
  }

  /**
   * Get processing status for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function getProcessingStatus(sessionId) {
    return request(`/sessions/${sessionId}/status`)
  }

  /**
   * Get processing results for completed session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>}
   */
  async function getResults(sessionId) {
    return request(`/sessions/${sessionId}/results`)
  }

  /**
   * Export results in specified format
   * @param {string} sessionId - Session identifier
   * @param {string} format - Export format (csv, excel, json)
   * @returns {Promise<Blob>}
   */
  async function exportResults(sessionId, format = 'csv') {
    const response = await fetch(
      `${apiBase}/sessions/${sessionId}/export?format=${format}`
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.detail || `Export failed: ${response.statusText}`
      )
    }

    return response.blob()
  }

  return {
    // State
    isLoading,
    error,

    // Methods
    request,
    createSession,
    getSession,
    uploadFile,
    startProcessing,
    getProcessingStatus,
    getResults,
    exportResults,
  }
}
