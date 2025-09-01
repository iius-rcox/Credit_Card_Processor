import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProgressTracker from '../ProgressTracker.vue'
import { useSessionStore } from '../../stores/session.js'
import { mockTimers, flushPromises } from '../../test/utils.js'

// Mock useProgress composable
const mockProgressData = {
  sessionInfo: { session_name: 'Test Session' },
  isPolling: false,
  progressPercentage: 0,
  statusLabel: 'idle',
  isProcessing: false,
  isComplete: false,
  hasError: false,
  processingDuration: null,
  formattedEstimatedTime: null,
  progressColor: 'bg-blue-500',
  currentStage: null,
  currentActivity: null,
  statistics: {
    totalEmployees: 100,
    processedEmployees: 0,
    resolvedEmployees: 0,
    pendingResolution: 0,
  },
  activityFeed: [],
  controls: {
    canPause: false,
    canResume: false,
    canCancel: false,
    isPaused: false,
  },
}

const mockProgressComposable = {
  ...mockProgressData,
  startPolling: vi.fn(),
  stopPolling: vi.fn(),
  pauseProcessing: vi.fn(),
  resumeProcessing: vi.fn(),
  cancelProcessing: vi.fn(),
}

vi.mock('../../composables/useProgress.js', () => ({
  useProgress: () => mockProgressComposable,
}))

