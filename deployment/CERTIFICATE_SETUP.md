# Certificate Setup Guide for Intranet Deployment

## Overview
This guide covers certificate installation for the Credit Card Processor when deployed on your intranet with VPN/S2S access. Proper SSL/TLS configuration ensures encrypted communication and prevents browser security warnings.

## Certificate Options

### Option 1: Internal Certificate Authority (Recommended)
Most organizations have an internal CA that automatically trusts certificates on domain-joined computers.

#### Requesting an Internal CA Certificate

1. **Generate Certificate Signing Request (CSR)**:
```bash
# On the Synology or deployment server
openssl req -new -newkey rsa:2048 -nodes \
  -keyout /path/to/private.key \
  -out /path/to/request.csr \
  -subj "/C=US/ST=State/L=City/O=YourCompany/CN=creditcard.company.local"
```

2. **Include Subject Alternative Names (SAN)**:
Create a config file `san.cnf`:
```ini
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
CN = creditcard.company.local

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = creditcard.company.local
DNS.2 = synology.company.local
DNS.3 = *.company.local
IP.1 = 10.1.2.3
```

Generate CSR with SAN:
```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout private.key \
  -out request.csr \
  -config san.cnf
```

3. **Submit to Internal CA**:
   - Use your organization's certificate request portal
   - Or submit via PowerShell (on Windows):
```powershell
certreq -submit -config "CA-SERVER\CA-Name" request.csr certificate.cer
```

4. **Install Certificate**:
```bash
# Copy certificates to deployment directory
cp certificate.cer /volume1/docker/creditcard/nginx/ssl/cert.pem
cp private.key /volume1/docker/creditcard/nginx/ssl/key.pem
cp ca-chain.cer /volume1/docker/creditcard/nginx/ssl/chain.pem

# Set proper permissions
chmod 644 /volume1/docker/creditcard/nginx/ssl/cert.pem
chmod 600 /volume1/docker/creditcard/nginx/ssl/key.pem
chmod 644 /volume1/docker/creditcard/nginx/ssl/chain.pem
```

### Option 2: Let's Encrypt with DNS Challenge
For internal servers not exposed to the internet, use DNS-01 challenge.

#### Synology Native Let's Encrypt Setup

1. **Configure in DSM**:
   - Control Panel → Security → Certificate
   - Add → Get certificate from Let's Encrypt
   - Domain: `creditcard.company.local`
   - Enable "Use DNS-01 challenge"

2. **Configure DNS Provider**:
   - Select your DNS provider (Cloudflare, Route53, etc.)
   - Enter API credentials
   - Synology will auto-renew every 90 days

#### Manual Let's Encrypt with Certbot

1. **Install Certbot**:
```bash
docker run -it --rm \
  -v /volume1/docker/creditcard/certbot:/etc/letsencrypt \
  certbot/certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d creditcard.company.local \
  -d synology.company.local
```

2. **Add DNS TXT Records** as prompted

3. **Copy Certificates**:
```bash
cp /volume1/docker/creditcard/certbot/live/creditcard.company.local/fullchain.pem \
   /volume1/docker/creditcard/nginx/ssl/cert.pem
cp /volume1/docker/creditcard/certbot/live/creditcard.company.local/privkey.pem \
   /volume1/docker/creditcard/nginx/ssl/key.pem
```

### Option 3: Self-Signed Certificate (Development Only)
⚠️ **Not recommended for production** - Users will see security warnings

```bash
# Generate self-signed certificate with SAN
cat > self-signed.cnf <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
C = US
ST = State
L = City
O = YourCompany
CN = creditcard.company.local

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = creditcard.company.local
DNS.2 = synology.company.local
DNS.3 = localhost
IP.1 = 10.1.2.3
IP.2 = 127.0.0.1
EOF

# Generate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /volume1/docker/creditcard/nginx/ssl/key.pem \
  -out /volume1/docker/creditcard/nginx/ssl/cert.pem \
  -config self-signed.cnf
```

## Installation Steps

### 1. Prepare Certificate Files

Ensure you have these files in `/volume1/docker/creditcard/nginx/ssl/`:
- `cert.pem` - Server certificate
- `key.pem` - Private key
- `chain.pem` - CA chain (optional for self-signed)

### 2. Update Nginx Configuration

Edit `nginx-ssl.conf` to point to your certificate type:

```nginx
# For Internal CA (default)
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
ssl_trusted_certificate /etc/nginx/ssl/chain.pem;

# For Let's Encrypt (uncomment these, comment above)
# ssl_certificate /etc/letsencrypt/live/creditcard.company.local/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/creditcard.company.local/privkey.pem;
```

### 3. Configure DNS

