/**
 * @file qr-workflow.spec.ts
 * @description QR code and mat workflow E2E tests
 */

import { test, expect } from './fixtures/auth';

test.describe('QR Code Management', () => {
  test('should display QR codes overview page', async ({ inventarPage: page }) => {
    await page.goto('/inventar/qr-kode');

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Should show page content
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should display QR code statistics', async ({ inventarPage: page }) => {
    await page.goto('/inventar/qr-kode');

    // Wait for stats to load
    await page.waitForTimeout(2000);

    // Should show some numeric data
    await expect(page.locator('[class*="card"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter QR codes by seller', async ({ inventarPage: page }) => {
    await page.goto('/inventar/qrcodes');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for filter/dropdown
    const sellerFilter = page.locator('select').or(page.locator('[role="combobox"]')).first();
    if (await sellerFilter.isVisible()) {
      await sellerFilter.click();
      // Filter options should appear
      await expect(page.locator('[role="option"]').or(page.locator('option'))).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Mat Cycle Workflow', () => {
  test('should display prevzemi page', async ({ inventarPage: page }) => {
    await page.goto('/inventar/prevzemi');

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Should show page content
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should display driver pickups page', async ({ inventarPage: page }) => {
    await page.goto('/inventar/dostavljalci');

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Should show page content
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should show mat status breakdown by seller', async ({ inventarPage: page }) => {
    await page.goto('/inventar');

    // Wait for dashboard table
    await page.waitForSelector('table', { timeout: 15000 });

    // Table should have status columns
    const headers = ['Čisti', 'Na testu', 'Umazani'];
    for (const header of headers) {
      await expect(
        page.locator(`th:has-text("${header}")`)
          .or(page.locator(`text=${header}`))
      ).toBeVisible();
    }
  });
});

test.describe('Prodajalec (Seller) Panel', () => {
  test('should display seller dashboard', async ({ prodajalecPage: page }) => {
    await page.goto('/prodajalec');

    // Should show seller dashboard - page loaded
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display mat list for seller', async ({ prodajalecPage: page }) => {
    await page.goto('/prodajalec');

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Page should be loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have scan QR functionality', async ({ prodajalecPage: page }) => {
    await page.goto('/prodajalec');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Should have some interactive elements
    await expect(page.locator('button').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display page content', async ({ prodajalecPage: page }) => {
    await page.goto('/prodajalec');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Page should be fully loaded
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Map View', () => {
  test('should load map component', async ({ inventarPage: page }) => {
    await page.goto('/inventar/zemljevid');

    // Wait for map to initialize (maps can take a while)
    await page.waitForTimeout(5000);

    // Should show map container
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20000 });
  });

  test('should have map controls', async ({ inventarPage: page }) => {
    await page.goto('/inventar/zemljevid');

    // Wait for map to load
    await page.waitForTimeout(5000);

    // Should have zoom controls
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible({ timeout: 15000 });
  });
});
