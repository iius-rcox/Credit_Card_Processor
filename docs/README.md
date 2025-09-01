# Credit Card Processor

A secure, enterprise-grade web application for processing and analyzing credit card statements and financial documents.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Monitoring](#monitoring)
- [Security](#security)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

## 🎯 Overview

The Credit Card Processor is a full-stack web application designed to securely process PDF credit card statements, extract transaction data, and provide comprehensive analysis and reporting capabilities. Built with modern technologies and enterprise security standards, it offers a scalable solution for financial document processing.

### Key Benefits

- **Secure Processing**: Enterprise-grade security with encryption and access controls
- **High Performance**: Optimized for large file processing with concurrent user support
- **Comprehensive Monitoring**: Full observability with metrics, logging, and alerting
- **Scalable Architecture**: Containerized deployment with horizontal scaling capabilities
- **User-Friendly Interface**: Intuitive Vue.js frontend with responsive design

## ✨ Features

### Core Functionality
- **PDF Upload & Processing**: Secure upload and processing of PDF documents up to 100MB
- **Data Extraction**: Intelligent extraction of transaction data from various statement formats
- **Results Analysis**: Comprehensive analysis and visualization of processed data
- **Multi-format Export**: Export results in CSV, Excel, and JSON formats
- **Session Management**: Secure session handling with configurable timeouts

### Security Features
- **Authentication & Authorization**: Role-based access control with admin functions
- **Data Encryption**: Encryption in transit and at rest
- **Audit Logging**: Comprehensive audit trails for all user actions
- **Rate Limiting**: Configurable rate limiting to prevent abuse
- **Security Headers**: OWASP-compliant security headers

### Monitoring & Operations
- **Health Monitoring**: Multi-level health checks with detailed diagnostics
- **Performance Metrics**: Prometheus-compatible metrics collection
- **Log Aggregation**: Structured logging with rotation and retention
- **Real-time Alerting**: Multi-channel alerting (email, Slack, Teams)
- **System Dashboards**: Grafana dashboards for monitoring and analysis

### Enterprise Features
- **High Availability**: Production-ready deployment with load balancing
- **Backup & Recovery**: Automated backup procedures and disaster recovery
- **Performance Testing**: Comprehensive load and stress testing capabilities
- **User Acceptance Testing**: Detailed UAT plans and test scripts
- **Documentation**: Complete technical and user documentation

## 🏗 Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     nginx       │    │   Frontend      │    │    Backend      │
│  (Reverse Proxy)│────│   (Vue.js)      │────│   (FastAPI)     │
│   Port: 443     │    │   Port: 3000    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   File Storage  │    │    Database     │
│   (Prometheus)  │    │   (Local/S3)    │    │   (SQLite)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: Vue.js 3 with Composition API
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Pinia
- **Build Tool**: Vite
- **Testing**: Vitest with Vue Test Utils

#### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (production-ready with backup strategies)
- **Authentication**: Custom Windows/header-based authentication
- **API Documentation**: OpenAPI/Swagger
- **Testing**: pytest with comprehensive test coverage

#### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Reverse Proxy**: nginx with SSL termination
- **Monitoring**: Prometheus + Grafana + AlertManager
- **Log Aggregation**: Fluentd with multiple output options
- **Deployment**: Docker Compose with production configurations

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git for repository access
- 4GB+ RAM and 20GB+ disk space recommended

### 1. Clone Repository
```bash
git clone https://github.com/your-org/credit-card-processor.git
cd credit-card-processor
```

### 2. Start Development Environment
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

### 4. Test Upload
1. Navigate to the frontend application
2. Upload a sample PDF file
3. Monitor processing in the results section

## 📦 Installation

### Development Installation

#### Option 1: Docker (Recommended)
```bash
# Clone repository
git clone https://github.com/your-org/credit-card-processor.git
cd credit-card-processor

# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Option 2: Local Development
```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

### Production Installation

#### Full Production Stack
```bash
# Generate SSL certificates (development)
./scripts/generate-ssl-dev.sh

# Create production environment file
cp .env.production.template .env.production
# Edit .env.production with your production values

# Deploy production stack
./scripts/deploy-production.sh

# Optional: Add monitoring stack
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

See [Deployment Guide](docs/production/DEPLOYMENT_GUIDE.md) for detailed production setup instructions.

## ⚙️ Configuration

### Environment Variables

#### Essential Configuration
```bash
# Security (REQUIRED for production)
SESSION_SECRET_KEY=your-32-character-secret-key
ADMIN_USERS=admin,your-admin-username

# Domain Configuration
CORS_ORIGINS=https://yourdomain.com
TRUSTED_HOSTS=yourdomain.com

# Database
DATABASE_URL=sqlite:///./data/database.db

# Email Notifications (Optional)
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
ALERT_EMAIL=admin@yourdomain.com
```

#### Advanced Configuration
See [Configuration Reference](docs/configuration/README.md) for complete configuration options.

### File Structure
```
credit-card-processor/
├── backend/                 # FastAPI backend application
│   ├── app/                # Application code
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
├── frontend/               # Vue.js frontend application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── package.json       # Node.js dependencies
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── config/                # Configuration files
├── nginx/                 # nginx configuration
└── tests/                 # Integration and performance tests
```

## 📖 Usage

### Basic Workflow

1. **Authentication**: Login with your credentials
2. **Upload**: Upload PDF credit card statements (up to 100MB)
3. **Processing**: System automatically processes uploaded files
4. **Review**: View extracted transaction data and analysis
5. **Export**: Download results in your preferred format

### File Upload
- **Supported Formats**: PDF only
- **Size Limits**: 100 bytes to 100MB
- **Security**: Files are validated and quarantined during processing
- **Progress**: Real-time upload and processing progress indicators

### Data Processing
- **Automatic Extraction**: Intelligent data extraction from various statement formats
- **Validation**: Comprehensive data validation and quality checks
- **Error Handling**: Clear error reporting with resolution guidance
- **Performance**: Optimized for concurrent processing

### Results & Export
- **Visualization**: Interactive data tables and summaries
- **Export Formats**: CSV, Excel (XLSX), JSON
- **Filtering**: Filter and sort results by various criteria
- **History**: Access to previous processing sessions

### Administrative Functions
- **User Management**: Admin users can manage system users
- **System Monitoring**: Access to system health and performance metrics
- **Audit Logs**: Comprehensive audit trail access
- **Alert Management**: Acknowledge and resolve system alerts

## 🔌 API Documentation

### Interactive API Documentation
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **OpenAPI JSON**: http://localhost:8001/openapi.json

### Key Endpoints

#### Authentication
```bash
GET  /api/auth/status         # Get authentication status
GET  /api/auth/current-user   # Get current user info
```

#### File Upload & Processing
```bash
POST /api/upload/             # Upload file
GET  /api/sessions/{id}/status # Get processing status
POST /api/processing/{id}/start # Start processing
GET  /api/results/{id}        # Get results
POST /api/export/{id}         # Export results
```

#### Monitoring & Health
```bash
GET  /health                  # Basic health check
GET  /api/health/detailed     # Detailed health diagnostics
GET  /api/monitoring/metrics  # System metrics
GET  /metrics                 # Prometheus metrics
```

#### Administrative
```bash
GET  /api/alerts              # Get active alerts
POST /api/alerts/{id}/acknowledge # Acknowledge alert
GET  /api/monitoring/system   # System resource metrics
```

See [API Reference](docs/api/README.md) for complete API documentation.

## 📊 Monitoring

### Health Monitoring
- **Basic Health**: `/health` endpoint for load balancers
- **Detailed Health**: Comprehensive system diagnostics
- **Component Health**: Database, disk, memory, CPU monitoring

### Performance Metrics
- **Application Metrics**: Request rates, response times, error rates
- **System Metrics**: CPU, memory, disk utilization
- **Business Metrics**: Upload counts, processing times, user activity

### Alerting
- **Multi-channel**: Email, Slack, Microsoft Teams, webhooks
- **Escalation**: Configurable escalation policies
- **Conditions**: CPU >80%, Memory >85%, Disk <20%, Error rate >10%

### Dashboards
- **Grafana**: http://localhost:3001 (with monitoring stack)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

See [Monitoring Guide](docs/monitoring/MONITORING_GUIDE.md) for detailed monitoring setup.

## 🔐 Security

### Security Features
- **Encryption**: TLS 1.2+ for data in transit, AES for data at rest
- **Authentication**: Configurable authentication methods
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Configurable per-endpoint rate limits
- **Security Headers**: OWASP-compliant security headers
- **Audit Logging**: Complete audit trail for all actions

### Security Best Practices
- Change all default passwords and secrets
- Use strong SSL certificates in production
- Regular security updates and patches
- Monitor security logs and alerts
- Implement proper backup encryption
- Network segmentation and firewall rules

### Compliance
- **GDPR**: Data privacy and retention controls
- **SOX**: Audit logging and data integrity
- **PCI DSS**: Secure handling of financial data
- **OWASP**: Following OWASP security guidelines

See [Security Guide](docs/security/README.md) for detailed security information.

## 👩‍💻 Development

### Development Setup
```bash
# Clone repository
git clone https://github.com/your-org/credit-card-processor.git
cd credit-card-processor

# Start development environment
docker-compose up -d

# Or run locally
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

### Code Quality
- **Linting**: ESLint (frontend), Black/Flake8 (backend)
- **Type Checking**: TypeScript (frontend), mypy (backend)
- **Testing**: 90%+ code coverage required
- **Pre-commit Hooks**: Automated code quality checks

### Development Tools
- **Hot Reload**: Frontend and backend support hot reload
- **Debug Tools**: Vue DevTools, FastAPI debug mode
- **API Testing**: Swagger UI, Postman collections
- **Database Tools**: SQLite browser, query tools

See [Development Guide](docs/development/README.md) for detailed development information.

## 🧪 Testing

### Test Suites

#### Unit Tests
```bash
# Backend tests
cd backend && python -m pytest tests/ -v --cov=app --cov-report=html

# Frontend tests  
cd frontend && npm test
```

#### Integration Tests
```bash
# Run integration test suite
python -m pytest tests/integration/ -v
```

#### Performance Tests
```bash
# Run benchmark suite
./scripts/performance-test.sh benchmark

# Run load tests
./scripts/performance-test.sh all-tests
```

#### User Acceptance Tests
- Manual test scripts available in `tests/acceptance/`
- Comprehensive UAT plan with 30+ test scenarios
- Test data and environments provided

### Test Coverage
- **Backend**: >90% code coverage required
- **Frontend**: >80% code coverage required  
- **Integration**: All critical paths covered
- **Performance**: Load, stress, spike, and endurance testing

See [Testing Guide](docs/testing/README.md) for detailed testing information.

## 🚢 Deployment

### Deployment Options

#### Development
```bash
docker-compose up -d
```

#### Production
```bash
# Automated deployment
./scripts/deploy-production.sh

# Manual deployment
docker-compose -f docker-compose.prod.yml up -d
```

#### Production with Monitoring
```bash
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring alerts configured
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] User acceptance testing completed

See [Deployment Guide](docs/production/DEPLOYMENT_GUIDE.md) for complete deployment procedures.

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs -f

# Restart services
docker-compose restart
```

#### Upload Failures
- Verify file size limits (100MB max)
- Check disk space availability
- Validate file format (PDF only)
- Review error logs for details

#### Performance Issues
- Check system resource usage
- Review monitoring dashboards
- Analyze slow query logs
- Verify network connectivity

#### Authentication Issues
- Verify user credentials
- Check session configuration
- Review authentication logs
- Validate environment variables

### Log Locations
- **Application Logs**: `./logs/application.log`
- **Error Logs**: `./logs/errors.log`
- **Security Logs**: `./logs/security.log`
- **nginx Logs**: `./nginx/logs/`

### Getting Help
1. Check this documentation
2. Review log files for errors
3. Check system health endpoints
4. Consult troubleshooting guides
5. Contact support team

## 📞 Support

### Documentation
- **Technical Documentation**: [docs/](docs/)
- **API Reference**: [docs/api/](docs/api/)
- **Deployment Guide**: [docs/production/](docs/production/)
- **Monitoring Guide**: [docs/monitoring/](docs/monitoring/)

### Getting Help
- **Issues**: Create issue in project repository
- **Discussions**: Use project discussion forum
- **Email**: support@yourcompany.com
- **Documentation**: Check relevant documentation sections

### Contributing
1. Fork the repository
2. Create feature branch
3. Follow coding standards
4. Add tests for new features
5. Submit pull request

### Version Information
- **Current Version**: 1.0.0
- **Release Date**: December 2024
- **Compatibility**: Docker 20.10+, Python 3.11+, Node.js 18+

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FastAPI team for the excellent Python web framework
- Vue.js team for the progressive frontend framework
- Prometheus and Grafana teams for monitoring tools
- Docker team for containerization technology
- All contributors and testers who helped improve this application

---

**Built with ❤️ by the Credit Card Processor Development Team**