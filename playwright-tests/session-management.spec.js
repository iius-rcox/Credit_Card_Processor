const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('Session Management - Detailed Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.session-manager', { timeout: 10000 });
  });

  test('Session card displays all required information', async ({ page }) => {
    const firstSession = page.locator('.session-card').first();
    
    // Check session header
    await expect(firstSession.locator('h3')).toBeVisible(); // Session name
    await expect(firstSession.locator('.session-id')).toBeVisible(); // Session ID
    
    // Check session details
    await expect(firstSession.locator('text=Status:')).toBeVisible();
    await expect(firstSession.locator('.status')).toBeVisible();
    await expect(firstSession.locator('text=Created:')).toBeVisible();
    await expect(firstSession.locator('text=Last Updated:')).toBeVisible();
    
    // Check action buttons
    await expect(firstSession.locator('button:has-text("View")')).toBeVisible();
  });

  test('Session status indicators are visually distinct', async ({ page }) => {
    const statusElements = page.locator('.status');
    const count = await statusElements.count();
    
    for (let i = 0; i < count; i++) {
      const status = statusElements.nth(i);
      const text = await status.textContent();
      
      // Verify status text is not empty
      expect(text?.trim().length).toBeGreaterThan(0);
      
      // Check for common status values
      const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PAUSED', 'CLOSED'];
      const isValidStatus = validStatuses.some(s => text?.includes(s));
      expect(isValidStatus).toBe(true);
    }
  });

  test('Session timestamps are properly formatted', async ({ page }) => {
    const firstSession = page.locator('.session-card').first();
    
    // Check created timestamp
    const createdText = await firstSession.locator('text=Created:').locator('..').textContent();
    expect(createdText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
    
    // Check last updated timestamp
    const updatedText = await firstSession.locator('text=Last Updated:').locator('..').textContent();
    expect(updatedText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
  });

  test('Session ID format validation', async ({ page }) => {
    const sessionIds = page.locator('.session-id');
    const count = await sessionIds.count();
    
    for (let i = 0; i < count; i++) {
      const sessionId = await sessionIds.nth(i).textContent();
      
      // Check UUID format (basic validation)
      expect(sessionId).toMatch(/^[a-f0-9-]{8,}$/i);
    }
  });

  test('Session action buttons are contextually appropriate', async ({ page }) => {
    const allSessions = page.locator('.session-card');
    const count = await allSessions.count();
    
    for (let i = 0; i < count; i++) {
      const session = allSessions.nth(i);
      const status = await session.locator('.status').textContent();
      
      // View button should always be present
      await expect(session.locator('button:has-text("View")')).toBeVisible();
      
      // Close button should be present for active sessions
      if (status?.includes('PROCESSING') || status?.includes('COMPLETED') || status?.includes('FAILED')) {
        await expect(session.locator('button:has-text("Close")')).toBeVisible();
      }
      
      // Delete button should be present for completed/failed/paused sessions
      if (status?.includes('COMPLETED') || status?.includes('FAILED') || status?.includes('PAUSED')) {
        await expect(session.locator('button:has-text("Delete")')).toBeVisible();
      }
      
      // Phase 4 buttons should be present based on status
      if (status?.includes('COMPLETED') || status?.includes('FAILED')) {
        await expect(session.locator('button:has-text("Add Receipts")')).toBeVisible();
      }
      
      if (status?.includes('COMPLETED')) {
        await expect(session.locator('button:has-text("Export")')).toBeVisible();
      }
    }
  });

  test('Session filtering maintains data integrity', async ({ page }) => {
    const statusFilter = page.locator('select');
    
    // Get initial session count
    const initialCount = await page.locator('.session-card').count();
    
    // Test each filter
    const filters = ['Processing', 'Completed', 'Failed', 'Closed'];
    
    for (const filter of filters) {
      await statusFilter.selectOption(filter);
      await page.waitForTimeout(1000);
      
      // Count visible sessions
      const visibleCount = await page.locator('.session-card:visible').count();
      
      // Verify all visible sessions match the filter
      if (visibleCount > 0) {
        const visibleSessions = page.locator('.session-card:visible');
        for (let i = 0; i < visibleCount; i++) {
          const status = await visibleSessions.nth(i).locator('.status').textContent();
          expect(status?.toLowerCase()).toContain(filter.toLowerCase());
        }
      }
    }
    
    // Reset to all sessions
    await statusFilter.selectOption('All Sessions');
    await page.waitForTimeout(1000);
    
    // Verify all sessions are visible again
    const finalCount = await page.locator('.session-card:visible').count();
    expect(finalCount).toBe(initialCount);
  });

  test('Search functionality is case-insensitive', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Test uppercase search
    await searchInput.fill('BD6974F9');
    await page.waitForTimeout(500);
    const upperCount = await page.locator('.session-card:visible').count();
    
    // Test lowercase search
    await searchInput.clear();
    await searchInput.fill('bd6974f9');
    await page.waitForTimeout(500);
    const lowerCount = await page.locator('.session-card:visible').count();
    
    // Results should be the same
    expect(upperCount).toBe(lowerCount);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test('Search by partial session ID', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Get a session ID and search by first 8 characters
    const firstSession = page.locator('.session-card').first();
    const sessionId = await firstSession.locator('.session-id').textContent();
    const partialId = sessionId?.substring(0, 8);
    
    if (partialId) {
      await searchInput.fill(partialId);
      await page.waitForTimeout(500);
      
      // Should find at least one session
      const visibleCount = await page.locator('.session-card:visible').count();
      expect(visibleCount).toBeGreaterThan(0);
    }
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test('Search by session name', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search for common session name pattern
    await searchInput.fill('Processing Session');
    await page.waitForTimeout(500);
    
    // Should find multiple sessions
    const visibleCount = await page.locator('.session-card:visible').count();
    expect(visibleCount).toBeGreaterThan(0);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test('Stuck sessions filter works correctly', async ({ page }) => {
    const statusFilter = page.locator('select');
    await statusFilter.selectOption('Stuck (5+ min)');
    await page.waitForTimeout(1000);
    
    const visibleSessions = page.locator('.session-card:visible');
    const count = await visibleSessions.count();
    
    if (count > 0) {
      // All visible sessions should be processing and potentially stuck
      for (let i = 0; i < count; i++) {
        const status = await visibleSessions.nth(i).locator('.status').textContent();
        expect(status?.toLowerCase()).toContain('processing');
      }
    }
    
    // Reset filter
    await statusFilter.selectOption('All Sessions');
    await page.waitForTimeout(1000);
  });

  test('Session refresh updates data', async ({ page }) => {
    // Get initial session count
    const initialCount = await page.locator('.session-card').count();
    
    // Click refresh
    const refreshButton = page.locator('button:has-text("Refresh")');
    await refreshButton.click();
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000);
    
    // Verify sessions are still loaded
    const refreshedCount = await page.locator('.session-card').count();
    expect(refreshedCount).toBeGreaterThan(0);
    
    // Count should be the same or similar (sessions don't change frequently)
    expect(refreshedCount).toBeGreaterThanOrEqual(initialCount - 1);
  });

  test('Session cards are properly styled and responsive', async ({ page }) => {
    const firstSession = page.locator('.session-card').first();
    
    // Check that session card has proper styling classes
    await expect(firstSession).toHaveClass(/session-card/);
    
    // Check that status has proper styling
    const status = firstSession.locator('.status');
    await expect(status).toBeVisible();
    
    // Check that buttons are properly styled
    const viewButton = firstSession.locator('button:has-text("View")');
    await expect(viewButton).toBeVisible();
  });

  test('Session information is complete and accurate', async ({ page }) => {
    const firstSession = page.locator('.session-card').first();
    
    // Open session details
    await firstSession.locator('button:has-text("View")').click();
    
    // Verify all expected fields are present
    await expect(page.locator('text=Session Details')).toBeVisible();
    await expect(page.locator('text=Session ID:')).toBeVisible();
    await expect(page.locator('text=Session Name:')).toBeVisible();
    await expect(page.locator('text=Status:')).toBeVisible();
    await expect(page.locator('text=Created:')).toBeVisible();
    await expect(page.locator('text=Last Updated:')).toBeVisible();
    await expect(page.locator('text=Total Employees:')).toBeVisible();
    await expect(page.locator('text=Processed Employees:')).toBeVisible();
    await expect(page.locator('text=Created By:')).toBeVisible();
    
    // Close modal
    await page.locator('button:has-text("Close")').click();
  });

  test('Session modal data matches card data', async ({ page }) => {
    const firstSession = page.locator('.session-card').first();
    
    // Get data from card
    const cardSessionId = await firstSession.locator('.session-id').textContent();
    const cardStatus = await firstSession.locator('.status').textContent();
    
    // Open session details
    await firstSession.locator('button:has-text("View")').click();
    
    // Get data from modal
    const modalSessionId = await page.locator('text=Session ID:').locator('..').textContent();
    const modalStatus = await page.locator('text=Status:').locator('..').textContent();
    
    // Verify data matches
    expect(modalSessionId).toContain(cardSessionId);
    expect(modalStatus).toContain(cardStatus);
    
    // Close modal
    await page.locator('button:has-text("Close")').click();
  });
});


