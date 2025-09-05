/**
 * Test the development server on port 3001
 */

import { test, expect } from '@playwright/test'

test('Test Start New Session on development server', async ({ page }) => {
  console.log('=== Testing Development Server (Port 3001) ===')
  
  const consoleMessages = []
  const errors = []
  
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
  
  await page.goto('http://localhost:3001')  // Dev server port
  await page.waitForLoadState('networkidle')
  
  // Wait for Vue to initialize
  await page.waitForTimeout(3000)
  
  console.log(`Initial console messages: ${consoleMessages.length}`)
  console.log(`Initial errors: ${errors.length}`)
  
  // Check if the Start New Session button exists
  const button = page.locator('button:has-text("Start New Session")')
  const buttonExists = await button.count() > 0
  console.log(`Start New Session button exists: ${buttonExists}`)
  
  if (buttonExists) {
    console.log('Button found! Clicking to test Vue functionality...')
    await button.click()
    await page.waitForTimeout(3000)  // Wait longer for Vue to process
    
    console.log(`Post-click console messages: ${consoleMessages.length}`)
    console.log(`Post-click errors: ${errors.length}`)
    
    // Look for our debug messages
    const debugMessages = consoleMessages.filter(msg => msg.includes('🚀') || msg.includes('handleNewSession'))
    console.log(`Debug messages found: ${debugMessages.length}`)
    debugMessages.forEach(msg => console.log(`  ${msg}`))
    
  } else {
    console.log('Button not found, listing all buttons:')
    const allButtons = page.locator('button')
    const buttonCount = await allButtons.count()
    console.log(`Total buttons: ${buttonCount}`)
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const buttonText = await allButtons.nth(i).textContent()
      console.log(`  Button ${i + 1}: "${buttonText}"`)
    }
  }
  
  console.log('\nFinal Summary:')
  console.log(`Console messages: ${consoleMessages.length}`)
  console.log(`Errors: ${errors.length}`)
  console.log(`Button worked: ${consoleMessages.some(msg => msg.includes('handleNewSession'))}`)
})