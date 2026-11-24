# Changelog — ENERGIZA CRM

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Documentação completa do projeto (docs/)
- Regras do projeto (PROJECT_RULES.md)
- Ambiente de desenvolvimento (Vitest, Playwright, ESLint, Prettier)
- Testes E2E para todas as páginas (32 testes, 100% pass)
- Serviço centralizado de logs (shared/logger.js)
- Error Boundary global (shared/error-boundary.js)
- Configuração de build e scripts npm
- `_redirects` para SPA fallback no Netlify
- Headers de segurança CSP no Netlify (_headers)
- Architecture Decisions (docs/Architecture-Decisions.md)
- Technical Debt (docs/Technical-Debt.md)
- Test Checklist (docs/Test-Checklist.md)
- System Health (docs/System-Health.md)

### Changed
- Corrigido ESLint config com globals do projeto vanilla JS
- Corrigido `no-empty` em catch blocks de data.js
- Corrigido `no-unused-expressions` em views/funil.js
- `shared/logger.js` convertido de ES module para window global
- `shared/error-boundary.js` convertido de ES module para window global
- `index.html` atualizado com script tags para shared/*.js
- `_headers` atualizado com CSP e headers de segurança

### Fixed
- Bug: `window.Proposta && Proposta.gerarPdfById()` convertido para `if` statement em funil.js
- Bug: `window.Proposta && Proposta.emitirProposta()` convertido para `if` statement em funil.js
- Fix: `Database.md` texto duplicado removido
- Fix: `Netlify.md` typo "Monitoremento" corrigido

---

## [0.1.0] - 2026-08-02

### Added
- Estrutura inicial do projeto
- SPA vanilla com 6 views
- Conexão com Supabase (negociações, clientes, produtos, NF-e)
- Realtime para sincronização
- Geração de PDF (técnico/comercial)
- Import XML de NF-e
- Drag-and-drop no funil de vendas
- Dashboard com KPIs e gráficos
- Catálogo de produtos
- Módulo de parceiros (clientes, produtos, sync)
- Relatórios com filtros
- Backup/export de dados
