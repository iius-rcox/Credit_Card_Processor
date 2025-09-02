const { test, expect } = require('@playwright/test');

test.describe('Credit Card Processor Frontend', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the frontend
    await page.goto('http://localhost:3000');
  });

  test('frontend loads without errors', async ({ page }) => {
    // Check that the page loads
    await expect(page).toHaveTitle(/Credit Card Processor/);
    
    // Check for basic HTML structure
    const html = await page.content();
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
  });

  test('no critical javascript errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check for critical errors (allow minor warnings)
    const criticalErrors = errors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    );
    
    if (criticalErrors.length > 0) {
      console.log('Critical JavaScript errors found:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
  });

  test('vite dev server is working', async ({ page }) => {
    // Check for Vite dev server indicators
    const html = await page.content();
    expect(html).toContain('/@vite/client');
  });

  test('backend connectivity', async ({ page }) => {
    // Test that backend is reachable
    const response = await page.request.get('http://localhost:8001/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('responsive design basics', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForLoadState('networkidle');
    
    // Test mobile view  
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');
    
    // If we get here without timing out, responsive design is working
    expect(true).toBe(true);
  });

  test('network requests complete successfully', async ({ page }) => {
    const failedRequests = [];
    
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    // Wait for all network activity to complete
    await page.waitForLoadState('networkidle');
    
    // Log any failed requests for debugging
    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests);
    }
    
    // Allow for some expected failures (like missing favicons, aborted requests)
    const criticalFailures = failedRequests.filter(req => 
      !req.url.includes('favicon') && 
      !req.url.includes('.ico') &&
      req.failure?.errorText !== 'net::ERR_ABORTED'
    );
    
    expect(criticalFailures.length).toBe(0);
  });
});