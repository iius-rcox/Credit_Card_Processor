import { useManageModeErrorHandling } from './useManageModeErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useSessionManagerErrorHandling() {
  const manageModeErrorHandling = useManageModeErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Session manager specific error types
  const SESSION_MANAGER_ERRORS = {
    SESSION_LOAD_FAILED: 'session-load-failed',
    SESSION_CREATE_FAILED: 'session-create-failed',
    SESSION_UPDATE_FAILED: 'session-update-failed',
    SESSION_DELETE_FAILED: 'session-delete-failed',
    SESSION_CLOSE_FAILED: 'session-close-failed',
    SESSION_REOPEN_FAILED: 'session-reopen-failed',
    SESSION_RENAME_FAILED: 'session-rename-failed',
    SESSION_EXPORT_FAILED: 'session-export-failed',
    SESSION_REPROCESS_FAILED: 'session-reprocess-failed',
    FILTER_APPLICATION_FAILED: 'filter-application-failed',
    SORT_APPLICATION_FAILED: 'sort-application-failed',
    PAGINATION_FAILED: 'pagination-failed',
    SEARCH_FAILED: 'search-failed',
    WEBSOCKET_CONNECTION_FAILED: 'websocket-connection-failed',
    WEBSOCKET_MESSAGE_FAILED: 'websocket-message-failed'
  }
  
  // Handle session loading errors
  function handleSessionLoadError(error, context = {}) {
    manageModeErrorHandling.handleSessionLoadError(error, context)
    
    // Additional session manager specific handling
    if (error.response?.status === 401) {
      notificationStore.addError('Authentication required. Please log in again.')
    } else if (error.response?.status === 403) {
      notificationStore.addError('Access denied. You do not have permission to view sessions.')
    } else if (error.response?.status === 500) {
      notificationStore.addError('Server error occurred while loading sessions. Please try again.')
    }
  }
  
  // Handle session creation errors
  function handleSessionCreateError(error, sessionData, context = {}) {
    const errorContext = {
      operation: 'create-session',
      sessionData,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SESSION_CREATE_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 400) {
      notificationStore.addError('Invalid session data. Please check your input and try again.')
    } else if (error.response?.status === 409) {
      notificationStore.addError('A session with this name already exists. Please choose a different name.')
    } else {
      notificationStore.addError('Failed to create session. Please try again.')
    }
  }
  
  // Handle session update errors
  function handleSessionUpdateError(error, sessionId, updateData, context = {}) {
    const errorContext = {
      operation: 'update-session',
      sessionId,
      updateData,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SESSION_UPDATE_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 400) {
      notificationStore.addError('Invalid update data. Please check your input and try again.')
    } else if (error.response?.status === 404) {
      notificationStore.addError('Session not found. It may have been deleted.')
    } else {
      notificationStore.addError('Failed to update session. Please try again.')
    }
  }
  
  // Handle session delete errors
  function handleSessionDeleteError(error, sessionId, context = {}) {
    const errorContext = {
      operation: 'delete-session',
      sessionId,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SESSION_DELETE_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 404) {
      notificationStore.addError('Session not found. It may have already been deleted.')
    } else if (error.response?.status === 409) {
      notificationStore.addError('Cannot delete active session. Please close it first.')
    } else {
      notificationStore.addError('Failed to delete session. Please try again.')
    }
  }
  
  // Handle session close errors
  function handleSessionCloseError(error, sessionId, context = {}) {
    const errorContext = {
      operation: 'close-session',
      sessionId,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SESSION_CLOSE_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 404) {
      notificationStore.addError('Session not found. It may have already been closed.')
    } else if (error.response?.status === 409) {
      notificationStore.addError('Cannot close session. It may be in an invalid state.')
    } else {
      notificationStore.addError('Failed to close session. Please try again.')
    }
  }
  
  // Handle session reopen errors
  function handleSessionReopenError(error, sessionId, context = {}) {
    const errorContext = {
      operation: 'reopen-session',
      sessionId,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SESSION_REOPEN_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 404) {
      notificationStore.addError('Session not found. It may have been deleted.')
    } else if (error.response?.status === 409) {
      notificationStore.addError('Cannot reopen session. It may be in an invalid state.')
    } else {
      notificationStore.addError('Failed to reopen session. Please try again.')
    }
  }
  
  // Handle session rename errors
  function handleSessionRenameError(error, sessionId, newName, context = {}) {
    const errorContext = {
      operation: 'rename-session',
      sessionId,
      newName,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SESSION_RENAME_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 400) {
      notificationStore.addError('Invalid session name. Please choose a different name.')
    } else if (error.response?.status === 409) {
      notificationStore.addError('A session with this name already exists. Please choose a different name.')
    } else {
      notificationStore.addError('Failed to rename session. Please try again.')
    }
  }
  
  // Handle session export errors
  function handleSessionExportError(error, sessionId, exportType, context = {}) {
    const errorContext = {
      operation: 'export-session',
      sessionId,
      exportType,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SESSION_EXPORT_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 404) {
      notificationStore.addError('Session not found. It may have been deleted.')
    } else if (error.response?.status === 409) {
      notificationStore.addError('Cannot export session. It may not have results yet.')
    } else {
      notificationStore.addError('Failed to export session. Please try again.')
    }
  }
  
  // Handle session reprocess errors
  function handleSessionReprocessError(error, sessionId, context = {}) {
    const errorContext = {
      operation: 'reprocess-session',
      sessionId,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SESSION_REPROCESS_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 404) {
      notificationStore.addError('Session not found. It may have been deleted.')
    } else if (error.response?.status === 409) {
      notificationStore.addError('Cannot reprocess session. It may be in an invalid state.')
    } else {
      notificationStore.addError('Failed to reprocess session. Please try again.')
    }
  }
  
  // Handle filter application errors
  function handleFilterApplicationError(error, filterType, filterValue, context = {}) {
    const errorContext = {
      operation: 'apply-filter',
      filterType,
      filterValue,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.FILTER_APPLICATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning('Failed to apply filter. Showing all sessions.')
  }
  
  // Handle sort application errors
  function handleSortApplicationError(error, sortField, sortDirection, context = {}) {
    const errorContext = {
      operation: 'apply-sort',
      sortField,
      sortDirection,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SORT_APPLICATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning('Failed to apply sorting. Using default sort order.')
  }
  
  // Handle pagination errors
  function handlePaginationError(error, page, pageSize, context = {}) {
    const errorContext = {
      operation: 'pagination',
      page,
      pageSize,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.PAGINATION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning('Failed to load page. Showing first page.')
  }
  
  // Handle search errors
  function handleSearchError(error, searchQuery, context = {}) {
    const errorContext = {
      operation: 'search',
      searchQuery,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.SEARCH_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning('Search failed. Showing all sessions.')
  }
  
  // Handle WebSocket connection errors
  function handleWebSocketConnectionError(error, context = {}) {
    const errorContext = {
      operation: 'websocket-connection',
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.WEBSOCKET_CONNECTION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addWarning('Real-time updates unavailable. Some features may not work.')
  }
  
  // Handle WebSocket message errors
  function handleWebSocketMessageError(error, messageType, context = {}) {
    const errorContext = {
      operation: 'websocket-message',
      messageType,
      ...context
    }
    
    manageModeErrorHandling.addError(
      SESSION_MANAGER_ERRORS.WEBSOCKET_MESSAGE_FAILED,
      error,
      errorContext
    )
    
    // WebSocket message errors are usually non-critical
    console.warn('WebSocket message error:', error)
  }
  
  // Execute session operation with error handling
  async function executeSessionOperation(operation, operationFunction, context = {}) {
    try {
      return await manageModeErrorHandling.executeWithErrorHandling(
        operationFunction,
        { operation, ...context }
      )
    } catch (error) {
      // The error handling is already done by executeWithErrorHandling
      throw error
    }
  }
  
  // Get session manager error summary
  function getSessionManagerErrorSummary() {
    const summary = manageModeErrorHandling.getErrorSummary()
    
    // Add session manager specific analysis
    summary.sessionManagerErrors = {
      loadErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_LOAD_FAILED] || 0,
      createErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_CREATE_FAILED] || 0,
      updateErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_UPDATE_FAILED] || 0,
      deleteErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_DELETE_FAILED] || 0,
      closeErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_CLOSE_FAILED] || 0,
      reopenErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_REOPEN_FAILED] || 0,
      renameErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_RENAME_FAILED] || 0,
      exportErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_EXPORT_FAILED] || 0,
      reprocessErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SESSION_REPROCESS_FAILED] || 0,
      filterErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.FILTER_APPLICATION_FAILED] || 0,
      sortErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SORT_APPLICATION_FAILED] || 0,
      paginationErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.PAGINATION_FAILED] || 0,
      searchErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.SEARCH_FAILED] || 0,
      websocketErrors: summary.errorTypes[SESSION_MANAGER_ERRORS.WEBSOCKET_CONNECTION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear session manager errors
  function clearSessionManagerErrors() {
    manageModeErrorHandling.clearManageModeErrors()
  }
  
  return {
    // Inherit all manage mode error handling
    ...manageModeErrorHandling,
    
    // Session manager specific methods
    handleSessionLoadError,
    handleSessionCreateError,
    handleSessionUpdateError,
    handleSessionDeleteError,
    handleSessionCloseError,
    handleSessionReopenError,
    handleSessionRenameError,
    handleSessionExportError,
    handleSessionReprocessError,
    handleFilterApplicationError,
    handleSortApplicationError,
    handlePaginationError,
    handleSearchError,
    handleWebSocketConnectionError,
    handleWebSocketMessageError,
    
    // Utility methods
    executeSessionOperation,
    getSessionManagerErrorSummary,
    clearSessionManagerErrors,
    
    // Constants
    SESSION_MANAGER_ERRORS
  }
}







