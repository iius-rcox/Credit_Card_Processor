# Credit Card Processor - Configuration Guide

This guide provides comprehensive instructions for configuring your Credit Card Processor application with proper security settings, Azure integration, and environment tuning.

## Quick Start

1. **Interactive Setup (Recommended)**:
   ```bash
   python setup-config.py
   ```
   This interactive script will guide you through all configuration options.

2. **Manual Setup**:
   ```bash
   cp .env.example .env
   # Edit .env file with your settings
   python backend/test_config.py  # Validate configuration
   ```

## Configuration Files Overview

- **`.env.example`** - Comprehensive template with all options and documentation
- **`.env.production.template`** - Production-ready template with security best practices
- **`setup-config.py`** - Interactive configuration wizard
- **`backend/test_config.py`** - Configuration validation tool

## Essential Security Settings

### Admin Users (REQUIRED)
```env
ADMIN_USERS=john.doe,jane.smith,admin
```
- Comma-separated list of usernames with administrative access
- Case-insensitive matching
- These users can access admin features and manage the system
- **Must be configured** for production deployments

### Session Secret Key (REQUIRED)
```env
SESSION_SECRET_KEY=your-64-character-cryptographically-secure-key-here
```
- **Critical for security** - used for session management and tokens
- Must be at least 32 characters, recommend 64+ characters
- Generate with: `python -c "import secrets; print(secrets.token_urlsafe(64))"`
- **Never use default values in production**

### CORS Origins (REQUIRED)
```env
CORS_ORIGINS=https://myapp.com,https://www.myapp.com
```
- Comma-separated list of allowed frontend URLs
- Include all domains where your frontend will be hosted
- Use `http://localhost:3000` for development only

### Trusted Hosts (REQUIRED)
```env
TRUSTED_HOSTS=myapp.com,*.myapp.com,api.myapp.com
```
- Comma-separated list of trusted hostnames/domains
- Include all domains that should serve the application
- Supports wildcards (e.g., `*.company.com`)

## Azure Integration

The application supports Azure Document Intelligence for enhanced OCR processing. If not configured, it will use local Tesseract OCR.

### Basic Azure Setup
```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://iius-doc-intelligence.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-azure-api-key-here
```

### Custom Models (Optional)
```env
AZURE_CAR_MODEL_ID=your-custom-car-model-id
AZURE_RECEIPT_MODEL_ID=your-custom-receipt-model-id
```

### Azure Infrastructure References
Based on your existing Azure resources:

- **Resource Group**: rg-iius-dev
- **Location**: southcentralus
- **AKS Cluster**: dev-aks
- **Container Registry**: iiusacr.azurecr.io
- **Key Vault**: iius-akv
- **Document Intelligence**: iius-doc-intelligence
- **Storage Account**: cssa915121f46f2ae0d374e7
- **SQL Server**: INSCOLVSQL

### Advanced Azure Integration

#### Azure Key Vault (Optional)
```env
AZURE_KEY_VAULT_URL=https://iius-akv.vault.azure.net/
AZURE_CLIENT_ID=your-app-registration-client-id
AZURE_CLIENT_SECRET=your-app-registration-secret
AZURE_TENANT_ID=your-azure-tenant-id
```

#### Azure Storage (Optional)
```env
AZURE_STORAGE_ACCOUNT=cssa915121f46f2ae0d374e7
AZURE_STORAGE_KEY=your-storage-account-key
AZURE_STORAGE_CONTAINER=credit-card-uploads
```

#### Azure SQL Database (Optional)
```env
DATABASE_URL=mssql://username:password@INSCOLVSQL:1433/CreditCardProcessor?driver=ODBC+Driver+17+for+SQL+Server
```

## Environment Configuration

### Development Environment
```env
ENVIRONMENT=development
DEBUG=true
FORCE_HTTPS=false
LOG_LEVEL=debug
```

### Production Environment
```env
ENVIRONMENT=production
DEBUG=false
FORCE_HTTPS=true
LOG_LEVEL=info
```

## Security Configuration

### Session Management
```env
SESSION_TIMEOUT_MINUTES=480  # 8 hours (development), 240 (production recommended)
MAX_LOGIN_ATTEMPTS=5         # 3-5 recommended for production
LOGIN_LOCKOUT_MINUTES=15     # 15-30 recommended
```

### Security Headers
```env
ENABLE_SECURITY_HEADERS=true
HSTS_MAX_AGE=31536000  # 1 year in seconds
```

### Rate Limiting
```env
RATE_LIMIT_REQUESTS=100  # Requests per period
RATE_LIMIT_PERIOD=60     # Period in seconds
```

## Monitoring & Alerting

### Grafana Dashboard
```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=secure-password-here
```

