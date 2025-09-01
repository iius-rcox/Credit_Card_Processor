#!/bin/bash

# Production Deployment Script for Credit Card Processor
# This script handles secure production deployment with validation and monitoring

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
ENV_FILE="${PROJECT_DIR}/.env.production"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${PROJECT_DIR}/backups"
LOG_FILE="${PROJECT_DIR}/logs/deployment-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

echo -e "${BLUE}🚀 Credit Card Processor - Production Deployment${NC}"
echo "=================================================="
log "Starting production deployment"

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}🔍 Checking Prerequisites${NC}"
    echo "-------------------------"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running or not accessible${NC}"
        log "ERROR: Docker not available"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
    log "Docker check passed"
    
    # Check if docker-compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        echo -e "${RED}❌ docker-compose is not installed${NC}"
        log "ERROR: docker-compose not available"
        exit 1
    fi
    echo -e "${GREEN}✅ docker-compose is available${NC}"
    log "docker-compose check passed"
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Production environment file not found: $ENV_FILE${NC}"
        echo "   Create from template: cp .env.production.template $ENV_FILE"
        log "ERROR: Environment file missing"
        exit 1
    fi
    echo -e "${GREEN}✅ Production environment file found${NC}"
    log "Environment file check passed"
    
    # Check if docker-compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}❌ Docker compose file not found: $COMPOSE_FILE${NC}"
        log "ERROR: Docker compose file missing"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker compose file found${NC}"
    log "Docker compose file check passed"
}

# Function to validate environment
validate_environment() {
    echo -e "\n${BLUE}🔐 Validating Environment Configuration${NC}"
    echo "---------------------------------------"
    
    if [ -x "$SCRIPT_DIR/validate-env.sh" ]; then
        log "Running environment validation"
        if "$SCRIPT_DIR/validate-env.sh" "$ENV_FILE"; then
            echo -e "${GREEN}✅ Environment validation passed${NC}"
            log "Environment validation successful"
        else
            echo -e "${RED}❌ Environment validation failed${NC}"
            log "ERROR: Environment validation failed"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Environment validation script not found or not executable${NC}"
        log "WARNING: Environment validation skipped"
    fi
}

# Function to setup SSL certificates
setup_ssl() {
    echo -e "\n${BLUE}🔐 Setting up SSL Certificates${NC}"
    echo "--------------------------------"
    
    SSL_DIR="${PROJECT_DIR}/nginx/ssl"
    
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        echo -e "${YELLOW}⚠️  SSL certificates not found${NC}"
        
        if [ -x "$SCRIPT_DIR/generate-ssl-dev.sh" ]; then
            echo "Generating development SSL certificates..."
            log "Generating SSL certificates"
            cd "$PROJECT_DIR"
            "$SCRIPT_DIR/generate-ssl-dev.sh"
            echo -e "${GREEN}✅ SSL certificates generated${NC}"
            log "SSL certificates generated successfully"
        else
            echo -e "${RED}❌ SSL certificate generation script not found${NC}"
            log "ERROR: SSL certificate setup failed"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ SSL certificates found${NC}"
        log "SSL certificates already exist"
        
        # Check certificate expiration
        EXPIRY_DATE=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$EXPIRY_DATE" ]; then
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || echo "0")
            CURRENT_EPOCH=$(date +%s)
            DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
            
            if [ $DAYS_LEFT -lt 30 ]; then
                echo -e "${YELLOW}⚠️  SSL certificate expires in $DAYS_LEFT days${NC}"
                log "WARNING: SSL certificate expires in $DAYS_LEFT days"
            else
                echo -e "${GREEN}✅ SSL certificate valid for $DAYS_LEFT days${NC}"
                log "SSL certificate valid for $DAYS_LEFT days"
            fi
        fi
    fi
}

# Function to create required directories
create_directories() {
    echo -e "\n${BLUE}📁 Creating Required Directories${NC}"
    echo "---------------------------------"
    
    DIRS=(
        "$PROJECT_DIR/data/production/backend"
        "$PROJECT_DIR/logs/production/backend"
        "$PROJECT_DIR/nginx/logs"
        "$PROJECT_DIR/backups"
    )
    
    for dir in "${DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            echo -e "${GREEN}✅ Created directory: $dir${NC}"
            log "Created directory: $dir"
        else
            echo -e "${GREEN}✅ Directory exists: $dir${NC}"
        fi
    done
}

