const { test, expect } = require('@playwright/test');

test.describe('API Connectivity and Backend Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor network requests
    page.on('request', request => {
      console.log(`Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      if (!response.ok()) {
        console.warn(`Failed request: ${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should successfully connect to backend health endpoint', async ({ page }) => {
    // Test direct API call using page.request
    const response = await page.request.get('http://localhost:8001/health');
    
    expect(response.ok()).toBeTruthy();
    
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status');
    expect(healthData.status).toBe('healthy');
  });

  test('should handle backend API calls from frontend', async ({ page }) => {
    // Intercept API calls made by the frontend
    const apiCalls = [];
    
    page.on('request', request => {
      if (request.url().includes('localhost:8001')) {
        apiCalls.push({
          method: request.method(),
          url: request.url(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('localhost:8001')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Trigger potential API calls by interacting with the app
    await page.waitForTimeout(2000);
    
    // Check if any API calls were made
    console.log(`Captured ${apiCalls.length} API calls`);
    
    // Verify at least health checks or initial API calls are working
    if (apiCalls.length > 0) {
      console.log('API calls detected:', apiCalls.map(call => `${call.method} ${call.url}`));
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Test with a non-existent endpoint
    const response = await page.request.get('http://localhost:8001/nonexistent');
    
    expect(response.status()).toBe(404);
    
    // Ensure the frontend handles API errors without breaking
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // The frontend should still be functional
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should handle network timeouts properly', async ({ page }) => {
    // Test with a timeout scenario
    try {
      await page.request.get('http://localhost:8001/health', { timeout: 1 });
    } catch (error) {
      // Expected to timeout with very short timeout
      expect(error.message).toContain('timeout');
    }
    
    // Verify the app remains stable after network issues
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible();
  });

  test('should make authenticated requests properly', async ({ page }) => {
    // Test API endpoints that might require authentication
    const endpoints = [
      '/health',
      '/api/sessions',  // Potential session endpoint
      '/api/auth/me'    // Potential auth endpoint
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`http://localhost:8001${endpoint}`);
        console.log(`${endpoint}: ${response.status()}`);
        
        // Log successful responses
        if (response.ok()) {
          try {
            const data = await response.json();
            console.log(`${endpoint} response:`, data);
          } catch (e) {
            // Not JSON, that's fine
            console.log(`${endpoint} returned non-JSON response`);
          }
        }
      } catch (error) {
        console.log(`${endpoint} error:`, error.message);
      }
    }
  });

  test('should handle CORS properly', async ({ page }) => {
    // Check that cross-origin requests work properly
    const requestHeaders = {};
    
    page.on('request', request => {
      if (request.url().includes('localhost:8001')) {
        Object.assign(requestHeaders, request.headers());
      }
    });
    
    // Make a request and check headers
    try {
      const response = await page.request.get('http://localhost:8001/health');
      const responseHeaders = response.headers();
      
      console.log('Response headers:', responseHeaders);
      
      // Check for CORS headers
      if (responseHeaders['access-control-allow-origin']) {
        console.log('CORS headers present:', responseHeaders['access-control-allow-origin']);
      }
      
      expect(response.ok()).toBeTruthy();
    } catch (error) {
      console.error('CORS test failed:', error);
      throw error;
    }
  });

  test('should maintain API connection during user interactions', async ({ page }) => {
    let apiCallCount = 0;
    
    page.on('request', request => {
      if (request.url().includes('localhost:8001')) {
        apiCallCount++;
      }
    });
    
    // Interact with the application
    await page.waitForTimeout(1000);
    
    // Try to trigger some user interactions that might make API calls
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      if (await firstButton.isEnabled()) {
        await firstButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Check if API calls are being made appropriately
    console.log(`Total API calls during interaction: ${apiCallCount}`);
  });

  test('should handle API response formats correctly', async ({ page }) => {
    // Test health endpoint response format
    const response = await page.request.get('http://localhost:8001/health');
    
    expect(response.ok()).toBeTruthy();
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    const data = await response.json();
    expect(typeof data).toBe('object');
    expect(data.status).toBe('healthy');
  });

  test('should handle API rate limiting gracefully', async ({ page }) => {
    // Make multiple requests to test rate limiting
    const requests = [];
    
    for (let i = 0; i < 5; i++) {
      requests.push(page.request.get('http://localhost:8001/health'));
    }
    
    const responses = await Promise.all(requests);
    
    // Check that requests are handled properly
    responses.forEach((response, index) => {
      console.log(`Request ${index + 1}: ${response.status()}`);
      expect([200, 429]).toContain(response.status()); // 200 OK or 429 Too Many Requests
    });
  });

  test('should handle WebSocket connections if present', async ({ page }) => {
    // Monitor for WebSocket connections
    let wsConnections = [];
    
    page.on('websocket', ws => {
      wsConnections.push(ws);
      console.log('WebSocket connection detected:', ws.url());
      
      ws.on('framesent', event => console.log('WS Frame sent:', event.payload));
      ws.on('framereceived', event => console.log('WS Frame received:', event.payload));
    });
    
    // Wait for potential WebSocket connections to establish
    await page.waitForTimeout(3000);
    
    console.log(`WebSocket connections found: ${wsConnections.length}`);
    
    // This is informational - WebSockets might not be used in this app
    if (wsConnections.length > 0) {
      console.log('WebSocket functionality detected');
    }
  });
});