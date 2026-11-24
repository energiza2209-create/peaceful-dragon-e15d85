/* =========================================================
   ENERGIZA CRM — App principal (SPA)
   Parte 1: bootstrap, helpers, estado e navegação.
   As telas (dashboard, funil, gerador, catálogo, relatórios)
   registram-se em VIEWS e são renderizadas sob demanda.
   ========================================================= */

/* ---------------- Helpers globais ---------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// Helpers globais — usados em views via window scope
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
const BRL = (n) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString('pt-BR');
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

async function checkStalledNegotiations() {
  const propostas = DB.getPropostas();
  const now = new Date();
  const stalled = propostas.filter(p => {
    if (p.status === 'ganho' || p.status === 'perdido') return false;
    const lastUpdate = p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt || 0);
    const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);
    return diffDays > 7; // Mais de 7 dias sem atualização
  });

  if (stalled.length > 0) {
    // Agrupa por comprador para facilitar o contato
    const buyers = {};
    stalled.forEach(p => {
      const buyerName = p.contato || 'Não informado';
      if (!buyers[buyerName]) buyers[buyerName] = [];
      buyers[buyerName].push(p);
    });

    const box = el('div');
    box.innerHTML = `
      <div style="text-align:center;padding:10px">
        <p style="margin-bottom:15px">Existem <strong>${stalled.length}</strong> negociações paradas há mais de 7 dias.</p>
        <div style="text-align:left;margin-bottom:20px">
          ${Object.entries(buyers).map(([name, props]) => {
            const client = DB.getClients().find(c => c.name === props[0].cliente || (props[0].contato && c.comprador === name));
            const phone = client ? (client.phoneBuyer || client.phone) : null;

            const cotList = props.map(p => {
              if (p.cotacaoNum) return '• Cotação nº ' + p.cotacaoNum + (p.cliente ? ' — ' + p.cliente : '');
              const item = (p.itens && p.itens[0]) ? p.itens[0].nome : '';
              return '• ' + (item ? item + ' — ' : '') + (p.cliente || 'Proposta');
            }).join('\n');
            const msg = `Olá ${name}! Tudo bem?\nAqui é o Matheus, da Metrolabs. Estou passando para saber a situação das nossas cotações em aberto:\n\n${cotList}\n\nExiste alguma novidade ou previsão sobre elas? Obrigado!`;
            const waHref = phone ? 'https://wa.me/55' + phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg) : null;

            return `
              <div style="border:1px solid var(--border-subtle);padding:10px;border-radius:8px;margin-bottom:12px;background:var(--bg-card)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <strong style="color:var(--text-primary)">${escapeHtml(name)}</strong>
                  ${waHref ? `<a href="${waHref}" target="_blank" class="btn btn-primary btn-sm" style="font-size:10px">WhatsApp</a>` : '<span style="font-size:10px;color:var(--text-muted)">Sem telefone</span>'}
                </div>
                <ul style="list-style:none;padding:0;font-size:var(--font-xs);margin:0">
                  ${props.map(p => `
                    <li style="padding:3px 0;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between">
                      <span>${p.cotacaoNum ? escapeHtml(p.cliente) + ' — <strong>Cotação ' + escapeHtml(p.cotacaoNum) + '</strong>' : escapeHtml(p.cliente) + ' — <em style="color:var(--text-muted)">sem nº (associe no funil)</em>'}</span>
                      <span style="color:var(--text-muted)">${p.status}</span>
                    </li>`).join('')}
                </ul>
              </div>`;
            }).join('')}
        </div>
        <button class="btn btn-primary btn-block" id="btnOkAlerta">Entendido / Ir para Funil</button>
      </div>
    `;
    Modal.open('Alerta de Negociações', box);
    $('#btnOkAlerta').addEventListener('click', () => {
      Modal.close();
      navigate('funil');
    });
  }
}

const Theme = {
  storageKey: 'ENERGIZA_THEME',
  current: 'light',
  iconLight: `<svg viewBox="0 0 24 24"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36l-1.42 1.42M7.05 16.95l-1.42 1.42M18.36 18.36l-1.42-1.42M7.05 7.05L5.64 5.64"/><circle cx="12" cy="12" r="5"/></svg>`,
  iconDark: `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>`,
  init() {
    const saved = localStorage.getItem(this.storageKey);
    this.current = saved === 'dark' ? 'dark' : 'light';
    this.apply(this.current);
  },
  apply(theme) {
    this.current = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.current);
    localStorage.setItem(this.storageKey, this.current);
    document.body.classList.toggle('dark-mode', this.current === 'dark');
    const toggle = $('#themeToggle');
    if (toggle) {
      toggle.innerHTML = this.current === 'dark' ? this.iconLight : this.iconDark;
      toggle.setAttribute('aria-label', this.current === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro');
    }
    if (typeof refreshAll === 'function') refreshAll();
  },
  toggle() {
    this.apply(this.current === 'dark' ? 'light' : 'dark');
  },
};

/* eslint-disable no-unused-vars */
function successBurst(x, y) {
  const b = el('div', 'check-pop', '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>');
  const cx = (x != null) ? x : window.innerWidth / 2;
  const cy = (y != null) ? y : window.innerHeight / 2;
  b.style.left = (cx - 32) + 'px';
  b.style.top = (cy - 32) + 'px';
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 900);
}



