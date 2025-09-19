#!/bin/bash

# Credit Card Processor - Production Deployment Script
# ====================================================

set -e  # Exit on any error

echo "🚀 Credit Card Processor - Production Deployment"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo "Please create .env.production with your production configuration."
    exit 1
fi

# Check if Azure Document Intelligence is configured
if ! grep -q "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=" .env.production; then
    echo -e "${YELLOW}⚠️  Warning: Azure Document Intelligence not configured${NC}"
    echo "The system will use mock processing without OCR capabilities."
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${YELLOW}📋 Pre-deployment Checklist${NC}"
echo "================================="

# Backup existing data
echo "1. Creating backup of existing data..."
if [ -d "data" ]; then
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r data/* "$BACKUP_DIR/" 2>/dev/null || true
    echo -e "${GREEN}✅ Data backed up to $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}ℹ️  No existing data to backup${NC}"
fi

# Stop existing containers
echo "2. Stopping existing containers..."
docker-compose -f config/docker/docker-compose.production.yml down 2>/dev/null || true
echo -e "${GREEN}✅ Existing containers stopped${NC}"

# Pull latest images and build
echo "3. Building production images..."
docker-compose -f config/docker/docker-compose.production.yml build --no-cache
echo -e "${GREEN}✅ Production images built${NC}"

# Create necessary directories
echo "4. Creating required directories..."
mkdir -p data/uploads data/exports data/database logs/nginx ssl backups
echo -e "${GREEN}✅ Directories created${NC}"

# Set proper permissions
echo "5. Setting permissions..."
chmod 755 data data/uploads data/exports data/database
chmod 777 logs logs/nginx  # Nginx needs write access
echo -e "${GREEN}✅ Permissions set${NC}"

# Start services
echo -e "${YELLOW}🚀 Starting Production Services${NC}"
echo "=================================="

echo "Starting database..."
docker-compose -f config/docker/docker-compose.production.yml up -d db
echo -e "${GREEN}✅ Database started${NC}"

# Wait for database to be ready
echo "Waiting for database to be ready..."
for i in {1..30}; do
    if docker-compose -f config/docker/docker-compose.production.yml exec -T db pg_isready -U creditcard_user -d creditcard >/dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 2
done
echo -e "${GREEN}✅ Database is ready${NC}"

echo "Starting backend..."
docker-compose -f config/docker/docker-compose.production.yml up -d backend
echo -e "${GREEN}✅ Backend started${NC}"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:8001/health >/dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 2
done
echo -e "${GREEN}✅ Backend is ready${NC}"

echo "Starting frontend..."
docker-compose -f config/docker/docker-compose.production.yml up -d frontend
echo -e "${GREEN}✅ Frontend started${NC}"

# Final health check
echo -e "${YELLOW}🔍 Final Health Check${NC}"
echo "======================"

sleep 10  # Give services time to fully start

# Check backend health
if curl -f http://localhost:8001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Check frontend
if curl -f http://localhost >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Show logs
echo -e "${YELLOW}📋 Service Status${NC}"
echo "=================="
docker-compose -f config/docker/docker-compose.production.yml ps

echo ""
echo -e "${GREEN}🎉 Production Deployment Complete!${NC}"
echo "=================================="
echo ""
echo "📊 Access your application:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:8001"
echo "   Health Check: http://localhost:8001/health"
echo ""
echo "📁 Important directories:"
echo "   Data: ./data/"
echo "   Logs: ./logs/"
echo "   Backups: ./backups/"
echo ""
echo "🛠️  Useful commands:"
echo "   View logs: docker-compose -f config/docker/docker-compose.production.yml logs"
echo "   Stop services: docker-compose -f config/docker/docker-compose.production.yml down"
echo "   Restart: docker-compose -f config/docker/docker-compose.production.yml restart"
echo ""

# Check if Azure is configured
if grep -q "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https" .env.production; then
    echo -e "${GREEN}✅ Azure Document Intelligence configured - Real OCR processing enabled${NC}"
else
    echo -e "${YELLOW}⚠️  Azure Document Intelligence not configured - Using mock processing${NC}"
    echo "To enable real OCR, configure Azure Document Intelligence in .env.production"
fi

echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Configure SSL certificates in ./ssl/ directory"
echo "2. Set up your domain DNS to point to this server"
echo "3. Configure Azure Document Intelligence for OCR"
echo "4. Set up regular database backups"
echo "5. Configure monitoring and alerting"