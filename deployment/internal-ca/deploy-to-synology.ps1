# PowerShell Script to Deploy Certificate to Synology and Restart Services
# Automates the certificate deployment process

param(
    [Parameter(Mandatory=$true)]
    [string]$SynologyHost,

    [Parameter(Mandatory=$false)]
    [string]$SynologyUser = "admin",

    [Parameter(Mandatory=$false)]
    [string]$CertPath = ".\certificates\cert.pem",

    [Parameter(Mandatory=$false)]
    [string]$KeyPath = ".\certificates\key.pem",

    [Parameter(Mandatory=$false)]
    [string]$ChainPath = ".\certificates\chain.pem",

    [Parameter(Mandatory=$false)]
    [string]$RemotePath = "/volume1/docker/creditcard/nginx/ssl",

    [Parameter(Mandatory=$false)]
    [switch]$RestartServices = $true,

    [Parameter(Mandatory=$false)]
    [switch]$UseSSHKey = $false
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Synology Certificate Deployment    " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
function Test-Prerequisites {
    Write-Host "Checking prerequisites..." -ForegroundColor Yellow

    $hasErrors = $false

    # Check if certificate files exist
    @($CertPath, $KeyPath, $ChainPath) | ForEach-Object {
        if (!(Test-Path $_)) {
            Write-Host "✗ File not found: $_" -ForegroundColor Red
            $hasErrors = $true
        } else {
            Write-Host "✓ Found: $_" -ForegroundColor Green
        }
    }

    # Check for SSH client
    if (!(Get-Command ssh -ErrorAction SilentlyContinue)) {
        Write-Host "✗ SSH client not found" -ForegroundColor Red
        Write-Host "  Install OpenSSH or use Git Bash" -ForegroundColor Yellow
        $hasErrors = $true
    } else {
        Write-Host "✓ SSH client available" -ForegroundColor Green
    }

    # Check for SCP
    if (!(Get-Command scp -ErrorAction SilentlyContinue)) {
        Write-Host "✗ SCP client not found" -ForegroundColor Red
        $hasErrors = $true
    } else {
        Write-Host "✓ SCP client available" -ForegroundColor Green
    }

    if ($hasErrors) {
        Write-Error "Prerequisites check failed"
        exit 1
    }

    Write-Host "✓ All prerequisites met" -ForegroundColor Green
    return $true
}

# Test connection to Synology
function Test-SynologyConnection {
    Write-Host ""
    Write-Host "Testing connection to Synology..." -ForegroundColor Yellow

    # Test network connectivity
    $pingResult = Test-Connection -ComputerName $SynologyHost -Count 1 -Quiet

    if ($pingResult) {
        Write-Host "✓ Synology is reachable" -ForegroundColor Green
    } else {
        Write-Host "✗ Cannot reach Synology at $SynologyHost" -ForegroundColor Red
        Write-Host "  Check network connection and hostname" -ForegroundColor Yellow
        return $false
    }

    # Test SSH connectivity
    Write-Host "Testing SSH connection..." -ForegroundColor Yellow

    if ($UseSSHKey) {
        $sshTest = "ssh -o ConnectTimeout=5 -o BatchMode=yes $SynologyUser@$SynologyHost exit"
    } else {
        Write-Host "  You may be prompted for password..." -ForegroundColor Cyan
        $sshTest = "ssh -o ConnectTimeout=5 $SynologyUser@$SynologyHost exit"
    }

    $result = Invoke-Expression $sshTest 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SSH connection successful" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ SSH connection failed" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        return $false
    }
}

