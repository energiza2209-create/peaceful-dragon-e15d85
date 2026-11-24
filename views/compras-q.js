/* =========================================================
   TELA — Solicitação de Peças e Orçamentos (Módulo Qualidade)
   Regra de negócio: exigem 3 orçamentos validados para aprovar.
   A constraint também é garantida via trigger SQL (008).
   ========================================================= */
(() => {
  let stateBindings = false;

  function bindGlobalEvents() {
    if (stateBindings) return;
    stateBindings = true;
    document.addEventListener('click', async (e) => {
      const op = e.target.closest('[data-qcompra-action]');
      if (!op) return;
      const action = op.dataset.qcompraAction;
      const solId = op.dataset.solId;
      const orcId = op.dataset.orcId;
      try {
        if (action === 'validate') await toggleValidate(orcId);
        else if (action === 'approve') await aprovar(solId);
        else if (action === 'reject') await reprovar(solId);
        else if (action === 'mark-received') await marcarRecebida(solId);
        else if (action === 'new-quote') await novoOrcamentoModal(solId);
        else if (action === 'new-solicitacao') await novaSolicitacaoModal();
        else if (action === 'delete-quote') await deletarOrcamento(orcId);
        render();
      } catch (err) {
        if (typeof logger !== 'undefined' && logger.error) logger.error('compras.action.fail', err);
        else console.error(err);
        toast('Erro na operação de compra', 'error');
      }
    });
  }

  async function carregarSolicitacoes() {
    return (await QDB.list('compras_solicitacoes', {}, 'atualizada_em', { ascending: false })) || [];
  }
  async function carregarOrcamentos() {
    return (await QDB.list('compras_orcamentos', {}, 'criado_em', { ascending: false })) || [];
  }

  async function toggleValidate(orcId) {
    const supa = QDB.raw();
    if (!supa) return;
    const { data } = await supa.from('compras_orcamentos')
      .select('validado').eq('id', orcId).single();
    const nv = !data?.validado;
    await supa.from('compras_orcamentos').update({ validado: nv }).eq('id', orcId);
    if (typeof logger !== 'undefined' && logger.audit) logger.audit('compras.orcamento.validate', { orcId, validado: nv });
    toast(nv ? 'Orçamento validado' : 'Validação removida', 'success');
  }

  async function aprovar(solId) {
    const supa = QDB.raw();
    if (!supa) return;
    const { data: sol } = await supa.from('compras_solicitacoes')
      .select('orcamentos_aprovados,peca_desc,qtd').eq('id', solId).single();
    if (!sol) return;
    if ((sol.orcamentos_aprovados || 0) < 3) {
      toast(`Aprovação exige 3 orçamentos validados (atual: ${sol.orcamentos_aprovados || 0}/3)`, 'warn');
      return;
    }
    // Pega o menor orçamento validado automaticamente
    const { data: orcs } = await supa.from('compras_orcamentos')
      .select('fornecedor,valor_unitario,prazo')
      .eq('solicitacao_id', solId).eq('validado', true)
      .order('valor_unitario', { ascending: true }).limit(1);
    const melhor = orcs && orcs[0];
    const patch = {
      status: 'aprovada',
      valor_escolhido: melhor?.valor_unitario || null,
      fornecedor_escolhido: melhor?.fornecedor || null,
    };
    await supa.from('compras_solicitacoes').update(patch).eq('id', solId);
    if (typeof logger !== 'undefined' && logger.audit) logger.audit('compras.aprovar', { solId, ...patch });
    toast(`Compra aprovada — fornecedor: ${melhor?.fornecedor || '—'}`, 'success');
  }

  async function reprovar(solId) {
    if (!confirm('Confirmar reprovação desta solicitação?')) return;
    await QDB.update('compras_solicitacoes', solId, { status: 'reprovada' });
    if (typeof logger !== 'undefined' && logger.audit) logger.audit('compras.reprovar', { solId });
    toast('Solicitação reprovada', 'warn');
  }

  async function marcarRecebida(solId) {
    await QDB.update('compras_solicitacoes', solId, { status: 'recebida' });
    if (typeof logger !== 'undefined' && logger.audit) logger.audit('compras.recebida', { solId });
    toast('Peça marcada como recebida', 'success');
  }

  async function novaSolicitacaoModal() {
    const body = el('div', 'q-form');
    body.innerHTML = `
      <label class="field"><span>Peça solicitada</span><input id="nsDesc" placeholder="Ex: Bateria Panasonic LR6" /></label>
      <label class="field"><span>Quantidade</span><input id="nsQtd" type="number" min="1" value="1" /></label>
      <label class="field"><span>O.S. relacionada (opcional)</span><input id="nsOsId" placeholder="auvo_id" /></label>
      <label class="field"><span>Equipamento (opcional)</span><input id="nsEqId" placeholder="equipamento_id" /></label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary" id="nsSave">Salvar</button>
        <button class="btn" id="nsCancel">Cancelar</button>
      </div>`;
    Modal.open('Nova Solicitação de Compra', body);
    $('#nsCancel').onclick = Modal.close;
    $('#nsSave').onclick = async () => {
      const desc = $('#nsDesc').value.trim();
      const qtd = parseInt($('#nsQtd').value, 10) || 1;
      if (!desc) return toast('Descrição obrigatória', 'warn');
      const supa = QDB.raw();
      if (supa) {
        await supa.from('compras_solicitacoes').insert({
          peca_desc: desc, qtd,
          os_id: $('#nsOsId').value.trim() || null,
          equipamento_id: $('#nsEqId').value.trim() || null,
        });
      }
      Modal.close();
      toast('Solicitação criada — colete 3 orçamentos', 'success');
      render();
    };
  }

  async function novoOrcamentoModal(solId) {
    const body = el('div', 'q-form');
    body.innerHTML = `
      <label class="field"><span>Fornecedor</span><input id="noForn" placeholder="Ex: Panasonic Brasil" /></label>
      <label class="field"><span>Valor unitário (R$)</span><input id="noVal" type="number" step="0.01" min="0" /></label>
      <label class="field"><span>Prazo de entrega</span><input id="noPrazo" type="date" /></label>
      <label class="field"><span>Observação (opcional)</span><textarea id="noObs" rows="2"></textarea></label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary" id="noSave">Salvar orçamento</button>
        <button class="btn" id="noCancel">Cancelar</button>
      </div>`;
    Modal.open('Adicionar Orçamento', body);
    $('#noCancel').onclick = Modal.close;
    $('#noSave').onclick = async () => {
      const forn = $('#noForn').value.trim();
      const val = parseFloat($('#noVal').value);
      if (!forn || isNaN(val)) return toast('Fornecedor e valor são obrigatórios', 'warn');
      const supa = QDB.raw();
      if (supa) {
        await supa.from('compras_orcamentos').insert({
          solicitacao_id: solId,
          fornecedor: forn,
          valor_unitario: val,
          prazo: $('#noPrazo').value || null,
          observacao: $('#noObs').value.trim() || null,
        });
      }
      Modal.close();
      toast('Orçamento adicionado', 'success');
      render();
    };
  }

  async function deletarOrcamento(orcId) {
    if (!confirm('Remover este orçamento?')) return;
    const supa = QDB.raw();
    if (supa) await supa.from('compras_orcamentos').delete().eq('id', orcId);
    toast('Orçamento removido', 'warn');
  }

  function cardSolicitacaoHtml(sol, orcs) {
    const meusOrcs = orcs.filter(o => o.solicitacao_id === sol.id);
    const validados = meusOrcs.filter(o => o.validado).length;
    const aprovado = sol.status === 'aprovada';
    const podeAprovar = validados >= 3 && sol.status === 'orcamentos_coletando';
    const podeReceber = sol.status === 'aprovada';
    const statusBadge = {
      'orcamentos_coletando': { txt: `Coletando orçamentos (${validados}/3)`, cls: 'q-status-collect' },
      'aprovada': { txt: 'Aprovada', cls: 'q-status-aprov' },
      'reprovada': { txt: 'Reprovada', cls: 'q-status-reprov' },
      'recebida': { txt: 'Recebida', cls: 'q-status-receb' },
    }[sol.status] || { txt: sol.status, cls: '' };
    return `
      <article class="q-compra-card">
        <header>
          <div>
            <strong>${escapeHtml(sol.peca_desc)}</strong>
            <span class="q-meta">Qtd: ${sol.qtd || 1} ${sol.equipamento_id ? '· Eq: ' + escapeHtml(sol.equipamento_id) : ''}</span>
          </div>
          <span class="q-status ${statusBadge.cls}">${statusBadge.txt}</span>
        </header>
        ${sol.os_id ? `<div class="q-meta">O.S.: <code>${escapeHtml(sol.os_id)}</code></div>` : ''}
        ${aprovado && sol.fornecedor_escolhido ? `
          <div class="q-aprovado-info">
            Fornecedor: <strong>${escapeHtml(sol.fornecedor_escolhido)}</strong> ·
            Valor: <strong>${BRL(sol.valor_escolhido)}</strong>
          </div>` : ''}
        <div class="q-orcamentos">
          ${meusOrcs.map(o => `
            <div class="q-orc-row ${o.validado ? 'q-orc-valid' : ''}">
              <label class="q-orc-check">
                <input type="checkbox" ${o.validado ? 'checked' : ''}
                  data-qcompra-action="validate" data-orc-id="${o.id}" />
                <span></span>
              </label>
              <div class="q-orc-info">
                <strong>${escapeHtml(o.fornecedor)}</strong>
                <span>${BRL(o.valor_unitario)} ${o.prazo ? '· prazo ' + fmtDate(o.prazo) : ''}</span>
              </div>
              <button class="btn-icon" data-qcompra-action="delete-quote" data-orc-id="${o.id}" title="Remover">✕</button>
            </div>`).join('') || '<div class="q-empty">Nenhum orçamento cadastrado</div>'}
        </div>
        <div class="q-card-actions">
          <button class="btn btn-sm primary" data-qcompra-action="new-quote" data-sol-id="${sol.id}">+ Orçamento</button>
          ${podeAprovar ? `<button class="btn btn-sm btn-primary" data-qcompra-action="approve" data-sol-id="${sol.id}">Aprovar (3 OK)</button>` : ''}
          ${sol.status === 'orcamentos_coletando' ? `<button class="btn btn-sm btn-ghost" data-qcompra-action="reject" data-sol-id="${sol.id}">Reprovar</button>` : ''}
          ${podeReceber ? `<button class="btn btn-sm btn-primary" data-qcompra-action="mark-received" data-sol-id="${sol.id}">Marcar recebida</button>` : ''}
        </div>
      </article>`;
  }

  async function render() {
    const root = $('#view-compras-q');
    if (!root) return;
    bindGlobalEvents();
    const [sols, orcs] = await Promise.all([carregarSolicitacoes(), carregarOrcamentos()]);
    const filters = [
      { k: 'orcamentos_coletando', label: 'Coletando' },
      { k: 'aprovada', label: 'Aprovadas' },
      { k: 'recebida', label: 'Recebidas' },
      { k: 'reprovada', label: 'Reprovadas' },
    ];
    const grouped = filters.map(f => ({
      ...f,
      items: sols.filter(s => s.status === f.k),
    }));
    root.innerHTML = `
      <div class="q-compra-toolbar">
        <h2>Solicitações de Peças</h2>
        <button class="btn btn-primary" data-qcompra-action="new-solicitacao">+ Nova Solicitação</button>
      </div>
      <div class="q-compra-grid">
        ${grouped.map(g => `
          <section class="q-compra-col">
            <header><h3>${g.label}</h3><span class="q-col-count">${g.items.length}</span></header>
            <div class="q-col-body">${g.items.map(s => cardSolicitacaoHtml(s, orcs)).join('') || '<div class="q-empty">Vazio</div>'}</div>
          </section>`).join('')}
      </div>`;
  }

  VIEWS.register('compras-q', {
    title: 'Solicitação de Peças',
    render,
    refresh: render,
  });
})();
