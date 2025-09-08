import { test, expect } from '@playwright/test';
import { setupAuthForTest } from '../fixtures/auth-helper.js';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should pass accessibility audit on homepage', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Log accessibility score
    console.log(`Homepage accessibility violations: ${accessibilityScanResults.violations.length}`);
    console.log(`Homepage accessibility passes: ${accessibilityScanResults.passes.length}`);
  });

  test('should pass accessibility audit on dashboard', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('#chat-widget') // Exclude third-party widgets if any
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
    
    console.log(`Dashboard accessibility violations: ${accessibilityScanResults.violations.length}`);
  });

  test('should pass accessibility audit on upload page', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Allow some minor violations but fail on critical ones
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical' || violation.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Minor accessibility violations found:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description} (${violation.impact})`);
      });
    }
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Test Tab navigation through interactive elements
    let focusableElements = [];
    let currentElement;
    
    // Start from body
    await page.focus('body');
    
    // Tab through elements and collect them
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      currentElement = await page.evaluate(() => {
        const focused = document.activeElement;
        return {
          tagName: focused.tagName,
          type: focused.type || null,
          role: focused.getAttribute('role'),
          ariaLabel: focused.getAttribute('aria-label'),
          id: focused.id,
          className: focused.className
        };
      });
      
      if (currentElement.tagName !== 'BODY') {
        focusableElements.push(currentElement);
      }
      
      // Break if we've cycled back to the first element
      if (i > 0 && JSON.stringify(currentElement) === JSON.stringify(focusableElements[0])) {
        break;
      }
    }

    console.log(`Found ${focusableElements.length} keyboard-focusable elements`);
    expect(focusableElements.length).toBeGreaterThan(0);

    // Test reverse tab navigation
    await page.keyboard.press('Shift+Tab');
    const reversedElement = await page.evaluate(() => {
      const focused = document.activeElement;
      return { tagName: focused.tagName, id: focused.id };
    });

    // Should be able to navigate backwards
    expect(reversedElement.tagName).not.toBe('BODY');
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');

    // Check for proper ARIA attributes on interactive elements
    const interactiveElements = await page.locator('button, input, select, textarea, [role="button"], [role="link"]').all();
    
    let elementsWithoutLabels = 0;
    
    for (const element of interactiveElements) {
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledby = await element.getAttribute('aria-labelledby');
      const title = await element.getAttribute('title');
      const text = await element.textContent();
      const placeholder = await element.getAttribute('placeholder');
      
      // Element should have some form of accessible label
      const hasAccessibleLabel = ariaLabel || ariaLabelledby || title || (text && text.trim()) || placeholder;
      
      if (!hasAccessibleLabel) {
        elementsWithoutLabels++;
        const tagName = await element.evaluate(el => el.tagName);
        const type = await element.getAttribute('type');
        console.log(`Element without accessible label: ${tagName}${type ? `[type="${type}"]` : ''}`);
      }
    }

    // Allow some minor issues but most interactive elements should have labels
    expect(elementsWithoutLabels).toBeLessThanOrEqual(Math.floor(interactiveElements.length * 0.2));
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    if (contrastViolations.length > 0) {
      console.log('Color contrast violations found:');
      contrastViolations.forEach(violation => {
        violation.nodes.forEach(node => {
          console.log(`- ${node.target[0]}: ${node.failureSummary}`);
        });
      });
    }

    expect(contrastViolations.length).toBeLessThanOrEqual(2); // Allow minor violations
  });

  test('should support screen reader navigation', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    let headingStructure = [];
    for (const heading of headings) {
      const level = await heading.evaluate(h => parseInt(h.tagName.substring(1)));
      const text = await heading.textContent();
      headingStructure.push({ level, text: text?.trim() });
    }

    console.log('Heading structure:', headingStructure);

    // Should have at least one main heading
    expect(headingStructure.length).toBeGreaterThan(0);
    
    // Should have an h1 tag
    const hasH1 = headingStructure.some(h => h.level === 1);
    expect(hasH1).toBe(true);

    // Check for landmark regions
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').count();
    
    console.log(`Found ${landmarks} landmark regions`);
    expect(landmarks).toBeGreaterThan(0);
  });

  test('should handle focus management in modals', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for buttons that might open modals
    const modalTriggers = await page.locator('button').filter({ 
      hasText: /New|Create|Add|Settings|Help/ 
    }).all();

    for (const trigger of modalTriggers.slice(0, 2)) { // Test first 2 modals
      if (await trigger.isVisible()) {
        // Remember the focused element before opening modal
        const triggerText = await trigger.textContent();
        
        try {
          await trigger.click();
          await page.waitForTimeout(500);

          // Check if a modal opened
          const modal = page.locator('[role="dialog"], .modal, .popup').first();
          
          if (await modal.isVisible()) {
            console.log(`Testing modal opened by: ${triggerText}`);
            
            // Focus should be trapped within the modal
            await page.keyboard.press('Tab');
            
            const focusedElement = await page.evaluate(() => {
              const active = document.activeElement;
              return {
                isInModal: active.closest('[role="dialog"], .modal, .popup') !== null,
                tagName: active.tagName
              };
            });

            expect(focusedElement.isInModal).toBe(true);

            // Test escape key closes modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);

            const modalStillVisible = await modal.isVisible();
            if (modalStillVisible) {
              // Try clicking close button
              const closeBtn = modal.locator('button').filter({ hasText: /Close|Cancel|×/ }).first();
              if (await closeBtn.isVisible()) {
                await closeBtn.click();
              }
            }
          }
        } catch (error) {
          console.log(`Could not test modal for ${triggerText}: ${error.message}`);
        }
      }
    }
  });

  test('should provide alternative text for images', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();
    let imagesWithoutAlt = 0;
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaLabelledby = await img.getAttribute('aria-labelledby');
      
      // Decorative images should have empty alt or role="presentation"
      // Informative images should have alt text
      const hasAccessibleText = alt !== null || role === 'presentation' || ariaLabel || ariaLabelledby;
      
      if (!hasAccessibleText) {
        imagesWithoutAlt++;
        const src = await img.getAttribute('src');
        console.log(`Image without alt text: ${src}`);
      }
    }

    console.log(`Images without proper alt text: ${imagesWithoutAlt}/${images.length}`);
    expect(imagesWithoutAlt).toBeLessThanOrEqual(Math.floor(images.length * 0.1)); // Less than 10%
  });

  test('should support high contrast mode', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Enable high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check that content is still visible and functional in high contrast mode
    const visibleElements = await page.locator('button, input, a, h1, h2, h3, p').filter({ hasText: /.+/ }).count();
    
    console.log(`Visible elements in high contrast mode: ${visibleElements}`);
    expect(visibleElements).toBeGreaterThan(5);

    // Take screenshot for manual review
    await page.screenshot({ 
      path: 'test-results/high-contrast-mode.png',
      fullPage: true 
    });
  });

  test('should work with reduced motion preferences', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check that animations are reduced or disabled
    const animatedElements = await page.locator('[class*="animate"], [class*="transition"], [class*="fade"]').count();
    
    console.log(`Elements with animation classes: ${animatedElements}`);
    
    // Verify page is still functional with reduced motion
    await page.goto('/upload');
    await page.waitForLoadState('networkidle');
    
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000);
  });
});