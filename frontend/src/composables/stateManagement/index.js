// State Management Composables Index
// This file exports all state management composables for easy importing

// Core state management composables
export { useStateManagement } from '../useStateManagement'
export { useStateSynchronization } from '../useStateSynchronization'
export { useStatePersistence } from '../useStatePersistence'

// State management utilities
export const STATE_UTILS = {
  // State validation utilities
  validators: {
    required: (value) => ({
      valid: value !== undefined && value !== null && value !== '',
      errors: value === undefined || value === null || value === '' ? ['Value is required'] : []
    }),

    minLength: (min) => (value) => ({
      valid: typeof value === 'string' && value.length >= min,
      errors: typeof value !== 'string' || value.length < min ? [`Value must be at least ${min} characters long`] : []
    }),

    maxLength: (max) => (value) => ({
      valid: typeof value === 'string' && value.length <= max,
      errors: typeof value !== 'string' || value.length > max ? [`Value must be at most ${max} characters long`] : []
    }),

    min: (min) => (value) => ({
      valid: typeof value === 'number' && value >= min,
      errors: typeof value !== 'number' || value < min ? [`Value must be at least ${min}`] : []
    }),

    max: (max) => (value) => ({
      valid: typeof value === 'number' && value <= max,
      errors: typeof value !== 'number' || value > max ? [`Value must be at most ${max}`] : []
    }),

    email: (value) => ({
      valid: typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      errors: typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? ['Value must be a valid email address'] : []
    }),

    url: (value) => {
      try {
        new URL(value)
        return { valid: true, errors: [] }
      } catch {
        return { valid: false, errors: ['Value must be a valid URL'] }
      }
    },

    pattern: (regex) => (value) => ({
      valid: typeof value === 'string' && regex.test(value),
      errors: typeof value !== 'string' || !regex.test(value) ? ['Value does not match required pattern'] : []
    }),

    custom: (validator) => (value) => {
      try {
        const result = validator(value)
        return typeof result === 'boolean' ? { valid: result, errors: result ? [] : ['Validation failed'] } : result
      } catch (error) {
        return { valid: false, errors: [error.message] }
      }
    }
  },

  // State transformation utilities
  transformers: {
    trim: (value) => typeof value === 'string' ? value.trim() : value,
    toLowerCase: (value) => typeof value === 'string' ? value.toLowerCase() : value,
    toUpperCase: (value) => typeof value === 'string' ? value.toUpperCase() : value,
    parseInt: (value) => typeof value === 'string' ? parseInt(value, 10) : value,
    parseFloat: (value) => typeof value === 'string' ? parseFloat(value) : value,
    json: (value) => {
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return value
      }
    },
    stringify: (value) => typeof value === 'object' ? JSON.stringify(value) : value
  },

  // State comparison utilities
  comparators: {
    deepEqual: (a, b) => {
      if (a === b) return true
      if (a == null || b == null) return false
      if (typeof a !== typeof b) return false
      if (typeof a !== 'object') return false

      const keysA = Object.keys(a)
      const keysB = Object.keys(b)

      if (keysA.length !== keysB.length) return false

      for (const key of keysA) {
        if (!keysB.includes(key)) return false
        if (!STATE_UTILS.comparators.deepEqual(a[key], b[key])) return false
      }

      return true
    },

    shallowEqual: (a, b) => {
      if (a === b) return true
      if (a == null || b == null) return false
      if (typeof a !== typeof b) return false
      if (typeof a !== 'object') return false

      const keysA = Object.keys(a)
      const keysB = Object.keys(b)

      if (keysA.length !== keysB.length) return false

      for (const key of keysA) {
        if (!keysB.includes(key)) return false
        if (a[key] !== b[key]) return false
      }

      return true
    }
  },

  // State serialization utilities
  serializers: {
    json: {
      serialize: JSON.stringify,
      deserialize: JSON.parse
    },
    base64: {
      serialize: (value) => btoa(JSON.stringify(value)),
      deserialize: (value) => JSON.parse(atob(value))
    },
    url: {
      serialize: (value) => encodeURIComponent(JSON.stringify(value)),
      deserialize: (value) => JSON.parse(decodeURIComponent(value))
    }
  }
}

