/* =========================================================
   TELA 1 — Dashboard Gerencial
   KPIs, gráfico de evolução, segmentação e últimas atividades.
   ========================================================= */
(() => {
  let chartVendas = null;
  let chartCategoria = null;

  const isSameMonth = (iso, ref) => {
    const d = new Date(iso);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  };

  function accumByDay(propostas, ref, statusFilter) {
    const days = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const arr = new Array(days).fill(0);
    propostas.forEach(p => {
      if (statusFilter && p.status !== statusFilter) return;
      if (!isSameMonth(p.atualizadoEm, ref)) return;
      const day = new Date(p.atualizadoEm).getDate() - 1;
      arr[day] += DB.totalProposta(p);
    });
    // acumulado
    let acc = 0;
    return arr.map(v => (acc += v));
  }

  function computeKpis(propostas) {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const ganhasMes = propostas.filter(p => p.status === 'ganho' && isSameMonth(p.atualizadoEm, now));
    const ganhasPrev = propostas.filter(p => p.status === 'ganho' && isSameMonth(p.atualizadoEm, prev));
    const faturamento = ganhasMes.reduce((s, p) => s + DB.totalProposta(p), 0);
    const faturamentoPrev = ganhasPrev.reduce((s, p) => s + DB.totalProposta(p), 0);

    const ativas = propostas.filter(p => p.status === 'enviada' || p.status === 'negociacao');
    const ativasTotal = ativas.reduce((s, p) => s + DB.totalProposta(p), 0);

    const enviadasCount = propostas.filter(p => p.status !== 'aberto').length;
    const ganhasCount = propostas.filter(p => p.status === 'ganho').length;
    const conversao = enviadasCount ? (ganhasCount / enviadasCount) * 100 : 0;

    const todasGanhas = propostas.filter(p => p.status === 'ganho');
    const ticket = todasGanhas.length ? todasGanhas.reduce((s, p) => s + DB.totalProposta(p), 0) / todasGanhas.length : 0;

    return { faturamento, faturamentoPrev, ativasTotal, ativasQtd: ativas.length, conversao, enviadasCount, ganhasCount, ticket, ticketQtd: todasGanhas.length };
  }

  function renderKpis(k) {
    $('#kpiFaturamento').textContent = BRL(k.faturamento);
    const diff = k.faturamentoPrev ? ((k.faturamento - k.faturamentoPrev) / k.faturamentoPrev) * 100 : 0;
    const trend = $('#kpiFaturamentoTrend');
    trend.textContent = (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff).toFixed(0) + '% vs. mês anterior';
    trend.className = 'kpi-trend ' + (diff >= 0 ? 'up' : 'down');

    $('#kpiAtivas').textContent = BRL(k.ativasTotal);
    $('#kpiAtivasQtd').textContent = k.ativasQtd + ' cotações em negociação';

    $('#kpiConversao').textContent = k.conversao.toFixed(1) + '%';
    $('#kpiConversaoDet').textContent = `${k.ganhasCount} ganhas de ${k.enviadasCount} enviadas`;

    $('#kpiTicket').textContent = BRL(k.ticket);
    $('#kpiTicketDet').textContent = `Base: ${k.ticketQtd} propostas fechadas`;
  }

  // Lê as cores do tema ativo (CSS vars) para que os gráficos acompanhem
  // claro/escuro. Constrói uma escala monocromática do accent → página.
  function themeChartColors() {
    const cs = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim() || '#1D4ED8';
    const page = cs.getPropertyValue('--bg-card').trim() || '#FFFFFF';
    const secondary = cs.getPropertyValue('--text-secondary').trim() || '#5C5C6B';
    const muted = cs.getPropertyValue('--text-muted').trim() || '#9494A0';
    const border = cs.getPropertyValue('--border-subtle').trim() || '#D8D8CC';
    const toRgb = (h) => {
      h = h.replace('#', '');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const ar = toRgb(accent), pr = toRgb(page);
    const doughnut = [0, .18, .36, .54, .72, .88].map(t => {
      const c = mix(ar, pr, t);
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    });
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tooltipBg = isDark ? 'rgba(10, 14, 33, .95)' : 'rgba(15, 23, 42, .92)';
    const tooltipFg = isDark ? '#FFFFFF' : '#F8FAFC';
    return { accent, page, secondary, muted, border, doughnut, tooltipBg, tooltipFg };
  }

  function renderChartVendas(propostas) {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const atual = accumByDay(propostas, now);
    const anterior = accumByDay(propostas, prev);
    const labels = atual.length ? atual.map((_, i) => i + 1) : [];

    const t = themeChartColors();
    const ctx = $('#chartVendas').getContext('2d');

    // Avoid recreating the chart on every refresh — only redraw when data changes.
    const newKey = JSON.stringify({ atual, anterior });
    if (chartVendas && chartVendas._dataKey === newKey) {
      // no change, skip redraw to prevent pulsing
      return;
    }
    if (chartVendas) {
      // update datasets in place to avoid full re-creation animation
      chartVendas.data.labels = labels;
      chartVendas.data.datasets[0].data = atual;
      chartVendas.data.datasets[1].data = anterior;
      chartVendas._dataKey = newKey;
      chartVendas.update({ duration: 0 });
      return;
    }

    // Se não há vendas ganhas, mostra placeholder
    const temDados = atual.some(v => v > 0) || anterior.some(v => v > 0);
    if (!temDados) {
      chartVendas = null;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.font = '500 13px Inter, sans-serif';
      ctx.fillStyle = t.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Nenhuma venda no período', ctx.canvas.width / 2, ctx.canvas.height / 2);
      ctx.restore();
      return;
    }

    const hex = t.accent.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    const grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, `rgba(${r},${g},${b},.28)`);
    grad.addColorStop(.5, `rgba(${r},${g},${b},.10)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    chartVendas = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Mês atual',
            data: atual,
            borderColor: t.accent,
            backgroundColor: grad,
            fill: true,
            tension: .35,
            borderWidth: 2.5,
            pointRadius: (c) => c.dataIndex === c.dataset.data.length - 1 ? 4.5 : 0,
            pointHoverRadius: 7,
            pointBackgroundColor: t.accent,
            pointBorderColor: t.page,
            pointBorderWidth: 2.5,
          },
          {
            label: 'Mês anterior',
            data: anterior,
            borderColor: t.doughnut[3],
            fill: false,
            tension: .35,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: t.doughnut[3],
            pointBorderColor: t.page,
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { easing: 'easeOutQuart', duration: 800 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: t.secondary, usePointStyle: true, boxWidth: 10, padding: 16, font: { size: 12, weight: '500' } },
          },
          tooltip: {
            backgroundColor: t.tooltipBg,
            titleColor: t.tooltipFg,
            bodyColor: t.tooltipFg,
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 12, weight: '600' },
            bodyFont: { size: 13 },
            callbacks: {
              title: (items) => 'Dia ' + items[0].label,
              label: (c) => {
                const val = BRL(c.raw);
                const ultimo = c.dataIndex === c.dataset.data.length - 1;
                return c.dataset.label + ': ' + val + (ultimo ? ' (total)' : '');
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: t.border, drawBorder: false },
            ticks: { color: t.muted, maxTicksLimit: 10, font: { size: 11 } },
          },
          y: {
            grid: { color: t.border, drawBorder: false },
            ticks: {
              color: t.muted, font: { size: 11 },
              callback: (v) => 'R$ ' + (v / 1000).toFixed(0) + 'k',
            },
          },
        },
      },
      plugins: [{
        id: 'endLabels',
        afterDatasetsDraw(chart) {
          const c = chart.ctx;
          chart.data.datasets.forEach((ds, i) => {
            const meta = chart.getDatasetMeta(i);
            const pt = meta.data[meta.data.length - 1];
            if (!pt || ds.data[ds.data.length - 1] <= 0) return;
            const val = BRL(ds.data[ds.data.length - 1]);
            c.save();
            c.font = '700 12px Inter, sans-serif';
            c.fillStyle = ds.borderColor;
            c.textAlign = 'left';
            c.textBaseline = 'middle';
            c.fillText(val, pt.x + 10, pt.y);
            c.restore();
          });
        },
      }],
    });
    chartVendas._dataKey = newKey;
  }

  function renderChartCategoria(propostas) {
    const map = {};
    propostas.filter(p => p.status === 'ganho').forEach(p => {
      (p.itens || []).forEach(it => {
        const cat = (it.categoria || '').trim() || 'Outros';
        map[cat] = (map[cat] || 0) + (it.preco || 0) * (it.qtd || 0);
      });
    });
    const labels = Object.keys(map);
    const data = Object.values(map);
    const t = themeChartColors();
    const ctx = $('#chartCategoria').getContext('2d');

    const newKey = JSON.stringify(data);
    if (chartCategoria && chartCategoria._dataKey === newKey) return;
    if (chartCategoria) {
      chartCategoria.data.labels = labels;
      chartCategoria.data.datasets[0].data = data;
      chartCategoria._dataKey = newKey;
      chartCategoria.update({ duration: 0 });
      return;
    }

    if (!labels.length) {
      chartCategoria = null;
      const legend = $('#chartCategoriaLegend');
      if (legend) legend.innerHTML = '<li class="empty-chart-msg">Sem dados de vendas no período</li>';
      // desenha texto central vazio no canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.font = '500 13px Inter, sans-serif';
      ctx.fillStyle = t.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Sem dados', ctx.canvas.width / 2, ctx.canvas.height / 2);
      ctx.restore();
      return;
    }

    const colors = t.doughnut;

    chartCategoria = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: t.page, borderWidth: 3, hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipFg, bodyColor: t.tooltipFg, padding: 10, callbacks: { label: (c) => ' ' + c.label + ': ' + BRL(c.raw) } },
        },
      },
    });

    const legend = $('#chartCategoriaLegend');
    if (legend) {
      legend.innerHTML = labels.map((lb, i) =>
        `<li title="${escapeHtml(lb)}: ${BRL(data[i])}"><span class="sw" style="background:${colors[i] || t.muted}"></span><span class="nm">${escapeHtml(lb)}</span></li>`
      ).join('');
    }
  }

  function renderAtividades(propostas) {
    const body = $('#atividadesBody');
    body.innerHTML = '';
    const ordenadas = [...propostas].sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm)).slice(0, 5);
    if (!ordenadas.length) { body.innerHTML = '<tr class="empty-row"><td colspan="5">Mova um card no Funil para registrar atividade.</td></tr>'; return; }
    ordenadas.forEach(p => {
      const st = DB.STATUS[p.status];
      const item = p.itens[0] ? p.itens[0].nome + (p.itens.length > 1 ? ` +${p.itens.length - 1}` : '') : '—';
      const tr = el('tr');
      tr.innerHTML = `
        <td class="mono">${escapeHtml(p.id)}</td>
        <td><strong>${escapeHtml(p.cliente)}</strong></td>
        <td>${escapeHtml(item)}</td>
        <td class="mono">${BRL(DB.totalProposta(p))}</td>
        <td><span class="badge ${st.badge}">${st.label}</span></td>`;
      body.appendChild(tr);
    });
  }

  VIEWS.register('dashboard', {
    render() {
      const propostas = DB.getPropostas();
      renderKpis(computeKpis(propostas));
      if (window.Chart) { renderChartVendas(propostas); renderChartCategoria(propostas); }
      renderAtividades(propostas);
    },
  });
})();
