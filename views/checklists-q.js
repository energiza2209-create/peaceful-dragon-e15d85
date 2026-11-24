/* =========================================================
   TELA — Checklists Dinâmicos de Qualidade (Módulo Qualidade)
   - Templates por tipo de equipamento (itens_entrada, itens_saida)
   - Respostas preenchidas + assinatura digital (hash SHA-256)
   - Equipamento só vira "liberado" ao assinar o Checklist de Saída.
   O trigger SQL (007) move a O.S. para "liberado" quando a saída é
   assinada (assinatura_ts != null + aprovado true).
   ========================================================= */
(() => {
  let bound = false;

  function bindGlobal() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', async (e) => {
      const op = e.target.closest('[data-qcheck-action]');
      if (!op) return;
      const a = op.dataset.qcheckAction;
      try {
        const osId = op.dataset.osId;
        const tipo = op.dataset.tipo; // 'entrada' | 'saida'
        const tplId = op.dataset.tplId;
        if (a === 'fill-checklist') await abrirPreenchimento(osId, tipo);
        else if (a === 'new-template') await abrirTemplateEmpty();
        else if (a === 'edit-template') await abrirTemplateEdicao(tplId);
        else if (a === 'sign') await assinarEsalvar(osId, tipo);
      } catch (err) {
        if (typeof logger !== 'undefined' && logger.error) logger.error('checklists.action.fail', err);
        else console.error(err);
        toast('Erro na operação de checklist', 'error');
      }
    });
    document.addEventListener('change', async (e) => {
      const t = e.target.closest('[data-qcheck-item]');
      if (!t) return;
      recomputeAprovadoVisibility();
    });
  }

  function recomputeAprovadoVisibility() {
    // mostra botão "Assinar" só se todos itens obrigatórios estiverem respondidos
    const root = $('#modalBody');
    if (!root) return;
    const itens = root.querySelectorAll('[data-qcheck-item]');
    let allFilled = true;
    itens.forEach(i => {
      const obrigatorio = i.dataset.required === 'true';
      if (!obrigatorio) return;
      const inputs = i.querySelectorAll('input[type=checkbox], input[type=text], textarea');
      inputs.forEach(inp => {
        const v = inp.type === 'checkbox' ? inp.checked : (inp.value || '').trim();
        if (!v) allFilled = false;
      });
    });
    const btn = root.querySelector('[data-qcheck-action="sign"]');
    if (btn) {
      if (allFilled) { btn.removeAttribute('disabled'); btn.classList.add('btn-primary'); }
      else { btn.setAttribute('disabled', ''); btn.classList.remove('btn-primary'); }
    }
  }

  async function abrirPreenchimento(osId, tipo) {
    const supa = QDB.raw();
    if (!supa) return toast('Banco indisponível', 'warn');
    const { data: os } = await supa.from('auvo_os').select('*').eq('id', osId).single();
    if (!os) return toast('O.S. não encontrada', 'error');
    // escolhe template por tipo_equipamento do OS (fallback: primeiro template ativo)
    let { data: tpl } = await supa.from('checklist_templates')
      .select('*').eq('tipo_equipamento', os.equipamento_id || '').eq('ativo', true).limit(1).single();
    if (!tpl) {
      const { data: anyTpl } = await supa.from('checklist_templates')
        .select('*').eq('ativo', true).limit(1);
      tpl = anyTpl && anyTpl[0];
    }
    if (!tpl) return toast('Nenhum template cadastrado para este equipamento. Crie um template primeiro.', 'warn');
    const itensArr = tipo === 'entrada' ? (tpl.itens_entrada || []) : (tpl.itens_saida || []);

    const body = el('div', 'q-form');
    body.innerHTML = `
      <div class="q-checklist-info">
        <div><strong>O.S.:</strong> #${escapeHtml(os.numero || os.id)}</div>
        <div><strong>Equipamento:</strong> ${escapeHtml(os.equipamento_desc || '—')}</div>
        <div><strong>Tipo:</strong> ${tipo === 'entrada' ? 'Checklist de Entrada' : 'Checklist de Saída'}</div>
      </div>
      <div class="q-form-items" id="qFormItems">
        ${itensArr.map((it, i) => renderItem(it, i)).join('') || '<div class="q-empty">Template vazio</div>'}
      </div>
      <div class="q-assinatura">
        <label class="field"><span>Senha / confirmação de assinatura (e-mail do coordenador)</span>
          <input id="ckSignEmail" type="email" placeholder="seu.email@hospital" /></label>
        <button class="btn btn-primary" data-qcheck-action="sign" data-os-id="${osId}" data-tipo="${tipo}" disabled>Assinar e liberar</button>
      </div>`;

    Modal.open(`Checklist de ${tipo === 'entrada' ? 'Entrada' : 'Saída'}`, body);
    // Estado em window para o handler de assinatura
    window._qcheckContext = { osId, tipo, templateId: tpl.id };
    recomputeAprovadoVisibility();
  }

  function renderItem(it, idx) {
    const label = escapeHtml(it.label || `Item ${idx + 1}`);
    const obrigatorio = it.obrigatorio;
    const tipo = it.tipo || 'check'; // check | text | textarea
    const fieldId = `qItem_${idx}`;
    let inputHtml = '';
    if (tipo === 'text') inputHtml = `<input type="text" id="${fieldId}" placeholder="Resposta..." />`;
    else if (tipo === 'textarea') inputHtml = `<textarea id="${fieldId}" rows="2" placeholder="Resposta..."></textarea>`;
    else inputHtml = `<label class="q-switch"><input type="checkbox" id="${fieldId}" /><span></span></label>`;
    return `
      <div class="q-checklist-item" data-qcheck-item="1" data-required="${obrigatorio ? 'true' : 'false'}">
        <div class="q-item-label">
          <strong>${label}</strong>
          ${obrigatorio ? '<span class="q-req">*</span>' : ''}
        </div>
        <div class="q-item-input">${inputHtml}</div>
      </div>`;
  }

  async function assinarEsalvar(osId, tipo) {
    const ctx = window._qcheckContext;
    if (!ctx) return;
    const email = $('#ckSignEmail')?.value.trim();
    if (!email) return toast('Informe seu e-mail para assinar', 'warn');
    // Coleta respostas
    const root = $('#modalBody');
    const items = root.querySelectorAll('[data-qcheck-item]');
    const respostas = {};
    items.forEach((item) => {
      const inputs = item.querySelectorAll('input[type=checkbox], input[type=text], textarea');
      inputs.forEach(inp => {
        const v = inp.type === 'checkbox' ? inp.checked : inp.value;
        // Usa o id do input como chave
        respostas[inp.id.replace('qItem_', '')] = v;
      });
    });
    const ts = new Date().toISOString();
    // Hash SHA-256 osId|email|ts|JSON(respostas)
    const enc = new TextEncoder().encode(`${osId}|${email}|${ts}|${JSON.stringify(respostas)}`);
    let hash;
    if (window.crypto && window.crypto.subtle) {
      const digest = await window.crypto.subtle.digest('SHA-256', enc);
      hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // fallback simples se crypto.subtle não existir (HTTP sem TLS)
      hash = 'no-crypto-' + Math.random().toString(36).slice(2);
    }
    const supa = QDB.raw();
    if (!supa) return toast('Banco indisponível', 'warn');
    const { data: user } = await supa.auth.getUser();
    const patch = {
      os_id: osId,
      template_id: ctx.templateId,
      tipo,
      respostas,
      aprovado: true,
      observacao: null,
      assinatura_email: email,
      assinatura_ts: ts,
      assinatura_hash: hash,
      criado_por: user?.user?.id || null,
    };
    const { error } = await supa.from('checklist_respostas').insert(patch);
    if (error) {
      toast('Erro ao salvar checklist: ' + error.message, 'error');
      return;
    }
    if (typeof logger !== 'undefined' && logger.audit) logger.audit('checklist.assinar', { osId, tipo, email, hash: hash.slice(0,16) });
    Modal.close();
    toast(tipo === 'saida'
      ? 'Checklist de Saída assinado — equipamento liberado ✅'
      : 'Checklist de Entrada registrado', 'success');
    render();
  }

  // ----- CRUD Templates -----
  async function abrirTemplateEmpty() {
    const body = el('div', 'q-form');
    body.innerHTML = `
      <label class="field"><span>Nome do template</span><input id="tplNome" placeholder="Ex: Monitor Multiparâmetro" /></label>
      <label class="field"><span>Tipo de equipamento</span><input id="tplTipo" placeholder="Ex: MON-MULTI ou equipamento_id" /></label>
      <label class="field"><span>Itens de Entrada (um por linha)</span><textarea id="tplEntrada" rows="6" placeholder="Estado físico|[text|textarea]&#10;Cabos|*&#10;Avarias">*</textarea></label>
      <label class="field"><span>Itens de Saída</span><textarea id="tplSaida" rows="6" placeholder="Testes realizados|*&#10;Lacre colado|*&#10;Relatório emitido|*">*</textarea></label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary" id="tplSave">Salvar template</button>
        <button class="btn" id="tplCancel">Cancelar</button>
      </div>
      <p class="q-meta">Formato: <code>label|*|tipo</code>. <code>*</code> = obrigatório. <code>tipo</code> = text/textarea/check (default).</p>`;
    Modal.open('Novo Template de Checklist', body);
    $('#tplCancel').onclick = Modal.close;
    $('#tplSave').onclick = async () => {
      const nome = $('#tplNome').value.trim();
      const tipoEq = $('#tplTipo').value.trim();
      const itens_entrada = parseItens($('#tplEntrada').value);
      const itens_saida = parseItens($('#tplSaida').value);
      if (!nome || !tipoEq) return toast('Nome e tipo são obrigatórios', 'warn');
      const supa = QDB.raw();
      if (supa) {
        const { error } = await supa.from('checklist_templates').insert({ nome, tipo_equipamento: tipoEq, itens_entrada, itens_saida });
        if (error) return toast('Erro: ' + error.message, 'error');
      }
      Modal.close();
      toast('Template salvo', 'success');
      render();
    };
  }

  async function abrirTemplateEdicao(tplId) {
    const supa = QDB.raw();
    if (!supa) return;
    const { data: tpl } = await supa.from('checklist_templates').select('*').eq('id', tplId).single();
    if (!tpl) return;
    const body = el('div', 'q-form');
    body.innerHTML = `
      <label class="field"><span>Nome</span><input id="tplNome" value="${escapeHtml(tpl.nome)}" /></label>
      <label class="field"><span>Tipo de equipamento</span><input id="tplTipo" value="${escapeHtml(tpl.tipo_equipamento)}" /></label>
      <label class="field"><span>Itens de Entrada</span><textarea id="tplEntrada" rows="6">${itensToText(tpl.itens_entrada)}</textarea></label>
      <label class="field"><span>Itens de Saída</span><textarea id="tplSaida" rows="6">${itensToText(tpl.itens_saida)}</textarea></label>
      <label class="field" style="flex-direction:row; align-items:center; gap:6px">
        <input type="checkbox" id="tplAtivo" ${tpl.ativo ? 'checked' : ''}/> Ativo
      </label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary" id="tplSave">Salvar</button>
        <button class="btn btn-ghost" id="tplDelete" style="color:var(--danger,#ef4444)">Excluir</button>
        <button class="btn" id="tplCancel">Cancelar</button>
      </div>`;
    Modal.open('Editar Template', body);
    $('#tplCancel').onclick = Modal.close;
    $('#tplSave').onclick = async () => {
      const patch = {
        nome: $('#tplNome').value.trim(),
        tipo_equipamento: $('#tplTipo').value.trim(),
        itens_entrada: parseItens($('#tplEntrada').value),
        itens_saida: parseItens($('#tplSaida').value),
        ativo: $('#tplAtivo').checked,
        atualizado_em: new Date().toISOString(),
      };
      const { error } = await supa.from('checklist_templates').update(patch).eq('id', tplId);
      if (error) return toast('Erro: ' + error.message, 'error');
      Modal.close();
      toast('Template atualizado', 'success');
      render();
    };
    $('#tplDelete').onclick = async () => {
      if (!confirm('Excluir template?')) return;
      await supa.from('checklist_templates').delete().eq('id', tplId);
      Modal.close();
      toast('Template excluído', 'warn');
      render();
    };
  }

  function parseItens(texto) {
    return (texto || '').split('\n').map(l => l.trim()).filter(Boolean).map(linha => {
      const parts = linha.split('|');
      const label = (parts[0] || '').trim();
      const obrigatorio = parts.includes('*');
      let tipo = parts.find(p => ['text', 'textarea', 'check'].includes(p)) || 'check';
      return { label, obrigatorio, tipo };
    });
  }
  function itensToText(arr) {
    return (arr || []).map(it => `${it.label}${it.obrigatorio ? '|' + '*' : ''}${it.tipo && it.tipo !== 'check' ? '|' + it.tipo : ''}`).join('\\n');
  }

  // ----- Render principal -----
  async function render() {
    const root = $('#view-checklists-q');
    if (!root) return;
    bindGlobal();
    const supa = QDB.raw();

    // Templates (sidebar)
    let templates = [];
    if (supa) {
      const { data } = await supa.from('checklist_templates').select('*').order('nome');
      templates = data || [];
    }

    // O.S. em liberação_qualidade
    let liberacoesList = [];
    if (supa) {
      const { data } = await supa.from('auvo_os').select('id,numero,equipamento_desc,equipamento_id,setor,sla_estado,etapa_atual_desde').eq('status', 'liberacao_qualidade');
      liberacoesList = data || [];
    }

    // Checklist preenchidos recentemente
    let preenchidos = [];
    if (supa) {
      const { data } = await supa.from('checklist_respostas').select('id,os_id,tipo,assinatura_email,assinatura_ts,aprovado,criado_em').order('criado_em', { ascending: false }).limit(15);
      preenchidos = data || [];
    }

    root.innerHTML = `
      <div class="q-checklist-grid">
        <section class="q-checklist-templates">
          <header><h2>Templates de Checklist</h2>
            <button class="btn btn-sm btn-primary" data-qcheck-action="new-template">+ Novo</button>
          </header>
          <div class="q-col-body">
            ${templates.map(t => `
              <div class="q-template-card" data-qcheck-action="edit-template" data-tpl-id="${t.id}" style="cursor:pointer">
                <strong>${escapeHtml(t.nome)}</strong>
                <span class="q-meta">Tipo: ${escapeHtml(t.tipo_equipamento)} · ${t.ativo ? 'Ativo' : 'Inativo'} · ${(t.itens_entrada || []).length}+${(t.itens_saida || []).length} itens</span>
              </div>`).join('') || '<div class="q-empty">Nenhum template</div>'}
          </div>
        </section>

        <section class="q-checklist-liberar">
          <header><h2>Aguardando Liberação</h2><span class="q-col-count">${liberacoesList.length}</span></header>
          <div class="q-col-body">
            ${liberacoesList.map(o => `
              <article class="q-liberar-card">
                <div><strong>#${escapeHtml(o.numero || o.id)}</strong> ${escapeHtml(o.equipamento_desc || '—')}</div>
                <div class="q-meta">${escapeHtml(o.setor || '—')} · SLA: ${o.sla_estado || '—'} · desde ${fmtDate(o.etapa_atual_desde)}</div>
                <div class="q-card-actions">
                  <button class="btn btn-sm" data-qcheck-action="fill-checklist" data-os-id="${o.id}" data-tipo="entrada">Checklist Entrada</button>
                  <button class="btn btn-sm btn-primary" data-qcheck-action="fill-checklist" data-os-id="${o.id}" data-tipo="saida">Assinar Saída ✍️</button>
                </div>
              </article>`).join('') || '<div class="q-empty">Nenhuma O.S. aguardando liberação</div>'}
          </div>
        </section>

        <section class="q-checklist-historico">
          <header><h2>Assinaturas Recentes</h2></header>
          <div class="q-col-body">
            ${preenchidos.map(r => `
              <div class="q-history-row q-history-${r.tipo}">
                <strong>${r.tipo === 'entrada' ? 'Entrada' : 'Saída'} #${escapeHtml(r.os_id || '—')}</strong>
                <span class="q-meta">${escapeHtml(r.assinatura_email || '—')} · ${r.assinatura_ts ? fmtDate(r.assinatura_ts) : '—'}</span>
                ${r.aprovado ? '<span class="q-mini-badge">aprovado</span>' : ''}
              </div>`).join('') || '<div class="q-empty">Sem assinaturas</div>'}
          </div>
        </section>
      </div>`;
  }

  VIEWS.register('checklists-q', {
    title: 'Checklists de Qualidade',
    render,
    refresh: render,
  });
})();
