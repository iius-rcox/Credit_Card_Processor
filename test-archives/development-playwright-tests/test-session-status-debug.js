const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let statusChanges = [];
  let apiCalls = [];
  
  page.on('console', msg => {
    const text = msg.text();
    console.log(`📝 [${msg.type()}] ${text}`);
    
    // Capture status changes
    if (text.includes('Processing started') || text.includes('status:') || text.includes('Status:')) {
      statusChanges.push({
        message: text,
        timestamp: new Date().toISOString()
      });
    }
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
    }
  });

  // Add JavaScript to monitor session store changes
  await page.addInitScript(() => {
    window.addEventListener('load', () => {
      // Try to access session store and monitor changes
      setTimeout(() => {
        if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
          console.log('Vue DevTools available - monitoring store');
        }
        
        // Periodically check session status
        setInterval(() => {
          try {
            // Try to access Vue app instance
            const app = document.querySelector('#app')?.__vue_app__;
            if (app) {
              console.log('Vue app found, checking for session store...');
            }
          } catch (e) {
            // Ignore
          }
        }, 5000);
      }, 1000);
    });
  });

  try {
    console.log('=== SESSION STATUS DEBUG TEST ===\n');
    
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
    
    // Monitor for longer to catch async status changes
    console.log('3. Monitoring for status changes...');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      attempts++;
      
      // Check various status indicators on page
      const statusElements = await page.locator('text=/status|processing|complete|ready/i').allTextContents();
      const notifications = await page.locator('.notification, [role="alert"]').allTextContents();
      
      if (attempts % 5 === 0) {
        console.log(`⏳ Status check (${attempts * 2}s):`);
        console.log(`   Page status texts: ${JSON.stringify(statusElements.slice(0, 3))}`);
        console.log(`   Notifications: ${JSON.stringify(notifications.slice(0, 2))}`);
      }
      
      // Check for completion indicators
      if (statusElements.some(text => text.toLowerCase().includes('complete'))) {
        console.log('✅ Processing completed detected');
        break;
      }
    }
    
    await page.screenshot({ path: 'session-status-debug.png', fullPage: true });
    
    console.log('\n=== SESSION DEBUG RESULTS ===');
    console.log(`API calls made: ${apiCalls.length}`);
    console.log(`Status changes captured: ${statusChanges.length}`);
    
    console.log('\nAPI calls:');
    apiCalls.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.method} ${call.url}`);
    });
    
    console.log('\nStatus changes:');
    statusChanges.forEach((change, i) => {
      console.log(`  ${i + 1}. ${change.message}`);
    });
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'session-debug-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);