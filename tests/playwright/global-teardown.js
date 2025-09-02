// Global teardown for Playwright tests

async function globalTeardown(config) {
  console.log('🧹 Starting global teardown...');
  
  // Clean up any test artifacts
  // Note: We don't stop Docker containers here as they might be used for development
  
  console.log('✅ Global teardown completed');
}

module.exports = globalTeardown;