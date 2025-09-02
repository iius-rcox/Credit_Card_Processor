const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Performance Testing', () => {
  let performanceMetrics = {};
  let networkRequests = [];
  let resourceLoadTimes = [];

  test.beforeEach(async ({ page }) => {
    // Reset metrics
    performanceMetrics = {};
    networkRequests = [];
    resourceLoadTimes = [];

    // Monitor network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
        size: request.postData()?.length || 0
      });
    });

    // Monitor responses with timing
    page.on('response', response => {
      const request = response.request();
      const responseData = {
        url: response.url(),
        status: response.status(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
        contentLength: parseInt(response.headers()['content-length'] || '0')
      };
      
      resourceLoadTimes.push(responseData);
    });
  });

  test('Page Load Performance Analysis', async ({ page }) => {
    console.log('=== Starting Page Load Performance Analysis ===');

    const startTime = Date.now();

    // Navigate and measure initial load
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    performanceMetrics.pageLoadTime = loadTime;

    console.log(`✓ Page load time: ${loadTime}ms`);

    // Measure Time to First Contentful Paint and other Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // Get performance entries
        const perfEntries = performance.getEntriesByType('navigation')[0];
        if (perfEntries) {
          vitals.domContentLoaded = perfEntries.domContentLoadedEventEnd - perfEntries.domContentLoadedEventStart;
          vitals.loadComplete = perfEntries.loadEventEnd - perfEntries.loadEventStart;
          vitals.firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0;
          vitals.firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
        }

        // Get largest contentful paint using PerformanceObserver
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              if (lastEntry) {
                vitals.largestContentfulPaint = lastEntry.startTime;
              }
              observer.disconnect();
              resolve(vitals);
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            
            // Fallback timeout
            setTimeout(() => {
              observer.disconnect();
              resolve(vitals);
            }, 2000);
          } catch (e) {
            resolve(vitals);
          }
        } else {
          resolve(vitals);
        }
      });
    });

    performanceMetrics.webVitals = webVitals;

    console.log(`✓ DOM Content Loaded: ${webVitals.domContentLoaded}ms`);
    console.log(`✓ Load Complete: ${webVitals.loadComplete}ms`);
    console.log(`✓ First Paint: ${webVitals.firstPaint}ms`);
    console.log(`✓ First Contentful Paint: ${webVitals.firstContentfulPaint}ms`);
    console.log(`✓ Largest Contentful Paint: ${webVitals.largestContentfulPaint}ms`);

    // Performance thresholds (Google Core Web Vitals recommendations)
    if (webVitals.firstContentfulPaint > 0) {
      expect(webVitals.firstContentfulPaint).toBeLessThan(1800); // Good FCP < 1.8s
    }
    if (webVitals.largestContentfulPaint > 0) {
      expect(webVitals.largestContentfulPaint).toBeLessThan(2500); // Good LCP < 2.5s
    }

    console.log('=== Page Load Performance Analysis Completed ===');
  });

  test('Network Performance and Resource Analysis', async ({ page }) => {
    console.log('=== Starting Network Performance Analysis ===');

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Allow for async requests

    // Analyze network requests
    const totalRequests = networkRequests.length;
    const apiRequests = networkRequests.filter(req => req.url.includes('localhost:8001'));
    const staticRequests = networkRequests.filter(req => 
      ['document', 'stylesheet', 'script', 'image', 'font'].includes(req.resourceType)
    );

    console.log(`✓ Total network requests: ${totalRequests}`);
    console.log(`✓ API requests: ${apiRequests.length}`);
    console.log(`✓ Static resource requests: ${staticRequests.length}`);

    // Analyze resource sizes
    const resourcesWithSize = resourceLoadTimes.filter(res => res.contentLength > 0);
    const totalTransferSize = resourcesWithSize.reduce((sum, res) => sum + res.contentLength, 0);
    const averageResourceSize = resourcesWithSize.length > 0 ? 
      totalTransferSize / resourcesWithSize.length : 0;

    performanceMetrics.networkAnalysis = {
      totalRequests,
      apiRequests: apiRequests.length,
      staticRequests: staticRequests.length,
      totalTransferSize,
      averageResourceSize
    };

    console.log(`✓ Total transfer size: ${(totalTransferSize / 1024).toFixed(2)} KB`);
    console.log(`✓ Average resource size: ${(averageResourceSize / 1024).toFixed(2)} KB`);

    // Check for failed requests
    const failedRequests = resourceLoadTimes.filter(res => res.status >= 400);
    expect(failedRequests).toHaveLength(0);
    console.log(`✓ Failed requests: ${failedRequests.length}`);

    // Performance assertions
    expect(totalTransferSize).toBeLessThan(5 * 1024 * 1024); // Less than 5MB total
    expect(apiRequests.length).toBeLessThan(50); // Reasonable API call limit

    console.log('=== Network Performance Analysis Completed ===');
  });

  test('Memory Usage and Resource Management', async ({ page }) => {
    console.log('=== Starting Memory Usage Analysis ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (initialMemory) {
      console.log(`✓ Initial JS Heap Size: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`✓ Total JS Heap Size: ${(initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Simulate user interactions to test memory stability
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Test rapid interactions
    const interactiveElements = page.locator('button:visible, a:visible');
    const elementCount = await interactiveElements.count();
    
    for (let i = 0; i < Math.min(5, elementCount); i++) {
      const element = interactiveElements.nth(i);
      await element.focus();
      await page.waitForTimeout(100);
    }

    // Get memory usage after interactions
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      console.log(`✓ Memory change: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // Memory shouldn't increase dramatically during basic interactions
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    }

    performanceMetrics.memoryUsage = { initialMemory, finalMemory };

    console.log('=== Memory Usage Analysis Completed ===');
  });

  test('API Response Time Performance', async ({ page }) => {
    console.log('=== Starting API Performance Analysis ===');

    const apiTimings = [];

    // Monitor API calls with timing
    page.on('response', response => {
      if (response.url().includes('localhost:8001')) {
        const timing = response.request().timing();
        apiTimings.push({
          url: response.url(),
          status: response.status(),
          responseTime: timing?.responseEnd - timing?.requestStart || 0,
          timestamp: Date.now()
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Allow for API calls

    if (apiTimings.length > 0) {
      const averageResponseTime = apiTimings.reduce((sum, timing) => 
        sum + timing.responseTime, 0) / apiTimings.length;
      
      const slowestRequest = apiTimings.reduce((slowest, current) => 
        current.responseTime > slowest.responseTime ? current : slowest);

      console.log(`✓ API calls made: ${apiTimings.length}`);
      console.log(`✓ Average API response time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`✓ Slowest API call: ${slowestRequest.responseTime.toFixed(2)}ms (${slowestRequest.url})`);

      performanceMetrics.apiPerformance = {
        totalCalls: apiTimings.length,
        averageResponseTime,
        slowestRequest: slowestRequest.responseTime,
        slowestUrl: slowestRequest.url
      };

      // Performance assertions
      expect(averageResponseTime).toBeLessThan(2000); // Average response < 2s
      expect(slowestRequest.responseTime).toBeLessThan(5000); // Slowest < 5s
    } else {
      console.log('✓ No API calls detected (application might be static)');
    }

    console.log('=== API Performance Analysis Completed ===');
  });

  test('Rendering Performance and Frame Rate', async ({ page }) => {
    console.log('=== Starting Rendering Performance Analysis ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test scrolling performance
    const scrollPerformance = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        let startTime = performance.now();
        
        const measureFrames = () => {
          frameCount++;
          if (frameCount < 60) { // Measure 60 frames
            requestAnimationFrame(measureFrames);
          } else {
            const endTime = performance.now();
            const duration = endTime - startTime;
            const fps = (frameCount / duration) * 1000;
            resolve({ fps: fps.toFixed(2), duration: duration.toFixed(2) });
          }
        };

        // Start scrolling animation
        let scrollTop = 0;
        const scrollStep = () => {
          scrollTop += 10;
          window.scrollTo(0, scrollTop);
          if (scrollTop < 500) {
            requestAnimationFrame(scrollStep);
          }
        };

        requestAnimationFrame(() => {
          scrollStep();
          measureFrames();
        });
      });
    });

    console.log(`✓ Rendering FPS during scroll: ${scrollPerformance.fps}`);
    console.log(`✓ Frame measurement duration: ${scrollPerformance.duration}ms`);

    // Test viewport resize performance
    const viewportSizes = [
      { width: 1200, height: 800 },
      { width: 800, height: 600 },
      { width: 375, height: 667 },
      { width: 1920, height: 1080 }
    ];

    const resizeStartTime = Date.now();
    
    for (const size of viewportSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(200);
    }
    
    const resizeTotalTime = Date.now() - resizeStartTime;
    console.log(`✓ Viewport resize performance: ${resizeTotalTime}ms for ${viewportSizes.length} changes`);

    performanceMetrics.renderingPerformance = {
      scrollFps: parseFloat(scrollPerformance.fps),
      resizeTime: resizeTotalTime
    };

    // Performance assertions
    expect(parseFloat(scrollPerformance.fps)).toBeGreaterThan(30); // Minimum 30 FPS
    expect(resizeTotalTime).toBeLessThan(2000); // Quick viewport changes

    console.log('=== Rendering Performance Analysis Completed ===');
  });

  test('Bundle Size and Asset Optimization Analysis', async ({ page }) => {
    console.log('=== Starting Bundle Size Analysis ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Categorize resources by type
    const resourceTypes = {};
    
    resourceLoadTimes.forEach(resource => {
      if (!resourceTypes[resource.resourceType]) {
        resourceTypes[resource.resourceType] = [];
      }
      resourceTypes[resource.resourceType].push(resource);
    });

    // Analyze each resource type
    Object.keys(resourceTypes).forEach(type => {
      const resources = resourceTypes[type];
      const totalSize = resources.reduce((sum, res) => sum + res.contentLength, 0);
      const avgSize = resources.length > 0 ? totalSize / resources.length : 0;
      
      console.log(`✓ ${type.toUpperCase()}: ${resources.length} files, ${(totalSize / 1024).toFixed(2)} KB total, ${(avgSize / 1024).toFixed(2)} KB avg`);
    });

    // Check for common optimization issues
    const largeResources = resourceLoadTimes.filter(res => res.contentLength > 1024 * 1024); // > 1MB
    const uncompressedResources = resourceLoadTimes.filter(res => 
      ['script', 'stylesheet', 'document'].includes(res.resourceType) && 
      res.contentLength > 10240 // > 10KB but check if compressed
    );

    console.log(`✓ Large resources (>1MB): ${largeResources.length}`);
    console.log(`✓ Potentially uncompressed resources: ${uncompressedResources.length}`);

    // Check for unused CSS/JS (basic heuristic)
    const stylesheets = resourceLoadTimes.filter(res => res.resourceType === 'stylesheet');
    const scripts = resourceLoadTimes.filter(res => res.resourceType === 'script');
    
    console.log(`✓ Stylesheets loaded: ${stylesheets.length}`);
    console.log(`✓ Scripts loaded: ${scripts.length}`);

    performanceMetrics.bundleAnalysis = {
      resourceTypes: Object.keys(resourceTypes).reduce((acc, type) => {
        acc[type] = {
          count: resourceTypes[type].length,
          totalSize: resourceTypes[type].reduce((sum, res) => sum + res.contentLength, 0)
        };
        return acc;
      }, {}),
      largeResourcesCount: largeResources.length,
      totalStylesheets: stylesheets.length,
      totalScripts: scripts.length
    };

    // Bundle size assertions
    const totalJsSize = (resourceTypes.script || []).reduce((sum, res) => sum + res.contentLength, 0);
    const totalCssSize = (resourceTypes.stylesheet || []).reduce((sum, res) => sum + res.contentLength, 0);

    expect(totalJsSize).toBeLessThan(2 * 1024 * 1024); // JS bundle < 2MB
    expect(totalCssSize).toBeLessThan(500 * 1024); // CSS bundle < 500KB

    console.log('=== Bundle Size Analysis Completed ===');
  });

  test('Performance Metrics Summary Report', async ({ page }) => {
    console.log('=== Generating Performance Summary Report ===');

    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Compile comprehensive performance report
    const performanceReport = {
      timestamp: new Date().toISOString(),
      testEnvironment: {
        viewport: await page.viewportSize(),
        userAgent: await page.evaluate(() => navigator.userAgent)
      },
      metrics: performanceMetrics,
      networkSummary: {
        totalRequests: networkRequests.length,
        totalResponses: resourceLoadTimes.length,
        failedRequests: resourceLoadTimes.filter(res => res.status >= 400).length,
        resourceTypes: [...new Set(resourceLoadTimes.map(res => res.resourceType))]
      },
      recommendations: []
    };

    // Generate recommendations based on metrics
    if (performanceMetrics.webVitals?.firstContentfulPaint > 1800) {
      performanceReport.recommendations.push('Optimize First Contentful Paint - consider code splitting or reducing initial bundle size');
    }

    if (performanceMetrics.webVitals?.largestContentfulPaint > 2500) {
      performanceReport.recommendations.push('Optimize Largest Contentful Paint - optimize images and critical resources');
    }

    if (performanceMetrics.networkAnalysis?.totalRequests > 50) {
      performanceReport.recommendations.push('Consider reducing number of network requests through bundling or resource optimization');
    }

    if (performanceMetrics.apiPerformance?.averageResponseTime > 1000) {
      performanceReport.recommendations.push('Optimize API response times - consider caching, database optimization, or API pagination');
    }

    if (performanceMetrics.renderingPerformance?.scrollFps < 30) {
      performanceReport.recommendations.push('Improve rendering performance - optimize animations and DOM manipulations');
    }

    // Calculate overall performance score (0-100)
    let score = 100;
    
    if (performanceMetrics.webVitals?.firstContentfulPaint > 1800) score -= 15;
    if (performanceMetrics.webVitals?.largestContentfulPaint > 2500) score -= 15;
    if (performanceMetrics.networkAnalysis?.totalRequests > 30) score -= 10;
    if (performanceMetrics.apiPerformance?.averageResponseTime > 1000) score -= 15;
    if (performanceMetrics.renderingPerformance?.scrollFps < 30) score -= 10;
    if (performanceMetrics.memoryUsage?.finalMemory?.usedJSHeapSize > 50 * 1024 * 1024) score -= 10;

    performanceReport.overallScore = Math.max(0, score);
    performanceReport.grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    console.log('=== PERFORMANCE SUMMARY REPORT ===');
    console.log(JSON.stringify(performanceReport, null, 2));

    // Performance score assertions
    expect(performanceReport.overallScore).toBeGreaterThanOrEqual(70); // Minimum acceptable performance
    
    console.log(`✓ Overall Performance Score: ${performanceReport.overallScore}/100 (Grade: ${performanceReport.grade})`);
    console.log(`✓ Recommendations: ${performanceReport.recommendations.length}`);

    console.log('=== Performance Summary Report Generated ===');
  });
});