import { config } from '@vue/test-utils'
import { createPinia } from 'pinia'
import '@testing-library/jest-dom'

// Global test setup
config.global.plugins = [createPinia()]

// Mock router
config.global.mocks = {
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  },
  $route: {
    path: '/',
    name: 'Home',
    params: {},
    query: {},
    meta: {}
  }
}

// Mock composables
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  })
}))

vi.mock('@/stores/notification', () => ({
  useNotificationStore: () => ({
    addSuccess: vi.fn(),
    addError: vi.fn(),
    addInfo: vi.fn(),
    addWarning: vi.fn()
  })
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})