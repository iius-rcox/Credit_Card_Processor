# PowerShell Script to Retrieve Pending Certificate from Internal CA
# Use this when certificate request requires approval

param(
    [Parameter(Mandatory=$true)]
    [int]$RequestId,

    [Parameter(Mandatory=$false)]
    [string]$CAServer = "", # Will auto-discover if not provided

    [Parameter(Mandatory=$false)]
    [string]$OutputPath = ".\certificates"
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Certificate Retrieval Tool " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

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
            Write-Host "Multiple CAs found. Using first one: $($caList[0])" -ForegroundColor Yellow
            return $caList[0]
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

# Create output directory
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
    Write-Host "✓ Created output directory: $OutputPath" -ForegroundColor Green
}

Write-Host "Retrieving certificate for Request ID: $RequestId" -ForegroundColor Yellow
Write-Host "CA Server: $CAServer" -ForegroundColor Cyan
Write-Host ""

# Check request status
Write-Host "Checking request status..." -ForegroundColor Yellow
$statusResult = certutil -config "$CAServer" -view -out "Request.RequestID,Request.CommonName,Request.DispositionMessage,Request.Disposition" -restrict "RequestID=$RequestId" 2>&1

if ($statusResult -match "Disposition: (.*)" ) {
    $disposition = $matches[1].Trim()
    Write-Host "Request Status: $disposition" -ForegroundColor Cyan

    if ($disposition -match "Issued") {
        Write-Host "✓ Certificate has been issued!" -ForegroundColor Green
    } elseif ($disposition -match "Pending") {
        Write-Warning "Certificate is still pending approval"
        Write-Host "Please contact your CA administrator to approve Request ID: $RequestId" -ForegroundColor Yellow
        exit 1
    } elseif ($disposition -match "Denied" -or $disposition -match "Failed") {
        Write-Error "Certificate request was denied or failed"
        if ($statusResult -match "DispositionMessage: (.*)") {
            Write-Host "Reason: $($matches[1])" -ForegroundColor Red
        }
        exit 1
    }
}

# Retrieve the certificate
Write-Host ""
Write-Host "Retrieving issued certificate..." -ForegroundColor Yellow

$cerFile = Join-Path $OutputPath "certificate_$RequestId.cer"
$p7bFile = Join-Path $OutputPath "certificate_$RequestId.p7b"

# Try to retrieve as CER
$result = certutil -config "$CAServer" -retrieve $RequestId $cerFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Retrieved certificate: $cerFile" -ForegroundColor Green
} else {
    Write-Error "Failed to retrieve certificate: $result"
    exit 1
}

# Also retrieve with full chain
Write-Host "Retrieving certificate with chain..." -ForegroundColor Yellow
$chainResult = certutil -config "$CAServer" -retrieve $RequestId $p7bFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Retrieved certificate chain: $p7bFile" -ForegroundColor Green
}

# Install the certificate to export with private key
Write-Host ""
Write-Host "Installing certificate..." -ForegroundColor Yellow

$result = certreq -accept -machine $cerFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Certificate installed successfully" -ForegroundColor Green

    # Find the installed certificate
    Start-Sleep -Seconds 2 # Give system time to register the cert

    $certs = Get-ChildItem -Path Cert:\LocalMachine\My
    $cert = $certs | Sort-Object -Property NotBefore -Descending | Select-Object -First 1

    if ($cert) {
        Write-Host "✓ Found certificate: $($cert.Subject)" -ForegroundColor Green
        Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
        Write-Host "  Valid from: $($cert.NotBefore) to $($cert.NotAfter)" -ForegroundColor Cyan

        # Export as PFX
        Write-Host ""
        Write-Host "Exporting certificate with private key..." -ForegroundColor Yellow

        $pfxPath = Join-Path $OutputPath "certificate_$RequestId.pfx"
        $pfxPassword = Read-Host "Enter password for PFX export" -AsSecureString

        Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pfxPassword | Out-Null
        Write-Host "✓ Exported PFX: $pfxPath" -ForegroundColor Green

        # Create conversion script
        $convertScript = @"
#!/bin/bash
# Convert PFX to PEM format for Nginx

echo "Converting certificate_$RequestId.pfx to PEM format..."

# You will be prompted for the PFX password

# Extract private key
openssl pkcs12 -in certificate_$RequestId.pfx -nocerts -out temp_key.pem -nodes

# Extract certificate
openssl pkcs12 -in certificate_$RequestId.pfx -clcerts -nokeys -out cert.pem

# Extract CA chain
openssl pkcs12 -in certificate_$RequestId.pfx -cacerts -nokeys -out chain.pem

# Create unencrypted private key
openssl rsa -in temp_key.pem -out key.pem

# Clean up
rm temp_key.pem

echo "✓ Conversion complete!"
echo "Files created:"
echo "  - cert.pem:  Server certificate"
echo "  - key.pem:   Private key (unencrypted)"
echo "  - chain.pem: CA chain"
"@

        $convertScript | Out-File -FilePath (Join-Path $OutputPath "convert-to-pem.sh") -Encoding UTF8
        Write-Host "✓ Created conversion script: convert-to-pem.sh" -ForegroundColor Green
    }
} else {
    Write-Warning "Could not install certificate automatically"
    Write-Host "You may need to install it manually using the certificate file: $cerFile" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Certificate Retrieved Successfully! " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files created in: $OutputPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Convert PFX to PEM format using Git Bash or WSL:"
Write-Host "   bash convert-to-pem.sh"
Write-Host "2. Copy PEM files to Synology"
Write-Host "3. Deploy with docker-compose-ssl.yml"