import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export function usePerformanceMonitoring() {
  // Performance metrics
  const metrics = ref({
    // Core Web Vitals
    lcp: 0, // Largest Contentful Paint
    fid: 0, // First Input Delay
    cls: 0, // Cumulative Layout Shift
    fcp: 0, // First Contentful Paint
    ttfb: 0, // Time to First Byte
    tti: 0, // Time to Interactive
    
    // Custom metrics
    renderTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    cacheHitRate: 0,
    errorRate: 0,
    userInteractionTime: 0,
    pageLoadTime: 0,
    
    // Component-specific metrics
    componentRenderTime: new Map(),
    componentMemoryUsage: new Map(),
    componentErrorCount: new Map(),
    
    // API metrics
    apiResponseTime: new Map(),
    apiErrorRate: new Map(),
    apiCacheHitRate: new Map(),
    
    // User interaction metrics
    clickResponseTime: 0,
    scrollPerformance: 0,
    keyboardResponseTime: 0,
    touchResponseTime: 0
  })

  // Performance thresholds
  const thresholds = ref({
    lcp: 2500, // 2.5s
    fid: 100, // 100ms
    cls: 0.1, // 0.1
    fcp: 1800, // 1.8s
    ttfb: 600, // 600ms
    tti: 3800, // 3.8s
    renderTime: 16, // 16ms (60fps)
    memoryUsage: 50, // 50MB
    cpuUsage: 80, // 80%
    networkLatency: 200, // 200ms
    cacheHitRate: 90, // 90%
    errorRate: 5, // 5%
    userInteractionTime: 100, // 100ms
    pageLoadTime: 3000, // 3s
    clickResponseTime: 100, // 100ms
    scrollPerformance: 16, // 16ms (60fps)
    keyboardResponseTime: 100, // 100ms
    touchResponseTime: 100 // 100ms
  })

  // Monitoring state
  const isMonitoring = ref(false)
  const monitoringInterval = ref(null)
  const performanceObserver = ref(null)
  const mutationObserver = ref(null)
  const resizeObserver = ref(null)

  // Performance entries
  const performanceEntries = ref([])
  const maxEntries = 1000

  // Performance analysis
  const analysis = computed(() => {
    const currentMetrics = metrics.value
    const currentThresholds = thresholds.value

    return {
      lcp: {
        value: currentMetrics.lcp,
        threshold: currentThresholds.lcp,
        status: currentMetrics.lcp <= currentThresholds.lcp ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.lcp / currentThresholds.lcp) * 100)
      },
      fid: {
        value: currentMetrics.fid,
        threshold: currentThresholds.fid,
        status: currentMetrics.fid <= currentThresholds.fid ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.fid / currentThresholds.fid) * 100)
      },
      cls: {
        value: currentMetrics.cls,
        threshold: currentThresholds.cls,
        status: currentMetrics.cls <= currentThresholds.cls ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.cls / currentThresholds.cls) * 100)
      },
      fcp: {
        value: currentMetrics.fcp,
        threshold: currentThresholds.fcp,
        status: currentMetrics.fcp <= currentThresholds.fcp ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.fcp / currentThresholds.fcp) * 100)
      },
      ttfb: {
        value: currentMetrics.ttfb,
        threshold: currentThresholds.ttfb,
        status: currentMetrics.ttfb <= currentThresholds.ttfb ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.ttfb / currentThresholds.ttfb) * 100)
      },
      tti: {
        value: currentMetrics.tti,
        threshold: currentThresholds.tti,
        status: currentMetrics.tti <= currentThresholds.tti ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.tti / currentThresholds.tti) * 100)
      },
      renderTime: {
        value: currentMetrics.renderTime,
        threshold: currentThresholds.renderTime,
        status: currentMetrics.renderTime <= currentThresholds.renderTime ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.renderTime / currentThresholds.renderTime) * 100)
      },
      memoryUsage: {
        value: currentMetrics.memoryUsage,
        threshold: currentThresholds.memoryUsage,
        status: currentMetrics.memoryUsage <= currentThresholds.memoryUsage ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.memoryUsage / currentThresholds.memoryUsage) * 100)
      },
      cpuUsage: {
        value: currentMetrics.cpuUsage,
        threshold: currentThresholds.cpuUsage,
        status: currentMetrics.cpuUsage <= currentThresholds.cpuUsage ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.cpuUsage / currentThresholds.cpuUsage) * 100)
      },
      networkLatency: {
        value: currentMetrics.networkLatency,
        threshold: currentThresholds.networkLatency,
        status: currentMetrics.networkLatency <= currentThresholds.networkLatency ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.networkLatency / currentThresholds.networkLatency) * 100)
      },
      cacheHitRate: {
        value: currentMetrics.cacheHitRate,
        threshold: currentThresholds.cacheHitRate,
        status: currentMetrics.cacheHitRate >= currentThresholds.cacheHitRate ? 'good' : 'poor',
        score: Math.min(100, (currentMetrics.cacheHitRate / currentThresholds.cacheHitRate) * 100)
      },
      errorRate: {
        value: currentMetrics.errorRate,
        threshold: currentThresholds.errorRate,
        status: currentMetrics.errorRate <= currentThresholds.errorRate ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.errorRate / currentThresholds.errorRate) * 100)
      },
      userInteractionTime: {
        value: currentMetrics.userInteractionTime,
        threshold: currentThresholds.userInteractionTime,
        status: currentMetrics.userInteractionTime <= currentThresholds.userInteractionTime ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.userInteractionTime / currentThresholds.userInteractionTime) * 100)
      },
      pageLoadTime: {
        value: currentMetrics.pageLoadTime,
        threshold: currentThresholds.pageLoadTime,
        status: currentMetrics.pageLoadTime <= currentThresholds.pageLoadTime ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.pageLoadTime / currentThresholds.pageLoadTime) * 100)
      },
      clickResponseTime: {
        value: currentMetrics.clickResponseTime,
        threshold: currentThresholds.clickResponseTime,
        status: currentMetrics.clickResponseTime <= currentThresholds.clickResponseTime ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.clickResponseTime / currentThresholds.clickResponseTime) * 100)
      },
      scrollPerformance: {
        value: currentMetrics.scrollPerformance,
        threshold: currentThresholds.scrollPerformance,
        status: currentMetrics.scrollPerformance <= currentThresholds.scrollPerformance ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.scrollPerformance / currentThresholds.scrollPerformance) * 100)
      },
      keyboardResponseTime: {
        value: currentMetrics.keyboardResponseTime,
        threshold: currentThresholds.keyboardResponseTime,
        status: currentMetrics.keyboardResponseTime <= currentThresholds.keyboardResponseTime ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.keyboardResponseTime / currentThresholds.keyboardResponseTime) * 100)
      },
      touchResponseTime: {
        value: currentMetrics.touchResponseTime,
        threshold: currentThresholds.touchResponseTime,
        status: currentMetrics.touchResponseTime <= currentThresholds.touchResponseTime ? 'good' : 'poor',
        score: Math.max(0, 100 - (currentMetrics.touchResponseTime / currentThresholds.touchResponseTime) * 100)
      }
    }
  })

  // Overall performance score
  const overallScore = computed(() => {
    const scores = Object.values(analysis.value).map(metric => metric.score)
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  })

  // Performance recommendations
  const recommendations = computed(() => {
    const recs = []
    const currentAnalysis = analysis.value

    if (currentAnalysis.lcp.status === 'poor') {
      recs.push({
        metric: 'LCP',
        issue: 'Largest Contentful Paint is too slow',
        recommendation: 'Optimize images, use responsive images, or implement lazy loading',
        priority: 'high'
      })
    }

    if (currentAnalysis.fid.status === 'poor') {
      recs.push({
        metric: 'FID',
        issue: 'First Input Delay is too high',
        recommendation: 'Reduce JavaScript execution time or use code splitting',
        priority: 'high'
      })
    }

    if (currentAnalysis.cls.status === 'poor') {
      recs.push({
        metric: 'CLS',
        issue: 'Cumulative Layout Shift is too high',
        recommendation: 'Reserve space for dynamic content or use skeleton loaders',
        priority: 'high'
      })
    }

    if (currentAnalysis.fcp.status === 'poor') {
      recs.push({
        metric: 'FCP',
        issue: 'First Contentful Paint is too slow',
        recommendation: 'Optimize CSS or use critical CSS',
        priority: 'medium'
      })
    }

    if (currentAnalysis.ttfb.status === 'poor') {
      recs.push({
        metric: 'TTFB',
        issue: 'Time to First Byte is too slow',
        recommendation: 'Optimize server response time or use a CDN',
        priority: 'medium'
      })
    }

    if (currentAnalysis.tti.status === 'poor') {
      recs.push({
        metric: 'TTI',
        issue: 'Time to Interactive is too slow',
        recommendation: 'Reduce JavaScript bundle size or optimize critical path',
        priority: 'medium'
      })
    }

    if (currentAnalysis.renderTime.status === 'poor') {
      recs.push({
        metric: 'Render Time',
        issue: 'Component rendering is too slow',
        recommendation: 'Consider using virtual scrolling or optimizing component rendering',
        priority: 'medium'
      })
    }

    if (currentAnalysis.memoryUsage.status === 'poor') {
      recs.push({
        metric: 'Memory Usage',
        issue: 'Memory usage is too high',
        recommendation: 'Implement memory pooling or reduce object creation',
        priority: 'medium'
      })
    }

    if (currentAnalysis.cpuUsage.status === 'poor') {
      recs.push({
        metric: 'CPU Usage',
        issue: 'CPU usage is too high',
        recommendation: 'Use Web Workers for heavy computations or optimize algorithms',
        priority: 'medium'
      })
    }

    if (currentAnalysis.networkLatency.status === 'poor') {
      recs.push({
        metric: 'Network Latency',
        issue: 'Network latency is too high',
        recommendation: 'Implement request caching or use a CDN',
        priority: 'low'
      })
    }

    if (currentAnalysis.cacheHitRate.status === 'poor') {
      recs.push({
        metric: 'Cache Hit Rate',
        issue: 'Cache hit rate is too low',
        recommendation: 'Improve cache strategies or increase cache size',
        priority: 'low'
      })
    }

    if (currentAnalysis.errorRate.status === 'poor') {
      recs.push({
        metric: 'Error Rate',
        issue: 'Error rate is too high',
        recommendation: 'Improve error handling and retry mechanisms',
        priority: 'high'
      })
    }

    if (currentAnalysis.userInteractionTime.status === 'poor') {
      recs.push({
        metric: 'User Interaction Time',
        issue: 'User interaction response is too slow',
        recommendation: 'Optimize event handlers or use debouncing',
        priority: 'medium'
      })
    }

    if (currentAnalysis.pageLoadTime.status === 'poor') {
      recs.push({
        metric: 'Page Load Time',
        issue: 'Page load time is too slow',
        recommendation: 'Implement code splitting or lazy loading',
        priority: 'medium'
      })
    }

    if (currentAnalysis.clickResponseTime.status === 'poor') {
      recs.push({
        metric: 'Click Response Time',
        issue: 'Click response is too slow',
        recommendation: 'Optimize click handlers or use event delegation',
        priority: 'low'
      })
    }

    if (currentAnalysis.scrollPerformance.status === 'poor') {
      recs.push({
        metric: 'Scroll Performance',
        issue: 'Scroll performance is poor',
        recommendation: 'Use virtual scrolling or optimize scroll handlers',
        priority: 'low'
      })
    }

    if (currentAnalysis.keyboardResponseTime.status === 'poor') {
      recs.push({
        metric: 'Keyboard Response Time',
        issue: 'Keyboard response is too slow',
        recommendation: 'Optimize keyboard handlers or use debouncing',
        priority: 'low'
      })
    }

    if (currentAnalysis.touchResponseTime.status === 'poor') {
      recs.push({
        metric: 'Touch Response Time',
        issue: 'Touch response is too slow',
        recommendation: 'Optimize touch handlers or use passive listeners',
        priority: 'low'
      })
    }

    return recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  })

  // Start monitoring
  function startMonitoring() {
    if (isMonitoring.value) return

    isMonitoring.value = true

    // Monitor performance entries
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        performanceObserver.value = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            addPerformanceEntry(entry)
            updateMetricsFromEntry(entry)
          }
        })

        performanceObserver.value.observe({ entryTypes: ['measure', 'navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] })
      } catch (error) {
        console.warn('Performance monitoring not available:', error)
      }
    }

    // Monitor DOM mutations
    if (typeof window !== 'undefined' && 'MutationObserver' in window) {
      mutationObserver.value = new MutationObserver((mutations) => {
        updateDOMMetrics(mutations)
      })

      mutationObserver.value.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true
      })
    }

    // Monitor resize events
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      resizeObserver.value = new ResizeObserver((entries) => {
        updateResizeMetrics(entries)
      })

      resizeObserver.value.observe(document.body)
    }

    // Monitor memory usage
    monitoringInterval.value = setInterval(() => {
      updateMemoryMetrics()
    }, 1000)

    // Monitor user interactions
    monitorUserInteractions()
  }

  // Stop monitoring
  function stopMonitoring() {
    isMonitoring.value = false

    if (performanceObserver.value) {
      performanceObserver.value.disconnect()
      performanceObserver.value = null
    }

    if (mutationObserver.value) {
      mutationObserver.value.disconnect()
      mutationObserver.value = null
    }

    if (resizeObserver.value) {
      resizeObserver.value.disconnect()
      resizeObserver.value = null
    }

    if (monitoringInterval.value) {
      clearInterval(monitoringInterval.value)
      monitoringInterval.value = null
    }

    stopUserInteractionMonitoring()
  }

  // Add performance entry
  function addPerformanceEntry(entry) {
    performanceEntries.value.push({
      name: entry.name,
      type: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
      timestamp: Date.now()
    })

    if (performanceEntries.value.length > maxEntries) {
      performanceEntries.value.shift()
    }
  }

  // Update metrics from performance entry
  function updateMetricsFromEntry(entry) {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          metrics.value.fcp = entry.startTime
        }
        break
      case 'largest-contentful-paint':
        metrics.value.lcp = entry.startTime
        break
      case 'first-input':
        metrics.value.fid = entry.processingStart - entry.startTime
        break
      case 'layout-shift':
        if (!entry.hadRecentInput) {
          metrics.value.cls += entry.value
        }
        break
      case 'navigation':
        metrics.value.ttfb = entry.responseStart - entry.requestStart
        metrics.value.pageLoadTime = entry.loadEventEnd - entry.navigationStart
        break
    }
  }

  // Update DOM metrics
  function updateDOMMetrics(mutations) {
    // Track DOM changes that might affect performance
    const changeCount = mutations.length
    if (changeCount > 10) {
      console.warn(`High DOM mutation count: ${changeCount}`)
    }
  }

  // Update resize metrics
  function updateResizeMetrics(entries) {
    // Track resize events that might affect performance
    entries.forEach(entry => {
      const { width, height } = entry.contentRect
      if (width * height > 1000000) { // Large element
        console.warn(`Large element resized: ${width}x${height}`)
      }
    })
  }

  // Update memory metrics
  function updateMemoryMetrics() {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      metrics.value.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
    }
  }

  // Monitor user interactions
  function monitorUserInteractions() {
    if (typeof window === 'undefined') return

    let clickStartTime = 0
    let scrollStartTime = 0
    let keyboardStartTime = 0
    let touchStartTime = 0

    // Click monitoring
    document.addEventListener('click', (event) => {
      clickStartTime = performance.now()
    }, { capture: true })

    document.addEventListener('click', (event) => {
      const responseTime = performance.now() - clickStartTime
      metrics.value.clickResponseTime = responseTime
    }, { capture: false })

    // Scroll monitoring
    let scrollTimeout = null
    document.addEventListener('scroll', () => {
      if (scrollTimeout) return

      scrollStartTime = performance.now()
      scrollTimeout = setTimeout(() => {
        const responseTime = performance.now() - scrollStartTime
        metrics.value.scrollPerformance = responseTime
        scrollTimeout = null
      }, 16) // 60fps
    }, { passive: true })

    // Keyboard monitoring
    document.addEventListener('keydown', (event) => {
      keyboardStartTime = performance.now()
    })

    document.addEventListener('keyup', (event) => {
      const responseTime = performance.now() - keyboardStartTime
      metrics.value.keyboardResponseTime = responseTime
    })

    // Touch monitoring
    document.addEventListener('touchstart', (event) => {
      touchStartTime = performance.now()
    }, { passive: true })

    document.addEventListener('touchend', (event) => {
      const responseTime = performance.now() - touchStartTime
      metrics.value.touchResponseTime = responseTime
    }, { passive: true })
  }

  // Stop user interaction monitoring
  function stopUserInteractionMonitoring() {
    if (typeof window === 'undefined') return

    // Remove all event listeners
    document.removeEventListener('click', () => {})
    document.removeEventListener('scroll', () => {})
    document.removeEventListener('keydown', () => {})
    document.removeEventListener('keyup', () => {})
    document.removeEventListener('touchstart', () => {})
    document.removeEventListener('touchend', () => {})
  }

  // Track component performance
  function trackComponentPerformance(componentName, renderTime, memoryUsage) {
    metrics.value.componentRenderTime.set(componentName, renderTime)
    metrics.value.componentMemoryUsage.set(componentName, memoryUsage)
  }

  // Track component error
  function trackComponentError(componentName) {
    const currentCount = metrics.value.componentErrorCount.get(componentName) || 0
    metrics.value.componentErrorCount.set(componentName, currentCount + 1)
  }

  // Track API performance
  function trackAPIPerformance(endpoint, responseTime, success) {
    const currentResponseTime = metrics.value.apiResponseTime.get(endpoint) || []
    currentResponseTime.push(responseTime)
    if (currentResponseTime.length > 100) {
      currentResponseTime.shift()
    }
    metrics.value.apiResponseTime.set(endpoint, currentResponseTime)

    const currentErrorRate = metrics.value.apiErrorRate.get(endpoint) || { total: 0, errors: 0 }
    currentErrorRate.total++
    if (!success) {
      currentErrorRate.errors++
    }
    metrics.value.apiErrorRate.set(endpoint, currentErrorRate)
  }

  // Get performance report
  function getPerformanceReport() {
    return {
      metrics: metrics.value,
      analysis: analysis.value,
      overallScore: overallScore.value,
      recommendations: recommendations.value,
      performanceEntries: performanceEntries.value
    }
  }

  // Export performance data
  function exportPerformanceData() {
    const report = getPerformanceReport()
    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `performance-report-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Cleanup
  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    metrics,
    thresholds,
    isMonitoring,
    analysis,
    overallScore,
    recommendations,
    performanceEntries,

    // Methods
    startMonitoring,
    stopMonitoring,
    trackComponentPerformance,
    trackComponentError,
    trackAPIPerformance,
    getPerformanceReport,
    exportPerformanceData
  }
}


