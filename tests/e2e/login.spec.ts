import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should show login view when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/ENERGIZA CRM/);

    // Login view should be active
    const loginView = page.locator('#view-login');
    await expect(loginView).toBeVisible();
  });

  test('should have login form elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('#loginEmail');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('#loginPassword');
    await expect(passwordInput).toBeVisible();

    const loginBtn = page.locator('#loginBtn');
    await expect(loginBtn).toBeVisible();
  });

  test('should have Supabase client initialized', async ({ page }) => {
    await page.goto('/');
    const hasClient = await page.evaluate(() => {
      return typeof (window as unknown as Record<string, unknown>).supabaseClient !== 'undefined';
    });
    expect(hasClient).toBeTruthy();
  });

  test('should have Auth service initialized', async ({ page }) => {
    await page.goto('/');
    const hasAuth = await page.evaluate(() => {
      return typeof (window as unknown as Record<string, unknown>).Auth !== 'undefined';
    });
    expect(hasAuth).toBeTruthy();
  });

  test('should load app in demo mode', async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Dashboard should be visible in demo mode
    const dashboard = page.locator('#view-dashboard');
    await expect(dashboard).toBeVisible();
  });

  test('should show dashboard in demo mode', async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const dashboard = page.locator('#view-dashboard');
    await expect(dashboard).toBeVisible();
  });
});
