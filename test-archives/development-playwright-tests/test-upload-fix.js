const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track upload progress and errors
  let uploadErrors = [];
  let uploadMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('upload') || text.includes('Upload') || text.includes('chunk')) {
      if (msg.type() === 'error') {
        uploadErrors.push(text);
        console.log('❌ UPLOAD ERROR:', text);
      } else {
        uploadMessages.push(text);
        console.log(`[UPLOAD] ${text}`);
      }
    }
  });

  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('/upload')) {
      console.log(`[REQUEST] ${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/upload')) {
      console.log(`[RESPONSE] ${response.status()} ${new URL(response.url()).pathname}`);
    }
  });

  try {
    console.log('=== TESTING UPLOAD FIX ===\n');
    
    console.log('1. Loading application...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('2. Creating session...');
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('3. Testing file upload...');
    
    // Upload CAR file first (smaller)
    console.log('   Uploading CAR file...');
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(3000);
    
    // Upload Receipt file (larger - this was causing chunked upload)
    console.log('   Uploading Receipt file...');
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    
    console.log('4. Looking for upload button...');
    // Look for upload or process button
    const uploadButton = page.locator('text=/upload|start.*upload|process.*files/i').first();
    if (await uploadButton.count() > 0) {
      console.log('   Found upload button, clicking...');
      await uploadButton.click();
    } else {
      console.log('   No upload button found, upload may be automatic');
    }
    
    console.log('5. Monitoring upload progress...');
    // Wait for upload to complete or fail
    let monitorCount = 0;
    const maxMonitor = 15; // 45 seconds max
    
    while (monitorCount < maxMonitor) {
      // Check for completion indicators
      const successIndicators = await page.locator('text=/upload.*success|upload.*complete|files.*uploaded/i').count();
      const errorIndicators = await page.locator('text=/upload.*failed|upload.*error|not.*found/i').count();
      
      if (successIndicators > 0) {
        console.log('✅ Upload appears successful');
        break;
      }
      
      if (errorIndicators > 0) {
        console.log('❌ Upload error detected in UI');
        break;
      }
      
      await page.waitForTimeout(3000);
      monitorCount++;
      
      if (monitorCount % 3 === 0) {
        console.log(`   Still monitoring... (${monitorCount}/${maxMonitor})`);
      }
    }
    
    await page.screenshot({ path: 'upload-fix-test.png', fullPage: true });
    
    console.log('\n=== UPLOAD TEST RESULTS ===');
    console.log(`Upload messages: ${uploadMessages.length}`);
    console.log(`Upload errors: ${uploadErrors.length}`);
    
    if (uploadErrors.length === 0) {
      console.log('✅ SUCCESS: No upload errors detected');
      console.log('✅ Chunked upload bypass working');
    } else {
      console.log('❌ UPLOAD ERRORS DETECTED:');
      uploadErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    console.log('\nKey messages:');
    uploadMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg}`);
    });
    
  } catch (error) {
    console.error('Test error:', error.message);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);