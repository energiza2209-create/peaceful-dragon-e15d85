-- ============================================================
-- DIAGNÓSTICO — rode isto PRIMEIRO no SQL Editor do Supabase
-- Cole no SQL Editor e clique em RUN
-- ============================================================

-- (1) Tabelas do módulo Qualidade existem?
SELECT '1_tabelas_qualidade' AS step, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'auvo_os',
    'compras_solicitacoes',
    'compras_orcamentos',
    'checklist_templates',
    'checklist_respostas',
    'lembretes'
  )
ORDER BY table_name;

-- (2) Views de KPI existem?
SELECT '2_views_kpi' AS step, table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('kpi_mttr','kpi_retrabalho','kpi_sla_pct','kpi_resumo');

-- (3) Já existem OS no banco? (se esta query der erro, faltou a migration 006)
SELECT '3_count_auvo_os' AS step, count(*) AS total FROM auvo_os;

-- (4) Usuários no auth.users?
SELECT '4_auth_users' AS step, id, email, created_at::date FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- (5) Perfis existentes
SELECT '5_profiles' AS step, id, name, role FROM profiles LIMIT 10;

-- (6) Cron já agendado?
SELECT '6_cron_jobs' AS step, jobname, schedule, active FROM pg_cron.jobs;

-- (7) Secrets do vault (se você criou via vault)
-- SELECT '7_vault_secrets' AS step, name FROM vault.decrypted_secrets WHERE name LIKE 'auvo%';
