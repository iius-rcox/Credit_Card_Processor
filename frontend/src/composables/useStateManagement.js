import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export function useStateManagement() {
  // State storage
  const state = ref(new Map())
  const stateHistory = ref([])
  const maxHistorySize = 100

  // State subscriptions
  const subscriptions = ref(new Map())
  const subscriptionId = ref(0)

  // State validation
  const validators = ref(new Map())
  const validationErrors = ref(new Map())

  // State persistence
  const persistence = ref({
    enabled: false,
    storage: 'localStorage',
    key: 'app-state',
    serialize: JSON.stringify,
    deserialize: JSON.parse
  })

  // State middleware
  const middleware = ref([])

  // State analysis
  const analysis = computed(() => {
    const stateSize = state.value.size
    const historySize = stateHistory.value.length
    const subscriptionCount = subscriptions.value.size
    const validatorCount = validators.value.size
    const errorCount = validationErrors.value.size

    return {
      stateSize: {
        value: stateSize,
        threshold: 1000,
        status: stateSize <= 1000 ? 'good' : 'poor'
      },
      historySize: {
        value: historySize,
        threshold: maxHistorySize,
        status: historySize <= maxHistorySize ? 'good' : 'poor'
      },
      subscriptionCount: {
        value: subscriptionCount,
        threshold: 100,
        status: subscriptionCount <= 100 ? 'good' : 'poor'
      },
      validatorCount: {
        value: validatorCount,
        threshold: 50,
        status: validatorCount <= 50 ? 'good' : 'poor'
      },
      errorCount: {
        value: errorCount,
        threshold: 10,
        status: errorCount <= 10 ? 'good' : 'poor'
      }
    }
  })

  // State recommendations
  const recommendations = computed(() => {
    const recs = []
    const currentAnalysis = analysis.value

    if (currentAnalysis.stateSize.status === 'poor') {
      recs.push({
        type: 'state',
        issue: 'State size is too large',
        recommendation: 'Consider splitting state into smaller, more focused stores',
        priority: 'high'
      })
    }

    if (currentAnalysis.historySize.status === 'poor') {
      recs.push({
        type: 'state',
        issue: 'State history is too large',
        recommendation: 'Consider implementing state history cleanup or pagination',
        priority: 'medium'
      })
    }

    if (currentAnalysis.subscriptionCount.status === 'poor') {
      recs.push({
        type: 'state',
        issue: 'Too many state subscriptions',
        recommendation: 'Consider consolidating subscriptions or using computed properties',
        priority: 'medium'
      })
    }

    if (currentAnalysis.validatorCount.status === 'poor') {
      recs.push({
        type: 'state',
        issue: 'Too many state validators',
        recommendation: 'Consider consolidating validators or using schema validation',
        priority: 'low'
      })
    }

    if (currentAnalysis.errorCount.status === 'poor') {
      recs.push({
        type: 'state',
        issue: 'Too many validation errors',
        recommendation: 'Review and fix validation errors',
        priority: 'high'
      })
    }

    return recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  })

  // Set state
  function setState(key, value, options = {}) {
    const {
      validate = true,
      persist = false,
      history = true,
      middleware = true
    } = options

    // Validate state
    if (validate && validators.value.has(key)) {
      const validator = validators.value.get(key)
      const validation = validator(value)
      if (!validation.valid) {
        validationErrors.value.set(key, validation.errors)
        throw new Error(`State validation failed for key "${key}": ${validation.errors.join(', ')}`)
      }
      validationErrors.value.delete(key)
    }

    // Apply middleware
    if (middleware && middleware.value.length > 0) {
      for (const mw of middleware.value) {
        const result = mw(key, value, state.value.get(key))
        if (result === false) {
          throw new Error(`Middleware blocked state update for key "${key}"`)
        }
        if (result !== undefined) {
          value = result
        }
      }
    }

    // Store previous value for history
    const previousValue = state.value.get(key)

    // Set state
    state.value.set(key, value)

    // Add to history
    if (history) {
      addToHistory(key, previousValue, value)
    }

    // Persist state
    if (persist && persistence.value.enabled) {
      persistState()
    }

    // Notify subscribers
    notifySubscribers(key, value, previousValue)

    return value
  }

  // Get state
  function getState(key, defaultValue = undefined) {
    return state.value.get(key) ?? defaultValue
  }

  // Delete state
  function deleteState(key) {
    const previousValue = state.value.get(key)
    const deleted = state.value.delete(key)

    if (deleted) {
      // Add to history
      addToHistory(key, previousValue, undefined)

      // Persist state
      if (persistence.value.enabled) {
        persistState()
      }

      // Notify subscribers
      notifySubscribers(key, undefined, previousValue)
    }

    return deleted
  }

  // Check if state exists
  function hasState(key) {
    return state.value.has(key)
  }

  // Get all state keys
  function getStateKeys() {
    return Array.from(state.value.keys())
  }

  // Get all state values
  function getStateValues() {
    return Array.from(state.value.values())
  }

  // Get all state entries
  function getStateEntries() {
    return Array.from(state.value.entries())
  }

  // Clear all state
  function clearState() {
    const previousState = new Map(state.value)
    state.value.clear()

    // Add to history
    addToHistory('*', previousState, new Map())

    // Persist state
    if (persistence.value.enabled) {
      persistState()
    }

    // Notify all subscribers
    for (const [key, value] of previousState.entries()) {
      notifySubscribers(key, undefined, value)
    }
  }

  // Subscribe to state changes
  function subscribe(key, callback, options = {}) {
    const {
      immediate = false,
      deep = false
    } = options

    const id = ++subscriptionId.value
    const subscription = {
      id,
      key,
      callback,
      deep,
      createdAt: Date.now()
    }

    subscriptions.value.set(id, subscription)

    // Call immediately if requested
    if (immediate) {
      callback(getState(key), undefined, key)
    }

    return id
  }

  // Unsubscribe from state changes
  function unsubscribe(id) {
    return subscriptions.value.delete(id)
  }

  // Notify subscribers
  function notifySubscribers(key, newValue, oldValue) {
    for (const subscription of subscriptions.value.values()) {
      if (subscription.key === key || subscription.key === '*') {
        try {
          subscription.callback(newValue, oldValue, key)
        } catch (error) {
          console.error(`Error in state subscription for key "${key}":`, error)
        }
      }
    }
  }

  // Add to history
  function addToHistory(key, oldValue, newValue) {
    const entry = {
      key,
      oldValue,
      newValue,
      timestamp: Date.now()
    }

    stateHistory.value.push(entry)

    // Limit history size
    if (stateHistory.value.length > maxHistorySize) {
      stateHistory.value.shift()
    }
  }

  // Get state history
  function getStateHistory(key = null, limit = 50) {
    let history = stateHistory.value

    if (key) {
      history = history.filter(entry => entry.key === key)
    }

    return history.slice(-limit)
  }

  // Undo last state change
  function undo() {
    if (stateHistory.value.length === 0) return false

    const lastEntry = stateHistory.value.pop()
    if (lastEntry) {
      if (lastEntry.oldValue === undefined) {
        state.value.delete(lastEntry.key)
      } else {
        state.value.set(lastEntry.key, lastEntry.oldValue)
      }

      // Notify subscribers
      notifySubscribers(lastEntry.key, lastEntry.oldValue, lastEntry.newValue)

      return true
    }

    return false
  }

  // Redo last undone state change
  function redo() {
    // This would require a separate redo history
    // For now, we'll just return false
    return false
  }

  // Add state validator
  function addValidator(key, validator) {
    validators.value.set(key, validator)
  }

  // Remove state validator
  function removeValidator(key) {
    validators.value.delete(key)
    validationErrors.value.delete(key)
  }

  // Validate state
  function validateState(key) {
    if (!validators.value.has(key)) return { valid: true, errors: [] }

    const validator = validators.value.get(key)
    const value = state.value.get(key)
    const validation = validator(value)

    if (!validation.valid) {
      validationErrors.value.set(key, validation.errors)
    } else {
      validationErrors.value.delete(key)
    }

    return validation
  }

  // Validate all state
  function validateAllState() {
    const results = {}
    for (const key of state.value.keys()) {
      results[key] = validateState(key)
    }
    return results
  }

  // Add middleware
  function addMiddleware(middlewareFn) {
    middleware.value.push(middlewareFn)
  }

  // Remove middleware
  function removeMiddleware(middlewareFn) {
    const index = middleware.value.indexOf(middlewareFn)
    if (index > -1) {
      middleware.value.splice(index, 1)
    }
  }

  // Enable persistence
  function enablePersistence(options = {}) {
    persistence.value = {
      ...persistence.value,
      ...options,
      enabled: true
    }

    // Load persisted state
    loadPersistedState()
  }

  // Disable persistence
  function disablePersistence() {
    persistence.value.enabled = false
  }

  // Persist state
  function persistState() {
    if (!persistence.value.enabled) return

    try {
      const stateObj = Object.fromEntries(state.value.entries())
      const serialized = persistence.value.serialize(stateObj)
      
      if (persistence.value.storage === 'localStorage') {
        localStorage.setItem(persistence.value.key, serialized)
      } else if (persistence.value.storage === 'sessionStorage') {
        sessionStorage.setItem(persistence.value.key, serialized)
      }
    } catch (error) {
      console.error('Failed to persist state:', error)
    }
  }

  // Load persisted state
  function loadPersistedState() {
    if (!persistence.value.enabled) return

    try {
      let serialized = null
      
      if (persistence.value.storage === 'localStorage') {
        serialized = localStorage.getItem(persistence.value.key)
      } else if (persistence.value.storage === 'sessionStorage') {
        serialized = sessionStorage.getItem(persistence.value.key)
      }

      if (serialized) {
        const stateObj = persistence.value.deserialize(serialized)
        for (const [key, value] of Object.entries(stateObj)) {
          state.value.set(key, value)
        }
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error)
    }
  }

  // Get state statistics
  function getStateStatistics() {
    return {
      stateSize: state.value.size,
      historySize: stateHistory.value.length,
      subscriptionCount: subscriptions.value.size,
      validatorCount: validators.value.size,
      errorCount: validationErrors.value.size,
      persistenceEnabled: persistence.value.enabled,
      middlewareCount: middleware.value.length
    }
  }

  // Get state report
  function getStateReport() {
    return {
      state: Object.fromEntries(state.value.entries()),
      history: stateHistory.value,
      subscriptions: Array.from(subscriptions.value.values()),
      validators: Array.from(validators.value.keys()),
      errors: Object.fromEntries(validationErrors.value.entries()),
      statistics: getStateStatistics(),
      analysis: analysis.value,
      recommendations: recommendations.value
    }
  }

  // Export state data
  function exportStateData() {
    const report = getStateReport()
    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `state-report-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    // Clear all subscriptions
    subscriptions.value.clear()
    
    // Clear all validators
    validators.value.clear()
    
    // Clear all middleware
    middleware.value.length = 0
  })

  return {
    // State
    state,
    stateHistory,
    subscriptions,
    validators,
    validationErrors,
    persistence,
    middleware,
    analysis,
    recommendations,

    // State operations
    setState,
    getState,
    deleteState,
    hasState,
    getStateKeys,
    getStateValues,
    getStateEntries,
    clearState,

    // Subscriptions
    subscribe,
    unsubscribe,

    // History
    getStateHistory,
    undo,
    redo,

    // Validation
    addValidator,
    removeValidator,
    validateState,
    validateAllState,

    // Middleware
    addMiddleware,
    removeMiddleware,

    // Persistence
    enablePersistence,
    disablePersistence,
    persistState,
    loadPersistedState,

    // Reporting
    getStateStatistics,
    getStateReport,
    exportStateData
  }
}







