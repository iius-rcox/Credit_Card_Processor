#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Credit Card Processor - Phase 4 Test Suite');
console.log('==============================================\n');

// Check if Docker is running
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    console.log('✅ Docker is available');
    return true;
  } catch (error) {
    console.log('❌ Docker is not available. Please install Docker and try again.');
    return false;
  }
}

// Check if containers are running
function checkContainers() {
  try {
    const output = execSync('docker-compose ps --services --filter "status=running"', { encoding: 'utf8' });
    const runningServices = output.trim().split('\n').filter(service => service.length > 0);
    
    console.log(`📦 Running services: ${runningServices.join(', ')}`);
    
    if (runningServices.includes('frontend') && runningServices.includes('backend')) {
      console.log('✅ Required containers are running');
      return true;
    } else {
      console.log('❌ Required containers are not running. Starting them...');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking containers. Starting them...');
    return false;
  }
}

// Start containers
function startContainers() {
  try {
    console.log('🚀 Starting containers...');
    execSync('docker-compose up -d', { stdio: 'inherit' });
    
    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    execSync('timeout 30 bash -c "until curl -f http://localhost:3000 > /dev/null 2>&1; do sleep 1; done"', { stdio: 'ignore' });
    execSync('timeout 30 bash -c "until curl -f http://localhost:8001/health > /dev/null 2>&1; do sleep 1; done"', { stdio: 'ignore' });
    
    console.log('✅ Services are ready');
    return true;
  } catch (error) {
    console.log('❌ Failed to start containers:', error.message);
    return false;
  }
}

// Install Playwright if needed
function installPlaywright() {
  try {
    console.log('📦 Checking Playwright installation...');
    execSync('npx playwright --version', { stdio: 'ignore' });
    console.log('✅ Playwright is installed');
    return true;
  } catch (error) {
    console.log('📦 Installing Playwright...');
    try {
      execSync('npm install @playwright/test', { stdio: 'inherit' });
      execSync('npx playwright install', { stdio: 'inherit' });
      console.log('✅ Playwright installed successfully');
      return true;
    } catch (installError) {
      console.log('❌ Failed to install Playwright:', installError.message);
      return false;
    }
  }
}

// Run tests
function runTests() {
  try {
    console.log('\n🧪 Running Phase 4 functionality tests...\n');
    
    const testCommand = process.argv.includes('--headed') ? 'npx playwright test --headed' : 'npx playwright test';
    execSync(testCommand, { stdio: 'inherit' });
    
    console.log('\n✅ All tests completed successfully!');
    return true;
  } catch (error) {
    console.log('\n❌ Some tests failed. Check the output above for details.');
    return false;
  }
}

// Generate test report
function generateReport() {
  try {
    console.log('\n📊 Generating test report...');
    execSync('npx playwright show-report', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Failed to generate report:', error.message);
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  
  // Check prerequisites
  if (!checkDocker()) {
    process.exit(1);
  }
  
  // Check/start containers
  if (!checkContainers()) {
    if (!startContainers()) {
      process.exit(1);
    }
  }
  
  // Install Playwright if needed
  if (!installPlaywright()) {
    process.exit(1);
  }
  
  // Run tests
  const success = runTests();
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log(`\n⏱️  Total execution time: ${duration} seconds`);
  
  if (success) {
    console.log('\n🎉 Test suite completed successfully!');
    
    // Ask if user wants to see the report
    if (process.argv.includes('--report') || process.argv.includes('-r')) {
      generateReport();
    } else {
      console.log('\n💡 Run with --report flag to view detailed test results');
    }
  } else {
    console.log('\n💥 Test suite failed. Please check the output above for details.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node run-tests.js [options]

Options:
  --headed     Run tests in headed mode (visible browser)
  --report     Show test report after completion
  --help       Show this help message

Examples:
  node run-tests.js                    # Run tests in headless mode
  node run-tests.js --headed           # Run tests with visible browser
  node run-tests.js --report           # Run tests and show report
  node run-tests.js --headed --report  # Run tests with visible browser and show report
`);
  process.exit(0);
}

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});


