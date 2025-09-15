import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useSessionSelectionStore } from '@/stores/sessionSelection'

export function useKeyboardNavigation() {
  const store = useSessionSelectionStore()
  
  // Keyboard navigation state
  const navigationState = ref({
    isEnabled: true,
    currentFocusIndex: 0,
    focusableElements: [],
    lastKeyPress: null,
    keyComboBuffer: '',
    bufferTimeout: null
  })

  // Keyboard shortcuts configuration
  const shortcuts = ref({
    'Alt+M': {
      action: 'toggleManageMode',
      description: 'Toggle manage mode',
      preventDefault: true,
      stopPropagation: true
    },
    'Escape': {
      action: 'exitManageMode',
      description: 'Exit manage mode',
      preventDefault: true,
      stopPropagation: true
    },
    'Ctrl+A': {
      action: 'selectAll',
      description: 'Select all visible sessions',
      preventDefault: true,
      stopPropagation: true
    },
    'Ctrl+Shift+A': {
      action: 'selectAllFiltered',
      description: 'Select all filtered sessions',
      preventDefault: true,
      stopPropagation: true
    },
    'Delete': {
      action: 'deleteSelected',
      description: 'Delete selected sessions',
      preventDefault: true,
      stopPropagation: true
    },
    'Backspace': {
      action: 'deleteSelected',
      description: 'Delete selected sessions',
      preventDefault: true,
      stopPropagation: true
    },
    'Space': {
      action: 'toggleSelection',
      description: 'Toggle current session selection',
      preventDefault: true,
      stopPropagation: true
    },
    'Enter': {
      action: 'confirmAction',
      description: 'Confirm current action',
      preventDefault: true,
      stopPropagation: true
    },
    'ArrowUp': {
      action: 'moveFocusUp',
      description: 'Move focus up',
      preventDefault: true,
      stopPropagation: true
    },
    'ArrowDown': {
      action: 'moveFocusDown',
      description: 'Move focus down',
      preventDefault: true,
      stopPropagation: true
    },
    'ArrowLeft': {
      action: 'moveFocusLeft',
      description: 'Move focus left',
      preventDefault: true,
      stopPropagation: true
    },
    'ArrowRight': {
      action: 'moveFocusRight',
      description: 'Move focus right',
      preventDefault: true,
      stopPropagation: true
    },
    'Home': {
      action: 'moveToFirst',
      description: 'Move to first session',
      preventDefault: true,
      stopPropagation: true
    },
    'End': {
      action: 'moveToLast',
      description: 'Move to last session',
      preventDefault: true,
      stopPropagation: true
    },
    'PageUp': {
      action: 'movePageUp',
      description: 'Move up one page',
      preventDefault: true,
      stopPropagation: true
    },
    'PageDown': {
      action: 'movePageDown',
      description: 'Move down one page',
      preventDefault: true,
      stopPropagation: true
    },
    'Ctrl+D': {
      action: 'clearSelection',
      description: 'Clear all selections',
      preventDefault: true,
      stopPropagation: true
    },
    'Ctrl+E': {
      action: 'exportSelected',
      description: 'Export selected sessions',
      preventDefault: true,
      stopPropagation: true
    },
    'Ctrl+Shift+D': {
      action: 'closeSelected',
      description: 'Close selected sessions',
      preventDefault: true,
      stopPropagation: true
    }
  })

  // Event handlers
  const eventHandlers = ref({
    toggleManageMode: () => {
      store.toggleManageMode()
      announceToScreenReader(store.isManageMode ? 'Manage mode enabled' : 'Manage mode disabled')
    },

    exitManageMode: () => {
      if (store.isManageMode) {
        store.toggleManageMode()
        announceToScreenReader('Manage mode disabled')
      }
    },

    selectAll: (event) => {
      if (store.isManageMode) {
        const visibleSessions = getVisibleSessions()
        const eligibleSessions = visibleSessions.filter(session => canSelectSession(session))
        const sessionIds = eligibleSessions.map(session => session.session_id)
        
        store.addToSelection(sessionIds)
        announceToScreenReader(`${sessionIds.length} sessions selected`)
      }
    },

    selectAllFiltered: (event) => {
      if (store.isManageMode) {
        // This would trigger select all filtered sessions
        announceToScreenReader('Selecting all filtered sessions...')
      }
    },

    deleteSelected: (event) => {
      if (store.isManageMode && store.hasSelection) {
        showDeleteConfirmation()
        announceToScreenReader('Delete confirmation opened')
      }
    },

    toggleSelection: (event) => {
      if (store.isManageMode && event.target.dataset.sessionId) {
        const sessionId = event.target.dataset.sessionId
        const session = getSessionById(sessionId)
        
        if (session && canSelectSession(session)) {
          if (store.selectedSessions.has(sessionId)) {
            store.removeFromSelection([sessionId])
            announceToScreenReader('Session deselected')
          } else {
            store.addToSelection([sessionId])
            announceToScreenReader('Session selected')
          }
        }
      }
    },

    confirmAction: (event) => {
      // Handle confirmation in modals/drawers
      const confirmButton = document.querySelector('[data-test="confirm-button"]:not([disabled])')
      if (confirmButton) {
        confirmButton.click()
      }
    },

    moveFocusUp: (event) => {
      moveFocus('up')
    },

    moveFocusDown: (event) => {
      moveFocus('down')
    },

    moveFocusLeft: (event) => {
      moveFocus('left')
    },

    moveFocusRight: (event) => {
      moveFocus('right')
    },

    moveToFirst: (event) => {
      moveToPosition(0)
    },

    moveToLast: (event) => {
      moveToPosition(navigationState.value.focusableElements.length - 1)
    },

    movePageUp: (event) => {
      const pageSize = getPageSize()
      const newIndex = Math.max(0, navigationState.value.currentFocusIndex - pageSize)
      moveToPosition(newIndex)
    },

    movePageDown: (event) => {
      const pageSize = getPageSize()
      const newIndex = Math.min(
        navigationState.value.focusableElements.length - 1,
        navigationState.value.currentFocusIndex + pageSize
      )
      moveToPosition(newIndex)
    },

    clearSelection: (event) => {
      if (store.isManageMode) {
        store.clearSelection()
        announceToScreenReader('Selection cleared')
      }
    },

    exportSelected: (event) => {
      if (store.isManageMode && store.hasSelection) {
        // Trigger export
        announceToScreenReader('Exporting selected sessions...')
      }
    },

    closeSelected: (event) => {
      if (store.isManageMode && store.hasSelection) {
        // Trigger close
        announceToScreenReader('Closing selected sessions...')
      }
    }
  })

  // Get key combination from event
  function getKeyCombo(event) {
    const modifiers = []
    if (event.ctrlKey) modifiers.push('Ctrl')
    if (event.shiftKey) modifiers.push('Shift')
    if (event.altKey) modifiers.push('Alt')
    if (event.metaKey) modifiers.push('Meta')
    
    const key = event.key
    const combo = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key
    
    return combo
  }

  // Handle keydown event
  function handleKeydown(event) {
    if (!navigationState.value.isEnabled) return

    const keyCombo = getKeyCombo(event)
    const shortcut = shortcuts.value[keyCombo]

    if (shortcut) {
      // Prevent default behavior
      if (shortcut.preventDefault) {
        event.preventDefault()
      }
      if (shortcut.stopPropagation) {
        event.stopPropagation()
      }

      // Execute action
      const handler = eventHandlers.value[shortcut.action]
      if (handler) {
        handler(event)
      }

      // Update last key press
      navigationState.value.lastKeyPress = {
        key: keyCombo,
        timestamp: Date.now()
      }
    }
  }

  // Move focus in specified direction
  function moveFocus(direction) {
    const elements = navigationState.value.focusableElements
    if (elements.length === 0) return

    let newIndex = navigationState.value.currentFocusIndex

    switch (direction) {
      case 'up':
        newIndex = Math.max(0, newIndex - 1)
        break
      case 'down':
        newIndex = Math.min(elements.length - 1, newIndex + 1)
        break
      case 'left':
        // For grid layouts, move left
        newIndex = Math.max(0, newIndex - 1)
        break
      case 'right':
        // For grid layouts, move right
        newIndex = Math.min(elements.length - 1, newIndex + 1)
        break
    }

    moveToPosition(newIndex)
  }

  // Move to specific position
  function moveToPosition(index) {
    const elements = navigationState.value.focusableElements
    if (index >= 0 && index < elements.length) {
      navigationState.value.currentFocusIndex = index
      const element = elements[index]
      if (element && element.focus) {
        element.focus()
        announceToScreenReader(`Focused on item ${index + 1} of ${elements.length}`)
      }
    }
  }

  // Get page size for PageUp/PageDown
  function getPageSize() {
    // Calculate based on visible items or use default
    const visibleItems = document.querySelectorAll('[data-session-item]')
    return Math.max(5, Math.floor(visibleItems.length / 2))
  }

  // Get visible sessions
  function getVisibleSessions() {
    // This would return currently visible sessions
    // For now, return empty array
    return []
  }

  // Get session by ID
  function getSessionById(sessionId) {
    // This would return session data
    // For now, return null
    return null
  }

  // Check if session can be selected
  function canSelectSession(session) {
    const blockedStatuses = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING']
    return !blockedStatuses.includes(session.status?.toUpperCase())
  }

  // Show delete confirmation
  function showDeleteConfirmation() {
    // This would show the delete confirmation drawer
    console.log('Showing delete confirmation')
  }

  // Announce to screen reader
  function announceToScreenReader(message) {
    const announcer = document.getElementById('aria-live-region')
    if (announcer) {
      announcer.textContent = message
      setTimeout(() => {
        announcer.textContent = ''
      }, 1000)
    }
  }

  // Set focusable elements
  function setFocusableElements(elements) {
    navigationState.value.focusableElements = elements
  }

  // Update focusable elements
  function updateFocusableElements() {
    const elements = document.querySelectorAll('[data-session-item], [data-focusable]')
    navigationState.value.focusableElements = Array.from(elements)
  }

  // Enable keyboard navigation
  function enableKeyboardNavigation() {
    navigationState.value.isEnabled = true
  }

  // Disable keyboard navigation
  function disableKeyboardNavigation() {
    navigationState.value.isEnabled = false
  }

  // Get keyboard shortcuts help
  function getKeyboardShortcuts() {
    return Object.entries(shortcuts.value).map(([key, config]) => ({
      key,
      description: config.description,
      action: config.action
    }))
  }

  // Get navigation state
  function getNavigationState() {
    return {
      ...navigationState.value,
      shortcuts: getKeyboardShortcuts()
    }
  }

  // Setup event listeners
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    updateFocusableElements()
  })

  // Cleanup event listeners
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {
    // State
    navigationState,
    shortcuts,
    eventHandlers,

    // Methods
    handleKeydown,
    moveFocus,
    moveToPosition,
    setFocusableElements,
    updateFocusableElements,
    enableKeyboardNavigation,
    disableKeyboardNavigation,
    getKeyboardShortcuts,
    getNavigationState,
    announceToScreenReader
  }
}