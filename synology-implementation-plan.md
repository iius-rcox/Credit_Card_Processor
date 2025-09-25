# Synology RS1221+ Credit Card Processor Implementation Plan

## Executive Summary
Deploy a complete credit card processing system on Synology RS1221+ NAS using Docker containers, providing enterprise-grade functionality with zero monthly hosting costs. The system processes CAR statements and receipts using regex extraction, stores all data locally, and provides remote access through Synology's built-in services.

## Key Benefits
- **$0/month hosting costs** - Runs entirely on existing Synology hardware
- **Superior performance** - 4 CPU cores, up to 32GB RAM vs cloud tier limitations
- **Complete data sovereignty** - All files and data remain on-premise
- **Built-in enterprise features** - Automated backups, SSL, DDNS, VPN
- **High availability** - Synology HA, automated failover options

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Synology RS1221+ NAS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Docker Engine                           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │   Nginx     │  │  FastAPI    │  │ PostgreSQL  │     │  │
│  │  │   Reverse   │◄─┤  Backend    │◄─┤  Database   │     │  │
│  │  │   Proxy     │  │  Port 8001  │  │  Port 5432  │     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  │         ▲                │                 │             │  │
│  └─────────┼────────────────┼─────────────────┼─────────────┘  │
│            │                │                 │                 │
│  ┌─────────┼────────────────┼─────────────────┼─────────────┐  │
│  │         ▼                ▼                 ▼             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │  Frontend   │  │  PDF Files  │  │   Database  │     │  │
│  │  │   Static    │  │   Storage   │  │   Volume    │     │  │
│  │  │   /web      │  │  /uploads   │  │  /postgres  │     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  │                                                           │  │
│  │              Synology Shared Folders                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Synology Services                            │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • QuickConnect (Remote Access)                          │  │
│  │  • DDNS (Custom Domain)                                  │  │
│  │  • Let's Encrypt (SSL)                                   │  │
│  │  • Hyper Backup (Automated Backups)                      │  │
│  │  • Firewall & Security Advisor                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Core Technologies
- **Container Platform**: Docker via Synology Container Manager
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, PyMuPDF
- **Frontend**: Vue 3, Pinia, Vite, TailwindCSS
- **Database**: PostgreSQL 15 (containerized)
- **Reverse Proxy**: Nginx (containerized) or Synology Application Portal
- **Processing**: Regex-based text extraction

### Synology Integration
- **Container Manager**: Docker orchestration
- **File Station**: File management UI
- **Hyper Backup**: Automated backup solution
- **Security Advisor**: Vulnerability scanning
- **Application Portal**: Reverse proxy with SSL

## Directory Structure

```
/volume1/docker/creditcard/
├── docker-compose.yml          # Main orchestration file
├── .env                        # Environment variables
├── nginx/
│   └── nginx.conf             # Reverse proxy configuration
├── backend/
│   ├── Dockerfile             # Backend container definition
│   ├── requirements.txt       # Python dependencies
│   └── app/                   # FastAPI application
├── frontend/
│   ├── Dockerfile             # Frontend container definition
│   └── dist/                  # Built Vue application
├── data/
│   ├── uploads/               # PDF storage
│   │   └── {batch_id}/       # Per-batch organization
│   ├── exports/               # Generated exports
│   └── logs/                  # Application logs
├── postgres/
│   └── data/                  # PostgreSQL data files
└── backups/                   # Hyper Backup destination
```

## PostgreSQL Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Batches table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) CHECK(status IN ('pending', 'processing', 'complete', 'failed')) DEFAULT 'pending',
    notes TEXT,
    source_summary JSONB,
    settings JSONB DEFAULT '{"date_window_days": 3, "amount_tolerance_cents": 0}'::jsonb
);

-- Documents table (stores file references)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK(type IN ('car', 'receipt')) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    filesize BIGINT NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    metadata JSONB,
    UNIQUE(sha256)
);

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    external_id VARCHAR(100),
    display_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(batch_id, external_id),
    UNIQUE(batch_id, normalized_name)
);

-- Charges table
CREATE TABLE charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    vendor VARCHAR(255) NOT NULL,
    normalized_vendor VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    car_line_id VARCHAR(100),
    source VARCHAR(20) CHECK(source IN ('car', 'receipt')) NOT NULL,
    matched_receipt_id UUID REFERENCES documents(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(batch_id, document_id, date, amount, normalized_vendor, source)
);

-- Action items table
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    cause VARCHAR(50) CHECK(cause IN ('missing_receipt', 'mismatch', 'policy_violation', 'orphan_receipt', 'other')) NOT NULL,
    status VARCHAR(20) CHECK(status IN ('open', 'in_review', 'resolved')) DEFAULT 'open',
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    details JSONB
);

