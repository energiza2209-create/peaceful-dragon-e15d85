/* =========================================================
   TELA — Central de Lembretes e Notificações (Módulo Qualidade)
   Alertas de vencimento de contratos, calibração, auditorias.
   Tarefas manuais ou recorrentes.
   ========================================================= */
(() => {
  let bound = false;

  function bindGlobal() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', async (e) => {
      const op = e.target.closest('[data-qlembrete-action]');
      if (!op) return;
      const a = op.dataset.qlembreteAction;
      const id = op.dataset.id;
      try {
        if (a === 'new') await abrirModalNovo();
        else if (a === 'edit') await abrirModalEdicao(id);
        else if (a === 'check') await marcarConcluido(id);
        else if (a === 'delete') await excluir(id);
      } catch (err) {
        if (typeof logger !== 'undefined' && logger.error) logger.error('lembretes.action.fail', err);
        else console.error(err);
        toast('Erro na operação de lembrete', 'error');
      }
    });
  }

  function entidadesProximas(dataAlvo, diasLimite) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const alvo = new Date(dataAlvo); alvo.setHours(0,0,0,0);
    const diff = Math.round((alvo - hoje) / 86400000);
    return { diff, proximo: diff <= diasLimite, atrasado: diff < 0 };
  }

  async function carregar() {
    return (await QDB.list('lembretes', {}, 'data_alvo', { ascending: true })) || [];
  }

  async function marcarConcluido(id) {
    const supa = QDB.raw();
    if (!supa) return;
    const { data: l } = await supa.from('lembretes').select('*').eq('id', id).single();
    if (!l) return;
    // Se recorrente, reagenda automático criando um novo lembrete (data_alvo + recorrencia_dias)
    if (l.recorrente && l.recorrencia_dias) {
      const nova = new Date(l.data_alvo);
      nova.setDate(nova.getDate() + l.recorrencia_dias);
      await supa.from('lembretes').insert({
        titulo: l.titulo, tipo: l.tipo, descricao: l.descricao,
        data_alvo: nova.toISOString().slice(0,10),
        recorrente: true, recorrencia_dias: l.recorrencia_dias,
        hospital: l.hospital, equipamento_id: l.equipamento_id,
        criado_por: l.criado_por,
      });
      toast('Concluído — próximo lembrete criado automaticamente', 'success');
    } else {
      toast('Lembrete marcado como concluído', 'success');
    }
    await supa.from('lembretes').update({ concluido: true, atualizado_em: new Date().toISOString() }).eq('id', id);
    render();
  }

  async function excluir(id) {
    if (!confirm('Excluir este lembrete?')) return;
    const supa = QDB.raw();
    if (supa) await supa.from('lembretes').delete().eq('id', id);
    toast('Lembrete excluído', 'warn');
    render();
  }

  async function abrirModalNovo() {
    const body = el('div', 'q-form');
    body.innerHTML = `
      <label class="field"><span>Título</span><input id="lbTitulo" placeholder="Ex: Vencimento contrato Hospital X" /></label>
      <label class="field"><span>Tipo</span>
        <select id="lbTipo">
          <option value="contrato">Contrato</option>
          <option value="calibracao">Calibração</option>
          <option value="auditoria">Auditoria</option>
          <option value="manual">Tarefa manual</option>
        </select></label>
      <label class="field"><span>Data alvo</span><input id="lbData" type="date" /></label>
      <label class="field"><span>Descrição (opcional)</span><textarea id="lbDesc" rows="2"></textarea></label>
      <label class="field"><span>Hospital (opcional)</span><input id="lbHospital" placeholder="Hospital..." /></label>
      <label class="field" style="flex-direction:row;align-items:center;gap:6px">
        <input type="checkbox" id="lbRecorrente" /> Recorrente a cada
        <input id="lbDias" type="number" min="1" value="30" style="width:80px" /> dias
      </label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary" id="lbSave">Salvar</button>
        <button class="btn" id="lbCancel">Cancelar</button>
      </div>`;
    Modal.open('Novo Lembrete', body);
    $('#lbCancel').onclick = Modal.close;
    $('#lbSave').onclick = async () => {
      const titulo = $('#lbTitulo').value.trim();
      const tipo = $('#lbTipo').value;
      const data_alvo = $('#lbData').value;
      if (!titulo || !data_alvo) return toast('Título e data são obrigatórios', 'warn');
      const recorrente = $('#lbRecorrente').checked;
      const recorrencia_dias = recorrente ? (parseInt($('#lbDias').value, 10) || 30) : null;
      const supa = QDB.raw();
      if (supa) {
        const { data: u } = await supa.auth.getUser();
        const { error } = await supa.from('lembretes').insert({
          titulo, tipo, data_alvo,
          descricao: $('#lbDesc').value.trim() || null,
          hospital: $('#lbHospital').value.trim() || null,
          recorrente, recorrencia_dias,
          criado_por: u?.user?.id || null,
        });
        if (error) return toast('Erro: ' + error.message, 'error');
      }
      Modal.close();
      toast('Lembrete criado', 'success');
      render();
    };
  }

  async function abrirModalEdicao(id) {
    const supa = QDB.raw();
    if (!supa) return;
    const { data: l } = await supa.from('lembretes').select('*').eq('id', id).single();
    if (!l) return;
    const body = el('div', 'q-form');
    body.innerHTML = `
      <label class="field"><span>Título</span><input id="lbTitulo" value="${escapeHtml(l.titulo)}" /></label>
      <label class="field"><span>Tipo</span>
        <select id="lbTipo">
          <option value="contrato" ${l.tipo==='contrato'?'selected':''}>Contrato</option>
          <option value="calibracao" ${l.tipo==='calibracao'?'selected':''}>Calibração</option>
          <option value="auditoria" ${l.tipo==='auditoria'?'selected':''}>Auditoria</option>
          <option value="manual" ${l.tipo==='manual'?'selected':''}>Tarefa manual</option>
        </select></label>
      <label class="field"><span>Data alvo</span><input id="lbData" type="date" value="${l.data_alvo}" /></label>
      <label class="field"><span>Descrição</span><textarea id="lbDesc" rows="2">${escapeHtml(l.descricao || '')}</textarea></label>
      <label class="field"><span>Hospital</span><input id="lbHospital" value="${escapeHtml(l.hospital || '')}" /></label>
      <label class="field" style="flex-direction:row;align-items:center;gap:6px">
        <input type="checkbox" id="lbRecorrente" ${l.recorrente?'checked':''} /> Recorrente a cada
        <input id="lbDias" type="number" min="1" value="${l.recorrencia_dias||30}" style="width:80px" /> dias
      </label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary" id="lbSave">Salvar alterações</button>
        <button class="btn" id="lbCancel">Cancelar</button>
      </div>`;
    Modal.open('Editar Lembrete', body);
    $('#lbCancel').onclick = Modal.close;
    $('#lbSave').onclick = async () => {
      const patch = {
        titulo: $('#lbTitulo').value.trim(),
        tipo: $('#lbTipo').value,
        data_alvo: $('#lbData').value,
        descricao: $('#lbDesc').value.trim() || null,
        hospital: $('#lbHospital').value.trim() || null,
        recorrente: $('#lbRecorrente').checked,
        recorrencia_dias: $('#lbRecorrente').checked ? (parseInt($('#lbDias').value, 10) || 30) : null,
      };
      if (!patch.titulo || !patch.data_alvo) return toast('Título e data são obrigatórios', 'warn');
      const { error } = await supa.from('lembretes').update(patch).eq('id', id);
      if (error) return toast('Erro: ' + error.message, 'error');
      Modal.close();
      toast('Lembrete atualizado', 'success');
      render();
    };
  }

  function lembreteCard(l) {
    const { diff, atrasado, proximo } = entidadesProximas(l.data_alvo, 7);
    const estado = l.concluido ? 'concluido'
                   : atrasado ? 'atrasado'
                   : proximo ? 'proximo'
                   : 'futuro';
    const flagTxt = l.concluido ? 'Concluído'
                    : atrasado ? `Atrasado ${-diff}d`
                    : proximo ? `Em ${diff}d`
                    : `Em ${diff}d`;
    const tipoIcon = {
      contrato: '📋', calibracao: '⚖️', auditoria: '🔍', manual: '📌',
    }[l.tipo] || '📌';
    return `
      <article class="q-lembrete-card q-lembrete-${estado}">
        <div class="q-lembrete-head">
          <div class="q-lembrete-titulo">${tipoIcon} <strong>${escapeHtml(l.titulo)}</strong></div>
          <span class="q-lembrete-flag q-flag-${estado}">${flagTxt}</span>
        </div>
        <div class="q-meta">Tipo: ${l.tipo} · Alvo: ${fmtDate(l.data_alvo)} ${l.hospital ? '· ' + escapeHtml(l.hospital) : ''}</div>
        ${l.descricao ? `<div class="q-meta">${escapeHtml(l.descricao)}</div>` : ''}
        ${l.recorrente ? `<div class="q-meta" style="color:#3b82f6">↻ Recorrente a cada ${l.recorrencia_dias} dias</div>` : ''}
        <div class="q-card-actions">
          ${!l.concluido ? `<button class="btn btn-sm btn-primary" data-qlembrete-action="check" data-id="${l.id}">Concluir</button>` : ''}
          <button class="btn btn-sm" data-qlembrete-action="edit" data-id="${l.id}">Editar</button>
          <button class="btn btn-sm btn-ghost" data-qlembrete-action="delete" data-id="${l.id}">Excluir</button>
        </div>
      </article>`;
  }

  async function render() {
    const root = $('#view-lembretes-q');
    if (!root) return;
    bindGlobal();
    const all = await carregar();
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const grupos = {
      atrasados: all.filter(l => !l.concluido && new Date(l.data_alvo) < hoje),
      proximos: all.filter(l => !l.concluido && new Date(l.data_alvo) >= hoje && new Date(l.data_alvo) <= new Date(hoje.getTime() + 14*86400000)),
      futuros: all.filter(l => !l.concluido && new Date(l.data_alvo) > new Date(hoje.getTime() + 14*86400000)),
      concluidos: all.filter(l => l.concluido),
    };
    const COLUNAS = [
      { k: 'atrasados', label: 'Atrasados', accent: '#ef4444', items: grupos.atrasados },
      { k: 'proximos', label: 'Próximos (14 dias)', accent: '#eab308', items: grupos.proximos },
      { k: 'futuros', label: 'Futuros', accent: '#3b82f6', items: grupos.futuros },
      { k: 'concluidos', label: 'Concluídos', accent: '#22c55e', items: grupos.concluidos },
    ];
    root.innerHTML = `
      <div class="q-lembrete-toolbar">
        <h2>Lembretes & Notificações</h2>
        <button class="btn btn-primary" data-qlembrete-action="new">+ Novo Lembrete</button>
      </div>
      <div class="q-lembrete-grid">
        ${COLUNAS.map(c => `
          <section class="q-lembrete-col">
            <header style="border-left:4px solid ${c.accent}">
              <h3>${c.label}</h3><span class="q-col-count">${c.items.length}</span>
            </header>
            <div class="q-col-body">
              ${c.items.map(lembreteCard).join('') || '<div class="q-empty">Nenhum</div>'}
            </div>
          </section>`).join('')}
      </div>`;
  }

  VIEWS.register('lembretes-q', {
    title: 'Lembretes',
    render,
    refresh: render,
  });
})();
