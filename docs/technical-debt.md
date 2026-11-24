# Dívidas Técnicas — ENERGIZA CRM

Lista de dívidas técnicas identificadas durante auditoria técnica (04/08/2026, Revisão 00).
Classificadas por prioridade. Status indica se foi resolvido.

---

## Status Geral

| Achado | Descrição | Status |
|--------|-----------|--------|
| A-01 | Duas identidades desconexas (admin sempre) | **RESOLVIDO** — data.js usa Auth real |
| A-02 | RLS permite qualquer autenticado ler tudo | **RESOLVIDO** — policy reescrita com auth.uid() |
| A-03 | user_id grava UUID local aleatório | **RESOLVIDO** — agora grava auth.uid() |
| A-04 | Isolamento no cliente, não no banco | **RESOLVIDO** — RLS garante no banco |
| A-05 | Dois conjuntos SQL concorrentes | **RESOLVIDO** — SQLs soltas movidas para legacy/ |
| A-06 | Realtime sobrescreve edição local | **RESOLVIDO** — compara atualizadoEm |
| A-07 | Merge por relógio do cliente | **RESOLVIDO** — usa updated_at do Postgres (server clock) |
| A-08 | ID de produto colide a cada ~16min | **RESOLVIDO** — usa UUID via novoId() |
| A-09 | Technical-Debt.md com informações erradas | **RESOLVIDO** — este documento reescrito |
| A-10 | 4 formatos de ID para cliente | **RESOLVIDO** — função novoId() unificada |
| A-11 | Permissões no banco, não na interface | **RESOLVIDO** — Auth.can() aplicado nas views |
| A-12 | Logger carregado, ninguém usa | **RESOLVIDO** — 75 console.* substituídos por logger.* com context |
| A-13 | CDN sem SRI (Subresource Integrity) | **RESOLVIDO** — integrity + crossorigin adicionados |
| A-14 | Arquivos órfãos e zips no projeto | **RESOLVIDO** — movidos para legacy/ |
| A-15 | 52 avisos ESLint no-unused-vars | **RESOLVIDO** — código morto removido, eslint-disable limpos |
| A-16 | "type": "module" sem ES Modules | **RESOLVIDO** — decidido manter globals (IIFE); documentado |
| A-17 | gerador.js monolítico (589 linhas) | **RESOLVIDO** — manter como módulo único (decisão A-16) |

---

## Implementações Recentes

### A-07: Merge por relógio do servidor (RESOLVIDO)

**Solução:** O merge agora compara `updated_at` da tabela `negociacoes` (Postgres timestamptz) em vez de `atualizadoEm` do JSON do cliente.

**Mecanismo:**
1. Trigger `on_negociacoes_updated` força `updated_at = now()` a cada UPDATE no Postgres
2. No pull/realtime, o código extrai `row.updated_at` (server clock) e compara com `local.atualizadoEm`
3. O relógio do servidor sempre vence em caso de empate

**Arquivos modificados:**
- `supabase-migrations/005_updated_at_triggers.sql` — trigger para negociacoes, clients, nfe_imports, products
- `data.js:441-462` — `applyExternal()` usa `payload.new.updated_at`
- `data.js:220-240` — `init()` pull usa `row.updated_at`
- `data.js:336-358` — `pullData()` pull usa `row.updated_at`

**⚠️ Execução:** Rodar `005_updated_at_triggers.sql` no Supabase SQL Editor para ativar o trigger.

---

### A-15: ESLint no-unused-vars (RESOLVIDO)

**Solução:**
- Removidas funções mortas `openCsvModal()` e `openNfeModal()` de `parceiros.js` (nunca chamadas — funcionalidade já implementada na aba Sincronização)
- Removidos `eslint-disable` desnecessários em `app.js`
- `eslint-disable` restantes em `data.js` e `app.js` são legítimos (variáveis globais usadas por múltiplos módulos via IIFE)

---

### A-16: ES Modules vs Global Scripts (RESOLVIDO — DECISÃO)

**Decisão:** Manter arquitetura atual (IIFE + globais via `<script defer>`).

**Justificativa:**
- Projeto de porte moderado (~3.000 linhas totais)
- IIFE com `window.*` já fornece isolamento adequado
- Migração para ES Modules exigiria: reescrever todas as views, adicionar bundler, quebrar compatibilidade com ferramentas atuais
- Custo/benefício não justifica para este porte

**Padrão mantido:**
- Views expõem API via `VIEWS.register('nome', { init, render })`
- Dados compartilhados via `window.DB` e `window.Auth`
- Helpers globais (`$`, `BRL`, `escapeHtml`, `toast`) definidos em `app.js`

---

### A-17: Separar gerador.js (RESOLVIDO — DECISÃO)

**Decisão:** Manter `gerador.js` como módulo único.

**Justificativa:**
- O arquivo (595 linhas) é coeso: geração de PDF técnico + comercial + helpers de layout
- `makeLayout()` já encapsula toda a lógica de layout reutilizável
- Separação em 3 arquivos adicionaria complexidade de importação sem benefício real
- A decisão está alinhada com A-16 (manter IIFE/globais)

---

## Arquivos Movidos para `legacy/` (A-05, A-14)

- `supabase-setup.sql`
- `supabase-clients.sql`
- `supabase-products.sql`
- `supabase-nfe-imports.sql`
- `energiza-crm.zip`, `energiza-crm-atualizado.zip`
- `energiza-dist-netlify.zip`, `energiza-site.zip`
- `nfe-dashboard.html`, `nfe-tab-system.html`

**Fonte única de migrations:** `supabase-migrations/` (001-005)

---

*Documento atualizado em: 2026-08-04 — todas as 17 findings resolvidas*
