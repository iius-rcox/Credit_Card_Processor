// Selection rules for sessions

export const selectionRules = {
  canSelectSession(session) {
    const blocked = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING']
    const status = (session?.status || '').toString().toUpperCase()
    return !blocked.includes(status)
  },

  canDeleteSession(session) {
    // Cannot delete active or archived sessions
    const status = (session?.status || '').toString().toUpperCase()
    if (!this.canSelectSession(session)) return false
    if (status === 'ARCHIVED') return false
    return true
  },

  canExportSession(session) {
    return session?.has_results === true || Array.isArray(session?.employees)
  },

  getIneligibleReason(session, action) {
    if (!this.canSelectSession(session)) return 'Session is currently active'
    if (action === 'delete' && (session?.status || '').toUpperCase() === 'ARCHIVED') return 'Session is already archived'
    if (action === 'export' && !this.canExportSession(session)) return 'Session has no results to export'
    return null
  },
}

