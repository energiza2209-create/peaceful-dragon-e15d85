# 🚀 GUIA DEFINITIVO — Integração Auvo (passo a passo copie-e-cole)

> Versão atualizada após diagnóstico. Responda cada item em ordem. Não pule.

---

## ✅ Estado atual confirmado por você

| Item | Status |
|---|---|
| Bug `PROJECT_URL` → `SUPABASE_URL` corrigido no código local | ✅ Sim |
| Edge Function re-deployada no Supabase | ❌ **NÃO** — fazer Passo 1 |
| Secrets `AUVO_APP_KEY` + `AUVO_API_TOKEN` no Supabase | ✅ Sim |
| Migrations 006→010 aplicadas | ❓ **Não sabe** — verificar Passo 3 |
| Usuário admin criado no Supabase Auth | ❌ **NÃO** — fazer Passo 5 |
| Full Sync inicial executado | ❌ **NÃO** — fazer Passo 4 |
| Cron agendado | ❓ Verificar no Passo 6 |
| Cache do navegador limpo | ⏳ Fazer no Passo 8 |

---

## 📋 PASSO 1 — Re-deploy da Edge Function (corrigida)

### Opção A — Com CLI (recomendado, mais simples)

Abra PowerShell e rode, uma linha por vez:

```powershell
# 1.1 Instalar CLI (se não tiver) — pule se já instalou
npm install -g supabase

# 1.2 Login no Supabase (abre navegador)
supabase login

# 1.3 Entrar na pasta do projeto
cd "C:\Users\mathe\Documents\CRM Energiza"

# 1.4 Vincular ao seu projeto (ID do projeto Energiza)
supabase link --project-ref fhjihlndqfzzcqwoijmj

# 1.5 Deploy da função
supabase functions deploy auvo-sync --no-verify-jwt
```

#### Output esperado do passo 1.5:
```
Building Function: auvo-sync
Deploying Function: auvo-sync
Deployed Function: auvo-sync (ID: xxxx-xxxx)
```

### Opção B — Manual pelo Dashboard (se a CLI falhar)

1. Acesse: https://supabase.com/dashboard/project/fhjihlndqfzzcqwoijmj/functions
2. Clique em **auvo-sync** → ao lado direito, **Edit function**
3. Abra o arquivo `C:\Users\mathe\Documents\CRM Energiza\supabase-functions\auvo-sync\index.ts` no VS Code
4. Copie **todo** o conteúdo
5. Cole no editor web substituindo o que está lá
6. Clique em **Deploy**

> ⚠️ Confirme que o editor web NÃO tem mais a linha `Deno.env.get('PROJECT_URL')!` sozinha — tem que ser `Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL')!`.

### ✅ Marcar quando feito:
- [ ] Passo 1 concluído

---

## 📋 PASSO 2 — Confirmar secrets Auvo

Dashboard → https://supabase.com/dashboard/project/fhjihlndqfzzcqwoijmj/settings/function-secrets

| Nome | Status |
|---|---|
| `AUVO_APP_KEY` | ✅ você já criou |
| `AUVO_API_TOKEN` | ✅ você já criou |

