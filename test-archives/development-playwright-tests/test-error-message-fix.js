const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let errorMessages = [];
  let infoMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('File name sanitized for security')) {
      if (msg.type() === 'error') {
        errorMessages.push(text);
        console.log('❌ STILL AN ERROR:', text);
      } else if (msg.type() === 'info') {
        infoMessages.push(text);
        console.log('✅ INFO MESSAGE:', text);
      } else {
        console.log(`[${msg.type().toUpperCase()}] ${text}`);
      }
    }
  });

  try {
    console.log('=== TESTING ERROR MESSAGE FIX ===\n');
    
    console.log('1. Loading application...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('2. Creating session...');
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('3. Testing filename sanitization...');
    
    // Upload a file with characters that get sanitized (parentheses, spaces)
    const testFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);
    
    await page.waitForTimeout(3000);
    
    // Upload another file with characters that get sanitized
    const testFilePath2 = path.resolve('tests/example-reports/Cardholder+Activity+Report+General-S-89S,DD2LJ,DFRHA (6).pdf');
    const fileInput2 = page.locator('input[type="file"]').nth(1);
    await fileInput2.setInputFiles(testFilePath2);
    
    await page.waitForTimeout(3000);
    
    console.log('\n=== RESULTS ===');
    console.log(`Error-level sanitization messages: ${errorMessages.length}`);
    console.log(`Info-level sanitization messages: ${infoMessages.length}`);
    
    if (errorMessages.length === 0) {
      console.log('✅ SUCCESS: No more error-level filename sanitization messages!');
      if (infoMessages.length > 0) {
        console.log('✅ Filename sanitization now logged as info (not shown to user)');
      }
    } else {
      console.log('❌ STILL SHOWING ERROR MESSAGES:');
      errorMessages.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg}`);
      });
    }
    
    // Check if any error dialogs are visible in the UI
    const errorDialogs = await page.locator('text=/Error.*File validation error|Security error.*File name sanitized/i').count();
    console.log(`Error dialogs visible in UI: ${errorDialogs}`);
    
    if (errorDialogs === 0) {
      console.log('✅ No error dialogs showing filename sanitization');
    } else {
      console.log('❌ Error dialogs still visible in UI');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);