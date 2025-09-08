/**
 * Comprehensive End-to-End Test Suite for Credit Card Processor
 * 
 * Tests the complete processing workflow:
 * 1. Upload CAR file (car_file.pdf from tests/)
 * 2. Upload Receipt file (receipt_file.pdf from tests/) 
 * 3. Start processing
 * 4. Monitor progress
 * 5. Review results
 * 6. Export all required reports
 */

import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Complete Processing Workflow', () => {
  let page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Set up authentication headers for dev environment
    await page.setExtraHTTPHeaders({
      'x-dev-user': 'e2e-testuser',
      'x-user-context': 'e2e-testuser'
    })
    
    // Navigate to application
    await page.goto('http://localhost:3000')
    
    // Wait for application to load
    await expect(page.locator('h1')).toContainText('Credit Card Processor')
  })

  test.afterEach(async () => {
    await page?.close()
  })

  test('Complete processing workflow with real files', async () => {
    // Step 1: Create a new session
    await test.step('Create new processing session', async () => {
      await page.click('[data-testid="new-session-button"]')
      
      await page.fill('[data-testid="session-name-input"]', 'E2E Test Session')
      
      // Configure processing options
      await page.check('[data-testid="enable-validation-checkbox"]')
      await page.uncheck('[data-testid="enable-auto-resolution-checkbox"]')
      await page.check('[data-testid="enable-email-notifications-checkbox"]')
      
      await page.click('[data-testid="create-session-button"]')
      
      // Wait for session creation
      await expect(page.locator('[data-testid="session-created-message"]'))
        .toContainText('Session created successfully')
    })

    // Step 2: Upload CAR file
    await test.step('Upload CAR file', async () => {
      const carFilePath = path.join(__dirname, '../../car_file.pdf')
      
      // Upload via file input
      const carFileInput = page.locator('[data-testid="car-file-input"]')
      await carFileInput.setInputFiles(carFilePath)
      
      // Wait for file validation
      await expect(page.locator('[data-testid="car-file-status"]'))
        .toContainText('File validated successfully', { timeout: 10000 })
      
      // Verify file information is displayed
      await expect(page.locator('[data-testid="car-file-name"]'))
        .toContainText('car_file.pdf')
      
      // Check file size display
      await expect(page.locator('[data-testid="car-file-size"]'))
        .toContainText('KB')
    })

    // Step 3: Upload Receipt file
    await test.step('Upload Receipt file', async () => {
      const receiptFilePath = path.join(__dirname, '../../receipt_file.pdf')
      
      // Upload via drag and drop simulation
      const receiptDropZone = page.locator('[data-testid="receipt-drop-zone"]')
      const receiptFileInput = page.locator('[data-testid="receipt-file-input"]')
      
      await receiptFileInput.setInputFiles(receiptFilePath)
      
      // Wait for file validation
      await expect(page.locator('[data-testid="receipt-file-status"]'))
        .toContainText('File validated successfully', { timeout: 10000 })
      
      // Verify file information
      await expect(page.locator('[data-testid="receipt-file-name"]'))
        .toContainText('receipt_file.pdf')
    })

    // Step 4: Check for delta processing alert
    await test.step('Handle delta processing detection', async () => {
      // Check if delta alert appears
      const deltaAlert = page.locator('[data-testid="delta-alert"]')
      
      if (await deltaAlert.isVisible({ timeout: 5000 })) {
        await expect(deltaAlert).toContainText('Delta Processing Alert')
        await expect(deltaAlert).toContainText('Similar files detected')
        
        // Choose to enable delta processing
        await page.check('[data-testid="enable-delta-processing-checkbox"]')
        
        // Dismiss the alert
        await page.click('[data-testid="dismiss-delta-alert"]')
      }
    })

    // Step 5: Start file upload process
    await test.step('Upload files to server', async () => {
      // Upload button should be enabled when both files are selected
      const uploadButton = page.locator('[data-testid="upload-files-button"]')
      await expect(uploadButton).toBeEnabled()
      
      await uploadButton.click()
      
      // Monitor upload progress
      await expect(page.locator('[data-testid="upload-progress"]'))
        .toBeVisible({ timeout: 5000 })
      
      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-status"]'))
        .toContainText('Upload completed successfully', { timeout: 30000 })
      
      // Verify both files are uploaded
      await expect(page.locator('[data-testid="car-upload-status"]'))
        .toContainText('Completed')
      await expect(page.locator('[data-testid="receipt-upload-status"]'))
        .toContainText('Completed')
    })

    // Step 6: Start processing
    await test.step('Start document processing', async () => {
      const startProcessingButton = page.locator('[data-testid="start-processing-button"]')
      await expect(startProcessingButton).toBeEnabled()
      
      await startProcessingButton.click()
      
      // Confirm processing start dialog if it appears
      const confirmDialog = page.locator('[data-testid="confirm-processing-dialog"]')
      if (await confirmDialog.isVisible({ timeout: 3000 })) {
        await page.click('[data-testid="confirm-start-processing"]')
      }
      
      // Wait for processing to start
      await expect(page.locator('[data-testid="processing-status"]'))
        .toContainText('Processing started', { timeout: 10000 })
    })

    // Step 7: Monitor processing progress
    await test.step('Monitor processing progress', async () => {
      // Wait for progress tracker to appear
      const progressTracker = page.locator('[data-testid="progress-tracker"]')
      await expect(progressTracker).toBeVisible()
      
      // Check WebSocket connection status
      await expect(page.locator('[data-testid="websocket-status"]'))
        .toContainText('Connected', { timeout: 10000 })
      
      // Monitor progress updates
      let lastProgress = 0
      let progressStalled = false
      
      // Wait for processing to progress
      await page.waitForFunction(() => {
        const progressElement = document.querySelector('[data-testid="progress-percentage"]')
        return progressElement && parseInt(progressElement.textContent) > 0
      }, { timeout: 30000 })
      
      // Monitor processing steps
      const expectedSteps = [
        'Document Intelligence',
        'Employee Data Extraction', 
        'Transaction Matching',
        'Validation Processing',
        'Results Generation'
      ]
      
      for (const step of expectedSteps) {
        await expect(page.locator('[data-testid="current-processing-step"]'))
          .toContainText(step, { timeout: 60000 })
      }
      
      // Wait for processing completion
      await expect(page.locator('[data-testid="processing-status"]'))
        .toContainText('Processing completed', { timeout: 180000 })
    })

    // Step 8: Review processing results
    await test.step('Review processing results', async () => {
      // Navigate to results view
      await expect(page.locator('[data-testid="results-section"]'))
        .toBeVisible({ timeout: 10000 })
      
      // Check processing summary
      const summary = page.locator('[data-testid="processing-summary"]')
      await expect(summary).toBeVisible()
      
      // Verify key metrics are displayed
      await expect(page.locator('[data-testid="processed-employees-count"]'))
        .toContainText(/\d+/)
      
      await expect(page.locator('[data-testid="total-transactions-count"]'))
        .toContainText(/\d+/)
      
      await expect(page.locator('[data-testid="validation-issues-count"]'))
        .toContainText(/\d+/)
      
      // Check employee data table
      const employeeTable = page.locator('[data-testid="employee-results-table"]')
      await expect(employeeTable).toBeVisible()
      
      // Verify table has data
      const tableRows = employeeTable.locator('tbody tr')
      await expect(tableRows).toHaveCountGreaterThan(0)
      
      // Test employee row expansion
      const firstRow = tableRows.first()
      await firstRow.click()
      
      // Check transaction details
      await expect(page.locator('[data-testid="employee-transactions"]'))
        .toBeVisible({ timeout: 5000 })
    })

    // Step 9: Handle validation issues
    await test.step('Review and resolve validation issues', async () => {
      // Check if there are validation issues
      const issuesCount = await page.locator('[data-testid="validation-issues-count"]').textContent()
      const numIssues = parseInt(issuesCount) || 0
      
      if (numIssues > 0) {
        // Navigate to issues section
        await page.click('[data-testid="validation-issues-tab"]')
        
        // Review first issue
        const firstIssue = page.locator('[data-testid="validation-issue-item"]').first()
        await expect(firstIssue).toBeVisible()
        
        // Check issue details
        await firstIssue.click()
        await expect(page.locator('[data-testid="issue-details"]'))
          .toBeVisible({ timeout: 5000 })
        
        // Resolve issue (if resolution options are available)
        const resolveButton = page.locator('[data-testid="resolve-issue-button"]')
        if (await resolveButton.isVisible({ timeout: 3000 })) {
          await resolveButton.click()
          
          // Fill resolution form
          await page.fill('[data-testid="resolution-notes"]', 'E2E test resolution')
          await page.selectOption('[data-testid="resolution-type"]', 'manual_override')
          
          await page.click('[data-testid="submit-resolution"]')
          
          // Verify resolution
          await expect(page.locator('[data-testid="issue-resolved-status"]'))
            .toContainText('Resolved')
        }
      }
    })

    // Step 10: Test export functionality
    await test.step('Export processing results', async () => {
      // Navigate to export section
      await page.click('[data-testid="export-tab"]')
      
      const exportSection = page.locator('[data-testid="export-section"]')
      await expect(exportSection).toBeVisible()
      
      // Test pVault CSV export
      const pvaultExportButton = page.locator('[data-testid="export-pvault-csv"]')
      
      // Set up download handling
      const downloadPromise = page.waitForDownload()
      await pvaultExportButton.click()
      const download = await downloadPromise
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.csv')
      expect(await download.path()).toBeTruthy()
      
      // Test Excel export
      const excelExportButton = page.locator('[data-testid="export-excel-report"]')
      const excelDownloadPromise = page.waitForDownload()
      await excelExportButton.click()
      const excelDownload = await excelDownloadPromise
      
      expect(excelDownload.suggestedFilename()).toMatch(/\.(xlsx|xls)$/)
      
      // Test PDF export
      const pdfExportButton = page.locator('[data-testid="export-pdf-report"]')
      const pdfDownloadPromise = page.waitForDownload()
      await pdfExportButton.click()
      const pdfDownload = await pdfDownloadPromise
      
      expect(pdfDownload.suggestedFilename()).toContain('.pdf')
    })

    // Step 11: Verify export history
    await test.step('Verify export history tracking', async () => {
      // Check export history
      const exportHistory = page.locator('[data-testid="export-history"]')
      await expect(exportHistory).toBeVisible()
      
      // Verify exports are tracked
      const historyItems = exportHistory.locator('[data-testid="export-history-item"]')
      await expect(historyItems).toHaveCountGreaterThanOrEqual(3) // CSV, Excel, PDF
      
      // Check history item details
      const firstHistoryItem = historyItems.first()
      await expect(firstHistoryItem).toContainText('pVault CSV')
      await expect(firstHistoryItem).toContainText(/\d+:\d+/) // timestamp
    })

    // Step 12: Test session management
    await test.step('Test session management', async () => {
      // Navigate to sessions list
      await page.click('[data-testid="sessions-list-link"]')
      
      // Verify current session appears in list
      const sessionsList = page.locator('[data-testid="sessions-list"]')
      await expect(sessionsList).toBeVisible()
      
      const sessionItem = sessionsList.locator('[data-testid="session-item"]')
        .filter({ hasText: 'E2E Test Session' })
      
      await expect(sessionItem).toBeVisible()
      await expect(sessionItem).toContainText('Completed')
      
      // Test session actions
      await sessionItem.click()
      
      // Verify session details
      await expect(page.locator('[data-testid="session-details"]'))
        .toBeVisible({ timeout: 5000 })
      
      // Test download session data
      const sessionDataButton = page.locator('[data-testid="download-session-data"]')
      if (await sessionDataButton.isVisible({ timeout: 3000 })) {
        const sessionDownloadPromise = page.waitForDownload()
        await sessionDataButton.click()
        const sessionDownload = await sessionDownloadPromise
        
        expect(sessionDownload.suggestedFilename()).toMatch(/session.*\.(json|zip)$/)
      }
    })
  })

  test('Error handling and recovery scenarios', async () => {
    // Test network interruption handling
    await test.step('Test network interruption during upload', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Network Test Session')
      await page.click('[data-testid="create-session-button"]')
      
      const carFilePath = path.join(__dirname, '../../car_file.pdf')
      await page.locator('[data-testid="car-file-input"]').setInputFiles(carFilePath)
      
      // Simulate network interruption
      await page.route('**/api/upload/**', route => {
        if (Math.random() < 0.5) {
          route.abort('internetdisconnected')
        } else {
          route.continue()
        }
      })
      
      const uploadButton = page.locator('[data-testid="upload-files-button"]')
      await uploadButton.click()
      
      // Should show retry option or error handling
      await expect(
        page.locator('[data-testid="upload-error"], [data-testid="retry-upload-button"]')
      ).toBeVisible({ timeout: 30000 })
    })

    // Test browser refresh recovery
    await test.step('Test browser refresh during processing', async () => {
      // Skip if session isn't in processing state
      const processingStatus = page.locator('[data-testid="processing-status"]')
      
      if (await processingStatus.isVisible({ timeout: 3000 })) {
        const statusText = await processingStatus.textContent()
        
        if (statusText && statusText.includes('Processing')) {
          // Refresh the page
          await page.reload()
          
          // Should recover processing state
          await expect(page.locator('[data-testid="processing-recovery-message"]'))
            .toBeVisible({ timeout: 10000 })
          
          // Processing should resume or show recovery options
          await expect(
            page.locator('[data-testid="resume-processing-button"], [data-testid="processing-status"]')
          ).toBeVisible({ timeout: 15000 })
        }
      }
    })
  })

  test('Performance and scalability tests', async () => {
    // Test large file handling
    await test.step('Test large file upload performance', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Performance Test Session')
      await page.click('[data-testid="create-session-button"]')
      
      // Use the provided large receipt file
      const receiptFilePath = path.join(__dirname, '../../receipt_file.pdf')
      
      const startTime = Date.now()
      await page.locator('[data-testid="receipt-file-input"]').setInputFiles(receiptFilePath)
      
      // Wait for file validation
      await expect(page.locator('[data-testid="receipt-file-status"]'))
        .toContainText('File validated successfully', { timeout: 30000 })
      
      const endTime = Date.now()
      const uploadTime = endTime - startTime
      
      // Should handle large files within reasonable time (adjust threshold as needed)
      expect(uploadTime).toBeLessThan(60000) // 60 seconds max
    })

    // Test concurrent operations
    await test.step('Test concurrent user operations', async () => {
      // Open multiple tabs/contexts to simulate concurrent users
      const context2 = await page.context().browser().newContext({
        extraHTTPHeaders: {
          'x-dev-user': 'e2e-testuser-2',
          'x-user-context': 'e2e-testuser-2'
        }
      })
      
      const page2 = await context2.newPage()
      await page2.goto('http://localhost:3000')
      
      // Both users create sessions simultaneously
      const [session1, session2] = await Promise.all([
        page.click('[data-testid="new-session-button"]').then(() => 
          page.fill('[data-testid="session-name-input"]', 'Concurrent Test 1')
        ),
        page2.click('[data-testid="new-session-button"]').then(() => 
          page2.fill('[data-testid="session-name-input"]', 'Concurrent Test 2')
        )
      ])
      
      await Promise.all([
        page.click('[data-testid="create-session-button"]'),
        page2.click('[data-testid="create-session-button"]')
      ])
      
      // Both should succeed
      await Promise.all([
        expect(page.locator('[data-testid="session-created-message"]'))
          .toContainText('Session created successfully'),
        expect(page2.locator('[data-testid="session-created-message"]'))
          .toContainText('Session created successfully')
      ])
      
      await page2.close()
      await context2.close()
    })
  })

  test('Accessibility and usability tests', async () => {
    // Test keyboard navigation
    await test.step('Test keyboard navigation', async () => {
      // Navigate using Tab key
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to activate buttons with Enter/Space
      await page.keyboard.press('Enter')
      
      // Check focus management
      const focusedElement = await page.evaluate(() => document.activeElement.tagName)
      expect(['BUTTON', 'INPUT', 'A']).toContain(focusedElement)
    })

    // Test screen reader support
    await test.step('Test screen reader accessibility', async () => {
      // Check ARIA labels and roles
      const uploadButton = page.locator('[data-testid="upload-files-button"]')
      await expect(uploadButton).toHaveAttribute('aria-label')
      
      const progressBar = page.locator('[data-testid="progress-bar"]')
      if (await progressBar.isVisible({ timeout: 3000 })) {
        await expect(progressBar).toHaveAttribute('role', 'progressbar')
        await expect(progressBar).toHaveAttribute('aria-valuenow')
      }
    })

    // Test responsive design
    await test.step('Test responsive design', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // UI should adapt to mobile layout
      await expect(page.locator('[data-testid="mobile-menu-button"]'))
        .toBeVisible({ timeout: 5000 })
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Elements should be accessible in tablet layout
      await expect(page.locator('[data-testid="main-content"]'))
        .toBeVisible()
      
      // Reset to desktop
      await page.setViewportSize({ width: 1280, height: 720 })
    })
  })

  test('Security and data validation tests', async () => {
    // Test file type validation
    await test.step('Test malicious file upload prevention', async () => {
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', 'Security Test Session')
      await page.click('[data-testid="create-session-button"]')
      
      // Create a fake malicious file
      const maliciousContent = 'This is not a PDF file'
      const blob = new Blob([maliciousContent], { type: 'application/pdf' })
      
      // Try to upload malicious file
      await page.evaluate(async (blob) => {
        const file = new File([blob], 'malicious.pdf', { type: 'application/pdf' })
        const input = document.querySelector('[data-testid="car-file-input"]')
        
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }, blob)
      
      // Should show validation error
      await expect(page.locator('[data-testid="file-validation-error"]'))
        .toContainText('Invalid PDF file', { timeout: 10000 })
    })

    // Test input sanitization
    await test.step('Test input sanitization', async () => {
      const maliciousInput = '<script>alert("xss")</script>Malicious Session'
      
      await page.click('[data-testid="new-session-button"]')
      await page.fill('[data-testid="session-name-input"]', maliciousInput)
      
      // Input should be sanitized
      const inputValue = await page.inputValue('[data-testid="session-name-input"]')
      expect(inputValue).not.toContain('<script>')
      expect(inputValue).not.toContain('alert')
    })
  })
})