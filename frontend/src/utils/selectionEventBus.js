/**
 * Event Bus for Session Selection
 * Provides cross-component communication for selection events
 */

class SelectionEventBus {
  constructor() {
    this.events = new Map()
    this.oneTimeEvents = new Map()
    this.eventHistory = []
    this.maxHistorySize = 50
    this.debug = process.env.NODE_ENV === 'development'
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @param {Object} options - Options for the listener
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, options = {}) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }

    const wrappedHandler = {
      handler,
      id: this.generateId(),
      options
    }

    this.events.get(event).push(wrappedHandler)

    if (this.debug) {
      console.log(`[EventBus] Registered listener for '${event}'`)
    }

    // Return unsubscribe function
    return () => this.off(event, wrappedHandler.id)
  }

  /**
   * Register a one-time event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    if (!this.oneTimeEvents.has(event)) {
      this.oneTimeEvents.set(event, [])
    }

    const wrappedHandler = {
      handler,
      id: this.generateId()
    }

    this.oneTimeEvents.get(event).push(wrappedHandler)

    return () => this.offOnce(event, wrappedHandler.id)
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    const timestamp = Date.now()
    
    // Add to history
    this.addToHistory(event, data, timestamp)

    if (this.debug) {
      console.log(`[EventBus] Emitting '${event}'`, data)
    }

    // Handle regular listeners
    if (this.events.has(event)) {
      const handlers = this.events.get(event)
      handlers.forEach(({ handler, options }) => {
        try {
          if (options.delay) {
            setTimeout(() => handler(data), options.delay)
          } else {
            handler(data)
          }
        } catch (error) {
          console.error(`[EventBus] Error in handler for '${event}':`, error)
        }
      })
    }

    // Handle one-time listeners
    if (this.oneTimeEvents.has(event)) {
      const handlers = this.oneTimeEvents.get(event)
      handlers.forEach(({ handler }) => {
        try {
          handler(data)
        } catch (error) {
          console.error(`[EventBus] Error in one-time handler for '${event}':`, error)
        }
      })
      // Clear one-time listeners after execution
      this.oneTimeEvents.delete(event)
    }
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {string} handlerId - Handler ID to remove
   */
  off(event, handlerId) {
    if (this.events.has(event)) {
      const handlers = this.events.get(event)
      const filtered = handlers.filter(h => h.id !== handlerId)
      
      if (filtered.length > 0) {
        this.events.set(event, filtered)
      } else {
        this.events.delete(event)
      }

      if (this.debug) {
        console.log(`[EventBus] Removed listener for '${event}'`)
      }
    }
  }

  /**
   * Remove a one-time event listener
   * @param {string} event - Event name
   * @param {string} handlerId - Handler ID to remove
   */
  offOnce(event, handlerId) {
    if (this.oneTimeEvents.has(event)) {
      const handlers = this.oneTimeEvents.get(event)
      const filtered = handlers.filter(h => h.id !== handlerId)
      
      if (filtered.length > 0) {
        this.oneTimeEvents.set(event, filtered)
      } else {
        this.oneTimeEvents.delete(event)
      }
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  offAll(event) {
    this.events.delete(event)
    this.oneTimeEvents.delete(event)
    
    if (this.debug) {
      console.log(`[EventBus] Removed all listeners for '${event}'`)
    }
  }

  /**
   * Clear all event listeners
   */
  clear() {
    this.events.clear()
    this.oneTimeEvents.clear()
    this.eventHistory = []
    
    if (this.debug) {
      console.log('[EventBus] Cleared all listeners')
    }
  }

  /**
   * Get count of listeners for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    const regular = this.events.has(event) ? this.events.get(event).length : 0
    const oneTime = this.oneTimeEvents.has(event) ? this.oneTimeEvents.get(event).length : 0
    return regular + oneTime
  }

  /**
   * Check if event has listeners
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasListeners(event) {
    return this.listenerCount(event) > 0
  }

  /**
   * Get event history
   * @param {string} [event] - Optional event name to filter
   * @returns {Array}
   */
  getHistory(event = null) {
    if (event) {
      return this.eventHistory.filter(h => h.event === event)
    }
    return [...this.eventHistory]
  }

  /**
   * Add event to history
   * @private
   */
  addToHistory(event, data, timestamp) {
    this.eventHistory.push({
      event,
      data,
      timestamp
    })

    // Limit history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }
  }

  /**
   * Generate unique ID
   * @private
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Create singleton instance
const selectionEventBus = new SelectionEventBus()

// Define standard events
export const SelectionEvents = {
  // Selection state changes
  SELECTION_CHANGED: 'selection:changed',
  SELECTION_CLEARED: 'selection:cleared',
  
  // Mode changes
  MANAGE_MODE_ENTERED: 'mode:manage:entered',
  MANAGE_MODE_EXITED: 'mode:manage:exited',
  
  // Bulk actions
  BULK_ACTION_INITIATED: 'bulk:action:initiated',
  BULK_ACTION_CONFIRMED: 'bulk:action:confirmed',
  BULK_ACTION_CANCELLED: 'bulk:action:cancelled',
  BULK_ACTION_COMPLETED: 'bulk:action:completed',
  BULK_ACTION_FAILED: 'bulk:action:failed',
  
  // Selection operations
  SELECT_ALL_REQUESTED: 'select:all:requested',
  SELECT_RANGE_REQUESTED: 'select:range:requested',
  
  // UI events
  CONFIRMATION_DRAWER_OPENED: 'drawer:confirmation:opened',
  CONFIRMATION_DRAWER_CLOSED: 'drawer:confirmation:closed',
  
  // Validation events
  SELECTION_VALIDATED: 'selection:validated',
  SELECTION_INVALID: 'selection:invalid',
  
  // Filter changes
  FILTER_CHANGED: 'filter:changed',
  PAGE_CHANGED: 'page:changed'
}

// Helper functions for common event patterns
export const SelectionEventHelpers = {
  /**
   * Emit selection changed event with standard data
   * @param {Set<string>} selectedSessions
   * @param {Object} stats
   */
  emitSelectionChanged(selectedSessions, stats) {
    selectionEventBus.emit(SelectionEvents.SELECTION_CHANGED, {
      selectedCount: selectedSessions.size,
      selectedIds: Array.from(selectedSessions),
      stats,
      timestamp: Date.now()
    })
  },

  /**
   * Emit bulk action result
   * @param {string} action
   * @param {boolean} success
   * @param {Object} result
   */
  emitBulkActionResult(action, success, result) {
    const event = success 
      ? SelectionEvents.BULK_ACTION_COMPLETED 
      : SelectionEvents.BULK_ACTION_FAILED
    
    selectionEventBus.emit(event, {
      action,
      success,
      result,
      timestamp: Date.now()
    })
  },

  /**
   * Subscribe to selection changes
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
   */
  onSelectionChanged(handler) {
    return selectionEventBus.on(SelectionEvents.SELECTION_CHANGED, handler)
  },

  /**
   * Subscribe to mode changes
   * @param {Function} enterHandler
   * @param {Function} exitHandler
   * @returns {Object} Object with unsubscribe functions
   */
  onModeChange(enterHandler, exitHandler) {
    return {
      unsubscribeEnter: selectionEventBus.on(
        SelectionEvents.MANAGE_MODE_ENTERED, 
        enterHandler
      ),
      unsubscribeExit: selectionEventBus.on(
        SelectionEvents.MANAGE_MODE_EXITED, 
        exitHandler
      )
    }
  }
}

// Export the singleton instance
export default selectionEventBus

// Also export the class for testing purposes
export { SelectionEventBus }