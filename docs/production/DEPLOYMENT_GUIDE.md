# Production Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the Credit Card Processor application to production environments with enterprise-grade security, monitoring, and reliability.

## Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04 LTS or later, CentOS 8+, or RHEL 8+
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 20GB available disk space
- **CPU**: 2+ cores (4+ cores recommended)
- **Network**: Static IP address, firewall configuration capability

### Software Dependencies
- Docker Engine 20.10+
- Docker Compose 2.0+
- curl (for health checks)
- openssl (for SSL certificate management)

### Security Prerequisites
- Non-root user with sudo privileges
- Firewall configured (UFW, iptables, or equivalent)
- SSH key-based authentication configured
- Regular security updates enabled

## Pre-Deployment Setup

### 1. System Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl openssl ufw fail2ban

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. Docker Installation
```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Application Setup
```bash
# Clone repository (or upload application files)
git clone https://github.com/your-org/credit-card-processor.git
cd credit-card-processor

# Create production environment file
cp .env.production.template .env.production

# Edit production environment (see Configuration section below)
nano .env.production
```

## Configuration

### 1. Environment Variables
Edit `.env.production` with your production values:

```bash
# CRITICAL: Change these values for production
SESSION_SECRET_KEY=your-32-character-secret-key-here
ADMIN_USERS=admin,your-admin-username

# Update with your actual domain
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
TRUSTED_HOSTS=yourdomain.com,www.yourdomain.com

# Configure SMTP for notifications (recommended)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
SMTP_TLS=true

# Alert configuration
ALERT_EMAIL=admin@yourdomain.com
```

### 2. SSL Certificate Configuration

#### Option A: Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt install certbot

# Obtain certificate (replace yourdomain.com)
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx directory
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem

# Set up auto-renewal
sudo crontab -e
# Add: 0 2 * * * certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yml restart nginx
```

#### Option B: Self-Signed (Development Only)
```bash
# Generate development SSL certificates
./scripts/generate-ssl-dev.sh
```

### 3. nginx Configuration
Review and customize `nginx/nginx.conf` for your domain:

```nginx
# Update server_name in nginx.conf
server_name yourdomain.com www.yourdomain.com;
```

## Deployment Process

### 1. Pre-Deployment Validation
```bash
# Validate environment configuration
./scripts/validate-env.sh .env.production

# Test docker configuration
docker-compose -f docker-compose.prod.yml config
```

### 2. Automated Deployment
```bash
# Run the automated deployment script
./scripts/deploy-production.sh
```

### 3. Manual Deployment (Alternative)
```bash
# Create required directories
mkdir -p data/production/backend logs/production/backend nginx/logs backups

# Build and start services
docker-compose -f docker-compose.prod.yml down --remove-orphans
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

## Post-Deployment Verification

### 1. Health Checks
```bash
# Test HTTP endpoints
curl -f http://localhost/health
curl -f http://localhost/api/health

# Test HTTPS endpoints
curl -k -f https://localhost/health
curl -k -f https://localhost/api/health

# Verify SSL certificate
openssl s_client -connect localhost:443 -servername yourdomain.com
```

### 2. Security Verification
```bash
# Test security headers
curl -I https://yourdomain.com/

# Verify SSL configuration
curl -A "ssllabs-scan" "https://api.ssllabs.com/api/v3/analyze?host=yourdomain.com"

# Check for open ports
nmap -sT -O localhost
```

### 3. Performance Testing
```bash
# Basic load test (install apache2-utils)
ab -n 1000 -c 10 https://yourdomain.com/

# Memory and CPU monitoring
docker stats
```

## Monitoring and Maintenance

### 1. Log Management
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f

# View nginx access logs
tail -f nginx/logs/access.log

# View nginx error logs
tail -f nginx/logs/error.log

# Log rotation setup
sudo nano /etc/logrotate.d/credit-card-processor
```

