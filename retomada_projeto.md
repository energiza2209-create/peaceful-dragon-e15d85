# 📋 RETOMADA DO PROJETO — SIGEQ-ENERGIZA

> Snapshot completo de: estado atual, diagnóstico do problema Auvo, funções que faltam, melhorias
> e roadmap de execução. Documento único para você não se perder.

**Data:** 11/08/2026

---

## 1) ESTADO ATUAL DO PROJETO

### 1.1 — O que JÁ existe e funciona

| Bloco | Status | Observação |
|---|---|---|
| **CRM Comercial** (dashboard, funil, gerador PDF, catálogo, parceiros, relatórios) | ✅ Totalmente implementado | `views/{dashboard,funil,gerador,catalogo,parceiros,relatorios}.js` |
| **Auth Supabase** (login/logout/reset/update) | ✅ Implementado | `shared/auth.js`, `views/login.js` |
| **Módulo Qualidade — front completo** | ✅ Implementado, DADOS pending | 6 views: `qualidade, kanban-q, compras-q, checklists-q, gantt-q, lembretes-q` |
| **Backend Supabase** | ✅ Migrations escritas | 10 arquivos SQL em `supabase-migrations/` |
| **Edge Function auvo-sync** | ⚠️ Parcialmente corrigida | Bug `PROJECT_URL`→`SUPABASE_URL` CORRIGIDO; precisa re-deploy |
| **Realtime** (tabelas `auvo_os`, `compras_solicitacoes`, `checklist_respostas`) | ✅ Idempotente via `QDB.subscribeRealtime` em `shared/qdb.js` |
| **Testes** (Vitest unit + Playwright e2e) | ✅ Infra montada, 11 specs e2e |
| **Lint/Typecheck/Build** | ✅ Scripts no `package.json` |
| **Modo demo** (`?demo=true`) | ✅ Pula Auth e usa `data.js` |
| **Deploy CI/CD** (Netlify via GitHub Actions) | ✅ Workflow `.github/workflows/netlify-deploy.yml` |

### 1.2 — Sinais de alerta que encontrei

- 🟡 **`docs/Roadmap.md` desatualizado** — diz que Sprint 2 (Auth) está “Pendente”, mas o código já tem Auth, módulo Qualidade inteiro, etc. Roadmap foi abandonado em 02/08/2026.
- 🟡 **`docs/System-Health.md` desatualizado** — mostra apenas 6 views, mas o projeto tem 13.
- 🔴 **Edge Function `auvo-sync` tinha bug crítico** (`PROJECT_URL` em vez de `SUPABASE_URL`) — silenciosamente falhava o upsert.
- 🔴 **Nenhum teste unitário usa Vitest de verdade** — só placeholder (Technical-Debt.md confirma isso em A-15).
- 🔴 **Cache localStorage `SIGEQ_QUALITY_CACHE`** persiste dados antigos no navegador — pode fazer você ver OS "de teste" que na verdade são resquícios.
- 🟡 **52 arquivos `.diag*.cjs`, `.probe-auvo*.ps1`, `.diag*.png`** soltos na raiz — pj work-in-progress não apagado.
- 🟡 **Sem `README.md`** na raiz — cs un arquivo `PROJECT_RULES.md` e `docs/*.md`.

---

## 2) 🩺 DIAGNÓSTICO — Por que suas OS do Auvo não aparecem

Há **4 causas possíveis** e elas se somam:

### 🔴 Causa A — Bug na Edge Function (CORRIGIDA EM CÓDIGO, PRECISA RE-DEPLOY)

Arquivo: `supabase-functions/auvo-sync/index.ts:14`

**Antes (com bug):**
```ts
const SUPA_URL = Deno.env.get('PROJECT_URL')!;  // variável inexistente
```

**Depois (corrigido):**
```ts
const SUPA_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL')!;
```

Ainda adicionei `console.log` em cada etapa para você ver os logs no painel do Supabase.

> ⚠️ A correção está no código local, **NÃO** no Supabase. Você precisa re-deployar.

### 🔴 Causa B — Janela padrão de 30 minutos

Mesmo sem o bug, a função só puxa OS do Auvo atualizadas nos últimos **30 minutos**. Se suas OS
foram criadas/alteradas há mais tempo, **nada aparece**.

**Solução:** forçar "full sync" usando header `X-Full-Sync: true` (puxa 30 dias para trás).

### 🔴 Causa C — Falta de "Full Sync" inicial

A sincronização automática (cron 10 min) nunca fará carga histórica. A PRIMEIRA execução tem que
ser manual com o header `X-Full-Sync: true`.

