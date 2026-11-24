# Roadmap — ENERGIZA CRM

## Visão Geral

Desenvolvimento em 12 Sprints, cobrindo todas as fases do projeto.

## Marcos

### M1 — Fundação (Sprint 1)
Infraestrutura de desenvolvimento, documentação, testes.

### M2 — Segurança (Sprint 2)
Autenticação, RLS, CSP. Dados isolados por usuário.

### M3 — Infraestrutura (Sprints 3, 4)
Banco de dados melhorado, arquitetura modular, migrations versionadas.

### M4 — Funcionalidades Core (Sprints 5, 6, 7, 8)
Catálogo, Clientes, Parceiros, Import XML.

### M5 — Propostas (Sprint 9)
Propostas completas com PDF.

### M6 — Analytics (Sprints 10, 11, 12)
Dashboard, Financeiro, Relatórios.

---

## Sprints Detalhadas

| # | Sprint | Fase | Dependências | Estimativa | Status |
|---|--------|------|-------------|-----------|--------|
| 1 | Foundation | Infraestrutura | Nenhuma | 8-10h | ✅ Completa |
| 2 | Segurança | Fase 1 | Sprint 1 | 6-8h | Pendente |
| 3 | Banco de Dados | Fase 3 | Sprint 1 | 8-10h | Pendente |
| 4 | Arquitetura Modular | Fase 2 | Sprints 2, 3 | 10-13h | Pendente |
| 5 | Catálogo | Fase 4 | Sprints 3, 4 | 4-5h | Pendente |
| 6 | Clientes | Fase 5 | Sprints 3, 4 | 4-5h | Pendente |
| 7 | Parceiros | Fase 7 | Sprint 6 | 5-6h | Pendente |
| 8 | Import XML | Fase 8 | Sprints 5, 6 | 3-4h | Pendente |
| 9 | Propostas | Fase 6 | Sprints 5, 6, 7, 8 | 6-8h | Pendente |
| 10 | Dashboard | Fase 10 | Sprint 9 | 4-5h | Pendente |
| 11 | Financeiro | Fase 9 | Sprint 9 | 3-4h | Pendente |
| 12 | Relatórios | Fase 11 | Sprints 10, 11 | 4-5h | Pendente |

**Total estimado:** 65-83 horas

---

## Fluxo de Dependências

```
Sprint 1 (Foundation) ✅
    │
    ├──→ Sprint 2 (Segurança) ──→ Sprint 4 (Arquitetura) ──→ Sprint 5 (Catálogo) ──┐
    │                                                                                  │
    └──→ Sprint 3 (Banco) ──────────────────────────────────────────────────────────→┤
                                                                                      │
                            Sprint 6 (Clientes) ←── Sprints 3, 4 ────────────────────┤
                                │                                                     │
                                ├──→ Sprint 7 (Parceiros) ──────────────────────────┤
                                │                                                     │
                                └──→ Sprint 8 (Import XML) ─────────────────────────┤
                                                                                      │
                                    Sprint 9 (Propostas) ←──────────────────────────┘
                                        │
                                        ├──→ Sprint 10 (Dashboard) → Sprint 12 (Relatórios)
                                        │
                                        └──→ Sprint 11 (Financeiro) → Sprint 12 (Relatórios)
```

---

## Sprint Atual

### Sprint 1 — Foundation ✅ COMPLETA

- [x] Documentação completa (12 arquivos .md)
- [x] Regras do projeto (PROJECT_RULES.md)
- [x] Ambiente DEV (Vitest, Playwright, ESLint, Prettier)
- [x] Testes E2E básicos (32 testes, 100% pass)
- [x] Serviço de Logs (shared/logger.js)
- [x] Error Boundary (shared/error-boundary.js)
- [x] Build e validação
- [x] Architecture Decisions (docs/Architecture-Decisions.md)
- [x] Technical Debt (docs/Technical-Debt.md)
- [x] Test Checklist (docs/Test-Checklist.md)
- [x] System Health (docs/System-Health.md)

---

## Próximas Sprints

### Sprint 2 — Segurança (Fase 1)
- Autenticação Supabase (email/password)
- RLS com `auth.uid()` em todas as tabelas
- Tela de login funcional
- Logout funcional
- Isolamento de dados por usuário
- Atualizar RLS policies de `USING (true)` para `auth.uid()`
- Resolver vulnerabilidades npm

**Arquivos afetados:**
- `supabase-setup.sql` — RLS policies
- `supabase-clients.sql` — RLS policies
- `supabase-products.sql` — RLS policies
- `supabase-nfe-imports.sql` — RLS policies
- `app.js` — Auth flow
- `index.html` — Tela de login
- `data.js` — User identity

**Critérios de aceite:**
- [ ] Login funcional com email/senha
- [ ] RLS policies usando `auth.uid()`
- [ ] Dados isolados por usuário
- [ ] Logout funcional
- [ ] 0 erros de lint/typecheck/test

