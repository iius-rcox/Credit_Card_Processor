#!/bin/bash

##################################################
# Comprehensive Test Runner for Credit Card Processor
# 
# This script runs all test suites in the correct order
# and provides detailed reporting for CI/CD integration
##################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
TESTS_DIR="tests"
RESULTS_DIR="test-results"
COVERAGE_THRESHOLD=80

# Command line options
QUICK_MODE=false
SECURITY_ONLY=false
E2E_ONLY=false
SKIP_BUILD=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick)
      QUICK_MODE=true
      shift
      ;;
    --security-only)
      SECURITY_ONLY=true
      shift
      ;;
    --e2e-only)
      E2E_ONLY=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --quick         Run only fast unit tests"
      echo "  --security-only Run only security tests"
      echo "  --e2e-only      Run only end-to-end tests"
      echo "  --skip-build    Skip building Docker images"
      echo "  --verbose       Enable verbose output"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Utility functions
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

# Create results directory
mkdir -p "$RESULTS_DIR"

# Initialize test results
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS_FILE="$RESULTS_DIR/test-summary.json"

echo '{"timestamp": "'$(date -Iseconds)'", "tests": []}' > "$TEST_RESULTS_FILE"

# Function to record test result
record_test_result() {
  local test_name="$1"
  local status="$2"
  local duration="$3"
  local details="$4"
  
  if [[ "$status" == "passed" ]]; then
    ((TESTS_PASSED++))
  else
    ((TESTS_FAILED++))
  fi
  
  # Update JSON results file
  jq --arg name "$test_name" --arg status "$status" --arg duration "$duration" --arg details "$details" \
     '.tests += [{"name": $name, "status": $status, "duration": $duration, "details": $details}]' \
     "$TEST_RESULTS_FILE" > "$TEST_RESULTS_FILE.tmp" && mv "$TEST_RESULTS_FILE.tmp" "$TEST_RESULTS_FILE"
}

# Function to run a command with timing and error handling
run_test() {
  local test_name="$1"
  local command="$2"
  local start_time=$(date +%s)
  
  log "Running $test_name..."
  
  if [[ "$VERBOSE" == "true" ]]; then
    if eval "$command"; then
      local end_time=$(date +%s)
      local duration=$((end_time - start_time))
      success "$test_name completed in ${duration}s"
      record_test_result "$test_name" "passed" "${duration}s" "Test completed successfully"
      return 0
    else
      local end_time=$(date +%s)
      local duration=$((end_time - start_time))
      error "$test_name failed after ${duration}s"
      record_test_result "$test_name" "failed" "${duration}s" "Test failed with exit code $?"
      return 1
    fi
  else
    if eval "$command" > "$RESULTS_DIR/${test_name// /_}.log" 2>&1; then
      local end_time=$(date +%s)
      local duration=$((end_time - start_time))
      success "$test_name completed in ${duration}s"
      record_test_result "$test_name" "passed" "${duration}s" "Test completed successfully"
      return 0
    else
      local end_time=$(date +%s)
      local duration=$((end_time - start_time))
      error "$test_name failed after ${duration}s (check $RESULTS_DIR/${test_name// /_}.log)"
      record_test_result "$test_name" "failed" "${duration}s" "Test failed - check logs"
      return 1
    fi
  fi
}

# Pre-flight checks
preflight_checks() {
  log "Running pre-flight checks..."
  
  # Check required tools
  local required_tools=("python3" "node" "npm" "docker" "docker-compose")
  for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
      error "$tool is required but not installed"
      exit 1
    fi
  done
  
  # Check Python version
  local python_version=$(python3 --version | cut -d' ' -f2)
  local python_major=$(echo $python_version | cut -d'.' -f1)
  local python_minor=$(echo $python_version | cut -d'.' -f2)
  
  if [[ "$python_major" -lt 3 ]] || [[ "$python_major" -eq 3 && "$python_minor" -lt 9 ]]; then
    error "Python 3.9+ is required, found $python_version"
    exit 1
  fi
  
  # Check Node version
  local node_version=$(node --version | cut -d'v' -f2)
  local node_major=$(echo $node_version | cut -d'.' -f1)
  
  if [[ "$node_major" -lt 18 ]]; then
    error "Node.js 18+ is required, found $node_version"
    exit 1
  fi
  
  # Check if test files exist
  if [[ ! -f "$TESTS_DIR/fixtures/test-car.pdf" ]] || [[ ! -f "$TESTS_DIR/fixtures/test-receipt.pdf" ]]; then
    error "Required test files (test-car.pdf, test-receipt.pdf) not found in $TESTS_DIR/fixtures/"
    exit 1
  fi
  
  success "Pre-flight checks passed"
}