/* ---------------- Modal genérico ---------------- */
const Modal = {
  open(title, bodyEl) {
    $('#modalTitle').textContent = title;
    const body = $('#modalBody');
    body.innerHTML = '';
    if (typeof bodyEl === 'string') body.innerHTML = bodyEl; else body.appendChild(bodyEl);
    $('#modalOverlay').classList.add('open');
  },
  close() { $('#modalOverlay').classList.remove('open'); },
};

/* ---------------- Registro de telas ---------------- */
/* Cada módulo faz: VIEWS.register('funil', { title, subtitle, render }) */
const VIEWS = {
  _map: {},
  register(key, def) { this._map[key] = def; },
  get(key) { return this._map[key]; },
};

/* ---------------- Estado da aplicação ---------------- */
const State = {
  current: 'login',
  meta: {
    login: { title: 'Login', subtitle: 'Acesse sua conta' },
    dashboard: { title: 'Dashboard Gerencial', subtitle: 'Visão geral do desempenho comercial' },
    funil: { title: 'Funil de Vendas', subtitle: 'Mova os cards para atualizar o estágio do negócio' },
    clientes: { title: 'Cadastro de Clientes', subtitle: 'Digite o CNPJ e os dados são buscados automaticamente na Receita Federal' },
    gerador: { title: 'Gerador de Propostas', subtitle: 'Propostas técnicas e comerciais personalizadas' },
    produtos: { title: 'Catálogo de Produtos', subtitle: 'Itens e serviços disponíveis para cotação' },
    relatorios: { title: 'Relatórios do Mês', subtitle: 'Consolidação e integração financeira' },
    parceiros: { title: 'Parceiros', subtitle: 'Clientes e fornecedores cadastrados' },
  },
};

/* ---------------- Navegação SPA ---------------- */
function navigate(key) {
  if (!State.meta[key]) return;
  State.current = key;

  const isLogin = key === 'login';
  document.body.classList.toggle('auth-mode', isLogin);

  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === key));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + key));

  // Funil usa rolagem independente por coluna (sem scroll global no content)
  const content = $('.content');
  if (content) content.classList.toggle('funil-active', key === 'funil');

  const meta = State.meta[key];
  const viewTitle = $('#viewTitle');
  const viewSubtitle = $('#viewSubtitle');
  if (viewTitle) viewTitle.textContent = meta.title;
  if (viewSubtitle) viewSubtitle.textContent = meta.subtitle;

  const def = VIEWS.get(key);
  if (def && typeof def.render === 'function') {
    try { def.render(); }
    catch (err) { logger.error('Erro ao renderizar view', key, err); }
  }

  // fecha menu horizontal no mobile
  const hnav = $('#horizontalNav');
  if (hnav) hnav.classList.remove('open');
}

/* Re-render da tela atual + dashboard (usado após mudanças de dados) */
function refreshAll() {
  const dash = VIEWS.get('dashboard');
  if (dash) dash.render();
  const cur = VIEWS.get(State.current);
  if (cur && State.current !== 'dashboard' && State.current !== 'login') cur.render();
}

