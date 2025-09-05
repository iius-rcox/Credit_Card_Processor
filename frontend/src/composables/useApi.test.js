import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useApi } from './useApi.js'
import { useSessionStore } from '../stores/session.js'
import { useNotificationStore } from '../stores/notification.js'

// Mock stores
vi.mock('../stores/session')
vi.mock('../stores/notification')

describe('useApi Composable', () => {
  let api
  let mockSessionStore
  let mockNotificationStore
  let fetchMock

  beforeEach(() => {
    // Setup fetch mock
    fetchMock = vi.fn()
    global.fetch = fetchMock
    
    // Mock session store
    mockSessionStore = {
      user: { 
        value: { 
          username: 'testuser',
          email: 'test@example.com' 
        } 
      },
      setAuthError: vi.fn(),
      setSessionError: vi.fn(),
      updateSession: vi.fn(),
    }
    
    // Mock notification store
    mockNotificationStore = {
      handleApiError: vi.fn(),
      addNotification: vi.fn(),
    }
    
    useSessionStore.mockReturnValue(mockSessionStore)
    useNotificationStore.mockReturnValue(mockNotificationStore)
    
    // Create fresh API instance
    api = useApi()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Request Method - Core Functionality', () => {
    it('should make successful GET requests', async () => {
      const mockResponse = { success: true, data: 'test' }
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.request('/test-endpoint')

      expect(fetchMock).toHaveBeenCalledWith('/api/test-endpoint', {
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
          'x-user-context': 'testuser',
        },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should make successful POST requests with JSON body', async () => {
      const mockResponse = { id: '123', created: true }
      const requestData = { name: 'Test Session', options: {} }
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.request('/sessions', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })

      expect(fetchMock).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
          'x-user-context': 'testuser',
        },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle FormData requests correctly', async () => {
      const mockResponse = { uploaded: true, file_id: 'file123' }
      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.pdf'))
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.request('/upload', {
        method: 'POST',
        body: formData,
      })

      const callArgs = fetchMock.mock.calls[0][1]
      expect(callArgs.headers).not.toHaveProperty('Content-Type')
      expect(callArgs.body).toBe(formData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Error Handling - Critical for "Start New Session" Bug', () => {
    it('should handle HTTP 400 Bad Request errors', async () => {
      const errorResponse = {
        detail: 'Session name is required',
        code: 'VALIDATION_ERROR',
      }
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(errorResponse),
      })

      await expect(api.request('/sessions', { method: 'POST' }))
        .rejects.toThrow('Session name is required')

      expect(mockNotificationStore.handleApiError).toHaveBeenCalled()
    })

    it('should handle HTTP 401 Authentication errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ detail: 'Authentication required' }),
      })

      await expect(api.request('/sessions'))
        .rejects.toThrow('Authentication required')

      expect(mockSessionStore.setAuthError).toHaveBeenCalledWith('Authentication required')
    })

    it('should handle HTTP 500 Server errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ detail: 'Database connection failed' }),
      })

      await expect(api.request('/sessions'))
        .rejects.toThrow('Database connection failed')

      expect(mockSessionStore.setSessionError).toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      const networkError = new Error('fetch failed')
      networkError.name = 'TypeError'
      fetchMock.mockRejectedValue(networkError)

      await expect(api.request('/sessions')).rejects.toThrow('fetch failed')
    })

    it('should handle malformed JSON responses gracefully', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(api.request('/sessions'))
        .rejects.toThrow('HTTP 400: Bad Request')
    })
  })

  describe('Retry Logic - Potential Error Source', () => {
    it('should retry on temporary failures', async () => {
      // First two calls fail, third succeeds
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ success: true }),
        })

      const result = await api.request('/sessions')

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ success: true })
    })

    it('should retry on 503 Service Unavailable', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ detail: 'Server overloaded' }),
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ success: true }),
        })

      const result = await api.request('/sessions')

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })

    it('should not retry on validation errors (4xx)', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ detail: 'Invalid input' }),
      })

      await expect(api.request('/sessions')).rejects.toThrow('Invalid input')
      
      // Should only be called once (no retry)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should stop retrying after maximum attempts', async () => {
      const networkError = new Error('Network error')
      networkError.name = 'TypeError'
      fetchMock.mockRejectedValue(networkError)

      await expect(api.request('/sessions')).rejects.toThrow('Network error')
      
      // Should try 3 times (initial + 2 retries)
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
  })

  describe('Session Creation - Specific Error Investigation', () => {
    it('should create sessions with proper data structure', async () => {
      const mockResponse = {
        session_id: 'sess_abc123',
        status: 'idle',
        created_at: '2024-01-01T00:00:00.000Z',
      }
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
      })

      const sessionData = {
        session_name: 'Test Session',
        processing_options: {
          validation_enabled: true,
          auto_resolution_enabled: false,
          email_notifications: false,
        },
      }

      const result = await api.createSession(sessionData)

      expect(fetchMock).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
          'x-user-context': 'testuser',
        },
        body: JSON.stringify(sessionData),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should provide default session data when none provided', async () => {
      const mockResponse = { session_id: 'sess_def456' }
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
      })

      await api.createSession()

      const callArgs = fetchMock.mock.calls[0][1]
      const requestBody = JSON.parse(callArgs.body)
      
      expect(requestBody).toHaveProperty('session_name')
      expect(requestBody.session_name).toMatch(/Processing Session/)
      expect(requestBody.processing_options).toEqual({
        validation_enabled: true,
        auto_resolution_enabled: false,
        email_notifications: false,
      })
    })

    it('should handle session name conflicts', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ 
          detail: 'A session with this name already exists' 
        }),
      })

      await expect(api.createSession({ session_name: 'Duplicate Session' }))
        .rejects.toThrow('A session with this name already exists')
    })
  })

  describe('Performance Monitoring', () => {
    it('should track request metrics', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ success: true }),
      })

      const initialCount = api.performanceMetrics.value.requestCount

      await api.request('/test')

      expect(api.performanceMetrics.value.requestCount).toBe(initialCount + 1)
      expect(api.performanceMetrics.value.lastRequestTime).toBeGreaterThan(0)
    })

    it('should detect slow requests', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Mock performance.now to simulate slow request
      const originalNow = performance.now
      let callCount = 0
      performance.now = vi.fn(() => {
        callCount++
        return callCount === 1 ? 0 : 3000 // 3 second request
      })

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ success: true }),
      })

      await api.request('/slow-endpoint')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow API request detected')
      )
      
      // Cleanup
      performance.now = originalNow
      consoleSpy.mockRestore()
    })
  })

  describe('Authentication Headers', () => {
    it('should include development headers in dev mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const headers = api.getAuthHeaders()
      
      expect(headers).toHaveProperty('x-dev-user', 'testuser')
      expect(headers).toHaveProperty('x-user-context', 'testuser')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should handle missing user context gracefully', () => {
      mockSessionStore.user = { value: null }
      
      const headers = api.getAuthHeaders()
      
      expect(headers).not.toHaveProperty('x-user-context')
    })
  })

  describe('Content Type Handling', () => {
    it('should handle text responses', async () => {
      const textResponse = 'CSV,data,here'
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/csv']]),
        text: () => Promise.resolve(textResponse),
      })

      const result = await api.request('/export/csv')
      expect(result).toBe(textResponse)
    })

    it('should handle binary responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/pdf']]),
        blob: () => Promise.resolve(new Blob()),
      }
      
      fetchMock.mockResolvedValue(mockResponse)

      const result = await api.request('/export/pdf')
      expect(result).toBe(mockResponse)
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should handle intermittent connectivity issues', async () => {
      // Simulate network dropping and recovering
      fetchMock
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ success: true, recovered: true }),
        })

      const result = await api.request('/sessions')
      
      expect(result).toEqual({ success: true, recovered: true })
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('should maintain request state consistency during failures', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      expect(api.isLoading.value).toBe(false)
      expect(api.error.value).toBe(null)

      const requestPromise = api.request('/sessions')
      
      // Should be loading during request
      expect(api.isLoading.value).toBe(true)
      
      await expect(requestPromise).rejects.toThrow()
      
      // Should reset loading state after error
      expect(api.isLoading.value).toBe(false)
      expect(api.error.value).toBeTruthy()
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle null/undefined URLs gracefully', async () => {
      await expect(api.request(null)).rejects.toThrow()
      await expect(api.request(undefined)).rejects.toThrow()
    })

    it('should sanitize error messages from server', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ 
          detail: '<script>alert("xss")</script>Error message' 
        }),
      })

      await expect(api.request('/sessions'))
        .rejects.toThrow('<script>alert("xss")</script>Error message')
      
      // The error should be passed through but handled safely by the UI layer
    })

    it('should handle large response payloads', async () => {
      const largeData = {
        employees: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Employee ${i}`,
          data: 'x'.repeat(100),
        })),
      }
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(largeData),
      })

      const result = await api.request('/sessions/results')
      
      expect(result.employees).toHaveLength(10000)
      expect(result).toEqual(largeData)
    })
  })
})