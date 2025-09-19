<template>
  <teleport to="body">
    <transition name="drawer">
      <div v-if="modelValue" class="drawer-container">
        <div class="drawer-backdrop" @click="close" />
        <div class="drawer-panel">
          <!-- Header -->
          <div class="drawer-header">
            <h3 class="drawer-title">{{ title }}</h3>
            <button @click="close" class="close-btn" aria-label="Close drawer">
              <i class="close-icon">×</i>
            </button>
          </div>
          
          <!-- Content -->
          <div class="drawer-body">
            <!-- Summary Section -->
            <div class="summary-section">
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-label">Total Selected:</span>
                  <span class="stat-value">{{ selectedSessions.length }}</span>
                </div>
                <div v-if="selectionStats.ineligible > 0" class="stat-item warning">
                  <span class="stat-label">Ineligible:</span>
                  <span class="stat-value">{{ selectionStats.ineligible }}</span>
                </div>
                <div class="stat-item success">
                  <span class="stat-label">Will be {{ actionType }}d:</span>
                  <span class="stat-value">{{ selectionStats.eligible }}</span>
                </div>
              </div>
            </div>
            
            <!-- Session List Preview -->
            <div class="session-preview">
              <h4 class="preview-title">Selected Sessions:</h4>
              <div class="session-list">
                <div 
                  v-for="(session, index) in displayedSessions" 
                  :key="session.session_id"
                  class="session-preview-item"
                  :class="{ 
                    ineligible: !canSelectSession(session),
                    selected: true
                  }"
                >
                  <div class="session-info">
                    <div class="session-name">{{ session.session_name || 'Unnamed Session' }}</div>
                    <div class="session-details">
                      <span class="session-id">{{ session.session_id.substring(0, 8) }}...</span>
                      <span class="session-status" :class="getStatusClass(session.status)">
                        {{ session.status }}
                      </span>
                      <span class="session-date">{{ formatDate(session.created_at) }}</span>
                    </div>
                  </div>
                  <div v-if="!canSelectSession(session)" class="ineligible-badge">
                    Cannot {{ actionType }}
                  </div>
                </div>
                <div v-if="selectedSessions.length > maxDisplayed" class="more-sessions">
                  <i class="more-icon">⋯</i>
                  <span>and {{ selectedSessions.length - maxDisplayed }} more sessions</span>
                </div>
              </div>
            </div>
            
            <!-- Warning for ineligible sessions -->
            <div v-if="selectionStats.ineligible > 0" class="ineligible-warning">
              <div class="warning-header">
                <i class="warning-icon">⚠️</i>
                <span class="warning-title">Some sessions cannot be {{ actionType }}d</span>
              </div>
              <p class="warning-text">
                {{ selectionStats.ineligible }} sessions are currently active and cannot be {{ actionType }}d. 
                Only {{ selectionStats.eligible }} sessions will be processed.
              </p>
            </div>
            
            <!-- Confirmation Section -->
            <div class="confirmation-section">
              <label class="checkbox-confirm">
                <input 
                  type="checkbox" 
                  v-model="confirmed"
                  class="checkbox-input"
                />
                <span class="checkbox-text">
                  I understand this action is permanent and will {{ actionType }} {{ selectionStats.eligible }} sessions
                </span>
              </label>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="drawer-footer">
            <button @click="close" class="btn-secondary">
              <i class="btn-icon">↩</i>
              Cancel
            </button>
            <button 
              @click="handleConfirm" 
              :disabled="!confirmed || selectionStats.eligible === 0"
              class="btn-primary"
              :class="getActionButtonClass()"
            >
              <i class="btn-icon">{{ getActionIcon() }}</i>
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
export default {
  name: 'BulkConfirmationDrawer',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    actionType: {
      type: String,
      default: 'delete',
      validator: (value) => ['delete', 'export', 'close'].includes(value)
    },
    selectedSessions: {
      type: Array,
      default: () => []
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
  emits: ['update:modelValue', 'confirm', 'close'],
  data() {
    return {
      confirmed: false,
      maxDisplayed: 10
    }
  },
  computed: {
    title() {
      const count = this.selectedSessions.length
      const action = this.getActionDisplayName()
      return `${action} ${count} Session${count !== 1 ? 's' : ''}`
    },
    
    confirmText() {
      const count = this.selectionStats.eligible
      const action = this.getActionDisplayName()
      return `${action} ${count} Session${count !== 1 ? 's' : ''}`
    },
    
    displayedSessions() {
      return this.selectedSessions.slice(0, this.maxDisplayed)
    }
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },
    
    handleConfirm() {
      if (this.confirmed && this.selectionStats.eligible > 0) {
        this.$emit('confirm', {
          actionType: this.actionType,
          selectedSessions: this.selectedSessions,
          confirmed: this.confirmed
        })
      }
    },
    
    getActionDisplayName() {
      const actions = {
        delete: 'Delete',
        export: 'Export',
        close: 'Close'
      }
      return actions[this.actionType] || 'Process'
    },
    
    getActionIcon() {
      const icons = {
        delete: '🗑️',
        export: '📥',
        close: '🔒'
      }
      return icons[this.actionType] || '⚡'
    },
    
    getActionButtonClass() {
      return `btn-${this.actionType}`
    },
    
    canSelectSession(session) {
      const activeStatuses = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING']
      return !activeStatuses.includes(session.status?.toUpperCase())
    },
    
    getStatusClass(status) {
      if (!status) return 'unknown'
      return status.toLowerCase().replace(/\s+/g, '-')
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleDateString()
    }
  },
  watch: {
    modelValue(newVal) {
      if (newVal) {
        this.confirmed = false
      }
    }
  }
}
</script>

