-- =========================================================
-- SIGEQ-Energiza 010 — Lembretes e Notificações
-- Contratos de hospitais, calibração de padrões, auditorias.
-- =========================================================
create table if not exists lembretes (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  tipo            text not null check (tipo in ('contrato','calibracao','auditoria','manual')),
  descricao       text,

  -- "alvo" do lembrete (data a ser notificada)
  data_alvo       date not null,

  -- recorrência (opcional)
  recorrente      boolean default false,
  recorrencia_dias integer,                       -- 7, 15, 30, 90, 365...

  -- status
  concluido       boolean default false,
  notificado_em   timestamptz,                    -- último push/email disparado

  hospital        text,                           -- opcional
  equipamento_id  text,                           -- opcional
  criado_por      uuid references auth.users(id),
  criado_em       timestamptz default now(),
  atualizado_em   timestamptz default now()
);

-- trigger updated_at
create or replace function trg_lembretes_updated_at()
returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;

drop trigger if exists trg_lembretes_updatets on lembretes;
create trigger trg_lembretes_updatets
before update on lembretes
for each row execute function trg_lembretes_updated_at();

-- RLS
alter table lembretes enable row level security;
do $$ begin
  create policy "coord_lembretes_all" on lembretes
    for all using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- índices
create index if not exists idx_lembretes_data_alvo on lembretes(data_alvo);
create index if not exists idx_lembretes_concluido on lembretes(concluido);
create index if not exists idx_lembretes_tipo on lembretes(tipo);
