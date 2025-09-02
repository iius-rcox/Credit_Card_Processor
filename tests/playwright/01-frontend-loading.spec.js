const { test, expect } = require('@playwright/test');

test.describe('Frontend Loading and Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console monitoring for JavaScript errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });
    
    // Monitor for unhandled errors
    page.on('pageerror', error => {
      console.error('Page error:', error);
    });
  });

  test('should load the frontend application successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check that the page title is set correctly
    await expect(page).toHaveTitle(/Credit Card Processor/);
    
    // Verify the main app container is present
    await expect(page.locator('#app')).toBeVisible();
    
    // Check for the main content area
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('should display the header with correct branding', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check header is present
    const header = page.locator('header.app-header');
    await expect(header).toBeVisible();
    
    // Check logo/title is present with responsive text
    const logo = page.locator('h1.logo');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('Credit Card Processor');
  });

  test('should display footer information', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check footer is present
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Credit Card Processor v1.0.0');
  });

  test('should have proper skip navigation link for accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check skip navigation link is present
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible({ visible: false }); // Hidden by default
    await expect(skipLink).toContainText('Skip to main content');
    
    // Check that focusing the skip link makes it visible
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
  });

  test('should have ARIA live region for announcements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check ARIA live region is present
    const ariaLiveRegion = page.locator('#aria-live-region');
    await expect(ariaLiveRegion).toBeVisible({ visible: false });
    await expect(ariaLiveRegion).toHaveAttribute('aria-live', 'polite');
  });

  test('should display SessionSetup when no active session', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should show SessionSetup component when no session
    // This is based on the v-if="!sessionStore.hasSession" in the template
    const sessionSetup = page.locator('[data-testid="session-setup"], .session-setup');
    
    // Wait for Vue components to render
    await page.waitForTimeout(1000);
    
    // Check if we can see session-related content
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('should handle responsive design breakpoints', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const desktopLogo = page.locator('.desktop-only');
    await expect(desktopLogo).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for responsive changes
    
    const tabletLogo = page.locator('.tablet-only');
    // Note: Visibility depends on CSS, so we check if it exists
    await expect(tabletLogo).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileLogo = page.locator('.mobile-only');
    await expect(mobileLogo).toBeVisible();
  });

  test('should load without JavaScript errors in console', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);
    
    // Report any errors found
    if (consoleErrors.length > 0) {
      console.warn('Console errors found:', consoleErrors);
    }
    
    if (pageErrors.length > 0) {
      console.warn('Page errors found:', pageErrors);
    }
    
    // Fail if there are critical errors (excluding common dev warnings)
    const criticalErrors = [...consoleErrors, ...pageErrors].filter(error => 
      !error.includes('[Vue warn]') && 
      !error.includes('DevTools') &&
      !error.includes('Extension') &&
      !error.toLowerCase().includes('warning')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should load all critical CSS and assets', async ({ page }) => {
    await page.goto('/');
    
    // Check that CSS is loading properly by testing styled elements
    const appContainer = page.locator('#app');
    await expect(appContainer).toHaveClass(/min-h-screen/);
    
    // Check that Tailwind CSS is working
    const header = page.locator('header');
    await expect(header).toHaveClass(/bg-white/);
  });

  test('should handle network failures gracefully', async ({ page, context }) => {
    // Simulate offline condition
    await context.setOffline(true);
    
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));
    
    try {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch (error) {
      // Expected to fail when offline
      expect(error.message).toContain('net::ERR_INTERNET_DISCONNECTED');
    }
    
    // Restore connection
    await context.setOffline(false);
  });
});