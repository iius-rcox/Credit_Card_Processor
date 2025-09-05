/**
 * Simple test to capture all console messages
 */

import { test, expect } from '@playwright/test'

test('Capture all console messages', async ({ page }) => {
  console.log('=== Capturing Console Messages ===')
  
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
  
  await page.goto('http://localhost:3000')
  await page.waitForLoadState('networkidle')
  
  // Wait a bit for any delayed errors
  await page.waitForTimeout(3000)
  
  console.log(`\nTotal console messages: ${consoleMessages.length}`)
  console.log(`Total errors: ${errors.length}`)
  
  // Check if the Start New Session button exists
  const button = page.locator('button:has-text("Start New Session")')
  const buttonExists = await button.count() > 0
  console.log(`Start New Session button exists: ${buttonExists}`)
  
  if (buttonExists) {
    console.log('Clicking button to see what happens...')
    await button.click()
    await page.waitForTimeout(2000)
  }
  
  console.log('\nFinal console message count:', consoleMessages.length)
  console.log('Final error count:', errors.length)
})