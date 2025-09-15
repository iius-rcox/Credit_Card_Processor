import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionSelectionStore } from '../sessionSelection.js'

describe('sessionSelection store', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useSessionSelectionStore()
  })

  it('toggles manage mode and clears selection on exit', () => {
    store.toggleManageMode(true)
    store.addToSelection(['a', 'b'])
    expect(store.isManageMode).toBe(true)
    expect(store.selectedCount).toBe(2)

    store.toggleManageMode(false)
    expect(store.isManageMode).toBe(false)
    expect(store.selectedCount).toBe(0)
  })

  it('adds and removes ids (reactive Set replacement)', () => {
    store.addToSelection('x')
    expect(store.selectedIds).toContain('x')
    store.addToSelection(['y', 'z'])
    expect(store.selectedCount).toBe(3)
    store.removeFromSelection(['x', 'z'])
    expect(store.selectedIds).toEqual(['y'])
  })

  it('sets filtered sessions and resets anchors out of bounds', () => {
    store.setFilteredSessions([{ session_id: '1' }, { session_id: '2' }])
    expect(store.filteredSessionIds).toEqual(['1', '2'])
    store.setSelectionAnchor(10)
    store.setLastSelectedIndex(15)
    // Now shrink the list; anchors should reset
    store.setFilteredSessions([])
    expect(store.selectionAnchor).toBeNull()
    expect(store.lastSelectedIndex).toBeNull()
  })

  it('selects a range by index', () => {
    const sessions = Array.from({ length: 5 }, (_, i) => ({ session_id: String(i + 1) }))
    store.setFilteredSessions(sessions)
    store.selectRangeByIndex(1, 3, (i) => sessions[i].session_id)
    expect(store.selectedIds.sort()).toEqual(['2', '3', '4'])
  })
})

