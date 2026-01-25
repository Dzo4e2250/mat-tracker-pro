/**
 * @file auth.ts
 * @description Authentication fixtures for E2E tests
 */

import { test as base, Page } from '@playwright/test';

// Test user credentials (use test accounts, not production!)
export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@test.local',
    password: process.env.E2E_ADMIN_PASSWORD || 'testpass123',
  },
  inventar: {
    email: process.env.E2E_INVENTAR_EMAIL || 'inventar@test.local',
    password: process.env.E2E_INVENTAR_PASSWORD || 'testpass123',
  },
  prodajalec: {
    email: process.env.E2E_PRODAJALEC_EMAIL || 'prodajalec@test.local',
    password: process.env.E2E_PRODAJALEC_PASSWORD || 'testpass123',
  },
};

/**
 * Login helper function
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation away from login
  await page.waitForURL(/\/(inventar|prodajalec)/, { timeout: 15000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  // Find and click logout button
  const logoutButton = page.locator('text=Odjava').or(page.locator('[aria-label="Logout"]'));
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('/');
  }
}

// Extended test fixture with authenticated page
type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  inventarPage: Page;
  prodajalecPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await use(page);
  },

  inventarPage: async ({ page }, use) => {
    await login(page, TEST_USERS.inventar.email, TEST_USERS.inventar.password);
    await use(page);
  },

  prodajalecPage: async ({ page }, use) => {
    await login(page, TEST_USERS.prodajalec.email, TEST_USERS.prodajalec.password);
    await use(page);
  },
});

export { expect } from '@playwright/test';
