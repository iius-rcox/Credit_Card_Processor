const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track API requests
  let apiRequestCount = 0;
  const apiRequests = [];

  page.on('request', request => {
    if (request.url().includes('/api/sessions')) {
      apiRequestCount++;
      apiRequests.push({
        id: apiRequestCount,
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString()
      });
      console.log(`[API ${apiRequestCount}] ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/sessions')) {
      console.log(`  └─ Response: ${response.status()}`);
    }
  });

  try {
    console.log('=== TESTING INFINITE LOOP FIX ===\n');
    
    console.log('1. Loading page...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Looking for New Session button...');
    const newSessionButton = page.locator('text="New Session"').first();
    await newSessionButton.waitFor();
    console.log('✅ New Session button found');
    
    console.log('\n3. Clicking New Session...');
    const beforeClick = apiRequestCount;
    
    await newSessionButton.click();
    
    console.log('4. Monitoring API calls for 5 seconds...');
    await page.waitForTimeout(5000);
    
    const afterClick = apiRequestCount;
    const callsAfterClick = afterClick - beforeClick;
    
    console.log('\n=== RESULTS ===');
    console.log(`API calls after clicking New Session: ${callsAfterClick}`);
    
    if (callsAfterClick <= 3) {
      console.log('✅ SUCCESS! Normal number of API calls');
      console.log('   Expected: 1-2 calls (POST + maybe one update)');
      console.log(`   Actual: ${callsAfterClick} calls`);
    } else if (callsAfterClick <= 10) {
      console.log('⚠️  Moderate concern - higher than expected but not infinite');
      console.log(`   ${callsAfterClick} calls might indicate some retry logic`);
    } else {
      console.log('🚨 STILL PROBLEMATIC!');
      console.log(`   ${callsAfterClick} calls is too many - loop may still exist`);
    }
    
    console.log('\nAPI call breakdown:');
    const postClickCalls = apiRequests.slice(beforeClick);
    postClickCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.method} ${new URL(call.url).pathname}`);
    });
    
    await page.screenshot({ path: 'fix-verification.png', fullPage: true });
    console.log('\n📸 Screenshot saved: fix-verification.png');
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    await page.screenshot({ path: 'fix-verification-error.png', fullPage: true });
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);