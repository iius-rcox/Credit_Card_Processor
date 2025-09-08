import { test, expect } from '@playwright/test';
import { setupAuthForTest } from '../fixtures/auth-helper.js';

test.describe('Visual Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should match homepage visual baseline', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Navigate to homepage and wait for stable state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow animations to settle
    
    // Hide dynamic content that changes between runs
    await page.addStyleTag({
      content: `
        .timestamp, .last-updated, [data-testid="timestamp"] { 
          visibility: hidden !important; 
        }
        .loading-spinner, .loading { 
          display: none !important; 
        }
      `
    });
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match dashboard visual baseline', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Hide dynamic elements
    await page.addStyleTag({
      content: `
        .timestamp, .last-updated, [data-testid="timestamp"],
        .session-id, [data-testid="session-id"],
        .real-time-data { 
          visibility: hidden !important; 
        }
      `
    });
    
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match upload page visual baseline', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Hide dynamic content
    await page.addStyleTag({
      content: `
        .file-hash, .upload-progress, [data-testid="progress"] { 
          visibility: hidden !important; 
        }
      `
    });
    
    await expect(page).toHaveScreenshot('upload-page-full.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match key UI components', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Test navigation header
    const header = page.locator('header, .header, nav, .nav').first();
    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot('navigation-header.png');
    }
    
    // Test main content area
    const mainContent = page.locator('main, .main-content, .content').first();
    if (await mainContent.isVisible()) {
      await expect(mainContent).toHaveScreenshot('main-content.png');
    }
    
    // Test sidebar if present
    const sidebar = page.locator('.sidebar, .side-nav, aside').first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('sidebar.png');
    }
    
    // Test footer if present
    const footer = page.locator('footer, .footer').first();
    if (await footer.isVisible()) {
      await expect(footer).toHaveScreenshot('footer.png');
    }
  });

  test('should match form elements visual baseline', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Test file upload forms
    const uploadForms = page.locator('.upload-form, [data-testid*="upload"], .file-drop-zone');
    const formCount = await uploadForms.count();
    
    for (let i = 0; i < Math.min(formCount, 3); i++) {
      const form = uploadForms.nth(i);
      if (await form.isVisible()) {
        await expect(form).toHaveScreenshot(`upload-form-${i + 1}.png`);
      }
    }
    
    // Test buttons
    const buttons = page.locator('button').filter({ hasText: /Upload|Submit|Start|Cancel/ });
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await expect(button).toHaveScreenshot(`button-${i + 1}.png`);
      }
    }
  });

  test('should match responsive breakpoints', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'wide', width: 2560, height: 1440 }
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Hide dynamic content
      await page.addStyleTag({
        content: `
          .timestamp, .session-id, .real-time-data { 
            visibility: hidden !important; 
          }
        `
      });
      
      await expect(page).toHaveScreenshot(`dashboard-${breakpoint.name}.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    }
  });

  test('should detect visual regressions in error states', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Test 404 page
    await page.goto('/nonexistent-page');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    await expect(page).toHaveScreenshot('error-404-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Test authentication error (if we can trigger it)
    await page.goto('/dashboard');
    
    // Remove authentication and try to access protected content
    await page.evaluate(() => {
      // Clear any stored auth tokens
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Reload page to trigger auth error
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Look for error messages or auth prompts
    const errorElements = page.locator('.error, .alert-danger, .auth-error');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      await expect(errorElements.first()).toHaveScreenshot('auth-error-message.png');
    }
  });

  test('should match modal and overlay components', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for buttons that might trigger modals
    const modalTriggers = page.locator('button').filter({ 
      hasText: /New|Create|Add|Settings|Help|Info/ 
    });
    
    const triggerCount = await modalTriggers.count();
    
    for (let i = 0; i < Math.min(triggerCount, 3); i++) {
      const trigger = modalTriggers.nth(i);
      
      if (await trigger.isVisible()) {
        try {
          await trigger.click();
          await page.waitForTimeout(500);
          
          // Look for modal content
          const modal = page.locator('.modal, .dialog, .popup, [role="dialog"]').first();
          
          if (await modal.isVisible()) {
            await expect(modal).toHaveScreenshot(`modal-${i + 1}.png`);
            
            // Close modal
            const closeButton = modal.locator('button').filter({ 
              hasText: /Close|Cancel|×/ 
            }).first();
            
            if (await closeButton.isVisible()) {
              await closeButton.click();
              await page.waitForTimeout(300);
            } else {
              // Try pressing Escape
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
            }
          }
        } catch (error) {
          console.log(`Could not trigger modal from button ${i + 1}: ${error.message}`);
        }
      }
    }
  });

  test('should match data visualization components', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Allow charts to render
    
    // Look for chart/graph elements
    const chartSelectors = [
      '.chart, .graph',
      '[data-testid*="chart"], [data-testid*="graph"]',
      'canvas', // Chart.js or other canvas-based charts
      '.recharts-wrapper', // Recharts
      '.highcharts-container', // Highcharts
      '.d3-chart' // D3.js charts
    ];
    
    for (const selector of chartSelectors) {
      const charts = page.locator(selector);
      const chartCount = await charts.count();
      
      for (let i = 0; i < Math.min(chartCount, 3); i++) {
        const chart = charts.nth(i);
        
        if (await chart.isVisible()) {
          // Wait for chart animation to complete
          await page.waitForTimeout(2000);
          
          await expect(chart).toHaveScreenshot(`chart-${selector.replace(/[^a-z]/gi, '')}-${i + 1}.png`);
        }
      }
    }
  });

  test('should validate color scheme consistency', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Test both light and dark themes if supported
    const themes = ['light', 'dark'];
    
    for (const theme of themes) {
      // Attempt to set theme
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for theme toggle
      const themeToggle = page.locator('button, .toggle').filter({ 
        hasText: new RegExp(theme === 'light' ? 'dark|Dark' : 'light|Light', 'i') 
      }).first();
      
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(1000);
      } else {
        // Set theme via CSS class or data attribute
        await page.addStyleTag({
          content: theme === 'dark' ? `
            :root { color-scheme: dark; }
            body { background: #1a1a1a; color: #ffffff; }
          ` : `
            :root { color-scheme: light; }
            body { background: #ffffff; color: #000000; }
          `
        });
      }
      
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot(`dashboard-${theme}-theme.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    }
  });
});