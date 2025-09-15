/**
 * Selection Error Handler with Retry Logic and Recovery Strategies
 */
class SelectionErrorHandler {
  constructor() {
    this.errorQueue = []
    this.maxRetries = 3
    this.retryDelays = [1000, 2000, 4000]
    this.errorCallbacks = new Map()
    this.circuitBreaker = {
      failures: 0,
      threshold: 5,
      timeout: 30000,
      state: 'closed', // closed, open, half-open
      lastFailureTime: null
    }
  }

  /**
   * Handle selection-related errors with retry logic
   */
  async handleError(error, context, retryable = true) {
    // Check circuit breaker
    if (!this.canProceed()) {
      return this.handleCircuitOpen(error, context)
    }

    const errorEntry = {
      id: this.generateErrorId(),
      error,
      context,
      timestamp: Date.now(),
      retryCount: 0,
      retryable
    }

    this.errorQueue.push(errorEntry)

    if (retryable) {
      return this.retryOperation(errorEntry)
    }

    return this.reportError(errorEntry)
  }

  /**
   * Check if circuit breaker allows operation
   */
  canProceed() {
    if (this.circuitBreaker.state === 'closed') {
      return true
    }

    if (this.circuitBreaker.state === 'open') {
      const now = Date.now()
      if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.timeout) {
        this.circuitBreaker.state = 'half-open'
        return true
      }
      return false
    }

