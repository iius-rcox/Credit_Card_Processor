import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAuth, useAuthGuard, useAuthenticatedApi } from '../useAuth.js'
import {
  flushPromises,
  setupFetchMock,
  createTestPinia,
  mockTimers,
} from '../../test/utils.js'
import { setActivePinia } from 'pinia'

describe('useAuth', () => {
  let auth
  let fetchMock
  let pinia
  let timers

  beforeEach(() => {
    fetchMock = setupFetchMock()
    pinia = createTestPinia()
    setActivePinia(pinia)
    timers = mockTimers()
    auth = useAuth()
    
    // Clear any previous auth state
    auth.logout()
  })

  afterEach(() => {
    timers.restore()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(auth.user.value).toBe(null)
      expect(auth.isLoading.value).toBe(false)
      expect(auth.error.value).toBe(null)
      expect(auth.lastAuthCheck.value).toBe(null)
      expect(auth.isAuthenticated.value).toBe(false)
    })

    it('should have correct computed properties', () => {
      expect(auth.userDisplayName.value).toBe('Unknown User')
      expect(auth.userInitials.value).toBe('?')
      expect(auth.authStatus.value).toBe('unauthenticated')
    })
  })

  describe('User Authentication', () => {
    it('should successfully authenticate valid Windows user', async () => {
      const userData = {
        username: 'testuser',
        email: 'testuser@company.com',
        is_admin: false,
        department: 'IT',
        display_name: 'Test User',
        roles: ['user'],
        permissions: ['read']
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      const result = await auth.getCurrentUser()

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/current-user', 
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      )

      expect(result).toEqual({
        id: 'testuser',
        username: 'testuser',
        email: 'testuser@company.com',
        isAdmin: false,
        department: 'IT',
        displayName: 'Test User',
        lastLogin: expect.any(String),
        roles: ['user'],
        permissions: ['read']
      })

      expect(auth.user.value).toEqual(result)
      expect(auth.isAuthenticated.value).toBe(true)
      expect(auth.lastAuthCheck.value).toBeInstanceOf(Date)
    })

    it('should handle admin user authentication', async () => {
      const adminData = {
        username: 'rcox',
        is_admin: true,
        roles: ['admin', 'user'],
        permissions: ['read', 'write', 'admin']
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(adminData),
      })

      const result = await auth.getCurrentUser()

      expect(result.isAdmin).toBe(true)
      expect(auth.isAdmin()).toBe(true)
      expect(auth.hasPermission('admin')).toBe(true)
      expect(auth.hasRole('admin')).toBe(true)
    })

    it('should handle authentication failure (401)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Windows authentication failed' }),
      })

      await expect(auth.getCurrentUser()).rejects.toThrow(
        'Authentication required - Windows login not detected'
      )

      expect(auth.user.value).toBe(null)
      expect(auth.error.value).toBe('Authentication required - Windows login not detected')
    })

    it('should handle access denied (403)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ detail: 'Insufficient privileges' }),
      })

      await expect(auth.getCurrentUser()).rejects.toThrow(
        'Access denied - insufficient privileges'
      )
    })

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      await expect(auth.getCurrentUser()).rejects.toThrow('Network error')
      expect(auth.user.value).toBe(null)
      expect(auth.error.value).toBe('Network error')
    })

    it('should handle invalid user data from server', async () => {
      const invalidData = { id: 123 } // Missing username

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidData),
      })

      await expect(auth.getCurrentUser()).rejects.toThrow(
        'Invalid user data received from server'
      )
    })
  })

  describe('User Management', () => {
    beforeEach(async () => {
      // Setup authenticated user
      const userData = {
        username: 'testuser',
        is_admin: false,
        roles: ['user'],
        permissions: ['read']
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()
    })

    it('should logout user correctly', () => {
      auth.logout()

      expect(auth.user.value).toBe(null)
      expect(auth.error.value).toBe(null)
      expect(auth.lastAuthCheck.value).toBe(null)
      expect(auth.isAuthenticated.value).toBe(false)
    })

    it('should refresh user authentication', async () => {
      const refreshedData = {
        username: 'testuser',
        is_admin: true, // Changed admin status
        roles: ['admin', 'user'],
        permissions: ['read', 'write', 'admin']
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(refreshedData),
      })

      const result = await auth.refresh()

      expect(result.isAdmin).toBe(true)
      expect(auth.isAdmin()).toBe(true)
    })

    it('should detect expired authentication', () => {
      // Manually set old last check time
      auth.lastAuthCheck.value = new Date(Date.now() - 31 * 60 * 1000) // 31 minutes ago

      expect(auth.isAuthExpired()).toBe(true)

      // Reset to recent time
      auth.lastAuthCheck.value = new Date()
      expect(auth.isAuthExpired()).toBe(false)
    })
  })

  describe('Authorization Checks', () => {
    it('should validate admin privileges correctly', async () => {
      // Non-admin user
      const userData = { username: 'user', is_admin: false }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })
      await auth.getCurrentUser()

      expect(auth.isAdmin()).toBe(false)
      expect(() => auth.requireAdmin()).toThrow('Administrative privileges required')

      // Admin user
      const adminData = { username: 'rcox', is_admin: true }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(adminData),
      })
      await auth.getCurrentUser()

      expect(auth.isAdmin()).toBe(true)
      expect(() => auth.requireAdmin()).not.toThrow()
    })

    it('should validate specific permissions', async () => {
      const userData = {
        username: 'testuser',
        is_admin: false,
        permissions: ['read', 'write']
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })
      await auth.getCurrentUser()

      expect(auth.hasPermission('read')).toBe(true)
      expect(auth.hasPermission('write')).toBe(true)
      expect(auth.hasPermission('admin')).toBe(false)

      expect(() => auth.requirePermission('read')).not.toThrow()
      expect(() => auth.requirePermission('admin')).toThrow('Permission required: admin')
    })

    it('should validate roles correctly', async () => {
      const userData = {
        username: 'testuser',
        roles: ['user', 'analyst']
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })
      await auth.getCurrentUser()

      expect(auth.hasRole('user')).toBe(true)
      expect(auth.hasRole('analyst')).toBe(true)
      expect(auth.hasRole('admin')).toBe(false)
    })

    it('should grant all permissions to admin users', async () => {
      const adminData = {
        username: 'rcox',
        is_admin: true,
        permissions: ['read']
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(adminData),
      })
      await auth.getCurrentUser()

      // Admins should have all permissions regardless of permissions array
      expect(auth.hasPermission('admin')).toBe(true)
      expect(auth.hasPermission('write')).toBe(true)
      expect(auth.hasPermission('any-permission')).toBe(true)
    })

    it('should require authentication for permission checks', () => {
      // No authenticated user
      expect(() => auth.requireAdmin()).toThrow('Authentication required')
      expect(() => auth.requirePermission('read')).toThrow('Authentication required')
    })
  })

  describe('Authentication Initialization', () => {
    it('should initialize with existing user without API call', async () => {
      // Set user manually
      auth.user.value = { username: 'testuser', isAdmin: false }
      auth.lastAuthCheck.value = new Date()

      const result = await auth.initialize()

      expect(fetchMock).not.toHaveBeenCalled()
      expect(result.username).toBe('testuser')
    })

    it('should force refresh when requested', async () => {
      // Set existing user
      auth.user.value = { username: 'testuser', isAdmin: false }
      auth.lastAuthCheck.value = new Date()

      const updatedData = { username: 'testuser', is_admin: true }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedData),
      })

      const result = await auth.initialize(true) // Force refresh

      expect(fetchMock).toHaveBeenCalled()
      expect(result.isAdmin).toBe(true)
    })

    it('should refresh after auth check interval', async () => {
      // Set user with old check time
      auth.user.value = { username: 'testuser' }
      auth.lastAuthCheck.value = new Date(Date.now() - 6 * 60 * 1000) // 6 minutes ago

      const updatedData = { username: 'testuser', is_admin: false }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedData),
      })

      await auth.initialize()

      expect(fetchMock).toHaveBeenCalled()
    })

    it('should handle initialization errors gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const result = await auth.initialize()

      expect(result).toBe(null)
      expect(auth.user.value).toBe(null)
    })
  })

  describe('Computed Properties', () => {
    it('should compute user display name correctly', async () => {
      const userData = {
        username: 'jdoe',
        display_name: 'John Doe'
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      expect(auth.userDisplayName.value).toBe('John Doe')
      expect(auth.userInitials.value).toBe('JD')
    })

    it('should fallback to username for display name', async () => {
      const userData = {
        username: 'testuser'
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      expect(auth.userDisplayName.value).toBe('testuser')
      expect(auth.userInitials.value).toBe('T')
    })

    it('should compute auth status correctly', async () => {
      // Loading state
      auth.isLoading.value = true
      expect(auth.authStatus.value).toBe('loading')

      // Error state
      auth.isLoading.value = false
      auth.error.value = 'Test error'
      expect(auth.authStatus.value).toBe('error')

      // Authenticated state
      auth.error.value = null
      auth.user.value = { username: 'testuser' }
      auth.lastAuthCheck.value = new Date()
      expect(auth.authStatus.value).toBe('authenticated')

      // Expired state
      auth.lastAuthCheck.value = new Date(Date.now() - 31 * 60 * 1000)
      expect(auth.authStatus.value).toBe('expired')
    })
  })

  describe('Windows Authentication Flow', () => {
    it('should handle Windows authentication headers in production', async () => {
      // Simulate production environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const userData = { username: 'domain\\jdoe' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/current-user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should use development headers in development mode', async () => {
      const userData = { username: 'testuser' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/current-user', 
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      )
    })
  })

  describe('Admin User Validation', () => {
    const adminUsers = ['rcox', 'mikeh', 'tomj']

    adminUsers.forEach(username => {
      it(`should recognize ${username} as admin user`, async () => {
        const userData = {
          username,
          is_admin: true,
          roles: ['admin'],
          permissions: ['admin']
        }

        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(userData),
        })

        await auth.getCurrentUser()

        expect(auth.isAdmin()).toBe(true)
        expect(auth.hasRole('admin')).toBe(true)
        expect(() => auth.requireAdmin()).not.toThrow()
      })
    })

    it('should reject non-admin users from admin functions', async () => {
      const userData = {
        username: 'regularuser',
        is_admin: false
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      expect(auth.isAdmin()).toBe(false)
      expect(() => auth.requireAdmin()).toThrow('Administrative privileges required')
    })
  })

  describe('Session Timeout Handling', () => {
    it('should detect session timeout correctly', async () => {
      const userData = { username: 'testuser' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      // Should not be expired initially
      expect(auth.isAuthExpired()).toBe(false)

      // Advance time beyond session timeout (30 minutes)
      timers.advanceTime(31 * 60 * 1000)

      expect(auth.isAuthExpired()).toBe(true)
      expect(auth.authStatus.value).toBe('expired')
    })

    it('should refresh authentication after timeout', async () => {
      // Set expired authentication
      auth.user.value = { username: 'testuser' }
      auth.lastAuthCheck.value = new Date(Date.now() - 31 * 60 * 1000)

      const refreshedData = { username: 'testuser', is_admin: false }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(refreshedData),
      })

      const result = await auth.initialize()

      expect(fetchMock).toHaveBeenCalled()
      expect(result.username).toBe('testuser')
      expect(auth.isAuthExpired()).toBe(false)
    })
  })

  describe('Error Recovery', () => {
    it('should clear errors on successful authentication', async () => {
      // Set initial error
      auth.error.value = 'Previous error'

      const userData = { username: 'testuser' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      expect(auth.error.value).toBe(null)
    })

    it('should maintain error state on failed authentication', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Auth failed' }),
      })

      await expect(auth.getCurrentUser()).rejects.toThrow()

      expect(auth.error.value).toBeTruthy()
      expect(auth.user.value).toBe(null)
    })
  })
})

