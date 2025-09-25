import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export function useCaching() {
  // Cache storage
  const caches = ref(new Map())
  const defaultOptions = {
    maxSize: 100,
    ttl: 300000, // 5 minutes
    maxAge: 3600000, // 1 hour
    cleanupInterval: 60000, // 1 minute
    autoCleanup: true
  }

  // Cache statistics
  const statistics = ref({
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    cleanups: 0,
    size: 0,
    hitRate: 0
  })

  // Cache monitoring
  const isMonitoring = ref(false)
  const monitoringInterval = ref(null)

  // Cache analysis
  const analysis = computed(() => {
    const stats = statistics.value
    const total = stats.hits + stats.misses

    return {
      hitRate: {
        value: total > 0 ? (stats.hits / total) * 100 : 0,
        threshold: 80, // 80%
        status: total > 0 && (stats.hits / total) * 100 >= 80 ? 'good' : 'poor'
      },
      size: {
        value: stats.size,
        threshold: 1000,
        status: stats.size <= 1000 ? 'good' : 'poor'
      },
      efficiency: {
        value: stats.hits / Math.max(stats.sets, 1),
        threshold: 2,
        status: stats.hits / Math.max(stats.sets, 1) >= 2 ? 'good' : 'poor'
      }
    }
  })

  // Cache recommendations
  const recommendations = computed(() => {
    const recs = []
    const currentAnalysis = analysis.value

    if (currentAnalysis.hitRate.status === 'poor') {
      recs.push({
        type: 'cache',
        issue: 'Cache hit rate is too low',
        recommendation: 'Consider increasing cache size or improving cache key strategy',
        priority: 'high'
      })
    }

    if (currentAnalysis.size.status === 'poor') {
      recs.push({
        type: 'cache',
        issue: 'Cache size is too large',
        recommendation: 'Consider reducing cache size or implementing better cleanup',
        priority: 'medium'
      })
    }

    if (currentAnalysis.efficiency.status === 'poor') {
      recs.push({
        type: 'cache',
        issue: 'Cache efficiency is poor',
        recommendation: 'Consider improving cache strategy or reducing cache misses',
        priority: 'medium'
      })
    }

    return recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  })

  // Create cache
  function createCache(name, options = {}) {
    const config = { ...defaultOptions, ...options }
    const cache = {
      name,
      storage: new Map(),
      config,
      createdAt: Date.now(),
      lastCleanup: Date.now()
    }

    caches.value.set(name, cache)

    if (config.autoCleanup) {
      const cleanupTimer = setInterval(() => {
        cleanupCache(name)
      }, config.cleanupInterval)

      cache.cleanupTimer = cleanupTimer
    }

    return cache
  }

  // Get from cache
  function get(cacheName, key) {
    const cache = caches.value.get(cacheName)
    if (!cache) {
      statistics.value.misses++
      return null
    }

    const item = cache.storage.get(key)
    if (!item) {
      statistics.value.misses++
      return null
    }

    const now = Date.now()
    if (now - item.createdAt > cache.config.maxAge) {
      cache.storage.delete(key)
      statistics.value.misses++
      return null
    }

    item.lastAccessed = now
    statistics.value.hits++
    return item.value
  }

  // Set in cache
  function set(cacheName, key, value, options = {}) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    const config = { ...cache.config, ...options }
    const now = Date.now()

    // Check if cache is full
    if (cache.storage.size >= config.maxSize) {
      // Remove oldest item
      const oldestKey = cache.storage.keys().next().value
      cache.storage.delete(oldestKey)
    }

    cache.storage.set(key, {
      value,
      createdAt: now,
      lastAccessed: now,
      ttl: config.ttl
    })

    statistics.value.sets++
    updateStatistics()
    return true
  }

  // Delete from cache
  function del(cacheName, key) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    const deleted = cache.storage.delete(key)
    if (deleted) {
      statistics.value.deletes++
      updateStatistics()
    }
    return deleted
  }

  // Clear cache
  function clear(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    cache.storage.clear()
    updateStatistics()
    return true
  }

  // Check if key exists in cache
  function has(cacheName, key) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    const item = cache.storage.get(key)
    if (!item) return false

    const now = Date.now()
    if (now - item.createdAt > cache.config.maxAge) {
      cache.storage.delete(key)
      return false
    }

    return true
  }

  // Get cache size
  function size(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return 0

    return cache.storage.size
  }

  // Get all cache keys
  function keys(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return []

    return Array.from(cache.storage.keys())
  }

  // Get all cache values
  function values(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return []

    return Array.from(cache.storage.values()).map(item => item.value)
  }

  // Get all cache entries
  function entries(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return []

    return Array.from(cache.storage.entries()).map(([key, item]) => [key, item.value])
  }

  // Cleanup cache
  function cleanupCache(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return

    const now = Date.now()
    const toRemove = []

    for (const [key, item] of cache.storage.entries()) {
      if (now - item.createdAt > cache.config.maxAge || 
          now - item.lastAccessed > item.ttl) {
        toRemove.push(key)
      }
    }

    toRemove.forEach(key => {
      cache.storage.delete(key)
    })

    cache.lastCleanup = now
    statistics.value.cleanups++
    updateStatistics()
  }

  // Delete cache
  function deleteCache(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    if (cache.cleanupTimer) {
      clearInterval(cache.cleanupTimer)
    }

    cache.storage.clear()
    caches.value.delete(cacheName)
    updateStatistics()

    return true
  }

  // Get cache statistics
  function getCacheStatistics(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return null

    const now = Date.now()
    const items = Array.from(cache.storage.values())

    return {
      name: cache.name,
      size: cache.storage.size,
      maxSize: cache.config.maxSize,
      age: now - cache.createdAt,
      lastCleanup: now - cache.lastCleanup,
      oldestItem: Math.min(...items.map(item => now - item.createdAt)),
      newestItem: Math.max(...items.map(item => now - item.createdAt)),
      averageAge: items.reduce((sum, item) => sum + (now - item.createdAt), 0) / items.length,
      hitRate: statistics.value.hits / Math.max(statistics.value.hits + statistics.value.misses, 1) * 100
    }
  }

  // Get all cache statistics
  function getAllCacheStatistics() {
    const stats = []
    for (const cacheName of caches.value.keys()) {
      stats.push(getCacheStatistics(cacheName))
    }
    return stats
  }

  // Update statistics
  function updateStatistics() {
    let totalSize = 0
    for (const cache of caches.value.values()) {
      totalSize += cache.storage.size
    }
    statistics.value.size = totalSize

    const total = statistics.value.hits + statistics.value.misses
    statistics.value.hitRate = total > 0 ? (statistics.value.hits / total) * 100 : 0
  }

  // Cache warming
  function warmCache(cacheName, data, keyGenerator) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    for (const item of data) {
      const key = keyGenerator ? keyGenerator(item) : JSON.stringify(item)
      set(cacheName, key, item)
    }

    return true
  }

  // Cache prefetching
  function prefetch(cacheName, keys, fetcher) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    const promises = keys.map(async (key) => {
      if (!has(cacheName, key)) {
        const value = await fetcher(key)
        set(cacheName, key, value)
      }
    })

    return Promise.all(promises)
  }

  // Cache invalidation
  function invalidate(cacheName, pattern) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    if (typeof pattern === 'string') {
      // Simple string match
      const keys = Array.from(cache.storage.keys())
      keys.forEach(key => {
        if (key.includes(pattern)) {
          cache.storage.delete(key)
        }
      })
    } else if (pattern instanceof RegExp) {
      // Regex match
      const keys = Array.from(cache.storage.keys())
      keys.forEach(key => {
        if (pattern.test(key)) {
          cache.storage.delete(key)
        }
      })
    } else if (typeof pattern === 'function') {
      // Function match
      const keys = Array.from(cache.storage.keys())
      keys.forEach(key => {
        if (pattern(key)) {
          cache.storage.delete(key)
        }
      })
    }

    updateStatistics()
    return true
  }

  // Cache compression
  function compressCache(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return false

    for (const [key, item] of cache.storage.entries()) {
      if (typeof item.value === 'string' && item.value.length > 1000) {
        // Simple compression (in real implementation, use proper compression)
        item.value = item.value.substring(0, 1000) + '...'
      }
    }

    return true
  }

  // Cache serialization
  function serializeCache(cacheName) {
    const cache = caches.value.get(cacheName)
    if (!cache) return null

    const data = {
      name: cache.name,
      config: cache.config,
      items: Array.from(cache.storage.entries()),
      createdAt: cache.createdAt,
      lastCleanup: cache.lastCleanup
    }

    return JSON.stringify(data)
  }

  // Cache deserialization
  function deserializeCache(data) {
    try {
      const parsed = JSON.parse(data)
      const cache = {
        name: parsed.name,
        storage: new Map(parsed.items),
        config: parsed.config,
        createdAt: parsed.createdAt,
        lastCleanup: parsed.lastCleanup
      }

      caches.value.set(parsed.name, cache)

      if (cache.config.autoCleanup) {
        const cleanupTimer = setInterval(() => {
          cleanupCache(parsed.name)
        }, cache.config.cleanupInterval)

        cache.cleanupTimer = cleanupTimer
      }

      updateStatistics()
      return true
    } catch (error) {
      console.error('Failed to deserialize cache:', error)
      return false
    }
  }

  // Start monitoring
  function startMonitoring() {
    if (isMonitoring.value) return

    isMonitoring.value = true

    monitoringInterval.value = setInterval(() => {
      updateStatistics()
    }, 1000)
  }

  // Stop monitoring
  function stopMonitoring() {
    isMonitoring.value = false

    if (monitoringInterval.value) {
      clearInterval(monitoringInterval.value)
      monitoringInterval.value = null
    }
  }

  // Cache report
  function getCacheReport() {
    return {
      statistics: statistics.value,
      analysis: analysis.value,
      recommendations: recommendations.value,
      caches: getAllCacheStatistics()
    }
  }

  // Export cache data
  function exportCacheData() {
    const report = getCacheReport()
    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cache-report-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring()

    // Cleanup all caches
    for (const cacheName of caches.value.keys()) {
      deleteCache(cacheName)
    }
  })

  return {
    // State
    caches,
    statistics,
    isMonitoring,
    analysis,
    recommendations,

    // Cache operations
    createCache,
    get,
    set,
    del,
    clear,
    has,
    size,
    keys,
    values,
    entries,
    cleanupCache,
    deleteCache,

    // Cache management
    getCacheStatistics,
    getAllCacheStatistics,
    warmCache,
    prefetch,
    invalidate,
    compressCache,
    serializeCache,
    deserializeCache,

    // Monitoring
    startMonitoring,
    stopMonitoring,

    // Reporting
    getCacheReport,
    exportCacheData
  }
}








