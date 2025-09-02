const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let statusCalls = [];
  let progressUpdates = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Progress') || text.includes('Status') || text.includes('Processing') || text.includes('%')) {
      console.log(`📝 [${msg.type()}] ${text}`);
    }
  });

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`🌐 → ${request.method()} ${request.url()}`);
      if (request.url().includes('/status')) {
        statusCalls.push({
          method: request.method(),
          url: request.url(),
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  page.on('response', async (response) => {
    if (response.url().includes('/status') && response.status() === 200) {
      try {
        const data = await response.json();
        progressUpdates.push({
          status: data.status,
          percent_complete: data.percent_complete,
          completed_employees: data.completed_employees,
          total_employees: data.total_employees,
          current_employee: data.current_employee?.employee_name,
          timestamp: new Date().toISOString()
        });
        console.log(`📊 Status: ${data.status} | Progress: ${data.percent_complete}% | Employee: ${data.current_employee?.employee_name || 'N/A'}`);
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    if (response.url().includes('/process') && response.status() === 202) {
      console.log(`✅ Processing started successfully`);
    }
  });

  try {
    console.log('=== TESTING PROGRESS POLLING FIX ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Create new session
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    // Upload files
    console.log('1. Uploading files...');
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(1000);
    
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    await page.waitForTimeout(1000);
    
    // Upload files
    console.log('2. Starting upload...');
    const uploadButton = page.locator('text="Upload Files"');
    await uploadButton.click();
    
    // Wait for upload completion
    await page.waitForSelector('text=/ready|upload.*complete/i', { timeout: 30000 });
    console.log('3. Upload complete, looking for processing button');
    
    // Wait a moment for UI to update
    await page.waitForTimeout(2000);
    
    // Find and click the processing button
    console.log('4. Starting processing...');
    const processButton = page.locator('text="Start Processing"').or(page.locator('text="Process Files"'));
    const processButtonCount = await processButton.count();
    
    if (processButtonCount > 0) {
      console.log(`   Found processing button, clicking...`);
      await processButton.click();
    } else {
      console.log('   No processing button found, may have auto-started');
    }
    
    console.log('5. Monitoring progress polling...');
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(1000);
      attempts++;
      
      // Check if we're getting status calls
      if (statusCalls.length > 0 && attempts % 5 === 0) {
        console.log(`⏳ Status polling active (${statusCalls.length} calls made)`);
      }
      
      // Check for processing completion
      const completedElements = await page.locator('text=/complete|finished|results/i').count();
      if (completedElements > 0) {
        console.log('✅ Processing completed');
        break;
      }
      
      // Check for errors
      const errorElements = await page.locator('text=/error|failed/i').count();
      if (errorElements > 0) {
        console.log('❌ Processing error detected');
        break;
      }
      
      if (attempts % 10 === 0) {
        console.log(`⏳ Still monitoring... (${attempts}s)`);
      }
    }
    
    await page.screenshot({ path: 'progress-polling-test.png', fullPage: true });
    
    console.log('\n=== PROGRESS POLLING RESULTS ===');
    console.log(`Status API calls made: ${statusCalls.length}`);
    console.log(`Progress updates received: ${progressUpdates.length}`);
    
    console.log('\nFirst 10 progress updates:');
    progressUpdates.slice(0, 10).forEach((update, i) => {
      console.log(`  ${i + 1}. ${update.status} - ${update.percent_complete}% - ${update.current_employee || 'N/A'} (${update.completed_employees}/${update.total_employees})`);
    });
    
    if (statusCalls.length === 0) {
      console.log('\n❌ ISSUE: No status polling was started');
    } else if (progressUpdates.length === 0) {
      console.log('\n❌ ISSUE: Status calls made but no progress data received');
    } else {
      console.log('\n✅ SUCCESS: Progress polling working correctly');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'progress-polling-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);