### 🔴 Causa D — Cache do navegador (pode ser o que você chama de "OS de teste")

Se você inseriu OS manualmente no SQL Editor para testar (ou via migration tide), elas ficam em
`auvo_os` no banco E também em cache no `localStorage` (`SIGEQ_QUALITY_CACHE`). O kanban
renderiza a partir de `QDB.list('auvo_os')` que faz select no Supabase, mas a primeira leitura
vem do cache.

### 🔴 Causa E — RLS bloqueando SELECT no front

A tabela `auvo_os` tem RLS habilitado (ver `supabase-migrations/006_auvo_os.sql:106-115`):
```sql
create policy "coord_le_tudo" on auvo_os for select
  using (auth.uid() is not null);
```
Se o usuário logado **não está autenticado no Supabase** (modo demo), `auth.uid()` é NULL e o
SELECT retorna zero linhas. Kanban fica vazio.

---

## 3) 🛠️ PLANO DE AÇÃO — Resolver o problema do Auvo (EM ORDEM)

### Passo 1 — Re-deploy da Edge Function (com a correção)

```powershell
# Instale a CLI (uma vez)
npm install -g supabase

# Login
supabase login

# Link ao projeto
cd "C:\Users\mathe\Documents\CRM Energiza"
supabase link --project-ref fhjihlndqfzzcqwoijmj

# Deploy da função corrigida
supabase functions deploy auvo-sync --no-verify-jwt
```

### Passo 2 — Confirmar secrets no Supabase

Dashboard → **Project Settings → Edge Functions → Secrets**:

| Nome | Valor |
|---|---|
| `AUVO_APP_KEY` | (apiKey do painel Auvo → Integrações → API) |
| `AUVO_API_TOKEN` | (apiToken do painel Auvo → Integrações → API) |

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE` são injetadas automaticamente.

### Passo 3 — Forçar FULL SYNC (primeira carga)

No PowerShell:
```powershell
$EDGE = "https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync"
$r = Invoke-WebRequest -Method POST -Headers @{ "X-Full-Sync" = "true" } -Uri $EDGE -UseBasicParsing
Write-Output $r.Content
```

**Respostas esperadas:**

| Saída | O que significa |
|---|---|
| `{"synced":25,"total_auvo":25,"full_sync":true}` | ✅ Funcionando |
| `{"error":"missing Auvo creds","has_appkey":false,"has_token":true}` | APP_KEY não definida |
| `{"error":"auvo login failed","status":401}` | Credenciais Auvo inválidas |
| `{"error":"missing Supabase env","has_url":false}` | Re-deploy não aplicado |
| `{"error":"upsert fail","status":401}` | Service Role inválida |
| `{"synced":0,"total_auvo":0,"full_sync":true}` | Auvo não tem OS nos últimos 30 dias |

### Passo 4 — Agendar cron 10 min (se já não estiver)

No Supabase **SQL Editor**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('auvo-sync');

SELECT cron.schedule(
  'auvo-sync',
  '*/10 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer COLE_SUA_SERVICE_ROLE_AQUI'
      )
    );
  $$
);

SELECT jobname, schedule, active FROM pg_cron.jobs;
```

### Passo 5 — Confirmar migrations aplicadas

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('auvo_os', 'compras_solicitacoes', 'compras_orcamentos',
                     'checklist_templates', 'checklist_respostas',
                     'lembretes', 'kpi_resumo', 'kpi_mttr', 'kpi_sla_pct', 'kpi_retrabalho');
```

Se faltar algo, aplique `SIGEQ_ALL_006_010.sql` no SQL Editor (bundle consolidado).

### Passo 6 — Limpar cache do navegador

No Chrome/Edge, no site aberto:
1. F12 → aba **Application** → **Local Storage** → `http://localhost:3000`
2. Delete a chave `SIGEQ_QUALITY_CACHE`
3. F5

### Passo 7 — Logar no site (não usar modo demo)

**Importante:** O modo demo (`?demo=true`) não autentica no Supabase, então RLS
bloqueia o SELECT em `auvo_os`. Faça login com `admin@energiza.com` em
`http://localhost:3000` (sem `?demo=true`).

### Passo 8 — Validar

1. Vá para **Qualidade → Kanban & SLA**
2. Cards coloridos (verde/amarelo/vermelho) devem aparecer
3. Vá para **Qualidade → Dashboard** — KPIs deixam de ser "—"

---

## 4) 🧱 FUNÇÕES QUE FALTAM FAZER / TERMINAR NO PROJETO

### 🔴 Crítico — resolver logo

