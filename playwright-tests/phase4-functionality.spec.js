const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:8001';

test.describe('Phase 4 Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    
    // Wait for the page to load and show sessions
    await page.waitForSelector('.session-manager', { timeout: 10000 });
    
    // Verify user is authenticated as admin
    await expect(page.locator('text=Admin')).toBeVisible();
  });

  test('Session Manager loads with all sessions', async ({ page }) => {
    // Check that sessions are loaded
    await expect(page.locator('.session-card')).toHaveCount.greaterThan(0);
    
    // Check that different session statuses are present
    const statusElements = page.locator('.status');
    await expect(statusElements.first()).toBeVisible();
    
    // Verify session manager controls are present
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    await expect(page.locator('button:has-text("Close All")')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('Session filtering works correctly', async ({ page }) => {
    // Test status filter dropdown
    const statusFilter = page.locator('select');
    await statusFilter.selectOption('Completed');
    
    // Wait for filtering to complete
    await page.waitForTimeout(1000);
    
    // Verify only completed sessions are shown
    const visibleSessions = page.locator('.session-card:visible');
    const count = await visibleSessions.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const status = await visibleSessions.nth(i).locator('.status').textContent();
        expect(status?.toLowerCase()).toContain('completed');
      }
    }
    
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('bd6974f9');
    await page.waitForTimeout(500);
    
    // Should show only matching sessions
    const searchResults = page.locator('.session-card:visible');
    const searchCount = await searchResults.count();
    expect(searchCount).toBeGreaterThan(0);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test('Phase 4 action buttons appear on correct sessions', async ({ page }) => {
    // Find completed sessions
    const completedSessions = page.locator('.session-card').filter({ hasText: 'COMPLETED' });
    const completedCount = await completedSessions.count();
    
    if (completedCount > 0) {
      // Check first completed session has both Phase 4 buttons
      const firstCompleted = completedSessions.first();
      await expect(firstCompleted.locator('button:has-text("Add Receipts")')).toBeVisible();
      await expect(firstCompleted.locator('button:has-text("Export")')).toBeVisible();
    }
    
    // Find failed sessions
    const failedSessions = page.locator('.session-card').filter({ hasText: 'FAILED' });
    const failedCount = await failedSessions.count();
    
    if (failedCount > 0) {
      // Check first failed session has Add Receipts button but not Export
      const firstFailed = failedSessions.first();
      await expect(firstFailed.locator('button:has-text("Add Receipts")')).toBeVisible();
      await expect(firstFailed.locator('button:has-text("Export")')).not.toBeVisible();
    }
    
    // Find processing sessions
    const processingSessions = page.locator('.session-card').filter({ hasText: 'PROCESSING' });
    const processingCount = await processingSessions.count();
    
    if (processingCount > 0) {
      // Check processing sessions don't have Phase 4 buttons
      const firstProcessing = processingSessions.first();
      await expect(firstProcessing.locator('button:has-text("Add Receipts")')).not.toBeVisible();
      await expect(firstProcessing.locator('button:has-text("Export")')).not.toBeVisible();
    }
  });

  test('Receipt Reprocessing Modal functionality', async ({ page }) => {
    // Find a completed session with Add Receipts button
    const addReceiptsButton = page.locator('button:has-text("Add Receipts")').first();
    await expect(addReceiptsButton).toBeVisible();
    
    // Click Add Receipts button
    await addReceiptsButton.click();
    
    // Verify modal opens
    await expect(page.locator('text=📄 Add New Receipts')).toBeVisible();
    await expect(page.locator('text=Current Version:')).toBeVisible();
    await expect(page.locator('text=Drop receipt file here or click to browse')).toBeVisible();
    await expect(page.locator('input[placeholder*="Reason for Adding"]')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Receipts & Reprocess")')).toBeVisible();
    
    // Test file upload area
    const fileUploadArea = page.locator('text=Drop receipt file here or click to browse');
    await expect(fileUploadArea).toBeVisible();
    
    // Test reason input
    const reasonInput = page.locator('input[placeholder*="Reason for Adding"]');
    await reasonInput.fill('Test reason for adding receipts');
    await expect(reasonInput).toHaveValue('Test reason for adding receipts');
    
    // Close modal
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=📄 Add New Receipts')).not.toBeVisible();
  });

  test('Delta Export Modal functionality', async ({ page }) => {
    // Find a completed session with Export button
    const exportButton = page.locator('button:has-text("Export")').first();
    await expect(exportButton).toBeVisible();
    
    // Click Export button
    await exportButton.click();
    
    // Verify modal opens
    await expect(page.locator('text=📊 Export Session Data')).toBeVisible();
    await expect(page.locator('text=Export Type')).toBeVisible();
    await expect(page.locator('text=pVault File (Employee Data)')).toBeVisible();
    await expect(page.locator('text=Exceptions Report')).toBeVisible();
    await expect(page.locator('text=Advanced Options')).toBeVisible();
    await expect(page.locator('text=Mark records as exported after generation')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Export New Only")')).toBeVisible();
    
    // Test export type selection
    const exceptionsRadio = page.locator('text=Exceptions Report');
    await exceptionsRadio.click();
    await expect(exceptionsRadio).toBeChecked();
    
    // Test advanced options
    const markExportedCheckbox = page.locator('text=Mark records as exported after generation');
    await expect(markExportedCheckbox).toBeChecked();
    await markExportedCheckbox.click();
    await expect(markExportedCheckbox).not.toBeChecked();
    
    // Close modal
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=📊 Export Session Data')).not.toBeVisible();
  });

  test('Delete Session Modal functionality', async ({ page }) => {
    // Find a session with Delete button (completed, failed, or paused)
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await expect(deleteButton).toBeVisible();
    
    // Click Delete button
    await deleteButton.click();
    
    // Verify modal opens
    await expect(page.locator('text=Delete Session')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete this session?')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete Session")')).toBeVisible();
    
    // Test cancel functionality
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=Delete Session')).not.toBeVisible();
  });

  test('Session Details Modal functionality', async ({ page }) => {
    // Find a session with View button
    const viewButton = page.locator('button:has-text("View")').first();
    await expect(viewButton).toBeVisible();
    
    // Click View button
    await viewButton.click();
    
    // Verify modal opens
    await expect(page.locator('text=Session Details')).toBeVisible();
    await expect(page.locator('text=Session ID:')).toBeVisible();
    await expect(page.locator('text=Status:')).toBeVisible();
    await expect(page.locator('text=Created:')).toBeVisible();
    await expect(page.locator('text=Last Updated:')).toBeVisible();
    await expect(page.locator('text=Total Employees:')).toBeVisible();
    await expect(page.locator('text=Processed Employees:')).toBeVisible();
    
    // Close modal
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('text=Session Details')).not.toBeVisible();
  });

  test('Close Session Modal functionality', async ({ page }) => {
    // Find a session with Close button (processing, completed, or failed)
    const closeButton = page.locator('button:has-text("Close")').first();
    await expect(closeButton).toBeVisible();
    
    // Click Close button
    await closeButton.click();
    
    // Verify modal opens
    await expect(page.locator('text=Close Session')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to permanently close this session?')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();
    await expect(page.locator('input[placeholder*="Reason for closing"]')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Close Session")')).toBeVisible();
    
    // Test reason input
    const reasonInput = page.locator('input[placeholder*="Reason for closing"]');
    await reasonInput.fill('Test closure reason');
    await expect(reasonInput).toHaveValue('Test closure reason');
    
    // Close modal
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=Close Session')).not.toBeVisible();
  });

  test('Close All Sessions Modal functionality', async ({ page }) => {
    // Click Close All button
    const closeAllButton = page.locator('button:has-text("Close All")');
    await expect(closeAllButton).toBeVisible();
    
    // Check if button is enabled (has closeable sessions)
    const isDisabled = await closeAllButton.isDisabled();
    
    if (!isDisabled) {
      await closeAllButton.click();
      
      // Verify modal opens
      await expect(page.locator('text=Close All Sessions')).toBeVisible();
      await expect(page.locator('text=Are you sure you want to permanently close all active sessions?')).toBeVisible();
      await expect(page.locator('text=This action cannot be undone')).toBeVisible();
      await expect(page.locator('input[placeholder*="Reason for closing"]')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Close All Sessions")')).toBeVisible();
      
      // Close modal
      await page.locator('button:has-text("Cancel")').click();
      await expect(page.locator('text=Close All Sessions')).not.toBeVisible();
    }
  });

  test('Session status filtering edge cases', async ({ page }) => {
    // Test stuck sessions filter
    const statusFilter = page.locator('select');
    await statusFilter.selectOption('Stuck (5+ min)');
    await page.waitForTimeout(1000);
    
    // Should show only stuck sessions or no sessions
    const visibleSessions = page.locator('.session-card:visible');
    const count = await visibleSessions.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const status = await visibleSessions.nth(i).locator('.status').textContent();
        expect(status?.toLowerCase()).toContain('processing');
      }
    }
    
    // Reset to all sessions
    await statusFilter.selectOption('All Sessions');
    await page.waitForTimeout(1000);
  });

  test('Error handling and notifications', async ({ page }) => {
    // Test invalid search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('nonexistent-session-id-12345');
    await page.waitForTimeout(500);
    
    // Should show no sessions or appropriate message
    const visibleSessions = page.locator('.session-card:visible');
    const count = await visibleSessions.count();
    expect(count).toBe(0);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // Verify sessions are visible again
    await expect(page.locator('.session-card')).toHaveCount.greaterThan(0);
  });

  test('Responsive design and accessibility', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.session-manager')).toBeVisible();
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.session-manager')).toBeVisible();
    
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.session-manager')).toBeVisible();
    
    // Reset to default
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test focus indicators
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('API integration and data consistency', async ({ page }) => {
    // Test refresh functionality
    const refreshButton = page.locator('button:has-text("Refresh")');
    await refreshButton.click();
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000);
    
    // Verify sessions are still loaded
    await expect(page.locator('.session-card')).toHaveCount.greaterThan(0);
    
    // Test that session data is consistent
    const firstSession = page.locator('.session-card').first();
    const sessionId = await firstSession.locator('.session-id').textContent();
    const status = await firstSession.locator('.status').textContent();
    
    expect(sessionId).toBeTruthy();
    expect(status).toBeTruthy();
  });
});

test.describe('Phase 4 Backend API Tests', () => {
  test('Phase 4 API endpoints are accessible', async ({ request }) => {
    // Test admin analytics endpoint
    const analyticsResponse = await request.get(`${API_BASE_URL}/api/phase4/admin/sessions/analytics`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(analyticsResponse.status()).toBe(200);
    const analyticsData = await analyticsResponse.json();
    expect(analyticsData).toHaveProperty('total_sessions');
    expect(analyticsData).toHaveProperty('sessions_by_status');
  });

  test('Sessions API returns correct data structure', async ({ request }) => {
    const sessionsResponse = await request.get(`${API_BASE_URL}/api/sessions`, {
      headers: { 'x-dev-user': 'testuser' }
    });
    
    expect(sessionsResponse.status()).toBe(200);
    const sessionsData = await sessionsResponse.json();
    
    expect(sessionsData).toHaveProperty('sessions');
    expect(Array.isArray(sessionsData.sessions)).toBe(true);
    
    if (sessionsData.sessions.length > 0) {
      const firstSession = sessionsData.sessions[0];
      expect(firstSession).toHaveProperty('session_id');
      expect(firstSession).toHaveProperty('session_name');
      expect(firstSession).toHaveProperty('status');
      expect(firstSession).toHaveProperty('created_at');
      expect(firstSession).toHaveProperty('updated_at');
    }
  });
});


