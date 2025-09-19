import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useUIErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // UI specific error types
  const UI_ERRORS = {
    COMPONENT_RENDER_FAILED: 'component-render-failed',
    COMPONENT_MOUNT_FAILED: 'component-mount-failed',
    COMPONENT_UPDATE_FAILED: 'component-update-failed',
    COMPONENT_UNMOUNT_FAILED: 'component-unmount-failed',
    MODAL_OPEN_FAILED: 'modal-open-failed',
    MODAL_CLOSE_FAILED: 'modal-close-failed',
    DRAWER_OPEN_FAILED: 'drawer-open-failed',
    DRAWER_CLOSE_FAILED: 'drawer-close-failed',
    TOOLTIP_SHOW_FAILED: 'tooltip-show-failed',
    TOOLTIP_HIDE_FAILED: 'tooltip-hide-failed',
    ANIMATION_FAILED: 'animation-failed',
    TRANSITION_FAILED: 'transition-failed',
    FOCUS_MANAGEMENT_FAILED: 'focus-management-failed',
    KEYBOARD_NAVIGATION_FAILED: 'keyboard-navigation-failed',
    ACCESSIBILITY_FAILED: 'accessibility-failed',
    THEME_SWITCH_FAILED: 'theme-switch-failed',
    RESPONSIVE_LAYOUT_FAILED: 'responsive-layout-failed'
  }
  
  // Handle component render errors
  function handleComponentRenderError(error, componentName, props, context = {}) {
    const errorContext = {
      operation: 'component-render',
      componentName,
      props,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.COMPONENT_RENDER_FAILED,
      error,
      errorContext
    )
    
    // Show user-friendly error message
    notificationStore.addError(
      `Failed to render ${componentName} component. Please refresh the page.`
    )
  }
  
  // Handle component mount errors
  function handleComponentMountError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-mount',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.COMPONENT_MOUNT_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to initialize ${componentName} component. Please refresh the page.`
    )
  }
  
  // Handle component update errors
  function handleComponentUpdateError(error, componentName, updateData, context = {}) {
    const errorContext = {
      operation: 'component-update',
      componentName,
      updateData,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.COMPONENT_UPDATE_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to update ${componentName} component. Some changes may not be visible.`
    )
  }
  
  // Handle component unmount errors
  function handleComponentUnmountError(error, componentName, context = {}) {
    const errorContext = {
      operation: 'component-unmount',
      componentName,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.COMPONENT_UNMOUNT_FAILED,
      error,
      errorContext
    )
    
    // Unmount errors are usually non-critical
    console.warn(`Failed to unmount ${componentName} component:`, error)
  }
  
  // Handle modal open errors
  function handleModalOpenError(error, modalName, context = {}) {
    const errorContext = {
      operation: 'modal-open',
      modalName,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.MODAL_OPEN_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to open ${modalName} modal. Please try again.`
    )
  }
  
  // Handle modal close errors
  function handleModalCloseError(error, modalName, context = {}) {
    const errorContext = {
      operation: 'modal-close',
      modalName,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.MODAL_CLOSE_FAILED,
      error,
      errorContext
    )
    
    // Modal close errors are usually non-critical
    console.warn(`Failed to close ${modalName} modal:`, error)
  }
  
  // Handle drawer open errors
  function handleDrawerOpenError(error, drawerName, context = {}) {
    const errorContext = {
      operation: 'drawer-open',
      drawerName,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.DRAWER_OPEN_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to open ${drawerName} drawer. Please try again.`
    )
  }
  
  // Handle drawer close errors
  function handleDrawerCloseError(error, drawerName, context = {}) {
    const errorContext = {
      operation: 'drawer-close',
      drawerName,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.DRAWER_CLOSE_FAILED,
      error,
      errorContext
    )
    
    // Drawer close errors are usually non-critical
    console.warn(`Failed to close ${drawerName} drawer:`, error)
  }
  
  // Handle tooltip show errors
  function handleTooltipShowError(error, tooltipContent, context = {}) {
    const errorContext = {
      operation: 'tooltip-show',
      tooltipContent,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.TOOLTIP_SHOW_FAILED,
      error,
      errorContext
    )
    
    // Tooltip errors are usually non-critical
    console.warn('Failed to show tooltip:', error)
  }
  
  // Handle tooltip hide errors
  function handleTooltipHideError(error, tooltipContent, context = {}) {
    const errorContext = {
      operation: 'tooltip-hide',
      tooltipContent,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.TOOLTIP_HIDE_FAILED,
      error,
      errorContext
    )
    
    // Tooltip errors are usually non-critical
    console.warn('Failed to hide tooltip:', error)
  }
  
  // Handle animation errors
  function handleAnimationError(error, animationName, element, context = {}) {
    const errorContext = {
      operation: 'animation',
      animationName,
      element,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.ANIMATION_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Animation failed for ${animationName}:`, error)
  }
  
  // Handle transition errors
  function handleTransitionError(error, transitionName, element, context = {}) {
    const errorContext = {
      operation: 'transition',
      transitionName,
      element,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.TRANSITION_FAILED,
      error,
      errorContext
    )
    
    // Transition errors are usually non-critical
    console.warn(`Transition failed for ${transitionName}:`, error)
  }
  
  // Handle focus management errors
  function handleFocusManagementError(error, focusTarget, context = {}) {
    const errorContext = {
      operation: 'focus-management',
      focusTarget,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.FOCUS_MANAGEMENT_FAILED,
      error,
      errorContext
    )
    
    // Focus errors are usually non-critical
    console.warn('Focus management failed:', error)
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
      UI_ERRORS.KEYBOARD_NAVIGATION_FAILED,
      error,
      errorContext
    )
    
    // Keyboard navigation errors are usually non-critical
    console.warn(`Keyboard navigation failed for key ${key}:`, error)
  }
  
  // Handle accessibility errors
  function handleAccessibilityError(error, accessibilityFeature, context = {}) {
    const errorContext = {
      operation: 'accessibility',
      accessibilityFeature,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.ACCESSIBILITY_FAILED,
      error,
      errorContext
    )
    
    // Accessibility errors are usually non-critical
    console.warn(`Accessibility feature failed for ${accessibilityFeature}:`, error)
  }
  
  // Handle theme switch errors
  function handleThemeSwitchError(error, themeName, context = {}) {
    const errorContext = {
      operation: 'theme-switch',
      themeName,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.THEME_SWITCH_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning(
      `Failed to switch to ${themeName} theme. Using default theme.`
    )
  }
  
  // Handle responsive layout errors
  function handleResponsiveLayoutError(error, breakpoint, context = {}) {
    const errorContext = {
      operation: 'responsive-layout',
      breakpoint,
      ...context
    }
    
    errorHandling.addError(
      UI_ERRORS.RESPONSIVE_LAYOUT_FAILED,
      error,
      errorContext
    )
    
    // Responsive layout errors are usually non-critical
    console.warn(`Responsive layout failed for breakpoint ${breakpoint}:`, error)
  }
  
  // Execute UI operation with error handling
  async function executeUIOperation(operation, operationFunction, context = {}) {
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
  
  // Get UI error summary
  function getUIErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add UI specific analysis
    summary.uiErrors = {
      componentErrors: summary.errorTypes[UI_ERRORS.COMPONENT_RENDER_FAILED] || 0,
      modalErrors: summary.errorTypes[UI_ERRORS.MODAL_OPEN_FAILED] || 0,
      drawerErrors: summary.errorTypes[UI_ERRORS.DRAWER_OPEN_FAILED] || 0,
      tooltipErrors: summary.errorTypes[UI_ERRORS.TOOLTIP_SHOW_FAILED] || 0,
      animationErrors: summary.errorTypes[UI_ERRORS.ANIMATION_FAILED] || 0,
      transitionErrors: summary.errorTypes[UI_ERRORS.TRANSITION_FAILED] || 0,
      focusErrors: summary.errorTypes[UI_ERRORS.FOCUS_MANAGEMENT_FAILED] || 0,
      keyboardErrors: summary.errorTypes[UI_ERRORS.KEYBOARD_NAVIGATION_FAILED] || 0,
      accessibilityErrors: summary.errorTypes[UI_ERRORS.ACCESSIBILITY_FAILED] || 0,
      themeErrors: summary.errorTypes[UI_ERRORS.THEME_SWITCH_FAILED] || 0,
      responsiveErrors: summary.errorTypes[UI_ERRORS.RESPONSIVE_LAYOUT_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear UI errors
  function clearUIErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // UI specific methods
    handleComponentRenderError,
    handleComponentMountError,
    handleComponentUpdateError,
    handleComponentUnmountError,
    handleModalOpenError,
    handleModalCloseError,
    handleDrawerOpenError,
    handleDrawerCloseError,
    handleTooltipShowError,
    handleTooltipHideError,
    handleAnimationError,
    handleTransitionError,
    handleFocusManagementError,
    handleKeyboardNavigationError,
    handleAccessibilityError,
    handleThemeSwitchError,
    handleResponsiveLayoutError,
    
    // Utility methods
    executeUIOperation,
    getUIErrorSummary,
    clearUIErrors,
    
    // Constants
    UI_ERRORS
  }
}