# Convert PFX to PEM if needed
function Convert-CertificateFormat {
    Write-Host ""
    Write-Host "Checking certificate format..." -ForegroundColor Yellow

    # Check if PEM files exist
    if ((Test-Path $CertPath) -and (Test-Path $KeyPath)) {
        Write-Host "✓ PEM files already exist" -ForegroundColor Green
        return $true
    }

    # Look for PFX file
    $pfxFile = Get-ChildItem -Path ".\certificates" -Filter "*.pfx" | Select-Object -First 1

    if ($pfxFile) {
        Write-Host "Found PFX file: $($pfxFile.Name)" -ForegroundColor Cyan
        Write-Host "Converting to PEM format..." -ForegroundColor Yellow

        if (Get-Command openssl -ErrorAction SilentlyContinue) {
            $pfxPassword = Read-Host "Enter PFX password" -AsSecureString
            $pfxPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pfxPassword)
            )

            # Convert PFX to PEM
            $opensslCmds = @(
                "openssl pkcs12 -in $($pfxFile.FullName) -out .\certificates\cert.pem -clcerts -nokeys -passin pass:$pfxPasswordPlain",
                "openssl pkcs12 -in $($pfxFile.FullName) -out .\certificates\key.pem -nocerts -nodes -passin pass:$pfxPasswordPlain",
                "openssl pkcs12 -in $($pfxFile.FullName) -out .\certificates\chain.pem -cacerts -nokeys -passin pass:$pfxPasswordPlain"
            )

            foreach ($cmd in $opensslCmds) {
                Invoke-Expression $cmd 2>$null
            }

            if ((Test-Path $CertPath) -and (Test-Path $KeyPath)) {
                Write-Host "✓ Conversion successful" -ForegroundColor Green
                return $true
            }
        } else {
            Write-Warning "OpenSSL not found. Please convert PFX manually"
            return $false
        }
    }

    return $true
}

# Copy certificates to Synology
function Deploy-Certificates {
    Write-Host ""
    Write-Host "Deploying certificates to Synology..." -ForegroundColor Yellow

    # Create backup directory on Synology
    $backupCmd = "ssh $SynologyUser@$SynologyHost 'mkdir -p $RemotePath/backup'"
    Write-Host "Creating backup directory..." -ForegroundColor Gray
    Invoke-Expression $backupCmd 2>$null

    # Backup existing certificates
    $backupDate = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFiles = "ssh $SynologyUser@$SynologyHost 'cd $RemotePath && for f in *.pem; do [ -f `$f ] && cp `$f backup/`${f}.${backupDate}; done'"
    Write-Host "Backing up existing certificates..." -ForegroundColor Gray
    Invoke-Expression $backupFiles 2>$null

    # Copy new certificates
    Write-Host "Copying certificates..." -ForegroundColor Yellow

    $files = @(
        @{Local=$CertPath; Remote="$RemotePath/cert.pem"},
        @{Local=$KeyPath; Remote="$RemotePath/key.pem"},
        @{Local=$ChainPath; Remote="$RemotePath/chain.pem"}
    )

    $copySuccess = $true
    foreach ($file in $files) {
        if (Test-Path $file.Local) {
            Write-Host "  Copying $(Split-Path $file.Local -Leaf)..." -ForegroundColor Gray
            $scpCmd = "scp `"$($file.Local)`" ${SynologyUser}@${SynologyHost}:`"$($file.Remote)`""

            $result = Invoke-Expression $scpCmd 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Copied $(Split-Path $file.Local -Leaf)" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed to copy $(Split-Path $file.Local -Leaf)" -ForegroundColor Red
                Write-Host "    Error: $result" -ForegroundColor Red
                $copySuccess = $false
            }
        }
    }

    if (!$copySuccess) {
        Write-Error "Certificate deployment failed"
        return $false
    }

    # Set permissions
    Write-Host "Setting permissions..." -ForegroundColor Yellow
    $permissionsCmds = @(
        "chmod 644 $RemotePath/cert.pem $RemotePath/chain.pem",
        "chmod 600 $RemotePath/key.pem"
    )

    foreach ($cmd in $permissionsCmds) {
        $sshCmd = "ssh $SynologyUser@$SynologyHost '$cmd'"
        Invoke-Expression $sshCmd 2>$null
    }

    Write-Host "✓ Certificates deployed successfully" -ForegroundColor Green
    return $true
}

