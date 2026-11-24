# Test Diagnostic Report — Sprint 2.5.1

**Data:** 2026-08-03  
**Objetivo:** Diagnosticar toda a suíte de testes antes da reestruturação

---

## Resumo Geral

| Métrica | Antes | Depois |
|---------|-------|--------|
| Arquivos de teste | 6 | 5 (+1 helper) |
| Total de testes | 79 | 78 |
| Testes passando | 79 | 78 |
| Erros ESLint | 5 warnings | 0 |
| Erros TypeScript | 0 | 0 |
| Exit code `npm test` | 1 | **0** |
| Teardown error | 1 (Unhandled) | **0** |
| JSDOM dependency | Sim | **Não** |

---

## Problemas Diagnosticados

### 1. [ENVIRONMENT] Vitest Teardown Error — `TypeError: Cannot convert undefined or null to object`

**Causa raiz:** Testes (`logger.test.ts`, `auth.test.ts`, `error-boundary.test.ts`) modificavam `globalThis.window` e `globalThis.console` diretamente via `eval()`. O vitest (environment: 'node') tenta restaurar `global2.console.Console` durante o teardown, mas encontra o objeto mockado sem a propriedade `Console`, causando o crash.

**Arquivos afetados:**
- `tests/unit/logger.test.ts` — `eval()` + `(globalThis as any).window = {...}`
- `tests/unit/auth.test.ts` — `eval()` + `(globalThis as any).window = {...}`
- `tests/unit/error-boundary.test.ts` — JSDOM + `(globalThis as any).window = dom.window`

**Classificação:** `[ENVIRONMENT]` — Erro causado pela interação entre testes e framework de teste, não pela aplicação.

**Solução:** Todos os testes agora usam `vm.runInContext()` com sandboxes isolados. Nenhuma modificação em `globalThis` é feita.

---

### 2. [TEST] `afterEach` não importado em `auth.test.ts`

**Arquivo:** `tests/unit/auth.test.ts:13`  
**Causa:** `afterEach` era usado mas não importado do vitest.  
**Classificação:** `[TEST]` — Erro no arquivo de teste.

---

### 3. [TEST] Variáveis não usadas em testes

**Arquivos:**
- `tests/unit/db-helper.test.ts:33` — `args` definido mas não usado
- `tests/unit/router-navigation.test.ts:116` — `args` definido mas não usado
- `tests/unit/router-navigation.test.ts:119` — `s` definido mas não usado

**Classificação:** `[TEST]` — Erros de código nos testes.

**Solução:** Prefixed com `_` para indicar intencionalmente não usados.

---

### 4. [TEST] Teste artificial — `placeholder.test.ts`

**Arquivo:** `tests/unit/placeholder.test.ts`  
**Causa:** Teste apenas verifica `1 + 1 === 2`. Não testa comportamento real da aplicação.  
**Classificação:** `[TEST]` — Viola ETAPA 6 (sem testes artificiais).

**Solução:** Arquivo removido.

---

### 5. [ENVIRONMENT] Coverage directory lint warnings

**Arquivos:** `coverage/block-navigation.js`, `coverage/lcov-report/block-navigation.js`  
**Causa:** Diretório de coverage gerado por v8 não estava no `.eslintignore`.  
**Classificação:** `[ENVIRONMENT]` — Configuração do ambiente de desenvolvimento.

**Solução:** `'coverage/**'` adicionado ao `ignores` do `eslint.config.js`.

---

## Classificação por Tipo

| Tipo | Quantidade | Status |
|------|-----------|--------|
| [TEST] | 4 | ✅ Corrigido |
| [ENVIRONMENT] | 2 | ✅ Corrigido |
| [APPLICATION] | 0 | N/A |

---

## Validação Final

| Check | Resultado |
|-------|-----------|
| Zero erros ESLint | ✅ 0 errors, 0 warnings |
| Zero erros TypeScript | ✅ 0 errors |
| Build OK | ✅ |
| `npm test` exit code 0 | ✅ |
| Nenhum teardown error | ✅ |
| Nenhum Unhandled Error | ✅ |
| Todos os testes aprovados | ✅ 78/78 |
| Nenhum arquivo da aplicação alterado | ✅ |
