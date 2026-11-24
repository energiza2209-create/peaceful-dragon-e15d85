// =========================================================
// SIGEQ-Q — Edge Function: auvo-sync
// Sincroniza Tarefas (O.S.) do Auvo para a tabela auvo_os.
// Roda via Cron (Supabase Scheduler) a cada 10 min.
// Secrets necessários:
//   AUVO_APP_KEY, AUVO_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE
// =========================================================

const AUVO_BASE = 'https://api.auvo.com.br/v2/';

Deno.serve(async (req: Request) => {
const AUVO_APPKEY   = Deno.env.get('AUVO_APP_KEY')!;
const AUVO_APITOKEN = Deno.env.get('AUVO_API_TOKEN')!;
const SUPA_URL      = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL')!;
const SERVICE       = Deno.env.get('SUPABASE_SERVICE_ROLE') || Deno.env.get('SERVICE_ROLE_KEY')!;

console.log('[auvo-sync] init — envauvo APP_KEY?', !!AUVO_APPKEY, 'API_TOKEN?', !!AUVO_APITOKEN, 'SUPA_URL?', !!SUPA_URL, 'SERVICE?', !!SERVICE);
console.log('[auvo-sync] SUPA_URL =', SUPA_URL || '(undefined)');

if (!AUVO_APITOKEN || !AUVO_APPKEY) {
  return json({ error: 'missing Auvo creds', has_appkey: !!AUVO_APPKEY, has_token: !!AUVO_APITOKEN }, 500);
}
if (!SUPA_URL || !SERVICE) {
  return json({ error: 'missing Supabase env', has_url: !!SUPA_URL, has_service: !!SERVICE, hint: 'Supabase injeta SUPABASE_URL e SUPABASE_SERVICE_ROLE automaticamente em Edge Functions' }, 500);
}

  // 1. Login Auvo — POST /v2/login {apiKey, apiToken} -> result.accessToken
  const loginRes = await fetch(AUVO_BASE + 'login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: AUVO_APPKEY, apiToken: AUVO_APITOKEN }),
  });
  const login = await loginRes.json();
  console.log('[auvo-sync] login status', loginRes.status, 'response:', JSON.stringify(login).slice(0, 400));
  if (!login?.result?.accessToken) {
    return json({ error: 'auvo login failed', status: loginRes.status, detail: login }, 502);
  }
  const TOKEN = login.result.accessToken;

  // 2. Pega tarefas atualizadas nos últimos 30 min (janela do cron).
  //    Se header X-Full-Sync: true, puxa últimos 30 dias (primeira execução).
  const janelaMin = 30;
  const fullSync = req.headers.get('X-Full-Sync') === 'true';
  const desdeDate = fullSync
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - janelaMin * 60 * 1000);

  const startDate = desdeDate.toISOString().slice(0, 10);
  const endDate = new Date().toISOString().slice(0, 10);
  console.log('[auvo-sync] buscando tarefas de', startDate, 'até', endDate, 'fullSync:', fullSync);

  const tarefas: any[] = [];
  let page = 1;
  const pageSize = 100;
  let total = 0;

  do {
    const paramFilter = JSON.stringify({ startDate, endDate });
    const url = `${AUVO_BASE}tasks?paramFilter=${encodeURIComponent(paramFilter)}&page=${page}&pageSize=${pageSize}&order=desc`;
    const tRes = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    });
    const tData = await tRes.json();
    const pageItems: any[] = tData?.result?.entityList ?? [];
    total = tData?.result?.pagedSearchReturnData?.totalItems ?? 0;
    console.log('[auvo-sync] page', page, 'items:', pageItems.length, 'total auvo:', total);
    if (page === 1 && total === 0) {
      console.log('[auvo-sync] ⚠ ZERO tarefas no Auvo para este período. Resposta:', JSON.stringify(tData).slice(0, 500));
    }
    tarefas.push(...pageItems);
    if (pageItems.length < pageSize) break;
    page++;
    if (page > 50) break; // hard limit
  } while (tarefas.length < total);

  if (!tarefas.length) {
    return json({ synced: 0, janela_min: janelaMin, desde: startDate, full_sync: fullSync });
  }

  // 3. Mapeia Auvo -> schema SIGEQ
  const rows = tarefas.map(mapAuvoTarefa).filter(Boolean);
  if (!rows.length) {
    return json({ synced: 0, total_auvo: tarefas.length });
  }

  // 4. Upsert em auvo_os via REST API (service_role bypassa RLS)
  console.log('[auvo-sync] upsert em', `${SUPA_URL}/rest/v1/auvo_os`, 'de', rows.length, 'rows');
  const upsertRes = await fetch(`${SUPA_URL}/rest/v1/auvo_os?on_conflict=id`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE}`,
      'apikey': SERVICE,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!upsertRes.ok) {
    const errTxt = await upsertRes.text();
    console.error('[auvo-sync] ❌ upsert FAILED', upsertRes.status, errTxt.slice(0, 500));
    return json({ error: 'upsert fail', status: upsertRes.status, detail: errTxt }, 500);
  }
  console.log('[auvo-sync] ✅ upsert OK', upsertRes.status);

  return json({
    synced: rows.length,
    total_auvo: tarefas.length,
    janela_min: janelaMin,
    desde: startDate,
    ate: endDate,
    full_sync: fullSync,
  });
});

// -------- Mapeamento Auvo Tarefa -> SIGEQ auvo_os --------
function mapAuvoTarefa(t: any) {
  if (!t?.taskID && !t?.id) return null;
  const id = String(t.taskID ?? t.id);

  const finished: boolean = t.finished === true;
  const status = mapearStatusAuvo(t.taskStatus, finished, t.pendency);

  const tipoDesc: string = t.taskTypeDescription ?? '';
  const tipo = mapTipo(tipoDesc);

  const equipId = Array.isArray(t.equipmentsId) && t.equipmentsId.length
    ? String(t.equipmentsId[0]) : (t.equipmentId ? String(t.equipmentId) : null);

  const pecasUsadas = [
    ...(Array.isArray(t.products) ? t.products.map((p: any) => ({
      sku: String(p.id ?? p.productID ?? ''),
      qtd: p.quantity ?? 1,
      desc: p.name ?? p.description ?? null,
      valor: Number(p.value ?? p.totalValue ?? 0),
    })) : []),
    ...(Array.isArray(t.services) ? t.services.map((s: any) => ({
      sku: String(s.id ?? s.serviceID ?? ''),
      qtd: s.quantity ?? 1,
      desc: s.name ?? s.description ?? null,
      valor: Number(s.value ?? s.totalValue ?? 0),
    })) : []),
  ];

  let tempoH: number | null = null;
  if (t.durationDecimal) tempoH = parseFloat(String(t.durationDecimal).replace(',', '.'));
  else if (t.checkInDate && t.checkOutDate && t.checkIn && t.checkOut) {
    const ms = new Date(t.checkOutDate).getTime() - new Date(t.checkInDate).getTime();
    if (ms > 0) tempoH = Math.round((ms / 3600000) * 100) / 100;
  }

  const aberturaISO = toISO(t.creationDate) || toISO(t.taskDate) || new Date().toISOString();
  const atualizadoISO = toISO(t.dateLastUpdate) || aberturaISO;
  const concluidoISO = finished ? (toISO(t.checkOutDate) || atualizadoISO) : null;

  return {
    id,
    auvo_id: id,
    numero: t.externalId ? String(t.externalId) : id,
    tipo,
    status,
    equipamento_id: equipId,
    equipamento_desc: null,
    setor: null,
    hospital: t.customerDescription ?? t.customerName ?? null,
    defeito_relatado: t.orientation ?? null,
    defeito_encontrado: t.report ?? null,
    pecas_usadas: pecasUsadas,
    tempo_atendimento_h: tempoH,
    tecnico_id: t.idUserTo ? String(t.idUserTo) : (t.idUserFrom ? String(t.idUserFrom) : null),
    tecnico_nome: t.userToName ?? t.userFromName ?? null,
    entrado_em: aberturaISO,
    etapa_atual_desde: atualizadoISO,
    concluido_em: concluidoISO,
    sla_limite: calcSlaLimite(tipo, aberturaISO),
    raw: t,
  };
}

function mapTipo(desc: string): 'corretiva' | 'preventiva' | 'calibracao' {
  const s = (desc || '').toLowerCase();
  if (/prevent/i.test(s)) return 'preventiva';
  if (/calibr/i.test(s)) return 'calibracao';
  return 'corretiva';
}

function mapearStatusAuvo(
  taskStatus: number,
  finished: boolean,
  pendency: any
): 'recebido' | 'em_analise' | 'aguardando_peca' | 'manutencao_concluida' | 'liberacao_qualidade' | 'liberado' {
  const cod = Number(taskStatus);
  // Finalizada (com ou sem pendência de checklist/qualidade)
  if (finished === true) {
    const temPendencia = pendency && String(pendency).trim().length > 0;
    return temPendencia ? 'liberacao_qualidade' : 'manutencao_concluida';
  }
  // Em aberto / em execução
  if (cod === 0) return 'recebido';        // Aberta
  if (cod === 4) return 'aguardando_peca'; // Pendente (aguardando peça)
  // 1,2,3 (deslocamento / no local / em atendimento) e demais => em análise
  return 'em_analise';
}

function calcSlaLimite(tipo: string, abertura: string) {
  const h = /prevent/.test(tipo) ? 48
          : /calibr/.test(tipo) ? 24
          : 72;
  return new Date(new Date(abertura).getTime() + h * 3600 * 1000).toISOString();
}

function toISO(dateStr: string | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
