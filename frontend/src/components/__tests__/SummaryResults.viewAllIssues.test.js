import { render, fireEvent, screen, waitFor } from '@testing-library/vue'
import { vi } from 'vitest'
import SummaryResults from '@/components/SummaryResults.vue'

// Mock API
const getSummaryMock = vi.fn().mockResolvedValue({
  processing_completed: true,
  total_employees: 10,
  ready_for_pvault: 3,
  need_attention: 7,
  issues_breakdown: { missing_receipts: 5, coding_incomplete: 1, data_mismatches: 1 },
  session_name: 'Session Test'
})
const getExceptionsMock = vi.fn().mockResolvedValue({
  employees: [
    { revision_id: 'r1', employee_id: '123', employee_name: 'John Doe', issue_category: 'missing_receipts', car_amount: 100, receipt_amount: null, validation_status: 'needs_attention' }
  ]
})

vi.mock('@/composables/useApi.js', () => ({
  useApi: () => ({
    getSummary: getSummaryMock,
    getExceptions: getExceptionsMock
  })
}))

// Stub ExceptionsTable to render rows plainly
const ExceptionsTableStub = {
  props: ['employees'],
  template: `<div>
    <table>
      <tbody>
        <tr v-for="e in employees" :key="e.revision_id">
          <td>{{ e.employee_name }} ({{ e.employee_id }})</td>
        </tr>
      </tbody>
    </table>
  </div>`
}

describe('SummaryResults - View All Issues (table)', () => {
  beforeEach(() => {
    getSummaryMock.mockClear()
    getExceptionsMock.mockClear()
  })

  it('loads exceptions when details expand and shows table rows', async () => {
    const { container } = render(SummaryResults, {
      props: { sessionId: 'test-session' },
      global: {
        stubs: {
          ExceptionsTable: ExceptionsTableStub,
          SummaryCard: {
            props: ['title', 'subtitle', 'primaryMetrics', 'detailMetrics', 'statusMessage', 'statusType', 'actionButtons', 'expandable', 'defaultExpanded'],
            emits: ['metric-click', 'action-click', 'expand-change'],
            template: `<div>
              <h2>{{ title }}</h2>
              <p>{{ subtitle }}</p>
              <button @click="$emit('action-click', { key: 'view-issues' })">View All Issues</button>
              <div class="details-section">
                <slot name="details" />
              </div>
            </div>`
          }
        }
      }
    })

    await waitFor(() => expect(getSummaryMock).toHaveBeenCalledWith('test-session'))

    // Click the View All Issues button to trigger expand and load exceptions
    const viewIssuesButton = screen.getByText('View All Issues')
    await fireEvent.click(viewIssuesButton)

    // Wait for exceptions to load
    await waitFor(() => expect(getExceptionsMock).toHaveBeenCalledWith('test-session'))

    // After exceptions fetched, ensure a row appears
    await screen.findByText('John Doe (123)')
  })

  it('loads exceptions when "View All Issues" action is clicked', async () => {
    const { container } = render(SummaryResults, {
      props: { sessionId: 'test-session' },
      global: {
        stubs: {
          ExceptionsTable: ExceptionsTableStub,
          SummaryCard: {
            props: ['title', 'subtitle', 'primaryMetrics', 'detailMetrics', 'statusMessage', 'statusType', 'actionButtons', 'expandable', 'defaultExpanded'],
            emits: ['metric-click', 'action-click', 'expand-change'],
            template: `<div>
              <h2>{{ title }}</h2>
              <p>{{ subtitle }}</p>
              <button @click="$emit('action-click', { key: 'view-issues' })">View All Issues</button>
              <div class="details-section">
                <slot name="details" />
              </div>
            </div>`
          }
        }
      }
    })

    await waitFor(() => expect(getSummaryMock).toHaveBeenCalled())

    // Click the View All Issues button to trigger action
    const viewIssuesButton = screen.getByText('View All Issues')
    await fireEvent.click(viewIssuesButton)

    // Wait for exceptions to load and appear
    await waitFor(() => expect(getExceptionsMock).toHaveBeenCalledWith('test-session'))
    await screen.findByText('John Doe (123)')
  })
})
