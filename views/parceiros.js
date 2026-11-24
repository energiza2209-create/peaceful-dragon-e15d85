(() => {
  'use strict';

  let activeTab = 'clientes';

  // ───── Dados mock (fallback quando não há importações) ─────
  const MOCK_NFES = [
    { id:1, chave:"4523.0115.2025.0001.0001.1234.5678.9012.3456.7890.1234", numero:"452301-1", emissor:"Hospital Santa Casa", data:"15/03/2025", status:"sincronizado", erro:null, itens:4 },
    { id:2, chave:"4523.0214.2025.0001.0001.9876.5432.1098.7654.3210.9876", numero:"452302-1", emissor:"Laboratório São Marcos", data:"14/03/2025", status:"sincronizado", erro:null, itens:2 },
    { id:3, chave:"4523.0312.2025.0001.0001.5678.1234.5678.1234.5678.1234", numero:"452303-1", emissor:"Clínica Vida Plena", data:"12/03/2025", status:"erro", erro:"CNPJ não cadastrado no sistema", itens:10 },
    { id:4, chave:"4523.0407.2025.0001.0001.4321.8765.4321.8765.4321.8765", numero:"452304-1", emissor:"Dental Center Odonto", data:"07/03/2025", status:"pendente", erro:null, itens:1 },
    { id:5, chave:"4523.0505.2025.0001.0001.2468.1357.2468.1357.2468.1357", numero:"452305-1", emissor:"Farmácia Saúde Total", data:"05/03/2025", status:"erro", erro:"Alíquota ICMS ausente nos itens", itens:50 },
    { id:6, chave:"4523.0628.2025.0001.0001.1357.2468.1357.2468.1357.2468", numero:"452306-1", emissor:"Clínica Médica Nova Vida", data:"28/02/2025", status:"pendente", erro:null, itens:3 },
  ];

  // Carrega NFs reais do localStorage, fallback para mock
  function getNfeDisplayList() {
    const real = DB.getNfeImports();
    if (real.length > 0) return real.map((n, i) => ({
      id: n.nfId || i,
      chave: n.nfId || '',
      numero: n.nfNumber + (n.serie ? '-' + n.serie : ''),
      emissor: n.supplierName || n.clientName || '—',
      data: n.date ? fmtDate(n.date) : '—',
      status: n.status || 'sincronizado',
      erro: n.erro || null,
      itens: n.productCount || '—',
      _real: true,
    }));
    return MOCK_NFES.slice();
  }

  // estado para sincronização (preenchido na render)
  let nfeList = [];

  // ───── Helpers ─────
  function formatCnpj(v) {
    const d = (v || '').replace(/\D/g, '');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return v || '—';
  }
  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch (_) { return d; }
  }
  function fmtMoney(v) { return BRL(v); }

  const Svg = {
    people: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    box: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    sync: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    file: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    csv: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    upload: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    lock: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    doc: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  };

  // ════════════════════════════════════════════════════════════════
  //  ABA 1 — CLIENTES (reaplica toda a lógica existente + melhorias)
  // ════════════════════════════════════════════════════════════════

  let filtroCliente = '';
  let filtroTipo = 'todos';

  function renderClientes() {
    const container = $('#parceirosContent');
    if (!container) return;

    // ── First render: build stable toolbar + table skeleton ──
    if (!container.querySelector('#parceirosBody')) {
      container.innerHTML = `
        <div class="tab-content-fade">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
            <div class="search-bar" style="max-width:360px;flex:1;min-width:200px">
              <input type="text" id="parcBusca" placeholder="Buscar por nome, CNPJ, endereço...">
            </div>
            ${Auth.can('clientes') ? `<button class="btn btn-primary btn-sm" id="parcAddBtn">${Svg.plus} Novo Cliente</button>` : ''}
          </div>

          <div id="parcFilters" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px">
            <button class="btn btn-sm btn-primary" data-parc-filtro="todos">Todos</button>
            <button class="btn btn-sm btn-ghost" data-parc-filtro="clientes">Clientes</button>
            <button class="btn btn-sm btn-ghost" data-parc-filtro="fornecedores">Fornecedores</button>
            <button class="btn btn-sm btn-ghost" data-parc-filtro="precos">Histórico de Preços</button>
          </div>

          <div class="card" style="padding:0;overflow:hidden">
            <div style="overflow-x:auto">
              <table class="parc-table">
                <colgroup>
                  <col style="width:28%"><col style="width:14%"><col style="width:16%"><col style="width:13%"><col style="width:13%"><col style="width:16%">
                </colgroup>
                <thead>
                  <tr><th>Nome / Endereço</th><th>CNPJ</th><th>Email</th><th>Telefone</th><th>Última Venda</th><th>Total Gasto</th></tr>
                </thead>
                <tbody id="parceirosBody"></tbody>
              </table>
            </div>
          </div>
        </div>`;

      // Search event — bound once, never recreated
      $('#parcBusca').addEventListener('input', () => {
        filtroCliente = $('#parcBusca').value.trim();
        renderClientesTable();
      });

      // Filter buttons — delegated on container
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-parc-filtro]');
        if (!btn) return;
        const tipo = btn.dataset.parcFiltro;
        if (tipo === 'precos') { openPriceHistory(); return; }
        filtroTipo = tipo;
        container.querySelectorAll('[data-parc-filtro]').forEach(b => {
          b.className = 'btn btn-sm ' + (b.dataset.parcFiltro === filtroTipo ? 'btn-primary' : 'btn-ghost');
        });
        renderClientesTable();
      });

      // Novo cliente
      const addBtn = $('#parcAddBtn');
      if (addBtn) addBtn.addEventListener('click', openNewForm);
    }

    // Sync input value + filter button states
    $('#parcBusca').value = filtroCliente;
    container.querySelectorAll('[data-parc-filtro]').forEach(b => {
      b.className = 'btn btn-sm ' + (b.dataset.parcFiltro === filtroTipo ? 'btn-primary' : 'btn-ghost');
    });

    renderClientesTable();
  }

  function renderClientesTable() {
    const body = $('#parceirosBody');
    if (!body) return;

    const all = DB.getClients();
    let list = all;
    if (filtroTipo === 'clientes') {
      list = all.filter(c => !(c.observations || '').toLowerCase().includes('fornecedor'));
    } else if (filtroTipo === 'fornecedores') {
      list = all.filter(c => (c.observations || '').toLowerCase().includes('fornecedor'));
    }
    if (filtroCliente) {
      const f = filtroCliente.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(f) ||
        (c.cnpj || '').includes(f) ||
        (c.razaoSocial || '').toLowerCase().includes(f) ||
        (c.address || '').toLowerCase().includes(f) ||
        (c.observations || '').toLowerCase().includes(f)
      );
    }

    body.innerHTML = '';
    if (!list.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum ' + (filtroTipo === 'fornecedores' ? 'fornecedor' : 'cliente') + (filtroCliente ? ' para "' + escapeHtml(filtroCliente) + '"' : ' cadastrado.') + '</td></tr>';
      return;
    }

    list.forEach(c => {
      const tr = el('tr');
      const lastSale = c.lastSale ? fmtDate(c.lastSale) : '—';
      const endereco = (c.address || '').trim();
      const fornecTag = (c.observations || '').toLowerCase().includes('fornecedor') ? '<span style="color:var(--text-muted);font-size:10px">[Fornecedor]</span> ' : '';
      const razao = (c.razaoSocial && c.razaoSocial !== c.name) ? '<br><span style="font-size:10px;color:var(--text-secondary)">' + escapeHtml(c.razaoSocial) + '</span>' : '';
      tr.innerHTML = `
        <td>${fornecTag}<strong>${escapeHtml(c.name)}</strong>${razao}${endereco ? '<br><span style="font-size:10px;color:var(--text-muted)">' + escapeHtml(endereco) + '</span>' : ''}</td>
        <td style="font-family:mono;font-size:var(--font-xs)">${escapeHtml(formatCnpj(c.cnpj))}</td>
        <td style="font-size:var(--font-xs)">${escapeHtml(c.email || '—')}</td>
        <td style="font-size:var(--font-xs)">${escapeHtml(c.phone || '—')}</td>
        <td style="font-size:var(--font-xs)">${lastSale}</td>
        <td style="font-size:var(--font-xs)" class="mono">${fmtMoney(c.totalSpent || 0)}</td>`;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => openDossie(c));
      body.appendChild(tr);
    });
  }

  // ───── Dossiê do cliente ─────
  function openDossie(client) {
    const box = el('div');
    const hist = Array.isArray(client.salesHistory) ? client.salesHistory : [];
    const totalGasto = hist.reduce((s, h) => s + (h.total || 0), 0);

    const byNF = {};
    hist.forEach(h => {
      const nf = h.nfNumber || 'SEM NF';
      if (!byNF[nf]) byNF[nf] = { nf, date: h.date, itens: [], total: 0 };
      byNF[nf].itens.push(h);
      byNF[nf].total += (h.total || 0);
    });
    const nfs = Object.values(byNF).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div>
          <h3 style="color:var(--text-primary);font-size:var(--font-lg);margin:0">${escapeHtml(client.name)}</h3>
           <p style="color:var(--text-secondary);font-size:var(--font-sm);margin:2px 0">${escapeHtml(formatCnpj(client.cnpj))}${client.comprador ? ' | Contato: ' + escapeHtml(client.comprador) : ''}${client.email ? ' | ' + escapeHtml(client.email) : ''}${client.phone ? ' | ' + escapeHtml(client.phone) : ''}${client.address ? '<br>' + escapeHtml(client.address) : ''}</p>
        </div>
        <div style="text-align:right">
          <div style="font-size:var(--font-xs);color:var(--text-muted)">Total gasto</div>
          <div style="font-size:var(--font-xl);font-weight:800;color:var(--accent)">${fmtMoney(totalGasto)}</div>
          <div style="font-size:var(--font-xs);color:var(--text-muted)">${hist.length} registro(s) em ${nfs.length} NF(s)</div>
        </div>
      </div>
      <hr style="border-color:var(--border-subtle);margin:0 0 12px 0">
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        ${Auth.can('clientes') ? '<button class="btn btn-primary btn-sm" id="ddEdit">✎ Editar Cliente</button>' : ''}
        ${Auth.can('clientes') ? '<button class="btn btn-danger btn-sm" id="ddDelete">✕ Excluir</button>' : ''}
      </div>
      <hr style="border-color:var(--border-subtle);margin:0 0 12px 0">`;

    if (!nfs.length) {
      html += '<p style="color:var(--text-muted);text-align:center;padding:16px 0">Nenhuma compra registrada para este cliente.</p>';
    } else {
      nfs.forEach(nf => {
        html += `
        <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;cursor:pointer" class="nf-toggle" data-nf="${escapeHtml(nf.nf)}">
            <div>
              <strong style="color:var(--text-primary);font-size:var(--font-sm)">NF ${escapeHtml(nf.nf)}</strong>
              <span style="color:var(--text-muted);font-size:var(--font-xs);margin-left:8px">${fmtDate(nf.date)}</span>
            </div>
            <div>
              <span style="color:var(--accent);font-weight:700;font-size:var(--font-sm)">${fmtMoney(nf.total)}</span>
              <span style="color:var(--text-muted);font-size:var(--font-xs);margin-left:6px">${nf.itens.length} item(ns)</span>
            </div>
          </div>
          <div class="nf-detail" data-nf="${escapeHtml(nf.nf)}" style="display:none">`;
        nf.itens.forEach(h => {
          html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border-subtle);font-size:var(--font-xs)">
            <div style="flex:1">${escapeHtml(h.item || '—')}</div>
            <div style="width:60px;text-align:right;color:var(--text-secondary)">${h.quantity || 0}x</div>
            <div style="width:80px;text-align:right;color:var(--text-secondary)">${fmtMoney(h.unitPrice || 0)}</div>
            <div style="width:90px;text-align:right;font-weight:600;color:var(--text-primary)">${fmtMoney(h.total || 0)}</div>
          </div>`;
        });
        html += `</div></div>`;
      });
    }

    if (hist.length) {
      html += `
      <hr style="border-color:var(--border-subtle);margin:12px 0">
      <h4 style="color:var(--text-primary);margin-bottom:8px;font-size:var(--font-sm)">Todas as compras (${hist.length})</h4>
      <div style="max-height:180px;overflow-y:auto">
        <table class="parc-table" style="font-size:var(--font-xs)">
          <thead><tr><th>Data</th><th>Item</th><th>Qtd</th><th>Unit.</th><th>Total</th><th>NF</th></tr></thead>
          <tbody>${hist.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(h => `
            <tr><td>${fmtDate(h.date)}</td>
            <td>${escapeHtml(h.item || '—')}</td>
            <td>${h.quantity || 0}</td>
            <td class="mono">${fmtMoney(h.unitPrice || 0)}</td>
            <td class="mono">${fmtMoney(h.total || 0)}</td>
            <td>${escapeHtml(h.nfNumber || '—')}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>`;
    }

    html += `<div class="modal-actions" style="margin-top:12px">
      <button class="btn btn-ghost" id="ddFechar">Fechar</button>
    </div>`;

    box.innerHTML = html;
    Modal.open('Dossiê — ' + client.name, box);

    $$('.nf-toggle', box).forEach(el => {
      el.addEventListener('click', () => {
        const nf = el.dataset.nf;
        const detail = box.querySelector('.nf-detail[data-nf="' + nf + '"]');
        if (detail) detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
      });
    });
    $('#ddFechar').addEventListener('click', Modal.close);
    $('#ddEdit').addEventListener('click', () => { Modal.close(); openDetail(client); });
    $('#ddDelete').addEventListener('click', () => {
      if (confirm('Excluir "' + client.name + '"?')) { DB.deleteClient(client.id); Modal.close(); renderClientes(); toast('Cliente excluído'); }
    });
  }

  // ───── Edição de cliente ─────
  function openDetail(client) {
    const box = el('div');
    box.innerHTML = `
      <div class="form-grid">
        <label class="field full"><span>Nome Fantasia</span><input id="cdNome" value="${escapeHtml(client.name)}"></label>
        <label class="field"><span>Razão Social</span><input id="cdRazao" value="${escapeHtml(client.razaoSocial || '')}"></label>
        <label class="field"><span>CNPJ</span><input id="cdCnpj" value="${escapeHtml(client.cnpj || '')}"></label>
        <label class="field"><span>Comprador / Contato</span><input id="cdComprador" value="${escapeHtml(client.comprador || '')}"></label>
        <label class="field"><span>Telefone Comprador</span><input id="cdPhoneBuyer" value="${escapeHtml(client.phoneBuyer || '')}"></label>
        <label class="field"><span>Email</span><input id="cdEmail" value="${escapeHtml(client.email || '')}"></label>
        <label class="field"><span>Telefone</span><input id="cdPhone" value="${escapeHtml(client.phone || '')}"></label>
        <label class="field"><span>Código Externo</span><input id="cdExt" value="${escapeHtml(client.externalCode || '')}"></label>
        <label class="field full"><span>Endereço</span><input id="cdAddr" value="${escapeHtml(client.address || '')}"></label>
        <label class="field full"><span>Observações</span><textarea id="cdObs">${escapeHtml(client.observations || '')}</textarea></label>
        <label class="field"><span>Última Venda</span><input id="cdLastSale" value="${escapeHtml(client.lastSale || '')}" placeholder="YYYY-MM-DD"></label>
        <label class="field"><span>Total Gasto</span><input id="cdTotal" type="number" step="0.01" value="${client.totalSpent || 0}"></label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cdCancel">Cancelar</button>
        <button class="btn btn-primary" id="cdSave">Salvar</button>
      </div>`;
    Modal.open('Editar Cliente', box);
    $('#cdCancel').addEventListener('click', Modal.close);
    $('#cdSave').addEventListener('click', () => {
       DB.upsertClient({
         id: client.id, name: $('#cdNome').value.trim(), razaoSocial: $('#cdRazao').value.trim(),
         cnpj: $('#cdCnpj').value.trim(), comprador: $('#cdComprador').value.trim(), phoneBuyer: $('#cdPhoneBuyer').value.trim(), email: $('#cdEmail').value.trim(), phone: $('#cdPhone').value.trim(),
         address: $('#cdAddr').value.trim(), externalCode: $('#cdExt').value.trim(),
         observations: $('#cdObs').value.trim(), lastSale: $('#cdLastSale').value.trim(),
         totalSpent: parseFloat($('#cdTotal').value) || 0, salesHistory: client.salesHistory || [],
       });
      Modal.close(); renderClientes(); toast('Cliente salvo');
    });
  }

  // ───── Novo cliente ─────
  function openNewForm() {
    const box = el('div');
    box.innerHTML = `
      <div class="form-grid">
        <label class="field full"><span>Nome Fantasia *</span><input id="cfNome"></label>
        <label class="field"><span>Razão Social</span><input id="cfRazao"></label>
        <label class="field"><span>CNPJ</span><input id="cfCnpj" placeholder="XX.XXX.XXX/XXXX-XX"></label>
        <label class="field"><span>Comprador / Contato</span><input id="cfComprador" placeholder="Nome da pessoa associada"></label>
        <label class="field"><span>Telefone Comprador</span><input id="cfPhoneBuyer" placeholder="(XX) XXXXX-XXXX"></label>
        <label class="field"><span>Email</span><input id="cfEmail" type="email"></label>
        <label class="field"><span>Telefone</span><input id="cfPhone" placeholder="(XX) XXXXX-XXXX"></label>
        <label class="field"><span>Código Externo</span><input id="cfExt"></label>
        <label class="field full"><span>Endereço</span><input id="cfAddr"></label>
        <label class="field full"><span>Observações</span><textarea id="cfObs"></textarea></label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cfCancel">Cancelar</button>
        <button class="btn btn-primary" id="cfSave">Salvar</button>
      </div>`;
    Modal.open('Novo Cliente', box);
    $('#cfCancel').addEventListener('click', Modal.close);
    $('#cfSave').addEventListener('click', () => {
      const nome = $('#cfNome').value.trim();
      if (!nome) { toast('Informe o Nome Fantasia'); return; }
       DB.upsertClient({ name: nome, razaoSocial: $('#cfRazao').value.trim(), cnpj: $('#cfCnpj').value.trim(),
         comprador: $('#cfComprador').value.trim(), phoneBuyer: $('#cfPhoneBuyer').value.trim(), email: $('#cfEmail').value.trim(), phone: $('#cfPhone').value.trim(), address: $('#cfAddr').value.trim(),
         externalCode: $('#cfExt').value.trim(), observations: $('#cfObs').value.trim(), totalSpent: 0, salesHistory: [] });
      Modal.close(); renderClientes(); toast('Cliente cadastrado');
    });
  }



  // ───── Histórico de Preços ─────
  function openPriceHistory() {
    const allHist = DB.getPriceHistory();
    const box = el('div');
    if (!allHist.length) {
      box.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px 0">Nenhum histórico de preços disponível. Importe NF-e para gerar o histórico.</p>';
      Modal.open('Histórico de Preços', box);
      return;
    }
    box.innerHTML = `
      <div class="search-bar" style="max-width:100%;margin-bottom:12px">
        <input type="text" id="phBusca" placeholder="Buscar produto por nome...">
      </div>
      <div id="phList" style="max-height:420px;overflow-y:auto"></div>`;

    function renderPh(filtro) {
      const list = $('#phList');
      const f = (filtro || '').toLowerCase().trim();
      const filtered = f ? allHist.filter(h => (h.productName || '').toLowerCase().includes(f) || (h.productCode || '').toLowerCase().includes(f)) : allHist;
      const groups = {};
      filtered.forEach(h => {
        const key = h.productCode || h.productName;
        if (!groups[key]) groups[key] = { productName: h.productName, ncm: h.ncm, entries: [] };
        groups[key].entries.push(h);
      });
      const entries = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
      if (!entries.length) {
        list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:16px 0">Nenhum produto encontrado' + (f ? ' para "' + escapeHtml(f) + '"' : '') + '.</p>';
        return;
      }
      let html = '<div style="font-size:var(--font-xs);color:var(--text-muted);margin-bottom:8px">' + filtered.length + ' registro(s) · ' + entries.length + ' produto(s)</div>';
      entries.forEach(([_code, g]) => {
        const sorted = g.entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const last = sorted[0];
        html += '<div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:6px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
          '<strong style="color:var(--text-primary);font-size:var(--font-sm)">' + escapeHtml(g.productName) + '</strong>' +
          '<span style="color:var(--text-muted);font-size:var(--font-xs)">' + g.entries.length + 'x comprado</span></div>' +
          '<div style="font-size:var(--font-xs);color:var(--text-secondary)">Último: <strong style="color:var(--accent)">' + fmtMoney(last.unitPrice) + '</strong> (' + fmtDate(last.date) + ') — ' + escapeHtml(last.supplierName || '—') +
          '<span style="color:var(--text-muted)"> | NCM ' + escapeHtml(g.ncm || '—') + '</span></div></div>';
      });
      list.innerHTML = html;
    }

    Modal.open('Histórico de Preços (' + allHist.length + ' registros)', box);
    renderPh('');
    const inp = $('#phBusca');
    let debounce = null;
    inp.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => renderPh(inp.value), 200); });
  }

  // ════════════════════════════════════════════════════════════════
  //  ABA 2 — PRODUTOS IMPORTADOS (via NF-e)
  // ════════════════════════════════════════════════════════════════

  let filtroProduto = '';
  let produtoExpandido = null;

  function renderProdutos() {
    const container = $('#parceirosContent');
    if (!container) return;

    // ── First render: build stable search bar + results container ──
    if (!container.querySelector('#prodResults')) {
      container.innerHTML = `
        <div class="tab-content-fade">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <div class="search-bar" style="max-width:400px;flex:1;min-width:160px">
              <input type="text" id="prodBusca" placeholder="Buscar por nome do produto...">
            </div>
            <span id="prodCount" style="font-size:var(--font-xs);color:var(--text-muted)"></span>
          </div>
          <div id="prodResults"></div>
        </div>`;
      // Search input event — bound once, never recreated
      container.querySelector('#prodBusca').addEventListener('input', () => {
        filtroProduto = container.querySelector('#prodBusca').value.trim();
        produtoExpandido = null;
        renderProdutos();
      });
      // Row click — delegated on results container
      container.querySelector('#prodResults').addEventListener('click', (e) => {
        const row = e.target.closest('[data-prod-id]');
        if (!row || e.target.closest('.history-panel')) return;
        produtoExpandido = produtoExpandido === row.dataset.prodId ? null : row.dataset.prodId;
        renderProdutos();
      });
    }

    // Sync input value
    container.querySelector('#prodBusca').value = filtroProduto;

    const allHist = DB.getPriceHistory();
    const allProd = DB.getProdutos();
    const busca = filtroProduto.toLowerCase().trim();

    // Agrupa por codigo do produto (preço histórico de NF-e)
    const groups = {};
    allHist.forEach(h => {
      const key = h.productCode || h.productName || 'sem-codigo';
      if (!groups[key]) groups[key] = { code: h.productCode || '', name: h.productName || '—', ncm: h.ncm || '', entries: [] };
      groups[key].entries.push(h);
    });

    // Fallback: se não há histórico, mostra o catálogo de produtos
    if (!allHist.length && allProd.length) {
      allProd.forEach(p => {
        const key = p.id || p.code || 'sem-codigo';
        if (!groups[key]) groups[key] = { code: key, name: p.nome || '—', ncm: p.ncm || '', entries: [] };
      });
    }

    let filtered = Object.values(groups);
    if (busca) {
      filtered = filtered.filter(g => {
        if (g.name.toLowerCase().includes(busca)) return true;
        if (g.code.toLowerCase().includes(busca)) return true;
        if (g.ncm.includes(busca)) return true;
        return g.entries.some(e =>
          (e.supplierName || '').toLowerCase().includes(busca) ||
          (e.nfNumber || '').includes(busca)
        );
      });
    }

    // ── Update results only ──
    const count = container.querySelector('#prodCount');
    const results = container.querySelector('#prodResults');
    count.textContent = allHist.length + ' registros, ' + filtered.length + ' produtos';

    if (!allHist.length && !allProd.length) {
      results.innerHTML = '<div class="card" style="padding:40px 20px;text-align:center">'
        + '<div style="font-size:32px;margin-bottom:12px;opacity:.3">' + Svg.upload + '</div>'
        + '<p style="color:var(--text-muted);font-size:var(--font-sm)">Nenhum produto disponível.</p>'
        + '<p style="color:var(--text-muted);font-size:var(--font-xs);margin-top:4px">Importe XMLs de NF-e ou sincronize com a nuvem para ver os produtos aqui.</p>'
        + '</div>';
      return;
    }
    if (!filtered.length) {
      results.innerHTML = '<div class="card" style="padding:20px;text-align:center"><span style="color:var(--text-muted)">Nenhum produto encontrado para "' + escapeHtml(filtroProduto) + '".</span></div>';
      return;
    }

    let html = '<div class="card" style="padding:0;overflow:hidden"><div style="overflow-x:auto">'
      + '<table class="parc-table">'
      + '<colgroup><col style="width:28%"><col style="width:10%"><col style="width:10%"><col style="width:12%"><col style="width:12%"><col style="width:1fr"></colgroup>'
      + '<thead><tr><th>Produto</th><th>Código</th><th>NCM</th><th class="text-right">Últ. Preço</th><th class="text-right">Total Comprado</th><th>Fornecedor / NF</th></tr></thead><tbody>';

    filtered.forEach(g => {
      const sorted = g.entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const last = sorted[0] || {};
      const totalQtd = sorted.reduce((s, e) => s + (e.quantity || 0), 0);
      const expanded = produtoExpandido === g.code;

      html += '<tr class="' + (expanded ? 'row-selected' : '') + '" data-prod-id="' + escapeHtml(g.code) + '" style="cursor:pointer">';
      html += '<td><strong>' + escapeHtml(g.name) + '</strong></td>';
      html += '<td style="font-family:mono;font-size:var(--font-xs);color:var(--text-secondary)">' + escapeHtml(g.code) + '</td>';
      html += '<td style="font-size:var(--font-xs);color:var(--text-secondary)">' + escapeHtml(g.ncm || '—') + '</td>';
      html += '<td class="text-right" style="font-weight:600;font-size:var(--font-sm)">' + (last.unitPrice ? fmtMoney(last.unitPrice) : '—') + '</td>';
      html += '<td class="text-right" style="font-size:var(--font-xs);color:var(--text-secondary)">' + totalQtd + ' un</td>';
      html += '<td style="font-size:var(--font-xs)"><span style="color:var(--text-secondary)">' + escapeHtml(last.supplierName || '—') + '</span><br><span style="font-family:mono;color:var(--text-muted);font-size:9px">NF: ' + escapeHtml(last.nfNumber || '') + '</span></td>';
      html += '</tr>';

      if (expanded && sorted.length) {
        html += '<tr class="history-panel"><td colspan="6" style="padding:0">';
        html += '<div style="padding:10px 14px">';
        html += '<div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Histórico de Preço (' + sorted.length + ' compras)</div>';
        sorted.forEach(e => {
          html += '<div style="display:flex;align-items:center;gap:12px;font-size:var(--font-xs);padding:3px 0">';
          html += '<span style="font-weight:600;color:var(--accent)">' + fmtMoney(e.unitPrice) + '</span>';
          html += '<span style="color:var(--text-secondary)">' + fmtDate(e.date) + '</span>';
          html += '<span style="color:var(--text-secondary)">Qtd: ' + (e.quantity || 0) + '</span>';
          html += '<span style="color:var(--text-muted);font-family:mono">NF: ' + escapeHtml(e.nfNumber || '') + '</span>';
          html += '<span style="color:var(--text-secondary)">' + escapeHtml(e.supplierName || '') + '</span>';
          html += '</div>';
        });
        html += '</div></td></tr>';
      }
    });

    html += '</tbody></table></div></div>';
    results.innerHTML = html;
  }

  // ───── Estado do importador progressivo ─────
  let importQueue = [];     // { id, name, content, status:'pending'|'processing'|'done'|'error', error? }
  let processedSession = []; // { name, nfNumber, clientName, cnpj, ... }
  let importing = false;

  // ───── Importa XMLs do dropzone (escopo do módulo) ─────
  function importXmlFiles(files) {
    const xmls = Array.from(files).filter(f => f.name.endsWith('.xml'));
    if (!xmls.length) { toast('Nenhum arquivo XML encontrado'); return; }

    // Adiciona cada XML à fila como "pending"
    let pendingRead = xmls.length;
    xmls.forEach((f, i) => {
      const r = new FileReader();
      r.onload = () => {
        importQueue.push({ id: Date.now() + '_' + i, name: f.name, content: r.result, status: 'pending' });
        pendingRead--;
        if (pendingRead === 0) {
          renderSincronizacao();
          processNextFile();
        }
      };
      r.onerror = () => {
        importQueue.push({ id: Date.now() + '_' + i, name: f.name, content: null, status: 'error', error: 'Falha na leitura' });
        pendingRead--;
        if (pendingRead === 0) { renderSincronizacao(); processNextFile(); }
      };
      r.readAsText(f);
    });
  }

  async function processNextFile() {
    if (importing) return;
    const next = importQueue.find(p => p.status === 'pending');
    if (!next) return;
    importing = true;
    next.status = 'processing';
    renderSincronizacao();

    try {
      const n = await DB.importNfeXml([next.content]);
      next.status = 'done';

      // Data saved — read back for the "Processados" card
      const all = DB.getNfeImports();
      const last = all[all.length - 1];
      processedSession.push({
        name: next.name,
        nfNumber: last ? last.nfNumber : '—',
        clientName: last ? last.supplierName || last.clientName : '—',
        cnpj: last ? last.supplierCnpj || last.clientCnpj : '—',
      });

      toast(n + ' produto(s) importado(s)');
      nfeList = getNfeDisplayList();
      renderSincronizacao();
    } catch (err) {
      next.status = 'error';
      next.error = err.message;
      toast('Erro: ' + err.message);
      renderSincronizacao();
    }

    importing = false;
    processNextFile(); // processa o próximo da fila
  }

  // ════════════════════════════════════════════════════════════════
  //  ABA 3 — SINCRONIZAÇÃO XML
  // ════════════════════════════════════════════════════════════════

  function renderSincronizacao() {
    const container = $('#parceirosContent');
    if (!container) return;

    nfeList = getNfeDisplayList();
    const pendentes = importQueue.filter(p => p.status !== 'done');

    function fileCard(name, subtitle, extraClass, actions) {
      return '<div class="import-file-item ' + extraClass + '">'
        + '<div class="import-file-icon">' + Svg.file + '</div>'
        + '<div class="import-file-body">'
        + '<div class="import-file-name">' + escapeHtml(name) + '</div>'
        + '<div class="import-file-sub">' + (subtitle ? escapeHtml(subtitle) : '') + '</div>'
        + '</div>'
        + '<div class="import-file-actions">' + (actions || '') + '</div>'
        + '</div>';
    }

    let html = '<div class="tab-content-fade">';

    // ═══════ TWO-COLUMN GRID ═══════
    html += '<div class="import-grid">';

    // ─── LEFT COLUMN: IMPORTAR NF DE VENDA ───
    html += '<div class="import-col">';
    html += '<div class="card" style="padding:20px">';
    html += '<div style="font-size:13px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:.3px;margin-bottom:16px">Importar NF de Venda</div>';

    // Dropzone
    html += '<div class="dropzone-nfe" id="nfeDropzone">';
    html += '<div class="dz-icon">' + Svg.upload + '</div>';
    html += '<div class="dz-title">Carregar XMLs/PDFs de Produto</div>';
    html += '<div class="dz-sub">Você pode selecionar várias notas de uma vez (Bulk Import)</div>';
    html += '<input type="file" id="nfeUploadInput" accept=".xml,.pdf" multiple style="display:none">';
    html += '</div>';

    // PENDENTE
    html += '<div style="margin-top:16px">';
    html += '<div class="import-section-title">PENDENTE (' + pendentes.length + ')</div>';
    if (!pendentes.length) {
      html += '<div style="font-size:var(--font-xs);color:var(--text-muted);padding:6px 0">Nenhuma nota pendente</div>';
    } else {
      html += '<div class="import-scroll-list">';
      pendentes.forEach(p => {
        if (p.status === 'processing') {
          html += fileCard(p.name, 'Processando...', 'import-file-processing',
            '<span class="import-spinner"></span>');
        } else if (p.status === 'error') {
          html += fileCard(p.name, 'Erro: ' + (p.error || ''), 'import-file-error',
            '<button class="btn btn-sm btn-ghost import-act-btn" title="Detalhes">' + Svg.info + '</button>');
        } else {
          html += fileCard(p.name, 'Aguardando...', 'import-file-pending', '');
        }
      });
      html += '</div>';
    }
    html += '</div>';

    // PROCESSADOS (nesta sessão)
    html += '<div style="margin-top:16px">';
    html += '<div class="import-section-title">PROCESSADOS (' + processedSession.length + ')</div>';
    if (!processedSession.length) {
      html += '<div style="font-size:var(--font-xs);color:var(--text-muted);padding:6px 0">Nenhum arquivo processado nesta sessão</div>';
    } else {
      html += '<div class="import-scroll-list">';
      processedSession.forEach(p => {
        html += fileCard(p.name, p.clientName + ' · NF ' + p.nfNumber, 'import-file-done',
          '<button class="btn btn-sm btn-ghost import-act-btn" title="Detalhes">' + Svg.info + '</button>'
          + '<button class="btn btn-sm btn-ghost import-act-btn" title="Visualizar">' + Svg.eye + '</button>');
      });
      html += '</div>';
    }
    html += '</div>';

    html += '</div>'; // end card
    html += '</div>'; // end left col

    // ─── RIGHT COLUMN: HISTÓRICO ───
    html += '<div class="import-col">';
    html += '<div class="card" style="padding:20px">';
    html += '<div style="margin-bottom:12px">';
    html += '<div style="font-size:13px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:.3px">Histórico de Arquivos Processados</div>';
    html += '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Lista de notas fiscais de venda que já foram processadas e sincronizadas.</div>';
    html += '</div>';

    if (!nfeList.length) {
      html += '<div style="padding:16px 0;text-align:center;font-size:var(--font-xs);color:var(--text-muted)">Nenhuma NF processada ainda. Importe XMLs de NF-e.</div>';
    } else {
      html += '<div class="import-history-list">';
      nfeList.forEach(nfe => {
        html += fileCard(
          nfe.numero + ' · ' + nfe.chave.slice(0, 20) + '…',
          nfe.emissor + ' · ' + nfe.data + ' · ' + nfe.itens + ' itens',
          'import-file-done',
          '<button class="btn btn-sm btn-ghost import-act-btn" title="Detalhes">' + Svg.info + '</button>'
          + '<button class="btn btn-sm btn-ghost import-act-btn" title="Visualizar">' + Svg.eye + '</button>'
        );
      });
      html += '</div>';
    }
    html += '</div>'; // end card
    html += '</div>'; // end right col

    html += '</div>'; // end import-grid

    // ─── SYNC + CSV CONTROLS ───
    html += '<div class="import-bottom-bar">';

    // Sync card
    html += '<div class="card import-bottom-card">';
    html += '<div><div style="font-size:12px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:.3px">Sincronizar Tudo</div>';
    html += '<div style="font-size:10px;color:var(--text-muted)">Envia todos os dados para o Supabase (nuvem)</div></div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="btn btn-ghost btn-sm" id="syncPullBtn">' + Svg.sync + ' Repuxar da Nuvem</button>';
    html += '<button class="btn btn-primary btn-sm" id="syncFullBtn">' + Svg.sync + ' Forçar Sincronização</button>';
    html += '<button class="btn btn-ghost btn-sm" id="syncNfeBtn" style="border-color:var(--accent);color:var(--accent)">' + Svg.file + ' Forçar Envio de NFs</button>';
    html += '</div></div>';

    // CSV card
    html += '<div class="card import-bottom-card" style="flex-wrap:nowrap">';
    html += '<div><div style="font-size:12px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:.3px">Importar Clientes (CSV)</div>';
    html += '<div style="font-size:10px;color:var(--text-muted)">Nome_Fantasia, Razao_Social, CNPJ...</div></div>';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">';
    html += '<input type="file" id="csvFileInputSync" accept=".csv" style="max-width:160px;font-size:var(--font-xs);color:var(--text-primary)">';
    html += '<button class="btn btn-primary btn-sm" id="csvImportSyncBtn">' + Svg.csv + ' Importar</button>';
    html += '</div></div>';

    html += '</div>'; // end import-bottom-bar

    html += '</div>'; // end tab-content-fade
    container.innerHTML = html;

    // ─── EVENT BINDINGS ───

    // Dropzone
    const dz = container.querySelector('#nfeDropzone');
    const fileInput = container.querySelector('#nfeUploadInput');
    if (dz && fileInput) {
      dz.addEventListener('click', () => fileInput.click());
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', (e) => {
        e.preventDefault();
        dz.classList.remove('dragover');
        importXmlFiles(e.dataTransfer.files);
      });
      fileInput.addEventListener('change', () => {
        importXmlFiles(fileInput.files);
        fileInput.value = '';
      });
    }

    // CSV import
    const csvBtn = container.querySelector('#csvImportSyncBtn');
    const csvInput = container.querySelector('#csvFileInputSync');
    let csvContent = '';
    if (csvInput) {
      csvInput.addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => csvContent = r.result;
        r.readAsText(f);
      });
    }
    if (csvBtn) {
      csvBtn.addEventListener('click', () => {
        if (!csvContent) { toast('Selecione um arquivo CSV primeiro'); return; }
        try {
          const n = DB.importClientsCsv(csvContent);
          csvContent = '';
          if (csvInput) csvInput.value = '';
          toast(n + ' cliente(s) importado(s) do CSV');
        } catch (err) { toast('Erro: ' + err.message); }
      });
    }

    // Repuxar da nuvem
    const syncPull = container.querySelector('#syncPullBtn');
    if (syncPull) {
      syncPull.addEventListener('click', async () => {
        syncPull.disabled = true;
        syncPull.innerHTML = 'Repuxando...';
        try {
          await DB.remote.pullData();
          // pullData já puxa clientes e negociações. Aqui puxamos NFs, produtos e consolidamos.
          await DB.remote.pullNfeImports();
          await DB.remote.pullProducts();
          DB.syncProductsFromNfeImports();
          renderSincronizacao();
          toast('Dados re-sincronizados da nuvem!');
        } catch (err) {
          toast('Erro: ' + err.message);
        } finally {
          syncPull.disabled = false;
          syncPull.innerHTML = Svg.sync + ' Repuxar da Nuvem';
        }
      });
    }

    // Sync full manual
    const syncFull = container.querySelector('#syncFullBtn');
    if (syncFull) {
      syncFull.addEventListener('click', async () => {
        syncFull.disabled = true;
        syncFull.textContent = 'Sincronizando...';
        try {
          await DB.remote.pushAllData();
        } catch (err) {
          toast('Erro na sincronização: ' + err.message);
        } finally {
          syncFull.disabled = false;
          syncFull.innerHTML = Svg.sync + ' Forçar Sincronização';
        }
      });
    }

    // Forçar envio de NFs retroativo
    const syncNfeBtn = container.querySelector('#syncNfeBtn');
    if (syncNfeBtn) {
      syncNfeBtn.addEventListener('click', async () => {
        syncNfeBtn.disabled = true;
        syncNfeBtn.textContent = 'Enviando...';
        try {
          const n = await DB.remote.pushExistingNfeImports();
          toast(n + ' NF(s) enviada(s) para a nuvem!');
        } catch (err) {
          toast('Erro: ' + err.message);
        } finally {
          syncNfeBtn.disabled = false;
          syncNfeBtn.innerHTML = Svg.file + ' Forçar Envio de NFs';
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  RENDER PRINCIPAL
  // ════════════════════════════════════════════════════════════════

  function render() {
    if (activeTab === 'clientes') renderClientes();
    else if (activeTab === 'produtos') renderProdutos();
    else if (activeTab === 'sincronizacao') renderSincronizacao();
  }

  // ════════════════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════════════════

  function init() {
    const tabsContainer = $('#parceirosTabs');
    if (tabsContainer) {
      tabsContainer.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
          tabsContainer.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeTab = btn.dataset.tab;
          // Reseta estados internos ao trocar de aba
          filtroProduto = '';
          produtoExpandido = null;
          render();
        });
      });
    }

    // Botão zerar dados
    const resetBtn = $('#resetPartnersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!confirm('TEM CERTEZA? Todos os dados (clientes, NF-es, produtos, propostas) serão apagados do navegador E da nuvem permanentemente. Esta ação não pode ser desfeita.')) return;
        if (!confirm('Confirmação final: deseja realmente ZERAR TUDO?')) return;
        DB.resetPartnerData();
        // Re-semeia produtos padrão
        DB.ensureSeed();
        nfeList = MOCK_NFES.slice();
        filtroCliente = '';
        filtroTipo = 'todos';
        toast('Todos os dados foram zerados (local + nuvem).');
        render();
      });
    }

    // Render inicial
    render();
  }

  VIEWS.register('parceiros', { init, render });
})();
