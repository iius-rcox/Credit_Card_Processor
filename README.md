# Credit Card Processor - Production Deployment

A production-ready credit card processing system for managing and analyzing credit card transactions with Azure Document Intelligence integration.

## Features

- **Credit Card Processing**: Secure transaction processing and management
- **Azure Document Intelligence**: OCR capabilities for PDF document processing
- **Data Extraction**: Automated extraction of transactions, amounts, dates, and merchants
- **Export Capabilities**: Download results in CSV, Excel, or JSON formats
- **Enterprise Security**: Production-grade security with audit logging

## Prerequisites

- Docker and Docker Compose installed
- Azure Document Intelligence credentials (optional, for OCR features)
- SSL certificates for production deployment
- 4GB+ RAM and 10GB+ disk space

## Production Deployment

### 1. Configure Environment

```bash
# Copy and configure production environment
cp .env.production.template .env.production
```

Edit `.env.production` with your production settings:
- Database credentials
- Azure Document Intelligence API keys (optional)
- Application security settings

### 2. Deploy Application

```bash
# Run the production deployment script
./deploy-production.sh
```

This will:
- Build production Docker images
- Start all services (database, backend, frontend)
- Create necessary directories
- Perform health checks
- Create automated backups

### 3. Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

## Directory Structure

```
Credit_Card_Processor/
├── backend/                    # Backend application
│   ├── app/                   # Application code
│   ├── migrations/            # Database migrations
│   └── Dockerfile.prod        # Production Docker image
├── frontend/                   # Frontend application
│   ├── src/                   # Application code
│   └── Dockerfile.prod        # Production Docker image
├── config/
│   └── docker/
│       └── docker-compose.production.yml  # Production configuration
├── data/                      # Persistent data storage
├── backups/                   # Automated backups
├── ssl/                       # SSL certificates
├── nginx/                     # Web server configuration
└── deploy-production.sh       # Deployment script
```

## Management Commands

### View Logs
```bash
docker-compose -f config/docker/docker-compose.production.yml logs
```

### Stop Services
```bash
docker-compose -f config/docker/docker-compose.production.yml down
```

### Restart Services
```bash
docker-compose -f config/docker/docker-compose.production.yml restart
```

### Database Backup
```bash
docker-compose -f config/docker/docker-compose.production.yml exec db pg_dump -U creditcard_user creditcard > backup.sql
```

## Azure Document Intelligence Setup

To enable OCR capabilities:

1. Create an Azure Document Intelligence resource in Azure Portal
2. Copy the endpoint and API key
3. Add to `.env.production`:
   ```
   AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
   AZURE_DOCUMENT_INTELLIGENCE_KEY=your-api-key
   ```
4. Restart the backend service:
   ```bash
   docker-compose -f config/docker/docker-compose.production.yml restart backend
   ```

Without Azure configuration, the system uses mock processing suitable for testing.

## Security Configuration

### SSL Certificates

Place your SSL certificates in the `ssl/` directory:
- `ssl/cert.pem` - SSL certificate
- `ssl/key.pem` - Private key

### Environment Security

Critical settings in `.env.production`:
```
SESSION_SECRET_KEY=<32+ character random string>
ADMIN_USERS=<comma-separated admin usernames>
CORS_ORIGINS=https://yourdomain.com
TRUSTED_HOSTS=yourdomain.com
```

### Database Security

The production database uses:
- Dedicated user with limited privileges
- Strong password authentication
- Network isolation within Docker network
- Regular automated backups

## Monitoring

### Health Checks

The application provides health endpoints:
- Backend: `http://localhost:8001/health`
- Database: Internal health checks via Docker

### Logs

Application logs are stored in:
- Container logs: `docker-compose -f config/docker/docker-compose.production.yml logs`
- Persistent logs: `./logs/` directory

### Backups

Automated backups are created:
- Location: `./backups/` directory
- Frequency: On each deployment
- Retention: Manual cleanup required

## Troubleshooting

### Service Won't Start

1. Check Docker is running:
   ```bash
   docker version
   ```

2. Check port availability:
   ```bash
   netstat -an | grep -E "3000|8001|5432"
   ```

3. Review logs:
   ```bash
   docker-compose -f config/docker/docker-compose.production.yml logs
   ```

### Database Connection Issues

1. Verify database is running:
   ```bash
   docker-compose -f config/docker/docker-compose.production.yml ps db
   ```

2. Test connection:
   ```bash
   docker-compose -f config/docker/docker-compose.production.yml exec db pg_isready
   ```

### Azure OCR Not Working

1. Verify credentials in `.env.production`
2. Test Azure endpoint accessibility
3. Check backend logs for Azure API errors

## Performance Tuning

### Backend Workers

Adjust worker count in `.env.production`:
```
BACKEND_WORKERS=4  # Default: 2
```

### Database Connections

Configure pool size in `.env.production`:
```
DATABASE_POOL_SIZE=20  # Default: 10
```

### Memory Limits

Set Docker memory limits in `docker-compose.production.yml`:
```yaml
services:
  backend:
    mem_limit: 1g
  frontend:
    mem_limit: 512m
  db:
    mem_limit: 1g
```

## Support

For production deployment issues:
- Configuration Guide: `docs/CONFIGURATION.md`
- API Documentation: `docs/api/API_REFERENCE.md`
- Deployment Guides: `docs/deployment/`

## License

Proprietary - All rights reserved