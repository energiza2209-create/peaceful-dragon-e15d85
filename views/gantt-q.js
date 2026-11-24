/* =========================================================
   TELA — Gantt de Manutenções Preventivas (Módulo Qualidade)
   Eixo Y: setores dos hospitais (UTI, Centro Cirúrgico, ...)
   Eixo X: linha do tempo (semanas).
   Barras das O.S. preventivas vindas do Auvo (tipo=preventiva).
   Vermelhas quando sla_estado='atrasado' ou concluido_em > sla_limite.
   ========================================================= */
(() => {
  let chart = null;

  function agruparPorSetor(osList) {
    const map = new Map();
    for (const o of osList) {
      const setor = o.setor || o.hospital || '—';
      if (!map.has(setor)) map.set(setor, []);
      map.get(setor).push(o);
    }
    return map;
  }

  function buildDatasets(setorMap) {
    const datasets = [];
    for (const [setor, oss] of setorMap.entries()) {
      for (const o of oss) {
        const inicio = new Date(o.entrado_em).getTime();
        const fim = o.concluido_em ? new Date(o.concluido_em).getTime() : (o.sla_limite ? new Date(o.sla_limite).getTime() : Date.now());
        const atrasada = o.sla_estado === 'atrasado' ||
          (o.concluido_em && o.sla_limite && new Date(o.concluido_em) > new Date(o.sla_limite));
        const bg = atrasada ? '#ef4444' : (o.concluido_em ? '#22c55e' : '#3b82f6');
        datasets.push({
          label: `${setor} — ${o.equipamento_desc || o.id}`,
          data: [[inicio, fim]],
          backgroundColor: bg,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
          detail: o,
        });
      }
    }
    return datasets;
  }

  async function render() {
    const root = $('#view-gantt-q');
    if (!root) return;
    root.innerHTML = `
      <div class="q-gantt-toolbar">
        <h2>Cronograma de Preventivas</h2>
        <div class="q-gantt-legend">
          <span><i class="q-legend-dot" style="background:#3b82f6"></i>Em andamento</span>
          <span><i class="q-legend-dot" style="background:#22c55e"></i>Concluída no prazo</span>
          <span><i class="q-legend-dot" style="background:#ef4444"></i>Atrasada</span>
        </div>
      </div>
      <div class="card chart-card q-gantt-wrap">
        <canvas id="qGanttChart"></canvas>
        <div class="q-empty" id="qGanttEmpty" style="display:none">Sem O.S. preventivas no Auvo.</div>
      </div>`;

    const supa = QDB.raw();
    let preventivas = [];
    if (supa) {
      const { data } = await supa.from('auvo_os').select('*').eq('tipo', 'preventiva');
      preventivas = data || [];
    }
    const cv = $('#qGanttChart');
    if (!preventivas.length) {
      if (cv) cv.style.display = 'none';
      const empty = $('#qGanttEmpty');
      if (empty) empty.style.display = '';
      return;
    }
    const setorMap = agruparPorSetor(preventivas);
    const datasets = buildDatasets(setorMap);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e6edf3' : '#0f1620';
    const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';

    if (chart) { chart.destroy(); chart = null; }
    if (!window.Chart) return;

    const hasTimeAdapter = !!(window.Chart.registry && window.Chart.registry.plugins && window.Chart.registry.plugins.get('adapter'));

    const baseOpts = (xType) => ({
      type: 'bar',
      data: { labels: datasets.map(d => d.label), datasets: [{ data: datasets.map(d => d.data[0]), backgroundColor: datasets.map(d => d.backgroundColor), barPercentage: 0.6, categoryPercentage: 0.85 }] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt, elements) => {
          if (!elements || !elements.length) return;
          const i = elements[0].index;
          abrirDetalhe(datasets[i].detail);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const d = datasets[ctx.dataIndex].detail;
                const inicio = new Date(d.entrado_em).toLocaleDateString('pt-BR');
                const sla = d.sla_limite ? new Date(d.sla_limite).toLocaleDateString('pt-BR') : '—';
                const concl = d.concluido_em ? new Date(d.concluido_em).toLocaleDateString('pt-BR') : 'em aberto';
                return [
                  `Equipamento: ${d.equipamento_desc || '—'}`,
                  `Hospital: ${d.hospital || '—'}`,
                  `Técnico: ${d.tecnico_nome || '—'}`,
                  `Entrada: ${inicio} · SLA: ${sla}`,
                  `Concluída: ${concl}`,
                  `SLA estado: ${d.sla_estado || '—'}`,
                ];
              },
              title: () => '',
            },
          },
        },
        scales: {
          x: xType === 'time'
            ? { type: 'time', time: { unit: 'week', tooltipFormat: 'dd/MM/yyyy', displayFormats: { week: 'dd/MM' } }, min: Date.now() - 60 * 86400000, max: Date.now() + 90 * 86400000, ticks: { color: textColor, maxRotation: 0 }, grid: { color: gridColor } }
            : { type: 'linear', min: Date.now() - 60 * 86400000, max: Date.now() + 90 * 86400000, ticks: { color: textColor, callback: (v) => new Date(Number(v)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor }, stacked: false },
        },
      },
    });

    chart = new Chart(cv.getContext('2d'), baseOpts(hasTimeAdapter ? 'time' : 'linear'));
  }

  function abrirDetalhe(o) {
    const supa = QDB.raw();
    if (!supa) return;
    const body = el('div', 'q-form');
    body.innerHTML = `
      <div class="q-checklist-info">
        <div><strong>O.S.:</strong> #${escapeHtml(o.numero || o.id)}</div>
        <div><strong>Equipamento:</strong> ${escapeHtml(o.equipamento_desc || '—')}</div>
        <div><strong>Setor:</strong> ${escapeHtml(o.setor || '—')}</div>
        <div><strong>Hospital:</strong> ${escapeHtml(o.hospital || '—')}</div>
        <div><strong>Técnico:</strong> ${escapeHtml(o.tecnico_nome || '—')}</div>
        <div><strong>SLA:</strong> ${o.sla_estado || '—'}</div>
        <div><strong>Entrada:</strong> ${fmtDate(o.entrado_em)}</div>
        <div><strong>SLA limite:</strong> ${o.sla_limite ? fmtDate(o.sla_limite) : '—'}</div>
        <div><strong>Concluída:</strong> ${o.concluido_em ? fmtDate(o.concluido_em) : 'em aberto'}</div>
      </div>
      <div><strong>Defeito relatado:</strong> ${escapeHtml(o.defeito_relatado || '—')}</div>
      <div><strong>Diagnóstico:</strong> ${escapeHtml(o.defeito_encontrado || '—')}</div>
      <div><strong>Peças usadas:</strong><ul>${(o.pecas_usadas || []).map(p => `<li>${escapeHtml(p.desc || '?')} ×${p.qtd || 1} — ${BRL(p.valor)}</li>`).join('') || '<li>Sem peças</li>'}</ul></div>`;
    Modal.open('Detalhes da Preventiva', body);
  }

  VIEWS.register('gantt-q', {
    title: 'Gantt Preventivas',
    render,
    refresh: render,
  });
})();