# Restart Docker services
function Restart-DockerServices {
    if (!$RestartServices) {
        Write-Host ""
        Write-Host "Skipping service restart (use -RestartServices to enable)" -ForegroundColor Yellow
        return $true
    }

    Write-Host ""
    Write-Host "Restarting Docker services..." -ForegroundColor Yellow

    # Check if docker-compose file exists
    $checkCompose = "ssh $SynologyUser@$SynologyHost 'test -f /volume1/docker/creditcard/deployment/docker-compose-ssl.yml && echo exists'"
    $composeExists = Invoke-Expression $checkCompose 2>$null

    if ($composeExists -ne "exists") {
        Write-Warning "docker-compose-ssl.yml not found on Synology"
        Write-Host "Please restart services manually" -ForegroundColor Yellow
        return $false
    }

    # Restart nginx service
    Write-Host "Restarting nginx container..." -ForegroundColor Yellow
    $restartCmd = "ssh $SynologyUser@$SynologyHost 'cd /volume1/docker/creditcard/deployment && docker-compose -f docker-compose-ssl.yml restart nginx'"

    $result = Invoke-Expression $restartCmd 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Nginx restarted successfully" -ForegroundColor Green

        # Wait for service to be ready
        Write-Host "Waiting for service to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5

        return $true
    } else {
        Write-Host "✗ Failed to restart nginx" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        return $false
    }
}

# Verify deployment
function Test-Deployment {
    Write-Host ""
    Write-Host "Verifying deployment..." -ForegroundColor Yellow

    # Test HTTPS connection
    $testUrl = "https://$SynologyHost"
    Write-Host "Testing $testUrl..." -ForegroundColor Gray

    try {
        if ($PSVersionTable.PSVersion.Major -ge 6) {
            $response = Invoke-WebRequest -Uri "$testUrl/health" -SkipCertificateCheck -UseBasicParsing -TimeoutSec 10
        } else {
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
            $response = Invoke-WebRequest -Uri "$testUrl/health" -UseBasicParsing -TimeoutSec 10
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $null
        }

        if ($response.StatusCode -eq 200) {
            Write-Host "✓ HTTPS endpoint responding" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Warning "HTTPS test failed: $_"
    }

    # Check certificate via OpenSSL
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
        Write-Host "Checking deployed certificate..." -ForegroundColor Yellow
        $opensslCmd = "echo | openssl s_client -connect ${SynologyHost}:443 -servername $SynologyHost 2>/dev/null | openssl x509 -noout -subject"
        $certSubject = Invoke-Expression $opensslCmd

        if ($certSubject) {
            Write-Host "✓ Certificate: $certSubject" -ForegroundColor Green
        }
    }

    return $true
}

# Main execution
$startTime = Get-Date

Write-Host "Deployment Configuration:" -ForegroundColor Cyan
Write-Host "  Synology: $SynologyHost"
Write-Host "  User: $SynologyUser"
Write-Host "  Target: $RemotePath"
Write-Host ""

# Run deployment steps
$steps = @(
    @{Name="Prerequisites Check"; Function="Test-Prerequisites"},
    @{Name="Connection Test"; Function="Test-SynologyConnection"},
    @{Name="Certificate Format"; Function="Convert-CertificateFormat"},
    @{Name="Deploy Certificates"; Function="Deploy-Certificates"},
    @{Name="Restart Services"; Function="Restart-DockerServices"},
    @{Name="Verify Deployment"; Function="Test-Deployment"}
)

$allSuccess = $true
foreach ($step in $steps) {
    $result = & $step.Function
    if (!$result) {
        $allSuccess = $false
        Write-Error "$($step.Name) failed"
        break
    }
}

$duration = (Get-Date) - $startTime

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "        Deployment Summary            " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if ($allSuccess) {
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Certificate deployed to: $SynologyHost" -ForegroundColor Cyan
    Write-Host "Access your application at:" -ForegroundColor Cyan
    Write-Host "  https://$SynologyHost" -ForegroundColor Cyan
    Write-Host "  https://creditcard.company.local" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Time taken: $($duration.TotalSeconds) seconds" -ForegroundColor Gray
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the errors above and try again" -ForegroundColor Yellow
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "  - Verify SSH access to Synology"
    Write-Host "  - Check certificate file formats"
    Write-Host "  - Ensure Docker services are running"
    Write-Host "  - Review Synology firewall settings"
    exit 1
}