#!/bin/bash

# Generate SSL certificates for development environment
# This script creates self-signed certificates for local development

set -e

# Configuration
CERT_DIR="nginx/ssl"
DAYS_VALID=365
COUNTRY="US"
STATE="Development"
CITY="Local"
ORGANIZATION="Credit Card Processor"
ORG_UNIT="Development"
COMMON_NAME="localhost"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔐 Generating SSL certificates for development...${NC}"

# Create SSL directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [[ -f "$CERT_DIR/cert.pem" && -f "$CERT_DIR/key.pem" ]]; then
    echo -e "${YELLOW}⚠️  SSL certificates already exist.${NC}"
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✅ Using existing certificates.${NC}"
        exit 0
    fi
    echo -e "${YELLOW}🔄 Regenerating certificates...${NC}"
fi

# Generate private key
echo -e "${YELLOW}🔑 Generating private key...${NC}"
openssl genrsa -out "$CERT_DIR/key.pem" 2048

# Generate certificate signing request
echo -e "${YELLOW}📝 Generating certificate signing request...${NC}"
openssl req -new -key "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.csr" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORGANIZATION/OU=$ORG_UNIT/CN=$COMMON_NAME"

# Generate self-signed certificate with SAN extension
echo -e "${YELLOW}📜 Generating self-signed certificate...${NC}"
cat > "$CERT_DIR/cert.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = $COUNTRY
ST = $STATE
L = $CITY
O = $ORGANIZATION
OU = $ORG_UNIT
CN = $COMMON_NAME

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

openssl x509 -req -days $DAYS_VALID -in "$CERT_DIR/cert.csr" \
    -signkey "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" \
    -extensions v3_req -extfile "$CERT_DIR/cert.conf"

# Set proper permissions
echo -e "${YELLOW}🔒 Setting secure file permissions...${NC}"
chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

# Clean up temporary files
rm "$CERT_DIR/cert.csr"
rm "$CERT_DIR/cert.conf"

# Verify the certificate
echo -e "${YELLOW}✅ Verifying certificate...${NC}"
EXPIRY_DATE=$(openssl x509 -in "$CERT_DIR/cert.pem" -noout -enddate | cut -d= -f2)
SUBJECT=$(openssl x509 -in "$CERT_DIR/cert.pem" -noout -subject | cut -d= -f2-)
ISSUER=$(openssl x509 -in "$CERT_DIR/cert.pem" -noout -issuer | cut -d= -f2-)

echo -e "${GREEN}🎉 SSL certificates generated successfully!${NC}"
echo
echo -e "${YELLOW}Certificate Details:${NC}"
echo -e "  📁 Location: $CERT_DIR/"
echo -e "  👤 Subject: $SUBJECT"
echo -e "  🏢 Issuer: $ISSUER"
echo -e "  📅 Expires: $EXPIRY_DATE"
echo
echo -e "${YELLOW}Files created:${NC}"
echo -e "  🔐 Private Key: $CERT_DIR/key.pem"
echo -e "  📜 Certificate: $CERT_DIR/cert.pem"
echo
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo -e "  • These are self-signed certificates for development only"
echo -e "  • Browsers will show security warnings - this is normal"
echo -e "  • For production, use certificates from a trusted CA"
echo -e "  • Never commit private keys to version control"
echo
echo -e "${GREEN}🚀 Ready to use HTTPS in development mode!${NC}"

# Test certificate and key match
KEY_MD5=$(openssl rsa -noout -modulus -in "$CERT_DIR/key.pem" | openssl md5)
CERT_MD5=$(openssl x509 -noout -modulus -in "$CERT_DIR/cert.pem" | openssl md5)

if [ "$KEY_MD5" = "$CERT_MD5" ]; then
    echo -e "${GREEN}✅ Certificate and key pair validation: PASSED${NC}"
else
    echo -e "${RED}❌ Certificate and key pair validation: FAILED${NC}"
    exit 1
fi