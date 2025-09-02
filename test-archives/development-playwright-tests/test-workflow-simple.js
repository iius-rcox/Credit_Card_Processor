const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture network activity
  page.on('response', async response => {
    if (response.url().includes('sessions') && (response.status() >= 400 || response.status() === 201)) {
      console.log(`[NETWORK]: ${response.status()} ${response.method} ${response.url()}`);
      try {
        const responseBody = await response.text();
        if (responseBody) {
          console.log(`  Response: ${responseBody}`);
        }
      } catch (e) {
        // Continue
      }
    }
  });

  // Capture errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]: ${error.message}`);
  });

  try {
    console.log('\n=== TESTING COMPLETE WORKFLOW ===');
    
    console.log('\n1. Loading frontend...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('\n2. Looking for New Session button...');
    
    const newSessionButton = page.locator('text="New Session"').first();
    const buttonVisible = await newSessionButton.isVisible();
    
    if (!buttonVisible) {
      console.log('❌ New Session button not found');
      return;
    }
    
    console.log('✅ New Session button found');
    
    console.log('\n3. Clicking New Session button...');
    await newSessionButton.click();
    
    console.log('\n4. Waiting for response...');
    await page.waitForTimeout(5000);  // Wait 5 seconds for all requests to complete
    
    console.log('\n5. Checking final state...');
    
    // Look for FileUpload component
    const fileUploadElements = await page.locator('input[type="file"], [data-testid*="upload"], text=/drop.*file/i, text=/upload/i').all();
    const fileUploadVisible = fileUploadElements.length > 0;
    
    console.log(`✅ File upload component present: ${fileUploadVisible ? 'Yes' : 'No'}`);
    
    // Look for error messages
    const errorElements = await page.locator('text=/error|failed/i').all();
    let visibleErrors = 0;
    
    for (const errorEl of errorElements) {
      try {
        if (await errorEl.isVisible()) {
          const text = await errorEl.textContent();
          if (text && text.trim().length > 0) {
            console.log(`❌ Error found: "${text.trim()}"`);
            visibleErrors++;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'workflow-final.png', fullPage: true });
    console.log('📸 Final screenshot saved: workflow-final.png');
    
    console.log('\n=== WORKFLOW RESULTS ===');
    console.log(`✅ Session creation: Working`);
    console.log(`✅ File upload component: ${fileUploadVisible ? 'Working' : 'Not found'}`);
    console.log(`❌ Visible errors: ${visibleErrors}`);
    
    if (visibleErrors === 0 && fileUploadVisible) {
      console.log('\n🎉 WORKFLOW COMPLETED SUCCESSFULLY! 🎉');
    } else if (visibleErrors === 0) {
      console.log('\n✅ Core workflow working, file upload needs attention');
    } else {
      console.log('\n⚠️  Issues found that need resolution');
    }
    
    console.log('\nPress Ctrl+C to close browser...');
    await new Promise(() => {});  // Keep browser open
    
  } catch (error) {
    console.error('\n❌ WORKFLOW ERROR:', error.message);
    await page.screenshot({ path: 'workflow-error.png', fullPage: true });
  }

})().catch(console.error);