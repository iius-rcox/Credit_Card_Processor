const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('=== CHECKING UI ERROR DIALOGS ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const newSessionButton = page.locator('text="New Session"');
    await newSessionButton.click();
    await page.waitForTimeout(2000);
    
    console.log('Uploading file with characters that get sanitized...');
    const testFilePath = path.resolve('tests/example-reports/Cardholder+Activity+Report+General-S-89S,DD2LJ,DFRHA (6).pdf');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'ui-error-check.png', fullPage: true });
    console.log('Screenshot saved: ui-error-check.png');
    
    // Check for various error message patterns
    const errorSelectors = [
      'text=/Error.*File validation error/i',
      'text=/Security error/i', 
      'text=/File name sanitized/i',
      '[class*="error"]',
      '[class*="alert"]',
      'text=/Dismiss/i'
    ];
    
    for (const selector of errorSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`Found ${count} elements matching: ${selector}`);
        
        // Get the text content
        const elements = await page.locator(selector).all();
        for (let i = 0; i < Math.min(elements.length, 3); i++) {
          try {
            const text = await elements[i].textContent();
            const isVisible = await elements[i].isVisible();
            console.log(`  ${i + 1}. "${text}" (visible: ${isVisible})`);
          } catch (e) {
            console.log(`  ${i + 1}. [Could not read text]`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);