-- Action-charge links
CREATE TABLE action_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(action_id, charge_id)
);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event VARCHAR(100) NOT NULL,
    data JSONB
);

-- Performance indexes
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_documents_batch ON documents(batch_id);
CREATE INDEX idx_charges_batch_date ON charges(batch_id, date);
CREATE INDEX idx_action_items_batch_status ON action_items(batch_id, status);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_batches_timestamp
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

## Docker Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: creditcard_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: creditcard
      POSTGRES_USER: ${DB_USER:-ccuser}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - /volume1/docker/creditcard/postgres/data:/var/lib/postgresql/data
      - /volume1/docker/creditcard/postgres/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-ccuser}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: creditcard_backend
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${DB_USER:-ccuser}:${DB_PASSWORD}@postgres:5432/creditcard
      FILE_STORAGE_PATH: /app/data/uploads
      SECRET_KEY: ${SECRET_KEY}
      WORKERS: 2
    volumes:
      - /volume1/docker/creditcard/data:/app/data
      - /volume1/docker/creditcard/logs:/app/logs
    ports:
      - "8001:8000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    container_name: creditcard_frontend
    restart: unless-stopped
    volumes:
      - /volume1/docker/creditcard/frontend/dist:/usr/share/nginx/html
    ports:
      - "3000:80"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: creditcard_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /volume1/docker/creditcard/nginx/nginx.conf:/etc/nginx/nginx.conf
      - /volume1/docker/creditcard/nginx/ssl:/etc/nginx/ssl
      - /volume1/docker/creditcard/frontend/dist:/usr/share/nginx/html
    depends_on:
      - backend
      - frontend

networks:
  default:
    name: creditcard_network
```

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Create data directories
RUN mkdir -p /app/data/uploads /app/data/exports /app/logs

EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Frontend Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    server {
        listen 80;
        server_name creditcard.local;

        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

        # API proxy
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeout settings for long operations
            proxy_connect_timeout 300;
            proxy_send_timeout 300;
            proxy_read_timeout 300;
        }

        # Health check endpoint
        location /health {
            proxy_pass http://backend/health;
        }

        # File upload size
        client_max_body_size 100M;
    }
}
```

## Environment Configuration

### .env file

```bash
# Database
DB_USER=ccuser
DB_PASSWORD=your-secure-password-here
DB_HOST=postgres
DB_PORT=5432
DB_NAME=creditcard

# Application
SECRET_KEY=your-secret-key-here-min-32-chars
APP_ENV=production
DEBUG=false

# File Storage
MAX_FILE_SIZE_MB=100
ALLOWED_EXTENSIONS=.pdf

# Processing
DATE_WINDOW_DAYS=3
AMOUNT_TOLERANCE_CENTS=0

# Performance
WORKERS=2
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
```

## Synology Setup Steps

### 1. Initial Preparation

```bash
# SSH into Synology
ssh admin@synology.local

# Create project structure
mkdir -p /volume1/docker/creditcard/{backend,frontend,nginx,postgres,data,logs,backups}
mkdir -p /volume1/docker/creditcard/data/{uploads,exports}
mkdir -p /volume1/docker/creditcard/postgres/{data,init}

# Set permissions
chown -R 1000:1000 /volume1/docker/creditcard
```

### 2. Install Docker via Package Center

1. Open Synology DSM
2. Go to Package Center
3. Search for "Container Manager" (DSM 7.2+) or "Docker" (older DSM)
4. Install the package

### 3. Configure Firewall

```bash
# DSM Control Panel → Security → Firewall
# Add rules:
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 8001 (Backend API) - optional, for direct access
- Port 5432 (PostgreSQL) - optional, for external connections
```

### 4. Setup SSL Certificate

#### Option A: Let's Encrypt (Free)
```bash
# DSM Control Panel → Security → Certificate
# Add → Get a certificate from Let's Encrypt
# Domain: creditcard.yourdomain.com
# Email: your-email@example.com
```

#### Option B: Self-Signed (Development)
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /volume1/docker/creditcard/nginx/ssl/key.pem \
  -out /volume1/docker/creditcard/nginx/ssl/cert.pem
```

### 5. Deploy Application

```bash
# Navigate to project directory
cd /volume1/docker/creditcard

# Create .env file
nano .env
# Add environment variables from template above

# Pull and start containers
docker-compose pull
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### 6. Initialize Database

```bash
# Copy schema file to init directory
cp schema.sql /volume1/docker/creditcard/postgres/init/

# Or run manually
docker exec -i creditcard_db psql -U ccuser -d creditcard < schema.sql
```

