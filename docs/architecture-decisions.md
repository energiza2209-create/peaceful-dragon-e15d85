# Decisões Arquiteturais — ENERGIZA CRM

Registro de todas as decisões técnicas tomadas no projeto. Cada decisão documenta o problema, alternativas avaliadas, solução escolhida e justificativa.

---

## AD-001: Padrão de Módulos

**Data:** 2026-08-02
**Sprint:** 1

### Problema
O projeto precisava de um padrão consistente para organização e comunicação entre arquivos JavaScript.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | Scripts Clássicos + IIFE + Window Globals | Simples, compatível com legado, sem build step | Acoplamento via globals, sem encapsulamento forte |
| B | ES Modules (`type="module"`) | Encapsulamento nativo, imports estáticos | Requer refatoração de 15+ arquivos, compatibilidade |
| C | Híbrido (misturar padrões) | Flexibilidade | Inconsistência, difícil manutenção |
| D | Bundler (Vite/Webpack) | Tree-shaking, code splitting | Complexidade desnecessária para SPA vanilla |

### Solução Escolhida
**Alternativa A: Scripts Clássicos + IIFE + Window Globals**

### Justificativa
- O projeto já utilizava este padrão antes da Sprint 1
- Não existe bundler configurado
- `<script defer>` garante ordem de carregamento
- IIFE provides escopo privado por arquivo
- Window globals enabling comunicação entre módulos
- Simplicidade para deploy estático (Netlify)

### Impactos
- Comunicação entre módulos é feita via `window.DB`, `window.VIEWS`, etc.
- Cada view é um IIFE que se auto-registra
- Não há tree-shaking ou code splitting
- Scripts são carregados sequencialmente

### Riscos
- Acoplamento via globals pode crescimento难控
- Sem encapsulamento forte entre módulos
- Global namespace pode ter conflitos

### Nota
Migração para ES Modules pode ser considerada em Sprint futura (Sprint 4 — Arquitetura Modular), mas não é prioridade na fase atual.

---

## AD-002: Serviço de Logs

**Data:** 2026-08-02
**Sprint:** 1

### Problema
O projeto usava `console.log/warn/error` diretamente, sem padronização, sem persistência e sem contexto.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | `console.*` direto | Simples, nativo | Sem persistência, sem contexto, sem níveis |
| B | Serviço centralizado (window.logger) | Persistência, contexto, níveis | Mais código, precisa integração |
| C | Biblioteca externa (winston, etc.) | Feature-rich | Peso desnecessário para browser |

### Solução Escolhida
**Alternativa B: Serviço centralizado `window.logger`**

### Justificativa
- Persiste logs em localStorage (útil para debug em produção)
- Adiciona contexto (view, usuário, timestamp)
- Níveis de log (error/warn/info/debug)
- Compatível com o padrão de window globals

### Impactos
- `window.logger.error()`, `window.logger.warn()`, etc.
- Logs persistidos em `localStorage.energiza_logs` (máx. 500 entradas)
- Pode ser integrado incrementalmente nos módulos existentes

### Riscos
- Módulos existentes ainda usam `console.*` diretamente
- localStorage pode ficarcheio (mitigado com limite de 500)

---

## AD-003: Error Boundary Global

**Data:** 2026-08-02
**Sprint:** 1

### Problema
Erros não tratados no JavaScript causavam tela branca sem feedback ao usuário.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | Sem tratamento | Nenhum | Tela branca, usuário perdido |
| B | Error Boundary global | Captura erros, UI amigável | Não captura erros em async |
| C | Try/catch em cada função | Controle granular | Verboso, fácil de esquecer |

### Solução Escolhida
**Alternativa B: Error Boundary global**

### Justificativa
- Captura erros síncronos e unhandled rejections
- UI amigável com opção de recarregar
- Integra com `window.logger` para persistência
- Cobertura automática sem modificar código existente

### Impactos
- Intercepta `window.onerror` e `window.onunhandledrejection`
- Cria overlay com mensagem de erro e botão de reload
- Registra erro no logger para debug

