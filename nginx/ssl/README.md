# SSL Certificate Setup for Production

## Overview
This directory contains SSL certificate configuration for the Credit Card Processor production environment.

## Certificate Options

### 1. Let's Encrypt (Recommended for Production)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Self-Signed Certificates (Development/Testing)

Generate self-signed certificates for development:

```bash
# Create SSL directory
mkdir -p /path/to/project/nginx/ssl

# Generate private key
openssl genrsa -out nginx/ssl/key.pem 2048

# Generate certificate signing request
openssl req -new -key nginx/ssl/key.pem -out nginx/ssl/cert.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in nginx/ssl/cert.csr \
  -signkey nginx/ssl/key.pem -out nginx/ssl/cert.pem

# Set proper permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem

# Clean up CSR
rm nginx/ssl/cert.csr
```

### 3. Corporate/Commercial Certificates

For commercial certificates from providers like DigiCert, Comodo, etc.:

1. Generate CSR:
```bash
openssl req -new -newkey rsa:2048 -nodes -keyout nginx/ssl/key.pem -out nginx/ssl/cert.csr
```

2. Submit CSR to certificate authority
3. Download and place certificates:
   - `cert.pem` - Your domain certificate
   - `key.pem` - Your private key
   - `ca-bundle.pem` - Certificate chain (if provided)

## Security Best Practices

### File Permissions
```bash
# Set restrictive permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chown root:root nginx/ssl/*
```

### Certificate Validation
```bash
# Check certificate details
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Verify certificate and key match
openssl x509 -noout -modulus -in nginx/ssl/cert.pem | openssl md5
openssl rsa -noout -modulus -in nginx/ssl/key.pem | openssl md5
# Both should produce the same hash

# Test SSL configuration
openssl s_client -connect localhost:443 -servername localhost
```

## Docker Integration

The nginx container expects certificates at:
- `/etc/nginx/ssl/cert.pem` - Certificate file
- `/etc/nginx/ssl/key.pem` - Private key file

Mount these in your docker-compose.prod.yml:
```yaml
nginx:
  volumes:
    - ./nginx/ssl:/etc/nginx/ssl:ro
```

## Monitoring and Renewal

### Certificate Expiration Monitoring
```bash
# Check certificate expiration
openssl x509 -in nginx/ssl/cert.pem -noout -enddate

# Create monitoring script
cat > /usr/local/bin/cert-check.sh << 'EOF'
#!/bin/bash
CERT_FILE="/path/to/nginx/ssl/cert.pem"
DAYS_WARN=30

EXPIRY_DATE=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_LEFT -le $DAYS_WARN ]; then
    echo "WARNING: SSL certificate expires in $DAYS_LEFT days"
    # Send notification
fi
EOF

chmod +x /usr/local/bin/cert-check.sh

# Add to crontab for daily checks
# 0 8 * * * /usr/local/bin/cert-check.sh
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check file permissions: `ls -la nginx/ssl/`
   - Ensure nginx user can read certificates

2. **Certificate Mismatch**
   - Verify certificate and key match (see validation section)
   - Check certificate chain completeness

3. **Browser Security Warnings**
   - For self-signed: Expected behavior, add exception
   - For valid certs: Check certificate chain and intermediate certificates

### Testing SSL Configuration
```bash
# Test SSL grades
curl -A "ssllabs-scan" "https://api.ssllabs.com/api/v3/analyze?host=yourdomain.com"

# Test with different TLS versions
openssl s_client -connect localhost:443 -tls1_2
openssl s_client -connect localhost:443 -tls1_3
```

## Security Headers Verification

Test security headers implementation:
```bash
curl -I https://localhost/
# Look for:
# Strict-Transport-Security
# X-Content-Type-Options
# X-Frame-Options
# X-XSS-Protection
# Content-Security-Policy
```