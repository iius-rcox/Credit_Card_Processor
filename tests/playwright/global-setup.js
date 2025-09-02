// Global setup for Playwright tests
const { chromium } = require('@playwright/test');

async function globalSetup(config) {
  console.log('🚀 Starting global setup...');
  
  // Wait for services to be ready
  await waitForServices();
  
  console.log('✅ Global setup completed');
}

async function waitForServices() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Wait for frontend to be ready
  console.log('⏳ Waiting for frontend service...');
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Frontend service is ready');
  } catch (error) {
    console.error('❌ Frontend service failed to start:', error);
    throw error;
  }
  
  // Wait for backend to be ready
  console.log('⏳ Waiting for backend service...');
  try {
    const response = await page.request.get('http://localhost:8001/health');
    if (response.ok()) {
      const data = await response.json();
      console.log('✅ Backend service is ready:', data);
    } else {
      throw new Error(`Backend health check failed: ${response.status()}`);
    }
  } catch (error) {
    console.error('❌ Backend service failed to start:', error);
    throw error;
  }
  
  await browser.close();
}

module.exports = globalSetup;