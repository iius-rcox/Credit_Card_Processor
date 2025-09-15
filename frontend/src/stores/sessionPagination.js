import { defineStore } from 'pinia'
import { useSessionSelectionStore } from './sessionSelection'
import errorHandler from '../utils/selectionErrorHandler'

/**
 * Pagination Store for Session Management
 * Handles paginated data loading and cross-page selection
 */
export const useSessionPaginationStore = defineStore('sessionPagination', {
  state: () => ({
    // Pagination state
    currentPage: 1,
    pageSize: 20,
    totalPages: 1,
    totalItems: 0,
    
    // Data storage
    paginatedSessions: [],
    allSessionIds: new Map(), // Map<page, sessionIds[]>
    sessionDataCache: new Map(), // Map<sessionId, sessionData>
    loadedPages: new Set(),
    
    // Loading state
    isLoadingPage: false,
    loadingProgress: 0,
    
    // Filters
    currentFilters: {},
    sortBy: 'created_at',
    sortOrder: 'desc',
    
    // Performance
    lastLoadTime: 0,
    averageLoadTime: 0
  }),

  getters: {
    hasNextPage: (state) => state.currentPage < state.totalPages,
    hasPrevPage: (state) => state.currentPage > 1,
    
    pageInfo: (state) => ({
      from: state.totalItems === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1,
      to: Math.min(state.currentPage * state.pageSize, state.totalItems),
      total: state.totalItems,
      currentPage: state.currentPage,
      totalPages: state.totalPages,
      pageSize: state.pageSize
    }),
    
    loadedPageCount: (state) => state.loadedPages.size,
    
    cacheSize: (state) => state.sessionDataCache.size,
    
    isFirstPage: (state) => state.currentPage === 1,
    isLastPage: (state) => state.currentPage === state.totalPages,
    
    pageNumbers: (state) => {
      const pages = []
      const maxVisible = 7
      const halfVisible = Math.floor(maxVisible / 2)
      
      let start = Math.max(1, state.currentPage - halfVisible)
      let end = Math.min(state.totalPages, start + maxVisible - 1)
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      return pages
    }
  },

  actions: {
    /**
     * Load a specific page with error handling
     */
    async loadPage(page, options = {}) {
      if (this.isLoadingPage && !options.force) {
        return null
      }
      
      this.isLoadingPage = true
      this.loadingProgress = 0
      const startTime = performance.now()
      
      try {
        // Simulate API call - replace with actual API
        const response = await this.fetchSessions({
          page,
          pageSize: this.pageSize,
          sortBy: this.sortBy,
          sortOrder: this.sortOrder,
          ...this.currentFilters
        })
        
        this.paginatedSessions = response.data
        this.totalItems = response.total
        this.totalPages = Math.ceil(response.total / this.pageSize)
        this.currentPage = page
        
        // Cache session data
        response.data.forEach(session => {
          this.sessionDataCache.set(session.session_id, session)
        })
        
        // Store session IDs for this page
        const sessionIds = response.data.map(s => s.session_id)
        this.allSessionIds.set(page, sessionIds)
        this.loadedPages.add(page)
        
        // Update selection store
        const selectionStore = useSessionSelectionStore()
        selectionStore.setFilteredSessions(response.data)
        
        // Update performance metrics
        const loadTime = performance.now() - startTime
        this.updateLoadTimeMetrics(loadTime)
        
        this.loadingProgress = 100
        
        return response.data
      } catch (error) {
        const result = await errorHandler.handleError(error, {
          type: 'API_CALL',
          data: {
            method: 'GET',
            endpoint: '/api/sessions',
            payload: { page, pageSize: this.pageSize }
          }
        })
        
        if (result.success) {
          return result.result
        }
        
        throw error
      } finally {
        this.isLoadingPage = false
        this.loadingProgress = 0
      }
    },

    /**
     * Fetch sessions from API (mock implementation)
     */
    async fetchSessions(params) {
      // This should be replaced with actual API call
      // For now, return mock data
      const mockData = {
        data: Array.from({ length: params.pageSize }, (_, i) => ({
          session_id: `s${(params.page - 1) * params.pageSize + i + 1}`,
          session_name: `Session ${(params.page - 1) * params.pageSize + i + 1}`,
          status: ['COMPLETED', 'PROCESSING', 'FAILED', 'CLOSED'][Math.floor(Math.random() * 4)],
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          has_results: Math.random() > 0.3,
          file_count: Math.floor(Math.random() * 100),
          transaction_count: Math.floor(Math.random() * 1000),
          exception_count: Math.floor(Math.random() * 50)
        })),
        total: 237, // Mock total
        page: params.page,
        pageSize: params.pageSize
      }
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200))
      
      return mockData
    },

    /**
     * Load page without updating current view
     */
    async loadPageQuietly(page) {
      if (this.loadedPages.has(page)) {
        return this.allSessionIds.get(page)
      }
      
      try {
        const response = await this.fetchSessions({
          page,
          pageSize: this.pageSize,
          ...this.currentFilters
        })
        
        // Cache the data
        response.data.forEach(session => {
          this.sessionDataCache.set(session.session_id, session)
        })
        
        const sessionIds = response.data.map(s => s.session_id)
        this.allSessionIds.set(page, sessionIds)
        this.loadedPages.add(page)
        
        return sessionIds
      } catch (error) {
        console.error(`Failed to load page ${page} quietly:`, error)
        return []
      }
    },

    /**
     * Select all sessions across all pages
     */
    async selectAllPages() {
      const selectionStore = useSessionSelectionStore()
      
      // Calculate batches for efficient loading
      const batchSize = 5
      const totalBatches = Math.ceil(this.totalPages / batchSize)
      
      this.loadingProgress = 0
      
      for (let batch = 0; batch < totalBatches; batch++) {
        const promises = []
        
        for (let i = 0; i < batchSize; i++) {
          const page = batch * batchSize + i + 1
          if (page <= this.totalPages && !this.loadedPages.has(page)) {
            promises.push(this.loadPageQuietly(page))
          }
        }
        
        await Promise.all(promises)
        this.loadingProgress = ((batch + 1) / totalBatches) * 100
      }
      
      // Add all session IDs to selection
      const allIds = []
      this.allSessionIds.forEach(ids => {
        allIds.push(...ids)
      })
      
      selectionStore.addToSelection(allIds)
      this.loadingProgress = 100
      
      return allIds.length
    },

    /**
     * Navigate to specific page
     */
    async goToPage(page) {
      if (page < 1 || page > this.totalPages || page === this.currentPage) {
        return false
      }
      
      return await this.loadPage(page)
    },

    async nextPage() {
      if (this.hasNextPage) {
        return await this.goToPage(this.currentPage + 1)
      }
      return false
    },

    async prevPage() {
      if (this.hasPrevPage) {
        return await this.goToPage(this.currentPage - 1)
      }
      return false
    },

    async firstPage() {
      if (!this.isFirstPage) {
        return await this.goToPage(1)
      }
      return false
    },

    async lastPage() {
      if (!this.isLastPage) {
        return await this.goToPage(this.totalPages)
      }
      return false
    },

    /**
     * Update filters and reload
     */
    async updateFilters(filters) {
      this.currentFilters = { ...filters }
      this.clearCache()
      return await this.loadPage(1)
    },

    /**
     * Update sort and reload
     */
    async updateSort(sortBy, sortOrder = null) {
      if (sortBy === this.sortBy && !sortOrder) {
        // Toggle order if same column
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortBy = sortBy
        this.sortOrder = sortOrder || 'asc'
      }
      
      this.clearCache()
      return await this.loadPage(1)
    },

    /**
     * Change page size
     */
    async setPageSize(size) {
      if (size === this.pageSize) return
      
      // Calculate new current page to maintain position
      const currentFirstItem = (this.currentPage - 1) * this.pageSize
      const newPage = Math.floor(currentFirstItem / size) + 1
      
      this.pageSize = size
      this.clearCache()
      
      return await this.loadPage(newPage)
    },

    /**
     * Get session data from cache or load it
     */
    async getSessionData(sessionId) {
      if (this.sessionDataCache.has(sessionId)) {
        return this.sessionDataCache.get(sessionId)
      }
      
      // Find which page contains this session
      for (const [page, ids] of this.allSessionIds) {
        if (ids.includes(sessionId)) {
          await this.loadPageQuietly(page)
          return this.sessionDataCache.get(sessionId)
        }
      }
      
      return null
    },

    /**
     * Refresh current page
     */
    async refresh() {
      this.loadedPages.delete(this.currentPage)
      this.allSessionIds.delete(this.currentPage)
      return await this.loadPage(this.currentPage, { force: true })
    },

    /**
     * Clear cache for specific pages
     */
    clearPageCache(pages) {
      if (!Array.isArray(pages)) {
        pages = [pages]
      }
      
      pages.forEach(page => {
        this.loadedPages.delete(page)
        const sessionIds = this.allSessionIds.get(page)
        if (sessionIds) {
          sessionIds.forEach(id => {
            this.sessionDataCache.delete(id)
          })
          this.allSessionIds.delete(page)
        }
      })
    },

    /**
     * Clear all cache
     */
    clearCache() {
      this.allSessionIds.clear()
      this.sessionDataCache.clear()
      this.loadedPages.clear()
    },

    /**
     * Update performance metrics
     */
    updateLoadTimeMetrics(loadTime) {
      this.lastLoadTime = loadTime
      
      // Calculate moving average
      const alpha = 0.2 // Smoothing factor
      if (this.averageLoadTime === 0) {
        this.averageLoadTime = loadTime
      } else {
        this.averageLoadTime = alpha * loadTime + (1 - alpha) * this.averageLoadTime
      }
    },

    /**
     * Get pagination statistics
     */
    getPaginationStats() {
      return {
        loadedPages: this.loadedPageCount,
        totalPages: this.totalPages,
        cacheSize: this.cacheSize,
        averageLoadTime: Math.round(this.averageLoadTime),
        lastLoadTime: Math.round(this.lastLoadTime),
        memoryEstimate: `${(this.cacheSize * 0.001).toFixed(2)} KB`
      }
    },

    /**
     * Reset pagination state
     */
    reset() {
      this.currentPage = 1
      this.totalPages = 1
      this.totalItems = 0
      this.paginatedSessions = []
      this.clearCache()
      this.currentFilters = {}
      this.sortBy = 'created_at'
      this.sortOrder = 'desc'
      this.lastLoadTime = 0
      this.averageLoadTime = 0
    }
  }
})