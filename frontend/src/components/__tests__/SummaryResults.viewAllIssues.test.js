import { render, fireEvent, screen, waitFor } from '@testing-library/vue'
import { vi } from 'vitest'
import SummaryResults from '@/components/SummaryResults.vue'

// Mock API composable
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
    { employee_id: '123', employee_name: 'John Doe', issue_category: 'missing_receipts' }
  ]
})

vi.mock('@/composables/useApi.js', () => ({
  useApi: () => ({ getSummary: getSummaryMock, getExceptions: getExceptionsMock })
}))

// Stub SummaryCard to simulate expanding details and action click
const SummaryCardStub = {
  template: `
    <div>
      <button data-testid="expand" @click="$emit('expand-change', true)">expand</button>
      <button data-testid="view-all" @click="$emit('action-click', { key: 'view-issues' })">view-all</button>
      <slot name="details"></slot>
    </div>
  `
}

// Simple stub for the employee list used in details slot
const ExpandableEmployeeListStub = {
  props: ['employees', 'categoryName'],
  template: `<div>
    <div data-testid="category">{{ categoryName }}</div>
    <ul>
      <li v-for="e in employees" :key="e.employee_id">{{ e.employee_name }}</li>
    </ul>
  </div>`
}

describe('SummaryResults - View All Issues', () => {
  beforeEach(() => {
    getSummaryMock.mockClear()
    getExceptionsMock.mockClear()
  })

  it('loads exceptions when details expand', async () => {
    render(SummaryResults, {
      props: { sessionId: 'test-session' },
      global: {
        stubs: {
          SummaryCard: SummaryCardStub,
          ExpandableEmployeeList: ExpandableEmployeeListStub
        }
      }
    })

    await waitFor(() => expect(getSummaryMock).toHaveBeenCalledWith('test-session'))

    await fireEvent.click(screen.getByTestId('expand'))

    await waitFor(() => expect(getExceptionsMock).toHaveBeenCalledWith('test-session'))

    await screen.findByText('John Doe')
  })

  it('loads exceptions when "View All Issues" action is clicked', async () => {
    render(SummaryResults, {
      props: { sessionId: 'test-session' },
      global: {
        stubs: {
          SummaryCard: SummaryCardStub,
          ExpandableEmployeeList: ExpandableEmployeeListStub
        }
      }
    })

    await waitFor(() => expect(getSummaryMock).toHaveBeenCalled())

    await fireEvent.click(screen.getByTestId('view-all'))

    await waitFor(() => expect(getExceptionsMock).toHaveBeenCalledWith('test-session'))

    await screen.findByText('John Doe')
  })
})
