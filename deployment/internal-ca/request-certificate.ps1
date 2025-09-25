# PowerShell Script for Requesting Internal CA Certificate
# For Credit Card Processor HTTPS Deployment
# Requires: Domain-joined Windows machine with access to Enterprise CA

param(
    [Parameter(Mandatory=$false)]
    [string]$CAServer = "", # Will auto-discover if not provided

    [Parameter(Mandatory=$false)]
    [string]$TemplateName = "WebServer", # Common template name, adjust based on your org

    [Parameter(Mandatory=$false)]
    [string]$PrimaryHostname = "creditcard.company.local",

    [Parameter(Mandatory=$false)]
    [string[]]$AlternativeNames = @(
        "synology.company.local",
        "creditcard",
        "synology"
    ),

    [Parameter(Mandatory=$false)]
    [string[]]$IPAddresses = @("10.1.2.3"), # Add your Synology IP

    [Parameter(Mandatory=$false)]
    [string]$OutputPath = ".\certificates"
)

# Script must run as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator. Exiting..."
    exit 1
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Internal CA Certificate Request Tool " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Create output directory
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
    Write-Host "✓ Created output directory: $OutputPath" -ForegroundColor Green
}

# Function to discover CA server
function Get-CAServer {
    Write-Host "Discovering Certificate Authority server..." -ForegroundColor Yellow

    try {
        $configContext = ([ADSI]"LDAP://RootDSE").ConfigurationNamingContext
        $caSearch = New-Object System.DirectoryServices.DirectorySearcher
        $caSearch.SearchRoot = [ADSI]"LDAP://CN=Enrollment Services,CN=Public Key Services,CN=Services,$configContext"
        $caSearch.Filter = "(objectClass=pKIEnrollmentService)"
        $caResults = $caSearch.FindAll()

        if ($caResults.Count -eq 0) {
            throw "No Certificate Authority found in Active Directory"
        }

        $caList = @()
        foreach ($ca in $caResults) {
            $caName = $ca.Properties["cn"][0]
            $caServer = $ca.Properties["dNSHostName"][0]
            $caList += "$caServer\$caName"
        }

        if ($caList.Count -eq 1) {
            Write-Host "✓ Found CA: $($caList[0])" -ForegroundColor Green
            return $caList[0]
        } else {
            Write-Host "Multiple CAs found:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $caList.Count; $i++) {
                Write-Host "  [$i] $($caList[$i])"
            }
            $selection = Read-Host "Select CA [0-$($caList.Count-1)]"
            return $caList[$selection]
        }
    } catch {
        Write-Error "Failed to discover CA: $_"
        return $null
    }
}

# Auto-discover CA if not provided
if ([string]::IsNullOrEmpty($CAServer)) {
    $CAServer = Get-CAServer
    if ([string]::IsNullOrEmpty($CAServer)) {
        Write-Error "Could not discover CA server. Please specify with -CAServer parameter"
        exit 1
    }
}

# Function to get available certificate templates
function Get-AvailableTemplates {
    param([string]$CA)

    Write-Host "Retrieving available certificate templates..." -ForegroundColor Yellow

    try {
        $templates = certutil -CATemplates -Config $CA 2>&1
        $templateList = @()

        foreach ($line in $templates) {
            if ($line -match "^(.+?):\s*(.+?)$") {
                $templateName = $matches[1].Trim()
                if ($templateName -notmatch "^-+" -and
                    $templateName -notmatch "^Template" -and
                    $templateName.Length -gt 0) {
                    $templateList += $templateName
                }
            }
        }

        # Common web server templates
        $webTemplates = $templateList | Where-Object {
            $_ -match "Web" -or
            $_ -match "SSL" -or
            $_ -match "Server" -or
            $_ -match "Computer"
        }

        if ($webTemplates.Count -gt 0) {
            Write-Host "✓ Found web server templates:" -ForegroundColor Green
            $webTemplates | ForEach-Object { Write-Host "  - $_" }
            return $webTemplates
        } else {
            Write-Host "Available templates:" -ForegroundColor Yellow
            $templateList | ForEach-Object { Write-Host "  - $_" }
            return $templateList
        }
    } catch {
        Write-Warning "Could not retrieve templates: $_"
        return @("WebServer", "Computer", "Machine")
    }
}

