const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let processingMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('progress') || text.includes('percent') || text.includes('Processing') || text.includes('Status:')) {
      processingMessages.push(`[${msg.type().toUpperCase()}] ${text}`);
      console.log(`📝 ${text}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/status')) {
      console.log(`🌐 Status response: ${response.status()}`);
    }
  });

  try {
    console.log('=== TESTING PROCESSING PROGRESS INDICATORS (FIXED) ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('1. Uploading files...');
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(1000);
    
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    await page.waitForTimeout(1000);
    
    console.log('2. Starting upload...');
    const uploadButton = page.locator('text="Upload Files"');
    await uploadButton.click();
    
    // Wait for upload to complete
    console.log('3. Waiting for upload completion...');
    await page.waitForSelector('text=/upload.*complete|files.*uploaded.*successfully/i', { timeout: 30000 });
    
    console.log('4. Starting processing...');
    const processButton = page.locator('button:has-text("Process Files"), button:has-text("Start Processing")').first();
    if (await processButton.count() > 0) {
      await processButton.click();
    } else {
      console.log('   No process button found, looking for alternatives...');
      await page.screenshot({ path: 'no-process-button.png', fullPage: true });
    }
    
    console.log('5. Looking for progress indicators...');
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      attempts++;
      
      // Look for progress bars and percentages
      const progressBars = await page.locator('[style*="width"], .progress-bar, [class*="progress"]').count();
      const percentageTexts = await page.locator('text=/%/').count();
      const statusTexts = await page.locator('text=/Processing|progress|%/i').allTextContents();
      
      if (progressBars > 0 || percentageTexts > 0 || statusTexts.length > 0) {
        console.log(`📊 Progress indicators found (${attempts}):`);
        console.log(`   Progress bars: ${progressBars}`);
        console.log(`   Percentage texts: ${percentageTexts}`);
        console.log(`   Status texts: ${JSON.stringify(statusTexts.slice(0, 3))}`);
      }
      
      // Check for completion
      const completionIndicators = await page.locator('text=/processing.*complete|results.*available|finished/i').count();
      if (completionIndicators > 0) {
        console.log('✅ Processing appears complete');
        break;
      }
      
      if (attempts % 5 === 0) {
        console.log(`⏳ Still monitoring... (${attempts}/${maxAttempts})`);
        await page.screenshot({ path: `progress-fixed-${attempts}.png`, fullPage: true });
      }
    }
    
    await page.screenshot({ path: 'processing-progress-fixed.png', fullPage: true });
    
    console.log('\n=== PROGRESS MONITORING SUMMARY ===');
    console.log(`Processing messages captured: ${processingMessages.length}`);
    if (processingMessages.length > 0) {
      console.log('Recent processing messages:');
      processingMessages.slice(-10).forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg}`);
      });
    } else {
      console.log('No processing progress messages captured');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'processing-error-fixed.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);