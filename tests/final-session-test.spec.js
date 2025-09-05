/**
 * Final test for Start New Session button functionality
 */

import { test, expect } from '@playwright/test'

test('Start New Session button should work on development server', async ({ page }) => {
  console.log('=== Final Test: Start New Session Button ===')
  
  const consoleMessages = []
  const errors = []
  const networkRequests = []
  
  // Capture all console output
  page.on('console', msg => {
    const message = `[${msg.type()}] ${msg.text()}`
    consoleMessages.push(message)
    console.log(message)
  })
  
  page.on('pageerror', error => {
    const message = `[PAGE ERROR] ${error.message}`
    errors.push(message)
    console.log(message)
  })
  
  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      networkRequests.push({
        url: request.url(),
        method: request.method()
      })
      console.log(`[NETWORK] ${request.method()} ${request.url()}`)
    }
  })
  
  await page.goto('http://localhost:3002')  // Updated dev server port
  await page.waitForLoadState('networkidle')
  
  // Wait for Vue to fully initialize
  await page.waitForTimeout(5000)
  
  console.log(`\n🔍 Page loaded with ${consoleMessages.length} console messages`)
  console.log(`🔍 ${errors.length} errors detected`)
  console.log(`🔍 ${networkRequests.length} API requests made during load`)
  
  // Find the Start New Session button (click the first one if there are multiple)
  const button = page.locator('button:has-text("Start New Session")').first()
  const buttonExists = await button.count() > 0
  console.log(`\n🔘 Start New Session button found: ${buttonExists}`)
  
  if (buttonExists) {
    const isVisible = await button.isVisible()
    const isEnabled = !(await button.isDisabled())
    console.log(`🔘 Button visible: ${isVisible}`)
    console.log(`🔘 Button enabled: ${isEnabled}`)
    
    if (isVisible && isEnabled) {
      console.log('\n🖱️  Clicking Start New Session button...')
      
      // Clear previous messages to see what happens after click
      const preClickMessageCount = consoleMessages.length
      const preClickRequestCount = networkRequests.length
      
      await button.click()
      await page.waitForTimeout(5000)  // Wait for async operations
      
      const postClickMessages = consoleMessages.slice(preClickMessageCount)
      const postClickRequests = networkRequests.slice(preClickRequestCount)
      
      console.log(`\n📊 Post-click Results:`)
      console.log(`📊 New console messages: ${postClickMessages.length}`)
      console.log(`📊 New API requests: ${postClickRequests.length}`)
      
      if (postClickMessages.length > 0) {
        console.log('\n💬 New Console Messages:')
        postClickMessages.forEach(msg => console.log(`  ${msg}`))
      }
      
      if (postClickRequests.length > 0) {
        console.log('\n🌐 New API Requests:')
        postClickRequests.forEach(req => console.log(`  ${req.method} ${req.url}`))
      }
      
      // Check for success indicators
      const hasDebugMessages = postClickMessages.some(msg => msg.includes('handleNewSession') || msg.includes('🚀'))
      const hasApiCalls = postClickRequests.length > 0
      const hasSuccessMessage = postClickMessages.some(msg => msg.includes('Session created') || msg.includes('✅'))
      
      console.log(`\n🎯 Success Indicators:`)
      console.log(`🎯 Debug messages found: ${hasDebugMessages}`)
      console.log(`🎯 API calls made: ${hasApiCalls}`)
      console.log(`🎯 Success messages: ${hasSuccessMessage}`)
      
      const buttonWorking = hasDebugMessages || hasApiCalls || hasSuccessMessage
      console.log(`\n✅ BUTTON WORKING: ${buttonWorking}`)
      
      if (buttonWorking) {
        console.log('🎉 SUCCESS: Start New Session button is functioning correctly!')
      } else {
        console.log('❌ FAILURE: Button click did not produce expected results')
        
        // Additional debugging
        const pageContent = await page.content()
        const hasSessionContent = pageContent.includes('session_id') || pageContent.includes('Session:')
        console.log(`📄 Page has session content: ${hasSessionContent}`)
      }
      
      expect(buttonWorking).toBe(true)
      
    } else {
      console.log('❌ Button not clickable (not visible or disabled)')
      expect(false).toBe(true)  // Fail the test
    }
  } else {
    console.log('❌ Start New Session button not found')
    
    // Debug: List all buttons
    const allButtons = page.locator('button')
    const buttonCount = await allButtons.count()
    console.log(`\n🔍 Found ${buttonCount} total buttons:`)
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const buttonText = await allButtons.nth(i).textContent()
      const ariaLabel = await allButtons.nth(i).getAttribute('aria-label')
      console.log(`  ${i + 1}. "${buttonText}" (aria-label: "${ariaLabel}")`)
    }
    
    expect(buttonExists).toBe(true)
  }
})