Caso não saiba se os valores estão corretos, **recrie** clicando em "Add new secret" e digite os valores atualizados do painel Auvo (https://auvo.com.br → Configurações → Integrações → API → ** Visualizar API Token **).

> **Dica:** não use a API Key errada. As labels oficiais no Auvo são: **API key** (= `AUVO_APP_KEY`, mais curta, ~32 chars) e **API Token** (= `AUVO_API_TOKEN`, mais longa). Se você inverteu elas no Supabase, delete e recrie corretas.

### ✅ Marcar quando feito:
- [ ] Passo 2 concluído

---

## 📋 PASSO 3 — Verificar se as migrations 006→010 foram aplicadas

Esse é super importante. Você respondeu "não sei" — vamos descobrir.

### 3.1 No Supabase SQL Editor (https://supabase.com/dashboard/project/fhjihlndqfzzcqwoijmj/sql/new), cole e rode:

```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'auvo_os',
    'compras_solicitacoes',
    'compras_orcamentos',
    'checklist_templates',
    'checklist_respostas',
    'lembretes'
  )
ORDER BY table_name;

-- Verifica se as views de KPI existem (Dashboard de Qualidade precisa delas)
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('kpi_mttr', 'kpi_retrabalho', 'kpi_sla_pct', 'kpi_resumo');
```

### 3.2 Interprete o resultado

| Resultado | Ação |
|---|---|
| **9 linhas retornadas** (6 tabelas + 4 views = 9 no total) | ✅ Migrations aplicadas. Vá para Passo 4. |
| **0 a 8 linhas** (faltou alguma) | Aplicar migrations — Passo 3.3 |
| **Erro de sintaxe** | Cole em https://supabase.com/dashboard/project/fhjihlndqfzzcqwoijmj/sql/new e clique em **RUN** em modo "Read only" |

### 3.3 Se faltar alguma tabela/view — aplicar migrations

Abra cada arquivo SQL abaixo da pasta `supabase-migrations/` no VS Code, copie tudo, cole no SQL Editor e clique em **RUN**. **EM ORDEM**:

1. `006_auvo_os.sql` (cria `auvo_os` + enums + trigger SLA + RLS)
2. `007_checklists_qualidade.sql` (cria `checklist_templates`, `checklist_respostas`)
3. `008_compras_pecas.sql` (cria `compras_solicitacoes`, `compras_orcamentos`)
4. `009_kpi_views_qualidade.sql` (cria as 4 views `kpi_*`)
5. `010_lembretes.sql` (cria `lembretes`)

> 💡 Cada SQL é idempotente (tem `IF NOT EXISTS` e `DROP POLICY IF EXISTS`), pode rodar tranquilo — não vai quebrar se já existir.

**Atalho:** se faltar tudo, abra `SIGEQ_ALL_006_010.sql` (bundle consolidado), copie tudo e rode de uma vez.

### ✅ Marcar quando feito:
- [ ] Passo 3 concluído

---

## 📋 PASSO 4 — Testar a Edge Function (FULL SYNC INICIAL)

Abra PowerShell e rode:

```powershell
$EDGE = "https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync"

$r = Invoke-WebRequest -Method POST -Headers @{ "X-Full-Sync" = "true" } -Uri $EDGE -UseBasicParsing -TimeoutSec 60

Write-Output "===== HTTP Status ====="
Write-Output $r.StatusCode
Write-Output ""
Write-Output "===== Resposta JSON ====="
$r.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

### 4.1 Interprete o resultado:

| Output | Significado | Próximo passo |
|---|---|---|
| `{"synced":25,"total_auvo":25,"full_sync":true}` | ✅ **Sucesso!** OS sincronizadas | Passo 6 (cron) |
| `{"synced":0,"total_auvo":0,"full_sync":true}` | ⚠️ Edge funcionou mas Auvo não tem OS atualizadas nos últimos 30 dias | Ver Passo 4.2 |
| `{"error":"missing Auvo creds","has_appkey":false,...}` | ❌ APP_KEY ausente ou com nome errado | Revisar Passo 2 |
| `{"error":"missing Auvo creds","has_token":false,...}` | ❌ API_TOKEN ausente ou com nome errado | Revisar Passo 2 |
| `{"error":"auvo login failed","status":401,...}` | ❌ Credenciais Auvo inválidas | Re-gerar no Auvo |
| `{"error":"missing Supabase env","has_url":false,...}` | ❌ Deploy não aplicou o fix. Provável: você usou Opção B e colou código errado | Refazer Passo 1 |
| `{"error":"upsert fail","status":401,"detail":"..."}` | ❌ Service Role inválida ou Supabase sem acesso | Suporte Supabase |
| `{"error":"upsert fail","status":"42P01","detail":"relation \"auvo_os\" does not exist"}` | ❌ Migration 006 não aplicada | Voltar Passo 3 |
| Erro PowerShell de timeout | Servidor Auvo demorou | Tente de novo em 1 min |
| Erro `Invoke-WebRequest: 404` | URL errada ou função não existe | Confirmar URL no Dashboard |

### 4.2 Se veio `synced:0, total_auvo:0` (Auvo sem OS nos últimos 30 dias)

Isso pode acontecer se:
- Você tem tarefas no Auvo mas nenhuma foi **atualizada** em 30 dias (a API busca por `dateLastUpdate`, não por `creationDate`)
- Você tem tarefas pendentes abertas há mais de 30 dias sem movimentação

#### Como confirmar:

```powershell
# Tenta Full-Sync de 30 DIAS ainda mais uma vez (só pra ter certeza)
Invoke-WebRequest -Method POST -Headers @{ "X-Full-Sync" = "true" } -Uri $EDGE -UseBasicParsing -TimeoutSec 60 | Select-Object Content

# Se vier zero OS de novo, faça uma busca direta no Auvo (sem sync) para ver se eles existem:
$auvoLogin = Invoke-WebRequest -Method POST -Uri "https://api.auvo.com.br/v2/login" -Body (@{ apiKey="COLE_APP_KEY"; apiToken="COLE_API_TOKEN" } | ConvertTo-Json -Compress) -ContentType "application/json" -UseBasicParsing
$token = ($auvoLogin.Content | ConvertFrom-Json).result.accessToken
# Depois busque tarefas dos últimos 90 dias para ver o que existe no Auvo:
$desde = (Get-Date).AddDays(-90).ToString("yyyy-MM-dd")
$ate = (Get-Date).ToString("yyyy-MM-dd")
$filter = @{ startDate = $desde; endDate = $ate } | ConvertTo-Json -Compress
$resp = Invoke-WebRequest -Method GET -Headers @{ Authorization = "Bearer $token" } -Uri "https://api.auvo.com.br/v2/tasks?paramFilter=$([uri]::EscapeDataString($filter))&page=1&pageSize=100" -UseBasicParsing
$resp.Content | ConvertFrom-Json | Select-Object @{N='Total';E={$_.result.pagedSearchReturnData.totalItems}}, @{N='Primeira';E={$_  .result.entityList[0].id}}
```

Se a busca direta no Auvo retornar tarefas mas o sync não trouxer, me mande a saída.

### ✅ Marcar quando feito:
- [ ] Passo 4 concluído (sync retornou `synced:N>0`)

---

## 📋 PASSO 5 — Criar usuário admin no Supabase Auth

### 5.1 No Dashboard:
https://supabase.com/dashboard/project/fhjihlndqfzzcqwoijmj/auth/users

1. Clique em **Add user** → **Create new user**
2. Email: `admin@energiza.com` (ou o email que você quiser)
3. Senha: crie uma forte (mínimo 8 chars, com letra, número, símbolo)
4. Marque **Auto Confirm User** (para não precisar validar por email)
5. Clique em **Create user**

### 5.2 Setar role admin

No SQL Editor, rode:

```sql
-- Seta o perfil do usuário recém-criado como admin
UPDATE profiles
SET role = 'admin', updated_at = now()
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'admin@energiza.com'
);

