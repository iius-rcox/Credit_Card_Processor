<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3>📊 Export Session Data</h3>
        <button @click="close" class="close-button">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="session-info">
          <h4>{{ session?.session_name }}</h4>
          
          <!-- Loading state for summary -->
          <div v-if="summaryLoading" class="loading-container">
            <div class="spinner"></div>
            <span>Loading export summary...</span>
          </div>
          
          <!-- Error state for summary -->
          <div v-else-if="summaryError" class="error-banner">
            <div class="error-icon">⚠️</div>
            <div class="error-content">
              <div class="error-message">{{ summaryError.message }}</div>
              <div v-if="summaryError.details" class="error-details">{{ summaryError.details }}</div>
              <div class="error-actions">
                <button v-if="summaryError.canRetry" @click="retryLoadSummary" class="btn-retry">
                  🔄 Retry
                </button>
                <button @click="copyErrorDetails" class="btn-copy-error">
                  📋 Copy Error Details
                </button>
              </div>
            </div>
          </div>
          
          <!-- Summary stats when loaded successfully -->
          <div class="session-stats" v-else-if="exportSummary">
            <div class="stat-item">
              <span class="stat-label">Total Employees:</span>
              <span class="stat-value">{{ exportSummary.employee_stats.total_employees }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Already Exported:</span>
              <span class="stat-value">{{ exportSummary.employee_stats.already_exported }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Pending Export:</span>
              <span class="stat-value">{{ exportSummary.employee_stats.pending_export }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Changed:</span>
              <span class="stat-value">{{ exportSummary.employee_stats.changed_employees }}</span>
            </div>
          </div>
        </div>
        
        <div class="export-options">
          <h4>Export Type</h4>
          <div class="radio-group">
            <label class="radio-option">
              <input 
                type="radio" 
                v-model="exportType" 
                value="pvault"
                :disabled="loading"
              >
              <span class="radio-label">
                <i class="icon-database"></i>
                pVault File (Employee Data)
              </span>
            </label>
            <label class="radio-option">
              <input 
                type="radio" 
                v-model="exportType" 
                value="exceptions"
                :disabled="loading"
              >
              <span class="radio-label">
                <i class="icon-warning"></i>
                Exceptions Report
              </span>
            </label>
          </div>
        </div>
        
        <div class="export-scope" v-if="hasExportHistory">
          <h4>Export Scope</h4>
          <div class="radio-group">
            <label class="radio-option">
              <input 
                type="radio" 
                v-model="exportScope" 
                value="delta"
                :disabled="loading"
              >
              <span class="radio-label">
                <i class="icon-delta"></i>
                Export Only New/Changed Data (Recommended)
              </span>
            </label>
            <label class="radio-option">
              <input 
                type="radio" 
                v-model="exportScope" 
                value="all"
                :disabled="loading"
              >
              <span class="radio-label">
                <i class="icon-all"></i>
                Export All Data (Including Previously Exported)
              </span>
            </label>
          </div>
          
          <div class="export-preview" v-if="exportPreview">
            <h5>Export Preview:</h5>
            <div class="preview-stats">
              <div class="preview-item" v-if="exportScope === 'delta'">
                <i class="icon-plus"></i>
                <span>{{ exportPreview.new_employees }} new employees</span>
              </div>
              <div class="preview-item" v-if="exportScope === 'delta'">
                <i class="icon-edit"></i>
                <span>{{ exportPreview.changed_employees }} changed employees</span>
              </div>
              <div class="preview-item">
                <i class="icon-check"></i>
                <span>{{ exportPreview.already_exported }} already exported ({{ exportScope === 'delta' ? 'excluded' : 'included' }})</span>
              </div>
              <div class="preview-item">
                <i class="icon-total"></i>
                <span>{{ exportPreview.total_employees }} total employees</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="export-options-advanced">
          <h4>Advanced Options</h4>
          <div class="checkbox-group">
            <label class="checkbox-option">
              <input 
                type="checkbox" 
                v-model="markAsExported"
                :disabled="loading"
              >
              <span class="checkbox-label">
                Mark records as exported after generation
              </span>
            </label>
          </div>
        </div>
        
        <div class="recommendations" v-if="exportSummary?.recommendations">
          <h4>Recommendations</h4>
          <div class="recommendation-list">
            <div 
              v-for="suggestion in exportSummary.recommendations.suggestions" 
              :key="suggestion"
              class="recommendation-item suggestion"
            >
              <i class="icon-lightbulb"></i>
              <span>{{ suggestion }}</span>
            </div>
            <div 
              v-for="warning in exportSummary.recommendations.warnings" 
              :key="warning"
              class="recommendation-item warning"
            >
              <i class="icon-warning"></i>
              <span>{{ warning }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-secondary" :disabled="loading">
          Cancel
        </button>
        <button 
          @click="generateExport" 
          class="btn-primary"
          :disabled="loading || !canExport"
        >
          <i class="icon-export"></i>
          {{ loading ? 'Generating...' : generateButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useNotificationStore } from '@/stores/notification.js'
import { useApi } from '@/composables/useApi.js'

export default {
  name: 'DeltaExportModal',
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
  emits: ['close', 'success'],
  data() {
    return {
      exportType: 'pvault',
      exportScope: 'delta',
      markAsExported: true,
      loading: false,
      exportSummary: null,
      exportPreview: null,
      summaryError: null,
      summaryLoading: false
    }
  },
  setup() {
    const notificationStore = useNotificationStore()
    const api = useApi()
    return { notificationStore, api }
  },
  computed: {
    hasExportHistory() {
      return this.exportSummary?.employee_stats.already_exported > 0
    },
    
    canExport() {
      if (!this.exportSummary) return false
      return this.exportSummary.employee_stats.pending_export > 0 || this.exportScope === 'all'
    },
    
    generateButtonText() {
      if (this.exportScope === 'delta') {
        return 'Export New Only'
      } else {
        return 'Export All'
      }
    }
  },
  watch: {
    show(newVal) {
      if (newVal && this.session) {
        this.loadExportSummary()
      }
    },
    
    exportScope() {
      this.updateExportPreview()
    },
    
    exportType() {
      this.updateExportPreview()
    }
  },
  methods: {
    close() {
      if (!this.loading) {
        this.$emit('close')
      }
    },
    
    handleOverlayClick() {
      if (!this.loading) {
        this.close()
      }
    },
    
    async loadExportSummary() {
      if (!this.session) return
      
      this.summaryError = null
      this.summaryLoading = true
      
      try {
        const response = await this.api.request(
          `/phase4/sessions/${this.session.session_id}/export-summary`
        )
        this.exportSummary = response
        this.updateExportPreview()
        this.summaryError = null
      } catch (error) {
        console.error('Failed to load export summary:', error)
        
        // Create actionable error message
        let errorMessage = 'Failed to load export summary'
        if (error.status === 404) {
          errorMessage = 'Session not found. Please refresh and try again.'
        } else if (error.status === 403) {
          errorMessage = 'Access denied to this session.'
        } else if (error.message) {
          errorMessage = `${errorMessage}: ${error.message}`
        }
        
        this.summaryError = {
          message: errorMessage,
          details: error.response?.data?.detail || error.message,
          canRetry: error.status !== 403 && error.status !== 404
        }
        
        this.notificationStore.addError(errorMessage)
      } finally {
        this.summaryLoading = false
      }
    },
    
    async retryLoadSummary() {
      this.summaryError = null
      await this.loadExportSummary()
    },
    
    copyErrorDetails() {
      if (!this.summaryError) return
      
      const errorInfo = {
        timestamp: new Date().toISOString(),
        session_id: this.session?.session_id,
        error: this.summaryError.message,
        details: this.summaryError.details,
        endpoint: `/api/phase4/sessions/${this.session?.session_id}/export-summary`
      }
      
      const errorText = JSON.stringify(errorInfo, null, 2)
      
      // Copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(errorText).then(() => {
          this.notificationStore.addSuccess('Error details copied to clipboard')
        }).catch(() => {
          console.log('Failed to copy:', errorText)
          this.notificationStore.addInfo('Error details logged to console')
        })
      } else {
        console.log('Error details:', errorText)
        this.notificationStore.addInfo('Error details logged to console')
      }
    },
    
    updateExportPreview() {
      if (!this.exportSummary) return
      
      const stats = this.exportSummary.employee_stats
      
      if (this.exportScope === 'delta') {
        this.exportPreview = {
          new_employees: stats.pending_export,
          changed_employees: stats.changed_employees,
          already_exported: stats.already_exported,
          total_employees: stats.pending_export + stats.changed_employees
        }
      } else {
        this.exportPreview = {
          new_employees: stats.pending_export,
          changed_employees: stats.changed_employees,
          already_exported: stats.already_exported,
          total_employees: stats.total_employees
        }
      }
    },
    
    async generateExport() {
      if (!this.session || !this.canExport) return
      
      this.loading = true
      
      try {
        const requestData = {
          export_type: this.exportType,
          include_exported: this.exportScope === 'all',
          mark_as_exported: this.markAsExported
        }
        
        const response = await this.api.request(
          `/phase4/sessions/${this.session.session_id}/export-delta`,
          {
            method: 'POST',
            body: JSON.stringify(requestData)
          }
        )
        
        this.notificationStore.addSuccess(
          `Export generated successfully: ${response.employee_count} employees`
        )
        
        this.$emit('success', response)
        this.close()
        
      } catch (error) {
        console.error('Failed to generate export:', error)
        this.notificationStore.addError('Failed to generate export')
      } finally {
        this.loading = false
      }
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
  max-width: 700px;
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
  color: #1976d2;
  font-size: 1.25em;
}

.loading-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  justify-content: center;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #1976d2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  display: flex;
  gap: 12px;
  margin: 16px 0;
  padding: 16px;
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 6px;
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-message {
  font-weight: 500;
  color: #e65100;
  margin-bottom: 4px;
}

.error-details {
  font-size: 0.9em;
  color: #bf360c;
  margin-bottom: 8px;
}

.error-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-retry, .btn-copy-error {
  padding: 4px 12px;
  border: 1px solid #ff9800;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background 0.2s;
}

.btn-retry:hover, .btn-copy-error:hover {
  background: #fff8e1;
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

.session-info {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #1976d2;
}

.session-info h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.session-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1976d2;
}

.export-options, .export-scope, .export-options-advanced {
  margin-bottom: 24px;
}

.export-options h4, .export-scope h4, .export-options-advanced h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.radio-group, .checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option, .checkbox-option {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s;
}

.radio-option:hover, .checkbox-option:hover {
  border-color: #1976d2;
  background: #f0f7ff;
}

.radio-option input, .checkbox-option input {
  margin: 0;
}

.radio-label, .checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #333;
}

.radio-label i, .checkbox-label i {
  font-size: 16px;
  color: #1976d2;
}

.export-preview {
  margin-top: 16px;
  padding: 16px;
  background: #e3f2fd;
  border-radius: 6px;
  border: 1px solid #bbdefb;
}

.export-preview h5 {
  margin: 0 0 12px 0;
  color: #1976d2;
  font-size: 14px;
}

.preview-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
}

.preview-item i {
  font-size: 16px;
  color: #1976d2;
}

.recommendations {
  margin-bottom: 20px;
}

.recommendations h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.recommendation-item.suggestion {
  background: #e8f5e8;
  border-left: 3px solid #4caf50;
  color: #2e7d32;
}

.recommendation-item.warning {
  background: #fff3e0;
  border-left: 3px solid #ff9800;
  color: #e65100;
}

.recommendation-item i {
  font-size: 16px;
  margin-top: 1px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.btn-secondary, .btn-primary {
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

.btn-primary {
  background: #1976d2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1565c0;
}

.btn-secondary:disabled, .btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>