| # | Função | Por quê | Arquivo |
|---|---|---|---|
| 1 | Re-deploy `auvo-sync` | Bug `PROJECT_URL` corrigido, mas Supabase ainda tem versão velha | `supabase-functions/auvo-sync/index.ts` |
| 2 | Forçar Full Sync inicial | Cron nunca puxa histórico | PowerShell: `curl -X POST -H "X-Full-Sync: true"` |
| 3 | Criar usuário admin no Supabase Auth | Sem Auth, RLS bloqueia tudo | Supabase Dashboard → Authentication → Users |
| 4 | Agendar cron no `pg_cron` | Sem scheduler, sync só manualmente | SQL Editor |
| 5 | Aplicar migrations 006→010 | A view `kpi_resumo` não existe → dashboard fica "—" | SQL Editor |

### 🟡 Importante — médio prazo

| # | Função | Detalhe | Arquivo |
|---|---|---|---|
| 6 | **Templates de checklist pré-cadastrados** | Não há INSERTs padrão em `checklist_templates` — o usuário tem que criar na mão | Nova migration `011_seed_checklists.sql` |
| 7 | **Botão "Sincronizar agora"** no front | Útil para admin forçar sync sem ir ao painel | `views/qualidade.js` |
| 8 | **Página de Lembretes: criar seed inicial** | Tela vazia sem dados (calibração anual, contratos) | Nova migration |
| 9 | **Editar/Excluir orçamento de compra** | Hoje só dá para validar/aprovar, não excluir individual | `views/compras-q.js` |
| 10 | **Export de relatório de qualidade em PDF** | Só existe para propostas comerciais (jsPDF); qualidade não exporta | `views/relatorios.js` |
| 11 | **Filtro por período no dashboard de Qualidade** | KPIs são acumulados totais — não filtra por mês/sem | `views/qualidade.js` |
| 12 | **Filtro por setor/hospital no Kanban** | Hoje lista todo mundo junto | `views/kanban-q.js` |
| 13 | **Comentários/atualizações em uma O.S.** | Não há histórico de evolução por O.S. | Nova tabela `os_comentarios` |
| 14 | **Upload de fotos na O.S.** (provas) | Bucket Storage existe mas a view não usa | Nova coluna em `auvo_os` + view |
| 15 | **Autocriação de perfil `admin`** ao cadastrar 1º usuário | Hoje todo user vira `leitura` por default (`001_profiles.sql:25`) | Trigger |
| 16 | **Tela de gestão de usuários** (admin listar/editar/perfis) | `Auth.listUsers()` existe em `shared/auth.js:432` mas nenhuma view usa | Nova view `views/usuarios.js` |
| 17 | **Notificação por email quando SLA vence** | Não existe | Edge Function nova `email-alerta` |
| 18 | **PWA / offline** | Parcial — o cache é localStorage mas não há `manifest.json` nem service worker | Novo |

### 🟢 Nice-to-have — longo prazo

| # | Função | Detalhe |
|---|---|---|
| 19 | **Importação em lote de OS do Excel** (alternativa ao Auvo) | Útil para hospitais que não usam Auvo |
| 20 | **Dashboard por equipamento** (vida útil, falhas recorrentes) | Cruzar `auvo_os` por `equipamento_id` |
| 21 | **Indicador de MTBF** (Tempo médio entre falhas) | Complementa MTTR |
| 22 | **App mobile (React Native)** | Hoje é só web responsivo |
| 23 | **Geração automática de contrato** | Hoje só propostas — não contratos de manutenção |
| 24 | ** integração com WhatsApp** para lembretes automáticos | Substituir email |
| 25 | **Multi-tenant** (várias empresas usando o mesmo SIGEQ) | Hoje é single-tenant |

---

## 5) 🚀 MELHORIAS A APLICAR NO PROJETO

### 🎨 Visual / UX

- **Dark mode do módulo Qualidade está incompleto** — há hardcoded `#1a2332`, `#324054`, `#243043`, `#8b97a7`, `#e6edf3`, `#0f1620`, `#3b82f6`, `#22c55e`, `#eab308`, `#ef4444` sem var() — quando troca tema, esses elementos não atualizam. Arquivos afetados: `styles.css` linhas 1475-1668 (módulo Qualidade).
- **Toasts sem tipos** — a função `toast(msg)` em `app.js:19` não distingue success/warn/error. Sugiro `toast(msg, type)` com cor semântica.
- **Loading state genérico** — não há skeletons de loading. Hoje usa-se `—` em KPIs. Adicionar shimmer/skeleton universal.
- **Acessibilidade** — faltam `aria-labels` em ícones, `role="dialog"` no modal. Lint de a11y no Playwright.
- **Animação dearrastar no Kanban comercial** — o `funil.js` usa HTML5 DnD; podia usar `@dnd-kit` style visual.
- **Responsividade do Kanban-Q** — 5 colunas `repeat(5, minmax(220px,1fr))` no mobile QUEBRA. Falta media query.

