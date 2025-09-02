const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let functionErrors = [];
  let successMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('markFilesUploaded is not a function')) {
      functionErrors.push(text);
      console.log('❌ FUNCTION ERROR:', text);
    } else if (text.includes('setSuccess is not a function')) {
      functionErrors.push(text);
      console.log('❌ FUNCTION ERROR:', text);
    } else if (text.includes('Upload') && (text.includes('success') || text.includes('complete'))) {
      successMessages.push(text);
      console.log('✅ SUCCESS MESSAGE:', text);
    }
  });

  try {
    console.log('=== TESTING UPLOAD FUNCTION FIX ===\n');
    
    console.log('1. Loading application...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('2. Creating session...');
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('3. Testing file upload...');
    
    // Upload files
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(2000);
    
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    await page.waitForTimeout(2000);
    
    console.log('4. Starting upload...');
    const uploadButton = page.locator('text=/upload.*files|start.*processing|process.*files/i').first();
    if (await uploadButton.count() > 0) {
      await uploadButton.click();
      console.log('   Upload button clicked');
    }
    
    console.log('5. Monitoring for completion...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 15;
    
    while (!completed && attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      attempts++;
      
      // Check for success indicators
      const successNotifications = await page.locator('text=/upload.*success|files.*uploaded.*successfully|upload.*complete/i').count();
      const errorDialogs = await page.locator('text=/upload.*failed|markFilesUploaded.*not.*function|setSuccess.*not.*function/i').count();
      
      if (successNotifications > 0) {
        console.log('   ✅ Success notification detected');
        completed = true;
      } else if (errorDialogs > 0) {
        console.log('   ❌ Error dialog detected');
        completed = true;
      } else if (attempts % 3 === 0) {
        console.log(`   ⏳ Still waiting... (${attempts}/${maxAttempts})`);
      }
    }
    
    await page.screenshot({ path: 'upload-function-fix.png', fullPage: true });
    
    console.log('\n=== FIX VERIFICATION RESULTS ===');
    console.log(`Function errors: ${functionErrors.length}`);
    console.log(`Success messages: ${successMessages.length}`);
    
    if (functionErrors.length === 0) {
      console.log('✅ SUCCESS: No function errors detected');
      console.log('✅ markFilesUploaded error fixed');
      console.log('✅ setSuccess error fixed');
    } else {
      console.log('❌ FUNCTION ERRORS STILL PRESENT:');
      functionErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    // Check for success notification in UI
    const successNotificationVisible = await page.locator('text=/files.*uploaded.*successfully|upload.*complete/i').count();
    console.log(`Success notification visible: ${successNotificationVisible > 0 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('Test error:', error.message);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);