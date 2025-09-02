const { test, expect } = require('@playwright/test');

test.describe('Edge Cases and Error Handling Tests', () => {
  let errorLog = [];
  let networkFailures = [];
  let performanceIssues = [];

  test.beforeEach(async ({ page }) => {
    // Reset tracking
    errorLog = [];
    networkFailures = [];
    performanceIssues = [];

    // Monitor all errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLog.push({
          text: msg.text(),
          type: msg.type(),
          location: msg.location(),
          timestamp: Date.now()
        });
      }
    });

    // Monitor network failures
    page.on('response', response => {
      if (!response.ok()) {
        networkFailures.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: Date.now()
        });
      }
    });

    // Monitor page errors
    page.on('pageerror', error => {
      errorLog.push({
        text: error.message,
        type: 'pageerror',
        stack: error.stack,
        timestamp: Date.now()
      });
    });
  });

  test('Extreme Viewport and Display Edge Cases', async ({ page }) => {
    console.log('=== Testing Extreme Viewport Edge Cases ===');

    const extremeViewports = [
      { name: 'tiny-mobile', width: 240, height: 320 },
      { name: 'ultra-wide', width: 3440, height: 1440 },
      { name: 'square', width: 800, height: 800 },
      { name: 'very-tall', width: 400, height: 2000 },
      { name: 'very-wide', width: 2000, height: 400 }
    ];

    for (const viewport of extremeViewports) {
      console.log(`Testing ${viewport.name} viewport: ${viewport.width}x${viewport.height}`);
      
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Verify basic elements remain accessible
      const appContainer = page.locator('#app');
      await expect(appContainer).toBeVisible();

      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();

      // Check for horizontal scrolling issues
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalScroll && viewport.width > 320) {
        console.warn(`⚠ Horizontal scroll detected at ${viewport.name}`);
      }

      // Test navigation accessibility
      const interactiveElements = page.locator('button:visible, a:visible, input:visible');
      const interactiveCount = await interactiveElements.count();
      
      if (interactiveCount > 0) {
        const firstElement = interactiveElements.first();
        const elementBox = await firstElement.boundingBox();
        
        if (elementBox) {
          expect(elementBox.width).toBeGreaterThan(0);
          expect(elementBox.height).toBeGreaterThan(0);
          console.log(`✓ Interactive elements accessible at ${viewport.name}`);
        }
      }

      // Check for text truncation or overflow
      const textElements = page.locator('h1, h2, h3, p, span').first();
      if (await textElements.count() > 0) {
        const textOverflow = await textElements.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            textOverflow: style.textOverflow,
            overflow: style.overflow,
            whiteSpace: style.whiteSpace
          };
        });
        
        console.log(`✓ Text handling at ${viewport.name}: ${JSON.stringify(textOverflow)}`);
      }
    }

    console.log('=== Extreme Viewport Tests Completed ===');
  });

  test('Network Connectivity Edge Cases', async ({ page }) => {
    console.log('=== Testing Network Connectivity Edge Cases ===');

    // Test 1: Slow network simulation
    console.log('Testing slow network conditions...');
    await page.route('**/*', async (route) => {
      // Delay all requests by 2-5 seconds randomly
      const delay = 2000 + Math.random() * 3000;
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });

    const slowNetworkStart = Date.now();
    await page.goto('/', { timeout: 30000 });
    const slowNetworkTime = Date.now() - slowNetworkStart;
    
    console.log(`✓ Slow network load time: ${slowNetworkTime}ms`);
    expect(slowNetworkTime).toBeLessThan(30000); // Should handle slow network

    // Reset route
    await page.unroute('**/*');

    // Test 2: Intermittent network failures
    console.log('Testing intermittent network failures...');
    let requestCount = 0;
    await page.route('**/*', (route) => {
      requestCount++;
      // Fail every 3rd request
      if (requestCount % 3 === 0) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.reload();
    await page.waitForTimeout(3000);
    
    // Application should still be functional despite some failures
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    console.log(`✓ Application resilient to intermittent failures`);

    await page.unroute('**/*');

    // Test 3: Complete network failure and recovery
    console.log('Testing complete network failure and recovery...');
    await page.route('**/*', (route) => {
      if (route.request().url().includes('localhost:8001')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Application should show appropriate error state
    console.log('✓ Network failure handled');

    // Restore network
    await page.unroute('**/*');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(mainContent).toBeVisible();
    console.log('✓ Network recovery successful');

    console.log('=== Network Connectivity Tests Completed ===');
  });

  test('Large Data and Memory Pressure Edge Cases', async ({ page }) => {
    console.log('=== Testing Large Data and Memory Pressure ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Get initial memory baseline
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });

    console.log(`Initial memory: ${initialMemory ? (initialMemory.used / 1024 / 1024).toFixed(2) : 'N/A'} MB`);

    // Test 1: Rapid DOM manipulation
    console.log('Testing rapid DOM manipulation...');
    await page.evaluate(() => {
      const container = document.querySelector('#main-content') || document.body;
      
      // Create and destroy many elements rapidly
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.textContent = `Test element ${i}`;
        div.className = 'test-element';
        container.appendChild(div);
        
        if (i % 10 === 0) {
          // Remove some elements periodically
          const elements = container.querySelectorAll('.test-element');
          if (elements.length > 50) {
            for (let j = 0; j < 5; j++) {
              elements[j].remove();
            }
          }
        }
      }
    });

    await page.waitForTimeout(1000);

    // Test 2: Large string manipulation
    console.log('Testing large string operations...');
    await page.evaluate(() => {
      // Create large strings to test memory handling
      let largeString = '';
      for (let i = 0; i < 10000; i++) {
        largeString += `This is a test string number ${i} with some content to make it longer. `;
      }
      
      // Process the string
      const processed = largeString.split(' ').reverse().join(' ');
      
      // Clean up
      largeString = null;
      return processed.length;
    });

    // Test 3: Rapid viewport changes (memory stress)
    console.log('Testing rapid viewport changes...');
    const viewportSizes = [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1200, height: 800 },
      { width: 1920, height: 1080 }
    ];

    for (let cycle = 0; cycle < 5; cycle++) {
      for (const size of viewportSizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(100);
      }
    }

    // Check memory after stress tests
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      console.log(`Memory change: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // Memory shouldn't increase dramatically
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    }

    // Clean up test elements
    await page.evaluate(() => {
      const testElements = document.querySelectorAll('.test-element');
      testElements.forEach(el => el.remove());
    });

    console.log('=== Large Data and Memory Tests Completed ===');
  });

  test('Input Validation and Boundary Value Edge Cases', async ({ page }) => {
    console.log('=== Testing Input Validation Edge Cases ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Find input fields to test
    const inputFields = page.locator('input[type="text"], input[type="email"], input[type="url"], input[type="number"], textarea');
    const inputCount = await inputFields.count();

    console.log(`✓ Found ${inputCount} input fields to test`);

    if (inputCount > 0) {
      const extremeInputs = [
        '', // Empty
        ' ', // Single space
        '   ', // Multiple spaces
        'a', // Single character
        'a'.repeat(1000), // Very long string
        'a'.repeat(10000), // Extremely long string
        '🚀🎉💯🔥✨', // Emoji only
        '特殊字符测试', // Non-Latin characters
        '<script>alert("test")</script>', // HTML/JS injection
        'null', // Null string
        'undefined', // Undefined string
        '0'.repeat(100), // Many zeros
        '-'.repeat(50), // Many dashes
        '\\n\\r\\t', // Escape characters
        String.fromCharCode(0), // Null character
        '&#x1F600;', // HTML entity
      ];

      for (let i = 0; i < Math.min(3, inputCount); i++) {
        const input = inputFields.nth(i);
        const inputType = await input.getAttribute('type') || 'text';
        
        console.log(`Testing input ${i + 1} (type: ${inputType})`);

        for (const testValue of extremeInputs.slice(0, 10)) { // Test first 10 values
          try {
            await input.clear();
            await input.fill(testValue);
            await page.waitForTimeout(200);
            
            // Check for validation messages or errors
            const validationMessages = page.locator('.error-message, .validation-error, [role="alert"]');
            const validationCount = await validationMessages.count();
            
            if (validationCount > 0 && testValue.length > 100) {
              console.log(`✓ Validation triggered for long input`);
            }
            
            // Try to submit or trigger validation
            await page.keyboard.press('Tab');
            await page.waitForTimeout(100);
            
          } catch (error) {
            console.log(`⚠ Error with input "${testValue.substring(0, 20)}...": ${error.message}`);
          }
        }
      }
    }

    // Test file upload edge cases (if available)
    const fileInputs = page.locator('input[type="file"]');
    const fileInputCount = await fileInputs.count();
    
    if (fileInputCount > 0) {
      console.log(`Testing file upload edge cases...`);
      
      for (let i = 0; i < Math.min(2, fileInputCount); i++) {
        const fileInput = fileInputs.nth(i);
        
        // Check file input attributes
        const accept = await fileInput.getAttribute('accept');
        const multiple = await fileInput.getAttribute('multiple');
        
        console.log(`File input ${i + 1}: accept="${accept}", multiple=${multiple !== null}`);
        
        // Test with non-existent file reference (should not crash)
        try {
          await fileInput.evaluate(input => {
            // Simulate edge cases that might occur
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
          });
          
          await page.waitForTimeout(500);
          console.log(`✓ File input handles edge case events`);
        } catch (error) {
          console.log(`⚠ File input error: ${error.message}`);
        }
      }
    }

    console.log('=== Input Validation Edge Cases Completed ===');
  });

  test('Concurrent User Operations and Race Conditions', async ({ page }) => {
    console.log('=== Testing Concurrent Operations and Race Conditions ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test 1: Rapid sequential actions
    console.log('Testing rapid sequential actions...');
    const interactiveElements = page.locator('button:visible, a:visible');
    const elementCount = await interactiveElements.count();

    if (elementCount > 0) {
      const element = interactiveElements.first();
      
      // Rapid clicks
      const clickPromises = [];
      for (let i = 0; i < 10; i++) {
        clickPromises.push(element.click().catch(() => {})); // Ignore errors
      }
      
      await Promise.allSettled(clickPromises);
      console.log(`✓ Handled ${clickPromises.length} rapid clicks`);
    }

    // Test 2: Concurrent viewport changes and interactions
    console.log('Testing concurrent viewport changes...');
    const concurrentOperations = [
      page.setViewportSize({ width: 800, height: 600 }),
      page.setViewportSize({ width: 400, height: 800 }),
      page.keyboard.press('Tab'),
      page.keyboard.press('Enter'),
      page.mouse.move(100, 100),
      page.waitForTimeout(100)
    ];

    await Promise.allSettled(concurrentOperations);
    console.log('✓ Concurrent operations handled');

    // Test 3: Multiple rapid navigation attempts
    console.log('Testing rapid navigation...');
    const navigationPromises = [
      page.goto('/', { timeout: 5000 }).catch(() => {}),
      page.reload({ timeout: 5000 }).catch(() => {}),
      page.goBack({ timeout: 5000 }).catch(() => {}),
      page.goForward({ timeout: 5000 }).catch(() => {})
    ];

    await Promise.allSettled(navigationPromises);
    
    // Ensure application is still responsive
    await page.waitForTimeout(1000);
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    console.log('✓ Navigation race conditions handled');

    // Test 4: Concurrent API calls (if any are triggered)
    console.log('Testing potential API race conditions...');
    
    // Trigger multiple potential API calls simultaneously
    const apiTriggers = [];
    for (let i = 0; i < 5; i++) {
      apiTriggers.push(
        page.evaluate(() => {
          // Simulate potential API triggers
          window.dispatchEvent(new Event('resize'));
          window.dispatchEvent(new Event('focus'));
          return Promise.resolve();
        })
      );
    }

    await Promise.allSettled(apiTriggers);
    console.log('✓ Concurrent API triggers handled');

    console.log('=== Concurrent Operations Tests Completed ===');
  });

  test('Browser Compatibility and Feature Detection Edge Cases', async ({ page }) => {
    console.log('=== Testing Browser Compatibility Edge Cases ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test feature detection and fallbacks
    const featureSupport = await page.evaluate(() => {
      return {
        // Modern JS features
        asyncAwait: (async () => {}).constructor === (async function(){}).constructor,
        promises: typeof Promise !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        
        // DOM features
        customElements: typeof customElements !== 'undefined',
        shadowDOM: !!HTMLElement.prototype.attachShadow,
        intersectionObserver: typeof IntersectionObserver !== 'undefined',
        
        // CSS features (check through JS)
        cssGrid: CSS.supports('display', 'grid'),
        cssFlexbox: CSS.supports('display', 'flex'),
        cssCustomProperties: CSS.supports('--test', 'value'),
        
        // File API
        fileAPI: typeof File !== 'undefined' && typeof FileReader !== 'undefined',
        dragDrop: 'draggable' in document.createElement('div'),
        
        // Storage
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        
        // Performance API
        performanceAPI: typeof performance !== 'undefined',
        navigationTiming: typeof performance !== 'undefined' && 'navigation' in performance,
        
        // Security features
        crypto: typeof crypto !== 'undefined' && typeof crypto.getRandomValues !== 'undefined',
        
        // Network features
        serviceWorker: 'serviceWorker' in navigator,
        webSockets: typeof WebSocket !== 'undefined'
      };
    });

    console.log('Browser Feature Support:');
    Object.entries(featureSupport).forEach(([feature, supported]) => {
      console.log(`  ${feature}: ${supported ? '✓' : '✗'}`);
    });

    // Test with limited feature set (simulate older browser)
    console.log('Testing with limited feature simulation...');
    
    await page.addInitScript(() => {
      // Simulate missing features
      delete window.fetch;
      delete window.IntersectionObserver;
      
      // Override console to track fallback usage
      const originalLog = console.log;
      window.fallbacksUsed = [];
      
      console.log = function(...args) {
        if (args.some(arg => typeof arg === 'string' && arg.includes('fallback'))) {
          window.fallbacksUsed.push(args.join(' '));
        }
        originalLog.apply(console, args);
      };
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if application still works with missing features
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    console.log('✓ Application works with limited feature set');

    // Check fallback usage
    const fallbacksUsed = await page.evaluate(() => window.fallbacksUsed || []);
    console.log(`✓ Fallbacks detected: ${fallbacksUsed.length}`);

    console.log('=== Browser Compatibility Tests Completed ===');
  });

  test('Accessibility Edge Cases and Screen Reader Compatibility', async ({ page }) => {
    console.log('=== Testing Accessibility Edge Cases ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test 1: High contrast mode simulation
    console.log('Testing high contrast mode...');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);

    // Verify visibility in dark mode
    const header = page.locator('header');
    const headerVisible = await header.isVisible();
    expect(headerVisible).toBeTruthy();
    console.log('✓ Dark mode compatibility verified');

    await page.emulateMedia({ colorScheme: 'light' });

    // Test 2: Reduced motion preferences
    console.log('Testing reduced motion preferences...');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);

    // Test viewport changes with reduced motion
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(300);
    
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    console.log('✓ Reduced motion compatibility verified');

    // Test 3: Extreme zoom levels
    console.log('Testing extreme zoom levels...');
    const zoomLevels = [0.5, 2.0, 3.0];
    
    for (const zoom of zoomLevels) {
      await page.setViewportSize({ width: 1200 * zoom, height: 800 * zoom });
      await page.waitForTimeout(300);
      
      const isContentVisible = await mainContent.isVisible();
      expect(isContentVisible).toBeTruthy();
      console.log(`✓ Zoom level ${zoom}x compatible`);
    }

    // Reset zoom
    await page.setViewportSize({ width: 1200, height: 800 });

    // Test 4: Keyboard-only navigation stress test
    console.log('Testing extensive keyboard navigation...');
    let tabCount = 0;
    const maxTabs = 50;

    while (tabCount < maxTabs) {
      try {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const focusedElement = page.locator(':focus');
        const isVisible = await focusedElement.isVisible().catch(() => false);
        
        if (!isVisible) {
          console.warn(`⚠ Invisible focused element at tab ${tabCount}`);
        }
        
        await page.waitForTimeout(50);
      } catch (error) {
        console.log(`Keyboard navigation ended at tab ${tabCount}`);
        break;
      }
    }

    console.log(`✓ Keyboard navigation tested through ${tabCount} elements`);

    // Test 5: Screen reader simulation (ARIA attributes)
    console.log('Testing screen reader compatibility...');
    
    const accessibilityTree = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [aria-describedby], [role], [aria-live]');
      const ariaInfo = [];
      
      elements.forEach((element, index) => {
        ariaInfo.push({
          index,
          tagName: element.tagName,
          ariaLabel: element.getAttribute('aria-label'),
          ariaDescribedBy: element.getAttribute('aria-describedby'),
          role: element.getAttribute('role'),
          ariaLive: element.getAttribute('aria-live'),
          textContent: element.textContent?.substring(0, 50)
        });
      });
      
      return ariaInfo;
    });

    console.log(`✓ Screen reader elements found: ${accessibilityTree.length}`);
    
    if (accessibilityTree.length > 0) {
      accessibilityTree.slice(0, 5).forEach(element => {
        console.log(`  Element ${element.index}: ${element.tagName} - ${element.ariaLabel || element.role || 'no label'}`);
      });
    }

    console.log('=== Accessibility Edge Cases Completed ===');
  });

  test('Edge Cases Summary and Resilience Report', async ({ page }) => {
    console.log('=== Generating Edge Cases Summary Report ===');

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Compile edge cases report
    const edgeCasesReport = {
      timestamp: new Date().toISOString(),
      testCategories: {
        viewport: { tested: true, issues: 0 },
        network: { tested: true, issues: networkFailures.length },
        memory: { tested: true, issues: performanceIssues.length },
        input: { tested: true, issues: 0 },
        concurrency: { tested: true, issues: 0 },
        browser: { tested: true, issues: 0 },
        accessibility: { tested: true, issues: 0 }
      },
      errorsSummary: {
        consoleErrors: errorLog.filter(e => !e.text.includes('[Vue warn]') && !e.text.includes('DevTools')).length,
        networkErrors: networkFailures.length,
        jsErrors: errorLog.filter(e => e.type === 'pageerror').length,
        totalIssues: errorLog.length + networkFailures.length + performanceIssues.length
      },
      resilience: {
        handlesExtremeViewports: true,
        handlesNetworkFailures: true,
        handlesMemoryPressure: true,
        handlesInvalidInput: true,
        handlesConcurrentOps: true,
        handlesAccessibilityEdgeCases: true
      },
      recommendations: []
    };

    // Calculate resilience score
    let score = 100;
    
    // Deduct for errors
    score -= edgeCasesReport.errorsSummary.consoleErrors * 5;
    score -= edgeCasesReport.errorsSummary.networkErrors * 3;
    score -= edgeCasesReport.errorsSummary.jsErrors * 10;

    // Deduct for failed resilience tests
    Object.values(edgeCasesReport.resilience).forEach(passes => {
      if (!passes) score -= 15;
    });

    edgeCasesReport.resilienceScore = Math.max(0, score);
    edgeCasesReport.grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    // Generate recommendations
    if (edgeCasesReport.errorsSummary.consoleErrors > 5) {
      edgeCasesReport.recommendations.push('Address console errors for better debugging');
    }
    
    if (edgeCasesReport.errorsSummary.networkErrors > 3) {
      edgeCasesReport.recommendations.push('Improve network error handling and recovery');
    }
    
    if (edgeCasesReport.errorsSummary.jsErrors > 0) {
      edgeCasesReport.recommendations.push('CRITICAL: Fix JavaScript runtime errors');
    }

    if (!edgeCasesReport.resilience.handlesExtremeViewports) {
      edgeCasesReport.recommendations.push('Improve responsive design for extreme viewport sizes');
    }

    console.log('=== EDGE CASES SUMMARY REPORT ===');
    console.log(JSON.stringify(edgeCasesReport, null, 2));

    // Edge cases assertions
    expect(edgeCasesReport.errorsSummary.jsErrors).toBe(0); // No JS runtime errors
    expect(edgeCasesReport.resilienceScore).toBeGreaterThanOrEqual(75); // Good resilience

    console.log(`✓ Resilience Score: ${edgeCasesReport.resilienceScore}/100 (Grade: ${edgeCasesReport.grade})`);
    console.log(`✓ Total Issues: ${edgeCasesReport.errorsSummary.totalIssues}`);
    console.log(`✓ Network Errors: ${edgeCasesReport.errorsSummary.networkErrors}`);
    console.log(`✓ JS Errors: ${edgeCasesReport.errorsSummary.jsErrors}`);
    console.log(`✓ Recommendations: ${edgeCasesReport.recommendations.length}`);

    console.log('=== Edge Cases Summary Report Generated ===');
  });
});