# SIGEQ-Energiza — Arquitetura Unificada

## Visão Geral
O **SIGEQ-Energiza** é a fusão de dois sistemas num único produto:
- **Módulo Vendas** (herdado do CRM Energiza) — gestão comercial, funil, propostas, catálogo, relatórios e parceiros.
- **Módulo Qualidade** (herdado do SIGEQ-Q) — gestão operacional/qualidade para Engenharia Clínica: Kanban com SLA, Gantt preventivas, checklists dinâmicos, solicitação de peças com 3 orçamentos, lembretes e KPIs (MTTR/Retrabalho/SLA).

Vendas e Qualidade são **processos paralelos** — mesmos clientes/parceiros podem aparecer nos dois, mas os dados não se cruzam diretamente. Compartilham apenas: mesmo Supabase, mesma auth, mesma SPA.

## Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend | JavaScript ES6+ vanilla (SPA, sem framework) |
| Estilo | CSS3 custom properties |
| Gráficos | Chart.js 4.4.1 |
| PDF | jsPDF + jspdf-autotable |
| Backend | Supabase (Postgres + Realtime + Edge Functions) |
| Hospedagem | Netlify (estática) + Supabase Functions |
| Testes | Vitest (unit) + Playwright (E2E) |

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────┐
│              index.html (SPA)                    │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Módulo VENDAS│  │  Módulo QUALIDADE (Q)    │  │
│  │  dashboard     │  │  qualidade (KPIs)        │  │
│  │  funil         │  │  kanban-q (SLA)          │  │
│  │  gerador       │  │  gantt-q (preventivas)  │  │
│  │  catalogo      │  │  checklists-q           │  │
│  │  relatorios    │  │  compras-q (3 orçam.)   │  │
│  │  parceiros     │  │  lembretes-q            │  │
│  └──────────────┘  └──────────────────────────┘  │
├─────────────────────────────────────────────────┤
│                app.js (VIEWS registry)            │
│  DB (vendas, LocalStorage)  |  QDB (qualidade)    │
├─────────────────────────────────────────────────┤
│             supabaseClient (Realtime)             │
├─────────────────────────────────────────────────┤
│             Supabase (Postgres + RLS)            │
│  - dotacoes_vendas (negociacoes, products, ...)  │
│  - dotacoes_qualidade (auvo_os, checklists,     │
│       compras_solicitacoes, lembretes, KPIs)    │
├─────────────────────────────────────────────────┤
│  Edge Function auvo-sync (cron 10min) → API Auvo │
└─────────────────────────────────────────────────┘
```

## Arquivos importantes do módulo Qualidade

| Arquivo | Papel |
|--------|-------|
| `shared/qdb.js` | Camada híbrida (LocalStorage + Supabase) para QUAL |
| `views/qualidade.js` | Dashboard de KPIs (MTTR/Retrabalho/SLA) |
| `views/kanban-q.js` | Kanban 5 colunas com SLA visual |
| `views/gantt-q.js` | Gantt preventivas (Chart.js horizontal bars) |
| `views/checklists-q.js` | Templates + assinatura via `crypto.subtle.digest` |
| `views/compras-q.js` | Solicitações + 3 orçamentos validados |
| `views/lembretes-q.js` | Contratos/calibração/auditorias recorrentes |
| `supabase-migrations/006..010_*.sql` | Schema do módulo Qualidade |
| `supabase-functions/auvo-sync/index.ts` | Cron sync com Auvo |

## Recomendações de uso

1. **Fluxo do módulo Vendas**: cria proposta → envia → negocia → ganho/perdido → relatório consolidado.
2. **Fluxo do módulo Qualidade**: O.S. entra via Auvo → Kanban → (se peça) Compras → (manutenção concluída) → Checklists (entrada+saída) → Liberado → monta KPIs + Gantt.
3. **Módulo de Lembretes** atua transversalmente (contratos, calibrações, auditorias).

## Convenções

As views de Qualidade usam o mesmo padrão IIFE do Energiza:
```js
(() => {
  // ...
  VIEWS.register('chave', { title, render, refresh });
})();
```
Nunca referenciam `window.VIEWS` ou `window.DB` — usam as globais de script (`VIEWS`, `QDB`).
