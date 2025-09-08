<template>
  <div>
    <div v-if="hasError" ref="errorBoundaryRef" class="error-boundary-container" role="alert" aria-labelledby="error-title">
      <div class="error-boundary card bg-error-50 border-error-200 max-w-2xl mx-auto">
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0">
            <svg 
              class="h-8 w-8 text-error-600" 
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="flex-1">
            <h2 
              id="error-title"
              class="text-lg font-semibold text-error-800 mb-2"
            >
              Something went wrong
            </h2>
            <p class="text-error-700 mb-4">
              {{ errorMessage }}
            </p>
            
            <!-- Debug info for Safari -->
            <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <h3 class="font-semibold text-blue-800 mb-2">Debug Information:</h3>
              <div class="text-blue-700 space-y-1">
                <div><strong>Time:</strong> {{ new Date().toLocaleString() }}</div>
                <div><strong>Browser:</strong> {{ getBrowserInfo() }}</div>
                <div><strong>Error triggered:</strong> {{ errorTriggered }}</div>
                <div v-if="errorComponentName"><strong>Component:</strong> {{ errorComponentName }}</div>
                <div><strong>Current URL:</strong> {{ getCurrentUrl() }}</div>
              </div>
            </div>
            
            <div v-if="showDetails && errorDetails" class="mb-4">
              <button
                type="button"
                class="text-sm text-error-600 hover:text-error-800 underline focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 rounded"
                @click="toggleDetails"
                :aria-expanded="detailsExpanded"
                aria-controls="error-details"
              >
                {{ detailsExpanded ? 'Hide' : 'Show' }} Details
              </button>
              
              <div 
                v-if="detailsExpanded" 
                id="error-details"
                class="mt-2 p-3 bg-error-100 rounded border text-sm font-mono text-error-800 overflow-auto max-h-40"
                role="region"
                aria-labelledby="error-details-title"
              >
                <h3 id="error-details-title" class="sr-only">Error Details</h3>
                {{ errorDetails }}
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="btn-primary"
                @click="retry"
                :disabled="retryCount >= maxRetries"
                aria-describedby="retry-description"
              >
                {{ retryCount >= maxRetries ? 'Max Retries Reached' : 'Try Again' }}
              </button>
              
              <button
                type="button"
                class="btn-secondary"
                @click="reload"
                aria-describedby="reload-description"
              >
                Reload Page
              </button>
              
              <button
                v-if="canGoHome"
                type="button"
                class="btn-ghost"
                @click="goHome"
                aria-describedby="home-description"
              >
                Go to Home
              </button>
            </div>

            <!-- Screen reader descriptions -->
            <div class="sr-only">
              <div id="retry-description">
                Attempt to retry the failed operation. 
                {{ maxRetries - retryCount }} attempts remaining.
              </div>
              <div id="reload-description">
                Reload the entire page to reset the application state.
              </div>
              <div id="home-description">
                Navigate back to the main application page.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <slot v-else />
  </div>
</template>

<script setup>
import { ref, onErrorCaptured, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification.js'
import { useAccessibility } from '@/composables/useAccessibility.js'

const props = defineProps({
  /**
   * Custom error message to display
   */
  fallbackMessage: {
    type: String,
    default: 'An unexpected error occurred while loading this page.'
  },
  
  /**
   * Whether to show detailed error information
   */
  showDetails: {
    type: Boolean,
    default: import.meta.env.DEV // Show details in development mode
  },

  /**
   * Maximum number of retry attempts
   */
  maxRetries: {
    type: Number,
    default: 3
  },

  /**
   * Whether navigation options should be shown
   */
  showNavigation: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['error', 'retry'])

const router = useRouter()
const notificationStore = useNotificationStore()
const { focus, announce } = useAccessibility()

const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')
const detailsExpanded = ref(false)
const retryCount = ref(0)
const previousFocusElement = ref(null) // Track focus before error
const errorBoundaryRef = ref(null)

// Debug information for Safari troubleshooting
const errorTriggered = ref('')
const errorComponentName = ref('')

const canGoHome = computed(() => {
  return props.showNavigation && router && router.currentRoute.value.path !== '/'
})

/**
 * Handle Vue errors
 */
onErrorCaptured((error, instance, info) => {
  // Capture debug info for Safari
  errorTriggered.value = 'Vue onErrorCaptured'
  errorComponentName.value = instance?.type?.name || instance?.type?.__name || 'Unknown'
  
  console.error('=== ERROR BOUNDARY CAUGHT ERROR ===')
  console.error('Error:', error)
  console.error('Error message:', error?.message)
  console.error('Error stack:', error?.stack)
  console.error('Error name:', error?.name)
  console.error('Component instance:', instance)
  console.error('Component type:', instance?.type)
  console.error('Component name:', instance?.type?.name || instance?.type?.__name)
  console.error('Error info:', info)
  console.error('Props:', instance?.props)
  console.error('Component tree:', instance?.parent?.type?.name)
  console.error('Current route:', router?.currentRoute?.value)
  console.error('=== END ERROR DETAILS ===')

  // Add to window for debugging
  if (typeof window !== 'undefined') {
    window.lastErrorBoundaryError = {
      error,
      instance,
      info,
      timestamp: new Date().toISOString(),
      componentName: errorComponentName.value,
      triggerType: errorTriggered.value
    }
  }

  handleError(error, info)
  
  // Prevent the error from propagating further
  return false
})

/**
 * Handle JavaScript errors
 */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Capture debug info for Safari
    errorTriggered.value = 'JavaScript Error'
    errorComponentName.value = 'Global/Window'
    
    console.error('=== UNHANDLED JAVASCRIPT ERROR ===')
    console.error('Error:', event.error)
    console.error('Message:', event.message)
    console.error('Filename:', event.filename)
    console.error('Line:', event.lineno)
    console.error('Column:', event.colno)
    console.error('Event:', event)
    console.error('=== END JS ERROR ===')
    handleError(event.error, 'Unhandled JavaScript error')
  })

  window.addEventListener('unhandledrejection', (event) => {
    // Capture debug info for Safari
    errorTriggered.value = 'Promise Rejection'
    errorComponentName.value = 'Global/Promise'
    
    console.error('=== UNHANDLED PROMISE REJECTION ===')
    console.error('Reason:', event.reason)
    console.error('Promise:', event.promise)
    console.error('Event:', event)
    console.error('=== END PROMISE REJECTION ===')
    handleError(event.reason, 'Unhandled Promise rejection')
  })
}

