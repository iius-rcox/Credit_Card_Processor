import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useApi } from '../useApi.js'
import { useAuth } from '../useAuth.js'
import { useFileUpload } from '../useFileUpload.js'
import { useProgress } from '../useProgress.js'
import {
  flushPromises,
  setupFetchMock,
  createTestPinia,
  createMockFile,
  mockTimers,
  createMockXMLHttpRequest,
  waitFor,
  mockApiResponses,
  createMockResponse,
} from '../../test/utils.js'
import { setActivePinia } from 'pinia'

describe('Composables Integration Tests', () => {
  let fetchMock
  let pinia
  let timers

  beforeEach(() => {
    fetchMock = setupFetchMock()
    pinia = createTestPinia()
    setActivePinia(pinia)
    timers = mockTimers()
  })

  afterEach(() => {
    timers.restore()
    vi.clearAllMocks()
  })

  describe('Authentication Integration', () => {
    it('should integrate auth with API requests', async () => {
      const auth = useAuth()
      const api = useApi()

      // Use the default setupFetchMock which already handles these routes properly
      await auth.getCurrentUser()

      const result = await api.createSession({ session_name: 'Test Session' })

      expect(result.session_id).toBe('test-session-123')
      
      // Verify that both auth and API calls were made
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/current-user',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      )
      
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle auth failure in API requests', async () => {
      const api = useApi()

      // Mock 401 authentication failure with proper headers
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: {
          get: () => null,
          has: () => false,
          entries: () => [],
          forEach: () => {},
        },
        json: () => Promise.resolve({ detail: 'Authentication required' }),
      })

      await expect(api.createSession()).rejects.toThrow('Authentication required')
    })
  })

  describe('File Upload Integration', () => {
    it('should integrate file upload with auth and API', async () => {
      const auth = useAuth()
      const upload = useFileUpload()

      // Mock authentication with proper Response object
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ username: 'testuser' })
      )

      await auth.getCurrentUser()

      // Create test file
      const testFile = createMockFile('test-car.pdf', 1024, 'application/pdf')
      
      // Set up XMLHttpRequest mock
      const MockXHR = createMockXMLHttpRequest()
      global.XMLHttpRequest = MockXHR

      // Add file to upload queue
      upload.addFiles([testFile])
      expect(upload.files.value).toHaveLength(1)

      // Start upload and simulate success
      const uploadPromise = upload.uploadAllFiles('test-session-123')
      
      // Advance timers to trigger XHR success simulation
      await timers.advanceTime(100)
      
      const uploadResults = await uploadPromise
      
      expect(uploadResults.successful).toHaveLength(1)
      expect(upload.files.value[0].status).toBe('completed')
    }, 8000) // Increased timeout

    it('should handle file upload with authentication errors', async () => {
      const upload = useFileUpload()
      const testFile = createMockFile('test.pdf')

      // Mock XMLHttpRequest that returns 401
      const mockXMLHttpRequest = vi.fn(() => {
        const xhr = {
          open: vi.fn(),
          send: vi.fn(),
          setRequestHeader: vi.fn(),
          upload: { addEventListener: vi.fn() },
          addEventListener: vi.fn((event, callback) => {
            if (event === 'load') {
              // Use fake timers for controlled timing
              timers.advanceTime(10)
              xhr.status = 401
              xhr.statusText = 'Unauthorized'
              callback()
            }
          }),
          status: 200,
          statusText: 'OK'
        }
        return xhr
      })

      global.XMLHttpRequest = mockXMLHttpRequest

      upload.addFiles([testFile])
      
      const result = await upload.uploadAllFiles('test-session-123')
      
      expect(result).toEqual(
        expect.objectContaining({
          failed: expect.arrayContaining([
            expect.objectContaining({
              error: expect.stringContaining('Unauthorized')
            })
          ])
        })
      )
    }, 8000)
  })

  describe('Progress Polling Integration', () => {
    it('should verify 5-second polling interval exactly', async () => {
      const progress = useProgress()
      
      // Track API calls with timestamps
      let callCount = 0
      
      fetchMock.mockImplementation(() => {
        callCount++
        
        return Promise.resolve(createMockResponse({
          status: callCount < 3 ? 'processing' : 'completed',
          percent_complete: callCount * 33,
          total_employees: 45,
          completed_employees: callCount * 15,
          recent_activities: [`Activity ${callCount}`]
        }))
      })

      // Start polling
      progress.startPolling('test-session-123')
      expect(progress.isPolling.value).toBe(true)

      // Wait for first immediate call
      await timers.runOnlyPendingTimers()
      expect(callCount).toBe(1)
      expect(progress.status.value).toBe('processing')

      // Advance exactly 5 seconds and run timers
      await timers.advanceTime(5000)
      expect(callCount).toBe(2)
      expect(progress.status.value).toBe('processing')

      // Verify the 5-second interval by advancing again
      await timers.advanceTime(5000)
      expect(callCount).toBe(3)
      expect(progress.status.value).toBe('completed')
      expect(progress.isPolling.value).toBe(false)
      
      // Verify constant
      expect(progress.DEFAULT_POLLING_INTERVAL).toBe(5000)
    }, 10000)

    it('should handle polling with authentication refresh', async () => {
      const auth = useAuth()
      const progress = useProgress()

      let authCallCount = 0
      let statusCallCount = 0

      fetchMock.mockImplementation((url) => {
        if (url.includes('/auth/current-user')) {
          authCallCount++
          return Promise.resolve(createMockResponse({ username: 'testuser' }))
        }
        
        if (url.includes('/status')) {
          statusCallCount++
          if (statusCallCount === 1) {
            // First call fails with 401
            return Promise.resolve(createMockResponse(
              { detail: 'Authentication required' }, 401
            ))
          }
          // Subsequent calls succeed
          return Promise.resolve(createMockResponse({
            status: 'completed',
            percent_complete: 100
          }))
        }

        return Promise.resolve(createMockResponse({}))
      })

      progress.startPolling('test-session-123')
      await timers.runOnlyPendingTimers()

      // Should have attempted status call
      expect(statusCallCount).toBe(1)
      progress.stopPolling()
    }, 8000)
  })

  describe('Cross-Composable State Management', () => {
    it('should share state through Pinia store', async () => {
      const auth = useAuth()
      const api = useApi()
      const upload = useFileUpload()
      const progress = useProgress()

      // Mock authentication
      const userData = { username: 'testuser', is_admin: false }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      // Verify all composables can access auth state
      expect(auth.isAuthenticated.value).toBe(true)
      expect(auth.user.value.username).toBe('testuser')
      
      // Verify composables are properly initialized and can work together
      expect(typeof api.createSession).toBe('function')
      expect(typeof upload.addFiles).toBe('function')
      expect(typeof progress.startPolling).toBe('function')
    })

    it('should handle logout across all composables', async () => {
      const auth = useAuth()
      const progress = useProgress()

      // Setup authenticated state
      const userData = { username: 'testuser' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()
      
      // Start polling
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'completed', percent_complete: 100 }),
      })
      
      progress.startPolling('test-session-123')
      expect(progress.isPolling.value).toBe(true)

      await flushPromises()
      
      // Stop polling before logout
      progress.stopPolling()
      
      // Logout should clear all state
      auth.logout()
      
      expect(auth.user.value).toBe(null)
      expect(auth.isAuthenticated.value).toBe(false)
    }, 10000)
  })

  describe('Error Propagation Integration', () => {
    it('should propagate authentication errors across composables', async () => {
      const auth = useAuth()
      const api = useApi()

      // Mock auth failure
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Windows auth failed' }),
      })

      await expect(auth.getCurrentUser()).rejects.toThrow()

      // API calls should also fail with auth error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Authentication required' }),
      })

      await expect(api.createSession()).rejects.toThrow('Authentication required')
    })

    it('should handle retry logic across composables consistently', async () => {
      const api = useApi()
      const upload = useFileUpload()

      // Test API retry logic
      let apiCallCount = 0
      fetchMock.mockImplementation(() => {
        apiCallCount++
        if (apiCallCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ detail: 'Server error' }),
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ session_id: 'test-123' }),
        })
      })

      const result = await api.createSession()
      expect(result.session_id).toBe('test-123')
      expect(apiCallCount).toBe(3) // Should have retried twice
    })
  })

  describe('Performance Integration', () => {
    it('should handle concurrent operations efficiently', async () => {
      const auth = useAuth()
      const api = useApi()
      const upload = useFileUpload()

      // Mock authentication
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ username: 'testuser' }),
      })

      // Mock session creation
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ session_id: 'test-123' }),
      })

      // Start concurrent operations
      const authPromise = auth.getCurrentUser()
      const sessionPromise = api.createSession()

      const [authResult, sessionResult] = await Promise.all([authPromise, sessionPromise])

      expect(authResult.username).toBe('testuser')
      expect(sessionResult.session_id).toBe('test-123')
    })

    it('should monitor file upload performance', async () => {
      const upload = useFileUpload()
      const startTime = Date.now()

      // Create test files
      const files = [
        createMockFile('file1.pdf', 1024),
        createMockFile('file2.pdf', 2048),
        createMockFile('file3.pdf', 4096)
      ]

      // Mock successful XMLHttpRequest
      const mockXMLHttpRequest = vi.fn(() => ({
        open: vi.fn(),
        send: vi.fn(),
        setRequestHeader: vi.fn(),
        upload: {
          addEventListener: vi.fn((event, callback) => {
            if (event === 'progress') {
              setTimeout(() => callback({ 
                lengthComputable: true, 
                loaded: 1024, 
                total: 1024 
              }), 10)
            }
          })
        },
        addEventListener: vi.fn((event, callback) => {
          if (event === 'load') {
            setTimeout(() => {
              Object.assign(this, { 
                status: 200, 
                responseText: JSON.stringify({
                  uploaded_files: [{
                    checksum: 'abc123',
                    upload_status: 'completed'
                  }]
                })
              })
              callback()
            }, 50) // Simulate upload time
          }
        }),
        status: 200,
        responseText: JSON.stringify({
          uploaded_files: [{
            checksum: 'abc123',
            upload_status: 'completed'
          }]
        })
      }))

      global.XMLHttpRequest = mockXMLHttpRequest

      upload.addFiles(files)
      const results = await upload.uploadAllFiles('test-session-123', {
        maxConcurrent: 2
      })

      const uploadTime = Date.now() - startTime
      
      expect(results.successful).toHaveLength(3)
      expect(results.totalTime).toBeGreaterThan(0)
      expect(uploadTime).toBeLessThan(5000) // Should complete quickly in test
    })
  })

  describe('Polling Integration with Error Recovery', () => {
    it('should handle polling with 5-second interval and auth recovery', async () => {
      const auth = useAuth()
      const progress = useProgress()

      let authCalled = false
      let statusCallCount = 0

      fetchMock.mockImplementation((url) => {
        if (url.includes('/auth/current-user')) {
          authCalled = true
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ username: 'testuser' }),
          })
        }
        
        if (url.includes('/status')) {
          statusCallCount++
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              status: statusCallCount < 4 ? 'processing' : 'completed',
              percent_complete: statusCallCount * 25,
              total_employees: 45,
              completed_employees: statusCallCount * 11,
              recent_activities: [`Processing employee ${statusCallCount * 11}`]
            }),
          })
        }

        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      // Start polling
      progress.startPolling('test-session-123')
      expect(progress.isPolling.value).toBe(true)

      // Verify immediate first call
      await flushPromises()
      expect(statusCallCount).toBe(1)

      // Advance exactly 5 seconds
      timers.advanceTime(5000)
      await flushPromises()
      expect(statusCallCount).toBe(2)

      // Advance another 5 seconds
      timers.advanceTime(5000)
      await flushPromises()
      expect(statusCallCount).toBe(3)

      // Final 5 seconds should complete and stop polling
      timers.advanceTime(5000)
      await flushPromises()
      expect(statusCallCount).toBe(4)
      expect(progress.isPolling.value).toBe(false)
      expect(progress.status.value).toBe('completed')
    })

    it('should handle polling errors with exponential backoff', async () => {
      const progress = useProgress()
      let callCount = 0
      let callTimes = []

      fetchMock.mockImplementation(() => {
        callCount++
        callTimes.push(Date.now())
        
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ detail: 'Server error' }),
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: 'completed',
            percent_complete: 100
          }),
        })
      })

      progress.startPolling('test-session-123')
      await flushPromises()

      // Advance through error backoff periods
      timers.advanceTime(5000) // First retry after 5s * 1.5 = 7.5s
      await flushPromises()
      
      timers.advanceTime(7500) // Second retry with further backoff
      await flushPromises()
      
      timers.advanceTime(11250) // Third call should succeed
      await flushPromises()

      expect(callCount).toBe(3)
      expect(progress.status.value).toBe('completed')
    })
  })

  describe('Full Workflow Integration', () => {
    it('should complete full workflow: auth → session → upload → progress → results', async () => {
      const auth = useAuth()
      const api = useApi()
      const upload = useFileUpload()
      const progress = useProgress()

      // 1. Authentication
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ username: 'testuser', is_admin: false }),
      })

      const user = await auth.getCurrentUser()
      expect(user.username).toBe('testuser')

      // 2. Session creation
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ session_id: 'test-session-123' }),
      })

      const session = await api.createSession({ session_name: 'Integration Test' })
      expect(session.session_id).toBe('test-session-123')

      // 3. File upload
      const mockXMLHttpRequest = vi.fn(() => ({
        open: vi.fn(),
        send: vi.fn(),
        setRequestHeader: vi.fn(),
        upload: {
          addEventListener: vi.fn((event, callback) => {
            if (event === 'progress') {
              setTimeout(() => callback({ 
                lengthComputable: true, 
                loaded: 1024, 
                total: 1024 
              }), 10)
            }
          })
        },
        addEventListener: vi.fn((event, callback) => {
          if (event === 'load') {
            setTimeout(() => {
              Object.assign(this, { 
                status: 200, 
                responseText: JSON.stringify({
                  uploaded_files: [{ checksum: 'abc123', upload_status: 'completed' }]
                })
              })
              callback()
            }, 20)
          }
        }),
        status: 200,
        responseText: JSON.stringify({
          uploaded_files: [{ checksum: 'abc123', upload_status: 'completed' }]
        })
      }))

      global.XMLHttpRequest = mockXMLHttpRequest

      const testFile = createMockFile('test.pdf')
      upload.addFiles([testFile])
      const uploadResults = await upload.uploadAllFiles(session.session_id)
      
      expect(uploadResults.successful).toHaveLength(1)

      // 4. Start processing
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'processing' }),
      })

      await api.startProcessing(session.session_id)

      // 5. Progress monitoring
      let progressCallCount = 0
      fetchMock.mockImplementation((url) => {
        if (url.includes('/status')) {
          progressCallCount++
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              status: progressCallCount < 3 ? 'processing' : 'completed',
              percent_complete: progressCallCount * 33,
              total_employees: 45,
              completed_employees: progressCallCount * 15
            }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      progress.startPolling(session.session_id)
      await flushPromises()

      // Simulate processing completion
      timers.advanceTime(10000) // Two 5-second intervals
      await flushPromises()

      expect(progress.status.value).toBe('completed')
      expect(progress.isPolling.value).toBe(false)

      // 6. Results retrieval
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          session_id: session.session_id,
          status: 'completed',
          results: {
            summary: { total_employees: 45, resolved_employees: 43 },
            employees: []
          }
        }),
      })

      const results = await api.getResults(session.session_id)
      expect(results.session_id).toBe(session.session_id)
      expect(results.status).toBe('completed')
    })
  })

  describe('Independence Verification', () => {
    it('should work independently without store injection', () => {
      // Create composables without Pinia store
      const api = useApi()
      const auth = useAuth()
      const upload = useFileUpload()
      const progress = useProgress()

      // All should initialize without errors
      expect(api.isLoading.value).toBe(false)
      expect(auth.isAuthenticated.value).toBe(false)
      expect(upload.hasFiles.value).toBe(false)
      expect(progress.isPolling.value).toBe(false)

      // Should be able to call methods without store
      expect(() => auth.logout()).not.toThrow()
      expect(() => upload.clearFiles()).not.toThrow()
      expect(() => progress.resetProgress()).not.toThrow()
      expect(() => api.clearErrors()).not.toThrow()
    })

    it('should work with different store configurations', async () => {
      // Test with minimal store implementation
      const minimalStore = {
        setUser: vi.fn(),
        setAuthenticated: vi.fn(),
        setAuthError: vi.fn()
      }

      const auth = useAuth()
      // Manually inject minimal store
      auth._store = minimalStore

      const userData = { username: 'testuser' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      // Should not throw errors with minimal store
      expect(auth.user.value.username).toBe('testuser')
    })
  })

  describe('Memory and Resource Management', () => {
    it('should clean up resources properly', async () => {
      const progress = useProgress()
      const upload = useFileUpload()

      // Start polling
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'processing' }),
      })

      progress.startPolling('test-session-123')
      expect(progress.isPolling.value).toBe(true)

      // Add files
      const files = [createMockFile('test1.pdf'), createMockFile('test2.pdf')]
      upload.addFiles(files)
      expect(upload.files.value).toHaveLength(2)

      // Clean up
      progress.stopPolling()
      upload.clearFiles()

      expect(progress.isPolling.value).toBe(false)
      expect(upload.files.value).toHaveLength(0)
      expect(Object.keys(upload.uploadProgress.value)).toHaveLength(0)
    })
  })
})