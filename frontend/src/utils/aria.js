// ARIA Attributes Manager
export const ariaHelpers = {
  // Screen reader announcement
  announce(message, priority = 'polite') {
    const announcer = document.getElementById('aria-live-region')
    if (announcer) {
      announcer.setAttribute('aria-live', priority)
      announcer.textContent = message
      setTimeout(() => announcer.textContent = '', 1000)
    }
  },

  // Announce selection changes
  announceSelection(count, total = null) {
    const message = total ? `${count} of ${total} items selected` : `${count} items selected`
    this.announce(message)
  },

  // Set selection attributes
  setSelectionAttributes(element, isSelected, position, setSize) {
    if (!element) return
    element.setAttribute('aria-selected', isSelected)
    element.setAttribute('aria-posinset', position)
    element.setAttribute('aria-setsize', setSize)
    if (!element.getAttribute('role')) {
      element.setAttribute('role', 'option')
    }
  },

  // Set grid attributes
  setGridAttributes(container, rowCount, colCount) {
    if (!container) return
    container.setAttribute('role', 'grid')
    container.setAttribute('aria-rowcount', rowCount)
    container.setAttribute('aria-colcount', colCount)
  },

  // Set toolbar attributes
  setToolbarAttributes(toolbar, label) {
    if (!toolbar) return
    toolbar.setAttribute('role', 'toolbar')
    toolbar.setAttribute('aria-label', label)
  },

  // Set button attributes
  setButtonAttributes(button, label, pressed = null) {
    if (!button) return
    button.setAttribute('role', 'button')
    button.setAttribute('aria-label', label)
    if (pressed !== null) {
      button.setAttribute('aria-pressed', pressed)
    }
  },

  // Set dialog attributes
  setDialogAttributes(dialog, label, modal = true) {
    if (!dialog) return
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-label', label)
    dialog.setAttribute('aria-modal', modal)
  },

  // Create live region
  createLiveRegion(id = 'aria-live-region') {
    let region = document.getElementById(id)
    if (!region) {
      region = document.createElement('div')
      region.id = id
      region.setAttribute('aria-live', 'polite')
      region.setAttribute('aria-atomic', 'true')
      region.style.position = 'absolute'
      region.style.left = '-10000px'
      region.style.width = '1px'
      region.style.height = '1px'
      region.style.overflow = 'hidden'
      document.body.appendChild(region)
    }
    return region
  }
}

export default ariaHelpers