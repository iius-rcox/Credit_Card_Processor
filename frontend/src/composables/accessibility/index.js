// Accessibility Composables Index
// This file exports all accessibility composables for easy importing

// Core accessibility composables
export { useKeyboardNavigation } from '../useKeyboardNavigation'
export { useFocusManagement } from '../useFocusManagement'

// ARIA utilities
export { ariaHelpers } from '../../utils/aria'

// Accessibility constants
export const ACCESSIBILITY_CONSTANTS = {
  ROLES: {
    BUTTON: 'button',
    CHECKBOX: 'checkbox',
    DIALOG: 'dialog',
    GRID: 'grid',
    LISTBOX: 'listbox',
    MENU: 'menu',
    MENUITEM: 'menuitem',
    OPTION: 'option',
    TAB: 'tab',
    TABLIST: 'tablist',
    TABPANEL: 'tabpanel',
    TOOLBAR: 'toolbar',
    REGION: 'region',
    STATUS: 'status',
    ALERT: 'alert',
    PROGRESSBAR: 'progressbar'
  },
  
  ARIA_LIVE: {
    POLITE: 'polite',
    ASSERTIVE: 'assertive',
    OFF: 'off'
  },
  
  ARIA_ORIENTATION: {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
  },
  
  ARIA_SELECTED: {
    TRUE: 'true',
    FALSE: 'false',
    MIXED: 'mixed'
  },
  
  ARIA_EXPANDED: {
    TRUE: 'true',
    FALSE: 'false'
  },
  
  ARIA_PRESSED: {
    TRUE: 'true',
    FALSE: 'false',
    MIXED: 'mixed'
  }
}

// Accessibility categories
export const ACCESSIBILITY_CATEGORIES = {
  KEYBOARD: 'keyboard',
  FOCUS: 'focus',
  ARIA: 'aria',
  SCREEN_READER: 'screen_reader',
  MOTOR: 'motor',
  COGNITIVE: 'cognitive',
  VISUAL: 'visual',
  AUDITORY: 'auditory'
}

// Accessibility severity levels
export const ACCESSIBILITY_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

// Accessibility status levels
export const ACCESSIBILITY_STATUS = {
  GOOD: 'good',
  POOR: 'poor',
  CRITICAL: 'critical'
}

// Helper function to get all accessibility composables
export function getAllAccessibilityComposables() {
  return {
    useKeyboardNavigation,
    useFocusManagement
  }
}

// Helper function to create a comprehensive accessibility manager
export function createAccessibilityManager() {
  const keyboard = useKeyboardNavigation()
  const focus = useFocusManagement()

  return {
    // Core functionality
    keyboard,
    focus,
    aria: ariaHelpers,

    // Combined methods
    enableAll: () => {
      keyboard.enableKeyboardNavigation?.()
      focus.enableFocusManagement?.()
    },

    disableAll: () => {
      keyboard.disableKeyboardNavigation?.()
      focus.disableFocusManagement?.()
    },

    getComprehensiveReport: () => {
      return {
        keyboard: keyboard.getNavigationState?.() || null,
        focus: focus.getFocusState?.() || null,
        aria: {
          liveRegion: document.getElementById('aria-live-region') ? 'present' : 'missing'
        }
      }
    },

    setupAccessibility: (container = document) => {
      // Create live region for announcements
      ariaHelpers.createLiveRegion()
      
      // Update focusable elements
      focus.updateFocusableElements(container)
      
      // Enable keyboard navigation
      keyboard.enableKeyboardNavigation?.()
      
      // Enable focus management
      focus.enableFocusManagement?.()
    },

    cleanupAccessibility: () => {
      // Remove live region
      ariaHelpers.removeLiveRegion?.()
      
      // Disable keyboard navigation
      keyboard.disableKeyboardNavigation?.()
      
      // Disable focus management
      focus.disableFocusManagement?.()
      
      // Remove focus trap
      focus.removeFocusTrap?.()
    }
  }
}

// Accessibility testing utilities
export const ACCESSIBILITY_TESTING = {
  // Test keyboard navigation
  testKeyboardNavigation: (container = document) => {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      issues: []
    }

    // Test focusable elements
    const focusableElements = ariaHelpers.getFocusableElements?.(container) || []
    results.total = focusableElements.length

    focusableElements.forEach((element, index) => {
      const accessibleName = ariaHelpers.getAccessibleName?.(element)
      if (!accessibleName) {
        results.failed++
        results.issues.push({
          element,
          issue: 'Missing accessible name',
          severity: 'high'
        })
      } else {
        results.passed++
      }
    })

    return results
  },

  // Test ARIA attributes
  testARIAAttributes: (container = document) => {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      issues: []
    }

    const elementsWithRoles = container.querySelectorAll('[role]')
    results.total = elementsWithRoles.length

    elementsWithRoles.forEach(element => {
      const role = element.getAttribute('role')
      const hasLabel = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')
      
      if (!hasLabel) {
        results.failed++
        results.issues.push({
          element,
          issue: `Element with role "${role}" missing accessible name`,
          severity: 'high'
        })
      } else {
        results.passed++
      }
    })

    return results
  },

  // Test focus management
  testFocusManagement: (container = document) => {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      issues: []
    }

    const focusableElements = ariaHelpers.getFocusableElements?.(container) || []
    results.total = focusableElements.length

    focusableElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex')
      if (tabIndex === '0' || tabIndex === null) {
        results.passed++
      } else if (tabIndex === '-1') {
        results.failed++
        results.issues.push({
          element,
          issue: 'Element has tabindex="-1" but is focusable',
          severity: 'medium'
        })
      } else {
        results.passed++
      }
    })

    return results
  }
}

// Accessibility hooks
export const ACCESSIBILITY_HOOKS = {
  // Hook into component mount for accessibility setup
  onComponentMount: (componentName, callback) => {
    return {
      mounted: () => {
        callback(componentName)
      }
    }
  },

  // Hook into component unmount for accessibility cleanup
  onComponentUnmount: (componentName, callback) => {
    return {
      unmounted: () => {
        callback(componentName)
      }
    }
  },

  // Hook into focus changes
  onFocusChange: (callback) => {
    return {
      focus: (event) => {
        callback(event.target, 'focus')
      },
      blur: (event) => {
        callback(event.target, 'blur')
      }
    }
  }
}




