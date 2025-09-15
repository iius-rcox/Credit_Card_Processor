# Credit Card Processor - Comprehensive Test Suite

This document describes the comprehensive Playwright test suite for the Credit Card Processor application, covering all user functionality from basic session management to advanced Phase 4 features.

## 🧪 Test Overview

The test suite is organized into multiple specialized test files, each focusing on specific aspects of the application:

### Test Files

1. **`complete-functionality.spec.js`** - Main comprehensive test suite covering all user functionality
2. **`session-management.spec.js`** - Detailed session management and filtering tests
3. **`modal-functionality.spec.js`** - Modal dialogs and user interaction tests
4. **`api-integration.spec.js`** - Backend API integration and data validation tests
5. **`phase4-functionality.spec.js`** - Phase 4 specific features (receipt reprocessing, delta export)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose running
- Credit Card Processor application running on `http://localhost:3000`
- Backend API running on `http://localhost:8001`

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:install

# Install system dependencies (Linux)
npm run test:install-deps
```

### Running Tests

```bash
# Run all tests
npm test

# Run with visible browser
npm run test:headed

# Run specific test suites
npm run test:complete
npm run test:session-management
npm run test:modals
npm run test:api
npm run test:phase4

# Run with different configurations
npm run test:all-browsers    # Chrome, Firefox, Safari
npm run test:mobile         # Mobile viewports
npm run test:parallel       # Parallel execution
npm run test:retry          # With retries
```

## 📋 Test Coverage

### 1. Authentication & User Management
- ✅ User authentication verification
- ✅ Admin privileges display
- ✅ Navigation between main sections
- ✅ User avatar and profile display

### 2. Session Management - Core Functionality
- ✅ Session list loading and display
- ✅ Session information completeness
- ✅ Session status indicators
- ✅ Session timestamps formatting
- ✅ Session ID format validation
- ✅ Action button contextual visibility
- ✅ Session filtering by status
- ✅ Search functionality (by ID and name)
- ✅ Case-insensitive search
- ✅ Partial ID search
- ✅ Stuck sessions filter
- ✅ Session refresh functionality
- ✅ Data consistency across operations

### 3. Session Details Modal
- ✅ Modal opening and closing
- ✅ Complete session information display
- ✅ Data accuracy verification
- ✅ Modal-card data consistency
- ✅ Keyboard navigation (Escape key)
- ✅ Click outside to close
- ✅ Accessibility features

### 4. Session Closure Functionality
- ✅ Close single session modal
- ✅ Close all sessions modal
- ✅ Reason input validation
- ✅ Confirmation dialogs
- ✅ Button state management
- ✅ Error handling

### 5. Session Deletion Functionality
- ✅ Delete session modal
- ✅ Deletion confirmation
- ✅ Button visibility rules
- ✅ Contextual availability
- ✅ Warning messages

### 6. Phase 4 - Receipt Reprocessing
- ✅ Receipt reprocessing modal
- ✅ File upload interface
- ✅ Reason input functionality
- ✅ Button visibility rules
- ✅ Form validation
- ✅ Supported file formats display

### 7. Phase 4 - Delta Export
- ✅ Delta export modal
- ✅ Export type selection
- ✅ Advanced options
- ✅ Button state management
- ✅ Export configuration

### 8. Upload Documents Functionality
- ✅ Page navigation
- ✅ Page loading verification
- ✅ Navigation consistency

### 9. Exports Functionality
- ✅ Page navigation
- ✅ Page loading verification
- ✅ Navigation consistency

### 10. Error Handling & Notifications
- ✅ Error notification display
- ✅ Success notification display
- ✅ Network error handling
- ✅ Invalid operation handling

### 11. Responsive Design & Accessibility
- ✅ Desktop viewport (1920x1080)
- ✅ Tablet viewport (768x1024)
- ✅ Mobile viewport (375x667)
- ✅ Keyboard navigation
- ✅ Screen reader accessibility
- ✅ Focus management
- ✅ ARIA attributes

### 12. Performance & Loading
- ✅ Page load performance (< 10 seconds)
- ✅ Session data loading performance (< 5 seconds)
- ✅ Refresh performance (< 5 seconds)
- ✅ API response times

### 13. Data Integrity & API Integration
- ✅ Session data consistency
- ✅ API response validation
- ✅ Health check endpoint
- ✅ Authentication verification
- ✅ Admin endpoint access
- ✅ Error response handling
- ✅ Response headers validation
- ✅ Pagination support
- ✅ Query parameters
- ✅ Concurrent request handling
- ✅ Data consistency across requests
- ✅ Large dataset handling
- ✅ Rate limiting (if implemented)

### 14. Edge Cases & Error Scenarios
- ✅ Empty session list handling
- ✅ Network error simulation
- ✅ Invalid session operations
- ✅ Modal error handling
- ✅ Page navigation during modal operations

## 🎯 Test Categories

### Smoke Tests
Quick validation of core functionality:
```bash
npm run test:smoke
```

### Regression Tests
Comprehensive testing of all features:
```bash
npm run test:regression
```

### Critical Tests
Essential functionality that must always work:
```bash
npm run test:critical
```

## 🔧 Configuration

### Playwright Configuration (`playwright.config.js`)

- **Base URL**: `http://localhost:3000`
- **API Base URL**: `http://localhost:8001`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Chrome Mobile, Safari Mobile
- **Parallel Execution**: Enabled
- **Retries**: 2 on CI, 0 locally
- **Timeouts**: 10s action, 30s navigation
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

