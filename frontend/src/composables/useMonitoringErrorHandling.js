import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useMonitoringErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Monitoring specific error types
  const MONITORING_ERRORS = {
    METRIC_COLLECTION_FAILED: 'metric-collection-failed',
    METRIC_AGGREGATION_FAILED: 'metric-aggregation-failed',
    METRIC_STORAGE_FAILED: 'metric-storage-failed',
    METRIC_RETRIEVAL_FAILED: 'metric-retrieval-failed',
    METRIC_ANALYSIS_FAILED: 'metric-analysis-failed',
    METRIC_ALERT_FAILED: 'metric-alert-failed',
    METRIC_DASHBOARD_FAILED: 'metric-dashboard-failed',
    METRIC_REPORT_FAILED: 'metric-report-failed',
    METRIC_EXPORT_FAILED: 'metric-export-failed',
    METRIC_IMPORT_FAILED: 'metric-import-failed',
    METRIC_SYNC_FAILED: 'metric-sync-failed',
    METRIC_BACKUP_FAILED: 'metric-backup-failed',
    METRIC_RESTORE_FAILED: 'metric-restore-failed',
    METRIC_CLEANUP_FAILED: 'metric-cleanup-failed',
    METRIC_ARCHIVAL_FAILED: 'metric-archival-failed'
  }
  
  // Handle metric collection errors
  function handleMetricCollectionError(error, metricName, context = {}) {
    const errorContext = {
      operation: 'metric-collection',
      metricName,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_COLLECTION_FAILED,
      error,
      errorContext
    )
    
    // Metric collection errors are usually non-critical
    console.warn(`Metric collection failed for ${metricName}:`, error)
  }
  
  // Handle metric aggregation errors
  function handleMetricAggregationError(error, metricName, aggregation, context = {}) {
    const errorContext = {
      operation: 'metric-aggregation',
      metricName,
      aggregation,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_AGGREGATION_FAILED,
      error,
      errorContext
    )
    
    // Metric aggregation errors are usually non-critical
    console.warn(`Metric aggregation failed for ${metricName}:`, aggregation)
  }
  
  // Handle metric storage errors
  function handleMetricStorageError(error, metricName, storage, context = {}) {
    const errorContext = {
      operation: 'metric-storage',
      metricName,
      storage,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_STORAGE_FAILED,
      error,
      errorContext
    )
    
    // Metric storage errors are usually non-critical
    console.warn(`Metric storage failed for ${metricName}:`, storage)
  }
  
  // Handle metric retrieval errors
  function handleMetricRetrievalError(error, metricName, query, context = {}) {
    const errorContext = {
      operation: 'metric-retrieval',
      metricName,
      query,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_RETRIEVAL_FAILED,
      error,
      errorContext
    )
    
    // Metric retrieval errors are usually non-critical
    console.warn(`Metric retrieval failed for ${metricName}:`, query)
  }
  
  // Handle metric analysis errors
  function handleMetricAnalysisError(error, metricName, analysis, context = {}) {
    const errorContext = {
      operation: 'metric-analysis',
      metricName,
      analysis,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_ANALYSIS_FAILED,
      error,
      errorContext
    )
    
    // Metric analysis errors are usually non-critical
    console.warn(`Metric analysis failed for ${metricName}:`, analysis)
  }
  
  // Handle metric alert errors
  function handleMetricAlertError(error, metricName, alert, context = {}) {
    const errorContext = {
      operation: 'metric-alert',
      metricName,
      alert,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_ALERT_FAILED,
      error,
      errorContext
    )
    
    // Metric alert errors are usually non-critical
    console.warn(`Metric alert failed for ${metricName}:`, alert)
  }
  
  // Handle metric dashboard errors
  function handleMetricDashboardError(error, metricName, dashboard, context = {}) {
    const errorContext = {
      operation: 'metric-dashboard',
      metricName,
      dashboard,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_DASHBOARD_FAILED,
      error,
      errorContext
    )
    
    // Metric dashboard errors are usually non-critical
    console.warn(`Metric dashboard failed for ${metricName}:`, dashboard)
  }
  
  // Handle metric report errors
  function handleMetricReportError(error, metricName, report, context = {}) {
    const errorContext = {
      operation: 'metric-report',
      metricName,
      report,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_REPORT_FAILED,
      error,
      errorContext
    )
    
    // Metric report errors are usually non-critical
    console.warn(`Metric report failed for ${metricName}:`, report)
  }
  
  // Handle metric export errors
  function handleMetricExportError(error, metricName, exportType, context = {}) {
    const errorContext = {
      operation: 'metric-export',
      metricName,
      exportType,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_EXPORT_FAILED,
      error,
      errorContext
    )
    
    // Metric export errors are usually non-critical
    console.warn(`Metric export failed for ${metricName}:`, exportType)
  }
  
  // Handle metric import errors
  function handleMetricImportError(error, metricName, importType, context = {}) {
    const errorContext = {
      operation: 'metric-import',
      metricName,
      importType,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_IMPORT_FAILED,
      error,
      errorContext
    )
    
    // Metric import errors are usually non-critical
    console.warn(`Metric import failed for ${metricName}:`, importType)
  }
  
  // Handle metric sync errors
  function handleMetricSyncError(error, metricName, sync, context = {}) {
    const errorContext = {
      operation: 'metric-sync',
      metricName,
      sync,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_SYNC_FAILED,
      error,
      errorContext
    )
    
    // Metric sync errors are usually non-critical
    console.warn(`Metric sync failed for ${metricName}:`, sync)
  }
  
  // Handle metric backup errors
  function handleMetricBackupError(error, metricName, backup, context = {}) {
    const errorContext = {
      operation: 'metric-backup',
      metricName,
      backup,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_BACKUP_FAILED,
      error,
      errorContext
    )
    
    // Metric backup errors are usually non-critical
    console.warn(`Metric backup failed for ${metricName}:`, backup)
  }
  
  // Handle metric restore errors
  function handleMetricRestoreError(error, metricName, restore, context = {}) {
    const errorContext = {
      operation: 'metric-restore',
      metricName,
      restore,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_RESTORE_FAILED,
      error,
      errorContext
    )
    
    // Metric restore errors are usually non-critical
    console.warn(`Metric restore failed for ${metricName}:`, restore)
  }
  
  // Handle metric cleanup errors
  function handleMetricCleanupError(error, metricName, cleanup, context = {}) {
    const errorContext = {
      operation: 'metric-cleanup',
      metricName,
      cleanup,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_CLEANUP_FAILED,
      error,
      errorContext
    )
    
    // Metric cleanup errors are usually non-critical
    console.warn(`Metric cleanup failed for ${metricName}:`, cleanup)
  }
  
  // Handle metric archival errors
  function handleMetricArchivalError(error, metricName, archival, context = {}) {
    const errorContext = {
      operation: 'metric-archival',
      metricName,
      archival,
      ...context
    }
    
    errorHandling.addError(
      MONITORING_ERRORS.METRIC_ARCHIVAL_FAILED,
      error,
      errorContext
    )
    
    // Metric archival errors are usually non-critical
    console.warn(`Metric archival failed for ${metricName}:`, archival)
  }
  
  // Execute monitoring operation with error handling
  async function executeMonitoringOperation(operation, operationFunction, context = {}) {
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
  
  // Get monitoring error summary
  function getMonitoringErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add monitoring specific analysis
    summary.monitoringErrors = {
      collectionErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_COLLECTION_FAILED] || 0,
      aggregationErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_AGGREGATION_FAILED] || 0,
      storageErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_STORAGE_FAILED] || 0,
      retrievalErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_RETRIEVAL_FAILED] || 0,
      analysisErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_ANALYSIS_FAILED] || 0,
      alertErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_ALERT_FAILED] || 0,
      dashboardErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_DASHBOARD_FAILED] || 0,
      reportErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_REPORT_FAILED] || 0,
      exportErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_EXPORT_FAILED] || 0,
      importErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_IMPORT_FAILED] || 0,
      syncErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_SYNC_FAILED] || 0,
      backupErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_BACKUP_FAILED] || 0,
      restoreErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_RESTORE_FAILED] || 0,
      cleanupErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_CLEANUP_FAILED] || 0,
      archivalErrors: summary.errorTypes[MONITORING_ERRORS.METRIC_ARCHIVAL_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear monitoring errors
  function clearMonitoringErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Monitoring specific methods
    handleMetricCollectionError,
    handleMetricAggregationError,
    handleMetricStorageError,
    handleMetricRetrievalError,
    handleMetricAnalysisError,
    handleMetricAlertError,
    handleMetricDashboardError,
    handleMetricReportError,
    handleMetricExportError,
    handleMetricImportError,
    handleMetricSyncError,
    handleMetricBackupError,
    handleMetricRestoreError,
    handleMetricCleanupError,
    handleMetricArchivalError,
    
    // Utility methods
    executeMonitoringOperation,
    getMonitoringErrorSummary,
    clearMonitoringErrors,
    
    // Constants
    MONITORING_ERRORS
  }
}







