# Guia de Desenvolvimento — ENERGIZA CRM

## Pré-requisitos

- Node.js >= 18
- npm >= 9
- Git
- Editor (VS Code recomendado)

## Início Rápido

```bash
# 1. Clonar repositório
git clone <url-do-repositorio>
cd CRM Energiza

# 2. Instalar dependências
npm install

# 3. Iniciar servidor de desenvolvimento
npm run dev

# 4. Abrir no navegador
# http://localhost:3000
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (hot reload) |
| `npm run build` | Build de produção |
| `npm run lint` | Verificação de código (ESLint) |
| `npm run lint:fix` | Correção automática de lint |
| `npm run format` | Formatação com Prettier |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:coverage` | Testes com cobertura |
| `npm run test:e2e` | Testes end-to-end (Playwright) |
| `npm run test:e2e:ui` | Playwright com interface visual |

## Estrutura de Pastas

```
CRM Energiza/
├── index.html              # SPA principal
├── app.js                  # Bootstrap e navegação
├── styles.css              # Estilos globais
├── supabase-config.js      # Config Supabase
├── data/                   # Camada de dados
│   ├── db.js               # Helpers load/save
│   ├── auth.js             # Autenticação
│   ├── propostas.js        # CRUD propostas
│   ├── produtos.js         # CRUD produtos
│   ├── clients.js          # CRUD clientes
│   ├── nfe.js              # Parse XML NF-e
│   ├── remote.js           # Supabase CRUD + Realtime
│   ├── adapters.js         # Mapeamento de dados
│   ├── importers.js        # Import CSV/Backup
│   ├── migrations.js       # Migrações hardcoded
│   └── price-history.js    # Histórico de preços
├── shared/                 # Componentes compartilhados
│   ├── utils.js            # Helpers ($, BRL, toast, etc.)
│   ├── components.js       # Componentes UI reutilizáveis
│   ├── logger.js           # Serviço de logs
│   └── error-boundary.js   # Error Boundary global
├── views/                  # Módulos de tela
│   ├── dashboard.js        # Dashboard Gerencial
│   ├── funil.js            # Funil Kanban
│   ├── gerador.js          # Gerador de Propostas
│   ├── catalogo.js         # Catálogo de Produtos
│   ├── relatorios.js       # Relatórios
│   └── parceiros.js        # Parceiros
├── assets/                 # Imagens estáticas
├── tests/                  # Testes
│   ├── unit/               # Testes unitários
│   └── e2e/                # Testes E2E (Playwright)
├── docs/                   # Documentação
├── supabase/               # Migrations SQL
│   └── migrations/
└── config/                 # Configurações de ferramentas
    ├── vitest.config.ts
    ├── playwright.config.ts
    ├── eslint.config.js
    └── .prettierrc
```

## Fluxo de Trabalho

### 1. Criar branch de feature
```bash
git checkout -b feature/nome-da-feature
```

### 2. Desenvolver
- Seguir as regras em `PROJECT_RULES.md`
- Escrever testes para código novo
- Manter documentação atualizada

### 3. Validar
```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

### 4. Commit
```bash
git add .
git commit -m "feat(escopo): descrição da mudança"
```

### 5. Push e PR
```bash
git push origin feature/nome-da-feature
# Criar Pull Request no GitHub
```

## Convenções de Código

### JavaScript/TypeScript
- `camelCase` para variáveis e funções
- `PascalCase` para classes
- `UPPER_SNAKE_CASE` para constantes
- Funções máx. 50 linhas
- Arquivos máx. 300 linhas

### CSS
- Custom Properties para temas
- Mobile-first (min-width)
- BEM-like naming (opcional)

### SQL
- UPPERCASE para keywords
- snake_case para tabelas e colunas
- Sempre `IF NOT EXISTS` em migrations

## Debugging

### Console
```javascript
// Usar logger ao invés de console.log
import { logger } from '../shared/logger.js';
logger.info('Mensagem informativa');
logger.warn('Aviso');
logger.error('Erro', { stack: error.stack });
```

### Supabase
- Painel: https://app.supabase.com
- Logs: SQL Editor → Logs
- Realtime: Supabase Dashboard → Database → Replication

### Playwright
```bash
# Ver interface visual
npm run test:e2e:ui

# Debug específico
npx playwright test --debug tests/e2e/login.spec.ts
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `npm install` falha | Deletar `node_modules` e `package-lock.json`, tentar novamente |
| Testes E2E falham | Verificar se Playwright browsers estão instalados: `npx playwright install` |
| Lint erros | Rodar `npm run lint:fix` |
| Build falha | Verificar erros de TypeScript com `npm run typecheck` |
