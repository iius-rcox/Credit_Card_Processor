# Team Implementation Plan: Manage Mode with Range Selection

## 🎯 Phase 1: Core State Management & Architecture
**Developer: Backend/State Specialist** | **Duration: 3 days** | **Dependencies: None**

### Deliverables:
1. **Pinia Store Setup** (`stores/sessionSelection.js`)
```javascript
// Core state structure
export const useSessionSelectionStore = defineStore('sessionSelection', {
  state: () => ({
    isManageMode: false,Im'
    selectedSessions: new Set(),
    lastSelectedIndex: null,
    selectionAnchor: null,
    filteredSessionIds: [],
    selectionStats: {
      total: 0,
      selected: 0,
      eligible: 0,
      ineligible: 0,
      pages: 1
    },
    bulkOperation: {
      type: null,
      inProgress: false,
      results: null
    }
  }),
  
  getters: {
    selectedCount: (state) => state.selectedSessions.size,
    hasSelection: (state) => state.selectedSessions.size > 0,
    canPerformBulkAction: (state) => state.selectionStats.eligible > 0
  },
  
  actions: {
    // Define all action signatures (implementation in Phase 3)
    toggleManageMode() {},
    addToSelection(sessionIds) {},
    removeFromSelection(sessionIds) {},
    clearSelection() {},
    updateSelectionStats(sessions) {},
    setFilteredSessions(sessions) {}
  }
})
```

2. **Type Definitions** (`types/selection.d.ts`)
```typescript
interface SelectionState {
  isManageMode: boolean
  selectedSessions: Set<string>
  lastSelectedIndex: number | null
  selectionAnchor: number | null
}

interface BulkActionRequest {
  action: 'delete' | 'export' | 'close'
  sessionIds: string[]
  options?: Record<string, any>
}

interface SelectionStats {
  total: number
  selected: number
  eligible: number
  ineligible: number
  pages: number
}
```

3. **Event Bus Setup** (`utils/eventBus.js`)
```javascript
// For cross-component communication
export const selectionEventBus = {
  events: new Map(),
  emit(event, data) {},
  on(event, handler) {},
  off(event, handler) {}
}
```

### Testing Checklist:
- [ ] Store initialization
- [ ] State mutations
- [ ] Getter computations
- [ ] TypeScript types compile

---

## 🎨 Phase 2: UI Components & Visual Design
**Developer: Frontend/UI Specialist** | **Duration: 4 days** | **Dependencies: None**

### Deliverables:

1. **ManageModeToggle Component** (`components/ManageModeToggle.vue`)
```vue
<template>
  <div class="manage-mode-toggle">
    <button 
      class="toggle-button"
      :class="{ 'active': modelValue }"
      :aria-pressed="modelValue"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <transition name="icon-swap">
        <CheckSquareIcon v-if="modelValue" key="manage" />
        <ListIcon v-else key="view" />
      </transition>
      <span>{{ modelValue ? 'Exit Manage' : 'Manage' }}</span>
    </button>
  </div>
</template>
```

2. **BulkActionToolbar Component** (`components/BulkActionToolbar.vue`)
```vue
<template>
  <transition name="slide-down">
    <div v-if="show" class="bulk-action-toolbar">
      <div class="toolbar-section selection-info">
        <span class="selection-count">
          {{ selectedCount }} selected
        </span>
        <span v-if="totalCount" class="total-count">
          of {{ totalCount }}
        </span>
      </div>
      
      <div class="toolbar-section actions">
        <button class="btn-action delete">
          <TrashIcon /> Delete ({{ selectedCount }})
        </button>
        <button class="btn-action export">
          <DownloadIcon /> Export List
        </button>
        <button class="btn-action deselect">
          <XIcon /> Clear Selection
        </button>
      </div>
      
      <div class="toolbar-section selection-helpers">
        <button class="select-all-page">
          Select Page
        </button>
        <button class="select-all-filtered">
          Select All Results
        </button>
      </div>
    </div>
  </transition>
</template>
```

