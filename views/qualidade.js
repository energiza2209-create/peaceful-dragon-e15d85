/* =========================================================
   TELA — Dashboard de Qualidade (KPIs do módulo SIGEQ)
   Fonte: views materializadas (kpi_mttr, kpi_retrabalho,
          kpi_sla_pct, kpi_resumo) no Supabase.
   ========================================================= */
(() => {
  let chart = null;

  function set(sel, v) {
    const n = $(sel);
    if (n) n.textContent = v ?? '—';
  }

  function skeleton() {
    return `
      <div class="kpi-grid">
        <div class="kpi-card" id="qKpiBacklog">
          <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M3 13h8V3H3zM13 21h8V11h-8z"/></svg></div>
          <div class="kpi-body"><span class="kpi-label">Backlog Qualidade</span><strong class="kpi-value">—</strong><span class="kpi-trend">O.S. não liberadas</span></div>
        </div>
        <div class="kpi-card" id="qKpiAtraso">
          <div class="kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l3 2"/></svg></div>
          <div class="kpi-body"><span class="kpi-label">Críticos em Atraso</span><strong class="kpi-value">—</strong><span class="kpi-trend" style="color:var(--danger,#ef4444)">SLA vencido</span></div>
        </div>
        <div class="kpi-card" id="qKpiSla">
          <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
          <div class="kpi-body"><span class="kpi-label">SLA % (global)</span><strong class="kpi-value">—</strong><span class="kpi-trend">Concluídas no prazo</span></div>
        </div>
        <div class="kpi-card" id="qKpiMttr">
          <div class="kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
          <div class="kpi-body"><span class="kpi-label">MTTR (h)</span><strong class="kpi-value">—</strong><span class="kpi-trend">Tempo médio de reparo</span></div>
        </div>
        <div class="kpi-card" id="qKpiRetrabalho">
          <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9M3 3v6h6"/></svg></div>
          <div class="kpi-body"><span class="kpi-label">Taxa de Retrabalho</span><strong class="kpi-value">—</strong><span class="kpi-trend">Mesmo defeito em < 30d</span></div>
        </div>
        <div class="kpi-card" id="qKpiMinhaMesa">
          <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
          <div class="kpi-body"><span class="kpi-label">Na minha mesa</span><strong class="kpi-value">—</strong><span class="kpi-trend">Aguardando liberação</span></div>
        </div>
      </div>
      <div class="card chart-card">
        <div class="card-head"><h2>MTTR × SLA %</h2><span class="card-sub">Últimas 12 semanas</span></div>
        <div class="chart-wrap"><canvas id="qKpiChart"></canvas></div>
      </div>`;
  }

  async function carregarCards() {
    const supa = QDB.raw();
    if (!supa) return;
    const { data } = await supa.from('kpi_resumo').select('*').limit(1).maybeSingle();
    if (!data) return;
    set('#qKpiBacklog .kpi-value', data.backlog_total);
    set('#qKpiAtraso .kpi-value', data.criticos_atraso);
    set('#qKpiSla .kpi-value', (data.sla_pct_global || 0).toFixed(1) + '%');
    set('#qKpiMttr .kpi-value', (data.mttr_horas_global || 0).toFixed(1) + 'h');
    set('#qKpiRetrabalho .kpi-value', (data.retrabalho_global || 0).toFixed(1) + '%');
    set('#qKpiMinhaMesa .kpi-value', data.na_minha_mesa);
  }

  async function carregarGrafico() {
    const supa = QDB.raw();
    if (!supa || !window.Chart || !$('#qKpiChart')) return;
    const [{ data: mttr }, { data: slap }] = await Promise.all([
      supa.from('kpi_mttr').select('*').order('semana').limit(12),
      supa.from('kpi_sla_pct').select('*').order('semana').limit(12),
    ]);
    const labels = (mttr || []).map((r) =>
      new Date(r.semana).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
    const textColor = isDark ? '#e6edf3' : '#0f1620';
    if (chart) chart.destroy();
    chart = new Chart($('#qKpiChart').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'MTTR (h)', data: (mttr || []).map((r) => Math.round(r.mttr_horas) || 0), borderColor: '#3b82f6', yAxisID: 'y', tension: .3 },
          { label: 'SLA %', data: (slap || []).map((r) => r.sla_pct), borderColor: '#22c55e', yAxisID: 'y1', borderDash: [4, 4], tension: .3 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
          y:  { ticks: { color: textColor }, grid: { color: gridColor }, title: { display: true, text: 'MTTR (h)', color: textColor } },
          y1: { ticks: { color: textColor }, grid: { drawOnChartArea: false }, position: 'right', title: { display: true, text: 'SLA %', color: textColor } },
          x:  { ticks: { color: textColor }, grid: { color: gridColor } },
        },
      },
    });
  }

  async function render() {
    const root = $('#view-qualidade');
    if (!root) return;
    root.innerHTML = skeleton();
    await carregarCards();
    await carregarGrafico();
  }

  VIEWS.register('qualidade', {
    title: 'Dashboard Qualidade',
    render,
    refresh: render,
  });
})();
