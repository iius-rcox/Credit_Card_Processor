// Thin wrapper to align with multidelete.md naming.
// Re-exports selection handlers under the documented API.

import { useSelectionHandlers } from './useSelectionHandlers.js'

export function useSessionSelection(options = {}) {
  return useSelectionHandlers(options)
}

export default useSessionSelection

