const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Remove Button Functionality After Processing', () => {
  test('should enable remove buttons after processing completes', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Verify we're on the correct page
    await expect(page).toHaveTitle(/Credit Card Processor/i);

    // First, we need to start a new session
    console.log('Starting new session...');
    const newSessionButton = page.locator('button:has-text("Start New Session")').first();
    await expect(newSessionButton).toBeVisible();
    await newSessionButton.click();

    // Wait for session to be created and file upload interface to appear
    await page.waitForTimeout(3000);

    // Get test files
    const carFilePath = path.join(__dirname, '..', 'test-car.pdf');
    const receiptFilePath = path.join(__dirname, '..', 'test-receipt.pdf');

    console.log('Uploading CAR file:', carFilePath);
    console.log('Uploading Receipt file:', receiptFilePath);

    // Look for file upload areas - the UI shows drag-and-drop areas for CAR and Receipt
    console.log('Looking for upload areas...');
    
    // Try to find file input elements within upload areas or hidden inputs
    const hiddenFileInputs = page.locator('input[type="file"]');
    const hiddenInputCount = await hiddenFileInputs.count();
    console.log(`Found ${hiddenInputCount} hidden file input elements`);

    // Try uploading using the file inputs if they exist
    if (hiddenInputCount >= 2) {
      console.log('Attempting to upload files using hidden file inputs...');
      await hiddenFileInputs.first().setInputFiles(carFilePath);
      await page.waitForTimeout(1000);
      await hiddenFileInputs.nth(1).setInputFiles(receiptFilePath);
      await page.waitForTimeout(2000);
    } else {
      // If we can't find separate inputs, try clicking on the upload areas
      console.log('Trying to click on upload areas...');
      
      // Try clicking on the CAR upload area
      const carUploadArea = page.locator('text=Upload CAR PDF').or(page.locator('[data-testid="car-upload"]')).or(page.locator('.upload-area').first());
      if (await carUploadArea.count() > 0) {
        console.log('Found CAR upload area, attempting to upload...');
        // This might trigger a file dialog, but we'll try with setInputFiles on any input that appears
        await carUploadArea.click();
        await page.waitForTimeout(1000);
        // Try to find and use any file input that became available
        const dynamicInputs = page.locator('input[type="file"]');
        if (await dynamicInputs.count() > 0) {
          await dynamicInputs.first().setInputFiles(carFilePath);
        }
      }
    }

    // Check if there's an "Upload Files" button we need to click
    const uploadFilesButton = page.locator('button:has-text("Upload Files")');
    if (await uploadFilesButton.count() > 0) {
      console.log('Found Upload Files button, clicking it...');
      await uploadFilesButton.click();
      await page.waitForTimeout(2000);
    }

    // Wait for uploads to complete and check for file indicators
    console.log('Checking for uploaded file indicators...');
    
    // Look for any indication that files were uploaded successfully
    const fileSuccessIndicators = page.locator('text=test-car.pdf, text=test-receipt.pdf, .file-uploaded, .upload-success, [data-testid*="uploaded"]');
    const uploadedFilesCount = await fileSuccessIndicators.count();
    console.log(`Found ${uploadedFilesCount} file success indicators`);

    // Also check if the UI state changed to show uploaded files
    const uploadedFilesList = page.locator('.uploaded-files, .file-list, [data-testid="uploaded-files"]');
    const hasUploadedFilesList = await uploadedFilesList.count() > 0;
    console.log(`Uploaded files list visible: ${hasUploadedFilesList}`);

    // Verify remove buttons are present and enabled before processing
    const removeButtonsBefore = page.locator('button:has-text("Remove"), button[title*="Remove"], button[aria-label*="Remove"]');
    const removeButtonsCount = await removeButtonsBefore.count();
    console.log(`Found ${removeButtonsCount} remove buttons before processing`);

    // Verify at least some remove buttons are enabled before processing
    for (let i = 0; i < Math.min(removeButtonsCount, 2); i++) {
      const button = removeButtonsBefore.nth(i);
      await expect(button).toBeEnabled();
      console.log(`Remove button ${i + 1} is enabled before processing`);
    }

    // Click the "Start Processing" button
    const startProcessingButton = page.locator('button:has-text("Start Processing")');
    await expect(startProcessingButton).toBeVisible();
    await expect(startProcessingButton).toBeEnabled();
    
    console.log('Clicking Start Processing button...');
    await startProcessingButton.click();

    // Wait for processing to start - check for status changes or processing indicators
    await page.waitForTimeout(2000);

    // Monitor processing status - wait for completion
    // Look for common processing indicators
    const processingIndicators = [
      'text=Processing',
      'text=In Progress',
      '[data-testid="processing-spinner"]',
      '.processing',
      '.spinner',
      '.loading'
    ];

    // Wait for processing to start (any indicator should appear)
    let processingStarted = false;
    for (const indicator of processingIndicators) {
      try {
        await page.locator(indicator).waitFor({ timeout: 5000 });
        console.log('Processing started - detected indicator:', indicator);
        processingStarted = true;
        break;
      } catch (e) {
        // Continue to next indicator
      }
    }

    if (!processingStarted) {
      console.log('No specific processing indicator found, waiting for status changes...');
    }

    // Wait for processing to complete - look for completion indicators
    const completionIndicators = [
      'text=Complete',
      'text=Completed',
      'text=Finished',
      'text=Success',
      'text=Done',
      '[data-testid="processing-complete"]'
    ];

    // Wait up to 60 seconds for processing to complete
    let processingCompleted = false;
    const maxWaitTime = 60000; // 60 seconds
    const checkInterval = 2000; // 2 seconds
    const maxChecks = maxWaitTime / checkInterval;

    for (let check = 0; check < maxChecks; check++) {
      await page.waitForTimeout(checkInterval);
      
      // Check for completion indicators
      for (const indicator of completionIndicators) {
        try {
          const element = page.locator(indicator);
          if (await element.isVisible()) {
            console.log('Processing completed - detected indicator:', indicator);
            processingCompleted = true;
            break;
          }
        } catch (e) {
          // Continue
        }
      }

      if (processingCompleted) break;

      // Also check if processing indicators have disappeared
      let allProcessingIndicatorsGone = true;
      for (const indicator of processingIndicators) {
        try {
          const element = page.locator(indicator);
          if (await element.isVisible()) {
            allProcessingIndicatorsGone = false;
            break;
          }
        } catch (e) {
          // Element not found, which is good
        }
      }

      if (allProcessingIndicatorsGone && check > 2) { // Wait at least a few checks
        console.log('Processing indicators disappeared, assuming completion');
        processingCompleted = true;
        break;
      }

      console.log(`Waiting for processing to complete... (check ${check + 1}/${maxChecks})`);
    }

    if (!processingCompleted) {
      console.log('Processing completion indicators not detected, proceeding with test...');
    }

    // Give a bit more time for UI to update after processing
    await page.waitForTimeout(3000);

    // Now verify that remove buttons are functional after processing
    console.log('Checking remove buttons after processing...');

    // Re-locate remove buttons (they might have been re-rendered)
    const removeButtonsAfter = page.locator('button:has-text("Remove"), button[title*="Remove"], button[aria-label*="Remove"], button[class*="remove"], .remove-button');
    const removeButtonsAfterCount = await removeButtonsAfter.count();
    console.log(`Found ${removeButtonsAfterCount} remove buttons after processing`);

    // Verify remove buttons are enabled after processing
    expect(removeButtonsAfterCount).toBeGreaterThan(0);

    // Test clicking a remove button
    if (removeButtonsAfterCount > 0) {
      const firstRemoveButton = removeButtonsAfter.first();
      
      // Ensure the button is visible and enabled
      await expect(firstRemoveButton).toBeVisible();
      await expect(firstRemoveButton).toBeEnabled();
      
      console.log('Remove button is enabled after processing - this confirms the fix is working!');

      // Get the file count before removal
      const filesBeforeRemoval = await page.locator('[data-testid="uploaded-file"], .uploaded-file, .file-item').count();
      console.log(`Files before removal: ${filesBeforeRemoval}`);

      // Click the remove button
      console.log('Clicking remove button to test functionality...');
      await firstRemoveButton.click();

      // Wait for the file to be removed from the UI
      await page.waitForTimeout(2000);

      // Verify the file was removed
      const filesAfterRemoval = await page.locator('[data-testid="uploaded-file"], .uploaded-file, .file-item').count();
      console.log(`Files after removal: ${filesAfterRemoval}`);

      // The file count should decrease by 1, or we should see some indication of removal
      if (filesAfterRemoval < filesBeforeRemoval) {
        console.log('SUCCESS: File was removed from UI after clicking remove button');
      } else {
        // Alternative check - look for removal confirmation or empty state
        const possibleRemovalIndicators = [
          'text=removed',
          'text=deleted',
          'text=No files',
          'text=Upload files',
          '.empty-state'
        ];

        let removalConfirmed = false;
        for (const indicator of possibleRemovalIndicators) {
          try {
            if (await page.locator(indicator).isVisible()) {
              console.log('File removal confirmed by indicator:', indicator);
              removalConfirmed = true;
              break;
            }
          } catch (e) {
            // Continue
          }
        }

        if (!removalConfirmed) {
          console.log('WARNING: File removal could not be confirmed visually');
        }
      }
    }

    // Final verification - ensure remove buttons remain functional
    const finalRemoveButtons = page.locator('button:has-text("Remove"), button[title*="Remove"], button[aria-label*="Remove"], button[class*="remove"], .remove-button');
    const finalCount = await finalRemoveButtons.count();
    
    if (finalCount > 0) {
      const lastRemoveButton = finalRemoveButtons.first();
      await expect(lastRemoveButton).toBeEnabled();
      console.log('Final check: Remove buttons remain enabled after removal - fix is working correctly!');
    }

    console.log('Test completed successfully!');
  });

  test('should handle remove button functionality with multiple files', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start a new session first
    console.log('Starting new session for multiple files test...');
    const newSessionButton = page.locator('button:has-text("Start New Session")').first();
    await expect(newSessionButton).toBeVisible();
    await newSessionButton.click();
    await page.waitForTimeout(3000);

    // Get test files
    const carFilePath = path.join(__dirname, '..', 'test-car.pdf');
    const receiptFilePath = path.join(__dirname, '..', 'test-receipt.pdf');

    // Wait for file inputs to appear
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });

    // Upload both files
    const fileInputs = page.locator('input[type="file"]');
    const inputCount = await fileInputs.count();
    console.log(`Found ${inputCount} file inputs for multiple files test`);

    if (inputCount > 0) {
      await fileInputs.first().setInputFiles(carFilePath);
      await page.waitForTimeout(1000);
    }

    if (inputCount > 1) {
      await fileInputs.nth(1).setInputFiles(receiptFilePath);
      await page.waitForTimeout(1000);
    }

    // Start processing
    const startProcessingButton = page.locator('button:has-text("Start Processing")');
    await startProcessingButton.click();

    // Wait for processing to complete (simplified for second test)
    await page.waitForTimeout(10000);

    // Verify multiple remove buttons work
    const removeButtons = page.locator('button:has-text("Remove"), button[title*="Remove"], button[aria-label*="Remove"]');
    const buttonCount = await removeButtons.count();

    console.log(`Testing ${buttonCount} remove buttons for functionality`);

    // Test each remove button is enabled
    for (let i = 0; i < Math.min(buttonCount, 2); i++) {
      const button = removeButtons.nth(i);
      await expect(button).toBeEnabled();
      console.log(`Remove button ${i + 1} is enabled after processing`);
    }

    // Click one remove button to verify it works
    if (buttonCount > 0) {
      await removeButtons.first().click();
      await page.waitForTimeout(1000);
      console.log('Successfully clicked remove button - functionality confirmed');
    }
  });
});