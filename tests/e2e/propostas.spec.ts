import { test, expect } from '@playwright/test';

test.describe('Propostas Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Funil view', async ({ page }) => {
    const funilBtn = page.locator('.nav-item[data-view="funil"]');
    await funilBtn.click({ force: true });
    const viewTitle = page.locator('#viewTitle');
    await page.waitForTimeout(500);
    await expect(viewTitle).toContainText('Funil');
  });

  test('should display the kanban board', async ({ page }) => {
    const funilBtn = page.locator('.nav-item[data-view="funil"]');
    await funilBtn.click({ force: true });
    await page.waitForTimeout(500);
    const kanban = page.locator('#kanban');
    await expect(kanban).toBeVisible();
  });

  test('should have kanban columns', async ({ page }) => {
    const funilBtn = page.locator('.nav-item[data-view="funil"]');
    await funilBtn.click();
    const columns = page.locator('.kanban-col');
    const count = await columns.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('should have a search input', async ({ page }) => {
    const funilBtn = page.locator('.nav-item[data-view="funil"]');
    await funilBtn.click();
    const search = page.locator('#funilBusca');
    await expect(search).toBeVisible();
  });

  test('should enable save proposal button in generator', async ({ page }) => {
    await page.locator('.nav-item[data-view="gerador"]').click({ force: true });
    const saveBtn = page.locator('#gpSalvarFunil');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
  });

  test('should open proposal emission modal from funil card', async ({ page }) => {
    await page.locator('.nav-item[data-view="funil"]').click({ force: true });
    const pdfButton = page.locator('#kanban [data-act="pdf"]').first();
    await expect(pdfButton).toBeVisible();
    await pdfButton.click({ force: true });
    await expect(page.locator('#modalTitle')).toContainText('Selecionar Tipo de Proposta');
  });
});
