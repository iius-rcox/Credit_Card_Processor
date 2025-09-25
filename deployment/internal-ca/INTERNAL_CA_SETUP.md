# Internal CA Certificate Setup Guide

## Quick Start

### Prerequisites
- Domain-joined Windows workstation
- Administrative privileges (for certificate installation)
- Access to your organization's Certificate Authority
- PowerShell 5.0 or higher

### Step 1: Request Certificate (One Command)

Open PowerShell as Administrator and run:

```powershell
cd deployment\internal-ca
.\request-certificate.ps1 -PrimaryHostname "creditcard.company.local" -IPAddresses "10.1.2.3"
```

The script will:
1. Auto-discover your CA server
2. Find available certificate templates
3. Generate the certificate request
4. Submit to your CA
5. Export certificates in multiple formats

## Detailed Setup Process

### Option A: Fully Automated (Using PowerShell Script)

1. **Open PowerShell as Administrator**

2. **Navigate to the scripts directory**:
```powershell
cd "C:\Users\rcox\Documents\Cursor Projects\Credit_Card_Processor\deployment\internal-ca"
```

3. **Run the request script with your parameters**:
```powershell
.\request-certificate.ps1 `
    -PrimaryHostname "creditcard.insulationsinc.local" `
    -AlternativeNames @("synology.insulationsinc.local", "creditcard", "synology") `
    -IPAddresses @("10.1.2.3") `
    -TemplateName "WebServer"
```

4. **Follow the prompts**:
   - The script will auto-discover your CA
   - Enter a password for PFX export when prompted
   - If the certificate requires approval, you'll get a Request ID

