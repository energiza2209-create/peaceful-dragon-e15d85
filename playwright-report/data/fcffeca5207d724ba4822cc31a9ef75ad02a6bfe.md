# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login Page >> should show login view when not authenticated
- Location: tests\e2e\login.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#view-login')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#view-login')
    12 × locator resolved to <section class="view" id="view-login"></section>
       - unexpected value "hidden"

```

```yaml
- main:
  - text: E
  - strong: ENERGIZA CRM
  - text: Gestão & Performance
  - navigation:
    - button "Dashboard":
      - img
      - text: Dashboard
    - button "Funil de Vendas":
      - img
      - text: Funil de Vendas
    - button "Gerar Proposta":
      - img
      - text: Gerar Proposta
    - button "Catálogo":
      - img
      - text: Catálogo
    - button "Relatórios":
      - img
      - text: Relatórios
    - button "Parceiros":
      - img
      - text: Parceiros
  - button "+ Nova Proposta"
  - button "EC Eng. Clínica Administrador":
    - text: EC
    - strong: Eng. Clínica
    - text: Administrador
    - img
  - heading "Dashboard Gerencial" [level=1]
  - paragraph: Visão geral do desempenho comercial
  - img
  - text: Faturamento Mensal
  - strong: R$ 0,00
  - text: ▼ 100% vs. mês anterior
  - img
  - text: Propostas Ativas
  - strong: R$ 149.829,00
  - text: 11 cotações em negociação
  - img
  - text: Taxa de Conversão
  - strong: 45.0%
  - text: 9 ganhas de 20 enviadas
  - img
  - text: Ticket Médio
  - strong: R$ 3.283,89
  - text: "Base: 9 propostas fechadas"
  - heading "Evolução de Vendas" [level=2]
  - text: Faturamento acumulado — mês atual vs. anterior
  - heading "Segmentação por Categoria" [level=2]
  - text: Distribuição das vendas ganhas
  - list:
    - 'listitem "Sensores de spo2 Adulto e neo: R$ 3.910,00"': Sensores de spo2 Adulto e neo
    - 'listitem "BOMBA DE VACUO, REGISTRO E VALVULA: R$ 3.655,00"': BOMBA DE VACUO, REGISTRO E VALVULA
    - 'listitem "Sensores de SPO2 NEO: R$ 1.060,00"': Sensores de SPO2 NEO
    - 'listitem "Leitor de codigo de barras: R$ 240,00"': Leitor de codigo de barras
    - 'listitem "Afastador Válvula Doyen: R$ 3.660,00"': Afastador Válvula Doyen
    - 'listitem "FERRAMENTAS: R$ 1.670,00"': FERRAMENTAS
    - 'listitem "Impressora zebra: R$ 8.610,00"': Impressora zebra
    - 'listitem "CESTO ACRÍLICO PARA BERÇO: R$ 6.400,00"': CESTO ACRÍLICO PARA BERÇO
    - 'listitem "Fonte ThinkCentre E73/M79 180W: R$ 350,00"': Fonte ThinkCentre E73/M79 180W
  - heading "Últimas Atividades" [level=2]
  - text: Cotações que mudaram de status recentemente
  - table:
    - rowgroup:
      - row "Proposta Cliente / Hospital Equipamento Valor Status":
        - columnheader "Proposta"
        - columnheader "Cliente / Hospital"
        - columnheader "Equipamento"
        - columnheader "Valor"
        - columnheader "Status"
    - rowgroup:
      - row "PROP-1102 IMED HEF - Insumos e Equipamentos (kit IMED HEF) Aparelho de Pressão Arterial Digital LA800 G-Tech +24 R$ 60.732,50 Cotação em Aberto":
        - cell "PROP-1102"
        - cell "IMED HEF - Insumos e Equipamentos (kit IMED HEF)":
          - strong: IMED HEF - Insumos e Equipamentos (kit IMED HEF)
        - cell "Aparelho de Pressão Arterial Digital LA800 G-Tech +24"
        - cell "R$ 60.732,50"
        - cell "Cotação em Aberto"
      - row "PROP-1101 IMED HMB - 69012 - Calibração e Testes (40 itens calibração) Calibração e teste de segurança elétrica de aparelho de anestesia +37 R$ 62.750,00 Cotação em Aberto":
        - cell "PROP-1101"
        - cell "IMED HMB - 69012 - Calibração e Testes (40 itens calibração)":
          - strong: IMED HMB - 69012 - Calibração e Testes (40 itens calibração)
        - cell "Calibração e teste de segurança elétrica de aparelho de anestesia +37"
        - cell "R$ 62.750,00"
        - cell "Cotação em Aberto"
      - row "PROP-1103 HOSPITAL MUNICIPAL DA BRASILÂNDIA Ima para marca-passo 60x24x12 ou 70x32x15 +6 R$ 1.048,00 Cotação em Aberto":
        - cell "PROP-1103"
        - cell "HOSPITAL MUNICIPAL DA BRASILÂNDIA":
          - strong: HOSPITAL MUNICIPAL DA BRASILÂNDIA
        - cell "Ima para marca-passo 60x24x12 ou 70x32x15 +6"
        - cell "R$ 1.048,00"
        - cell "Cotação em Aberto"
      - row "PROP-1106 IMED HMB - 69012 - Calibração e Testes (40 itens calibração) Calibração e teste de segurança elétrica de aparelho de anestesia +37 R$ 62.750,00 Em Negociação":
        - cell "PROP-1106"
        - cell "IMED HMB - 69012 - Calibração e Testes (40 itens calibração)":
          - strong: IMED HMB - 69012 - Calibração e Testes (40 itens calibração)
        - cell "Calibração e teste de segurança elétrica de aparelho de anestesia +37"
        - cell "R$ 62.750,00"
        - cell "Em Negociação"
      - row "PROP-1105 IMED HEF - 69062 - CELULAR A07 128GB Celular Samsung Galaxy A07 128Gb 4Gb RAM Preto R$ 1.350,00 Cotação em Aberto":
        - cell "PROP-1105"
        - cell "IMED HEF - 69062 - CELULAR A07 128GB":
          - strong: IMED HEF - 69062 - CELULAR A07 128GB
        - cell "Celular Samsung Galaxy A07 128Gb 4Gb RAM Preto"
        - cell "R$ 1.350,00"
        - cell "Cotação em Aberto"
