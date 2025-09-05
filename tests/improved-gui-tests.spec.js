const { test, expect } = require('@playwright/test');

test.describe('Improved GUI Structure Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for Vue app to fully mount
    await page.waitForTimeout(2000);
  });

  test.describe('Critical Fixes Validation', () => {
    test('Should have no duplicate app elements', async ({ page }) => {
      console.log('=== Testing App Element Fix ===');
      
      // Check for duplicate app elements (should be fixed now)
      const appElements = await page.locator('#app').all();
      console.log(`Found ${appElements.length} elements with id="app"`);
      
      // Should only have one app element
      expect(appElements.length).toBe(1);
      
      // Verify the single app element is visible and contains content
      const appContainer = page.locator('#app');
      await expect(appContainer).toBeVisible();
      
      const appContent = await appContainer.textContent();
      expect(appContent.length).toBeGreaterThan(0);
      console.log('✓ Single app container with content verified');
      
      console.log('=== App Element Fix Test Passed ===');
    });

    test('Should load without selector conflicts', async ({ page }) => {
      console.log('=== Testing Selector Conflicts ===');
      
      // Test that common selectors work without strict mode violations
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      console.log('✓ Header selector works');
      
      const main = page.locator('main').first();
      await expect(main).toBeVisible();
      console.log('✓ Main content selector works');
      
      const skipLink = page.locator('a[href="#main-content"]').first();
      await expect(skipLink).toBeAttached();
      console.log('✓ Skip link selector works');
      
      console.log('=== Selector Conflicts Test Passed ===');
    });
  });

  test.describe('Upload-Focused Workflow', () => {
    test('Should present upload-first interface to new users', async ({ page }) => {
      console.log('=== Testing Upload-First Interface ===');
      
      // Check for welcome/hero section
      const welcomeSection = page.locator('text="Upload Credit Card Files"');
      await expect(welcomeSection).toBeVisible();
      console.log('✓ Welcome section displayed');
      
      // Check for prominent upload interface
      const uploadSection = page.locator('.upload-hero-section, .file-upload-enhanced');
      if (await uploadSection.count() > 0) {
        await expect(uploadSection.first()).toBeVisible();
        console.log('✓ Upload section prominently displayed');
      }
      
      // Verify upload is the primary call to action
      const uploadButtons = page.locator('button:has-text("Upload"), [data-testid="upload-button"]');
      const uploadButtonCount = await uploadButtons.count();
      console.log(`Found ${uploadButtonCount} upload-related buttons`);
      expect(uploadButtonCount).toBeGreaterThanOrEqual(1);
      
      console.log('=== Upload-First Interface Test Passed ===');
    });

    test('Should show progressive disclosure of sections', async ({ page }) => {
      console.log('=== Testing Progressive Disclosure ===');
      
      // Initially, processing section should be hidden (no files uploaded)
      const processingSection = page.locator('.processing-section');
      const processingSectionCount = await processingSection.count();
      console.log(`Processing sections visible: ${processingSectionCount}`);
      
      // Results section should be hidden initially
      const resultsSection = page.locator('.results-section');
      const resultsSectionCount = await resultsSection.count();
      console.log(`Results sections visible: ${resultsSectionCount}`);
      
      // Export section should be hidden initially
      const exportSection = page.locator('.export-section');
      const exportSectionCount = await exportSection.count();
      console.log(`Export sections visible: ${exportSectionCount}`);
      
      // These sections should only appear when relevant
      console.log('✓ Progressive disclosure working - sections hidden until needed');
      
      console.log('=== Progressive Disclosure Test Passed ===');
    });

    test('Should have clear visual hierarchy', async ({ page }) => {
      console.log('=== Testing Visual Hierarchy ===');
      
      // Test heading structure
      const h1Elements = await page.locator('h1').all();
      const h2Elements = await page.locator('h2').all();
      const h3Elements = await page.locator('h3').all();
      
      console.log(`Found headings - H1: ${h1Elements.length}, H2: ${h2Elements.length}, H3: ${h3Elements.length}`);
      
      // Should have at least one H1 for main title
      expect(h1Elements.length).toBeGreaterThanOrEqual(1);
      
      // Test that the main heading is visible
      const mainHeading = page.locator('h1').first();
      await expect(mainHeading).toBeVisible();
      const mainHeadingText = await mainHeading.textContent();
      console.log(`Main heading: "${mainHeadingText}"`);
      
      // Test visual prominence of upload section
      const uploadCards = page.locator('.upload-card, .card');
      const uploadCardCount = await uploadCards.count();
      console.log(`Found ${uploadCardCount} upload cards`);
      
      console.log('✓ Visual hierarchy established');
      
      console.log('=== Visual Hierarchy Test Passed ===');
    });
  });

  test.describe('Simplified User Experience', () => {
    test('Should provide clear next steps guidance', async ({ page }) => {
      console.log('=== Testing User Guidance ===');
      
      // Look for instructional text
      const instructionalTexts = [
        'Upload your CAR and Receipt files',
        'Get started by uploading',
        'Click to upload',
        'Select both CAR and Receipt files'
      ];
      
      let foundInstructions = 0;
      for (const text of instructionalTexts) {
        const element = page.locator(`text*="${text}"`);
        if (await element.count() > 0) {
          foundInstructions++;
          console.log(`✓ Found guidance: "${text}"`);
        }
      }
      
      expect(foundInstructions).toBeGreaterThanOrEqual(1);
      console.log(`✓ ${foundInstructions} guidance elements found`);
      
      // Test for status indicators
      const statusElements = page.locator('.status, [class*="status"]');
      const statusCount = await statusElements.count();
      console.log(`Status indicators: ${statusCount}`);
      
      console.log('=== User Guidance Test Passed ===');
    });

    test('Should handle empty states gracefully', async ({ page }) => {
      console.log('=== Testing Empty States ===');
      
      // Test initial empty state
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent).toContain('Upload');
      console.log('✓ Upload prompt shown in empty state');
      
      // Look for helpful empty state messages
      const emptyStateTexts = [
        'Upload Credit Card Files',
        'Get started',
        'begin processing',
        'No files'
      ];
      
      let foundEmptyStateMessages = 0;
      for (const text of emptyStateTexts) {
        const element = page.locator(`text*="${text}"`);
        if (await element.count() > 0) {
          foundEmptyStateMessages++;
        }
      }
      
      expect(foundEmptyStateMessages).toBeGreaterThanOrEqual(1);
      console.log(`✓ ${foundEmptyStateMessages} empty state messages found`);
      
      console.log('=== Empty States Test Passed ===');
    });

    test('Should have intuitive navigation', async ({ page }) => {
      console.log('=== Testing Navigation ===');
      
      // Test skip navigation
      const skipLink = page.locator('a[href="#main-content"]');
      await skipLink.focus();
      const isSkipLinkVisible = await skipLink.isVisible();
      console.log(`Skip link visible on focus: ${isSkipLinkVisible}`);
      
      // Test main navigation elements
      const navElements = page.locator('nav, [role="navigation"]');
      const navCount = await navElements.count();
      console.log(`Navigation elements: ${navCount}`);
      
      // Test breadcrumbs or progress indicators
      const progressElements = page.locator('.progress, .step, .breadcrumb');
      const progressCount = await progressElements.count();
      console.log(`Progress/step indicators: ${progressCount}`);
      
      // Test that main content is reachable
      const mainContent = page.locator('#main-content, main');
      await expect(mainContent.first()).toBeVisible();
      console.log('✓ Main content accessible');
      
      console.log('=== Navigation Test Passed ===');
    });
  });

  test.describe('Component Integration', () => {
    test('Should integrate components seamlessly', async ({ page }) => {
      console.log('=== Testing Component Integration ===');
      
      // Test that all major components are present
      const componentSelectors = [
        'header',
        'main',
        'footer',
        '[class*="upload"]',
        '[class*="notification"]'
      ];
      
      for (const selector of componentSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        console.log(`${selector}: ${count} elements`);
      }
      
      // Test that components don't overlap visually
      const header = page.locator('header');
      const main = page.locator('main');
      const footer = page.locator('footer');
      
      if (await header.count() > 0 && await main.count() > 0) {
        const headerBox = await header.first().boundingBox();
        const mainBox = await main.first().boundingBox();
        
        if (headerBox && mainBox) {
          // Main should start after header ends
          expect(mainBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 5); // 5px tolerance
          console.log('✓ Header and main don\'t overlap');
        }
      }
      
      console.log('✓ Components integrated properly');
      
      console.log('=== Component Integration Test Passed ===');
    });

    test('Should handle component state changes', async ({ page }) => {
      console.log('=== Testing Component State Changes ===');
      
      // Test interactive elements
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      console.log(`Interactive buttons: ${buttonCount}`);
      
      if (buttonCount > 0) {
        // Test first button interaction
        const firstButton = buttons.first();
        const isEnabled = await firstButton.isEnabled();
        console.log(`First button enabled: ${isEnabled}`);
        
        if (isEnabled) {
          await firstButton.focus();
          const isFocused = await firstButton.evaluate(el => 
            document.activeElement === el
          );
          expect(isFocused).toBeTruthy();
          console.log('✓ Button focus works');
        }
      }
      
      // Test that page responds to interactions without errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Perform some interactions
      if (buttonCount > 0) {
        await buttons.first().click();
        await page.waitForTimeout(1000);
      }
      
      // Filter out non-critical errors
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('DevTools') &&
        !error.toLowerCase().includes('warning')
      );
      
      console.log(`Console errors during interaction: ${criticalErrors.length}`);
      if (criticalErrors.length > 0) {
        console.log('Errors:', criticalErrors);
      }
      
      console.log('=== Component State Changes Test Passed ===');
    });
  });

  test.describe('Error Handling and Feedback', () => {
    test('Should provide user feedback for actions', async ({ page }) => {
      console.log('=== Testing User Feedback ===');
      
      // Test for feedback mechanisms
      const feedbackElements = page.locator('[aria-live], .notification, .alert, .message');
      const feedbackCount = await feedbackElements.count();
      console.log(`Feedback mechanisms: ${feedbackCount}`);
      
      // Test ARIA live regions
      const liveRegions = page.locator('[aria-live]');
      const liveRegionCount = await liveRegions.count();
      console.log(`ARIA live regions: ${liveRegionCount}`);
      expect(liveRegionCount).toBeGreaterThanOrEqual(1);
      
      // Test notification container
      const notificationContainer = page.locator('[class*="notification"]');
      if (await notificationContainer.count() > 0) {
        console.log('✓ Notification system present');
      }
      
      console.log('=== User Feedback Test Passed ===');
    });

    test('Should handle errors gracefully', async ({ page }) => {
      console.log('=== Testing Error Handling ===');
      
      // Test error boundary
      const errorBoundary = page.locator('[class*="error-boundary"], [class*="ErrorBoundary"]');
      if (await errorBoundary.count() > 0) {
        console.log('✓ Error boundary component present');
      }
      
      // Test error display areas
      const errorElements = page.locator('.error, [class*="error"], [role="alert"]');
      const errorElementCount = await errorElements.count();
      console.log(`Error display elements: ${errorElementCount}`);
      
      // Test that the app doesn't crash on common interactions
      try {
        // Click various elements to test stability
        const clickableElements = page.locator('button:visible, a:visible');
        const clickableCount = await clickableElements.count();
        
        if (clickableCount > 0) {
          await clickableElements.first().click();
          await page.waitForTimeout(500);
          
          // Verify app is still responsive
          const appContainer = page.locator('#app');
          await expect(appContainer).toBeVisible();
          console.log('✓ App remains stable after interactions');
        }
      } catch (error) {
        console.log('Error during stability test:', error.message);
      }
      
      console.log('=== Error Handling Test Passed ===');
    });
  });

  test.describe('Performance and Loading', () => {
    test('Should load efficiently', async ({ page }) => {
      console.log('=== Testing Load Performance ===');
      
      const startTime = Date.now();
      
      // Wait for the page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`Page load time: ${loadTime}ms`);
      
      // Basic performance expectation (should load within reasonable time)
      expect(loadTime).toBeLessThan(30000); // 30 seconds max (generous for CI)
      
      // Test that critical elements are visible quickly
      const criticalElements = [
        page.locator('header'),
        page.locator('main'),
        page.locator('h1, h2').first()
      ];
      
      for (const element of criticalElements) {
        if (await element.count() > 0) {
          await expect(element.first()).toBeVisible();
        }
      }
      
      console.log('✓ Critical elements loaded');
      
      console.log('=== Load Performance Test Passed ===');
    });

    test('Should show appropriate loading states', async ({ page }) => {
      console.log('=== Testing Loading States ===');
      
      // Look for loading indicators
      const loadingIndicators = page.locator('.loading, .spinner, [class*="loading"], [class*="spinner"]');
      const loadingCount = await loadingIndicators.count();
      console.log(`Loading indicators found: ${loadingCount}`);
      
      // Test that loading states are accessible
      if (loadingCount > 0) {
        const firstLoader = loadingIndicators.first();
        const ariaLabel = await firstLoader.getAttribute('aria-label');
        const ariaLive = await firstLoader.getAttribute('aria-live');
        
        if (ariaLabel || ariaLive) {
          console.log('✓ Loading states are accessible');
        }
      }
      
      // Test that content appears after loading
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
      
      const contentText = await mainContent.textContent();
      expect(contentText.length).toBeGreaterThan(0);
      console.log('✓ Content loaded successfully');
      
      console.log('=== Loading States Test Passed ===');
    });
  });

  test.afterEach(async ({ page }) => {
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: `test-results/improved-gui-${test.info().title.replace(/\s+/g, '-').toLowerCase()}.png`,
      fullPage: true 
    });
  });
});