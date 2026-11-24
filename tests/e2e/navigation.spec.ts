import { test, expect } from '@playwright/test';

test.describe('Full User Navigation Simulation', () => {
  test('complete navigation flow without errors', async ({ page }) => {
    test.setTimeout(60000);

    const jsErrors: string[] = [];
    const httpErrors: string[] = [];

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().includes('supabase')) {
        httpErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // 1. Login (load app)
    await page.goto('/?demo=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page).toHaveTitle(/ENERGIZA CRM/);

    // 2. Dashboard
    await page.locator('.nav-item[data-view="dashboard"]').click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('#viewTitle')).toContainText('Dashboard');

    // 3. Clientes (Parceiros)
    await page.locator('.nav-item[data-view="parceiros"]').click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('#viewTitle')).toContainText('Parceiros');

    // 4. Funil
    await page.locator('.nav-item[data-view="funil"]').click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('#viewTitle')).toContainText('Funil');

    // 5. Catálogo
    await page.locator('.nav-item[data-view="produtos"]').click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('#viewTitle')).toContainText('Catálogo');

    // 6. Gerador
    await page.locator('.nav-item[data-view="gerador"]').click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('#viewTitle')).toContainText('Gerador');

    // 7. Relatórios
    await page.locator('.nav-item[data-view="relatorios"]').click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('#viewTitle')).toContainText('Relatórios');

    // 8. Back to Dashboard
    await page.locator('.nav-item[data-view="dashboard"]').click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('#viewTitle')).toContainText('Dashboard');

    // Validate no blank screens
    await expect(page.locator('.content')).toBeVisible();

    console.log('=== NAVIGATION SIMULATION RESULTS ===');
    console.log(`JS Errors: ${jsErrors.length}`);
    jsErrors.forEach(e => console.log(`  - ${e}`));
    console.log(`HTTP Errors: ${httpErrors.length}`);
    httpErrors.forEach(e => console.log(`  - ${e}`));

    expect(jsErrors.length).toBe(0);
    expect(httpErrors.length).toBe(0);
  });
});