/**
 * Handle error state with accessibility focus management
 */
function handleError(error, context = '') {
  // Store the currently focused element before showing error
  if (document.activeElement && document.activeElement !== document.body) {
    previousFocusElement.value = document.activeElement
  }
  
  hasError.value = true
  
  // Set user-friendly error message
  if (error && error.message) {
    errorMessage.value = error.message
  } else {
    errorMessage.value = props.fallbackMessage
  }
  
  // Set technical details for debugging
  if (props.showDetails) {
    if (error && error.stack) {
      errorDetails.value = `${error.name || 'Error'}: ${error.message}\n\nStack trace:\n${error.stack}`
    } else {
      errorDetails.value = `Context: ${context}\nError: ${JSON.stringify(error, null, 2)}`
    }
  }

  // Add error notification
  notificationStore.addError('A component error occurred', {
    title: 'Application Error',
    actions: [{
      label: 'Reload',
      handler: reload
    }]
  })

  // Focus management and screen reader announcement
  nextTick(() => {
    if (errorBoundaryRef.value) {
      // Focus the error container for screen readers
      focus.set(errorBoundaryRef.value)
      
      // Announce error to screen readers
      announce(`Error occurred: ${errorMessage.value}. Use the retry button to attempt recovery.`, 'assertive')
    }
  })

  // Emit error event for parent handling
  emit('error', { error, context })
}

/**
 * Toggle error details visibility
 */
function toggleDetails() {
  detailsExpanded.value = !detailsExpanded.value
}

/**
 * Retry the failed operation with accessibility focus restoration
 */
function retry() {
  if (retryCount.value >= props.maxRetries) {
    notificationStore.addWarning('Maximum retry attempts reached. Please reload the page.')
    return
  }

  retryCount.value++
  
  // Announce retry attempt to screen readers
  announce(`Retry attempt ${retryCount.value} of ${props.maxRetries}`, 'polite')
  
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  detailsExpanded.value = false

  notificationStore.addInfo(`Retrying... (Attempt ${retryCount.value}/${props.maxRetries})`)
  
  emit('retry', { attempt: retryCount.value })

  // Restore focus to previous element after error recovery
  nextTick(() => {
    if (previousFocusElement.value && document.contains(previousFocusElement.value)) {
      try {
        previousFocusElement.value.focus()
        announce('Error recovered, focus restored to previous element', 'polite')
      } catch (focusError) {
        console.warn('Could not restore focus to previous element:', focusError)
        // Fallback: focus main content area
        focus.set('#main-content', 'Error recovered, focus set to main content')
      }
    } else {
      // Fallback: focus main content area if previous element no longer exists
      focus.set('#main-content', 'Error recovered, focus set to main content')
    }
    
    // Clear previous focus reference
    previousFocusElement.value = null
  })

  // Reset error state to try rendering again
  setTimeout(() => {
    // If we're still in error state after a brief delay, 
    // it means the retry didn't work
    if (hasError.value) {
      notificationStore.addError('Retry attempt failed')
      announce('Retry attempt failed', 'assertive')
    } else {
      notificationStore.addSuccess('Recovery successful')
      announce('Error recovery successful', 'polite')
      retryCount.value = 0 // Reset retry count on success
    }
  }, 1000)
}

/**
 * Reload the page
 */
function reload() {
  notificationStore.addInfo('Reloading page...')
  
  // Small delay to let user see the message
  setTimeout(() => {
    window.location.reload()
  }, 500)
}

/**
 * Navigate to home page
 */
function goHome() {
  if (router) {
    notificationStore.addInfo('Navigating to home page...')
    router.push('/').catch(() => {
      // If routing fails, fall back to page reload
      reload()
    })
  } else {
    // Fallback if router is not available
    window.location.href = '/'
  }
}

/**
 * Reset error state (useful for parent components)
 */
function resetError() {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  detailsExpanded.value = false
  retryCount.value = 0
}

/**
 * Get browser info safely
 */
function getBrowserInfo() {
  if (typeof window !== 'undefined' && navigator?.userAgent) {
    return navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'
  }
  return 'Unknown'
}

/**
 * Get current URL safely
 */
function getCurrentUrl() {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.href
  }
  return 'Unknown'
}

// Expose methods for parent components
defineExpose({
  resetError,
  handleError
})
</script>

<style scoped>
.error-boundary-container {
  @apply min-h-screen flex items-center justify-center p-4 bg-neutral-50;
}

.error-boundary {
  @apply p-6;
}
</style>