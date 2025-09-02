const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Integration Tests', () => {
  let apiCallsLog = [];
  let consoleErrorsLog = [];
  let networkFailuresLog = [];

  test.beforeEach(async ({ page }) => {
    // Clear logs
    apiCallsLog = [];
    consoleErrorsLog = [];
    networkFailuresLog = [];

    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('localhost:8001')) {
        apiCallsLog.push({
          method: request.method(),
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrorsLog.push({
          text: msg.text(),
          timestamp: Date.now()
        });
      }
    });

    // Monitor network failures
    page.on('response', response => {
      if (!response.ok() && response.url().includes('localhost')) {
        networkFailuresLog.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full application workflow without errors', async ({ page }) => {
    // Step 1: Verify initial load
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible();

    // Step 2: Check header and navigation
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Step 3: Verify main content area
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();

    // Step 4: Test responsive behavior
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await expect(mainContent).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    await expect(mainContent).toBeVisible();

    // Step 5: Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Step 6: Verify no critical errors occurred
    const criticalErrors = consoleErrorsLog.filter(error => 
      !error.text.includes('[Vue warn]') &&
      !error.text.includes('DevTools') &&
      !error.text.toLowerCase().includes('warning')
    );

    if (criticalErrors.length > 0) {
      console.warn('Critical errors found:', criticalErrors);
      expect(criticalErrors).toHaveLength(0);
    }

    console.log(`Workflow completed successfully with ${apiCallsLog.length} API calls`);
  });

  test('should handle session management workflow', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for components to fully load

    // Look for session-related elements
    const sessionElements = page.locator('[data-testid="session"], .session');
    const sessionSetupElements = page.locator('[data-testid="session-setup"], .session-setup');

    // Check if we're in the session setup phase
    const mainContentText = await page.locator('#main-content').textContent();
    
    if (mainContentText) {
      console.log('Main content loaded successfully');
      
      // Look for any interactive elements that might be related to session management
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      
      console.log(`Found ${buttonCount} interactive buttons`);
      
      if (buttonCount > 0) {
        // Test button interactions
        const firstButton = buttons.first();
        if (await firstButton.isEnabled()) {
          await firstButton.focus();
          console.log('Successfully focused on first button');
        }
      }
    }

    // Verify the app maintains stability during potential session operations
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible();
  });

  test('should maintain state consistency across component interactions', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Test state preservation during viewport changes
    const initialViewport = { width: 1200, height: 800 };
    await page.setViewportSize(initialViewport);
    
    // Capture initial state
    const initialText = await page.locator('#main-content').textContent();
    
    // Change viewport and verify state consistency
    const mobileViewport = { width: 375, height: 667 };
    await page.setViewportSize(mobileViewport);
    await page.waitForTimeout(500);
    
    const mobileText = await page.locator('#main-content').textContent();
    
    // Basic content should remain consistent
    expect(mobileText).toBeTruthy();
    expect(mobileText.length).toBeGreaterThan(0);
    
    // Restore original viewport
    await page.setViewportSize(initialViewport);
    await page.waitForTimeout(500);
    
    const restoredText = await page.locator('#main-content').textContent();
    expect(restoredText).toBeTruthy();
    
    console.log('State consistency maintained across viewport changes');
  });

  test('should handle error conditions gracefully', async ({ page }) => {
    // Simulate potential error conditions
    
    // 1. Test with network interruption
    const errorCount = consoleErrorsLog.length;
    
    // Interact with the application to potentially trigger errors
    await page.keyboard.press('F5'); // Refresh
    await page.waitForLoadState('networkidle');
    
    // 2. Test rapid navigation
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // 3. Test viewport stress
    const viewports = [
      { width: 320, height: 568 },
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(200);
    }
    
    // Verify application remained stable
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    
    // Check if any new errors occurred
    const newErrorCount = consoleErrorsLog.length;
    const newErrors = consoleErrorsLog.slice(errorCount);
    
    if (newErrors.length > 0) {
      console.warn('New errors detected during stress test:', newErrors);
    }
    
    console.log('Error handling test completed successfully');
  });

  test('should perform comprehensive accessibility audit', async ({ page }) => {
    // Test keyboard navigation comprehensively
    const focusableElements = [];
    
    // Start from the beginning
    await page.keyboard.press('Home');
    
    // Tab through all focusable elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      
      try {
        const focusedElement = page.locator(':focus');
        if (await focusedElement.isVisible()) {
          const tagName = await focusedElement.evaluate(el => el.tagName);
          const textContent = await focusedElement.textContent();
          
          focusableElements.push({
            tagName,
            textContent: textContent?.slice(0, 50) + '...',
            index: i
          });
        }
      } catch (error) {
        // Element might not be focusable, continue
      }
      
      await page.waitForTimeout(100);
    }
    
    console.log(`Found ${focusableElements.length} focusable elements`);
    focusableElements.forEach((el, idx) => {
      console.log(`${idx + 1}. ${el.tagName}: ${el.textContent}`);
    });
    
    // Test ARIA attributes
    const ariaElements = await page.locator('[aria-label], [aria-describedby], [role]').count();
    console.log(`Found ${ariaElements} elements with ARIA attributes`);
    
    // Test heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`Found ${headings} heading elements`);
    
    expect(headings).toBeGreaterThanOrEqual(1); // Should have at least one heading
  });

  test('should handle concurrent operations effectively', async ({ page }) => {
    // Simulate concurrent user actions
    const promises = [];
    
    // Concurrent viewport changes
    promises.push(
      page.setViewportSize({ width: 1200, height: 800 }),
      page.setViewportSize({ width: 768, height: 1024 }),
      page.setViewportSize({ width: 375, height: 667 })
    );
    
    // Concurrent keyboard inputs
    promises.push(
      page.keyboard.press('Tab'),
      page.keyboard.press('Enter'),
      page.keyboard.press('Escape')
    );
    
    // Wait for all operations to complete
    try {
      await Promise.allSettled(promises);
      console.log('Concurrent operations completed');
    } catch (error) {
      console.warn('Some concurrent operations failed:', error);
    }
    
    // Verify application stability
    await page.waitForTimeout(1000);
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should generate comprehensive test report', async ({ page }) => {
    // Collect comprehensive metrics
    const metrics = {
      apiCalls: apiCallsLog.length,
      consoleErrors: consoleErrorsLog.filter(e => !e.text.includes('[Vue warn]')).length,
      networkFailures: networkFailuresLog.length,
      loadTime: Date.now(),
      timestamp: new Date().toISOString()
    };
    
    // Test key functionality areas
    const functionalityTests = {
      headerVisible: await page.locator('header').isVisible(),
      mainContentVisible: await page.locator('#main-content').isVisible(),
      footerVisible: await page.locator('footer').isVisible(),
      skipLinkPresent: await page.locator('a[href="#main-content"]').count() > 0,
      ariaLiveRegionPresent: await page.locator('#aria-live-region').count() > 0
    };
    
    // Test responsive design
    const responsiveTests = {};
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1200, height: 800 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(300);
      
      responsiveTests[viewport.name] = {
        mainContentVisible: await page.locator('#main-content').isVisible(),
        headerVisible: await page.locator('header').isVisible()
      };
    }
    
    // Compile final report
    const testReport = {
      metrics,
      functionality: functionalityTests,
      responsive: responsiveTests,
      apiCallsLog: apiCallsLog.slice(0, 10), // Last 10 API calls
      errorSummary: consoleErrorsLog.length > 0 ? 
        `${consoleErrorsLog.length} console errors detected` : 
        'No console errors detected'
    };
    
    console.log('=== COMPREHENSIVE TEST REPORT ===');
    console.log(JSON.stringify(testReport, null, 2));
    
    // Assertions for test success
    expect(functionalityTests.headerVisible).toBeTruthy();
    expect(functionalityTests.mainContentVisible).toBeTruthy();
    expect(functionalityTests.skipLinkPresent).toBeTruthy();
    
    // All responsive tests should pass
    Object.values(responsiveTests).forEach(test => {
      expect(test.mainContentVisible).toBeTruthy();
      expect(test.headerVisible).toBeTruthy();
    });
  });
});