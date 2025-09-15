// Minimal event bus for selection-related cross-component communication

export const selectionEventBus = {
  events: new Map(),

  emit(event, data) {
    const handlers = this.events.get(event)
    if (!handlers) return
    for (const h of handlers) {
      try { h(data) } catch (e) { console.error('eventBus handler error', e) }
    }
  },

  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, new Set())
    this.events.get(event).add(handler)
    return () => this.off(event, handler)
  },

  off(event, handler) {
    const handlers = this.events.get(event)
    if (!handlers) return
    handlers.delete(handler)
    if (handlers.size === 0) this.events.delete(event)
  },
}

