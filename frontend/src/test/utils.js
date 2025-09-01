import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'

/**
 * Create a fresh Pinia instance for testing
 */
export function createTestPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/**
 * Create a mock file for testing
 */
export function createMockFile(
  name = 'test.pdf',
  size = 1024,
  type = 'application/pdf'
) {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/**
 * Create mock API responses
 */
export const mockApiResponses = {
  createSession: () => ({
    session_id: 'test-session-123',
    status: 'created',
    created_at: new Date().toISOString(),
  }),

  uploadFile: (fileType = 'car') => ({
    file_id: `${fileType}-file-456`,
    filename: `test-${fileType}.pdf`,
    size: 1024,
    status: 'uploaded',
  }),

  startProcessing: () => ({
    session_id: 'test-session-123',
    status: 'processing',
    message: 'Processing started',
  }),

  getProgress: (progress = 0.5) => ({
    session_id: 'test-session-123',
    status: 'processing',
    progress,
    stage: 'document_analysis',
    employees_processed: Math.floor(progress * 100),
    total_employees: 100,
    current_activity: 'Analyzing documents...',
  }),

  getResults: () => ({
    session_id: 'test-session-123',
    status: 'completed',
    results: {
      summary: {
        total_employees: 10,
        resolved_employees: 8,
        pending_resolution: 2,
        total_amount: 15000.5,
        average_amount: 1500.05,
      },
      employees: [
        {
          id: 1,
          name: 'John Doe',
          employee_id: 'EMP001',
          status: 'resolved',
          amount: 1200.0,
          issues: [],
        },
        {
          id: 2,
          name: 'Jane Smith',
          employee_id: 'EMP002',
          status: 'needs_resolution',
          amount: 850.75,
          issues: ['missing_receipt', 'amount_mismatch'],
        },
      ],
    },
  }),

  exportData: (type = 'pvault') => ({
    export_id: `export-${type}-789`,
    type,
    status: 'processing',
    created_at: new Date().toISOString(),
  }),

  getExportStatus: (status = 'completed') => ({
    export_id: 'export-pvault-789',
    type: 'pvault',
    status,
    progress: status === 'completed' ? 1.0 : 0.5,
    download_url:
      status === 'completed' ? '/api/exports/export-pvault-789/download' : null,
  }),
}

/**
 * Create a proper Response mock object with full Headers API
 */
export function createMockResponse(data, status = 200, headers = {}) {
  const defaultHeaders = new Map([
    ['content-type', 'application/json'],
    ['x-request-id', `mock-${Date.now()}`],
    ...Object.entries(headers)
  ])

  // Create a proper Headers-like object
  const mockHeaders = {
    get: (name) => defaultHeaders.get(name.toLowerCase()) || null,
    has: (name) => defaultHeaders.has(name.toLowerCase()),
    entries: () => defaultHeaders.entries(),
    forEach: (callback) => defaultHeaders.forEach((value, key) => callback(value, key)),
    keys: () => defaultHeaders.keys(),
    values: () => defaultHeaders.values(),
    append: (name, value) => defaultHeaders.set(name.toLowerCase(), value),
    set: (name, value) => defaultHeaders.set(name.toLowerCase(), value),
    delete: (name) => defaultHeaders.delete(name.toLowerCase()),
    [Symbol.iterator]: () => defaultHeaders.entries()
  }

  return {
    ok: status < 400,
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    headers: mockHeaders,
    url: 'http://localhost:8000/api/mock',
    redirected: false,
    type: 'basic',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: () => createMockResponse(data, status, headers),
    body: null,
    bodyUsed: false
  }
}

/**
 * Enhanced fetch mock with proper Response object simulation
 */
export function setupFetchMock() {
  const fetchMock = vi.fn()

  fetchMock.mockImplementation((url, options) => {
    const method = options?.method || 'GET'

    // Default successful response
    let responseData = { success: true }
    let status = 200
    let headers = {}

    // Route-specific responses with better matching
    if (url.includes('/api/auth/current-user')) {
      responseData = {
        username: 'testuser',
        is_admin: false,
        display_name: 'Test User',
        roles: ['user'],
        permissions: ['read']
      }
    } else if (url.includes('/api/sessions') && method === 'POST') {
      responseData = mockApiResponses.createSession()
    } else if (url.includes('/api/sessions/') && url.includes('/upload') && method === 'POST') {
      const fileType = url.includes('car') ? 'car' : 'receipt'
      responseData = {
        uploaded_files: [{
          checksum: 'abc123',
          upload_status: 'completed',
          server_filename: `test-${fileType}.pdf`,
          processing_status: 'pending'
        }]
      }
    } else if (url.includes('/api/sessions/') && url.includes('/process') && method === 'POST') {
      responseData = mockApiResponses.startProcessing()
    } else if (url.includes('/api/sessions/') && url.includes('/status') && method === 'GET') {
      responseData = {
        session_id: 'test-session-123',
        status: 'processing',
        percent_complete: 50,
        total_employees: 45,
        completed_employees: 22,
        processing_employees: 1,
        issues_employees: 0,
        pending_employees: 22,
        recent_activities: ['Processing employee 22']
      }
    } else if (url.includes('/api/sessions/') && url.includes('/results') && method === 'GET') {
      responseData = mockApiResponses.getResults()
    } else if (url.includes('/api/export/') && method === 'GET') {
      // Handle export endpoints
      headers['content-disposition'] = 'attachment; filename="export.csv"'
      headers['content-type'] = 'text/csv'
      responseData = 'CSV data here'
    }

    return Promise.resolve(createMockResponse(responseData, status, headers))
  })

  global.fetch = fetchMock
  return fetchMock
}

/**
 * Create wrapper with common providers
 */
export function createWrapper(component, options = {}) {
  const pinia = createTestPinia()

  return mount(component, {
    global: {
      plugins: [pinia],
      ...options.global,
    },
    ...options,
  })
}

/**
 * Wait for Vue's next tick and any pending promises
 */
export async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => process.nextTick(resolve))
}

