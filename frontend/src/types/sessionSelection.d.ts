/**
 * TypeScript Type Definitions for Session Selection
 */

declare module '@/stores/sessionSelection' {
  import { Store } from 'pinia'
  
  export interface SessionSelectionState {
    isManageMode: boolean
    selectedSessions: Set<string>
    lastSelectedIndex: number | null
    selectionAnchor: number | null
    filteredSessionIds: string[]
    currentPageSessionIds: string[]
    selectionStats: SelectionStats
    bulkOperation: BulkOperationState
    showConfirmationDrawer: boolean
    pendingAction: BulkActionType | null
  }
  
  export interface SelectionStats {
    total: number
    selected: number
    eligible: number
    ineligible: number
    pages: number
    currentPage: number
  }
  
  export type BulkActionType = 'delete' | 'export' | 'close' | 'archive'
  
  export interface BulkOperationState {
    type: BulkActionType | null
    inProgress: boolean
    results: BulkOperationResult | null
    error: Error | null
  }
  
  export interface BulkOperationResult {
    processed: string[]
    failed: FailedOperation[]
    totalProcessed: number
    totalFailed: number
    downloadUrl?: string
  }
  
  export interface FailedOperation {
    sessionId: string
    reason: string
    code?: string
  }
  
  export interface SessionData {
    session_id: string
    session_name: string
    status: SessionStatus
    created_at: string
    updated_at?: string
    has_results: boolean
    file_count?: number
    transaction_count?: number
    exception_count?: number
    locked_by?: string
    locked_by_name?: string
    active_exports?: number
    active_references?: number
  }
  
  export type SessionStatus = 
    | 'IDLE' 
    | 'PROCESSING' 
    | 'EXTRACTING' 
    | 'ANALYZING' 
    | 'UPLOADING' 
    | 'COMPLETED' 
    | 'FAILED' 
    | 'CLOSED' 
    | 'ARCHIVED'
  
  export interface SelectionRules {
    canSelectSession(session: SessionData): boolean
    canDeleteSession(session: SessionData): boolean
    canExportSession(session: SessionData): boolean
    canCloseSession(session: SessionData): boolean
    canArchiveSession(session: SessionData): boolean
    getIneligibleReason(session: SessionData, action: BulkActionType): string | null
  }
  
  export interface SessionSelectionGetters {
    selectedCount: number
    hasSelection: boolean
    canPerformBulkAction: boolean
    selectedIds: string[]
    isProcessingBulkAction: boolean
    selectionPercentage: number
    allEligibleSelected: boolean
  }
  
  export interface SessionSelectionActions {
    toggleManageMode(force?: boolean): void
    enterManageMode(): void
    exitManageMode(): void
    toggleSessionSelection(sessionId: string, index?: number | null): void
    addToSelection(sessionIds: string | string[]): void
    removeFromSelection(sessionIds: string | string[]): void
    selectRange(startIndex: number, endIndex: number, availableSessionIds: string[]): void
    selectAll(sessionIds: string[]): void
    selectAllInPage(pageSessionIds: string[]): void
    selectAllFiltered(): void
    clearSelection(): void
    deselectAll(): void
    setFilteredSessions(sessionsOrIds: SessionData[] | string[]): void
    setCurrentPageSessions(sessions: SessionData[]): void
    updateSelectionStats(sessions?: SessionData[] | null, action?: string, rules?: SelectionRules): void
    canSelectSession(session: SessionData): boolean
    setBulkOperationType(type: BulkActionType): void
    startBulkOperation(type: BulkActionType): void
    completeBulkOperation(results: BulkOperationResult): void
    failBulkOperation(error: Error): void
    resetBulkOperation(): void
    showConfirmation(actionType: BulkActionType): void
    hideConfirmation(): void
    isSessionSelected(sessionId: string): boolean
    getSelectedSessionsData(allSessions: SessionData[]): SessionData[]
    saveSelectionState(): void
    restoreSelectionState(): void
    setSelectionAnchor(index: number): void
    setLastSelectedIndex(index: number): void
    selectRangeByIndex(
      startIndex: number, 
      endIndex: number, 
      idResolver?: (index: number) => string
    ): void
  }
  
  export type SessionSelectionStore = Store<
    'sessionSelection',
    SessionSelectionState,
    SessionSelectionGetters,
    SessionSelectionActions
  >
  
  export const useSessionSelectionStore: () => SessionSelectionStore
}

declare module '@/utils/selectionRules' {
  import { SessionData, BulkActionType } from '@/stores/sessionSelection'
  
  export interface ValidationResult {
    eligible: Array<{
      sessionId: string
      sessionName: string
      status: string
    }>
    ineligible: Array<{
      sessionId: string
      sessionName: string
      status: string
      reason: string
    }>
    notFound: string[]
    totalEligible: number
    totalIneligible: number
    canProceed: boolean
  }
  
  export interface SelectionStatistics {
    total: number
    selected: number
    eligible: number
    ineligible: number
    percentSelected: number
    percentEligible: number
  }
  