-- Confirme que atualizou
SELECT id, email, ( SELECT role FROM profiles WHERE id = auth.users.id ) AS role
FROM auth.users
WHERE email = 'admin@energiza.com';
```

> **Atenção:** o trigger `handle_new_user` (definido em `001_profiles.sql:18-30`) cria automaticamente um perfil com role `leitura` quando o usuário é criado. Esse UPDATE acima promove para `admin`.

### ✅ Marcar quando feito:
- [ ] Passo 5 concluído

---

## 📋 PASSO 6 — Agendar cron 10 min (sync automático)

### 6.1 Pegar a service_role key

https://supabase.com/dashboard/project/fhjihlndqfzzcqwoijmj/settings/api

- Procure por **`service_role`** → clique em **Reveal** → copie (começa com `eyJ...`)
- ⚠️ NUNCA faça commit disso. Cole só no SQL abaixo.

### 6.2 Agendar o cron

No SQL Editor, cole **tudo** (substituindo o placeholder):

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento antigo se existir
SELECT cron.unschedule('auvo-sync');

-- Pega a service_role do vault (cria secret seguro no banco)
-- Substitua o placeholder pela sua service_role completa
SELECT vault.create_secret(
  'COLE_SUA_SERVICE_ROLE_COMPLETA_AQUI',
  'auvo_service_role'
);

-- Agenda o sync a cada 10 minutos
SELECT cron.schedule(
  'auvo-sync',
  '*/10 * * * *',
  $$
    SELECT net.http_post(
      url    := 'https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'auvo_service_role'
        )
      )
    );
  $$
);

-- Confirme que agendou
SELECT jobid, jobname, schedule, active FROM pg_cron.jobs;
```