describe('useAuthGuard', () => {
  let authGuard
  let mockNext
  let fetchMock

  beforeEach(() => {
    fetchMock = setupFetchMock()
    authGuard = useAuthGuard()
    mockNext = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should allow authenticated user through', async () => {
    const userData = { username: 'testuser', is_admin: false }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(userData),
    })

    const to = { fullPath: '/dashboard', meta: {} }
    const from = { fullPath: '/' }

    await authGuard(to, from, mockNext)

    expect(mockNext).toHaveBeenCalledWith()
  })

  it('should redirect unauthenticated user to login', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Not authenticated'))

    const to = { fullPath: '/dashboard', meta: {} }
    const from = { fullPath: '/' }

    await authGuard(to, from, mockNext)

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Login',
        query: expect.objectContaining({
          redirect: '/dashboard'
        })
      })
    )
  })

  it('should block non-admin from admin routes', async () => {
    const userData = { username: 'user', is_admin: false }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(userData),
    })

    const to = { fullPath: '/admin', meta: { requiresAdmin: true } }
    const from = { fullPath: '/' }

    await authGuard(to, from, mockNext)

    expect(mockNext).toHaveBeenCalledWith({
      name: 'Unauthorized',
      query: { reason: 'admin_required' }
    })
  })

  it('should allow admin user to admin routes', async () => {
    const userData = { username: 'rcox', is_admin: true }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(userData),
    })

    const to = { fullPath: '/admin', meta: { requiresAdmin: true } }
    const from = { fullPath: '/' }

    await authGuard(to, from, mockNext)

    expect(mockNext).toHaveBeenCalledWith()
  })

  it('should check specific permissions for routes', async () => {
    const userData = {
      username: 'user',
      is_admin: false,
      permissions: ['read']
    }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(userData),
    })

    const to = { 
      fullPath: '/reports', 
      meta: { requiredPermission: 'write' } 
    }
    const from = { fullPath: '/' }

    await authGuard(to, from, mockNext)

    expect(mockNext).toHaveBeenCalledWith({
      name: 'Unauthorized',
      query: { 
        reason: 'permission_required',
        permission: 'write'
      }
    })
  })
})