---

### Sprint 3 — Banco de Dados (Fase 3)
- Migrations versionadas em `supabase/migrations/`
- Formato: `YYYYMMDD_HHMMSS_descricao.sql`
- Todas idempotentes (`IF NOT EXISTS`)
- Índices otimizados
- Views materializadas (quando necessário)

**Arquivos afetados:**
- `supabase/migrations/` — Novo diretório
- `supabase-*.sql` — Migrar para migrations

**Critérios de aceite:**
- [ ] Migrations versionadas criadas
- [ ] Todas idempotentes
- [ ] Índices documentados
- [ ] Rollback strategy definida

---

### Sprint 4 — Arquitetura Modular (Fase 2)
- Split `data.js` em módulos menores
- Extrair helpers para `shared/utils.js`
- Integrar `logger.js` em todos os módulos
- Integrar `error-boundary.js` em todos os módulos
- Executar Prettier no código legado
- Resolver warnings de lint

**Arquivos afetados:**
- `data.js` → `data/db.js`, `data/propostas.js`, `data/produtos.js`, etc.
- `shared/utils.js` — Helpers extraídos de `app.js`
- `views/*.js` — Integrar logger
- `app.js` — Refatorar

**Critérios de aceite:**
- [ ] `data.js` split em módulos
- [ ] Logger integrado em todos os módulos
- [ ] 0 warnings de lint
- [ ] Prettier executado
- [ ] Todos os testes passando

---

### Sprint 5 — Catálogo (Fase 4)
- CRUD completo de produtos
- Upload de fotos
- Busca avançada
- Categorias
- Preços e custos

**Critérios de aceite:**
- [ ] CRUD funcionando
- [ ] Upload de fotos
- [ ] Busca por nome/categoria
- [ ] Testes E2E para CRUD

---

### Sprint 6 — Clientes (Fase 5)
- CRUD completo de clientes
- Dossiê do cliente
- Histórico de vendas
- Contatos

**Critérios de aceite:**
- [ ] CRUD funcionando
- [ ] Dossiê com histórico
- [ ] Testes E2E para CRUD

---

### Sprint 7 — Parceiros (Fase 7)
- Módulo completo de parceiros
- Clientes, fornecedores, produtos
- Sync com Supabase

**Critérios de aceite:**
- [ ] 3 tabs funcionando
- [ ] Sync com Supabase
- [ ] Testes E2E

---

### Sprint 8 — Import XML (Fase 8)
- Import de XML de NF-e
- Parse automático
- Validação
- Histórico de importações

**Critérios de aceite:**
- [ ] Import funcionando
- [ ] Validação de XML
- [ ] Histórico acessível
- [ ] Testes E2E

---

### Sprint 9 — Propostas (Fase 6)
- Geração de PDF técnico/comercial
- Drag-and-drop no funil
- Status management
- Validação de itens

**Critérios de aceite:**
- [ ] PDF gerado corretamente
- [ ] Funil kanban funcionando
- [ ] Status atualizados
- [ ] Testes E2E

---

### Sprint 10 — Dashboard (Fase 10)
- KPIs atualizados
- Gráficos interativos
- Filtros por período
- Export de dados

**Critérios de aceite:**
- [ ] KPIs precisos
- [ ] Gráficos funcionando
- [ ] Filtros aplicados
- [ ] Testes E2E

---

### Sprint 11 — Financeiro (Fase 9)
- Dados financeiros consolidados
- Integração com propostas
- Métricas de faturamento

**Critérios de aceite:**
- [ ] Dados consolidados
- [ ] Integração funcionando
- [ ] Métricas precisas
- [ ] Testes E2E

---

### Sprint 12 — Relatórios (Fase 11)
- Relatórios com filtros avançados
- Export (PDF/CSV)
- Relatórios personalizados
- Backup completo

**Critérios de aceite:**
- [ ] Relatórios gerados
- [ ] Export funcionando
- [ ] Backup completo
- [ ] Testes E2E

---

## Resumo

| Sprint | Status | Concluída em |
|--------|--------|--------------|
| 1 — Foundation | ✅ Completa | 2026-08-02 |
| 2 — Segurança | Pendente | — |
| 3 — Banco de Dados | Pendente | — |
| 4 — Arquitetura Modular | Pendente | — |
| 5 — Catálogo | Pendente | — |
| 6 — Clientes | Pendente | — |
| 7 — Parceiros | Pendente | — |
| 8 — Import XML | Pendente | — |
| 9 — Propostas | Pendente | — |
| 10 — Dashboard | Pendente | — |
| 11 — Financeiro | Pendente | — |
| 12 — Relatórios | Pendente | — |

---

*Documento atualizado em: 2026-08-02*
