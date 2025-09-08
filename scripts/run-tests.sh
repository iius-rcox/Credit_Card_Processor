#!/bin/bash

# Credit Card Processor - Test Automation Suite
# This script runs the comprehensive testing suite with proper reporting

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_REPORTS_DIR="test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${TEST_REPORTS_DIR}/test-run-${TIMESTAMP}.log"

# Create reports directory
mkdir -p "${TEST_REPORTS_DIR}"

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Credit Card Processor - Test Automation Suite${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Started: $(date)${NC}"
echo -e "${BLUE}Log file: ${LOG_FILE}${NC}"
echo ""

# Initialize log file
{
    echo "Credit Card Processor - Test Automation Suite"
    echo "Started: $(date)"
    echo "=============================================="
    echo ""
} > "${LOG_FILE}"

# Function to log and display messages
log_message() {
    local level=$1
    local message=$2
    local color=$NC
    
    case $level in
        "INFO") color=$BLUE ;;
        "SUCCESS") color=$GREEN ;;
        "WARNING") color=$YELLOW ;;
        "ERROR") color=$RED ;;
    esac
    
    echo -e "${color}[$level] $message${NC}"
    echo "[$level] $message" >> "${LOG_FILE}"
}

# Function to run test suite with error handling
run_test_suite() {
    local test_name=$1
    local test_command=$2
    local test_pattern=$3
    
    log_message "INFO" "Running $test_name..."
    
    local start_time=$(date +%s)
    local test_output_file="${TEST_REPORTS_DIR}/${test_name}-${TIMESTAMP}.txt"
    
    if eval "$test_command" > "$test_output_file" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # Extract test results
        local passed=$(grep -o "passed" "$test_output_file" | wc -l || echo "0")
        local failed=$(grep -o "failed" "$test_output_file" | wc -l || echo "0")
        
        if [[ $failed -eq 0 ]]; then
            log_message "SUCCESS" "$test_name completed successfully ($duration seconds)"
            log_message "SUCCESS" "  Tests passed: $passed"
        else
            log_message "WARNING" "$test_name completed with failures ($duration seconds)"
            log_message "WARNING" "  Tests passed: $passed, failed: $failed"
        fi
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_message "ERROR" "$test_name failed ($duration seconds)"
        log_message "ERROR" "  See $test_output_file for details"
        
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log_message "INFO" "Checking prerequisites..."
    
    # Check if services are running
    if ! curl -s http://localhost:3000 >/dev/null 2>&1; then
        log_message "WARNING" "Frontend service not responding on localhost:3000"
    else
        log_message "SUCCESS" "Frontend service is running"
    fi
    
    if ! curl -s http://localhost:8001/api/health >/dev/null 2>&1; then
        log_message "WARNING" "Backend service not responding on localhost:8001"
    else
        log_message "SUCCESS" "Backend service is running"
    fi
    
    # Check if Docker containers are running
    if command -v docker >/dev/null 2>&1; then
        local backend_status=$(docker ps --filter "name=credit-card-backend" --format "{{.Status}}" | head -1)
        if [[ -n "$backend_status" ]]; then
            log_message "SUCCESS" "Backend Docker container is running: $backend_status"
        else
            log_message "WARNING" "Backend Docker container not found"
        fi
    fi
    
    # Check Node.js and npm
    if command -v node >/dev/null 2>&1; then
        log_message "SUCCESS" "Node.js $(node --version) available"
    else
        log_message "ERROR" "Node.js not found"
        return 1
    fi
    
    if command -v npx >/dev/null 2>&1; then
        log_message "SUCCESS" "npx available"
    else
        log_message "ERROR" "npx not found"
        return 1
    fi
    
    return 0
}

