/* =========================================================
   TELA 4 — Relatórios do Mês + Integração Financeira
   Filtros por período/cliente e exportação para o financeiro.
   ========================================================= */
(() => {
  function getRange() {
    const periodo = $('#repPeriodo').value;
    const now = new Date();
    if (periodo === 'atual') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
    if (periodo === 'anterior') return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
    const f = $('#repFrom').value ? new Date($('#repFrom').value) : new Date(now.getFullYear(), 0, 1);
    const t = $('#repTo').value ? new Date($('#repTo').value + 'T23:59:59') : now;
    return { from: f, to: t };
  }

  function filtered() {
    const { from, to } = getRange();
    const cliente = $('#repCliente').value;
    return DB.getPropostas().filter(p => {
      const d = new Date(p.atualizadoEm);
      if (d < from || d > to) return false;
      if (cliente && p.cliente !== cliente) return false;
      return true;
    });
  }

  function populateClientes() {
    const sel = $('#repCliente');
    const cur = sel.value;
    const clientes = [...new Set(DB.getPropostas().map(p => p.cliente))].sort();
    sel.innerHTML = '<option value="">Todos</option>' + clientes.map(c => `<option>${escapeHtml(c)}</option>`).join('');
    sel.value = cur;
  }

  function render() {
    populateClientes();
    const list = filtered();
    const ganhas = list.filter(p => p.status === 'ganho');
    const totalAprovado = ganhas.reduce((s, p) => s + DB.totalProposta(p), 0);

    $('#repTotalAprovado').textContent = BRL(totalAprovado);
    $('#repQtdGanhas').textContent = ganhas.length;
    $('#repTicket').textContent = BRL(ganhas.length ? totalAprovado / ganhas.length : 0);

    const body = $('#repBody');
    body.innerHTML = '';
    const ordenadas = [...list].sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));
    if (!ordenadas.length) { body.innerHTML = '<tr class="empty-row"><td colspan="6">Sem negócios ganhos no período selecionado.</td></tr>'; return; }
    ordenadas.forEach(p => {
      const st = DB.STATUS[p.status] || {};
      const tr = el('tr');
      tr.innerHTML = `
        <td class="mono">${escapeHtml(p.id)}</td>
        <td><strong>${escapeHtml(p.cliente)}</strong></td>
        <td>${escapeHtml(p.categoria || '—')}</td>
        <td class="mono">${fmtDate(p.atualizadoEm)}</td>
        <td><span class="badge ${st.badge}">${st.label}</span></td>
        <td class="mono">${BRL(DB.totalProposta(p))}</td>`;
      body.appendChild(tr);
    });
  }

  function enviarFinanceiro() {
    const ganhas = filtered().filter(p => p.status === 'ganho');
    if (!ganhas.length) { toast('Nenhuma venda aprovada no período'); return; }
    const total = ganhas.reduce((s, p) => s + DB.totalProposta(p), 0);
    const { from, to } = getRange();

    let txt = '';
    txt += '====================================================\n';
    txt += "  METROLAB'S — RESUMO PARA O FINANCEIRO\n";
    txt += '====================================================\n';
    txt += `Período: ${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}\n`;
    txt += `Cliente: ${$('#repCliente').value || 'Todos'}\n`;
    txt += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    txt += '----------------------------------------------------\n\n';
    ganhas.forEach((p, i) => {
      txt += `${i + 1}. ${p.id} | ${p.cliente}\n`;
      txt += `   Categoria: ${p.categoria} | Fechamento: ${fmtDate(p.atualizadoEm)}\n`;
      txt += `   Pagamento: ${p.pagamento || '—'}\n`;
      p.itens.forEach(it => { txt += `      - ${it.qtd}x ${it.nome} = ${BRL(it.preco * it.qtd)}\n`; });
      txt += `   >>> VALOR FATURAR: ${BRL(DB.totalProposta(p))}\n\n`;
    });
    txt += '----------------------------------------------------\n';
    txt += `TOTAL A FATURAR: ${BRL(total)}  (${ganhas.length} propostas)\n`;
    txt += '====================================================\n';

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financeiro_${from.toISOString().slice(0, 7)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Resumo financeiro exportado — ${BRL(total)}`);
  }

  function openBackup() {
    const box = el('div');
    box.innerHTML = `
      <p style="color:var(--text-2);font-size:13px;margin-bottom:12px">
        <strong>Colar Texto do Backup</strong> — cole abaixo o JSON bruto do <strong>duocrm-quotes</strong>
        (Ctrl+V) e clique em <strong>Confirmar Importação</strong>. A página será recarregada automaticamente
        para exibir seus cards reais.
      </p>
      <label class="field full">
        <span>Texto do backup (JSON)</span>
        <textarea id="bkText" style="min-height:220px;font-family:monospace;font-size:12px" placeholder='Cole aqui o conteúdo copiado do seu Bloco de Notas...'></textarea>
      </label>
      <div class="modal-actions">
        <button class="btn btn-primary" id="bkImport">✅ Confirmar Importação</button>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:20px 0 16px">
      <p style="color:var(--text-3);font-size:12px;margin-bottom:10px">
        Precisa de uma cópia de segurança dos dados atuais? Exporte abaixo.
      </p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="bkDownload"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-10M5 21h14"/></svg>Baixar .json</button>
        <button class="btn btn-outline" id="bkCopy"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copiar dados atuais</button>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:20px 0 16px">
      <p style="color:var(--text-2);font-size:13px;margin-bottom:6px">
        <strong>Importar de CSV</strong> — selecione um arquivo .csv com as colunas:
        <code style="font-size:11px">id, cliente, contato, categoria, status, validade, prazo, pagamento, item_nome, item_qtd, item_preco</code>
      </p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label class="btn btn-outline btn-sm" style="cursor:pointer">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg> Selecionar .csv
          <input type="file" id="csvFile" accept=".csv" style="display:none">
        </label>
        <span id="csvFileName" style="color:var(--text-3);font-size:12px"></span>
      </div>`;
    Modal.open('Importar / Exportar Backup', box);

    const ta = $('#bkText');
    setTimeout(() => ta.focus(), 50);

    $('#bkDownload').addEventListener('click', () => {
      const blob = new Blob([DB.exportBackup()], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup_propostas_${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(a.href);
      toast('Backup baixado');
    });
    $('#bkCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(DB.exportBackup()); toast('Dados atuais copiados'); }
      catch (_) { toast('Não foi possível copiar automaticamente'); }
    });
    $('#bkImport').addEventListener('click', () => {
      const txt = ta.value.trim();
      if (!txt) { toast('Cole o conteúdo do backup primeiro'); ta.focus(); return; }
      if (!confirm('Confirmar importação? Isso substituirá as propostas atualmente carregadas e recarregará a página.')) return;
      try {
        const n = DB.importBackup(txt);
        toast(`${n} propostas importadas — recarregando...`);
        // Ponto 2: força recarga para renderizar os cards reais imediatamente.
        setTimeout(() => window.location.reload(), 400);
      } catch (err) { alert(err.message); }
    });
    // Importar CSV
    const csvInput = $('#csvFile');
    if (csvInput) {
      csvInput.addEventListener('change', () => {
        const file = csvInput.files && csvInput.files[0];
        if (!file) return;
        $('#csvFileName').textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!confirm('Confirmar importação de "' + file.name + '"? Isso substituirá as propostas atuais e recarregará a página.')) return;
          try {
            const n = DB.importCsv(e.target.result);
            toast(n + ' propostas importadas via CSV — recarregando...');
            setTimeout(() => window.location.reload(), 400);
          } catch (err) { alert(err.message); }
        };
        reader.readAsText(file);
      });
    }
  }

  function init() {
    const repBackup = $('#repBackup');
    const repPeriodo = $('#repPeriodo');
    const repAplicar = $('#repAplicar');
    const repCliente = $('#repCliente');
    const repFinanceiro = $('#repFinanceiro');
    if (repBackup) repBackup.addEventListener('click', openBackup);
    if (repPeriodo) repPeriodo.addEventListener('change', () => {
      const custom = repPeriodo.value === 'custom';
      const fromWrap = $('#repFromWrap');
      const toWrap = $('#repToWrap');
      if (fromWrap) fromWrap.style.display = custom ? '' : 'none';
      if (toWrap) toWrap.style.display = custom ? '' : 'none';
      render();
    });
    if (repAplicar) repAplicar.addEventListener('click', render);
    if (repCliente) repCliente.addEventListener('change', render);
    if (repFinanceiro) repFinanceiro.addEventListener('click', enviarFinanceiro);
  }

  VIEWS.register('relatorios', { init, render });
})();
