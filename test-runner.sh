#!/bin/bash

# Credit Card Processor - Test Runner Script
# This script provides an easy way to run different test configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if containers are running
check_containers() {
    if ! docker-compose ps --services --filter "status=running" | grep -q "frontend\|backend"; then
        print_warning "Required containers are not running. Starting them..."
        docker-compose up -d
        print_status "Waiting for services to be ready..."
        sleep 10
    else
        print_success "Required containers are running"
    fi
}

# Function to check if services are accessible
check_services() {
    print_status "Checking service accessibility..."
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend is accessible at http://localhost:3000"
    else
        print_error "Frontend is not accessible at http://localhost:3000"
        exit 1
    fi
    
    # Check backend
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        print_success "Backend is accessible at http://localhost:8001"
    else
        print_error "Backend is not accessible at http://localhost:8001"
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_status "Installing Playwright browsers..."
    npx playwright install
    print_success "Dependencies installed"
}

# Function to run tests
run_tests() {
    local test_command="$1"
    local test_name="$2"
    
    print_status "Running $test_name..."
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        print_success "$test_name completed successfully!"
    else
        print_error "$test_name failed!"
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "Credit Card Processor - Test Runner"
    echo "=================================="
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  all                 Run all tests"
    echo "  complete           Run complete functionality tests"
    echo "  session            Run session management tests"
    echo "  modals             Run modal functionality tests"
    echo "  api                Run API integration tests"
    echo "  phase4             Run Phase 4 functionality tests"
    echo "  smoke              Run smoke tests"
    echo "  regression         Run regression tests"
    echo "  critical           Run critical tests"
    echo "  browsers           Run tests on all browsers"
    echo "  mobile             Run mobile tests"
    echo "  headed             Run tests with visible browser"
    echo "  debug              Run tests in debug mode"
    echo "  ui                 Run tests in UI mode"
    echo "  report             Show test report"
    echo "  clean              Clean test artifacts"
    echo "  setup              Setup test environment"
    echo "  check              Check environment only"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 all             # Run all tests"
    echo "  $0 smoke           # Run smoke tests"
    echo "  $0 headed          # Run with visible browser"
    echo "  $0 debug           # Run in debug mode"
}

# Main script logic
main() {
    case "${1:-help}" in
        "all")
            check_docker
            check_containers
            check_services
            run_tests "npm test" "All Tests"
            ;;
        "complete")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:complete" "Complete Functionality Tests"
            ;;
        "session")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:session-management" "Session Management Tests"
            ;;
        "modals")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:modals" "Modal Functionality Tests"
            ;;
        "api")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:api" "API Integration Tests"
            ;;
        "phase4")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:phase4" "Phase 4 Functionality Tests"
            ;;
        "smoke")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:smoke" "Smoke Tests"
            ;;
        "regression")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:regression" "Regression Tests"
            ;;
        "critical")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:critical" "Critical Tests"
            ;;
        "browsers")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:all-browsers" "All Browsers Tests"
            ;;
        "mobile")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:mobile" "Mobile Tests"
            ;;
        "headed")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:headed" "Headed Tests"
            ;;
        "debug")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:debug" "Debug Tests"
            ;;
        "ui")
            check_docker
            check_containers
            check_services
            run_tests "npm run test:ui" "UI Tests"
            ;;
        "report")
            print_status "Opening test report..."
            npm run test:report
            ;;
        "clean")
            print_status "Cleaning test artifacts..."
            npm run test:clean
            print_success "Test artifacts cleaned"
            ;;
        "setup")
            print_status "Setting up test environment..."
            check_docker
            install_dependencies
            check_containers
            check_services
            print_success "Test environment setup complete"
            ;;
        "check")
            print_status "Checking environment..."
            check_docker
            check_containers
            check_services
            print_success "Environment check complete"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"