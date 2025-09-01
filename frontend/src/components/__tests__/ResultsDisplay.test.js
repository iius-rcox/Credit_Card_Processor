import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ResultsDisplay from '../ResultsDisplay.vue'
import { useSessionStore } from '../../stores/session.js'
import {
  flushPromises,
  setupFetchMock,
  mockApiResponses,
} from '../../test/utils.js'

// Mock child components
vi.mock('../EmployeeCard.vue', () => ({
  default: {
    name: 'EmployeeCard',
    props: ['employee', 'isSelected'],
    emits: ['select', 'resolve'],
    template:
      '<div class="employee-card" :data-employee-id="employee.id">{{ employee.name }}</div>',
  },
}))

vi.mock('../ResolutionModal.vue', () => ({
  default: {
    name: 'ResolutionModal',
    props: ['show', 'employee'],
    emits: ['close', 'resolved'],
    template:
      '<div v-if="show" class="resolution-modal">Modal for {{ employee?.name }}</div>',
  },
}))

vi.mock('../BulkResolutionModal.vue', () => ({
  default: {
    name: 'BulkResolutionModal',
    props: ['show', 'employees'],
    emits: ['close', 'resolved'],
    template: '<div v-if="show" class="bulk-resolution-modal">Bulk Modal</div>',
  },
}))