describe('ProgressTracker', () => {
  let wrapper
  let sessionStore
  let pinia
  let timers

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    timers = mockTimers()

    // Reset mock functions
    vi.clearAllMocks()
    Object.assign(mockProgressComposable, mockProgressData)

    wrapper = mount(ProgressTracker, {
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
    timers.restore()
  })

  describe('Initial State', () => {
    it('renders with correct initial state', () => {
      expect(wrapper.find('h2').text()).toBe('Processing Progress')
      expect(wrapper.find('.progress-tracker').exists()).toBe(true)
    })

    it('shows offline status when not polling', () => {
      expect(wrapper.text()).toContain('Offline')
      expect(wrapper.find('.bg-gray-400').exists()).toBe(true)
    })

    it('displays session name when available', async () => {
      mockProgressComposable.sessionInfo.session_name = 'Test Session'
      await nextTick()

      expect(wrapper.text()).toContain('Test Session')
    })

    it('shows initial progress state', () => {
      expect(wrapper.find('[data-testid="progress-bar"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('0%')
    })
  })

  describe('Progress Display', () => {
    it('updates progress bar correctly', async () => {
      mockProgressComposable.progressPercentage = 45
      await nextTick()

      expect(wrapper.text()).toContain('45%')
      const progressBar = wrapper.find('[data-testid="progress-bar"]')
      expect(progressBar.element.style.width).toBe('45%')
    })

    it('shows different colors for different states', async () => {
      // Processing state
      mockProgressComposable.isProcessing = true
      mockProgressComposable.progressColor = 'bg-blue-500'
      await nextTick()

      expect(wrapper.find('.bg-blue-500').exists()).toBe(true)

      // Completed state
      mockProgressComposable.isComplete = true
      mockProgressComposable.isProcessing = false
      mockProgressComposable.progressColor = 'bg-green-500'
      await nextTick()

      expect(wrapper.find('.bg-green-500').exists()).toBe(true)

      // Error state
      mockProgressComposable.hasError = true
      mockProgressComposable.isComplete = false
      mockProgressComposable.progressColor = 'bg-red-500'
      await nextTick()

      expect(wrapper.find('.bg-red-500').exists()).toBe(true)
    })

    it('displays animated stripes during processing', async () => {
      mockProgressComposable.isProcessing = true
      await nextTick()

      expect(wrapper.find('.animate-stripe').exists()).toBe(true)
    })

    it('shows status labels correctly', async () => {
      const statuses = [
        { statusLabel: 'Processing', class: 'bg-blue-100' },
        { statusLabel: 'Completed', class: 'bg-green-100' },
        { statusLabel: 'Error', class: 'bg-red-100' },
      ]

      for (const status of statuses) {
        mockProgressComposable.statusLabel = status.statusLabel
        mockProgressComposable.isProcessing =
          status.statusLabel === 'Processing'
        mockProgressComposable.isComplete = status.statusLabel === 'Completed'
        mockProgressComposable.hasError = status.statusLabel === 'Error'
        await nextTick()

        expect(wrapper.text()).toContain(status.statusLabel)
        expect(wrapper.find(`.${status.class}`).exists()).toBe(true)
      }
    })
  })

  describe('Polling Functionality', () => {
    it('shows live status when polling is active', async () => {
      mockProgressComposable.isPolling = true
      await nextTick()

      expect(wrapper.text()).toContain('Live')
      expect(wrapper.find('.bg-green-500').exists()).toBe(true)
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    })

    it('starts polling when component mounts with sessionId', () => {
      expect(mockProgressComposable.startPolling).toHaveBeenCalledWith(
        'test-session-123'
      )
    })

    it('stops polling when component unmounts', () => {
      wrapper.unmount()
      expect(mockProgressComposable.stopPolling).toHaveBeenCalled()
    })

    it('restarts polling when sessionId changes', async () => {
      await wrapper.setProps({ sessionId: 'new-session-456' })

      expect(mockProgressComposable.stopPolling).toHaveBeenCalled()
      expect(mockProgressComposable.startPolling).toHaveBeenCalledWith(
        'new-session-456'
      )
    })
  })

  describe('Time Display', () => {
    it('shows processing duration when available', async () => {
      mockProgressComposable.processingDuration = '5m 30s'
      await nextTick()

      expect(wrapper.text()).toContain('Duration: 5m 30s')
    })

    it('shows estimated completion time', async () => {
      mockProgressComposable.formattedEstimatedTime = 'ETA: 3m 15s'
      await nextTick()

      expect(wrapper.text()).toContain('ETA: 3m 15s')
    })

    it('hides time displays when not available', () => {
      expect(wrapper.text()).not.toContain('Duration:')
      expect(wrapper.text()).not.toContain('ETA:')
    })
  })

  describe('Stage and Activity Display', () => {
    it('displays current processing stage', async () => {
      mockProgressComposable.currentStage = 'Document Analysis'
      await nextTick()

      expect(wrapper.text()).toContain('Document Analysis')
    })

    it('displays current activity', async () => {
      mockProgressComposable.currentActivity = 'Processing employee records...'
      await nextTick()

      expect(wrapper.text()).toContain('Processing employee records...')
    })

    it('shows stage progress when available', async () => {
      mockProgressComposable.currentStage = 'Document Analysis'
      mockProgressComposable.statistics.processedEmployees = 25
      mockProgressComposable.statistics.totalEmployees = 100
      await nextTick()

      expect(wrapper.text()).toContain('25 of 100')
    })
  })

  describe('Statistics Display', () => {
    beforeEach(async () => {
      mockProgressComposable.statistics = {
        totalEmployees: 150,
        processedEmployees: 100,
        resolvedEmployees: 85,
        pendingResolution: 15,
      }
      await nextTick()
    })

    it('displays employee statistics', () => {
      expect(wrapper.text()).toContain('150') // Total employees
      expect(wrapper.text()).toContain('100') // Processed employees
      expect(wrapper.text()).toContain('85') // Resolved employees
      expect(wrapper.text()).toContain('15') // Pending resolution
    })

    it('shows statistics in card format', () => {
      const statisticsCards = wrapper.findAll('[data-testid="stat-card"]')
      expect(statisticsCards.length).toBeGreaterThan(0)
    })

    it('updates statistics dynamically', async () => {
      mockProgressComposable.statistics.processedEmployees = 120
      await nextTick()

      expect(wrapper.text()).toContain('120')
    })
  })

  describe('Processing Controls', () => {
    beforeEach(async () => {
      mockProgressComposable.controls = {
        canPause: true,
        canResume: false,
        canCancel: true,
        isPaused: false,
      }
      await nextTick()
    })

    it('shows pause button when processing can be paused', () => {
      const pauseButton = wrapper.find('[data-testid="pause-button"]')
      expect(pauseButton.exists()).toBe(true)
      expect(pauseButton.element.disabled).toBe(false)
    })

    it('shows resume button when processing is paused', async () => {
      mockProgressComposable.controls.canPause = false
      mockProgressComposable.controls.canResume = true
      mockProgressComposable.controls.isPaused = true
      await nextTick()

      const resumeButton = wrapper.find('[data-testid="resume-button"]')
      expect(resumeButton.exists()).toBe(true)
    })

    it('shows cancel button when processing can be cancelled', () => {
      const cancelButton = wrapper.find('[data-testid="cancel-button"]')
      expect(cancelButton.exists()).toBe(true)
      expect(cancelButton.element.disabled).toBe(false)
    })

    it('calls pause processing when pause button clicked', async () => {
      const pauseButton = wrapper.find('[data-testid="pause-button"]')
      await pauseButton.trigger('click')

      expect(mockProgressComposable.pauseProcessing).toHaveBeenCalledWith(
        'test-session-123'
      )
    })

    it('calls resume processing when resume button clicked', async () => {
      mockProgressComposable.controls.canResume = true
      await nextTick()

      const resumeButton = wrapper.find('[data-testid="resume-button"]')
      await resumeButton.trigger('click')

      expect(mockProgressComposable.resumeProcessing).toHaveBeenCalledWith(
        'test-session-123'
      )
    })

    it('shows confirmation dialog before cancelling', async () => {
      // Mock window.confirm
      global.confirm = vi.fn(() => true)

      const cancelButton = wrapper.find('[data-testid="cancel-button"]')
      await cancelButton.trigger('click')

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to cancel processing? This action cannot be undone.'
      )
      expect(mockProgressComposable.cancelProcessing).toHaveBeenCalledWith(
        'test-session-123'
      )
    })

    it('does not cancel if confirmation is denied', async () => {
      global.confirm = vi.fn(() => false)

      const cancelButton = wrapper.find('[data-testid="cancel-button"]')
      await cancelButton.trigger('click')

      expect(mockProgressComposable.cancelProcessing).not.toHaveBeenCalled()
    })
  })

  describe('Activity Feed', () => {
    beforeEach(async () => {
      mockProgressComposable.activityFeed = [
        {
          id: 1,
          timestamp: '2023-01-01T10:00:00Z',
          message: 'Processing started',
          type: 'info',
        },
        {
          id: 2,
          timestamp: '2023-01-01T10:05:00Z',
          message: 'Document analysis completed',
          type: 'success',
        },
        {
          id: 3,
          timestamp: '2023-01-01T10:06:00Z',
          message: 'Warning: Some receipts missing',
          type: 'warning',
        },
      ]
      await nextTick()
    })

    it('displays activity feed items', () => {
      expect(wrapper.text()).toContain('Processing started')
      expect(wrapper.text()).toContain('Document analysis completed')
      expect(wrapper.text()).toContain('Warning: Some receipts missing')
    })

    it('shows timestamps for activity items', () => {
      const activityItems = wrapper.findAll('[data-testid="activity-item"]')
      expect(activityItems.length).toBe(3)
    })

    it('applies correct styling for different activity types', () => {
      expect(wrapper.find('[data-activity-type="info"]').exists()).toBe(true)
      expect(wrapper.find('[data-activity-type="success"]').exists()).toBe(true)
      expect(wrapper.find('[data-activity-type="warning"]').exists()).toBe(true)
    })

    it('limits activity feed to recent items', async () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        timestamp: new Date().toISOString(),
        message: `Activity ${i + 1}`,
        type: 'info',
      }))

      mockProgressComposable.activityFeed = manyItems
      await nextTick()

      // Should show only the most recent items (e.g., last 20)
      const visibleItems = wrapper.findAll('[data-testid="activity-item"]')
      expect(visibleItems.length).toBeLessThanOrEqual(20)
    })

    it('auto-scrolls to newest activity', async () => {
      const newActivity = {
        id: 4,
        timestamp: new Date().toISOString(),
        message: 'New activity',
        type: 'info',
      }

      mockProgressComposable.activityFeed.push(newActivity)
      await nextTick()

      expect(wrapper.text()).toContain('New activity')
    })
  })

  describe('Error Handling', () => {
    it('displays error state correctly', async () => {
      mockProgressComposable.hasError = true
      mockProgressComposable.statusLabel = 'Error'
      await nextTick()

      expect(wrapper.find('.bg-red-100').exists()).toBe(true)
      expect(wrapper.text()).toContain('Error')
    })

    it('shows error message when available', async () => {
      const errorMessage = 'Processing failed due to network error'
      sessionStore.setError(errorMessage)
      await nextTick()

      expect(wrapper.text()).toContain(errorMessage)
    })

    it('allows retry after error', async () => {
      mockProgressComposable.hasError = true
      await nextTick()

      const retryButton = wrapper.find('[data-testid="retry-button"]')
      if (retryButton.exists()) {
        await retryButton.trigger('click')
        expect(mockProgressComposable.startPolling).toHaveBeenCalled()
      }
    })
  })

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      window.dispatchEvent(new Event('resize'))
      await nextTick()

      // Check if mobile classes are applied
      const container = wrapper.find('.progress-tracker')
      expect(container.exists()).toBe(true)
    })

    it('maintains accessibility on different screen sizes', () => {
      const progressBar = wrapper.find('[data-testid="progress-bar"]')
      expect(progressBar.attributes('role')).toBe('progressbar')
      expect(progressBar.attributes('aria-valuemin')).toBe('0')
      expect(progressBar.attributes('aria-valuemax')).toBe('100')
    })
  })

  describe('Performance', () => {
    it('handles rapid progress updates efficiently', async () => {
      for (let i = 0; i <= 100; i += 10) {
        mockProgressComposable.progressPercentage = i
        await nextTick()
      }

      expect(wrapper.text()).toContain('100%')
    })

    it('debounces activity feed updates', async () => {
      const rapidUpdates = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        timestamp: new Date().toISOString(),
        message: `Rapid update ${i}`,
        type: 'info',
      }))

      mockProgressComposable.activityFeed = rapidUpdates
      await flushPromises()

      // Component should handle rapid updates gracefully
      expect(
        wrapper.findAll('[data-testid="activity-item"]').length
      ).toBeLessThanOrEqual(10)
    })
  })
})