### Riscos
- Não captura erros em React/lifecycle (não aplicável — vanilla JS)
- Pode esconder erros silenciosos se não houver logs

---

## AD-004: Infraestrutura de Testes

**Data:** 2026-08-02
**Sprint:** 1

### Problema
O projeto não tinha nenhum teste automatizado.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | Apenas testes E2E (Playwright) | Fluxo completo real | Lento, frágil, sem unit tests |
| B | Apenas unit tests (Vitest) | Rápido, isolado | Não testa integração |
| C | Unit + E2E (Vitest + Playwright) | Cobertura completa | Mais configuração |

### Solução Escolhida
**Alternativa C: Vitest (unit) + Playwright (E2E)**

### Justificativa
- Vitest para testes unitários de funções puras (futuro)
- Playwright para validação de UI e fluxos completos
- Ambos integrados via npm scripts
- Playwright auto-inicia servidor via `webServer` config

### Impactos
- `npm run test` — Vitest (unit)
- `npm run test:e2e` — Playwright (32 testes, chromium)
- Testes E2E cobrem todas as 6 views + login

### Riscos
- Unit tests ainda são placeholder (1 teste)
- E2E tests podem quebrar com mudanças de DOM

---

## AD-005: Configuração ESLint

**Data:** 2026-08-02
**Sprint:** 1

### Problema
ESLint não reconhecia os globals do projeto vanilla JS, gerando 87 erros `no-undef`.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | Adicionar globals no eslint.config.js | Resolve erros, mantém código | Não resolve warnings |
| B | Comentar `/* eslint-disable */` em cada arquivo | Rápido | Poluição, difícil manutenção |
| C | Migrar para ES Modules | Resolve raiz | Alto impacto, não planejado |

### Solução Escolhida
**Alternativa A: Configuração de globals no `eslint.config.js`**

### Justificativa
- Resolve o problema na raiz (configuração)
- Não modifica código existente
- Mantém proteção para código novo
- Compatível com ESLint flat config

### Impactos
- 15+ globals configurados (`DB`, `VIEWS`, `$`, `BRL`, etc.)
- 0 errors, 48 warnings (todos `no-unused-vars` em legado)

### Riscos
- Globals podem ficar desatualizados se novos arquivos criarem globals
- Warnings de `no-unused-vars` permanecem (aceitável)

---

## AD-006: Formatação de Código

**Data:** 2026-08-02
**Sprint:** 1

### Problema
Sem formatação padrão, código com estilos misturados.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | Prettier | Padrão da indústria, zero-config | Pode conflitar com estilo existente |
| B | ESLint format | Integrado com lint | Menos opções |
| C | Sem formatação | Nenhum | Caos de estilo |

### Solução Escolhida
**Alternativa A: Prettier**

### Justificativa
- Padrão da indústria
- Configuração mínima (`.prettierrc`)
- Integrado com ESLint

### Impactos
- `npm run format` — formata tudo
- `npm run format:check` — verifica formatação

### Riscos
- Pode alterar formatação de código legado (não executado ainda)

---

## AD-007: Type Checking sem TypeScript

**Data:** 2026-08-02
**Sprint:** 1

### Problema
Projeto vanilla JS sem verificação de tipos.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | TypeScript com `checkJs: false` | Type checking sem alterar JS | Não adiciona tipos ao código |
| B | JSDoc + TypeScript | Tipos no código | Verboso |
| C | Sem type checking | Nenhum | Erros de tipo não detectados |

### Solução Escolhida
**Alternativa A: TypeScript com `checkJs: false`**

### Justificativa
- `tsc --noEmit` verifica tipos sem emitir código
- Compatível com código JS existente
- Pode ser habilitado incrementalmente

### Impactos
- `npm run typecheck` — zero erros
- Novo código pode usar TypeScript quando aplicável

### Riscos
- `checkJs: false` não verifica código JS existente
- Pode dar falsa sensação de segurança

---

## AD-008: Deploy Estático no Netlify

**Data:** 2026-08-02
**Sprint:** 1

