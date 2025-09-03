import { chromium } from 'playwright';

async function testAuth() {
    console.log('🔍 Testing authentication with development user...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 2000 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen for console messages to see environment variables
    page.on('console', msg => {
        console.log(`🖥️  Browser Console [${msg.type()}]:`, msg.text());
    });
    
    // Listen for network requests to see headers
    page.on('request', request => {
        if (request.url().includes('/api/auth/current-user')) {
            console.log(`📡 AUTH Request: ${request.method()} ${request.url()}`);
            console.log(`📋 Headers:`, request.headers());
        }
    });
    
    // Listen for network responses
    page.on('response', response => {
        if (response.url().includes('/api/auth/current-user')) {
            console.log(`📡 AUTH Response: ${response.status()} ${response.url()}`);
        }
    });
    
    try {
        console.log('📂 Navigating to application...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Wait for authentication to complete
        await page.waitForTimeout(5000);
        
        // Check if we see development warnings in console
        await page.evaluate(() => {
            console.log('🔧 Environment Check - DEV:', import.meta.env.DEV);
            console.log('🔧 Environment Check - VITE_DEV_USER:', import.meta.env.VITE_DEV_USER);
            console.log('🔧 Environment Check - MODE:', import.meta.env.MODE);
        });
        
        // Take a screenshot
        await page.screenshot({ path: 'auth-debug.png', fullPage: true });
        
        console.log('✅ Test completed. Check console output above.');
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
        await page.screenshot({ path: 'auth-debug-error.png', fullPage: true });
    }
    
    await browser.close();
}

testAuth().catch(console.error);