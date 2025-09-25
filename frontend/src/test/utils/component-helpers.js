import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { vi } from 'vitest'

export const createWrapper = (component, options = {}) => {
  return mount(component, {
    global: {
      stubs: ['router-link', 'router-view'],
      plugins: [createPinia()],
      mocks: {
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
    },
    ...options
  })
}

export const createMockSession = (overrides = {}) => ({
  session_id: 'test-session-123',
  session_name: 'Test Session',
  status: 'COMPLETED',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_closed: false,
  has_results: true,
  ...overrides
})

export const createMockSessions = (count = 5) => {
  return Array.from({ length: count }, (_, index) => 
    createMockSession({
      session_id: `test-session-${index + 1}`,
      session_name: `Test Session ${index + 1}`,
      status: index % 2 === 0 ? 'COMPLETED' : 'FAILED'
    })
  )
}

export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const mockApiResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK'
})

export const mockApiError = (message = 'API Error', status = 500) => {
  const error = new Error(message)
  error.response = {
    data: { detail: message },
    status,
    statusText: 'Internal Server Error'
  }
  return error
}