# Verify template exists
$availableTemplates = Get-AvailableTemplates -CA $CAServer
if ($TemplateName -notin $availableTemplates) {
    Write-Host ""
    Write-Warning "Template '$TemplateName' may not be available"
    Write-Host "Available templates: $($availableTemplates -join ', ')" -ForegroundColor Yellow
    $useTemplate = Read-Host "Enter template name to use (or press Enter for '$TemplateName')"
    if (![string]::IsNullOrEmpty($useTemplate)) {
        $TemplateName = $useTemplate
    }
}

Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  CA Server:        $CAServer"
Write-Host "  Template:         $TemplateName"
Write-Host "  Primary Name:     $PrimaryHostname"
Write-Host "  Alt Names:        $($AlternativeNames -join ', ')"
Write-Host "  IP Addresses:     $($IPAddresses -join ', ')"
Write-Host ""

# Step 1: Create the certificate request configuration file
Write-Host "Step 1: Creating certificate request configuration..." -ForegroundColor Yellow

$infContent = @"
[Version]
Signature="`$Windows NT`$"

[NewRequest]
Subject = "CN=$PrimaryHostname, O=INSULATIONSINC, OU=IT, C=US, S=State, L=City"
KeySpec = 1
KeyLength = 2048
Exportable = TRUE
FriendlyName = "Credit Card Processor SSL Certificate"
MachineKeySet = TRUE
SMIME = FALSE
PrivateKeyArchive = FALSE
UserProtected = FALSE
UseExistingKeySet = FALSE
ProviderName = "Microsoft RSA SChannel Cryptographic Provider"
ProviderType = 12
RequestType = PKCS10
KeyUsage = 0xa0
HashAlgorithm = SHA256

[EnhancedKeyUsageExtension]
OID=1.3.6.1.5.5.7.3.1 ; Server Authentication
OID=1.3.6.1.5.5.7.3.2 ; Client Authentication

[Extensions]
2.5.29.17 = "{text}"
"@

# Add Subject Alternative Names
foreach ($altName in $AlternativeNames) {
    $infContent += "`n_continue_ = `"DNS=$altName&`""
}

foreach ($ip in $IPAddresses) {
    $infContent += "`n_continue_ = `"IPAddress=$ip&`""
}

