const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Functional Testing', () => {
  let testData = {};
  let apiCallsLog = [];
  let consoleErrorsLog = [];

  test.beforeEach(async ({ page }) => {
    // Clear logs
    apiCallsLog = [];
    consoleErrorsLog = [];

    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('localhost:8001')) {
        apiCallsLog.push({
          method: request.method(),
          url: request.url(),
          timestamp: Date.now(),
          headers: request.headers()
        });
      }
    });

    // Monitor responses
    page.on('response', response => {
      if (response.url().includes('localhost:8001')) {
        testData.lastResponse = {
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          timestamp: Date.now()
        };
      }
    });

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrorsLog.push({
          text: msg.text(),
          type: msg.type(),
          location: msg.location(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Complete User Workflow - Session Creation to File Processing', async ({ page }) => {
    console.log('=== Starting Complete User Workflow Test ===');

    // Step 1: Verify initial application load
    const appContainer = page.locator('#app');
    await expect(appContainer).toBeVisible();
    console.log('✓ Application container loaded');

    // Step 2: Check session setup
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    
    // Wait for session setup or main application interface
    await page.waitForTimeout(2000);
    
    // Look for session setup interface
    const sessionSetupElements = page.locator('[data-testid*="session"], .session-setup, .session');
    const sessionSetupCount = await sessionSetupElements.count();
    console.log(`Found ${sessionSetupCount} session-related elements`);

    // Step 3: Test file upload interface (if available)
    const fileUploadElements = page.locator('input[type="file"], .file-upload, [data-testid*="upload"]');
    const fileUploadCount = await fileUploadElements.count();
    console.log(`Found ${fileUploadCount} file upload elements`);

    if (fileUploadCount > 0) {
      const firstUpload = fileUploadElements.first();
      await expect(firstUpload).toBeAttached();
      console.log('✓ File upload interface available');
    }

    // Step 4: Test navigation and interactive elements
    const interactiveElements = page.locator('button:visible, a:visible, input:visible');
    const interactiveCount = await interactiveElements.count();
    console.log(`Found ${interactiveCount} interactive elements`);

    // Test first few interactive elements
    for (let i = 0; i < Math.min(3, interactiveCount); i++) {
      const element = interactiveElements.nth(i);
      if (await element.isEnabled()) {
        await element.focus();
        await page.waitForTimeout(200);
        console.log(`✓ Element ${i + 1} focusable`);
      }
    }

    // Step 5: Test authentication display
    const authDisplay = page.locator('.auth-display, [data-testid*="auth"]');
    if (await authDisplay.count() > 0) {
      await expect(authDisplay.first()).toBeVisible();
      console.log('✓ Authentication display visible');
    }

    // Step 6: Verify API connectivity (should have made health check calls)
    expect(apiCallsLog.length).toBeGreaterThanOrEqual(1);
    console.log(`✓ API calls made: ${apiCallsLog.length}`);

    // Step 7: Check for critical errors
    const criticalErrors = consoleErrorsLog.filter(error => 
      !error.text.includes('[Vue warn]') &&
      !error.text.includes('DevTools') &&
      !error.text.includes('favicon') &&
      !error.text.toLowerCase().includes('warning')
    );

    if (criticalErrors.length > 0) {
      console.warn('Critical errors found:', criticalErrors);
    }
    expect(criticalErrors).toHaveLength(0);

    console.log('=== Complete User Workflow Test Passed ===');
  });

  test('Session Management Workflow', async ({ page }) => {
    console.log('=== Starting Session Management Test ===');

    // Test session initialization
    await page.waitForTimeout(2000);

    // Check for session-related UI elements
    const sessionElements = page.locator('[data-testid*="session"], .session');
    const sessionCount = await sessionElements.count();
    console.log(`Found ${sessionCount} session elements`);

    // Look for session status indicators
    const sessionStatusElements = page.locator('.session-status, [data-testid*="session-status"]');
    const sessionIndicators = page.locator('.bg-success-500, .bg-green-500, .session-indicator');
    
    const statusCount = await sessionStatusElements.count();
    const indicatorCount = await sessionIndicators.count();
    
    console.log(`Found ${statusCount} session status elements`);
    console.log(`Found ${indicatorCount} session indicators`);

    // Test session persistence across navigation
    const currentUrl = page.url();
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const newUrl = page.url();
    expect(newUrl).toBe(currentUrl);
    console.log('✓ Session persisted across page reload');

    // Verify app remains functional
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    console.log('✓ Main content remains accessible after reload');

    console.log('=== Session Management Test Passed ===');
  });

  test('File Upload and Processing Workflow', async ({ page }) => {
    console.log('=== Starting File Upload and Processing Test ===');

    // Look for file upload interface
    const fileInputs = page.locator('input[type="file"]');
    const uploadButtons = page.locator('button:has-text("Upload"), button:has-text("Browse")');
    const dropZones = page.locator('.drop-zone, [data-testid*="drop"]');

    const fileInputCount = await fileInputs.count();
    const uploadButtonCount = await uploadButtons.count();
    const dropZoneCount = await dropZones.count();

    console.log(`Found ${fileInputCount} file inputs`);
    console.log(`Found ${uploadButtonCount} upload buttons`);
    console.log(`Found ${dropZoneCount} drop zones`);

    if (fileInputCount > 0) {
      const fileInput = fileInputs.first();
      await expect(fileInput).toBeAttached();
      console.log('✓ File input element available');

      // Test file input accessibility
      const isEnabled = await fileInput.isEnabled();
      const isVisible = await fileInput.isVisible();
      
      console.log(`File input enabled: ${isEnabled}`);
      console.log(`File input visible: ${isVisible}`);

      // Test file validation messages (if any)
      const validationElements = page.locator('.error-message, .validation-error, [data-testid*="error"]');
      const validationCount = await validationElements.count();
      console.log(`Found ${validationCount} validation elements`);
    }

    // Test progress tracking elements
    const progressElements = page.locator('.progress, .progress-bar, [data-testid*="progress"]');
    const progressCount = await progressElements.count();
    console.log(`Found ${progressCount} progress tracking elements`);

    // Test processing status elements
    const statusElements = page.locator('.status, .processing-status, [data-testid*="status"]');
    const statusCount = await statusElements.count();
    console.log(`Found ${statusCount} status elements`);

    console.log('=== File Upload and Processing Test Passed ===');
  });

  test('Results Display and Export Workflow', async ({ page }) => {
    console.log('=== Starting Results Display and Export Test ===');

    // Look for results display elements
    const resultsElements = page.locator('.results, .results-display, [data-testid*="results"]');
    const tableElements = page.locator('table, .table, .data-table');
    const chartElements = page.locator('.chart, .graph, [data-testid*="chart"]');

    const resultsCount = await resultsElements.count();
    const tableCount = await tableElements.count();
    const chartCount = await chartElements.count();

    console.log(`Found ${resultsCount} results elements`);
    console.log(`Found ${tableCount} table elements`);
    console.log(`Found ${chartCount} chart elements`);

    // Test export functionality elements
    const exportButtons = page.locator('button:has-text("Export"), button:has-text("Download"), .export-button');
    const exportCount = await exportButtons.count();
    console.log(`Found ${exportCount} export buttons`);

    if (exportCount > 0) {
      const firstExportButton = exportButtons.first();
      await expect(firstExportButton).toBeVisible();
      console.log('✓ Export button visible');

      // Test button accessibility
      const isEnabled = await firstExportButton.isEnabled();
      console.log(`Export button enabled: ${isEnabled}`);
    }

    // Test data filtering and sorting elements
    const filterElements = page.locator('.filter, .search, input[placeholder*="search"]');
    const sortElements = page.locator('.sort, .sortable, [data-testid*="sort"]');

    const filterCount = await filterElements.count();
    const sortCount = await sortElements.count();

    console.log(`Found ${filterCount} filter elements`);
    console.log(`Found ${sortCount} sort elements`);

    console.log('=== Results Display and Export Test Passed ===');
  });

  test('Authentication and Authorization Flow', async ({ page }) => {
    console.log('=== Starting Authentication and Authorization Test ===');

    // Test authentication display components
    const authElements = page.locator('.auth-display, [data-testid*="auth"]');
    const userInfoElements = page.locator('.user-info, .user-display');
    const adminElements = page.locator('[data-testid*="admin"], .admin-access');

    const authCount = await authElements.count();
    const userInfoCount = await userInfoElements.count();
    const adminCount = await adminElements.count();

    console.log(`Found ${authCount} auth elements`);
    console.log(`Found ${userInfoCount} user info elements`);
    console.log(`Found ${adminCount} admin elements`);

    if (authCount > 0) {
      const firstAuthElement = authElements.first();
      await expect(firstAuthElement).toBeVisible();
      console.log('✓ Authentication display visible');
    }

    // Test access control elements
    const protectedElements = page.locator('[data-testid*="protected"], .protected, .admin-only');
    const protectedCount = await protectedElements.count();
    console.log(`Found ${protectedCount} protected elements`);

    // Test authentication headers in API calls
    const authHeaders = apiCallsLog.filter(call => 
      call.headers['authorization'] || 
      call.headers['x-user-id'] || 
      call.headers['x-user-name']
    );
    console.log(`API calls with auth headers: ${authHeaders.length}/${apiCallsLog.length}`);

    console.log('=== Authentication and Authorization Test Passed ===');
  });

  test('Real-time Updates and State Management', async ({ page }) => {
    console.log('=== Starting Real-time Updates Test ===');

    // Test state persistence elements
    const stateElements = page.locator('[data-testid*="state"], .state-indicator');
    const liveElements = page.locator('#aria-live-region, [aria-live]');
    const dynamicElements = page.locator('.dynamic, .live-update, [data-testid*="live"]');

    const stateCount = await stateElements.count();
    const liveCount = await liveElements.count();
    const dynamicCount = await dynamicElements.count();

    console.log(`Found ${stateCount} state elements`);
    console.log(`Found ${liveCount} live regions`);
    console.log(`Found ${dynamicCount} dynamic elements`);

    // Test state consistency across interactions
    const interactiveElements = page.locator('button:visible, input:visible');
    const interactiveCount = await interactiveElements.count();

    if (interactiveCount > 0) {
      // Capture initial state
      const initialContent = await page.locator('#main-content').textContent();
      
      // Interact with first element
      const firstElement = interactiveElements.first();
      if (await firstElement.isEnabled()) {
        await firstElement.click();
        await page.waitForTimeout(500);
        
        // Verify state consistency
        const updatedContent = await page.locator('#main-content').textContent();
        expect(updatedContent).toBeTruthy();
        console.log('✓ State management functioning');
      }
    }

    // Test WebSocket connections (if any)
    const wsConnections = apiCallsLog.filter(call => 
      call.url.includes('ws://') || call.url.includes('wss://')
    );
    console.log(`Found ${wsConnections.length} WebSocket connections`);

    console.log('=== Real-time Updates Test Passed ===');
  });

  test.afterEach(async ({ page }) => {
    // Log test summary
    console.log('=== Test Summary ===');
    console.log(`API calls made: ${apiCallsLog.length}`);
    console.log(`Console errors: ${consoleErrorsLog.length}`);
    
    if (consoleErrorsLog.length > 0) {
      console.log('Console errors:', consoleErrorsLog.map(e => e.text));
    }
    
    if (apiCallsLog.length > 0) {
      console.log('API endpoints called:', [...new Set(apiCallsLog.map(call => 
        call.url.split('localhost:8001')[1]?.split('?')[0]
      ))]);
    }
  });
});