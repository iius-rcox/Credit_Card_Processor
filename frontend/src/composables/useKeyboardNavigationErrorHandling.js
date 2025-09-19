import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useKeyboardNavigationErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Keyboard navigation specific error types
  const KEYBOARD_NAVIGATION_ERRORS = {
    FOCUS_MANAGEMENT_FAILED: 'focus-management-failed',
    KEYBOARD_EVENT_FAILED: 'keyboard-event-failed',
    NAVIGATION_FAILED: 'navigation-failed',
    SELECTION_FAILED: 'selection-failed',
    ACTIVATION_FAILED: 'activation-failed',
    ESCAPE_FAILED: 'escape-failed',
    TAB_NAVIGATION_FAILED: 'tab-navigation-failed',
    ARROW_NAVIGATION_FAILED: 'arrow-navigation-failed',
    ENTER_ACTIVATION_FAILED: 'enter-activation-failed',
    SPACE_ACTIVATION_FAILED: 'space-activation-failed',
    SHORTCUT_FAILED: 'shortcut-failed',
    ACCESSIBILITY_FAILED: 'accessibility-failed'
  }
  
  // Handle focus management errors
  function handleFocusManagementError(error, focusTarget, context = {}) {
    const errorContext = {
      operation: 'focus-management',
      focusTarget,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.FOCUS_MANAGEMENT_FAILED,
      error,
      errorContext
    )
    
    // Focus errors are usually non-critical
    console.warn('Focus management failed:', error)
  }
  
  // Handle keyboard event errors
  function handleKeyboardEventError(error, key, element, context = {}) {
    const errorContext = {
      operation: 'keyboard-event',
      key,
      element,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.KEYBOARD_EVENT_FAILED,
      error,
      errorContext
    )
    
    // Keyboard event errors are usually non-critical
    console.warn(`Keyboard event failed for key ${key}:`, error)
  }
  
  // Handle navigation errors
  function handleNavigationError(error, direction, currentIndex, context = {}) {
    const errorContext = {
      operation: 'navigation',
      direction,
      currentIndex,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.NAVIGATION_FAILED,
      error,
      errorContext
    )
    
    // Navigation errors are usually non-critical
    console.warn(`Navigation failed in direction ${direction}:`, error)
  }
  
  // Handle selection errors
  function handleSelectionError(error, selectionType, context = {}) {
    const errorContext = {
      operation: 'selection',
      selectionType,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.SELECTION_FAILED,
      error,
      errorContext
    )
    
    // Selection errors are usually non-critical
    console.warn(`Selection failed for type ${selectionType}:`, error)
  }
  
  // Handle activation errors
  function handleActivationError(error, activationType, context = {}) {
    const errorContext = {
      operation: 'activation',
      activationType,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.ACTIVATION_FAILED,
      error,
      errorContext
    )
    
    // Activation errors are usually non-critical
    console.warn(`Activation failed for type ${activationType}:`, error)
  }
  
  // Handle escape errors
  function handleEscapeError(error, context = {}) {
    const errorContext = {
      operation: 'escape',
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.ESCAPE_FAILED,
      error,
      errorContext
    )
    
    // Escape errors are usually non-critical
    console.warn('Escape operation failed:', error)
  }
  
  // Handle tab navigation errors
  function handleTabNavigationError(error, direction, context = {}) {
    const errorContext = {
      operation: 'tab-navigation',
      direction,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.TAB_NAVIGATION_FAILED,
      error,
      errorContext
    )
    
    // Tab navigation errors are usually non-critical
    console.warn(`Tab navigation failed in direction ${direction}:`, error)
  }
  
  // Handle arrow navigation errors
  function handleArrowNavigationError(error, direction, context = {}) {
    const errorContext = {
      operation: 'arrow-navigation',
      direction,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.ARROW_NAVIGATION_FAILED,
      error,
      errorContext
    )
    
    // Arrow navigation errors are usually non-critical
    console.warn(`Arrow navigation failed in direction ${direction}:`, error)
  }
  
  // Handle enter activation errors
  function handleEnterActivationError(error, context = {}) {
    const errorContext = {
      operation: 'enter-activation',
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.ENTER_ACTIVATION_FAILED,
      error,
      errorContext
    )
    
    // Enter activation errors are usually non-critical
    console.warn('Enter activation failed:', error)
  }
  
  // Handle space activation errors
  function handleSpaceActivationError(error, context = {}) {
    const errorContext = {
      operation: 'space-activation',
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.SPACE_ACTIVATION_FAILED,
      error,
      errorContext
    )
    
    // Space activation errors are usually non-critical
    console.warn('Space activation failed:', error)
  }
  
  // Handle shortcut errors
  function handleShortcutError(error, shortcut, context = {}) {
    const errorContext = {
      operation: 'shortcut',
      shortcut,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.SHORTCUT_FAILED,
      error,
      errorContext
    )
    
    // Shortcut errors are usually non-critical
    console.warn(`Shortcut failed for ${shortcut}:`, error)
  }
  
  // Handle accessibility errors
  function handleAccessibilityError(error, accessibilityFeature, context = {}) {
    const errorContext = {
      operation: 'accessibility',
      accessibilityFeature,
      ...context
    }
    
    errorHandling.addError(
      KEYBOARD_NAVIGATION_ERRORS.ACCESSIBILITY_FAILED,
      error,
      errorContext
    )
    
    // Accessibility errors are usually non-critical
    console.warn(`Accessibility feature failed for ${accessibilityFeature}:`, error)
  }
  
  // Execute keyboard navigation operation with error handling
  async function executeKeyboardNavigationOperation(operation, operationFunction, context = {}) {
    try {
      return await errorHandling.executeWithErrorHandling(
        operationFunction,
        { operation, ...context }
      )
    } catch (error) {
      // The error handling is already done by executeWithErrorHandling
      throw error
    }
  }
  
  // Get keyboard navigation error summary
  function getKeyboardNavigationErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add keyboard navigation specific analysis
    summary.keyboardNavigationErrors = {
      focusErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.FOCUS_MANAGEMENT_FAILED] || 0,
      keyboardEventErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.KEYBOARD_EVENT_FAILED] || 0,
      navigationErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.NAVIGATION_FAILED] || 0,
      selectionErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.SELECTION_FAILED] || 0,
      activationErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.ACTIVATION_FAILED] || 0,
      escapeErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.ESCAPE_FAILED] || 0,
      tabErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.TAB_NAVIGATION_FAILED] || 0,
      arrowErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.ARROW_NAVIGATION_FAILED] || 0,
      enterErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.ENTER_ACTIVATION_FAILED] || 0,
      spaceErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.SPACE_ACTIVATION_FAILED] || 0,
      shortcutErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.SHORTCUT_FAILED] || 0,
      accessibilityErrors: summary.errorTypes[KEYBOARD_NAVIGATION_ERRORS.ACCESSIBILITY_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear keyboard navigation errors
  function clearKeyboardNavigationErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Keyboard navigation specific methods
    handleFocusManagementError,
    handleKeyboardEventError,
    handleNavigationError,
    handleSelectionError,
    handleActivationError,
    handleEscapeError,
    handleTabNavigationError,
    handleArrowNavigationError,
    handleEnterActivationError,
    handleSpaceActivationError,
    handleShortcutError,
    handleAccessibilityError,
    
    // Utility methods
    executeKeyboardNavigationOperation,
    getKeyboardNavigationErrorSummary,
    clearKeyboardNavigationErrors,
    
    // Constants
    KEYBOARD_NAVIGATION_ERRORS
  }
}




