import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useAccessibilityErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Accessibility specific error types
  const ACCESSIBILITY_ERRORS = {
    ARIA_ATTRIBUTE_FAILED: 'aria-attribute-failed',
    SCREEN_READER_FAILED: 'screen-reader-failed',
    KEYBOARD_NAVIGATION_FAILED: 'keyboard-navigation-failed',
    FOCUS_MANAGEMENT_FAILED: 'focus-management-failed',
    COLOR_CONTRAST_FAILED: 'color-contrast-failed',
    TEXT_ALTERNATIVE_FAILED: 'text-alternative-failed',
    SEMANTIC_HTML_FAILED: 'semantic-html-failed',
    HEADING_STRUCTURE_FAILED: 'heading-structure-failed',
    FORM_LABEL_FAILED: 'form-label-failed',
    LINK_PURPOSE_FAILED: 'link-purpose-failed',
    BUTTON_PURPOSE_FAILED: 'button-purpose-failed',
    TABLE_HEADER_FAILED: 'table-header-failed',
    LIST_STRUCTURE_FAILED: 'list-structure-failed',
    LANDMARK_FAILED: 'landmark-failed',
    LIVE_REGION_FAILED: 'live-region-failed'
  }
  
  // Handle ARIA attribute errors
  function handleARIAttributeError(error, attribute, element, context = {}) {
    const errorContext = {
      operation: 'aria-attribute',
      attribute,
      element,
      ...context
    }
    
    errorHandling.addError(
      ACCESSIBILITY_ERRORS.ARIA_ATTRIBUTE_FAILED,
      error,
      errorContext
    )
    
    // ARIA errors are usually non-critical
    console.warn(`ARIA attribute failed for ${attribute}:`, error)
  }
  
  // Handle screen reader errors
  function handleScreenReaderError(error, announcement, context = {}) {
    const errorContext = {
      operation: 'screen-reader',
      announcement,
      ...context
    }
    
    errorHandling.addError(
      ACCESSIBILITY_ERRORS.SCREEN_READER_FAILED,
      error,
      errorContext
    )
    
    // Screen reader errors are usually non-critical
    console.warn('Screen reader announcement failed:', error)
  }
  
  // Handle keyboard navigation errors
  function handleKeyboardNavigationError(error, key, element, context = {}) {
    const errorContext = {
      operation: 'keyboard-navigation',
      key,
      element,
      ...context
    }
    
    errorHandling.addError(
      ACCESSIBILITY_ERRORS.KEYBOARD_NAVIGATION_FAILED,
      error,
      errorContext
    )
    
    // Keyboard navigation errors are usually non-critical
    console.warn(`Keyboard navigation failed for key ${key}:`, error)
  }
  
  // Handle focus management errors
  function handleFocusManagementError(error, focusTarget, context = {}) {
    const errorContext = {
      operation: 'focus-management',
      focusTarget,
      ...context
    }
    
    errorHandling.addError(
      ACCESSIBILITY_ERRORS.FOCUS_MANAGEMENT_FAILED,
      error,
      errorContext
    )
    
    // Focus errors are usually non-critical
    console.warn('Focus management failed:', error)
  }
  
  // Handle color contrast errors
  function handleColorContrastError(error, element, contrastRatio, context = {}) {
    const errorContext = {
      operation: 'color-contrast',
      element,
      contrastRatio,
      ...context
    }
    
    errorHandling.addError(
      ACCESSIBILITY_ERRORS.COLOR_CONTRAST_FAILED,
      error,
      errorContext
    )
    
    // Color contrast errors are usually non-critical
    console.warn(`Color contrast failed for element:`, error)
  }
  
  // Handle text alternative errors
  function handleTextAlternativeError(error, element, alternativeText, context = {}) {
    const errorContext = {
      operation: 'text-alternative',
      element,
      alternativeText,
      ...context
    }
    
    errorHandling.addError(
      ACCESSIBILITY_ERRORS.TEXT_ALTERNATIVE_FAILED,
      error,
      errorContext
    )
    
    // Text alternative errors are usually non-critical
    console.warn(`Text alternative failed for element:`, error)
  }
  
  // Execute accessibility operation with error handling
  async function executeAccessibilityOperation(operation, operationFunction, context = {}) {
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
  
  // Get accessibility error summary
  function getAccessibilityErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add accessibility specific analysis
    summary.accessibilityErrors = {
      ariaErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.ARIA_ATTRIBUTE_FAILED] || 0,
      screenReaderErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.SCREEN_READER_FAILED] || 0,
      keyboardErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.KEYBOARD_NAVIGATION_FAILED] || 0,
      focusErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.FOCUS_MANAGEMENT_FAILED] || 0,
      contrastErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.COLOR_CONTRAST_FAILED] || 0,
      textAltErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.TEXT_ALTERNATIVE_FAILED] || 0,
      semanticErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.SEMANTIC_HTML_FAILED] || 0,
      headingErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.HEADING_STRUCTURE_FAILED] || 0,
      formLabelErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.FORM_LABEL_FAILED] || 0,
      linkPurposeErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.LINK_PURPOSE_FAILED] || 0,
      buttonPurposeErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.BUTTON_PURPOSE_FAILED] || 0,
      tableHeaderErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.TABLE_HEADER_FAILED] || 0,
      listStructureErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.LIST_STRUCTURE_FAILED] || 0,
      landmarkErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.LANDMARK_FAILED] || 0,
      liveRegionErrors: summary.errorTypes[ACCESSIBILITY_ERRORS.LIVE_REGION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear accessibility errors
  function clearAccessibilityErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Accessibility specific methods
    handleARIAttributeError,
    handleScreenReaderError,
    handleKeyboardNavigationError,
    handleFocusManagementError,
    handleColorContrastError,
    handleTextAlternativeError,
    
    // Utility methods
    executeAccessibilityOperation,
    getAccessibilityErrorSummary,
    clearAccessibilityErrors,
    
    // Constants
    ACCESSIBILITY_ERRORS
  }
}




