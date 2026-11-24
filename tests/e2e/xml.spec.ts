import { test, expect } from '@playwright/test';

test.describe('XML Import Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Parceiros and access sync tab', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const syncTab = page.locator('.tab[data-tab="sincronizacao"]');
    await syncTab.click();
    await expect(syncTab).toHaveClass(/active/);
  });

  test('should display sync buttons', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const syncTab = page.locator('.tab[data-tab="sincronizacao"]');
    await syncTab.click();
    const pullBtn = page.locator('#syncPullBtn');
    await expect(pullBtn).toBeVisible();
  });
});
