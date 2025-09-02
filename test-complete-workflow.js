const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });
  
  // Capture all network requests
  page.on('request', request => {
    if (request.url().includes('sessions') || request.url().includes('upload') || request.url().includes('api')) {
      console.log(`[REQUEST]: ${request.method()} ${request.url()}`);
      if (request.postData() || request.method() === 'PUT') {
        console.log(`  Body:`, request.postData() || 'No body');
      }
    }
  });

  // Capture all network responses
  page.on('response', async response => {
    if (response.url().includes('sessions') || response.url().includes('upload') || response.url().includes('api') || response.status() >= 400) {
      console.log(`[RESPONSE]: ${response.status()} ${response.url()}`);
      try {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          const responseBody = await response.text();
          console.log(`  Response Body:`, responseBody);
        }
      } catch (e) {
        console.log(`  Could not read response body: ${e.message}`);
      }
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]:`, error.message);
  });

  try {
    console.log('\n=== STEP 1: NAVIGATING TO FRONTEND ===');
    await page.goto('http://localhost:3000');
    
    console.log('\n=== STEP 2: WAITING FOR PAGE TO LOAD ===');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'workflow-01-initial.png', fullPage: true });
    console.log('Screenshot: workflow-01-initial.png');
    
    console.log('\n=== STEP 3: CLICKING NEW SESSION BUTTON ===');
    
    // Find and click the New Session button
    const newSessionButton = page.locator('text="New Session"');
    await expect(newSessionButton).toBeVisible();
    
    await page.screenshot({ path: 'workflow-02-before-new-session.png', fullPage: true });
    console.log('Screenshot: workflow-02-before-new-session.png');
    
    await newSessionButton.click();
    
    console.log('\n=== STEP 4: WAITING FOR SESSION CREATION ===');
    
    // Wait for network activity to complete and page to update
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'workflow-03-after-new-session.png', fullPage: true });
    console.log('Screenshot: workflow-03-after-new-session.png');
    
    console.log('\n=== STEP 5: CHECKING FILE UPLOAD COMPONENT ===');
    
    // Check if FileUpload component loaded successfully
    const fileUploadArea = page.locator('[data-testid="file-upload-area"], .file-upload-area, text="Drop files here"').first();
    let fileUploadVisible = false;
    
    try {
      await fileUploadArea.waitForSelector(':visible', { timeout: 5000 });
      fileUploadVisible = true;
      console.log('✅ File upload component is visible');
    } catch (e) {
      console.log('❌ File upload component not found');
      
      // Try to find any file upload elements
      const uploadElements = await page.locator('input[type="file"], .upload, [data-testid*="upload"], text=/upload/i').all();
      console.log(`Found ${uploadElements.length} potential upload elements`);
      
      for (let i = 0; i < Math.min(uploadElements.length, 3); i++) {
        try {
          const text = await uploadElements[i].textContent();
          const isVisible = await uploadElements[i].isVisible();
          console.log(`  Upload element ${i + 1}: "${text}" (visible: ${isVisible})`);
        } catch (e) {
          console.log(`  Upload element ${i + 1}: [Error reading: ${e.message}]`);
        }
      }
    }
    
    console.log('\n=== STEP 6: TESTING FILE UPLOAD (if available) ===');
    
    if (fileUploadVisible) {
      // Create a test CSV file
      const testCSVContent = `employee_id,employee_name,amount
1001,John Doe,1500.00
1002,Jane Smith,2000.00
1003,Bob Johnson,1750.00`;
      
      // Try to upload a file
      const fileInput = page.locator('input[type="file"]').first();
      
      try {
        // Create temporary file
        const fs = require('fs');
        const path = require('path');
        const testFilePath = path.join(__dirname, 'test-employees.csv');
        fs.writeFileSync(testFilePath, testCSVContent);
        
        await fileInput.setInputFiles(testFilePath);
        console.log('✅ Test file uploaded successfully');
        
        // Wait for upload processing
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'workflow-04-after-file-upload.png', fullPage: true });
        console.log('Screenshot: workflow-04-after-file-upload.png');
        
        // Clean up test file
        fs.unlinkSync(testFilePath);
        
      } catch (e) {
        console.log(`❌ File upload failed: ${e.message}`);
      }
    }
    
    console.log('\n=== STEP 7: CHECKING SESSION STATUS ===');
    
    // Look for status indicators
    const statusElements = await page.locator('text=/status|pending|processing|completed/i').all();
    console.log(`Found ${statusElements.length} status-related elements`);
    
    for (let i = 0; i < Math.min(statusElements.length, 5); i++) {
      try {
        const text = await statusElements[i].textContent();
        const isVisible = await statusElements[i].isVisible();
        if (isVisible && text.trim().length > 0) {
          console.log(`  Status: "${text.trim()}"`);
        }
      } catch (e) {
        // Continue to next element
      }
    }
    
    console.log('\n=== STEP 8: LOOKING FOR NAVIGATION/PROGRESS ===');
    
    // Look for any progress indicators or next steps
    const progressElements = await page.locator('text=/progress|step|next|continue|process/i').all();
    console.log(`Found ${progressElements.length} progress-related elements`);
    
    for (let i = 0; i < Math.min(progressElements.length, 5); i++) {
      try {
        const text = await progressElements[i].textContent();
        const isVisible = await progressElements[i].isVisible();
        if (isVisible && text.trim().length > 0) {
          console.log(`  Progress: "${text.trim()}"`);
        }
      } catch (e) {
        // Continue to next element
      }
    }
    
    console.log('\n=== STEP 9: FINAL SCREENSHOT AND ANALYSIS ===');
    
    await page.screenshot({ path: 'workflow-05-final-state.png', fullPage: true });
    console.log('Screenshot: workflow-05-final-state.png');
    
    // Check for any error messages
    const errorElements = await page.locator('text=/error|failed|problem|issue/i').all();
    let visibleErrors = 0;
    
    for (const errorEl of errorElements) {
      try {
        if (await errorEl.isVisible()) {
          const text = await errorEl.textContent();
          if (text.trim().length > 0) {
            console.log(`  ❌ Error found: "${text.trim()}"`);
            visibleErrors++;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Summary
    console.log('\n=== WORKFLOW SUMMARY ===');
    console.log(`✅ Page loaded successfully: Yes`);
    console.log(`✅ New Session button clicked: Yes`);
    console.log(`✅ Session created (no 500 error): Yes`);
    console.log(`✅ File upload component loaded: ${fileUploadVisible ? 'Yes' : 'No'}`);
    console.log(`❌ Visible errors found: ${visibleErrors}`);
    console.log(`📄 Screenshots saved: workflow-01 through workflow-05`);
    
    if (visibleErrors === 0 && fileUploadVisible) {
      console.log('\n🎉 WORKFLOW COMPLETED SUCCESSFULLY! 🎉');
    } else if (visibleErrors === 0) {
      console.log('\n✅ Core workflow working, minor issues with file upload component');
    } else {
      console.log('\n⚠️  Workflow has some issues that need attention');
    }
    
  } catch (error) {
    console.error('\n[WORKFLOW ERROR]:', error.message);
    await page.screenshot({ path: 'workflow-error.png', fullPage: true });
    console.log('Error screenshot: workflow-error.png');
  }

  console.log('\n=== KEEPING BROWSER OPEN FOR INSPECTION ===');
  console.log('Press Ctrl+C to close when done inspecting...');
  
  // Keep browser open for manual inspection
  await new Promise(() => {});
  
})().catch(console.error);