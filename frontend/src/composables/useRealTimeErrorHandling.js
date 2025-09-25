import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useRealTimeErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Real-time specific error types
  const REAL_TIME_ERRORS = {
    REAL_TIME_CONNECTION_FAILED: 'real-time-connection-failed',
    REAL_TIME_DISCONNECTION_FAILED: 'real-time-disconnection-failed',
    REAL_TIME_RECONNECTION_FAILED: 'real-time-reconnection-failed',
    REAL_TIME_MESSAGE_FAILED: 'real-time-message-failed',
    REAL_TIME_BROADCAST_FAILED: 'real-time-broadcast-failed',
    REAL_TIME_SUBSCRIBE_FAILED: 'real-time-subscribe-failed',
    REAL_TIME_UNSUBSCRIBE_FAILED: 'real-time-unsubscribe-failed',
    REAL_TIME_PUBLISH_FAILED: 'real-time-publish-failed',
    REAL_TIME_CHANNEL_FAILED: 'real-time-channel-failed',
    REAL_TIME_ROOM_FAILED: 'real-time-room-failed',
    REAL_TIME_USER_FAILED: 'real-time-user-failed',
    REAL_TIME_EVENT_FAILED: 'real-time-event-failed',
    REAL_TIME_STATE_FAILED: 'real-time-state-failed',
    REAL_TIME_SYNC_FAILED: 'real-time-sync-failed',
    REAL_TIME_PRESENCE_FAILED: 'real-time-presence-failed'
  }
  
  // Handle real-time connection errors
  function handleRealTimeConnectionError(error, connection, context = {}) {
    const errorContext = {
      operation: 'real-time-connection',
      connection,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_CONNECTION_FAILED,
      error,
      errorContext
    }
    
    // Real-time connection errors are usually non-critical
    console.warn(`Real-time connection failed:`, connection)
  }
  
  // Handle real-time disconnection errors
  function handleRealTimeDisconnectionError(error, disconnection, context = {}) {
    const errorContext = {
      operation: 'real-time-disconnection',
      disconnection,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_DISCONNECTION_FAILED,
      error,
      errorContext
    }
    
    // Real-time disconnection errors are usually non-critical
    console.warn(`Real-time disconnection failed:`, disconnection)
  }
  
  // Handle real-time reconnection errors
  function handleRealTimeReconnectionError(error, reconnection, context = {}) {
    const errorContext = {
      operation: 'real-time-reconnection',
      reconnection,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_RECONNECTION_FAILED,
      error,
      errorContext
    }
    
    // Real-time reconnection errors are usually non-critical
    console.warn(`Real-time reconnection failed:`, reconnection)
  }
  
  // Handle real-time message errors
  function handleRealTimeMessageError(error, message, context = {}) {
    const errorContext = {
      operation: 'real-time-message',
      message,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_MESSAGE_FAILED,
      error,
      errorContext
    }
    
    // Real-time message errors are usually non-critical
    console.warn(`Real-time message failed:`, message)
  }
  
  // Handle real-time broadcast errors
  function handleRealTimeBroadcastError(error, broadcast, context = {}) {
    const errorContext = {
      operation: 'real-time-broadcast',
      broadcast,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_BROADCAST_FAILED,
      error,
      errorContext
    }
    
    // Real-time broadcast errors are usually non-critical
    console.warn(`Real-time broadcast failed:`, broadcast)
  }
  
  // Handle real-time subscribe errors
  function handleRealTimeSubscribeError(error, subscribe, context = {}) {
    const errorContext = {
      operation: 'real-time-subscribe',
      subscribe,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_SUBSCRIBE_FAILED,
      error,
      errorContext
    }
    
    // Real-time subscribe errors are usually non-critical
    console.warn(`Real-time subscribe failed:`, subscribe)
  }
  
  // Handle real-time unsubscribe errors
  function handleRealTimeUnsubscribeError(error, unsubscribe, context = {}) {
    const errorContext = {
      operation: 'real-time-unsubscribe',
      unsubscribe,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_UNSUBSCRIBE_FAILED,
      error,
      errorContext
    }
    
    // Real-time unsubscribe errors are usually non-critical
    console.warn(`Real-time unsubscribe failed:`, unsubscribe)
  }
  
  // Handle real-time publish errors
  function handleRealTimePublishError(error, publish, context = {}) {
    const errorContext = {
      operation: 'real-time-publish',
      publish,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_PUBLISH_FAILED,
      error,
      errorContext
    }
    
    // Real-time publish errors are usually non-critical
    console.warn(`Real-time publish failed:`, publish)
  }
  
  // Handle real-time channel errors
  function handleRealTimeChannelError(error, channel, context = {}) {
    const errorContext = {
      operation: 'real-time-channel',
      channel,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_CHANNEL_FAILED,
      error,
      errorContext
    }
    
    // Real-time channel errors are usually non-critical
    console.warn(`Real-time channel failed:`, channel)
  }
  
  // Handle real-time room errors
  function handleRealTimeRoomError(error, room, context = {}) {
    const errorContext = {
      operation: 'real-time-room',
      room,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_ROOM_FAILED,
      error,
      errorContext
    }
    
    // Real-time room errors are usually non-critical
    console.warn(`Real-time room failed:`, room)
  }
  
  // Handle real-time user errors
  function handleRealTimeUserError(error, user, context = {}) {
    const errorContext = {
      operation: 'real-time-user',
      user,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_USER_FAILED,
      error,
      errorContext
    }
    
    // Real-time user errors are usually non-critical
    console.warn(`Real-time user failed:`, user)
  }
  
  // Handle real-time event errors
  function handleRealTimeEventError(error, event, context = {}) {
    const errorContext = {
      operation: 'real-time-event',
      event,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_EVENT_FAILED,
      error,
      errorContext
    }
    
    // Real-time event errors are usually non-critical
    console.warn(`Real-time event failed:`, event)
  }
  
  // Handle real-time state errors
  function handleRealTimeStateError(error, state, context = {}) {
    const errorContext = {
      operation: 'real-time-state',
      state,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_STATE_FAILED,
      error,
      errorContext
    }
    
    // Real-time state errors are usually non-critical
    console.warn(`Real-time state failed:`, state)
  }
  
  // Handle real-time sync errors
  function handleRealTimeSyncError(error, sync, context = {}) {
    const errorContext = {
      operation: 'real-time-sync',
      sync,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_SYNC_FAILED,
      error,
      errorContext
    }
    
    // Real-time sync errors are usually non-critical
    console.warn(`Real-time sync failed:`, sync)
  }
  
  // Handle real-time presence errors
  function handleRealTimePresenceError(error, presence, context = {}) {
    const errorContext = {
      operation: 'real-time-presence',
      presence,
      ...context
    }
    
    errorHandling.addError(
      REAL_TIME_ERRORS.REAL_TIME_PRESENCE_FAILED,
      error,
      errorContext
    }
    
    // Real-time presence errors are usually non-critical
    console.warn(`Real-time presence failed:`, presence)
  }
  
  // Execute real-time operation with error handling
  async function executeRealTimeOperation(operation, operationFunction, context = {}) {
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
  
  // Get real-time error summary
  function getRealTimeErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add real-time specific analysis
    summary.realTimeErrors = {
      connectionErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_CONNECTION_FAILED] || 0,
      disconnectionErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_DISCONNECTION_FAILED] || 0,
      reconnectionErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_RECONNECTION_FAILED] || 0,
      messageErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_MESSAGE_FAILED] || 0,
      broadcastErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_BROADCAST_FAILED] || 0,
      subscribeErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_SUBSCRIBE_FAILED] || 0,
      unsubscribeErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_UNSUBSCRIBE_FAILED] || 0,
      publishErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_PUBLISH_FAILED] || 0,
      channelErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_CHANNEL_FAILED] || 0,
      roomErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_ROOM_FAILED] || 0,
      userErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_USER_FAILED] || 0,
      eventErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_EVENT_FAILED] || 0,
      stateErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_STATE_FAILED] || 0,
      syncErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_SYNC_FAILED] || 0,
      presenceErrors: summary.errorTypes[REAL_TIME_ERRORS.REAL_TIME_PRESENCE_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear real-time errors
  function clearRealTimeErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Real-time specific methods
    handleRealTimeConnectionError,
    handleRealTimeDisconnectionError,
    handleRealTimeReconnectionError,
    handleRealTimeMessageError,
    handleRealTimeBroadcastError,
    handleRealTimeSubscribeError,
    handleRealTimeUnsubscribeError,
    handleRealTimePublishError,
    handleRealTimeChannelError,
    handleRealTimeRoomError,
    handleRealTimeUserError,
    handleRealTimeEventError,
    handleRealTimeStateError,
    handleRealTimeSyncError,
    handleRealTimePresenceError,
    
    // Utility methods
    executeRealTimeOperation,
    getRealTimeErrorSummary,
    clearRealTimeErrors,
    
    // Constants
    REAL_TIME_ERRORS
  }
}