# Setup test environment
setup_environment() {
  log "Setting up test environment..."
  
  # Copy test environment file if it doesn't exist
  if [[ ! -f ".env" ]]; then
    if [[ -f ".env.test.example" ]]; then
      cp .env.test.example .env
      log "Created .env file from .env.test.example"
    else
      warning "No .env.test.example found, creating minimal .env"
      cat > .env << EOF
NODE_ENV=test
DATABASE_URL=sqlite:///./test.db
LOG_LEVEL=INFO
TESTING=true
EOF
    fi
  fi
  
  success "Test environment setup complete"
}

# Install dependencies
install_dependencies() {
  log "Installing dependencies..."
  
  # Backend dependencies
  if [[ -f "$BACKEND_DIR/requirements.txt" ]]; then
    run_test "Backend Dependency Installation" "cd $BACKEND_DIR && pip install -r requirements.txt"
  fi
  
  # Frontend dependencies
  if [[ -f "$FRONTEND_DIR/package.json" ]]; then
    run_test "Frontend Dependency Installation" "cd $FRONTEND_DIR && npm ci"
  fi
  
  # Root dependencies (for E2E tests)
  if [[ -f "package.json" ]]; then
    run_test "Root Dependency Installation" "npm ci"
  fi
}

# Backend tests
run_backend_tests() {
  log "Running backend tests..."
  
  if [[ ! -d "$BACKEND_DIR" ]]; then
    warning "Backend directory not found, skipping backend tests"
    return 0
  fi
  
  # Unit tests
  if [[ "$QUICK_MODE" == "false" ]] || [[ "$E2E_ONLY" == "false" ]]; then
    run_test "Backend Unit Tests" \
      "cd $BACKEND_DIR && python -m pytest tests/ -v --tb=short --cov=app --cov-report=term-missing --cov-report=xml --cov-report=html --cov-fail-under=$COVERAGE_THRESHOLD --junitxml=../$RESULTS_DIR/backend-junit.xml"
  fi
  
  # Integration tests
  if [[ "$QUICK_MODE" == "false" ]]; then
    run_test "Backend Integration Tests" \
      "cd $BACKEND_DIR && python -m pytest tests/integration/ -v --tb=short --junitxml=../$RESULTS_DIR/backend-integration-junit.xml" || true
  fi
  
  # API tests
  if [[ "$QUICK_MODE" == "false" ]]; then
    run_test "Backend API Tests" \
      "cd $BACKEND_DIR && python -m pytest tests/test_*_api.py -v --tb=short --junitxml=../$RESULTS_DIR/backend-api-junit.xml"
  fi
}

# Frontend tests
run_frontend_tests() {
  log "Running frontend tests..."
  
  if [[ ! -d "$FRONTEND_DIR" ]]; then
    warning "Frontend directory not found, skipping frontend tests"
    return 0
  fi
  
  # Lint check
  if [[ "$QUICK_MODE" == "false" ]]; then
    run_test "Frontend Linting" \
      "cd $FRONTEND_DIR && npm run lint" || true
  fi
  
  # Unit tests
  if [[ "$E2E_ONLY" == "false" ]]; then
    run_test "Frontend Unit Tests" \
      "cd $FRONTEND_DIR && npm run test:coverage -- --reporter=verbose --reporter=junit --outputFile=../$RESULTS_DIR/frontend-junit.xml"
  fi
  
  # Component tests
  if [[ "$QUICK_MODE" == "false" && "$E2E_ONLY" == "false" ]]; then
    run_test "Frontend Component Tests" \
      "cd $FRONTEND_DIR && npm test src/components/__tests__/ -- --reporter=junit --outputFile=../$RESULTS_DIR/frontend-component-junit.xml" || true
  fi
}

