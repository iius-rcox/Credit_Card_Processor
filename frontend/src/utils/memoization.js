/**
 * Memoization Utilities for Performance Optimization
 * Caches expensive calculations to improve performance
 */

/**
 * LRU Cache implementation for memoization
 */
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize
    this.cache = new Map()
    this.accessOrder = []
    this.hits = 0
    this.misses = 0
  }

  get(key) {
    if (this.cache.has(key)) {
      this.hits++
      // Move to end (most recently used)
      this.updateAccessOrder(key)
      return this.cache.get(key)
    }
    this.misses++
    return undefined
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.set(key, value)
      this.updateAccessOrder(key)
    } else {
      // Evict least recently used if at capacity
      if (this.cache.size >= this.maxSize) {
        const lru = this.accessOrder.shift()
        this.cache.delete(lru)
      }
      this.cache.set(key, value)
      this.accessOrder.push(key)
    }
  }

  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  clear() {
    this.cache.clear()
    this.accessOrder = []
    this.hits = 0
    this.misses = 0
  }

  getStats() {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      size: this.cache.size,
      maxSize: this.maxSize
    }
  }
}

/**
 * Main Memoization Manager
 */
export class MemoizationManager {
  constructor() {
    this.caches = new Map()
    this.globalMaxSize = 1000
    this.currentSize = 0
  }

  /**
   * Create a memoized version of a function
   */
  memoize(fn, options = {}) {
    const {
      maxSize = 100,
      ttl = null, // Time to live in ms
      keyGenerator = this.defaultKeyGenerator,
      cacheName = fn.name || 'anonymous'
    } = options

    // Create cache for this function
    const cache = new LRUCache(maxSize)
    this.caches.set(cacheName, cache)

    return (...args) => {
      const key = keyGenerator(...args)
      const cached = cache.get(key)

      if (cached !== undefined) {
        // Check TTL if specified
        if (ttl && Date.now() - cached.timestamp > ttl) {
          // Expired, recalculate
          const result = fn(...args)
          cache.set(key, { value: result, timestamp: Date.now() })
          return result
        }
        return ttl ? cached.value : cached
      }

      // Calculate and cache
      const result = fn(...args)
      cache.set(key, ttl ? { value: result, timestamp: Date.now() } : result)
      return result
    }
  }

  /**
   * Memoize expensive selection calculations
   */
  memoizeSelectionStats(fn) {
    return this.memoize(fn, {
      maxSize: 50,
      ttl: 5000, // 5 seconds
      keyGenerator: (sessions, selectedIds, action) => {
        if (!sessions || !selectedIds) return 'empty'
        
        // Create a stable key from inputs
        const sessionKey = `${sessions.length}_${sessions[0]?.session_id || ''}`
        const selectionKey = selectedIds instanceof Set 
          ? `${selectedIds.size}_${Array.from(selectedIds).slice(0, 3).join('_')}`
          : `${selectedIds.length}_${selectedIds.slice(0, 3).join('_')}`
        
        return `${sessionKey}|${selectionKey}|${action}`
      },
      cacheName: 'selectionStats'
    })
  }

  /**
   * Memoize eligibility checks
   */
  memoizeEligibilityCheck(fn) {
    return this.memoize(fn, {
      maxSize: 200,
      ttl: 60000, // 1 minute
      keyGenerator: (session, action) => {
        if (!session) return 'null'
        return `${session.session_id}_${session.status}_${action || 'default'}`
      },
      cacheName: 'eligibility'
    })
  }

  /**
   * Memoize validation results
   */
  memoizeValidation(fn) {
    return this.memoize(fn, {
      maxSize: 30,
      ttl: 10000, // 10 seconds
      keyGenerator: (sessions, action) => {
        if (!sessions) return 'empty'
        const ids = sessions.map(s => s.session_id).sort().join(',')
        const hash = this.hashString(ids)
        return `${hash}_${action}`
      },
      cacheName: 'validation'
    })
  }

