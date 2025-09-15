import { defineStore } from 'pinia'

// Utility to normalize session ids
function toId(id) {
  return typeof id === 'string' ? id : String(id || '')
}

export const useSessionSelectionStore = defineStore('sessionSelection', {
  state: () => ({
    isManageMode: false,
    selectedSessions: new Set(),
    lastSelectedIndex: null,
    selectionAnchor: null,
    filteredSessionIds: [],
    selectionStats: {
      total: 0,
      selected: 0,
      eligible: 0,
      ineligible: 0,
      pages: 1,
    },
    bulkOperation: {
      type: null,
      inProgress: false,
      results: null,
    },
  }),

  getters: {
    selectedCount: (state) => state.selectedSessions.size,
    hasSelection: (state) => state.selectedSessions.size > 0,
    canPerformBulkAction: (state) => state.selectionStats.eligible > 0,
    selectedIds: (state) => Array.from(state.selectedSessions),
  },

  actions: {
    toggleManageMode(force) {
      const next = typeof force === 'boolean' ? force : !this.isManageMode
      this.isManageMode = next
      if (!next) {
        this.clearSelection()
      }
    },

    addToSelection(sessionIds) {
      if (!sessionIds) return
      const arr = Array.isArray(sessionIds) ? sessionIds : [sessionIds]
      for (const id of arr) {
        const sid = toId(id)
        if (sid) this.selectedSessions.add(sid)
      }
      // Reassign Set to ensure reactivity in consumers relying on deep checks
      this.selectedSessions = new Set(this.selectedSessions)
      this.selectionStats.selected = this.selectedSessions.size
    },

    removeFromSelection(sessionIds) {
      if (!sessionIds) return
      const arr = Array.isArray(sessionIds) ? sessionIds : [sessionIds]
      for (const id of arr) {
        const sid = toId(id)
        this.selectedSessions.delete(sid)
      }
      this.selectedSessions = new Set(this.selectedSessions)
      this.selectionStats.selected = this.selectedSessions.size
    },

    clearSelection() {
      this.selectedSessions.clear()
      this.lastSelectedIndex = null
      this.selectionAnchor = null
      this.selectionStats.selected = 0
      this.selectionStats.eligible = 0
      this.selectionStats.ineligible = 0
    },

    setFilteredSessions(sessionsOrIds) {
      // Accept array of session objects or ids
      if (!Array.isArray(sessionsOrIds)) {
        this.filteredSessionIds = []
        this.selectionStats.total = 0
        this.selectionAnchor = null
        this.lastSelectedIndex = null
        return
      }
      if (sessionsOrIds.length === 0) {
        this.filteredSessionIds = []
        this.selectionStats.total = 0
        this.selectionAnchor = null
        this.lastSelectedIndex = null
        return
      }
      if (typeof sessionsOrIds[0] === 'string') {
        this.filteredSessionIds = sessionsOrIds
        this.selectionStats.total = sessionsOrIds.length
      } else {
        this.filteredSessionIds = sessionsOrIds.map((s) => toId(s.session_id))
        this.selectionStats.total = sessionsOrIds.length
      }
      // Reset anchors if out of bounds
      const maxIndex = this.filteredSessionIds.length - 1
      if (this.selectionAnchor != null && (this.selectionAnchor < 0 || this.selectionAnchor > maxIndex)) {
        this.selectionAnchor = null
      }
      if (this.lastSelectedIndex != null && (this.lastSelectedIndex < 0 || this.lastSelectedIndex > maxIndex)) {
        this.lastSelectedIndex = null
      }
    },

    updateSelectionStats(sessions = [], action = 'delete', rules) {
      // Compute eligible/ineligible among currently selected
      // `rules` is an optional object providing `canDeleteSession`, `canSelectSession`, etc.
      const selected = new Set(this.selectedSessions)
      let eligible = 0
      let ineligible = 0

      if (!Array.isArray(sessions) || sessions.length === 0 || selected.size === 0) {
        this.selectionStats.selected = selected.size
        this.selectionStats.eligible = eligible
        this.selectionStats.ineligible = ineligible
        return
      }

      const actionCheck = (session) => {
        if (!rules) return true
        if (action === 'delete' && typeof rules.canDeleteSession === 'function') {
          return rules.canDeleteSession(session)
        }
        if (action === 'close' && typeof rules.canSelectSession === 'function') {
          return rules.canSelectSession(session)
        }
        if (action === 'export' && typeof rules.canExportSession === 'function') {
          return rules.canExportSession(session)
        }
        return true
      }

      for (const s of sessions) {
        const id = toId(s.session_id)
        if (!selected.has(id)) continue
        if (actionCheck(s)) eligible++
        else ineligible++
      }

      this.selectionStats.selected = selected.size
      this.selectionStats.eligible = eligible
      this.selectionStats.ineligible = ineligible
    },

    // Range selection helpers
    setSelectionAnchor(index) {
      this.selectionAnchor = index
      this.lastSelectedIndex = index
    },

    setLastSelectedIndex(index) {
      this.lastSelectedIndex = index
    },

    selectRangeByIndex(startIndex, endIndex, idResolver) {
      if (startIndex == null || endIndex == null) return
      const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
      for (let i = from; i <= to; i++) {
        const id = typeof idResolver === 'function' ? idResolver(i) : this.filteredSessionIds[i]
        if (id) this.selectedSessions.add(toId(id))
      }
      this.selectionStats.selected = this.selectedSessions.size
      this.lastSelectedIndex = endIndex
    },
  },
})
