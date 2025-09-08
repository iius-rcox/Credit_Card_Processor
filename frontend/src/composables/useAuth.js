import { ref, computed, inject } from 'vue'
import { useSessionStore } from '@/stores/session'

/**
 * Authentication composable for Windows authentication integration
 * Handles Windows AD authentication, admin validation, and session management
 * Phase 2 implementation: Windows authentication with proper error handling
 * 
 * Security Note: Development mode requires VITE_DEV_USER environment variable
 * to simulate Windows authentication. Never hardcode usernames in production.
 * 
 * Usage:
 * - Production: Relies on Windows authentication headers from the browser/IIS
 * - Development: Set VITE_DEV_USER=your_username in .env.local for testing
 */
export function useAuth() {
  const store = inject('sessionStore', null) || useSessionStore()
  
  // Authentication state
  const user = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const lastAuthCheck = ref(null)
  
  // Authentication configuration
  const AUTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
  const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  
  // API base URL
  const apiBase = '/api'

  // Security validation for development user header
  const validateDevUser = () => {
    // Only allow development authentication in development mode on localhost
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_USER) {
      // Extra validation to prevent accidental production use
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.error('🚨 SECURITY WARNING: Development authentication mode detected on non-localhost domain!')
        return false
      }
      // Warn if using development authentication
      console.warn('🚨 DEVELOPMENT MODE: Using simulated Windows authentication with user:', import.meta.env.VITE_DEV_USER)
    }
    return true
  }

  /**
   * Get current authenticated user from backend
   * Uses Windows authentication headers automatically sent by browser
   * @returns {Promise<Object|null>} User object or null
   */
  async function getCurrentUser() {
    isLoading.value = true
    error.value = null

    // Validate development authentication setup
    if (!validateDevUser()) {
      throw new Error('Development authentication not allowed on this domain')
    }

    try {
      const response = await fetch(`${apiBase}/auth/current-user`, {
        method: 'GET',
        credentials: 'include', // Include Windows auth cookies/headers
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Development mode header - only in development on localhost
          ...(import.meta.env.DEV && 
              import.meta.env.VITE_DEV_USER && 
              (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && {
            'x-dev-user': import.meta.env.VITE_DEV_USER
          })
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required - Windows login not detected')
        }
        if (response.status === 403) {
          throw new Error('Access denied - insufficient privileges')
        }
        
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Authentication failed: ${response.statusText}`)
      }

      const userData = await response.json()
      
      // Validate user data structure
      if (!userData.username) {
        throw new Error('Invalid user data received from server')
      }

      // Update local state
      user.value = {
        id: userData.id || userData.username,
        username: userData.username,
        email: userData.email || `${userData.username}@company.com`,
        isAdmin: userData.is_admin || false,
        department: userData.department || 'Unknown',
        displayName: userData.display_name || userData.username,
        lastLogin: userData.last_login || new Date().toISOString(),
        roles: userData.roles || [],
        permissions: userData.permissions || []
      }

      lastAuthCheck.value = new Date()

      // Update store if available
      if (store && store.setUser) {
        store.setUser(user.value)
        store.setAuthenticated(true)
      }

      return user.value

    } catch (err) {
      console.error('Authentication error:', err)
      error.value = err.message
      user.value = null

      // Update store error state
      if (store && store.setAuthError) {
        store.setAuthError(err.message)
      }

      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if current user has admin privileges
   * @returns {boolean} True if user is admin
   */
  function isAdmin() {
    return user.value?.isAdmin === true
  }

  /**
   * Check if current user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  function hasPermission(permission) {
    if (!user.value) return false
    if (user.value.isAdmin) return true
    return user.value.permissions?.includes(permission) === true
  }

  /**
   * Check if current user has specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has role
   */
  function hasRole(role) {
    if (!user.value) return false
    return user.value.roles?.includes(role) === true
  }

  /**
   * Initialize authentication - get current user if not already loaded
   * @param {boolean} force - Force refresh even if user already loaded
   * @returns {Promise<Object|null>}
   */
  async function initialize(force = false) {
    if (user.value && !force) {
      // Check if we need to refresh based on last check time
      const timeSinceLastCheck = Date.now() - (lastAuthCheck.value?.getTime() || 0)
      if (timeSinceLastCheck < AUTH_CHECK_INTERVAL) {
        return user.value
      }
    }

    try {
      return await getCurrentUser()
    } catch (err) {
      console.warn('Auth initialization failed:', err.message)
      return null
    }
  }

  /**
   * Logout user (clear local state)
   * Note: Windows authentication cannot be truly "logged out" from the application
   * This clears the local session state only
   */
  function logout() {
    user.value = null
    error.value = null
    lastAuthCheck.value = null

    // Clear store state
    if (store) {
      if (store.setUser) store.setUser(null)
      if (store.setAuthenticated) store.setAuthenticated(false)
      if (store.clearAuthError) store.clearAuthError()
    }
  }

  /**
   * Refresh user authentication status
   * @returns {Promise<Object|null>}
   */
  async function refresh() {
    return initialize(true)
  }

  /**
   * Check if authentication is expired based on last check time
   * @returns {boolean} True if authentication might be expired
   */
  function isAuthExpired() {
    if (!lastAuthCheck.value) return true
    
    const timeSinceLastCheck = Date.now() - lastAuthCheck.value.getTime()
    return timeSinceLastCheck > SESSION_TIMEOUT
  }

  /**
   * Validate admin access for sensitive operations
   * @throws {Error} If user is not admin
   */
  function requireAdmin() {
    if (!user.value) {
      throw new Error('Authentication required')
    }
    
    if (!isAdmin()) {
      throw new Error('Administrative privileges required')
    }
  }

  /**
   * Validate specific permission for operations
   * @param {string} permission - Required permission
   * @throws {Error} If user doesn't have permission
   */
  function requirePermission(permission) {
    if (!user.value) {
      throw new Error('Authentication required')
    }
    
    if (!hasPermission(permission)) {
      throw new Error(`Permission required: ${permission}`)
    }
  }

  // Computed properties
  const isAuthenticated = computed(() => !!user.value)
  const userDisplayName = computed(() => user.value?.displayName || user.value?.username || 'Unknown User')
  const userInitials = computed(() => {
    if (!user.value) return '?'
    const name = user.value.displayName || user.value.username
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  })

  const authStatus = computed(() => {
    if (isLoading.value) return 'loading'
    if (error.value) return 'error'
    if (!user.value) return 'unauthenticated'
    if (isAuthExpired()) return 'expired'
    return 'authenticated'
  })

  return {
    // State
    user,
    isLoading,
    error,
    lastAuthCheck,

    // Computed
    isAuthenticated,
    userDisplayName,
    userInitials,
    authStatus,

    // Methods
    getCurrentUser,
    initialize,
    refresh,
    logout,
    
    // Authorization
    isAdmin,
    hasPermission,
    hasRole,
    requireAdmin,
    requirePermission,
    
    // Utilities
    isAuthExpired,
    
    // Constants
    AUTH_CHECK_INTERVAL,
    SESSION_TIMEOUT
  }
}

/**
 * Windows Authentication Guard for Vue Router
 * Usage: beforeEnter: useAuthGuard()
 */
export function useAuthGuard() {
  return async (to, from, next) => {
    const auth = useAuth()
    
    try {
      const user = await auth.initialize()
      
      if (!user) {
        next({
          name: 'Login',
          query: { redirect: to.fullPath }
        })
        return
      }

      // Check for admin routes
      if (to.meta?.requiresAdmin && !auth.isAdmin()) {
        next({
          name: 'Unauthorized',
          query: { reason: 'admin_required' }
        })
        return
      }

      // Check for specific permissions
      if (to.meta?.requiredPermission && !auth.hasPermission(to.meta.requiredPermission)) {
        next({
          name: 'Unauthorized',
          query: { reason: 'permission_required', permission: to.meta.requiredPermission }
        })
        return
      }

      next()
    } catch (error) {
      console.error('Auth guard error:', error)
      next({
        name: 'Login',
        query: { redirect: to.fullPath, error: error.message }
      })
    }
  }
}

/**
 * Composable for authentication-aware API requests
 * Automatically handles authentication errors and retries
 */
export function useAuthenticatedApi() {
  const auth = useAuth()

  /**
   * Make an authenticated API request with automatic retry on auth failure
   * @param {string} url - Request URL
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<Response>}
   */
  async function authenticatedFetch(url, options = {}) {
    let attempt = 0
    const maxAttempts = 2

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
            // Add dev header if needed - only in development on localhost
            ...(import.meta.env.DEV && 
                import.meta.env.VITE_DEV_USER && 
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && {
              'x-dev-user': import.meta.env.VITE_DEV_USER
            })
          }
        })

        // If auth failed and this is the first attempt, try to refresh auth
        if (response.status === 401 && attempt === 0) {
          console.warn('Auth failed, attempting to refresh...')
          await auth.refresh()
          attempt++
          continue
        }

        return response
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error
        }
        attempt++
      }
    }
  }

  return {
    authenticatedFetch,
    ...auth
  }
}