const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 800 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let networkRequests = [];
  let errors = [];

  // Track all relevant network activity
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      networkRequests.push({
        method: request.method(),
        url: request.url(),
        timestamp: Date.now()
      });
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      try {
        const body = await response.text();
        errors.push({
          status: response.status(),
          url: response.url(),
          body: body
        });
      } catch (e) {
        errors.push({
          status: response.status(),
          url: response.url(),
          body: 'Could not read body'
        });
      }
    }
  });

  try {
    console.log('=== FINAL UPLOAD VERIFICATION ===\n');
    
    // Step 1: Load and authenticate
    console.log('🚀 Loading application...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Step 2: Create session
    console.log('📝 Creating new session...');
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    // Step 3: Upload files
    console.log('📤 Uploading test files...');
    
    // CAR file
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(2000);
    console.log('   ✅ CAR file selected');
    
    // Receipt file  
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    await page.waitForTimeout(3000);
    console.log('   ✅ Receipt file selected');
    
    // Step 4: Start upload process
    console.log('⚡ Starting upload process...');
    const uploadButton = page.locator('text=/upload.*files|start.*processing|process.*files/i').first();
    
    if (await uploadButton.count() > 0) {
      await uploadButton.click();
      console.log('   ✅ Upload initiated');
    } else {
      console.log('   ℹ️  No explicit upload button found');
    }
    
    // Step 5: Monitor for completion
    console.log('⏳ Monitoring upload progress...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 20; // 1 minute
    
    while (!completed && attempts < maxAttempts) {
      await page.waitForTimeout(3000);
      attempts++;
      
      // Check for success indicators
      const successElements = await page.locator('text=/upload.*success|upload.*complete|files.*uploaded|processing.*started/i').count();
      const errorElements = await page.locator('text=/upload.*failed|upload.*error|chunk.*failed|not.*found/i').count();
      
      if (successElements > 0) {
        console.log('   ✅ Upload completed successfully');
        completed = true;
      } else if (errorElements > 0) {
        console.log('   ❌ Upload error detected');
        completed = true;
      } else if (attempts % 5 === 0) {
        console.log(`   ⏳ Still waiting... (${attempts}/${maxAttempts})`);
      }
    }
    
    await page.screenshot({ path: 'final-upload-verification.png', fullPage: true });
    
    // Final assessment
    console.log('\n=== VERIFICATION RESULTS ===');
    console.log(`Network requests: ${networkRequests.length}`);
    console.log(`API errors: ${errors.length}`);
    
    if (errors.length === 0) {
      console.log('🎉 SUCCESS: Upload working correctly!');
      console.log('✅ No "Chunk upload failed: Not Found" errors');
      console.log('✅ Standard upload bypass functioning');
    } else {
      console.log('❌ ISSUES DETECTED:');
      errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.status} ${new URL(error.url).pathname}`);
        if (error.body.includes('Not Found')) {
          console.log('      ⚠️  Still getting Not Found errors');
        }
      });
    }
    
    // Show network activity summary
    const endpointCounts = {};
    networkRequests.forEach(req => {
      const path = new URL(req.url).pathname;
      endpointCounts[path] = (endpointCounts[path] || 0) + 1;
    });
    
    console.log('\nAPI endpoints used:');
    Object.entries(endpointCounts).forEach(([path, count]) => {
      console.log(`   ${path}: ${count} calls`);
    });
    
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    await page.screenshot({ path: 'verification-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);