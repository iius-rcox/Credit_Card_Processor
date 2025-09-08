const { defineConfig, devices } = require('@playwright/test');

/**
 * Advanced Playwright Configuration for Comprehensive Testing
 * This configuration includes performance testing, visual regression, 
 * accessibility testing, and cross-browser coverage
 */

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 60000, // Increased for performance tests
  expect: {
    timeout: 10000,
  },
  
  // Enhanced reporting for CI/CD integration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github'], // GitHub Actions integration
    ['line'],
    // Custom reporter for performance metrics
    ['./test-utils/performance-reporter.js']
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Enhanced context options for testing
    extraHTTPHeaders: {
      'x-test-runner': 'playwright',
      'x-test-environment': process.env.NODE_ENV || 'development'
    },
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,
    
    // Performance monitoring
    contextOptions: {
      recordVideo: {
        mode: 'retain-on-failure',
        size: { width: 1920, height: 1080 }
      }
    }
  },

  projects: [
    // Desktop browsers - Primary testing
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Mobile devices - Responsive testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
    },

    // Performance testing project
    {
      name: 'performance-chrome',
      testMatch: '**/performance/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Enable CPU and memory throttling for performance tests
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },

    // Accessibility testing project
    {
      name: 'accessibility-chrome',
      testMatch: '**/accessibility/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Security testing project
    {
      name: 'security-chrome',
      testMatch: '**/security/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // API testing project (headless)
    {
      name: 'api-testing',
      testMatch: '**/api/**/*.spec.js',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:8001',
      },
    },

    // Visual regression testing
    {
      name: 'visual-chrome',
      testMatch: '**/visual/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Ensure consistent rendering for visual tests
        contextOptions: {
          reducedMotion: 'reduce',
          forcedColors: 'none',
          colorScheme: 'light'
        }
      },
    }
  ],

  webServer: {
    // Enhanced web server configuration for testing
    command: process.env.CI ? 
      'echo "Using external services in CI"' : 
      'echo "Using development Docker services"',
    port: 3000,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      VITE_DEV_USER: 'rcox'
    }
  },

  // Global test configuration
  globalSetup: './test-utils/global-setup.js',
  globalTeardown: './test-utils/global-teardown.js',

  // Test metadata for reporting
  metadata: {
    testSuite: 'Credit Card Processor - Comprehensive Testing',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  }
});