# Add primary hostname to SAN as well
$infContent += "`n_continue_ = `"DNS=$PrimaryHostname&`""

$infFile = Join-Path $OutputPath "request.inf"
$infContent | Out-File -FilePath $infFile -Encoding ASCII
Write-Host "✓ Created request configuration: $infFile" -ForegroundColor Green

# Step 2: Generate the certificate request
Write-Host ""
Write-Host "Step 2: Generating certificate request..." -ForegroundColor Yellow

$reqFile = Join-Path $OutputPath "request.req"
$result = certreq -new -machine $infFile $reqFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Generated certificate request: $reqFile" -ForegroundColor Green
} else {
    Write-Error "Failed to generate certificate request: $result"
    exit 1
}

# Step 3: Submit the request to CA
Write-Host ""
Write-Host "Step 3: Submitting request to Certificate Authority..." -ForegroundColor Yellow

$cerFile = Join-Path $OutputPath "certificate.cer"
$result = certreq -submit -config "$CAServer" -attrib "CertificateTemplate:$TemplateName" $reqFile $cerFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Certificate issued successfully: $cerFile" -ForegroundColor Green

    # Extract request ID from output
    if ($result -match "RequestId: (\d+)") {
        $requestId = $matches[1]
        Write-Host "  Request ID: $requestId" -ForegroundColor Cyan
    }
} else {
    Write-Error "Failed to submit certificate request"
    Write-Host "Error details: $result" -ForegroundColor Red

    # Check if it's pending approval
    if ($result -match "pending" -or $result -match "taken under submission") {
        Write-Host ""
        Write-Warning "Certificate request is pending approval"
        Write-Host "Please contact your CA administrator to approve the request"
        if ($result -match "RequestId: (\d+)") {
            $requestId = $matches[1]
            Write-Host "Request ID for approval: $requestId" -ForegroundColor Yellow

            # Save request ID for later retrieval
            $requestId | Out-File -FilePath (Join-Path $OutputPath "pending_request_id.txt")
            Write-Host "Request ID saved to: pending_request_id.txt" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "After approval, run: .\retrieve-certificate.ps1 -RequestId $requestId" -ForegroundColor Yellow
        }
    }
    exit 1
}

# Step 4: Accept and install the certificate (to export with private key)
Write-Host ""
Write-Host "Step 4: Installing certificate for export..." -ForegroundColor Yellow

$result = certreq -accept -machine $cerFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Certificate installed successfully" -ForegroundColor Green
} else {
    Write-Warning "Could not install certificate: $result"
}

# Step 5: Export certificate with private key
Write-Host ""
Write-Host "Step 5: Exporting certificate and private key..." -ForegroundColor Yellow

# Find the installed certificate
$cert = Get-ChildItem -Path Cert:\LocalMachine\My |
    Where-Object { $_.Subject -match [regex]::Escape($PrimaryHostname) } |
    Sort-Object -Property NotBefore -Descending |
    Select-Object -First 1

if ($cert) {
    Write-Host "✓ Found certificate: $($cert.Thumbprint)" -ForegroundColor Green

    # Export as PFX with private key
    $pfxPath = Join-Path $OutputPath "certificate.pfx"
    $pfxPassword = Read-Host "Enter password for PFX export" -AsSecureString

    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pfxPassword | Out-Null
    Write-Host "✓ Exported PFX: $pfxPath" -ForegroundColor Green

    # Export public certificate as CER
    $publicCerPath = Join-Path $OutputPath "public_certificate.cer"
    Export-Certificate -Cert $cert -FilePath $publicCerPath -Type CERT | Out-Null
    Write-Host "✓ Exported public certificate: $publicCerPath" -ForegroundColor Green

    # Convert to PEM format for Nginx
    Write-Host ""
    Write-Host "Step 6: Converting to PEM format for Nginx..." -ForegroundColor Yellow

    # Create conversion script
    $convertScript = @"
# Run this in Git Bash or WSL to convert PFX to PEM
# Password will be prompted

echo "Converting PFX to PEM format..."

# Extract private key
openssl pkcs12 -in certificate.pfx -nocerts -out temp_key.pem -nodes

# Extract certificate
openssl pkcs12 -in certificate.pfx -clcerts -nokeys -out cert.pem

# Extract CA chain
openssl pkcs12 -in certificate.pfx -cacerts -nokeys -out chain.pem

# Create unencrypted private key for Nginx
openssl rsa -in temp_key.pem -out key.pem

# Clean up
rm temp_key.pem

echo "✓ Conversion complete!"
echo "  - cert.pem:  Server certificate"
echo "  - key.pem:   Private key (unencrypted)"
echo "  - chain.pem: CA chain"
"@

    $convertScript | Out-File -FilePath (Join-Path $OutputPath "convert-to-pem.sh") -Encoding UTF8
    Write-Host "✓ Created conversion script: convert-to-pem.sh" -ForegroundColor Green

    # Also try to export directly as Base64 (PEM)
    $certPemPath = Join-Path $OutputPath "cert.pem"
    $certBase64 = [System.Convert]::ToBase64String($cert.RawData, [System.Base64FormattingOptions]::InsertLineBreaks)
    $pemContent = "-----BEGIN CERTIFICATE-----`n$certBase64`n-----END CERTIFICATE-----"
    $pemContent | Out-File -FilePath $certPemPath -Encoding ASCII
    Write-Host "✓ Exported certificate as PEM: cert.pem" -ForegroundColor Green

} else {
    Write-Warning "Could not find installed certificate for export"
    Write-Host "Certificate files are saved in: $OutputPath" -ForegroundColor Yellow
}

# Step 7: Get CA chain
Write-Host ""
Write-Host "Step 7: Retrieving CA certificate chain..." -ForegroundColor Yellow

try {
    $caChainResult = certutil -config "$CAServer" -ca.chain ca_chain.p7b 2>&1
    if ($LASTEXITCODE -eq 0) {
        Move-Item -Path "ca_chain.p7b" -Destination (Join-Path $OutputPath "ca_chain.p7b") -Force
        Write-Host "✓ Retrieved CA chain: ca_chain.p7b" -ForegroundColor Green
    }
} catch {
    Write-Warning "Could not retrieve CA chain automatically"
}

# Create deployment instructions
Write-Host ""
Write-Host "Step 8: Creating deployment instructions..." -ForegroundColor Yellow

$instructions = @"
DEPLOYMENT INSTRUCTIONS FOR SYNOLOGY/DOCKER
==========================================

1. CONVERT CERTIFICATES (if not already in PEM format):
   - Use Git Bash or WSL
   - Navigate to: $OutputPath
   - Run: bash convert-to-pem.sh
   - Enter the PFX password when prompted

2. COPY FILES TO SYNOLOGY:
   Transfer these files to your Synology:
   - cert.pem    -> /volume1/docker/creditcard/nginx/ssl/cert.pem
   - key.pem     -> /volume1/docker/creditcard/nginx/ssl/key.pem
   - chain.pem   -> /volume1/docker/creditcard/nginx/ssl/chain.pem

   Using SCP:
   scp cert.pem key.pem chain.pem admin@synology.local:/volume1/docker/creditcard/nginx/ssl/

3. SET PERMISSIONS:
   SSH to Synology and run:
   chmod 644 /volume1/docker/creditcard/nginx/ssl/cert.pem
   chmod 600 /volume1/docker/creditcard/nginx/ssl/key.pem
   chmod 644 /volume1/docker/creditcard/nginx/ssl/chain.pem

4. UPDATE NGINX CONFIGURATION:
   Edit nginx-ssl.conf to use Internal CA certificates:
   ssl_certificate /etc/nginx/ssl/cert.pem;
   ssl_certificate_key /etc/nginx/ssl/key.pem;
   ssl_trusted_certificate /etc/nginx/ssl/chain.pem;

5. RESTART SERVICES:
   docker-compose -f docker-compose-ssl.yml restart nginx

6. TEST CONNECTION:
   https://$PrimaryHostname
   https://$($IPAddresses[0])

CERTIFICATE DETAILS:
- Primary Name: $PrimaryHostname
- Alt Names: $($AlternativeNames -join ', ')
- IP Addresses: $($IPAddresses -join ', ')
- Valid From: $(if ($cert) { $cert.NotBefore } else { "Check certificate" })
- Valid To: $(if ($cert) { $cert.NotAfter } else { "Check certificate" })
- Thumbprint: $(if ($cert) { $cert.Thumbprint } else { "Check certificate" })

TROUBLESHOOTING:
- If certificate not trusted: Ensure client is domain-joined
- If hostname mismatch: Check certificate SAN entries
- If connection refused: Check firewall rules for port 443
"@

$instructions | Out-File -FilePath (Join-Path $OutputPath "DEPLOYMENT_INSTRUCTIONS.txt") -Encoding UTF8
Write-Host "✓ Created deployment instructions: DEPLOYMENT_INSTRUCTIONS.txt" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Certificate Request Complete! " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files created in: $OutputPath" -ForegroundColor Cyan
Write-Host "  - certificate.cer      : Issued certificate"
Write-Host "  - certificate.pfx      : Certificate with private key"
Write-Host "  - cert.pem            : Certificate in PEM format"
Write-Host "  - convert-to-pem.sh   : Script to convert PFX to PEM"
Write-Host "  - DEPLOYMENT_INSTRUCTIONS.txt : Step-by-step deployment guide"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Convert certificates to PEM format (if needed)"
Write-Host "2. Copy PEM files to Synology"
Write-Host "3. Deploy with docker-compose-ssl.yml"
Write-Host ""
Write-Host "For detailed instructions, see: DEPLOYMENT_INSTRUCTIONS.txt" -ForegroundColor Cyan