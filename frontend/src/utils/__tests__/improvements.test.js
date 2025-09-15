import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { SelectionErrorHandler } from '../selectionErrorHandler'
import { VirtualListManager } from '../virtualListManager'
import { MemoizationManager, debounce, throttle, BatchProcessor } from '../memoization'
import { useSessionPaginationStore } from '../../stores/sessionPagination'
import { useSessionSelectionStore } from '../../stores/sessionSelection'

describe('Error Handler Tests', () => {
  let errorHandler

  beforeEach(() => {
    errorHandler = new SelectionErrorHandler()
    vi.clearAllMocks()
  })

  it('retries failed operations with exponential backoff', async () => {
    let attempts = 0
    const mockOperation = vi.fn().mockImplementation(() => {
      attempts++
      if (attempts < 3) {
        throw new Error('Network error')
      }
      return { success: true, data: 'resolved' }
    })

    // Mock executeRetry
    errorHandler.executeRetry = mockOperation

    const result = await errorHandler.handleError(
      new Error('Network error'),
      { type: 'API_CALL', data: {} },
      true
    )

    expect(attempts).toBe(3)
    expect(result.success).toBe(true)
    expect(result.result.data).toBe('resolved')
  })

  it('handles max retries exceeded', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent error'))
    errorHandler.executeRetry = mockOperation

    const result = await errorHandler.handleError(
      new Error('Persistent error'),
      { type: 'BULK_DELETE', data: { sessionIds: ['s1'] } },
      true
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Maximum retries exceeded')
    expect(mockOperation).toHaveBeenCalledTimes(3)
  })

  it('circuit breaker opens after threshold failures', async () => {
    errorHandler.circuitBreaker.threshold = 3
    
    // Simulate failures
    for (let i = 0; i < 3; i++) {
      errorHandler.recordFailure()
    }

    expect(errorHandler.circuitBreaker.state).toBe('open')
    expect(errorHandler.canProceed()).toBe(false)
  })

  it('circuit breaker transitions to half-open after timeout', async () => {
    errorHandler.circuitBreaker.state = 'open'
    errorHandler.circuitBreaker.lastFailureTime = Date.now() - 31000 // Past timeout
    errorHandler.circuitBreaker.timeout = 30000

    expect(errorHandler.canProceed()).toBe(true)
    expect(errorHandler.circuitBreaker.state).toBe('half-open')
  })

  it('provides user-friendly error messages', () => {
    const errorEntry = {
      context: { type: 'BULK_DELETE' },
      error: new Error('Internal server error')
    }

    const message = errorHandler.getUserFriendlyMessage(errorEntry)
    expect(message).toBe('Unable to delete selected sessions. Some may be in use.')
  })

  it('recovers with appropriate strategy', async () => {
    const mockStore = {
      clearSelection: vi.fn(),
      setFilteredSessions: vi.fn()
    }

    errorHandler.executeRecovery = vi.fn().mockResolvedValue({
      recovered: true,
      strategy: 'CLEAR_AND_REFRESH'
    })

    const errorEntry = {
      context: { type: 'STATS_CALCULATION', data: { store: mockStore } },
      error: new Error('Calculation error'),
      retryCount: 3
    }

    const strategy = errorHandler.getRecoveryStrategy(errorEntry)
    expect(strategy).toBe('CLEAR_AND_REFRESH')
  })
})

