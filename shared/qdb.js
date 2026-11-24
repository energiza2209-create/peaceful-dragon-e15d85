/* =========================================================
   SIGEQ-Energiza — Camada de dados do modulo Qualidade
   Padrão híbrido (mesmo do Energiza):
   - LocalStorage como cache imediato
   - Supabase como fonte de verdade (Realtime)
   O Auvo NÃO é chamado daqui — Edge Function faz o sync.
   ========================================================= */
window.QDB = (() => {
  const KEY = 'SIGEQ_QUALITY_CACHE';
  const SUPA = () => window.supabaseClient;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }
  function saveCache(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('sigeq:data', { detail: data }));
  }

  return {
    SUPA: SUPA,

    async list(table, filter = {}, orderField = 'atualizado_em', ascDesc = { ascending: false }) {
      const S = SUPA();
      if (!S) return load()[table] || [];
      let q = S.from(table).select('*');
      Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data, error } = await q.order(orderField, ascDesc);
      if (error) {
        if (typeof logger !== 'undefined' && logger.warn) logger.warn('[QDB] list ' + table, error.message);
        else console.warn('[QDB] list', table, error.message);
      }
      return data || [];
    },

    async update(table, id, patch) {
      const S = SUPA();
      if (!S) {
        const cache = load();
        const arr = cache[table] || [];
        const i = arr.findIndex(r => r.id === id);
        if (i >= 0) { arr[i] = { ...arr[i], ...patch }; saveCache(cache); }
        return arr[i];
      }
      const { data, error } = await S.from(table).update(patch).eq('id', id).select().single();
      if (error) {
        if (typeof logger !== 'undefined' && logger.warn) logger.warn('[QDB] update ' + table, error.message);
        else console.warn('[QDB] update', table, error.message);
      }
      return data;
    },

    /* Move O.S. no Kanban — recalcula etapa_atual_desde + concluido_em */
    async moverOs(osId, novoStatus) {
      const patch = {
        status: novoStatus,
        etapa_atual_desde: new Date().toISOString(),
        concluido_em: novoStatus === 'manutencao_concluida' ? new Date().toISOString() : null,
      };
      return this.update('auvo_os', osId, patch);
    },

    /* Subscribe Realtime (só tabelas de qualidade) */
    subscribeRealtime(onChange) {
      const S = SUPA();
      if (!S) return () => {};
      const ch = S.channel('sigeq-radio')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'auvo_os' }, () => onChange())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'compras_solicitacoes' }, () => onChange())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_respostas' }, () => onChange())
        .subscribe();
      return () => S.removeChannel(ch);
    },

    raw() { return SUPA(); },
  };
})();
