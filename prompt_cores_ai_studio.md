# PROMPT — REPLICAR EXATAMENTE A IDENTIDADE VISUAL / CORES DO SITE SIGEQ-ENERGIZA

> Cole este prompt no Google AI Studio (Gemini) quando precisar que ele **reproduza fielmente**
> a paleta de cores, contraste, hierarquia visual e tema claro/escuro do site CRM Energiza/SIGEQ-Q.

---

## 🎯 OBJETIVO

Replicar **bit a bit** a identidade visual do site SIGEQ-Energiza. Este prompt descreve todas as
variáveis CSS (`:root` + `[data-theme="dark"]`), cores hardcoded complementares, paleta do módulo
Qualidade (SLA/Status) e variáveis do glassmorphism/scrollbar — sem omissões.

> Regra de ouro: **NENHUMA cor inventada**. Todo `background`, `color`, `border-color`, `box-shadow`
> ou `rgba()` que o modelo gerar precisa estar tabelado abaixo. Se não estiver, NÃO use.

---

## 🧬 FILOSOFIA DA PALETA

O site usa uma identidade **monocromática preto/branco/cinza** com **acentos amarelo neon
(`rgba(255,230,0,X)`)** para destacar badges, alertas, scrollbar e focus rings. O acento "accent"
do tema claro é PRETO puro (#111111) — não azul, não roxo. No tema escuro vira cinza-escuro (#2f2f2f).

**Módulo Qualidade** (paleta paralela herdada de protótipo dark-only): usa um sistema semântico
verde (#22c55e) / amarelo (#eab308) / vermelho (#ef4444) / azul (#3b82f6) para SLA e status.

---

## 🎨 1) TEMA CLARO (`:root` — padrão ao abrir o site)

```css
:root {
  /* ---- FUNDO / ELEVADOS ---- */
  --bg-page:        #F6F8FB;          /* fundo geral da página */
  --bg-card:        #FFFFFF;          /* cards, topbar, dropdowns */
  --bg-elevated:    #F2F5FA;          /* cards dentro de cards, inputs */
  --glass-bg:       rgba(255,255,255,.92);

  /* ---- BORDAS ---- */
  --border-subtle: rgba(96,116,143,.16);
  --border-strong: rgba(96,116,143,.28);
  --glass-border:   rgba(15,37,79,.08);

  /* ---- TEXTO ---- */
  --text-primary:   #111111;          /* títulos, valores em negrito */
  --text-secondary:  rgba(22,42,66,.74);
  --text-muted:      rgba(39,67,97,.54);

  /* ---- ACCENT (PRETO no tema claro) ---- */
  --accent:         #111111;
  --accent-hover:   #333333;
  --accent-dark:    #000000;
  --btn-primary-bg: var(--accent);
  --btn-primary-fg: #ffffff;

  /* ---- CORES SEMÂNTICAS ---- */
  --success:       #16A34A;  --success-soft: rgba(22,163,74,.12);
  --danger:        #DC2626;  --danger-soft:  rgba(220,38,38,.12);
  --warning:       #F59E0B;  --warning-soft: rgba(245,158,11,.12);

  /* ---- SOMBRAS (sempre com rgba(15,37,79,X)) ---- */
  --shadow:        0 1px 2px rgba(15,37,79,.08), 0 4px 12px rgba(15,37,79,.08);
  --shadow-pop:    0 6px 20px rgba(15,37,79,.12);
  --shadow-soft:   0 1px 2px rgba(15,37,79,.08);
  --btn-elev:      0 4px 12px rgba(15,37,79,.12);
  --btn-press:     inset 0 2px 5px rgba(15,37,79,.08);
  --btn2-elev:     0 2px 8px rgba(15,37,79,.08);

  /* ---- RAIO / FONTES / ESPAÇAMENTO ---- */
  --radius:    12px;  --radius-sm: 10px;  --radius-xs: 8px;
  --font-xs: 12px;  --font-sm: 14px;  --font-base: 16px;
  --font-lg:  20px;  --font-xl:  28px;  --font-2xl:  36px;
  --gap-section: 32px;  --gap-block: 16px;

  /* ---- ALIASES (compat) ---- */
  --text-1: var(--text-primary); --text-2: var(--text-secondary); --text-3: var(--text-muted);
  --bg-2: var(--bg-page); --card-2: var(--bg-elevated); --border-soft: var(--border-subtle);
  --neon: var(--accent); --green: var(--success); --red: var(--danger); --amber: var(--warning);
}
```

### Acento amarelo neon (usado DENTRO de elementos específicos, não como variável global)
| Padrão hardcoded | Uso |
|---|---|
| `rgba(255,230,0,.12)` | `.col-count`, scrollbar rail |
| `rgba(255,230,0,.08)` / `.15` / `.12` | `.badge-precificacao`, `.badge-enviada`, `.badge-negociacao`, `.gp-suggestion:hover`, `.kcard-glow-success` |
| `rgba(255,230,0,.5)` / `.55` / `.7` | `.col-dot-precificacao`, `.col-dot-enviada`, `.kcard-enviada`, `.alert-warning` |
| `rgba(255,230,0,.4)` / `.45` | hover scrollbar, `.kpi-trend.down` |
| `rgba(255,230,0,.2)` | `.col-dot-perdido`, base scrollbar thumb |
| `rgba(255,230,0,.35)` | scrollbar hover, `.kcard-perdido`, `.alert-danger` |
| `rgba(255,230,0,0)`/`.5`/`2px` | `@keyframes kcardFlashError` (flash vermelho-neon) |
| `0 0 0 3px rgba(255,230,0,.15)` | `:focus` em inputs/forms |
| `0 0 6px/14px rgba(255,230,0,.2/.4/.15/.3)` | `@keyframes pulse-warning` e `pulse-danger` |
| `box-shadow: inset 0 0 0 0.4em var(--accent)` (no light = preto inset) | search-bar (componente lupa expansível) — não confundir com neon |

> **Atenção**: o search-bar usa `var(--accent)` como inset-shadow, **NÃO** `rgba(255,230,0,X)`.
> No tema claro esse inset é PRETO; no tema escuro é cinza-escuro `#2f2f2f`.

---

## 🌑 2) TEMA ESCURO (`[data-theme="dark"]`)

Ativado por `document.documentElement.setAttribute('data-theme','dark')` (definido inline no
`index.html` ANTES da pintura, default = dark no boot). Tudo monocromático preto→cinza→branco.

```css
[data-theme="dark"] {
  --bg-page:        #0b0b0b;
  --bg-card:        #111111;
  --bg-elevated:    #1a1a1a;
  --border-subtle:  rgba(255,255,255,.06);
  --border-strong:  rgba(255,255,255,.12);

  --text-primary:   #FFFFFF;
  --text-secondary: rgba(255,255,255,.85);
  --text-muted:     rgba(255,255,255,.62);

  /* Accent cinza-escuro p/ manter contraste (botões não podem sumir) */
  --accent:         #2f2f2f;
  --accent-hover:   #3c3c3c;
  --accent-dark:    #1f1f1f;
  --btn-primary-bg: var(--accent);
  --btn-primary-fg: var(--text-primary);

  /* Semânticas viram cinza muted no dark */
  --success:       #BFBFBF;  --success-soft: rgba(191,191,191,.08);
  --danger:        #BFBFBF;  --danger-soft:  rgba(191,191,191,.06);
  --warning:       #BFBFBF;  --warning-soft: rgba(191,191,191,.06);

  /* Glass e sombras */
  --glass-bg:      rgba(255,255,255,.04);
  --glass-border:  rgba(255,255,255,.06);
  --btn-elev:      0 4px 12px rgba(0,0,0,.6);
  --btn-press:     inset 0 2px 5px rgba(0,0,0,.5);
  --btn2-elev:     0 2px 8px rgba(0,0,0,.45);
}
```

> **Importante:** no dark mode, as cores semânticas (sucesso/erro/alerta) colapsam para
> `#BFBFBF` (cinza). Isso é proposital — o site é desenhado para alta concentração visual,
> sem distrações coloridas. A sinalização viaja pelo texto/formato, não pela cor.

**Porém, os acentos amarelo neon hardcoded continuam ativos no dark mode** (scrollbar,
badges do kanban, alerts de cadência) — não são substituídos por cinza.

---

## 🟢 3) MÓDULO QUALIDADE — PALETA SEMÂNTICA FIXA (vale em ambos os temas)

Estas cores são hardcoded no `.scss/.css` (não usam `var()`), indexadas à semântica de SLA/status:

### SLA do Kanban (`auvo_os.sla_estado`)
| Estado | Borda esquerda | Background tint | Badge |
|---|---|---|---|
| `no_prazo` | `#22c55e` (verde) | `rgba(34,197,94,.08)` | `#22c55e` bg, `#0a1a0a` texto |
| `atencao` | `#eab308` (amarelo mostarda) | `rgba(234,179,8,.10)` | `#eab308` bg, `#1a1a1a` texto |
| `atrasado` | `#ef4444` (vermelho) | `rgba(239,68,68,.10)` | `#ef4444` bg, `white` texto |

### Status de Compra / Orçamento
| Estado | Background soft | Cor texto |
|---|---|---|
| `collect` (em coleta) | `rgba(234,179,8,.18)` | `#eab308` |
| `aprov` (aprovado)    | `rgba(34,197,94,.18)` | `#22c55e` |
| `reprov` (reprovado)  | `rgba(239,68,68,.18)` | `#ef4444` |
| `rebceb` (recebido)   | `#3b82f6` (azul sólido) | `white` |
| `orc-valid` (orçamento validado) | `rgba(34,197,94,.08)` + `border-left:2px solid #22c55e` | — |

### Lembretes (flag coloridos)
| Tipo | Background | Cor texto |
|---|---|---|
| `proximo`  | `rgba(234,179,8,.18)` | `#eab308` |
| `atrasado` | `rgba(239,68,68,.18)` | `#ef4444` |
| `concluido` | `rgba(34,197,94,.18)` | `#22c55e` |
| `futuro`   | `rgba(59,130,246,.18)` | `#3b82f6` |

### Histórico de Checklist (entrada/saída)
| Tipo | Borda esquerda |
|---|---|
| `q-history-saida`   | `3px solid #22c55e` |
| `q-history-entrada` | `3px solid #3b82f6` |

### Drop targets do Kanban Qualidade (`[data-theme="dark"]`)
```css
.q-kanban-col.drop-target {
  outline: 2px dashed var(--accent);        /* no dark = #2f2f2f */
  outline-offset: -4px;
  background: rgba(16,185,129,.06);         /* overlap teal (療 legacy) */
}
```

---

## 🟡 4) BADGES DO FUNIL COMERCIAL (light + dark, sempre com neon)

| Classe | Background | Cor | Borda |
|---|---|---|---|
| `.badge-aberto` | `transparent` | `var(--text-muted)` | `var(--border-subtle)` |
| `.badge-precificacao` | `rgba(255,230,0,.08)` | `var(--accent)` | `rgba(255,230,0,.2)` |
| `.badge-enviada` | `rgba(255,230,0,.08)` | `var(--accent)` | `rgba(255,230,0,.2)` |
| `.badge-negociacao` | `rgba(255,230,0,.15)` | `var(--accent)` | `rgba(255,230,0,.35)` |
| `.badge-ganho` | `var(--accent)` | `var(--text-primary)` | `var(--accent-hover)` |
| `.badge-perdido` | `rgba(255,230,0,.05)` | `rgba(255,230,0,.4)` | `rgba(255,230,0,.12)` |
| `.badge-preco-definir` | `rgba(255,230,0,.05)` | `rgba(255,230,0,.4)` | `rgba(255,230,0,.12)` |

### Pontos coloridos (`col-dot`)
| Classe | Cor |
|---|---|
| `.col-dot-aberto` | `var(--text-muted)` |
| `.col-dot-precificacao` | `rgba(255,230,0,.5)` |
| `.col-dot-enviada` | `rgba(255,230,0,.5)` |
| `.col-dot-negociacao` | `var(--accent)` |
| `.col-dot-ganho` | `var(--accent)` |
| `.col-dot-perdido` | `rgba(255,230,0,.2)` |

### Bordas esquerdas dos cards do kanban comercial
| Classe | Cor |
|---|---|
| `.kcard` (default) | `3px solid var(--accent)` |
| `.kcard-ganho` | `5px solid var(--accent)` |
| `.kcard-perdido` | `rgba(255,230,0,.25)` |
| `.kcard-negociacao` | `var(--accent)` |
| `.kcard-enviada` | `rgba(255,230,0,.55)` |

---

## 🔵 5) BADGES DE SINCRONIZAÇÃO / NF-e (verde/vermelho/azul fixos — ambos os temas)

| Classe | Background | Cor | Borda |
|---|---|---|---|
| `.badge-sync` | `rgba(34,197,94,.12)` | `#22C55E` | `rgba(34,197,94,.25)` |
| `.badge-error` | `rgba(239,68,68,.12)` | `#EF4444` | `rgba(239,68,68,.25)` |
| `.badge-pending` | `rgba(255,230,0,.12)` | `var(--accent)` | `rgba(255,230,0,.25)` |
| `.import-file-done` | `rgba(34,197,94,.04)` + `border-left:3px solid #22C55E` | — | — |
| `.import-file-pending` | `var(--bg-card)` + `border-left:3px solid var(--border-strong)` | — | — |
| `.import-file-processing` | `var(--bg-card)` + `border-left:3px solid var(--accent)` | — | — |
| `.import-file-error` | `rgba(239,68,68,.04)` + `border-left:3px solid #EF4444` | — | — |
| `.prod-status.ok` | `rgba(34,197,94,.10)` | `#22C55E` | — |
| `.prod-status.low` | `rgba(255,230,0,.12)` | `var(--accent)` | — |
| `.prod-status.empty` | `rgba(239,68,68,.10)` | `#EF4444` | — |
| `.row-selected` | `rgba(255,230,0,.06) !important` + `border-left:2px solid var(--accent)` | — | — |

> Note: a paleta de status de NF-e usa `#22C55E` / `#EF4444` diretos, **NÃO** `var(--success)`.
> Esta é uma excessão intencional que mantém visibilidade nos dois temas.

---

## 🖱️ 6) INTERAÇÕES (hover/focus/active/drag)

- **Hover card padrão**: `box-shadow: var(--shadow); transform: translateY(-1px)` (KPI e variantes)
- **Hover botão**: `transform: translateY(-2px)` (primário) ou `translateY(-3px)` (outline/ghost)
- **Active botão**: `transform: scale(0.96)` ou `scale(0.94)` (outline/ghost)
- **Focus input**: `border-color: var(--accent); box-shadow: 0 0 0 3px rgba(255,230,0,.15)`
- **Drag-over coluna kanban**: `background: var(--bg-elevated); border-color: var(--accent)`
- **Nav hover effect**: `.horizontal-nav:hover > :not(.value:hover) { filter: blur(1px); transform: scale(0.97); transition: 300ms; }` — sibling blur estilo macOS dock
- **Flash de erro card**: `@keyframes kcardFlashError { 0%,100% { box-shadow: 0 0 0 rgba(255,230,0,0); } 50% { box-shadow: 0 0 0 2px rgba(255,230,0,.5); border-color: var(--danger); } }`
- **Pulse alerta** (`@keyframes pulse-warning` / `pulse-danger`): box-shadow pulsando de `rgba(255,230,0,.2)` → `.4`
- **Modal overlay**: `background: rgba(0,0,0,.55); backdrop-filter: blur(3px)`
- **Toast**: `background: var(--accent); color: var(--btn-primary-fg)` (preto light / cinza dark)

### Animations (não-cores mas fazem parte do "feel")
- `fade` 250ms, `modalIn` 200ms (translateY 14px), `burst` 800ms (scale .4 → 1.6),
  `checkPopIn` 400ms + `checkDraw` (stroke-dashoffset 36 → 0), `rowIn` 200ms (translateY 6px),
  `kcardGlowSuccess` 3s `rgba(255,230,0,.12)` → transparent

---

## 🧩 7) TIPOGRAFIA

- **Font family**: `'Inter', system-ui, -apple-system, sans-serif` (carregada via Google Fonts CDN)
- **Pesos usados**: 400, 500, 600, 700, 800 (`@import Inter:wght@400;500;600;700;800`)
- **Body default**: `font-size: 16px`, `line-height: 1.45`, `-webkit-font-smoothing: antialiased`
- **Monospace numbers**: `.mono { font-variant-numeric: tabular-nums; }` (KPIs, valores $)
- **Letter-spacing** em labels uppercase: `.5px` ou `1px` em `.nav-group-label`, `.kpi-label`, `.card-sub`
- **Text-transform**: `.kpi-label`, `.nav-group-label`, `.table th`, `.import-section-title` → uppercase

---

## ⚙️ 8) TRANSIÇÕES GLOBAIS (timing)

Todos estes elementos fazem **transição suave de 200ms** ao trocar tema:
```css
body, .topbar, .card, .kpi-card, .kanban-col, .kcard, .atv-card,
.modal, .btn, .field input, .field select, .field textarea, .table th,
.table td, .preview-chip, .photo-box, .toast, .nav-item, .user-chip, .col-dot {
  transition: background-color .2s ease, color .2s ease,
              border-color .2s ease, box-shadow .2s ease;
}
```

NÃO usar transições > 300ms em coils de cor (excessão: nav blur=300ms, kcardGlowSuccess=3s,
animações de alerta pulse=2s).

---

## 🚫 9) PROIBIÇÕES

1. **NUNCA** introduzir cores fora desta tabela. Se precisar de uma cor nova, pergunte.
2. **NÃO** usar `#3b82f6` (azul Tailwind) fora do módulo Qualidade (checklists/lembretes). Azul
   no resto do site = ausente; o accent é PRETO/cinza.
3. **NÃO** usar lighten/darken de Tailwind (`bg-blue-500` etc.). Tudo via `var(--accent)` ou
   `rgba()` tabelado.
4. **NÃO** usar `var(--success)`, `var(--danger)`, `var(--warning)` para renderizar badges/ícones
   no módulo Qualidade — lá, cores são hardcoded `#22c55e/#eab308/#ef4444/#3b82f6`.
5. **NÃO** aplicar filtro de cor em SVGs de nav ativos além de `stroke: var(--accent)`.
6. **NÃO** substituir o amarelo neon `rgba(255,230,0,X)` por `#F59E0B` (warning) — são coisas
   distintas: neon é estético/decorativo; warning é semântico (e só no light mode).
7. **NÃO** mexer no `data-theme` antes da pintura. Inline em `<head>` do `index.html`:
   ```html
   <script>
     document.documentElement.setAttribute('data-theme', 'dark');
   </script>
   ```
   Default = dark. Toggle vai pelo `Theme.apply()` em `app.js`.

---

## 📋 10) CHECKLIST DE REVISÃO (antes de aprovar uma geração do AI Studio)

Quando o Gemini gerar componente/tela/estilo, verifique:

- [ ] Tudo usa `var(...)` em vez de cores literais (exceto where explicitly hardcoded na tabela)
- [ ] Hover/focus usam transform/sombra tabelados — sem box-shadow inventado
- [ ] Badges do funil usam neon `rgba(255,230,0,X)` — não `#22c55e`
- [ ] Cards do kanban Qualidade usam `#22c55e/#eab308/#ef4444` hardcoded — não `var()`
- [ ] Scrollbar tem fundo `transparent` e thumb `rgba(255,230,0,.25)` (hover `.4`)
- [ ] Inputs em `:focus` produzem `box-shadow: 0 0 0 3px rgba(255,230,0,.15)`
- [ ] Tema dark apresenta success/danger/warning em `#BFBFBF` (cinza muted)
- [ ] Nav-horizontal ativa sibling blur `1px` + `scale(0.97)` em hover não-focado
- [ ] Toast usa `background: var(--accent)` (preto no light, #2f2f2f no dark)
- [ ] Modal overlay tem `backdrop-filter: blur(3px)` + `rgba(0,0,0,.55)`
- [ ] Glassmorphism usa `var(--glass-bg)` + `backdrop-filter: blur(12px)`

---

## 🎯 RESUMO DE UMA LINHA

> **"Paleta monocromática (preto/cinza/branco + acento neon rgba(255,230,0,X)) no CRM comercial;
> paleta semântica verde/amarelo/vermelho/azul hardcoded só no módulo Qualidade. Tema dark
> colapsa success/danger/warning para cinza #BFBFBF — mas neon e cores hardcoded do módulo
> Qualidade permanecem ativas. Transitional .2s ease global em troca de tema."**

---

**FIM — use este prompt para o Gemini reproduzir fielmente qualquer parte visual do site.**
