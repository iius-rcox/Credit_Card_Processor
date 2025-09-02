const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  
  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('sessions')) {
      console.log('REQUEST:', request.method(), request.url());
      console.log('HEADERS:', request.headers());
    }
  });

  // Listen for network responses
  page.on('response', response => {
    if (response.url().includes('sessions')) {
      console.log('RESPONSE:', response.status(), response.url());
    }
  });

  try {
    console.log('Navigating to frontend...');
    await page.goto('http://localhost:3000');
    
    console.log('Waiting for page to load...');
    await page.waitForLoadState('networkidle');
    
    console.log('Looking for "New Session" button...');
    
    // Try different selectors for "New Session"
    const selectors = [
      'text="New Session"',
      'text="Create New Session"',
      'text="Start New Session"',
      '[data-testid="new-session"]',
      'button:has-text("New")',
      'button:has-text("Session")'
    ];
    
    let button = null;
    for (const selector of selectors) {
      try {
        button = await page.locator(selector).first();
        if (await button.isVisible()) {
          console.log(`Found button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!button || !(await button.isVisible())) {
      console.log('New Session button not found. Available buttons:');
      const buttons = await page.locator('button').all();
      for (let i = 0; i < buttons.length; i++) {
        const text = await buttons[i].textContent();
        console.log(`  Button ${i}: "${text}"`);
      }
    } else {
      console.log('Clicking New Session button...');
      await button.click();
      
      console.log('Waiting for any network activity...');
      await page.waitForTimeout(3000);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
})();