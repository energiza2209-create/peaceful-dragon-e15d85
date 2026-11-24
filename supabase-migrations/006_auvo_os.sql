-- =========================================================
-- SIGEQ-Q 001 — Schema Auvo
-- Tabelas que espelham O.S. vindas da Edge Function auvo-sync.
-- Idempotente (IF NOT EXISTS).
-- =========================================================

-- Tipos Auxiliares ------------------------------------------
do $$ begin
  create type os_status as enum (
    'recebido', 'em_analise', 'aguardando_peca',
    'manutencao_concluida', 'liberacao_qualidade', 'liberado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type os_tipo as enum ('corretiva', 'preventiva', 'calibracao');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sla_estado as enum ('no_prazo', 'atencao', 'atrasado');
exception when duplicate_object then null; end $$;

-- Tabela principal de O.S. ----------------------------------
create table if not exists auvo_os (
  id                  text primary key,        -- id externo Auvo
  auvo_id             text unique,
  numero              text,
  tipo                os_tipo not null default 'corretiva',
  status              os_status not null default 'recebido',

  -- Equipamento
  equipamento_id      text,
  equipamento_desc    text,
  setor               text,                    -- UTI, Centro Cirúrgico...
  hospital            text,

  -- Diagnóstico
  defeito_relatado    text,
  defeito_encontrado  text,
  pecas_usadas        jsonb default '[]',       -- [{sku, qtd, desc, valor}]
  tempo_atendimento_h numeric(6,2),

  -- Técnico
  tecnico_id          text,
  tecnico_nome        text,

  -- SLA
  entrado_em          timestamptz not null default now(),
  etapa_atual_desde   timestamptz not null default now(),
  concluido_em        timestamptz,
  liberado_em         timestamptz,
  sla_limite          timestamptz,
  sla_estado          sla_estado not null default 'no_prazo',

  -- Qualidade
  checklist_entrada_id uuid,
  checklist_saida_id   uuid,
  validado_por         uuid references auth.users(id),

  -- Source
  raw                 jsonb,                   -- payload completo Auvo
  atualizado_em        timestamptz not null default now()
);

-- Detecta retrabalho: mesmo equipamento + mesmo defeito em <30 dias
create or replace view os_retrabalho as
select
  o.id,
  o.equipamento_id,
  o.defeito_relatado,
  prev.id as os_anterior_id,
  prev.concluido_em as anterior_concluida_em,
  date_part('day', o.entrado_em - prev.concluido_em) as dias_desde_ultima
from auvo_os o
join auvo_os prev
  on prev.equipamento_id = o.equipamento_id
 and prev.defeito_relatado = o.defeito_relatado
 and prev.concluido_em is not null
 and o.entrado_em > prev.concluido_em
 and o.entrado_em <= prev.concluido_em + interval '30 days';

-- Atualiza SLA automaticamente -----------------------------
create or replace function calc_sla_estado(limite timestamptz, desde timestamptz)
returns sla_estado language sql immutable as $$
  case
    when limite is null then 'no_prazo'
    when now() > limite then 'atrasado'
    when now() > limite - interval '1 day' then 'atencao'
    else 'no_prazo'
  end
$$;

create or replace function trg_calc_sla()
returns trigger language plpgsql as $$
begin
  new.sla_estado := calc_sla_estado(new.sla_limite, new.etapa_atual_desde);
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists trg_sla on auvo_os;
create trigger trg_sla before insert or update on auvo_os
for each row execute function trg_calc_sla();

-- RLS -------------------------------------------------------
alter table auvo_os enable row level security;
do $$ begin
  create policy "coord_le_tudo" on auvo_os for select
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "coord_altera_status" on auvo_os for update
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- Índices ---------------------------------------------------
create index if not exists idx_auvo_os_status on auvo_os(status);
create index if not exists idx_auvo_os_setor on auvo_os(setor);
create index if not exists idx_auvo_os_equip on auvo_os(equipamento_id);
create index if not exists idx_auvo_os_sla   on auvo_os(sla_estado);
create index if not exists idx_auvo_os_tipo  on auvo_os(tipo);
