import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test('should display properly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone 12 size
    
    // Check that the page loads without horizontal scroll
    const body = await page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(375);
    
    // Check that all elements are visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that all buttons have minimum 44px height and width
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should navigate between pages on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test navigation to complaint form
    await page.click('text=تقديم شكوى');
    await expect(page).toHaveURL(/.*complaint-form/);
    
    // Test navigation back to home
    await page.click('text=الرئيسية');
    await expect(page).toHaveURL('/');
  });

  test('should handle form inputs on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to complaint form
    await page.goto('/complaint-form');
    
    // Test form inputs
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="phone"]', '01000000001');
    await page.fill('input[name="nationalId"]', '12345678901234');
    await page.fill('input[name="title"]', 'Test Complaint');
    await page.fill('textarea[name="description"]', 'Test description');
    
    // Verify inputs are filled
    await expect(page.locator('input[name="fullName"]')).toHaveValue('Test User');
    await expect(page.locator('input[name="phone"]')).toHaveValue('01000000001');
  });

  test('should handle file uploads on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/complaint-form');
    
    // Test file upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/test-image.jpg');
    
    // Verify file is selected
    await expect(page.locator('input[type="file"]')).toHaveValue(/test-image\.jpg/);
  });

  test('should display complaint list on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as citizen
    await page.goto('/citizen-login');
    await page.fill('input[name="phone"]', '01000000004');
    await page.fill('input[name="nationalId"]', '12345678901237');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*citizen-dashboard/);
    
    // Check that complaints are displayed in a mobile-friendly format
    await expect(page.locator('.complaint-card')).toBeVisible();
  });

  test('should handle admin dashboard on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'emanhassanmahmoud1@gmail.com');
    await page.fill('input[name="password"]', 'Emovmmm#951753');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to admin dashboard
    await page.waitForURL(/.*admin-dashboard/);
    
    // Check that admin features are accessible on mobile
    await expect(page.locator('.admin-controls')).toBeVisible();
    
    // Test status change functionality
    const statusButtons = await page.locator('.status-change-btn').all();
    if (statusButtons.length > 0) {
      await statusButtons[0].click();
      await expect(page.locator('.status-modal')).toBeVisible();
    }
  });

  test('should handle responsive navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that navigation is mobile-friendly
    const navItems = await page.locator('nav button').all();
    expect(navItems.length).toBeGreaterThan(0);
    
    // Test that navigation items are clickable
    for (const item of navItems) {
      await expect(item).toBeVisible();
      await expect(item).toBeEnabled();
    }
  });

  test('should handle form validation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/complaint-form');
    
    // Try to submit without required fields
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should handle search functionality on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'emanhassanmahmoud1@gmail.com');
    await page.fill('input[name="password"]', 'Emovmmm#951753');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*admin-dashboard/);
    
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="بحث"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // Check that search results are displayed
      await expect(page.locator('.search-results')).toBeVisible();
    }
  });

  test('should handle status filtering on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'emanhassanmahmoud1@gmail.com');
    await page.fill('input[name="password"]', 'Emovmmm#951753');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*admin-dashboard/);
    
    // Test status filter
    const statusFilter = page.locator('select[name="status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('UNRESOLVED');
      
      // Check that filtered results are displayed
      await expect(page.locator('.filtered-results')).toBeVisible();
    }
  });

  test('should handle responsive tables', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'emanhassanmahmoud1@gmail.com');
    await page.fill('input[name="password"]', 'Emovmmm#951753');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*admin-dashboard/);
    
    // Check that tables are responsive
    const tables = await page.locator('table').all();
    for (const table of tables) {
      const tableBox = await table.boundingBox();
      if (tableBox) {
        // Table should not exceed viewport width
        expect(tableBox.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should handle mobile keyboard input', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/complaint-form');
    
    // Test keyboard input on mobile
    const titleInput = page.locator('input[name="title"]');
    await titleInput.focus();
    await titleInput.type('Test Title');
    
    // Verify input works correctly
    await expect(titleInput).toHaveValue('Test Title');
  });

  test('should handle mobile gestures', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test scroll functionality
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });
    
    // Test touch interactions
    const buttons = await page.locator('button').all();
    if (buttons.length > 0) {
      await buttons[0].tap();
      // Verify button responds to touch
      await expect(buttons[0]).toHaveClass(/active/);
    }
  });
});
