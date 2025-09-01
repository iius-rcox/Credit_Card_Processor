#!/bin/bash

# Performance Testing Script for Credit Card Processor
# This script runs various performance tests and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$PROJECT_DIR/tests/performance/results"
BASE_URL="${BASE_URL:-http://localhost:8001}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Test configurations
declare -A TEST_CONFIGS=(
    ["baseline"]="15 2 10m"      # users, spawn_rate, duration
    ["stress"]="75 5 15m"        # users, spawn_rate, duration  
    ["spike"]="250 25 5m"        # users, spawn_rate, duration
    ["endurance"]="40 2 60m"     # users, spawn_rate, duration
    ["security"]="20 3 10m"      # users, spawn_rate, duration
)

echo -e "${BLUE}🚀 Credit Card Processor Performance Testing Suite${NC}"
echo "==============================================="

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}🔍 Checking Prerequisites${NC}"
    echo "------------------------"
    
    # Check if application is running
    if ! curl -s -f "$BASE_URL/health" > /dev/null; then
        echo -e "${RED}❌ Application not accessible at $BASE_URL${NC}"
        echo "   Please start the application first:"
        echo "   docker-compose -f docker-compose.prod.yml up -d"
        exit 1
    fi
    echo -e "${GREEN}✅ Application is accessible${NC}"
    
    # Check if locust is installed
    if ! command -v locust &> /dev/null; then
        echo -e "${RED}❌ Locust is not installed${NC}"
        echo "   Install with: pip install locust"
        exit 1
    fi
    echo -e "${GREEN}✅ Locust is available${NC}"
    
    # Check if Python dependencies are available
    if ! python3 -c "import aiohttp, psutil, faker" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Installing required Python packages...${NC}"
        pip install aiohttp psutil faker
    fi
    echo -e "${GREEN}✅ Python dependencies are available${NC}"
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    echo -e "${GREEN}✅ Results directory ready: $RESULTS_DIR${NC}"
}

# Function to run benchmark suite
run_benchmark() {
    echo -e "\n${BLUE}📊 Running Performance Benchmark Suite${NC}"
    echo "---------------------------------------"
    
    cd "$PROJECT_DIR"
    
    # Run Python benchmark
    python3 -c "
import asyncio
import sys
sys.path.append('tests/performance')
from benchmark_suite import run_benchmark

async def main():
    try:
        results = await run_benchmark()
        print('Benchmark completed successfully')
        return 0
    except Exception as e:
        print(f'Benchmark failed: {e}')
        return 1

exit(asyncio.run(main()))
"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Benchmark suite completed${NC}"
    else
        echo -e "${RED}❌ Benchmark suite failed${NC}"
        return 1
    fi
}

# Function to run locust load tests
run_load_test() {
    local test_type="$1"
    local config="${TEST_CONFIGS[$test_type]}"
    
    if [ -z "$config" ]; then
        echo -e "${RED}❌ Unknown test type: $test_type${NC}"
        return 1
    fi
    
    read -r users spawn_rate duration <<< "$config"
    
    echo -e "\n${BLUE}🔥 Running $test_type Load Test${NC}"
    echo "Test Configuration:"
    echo "  Users: $users"
    echo "  Spawn Rate: $spawn_rate/sec"
    echo "  Duration: $duration"
    echo "  Target: $BASE_URL"
    echo "------------------------"
    
    # Prepare results file
    local results_file="$RESULTS_DIR/locust_${test_type}_${TIMESTAMP}"
    
    cd "$PROJECT_DIR"
    
    # Run locust test
    if locust \
        -f tests/performance/locustfile.py \
        --host "$BASE_URL" \
        --tag "$test_type" \
        --users "$users" \
        --spawn-rate "$spawn_rate" \
        --run-time "$duration" \
        --headless \
        --html "${results_file}.html" \
        --csv "${results_file}" \
        --logfile "${results_file}.log"
    then
        echo -e "${GREEN}✅ $test_type load test completed${NC}"
        echo -e "   Results: ${results_file}.html"
        return 0
    else
        echo -e "${RED}❌ $test_type load test failed${NC}"
        return 1
    fi
}