3. **BulkConfirmationDrawer Component** (`components/BulkConfirmationDrawer.vue`)
```vue
<!-- Right-side drawer with backdrop -->
<template>
  <teleport to="body">
    <transition name="drawer">
      <div v-if="modelValue" class="drawer-container">
        <div class="drawer-backdrop" @click="close" />
        <div class="drawer-panel">
          <!-- Header -->
          <div class="drawer-header">
            <h3>{{ title }}</h3>
            <button @click="close" class="close-btn">
              <XIcon />
            </button>
          </div>
          
          <!-- Content -->
          <div class="drawer-body">
            <slot name="summary" />
            <slot name="list" />
            <slot name="warnings" />
            
            <!-- Confirmation -->
            <div class="confirmation-section">
              <label class="checkbox-confirm">
                <input type="checkbox" v-model="confirmed" />
                <span>I understand this action cannot be undone</span>
              </label>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="drawer-footer">
            <button @click="close" class="btn-secondary">
              Cancel
            </button>
            <button 
              @click="confirm" 
              :disabled="!confirmed"
              class="btn-primary"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>
```

4. **CSS Framework** (`styles/manage-mode.css`)
```css
/* Component styling with animations */
.manage-mode-toggle { /* styles */ }
.bulk-action-toolbar { /* sticky positioning */ }
.drawer-container { /* drawer animations */ }
.selection-checkbox { /* checkbox overlays */ }

/* Transitions */
.slide-down-enter-active { /* toolbar animation */ }
.drawer-enter-active { /* drawer slide-in */ }
.icon-swap-enter-active { /* icon transitions */ }
```

### Testing Checklist:
- [ ] Component renders correctly
- [ ] Props and events work
- [ ] Animations smooth
- [ ] Responsive design
- [ ] Dark mode support

---

## 🖱️ Phase 3: Selection Logic & Interactions
**Developer: Frontend Logic Specialist** | **Duration: 4 days** | **Dependencies: Phase 1**

### Deliverables:

1. **Selection Composable** (`composables/useSessionSelection.js`)
```javascript
export function useSessionSelection() {
  const store = useSessionSelectionStore()
  
  // Single selection
  const toggleSelection = (sessionId, index) => {
    if (store.selectedSessions.has(sessionId)) {
      store.removeFromSelection([sessionId])
    } else {
      store.addToSelection([sessionId])
    }
    store.lastSelectedIndex = index
  }
  
  // Range selection with Shift
  const selectRange = (fromIndex, toIndex, sessions) => {
    const [start, end] = [
      Math.min(fromIndex, toIndex),
      Math.max(fromIndex, toIndex)
    ]
    
    const sessionIds = sessions
      .slice(start, end + 1)
      .filter(s => store.canSelectSession(s))
      .map(s => s.session_id)
    
    store.addToSelection(sessionIds)
  }
  
  // Click handler
  const handleSessionClick = (event, session, index, sessions) => {
    if (!store.isManageMode) return false
    
    if (event.shiftKey && store.lastSelectedIndex !== null) {
      selectRange(store.lastSelectedIndex, index, sessions)
    } else if (event.ctrlKey || event.metaKey) {
      toggleSelection(session.session_id, index)
    } else {
      store.clearSelection()
      toggleSelection(session.session_id, index)
    }
    
    return true // Handled
  }
  
  return {
    handleSessionClick,
    toggleSelection,
    selectRange,
    ...toRefs(store)
  }
}
```

