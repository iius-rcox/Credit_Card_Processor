const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track validation errors
  let validationErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('MAX_FILE_SIZE is not defined')) {
      validationErrors.push(msg.text());
      console.log('❌ VALIDATION ERROR:', msg.text());
    } else if (msg.text().includes('validation') || msg.text().includes('VALIDATION')) {
      console.log(`[VALIDATION] ${msg.text()}`);
    }
  });

  try {
    console.log('=== TESTING VALIDATION FIX ===\n');
    
    console.log('1. Loading application...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Creating session...');
    await page.waitForTimeout(2000);
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('3. Testing file validation...');
    
    // Test with CAR file
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    
    await page.waitForTimeout(3000);
    
    // Test with Receipt file  
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    
    await page.waitForTimeout(3000);
    
    console.log('\n=== VALIDATION TEST RESULTS ===');
    if (validationErrors.length === 0) {
      console.log('✅ SUCCESS: No MAX_FILE_SIZE undefined errors detected');
      console.log('✅ File validation working correctly');
    } else {
      console.log('❌ FAILED: MAX_FILE_SIZE errors still occurring:');
      validationErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);