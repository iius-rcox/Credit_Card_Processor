<template>
  <transition name="slide-down">
    <div v-if="show" class="bulk-action-toolbar">
      <div class="toolbar-section selection-info">
        <div class="selection-count">
          <span class="count-number">{{ selectedCount }}</span>
          <span class="count-label">selected</span>
        </div>
        <div v-if="totalCount" class="total-count">
          of {{ totalCount }}
        </div>
        <div v-if="selectionStats.ineligible > 0" class="ineligible-warning">
          <i class="warning-icon">⚠️</i>
          {{ selectionStats.ineligible }} ineligible
        </div>
      </div>
      
      <div class="toolbar-section actions">
        <button 
          class="btn-action delete"
          :disabled="selectedCount === 0 || selectionStats.eligible === 0"
          @click="$emit('delete-selected')"
          :title="selectionStats.eligible > 0 ? `Delete ${selectionStats.eligible} sessions` : 'No eligible sessions to delete'"
        >
          <i class="action-icon">🗑️</i>
          <span class="action-text">Delete ({{ selectionStats.eligible || 0 }})</span>
        </button>
        
        <button 
          class="btn-action export"
          :disabled="selectedCount === 0"
          @click="$emit('export-selected')"
          :title="`Export ${selectedCount} sessions`"
        >
          <i class="action-icon">📥</i>
          <span class="action-text">Export List</span>
        </button>
        
        <button 
          class="btn-action close"
          :disabled="selectedCount === 0 || selectionStats.eligible === 0"
          @click="$emit('close-selected')"
          :title="selectionStats.eligible > 0 ? `Close ${selectionStats.eligible} sessions` : 'No eligible sessions to close'"
        >
          <i class="action-icon">🔒</i>
          <span class="action-text">Close ({{ selectionStats.eligible || 0 }})</span>
        </button>
        
        <button 
          class="btn-action deselect"
          @click="$emit('deselect-all')"
          :title="'Clear all selections'"
        >
          <i class="action-icon">✕</i>
          <span class="action-text">Clear Selection</span>
        </button>
      </div>
      
      <div class="toolbar-section selection-helpers">
        <button 
          class="select-helper-btn"
          @click="$emit('select-all-page')"
          :title="'Select all sessions on current page'"
        >
          Select Page
        </button>
        <button 
          class="select-helper-btn"
          @click="$emit('select-all-results')"
          :title="'Select all sessions in current results'"
        >
          Select All Results
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'BulkActionToolbar',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    selectedCount: {
      type: Number,
      default: 0
    },
    totalCount: {
      type: Number,
      default: 0
    },
    selectionStats: {
      type: Object,
      default: () => ({
        total: 0,
        selected: 0,
        eligible: 0,
        ineligible: 0,
        pages: 1
      })
    }
  },
  emits: [
    'delete-selected',
    'export-selected',
    'close-selected',
    'deselect-all',
    'select-all-page',
    'select-all-results'
  ]
}
</script>

<style scoped>
.bulk-action-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #dee2e6;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selection-info {
  flex: 1;
  min-width: 0;
}

.selection-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-weight: 600;
}

.count-number {
  font-size: 20px;
  color: #007bff;
  line-height: 1;
}

.count-label {
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-count {
  font-size: 14px;
  color: #666;
  margin-left: 8px;
}

.ineligible-warning {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #dc3545;
  background: #fff5f5;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.warning-icon {
  font-size: 14px;
}

.actions {
  flex: 2;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-action:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-action.delete {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn-action.delete:not(:disabled):hover {
  background: #c82333;
  border-color: #bd2130;
}

.btn-action.export {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.btn-action.export:not(:disabled):hover {
  background: #218838;
  border-color: #1e7e34;
}

.btn-action.close {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-action.close:not(:disabled):hover {
  background: #5a6268;
  border-color: #545b62;
}

.btn-action.deselect {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-action.deselect:not(:disabled):hover {
  background: #5a6268;
  border-color: #545b62;
}

.action-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.action-text {
  white-space: nowrap;
}

.selection-helpers {
  flex: 1;
  justify-content: flex-end;
  gap: 8px;
}

.select-helper-btn {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  background: white;
  color: #666;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-helper-btn:hover {
  background: #f8f9fa;
  border-color: #007bff;
  color: #007bff;
}

/* Slide down animation */
.slide-down-enter-active {
  transition: all 0.3s ease-out;
}

.slide-down-leave-active {
  transition: all 0.2s ease-in;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive design */
@media (max-width: 1200px) {
  .bulk-action-toolbar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .toolbar-section {
    justify-content: center;
  }
  
  .actions {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .bulk-action-toolbar {
    padding: 12px 16px;
    margin-bottom: 16px;
  }
  
  .btn-action {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .action-text {
    display: none;
  }
  
  .btn-action {
    min-width: 40px;
    justify-content: center;
  }
  
  .selection-helpers {
    flex-direction: column;
    gap: 4px;
  }
  
  .select-helper-btn {
    font-size: 11px;
    padding: 4px 8px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .bulk-action-toolbar {
    background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
    border-color: #444;
  }
  
  .count-label,
  .total-count {
    color: #aaa;
  }
  
  .ineligible-warning {
    background: #3d1a1a;
    border-color: #5c1a1a;
    color: #ff6b6b;
  }
  
  .select-helper-btn {
    background: #3d3d3d;
    border-color: #555;
    color: #ccc;
  }
  
  .select-helper-btn:hover {
    background: #4d4d4d;
    border-color: #007bff;
    color: #007bff;
  }
}

/* Focus styles for accessibility */
.btn-action:focus,
.select-helper-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.btn-action:disabled:focus {
  box-shadow: none;
}
</style>







