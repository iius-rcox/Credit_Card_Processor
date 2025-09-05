/**
 * Test specifically for the PRODUCTION deployment on port 3000
 */

import { test, expect } from '@playwright/test'

test('Start New Session button on PRODUCTION (port 3000)', async ({ page }) => {
  console.log('=== Testing PRODUCTION Server (Port 3000) ===')
  
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
  
  await page.goto('http://localhost:3000')  // PRODUCTION port
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
    const buttonText = await button.textContent()
    console.log(`🔘 Button visible: ${isVisible}`)
    console.log(`🔘 Button enabled: ${isEnabled}`)
    console.log(`🔘 Button text: "${buttonText}"`)
    
    if (isVisible && isEnabled) {
      console.log('\n🖱️  Clicking Start New Session button on PRODUCTION...')
      
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
      console.log(`\n✅ BUTTON WORKING ON PRODUCTION: ${buttonWorking}`)
      
      if (buttonWorking) {
        console.log('🎉 SUCCESS: Start New Session button is working on PRODUCTION!')
      } else {
        console.log('❌ FAILURE: Button not working on production deployment')
        
        // Check if page content changed
        const pageText = await page.textContent('body')
        const hasNewSession = pageText.includes('session_id') || pageText.includes('Session:')
        console.log(`📄 Page shows session content: ${hasNewSession}`)
      }
      
      expect(buttonWorking).toBe(true)
      
    } else {
      console.log('❌ Button not clickable on production')
      expect(false).toBe(true)  // Fail the test
    }
  } else {
    console.log('❌ Start New Session button not found on production')
    expect(false).toBe(true)  // Fail the test
  }
})