Add internal DNS entries pointing to your Synology:
```
creditcard.company.local → 10.1.2.3
synology.company.local → 10.1.2.3
```

Windows DNS Server:
```powershell
Add-DnsServerResourceRecordA -Name "creditcard" -ZoneName "company.local" -IPv4Address "10.1.2.3"
```

### 4. Deploy with Docker Compose

```bash
cd /volume1/docker/creditcard/deployment

# Use the SSL-enabled compose file
docker-compose -f docker-compose-ssl.yml up -d

# Verify services
docker-compose -f docker-compose-ssl.yml ps

# Check logs
docker-compose -f docker-compose-ssl.yml logs nginx
```

### 5. Test Certificate

```bash
# Test SSL connection
openssl s_client -connect creditcard.company.local:443 -servername creditcard.company.local

# Test with curl
curl -v https://creditcard.company.local/health

# Check certificate details
echo | openssl s_client -connect creditcard.company.local:443 2>/dev/null | \
  openssl x509 -noout -text
```

## VPN/S2S Access Configuration

### For VPN Users

1. **Update VPN Client Configuration**:
   - Ensure DNS suffix: `company.local`
   - Add search domain: `company.local`

2. **Access URL**:
   - Primary: `https://creditcard.company.local`
   - Fallback: `https://10.1.2.3`

### For Site-to-Site Connections

1. **Configure Split DNS** (if needed):
```
Internal Zone: company.local
creditcard.company.local → 10.1.2.3 (internal IP)
```

2. **Firewall Rules**:
```
Allow HTTPS (443) from VPN subnet → 10.1.2.3
Allow HTTPS (443) from S2S subnet → 10.1.2.3
```

## Troubleshooting

### Certificate Not Trusted

**Symptoms**: Browser shows "Not Secure" or certificate warning

**Solutions**:
1. Verify certificate is from trusted CA
2. Check certificate hostname matches access URL
3. For internal CA, ensure client is domain-joined
4. Manually import CA root certificate if needed

### Certificate Hostname Mismatch

**Error**: "NET::ERR_CERT_COMMON_NAME_INVALID"

**Solution**: Ensure certificate includes all hostnames/IPs in SAN:
```bash
# Check certificate SANs
openssl x509 -in cert.pem -text -noout | grep -A1 "Subject Alternative Name"
```

### Mixed Content Warnings

**Symptoms**: Page loads but some resources blocked

**Solutions**:
1. Ensure all API calls use HTTPS
2. Update frontend environment variables
3. Check WebSocket connections use WSS

### VPN Access Issues

**Symptoms**: Can't resolve hostname over VPN

**Solutions**:
1. Add DNS suffix to VPN connection
2. Use IP address instead of hostname
3. Check VPN routes include server subnet

## Security Best Practices

1. **Use Strong Ciphers**:
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...
```

2. **Enable HSTS**:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

3. **Certificate Pinning** (optional):
```nginx
add_header Public-Key-Pins 'pin-sha256="base64+hash"; max-age=2592000' always;
```

4. **Monitor Certificate Expiry**:
```bash
# Check expiry date
echo | openssl s_client -connect creditcard.company.local:443 2>/dev/null | \
  openssl x509 -noout -enddate
```

## Automation Scripts

### Certificate Renewal Check
```bash
#!/bin/bash
# /volume1/docker/creditcard/scripts/check-cert.sh

CERT_FILE="/volume1/docker/creditcard/nginx/ssl/cert.pem"
DAYS_WARNING=30

if [ -f "$CERT_FILE" ]; then
  EXPIRY=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

  if [ $DAYS_LEFT -lt $DAYS_WARNING ]; then
    echo "WARNING: Certificate expires in $DAYS_LEFT days"
    # Send alert email or notification
  fi
fi
```

### Quick Deployment Script
```bash
#!/bin/bash
# /volume1/docker/creditcard/scripts/deploy-ssl.sh

echo "🔒 Deploying Credit Card Processor with HTTPS..."

# Check certificate files
if [ ! -f "./nginx/ssl/cert.pem" ]; then
  echo "❌ Error: Certificate file not found"
  exit 1
fi

# Load environment
source .env.production

# Deploy with SSL configuration
docker-compose -f docker-compose-ssl.yml up -d

# Wait for services
sleep 10

# Test HTTPS endpoint
if curl -k https://localhost/health > /dev/null 2>&1; then
  echo "✅ HTTPS deployment successful"
  echo "🌐 Access at: https://creditcard.company.local"
else
  echo "❌ HTTPS health check failed"
  docker-compose -f docker-compose-ssl.yml logs nginx
fi
```

## Support Resources

- **Internal CA Issues**: Contact your IT security team
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Synology SSL**: DSM Help Center → Security → Certificate
- **Docker TLS**: https://docs.docker.com/engine/security/