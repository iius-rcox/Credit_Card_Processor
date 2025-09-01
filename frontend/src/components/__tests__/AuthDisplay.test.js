import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// Mock the useAuth composable before importing the component
vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: ref(null),
    isLoading: ref(false),
    error: ref(null),
    isAuthenticated: ref(false),
    userDisplayName: ref(''),
    userInitials: ref(''),
    isAdmin: ref(false),
    initialize: vi.fn(),
    logout: vi.fn()
  }))
}))

import AuthDisplay from '../shared/AuthDisplay.vue'

describe('AuthDisplay.vue', () => {
  let wrapper
  let mockAuth

  beforeEach(async () => {
    // Import and reset the mock
    const { useAuth } = await import('@/composables/useAuth')
    mockAuth = {
      user: ref(null),
      isLoading: ref(false),
      error: ref(null),
      isAuthenticated: ref(false),
      userDisplayName: ref(''),
      userInitials: ref(''),
      isAdmin: ref(false),
      initialize: vi.fn(),
      logout: vi.fn()
    }
    
    useAuth.mockReturnValue(mockAuth)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('displays loading state when authentication is loading', async () => {
      mockAuth.isLoading.value = true
      
      wrapper = mount(AuthDisplay)
      
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.text()).toContain('Authenticating...')
    })
  })

  describe('Error State', () => {
    it('displays error message when authentication fails', async () => {
      mockAuth.error.value = 'Authentication failed'
      
      wrapper = mount(AuthDisplay)
      
      expect(wrapper.find('.text-red-600').exists()).toBe(true)
      expect(wrapper.text()).toContain('Authentication failed')
      expect(wrapper.find('button').text()).toContain('Retry')
    })

    it('calls retry function when retry button is clicked', async () => {
      mockAuth.error.value = 'Auth error'
      mockAuth.initialize = vi.fn()
      
      wrapper = mount(AuthDisplay)
      
      const retryButton = wrapper.find('button[aria-label="Retry authentication"]')
      await retryButton.trigger('click')
      
      expect(mockAuth.initialize).toHaveBeenCalledWith(true)
    })

    it('emits auth-error event when retry fails', async () => {
      mockAuth.error.value = 'Auth error'
      mockAuth.initialize = vi.fn().mockRejectedValue(new Error('Retry failed'))
      
      wrapper = mount(AuthDisplay)
      
      const retryButton = wrapper.find('button[aria-label="Retry authentication"]')
      await retryButton.trigger('click')
      
      expect(wrapper.emitted('auth-error')).toBeTruthy()
    })
  })

  describe('Unauthenticated State', () => {
    it('displays not authenticated message when no user', async () => {
      wrapper = mount(AuthDisplay)
      
      expect(wrapper.text()).toContain('Not authenticated')
      expect(wrapper.find('svg').exists()).toBe(true) // User icon
    })
  })

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockAuth.user.value = {
        username: 'testuser',
        displayName: 'Test User',
        department: 'Engineering',
        lastLogin: new Date().toISOString(),
        isAdmin: false
      }
      mockAuth.isAuthenticated.value = true
      mockAuth.userDisplayName.value = 'Test User'
      mockAuth.userInitials.value = 'TU'
      mockAuth.isAdmin.value = false
    })

    it('displays user information when authenticated', async () => {
      wrapper = mount(AuthDisplay)
      
      expect(wrapper.text()).toContain('Test User')
      expect(wrapper.find('.bg-blue-600').exists()).toBe(true) // Avatar
      expect(wrapper.text()).toContain('TU') // Initials
    })

    it('displays admin badge for admin users', async () => {
      mockAuth.user.value.isAdmin = true
      mockAuth.isAdmin.value = true
      
      wrapper = mount(AuthDisplay, {
        props: { showDetails: true }
      })
      
      expect(wrapper.text()).toContain('Admin')
      expect(wrapper.find('.bg-amber-100').exists()).toBe(true)
    })

    it('displays admin panel button for admin users', async () => {
      mockAuth.user.value.isAdmin = true
      mockAuth.isAdmin.value = true
      
      wrapper = mount(AuthDisplay, {
        props: { showAdminAccess: true }
      })
      
      const adminButton = wrapper.find('button[title="Admin Panel"]')
      expect(adminButton.exists()).toBe(true)
    })

    it('does not display admin features for regular users', async () => {
      wrapper = mount(AuthDisplay, {
        props: { showAdminAccess: true }
      })
      
      expect(wrapper.text()).not.toContain('Admin')
      expect(wrapper.find('button[title="Admin Panel"]').exists()).toBe(false)
    })

    it('displays department when showDetails is true', async () => {
      wrapper = mount(AuthDisplay, {
        props: { showDetails: true }
      })
      
      expect(wrapper.text()).toContain('Engineering')
    })

    it('hides details when showDetails is false', async () => {
      wrapper = mount(AuthDisplay, {
        props: { showDetails: false }
      })
      
      expect(wrapper.text()).not.toContain('Engineering')
    })
  })

  describe('Layout Support', () => {
    beforeEach(() => {
      mockAuth.user.value = { username: 'testuser' }
      mockAuth.isAuthenticated.value = true
      mockAuth.userDisplayName.value = 'Test User'
      mockAuth.userInitials.value = 'TU'
    })

    it('applies header layout classes', async () => {
      wrapper = mount(AuthDisplay, {
        props: { layout: 'header' }
      })
      
      expect(wrapper.classes()).toContain('auth-display--header')
      expect(wrapper.find('.flex.items-center.space-x-3.px-4.py-2').exists()).toBe(true)
    })

    it('applies sidebar layout classes', async () => {
      wrapper = mount(AuthDisplay, {
        props: { layout: 'sidebar' }
      })
      
      expect(wrapper.classes()).toContain('auth-display--sidebar')
      expect(wrapper.find('.flex.flex-col.space-y-2.p-3').exists()).toBe(true)
    })

    it('applies footer layout classes', async () => {
      wrapper = mount(AuthDisplay, {
        props: { layout: 'footer' }
      })
      
      expect(wrapper.classes()).toContain('auth-display--footer')
      expect(wrapper.find('.flex.items-center.justify-between.px-4.py-2.text-sm').exists()).toBe(true)
    })

    it('applies compact layout with smaller elements', async () => {
      wrapper = mount(AuthDisplay, {
        props: { layout: 'compact' }
      })
      
      expect(wrapper.find('.w-6.h-6').exists()).toBe(true) // Smaller avatar
    })

    it('applies vertical layout with centered elements', async () => {
      wrapper = mount(AuthDisplay, {
        props: { layout: 'vertical' }
      })
      
      expect(wrapper.find('.flex.flex-col.items-center').exists()).toBe(true)
    })
  })

  describe('Variant Support', () => {
    beforeEach(() => {
      mockAuth.user.value = { username: 'testuser' }
      mockAuth.isAuthenticated.value = true
    })

    it('applies card variant styling', async () => {
      wrapper = mount(AuthDisplay, {
        props: { variant: 'card' }
      })
      
      expect(wrapper.classes()).toContain('auth-display--card')
    })

    it('applies minimal variant styling', async () => {
      wrapper = mount(AuthDisplay, {
        props: { variant: 'minimal' }
      })
      
      expect(wrapper.classes()).toContain('auth-display--minimal')
    })
  })

  describe('Event Handling', () => {
    beforeEach(() => {
      mockAuth.user.value = { username: 'testuser', isAdmin: true }
      mockAuth.isAuthenticated.value = true
      mockAuth.userDisplayName.value = 'Test User'
      mockAuth.isAdmin.value = true
    })

    it('emits admin-panel-clicked event when admin button is clicked', async () => {
      wrapper = mount(AuthDisplay, {
        props: { showAdminAccess: true }
      })
      
      const adminButton = wrapper.find('button[title="Admin Panel"]')
      await adminButton.trigger('click')
      
      expect(wrapper.emitted('admin-panel-clicked')).toBeTruthy()
      expect(wrapper.emitted('admin-panel-clicked')[0]).toEqual([mockAuth.user.value])
    })

    it('emits logout-clicked event when logout button is clicked', async () => {
      wrapper = mount(AuthDisplay, {
        props: { showLogout: true }
      })
      
      const logoutButton = wrapper.find('button[title="Clear Session"]')
      await logoutButton.trigger('click')
      
      expect(wrapper.emitted('logout-clicked')).toBeTruthy()
      expect(mockAuth.logout).toHaveBeenCalled()
    })

    it('emits auth-error event on initialization failure', async () => {
      mockAuth.initialize = vi.fn().mockRejectedValue(new Error('Init failed'))
      
      wrapper = mount(AuthDisplay)
      
      // Wait for onMounted and async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$nextTick()
      
      expect(wrapper.emitted('auth-error')).toBeTruthy()
    })
  })

  describe('Prop Validation', () => {
    it('validates layout prop correctly', async () => {
      const validLayouts = ['horizontal', 'vertical', 'compact', 'header', 'sidebar', 'footer']
      
      validLayouts.forEach(layout => {
        expect(() => {
          mount(AuthDisplay, {
            props: { layout }
          })
        }).not.toThrow()
      })
    })

    it('validates variant prop correctly', async () => {
      const validVariants = ['default', 'card', 'minimal']
      
      validVariants.forEach(variant => {
        expect(() => {
          mount(AuthDisplay, {
            props: { variant }
          })
        }).not.toThrow()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockAuth.user.value = { username: 'testuser', isAdmin: true }
      mockAuth.isAuthenticated.value = true
      mockAuth.userDisplayName.value = 'Test User'
      mockAuth.isAdmin.value = true
    })

    it('has proper button titles for screen readers', async () => {
      wrapper = mount(AuthDisplay, {
        props: { showAdminAccess: true, showLogout: true }
      })
      
      expect(wrapper.find('button[title="Admin Panel"]').exists()).toBe(true)
      expect(wrapper.find('button[title="Clear Session"]').exists()).toBe(true)
    })

    it('has admin badge title for accessibility', async () => {
      wrapper = mount(AuthDisplay)
      
      expect(wrapper.find('span[title="Administrator"]').exists()).toBe(true)
    })
  })

  describe('Time Formatting', () => {
    beforeEach(() => {
      mockAuth.user.value = {
        username: 'testuser',
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      }
      mockAuth.isAuthenticated.value = true
      mockAuth.userDisplayName.value = 'Test User'
    })

    it('formats last login time correctly', async () => {
      wrapper = mount(AuthDisplay, {
        props: { showDetails: true }
      })
      
      expect(wrapper.text()).toContain('Last: Yesterday')
    })
  })

  describe('Component Lifecycle', () => {
    it('initializes authentication on mount', async () => {
      mockAuth.initialize = vi.fn()
      
      wrapper = mount(AuthDisplay)
      
      expect(mockAuth.initialize).toHaveBeenCalled()
    })

    it('exposes correct methods and properties', async () => {
      wrapper = mount(AuthDisplay)
      
      const exposed = wrapper.vm
      expect(exposed.user).toBeDefined()
      expect(exposed.isAuthenticated).toBeDefined()
      expect(exposed.isAdmin).toBeDefined()
      expect(exposed.retry).toBeDefined()
      expect(exposed.initialize).toBeDefined()
    })
  })
})