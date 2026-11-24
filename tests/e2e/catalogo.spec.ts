import { test, expect } from '@playwright/test';

test.describe('Catalogo Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Produtos view', async ({ page }) => {
    const produtosBtn = page.locator('.nav-item[data-view="produtos"]');
    await produtosBtn.click({ force: true });
    const viewTitle = page.locator('#viewTitle');
    await page.waitForTimeout(500);
    await expect(viewTitle).toContainText('Catálogo');
  });

  test('should display products table', async ({ page }) => {
    const produtosBtn = page.locator('.nav-item[data-view="produtos"]');
    await produtosBtn.click({ force: true });
    await page.waitForTimeout(500);
    const tbody = page.locator('#produtosBody');
    await expect(tbody).toHaveCount(1);
  });

  test('should have add product button', async ({ page }) => {
    const produtosBtn = page.locator('.nav-item[data-view="produtos"]');
    await produtosBtn.click();
    const addBtn = page.locator('#prodAddBtn');
    await expect(addBtn).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    const produtosBtn = page.locator('.nav-item[data-view="produtos"]');
    await produtosBtn.click();
    const search = page.locator('#prodBusca');
    await expect(search).toHaveCount(1);
  });
});