## Remote Access Configuration

### Option 1: QuickConnect (Easiest)

1. DSM Control Panel → QuickConnect
2. Enable QuickConnect
3. Set QuickConnect ID: `yourname`
4. Access via: `http://quickconnect.to/yourname:8001`

### Option 2: DDNS with Custom Domain

1. DSM Control Panel → External Access → DDNS
2. Add DDNS provider (Synology, No-IP, etc.)
3. Configure hostname: `creditcard.yourdomain.com`
4. Setup port forwarding on router:
   - External 443 → Synology 443
   - External 80 → Synology 80

### Option 3: Synology Application Portal

1. DSM Control Panel → Application Portal
2. Add reverse proxy rule:
   - Source: `https://creditcard.yourdomain.com`
   - Destination: `http://localhost:8001`
3. Enable HSTS and HTTP/2

### Option 4: VPN Access (Most Secure)

1. Install VPN Server package
2. Configure OpenVPN or L2TP
3. Access locally via: `http://synology.local:8001`

## Backup Strategy

### Automated Backup with Hyper Backup

```bash
# DSM Package Center → Install Hyper Backup

# Create backup task:
1. Open Hyper Backup
2. Create → Data backup task
3. Select destination (local, remote NAS, cloud)
4. Select folders:
   - /volume1/docker/creditcard/data
   - /volume1/docker/creditcard/postgres
5. Schedule: Daily at 2 AM
6. Retention: Keep 30 versions
```

### Database Backup Script

```bash
#!/bin/bash
# /volume1/docker/creditcard/scripts/backup.sh

BACKUP_DIR="/volume1/docker/creditcard/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="creditcard_db"

# Database backup
docker exec $DB_CONTAINER pg_dump -U ccuser creditcard | \
  gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

# Sync to external drive (optional)
rsync -av $BACKUP_DIR/ /volumeUSB1/usbshare/creditcard_backups/
```

### Schedule via Task Scheduler

1. DSM Control Panel → Task Scheduler
2. Create → Scheduled Task → User-defined script
3. Schedule: Daily
4. Script: `/volume1/docker/creditcard/scripts/backup.sh`

## Security Configuration

### 1. Firewall Rules

```bash
# Only allow specific IPs (optional)
# DSM Control Panel → Security → Firewall → Edit Rules

# Create profile "CreditCard"
- Allow: Local subnet (192.168.1.0/24)
- Allow: Specific IPs (your office/home)
- Deny: All others
```

### 2. Fail2Ban Protection

```bash
# DSM Control Panel → Security → Account → Auto Block
- Enable auto block
- Attempts: 5
- Within: 5 minutes
- Block duration: 30 minutes
```

### 3. Application Isolation

```bash
# Docker network isolation
docker network create creditcard_network --internal

# Update docker-compose.yml to use custom network
networks:
  creditcard_network:
    external: true
```

### 4. SSL/TLS Configuration

```nginx
# Enhanced nginx.conf for production
server {
    listen 443 ssl http2;
    server_name creditcard.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

## Monitoring and Maintenance

### Resource Monitoring

```bash
# Via DSM Resource Monitor
# Monitor CPU, RAM, Disk I/O, Network

# Via Docker
docker stats creditcard_backend creditcard_db

# Application metrics endpoint
curl http://localhost:8001/metrics
```

### Log Management

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Log rotation (add to docker-compose.yml)
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Health Checks

```python
# backend/app/health.py
from fastapi import APIRouter
from sqlalchemy import text

router = APIRouter()

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database
        db.execute(text("SELECT 1"))

        # Check file system
        uploads_path = Path("/app/data/uploads")
        if not uploads_path.exists():
            raise Exception("Uploads directory not accessible")

        return {
            "status": "healthy",
            "database": "connected",
            "storage": "available",
            "timestamp": datetime.now()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now()
        }
```

## Performance Optimization

### 1. Resource Allocation

```yaml
# docker-compose.yml resource limits
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 2. PostgreSQL Tuning

```sql
-- postgresql.conf optimizations
shared_buffers = 512MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1  # SSD optimization
```

### 3. Application Caching

```python
# Redis cache (optional)
services:
  redis:
    image: redis:alpine
    container_name: creditcard_cache
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - /volume1/docker/creditcard/redis:/data
```

## Deployment Scripts

### deploy.sh

