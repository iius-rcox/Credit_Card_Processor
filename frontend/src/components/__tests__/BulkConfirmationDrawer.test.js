import { describe, it, expect, vi } from 'vitest'
import { createWrapper, createMockSession } from '@/test/utils/component-helpers'
import BulkConfirmationDrawer from '../BulkConfirmationDrawer.vue'

// Mock teleport for testing
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    Teleport: {
      name: 'Teleport',
      template: '<div><slot /></div>'
    }
  }
})

describe('BulkConfirmationDrawer', () => {
  const defaultProps = {
    modelValue: true,
    actionType: 'delete',
    selectedSessions: [
      createMockSession({ session_id: 'session-1', session_name: 'Test Session 1' }),
      createMockSession({ session_id: 'session-2', session_name: 'Test Session 2' })
    ],
    selectionStats: {
      total: 10,
      selected: 2,
      eligible: 2,
      ineligible: 0,
      pages: 1
    }
  }

  describe('Props and Events', () => {
    it('renders when modelValue is true', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      expect(wrapper.find('.drawer-container').exists()).toBe(true)
    })

    it('does not render when modelValue is false', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: { ...defaultProps, modelValue: false }
      })
      
      expect(wrapper.find('.drawer-container').exists()).toBe(false)
    })

    it('displays correct title based on action type', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      expect(wrapper.find('.drawer-title').text()).toBe('Delete 2 Sessions')
    })

    it('displays correct confirm button text', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      expect(wrapper.find('.btn-primary').text()).toBe('Delete 2 Sessions')
    })
  })

  describe('Session Preview', () => {
    it('displays selected sessions in preview', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      expect(wrapper.find('.session-preview').exists()).toBe(true)
      expect(wrapper.findAll('.session-preview-item')).toHaveLength(2)
    })

    it('shows session names correctly', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      const sessionNames = wrapper.findAll('.session-name')
      expect(sessionNames[0].text()).toBe('Test Session 1')
      expect(sessionNames[1].text()).toBe('Test Session 2')
    })

    it('shows session IDs correctly', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      const sessionIds = wrapper.findAll('.session-id')
      expect(sessionIds[0].text()).toBe('session-1...')
      expect(sessionIds[1].text()).toBe('session-2...')
    })

    it('limits displayed sessions to maxDisplayed', () => {
      const manySessions = Array.from({ length: 15 }, (_, i) => 
        createMockSession({ session_id: `session-${i}`, session_name: `Session ${i}` })
      )
      
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: {
          ...defaultProps,
          selectedSessions: manySessions
        }
      })
      
      expect(wrapper.findAll('.session-preview-item')).toHaveLength(10)
      expect(wrapper.find('.more-sessions').text()).toContain('5 more')
    })
  })

  describe('Statistics Display', () => {
    it('displays selection statistics correctly', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      expect(wrapper.find('.stat-value').text()).toBe('2')
      expect(wrapper.find('.stat-label').text()).toBe('Total Selected:')
    })

    it('shows ineligible warning when present', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: {
          ...defaultProps,
          selectionStats: { ...defaultProps.selectionStats, ineligible: 1 }
        }
      })
      
      expect(wrapper.find('.ineligible-warning').exists()).toBe(true)
      expect(wrapper.find('.warning-text').text()).toContain('1 sessions cannot be deleted')
    })
  })

  describe('Confirmation Flow', () => {
    it('requires checkbox confirmation before allowing action', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      const confirmButton = wrapper.find('.btn-primary')
      expect(confirmButton.attributes('disabled')).toBeDefined()
    })

    it('enables confirm button when checkbox is checked', async () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      await wrapper.find('.checkbox-input').setChecked(true)
      
      const confirmButton = wrapper.find('.btn-primary')
      expect(confirmButton.attributes('disabled')).toBeUndefined()
    })

    it('emits confirm event when confirmed', async () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      await wrapper.find('.checkbox-input').setChecked(true)
      await wrapper.find('.btn-primary').trigger('click')
      
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')[0][0]).toEqual({
        actionType: 'delete',
        selectedSessions: defaultProps.selectedSessions,
        confirmed: true
      })
    })

    it('emits close event when cancel is clicked', async () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      await wrapper.find('.btn-secondary').trigger('click')
      
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Action Types', () => {
    it('displays correct title for export action', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: { ...defaultProps, actionType: 'export' }
      })
      
      expect(wrapper.find('.drawer-title').text()).toBe('Export 2 Sessions')
    })

    it('displays correct title for close action', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: { ...defaultProps, actionType: 'close' }
      })
      
      expect(wrapper.find('.drawer-title').text()).toBe('Close 2 Sessions')
    })

    it('shows correct action button class', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: { ...defaultProps, actionType: 'delete' }
      })
      
      expect(wrapper.find('.btn-primary').classes()).toContain('btn-delete')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      const closeButton = wrapper.find('.close-btn')
      expect(closeButton.attributes('aria-label')).toBe('Close drawer')
    })

    it('supports keyboard navigation', async () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps
      })
      
      await wrapper.find('.close-btn').trigger('keydown.enter')
      
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Responsive Design', () => {
    it('applies mobile classes on small screens', () => {
      const wrapper = createWrapper(BulkConfirmationDrawer, {
        props: defaultProps,
        global: {
          mocks: {
            $device: { isMobile: true }
          }
        }
      })
      
      expect(wrapper.find('.drawer-panel').exists()).toBe(true)
    })
  })
})
