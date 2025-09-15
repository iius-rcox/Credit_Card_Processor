import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export function useFocusManagement() {
  // Focus management state
  const focusState = ref({
    isEnabled: true,
    currentFocusIndex: 0,
    focusableElements: [],
    focusHistory: [],
    maxHistorySize: 10,
    focusTrap: null,
    focusTrapContainer: null
  })

  // Focus management configuration
  const config = ref({
    enableFocusTrap: true,
    enableFocusHistory: true,
    enableFocusRestore: true,
    focusDelay: 0,
    focusTimeout: 100
  })

  // Focus management analysis
  const analysis = computed(() => {
    const state = focusState.value

    return {
      focusableCount: {
        value: state.focusableElements.length,
        threshold: 50,
        status: state.focusableElements.length <= 50 ? 'good' : 'poor'
      },
      focusHistorySize: {
        value: state.focusHistory.length,
        threshold: state.maxHistorySize,
        status: state.focusHistory.length <= state.maxHistorySize ? 'good' : 'poor'
      },
      currentFocus: {
        value: state.currentFocusIndex,
        threshold: state.focusableElements.length - 1,
        status: state.currentFocusIndex <= state.focusableElements.length - 1 ? 'good' : 'poor'
      }
    }
  })

  // Set focusable elements
  function setFocusableElements(elements) {
    focusState.value.focusableElements = Array.isArray(elements) ? elements : []
    focusState.value.currentFocusIndex = 0
  }

  // Update focusable elements
  function updateFocusableElements(container = document) {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="menuitem"]:not([aria-disabled="true"])',
      '[role="option"]:not([aria-disabled="true"])',
      '[role="tab"]:not([aria-disabled="true"])'
    ]

    const elements = []
    focusableSelectors.forEach(selector => {
      const found = container.querySelectorAll(selector)
      found.forEach(element => {
        if (isElementFocusable(element)) {
          elements.push(element)
        }
      })
    })

    setFocusableElements(elements)
  }

  // Check if element is focusable
  function isElementFocusable(element) {
    if (!element) return false

    // Check if element is visible
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false

    // Check if element has accessible name
    const accessibleName = getAccessibleName(element)
    if (!accessibleName) return false

    // Check if element is focusable
    const tabIndex = element.getAttribute('tabindex')
    if (tabIndex === '-1') return false

    return true
  }

  // Get accessible name for element
  function getAccessibleName(element) {
    if (!element) return ''

    // Check aria-label first
    const ariaLabel = element.getAttribute('aria-label')
    if (ariaLabel) return ariaLabel

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby')
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy)
      if (labelElement) return labelElement.textContent
    }

    // Check for associated label
    const id = element.getAttribute('id')
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`)
      if (label) return label.textContent
    }

    // Check for text content
    const textContent = element.textContent?.trim()
    if (textContent) return textContent

    // Check for title attribute
    const title = element.getAttribute('title')
    if (title) return title

    return ''
  }

  // Move focus in specified direction
  function moveFocus(direction) {
    const elements = focusState.value.focusableElements
    if (elements.length === 0) return false

    let newIndex = focusState.value.currentFocusIndex

    switch (direction) {
      case 'next':
        newIndex = (newIndex + 1) % elements.length
        break
      case 'previous':
        newIndex = (newIndex - 1 + elements.length) % elements.length
        break
      case 'first':
        newIndex = 0
        break
      case 'last':
        newIndex = elements.length - 1
        break
      case 'up':
        newIndex = Math.max(0, newIndex - 1)
        break
      case 'down':
        newIndex = Math.min(elements.length - 1, newIndex + 1)
        break
      case 'left':
        newIndex = Math.max(0, newIndex - 1)
        break
      case 'right':
        newIndex = Math.min(elements.length - 1, newIndex + 1)
        break
    }

    return moveToPosition(newIndex)
  }

  // Move to specific position
  function moveToPosition(index) {
    const elements = focusState.value.focusableElements
    if (index < 0 || index >= elements.length) return false

    const element = elements[index]
    if (!element) return false

    // Add to focus history
    if (config.value.enableFocusHistory) {
      addToFocusHistory(focusState.value.currentFocusIndex)
    }

    // Update current focus index
    focusState.value.currentFocusIndex = index

    // Focus the element
    if (config.value.focusDelay > 0) {
      setTimeout(() => {
        element.focus()
      }, config.value.focusDelay)
    } else {
      element.focus()
    }

    return true
  }

  // Focus specific element
  function focusElement(element) {
    if (!element) return false

    const index = focusState.value.focusableElements.indexOf(element)
    if (index === -1) return false

    return moveToPosition(index)
  }

  // Focus next element
  function focusNext() {
    return moveFocus('next')
  }

  // Focus previous element
  function focusPrevious() {
    return moveFocus('previous')
  }

  // Focus first element
  function focusFirst() {
    return moveFocus('first')
  }

  // Focus last element
  function focusLast() {
    return moveFocus('last')
  }

  // Focus element by selector
  function focusBySelector(selector) {
    const element = document.querySelector(selector)
    return focusElement(element)
  }

  // Focus element by data attribute
  function focusByDataAttribute(attribute, value) {
    const element = document.querySelector(`[data-${attribute}="${value}"]`)
    return focusElement(element)
  }

  // Add to focus history
  function addToFocusHistory(index) {
    const history = focusState.value.focusHistory
    const maxSize = focusState.value.maxHistorySize

    // Don't add if it's the same as the last item
    if (history.length > 0 && history[history.length - 1] === index) {
      return
    }

    history.push(index)

    // Limit history size
    if (history.length > maxSize) {
      history.shift()
    }
  }

  // Restore previous focus
  function restorePreviousFocus() {
    const history = focusState.value.focusHistory
    if (history.length === 0) return false

    const previousIndex = history.pop()
    return moveToPosition(previousIndex)
  }

  // Clear focus history
  function clearFocusHistory() {
    focusState.value.focusHistory = []
  }

  // Set focus trap
  function setFocusTrap(container, options = {}) {
    if (!container) return null

    const {
      firstFocusable = null,
      lastFocusable = null,
      onEscape = null
    } = options

    const focusableElements = focusState.value.focusableElements
    const first = firstFocusable || focusableElements[0]
    const last = lastFocusable || focusableElements[focusableElements.length - 1]

    const handleKeydown = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }
      } else if (event.key === 'Escape' && onEscape) {
        onEscape(event)
      }
    }

    container.addEventListener('keydown', handleKeydown)
    focusState.value.focusTrap = handleKeydown
    focusState.value.focusTrapContainer = container

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeydown)
      focusState.value.focusTrap = null
      focusState.value.focusTrapContainer = null
    }
  }

  // Remove focus trap
  function removeFocusTrap() {
    if (focusState.value.focusTrap && focusState.value.focusTrapContainer) {
      focusState.value.focusTrapContainer.removeEventListener('keydown', focusState.value.focusTrap)
      focusState.value.focusTrap = null
      focusState.value.focusTrapContainer = null
    }
  }

  // Enable focus management
  function enableFocusManagement() {
    focusState.value.isEnabled = true
  }

  // Disable focus management
  function disableFocusManagement() {
    focusState.value.isEnabled = false
  }

  // Get current focus element
  function getCurrentFocusElement() {
    const elements = focusState.value.focusableElements
    const index = focusState.value.currentFocusIndex
    return elements[index] || null
  }

  // Get focus state
  function getFocusState() {
    return {
      ...focusState.value,
      currentElement: getCurrentFocusElement(),
      analysis: analysis.value
    }
  }

  // Update focusable elements on mount
  onMounted(() => {
    updateFocusableElements()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    removeFocusTrap()
  })

  return {
    // State
    focusState,
    config,
    analysis,

    // Methods
    setFocusableElements,
    updateFocusableElements,
    moveFocus,
    moveToPosition,
    focusElement,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusBySelector,
    focusByDataAttribute,
    addToFocusHistory,
    restorePreviousFocus,
    clearFocusHistory,
    setFocusTrap,
    removeFocusTrap,
    enableFocusManagement,
    disableFocusManagement,
    getCurrentFocusElement,
    getFocusState
  }
}