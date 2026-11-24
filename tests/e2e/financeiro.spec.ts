import { test, expect } from '@playwright/test';

test.describe('Financeiro Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard with financial KPIs', async ({ page }) => {
    const kpiFaturamento = page.locator('#kpiFaturamento');
    await expect(kpiFaturamento).toBeVisible();
  });

  test('should have Relatorios view with financial data', async ({ page }) => {
    const relatoriosBtn = page.locator('.nav-item[data-view="relatorios"]');
    await relatoriosBtn.click({ force: true });
    await page.waitForTimeout(500);
    const viewTitle = page.locator('#viewTitle');
    await expect(viewTitle).toContainText('Relatórios');
  });

  test('should show report KPIs', async ({ page }) => {
    const relatoriosBtn = page.locator('.nav-item[data-view="relatorios"]');
    await relatoriosBtn.click();
    const totalAprovado = page.locator('#repTotalAprovado');
    await expect(totalAprovado).toBeVisible();
  });
});
