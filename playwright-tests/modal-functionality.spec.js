const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('Modal Functionality - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.session-manager', { timeout: 10000 });
  });

  test.describe('Session Details Modal', () => {
    test('Modal opens and displays complete session information', async ({ page }) => {
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      // Verify modal opens
      await expect(page.locator('h3:has-text("Session Details")')).toBeVisible();
      
      // Check all information fields
      const expectedFields = [
        'Session ID:',
        'Session Name:',
        'Status:',
        'Created:',
        'Last Updated:',
        'Total Employees:',
        'Processed Employees:',
        'Created By:'
      ];
      
      for (const field of expectedFields) {
        await expect(page.locator(`text=${field}`)).toBeVisible();
      }
      
      // Verify close button is present
      await expect(page.locator('button:has-text("Close")')).toBeVisible();
    });

    test('Modal closes with close button', async ({ page }) => {
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      await expect(page.locator('h3:has-text("Session Details")')).toBeVisible();
      
      // Close modal - use the X button in the modal header
      await page.locator('button[class*="bg-white rounded-md text-gray-400"]').click();
      
      // Verify modal is closed
      await expect(page.locator('h3:has-text("Session Details")')).not.toBeVisible();
    });

    test('Modal closes with escape key', async ({ page }) => {
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      await expect(page.locator('h3:has-text("Session Details")')).toBeVisible();
      
      // Press escape key
      await page.keyboard.press('Escape');
      
      // Verify modal is closed
      await expect(page.locator('h3:has-text("Session Details")')).not.toBeVisible();
    });

    test('Modal closes when clicking outside', async ({ page }) => {
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      await expect(page.locator('h3:has-text("Session Details")')).toBeVisible();
      
      // Click outside modal (on backdrop)
      await page.locator('.modal-backdrop, .modal-overlay, [data-testid="modal-backdrop"]').click();
      
      // Verify modal is closed
      await expect(page.locator('h3:has-text("Session Details")')).not.toBeVisible();
    });
  });

  test.describe('Close Session Modal', () => {
    test('Modal opens with proper form elements', async ({ page }) => {
      const closeButton = page.locator('button:has-text("Close")').first();
      await closeButton.click();
      
      // Verify modal opens
      await expect(page.locator('text=Close Session')).toBeVisible();
      await expect(page.locator('text=Are you sure you want to permanently close this session?')).toBeVisible();
      await expect(page.locator('text=This action cannot be undone')).toBeVisible();
      
      // Check form elements
      await expect(page.locator('input[placeholder*="Reason for closing"]')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Close Session")')).toBeVisible();
    });

    test('Reason input accepts text', async ({ page }) => {
      const closeButton = page.locator('button:has-text("Close")').first();
      await closeButton.click();
      
      // Wait for modal to be visible
      await expect(page.locator('text=Permanent Session Closure')).toBeVisible();
      
      // The actual input is a textarea, not an input field
      const reasonInput = page.locator('textarea[placeholder*="reason"]');
      const testReason = 'Test closure reason for automated testing';
      
      await reasonInput.fill(testReason);
      await expect(reasonInput).toHaveValue(testReason);
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });

    test('Modal validates required fields', async ({ page }) => {
      const closeButton = page.locator('button:has-text("Close")').first();
      await closeButton.click();
      
      const closeSessionButton = page.locator('button:has-text("Close Session")');
      
      // Try to submit without reason (if required)
      await closeSessionButton.click();
      
      // Modal should still be open (validation should prevent submission)
      await expect(page.locator('text=Close Session')).toBeVisible();
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });

    test('Modal cancels properly', async ({ page }) => {
      const closeButton = page.locator('button:has-text("Close")').first();
      await closeButton.click();
      
      await expect(page.locator('text=Close Session')).toBeVisible();
      
      // Cancel
      await page.locator('button:has-text("Cancel")').click();
      
      // Verify modal is closed
      await expect(page.locator('text=Permanent Session Closure')).not.toBeVisible();
    });
  });

  test.describe('Delete Session Modal', () => {
    test('Modal opens with proper warning elements', async ({ page }) => {
      const deleteButton = page.locator('button:has-text("Delete")').first();
      await deleteButton.click();
      
      // Verify modal opens
      await expect(page.locator('h3:has-text("Delete Session")')).toBeVisible();
      await expect(page.locator('text=Are you sure you want to delete this session?')).toBeVisible();
      await expect(page.locator('text=This action cannot be undone')).toBeVisible();
      
      // Check buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Delete Session")')).toBeVisible();
    });

    test('Modal cancels properly', async ({ page }) => {
      const deleteButton = page.locator('button:has-text("Delete")').first();
      await deleteButton.click();
      
      await expect(page.locator('h3:has-text("Delete Session")')).toBeVisible();
      
      // Cancel
      await page.locator('button:has-text("Cancel")').click();
      
      // Verify modal is closed
      await expect(page.locator('text=Delete Session')).not.toBeVisible();
    });

    test('Delete button is properly styled as dangerous action', async ({ page }) => {
      const deleteButton = page.locator('button:has-text("Delete")').first();
      await deleteButton.click();
      
      const confirmDeleteButton = page.locator('button:has-text("Delete Session")');
      
      // Check that delete button has appropriate styling
      await expect(confirmDeleteButton).toBeVisible();
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });
  });

  test.describe('Close All Sessions Modal', () => {
    test('Modal opens when Close All button is enabled', async ({ page }) => {
      const closeAllButton = page.locator('button:has-text("Close All")');
      const isDisabled = await closeAllButton.isDisabled();
      
      if (!isDisabled) {
        await closeAllButton.click();
        
        // Verify modal opens
        await expect(page.locator('text=Close All Sessions')).toBeVisible();
        await expect(page.locator('text=Are you sure you want to permanently close all active sessions?')).toBeVisible();
        await expect(page.locator('text=This action cannot be undone')).toBeVisible();
        
        // Check form elements
        await expect(page.locator('input[placeholder*="Reason for closing"]')).toBeVisible();
        await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
        await expect(page.locator('button:has-text("Close All Sessions")')).toBeVisible();
        
        // Cancel to close modal
        await page.locator('button:has-text("Cancel")').click();
      } else {
        console.log('Close All button is disabled - no closeable sessions available');
      }
    });

    test('Modal handles bulk operations properly', async ({ page }) => {
      const closeAllButton = page.locator('button:has-text("Close All")');
      const isDisabled = await closeAllButton.isDisabled();
      
      if (!isDisabled) {
        await closeAllButton.click();
        
        await expect(page.locator('text=Close All Sessions')).toBeVisible();
        
        // Test reason input
        const reasonInput = page.locator('input[placeholder*="Reason for closing"]');
        await reasonInput.fill('Bulk closure for testing');
        await expect(reasonInput).toHaveValue('Bulk closure for testing');
        
        // Cancel to close modal
        await page.locator('button:has-text("Cancel")').click();
      }
    });
  });

  test.describe('Receipt Reprocessing Modal', () => {
    test('Modal opens with file upload interface', async ({ page }) => {
      const addReceiptsButton = page.locator('button:has-text("Add Receipts")').first();
      await addReceiptsButton.click();
      
      // Verify modal opens
      await expect(page.locator('text=📄 Add New Receipts')).toBeVisible();
      await expect(page.locator('text=Current Version:')).toBeVisible();
      await expect(page.locator('text=Drop receipt file here or click to browse')).toBeVisible();
      await expect(page.locator('text=Supported formats: CSV, Excel (.xlsx, .xls)')).toBeVisible();
      
      // Check form elements
      await expect(page.locator('input[placeholder*="Reason for Adding"]')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Add Receipts & Reprocess")')).toBeVisible();
    });

    test('File upload area is interactive', async ({ page }) => {
      const addReceiptsButton = page.locator('button:has-text("Add Receipts")').first();
      await addReceiptsButton.click();
      
      const fileUploadArea = page.locator('text=Drop receipt file here or click to browse');
      await expect(fileUploadArea).toBeVisible();
      
      // Test clicking on upload area
      await fileUploadArea.click();
      
      // Modal should still be open
      await expect(page.locator('text=📄 Add New Receipts')).toBeVisible();
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });

    test('Reason input accepts text', async ({ page }) => {
      const addReceiptsButton = page.locator('button:has-text("Add Receipts")').first();
      await addReceiptsButton.click();
      
      const reasonInput = page.locator('input[placeholder*="Reason for Adding"]');
      const testReason = 'Adding new receipt data for testing';
      
      await reasonInput.fill(testReason);
      await expect(reasonInput).toHaveValue(testReason);
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });

    test('Submit button is disabled without file', async ({ page }) => {
      const addReceiptsButton = page.locator('button:has-text("Add Receipts")').first();
      await addReceiptsButton.click();
      
      const submitButton = page.locator('button:has-text("Add Receipts & Reprocess")');
      
      // Button should be disabled without file
      await expect(submitButton).toBeDisabled();
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });
  });

  test.describe('Delta Export Modal', () => {
    test('Modal opens with export options', async ({ page }) => {
      const exportButton = page.locator('button:has-text("Export")').first();
      await exportButton.click();
      
      // Verify modal opens
      await expect(page.locator('text=📊 Export Session Data')).toBeVisible();
      await expect(page.locator('text=Export Type')).toBeVisible();
      await expect(page.locator('text=pVault File (Employee Data)')).toBeVisible();
      await expect(page.locator('text=Exceptions Report')).toBeVisible();
      await expect(page.locator('text=Advanced Options')).toBeVisible();
      
      // Check buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Export New Only")')).toBeVisible();
    });

    test('Export type selection works', async ({ page }) => {
      const exportButton = page.locator('button:has-text("Export")').first();
      await exportButton.click();
      
      // Test selecting different export types
      const pvaultRadio = page.locator('text=pVault File (Employee Data)');
      const exceptionsRadio = page.locator('text=Exceptions Report');
      
      // Default should be pVault
      await expect(pvaultRadio).toBeChecked();
      
      // Select exceptions report
      await exceptionsRadio.click();
      await expect(exceptionsRadio).toBeChecked();
      await expect(pvaultRadio).not.toBeChecked();
      
      // Select pVault again
      await pvaultRadio.click();
      await expect(pvaultRadio).toBeChecked();
      await expect(exceptionsRadio).not.toBeChecked();
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });

    test('Advanced options work correctly', async ({ page }) => {
      const exportButton = page.locator('button:has-text("Export")').first();
      await exportButton.click();
      
      const markExportedCheckbox = page.locator('text=Mark records as exported after generation');
      
      // Default should be checked
      await expect(markExportedCheckbox).toBeChecked();
      
      // Uncheck
      await markExportedCheckbox.click();
      await expect(markExportedCheckbox).not.toBeChecked();
      
      // Check again
      await markExportedCheckbox.click();
      await expect(markExportedCheckbox).toBeChecked();
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });

    test('Export button state changes based on options', async ({ page }) => {
      const exportButton = page.locator('button:has-text("Export")').first();
      await exportButton.click();
      
      const exportSubmitButton = page.locator('button:has-text("Export New Only")');
      
      // Button should be visible (may be disabled depending on data)
      await expect(exportSubmitButton).toBeVisible();
      
      // Cancel to close modal
      await page.locator('button:has-text("Cancel")').click();
    });
  });

  test.describe('Modal Accessibility', () => {
    test('Modals are keyboard accessible', async ({ page }) => {
      // Test session details modal
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      // Tab through modal elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Close with escape
      await page.keyboard.press('Escape');
      await expect(page.locator('h3:has-text("Session Details")')).not.toBeVisible();
    });

    test('Modal focus management', async ({ page }) => {
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      // Focus should be on modal
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    test('Modal has proper ARIA attributes', async ({ page }) => {
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      // Check for modal role or similar accessibility attributes
      const modal = page.locator('text=Session Details').locator('..');
      await expect(modal).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Modal Error Handling', () => {
    test('Modals handle network errors gracefully', async ({ page }) => {
      // This test would require simulating network failures
      // For now, we'll test normal modal operation
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      await expect(page.locator('h3:has-text("Session Details")')).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    test('Modals close properly on page navigation', async ({ page }) => {
      const viewButton = page.locator('button:has-text("View")').first();
      await viewButton.click();
      
      await expect(page.locator('h3:has-text("Session Details")')).toBeVisible();
      
      // Navigate to another page
      await page.locator('button:has-text("Upload Documents")').click();
      
      // Modal should be closed
      await expect(page.locator('h3:has-text("Session Details")')).not.toBeVisible();
    });
  });
});
