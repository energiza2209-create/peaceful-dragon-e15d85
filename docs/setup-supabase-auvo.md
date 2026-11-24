# Setup Supabase + Auvo — SIGEQ-Energiza

Este guia documenta EXATAMENTE os passos para o módulo Qualidade do
SIGEQ-Energiza começar a receber dados das O.S. do Auvo.

## Pré-requisitos
- Conta no [Supabase](https://supabase.com) com projeto criado
- Conta no [Auvo](https://auvo.com.br) com `apiKey` e `token`
- `supabase` CLI (opcional) para rodar migrations locais

## Passo 1 — Aplicar migrations (nesta ordem)

```bash
# Conecte ao seu projeto Supabase e rode as migrations:
supabase db push
# ou, alternativamente, via Dashboard SQL Editor:

# 001 a 005 — schema do módulo VENDAS (vetor Energiza original, preexistente)
# 006_auvo_os.sql                — O.S. vindas do Auvo + triggers SLA + view retrabalho
# 007_checklists_qualidade.sql    — templates dinâmicos + assinatura
# 008_compras_pecas.sql           — solicitações + 3 orçamentos validados
# 009_kpi_views_qualidade.sql     — views materializadas p/ o dashboard
# 010_lembretes.sql                — contratos/calibração/auditorias
```

## Passo 2 — Definir Secrets (Variáveis de Ambiente)

No Supabase Dashboard → `Project Settings` → `Edge Functions` → `Secrets`:

| Nome | Descrição |
|------|-----------|
| `AUVO_API_TOKEN` | Token da sua conta Auvo |
| `AUVO_APP_KEY`   | App key da conta Auvo |

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE` são injetados automaticamente.

## Passo 3 — Deploy da Edge Function `auvo-sync`

```bash
supabase functions deploy auvo-sync --no-verify-jwt
```

## Passo 4 — Agendar o Cron (10 min)

No SQL Editor do Supabase, rode:

```sql
-- Habilita a extensão pg_net e pg_cron se ainda não estiverem
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Programa a chamada à Edge Function a cada 10 minutos
select cron.schedule(
  'auvo-sync',
  '*/10 * * * *',
  $$
    select net.http_post(
      url    := 'https://SEU-PROJETO.functions.supabase.co/auvo-sync',
      headers := '{"Authorization":"Bearer SEU_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

## Passo 5 — Atualizar supabase-config.js

Edite `supabase-config.js` na raiz do projeto e preencha:

```js
window.SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
window.SUPABASE_ANON_KEY = 'cole-aqui-a-anon-key';
```

> A `service_role` NUNCA vai no navegador — só na Edge Function.

## Passo 6 — Validar

1. Rode `node dev-server.cjs` e abra `http://localhost:3000`
2. Faça login
3. Clique em **Qualidade** → cards devem mostrar "—" até cron rodar
4. Clique em **Kanban & SLA** → 5 colunas vazias até cron rodar
5. Aguarde 10 min (ou force uma execução manual via `curl -X POST`)
6. Recarregue → verifique o navegador:
   - Console deve mostrar `[Supabase] realtime: SUBSCRIBED` em outras abas
   - Kanban deve apresentar cards vindos do Auvo, coloridos por SLA

## Modificação do Mapper do Auvo

Se o Auvo mudar campos de resposta, ajuste o mapper em:

```
supabase-functions/auvo-sync/index.ts → mapaAuvoTarefa()
```

Variáveis no schema do Auvo que precisam manter:
- `t.id` ou `t.codigoTarefa` (id da O.S.)
- `t.status` (número)
  - `2` → manutencao_concluida
  - `3` → em_analise
  - `4` → aguardando_peca
  - `5` → liberacao_qualidade
- `t.dataAbertura`, `t.ultimaAtualizacao`, `t.dataEncerramento`
- `t.equipamento.{id,descricao}`, `t.setor`, `t.cliente.nome`
- `t.usuario.{id,nome}`
- `t.pecas[]` com `{sku,quantidade,descricao,valor}`

## Troubleshooting

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Cards "—" no Dashboard | Cron não rodou ou migrations 006–009 não aplicadas | Verifique `select * from pg_cron_jobs;` no Supabase |
| 401 nos logs da Edge Function | Token Auvo inválido | Re-gerar em `painel Auvo → Integrações → API` |
| Ventos real-time não chegam | RLS bloqueando | Confirme `policy "coord…" using (auth.uid() is not null)` em todas as tabelas do módulo Qualidade |
| Mensagem `sla_estado NULL` | Trigger `trg_calc_sla` não criado | Re-rode `006_auvo_os.sql` em modo "ignore errors" |
