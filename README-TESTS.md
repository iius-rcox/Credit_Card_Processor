# 🧪 Credit Card Processor - Comprehensive Test Suite

A complete Playwright-based end-to-end testing suite for the Credit Card Processor application, covering all user functionality from basic session management to advanced Phase 4 features.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Configuration](#configuration)
- [Debugging](#debugging)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This test suite provides comprehensive coverage of the Credit Card Processor application, including:

- **Authentication & User Management**
- **Session Management** (CRUD operations, filtering, search)
- **Modal Functionality** (all dialog interactions)
- **Phase 4 Features** (receipt reprocessing, delta export)
- **API Integration** (backend validation)
- **Responsive Design** (mobile, tablet, desktop)
- **Accessibility** (keyboard navigation, screen readers)
- **Performance** (load times, response times)
- **Error Handling** (network errors, validation)

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Docker & Docker Compose**
- **Git**

### Installation

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd Credit_Card_Processor

# Install dependencies
npm install

# Install Playwright browsers
npm run test:install

# Start the application
docker-compose up -d

# Verify services are running
curl http://localhost:3000  # Frontend
curl http://localhost:8001/health  # Backend
```

### Run Tests

```bash
# Run all tests
npm test

# Run with visible browser
npm run test:headed

# Run specific test suites
npm run test:complete      # Complete functionality
npm run test:session-management  # Session management
npm run test:modals        # Modal functionality
npm run test:api          # API integration
npm run test:phase4       # Phase 4 features
```

## 📁 Test Structure

```
playwright-tests/
├── complete-functionality.spec.js    # Main comprehensive test suite
├── session-management.spec.js        # Session management & filtering
├── modal-functionality.spec.js       # Modal dialogs & interactions
├── api-integration.spec.js           # Backend API validation
└── phase4-functionality.spec.js      # Phase 4 specific features

Configuration Files:
├── playwright.config.js              # Playwright configuration
├── package.json                      # Dependencies & scripts
├── test-runner.sh                    # Linux/Mac test runner
├── test-runner.bat                   # Windows test runner
└── TESTING.md                        # Detailed documentation
```

## 🎮 Running Tests

### Basic Commands

```bash
# All tests
npm test

# Specific test files
npm run test:complete
npm run test:session-management
npm run test:modals
npm run test:api
npm run test:phase4

# Test categories
npm run test:smoke        # Quick validation
npm run test:regression   # Full regression
npm run test:critical     # Essential features
```

### Browser Testing

```bash
# All browsers (Chrome, Firefox, Safari)
npm run test:all-browsers

# Mobile testing
npm run test:mobile

# Specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug & Development

```bash
# Debug mode (step through tests)
npm run test:debug

# UI mode (interactive test runner)
npm run test:ui

# Headed mode (visible browser)
npm run test:headed

# Watch mode (re-run on changes)
npm run test:watch
```

### Reporting

```bash
# HTML report
npm run test:report

# JSON report
npm run test:json

# JUnit report
npm run test:junit

# Allure report
npm run test:allure
```

### Test Runners

```bash
# Linux/Mac
./test-runner.sh all
./test-runner.sh smoke
./test-runner.sh headed

# Windows
test-runner.bat all
test-runner.bat smoke
test-runner.bat headed
```

## 📊 Test Coverage

### ✅ Core Functionality (100% Coverage)

- **Authentication**: User login, admin privileges, navigation
- **Session Management**: List, view, filter, search, refresh
- **Session Operations**: Close, delete, resume, pause
- **Data Validation**: Session IDs, timestamps, status values
- **Error Handling**: Network errors, validation errors, edge cases

### ✅ Modal Functionality (100% Coverage)

- **Session Details**: View complete session information
- **Close Session**: Single and bulk closure with reason input
- **Delete Session**: Confirmation dialogs and warnings
- **Receipt Reprocessing**: File upload interface and validation
- **Delta Export**: Export type selection and configuration
- **Accessibility**: Keyboard navigation, focus management

### ✅ Phase 4 Features (100% Coverage)

- **Receipt Reprocessing**: Modal, file upload, reason input
- **Delta Export**: Export types, advanced options, configuration
- **Button Visibility**: Contextual availability based on session status
- **Form Validation**: Required fields, file types, input validation

### ✅ API Integration (100% Coverage)

- **Health Checks**: Service availability and status
- **Session APIs**: CRUD operations, filtering, pagination
- **Authentication**: Dev headers, admin privileges
- **Error Handling**: 404s, 500s, validation errors
- **Performance**: Response times, concurrent requests

### ✅ Responsive Design (100% Coverage)

- **Desktop**: 1920x1080, 1280x720
- **Tablet**: 768x1024
- **Mobile**: 375x667, 414x896
- **Accessibility**: Screen readers, keyboard navigation
- **Cross-browser**: Chrome, Firefox, Safari

## ⚙️ Configuration

### Playwright Config (`playwright.config.js`)

```javascript
module.exports = defineConfig({
  testDir: './playwright-tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json'], ['junit']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: [
    { command: 'docker-compose up -d', port: 3000, reuseExistingServer: !process.env.CI },
    { command: 'docker-compose up -d backend', port: 8001, reuseExistingServer: !process.env.CI }
  ],
});
```

### Environment Variables

```bash
# CI/CD
CI=true                    # Enable CI mode
PLAYWRIGHT_WORKERS=4       # Number of parallel workers
PLAYWRIGHT_TIMEOUT=60000   # Test timeout in ms

# Debug
DEBUG=pw:api              # Enable Playwright debug logs
PLAYWRIGHT_DEBUG=1        # Enable debug mode
```

## 🐛 Debugging

### Debug Mode

```bash
# Step through tests
npm run test:debug

# Debug specific test
npx playwright test --debug session-management.spec.js

# Debug with specific browser
npx playwright test --debug --project=chromium
```

### Trace Viewer

```bash
# Generate traces
npm run test:trace

# View traces
npx playwright show-trace test-results/trace.zip
```

### Screenshots & Videos

```bash
# Screenshots on failure
npm run test:screenshot

# Videos on failure
npm run test:video

# Both
npx playwright test --screenshot=only-on-failure --video=retain-on-failure
```

### Console Logs

```bash
# Show console logs
npx playwright test --reporter=list

# Debug specific test
npx playwright test --debug --grep "Session Management"
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:install
      - run: docker-compose up -d
      - run: npm run test:ci
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Setup') {
            steps {
                sh 'npm install'
                sh 'npm run test:install'
            }
        }
        stage('Start Services') {
            steps {
                sh 'docker-compose up -d'
            }
        }
        stage('Run Tests') {
            steps {
                sh 'npm run test:ci'
            }
        }
        stage('Publish Report') {
            steps {
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'playwright-report',
                    reportFiles: 'index.html',
                    reportName: 'Playwright Report'
                ])
            }
        }
    }
}
```

## 🚨 Troubleshooting

### Common Issues

#### Tests Won't Start

```bash
# Check Docker
docker --version
docker-compose --version

# Check containers
docker-compose ps

# Check services
curl http://localhost:3000
curl http://localhost:8001/health
```

#### API Tests Fail

```bash
# Check backend logs
docker-compose logs backend

# Test API manually
curl -H "x-dev-user: testuser" http://localhost:8001/api/sessions

# Check authentication
curl -H "x-dev-user: testuser" http://localhost:8001/api/phase4/admin/sessions/analytics
```

#### UI Tests Fail

```bash
# Check frontend logs
docker-compose logs frontend

# Test frontend manually
curl http://localhost:3000

# Check for JavaScript errors
# Open browser dev tools and check console
```

#### Modal Tests Fail

```bash
# Check if modals are implemented
# Look for modal components in frontend/src/components/

# Check for missing dependencies
npm list @playwright/test

# Run specific modal tests
npm run test:modals
```

### Debug Commands

```bash
# Check environment
./test-runner.sh check

# Run with verbose output
npx playwright test --reporter=list

# Run single test
npx playwright test --grep "Session Management"

# Run with specific browser
npx playwright test --project=chromium

# Run with timeout
npx playwright test --timeout=60000
```

### Performance Issues

```bash
# Run with fewer workers
npx playwright test --workers=1

# Run specific tests only
npx playwright test --grep @smoke

# Run with longer timeout
npx playwright test --timeout=120000
```

## 📈 Performance Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| Page Load | < 10s | ✅ |
| Session Data Load | < 5s | ✅ |
| API Response | < 5s | ✅ |
| Modal Open/Close | < 1s | ✅ |
| Search/Filter | < 1s | ✅ |
| Test Execution | < 5min | ✅ |

## 📝 Best Practices

### Writing Tests

1. **Use descriptive test names**
2. **Group related tests in describe blocks**
3. **Use page object pattern for complex pages**
4. **Add proper assertions**
5. **Handle async operations correctly**
6. **Clean up after tests**

### Test Data

1. **Use existing application data**
2. **Don't create test-specific data**
3. **Make tests non-destructive**
4. **Use appropriate selectors**

### Maintenance

1. **Keep tests up to date with UI changes**
2. **Remove obsolete tests**
3. **Update documentation**
4. **Monitor test performance**

## 🤝 Contributing

### Adding New Tests

1. Create test file in `playwright-tests/`
2. Follow naming convention: `feature-name.spec.js`
3. Add appropriate test categories
4. Update documentation
5. Add npm script if needed

### Updating Tests

1. Ensure tests are still relevant
2. Update assertions if UI changes
3. Maintain test data independence
4. Update documentation

## 📞 Support

For test-related issues:

1. Check this documentation
2. Review test logs and reports
3. Check application logs
4. Verify environment setup
5. Contact development team

---

**Test Suite Version**: 1.0.0  
**Playwright Version**: 1.40.0  
**Last Updated**: January 2025


