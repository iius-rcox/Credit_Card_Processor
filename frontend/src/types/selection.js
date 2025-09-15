/**
 * @typedef {Object} SelectionState
 * @property {boolean} isManageMode - Whether manage mode is active
 * @property {Set<string>} selectedSessions - Set of selected session IDs
 * @property {number|null} lastSelectedIndex - Index of last selected item
 * @property {number|null} selectionAnchor - Anchor point for range selection
 */

/**
 * @typedef {'delete' | 'export' | 'close' | 'archive'} BulkActionType
 */

/**
 * @typedef {Object} BulkActionRequest
 * @property {BulkActionType} action - Type of bulk action to perform
 * @property {string[]} sessionIds - Array of session IDs to act upon
 * @property {Object} [options] - Optional parameters for the action
 * @property {boolean} [options.includeExports] - Include export files in deletion
 * @property {string} [options.exportFormat] - Format for export (csv, json)
 */

/**
 * @typedef {Object} SelectionStats
 * @property {number} total - Total number of sessions in current view
 * @property {number} selected - Number of selected sessions
 * @property {number} eligible - Number of eligible sessions for action
 * @property {number} ineligible - Number of ineligible sessions
 * @property {number} pages - Total number of pages
 * @property {number} currentPage - Current page number
 */

/**
 * @typedef {Object} BulkOperationState
 * @property {BulkActionType|null} type - Type of operation being performed
 * @property {boolean} inProgress - Whether operation is in progress
 * @property {BulkOperationResult|null} results - Results of the operation
 * @property {Error|null} error - Error if operation failed
 */

/**
 * @typedef {Object} BulkOperationResult
 * @property {string[]} processed - Successfully processed session IDs
 * @property {FailedSession[]} failed - Failed sessions with reasons
 * @property {number} totalProcessed - Total count of processed sessions
 * @property {number} totalFailed - Total count of failed sessions
 * @property {string} [downloadUrl] - URL for export download (if applicable)
 */

/**
 * @typedef {Object} FailedSession
 * @property {string} sessionId - Session ID that failed
 * @property {string} reason - Reason for failure
 * @property {string} [code] - Error code if applicable
 */

/**
 * @typedef {Object} SessionData
 * @property {string} session_id - Unique session identifier
 * @property {string} session_name - Display name of session
 * @property {SessionStatus} status - Current status of session
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} [updated_at] - ISO timestamp of last update
 * @property {boolean} has_results - Whether session has results
 * @property {number} [file_count] - Number of files in session
 * @property {number} [transaction_count] - Number of transactions
 * @property {number} [exception_count] - Number of exceptions
 */

/**
 * @typedef {'IDLE' | 'PROCESSING' | 'EXTRACTING' | 'ANALYZING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CLOSED' | 'ARCHIVED'} SessionStatus
 */

/**
 * @typedef {Object} SelectionEvent
 * @property {'select' | 'deselect' | 'clear' | 'selectAll'} type - Type of selection event
 * @property {string[]} sessionIds - Affected session IDs
 * @property {number} totalSelected - Total selected after event
 * @property {Object} [metadata] - Additional event metadata
 */

/**
 * @typedef {Object} SelectionValidation
 * @property {string[]} eligible - Session IDs eligible for action
 * @property {IneligibleSession[]} ineligible - Ineligible sessions with reasons
 * @property {string[]} notFound - Session IDs that don't exist
 */

/**
 * @typedef {Object} IneligibleSession
 * @property {string} sessionId - Session ID
 * @property {string} reason - Why session is ineligible
 * @property {SessionStatus} status - Current status
 */

/**
 * @typedef {Object} SelectionFilter
 * @property {SessionStatus[]} [statuses] - Filter by statuses
 * @property {string} [search] - Search term
 * @property {string} [dateFrom] - Start date ISO string
 * @property {string} [dateTo] - End date ISO string
 * @property {boolean} [hasResults] - Filter by results availability
 */

/**
 * @typedef {Object} KeyboardShortcut
 * @property {string} key - Key combination (e.g., 'Ctrl+A')
 * @property {string} description - Human-readable description
 * @property {Function} handler - Function to execute
 * @property {boolean} [preventDefault] - Whether to prevent default
 */

/**
 * @typedef {Object} DrawerState
 * @property {boolean} isOpen - Whether drawer is open
 * @property {BulkActionType|null} actionType - Type of action being confirmed
 * @property {boolean} confirmed - Whether user has confirmed
 * @property {string[]} sessionIds - Sessions being acted upon
 */

// Export type checking functions
export const TypeValidators = {
  /**
   * Check if status is valid
   * @param {string} status
   * @returns {boolean}
   */
  isValidStatus(status) {
    const validStatuses = [
      'IDLE', 'PROCESSING', 'EXTRACTING', 'ANALYZING', 
      'UPLOADING', 'COMPLETED', 'FAILED', 'CLOSED', 'ARCHIVED'
    ]
    return validStatuses.includes(status?.toUpperCase())
  },

  /**
   * Check if bulk action type is valid
   * @param {string} action
   * @returns {boolean}
   */
  isValidBulkAction(action) {
    const validActions = ['delete', 'export', 'close', 'archive']
    return validActions.includes(action)
  },

  /**
   * Validate session data structure
   * @param {any} session
   * @returns {boolean}
   */
  isValidSession(session) {
    return session && 
           typeof session === 'object' &&
           typeof session.session_id === 'string' &&
           typeof session.session_name === 'string' &&
           this.isValidStatus(session.status)
  },

  /**
   * Validate bulk action request
   * @param {any} request
   * @returns {boolean}
   */
  isValidBulkRequest(request) {
    return request &&
           typeof request === 'object' &&
           this.isValidBulkAction(request.action) &&
           Array.isArray(request.sessionIds) &&
           request.sessionIds.every(id => typeof id === 'string')
  }
}

// Export constants
export const SelectionConstants = {
  // Maximum selections allowed
  MAX_SELECTION_COUNT: 1000,
  
  // Session statuses that block selection
  BLOCKED_STATUSES: ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING'],
  
  // Statuses that allow deletion
  DELETABLE_STATUSES: ['COMPLETED', 'FAILED', 'CLOSED'],
  
  // Statuses that allow export
  EXPORTABLE_STATUSES: ['COMPLETED', 'CLOSED', 'ARCHIVED'],
  
  // Default page size
  DEFAULT_PAGE_SIZE: 20,
  
  // Selection persistence timeout (ms)
  SELECTION_PERSISTENCE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  
  // Debounce delay for selection updates (ms)
  SELECTION_UPDATE_DEBOUNCE: 100
}

// Export error codes
export const SelectionErrorCodes = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_ACTIVE: 'SESSION_ACTIVE',
  SESSION_LOCKED: 'SESSION_LOCKED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  MAX_SELECTION_EXCEEDED: 'MAX_SELECTION_EXCEEDED',
  INVALID_ACTION: 'INVALID_ACTION',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
}