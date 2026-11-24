/* =========================================================
   TELA 3 — Gerador de Propostas (templates locais, sem IA/API)
   Autopreenchimento por catálogo, upload de foto e PDF comercial.
   Exposto como window.Proposta para uso pelo Kanban.
   ========================================================= */
(() => {
  // Identidade do PDF: sempre impresso sob a marca METROLABS (modelo executivo).
  // Paleta institucional (Azul Marinho Corporativo + Verde Clínico Vibrante) usada
  // EXCLUSIVAMENTE nos documentos de impressão (PDFs) — nunca na interface do CRM.
  const EMPRESA = {
    marca: 'METROLAB’S SOLUÇÕES EM ENGENHARIA CLÍNICA',
    subtitulo: 'Engenharia Clínica e Soluções',
    cnpj: '32.487.278/0001-21',
    endereco: 'Rua C 155, Nº 789, Quadra 365, Lote 08, Jardim América, Goiânia - GO | CEP: 74.275-150',
    email: 'matheus.godoi@metrolabs.com.br',
    // Cabeçalho corporativo (lado direito) — bloco padronizado e limpo
    corp: [
      'METROLAB’S SOLUÇÕES EM ENGENHARIA CLÍNICA',
      'CNPJ: 32.487.278/0001-21',
      'Rua C 155, Nº 789, Qd 365, Lt 08 — Jardim América, Goiânia - GO',
      'CEP: 74.275-150 | matheus.godoi@metrolabs.com.br',
    ],
    assinaturaEsq: 'Matheus - Depto. Comercial Técnico / Metrolabs',
    assinaturaDir: 'Validação do Cliente - Assinatura, Data e Carimbo Institucional',
    // Cores institucionais (só para os PDFs)
    CORP_DARK: [15, 23, 42],     // Azul Marinho Corporativo  #0f172a
    CORP_BLUE: [2, 132, 199],    // Azul de destaque           #0284c7
    CLIN_GREEN: [34, 197, 94],   // Verde Clínico Vibrante     #22c55e
  };

  let itens = [];        // itens da proposta em construção
  let fotoManual = null; // dataURL de upload manual (aplica ao próximo item)
  let logoDataUrl = null; // dataURL do assets/logo.png (timbrado)
  let _savingFunil = false; // trava anti-duplo clique
  let _formSavedId = null; // id da proposta já salva a partir deste formulário (evita duplicar)

  // Formata CNPJ (aceita só dígitos ou mascarado).
  const fmtCnpj = (v) => { const s = String(v || '').replace(/\D/g, ''); return s.length === 14 ? s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : (v || '—'); };

  // Resolve CNPJ / e-mail / endereço do cliente da proposta.
  // Prioriza os dados salvos na proposta; senão busca o cliente cadastrado pelo nome.
  function dadosClienteProp(prop) {
    const list = DB.getClients() || [];
    const cl = list.find(c => c.name === prop.cliente) || list.find(c => (prop.cliente || '').includes(c.name || '###'));
    return {
      cnpj: prop.clienteCnpj || (cl && cl.cnpj) || '',
      email: prop.clienteEmail || (cl && cl.email) || '',
      endereco: prop.clienteEndereco || (cl && cl.address) || '',
    };
  }

  /* ---------- carrega logo do timbrado ---------- */
  function carregarLogo() {
    try {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try { logoDataUrl = c.toDataURL('image/png'); } catch (_) { logoDataUrl = null; }
      };
      img.onerror = () => { logoDataUrl = null; };
      img.src = 'assets/logo.png';
    } catch (_) { logoDataUrl = null; }
  }

  /* ---------- init ---------- */
  function init() {
    carregarLogo();
    const addItemBtn = $('#gpAddItem');
    const gpBusca = $('#gpBusca');
    const gpPhotoUpload = $('#gpPhotoUpload');
    const gpGerarPdf = $('#gpGerarPdf');
    const gpSalvarFunil = $('#gpSalvarFunil');
    const gpLimpar = $('#gpLimpar');
    if (addItemBtn) addItemBtn.addEventListener('click', addItem);
    if (gpBusca) {
      gpBusca.addEventListener('change', onSelectProduto);
      gpBusca.addEventListener('input', onSelectProduto);
    }
    if (gpPhotoUpload) gpPhotoUpload.addEventListener('change', onUpload);
    if (gpGerarPdf) gpGerarPdf.addEventListener('click', () => {
      if (!clienteSelecionado()) { toast('Selecione um cliente cadastrado (cadastrado na aba Clientes)'); return; }
      if (!itens.length) { toast('Adicione ao menos um item para gerar o PDF'); return; }
      // O orçamento gerado é SEMPRE salvo no funil automaticamente.
      const p = salvarDoFormulario();
      toast('Proposta ' + p.id + ' salva no funil');
      const f = VIEWS.get('funil'); if (f) f.render();
      const d = VIEWS.get('dashboard'); if (d) d.render();
      gerarPdf(p);
    });
    if (gpSalvarFunil) gpSalvarFunil.addEventListener('click', salvarFunil);
    if (gpLimpar) gpLimpar.addEventListener('click', limpar);
    // Ao escolher o cliente, autopreenche o contato com o comprador cadastrado
    const gpCliente = $('#gpCliente');
    if (gpCliente) gpCliente.addEventListener('change', () => {
      const cl = clienteSelecionado();
      if (cl) $('#gpContato').value = cl.comprador || '';
    });
    // A-11: desabilita botões sem permissão
    if (!Auth.can('propostas')) {
      if (gpSalvarFunil) { gpSalvarFunil.disabled = true; gpSalvarFunil.title = 'Sem permissão para criar propostas'; }
      if (addItemBtn) addItemBtn.disabled = true;
    }
  }

  function render() {
    // popular clientes cadastrados (aba Clientes)
    popularClientes();
    // popular categorias
    const sel = $('#gpCategoria');
    if (!sel.options.length) DB.CATEGORIAS.forEach(c => sel.appendChild(new Option(c, c)));
    // popular datalist de produtos
    const dl = $('#produtosList');
    dl.innerHTML = '';
    DB.getProdutos().forEach(p => dl.appendChild(new Option(`${p.nome} — ${BRL(p.preco)}`, p.nome)));
    renderItens();
  }

  // Preenche o select com os clientes já cadastrados (fonte única: aba Clientes).
  function popularClientes() {
    const sel = $('#gpCliente');
    if (!sel) return;
    const clientes = DB.getClients();
    const atual = sel.value;
    sel.innerHTML = '';
    if (!clientes.length) {
      sel.appendChild(new Option('— Nenhum cliente cadastrado (aba Clientes) —', ''));
      return;
    }
    sel.appendChild(new Option('— Selecione um cliente cadastrado —', ''));
    clientes.forEach(c => {
      const cnpj = (c.cnpj || '').replace(/\D/g, '');
      const cnpjTxt = cnpj.length === 14 ? cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '';
      sel.appendChild(new Option(c.name + (cnpjTxt ? ' · ' + cnpjTxt : ''), String(c.id)));
    });
    if (atual && clientes.some(c => String(c.id) === atual)) sel.value = atual;
  }

  function clienteSelecionado() {
    return DB.getClients().find(c => String(c.id) === String($('#gpCliente').value)) || null;
  }

  function findProduto(termo) {
    const t = (termo || '').split(' — ')[0].trim().toLowerCase();
    return DB.getProdutos().find(p => p.nome.toLowerCase() === t) ||
           DB.getProdutos().find(p => p.nome.toLowerCase().includes(t) && t.length > 2);
  }

  function onSelectProduto() {
    const p = findProduto($('#gpBusca').value);
    const box = $('#gpSelectedPreview');
    const img = $('#gpPhotoPreview');
    const ph = $('#gpPhotoPlaceholder');
    if (!p) { box.innerHTML = ''; return; }
    if (!fotoManual) {
      img.src = p.foto; img.classList.add('show'); ph.style.display = 'none';
    }
    if (p.categoria) $('#gpCategoria').value = p.categoria;
    box.innerHTML = `
      <div class="preview-chip">
        <img src="${p.foto}" alt="">
        <div>
          <strong>${escapeHtml(p.nome)}</strong>
          <p>${escapeHtml(p.descricao).slice(0, 90)}…</p>
          <span class="price">${BRL(p.preco)}</span>
        </div>
      </div>`;
  }

  function onUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      fotoManual = reader.result;
      const img = $('#gpPhotoPreview');
      img.src = fotoManual; img.classList.add('show');
      $('#gpPhotoPlaceholder').style.display = 'none';
      toast('Foto carregada — será usada no próximo item adicionado');
    };
    reader.readAsDataURL(file);
  }

  function addItem() {
    const p = findProduto($('#gpBusca').value);
    if (!p) { toast('Selecione um produto válido do catálogo'); return; }
    if (!p.preco || p.preco <= 0) {
      if (!confirm('Este item ainda não tem preço definido. Deseja continuar mesmo assim?')) return;
    } else if (!p.custo || p.custo <= 0) {
      if (!confirm('Este item ainda não tem custo confirmado com fornecedor — o preço de venda é uma referência de mercado. Deseja continuar mesmo assim?')) return;
    }
    const qtd = Math.max(1, parseInt($('#gpQtd').value) || 1);
    itens.push({
      produtoId: p.id, nome: p.nome, descricao: p.descricao, categoria: p.categoria,
      preco: p.preco, qtd, foto: fotoManual || p.foto, _new: true,
    });
    itens.forEach(it => { if (it !== itens[itens.length - 1]) delete it._new; });
    fotoManual = null;
    $('#gpBusca').value = ''; $('#gpQtd').value = 1;
    $('#gpSelectedPreview').innerHTML = '';
    renderItens();
    toast('Item adicionado');
  }

  function removeItem(i) { itens.splice(i, 1); renderItens(); }

  function renderItens() {
    const body = $('#gpItensBody');
    body.innerHTML = '';
    if (!itens.length) { body.innerHTML = '<tr class="empty-row"><td colspan="6">Busque um produto no catálogo e adicione itens à proposta.</td></tr>'; }
    else itens.forEach((it, i) => {
      const tr = el('tr');
      if (it._new) { tr.classList.add('gp-row-in'); delete it._new; }
      tr.innerHTML = `
        <td><strong>${escapeHtml(it.nome)}</strong></td>
        <td style="max-width:220px;color:var(--text-3);font-size:12px">${escapeHtml(it.descricao).slice(0, 70)}…</td>
        <td class="mono">${it.qtd}</td>
        <td class="mono">${BRL(it.preco)}</td>
        <td class="mono">${BRL(it.preco * it.qtd)}</td>
        <td><button class="btn btn-danger btn-sm" data-i="${i}">✕</button></td>`;
      tr.querySelector('button').addEventListener('click', () => removeItem(i));
      body.appendChild(tr);
    });
    $('#gpTotal').textContent = BRL(itens.reduce((s, it) => s + it.preco * it.qtd, 0));
  }

  function buildProposta() {
    const item0 = itens[0] || {};
    const cl = clienteSelecionado();
    return {
      cliente: cl ? cl.name : '',
      clienteCnpj: cl ? (cl.cnpj || '') : '',
      clienteEmail: cl ? (cl.email || '') : '',
      clienteEndereco: cl ? (cl.address || '') : '',
      cotacaoNum: $('#gpCotacaoNum').value.trim(),
       contato: $('#gpContato').value.trim(),
       categoria: $('#gpCategoria').value,
      validade: $('#gpValidade').value.trim(),
      prazo: $('#gpPrazo').value.trim(),
      pagamento: $('#gpPagamento').value.trim(),
      itens: JSON.parse(JSON.stringify(itens)),
      foto_produto: item0.foto || '',
      descricao_tecnica: item0.descricao || '',
      status: 'aberto',
    };
  }

  // Salva (ou atualiza, se já foi salva) a proposta do formulário no funil.
  // Sempre retorna o registro persistido — o orçamento nunca fica sem salvar.
  function salvarDoFormulario() {
    const prop = buildProposta();
    if (_formSavedId) {
      const existente = DB.getPropostas().find(x => x.id === _formSavedId);
      if (existente) {
        DB.updateProposta(_formSavedId, {
          itens: prop.itens, cotacaoNum: prop.cotacaoNum, contato: prop.contato,
          clienteCnpj: prop.clienteCnpj, clienteEmail: prop.clienteEmail, clienteEndereco: prop.clienteEndereco,
        });
        return DB.getPropostas().find(x => x.id === _formSavedId) || prop;
      }
    }
    const p = DB.addProposta(prop);
    _formSavedId = p.id;
    return p;
  }

  function salvarFunil() {
    if (_savingFunil) return;
    if (!clienteSelecionado()) { toast('Selecione um cliente cadastrado (aba Clientes) — não é possível salvar sem cliente'); return; }
    if (!itens.length) { toast('Adicione ao menos um item'); return; }
    _savingFunil = true;
    const btn = $('#gpSalvarFunil');
    if (btn) btn.disabled = true;
    try {
      const p = salvarDoFormulario();
      toast('Proposta ' + p.id + ' salva no funil');
      if (!($('#gpCotacaoNum').value || '').trim()) toast('Lembrete: associe o nº da cotação do portal do cliente');
      limpar();
      const f = VIEWS.get('funil'); if (f) f.render();
      const d = VIEWS.get('dashboard'); if (d) d.render();
    } finally {
      _savingFunil = false;
      if (btn) btn.disabled = false;
    }
  }

  function limpar() {
    itens = []; fotoManual = null; _formSavedId = null;
    ['gpCliente', 'gpContato', 'gpCotacaoNum'].forEach(id => $('#' + id).value = '');
    $('#gpBusca').value = '';
    $('#gpSelectedPreview').innerHTML = '';
    $('#gpPhotoPreview').classList.remove('show');
    $('#gpPhotoPlaceholder').style.display = '';
    renderItens();
  }

  /* ---------- MOTOR DE PDF EXECUTIVO — MODELO METROLABS (A4) ---------- */
  /* Gera DOIS arquivos independentes: Proposta Técnica e Proposta Comercial.
     Cada PDF usa fluxo natural (autoTable com border-collapse e linebreak),
     sem alturas fixas rígidas, evitando sobreposição de texto. */

  function gerarPdf(prop, modo, comDescricao) {
    if (!window.jspdf) { toast('Biblioteca de PDF não carregou. Recarregue a página.'); return; }
    if (!prop || !prop.itens || !prop.itens.length) { toast('Adicione ao menos um item para gerar o PDF'); return; }
    const m = modo || 'ambas';
    try {
      if (m === 'tecnica' || m === 'ambas') gerarTecnica(prop);
      if (m === 'comercial' || m === 'ambas') {
        if (typeof (new window.jspdf.jsPDF()).autoTable !== 'function') {
          toast('Plugin de tabela (autoTable) não carregou. Recarregue a página.'); return;
        }
        gerarComercial(prop, comDescricao);
      }
      const lbl = m === 'tecnica' ? 'Proposta Técnica' : m === 'comercial' ? 'Proposta Comercial' : 'Propostas Técnica e Comercial';
      toast(lbl + ' gerada(s)');
    } catch (e) {
      logger.error('Erro ao gerar PDF: ' + e, 'pdf');
      toast('Erro ao gerar PDF: ' + (e && e.message ? e.message : e));
    }
  }

  // Modal de seleção flexível do tipo de documento a emitir.
  // Recebe a proposta e uma flag se deve registrar no histórico de emissões.
  function modalSelecionarEmissao(prop, registrar) {
    const box = el('div');
    box.innerHTML = `
      <p style="color:var(--text-2);font-size:13px;margin-bottom:14px">
        Selecione o(s) documento(s) que deseja gerar para a cotação
        <strong class="mono">${escapeHtml(prop.id || 'PROPOSTA')}</strong>:
      </p>
      <label class="field full" style="margin-bottom:10px">
        <span class="chk"><input type="checkbox" id="emTecnica" checked> Emitir apenas Proposta Técnica</span>
      </label>
      <label class="field full" style="margin-bottom:10px">
        <span class="chk"><input type="checkbox" id="emComercial" checked> Emitir apenas Proposta Comercial</span>
      </label>
      <label class="field full" style="margin-bottom:6px">
        <span class="chk"><input type="checkbox" id="emAmbas"> Emitir Ambas Juntas</span>
      </label>
      <label class="field full" style="margin-bottom:6px">
        <span class="chk"><input type="checkbox" id="emDescricao" checked> Incluir Descrição Comercial nos itens (Comercial)</span>
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="emCancel">Cancelar</button>
        <button class="btn btn-primary" id="emConfirm">Gerar Documento</button>
      </div>`;
    Modal.open('Selecionar Tipo de Proposta', box);

    const sync = () => {
      const ambas = $('#emAmbas').checked;
      $('#emTecnica').disabled = ambas; $('#emComercial').disabled = ambas;
      if (ambas) { $('#emTecnica').checked = true; $('#emComercial').checked = true; }
    };
    $('#emAmbas').addEventListener('change', sync);

    $('#emCancel').addEventListener('click', Modal.close);
    $('#emConfirm').addEventListener('click', () => {
      const tecnica = $('#emTecnica').checked, comercial = $('#emComercial').checked;
      if (!tecnica && !comercial) { toast('Selecione ao menos um documento'); return; }
      const modo = (tecnica && comercial) ? 'ambas' : (tecnica ? 'tecnica' : 'comercial');
      const comDescricao = $('#emDescricao').checked;
      Modal.close();
      gerarPdf(prop, modo, comDescricao);
      if (registrar) DB.registrarEmissao(prop.id, modo);
    });
  }

  // Factory de layout reutilizável por documento (encapsula y, paleta e helpers).
  function makeLayout(doc) {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 16;
    const DARK = [15, 23, 42];      // #0f172a — faixa premium
    const BLUE = [2, 132, 199];     // #0284c7 — destaque de seções
    const BLUE_SUB = [37, 99, 235];
    const SLATE = [100, 116, 139];
    const LINE = [226, 232, 240];   // #e2e8f0
    const LINE2 = [203, 213, 225];  // #cbd5e1
    const HEADBG = [248, 250, 252]; // #f8fafc
    const ZEBRA = [248, 250, 252];
    const TEXT = [30, 41, 59];
    let y = 0;
    let currentProp = null;

    function cabecalho(_prop) {
      y = 16;
      // Bloco esquerdo: logo + marca + subtítulo
      const LOGO_W = 28, LOGO_H = 16, LOGO_X = M, LOGO_Y = y;
      let textX = M;
      try {
        if (typeof logoDataUrl === 'string' && logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H, undefined, 'FAST');
          textX = LOGO_X + LOGO_W + 5;
        }
      } catch (_) { /* sem logo: texto começa na margem */ }
      doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5);
      const marcaLines = doc.splitTextToSize(EMPRESA.marca, W - textX - M - 52);
      doc.text(marcaLines, textX, y + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...BLUE_SUB);
      doc.text(EMPRESA.subtitulo, textX, y + 4 + marcaLines.length * 5 + 1);
      // Fim do bloco esquerdo (logo + marca + subtítulo)
      const blocoEsq = y + 4 + marcaLines.length * 5 + 1 + 4;
      // Bloco direito: dados corporativos (CNPJ, endereço, e-mail) — DESCIDO bem
      // abaixo do nome da empresa para nunca sobrepor a marca.
      doc.setFontSize(7.5); doc.setTextColor(...SLATE); doc.setFont('helvetica', 'normal');
      const rightTop = blocoEsq + 1;
      EMPRESA.corp.slice(1).forEach((linha, i) => doc.text(linha, W - M, rightTop + i * 4.2, { align: 'right' }));
      const blocoDir = rightTop + (EMPRESA.corp.length - 1) * 4.2 + 2;
      y = Math.max(blocoEsq, blocoDir);
      doc.setDrawColor(...LINE); doc.setLineWidth(0.4); doc.line(M, y, W - M, y);
      // Detalhe institucional: Verde Clínico Vibrante (#22c55e) como acento sob o cabeçalho
      doc.setDrawColor(...EMPRESA.CLIN_GREEN); doc.setLineWidth(1.2);
      doc.line(M, y + 1.4, W - M, y + 1.4);
      y += 4;
    }

    // Garante que o conteúdo não invada a zona do rodapé (assinatura).
    // Quebra a página (re-desenhando o cabeçalho) se o espaço for insuficiente.
    function ensureSpace(h) {
      if (y + (h || 6) > H - 42) { doc.addPage(); cabecalho(currentProp); }
    }

    function faixaTitulo(txt) {
      y += 6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      const lines = doc.splitTextToSize(txt, W - 2 * M - 12);
      const faixaH = 8 + lines.length * 6;
      ensureSpace(faixaH + 14);
      doc.setFillColor(...DARK); doc.rect(M, y, W - 2 * M, faixaH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(lines, M + 6, y + 8);
      y += faixaH + 8;
    }

    function secao(titulo) {
      ensureSpace(16);
      doc.setFillColor(...BLUE); doc.rect(M, y - 4, 1.5, 6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
      doc.text(titulo.toUpperCase(), M + 4, y + 1);
      y += 8;
    }

    function rodape(assinaturaDir) {
      const sy = H - 34;
      doc.setDrawColor(...DARK); doc.setLineWidth(0.4); doc.line(M, sy - 6, W - M, sy - 6);
      const half = (W - 2 * M) / 2;
      doc.setDrawColor(...TEXT); doc.setLineWidth(0.3);
      doc.line(M, sy + 4, M + half - 8, sy + 4);
      doc.line(M + half + 8, sy + 4, W - M, sy + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...TEXT);
      doc.text(doc.splitTextToSize(EMPRESA.assinaturaEsq, half - 8), M, sy + 9);
      doc.text(doc.splitTextToSize(assinaturaDir, half - 8), M + half + 8, sy + 9);
      doc.setFillColor(...DARK); doc.rect(0, H - 8, W, 8, 'F');
      doc.setFillColor(...BLUE); doc.rect(0, H - 8, W, 0.8, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
      doc.text(`${EMPRESA.marca}  •  ${EMPRESA.email}`, W / 2, H - 3, { align: 'center' });
    }

    return {
      get W() { return W; }, get H() { return H; }, get M() { return M; },
      get y() { return y; }, set y(v) { y = v; },
      DARK, BLUE, BLUE_SUB, SLATE, LINE, LINE2, HEADBG, ZEBRA, TEXT,
      cabecalho, faixaTitulo, secao, rodape, ensureSpace,
      setProp(p) { currentProp = p; },
    };
  }

  /* ===== PDF 1 — PROPOSTA TÉCNICA ===== */
  function gerarTecnica(prop) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const L = makeLayout(doc); L.setProp(prop);
    const idProp = prop.id || 'PROPOSTA';
    const projeto = (prop.itens[0]?.nome || prop.projeto || prop.categoria || 'PROPOSTA TÉCNICA').toUpperCase();

    L.cabecalho(prop);
    L.faixaTitulo('PROPOSTA TÉCNICA — ' + projeto);

    // Metadados (grid de 4 colunas, layout fixo 25% — evita vazamento/sobreposição)
    L.y += 2;
    const meta = [
      ['COTAÇÃO', 'COTAÇÃO ' + idProp],
      ['DATA DE EMISSÃO', new Date().toLocaleDateString('pt-BR')],
      ['EMITIDO POR', 'Matheus'],
      ['VALIDADE', prop.validade || '15 dias'],
    ];
    const colW = (L.W - 2 * L.M) / 4;   // 25% fixo por célula (table-layout: fixed)
    doc.setDrawColor(...L.LINE); doc.setLineWidth(0.3); doc.line(L.M, L.y - 2, L.W - L.M, L.y - 2);
     meta.forEach((m, i) => {
       const cx = L.M + i * colW;
       doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...L.SLATE);
       doc.text(m[0], cx, L.y + 4);
       doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...L.TEXT);
       // Trunca o valor para caber na coluna de 25% (blindagem anti-vazamento)
       doc.text(doc.splitTextToSize(String(m[1]), colW - 2).slice(0, 2), cx, L.y + 10);
     });
      L.y += 16;
      doc.setDrawColor(...L.LINE); doc.line(L.M, L.y, L.W - L.M, L.y);
      L.y += 6;

     // 01. Resumo (Dados do Hospital/Cliente e Contato) — fonte única: raiz da negociação
     const dcpT = dadosClienteProp(prop);
     L.secao('01. Resumo da Proposta');
     doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...L.TEXT);
     [
       `Cliente / Hospital:  ${prop.cliente}`,
       `CNPJ:  ${dcpT.cnpj ? fmtCnpj(dcpT.cnpj) : '—'}`,
       `E-mail:  ${dcpT.email || '—'}`,
       `Endereço:  ${dcpT.endereco || '—'}`,
       `Contato:  ${prop.contato || '—'}`,
       `Nº da Cotação (Portal do Cliente):  ${prop.cotacaoNum || '—'}`,
       `Projeto / Equipamento:  ${prop.itens[0]?.nome || prop.projeto || prop.categoria || '—'}`,
      ].forEach(t => { L.ensureSpace(5.5); doc.text('•  ' + t, L.M + 4, L.y, { lineHeightFactor: 1.5 }); L.y += 5.5; });
      L.y += 4;

     // 02. Produtos / Equipamentos — cada item em sua própria página
     // Para propostas técnicas com descrições longas, cada item ocupa uma página inteira:
     //   - Face ESQUERDA: foto do item (legenda "1. Foto do item")
     //   - Face DIREITA: descrição técnica (legenda "2. Descrição técnica do item")
     // Isso evita texto cortado, blocos comprimidos e desperdício de espaço.
     L.secao('02. Produtos / Equipamentos');
     const blocoW = Math.min(L.W - 2 * L.M, 170);
     const descLineH = 5;
     // Cada "face" ocupa metade da área útil da página
     const FACE_W = (blocoW - 8) / 2;          // largura de cada face
     const colFotoX = L.M;
     const colDescX = L.M + FACE_W + 8;

       prop.itens.forEach((it, idx) => {
        // Cada item começa em página própria (exceto o primeiro, que segue o fluxo)
        if (idx > 0) {
          L.y = 0;
          L.cabecalho(prop);
          L.y = 30; // espaço para cabeçalho
        }

        const foto = it.foto || '';
        const nome = it.nome || `Item ${idx + 1}`;
        const desc = it.descricao || '';

        // Título do item — centralizado no topo da página
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...L.DARK);
        doc.text(`Item ${idx + 1} — ${nome}`, L.W / 2, L.y + 6, { align: 'center' });
        const tituloY = L.y + 12;
        L.y = tituloY + 4;

        // Linha separadora sob o título
        doc.setDrawColor(...L.BLUE); doc.setLineWidth(0.6);
        doc.line(L.M, tituloY + 2, L.W - L.M, tituloY + 2);
        L.y += 4;

        // Recalcula altura útil disponível para as faces
        const faceH = L.H - 42 - L.y - 6;
        const faceTopY = L.y;

        // ───── Face ESQUERDA — Foto do item ─────
        // Caixa de fundo da foto
        doc.setFillColor(...L.HEADBG); doc.setDrawColor(...L.LINE2); doc.setLineWidth(0.3);
        doc.roundedRect(colFotoX, faceTopY, FACE_W, faceH, 3, 3, 'FD');

        // Legenda "1. Foto do item"
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...L.BLUE);
        doc.text('1. Foto do item', colFotoX + 4, faceTopY + 5);

        // Foto centralizada na face
        if (foto && (foto.startsWith('data:') || foto.startsWith('http')) && !foto.startsWith('data:image/svg')) {
          try {
            const isJpeg = foto.startsWith('data:image/jpeg') || /\.jpe?g($|\?)/i.test(foto);
            const fmt = isJpeg ? 'JPEG' : 'PNG';
            const imgProps = doc.getImageProperties(foto);
            const maxW = FACE_W - 12, maxH = faceH - 18; // 18 = legenda + padding
            const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
            const iw = imgProps.width * ratio, ih = imgProps.height * ratio;
            const fotoX = colFotoX + (FACE_W - iw) / 2;
            const fotoY = faceTopY + 12 + (faceH - 18 - ih) / 2;
            doc.addImage(foto, fmt, fotoX, fotoY, iw, ih, undefined, 'FAST');
          } catch (_) { /* imagem inválida: mantém face vazia */ }
        } else {
          doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(...L.SLATE);
          doc.text('Sem imagem cadastrada', colFotoX + FACE_W / 2, faceTopY + faceH / 2, { align: 'center' });
        }

        // ───── Face DIREITA — Descrição técnica do item ─────
        doc.setFillColor(...L.HEADBG); doc.setDrawColor(...L.LINE2); doc.setLineWidth(0.3);
        doc.roundedRect(colDescX, faceTopY, FACE_W, faceH, 3, 3, 'FD');

        // Legenda "2. Descrição técnica do item"
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...L.BLUE);
        doc.text('2. Descrição técnica do item', colDescX + 4, faceTopY + 5);

        // Quebra a descrição na largura da face direita
        const descLines = desc
          ? doc.splitTextToSize(desc, FACE_W - 12)
          : ['Sem descrição técnica cadastrada.'];

        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...L.TEXT);
        // Se a descrição for muito longa, distribui em páginas extras
        let lineIdx = 0;
        const maxLinesPerPage = Math.floor((faceH - 14) / descLineH);

        while (lineIdx < descLines.length) {
          const linhasQueCabem = Math.min(maxLinesPerPage, descLines.length - lineIdx);
          const slice = descLines.slice(lineIdx, lineIdx + linhasQueCabem);
          doc.text(slice, colDescX + 6, faceTopY + 12, { lineHeightFactor: 1.35 });
          lineIdx += linhasQueCabem;

          if (lineIdx < descLines.length) {
            // Descrição muito longa: adiciona página para continuar
            doc.addPage();
            L.cabecalho(prop);
            L.y = 30;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...L.DARK);
            doc.text(`Item ${idx + 1} (continuação) — ${nome}`, L.M, L.y + 4);
            L.y += 10;
            const novaFaceH = L.H - 42 - L.y - 6;
            doc.setFillColor(...L.HEADBG); doc.setDrawColor(...L.LINE2); doc.setLineWidth(0.3);
            doc.roundedRect(colDescX, L.y, FACE_W + (colFotoX === L.M ? 0 : 0), novaFaceH, 3, 3, 'FD');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...L.BLUE);
            doc.text('2. Descrição técnica do item (continuação)', colDescX + 4, L.y + 5);
            // Atualiza parâmetros para o próximo while
            const novoTopo = L.y;
            const novoMax = Math.floor((novaFaceH - 14) / descLineH);
            // continua no while
            const proximas = Math.min(novoMax, descLines.length - lineIdx);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...L.TEXT);
            doc.text(descLines.slice(lineIdx, lineIdx + proximas), colDescX + 6, novoTopo + 12, { lineHeightFactor: 1.35 });
            lineIdx += proximas;
            L.y = novoTopo + novaFaceH + 6;
          }
        }

        // Após cada item, avança para a próxima página (cada item tem sua própria página)
        if (idx < prop.itens.length - 1) {
          doc.addPage();
          L.cabecalho(prop);
          L.y = 26;
        } else {
          L.y = L.H - 42; // último item: posiciona para o rodapé
        }
      });

     // Seção 03 removida — era redundante: as descrições técnicas já estão
     // integralmente na seção 02 (face direita de cada item).

    L.y += 4;
    L.rodape('Validação Técnica do Cliente - Assinatura, Data e Carimbo');
    doc.save(`${idProp}_TECNICA_${prop.cliente.replace(/\s+/g, '_')}.pdf`);
  }

  /* ===== PDF 2 — PROPOSTA COMERCIAL ===== */
  function gerarComercial(prop, comDescricao) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const L = makeLayout(doc); L.setProp(prop);
    const idProp = prop.id || 'PROPOSTA';
    const projeto = (prop.itens[0]?.nome || prop.projeto || prop.categoria || 'PROPOSTA COMERCIAL').toUpperCase();
    const total = prop.itens.reduce((s, it) => s + it.preco * it.qtd, 0);

    L.cabecalho(prop);
    L.faixaTitulo('PROPOSTA COMERCIAL — ' + projeto);

    L.y += 2;
    const meta = [
      ['COTAÇÃO', 'COTAÇÃO ' + idProp],
      ['DATA DE EMISSÃO', new Date().toLocaleDateString('pt-BR')],
      ['EMITIDO POR', 'Matheus'],
      ['VALIDADE', prop.validade || '15 dias'],
    ];
    const colW = (L.W - 2 * L.M) / 4;
    doc.setDrawColor(...L.LINE); doc.setLineWidth(0.3); doc.line(L.M, L.y - 2, L.W - L.M, L.y - 2);
    meta.forEach((m, i) => {
      const cx = L.M + i * colW;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...L.SLATE);
      doc.text(m[0], cx, L.y + 4);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...L.TEXT);
      doc.text(doc.splitTextToSize(String(m[1]), colW - 2).slice(0, 2), cx, L.y + 10);
    });
    L.y += 16;
    doc.setDrawColor(...L.LINE); doc.line(L.M, L.y, L.W - L.M, L.y);
    L.y += 8;

    // 01. Dados de Faturamento do Cliente
    const dcpC = dadosClienteProp(prop);
    L.secao('01. Dados de Faturamento');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...L.TEXT);
    [
      `Razão Social / Cliente:  ${prop.cliente}`,
      `CNPJ:  ${dcpC.cnpj ? fmtCnpj(dcpC.cnpj) : '—'}`,
      `E-mail:  ${dcpC.email || '—'}`,
      `Endereço:  ${dcpC.endereco || '—'}`,
      `Contato Responsável:  ${prop.contato || '—'}`,
      `Nº da Cotação (Portal do Cliente):  ${prop.cotacaoNum || '—'}`,
      `Categoria / Projeto:  ${prop.itens[0]?.nome || prop.projeto || prop.categoria || '—'}`,
     ].forEach(t => { L.ensureSpace(5.5); doc.text('•  ' + t, L.M + 4, L.y, { lineHeightFactor: 1.5 }); L.y += 5.5; });
    L.y += 4;

    // 02. Planilha de Itens e Valores (tabela estruturada, border-collapse)
    L.secao('02. Itens e Valores');
    const incluiDesc = comDescricao !== false;
    const colHead = incluiDesc
      ? ['Item', 'Descrição Comercial', 'Qtd', 'Valor Unit.', 'Valor Total']
      : ['Item', 'Qtd', 'Valor Unit.', 'Valor Total'];
    const rows = prop.itens.map(it => incluiDesc
      ? [it.nome, it.descricao || '—', String(it.qtd), BRL(it.preco), BRL(it.preco * it.qtd)]
      : [it.nome, String(it.qtd), BRL(it.preco), BRL(it.preco * it.qtd)]);
    doc.autoTable({
      startY: L.y,
      head: [colHead],
      body: rows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: L.TEXT, cellPadding: 3, lineColor: L.LINE2, lineWidth: 0.1, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: L.HEADBG, textColor: L.DARK, fontStyle: 'bold', lineColor: L.LINE2, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: L.ZEBRA },
      columnStyles: incluiDesc
        ? { 0: { cellWidth: 38 }, 1: { cellWidth: 'auto' }, 2: { halign: 'center', cellWidth: 14 }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 32 } }
        : { 0: { cellWidth: 60 }, 1: { halign: 'center', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 36 }, 3: { halign: 'right', cellWidth: 38 } },
      margin: { left: L.M, right: L.M },
    });
    L.y = doc.lastAutoTable.finalY + 4;

    // Total Geral (fundo cinza claro #f8fafc + negrito)
    if (L.y > L.H - 60) { doc.addPage(); L.cabecalho(prop); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...L.DARK);
    doc.setFillColor(...L.HEADBG); doc.rect(L.M, L.y, L.W - 2 * L.M, 10, 'F');
    doc.text('TOTAL GERAL', L.M + 4, L.y + 6.5);
    doc.text(BRL(total), L.W - L.M - 4, L.y + 6.5, { align: 'right' });
    L.y += 16;

    // 03. Condições Comerciais
    L.secao('03. Condições Comerciais');
    doc.setFontSize(9.5);
    [
      ['Prazo de entrega', prop.prazo || '10 dias úteis'],
      ['Validade da proposta', prop.validade || '30 dias'],
      ['Forma de pagamento', prop.pagamento || '30/60 dias — Boleto bancário'],
     ].forEach(([k, v]) => {
       L.ensureSpace(6.5);
       doc.setFont('helvetica', 'bold'); doc.setTextColor(...L.SLATE); doc.text(k + ':', L.M + 4, L.y);
       doc.setFont('helvetica', 'normal'); doc.setTextColor(...L.TEXT); doc.text(String(v), L.M + 54, L.y);
       L.y += 6.5;
     });

    L.rodape('Aceite Comercial de Faturamento - Assinatura, Data e Carimbo');
    doc.save(`${idProp}_COMERCIAL_${prop.cliente.replace(/\s+/g, '_')}.pdf`);
  }

  function gerarPdfById(id) {
    const p = DB.getPropostas().find(x => x.id === id);
    if (p) modalSelecionarEmissao(p, true);
  }

  // Abre o fluxo de emissão flexível (modal de seleção) para uma proposta.
  function emitirProposta(prop, registrar) {
    if (prop) modalSelecionarEmissao(prop, registrar !== false);
  }

  window.Proposta = { gerarPdf, gerarPdfById, emitirProposta, modalSelecionarEmissao };
  VIEWS.register('gerador', { init, render });
})();
