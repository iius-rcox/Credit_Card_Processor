import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useNotificationStore } from '@/stores/notification'

/**
 * WebSocket composable for real-time updates in Credit Card Processor
 * 
 * Provides WebSocket connection management with:
 * - Automatic connection/reconnection to session-specific endpoints
 * - Real-time processing progress updates
 * - Session status changes
 * - Error notifications and completion alerts
 * - Automatic store updates for SummaryResults
 */
export function useWebSocket() {
  // Reactive state
  const socket = ref(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref(null)
  const lastMessage = ref(null)
  const reconnectAttempts = ref(0)
  const messageQueue = ref([])  // Queue for messages when disconnected
  const lastSequenceNumber = ref(0)  // Track message sequence for sync
  const connectionMetrics = ref({
    connectedAt: null,
    messagesReceived: 0,
    lastHeartbeat: null,
    connectionLatency: 0
  })

  // Store instances
  const sessionStore = useSessionStore()
  const notificationStore = useNotificationStore()

  // Configuration
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_INTERVAL = 3000 // 3 seconds
  const HEARTBEAT_INTERVAL = 30000 // 30 seconds
  const CONNECTION_TIMEOUT = 10000 // 10 seconds
  const MAX_QUEUE_SIZE = 100 // Maximum messages to queue when disconnected

  // Computed
  const wsUrl = computed(() => {
    if (!sessionStore.sessionId) return null
    
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = location.host
    return `${protocol}//${host}/api/ws/${sessionStore.sessionId}`
  })

  const shouldReconnect = computed(() => {
    return reconnectAttempts.value < MAX_RECONNECT_ATTEMPTS && 
           sessionStore.sessionId && 
           !isConnected.value
  })

  /**
   * Connect to WebSocket endpoint
   */
  async function connect() {
    if (!wsUrl.value) {
      console.warn('No session ID available for WebSocket connection')
      return
    }

    if (isConnected.value || isConnecting.value) {
      console.log('WebSocket already connected or connecting')
      return
    }

    try {
      isConnecting.value = true
      connectionError.value = null

      console.log(`Connecting to WebSocket: ${wsUrl.value}`)
      
      const ws = new WebSocket(wsUrl.value)
      
      // Connection timeout
      const timeoutId = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout')
          ws.close()
          handleConnectionError(new Error('Connection timeout'))
        }
      }, CONNECTION_TIMEOUT)

      ws.onopen = (event) => {
        clearTimeout(timeoutId)
        console.log('WebSocket connected successfully')
        
        socket.value = ws
        isConnected.value = true
        isConnecting.value = false
        reconnectAttempts.value = 0
        connectionMetrics.value.connectedAt = new Date()
        
        // Send initial ping to confirm connection
        sendMessage({ type: 'ping' })
        
        // Request state reconciliation after reconnect
        if (reconnectAttempts.value > 0) {
          sendMessage({ 
            type: 'state_sync_request', 
            lastSequence: lastSequenceNumber.value 
          })
        }
        
        // Process any queued messages
        processQueuedMessages()
        
        // Start heartbeat
        startHeartbeat()
        
        notificationStore.addSuccess('Real-time updates enabled')
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        clearTimeout(timeoutId)
        console.log('WebSocket connection closed:', event.code, event.reason)
        
        isConnected.value = false
        isConnecting.value = false
        socket.value = null
        
        // Only show error if unexpected close
        if (event.code !== 1000 && event.code !== 1001) {
          const reason = event.reason || `Connection closed (code: ${event.code})`
          handleConnectionError(new Error(reason))
        }
        
        // Attempt reconnection if appropriate
        if (shouldReconnect.value && event.code !== 4003) { // 4003 = Access denied
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        clearTimeout(timeoutId)
        console.error('WebSocket error:', error)
        handleConnectionError(new Error('WebSocket connection failed'))
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      isConnecting.value = false
      handleConnectionError(error)
    }
  }

  /**
   * Disconnect from WebSocket
   */
  function disconnect() {
    if (socket.value) {
      console.log('Disconnecting WebSocket')
      socket.value.close(1000, 'Client disconnect')
      socket.value = null
    }
    
    isConnected.value = false
    isConnecting.value = false
    reconnectAttempts.value = 0
    stopHeartbeat()
  }

  /**
   * Process queued messages after reconnection
   */
  function processQueuedMessages() {
    if (messageQueue.value.length === 0) return
    
    console.log(`Processing ${messageQueue.value.length} queued messages`)
    const queuedMessages = [...messageQueue.value]
    messageQueue.value = []
    
    // Process queued messages in order
    queuedMessages.forEach(queuedMessage => {
      try {
        handleMessage(queuedMessage)
      } catch (error) {
        console.error('Failed to process queued message:', error, queuedMessage)
      }
    })
  }

  /**
   * Send message to WebSocket server
   */
  function sendMessage(message) {
    if (!isConnected.value || !socket.value) {
      // Queue non-critical messages when disconnected
      const queueableTypes = ['ping', 'user_interaction', 'status_request']
      if (queueableTypes.includes(message.type)) {
        // Implement FIFO queue with size limit to prevent memory exhaustion
        if (messageQueue.value.length >= MAX_QUEUE_SIZE) {
          // Remove oldest message to make room
          messageQueue.value.shift()
          console.warn('Message queue full, discarded oldest message')
        }
        
        messageQueue.value.push({
          ...message,
          queuedAt: Date.now()
        })
        console.log('Message queued for later sending:', message.type)
      } else {
        console.warn('Cannot send message: WebSocket not connected', message.type)
      }
      return false
    }

    try {
      socket.value.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      return false
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  function handleMessage(message) {
    lastMessage.value = message
    connectionMetrics.value.messagesReceived++
    
    console.log('WebSocket message received:', message.type, message)
    
    // Handle sequence validation for ordered messages
    if (message.sequence && message.sequence <= lastSequenceNumber.value) {
      console.warn('Received out-of-order message, ignoring:', message.sequence, 'last:', lastSequenceNumber.value)
      return
    }
    
    if (message.sequence) {
      lastSequenceNumber.value = message.sequence
    }

    switch (message.type) {
      case 'connection_confirmed':
        console.log('WebSocket connection confirmed:', message.message)
        break

      case 'pong':
        connectionMetrics.value.lastHeartbeat = new Date()
        if (message.timestamp) {
          // Calculate rough latency
          const latency = Date.now() - new Date(message.timestamp).getTime()
          connectionMetrics.value.connectionLatency = latency
        }
        break

      case 'processing_started':
        sessionStore.setProcessingStatus('processing')
        notificationStore.addInfo(`Processing started: ${message.message}`)
        break

      case 'processing_progress':
        // Update processing progress in store
        sessionStore.updateProcessingProgress({
          current: message.current,
          total: message.total,
          percentage: message.percentage,
          stage: message.stage
        })
        
        // Show occasional progress notifications (every 25%)
        if (message.percentage % 25 === 0) {
          notificationStore.addInfo(`Processing ${message.percentage}% complete (${message.current}/${message.total} employees)`)
        }
        break

      case 'processing_completed':
        sessionStore.setProcessingStatus('completed')
        sessionStore.updateSession(message.session_id, message.summary)
        notificationStore.addSuccess('Document processing completed successfully!')
        
        // Trigger summary refresh in components that need it
        emitProcessingComplete(message.summary)
        break

      case 'processing_failed':
        sessionStore.setProcessingStatus('failed')
        sessionStore.setSessionError(message.error)
        notificationStore.addError(`Processing failed: ${message.message}`)
        break

      case 'export_ready':
        notificationStore.addSuccess(`${message.export_type} export ready for download: ${message.filename}`)
        
        // Update store with available export
        sessionStore.addAvailableExport({
          type: message.export_type,
          filename: message.filename,
          url: message.download_url
        })
        break

      case 'session_status_changed':
        const oldStatus = message.old_status
        const newStatus = message.new_status
        
        sessionStore.setSessionStatus(newStatus)
        
        if (newStatus !== oldStatus) {
          notificationStore.addInfo(`Session status: ${newStatus}`)
        }
        break

      case 'error':
        console.error('WebSocket server error:', message.message)
        notificationStore.addError(`Server error: ${message.message}`)
        break

      default:
        console.log('Unknown WebSocket message type:', message.type)
    }
  }

  /**
   * Handle connection errors
   */
  function handleConnectionError(error) {
    connectionError.value = error.message
    isConnected.value = false
    isConnecting.value = false
    
    console.error('WebSocket connection error:', error.message)
    
    // Show user-friendly error message
    if (reconnectAttempts.value === 0) {
      notificationStore.addError('Real-time updates disconnected. Attempting to reconnect...')
    }
  }

  /**
   * Schedule automatic reconnection
   */
  function scheduleReconnect() {
    if (!shouldReconnect.value) return

    reconnectAttempts.value++
    const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts.value - 1) // Exponential backoff
    
    console.log(`Scheduling WebSocket reconnection attempt ${reconnectAttempts.value} in ${delay}ms`)
    
    setTimeout(() => {
      if (shouldReconnect.value) {
        connect()
      }
    }, delay)
  }

  /**
   * Start heartbeat to keep connection alive
   */
  let heartbeatInterval = null
  function startHeartbeat() {
    stopHeartbeat() // Clear any existing interval
    
    heartbeatInterval = setInterval(() => {
      if (isConnected.value) {
        sendMessage({ 
          type: 'ping',
          timestamp: new Date().toISOString()
        })
      }
    }, HEARTBEAT_INTERVAL)
  }

  /**
   * Stop heartbeat
   */
  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  /**
   * Request current session status
   */
  function requestStatus() {
    return sendMessage({ type: 'request_status' })
  }

  /**
   * Request connection statistics (admin only)
   */
  function requestStats() {
    return sendMessage({ type: 'request_stats' })
  }

  /**
   * Emit processing complete event for components
   */
  function emitProcessingComplete(summary) {
    // Use custom event to notify components
    window.dispatchEvent(new CustomEvent('processing-complete', {
      detail: { summary }
    }))
  }

  /**
   * Auto-connect when session changes
   */
  function handleSessionChange(newSessionId, oldSessionId) {
    if (oldSessionId && oldSessionId !== newSessionId) {
      // Session changed, disconnect current connection
      disconnect()
    }
    
    if (newSessionId && newSessionId !== oldSessionId) {
      // New session, connect
      connect()
    }
  }

  // Lifecycle management
  onMounted(() => {
    // Connect if session exists
    if (sessionStore.sessionId) {
      connect()
    }

    // Watch for session changes
    sessionStore.$subscribe((mutation, state) => {
      // Safely check if mutation.events is an array before using .some()
      const events = Array.isArray(mutation.events) ? mutation.events : []
      const sessionIdEvent = events.find(e => e.key === 'sessionId')
      
      if (sessionIdEvent) {
        handleSessionChange(state.sessionId, sessionIdEvent.oldValue)
      }
    })
  })

  onUnmounted(() => {
    disconnect()
    stopHeartbeat()
  })

  // Public API
  return {
    // State
    isConnected,
    isConnecting,
    connectionError,
    lastMessage,
    reconnectAttempts,
    connectionMetrics,

    // Methods
    connect,
    disconnect,
    sendMessage,
    requestStatus,
    requestStats,

    // Computed
    wsUrl,
    shouldReconnect
  }
}