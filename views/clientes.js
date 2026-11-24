/* =========================================================
   TELA — Cadastro de Clientes (menu principal, ao lado do Funil)
   Busca automática de dados reais via CNPJ (BrasilAPI / Receita).
   ========================================================= */
(() => {
  let filtro = '';

  // ───── Helpers ─────
  function digits(v) { return (v || '').replace(/\D/g, ''); }

  function maskCnpj(v) {
    const d = digits(v).slice(0, 14);
    return d
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  function formatPhone(p) {
    const d = digits(p);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return p || '';
  }

  // ───── Consulta CNPJ (dados reais da Receita) ─────
  // Solução definitiva: cache local de 30 dias + cadeia de fontes
  // (BrasilAPI → Minha Receita → CNPJ.ws). Se uma falhar/limitar, tenta a próxima.
  const CNPJ_CACHE_KEY = 'CRM_CNPJ_CACHE';
  const CNPJ_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 dias

  function cacheCnpjGet(cnpj) {
    try {
      const all = JSON.parse(localStorage.getItem(CNPJ_CACHE_KEY) || '{}');
      const hit = all[cnpj];
      if (hit && (Date.now() - hit.em) < CNPJ_CACHE_TTL) return hit.dados;
    } catch (_) {}
    return null;
  }

  function cacheCnpjPut(cnpj, dados) {
    try {
      const all = JSON.parse(localStorage.getItem(CNPJ_CACHE_KEY) || '{}');
      all[cnpj] = { em: Date.now(), dados };
      localStorage.setItem(CNPJ_CACHE_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  async function fetchCnpjBrasilAPI(d14) {
    const resp = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d14);
    if (!resp.ok) {
      if (resp.status === 404) throw new Error('CNPJ não encontrado na Receita Federal.');
      if (resp.status === 429) throw new Error('Muitas consultas seguidas — aguarde alguns segundos e clique em Buscar novamente.');
      throw new Error('BrasilAPI indisponível (erro ' + resp.status + ').');
    }
    const j = await resp.json();
    return {
      razao: j.razao_social || '',
      fantasia: j.nome_fantasia || '',
      logradouro: j.logradouro || '', numero: j.numero || '', complemento: j.complemento || '',
      bairro: j.bairro || '', municipio: j.municipio || '', uf: j.uf || '',
      cep: j.cep ? String(j.cep).padStart(8, '0') : '',
      email: j.email || '',
      telefone: j.ddd_telefone_1 || j.ddd_telefone_2 || '',
    };
  }

  async function fetchCnpjMinhaReceita(d14) {
    const resp = await fetch('https://minhareceita.org/' + d14);
    if (!resp.ok) {
      if (resp.status === 404) throw new Error('CNPJ não encontrado na Receita Federal.');
      throw new Error('Serviço indisponível (erro ' + resp.status + ').');
    }
    const j = await resp.json();
    return {
      razao: j.nome || '',
      fantasia: j.fantasia || '',
      logradouro: j.logradouro || '', numero: j.numero || '', complemento: j.complemento || '',
      bairro: j.bairro || '', municipio: j.municipio || '', uf: j.uf || '',
      cep: j.cep ? String(j.cep).padStart(8, '0') : '',
      email: j.email || '',
      telefone: j.telefone || '',
    };
  }

  async function fetchCnpjWs(d14) {
    const resp = await fetch('https://publica.cnpj.ws/cnpj/' + d14);
    if (!resp.ok) {
      if (resp.status === 404) throw new Error('CNPJ não encontrado na Receita Federal.');
      throw new Error('CNPJ.ws indisponível (erro ' + resp.status + ').');
    }
    const j = await resp.json();
    const e = j.estabelecimento || {};
    const tel = e.ddd1 && e.telefone1 ? String(e.ddd1) + String(e.telefone1) : (e.telefone1 || '');
    return {
      razao: j.razao_social || '',
      fantasia: e.nome_fantasia || '',
      logradouro: e.logradouro || '', numero: e.numero || '', complemento: e.complemento || '',
      bairro: e.bairro || '',
      municipio: (e.cidade && (e.cidade.nome || e.cidade)) || '',
      uf: (e.estado && (e.estado.sigla || e.estado)) || '',
      cep: e.cep ? String(e.cep).padStart(8, '0') : '',
      email: e.email || '',
      telefone: tel,
    };
  }

  async function fetchCnpj(d14) {
    let naoEncontrado = false;
    let ultimoErro = null;
    const fontes = [fetchCnpjBrasilAPI, fetchCnpjMinhaReceita, fetchCnpjWs];
    for (const fonte of fontes) {
      try {
        const dados = await fonte(d14);
        cacheCnpjPut(d14, dados);
        return dados;
      } catch (e) {
        if (e && e.message && e.message.includes('não encontrado')) naoEncontrado = true;
        ultimoErro = e;
      }
    }
    if (naoEncontrado) throw new Error('CNPJ não encontrado na Receita Federal. Verifique os números digitados.');
    throw new Error('Serviços de consulta estão limitados neste momento — aguarde cerca de 1 minuto e clique em Buscar novamente.');
  }

  function enderecoFromApi(d) {
    const parts = [];
    if (d.logradouro) parts.push(d.logradouro + (d.numero ? ', ' + d.numero : ''));
    if (d.complemento) parts.push(d.complemento);
    if (d.bairro) parts.push(d.bairro);
    if (d.municipio) parts.push(d.municipio + (d.uf ? '/' + d.uf : ''));
    if (d.cep) parts.push('CEP ' + d.cep.replace(/(\d{5})(\d{3})/, '$1-$2'));
    return parts.join(' — ');
  }

  function aplicarDadosCnpj(d) {
    $('#clNome').value = d.fantasia || d.razao || '';
    $('#clRazao').value = d.razao || '';
    $('#clEndereco').value = enderecoFromApi(d);
    $('#clEmail').value = (d.email || '').toLowerCase();
    $('#clPhone').value = formatPhone(d.telefone || '');
  }

  // ───── Formulário (novo / editar) ─────
  function openForm(client) {
    const isNew = !client;
    const c = client || {};
    const box = el('div');
    box.innerHTML = `
      <p style="font-size:var(--font-xs);color:var(--text-muted);margin:0 0 12px">
        Digite o CNPJ e clique em <strong>Buscar</strong> — razão social, endereço, e-mail e telefone são preenchidos automaticamente.
      </p>
      <div class="form-grid">
        <label class="field full"><span>CNPJ *</span>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="clCnpj" placeholder="00.000.000/0000-00" inputmode="numeric" autocomplete="off" value="${escapeHtml(maskCnpj(c.cnpj || ''))}" style="flex:1">
            <button class="btn btn-primary" id="clBuscar" type="button" style="white-space:nowrap">Buscar CNPJ</button>
          </div>
        </label>
        <label class="field"><span>Nome Fantasia *</span><input id="clNome" value="${escapeHtml(c.name || '')}"></label>
        <label class="field"><span>Razão Social</span><input id="clRazao" value="${escapeHtml(c.razaoSocial || '')}"></label>
        <label class="field"><span>Comprador / Contato</span><input id="clComprador" placeholder="Ex: Adriana (compras)" value="${escapeHtml(c.comprador || '')}"></label>
        <label class="field"><span>Telefone do Comprador</span><input id="clPhoneBuyer" placeholder="(XX) XXXXX-XXXX" value="${escapeHtml(c.phoneBuyer || '')}"></label>
        <label class="field"><span>E-mail</span><input id="clEmail" type="email" value="${escapeHtml(c.email || '')}"></label>
        <label class="field"><span>Telefone da Empresa</span><input id="clPhone" value="${escapeHtml(c.phone || '')}"></label>
        <label class="field full"><span>Endereço</span><input id="clEndereco" value="${escapeHtml(c.address || '')}"></label>
        <label class="field full"><span>Observações</span><textarea id="clObs">${escapeHtml(c.observations || '')}</textarea></label>
      </div>
      <div id="clStatus" style="font-size:var(--font-xs);color:var(--text-muted);min-height:18px;margin:10px 0 0"></div>
      <div class="modal-actions">
        ${!isNew && Auth.can('clientes') ? '<button class="btn btn-danger" id="clDelete">Excluir</button>' : ''}
        <button class="btn btn-ghost" id="clCancel">Cancelar</button>
        <button class="btn btn-primary" id="clSave">Salvar Cliente</button>
      </div>`;
    Modal.open(isNew ? 'Novo Cliente — busca automática por CNPJ' : 'Editar Cliente', box);

    const cnpjInput = $('#clCnpj');
    const status = $('#clStatus');
    const buscarBtn = $('#clBuscar');

    async function lookupCnpj() {
      const d14 = digits(cnpjInput.value);
      if (d14.length !== 14) {
        status.style.color = 'var(--danger, #ef4444)';
        status.textContent = 'Digite o CNPJ completo (14 números) antes de buscar.';
        return;
      }

      // 1) Cache local — resposta instantânea, sem depender de internet
      const cache = cacheCnpjGet(d14);
      if (cache) {
        aplicarDadosCnpj(cache);
        status.style.color = 'var(--success, #22c55e)';
        status.textContent = 'Dados carregados (cache local): ' + (cache.fantasia || cache.razao || d14);
        return;
      }

      // 2) Rede — tenta BrasilAPI → Minha Receita → CNPJ.ws
      if (buscarBtn) { buscarBtn.disabled = true; buscarBtn.textContent = 'Buscando...'; }
      status.style.color = 'var(--text-muted)';
      status.textContent = 'Consultando CNPJ na Receita Federal...';
      try {
        const data = await fetchCnpj(d14);
        aplicarDadosCnpj(data);
        status.style.color = 'var(--success, #22c55e)';
        status.textContent = 'Dados encontrados: ' + (data.fantasia || data.razao || d14);
        toast('Dados do CNPJ preenchidos automaticamente');
      } catch (err) {
        const semConexao = err instanceof TypeError;
        status.style.color = 'var(--danger, #ef4444)';
        status.textContent = (semConexao ? 'Sem conexão com a internet. ' : err.message + ' ') + 'Você pode preencher manualmente.';
      } finally {
        if (buscarBtn) { buscarBtn.disabled = false; buscarBtn.textContent = 'Buscar CNPJ'; }
      }
    }

    if (buscarBtn) buscarBtn.addEventListener('click', lookupCnpj);
    cnpjInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); lookupCnpj(); }
    });
    cnpjInput.addEventListener('input', () => {
      cnpjInput.value = maskCnpj(cnpjInput.value);
      status.textContent = '';
    });

    $('#clCancel').addEventListener('click', Modal.close);

    const delBtn = $('#clDelete');
    if (delBtn) delBtn.addEventListener('click', () => {
      if (confirm('Excluir o cliente "' + c.name + '"?')) {
        DB.deleteClient(client.id);
        Modal.close();
        render();
        toast('Cliente excluído');
      }
    });

    $('#clSave').addEventListener('click', () => {
      const nome = $('#clNome').value.trim();
      if (!nome) { toast('Informe o Nome Fantasia'); $('#clNome').focus(); return; }
      const cnpjVal = digits($('#clCnpj').value);
      if (cnpjVal && cnpjVal.length !== 14) { toast('CNPJ incompleto — use 14 dígitos ou deixe vazio'); return; }
      DB.upsertClient({
        id: client ? client.id : undefined,
        name: nome,
        razaoSocial: $('#clRazao').value.trim(),
        cnpj: cnpjVal,
        comprador: $('#clComprador').value.trim(),
        phoneBuyer: digits($('#clPhoneBuyer').value),
        email: $('#clEmail').value.trim(),
        phone: $('#clPhone').value.trim(),
        address: $('#clEndereco').value.trim(),
        observations: $('#clObs').value.trim(),
        externalCode: client ? (client.externalCode || '') : '',
        lastSale: client ? (client.lastSale || '') : '',
        totalSpent: client ? (client.totalSpent || 0) : 0,
        salesHistory: client ? (client.salesHistory || []) : [],
      });
      Modal.close();
      render();
      toast(isNew ? 'Cliente cadastrado' : 'Cliente atualizado');
    });
  }

  // ───── Tabela ─────
  function render() {
    const body = $('#clientesBody');
    if (!body) return;

    const all = DB.getClients();
    const f = filtro.toLowerCase().trim();
    const list = f ? all.filter(cl =>
      (cl.name || '').toLowerCase().includes(f) ||
      (cl.cnpj || '').includes(f) ||
      (cl.razaoSocial || '').toLowerCase().includes(f) ||
      (cl.comprador || '').toLowerCase().includes(f) ||
      (cl.phoneBuyer || '').toLowerCase().includes(f) ||
      (cl.address || '').toLowerCase().includes(f)
    ) : all;

    if (!list.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum cliente ' +
        (f ? 'encontrado para "' + escapeHtml(filtro) + '"' : 'cadastrado ainda — clique em "+ Novo Cliente (CNPJ)"') + '.</td></tr>';
      return;
    }

    body.innerHTML = '';
    list.forEach(cl => {
      const tr = el('tr');
      const wa = digits(cl.phoneBuyer || cl.phone || '');
      const razao = (cl.razaoSocial && cl.razaoSocial !== cl.name)
        ? '<br><span style="font-size:10px;color:var(--text-secondary)">' + escapeHtml(cl.razaoSocial) + '</span>' : '';

      // Mensagem pré-definida: lista as cotações em aberto deste cliente
      const nomeBaixo = (cl.name || '').toLowerCase();
      const abertas = DB.getPropostas().filter(p =>
        (p.cliente || '').toLowerCase().includes(nomeBaixo) && p.status !== 'ganho' && p.status !== 'perdido');
      let msg;
      if (abertas.length) {
        const cots = abertas.map(p => {
          if (p.cotacaoNum) return '• Cotação nº ' + p.cotacaoNum;
          const item = (p.itens && p.itens[0]) ? p.itens[0].nome : '';
          return '• ' + (item || 'Proposta em aberto');
        }).join('\n');
        msg = `Olá ${cl.comprador || cl.name}! Tudo bem?\nAqui é o Matheus, da Metrolabs. Gostaria de saber a situação das nossas cotações em aberto:\n\n${cots}\n\nExiste alguma novidade ou previsão? Obrigado!`;
      } else {
        msg = `Olá ${cl.comprador || cl.name}! Tudo bem?\nAqui é o Matheus, da Metrolabs. Gostaria de saber se há alguma necessidade de cotação ou pedido no momento. Obrigado!`;
      }
      const waHref = wa.length >= 10 ? 'https://wa.me/55' + wa + '?text=' + encodeURIComponent(msg) : null;

      tr.innerHTML = `
        <td><strong>${escapeHtml(cl.name)}</strong>${razao}</td>
        <td class="mono" style="font-size:var(--font-xs)">${escapeHtml(maskCnpj(cl.cnpj || ''))}</td>
        <td style="font-size:var(--font-xs)">${escapeHtml(cl.comprador || '—')}</td>
        <td style="font-size:var(--font-xs)">${escapeHtml(formatPhone(cl.phoneBuyer) || formatPhone(cl.phone) || '—')}</td>
        <td style="font-size:var(--font-xs)">${escapeHtml(cl.email || '—')}</td>
        <td style="font-size:var(--font-xs)">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${waHref ? `<a href="${waHref}" target="_blank" class="btn btn-sm btn-success" title="WhatsApp ${escapeHtml(cl.comprador || cl.name)}">WhatsApp</a>` : ''}
            <button class="btn btn-sm btn-ghost" data-cl-edit="${escapeHtml(String(cl.id))}">✎ Editar</button>
          </div>
        </td>`;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', (e) => {
        if (e.target.closest('a, button')) return;
        const found = DB.getClients().find(x => String(x.id) === String(cl.id));
        if (found) openForm(found);
      });
      body.appendChild(tr);
    });

    $$('#clientesBody [data-cl-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const found = DB.getClients().find(x => String(x.id) === String(btn.dataset.clEdit));
        if (found) openForm(found);
      });
    });
  }

  // ───── Init ─────
  function init() {
    const addBtn = $('#cliAddBtn');
    if (addBtn) addBtn.addEventListener('click', () => openForm(null));
    const busca = $('#cliBusca');
    if (busca) {
      let t;
      busca.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { filtro = busca.value.trim(); render(); }, 200);
      });
    }
  }

  VIEWS.register('clientes', { init, render });
})();
