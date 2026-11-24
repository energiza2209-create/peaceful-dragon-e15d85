-- ============================================================
-- AGENDAR CRON — sync automático a cada 10 minutos
-- ANTES de rodar: substitua COLE_SUA_SERVICE_ROLE_AQUI pela
-- sua service_role completa (Dashboard -> Settings -> API)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento antigo (se existir)
SELECT cron.unschedule('auvo-sync');

-- Agenda o sync a cada 10 minutos.
-- IMPORTANTE: substitua o placeholder abaixo pela sua service_role.
SELECT cron.schedule(
  'auvo-sync',
  '*/10 * * * *',
  $$
    SELECT net.http_post(
      url    := 'https://fhjihlndqfzzcqwoijmj.functions.supabase.co/auvo-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer COLE_SUA_SERVICE_ROLE_AQUI'
      )
    );
  $$
);

-- Confirme que agendou
SELECT jobid, jobname, schedule, active FROM pg_cron.jobs;