# Function to generate test summary
generate_summary() {
    local total_suites=$1
    local successful_suites=$2
    local failed_suites=$3
    
    log_message "INFO" "Generating test summary..."
    
    local summary_file="${TEST_REPORTS_DIR}/test-summary-${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# Test Automation Summary

**Date:** $(date)
**Duration:** $(($(date +%s) - START_TIME)) seconds

## Overview
- Total test suites: $total_suites
- Successful suites: $successful_suites
- Failed suites: $failed_suites
- Success rate: $(( (successful_suites * 100) / total_suites ))%

## Test Suites

EOF
    
    # Add individual test results
    for report in "${TEST_REPORTS_DIR}"/*-"${TIMESTAMP}".txt; do
        if [[ -f "$report" ]]; then
            local suite_name=$(basename "$report" | sed "s/-${TIMESTAMP}.txt//")
            echo "### $suite_name" >> "$summary_file"
            echo '```' >> "$summary_file"
            tail -20 "$report" >> "$summary_file"
            echo '```' >> "$summary_file"
            echo "" >> "$summary_file"
        fi
    done
    
    log_message "SUCCESS" "Test summary generated: $summary_file"
}

# Main test execution
main() {
    local START_TIME=$(date +%s)
    local total_suites=0
    local successful_suites=0
    local failed_suites=0
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_message "ERROR" "Prerequisites check failed"
        exit 1
    fi
    
    echo ""
    log_message "INFO" "Starting comprehensive test suite execution..."
    echo ""
    
    # Test Suite 1: Authentication Tests
    if run_test_suite "authentication-tests" "npx playwright test tests/e2e/auth/ --reporter=line --project=chromium"; then
        ((successful_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    
    # Test Suite 2: Happy Path Tests
    if run_test_suite "happy-path-tests" "npx playwright test tests/e2e/happy-path.spec.js --reporter=line --project=chromium"; then
        ((successful_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    
    # Test Suite 3: File Upload Tests
    if run_test_suite "file-upload-tests" "npx playwright test tests/e2e/upload/ --reporter=line --project=chromium"; then
        ((successful_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    
    # Test Suite 4: Session Management Tests
    if run_test_suite "session-management-tests" "npx playwright test tests/e2e/processing/ --reporter=line --project=chromium"; then
        ((successful_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    
    # Test Suite 5: Error Handling Tests
    if run_test_suite "error-handling-tests" "npx playwright test tests/e2e/error-handling.spec.js --reporter=line --project=chromium"; then
        ((successful_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    
    # Test Suite 6: Performance Tests
    if run_test_suite "performance-tests" "npx playwright test tests/performance/ --reporter=line --project=chromium"; then
        ((successful_suites++))
    else
        ((failed_suites++))
    fi
    ((total_suites++))
    
    echo ""
    log_message "INFO" "Test execution completed"
    
    # Generate summary
    generate_summary "$total_suites" "$successful_suites" "$failed_suites"
    
    echo ""
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}Test Summary${NC}"
    echo -e "${BLUE}=================================================${NC}"
    log_message "INFO" "Total suites: $total_suites"
    log_message "SUCCESS" "Successful: $successful_suites"
    
    if [[ $failed_suites -gt 0 ]]; then
        log_message "ERROR" "Failed: $failed_suites"
    else
        log_message "SUCCESS" "Failed: $failed_suites"
    fi
    
    local success_rate=$(( (successful_suites * 100) / total_suites ))
    
    if [[ $success_rate -ge 80 ]]; then
        log_message "SUCCESS" "Success rate: ${success_rate}%"
        echo -e "${GREEN}Overall result: PASSING${NC}"
        exit 0
    elif [[ $success_rate -ge 60 ]]; then
        log_message "WARNING" "Success rate: ${success_rate}%"
        echo -e "${YELLOW}Overall result: PARTIAL PASS${NC}"
        exit 1
    else
        log_message "ERROR" "Success rate: ${success_rate}%"
        echo -e "${RED}Overall result: FAILING${NC}"
        exit 2
    fi
}

# Run main function
main "$@"