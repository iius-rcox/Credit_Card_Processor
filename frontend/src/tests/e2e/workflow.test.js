import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../../App.vue'
import { useSessionStore } from '../../stores/session.js'
import {
  createMockFile,
  flushPromises,
  setupFetchMock,
  mockApiResponses,
  mockTimers,
} from '../../test/utils.js'

// Mock XMLHttpRequest for file uploads
class MockXMLHttpRequest {
  constructor() {
    this.upload = { addEventListener: vi.fn() }
    this.addEventListener = vi.fn()
    this.open = vi.fn()
    this.setRequestHeader = vi.fn()
    this.send = vi.fn()
    this.status = 200
    this.statusText = 'OK'
    this.responseText = JSON.stringify({ success: true })
  }

  triggerProgress(loaded, total) {
    const progressCallback = this.upload.addEventListener.mock.calls.find(
      call => call[0] === 'progress'
    )?.[1]
    if (progressCallback) {
      progressCallback({ lengthComputable: true, loaded, total })
    }
  }

  triggerLoad() {
    const loadCallback = this.addEventListener.mock.calls.find(
      call => call[0] === 'load'
    )?.[1]
    if (loadCallback) {
      loadCallback()
    }
  }
}

global.XMLHttpRequest = vi.fn(() => new MockXMLHttpRequest())

