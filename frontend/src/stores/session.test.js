import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from './session.js'
import { useApi } from '../composables/useApi.js'

// Mock the API composable
vi.mock('../composables/useApi')

describe('Session Store', () => {
  let store
  let mockApi

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Mock API composable
    mockApi = {
      createSession: vi.fn().mockResolvedValue({
        session_id: 'test-session-123',
        status: 'idle',
        created_at: new Date().toISOString(),
      }),
      getSession: vi.fn().mockResolvedValue({
        session_id: 'test-session-123',
        session_name: 'Test Session',
        status: 'idle',
        uploaded_files: [],
      }),
      request: vi.fn().mockResolvedValue({ success: true }),
    }
    
    useApi.mockReturnValue(mockApi)
    store = useSessionStore()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useSessionStore()

      expect(store.sessionId).toBe(null)
      expect(store.uploadedFiles).toEqual([])
      expect(store.processingStatus).toBe('idle')
      expect(store.results).toBe(null)
      expect(store.error).toBe(null)
    })

    it('should have correct computed properties for initial state', () => {
      const store = useSessionStore()

      expect(store.hasSession).toBe(false)
      expect(store.hasFiles).toBe(false)
      expect(store.isProcessing).toBe(false)
      expect(store.hasResults).toBe(false)
      expect(store.hasError).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should create a new session', () => {
      const store = useSessionStore()
      const sessionId = 'test-session-123'

      store.createSession(sessionId)

      expect(store.sessionId).toBe(sessionId)
      expect(store.hasSession).toBe(true)
      expect(store.uploadedFiles).toEqual([])
      expect(store.processingStatus).toBe('idle')
      expect(store.results).toBe(null)
      expect(store.error).toBe(null)
    })

    it('should clear session data', () => {
      const store = useSessionStore()

      // Set up some data first
      store.createSession('test-session')
      store.addFile({ id: 1, name: 'test.pdf' })
      store.setResults({ data: 'test' })

      store.clearSession()

      expect(store.sessionId).toBe(null)
      expect(store.uploadedFiles).toEqual([])
      expect(store.processingStatus).toBe('idle')
      expect(store.results).toBe(null)
      expect(store.error).toBe(null)
      expect(store.hasSession).toBe(false)
    })
  })

  describe('File Management', () => {
    it('should add files to the session', () => {
      const store = useSessionStore()
      const file1 = { id: 1, name: 'test1.pdf' }
      const file2 = { id: 2, name: 'test2.pdf' }

      store.addFile(file1)
      store.addFile(file2)

      expect(store.uploadedFiles).toEqual([file1, file2])
      expect(store.hasFiles).toBe(true)
    })

    it('should remove specific files', () => {
      const store = useSessionStore()
      const file1 = { id: 1, name: 'test1.pdf' }
      const file2 = { id: 2, name: 'test2.pdf' }

      store.addFile(file1)
      store.addFile(file2)
      store.removeFile(1)

      expect(store.uploadedFiles).toEqual([file2])
      expect(store.hasFiles).toBe(true)
    })

    it('should clear all files', () => {
      const store = useSessionStore()
      const file1 = { id: 1, name: 'test1.pdf' }
      const file2 = { id: 2, name: 'test2.pdf' }

      store.addFile(file1)
      store.addFile(file2)
      store.clearFiles()

      expect(store.uploadedFiles).toEqual([])
      expect(store.hasFiles).toBe(false)
    })
  })

  describe('Processing Status Management', () => {
    it('should update processing status', () => {
      const store = useSessionStore()

      store.setProcessingStatus('processing')

      expect(store.processingStatus).toBe('processing')
      expect(store.isProcessing).toBe(true)
    })

    it('should clear error when starting processing', () => {
      const store = useSessionStore()

      store.setError('Previous error')
      expect(store.hasError).toBe(true)

      store.setProcessingStatus('processing')

      expect(store.error).toBe(null)
      expect(store.hasError).toBe(false)
    })

    it('should reset processing state', () => {
      const store = useSessionStore()

      store.setProcessingStatus('completed')
      store.setResults({ data: 'test' })
      store.setError('Some error')

      store.resetProcessing()

      expect(store.processingStatus).toBe('idle')
      expect(store.results).toBe(null)
      expect(store.error).toBe(null)
    })
  })

  describe('Results Management', () => {
    it('should set results and update status', () => {
      const store = useSessionStore()
      const testResults = { transactions: [], summary: {} }

      store.setResults(testResults)

      expect(store.results).toEqual(testResults)
      expect(store.processingStatus).toBe('completed')
      expect(store.hasResults).toBe(true)
      expect(store.error).toBe(null)
    })
  })

  describe('Error Management', () => {
    it('should set error and update status', () => {
      const store = useSessionStore()
      const errorMessage = 'Processing failed'

      store.setError(errorMessage)

      expect(store.error).toBe(errorMessage)
      expect(store.processingStatus).toBe('error')
      expect(store.hasError).toBe(true)
    })
  })

  describe('Complex Workflows', () => {
    it('should handle complete processing workflow', () => {
      const store = useSessionStore()

      // Start session
      store.createSession('workflow-test')
      expect(store.hasSession).toBe(true)

      // Add files
      store.addFile({ id: 1, name: 'file1.pdf' })
      store.addFile({ id: 2, name: 'file2.pdf' })
      expect(store.hasFiles).toBe(true)

      // Start processing
      store.setProcessingStatus('processing')
      expect(store.isProcessing).toBe(true)

      // Complete with results
      const results = { transactions: [1, 2, 3] }
      store.setResults(results)
      expect(store.hasResults).toBe(true)
      expect(store.processingStatus).toBe('completed')
      expect(store.isProcessing).toBe(false)
    })

    it('should handle error workflow', () => {
      const store = useSessionStore()

      store.legacyCreateSession('error-test')
      store.addFile({ id: 1, name: 'file1.pdf' })
      store.setProcessingStatus('processing')

      // Simulate error
      store.legacySetError('Network error')

      expect(store.hasError).toBe(true)
      expect(store.processingStatus).toBe('error')
      expect(store.isProcessing).toBe(false)
    })
  })

  describe('Enhanced Session Creation - Error Investigation', () => {
    it('should create session with proper API integration', async () => {
      const sessionData = {
        session_name: 'Test Session',
        processing_options: {
          validation_enabled: true,
          auto_resolution_enabled: false,
          email_notifications: false,
        },
      }
      
      const sessionId = await store.createSession(sessionData)
      
      expect(mockApi.createSession).toHaveBeenCalledWith(sessionData)
      expect(sessionId).toBe('test-session-123')
      expect(store.sessionId).toBe('test-session-123')
      expect(store.currentSession).toMatchObject({
        session_id: 'test-session-123',
        session_name: 'Test Session',
      })
    })

    it('should reject empty session names', async () => {
      const sessionData = {
        session_name: '',
        processing_options: {},
      }
      
      await expect(store.createSession(sessionData)).rejects.toThrow('Session name is required')
      expect(mockApi.createSession).not.toHaveBeenCalled()
      expect(store.sessionError).toBeTruthy()
    })

    it('should reject whitespace-only session names', async () => {
      const sessionData = {
        session_name: '   \n\t  ',
        processing_options: {},
      }
      
      await expect(store.createSession(sessionData)).rejects.toThrow('Session name is required')
      expect(mockApi.createSession).not.toHaveBeenCalled()
    })

    it('should handle various API error responses', async () => {
      const errorTests = [
        {
          apiError: { status: 400, message: 'Bad Request' },
          expectedMessage: 'Invalid session data provided',
          expectedType: 'validation'
        },
        {
          apiError: { status: 401, message: 'Unauthorized' },
          expectedMessage: 'Authentication required to create session',
          expectedType: 'authentication'
        },
        {
          apiError: { status: 409, message: 'Conflict' },
          expectedMessage: 'A session with this name already exists',
          expectedType: 'conflict'
        },
        {
          apiError: { status: 500, message: 'Internal Server Error' },
          expectedMessage: 'Server error occurred while creating session',
          expectedType: 'server'
        },
        {
          apiError: { code: 'NETWORK_ERROR', message: 'fetch failed' },
          expectedMessage: 'Network error: unable to connect to server',
          expectedType: 'network'
        }
      ]

      for (const { apiError, expectedMessage, expectedType } of errorTests) {
        // Reset state
        store.sessionError = null
        
        const error = new Error(apiError.message)
        error.status = apiError.status
        error.code = apiError.code
        mockApi.createSession.mockRejectedValueOnce(error)
        
        const sessionData = {
          session_name: 'Test Session',
          processing_options: {},
        }
        
        await expect(store.createSession(sessionData)).rejects.toThrow(expectedMessage)
        
        expect(store.sessionError).toMatchObject({
          message: expectedMessage,
          type: expectedType
        })
      }
    })

    it('should handle malformed API response', async () => {
      // Mock API to return invalid response
      mockApi.createSession.mockResolvedValue({
        status: 'created',
        // Missing required session_id field
      })
      
      const sessionData = {
        session_name: 'Test Session',
        processing_options: {},
      }
      
      await expect(store.createSession(sessionData)).rejects.toThrow('Invalid response: missing session ID')
    })

    it('should reset session state on successful creation', async () => {
      // Set some existing state that should be reset
      store.uploadedFiles = [{ id: 'old-file', name: 'old.pdf' }]
      store.status = 'processing'
      store.progress = 50
      store.results = { old: 'data' }
      store.error = 'Previous error'
      
      const sessionData = {
        session_name: 'New Session',
        processing_options: {},
      }
      
      await store.createSession(sessionData)
      
      // All state should be reset
      expect(store.uploadedFiles).toEqual([])
      expect(store.status).toBe('idle')
      expect(store.progress).toBe(0)
      expect(store.results).toBe(null)
      expect(store.error).toBe(null)
      expect(store.processingStatus).toBe('idle') // Legacy compatibility
    })
  })

  describe('Session Switching and Management', () => {
    it('should switch sessions successfully', async () => {
      const sessionId = 'existing-session-456'
      
      await store.switchSession(sessionId)
      
      expect(mockApi.getSession).toHaveBeenCalledWith(sessionId)
      expect(store.sessionId).toBe(sessionId)
      expect(store.currentSession).toBeTruthy()
    })

    it('should handle session not found errors', async () => {
      const error = new Error('Session not found')
      error.status = 404
      mockApi.getSession.mockRejectedValue(error)
      
      await expect(store.switchSession('nonexistent')).rejects.toThrow('Session not found or has been deleted')
      
      expect(store.sessionError).toMatchObject({
        type: 'notfound'
      })
      
      // Session state should be reset on failure
      expect(store.sessionId).toBe(null)
      expect(store.currentSession).toBe(null)
    })

    it('should require session ID for switching', async () => {
      await expect(store.switchSession()).rejects.toThrow('Session ID is required')
      await expect(store.switchSession('')).rejects.toThrow('Session ID is required')
      await expect(store.switchSession(null)).rejects.toThrow('Session ID is required')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should categorize and handle different error types', () => {
      // Clear all errors
      store.clearErrors()
      expect(store.hasError).toBe(false)
      
      // Set different error types
      store.error = 'General error'
      store.authError = 'Auth error'
      store.sessionError = 'Session error'
      store.uploadErrors = { file1: 'Upload error' }
      
      expect(store.hasError).toBe(true)
      expect(store.allErrors).toHaveLength(4)
      
      // Clear specific error type
      store.clearError('session')
      expect(store.sessionError).toBe(null)
      expect(store.hasError).toBe(true) // Still has other errors
      
      // Clear all errors
      store.clearErrors()
      expect(store.hasError).toBe(false)
    })

    it('should maintain error state consistency', () => {
      store.setError('Test error')
      
      expect(store.error).toBe('Test error')
      expect(store.status).toBe('error')
      expect(store.processingStatus).toBe('error')
      expect(store.hasError).toBe(true)
    })
  })

  describe('Memory Management and Performance', () => {
    it('should properly cleanup resources on session clear', () => {
      // Set up complex state
      store.sessionId = 'test-session'
      store.currentSession = { session_id: 'test-session', session_name: 'Test' }
      store.sessions = [{ session_id: 'test-session' }]
      store.uploadedFiles = [{ id: 'file1' }]
      store.results = { large: 'data' }
      store.exportHistory = [{ id: 1, url: 'blob:test' }]
      
      store.clearSession()
      
      // Everything should be reset
      expect(store.sessionId).toBe(null)
      expect(store.currentSession).toBe(null)
      expect(store.sessions).toEqual([])
      expect(store.uploadedFiles).toEqual([])
      expect(store.results).toBe(null)
      expect(store.exportHistory).toEqual([])
    })

    it('should handle rapid concurrent operations', async () => {
      const promises = []
      
      // Attempt multiple concurrent session creations
      for (let i = 0; i < 5; i++) {
        mockApi.createSession.mockResolvedValueOnce({
          session_id: `concurrent-session-${i}`,
          status: 'idle',
          created_at: new Date().toISOString(),
        })
        
        const promise = store.createSession({
          session_name: `Concurrent Session ${i}`,
          processing_options: {},
        })
        promises.push(promise)
      }
      
      const results = await Promise.allSettled(promises)
      
      // All should resolve successfully
      results.forEach(result => {
        expect(result.status).toBe('fulfilled')
      })
      
      // Final state should be consistent
      expect(store.sessionId).toBeTruthy()
      expect(store.currentSession).toBeTruthy()
    })
  })
})
