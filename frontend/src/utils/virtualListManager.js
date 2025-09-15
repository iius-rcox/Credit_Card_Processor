/**
 * Virtual List Manager for High-Performance Scrolling
 * Handles thousands of items with minimal DOM nodes
 */
export class VirtualListManager {
  constructor(options = {}) {
    // Configuration
    this.itemHeight = options.itemHeight || 80
    this.bufferSize = options.bufferSize || 5
    this.containerHeight = options.containerHeight || 600
    this.debounceDelay = options.debounceDelay || 16 // ~60fps
    
    // State
    this.items = []
    this.visibleRange = { start: 0, end: 0 }
    this.scrollTop = 0
    this.isScrolling = false
    this.scrollTimeout = null
    
    // Performance tracking
    this.renderCount = 0
    this.lastRenderTime = 0
    this.performanceMetrics = {
      avgRenderTime: 0,
      maxRenderTime: 0,
      totalRenders: 0
    }
  }

  /**
   * Calculate visible items based on scroll position
   */
  calculateVisibleItems(scrollTop, items) {
    const startTime = performance.now()
    
    this.scrollTop = scrollTop
    this.items = items

    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight)
    const totalHeight = items.length * this.itemHeight
    
    // Calculate visible range
    const start = Math.floor(scrollTop / this.itemHeight)
    const end = Math.min(start + visibleCount, items.length)
    
    // Add buffer for smooth scrolling
    const bufferedStart = Math.max(0, start - this.bufferSize)
    const bufferedEnd = Math.min(items.length, end + this.bufferSize)
    
    this.visibleRange = {
      start: bufferedStart,
      end: bufferedEnd,
      renderStart: start,
      renderEnd: end
    }

    // Track performance
    const renderTime = performance.now() - startTime
    this.updatePerformanceMetrics(renderTime)

