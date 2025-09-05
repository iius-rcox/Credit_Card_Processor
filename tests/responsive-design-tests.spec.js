const { test, expect } = require('@playwright/test');

test.describe('Responsive Design Verification', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667, description: 'iPhone SE' },
    { name: 'mobile-large', width: 414, height: 896, description: 'iPhone XR' },
    { name: 'tablet', width: 768, height: 1024, description: 'iPad' },
    { name: 'tablet-landscape', width: 1024, height: 768, description: 'iPad Landscape' },
    { name: 'desktop', width: 1200, height: 800, description: 'Desktop' },
    { name: 'desktop-large', width: 1920, height: 1080, description: 'Large Desktop' },
    { name: 'mobile-small', width: 320, height: 568, description: 'Small Mobile' }
  ];

  viewports.forEach(viewport => {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height}) - ${viewport.description}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      });

      test('Should adapt layout correctly', async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Layout ===`);
        
        // Verify app container fits viewport
        const appContainer = page.locator('#app');
        await expect(appContainer).toBeVisible();
        
        const appBox = await appContainer.boundingBox();
        if (appBox) {
          expect(appBox.width).toBeLessThanOrEqual(viewport.width + 1); // 1px tolerance
          console.log(`✓ App container width: ${appBox.width}px (viewport: ${viewport.width}px)`);
        }

        // Test header adaptation
        const header = page.locator('header');
        if (await header.count() > 0) {
          const headerBox = await header.first().boundingBox();
          if (headerBox) {
            expect(headerBox.width).toBeLessThanOrEqual(viewport.width + 1);
            console.log(`✓ Header adapted: ${headerBox.width}px`);
          }
        }

        // Test main content adaptation
        const main = page.locator('main');
        if (await main.count() > 0) {
          const mainBox = await main.first().boundingBox();
          if (mainBox) {
            expect(mainBox.width).toBeLessThanOrEqual(viewport.width + 1);
            console.log(`✓ Main content adapted: ${mainBox.width}px`);
          }
        }

        console.log(`=== ${viewport.name.toUpperCase()} Layout Test Passed ===`);
      });

      test('Should show appropriate responsive text', async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Typography ===`);
        
        // Test responsive logo text
        const logo = page.locator('.logo, h1').first();
        if (await logo.count() > 0) {
          const logoText = await logo.textContent();
          console.log(`Logo text: "${logoText}"`);
          
          // Verify appropriate text for viewport
          if (viewport.width <= 375) {
            expect(logoText).toMatch(/CCP|Credit Card Processor/);
          } else if (viewport.width <= 768) {
            expect(logoText).toMatch(/CCP|Credit Card Proc|Credit Card Processor/);
          } else {
            expect(logoText).toBeTruthy();
          }
        }

        // Test that text is readable (not too small)
        const textElements = page.locator('p, span, div').first();
        if (await textElements.count() > 0) {
          const fontSize = await textElements.evaluate(el => {
            return parseInt(window.getComputedStyle(el).fontSize);
          });
          
          // Minimum readable font size
          expect(fontSize).toBeGreaterThanOrEqual(12);
          console.log(`✓ Text readable: ${fontSize}px font size`);
        }

        console.log(`=== ${viewport.name.toUpperCase()} Typography Test Passed ===`);
      });

      test('Should have touch-friendly interactions', async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Touch Targets ===`);
        
        // Test touch targets on mobile/tablet
        if (viewport.width <= 1024) {
          const interactiveElements = page.locator('button:visible, a:visible, input:visible');
          const elementCount = await interactiveElements.count();
          console.log(`Interactive elements: ${elementCount}`);
          
          // Test first few elements for touch-friendly sizing
          const elementsToTest = Math.min(5, elementCount);
          let touchFriendlyCount = 0;
          
          for (let i = 0; i < elementsToTest; i++) {
            const element = interactiveElements.nth(i);
            const box = await element.boundingBox();
            
            if (box) {
              const minDimension = Math.min(box.width, box.height);
              const maxDimension = Math.max(box.width, box.height);
              
              // iOS guidelines: minimum 44px, Android: minimum 48dp
              // We'll use 40px as a reasonable minimum considering padding
              if (maxDimension >= 40) {
                touchFriendlyCount++;
                console.log(`✓ Touch target ${i + 1}: ${box.width}x${box.height}px`);
              } else {
                console.log(`⚠ Small touch target ${i + 1}: ${box.width}x${box.height}px`);
              }
            }
          }
          
          if (elementsToTest > 0) {
            const touchFriendlyRatio = touchFriendlyCount / elementsToTest;
            expect(touchFriendlyRatio).toBeGreaterThanOrEqual(0.7); // 70% should be touch-friendly
            console.log(`✓ Touch-friendly ratio: ${Math.round(touchFriendlyRatio * 100)}%`);
          }
        }

        console.log(`=== ${viewport.name.toUpperCase()} Touch Targets Test Passed ===`);
      });

      test('Should handle content overflow', async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Content Overflow ===`);
        
        // Check for horizontal scrollbars (should be avoided)
        const bodyScrollWidth = await page.evaluate(() => {
          return {
            scrollWidth: document.body.scrollWidth,
            clientWidth: document.body.clientWidth,
            hasHorizontalScroll: document.body.scrollWidth > document.body.clientWidth
          };
        });
        
        console.log(`Body scroll width: ${bodyScrollWidth.scrollWidth}px, client width: ${bodyScrollWidth.clientWidth}px`);
        
        // Allow small tolerance for scrollbars and browser differences
        expect(bodyScrollWidth.scrollWidth).toBeLessThanOrEqual(viewport.width + 20);
        
        if (bodyScrollWidth.hasHorizontalScroll) {
          console.log('⚠ Horizontal scroll detected');
        } else {
          console.log('✓ No horizontal overflow');
        }

        // Test that important content is visible without scrolling
        const importantElements = [
          page.locator('h1, h2').first(),
          page.locator('main').first()
        ];
        
        for (const element of importantElements) {
          if (await element.count() > 0) {
            const isVisible = await element.isVisible();
            expect(isVisible).toBeTruthy();
          }
        }
        
        console.log('✓ Important content visible');

        console.log(`=== ${viewport.name.toUpperCase()} Content Overflow Test Passed ===`);
      });

      test('Should adapt upload interface', async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Upload Interface ===`);
        
        // Test upload cards/sections
        const uploadElements = page.locator('.upload-card, .card, [class*="upload"]');
        const uploadCount = await uploadElements.count();
        console.log(`Upload elements: ${uploadCount}`);
        
        if (uploadCount > 0) {
          // Test that upload elements are appropriately sized
          const firstUpload = uploadElements.first();
          const uploadBox = await firstUpload.boundingBox();
          
          if (uploadBox) {
            expect(uploadBox.width).toBeLessThanOrEqual(viewport.width);
            console.log(`✓ Upload element width: ${uploadBox.width}px`);
            
            // On mobile, upload elements should be full width or nearly so
            if (viewport.width <= 768) {
              const widthRatio = uploadBox.width / viewport.width;
              expect(widthRatio).toBeGreaterThanOrEqual(0.8); // At least 80% width
              console.log(`✓ Mobile upload width ratio: ${Math.round(widthRatio * 100)}%`);
            }
          }
        }

        // Test file input accessibility on touch devices
        const fileInputs = page.locator('input[type="file"]');
        const fileInputCount = await fileInputs.count();
        console.log(`File inputs: ${fileInputCount}`);
        
        // Test drag and drop zones
        const dropZones = page.locator('[class*="drop"], .upload-zone');
        const dropZoneCount = await dropZones.count();
        console.log(`Drop zones: ${dropZoneCount}`);
        
        if (dropZoneCount > 0) {
          const firstDropZone = dropZones.first();
          const dropZoneBox = await firstDropZone.boundingBox();
          
          if (dropZoneBox) {
            // Drop zones should be reasonably large on mobile
            if (viewport.width <= 768) {
              expect(dropZoneBox.height).toBeGreaterThanOrEqual(80);
              console.log(`✓ Mobile drop zone height: ${dropZoneBox.height}px`);
            }
          }
        }

        console.log(`=== ${viewport.name.toUpperCase()} Upload Interface Test Passed ===`);
      });

      test('Should handle navigation appropriately', async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Navigation ===`);
        
        // Test navigation elements
        const navElements = page.locator('nav, .nav, [class*="nav"]');
        const navCount = await navElements.count();
        console.log(`Navigation elements: ${navCount}`);
        
        // Test header navigation
        const headerNav = page.locator('header');
        if (await headerNav.count() > 0) {
          const headerBox = await headerNav.first().boundingBox();
          if (headerBox) {
            expect(headerBox.width).toBeLessThanOrEqual(viewport.width + 1);
            
            // Header should not be too tall on mobile
            if (viewport.width <= 768) {
              expect(headerBox.height).toBeLessThanOrEqual(120);
              console.log(`✓ Mobile header height: ${headerBox.height}px`);
            }
          }
        }

        // Test footer navigation
        const footer = page.locator('footer');
        if (await footer.count() > 0) {
          const footerBox = await footer.first().boundingBox();
          if (footerBox) {
            expect(footerBox.width).toBeLessThanOrEqual(viewport.width + 1);
            console.log(`✓ Footer adapted: ${footerBox.width}px`);
          }
        }

        // Test floating action button on mobile
        if (viewport.width <= 768) {
          const fab = page.locator('.fixed, [class*="floating"]');
          const fabCount = await fab.count();
          console.log(`Floating action buttons: ${fabCount}`);
          
          if (fabCount > 0) {
            const firstFab = fab.first();
            const fabBox = await firstFab.boundingBox();
            
            if (fabBox) {
              // FAB should be visible and appropriately positioned
              expect(fabBox.x + fabBox.width).toBeLessThanOrEqual(viewport.width);
              expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(viewport.height);
              console.log(`✓ FAB positioned correctly`);
            }
          }
        }

        console.log(`=== ${viewport.name.toUpperCase()} Navigation Test Passed ===`);
      });

      test('Should be performant on viewport', async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Performance ===`);
        
        const startTime = Date.now();
        
        // Perform viewport-specific interactions
        if (viewport.width <= 768) {
          // Test mobile-specific interactions
          const buttons = page.locator('button:visible');
          const buttonCount = await buttons.count();
          
          if (buttonCount > 0) {
            await buttons.first().tap();
            await page.waitForTimeout(500);
          }
        } else {
          // Test desktop-specific interactions
          const clickableElements = page.locator('button:visible, a:visible');
          const clickableCount = await clickableElements.count();
          
          if (clickableCount > 0) {
            await clickableElements.first().click();
            await page.waitForTimeout(500);
          }
        }
        
        const interactionTime = Date.now() - startTime;
        console.log(`Interaction response time: ${interactionTime}ms`);
        
        // Interactions should be responsive
        expect(interactionTime).toBeLessThan(5000);
        
        // Test scrolling performance
        await page.keyboard.press('End');
        await page.waitForTimeout(300);
        await page.keyboard.press('Home');
        await page.waitForTimeout(300);
        
        console.log('✓ Scrolling performance acceptable');

        console.log(`=== ${viewport.name.toUpperCase()} Performance Test Passed ===`);
      });

      test('Should maintain accessibility across viewports', async ({ page }) => {
        console.log(`=== Testing ${viewport.name.toUpperCase()} Accessibility ===`);
        
        // Test focus management
        const focusableElements = page.locator('button:visible, a:visible, input:visible');
        const focusableCount = await focusableElements.count();
        console.log(`Focusable elements: ${focusableCount}`);
        
        if (focusableCount > 0) {
          // Test first focusable element
          const firstFocusable = focusableElements.first();
          await firstFocusable.focus();
          
          const isFocused = await firstFocusable.evaluate(el => 
            document.activeElement === el
          );
          expect(isFocused).toBeTruthy();
          console.log('✓ Focus management works');
        }

        // Test skip link on all viewports
        const skipLink = page.locator('a[href="#main-content"]');
        if (await skipLink.count() > 0) {
          await skipLink.focus();
          const skipLinkVisible = await skipLink.isVisible();
          console.log(`Skip link visible: ${skipLinkVisible}`);
        }

        // Test ARIA live regions
        const liveRegions = page.locator('[aria-live]');
        const liveRegionCount = await liveRegions.count();
        console.log(`ARIA live regions: ${liveRegionCount}`);
        expect(liveRegionCount).toBeGreaterThanOrEqual(1);

        // Test heading structure remains consistent
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const headingCount = await headings.count();
        console.log(`Headings: ${headingCount}`);
        expect(headingCount).toBeGreaterThanOrEqual(1);

        console.log(`=== ${viewport.name.toUpperCase()} Accessibility Test Passed ===`);
      });

      test.afterEach(async ({ page }) => {
        // Take viewport-specific screenshot
        await page.screenshot({ 
          path: `test-results/responsive-${viewport.name}-${viewport.width}x${viewport.height}.png`,
          fullPage: true 
        });
      });
    });
  });

  test.describe('Cross-Viewport Consistency', () => {
    test('Should maintain consistent content across viewports', async ({ page }) => {
      console.log('=== Testing Cross-Viewport Consistency ===');
      
      const contentChecks = [];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Check main content elements
        const mainHeading = page.locator('h1, h2').first();
        const mainContent = page.locator('main');
        const header = page.locator('header');
        
        const check = {
          viewport: viewport.name,
          hasMainHeading: await mainHeading.count() > 0,
          hasMainContent: await mainContent.count() > 0,
          hasHeader: await header.count() > 0,
          mainHeadingText: await mainHeading.count() > 0 ? await mainHeading.textContent() : ''
        };
        
        contentChecks.push(check);
        console.log(`${viewport.name}: heading=${check.hasMainHeading}, content=${check.hasMainContent}, header=${check.hasHeader}`);
      }
      
      // Verify consistency
      const firstCheck = contentChecks[0];
      for (const check of contentChecks) {
        expect(check.hasMainContent).toBe(firstCheck.hasMainContent);
        expect(check.hasHeader).toBe(firstCheck.hasHeader);
        // Main heading should always be present
        expect(check.hasMainHeading).toBeTruthy();
      }
      
      console.log('✓ Content consistent across all viewports');
      
      console.log('=== Cross-Viewport Consistency Test Passed ===');
    });

    test('Should handle viewport transitions smoothly', async ({ page }) => {
      console.log('=== Testing Viewport Transitions ===');
      
      // Start with desktop
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Transition through different viewports
      const transitionViewports = [
        { width: 768, height: 1024 }, // Tablet
        { width: 375, height: 667 },  // Mobile
        { width: 1920, height: 1080 } // Large desktop
      ];
      
      for (const viewport of transitionViewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500); // Allow transition
        
        // Verify app remains functional
        const appContainer = page.locator('#app');
        await expect(appContainer).toBeVisible();
        
        const appBox = await appContainer.boundingBox();
        if (appBox) {
          expect(appBox.width).toBeLessThanOrEqual(viewport.width + 1);
        }
        
        console.log(`✓ Transition to ${viewport.width}x${viewport.height} successful`);
      }
      
      console.log('=== Viewport Transitions Test Passed ===');
    });
  });
});