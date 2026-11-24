/*
 * CONFIGURAÇÃO DO SUPABASE
 * ----------------------------------------------------------------------
 * SEGURANÇA: a chave abaixo é a "anon / public key". No Supabase ela é
 * EXPRESSAMENTE feita para rodar no navegador (client-side) e DEVE estar
 * protegida por Row Level Security (RLS) no painel do Supabase.
 *
 * NUNCA cole aqui a "service_role key" — ela bypassa o RLS e expõe o banco.
 *
 * Ainda não existe backend próprio: o app continua funcionando 100% offline
 * via localStorage. O Supabase entra como camada extra (modo híbrido): quando
 * houver conexão, os dados são espelhados na nuvem e sincronizados em tempo
 * real entre dispositivos.
 */
window.SUPABASE_URL = 'https://fhjihlndqfzzcqwoijmj.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_xVVI4WzaOUt9YoXvgFCHTw_M_2SZp5k';

window.supabaseClient = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY,
      {
        realtime: { params: { eventsPerSecond: 10 } },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }
    );
  }
} catch (e) {
  console.warn('[Supabase] cliente não inicializado:', e);
}
