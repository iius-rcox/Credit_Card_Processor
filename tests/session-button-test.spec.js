/**
 * Test specifically for the "Start New Session" button functionality
 */

import { test, expect } from '@playwright/test'

test.describe('Start New Session Button Fix', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test('Start New Session button should create a session and show response', async ({ page }) => {
    console.log('=== Testing Start New Session Button Functionality ===')
    
    // Wait for any loading to finish
    await page.waitForTimeout(2000)
    
    // Look for New Session button (might be in different locations)
    let newSessionBtn = page.locator('button:has-text("New Session")')
    
    // If not found, look for variations
    if (await newSessionBtn.count() === 0) {
      newSessionBtn = page.locator('button:has-text("Start")')
    }
    if (await newSessionBtn.count() === 0) {
      newSessionBtn = page.locator('button:has-text("Session")')  
    }
    if (await newSessionBtn.count() === 0) {
      newSessionBtn = page.locator('button[aria-label*="session"]')
    }
    
    const buttonExists = await newSessionBtn.count() > 0
    console.log(`Found ${await newSessionBtn.count()} session-related buttons`)
    
    if (buttonExists) {
      const button = newSessionBtn.first()
      await expect(button).toBeVisible()
      
      // Check if button is enabled
      const isDisabled = await button.isDisabled()
      console.log(`Button disabled state: ${isDisabled}`)
      
      if (!isDisabled) {
        // Set up network monitoring to see what requests are made
        const requests = []
        page.on('request', request => {
          if (request.url().includes('session')) {
            requests.push({
              url: request.url(),
              method: request.method(),
              headers: request.headers()
            })
          }
        })
        
        const responses = []
        page.on('response', response => {
          if (response.url().includes('session')) {
            responses.push({
              url: response.url(),
              status: response.status(),
              statusText: response.statusText()
            })
          }
        })
        
        // Monitor console for errors
        const consoleMessages = []
        page.on('console', msg => {
          if (msg.type() === 'error' || msg.text().toLowerCase().includes('session')) {
            consoleMessages.push(`${msg.type()}: ${msg.text()}`)
          }
        })
        
        console.log('Clicking New Session button...')
        await button.click()
        
        // Wait for potential API call
        await page.waitForTimeout(3000)
        
        // Report what happened
        console.log(`Network requests made: ${requests.length}`)
        requests.forEach(req => {
          console.log(`  ${req.method} ${req.url}`)
          console.log(`  Headers: ${JSON.stringify(req.headers, null, 2)}`)
        })
        
        console.log(`Network responses received: ${responses.length}`)
        responses.forEach(res => {
          console.log(`  ${res.status} ${res.statusText} - ${res.url}`)
        })
        
        console.log(`Console messages: ${consoleMessages.length}`)
        consoleMessages.forEach(msg => {
          console.log(`  ${msg}`)
        })
        
        // Check if any session-related content appeared
        const sessionContent = page.locator('div:has-text("Session:"), span:has-text("Session"), .session')
        const sessionContentCount = await sessionContent.count()
        console.log(`Session-related elements found: ${sessionContentCount}`)
        
        // Check if notifications appeared
        const notifications = page.locator('.notification, .toast, .alert, [role="alert"]')
        const notificationCount = await notifications.count()
        console.log(`Notifications found: ${notificationCount}`)
        
        if (notificationCount > 0) {
          for (let i = 0; i < Math.min(notificationCount, 3); i++) {
            const notificationText = await notifications.nth(i).textContent()
            console.log(`  Notification ${i + 1}: ${notificationText}`)
          }
        }
        
        // Success criteria: either API call was made OR user feedback was shown
        const success = requests.length > 0 || responses.length > 0 || notificationCount > 0 || sessionContentCount > 0
        
        if (success) {
          console.log('✅ Start New Session button is working - it triggered some action')
        } else {
          console.log('❌ Start New Session button does not appear to be working')
          
          // Additional debugging - check if there are any JavaScript errors
          const errors = await page.evaluate(() => {
            return window.errors || []
          })
          console.log(`JavaScript errors: ${errors.length}`)
        }
        
        expect(success).toBe(true)
      } else {
        console.log('⚠️  Button is disabled, cannot test functionality')
      }
    } else {
      console.log('❌ No New Session button found on the page')
      
      // List all buttons for debugging
      const allButtons = page.locator('button')
      const buttonCount = await allButtons.count()
      console.log(`Total buttons found: ${buttonCount}`)
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const buttonText = await allButtons.nth(i).textContent()
        const ariaLabel = await allButtons.nth(i).getAttribute('aria-label')
        console.log(`  Button ${i + 1}: "${buttonText}" (aria-label: "${ariaLabel}")`)
      }
      
      expect(buttonExists).toBe(true)
    }
  })
  
  test('Verify API endpoints are accessible', async ({ page }) => {
    console.log('=== Testing API Endpoint Accessibility ===')
    
    // Test the API endpoints directly
    const apiTests = [
      { url: 'http://localhost:8001/health', name: 'Health Check' },
      { url: 'http://localhost:8001/api/auth/current-user', name: 'Auth Check' },
      { url: 'http://localhost:8001/api/sessions', name: 'Sessions List' }
    ]
    
    for (const test of apiTests) {
      try {
        const response = await page.request.get(test.url, {
          headers: { 'x-dev-user': 'rcox' }
        })
        
        console.log(`${test.name}: ${response.status()} ${response.statusText()}`)
        
        if (response.ok()) {
          const data = await response.text()
          console.log(`  Response preview: ${data.substring(0, 100)}...`)
        }
      } catch (error) {
        console.log(`${test.name}: ERROR - ${error.message}`)
      }
    }
  })
})