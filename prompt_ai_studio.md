# PROMPT COMPLETO — EXECUTAR O SITE SIGEQ-ENERGIZA (CRM + MÓDULO QUALIDADE + INTEGRAÇÃO AUVO)

> Instruções detalhadas e autosuficiente para o Google AI Studio (Gemini) inicializar, rodar e validar
> 100% do projeto "CRM Energiza" localmente — frontend, backend Supabase, migrations, Edge Function
> Auvo, cron, variáveis de ambiente e testes. NÃO PODE FALTAR NADA.

---

## 🎯 OBJETIVO

Rodar localmente o **SIGEQ-Energiza** — um SPA vanilla JS (CRM comercial) + módulo de Qualidade
integrado ao Auvo via Edge Function Supabase. Ao final, o site deve abrir em `http://localhost:3000`
com login funcional, dashboard, funil, propostas, catálogo, parceiros, relatórios, kanban de SLA,
checklists, compras, gantt e lembretes — tudo lendo do Supabase e sincronizando com Auvo a cada 10 min.

---

## 📦 CONTEXTO DO PROJETO

**Stack:**
- Frontend: JavaScript ES6+ **vanilla** (sem framework, sem bundler, sem build step)
- Backend: **Supabase** (Postgres + Auth + Realtime + Edge Functions em Deno)
- Hospedagem: **Netlify** (estática)
- Integração externa: **Auvo** (API REST v2 — sincronização de O.S. via cron Supabase)
- Gráficos: Chart.js 4.4.1 (CDN)
- PDF: jsPDF 2.5.1 + jspdf-autotable 3.8.2 (CDN)
- Testes: Vitest (unit) + Playwright (E2E)
- Node >= 18

**Diretório raiz:** `C:\Users\mathe\Documents\CRM Energiza`

**Tipo do projeto:** `"type": "module"` no `package.json`

---

## 🗂️ ESTRUTURA DE PASTAS (essencial)

```
CRM Energiza/
├── index.html                    # Entry point SPA
├── app.js                        # Bootstrap, helpers, State, navigate(), Modal
├── data.js                       # DB local (localStorage) + 60 produtos demo + propostas
├── styles.css                    # Tema light/dark + UI completa
├── supabase-config.js            # URL + ANON KEY (públicos, RLS-protected)
├── dev-server.cjs                # Server HTTP estático (porta 3000)
├── netlify.toml                  # Config deploy
├── _headers                      # CSP + headers de segurança
├── _redirects                    # SPA fallback
├── package.json                  # Scripts: dev, test, test:e2e, lint, typecheck
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.js
│
├── shared/                       # Módulos compartilhados
│   ├── auth.js                   # Auth Supabase (login/logout/reset/update)
│   ├── audit.js                  # Log de eventos de segurança
│   ├── error-boundary.js         # Captura global de erros
│   ├── logger.js                 # Logger customizado
│   └── qdb.js                    # DB do módulo Qualidade (realtime Auvo)
│
├── views/                        # Telas (carregadas sob demanda via VIEWS registry)
│   ├── login.js
│   ├── dashboard.js              # KPIs comerciais (faturamento, conversão, ticket)
│   ├── funil.js                  # Kanban comercial (drag&drop, 6 estágios)
│   ├── gerador.js                # Gerador de propostas técnicas (PDF jsPDF)
│   ├── catalogo.js               # Catálogo de produtos
│   ├── relatorios.js             # Relatórios + integração financeira
│   ├── parceiros.js              # Clientes + fornecedores + import NF-e XML
│   ├── qualidade.js              # Dashboard Qualidade (MTTR, retrabalho, SLA)
│   ├── kanban-q.js               # Kanban de fluxo & SLA (mudança de cor por tempo)
│   ├── compras-q.js              # Solicitação de peças (exige 3 orçamentos)
│   ├── checklists-q.js           # Checklists entrada/saída + assinatura digital
│   ├── gantt-q.js                # Gantt preventivas
│   └── lembretes-q.js            # Contratos, calibração, auditorias
│
├── supabase-config.js            # createClient Supabase (URL + ANON_KEY)
├── supabase/
│   └── config.toml               # project_id + [functions.auvo-sync] verify_jwt=false
│
├── supabase-migrations/          # SQL versionado (executar EM ORDEM)
│   ├── 001_profiles.sql          # Tabela profiles + trigger on_auth_user_created
│   ├── 002_rls.sql               # RLS com auth.uid() + is_admin() + has_role()
│   ├── 003_storage.sql           # Buckets para fotos/propostas
│   ├── 004_permissions.sql       #UDP de permissões por role
│   ├── 005_updated_at_triggers.sql
│   ├── 006_auvo_os.sql           # Tabela auvo_os + enums + triggers SLA + view retrabalho
│   ├── 007_checklists_qualidade.sql
│   ├── 008_compras_pecas.sql     # Solicitações + 3 orçamentos
│   ├── 009_kpi_views_qualidade.sql
│   ├── 010_lembretes.sql         # Contratos/calibração/auditorias
│   └── SIGEQ_ALL_006_010.sql     # Bundle consolidado 006→010 (alternativa)
│
├── supabase-functions/
│   └── auvo-sync/
│       └── index.ts              # Edge Function Deno: sync tarefas Auvo → auvo_os
│
├── tests/
│   ├── unit/                     # auth, db-helper, error-boundary, logger, router
│   └── e2e/                      # 11 specs Playwright (login, dashboard, funil...)
│
├── docs/                         # Documentação técnica (Architecture, Netlify, Setup-Supabase-Auvo, etc.)
│   ├── Setup-Supabase-Auvo.md    # SETUP CANÔNICO — ler primeiro
│   ├── Netlify.md
│   ├── Architecture.md
│   └── Database.md
│
└── .github/workflows/
    └── netlify-deploy.yml        # CI: staging (dev) + production (main)
```

