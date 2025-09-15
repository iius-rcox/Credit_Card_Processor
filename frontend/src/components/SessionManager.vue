<template>
  <div class="session-manager" role="region" aria-label="Session Management">
    <div class="session-header">
      <h2>Active Sessions</h2>
      <div class="session-controls" role="toolbar" aria-label="Session controls">
        <!-- Manage Mode Toggle -->
        <ManageModeToggle 
          v-model="manageMode"
          :disabled="loading"
          @toggle="handleManageModeToggle"
        />
        
        <!-- Existing controls (hidden in manage mode) -->
        <template v-if="!manageMode">
          <button 
            @click="refreshSessions" 
            class="btn-refresh" 
            :disabled="loading"
            aria-label="Refresh sessions"
          >
            <i class="icon-refresh" aria-hidden="true"></i> Refresh
          </button>
          <button 
            @click="closeAllSessions" 
            class="btn-danger" 
            :disabled="!hasCloseableSessions"
            aria-label="Close all sessions"
          >
            <i class="icon-close" aria-hidden="true"></i> Close All
          </button>
        </template>
      </div>
    </div>

    <!-- Bulk Action Toolbar (only in manage mode) -->
    <BulkActionToolbar
      v-if="manageMode"
      :show="selectedSessions.size > 0"
      :selected-count="selectedSessions.size"
      :total-count="filteredSessions.length"
      :selection-stats="selectionStats"
      @delete-selected="handleBulkDelete"
      @export-selected="handleBulkExport"
      @close-selected="handleBulkClose"
      @deselect-all="clearSelection"
      @select-all-page="selectAllCurrentPage"
      @select-all-results="selectAllResults"
    />

    <div class="session-filters">
      <select v-model="statusFilter" @change="filterSessions">
        <option value="all">All Sessions</option>
        <option value="processing">Processing</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="closed">Closed</option>
        <option value="stuck">Stuck (5+ min)</option>
      </select>
      <input 
        v-model="searchTerm" 
        @input="filterSessions"
        placeholder="Search by session name or ID..."
        class="search-input"
      />
      
      <!-- Quick filters for manage mode -->
      <div v-if="manageMode" class="quick-filters">
        <button 
          v-for="status in quickFilterStatuses" 
          :key="status.value"
          @click="applyQuickFilter(status.value)"
          class="quick-filter-btn"
          :class="{ active: statusFilter === status.value }"
        >
          {{ status.label }} ({{ getStatusCount(status.value) }})
        </button>
      </div>
    </div>

    <div 
      class="sessions-grid" 
      :class="{ 'manage-mode': manageMode }"
      :role="manageMode ? 'listbox' : null"
      :aria-multiselectable="manageMode ? 'true' : null"
    >
      <div 
        v-for="(session, index) in filteredSessions" 
        :key="session.session_id"
        class="session-card"
        :class="getSessionCardClasses(session, index)"
        @click="handleSessionCardClick(session, index, $event)"
        :data-session-id="session.session_id"
        :role="manageMode ? 'option' : null"
        :aria-selected="manageMode ? String(selectedSessions.has(session.session_id)) : null"
        :aria-posinset="manageMode ? index + 1 : null"
        :aria-setsize="manageMode ? filteredSessions.length : null"
        tabindex="0"
        :ref="el => setCardRef(el, index)"
        @keydown.down.prevent="moveFocusTo(index + 1)"
        @keydown.up.prevent="moveFocusTo(index - 1)"
        @keydown.right.prevent="moveFocusTo(index + 1)"
        @keydown.left.prevent="moveFocusTo(index - 1)"
      >
        <!-- Selection checkbox (manage mode only) -->
        <div v-if="manageMode" class="selection-checkbox">
          <input 
            type="checkbox"
            :checked="selectedSessions.has(session.session_id)"
            @click.stop="toggleSessionSelection(session.session_id, index)"
            class="checkbox-input"
            :disabled="!canSelectSession(session)"
          />
        </div>
        <div class="session-header">
          <h3>{{ session.session_name || 'Unnamed Session' }}</h3>
          <span class="session-id">{{ (session.session_id || '').substring(0, 8) }}...</span>
        </div>
        
        <div class="session-details">
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value status-badge" :class="session.status ? session.status.toLowerCase() : 'unknown'">
              {{ session.status || 'Unknown' }}
            </span>
          </div>
          
          <div class="detail-row">
            <span class="label">Created:</span>
            <span class="value">{{ formatDate(session.created_at) }}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Last Updated:</span>
            <span class="value">{{ formatDate(session.updated_at) }}</span>
          </div>
          
          <div class="detail-row" v-if="session.progress && session.progress.percentage !== undefined">
            <span class="label">Progress:</span>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: (session.progress.percentage || 0) + '%' }"
              ></div>
              <span class="progress-text">{{ session.progress.percentage || 0 }}%</span>
            </div>
          </div>
          
          <div class="detail-row" v-if="session.employee_count && (session.employee_count.processed !== undefined || session.employee_count.total !== undefined)">
            <span class="label">Employees:</span>
            <span class="value">{{ session.employee_count.processed || 0 }}/{{ session.employee_count.total || 0 }}</span>
          </div>
          
          <div class="detail-row" v-if="session.duration">
            <span class="label">Duration:</span>
            <span class="value">{{ formatDuration(session.duration) }}</span>
          </div>
          
          <div class="detail-row" v-if="session.is_closed">
            <span class="label">Closed:</span>
            <span class="value closed-info">
              {{ formatDate(session.closed_at) }}
              <span v-if="session.closed_by" class="closed-by">by {{ session.closed_by }}</span>
            </span>
          </div>
          
          <div class="detail-row" v-if="session.closure_reason">
            <span class="label">Reason:</span>
            <span class="value closure-reason">{{ session.closure_reason }}</span>
          </div>
        </div>

        <div class="session-actions">
          <button 
            @click="viewSession(session)" 
            class="btn-primary"
            :disabled="session.status === 'processing'"
          >
            <i class="icon-eye"></i> View
          </button>
          
          <button 
            @click="resumeSession(session)" 
            class="btn-success"
            v-if="session.status === 'completed' || session.status === 'failed'"
          >
            <i class="icon-play"></i> Resume
          </button>
          
          <!-- Phase 4: Receipt Reprocessing -->
          <button 
            @click="reprocessReceipts(session)" 
            class="btn-secondary"
            v-if="canReprocess(session)"
          >
            <i class="icon-upload"></i> Add Receipts
          </button>
          
          <!-- Phase 4: Delta Export -->
          <button 
            @click="showDeltaExport(session)" 
            class="btn-info"
            v-if="canExport(session)"
          >
            <i class="icon-export"></i> Export
          </button>
          
          <button 
            @click="closeSession(session)" 
            class="btn-danger"
            v-if="session.status === 'processing' || session.status === 'completed' || session.status === 'failed'"
            :disabled="session.is_closed"
          >
            <i class="icon-close"></i> {{ session.is_closed ? 'Closed' : 'Close Permanently' }}
          </button>
          
          <button 
            @click="openDeleteModal(session)" 
            class="btn-danger"
            v-if="canDelete(session)"
          >
            <i class="icon-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>

    <div v-if="filteredSessions.length === 0" class="no-sessions">
      <i class="icon-info"></i>
      <p>No sessions found matching your criteria.</p>
    </div>

    <!-- Session Details Modal -->
    <SessionDetailsModal 
      v-if="showSessionModal && selectedSession"
      :session="selectedSession"
      @close="closeSessionModal"
      @view-results="handleViewResults"
    />
    
    <!-- Close Session Modal -->
    <CloseSessionModal
      :show="showCloseModal"
      :session="selectedSession"
      @close="closeCloseModal"
      @confirm="handleCloseSession"
    />
    
    <!-- Close All Sessions Modal -->
    <CloseAllSessionsModal
      :show="showCloseAllModal"
      :sessions="closeableSessions"
      @close="closeCloseAllModal"
      @confirm="handleCloseAllSessions"
    />
    
    <!-- Receipt Reprocessing Modal -->
    <ReceiptReprocessingModal
      :show="showReprocessingModal"
      :session="selectedSession"
      @close="closeReprocessingModal"
      @success="handleReprocessingSuccess"
    />
    
    <!-- Delta Export Modal -->
    <DeltaExportModal
      :show="showExportModal"
      :session="selectedSession"
      @close="closeExportModal"
      @success="handleExportSuccess"
    />
    
    <!-- Delete Session Modal -->
    <DeleteSessionModal
      :show="showDeleteModal"
      :session="selectedSession"
      @close="closeDeleteModal"
      @confirm="handleDeleteSession"
    />

    <!-- Bulk Confirmation Drawer -->
    <BulkConfirmationDrawer
      v-model="showBulkConfirmation"
      :action-type="bulkActionType"
      :selected-sessions="getSelectedSessionDetails()"
      :selection-stats="selectionStats"
      @confirm="handleBulkConfirm"
      @close="handleBulkCancel"
    />
  </div>
