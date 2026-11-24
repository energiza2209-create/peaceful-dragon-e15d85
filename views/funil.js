/* =========================================================
   TELA 2 — Funil de Vendas (Kanban)
   Drag & drop + botões de mover + coluna "Perdidas/Canceladas"
   com modal obrigatório de motivo (persistido em motivo_perda).
   ========================================================= */
(() => {
  let draggingId = null;
  let filterTerm = '';

  // Títulos numerados das colunas (cadência lógica do funil comercial).
  const COL_TITLES = {
    aberto: '1. Cotação em Aberto',
    precificacao: '2. Em Precificação / Montagem',
    enviada: '3. Proposta Enviada',
    negociacao: '4. Em Negociação',
    ganho: '5. Ganho / Faturado',
    perdido: '6. Perdidas / Canceladas',
  };

  // Motivos rápidos pré-definidos para a perda/cancelamento.
  const MOTIVOS = [
    'Preço acima do orçamento do cliente',
    'Concorrente venceu',
    'Cliente desistiu / sem verba',
    'Prazo de entrega inviável',
    'Sem retorno do cliente',
    'Especificação técnica não atendida',
  ];

  // Calcula o estágio de follow-up com base em last_interaction_date (agora).
  function stageClass(p) {
    const t = p.last_interaction_date ? new Date(p.last_interaction_date).getTime() : 0;
    if (!t) return '';
    const dias = Math.floor((Date.now() - t) / 86400000);
    if (dias > 5) return 'alert-danger';
    if (dias > 3) return 'alert-warning';
    return '';
  }

  // Texto de acessibilidade para o alerta de inatividade (não depende só de cor).
  function alertTag(p) {
    const t = p.last_interaction_date ? new Date(p.last_interaction_date).getTime() : 0;
    if (!t) return '';
    const dias = Math.floor((Date.now() - t) / 86400000);
    if (dias <= 3) return '';
    return `⚠ ${dias} ${dias === 1 ? 'dia' : 'dias'} sem atualização`;
  }

  // Feedback de sucesso: brilho verde vibrante por 3s após follow-up.
  function flashCard(id) {
    const card = document.querySelector(`.kcard[data-id="${CSS.escape(id)}"]`);
    if (!card) return;
    card.classList.remove('alert-warning', 'alert-danger', 'kcard-glow-success');
    // força reflow para reiniciar a animação
    void card.offsetWidth;
    card.classList.add('kcard-glow-success');
    setTimeout(() => card.classList.remove('kcard-glow-success'), 3000);
  }

  // Alerta visual vermelho para travas de segurança (ex: tentativa de avançar sem valor).
  function flashError(id) {
    const card = document.querySelector(`.kcard[data-id="${CSS.escape(id)}"]`);
    if (!card) return;
    card.classList.add('kcard-flash-error');
    setTimeout(() => card.classList.remove('kcard-flash-error'), 1200);
  }

  function cardHtml(p) {
    const item = p.itens && p.itens[0] ? p.itens[0].nome + (p.itens.length > 1 ? ` +${p.itens.length - 1}` : '') : '—';
    const motivo = p.status === 'perdido' && p.motivo_perda
      ? `<div class="kcard-motivo">✕ ${escapeHtml(p.motivo_perda)}</div>` : '';
    // Etiqueta rápida: nome do contato (ou data da última interação).
    const badgeTxt = p.contato ? p.contato : ('Interação: ' + (p.last_interaction_date ? fmtDate(p.last_interaction_date) : '—'));
    const stg = stageClass(p);
    const tag = alertTag(p);
    return `
      <div class="kcard kcard-${p.status} ${stg}" draggable="true" data-id="${escapeHtml(p.id)}">
        <div class="kcard-top">
          <span class="kcard-id mono" ${p.cotacaoNum ? 'style="color:var(--accent)"' : ''}>${escapeHtml(p.cotacaoNum ? 'Cotação ' + p.cotacaoNum : p.id)}</span>
          <span class="kcard-badge">${escapeHtml(badgeTxt)}</span>
        </div>
        ${tag ? `<div class="kcard-alert-tag ${stg}">${escapeHtml(tag)}</div>` : ''}
        <div class="kcard-cliente">${escapeHtml(p.cliente)}</div>
        <div class="kcard-item">${escapeHtml(item)}</div>
        <div class="kcard-valor">${BRL(DB.totalProposta(p))}</div>
        ${motivo}
        <div class="kcard-actions">
          <button class="btn btn-ghost btn-sm" data-act="ver" data-id="${escapeHtml(p.id)}">Detalhes</button>
          <button class="btn btn-outline btn-sm" data-act="pdf" data-id="${escapeHtml(p.id)}">PDF</button>
        </div>
      </div>`;
  }

  function render() {
    const board = $('#kanban');
    const propostas = DB.getPropostas();
    board.innerHTML = '';

    const filtradas = filterTerm
      ? propostas.filter(p => {
          const term = filterTerm.toLowerCase();
          if (p.id.toLowerCase().includes(term)) return true;
          if ((p.cliente || '').toLowerCase().includes(term)) return true;
          return (p.itens || []).some(it => (it.nome || '').toLowerCase().includes(term));
        })
      : propostas;

    DB.STATUS_ORDER.forEach(key => {
      const st = DB.STATUS[key];
      const cards = filtradas.filter(p => p.status === key)
        // Novo no topo: ordena por data_movimentacao DESC.
        .sort((a, b) => new Date(b.data_movimentacao || 0) - new Date(a.data_movimentacao || 0));
      const total = cards.reduce((s, p) => s + DB.totalProposta(p), 0);

      const col = el('div', 'kanban-col');
      col.dataset.status = key;
      col.innerHTML = `
        <div class="kanban-col-header">
          <div class="kanban-col-head">
            <h3><span class="col-dot col-dot-${key}"></span>${COL_TITLES[key] || st.label}</h3>
            <span class="col-count">${cards.length}</span>
          </div>
          <div class="col-total">${BRL(total)}</div>
        </div>
        <div class="kanban-col-body">
          ${cards.map(cardHtml).join('') || '<p class="col-empty">Vazio</p>'}
        </div>`;
      board.appendChild(col);
    });

    bindDnD();
    bindActions();
  }

  function refreshDash() { const d = VIEWS.get('dashboard'); if (d) d.render(); }

  // Núcleo: aplica a mudança de status; se for "perdido", exige motivo antes.
  function commitMove(id, novo, e) {
    const p = DB.getPropostas().find(x => x.id === id);
    if (!p || p.status === novo) return;

    // TRAVA FINANCEIRA: não avançar sem itens/valor da cotação.
    const idxAtual = DB.STATUS_ORDER.indexOf(p.status);
    const idxNovo = DB.STATUS_ORDER.indexOf(novo);
    if (idxNovo > idxAtual) {
      const total = DB.totalProposta(p);
      const semItens = !Array.isArray(p.itens) || p.itens.length === 0;
      if (semItens || total <= 0) {
        toast('Atenção: Adicione itens e valores antes de avançar esta negociação.');
        flashError(id);
        render(); // mantém o card na coluna original
        return;
      }
    }

    if (novo === 'perdido') {
      askMotivo(id, (motivo) => {
        DB.updateStatus(id, 'perdido', motivo);
        toast('Proposta marcada como perdida');
        render(); refreshDash();
      });
      return;
    }

    DB.updateStatus(id, novo);
    if (novo === 'ganho') {
      if (e) successBurst(e.clientX || window.innerWidth / 2, e.clientY || 200);
      toast('Proposta faturada! Faturamento atualizado.');
      render(); refreshDash();
      flashCard(id);
      // Gatilho de pós-venda: oferece o Resumo de Serviço Técnico (OS).
      oferecerResumoOS(id);
      return;
    }
    render(); refreshDash();
    flashCard(id);
  }

  function bindActions() {
    $$('#kanban [data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        if (act === 'ver') showDetalhes(id);
        else if (act === 'pdf' && window.Proposta) { Proposta.gerarPdfById(id); }
      });
    });
  }

  function bindDnD() {
    $$('#kanban .kcard').forEach(card => {
      card.addEventListener('dragstart', () => { draggingId = card.dataset.id; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => { draggingId = null; card.classList.remove('dragging'); $$('#kanban .kanban-col').forEach(c => c.classList.remove('drag-over')); });
    });
    $$('#kanban .kanban-col').forEach(col => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        if (!draggingId) return;
        commitMove(draggingId, col.dataset.status, e);
      });
    });
  }

  // Modal obrigatório de justificativa de perda/cancelamento.
  function askMotivo(id, onConfirm) {
    const p = DB.getPropostas().find(x => x.id === id);
    const box = el('div');
    box.innerHTML = `
      <p style="color:var(--text-2);font-size:13px;margin-bottom:14px">
        <strong>${escapeHtml(p ? p.cliente : '')}</strong> — Qual o motivo da perda/cancelamento desta proposta?
        <br><span style="color:var(--text-3);font-size:12px">Este dado é obrigatório e será usado nos relatórios analíticos.</span>
      </p>
      <label class="field full" style="margin-bottom:12px">
        <span>Motivo rápido</span>
        <select id="mpSelect">
          <option value="">— Selecione um motivo —</option>
          ${MOTIVOS.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')}
          <option value="__outro">Outro (digitar)</option>
        </select>
      </label>
      <label class="field full" id="mpOutroWrap" style="display:none">
        <span>Descreva o motivo</span>
        <textarea id="mpOutro" placeholder="Digite a justificativa..." style="min-height:80px"></textarea>
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mpCancel">Cancelar</button>
        <button class="btn btn-danger" id="mpConfirm">Confirmar perda</button>
      </div>`;
    Modal.open('Motivo da Perda / Cancelamento', box);

    const sel = $('#mpSelect');
    sel.addEventListener('change', () => {
      const outro = sel.value === '__outro';
      $('#mpOutroWrap').style.display = outro ? '' : 'none';
      if (outro) setTimeout(() => $('#mpOutro').focus(), 30);
    });

    $('#mpCancel').addEventListener('click', () => { Modal.close(); render(); });
    $('#mpConfirm').addEventListener('click', () => {
      let motivo = sel.value;
      if (motivo === '__outro') motivo = $('#mpOutro').value.trim();
      if (!motivo) { toast('Selecione ou digite um motivo'); return; }
      Modal.close();
      onConfirm(motivo);
    });
  }

  // Tipos de atividade (sem emoji — ícone outline renderizado via CSS).
  const TIPOS_ATIVIDADE = ['Ligação', 'E-mail', 'Reunião', 'Nota', 'Tarefa'];

  function atividadesHtml(p) {
    const ats = DB.getAtividades(p.id);
    if (!ats.length) {
      return `
        <div class="atv-empty">
          <p>Nenhuma atividade registrada ainda</p>
          <button class="btn btn-primary btn-sm" data-new-atv="${escapeHtml(p.id)}">+ Nova Atividade</button>
        </div>`;
    }
    const cards = ats.map(a => {
      const tipo = a.tipo || 'Nota';
      const ini = tipo.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
      return `
      <div class="atv-card">
        <div class="atv-icon">${escapeHtml(ini)}</div>
        <div class="atv-body">
          <div class="atv-head"><strong>${escapeHtml(a.titulo)}</strong><span class="atv-date mono">${fmtDate(a.criadoEm)} ${new Date(a.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div class="atv-tipo">${escapeHtml(tipo)}</div>
          ${a.descricao ? `<div class="atv-desc">${escapeHtml(a.descricao)}</div>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="atv-list">${cards}</div>`;
  }

  // Lista de propostas já emitidas (histórico) com botão de edição.
  function emissoesHtml(p) {
    const emis = DB.getEmissoes(p.id);
    if (!emis.length) {
      return `<p class="atv-empty" style="padding:14px">Nenhuma proposta emitida ainda. Use "Gerar Orçamento".</p>`;
    }
    const cards = emis.map(e => `
      <div class="atv-card">
        <div class="atv-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg></div>
        <div class="atv-body">
          <div class="atv-head"><strong>COTAÇÃO ${escapeHtml(e.cotacao)}</strong><span class="atv-date mono">${fmtDate(e.data)}</span></div>
          <div class="atv-tipo">${escapeHtml(e.tipo)}</div>
        </div>
        ${Auth.can('propostas') ? `<button class="btn btn-outline btn-sm" data-edit-emi="${escapeHtml(p.id)}">Editar Proposta</button>` : ''}
      </div>`).join('');
    return `<div class="atv-list">${cards}</div>`;
  }

  function showDetalhes(id) {
    const p = DB.getPropostas().find(x => x.id === id);
    if (!p) return;
    const st = DB.STATUS[p.status];
    const motivoBlock = p.status === 'perdido'
      ? `<div class="full" style="margin-top:6px"><span style="color:var(--text-3);font-size:11px">Motivo da perda</span><br><span style="color:var(--danger)">${escapeHtml(p.motivo_perda || '—')}</span></div>` : '';
    const box = el('div');

    function itensRows(edit) {
      if (!edit) {
        return p.itens.map(it => `<tr><td>${escapeHtml(it.nome)}</td><td class="mono">${it.qtd}</td><td class="mono">${BRL(it.preco)}</td><td class="mono">${BRL(it.preco * it.qtd)}</td></tr>`).join('');
      }
      return p.itens.map((it, i) => `
        <tr>
          <td><input class="dt-nome" data-i="${i}" value="${escapeHtml(it.nome)}" style="width:100%"></td>
          <td class="mono"><input class="dt-qtd mono" data-i="${i}" type="number" min="1" value="${it.qtd}" style="width:54px"></td>
          <td class="mono"><input class="dt-preco mono" data-i="${i}" type="number" step="0.01" min="0" value="${it.preco}" style="width:90px"></td>
          <td class="mono dt-linha" data-i="${i}">${BRL(it.preco * it.qtd)}</td>
          <td style="text-align:center"><button class="btn btn-ghost btn-sm dt-rm" data-i="${i}" title="Excluir item">✕</button></td>
        </tr>`).join('');
    }

    box.innerHTML = `
      <div id="dtHeaderInfo" class="form-grid" style="margin-bottom:14px">
        <div class="full">
          <span style="color:var(--text-3);font-size:11px">Cliente</span><br>
          <strong style="font-size:18px">${escapeHtml(p.cliente)}</strong>
        </div>
        <div>
          <span style="color:var(--text-3);font-size:11px">Contato</span><br>
          <span id="dtContato">${escapeHtml(p.contato || '—')}</span>
        </div>
        <div>
          <span style="color:var(--text-3);font-size:11px">Cotação do Cliente (Portal)</span><br>
          <span id="dtCotacaoText">${p.cotacaoNum ? '<strong style="color:var(--accent)">Cotação ' + escapeHtml(p.cotacaoNum) + '</strong>' : '—'}</span>
        </div>
        <div>
          <span style="color:var(--text-3);font-size:11px">Categoria</span><br>
          ${escapeHtml(p.categoria || '—')}
        </div>
        <div>
          <span style="color:var(--text-3);font-size:11px">Validade</span><br>
          <span id="dtValidadeText">${escapeHtml(p.validade || '—')}</span>
        </div>
        <div>
          <span style="color:var(--text-3);font-size:11px">Prazo</span><br>
          <span id="dtPrazoText">${escapeHtml(p.prazo || '—')}</span>
        </div>
        <div>
          <span style="color:var(--text-3);font-size:11px">Pagamento</span><br>
          <span id="dtPagamentoText">${escapeHtml(p.pagamento || '—')}</span>
        </div>
      </div>
      <p style="color:var(--text-3);font-size:12px;margin-bottom:14px" class="mono">${escapeHtml(p.id)} • criada em ${fmtDate(p.criadoEm)} <span class="badge ${st.badge}" style="margin-left:8px">${st.label}</span></p>
      <table class="table"><thead><tr><th>Item</th><th>Qtd</th><th>Unit.</th><th>Total</th><th></th></tr></thead>
        <tbody id="dtItens">${itensRows(false)}</tbody>
        <tfoot><tr><td colspan="3" class="grand-total-label">TOTAL</td><td class="grand-total mono" id="dtTotal">${BRL(DB.totalProposta(p))}</td><td></td></tr></tfoot>
      </table>
      ${motivoBlock ? `<div class="full" style="margin-top:6px;padding:8px 0"><span style="color:var(--text-3);font-size:11px">Motivo da perda</span><br><span style="color:var(--danger)">${escapeHtml(p.motivo_perda || '—')}</span></div>` : ''}

      <div class="atv-section">
        <div class="atv-header">
          <h4>Atividades da Negociação</h4>
          ${Auth.can('propostas') ? `<button class="btn btn-primary btn-sm" data-new-atv="${escapeHtml(p.id)}">+ Nova Atividade</button>` : ''}
        </div>
        <div id="atvContainer">${atividadesHtml(p)}</div>
      </div>

      <div class="atv-section">
        <div class="atv-header">
          <h4>Propostas Emitidas</h4>
        </div>
        <div id="emiContainer">${emissoesHtml(p)}</div>
      </div>

      <div class="modal-actions" id="dtActions">
        ${Auth.can('propostas') ? '<button class="btn btn-danger" id="mdDel">Excluir</button>' : ''}
        ${Auth.can('propostas') ? '<button class="btn btn-ghost" id="mdEdit">Editar negociação</button>' : ''}
        <button class="btn btn-success" id="mdPdf"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>Gerar Orçamento</button>
      </div>`;
    Modal.open('Detalhes da Proposta', box);

    $('#mdPdf').addEventListener('click', () => { Modal.close(); if (window.Proposta) { Proposta.emitirProposta(p, true); } });
    const mdDel = $('#mdDel');
    if (mdDel) mdDel.addEventListener('click', () => {
      if (confirm('Excluir esta proposta?')) { DB.deleteProposta(id); Modal.close(); render(); refreshDash(); toast('Proposta excluída'); }
    });
    const mdEdit = $('#mdEdit');
    if (mdEdit) mdEdit.addEventListener('click', () => {
      // Entra em modo de edição inline dos itens e cabeçalho.
      $('#dtItens').innerHTML = itensRows(true);
      // Substitui grid do cabeçalho por versão editável
      const hdr = $('#dtHeaderInfo');
      if (hdr) {
        hdr.innerHTML = `
          <div class="full">
            <span style="color:var(--text-3);font-size:11px">Cliente</span><br>
            <strong style="font-size:18px">${escapeHtml(p.cliente)}</strong>
          </div>
          <label class="field"><span>Contato</span><input id="dtContatoInput" value="${escapeHtml(p.contato || '')}"></label>
          <label class="field"><span>Nº da Cotação (Portal do Cliente)</span><input id="dtCotacaoNum" value="${escapeHtml(p.cotacaoNum || '')}" placeholder="Nº gerado no portal do cliente"></label>
          <div><span style="color:var(--text-3);font-size:11px">Categoria</span><br>${escapeHtml(p.categoria || '—')}</div>
          <label class="field"><span>Validade</span><input id="dtValidade" value="${escapeHtml(p.validade || '')}"></label>
          <label class="field"><span>Prazo</span><input id="dtPrazo" value="${escapeHtml(p.prazo || '')}"></label>
          <label class="field full"><span>Pagamento</span><input id="dtPagamento" value="${escapeHtml(p.pagamento || '')}"></label>`;
      }
      $('#dtActions').innerHTML = `
        <button class="btn btn-ghost" id="mdCancelEdit">Cancelar</button>
        <button class="btn btn-success" id="mdAddItem">+ Adicionar item</button>
        <button class="btn btn-primary" id="mdSave">Salvar alterações</button>`;
      // Recalcula linha/total ao digitar
      const recalc = () => {
        let total = 0;
        p.itens.forEach((it, i) => {
          const q = Number($(`.dt-qtd[data-i="${i}"]`).value) || 0;
          const pr = Number($(`.dt-preco[data-i="${i}"]`).value) || 0;
          $(`.dt-linha[data-i="${i}"]`).textContent = BRL(q * pr);
          total += q * pr;
        });
        $('#dtTotal').textContent = BRL(total);
      };
      // Reanexa listeners após re-render do tbody (índices mudam).
      const rebindEdit = () => {
        $$('.dt-qtd, .dt-preco', box).forEach(inp => inp.addEventListener('input', recalc));
        $$('.dt-rm', box).forEach(btn => btn.addEventListener('click', () => {
          const i = Number(btn.dataset.i);
          p.itens.splice(i, 1);
          $('#dtItens').innerHTML = itensRows(true);
          rebindEdit();
          recalc();
        }));
      };
      rebindEdit();
      recalc();
      // Adicionar item
      $('#mdAddItem').addEventListener('click', () => {
        p.itens.push({ nome: 'Novo item', descricao: '', qtd: 1, preco: 0, foto: '' });
        $('#dtItens').innerHTML = itensRows(true);
        rebindEdit();
        recalc();
      });
      $('#mdCancelEdit').addEventListener('click', () => showDetalhes(id));
      let _savingMd = false;
      $('#mdSave').addEventListener('click', () => {
        if (_savingMd) return;
        _savingMd = true;
        const btn = $('#mdSave');
        if (btn) btn.disabled = true;
        try {
          const itens = p.itens.map((it, i) => ({
            ...it,
            nome: $(`.dt-nome[data-i="${i}"]`).value.trim() || it.nome,
            qtd: Math.max(1, parseInt($(`.dt-qtd[data-i="${i}"]`).value) || 1),
            preco: Number($(`.dt-preco[data-i="${i}"]`).value) || 0,
          }));
          const contato = ($('#dtContatoInput')?.value || '').trim();
          const cotacaoNum = ($('#dtCotacaoNum')?.value || '').trim();
          const validade = ($('#dtValidade')?.value || '').trim();
          const prazo = ($('#dtPrazo')?.value || '').trim();
          const pagamento = ($('#dtPagamento')?.value || '').trim();
          DB.updateProposta(id, { itens, contato, cotacaoNum, validade, prazo, pagamento });
          toast('Negociação atualizada');
          showDetalhes(id);
          render(); refreshDash();
        } finally {
          _savingMd = false;
          if (btn) btn.disabled = false;
        }
      });
    });
    // Liga botões "+ Nova Atividade".
    $$('[data-new-atv]', box).forEach(btn => btn.addEventListener('click', () => openAtividadeModal(id)));
    // Liga botões "Editar Proposta" do histórico de emissões.
    $$('[data-edit-emi]', box).forEach(btn => btn.addEventListener('click', () => openEditarProposta(id)));
  }

  // Modal de edição direta da proposta (pré-preenchido, sem refazer o fluxo).
  function openEditarProposta(id) {
    const p = DB.getPropostas().find(x => x.id === id);
    if (!p) return;
    const itensRows = p.itens.map((it, i) => `
      <tr>
        <td><input class="emi-nome" data-i="${i}" value="${escapeHtml(it.nome)}" style="width:100%"></td>
        <td><input class="emi-desc" data-i="${i}" value="${escapeHtml(it.descricao || '')}" style="width:100%"></td>
        <td class="mono"><input class="emi-qtd mono" data-i="${i}" type="number" min="1" value="${it.qtd}" style="width:54px"></td>
        <td class="mono"><input class="emi-preco mono" data-i="${i}" type="number" step="0.01" min="0" value="${it.preco}" style="width:90px"></td>
      </tr>`).join('');

    const box = el('div');
    box.innerHTML = `
      <div class="form-grid" style="margin-bottom:12px">
        <label class="field"><span>Cliente / Razão Social</span><input id="epCliente" value="${escapeHtml(p.cliente)}"></label>
        <label class="field"><span>Contato</span><input id="epContato" value="${escapeHtml(p.contato || '')}"></label>
        <label class="field"><span>Nº da Cotação (Portal do Cliente)</span><input id="epCotacaoNum" value="${escapeHtml(p.cotacaoNum || '')}" placeholder="Nº gerado no portal do cliente"></label>
        <label class="field"><span>Projeto / Categoria</span><input id="epProjeto" value="${escapeHtml(p.projeto || p.categoria || '')}"></label>
        <label class="field"><span>Validade</span><input id="epValidade" value="${escapeHtml(p.validade || '')}"></label>
        <label class="field"><span>Prazo</span><input id="epPrazo" value="${escapeHtml(p.prazo || '')}"></label>
        <label class="field"><span>Pagamento</span><input id="epPagamento" value="${escapeHtml(p.pagamento || '')}"></label>
        <label class="field full"><span>Foto do Produto (URL ou Base64)</span><input id="epFoto" value="${escapeHtml(p.foto_produto || (p.itens[0] && p.itens[0].foto) || '')}" placeholder="data:image/... ou https://..."></label>
        <label class="field full"><span>Descrição Técnica</span><textarea id="epDescTec" placeholder="Detalhes técnicos do equipamento/serviço..." style="min-height:70px">${escapeHtml(p.descricao_tecnica || (p.itens[0] && p.itens[0].descricao) || '')}</textarea></label>
      </div>
      <p style="font-size:12px;color:var(--text-3);margin:4px 0 8px"><strong>Itens / Serviços</strong></p>
      <table class="table"><thead><tr><th>Nome</th><th>Descrição</th><th>Qtd</th><th>Unit.</th></tr></thead>
        <tbody>${itensRows}</tbody></table>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="epCancel">Cancelar</button>
        <button class="btn btn-primary" id="epSave">Salvar Alterações</button>
      </div>`;
    Modal.open('Editar Proposta — ' + p.id, box);

    $('#epCancel').addEventListener('click', Modal.close);
    let _savingEp = false;
    $('#epSave').addEventListener('click', () => {
      if (_savingEp) return;
      _savingEp = true;
      const btn = $('#epSave');
      if (btn) btn.disabled = true;
      try {
        const itens = p.itens.map((it, i) => ({
          ...it,
          nome: $(`.emi-nome[data-i="${i}"]`).value.trim() || it.nome,
          descricao: $(`.emi-desc[data-i="${i}"]`).value.trim(),
          qtd: Math.max(1, parseInt($(`.emi-qtd[data-i="${i}"]`).value) || 1),
          preco: Number($(`.emi-preco[data-i="${i}"]`).value) || 0,
        }));
        DB.updateProposta(id, {
          cliente: $('#epCliente').value.trim() || p.cliente,
          contato: $('#epContato').value.trim(),
          cotacaoNum: $('#epCotacaoNum').value.trim(),
          projeto: $('#epProjeto').value.trim(),
          categoria: $('#epProjeto').value.trim(),
          validade: $('#epValidade').value.trim(),
          prazo: $('#epPrazo').value.trim(),
          pagamento: $('#epPagamento').value.trim(),
          foto_produto: $('#epFoto').value.trim(),
          descricao_tecnica: $('#epDescTec').value.trim(),
          itens,
        });
        Modal.close();
        toast('Proposta atualizada — você pode reemitir agora');
        showDetalhes(id);
        render(); refreshDash();
      } finally {
        _savingEp = false;
        if (btn) btn.disabled = false;
      }
    });
  }

  // Modal de criação de atividade (título herda "COTAÇÃO xxxxx - ITEM").
  function openAtividadeModal(id) {
    const p = DB.getPropostas().find(x => x.id === id);
    if (!p) return;
    const item = p.itens[0] ? p.itens[0].nome + (p.itens.length > 1 ? ` +${p.itens.length - 1}` : '') : '—';
    const tituloModal = `Adicionar atividade para: ${p.id} - ${item}`;

    const box = el('div');
    box.innerHTML = `
      <label class="field full" style="margin-bottom:12px">
        <span>Tipo de Atividade</span>
        <select id="atvTipo">
          ${TIPOS_ATIVIDADE.map((t, i) => `<option value="${escapeHtml(t)}" ${i === 3 ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
        </select>
      </label>
      <label class="field full" style="margin-bottom:12px">
        <span>Título <span style="color:var(--danger)">*</span></span>
        <input id="atvTitulo" type="text" placeholder="Ex: Nota com cliente" />
      </label>
      <label class="field full" style="margin-bottom:6px">
        <span>Descrição</span>
        <textarea id="atvDesc" placeholder="Adicione detalhes sobre a atividade..." style="min-height:90px"></textarea>
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="atvCancel">Cancelar</button>
        <button class="btn btn-primary" id="atvCreate">Criar Atividade</button>
      </div>`;
    Modal.open(tituloModal, box);

    const foco = () => setTimeout(() => { const i = $('#atvTitulo'); if (i) i.focus(); }, 30);
    foco();

    $('#atvCancel').addEventListener('click', Modal.close);
    $('#atvCreate').addEventListener('click', () => {
      const titulo = $('#atvTitulo').value.trim();
      if (!titulo) { toast('O título é obrigatório'); $('#atvTitulo').focus(); return; }
      const a = DB.addAtividade(id, {
        tipo: $('#atvTipo').value,
        titulo,
        descricao: $('#atvDesc').value.trim(),
      });
      if (!a) { Modal.close(); return; }
      Modal.close();
      toast('Atividade registrada');
      // Reabre o painel de detalhes atualizado (timeline + "Atualizado em:").
      showDetalhes(id);
      render(); refreshDash();
      flashCard(id);
    });
  }

  // Gatilho de pós-venda: ao faturar, oferece gerar o Resumo de Serviço Técnico.
  function oferecerResumoOS(id) {
    const p = DB.getPropostas().find(x => x.id === id);
    if (!p) return;
    const box = el('div');
    box.innerHTML = `
      <p style="color:var(--text-2);font-size:13px;margin-bottom:14px">
        Negociação <strong>${escapeHtml(p.id)}</strong> faturada!<br>
        Deseja gerar o <strong>Resumo de Serviço Técnico</strong> para abrir a Ordem de Serviço (OS) com os técnicos de campo?
      </p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="osSkip">Agora não</button>
        <button class="btn btn-success" id="osGerar">Gerar Resumo de Serviço</button>
      </div>`;
    Modal.open('Pós-Venda — Ordem de Serviço', box);
    $('#osSkip').addEventListener('click', Modal.close);
    $('#osGerar').addEventListener('click', () => { Modal.close(); gerarResumoOS(p); });
  }

  // Compila um briefing limpo (texto) para a Ordem de Serviço.
  function gerarResumoOS(p) {
    const equipamento = p.itens.map(it => `• ${it.nome} (${it.qtd}x) — ${BRL(it.preco * it.qtd)}`).join('\n');
    const specs = (p.descricao_tecnica || (p.itens[0] && p.itens[0].descricao) || 'Verificar especificações no card da cotação.');
    const resumo =
`RESUMO DE SERVIÇO TÉCNICO — ORDEM DE SERVIÇO
=============================================
COTAÇÃO: ${p.id}
HOSPITAL / CLIENTE: ${p.cliente}
CONTATO: ${p.contato || '—'}
EQUIPAMENTO(S):
${equipamento}
ESPECIFICAÇÕES TÉCNICAS:
${specs}
PRAZO DE EXECUÇÃO: ${p.prazo || '—'}
VALIDADE: ${p.validade || '—'}
FORMA DE PAGAMENTO: ${p.pagamento || '—'}
VALOR TOTAL: ${BRL(DB.totalProposta(p))}
=============================================
Gerado em ${new Date().toLocaleString('pt-BR')} — METROLAB'S SOLUÇÕES EM ENGENHARIA CLÍNICA`;

    const box = el('div');
    box.innerHTML = `
      <p style="color:var(--text-2);font-size:13px;margin-bottom:12px">Briefing pronto para copiar/anexar na plataforma de OS:</p>
      <textarea id="osText" readonly style="width:100%;min-height:220px;font-family:monospace;font-size:11px;padding:10px;border-radius:8px;background:var(--bg-2);color:var(--text-1);border:1px solid var(--border)">${escapeHtml(resumo)}</textarea>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="osClose">Fechar</button>
        <button class="btn btn-primary" id="osCopy">Copiar texto</button>
      </div>`;
    Modal.open('Resumo de Serviço Técnico — ' + p.id, box);
    $('#osClose').addEventListener('click', Modal.close);
    $('#osCopy').addEventListener('click', () => {
      const ta = $('#osText');
      ta.select();
      try { document.execCommand('copy'); toast('Resumo copiado para a área de transferência'); }
      catch (_) { if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => toast('Resumo copiado')); }
    });
  }

  // Busca no funil com debounce
  const busca = $('#funilBusca');
  if (busca) {
    let timer;
    busca.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        filterTerm = busca.value.trim();
        render();
      }, 200);
    });
  }

  VIEWS.register('funil', { render });
  })();