---

## 🔐 VARIÁVEIS DE AMBIENTE / SECRETS (CHECKLIST COMPLETO)

### A) Supabase Dashboard → Project Settings → Edge Functions → Secrets
| Nome | Descrição |
|---|---|
| `AUVO_APP_KEY` | App key da conta Auvo (painel Auvo → Integrações → API) |
| `AUVO_API_TOKEN` | Token da conta Auvo |
| `SUPABASE_SERVICE_ROLE` | Injetado automaticamente pelo Supabase nas Edge Functions |
| `PROJECT_URL` | URL do projeto Supabase (também injetada, mas declarar explicitamente) |

> ⚠️ A `service_role` **NUNCA** vai no navegador — apenas nas Edge Functions.

### B) Frontend (`supabase-config.js` — já hardcoded, é pública e protegida por RLS)
```js
window.SUPABASE_URL = 'https://fhjihlndqfzzcqwoijmj.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_xVVI4WzaOUt9YoXvgFCHTw_M_2SZp5k';
```

### C) GitHub Actions Secrets (apenas para deploy Netlify — não necessário para rodar local)
| Secret | Uso |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Personal access token Netlify |
| `NETLIFY_PRODUCTION_SITE_ID` | Site ID de produção |
| `NETLIFY_STAGING_SITE_ID` | Site ID de staging |

### D) Localhost — modo Demo (sem credenciais)
Abrir `http://localhost:3000/?demo=true` pula Auth e usa dados fictícios do `data.js`.
**Útil para validar o frontend antes de configurar Supabase/Auvo.**

---

## 🚀 EXECUÇÃO PASSO A PASSO

