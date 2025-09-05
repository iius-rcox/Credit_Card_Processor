/**
 * Test to verify Vue.js functionality and button click handlers
 */

import { test, expect } from '@playwright/test'

test.describe('Vue Functionality Test', () => {
  
  test('Check if Vue app is working and button handlers are bound', async ({ page }) => {
    console.log('=== Testing Vue.js Functionality ===')
    
    // Navigate to the page
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Check if Vue is loaded
    const vueExists = await page.evaluate(() => {
      return typeof window.Vue !== 'undefined' || 
             document.querySelector('[data-v-app]') !== null ||
             document.querySelector('#app').__vue__ !== undefined
    })
    
    console.log(`Vue detected: ${vueExists}`)
    
    // Check if the Vue app is mounted
    const appMounted = await page.evaluate(() => {
      const app = document.querySelector('#app')
      return app && app.children.length > 0
    })
    
    console.log(`Vue app mounted: ${appMounted}`)
    
    // Check for Vue data attributes
    const vueDataAttributes = await page.locator('[data-v-]').count()
    console.log(`Vue data attributes found: ${vueDataAttributes}`)
    
    // Check for the Start New Session button
    const startButtons = await page.locator('button:has-text("Start New Session"), button:has-text("New Session")').count()
    console.log(`Session buttons found: ${startButtons}`)
    
    if (startButtons > 0) {
      const button = page.locator('button:has-text("Start New Session"), button:has-text("New Session")').first()
      const isVisible = await button.isVisible()
      const isEnabled = await button.isDisabled()
      const buttonText = await button.textContent()
      const hasClickHandler = await button.evaluate(el => {
        const events = []
        for (let key in el) {
          if (key.startsWith('__vue')) {
            events.push(key)
          }
        }
        return events.length > 0
      })
      
      console.log(`Button visible: ${isVisible}`)
      console.log(`Button enabled: ${!isEnabled}`) 
      console.log(`Button text: "${buttonText}"`)
      console.log(`Button has Vue handler: ${hasClickHandler}`)
      
      // Try adding a simple click listener to see if DOM events work
      await page.evaluate(() => {
        const button = document.querySelector('button:contains("Start New Session"), button:contains("New Session")')
        if (button) {
          button.addEventListener('click', () => {
            console.log('🖱️ DOM click event fired')
            window.testClickFired = true
          })
        }
      })
      
      console.log('Clicking button...')
      await button.click()
      await page.waitForTimeout(1000)
      
      const domClickFired = await page.evaluate(() => window.testClickFired)
      console.log(`DOM click event fired: ${domClickFired}`)
    }
    
    // Check for any JavaScript errors
    const jsErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text())
      }
    })
    
    page.on('pageerror', error => {
      jsErrors.push(error.message)
    })
    
    // Wait a bit for potential errors
    await page.waitForTimeout(2000)
    
    console.log(`JavaScript errors detected: ${jsErrors.length}`)
    jsErrors.forEach(error => {
      console.log(`  ERROR: ${error}`)
    })
    
    // Check Vue devtools
    const hasVueDevtools = await page.evaluate(() => {
      return window.__VUE__ !== undefined || window.__VUE_DEVTOOLS_GLOBAL_HOOK__ !== undefined
    })
    
    console.log(`Vue devtools available: ${hasVueDevtools}`)
    
    // Test basic Vue reactivity by checking if any computed properties or refs exist
    const hasReactivity = await page.evaluate(() => {
      const app = document.querySelector('#app')
      if (app && app.__vue_app__) {
        return true
      }
      // Alternative check for Vue 3
      return document.querySelector('[data-v-app]') !== null
    })
    
    console.log(`Vue reactivity system active: ${hasReactivity}`)
    
    expect(appMounted).toBe(true)
  })
})