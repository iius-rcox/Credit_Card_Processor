import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Global test configuration
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
  
  // Create fresh Pinia instance for each test
  const pinia = createPinia()
  setActivePinia(pinia)
})

// Mock global objects
global.fetch = vi.fn()

// Mock window.URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock file API
global.File = class MockFile {
  constructor(chunks, filename, options = {}) {
    this.name = filename
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    this.type = options.type || 'application/pdf'
    this.lastModified = Date.now()
  }
}

global.FileReader = class MockFileReader {
  constructor() {
    this.result = null
    this.onload = null
    this.onerror = null
    this.readyState = 0
  }

  readAsArrayBuffer() {
    setTimeout(() => {
      this.readyState = 2
      this.result = new ArrayBuffer(8)
      if (this.onload) this.onload()
    }, 0)
  }
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))

// Setup global Vue Test Utils configuration
config.global.stubs = {
  teleport: true,
  transition: false,
  'transition-group': false,
}

// Console warnings configuration for tests
const originalWarn = console.warn
console.warn = (...args) => {
  // Suppress specific Vue warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Vue received a Component') ||
      args[0].includes('[Vue warn]'))
  ) {
    return
  }
  originalWarn(...args)
}