2. **Selection Rules Engine** (`utils/selectionRules.js`)
```javascript
// Define what can be selected
export const selectionRules = {
  canSelectSession(session) {
    const blockedStatuses = [
      'PROCESSING',
      'EXTRACTING', 
      'ANALYZING',
      'UPLOADING'
    ]
    return !blockedStatuses.includes(session.status?.toUpperCase())
  },
  
  canDeleteSession(session) {
    return this.canSelectSession(session) && 
           session.status !== 'ARCHIVED'
  },
  
  canExportSession(session) {
    return session.has_results === true
  },
  
  getIneligibleReason(session, action) {
    if (!this.canSelectSession(session)) {
      return 'Session is currently active'
    }
    if (action === 'delete' && session.status === 'ARCHIVED') {
      return 'Session is already archived'
    }
    if (action === 'export' && !session.has_results) {
      return 'Session has no results to export'
    }
    return null
  }
}
```

3. **Select All Logic** (`composables/useSelectAll.js`)
```javascript
export function useSelectAll() {
  const store = useSessionSelectionStore()
  
  const selectAllInPage = (sessions) => {
    const eligibleIds = sessions
      .filter(s => selectionRules.canSelectSession(s))
      .map(s => s.session_id)
    
    store.addToSelection(eligibleIds)
    return eligibleIds.length
  }
  
  const selectAllFiltered = async (filters) => {
    // Fetch all matching sessions from API
    const allSessions = await api.getSessions({
      ...filters,
      limit: -1 // No pagination
    })
    
    return selectAllInPage(allSessions)
  }
  
  const deselectAll = () => {
    store.clearSelection()
  }
  
  return {
    selectAllInPage,
    selectAllFiltered,
    deselectAll
  }
}
```

### Testing Checklist:
- [ ] Single click selection
- [ ] Shift+click range selection
- [ ] Ctrl/Cmd+click multi-selection
- [ ] Select all variations
- [ ] Selection rules enforcement
- [ ] Performance with 1000+ items

---

## 🔌 Phase 4: Backend API & Data Layer
**Developer: Backend Specialist** | **Duration: 3 days** | **Dependencies: None**

### Deliverables:

1. **Bulk Operations API** (`backend/app/api/bulk_operations.py`)
```python
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/bulk", tags=["bulk"])

@router.post("/sessions/validate")
async def validate_bulk_action(
    request: BulkActionRequest,
    db: Session = Depends(get_db)
):
    """Pre-validate bulk action feasibility"""
    results = {
        "eligible": [],
        "ineligible": [],
        "not_found": []
    }
    
    for session_id in request.session_ids:
        session = get_session(db, session_id)
        if not session:
            results["not_found"].append(session_id)
        elif can_perform_action(session, request.action):
            results["eligible"].append(session_id)
        else:
            results["ineligible"].append({
                "id": session_id,
                "reason": get_ineligible_reason(session, request.action)
            })
    
    return results

@router.post("/sessions/delete")
async def bulk_delete_sessions(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db)
):
    """Delete multiple sessions atomically"""
    deleted = []
    failed = []
    
    with db.begin():
        for session_id in request.session_ids:
            try:
                session = get_session(db, session_id)
                if can_delete_session(session):
                    db.delete(session)
                    deleted.append(session_id)
                else:
                    failed.append({
                        "id": session_id,
                        "reason": "Cannot delete active session"
                    })
            except Exception as e:
                failed.append({
                    "id": session_id,
                    "reason": str(e)
                })
    
    return {
        "deleted": deleted,
        "failed": failed,
        "count": len(deleted)
    }

@router.post("/sessions/export-metadata")
async def export_session_list(
    request: BulkExportRequest,
    db: Session = Depends(get_db)
):
    """Export metadata for selected sessions"""
    sessions = db.query(ProcessingSession).filter(
        ProcessingSession.session_id.in_(request.session_ids)
    ).all()
    
    csv_data = generate_session_csv(sessions)
    file_path = save_temp_file(csv_data)
    
    return {
        "download_url": f"/api/download/{file_path}",
        "count": len(sessions),
        "expires_at": datetime.now() + timedelta(hours=1)
    }
```

