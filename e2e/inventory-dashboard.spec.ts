/**
 * @file inventory-dashboard.spec.ts
 * @description Inventory dashboard E2E tests
 */

import { test, expect } from './fixtures/auth';

test.describe('Inventory Dashboard', () => {
  test('should display dashboard with stats cards', async ({ inventarPage: page }) => {
    await page.goto('/inventar');

    // Wait for dashboard to load
    await page.waitForSelector('main', { timeout: 10000 });

    // Page should have loaded with some content
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should display seller breakdown table', async ({ inventarPage: page }) => {
    await page.goto('/inventar');

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 15000 });

    // Check table headers
    await expect(page.locator('text=Prodajalec')).toBeVisible();
    await expect(page.locator('th:has-text("Čisti")').or(page.locator('text=Čisti'))).toBeVisible();
    await expect(page.locator('th:has-text("Na testu")').or(page.locator('text=Na testu'))).toBeVisible();
  });

  test('should navigate to sidebar menu items', async ({ inventarPage: page }) => {
    await page.goto('/inventar');

    // Test navigation to different sections
    const menuItems = [
      { text: 'Prodajalci', url: '/inventar/sellers' },
      { text: 'Cenik', url: '/inventar/prices' },
      { text: 'Zemljevid', url: '/inventar/map' },
      { text: 'Prevzemi', url: '/inventar/pickups' },
    ];

    for (const item of menuItems) {
      const menuLink = page.locator(`a:has-text("${item.text}")`).first();
      if (await menuLink.isVisible()) {
        await menuLink.click();
        await expect(page).toHaveURL(new RegExp(item.url));
        await page.goto('/inventar'); // Go back to dashboard
      }
    }
  });

  test('should display urgent alerts section', async ({ inventarPage: page }) => {
    await page.goto('/inventar');

    // Check for urgent/alerts section (may or may not have items)
    const urgentSection = page.locator('text=Urgentno').or(page.locator('text=Za danes'));
    await expect(urgentSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state then content', async ({ inventarPage: page }) => {
    await page.goto('/inventar');

    // Either loading spinner or content should be visible
    const hasContent = await page.locator('table').or(page.locator('.animate-spin')).isVisible();
    expect(hasContent).toBeTruthy();

    // Eventually should show table
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Inventory Navigation', () => {
  test('should access QR codes page', async ({ inventarPage: page }) => {
    await page.goto('/inventar/qr-kode');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('should access map view', async ({ inventarPage: page }) => {
    await page.goto('/inventar/zemljevid');

    // Map should load - just check page loaded
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('should access accounts management', async ({ inventarPage: page }) => {
    await page.goto('/inventar/accounts');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('should access analytics page', async ({ inventarPage: page }) => {
    await page.goto('/inventar/analitika');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });
});
