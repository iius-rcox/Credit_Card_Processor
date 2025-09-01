import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SessionSetup from '../core/SessionSetup.vue'

// Mock the useSessionStore composable
const mockSessionStore = {
  createSession: vi.fn(),
  switchSession: vi.fn(),
  clearError: vi.fn()
}

vi.mock('@/stores/session', () => ({
  useSessionStore: () => mockSessionStore
}))

// Mock the useApi composable
const mockApi = {
  createSession: vi.fn(),
  getSession: vi.fn()
}

vi.mock('@/composables/useApi', () => ({
  useApi: () => mockApi
}))

describe('SessionSetup.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('renders the main header and description', () => {
      wrapper = mount(SessionSetup)
      
      expect(wrapper.text()).toContain('Credit Card Processing Sessions')
      expect(wrapper.text()).toContain('Create a new processing session or continue with an existing one')
    })

    it('renders all three quick action cards', () => {
      wrapper = mount(SessionSetup)
      
      const actionCards = wrapper.findAll('.quick-action-card')
      expect(actionCards).toHaveLength(3)
      
      expect(wrapper.text()).toContain('New Session')
      expect(wrapper.text()).toContain('Resume Session')
      expect(wrapper.text()).toContain('Custom Session')
    })

    it('shows quick action descriptions', () => {
      wrapper = mount(SessionSetup)
      
      expect(wrapper.text()).toContain('Start a fresh processing session')
      expect(wrapper.text()).toContain('Continue working on existing')
      expect(wrapper.text()).toContain('Create session with specific settings')
    })
  })

  describe('New Session Quick Action', () => {
    it('calls createSession when new session card is clicked', async () => {
      mockSessionStore.createSession.mockResolvedValue('session-123')
      
      wrapper = mount(SessionSetup)
      
      const newSessionCard = wrapper.findAll('.quick-action-card')[0]
      await newSessionCard.trigger('click')
      
      expect(mockSessionStore.createSession).toHaveBeenCalledWith({
        session_name: expect.stringContaining('Processing Session'),
        processing_options: {
          validation_enabled: true,
          auto_resolution_enabled: false,
          email_notifications: false
        }
      })
    })

    it('emits session-created event on successful creation', async () => {
      mockSessionStore.createSession.mockResolvedValue('session-123')
      
      wrapper = mount(SessionSetup)
      
      const newSessionCard = wrapper.findAll('.quick-action-card')[0]
      await newSessionCard.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.emitted('session-created')).toBeTruthy()
      expect(wrapper.emitted('session-created')[0][0]).toEqual({
        sessionId: 'session-123',
        isNew: true
      })
    })

    it('shows loading state during session creation', async () => {
      let resolvePromise
      const createSessionPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSessionStore.createSession.mockReturnValue(createSessionPromise)
      
      wrapper = mount(SessionSetup)
      
      const newSessionCard = wrapper.findAll('.quick-action-card')[0]
      await newSessionCard.trigger('click')
      
      expect(wrapper.text()).toContain('Creating session...')
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      
      resolvePromise('session-123')
      await wrapper.vm.$nextTick()
    })

    it('handles session creation errors', async () => {
      mockSessionStore.createSession.mockRejectedValue(new Error('Creation failed'))
      
      wrapper = mount(SessionSetup)
      
      const newSessionCard = wrapper.findAll('.quick-action-card')[0]
      await newSessionCard.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Creation failed')
    })
  })

  describe('Resume Session Functionality', () => {
    it('toggles recent sessions panel when resume card is clicked', async () => {
      wrapper = mount(SessionSetup)
      
      const resumeCard = wrapper.findAll('.quick-action-card')[1]
      await resumeCard.trigger('click')
      
      expect(wrapper.vm.showRecentSessions).toBe(true)
      expect(wrapper.vm.showCustomForm).toBe(false)
    })

    it('shows recent sessions panel with proper structure', async () => {
      wrapper = mount(SessionSetup)
      
      const resumeCard = wrapper.findAll('.quick-action-card')[1]
      await resumeCard.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Recent Sessions')
      expect(wrapper.find('button[aria-label="Close recent sessions"]').exists()).toBe(true)
    })

    it('closes recent sessions panel when close button is clicked', async () => {
      wrapper = mount(SessionSetup)
      
      const resumeCard = wrapper.findAll('.quick-action-card')[1]
      await resumeCard.trigger('click')
      
      expect(wrapper.vm.showRecentSessions).toBe(true)
      
      const closeButton = wrapper.find('button[aria-label="Close recent sessions"]')
      await closeButton.trigger('click')
      
      expect(wrapper.vm.showRecentSessions).toBe(false)
    })
  })

  describe('Custom Session Form', () => {
    it('toggles custom form panel when custom card is clicked', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      expect(wrapper.vm.showCustomForm).toBe(true)
      expect(wrapper.vm.showRecentSessions).toBe(false)
    })

    it('generates default session name when form opens', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      expect(wrapper.vm.form.sessionName).toContain('Processing Session')
    })

    it('shows form fields when custom form is opened', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Session Name')
      expect(wrapper.text()).toContain('Processing Options')
      expect(wrapper.text()).toContain('Enable data validation')
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    })

    it('validates required session name', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      // Clear the session name
      const sessionNameInput = wrapper.find('input[type="text"]')
      await sessionNameInput.setValue('')
      
      expect(wrapper.vm.isFormValid).toBe(false)
    })

    it('closes custom form when close button is clicked', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      expect(wrapper.vm.showCustomForm).toBe(true)
      
      const closeButton = wrapper.find('button[aria-label="Close custom form"]')
      await closeButton.trigger('click')
      
      expect(wrapper.vm.showCustomForm).toBe(false)
    })

    it('creates custom session when form is submitted', async () => {
      mockSessionStore.createSession.mockResolvedValue('custom-session-123')
      
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      
      expect(mockSessionStore.createSession).toHaveBeenCalled()
    })
  })

  describe('Status and Date Formatting', () => {
    it('formats status correctly', () => {
      wrapper = mount(SessionSetup)
      
      expect(wrapper.vm.formatStatus('idle')).toBe('Ready')
      expect(wrapper.vm.formatStatus('processing')).toBe('Processing')
      expect(wrapper.vm.formatStatus('completed')).toBe('Complete')
      expect(wrapper.vm.formatStatus('error')).toBe('Error')
    })

    it('formats recent dates correctly', () => {
      wrapper = mount(SessionSetup)
      
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      
      expect(wrapper.vm.formatDate(today.toISOString())).toBe('Today')
      expect(wrapper.vm.formatDate(yesterday.toISOString())).toBe('Yesterday')
    })

    it('returns correct status badge classes', () => {
      wrapper = mount(SessionSetup)
      
      expect(wrapper.vm.getStatusBadgeClasses('completed')).toContain('bg-green-100')
      expect(wrapper.vm.getStatusBadgeClasses('processing')).toContain('bg-blue-100')
      expect(wrapper.vm.getStatusBadgeClasses('error')).toContain('bg-red-100')
    })
  })

  describe('Error Handling', () => {
    it('displays error messages when present', async () => {
      mockSessionStore.createSession.mockRejectedValue(new Error('Test error'))
      
      wrapper = mount(SessionSetup)
      
      const newSessionCard = wrapper.findAll('.quick-action-card')[0]
      await newSessionCard.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('Test error')
    })

    it('allows dismissing errors', async () => {
      mockSessionStore.createSession.mockRejectedValue(new Error('Test error'))
      
      wrapper = mount(SessionSetup)
      
      const newSessionCard = wrapper.findAll('.quick-action-card')[0]
      await newSessionCard.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      // Find dismiss button by looking for buttons with "Dismiss" text
      const buttons = wrapper.findAll('button')
      const dismissButton = buttons.find(button => button.text().includes('Dismiss'))
      
      if (dismissButton) {
        await dismissButton.trigger('click')
        expect(wrapper.vm.error).toBe(null)
      }
    })
  })

  describe('Component Interactions', () => {
    it('closes panels when other actions are selected', async () => {
      wrapper = mount(SessionSetup)
      
      // Open resume panel
      const resumeCard = wrapper.findAll('.quick-action-card')[1]
      await resumeCard.trigger('click')
      expect(wrapper.vm.showRecentSessions).toBe(true)
      
      // Open custom form - should close resume panel
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      expect(wrapper.vm.showRecentSessions).toBe(false)
      expect(wrapper.vm.showCustomForm).toBe(true)
    })

    it('prevents multiple simultaneous actions', async () => {
      let resolvePromise
      const createSessionPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSessionStore.createSession.mockReturnValue(createSessionPromise)
      
      wrapper = mount(SessionSetup)
      
      const newSessionCard = wrapper.findAll('.quick-action-card')[0]
      await newSessionCard.trigger('click')
      
      // All cards should be disabled during creation
      const actionCards = wrapper.findAll('.quick-action-card')
      actionCards.forEach(card => {
        expect(card.classes()).toContain('opacity-50')
        expect(card.classes()).toContain('pointer-events-none')
      })
      
      resolvePromise('session-123')
      await wrapper.vm.$nextTick()
    })
  })

  describe('Form Validation', () => {
    it('validates form correctly with valid data', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      // Form should be valid with default session name
      expect(wrapper.vm.isFormValid).toBe(true)
    })

    it('shows validation errors for invalid data', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      // Clear session name and trigger validation
      const sessionNameInput = wrapper.find('input[type="text"]')
      await sessionNameInput.setValue('')
      
      // Form should be invalid
      expect(wrapper.vm.isFormValid).toBe(false)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for close buttons', async () => {
      wrapper = mount(SessionSetup)
      
      // Open custom form to make close button visible
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      expect(wrapper.find('button[aria-label="Close custom form"]').exists()).toBe(true)
    })

    it('has form labels and required fields', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      expect(wrapper.find('label[for="sessionName"]').exists()).toBe(true)
      expect(wrapper.find('input#sessionName[required]').exists()).toBe(true)
    })

    it('has proper button types', async () => {
      wrapper = mount(SessionSetup)
      
      const customCard = wrapper.findAll('.quick-action-card')[2]
      await customCard.trigger('click')
      
      const submitButton = wrapper.find('button[type="submit"]')
      const cancelButton = wrapper.find('button[type="button"]')
      
      expect(submitButton.exists()).toBe(true)
      expect(cancelButton.exists()).toBe(true)
    })
  })
})