# Checklist de Validação — ENERGIZA CRM

Checklist obrigatório a ser executado antes de toda entrega. Todos os itens devem estar aprovados.

---

## Build

- [ ] `npm run build` executado sem erros
- [ ] Nenhum arquivo `.js` com syntax error
- [ ] Nenhum arquivo `.css` com syntax error
- [ ] `index.html` válido (W3C validator)
- [ ] Todos os `<script>` tags presentes no `index.html`
- [ ] Todos os arquivos referenciados existem

---

## Lint

- [ ] `npm run lint` executado
- [ ] **0 errors** de lint
- [ ] Warnings justificados no PR
- [ ] `npm run format:check` passa (ou `npm run format` executado)
- [ ] Nenhum `eslint-disable` sem justificativa

---

## TypeScript

- [ ] `npm run typecheck` executado
- [ ] **0 errors** de tipo
- [ ] Novos arquivos `.ts` não têm erros
- [ ] `tsconfig.json` atualizado se necessário

---

## Unit Tests

- [ ] `npm run test` executado
- [ ] Todos os testes passando
- [ ] Testes para novas funções escritos
- [ ] Cobertura mínima 70% para código novo

---

## Integration Tests

- [ ] Testes de integração escritos (quando aplicável)
- [ ] Módulos comunicam corretamente via globals
- [ ] Supabase client inicializa corretamente
- [ ] Realtime funciona (quando aplicável)

---

## Playwright (E2E)

- [ ] `npm run test:e2e` executado
- [ ] **Todos os testes passando** (32/32)
- [ ] Login funciona
- [ ] Dashboard carrega com KPIs
- [ ] Navegação entre views funciona
- [ ] Funil/Kanban renderiza
- [ ] Catálogo de produtos funciona
- [ ] Parceiros (3 tabs) funciona
- [ ] Relatórios carrega
- [ ] Nenhum erro no console durante testes
- [ ] Nenhum erro HTTP (4xx/5xx) durante testes

---

## Supabase

- [ ] Conexão com Supabase OK
- [ ] `supabase-config.js` com URL e key corretos
- [ ] Tabelas existem no painel
- [ ] RLS habilitado em todas as tabelas
- [ ] Policies corretas (não `USING (true)` em produção)
- [ ] Realtime habilitado onde necessário
- [ ] Índices criados para colunas frequentemente consultadas

---

## Netlify

- [ ] `_redirects` existe com `/* /index.html 200`
- [ ] `_headers` com CSP configurado
- [ ] Headers de segurança presentes:
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `Permissions-Policy: camera=(), microphone=()`
- [ ] Deploy sem erros
- [ ] Site acessível na URL do Netlify

---

## Performance

- [ ] Lighthouse score >= 90 (Performance)
- [ ] Lighthouse score >= 90 (Accessibility)
- [ ] Lighthouse score >= 90 (Best Practices)
- [ ] Lighthouse score >= 90 (SEO)
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Total Blocking Time < 200ms
- [ ] Cumulative Layout Shift < 0.1
- [ ] Imagens otimizadas (WebP/AVIF quando possível)
- [ ] CSS/JS minificados (se aplicável)

---

## Console

- [ ] Nenhum erro no console (0 errors)
- [ ] Nenhum warning crítico no console
- [ ] Nenhum `Uncaught TypeError`
- [ ] Nenhum `Uncaught ReferenceError`
- [ ] Nenhum `Failed to load resource`
- [ ] Nenhum `CORS` error
- [ ] `window.logger` funcionando (quando integrado)

---

## Responsividade

- [ ] Desktop (1920x1080) — OK
- [ ] Laptop (1366x768) — OK
- [ ] Tablet (768x1024) — OK
- [ ] Mobile (375x667) — OK
- [ ] Menu hamburger funciona em mobile
- [ ] Tabelas responsivas (scroll horizontal)
- [ ] Modais centralizados em telas pequenas
- [ ] Texto legível em todos os tamanhos
- [ ] Botões acessíveis em touch

---

## Documentação

- [ ] `docs/` atualizado com mudanças
- [ ] `CHANGELOG.md` atualizado
- [ ] `README.md` atualizado (se necessário)
- [ ] Comentários em código novo
- [ ] PR com descrição clara

---

## Segurança

- [ ] Nenhuma `service_role` key no frontend
- [ ] RLS habilitado em todas as tabelas
- [ ] CSP configurado no `_headers`
- [ ] Nenhum dado sensível no console
- [ ] Nenhum dado sensível em logs
- [ ] Variáveis de ambiente não hardcoded (quando aplicável)

---

*Documento atualizado em: 2026-08-02*
