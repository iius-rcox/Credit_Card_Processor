const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages related to auth
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('auth') || text.includes('Auth') || text.includes('user') || text.includes('process')) {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, text);
    }
  });

  // Capture network requests to auth endpoints
  page.on('request', request => {
    if (request.url().includes('/auth/')) {
      console.log(`[AUTH REQUEST] ${request.method()} ${request.url()}`);
      const headers = request.headers();
      if (headers['x-dev-user']) {
        console.log(`  └─ x-dev-user: ${headers['x-dev-user']}`);
      }
    }
  });

  page.on('response', response => {
    if (response.url().includes('/auth/')) {
      console.log(`[AUTH RESPONSE] ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('=== TESTING AUTHENTICATION FIX ===\n');
    
    console.log('1. Loading frontend...');
    await page.goto('http://localhost:3000');
    
    console.log('2. Waiting for authentication to complete...');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit longer for auth to process
    await page.waitForTimeout(3000);
    
    console.log('3. Checking authentication state...');
    
    // Look for auth indicators
    const authElements = await page.locator('text=/authenticating|sign.*in|login|unauthorized/i').all();
    const stillAuthenticating = authElements.length > 0;
    
    if (stillAuthenticating) {
      console.log('⚠️  Still showing authentication indicators:');
      for (let i = 0; i < Math.min(authElements.length, 3); i++) {
        try {
          const text = await authElements[i].textContent();
          const isVisible = await authElements[i].isVisible();
          if (isVisible) {
            console.log(`    "${text}"`);
          }
        } catch (e) {
          // Continue
        }
      }
    } else {
      console.log('✅ No authentication indicators found');
    }
    
    // Check for New Session button (indicates successful auth)
    const newSessionButton = page.locator('text="New Session"').first();
    const buttonVisible = await newSessionButton.isVisible();
    
    console.log('4. Checking UI state...');
    console.log(`New Session button visible: ${buttonVisible ? '✅ Yes' : '❌ No'}`);
    
    // Check for user info display
    const userElements = await page.locator('text=/user|admin|testuser|welcome/i').all();
    let visibleUserInfo = '';
    
    for (const userEl of userElements) {
      try {
        if (await userEl.isVisible()) {
          const text = await userEl.textContent();
          if (text && text.trim().length > 0) {
            visibleUserInfo += `"${text.trim()}" `;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (visibleUserInfo) {
      console.log(`User info displayed: ${visibleUserInfo}`);
    }
    
    await page.screenshot({ path: 'auth-test-result.png', fullPage: true });
    console.log('\n📸 Screenshot saved: auth-test-result.png');
    
    console.log('\n=== AUTHENTICATION STATUS ===');
    if (buttonVisible && !stillAuthenticating) {
      console.log('🎉 SUCCESS! Authentication completed successfully');
    } else if (buttonVisible && stillAuthenticating) {
      console.log('🔄 PARTIAL SUCCESS: App working but auth indicators still showing');
    } else {
      console.log('❌ AUTHENTICATION STILL FAILING');
      console.log('   Possible issues:');
      console.log('   - VITE_DEV_USER not picked up by frontend');
      console.log('   - Auth endpoint not responding correctly'); 
      console.log('   - Frontend auth logic hanging');
    }
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    await page.screenshot({ path: 'auth-test-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);