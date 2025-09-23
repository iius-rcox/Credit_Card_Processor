import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useNotificationErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Notification specific error types
  const NOTIFICATION_ERRORS = {
    NOTIFICATION_CREATE_FAILED: 'notification-create-failed',
    NOTIFICATION_UPDATE_FAILED: 'notification-update-failed',
    NOTIFICATION_DELETE_FAILED: 'notification-delete-failed',
    NOTIFICATION_DISPLAY_FAILED: 'notification-display-failed',
    NOTIFICATION_ANIMATION_FAILED: 'notification-animation-failed',
    NOTIFICATION_POSITIONING_FAILED: 'notification-positioning-failed',
    NOTIFICATION_TIMEOUT_FAILED: 'notification-timeout-failed',
    NOTIFICATION_QUEUE_FAILED: 'notification-queue-failed',
    NOTIFICATION_PRIORITY_FAILED: 'notification-priority-failed',
    NOTIFICATION_GROUPING_FAILED: 'notification-grouping-failed',
    NOTIFICATION_PERSISTENCE_FAILED: 'notification-persistence-failed',
    NOTIFICATION_CLEAR_FAILED: 'notification-clear-failed'
  }
  
  // Handle notification creation errors
  function handleNotificationCreateError(error, notificationData, context = {}) {
    const errorContext = {
      operation: 'notification-create',
      notificationData,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_CREATE_FAILED,
      error,
      errorContext
    )
    
    // Fallback to console logging if notification creation fails
    console.error('Failed to create notification:', notificationData)
  }
  
  // Handle notification update errors
  function handleNotificationUpdateError(error, notificationId, updateData, context = {}) {
    const errorContext = {
      operation: 'notification-update',
      notificationId,
      updateData,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_UPDATE_FAILED,
      error,
      errorContext
    )
    
    // Fallback to console logging if notification update fails
    console.warn('Failed to update notification:', notificationId, updateData)
  }
  
  // Handle notification delete errors
  function handleNotificationDeleteError(error, notificationId, context = {}) {
    const errorContext = {
      operation: 'notification-delete',
      notificationId,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_DELETE_FAILED,
      error,
      errorContext
    )
    
    // Fallback to console logging if notification delete fails
    console.warn('Failed to delete notification:', notificationId)
  }
  
  // Handle notification display errors
  function handleNotificationDisplayError(error, notificationId, context = {}) {
    const errorContext = {
      operation: 'notification-display',
      notificationId,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_DISPLAY_FAILED,
      error,
      errorContext
    )
    
    // Fallback to console logging if notification display fails
    console.error('Failed to display notification:', notificationId)
  }
  
  // Handle notification animation errors
  function handleNotificationAnimationError(error, notificationId, animationType, context = {}) {
    const errorContext = {
      operation: 'notification-animation',
      notificationId,
      animationType,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_ANIMATION_FAILED,
      error,
      errorContext
    )
    
    // Animation errors are usually non-critical
    console.warn(`Notification animation failed for ${notificationId}:`, animationType)
  }
  
  // Handle notification positioning errors
  function handleNotificationPositioningError(error, notificationId, position, context = {}) {
    const errorContext = {
      operation: 'notification-positioning',
      notificationId,
      position,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_POSITIONING_FAILED,
      error,
      errorContext
    )
    
    // Positioning errors are usually non-critical
    console.warn(`Notification positioning failed for ${notificationId}:`, position)
  }
  
  // Handle notification timeout errors
  function handleNotificationTimeoutError(error, notificationId, timeout, context = {}) {
    const errorContext = {
      operation: 'notification-timeout',
      notificationId,
      timeout,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_TIMEOUT_FAILED,
      error,
      errorContext
    )
    
    // Timeout errors are usually non-critical
    console.warn(`Notification timeout failed for ${notificationId}:`, timeout)
  }
  
  // Handle notification queue errors
  function handleNotificationQueueError(error, queueOperation, context = {}) {
    const errorContext = {
      operation: 'notification-queue',
      queueOperation,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_QUEUE_FAILED,
      error,
      errorContext
    )
    
    // Queue errors are usually non-critical
    console.warn(`Notification queue operation failed:`, queueOperation)
  }
  
  // Handle notification priority errors
  function handleNotificationPriorityError(error, notificationId, priority, context = {}) {
    const errorContext = {
      operation: 'notification-priority',
      notificationId,
      priority,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_PRIORITY_FAILED,
      error,
      errorContext
    )
    
    // Priority errors are usually non-critical
    console.warn(`Notification priority failed for ${notificationId}:`, priority)
  }
  
  // Handle notification grouping errors
  function handleNotificationGroupingError(error, notificationId, groupId, context = {}) {
    const errorContext = {
      operation: 'notification-grouping',
      notificationId,
      groupId,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_GROUPING_FAILED,
      error,
      errorContext
    )
    
    // Grouping errors are usually non-critical
    console.warn(`Notification grouping failed for ${notificationId}:`, groupId)
  }
  
  // Handle notification persistence errors
  function handleNotificationPersistenceError(error, notificationId, context = {}) {
    const errorContext = {
      operation: 'notification-persistence',
      notificationId,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_PERSISTENCE_FAILED,
      error,
      errorContext
    )
    
    // Persistence errors are usually non-critical
    console.warn(`Notification persistence failed for ${notificationId}`)
  }
  
  // Handle notification clear errors
  function handleNotificationClearError(error, clearType, context = {}) {
    const errorContext = {
      operation: 'notification-clear',
      clearType,
      ...context
    }
    
    errorHandling.addError(
      NOTIFICATION_ERRORS.NOTIFICATION_CLEAR_FAILED,
      error,
      errorContext
    )
    
    // Clear errors are usually non-critical
    console.warn(`Notification clear failed:`, clearType)
  }
  
  // Create notification with error handling
  function createNotificationWithErrorHandling(notificationData, context = {}) {
    try {
      return notificationStore.addNotification(notificationData)
    } catch (error) {
      handleNotificationCreateError(error, notificationData, context)
      return null
    }
  }
  
  // Update notification with error handling
  function updateNotificationWithErrorHandling(notificationId, updateData, context = {}) {
    try {
      return notificationStore.updateNotification(notificationId, updateData)
    } catch (error) {
      handleNotificationUpdateError(error, notificationId, updateData, context)
      return false
    }
  }
  
  // Delete notification with error handling
  function deleteNotificationWithErrorHandling(notificationId, context = {}) {
    try {
      return notificationStore.removeNotification(notificationId)
    } catch (error) {
      handleNotificationDeleteError(error, notificationId, context)
      return false
    }
  }
  
  // Clear notifications with error handling
  function clearNotificationsWithErrorHandling(clearType = 'all', context = {}) {
    try {
      return notificationStore.clearNotifications(clearType)
    } catch (error) {
      handleNotificationClearError(error, clearType, context)
      return false
    }
  }
  
  // Get notification error summary
  function getNotificationErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add notification specific analysis
    summary.notificationErrors = {
      createErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_CREATE_FAILED] || 0,
      updateErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_UPDATE_FAILED] || 0,
      deleteErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_DELETE_FAILED] || 0,
      displayErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_DISPLAY_FAILED] || 0,
      animationErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_ANIMATION_FAILED] || 0,
      positioningErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_POSITIONING_FAILED] || 0,
      timeoutErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_TIMEOUT_FAILED] || 0,
      queueErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_QUEUE_FAILED] || 0,
      priorityErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_PRIORITY_FAILED] || 0,
      groupingErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_GROUPING_FAILED] || 0,
      persistenceErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_PERSISTENCE_FAILED] || 0,
      clearErrors: summary.errorTypes[NOTIFICATION_ERRORS.NOTIFICATION_CLEAR_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear notification errors
  function clearNotificationErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Notification specific methods
    handleNotificationCreateError,
    handleNotificationUpdateError,
    handleNotificationDeleteError,
    handleNotificationDisplayError,
    handleNotificationAnimationError,
    handleNotificationPositioningError,
    handleNotificationTimeoutError,
    handleNotificationQueueError,
    handleNotificationPriorityError,
    handleNotificationGroupingError,
    handleNotificationPersistenceError,
    handleNotificationClearError,
    
    // Utility methods
    createNotificationWithErrorHandling,
    updateNotificationWithErrorHandling,
    deleteNotificationWithErrorHandling,
    clearNotificationsWithErrorHandling,
    getNotificationErrorSummary,
    clearNotificationErrors,
    
    // Constants
    NOTIFICATION_ERRORS
  }
}







