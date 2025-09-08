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
 * Enhanced fetch mock that can be easily overridden by tests
 * This creates a basic mock but allows tests to override specific calls
 */
export function setupFetchMock() {
  // Replace global fetch with a more flexible mock
  global.fetch = vi.fn()
  
  // Return the mock function so tests can configure it
  const fetchMock = global.fetch

  // Set up default implementation but allow easy overriding
  fetchMock.mockImplementation((url, options) => {
    const method = options?.method || 'GET'
    
    // Default responses - these can be overridden by individual tests
    if (url.includes('/api/auth/current-user')) {
      return Promise.resolve(createMockResponse({
        username: 'testuser',
        is_admin: false,
        display_name: 'Test User',
        roles: ['user'],
        permissions: ['read']
      }))
    }
    
    // Default success response for unknown routes
    return Promise.resolve(createMockResponse({ success: true }))
  })
  
  return fetchMock
}

/**
 * Mock timers utility
 */
export function mockTimers() {
  vi.useFakeTimers()
  
  return {
    advance: (ms) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    restore: () => vi.useRealTimers(),
  }
}

/**
 * Flush all promises
 */
export async function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve))
}

/**
 * Create a mock WebSocket for testing
 */
export class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    this.onopen = null
    this.onclose = null
    this.onmessage = null
    this.onerror = null
    
    // Simulate connection opening
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 0)
  }

  send(data) {
    // Mock sending data
    console.log('MockWebSocket send:', data)
  }

  close() {
    this.readyState = 3 // CLOSED
    if (this.onclose) {
      this.onclose()
    }
  }

  // Simulate receiving a message
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) })
    }
  }

  // Simulate an error
  simulateError(error) {
    if (this.onerror) {
      this.onerror(error)
    }
  }
}

/**
 * Setup WebSocket mock
 */
export function setupWebSocketMock() {
  global.WebSocket = MockWebSocket
  return MockWebSocket
}

/**
 * Create a test wrapper component with proper providers
 */
export function createTestWrapper(Component, options = {}) {
  const pinia = createTestPinia()
  
  return mount(Component, {
    global: {
      plugins: [pinia],
      stubs: {
        'router-link': {
          template: '<a><slot /></a>',
        },
        'router-view': {
          template: '<div><slot /></div>',
        },
      },
    },
    ...options,
  })
}

/**
 * Wait for condition helper for async testing
 */
export function waitFor(conditionFn, timeout = 5000, interval = 50) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const check = () => {
      if (conditionFn()) {
        resolve()
        return
      }
      
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Condition not met within ${timeout}ms`))
        return
      }
      
      setTimeout(check, interval)
    }
    
    check()
  })
}

/**
 * Mock environment variables for testing
 */
export function mockEnvVars(vars = {}) {
  const originalEnv = { ...import.meta.env }
  
  Object.keys(vars).forEach(key => {
    import.meta.env[key] = vars[key]
  })
  
  return () => {
    // Restore original environment
    Object.keys(originalEnv).forEach(key => {
      import.meta.env[key] = originalEnv[key]
    })
  }
}

/**
 * Create mock for API responses with better error handling
 */
export function createApiMock(responses = {}) {
  const mock = vi.fn()
  
  mock.mockImplementation(async (url, options = {}) => {
    // Check if there's a specific response for this URL+method combo
    const method = options.method || 'GET'
    const key = `${method}:${url}`
    
    if (responses[key]) {
      const response = responses[key]
      if (typeof response === 'function') {
        return response(url, options)
      }
      return response
    }
    
    // Check for URL pattern matches
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        if (typeof response === 'function') {
          return response(url, options)
        }
        return response
      }
    }
    
    // Default success response
    return createMockResponse({ success: true })
  })
  
  return mock
}

/**
 * Create a more realistic file upload mock
 */
export function createMockFileUpload(filename = 'test.pdf', size = 1024, content = 'mock content') {
  const file = new File([content], filename, { 
    type: 'application/pdf',
    lastModified: Date.now()
  })
  
  // Mock additional file properties
  Object.defineProperty(file, 'size', { value: size })
  Object.defineProperty(file, 'path', { value: filename })
  
  return file
}