### ⚡ Performance

- **Carregamento de scripts** — todos com `defer`, mas 10+ scripts carregam na home. Considerar ESM com `import()` dinâmico.
- **Imagens dos produtos em base64 no `data.js`** — 110KB de JS carregado upfront. Migrar para Storage.
- **Sem cache HTTP** — todas as JS/CSS estão `no-cache, no-store`. Balancear cache busting para produção.
- **Realtime broadcast pesado** — `QDB.subscribeRealtime` resubscreve 3 canais mas `refreshAll()` resstringerenderiza só a view atual. Vale revisar.

### 🛡️ Segurança

- **CSP `connect-src`** — whitelist hardcoded `https://fhjihlndqfzzcqwoijmj.supabase.co` em `_headers`. Mover para variável de ambiente do Netlify.
- **Sem rate limiting** — Edge Function `auvo-sync` não tem proteção. Adicionar whitelisting de IP ou `X-Cron-Secret`.
- **service_role no cron job** — Tasks ID 4 do passo anterior coloca a service_role longa no SQL. Considerar vault do Supabase: `vault.create_secret(...)`.
- **Pendência de validação de tamanho de upload** — não há checagem de tamanho em `parceiros.js` no import de XML.
- **SRI em CDNs OK, mas faltan fontes do Google** — `preconnect` sim, integrity não. Considerar self-host.

### 🧪 Testes

- **Zero testes unitários reais** — só placeholder em `tests/unit/`. Adicionar:
  - `auth.test.ts` (login, logout, refresh, sessão expirada)
  - `db.test.ts` (CRUD `negociacoes`, merge por `updated_at`)
  - `migrations.test.ts` (idempotência de cada migration)
- **Sem testes do módulo Qualidade** — Playwright tem 11 specs mas nenhum cobre `kanban-q`, `compras-q`, etc.
- **Sem testes da Edge Function** — `auvo-sync` não tem teste. Com Deno test ou supabase test:

  ```ts
  // tests/edge/auvo-sync.test.ts
  import { assertEquals } from "https://deno.land/std/assert/mod.ts";
  Deno.test("auvo-sync Retorna erro se faltar APP_KEY", async () => {
    const res = await fetch(new Request("http://localhost/"), {});
    assertEquals(res.status, 500);
  });
  ```

### 📚 Documentação

- **Criar `README.md` raiz** — não existe. Hoje só `PROJECT_RULES.md`.
- **Atualizar `docs/Roadmap.md`** — desatualizado desde 02/08/2026; módulo Qualidade inteiro nuncarestá lá.
- **Atualizar `docs/System-Health.md`** — diz 6 views, projeto tem 13.
- **Diagrama ER** — não há. Gerar com `dbdiagram.io` ou `mermaid`.

### 🗂️ Limpeza

- **Apagar arquivos `.diag*.cjs`, `.diag*.png`, `.probe-auvo*.ps1`, `.body.html`, `.boot-screenshot.png`, `.auvo-api-calls.json`, `.test-map.cjs`** — restos de debug. 21 fciheiros soltos na raiz.
- **Apagar `eslint-report.json`** (290KB), `export-crm-energiza.json` (386KB) — gerados, não deveriam versionar.
- **Comitar `.gitignore` com essas entradas**.

---

## 6) 📅 ROADMAP DE EXECUÇÃO (proposto)

### 🔴 Sprint A — Estabilizar Auvo (Duração: 2-4h)

1. ✅ Corrigir bug `PROJECT_URL` no `auvo-sync/index.ts` (JÁ FEITO)
2. Re-deploy da Edge Function
3. Confirmar secrets no Supabase
4. Forçar Full Sync inicial
5. Agendar cron no `pg_cron`
6. Aplicar migrations 006→010 (se faltar)
7. Criar usuário admin no Auth
8. Testar no site (login real, NÃO demo)
9. Limpar cache navegador

**Critério de aceite:** Kanban & SLA mostra O.S. reais coloridas; Dashboard de Qualidade tem números em vez de "—".

### 🟡 Sprint B — Limpeza & Preparo (Duração: 2-3h)

