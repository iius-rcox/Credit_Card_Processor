# Docker Environment Setup Guide

This guide covers the complete Docker environment setup for the Credit Card Processor application, including development and production configurations.

## Overview

The Credit Card Processor uses a containerized architecture with:
- **Backend**: FastAPI application with SQLite database
- **Frontend**: Vue 3 application with Vite development server
- **Container Orchestration**: Docker Compose for service coordination
- **Hot Reload**: Full development workflow support in containers

## Quick Start

### Prerequisites
- Docker Desktop or Docker Engine
- Docker Compose v2.0+
- Git (for code changes and hot reload testing)

### Development Environment

1. **Clone and navigate to project**:
   ```bash
   cd /path/to/Credit_Card_Processor
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env file as needed for your environment
   ```

3. **Start development containers**:
   ```bash
   docker-compose up -d
   ```

4. **Access services**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - Backend Health: http://localhost:8001/health
   - Backend Docs: http://localhost:8001/docs

### Production Environment

1. **Use production compose file**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Configure production environment**:
   - Update `.env` with production values
   - Use strong session secrets
   - Configure proper CORS origins
   - Set up SSL termination (recommended reverse proxy)

## Architecture Details

### Development Configuration (`docker-compose.yml`)

**Backend Container**:
- Image: Built from `backend/Dockerfile.dev`
- Port: 8001 (maps to host 8001)
- Hot Reload: Enabled with volume mounts for source code
- Database: SQLite with persistent volume
- Health Check: `/health` endpoint with 30s intervals

**Frontend Container**:
- Image: Built from `frontend/Dockerfile.dev`
- Port: 3000 (maps to host 3000)
- Hot Reload: Vite HMR with polling enabled for Docker
- Dependencies: Volume mounts for source code and configs

**Network**:
- Custom bridge network `credit-card-dev-network`
- Container-to-container communication enabled
- CORS configured for frontend-backend communication

### Production Configuration (`docker-compose.prod.yml`)

**Backend Container**:
- Multi-stage build for optimized image size
- Resource limits: 1 CPU, 512MB memory
- Production-ready uvicorn configuration
- Security headers and HTTPS enforcement
- No source code mounting (immutable deployment)

**Frontend Container**:
- Nginx-based static file serving
- Gzip compression enabled
- Security headers configured
- Resource limits: 0.5 CPU, 128MB memory
- Health check endpoint at `/health`

## File Structure

```
Credit_Card_Processor/
├── docker-compose.yml          # Development configuration
├── docker-compose.prod.yml     # Production configuration
├── .env                        # Environment variables (create from .env.example)
├── .env.example               # Environment template
├── backend/
│   ├── Dockerfile.dev         # Development backend image
│   ├── Dockerfile.prod        # Production backend image
│   ├── .dockerignore          # Docker build context exclusions
│   └── app/                   # Application source code
├── frontend/
│   ├── Dockerfile.dev         # Development frontend image
│   ├── Dockerfile.prod        # Production frontend image
│   ├── .dockerignore          # Docker build context exclusions
│   └── src/                   # Application source code
```

## Environment Variables

Key environment variables for Docker deployment:

### Required Configuration
```bash
# Admin users (comma-separated)
ADMIN_USERS=rcox,mikeh,tomj

# Session security (minimum 32 characters)
SESSION_SECRET_KEY=your-secure-session-key-here-32-chars-minimum

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://frontend:3000

# Trusted hosts (comma-separated)
TRUSTED_HOSTS=localhost,127.0.0.1,*.local
```

### Optional Configuration
```bash
# Session timeout (minutes)
SESSION_TIMEOUT_MINUTES=480

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60

# Security settings
ENABLE_SECURITY_HEADERS=true
FORCE_HTTPS=false
HSTS_MAX_AGE=31536000
```

## Development Workflow

### Hot Reload Verification

**Backend Hot Reload**:
1. Make changes to files in `backend/app/`
2. Watch container logs: `docker-compose logs -f backend`
3. Uvicorn will detect changes and restart automatically

**Frontend Hot Reload**:
1. Make changes to files in `frontend/src/`
2. Watch container logs: `docker-compose logs -f frontend`
3. Vite will perform HMR updates automatically

### Common Development Commands

