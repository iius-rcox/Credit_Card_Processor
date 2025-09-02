const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture ALL auth request headers
  page.on('request', request => {
    if (request.url().includes('/auth/')) {
      console.log(`\n[AUTH REQUEST] ${request.method()} ${request.url()}`);
      const headers = request.headers();
      console.log('  All headers:');
      Object.entries(headers).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
    }
  });

  try {
    console.log('=== DEBUG: Development Header Check ===\n');
    
    await page.goto('http://localhost:3000');
    
    // Wait for initial auth attempt
    console.log('Waiting for auth request...');
    await page.waitForTimeout(5000);
    
    // Also check environment variables in browser context
    const envCheck = await page.evaluate(() => {
      return {
        isDev: import.meta.env.DEV,
        devUser: import.meta.env.VITE_DEV_USER,
        mode: import.meta.env.MODE,
        allEnv: import.meta.env
      };
    });
    
    console.log('\n=== BROWSER ENVIRONMENT CHECK ===');
    console.log('import.meta.env.DEV:', envCheck.isDev);
    console.log('import.meta.env.VITE_DEV_USER:', envCheck.devUser);
    console.log('import.meta.env.MODE:', envCheck.mode);
    console.log('All environment variables:', JSON.stringify(envCheck.allEnv, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
  
})().catch(console.error);