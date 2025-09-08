import { test, expect } from '@playwright/test';
import { AuthHelper, verifyAPIEndpoint } from '../../fixtures/auth-helper.js';

test.describe('Authentication Headers', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start with a clean state
    await page.context().clearCookies();
  });

  test('should include x-dev-user header in API requests', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    
    // Track API requests to verify headers
    const apiRequests = [];
    await page.route('/api/**', async (route) => {
      const request = route.request();
      apiRequests.push({
        url: request.url(),
        headers: request.headers(),
        method: request.method()
      });
      
      // Ensure x-dev-user header is present
      const headers = {
        ...request.headers(),
        'x-dev-user': authHelper.devUser
      };
      
      await route.continue({ headers });
    });

    // Navigate to the application
    await page.goto('/');
    
    // Wait for any initial API calls
    await page.waitForTimeout(2000);
    
    // Verify that API requests include the dev user header
    const authRequests = apiRequests.filter(req => 
      req.url.includes('/api/auth/current-user') || 
      req.url.includes('/api/')
    );

    expect(authRequests.length).toBeGreaterThan(0);
    
    for (const request of authRequests) {
      expect(request.headers).toHaveProperty('x-dev-user');
      expect(request.headers['x-dev-user']).toBe(authHelper.devUser);
    }
  });

  test('should successfully authenticate with current-user endpoint', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    
    // Test direct API call
    const authResult = await authHelper.verifyAuthentication();
    
    expect(authResult.isAuthenticated).toBe(true);
    expect(authResult.status).toBe(200);
    expect(authResult.user).toBeDefined();
    expect(authResult.user.username).toBe(authHelper.devUser);
  });

  test('should handle missing x-dev-user header gracefully', async ({ page }) => {
    // Make request without authentication header
    const response = await page.request.fetch('/api/auth/current-user', {
      headers: {
        'Content-Type': 'application/json'
        // Intentionally omit x-dev-user header
      }
    });

    // Should return appropriate error status (401 for missing authentication)
    expect(response.status()).toBe(401);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('detail');
    expect(errorData.detail).toContain('Authentication required');
  });

  test('should preserve authentication headers through proxy', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    
    // Set up request interceptor to verify headers reach backend
    const proxyRequests = [];
    await page.route('**/api/auth/current-user', async (route) => {
      const request = route.request();
      proxyRequests.push({
        url: request.url(),
        headers: request.headers(),
        hasDevUser: 'x-dev-user' in request.headers()
      });
      
      // Continue with the original request
      await route.continue();
    });

    // Navigate to the page first
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Make an authenticated API call from the browser context
    const response = await page.evaluate(async () => {
      return fetch('/api/auth/current-user', {
        headers: {
          'x-dev-user': 'rcox',
          'Content-Type': 'application/json'
        }
      }).then(res => res.status);
    });

    await page.waitForTimeout(1000);

    // Verify the request was intercepted and had the dev user header
    expect(proxyRequests.length).toBeGreaterThan(0);
    
    const authRequest = proxyRequests.find(req => 
      req.url.includes('/api/auth/current-user')
    );
    
    expect(authRequest).toBeDefined();
    expect(authRequest.hasDevUser).toBe(true);
    
    // Verify the response was successful
    expect(response).toBe(200);
  });

  test('should handle authentication state in frontend', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.setupPageWithAuth('/');

    // Wait for authentication to be established
    await authHelper.waitForAuthentication();

    // Check that the UI shows authenticated state
    // This would depend on your specific UI implementation
    const authIndicator = page.locator('[data-testid="user-info"], .user-info, [class*="auth"]');
    
    // Give it a moment to load
    await page.waitForTimeout(2000);
    
    // Verify user info is displayed (adjust selector based on your UI)
    if (await authIndicator.count() > 0) {
      await expect(authIndicator.first()).toBeVisible();
    }

    // Verify no authentication errors are shown
    const errorElements = page.locator('[data-testid="auth-error"], .auth-error, [class*="error"]');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      // Check if errors are related to authentication
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        expect(errorText).not.toContain('auth');
        expect(errorText).not.toContain('401');
        expect(errorText).not.toContain('403');
      }
    }
  });

  test('should verify backend trusted hosts configuration', async ({ page }) => {
    // Test that requests from frontend proxy are accepted
    const response = await page.request.fetch('/api/health', {
      headers: {
        'Host': 'localhost:3000',
        'x-dev-user': 'rcox'
      }
    });

    // Should not receive "Invalid host header" error
    expect(response.status()).not.toBe(400);
    
    if (!response.ok()) {
      const errorText = await response.text();
      expect(errorText).not.toContain('Invalid host header');
      expect(errorText).not.toContain('host header');
    }
  });

  test('should maintain authentication across page navigation', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.setupPageWithAuth('/');
    
    // Verify initial authentication
    const initialAuth = await authHelper.verifyAuthentication();
    expect(initialAuth.isAuthenticated).toBe(true);
    
    // Navigate to different pages and verify auth is maintained
    const testPages = ['/', '/upload', '/dashboard'];
    
    for (const testPage of testPages) {
      await page.goto(testPage);
      await page.waitForTimeout(1000);
      
      const authResult = await authHelper.verifyAuthentication();
      expect(authResult.isAuthenticated).toBe(true);
    }
  });
});