### 2. Backup Configuration
```bash
# Manual database backup
docker exec -it credit-card-backend-prod sqlite3 /app/data/database.db ".backup /app/data/backup-$(date +%Y%m%d).db"

# Automated backup script (example)
cat > backup-script.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/path/to/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker exec credit-card-backend-prod sqlite3 /app/data/database.db ".backup /app/data/backup-$TIMESTAMP.db"
find "$BACKUP_DIR" -name "backup-*.db" -mtime +30 -delete
EOF

chmod +x backup-script.sh
# Add to crontab: 0 2 * * * /path/to/backup-script.sh
```

### 3. Update Procedure
```bash
# 1. Backup current data
./scripts/backup-data.sh

# 2. Pull latest changes
git pull origin main

# 3. Update environment if needed
diff .env.production.template .env.production

# 4. Rebuild and deploy
./scripts/deploy-production.sh

# 5. Verify deployment
curl -f https://yourdomain.com/health
```

## Security Hardening

### 1. System Security
```bash
# Configure fail2ban for SSH protection
sudo nano /etc/fail2ban/jail.local

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

sudo systemctl restart fail2ban
```

### 2. Docker Security
```bash
# Configure Docker daemon security
sudo nano /etc/docker/daemon.json

{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true
}

sudo systemctl restart docker
```

### 3. Regular Security Tasks
```bash
# Weekly security update script
cat > security-updates.sh << 'EOF'
#!/bin/bash
sudo apt update && sudo apt upgrade -y
docker image prune -f
EOF

chmod +x security-updates.sh
# Add to crontab: 0 2 * * 0 /path/to/security-updates.sh
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Check system resources
df -h
free -h
docker system df
```

#### 2. SSL Certificate Issues
```bash
# Verify certificate files
ls -la nginx/ssl/
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Check certificate and key match
openssl x509 -noout -modulus -in nginx/ssl/cert.pem | openssl md5
openssl rsa -noout -modulus -in nginx/ssl/key.pem | openssl md5
```

#### 3. Database Issues
```bash
# Check database file permissions
docker exec -it credit-card-backend-prod ls -la /app/data/

# Test database connectivity
docker exec -it credit-card-backend-prod sqlite3 /app/data/database.db ".tables"
```

#### 4. Network Connectivity Issues
```bash
# Check nginx configuration
docker exec -it credit-card-nginx-prod nginx -t

# Check port accessibility
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# Test internal service communication
docker exec -it credit-card-nginx-prod curl http://backend:8001/health
```

## Disaster Recovery

### 1. Data Backup Strategy
- **Daily**: Automated database backups
- **Weekly**: Full application data backup
- **Monthly**: Complete system backup
- **Quarterly**: Disaster recovery testing

### 2. Recovery Procedures
```bash
# Restore from backup
docker-compose -f docker-compose.prod.yml down
cp backup-YYYYMMDD.db data/production/backend/database.db
docker-compose -f docker-compose.prod.yml up -d
```

## Performance Optimization

### 1. Resource Monitoring
```bash
# Monitor container resources
docker stats --no-stream

# System monitoring
htop
iotop
```

### 2. Scaling Considerations
- Increase backend workers: Set `BACKEND_WORKERS=4` in `.env.production`
- Add Redis caching: Uncomment Redis service in `docker-compose.prod.yml`
- Load balancer: Deploy multiple application instances behind a load balancer

## Support and Maintenance

### Regular Maintenance Checklist
- [ ] Weekly security updates
- [ ] Monthly backup verification
- [ ] Quarterly disaster recovery testing
- [ ] SSL certificate renewal (if not automated)
- [ ] Log file rotation and cleanup
- [ ] Performance metrics review
- [ ] Security audit and penetration testing (annually)

### Getting Help
- Check application logs first: `docker-compose -f docker-compose.prod.yml logs`
- Review system logs: `sudo journalctl -u docker`
- Monitor system resources: `htop`, `df -h`, `free -h`
- Validate configuration: `./scripts/validate-env.sh`