describe('useAuthenticatedApi', () => {
  let authApi
  let fetchMock

  beforeEach(() => {
    fetchMock = setupFetchMock()
    authApi = useAuthenticatedApi()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should make authenticated requests successfully', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'success' }),
    })

    const response = await authApi.authenticatedFetch('/api/test')

    expect(fetchMock).toHaveBeenCalledWith('/api/test', 
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        })
      })
    )

    expect(response.ok).toBe(true)
  })

  it('should retry on authentication failure', async () => {
    const userData = { username: 'testuser', is_admin: false }

    // First call fails with 401, second call (after refresh) succeeds
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      })

    const response = await authApi.authenticatedFetch('/api/test')

    expect(fetchMock).toHaveBeenCalledTimes(3) // Original request, auth refresh, retry
    expect(response.ok).toBe(true)
  })

  it('should not retry non-auth errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const response = await authApi.authenticatedFetch('/api/test')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.ok).toBe(false)
    expect(response.status).toBe(500)
  })
})

describe('Integration with Windows Authentication', () => {
  let auth
  let fetchMock

  beforeEach(() => {
    fetchMock = setupFetchMock()
    auth = useAuth()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle domain\\username format', async () => {
    const userData = {
      username: 'COMPANY\\jdoe',
      display_name: 'John Doe'
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(userData),
    })

    const result = await auth.getCurrentUser()

    expect(result.username).toBe('COMPANY\\jdoe')
    expect(result.displayName).toBe('John Doe')
  })

  it('should handle username@domain format', async () => {
    const userData = {
      username: 'jdoe@company.com',
      email: 'jdoe@company.com'
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(userData),
    })

    const result = await auth.getCurrentUser()

    expect(result.username).toBe('jdoe@company.com')
    expect(result.email).toBe('jdoe@company.com')
  })

  it('should validate known admin usernames', async () => {
    const testCases = [
      { username: 'rcox', shouldBeAdmin: true },
      { username: 'mikeh', shouldBeAdmin: true },
      { username: 'tomj', shouldBeAdmin: true },
      { username: 'regularuser', shouldBeAdmin: false }
    ]

    for (const testCase of testCases) {
      const userData = {
        username: testCase.username,
        is_admin: testCase.shouldBeAdmin
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userData),
      })

      await auth.getCurrentUser()

      expect(auth.isAdmin()).toBe(testCase.shouldBeAdmin)
      
      // Reset for next iteration
      auth.logout()
      fetchMock.mockClear()
    }
  })
})