<style scoped>
.drawer-container {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 450px;
  z-index: 1000;
  display: flex;
}

.drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.drawer-panel {
  position: relative;
  width: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  border-radius: 12px 0 0 12px;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.drawer-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #e9ecef;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #dc3545;
  color: white;
}

.close-icon {
  font-size: 18px;
  font-weight: bold;
}

.drawer-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.summary-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-item.warning .stat-value {
  color: #dc3545;
  font-weight: 600;
}

.stat-item.success .stat-value {
  color: #28a745;
  font-weight: 600;
}

.stat-label {
  font-weight: 500;
  color: #666;
}

.stat-value {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.session-preview {
  flex: 1;
  min-height: 0;
}

.preview-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.session-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
}

.session-preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s ease;
}

.session-preview-item:last-child {
  border-bottom: none;
}

.session-preview-item.ineligible {
  background: #fff5f5;
  color: #dc3545;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-details {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.session-id {
  font-family: monospace;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
}

.session-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.session-status.completed {
  background: #d4edda;
  color: #155724;
}

.session-status.failed {
  background: #f8d7da;
  color: #721c24;
}

.session-status.processing {
  background: #d1ecf1;
  color: #0c5460;
}

.session-status.unknown {
  background: #e2e3e5;
  color: #6c757d;
}

.session-date {
  color: #999;
}

.ineligible-badge {
  background: #dc3545;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.more-sessions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #666;
  font-style: italic;
  background: #f8f9fa;
}

.more-icon {
  font-size: 20px;
  color: #999;
}

.ineligible-warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.warning-icon {
  font-size: 18px;
}

.warning-title {
  font-weight: 600;
  color: #856404;
}

.warning-text {
  margin: 0;
  color: #856404;
  font-size: 14px;
  line-height: 1.4;
}

.confirmation-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.checkbox-confirm {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.checkbox-input {
  margin: 0;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

.checkbox-text {
  color: #333;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 500;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.btn-secondary,
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary.btn-delete {
  background: #dc3545;
}

.btn-primary.btn-delete:hover:not(:disabled) {
  background: #c82333;
}

.btn-primary.btn-export {
  background: #28a745;
}

.btn-primary.btn-export:hover:not(:disabled) {
  background: #218838;
}

.btn-primary.btn-close {
  background: #6c757d;
}

.btn-primary.btn-close:hover:not(:disabled) {
  background: #5a6268;
}

.btn-icon {
  font-size: 16px;
}

/* Drawer animation */
.drawer-enter-active {
  transition: all 0.3s ease-out;
}

.drawer-leave-active {
  transition: all 0.2s ease-in;
}

.drawer-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.drawer-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Responsive design */
@media (max-width: 768px) {
  .drawer-container {
    width: 100%;
  }
  
  .drawer-panel {
    border-radius: 0;
  }
  
  .drawer-header,
  .drawer-body,
  .drawer-footer {
    padding: 16px;
  }
  
  .session-details {
    flex-direction: column;
    gap: 4px;
  }
  
  .drawer-footer {
    flex-direction: column;
  }
  
  .btn-secondary,
  .btn-primary {
    justify-content: center;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .drawer-panel {
    background: #2d2d2d;
    color: #e0e0e0;
  }
  
  .drawer-header {
    background: #3d3d3d;
    border-color: #444;
  }
  
  .drawer-title {
    color: #e0e0e0;
  }
  
  .close-btn {
    background: #555;
    color: #e0e0e0;
  }
  
  .close-btn:hover {
    background: #dc3545;
  }
  
  .summary-section,
  .confirmation-section {
    background: #3d3d3d;
  }
  
  .session-list {
    background: #3d3d3d;
    border-color: #555;
  }
  
  .session-preview-item {
    border-color: #555;
  }
  
  .session-preview-item.ineligible {
    background: #4d1a1a;
  }
  
  .drawer-footer {
    background: #3d3d3d;
    border-color: #444;
  }
  
  .stat-label {
    color: #aaa;
  }
  
  .stat-value {
    color: #e0e0e0;
  }
}

/* Focus styles for accessibility */
.checkbox-input:focus,
.btn-secondary:focus,
.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.btn-primary:disabled:focus {
  box-shadow: none;
}
</style>




