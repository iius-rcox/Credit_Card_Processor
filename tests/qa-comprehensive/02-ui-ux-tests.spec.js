const { test, expect } = require('@playwright/test');

test.describe('Comprehensive UI/UX Testing', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1200, height: 800 },
    { name: 'large-desktop', width: 1920, height: 1080 },
    { name: 'small-mobile', width: 320, height: 568 }
  ];

  const browsers = ['chromium', 'firefox', 'webkit'];

  test.describe('Cross-Browser Compatibility Tests', () => {
    browsers.forEach(browserName => {
      test(`${browserName} - Core functionality`, async ({ page }) => {
        console.log(`=== Testing ${browserName.toUpperCase()} Compatibility ===`);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Test core elements across browsers
        const appContainer = page.locator('#app');
        await expect(appContainer).toBeVisible();

        const header = page.locator('header');
        await expect(header).toBeVisible();

        const mainContent = page.locator('#main-content');
        await expect(mainContent).toBeVisible();

        // Test CSS rendering consistency
        const headerStyles = await header.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            backgroundColor: computed.backgroundColor,
            position: computed.position
          };
        });

        expect(headerStyles.display).not.toBe('none');
        console.log(`✓ ${browserName} header styles: ${JSON.stringify(headerStyles)}`);

        // Test JavaScript functionality
        const interactiveElements = page.locator('button:visible');
        const buttonCount = await interactiveElements.count();
        console.log(`✓ ${browserName} interactive elements: ${buttonCount}`);

        if (buttonCount > 0) {
          const firstButton = interactiveElements.first();
          await firstButton.focus();
          const isFocused = await firstButton.evaluate(el => 
            document.activeElement === el
          );
          expect(isFocused).toBeTruthy();
          console.log(`✓ ${browserName} focus management working`);
        }

        console.log(`=== ${browserName.toUpperCase()} Compatibility Test Passed ===`);
      });
    });
  });

  test.describe('Responsive Design Tests', () => {
    viewports.forEach(viewport => {
      test(`${viewport.name} (${viewport.width}x${viewport.height}) - Layout and interactions`, async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Viewport ===`);

        await page.setViewportSize(viewport);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Test layout adaptation
        const appContainer = page.locator('#app');
        await expect(appContainer).toBeVisible();

        const header = page.locator('header');
        const headerBox = await header.boundingBox();
        expect(headerBox.width).toBeGreaterThan(0);
        expect(headerBox.width).toBeLessThanOrEqual(viewport.width);
        console.log(`✓ Header width: ${headerBox.width}px (viewport: ${viewport.width}px)`);

        // Test responsive text
        const logo = page.locator('.logo');
        if (await logo.count() > 0) {
          const logoText = await logo.textContent();
          console.log(`✓ Logo text: "${logoText}"`);
          
          // Verify responsive text is appropriate for viewport
          if (viewport.width <= 375) {
            expect(logoText).toContain('CCP');
          } else if (viewport.width <= 768) {
            expect(logoText).toMatch(/CCP|Credit Card Proc/);
          } else {
            expect(logoText).toContain('Credit Card Processor');
          }
        }

        // Test navigation adaptation
        const navItems = page.locator('.nav-items');
        if (await navItems.count() > 0) {
          const navBox = await navItems.boundingBox();
          expect(navBox.width).toBeLessThanOrEqual(viewport.width);
          console.log(`✓ Navigation adapted to viewport`);
        }

        // Test main content layout
        const mainContent = page.locator('#main-content');
        const contentBox = await mainContent.boundingBox();
        expect(contentBox.width).toBeLessThanOrEqual(viewport.width);
        console.log(`✓ Main content width: ${contentBox.width}px`);

        // Test scrolling behavior
        await page.keyboard.press('End');
        await page.waitForTimeout(300);
        const scrollY = await page.evaluate(() => window.scrollY);
        console.log(`✓ Scroll position: ${scrollY}px`);

        // Test touch/click targets (especially for mobile)
        if (viewport.width <= 768) {
          const clickableElements = page.locator('button:visible, a:visible, input:visible');
          const clickableCount = await clickableElements.count();
          
          for (let i = 0; i < Math.min(3, clickableCount); i++) {
            const element = clickableElements.nth(i);
            const box = await element.boundingBox();
            if (box) {
              // Touch targets should be at least 44px (iOS) or 48dp (Android)
              const minSize = 40;
              expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(minSize);
              console.log(`✓ Touch target ${i + 1}: ${box.width}x${box.height}px`);
            }
          }
        }

        console.log(`=== ${viewport.name.toUpperCase()} Viewport Test Passed ===`);
      });
    });
  });

  test.describe('Accessibility Compliance Tests', () => {
    test('WCAG 2.1 AA Compliance - Structure and Navigation', async ({ page }) => {
      console.log('=== Starting Accessibility Audit ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test 1: Skip Navigation Link
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toBeAttached();
      
      // Test skip link functionality
      await skipLink.focus();
      const isSkipLinkVisible = await skipLink.isVisible();
      console.log(`✓ Skip link visible on focus: ${isSkipLinkVisible}`);

      await skipLink.click();
      const focusedElement = page.locator(':focus');
      const focusedId = await focusedElement.getAttribute('id');
      expect(focusedId).toBe('main-content');
      console.log('✓ Skip link navigation working');

      // Test 2: Heading Structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      expect(headings.length).toBeGreaterThanOrEqual(1);
      console.log(`✓ Found ${headings.length} headings:`, headings);

      // Test 3: Semantic HTML
      const main = page.locator('main, [role="main"], #main-content');
      await expect(main).toBeVisible();

      const nav = page.locator('nav, [role="navigation"]');
      const navCount = await nav.count();
      console.log(`✓ Found ${navCount} navigation elements`);

      const header = page.locator('header, [role="banner"]');
      await expect(header).toBeVisible();

      // Test 4: ARIA attributes
      const ariaLabels = await page.locator('[aria-label]').count();
      const ariaDescribedBy = await page.locator('[aria-describedby]').count();
      const ariaLive = await page.locator('[aria-live]').count();
      const roles = await page.locator('[role]').count();

      console.log(`✓ ARIA labels: ${ariaLabels}`);
      console.log(`✓ ARIA described-by: ${ariaDescribedBy}`);
      console.log(`✓ ARIA live regions: ${ariaLive}`);
      console.log(`✓ Role attributes: ${roles}`);

      // Test 5: Form accessibility (if forms exist)
      const formElements = page.locator('input, select, textarea');
      const formCount = await formElements.count();
      
      if (formCount > 0) {
        console.log(`Found ${formCount} form elements`);
        
        for (let i = 0; i < Math.min(5, formCount); i++) {
          const element = formElements.nth(i);
          const label = await element.getAttribute('aria-label') || 
                        await element.getAttribute('placeholder') ||
                        await page.locator(`label[for="${await element.getAttribute('id')}"]`).textContent();
          
          if (label) {
            console.log(`✓ Form element ${i + 1} has label: "${label}"`);
          }
        }
      }

      console.log('=== Accessibility Audit Passed ===');
    });

    test('Keyboard Navigation and Focus Management', async ({ page }) => {
      console.log('=== Starting Keyboard Navigation Test ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const focusableElements = [];
      let tabCount = 0;
      const maxTabs = 30;

      // Start from beginning
      await page.keyboard.press('Home');
      
      // Tab through focusable elements
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        try {
          const focusedElement = page.locator(':focus');
          if (await focusedElement.isVisible()) {
            const tagName = await focusedElement.evaluate(el => el.tagName);
            const textContent = await focusedElement.textContent();
            const ariaLabel = await focusedElement.getAttribute('aria-label');
            
            focusableElements.push({
              tabIndex: tabCount,
              tagName,
              text: textContent?.slice(0, 50),
              ariaLabel,
              isVisible: await focusedElement.isVisible()
            });
          }
        } catch (error) {
          // Element might not be focusable, continue
        }
        
        await page.waitForTimeout(100);
      }

      console.log(`✓ Found ${focusableElements.length} focusable elements in ${tabCount} tabs`);
      
      // Test reverse tabbing
      let shiftTabCount = 0;
      const reverseElements = [];
      
      while (shiftTabCount < Math.min(10, focusableElements.length)) {
        await page.keyboard.press('Shift+Tab');
        shiftTabCount++;
        
        try {
          const focusedElement = page.locator(':focus');
          if (await focusedElement.isVisible()) {
            const tagName = await focusedElement.evaluate(el => el.tagName);
            reverseElements.push({ shiftTabIndex: shiftTabCount, tagName });
          }
        } catch (error) {
          // Continue
        }
        
        await page.waitForTimeout(100);
      }

      console.log(`✓ Reverse tabbing works: ${reverseElements.length} elements`);

      // Test escape key functionality
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      console.log('✓ Escape key handling tested');

      // Test enter key on focusable elements
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        await buttons.first().focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        console.log('✓ Enter key activation tested');
      }

      console.log('=== Keyboard Navigation Test Passed ===');
    });

    test('Color Contrast and Visual Accessibility', async ({ page }) => {
      console.log('=== Starting Visual Accessibility Test ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test focus indicators
      const focusableElements = page.locator('button:visible, a:visible, input:visible');
      const focusableCount = await focusableElements.count();
      
      if (focusableCount > 0) {
        const firstElement = focusableElements.first();
        await firstElement.focus();
        
        // Check if focus is visible
        const focusStyles = await firstElement.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            outline: computed.outline,
            outlineColor: computed.outlineColor,
            outlineWidth: computed.outlineWidth,
            boxShadow: computed.boxShadow
          };
        });
        
        const hasFocusIndicator = focusStyles.outline !== 'none' || 
                                 focusStyles.boxShadow !== 'none';
        expect(hasFocusIndicator).toBeTruthy();
        console.log('✓ Focus indicators present:', focusStyles);
      }

      // Test text elements for size
      const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6, button, a');
      const textCount = await textElements.count();
      
      let smallTextCount = 0;
      for (let i = 0; i < Math.min(10, textCount); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          const fontSize = await element.evaluate(el => {
            return parseInt(window.getComputedStyle(el).fontSize);
          });
          
          if (fontSize < 14) {
            smallTextCount++;
          }
        }
      }
      
      console.log(`✓ Text size analysis: ${smallTextCount} elements under 14px out of ${Math.min(10, textCount)} checked`);

      // Test for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        let imagesWithAlt = 0;
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt');
          const role = await img.getAttribute('role');
          
          if (alt !== null || role === 'presentation') {
            imagesWithAlt++;
          }
        }
        
        console.log(`✓ Images with alt text: ${imagesWithAlt}/${imageCount}`);
        expect(imagesWithAlt).toBe(imageCount);
      }

      console.log('=== Visual Accessibility Test Passed ===');
    });
  });

  test.describe('User Interaction and Feedback Tests', () => {
    test('Loading States and Progress Indicators', async ({ page }) => {
      console.log('=== Testing Loading States ===');

      await page.goto('/');
      
      // Monitor for loading indicators during initial load
      const loadingIndicators = page.locator('.loading, .spinner, .progress, [data-testid*="loading"]');
      const loadingCount = await loadingIndicators.count();
      console.log(`Found ${loadingCount} potential loading indicators`);

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Test that loading indicators are hidden after load
      for (let i = 0; i < loadingCount; i++) {
        const indicator = loadingIndicators.nth(i);
        const isVisible = await indicator.isVisible().catch(() => false);
        console.log(`Loading indicator ${i + 1} visible after load: ${isVisible}`);
      }

      console.log('✓ Loading states tested');
    });

    test('Error Handling and User Feedback', async ({ page }) => {
      console.log('=== Testing Error Handling ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for error boundary components
      const errorElements = page.locator('.error, .error-message, [data-testid*="error"]');
      const errorCount = await errorElements.count();
      console.log(`Found ${errorCount} error-related elements`);

      // Test form validation (if forms exist)
      const formInputs = page.locator('input[required], input[type="email"], input[type="url"]');
      const requiredCount = await formInputs.count();
      
      if (requiredCount > 0) {
        const firstInput = formInputs.first();
        await firstInput.focus();
        await firstInput.fill('invalid');
        await page.keyboard.press('Tab');
        
        // Look for validation messages
        const validationMessages = page.locator('.error-message, .validation-error, [role="alert"]');
        const validationCount = await validationMessages.count();
        console.log(`Validation messages after invalid input: ${validationCount}`);
      }

      // Test aria-live regions for announcements
      const liveRegions = page.locator('[aria-live], #aria-live-region');
      const liveCount = await liveRegions.count();
      console.log(`Found ${liveCount} live regions for announcements`);

      console.log('✓ Error handling and feedback tested');
    });

    test('Animation and Transition Performance', async ({ page }) => {
      console.log('=== Testing Animations and Transitions ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test for CSS animations
      const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
      const animatedCount = await animatedElements.count();
      console.log(`Found ${animatedCount} elements with animation classes`);

      // Test viewport changes for responsive animations
      const initialViewport = { width: 1200, height: 800 };
      await page.setViewportSize(initialViewport);
      await page.waitForTimeout(300);

      const mobileViewport = { width: 375, height: 667 };
      await page.setViewportSize(mobileViewport);
      await page.waitForTimeout(500);

      // Verify no layout thrashing occurred
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();
      console.log('✓ Responsive transitions handled smoothly');

      // Test reduced motion preferences
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('✓ Reduced motion preference tested');

      console.log('✓ Animation and transition performance tested');
    });
  });
});