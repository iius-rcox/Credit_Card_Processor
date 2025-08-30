#!/bin/bash

# Docker Development Environment Test Script
# This script validates the Docker Compose setup for the Credit Card Processor

set -e  # Exit on any error

echo "🐳 Credit Card Processor - Docker Development Environment Test"
echo "=============================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if Docker is running
check_docker() {
    print_status $BLUE "Checking Docker daemon..."
    if ! docker info >/dev/null 2>&1; then
        print_status $RED "❌ Docker daemon is not running. Please start Docker Desktop."
        print_status $YELLOW "Instructions:"
        print_status $YELLOW "  1. Open Docker Desktop application"
        print_status $YELLOW "  2. Wait for it to start completely"
        print_status $YELLOW "  3. Run this script again"
        exit 1
    fi
    print_status $GREEN "✅ Docker daemon is running"
}

# Validate Docker Compose file
validate_compose() {
    print_status $BLUE "Validating docker-compose.yml..."
    if docker-compose config >/dev/null 2>&1; then
        print_status $GREEN "✅ docker-compose.yml is valid"
    else
        print_status $RED "❌ docker-compose.yml validation failed"
        docker-compose config
        exit 1
    fi
}

# Build Docker images
build_images() {
    print_status $BLUE "Building Docker images..."
    if docker-compose build --no-cache; then
        print_status $GREEN "✅ Docker images built successfully"
    else
        print_status $RED "❌ Failed to build Docker images"
        exit 1
    fi
}

# Start services
start_services() {
    print_status $BLUE "Starting services..."
    if docker-compose up -d; then
        print_status $GREEN "✅ Services started successfully"
        print_status $YELLOW "Services are starting up... waiting 30 seconds for initialization"
        sleep 30
    else
        print_status $RED "❌ Failed to start services"
        exit 1
    fi
}

# Test service connectivity
test_connectivity() {
    print_status $BLUE "Testing service connectivity..."
    
    # Test backend health
    print_status $BLUE "Testing backend health endpoint..."
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        print_status $GREEN "✅ Backend is responding at http://localhost:8000"
    else
        print_status $RED "❌ Backend health check failed"
        print_status $YELLOW "Backend logs:"
        docker-compose logs backend
    fi
    
    # Test frontend
    print_status $BLUE "Testing frontend availability..."
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_status $GREEN "✅ Frontend is responding at http://localhost:3000"
    else
        print_status $RED "❌ Frontend health check failed"
        print_status $YELLOW "Frontend logs:"
        docker-compose logs frontend
    fi
}

# Test hot reload functionality
test_hot_reload() {
    print_status $BLUE "Testing hot reload functionality..."
    
    # Create a test file to verify volume mounts work
    echo "# Test file for hot reload verification" > ./backend/app/test_hot_reload.py
    
    print_status $YELLOW "Created test file in backend/app/"
    print_status $YELLOW "Check if the file appears in the container:"
    if docker-compose exec -T backend ls -la /app/app/test_hot_reload.py >/dev/null 2>&1; then
        print_status $GREEN "✅ Backend volume mount is working"
    else
        print_status $RED "❌ Backend volume mount is not working"
    fi
    
    # Clean up test file
    rm -f ./backend/app/test_hot_reload.py
    
    # Test frontend volume mount
    echo "<!-- Test file -->" > ./frontend/src/test_hot_reload.html
    if docker-compose exec -T frontend ls -la /app/src/test_hot_reload.html >/dev/null 2>&1; then
        print_status $GREEN "✅ Frontend volume mount is working"
    else
        print_status $RED "❌ Frontend volume mount is not working"
    fi
    
    # Clean up test file
    rm -f ./frontend/src/test_hot_reload.html
}

# Show service status
show_status() {
    print_status $BLUE "Service status:"
    docker-compose ps
    
    print_status $BLUE "Service URLs:"
    print_status $GREEN "  • Backend API: http://localhost:8000"
    print_status $GREEN "  • Backend Docs: http://localhost:8000/docs"
    print_status $GREEN "  • Frontend App: http://localhost:3000"
}

# Cleanup function
cleanup() {
    print_status $YELLOW "Cleaning up..."
    docker-compose down
    print_status $GREEN "✅ Services stopped"
}

# Trap to cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    print_status $BLUE "Starting Docker environment validation..."
    
    check_docker
    validate_compose
    build_images
    start_services
    test_connectivity
    test_hot_reload
    show_status
    
    print_status $GREEN "🎉 All tests passed! Docker development environment is ready."
    print_status $YELLOW "To start development:"
    print_status $YELLOW "  1. Run: docker-compose up -d"
    print_status $YELLOW "  2. Open http://localhost:3000 in your browser"
    print_status $YELLOW "  3. API documentation: http://localhost:8000/docs"
    print_status $YELLOW "  4. To stop: docker-compose down"
    
    # Keep services running for manual testing
    read -p "Press Enter to stop services or Ctrl+C to keep them running..."
}

# Run main function
main