# Comprehensive Testing Documentation

## Overview

This document outlines the comprehensive testing suite for the Credit Card Processor application, covering all aspects of testing from unit tests to end-to-end security validation.

## Test Architecture

The testing suite follows the test pyramid approach:
- **Unit Tests** (Base): Fast, isolated tests for individual components
- **Integration Tests** (Middle): API and service integration testing
- **End-to-End Tests** (Top): Full workflow testing with real browsers

## Test Structure

```
├── backend/tests/                 # Backend unit and integration tests
│   ├── conftest.py               # Pytest configuration and fixtures
│   ├── test_authentication.py   # Authentication & authorization tests
│   ├── test_file_upload.py      # File upload API tests
│   ├── test_processing_api.py   # Processing workflow tests
│   └── test_export_api.py       # Export functionality tests
├── frontend/src/                 # Frontend unit and component tests
│   ├── test/setup.js            # Vitest configuration
│   └── components/__tests__/     # Component test files
├── tests/                        # Integration and E2E tests
│   ├── car_file.pdf             # Test CAR file
│   ├── receipt_file.pdf         # Test receipt file
│   ├── e2e-comprehensive/       # Complete workflow E2E tests
│   └── security/                # Security-focused tests
├── .github/workflows/           # CI/CD pipeline
└── test-runner.sh              # Comprehensive test runner script
```

## Backend Testing (`pytest`)

### Key Test Files

#### 1. Authentication Tests (`test_authentication.py`)
- **Purpose**: Test authentication and authorization mechanisms
- **Coverage**:
  - User login/logout flows
  - Admin vs regular user permissions
  - Session management and timeout
  - Invalid credentials handling
  - Security headers validation
  - Role escalation prevention
  - Session isolation between users

#### 2. File Upload Tests (`test_file_upload.py`)
- **Purpose**: Test file upload functionality and validation
- **Coverage**:
  - Valid CAR and Receipt file uploads
  - File validation (size, type, content)
  - Path traversal security testing
  - Concurrent upload handling
  - File metadata extraction
  - Malicious file detection

#### 3. Processing API Tests (`test_processing_api.py`)
- **Purpose**: Test document processing workflow
- **Coverage**:
  - Start/pause/resume/cancel processing
  - Processing state management
  - Employee data merging logic
  - Validation status handling
  - Error recovery mechanisms
  - Concurrent processing scenarios

#### 4. Export API Tests (`test_export_api.py`)
- **Purpose**: Test data export functionality
- **Coverage**:
  - pVault CSV generation
  - Excel report generation
  - PDF report generation
  - Export history tracking
  - File download functionality
  - Export permissions and access control

### Running Backend Tests

```bash
# Run all backend tests with coverage
cd backend
python -m pytest tests/ --cov=app --cov-report=html --cov-report=term-missing

# Run specific test file
python -m pytest tests/test_authentication.py -v

# Run with coverage threshold
python -m pytest tests/ --cov=app --cov-fail-under=80
```

### Backend Test Configuration

Tests use the following fixtures and configuration:
- **Database**: In-memory SQLite for fast execution
- **Authentication**: Mock user headers for development environment
- **File Uploads**: Mock file objects with configurable content
- **API Client**: AsyncClient for HTTP testing
- **Coverage**: Minimum 80% threshold

## Frontend Testing (`Vitest` + `Vue Test Utils`)

### Key Test Files

#### 1. FileUpload Component Tests
- **File**: `frontend/src/components/__tests__/FileUpload.test.js`
- **Coverage**:
  - Drag and drop functionality
  - File validation (type, size, content)
  - Upload progress tracking
  - Error handling and retry
  - Delta processing detection
  - Processing options configuration

#### 2. WebSocket Processing Tests
- **File**: `frontend/src/components/__tests__/ProcessingWebSocket.test.js`
- **Coverage**:
  - WebSocket connection management
  - Real-time processing updates
  - Message parsing and validation
  - Reconnection logic
  - Error handling
  - Memory leak prevention

### Running Frontend Tests

```bash
# Run all frontend tests
cd frontend
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test FileUpload.test.js

# Run in watch mode
npm test -- --watch
```

## Integration & End-to-End Testing (`Playwright`)

### Complete Workflow Test
- **File**: `tests/e2e-comprehensive/complete-workflow.spec.js`
- **Purpose**: Test the entire application workflow using real files
- **Test Flow**:
  1. Create new processing session
  2. Upload CAR file (`tests/car_file.pdf`)
  3. Upload Receipt file (`tests/receipt_file.pdf`)
  4. Start processing and monitor progress
  5. Review processing results
  6. Handle validation issues
  7. Export all required reports (CSV, Excel, PDF)
  8. Verify export history tracking

### Security Testing Suite
- **File**: `tests/security/security-comprehensive.spec.js`
- **Coverage**:
  - Path traversal prevention
  - File type validation security
  - Input sanitization (XSS, SQL injection)
  - Authentication/authorization security
  - CORS and security headers
  - Session security
  - API endpoint security

### Running E2E Tests

```bash
# Install Playwright browsers
npx playwright install --with-deps

# Run all E2E tests
npx playwright test

# Run specific test suite
npx playwright test tests/e2e-comprehensive/

# Run with UI mode
npx playwright test --ui

# Generate HTML report
npx playwright show-report
```

## Security Testing

### Security Test Categories

1. **Authentication Security**
   - Session hijacking prevention
   - Privilege escalation prevention
   - User enumeration protection
   - Authentication header validation

2. **File Upload Security**
   - Path traversal prevention
   - Malicious file detection
   - File type validation
   - EICAR virus signature detection