  /**
   * Memoize filter operations
   */
  memoizeFilter(fn) {
    return this.memoize(fn, {
      maxSize: 20,
      ttl: 30000, // 30 seconds
      keyGenerator: (...args) => JSON.stringify(args),
      cacheName: 'filter'
    })
  }

  /**
   * Default key generator
   */
  defaultKeyGenerator(...args) {
    try {
      return JSON.stringify(args)
    } catch {
      // Fallback for circular references
      return args.map(arg => {
        if (arg === null) return 'null'
        if (arg === undefined) return 'undefined'
        if (typeof arg === 'object') {
          return arg.constructor.name + '_' + Object.keys(arg).length
        }
        return String(arg)
      }).join('_')
    }
  }

  /**
   * Simple string hash for cache keys
   */
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Clear specific cache
   */
  clearCache(cacheName) {
    const cache = this.caches.get(cacheName)
    if (cache) {
      cache.clear()
    }
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.caches.forEach(cache => cache.clear())
  }

  /**
   * Get statistics for all caches
   */
  getAllStats() {
    const stats = {}
    this.caches.forEach((cache, name) => {
      stats[name] = cache.getStats()
    })
    return stats
  }

  /**
   * Get memory estimate
   */
  getMemoryEstimate() {
    let totalItems = 0
    let totalSize = 0

    this.caches.forEach(cache => {
      totalItems += cache.cache.size
      // Rough estimate: 100 bytes per cached item
      totalSize += cache.cache.size * 100
    })

    return {
      totalItems,
      estimatedBytes: totalSize,
      estimatedMB: (totalSize / 1024 / 1024).toFixed(2)
    }
  }
}

/**
 * Singleton instance
 */
export const memoized = new MemoizationManager()

/**
 * Debounce function for performance
 */
export function debounce(fn, delay = 100) {
  let timeoutId = null
  let lastArgs = null
  let lastThis = null
  let lastCallTime = 0

  const debounced = function(...args) {
    lastArgs = args
    lastThis = this
    lastCallTime = Date.now()

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn.apply(lastThis, lastArgs)
      timeoutId = null
    }, delay)
  }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      fn.apply(lastThis, lastArgs)
      timeoutId = null
    }
  }

  return debounced
}

/**
 * Throttle function for performance
 */
export function throttle(fn, limit = 100) {
  let inThrottle = false
  let lastResult = null

  return function(...args) {
    if (!inThrottle) {
      lastResult = fn.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
    return lastResult
  }
}

/**
 * Request idle callback wrapper
 */
export function whenIdle(fn, timeout = 1000) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(fn, { timeout })
  }
  // Fallback
  return setTimeout(fn, 0)
}

/**
 * Batch operations for performance
 */
export class BatchProcessor {
  constructor(processFn, options = {}) {
    this.processFn = processFn
    this.batchSize = options.batchSize || 50
    this.delay = options.delay || 0
    this.queue = []
    this.processing = false
  }

  add(item) {
    this.queue.push(item)
    if (!this.processing) {
      this.process()
    }
  }

  async process() {
    if (this.queue.length === 0 || this.processing) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize)
      await this.processFn(batch)
      
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay))
      }
    }

    this.processing = false
  }

  clear() {
    this.queue = []
  }

  get size() {
    return this.queue.length
  }
}

/**
 * Create optimized selection rules with memoization
 */
export function createOptimizedRules(originalRules) {
  return {
    ...originalRules,
    canSelectSession: memoized.memoizeEligibilityCheck(
      originalRules.canSelectSession.bind(originalRules)
    ),
    canDeleteSession: memoized.memoizeEligibilityCheck(
      originalRules.canDeleteSession.bind(originalRules)
    ),
    canExportSession: memoized.memoizeEligibilityCheck(
      originalRules.canExportSession.bind(originalRules)
    ),
    validateBulkAction: memoized.memoizeValidation(
      originalRules.validateBulkAction?.bind(originalRules) || (() => ({ canProceed: true }))
    ),
    calculateSelectionStats: memoized.memoizeSelectionStats(
      originalRules.calculateSelectionStats?.bind(originalRules) || (() => ({}))
    )
  }
}

export default memoized