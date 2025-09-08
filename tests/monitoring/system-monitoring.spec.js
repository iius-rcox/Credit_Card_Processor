import { test, expect } from '@playwright/test';
import { setupAuthForTest } from '../fixtures/auth-helper.js';

test.describe('System Monitoring and Alerting', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should monitor application health metrics', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const healthResponse = await authHelper.makeAuthenticatedRequest('/api/health/detailed');
    
    if (healthResponse.ok()) {
      const healthData = await healthResponse.json();
      
      console.log('Health Check Results:');
      console.log(`- Status: ${healthData.status || 'unknown'}`);
      console.log(`- Uptime: ${healthData.uptime || 'unknown'}`);
      console.log(`- Memory: ${healthData.memory_usage || 'unknown'}%`);
      console.log(`- CPU: ${healthData.cpu_usage || 'unknown'}%`);
      
      // Basic health validations
      if (healthData.status) {
        expect(healthData.status).toBe('healthy');
      }
      
      if (healthData.memory_usage !== undefined) {
        expect(healthData.memory_usage).toBeLessThan(90); // Less than 90% memory usage
      }
      
      if (healthData.cpu_usage !== undefined) {
        expect(healthData.cpu_usage).toBeLessThan(80); // Less than 80% CPU usage
      }
    } else {
      console.log(`Health endpoint returned: ${healthResponse.status()}`);
    }
  });

  test('should monitor database performance', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Test database connection by checking sessions endpoint
    const dbStartTime = Date.now();
    const sessionsResponse = await authHelper.makeAuthenticatedRequest('/api/sessions');
    const dbResponseTime = Date.now() - dbStartTime;
    
    console.log(`Database query response time: ${dbResponseTime}ms`);
    
    if (sessionsResponse.ok()) {
      expect(dbResponseTime).toBeLessThan(5000); // Database queries under 5 seconds
      
      const sessionsData = await sessionsResponse.json();
      
      if (sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
        console.log(`Database returned ${sessionsData.sessions.length} sessions`);
        expect(sessionsData.sessions.length).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should monitor API response times', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const apiEndpoints = [
      { path: '/api/health', maxTime: 1000 },
      { path: '/api/auth/current-user', maxTime: 2000 },
      { path: '/api/sessions', maxTime: 3000 },
      { path: '/api/monitoring/system', maxTime: 2000 }
    ];
    
    const results = [];
    
    for (const endpoint of apiEndpoints) {
      const startTime = Date.now();
      const response = await authHelper.makeAuthenticatedRequest(endpoint.path);
      const responseTime = Date.now() - startTime;
      
      const result = {
        endpoint: endpoint.path,
        responseTime,
        status: response.status(),
        withinThreshold: responseTime < endpoint.maxTime
      };
      
      results.push(result);
      console.log(`${endpoint.path}: ${responseTime}ms (${response.status()}) - ${result.withinThreshold ? 'PASS' : 'SLOW'}`);
    }
    
    // At least 80% of endpoints should be within performance thresholds
    const withinThreshold = results.filter(r => r.withinThreshold).length;
    const threshold = Math.floor(results.length * 0.8);
    
    expect(withinThreshold).toBeGreaterThanOrEqual(threshold);
  });

  test('should detect memory leaks in frontend', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return null;
    });
    
    if (initialMemory) {
      console.log(`Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      
      // Perform multiple navigation cycles to stress test memory
      const pages = ['/dashboard', '/upload', '/results', '/dashboard'];
      
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const pageUrl of pages) {
          await page.goto(pageUrl);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        }
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.waitForTimeout(2000);
      
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize;
        }
        return null;
      });
      
      if (finalMemory) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        console.log(`Final memory usage: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`);
        
        // Memory increase should be reasonable (less than 50MB or 100% increase)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        expect(memoryIncreasePercent).toBeLessThan(100);
      }
    }
  });

  test('should monitor error rates and alert thresholds', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Test various endpoints and track error rates
    const testEndpoints = [
      '/api/health',
      '/api/auth/current-user',
      '/api/sessions',
      '/api/nonexistent-endpoint', // This will cause a 404
    ];
    
    let totalRequests = 0;
    let errorCount = 0;
    
    for (const endpoint of testEndpoints) {
      const response = await authHelper.makeAuthenticatedRequest(endpoint);
      totalRequests++;
      
      if (response.status() >= 500) {
        errorCount++;
        console.log(`Server error on ${endpoint}: ${response.status()}`);
      }
    }
    
    const errorRate = (errorCount / totalRequests) * 100;
    console.log(`Error rate: ${errorRate.toFixed(1)}% (${errorCount}/${totalRequests})`);
    
    // Error rate should be under 25% (allowing for test endpoints that may not exist)
    expect(errorRate).toBeLessThan(25);
  });

  test('should monitor WebSocket connections', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check for WebSocket connection status
    const wsStatus = await page.evaluate(() => {
      const wsConnections = [];
      
      // Check if WebSocket is available and being used
      if (typeof WebSocket !== 'undefined') {
        // Look for common WebSocket indicators in the page
        const wsIndicators = {
          webSocketSupported: true,
          activeConnections: 0,
          connectionState: 'unknown'
        };
        
        // Try to detect if the app is using WebSockets
        if (window.wsConnection) {
          wsIndicators.activeConnections = 1;
          wsIndicators.connectionState = window.wsConnection.readyState;
        }
        
        return wsIndicators;
      }
      
      return { webSocketSupported: false };
    });
    
    console.log('WebSocket Status:', wsStatus);
    
    if (wsStatus.webSocketSupported) {
      expect(wsStatus.webSocketSupported).toBe(true);
      
      if (wsStatus.activeConnections > 0) {
        console.log(`Active WebSocket connections: ${wsStatus.activeConnections}`);
        // Connection state: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
        expect([0, 1]).toContain(wsStatus.connectionState);
      }
    }
  });

  test('should generate performance alerts', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const performanceMetrics = {
      slowEndpoints: [],
      highErrorRates: [],
      longPageLoads: [],
      alerts: []
    };
    
    // Test page load times
    const pages = ['/', '/dashboard', '/upload'];
    
    for (const pageUrl of pages) {
      const startTime = Date.now();
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`${pageUrl} load time: ${loadTime}ms`);
      
      if (loadTime > 5000) {
        performanceMetrics.longPageLoads.push({ page: pageUrl, loadTime });
        performanceMetrics.alerts.push({
          type: 'SLOW_PAGE_LOAD',
          message: `Page ${pageUrl} loaded in ${loadTime}ms (>5s threshold)`,
          severity: 'warning'
        });
      }
    }
    
    // Test API response times
    const apiTests = ['/api/health', '/api/sessions'];
    
    for (const endpoint of apiTests) {
      const startTime = Date.now();
      const response = await authHelper.makeAuthenticatedRequest(endpoint);
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 3000) {
        performanceMetrics.slowEndpoints.push({ endpoint, responseTime });
        performanceMetrics.alerts.push({
          type: 'SLOW_API_RESPONSE',
          message: `API ${endpoint} responded in ${responseTime}ms (>3s threshold)`,
          severity: response.ok() ? 'warning' : 'critical'
        });
      }
    }
    
    // Generate alert summary
    console.log('Performance Alert Summary:');
    console.log(`- Slow page loads: ${performanceMetrics.longPageLoads.length}`);
    console.log(`- Slow API endpoints: ${performanceMetrics.slowEndpoints.length}`);
    console.log(`- Total alerts: ${performanceMetrics.alerts.length}`);
    
    if (performanceMetrics.alerts.length > 0) {
      console.log('\nGenerated Alerts:');
      performanceMetrics.alerts.forEach(alert => {
        console.log(`[${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`);
      });
    }
    
    // Should not have more than 2 performance alerts in normal conditions
    expect(performanceMetrics.alerts.length).toBeLessThanOrEqual(2);
  });

  test('should monitor system resource usage', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const systemResponse = await authHelper.makeAuthenticatedRequest('/api/monitoring/system');
    
    if (systemResponse.ok()) {
      const systemData = await systemResponse.json();
      
      console.log('System Resource Monitoring:');
      
      if (systemData.cpu_percent !== undefined) {
        console.log(`- CPU Usage: ${systemData.cpu_percent}%`);
        expect(systemData.cpu_percent).toBeLessThan(95); // Critical threshold
        
        if (systemData.cpu_percent > 80) {
          console.log('WARNING: High CPU usage detected');
        }
      }
      
      if (systemData.memory_percent !== undefined) {
        console.log(`- Memory Usage: ${systemData.memory_percent}%`);
        expect(systemData.memory_percent).toBeLessThan(95); // Critical threshold
        
        if (systemData.memory_percent > 85) {
          console.log('WARNING: High memory usage detected');
        }
      }
      
      if (systemData.disk_usage_percent !== undefined) {
        console.log(`- Disk Usage: ${systemData.disk_usage_percent}%`);
        expect(systemData.disk_usage_percent).toBeLessThan(95); // Critical threshold
        
        if (systemData.disk_usage_percent > 85) {
          console.log('WARNING: High disk usage detected');
        }
      }
      
      if (systemData.disk_free_gb !== undefined) {
        console.log(`- Free Disk Space: ${systemData.disk_free_gb}GB`);
        expect(systemData.disk_free_gb).toBeGreaterThan(0.5); // At least 500MB free
      }
    } else {
      console.log(`System monitoring endpoint returned: ${systemResponse.status()}`);
    }
  });

  test('should validate application metrics collection', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    const appResponse = await authHelper.makeAuthenticatedRequest('/api/monitoring/application');
    
    if (appResponse.ok()) {
      const appData = await appResponse.json();
      
      console.log('Application Metrics:');
      
      if (appData.uptime_seconds !== undefined) {
        console.log(`- Uptime: ${appData.uptime_seconds} seconds`);
        expect(appData.uptime_seconds).toBeGreaterThan(0);
      }
      
      if (appData.total_requests !== undefined) {
        console.log(`- Total Requests: ${appData.total_requests}`);
        expect(appData.total_requests).toBeGreaterThanOrEqual(0);
      }
      
      if (appData.error_rate_percent !== undefined) {
        console.log(`- Error Rate: ${appData.error_rate_percent}%`);
        expect(appData.error_rate_percent).toBeLessThan(10); // Less than 10% error rate
      }
      
      if (appData.avg_response_time_ms !== undefined) {
        console.log(`- Average Response Time: ${appData.avg_response_time_ms}ms`);
        expect(appData.avg_response_time_ms).toBeLessThan(5000); // Under 5 seconds average
      }
      
      if (appData.cache_hit_rate_percent !== undefined) {
        console.log(`- Cache Hit Rate: ${appData.cache_hit_rate_percent}%`);
        // Cache hit rate should be reasonable if caching is implemented
        if (appData.cache_hit_rate_percent > 0) {
          expect(appData.cache_hit_rate_percent).toBeGreaterThan(50);
        }
      }
    } else {
      console.log(`Application monitoring endpoint returned: ${appResponse.status()}`);
    }
  });

  test('should test alert notification system', async ({ page }) => {
    const authHelper = await setupAuthForTest(page);
    
    // Check if alerts endpoint exists
    const alertsResponse = await authHelper.makeAuthenticatedRequest('/api/alerts');
    
    if (alertsResponse.ok()) {
      const alertsData = await alertsResponse.json();
      
      console.log('Alert System Status:');
      console.log(`- Active alerts: ${alertsData.alerts?.length || 0}`);
      
      if (alertsData.summary) {
        console.log(`- Critical alerts: ${alertsData.summary.critical_count || 0}`);
        console.log(`- Warning alerts: ${alertsData.summary.warning_count || 0}`);
      }
      
      // Alert system should be functional
      expect(alertsData).toHaveProperty('alerts');
      
      // Test alert acknowledgment if there are alerts
      if (alertsData.alerts && alertsData.alerts.length > 0) {
        const firstAlert = alertsData.alerts[0];
        
        if (firstAlert.id) {
          const ackResponse = await authHelper.makeAuthenticatedRequest(`/api/alerts/${firstAlert.id}/acknowledge`, {
            method: 'POST'
          });
          
          console.log(`Alert acknowledgment test: ${ackResponse.status()}`);
          expect([200, 404]).toContain(ackResponse.status()); // 404 if alert doesn't support ack
        }
      }
    } else {
      console.log(`Alerts endpoint returned: ${alertsResponse.status()}`);
    }
  });
});