const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let allErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      allErrors.push(msg.text());
      console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
    }
  });

  try {
    console.log('=== CHECKING ALL VALIDATION ERRORS ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('Uploading first file...');
    const testFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General-S-89S,DD2LJ,DFRHA (6).pdf');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);
    
    await page.waitForTimeout(3000);
    
    console.log('Uploading second file...');
    const testFilePath2 = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const fileInput2 = page.locator('input[type="file"]').nth(1);
    await fileInput2.setInputFiles(testFilePath2);
    
    await page.waitForTimeout(3000);
    
    console.log('\n=== ERROR SUMMARY ===');
    if (allErrors.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      console.log(`❌ ${allErrors.length} console errors found:`);
      allErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    // Check for any error elements in the DOM
    await page.screenshot({ path: 'validation-errors.png', fullPage: true });
    console.log('Screenshot saved for inspection');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);