```bash
# View all container status
docker-compose ps

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a specific service
docker-compose restart backend

# Rebuild and restart services
docker-compose up --build -d

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Performance Optimization

### Image Size Optimization
- Multi-stage builds reduce production image sizes
- .dockerignore files exclude unnecessary files
- Production images use minimal base images

### Runtime Optimization
- Resource limits prevent container resource hogging
- Health checks ensure service availability
- Restart policies handle failures automatically

### Build Cache Optimization
- Dependencies installed before source code copy
- Layer caching optimized for development workflow
- Separate stages for development vs production

## Security Considerations

### Development Security
- Non-root users in containers
- Limited file system access
- Environment variable separation
- CORS properly configured

### Production Security
- Security headers enabled by default
- HTTPS enforcement available
- Rate limiting configured
- Trusted host validation
- Resource limits prevent DoS

## Troubleshooting

### Common Issues

**Port Conflicts**:
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :8001

# Stop conflicting processes or change ports in docker-compose.yml
```

**Container Startup Failures**:
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Check container status
docker-compose ps
```

**Database Issues**:
```bash
# Recreate database volume
docker-compose down -v
docker-compose up -d

# Check database file permissions
ls -la backend/data/
```

**CORS Issues**:
```bash
# Verify CORS origins in .env file
grep CORS_ORIGINS .env

# Test CORS preflight
curl -v -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:8001/api/sessions
```

**Hot Reload Not Working**:
```bash
# Verify volume mounts
docker inspect credit-card-backend-dev | grep Mounts -A 10
docker inspect credit-card-frontend-dev | grep Mounts -A 10

# Check file watchers (macOS/Windows)
# Ensure polling is enabled in docker-compose.yml
```

### Health Check Endpoints

**Backend Health Check**:
```bash
curl http://localhost:8001/health
# Expected: {"status":"healthy","docker":"hot-reload-test"}
```

**Frontend Health Check** (Production):
```bash
curl http://localhost:3000/health
# Expected: healthy
```

### Container Resource Monitoring

```bash
# Monitor resource usage
docker stats

# Check container processes
docker-compose top

# Inspect container configuration
docker inspect credit-card-backend-dev
docker inspect credit-card-frontend-dev
```

## Production Deployment

### Pre-deployment Checklist

1. **Security Configuration**:
   - [ ] Change default session secret key
   - [ ] Configure production admin users
   - [ ] Set proper CORS origins
   - [ ] Enable HTTPS enforcement
   - [ ] Configure trusted hosts

2. **Performance Configuration**:
   - [ ] Set appropriate resource limits
   - [ ] Configure rate limiting
   - [ ] Set up log rotation
   - [ ] Configure health check intervals

3. **Infrastructure**:
   - [ ] Set up reverse proxy (nginx/traefik)
   - [ ] Configure SSL certificates
   - [ ] Set up monitoring and alerting
   - [ ] Configure backup strategy

### Production Commands

```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Monitor production containers
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f

# Update production deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoring and Maintenance

```bash
# Container health monitoring
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:8001/health
curl http://localhost:3000/health

# Log monitoring
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
docker-compose -f docker-compose.prod.yml logs --tail=100 frontend

# Backup database
cp backend/data/database.db backend/data/database.db.backup.$(date +%Y%m%d_%H%M%S)

# Clean up unused Docker resources
docker system prune -f
```

## Performance Benchmarks

### Development Environment
- Backend startup: ~5-10 seconds
- Frontend startup: ~3-5 seconds
- Hot reload response: <2 seconds
- Memory usage: Backend ~85MB, Frontend ~140MB

### Production Environment
- Backend startup: ~10-15 seconds
- Frontend startup: ~2-3 seconds
- Memory usage: Backend <512MB, Frontend <128MB
- Response time: <100ms for API endpoints

## Support

For issues with Docker setup:

1. Check container logs: `docker-compose logs [service]`
2. Verify environment configuration
3. Test individual components outside Docker
4. Check Docker Desktop/Engine status
5. Review firewall and network settings

For development workflow issues:
1. Verify file permissions
2. Check volume mounts
3. Test hot reload functionality
4. Monitor resource usage

This Docker environment provides a production-ready, scalable foundation for the Credit Card Processor application with full development workflow support.