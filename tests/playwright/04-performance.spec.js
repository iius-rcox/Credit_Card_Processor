const { test, expect } = require('@playwright/test');

test.describe('Performance and Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Should load within 5 seconds in development
    expect(loadTime).toBeLessThan(5000);
    
    // Check that critical elements are visible quickly
    const header = page.locator('header');
    const mainContent = page.locator('#main-content');
    
    await expect(header).toBeVisible();
    await expect(mainContent).toBeVisible();
  });

  test('should handle large viewport sizes', async ({ page }) => {
    // Test 4K resolution
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.waitForTimeout(500);
    
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible();
    
    // Check that content doesn't break at large sizes
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should handle small mobile viewport sizes', async ({ page }) => {
    // Test very small mobile screen
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(500);
    
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible();
    
    // Check mobile-specific elements are visible
    const mobileLogo = page.locator('.mobile-only');
    await expect(mobileLogo).toBeVisible();
    
    // Verify content is accessible on small screens
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should handle tablet viewport sizes', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible();
    
    // Check tablet-specific elements
    const tabletElements = page.locator('.tablet-only');
    if (await tabletElements.count() > 0) {
      await expect(tabletElements.first()).toBeVisible();
    }
  });

  test('should handle viewport orientation changes', async ({ page }) => {
    // Portrait mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    
    let mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    
    // Landscape mobile
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(300);
    
    mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    
    // Portrait tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    
    mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    
    // Landscape tablet
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(300);
    
    mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should efficiently load and render components', async ({ page }) => {
    // Monitor resource loading
    const resources = [];
    
    page.on('response', response => {
      resources.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'],
        timing: response.request().timing()
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Analyze resource loading
    const cssResources = resources.filter(r => r.contentType?.includes('text/css'));
    const jsResources = resources.filter(r => r.contentType?.includes('javascript'));
    const imageResources = resources.filter(r => r.contentType?.includes('image'));
    
    console.log(`CSS resources: ${cssResources.length}`);
    console.log(`JS resources: ${jsResources.length}`);
    console.log(`Image resources: ${imageResources.length}`);
    
    // Check that critical resources loaded successfully
    const failedResources = resources.filter(r => r.status >= 400);
    expect(failedResources).toHaveLength(0);
  });

  test('should handle rapid user interactions without performance degradation', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const startTime = Date.now();
    
    // Simulate rapid interactions
    for (let i = 0; i < 10; i++) {
      // Try to find and interact with buttons
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        const randomButton = buttons.nth(i % buttonCount);
        if (await randomButton.isEnabled()) {
          await randomButton.focus();
          await page.waitForTimeout(50); // Small delay between interactions
        }
      }
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }
    
    const interactionTime = Date.now() - startTime;
    console.log(`Interaction test completed in: ${interactionTime}ms`);
    
    // Should handle rapid interactions smoothly
    expect(interactionTime).toBeLessThan(5000);
    
    // Verify app is still responsive
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    // Monitor console for memory-related warnings
    const memoryWarnings = [];
    
    page.on('console', msg => {
      if (msg.text().toLowerCase().includes('memory') || 
          msg.text().toLowerCase().includes('leak')) {
        memoryWarnings.push(msg.text());
      }
    });
    
    // Trigger multiple component renders
    const viewports = [
      { width: 1200, height: 800 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
      { width: 1200, height: 800 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      // Force some repaints
      await page.evaluate(() => {
        window.scrollTo(0, 100);
        window.scrollTo(0, 0);
      });
    }
    
    // Check for memory warnings
    if (memoryWarnings.length > 0) {
      console.warn('Memory warnings detected:', memoryWarnings);
    }
    
    // App should still be responsive
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should handle CSS animations and transitions smoothly', async ({ page }) => {
    // Test CSS transitions by triggering hover states
    const interactiveElements = page.locator('button, a, .hover\\:*');
    const elementCount = await interactiveElements.count();
    
    if (elementCount > 0) {
      for (let i = 0; i < Math.min(elementCount, 5); i++) {
        const element = interactiveElements.nth(i);
        if (await element.isVisible()) {
          await element.hover();
          await page.waitForTimeout(100);
        }
      }
    }
    
    // Verify animations don't break the layout
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should maintain accessibility during responsive changes', async ({ page }) => {
    const viewports = [
      { width: 1200, height: 800 },  // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(300);
      
      // Test keyboard navigation at each size
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test that headings are still properly structured
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Test that main content is accessible
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();
      
      console.log(`Accessibility test passed for ${viewport.width}x${viewport.height}`);
    }
  });

  test('should handle touch interactions on mobile devices', async ({ page }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test touch-friendly elements
    const touchElements = page.locator('.touch-friendly, button');
    const elementCount = await touchElements.count();
    
    if (elementCount > 0) {
      const firstElement = touchElements.first();
      
      if (await firstElement.isVisible()) {
        // Simulate touch events
        await firstElement.tap();
        await page.waitForTimeout(100);
        
        // Verify the app responds to touch
        const mainContent = page.locator('#main-content');
        await expect(mainContent).toBeVisible();
      }
    }
  });
});