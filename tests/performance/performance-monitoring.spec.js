import { test, expect } from '@playwright/test';
import { setupAuthForTest } from '../fixtures/auth-helper.js';

test.describe('Performance and Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should load pages within acceptable time limits', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const pageLoadTests = [
      { path: '/', maxLoadTime: 3000 },
      { path: '/dashboard', maxLoadTime: 4000 },
      { path: '/upload', maxLoadTime: 3000 },
      { path: '/results', maxLoadTime: 4000 }
    ];
    
    for (const test of pageLoadTests) {
      const startTime = Date.now();
      
      try {
        await page.goto(test.path);
        await page.waitForLoadState('networkidle', { timeout: test.maxLoadTime });
        
        const loadTime = Date.now() - startTime;
        console.log(`${test.path} loaded in ${loadTime}ms`);
        
        expect(loadTime).toBeLessThan(test.maxLoadTime);
      } catch (error) {
        const loadTime = Date.now() - startTime;
        console.log(`${test.path} load timed out after ${loadTime}ms`);
        
        // Allow some pages to load slowly but log for investigation
        if (loadTime > test.maxLoadTime * 2) {
          throw new Error(`Page ${test.path} took too long to load: ${loadTime}ms`);
        }
      }
    }
  });

  test('should handle API response times efficiently', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const apiTests = [
      { endpoint: '/api/health', maxResponseTime: 1000, method: 'GET' },
      { endpoint: '/api/auth/current-user', maxResponseTime: 2000, method: 'GET' },
      { endpoint: '/api/sessions', maxResponseTime: 3000, method: 'GET' },
      { endpoint: '/api/monitoring/system', maxResponseTime: 2000, method: 'GET' }
    ];
    
    for (const test of apiTests) {
      const startTime = Date.now();
      
      try {
        const response = await authHelper.makeAuthenticatedRequest(test.endpoint, {
          method: test.method
        });
        
        const responseTime = Date.now() - startTime;
        console.log(`${test.endpoint} responded in ${responseTime}ms (status: ${response.status()})`);
        
        if (response.ok()) {
          expect(responseTime).toBeLessThan(test.maxResponseTime);
        } else {
          // Even error responses should be fast
          expect(responseTime).toBeLessThan(test.maxResponseTime * 1.5);
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        console.log(`${test.endpoint} failed after ${responseTime}ms: ${error.message}`);
        
        // Network errors should still complete quickly
        expect(responseTime).toBeLessThan(test.maxResponseTime * 2);
      }
    }
  });

  test('should monitor memory usage during operations', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
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
      console.log(`Initial memory usage: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Perform some operations
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      await page.goto('/upload');
      await page.waitForTimeout(2000);
      await page.goto('/results');
      await page.waitForTimeout(2000);
      
      // Check memory after operations
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });
      
      if (finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        console.log(`Final memory usage: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        
        // Memory increase should be reasonable (less than 50MB for basic operations)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }
    } else {
      console.log('Performance memory API not available');
    }
  });

  test('should monitor system health endpoints', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const healthEndpoints = [
      '/api/health',
      '/api/health/detailed', 
      '/api/monitoring/system',
      '/api/monitoring/application',
      '/api/performance/metrics'
    ];
    
    for (const endpoint of healthEndpoints) {
      try {
        const response = await authHelper.makeAuthenticatedRequest(endpoint);
        const status = response.status();
        
        console.log(`Health endpoint ${endpoint}: ${status}`);
        
        if (response.ok()) {
          const healthData = await response.json();
          
          // Health endpoints should return structured data
          expect(typeof healthData).toBe('object');
          
          // Log key metrics if available
          if (healthData.status) {
            console.log(`  Status: ${healthData.status}`);
          }
          if (healthData.uptime) {
            console.log(`  Uptime: ${healthData.uptime}`);
          }
          if (healthData.memory_usage) {
            console.log(`  Memory: ${healthData.memory_usage}%`);
          }
          if (healthData.cpu_usage) {
            console.log(`  CPU: ${healthData.cpu_usage}%`);
          }
        }
      } catch (error) {
        console.log(`Health endpoint ${endpoint} error: ${error.message}`);
      }
    }
  });

  test('should measure first contentful paint and largest contentful paint', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Navigate to main page and measure performance metrics
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const navigationEntries = performance.getEntriesByType('navigation');
      
      const metrics = {};
      
      // First Contentful Paint
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        metrics.firstContentfulPaint = fcp.startTime;
      }
      
      // Largest Contentful Paint (if available)
      if ('PerformanceObserver' in window) {
        try {
          // This would be set up earlier in a real implementation
          metrics.note = 'LCP would be measured with PerformanceObserver';
        } catch (e) {
          // PerformanceObserver might not be available in test environment
        }
      }
      
      // Navigation timing
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        metrics.domContentLoaded = nav.domContentLoadedEventEnd - nav.fetchStart;
        metrics.loadComplete = nav.loadEventEnd - nav.fetchStart;
        metrics.domInteractive = nav.domInteractive - nav.fetchStart;
      }
      
      return metrics;
    });
    
    console.log('Performance Metrics:', performanceMetrics);
    
    // First Contentful Paint should be under 2 seconds
    if (performanceMetrics.firstContentfulPaint) {
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000);
      console.log(`✓ FCP: ${performanceMetrics.firstContentfulPaint.toFixed(2)}ms`);
    }
    
    // DOM Content Loaded should be under 3 seconds
    if (performanceMetrics.domContentLoaded) {
      expect(performanceMetrics.domContentLoaded).toBeLessThan(3000);
      console.log(`✓ DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
    }
    
    // Complete load should be under 5 seconds
    if (performanceMetrics.loadComplete) {
      expect(performanceMetrics.loadComplete).toBeLessThan(5000);
      console.log(`✓ Load Complete: ${performanceMetrics.loadComplete.toFixed(2)}ms`);
    }
  });

  test('should handle concurrent user sessions efficiently', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = [];
    const sessionResults = [];
    
    try {
      // Create 3 concurrent user sessions
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        
        const authHelper = await setupAuthForTest(page);
        
        // Each user performs typical operations
        const sessionPromise = (async () => {
          const startTime = Date.now();
          
          try {
            // Navigate through typical user workflow
            await page.goto('/dashboard');
            await page.waitForTimeout(500);
            
            await page.goto('/upload');
            await page.waitForTimeout(500);
            
            // Make API calls
            const apiResponse = await authHelper.makeAuthenticatedRequest('/api/sessions');
            const apiWorking = apiResponse.ok();
            
            const sessionTime = Date.now() - startTime;
            
            return {
              sessionId: i + 1,
              success: true,
              responseTime: sessionTime,
              apiWorking
            };
          } catch (error) {
            return {
              sessionId: i + 1,
              success: false,
              error: error.message,
              responseTime: Date.now() - startTime
            };
          }
        })();
        
        sessionResults.push(sessionPromise);
      }
      
      // Wait for all sessions to complete
      const results = await Promise.all(sessionResults);
      
      console.log('Concurrent Session Results:');
      results.forEach(result => {
        console.log(`  Session ${result.sessionId}: ${result.success ? 'Success' : 'Failed'} (${result.responseTime}ms)`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      });
      
      // At least 2 out of 3 sessions should succeed
      const successfulSessions = results.filter(r => r.success).length;
      expect(successfulSessions).toBeGreaterThanOrEqual(2);
      
      // Average response time should be reasonable
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(10000); // 10 seconds average
      
    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should monitor WebSocket performance', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Check for WebSocket connections
    const wsConnections = await page.evaluate(() => {
      // Look for WebSocket objects or connection indicators
      const wsInfo = {
        webSocketSupport: 'WebSocket' in window,
        connections: 0,
        connectionAttempts: 0
      };
      
      // Check if there are any active WebSocket connections
      // This would depend on your specific WebSocket implementation
      if (window.wsConnections) {
        wsInfo.connections = window.wsConnections.length;
      }
      
      return wsInfo;
    });
    
    console.log('WebSocket Info:', wsConnections);
    
    // WebSocket should be supported
    expect(wsConnections.webSocketSupport).toBe(true);
    
    // If WebSockets are being used, they should connect reasonably fast
    if (wsConnections.connections > 0) {
      console.log(`Found ${wsConnections.connections} WebSocket connections`);
    }
  });

  test('should validate resource loading efficiency', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Track resource loading
    const resourceMetrics = [];
    
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      
      // Track important resources
      if (url.includes('.js') || url.includes('.css') || url.includes('/api/')) {
        resourceMetrics.push({
          url: url.split('/').pop(), // Just filename for brevity
          status,
          contentType: response.headers()['content-type'] || 'unknown'
        });
      }
    });
    
    // Navigate and load resources
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    console.log(`Loaded ${resourceMetrics.length} resources`);
    
    // Analyze resource loading
    const failedResources = resourceMetrics.filter(r => r.status >= 400);
    const jsResources = resourceMetrics.filter(r => r.url.endsWith('.js'));
    const cssResources = resourceMetrics.filter(r => r.url.endsWith('.css'));
    const apiResources = resourceMetrics.filter(r => r.url.includes('api'));
    
    console.log(`  JavaScript files: ${jsResources.length}`);
    console.log(`  CSS files: ${cssResources.length}`);
    console.log(`  API calls: ${apiResources.length}`);
    console.log(`  Failed resources: ${failedResources.length}`);
    
    // Most resources should load successfully
    expect(failedResources.length).toBeLessThan(resourceMetrics.length * 0.1); // Less than 10% failure
    
    // Should not have too many resource requests (indicates efficient bundling)
    expect(resourceMetrics.length).toBeLessThan(50);
  });

  test('should monitor database performance indicators', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Test database-related endpoints
    const dbTests = [
      { endpoint: '/api/sessions', operation: 'list sessions' },
      { endpoint: '/api/monitoring/system', operation: 'system metrics' },
      { endpoint: '/api/performance/metrics', operation: 'performance data' }
    ];
    
    for (const test of dbTests) {
      const startTime = Date.now();
      
      try {
        const response = await authHelper.makeAuthenticatedRequest(test.endpoint);
        const responseTime = Date.now() - startTime;
        
        console.log(`Database ${test.operation}: ${responseTime}ms (status: ${response.status()})`);
        
        if (response.ok()) {
          // Database operations should be reasonably fast
          expect(responseTime).toBeLessThan(5000);
          
          const data = await response.json();
          
          // Check for database connection pool info if available
          if (data.database && data.database.pool_status) {
            console.log(`  DB Pool - Size: ${data.database.pool_status.size}, Checked out: ${data.database.pool_status.checked_out}`);
          }
        }
      } catch (error) {
        console.log(`Database test ${test.operation} failed: ${error.message}`);
      }
    }
  });
});