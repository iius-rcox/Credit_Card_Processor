import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export function usePerformanceOptimization() {
  // Performance metrics
  const performanceMetrics = ref({
    renderTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    cacheHitRate: 0,
    errorRate: 0,
    userInteractionTime: 0,
    pageLoadTime: 0,
    timeToInteractive: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0
  })

  // Performance thresholds
  const thresholds = ref({
    renderTime: 16, // 60fps
    memoryUsage: 50, // 50MB
    cpuUsage: 80, // 80%
    networkLatency: 200, // 200ms
    cacheHitRate: 90, // 90%
    errorRate: 5, // 5%
    userInteractionTime: 100, // 100ms
    pageLoadTime: 3000, // 3s
    timeToInteractive: 5000, // 5s
    firstContentfulPaint: 2000, // 2s
    largestContentfulPaint: 4000, // 4s
    cumulativeLayoutShift: 0.1, // 0.1
    firstInputDelay: 100 // 100ms
  })

  // Performance monitoring
  const isMonitoring = ref(false)
  const monitoringInterval = ref(null)
  const performanceObserver = ref(null)

  // Debounce utility
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Throttle utility
  function throttle(func, limit) {
    let inThrottle
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  // Memoization utility
  function memoize(func, keyGenerator) {
    const cache = new Map()
    return function executedFunction(...args) {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
      if (cache.has(key)) {
        return cache.get(key)
      }
      const result = func.apply(this, args)
      cache.set(key, result)
      return result
    }
  }

  // Virtual scrolling utility
  function createVirtualScroller(itemHeight, containerHeight, items) {
    const visibleItems = computed(() => {
      const startIndex = Math.floor(scrollTop.value / itemHeight)
      const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight), items.value.length)
      return items.value.slice(startIndex, endIndex)
    })

    const scrollTop = ref(0)
    const totalHeight = computed(() => items.value.length * itemHeight)

    return {
      visibleItems,
      scrollTop,
      totalHeight,
      itemHeight
    }
  }

  // Lazy loading utility
  function createLazyLoader(threshold = 0.1) {
    const observer = ref(null)
    const isIntersecting = ref(false)

    const observe = (element) => {
      if (observer.value) {
        observer.value.observe(element)
      }
    }

    const unobserve = (element) => {
      if (observer.value) {
        observer.value.unobserve(element)
      }
    }

    onMounted(() => {
      observer.value = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            isIntersecting.value = entry.isIntersecting
          })
        },
        { threshold }
      )
    })

    onUnmounted(() => {
      if (observer.value) {
        observer.value.disconnect()
      }
    })

    return {
      isIntersecting,
      observe,
      unobserve
    }
  }

  // Image optimization utility
  function optimizeImage(src, options = {}) {
    const {
      width,
      height,
      quality = 80,
      format = 'webp',
      lazy = true
    } = options

    const optimizedSrc = computed(() => {
      if (!src.value) return ''
      
      const url = new URL(src.value)
      if (width) url.searchParams.set('w', width)
      if (height) url.searchParams.set('h', height)
      url.searchParams.set('q', quality)
      url.searchParams.set('f', format)
      
      return url.toString()
    })

    return {
      optimizedSrc,
      lazy
    }
  }

  // Bundle splitting utility
  function createAsyncComponent(importFunc) {
    return defineAsyncComponent({
      loader: importFunc,
      loadingComponent: () => h('div', 'Loading...'),
      errorComponent: () => h('div', 'Error loading component'),
      delay: 200,
      timeout: 3000
    })
  }

  // Memory management utility
  function createMemoryManager() {
    const memoryPool = new Map()
    const maxPoolSize = 100

    const get = (key) => {
      return memoryPool.get(key)
    }

    const set = (key, value) => {
      if (memoryPool.size >= maxPoolSize) {
        const firstKey = memoryPool.keys().next().value
        memoryPool.delete(firstKey)
      }
      memoryPool.set(key, value)
    }

    const clear = () => {
      memoryPool.clear()
    }

    const size = () => {
      return memoryPool.size
    }

    return {
      get,
      set,
      clear,
      size
    }
  }

  // Cache management utility
  function createCacheManager(maxSize = 100, ttl = 300000) { // 5 minutes default TTL
    const cache = new Map()
    const timestamps = new Map()

    const get = (key) => {
      const timestamp = timestamps.get(key)
      if (timestamp && Date.now() - timestamp > ttl) {
        cache.delete(key)
        timestamps.delete(key)
        return null
      }
      return cache.get(key)
    }

    const set = (key, value) => {
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
        timestamps.delete(firstKey)
      }
      cache.set(key, value)
      timestamps.set(key, Date.now())
    }

    const clear = () => {
      cache.clear()
      timestamps.clear()
    }

    const size = () => {
      return cache.size
    }

    return {
      get,
      set,
      clear,
      size
    }
  }

  // Performance monitoring
  function startMonitoring() {
    if (isMonitoring.value) return

    isMonitoring.value = true

    // Monitor render performance
    monitoringInterval.value = setInterval(() => {
      updatePerformanceMetrics()
    }, 1000)

    // Monitor Web Vitals
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        performanceObserver.value = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            updateWebVitals(entry)
          }
        })

        performanceObserver.value.observe({ entryTypes: ['measure', 'navigation', 'paint'] })
      } catch (error) {
        console.warn('Performance monitoring not available:', error)
      }
    }
  }

  function stopMonitoring() {
    isMonitoring.value = false

    if (monitoringInterval.value) {
      clearInterval(monitoringInterval.value)
      monitoringInterval.value = null
    }

    if (performanceObserver.value) {
      performanceObserver.value.disconnect()
      performanceObserver.value = null
    }
  }

  function updatePerformanceMetrics() {
    if (typeof window === 'undefined') return

    // Update memory usage
    if ('memory' in performance) {
      performanceMetrics.value.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
    }

    // Update render time
    const renderEntries = performance.getEntriesByType('measure')
    if (renderEntries.length > 0) {
      const latestRender = renderEntries[renderEntries.length - 1]
      performanceMetrics.value.renderTime = latestRender.duration
    }
  }

  function updateWebVitals(entry) {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          performanceMetrics.value.firstContentfulPaint = entry.startTime
        }
        break
      case 'largest-contentful-paint':
        performanceMetrics.value.largestContentfulPaint = entry.startTime
        break
      case 'layout-shift':
        if (!entry.hadRecentInput) {
          performanceMetrics.value.cumulativeLayoutShift += entry.value
        }
        break
      case 'first-input':
        performanceMetrics.value.firstInputDelay = entry.processingStart - entry.startTime
        break
    }
  }

  // Performance analysis
  const performanceAnalysis = computed(() => {
    const metrics = performanceMetrics.value
    const thresholds = thresholds.value

    return {
      renderTime: {
        value: metrics.renderTime,
        threshold: thresholds.renderTime,
        status: metrics.renderTime <= thresholds.renderTime ? 'good' : 'poor'
      },
      memoryUsage: {
        value: metrics.memoryUsage,
        threshold: thresholds.memoryUsage,
        status: metrics.memoryUsage <= thresholds.memoryUsage ? 'good' : 'poor'
      },
      cpuUsage: {
        value: metrics.cpuUsage,
        threshold: thresholds.cpuUsage,
        status: metrics.cpuUsage <= thresholds.cpuUsage ? 'good' : 'poor'
      },
      networkLatency: {
        value: metrics.networkLatency,
        threshold: thresholds.networkLatency,
        status: metrics.networkLatency <= thresholds.networkLatency ? 'good' : 'poor'
      },
      cacheHitRate: {
        value: metrics.cacheHitRate,
        threshold: thresholds.cacheHitRate,
        status: metrics.cacheHitRate >= thresholds.cacheHitRate ? 'good' : 'poor'
      },
      errorRate: {
        value: metrics.errorRate,
        threshold: thresholds.errorRate,
        status: metrics.errorRate <= thresholds.errorRate ? 'good' : 'poor'
      },
      userInteractionTime: {
        value: metrics.userInteractionTime,
        threshold: thresholds.userInteractionTime,
        status: metrics.userInteractionTime <= thresholds.userInteractionTime ? 'good' : 'poor'
      },
      pageLoadTime: {
        value: metrics.pageLoadTime,
        threshold: thresholds.pageLoadTime,
        status: metrics.pageLoadTime <= thresholds.pageLoadTime ? 'good' : 'poor'
      },
      timeToInteractive: {
        value: metrics.timeToInteractive,
        threshold: thresholds.timeToInteractive,
        status: metrics.timeToInteractive <= thresholds.timeToInteractive ? 'good' : 'poor'
      },
      firstContentfulPaint: {
        value: metrics.firstContentfulPaint,
        threshold: thresholds.firstContentfulPaint,
        status: metrics.firstContentfulPaint <= thresholds.firstContentfulPaint ? 'good' : 'poor'
      },
      largestContentfulPaint: {
        value: metrics.largestContentfulPaint,
        threshold: thresholds.largestContentfulPaint,
        status: metrics.largestContentfulPaint <= thresholds.largestContentfulPaint ? 'good' : 'poor'
      },
      cumulativeLayoutShift: {
        value: metrics.cumulativeLayoutShift,
        threshold: thresholds.cumulativeLayoutShift,
        status: metrics.cumulativeLayoutShift <= thresholds.cumulativeLayoutShift ? 'good' : 'poor'
      },
      firstInputDelay: {
        value: metrics.firstInputDelay,
        threshold: thresholds.firstInputDelay,
        status: metrics.firstInputDelay <= thresholds.firstInputDelay ? 'good' : 'poor'
      }
    }
  })

  // Performance recommendations
  const performanceRecommendations = computed(() => {
    const analysis = performanceAnalysis.value
    const recommendations = []

    if (analysis.renderTime.status === 'poor') {
      recommendations.push('Consider optimizing component rendering or using virtual scrolling')
    }

    if (analysis.memoryUsage.status === 'poor') {
      recommendations.push('Consider implementing memory pooling or reducing object creation')
    }

    if (analysis.cpuUsage.status === 'poor') {
      recommendations.push('Consider using Web Workers for heavy computations')
    }

    if (analysis.networkLatency.status === 'poor') {
      recommendations.push('Consider implementing request caching or using a CDN')
    }

    if (analysis.cacheHitRate.status === 'poor') {
      recommendations.push('Consider improving cache strategies or increasing cache size')
    }

    if (analysis.errorRate.status === 'poor') {
      recommendations.push('Consider improving error handling and retry mechanisms')
    }

    if (analysis.userInteractionTime.status === 'poor') {
      recommendations.push('Consider optimizing event handlers or using debouncing')
    }

    if (analysis.pageLoadTime.status === 'poor') {
      recommendations.push('Consider code splitting or lazy loading components')
    }

    if (analysis.timeToInteractive.status === 'poor') {
      recommendations.push('Consider reducing JavaScript bundle size or optimizing critical path')
    }

    if (analysis.firstContentfulPaint.status === 'poor') {
      recommendations.push('Consider optimizing CSS or using critical CSS')
    }

    if (analysis.largestContentfulPaint.status === 'poor') {
      recommendations.push('Consider optimizing images or using responsive images')
    }

    if (analysis.cumulativeLayoutShift.status === 'poor') {
      recommendations.push('Consider reserving space for dynamic content or using skeleton loaders')
    }

    if (analysis.firstInputDelay.status === 'poor') {
      recommendations.push('Consider reducing JavaScript execution time or using code splitting')
    }

    return recommendations
  })

  // Performance optimization methods
  function optimizeComponent(component, options = {}) {
    const {
      lazy = true,
      memo = true,
      virtual = false,
      debounce = false,
      throttle = false
    } = options

    let optimizedComponent = component

    if (lazy) {
      optimizedComponent = createAsyncComponent(() => component)
    }

    if (memo) {
      optimizedComponent = memoize(optimizedComponent)
    }

    if (debounce) {
      optimizedComponent = debounce(optimizedComponent, 100)
    }

    if (throttle) {
      optimizedComponent = throttle(optimizedComponent, 100)
    }

    return optimizedComponent
  }

  function optimizeData(data, options = {}) {
    const {
      cache = true,
      pool = false,
      compress = false,
      normalize = false
    } = options

    let optimizedData = data

    if (normalize) {
      optimizedData = normalizeData(optimizedData)
    }

    if (compress) {
      optimizedData = compressData(optimizedData)
    }

    if (pool) {
      optimizedData = poolData(optimizedData)
    }

    if (cache) {
      optimizedData = cacheData(optimizedData)
    }

    return optimizedData
  }

  function normalizeData(data) {
    // Normalize data structure for better performance
    if (Array.isArray(data)) {
      return data.map(item => normalizeData(item))
    } else if (typeof data === 'object' && data !== null) {
      const normalized = {}
      for (const [key, value] of Object.entries(data)) {
        normalized[key] = normalizeData(value)
      }
      return normalized
    }
    return data
  }

  function compressData(data) {
    // Compress data for better memory usage
    if (typeof data === 'string') {
      return data.length > 1000 ? compressString(data) : data
    }
    return data
  }

  function poolData(data) {
    // Pool data for better memory management
    if (Array.isArray(data)) {
      return data.map(item => poolData(item))
    }
    return data
  }

  function cacheData(data) {
    // Cache data for better performance
    if (typeof data === 'object' && data !== null) {
      return data
    }
    return data
  }

  function compressString(str) {
    // Simple string compression (in real implementation, use proper compression)
    return str.length > 1000 ? str.substring(0, 1000) + '...' : str
  }

  // Cleanup
  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    performanceMetrics,
    thresholds,
    isMonitoring,
    performanceAnalysis,
    performanceRecommendations,

    // Utilities
    debounce,
    throttle,
    memoize,
    createVirtualScroller,
    createLazyLoader,
    optimizeImage,
    createAsyncComponent,
    createMemoryManager,
    createCacheManager,

    // Methods
    startMonitoring,
    stopMonitoring,
    updatePerformanceMetrics,
    updateWebVitals,
    optimizeComponent,
    optimizeData,
    normalizeData,
    compressData,
    poolData,
    cacheData,
    compressString
  }
}


