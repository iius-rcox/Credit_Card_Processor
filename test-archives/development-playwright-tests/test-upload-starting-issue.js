const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let allConsoleMessages = [];
  let networkRequests = [];
  
  page.on('console', msg => {
    const text = msg.text();
    allConsoleMessages.push(`[${msg.type().toUpperCase()}] ${text}`);
    console.log(`📝 [${msg.type().toUpperCase()}] ${text}`);
  });

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      networkRequests.push({
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString()
      });
      console.log(`🌐 ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`📤 ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('=== INVESTIGATING UPLOAD STARTING ISSUE ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('Uploading files...');
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(2000);
    
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    await page.waitForTimeout(2000);
    
    console.log('Clicking Upload Files button...');
    const uploadButton = page.locator('text="Upload Files"');
    await uploadButton.click();
    
    console.log('Monitoring upload status...');
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(1000);
      attempts++;
      
      // Check current status
      const statusElements = await page.locator('[class*="status"], [class*="progress"], text=/Starting|Processing|Complete|Failed/i').all();
      
      for (const element of statusElements) {
        try {
          const text = await element.textContent();
          const isVisible = await element.isVisible();
          if (isVisible && text) {
            console.log(`⏳ Status (${attempts}): "${text}"`);
          }
        } catch (e) {
          // Skip elements that can't be read
        }
      }
      
      // Check for completion or errors
      const completionIndicators = await page.locator('text=/upload.*complete|processing.*complete|success/i').count();
      const errorIndicators = await page.locator('text=/upload.*failed|error/i').count();
      
      if (completionIndicators > 0) {
        console.log('✅ Upload appears complete');
        break;
      } else if (errorIndicators > 0) {
        console.log('❌ Upload error detected');
        break;
      }
    }
    
    await page.screenshot({ path: 'upload-starting-debug.png', fullPage: true });
    
    console.log('\n=== DEBUG SUMMARY ===');
    console.log(`Console messages: ${allConsoleMessages.length}`);
    console.log(`Network requests: ${networkRequests.length}`);
    
    console.log('\nRecent console messages:');
    allConsoleMessages.slice(-10).forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`);
    });
    
    console.log('\nNetwork requests:');
    networkRequests.forEach((req, i) => {
      console.log(`  ${i + 1}. ${req.method} ${req.url}`);
    });
    
  } catch (error) {
    console.error('Test error:', error.message);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);