### Test Data

Tests use existing session data from the database. No test data setup is required as tests work with the current state of the application.

## 📊 Reporting

### HTML Report
```bash
npm run test:report
```

### JSON Report
```bash
npm run test:json
```

### JUnit Report
```bash
npm run test:junit
```

### Allure Report
```bash
npm run test:allure
```

## 🐛 Debugging

### Debug Mode
```bash
npm run test:debug
```

### UI Mode
```bash
npm run test:ui
```

### Trace Viewer
```bash
npm run test:trace
```

### Screenshots
```bash
npm run test:screenshot
```

## 🚨 Troubleshooting

### Common Issues

1. **Tests fail to start**
   - Ensure Docker containers are running
   - Check that ports 3000 and 8001 are available
   - Verify Node.js version (18+)

2. **API tests fail**
   - Check backend container is running
   - Verify API endpoints are accessible
   - Check authentication headers

3. **UI tests fail**
   - Check frontend container is running
   - Verify frontend is accessible at localhost:3000
   - Check for JavaScript errors in browser console

4. **Modal tests fail**
   - Ensure modals are properly implemented
   - Check for missing modal components
   - Verify modal state management

### Debug Commands

```bash
# Check container status
docker-compose ps

# Check application logs
docker-compose logs frontend
docker-compose logs backend

# Test API endpoints manually
curl -H "x-dev-user: testuser" http://localhost:8001/api/sessions

# Test frontend manually
curl http://localhost:3000
```

## 📈 Performance Benchmarks

- **Page Load**: < 10 seconds
- **Session Data Load**: < 5 seconds
- **API Response**: < 5 seconds
- **Modal Open/Close**: < 1 second
- **Search/Filter**: < 1 second

## 🔄 Continuous Integration

### GitHub Actions Example

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

## 📝 Test Maintenance

### Adding New Tests

1. Create test file in `playwright-tests/` directory
2. Follow naming convention: `feature-name.spec.js`
3. Add appropriate test categories and tags
4. Update this documentation
5. Add npm script if needed

### Updating Existing Tests

1. Ensure tests are still relevant
2. Update assertions if UI changes
3. Maintain test data independence
4. Update documentation

### Test Data Management

- Tests use existing application data
- No test data cleanup required
- Tests are designed to be non-destructive
- Use appropriate selectors to avoid test interference

## 🎉 Success Criteria

A successful test run should show:
- ✅ All tests passing
- ✅ No flaky tests
- ✅ Good performance metrics
- ✅ Clean test reports
- ✅ No console errors
- ✅ Proper accessibility compliance

## 📞 Support

For test-related issues:
1. Check this documentation
2. Review test logs and reports
3. Check application logs
4. Verify environment setup
5. Contact development team

---

**Last Updated**: January 2025
**Test Suite Version**: 1.0.0
**Playwright Version**: 1.40.0