    return {
      visibleItems: items.slice(bufferedStart, bufferedEnd),
      offsetY: bufferedStart * this.itemHeight,
      totalHeight,
      visibleRange: this.visibleRange,
      itemCount: bufferedEnd - bufferedStart
    }
  }

  /**
   * Handle scroll with debouncing
   */
  handleScroll(scrollTop, callback) {
    this.isScrolling = true
    
    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
    
    // Immediate calculation for smooth scrolling
    const result = this.calculateVisibleItems(scrollTop, this.items)
    
    // Debounced callback for scroll end
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false
      if (callback) {
        callback('scrollEnd', result)
      }
    }, this.debounceDelay)
    
    return result
  }

  /**
   * Handle selection in virtual list
   */
  handleVirtualSelection(index, event, store) {
    const actualIndex = this.visibleRange.start + index
    const session = this.items[actualIndex]
    
    if (!session) return null
    
    // Handle different selection modes
    if (event.shiftKey && store.lastSelectedIndex !== null) {
      return this.handleRangeSelection(actualIndex, store)
    } else if (event.ctrlKey || event.metaKey) {
      return this.handleMultiSelection(session, actualIndex, store)
    } else {
      return this.handleSingleSelection(session, actualIndex, store)
    }
  }

  /**
   * Handle range selection in virtual list
   */
  handleRangeSelection(actualIndex, store) {
    const start = Math.min(store.lastSelectedIndex, actualIndex)
    const end = Math.max(store.lastSelectedIndex, actualIndex)
    
    const rangeIds = []
    for (let i = start; i <= end; i++) {
      if (this.items[i]) {
        rangeIds.push(this.items[i].session_id)
      }
    }
    
    store.addToSelection(rangeIds)
    store.setLastSelectedIndex(actualIndex)
    
    return {
      type: 'range',
      selected: rangeIds,
      from: start,
      to: end
    }
  }

  /**
   * Handle multi-selection (Ctrl/Cmd+Click)
   */
  handleMultiSelection(session, actualIndex, store) {
    store.toggleSessionSelection(session.session_id, actualIndex)
    
    return {
      type: 'multi',
      sessionId: session.session_id,
      selected: store.isSessionSelected(session.session_id)
    }
  }

  /**
   * Handle single selection
   */
  handleSingleSelection(session, actualIndex, store) {
    store.clearSelection()
    store.addToSelection(session.session_id)
    store.setLastSelectedIndex(actualIndex)
    
    return {
      type: 'single',
      sessionId: session.session_id
    }
  }

  /**
   * Get visible selections for current viewport
   */
  getVisibleSelections(store) {
    const selections = new Map()
    
    for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
      const item = this.items[i]
      if (item && store.isSessionSelected(item.session_id)) {
        selections.set(i, item.session_id)
      }
    }
    
    return selections
  }

  /**
   * Scroll to specific item
   */
  scrollToItem(index, container) {
    if (index < 0 || index >= this.items.length) {
      return false
    }
    
    const targetScrollTop = index * this.itemHeight
    
    if (container) {
      container.scrollTop = targetScrollTop
      return true
    }
    
    return targetScrollTop
  }

  /**
   * Scroll to first selected item
   */
  scrollToFirstSelected(store, container) {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]
      if (item && store.isSessionSelected(item.session_id)) {
        return this.scrollToItem(i, container)
      }
    }
    return false
  }

  /**
   * Get index of item in viewport
   */
  getItemIndexInViewport(sessionId) {
    for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
      if (this.items[i]?.session_id === sessionId) {
        return i - this.visibleRange.start
      }
    }
    return -1
  }

  /**
   * Check if item is in viewport
   */
  isItemInViewport(index) {
    return index >= this.visibleRange.renderStart && index < this.visibleRange.renderEnd
  }

  /**
   * Update items without losing scroll position
   */
  updateItems(newItems) {
    const oldScrollRatio = this.items.length > 0 
      ? this.scrollTop / (this.items.length * this.itemHeight)
      : 0
    
    this.items = newItems
    
    // Maintain relative scroll position
    const newScrollTop = oldScrollRatio * (newItems.length * this.itemHeight)
    
    return {
      scrollTop: newScrollTop,
      itemsUpdated: true
    }
  }

  /**
   * Performance metrics tracking
   */
  updatePerformanceMetrics(renderTime) {
    this.performanceMetrics.totalRenders++
    this.performanceMetrics.maxRenderTime = Math.max(
      this.performanceMetrics.maxRenderTime,
      renderTime
    )
    
    // Calculate moving average
    const alpha = 0.1 // Smoothing factor
    this.performanceMetrics.avgRenderTime = 
      alpha * renderTime + (1 - alpha) * this.performanceMetrics.avgRenderTime
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return {
      ...this.performanceMetrics,
      currentFPS: this.performanceMetrics.avgRenderTime > 0 
        ? Math.round(1000 / this.performanceMetrics.avgRenderTime)
        : 60,
      isPerformant: this.performanceMetrics.avgRenderTime < 16.67, // 60fps threshold
      itemsInView: this.visibleRange.end - this.visibleRange.start,
      totalItems: this.items.length
    }
  }

  /**
   * Reset virtual list
   */
  reset() {
    this.items = []
    this.visibleRange = { start: 0, end: 0 }
    this.scrollTop = 0
    this.isScrolling = false
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
      this.scrollTimeout = null
    }
  }

  /**
   * Destroy and clean up
   */
  destroy() {
    this.reset()
    this.performanceMetrics = {
      avgRenderTime: 0,
      maxRenderTime: 0,
      totalRenders: 0
    }
  }
}

/**
 * Create a virtual list instance with default options
 */
export function createVirtualList(options) {
  return new VirtualListManager(options)
}

/**
 * Calculate optimal buffer size based on scroll speed
 */
export function calculateDynamicBuffer(scrollSpeed, baseBuffer = 5) {
  const speedFactor = Math.min(Math.abs(scrollSpeed) / 1000, 1)
  return Math.ceil(baseBuffer + (baseBuffer * speedFactor))
}

/**
 * Estimate item height from sample
 */
export function estimateItemHeight(container, sampleSize = 10) {
  const items = container.querySelectorAll('.list-item')
  
  if (items.length === 0) return 80 // Default fallback
  
  const sample = Array.from(items).slice(0, sampleSize)
  const totalHeight = sample.reduce((sum, item) => {
    return sum + item.getBoundingClientRect().height
  }, 0)
  
  return Math.round(totalHeight / sample.length)
}

export default VirtualListManager