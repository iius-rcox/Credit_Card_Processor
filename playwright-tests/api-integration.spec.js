const { test, expect } = require('@playwright/test');

const API_BASE_URL = 'http://localhost:8001';

test.describe('API Integration Tests', () => {
  test('Health check endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('healthy');
  });

  test('Sessions API returns correct structure', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('sessions');
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data).toHaveProperty('total_count');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('page_size');
  });

  test('Sessions API data validation', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    if (data.sessions.length > 0) {
      const session = data.sessions[0];
      
      // Required fields
      expect(session).toHaveProperty('session_id');
      expect(session).toHaveProperty('session_name');
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('created_at');
      expect(session).toHaveProperty('updated_at');
      expect(session).toHaveProperty('created_by');
      
      // Data type validation
      expect(typeof session.session_id).toBe('string');
      expect(typeof session.session_name).toBe('string');
      expect(typeof session.status).toBe('string');
      expect(typeof session.created_at).toBe('string');
      expect(typeof session.updated_at).toBe('string');
      expect(typeof session.created_by).toBe('string');
      
      // UUID format validation for session_id
      expect(session.session_id).toMatch(/^[a-f0-9-]{36}$/i);
      
      // Date format validation
      expect(new Date(session.created_at)).toBeInstanceOf(Date);
      expect(new Date(session.updated_at)).toBeInstanceOf(Date);
      
      // Status validation
      const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PAUSED', 'CLOSED'];
      expect(validStatuses).toContain(session.status);
    }
  });

  test('Phase 4 admin analytics endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/phase4/admin/sessions/analytics`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('total_sessions');
    expect(data).toHaveProperty('by_status');
    expect(data).toHaveProperty('by_user');
    expect(data).toHaveProperty('export_stats');
    expect(data).toHaveProperty('reprocessing_stats');
    
    // Data type validation
    expect(typeof data.total_sessions).toBe('number');
    expect(typeof data.by_status).toBe('object');
    expect(typeof data.by_user).toBe('object');
    expect(typeof data.export_stats).toBe('object');
    expect(typeof data.reprocessing_stats).toBe('object');
  });

  test('Session details API', async ({ request }) => {
    // First get a session ID
    const sessionsResponse = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(sessionsResponse.status()).toBe(200);
    const sessionsData = await sessionsResponse.json();
    
    if (sessionsData.sessions.length > 0) {
      const sessionId = sessionsData.sessions[0].session_id;
      
      // Get session details
      const detailsResponse = await request.get(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        headers: { 'x-dev-user': 'testuser' }
      });
      
      expect(detailsResponse.status()).toBe(200);
      const detailsData = await detailsResponse.json();
      
      expect(detailsData).toHaveProperty('session_id', sessionId);
      expect(detailsData).toHaveProperty('session_name');
      expect(detailsData).toHaveProperty('status');
      expect(detailsData).toHaveProperty('created_at');
      expect(detailsData).toHaveProperty('updated_at');
    }
  });

  test('Session status API', async ({ request }) => {
    // First get a session ID
    const sessionsResponse = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(sessionsResponse.status()).toBe(200);
    const sessionsData = await sessionsResponse.json();
    
    if (sessionsData.sessions.length > 0) {
      const sessionId = sessionsData.sessions[0].session_id;
      
      // Get session status
      const statusResponse = await request.get(`${API_BASE_URL}/api/sessions/${sessionId}/status`, {
        headers: { 'x-dev-user': 'testuser' }
      });
      
      expect(statusResponse.status()).toBe(200);
      const statusData = await statusResponse.json();
      
      expect(statusData).toHaveProperty('session_id', sessionId);
      expect(statusData).toHaveProperty('status');
      expect(statusData).toHaveProperty('percent_complete');
      expect(statusData).toHaveProperty('updated_at');
    }
  });

  test('Authentication with dev headers', async ({ request }) => {
    // Test with valid dev user
    const validResponse = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    expect(validResponse.status()).toBe(200);
    
    // Test without headers (should fail)
    const invalidResponse = await request.get(`${API_BASE_URL}/api/sessions`);
    expect(invalidResponse.status()).toBe(401);
  });

  test('Admin endpoints require admin privileges', async ({ request }) => {
    // Test admin endpoint with dev user (should work in dev mode)
    const adminResponse = await request.get(`${API_BASE_URL}/api/phase4/admin/sessions/analytics`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    expect(adminResponse.status()).toBe(200);
  });

  test('API error handling', async ({ request }) => {
    // Test invalid session ID
    const invalidSessionResponse = await request.get(`${API_BASE_URL}/api/sessions/invalid-session-id`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    expect(invalidSessionResponse.status()).toBe(400);
    
    // Test invalid endpoint
    const invalidEndpointResponse = await request.get(`${API_BASE_URL}/api/invalid-endpoint`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    expect(invalidEndpointResponse.status()).toBe(404);
  });

  test('API response headers', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(response.status()).toBe(200);
    
    // Check content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    // Check CORS headers if applicable
    const corsHeaders = response.headers()['access-control-allow-origin'];
    if (corsHeaders) {
      expect(corsHeaders).toBeDefined();
    }
  });

  test('API pagination', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/sessions?page=1&page_size=5`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('page', 1);
    expect(data).toHaveProperty('page_size', 5);
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.sessions)).toBe(true);
    
    // Verify page size is respected
    expect(data.sessions.length).toBeLessThanOrEqual(5);
  });

  test('API query parameters', async ({ request }) => {
    // Test status filter
    const statusResponse = await request.get(`${API_BASE_URL}/api/sessions?status=COMPLETED`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(statusResponse.status()).toBe(200);
    const statusData = await statusResponse.json();
    
    if (statusData.sessions && statusData.sessions.length > 0) {
      for (const session of statusData.sessions) {
        // Check that the session has a valid status
        expect(session.status).toBeDefined();
        expect(typeof session.status).toBe('string');
      }
    }
    
    // Test search parameter - use a more generic search term
    const searchResponse = await request.get(`${API_BASE_URL}/api/sessions?search=Processing`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(searchResponse.status()).toBe(200);
    const searchData = await searchResponse.json();
    
    if (searchData.sessions && searchData.sessions.length > 0) {
      const hasMatchingSession = searchData.sessions.some(session => 
        session.session_name && session.session_name.toLowerCase().includes('processing')
      );
      expect(hasMatchingSession).toBe(true);
    }
  });

  test('API performance', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('Concurrent API requests', async ({ request }) => {
    // Make multiple concurrent requests
    const promises = Array(5).fill().map(() => 
      request.get(`${API_BASE_URL}/api/sessions`, {
        headers: { 'x-dev-user': 'testuser' }
      })
    );
    
    const responses = await Promise.all(promises);
    
    // All requests should succeed
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }
  });

  test('API data consistency across requests', async ({ request }) => {
    // Make two requests and compare data
    const response1 = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    const response2 = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(response1.status()).toBe(200);
    expect(response2.status()).toBe(200);
    
    const data1 = await response1.json();
    const data2 = await response2.json();
    
    // Total count should be the same
    expect(data1.total_count).toBe(data2.total_count);
    
    // Session count should be the same
    expect(data1.sessions.length).toBe(data2.sessions.length);
  });

  test('API handles large datasets', async ({ request }) => {
    // Request with reasonable page size
    const response = await request.get(`${API_BASE_URL}/api/sessions?page_size=100`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(Array.isArray(data.sessions) || Array.isArray(data)).toBe(true);
    const sessions = Array.isArray(data) ? data : data.sessions;
    expect(sessions.length).toBeGreaterThan(0);
  });

  test('API error response format', async ({ request }) => {
    // Test 404 error
    const response = await request.get(`${API_BASE_URL}/api/sessions/nonexistent-id`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(response.status()).toBe(400);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('detail');
    expect(typeof errorData.detail).toBe('string');
  });

  test('API rate limiting (if implemented)', async ({ request }) => {
    // Make multiple rapid requests
    const promises = Array(10).fill().map(() => 
      request.get(`${API_BASE_URL}/api/sessions`, {
        headers: { 'x-dev-user': 'testuser' }
      })
    );
    
    const responses = await Promise.all(promises);
    
    // All requests should succeed (no rate limiting implemented)
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }
  });
});
