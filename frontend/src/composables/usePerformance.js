import { computed } from 'vue'

/**
 * Performance monitoring and optimization composable
 * Provides tools for tracking performance metrics and optimizing memory usage
 */

import { ref, reactive, onBeforeUnmount, nextTick } from 'vue'

export function usePerformance() {
  // Performance metrics
  const metrics = reactive({
    renderTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    apiResponseTimes: [],
    componentMounts: 0,
    componentUnmounts: 0,
  })

  // Memory management
  const observers = []
  const timers = []
  const eventListeners = []

  /**
   * Track component render time
   */
  function trackRenderTime(componentName) {
    const startTime = performance.now()

    return {
      end: () => {
        const endTime = performance.now()
        const renderTime = endTime - startTime
        metrics.renderTime = renderTime

        if (renderTime > 16) {
          // > 1 frame (60fps)
          console.warn(
            `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
          )
        }

        return renderTime
      },
    }
  }

  /**
   * Track API response times
   */
  function trackApiCall(endpoint, startTime) {
    const endTime = performance.now()
    const responseTime = endTime - startTime

    metrics.apiResponseTimes.push({
      endpoint,
      time: responseTime,
      timestamp: Date.now(),
    })

    // Keep only last 50 API calls to prevent memory bloat
    if (metrics.apiResponseTimes.length > 50) {
      metrics.apiResponseTimes.shift()
    }

    return responseTime
  }

  /**
   * Monitor memory usage (if available)
   */
  function updateMemoryUsage() {
    if ('memory' in performance) {
      metrics.memoryUsage = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576), // MB
      }
    }
  }

  /**
   * Create optimized observer with cleanup tracking
   */
  function createObserver(target, callback, options = {}) {
    let observer

    if ('IntersectionObserver' in window && options.type === 'intersection') {
      observer = new IntersectionObserver(callback, options.config || {})
      observer.observe(target)
    } else if ('MutationObserver' in window && options.type === 'mutation') {
      observer = new MutationObserver(callback)
      observer.observe(target, options.config || {})
    } else if ('ResizeObserver' in window && options.type === 'resize') {
      observer = new ResizeObserver(callback)
      observer.observe(target)
    }

    if (observer) {
      observers.push(observer)
    }

    return observer
  }

  /**
   * Create timer with cleanup tracking
   */
  function createTimer(callback, delay, options = {}) {
    let timerId

    if (options.interval) {
      timerId = setInterval(callback, delay)
    } else {
      timerId = setTimeout(callback, delay)
    }

    timers.push({
      id: timerId,
      type: options.interval ? 'interval' : 'timeout',
    })

    return timerId
  }

  /**
   * Add event listener with cleanup tracking
   */
  function addEventListenerWithCleanup(target, event, handler, options = {}) {
    target.addEventListener(event, handler, options)
    eventListeners.push({ target, event, handler, options })
  }

  /**
   * Batch DOM updates for better performance
   */
  function batchDOMUpdates(updates) {
    return nextTick(() => {
      updates.forEach(update => update())
    })
  }

  /**
   * Debounce function for performance optimization
   */
  function debounce(func, wait, immediate = false) {
    let timeout

    const debounced = function executedFunction(...args) {
      const later = () => {
        timeout = null
        if (!immediate) func(...args)
      }

      const callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)

      if (callNow) func(...args)
    }

    // Track timeout for cleanup
    timers.push({ id: timeout, type: 'debounce' })

    return debounced
  }

  /**
   * Throttle function for performance optimization
   */
  function throttle(func, limit) {
    let inThrottle

    return function throttledFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  /**
   * Virtual scrolling implementation for large datasets
   */
  function createVirtualScroller(containerHeight, itemHeight, items) {
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const scrollTop = ref(0)
    const startIndex = ref(0)
    const endIndex = ref(Math.min(visibleCount + 5, items.length)) // Buffer of 5 items

    const visibleItems = computed(() => {
      return items.slice(startIndex.value, endIndex.value)
    })

    const offsetY = computed(() => startIndex.value * itemHeight)
    const totalHeight = computed(() => items.length * itemHeight)

    const onScroll = throttle(event => {
      scrollTop.value = event.target.scrollTop
      const newStartIndex = Math.floor(scrollTop.value / itemHeight)
      const newEndIndex = Math.min(
        newStartIndex + visibleCount + 5,
        items.length
      )

      if (
        newStartIndex !== startIndex.value ||
        newEndIndex !== endIndex.value
      ) {
        startIndex.value = newStartIndex
        endIndex.value = newEndIndex
      }
    }, 16) // 60fps throttling

    return {
      visibleItems,
      offsetY,
      totalHeight,
      onScroll,
      containerHeight,
      itemHeight,
    }
  }

  /**
   * Optimize images with lazy loading and compression detection
   */
  function optimizeImage(img, options = {}) {
    const {
      lazy = true,
      webpSupport = true,
      placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDEgMTAwTDE1OCA4M0wxODMgMTA4SDE5VjE1MEgxOTFWMTAwSDE0MVoiIGZpbGw9IiNEMUQ1REIiLz4KPC9zdmc+Cg==',
    } = options

    if (lazy && 'IntersectionObserver' in window) {
      const observer = createObserver(
        img,
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const actualSrc = img.dataset.src || img.src
              img.src = actualSrc
              img.classList.remove('lazy')
              observer.unobserve(img)
            }
          })
        },
        { type: 'intersection', config: { threshold: 0.1 } }
      )

      img.src = placeholder
      img.classList.add('lazy')
    }

    // WebP support detection
    if (webpSupport) {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const supportsWebP =
        canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0

      if (supportsWebP && img.dataset.webpSrc) {
        img.src = img.dataset.webpSrc
      }
    }
  }

  /**
   * Get current performance report
   */
  function getPerformanceReport() {
    updateMemoryUsage()

    const avgApiTime =
      metrics.apiResponseTimes.length > 0
        ? metrics.apiResponseTimes.reduce((sum, call) => sum + call.time, 0) /
          metrics.apiResponseTimes.length
        : 0

    return {
      timestamp: Date.now(),
      metrics: {
        ...metrics,
        averageApiResponseTime: Math.round(avgApiTime * 100) / 100,
      },
      recommendations: generateRecommendations(),
    }
  }

  /**
   * Generate performance recommendations
   */
  function generateRecommendations() {
    const recommendations = []

    if (metrics.renderTime > 16) {
      recommendations.push({
        type: 'render',
        message: `Render time is ${metrics.renderTime.toFixed(2)}ms. Consider optimizing component rendering.`,
        priority: 'high',
      })
    }

    if (
      metrics.memoryUsage &&
      metrics.memoryUsage.used > metrics.memoryUsage.limit * 0.8
    ) {
      recommendations.push({
        type: 'memory',
        message:
          'Memory usage is high. Consider optimizing data structures and component cleanup.',
        priority: 'high',
      })
    }

    const avgApiTime =
      metrics.apiResponseTimes.length > 0
        ? metrics.apiResponseTimes.reduce((sum, call) => sum + call.time, 0) /
          metrics.apiResponseTimes.length
        : 0

    if (avgApiTime > 1000) {
      recommendations.push({
        type: 'api',
        message: `Average API response time is ${avgApiTime.toFixed(2)}ms. Consider caching or optimizing API calls.`,
        priority: 'medium',
      })
    }

    return recommendations
  }

  /**
   * Cleanup all tracked resources
   */
  function cleanup() {
    // Clear observers
    observers.forEach(observer => {
      if (observer && observer.disconnect) {
        observer.disconnect()
      }
    })
    observers.length = 0

    // Clear timers
    timers.forEach(timer => {
      if (timer.type === 'interval') {
        clearInterval(timer.id)
      } else {
        clearTimeout(timer.id)
      }
    })
    timers.length = 0

    // Remove event listeners
    eventListeners.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options)
    })
    eventListeners.length = 0

    // Clear metrics
    metrics.apiResponseTimes.length = 0
  }

  // Auto-cleanup on component unmount
  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    metrics,
    trackRenderTime,
    trackApiCall,
    updateMemoryUsage,
    createObserver,
    createTimer,
    addEventListenerWithCleanup,
    batchDOMUpdates,
    debounce,
    throttle,
    createVirtualScroller,
    optimizeImage,
    getPerformanceReport,
    cleanup,
  }
}