# Build application
build_application() {
  if [[ "$SKIP_BUILD" == "true" ]]; then
    log "Skipping application build"
    return 0
  fi
  
  log "Building application..."
  
  # Build with Docker Compose
  run_test "Docker Build" \
    "docker-compose build"
  
  # Start services for integration tests
  if [[ "$E2E_ONLY" == "false" ]]; then
    run_test "Start Services" \
      "docker-compose up -d && sleep 30"
    
    # Health check
    run_test "Health Check" \
      "timeout 60 bash -c 'until curl -f http://localhost:8001/health; do sleep 2; done' && timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'"
  fi
}

# Integration tests
run_integration_tests() {
  if [[ "$QUICK_MODE" == "true" ]] || [[ "$E2E_ONLY" == "true" ]] || [[ "$SECURITY_ONLY" == "true" ]]; then
    return 0
  fi
  
  log "Running integration tests..."
  
  # API integration tests
  run_test "API Integration Tests" \
    "cd $BACKEND_DIR && python -m pytest tests/integration/ -v --tb=short --junitxml=../$RESULTS_DIR/integration-junit.xml" || true
  
  # Database migration tests
  run_test "Database Migration Tests" \
    "cd $BACKEND_DIR && python -m pytest tests/test_migrations.py -v --tb=short" || true
}

# End-to-End tests
run_e2e_tests() {
  if [[ "$SECURITY_ONLY" == "true" ]]; then
    return 0
  fi
  
  log "Running end-to-end tests..."
  
  # Ensure services are running
  if [[ "$E2E_ONLY" == "true" ]]; then
    run_test "Start Services for E2E" \
      "docker-compose up -d && sleep 45"
    
    run_test "E2E Health Check" \
      "timeout 120 bash -c 'until curl -f http://localhost:8001/health; do sleep 3; done' && timeout 120 bash -c 'until curl -f http://localhost:3000; do sleep 3; done'"
  fi
  
  # Install Playwright if needed
  if ! npx playwright --version &> /dev/null; then
    run_test "Install Playwright" \
      "npx playwright install --with-deps"
  fi
  
  # Run comprehensive E2E tests
  run_test "Comprehensive E2E Tests" \
    "npx playwright test tests/e2e-comprehensive/ --reporter=html --reporter=junit --output-dir=$RESULTS_DIR/e2e-results --timeout=120000"
  
  # Run responsive design tests
  if [[ "$QUICK_MODE" == "false" ]]; then
    run_test "Responsive Design Tests" \
      "npx playwright test tests/responsive-design-tests.spec.js --reporter=junit --output-dir=$RESULTS_DIR/responsive-results --timeout=60000" || true
  fi
}

# Security tests
run_security_tests() {
  if [[ "$QUICK_MODE" == "true" ]] || [[ "$E2E_ONLY" == "true" ]]; then
    return 0
  fi
  
  log "Running security tests..."
  
  # Security-focused E2E tests
  run_test "Security E2E Tests" \
    "npx playwright test tests/security/ --reporter=html --reporter=junit --output-dir=$RESULTS_DIR/security-results --timeout=90000"
  
  # Dependency security audit
  if [[ "$SECURITY_ONLY" == "false" ]]; then
    run_test "Backend Security Audit" \
      "cd $BACKEND_DIR && pip-audit --desc --format=json --output=../$RESULTS_DIR/pip-audit.json" || true
    
    run_test "Frontend Security Audit" \
      "cd $FRONTEND_DIR && npm audit --audit-level=moderate --json > ../$RESULTS_DIR/npm-audit.json" || true
  fi
  
  # OWASP ZAP baseline scan (if available)
  if command -v zap-baseline.py &> /dev/null; then
    run_test "OWASP ZAP Baseline Scan" \
      "zap-baseline.py -t http://localhost:3000 -r $RESULTS_DIR/zap-baseline-report.html" || true
  fi
}

# Performance tests
run_performance_tests() {
  if [[ "$QUICK_MODE" == "true" ]] || [[ "$SECURITY_ONLY" == "true" ]] || [[ "$E2E_ONLY" == "true" ]]; then
    return 0
  fi
  
  log "Running performance tests..."
  
  # Load testing with custom script
  if [[ -f "$TESTS_DIR/performance/benchmark_suite.py" ]]; then
    run_test "Performance Benchmarks" \
      "cd $TESTS_DIR/performance && python benchmark_suite.py --output=../../$RESULTS_DIR/performance-results.json" || true
  fi
  
  # Lighthouse audit (if available)
  if command -v lighthouse &> /dev/null; then
    run_test "Lighthouse Performance Audit" \
      "lighthouse http://localhost:3000 --output-path=$RESULTS_DIR/lighthouse-report.html --output=html --chrome-flags='--headless --no-sandbox'" || true
  fi
}

