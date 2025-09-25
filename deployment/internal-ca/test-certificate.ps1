# PowerShell Script to Test and Verify Internal CA Certificate
# Run this after certificate installation to verify everything is working

param(
    [Parameter(Mandatory=$false)]
    [string]$Hostname = "creditcard.company.local",

    [Parameter(Mandatory=$false)]
    [int]$Port = 443,

    [Parameter(Mandatory=$false)]
    [string]$CertPath = ".\certificates\cert.pem",

    [Parameter(Mandatory=$false)]
    [switch]$TestLocal = $false,

    [Parameter(Mandatory=$false)]
    [switch]$TestRemote = $true,

    [Parameter(Mandatory=$false)]
    [switch]$Verbose = $false
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   Certificate Verification Tool     " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$testResults = @()
$hasErrors = $false

# Function to test certificate file
function Test-CertificateFile {
    param([string]$Path)

    Write-Host "Testing local certificate file..." -ForegroundColor Yellow

    if (Test-Path $Path) {
        Write-Host "✓ Certificate file found: $Path" -ForegroundColor Green

        try {
            if ($Path -like "*.pem" -or $Path -like "*.crt" -or $Path -like "*.cer") {
                # Read PEM file
                $pemContent = Get-Content $Path -Raw

                if ($pemContent -match "-----BEGIN CERTIFICATE-----") {
                    Write-Host "✓ Valid PEM format detected" -ForegroundColor Green

                    # Convert PEM to cert object for analysis
                    $pemBase64 = $pemContent -replace "-----BEGIN CERTIFICATE-----", "" `
                                           -replace "-----END CERTIFICATE-----", "" `
                                           -replace "\s", ""
                    $certBytes = [Convert]::FromBase64String($pemBase64)
                    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(,$certBytes)

                    Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Cyan
                    Write-Host "  Issuer: $($cert.Issuer)" -ForegroundColor Cyan
                    Write-Host "  Valid From: $($cert.NotBefore)" -ForegroundColor Cyan
                    Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor Cyan
                    Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan

                    # Check expiration
                    $daysUntilExpiry = ($cert.NotAfter - (Get-Date)).Days
                    if ($daysUntilExpiry -lt 0) {
                        Write-Host "✗ Certificate has expired!" -ForegroundColor Red
                        return $false
                    } elseif ($daysUntilExpiry -lt 30) {
                        Write-Warning "Certificate expires in $daysUntilExpiry days"
                    } else {
                        Write-Host "✓ Certificate valid for $daysUntilExpiry more days" -ForegroundColor Green
                    }

                    # Check SAN entries
                    $sanExt = $cert.Extensions | Where-Object { $_.Oid.Value -eq "2.5.29.17" }
                    if ($sanExt) {
                        Write-Host "  Subject Alternative Names:" -ForegroundColor Cyan
                        $sanExt.Format(1) -split "`n" | ForEach-Object {
                            Write-Host "    $_" -ForegroundColor Gray
                        }
                    }

                    return $true
                } else {
                    Write-Host "✗ Invalid PEM format" -ForegroundColor Red
                    return $false
                }
            } elseif ($Path -like "*.pfx") {
                Write-Host "  PFX file detected - checking..." -ForegroundColor Cyan
                $pfxPass = Read-Host "Enter PFX password" -AsSecureString
                $cert = Get-PfxCertificate -FilePath $Path -Password $pfxPass

                Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Cyan
                Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor Cyan

                return $true
            }
        } catch {
            Write-Host "✗ Error reading certificate: $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "✗ Certificate file not found: $Path" -ForegroundColor Red
        return $false
    }
}

# Function to test remote HTTPS connection
function Test-RemoteHTTPS {
    param(
        [string]$Hostname,
        [int]$Port
    )

    Write-Host ""
    Write-Host "Testing remote HTTPS connection to ${Hostname}:${Port}..." -ForegroundColor Yellow

    # Test DNS resolution
    try {
        $dnsResult = Resolve-DnsName -Name $Hostname -ErrorAction Stop
        Write-Host "✓ DNS resolution successful:" -ForegroundColor Green
        $dnsResult | ForEach-Object {
            Write-Host "  $($_.Name) -> $($_.IPAddress)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "✗ DNS resolution failed for $Hostname" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        return $false
    }

    # Test TCP connectivity
    Write-Host "Testing TCP connection..." -ForegroundColor Yellow
    $tcpTest = Test-NetConnection -ComputerName $Hostname -Port $Port -WarningAction SilentlyContinue

    if ($tcpTest.TcpTestSucceeded) {
        Write-Host "✓ TCP connection successful" -ForegroundColor Green
    } else {
        Write-Host "✗ Cannot connect to ${Hostname}:${Port}" -ForegroundColor Red
        Write-Host "  Check firewall rules and ensure service is running" -ForegroundColor Yellow
        return $false
    }

    # Test HTTPS certificate
    Write-Host "Retrieving SSL certificate..." -ForegroundColor Yellow

    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient($Hostname, $Port)
        $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream(), $false,
            { param($sender, $certificate, $chain, $errors)
                # Accept all certs for testing (don't do this in production)
                return $true
            })

        $sslStream.AuthenticateAsClient($Hostname)
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($sslStream.RemoteCertificate)

        Write-Host "✓ SSL certificate retrieved successfully" -ForegroundColor Green
        Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Cyan
        Write-Host "  Issuer: $($cert.Issuer)" -ForegroundColor Cyan
        Write-Host "  Valid From: $($cert.NotBefore)" -ForegroundColor Cyan
        Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor Cyan
        Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan

        # Check if cert matches hostname
        $cn = $cert.Subject -replace ".*CN=([^,]+).*", '$1'
        if ($cn -eq $Hostname) {
            Write-Host "✓ Certificate CN matches hostname" -ForegroundColor Green
        } else {
            # Check SAN entries
            $sanExt = $cert.Extensions | Where-Object { $_.Oid.Value -eq "2.5.29.17" }
            if ($sanExt -and $sanExt.Format(0) -match $Hostname) {
                Write-Host "✓ Hostname found in SAN entries" -ForegroundColor Green
            } else {
                Write-Warning "Certificate CN ($cn) doesn't match hostname ($Hostname)"
            }
        }

        # Check certificate chain
        Write-Host "Checking certificate chain..." -ForegroundColor Yellow
        $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
        $chain.ChainPolicy.RevocationMode = [System.Security.Cryptography.X509Certificates.X509RevocationMode]::NoCheck

        if ($chain.Build($cert)) {
            Write-Host "✓ Certificate chain is valid" -ForegroundColor Green
            $chain.ChainElements | ForEach-Object {
                Write-Host "  - $($_.Certificate.Subject)" -ForegroundColor Gray
            }
        } else {
            Write-Warning "Certificate chain validation failed"
            $chain.ChainStatus | ForEach-Object {
                Write-Host "  - $($_.Status): $($_.StatusInformation)" -ForegroundColor Yellow
            }
        }

        $tcpClient.Close()
        return $true

    } catch {
        Write-Host "✗ SSL connection failed: $_" -ForegroundColor Red
        return $false
    }
}

# Function to test with curl
function Test-WithCurl {
    param([string]$Url)

    Write-Host ""
    Write-Host "Testing with curl..." -ForegroundColor Yellow

    # Check if curl is available
    if (Get-Command curl -ErrorAction SilentlyContinue) {
        $curlResult = curl -I -s -o NUL -w "%{http_code}" $Url 2>$null

        if ($curlResult -eq "200") {
            Write-Host "✓ CURL test successful (HTTP 200)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ CURL test failed (HTTP $curlResult)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "  Curl not available, skipping" -ForegroundColor Gray
        return $null
    }
}

# Function to test with PowerShell WebRequest
function Test-WithWebRequest {
    param([string]$Url)

    Write-Host ""
    Write-Host "Testing with PowerShell WebRequest..." -ForegroundColor Yellow

    try {
        # Skip certificate validation for testing
        if ($PSVersionTable.PSVersion.Major -ge 6) {
            $response = Invoke-WebRequest -Uri $Url -SkipCertificateCheck -UseBasicParsing -TimeoutSec 10
        } else {
            # For older PowerShell versions
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $null
        }

        if ($response.StatusCode -eq 200) {
            Write-Host "✓ WebRequest successful (HTTP 200)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ WebRequest failed (HTTP $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "✗ WebRequest failed: $_" -ForegroundColor Red
        return $false
    }
}

# Main test execution
Write-Host "Test Configuration:" -ForegroundColor Cyan
Write-Host "  Target: ${Hostname}:${Port}"
Write-Host "  Certificate: $CertPath"
Write-Host ""

# Test 1: Local certificate file
if ($TestLocal -or (Test-Path $CertPath)) {
    $result = Test-CertificateFile -Path $CertPath
    $testResults += @{
        Test = "Local Certificate"
        Result = $result
    }
    if (!$result) { $hasErrors = $true }
}

# Test 2: Remote HTTPS connection
if ($TestRemote) {
    $result = Test-RemoteHTTPS -Hostname $Hostname -Port $Port
    $testResults += @{
        Test = "Remote HTTPS"
        Result = $result
    }
    if (!$result) { $hasErrors = $true }

    # Test 3: HTTP client tests
    $httpsUrl = "https://${Hostname}:${Port}"

    $curlResult = Test-WithCurl -Url $httpsUrl
    if ($null -ne $curlResult) {
        $testResults += @{
            Test = "CURL Test"
            Result = $curlResult
        }
        if (!$curlResult) { $hasErrors = $true }
    }

    $webResult = Test-WithWebRequest -Url "$httpsUrl/health"
    $testResults += @{
        Test = "WebRequest Test"
        Result = $webResult
    }
    if (!$webResult) { $hasErrors = $true }
}

# OpenSSL test (if available)
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    Write-Host ""
    Write-Host "Running OpenSSL diagnostics..." -ForegroundColor Yellow

    $opensslCmd = "echo | openssl s_client -connect ${Hostname}:${Port} -servername $Hostname 2>/dev/null"

    if ($Verbose) {
        Write-Host "  Command: $opensslCmd" -ForegroundColor Gray
        Invoke-Expression $opensslCmd
    } else {
        $opensslResult = Invoke-Expression "$opensslCmd | openssl x509 -noout -dates"
        Write-Host $opensslResult -ForegroundColor Cyan
    }
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "         Test Summary                 " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$testResults | ForEach-Object {
    $status = if ($_.Result) { "✓ PASS" } else { "✗ FAIL" }
    $color = if ($_.Result) { "Green" } else { "Red" }
    Write-Host "$status - $($_.Test)" -ForegroundColor $color
}

Write-Host ""
if ($hasErrors) {
    Write-Host "⚠ Some tests failed. Review the output above for details." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  - Ensure certificate files are in PEM format"
    Write-Host "  - Verify DNS resolution for $Hostname"
    Write-Host "  - Check firewall allows port $Port"
    Write-Host "  - Confirm Docker services are running"
    Write-Host "  - Verify certificate includes correct SANs"
    exit 1
} else {
    Write-Host "✅ All tests passed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your certificate is properly configured for:" -ForegroundColor Cyan
    Write-Host "  https://$Hostname" -ForegroundColor Cyan
    exit 0
}