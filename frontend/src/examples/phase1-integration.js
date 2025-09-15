/**
 * Phase 1 Integration Example
 * Demonstrates how the session selection store, event bus, and rules work together
 */

import { useSessionSelectionStore } from '../stores/sessionSelection'
import selectionEventBus, { SelectionEvents, SelectionEventHelpers } from '../utils/selectionEventBus'
import selectionRules, { SelectionUtils } from '../utils/selectionRules'
import { SelectionConstants } from '../types/selection'

/**
 * Example: Complete selection workflow
 */
export function demonstrateSelectionWorkflow() {
  const store = useSessionSelectionStore()
  
  // Sample sessions data
  const mockSessions = [
    { session_id: 's1', session_name: 'Session 1', status: 'COMPLETED', has_results: true },
    { session_id: 's2', session_name: 'Session 2', status: 'PROCESSING', has_results: false },
    { session_id: 's3', session_name: 'Session 3', status: 'FAILED', has_results: false },
    { session_id: 's4', session_name: 'Session 4', status: 'COMPLETED', has_results: true },
    { session_id: 's5', session_name: 'Session 5', status: 'EXTRACTING', has_results: false },
    { session_id: 's6', session_name: 'Session 6', status: 'CLOSED', has_results: true },
  ]
  
  console.log('=== Phase 1 Integration Demo ===\n')
  
  // 1. Set up event listeners
  console.log('1. Setting up event listeners...')
  
  const unsubscribeSelection = SelectionEventHelpers.onSelectionChanged((data) => {
    console.log(`   Selection changed: ${data.selectedCount} items selected`)
  })
  
  const { unsubscribeEnter, unsubscribeExit } = SelectionEventHelpers.onModeChange(
    () => console.log('   Entered manage mode'),
    () => console.log('   Exited manage mode')
  )
  
  // 2. Enter manage mode
  console.log('\n2. Entering manage mode...')
  store.toggleManageMode(true)
  selectionEventBus.emit(SelectionEvents.MANAGE_MODE_ENTERED)
  
  // 3. Set filtered sessions
  console.log('\n3. Setting filtered sessions...')
  store.setFilteredSessions(mockSessions)
  console.log(`   Total sessions: ${store.selectionStats.total}`)
  
  // 4. Validate which sessions can be selected
  console.log('\n4. Validating sessions for selection...')
  mockSessions.forEach(session => {
    const canSelect = selectionRules.canSelectSession(session)
    const reason = selectionRules.getSelectionBlockedReason(session)
    console.log(`   ${session.session_name}: ${canSelect ? '✓ Selectable' : `✗ ${reason}`}`)
  })
  
  // 5. Select eligible sessions
  console.log('\n5. Selecting eligible sessions...')
  const eligibleSessions = mockSessions.filter(s => selectionRules.canSelectSession(s))
  const eligibleIds = eligibleSessions.map(s => s.session_id)
  store.addToSelection(eligibleIds)
  
  SelectionEventHelpers.emitSelectionChanged(store.selectedSessions, store.selectionStats)
  console.log(`   Selected ${store.selectedCount} sessions`)
  
  // 6. Validate bulk delete action
  console.log('\n6. Validating bulk delete action...')
  const deleteValidation = selectionRules.validateBulkAction(eligibleSessions, 'delete')
  console.log(`   Eligible for deletion: ${deleteValidation.totalEligible}`)
  console.log(`   Ineligible for deletion: ${deleteValidation.totalIneligible}`)
  
  if (deleteValidation.ineligible.length > 0) {
    deleteValidation.ineligible.forEach(item => {
      console.log(`     - ${item.sessionName}: ${item.reason}`)
    })
  }
  
  // 7. Update selection statistics
  console.log('\n7. Updating selection statistics...')
  store.updateSelectionStats(mockSessions, 'delete', selectionRules)
  console.log(`   Selected: ${store.selectionStats.selected}`)
  console.log(`   Eligible: ${store.selectionStats.eligible}`)
  console.log(`   Ineligible: ${store.selectionStats.ineligible}`)
  
  // 8. Create summary message
  console.log('\n8. Creating selection summary...')
  const summary = SelectionUtils.createSelectionSummary(store.selectionStats, 'delete')
  console.log(`   ${summary}`)
  
  // 9. Test range selection
  console.log('\n9. Testing range selection...')
  store.clearSelection()
  store.selectRangeByIndex(0, 3)
  console.log(`   Range selected: ${store.selectedCount} sessions`)
  console.log(`   Selected IDs: ${store.selectedIds.join(', ')}`)
  
  // 10. Test selection limit warning
  console.log('\n10. Testing selection limits...')
  const testCount = 850
  const warning = selectionRules.getSelectionLimitWarning(testCount)
  console.log(`   With ${testCount} selections: ${warning || 'No warning'}`)
  
  // 11. Simulate bulk delete operation
  console.log('\n11. Simulating bulk delete...')
  selectionEventBus.emit(SelectionEvents.BULK_ACTION_INITIATED, {
    action: 'delete',
    sessionIds: store.selectedIds
  })
  
  // Simulate successful completion
  setTimeout(() => {
    SelectionEventHelpers.emitBulkActionResult('delete', true, {
      processed: store.selectedIds,
      failed: []
    })
    console.log('   Bulk delete completed successfully')
  }, 100)
  
  // 12. Exit manage mode
  setTimeout(() => {
    console.log('\n12. Exiting manage mode...')
    store.toggleManageMode(false)
    selectionEventBus.emit(SelectionEvents.MANAGE_MODE_EXITED)
    
    // Clean up
    console.log('\n13. Cleaning up...')
    unsubscribeSelection()
    unsubscribeEnter()
    unsubscribeExit()
    selectionEventBus.clear()
    
    console.log('\n=== Demo Complete ===')
  }, 200)
}

