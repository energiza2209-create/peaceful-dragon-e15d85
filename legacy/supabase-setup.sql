-- ============================================================
-- ENERGIZA CRM → SUPABASE (negociações/propostas)
-- ============================================================

create table if not exists public.negociacoes (
  "id"          text primary key,
  "data"        jsonb not null,
  "updated_at"  timestamptz not null default now(),
  "user_id"     text not null default ''
);

create index if not exists negociacoes_updated_at_idx
  on public.negociacoes ("updated_at" desc);

ALTER TABLE public.negociacoes ADD COLUMN IF NOT EXISTS "user_id" TEXT NOT NULL DEFAULT '';

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'negociacoes'
  ) then
    alter publication supabase_realtime add table public.negociacoes;
  end if;
end $$;

alter table public.negociacoes enable row level security;

drop policy if exists "negociacoes_anon_all" on public.negociacoes;
create policy "negociacoes_anon_all" on public.negociacoes
  for all
  to anon
  using (true)
  with check (true);