### Email Alerts
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=alerts@company.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=creditcard-alerts@company.com
SMTP_USE_TLS=true
ALERT_EMAILS=admin@company.com,ops@company.com
```

## Application Settings

### File Processing
```env
MAX_FILE_SIZE_MB=100     # Maximum file size for uploads
MAX_EMPLOYEES=100        # Maximum employees per processing session
```

### Data Storage Paths
```env
DATABASE_PATH=./data/database.db
UPLOAD_PATH=./data/uploads
EXPORT_PATH=./data/exports
```

## Environment Presets

### Development Preset
- Debug mode enabled
- Relaxed security settings
- Hot reload for development
- Local OCR processing
- Localhost CORS origins

### Staging Preset
- Production-like security
- Debug mode disabled
- Testing with production settings
- Full monitoring enabled

### Production Preset
- Maximum security settings
- HTTPS enforcement
- Strict rate limiting
- Comprehensive monitoring
- Azure integration enabled

## Configuration Validation

Always validate your configuration before deployment:

```bash
# Test configuration
python backend/test_config.py

# Expected output for valid configuration:
✓ All validation checks passed!
✓ Configuration validation passed
✓ Ready to start the application
```

The validation script checks:
- Security settings completeness
- Azure integration configuration
- Environment-specific settings
- File system permissions
- Production readiness

## Security Best Practices

### For Development
1. Use the interactive setup script
2. Never commit `.env` files to version control
3. Use separate admin accounts for testing
4. Enable security headers even in development

### For Production
1. Change ALL default values
2. Use strong, unique passwords and keys
3. Enable HTTPS enforcement
4. Configure comprehensive monitoring
5. Regular security audits
6. Implement backup procedures

### Secret Management
1. **Never hardcode secrets** in configuration files
2. Use environment variables for all sensitive data
3. Consider Azure Key Vault for production secrets
4. Rotate secrets regularly
5. Use least-privilege access principles

## Troubleshooting

### Common Issues

**Configuration not loading:**
- Check `.env` file exists in project root
- Verify environment variable names match exactly
- Run validation script for detailed errors

**Azure integration not working:**
- Verify endpoint URL format
- Check API key validity
- Ensure network connectivity to Azure
- Review Azure resource permissions

**Authentication issues:**
- Verify admin usernames are correctly configured
- Check session secret key is properly set
- Review CORS origins for frontend domains

**Performance issues:**
- Adjust rate limiting settings
- Optimize file size limits
- Review session timeout settings

### Getting Help

1. **Run the validation script**: `python backend/test_config.py`
2. **Check application logs** for specific error messages
3. **Review the interactive setup** for guided configuration
4. **Verify Azure resource status** in Azure Portal

## Production Deployment Checklist

Before deploying to production:

### Security
- [ ] Changed all default passwords and secret keys
- [ ] Generated new SESSION_SECRET_KEY
- [ ] Configured actual production admin users
- [ ] Set up proper CORS origins for your domains
- [ ] Enabled HTTPS enforcement
- [ ] Configured security headers

### Azure Integration
- [ ] Obtained Azure Document Intelligence API keys
- [ ] Tested Azure connectivity
- [ ] Configured custom models (if needed)
- [ ] Set up Azure Key Vault (if using)

### Monitoring
- [ ] Set up email alerts
- [ ] Configured Grafana access
- [ ] Tested alert notifications
- [ ] Configured log retention policies

### Infrastructure
- [ ] Deployed to AKS cluster (dev-aks)
- [ ] Configured load balancer
- [ ] Set up SSL/TLS certificates
- [ ] Configured backup procedures
- [ ] Set up monitoring and health checks

### Validation
- [ ] Run: `python backend/test_config.py`
- [ ] Check application startup logs
- [ ] Verify admin user access
- [ ] Test OCR functionality
- [ ] Confirm monitoring is working
- [ ] Perform security scan
- [ ] Test backup and recovery procedures

## Configuration Examples

### Minimal Development Setup
```env
ADMIN_USERS=dev.admin
SESSION_SECRET_KEY=generated-64-char-key-from-secrets-module
CORS_ORIGINS=http://localhost:3000
TRUSTED_HOSTS=localhost,127.0.0.1,*.local
ENVIRONMENT=development
DEBUG=true
```

### Complete Production Setup
```env
# Security
ADMIN_USERS=prod.admin,backup.admin
SESSION_SECRET_KEY=production-secure-64-character-key
CORS_ORIGINS=https://creditcard.company.com,https://www.creditcard.company.com
TRUSTED_HOSTS=creditcard.company.com,*.company.com
ENVIRONMENT=production
DEBUG=false
FORCE_HTTPS=true

# Azure Integration
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://iius-doc-intelligence.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=azure-api-key

# Production Tuning
SESSION_TIMEOUT_MINUTES=240
MAX_LOGIN_ATTEMPTS=3
LOGIN_LOCKOUT_MINUTES=30
RATE_LIMIT_REQUESTS=50
RATE_LIMIT_PERIOD=60

# Monitoring
GRAFANA_ADMIN_PASSWORD=secure-grafana-password
SMTP_HOST=smtp.office365.com
SMTP_USER=alerts@company.com
SMTP_PASSWORD=smtp-password
ALERT_EMAILS=admin@company.com,ops@company.com
```

This comprehensive configuration ensures your Credit Card Processor application is secure, properly integrated with Azure services, and ready for production deployment.