### Passo 0 — Pré-requisitos
- Node.js >= 18 instalado (`node -v`)
- Conta no [Supabase](https://supabase.com) com projeto `fhjihlndqfzzcqwoijmj` acessível
- Conta no [Auvo](https://auvo.com.br) com `apiKey` e `apiToken` válidos
- Supabase CLI (opcional, mas recomendado): `npm i -g supabase`

### Passo 1 — Instalar dependências do projeto
```bash
cd "C:\Users\mathe\Documents\CRM Energiza"
npm install
```
> Instala: eslint, prettier, vitest, @playwright/test, typescript, jsdom, etc. (todos `devDependencies`)

### Passo 2 — Aplicar migrations no Supabase (ORDEM OBRIGATÓRIA)
No Supabase Dashboard → **SQL Editor** (ou `supabase db push`), execute **nesta ordem**:

```sql
-- 1. Schema base do CRM (vetor comercial Energiza)
-- 001_profiles.sql        → tabela profiles + trigger handle_new_user
-- 002_rls.sql             → RLS com auth.uid() + helpers is_admin(), has_role()
-- 003_storage.sql         → buckets Storage (fotos, propostas PDF)
-- 004_permissions.sql     → matriz de permissões por perfil
-- 005_updated_at_triggers.sql

-- 2. Módulo Qualidade (Auvo)
-- 006_auvo_os.sql          → tabela auvo_os + enums os_status/os_tipo/sla_estado
--                            + view os_retrabalho + trigger trg_calc_sla + RLS + índices
-- 007_checklists_qualidade.sql
-- 008_compras_pecas.sql    → solicitações + 3 orçamentos validados
-- 009_kpi_views_qualidade.sql
-- 010_lembretes.sql        → contratos/calibração/auditorias
```

> Alternativa: rodar `SIGEQ_ALL_006_010.sql` no lugar de 006→010.

### Passo 3 — Criar usuarios de teste no Supabase Auth
No Supabase Dashboard → **Authentication → Users → Add user**:
- `admin@energiza.com` / senha forte (role `admin` em `profiles`)
- `comercial@energiza.com` (role `comercial`)
- `tecnico@energiza.com` (role `tecnico`)

Após criar cada usuário, rode no SQL Editor:
```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'admin@energiza.com');
```

### Passo 4 — Configurar Secrets da Edge Function (Auvo)
No Supabase Dashboard → **Project Settings → Edge Functions → Secrets**:
```
AUVO_APP_KEY=cole_aqui_app_key_do_auvo
AUVO_API_TOKEN=cole_aqui_api_token_do_auvo
```
(`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE` são injetados automaticamente.)

### Passo 5 — Deploy da Edge Function `auvo-sync`
```bash
# Via Supabase CLI:
supabase functions deploy auvo-sync --no-verify-jwt

# O config.toml já declara:
# [functions.auvo-sync]
# verify_jwt = false
```

> Ou via Dashboard → Edge Functions → New function → colar conteúdo de
> `supabase-functions/auvo-sync/index.ts` → Deploy.

### Passo 6 — Agendar Cron (10 min) — sincronização automática Auvo
No SQL Editor do Supabase:
```sql
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'auvo-sync',
  '*/10 * * * *',
  $$
    select net.http_post(
      url    := 'https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync',
      headers := '{"Authorization":"Bearer COLE_A_SERVICE_ROLE_KEY_AQUI"}'::jsonb
    );
  $$
);
```

### Passo 7 — Teste manual da Edge Function (opcional mas recomendado)
```bash
# Sync incremental (últimos 30 min):
curl -X POST https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync

# Sync completo dos últimos 30 dias (primeira execução):
curl -X POST -H "X-Full-Sync: true" https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync
```
> Resposta esperada: `{"synced": N, "total_auvo": M, "janela_min": 30, ...}`

### Passo 8 — Subir o servidor local (frontend)
```bash
cd "C:\Users\mathe\Documents\CRM Energiza"
npm run dev
```
> Roda `node dev-server.cjs` → servidor HTTP estático em **http://localhost:3000**
> Se porta 3000 estiver ocupada, sobe automaticamente na 3001, 3002... até 3010.

### Passo 9 — Abrir no navegador
- **Modo demo (sem login):** `http://localhost:3000/?demo=true`
- **Produção (com login Supabase):** `http://localhost:3000`
  - Use `admin@energiza.com` + senha criada no Passo 3

### Passo 10 — Validar integração Auvo
1. Após logged in (não-demo), clique em **Qualidade** → cards devem mostrar "—" até cron rodar
2. Clique em **Kanban & SLA** → 5 colunas vazias até primeiro sync
3. Force sync manual: `curl -X POST -H "X-Full-Sync: true" https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync`
4. Recarregue a página → verifique:
   - Console do navegador deve mostrar `[Supabase] realtime: SUBSCRIBED` em outras abas
   - Kanban deve apresentar cards vindos do Auvo, coloridos por SLA (no_prazo/atencao/atrasado)

---

## 🧪 VALIDAÇÃO COMPLETA (RODE TUDO)

```bash
# Lint (zero warnings aceitos)
npm run lint

# Typecheck (zero erros)
npm run typecheck

# Testes unitários (Vitest)
npm run test

# Testes E2E (Playwright) — precisa servidor rodando em http://localhost:3000
# Em outro terminal:
npm run dev
# Depois:
npm run test:e2e
```

---

## 📋 CHECKLIST FINAL — TUDO TEM QUE PASSAR

- [ ] `npm install` roda sem erros
- [ ] Migrations 001→010 aplicadas no Supabase sem erro
- [ ] Usuarios `admin@energiza.com` + outros criados em Auth
- [ ] `profiles.role` atualizado para `admin`/`comercial`/`tecnico`
- [ ] Secrets `AUVO_APP_KEY` e `AUVO_API_TOKEN` definidos no Supabase
- [ ] Edge Function `auvo-sync` deployada (`supabase functions deploy auvo-sync --no-verify-jwt`)
- [ ] Cron `*/10 * * * *` agendado no `pg_cron`
- [ ] `npm run dev` sobre servidor em `http://localhost:3000`
- [ ] Login com `admin@energiza.com` funciona
- [ ] Dashboard carrega KPIs (faturamento, conversão, ticket médio)
- [ ] Funil mostra 6 colunas (aberto → ganho/perdido) com drag&drop
- [ ] Gerador de Propostas gera PDF (jsPDF)
- [ ] Catálogo lista 60 produtos do `data.js`
- [ ] Parceiros lista clientes + fornecedores + import XML NF-e
- [ ] Relatórios mostra consolidação mensal
- [ ] Módulo Qualidade → Dashboard mostra MTTR, retrabalho, SLA
- [ ] Kanban & SLA mostra cards do Auvo coloridos por SLA
- [ ] Compras exige 3 orçamentos para aprovar
- [ ] Checklists de entrada/saída com assinatura digital
- [ ] Gantt de preventivas renderiza
- [ ] Lembretes mostra contratos/calibração/auditorias
- [ ] Realtime: mudanças aparecem em outra aba sem refresh
- [ ] `curl -X POST -H "X-Full-Sync: true" https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync` retorna `{"synced": N, ...}`
- [ ] `npm run lint && npm run typecheck && npm run test` passam
- [ ] `npm run test:e2e` passa (11 specs)

---

## ⚠️ REGRAS DE OURO DO PROJETO (PROJECT_RULES.md)

1. **R11 — NUNCA chamar a API Auvo do navegador.** O frontend só fala com Supabase. A sincronização
   é feita pela Edge Function `auvo-sync` (cron 10 min). Token Auvo vive em Secret do Supabase, **NUNCA** em `supabase-config.js`.
2. **R12 — Módulo Qualidade é read-only sobre O.S.** O SIGEQ não insere O.S. manualmente — apenas
   recebe via sync Auvo. Tabela `auvo_os` só admite `INSERT`/`UPDATE` provenientes do Cron.
3. **R2 — Nunca alterar banco diretamente.** Sempre usar migrations SQL versionadas.
4. **R10 — Nunca concluir tarefa com erros.** Lint, typecheck, tests e build devem passar.

---

## 🔌 INTEGRAÇÃO AUVO — DETALHES TÉCNICOS

**Edge Function** (`supabase-functions/auvo-sync/index.ts`):

1. **Login Auvo** — `POST https://api.auvo.com.br/v2/login` com `{apiKey, apiToken}` → retorna `accessToken`
2. **Busca tarefas** — `GET /tasks?paramFilter={startDate,endDate}&page=N&pageSize=100&order=desc`
   - Janela padrão: últimos 30 min (cron)
   - Com header `X-Full-Sync: true`: últimos 30 dias (primeira execução)
3. **Mapeamento** (`mapAuvoTarefa`) — converte payload Auvo para schema `auvo_os`:
   - `taskID` → `id` / `auvo_id`
   - `taskStatus` (numérico) → enum `os_status`: 7→em_analise, 0→recebido, 5→aguardando_peca,
     finished+pendency→aguardando_peca, finished→manutencao_concluida
   - `taskTypeDescription` → enum `os_tipo`: /prevent/i→preventiva, /calibr/i→calibracao, else corretiva
   - `products[]` + `services[]` → `pecas_usadas` (jsonb `[{sku, qtd, desc, valor}]`)
   - `creationDate`/`dateLastUpdate`/`checkOutDate` → ISO timestamps
   - SLA calculado: corretiva 72h, preventiva 48h, calibracao 24h → `sla_limite` ISO
4. **Upsert** — `POST {SUPA_URL}/rest/v1/auvo_os?on_conflict=id` com header
   `Authorization: Bearer {SERVICE_ROLE}` e `Prefer: resolution=merge-duplicates`
   (service_role bypassa RLS, somente servidor)
5. **Trigger automático** — `trg_sla` (definido em 006_auvo_os.sql) recalcula `sla_estado`
   (no_prazo/atencao/atrasado) a cada insert/update

**Frontend (tempo real)** — `shared/qdb.js` chama `QDB.subscribeRealtime(refreshAll)` que
assina canal Realtime da tabela `auvo_os`. Mudanças feitas pelo Cron aparecem automaticamente
em todas as abas conectadas, sem refresh.

---

## 🩺 TROUBLESHOOTING

| Sintoma | Causa provável | Solução |
|---|---|---|
| Login falha "Supabase client não inicializado" | CDN Supabase não carregou | Verifique console; bloqueador de ads? |
| `401 Unauthorized` no sync Auvo | Token Auvo inválido | Regere em painel Auvo → Integrações → API |
| Cards "—" no Dashboard Qualidade | Cron ainda não rodou ou migrations 006→009 faltam | `select * from pg_cron.jobs;` |
| `sla_estado NULL` | Trigger `trg_sla` não criado | Re-rode `006_auvo_os.sql` em modo "ignore errors" |
| Realtime não chega em outras abas | RLS bloqueando ou publication sem tabela | `ALTER PUBLICATION supabase_realtime ADD TABLE auvo_os;` |
| `EADDRINUSE` ao rodar `npm run dev` | Porta 3000 ocupada | `dev-server.cjs` auto-incrementa porta até 3010 |
| `npm run test:e2e` falha em login | Servidor não está rodando | Rode `npm run dev` em outro terminal antes |

---

## 🎯 RESUMO EXECUTIVO (uma linha por etapa)

1. `npm install`
2. Aplicar migrations `001→010` no Supabase SQL Editor (ou `supabase db push`)
3. Criar usuarios no Supabase Auth + setar `profiles.role`
4. Setar Secrets `AUVO_APP_KEY` + `AUVO_API_TOKEN` no Supabase → Edge Functions → Secrets
5. `supabase functions deploy auvo-sync --no-verify-jwt`
6. Agendar `pg_cron` com `*/10 * * * *` chamando a Edge Function
7. `npm run dev` → abre `http://localhost:3000` (demo: `?demo=true`)
8. Login com `admin@energiza.com` → valida todas as 13 views
9. `curl -X POST -H "X-Full-Sync: true" <url-edge-function>` → valida sync Auvo
10. `npm run lint && npm run typecheck && npm run test && npm run test:e2e`

---

## 📚 FONTES PRIMÁRIAS (dentro do projeto)

- `docs/Setup-Supabase-Auvo.md` — guia canônico de integração
- `docs/Architecture.md` — diagrama de componentes e fluxo de dados
- `docs/Database.md` — schema das 4 tabelas comerciais (negociacoes, clients, products, nfe_imports)
- `docs/Netlify.md` — deploy e headers de segurança
- `PROJECT_RULES.md` — 12 regras obrigatórias (ler antes de qualquer alteração)
- `supabase-functions/auvo-sync/index.ts` — código da Edge Function (205 linhas, comentado)
- `supabase-migrations/*.sql` — 10 migrations SQL idempotentes

---

**FIM DO PROMPT — execute na ordem acima. Não pule etapas. Tudo precisa estar funcionando.**
