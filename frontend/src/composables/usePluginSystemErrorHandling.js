import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function usePluginSystemErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Plugin system specific error types
  const PLUGIN_SYSTEM_ERRORS = {
    PLUGIN_LOADING_FAILED: 'plugin-loading-failed',
    PLUGIN_INSTALLATION_FAILED: 'plugin-installation-failed',
    PLUGIN_UNINSTALLATION_FAILED: 'plugin-uninstallation-failed',
    PLUGIN_ACTIVATION_FAILED: 'plugin-activation-failed',
    PLUGIN_DEACTIVATION_FAILED: 'plugin-deactivation-failed',
    PLUGIN_CONFIGURATION_FAILED: 'plugin-configuration-failed',
    PLUGIN_EXECUTION_FAILED: 'plugin-execution-failed',
    PLUGIN_HOOK_FAILED: 'plugin-hook-failed',
    PLUGIN_EVENT_FAILED: 'plugin-event-failed',
    PLUGIN_DEPENDENCY_FAILED: 'plugin-dependency-failed',
    PLUGIN_VERSION_FAILED: 'plugin-version-failed',
    PLUGIN_PERMISSION_FAILED: 'plugin-permission-failed',
    PLUGIN_SECURITY_FAILED: 'plugin-security-failed',
    PLUGIN_PERFORMANCE_FAILED: 'plugin-performance-failed',
    PLUGIN_COMPATIBILITY_FAILED: 'plugin-compatibility-failed'
  }
  
  // Handle plugin loading errors
  function handlePluginLoadingError(error, pluginName, context = {}) {
    const errorContext = {
      operation: 'plugin-loading',
      pluginName,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_LOADING_FAILED,
      error,
      errorContext
    )
    
    // Plugin loading errors are usually non-critical
    console.warn(`Plugin loading failed for ${pluginName}:`, error)
  }
  
  // Handle plugin installation errors
  function handlePluginInstallationError(error, pluginName, context = {}) {
    const errorContext = {
      operation: 'plugin-installation',
      pluginName,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_INSTALLATION_FAILED,
      error,
      errorContext
    )
    
    // Plugin installation errors are usually non-critical
    console.warn(`Plugin installation failed for ${pluginName}:`, error)
  }
  
  // Handle plugin uninstallation errors
  function handlePluginUninstallationError(error, pluginName, context = {}) {
    const errorContext = {
      operation: 'plugin-uninstallation',
      pluginName,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_UNINSTALLATION_FAILED,
      error,
      errorContext
    )
    
    // Plugin uninstallation errors are usually non-critical
    console.warn(`Plugin uninstallation failed for ${pluginName}:`, error)
  }
  
  // Handle plugin activation errors
  function handlePluginActivationError(error, pluginName, context = {}) {
    const errorContext = {
      operation: 'plugin-activation',
      pluginName,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_ACTIVATION_FAILED,
      error,
      errorContext
    )
    
    // Plugin activation errors are usually non-critical
    console.warn(`Plugin activation failed for ${pluginName}:`, error)
  }
  
  // Handle plugin deactivation errors
  function handlePluginDeactivationError(error, pluginName, context = {}) {
    const errorContext = {
      operation: 'plugin-deactivation',
      pluginName,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_DEACTIVATION_FAILED,
      error,
      errorContext
    }
    
    // Plugin deactivation errors are usually non-critical
    console.warn(`Plugin deactivation failed for ${pluginName}:`, error)
  }
  
  // Handle plugin configuration errors
  function handlePluginConfigurationError(error, pluginName, config, context = {}) {
    const errorContext = {
      operation: 'plugin-configuration',
      pluginName,
      config,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_CONFIGURATION_FAILED,
      error,
      errorContext
    )
    
    // Plugin configuration errors are usually non-critical
    console.warn(`Plugin configuration failed for ${pluginName}:`, config)
  }
  
  // Handle plugin execution errors
  function handlePluginExecutionError(error, pluginName, execution, context = {}) {
    const errorContext = {
      operation: 'plugin-execution',
      pluginName,
      execution,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_EXECUTION_FAILED,
      error,
      errorContext
    }
    
    // Plugin execution errors are usually non-critical
    console.warn(`Plugin execution failed for ${pluginName}:`, execution)
  }
  
  // Handle plugin hook errors
  function handlePluginHookError(error, pluginName, hook, context = {}) {
    const errorContext = {
      operation: 'plugin-hook',
      pluginName,
      hook,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_HOOK_FAILED,
      error,
      errorContext
    }
    
    // Plugin hook errors are usually non-critical
    console.warn(`Plugin hook failed for ${pluginName}:`, hook)
  }
  
  // Handle plugin event errors
  function handlePluginEventError(error, pluginName, event, context = {}) {
    const errorContext = {
      operation: 'plugin-event',
      pluginName,
      event,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_EVENT_FAILED,
      error,
      errorContext
    }
    
    // Plugin event errors are usually non-critical
    console.warn(`Plugin event failed for ${pluginName}:`, event)
  }
  
  // Handle plugin dependency errors
  function handlePluginDependencyError(error, pluginName, dependency, context = {}) {
    const errorContext = {
      operation: 'plugin-dependency',
      pluginName,
      dependency,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_DEPENDENCY_FAILED,
      error,
      errorContext
    }
    
    // Plugin dependency errors are usually non-critical
    console.warn(`Plugin dependency failed for ${pluginName}:`, dependency)
  }
  
  // Handle plugin version errors
  function handlePluginVersionError(error, pluginName, version, context = {}) {
    const errorContext = {
      operation: 'plugin-version',
      pluginName,
      version,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_VERSION_FAILED,
      error,
      errorContext
    }
    
    // Plugin version errors are usually non-critical
    console.warn(`Plugin version failed for ${pluginName}:`, version)
  }
  
  // Handle plugin permission errors
  function handlePluginPermissionError(error, pluginName, permission, context = {}) {
    const errorContext = {
      operation: 'plugin-permission',
      pluginName,
      permission,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_PERMISSION_FAILED,
      error,
      errorContext
    }
    
    // Plugin permission errors are usually non-critical
    console.warn(`Plugin permission failed for ${pluginName}:`, permission)
  }
  
  // Handle plugin security errors
  function handlePluginSecurityError(error, pluginName, security, context = {}) {
    const errorContext = {
      operation: 'plugin-security',
      pluginName,
      security,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_SECURITY_FAILED,
      error,
      errorContext
    }
    
    // Plugin security errors are usually non-critical
    console.warn(`Plugin security failed for ${pluginName}:`, security)
  }
  
  // Handle plugin performance errors
  function handlePluginPerformanceError(error, pluginName, performance, context = {}) {
    const errorContext = {
      operation: 'plugin-performance',
      pluginName,
      performance,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_PERFORMANCE_FAILED,
      error,
      errorContext
    }
    
    // Plugin performance errors are usually non-critical
    console.warn(`Plugin performance failed for ${pluginName}:`, performance)
  }
  
  // Handle plugin compatibility errors
  function handlePluginCompatibilityError(error, pluginName, compatibility, context = {}) {
    const errorContext = {
      operation: 'plugin-compatibility',
      pluginName,
      compatibility,
      ...context
    }
    
    errorHandling.addError(
      PLUGIN_SYSTEM_ERRORS.PLUGIN_COMPATIBILITY_FAILED,
      error,
      errorContext
    }
    
    // Plugin compatibility errors are usually non-critical
    console.warn(`Plugin compatibility failed for ${pluginName}:`, compatibility)
  }
  
  // Execute plugin system operation with error handling
  async function executePluginSystemOperation(operation, operationFunction, context = {}) {
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
  
  // Get plugin system error summary
  function getPluginSystemErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add plugin system specific analysis
    summary.pluginSystemErrors = {
      loadingErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_LOADING_FAILED] || 0,
      installationErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_INSTALLATION_FAILED] || 0,
      uninstallationErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_UNINSTALLATION_FAILED] || 0,
      activationErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_ACTIVATION_FAILED] || 0,
      deactivationErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_DEACTIVATION_FAILED] || 0,
      configurationErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_CONFIGURATION_FAILED] || 0,
      executionErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_EXECUTION_FAILED] || 0,
      hookErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_HOOK_FAILED] || 0,
      eventErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_EVENT_FAILED] || 0,
      dependencyErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_DEPENDENCY_FAILED] || 0,
      versionErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_VERSION_FAILED] || 0,
      permissionErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_PERMISSION_FAILED] || 0,
      securityErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_SECURITY_FAILED] || 0,
      performanceErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_PERFORMANCE_FAILED] || 0,
      compatibilityErrors: summary.errorTypes[PLUGIN_SYSTEM_ERRORS.PLUGIN_COMPATIBILITY_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear plugin system errors
  function clearPluginSystemErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Plugin system specific methods
    handlePluginLoadingError,
    handlePluginInstallationError,
    handlePluginUninstallationError,
    handlePluginActivationError,
    handlePluginDeactivationError,
    handlePluginConfigurationError,
    handlePluginExecutionError,
    handlePluginHookError,
    handlePluginEventError,
    handlePluginDependencyError,
    handlePluginVersionError,
    handlePluginPermissionError,
    handlePluginSecurityError,
    handlePluginPerformanceError,
    handlePluginCompatibilityError,
    
    // Utility methods
    executePluginSystemOperation,
    getPluginSystemErrorSummary,
    clearPluginSystemErrors,
    
    // Constants
    PLUGIN_SYSTEM_ERRORS
  }
}


