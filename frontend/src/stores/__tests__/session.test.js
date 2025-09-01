import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '../session.js'

describe('Session Store', () => {
  let sessionStore
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(sessionStore.sessionId).toBe(null)
      expect(sessionStore.uploadedFiles).toEqual([])
      expect(sessionStore.processingStatus).toBe('idle')
      expect(sessionStore.results).toBe(null)
      expect(sessionStore.error).toBe(null)
      expect(sessionStore.exportStatus).toEqual({
        pvault: { status: 'idle', progress: 0, error: null },
        followup: { status: 'idle', progress: 0, error: null },
        issues: { status: 'idle', progress: 0, error: null },
      })
      expect(sessionStore.exportHistory).toEqual([])
    })

    it('should have correct computed properties for initial state', () => {
      expect(sessionStore.hasSession).toBe(false)
      expect(sessionStore.hasFiles).toBe(false)
      expect(sessionStore.isProcessing).toBe(false)
      expect(sessionStore.hasResults).toBe(false)
      expect(sessionStore.hasError).toBe(false)
      expect(sessionStore.canExport).toBe(false)
      expect(sessionStore.hasActiveExports).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should create a new session', () => {
      const sessionId = 'test-session-123'

      sessionStore.createSession(sessionId)

      expect(sessionStore.sessionId).toBe(sessionId)
      expect(sessionStore.hasSession).toBe(true)
      expect(sessionStore.uploadedFiles).toEqual([])
      expect(sessionStore.processingStatus).toBe('idle')
      expect(sessionStore.results).toBe(null)
      expect(sessionStore.error).toBe(null)
    })

    it('should clear session data', () => {
      // Set up some data first
      sessionStore.createSession('test-session')
      sessionStore.addFile({ id: 1, name: 'test.pdf' })
      sessionStore.setResults({ data: 'test' })
      sessionStore.setError('test error')
      sessionStore.setExportStatus('pvault', {
        status: 'completed',
        progress: 100,
      })

      sessionStore.clearSession()

      expect(sessionStore.sessionId).toBe(null)
      expect(sessionStore.uploadedFiles).toEqual([])
      expect(sessionStore.processingStatus).toBe('idle')
      expect(sessionStore.results).toBe(null)
      expect(sessionStore.error).toBe(null)
      expect(sessionStore.hasSession).toBe(false)
      expect(sessionStore.exportStatus).toEqual({
        pvault: { status: 'idle', progress: 0, error: null },
        followup: { status: 'idle', progress: 0, error: null },
        issues: { status: 'idle', progress: 0, error: null },
      })
    })

    it('should handle session restoration', () => {
      const sessionData = {
        sessionId: 'restored-session',
        files: [{ id: 1, name: 'restored.pdf' }],
        status: 'completed',
        results: { summary: 'restored results' },
      }

      sessionStore.restoreSession(sessionData)

      expect(sessionStore.sessionId).toBe(sessionData.sessionId)
      expect(sessionStore.uploadedFiles).toEqual(sessionData.files)
      expect(sessionStore.processingStatus).toBe(sessionData.status)
      expect(sessionStore.results).toEqual(sessionData.results)
    })

    it('should validate session data before restoration', () => {
      const invalidSessionData = {
        sessionId: null, // Invalid
        files: 'not an array', // Invalid
      }

      expect(() => sessionStore.restoreSession(invalidSessionData)).toThrow()
    })
  })

  describe('File Management', () => {
    beforeEach(() => {
      sessionStore.createSession('test-session')
    })

    it('should add files to the session', () => {
      const file1 = { id: 1, name: 'test1.pdf', size: 1024 }
      const file2 = { id: 2, name: 'test2.pdf', size: 2048 }

      sessionStore.addFile(file1)
      sessionStore.addFile(file2)

      expect(sessionStore.uploadedFiles).toEqual([file1, file2])
      expect(sessionStore.hasFiles).toBe(true)
    })

    it('should prevent duplicate files by ID', () => {
      const file1 = { id: 1, name: 'test1.pdf' }
      const file1Duplicate = { id: 1, name: 'test1_duplicate.pdf' }

      sessionStore.addFile(file1)
      sessionStore.addFile(file1Duplicate)

      expect(sessionStore.uploadedFiles).toHaveLength(1)
      expect(sessionStore.uploadedFiles[0]).toEqual(file1) // Original file preserved
    })

    it('should add file metadata when adding files', () => {
      const file = { id: 1, name: 'test.pdf' }

      sessionStore.addFile(file)

      const addedFile = sessionStore.uploadedFiles[0]
      expect(addedFile).toHaveProperty('addedAt')
      expect(addedFile.addedAt).toBeInstanceOf(Date)
    })

    it('should remove specific files', () => {
      const file1 = { id: 1, name: 'test1.pdf' }
      const file2 = { id: 2, name: 'test2.pdf' }

      sessionStore.addFile(file1)
      sessionStore.addFile(file2)
      sessionStore.removeFile(1)

      expect(sessionStore.uploadedFiles).toEqual([
        expect.objectContaining(file2),
      ])
      expect(sessionStore.hasFiles).toBe(true)
    })

    it('should handle removing non-existent files gracefully', () => {
      const file1 = { id: 1, name: 'test1.pdf' }
      sessionStore.addFile(file1)

      // This should not throw
      sessionStore.removeFile(999)

      expect(sessionStore.uploadedFiles).toHaveLength(1)
    })

    it('should clear all files', () => {
      const file1 = { id: 1, name: 'test1.pdf' }
      const file2 = { id: 2, name: 'test2.pdf' }

      sessionStore.addFile(file1)
      sessionStore.addFile(file2)
      sessionStore.clearFiles()

      expect(sessionStore.uploadedFiles).toEqual([])
      expect(sessionStore.hasFiles).toBe(false)
    })

    it('should update file metadata', () => {
      const file = { id: 1, name: 'test.pdf' }
      sessionStore.addFile(file)

      const updatedMetadata = { uploadProgress: 50, status: 'uploading' }
      sessionStore.updateFileMetadata(1, updatedMetadata)

      const updatedFile = sessionStore.uploadedFiles[0]
      expect(updatedFile.uploadProgress).toBe(50)
      expect(updatedFile.status).toBe('uploading')
    })

    it('should get file by ID', () => {
      const file = { id: 1, name: 'test.pdf' }
      sessionStore.addFile(file)

      const foundFile = sessionStore.getFileById(1)
      expect(foundFile).toMatchObject(file)

      const notFoundFile = sessionStore.getFileById(999)
      expect(notFoundFile).toBeUndefined()
    })
  })

  describe('Processing Status Management', () => {
    beforeEach(() => {
      sessionStore.createSession('test-session')
    })

    it('should update processing status', () => {
      sessionStore.setProcessingStatus('processing')

      expect(sessionStore.processingStatus).toBe('processing')
      expect(sessionStore.isProcessing).toBe(true)
    })

    it('should clear error when starting processing', () => {
      sessionStore.setError('Previous error')
      expect(sessionStore.hasError).toBe(true)

      sessionStore.setProcessingStatus('processing')

      expect(sessionStore.error).toBe(null)
      expect(sessionStore.hasError).toBe(false)
    })

    it('should validate processing status values', () => {
      const validStatuses = [
        'idle',
        'uploading',
        'processing',
        'completed',
        'error',
      ]

      validStatuses.forEach(status => {
        expect(() => sessionStore.setProcessingStatus(status)).not.toThrow()
        expect(sessionStore.processingStatus).toBe(status)
      })

      expect(() => sessionStore.setProcessingStatus('invalid')).toThrow()
    })

    it('should track processing timestamps', () => {
      const startTime = new Date()

      sessionStore.setProcessingStatus('processing')
      expect(sessionStore.processingStartTime).toBeInstanceOf(Date)
      expect(sessionStore.processingStartTime.getTime()).toBeGreaterThanOrEqual(
        startTime.getTime()
      )

      vi.advanceTimersByTime(5000) // 5 seconds

      sessionStore.setProcessingStatus('completed')
      expect(sessionStore.processingEndTime).toBeInstanceOf(Date)
      expect(sessionStore.processingDuration).toBeGreaterThan(4000) // At least 4 seconds
    })

    it('should reset processing state', () => {
      sessionStore.setProcessingStatus('completed')
      sessionStore.setResults({ data: 'test' })
      sessionStore.setError('Some error')

      sessionStore.resetProcessing()

      expect(sessionStore.processingStatus).toBe('idle')
      expect(sessionStore.results).toBe(null)
      expect(sessionStore.error).toBe(null)
      expect(sessionStore.processingStartTime).toBe(null)
      expect(sessionStore.processingEndTime).toBe(null)
    })
  })

  describe('Results Management', () => {
    beforeEach(() => {
      sessionStore.createSession('test-session')
    })

    it('should set results and update status', () => {
      const testResults = {
        transactions: [{ id: 1, amount: 100 }],
        summary: { total: 100, count: 1 },
      }

      sessionStore.setResults(testResults)

      expect(sessionStore.results).toEqual(testResults)
      expect(sessionStore.processingStatus).toBe('completed')
      expect(sessionStore.hasResults).toBe(true)
      expect(sessionStore.error).toBe(null)
    })

    it('should validate results structure', () => {
      const invalidResults = 'not an object'

      expect(() => sessionStore.setResults(invalidResults)).toThrow()
    })

    it('should update specific result properties', () => {
      const initialResults = {
        employees: [{ id: 1, name: 'John' }],
        summary: { total: 1 },
      }

      sessionStore.setResults(initialResults)

      const updatedEmployee = {
        id: 1,
        name: 'John Updated',
        status: 'resolved',
      }
      sessionStore.updateEmployeeInResults(updatedEmployee)

      expect(sessionStore.results.employees[0]).toEqual(updatedEmployee)
    })

    it('should handle partial results updates', () => {
      const initialResults = {
        summary: { total: 100, processed: 50 },
      }

      sessionStore.setResults(initialResults)
      sessionStore.updateResultsPartial({ summary: { processed: 75 } })

      expect(sessionStore.results.summary.total).toBe(100) // Preserved
      expect(sessionStore.results.summary.processed).toBe(75) // Updated
    })
  })

  describe('Error Management', () => {
    it('should set error and update status', () => {
      const errorMessage = 'Processing failed'

      sessionStore.setError(errorMessage)

      expect(sessionStore.error).toBe(errorMessage)
      expect(sessionStore.processingStatus).toBe('error')
      expect(sessionStore.hasError).toBe(true)
    })

    it('should clear error', () => {
      sessionStore.setError('Some error')
      expect(sessionStore.hasError).toBe(true)

      sessionStore.clearError()

      expect(sessionStore.error).toBe(null)
      expect(sessionStore.hasError).toBe(false)
    })

    it('should handle error objects', () => {
      const errorObj = new Error('Test error')

      sessionStore.setError(errorObj)

      expect(sessionStore.error).toBe('Test error')
    })

    it('should stack multiple errors', () => {
      sessionStore.setError('First error')
      sessionStore.addError('Second error')

      expect(sessionStore.error).toContain('First error')
      expect(sessionStore.error).toContain('Second error')
    })
  })

  describe('Export Status Management', () => {
    beforeEach(() => {
      sessionStore.createSession('test-session')
      sessionStore.setResults({ summary: { total: 100 } })
      sessionStore.setProcessingStatus('completed')
    })

    it('should update export status', () => {
      const exportUpdate = {
        status: 'exporting',
        progress: 50,
        exportId: 'export-123',
      }

      sessionStore.setExportStatus('pvault', exportUpdate)

      expect(sessionStore.exportStatus.pvault).toEqual({
        status: 'exporting',
        progress: 50,
        error: null,
        exportId: 'export-123',
      })
      expect(sessionStore.hasActiveExports).toBe(true)
    })

    it('should handle export completion', () => {
      sessionStore.setExportStatus('pvault', {
        status: 'exporting',
        progress: 0,
      })

      const completedExport = {
        status: 'completed',
        progress: 100,
        downloadUrl: '/api/exports/123/download',
        filename: 'export.csv',
      }

      sessionStore.completeExport('pvault', completedExport)

      expect(sessionStore.exportStatus.pvault.status).toBe('completed')
      expect(sessionStore.exportStatus.pvault.progress).toBe(100)
      expect(sessionStore.hasActiveExports).toBe(false)
    })

    it('should handle export errors', () => {
      const exportError = 'Export service unavailable'

      sessionStore.setExportError('pvault', exportError)

      expect(sessionStore.exportStatus.pvault.status).toBe('error')
      expect(sessionStore.exportStatus.pvault.error).toBe(exportError)
    })

    it('should reset export status', () => {
      sessionStore.setExportStatus('pvault', {
        status: 'exporting',
        progress: 50,
      })

      sessionStore.resetExportStatus('pvault')

      expect(sessionStore.exportStatus.pvault).toEqual({
        status: 'idle',
        progress: 0,
        error: null,
      })
    })

    it('should reset all export statuses', () => {
      sessionStore.setExportStatus('pvault', {
        status: 'exporting',
        progress: 50,
      })
      sessionStore.setExportStatus('followup', {
        status: 'completed',
        progress: 100,
      })

      sessionStore.resetAllExports()

      Object.values(sessionStore.exportStatus).forEach(status => {
        expect(status).toEqual({
          status: 'idle',
          progress: 0,
          error: null,
        })
      })
    })

    it('should check export availability correctly', () => {
      // Should be available when results exist and processing completed
      expect(sessionStore.canExport).toBe(true)

      // Should not be available during processing
      sessionStore.setProcessingStatus('processing')
      expect(sessionStore.canExport).toBe(false)

      // Should not be available with errors
      sessionStore.setProcessingStatus('completed')
      sessionStore.setError('Some error')
      expect(sessionStore.canExport).toBe(false)

      // Should not be available without results
      sessionStore.clearError()
      sessionStore.setResults(null)
      expect(sessionStore.canExport).toBe(false)
    })
  })

  describe('Export History Management', () => {
    it('should add export to history', () => {
      const exportRecord = {
        id: 'export-123',
        type: 'pvault',
        createdAt: new Date(),
        status: 'completed',
        downloadUrl: '/api/exports/123/download',
        fileSize: 1024,
      }

      sessionStore.addToExportHistory(exportRecord)

      expect(sessionStore.exportHistory).toContain(exportRecord)
    })

    it('should limit export history size', () => {
      // Add many exports
      for (let i = 0; i < 25; i++) {
        sessionStore.addToExportHistory({
          id: `export-${i}`,
          type: 'pvault',
          createdAt: new Date(),
        })
      }

      // Should keep only recent exports (e.g., last 20)
      expect(sessionStore.exportHistory.length).toBeLessThanOrEqual(20)
    })

    it('should get export history by type', () => {
      sessionStore.addToExportHistory({ id: '1', type: 'pvault' })
      sessionStore.addToExportHistory({ id: '2', type: 'followup' })
      sessionStore.addToExportHistory({ id: '3', type: 'pvault' })

      const pvaultHistory = sessionStore.getExportHistoryByType('pvault')
      expect(pvaultHistory).toHaveLength(2)
      expect(pvaultHistory.every(exp => exp.type === 'pvault')).toBe(true)
    })

    it('should clear export history', () => {
      sessionStore.addToExportHistory({ id: '1', type: 'pvault' })
      sessionStore.addToExportHistory({ id: '2', type: 'followup' })

      sessionStore.clearExportHistory()

      expect(sessionStore.exportHistory).toEqual([])
    })
  })

  describe('Complex Workflows', () => {
    it('should handle complete processing workflow', () => {
      // Start session
      sessionStore.createSession('workflow-test')
      expect(sessionStore.hasSession).toBe(true)

      // Add files
      sessionStore.addFile({ id: 1, name: 'car.pdf' })
      sessionStore.addFile({ id: 2, name: 'receipt.pdf' })
      expect(sessionStore.hasFiles).toBe(true)

      // Start processing
      sessionStore.setProcessingStatus('processing')
      expect(sessionStore.isProcessing).toBe(true)

      // Complete with results
      const results = {
        employees: [{ id: 1, name: 'John', status: 'VALID' }],
        summary: { total: 1, valid: 1 },
      }
      sessionStore.setResults(results)
      expect(sessionStore.hasResults).toBe(true)
      expect(sessionStore.processingStatus).toBe('completed')
      expect(sessionStore.isProcessing).toBe(false)
      expect(sessionStore.canExport).toBe(true)

      // Start export
      sessionStore.setExportStatus('pvault', {
        status: 'exporting',
        progress: 0,
      })
      expect(sessionStore.hasActiveExports).toBe(true)

      // Complete export
      sessionStore.completeExport('pvault', {
        status: 'completed',
        progress: 100,
        downloadUrl: '/download/123',
      })
      expect(sessionStore.hasActiveExports).toBe(false)
    })

    it('should handle error workflow with recovery', () => {
      sessionStore.createSession('error-test')
      sessionStore.addFile({ id: 1, name: 'file1.pdf' })
      sessionStore.setProcessingStatus('processing')

      // Simulate error
      sessionStore.setError('Network error')

      expect(sessionStore.hasError).toBe(true)
      expect(sessionStore.processingStatus).toBe('error')
      expect(sessionStore.isProcessing).toBe(false)
      expect(sessionStore.canExport).toBe(false)

      // Recover from error
      sessionStore.clearError()
      sessionStore.resetProcessing()

      expect(sessionStore.hasError).toBe(false)
      expect(sessionStore.processingStatus).toBe('idle')
    })

    it('should handle session persistence workflow', () => {
      // Create and populate session
      sessionStore.createSession('persistence-test')
      sessionStore.addFile({ id: 1, name: 'test.pdf' })
      sessionStore.setProcessingStatus('processing')

      // Save session state
      const savedState = sessionStore.serializeSession()
      expect(savedState).toMatchObject({
        sessionId: 'persistence-test',
        uploadedFiles: [expect.objectContaining({ id: 1, name: 'test.pdf' })],
        processingStatus: 'processing',
      })

      // Clear session
      sessionStore.clearSession()
      expect(sessionStore.hasSession).toBe(false)

      // Restore session
      sessionStore.restoreSession(savedState)
      expect(sessionStore.sessionId).toBe('persistence-test')
      expect(sessionStore.hasFiles).toBe(true)
      expect(sessionStore.processingStatus).toBe('processing')
    })
  })

  describe('Computed Property Reactivity', () => {
    it('should update computed properties reactively', () => {
      expect(sessionStore.hasSession).toBe(false)

      sessionStore.createSession('test')
      expect(sessionStore.hasSession).toBe(true)

      expect(sessionStore.hasFiles).toBe(false)
      sessionStore.addFile({ id: 1, name: 'test.pdf' })
      expect(sessionStore.hasFiles).toBe(true)

      expect(sessionStore.canExport).toBe(false)
      sessionStore.setResults({ summary: {} })
      sessionStore.setProcessingStatus('completed')
      expect(sessionStore.canExport).toBe(true)
    })

    it('should handle complex computed property dependencies', () => {
      // canExport depends on hasResults, processingStatus, and hasError
      sessionStore.setResults({ summary: {} })
      expect(sessionStore.canExport).toBe(false) // Not completed

      sessionStore.setProcessingStatus('completed')
      expect(sessionStore.canExport).toBe(true) // All conditions met

      sessionStore.setError('Error occurred')
      expect(sessionStore.canExport).toBe(false) // Error blocks export

      sessionStore.clearError()
      expect(sessionStore.canExport).toBe(true) // Back to exportable state
    })
  })

  describe('Data Validation', () => {
    it('should validate file objects when adding', () => {
      expect(() => sessionStore.addFile(null)).toThrow()
      expect(() => sessionStore.addFile('not an object')).toThrow()
      expect(() => sessionStore.addFile({})).toThrow() // Missing required fields

      // Valid file should not throw
      expect(() =>
        sessionStore.addFile({ id: 1, name: 'test.pdf' })
      ).not.toThrow()
    })

    it('should sanitize string inputs', () => {
      const maliciousString = '<script>alert("xss")</script>Test'

      sessionStore.setError(maliciousString)
      expect(sessionStore.error).not.toContain('<script>')
      expect(sessionStore.error).toContain('Test')
    })

    it('should handle large data gracefully', () => {
      const largeResults = {
        employees: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Employee ${i}`,
          amount: Math.random() * 1000,
        })),
        summary: { total: 10000 },
      }

      expect(() => sessionStore.setResults(largeResults)).not.toThrow()
      expect(sessionStore.results.employees).toHaveLength(10000)
    })
  })
})
