<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3>⚠️ Bulk Session Closure</h3>
        <button @click="close" class="close-button">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="warning-section">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
            <p><strong>This action CANNOT be undone!</strong></p>
            <p>You are about to permanently close <strong>{{ sessionCount }} active session{{ sessionCount === 1 ? '' : 's' }}</strong>.</p>
            <p>Once closed, these sessions cannot be resumed or reopened.</p>
          </div>
        </div>
        
        <div class="sessions-list" v-if="sessions.length > 0">
          <h4>Sessions to be closed:</h4>
          <div class="session-item" v-for="session in sessions" :key="session.session_id">
            <span class="session-name">{{ session.session_name || 'Unnamed Session' }}</span>
            <span class="session-status">{{ session.status }}</span>
          </div>
        </div>
        
        <div class="form-section">
          <label for="bulk-closure-reason" class="form-label">
            Closure Reason (Optional)
          </label>
          <textarea
            id="bulk-closure-reason"
            v-model="closureReason"
            class="form-textarea"
            placeholder="Enter reason for closing all sessions..."
            rows="3"
          ></textarea>
        </div>
        
        <div class="confirmation-section">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="confirmed"
              class="checkbox-input"
            >
            <span class="checkbox-text">
              I understand this action is permanent and will close {{ sessionCount }} session{{ sessionCount === 1 ? '' : 's' }}
            </span>
          </label>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-secondary" :disabled="closing">
          Cancel
        </button>
        <button 
          @click="confirmClose" 
          class="btn-danger"
          :disabled="!confirmed || closing"
        >
          <i class="icon-close"></i>
          {{ closing ? 'Closing...' : `Close ${sessionCount} Session${sessionCount === 1 ? '' : 's'}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CloseAllSessionsModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    sessions: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'confirm'],
  data() {
    return {
      closureReason: '',
      confirmed: false,
      closing: false
    }
  },
  computed: {
    sessionCount() {
      return this.sessions.length
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // Reset form when modal opens
        this.closureReason = ''
        this.confirmed = false
        this.closing = false
      }
    }
  },
  methods: {
    close() {
      if (!this.closing) {
        this.$emit('close')
      }
    },
    
    handleOverlayClick() {
      if (!this.closing) {
        this.close()
      }
    },
    
    confirmClose() {
      if (!this.confirmed || this.closing) return
      
      this.closing = true
      
      // Emit the confirm event - parent will handle the async operation
      this.$emit('confirm', {
        sessions: this.sessions,
        closureReason: this.closureReason.trim() || 'Bulk closure by admin via UI'
      })
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

.warning-text p:last-child {
  margin-bottom: 0;
}

.sessions-list {
  margin-bottom: 20px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
}

.sessions-list h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.session-item:last-child {
  border-bottom: none;
}

.session-name {
  font-weight: 500;
  color: #333;
  flex: 1;
  margin-right: 12px;
}

.session-status {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.form-section {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
}

.form-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.confirmation-section {
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
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

.btn-secondary, .btn-danger {
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

.btn-secondary:disabled, .btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

