<template>
  <div :class="containerClasses">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center space-x-2" role="status" aria-label="Authenticating user">
      <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
      <span class="text-sm text-gray-600">Authenticating...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" :class="errorClasses" role="alert" aria-live="polite">
      <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>
      <span class="text-sm">{{ error }}</span>
      <button 
        @click="retry" 
        class="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
        aria-label="Retry authentication"
      >
        Retry
      </button>
    </div>

    <!-- Authenticated State -->
    <div v-else-if="user" :class="userDisplayClasses">
      <!-- User Avatar/Icon -->
      <div :class="avatarClasses" :aria-label="`User avatar for ${userDisplayName}`" role="img">
        <span class="text-sm font-medium text-white" aria-hidden="true">
          {{ userInitials }}
        </span>
      </div>

      <!-- User Information -->
      <div :class="userInfoClasses">
        <div class="flex items-center space-x-2">
          <span :class="usernameClasses">
            {{ userDisplayName }}
          </span>
          
          <!-- Admin Badge -->
          <span 
            v-if="isAdmin" 
            :class="adminBadgeClasses"
            title="Administrator"
            role="status"
            aria-label="User has administrator privileges"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            Admin
          </span>
        </div>

        <!-- Department/Role Info (if available) -->
        <div v-if="showDetails && user.department" class="text-xs text-gray-500 mt-1">
          {{ user.department }}
        </div>

        <!-- Last Login (if available and showing details) -->
        <div v-if="showDetails && user.lastLogin" class="text-xs text-gray-500 mt-1">
          Last: {{ formatLastLogin(user.lastLogin) }}
        </div>
      </div>


      <!-- Logout/Actions Button -->
      <button
        v-if="showLogout"
        @click="handleLogout"
        :class="logoutButtonClasses"
        title="Clear Session"
        aria-label="Clear authentication session"
        type="button"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        <span v-if="layout !== 'compact'" class="ml-1">Logout</span>
      </button>
    </div>

    <!-- Unauthenticated State -->
    <div v-else :class="unauthenticatedClasses" role="status" aria-label="User not authenticated">
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
      <span class="text-sm text-gray-500 ml-2">Not authenticated</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

// Component Props
const props = defineProps({
  layout: {
    type: String,
    default: 'horizontal',
    validator: (value) => ['horizontal', 'vertical', 'compact', 'header', 'sidebar', 'footer'].includes(value)
  },
  showDetails: {
    type: Boolean,
    default: true
  },
  showLogout: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'card', 'minimal'].includes(value)
  }
})

// Component Emits
const emit = defineEmits(['logout-clicked', 'auth-error'])

// Authentication Composable
const { 
  user, 
  isLoading, 
  error, 
  isAuthenticated, 
  userDisplayName, 
  userInitials, 
  isAdmin, 
  initialize, 
  logout 
} = useAuth()

// Local State
const showingDetails = ref(false)

// Initialize authentication on component mount
onMounted(async () => {
  try {
    await initialize()
  } catch (err) {
    console.error('Failed to initialize authentication:', err)
    emit('auth-error', err)
  }
})

// Computed Classes for Different Layouts and Variants
const containerClasses = computed(() => {
  const base = 'auth-display'
  const layoutClass = `auth-display--${props.layout}`
  const variantClass = `auth-display--${props.variant}`
  
  const classes = [base, layoutClass, variantClass]
  
  // Layout-specific container classes
  switch (props.layout) {
    case 'header':
      classes.push('flex items-center space-x-3 px-4 py-2')
      break
    case 'sidebar':
      classes.push('flex flex-col space-y-2 p-3')
      break
    case 'footer':
      classes.push('flex items-center justify-between px-4 py-2 text-sm')
      break
    case 'compact':
      classes.push('flex items-center space-x-2')
      break
    case 'vertical':
      classes.push('flex flex-col items-center space-y-2 p-2')
      break
    default: // horizontal
      classes.push('flex items-center space-x-3')
  }
  
  return classes.join(' ')
})

const userDisplayClasses = computed(() => {
  const base = 'flex items-center'
  const spacing = props.layout === 'compact' ? 'space-x-1' : 'space-x-2'
  
  if (props.layout === 'vertical') {
    return 'flex flex-col items-center space-y-2'
  }
  
  return `${base} ${spacing}`
})

const avatarClasses = computed(() => {
  const size = props.layout === 'compact' ? 'w-6 h-6' : 'w-8 h-8'
  const base = `${size} bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0`
  
  return base
})

const userInfoClasses = computed(() => {
  if (props.layout === 'vertical') {
    return 'text-center'
  }
  
  return 'flex-1 min-w-0'
})

const usernameClasses = computed(() => {
  let classes = 'font-medium truncate'
  
  if (props.layout === 'footer' || props.layout === 'compact') {
    classes += ' text-sm'
  } else {
    classes += ' text-base'
  }
  
  return classes
})

const adminBadgeClasses = computed(() => {
  const base = 'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium'
  const colors = 'bg-amber-100 text-amber-800 border border-amber-200'
  
  return `${base} ${colors}`
})


const logoutButtonClasses = computed(() => {
  const base = 'inline-flex items-center px-2 py-1 text-xs font-medium rounded-md transition-colors'
  const colors = 'text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200'
  
  return `${base} ${colors}`
})

const errorClasses = computed(() => {
  return 'flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200'
})

const unauthenticatedClasses = computed(() => {
  return 'flex items-center space-x-2 text-gray-500'
})

// Methods
const retry = async () => {
  try {
    await initialize(true) // Force refresh
  } catch (err) {
    console.error('Retry authentication failed:', err)
    emit('auth-error', err)
  }
}


const handleLogout = () => {
  logout()
  emit('logout-clicked')
}

const formatLastLogin = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Expose for template access
defineExpose({
  user,
  isAuthenticated,
  isAdmin,
  retry,
  initialize
})
</script>

<style scoped>
.auth-display {
  /* Base component styles */
}

.auth-display--card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-3;
}

.auth-display--minimal {
  @apply text-sm;
}

.auth-display--header {
  @apply border-r border-gray-200;
}

.auth-display--sidebar {
  @apply border-b border-gray-200 mb-4;
}

.auth-display--footer {
  @apply border-t border-gray-200 bg-gray-50;
}

/* Hover effects */
.auth-display button:hover {
  transform: translateY(-1px);
}

/* Loading animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .auth-display--horizontal {
    @apply flex-col space-x-0 space-y-2;
  }
}
</style>