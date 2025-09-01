import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExportActions from '../ExportActions.vue'
import { useSessionStore } from '../../stores/session.js'
import { flushPromises, setupFetchMock, mockTimers } from '../../test/utils.js'

// Mock URL.createObjectURL for file downloads
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url')
global.URL.revokeObjectURL = vi.fn()

// Mock link click for file downloads
const mockAnchorElement = {
  href: '',
  download: '',
  click: vi.fn(),
  style: { display: '' },
}

vi.spyOn(document, 'createElement').mockImplementation(tagName => {
  if (tagName === 'a') {
    return mockAnchorElement
  }
  return document.createElement(tagName)
})

vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

describe('ExportActions', () => {
  let wrapper
  let sessionStore
  let pinia
  let fetchMock
  let timers

  const mockResults = {
    session_id: 'test-session-123',
    summary: {
      total_employees: 10,
      completed_employees: 8,
      issues_employees: 2,
    },
    employees: [
      {
        id: 1,
        name: 'John Doe',
        employee_id: 'EMP001',
        status: 'VALID',
        amount: 1200.0,
        issues: [],
      },
      {
        id: 2,
        name: 'Jane Smith',
        employee_id: 'EMP002',
        status: 'NEEDS_ATTENTION',
        amount: 850.75,
        issues: ['missing_receipt'],
      },
    ],
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    fetchMock = setupFetchMock()
    timers = mockTimers()

    // Set results in store to enable exports
    sessionStore.setResults(mockResults)
    sessionStore.setProcessingStatus('completed')

    wrapper = mount(ExportActions, {
      props: {
        sessionId: 'test-session-123',
      },
      global: {
        plugins: [pinia],
      },
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
    timers.restore()
  })

  describe('Initial State', () => {
    it('renders export section header', () => {
      expect(wrapper.find('h3').text()).toBe('Export Results')
      expect(wrapper.text()).toContain(
        'Generate reports and export data in various formats'
      )
    })

    it('shows export buttons when results are available', () => {
      expect(wrapper.find('[data-testid="export-pvault"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="export-followup"]').exists()).toBe(
        true
      )
      expect(wrapper.find('[data-testid="export-issues"]').exists()).toBe(true)
    })

    it('shows export all button when exports are available', () => {
      const exportAllButton = wrapper.find('[data-testid="export-all"]')
      expect(exportAllButton.exists()).toBe(true)
      expect(exportAllButton.text()).toBe('Export All')
    })

    it('displays correct export statistics', () => {
      expect(wrapper.text()).toContain('8 records') // Valid employees for pVault
      expect(wrapper.text()).toContain('2 records') // Employees with issues
    })
  })

  describe('Export Availability', () => {
    it('disables exports when no results', async () => {
      sessionStore.clearSession()
      await nextTick()

      expect(wrapper.find('[data-testid="export-unavailable"]').exists()).toBe(
        true
      )
      expect(wrapper.text()).toContain(
        'Complete processing successfully to enable exports'
      )
    })

    it('disables exports during processing', async () => {
      sessionStore.setProcessingStatus('processing')
      await nextTick()

      const exportButtons = wrapper.findAll('.export-card button')
      exportButtons.forEach(button => {
        expect(button.element.disabled).toBe(true)
      })
    })

    it('enables exports after processing completion', async () => {
      sessionStore.setProcessingStatus('completed')
      await nextTick()

      const exportButtons = wrapper.findAll('.export-card button')
      exportButtons.forEach(button => {
        expect(button.element.disabled).toBe(false)
      })
    })

    it('shows warning when no employees available for export type', async () => {
      // Set results with no valid employees
      sessionStore.setResults({
        ...mockResults,
        employees: mockResults.employees.map(emp => ({
          ...emp,
          status: 'NEEDS_ATTENTION',
        })),
      })
      await nextTick()

      expect(wrapper.text()).toContain('0 records') // No valid employees for pVault
    })
  })

  describe('pVault Export', () => {
    it('initiates pVault export when button clicked', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              export_id: 'export-pvault-123',
              status: 'processing',
              type: 'pvault',
            }),
        })
      )

      const exportButton = wrapper.find('[data-testid="export-pvault"]')
      await exportButton.trigger('click')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/test-session-123/export',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'pvault',
            include_resolved: true,
            exclude_issues: true,
          }),
        })
      )
    })

    it('shows loading state during pVault export', async () => {
      wrapper.vm.exportStates.pvault.isExporting = true
      await nextTick()

      const exportButton = wrapper.find('[data-testid="export-pvault"]')
      expect(exportButton.find('.animate-spin').exists()).toBe(true)
      expect(exportButton.text()).toContain('Exporting')
    })

    it('tracks pVault export progress', async () => {
      const exportId = 'export-pvault-123'
      wrapper.vm.exportStates.pvault = {
        exportId,
        isExporting: true,
        progress: 0.5,
        status: 'processing',
      }
      await nextTick()

      expect(wrapper.text()).toContain('50%') // Progress display

      const progressBar = wrapper.find('[data-testid="pvault-progress"]')
      expect(progressBar.element.style.width).toBe('50%')
    })

    it('downloads pVault file when export completes', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' })
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        })
      )

      await wrapper.vm.downloadExport('export-pvault-123', 'pvault')

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
      expect(mockAnchorElement.download).toBe('pvault_export.csv')
      expect(mockAnchorElement.click).toHaveBeenCalled()
    })
  })

  describe('Follow-up Export', () => {
    it('initiates follow-up export with correct parameters', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              export_id: 'export-followup-456',
              status: 'processing',
              type: 'followup',
            }),
        })
      )

      const exportButton = wrapper.find('[data-testid="export-followup"]')
      await exportButton.trigger('click')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/test-session-123/export',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'followup',
            include_all: true,
            format: 'detailed',
          }),
        })
      )
    })

    it('shows different icon and styling for follow-up export', () => {
      const followupCard = wrapper.find('[data-testid="followup-card"]')
      expect(followupCard.find('.bg-blue-100').exists()).toBe(true)
    })

    it('includes all employees in follow-up export', async () => {
      const exportButton = wrapper.find('[data-testid="export-followup"]')
      await exportButton.trigger('click')

      expect(wrapper.text()).toContain(
        `${mockResults.employees.length} records`
      )
    })
  })

  describe('Issues Export', () => {
    it('initiates issues export with only problematic employees', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              export_id: 'export-issues-789',
              status: 'processing',
              type: 'issues',
            }),
        })
      )

      const exportButton = wrapper.find('[data-testid="export-issues"]')
      await exportButton.trigger('click')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/test-session-123/export',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'issues',
            issues_only: true,
            include_resolution_notes: true,
          }),
        })
      )
    })

    it('disables issues export when no issues exist', async () => {
      sessionStore.setResults({
        ...mockResults,
        employees: mockResults.employees.map(emp => ({
          ...emp,
          status: 'VALID',
          issues: [],
        })),
      })
      await nextTick()

      const exportButton = wrapper.find('[data-testid="export-issues"]')
      expect(exportButton.element.disabled).toBe(true)
      expect(wrapper.text()).toContain('0 records') // No issues
    })

    it('shows warning styling for issues export', () => {
      const issuesCard = wrapper.find('[data-testid="issues-card"]')
      expect(issuesCard.find('.bg-red-100').exists()).toBe(true)
    })
  })

  describe('Export All Functionality', () => {
    it('initiates all exports simultaneously', async () => {
      fetchMock
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                export_id: 'pvault-123',
                status: 'processing',
              }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                export_id: 'followup-456',
                status: 'processing',
              }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                export_id: 'issues-789',
                status: 'processing',
              }),
          })
        )

      const exportAllButton = wrapper.find('[data-testid="export-all"]')
      await exportAllButton.trigger('click')

      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('shows combined progress for export all', async () => {
      wrapper.vm.isExportingAll = true
      wrapper.vm.exportStates = {
        pvault: { progress: 1.0, status: 'completed' },
        followup: { progress: 0.5, status: 'processing' },
        issues: { progress: 0.0, status: 'pending' },
      }
      await nextTick()

      // Combined progress should be (1.0 + 0.5 + 0.0) / 3 = 50%
      expect(wrapper.vm.overallExportProgress).toBe(50)
    })

    it('disables individual exports during export all', async () => {
      wrapper.vm.isExportingAll = true
      await nextTick()

      const individualButtons = [
        wrapper.find('[data-testid="export-pvault"]'),
        wrapper.find('[data-testid="export-followup"]'),
        wrapper.find('[data-testid="export-issues"]'),
      ]

      individualButtons.forEach(button => {
        expect(button.element.disabled).toBe(true)
      })
    })
  })

  describe('Export Progress Tracking', () => {
    beforeEach(() => {
      wrapper.vm.exportStates.pvault = {
        exportId: 'export-123',
        isExporting: true,
        status: 'processing',
        progress: 0.0,
      }
    })

    it('polls export status during processing', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              export_id: 'export-123',
              status: 'processing',
              progress: 0.5,
            }),
        })
      )

      wrapper.vm.startPollingExport('export-123', 'pvault')

      // Fast forward polling interval
      timers.advanceTime(2000)
      await flushPromises()

      expect(fetchMock).toHaveBeenCalledWith('/api/exports/export-123')
      expect(wrapper.vm.exportStates.pvault.progress).toBe(0.5)
    })

    it('stops polling when export completes', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              export_id: 'export-123',
              status: 'completed',
              progress: 1.0,
              download_url: '/api/exports/export-123/download',
            }),
        })
      )

      wrapper.vm.startPollingExport('export-123', 'pvault')

      timers.advanceTime(2000)
      await flushPromises()

      expect(wrapper.vm.exportStates.pvault.status).toBe('completed')
      expect(wrapper.vm.exportStates.pvault.isExporting).toBe(false)
    })

    it('handles polling errors gracefully', async () => {
      fetchMock.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      )

      wrapper.vm.startPollingExport('export-123', 'pvault')

      timers.advanceTime(2000)
      await flushPromises()

      expect(wrapper.vm.exportStates.pvault.status).toBe('error')
      expect(sessionStore.error).toContain('Network error')
    })

    it('shows retry button after export failure', async () => {
      wrapper.vm.exportStates.pvault.status = 'error'
      await nextTick()

      const retryButton = wrapper.find('[data-testid="retry-pvault"]')
      expect(retryButton.exists()).toBe(true)

      await retryButton.trigger('click')
      expect(wrapper.vm.exportStates.pvault.status).toBe('idle')
    })
  })

  describe('Export History', () => {
    it('displays recent export history', async () => {
      wrapper.vm.exportHistory = [
        {
          id: 'export-1',
          type: 'pvault',
          created_at: '2023-01-01T10:00:00Z',
          status: 'completed',
          file_size: '1.2 MB',
        },
        {
          id: 'export-2',
          type: 'followup',
          created_at: '2023-01-01T10:30:00Z',
          status: 'completed',
          file_size: '2.5 MB',
        },
      ]
      await nextTick()

      expect(wrapper.find('[data-testid="export-history"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('pVault Export')
      expect(wrapper.text()).toContain('Follow-up Report')
      expect(wrapper.text()).toContain('1.2 MB')
      expect(wrapper.text()).toContain('2.5 MB')
    })

    it('allows re-download of completed exports', async () => {
      wrapper.vm.exportHistory = [
        {
          id: 'export-1',
          type: 'pvault',
          status: 'completed',
          download_url: '/api/exports/export-1/download',
        },
      ]
      await nextTick()

      const downloadButton = wrapper.find('[data-testid="redownload-export-1"]')
      await downloadButton.trigger('click')

      expect(fetchMock).toHaveBeenCalledWith('/api/exports/export-1/download')
    })

    it('shows export creation time in friendly format', () => {
      const timestamp = '2023-01-01T10:00:00Z'
      const friendlyTime = wrapper.vm.formatExportTime(timestamp)

      expect(friendlyTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/)
    })
  })

  describe('File Download', () => {
    it('downloads file with correct filename', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' })
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        })
      )

      await wrapper.vm.downloadExport('export-123', 'pvault')

      expect(mockAnchorElement.download).toBe('pvault_export.csv')
      expect(mockAnchorElement.href).toBe('mock-blob-url')
    })

    it('handles different export types with correct filenames', async () => {
      const exportTypes = [
        { type: 'pvault', expectedName: 'pvault_export.csv' },
        { type: 'followup', expectedName: 'followup_report.xlsx' },
        { type: 'issues', expectedName: 'issues_report.csv' },
      ]

      for (const { type, expectedName } of exportTypes) {
        const mockBlob = new Blob(['test'], {
          type: 'application/octet-stream',
        })
        fetchMock.mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(mockBlob),
          })
        )

        await wrapper.vm.downloadExport(`export-${type}`, type)
        expect(mockAnchorElement.download).toBe(expectedName)
      }
    })

    it('handles download errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
      )

      await wrapper.vm.downloadExport('export-123', 'pvault')

      expect(sessionStore.error).toContain('Failed to download export')
    })

    it('cleans up blob URL after download', async () => {
      const mockBlob = new Blob(['test'], { type: 'text/csv' })
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        })
      )

      await wrapper.vm.downloadExport('export-123', 'pvault')

      // Should clean up after a delay
      timers.advanceTime(1000)
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-blob-url')
    })
  })

  describe('Error Handling', () => {
    it('displays export errors to user', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ detail: 'Export service unavailable' }),
        })
      )

      const exportButton = wrapper.find('[data-testid="export-pvault"]')
      await exportButton.trigger('click')

      expect(sessionStore.error).toContain('Export service unavailable')
    })

    it('resets export state after error', async () => {
      wrapper.vm.exportStates.pvault.status = 'error'
      wrapper.vm.exportStates.pvault.isExporting = true

      await wrapper.vm.resetExportState('pvault')

      expect(wrapper.vm.exportStates.pvault).toEqual({
        exportId: null,
        isExporting: false,
        progress: 0,
        status: 'idle',
      })
    })

    it('shows specific error messages for different failure types', async () => {
      const errorScenarios = [
        { status: 400, message: 'Invalid export parameters' },
        { status: 403, message: 'Export not authorized' },
        { status: 500, message: 'Export service error' },
      ]

      for (const scenario of errorScenarios) {
        fetchMock.mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: scenario.status,
            json: () => Promise.resolve({ detail: scenario.message }),
          })
        )

        await wrapper.vm.startExport('pvault')
        expect(sessionStore.error).toContain(scenario.message)

        // Reset for next iteration
        sessionStore.clearError()
      }
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for export buttons', () => {
      const exportButtons = wrapper.findAll('[data-testid^="export-"]')
      exportButtons.forEach(button => {
        expect(button.attributes('aria-label')).toBeTruthy()
      })
    })

    it('announces export progress to screen readers', async () => {
      wrapper.vm.exportStates.pvault.progress = 0.75
      await nextTick()

      const progressElement = wrapper.find('[data-testid="pvault-progress"]')
      expect(progressElement.attributes('aria-valuenow')).toBe('75')
      expect(progressElement.attributes('role')).toBe('progressbar')
    })

    it('provides keyboard navigation support', async () => {
      const exportButton = wrapper.find('[data-testid="export-pvault"]')
      expect(exportButton.attributes('tabindex')).toBe('0')

      await exportButton.trigger('keydown.enter')
      // Should trigger export
    })
  })

  describe('Performance', () => {
    it('efficiently handles multiple concurrent exports', async () => {
      const startTime = performance.now()

      // Start all exports
      await Promise.all([
        wrapper.vm.startExport('pvault'),
        wrapper.vm.startExport('followup'),
        wrapper.vm.startExport('issues'),
      ])

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // Should start quickly
    })

    it('limits polling frequency to prevent excessive requests', () => {
      wrapper.vm.startPollingExport('export-123', 'pvault')

      // Fast forward multiple intervals
      timers.advanceTime(10000) // 10 seconds

      // Should not make excessive requests (max 1 per 2 seconds)
      expect(fetchMock).toHaveBeenCalledTimes(5) // 10/2 = 5 calls max
    })
  })
})
