const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let consoleMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('failed') || text.includes('success') || text.includes('complete')) {
      consoleMessages.push(`[${msg.type().toUpperCase()}] ${text}`);
      console.log(`📝 [${msg.type().toUpperCase()}] ${text}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/upload')) {
      console.log(`🌐 Upload response: ${response.status()}`);
    }
  });

  try {
    console.log('=== TESTING UPLOAD AFTER PDF VALIDATION FIX ===\n');
    
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
    
    console.log('Monitoring for completion...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 15;
    
    while (!completed && attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      attempts++;
      
      // Check for success or error notifications
      const successNotification = await page.locator('text=/upload.*success|files.*uploaded.*successfully|upload.*complete/i').count();
      const errorNotification = await page.locator('text=/upload.*failed|validation.*error/i').count();
      
      if (successNotification > 0) {
        console.log('✅ Success notification found!');
        completed = true;
      } else if (errorNotification > 0) {
        console.log('❌ Error notification found');
        completed = true;
      } else if (attempts % 3 === 0) {
        console.log(`⏳ Still waiting... (${attempts}/${maxAttempts})`);
      }
    }
    
    await page.screenshot({ path: 'upload-after-fix.png', fullPage: true });
    
    console.log('\n=== RESULTS ===');
    console.log(`Completed: ${completed}`);
    console.log('Recent console messages:');
    consoleMessages.slice(-5).forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`);
    });
    
  } catch (error) {
    console.error('Test error:', error.message);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);