</template>

<script>
import { useNotificationStore } from '@/stores/notification.js'
import { useApi } from '@/composables/useApi.js'
import SessionDetailsModal from './SessionDetailsModal.vue'
import CloseSessionModal from './CloseSessionModal.vue'
import CloseAllSessionsModal from './CloseAllSessionsModal.vue'
import ReceiptReprocessingModal from './ReceiptReprocessingModal.vue'
import DeltaExportModal from './DeltaExportModal.vue'
import DeleteSessionModal from './DeleteSessionModal.vue'
import ManageModeToggle from './ManageModeToggle.vue'
import BulkActionToolbar from './BulkActionToolbar.vue'
import BulkConfirmationDrawer from './BulkConfirmationDrawer.vue'
import { useSessionSelectionStore } from '@/stores/sessionSelection.js'
import { selectionRules } from '@/utils/selectionRules.js'
import { ariaHelpers } from '@/utils/aria.js'
// Keyboard navigation composable is available if we migrate to setup API

export default {
  name: 'SessionManager',
  components: {
    SessionDetailsModal,
    CloseSessionModal,
    CloseAllSessionsModal,
    ReceiptReprocessingModal,
    DeltaExportModal,
    DeleteSessionModal,
    ManageModeToggle,
    BulkActionToolbar,
    BulkConfirmationDrawer
  },
  data() {
    return {
      sessions: [],
      filteredSessions: [],
      statusFilter: 'all',
      searchTerm: '',
      refreshInterval: null,
      loading: false,
      showSessionModal: false,
      selectedSession: null,
      showCloseModal: false,
      showCloseAllModal: false,
      showReprocessingModal: false,
      showExportModal: false,
      showDeleteModal: false,
      // Manage mode properties
      manageMode: false,
      selectedSessions: new Set(),
      lastSelectedIndex: null,
      showBulkConfirmation: false,
      bulkActionType: null,
      selectionStats: {
        total: 0,
        selected: 0,
        eligible: 0,
        ineligible: 0,
        pages: 1
      },
      // Focus management for keyboard navigation
      sessionCardRefs: [],
      quickFilterStatuses: [
        { value: 'all', label: 'All' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'closed', label: 'Closed' },
        { value: 'processing', label: 'Processing' }
      ],
      notificationStore: useNotificationStore(),
      api: useApi()
    }
  },
  created() {
    // Initialize selection store for cross-component features
    this.selectionStore = useSessionSelectionStore()
  },
  computed: {
    hasCloseableSessions() {
      // Check if there are any sessions that can be closed
      const closeableStatuses = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING', 'PAUSED', 'COMPLETED', 'FAILED']
      return this.sessions.some(session => closeableStatuses.includes(session.status) && !session.is_closed)
    },
    
    closeableSessions() {
      // Get all sessions that can be closed
      const closeableStatuses = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING', 'PAUSED', 'COMPLETED', 'FAILED']
      return this.sessions.filter(session => closeableStatuses.includes(session.status) && !session.is_closed)
    }
  },
  
  methods: {
    // Existing methods...
    canReprocess(session) {
      // Can reprocess completed or failed sessions (even if closed for delta processing)
      const status = session.status.toLowerCase()
      return status === 'completed' || status === 'failed'
    },
    
    canExport(session) {
      // Can export completed sessions (even if closed for delta exports)
      return session.status.toLowerCase() === 'completed'
    },
    
    canDelete(session) {
      // Can delete completed, failed, or closed sessions (not active processing ones)
      const status = session.status?.toLowerCase()
      const deletableStatuses = ['completed', 'failed', 'paused', 'closed']
      const activeStatuses = ['processing', 'extracting', 'analyzing', 'uploading']
      
      return deletableStatuses.includes(status) && !activeStatuses.includes(status)
    },
    
    reprocessReceipts(session) {
      this.selectedSession = session
      this.showReprocessingModal = true
    },
    
    closeReprocessingModal() {
      this.showReprocessingModal = false
      this.selectedSession = null
    },
    
    handleReprocessingSuccess(response) {
      this.notificationStore.addSuccess('Receipts added and session reprocessed successfully')
      this.loadSessions()
    },
    
    showDeltaExport(session) {
      this.selectedSession = session
      this.showExportModal = true
    },
    
    closeExportModal() {
      this.showExportModal = false
      this.selectedSession = null
    },
    
    handleExportSuccess(response) {
      this.notificationStore.addSuccess(`Export generated successfully: ${response.employee_count} employees`)
      this.loadSessions()
    },
    async loadSessions() {
      this.loading = true
      try {
        const response = await this.api.request('/sessions')
        // Handle both array and wrapper object response formats
        this.sessions = Array.isArray(response) ? response : (response.sessions || [])
        this.filterSessions()
      } catch (error) {
        console.error('Failed to load sessions:', error)
        this.notificationStore.addError('Failed to load sessions')
      } finally {
        this.loading = false
      }
    },
    
    filterSessions() {
      // Ensure sessions is an array
      if (!Array.isArray(this.sessions)) {
        this.filteredSessions = []
        return
      }
      
      let filtered = this.sessions
      
      // Filter by status
      if (this.statusFilter !== 'all') {
        if (this.statusFilter === 'stuck') {
          filtered = filtered.filter(session => {
            if (!session.updated_at || !session.status) return false
            const duration = Date.now() - new Date(session.updated_at).getTime()
            return session.status.toLowerCase() === 'processing' && duration > 5 * 60 * 1000 // 5 minutes
          })
        } else {
          // Fix: Case-insensitive comparison with null safety
          filtered = filtered.filter(session => 
            session.status && session.status.toLowerCase() === this.statusFilter.toLowerCase()
          )
        }
      }
      
      // Filter by search term
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase()
        filtered = filtered.filter(session => 
          (session.session_name?.toLowerCase().includes(term)) ||
          (session.session_id?.toLowerCase().includes(term))
        )
      }
      
      this.filteredSessions = filtered
      // Sync with selection store for range selection helpers & external features
      if (this.selectionStore) {
        this.selectionStore.setFilteredSessions(this.filteredSessions)
        this.selectionStore.updateSelectionStats(this.filteredSessions, 'delete', selectionRules)
      }
      // Reset focus refs after list changes
      this.sessionCardRefs = []
    },
    
    async refreshSessions() {
      await this.loadSessions()
      this.notificationStore.addSuccess('Sessions refreshed')
    },
    
    closeSession(session) {
      if (session.is_closed) {
        this.notificationStore.addInfo('Session is already permanently closed')
        return
      }
      
      this.selectedSession = session
      this.showCloseModal = true
    },
    
    closeCloseModal() {
      this.showCloseModal = false
      this.selectedSession = null
    },
    
    async handleCloseSession({ session, closureReason }) {
      try {
        await this.api.request(`/sessions/${session.session_id}/close`, { 
          method: 'POST',
          body: JSON.stringify({ closure_reason: closureReason })
        })
        this.notificationStore.addSuccess('Session permanently closed successfully')
        this.showCloseModal = false
        this.selectedSession = null
        await this.loadSessions()
      } catch (error) {
        console.error('Failed to close session:', error)
        this.notificationStore.addError('Failed to close session')
      }
    },
    
    async resumeSession(session) {
      if (session.is_closed) {
        this.notificationStore.addError('Cannot resume a permanently closed session')
        return
      }
      
      try {
        await this.api.request(`/sessions/${session.session_id}/resume`, { method: 'POST' })
        this.notificationStore.addSuccess('Session resumed successfully')
        await this.loadSessions()
      } catch (error) {
        console.error('Failed to resume session:', error)
        this.notificationStore.addError('Failed to resume session')
      }
    },
    
    openDeleteModal(session) {
      this.selectedSession = session
      this.showDeleteModal = true
    },
    
    closeDeleteModal() {
      this.showDeleteModal = false
      this.selectedSession = null
    },
    
    async handleDeleteSession(session) {
      try {
        const response = await this.api.request(`/sessions/${session.session_id}`, { method: 'DELETE' })
        
        // Use response details if available
        if (response.deleted_employees !== undefined) {
          this.notificationStore.addSuccess(
            `Session "${response.session_name}" deleted successfully. ` +
            `Removed ${response.deleted_employees} employees and ${response.deleted_activities} activities.`
          )
        } else {
          this.notificationStore.addSuccess(`Session "${session.session_name}" deleted successfully`)
        }
        
        this.showDeleteModal = false
        this.selectedSession = null
        await this.loadSessions()
      } catch (error) {
        console.error('Failed to delete session:', error)
        
        // Show specific error message if available
        let errorMessage = 'Failed to delete session'
        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail
        }
        
        this.notificationStore.addError(errorMessage)
      }
    },
    
    closeAllSessions() {
      if (this.closeableSessions.length === 0) {
        this.notificationStore.addInfo('No active sessions to close')
        return
      }
      
      this.showCloseAllModal = true
    },
    
    closeCloseAllModal() {
      this.showCloseAllModal = false
    },
    
    async handleCloseAllSessions({ sessions, closureReason }) {
      try {
        const response = await this.api.request('/sessions/close-all', { 
          method: 'POST',
          body: JSON.stringify({ closure_reason: closureReason })
        })
        const count = response.closed_count || 0
        if (count > 0) {
          this.notificationStore.addSuccess(`Permanently closed ${count} session${count === 1 ? '' : 's'} successfully`)
        } else {
          this.notificationStore.addInfo('No active sessions to close')
        }
        
        // Close the modal on success
        this.showCloseAllModal = false
        await this.loadSessions()
      } catch (error) {
        console.error('Failed to close all sessions:', error)
        
        // Show specific error message if available
        let errorMessage = 'Failed to close all sessions'
        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail
        }
        
        this.notificationStore.addError(errorMessage)
        // Don't close modal on error - let user try again or cancel
      }
    },
    
    viewSession(session) {
      this.selectedSession = session
      this.showSessionModal = true
    },

    closeSessionModal() {
      this.showSessionModal = false
      this.selectedSession = null
    },

    handleViewResults(sessionId) {
      // Close modal before navigating to avoid overlay flash
      this.showSessionModal = false
      this.selectedSession = null
      this.$nextTick(() => {
        this.$router.push({ 
          name: 'SessionResults', 
          params: { id: sessionId } 
        })
      })
    },
    
    getSessionStatusClass(status) {
      if (!status) return 'status-unknown'
      return `status-${status.toLowerCase()}`
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleString()
    },
    
    formatDuration(ms) {
      if (!ms || ms <= 0) return '0s'
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`
      } else {
        return `${seconds}s`
      }
    },
    
    startAutoRefresh() {
      this.refreshInterval = setInterval(() => {
        this.loadSessions()
      }, 10000) // Refresh every 10 seconds
    },
    
    stopAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
        this.refreshInterval = null
      }
    },

    // Manage mode methods
    handleManageModeToggle(enabled) {
      this.manageMode = enabled
      if (this.selectionStore) {
        this.selectionStore.toggleManageMode(enabled)
      }
      if (!enabled) {
        this.clearSelection()
      }
    },

    handleSessionCardClick(session, index, event) {
      if (!this.manageMode) return
      
      if (event.shiftKey && this.lastSelectedIndex !== null) {
        this.selectRange(this.lastSelectedIndex, index)
      } else if (event.ctrlKey || event.metaKey) {
        this.toggleSessionSelection(session.session_id, index)
      } else {
        this.clearSelection()
        this.toggleSessionSelection(session.session_id, index)
      }
    },

    toggleSessionSelection(sessionId, index) {
      if (this.selectedSessions.has(sessionId)) {
        this.selectedSessions.delete(sessionId)
        if (this.selectionStore) this.selectionStore.removeFromSelection(sessionId)
      } else {
        this.selectedSessions.add(sessionId)
        if (this.selectionStore) this.selectionStore.addToSelection(sessionId)
      }
      this.lastSelectedIndex = index
      this.updateSelectionStats()
      if (this.selectionStore) this.selectionStore.updateSelectionStats(this.filteredSessions, 'delete', selectionRules)
    },

    selectRange(startIndex, endIndex) {
      const start = Math.min(startIndex, endIndex)
      const end = Math.max(startIndex, endIndex)
      
      for (let i = start; i <= end; i++) {
        const session = this.filteredSessions[i]
        if (session && this.canSelectSession(session)) {
          this.selectedSessions.add(session.session_id)
          if (this.selectionStore) this.selectionStore.addToSelection(session.session_id)
        }
      }
      this.lastSelectedIndex = endIndex
      this.updateSelectionStats()
      if (this.selectionStore) this.selectionStore.updateSelectionStats(this.filteredSessions, 'delete', selectionRules)
    },

    selectAllCurrentPage() {
      this.filteredSessions.forEach(session => {
        if (this.canSelectSession(session)) {
          this.selectedSessions.add(session.session_id)
          if (this.selectionStore) this.selectionStore.addToSelection(session.session_id)
        }
      })
      this.updateSelectionStats()
      if (this.selectionStore) this.selectionStore.updateSelectionStats(this.filteredSessions, 'delete', selectionRules)
    },

    async selectAllResults() {
      try {
        // Try to fetch all sessions matching current filters
        // Prefer unbounded limit if supported; otherwise paginate
        const buildQuery = (limit, offset = 0) => {
          const params = new URLSearchParams()
          if (this.statusFilter && this.statusFilter !== 'all') {
            params.append('status', this.statusFilter)
          }
          if (this.searchTerm) {
            params.append('q', this.searchTerm)
          }
          if (typeof limit === 'number') params.append('limit', String(limit))
          if (typeof offset === 'number' && offset > 0) params.append('offset', String(offset))
          const qs = params.toString() ? `?${params.toString()}` : ''
          return `/sessions${qs}`
        }

        // Attempt single-shot
        let all = []
        try {
          const res = await this.api.request(buildQuery(-1))
          all = Array.isArray(res) ? res : (res.sessions || [])
        } catch (e) {
          // Fallback to pagination if server rejects limit=-1
          const pageSize = 500
          let offset = 0
          while (true) {
            const res = await this.api.request(buildQuery(pageSize, offset))
            const page = Array.isArray(res) ? res : (res.sessions || [])
            if (!page || page.length === 0) break
            all = all.concat(page)
            if (page.length < pageSize) break
            offset += pageSize
            // Guardrail to avoid runaway
            if (offset > 10000) break
          }
        }

        if (!Array.isArray(all) || all.length === 0) {
          this.notificationStore.addInfo('No sessions found for current filters')
          return
        }

        // Apply selection rules and add eligible ids
        let added = 0
        for (const s of all) {
          if (this.canSelectSession(s)) {
            if (!this.selectedSessions.has(s.session_id)) {
              this.selectedSessions.add(s.session_id)
              if (this.selectionStore) this.selectionStore.addToSelection(s.session_id)
              added++
            }
          }
        }

        this.updateSelectionStats()
        if (this.selectionStore) this.selectionStore.updateSelectionStats(this.filteredSessions, 'delete', selectionRules)
        this.notificationStore.addSuccess(`Selected ${added} eligible sessions across results`)
      } catch (err) {
        console.error('Select all results failed:', err)
        this.notificationStore.addError('Failed to select all results')
      }
    },

    clearSelection() {
      this.selectedSessions.clear()
      this.lastSelectedIndex = null
      this.updateSelectionStats()
      if (this.selectionStore) {
        this.selectionStore.clearSelection()
        this.selectionStore.updateSelectionStats(this.filteredSessions, 'delete', selectionRules)
      }
    },

    canSelectSession(session) {
      const activeStatuses = ['PROCESSING', 'EXTRACTING', 'ANALYZING', 'UPLOADING']
      return !activeStatuses.includes(session.status?.toUpperCase())
    },

    updateSelectionStats() {
      const selected = Array.from(this.selectedSessions)
      const selectedSessions = this.filteredSessions.filter(s => 
        selected.includes(s.session_id)
      )
      
      this.selectionStats = {
        total: this.filteredSessions.length,
        selected: selectedSessions.length,
        eligible: selectedSessions.filter(s => this.canSelectSession(s)).length,
        ineligible: selectedSessions.filter(s => !this.canSelectSession(s)).length,
        pages: 1 // TODO: implement pagination
      }

      // Announce selection changes for screen readers
      ariaHelpers.announceSelection(this.selectionStats.selected)
    },

    getSessionCardClasses(session, index) {
      const classes = [this.getSessionStatusClass(session.status)]
      
      if (this.manageMode) {
        classes.push('manage-mode')
        if (this.selectedSessions.has(session.session_id)) {
          classes.push('selected')
        }
        if (!this.canSelectSession(session)) {
          classes.push('ineligible')
        }
      }
      
      return classes
    },

    // Focus management helpers
    setCardRef(el, index) {
      if (!el) return
      this.sessionCardRefs[index] = el
    }
    ,
    moveFocusTo(targetIndex) {
      const len = this.filteredSessions.length
      if (len === 0) return
      let idx = targetIndex
      if (idx < 0) idx = len - 1
      if (idx >= len) idx = 0
      const el = this.sessionCardRefs[idx]
      if (el && typeof el.focus === 'function') {
        try { el.focus() } catch (e) {}
      }
    },

    getSelectedSessionDetails() {
      return this.filteredSessions.filter(s => 
        this.selectedSessions.has(s.session_id)
      )
    },

    getStatusCount(status) {
      if (status === 'all') {
        return this.filteredSessions.length
      }
      return this.filteredSessions.filter(s => 
        s.status?.toLowerCase() === status.toLowerCase()
      ).length
    },

    applyQuickFilter(status) {
      this.statusFilter = status
      this.filterSessions()
    },

    handleBulkDelete() {
      this.bulkActionType = 'delete'
      this.showBulkConfirmation = true
    },

    handleBulkExport() {
      this.bulkActionType = 'export'
      this.showBulkConfirmation = true
    },

    handleBulkClose() {
      this.bulkActionType = 'close'
      this.showBulkConfirmation = true
    },

    handleBulkConfirm(data) {
      if (data.actionType === 'delete') {
        this.performBulkDelete(data.selectedSessions)
      } else if (data.actionType === 'export') {
        this.performBulkExport(data.selectedSessions)
      } else if (data.actionType === 'close') {
        this.performBulkClose(data.selectedSessions)
      }
      this.showBulkConfirmation = false
    },

    handleBulkCancel() {
      this.showBulkConfirmation = false
      this.bulkActionType = null
    },

    async performBulkDelete(sessions) {
      try {
        const sessionIds = sessions.map(s => s.session_id)
        // TODO: Implement bulk delete API call
        console.log('Bulk delete sessions:', sessionIds)
        this.notificationStore.addSuccess(`Deleted ${sessionIds.length} sessions`)
        this.clearSelection()
        await this.loadSessions()
      } catch (error) {
        console.error('Bulk delete failed:', error)
        this.notificationStore.addError('Failed to delete sessions')
      }
    },

    async performBulkExport(sessions) {
      try {
        // TODO: Implement bulk export API call
        console.log('Bulk export sessions:', sessions)
        this.notificationStore.addSuccess(`Exported ${sessions.length} sessions`)
        this.clearSelection()
      } catch (error) {
        console.error('Bulk export failed:', error)
        this.notificationStore.addError('Failed to export sessions')
      }
    },

    async performBulkClose(sessions) {
      try {
        const sessionIds = sessions.map(s => s.session_id)
        // TODO: Implement bulk close API call
        console.log('Bulk close sessions:', sessionIds)
        this.notificationStore.addSuccess(`Closed ${sessionIds.length} sessions`)
        this.clearSelection()
        await this.loadSessions()
      } catch (error) {
        console.error('Bulk close failed:', error)
        this.notificationStore.addError('Failed to close sessions')
      }
    }
  },
  mounted() {
    this.loadSessions()
    this.startAutoRefresh()
    // Keyboard shortcuts integration
    this._handleKeydown = (event) => {
      // Guardrails: ignore when typing in inputs or modals are open
      const target = event.target
      const tag = (target?.tagName || '').toUpperCase()
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable
      const isModalOpen = this.showSessionModal || this.showCloseModal || this.showCloseAllModal || this.showReprocessingModal || this.showExportModal || this.showDeleteModal || this.showBulkConfirmation
      if (isTyping || isModalOpen) return

      const parts = []
      if (event.ctrlKey) parts.push('Ctrl')
      if (event.metaKey) parts.push('Meta')
      if (event.shiftKey) parts.push('Shift')
      if (event.altKey) parts.push('Alt')
      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
      parts.push(key)
      const combo = parts.join('+')

      switch (combo) {
        case 'Alt+M':
          this.handleManageModeToggle(!this.manageMode)
          break
        case 'Escape':
          if (this.manageMode) this.handleManageModeToggle(false)
          break
        case 'Ctrl+A':
        case 'Meta+A':
          if (this.manageMode) {
            event.preventDefault()
            this.selectAllCurrentPage()
          }
          break
        case 'Delete':
          if (this.selectedSessions.size > 0) this.handleBulkDelete()
          break
        case 'Ctrl+Shift+A':
        case 'Meta+Shift+A':
          this.clearSelection()
          break
        case ' ': // Space
          if (this.manageMode && event.target?.dataset?.sessionId) {
            event.preventDefault()
            const id = event.target.dataset.sessionId
            const idx = this.filteredSessions.findIndex(s => s.session_id === id)
            if (idx !== -1) this.toggleSessionSelection(id, idx)
          }
          break
        case 'ArrowDown':
          if (this.manageMode) {
            event.preventDefault()
            // If focus is not on a card, focus the first
            const activeIdx = this.sessionCardRefs.findIndex(el => el === document.activeElement)
            this.moveFocusTo(activeIdx >= 0 ? activeIdx + 1 : 0)
          }
          break
        case 'ArrowUp':
          if (this.manageMode) {
            event.preventDefault()
            const activeIdx = this.sessionCardRefs.findIndex(el => el === document.activeElement)
            this.moveFocusTo(activeIdx >= 0 ? activeIdx - 1 : this.filteredSessions.length - 1)
          }
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', this._handleKeydown)
  },
  beforeUnmount() {
    this.stopAutoRefresh()
    if (this._handleKeydown) document.removeEventListener('keydown', this._handleKeydown)
  }
}
</script>

<style scoped>
@import '@/styles/manage-mode.css';
.session-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.session-controls {
  display: flex;
  gap: 10px;
}

.session-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  align-items: center;
}

.search-input {
  flex: 1;
  max-width: 300px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.session-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.session-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.session-card.status-processing {
  border-left: 4px solid #007bff;
}

.session-card.status-completed {
  border-left: 4px solid #28a745;
}

.session-card.status-failed {
  border-left: 4px solid #dc3545;
}

.session-card.status-unknown {
  border-left: 4px solid #6c757d;
}

.session-card.status-closed {
  border-left: 4px solid #6f42c1;
  opacity: 0.8;
}

.session-header h3 {
  margin: 0 0 5px 0;
  font-size: 1.2em;
}

.session-id {
  font-size: 0.9em;
  color: #666;
  font-family: monospace;
}

.session-details {
  margin: 15px 0;
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
}

.value {
  color: #333;
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

.status-badge.closed {
  background: #f3e5f5;
  color: #6f42c1;
}

.closed-info {
  color: #6f42c1;
  font-style: italic;
}

.closed-by {
  display: block;
  font-size: 0.9em;
  color: #999;
  margin-top: 2px;
}

.closure-reason {
  font-style: italic;
  color: #666;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  max-width: 100%;
  word-wrap: break-word;
}

.progress-bar {
  position: relative;
  width: 100px;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.7em;
  color: #333;
}

.session-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-primary, .btn-success, .btn-warning, .btn-danger, .btn-refresh {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-primary { background: #007bff; color: white; }
.btn-success { background: #28a745; color: white; }
.btn-warning { background: #ffc107; color: #333; }
.btn-danger { background: #dc3545; color: white; }
.btn-refresh { background: #6c757d; color: white; }
.btn-info { background: #17a2b8; color: white; }

.btn-primary:hover { background: #0056b3; }
.btn-success:hover { background: #1e7e34; }
.btn-warning:hover { background: #e0a800; }
.btn-danger:hover { background: #c82333; }
.btn-refresh:hover { background: #545b62; }
.btn-info:hover { background: #138496; }

.btn-primary:disabled, .btn-success:disabled, .btn-warning:disabled, .btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-sessions {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-sessions i {
  font-size: 2em;
  margin-bottom: 10px;
}
</style>
