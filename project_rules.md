# REGRAS DO PROJETO — ENERGIZA CRM

> **ATENÇÃO:** Este arquivo é obrigatório para qualquer desenvolvimento futuro.
> Todo desenvolvedor DEVE ler este arquivo antes de iniciar qualquer tarefa.

---

## Regras Obrigatórias

### R1. Nunca alterar módulos não relacionados
- Ao modificar um arquivo, verificar se outros módulos dependem dele
- Não alterar `data.js` ao mexer em `views/funil.js` sem necessidade explícita
- Manter acoplamento mínimo entre módulos

### R2. Nunca alterar banco diretamente
- Sempre usar migrations SQL versionadas em `supabase/migrations/`
- Nunca executar `DROP TABLE` em produção
- Nunca alterar RLS sem revisão e aprovação
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
- Nenhum merge sem testes passando

### R5. Sempre executar Build
```bash
npm run build
```
- Antes de commit
- Verificar que nenhum erro é gerado
- Validar que o bundle funciona

### R6. Sempre executar TypeScript
```bash
npm run typecheck
```
- Zero erros de tipo aceitos
- Novo código deve ser TypeScript quando aplicável
- Corrigir antes de commit

### R7. Sempre executar Lint
```bash
npm run lint
```
- Zero warnings aceitos (ou justificar no PR)
- Formato Prettier obrigatório
- Corrigir antes de commit

### R8. Sempre executar Playwright
```bash
npm run test:e2e
```
- Todos os testes devem passar
- Screenshots em caso de falha
- Não fazer merge com testes falhando

### R9. Sempre atualizar documentação
- Atualizar `docs/` relevante
- Atualizar `CHANGELOG.md`
- Descrever mudanças em commit message
- Manter README atualizado

### R10. Nunca concluir uma tarefa com erros
- Lint errors: corrigir antes de entregar
- Type errors: corrigir antes de entregar
- Test failures: corrigir antes de entregar
- Build errors: corrigir antes de entregar
- Documentação desatualizada: corrigir antes de entregar

### R11. Nunca chamar a API do Auvo do navegador
- A API do Auvo exige token/secret que bypassam qualquer RLS
- O frontend NUNCA fala com o Auvo — apenas com nosso Supabase
- Sincronização é feita pela Edge Function `auvo-sync` (cron 10min)
- Token vive em Secret do Supabase — NUNCA em `supabase-config.js`
- Mudança de schema no Auvo? Atualize `mapaAuvoTarefa()` em `supabase-functions/auvo-sync/index.ts`

### R12. Módulo Qualidade é read-only sobre O.S.
- O SIGEQ-Energiza NÃO insere O.S. manualmente — recebemos as O.S. via sync Auvo
- Só status, checklists, compras e lembretes são escritos no módulo Qualidade
- Tabela `auvo_os` só admite `INSERT`/`UPDATE` provenientes do Cron

---

## Checklist Pré-Commit

Antes de cada commit, executar:

```bash
# 1. Lint
npm run lint

# 2. Typecheck
npm run typecheck

# 3. Testes unitários
npm run test

# 4. Testes E2E
npm run test:e2e

# 5. Build
npm run build
```

**Todos devem passar. Se algum falhar, CORRIGIR antes de commit.**

---

## Convenções

### Commits
- Formato: `tipo(escopo): descrição`
- Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Exemplos:
  - `feat(propostas): adiciona geração de PDF técnico`
  - `fix(dashboard): corrige cálculo de KPI de faturamento`
  - `docs(readme): atualiza instruções de instalação`

### Branches
- `main` — produção
- `develop` — staging
- `feature/nome` — features
- `fix/nome` — correções
- `docs/nome` — documentação

### Code Review
- Todo PR deve ter pelo menos 1 revisão
- Verificar: lint, tests, types, docs
- Merge apenas após aprovação