5. **If approval is needed** (you'll see a pending message):
```powershell
# After your CA admin approves, retrieve the certificate:
.\retrieve-certificate.ps1 -RequestId 12345
```

### Option B: Manual Process (Using MMC)

1. **Open Certificate Manager**:
   - Run: `mmc.exe`
   - Add Certificate snap-in for "Computer account"

2. **Create Certificate Request**:
   - Right-click Personal → All Tasks → Advanced Operations → Create Custom Request
   - Proceed without enrollment policy
   - Select "Web Server" template
   - Click Properties to add SANs

3. **Configure Subject Alternative Names**:
   - Add DNS names:
     - creditcard.company.local
     - synology.company.local
     - creditcard
   - Add IP addresses:
     - 10.1.2.3

4. **Submit to CA**:
   - Save request as .req file
   - Submit via CA Web Enrollment or certreq command

5. **Install and Export**:
   - Install issued certificate
   - Export as PFX with private key

### Option C: Using IIS Manager (If IIS is installed)

1. **Open IIS Manager**
2. **Server Certificates** → Create Certificate Request
3. **Fill in details**:
   - Common Name: creditcard.company.local
   - Organization: INSULATIONSINC
   - Organizational Unit: IT
4. **Save CSR and submit to CA**
5. **Complete Certificate Request** when approved

## Converting Certificates for Nginx

### Windows (PowerShell + OpenSSL)

1. **Install OpenSSL** (if not already installed):
```powershell
# Using Chocolatey
choco install openssl

# Or download from: https://slproweb.com/products/Win32OpenSSL.html
```

2. **Convert PFX to PEM**:
```powershell
# Navigate to certificates directory
cd deployment\internal-ca\certificates

# Convert (you'll be prompted for PFX password)
openssl pkcs12 -in certificate.pfx -out cert.pem -clcerts -nokeys
openssl pkcs12 -in certificate.pfx -out key.pem -nocerts -nodes
openssl pkcs12 -in certificate.pfx -out chain.pem -cacerts -nokeys
```

### Linux/Mac/WSL

```bash
# Navigate to certificates directory
cd deployment/internal-ca/certificates

# Run the provided conversion script
bash convert-to-pem.sh

# Or manually:
openssl pkcs12 -in certificate.pfx -out cert.pem -clcerts -nokeys
openssl pkcs12 -in certificate.pfx -out key.pem -nocerts -nodes
openssl pkcs12 -in certificate.pfx -out chain.pem -cacerts -nokeys
```

## Deploying to Synology

### Method 1: SCP Transfer

```bash
# From your workstation
scp cert.pem key.pem chain.pem admin@synology.local:/volume1/docker/creditcard/nginx/ssl/
```

### Method 2: Synology File Station

1. Open DSM File Station
2. Navigate to: `/docker/creditcard/nginx/ssl/`
3. Upload: cert.pem, key.pem, chain.pem

### Method 3: Windows Network Share

```powershell
# Copy files via SMB
Copy-Item cert.pem, key.pem, chain.pem `
    -Destination "\\synology\docker\creditcard\nginx\ssl\"
```

### Set Permissions

SSH to Synology and run:
```bash
cd /volume1/docker/creditcard/nginx/ssl
chmod 644 cert.pem chain.pem
chmod 600 key.pem
chown root:root *.pem
```

## Verification Steps

### 1. Test Certificate Locally

```powershell
# Check certificate details
certutil -dump certificate.cer

# Verify certificate chain
certutil -verify -urlfetch certificate.cer
```

### 2. Test After Deployment

```bash
# Test SSL connection
openssl s_client -connect creditcard.company.local:443 -servername creditcard.company.local

# Check certificate dates
echo | openssl s_client -connect creditcard.company.local:443 2>/dev/null | openssl x509 -noout -dates

# Verify SAN entries
echo | openssl s_client -connect creditcard.company.local:443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
```

### 3. Browser Testing

1. Navigate to: https://creditcard.company.local
2. Click the padlock icon
3. View certificate details
4. Verify:
   - Issued by your Internal CA
   - Valid dates
   - Includes all SANs

## Common Issues and Solutions

### Issue: "Template not found"

**Solution**: Check available templates:
```powershell
certutil -CATemplates -Config "CA-SERVER\CA-Name"
```

Common template names:
- WebServer
- Computer
- Machine
- SSLServer (custom)

### Issue: "Access Denied" when requesting certificate

**Solution**: Ensure you have enrollment permissions:
```powershell
# Check your permissions
whoami /groups

# May need to be added to "Domain Computers" or specific cert group
```

### Issue: Certificate pending approval

**Solution**:
1. Note the Request ID from the script output
2. Contact your CA administrator with the Request ID
3. After approval, run:
```powershell
.\retrieve-certificate.ps1 -RequestId YOUR_REQUEST_ID
```

### Issue: Cannot discover CA automatically

**Solution**: Manually specify CA:
```powershell
# Find CA name
certutil -config - -ping

# Use explicit CA server
.\request-certificate.ps1 -CAServer "CA-SERVER\CA-Name" ...
```

### Issue: PFX password not working

**Solution**: Re-export without special characters:
```powershell
$securePass = ConvertTo-SecureString "SimplePassword123" -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath new.pfx -Password $securePass
```

## Automation for CI/CD

### Jenkins Pipeline Example

```groovy
pipeline {
    agent { label 'windows' }
    stages {
        stage('Request Certificate') {
            steps {
                powershell '''
                    cd deployment/internal-ca
                    .\\request-certificate.ps1 `
                        -PrimaryHostname "${CERT_HOSTNAME}" `
                        -IPAddresses "${SERVER_IP}" `
                        -OutputPath "${WORKSPACE}/certs"
                '''
            }
        }
        stage('Deploy to Synology') {
            steps {
                sh '''
                    scp certs/*.pem ${SYNOLOGY_USER}@${SYNOLOGY_HOST}:/volume1/docker/creditcard/nginx/ssl/
                    ssh ${SYNOLOGY_USER}@${SYNOLOGY_HOST} "docker-compose -f /volume1/docker/creditcard/docker-compose-ssl.yml restart nginx"
                '''
            }
        }
    }
}
```

### Scheduled Certificate Renewal

Create Windows Scheduled Task:
```powershell
# Check certificate expiry and renew if needed
$taskAction = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-File C:\Scripts\check-cert-renewal.ps1"

$taskTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 2am

Register-ScheduledTask -TaskName "CreditCardCertRenewal" `
    -Action $taskAction -Trigger $taskTrigger `
    -Description "Check and renew Credit Card Processor certificate"
```

## Security Checklist

- [ ] Certificate includes all required SANs
- [ ] Private key is properly protected (chmod 600)
- [ ] Certificate is from trusted Internal CA
- [ ] Certificate validity period is appropriate
- [ ] Strong key length (2048-bit minimum)
- [ ] Proper cipher suites configured in Nginx
- [ ] HSTS header enabled
- [ ] Certificate chain is complete
- [ ] Monitoring for certificate expiration
- [ ] Backup of certificates stored securely

## Support Contacts

For certificate issues:
1. Your domain administrator
2. PKI/Certificate team
3. Information Security team

## Next Steps

1. ✅ Certificate obtained from Internal CA
2. ✅ Converted to PEM format
3. ✅ Deployed to Synology
4. → Test HTTPS access
5. → Configure monitoring
6. → Document renewal process