2. **Database Helpers** (`backend/app/services/bulk_service.py`)
```python
class BulkOperationService:
    def __init__(self, db: Session):
        self.db = db
    
    def validate_sessions(self, session_ids: List[str]) -> Dict:
        """Validate sessions exist and are eligible"""
        pass
    
    def perform_bulk_delete(self, session_ids: List[str]) -> Dict:
        """Soft delete with audit trail"""
        pass
    
    def generate_export(self, session_ids: List[str], format: str) -> str:
        """Generate CSV/JSON export"""
        pass
    
    def get_selection_stats(self, session_ids: List[str]) -> Dict:
        """Get statistics about selected sessions"""
        pass
```

3. **WebSocket Updates** (`backend/app/websocket_bulk.py`)
```python
async def notify_bulk_operation(operation_type: str, result: Dict):
    """Notify all clients of bulk operation results"""
    await manager.broadcast({
        "type": "bulk_operation",
        "operation": operation_type,
        "result": result,
        "timestamp": datetime.now().isoformat()
    })
```

### Testing Checklist:
- [ ] Bulk delete endpoint
- [ ] Export endpoint
- [ ] Validation endpoint
- [ ] Transaction rollback on failure
- [ ] WebSocket notifications
- [ ] Rate limiting

---

## ♿ Phase 5: Accessibility & Keyboard Navigation
**Developer: Accessibility Specialist** | **Duration: 2 days** | **Dependencies: Phases 2-3**

### Deliverables:

1. **Keyboard Navigation Handler** (`composables/useKeyboardNavigation.js`)
```javascript
export function useKeyboardNavigation() {
  const store = useSessionSelectionStore()
  
  const shortcuts = {
    'Alt+M': () => store.toggleManageMode(),
    'Escape': () => {
      if (store.isManageMode) {
        store.toggleManageMode()
      }
    },
    'Ctrl+A': (e) => {
      if (store.isManageMode) {
        e.preventDefault()
        selectAll()
      }
    },
    'Delete': () => {
      if (store.hasSelection) {
        showDeleteConfirmation()
      }
    },
    'Ctrl+Shift+A': () => store.clearSelection(),
    'Space': (e) => {
      if (store.isManageMode && e.target.dataset.sessionId) {
        e.preventDefault()
        toggleSessionSelection(e.target.dataset.sessionId)
      }
    }
  }
  
  const handleKeydown = (event) => {
    const key = getKeyCombo(event)
    if (shortcuts[key]) {
      shortcuts[key](event)
    }
  }
  
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
  
  return { shortcuts }
}
```

2. **ARIA Attributes Manager** (`utils/aria.js`)
```javascript
export const ariaHelpers = {
  announceSelection(count) {
    const message = `${count} items selected`
    this.announce(message)
  },
  
  announce(message) {
    const announcer = document.getElementById('aria-live-region')
    if (announcer) {
      announcer.textContent = message
      setTimeout(() => {
        announcer.textContent = ''
      }, 1000)
    }
  },
  
  setSelectionAttributes(element, isSelected, position, setSize) {
    element.setAttribute('aria-selected', isSelected)
    element.setAttribute('aria-posinset', position)
    element.setAttribute('aria-setsize', setSize)
  }
}
```

3. **Focus Management** (`composables/useFocusManagement.js`)
```javascript
export function useFocusManagement() {
  const focusableElements = ref([])
  const currentFocusIndex = ref(0)
  
  const moveFocus = (direction) => {
    const elements = focusableElements.value
    if (elements.length === 0) return
    
    if (direction === 'next') {
      currentFocusIndex.value = (currentFocusIndex.value + 1) % elements.length
    } else {
      currentFocusIndex.value = (currentFocusIndex.value - 1 + elements.length) % elements.length
    }
    
    elements[currentFocusIndex.value]?.focus()
  }
  
  return {
    moveFocus,
    setFocusableElements: (elements) => {
      focusableElements.value = elements
    }
  }
}
```