/**
 * Simulate drag and drop events
 */
export function simulateDragDrop(wrapper, files) {
  const dropEvent = new Event('drop')
  dropEvent.dataTransfer = {
    files,
    types: ['Files'],
  }

  wrapper.element.dispatchEvent(dropEvent)
}

/**
 * Enhanced XMLHttpRequest mock for file uploads
 */
export function createMockXMLHttpRequest() {
  return class MockXMLHttpRequest {
    constructor() {
      this.upload = { addEventListener: vi.fn() }
      this.addEventListener = vi.fn()
      this.open = vi.fn()
      this.setRequestHeader = vi.fn()
      this.send = vi.fn()
      this.abort = vi.fn()
      this.status = 200
      this.statusText = 'OK'
      this.responseText = JSON.stringify({
        uploaded_files: [{
          checksum: 'abc123',
          upload_status: 'completed',
          server_filename: 'test.pdf'
        }]
      })
      
      // Simulate async upload completion
      this.simulateSuccess = () => {
        setTimeout(() => {
          // Trigger progress event
          const progressCallback = this.upload.addEventListener.mock.calls
            .find(call => call[0] === 'progress')?.[1]
          if (progressCallback) {
            progressCallback({ lengthComputable: true, loaded: 1024, total: 1024 })
          }
          
          // Trigger load event
          const loadCallback = this.addEventListener.mock.calls
            .find(call => call[0] === 'load')?.[1]
          if (loadCallback) {
            loadCallback()
          }
        }, 10)
      }
    }
  }
}

/**
 * Enhanced timer mocking for polling tests with async support
 */
export function mockTimers() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  
  return {
    advanceTime: async (ms) => {
      vi.advanceTimersByTime(ms)
      // Allow micro tasks to flush
      await new Promise(resolve => setImmediate(resolve))
      await flushPromises()
    },
    runAllTimers: async () => {
      await vi.runAllTimersAsync()
      await flushPromises()
    },
    runOnlyPendingTimers: async () => {
      await vi.runOnlyPendingTimersAsync()
      await flushPromises()
    },
    clearAll: () => {
      vi.clearAllTimers()
    },
    restore: () => {
      vi.useRealTimers()
    },
    getTimerCount: () => vi.getTimerCount()
  }
}

/**
 * Wait for async operations with timeout
 */
export async function waitFor(conditionFn, timeout = 1000, interval = 50) {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error(`Condition not met within ${timeout}ms timeout`)
}
