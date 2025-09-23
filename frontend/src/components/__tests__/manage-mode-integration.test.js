import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWrapper, createMockSessions } from '@/test/utils/component-helpers'
import SessionManager from '../SessionManager.vue'

// Mock the API composable
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} })
  })
}))

// Mock the notification store
vi.mock('@/stores/notification', () => ({
  useNotificationStore: () => ({
    addSuccess: vi.fn(),
    addError: vi.fn(),
    addInfo: vi.fn(),
    addWarning: vi.fn()
  })
}))

describe('Manage Mode Integration', () => {
  let wrapper

  beforeEach(() => {
    wrapper = createWrapper(SessionManager, {
      data() {
        return {
          sessions: createMockSessions(5),
          filteredSessions: createMockSessions(5),
          manageMode: false,
          selectedSessions: new Set(),
          loading: false
        }
      }
    })
  })

  describe('Mode Toggle', () => {
    it('enters manage mode and shows toolbar', async () => {
      const toggleButton = wrapper.find('[data-testid="manage-toggle"]')
      expect(toggleButton.exists()).toBe(true)
      
      await toggleButton.trigger('click')
      
      expect(wrapper.vm.manageMode).toBe(true)
      expect(wrapper.find('.bulk-action-toolbar').exists()).toBe(true)
    })

    it('exits manage mode and clears selection', async () => {
      // Enter manage mode
      wrapper.vm.manageMode = true
      wrapper.vm.selectedSessions.add('test-session-1')
      await wrapper.vm.$nextTick()
      
      // Exit manage mode
      const toggleButton = wrapper.find('[data-testid="manage-toggle"]')
      await toggleButton.trigger('click')
      
      expect(wrapper.vm.manageMode).toBe(false)
      expect(wrapper.vm.selectedSessions.size).toBe(0)
    })
  })

  describe('Session Selection', () => {
    beforeEach(async () => {
      wrapper.vm.manageMode = true
      await wrapper.vm.$nextTick()
    })

    it('selects sessions and updates statistics', async () => {
      const sessionCard = wrapper.find('.session-card')
      await sessionCard.trigger('click')
      
      expect(wrapper.vm.selectedSessions.size).toBe(1)
      expect(wrapper.vm.selectionStats.selected).toBe(1)
    })

    it('performs range selection with Shift+click', async () => {
      const sessionCards = wrapper.findAll('.session-card')
      
      // Click first session
      await sessionCards[0].trigger('click')
      expect(wrapper.vm.selectedSessions.size).toBe(1)
      
      // Shift+click third session
      await sessionCards[2].trigger('click', { shiftKey: true })
      expect(wrapper.vm.selectedSessions.size).toBe(3)
    })

    it('performs multi-selection with Ctrl+click', async () => {
      const sessionCards = wrapper.findAll('.session-card')
      
      // Click first session
      await sessionCards[0].trigger('click')
      expect(wrapper.vm.selectedSessions.size).toBe(1)
      
      // Ctrl+click second session
      await sessionCards[1].trigger('click', { ctrlKey: true })
      expect(wrapper.vm.selectedSessions.size).toBe(2)
    })

    it('clears selection on single click without modifiers', async () => {
      const sessionCards = wrapper.findAll('.session-card')
      
      // Select first session
      await sessionCards[0].trigger('click')
      expect(wrapper.vm.selectedSessions.size).toBe(1)
      
      // Click second session without modifiers
      await sessionCards[1].trigger('click')
      expect(wrapper.vm.selectedSessions.size).toBe(1) // Only second session selected
    })
  })

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      wrapper.vm.manageMode = true
      wrapper.vm.selectedSessions.add('test-session-1')
      wrapper.vm.selectedSessions.add('test-session-2')
      await wrapper.vm.$nextTick()
    })

    it('handles bulk delete workflow', async () => {
      const deleteButton = wrapper.find('.btn-action.delete')
      await deleteButton.trigger('click')
      
      expect(wrapper.vm.showBulkConfirmation).toBe(true)
      expect(wrapper.vm.bulkActionType).toBe('delete')
    })

    it('handles bulk export workflow', async () => {
      const exportButton = wrapper.find('.btn-action.export')
      await exportButton.trigger('click')
      
      expect(wrapper.vm.showBulkConfirmation).toBe(true)
      expect(wrapper.vm.bulkActionType).toBe('export')
    })

    it('handles bulk close workflow', async () => {
      const closeButton = wrapper.find('.btn-action.close')
      await closeButton.trigger('click')
      
      expect(wrapper.vm.showBulkConfirmation).toBe(true)
      expect(wrapper.vm.bulkActionType).toBe('close')
    })

    it('clears selection after bulk operation', async () => {
      // Mock successful bulk operation
      wrapper.vm.performBulkDelete = vi.fn().mockResolvedValue()
      
      const deleteButton = wrapper.find('.btn-action.delete')
      await deleteButton.trigger('click')
      
      // Confirm the operation
      wrapper.vm.handleBulkConfirm({
        actionType: 'delete',
        selectedSessions: wrapper.vm.getSelectedSessionDetails(),
        confirmed: true
      })
      
      expect(wrapper.vm.selectedSessions.size).toBe(0)
    })
  })

  describe('Quick Filters', () => {
    beforeEach(async () => {
      wrapper.vm.manageMode = true
      await wrapper.vm.$nextTick()
    })

    it('applies quick filter when button is clicked', async () => {
      const completedFilter = wrapper.find('.quick-filter-btn')
      await completedFilter.trigger('click')
      
      expect(wrapper.vm.statusFilter).toBe('completed')
    })

    it('shows correct count for each filter', () => {
      const filterButtons = wrapper.findAll('.quick-filter-btn')
      expect(filterButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Selection Statistics', () => {
    beforeEach(async () => {
      wrapper.vm.manageMode = true
      await wrapper.vm.$nextTick()
    })

    it('calculates statistics correctly', () => {
      wrapper.vm.selectedSessions.add('test-session-1')
      wrapper.vm.selectedSessions.add('test-session-2')
      wrapper.vm.updateSelectionStats()
      
      expect(wrapper.vm.selectionStats.selected).toBe(2)
      expect(wrapper.vm.selectionStats.total).toBe(5)
    })

    it('identifies ineligible sessions correctly', () => {
      // Add an ineligible session (PROCESSING status)
      const ineligibleSession = {
        session_id: 'ineligible-session',
        status: 'PROCESSING'
      }
      wrapper.vm.filteredSessions.push(ineligibleSession)
      wrapper.vm.selectedSessions.add('ineligible-session')
      wrapper.vm.updateSelectionStats()
      
      expect(wrapper.vm.selectionStats.ineligible).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock API error
      wrapper.vm.api.get = vi.fn().mockRejectedValue(new Error('API Error'))
      
      await wrapper.vm.loadSessions()
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})







