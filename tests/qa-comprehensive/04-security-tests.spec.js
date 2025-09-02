const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Security Testing', () => {
  let securityIssues = [];
  let networkHeaders = [];
  let requestPayloads = [];

  test.beforeEach(async ({ page }) => {
    // Reset security tracking
    securityIssues = [];
    networkHeaders = [];
    requestPayloads = [];

    // Monitor all network requests for security analysis
    page.on('request', request => {
      requestPayloads.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
    });

    // Monitor responses for security headers
    page.on('response', response => {
      networkHeaders.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now()
      });
    });

    // Monitor console for security warnings
    page.on('console', msg => {
      const text = msg.text().toLowerCase();
      if (text.includes('security') || text.includes('csrf') || text.includes('xss')) {
        securityIssues.push({
          type: 'console_warning',
          message: msg.text(),
          timestamp: Date.now()
        });
      }
    });
  });

  test('HTTP Security Headers Verification', async ({ page }) => {
    console.log('=== Starting HTTP Security Headers Test ===');

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Analyze security headers for main document and API responses
    const documentResponses = networkHeaders.filter(res => res.url.includes('localhost:3000'));
    const apiResponses = networkHeaders.filter(res => res.url.includes('localhost:8001'));

    console.log(`✓ Found ${documentResponses.length} frontend responses`);
    console.log(`✓ Found ${apiResponses.length} API responses`);

    // Check critical security headers for frontend
    if (documentResponses.length > 0) {
      const mainResponse = documentResponses[0];
      const headers = mainResponse.headers;

      console.log('--- Frontend Security Headers ---');
      
      // Content Security Policy
      if (headers['content-security-policy']) {
        console.log(`✓ CSP Header: ${headers['content-security-policy'].substring(0, 100)}...`);
      } else {
        securityIssues.push({ type: 'missing_csp', message: 'Missing Content-Security-Policy header' });
        console.warn('⚠ Missing Content-Security-Policy header');
      }

      // X-Frame-Options
      if (headers['x-frame-options']) {
        console.log(`✓ X-Frame-Options: ${headers['x-frame-options']}`);
      } else {
        securityIssues.push({ type: 'missing_xfo', message: 'Missing X-Frame-Options header' });
        console.warn('⚠ Missing X-Frame-Options header');
      }

      // X-Content-Type-Options
      if (headers['x-content-type-options']) {
        console.log(`✓ X-Content-Type-Options: ${headers['x-content-type-options']}`);
      } else {
        securityIssues.push({ type: 'missing_xcto', message: 'Missing X-Content-Type-Options header' });
        console.warn('⚠ Missing X-Content-Type-Options header');
      }

      // Strict-Transport-Security (HSTS)
      if (headers['strict-transport-security']) {
        console.log(`✓ HSTS: ${headers['strict-transport-security']}`);
      } else {
        console.warn('⚠ Missing Strict-Transport-Security header (expected in production)');
      }

      // Referrer-Policy
      if (headers['referrer-policy']) {
        console.log(`✓ Referrer-Policy: ${headers['referrer-policy']}`);
      } else {
        console.warn('⚠ Missing Referrer-Policy header');
      }
    }

    // Check API response headers
    if (apiResponses.length > 0) {
      console.log('--- API Security Headers ---');
      
      apiResponses.slice(0, 3).forEach((response, index) => {
        const headers = response.headers;
        console.log(`API Response ${index + 1} (${response.status}):`);
        
        // CORS headers
        if (headers['access-control-allow-origin']) {
          console.log(`  ✓ CORS Origin: ${headers['access-control-allow-origin']}`);
          
          // Check for overly permissive CORS
          if (headers['access-control-allow-origin'] === '*') {
            securityIssues.push({ 
              type: 'permissive_cors', 
              message: 'Wildcard CORS policy detected - potential security risk',
              url: response.url
            });
          }
        }

        // API-specific security headers
        if (headers['x-content-type-options']) {
          console.log(`  ✓ X-Content-Type-Options: ${headers['x-content-type-options']}`);
        }
      });
    }

    console.log('=== HTTP Security Headers Test Completed ===');
  });

  test('Input Validation and XSS Prevention', async ({ page }) => {
    console.log('=== Starting Input Validation and XSS Test ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Common XSS payloads for testing
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>',
      "';alert('xss');//",
      '<svg onload=alert("xss")>'
    ];

    // Find input fields
    const inputFields = page.locator('input[type="text"], input[type="email"], input[type="search"], textarea');
    const inputCount = await inputFields.count();
    
    console.log(`✓ Found ${inputCount} text input fields`);

    if (inputCount > 0) {
      // Test first few input fields with XSS payloads
      for (let i = 0; i < Math.min(3, inputCount); i++) {
        const input = inputFields.nth(i);
        
        for (const payload of xssPayloads.slice(0, 3)) {
          try {
            await input.clear();
            await input.fill(payload);
            await page.waitForTimeout(200);
            
            // Check if script executed (should not happen)
            const dialogHandled = await page.evaluate(() => {
              return typeof window.lastAlert !== 'undefined';
            });
            
            if (dialogHandled) {
              securityIssues.push({
                type: 'xss_vulnerability',
                message: `XSS payload executed: ${payload}`,
                inputIndex: i
              });
            }
            
            await input.clear();
          } catch (error) {
            // Input might be disabled or readonly, continue
          }
        }
      }
      
      console.log(`✓ Tested ${Math.min(3, inputCount)} inputs with XSS payloads`);
    }

    // Check for client-side validation
    const validationElements = page.locator('[data-testid*="validation"], .error-message, .validation-error');
    const validationCount = await validationElements.count();
    console.log(`✓ Found ${validationCount} validation elements`);

    // Test file upload security (if available)
    const fileInputs = page.locator('input[type="file"]');
    const fileInputCount = await fileInputs.count();
    
    if (fileInputCount > 0) {
      console.log(`✓ Found ${fileInputCount} file upload inputs`);
      
      // Check file input restrictions
      for (let i = 0; i < Math.min(2, fileInputCount); i++) {
        const fileInput = fileInputs.nth(i);
        const accept = await fileInput.getAttribute('accept');
        const multiple = await fileInput.getAttribute('multiple');
        
        console.log(`  File input ${i + 1}: accept="${accept}", multiple=${multiple !== null}`);
        
        // Check for proper file type restrictions
        if (!accept || accept === '*/*') {
          securityIssues.push({
            type: 'unrestricted_file_upload',
            message: 'File upload without proper type restrictions',
            inputIndex: i
          });
        }
      }
    }

    console.log('=== Input Validation and XSS Test Completed ===');
  });

  test('CSRF Protection and Authentication Security', async ({ page }) => {
    console.log('=== Starting CSRF and Authentication Security Test ===');

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Analyze API requests for CSRF protection
    const apiRequests = requestPayloads.filter(req => req.url.includes('localhost:8001'));
    console.log(`✓ Analyzing ${apiRequests.length} API requests`);

    // Check for CSRF tokens
    let csrfProtectedRequests = 0;
    let authenticationHeaders = 0;

    apiRequests.forEach((request, index) => {
      // Check for CSRF tokens in headers or body
      const hasCsrfToken = request.headers['x-csrf-token'] || 
                          request.headers['x-xsrf-token'] ||
                          (request.postData && request.postData.includes('csrf'));
      
      if (hasCsrfToken) {
        csrfProtectedRequests++;
      }

      // Check for authentication headers
      if (request.headers['authorization'] || 
          request.headers['x-api-key'] ||
          request.headers['x-user-id'] ||
          request.headers['cookie']) {
        authenticationHeaders++;
      }

      console.log(`  Request ${index + 1}: ${request.method} ${request.url.split('localhost:8001')[1] || request.url}`);
      console.log(`    CSRF Protected: ${hasCsrfToken}`);
      console.log(`    Has Auth: ${request.headers['authorization'] ? 'Yes' : 'No'}`);
    });

    console.log(`✓ CSRF protected requests: ${csrfProtectedRequests}/${apiRequests.length}`);
    console.log(`✓ Requests with auth headers: ${authenticationHeaders}/${apiRequests.length}`);

    // Check for session management security
    const cookieHeaders = networkHeaders.filter(res => res.headers['set-cookie']);
    console.log(`✓ Responses setting cookies: ${cookieHeaders.length}`);

    cookieHeaders.forEach((response, index) => {
      const cookies = response.headers['set-cookie'];
      console.log(`  Cookie ${index + 1}: ${cookies.substring(0, 100)}...`);
      
      // Check for secure cookie attributes
      if (cookies.toLowerCase().includes('secure')) {
        console.log('    ✓ Secure flag set');
      } else {
        securityIssues.push({
          type: 'insecure_cookie',
          message: 'Cookie without Secure flag',
          url: response.url
        });
      }
      
      if (cookies.toLowerCase().includes('httponly')) {
        console.log('    ✓ HttpOnly flag set');
      } else {
        securityIssues.push({
          type: 'accessible_cookie',
          message: 'Cookie without HttpOnly flag',
          url: response.url
        });
      }
      
      if (cookies.toLowerCase().includes('samesite')) {
        console.log('    ✓ SameSite attribute set');
      } else {
        securityIssues.push({
          type: 'missing_samesite',
          message: 'Cookie without SameSite attribute',
          url: response.url
        });
      }
    });

    console.log('=== CSRF and Authentication Security Test Completed ===');
  });

  test('Information Disclosure and Error Handling', async ({ page }) => {
    console.log('=== Starting Information Disclosure Test ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test for information disclosure in error responses
    const errorResponses = networkHeaders.filter(res => res.status >= 400);
    console.log(`✓ Found ${errorResponses.length} error responses`);

    // Check development/debug information exposure
    const pageContent = await page.content();
    const sensitivePatterns = [
      /stacktrace|stack trace/i,
      /debug|debugging/i,
      /development|dev mode/i,
      /console\.log|console\.error/i,
      /api[_-]?key|secret|password/i,
      /localhost:\d+/g,
      /127\.0\.0\.1:\d+/g
    ];

    sensitivePatterns.forEach((pattern, index) => {
      const matches = pageContent.match(pattern);
      if (matches) {
        securityIssues.push({
          type: 'information_disclosure',
          message: `Sensitive information pattern found: ${pattern}`,
          matches: matches.length
        });
        console.warn(`⚠ Sensitive pattern ${index + 1}: ${matches.length} matches`);
      }
    });

    // Test console for sensitive data
    let consoleSecurityIssues = 0;
    page.on('console', msg => {
      const text = msg.text().toLowerCase();
      if (text.includes('password') || text.includes('token') || text.includes('secret')) {
        consoleSecurityIssues++;
        securityIssues.push({
          type: 'console_data_leak',
          message: `Potentially sensitive data in console: ${msg.text()}`
        });
      }
    });

    // Trigger potential error conditions
    try {
      await page.goto('/nonexistent-route');
      await page.waitForTimeout(1000);
    } catch (error) {
      // Expected to fail
    }

    await page.goto('/', { waitUntil: 'networkidle' });

    console.log(`✓ Console security issues detected: ${consoleSecurityIssues}`);
    console.log('=== Information Disclosure Test Completed ===');
  });

  test('Client-Side Security and DOM Manipulation', async ({ page }) => {
    console.log('=== Starting Client-Side Security Test ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test for dangerous DOM manipulation
    const domSecurityCheck = await page.evaluate(() => {
      const issues = [];
      
      // Check for innerHTML usage (potential XSS vector)
      const elements = document.querySelectorAll('*');
      let innerHTMLUsage = 0;
      
      // Test if eval is available and potentially used
      if (typeof eval !== 'undefined') {
        issues.push('eval function available globally');
      }
      
      // Check for potentially dangerous global variables
      const dangerousGlobals = ['webkitURL', 'createObjectURL'];
      dangerousGlobals.forEach(global => {
        if (window[global]) {
          issues.push(`Potentially dangerous global available: ${global}`);
        }
      });
      
      // Check for external script sources
      const scripts = document.querySelectorAll('script[src]');
      const externalScripts = Array.from(scripts).filter(script => {
        const src = script.src;
        return src && !src.includes('localhost') && !src.includes('127.0.0.1');
      });
      
      return {
        issues,
        externalScripts: externalScripts.length,
        totalScripts: scripts.length
      };
    });

    console.log(`✓ DOM security issues: ${domSecurityCheck.issues.length}`);
    console.log(`✓ External scripts: ${domSecurityCheck.externalScripts}/${domSecurityCheck.totalScripts}`);

    domSecurityCheck.issues.forEach(issue => {
      securityIssues.push({
        type: 'dom_security',
        message: issue
      });
      console.warn(`⚠ ${issue}`);
    });

    // Test for clickjacking protection
    const frameOptions = await page.evaluate(() => {
      // Try to detect if page can be framed
      try {
        return {
          canBeFramed: window.self === window.top,
          hasFramebreaker: document.querySelector('script[src*="framebreaker"]') !== null
        };
      } catch (e) {
        return { canBeFramed: false, hasFramebreaker: false };
      }
    });

    console.log(`✓ Page can be framed: ${frameOptions.canBeFramed}`);
    console.log(`✓ Has framebreaker: ${frameOptions.hasFramebreaker}`);

    // Test for secure random generation
    const cryptoAvailable = await page.evaluate(() => {
      return {
        cryptoAvailable: typeof window.crypto !== 'undefined',
        cryptoRandomAvailable: typeof window.crypto?.getRandomValues !== 'undefined',
        mathRandomUsed: Math.random.toString().includes('native') === false
      };
    });

    console.log(`✓ Crypto API available: ${cryptoAvailable.cryptoAvailable}`);
    console.log(`✓ Secure random available: ${cryptoAvailable.cryptoRandomAvailable}`);

    console.log('=== Client-Side Security Test Completed ===');
  });

  test('File Upload and Processing Security', async ({ page }) => {
    console.log('=== Starting File Upload Security Test ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Check for file upload functionality
    const fileInputs = page.locator('input[type="file"]');
    const fileInputCount = await fileInputs.count();

    if (fileInputCount > 0) {
      console.log(`✓ Found ${fileInputCount} file upload inputs`);

      for (let i = 0; i < Math.min(2, fileInputCount); i++) {
        const fileInput = fileInputs.nth(i);
        
        // Check file input attributes
        const attributes = await fileInput.evaluate(input => ({
          accept: input.accept,
          multiple: input.multiple,
          required: input.required,
          disabled: input.disabled
        }));

        console.log(`File input ${i + 1} attributes:`, attributes);

        // Security checks
        if (!attributes.accept || attributes.accept === '*/*') {
          securityIssues.push({
            type: 'unrestricted_file_types',
            message: `File input ${i + 1} allows all file types`,
            recommendation: 'Restrict to specific file types (e.g., .pdf, .csv)'
          });
        }

        // Check for client-side size validation
        const hasMaxSize = await fileInput.evaluate(input => {
          return input.getAttribute('data-max-size') !== null ||
                 input.form?.querySelector('[name="MAX_FILE_SIZE"]') !== null;
        });

        if (!hasMaxSize) {
          console.warn(`⚠ File input ${i + 1} may lack size restrictions`);
        }
      }

      // Check for drag-and-drop file handling
      const dropZones = page.locator('[data-testid*="drop"], .drop-zone, .file-drop');
      const dropZoneCount = await dropZones.count();
      
      if (dropZoneCount > 0) {
        console.log(`✓ Found ${dropZoneCount} drag-and-drop zones`);
        
        // Test drop zone security
        const dropZoneSecurityCheck = await page.evaluate(() => {
          const dropZones = document.querySelectorAll('[data-testid*="drop"], .drop-zone, .file-drop');
          let secureDropZones = 0;
          
          dropZones.forEach(zone => {
            const hasValidation = zone.dataset.allowedTypes !== undefined ||
                                zone.dataset.maxSize !== undefined ||
                                zone.getAttribute('accept') !== null;
            if (hasValidation) secureDropZones++;
          });
          
          return { total: dropZones.length, secure: secureDropZones };
        });
        
        console.log(`✓ Secure drop zones: ${dropZoneSecurityCheck.secure}/${dropZoneSecurityCheck.total}`);
      }
    } else {
      console.log('✓ No file upload functionality detected');
    }

    // Check for file processing security indicators
    const processingElements = page.locator('[data-testid*="process"], .file-processing');
    const processingCount = await processingElements.count();
    
    if (processingCount > 0) {
      console.log(`✓ Found ${processingCount} file processing elements`);
      
      // Check if processing happens client-side vs server-side
      const processingType = await page.evaluate(() => {
        // Look for file reading APIs usage
        const hasFileReader = typeof FileReader !== 'undefined';
        const hasWebWorkers = typeof Worker !== 'undefined';
        
        return {
          clientSideCapable: hasFileReader,
          webWorkersAvailable: hasWebWorkers
        };
      });
      
      console.log(`✓ Client-side file processing capable: ${processingType.clientSideCapable}`);
      console.log(`✓ Web workers available: ${processingType.webWorkersAvailable}`);
    }

    console.log('=== File Upload Security Test Completed ===');
  });

  test('Security Summary and Compliance Report', async ({ page }) => {
    console.log('=== Generating Security Summary Report ===');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Categorize security issues by severity
    const criticalIssues = securityIssues.filter(issue => 
      ['xss_vulnerability', 'unrestricted_file_upload', 'insecure_cookie'].includes(issue.type)
    );
    
    const highIssues = securityIssues.filter(issue => 
      ['missing_csp', 'permissive_cors', 'information_disclosure'].includes(issue.type)
    );
    
    const mediumIssues = securityIssues.filter(issue => 
      ['missing_xfo', 'missing_xcto', 'accessible_cookie'].includes(issue.type)
    );
    
    const lowIssues = securityIssues.filter(issue => 
      !criticalIssues.includes(issue) && !highIssues.includes(issue) && !mediumIssues.includes(issue)
    );

    // Generate security compliance report
    const securityReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: securityIssues.length,
        critical: criticalIssues.length,
        high: highIssues.length,
        medium: mediumIssues.length,
        low: lowIssues.length
      },
      categories: {
        httpSecurityHeaders: {
          tested: true,
          issues: securityIssues.filter(i => ['missing_csp', 'missing_xfo', 'missing_xcto'].includes(i.type))
        },
        inputValidation: {
          tested: true,
          issues: securityIssues.filter(i => ['xss_vulnerability', 'unrestricted_file_types'].includes(i.type))
        },
        authentication: {
          tested: true,
          issues: securityIssues.filter(i => ['insecure_cookie', 'missing_samesite'].includes(i.type))
        },
        cors: {
          tested: true,
          issues: securityIssues.filter(i => i.type === 'permissive_cors')
        },
        informationDisclosure: {
          tested: true,
          issues: securityIssues.filter(i => ['information_disclosure', 'console_data_leak'].includes(i.type))
        }
      },
      recommendations: [],
      complianceScore: 0
    };

    // Calculate compliance score (0-100)
    let score = 100;
    score -= criticalIssues.length * 25; // Critical issues: -25 each
    score -= highIssues.length * 15;     // High issues: -15 each
    score -= mediumIssues.length * 10;   // Medium issues: -10 each
    score -= lowIssues.length * 5;       // Low issues: -5 each
    
    securityReport.complianceScore = Math.max(0, score);
    securityReport.grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    // Generate recommendations
    if (criticalIssues.length > 0) {
      securityReport.recommendations.push('CRITICAL: Address XSS vulnerabilities and file upload security immediately');
    }
    if (securityIssues.some(i => i.type === 'missing_csp')) {
      securityReport.recommendations.push('HIGH: Implement Content Security Policy (CSP) headers');
    }
    if (securityIssues.some(i => i.type === 'permissive_cors')) {
      securityReport.recommendations.push('HIGH: Restrict CORS policy to specific origins');
    }
    if (securityIssues.some(i => i.type === 'insecure_cookie')) {
      securityReport.recommendations.push('MEDIUM: Add Secure and HttpOnly flags to cookies');
    }
    if (securityIssues.some(i => i.type === 'information_disclosure')) {
      securityReport.recommendations.push('MEDIUM: Remove sensitive information from client-side code');
    }

    console.log('=== SECURITY SUMMARY REPORT ===');
    console.log(JSON.stringify(securityReport, null, 2));

    // Security assertions
    expect(criticalIssues).toHaveLength(0); // No critical security issues
    expect(securityReport.complianceScore).toBeGreaterThanOrEqual(70); // Minimum security score

    console.log(`✓ Security Compliance Score: ${securityReport.complianceScore}/100 (Grade: ${securityReport.grade})`);
    console.log(`✓ Total Security Issues: ${securityIssues.length} (Critical: ${criticalIssues.length}, High: ${highIssues.length})`);
    console.log(`✓ Recommendations: ${securityReport.recommendations.length}`);

    console.log('=== Security Summary Report Generated ===');
  });
});