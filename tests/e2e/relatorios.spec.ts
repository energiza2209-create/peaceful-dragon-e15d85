import { test, expect } from '@playwright/test';

test.describe('Relatorios Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Relatorios view', async ({ page }) => {
    const relatoriosBtn = page.locator('.nav-item[data-view="relatorios"]');
    await relatoriosBtn.click();
    const viewTitle = page.locator('#viewTitle');
    await expect(viewTitle).toContainText('Relatórios');
  });

  test('should display filter controls', async ({ page }) => {
    const relatoriosBtn = page.locator('.nav-item[data-view="relatorios"]');
    await relatoriosBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const periodo = page.locator('#repPeriodo');
    await expect(periodo).toBeVisible();
  });

  test('should have apply filters button', async ({ page }) => {
    const relatoriosBtn = page.locator('.nav-item[data-view="relatorios"]');
    await relatoriosBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const applyBtn = page.locator('#repAplicar');
    await expect(applyBtn).toBeVisible();
  });

  test('should have backup button', async ({ page }) => {
    const relatoriosBtn = page.locator('.nav-item[data-view="relatorios"]');
    await relatoriosBtn.click();
    const backupBtn = page.locator('#repBackup');
    await expect(backupBtn).toBeVisible();
  });

  test('should display report table', async ({ page }) => {
    const relatoriosBtn = page.locator('.nav-item[data-view="relatorios"]');
    await relatoriosBtn.click();
    const repBody = page.locator('#repBody');
    await expect(repBody).toBeVisible();
  });
});
