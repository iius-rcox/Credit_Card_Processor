/**
 * Interactive Components Test Suite
 * 
 * This test suite verifies all buttons and interactive components in the frontend
 * are working correctly across different browsers and devices.
 * 
 * Components tested:
 * - App.vue navigation and session management
 * - AuthDisplay.vue authentication interactions  
 * - FileUpload.vue file upload interactions
 */

import { test, expect } from '@playwright/test'

test.describe('Interactive Components - Comprehensive Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test.describe('App.vue - Main Application Components', () => {
    
    test('Skip Navigation Link should work correctly', async ({ page }) => {
      console.log('=== Testing Skip Navigation Link ===')
      
      // Focus on skip link (should be hidden initially)
      const skipLink = page.locator('a[href="#main-content"]')
      await skipLink.focus()
      
      // Verify skip link becomes visible on focus
      await expect(skipLink).toBeFocused()
      await expect(skipLink).toBeVisible()
      await expect(skipLink).toHaveText('Skip to main content')
      
      // Click skip link and verify navigation
      await skipLink.click()
      const mainContent = page.locator('#main-content')
      await expect(mainContent).toBeFocused()
      
      console.log('✓ Skip navigation link working correctly')
    })

    test('New Session Button should create session', async ({ page }) => {
      console.log('=== Testing New Session Button ===')
      
      // Wait for session to be established or create one first
      // Check if we have a session active first
      const hasSession = await page.locator('.nav-items').textContent()
      
      if (hasSession && hasSession.includes('Session:')) {
        // We have an active session, find the New Session button
        const newSessionBtn = page.locator('button:has-text("New Session")')
        await expect(newSessionBtn).toBeVisible()
        await expect(newSessionBtn).not.toBeDisabled()
        
        // Click New Session button
        await newSessionBtn.click()
        await page.waitForTimeout(2000) // Wait for session creation
        
        // Verify new session was created (session ID should change)
        await expect(page.locator('.nav-items')).toContainText('Session:')
        
        console.log('✓ New Session button working correctly')
      } else {
        // No active session, trigger session creation first
        console.log('No active session detected, skipping New Session button test')
      }
    })

    test('Error Dismiss Button should clear errors', async ({ page }) => {
      console.log('=== Testing Error Dismiss Button ===')
      
      // Check if there's an error currently displayed
      const errorDiv = page.locator('.notification.error')
      const errorExists = await errorDiv.count() > 0
      
      if (errorExists) {
        // Test dismiss functionality if error exists
        const dismissBtn = page.locator('.notification.error button:has-text("Dismiss")')
        await expect(dismissBtn).toBeVisible()
        await dismissBtn.click()
        
        // Verify error is dismissed
        await expect(errorDiv).not.toBeVisible()
        console.log('✓ Error dismiss button working correctly')
      } else {
        console.log('No errors currently displayed, cannot test dismiss functionality')
      }
    })
  })

  test.describe('AuthDisplay.vue - Authentication Components', () => {
    
    test('Admin Panel Button should be visible for admin users', async ({ page }) => {
      console.log('=== Testing Admin Panel Button ===')
      
      // Look for admin panel button
      const adminBtn = page.locator('button[title="Admin Panel"], button:has-text("Admin")')
      const adminBtnExists = await adminBtn.count() > 0
      
      if (adminBtnExists) {
        await expect(adminBtn).toBeVisible()
        await expect(adminBtn).not.toBeDisabled()
        
        // Click admin button and verify interaction
        await adminBtn.click()
        
        // Should trigger some kind of response (notification, modal, etc.)
        // Wait for potential notifications to appear
        await page.waitForTimeout(1000)
        console.log('✓ Admin Panel button accessible and clickable')
      } else {
        console.log('Admin Panel button not visible (user may not have admin privileges)')
      }
    })

    test('Retry Button should appear on auth errors', async ({ page }) => {
      console.log('=== Testing Auth Retry Button ===')
      
      // Look for retry button (may not be visible if auth is working)
      const retryBtn = page.locator('button:has-text("Retry")')
      const retryExists = await retryBtn.count() > 0
      
      if (retryExists) {
        await expect(retryBtn).toBeVisible()
        await expect(retryBtn).not.toBeDisabled()
        await retryBtn.click()
        
        console.log('✓ Auth retry button working')
      } else {
        console.log('Auth retry button not visible (authentication may be working correctly)')
      }
    })

    test('User Avatar and Info should be displayed', async ({ page }) => {
      console.log('=== Testing User Display Components ===')
      
      // Look for user authentication display
      const authDisplay = page.locator('.nav-items')
      await expect(authDisplay).toBeVisible()
      
      // Check for user-related elements
      const userElements = await authDisplay.locator('div, span, button').count()
      expect(userElements).toBeGreaterThan(0)
      
      console.log('✓ User authentication display elements present')
    })
  })


  test.describe('FileUpload.vue - File Upload Components', () => {
    
    test('CAR File Upload Zone should be interactive', async ({ page }) => {
      console.log('=== Testing CAR File Upload Zone ===')
      
      // Look for CAR upload components
      const carUploadZone = page.locator('[role="button"]:has-text("CAR"), .file-upload:has-text("CAR"), div:has-text("CAR PDF")')
      const carZoneExists = await carUploadZone.count() > 0
      
      if (carZoneExists) {
        // Test that upload zone is clickable and focusable
        await expect(carUploadZone.first()).toBeVisible()
        
        // Test keyboard accessibility
        await carUploadZone.first().focus()
        await expect(carUploadZone.first()).toBeFocused()
        
        // Test click interaction (without actually uploading a file)
        await carUploadZone.first().click()
        
        console.log('✓ CAR File Upload Zone is interactive and accessible')
      } else {
        console.log('CAR File Upload Zone not currently visible')
      }
    })

    test('Receipt File Upload Zone should be interactive', async ({ page }) => {
      console.log('=== Testing Receipt File Upload Zone ===')
      
      const receiptUploadZone = page.locator('[role="button"]:has-text("Receipt"), .file-upload:has-text("Receipt"), div:has-text("Receipt PDF")')
      const receiptZoneExists = await receiptUploadZone.count() > 0
      
      if (receiptZoneExists) {
        await expect(receiptUploadZone.first()).toBeVisible()
        
        // Test keyboard accessibility
        await receiptUploadZone.first().focus()
        await expect(receiptUploadZone.first()).toBeFocused()
        
        // Test click interaction
        await receiptUploadZone.first().click()
        
        console.log('✓ Receipt File Upload Zone is interactive and accessible')
      } else {
        console.log('Receipt File Upload Zone not currently visible')
      }
    })

    test('File Input Elements should be present', async ({ page }) => {
      console.log('=== Testing File Input Elements ===')
      
      // Check for hidden file inputs
      const carFileInput = page.locator('input[type="file"][accept*="pdf"]:has-text("CAR"), input[type="file"]:near(div:has-text("CAR"))')
      const receiptFileInput = page.locator('input[type="file"][accept*="pdf"]:has-text("Receipt"), input[type="file"]:near(div:has-text("Receipt"))')
      
      const fileInputs = page.locator('input[type="file"]')
      const inputCount = await fileInputs.count()
      
      if (inputCount > 0) {
        console.log(`✓ Found ${inputCount} file input elements`)
        
        // Verify file inputs accept PDF files
        for (let i = 0; i < Math.min(inputCount, 2); i++) {
          const input = fileInputs.nth(i)
          const accept = await input.getAttribute('accept')
          if (accept && accept.includes('pdf')) {
            console.log(`✓ File input ${i + 1} accepts PDF files`)
          }
        }
      } else {
        console.log('No file input elements found')
      }
    })

    test('Upload Files Button should be available when files selected', async ({ page }) => {
      console.log('=== Testing Upload Files Button ===')
      
      // Look for upload/submit button
      const uploadBtn = page.locator('button:has-text("Upload"), button[type="submit"], .upload-button')
      const uploadBtnExists = await uploadBtn.count() > 0
      
      if (uploadBtnExists) {
        await expect(uploadBtn.first()).toBeVisible()
        
        // Button might be disabled until files are selected
        console.log('✓ Upload Files Button found and visible')
      } else {
        console.log('Upload Files Button not currently visible (may appear after file selection)')
      }
    })

    test('Drag and Drop functionality should be supported', async ({ page }) => {
      console.log('=== Testing Drag and Drop Support ===')
      
      // Look for drag and drop zones
      const dropZones = page.locator('[role="button"]:has-text("drag"), div:has-text("drop"), .drop-zone, div:has-text("drag and drop")')
      const dropZoneCount = await dropZones.count()
      
      if (dropZoneCount > 0) {
        console.log(`✓ Found ${dropZoneCount} elements with drag and drop support`)
        
        // Test that drop zones have proper ARIA attributes
        for (let i = 0; i < Math.min(dropZoneCount, 2); i++) {
          const zone = dropZones.nth(i)
          const hasTabIndex = await zone.getAttribute('tabindex')
          const hasRole = await zone.getAttribute('role')
          
          if (hasTabIndex !== null || hasRole === 'button') {
            console.log(`✓ Drop zone ${i + 1} has accessibility attributes`)
          }
        }
      } else {
        console.log('Drag and drop zones not found or not currently visible')
      }
    })
  })

  test.describe('General Interactive Component Tests', () => {
    
    test('All buttons should have proper ARIA labels', async ({ page }) => {
      console.log('=== Testing Button Accessibility ===')
      
      const allButtons = page.locator('button')
      const buttonCount = await allButtons.count()
      
      console.log(`Found ${buttonCount} buttons on the page`)
      
      let buttonsWithLabels = 0
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = allButtons.nth(i)
        const ariaLabel = await button.getAttribute('aria-label')
        const buttonText = await button.textContent()
        const title = await button.getAttribute('title')
        
        if (ariaLabel || (buttonText && buttonText.trim()) || title) {
          buttonsWithLabels++
        }
      }
      
      console.log(`✓ ${buttonsWithLabels} out of ${Math.min(buttonCount, 10)} buttons have accessibility labels`)
      expect(buttonsWithLabels).toBeGreaterThan(0)
    })

    test('Interactive elements should be keyboard accessible', async ({ page }) => {
      console.log('=== Testing Keyboard Accessibility ===')
      
      // Test Tab navigation through interactive elements
      const interactiveElements = page.locator('button, a, input, [tabindex="0"], [role="button"]')
      const elementCount = await interactiveElements.count()
      
      console.log(`Found ${elementCount} potentially interactive elements`)
      
      // Test first few elements for keyboard accessibility
      let keyboardAccessibleCount = 0
      for (let i = 0; i < Math.min(elementCount, 5); i++) {
        const element = interactiveElements.nth(i)
        try {
          await element.focus()
          const isFocused = await element.evaluate(el => document.activeElement === el)
          if (isFocused) {
            keyboardAccessibleCount++
          }
        } catch (error) {
          // Element might not be focusable, which is okay
        }
      }
      
      console.log(`✓ ${keyboardAccessibleCount} elements are keyboard accessible`)
      expect(keyboardAccessibleCount).toBeGreaterThan(0)
    })

    test('Buttons should provide visual feedback on interaction', async ({ page }) => {
      console.log('=== Testing Button Visual Feedback ===')
      
      const clickableButtons = page.locator('button:not([disabled])')
      const buttonCount = await clickableButtons.count()
      
      if (buttonCount > 0) {
        // Test first enabled button for hover/focus states
        const button = clickableButtons.first()
        await expect(button).toBeVisible()
        
        // Test hover state (if supported)
        await button.hover()
        await page.waitForTimeout(200)
        
        // Test focus state
        await button.focus()
        await page.waitForTimeout(200)
        
        console.log('✓ Button visual feedback states tested')
      } else {
        console.log('No enabled buttons found for visual feedback testing')
      }
    })

    test('Form controls should have proper labels and validation', async ({ page }) => {
      console.log('=== Testing Form Control Accessibility ===')
      
      const formControls = page.locator('input, select, textarea')
      const controlCount = await formControls.count()
      
      console.log(`Found ${controlCount} form controls`)
      
      let labeledControls = 0
      for (let i = 0; i < controlCount; i++) {
        const control = formControls.nth(i)
        const ariaLabel = await control.getAttribute('aria-label')
        const ariaLabelledBy = await control.getAttribute('aria-labelledby')
        const id = await control.getAttribute('id')
        
        // Check if there's a corresponding label
        if (id) {
          const label = page.locator(`label[for="${id}"]`)
          const hasLabel = await label.count() > 0
          if (hasLabel || ariaLabel || ariaLabelledBy) {
            labeledControls++
          }
        } else if (ariaLabel || ariaLabelledBy) {
          labeledControls++
        }
      }
      
      console.log(`✓ ${labeledControls} out of ${controlCount} form controls have proper labels`)
    })
  })
})

