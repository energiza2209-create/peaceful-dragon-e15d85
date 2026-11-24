# Regras do Projeto — ENERGIZA CRM

## Regras Gerais

### R1. Nunca alterar módulos não relacionados
- Ao modificar um arquivo, verificar se outros módulos dependem dele
- Não alterar `data.js` ao mexer em `views/funil.js` sem necessidade explícita
- Manter acoplamento mínimo entre módulos

### R2. Nunca alterar banco diretamente
- Sempre usar migrations SQL versionadas
- Nunca executar `DROP TABLE` em produção
- Nunca alterar RLS sem revisão
- Nunca desabilitar RLS em produção

### R3. Sempre utilizar migrations
- Arquivos SQL em `supabase/migrations/` com numeração sequencial
- Formato: `YYYYMMDD_HHMMSS_descricao.sql`
- Todas as migrations devem ser idempotentes (`IF NOT EXISTS`)

### R4. Sempre criar testes
- Testes unitários para funções puras
- Testes de integração para módulos
- Testes E2E para fluxos completos
- Cobertura mínima: 70% para código novo

### R5. Sempre executar build
- `npm run build` antes de commit
- Verificar que nenhum erro é gerado
- Validar que o bundle funciona

### R6. Sempre executar TypeScript
- `npm run typecheck` antes de commit
- Zero erros de tipo aceitos
- Novo código deve ser TypeScript

### R7. Sempre executar Lint
- `npm run lint` antes de commit
- Zero warnings aceitos (ou justificar)
- Formato Prettier obrigatório

### R8. Sempre executar Playwright
- `npm run test:e2e` antes de merge
- Todos os testes devem passar
- Screenshots em caso de falha

### R9. Sempre atualizar documentação
- Atualizar `docs/` relevante
- Atualizar `CHANGELOG.md`
- Descrever mudanças em commit message

### R10. Nunca concluir uma tarefa com erros
- Lint errors: corrigir antes de entregar
- Type errors: corrigir antes de entregar
- Test failures: corrigir antes de entregar
- Build errors: corrigir antes de entregar

## Regras de Código

### Nomenclatura
- `camelCase` para variáveis e funções
- `PascalCase` para classes e componentes
- `UPPER_SNAKE_CASE` para constantes
- Nomes descritivos em português ou inglês (manter consistência)

### Funções
- Máximo 50 linhas por função
- Uma responsabilidade por função
- Nomes verbais (`getPropostas`, `renderDashboard`)

### Arquivos
- Máximo 300 linhas por arquivo (ideal: <200)
- Um componente/funcionalidade por arquivo
- Nomes em lowercase com hífens: `parceiros-clientes.js`

### Commits
- Formato: `tipo(escopo): descrição`
- Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Exemplo: `feat(propostas): adiciona geração de PDF técnico`

## Regras de Deploy

### Staging
- Deploy automático a cada push na branch `develop`
- Testes E2E rodam automaticamente
- Aprovação manual antes de merge para `main`

### Produção
- Deploy automático a cada merge na branch `main`
- Verificação de: lint, typecheck, test, build
- Rollback automático em caso de erro

## Regras de Segurança

### Dados
- Nunca logar dados sensíveis (CPF, CNPJ, senhas)
- Nunca expor `service_role` key
- Usar `anon` key apenas com RLS ativo

### Código
- Validar todos os inputs do usuário
- Usar `escapeHtml()` em qualquer output dinâmico
- Nunca usar `eval()` ou `innerHTML` com dados do usuário
- CSP ativo em produção

## Revisão de Código

- Todo PR deve ter pelo menos 1 revisão
- Verificar: lint, tests, types, docs
- Merge apenas após aprovação
