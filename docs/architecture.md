# Arquitetura do Sistema — ENERGIZA CRM

## Visão Geral

SPA vanilla JavaScript (sem framework) com backend BaaS (Supabase). Arquitetura híbrida: LocalStorage como espelho offline + Supabase como fonte definitiva via Realtime.

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | JavaScript ES6+ vanilla | N/A |
| Estilo | CSS3 Custom Properties | N/A |
| Gráficos | Chart.js | 4.4.1 |
| PDF | jsPDF + jspdf-autotable | 2.5.1 / 3.8.2 |
| Backend | Supabase (Postgres + Realtime) | JS v2 |
| Hospedagem | Netlify (estática) | N/A |

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────┐
│                   index.html                     │
│  SPA com 6 views lógicas (seções HTML)           │
├─────────────────────────────────────────────────┤
│                   app.js                         │
│  VIEWS registry, State, navigate(), Modal,       │
│  helpers ($, $$, el, BRL, toast), boot()         │
├─────────────────────────────────────────────────┤
│               shared/utils.js                    │
│  Helpers reutilizáveis, componentes UI            │
├─────────────────────────────────────────────────┤
│               data/ (módulos)                    │
│  db.js, propostas.js, produtos.js, clients.js,   │
│  nfe.js, remote.js, adapters.js, importers.js,   │
│  migrations.js, price-history.js                 │
├─────────────────────────────────────────────────┤
│           views/ (6 módulos de tela)             │
│  dashboard.js, funil.js, gerador.js,             │
│  catalogo.js, relatorios.js, parceiros.js        │
├─────────────────────────────────────────────────┤
│          supabase-config.js                      │
│  Inicialização do cliente Supabase               │
├─────────────────────────────────────────────────┤
│        Supabase (Postgres + Realtime)            │
│  4 tabelas + 3 canais Realtime                   │
└─────────────────────────────────────────────────┘
```

## Padrão de Comunicação

- **Globals de window:** Toda comunicação entre módulos é feita via variáveis globais (`DB`, `VIEWS`, `Modal`, `$`, `BRL`, etc.)
- **Sem ES Modules:** Código entregue como script tags sequenciais com `defer`
- **Sem bundler:** Nenhum build tool; código vanilla direto ao navegador
- **Realtime:** Supabase empurra mudanças via WebSocket para todos os dispositivos conectados

## Fluxo de Dados

```
User Action → View (event listener) → DB method → LocalStorage + Supabase
                                                      ↓
                                              Realtime → Outros dispositivos
                                                      ↓
                                              _remoteOnExternal → refreshAll()
```

## Fluxo de Navegação

```
navigate(key) → State.current = key
             → Troca classe .active nas .view
             → Chama VIEWS.get(key).render()
             → Atualiza título e subtítulo
```

## Estrutura de Pastas

```
CRM Energiza/
├── index.html
├── app.js
├── data/
│   ├── db.js
│   ├── auth.js
│   ├── propostas.js
│   ├── produtos.js
│   ├── clients.js
│   ├── nfe.js
│   ├── remote.js
│   ├── adapters.js
│   ├── importers.js
│   ├── migrations.js
│   └── price-history.js
├── shared/
│   ├── utils.js
│   └── components.js
├── views/
│   ├── dashboard.js
│   ├── funil.js
│   ├── gerador.js
│   ├── catalogo.js
│   ├── relatorios.js
│   └── parceiros.js
├── assets/
│   └── logo.png
├── styles.css
├── supabase-config.js
├── docs/
├── tests/
└── config/
```

## Princípios de Arquitetura

1. **Separação de responsabilidades:** Cada módulo tem uma única responsabilidade
2. **Acoplamento via globals:** Comunicação por variáveis compartilhadas (trade-off por simplicidade)
3. **Fallback offline:** LocalStorage sempre funciona; Supabase é camada extra
4. **Idempotência:** Migrações e seeds rodam sem efeito colateral em dados existentes
5. **Realtime como overlay:** Dados locais funcionam sem conexão; cloud sincroniza quando disponível
