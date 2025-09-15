import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionSelectionStore } from '../sessionSelection'
import selectionRules from '../../utils/selectionRules'

describe('SessionSelectionStore', () => {
  let store

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    store = useSessionSelectionStore()
  })

  describe('State Management', () => {
    it('initializes with correct default state', () => {
      expect(store.isManageMode).toBe(false)
      expect(store.selectedSessions.size).toBe(0)
      expect(store.lastSelectedIndex).toBe(null)
      expect(store.selectionAnchor).toBe(null)
      expect(store.filteredSessionIds).toEqual([])
      expect(store.selectionStats).toEqual({
        total: 0,
        selected: 0,
        eligible: 0,
        ineligible: 0,
        pages: 1,
      })
    })

    it('toggles manage mode correctly', () => {
      expect(store.isManageMode).toBe(false)
      
      store.toggleManageMode()
      expect(store.isManageMode).toBe(true)
      
      store.toggleManageMode()
      expect(store.isManageMode).toBe(false)
    })

    it('clears selection when exiting manage mode', () => {
      store.addToSelection(['session1', 'session2'])
      expect(store.selectedSessions.size).toBe(2)
      
      store.toggleManageMode(true)
      expect(store.selectedSessions.size).toBe(2)
      
      store.toggleManageMode(false)
      expect(store.selectedSessions.size).toBe(0)
    })
  })

  describe('Selection Operations', () => {
    it('adds single session to selection', () => {
      store.addToSelection('session1')
      expect(store.selectedSessions.has('session1')).toBe(true)
      expect(store.selectedCount).toBe(1)
    })

    it('adds multiple sessions to selection', () => {
      store.addToSelection(['session1', 'session2', 'session3'])
      expect(store.selectedSessions.size).toBe(3)
      expect(store.selectedCount).toBe(3)
      expect(store.selectedIds).toEqual(['session1', 'session2', 'session3'])
    })

    it('removes sessions from selection', () => {
      store.addToSelection(['session1', 'session2', 'session3'])
      store.removeFromSelection(['session1', 'session3'])
      
      expect(store.selectedSessions.size).toBe(1)
      expect(store.selectedSessions.has('session2')).toBe(true)
    })

    it('handles duplicate additions gracefully', () => {
      store.addToSelection('session1')
      store.addToSelection('session1')
      store.addToSelection(['session1', 'session2'])
      
      expect(store.selectedSessions.size).toBe(2)
    })

    it('clears all selections', () => {
      store.addToSelection(['session1', 'session2', 'session3'])
      store.setLastSelectedIndex(2)
      store.setSelectionAnchor(0)
      
      store.clearSelection()
      
      expect(store.selectedSessions.size).toBe(0)
      expect(store.lastSelectedIndex).toBe(null)
      expect(store.selectionAnchor).toBe(null)
      expect(store.selectionStats.selected).toBe(0)
    })
  })

  describe('Range Selection', () => {
    beforeEach(() => {
      store.setFilteredSessions(['s1', 's2', 's3', 's4', 's5'])
    })

    it('selects range of sessions by index', () => {
      store.selectRangeByIndex(1, 3)
      
      expect(store.selectedSessions.size).toBe(3)
      expect(store.selectedSessions.has('s2')).toBe(true)
      expect(store.selectedSessions.has('s3')).toBe(true)
      expect(store.selectedSessions.has('s4')).toBe(true)
      expect(store.lastSelectedIndex).toBe(3)
    })

    it('handles reverse range selection', () => {
      store.selectRangeByIndex(3, 1)
      
      expect(store.selectedSessions.size).toBe(3)
      expect(store.selectedSessions.has('s2')).toBe(true)
      expect(store.selectedSessions.has('s3')).toBe(true)
      expect(store.selectedSessions.has('s4')).toBe(true)
      expect(store.lastSelectedIndex).toBe(1)
    })

    it('uses custom id resolver for range selection', () => {
      const customResolver = (index) => `custom-${index}`
      store.selectRangeByIndex(0, 2, customResolver)
      
      expect(store.selectedSessions.has('custom-0')).toBe(true)
      expect(store.selectedSessions.has('custom-1')).toBe(true)
      expect(store.selectedSessions.has('custom-2')).toBe(true)
    })
  })

  describe('Filtered Sessions', () => {
    it('sets filtered sessions from IDs', () => {
      const ids = ['s1', 's2', 's3']
      store.setFilteredSessions(ids)
      
      expect(store.filteredSessionIds).toEqual(ids)
      expect(store.selectionStats.total).toBe(3)
    })

    it('sets filtered sessions from objects', () => {
      const sessions = [
        { session_id: 's1' },
        { session_id: 's2' },
        { session_id: 's3' }
      ]
      store.setFilteredSessions(sessions)
      
      expect(store.filteredSessionIds).toEqual(['s1', 's2', 's3'])
      expect(store.selectionStats.total).toBe(3)
    })

    it('handles empty filtered sessions', () => {
      store.setFilteredSessions([])
      expect(store.filteredSessionIds).toEqual([])
      expect(store.selectionStats.total).toBe(0)
    })

    it('handles null/undefined filtered sessions', () => {
      store.setFilteredSessions(null)
      expect(store.filteredSessionIds).toEqual([])
      expect(store.selectionStats.total).toBe(0)
    })
  })

  describe('Selection Statistics', () => {
    const mockSessions = [
      { session_id: 's1', status: 'COMPLETED' },
      { session_id: 's2', status: 'PROCESSING' },
      { session_id: 's3', status: 'FAILED' },
      { session_id: 's4', status: 'COMPLETED' }
    ]

    const mockRules = {
      canDeleteSession: (session) => {
        return session.status === 'COMPLETED' || session.status === 'FAILED'
      },
      canSelectSession: (session) => {
        return session.status !== 'PROCESSING'
      },
      canExportSession: (session) => {
        return session.status === 'COMPLETED'
      }
    }

    it('calculates statistics for delete action', () => {
      store.addToSelection(['s1', 's2', 's3'])
      store.updateSelectionStats(mockSessions, 'delete', mockRules)
      
      expect(store.selectionStats.selected).toBe(3)
      expect(store.selectionStats.eligible).toBe(2) // s1 and s3
      expect(store.selectionStats.ineligible).toBe(1) // s2
    })

    it('calculates statistics for export action', () => {
      store.addToSelection(['s1', 's3', 's4'])
      store.updateSelectionStats(mockSessions, 'export', mockRules)
      
      expect(store.selectionStats.selected).toBe(3)
      expect(store.selectionStats.eligible).toBe(2) // s1 and s4
      expect(store.selectionStats.ineligible).toBe(1) // s3
    })

    it('handles empty sessions array', () => {
      store.addToSelection(['s1', 's2'])
      store.updateSelectionStats([], 'delete', mockRules)
      
      expect(store.selectionStats.selected).toBe(2)
      expect(store.selectionStats.eligible).toBe(0)
      expect(store.selectionStats.ineligible).toBe(0)
    })

    it('handles no rules provided', () => {
      store.addToSelection(['s1', 's2'])
      store.updateSelectionStats(mockSessions, 'delete')
      
      expect(store.selectionStats.selected).toBe(2)
      expect(store.selectionStats.eligible).toBe(2) // All eligible by default
      expect(store.selectionStats.ineligible).toBe(0)
    })
  })

  describe('Getters', () => {
    it('selectedCount returns correct count', () => {
      expect(store.selectedCount).toBe(0)
      
      store.addToSelection(['s1', 's2', 's3'])
      expect(store.selectedCount).toBe(3)
    })

    it('hasSelection returns correct boolean', () => {
      expect(store.hasSelection).toBe(false)
      
      store.addToSelection('s1')
      expect(store.hasSelection).toBe(true)
      
      store.clearSelection()
      expect(store.hasSelection).toBe(false)
    })

    it('canPerformBulkAction depends on eligible count', () => {
      expect(store.canPerformBulkAction).toBe(false)
      
      store.selectionStats.eligible = 1
      expect(store.canPerformBulkAction).toBe(true)
      
      store.selectionStats.eligible = 0
      expect(store.canPerformBulkAction).toBe(false)
    })

    it('selectedIds returns array of selected IDs', () => {
      expect(store.selectedIds).toEqual([])
      
      store.addToSelection(['s1', 's2', 's3'])
      expect(store.selectedIds).toEqual(['s1', 's2', 's3'])
    })
  })

  describe('Edge Cases', () => {
    it('handles numeric IDs correctly', () => {
      store.addToSelection([1, 2, 3])
      expect(store.selectedSessions.has('1')).toBe(true)
      expect(store.selectedSessions.has('2')).toBe(true)
      expect(store.selectedSessions.has('3')).toBe(true)
    })

    it('ignores null/undefined in selection', () => {
      store.addToSelection([null, undefined, 's1', ''])
      expect(store.selectedSessions.size).toBe(1)
      expect(store.selectedSessions.has('s1')).toBe(true)
    })

    it('maintains selection anchor and last index', () => {
      store.setSelectionAnchor(5)
      expect(store.selectionAnchor).toBe(5)
      expect(store.lastSelectedIndex).toBe(5)
      
      store.setLastSelectedIndex(10)
      expect(store.lastSelectedIndex).toBe(10)
      expect(store.selectionAnchor).toBe(5)
    })
  })
})