    return true // half-open state allows one attempt
  }

  /**
   * Handle circuit breaker open state
   */
  handleCircuitOpen(error, context) {
    console.warn('[CircuitBreaker] Circuit is open, rejecting operation')
    return {
      success: false,
      error: 'Service temporarily unavailable',
      circuitBreakerOpen: true,
      retryAfter: this.circuitBreaker.timeout - (Date.now() - this.circuitBreaker.lastFailureTime)
    }
  }

  /**
   * Retry failed operations with exponential backoff
   */
  async retryOperation(errorEntry) {
    while (errorEntry.retryCount < this.maxRetries) {
      const delay = this.retryDelays[errorEntry.retryCount] || 5000
      await this.delay(delay)

      try {
        const result = await this.executeRetry(errorEntry)
        this.removeFromQueue(errorEntry.id)
        this.recordSuccess()
        return { success: true, result }
      } catch (retryError) {
        errorEntry.retryCount++
        errorEntry.lastRetryAt = Date.now()
        errorEntry.lastError = retryError
        
        if (errorEntry.retryCount >= this.maxRetries) {
          this.recordFailure()
          return this.handleMaxRetriesExceeded(errorEntry)
        }
      }
    }
  }

  /**
   * Execute retry based on context
   */
  async executeRetry(errorEntry) {
    const { context } = errorEntry
    
    switch (context.type) {
      case 'BULK_DELETE':
        return this.retryBulkDelete(context.data)
      case 'SELECTION_UPDATE':
        return this.retrySelectionUpdate(context.data)
      case 'STATS_CALCULATION':
        return this.retryStatsCalculation(context.data)
      case 'API_CALL':
        return this.retryApiCall(context.data)
      default:
        throw new Error(`Unknown retry context: ${context.type}`)
    }
  }

  /**
   * Retry strategies for different operations
   */
  async retryBulkDelete(data) {
    const { sessionIds, store, api } = data
    
    // Check if sessions still exist and are eligible
    const sessions = await api.getSessions({ ids: sessionIds })
    const validIds = sessions
      .filter(s => this.canDeleteSession(s))
      .map(s => s.session_id)
    
    if (validIds.length === 0) {
      throw new Error('No valid sessions to delete')
    }
    
    const response = await api.bulkDelete(validIds)
    if (response.success) {
      store.completeBulkOperation(response.data)
      return response.data
    }
    throw new Error(response.error || 'Bulk delete failed')
  }

  async retrySelectionUpdate(data) {
    const { store, sessions, action, rules } = data
    
    // Refresh session data before retry
    const freshSessions = await this.refreshSessionData(sessions)
    store.updateSelectionStats(freshSessions, action, rules)
    return true
  }

  async retryStatsCalculation(data) {
    const { store, api } = data
    
    // Recalculate statistics with fresh data
    const freshSessions = await api.getSessions()
    store.setFilteredSessions(freshSessions)
    store.updateSelectionStats(freshSessions)
    return true
  }

  async retryApiCall(data) {
    const { method, endpoint, payload } = data
    
    // Add retry headers
    const headers = {
      'X-Retry-Count': data.retryCount || 0,
      'X-Request-ID': data.requestId || this.generateErrorId()
    }
    
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }
    
    return response.json()
  }

  /**
   * Handle errors that exceeded max retries
   */
  handleMaxRetriesExceeded(errorEntry) {
    this.reportError(errorEntry)
    
    // Notify listeners
    if (this.errorCallbacks.has('maxRetriesExceeded')) {
      this.errorCallbacks.get('maxRetriesExceeded')(errorEntry)
    }

    // Log to monitoring service
    this.logToMonitoring(errorEntry)

    // Try recovery strategy
    const recovery = this.getRecoveryStrategy(errorEntry)
    if (recovery) {
      return this.executeRecovery(recovery, errorEntry)
    }

    return {
      success: false,
      error: 'Maximum retries exceeded',
      details: errorEntry,
      userMessage: this.getUserFriendlyMessage(errorEntry)
    }
  }

  /**
   * Error recovery strategies
   */
  async executeRecovery(strategy, errorEntry) {
    const strategies = {
      'CLEAR_AND_REFRESH': async () => {
        const { store, api } = errorEntry.context.data
        store.clearSelection()
        const sessions = await api.getSessions()
        store.setFilteredSessions(sessions)
        return { recovered: true, strategy: 'CLEAR_AND_REFRESH' }
      },
      
      'PARTIAL_RETRY': async () => {
        const { failedIds, api, store } = errorEntry.context.data
        const successful = []
        const failed = []
        
        for (const id of failedIds) {
          try {
            await api.deleteSession(id)
            successful.push(id)
          } catch (e) {
            failed.push({ id, error: e.message })
          }
        }
        
        return { 
          recovered: successful.length > 0,
          successful,
          failed,
          strategy: 'PARTIAL_RETRY'
        }
      },
      
      'FALLBACK_MODE': async () => {
        const { store } = errorEntry.context.data
        store.enableFallbackMode()
        return { 
          recovered: true, 
          strategy: 'FALLBACK_MODE',
          message: 'Operating in limited mode due to errors'
        }
      }
    }

    if (strategies[strategy]) {
      try {
        return await strategies[strategy]()
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError)
        return { recovered: false, error: recoveryError.message }
      }
    }

    return { recovered: false, error: 'No recovery strategy available' }
  }

  /**
   * Get appropriate recovery strategy
   */
  getRecoveryStrategy(errorEntry) {
    const { context, error } = errorEntry
    
    if (error.message.includes('Network')) {
      return null // Wait for network to recover
    }
    
    if (context.type === 'BULK_DELETE' && error.message.includes('partial')) {
      return 'PARTIAL_RETRY'
    }
    
    if (context.type === 'STATS_CALCULATION') {
      return 'CLEAR_AND_REFRESH'
    }
    
    if (errorEntry.retryCount >= this.maxRetries) {
      return 'FALLBACK_MODE'
    }
    
    return null
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(errorEntry) {
    const { context, error } = errorEntry
    
    const messages = {
      'BULK_DELETE': 'Unable to delete selected sessions. Some may be in use.',
      'SELECTION_UPDATE': 'Selection update failed. Please refresh and try again.',
      'STATS_CALCULATION': 'Unable to calculate statistics. Data may be stale.',
      'API_CALL': 'Connection error. Please check your network and try again.'
    }
    
    return messages[context.type] || 'An unexpected error occurred. Please try again.'
  }

  /**
   * Circuit breaker management
   */
  recordSuccess() {
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed'
      this.circuitBreaker.failures = 0
    }
  }

  recordFailure() {
    this.circuitBreaker.failures++
    this.circuitBreaker.lastFailureTime = Date.now()
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'open'
      console.warn('[CircuitBreaker] Circuit opened due to excessive failures')
    }
  }

  /**
   * Helper methods
   */
  async refreshSessionData(sessions) {
    // Simulate API call to refresh session data
    // In real implementation, this would call the actual API
    return sessions.map(s => ({ ...s, refreshedAt: Date.now() }))
  }

  canDeleteSession(session) {
    const blockedStatuses = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING']
    return !blockedStatuses.includes(session.status?.toUpperCase())
  }

  /**
   * Register error callbacks
   */
  onError(event, callback) {
    this.errorCallbacks.set(event, callback)
    return () => this.errorCallbacks.delete(event)
  }

  /**
   * Utility functions
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  removeFromQueue(errorId) {
    this.errorQueue = this.errorQueue.filter(e => e.id !== errorId)
  }

  reportError(errorEntry) {
    console.error('[SelectionError]', errorEntry)
    
    // Store error for debugging
    if (typeof window !== 'undefined') {
      window.__selectionErrors = window.__selectionErrors || []
      window.__selectionErrors.push(errorEntry)
      
      // Limit stored errors
      if (window.__selectionErrors.length > 50) {
        window.__selectionErrors.shift()
      }
    }
  }

  logToMonitoring(errorEntry) {
    // Integration with monitoring service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(errorEntry.error, {
        contexts: {
          selection: errorEntry.context
        }
      })
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      queueLength: this.errorQueue.length,
      circuitBreakerState: this.circuitBreaker.state,
      failures: this.circuitBreaker.failures,
      recentErrors: this.errorQueue.slice(-5).map(e => ({
        id: e.id,
        type: e.context.type,
        retries: e.retryCount,
        timestamp: e.timestamp
      }))
    }
  }

  /**
   * Clear error queue and reset circuit breaker
   */
  reset() {
    this.errorQueue = []
    this.circuitBreaker.state = 'closed'
    this.circuitBreaker.failures = 0
    this.circuitBreaker.lastFailureTime = null
  }
}

// Create singleton instance
const errorHandler = new SelectionErrorHandler()

export default errorHandler
export { SelectionErrorHandler }