describe('Virtual List Manager Tests', () => {
  let virtualList

  beforeEach(() => {
    virtualList = new VirtualListManager({
      itemHeight: 50,
      containerHeight: 500,
      bufferSize: 3
    })
  })

  it('calculates visible items correctly', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      session_id: `s${i}`,
      name: `Session ${i}`
    }))

    const result = virtualList.calculateVisibleItems(250, items)

    // At scroll position 250 with item height 50:
    // Visible start index = 250 / 50 = 5
    // Visible count = 500 / 50 = 10
    // With buffer of 3: start = 2, end = 18
    expect(result.visibleRange.start).toBe(2)
    expect(result.visibleRange.end).toBe(18)
    expect(result.visibleItems.length).toBe(16)
    expect(result.totalHeight).toBe(5000)
  })

  it('handles range selection in virtual list', () => {
    const mockStore = {
      lastSelectedIndex: 5,
      addToSelection: vi.fn(),
      setLastSelectedIndex: vi.fn()
    }

    virtualList.visibleRange = { start: 10, end: 30 }
    virtualList.items = Array.from({ length: 100 }, (_, i) => ({
      session_id: `s${i}`
    }))

    const result = virtualList.handleRangeSelection(15, mockStore)

    expect(result.type).toBe('range')
    expect(result.from).toBe(5)
    expect(result.to).toBe(15)
    expect(mockStore.addToSelection).toHaveBeenCalledWith(
      expect.arrayContaining(['s5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13', 's14', 's15'])
    )
  })

  it('scrolls to specific item', () => {
    virtualList.items = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    virtualList.itemHeight = 80

    const scrollTop = virtualList.scrollToItem(25)
    expect(scrollTop).toBe(2000) // 25 * 80
  })

  it('tracks performance metrics', () => {
    virtualList.updatePerformanceMetrics(10)
    virtualList.updatePerformanceMetrics(15)
    virtualList.updatePerformanceMetrics(12)

    const report = virtualList.getPerformanceReport()
    expect(report.totalRenders).toBe(3)
    expect(report.maxRenderTime).toBe(15)
    expect(report.isPerformant).toBe(true)
    expect(report.currentFPS).toBeGreaterThan(0)
  })

  it('maintains scroll position when updating items', () => {
    virtualList.items = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    virtualList.scrollTop = 1000

    const newItems = Array.from({ length: 60 }, (_, i) => ({ id: i }))
    const result = virtualList.updateItems(newItems)

    // Should maintain relative position
    expect(result.scrollTop).toBeCloseTo(1200, -1) // (1000/50) * 60
    expect(result.itemsUpdated).toBe(true)
  })
})

describe('Memoization Tests', () => {
  let memoManager

  beforeEach(() => {
    memoManager = new MemoizationManager()
  })

  it('caches function results', () => {
    const expensiveFn = vi.fn((a, b) => a + b)
    const memoized = memoManager.memoize(expensiveFn)

    expect(memoized(1, 2)).toBe(3)
    expect(memoized(1, 2)).toBe(3)
    expect(memoized(1, 2)).toBe(3)
    
    expect(expensiveFn).toHaveBeenCalledTimes(1)
  })

  it('respects TTL for cached values', async () => {
    const fn = vi.fn(() => Date.now())
    const memoized = memoManager.memoize(fn, { ttl: 50 })

    const first = memoized()
    await new Promise(resolve => setTimeout(resolve, 10))
    const second = memoized()
    
    expect(first).toBe(second)
    expect(fn).toHaveBeenCalledTimes(1)

    await new Promise(resolve => setTimeout(resolve, 60))
    const third = memoized()
    
    expect(third).not.toBe(second)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('evicts least recently used items', () => {
    const fn = vi.fn(x => x * 2)
    const memoized = memoManager.memoize(fn, { maxSize: 3 })

    memoized(1) // Cache: [1]
    memoized(2) // Cache: [1, 2]
    memoized(3) // Cache: [1, 2, 3]
    memoized(4) // Cache: [2, 3, 4] - 1 evicted
    
    memoized(1) // Not in cache, recalculated
    expect(fn).toHaveBeenCalledTimes(5)
  })

  it('provides cache statistics', () => {
    const fn = x => x * 2
    const memoized = memoManager.memoize(fn, { cacheName: 'test' })

    memoized(1)
    memoized(1) // Hit
    memoized(2)
    memoized(2) // Hit

    const stats = memoManager.getAllStats()
    expect(stats.test.hits).toBe(2)
    expect(stats.test.misses).toBe(2)
    expect(stats.test.hitRate).toBe(50)
  })
})

describe('Debounce and Throttle Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces function calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced(1)
    debounced(2)
    debounced(3)

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(3)
  })

  it('throttles function calls', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled(1)
    throttled(2)
    throttled(3)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)

    vi.advanceTimersByTime(100)
    throttled(4)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith(4)
  })
})

