import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    nextId: 1
  }),

  getters: {
    /**
     * Get notifications by type
     */
    notificationsByType: (state) => (type) => {
      return state.notifications.filter(n => n.type === type)
    },

    /**
     * Check if there are any error notifications
     */
    hasErrors: (state) => {
      return state.notifications.some(n => n.type === 'error')
    },

    /**
     * Get the latest notification
     */
    latestNotification: (state) => {
      return state.notifications[state.notifications.length - 1]
    }
  },

  actions: {
    /**
     * Add a new notification
     * @param {Object} notification - Notification object
     * @param {string} notification.message - The notification message
     * @param {string} notification.type - Type: 'success', 'error', 'warning', 'info'
     * @param {string} [notification.title] - Optional title
     * @param {number} [notification.duration] - Auto dismiss duration in ms (0 for manual)
     * @param {Array} [notification.actions] - Array of action objects
     * @param {boolean} [notification.dismissible] - Whether notification can be dismissed
     * @returns {number} notification ID
     */
    addNotification({
      message,
      type = 'info',
      title = null,
      duration = 5000,
      actions = null,
      dismissible = true
    }) {
      const notification = {
        id: this.nextId++,
        message,
        type,
        title,
        actions,
        dismissible,
        timestamp: new Date()
      }

      this.notifications.push(notification)

      // Auto dismiss if duration is set
      if (duration > 0) {
        setTimeout(() => {
          this.removeNotification(notification.id)
        }, duration)
      }

      return notification.id
    },

    /**
     * Add success notification
     */
    addSuccess(message, options = {}) {
      return this.addNotification({
        message,
        type: 'success',
        ...options
      })
    },

    /**
     * Add error notification
     */
    addError(message, options = {}) {
      return this.addNotification({
        message,
        type: 'error',
        duration: 0, // Errors stay until manually dismissed
        ...options
      })
    },

    /**
     * Add warning notification
     */
    addWarning(message, options = {}) {
      return this.addNotification({
        message,
        type: 'warning',
        duration: 8000, // Longer duration for warnings
        ...options
      })
    },

    /**
     * Add info notification
     */
    addInfo(message, options = {}) {
      return this.addNotification({
        message,
        type: 'info',
        ...options
      })
    },

    /**
     * Remove a notification by ID
     */
    removeNotification(notificationId) {
      const index = this.notifications.findIndex(n => n.id === notificationId)
      if (index > -1) {
        this.notifications.splice(index, 1)
      }
    },

    /**
     * Clear all notifications
     */
    clearAll() {
      this.notifications = []
    },

    /**
     * Clear notifications by type
     */
    clearByType(type) {
      this.notifications = this.notifications.filter(n => n.type !== type)
    },

    /**
     * Handle API errors and create appropriate notifications
     */
    handleApiError(error, context = '') {
      let message = 'An unexpected error occurred'
      let title = 'Error'
      
      if (error.response) {
        // API error response
        const status = error.response.status
        const data = error.response.data
        
        if (status === 401) {
          title = 'Authentication Error'
          message = 'You are not authorized to perform this action'
        } else if (status === 403) {
          title = 'Permission Denied'
          message = 'You do not have permission to access this resource'
        } else if (status === 404) {
          title = 'Not Found'
          message = 'The requested resource was not found'
        } else if (status === 422) {
          title = 'Validation Error'
          message = data.detail || 'Please check your input and try again'
        } else if (status >= 500) {
          title = 'Server Error'
          message = 'A server error occurred. Please try again later'
        } else if (data && data.detail) {
          message = data.detail
        }
        
        if (context) {
          message = `${context}: ${message}`
        }
      } else if (error.message) {
        message = error.message
        if (context) {
          message = `${context}: ${message}`
        }
      }

      // Add retry action for certain errors
      const actions = []
      if (error.response && error.response.status >= 500) {
        actions.push({
          label: 'Retry',
          handler: () => {
            // This would need to be implemented by the component
            console.log('Retry action triggered')
          }
        })
      }

      return this.addError(message, { 
        title, 
        actions: actions.length > 0 ? actions : null 
      })
    },

    /**
     * Handle offline state
     */
    handleOffline() {
      return this.addWarning('You appear to be offline. Some features may not work properly.', {
        title: 'Connection Issue',
        duration: 0,
        actions: [{
          label: 'Try Again',
          handler: () => {
            if (navigator.onLine) {
              this.addSuccess('Connection restored')
            } else {
              this.addWarning('Still offline. Please check your internet connection.')
            }
          }
        }]
      })
    },

    /**
     * Handle upload progress notifications
     */
    handleUploadProgress(filename, progress) {
      // Remove any existing upload progress notifications for this file
      this.notifications = this.notifications.filter(
        n => !(n.title === 'File Upload' && n.message.includes(filename))
      )

      if (progress < 100) {
        return this.addInfo(`Uploading ${filename}... ${progress}%`, {
          title: 'File Upload',
          duration: 0,
          dismissible: false
        })
      } else {
        this.addSuccess(`${filename} uploaded successfully`, {
          title: 'Upload Complete'
        })
      }
    }
  }
})