const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('completed') || text.includes('Processing') || text.includes('button')) {
      console.log(`📝 ${text}`);
    }
  });

  try {
    console.log('=== TESTING START PROCESSING BUTTON ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Create new session
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('1. Initial button state check:');
    const initialButtons = await page.locator('button:visible').allTextContents();
    console.log(`   Visible buttons: ${JSON.stringify(initialButtons)}`);
    
    // Upload files
    console.log('\n2. Uploading files...');
    const carFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General--March 2025.pdf');
    const carFileInput = page.locator('input[type="file"]').first();
    await carFileInput.setInputFiles(carFilePath);
    await page.waitForTimeout(1000);
    
    const receiptFilePath = path.resolve('tests/example-reports/Receipt_Images_Report-Jackie_09-30-2022 (3).pdf');
    const receiptFileInput = page.locator('input[type="file"]').nth(1);
    await receiptFileInput.setInputFiles(receiptFilePath);
    await page.waitForTimeout(1000);
    
    console.log('3. Files selected, checking for Upload Files button:');
    const uploadButton = page.locator('text="Upload Files"');
    const uploadButtonExists = await uploadButton.count();
    console.log(`   Upload Files button exists: ${uploadButtonExists > 0}`);
    
    if (uploadButtonExists > 0) {
      console.log('   Clicking Upload Files button...');
      await uploadButton.click();
      
      // Wait for upload to complete
      console.log('4. Waiting for upload completion...');
      let uploadCompleted = false;
      let attempts = 0;
      
      while (!uploadCompleted && attempts < 30) {
        await page.waitForTimeout(1000);
        attempts++;
        
        // Check for upload completion indicators
        const completionTexts = await page.locator('text=/upload.*complete|successfully.*uploaded/i').allTextContents();
        const startProcessingButton = await page.locator('text="Start Processing"').count();
        const allButtons = await page.locator('button:visible').allTextContents();
        
        if (startProcessingButton > 0) {
          console.log(`✅ Start Processing button appeared after ${attempts}s!`);
          uploadCompleted = true;
        } else if (completionTexts.length > 0) {
          console.log(`   Upload completion detected: ${JSON.stringify(completionTexts)}`);
        }
        
        if (attempts % 5 === 0) {
          console.log(`   Status check (${attempts}s): buttons = ${JSON.stringify(allButtons)}`);
        }
      }
      
      await page.screenshot({ path: 'processing-button-test.png', fullPage: true });
      
      console.log('\n5. Final button state:');
      const finalButtons = await page.locator('button:visible').allTextContents();
      console.log(`   All visible buttons: ${JSON.stringify(finalButtons)}`);
      
      const startProcessingButton = page.locator('text="Start Processing"');
      const processingButtonCount = await startProcessingButton.count();
      
      if (processingButtonCount > 0) {
        console.log('✅ SUCCESS: Start Processing button is visible');
        
        // Click the processing button
        console.log('6. Clicking Start Processing button...');
        await startProcessingButton.click();
        
        // Check if processing starts
        await page.waitForTimeout(3000);
        const processingIndicators = await page.locator('text=/processing|progress/i').allTextContents();
        console.log(`   Processing indicators: ${JSON.stringify(processingIndicators)}`);
        
      } else {
        console.log('❌ ISSUE: Start Processing button not found');
        
        // Debug: Check upload status elements
        const statusElements = await page.locator('text=/upload|complete|ready/i').allTextContents();
        console.log(`   Status elements on page: ${JSON.stringify(statusElements)}`);
      }
      
    } else {
      console.log('❌ Upload Files button not found');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'processing-button-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);