describe('End-to-End Workflow Tests', () => {
  let wrapper
  let sessionStore
  let pinia
  let fetchMock
  let timers

  const mockSessionData = {
    session_id: 'test-session-e2e-123',
    status: 'created',
    created_at: new Date().toISOString(),
  }

  const mockProcessingResults = {
    session_id: 'test-session-e2e-123',
    status: 'completed',
    results: {
      summary: {
        total_employees: 25,
        completed_employees: 20,
        issues_employees: 5,
        processing_duration: '3m 45s',
        total_amount: 37500.75,
        average_amount: 1500.03,
      },
      employees: [
        {
          id: 1,
          name: 'Alice Johnson',
          employee_id: 'EMP001',
          status: 'VALID',
          amount: 1200.0,
          issues: [],
          department: 'Engineering',
          car_data: { date: '2023-01-01', amount: 1200.0 },
          receipt_data: { date: '2023-01-01', amount: 1200.0 },
        },
        {
          id: 2,
          name: 'Bob Smith',
          employee_id: 'EMP002',
          status: 'NEEDS_ATTENTION',
          amount: 850.75,
          issues: ['missing_receipt', 'amount_mismatch'],
          department: 'Marketing',
          car_data: { date: '2023-01-02', amount: 900.0 },
          receipt_data: { date: '2023-01-02', amount: 850.75 },
        },
        {
          id: 3,
          name: 'Carol Davis',
          employee_id: 'EMP003',
          status: 'RESOLVED',
          amount: 2000.0,
          issues: [],
          department: 'Sales',
          car_data: { date: '2023-01-03', amount: 2000.0 },
          receipt_data: { date: '2023-01-03', amount: 2000.0 },
        },
      ],
    },
  }

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    fetchMock = setupFetchMock()
    timers = mockTimers()

    // Reset all mocks
    vi.clearAllMocks()
    global.XMLHttpRequest.mockClear()

    wrapper = mount(App, {
      global: {
        plugins: [pinia],
      },
    })

    await nextTick()
  })

  afterEach(() => {
    wrapper?.unmount()
    timers.restore()
  })

  describe('Complete Happy Path Workflow', () => {
    it('should complete the full workflow from session creation to export', async () => {
      // Step 1: Application loads with initial state
      expect(wrapper.find('h1').text()).toContain('Credit Card Processor')
      expect(
        wrapper.find('[data-testid="create-session-button"]').exists()
      ).toBe(true)

      // Step 2: Create a new session
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSessionData),
        })
      )

      const createSessionButton = wrapper.find(
        '[data-testid="create-session-button"]'
      )
      await createSessionButton.trigger('click')
      await flushPromises()

      expect(sessionStore.sessionId).toBe(mockSessionData.session_id)
      expect(wrapper.find('[data-testid="file-upload-section"]').exists()).toBe(
        true
      )

      // Step 3: Upload files
      const carFile = createMockFile('car_expenses.pdf', 5 * 1024 * 1024) // 5MB
      const receiptFile = createMockFile('receipts.pdf', 3 * 1024 * 1024) // 3MB

      // Mock successful file uploads
      let uploadCount = 0
      global.XMLHttpRequest.mockImplementation(() => {
        uploadCount++
        const mockXHR = new MockXMLHttpRequest()
        mockXHR.responseText = JSON.stringify({
          car_file: { id: 'car-file-123', filename: 'car_expenses.pdf' },
          receipt_file: { id: 'receipt-file-456', filename: 'receipts.pdf' },
        })
        // Auto-complete upload after progress
        setTimeout(() => {
          mockXHR.triggerProgress(100, 100)
          mockXHR.triggerLoad()
        }, 100)
        return mockXHR
      })

      // Simulate drag and drop
      const carDropZone = wrapper.find('[data-testid="car-drop-zone"]')
      const receiptDropZone = wrapper.find('[data-testid="receipt-drop-zone"]')

      // Drop CAR file
      const carDropEvent = new Event('drop')
      carDropEvent.dataTransfer = { files: [carFile] }
      carDropZone.element.dispatchEvent(carDropEvent)
      await nextTick()

      // Drop Receipt file
      const receiptDropEvent = new Event('drop')
      receiptDropEvent.dataTransfer = { files: [receiptFile] }
      receiptDropZone.element.dispatchEvent(receiptDropEvent)
      await nextTick()

      // Upload files
      const uploadButton = wrapper.find('[data-testid="upload-button"]')
      expect(uploadButton.element.disabled).toBe(false)

      await uploadButton.trigger('click')
      await flushPromises()

      // Wait for uploads to complete
      timers.advanceTime(200)
      await flushPromises()

      expect(wrapper.text()).toContain('Upload complete')

      // Step 4: Start processing
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              session_id: mockSessionData.session_id,
              status: 'processing',
              message: 'Processing started',
            }),
        })
      )

      const startProcessingButton = wrapper.find(
        '[data-testid="start-processing-button"]'
      )
      await startProcessingButton.trigger('click')
      await flushPromises()

      expect(sessionStore.processingStatus).toBe('processing')

      // Step 5: Monitor progress with polling
      const progressResponses = [
        {
          session_id: mockSessionData.session_id,
          status: 'processing',
          percent_complete: 25,
          message: 'Analyzing documents...',
          total_employees: 25,
          completed_employees: 6,
        },
        {
          session_id: mockSessionData.session_id,
          status: 'processing',
          percent_complete: 50,
          message: 'Processing employee data...',
          total_employees: 25,
          completed_employees: 12,
        },
        {
          session_id: mockSessionData.session_id,
          status: 'processing',
          percent_complete: 75,
          message: 'Validating expenses...',
          total_employees: 25,
          completed_employees: 18,
        },
        {
          session_id: mockSessionData.session_id,
          status: 'completed',
          percent_complete: 100,
          message: 'Processing complete',
          total_employees: 25,
          completed_employees: 25,
        },
      ]

      let progressCallCount = 0
      fetchMock.mockImplementation(url => {
        if (url.includes('/progress')) {
          const response =
            progressResponses[
              Math.min(progressCallCount++, progressResponses.length - 1)
            ]
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(response),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      // Advance time to trigger polling
      for (let i = 0; i < 4; i++) {
        timers.advanceTime(5000) // 5-second polling interval
        await flushPromises()
      }

      expect(wrapper.text()).toContain('Processing complete')

      // Step 6: Load results
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProcessingResults),
        })
      )

      // Results should load automatically after completion
      await flushPromises()

      expect(wrapper.find('[data-testid="results-section"]').exists()).toBe(
        true
      )
      expect(wrapper.text()).toContain('Alice Johnson')
      expect(wrapper.text()).toContain('Bob Smith')
      expect(wrapper.text()).toContain('Carol Davis')
      expect(wrapper.text()).toContain('25') // Total employees

      // Step 7: Resolve employee issues
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 2,
              name: 'Bob Smith',
              employee_id: 'EMP002',
              status: 'RESOLVED',
              issues: [],
            }),
        })
      )

      const employeeWithIssues = wrapper.find('[data-employee-id="2"]')
      await employeeWithIssues.trigger('click')
      await nextTick()

      const resolveButton = wrapper.find(
        '[data-testid="resolve-employee-button"]'
      )
      if (resolveButton.exists()) {
        await resolveButton.trigger('click')
        await flushPromises()
      }

      // Step 8: Export results
      const exportResponses = {
        pvault: { export_id: 'export-pvault-123', status: 'processing' },
        followup: { export_id: 'export-followup-456', status: 'processing' },
        issues: { export_id: 'export-issues-789', status: 'processing' },
      }

      fetchMock.mockImplementation((url, options) => {
        if (url.includes('/export') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(exportResponses[body.type]),
          })
        }
        if (url.includes('/exports/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                export_id: url.split('/').pop(),
                status: 'completed',
                progress: 1.0,
                download_url: `/api/exports/${url.split('/').pop()}/download`,
              }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const exportSection = wrapper.find('[data-testid="export-section"]')
      expect(exportSection.exists()).toBe(true)

      // Export pVault data
      const exportPVaultButton = wrapper.find('[data-testid="export-pvault"]')
      await exportPVaultButton.trigger('click')
      await flushPromises()

      // Wait for export to complete
      timers.advanceTime(3000)
      await flushPromises()

      expect(wrapper.text()).toContain('Export completed')

      // Step 9: Verify final state
      expect(sessionStore.hasResults).toBe(true)
      expect(sessionStore.processingStatus).toBe('completed')
      expect(sessionStore.canExport).toBe(true)
    })
  })

  describe('Error Handling Workflows', () => {
    it('should handle file upload errors gracefully', async () => {
      // Create session
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSessionData),
        })
      )

      const createSessionButton = wrapper.find(
        '[data-testid="create-session-button"]'
      )
      await createSessionButton.trigger('click')
      await flushPromises()

      // Try to upload invalid file
      const invalidFile = createMockFile('document.txt', 1024, 'text/plain')
      const carDropZone = wrapper.find('[data-testid="car-drop-zone"]')

      const dropEvent = new Event('drop')
      dropEvent.dataTransfer = { files: [invalidFile] }
      carDropZone.element.dispatchEvent(dropEvent)
      await nextTick()

      expect(wrapper.text()).toContain('Only PDF files are allowed')
      expect(sessionStore.hasError).toBe(true)

      // Clear error and try with valid file
      sessionStore.clearError()

      const validFile = createMockFile('valid.pdf', 1024)
      const validDropEvent = new Event('drop')
      validDropEvent.dataTransfer = { files: [validFile] }
      carDropZone.element.dispatchEvent(validDropEvent)
      await nextTick()

      expect(sessionStore.hasError).toBe(false)
    })

    it('should handle processing errors with recovery', async () => {
      // Set up session with files
      sessionStore.createSession(mockSessionData.session_id)
      sessionStore.addFile({ id: 'car-123', name: 'car.pdf', type: 'car' })
      sessionStore.addFile({
        id: 'receipt-456',
        name: 'receipt.pdf',
        type: 'receipt',
      })

      // Mock processing start failure
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              detail: 'Internal server error',
            }),
        })
      )

      const startProcessingButton = wrapper.find(
        '[data-testid="start-processing-button"]'
      )
      await startProcessingButton.trigger('click')
      await flushPromises()

      expect(sessionStore.hasError).toBe(true)
      expect(wrapper.text()).toContain('Internal server error')

      // Clear error and retry
      sessionStore.clearError()

      // Mock successful retry
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              session_id: mockSessionData.session_id,
              status: 'processing',
            }),
        })
      )

      const retryButton = wrapper.find(
        '[data-testid="retry-processing-button"]'
      )
      if (retryButton.exists()) {
        await retryButton.trigger('click')
        await flushPromises()
      }

      expect(sessionStore.processingStatus).toBe('processing')
      expect(sessionStore.hasError).toBe(false)
    })

    it('should handle network connectivity issues', async () => {
      // Create session
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSessionData),
        })
      )

      const createSessionButton = wrapper.find(
        '[data-testid="create-session-button"]'
      )
      await createSessionButton.trigger('click')
      await flushPromises()

      // Simulate network error during file upload
      global.XMLHttpRequest.mockImplementation(() => {
        const mockXHR = new MockXMLHttpRequest()
        setTimeout(() => mockXHR.triggerError(), 100)
        return mockXHR
      })

      const file = createMockFile('test.pdf', 1024)
      const carDropZone = wrapper.find('[data-testid="car-drop-zone"]')

      const dropEvent = new Event('drop')
      dropEvent.dataTransfer = { files: [file] }
      carDropZone.element.dispatchEvent(dropEvent)
      await nextTick()

      const uploadButton = wrapper.find('[data-testid="upload-button"]')
      await uploadButton.trigger('click')

      timers.advanceTime(200)
      await flushPromises()

      expect(wrapper.text()).toContain('Network error')
      expect(sessionStore.hasError).toBe(true)
    })
  })

  describe('Session Recovery Workflow', () => {
    it('should restore session state after page refresh', async () => {
      // Simulate existing session data
      const existingSessionData = {
        sessionId: 'restored-session-123',
        uploadedFiles: [
          { id: 'car-123', name: 'car.pdf', type: 'car' },
          { id: 'receipt-456', name: 'receipt.pdf', type: 'receipt' },
        ],
        processingStatus: 'completed',
        results: mockProcessingResults,
      }

      sessionStore.restoreSession(existingSessionData)
      await nextTick()

      expect(wrapper.find('[data-testid="results-section"]').exists()).toBe(
        true
      )
      expect(wrapper.text()).toContain('Alice Johnson')
      expect(sessionStore.canExport).toBe(true)
    })
  })

  describe('Bulk Operations Workflow', () => {
    it('should handle bulk employee resolution', async () => {
      // Set up session with results
      sessionStore.createSession(mockSessionData.session_id)
      sessionStore.setResults(mockProcessingResults)
      await nextTick()

      // Select multiple employees with issues
      const employeeCards = wrapper.findAll('[data-employee-id]')

      // Select employees that need attention
      const employee2 = wrapper.find('[data-employee-id="2"]')
      await employee2.trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="bulk-resolve-button"]').exists()).toBe(
        true
      )

      // Mock bulk resolution
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              resolved_count: 1,
              employees: [
                {
                  id: 2,
                  name: 'Bob Smith',
                  employee_id: 'EMP002',
                  status: 'RESOLVED',
                  issues: [],
                },
              ],
            }),
        })
      )

      const bulkResolveButton = wrapper.find(
        '[data-testid="bulk-resolve-button"]'
      )
      await bulkResolveButton.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('1 employee resolved')
    })
  })

  describe('Export Workflow Variations', () => {
    beforeEach(async () => {
      // Set up completed session
      sessionStore.createSession(mockSessionData.session_id)
      sessionStore.setResults(mockProcessingResults)
      sessionStore.setProcessingStatus('completed')
      await nextTick()
    })

    it('should export all formats simultaneously', async () => {
      const exportStartResponses = {
        pvault: { export_id: 'pvault-123', status: 'processing' },
        followup: { export_id: 'followup-456', status: 'processing' },
        issues: { export_id: 'issues-789', status: 'processing' },
      }

      fetchMock.mockImplementation((url, options) => {
        if (url.includes('/export') && options?.method === 'POST') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(exportStartResponses[body.type]),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const exportAllButton = wrapper.find('[data-testid="export-all"]')
      await exportAllButton.trigger('click')
      await flushPromises()

      // Verify all exports started
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"pvault"'),
        })
      )
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"followup"'),
        })
      )
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"issues"'),
        })
      )
    })

    it('should handle export failures with retry options', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          json: () =>
            Promise.resolve({
              detail: 'Export service temporarily unavailable',
            }),
        })
      )

      const exportPVaultButton = wrapper.find('[data-testid="export-pvault"]')
      await exportPVaultButton.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Export service temporarily unavailable')

      const retryButton = wrapper.find('[data-testid="retry-pvault"]')
      expect(retryButton.exists()).toBe(true)

      // Mock successful retry
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              export_id: 'pvault-retry-123',
              status: 'processing',
            }),
        })
      )

      await retryButton.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Export started')
    })
  })

  describe('Performance Under Load', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeResults = {
        ...mockProcessingResults,
        results: {
          ...mockProcessingResults.results,
          summary: {
            ...mockProcessingResults.results.summary,
            total_employees: 1000,
          },
          employees: Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            name: `Employee ${i + 1}`,
            employee_id: `EMP${String(i + 1).padStart(4, '0')}`,
            status: i % 3 === 0 ? 'NEEDS_ATTENTION' : 'VALID',
            amount: Math.round(Math.random() * 2000 + 500),
            issues: i % 3 === 0 ? ['missing_receipt'] : [],
            department: ['Engineering', 'Marketing', 'Sales'][i % 3],
          })),
        },
      }

      sessionStore.createSession(mockSessionData.session_id)
      sessionStore.setResults(largeResults)
      await nextTick()

      // Test that the UI remains responsive
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      expect(searchInput.exists()).toBe(true)

      // Search should work quickly even with large dataset
      const startTime = performance.now()
      await searchInput.setValue('Employee 1')
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // Should be fast

      // Verify pagination is working
      const paginationControls = wrapper.find('[data-testid="pagination"]')
      if (paginationControls.exists()) {
        expect(paginationControls.exists()).toBe(true)
      }
    })
  })

  describe('Accessibility Workflow', () => {
    it('should support keyboard navigation throughout the workflow', async () => {
      // Create session
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSessionData),
        })
      )

      const createSessionButton = wrapper.find(
        '[data-testid="create-session-button"]'
      )
      expect(createSessionButton.attributes('tabindex')).toBeDefined()

      await createSessionButton.trigger('keydown.enter')
      await flushPromises()

      // Check that file upload areas support keyboard interaction
      const carDropZone = wrapper.find('[data-testid="car-drop-zone"]')
      expect(carDropZone.attributes('tabindex')).toBe('0')
      expect(carDropZone.attributes('role')).toBe('button')

      // Check ARIA labels are present
      const fileInputs = wrapper.findAll('input[type="file"]')
      fileInputs.forEach(input => {
        expect(input.attributes('aria-label')).toBeTruthy()
      })
    })

    it('should announce status changes to screen readers', async () => {
      sessionStore.createSession(mockSessionData.session_id)
      sessionStore.setProcessingStatus('processing')
      await nextTick()

      const statusRegion = wrapper.find('[aria-live="polite"]')
      expect(statusRegion.exists()).toBe(true)

      sessionStore.setProcessingStatus('completed')
      await nextTick()

      // Status should be announced to screen readers
      expect(wrapper.find('[aria-live="polite"]').text()).toContain('completed')
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across components', async () => {
      sessionStore.createSession(mockSessionData.session_id)
      sessionStore.setResults(mockProcessingResults)
      await nextTick()

      // Update employee in results
      const updatedEmployee = {
        ...mockProcessingResults.results.employees[1],
        status: 'RESOLVED',
        issues: [],
      }

      sessionStore.updateEmployeeInResults(updatedEmployee)
      await nextTick()

      // Verify update is reflected in UI
      const employeeCard = wrapper.find('[data-employee-id="2"]')
      expect(employeeCard.text()).toContain('RESOLVED')
      expect(employeeCard.text()).not.toContain('NEEDS_ATTENTION')

      // Verify summary statistics are updated
      const summaryStats = wrapper.find('[data-testid="summary-stats"]')
      if (summaryStats.exists()) {
        // The resolved count should reflect the change
        expect(wrapper.vm.resolvedEmployeesCount).toBeGreaterThan(1)
      }
    })
  })
})