### 6.3 Interpretar resultado:

| Output esperado |
|---|
| `1 linha` retornada com `jobname = 'auvo-sync'`, `schedule = '*/10 * * * *'`, `active = true` |

### ⚠️ Se der erro "vault extension not found":
Use a versão simples sem o vault (menos seguro, mas funciona):

```sql
SELECT cron.schedule(
  'auvo-sync',
  '*/10 * * * *',
  $$
    SELECT net.http_post(
      url    := 'https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer COLE_SUA_SERVICE_ROLE_COMPLETA_AQUI'
      )
    );
  $$
);
```

### ✅ Marcar quando feito:
- [ ] Passo 6 concluído

---

## 📋 PASSO 7 — Validar Flask no banco (sanity check)

### 7.1 No SQL Editor, confirme que a tabela auvo_os tem registros:

```sql
-- Quantas OS vieram do Auvo?
SELECT count(*) AS total_os FROM auvo_os;

-- Últimas 5 OS sincronizadas
SELECT id, numero, hospital, status, sla_estado,
       entrado_em::date AS abertura,
       atualizado_em::date AS ultima_sinc
FROM auvo_os
ORDER BY atualizado_em DESC
LIMIT 5;
```

### 7.2 Se retornar 0 linhas — voltar ao Passo 4 e checar o output do PowerShell.

Se retornar N>0 ✅ — OS estão no banco. Vá para Passo 8.

### ✅ Marcar quando feito:
- [ ] Passo 7 concluído (auvo_os tem registros)

---

## 📋 PASSO 8 — Limpar cache do site e validar o Kanban

### 8.1 No Chrome/Edge, no site aberto:

1. **F12** (abre DevTools)
2. Aba **Application** → expandir **Local Storage** → clique em `http://localhost:3000`
3. Procure pela chave **`SIGEQ_QUALITY_CACHE`** e delete
4. Mantenha DevTools aberta

### 8.2 Vá para a tela de login (NÃO usar ?demo=true)

http://localhost:3000 (sem nada na URL)

Senha que você criou no Passo 5.

> ⚠️ CRÍTICO: se usar `?demo=true`, a RLS bloqueia o SELECT (porque demo não autentica no Supabase). Tem que logar.

### 8.3 Vá para **Qualidade → Kanban de Fluxo & SLA**

Resultado esperado:
- 5 colunas: Recebido → Em Análise → Aguardando Peça → Manutenção Concluída → Liberação / Qualidade
- Cards com OS reais do Auvo
- Cores da borda esquerda:
  - 🟢 verde (`#22c55e`) = no_prazo
  - 🟡 amarelo (`#eab308`) = atencao
  - 🔴 vermelho (`#ef4444`) = atrasado
- Cada card mostra: número, equipamento, setor, técnico, peças

### 8.4 Vá também para **Qualidade → Dashboard de Qualidade**

Resultado esperado:
- Cards de KPI com números em vez de "—":
  - Backlog Qualidade
  - Críticos em Atraso
  - SLA %
  - MTTR (h)
  - Taxa de Retrabalho
- Na minha mesa

Se KPIs ainda estiverem como "—" → voltar Passo 3 (falta view `kpi_resumo`).

### ✅ Marcar quando feito:
- [ ] Passo 8 concluído (Kanban mostra OS reais)

---

## 🎉 Concluído!

Se chegou até aqui, a integração está 100%. As OS do Auvo serão atualizadas automaticamente a cada 10 minutos (cron), e o site mostra em tempo real via Supabase Realtime.

---

## 🚨 Se algo falhar

Cole para mim:
1. Saída do **Passo 4** (resposta do Invoke-WebRequest)
2. Logs da Edge Function: https://supabase.com/dashboard/project/fhjihlndqfzzcqwoijmj/functions/auvo-sync/logs (clique em "Refresh" e rode o Passo 4 de novo)
3. Print do console do navegador (F12 → Console) com mensagens de erro
4. Resultado do SQL "SELECT count(*) FROM auvo_os" (Passo 7)

Com isso consigo dizer exatamente onde morre.