describe('Batch Processor Tests', () => {
  it('processes items in batches', async () => {
    const processFn = vi.fn()
    const batcher = new BatchProcessor(processFn, { batchSize: 3, delay: 0 })

    for (let i = 0; i < 10; i++) {
      batcher.add(i)
    }

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(processFn).toHaveBeenCalledTimes(4) // 10 items / 3 batch size = 4 batches
    expect(processFn).toHaveBeenCalledWith([0, 1, 2])
    expect(processFn).toHaveBeenCalledWith([3, 4, 5])
    expect(processFn).toHaveBeenCalledWith([6, 7, 8])
    expect(processFn).toHaveBeenCalledWith([9])
  })
})

describe('Pagination Store Tests', () => {
  let paginationStore
  let selectionStore

  beforeEach(() => {
    setActivePinia(createPinia())
    paginationStore = useSessionPaginationStore()
    selectionStore = useSessionSelectionStore()
  })

  it('loads pages correctly', async () => {
    const result = await paginationStore.loadPage(1)
    
    expect(result).toBeDefined()
    expect(result.length).toBe(20)
    expect(paginationStore.currentPage).toBe(1)
    expect(paginationStore.totalPages).toBeGreaterThan(0)
    expect(paginationStore.loadedPages.has(1)).toBe(true)
  })

  it('navigates between pages', async () => {
    await paginationStore.loadPage(1)
    expect(paginationStore.currentPage).toBe(1)

    await paginationStore.nextPage()
    expect(paginationStore.currentPage).toBe(2)

    await paginationStore.prevPage()
    expect(paginationStore.currentPage).toBe(1)

    await paginationStore.lastPage()
    expect(paginationStore.isLastPage).toBe(true)

    await paginationStore.firstPage()
    expect(paginationStore.isFirstPage).toBe(true)
  })

  it('caches loaded pages', async () => {
    await paginationStore.loadPage(1)
    const firstLoadTime = paginationStore.lastLoadTime

    // Load same page again - should be faster due to cache
    await paginationStore.loadPageQuietly(1)
    
    expect(paginationStore.allSessionIds.has(1)).toBe(true)
    expect(paginationStore.cacheSize).toBeGreaterThan(0)
  })

  it('selects all pages progressively', async () => {
    await paginationStore.loadPage(1)
    const selectedCount = await paginationStore.selectAllPages()
    
    expect(selectedCount).toBeGreaterThan(0)
    expect(selectionStore.selectedCount).toBe(selectedCount)
    expect(paginationStore.loadingProgress).toBe(100)
  })

  it('updates filters and reloads', async () => {
    await paginationStore.loadPage(2)
    expect(paginationStore.currentPage).toBe(2)

    await paginationStore.updateFilters({ status: 'COMPLETED' })
    
    expect(paginationStore.currentPage).toBe(1)
    expect(paginationStore.currentFilters.status).toBe('COMPLETED')
    expect(paginationStore.loadedPages.size).toBe(1)
  })

  it('changes page size correctly', async () => {
    await paginationStore.loadPage(3)
    const oldPageSize = paginationStore.pageSize
    
    await paginationStore.setPageSize(50)
    
    expect(paginationStore.pageSize).toBe(50)
    expect(paginationStore.pageSize).not.toBe(oldPageSize)
    // Should maintain approximate position
    expect(paginationStore.currentPage).toBeLessThanOrEqual(3)
  })

  it('provides accurate page info', async () => {
    await paginationStore.loadPage(2)
    const info = paginationStore.pageInfo
    
    expect(info.from).toBe(21)
    expect(info.to).toBe(40)
    expect(info.currentPage).toBe(2)
    expect(info.total).toBeGreaterThan(0)
  })

  it('tracks performance metrics', async () => {
    await paginationStore.loadPage(1)
    await paginationStore.loadPage(2)
    
    const stats = paginationStore.getPaginationStats()
    
    expect(stats.loadedPages).toBe(2)
    expect(stats.averageLoadTime).toBeGreaterThan(0)
    expect(stats.cacheSize).toBeGreaterThan(0)
    expect(stats.memoryEstimate).toMatch(/\d+\.\d+ KB/)
  })
})