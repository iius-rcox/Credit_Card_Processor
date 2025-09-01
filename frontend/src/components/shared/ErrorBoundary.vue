<template>
  <div>
    <div v-if="hasError" ref="errorBoundaryRef" class="error-boundary-container" role="alert" aria-labelledby="error-title">
      <div class="error-boundary card bg-error-50 border-error-200 max-w-2xl mx-auto">
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0">
            <ExclamationTriangleIcon 
              class="h-8 w-8 text-error-600" 
              aria-hidden="true" 
            />
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
import { ExclamationTriangleIcon } from '@heroicons/vue/24/solid'

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

const canGoHome = computed(() => {
  return props.showNavigation && router && router.currentRoute.value.path !== '/'
})

/**
 * Handle Vue errors
 */
onErrorCaptured((error, instance, info) => {
  console.error('Error captured by ErrorBoundary:', error)
  console.error('Component instance:', instance)
  console.error('Error info:', info)

  handleError(error, info)
  
  // Prevent the error from propagating further
  return false
})

/**
 * Handle JavaScript errors
 */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Unhandled JavaScript error:', event.error)
    handleError(event.error, 'Unhandled JavaScript error')
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise rejection:', event.reason)
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