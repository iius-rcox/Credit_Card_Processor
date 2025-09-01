import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useApi } from '../useApi.js'
import {
  flushPromises,
  setupFetchMock,
  mockApiResponses,
} from '../../test/utils.js'

describe('useApi', () => {
  let api
  let fetchMock

  beforeEach(() => {
    fetchMock = setupFetchMock()
    api = useApi()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(api.isLoading.value).toBe(false)
      expect(api.error.value).toBe(null)
    })
  })

  describe('Generic Request Method', () => {
    it('should make successful GET request', async () => {
      const responseData = { success: true, data: 'test' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      })

      const result = await api.request('/test-endpoint')

      expect(fetchMock).toHaveBeenCalledWith('/api/test-endpoint', {
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
        },
      })
      expect(result).toEqual(responseData)
    })

    it('should make successful POST request with data', async () => {
      const requestData = { name: 'test' }
      const responseData = { id: 1, name: 'test' }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      })

      const result = await api.request('/test-endpoint', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })

      expect(fetchMock).toHaveBeenCalledWith('/api/test-endpoint', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
        },
      })
      expect(result).toEqual(responseData)
    })

    it('should handle custom headers', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await api.request('/test', {
        headers: {
          'Custom-Header': 'custom-value',
          'Content-Type': 'text/plain', // Should override default
        },
      })

      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'text/plain', // Custom override
          'x-dev-user': 'testuser',
          'Custom-Header': 'custom-value',
        },
      })
    })

    it('should set loading state during request', async () => {
      let loadingDuringRequest = false

      fetchMock.mockImplementationOnce(() => {
        loadingDuringRequest = api.isLoading.value
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      })

      const requestPromise = api.request('/test')
      expect(api.isLoading.value).toBe(true)

      await requestPromise
      expect(loadingDuringRequest).toBe(true)
      expect(api.isLoading.value).toBe(false)
    })

    it('should clear error on new request', async () => {
      // Set initial error
      api.error.value = 'Previous error'

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await api.request('/test')

      expect(api.error.value).toBe(null)
    })

    it('should handle HTTP error responses', async () => {
      const errorData = { detail: 'Custom error message' }

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorData),
      })

      await expect(api.request('/test')).rejects.toThrow('Custom error message')
      expect(api.error.value).toBe('Custom error message')
    })

    it('should handle HTTP errors without JSON response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Not JSON')),
      })

      await expect(api.request('/test')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      )
      expect(api.error.value).toBe('HTTP 500: Internal Server Error')
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      fetchMock.mockRejectedValueOnce(networkError)

      await expect(api.request('/test')).rejects.toThrow('Network error')
      expect(api.error.value).toBe('Network error')
      expect(api.isLoading.value).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const sessionData = mockApiResponses.createSession()
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sessionData),
      })

      const result = await api.createSession()

      expect(fetchMock).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
        },
      })
      expect(result).toEqual(sessionData)
    })

    it('should get session info', async () => {
      const sessionInfo = {
        session_id: 'test-123',
        status: 'active',
        created_at: '2023-01-01T10:00:00Z',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sessionInfo),
      })

      const result = await api.getSession('test-123')

      expect(fetchMock).toHaveBeenCalledWith('/api/sessions/test-123', {
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
        },
      })
      expect(result).toEqual(sessionInfo)
    })

    it('should delete a session', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const result = await api.deleteSession('test-123')

      expect(fetchMock).toHaveBeenCalledWith('/api/sessions/test-123', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('File Upload', () => {
    it('should upload CAR file', async () => {
      const uploadResponse = mockApiResponses.uploadFile('car')
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(uploadResponse),
      })

      const formData = new FormData()
      formData.append('car_file', new File(['test'], 'car.pdf'))

      const result = await api.uploadCarFile('session-123', formData)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/upload/car',
        {
          method: 'POST',
          body: formData,
          headers: {
            'x-dev-user': 'testuser',
            // Note: Content-Type should be omitted for FormData to set boundary
          },
        }
      )
      expect(result).toEqual(uploadResponse)
    })

    it('should upload Receipt file', async () => {
      const uploadResponse = mockApiResponses.uploadFile('receipt')
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(uploadResponse),
      })

      const formData = new FormData()
      formData.append('receipt_file', new File(['test'], 'receipt.pdf'))

      const result = await api.uploadReceiptFile('session-123', formData)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/upload/receipt',
        {
          method: 'POST',
          body: formData,
          headers: {
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result).toEqual(uploadResponse)
    })

    it('should upload both files together', async () => {
      const uploadResponse = {
        car_file: mockApiResponses.uploadFile('car'),
        receipt_file: mockApiResponses.uploadFile('receipt'),
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(uploadResponse),
      })

      const formData = new FormData()
      formData.append('car_file', new File(['car'], 'car.pdf'))
      formData.append('receipt_file', new File(['receipt'], 'receipt.pdf'))

      const result = await api.uploadFiles('session-123', formData)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/upload',
        {
          method: 'POST',
          body: formData,
          headers: {
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result).toEqual(uploadResponse)
    })

    it('should handle file upload errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
        json: () => Promise.resolve({ detail: 'File size exceeds limit' }),
      })

      const formData = new FormData()
      formData.append('car_file', new File(['large file'], 'large.pdf'))

      await expect(api.uploadCarFile('session-123', formData)).rejects.toThrow(
        'File size exceeds limit'
      )
    })
  })

  describe('Processing Control', () => {
    it('should start processing', async () => {
      const processResponse = mockApiResponses.startProcessing()
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(processResponse),
      })

      const result = await api.startProcessing('session-123')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/process',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result).toEqual(processResponse)
    })

    it('should pause processing', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'paused' }),
      })

      const result = await api.pauseProcessing('session-123')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/pause',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result.status).toBe('paused')
    })

    it('should resume processing', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'processing' }),
      })

      const result = await api.resumeProcessing('session-123')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/resume',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result.status).toBe('processing')
    })

    it('should cancel processing', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'cancelled' }),
      })

      const result = await api.cancelProcessing('session-123')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/cancel',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result.status).toBe('cancelled')
    })
  })

  describe('Progress Monitoring', () => {
    it('should get processing progress', async () => {
      const progressData = mockApiResponses.getProgress(0.7)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(progressData),
      })

      const result = await api.getProgress('session-123')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/progress',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result).toEqual(progressData)
      expect(result.progress).toBe(0.7)
    })

    it('should handle progress polling', async () => {
      const progressUpdates = [
        mockApiResponses.getProgress(0.2),
        mockApiResponses.getProgress(0.5),
        mockApiResponses.getProgress(0.8),
        { ...mockApiResponses.getProgress(1.0), status: 'completed' },
      ]

      progressUpdates.forEach((progress, index) => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(progress),
        })
      })

      const results = []
      for (let i = 0; i < 4; i++) {
        const progress = await api.getProgress('session-123')
        results.push(progress)
      }

      expect(results[0].progress).toBe(0.2)
      expect(results[1].progress).toBe(0.5)
      expect(results[2].progress).toBe(0.8)
      expect(results[3].progress).toBe(1.0)
      expect(results[3].status).toBe('completed')
    })
  })

  describe('Results Management', () => {
    it('should get processing results', async () => {
      const resultsData = mockApiResponses.getResults()
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(resultsData),
      })

      const result = await api.getResults('session-123')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/results',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result).toEqual(resultsData)
    })

    it('should resolve employee issues', async () => {
      const resolutionData = {
        employee_id: 'EMP001',
        resolution_type: 'approved',
        notes: 'Expense approved after review',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, employee_id: 'EMP001' }),
      })

      const result = await api.resolveEmployeeIssue(
        'session-123',
        'EMP001',
        resolutionData
      )

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/employees/EMP001/resolve',
        {
          method: 'POST',
          body: JSON.stringify(resolutionData),
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result.success).toBe(true)
    })

    it('should resolve multiple employees in bulk', async () => {
      const bulkResolutionData = {
        employee_ids: ['EMP001', 'EMP002'],
        resolution_type: 'approved',
        notes: 'Bulk approval',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ resolved_count: 2 }),
      })

      const result = await api.bulkResolveEmployees(
        'session-123',
        bulkResolutionData
      )

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/employees/resolve-bulk',
        {
          method: 'POST',
          body: JSON.stringify(bulkResolutionData),
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result.resolved_count).toBe(2)
    })
  })

  describe('Export Management', () => {
    it('should start export', async () => {
      const exportData = mockApiResponses.exportData('pvault')
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(exportData),
      })

      const exportParams = { type: 'pvault', include_resolved: true }
      const result = await api.startExport('session-123', exportParams)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/export',
        {
          method: 'POST',
          body: JSON.stringify(exportParams),
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result).toEqual(exportData)
    })

    it('should get export status', async () => {
      const exportStatus = mockApiResponses.getExportStatus('processing')
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(exportStatus),
      })

      const result = await api.getExportStatus('export-123')

      expect(fetchMock).toHaveBeenCalledWith('/api/exports/export-123', {
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user': 'testuser',
        },
      })
      expect(result).toEqual(exportStatus)
    })

    it('should download export file', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' })
      fetchMock.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      const result = await api.downloadExport('export-123')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/exports/export-123/download',
        {
          headers: {
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('text/csv')
    })

    it('should get export history', async () => {
      const exportHistory = [
        { id: 'export-1', type: 'pvault', created_at: '2023-01-01T10:00:00Z' },
        {
          id: 'export-2',
          type: 'followup',
          created_at: '2023-01-01T11:00:00Z',
        },
      ]

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(exportHistory),
      })

      const result = await api.getExportHistory('session-123')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-123/exports',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user': 'testuser',
          },
        }
      )
      expect(result).toEqual(exportHistory)
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should handle malformed JSON responses', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(api.request('/test')).rejects.toThrow(
        'HTTP 400: Bad Request'
      )
    })

    it('should handle empty error responses', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      })

      await expect(api.request('/test')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      )
    })

    it('should handle timeout scenarios', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 100)
      })

      fetchMock.mockImplementationOnce(() => timeoutPromise)

      await expect(api.request('/test')).rejects.toThrow('Request timeout')
      expect(api.error.value).toBe('Request timeout')
    })

    it('should preserve error context across multiple failures', async () => {
      // First failure
      fetchMock.mockRejectedValueOnce(new Error('First error'))
      await expect(api.request('/test1')).rejects.toThrow('First error')
      expect(api.error.value).toBe('First error')

      // Second failure should replace error
      fetchMock.mockRejectedValueOnce(new Error('Second error'))
      await expect(api.request('/test2')).rejects.toThrow('Second error')
      expect(api.error.value).toBe('Second error')

      // Successful request should clear error
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      await api.request('/test3')
      expect(api.error.value).toBe(null)
    })
  })

  describe('Request Concurrency', () => {
    it('should handle concurrent requests correctly', async () => {
      const responses = [
        { data: 'response1' },
        { data: 'response2' },
        { data: 'response3' },
      ]

      responses.forEach(response => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(response),
        })
      })

      const promises = [
        api.request('/test1'),
        api.request('/test2'),
        api.request('/test3'),
      ]

      const results = await Promise.all(promises)

      expect(results).toEqual(responses)
      expect(api.isLoading.value).toBe(false) // Should be false after all complete
    })

    it('should handle mixed success/failure in concurrent requests', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        })

      const results = await Promise.allSettled([
        api.request('/success1'),
        api.request('/failure'),
        api.request('/success2'),
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
      expect(results[2].status).toBe('fulfilled')

      // Error state should reflect the last error
      expect(api.error.value).toBe('Request failed')
    })
  })
})