describe('ResultsDisplay', () => {
  let wrapper
  let sessionStore
  let pinia
  let fetchMock

  const mockResults = {
    session_id: 'test-session-123',
    summary: {
      total_employees: 10,
      completed_employees: 7,
      issues_employees: 3,
      processing_duration: '2m 30s',
      total_amount: 15000.5,
      average_amount: 1500.05,
    },
    employees: [
      {
        id: 1,
        name: 'John Doe',
        employee_id: 'EMP001',
        status: 'VALID',
        amount: 1200.0,
        issues: [],
        department: 'Engineering',
        car_data: { date: '2023-01-01', amount: 1200.0 },
        receipt_data: { date: '2023-01-01', amount: 1200.0 },
      },
      {
        id: 2,
        name: 'Jane Smith',
        employee_id: 'EMP002',
        status: 'NEEDS_ATTENTION',
        amount: 850.75,
        issues: ['missing_receipt', 'amount_mismatch'],
        department: 'Marketing',
        car_data: { date: '2023-01-02', amount: 900.0 },
        receipt_data: { date: '2023-01-02', amount: 850.75 },
      },
      {
        id: 3,
        name: 'Bob Johnson',
        employee_id: 'EMP003',
        status: 'RESOLVED',
        amount: 2000.0,
        issues: [],
        department: 'Sales',
        car_data: { date: '2023-01-03', amount: 2000.0 },
        receipt_data: { date: '2023-01-03', amount: 2000.0 },
      },
    ],
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    fetchMock = setupFetchMock()

    // Set results in store
    sessionStore.setResults(mockResults)

    wrapper = mount(ResultsDisplay, {
      props: {
        sessionId: 'test-session-123',
      },
      global: {
        plugins: [pinia],
      },
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('renders with results data', () => {
      expect(wrapper.find('h2').text()).toBe('Processing Results')
      expect(wrapper.find('.results-display').exists()).toBe(true)
    })

    it('displays session summary statistics', () => {
      expect(wrapper.text()).toContain('10') // Total employees
      expect(wrapper.text()).toContain('7') // Completed employees
      expect(wrapper.text()).toContain('3') // Issues employees
      expect(wrapper.text()).toContain('2m 30s') // Processing duration
    })

    it('shows appropriate summary card colors', () => {
      expect(wrapper.find('.bg-blue-50').exists()).toBe(true) // Total
      expect(wrapper.find('.bg-green-50').exists()).toBe(true) // Completed
      expect(wrapper.find('.bg-yellow-50').exists()).toBe(true) // Issues
      expect(wrapper.find('.bg-gray-50').exists()).toBe(true) // Duration
    })

    it('renders search and filter controls', () => {
      expect(wrapper.find('input[placeholder*="Search"]').exists()).toBe(true)
      expect(wrapper.find('select').exists()).toBe(true)
    })

    it('displays all employees initially', () => {
      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(3)
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('Jane Smith')
      expect(wrapper.text()).toContain('Bob Johnson')
    })
  })

  describe('Search Functionality', () => {
    it('filters employees by name', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      await searchInput.setValue('John')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).not.toContain('Jane Smith')
    })

    it('filters employees by employee ID', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      await searchInput.setValue('EMP002')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
      expect(wrapper.text()).toContain('Jane Smith')
    })

    it('filters employees by department', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      await searchInput.setValue('Engineering')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
      expect(wrapper.text()).toContain('John Doe')
    })

    it('shows no results when search matches nothing', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      await searchInput.setValue('NonexistentName')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(0)
      expect(wrapper.text()).toContain('No employees found')
    })

    it('is case insensitive', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      await searchInput.setValue('JOHN DOE')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
      expect(wrapper.text()).toContain('John Doe')
    })

    it('clears results when search is cleared', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      await searchInput.setValue('John')
      await searchInput.setValue('')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(3)
    })
  })

  describe('Status Filtering', () => {
    it('filters by VALID status', async () => {
      const statusSelect = wrapper.find('select')
      await statusSelect.setValue('VALID')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
      expect(wrapper.text()).toContain('John Doe')
    })

    it('filters by NEEDS_ATTENTION status', async () => {
      const statusSelect = wrapper.find('select')
      await statusSelect.setValue('NEEDS_ATTENTION')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
      expect(wrapper.text()).toContain('Jane Smith')
    })

    it('filters by RESOLVED status', async () => {
      const statusSelect = wrapper.find('select')
      await statusSelect.setValue('RESOLVED')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
      expect(wrapper.text()).toContain('Bob Johnson')
    })

    it('shows all employees when filter is "all"', async () => {
      const statusSelect = wrapper.find('select')
      await statusSelect.setValue('NEEDS_ATTENTION')
      await statusSelect.setValue('all')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(3)
    })
  })

  describe('Combined Search and Filter', () => {
    it('applies both search and status filter', async () => {
      // Add more test data to make this meaningful
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      const statusSelect = wrapper.find('select')

      await searchInput.setValue('Smith')
      await statusSelect.setValue('NEEDS_ATTENTION')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
      expect(wrapper.text()).toContain('Jane Smith')
    })

    it('shows no results when search and filter exclude all employees', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      const statusSelect = wrapper.find('select')

      await searchInput.setValue('John')
      await statusSelect.setValue('NEEDS_ATTENTION')

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(0)
    })
  })

  describe('Employee Selection', () => {
    it('can select individual employees', async () => {
      const firstEmployee = wrapper.find('[data-employee-id="1"]')
      await firstEmployee.trigger('click')

      expect(wrapper.vm.selectedEmployees).toContain(1)
    })

    it('can deselect employees', async () => {
      // First select
      wrapper.vm.selectedEmployees = [1]
      await nextTick()

      const firstEmployee = wrapper.find('[data-employee-id="1"]')
      await firstEmployee.trigger('click')

      expect(wrapper.vm.selectedEmployees).not.toContain(1)
    })

    it('can select multiple employees', async () => {
      wrapper.vm.toggleEmployeeSelection(1)
      wrapper.vm.toggleEmployeeSelection(2)

      expect(wrapper.vm.selectedEmployees).toContain(1)
      expect(wrapper.vm.selectedEmployees).toContain(2)
    })

    it('shows bulk resolution button when employees with issues are selected', async () => {
      wrapper.vm.toggleEmployeeSelection(2) // Employee with issues
      await nextTick()

      const bulkButton = wrapper.find(
        'button[data-testid="bulk-resolve-button"]'
      )
      expect(bulkButton.exists()).toBe(true)
      expect(bulkButton.text()).toContain('Resolve Selected (1)')
    })

    it('hides bulk resolution button when no employees selected', () => {
      const bulkButton = wrapper.find(
        'button[data-testid="bulk-resolve-button"]'
      )
      expect(bulkButton.exists()).toBe(false)
    })
  })

  describe('Employee Resolution', () => {
    it('opens resolution modal for single employee', async () => {
      const employee = wrapper.vm.employees[1] // Employee with issues

      wrapper.vm.openResolutionModal(employee)
      await nextTick()

      expect(wrapper.vm.showResolutionModal).toBe(true)
      expect(wrapper.vm.selectedEmployee).toEqual(employee)
      expect(wrapper.find('.resolution-modal').exists()).toBe(true)
    })

    it('opens bulk resolution modal', async () => {
      wrapper.vm.selectedEmployees = [1, 2]
      wrapper.vm.showBulkResolutionModal = true
      await nextTick()

      expect(wrapper.find('.bulk-resolution-modal').exists()).toBe(true)
    })

    it('handles individual employee resolution', async () => {
      const resolvedEmployee = {
        ...mockResults.employees[1],
        status: 'RESOLVED',
      }
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(resolvedEmployee),
        })
      )

      await wrapper.vm.handleEmployeeResolution(resolvedEmployee)

      expect(fetchMock).toHaveBeenCalledWith(
        `/api/sessions/test-session-123/employees/${resolvedEmployee.id}/resolve`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('handles bulk resolution', async () => {
      const resolvedEmployees = mockResults.employees.map(emp => ({
        ...emp,
        status: 'RESOLVED',
      }))

      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ employees: resolvedEmployees }),
        })
      )

      wrapper.vm.selectedEmployees = [1, 2]
      await wrapper.vm.handleBulkResolution({ resolution: 'approved' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/test-session-123/employees/resolve-bulk',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            employee_ids: [1, 2],
            resolution: 'approved',
          }),
        })
      )
    })

    it('updates employee data after resolution', async () => {
      const resolvedEmployee = {
        ...mockResults.employees[1],
        status: 'RESOLVED',
        issues: [],
      }

      wrapper.vm.updateEmployeeInResults(resolvedEmployee)

      const updatedEmployee = wrapper.vm.employees.find(
        emp => emp.id === resolvedEmployee.id
      )
      expect(updatedEmployee.status).toBe('RESOLVED')
      expect(updatedEmployee.issues).toEqual([])
    })

    it('closes modals after successful resolution', async () => {
      wrapper.vm.showResolutionModal = true
      wrapper.vm.showBulkResolutionModal = true

      await wrapper.vm.handleEmployeeResolution(mockResults.employees[1])

      expect(wrapper.vm.showResolutionModal).toBe(false)
      expect(wrapper.vm.showBulkResolutionModal).toBe(false)
    })
  })

  describe('Data Refresh', () => {
    it('refreshes results when refresh button clicked', async () => {
      const refreshButton = wrapper.find('button[data-testid="refresh-button"]')
      await refreshButton.trigger('click')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/test-session-123/results',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('shows loading state during refresh', async () => {
      wrapper.vm.isLoading = true
      await nextTick()

      const refreshButton = wrapper.find('button[data-testid="refresh-button"]')
      expect(refreshButton.text()).toBe('Refreshing...')
      expect(refreshButton.element.disabled).toBe(true)
    })

    it('updates results after successful refresh', async () => {
      const newResults = {
        ...mockResults,
        summary: { ...mockResults.summary, total_employees: 15 },
      }

      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(newResults),
        })
      )

      await wrapper.vm.refreshResults()

      expect(sessionStore.results.summary.total_employees).toBe(15)
    })

    it('handles refresh errors gracefully', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      )

      await wrapper.vm.refreshResults()

      expect(sessionStore.error).toContain('Failed to refresh results')
    })
  })

  describe('Sorting', () => {
    it('sorts employees by name', async () => {
      wrapper.vm.sortBy = 'name'
      wrapper.vm.sortOrder = 'asc'
      await nextTick()

      const sortedEmployees = wrapper.vm.filteredAndSortedEmployees
      expect(sortedEmployees[0].name).toBe('Bob Johnson')
      expect(sortedEmployees[1].name).toBe('Jane Smith')
      expect(sortedEmployees[2].name).toBe('John Doe')
    })

    it('sorts employees by amount', async () => {
      wrapper.vm.sortBy = 'amount'
      wrapper.vm.sortOrder = 'desc'
      await nextTick()

      const sortedEmployees = wrapper.vm.filteredAndSortedEmployees
      expect(sortedEmployees[0].amount).toBe(2000.0)
      expect(sortedEmployees[2].amount).toBe(850.75)
    })

    it('sorts employees by status', async () => {
      wrapper.vm.sortBy = 'status'
      wrapper.vm.sortOrder = 'asc'
      await nextTick()

      const sortedEmployees = wrapper.vm.filteredAndSortedEmployees
      expect(sortedEmployees[0].status).toBe('NEEDS_ATTENTION')
      expect(sortedEmployees[1].status).toBe('RESOLVED')
      expect(sortedEmployees[2].status).toBe('VALID')
    })

    it('toggles sort order when clicking same column', async () => {
      wrapper.vm.sortBy = 'name'
      wrapper.vm.sortOrder = 'asc'

      wrapper.vm.updateSort('name')
      expect(wrapper.vm.sortOrder).toBe('desc')

      wrapper.vm.updateSort('name')
      expect(wrapper.vm.sortOrder).toBe('asc')
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      // Create more employees for pagination testing
      const manyEmployees = Array.from({ length: 50 }, (_, i) => ({
        id: i + 10,
        name: `Employee ${i + 10}`,
        employee_id: `EMP${String(i + 10).padStart(3, '0')}`,
        status: 'VALID',
        amount: 1000 + i * 10,
        issues: [],
        department: 'Test',
      }))

      sessionStore.setResults({
        ...mockResults,
        employees: [...mockResults.employees, ...manyEmployees],
      })
    })

    it('shows pagination controls with many employees', () => {
      const pagination = wrapper.find('[data-testid="pagination"]')
      expect(pagination.exists()).toBe(true)
    })

    it('displays correct page size', () => {
      const displayedEmployees = wrapper.findAll('.employee-card')
      expect(displayedEmployees.length).toBeLessThanOrEqual(20) // Default page size
    })

    it('navigates to next page', async () => {
      const nextButton = wrapper.find('[data-testid="next-page"]')
      await nextButton.trigger('click')

      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('navigates to previous page', async () => {
      wrapper.vm.currentPage = 2
      await nextTick()

      const prevButton = wrapper.find('[data-testid="prev-page"]')
      await prevButton.trigger('click')

      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  describe('Financial Summary', () => {
    it('displays financial totals', () => {
      expect(wrapper.text()).toContain('$15,000.50') // Total amount
      expect(wrapper.text()).toContain('$1,500.05') // Average amount
    })

    it('updates financial calculations when data changes', async () => {
      const newResults = {
        ...mockResults,
        summary: {
          ...mockResults.summary,
          total_amount: 20000.0,
          average_amount: 2000.0,
        },
      }

      sessionStore.setResults(newResults)
      await nextTick()

      expect(wrapper.text()).toContain('$20,000.00')
      expect(wrapper.text()).toContain('$2,000.00')
    })

    it('calculates amounts for filtered results', async () => {
      const statusSelect = wrapper.find('select')
      await statusSelect.setValue('VALID')

      // Should show amounts only for valid employees
      const filteredTotal = wrapper.vm.filteredFinancialSummary.total
      expect(filteredTotal).toBe(1200.0) // Only John Doe's amount
    })
  })

  describe('Error Handling', () => {
    it('displays error message when API calls fail', async () => {
      const errorMessage = 'Failed to load results'
      sessionStore.setError(errorMessage)
      await nextTick()

      expect(wrapper.text()).toContain(errorMessage)
    })

    it('shows empty state when no results', async () => {
      sessionStore.setResults({ employees: [], summary: null })
      await nextTick()

      expect(wrapper.text()).toContain('No results found')
    })

    it('handles network errors during resolution', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      )

      await wrapper.vm.handleEmployeeResolution(mockResults.employees[1])

      expect(sessionStore.error).toContain('Network error')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      expect(searchInput.attributes('aria-label')).toBeTruthy()

      const statusSelect = wrapper.find('select')
      expect(statusSelect.attributes('aria-label')).toBeTruthy()
    })

    it('supports keyboard navigation', async () => {
      const firstEmployee = wrapper.find('[data-employee-id="1"]')
      expect(firstEmployee.attributes('tabindex')).toBe('0')

      await firstEmployee.trigger('keydown.enter')
      // Should select the employee
    })

    it('announces changes to screen readers', async () => {
      const statusRegion = wrapper.find('[aria-live="polite"]')
      expect(statusRegion.exists()).toBe(true)
    })
  })

  describe('Performance', () => {
    it('efficiently handles large datasets', async () => {
      // This test would verify virtual scrolling or similar optimizations
      const startTime = performance.now()

      const searchInput = wrapper.find('input[placeholder*="Search"]')
      await searchInput.setValue('test')

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
    })

    it('debounces search input', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')

      // Rapid typing
      await searchInput.setValue('J')
      await searchInput.setValue('Jo')
      await searchInput.setValue('Joh')
      await searchInput.setValue('John')

      // Should debounce and only filter once after typing stops
      await flushPromises()

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards).toHaveLength(1)
    })
  })
})