### Problema
Projeto precisa de hosting para SPA vanilla.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | Netlify (estático) | Free tier, SPA support, CDN | Sem server-side |
| B | Vercel | Free tier, Edge functions | Mais complexo |
| C | GitHub Pages | Free | Sem SPA fallback nativo |

### Solução Escolhida
**Alternativa A: Netlify (estático)**

### Justificativa
- Free tier generoso
- SPA fallback via `_redirects`
- Headers de segurança via `_headers`
- Deploy automático via Git

### Impactos
- `_redirects`: `/* /index.html 200`
- `_headers`: CSP, X-Frame-Options, etc.
- Deploy estático (sem build step)

### Riscos
- Sem server-side rendering
- Variáveis de ambiente não injetadas nativamente em vanilla JS

---

*Documento atualizado em: 2026-08-02*

---

## AD-009: Tela de Login como View

**Data:** 2026-08-02
**Sprint:** 2

### Problema
A tela de login precisava ser implementada no sistema, mas não havia um padrão definido para onde ela deveria residir.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | HTML inline no index.html | Simples, rápido | Viola padrão de views, difícil manutenção |
| B | View separada (views/login.js) | Consistente com padrão existente | Mais arquivos |
| C | Componente separado fora do IIFE | Flexibilidade | Não registra no VIEWS |

### Solução Escolhida
**Alternativa B: View separada `views/login.js`**

### Justificativa
- Segue o mesmo padrão arquitetural das demais views (IIFE + VIEWS.register)
- Mantém index.html limpo e consistente
- Login é uma view como qualquer outra (dashboard, funil, etc.)
- Facilita testes E2E isolados

### Impactos
- Novo arquivo: `views/login.js`
- Login registrado como `VIEWS.register('login', ...)`
- app.js controla navegação entre login e demais views

---

## AD-010: Serviço Centralizado de Autenticação

**Data:** 2026-08-02
**Sprint:** 2

### Problema
Autenticação espalhada em múltiplos arquivos (data.js, app.js) com acesso direto ao Supabase Auth.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | Acesso direto ao Supabase em cada arquivo | Flexibilidade | Acoplamento, difícil manutenção |
| B | Serviço centralizado (shared/auth.js) | Desacoplamento, única fonte | Mais uma camada |
| C | Misto (alguns centralizados, outros diretos) | Flexibilidade | Inconsistência |

### Solução Escolhida
**Alternativa B: Serviço centralizado `shared/auth.js`**

### Justificativa
- Única interface para todo o sistema acessar autenticação
- Nenhum arquivo acessa diretamente `supabaseClient.auth`
- Fácil de testar e substituir
- Compatível com padrão de window globals

### Impactos
- `window.Auth` — serviço centralizado
- Métodos públicos: `login()`, `logout()`, `isAuthenticated()`, `getUser()`, `getProfile()`, `hasPermission()`
- Módulos restantes consultam apenas `Auth.*`

---

## AD-011: Separação de Responsabilidades (data.js)

**Data:** 2026-08-02
**Sprint:** 2

### Problema
`data.js` continha lógica de autenticação misturada com lógica de dados.

### Solução
`data.js` permanece responsável apenas por dados da aplicação (localStorage CRUD).
Qualquer responsabilidade de autenticação é removida e delegada a `shared/auth.js`.

### Justificativa
- Princípio de Responsabilidade Única (SRP)
- `data.js` = camada de persistência local
- `shared/auth.js` = camada de autenticação
- Separação clara facilita manutenção e testes

---

## AD-012: Migrations SQL Numeradas

**Data:** 2026-08-02
**Sprint:** 2

### Problema
Arquivos SQL existentes (`supabase-setup.sql`, etc.) continham políticas RLS que precisavam ser atualizadas para usar `auth.uid()`, mas modificá-los diretamente quebraria compatibilidade com deploys existentes.

### Alternativas Avaliadas

| # | Alternativa | Prós | Contras |
|---|-------------|------|---------|
| A | Modificar SQL existente | Rápido | Quebra deploys existentes |
| B | Migrations numeradas | Idempotente, auditável | Mais arquivos |
| C | Script de upgrade único | Simples | Difícil de reverter |

