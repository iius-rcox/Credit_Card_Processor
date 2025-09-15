/**
 * Correlation ID utility for request tracking
 * Generates unique IDs for tracking requests across frontend and backend
 */

/**
 * Generate a unique correlation ID
 * Format: timestamp-random-counter
 * Example: 1699123456789-a3f2-0001
 */
export function generateCorrelationId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6)
  const counter = getAndIncrementCounter()
  return `${timestamp}-${random}-${counter}`
}

// Counter for ensuring uniqueness even in rapid succession
let requestCounter = 0

function getAndIncrementCounter() {
  requestCounter = (requestCounter + 1) % 10000
  return requestCounter.toString().padStart(4, '0')
}

/**
 * Extract correlation ID from error response
 */
export function extractCorrelationId(error) {
  if (error?.response?.headers?.['x-correlation-id']) {
    return error.response.headers['x-correlation-id']
  }
  if (error?.correlationId) {
    return error.correlationId
  }
  return null
}

/**
 * Create a correlation context for a request
 */
export function createCorrelationContext() {
  const correlationId = generateCorrelationId()
  const timestamp = new Date().toISOString()
  const userAgent = navigator.userAgent
  const sessionId = sessionStorage.getItem('session_id') || 'unknown'
  
  return {
    correlationId,
    timestamp,
    userAgent,
    sessionId,
    url: window.location.href
  }
}

/**
 * Format correlation info for logging or display
 */
export function formatCorrelationInfo(correlationId, context = {}) {
  return {
    correlationId,
    timestamp: context.timestamp || new Date().toISOString(),
    session: context.sessionId,
    endpoint: context.endpoint,
    method: context.method,
    status: context.status,
    duration: context.duration,
    error: context.error
  }
}

/**
 * Store correlation ID in session storage for debugging
 */
const MAX_STORED_CORRELATIONS = 50

export function storeCorrelation(correlationId, details) {
  try {
    const stored = JSON.parse(sessionStorage.getItem('correlations') || '[]')
    stored.unshift({
      id: correlationId,
      timestamp: new Date().toISOString(),
      ...details
    })
    
    // Keep only the most recent correlations
    if (stored.length > MAX_STORED_CORRELATIONS) {
      stored.length = MAX_STORED_CORRELATIONS
    }
    
    sessionStorage.setItem('correlations', JSON.stringify(stored))
  } catch (e) {
    console.warn('Failed to store correlation:', e)
  }
}

/**
 * Retrieve stored correlations for debugging
 */
export function getStoredCorrelations() {
  try {
    return JSON.parse(sessionStorage.getItem('correlations') || '[]')
  } catch (e) {
    console.warn('Failed to retrieve correlations:', e)
    return []
  }
}

/**
 * Clear stored correlations
 */
export function clearStoredCorrelations() {
  sessionStorage.removeItem('correlations')
}

/**
 * Create a debug report with correlation IDs
 */
export function createCorrelationReport(correlationId) {
  const stored = getStoredCorrelations()
  const correlation = stored.find(c => c.id === correlationId)
  
  if (!correlation) {
    return `No correlation found for ID: ${correlationId}`
  }
  
  return `
Correlation Report
==================
ID: ${correlation.id}
Timestamp: ${correlation.timestamp}
Endpoint: ${correlation.endpoint || 'N/A'}
Method: ${correlation.method || 'N/A'}
Status: ${correlation.status || 'N/A'}
Duration: ${correlation.duration || 'N/A'}ms
Error: ${correlation.error || 'None'}

Context:
${JSON.stringify(correlation, null, 2)}
  `.trim()
}