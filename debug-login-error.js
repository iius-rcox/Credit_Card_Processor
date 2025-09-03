const { chromium } = require('playwright');

async function debugLogin() {
    console.log('🚀 Starting login debug with Playwright...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
        console.log(`🖥️  Browser Console [${msg.type()}]:`, msg.text());
    });
    
    // Listen for network errors
    page.on('requestfailed', request => {
        console.log(`❌ Failed Request: ${request.url()} - ${request.failure().errorText}`);
    });
    
    // Listen for responses
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            console.log(`📡 API Response: ${response.status()} ${response.url()}`);
        }
    });
    
    try {
        console.log('📂 Navigating to application...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('📸 Taking screenshot of initial page...');
        await page.screenshot({ path: 'debug-initial-page.png', fullPage: true });
        
        // Wait a moment for any initial loading
        await page.waitForTimeout(3000);
        
        console.log('🔍 Checking page content...');
        const title = await page.title();
        console.log(`Page title: ${title}`);
        
        const url = page.url();
        console.log(`Current URL: ${url}`);
        
        // Check if there are any error messages visible
        const errorMessages = await page.locator('text=/error|Error|LOGIN|login/i').all();
        if (errorMessages.length > 0) {
            console.log('⚠️  Found error messages on page:');
            for (let i = 0; i < errorMessages.length; i++) {
                const text = await errorMessages[i].textContent();
                console.log(`   - ${text}`);
            }
        }
        
        // Check authentication status
        console.log('🔐 Checking authentication...');
        
        // Look for login forms, authentication messages, etc.
        const passwordInputs = await page.locator('input[type="password"]').all();
        const loginText = await page.locator(':text("login")').all();
        const authText = await page.locator(':text("authenticate")').all();
        console.log(`Found ${passwordInputs.length} password inputs, ${loginText.length} login text, ${authText.length} auth text`);
        
        // Check if we can see any admin/user info
        const userInfo = await page.locator(':text("admin"), :text("user"), :text("INSULATIONSINC"), :text("rcox")').all();
        console.log(`Found ${userInfo.length} user-related elements`);
        
        // Print page text content to see what's actually showing
        const bodyText = await page.locator('body').textContent();
        console.log('📄 Page content preview:', bodyText.substring(0, 500) + '...');
        
        // Try to trigger authentication by interacting with the page
        console.log('🔄 Attempting to trigger authentication...');
        
        // Look for any buttons or links that might trigger login
        const buttons = await page.locator('button, a').all();
        console.log(`Found ${buttons.length} clickable elements`);
        
        // Take another screenshot after initial checks
        console.log('📸 Taking screenshot after checks...');
        await page.screenshot({ path: 'debug-after-checks.png', fullPage: true });
        
        console.log('✅ Debug session completed. Check the screenshots and console output above.');
        
    } catch (error) {
        console.error('❌ Error during debug session:', error.message);
        await page.screenshot({ path: 'debug-error.png', fullPage: true });
    }
    
    await browser.close();
}

// Run the debug
debugLogin().catch(console.error);