// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Fast test configuration for development
 * Optimized for speed while maintaining coverage
 */
module.exports = defineConfig({
  testDir: './playwright-tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use more workers for faster execution */
  workers: process.env.CI ? 1 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Reduced timeouts for faster execution */
    actionTimeout: 5000,
    navigationTimeout: 15000,
  },

  /* Configure projects for major browsers - FAST VERSION */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Only test one additional browser for speed
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Skip WebKit and mobile for fast testing
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'docker-compose up -d',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'docker-compose up -d backend',
      port: 8001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  ],
});