describe('Error Scenarios', () => {
  let auth
  let fetchMock

  beforeEach(() => {
    fetchMock = setupFetchMock()
    auth = useAuth()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle server unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'))

    await expect(auth.getCurrentUser()).rejects.toThrow('Failed to fetch')
    expect(auth.authStatus.value).toBe('error')
  })

  it('should handle malformed server response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    await expect(auth.getCurrentUser()).rejects.toThrow('Invalid JSON')
  })

  it('should handle empty server response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })

    await expect(auth.getCurrentUser()).rejects.toThrow(
      'Invalid user data received from server'
    )
  })
})

describe('Performance and Cleanup', () => {
  let auth
  let fetchMock
  let timers

  beforeEach(() => {
    fetchMock = setupFetchMock()
    timers = mockTimers()
    auth = useAuth()
  })

  afterEach(() => {
    timers.restore()
    vi.clearAllMocks()
  })

  it('should cache authentication results for performance', async () => {
    const userData = { username: 'testuser' }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(userData),
    })

    // First call
    await auth.initialize()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Second call within cache time - should not make API call
    await auth.initialize()
    expect(fetchMock).toHaveBeenCalledTimes(1) // Still 1
  })

  it('should refresh after cache expiration', async () => {
    const userData = { username: 'testuser' }
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(userData),
    })

    // First call
    await auth.initialize()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Advance time beyond auth check interval
    timers.advanceTime(6 * 60 * 1000) // 6 minutes

    // Second call should refresh
    await auth.initialize()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})