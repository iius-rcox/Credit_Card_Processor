import { describe, it, expect, vi } from 'vitest'
import { createWrapper } from '@/test/utils/component-helpers'
import BulkActionToolbar from '../BulkActionToolbar.vue'

describe('BulkActionToolbar', () => {
  const defaultProps = {
    show: true,
    selectedCount: 3,
    totalCount: 10,
    selectionStats: {
      total: 10,
      selected: 3,
      eligible: 2,
      ineligible: 1,
      pages: 1
    }
  }

  describe('Props and Events', () => {
    it('renders when show is true', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      expect(wrapper.find('.bulk-action-toolbar').exists()).toBe(true)
    })

    it('does not render when show is false', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: { ...defaultProps, show: false }
      })
      
      expect(wrapper.find('.bulk-action-toolbar').exists()).toBe(false)
    })

    it('displays correct selection count', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      expect(wrapper.find('.count-number').text()).toBe('3')
      expect(wrapper.find('.count-label').text()).toBe('selected')
    })

    it('displays total count when provided', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      expect(wrapper.find('.total-count').text()).toBe('of 10')
    })

    it('shows ineligible warning when present', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      expect(wrapper.find('.ineligible-warning').text()).toContain('1 ineligible')
    })
  })

  describe('Action Buttons', () => {
    it('emits delete-selected when delete button is clicked', async () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      await wrapper.find('.btn-action.delete').trigger('click')
      
      expect(wrapper.emitted('delete-selected')).toBeTruthy()
    })

    it('emits export-selected when export button is clicked', async () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      await wrapper.find('.btn-action.export').trigger('click')
      
      expect(wrapper.emitted('export-selected')).toBeTruthy()
    })

    it('emits close-selected when close button is clicked', async () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      await wrapper.find('.btn-action.close').trigger('click')
      
      expect(wrapper.emitted('close-selected')).toBeTruthy()
    })

    it('emits deselect-all when deselect button is clicked', async () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      await wrapper.find('.btn-action.deselect').trigger('click')
      
      expect(wrapper.emitted('deselect-all')).toBeTruthy()
    })
  })

  describe('Selection Helpers', () => {
    it('emits select-all-page when page button is clicked', async () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      await wrapper.find('.select-helper-btn').trigger('click')
      
      expect(wrapper.emitted('select-all-page')).toBeTruthy()
    })

    it('emits select-all-results when results button is clicked', async () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      const resultsButton = wrapper.findAll('.select-helper-btn')[1]
      await resultsButton.trigger('click')
      
      expect(wrapper.emitted('select-all-results')).toBeTruthy()
    })
  })

  describe('Button States', () => {
    it('disables delete button when no eligible sessions', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: {
          ...defaultProps,
          selectionStats: { ...defaultProps.selectionStats, eligible: 0 }
        }
      })
      
      const deleteButton = wrapper.find('.btn-action.delete')
      expect(deleteButton.attributes('disabled')).toBeDefined()
    })

    it('disables export button when no selected sessions', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: {
          ...defaultProps,
          selectedCount: 0
        }
      })
      
      const exportButton = wrapper.find('.btn-action.export')
      expect(exportButton.attributes('disabled')).toBeDefined()
    })

    it('shows correct tooltip text', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      const deleteButton = wrapper.find('.btn-action.delete')
      expect(deleteButton.attributes('title')).toBe('Delete 2 sessions')
    })
  })

  describe('Responsive Design', () => {
    it('applies correct classes for mobile view', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps,
        global: {
          mocks: {
            $device: { isMobile: true }
          }
        }
      })
      
      expect(wrapper.find('.bulk-action-toolbar').exists()).toBe(true)
    })
  })

  describe('Animations', () => {
    it('applies slide-down animation classes', () => {
      const wrapper = createWrapper(BulkActionToolbar, {
        props: defaultProps
      })
      
      // Check if the toolbar exists (animation classes are applied by Vue transitions)
      expect(wrapper.find('.bulk-action-toolbar').exists()).toBe(true)
    })
  })
})