/* ---------------- Bootstrap ---------------- */
async function boot() {
  DB.ensureSeed();
  await checkStalledNegotiations();

  // ─── Síncrono: eventos, módulos ───
  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));
  const hnav = $('#horizontalNav');
  const menuToggle = $('#menuToggle');
  if (menuToggle) menuToggle.addEventListener('click', () => hnav && hnav.classList.toggle('open'));

  const userChip = $('#userChip');
  const userChipBtn = $('#userChipBtn');
  if (userChipBtn) userChipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = userChip.classList.toggle('open');
    userChipBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (userChip && !userChip.contains(e.target)) {
      userChip.classList.remove('open');
      if (userChipBtn) userChipBtn.setAttribute('aria-expanded', 'false');
    }
    if (hnav && hnav.classList.contains('open') && !hnav.contains(e.target) && e.target.id !== 'menuToggle') {
      hnav.classList.remove('open');
    }
  });
  const userLogout = $('#userLogout');
  if (userLogout) userLogout.addEventListener('click', async () => {
    if (userChip) userChip.classList.remove('open');
    if (userChipBtn) userChipBtn.setAttribute('aria-expanded', 'false');
    await Auth.logout();
  });
  // Acesso direto: sem login, o menu de usuário (Sair) não faz sentido
  if (window.DEMO_MODE && userChip) userChip.style.display = 'none';
  const themeToggle = $('#themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', () => Theme.toggle());
  const newProposalBtn = $('#newProposalBtn');
  if (newProposalBtn) newProposalBtn.addEventListener('click', () => navigate('gerador'));
  const modalClose = $('#modalClose');
  if (modalClose) modalClose.addEventListener('click', Modal.close);
  const modalOverlay = $('#modalOverlay');
  if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') Modal.close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Modal.close(); });
  $$('.nav-item').forEach(btn => { btn.addEventListener('click', () => hnav && hnav.classList.remove('open')); });

  // ─── Acesso direto (login desativado) ───
  window.DEMO_MODE = true;

  Object.values(VIEWS._map).forEach(v => { if (typeof v.init === 'function') v.init(); });
  Theme.init();

  _initApp();
  navigate('dashboard');

  async function _initApp() {
    // ─── Migrações IMED ───
    const prodById = id => DB.getProdutos().find(x => x.id === id);

    try {
      const MIG_MARK = '(40 itens calibração)';
      const ids = [
        'P009','P010','P011','P012','P013','P014','P015','P016','P017','P018',
        'P019','P020','P021','P022','P023','P024','P025','P026','P027','P028',
        'P029','P030','P031','P032','P033','P034','P035','P036','P037','P038',
        'P039','P040','P041','P042','P043','P044','P046','P047',
      ];
      const qtdMap = {
        P009:4,P010:6,P011:6,P012:1,P013:3,P014:7,P015:1,P016:39,P017:12,P018:3,
        P019:3,P020:11,P021:21,P022:12,P023:4,P024:2,P025:1,P026:5,P027:1,P028:2,
        P029:3,P030:58,P031:44,P032:1,P033:2,P034:32,P035:20,P036:18,P037:3,P038:4,
        P039:40,P040:8,P041:1,P042:11,P043:8,P044:5,P046:2,P047:12,
      };
      const precoMap = {
        P009:234.25,P010:176.69,P011:160.63,P012:106.28,P013:112.44,P014:196.77,
        P015:833.93,P016:64.25,P017:178.03,P018:146.71,P019:45.92,P020:168.66,
        P021:51.41,P022:51.41,P023:271.73,P024:271.73,P025:331.97,P026:327.02,
        P027:96.38,P028:246.30,P029:96.38,P030:223.49,P031:89.02,P032:107.09,
        P033:128.50,P034:89.02,P035:74.96,P036:74.96,P037:96.38,P038:271.73,
        P039:271.73,P040:91.02,P041:271.73,P042:74.03,P043:552.83,P044:178.03,
        P046:112.37,P047:112.44,
      };

      const tinta = DB.getPropostas().find(p => p.id === 'PROP-1102');
      if (tinta && Array.isArray(tinta.itens)) {
        const soTinta = tinta.itens.filter(it => !/^P04[1-8]$/.test(it.produtoId || ''));
        if (soTinta.length !== tinta.itens.length) DB.updateProposta(tinta.id, { itens: soTinta });
      }

      const buildItens = () => ids.map(id => {
        const p = prodById(id);
        if (!p) return null;
        return {
          produtoId: p.id, nome: p.nome, descricao: p.descricao,
          categoria: p.categoria, preco: precoMap[id] ?? p.preco,
          qtd: qtdMap[id] || 1, foto: p.foto,
        };
      }).filter(Boolean);

      let imed = DB.getPropostas().find(p => (p.cliente || '').includes(MIG_MARK));
      if (!imed) {
        DB.addProposta({
          cliente: 'IMED HMB - 69012 - Calibração e Testes ' + MIG_MARK,
          contato: '', categoria: 'Calibração', status: 'aberto',
          validade: '15 dias', prazo: '30 dias úteis', pagamento: '30/60 dias',
          itens: buildItens(),
        });
      } else {
        const itens = (imed.itens || []).slice();
        const exist = new Set(itens.map(i => i.produtoId));
        const fixed = itens.map(it => {
          const id = it.produtoId;
          const upd = {};
          if (precoMap[id] !== undefined) upd.preco = precoMap[id];
          if (qtdMap[id] !== undefined && it.qtd !== qtdMap[id]) upd.qtd = qtdMap[id];
          return Object.keys(upd).length ? { ...it, ...upd } : it;
        });
        const filtrados = fixed.filter(it => ids.includes(it.produtoId));
        ids.forEach(id => {
          if (!exist.has(id)) {
            const novo = buildItens().find(x => x.produtoId === id);
            if (novo) filtrados.push(novo);
          }
        });
        DB.updateProposta(imed.id, { itens: filtrados });
      }
    } catch (e) { logger.warn('[migração IMED] ignorada: ' + e, 'boot'); }

    try {
      const HEF_MARK = '(kit IMED HEF)';
      const hef = DB.getPropostas().find(p => (p.cliente || '').includes(HEF_MARK));
      const qtdHEF = {
        P049: 4, P050: 10, P051: 5, P052: 2, P053: 10, P054: 20, P055: 10,
        P056: 1, P057: 15, P058: 4, P059: 2, P060: 2, P061: 10, P062: 5,
        P063: 5, P064: 3, P065: 2, P066: 5, P067: 3, P068: 5, P069: 10,
        P070: 8, P071: 12, P072: 2, P073: 20,
      };
      const idsHEF = Object.keys(qtdHEF);
      const buildItensHEF = () => idsHEF.map(id => {
        const p = prodById(id);
        if (!p) return null;
        return { produtoId: p.id, nome: p.nome, descricao: p.descricao, categoria: p.categoria, preco: p.preco, qtd: qtdHEF[id] || 1, foto: p.foto };
      }).filter(Boolean);
      if (!hef) {
        DB.addProposta({
          cliente: 'IMED HEF - Insumos e Equipamentos ' + HEF_MARK,
          contato: '', categoria: 'Peças e Insumos', status: 'aberto',
          validade: '15 dias', prazo: '30 dias úteis', pagamento: '30/60 dias',
          itens: buildItensHEF(),
        });
      } else {
        const itens = (hef.itens || []).slice();
        const present = new Set(itens.map(i => i.produtoId));
        const fixed = itens.map(it => {
          const id = it.produtoId;
          const p = prodById(id);
          if (p && qtdHEF[id] !== undefined) return { ...it, preco: p.preco, qtd: qtdHEF[id] };
          return it;
        });
        idsHEF.forEach(id => { if (!present.has(id)) fixed.push(buildItensHEF().find(x => x.produtoId === id)); });
        DB.updateProposta(hef.id, { itens: fixed.filter(Boolean) });
      }
    } catch (e) { logger.warn('[migração IMED HEF] ignorada: ' + e, 'boot'); }

    // ─── Pull inicial do Supabase (com timeout 4s) ───
    refreshAll();
    logger.info('[boot] aguardando dados do Supabase...', 'boot');
    let remoteDone = false;
    try {
      await Promise.race([
        DB.remote.init(() => {
          refreshAll();
          if (State.current === 'funil') toast('Funil atualizado em tempo real');
        }).then(() => { remoteDone = true; }),
        new Promise(resolve => setTimeout(() => { logger.info('[boot] timeout 4s — renderizando com dados locais', 'boot'); resolve(); }, 4000))
      ]);
    } catch (e) {
      logger.warn('[boot] remote.init timeout/erro, usando dados locais: ' + e, 'boot');
    }

    logger.info('[boot] dados carregados — Clientes: ' + DB.getClients().length + ' NF-e: ' + (DB.getNfeImports || (() => []))().length, 'boot');
    refreshAll();

    // ─── Realtime do módulo Qualidade (Auvo/Compras/Checklists) ───
    if (typeof QDB !== 'undefined' && QDB && QDB.subscribeRealtime) {
      try { window._stopQualidadeRT = QDB.subscribeRealtime(refreshAll); }
      catch (e) { logger.warn('[boot] QDB realtime falhou', 'boot', e); }
    }

    if (!remoteDone) {
      logger.info('[boot] remote.init ainda em background — UI será atualizada quando chegar.', 'boot');
    }
  }
}

document.addEventListener('DOMContentLoaded', boot);
