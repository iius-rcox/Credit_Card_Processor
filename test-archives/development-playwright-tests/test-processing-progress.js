const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let processingMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('processing') || text.includes('progress') || text.includes('status')) {
      processingMessages.push(`[${msg.type().toUpperCase()}] ${text}`);
      console.log(`📝 ${text}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/process') || response.url().includes('/status') || response.url().includes('/progress')) {
      console.log(`🌐 ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('=== TESTING PROCESSING PROGRESS INDICATORS ===\n');
    
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
    const processButton = page.locator('text=/start.*processing|process.*files/i').first();
    await processButton.click();
    
    console.log('5. Monitoring processing progress...');
    let attempts = 0;
    const maxAttempts = 30;
    let lastProgressUpdate = '';
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      attempts++;
      
      // Look for progress indicators
      const progressElements = await page.locator('[class*="progress"], [class*="status"], text=/processing|progress|%/i').all();
      
      for (const element of progressElements) {
        try {
          const text = await element.textContent();
          const isVisible = await element.isVisible();
          if (isVisible && text && text !== lastProgressUpdate) {
            console.log(`📊 Progress (${attempts}): "${text}"`);
            lastProgressUpdate = text;
          }
        } catch (e) {
          // Skip elements that can't be read
        }
      }
      
      // Check for completion
      const completionIndicators = await page.locator('text=/processing.*complete|results.*available|finished/i').count();
      if (completionIndicators > 0) {
        console.log('✅ Processing appears complete');
        break;
      }
      
      if (attempts % 5 === 0) {
        console.log(`⏳ Still processing... (${attempts}/${maxAttempts})`);
        await page.screenshot({ path: `processing-progress-${attempts}.png`, fullPage: true });
      }
    }
    
    await page.screenshot({ path: 'processing-final.png', fullPage: true });
    
    console.log('\n=== PROCESSING PROGRESS SUMMARY ===');
    console.log(`Processing messages captured: ${processingMessages.length}`);
    console.log('Recent processing messages:');
    processingMessages.slice(-10).forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`);
    });
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'processing-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);