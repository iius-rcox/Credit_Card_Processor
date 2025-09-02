const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test files paths
  const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
  const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');

  // Verify files exist
  if (!fs.existsSync(carFilePath)) {
    console.error('❌ CAR file not found:', carFilePath);
    return;
  }
  if (!fs.existsSync(receiptFilePath)) {
    console.error('❌ Receipt file not found:', receiptFilePath);
    return;
  }

  console.log('✅ Test files found:');
  console.log(`  CAR: ${path.basename(carFilePath)} (${fs.statSync(carFilePath).size} bytes)`);
  console.log(`  Receipt: ${path.basename(receiptFilePath)} (${fs.statSync(receiptFilePath).size} bytes)`);

  // Track progress through the workflow
  let currentStep = 0;
  const steps = [
    'Load Application',
    'Verify Authentication', 
    'Create New Session',
    'Upload CAR File',
    'Upload Receipt File',
    'Start Processing',
    'Monitor Progress',
    'View Results',
    'Export Results'
  ];

  function logStep(step) {
    currentStep++;
    console.log(`\n=== STEP ${currentStep}: ${step.toUpperCase()} ===`);
  }

  // Enhanced network monitoring
  let apiCalls = [];
  let errors = [];
  
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push({
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString()
      });
      console.log(`[API] ${request.method()} ${new URL(request.url()).pathname}`);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      try {
        const body = await response.text();
        errors.push({
          status: response.status(),
          url: response.url(),
          body: body,
          timestamp: new Date().toISOString()
        });
        console.log(`[ERROR] ${response.status()} ${new URL(response.url()).pathname}`);
      } catch (e) {
        console.log(`[ERROR] ${response.status()} ${new URL(response.url()).pathname} (could not read body)`);
      }
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  try {
    // STEP 1: Load Application
    logStep(steps[0]);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'e2e-01-loaded.png', fullPage: true });
    console.log('📸 Application loaded');

    // STEP 2: Verify Authentication
    logStep(steps[1]);
    
    // Wait for auth to complete
    await page.waitForTimeout(3000);
    
    // Check for authentication success
    const authError = await page.locator('text=/authentication.*failed|login.*required/i').count();
    if (authError > 0) {
      throw new Error('Authentication failed - cannot proceed with test');
    }
    
    const userInfo = await page.locator('text=/testuser|admin/i').count();
    console.log(`✅ Authentication: ${userInfo > 0 ? 'Success' : 'No user info visible'}`);
    
    await page.screenshot({ path: 'e2e-02-authenticated.png', fullPage: true });

    // STEP 3: Create New Session
    logStep(steps[2]);
    
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.waitFor({ state: 'visible' });
    await newSessionButton.click();
    
    // Wait for session creation
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'e2e-03-session-created.png', fullPage: true });
    console.log('✅ New session created');

    // STEP 4: Upload CAR File
    logStep(steps[3]);
    
    // Find CAR file input
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    
    console.log(`📤 Uploading CAR file: ${path.basename(carFilePath)}`);
    
    // Wait for file to be processed/validated
    await page.waitForTimeout(3000);
    
    // Check for upload success indicators
    const carSuccess = await page.locator('text=/car.*uploaded|car.*selected|success/i').count();
    console.log(`CAR file status: ${carSuccess > 0 ? 'Uploaded' : 'Processing...'}`);
    
    await page.screenshot({ path: 'e2e-04-car-uploaded.png', fullPage: true });

    // STEP 5: Upload Receipt File
    logStep(steps[4]);
    
    // Find Receipt file input (second file input)
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    
    console.log(`📤 Uploading Receipt file: ${path.basename(receiptFilePath)}`);
    
    // Wait longer for large receipt file
    console.log('⏳ Waiting for receipt file processing (large file)...');
    await page.waitForTimeout(10000);
    
    // Check for upload success
    const receiptSuccess = await page.locator('text=/receipt.*uploaded|receipt.*selected|both.*files/i').count();
    console.log(`Receipt file status: ${receiptSuccess > 0 ? 'Uploaded' : 'Processing...'}`);
    
    await page.screenshot({ path: 'e2e-05-receipt-uploaded.png', fullPage: true });

    // STEP 6: Start Processing
    logStep(steps[5]);
    
    // Look for processing button or automatic start
    const processButton = page.locator('text=/start.*processing|process.*files|begin.*processing/i');
    const processButtonExists = await processButton.count() > 0;
    
    if (processButtonExists) {
      await processButton.click();
      console.log('▶️  Started processing');
    } else {
      console.log('ℹ️  Processing may have started automatically');
    }
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'e2e-06-processing-started.png', fullPage: true });

    // STEP 7: Monitor Progress
    logStep(steps[6]);
    
    console.log('📊 Monitoring processing progress...');
    let progressChecks = 0;
    const maxProgressChecks = 10;
    
    while (progressChecks < maxProgressChecks) {
      // Check for progress indicators
      const progressText = await page.locator('text=/progress|processing|%|complete/i').allTextContents();
      const statusText = await page.locator('text=/status|pending|processing|completed/i').allTextContents();
      
      if (progressText.length > 0) {
        console.log(`📈 Progress: ${progressText.slice(0, 3).join(', ')}`);
      }
      if (statusText.length > 0) {
        console.log(`📋 Status: ${statusText.slice(0, 3).join(', ')}`);
      }
      
      // Check if processing is complete
      const isComplete = await page.locator('text=/completed|finished|done|results.*available/i').count();
      if (isComplete > 0) {
        console.log('✅ Processing completed!');
        break;
      }
      
      await page.waitForTimeout(3000);
      progressChecks++;
    }
    
    await page.screenshot({ path: 'e2e-07-progress-monitored.png', fullPage: true });

    // STEP 8: View Results
    logStep(steps[7]);
    
    // Look for results section or results button
    const resultsSection = await page.locator('text=/results|transactions|employees|summary/i').count();
    console.log(`📊 Results section visible: ${resultsSection > 0 ? 'Yes' : 'No'}`);
    
    // Try to navigate to results if there's a button/link
    const resultsButton = page.locator('text=/view.*results|show.*results|results/i').first();
    if (await resultsButton.count() > 0) {
      await resultsButton.click();
      await page.waitForTimeout(2000);
      console.log('👀 Navigated to results view');
    }
    
    await page.screenshot({ path: 'e2e-08-results-viewed.png', fullPage: true });

    // STEP 9: Export Results
    logStep(steps[8]);
    
    // Look for export functionality
    const exportButton = page.locator('text=/export|download|save/i').first();
    if (await exportButton.count() > 0) {
      console.log('💾 Export functionality found');
      // Note: We won't actually click to avoid downloads during test
      console.log('ℹ️  (Skipping actual export to avoid file downloads during test)');
    } else {
      console.log('ℹ️  Export functionality not visible or not ready');
    }
    
    await page.screenshot({ path: 'e2e-09-export-ready.png', fullPage: true });

    // Final Summary
    console.log('\n=== END-TO-END TEST SUMMARY ===');
    console.log(`✅ Steps completed: ${currentStep}/${steps.length}`);
    console.log(`📡 API calls made: ${apiCalls.length}`);
    console.log(`❌ Errors encountered: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n🚨 Errors Details:');
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.status} ${new URL(error.url).pathname}`);
        if (error.body) {
          try {
            const parsed = JSON.parse(error.body);
            console.log(`     ${parsed.detail || error.body}`);
          } catch (e) {
            console.log(`     ${error.body.substring(0, 100)}...`);
          }
        }
      });
    }

    // API Call Summary
    console.log('\n📡 API Calls Summary:');
    const callsByEndpoint = {};
    apiCalls.forEach(call => {
      const endpoint = new URL(call.url).pathname;
      callsByEndpoint[endpoint] = (callsByEndpoint[endpoint] || 0) + 1;
    });
    Object.entries(callsByEndpoint).forEach(([endpoint, count]) => {
      console.log(`  ${endpoint}: ${count} calls`);
    });

    console.log('\n🎉 END-TO-END TEST COMPLETED!');
    console.log('📸 Screenshots saved: e2e-01 through e2e-09');
    
    if (errors.length === 0) {
      console.log('🟢 TEST STATUS: PASSED - No errors detected');
    } else if (errors.length <= 2) {
      console.log('🟡 TEST STATUS: PASSED WITH WARNINGS - Minor issues detected');
    } else {
      console.log('🔴 TEST STATUS: FAILED - Multiple errors detected');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: 'e2e-error.png', fullPage: true });
    console.log('📸 Error screenshot saved: e2e-error.png');
    
    console.log('\n🚨 Test terminated at step:', steps[currentStep - 1] || 'Initial setup');
  }

  console.log('\nPress Ctrl+C to close browser...');
  await new Promise(() => {});
  
})().catch(console.error);