# Function to run all load tests
run_all_load_tests() {
    echo -e "\n${BLUE}🔥 Running All Load Test Scenarios${NC}"
    echo "==================================="
    
    local failed_tests=0
    
    for test_type in "${!TEST_CONFIGS[@]}"; do
        if run_load_test "$test_type"; then
            echo -e "${GREEN}✅ $test_type: PASSED${NC}"
        else
            echo -e "${RED}❌ $test_type: FAILED${NC}"
            ((failed_tests++))
        fi
        
        # Wait between tests to let system recover
        if [ "$test_type" != "security" ]; then  # Don't wait after last test
            echo -e "${YELLOW}⏳ Waiting 30 seconds before next test...${NC}"
            sleep 30
        fi
    done
    
    echo -e "\n${BLUE}📊 Load Test Summary${NC}"
    echo "===================="
    local total_tests=${#TEST_CONFIGS[@]}
    local passed_tests=$((total_tests - failed_tests))
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All load tests passed!${NC}"
        return 0
    else
        echo -e "${RED}⚠️  $failed_tests test(s) failed${NC}"
        return 1
    fi
}

# Function to analyze results
analyze_results() {
    echo -e "\n${BLUE}📈 Analyzing Performance Results${NC}"
    echo "--------------------------------"
    
    if [ ! -d "$RESULTS_DIR" ] || [ -z "$(ls -A $RESULTS_DIR)" ]; then
        echo -e "${YELLOW}⚠️  No results found to analyze${NC}"
        return 0
    fi
    
    echo "Recent test results:"
    ls -la "$RESULTS_DIR" | grep "$TIMESTAMP" || echo "No results from this run"
    
    echo -e "\nResult files located in: $RESULTS_DIR"
    echo "View HTML reports by opening .html files in a browser"
}

# Function to clean old results
clean_results() {
    echo -e "\n${BLUE}🧹 Cleaning Old Results${NC}"
    echo "----------------------"
    
    if [ -d "$RESULTS_DIR" ]; then
        # Keep only last 30 days of results
        find "$RESULTS_DIR" -name "*.html" -mtime +30 -delete
        find "$RESULTS_DIR" -name "*.csv" -mtime +30 -delete
        find "$RESULTS_DIR" -name "*.json" -mtime +30 -delete
        find "$RESULTS_DIR" -name "*.log" -mtime +30 -delete
        echo -e "${GREEN}✅ Cleaned old results (>30 days)${NC}"
    fi
}

# Function to generate performance report
generate_report() {
    echo -e "\n${BLUE}📄 Generating Performance Report${NC}"
    echo "--------------------------------"
    
    local report_file="$RESULTS_DIR/performance_report_${TIMESTAMP}.md"
    
    cat > "$report_file" << EOF
# Performance Test Report

**Date:** $(date)
**Target:** $BASE_URL
**Test Suite:** Credit Card Processor Performance Testing

## Test Configurations

$(for test_type in "${!TEST_CONFIGS[@]}"; do
    config="${TEST_CONFIGS[$test_type]}"
    read -r users spawn_rate duration <<< "$config"
    echo "### $test_type Test"
    echo "- Users: $users"
    echo "- Spawn Rate: $spawn_rate/sec" 
    echo "- Duration: $duration"
    echo ""
done)

## Results Summary

Test results are available in the following formats:
- HTML Reports: Open .html files in browser for interactive analysis
- CSV Data: Raw performance data for further analysis
- Log Files: Detailed execution logs

## Result Files

$(ls -la "$RESULTS_DIR" | grep "$TIMESTAMP" | awk '{print "- " $9}' || echo "No result files found")

## Recommendations

1. **Response Times**: Target <250ms for 95th percentile
2. **Error Rate**: Keep below 1% for production loads
3. **Throughput**: Monitor requests per second capacity
4. **Resource Usage**: CPU <80%, Memory <85% under normal load

## Next Steps

1. Review HTML reports for detailed metrics
2. Analyze error patterns if any failures occurred
3. Compare results with previous test runs
4. Optimize identified bottlenecks
5. Rerun tests after optimizations

EOF

    echo -e "${GREEN}✅ Performance report generated: $report_file${NC}"
}

# Main script logic
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  benchmark          Run performance benchmark suite"
    echo "  load-test [TYPE]   Run specific load test (baseline, stress, spike, endurance, security)"
    echo "  all-tests          Run all load test scenarios"
    echo "  analyze            Analyze recent test results"
    echo "  clean              Clean old test results"
    echo "  report             Generate performance report"
    echo ""
    echo "Options:"
    echo "  --url URL          Override base URL (default: http://localhost:8001)"
    echo ""
    echo "Examples:"
    echo "  $0 benchmark                    # Run benchmark suite"
    echo "  $0 load-test baseline          # Run baseline load test"
    echo "  $0 all-tests                   # Run all load tests"
    echo "  $0 --url http://prod.com all-tests  # Test against production"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        benchmark)
            COMMAND="benchmark"
            shift
            ;;
        load-test)
            COMMAND="load-test"
            TEST_TYPE="$2"
            shift 2
            ;;
        all-tests)
            COMMAND="all-tests"
            shift
            ;;
        analyze)
            COMMAND="analyze"
            shift
            ;;
        clean)
            COMMAND="clean"
            shift
            ;;
        report)
            COMMAND="report"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Default to showing usage if no command provided
if [ -z "$COMMAND" ]; then
    show_usage
    exit 1
fi

# Run the specified command
case $COMMAND in
    benchmark)
        check_prerequisites
        run_benchmark
        analyze_results
        generate_report
        ;;
    load-test)
        if [ -z "$TEST_TYPE" ]; then
            echo -e "${RED}❌ Test type required for load-test command${NC}"
            echo "Available types: ${!TEST_CONFIGS[*]}"
            exit 1
        fi
        check_prerequisites
        run_load_test "$TEST_TYPE"
        analyze_results
        generate_report
        ;;
    all-tests)
        check_prerequisites
        run_benchmark
        run_all_load_tests
        analyze_results
        generate_report
        ;;
    analyze)
        analyze_results
        ;;
    clean)
        clean_results
        ;;
    report)
        generate_report
        ;;
esac

echo -e "\n${GREEN}🎉 Performance testing completed!${NC}"
echo "View results in: $RESULTS_DIR"