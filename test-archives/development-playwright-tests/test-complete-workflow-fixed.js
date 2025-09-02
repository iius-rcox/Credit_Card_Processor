const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let statusCalls = [];
  let progressUpdates = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Progress') || text.includes('processing') || text.includes('Status') || text.includes('polling')) {
      console.log(`📝 ${text}`);
    }
  });

  page.on('request', request => {
    if (request.url().includes('/status')) {
      statusCalls.push({
        url: request.url(),
        timestamp: new Date().toISOString()
      });
      console.log(`🌐 → Status polling: ${request.url()}`);
    } else if (request.url().includes('/process')) {
      console.log(`🌐 → Processing: ${request.url()}`);
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
        console.log(`📊 ${data.status} | ${data.percent_complete}% | ${data.completed_employees}/${data.total_employees} | ${data.current_employee?.employee_name || 'N/A'}`);
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    if (response.url().includes('/process') && response.status() === 202) {
      console.log(`✅ Processing started successfully (${response.status()})`);
    }
  });

  try {
    console.log('=== COMPLETE WORKFLOW TEST ===\n');
    
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
    
    // Wait for upload completion and Start Processing button
    console.log('3. Waiting for upload completion...');
    await page.waitForSelector('text="Start Processing"', { timeout: 30000 });
    console.log('✅ Upload completed, Start Processing button appeared');
    
    // Click Start Processing button
    console.log('4. Starting processing...');
    const processButton = page.locator('text="Start Processing"');
    await processButton.click();
    console.log('   Processing button clicked');
    
    // Monitor processing
    console.log('5. Monitoring processing progress...');
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds
    let lastProgress = -1;
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(1000);
      attempts++;
      
      // Show progress updates
      if (progressUpdates.length > 0) {
        const latest = progressUpdates[progressUpdates.length - 1];
        if (latest.percent_complete !== lastProgress) {
          console.log(`⏳ Progress: ${latest.percent_complete}% (${latest.completed_employees}/${latest.total_employees} employees)`);
          lastProgress = latest.percent_complete;
        }
      }
      
      // Check for processing completion
      const completedElements = await page.locator('text=/complete|finished|results/i').count();
      if (completedElements > 0) {
        console.log('✅ Processing completed');
        break;
      }
      
      // Show periodic status
      if (attempts % 10 === 0) {
        console.log(`⏳ Still processing... (${attempts}s) - ${statusCalls.length} status calls made`);
      }
    }
    
    await page.screenshot({ path: 'complete-workflow-test.png', fullPage: true });
    
    console.log('\n=== WORKFLOW TEST RESULTS ===');
    console.log(`Status polling calls: ${statusCalls.length}`);
    console.log(`Progress updates received: ${progressUpdates.length}`);
    
    if (statusCalls.length > 0) {
      console.log('✅ SUCCESS: Status polling was initiated');
      
      if (progressUpdates.length > 0) {
        console.log('✅ SUCCESS: Progress data was received');
        
        // Show progress summary
        const firstUpdate = progressUpdates[0];
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        console.log(`   Progress: ${firstUpdate.percent_complete}% → ${lastUpdate.percent_complete}%`);
        console.log(`   Employees: ${firstUpdate.completed_employees}/${firstUpdate.total_employees} → ${lastUpdate.completed_employees}/${lastUpdate.total_employees}`);
        
      } else {
        console.log('⚠️  Status calls made but no progress data received');
      }
    } else {
      console.log('❌ ISSUE: No status polling was started');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'complete-workflow-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);