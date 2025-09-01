import { ref, onMounted, onUnmounted, nextTick } from 'vue'

/**
 * Composable for accessibility features and keyboard navigation
 */
export function useAccessibility() {
  const announcements = ref('')
  const focusedElement = ref(null)
  const keyboardNavMode = ref(false)

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  function announce(message, priority = 'polite') {
    announcements.value = message
    
    // Clear announcement after a delay to allow re-announcement of same message
    setTimeout(() => {
      announcements.value = ''
    }, 1000)
  }

  /**
   * Focus management utilities
   */
  const focus = {
    /**
     * Set focus to an element with screen reader announcement
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} announcement - Optional announcement
     */
    set(element, announcement = null) {
      const target = typeof element === 'string' 
        ? document.querySelector(element)
        : element

      if (target) {
        nextTick(() => {
          target.focus()
          focusedElement.value = target
          
          if (announcement) {
            announce(announcement)
          }
        })
      }
    },

    /**
     * Focus the first focusable element in a container
     * @param {HTMLElement|string} container - Container element or selector
     */
    firstIn(container) {
      const containerEl = typeof container === 'string'
        ? document.querySelector(container)
        : container

      if (containerEl) {
        const focusable = this.getFocusableElements(containerEl)
        if (focusable.length > 0) {
          focusable[0].focus()
        }
      }
    },

    /**
     * Focus the last focusable element in a container
     * @param {HTMLElement|string} container - Container element or selector
     */
    lastIn(container) {
      const containerEl = typeof container === 'string'
        ? document.querySelector(container)
        : container

      if (containerEl) {
        const focusable = this.getFocusableElements(containerEl)
        if (focusable.length > 0) {
          focusable[focusable.length - 1].focus()
        }
      }
    },

    /**
     * Get all focusable elements within a container
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement[]} Array of focusable elements
     */
    getFocusableElements(container) {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[role="button"]:not([disabled])',
        '[role="tab"]:not([disabled])',
        '[role="menuitem"]:not([disabled])'
      ].join(',')

      return Array.from(container.querySelectorAll(focusableSelectors))
        .filter(el => {
          // Filter out hidden elements
          const style = window.getComputedStyle(el)
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' &&
                 el.offsetParent !== null
        })
    },

    /**
     * Trap focus within a container (for modals, etc.)
     * @param {HTMLElement} container - Container to trap focus in
     * @returns {Function} Function to remove the trap
     */
    trap(container) {
      const focusableElements = this.getFocusableElements(container)
      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]

      function handleTabKey(event) {
        if (event.key !== 'Tab') return

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            event.preventDefault()
            lastFocusable.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            event.preventDefault()
            firstFocusable.focus()
          }
        }
      }

      container.addEventListener('keydown', handleTabKey)

      // Focus first element
      if (firstFocusable) {
        firstFocusable.focus()
      }

      // Return cleanup function
      return () => {
        container.removeEventListener('keydown', handleTabKey)
      }
    }
  }

  /**
   * Keyboard navigation utilities
   */
  const keyboard = {
    /**
     * Handle arrow key navigation for lists/grids
     * @param {KeyboardEvent} event - Keyboard event
     * @param {HTMLElement[]} elements - Elements to navigate between
     * @param {number} currentIndex - Current focused element index
     * @param {Object} options - Navigation options
     */
    handleArrowNavigation(event, elements, currentIndex, options = {}) {
      const {
        horizontal = false,
        vertical = true,
        loop = true,
        columns = 1
      } = options

      let newIndex = currentIndex

      switch (event.key) {
        case 'ArrowUp':
          if (vertical) {
            event.preventDefault()
            newIndex = loop && currentIndex === 0 
              ? elements.length - 1 
              : Math.max(0, currentIndex - columns)
          }
          break

        case 'ArrowDown':
          if (vertical) {
            event.preventDefault()
            newIndex = loop && currentIndex === elements.length - 1
              ? 0
              : Math.min(elements.length - 1, currentIndex + columns)
          }
          break

        case 'ArrowLeft':
          if (horizontal) {
            event.preventDefault()
            newIndex = loop && currentIndex === 0
              ? elements.length - 1
              : Math.max(0, currentIndex - 1)
          }
          break

        case 'ArrowRight':
          if (horizontal) {
            event.preventDefault()
            newIndex = loop && currentIndex === elements.length - 1
              ? 0
              : Math.min(elements.length - 1, currentIndex + 1)
          }
          break

        case 'Home':
          event.preventDefault()
          newIndex = 0
          break

        case 'End':
          event.preventDefault()
          newIndex = elements.length - 1
          break
      }

      if (newIndex !== currentIndex && elements[newIndex]) {
        elements[newIndex].focus()
        return newIndex
      }

      return currentIndex
    },

    /**
     * Handle escape key
     * @param {KeyboardEvent} event - Keyboard event
     * @param {Function} callback - Callback to execute on escape
     */
    handleEscape(event, callback) {
      if (event.key === 'Escape') {
        event.preventDefault()
        callback()
      }
    }
  }

  /**
   * ARIA utilities
   */
  const aria = {
    /**
     * Update ARIA live region content
     * @param {string} message - Message to announce
     * @param {string} priority - 'polite' or 'assertive'
     */
    announce(message, priority = 'polite') {
      announce(message, priority)
    },

    /**
     * Set ARIA expanded state
     * @param {HTMLElement} element - Element to update
     * @param {boolean} expanded - Whether element is expanded
     */
    setExpanded(element, expanded) {
      element.setAttribute('aria-expanded', expanded.toString())
    },

    /**
     * Set ARIA selected state
     * @param {HTMLElement} element - Element to update
     * @param {boolean} selected - Whether element is selected
     */
    setSelected(element, selected) {
      element.setAttribute('aria-selected', selected.toString())
    },

    /**
     * Set ARIA busy state
     * @param {HTMLElement} element - Element to update
     * @param {boolean} busy - Whether element is busy
     */
    setBusy(element, busy) {
      element.setAttribute('aria-busy', busy.toString())
    },

    /**
     * Set ARIA hidden state
     * @param {HTMLElement} element - Element to update
     * @param {boolean} hidden - Whether element is hidden from screen readers
     */
    setHidden(element, hidden) {
      if (hidden) {
        element.setAttribute('aria-hidden', 'true')
      } else {
        element.removeAttribute('aria-hidden')
      }
    }
  }

  /**
   * Detect keyboard vs mouse navigation
   */
  function setupNavigationDetection() {
    function handleMouseDown() {
      keyboardNavMode.value = false
      document.body.classList.remove('keyboard-nav')
      document.body.classList.add('mouse-nav')
    }

    function handleKeyDown(event) {
      if (event.key === 'Tab') {
        keyboardNavMode.value = true
        document.body.classList.remove('mouse-nav')
        document.body.classList.add('keyboard-nav')
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }

  // Lifecycle
  let cleanupNavigationDetection

  onMounted(() => {
    cleanupNavigationDetection = setupNavigationDetection()
  })

  onUnmounted(() => {
    if (cleanupNavigationDetection) {
      cleanupNavigationDetection()
    }
  })

  return {
    // State
    announcements,
    focusedElement,
    keyboardNavMode,

    // Methods
    announce,
    focus,
    keyboard,
    aria
  }
}