# Cleanup
cleanup() {
  log "Cleaning up test environment..."
  
  # Stop Docker services
  if docker-compose ps -q | grep -q .; then
    log "Stopping Docker services..."
    docker-compose down -v
  fi
  
  # Clean up temporary files
  find . -name "*.pyc" -delete
  find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
  find . -name ".pytest_cache" -type d -exec rm -rf {} + 2>/dev/null || true
  find . -name "node_modules/.cache" -type d -exec rm -rf {} + 2>/dev/null || true
}

# Generate final report
generate_report() {
  log "Generating test report..."
  
  local total_tests=$((TESTS_PASSED + TESTS_FAILED))
  local success_rate=0
  
  if [[ $total_tests -gt 0 ]]; then
    success_rate=$(( (TESTS_PASSED * 100) / total_tests ))
  fi
  
  # Update final results in JSON
  jq --arg passed "$TESTS_PASSED" --arg failed "$TESTS_FAILED" --arg total "$total_tests" --arg rate "$success_rate" \
     '. += {"summary": {"passed": ($passed | tonumber), "failed": ($failed | tonumber), "total": ($total | tonumber), "success_rate": ($rate | tonumber)}}' \
     "$TEST_RESULTS_FILE" > "$TEST_RESULTS_FILE.tmp" && mv "$TEST_RESULTS_FILE.tmp" "$TEST_RESULTS_FILE"
  
  # Generate human-readable report
  cat > "$RESULTS_DIR/test-report.txt" << EOF
Credit Card Processor Test Results
==================================

Test Summary:
- Total Tests: $total_tests
- Passed: $TESTS_PASSED
- Failed: $TESTS_FAILED
- Success Rate: $success_rate%

Detailed Results:
EOF
  
  if [[ -f "$TEST_RESULTS_FILE" ]]; then
    jq -r '.tests[] | "- \(.name): \(.status) (\(.duration))"' "$TEST_RESULTS_FILE" >> "$RESULTS_DIR/test-report.txt"
  fi
  
  echo "" >> "$RESULTS_DIR/test-report.txt"
  echo "Generated: $(date)" >> "$RESULTS_DIR/test-report.txt"
  
  # Display summary
  echo ""
  log "Test Results Summary:"
  echo -e "${BLUE}=================================${NC}"
  echo -e "Total Tests: ${BLUE}$total_tests${NC}"
  echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
  echo -e "Success Rate: ${BLUE}$success_rate%${NC}"
  echo -e "${BLUE}=================================${NC}"
  
  if [[ $TESTS_FAILED -gt 0 ]]; then
    echo ""
    error "Some tests failed. Check logs in $RESULTS_DIR/ for details."
    echo "Detailed report: $RESULTS_DIR/test-report.txt"
    echo "JSON results: $TEST_RESULTS_FILE"
  else
    echo ""
    success "All tests passed!"
  fi
}

# Main execution
main() {
  echo -e "${BLUE}"
  echo "=================================================="
  echo "  Credit Card Processor Comprehensive Test Suite  "
  echo "=================================================="
  echo -e "${NC}"
  
  # Set trap for cleanup on exit
  trap cleanup EXIT
  
  preflight_checks
  setup_environment
  
  if [[ "$SECURITY_ONLY" == "false" ]] && [[ "$E2E_ONLY" == "false" ]]; then
    install_dependencies
  fi
  
  if [[ "$SECURITY_ONLY" == "false" ]]; then
    run_backend_tests
    run_frontend_tests
  fi
  
  if [[ "$E2E_ONLY" == "false" ]] && [[ "$SECURITY_ONLY" == "false" ]]; then
    build_application
    run_integration_tests
  fi
  
  if [[ "$SECURITY_ONLY" == "false" ]]; then
    run_e2e_tests
  fi
  
  run_security_tests
  
  if [[ "$SECURITY_ONLY" == "false" ]] && [[ "$E2E_ONLY" == "false" ]]; then
    run_performance_tests
  fi
  
  generate_report
  
  # Exit with error code if tests failed
  if [[ $TESTS_FAILED -gt 0 ]]; then
    exit 1
  fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi