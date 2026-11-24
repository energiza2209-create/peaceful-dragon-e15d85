# Sprint 2.5 — Relatório de Análise de Warnings ESLint

**Data:** 2026-08-02
**Total de warnings:** 62 (31 únicos × 2 regras duplicadas)

---

## Classificação por Categoria

### 1. Parâmetros não utilizados em catch/event handlers — 18 ocorrências

| Arquivo | Linha | Parâmetro | Ação |
|---------|-------|-----------|------|
| data.js | 156 | `e` | Renomear para `_` |
| data.js | 253 | `_e` | Já usa `_`, renomear para `_` |
| data.js | 363 | `_e` | Já usa `_`, renomear para `_` |
| data.js | 881 | `e` | Renomear para `_` |
| shared/audit.js | 95 | `e` | Renomear para `_` |
| shared/audit.js | 118 | `e` | Renomear para `_` |
| shared/audit.js | 236 | `e` | Renomear para `_` |
| shared/auth.js | 331 | `e` | Renomear para `_` |
| shared/auth.js | 339 | `e` | Renomear para `_` |
| shared/auth.js | 350 | `e` | Renomear para `_` |
| shared/auth.js | 363 | `e` | Renomear para `_` |
| views/funil.js | 645 | `e` | Renomear para `_` |
| views/gerador.js | 45 | `e` | Renomear para `_` |
| views/gerador.js | 49 | `e` | Renomear para `_` |
| views/gerador.js | 301 | `e` | Renomear para `_` |
| views/gerador.js | 439 | `e` | Renomear para `_` |
| views/parceiros.js | 44 | `e` | Renomear para `_` |
| views/relatorios.js | 149 | `e` | Renomear para `_` |

### 2. Código morto / Variáveis não utilizadas — 7 ocorrências

| Arquivo | Linha | Identificador | Classificação | Ação |
|---------|-------|---------------|---------------|------|
| data.js | 32 | `setCurrentUser` | Código morto | Remover |
| data.js | 172 | `_remoteCanonical` | Código morto | Remover |
| views/parceiros.js | 356 | `openCsvModal` | Código morto | Remover |
| views/parceiros.js | 387 | `openNfeModal` | Código morto | Remover |
| views/funil.js | 319 | `docInfo` | Código morto | Remover |
| views/gerador.js | 291 | `prop` (param) | Parâmetro não usado | Renomear para `_prop` |
| views/gerador.js | 410 | `projetoTxt` | Variável não utilizada | Remover |

### 3. Falsos positivos (globals usados em outros arquivos) — 6 ocorrências

| Arquivo | Linha | Identificador | Motivo | Ação |
|---------|-------|---------------|--------|------|
| app.js | 13 | `BRL` | Usado 36x em 6 views | Nenhuma (global intencional) |
| app.js | 14 | `fmtDate` | Usado 14x em 3 views | Nenhuma (global intencional) |
| app.js | 15 | `escapeHtml` | Usado 100+ vezes | Nenhuma (global intencional) |
| app.js | 25 | `successBurst` | Usado em funil.js:167 | Nenhuma (global intencional) |
| data.js | 13 | `DB` | Usado em todos os arquivos | Nenhuma (global intencional) |
| views/parceiros.js | 456 | `code` | Parâmetro em callback | Nenhuma (padrão de callback) |

---

## Resumo de Ações

| Ação | Quantidade |
|------|-----------|
| Renomear `e` → `_` (catch/handlers) | 18 |
| Remover código morto | 5 |
| Renomear parâmetro não usado | 1 |
| Remover variável não utilizada | 1 |
| Falsos positivos (não alterar) | 6 |
| **Total de warnings corrigidos** | **25** |
| **Warnings restantes (falsos positivos)** | **6** |