// State management constants
export const STATE_CONSTANTS = {
  // Storage types
  STORAGE_TYPES: {
    LOCAL_STORAGE: 'localStorage',
    SESSION_STORAGE: 'sessionStorage',
    INDEXED_DB: 'indexedDB',
    WEB_SQL: 'websql',
    MEMORY: 'memory'
  },

  // Conflict resolution strategies
  CONFLICT_RESOLUTION: {
    LAST_WRITE_WINS: 'last-write-wins',
    FIRST_WRITE_WINS: 'first-write-wins',
    MERGE: 'merge',
    MANUAL: 'manual'
  },

  // Persistence strategies
  PERSISTENCE_STRATEGIES: {
    IMMEDIATE: 'immediate',
    DEBOUNCED: 'debounced',
    INTERVAL: 'interval',
    MANUAL: 'manual'
  },

  // Validation levels
  VALIDATION_LEVELS: {
    NONE: 'none',
    BASIC: 'basic',
    STRICT: 'strict',
    CUSTOM: 'custom'
  },

  // State types
  STATE_TYPES: {
    PRIMITIVE: 'primitive',
    OBJECT: 'object',
    ARRAY: 'array',
    FUNCTION: 'function',
    SYMBOL: 'symbol'
  }
}

// State management categories
export const STATE_CATEGORIES = {
  CORE: 'core',
  SYNCHRONIZATION: 'synchronization',
  PERSISTENCE: 'persistence',
  VALIDATION: 'validation',
  TRANSFORMATION: 'transformation'
}

// State management severity levels
export const STATE_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

// State management status levels
export const STATE_STATUS = {
  GOOD: 'good',
  POOR: 'poor',
  CRITICAL: 'critical'
}

// Helper function to get all state management composables
export function getAllStateManagementComposables() {
  return {
    useStateManagement,
    useStateSynchronization,
    useStatePersistence
  }
}

// Helper function to create a comprehensive state manager
export function createStateManager() {
  const state = useStateManagement()
  const sync = useStateSynchronization()
  const persistence = useStatePersistence()

  return {
    // Core functionality
    state,
    sync,
    persistence,

    // Combined methods
    enableAll: (options = {}) => {
      state.enablePersistence?.(options.persistence)
      sync.enableSynchronization?.(options.sync)
      persistence.enablePersistence?.(options.persistence)
    },

    disableAll: () => {
      state.disablePersistence?.()
      sync.disableSynchronization?.()
      persistence.disablePersistence?.()
    },

    getComprehensiveReport: () => {
      return {
        state: state.getStateReport?.() || null,
        sync: sync.getSyncReport?.() || null,
        persistence: persistence.getPersistenceReport?.() || null
      }
    },

    exportAllData: () => {
      const report = createStateManager().getComprehensiveReport()
      const dataStr = JSON.stringify(report, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `state-report-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
    },

    optimizeAll: () => {
      state.optimizeMemory?.()
      sync.optimizeMemory?.()
      persistence.optimizeMemory?.()
    }
  }
}

// State management middleware
export const STATE_MIDDLEWARE = {
  // Logging middleware
  logging: (key, value, oldValue) => {
    console.log(`State change: ${key} = ${value} (was: ${oldValue})`)
    return value
  },

  // Validation middleware
  validation: (validators) => (key, value, oldValue) => {
    if (validators[key]) {
      const validation = validators[key](value)
      if (!validation.valid) {
        throw new Error(`Validation failed for key "${key}": ${validation.errors.join(', ')}`)
      }
    }
    return value
  },

  // Transformation middleware
  transformation: (transformers) => (key, value, oldValue) => {
    if (transformers[key]) {
      return transformers[key](value)
    }
    return value
  },

  // Persistence middleware
  persistence: (persistKeys) => (key, value, oldValue) => {
    if (persistKeys.includes(key)) {
      // This would trigger persistence
      console.log(`Persisting key: ${key}`)
    }
    return value
  },

  // Synchronization middleware
  synchronization: (syncKeys) => (key, value, oldValue) => {
    if (syncKeys.includes(key)) {
      // This would trigger synchronization
      console.log(`Synchronizing key: ${key}`)
    }
    return value
  }
}

// State management hooks
export const STATE_HOOKS = {
  // Hook into state changes
  onStateChange: (key, callback) => {
    return {
      watch: (newValue, oldValue) => {
        if (key === '*' || key === newValue) {
          callback(newValue, oldValue, key)
        }
      }
    }
  },

  // Hook into state validation
  onStateValidation: (key, callback) => {
    return {
      validate: (value) => {
        if (key === '*' || key === value) {
          return callback(value)
        }
        return { valid: true, errors: [] }
      }
    }
  },

  // Hook into state persistence
  onStatePersistence: (key, callback) => {
    return {
      persist: (value) => {
        if (key === '*' || key === value) {
          return callback(value)
        }
        return value
      }
    }
  }
}




