import { test, expect } from '@playwright/test';

test.describe('Parceiros Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Parceiros view', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const viewTitle = page.locator('#viewTitle');
    await expect(viewTitle).toContainText('Parceiros');
  });

  test('should display tab bar with 3 tabs', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const tabs = page.locator('#parceirosTabs .tab');
    const count = await tabs.count();
    expect(count).toBe(3);
  });

  test('should switch to Produtos tab', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const produtosTab = page.locator('.tab[data-tab="produtos"]');
    await produtosTab.click();
    await expect(produtosTab).toHaveClass(/active/);
  });

  test('should switch to Sincronizacao tab', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const syncTab = page.locator('.tab[data-tab="sincronizacao"]');
    await syncTab.click();
    await expect(syncTab).toHaveClass(/active/);
  });

  test('should have reset data button', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const resetBtn = page.locator('#resetPartnersBtn');
    await expect(resetBtn).toBeVisible();
  });
});
