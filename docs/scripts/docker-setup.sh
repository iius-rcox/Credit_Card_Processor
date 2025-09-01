#!/bin/bash

# Credit Card Processor - Docker Setup Script
# This script sets up the Docker environment for development

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

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop or Docker Engine."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop or Docker daemon."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Check if Docker Compose is available
check_docker_compose() {
    print_status "Checking Docker Compose..."
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    print_success "Docker Compose is available"
}

# Create .env file if it doesn't exist
setup_env_file() {
    print_status "Setting up environment file..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
            print_warning "Please review and update .env file with your configuration"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_success ".env file already exists"
    fi
}

# Clean up existing containers
cleanup_containers() {
    print_status "Cleaning up existing containers..."
    
    docker-compose down --remove-orphans 2>/dev/null || true
    
    print_success "Cleaned up existing containers"
}

# Build containers
build_containers() {
    print_status "Building Docker containers..."
    
    docker-compose build --no-cache
    
    print_success "Built Docker containers"
}

# Start containers
start_containers() {
    print_status "Starting Docker containers..."
    
    docker-compose up -d
    
    print_success "Started Docker containers"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for backend
    print_status "Waiting for backend service..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:8001/health >/dev/null 2>&1; then
            print_success "Backend service is ready"
            break
        fi
        timeout=$((timeout-1))
        sleep 1
    done
    
    if [ $timeout -eq 0 ]; then
        print_error "Backend service failed to start within 30 seconds"
        print_status "Checking backend logs:"
        docker-compose logs backend
        exit 1
    fi
    
    # Wait for frontend
    print_status "Waiting for frontend service..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_success "Frontend service is ready"
            break
        fi
        timeout=$((timeout-1))
        sleep 1
    done
    
    if [ $timeout -eq 0 ]; then
        print_error "Frontend service failed to start within 30 seconds"
        print_status "Checking frontend logs:"
        docker-compose logs frontend
        exit 1
    fi
}

# Display service information
show_info() {
    echo
    print_success "Docker environment is ready!"
    echo
    echo -e "${BLUE}Service URLs:${NC}"
    echo "  Frontend:      http://localhost:3000"
    echo "  Backend API:   http://localhost:8001"
    echo "  Backend Docs:  http://localhost:8001/docs"
    echo "  Backend Health: http://localhost:8001/health"
    echo
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  View logs:     docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart:       docker-compose restart"
    echo "  Status:        docker-compose ps"
    echo
    echo -e "${BLUE}Development:${NC}"
    echo "  - Backend hot reload: Edit files in backend/app/"
    echo "  - Frontend hot reload: Edit files in frontend/src/"
    echo "  - Both services will automatically restart on file changes"
    echo
}

# Main setup function
main() {
    echo -e "${BLUE}Credit Card Processor - Docker Setup${NC}"
    echo "=========================================="
    echo
    
    # Run setup steps
    check_docker
    check_docker_compose
    setup_env_file
    cleanup_containers
    build_containers
    start_containers
    wait_for_services
    show_info
    
    print_success "Setup completed successfully!"
}

# Handle script arguments
case "${1:-setup}" in
    setup)
        main
        ;;
    clean)
        print_status "Cleaning up Docker environment..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed"
        ;;
    restart)
        print_status "Restarting Docker environment..."
        docker-compose restart
        print_success "Restart completed"
        ;;
    logs)
        docker-compose logs -f
        ;;
    status)
        docker-compose ps
        ;;
    *)
        echo "Usage: $0 [setup|clean|restart|logs|status]"
        echo
        echo "Commands:"
        echo "  setup   - Set up and start the Docker environment (default)"
        echo "  clean   - Clean up containers and volumes"
        echo "  restart - Restart all services"
        echo "  logs    - Show and follow logs"
        echo "  status  - Show container status"
        exit 1
        ;;
esac