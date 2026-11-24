import { test, expect } from '@playwright/test';

test.describe('Clientes Page', () => {
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

  test('should display the Parceiros content container', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const content = page.locator('#parceirosContent');
    await expect(content).toBeVisible();
  });

  test('should have tab bar with Clientes tab', async ({ page }) => {
    const parceirosBtn = page.locator('.nav-item[data-view="parceiros"]');
    await parceirosBtn.click();
    const clientesTab = page.locator('.tab[data-tab="clientes"]');
    await expect(clientesTab).toBeVisible();
  });
});
