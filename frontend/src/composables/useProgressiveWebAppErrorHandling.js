import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useProgressiveWebAppErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Progressive web app specific error types
  const PROGRESSIVE_WEB_APP_ERRORS = {
    PWA_INSTALLATION_FAILED: 'pwa-installation-failed',
    PWA_UNINSTALLATION_FAILED: 'pwa-uninstallation-failed',
    PWA_UPDATE_FAILED: 'pwa-update-failed',
    PWA_MANIFEST_FAILED: 'pwa-manifest-failed',
    PWA_ICON_FAILED: 'pwa-icon-failed',
    PWA_SPLASH_FAILED: 'pwa-splash-failed',
    PWA_THEME_FAILED: 'pwa-theme-failed',
    PWA_ORIENTATION_FAILED: 'pwa-orientation-failed',
    PWA_DISPLAY_FAILED: 'pwa-display-failed',
    PWA_START_URL_FAILED: 'pwa-start-url-failed',
    PWA_SCOPE_FAILED: 'pwa-scope-failed',
    PWA_CATEGORY_FAILED: 'pwa-category-failed',
    PWA_DESCRIPTION_FAILED: 'pwa-description-failed',
    PWA_LANGUAGE_FAILED: 'pwa-language-failed',
    PWA_DIRECTION_FAILED: 'pwa-direction-failed'
  }
  
  // Handle PWA installation errors
  function handlePWAInstallationError(error, pwa, context = {}) {
    const errorContext = {
      operation: 'pwa-installation',
      pwa,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_INSTALLATION_FAILED,
      error,
      errorContext
    }
    
    // PWA installation errors are usually non-critical
    console.warn(`PWA installation failed for ${pwa}:`, error)
  }
  
  // Handle PWA uninstallation errors
  function handlePWAUninstallationError(error, pwa, context = {}) {
    const errorContext = {
      operation: 'pwa-uninstallation',
      pwa,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_UNINSTALLATION_FAILED,
      error,
      errorContext
    }
    
    // PWA uninstallation errors are usually non-critical
    console.warn(`PWA uninstallation failed for ${pwa}:`, error)
  }
  
  // Handle PWA update errors
  function handlePWAUpdateError(error, pwa, update, context = {}) {
    const errorContext = {
      operation: 'pwa-update',
      pwa,
      update,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_UPDATE_FAILED,
      error,
      errorContext
    }
    
    // PWA update errors are usually non-critical
    console.warn(`PWA update failed for ${pwa}:`, update)
  }
  
  // Handle PWA manifest errors
  function handlePWAManifestError(error, pwa, manifest, context = {}) {
    const errorContext = {
      operation: 'pwa-manifest',
      pwa,
      manifest,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_MANIFEST_FAILED,
      error,
      errorContext
    }
    
    // PWA manifest errors are usually non-critical
    console.warn(`PWA manifest failed for ${pwa}:`, manifest)
  }
  
  // Handle PWA icon errors
  function handlePWAIconError(error, pwa, icon, context = {}) {
    const errorContext = {
      operation: 'pwa-icon',
      pwa,
      icon,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_ICON_FAILED,
      error,
      errorContext
    }
    
    // PWA icon errors are usually non-critical
    console.warn(`PWA icon failed for ${pwa}:`, icon)
  }
  
  // Handle PWA splash errors
  function handlePWASplashError(error, pwa, splash, context = {}) {
    const errorContext = {
      operation: 'pwa-splash',
      pwa,
      splash,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_SPLASH_FAILED,
      error,
      errorContext
    }
    
    // PWA splash errors are usually non-critical
    console.warn(`PWA splash failed for ${pwa}:`, splash)
  }
  
  // Handle PWA theme errors
  function handlePWAThemeError(error, pwa, theme, context = {}) {
    const errorContext = {
      operation: 'pwa-theme',
      pwa,
      theme,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_THEME_FAILED,
      error,
      errorContext
    }
    
    // PWA theme errors are usually non-critical
    console.warn(`PWA theme failed for ${pwa}:`, theme)
  }
  
  // Handle PWA orientation errors
  function handlePWAOrientationError(error, pwa, orientation, context = {}) {
    const errorContext = {
      operation: 'pwa-orientation',
      pwa,
      orientation,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_ORIENTATION_FAILED,
      error,
      errorContext
    }
    
    // PWA orientation errors are usually non-critical
    console.warn(`PWA orientation failed for ${pwa}:`, orientation)
  }
  
  // Handle PWA display errors
  function handlePWADisplayError(error, pwa, display, context = {}) {
    const errorContext = {
      operation: 'pwa-display',
      pwa,
      display,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_DISPLAY_FAILED,
      error,
      errorContext
    }
    
    // PWA display errors are usually non-critical
    console.warn(`PWA display failed for ${pwa}:`, display)
  }
  
  // Handle PWA start URL errors
  function handlePWAStartURLError(error, pwa, startURL, context = {}) {
    const errorContext = {
      operation: 'pwa-start-url',
      pwa,
      startURL,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_START_URL_FAILED,
      error,
      errorContext
    }
    
    // PWA start URL errors are usually non-critical
    console.warn(`PWA start URL failed for ${pwa}:`, startURL)
  }
  
  // Handle PWA scope errors
  function handlePWAScopeError(error, pwa, scope, context = {}) {
    const errorContext = {
      operation: 'pwa-scope',
      pwa,
      scope,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_SCOPE_FAILED,
      error,
      errorContext
    }
    
    // PWA scope errors are usually non-critical
    console.warn(`PWA scope failed for ${pwa}:`, scope)
  }
  
  // Handle PWA category errors
  function handlePWACategoryError(error, pwa, category, context = {}) {
    const errorContext = {
      operation: 'pwa-category',
      pwa,
      category,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_CATEGORY_FAILED,
      error,
      errorContext
    }
    
    // PWA category errors are usually non-critical
    console.warn(`PWA category failed for ${pwa}:`, category)
  }
  
  // Handle PWA description errors
  function handlePWADescriptionError(error, pwa, description, context = {}) {
    const errorContext = {
      operation: 'pwa-description',
      pwa,
      description,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_DESCRIPTION_FAILED,
      error,
      errorContext
    }
    
    // PWA description errors are usually non-critical
    console.warn(`PWA description failed for ${pwa}:`, description)
  }
  
  // Handle PWA language errors
  function handlePWALanguageError(error, pwa, language, context = {}) {
    const errorContext = {
      operation: 'pwa-language',
      pwa,
      language,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_LANGUAGE_FAILED,
      error,
      errorContext
    }
    
    // PWA language errors are usually non-critical
    console.warn(`PWA language failed for ${pwa}:`, language)
  }
  
  // Handle PWA direction errors
  function handlePWADirectionError(error, pwa, direction, context = {}) {
    const errorContext = {
      operation: 'pwa-direction',
      pwa,
      direction,
      ...context
    }
    
    errorHandling.addError(
      PROGRESSIVE_WEB_APP_ERRORS.PWA_DIRECTION_FAILED,
      error,
      errorContext
    }
    
    // PWA direction errors are usually non-critical
    console.warn(`PWA direction failed for ${pwa}:`, direction)
  }
  
  // Execute PWA operation with error handling
  async function executePWAOperation(operation, operationFunction, context = {}) {
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
  
  // Get PWA error summary
  function getPWAErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add PWA specific analysis
    summary.pwaErrors = {
      installationErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_INSTALLATION_FAILED] || 0,
      uninstallationErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_UNINSTALLATION_FAILED] || 0,
      updateErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_UPDATE_FAILED] || 0,
      manifestErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_MANIFEST_FAILED] || 0,
      iconErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_ICON_FAILED] || 0,
      splashErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_SPLASH_FAILED] || 0,
      themeErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_THEME_FAILED] || 0,
      orientationErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_ORIENTATION_FAILED] || 0,
      displayErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_DISPLAY_FAILED] || 0,
      startURLErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_START_URL_FAILED] || 0,
      scopeErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_SCOPE_FAILED] || 0,
      categoryErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_CATEGORY_FAILED] || 0,
      descriptionErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_DESCRIPTION_FAILED] || 0,
      languageErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_LANGUAGE_FAILED] || 0,
      directionErrors: summary.errorTypes[PROGRESSIVE_WEB_APP_ERRORS.PWA_DIRECTION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear PWA errors
  function clearPWAErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // PWA specific methods
    handlePWAInstallationError,
    handlePWAUninstallationError,
    handlePWAUpdateError,
    handlePWAManifestError,
    handlePWAIconError,
    handlePWASplashError,
    handlePWAThemeError,
    handlePWAOrientationError,
    handlePWADisplayError,
    handlePWAStartURLError,
    handlePWAScopeError,
    handlePWACategoryError,
    handlePWADescriptionError,
    handlePWALanguageError,
    handlePWADirectionError,
    
    // Utility methods
    executePWAOperation,
    getPWAErrorSummary,
    clearPWAErrors,
    
    // Constants
    PROGRESSIVE_WEB_APP_ERRORS
  }
}


