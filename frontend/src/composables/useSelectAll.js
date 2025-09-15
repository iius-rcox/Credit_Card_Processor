import { useSessionSelectionStore } from '@/stores/sessionSelection.js'
import { selectionRules } from '@/utils/selectionRules.js'
import { useApi } from '@/composables/useApi.js'

export function useSelectAll() {
  const store = useSessionSelectionStore()
  const api = useApi()

  const selectAllInPage = (sessions = []) => {
    const eligibleIds = sessions
      .filter((s) => selectionRules.canSelectSession(s))
      .map((s) => String(s.session_id))
    store.addToSelection(eligibleIds)
    return eligibleIds.length
  }

  const selectAllFiltered = async (filters = {}) => {
    // Attempt to fetch all sessions matching current filters
    // Backend supports `GET /sessions` returning either array or wrapper { sessions: [] }
    const params = new URLSearchParams()
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v != null && v !== '') params.append(k, v)
    })
    // Unbounded limit if backend supports; otherwise client will handle page by page selection
    params.append('limit', '-1')
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await api.request(`/sessions${qs}`)
    const all = Array.isArray(res) ? res : res.sessions || []
    return selectAllInPage(all)
  }

  const deselectAll = () => {
    store.clearSelection()
  }

  return {
    selectAllInPage,
    selectAllFiltered,
    deselectAll,
  }
}

