const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let apiRequests = [];
  let apiResponses = [];
  let errorMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    console.log(`📝 [${msg.type()}] ${text}`);
    
    if (text.includes('error') || text.includes('Error') || text.includes('failed') || text.includes('Failed')) {
      errorMessages.push({
        type: msg.type(),
        message: text,
        timestamp: new Date().toISOString()
      });
    }
  });

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      const reqData = {
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      };
      
      if (request.postData()) {
        reqData.body = request.postData();
      }
      
      apiRequests.push(reqData);
      console.log(`🌐 → ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', async (response) => {
    if (response.url().includes('/api/')) {
      const resData = {
        status: response.status(),
        statusText: response.statusText(),
        url: response.url(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      };
      
      try {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          resData.body = await response.text();
        }
      } catch (e) {
        resData.bodyError = e.message;
      }
      
      apiResponses.push(resData);
      
      if (response.status() >= 400) {
        console.log(`🌐 ← ❌ ${response.status()} ${response.url()}`);
        if (resData.body) {
          console.log(`   Error body: ${resData.body}`);
        }
      } else {
        console.log(`🌐 ← ✅ ${response.status()} ${response.url()}`);
      }
    }
  });

  try {
    console.log('=== FULL WORKFLOW DEBUG TEST ===\n');
    
    console.log('STEP 1: Navigate to application');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('STEP 2: Create new session');
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(3000); // Give more time for session creation
    
    console.log('STEP 3: Upload files');
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(1000);
    
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    await page.waitForTimeout(1000);
    
    console.log('STEP 4: Start upload');
    const uploadButton = page.locator('text="Upload Files"');
    await uploadButton.click();
    
    console.log('STEP 5: Wait for upload completion');
    try {
      await page.waitForSelector('text="Start Processing"', { timeout: 45000 });
      console.log('✅ Upload completed successfully');
      
      await page.screenshot({ path: 'debug-after-upload.png', fullPage: true });
      
    } catch (e) {
      console.log('❌ Upload did not complete within timeout');
      await page.screenshot({ path: 'debug-upload-failed.png', fullPage: true });
      throw e;
    }
    
    console.log('STEP 6: Start processing');
    const processButton = page.locator('text="Start Processing"');
    await processButton.click();
    console.log('   Processing button clicked');
    
    await page.waitForTimeout(2000); // Give time for processing to start
    await page.screenshot({ path: 'debug-after-process-start.png', fullPage: true });
    
    console.log('STEP 7: Monitor processing for 30 seconds');
    let attempts = 0;
    const maxAttempts = 30;
    let lastStatusUpdate = '';
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(1000);
      attempts++;
      
      // Check for any error notifications
      const errorNotifications = await page.locator('text=/error|failed/i, [role="alert"]').allTextContents();
      const visibleErrors = errorNotifications.filter(text => text && text.trim().length > 0);
      
      if (visibleErrors.length > 0 && visibleErrors.some(error => error !== lastStatusUpdate)) {
        console.log(`❌ Error notification detected: ${JSON.stringify(visibleErrors)}`);
        lastStatusUpdate = visibleErrors[0];
        await page.screenshot({ path: `debug-error-${attempts}s.png`, fullPage: true });
      }
      
      // Check for processing completion
      const completedElements = await page.locator('text=/complete|finished|results/i').count();
      if (completedElements > 0) {
        console.log('✅ Processing completed');
        break;
      }
      
      if (attempts % 5 === 0) {
        console.log(`⏳ Monitoring... (${attempts}s)`);
        const statusElements = await page.locator('text=/progress|processing|status/i').allTextContents();
        if (statusElements.length > 0) {
          console.log(`   Status: ${JSON.stringify(statusElements.slice(0, 3))}`);
        }
      }
    }
    
    await page.screenshot({ path: 'debug-final-state.png', fullPage: true });
    
    console.log('\n=== WORKFLOW DEBUG RESULTS ===');
    console.log(`Total API requests: ${apiRequests.length}`);
    console.log(`Total API responses: ${apiResponses.length}`);
    console.log(`Error messages captured: ${errorMessages.length}`);
    
    console.log('\nAPI Requests:');
    apiRequests.forEach((req, i) => {
      console.log(`  ${i + 1}. ${req.method} ${req.url} (${req.timestamp})`);
    });
    
    console.log('\nAPI Responses:');
    apiResponses.forEach((res, i) => {
      console.log(`  ${i + 1}. ${res.status} ${res.url} (${res.timestamp})`);
      if (res.status >= 400 && res.body) {
        console.log(`      Error: ${res.body.substring(0, 200)}${res.body.length > 200 ? '...' : ''}`);
      }
    });
    
    console.log('\nError Messages:');
    errorMessages.forEach((error, i) => {
      console.log(`  ${i + 1}. [${error.type}] ${error.message}`);
    });
    
    // Look for specific status endpoint errors
    const statusErrors = apiResponses.filter(res => 
      res.url.includes('/status') && res.status >= 400
    );
    
    if (statusErrors.length > 0) {
      console.log('\n🔍 STATUS ENDPOINT ERRORS FOUND:');
      statusErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.status} ${error.statusText} - ${error.url}`);
        if (error.body) {
          console.log(`      Details: ${error.body}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'debug-test-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);