- text: "Erro ao enviar propostas: Could not find the 'user_id' column of 'negociacoes' in the schema cache"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Login Page', () => {
  4  |   test('should show login view when not authenticated', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await page.waitForLoadState('domcontentloaded');
  7  |     await expect(page).toHaveTitle(/ENERGIZA CRM/);
  8  | 
  9  |     // Login view should be active
  10 |     const loginView = page.locator('#view-login');
> 11 |     await expect(loginView).toBeVisible();
     |                             ^ Error: expect(locator).toBeVisible() failed
  12 |   });
  13 | 
  14 |   test('should have login form elements', async ({ page }) => {
  15 |     await page.goto('/');
  16 |     await page.waitForLoadState('networkidle');
  17 |     await page.waitForTimeout(1000);
  18 | 
  19 |     const emailInput = page.locator('#loginEmail');
  20 |     await expect(emailInput).toBeVisible();
  21 | 
  22 |     const passwordInput = page.locator('#loginPassword');
  23 |     await expect(passwordInput).toBeVisible();
  24 | 
  25 |     const loginBtn = page.locator('#loginBtn');
  26 |     await expect(loginBtn).toBeVisible();
  27 |   });
  28 | 
  29 |   test('should have Supabase client initialized', async ({ page }) => {
  30 |     await page.goto('/');
  31 |     const hasClient = await page.evaluate(() => {
  32 |       return typeof (window as unknown as Record<string, unknown>).supabaseClient !== 'undefined';
  33 |     });
  34 |     expect(hasClient).toBeTruthy();
  35 |   });
  36 | 
  37 |   test('should have Auth service initialized', async ({ page }) => {
  38 |     await page.goto('/');
  39 |     const hasAuth = await page.evaluate(() => {
  40 |       return typeof (window as unknown as Record<string, unknown>).Auth !== 'undefined';
  41 |     });
  42 |     expect(hasAuth).toBeTruthy();
  43 |   });
  44 | 
  45 |   test('should load app in demo mode', async ({ page }) => {
  46 |     await page.goto('/?demo=true');
  47 |     await page.waitForLoadState('domcontentloaded');
  48 |     await page.waitForTimeout(1000);
  49 | 
  50 |     // Dashboard should be visible in demo mode
  51 |     const dashboard = page.locator('#view-dashboard');
  52 |     await expect(dashboard).toBeVisible();
  53 |   });
  54 | 
  55 |   test('should show dashboard in demo mode', async ({ page }) => {
  56 |     await page.goto('/?demo=true');
  57 |     await page.waitForLoadState('networkidle');
  58 |     await page.waitForTimeout(1000);
  59 | 
  60 |     const dashboard = page.locator('#view-dashboard');
  61 |     await expect(dashboard).toBeVisible();
  62 |   });
  63 | });
  64 | 
```