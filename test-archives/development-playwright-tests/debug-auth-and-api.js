const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track all requests and responses
  let requestCount = 0;
  const apiCalls = [];

  // Capture ALL requests (not just sessions)
  page.on('request', request => {
    requestCount++;
    const isAPI = request.url().includes('/api/');
    
    console.log(`[REQUEST ${requestCount}] ${request.method()} ${request.url()}`);
    
    if (isAPI) {
      // Log headers for API calls
      const headers = request.headers();
      console.log(`  Headers:`, JSON.stringify(headers, null, 2));
      
      // Log body for POST/PUT
      if (request.postData()) {
        console.log(`  Body:`, request.postData());
      }
      
      apiCalls.push({
        id: requestCount,
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString(),
        headers: headers,
        body: request.postData()
      });
    }
  });

  // Capture ALL responses
  page.on('response', async response => {
    const isAPI = response.url().includes('/api/');
    
    if (isAPI || response.status() >= 400) {
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
      
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

  // Capture console messages (including auth errors)
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('auth') || text.includes('error') || text.includes('fail')) {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, text);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]:`, error.message);
  });

  try {
    console.log('\n=== DETAILED API CALL ANALYSIS ===');
    console.log('Tracking: Authentication, API calls, Rate limits, Retries\n');
    
    console.log('STEP 1: Loading frontend...');
    await page.goto('http://localhost:3000');
    
    console.log('\nSTEP 2: Waiting for initial load and auth...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give auth time to complete
    
    console.log(`\n--- INITIAL LOAD COMPLETE ---`);
    console.log(`Total requests so far: ${requestCount}`);
    console.log(`API calls so far: ${apiCalls.length}`);
    
    // Check authentication state
    const authElements = await page.locator('text=/login|sign in|unauthorized|auth/i').all();
    const hasAuthIssue = authElements.length > 0;
    
    if (hasAuthIssue) {
      console.log('⚠️  Potential authentication issue detected');
      for (let i = 0; i < Math.min(authElements.length, 3); i++) {
        try {
          const text = await authElements[i].textContent();
          if (await authElements[i].isVisible()) {
            console.log(`  Auth element: "${text}"`);
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    console.log('\nSTEP 3: Looking for New Session button...');
    
    const newSessionButton = page.locator('text="New Session"').first();
    const buttonVisible = await newSessionButton.isVisible();
    
    if (!buttonVisible) {
      console.log('❌ New Session button not found');
      console.log('Page might not be loaded correctly or auth failed');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-no-button.png', fullPage: true });
      return;
    }
    
    console.log('✅ New Session button found');
    
    console.log('\nSTEP 4: Clicking New Session - WATCH THE API CALLS...');
    const beforeClickCount = requestCount;
    const beforeAPICount = apiCalls.length;
    
    await newSessionButton.click();
    
    console.log('\nSTEP 5: Monitoring API activity for 10 seconds...');
    
    // Monitor for 10 seconds to see all the API calls
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      const currentRequests = requestCount - beforeClickCount;
      const currentAPICalls = apiCalls.length - beforeAPICount;
      console.log(`  Second ${i+1}: +${currentRequests} total requests, +${currentAPICalls} API calls`);
    }
    
    console.log('\n=== API CALL ANALYSIS ===');
    console.log(`Total requests after click: ${requestCount - beforeClickCount}`);
    console.log(`Total API calls after click: ${apiCalls.length - beforeAPICount}`);
    
    // Analyze API calls made after the click
    const postClickAPICalls = apiCalls.slice(beforeAPICount);
    console.log('\nAPI calls made after clicking New Session:');
    
    postClickAPICalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.method} ${call.url}`);
      if (call.url.includes('/sessions')) {
        console.log(`   └─ Session API call`);
      }
      if (call.headers['x-dev-user']) {
        console.log(`   └─ Auth header: ${call.headers['x-dev-user']}`);
      }
    });
    
    // Count by endpoint
    const endpointCounts = {};
    postClickAPICalls.forEach(call => {
      const path = new URL(call.url).pathname;
      endpointCounts[path] = (endpointCounts[path] || 0) + 1;
    });
    
    console.log('\nAPI calls by endpoint:');
    Object.entries(endpointCounts).forEach(([endpoint, count]) => {
      console.log(`  ${endpoint}: ${count} calls`);
    });
    
    // Look for rate limit responses
    const rateLimitCalls = postClickAPICalls.filter(call => 
      call.url.includes('sessions') // We'll check response status separately
    );
    
    console.log(`\nSession-related API calls: ${rateLimitCalls.length}`);
    
    await page.screenshot({ path: 'debug-after-analysis.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-after-analysis.png');
    
    // Final assessment
    console.log('\n=== ASSESSMENT ===');
    if (postClickAPICalls.length > 10) {
      console.log('🚨 EXCESSIVE API CALLS DETECTED');
      console.log(`Expected: 1-3 calls, Actual: ${postClickAPICalls.length} calls`);
    } else if (postClickAPICalls.length > 5) {
      console.log('⚠️  High number of API calls');
    } else {
      console.log('✅ Normal API call volume');
    }
    
    console.log(`\nTotal analysis: ${requestCount} requests, ${apiCalls.length} API calls`);
    
  } catch (error) {
    console.error('\n❌ ANALYSIS ERROR:', error.message);
    await page.screenshot({ path: 'debug-analysis-error.png', fullPage: true });
  }

  console.log('\n=== KEEPING BROWSER OPEN FOR INSPECTION ===');
  console.log('Press Ctrl+C to close...');
  
  // Keep browser open
  await new Promise(() => {});
  
})().catch(console.error);