```bash
#!/bin/bash
# /volume1/docker/creditcard/scripts/deploy.sh

set -e

echo "🚀 Deploying Credit Card Processor..."

# Pull latest code (if using git)
# git pull origin main

# Build containers
echo "📦 Building containers..."
docker-compose build

# Run database migrations
echo "🗄️ Running migrations..."
docker-compose run --rm backend alembic upgrade head

# Start services
echo "▶️ Starting services..."
docker-compose up -d

# Health check
echo "❤️ Checking health..."
sleep 10
curl -f http://localhost:8001/health || exit 1

echo "✅ Deployment complete!"
echo "Access the application at: http://synology.local:8001"
```

### update.sh

```bash
#!/bin/bash
# /volume1/docker/creditcard/scripts/update.sh

set -e

echo "📥 Updating Credit Card Processor..."

# Backup before update
./backup.sh

# Pull latest images
docker-compose pull

# Recreate containers
docker-compose up -d --force-recreate

# Cleanup
docker system prune -f

echo "✅ Update complete!"
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Check permissions
ls -la /volume1/docker/creditcard/

# Reset containers
docker-compose down
docker-compose up -d
```

#### 2. Database Connection Failed
```bash
# Test connection
docker exec -it creditcard_db psql -U ccuser -d creditcard

# Check network
docker network inspect creditcard_network

# Verify credentials
cat .env | grep DB_
```

#### 3. File Upload Issues
```bash
# Check permissions
docker exec -it creditcard_backend ls -la /app/data/uploads

# Check disk space
df -h /volume1

# Test upload endpoint
curl -X POST -F "file=@test.pdf" http://localhost:8001/api/upload
```

#### 4. Performance Issues
```bash
# Check resource usage
docker stats

# Analyze PostgreSQL
docker exec -it creditcard_db psql -U ccuser -d creditcard \
  -c "SELECT * FROM pg_stat_activity;"

# Check slow queries
docker exec -it creditcard_db psql -U ccuser -d creditcard \
  -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

## Migration from Development

### Export from SQLite
```python
# scripts/export_sqlite.py
import sqlite3
import json
from datetime import datetime

def export_to_json(sqlite_path):
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()

    # Export each table
    tables = ['batches', 'documents', 'employees', 'charges', 'action_items']
    data = {}

    for table in tables:
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        data[table] = [dict(zip(columns, row)) for row in rows]

    with open('export.json', 'w') as f:
        json.dump(data, f, default=str, indent=2)

    return data
```

### Import to PostgreSQL
```python
# scripts/import_postgres.py
import psycopg2
import json
from datetime import datetime

def import_from_json(postgres_url, json_path):
    conn = psycopg2.connect(postgres_url)
    cursor = conn.cursor()

    with open(json_path, 'r') as f:
        data = json.load(f)

    # Import in order to respect foreign keys
    tables = ['batches', 'employees', 'documents', 'charges', 'action_items']

    for table in tables:
        for record in data.get(table, []):
            columns = ', '.join(record.keys())
            values = ', '.join(['%s'] * len(record))
            query = f"INSERT INTO {table} ({columns}) VALUES ({values})"
            cursor.execute(query, list(record.values()))

    conn.commit()
    print("Migration complete!")
```

## Cost Analysis

### Synology vs Cloud Comparison

| Aspect | Synology RS1221+ | Azure B1 + PostgreSQL | AWS/GCP Equivalent |
|--------|------------------|----------------------|-------------------|
| **Monthly Cost** | $0 | $13-50/month | $15-60/month |
| **CPU** | 4 cores @ 2.2GHz | 1 core | 1-2 vCPU |
| **RAM** | 4-32GB | 1.75GB | 1-2GB |
| **Storage** | Up to 144TB | 50GB | 20-50GB |
| **Bandwidth** | Unlimited local | 5GB/month | Varies |
| **Uptime** | 99%* | 99.95% | 99.95% |
| **Backup** | Included | Extra cost | Extra cost |
| **SSL** | Free (Let's Encrypt) | Included | Varies |

*Depends on your internet/power reliability

### 3-Year TCO Comparison

| Solution | Hardware | Hosting | Total 3-Year |
|----------|----------|---------|--------------|
| Synology (Existing) | $0 | $0 | **$0** |
| Synology (New) | $2,000 | $0 | **$2,000** |
| Azure Cloud | $0 | $472 | **$472** |
| VPS/Dedicated | $0 | $1,800 | **$1,800** |

## Conclusion

Deploying on Synology RS1221+ provides:
- **Zero recurring costs** with existing hardware
- **Complete data control** and security
- **Superior performance** compared to basic cloud tiers
- **Enterprise features** (backup, SSL, monitoring) included
- **Flexibility** to scale or move to cloud if needed

This solution is ideal for organizations that:
- Already own Synology NAS hardware
- Prioritize data sovereignty
- Want to eliminate cloud dependency
- Need cost-effective long-term solution
- Require on-premise processing for compliance