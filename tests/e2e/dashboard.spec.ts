import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');
  });

  test('should display the dashboard view by default', async ({ page }) => {
    const dashboard = page.locator('#view-dashboard');
    await expect(dashboard).toBeVisible();
  });

  test('should show KPI cards', async ({ page }) => {
    const kpiFaturamento = page.locator('#kpiFaturamento');
    await expect(kpiFaturamento).toBeVisible();
  });

  test('should show the view title', async ({ page }) => {
    const title = page.locator('#viewTitle');
    await expect(title).toContainText('Dashboard');
  });

  test('should have navigation items', async ({ page }) => {
    const navItems = page.locator('.nav-item');
    const count = await navItems.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });
});
