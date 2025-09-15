// Performance Optimization Composables Index
// This file exports all performance optimization composables for easy importing

// Core performance composables
export { usePerformanceOptimization } from '../usePerformanceOptimization'
export { usePerformanceMonitoring } from '../usePerformanceMonitoring'
export { useMemoryManagement } from '../useMemoryManagement'
export { useCaching } from '../useCaching'

// Performance utilities
export const PERFORMANCE_UTILS = {
  // Debounce utility
  debounce: (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  // Throttle utility
  throttle: (func, limit) => {
    let inThrottle
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  // Memoization utility
  memoize: (func, keyGenerator) => {
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
  },

  // Request animation frame utility
  raf: (callback) => {
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      return window.requestAnimationFrame(callback)
    }
    return setTimeout(callback, 16) // 60fps fallback
  },

  // Cancel animation frame utility
  caf: (id) => {
    if (typeof window !== 'undefined' && 'cancelAnimationFrame' in window) {
      return window.cancelAnimationFrame(id)
    }
    return clearTimeout(id)
  },

  // Idle callback utility
  idle: (callback, options = {}) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      return window.requestIdleCallback(callback, options)
    }
    return setTimeout(callback, 0)
  },

  // Cancel idle callback utility
  cancelIdle: (id) => {
    if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
      return window.cancelIdleCallback(id)
    }
    return clearTimeout(id)
  }
}

// Performance constants
export const PERFORMANCE_CONSTANTS = {
  // Frame rates
  FPS_60: 16.67, // 60fps in milliseconds
  FPS_30: 33.33, // 30fps in milliseconds
  FPS_24: 41.67, // 24fps in milliseconds

  // Memory thresholds
  MEMORY_WARNING: 50, // 50MB
  MEMORY_CRITICAL: 100, // 100MB
  MEMORY_MAX: 200, // 200MB

  // Cache thresholds
  CACHE_WARNING: 100, // 100 items
  CACHE_CRITICAL: 500, // 500 items
  CACHE_MAX: 1000, // 1000 items

  // Network thresholds
  NETWORK_FAST: 100, // 100ms
  NETWORK_SLOW: 500, // 500ms
  NETWORK_CRITICAL: 1000, // 1s

  // Performance thresholds
  RENDER_FAST: 16, // 16ms (60fps)
  RENDER_SLOW: 33, // 33ms (30fps)
  RENDER_CRITICAL: 50, // 50ms (20fps)

  // Web Vitals thresholds
  LCP_GOOD: 2500, // 2.5s
  LCP_POOR: 4000, // 4s
  FID_GOOD: 100, // 100ms
  FID_POOR: 300, // 300ms
  CLS_GOOD: 0.1, // 0.1
  CLS_POOR: 0.25, // 0.25
  FCP_GOOD: 1800, // 1.8s
  FCP_POOR: 3000, // 3s
  TTFB_GOOD: 600, // 600ms
  TTFB_POOR: 1000, // 1s
  TTI_GOOD: 3800, // 3.8s
  TTI_POOR: 7300 // 7.3s
}

// Performance categories
export const PERFORMANCE_CATEGORIES = {
  CORE: 'core',
  MEMORY: 'memory',
  CACHE: 'cache',
  NETWORK: 'network',
  RENDER: 'render',
  INTERACTION: 'interaction',
  LOADING: 'loading'
}

// Performance severity levels
export const PERFORMANCE_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

// Performance status levels
export const PERFORMANCE_STATUS = {
  GOOD: 'good',
  POOR: 'poor',
  CRITICAL: 'critical'
}

// Helper function to get all performance composables
export function getAllPerformanceComposables() {
  return {
    usePerformanceOptimization,
    usePerformanceMonitoring,
    useMemoryManagement,
    useCaching
  }
}

// Helper function to create a comprehensive performance manager
export function createPerformanceManager() {
  const optimization = usePerformanceOptimization()
  const monitoring = usePerformanceMonitoring()
  const memory = useMemoryManagement()
  const caching = useCaching()

  return {
    // Core functionality
    optimization,
    monitoring,
    memory,
    caching,

    // Combined methods
    startAllMonitoring: () => {
      optimization.startMonitoring()
      monitoring.startMonitoring()
      memory.startMonitoring()
      caching.startMonitoring()
    },

    stopAllMonitoring: () => {
      optimization.stopMonitoring()
      monitoring.stopMonitoring()
      memory.stopMonitoring()
      caching.stopMonitoring()
    },

    getComprehensiveReport: () => {
      return {
        optimization: optimization.getPerformanceReport?.() || null,
        monitoring: monitoring.getPerformanceReport?.() || null,
        memory: memory.getMemoryReport?.() || null,
        cache: caching.getCacheReport?.() || null
      }
    },

    exportAllData: () => {
      const report = createPerformanceManager().getComprehensiveReport()
      const dataStr = JSON.stringify(report, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `performance-report-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
    },

    optimizeAll: () => {
      optimization.optimizeMemory?.()
      memory.optimizeMemory?.()
      caching.optimizeMemory?.()
    }
  }
}

// Performance benchmarking utilities
export const PERFORMANCE_BENCHMARKS = {
  // Benchmark a function
  benchmark: (func, iterations = 1000) => {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      func()
    }
    const end = performance.now()
    return {
      totalTime: end - start,
      averageTime: (end - start) / iterations,
      iterations
    }
  },

  // Benchmark async function
  benchmarkAsync: async (func, iterations = 100) => {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      await func()
    }
    const end = performance.now()
    return {
      totalTime: end - start,
      averageTime: (end - start) / iterations,
      iterations
    }
  },

  // Memory benchmark
  benchmarkMemory: (func) => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return null
    }

    const before = performance.memory.usedJSHeapSize
    func()
    const after = performance.memory.usedJSHeapSize

    return {
      before,
      after,
      difference: after - before,
      differenceMB: (after - before) / 1024 / 1024
    }
  }
}

// Performance monitoring hooks
export const PERFORMANCE_HOOKS = {
  // Hook into component lifecycle
  onComponentMount: (componentName, callback) => {
    return {
      mounted: () => {
        const start = performance.now()
        callback()
        const end = performance.now()
        console.log(`${componentName} mounted in ${end - start}ms`)
      }
    }
  },

  // Hook into component unmount
  onComponentUnmount: (componentName, callback) => {
    return {
      unmounted: () => {
        const start = performance.now()
        callback()
        const end = performance.now()
        console.log(`${componentName} unmounted in ${end - start}ms`)
      }
    }
  },

  // Hook into component update
  onComponentUpdate: (componentName, callback) => {
    return {
      updated: () => {
        const start = performance.now()
        callback()
        const end = performance.now()
        console.log(`${componentName} updated in ${end - start}ms`)
      }
    }
  }
}


