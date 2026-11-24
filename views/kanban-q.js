/* =========================================================
   TELA — Kanban de Fluxo & SLA (Módulo Qualidade)
   Colunas: recebido -> em_analise -> aguardando_peca ->
            manutencao_concluida -> liberacao_qualidade
   SLA visual: cards mudam de cor (verde/amarelo/vermelho).
   Atrasados sobem ao topo da coluna automaticamente.
   Ao mover para "aguardando_peca" -> cria Solicitação de Compra.
   ========================================================= */
(() => {
  const COLUNAS = [
    { key: 'recebido', label: 'Em Aberto' },
    { key: 'em_analise', label: 'Em Execução' },
    { key: 'aguardando_peca', label: 'Aguardando Peça' },
    { key: 'manutencao_concluida', label: 'Finalizada' },
    { key: 'liberacao_qualidade', label: 'Finalizada com Pendência' },
  ];

  function attachDnd() {
    document.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.q-os-card');
      if (!card) return;
      e.dataTransfer.setData('text/plain', card.dataset.id);
      card.classList.add('dragging');
    });
    document.addEventListener('dragend', (e) => {
      const card = e.target.closest('.q-os-card');
      if (card) card.classList.remove('dragging');
      document.querySelectorAll('.q-kanban-col').forEach((c) => c.classList.remove('drop-target'));
    });
    document.addEventListener('dragover', (e) => {
      const col = e.target.closest('.q-kanban-col');
      if (!col) return;
      e.preventDefault();
      col.classList.add('drop-target');
    });
    document.addEventListener('dragleave', (e) => {
      const col = e.target.closest('.q-kanban-col');
      if (col && !col.contains(e.relatedTarget)) col.classList.remove('drop-target');
    });
    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      const col = e.target.closest('.q-kanban-col');
      if (!col) return;
      col.classList.remove('drop-target');
      const id = e.dataTransfer.getData('text/plain');
      const novoStatus = col.dataset.status;
      if (!id || !novoStatus) return;
      try {
        await QDB.moverOs(id, novoStatus);
        if (typeof logger !== 'undefined' && logger.audit) logger.audit('kanban.move', { id, novoStatus });
        toast(`O.S. movida para "${col.querySelector('h3').textContent}"`, 'success');
        if (novoStatus === 'aguardando_peca') criarSolicitacaoPeca(id);
        render();
      } catch (err) {
        if (typeof logger !== 'undefined' && logger.error) logger.error('kanban.move.fail', err);
        else console.error(err);
        toast('Erro ao mover O.S.', 'error');
      }
    });
  }

  async function criarSolicitacaoPeca(osId) {
    const osList = await QDB.list('auvo_os');
    const os = osList.find((o) => o.id === osId);
    if (!os) return;
    const pecas = os.pecas_usadas || [];
    if (!pecas.length) {
      toast('O.S. sem peças especificadas — abrir compra manual', 'warn');
      return;
    }
    const supa = QDB.raw();
    if (!supa) return;
    for (const p of pecas) {
      await supa.from('compras_solicitacoes').insert({
        os_id: osId,
        equipamento_id: os.equipamento_id,
        peca_desc: p.desc || 'Peça',
        qtd: p.qtd || 1,
      });
    }
    toast(`${pecas.length} solicitação(ões) de compra criada(s)`, 'success');
    if (typeof logger !== 'undefined' && logger.audit) logger.audit('compra.solicitada', { osId, pecas: pecas.length });
  }

  function cardHtml(o) {
    const diasSem = diasSemAtualizacao(o);
    const classe = 'q-sla-' + estadoOs(o);
    const dias = o.sla_limite
      ? Math.ceil((new Date(o.sla_limite) - Date.now()) / 86400000)
      : null;
    const prazoTxt = diasSem > LIMITE_ATRASO_DIAS
      ? `Sem atualizar ${Math.floor(diasSem)}d`
      : (dias == null ? '—' : dias < 0 ? `Atrasado ${-dias}d` : `${dias}d restantes`);
    const pecas = (o.pecas_usadas || []).length;
    return `
      <article class="q-os-card ${classe}" draggable="true" data-id="${escapeHtml(o.id)}">
        <div class="q-card-top">
          <span class="q-card-num">#${escapeHtml(o.numero || o.id)}</span>
          <span class="q-sla-badge">${prazoTxt}</span>
        </div>
        <div class="q-card-equip">${escapeHtml(o.equipamento_desc || 'Equipamento não informado')}</div>
        <div class="q-card-meta">
          <span>${escapeHtml(o.setor || o.hospital || '—')}</span>
          <span>${pecas ? pecas + ' peça(s)' : 'sem peças'}</span>
        </div>
        <div class="q-card-meta">
          <span>Téc: ${escapeHtml(o.tecnico_nome || '—')}</span>
          <span>${o.tempo_atendimento_h ? Number(o.tempo_atendimento_h).toFixed(1) + 'h' : ''}</span>
        </div>
      </article>`;
  }

  function htmlSkeleton() {
    return `
      <div class="q-kanban-toolbar">
        <input id="q-busca" class="q-busca-input" type="search" placeholder="Buscar OS (cliente, técnico, nº, data)..." aria-label="Buscar OS" />
        <select id="q-busca-campo" class="q-busca-select" aria-label="Campo de busca">
          <option value="todos">Todos os campos</option>
          <option value="cliente">Cliente</option>
          <option value="tecnico">Técnico</option>
          <option value="numero">Nº da OS</option>
          <option value="data">Data de execução</option>
        </select>
        <span id="q-busca-count" class="q-busca-count"></span>
      </div>
      <div id="q-atraso-banner" class="q-atraso-banner" hidden></div>
      <div class="q-kanban">${
        COLUNAS.map((c) => `
        <section class="q-kanban-col" data-status="${c.key}">
          <header><h3>${c.label}</h3><span class="q-col-count" data-count="${c.key}">0</span></header>
          <div class="q-col-body" data-droptarget="${c.key}"></div>
        </section>`).join('')
      }</div>`;
  }

  let osCache = [];
  let filtroTexto = '';
  let filtroCampo = 'todos';

  const diasSemAtualizacao = (o) => {
    const d = o.atualizado_em || o.etapa_atual_desde || o.entrado_em;
    if (!d) return 0;
    const ms = Date.now() - new Date(d).getTime();
    return ms > 0 ? ms / 86400000 : 0;
  };
  const LIMITE_ATRASO_DIAS = 5;
  const estadoOs = (o) => {
    if (diasSemAtualizacao(o) > LIMITE_ATRASO_DIAS) return 'atrasado';
    return o.sla_estado || 'no_prazo';
  };

  const ordenar = (arr) => arr.slice().sort((a, b) => {
    const pa = { atrasado: 0, atencao: 1, no_prazo: 2 }[estadoOs(a)] ?? 3;
    const pb = { atrasado: 0, atencao: 1, no_prazo: 2 }[estadoOs(b)] ?? 3;
    if (pa !== pb) return pa - pb;
    return new Date(b.etapa_atual_desde) - new Date(a.etapa_atual_desde);
  });

  function filtrarOs(list) {
    const t = filtroTexto.trim().toLowerCase();
    if (!t) return list;
    return list.filter((o) => {
      const campos = {
        cliente: o.hospital || '',
        tecnico: o.tecnico_nome || '',
        numero: o.numero || o.id || '',
        data: [fmt(o.entrado_em), fmt(o.etapa_atual_desde), fmt(o.concluido_em)].join(' '),
      };
      if (filtroCampo === 'todos') {
        return Object.values(campos).some((v) => String(v).toLowerCase().includes(t));
      }
      return String(campos[filtroCampo] || '').toLowerCase().includes(t);
    });
  }

  function renderColumns() {
    const root = $('#view-kanban-q');
    if (!root) return;
    const osFiltrados = filtrarOs(osCache);
    for (const col of COLUNAS) {
      const items = ordenar(osFiltrados.filter((o) => o.status === col.key));
      const body = root.querySelector(`[data-droptarget="${col.key}"]`);
      const counter = root.querySelector(`[data-count="${col.key}"]`);
      if (counter) counter.textContent = items.length;
      if (body) body.innerHTML = items.map(cardHtml).join('');
    }
    const cnt = root.querySelector('#q-busca-count');
    if (cnt) cnt.textContent = osFiltrados.length + ' OS' + (filtroTexto.trim() ? ' (filtrado)' : '');
  }

  function notificarAtrasos(list) {
    const atrasados = list.filter((o) => estadoOs(o) === 'atrasado');
    const banner = $('#q-atraso-banner');
    if (banner) {
      if (atrasados.length) {
        banner.hidden = false;
        banner.textContent = `⚠️ ${atrasados.length} Ordem(ns) de Serviço EM ATRASO — cobrar o responsável do setor`;
      } else {
        banner.hidden = true;
      }
    }
    if (!atrasados.length) return;
    toast(`⚠️ ${atrasados.length} O.S. em atraso`);
    try {
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'default') Notification.requestPermission();
        else if (Notification.permission === 'granted') {
          new Notification('SIGEQ — OS em atraso', { body: `${atrasados.length} O.S. em atraso no Kanban de Qualidade.` });
        }
      }
    } catch (_) { /* ignore */ }
  }

  async function render() {
    const root = $('#view-kanban-q');
    if (!root) return;
    if (!root.dataset.built) {
      root.innerHTML = htmlSkeleton();
      root.dataset.built = '1';
      attachDnd();
      root.addEventListener('click', (e) => {
        const card = e.target.closest('.q-os-card');
        if (!card) return;
        const os = osCache.find((o) => o.id === card.dataset.id);
        if (os) openOsModal(os);
      });
      const busca = root.querySelector('#q-busca');
      if (busca) busca.addEventListener('input', (e) => { filtroTexto = e.target.value; renderColumns(); });
      const campo = root.querySelector('#q-busca-campo');
      if (campo) campo.addEventListener('change', (e) => { filtroCampo = e.target.value; renderColumns(); });
    }
    const osList = (await QDB.list('auvo_os')) || [];
    osCache = osList;
    renderColumns();
    notificarAtrasos(osList);
  }

  // ---------- Modal de detalhes da O.S. ----------
  const STATUS_LABELS = {
    recebido: 'Em Aberto',
    em_analise: 'Em Execução',
    aguardando_peca: 'Aguardando Peça',
    manutencao_concluida: 'Finalizada',
    liberacao_qualidade: 'Finalizada com Pendência',
    liberado: 'Liberado',
  };
  const STATUS_OPTS = Object.entries(STATUS_LABELS)
    .map(([v, l]) => `<option value="${v}">${l}</option>`)
    .join('');

  const fmt = (iso, t = false) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return t ? d.toLocaleString('pt-BR') : d.toLocaleDateString('pt-BR');
  };
  const brl = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  async function podeEditar() {
    const A = window.Auth;
    if (!A) return true;
    try { if (A.hasPermission && A.hasPermission('all')) return true; } catch (e) {}
    const p = A.getProfile && A.getProfile();
    if (p && p.role && p.role !== 'leitura') return true;
    if (!A.isAuthenticated || !A.isAuthenticated()) return true; // fallback: auth local/quebrada
    return false;
  }

  function fecharModal() {
    const b = document.querySelector('.q-os-modal-backdrop');
    if (b) b.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') fecharModal(); }

  async function openOsModal(os) {
    const canEdit = await podeEditar();
    const sla = estadoOs(os);
    const pecas = Array.isArray(os.pecas_usadas) ? os.pecas_usadas : [];
    const pecasHtml = pecas.length
      ? `<table class="q-os-table">
           <thead><tr><th>SKU</th><th>Descrição</th><th>Qtd</th><th class="valor">Valor</th></tr></thead>
           <tbody>${pecas.map((p) => `<tr>
             <td>${escapeHtml(p.sku || '—')}</td>
             <td>${escapeHtml(p.desc || '—')}</td>
             <td>${Number(p.qtd || 1)}</td>
             <td class="valor">${brl(p.valor)}</td>
           </tr>`).join('')}</tbody>
         </table>`
      : '<p class="q-os-field"><span class="value">Nenhuma peça registrada.</span></p>';

    const timeline = [
      ['Entrada', os.entrado_em],
      ['Última mudança de etapa', os.etapa_atual_desde],
      ['Concluída', os.concluido_em],
      ['Liberada', os.liberado_em],
      ['Sincronizada', os.atualizado_em],
    ].filter(([, d]) => d)
      .map(([l, d]) => `<li><strong>${l}:</strong> ${fmt(d, true)}</li>`)
      .join('');

    const rawJson = os.raw ? JSON.stringify(os.raw, null, 2) : '—';
    const dis = canEdit ? '' : 'disabled';
    const obsVal = (typeof os.observacoes === 'string') ? os.observacoes : (os.observacoes || '');

    const backdrop = el('div', 'q-os-modal-backdrop');
    backdrop.innerHTML = `
      <div class="q-os-modal sla-${sla}" role="dialog" aria-modal="true">
        <header>
          <div>
            <h2>#${escapeHtml(os.numero || os.id)}</h2>
            <div class="q-os-sub">${escapeHtml(os.equipamento_desc || 'Equipamento não informado')}</div>
          </div>
          <button class="q-os-close" title="Fechar">×</button>
        </header>
        <div class="q-os-body">
          <div class="q-os-section">
            <h3>Status &amp; SLA</h3>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <select id="q-os-status" ${dis}>${STATUS_OPTS}</select>
              <span class="q-os-sla-pill ${sla}">SLA: ${sla.replace('_', ' ')}</span>
              <span class="q-os-amount">Atualizado no Auvo: ${fmt(os.atualizado_em, true)} · ${diasSemAtualizacao(os) > LIMITE_ATRASO_DIAS ? 'ATRASADA ' + Math.floor(diasSemAtualizacao(os)) + 'd' : 'em dia'}</span>
            </div>
          </div>

          <div class="q-os-section">
            <h3>Informações</h3>
            <div class="q-os-grid">
              <div class="q-os-field"><span class="label">Equipamento</span><span class="value">${escapeHtml(os.equipamento_desc || '—')}</span></div>
              <div class="q-os-field"><span class="label">Tipo</span><span class="value">${escapeHtml(os.tipo || '—')}</span></div>
              <div class="q-os-field"><span class="label">Setor</span><input id="q-os-setor" value="${escapeHtml(os.setor || '')}" ${dis}></div>
              <div class="q-os-field"><span class="label">Hospital / Cliente</span><input id="q-os-hospital" value="${escapeHtml(os.hospital || '')}" ${dis}></div>
              <div class="q-os-field"><span class="label">Técnico</span><input id="q-os-tecnico" value="${escapeHtml(os.tecnico_nome || '')}" ${dis}></div>
              <div class="q-os-field"><span class="label">Tempo de atendimento</span><span class="value">${os.tempo_atendimento_h ? Number(os.tempo_atendimento_h).toFixed(1) + 'h' : '—'}</span></div>
            </div>
          </div>

          <div class="q-os-section">
            <h3>Defeito</h3>
            <div class="q-os-grid">
              <div class="q-os-field full"><span class="label">Relatado</span><span class="value">${escapeHtml(os.defeito_relatado || '—')}</span></div>
              <div class="q-os-field full"><span class="label">Encontrado</span><textarea id="q-os-defeito" ${dis}>${escapeHtml(os.defeito_encontrado || '')}</textarea></div>
            </div>
          </div>

          <div class="q-os-section">
            <h3>Peças associadas</h3>
            ${pecasHtml}
          </div>

          <div class="q-os-section">
            <h3>Observações</h3>
            <textarea id="q-os-obs" ${dis}>${escapeHtml(obsVal)}</textarea>
          </div>

          <div class="q-os-section">
            <h3>Histórico</h3>
            <ul class="q-os-timeline">${timeline || '<li>Sem registros de data.</li>'}</ul>
          </div>

          <div class="q-os-section">
            <details>
              <summary style="cursor:pointer;color:#64748b;font-size:12px">Dados de origem (Auvo)</summary>
              <pre class="q-os-raw">${escapeHtml(rawJson)}</pre>
            </details>
          </div>
        </div>
        <div class="q-os-actions">
          ${canEdit ? '<button class="btn btn-primary" id="q-os-save">Salvar alterações</button>' : '<span class="q-os-amount">Você não tem permissão para editar.</span>'}
          <button class="btn btn-ghost" id="q-os-close2">Fechar</button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);
    backdrop.querySelector('.q-os-close').addEventListener('click', fecharModal);
    backdrop.querySelector('#q-os-close2').addEventListener('click', fecharModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) fecharModal(); });
    const sel = backdrop.querySelector('#q-os-status');
    if (sel) sel.value = os.status || 'recebido';
    document.addEventListener('keydown', onKey);

    if (canEdit) {
      backdrop.querySelector('#q-os-save').addEventListener('click', async () => {
        const patch = {
          status: sel.value,
          defeito_encontrado: backdrop.querySelector('#q-os-defeito').value,
          setor: backdrop.querySelector('#q-os-setor').value,
          hospital: backdrop.querySelector('#q-os-hospital').value,
          tecnico_nome: backdrop.querySelector('#q-os-tecnico').value,
        };
        if ('observacoes' in os) patch.observacoes = backdrop.querySelector('#q-os-obs').value;
        const r = await QDB.update('auvo_os', os.id, patch);
        if (r) {
          Object.assign(os, patch);
          const i = osCache.findIndex((o) => o.id === os.id);
          if (i >= 0) osCache[i] = os;
          toast('O.S. atualizada');
          fecharModal();
          render();
        } else {
          toast('Erro ao salvar O.S.');
        }
      });
    }
  }

  VIEWS.register('kanban-q', {
    title: 'Kanban de Fluxo & SLA',
    render,
    refresh: render,
  });
})();