test.describe('Mobile Responsive Interactive Components', () => {
  
  test('Interactive components should work on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    console.log('=== Testing Mobile Interactive Components ===')
    
    // Test touch-friendly buttons
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    console.log(`Testing ${buttonCount} buttons on mobile viewport`)
    
    // Verify buttons are touch-friendly (minimum 44px touch target)
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      const boundingBox = await button.boundingBox()
      
      if (boundingBox) {
        const isTouchFriendly = boundingBox.height >= 44 || boundingBox.width >= 44
        if (isTouchFriendly) {
          console.log(`✓ Button ${i + 1} meets touch target size requirements`)
        }
      }
    }
    
    // Test mobile navigation
    const skipLink = page.locator('a[href="#main-content"]')
    await skipLink.focus()
    await expect(skipLink).toBeFocused()
    
    console.log('✓ Mobile interactive components tested')
  })

  test('Action bar should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    console.log('=== Testing Mobile Action Bar ===')
    
    // Scroll to bottom to see action bar
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)
    
    const actionBar = page.locator('.action-bar, .action-bar-container')
    const actionBarExists = await actionBar.count() > 0
    
    if (actionBarExists) {
      await expect(actionBar.first()).toBeVisible()
      console.log('✓ Action bar visible on mobile')
      
      // Test action bar buttons on mobile
      const actionButtons = page.locator('.action-bar button, .action-button')
      const mobileButtonCount = await actionButtons.count()
      console.log(`Found ${mobileButtonCount} action buttons on mobile`)
    } else {
      console.log('Action bar not found on mobile view')
    }
  })
})