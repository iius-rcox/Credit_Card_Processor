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
    console.log(`[REQUEST]: ${request.method()} ${request.url()}`);
    if (request.url().includes('sessions')) {
      console.log(`  Headers:`, JSON.stringify(request.headers(), null, 2));
      if (request.postData()) {
        console.log(`  Body:`, request.postData());
      }
    }
  });

  // Capture all network responses
  page.on('response', async response => {
    if (response.url().includes('sessions') || response.status() >= 400) {
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
    console.log('\n=== NAVIGATING TO FRONTEND ===');
    await page.goto('http://localhost:3000');
    
    console.log('\n=== WAITING FOR PAGE TO LOAD ===');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: 'debug-initial-state.png', fullPage: true });
    console.log('Screenshot saved: debug-initial-state.png');
    
    console.log('\n=== LOOKING FOR NEW SESSION BUTTON ===');
    
    // Try to find the New Session button with multiple strategies
    const buttonSelectors = [
      'text="New Session"',
      'text="Create New Session"',
      'text="Start New Session"',
      '[data-testid*="session"]',
      'button:has-text("New")',
      'button:has-text("Session")',
      '.btn:has-text("New")',
      'input[type="button"]:has-text("New")'
    ];
    
    let newSessionButton = null;
    for (const selector of buttonSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.count() > 0 && await button.first().isVisible()) {
          console.log(`✓ Found button with selector: ${selector}`);
          console.log(`  Button count: ${await button.count()}`);
          console.log(`  Button text: "${await button.first().textContent()}"`);
          newSessionButton = button.first();
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!newSessionButton) {
      console.log('❌ New Session button not found. Let me check what buttons are available:');
      const allButtons = await page.locator('button, input[type="button"], .btn').all();
      console.log(`Found ${allButtons.length} total clickable elements:`);
      
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const text = await allButtons[i].textContent();
          const isVisible = await allButtons[i].isVisible();
          const classes = await allButtons[i].getAttribute('class') || '';
          console.log(`  ${i + 1}. "${text}" (visible: ${isVisible}, classes: ${classes})`);
        } catch (e) {
          console.log(`  ${i + 1}. [Error reading button: ${e.message}]`);
        }
      }
      
      // Also check for any text containing "session" or "new"
      console.log('\nLooking for any text containing "session" or "new":');
      const sessionText = await page.locator('text=/session/i').all();
      const newText = await page.locator('text=/new/i').all();
      
      console.log(`Found ${sessionText.length} elements with "session" text`);
      console.log(`Found ${newText.length} elements with "new" text`);
      
      return;
    }
    
    console.log('\n=== CLICKING NEW SESSION BUTTON ===');
    
    // Take a screenshot before clicking
    await page.screenshot({ path: 'debug-before-click.png', fullPage: true });
    console.log('Screenshot saved: debug-before-click.png');
    
    // Click the button and wait for potential navigation/changes
    await newSessionButton.click();
    
    console.log('\n=== WAITING FOR RESPONSE ===');
    
    // Wait a bit for any network requests to complete
    await page.waitForTimeout(3000);
    
    // Take a screenshot after clicking
    await page.screenshot({ path: 'debug-after-click.png', fullPage: true });
    console.log('Screenshot saved: debug-after-click.png');
    
    console.log('\n=== CHECKING FINAL STATE ===');
    
    // Check if any success messages or new content appeared
    const successMessages = await page.locator('text=/success|created|session/i').all();
    console.log(`Found ${successMessages.length} potential success indicators`);
    
    // Check for any error messages
    const errorMessages = await page.locator('text=/error|failed|problem/i').all();
    console.log(`Found ${errorMessages.length} potential error indicators`);
    
    // Check the current URL
    console.log(`Current URL: ${page.url()}`);
    
    // Check page title
    console.log(`Page title: ${await page.title()}`);
    
  } catch (error) {
    console.error('\n[SCRIPT ERROR]:', error.message);
    await page.screenshot({ path: 'debug-error-state.png', fullPage: true });
    console.log('Error screenshot saved: debug-error-state.png');
  }

  console.log('\n=== KEEPING BROWSER OPEN FOR MANUAL INSPECTION ===');
  console.log('Press Ctrl+C to close when done inspecting...');
  
  // Keep browser open for manual inspection
  await new Promise(() => {});
  
})().catch(console.error);