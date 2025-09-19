import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useAnalyticsErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Analytics specific error types
  const ANALYTICS_ERRORS = {
    ANALYTICS_INITIALIZATION_FAILED: 'analytics-initialization-failed',
    ANALYTICS_CONFIGURATION_FAILED: 'analytics-configuration-failed',
    ANALYTICS_TRACKING_FAILED: 'analytics-tracking-failed',
    ANALYTICS_EVENT_FAILED: 'analytics-event-failed',
    ANALYTICS_PAGE_FAILED: 'analytics-page-failed',
    ANALYTICS_USER_FAILED: 'analytics-user-failed',
    ANALYTICS_SESSION_FAILED: 'analytics-session-failed',
    ANALYTICS_CONVERSION_FAILED: 'analytics-conversion-failed',
    ANALYTICS_FUNNEL_FAILED: 'analytics-funnel-failed',
    ANALYTICS_SEGMENT_FAILED: 'analytics-segment-failed',
    ANALYTICS_COHORT_FAILED: 'analytics-cohort-failed',
    ANALYTICS_RETENTION_FAILED: 'analytics-retention-failed',
    ANALYTICS_ATTRIBUTION_FAILED: 'analytics-attribution-failed',
    ANALYTICS_EXPERIMENT_FAILED: 'analytics-experiment-failed',
    ANALYTICS_REPORT_FAILED: 'analytics-report-failed'
  }
  
  // Handle analytics initialization errors
  function handleAnalyticsInitializationError(error, analytics, context = {}) {
    const errorContext = {
      operation: 'analytics-initialization',
      analytics,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_INITIALIZATION_FAILED,
      error,
      errorContext
    }
    
    // Analytics initialization errors are usually non-critical
    console.warn(`Analytics initialization failed for ${analytics}:`, error)
  }
  
  // Handle analytics configuration errors
  function handleAnalyticsConfigurationError(error, analytics, config, context = {}) {
    const errorContext = {
      operation: 'analytics-configuration',
      analytics,
      config,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_CONFIGURATION_FAILED,
      error,
      errorContext
    }
    
    // Analytics configuration errors are usually non-critical
    console.warn(`Analytics configuration failed for ${analytics}:`, config)
  }
  
  // Handle analytics tracking errors
  function handleAnalyticsTrackingError(error, analytics, tracking, context = {}) {
    const errorContext = {
      operation: 'analytics-tracking',
      analytics,
      tracking,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_TRACKING_FAILED,
      error,
      errorContext
    }
    
    // Analytics tracking errors are usually non-critical
    console.warn(`Analytics tracking failed for ${analytics}:`, tracking)
  }
  
  // Handle analytics event errors
  function handleAnalyticsEventError(error, analytics, event, context = {}) {
    const errorContext = {
      operation: 'analytics-event',
      analytics,
      event,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_EVENT_FAILED,
      error,
      errorContext
    }
    
    // Analytics event errors are usually non-critical
    console.warn(`Analytics event failed for ${analytics}:`, event)
  }
  
  // Handle analytics page errors
  function handleAnalyticsPageError(error, analytics, page, context = {}) {
    const errorContext = {
      operation: 'analytics-page',
      analytics,
      page,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_PAGE_FAILED,
      error,
      errorContext
    }
    
    // Analytics page errors are usually non-critical
    console.warn(`Analytics page failed for ${analytics}:`, page)
  }
  
  // Handle analytics user errors
  function handleAnalyticsUserError(error, analytics, user, context = {}) {
    const errorContext = {
      operation: 'analytics-user',
      analytics,
      user,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_USER_FAILED,
      error,
      errorContext
    }
    
    // Analytics user errors are usually non-critical
    console.warn(`Analytics user failed for ${analytics}:`, user)
  }
  
  // Handle analytics session errors
  function handleAnalyticsSessionError(error, analytics, session, context = {}) {
    const errorContext = {
      operation: 'analytics-session',
      analytics,
      session,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_SESSION_FAILED,
      error,
      errorContext
    }
    
    // Analytics session errors are usually non-critical
    console.warn(`Analytics session failed for ${analytics}:`, session)
  }
  
  // Handle analytics conversion errors
  function handleAnalyticsConversionError(error, analytics, conversion, context = {}) {
    const errorContext = {
      operation: 'analytics-conversion',
      analytics,
      conversion,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_CONVERSION_FAILED,
      error,
      errorContext
    }
    
    // Analytics conversion errors are usually non-critical
    console.warn(`Analytics conversion failed for ${analytics}:`, conversion)
  }
  
  // Handle analytics funnel errors
  function handleAnalyticsFunnelError(error, analytics, funnel, context = {}) {
    const errorContext = {
      operation: 'analytics-funnel',
      analytics,
      funnel,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_FUNNEL_FAILED,
      error,
      errorContext
    }
    
    // Analytics funnel errors are usually non-critical
    console.warn(`Analytics funnel failed for ${analytics}:`, funnel)
  }
  
  // Handle analytics segment errors
  function handleAnalyticsSegmentError(error, analytics, segment, context = {}) {
    const errorContext = {
      operation: 'analytics-segment',
      analytics,
      segment,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_SEGMENT_FAILED,
      error,
      errorContext
    }
    
    // Analytics segment errors are usually non-critical
    console.warn(`Analytics segment failed for ${analytics}:`, segment)
  }
  
  // Handle analytics cohort errors
  function handleAnalyticsCohortError(error, analytics, cohort, context = {}) {
    const errorContext = {
      operation: 'analytics-cohort',
      analytics,
      cohort,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_COHORT_FAILED,
      error,
      errorContext
    }
    
    // Analytics cohort errors are usually non-critical
    console.warn(`Analytics cohort failed for ${analytics}:`, cohort)
  }
  
  // Handle analytics retention errors
  function handleAnalyticsRetentionError(error, analytics, retention, context = {}) {
    const errorContext = {
      operation: 'analytics-retention',
      analytics,
      retention,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_RETENTION_FAILED,
      error,
      errorContext
    }
    
    // Analytics retention errors are usually non-critical
    console.warn(`Analytics retention failed for ${analytics}:`, retention)
  }
  
  // Handle analytics attribution errors
  function handleAnalyticsAttributionError(error, analytics, attribution, context = {}) {
    const errorContext = {
      operation: 'analytics-attribution',
      analytics,
      attribution,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_ATTRIBUTION_FAILED,
      error,
      errorContext
    }
    
    // Analytics attribution errors are usually non-critical
    console.warn(`Analytics attribution failed for ${analytics}:`, attribution)
  }
  
  // Handle analytics experiment errors
  function handleAnalyticsExperimentError(error, analytics, experiment, context = {}) {
    const errorContext = {
      operation: 'analytics-experiment',
      analytics,
      experiment,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_EXPERIMENT_FAILED,
      error,
      errorContext
    }
    
    // Analytics experiment errors are usually non-critical
    console.warn(`Analytics experiment failed for ${analytics}:`, experiment)
  }
  
  // Handle analytics report errors
  function handleAnalyticsReportError(error, analytics, report, context = {}) {
    const errorContext = {
      operation: 'analytics-report',
      analytics,
      report,
      ...context
    }
    
    errorHandling.addError(
      ANALYTICS_ERRORS.ANALYTICS_REPORT_FAILED,
      error,
      errorContext
    }
    
    // Analytics report errors are usually non-critical
    console.warn(`Analytics report failed for ${analytics}:`, report)
  }
  
  // Execute analytics operation with error handling
  async function executeAnalyticsOperation(operation, operationFunction, context = {}) {
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
  
  // Get analytics error summary
  function getAnalyticsErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add analytics specific analysis
    summary.analyticsErrors = {
      initializationErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_INITIALIZATION_FAILED] || 0,
      configurationErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_CONFIGURATION_FAILED] || 0,
      trackingErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_TRACKING_FAILED] || 0,
      eventErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_EVENT_FAILED] || 0,
      pageErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_PAGE_FAILED] || 0,
      userErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_USER_FAILED] || 0,
      sessionErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_SESSION_FAILED] || 0,
      conversionErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_CONVERSION_FAILED] || 0,
      funnelErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_FUNNEL_FAILED] || 0,
      segmentErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_SEGMENT_FAILED] || 0,
      cohortErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_COHORT_FAILED] || 0,
      retentionErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_RETENTION_FAILED] || 0,
      attributionErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_ATTRIBUTION_FAILED] || 0,
      experimentErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_EXPERIMENT_FAILED] || 0,
      reportErrors: summary.errorTypes[ANALYTICS_ERRORS.ANALYTICS_REPORT_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear analytics errors
  function clearAnalyticsErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Analytics specific methods
    handleAnalyticsInitializationError,
    handleAnalyticsConfigurationError,
    handleAnalyticsTrackingError,
    handleAnalyticsEventError,
    handleAnalyticsPageError,
    handleAnalyticsUserError,
    handleAnalyticsSessionError,
    handleAnalyticsConversionError,
    handleAnalyticsFunnelError,
    handleAnalyticsSegmentError,
    handleAnalyticsCohortError,
    handleAnalyticsRetentionError,
    handleAnalyticsAttributionError,
    handleAnalyticsExperimentError,
    handleAnalyticsReportError,
    
    // Utility methods
    executeAnalyticsOperation,
    getAnalyticsErrorSummary,
    clearAnalyticsErrors,
    
    // Constants
    ANALYTICS_ERRORS
  }
}




