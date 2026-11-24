/* =========================================================
   Catálogo — CRUD de produtos/serviços (banco local)
   ========================================================= */
(() => {
  let filtro = '';
  function render() {
    const body = $('#produtosBody');
    const todos = DB.getProdutos();
    const prods = filtro
      ? todos.filter(p => (p.nome || '').toLowerCase().includes(filtro.toLowerCase()))
      : todos;
    body.innerHTML = '';
    if (!prods.length) { body.innerHTML = '<tr class="empty-row"><td colspan="6">' + (filtro ? 'Nenhum produto encontrado para "' + escapeHtml(filtro) + '".' : 'Cadastre produtos e serviços para compor propostas.') + '</td></tr>'; return; }
    prods.forEach(p => {
      const tr = el('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <img src="${p.foto}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid var(--border)">
            <strong>${escapeHtml(p.nome)}</strong>
          </div>
        </td>
        <td><span class="badge badge-enviada">${escapeHtml(p.categoria)}</span></td>
        <td class="mono" title="${p.custo > 0 ? 'Custo: ' + BRL(p.custo) + ' / Margem: 30%' : 'Custo não confirmado'}">${BRL(p.preco)}${p.preco <= 0 ? ' <span class="badge badge-preco-definir" title="Preço ainda não definido">⚠ Preço a definir</span>' : (p.custo <= 0 ? ' <span class="badge badge-preco-definir" title="Custo não confirmado com fornecedor">⚠ Custo não confirmado</span>' : '')}</td>
        <td class="mono" style="color:var(--text-muted)">${p.custo > 0 ? BRL(p.custo) : '—'}</td>
        <td>${escapeHtml(p.fornecedor || '—')}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}">✕</button>
        </td>`;
      tr.querySelector('[data-edit]').addEventListener('click', () => openForm(p));
      tr.querySelector('[data-del]').addEventListener('click', () => {
        if (confirm('Excluir "' + p.nome + '"?')) { DB.deleteProduto(p.id); render(); toast('Produto excluído'); }
      });
      body.appendChild(tr);
    });
  }

  function openForm(prod) {
    const p = prod || { nome: '', categoria: DB.CATEGORIAS[0], descricao: '', preco: '', custo: '', fornecedor: '', foto: '' };
    const box = el('div');
    box.innerHTML = `
      <div class="form-grid">
        <label class="field full"><span>Nome do produto/serviço</span><input id="pfNome" value="${escapeHtml(p.nome)}"></label>
        <label class="field"><span>Categoria</span><select id="pfCat">${DB.CATEGORIAS.map(c => `<option ${c === p.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Preço de Venda (R$)</span><input id="pfPreco" type="number" step="0.01" value="${p.preco}"></label>
        <label class="field"><span>Custo (R$)</span><input id="pfCusto" type="number" step="0.01" value="${p.custo ?? ''}"></label>
        <label class="field full"><span>Descrição técnica</span><textarea id="pfDesc">${escapeHtml(p.descricao)}</textarea></label>
        <label class="field"><span>Fornecedor</span><input id="pfForn" value="${escapeHtml(p.fornecedor || '')}"></label>
        <label class="field"><span>Foto (upload opcional)</span><input id="pfFoto" type="file" accept="image/*"></label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="pfCancel">Cancelar</button>
        <button class="btn btn-primary" id="pfSave">Salvar</button>
      </div>`;
    Modal.open(prod ? 'Editar Produto' : 'Novo Produto', box);

    let fotoData = p.foto;
    $('#pfFoto').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => fotoData = r.result; r.readAsDataURL(f);
    });
    $('#pfCancel').addEventListener('click', Modal.close);
    $('#pfSave').addEventListener('click', () => {
      const nome = $('#pfNome').value.trim();
      if (!nome) { toast('Informe o nome'); return; }
      const genPh = () => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='#F7F7F2'/><text x='100' y='105' font-family='Inter,Arial' font-size='14' fill='#1A1265' text-anchor='middle'>${escapeHtml(nome).slice(0,16)}</text></svg>`);
      DB.upsertProduto({
        id: p.id, nome, categoria: $('#pfCat').value,
        descricao: $('#pfDesc').value.trim(),
        preco: parseFloat($('#pfPreco').value) || 0,
        custo: parseFloat($('#pfCusto').value) || 0,
        fornecedor: $('#pfForn').value.trim(),
        foto: fotoData || genPh(),
      });
      Modal.close(); render();
      const g = VIEWS.get('gerador'); if (g) g.render();
      toast('Produto salvo');
    });
  }

  function init() {
    const addBtn = $('#prodAddBtn');
    if (addBtn) addBtn.addEventListener('click', () => openForm(null));
    const inp = $('#prodBusca');
    if (inp) {
      inp.addEventListener('input', () => { filtro = inp.value.trim(); render(); });
      const form = $('#prodSearchForm');
      const btn = form ? form.querySelector('.search-btn') : null;
      if (form) form.addEventListener('submit', (e) => { e.preventDefault(); filtro = inp.value.trim(); render(); });
      if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); inp.focus(); });
    }
  }

  VIEWS.register('produtos', { init, render });
})();
