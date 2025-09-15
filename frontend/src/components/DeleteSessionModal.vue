<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3>🗑️ Delete Session</h3>
        <button @click="close" class="close-button">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="warning-section">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
            <p><strong>This action CANNOT be undone!</strong></p>
            <p>You are about to permanently delete this session and ALL its data including:</p>
            <ul>
              <li>All employee processing results</li>
              <li>Processing history and logs</li>
              <li>Export records and tracking data</li>
              <li>Uploaded files and generated reports</li>
            </ul>
          </div>
        </div>
        
        <div class="session-details" v-if="session">
          <h4>Session Details:</h4>
          <div class="detail-row">
            <span class="label">Name:</span>
            <span class="value">{{ session.session_name || 'Unnamed Session' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">ID:</span>
            <span class="value session-id">{{ session.session_id }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">
              <span class="status-badge" :class="session.status ? session.status.toLowerCase() : 'unknown'">
                {{ session.status || 'Unknown' }}
              </span>
            </span>
          </div>
          <div class="detail-row">
            <span class="label">Created:</span>
            <span class="value">{{ formatDate(session.created_at) }}</span>
          </div>
          <div class="detail-row" v-if="session.employee_count">
            <span class="label">Employees:</span>
            <span class="value">{{ session.employee_count.total || 0 }} records</span>
          </div>
          <div class="detail-row" v-if="session.is_closed">
            <span class="label">Status:</span>
            <span class="value closed-badge">Permanently Closed</span>
          </div>
        </div>
        
        <div class="deletion-restrictions" v-if="hasRestrictions">
          <h4>⚠️ Deletion Restrictions:</h4>
          <div class="restriction-item" v-if="isActiveSession">
            <span class="restriction-icon">🚫</span>
            <span class="restriction-text">
              Cannot delete active session. Please stop or close the session first.
            </span>
          </div>
        </div>
        
        <div class="confirmation-section" v-if="!hasRestrictions">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="confirmed"
              class="checkbox-input"
            >
            <span class="checkbox-text">
              I understand this action is permanent and will delete ALL session data
            </span>
          </label>
          
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-secondary" :disabled="deleting">
          Cancel
        </button>
        <button 
          @click="confirmDelete" 
          class="btn-danger"
          :disabled="!canDelete || deleting"
          v-if="!hasRestrictions"
        >
          <i class="icon-trash"></i>
          {{ deleting ? 'Deleting...' : 'Delete Session' }}
        </button>
        <button 
          @click="close" 
          class="btn-primary"
          v-if="hasRestrictions"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DeleteSessionModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    session: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'confirm'],
  data() {
    return {
      confirmed: false,
      deleting: false
    }
  },
  computed: {
    isActiveSession() {
      if (!this.session?.status) return false
      const activeStatuses = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING']
      return activeStatuses.includes(this.session.status.toUpperCase())
    },
    
    hasRestrictions() {
      return this.isActiveSession
    },
    
    canDelete() {
      return this.confirmed && !this.hasRestrictions
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // Reset form when modal opens
        this.confirmed = false
        this.deleting = false
      }
    }
  },
  methods: {
    close() {
      if (!this.deleting) {
        this.$emit('close')
      }
    },
    
    handleOverlayClick() {
      if (!this.deleting) {
        this.close()
      }
    },
    
    async confirmDelete() {
      if (!this.canDelete || this.deleting) return
      
      this.deleting = true
      try {
        await this.$emit('confirm', this.session)
      } finally {
        this.deleting = false
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleString()
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #d32f2f;
  font-size: 1.25em;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 24px;
}

.warning-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 6px;
}

.warning-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.warning-text p {
  margin: 0 0 8px 0;
  color: #e65100;
}

.warning-text ul {
  margin: 8px 0 0 16px;
  color: #e65100;
}

.warning-text li {
  margin-bottom: 4px;
}

.session-details {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.session-details h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.label {
  font-weight: 500;
  color: #555;
  min-width: 80px;
}

.value {
  color: #333;
  word-break: break-all;
}

.session-id {
  font-family: monospace;
  font-size: 0.9em;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
}

.status-badge.processing {
  background: #e3f2fd;
  color: #1976d2;
}

.status-badge.completed {
  background: #e8f5e8;
  color: #2e7d32;
}

.status-badge.failed {
  background: #ffebee;
  color: #c62828;
}

.status-badge.unknown {
  background: #f5f5f5;
  color: #666;
}

.closed-badge {
  background: #f3e5f5;
  color: #6f42c1;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
}

.deletion-restrictions {
  margin-bottom: 24px;
  padding: 16px;
  background: #ffebee;
  border: 1px solid #ef5350;
  border-radius: 6px;
}

.deletion-restrictions h4 {
  margin: 0 0 12px 0;
  color: #c62828;
}

.restriction-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.restriction-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.restriction-text {
  color: #c62828;
  font-weight: 500;
}

.confirmation-section {
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  margin-bottom: 16px;
}

.checkbox-input {
  margin: 0;
  flex-shrink: 0;
  margin-top: 2px;
}

.checkbox-text {
  color: #333;
  font-size: 14px;
  line-height: 1.4;
}


.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-primary:disabled, .btn-secondary:disabled, .btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>