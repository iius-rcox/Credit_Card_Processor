import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from './session.js'

describe('Session Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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

      store.createSession('error-test')
      store.addFile({ id: 1, name: 'file1.pdf' })
      store.setProcessingStatus('processing')

      // Simulate error
      store.setError('Network error')

      expect(store.hasError).toBe(true)
      expect(store.processingStatus).toBe('error')
      expect(store.isProcessing).toBe(false)
    })
  })
})
