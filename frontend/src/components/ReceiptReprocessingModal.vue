<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3>📄 Add New Receipts</h3>
        <button @click="close" class="close-button">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="session-info">
          <h4>{{ session?.session_name }}</h4>
          <div class="session-details">
            <span class="detail-item">
              <i class="icon-version"></i>
              Current Version: {{ session?.receipt_file_versions || 1 }}
            </span>
            <span class="detail-item" v-if="session?.last_receipt_upload">
              <i class="icon-calendar"></i>
              Last Updated: {{ formatDate(session.last_receipt_upload) }}
            </span>
          </div>
        </div>
        
        <div class="upload-section">
          <div class="upload-area" 
               :class="{ 'drag-over': isDragOver, 'uploading': uploading }"
               @drop="handleDrop"
               @dragover="handleDragOver"
               @dragleave="handleDragLeave"
               @click="triggerFileInput">
            <input 
              ref="fileInput"
              type="file" 
              accept=".pdf,application/pdf,.csv,.xlsx,.xls"
              @change="handleFileSelect"
              style="display: none"
            >
            
            <div v-if="!uploading" class="upload-content">
              <i class="icon-upload"></i>
              <h4>Drop receipt file here or click to browse</h4>
              <p>Supported formats: PDF (max 50MB), CSV/Excel (max 10MB)</p>
              <div class="file-info" v-if="selectedFile">
                <i class="icon-file"></i>
                <span>{{ selectedFile.name }}</span>
                <span class="file-size" :class="{ 'file-too-large': isFileTooLarge(selectedFile) }">
                  ({{ formatFileSize(selectedFile.size) }})
                </span>
              </div>
            </div>
            
            <div v-else class="uploading-content">
              <i class="icon-spinner spinning"></i>
              <h4>Processing receipts...</h4>
              <p>Please wait while we analyze the new receipt data</p>
            </div>
          </div>
        </div>
        
        <div class="reprocessing-info" v-if="session?.receipt_file_versions > 1">
          <div class="info-box">
            <i class="icon-info"></i>
            <div>
              <h5>Reprocessing Information</h5>
              <p>This session has been reprocessed {{ session.receipt_file_versions - 1 }} time(s) before. 
                 Adding new receipts will trigger change detection and update employee data accordingly.</p>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <label for="reprocess-reason" class="form-label">
            Reason for Adding Receipts (Optional)
          </label>
          <textarea
            id="reprocess-reason"
            v-model="reprocessReason"
            class="form-textarea"
            placeholder="Enter reason for adding new receipts..."
            rows="3"
          ></textarea>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-secondary" :disabled="uploading">
          Cancel
        </button>
        <button 
          @click="startReprocessing" 
          class="btn-primary"
          :disabled="!selectedFile || uploading"
        >
          <i class="icon-upload"></i>
          {{ uploading ? 'Processing...' : 'Add Receipts & Reprocess' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useNotificationStore } from '@/stores/notification.js'
import { useApi } from '@/composables/useApi.js'

export default {
  name: 'ReceiptReprocessingModal',
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
      selectedFile: null,
      reprocessReason: '',
      uploading: false,
      isDragOver: false
    }
  },
  setup() {
    const notificationStore = useNotificationStore()
    const api = useApi()
    return { notificationStore, api }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // Reset form when modal opens
        this.selectedFile = null
        this.reprocessReason = ''
        this.uploading = false
        this.isDragOver = false
      }
    }
  },
  methods: {
    close() {
      if (!this.uploading) {
        this.$emit('close')
      }
    },
    
    handleOverlayClick() {
      if (!this.uploading) {
        this.close()
      }
    },
    
    triggerFileInput() {
      this.$refs.fileInput.click()
    },
    
    validateFileType(file) {
      const allowedTypes = [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      
      const allowedExtensions = ['.pdf', '.csv', '.xls', '.xlsx']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      
      // Check file type and extension
      const isValidType = allowedTypes.includes(file.type)
      const isValidExtension = allowedExtensions.includes(fileExtension)
      
      if (!isValidType && !isValidExtension) {
        this.notificationStore.addError(`Unsupported file type. Please select a PDF, CSV, or Excel file.`)
        return false
      }
      
      // Check file size (50MB max for PDFs, 10MB for others)
      const maxSize = file.type === 'application/pdf' ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024))
        this.notificationStore.addError(`File too large. Maximum size is ${maxSizeMB}MB.`)
        return false
      }
      
      return true
    },
    
    isFileTooLarge(file) {
      const maxSize = file.type === 'application/pdf' ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      return file.size > maxSize
    },
    
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        if (this.validateFileType(file)) {
          this.selectedFile = file
        } else {
          // Clear file input on validation failure
          event.target.value = ''
        }
      }
    },
    
    handleDragOver(event) {
      event.preventDefault()
      this.isDragOver = true
    },
    
    handleDragLeave(event) {
      event.preventDefault()
      this.isDragOver = false
    },
    
    handleDrop(event) {
      event.preventDefault()
      this.isDragOver = false
      
      const files = event.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        
        if (this.validateFileType(file)) {
          this.selectedFile = file
        }
        // Note: No need to clear drag input as it's not a persistent input element
      }
    },
    
    async startReprocessing() {
      if (!this.selectedFile || !this.session) return
      
      this.uploading = true
      
      try {
        const formData = new FormData()
        formData.append('file', this.selectedFile)
        if (this.reprocessReason) {
          formData.append('closure_reason', this.reprocessReason)
        }
        
        const response = await this.api.request(
          `/phase4/sessions/${this.session.session_id}/reprocess-receipts`,
          {
            method: 'POST',
            body: formData
          }
        )
        
        this.notificationStore.addSuccess('Receipts added and session reprocessed successfully')
        this.$emit('success', response)
        this.close()
        
      } catch (error) {
        console.error('Failed to reprocess receipts:', error)
        this.notificationStore.addError('Failed to add receipts and reprocess session')
      } finally {
        this.uploading = false
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Never'
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
  color: #1976d2;
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

.session-info {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #1976d2;
}

.session-info h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.session-details {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 14px;
}

.upload-section {
  margin-bottom: 24px;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #1976d2;
  background: #f0f7ff;
}

.upload-area.drag-over {
  border-color: #1976d2;
  background: #e3f2fd;
}

.upload-area.uploading {
  border-color: #4caf50;
  background: #f1f8e9;
  cursor: not-allowed;
}

.upload-content, .uploading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-content i, .uploading-content i {
  font-size: 48px;
  color: #1976d2;
}

.uploading-content i.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-content h4, .uploading-content h4 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.upload-content p, .uploading-content p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #e3f2fd;
  border-radius: 4px;
  margin-top: 12px;
}

.file-info i {
  font-size: 16px;
  color: #1976d2;
}

.file-size {
  color: #666;
  font-size: 12px;
}

.reprocessing-info {
  margin-bottom: 24px;
}

.info-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 6px;
}

.info-box i {
  font-size: 20px;
  color: #f57c00;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-box h5 {
  margin: 0 0 8px 0;
  color: #e65100;
  font-size: 14px;
}

.info-box p {
  margin: 0;
  color: #e65100;
  font-size: 13px;
  line-height: 1.4;
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
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 123, 255, 0.25);
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

.file-too-large {
  color: #d32f2f;
  font-weight: bold;
}
</style>