  export interface GroupedSessions {
    eligible: SessionData[]
    blocked: SessionData[]
    wrongStatus: SessionData[]
    locked: SessionData[]
    other: SessionData[]
  }
  
  export const selectionRules: {
    canSelectSession(session: SessionData): boolean
    canDeleteSession(session: SessionData): boolean
    canExportSession(session: SessionData): boolean
    canCloseSession(session: SessionData): boolean
    canArchiveSession(session: SessionData): boolean
    getSelectionBlockedReason(session: SessionData): string | null
    getIneligibleReason(session: SessionData, action: BulkActionType): string | null
    validateBulkAction(sessions: SessionData[], action: BulkActionType): ValidationResult
    isWithinSelectionLimit(count: number): boolean
    getSelectionLimitWarning(count: number): string | null
    filterEligibleSessions(sessions: SessionData[], action: BulkActionType): SessionData[]
    groupSessionsByEligibility(sessions: SessionData[], action: BulkActionType): GroupedSessions
    calculateSelectionStats(
      allSessions: SessionData[], 
      selectedIds: Set<string>, 
      action?: BulkActionType
    ): SelectionStatistics
  }
  
  export const SelectionUtils: {
    createSelectionSummary(stats: SelectionStatistics, action: string): string
    createIneligibleWarning(ineligibleSessions: Array<{ reason: string }>): string
    sortSessionsForSelection(sessions: SessionData[]): SessionData[]
  }
  
  export default selectionRules
}

declare module '@/utils/selectionEventBus' {
  export interface SelectionEventData {
    selectedCount: number
    selectedIds: string[]
    stats?: any
    timestamp: number
  }
  
  export interface BulkActionEventData {
    action: string
    success?: boolean
    result?: any
    sessionIds?: string[]
    timestamp: number
  }
  
  export interface EventBusOptions {
    delay?: number
  }
  
  export class SelectionEventBus {
    on(event: string, handler: Function, options?: EventBusOptions): () => void
    once(event: string, handler: Function): () => void
    emit(event: string, data: any): void
    off(event: string, handlerId: string): void
    offOnce(event: string, handlerId: string): void
    offAll(event?: string): void
    clear(): void
    listenerCount(event: string): number
    hasListeners(event: string): boolean
    getHistory(event?: string): Array<{
      event: string
      data: any
      timestamp: number
    }>
  }
  
  export const SelectionEvents: {
    SELECTION_CHANGED: string
    SELECTION_CLEARED: string
    MANAGE_MODE_ENTERED: string
    MANAGE_MODE_EXITED: string
    BULK_ACTION_INITIATED: string
    BULK_ACTION_CONFIRMED: string
    BULK_ACTION_CANCELLED: string
    BULK_ACTION_COMPLETED: string
    BULK_ACTION_FAILED: string
    SELECT_ALL_REQUESTED: string
    SELECT_RANGE_REQUESTED: string
    CONFIRMATION_DRAWER_OPENED: string
    CONFIRMATION_DRAWER_CLOSED: string
    SELECTION_VALIDATED: string
    SELECTION_INVALID: string
    FILTER_CHANGED: string
    PAGE_CHANGED: string
  }
  
  export const SelectionEventHelpers: {
    emitSelectionChanged(selectedSessions: Set<string>, stats: any): void
    emitBulkActionResult(action: string, success: boolean, result: any): void
    onSelectionChanged(handler: (data: SelectionEventData) => void): () => void
    onModeChange(
      enterHandler: () => void, 
      exitHandler: () => void
    ): {
      unsubscribeEnter: () => void
      unsubscribeExit: () => void
    }
  }
  
  const selectionEventBus: SelectionEventBus
  export default selectionEventBus
}

declare module '@/utils/selectionErrorHandler' {
  export interface ErrorContext {
    type: 'BULK_DELETE' | 'SELECTION_UPDATE' | 'STATS_CALCULATION' | 'API_CALL'
    data: any
  }
  
  export interface ErrorEntry {
    id: string
    error: Error
    context: ErrorContext
    timestamp: number
    retryCount: number
    retryable: boolean
    lastRetryAt?: number
    lastError?: Error
  }
  
  export interface ErrorResult {
    success: boolean
    result?: any
    error?: string
    details?: ErrorEntry
    userMessage?: string
    circuitBreakerOpen?: boolean
    retryAfter?: number
    recovered?: boolean
    strategy?: string
  }
  
  export class SelectionErrorHandler {
    handleError(error: Error, context: ErrorContext, retryable?: boolean): Promise<ErrorResult>
    onError(event: string, callback: (entry: ErrorEntry) => void): () => void
    getErrorStats(): {
      queueLength: number
      circuitBreakerState: string
      failures: number
      recentErrors: Array<{
        id: string
        type: string
        retries: number
        timestamp: number
      }>
    }
    reset(): void
  }
  
  const errorHandler: SelectionErrorHandler
  export default errorHandler
}