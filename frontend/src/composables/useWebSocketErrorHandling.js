import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useWebSocketErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // WebSocket specific error types
  const WEBSOCKET_ERRORS = {
    CONNECTION_FAILED: 'websocket-connection-failed',
    CONNECTION_LOST: 'websocket-connection-lost',
    RECONNECTION_FAILED: 'websocket-reconnection-failed',
    MESSAGE_SEND_FAILED: 'websocket-message-send-failed',
    MESSAGE_RECEIVE_FAILED: 'websocket-message-receive-failed',
    MESSAGE_PARSE_FAILED: 'websocket-message-parse-failed',
    MESSAGE_VALIDATION_FAILED: 'websocket-message-validation-failed',
    SUBSCRIPTION_FAILED: 'websocket-subscription-failed',
    UNSUBSCRIPTION_FAILED: 'websocket-unsubscription-failed',
    HEARTBEAT_FAILED: 'websocket-heartbeat-failed',
    AUTHENTICATION_FAILED: 'websocket-authentication-failed',
    AUTHORIZATION_FAILED: 'websocket-authorization-failed',
    RATE_LIMITED: 'websocket-rate-limited',
    PROTOCOL_ERROR: 'websocket-protocol-error',
    CLOSE_ERROR: 'websocket-close-error'
  }
  
  // Handle WebSocket connection errors
  function handleConnectionError(error, endpoint, context = {}) {
    const errorContext = {
      operation: 'websocket-connection',
      endpoint,
      ...context
    }
    
    errorHandling.addError(
      WEBSOCKET_ERRORS.CONNECTION_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      'Failed to connect to real-time updates. Some features may not work.'
    )
  }
  
  // Handle WebSocket message errors
  function handleMessageError(error, messageType, context = {}) {
    const errorContext = {
      operation: 'websocket-message',
      messageType,
      ...context
    }
    
    errorHandling.addError(
      WEBSOCKET_ERRORS.MESSAGE_RECEIVE_FAILED,
      error,
      errorContext
    )
    
    // WebSocket message errors are usually non-critical
    console.warn('WebSocket message error:', error)
  }
  
  // Handle WebSocket reconnection errors
  function handleReconnectionError(error, attempt, maxAttempts, context = {}) {
    const errorContext = {
      operation: 'websocket-reconnection',
      attempt,
      maxAttempts,
      ...context
    }
    
    errorHandling.addError(
      WEBSOCKET_ERRORS.RECONNECTION_FAILED,
      error,
      errorContext
    )
    
    if (attempt >= maxAttempts) {
      notificationStore.addError(
        'Failed to reconnect to real-time updates. Please refresh the page.'
      )
    } else {
      notificationStore.addWarning(
        `Reconnection attempt ${attempt} failed. Retrying...`
      )
    }
  }
  
  // Execute WebSocket operation with error handling
  async function executeWebSocketOperation(operation, operationFunction, context = {}) {
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
  
  // Get WebSocket error summary
  function getWebSocketErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add WebSocket specific analysis
    summary.websocketErrors = {
      connectionErrors: summary.errorTypes[WEBSOCKET_ERRORS.CONNECTION_FAILED] || 0,
      messageErrors: summary.errorTypes[WEBSOCKET_ERRORS.MESSAGE_RECEIVE_FAILED] || 0,
      reconnectionErrors: summary.errorTypes[WEBSOCKET_ERRORS.RECONNECTION_FAILED] || 0,
      sendErrors: summary.errorTypes[WEBSOCKET_ERRORS.MESSAGE_SEND_FAILED] || 0,
      parseErrors: summary.errorTypes[WEBSOCKET_ERRORS.MESSAGE_PARSE_FAILED] || 0,
      validationErrors: summary.errorTypes[WEBSOCKET_ERRORS.MESSAGE_VALIDATION_FAILED] || 0,
      subscriptionErrors: summary.errorTypes[WEBSOCKET_ERRORS.SUBSCRIPTION_FAILED] || 0,
      unsubscriptionErrors: summary.errorTypes[WEBSOCKET_ERRORS.UNSUBSCRIPTION_FAILED] || 0,
      heartbeatErrors: summary.errorTypes[WEBSOCKET_ERRORS.HEARTBEAT_FAILED] || 0,
      authErrors: summary.errorTypes[WEBSOCKET_ERRORS.AUTHENTICATION_FAILED] || 0,
      authzErrors: summary.errorTypes[WEBSOCKET_ERRORS.AUTHORIZATION_FAILED] || 0,
      rateLimitErrors: summary.errorTypes[WEBSOCKET_ERRORS.RATE_LIMITED] || 0,
      protocolErrors: summary.errorTypes[WEBSOCKET_ERRORS.PROTOCOL_ERROR] || 0,
      closeErrors: summary.errorTypes[WEBSOCKET_ERRORS.CLOSE_ERROR] || 0
    }
    
    return summary
  }
  
  // Clear WebSocket errors
  function clearWebSocketErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // WebSocket specific methods
    handleConnectionError,
    handleMessageError,
    handleReconnectionError,
    
    // Utility methods
    executeWebSocketOperation,
    getWebSocketErrorSummary,
    clearWebSocketErrors,
    
    // Constants
    WEBSOCKET_ERRORS
  }
}