# Function to backup existing data
backup_data() {
    echo -e "\n${BLUE}💾 Backing Up Existing Data${NC}"
    echo "----------------------------"
    
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_NAME="pre-deployment-backup-$TIMESTAMP"
    FULL_BACKUP_DIR="$BACKUP_DIR/$BACKUP_NAME"
    
    if [ -d "$PROJECT_DIR/data/production/backend" ] && [ "$(ls -A "$PROJECT_DIR/data/production/backend" 2>/dev/null)" ]; then
        mkdir -p "$FULL_BACKUP_DIR"
        cp -r "$PROJECT_DIR/data/production/backend"/* "$FULL_BACKUP_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✅ Data backed up to: $FULL_BACKUP_DIR${NC}"
        log "Data backed up to: $FULL_BACKUP_DIR"
    else
        echo -e "${YELLOW}ℹ️  No existing data to backup${NC}"
        log "No existing data found for backup"
    fi
}

# Function to build and deploy containers
deploy_containers() {
    echo -e "\n${BLUE}🐳 Building and Deploying Containers${NC}"
    echo "-------------------------------------"
    
    cd "$PROJECT_DIR"
    
    # Stop existing containers
    echo "Stopping existing containers..."
    log "Stopping existing containers"
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans || true
    
    # Build images
    echo "Building production images..."
    log "Building production images"
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start services
    echo "Starting production services..."
    log "Starting production services"
    docker-compose -f "$COMPOSE_FILE" up -d
    
    echo -e "${GREEN}✅ Containers deployed successfully${NC}"
    log "Containers deployed successfully"
}

# Function to wait for services to be healthy
wait_for_services() {
    echo -e "\n${BLUE}⏳ Waiting for Services to Start${NC}"
    echo "---------------------------------"
    
    cd "$PROJECT_DIR"
    
    # Wait for services to be healthy
    MAX_WAIT=300  # 5 minutes
    WAIT_TIME=0
    
    while [ $WAIT_TIME -lt $MAX_WAIT ]; do
        BACKEND_HEALTH=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | grep backend || echo "")
        FRONTEND_HEALTH=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | grep frontend || echo "")
        NGINX_HEALTH=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | grep nginx || echo "")
        
        if [ -n "$BACKEND_HEALTH" ] && [ -n "$FRONTEND_HEALTH" ] && [ -n "$NGINX_HEALTH" ]; then
            echo -e "${GREEN}✅ All services are running${NC}"
            log "All services are running"
            break
        fi
        
        echo "Waiting for services to start... ($WAIT_TIME/$MAX_WAIT seconds)"
        sleep 10
        WAIT_TIME=$((WAIT_TIME + 10))
    done
    
    if [ $WAIT_TIME -ge $MAX_WAIT ]; then
        echo -e "${RED}❌ Services failed to start within timeout${NC}"
        log "ERROR: Services failed to start within timeout"
        docker-compose -f "$COMPOSE_FILE" logs
        exit 1
    fi
}

# Function to run health checks
run_health_checks() {
    echo -e "\n${BLUE}🏥 Running Health Checks${NC}"
    echo "-------------------------"
    
    # Test backend health
    echo "Testing backend health..."
    if curl -f -s http://localhost/api/health >/dev/null; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
        log "Backend health check passed"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        log "ERROR: Backend health check failed"
        docker-compose -f "$COMPOSE_FILE" logs backend
        exit 1
    fi
    
    # Test frontend health
    echo "Testing frontend health..."
    if curl -f -s http://localhost/health >/dev/null; then
        echo -e "${GREEN}✅ Frontend health check passed${NC}"
        log "Frontend health check passed"
    else
        echo -e "${RED}❌ Frontend health check failed${NC}"
        log "ERROR: Frontend health check failed"
        docker-compose -f "$COMPOSE_FILE" logs frontend
        exit 1
    fi
    
    # Test HTTPS (if SSL is configured)
    echo "Testing HTTPS..."
    if curl -k -f -s https://localhost/health >/dev/null; then
        echo -e "${GREEN}✅ HTTPS health check passed${NC}"
        log "HTTPS health check passed"
    else
        echo -e "${YELLOW}⚠️  HTTPS health check failed (may be expected with self-signed certificates)${NC}"
        log "WARNING: HTTPS health check failed"
    fi
}

# Function to display deployment summary
deployment_summary() {
    echo -e "\n${BLUE}📋 Deployment Summary${NC}"
    echo "======================"
    
    cd "$PROJECT_DIR"
    
    echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
    log "Production deployment completed successfully"
    
    echo ""
    echo "Services Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    echo "Access Information:"
    echo "  🌐 HTTP:  http://localhost"
    echo "  🔐 HTTPS: https://localhost"
    echo "  📊 API:   https://localhost/api"
    
    echo ""
    echo "Management Commands:"
    echo "  View logs:        docker-compose -f docker-compose.prod.yml logs -f"
    echo "  Stop services:    docker-compose -f docker-compose.prod.yml down"
    echo "  Service status:   docker-compose -f docker-compose.prod.yml ps"
    echo "  Validate config:  ./scripts/validate-env.sh"
    
    echo ""
    echo "Important Files:"
    echo "  📝 Environment:   $ENV_FILE"
    echo "  📋 Compose:      $COMPOSE_FILE"
    echo "  📊 Logs:         $LOG_FILE"
    echo "  💾 Backups:      $BACKUP_DIR"
    
    log "Deployment summary completed"
}

# Main deployment process
main() {
    log "=== Starting Production Deployment ==="
    
    check_prerequisites
    validate_environment
    setup_ssl
    create_directories
    backup_data
    deploy_containers
    wait_for_services
    run_health_checks
    deployment_summary
    
    log "=== Production Deployment Completed Successfully ==="
}

# Handle script termination
cleanup() {
    echo -e "\n${YELLOW}⚠️  Deployment interrupted${NC}"
    log "Deployment interrupted by user"
    exit 1
}

trap cleanup INT TERM

# Run main function
main "$@"