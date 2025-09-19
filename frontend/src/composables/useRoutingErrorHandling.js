import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useRoutingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Routing specific error types
  const ROUTING_ERRORS = {
    ROUTE_NOT_FOUND: 'route-not-found',
    ROUTE_ACCESS_DENIED: 'route-access-denied',
    ROUTE_NAVIGATION_FAILED: 'route-navigation-failed',
    ROUTE_GUARD_FAILED: 'route-guard-failed',
    ROUTE_LOADING_FAILED: 'route-loading-failed',
    ROUTE_PARAMETER_FAILED: 'route-parameter-failed',
    ROUTE_QUERY_FAILED: 'route-query-failed',
    ROUTE_HASH_FAILED: 'route-hash-failed',
    ROUTE_REDIRECT_FAILED: 'route-redirect-failed',
    ROUTE_ALIAS_FAILED: 'route-alias-failed',
    ROUTE_META_FAILED: 'route-meta-failed',
    ROUTE_BEFORE_ENTER_FAILED: 'route-before-enter-failed',
    ROUTE_BEFORE_LEAVE_FAILED: 'route-before-leave-failed',
    ROUTE_AFTER_ENTER_FAILED: 'route-after-enter-failed',
    ROUTE_AFTER_LEAVE_FAILED: 'route-after-leave-failed'
  }
  
  // Handle route not found errors
  function handleRouteNotFoundError(error, route, context = {}) {
    const errorContext = {
      operation: 'route-not-found',
      route,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_NOT_FOUND,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Page not found. Please check the URL and try again.'
    )
  }
  
  // Handle route access denied errors
  function handleRouteAccessDeniedError(error, route, user, context = {}) {
    const errorContext = {
      operation: 'route-access-denied',
      route,
      user,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_ACCESS_DENIED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Access denied. You do not have permission to view this page.'
    )
  }
  
  // Handle route navigation errors
  function handleRouteNavigationError(error, fromRoute, toRoute, context = {}) {
    const errorContext = {
      operation: 'route-navigation',
      fromRoute,
      toRoute,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_NAVIGATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Navigation failed. Please try again.'
    )
  }
  
  // Handle route guard errors
  function handleRouteGuardError(error, route, guard, context = {}) {
    const errorContext = {
      operation: 'route-guard',
      route,
      guard,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_GUARD_FAILED,
      error,
      errorContext
    )
    
    // Route guard errors are usually non-critical
    console.warn(`Route guard failed for ${route}:`, guard)
  }
  
  // Handle route loading errors
  function handleRouteLoadingError(error, route, component, context = {}) {
    const errorContext = {
      operation: 'route-loading',
      route,
      component,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_LOADING_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Failed to load page. Please refresh and try again.'
    )
  }
  
  // Handle route parameter errors
  function handleRouteParameterError(error, route, parameter, value, context = {}) {
    const errorContext = {
      operation: 'route-parameter',
      route,
      parameter,
      value,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_PARAMETER_FAILED,
      error,
      errorContext
    )
    
    // Route parameter errors are usually non-critical
    console.warn(`Route parameter failed for ${route}:`, parameter)
  }
  
  // Handle route query errors
  function handleRouteQueryError(error, route, query, context = {}) {
    const errorContext = {
      operation: 'route-query',
      route,
      query,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_QUERY_FAILED,
      error,
      errorContext
    )
    
    // Route query errors are usually non-critical
    console.warn(`Route query failed for ${route}:`, query)
  }
  
  // Handle route hash errors
  function handleRouteHashError(error, route, hash, context = {}) {
    const errorContext = {
      operation: 'route-hash',
      route,
      hash,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_HASH_FAILED,
      error,
      errorContext
    )
    
    // Route hash errors are usually non-critical
    console.warn(`Route hash failed for ${route}:`, hash)
  }
  
  // Handle route redirect errors
  function handleRouteRedirectError(error, fromRoute, toRoute, context = {}) {
    const errorContext = {
      operation: 'route-redirect',
      fromRoute,
      toRoute,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_REDIRECT_FAILED,
      error,
      errorContext
    )
    
    // Route redirect errors are usually non-critical
    console.warn(`Route redirect failed from ${fromRoute} to ${toRoute}`)
  }
  
  // Handle route alias errors
  function handleRouteAliasError(error, route, alias, context = {}) {
    const errorContext = {
      operation: 'route-alias',
      route,
      alias,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_ALIAS_FAILED,
      error,
      errorContext
    )
    
    // Route alias errors are usually non-critical
    console.warn(`Route alias failed for ${route}:`, alias)
  }
  
  // Handle route meta errors
  function handleRouteMetaError(error, route, meta, context = {}) {
    const errorContext = {
      operation: 'route-meta',
      route,
      meta,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_META_FAILED,
      error,
      errorContext
    )
    
    // Route meta errors are usually non-critical
    console.warn(`Route meta failed for ${route}:`, meta)
  }
  
  // Handle route before enter errors
  function handleRouteBeforeEnterError(error, route, context = {}) {
    const errorContext = {
      operation: 'route-before-enter',
      route,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_BEFORE_ENTER_FAILED,
      error,
      errorContext
    )
    
    // Route before enter errors are usually non-critical
    console.warn(`Route before enter failed for ${route}`)
  }
  
  // Handle route before leave errors
  function handleRouteBeforeLeaveError(error, route, context = {}) {
    const errorContext = {
      operation: 'route-before-leave',
      route,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_BEFORE_LEAVE_FAILED,
      error,
      errorContext
    )
    
    // Route before leave errors are usually non-critical
    console.warn(`Route before leave failed for ${route}`)
  }
  
  // Handle route after enter errors
  function handleRouteAfterEnterError(error, route, context = {}) {
    const errorContext = {
      operation: 'route-after-enter',
      route,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_AFTER_ENTER_FAILED,
      error,
      errorContext
    )
    
    // Route after enter errors are usually non-critical
    console.warn(`Route after enter failed for ${route}`)
  }
  
  // Handle route after leave errors
  function handleRouteAfterLeaveError(error, route, context = {}) {
    const errorContext = {
      operation: 'route-after-leave',
      route,
      ...context
    }
    
    errorHandling.addError(
      ROUTING_ERRORS.ROUTE_AFTER_LEAVE_FAILED,
      error,
      errorContext
    )
    
    // Route after leave errors are usually non-critical
    console.warn(`Route after leave failed for ${route}`)
  }
  
  // Execute routing operation with error handling
  async function executeRoutingOperation(operation, operationFunction, context = {}) {
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
  
  // Get routing error summary
  function getRoutingErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add routing specific analysis
    summary.routingErrors = {
      notFoundErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_NOT_FOUND] || 0,
      accessDeniedErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_ACCESS_DENIED] || 0,
      navigationErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_NAVIGATION_FAILED] || 0,
      guardErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_GUARD_FAILED] || 0,
      loadingErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_LOADING_FAILED] || 0,
      parameterErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_PARAMETER_FAILED] || 0,
      queryErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_QUERY_FAILED] || 0,
      hashErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_HASH_FAILED] || 0,
      redirectErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_REDIRECT_FAILED] || 0,
      aliasErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_ALIAS_FAILED] || 0,
      metaErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_META_FAILED] || 0,
      beforeEnterErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_BEFORE_ENTER_FAILED] || 0,
      beforeLeaveErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_BEFORE_LEAVE_FAILED] || 0,
      afterEnterErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_AFTER_ENTER_FAILED] || 0,
      afterLeaveErrors: summary.errorTypes[ROUTING_ERRORS.ROUTE_AFTER_LEAVE_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear routing errors
  function clearRoutingErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Routing specific methods
    handleRouteNotFoundError,
    handleRouteAccessDeniedError,
    handleRouteNavigationError,
    handleRouteGuardError,
    handleRouteLoadingError,
    handleRouteParameterError,
    handleRouteQueryError,
    handleRouteHashError,
    handleRouteRedirectError,
    handleRouteAliasError,
    handleRouteMetaError,
    handleRouteBeforeEnterError,
    handleRouteBeforeLeaveError,
    handleRouteAfterEnterError,
    handleRouteAfterLeaveError,
    
    // Utility methods
    executeRoutingOperation,
    getRoutingErrorSummary,
    clearRoutingErrors,
    
    // Constants
    ROUTING_ERRORS
  }
}




