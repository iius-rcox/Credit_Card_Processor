const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let apiCalls = [];
  let statusUpdates = [];
  
  page.on('console', msg => {
    const text = msg.text();
    console.log(`📝 [${msg.type()}] ${text}`);
  });

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push({
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString()
      });
      console.log(`🌐 → ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`🌐 ← ${response.status()} ${response.url()}`);
      if (response.url().includes('/status') && response.status() === 200) {
        // Try to capture the response body
        response.json().then(data => {
          if (data.percent_complete !== undefined || data.status) {
            statusUpdates.push({
              status: data.status,
              percent_complete: data.percent_complete,
              current_employee: data.current_employee,
              timestamp: new Date().toISOString()
            });
            console.log(`📊 Status Update: ${data.status} - ${data.percent_complete}% - ${JSON.stringify(data.current_employee || {})}`);
          }
        }).catch(() => {});
      }
    }
  });

  try {
    console.log('=== MANUAL PROCESSING TEST ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Create new session
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    // Upload files
    console.log('1. Uploading files...');
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(1000);
    
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    await page.waitForTimeout(1000);
    
    // Upload files
    console.log('2. Starting upload...');
    const uploadButton = page.locator('text="Upload Files"');
    await uploadButton.click();
    
    // Wait for upload completion
    await page.waitForSelector('text=/ready to.*process|upload.*complete/i', { timeout: 30000 });
    console.log('3. Upload complete, files ready for processing');
    
    // Take screenshot before processing
    await page.screenshot({ path: 'before-processing.png', fullPage: true });
    
    // Start processing
    console.log('4. Looking for processing button...');
    
    // Multiple possible selectors for the processing button
    const processingButtonSelectors = [
      'button:has-text("Start Processing")',
      'button:has-text("Process Files")',
      'button:has-text("Begin Processing")',
      'button[type="submit"]',  // Form submission button
      'button:visible:not(:disabled)'
    ];
    
    let processingStarted = false;
    for (const selector of processingButtonSelectors) {
      const button = page.locator(selector);
      const count = await button.count();
      if (count > 0) {
        const isVisible = await button.first().isVisible();
        const text = await button.first().textContent();
        console.log(`   Found button: "${text}" (visible: ${isVisible})`);
        
        if (isVisible && (text.includes('Process') || text.includes('Start'))) {
          console.log('   Clicking processing button...');
          await button.first().click();
          processingStarted = true;
          break;
        }
      }
    }
    
    if (!processingStarted) {
      console.log('   No processing button found, checking if auto-processing started...');
    }
    
    console.log('5. Monitoring processing status...');
    let attempts = 0;
    const maxAttempts = 60; // 1 minute of monitoring
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(1000);
      attempts++;
      
      // Check current page state
      const currentStatus = await page.locator('text=/processing|complete|error/i').allTextContents();
      if (currentStatus.length > 0 && attempts % 5 === 0) {
        console.log(`⏳ Current status (${attempts}s): ${JSON.stringify(currentStatus)}`);
      }
      
      // Check for completion
      if (currentStatus.some(status => status.toLowerCase().includes('complete'))) {
        console.log('✅ Processing completed');
        break;
      }
      
      if (currentStatus.some(status => status.toLowerCase().includes('error'))) {
        console.log('❌ Processing error detected');
        break;
      }
    }
    
    await page.screenshot({ path: 'after-processing.png', fullPage: true });
    
    console.log('\n=== API MONITORING SUMMARY ===');
    console.log(`Total API calls: ${apiCalls.length}`);
    console.log(`Status updates captured: ${statusUpdates.length}`);
    
    console.log('\nRecent API calls:');
    apiCalls.slice(-10).forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.method} ${call.url}`);
    });
    
    console.log('\nStatus updates:');
    statusUpdates.forEach((update, i) => {
      console.log(`  ${i + 1}. ${update.status} - ${update.percent_complete}% - ${update.current_employee?.employee_name || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'processing-test-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);