# Configuração Netlify — ENERGIZA CRM

## Visão Geral

Deploy estático via Netlify. Sem build pipeline (código vanilla direto ao servidor). Sem Netlify Functions.

## Estrutura de Deploy

```
CRM Energiza/
├── index.html          # Entry point
├── _headers            # Headers HTTP customizados
├── _redirects          # SPA fallback
├── *.js                # Scripts vanilla
├── *.css               # Estilos
├── assets/             # Imagens estáticas
├── views/              # Módulos de tela
├── data/               # Camada de dados
└── shared/             # Componentes compartilhados
```

## Headers (`_headers`)

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://fhjihlndqfzzcqwoijmj.supabase.co wss://fhjihlndqfzzcqwoijmj.supabase.co
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Redirects (`_redirects`)

```
/*  /index.html  200
```

## Configuração Recomendada (`netlify.toml`)

```toml
[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## Cache

- **HTML:** `no-cache, no-store, must-revalidate`
- **JS/CSS:** `no-cache, no-store, must-revalidate`
- **Assets estáticos:** Recomendado cache longo para `logo.png`

## Variáveis de Ambiente (Netlify)

| Variável | Uso |
|----------|-----|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase |

> **Nota:** Em vanilla JS sem build, as variáveis de ambiente do Netlify não são injetadas automaticamente. Usar `process.env` requer um build step.

## Domínio

- **URL padrão:** `[nome-do-site].netlify.app`
- **Domínio customizado:** Configurar no painel do Netlify

## Deploy

### Manual
```bash
# Via Netlify CLI
npx netlify-cli deploy --prod --dir=.
```

### Automático (Git)
- Conectar repositório GitHub/GitLab no Netlify
- Build command: (vazio — deploy estático)
- Publish directory: `.`
- Branch: `main`

## Headers de Segurança

| Header | Valor | Propósito |
|--------|-------|-----------|
| `Content-Security-Policy` | (ver acima) | Previne XSS, clickjacking |
| `X-Content-Type-Options` | `nosniff` | Previne MIME sniffing |
| `X-Frame-Options` | `DENY` | Previne clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controle de referrer |
| `Permissions-Policy` | `camera=(), microphone=()` | Desabilita features perigosas |

## Monitoramento

- **Netlify Analytics:** Visitantes, page views, bandwidth
- **Functions Logs:** (não aplicável — sem functions)
- **Deploy Logs:** Histórico de deploys
