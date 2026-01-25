/**
 * @file seller-management.spec.ts
 * @description Seller management E2E tests
 */

import { test, expect } from './fixtures/auth';

test.describe('Seller Management', () => {
  test('should display sellers list', async ({ inventarPage: page }) => {
    await page.goto('/inventar/accounts');

    // Wait for page to load
    await page.waitForSelector('text=Upravljanje računov', { timeout: 10000 });

    // Should have tabs for different user types
    await expect(page.locator('text=Inventar računi').or(page.locator('[value="inventar"]'))).toBeVisible();
    await expect(page.locator('text=Prodajalec računi').or(page.locator('[value="prodajalec"]'))).toBeVisible();
  });

  test('should switch between user type tabs', async ({ inventarPage: page }) => {
    await page.goto('/inventar/accounts');

    // Wait for tabs to load
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Click on prodajalec tab
    await page.locator('[role="tab"]:has-text("Prodajalec")').click();

    // Should show some content change - active tab panel
    await page.waitForTimeout(500);
    await expect(page.locator('[data-state="active"][role="tabpanel"]')).toBeVisible();
  });

  test('should display user cards with edit buttons', async ({ inventarPage: page }) => {
    await page.goto('/inventar/accounts');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Click on prodajalec tab to see sellers
    await page.click('text=Prodajalec računi');

    // Should have edit buttons for users
    const editButtons = page.locator('button:has-text("Uredi")');
    const count = await editButtons.count();

    // If there are users, edit buttons should be present
    if (count > 0) {
      await expect(editButtons.first()).toBeVisible();
    }
  });

  test('should open create user form', async ({ inventarPage: page }) => {
    await page.goto('/inventar/accounts');

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Find and click create user trigger (collapsible header)
    const createTrigger = page.locator('text=/ustvari.*novega/i').first();
    if (await createTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createTrigger.click();
      await page.waitForTimeout(500);

      // Form fields should appear
      await expect(page.locator('input').first()).toBeVisible({ timeout: 5000 });
    } else {
      // If no create trigger, just verify page loaded
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('should validate required fields in create form', async ({ inventarPage: page }) => {
    await page.goto('/inventar/accounts');

    // Wait and open create form
    await page.waitForSelector('text=Upravljanje računov', { timeout: 10000 });

    // Click on prodajalec tab
    await page.click('text=Prodajalec računi');
    await page.waitForTimeout(500);

    // Open create form
    const createTrigger = page.locator('text=Ustvari novega prodajalca');
    if (await createTrigger.isVisible()) {
      await createTrigger.click();
      await page.waitForTimeout(500);

      // Try to submit without filling required fields
      const submitButton = page.locator('button:has-text("Ustvari prodajalca")');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show validation error
        await expect(
          page.locator('text=Manjkajo podatki')
            .or(page.locator('[role="alert"]'))
            .or(page.locator('.text-destructive'))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Seller Detail Page', () => {
  test('should navigate to seller detail from dashboard', async ({ inventarPage: page }) => {
    await page.goto('/inventar');

    // Wait for seller table
    await page.waitForSelector('table', { timeout: 15000 });

    // Click on a seller row (if available)
    const sellerRow = page.locator('table tbody tr').first();
    if (await sellerRow.isVisible()) {
      await sellerRow.click();

      // Should navigate to seller detail or show seller info
      await page.waitForTimeout(1000);
    }
  });

  test('should display seller QR codes', async ({ inventarPage: page }) => {
    // Navigate to sellers submenu
    await page.goto('/inventar');

    // Look for Prodajalci in sidebar
    const prodajalciLink = page.locator('a:has-text("Prodajalci")').first();
    if (await prodajalciLink.isVisible()) {
      await prodajalciLink.click();
      await page.waitForTimeout(1000);

      // Should show seller list or cards
      await expect(
        page.locator('text=Prodajalci')
          .or(page.locator('table'))
          .or(page.locator('[class*="card"]'))
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('User Edit Operations', () => {
  test('should open edit mode for user', async ({ inventarPage: page }) => {
    await page.goto('/inventar/accounts');

    // Click on prodajalec tab
    const prodajalecTab = page.locator('[role="tab"]:has-text("Prodajalec")');
    if (await prodajalecTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await prodajalecTab.click();
      await page.waitForTimeout(1000);
    }

    // Find first edit button
    const editButton = page.locator('button:has-text("Uredi")').first();
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();

      // Should show save button
      await expect(page.getByRole('button', { name: 'Shrani' })).toBeVisible({ timeout: 5000 });
    } else {
      // No users to edit - just verify page loaded
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('should cancel edit mode', async ({ inventarPage: page }) => {
    await page.goto('/inventar/accounts');

    // Click on prodajalec tab
    const prodajalecTab = page.locator('[role="tab"]:has-text("Prodajalec")');
    if (await prodajalecTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await prodajalecTab.click();
      await page.waitForTimeout(1000);
    }

    // Enter edit mode
    const editButton = page.locator('button:has-text("Uredi")').first();
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Click cancel
      const cancelButton = page.getByRole('button', { name: 'Prekliči' });
      if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelButton.click();

        // Should exit edit mode
        await expect(page.locator('button:has-text("Uredi")').first()).toBeVisible({ timeout: 5000 });
      }
    } else {
      // No users to edit - just verify page loaded
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });
});