/**
 * Example: Using the event bus for component communication
 */
export function demonstrateEventBusUsage() {
  console.log('=== Event Bus Demo ===\n')
  
  // Component A: Session list
  const componentA = {
    name: 'SessionList',
    handleSelectionChange() {
      console.log(`[${this.name}] User selected sessions`)
      selectionEventBus.emit(SelectionEvents.SELECTION_CHANGED, {
        selectedCount: 3,
        selectedIds: ['s1', 's2', 's3']
      })
    }
  }
  
  // Component B: Toolbar
  const componentB = {
    name: 'BulkActionToolbar',
    init() {
      selectionEventBus.on(SelectionEvents.SELECTION_CHANGED, (data) => {
        console.log(`[${this.name}] Received selection change: ${data.selectedCount} items`)
        this.updateButtons(data.selectedCount)
      })
    },
    updateButtons(count) {
      console.log(`[${this.name}] ${count > 0 ? 'Enabling' : 'Disabling'} bulk action buttons`)
    }
  }
  
  // Component C: Status display
  const componentC = {
    name: 'StatusDisplay',
    init() {
      selectionEventBus.on(SelectionEvents.BULK_ACTION_COMPLETED, (data) => {
        console.log(`[${this.name}] Showing success message: ${data.result.processed.length} items processed`)
      })
      
      selectionEventBus.on(SelectionEvents.BULK_ACTION_FAILED, (data) => {
        console.log(`[${this.name}] Showing error message: ${data.result.error}`)
      })
    }
  }
  
  // Initialize components
  componentB.init()
  componentC.init()
  
  // Simulate user interaction
  console.log('1. User selects sessions...')
  componentA.handleSelectionChange()
  
  console.log('\n2. User triggers bulk delete...')
  selectionEventBus.emit(SelectionEvents.BULK_ACTION_INITIATED, {
    action: 'delete',
    sessionIds: ['s1', 's2', 's3']
  })
  
  console.log('\n3. Backend processes request...')
  setTimeout(() => {
    selectionEventBus.emit(SelectionEvents.BULK_ACTION_COMPLETED, {
      action: 'delete',
      success: true,
      result: {
        processed: ['s1', 's2', 's3'],
        failed: []
      }
    })
  }, 100)
  
  setTimeout(() => {
    console.log('\n=== Event Bus Demo Complete ===')
    selectionEventBus.clear()
  }, 200)
}

// Export for use in components
export default {
  demonstrateSelectionWorkflow,
  demonstrateEventBusUsage
}