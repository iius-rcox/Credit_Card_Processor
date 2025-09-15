import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, setupFetchMock, createMockResponse } from '../../test/utils.js'
import App from '../../App.vue'
import router from '../../router/index.js'
import { mount } from '@vue/test-utils'

describe('Results Route Integration', () => {
  let pinia
  let fetchMock
  let wrapper

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    fetchMock = setupFetchMock()

    // Mock the results endpoint
    const sessionId = 'test-session-123'
    const resultsUrl = `/api/sessions/${sessionId}/results`

    const now = new Date().toISOString()
    fetchMock.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes(resultsUrl)) {
        return createMockResponse({
          session_id: sessionId,
          session_name: 'Test Session',
          status: 'COMPLETED',
          created_by: 'tester',
          created_at: now,
          updated_at: now,
          session_summary: {
            total_employees: 1,
            ready_for_export: 1,
            needs_attention: 0,
            resolved_issues: 0,
            validation_success_rate: 100,
            is_delta_session: false,
            delta_base_session_name: null,
            new_employees: 0,
            modified_employees: 0,
            removed_employees: 0
          },
          employees: [
            {
              revision_id: 'rev1',
              employee_id: 'EMP1',
              employee_name: 'John Doe',
              car_amount: 100,
              receipt_amount: 100,
              validation_status: 'VALID',
              validation_flags: {},
              resolved_by: null,
              resolution_notes: null,
              created_at: now,
              updated_at: now
            }
          ]
        })
      }
      return createMockResponse({ success: true })
    })

    // Navigate to results route before mounting
    await router.push({ name: 'SessionResults', params: { id: sessionId } })
    await router.isReady()

    wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('navigates to results route and loads results', async () => {
    await flushPromises()

    // Assert API was called for results
    expect(fetchMock).toHaveBeenCalled()
    const calledWithResults = fetchMock.mock.calls.some(call =>
      String(call[0]).includes('/api/sessions/test-session-123/results')
    )
    expect(calledWithResults).toBe(true)

    // Basic UI assertion from ResultsDisplay within App layout
    expect(wrapper.text()).toContain('Processing Results')
    expect(wrapper.text()).toContain('John Doe')
  })
})