### Solução Escolhida
**Alternativa B: Migrations numeradas**

### Justificativa
- Cada migration é idempotente (pode ser executada múltiplas vezes)
- Histórico claro de mudanças
- Pode ser aplicada incrementalmente
- Não modifica arquivos originais

### Impactos
- `supabase-migrations/001_profiles.sql` — tabela profiles + trigger
- `supabase-migrations/002_rls.sql` — RLS policies com auth.uid()
- `supabase-migrations/003_storage.sql` — storage policies
- `supabase-migrations/004_permissions.sql` — permissões por perfil

---

## AD-013: Modo Demo para Testes

**Data:** 2026-08-02
**Sprint:** 2

### Problema
Testes E2E precisam de autenticação, mas não devem depender de um usuário Supabase real.

### Solução
Parâmetro `?demo=true` na URL bypassa auth, mostrando o app diretamente.
Este modo é usado exclusivamente para testes E2E e desenvolvimento local.

### Justificativa
- Testes E2E são independentes de infraestrutura Supabase
- Não expõe credenciais reais em testes
- Funciona offline (fallback localStorage)

---

## AD-014: Login como View com Auth Guard

**Data:** 2026-08-02
**Sprint:** 2

### Problema
App precisava de controle de acesso — mostrar login quando não autenticado, app quando autenticado.

### Solução
`app.js` controla fluxo via Auth Guard:
1. Boot → `Auth.init()` → callback com estado
2. Se autenticado → navega para dashboard
3. Se não autenticado → navega para login
4. Login view usa `Auth.login()` → callback → navega para app
5. Logout → `Auth.logout()` → callback → navega para login

### Justificativa
- Fluxo claro e unidirecional
- Auth controla estado, app controla UI
- Login é uma view navegável como qualquer outra

---

## AD-015: AuthService como Única Camada de Autenticação

**Data:** 2026-08-02
**Sprint:** 2

### Problema
Múltiplos módulos poderiam acessar diretamente `supabase.auth`, criando acoplamento e dificultando manutenção, testes e substituição do provedor de autenticação.

### Regra
**Toda autenticação será centralizada no AuthService (`shared/auth.js`). Nenhum módulo poderá acessar diretamente `supabase.auth`.**

### Métodos Expostos pelo AuthService

| Método | Uso |
|--------|-----|
| `Auth.login(email, password)` | Autenticar usuário |
| `Auth.logout()` | Encerrar sessão |
| `Auth.isAuthenticated()` | Verificar se autenticado |
| `Auth.getUser()` | Obter usuário atual |
| `Auth.getProfile()` | Obter perfil (role, permissões) |
| `Auth.hasPermission(resource)` | Verificar permissão |
| `Auth.init(callback)` | Inicializar e registrar listener |
| `Auth.resetPassword(email)` | Recuperação de senha |

### Métodos Bloqueados para Outros Módulos

| Método | Motivo |
|--------|--------|
| `supabase.auth.signInWithPassword()` | Exclusivo do AuthService |
| `supabase.auth.signOut()` | Exclusivo do AuthService |
| `supabase.auth.getSession()` | Exclusivo do AuthService |
| `supabase.auth.getUser()` | Exclusivo do AuthService |
| `supabase.auth.onAuthStateChange()` | Exclusivo do AuthService |

### Verificação

```
grep -r "supabase.*\.auth\." --include="*.js" .
# Resultado: 7 matches, todos em shared/auth.js
```

### Justificativa
- Única interface para autenticação em todo o sistema
- Facilita testes (mockar um único módulo)
- Permite trocar provedor (Supabase → Firebase, etc.) sem alterar outras views
- Ponto único de auditoria e controle de acesso

### Impactos
- `views/login.js` → usa `Auth.login()`, nunca `supabase.auth`
- `app.js` → usa `Auth.init()`, `Auth.isAuthenticated()`, `Auth.logout()`
- `data.js` → não acessa autenticação
- Qualquer nova view → usa apenas `Auth.*`

---

*Documento atualizado em: 2026-08-02*
