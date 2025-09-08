"""
Comprehensive WebSocket processing tests for real-time updates.

Tests cover:
- WebSocket connection management
- Real-time processing status updates
- Message parsing and state synchronization
- Error handling and reconnection
- Memory leak prevention
"""

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ProgressTracker from '../ProgressTracker.vue'
import { useSessionStore } from '../../stores/session.js'

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    this.onclose = null
    this.sentMessages = []
    
    // Simulate connection after a tick
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) this.onopen()
    }, 10)
  }
  
  send(data) {
    this.sentMessages.push(data)
  }
  
  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure' })
  }
  
  // Test helpers
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) })
    }
  }
  
  simulateError(error) {
    this.readyState = WebSocket.CLOSED
    if (this.onerror) this.onerror(error)
  }
  
  simulateClose(code = 1000, reason = 'Normal closure') {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose({ code, reason })
  }
}

// WebSocket constants
MockWebSocket.CONNECTING = 0
MockWebSocket.OPEN = 1
MockWebSocket.CLOSING = 2
MockWebSocket.CLOSED = 3

global.WebSocket = MockWebSocket

describe('ProcessingWebSocket', () => {
  let wrapper
  let sessionStore
  let pinia
  let mockWebSocket

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    sessionStore = useSessionStore()
    
    wrapper = mount(ProgressTracker, {
      props: {
        sessionId: 'test-session-123'
      },
      global: {
        plugins: [pinia]
      }
    })
    
    // Get the WebSocket instance created by the component
    mockWebSocket = wrapper.vm.websocket
  })

  afterEach(() => {
    wrapper?.unmount()
    if (mockWebSocket && mockWebSocket.readyState === WebSocket.OPEN) {
      mockWebSocket.close()
    }
  })

  describe('WebSocket Connection Management', () => {
    it('establishes WebSocket connection on mount', async () => {
      await nextTick()
      
      expect(wrapper.vm.websocket).toBeDefined()
      expect(wrapper.vm.websocket.url).toContain('test-session-123')
      expect(wrapper.vm.connectionStatus).toBe('connecting')
    })

    it('sets connection status to connected when WebSocket opens', async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(wrapper.vm.connectionStatus).toBe('connected')
      expect(wrapper.vm.isConnected).toBe(true)
    })

    it('handles WebSocket connection errors', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockWebSocket.simulateError(new Error('Connection failed'))
      await nextTick()
      
      expect(wrapper.vm.connectionStatus).toBe('error')
      expect(wrapper.vm.isConnected).toBe(false)
      
      errorSpy.mockRestore()
    })

    it('handles WebSocket unexpected closure', async () => {
      // First connect
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(wrapper.vm.connectionStatus).toBe('connected')
      
      // Then simulate unexpected closure
      mockWebSocket.simulateClose(1006, 'Connection lost')
      await nextTick()
      
      expect(wrapper.vm.connectionStatus).toBe('disconnected')
      expect(wrapper.vm.isConnected).toBe(false)
    })

    it('cleans up WebSocket on component unmount', () => {
      const closeSpy = vi.spyOn(mockWebSocket, 'close')
      
      wrapper.unmount()
      
      expect(closeSpy).toHaveBeenCalled()
    })

    it('shows connection status in UI', async () => {
      // Connecting state
      expect(wrapper.text()).toContain('Connecting...')
      
      // Connected state
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(wrapper.text()).toContain('Connected')
      
      // Error state
      mockWebSocket.simulateError(new Error('Connection failed'))
      await nextTick()
      expect(wrapper.text()).toContain('Connection Error')
    })
  })

  describe('Real-time Processing Updates', () => {
    beforeEach(async () => {
      // Ensure WebSocket is connected
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    it('handles processing started messages', async () => {
      const message = {
        type: 'processing_started',
        data: {
          processing_id: 'proc-123',
          status: 'started',
          timestamp: '2024-01-01T10:00:00Z'
        }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(wrapper.vm.processingStatus).toBe('started')
      expect(wrapper.vm.processingId).toBe('proc-123')
      expect(wrapper.text()).toContain('Processing Started')
    })

    it('handles progress update messages', async () => {
      const message = {
        type: 'progress_update',
        data: {
          progress: 45,
          current_step: 'Document Analysis',
          estimated_completion: '2024-01-01T10:05:00Z',
          processed_documents: 25,
          total_documents: 100
        }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(wrapper.vm.progressData.progress).toBe(45)
      expect(wrapper.vm.progressData.currentStep).toBe('Document Analysis')
      expect(wrapper.vm.progressData.processedDocuments).toBe(25)
      expect(wrapper.vm.progressData.totalDocuments).toBe(100)
      
      expect(wrapper.text()).toContain('45%')
      expect(wrapper.text()).toContain('Document Analysis')
    })

    it('handles processing completed messages', async () => {
      const message = {
        type: 'processing_completed',
        data: {
          status: 'completed',
          results: {
            processed_employees: 150,
            validation_issues: 3,
            processing_time: '00:05:23'
          },
          timestamp: '2024-01-01T10:05:23Z'
        }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(wrapper.vm.processingStatus).toBe('completed')
      expect(wrapper.vm.results).toEqual(message.data.results)
      expect(wrapper.text()).toContain('Processing Complete')
      expect(wrapper.text()).toContain('150 employees processed')
      expect(wrapper.text()).toContain('3 validation issues')
    })

    it('handles validation issue messages', async () => {
      const message = {
        type: 'validation_issue',
        data: {
          issue_id: 'issue-456',
          employee_id: 'emp-789',
          issue_type: 'missing_receipt',
          severity: 'medium',
          description: 'Transaction without corresponding receipt',
          suggested_resolution: 'Request receipt from employee'
        }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(wrapper.vm.validationIssues).toHaveLength(1)
      expect(wrapper.vm.validationIssues[0].issue_id).toBe('issue-456')
      expect(wrapper.vm.validationIssues[0].severity).toBe('medium')
      
      expect(wrapper.text()).toContain('Validation Issue')
      expect(wrapper.text()).toContain('missing_receipt')
    })

    it('handles processing error messages', async () => {
      const message = {
        type: 'processing_error',
        data: {
          error_type: 'document_corruption',
          error_message: 'Unable to process corrupted PDF file',
          recoverable: true,
          retry_suggested: true
        }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(wrapper.vm.processingStatus).toBe('error')
      expect(wrapper.vm.errorData).toEqual(message.data)
      expect(wrapper.text()).toContain('Processing Error')
      expect(wrapper.text()).toContain('Unable to process corrupted PDF file')
    })

    it('handles employee data updates', async () => {
      const message = {
        type: 'employee_processed',
        data: {
          employee_id: 'emp-001',
          name: 'John Doe',
          transactions_processed: 5,
          validation_status: 'passed',
          total_amount: 250.75
        }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(wrapper.vm.processedEmployees).toContainEqual(message.data)
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('$250.75')
    })
  })

  describe('Message Parsing and Validation', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    it('handles malformed JSON messages gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Simulate malformed JSON
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: 'invalid json {' })
      }
      
      await nextTick()
      
      // Should not crash the component
      expect(wrapper.vm.processingStatus).not.toBe('error')
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('validates message structure', async () => {
      const invalidMessage = {
        // Missing required fields
        data: { some: 'data' }
      }
      
      mockWebSocket.simulateMessage(invalidMessage)
      await nextTick()
      
      // Should handle gracefully without updating state
      expect(wrapper.vm.processingStatus).toBe('idle')
    })

    it('handles unknown message types gracefully', async () => {
      const unknownMessage = {
        type: 'unknown_message_type',
        data: { some: 'data' }
      }
      
      mockWebSocket.simulateMessage(unknownMessage)
      await nextTick()
      
      // Should not affect component state
      expect(wrapper.vm.processingStatus).toBe('idle')
    })

    it('validates progress data bounds', async () => {
      const invalidProgressMessage = {
        type: 'progress_update',
        data: {
          progress: 150, // Invalid - over 100%
          current_step: 'Invalid Step'
        }
      }
      
      mockWebSocket.simulateMessage(invalidProgressMessage)
      await nextTick()
      
      // Should clamp progress to valid range
      expect(wrapper.vm.progressData.progress).toBeLessThanOrEqual(100)
    })

    it('sanitizes message content for XSS prevention', async () => {
      const maliciousMessage = {
        type: 'progress_update',
        data: {
          progress: 50,
          current_step: '<script>alert("xss")</script>Malicious Step',
          description: 'Normal description<img src="x" onerror="alert(1)">'
        }
      }
      
      mockWebSocket.simulateMessage(maliciousMessage)
      await nextTick()
      
      // Should sanitize HTML content
      expect(wrapper.vm.progressData.currentStep).not.toContain('<script>')
      expect(wrapper.vm.progressData.currentStep).not.toContain('onerror')
    })
  })

  describe('WebSocket Reconnection Logic', () => {
    it('attempts to reconnect after connection loss', async () => {
      // Connect first
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(wrapper.vm.connectionStatus).toBe('connected')
      
      // Simulate connection loss
      mockWebSocket.simulateClose(1006, 'Connection lost')
      await nextTick()
      
      expect(wrapper.vm.connectionStatus).toBe('disconnected')
      
      // Should trigger reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1100)) // Wait for reconnect delay
      
      expect(wrapper.vm.reconnectAttempts).toBeGreaterThan(0)
      expect(wrapper.vm.connectionStatus).toBe('reconnecting')
    })

    it('limits reconnection attempts', async () => {
      // Connect first
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Simulate multiple connection failures
      for (let i = 0; i < 10; i++) {
        mockWebSocket.simulateClose(1006, 'Connection lost')
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      expect(wrapper.vm.reconnectAttempts).toBeLessThanOrEqual(5)
      expect(wrapper.vm.connectionStatus).toBe('failed')
    })

    it('resets reconnection attempts on successful connection', async () => {
      // Simulate failed attempts
      wrapper.vm.reconnectAttempts = 3
      
      // Then successful connection
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(wrapper.vm.reconnectAttempts).toBe(0)
      expect(wrapper.vm.connectionStatus).toBe('connected')
    })

    it('shows reconnection status in UI', async () => {
      wrapper.vm.connectionStatus = 'reconnecting'
      wrapper.vm.reconnectAttempts = 2
      await nextTick()
      
      expect(wrapper.text()).toContain('Reconnecting')
      expect(wrapper.text()).toContain('Attempt 2')
    })
  })

  describe('State Synchronization', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    it('synchronizes processing state with session store', async () => {
      const message = {
        type: 'processing_started',
        data: {
          processing_id: 'proc-123',
          status: 'started'
        }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(sessionStore.processingStatus).toBe('started')
      expect(sessionStore.processingId).toBe('proc-123')
    })

    it('updates store with progress data', async () => {
      const message = {
        type: 'progress_update',
        data: {
          progress: 75,
          current_step: 'Finalizing Results'
        }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(sessionStore.progressData.progress).toBe(75)
      expect(sessionStore.progressData.currentStep).toBe('Finalizing Results')
    })

    it('maintains state consistency across component updates', async () => {
      // Set initial state
      const message1 = {
        type: 'progress_update',
        data: { progress: 30, current_step: 'Step 1' }
      }
      
      mockWebSocket.simulateMessage(message1)
      await nextTick()
      
      // Force component re-render
      await wrapper.setProps({ sessionId: 'test-session-123' })
      
      // State should be preserved
      expect(wrapper.vm.progressData.progress).toBe(30)
      expect(wrapper.vm.progressData.currentStep).toBe('Step 1')
    })
  })

  describe('Memory Management', () => {
    it('properly cleans up event listeners', () => {
      const removeEventListenerSpy = vi.spyOn(mockWebSocket, 'removeEventListener')
      
      wrapper.unmount()
      
      // Should clean up listeners (if implemented)
      expect(mockWebSocket.onopen).toBeNull()
      expect(mockWebSocket.onmessage).toBeNull()
      expect(mockWebSocket.onerror).toBeNull()
      expect(mockWebSocket.onclose).toBeNull()
    })

    it('prevents memory leaks from accumulated messages', async () => {
      // Send many messages
      for (let i = 0; i < 1000; i++) {
        const message = {
          type: 'employee_processed',
          data: {
            employee_id: `emp-${i}`,
            name: `Employee ${i}`
          }
        }
        
        mockWebSocket.simulateMessage(message)
      }
      
      await nextTick()
      
      // Should limit stored messages to prevent memory issues
      expect(wrapper.vm.processedEmployees.length).toBeLessThanOrEqual(100)
    })

    it('clears timers and intervals on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      wrapper.unmount()
      
      // Should clean up any timers
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Error Boundary and Recovery', () => {
    it('handles WebSocket message processing errors', async () => {
      // Mock a processing error
      const originalMessageHandler = wrapper.vm.handleWebSocketMessage
      wrapper.vm.handleWebSocketMessage = vi.fn(() => {
        throw new Error('Message processing failed')
      })
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockWebSocket.simulateMessage({
        type: 'progress_update',
        data: { progress: 50 }
      })
      
      await nextTick()
      
      expect(consoleSpy).toHaveBeenCalled()
      expect(wrapper.vm.connectionStatus).toBe('connected') // Should remain connected
      
      consoleSpy.mockRestore()
      wrapper.vm.handleWebSocketMessage = originalMessageHandler
    })

    it('recovers from temporary network issues', async () => {
      // Connect first
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Simulate network issue
      mockWebSocket.simulateError(new Error('Network error'))
      await nextTick()
      
      expect(wrapper.vm.connectionStatus).toBe('error')
      
      // Should attempt to recover
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      expect(wrapper.vm.connectionStatus).toBe('reconnecting')
    })

    it('shows appropriate error messages to user', async () => {
      mockWebSocket.simulateError(new Error('WebSocket connection failed'))
      await nextTick()
      
      expect(wrapper.text()).toContain('Connection failed')
      expect(wrapper.find('.error-message').exists()).toBe(true)
    })
  })

  describe('Performance Optimization', () => {
    it('throttles frequent progress updates', async () => {
      const updateSpy = vi.spyOn(wrapper.vm, 'updateProgressData')
      
      // Send rapid progress updates
      for (let i = 0; i < 10; i++) {
        mockWebSocket.simulateMessage({
          type: 'progress_update',
          data: { progress: i * 10 }
        })
      }
      
      await nextTick()
      
      // Should throttle updates to prevent excessive re-renders
      expect(updateSpy.mock.calls.length).toBeLessThan(10)
    })

    it('batches multiple message updates', async () => {
      const batchMessages = [
        { type: 'employee_processed', data: { employee_id: 'emp-1', name: 'John' } },
        { type: 'employee_processed', data: { employee_id: 'emp-2', name: 'Jane' } },
        { type: 'employee_processed', data: { employee_id: 'emp-3', name: 'Bob' } }
      ]
      
      // Send messages rapidly
      batchMessages.forEach(msg => mockWebSocket.simulateMessage(msg))
      await nextTick()
      
      expect(wrapper.vm.processedEmployees).toHaveLength(3)
    })

    it('efficiently handles large result sets', async () => {
      const largeResultSet = {
        type: 'processing_completed',
        data: {
          results: {
            processed_employees: Array.from({ length: 10000 }, (_, i) => ({
              id: `emp-${i}`,
              name: `Employee ${i}`,
              amount: Math.random() * 1000
            }))
          }
        }
      }
      
      const start = performance.now()
      mockWebSocket.simulateMessage(largeResultSet)
      await nextTick()
      const end = performance.now()
      
      // Should handle large datasets efficiently
      expect(end - start).toBeLessThan(100) // Less than 100ms
    })
  })

  describe('Integration with Processing Controls', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    it('enables pause/resume controls when processing starts', async () => {
      const message = {
        type: 'processing_started',
        data: { processing_id: 'proc-123', status: 'started' }
      }
      
      mockWebSocket.simulateMessage(message)
      await nextTick()
      
      expect(wrapper.find('[data-testid="pause-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="cancel-button"]').exists()).toBe(true)
    })

    it('updates controls based on processing status', async () => {
      // Start processing
      mockWebSocket.simulateMessage({
        type: 'processing_started',
        data: { status: 'started' }
      })
      await nextTick()
      
      // Pause processing
      mockWebSocket.simulateMessage({
        type: 'processing_paused',
        data: { status: 'paused' }
      })
      await nextTick()
      
      expect(wrapper.find('[data-testid="resume-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="pause-button"]').exists()).toBe(false)
    })

    it('disables controls when processing completes', async () => {
      mockWebSocket.simulateMessage({
        type: 'processing_completed',
        data: { status: 'completed' }
      })
      await nextTick()
      
      expect(wrapper.find('[data-testid="pause-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="resume-button"]').exists()).toBe(false)
    })
  })
})