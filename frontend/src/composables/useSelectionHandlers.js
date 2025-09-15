import { toRefs } from 'vue'
import { useSessionSelectionStore } from '@/stores/sessionSelection.js'
import { selectionRules } from '@/utils/selectionRules.js'

/**
 * Selection handlers for Session Manager cards/list
 * Provides click, meta, and shift range selection behavior.
 */
export function useSelectionHandlers(options = {}) {
  const store = useSessionSelectionStore()

  function toggleSelection(sessionId, index) {
    if (!sessionId && sessionId !== 0) return
    const id = String(sessionId)
    if (store.selectedSessions.has(id)) store.removeFromSelection(id)
    else store.addToSelection(id)
    store.setLastSelectedIndex(index)
  }

  function selectRange(startIndex, endIndex, sessions = []) {
    const resolver = (i) => String(sessions[i]?.session_id)
    store.selectRangeByIndex(startIndex, endIndex, resolver)
  }

  function handleSessionClick(event, session, index, sessions = []) {
    // Respect manage mode; if not in manage mode, do nothing special
    if (!store.isManageMode) return false

    if (!selectionRules.canSelectSession(session)) {
      // Ineligible selection: optionally show hint/notification upstream
      return true
    }

    const isShift = event.shiftKey
    const isMeta = event.ctrlKey || event.metaKey

    if (isShift && store.lastSelectedIndex != null) {
      const start = store.lastSelectedIndex
      selectRange(start, index, sessions)
      store.setSelectionAnchor(start)
      store.setLastSelectedIndex(index)
    } else if (isMeta) {
      toggleSelection(session.session_id, index)
    } else {
      // Single selection resets current selection first
      store.clearSelection()
      toggleSelection(session.session_id, index)
      store.setSelectionAnchor(index)
    }

    return true
  }

  return {
    handleSessionClick,
    toggleSelection,
    selectRange,
    ...toRefs(store),
  }
}