### Testing Checklist:
- [ ] All keyboard shortcuts work
- [ ] Screen reader announcements
- [ ] Focus trap in drawer
- [ ] ARIA attributes correct
- [ ] Tab navigation logical
- [ ] No keyboard traps

---

## 🧪 Phase 6: Testing & Quality Assurance
**Developer: QA Engineer** | **Duration: 3 days** | **Dependencies: Phases 1-5**

### Deliverables:

1. **Unit Tests** (`tests/unit/`)
```javascript
// selection.store.test.js
describe('SessionSelectionStore', () => {
  it('adds sessions to selection')
  it('removes sessions from selection')
  it('calculates stats correctly')
  it('enforces selection rules')
})

// selectionRules.test.js
describe('Selection Rules', () => {
  it('blocks active sessions')
  it('allows completed sessions')
  it('provides correct reasons')
})
```

2. **Integration Tests** (`tests/integration/`)
```javascript
// bulk-operations.test.js
describe('Bulk Operations', () => {
  it('deletes multiple sessions atomically')
  it('rolls back on partial failure')
  it('exports session metadata')
  it('validates before execution')
})
```

3. **E2E Tests** (`tests/e2e/`)
```javascript
// manage-mode.spec.js
test('Complete manage mode workflow', async ({ page }) => {
  // Enter manage mode
  await page.click('[data-test="manage-toggle"]')
  
  // Select multiple items
  await page.click('[data-test="session-1"]')
  await page.keyboard.down('Shift')
  await page.click('[data-test="session-5"]')
  
  // Verify selection
  await expect(page.locator('.selection-count')).toHaveText('5 selected')
  
  // Delete selected
  await page.click('[data-test="bulk-delete"]')
  await page.check('[data-test="confirm-checkbox"]')
  await page.click('[data-test="confirm-delete"]')
  
  // Verify deletion
  await expect(page.locator('[data-test="session-1"]')).not.toBeVisible()
})
```

### Testing Checklist:
- [ ] 90% code coverage
- [ ] Performance benchmarks
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Accessibility audit
- [ ] Load testing (1000+ items)

---

## 🔧 Phase 7: Integration & Polish
**Developer: Lead/Integration Specialist** | **Duration: 2 days** | **Dependencies: All phases**

### Deliverables:

1. **Feature Flags** (`config/features.js`)
```javascript
export const features = {
  MANAGE_MODE: process.env.VUE_APP_FEATURE_MANAGE_MODE === 'true',
  BULK_DELETE: process.env.VUE_APP_FEATURE_BULK_DELETE === 'true',
  RANGE_SELECTION: process.env.VUE_APP_FEATURE_RANGE_SELECTION === 'true'
}
```

2. **Performance Optimization**
```javascript
// Virtual scrolling for large lists
// Debounced selection updates
// Memoized selection calculations
// Lazy-loaded drawer component
```

3. **Error Boundaries & Recovery**
```javascript
// Graceful degradation
// Retry mechanisms
// User-friendly error messages
// Automatic recovery from failed bulk operations
```

4. **Documentation**
- User guide with screenshots
- Developer documentation
- API documentation
- Keyboard shortcuts cheatsheet

### Final Checklist:
- [ ] All phases integrated
- [ ] Feature flags working
- [ ] Performance optimized
- [ ] Error handling complete
- [ ] Documentation written
- [ ] Ready for production

---

## 📊 Parallel Development Timeline

```
Week 1: Phase 1 + Phase 2 + Phase 4 (3 devs parallel)
Week 2: Phase 3 + Phase 5 (2 devs parallel) + Phase 6 starts
Week 3: Phase 6 continues + Phase 7 integration
```

This phased approach allows your team to work in parallel with minimal dependencies. Each phase has clear deliverables, testing requirements, and can be developed independently before integration in Phase 7.