1. Apagar 21 arquivos `.diag*, .probe-auvo*, .body.html, .boot-screenshot.png, .auvo-api-calls.json, .test-map.cjs`
2. Adicionar .gitignore entries
3. Criar `README.md` na raiz (instalação, dev, deploy)
4. Atualizar `docs/Roadmap.md` com módulo Qualidade
5. Atualizar `docs/System-Health.md` (13 views)
6. Gerar diagrama ER (`docs/Database.md` append mermaid)

### 🟡 Sprint C — Funcionalidades Pendentes (Duração: 8h)

1. Migration `011_seed_checklists.sql` com templates padrão (entrada corretiva, preventiva, calibração)
2 Migration `011_seed_lembretes.sql` (calibração anual, contratos)
3. Botão "Sincronizar agora" no `views/qualidade.js`
4. Tela de gestão de usuários (`views/usuarios.js`)
5. Editar/excluir orçamento em `views/compras-q.js`
6. Export PDF de qualidade em `views/relatorios.js`
7. Filtro por período no Dashboard Qualidade
8. Filtro por setor/hospital no Kanban

### 🟢 Sprint D — Dark Mode Module Qualidade (Duração: 4h)

1. Refatorar `styles.css` linhas 1475-1668 para usar `var()` em vez de hex hardcoded
2. Aplicar paleta do `PROMPT_CORES_AI_STUDIO.md`
3. Testar troca de tema no módulo Qualidade

### 🟢 Sprint E — Testes Reais (Duração: 6h)

1. Testes unitários: `auth.test.ts`, `db.test.ts`, `qdb.test.ts`
2. Testes E2E do módulo Qualidade: `kanban-q.spec.ts`, `compras-q.spec.ts`, `checklists-q.spec.ts`
3. Teste de Edge Function `auvo-sync.test.ts`

### 🟢 Sprint F — Performance (Duração: 4h)

1. Migrar imagens base64 do `data.js` para Storage Supabase
2. Configurar cache HTTP distinto para assets estáticos
3. Considerar ESM dynamic imports para views

### 🟢 Sprint G — PWA & Mobile (Duração: 8h)

1. Adicionar `manifest.json`
2. Service worker para offline
3. Media queries do Kanban-Q no mobile
4. Bottom navigation no mobile

### 🔵 Sprint H — Features Avançadas (Duração: 12h+)

1. Comentários/atualizações em cada O.S. (`os_comentarios` table)
2. Upload de fotos em O.S.
3. Edge Function `email-alerta` para SLA vencido
4. Dashboard por equipamento
5. MTBF (Temporal entre falhas)
6. Import Excel
7. WhatsApp integration

---

## 7) ✅ CHECKLIST IMEDIATO PARA VOCÊ FAZER AGORA

- [ ] Re-deploy da `auvo-sync` (Passo 1 do item 3)
- [ ] Confirmar secrets no Supabase (Passo 2)
- [ ] Rodar Full Sync em PowerShell (Passo 3)
- [ ] Agendar cron no SQL Editor (Passo 4)
- [ ] Verificar se migrations 006→010 estão aplicadas (Passo 5)
- [ ] Criar usuário `admin@energiza.com` no Supabase Auth
- [ ] Limpar localStorage no navegador (Passo 6)
- [ ] Logar no site com admin (não usar ?demo=true) (Passo 7)
- [ ] Validar Kanban & SLA aparecem OS coloridas
- [ ] Validar Dashboard de Qualidade mostra KPIs

Se ao final deste checklist as OS não aparecerem, me passe a saída do curl do Passo 3
e dos logs da Edge Function no Supabase Dashboard → Edge Functions → auvo-sync → Logs.

---

## 8) 📖 FONTES PRINCIPAIS DO PROJETO

| Documento | Para quê |
|---|---|
| `PROJECT_RULES.md` | 12 regras de ouro (ler antes de qualquer alteração) |
| `docs/Setup-Supabase-Auvo.md` | Setup canônico da integração Auvo |
| `docs/Netlify.md` | Deploy e headers |
| `docs/Architecture.md` | Diagrama e fluxo de dados |
| `docs/Database.md` | Schema das tabelas comerciais |
| `supabase-migrations/*.sql` | 10 migrations SQL |
| `supabase-functions/auvo-sync/index.ts` | Edge Function (corrigida) |
| `PROMPT_AI_STUDIO.md` | Prompt para rodar tudo no Gemini |
| `PROMPT_CORES_AI_STUDIO.md` | Prompt para replicar identidade visual |
| `RETOMADA_PROJETO.md` | **Este arquivo** |

---

*Documento gerado em 11/08/2026 por code review completo do projeto.*