3. **Input Validation**
   - XSS prevention
   - SQL injection prevention
   - Command injection prevention
   - Content sanitization

4. **API Security**
   - Endpoint enumeration prevention
   - Rate limiting validation
   - Error information disclosure
   - CORS configuration

### Running Security Tests

```bash
# Run comprehensive security tests
npx playwright test tests/security/

# Run with detailed reporting
npx playwright test tests/security/ --reporter=html

# Security-only test run
./test-runner.sh --security-only
```

## Test Data

The test suite uses realistic test files for comprehensive validation:

- **CAR File**: `tests/car_file.pdf` (555KB)
- **Receipt File**: `tests/receipt_file.pdf` (192MB)

These files are used to test:
- Large file handling
- Real PDF processing
- Document intelligence extraction
- Performance under realistic conditions

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/test-pipeline.yml`) provides:

### Test Stages
1. **Backend Unit Tests** - Python/pytest with PostgreSQL
2. **Frontend Unit Tests** - Node.js/Vitest with coverage
3. **Security Tests** - OWASP ZAP, dependency audits
4. **Integration Tests** - Docker-based full stack testing
5. **E2E Tests** - Playwright browser automation
6. **Performance Tests** - Load testing and Lighthouse audits
7. **Code Quality** - Linting, formatting, SonarCloud

### Pipeline Features
- **Parallel Execution**: Tests run concurrently where possible
- **Caching**: Dependencies and build artifacts are cached
- **Coverage Reporting**: Codecov integration
- **Security Scanning**: Vulnerability scans on Docker images
- **Test Reporting**: JUnit XML and HTML reports
- **Artifact Storage**: Test results and logs preserved

## Test Runner Script

The `test-runner.sh` script provides a unified interface for running tests:

```bash
# Run all tests
./test-runner.sh

# Quick mode (unit tests only)
./test-runner.sh --quick

# Security tests only
./test-runner.sh --security-only

# E2E tests only
./test-runner.sh --e2e-only

# Skip Docker build
./test-runner.sh --skip-build

# Verbose output
./test-runner.sh --verbose
```

### Script Features
- **Pre-flight Checks**: Validates required tools and versions
- **Environment Setup**: Configures test environment automatically
- **Progress Tracking**: Real-time test execution monitoring
- **Result Aggregation**: Combines results from all test suites
- **Report Generation**: Creates comprehensive test reports
- **Cleanup**: Automatic cleanup of test resources

## Test Configuration Files

### Backend Configuration
- `backend/conftest.py` - Pytest fixtures and configuration
- `backend/requirements.txt` - Test dependencies
- `.env.test` - Test environment variables

### Frontend Configuration
- `frontend/src/test/setup.js` - Vitest global configuration
- `frontend/vite.config.js` - Test environment setup
- `frontend/package.json` - Test scripts and dependencies

### E2E Configuration
- `config/playwright/playwright.config.js` - Playwright configuration
- `package.json` - E2E test dependencies

## Coverage Requirements

### Minimum Coverage Thresholds
- **Backend**: 80% line coverage
- **Frontend**: 80% line coverage
- **Integration**: Critical path coverage
- **E2E**: Business workflow coverage

### Coverage Reporting
- **Backend**: HTML reports in `backend/htmlcov/`
- **Frontend**: HTML reports in `frontend/coverage/`
- **Combined**: Codecov integration for overall metrics

## Performance Testing

### Performance Test Types
1. **Load Testing**: Locust-based API load testing
2. **Frontend Performance**: Lighthouse audits
3. **Database Performance**: Query optimization tests
4. **Memory Usage**: Memory leak detection

### Performance Metrics
- **Response Time**: API endpoints under load
- **Throughput**: Requests per second
- **Resource Usage**: CPU and memory consumption
- **Frontend Metrics**: Core Web Vitals

## Troubleshooting

### Common Issues

1. **Docker Service Startup**
   ```bash
   # Check service health
   docker-compose ps
   curl -f http://localhost:8001/health
   ```

2. **Database Connection Issues**
   ```bash
   # Reset test database
   cd backend
   alembic upgrade head
   ```

3. **Frontend Build Issues**
   ```bash
   # Clear cache and reinstall
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Playwright Browser Issues**
   ```bash
   # Reinstall browsers
   npx playwright install --with-deps
   ```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
./test-runner.sh --verbose
```

## Best Practices

### Test Writing Guidelines
1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Test names should explain what is being tested
3. **Independent Tests**: Tests should not depend on each other
4. **Realistic Data**: Use production-like test data
5. **Error Scenarios**: Test both success and failure cases

### Security Testing Guidelines
1. **Input Validation**: Test all user inputs
2. **Authentication**: Verify all auth scenarios
3. **Authorization**: Test access controls
4. **Data Sanitization**: Verify XSS/injection prevention
5. **File Security**: Test file upload security

### Performance Testing Guidelines
1. **Realistic Load**: Use production-like traffic patterns
2. **Resource Monitoring**: Track CPU, memory, database
3. **Bottleneck Identification**: Identify performance constraints
4. **Baseline Metrics**: Establish performance baselines
5. **Regression Testing**: Monitor performance over time

## Reporting and Metrics

### Test Reports
- **JUnit XML**: Machine-readable test results
- **HTML Reports**: Human-readable test results
- **Coverage Reports**: Code coverage analysis
- **Security Reports**: Vulnerability assessments

### Metrics Tracking
- **Test Execution Time**: Monitor test performance
- **Test Stability**: Track flaky tests
- **Coverage Trends**: Monitor coverage over time
- **Security Issues**: Track security findings

This comprehensive testing suite ensures the Credit Card Processor application maintains high quality, security, and reliability across all components and workflows.