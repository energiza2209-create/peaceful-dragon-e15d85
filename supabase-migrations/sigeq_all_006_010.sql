-- =========================================================
-- SIGEQ-Energiza — Script ÚNICO consolidado (migrations 006-010)
-- CORRIGIDO — bug do "case" sem "select" resolvido
-- Rodar no Supabase SQL Editor: https://supabase.com/dashboard/project/fhjihlndqfzzcqwoijmj/sql/new
-- Idempotente (pode rodar mais de uma vez sem erro)
-- =========================================================

-- =========================================================
-- 006 — auvo_os (espelho das O.S. vindas do Auvo via Edge Function)
-- =========================================================
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

create table if not exists auvo_os (
  id                  text primary key,
  auvo_id             text unique,
  numero              text,
  tipo                os_tipo not null default 'corretiva',
  status              os_status not null default 'recebido',
  equipamento_id      text,
  equipamento_desc    text,
  setor               text,
  hospital            text,
  defeito_relatado    text,
  defeito_encontrado  text,
  pecas_usadas        jsonb default '[]',
  tempo_atendimento_h numeric(6,2),
  tecnico_id          text,
  tecnico_nome        text,
  entrado_em          timestamptz not null default now(),
  etapa_atual_desde   timestamptz not null default now(),
  concluido_em        timestamptz,
  liberado_em         timestamptz,
  sla_limite          timestamptz,
  sla_estado          sla_estado not null default 'no_prazo',
  checklist_entrada_id uuid,
  checklist_saida_id   uuid,
  validado_por        uuid references auth.users(id),
  raw                 jsonb,
  atualizado_em       timestamptz not null default now()
);

create or replace view os_retrabalho as
select
  o.id, o.equipamento_id, o.defeito_relatado,
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

-- Função SQL — corpo deve ser um SELECT (não soltar case direto)
create or replace function calc_sla_estado(limite timestamptz, desde timestamptz)
returns sla_estado language sql stable as $$
  select (case
    when limite is null then 'no_prazo'
    when now() > limite then 'atrasado'
    when now() > limite - interval '1 day' then 'atencao'
    else 'no_prazo'
  end)::sla_estado
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

alter table auvo_os enable row level security;
do $$ begin
  create policy "coord_le_tudo" on auvo_os for select
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "coord_altera_status" on auvo_os for update
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

create index if not exists idx_auvo_os_status on auvo_os(status);
create index if not exists idx_auvo_os_setor on auvo_os(setor);
create index if not exists idx_auvo_os_equip on auvo_os(equipamento_id);
create index if not exists idx_auvo_os_sla   on auvo_os(sla_estado);
create index if not exists idx_auvo_os_tipo  on auvo_os(tipo);

-- =========================================================
-- 007 — Checklists dinâmicos
-- =========================================================
create table if not exists checklist_templates (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  tipo_equipamento text not null,
  itens_entrada    jsonb not null default '[]',
  itens_saida      jsonb not null default '[]',
  ativo            boolean default true,
  criado_em        timestamptz default now(),
  atualizado_em    timestamptz default now()
);

create table if not exists checklist_respostas (
  id                uuid primary key default gen_random_uuid(),
  os_id             text references auvo_os(id) on delete cascade,
  template_id       uuid references checklist_templates(id),
  tipo              text not null check (tipo in ('entrada','saida')),
  respostas         jsonb not null default '{}',
  aprovado          boolean default false,
  observacao        text,
  assinatura_email  text,
  assinatura_ts     timestamptz,
  assinatura_hash   text,
  criado_por        uuid references auth.users(id),
  criado_em         timestamptz default now()
);

create or replace function trg_liberar_os()
returns trigger language plpgsql as $$
begin
  if new.tipo = 'saida' and new.aprovado and new.assinatura_ts is not null then
    update auvo_os
       set status = 'liberado', liberado_em = now(),
           checklist_saida_id = new.id, validado_por = new.criado_por
     where id = new.os_id;
  elsif new.tipo = 'entrada' and new.aprovado then
    update auvo_os set checklist_entrada_id = new.id where id = new.os_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_checklist_libera on checklist_respostas;
create trigger trg_checklist_libera
after insert or update on checklist_respostas
for each row execute function trg_liberar_os();

alter table checklist_templates enable row level security;
alter table checklist_respostas enable row level security;
do $$ begin
  create policy "coord_crud_templates" on checklist_templates
    for all using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "coord_crud_respostas" on checklist_respostas
    for all using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- =========================================================
-- 008 — Compras & Orçamentos (exige 3 validados)
-- =========================================================
create table if not exists compras_solicitacoes (
  id              uuid primary key default gen_random_uuid(),
  os_id           text references auvo_os(id) on delete set null,
  equipamento_id  text,
  peca_desc       text not null,
  qtd             integer not null default 1,
  status          text not null default 'orcamentos_coletando',
  orcamentos_aprovados integer default 0,
  valor_escolhido      numeric(12,2),
  fornecedor_escolhido text,
  criada_por      uuid references auth.users(id),
  criada_em       timestamptz default now(),
  atualizada_em   timestamptz default now()
);

create table if not exists compras_orcamentos (
  id              uuid primary key default gen_random_uuid(),
  solicitacao_id  uuid references compras_solicitacoes(id) on delete cascade,
  fornecedor      text not null,
  valor_unitario  numeric(12,2) not null,
  valor_total     numeric(12,2),
  prazo           date,
  anexo_url       text,
  validado        boolean default false,
  observacao      text,
  criado_em       timestamptz default now()
);

create or replace function trg_orcamentos_count()
returns trigger language plpgsql as $$
declare total integer;
begin
  select count(*) into total
    from compras_orcamentos
   where solicitacao_id = coalesce(new.solicitacao_id, old.solicitacao_id)
     and validado = true;
  update compras_solicitacoes
     set orcamentos_aprovados = total, atualizada_em = now()
   where id = coalesce(new.solicitacao_id, old.solicitacao_id);
  return coalesce(new, old);
end $$;

drop trigger if exists trg_orc_count on compras_orcamentos;
create trigger trg_orc_count
after insert or update or delete on compras_orcamentos
for each row execute function trg_orcamentos_count();

create or replace function trg_compra_aprovar()
returns trigger language plpgsql as $$
begin
  if new.status = 'aprovada' and new.orcamentos_aprovados < 3 then
    raise exception 'São obrigatórios 3 orçamentos validados para aprovar a compra';
  end if;
  return new;
end $$;

drop trigger if exists trg_compra_aprovar on compras_solicitacoes;
create trigger trg_compra_aprovar
before update of status on compras_solicitacoes
for each row execute function trg_compra_aprovar();

alter table compras_solicitacoes enable row level security;
alter table compras_orcamentos enable row level security;
do $$ begin
  create policy "coord_compras_all" on compras_solicitacoes
    for all using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "coord_orcamentos_all" on compras_orcamentos
    for all using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- =========================================================
-- 009 — Views de KPI (Dashboard)
-- =========================================================
create or replace view kpi_mttr as
select
  date_trunc('week', entrado_em) as semana,
  tipo,
  count(*) as total_os,
  avg(extract(epoch from (coalesce(concluido_em, now()) - entrado_em)) / 3600) as mttr_horas
from auvo_os
where concluido_em is not null
group by 1, 2;

create or replace view kpi_retrabalho as
with retrab as (
  select distinct o.id from auvo_os o join os_retrabalho r on r.id = o.id
)
select
  date_trunc('week', o.entrado_em) as semana,
  count(*) as total_os,
  count(r.id) as retrabalhos,
  coalesce(round(count(r.id)::numeric / nullif(count(*),0) * 100, 1), 0) as taxa_retrabalho_pct
from auvo_os o
left join retrab r on r.id = o.id
group by 1
order by 1;

create or replace view kpi_sla_pct as
select
  date_trunc('week', entrado_em) as semana,
  count(*) as total,
  count(*) filter (where sla_estado = 'no_prazo') as no_prazo,
  count(*) filter (where sla_estado = 'atencao') as atencao,
  count(*) filter (where sla_estado = 'atrasado') as atrasados,
  coalesce(round(count(*) filter (where sla_estado = 'no_prazo')::numeric / nullif(count(*),0) * 100, 1), 0) as sla_pct
from auvo_os
group by 1
order by 1;

create or replace view kpi_resumo as
select
  count(*) filter (where status <> 'liberado') as backlog_total,
  count(*) filter (where sla_estado = 'atrasado') as criticos_atraso,
  count(*) filter (where status = 'aguardando_peca') as aguardando_pecas,
  count(*) filter (where status = 'liberacao_qualidade') as na_minha_mesa,
  coalesce((select round(count(*) filter (where sla_estado = 'no_prazo')::numeric / nullif(count(*),0) * 100, 1) from auvo_os), 0) as sla_pct_global,
  (select round(avg(mttr_horas)::numeric, 1) from kpi_mttr) as mttr_horas_global,
  (select round(avg(taxa_retrabalho_pct)::numeric, 1) from kpi_retrabalho) as retrabalho_global
from auvo_os;

-- =========================================================
-- 010 — Lembretes (contratos, calibração, auditorias)
-- =========================================================
create table if not exists lembretes (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  tipo            text not null check (tipo in ('contrato','calibracao','auditoria','manual')),
  descricao       text,
  data_alvo       date not null,
  recorrente      boolean default false,
  recorrencia_dias integer,
  concluido       boolean default false,
  notificado_em   timestamptz,
  hospital        text,
  equipamento_id  text,
  criado_por      uuid references auth.users(id),
  criado_em       timestamptz default now(),
  atualizado_em   timestamptz default now()
);

create or replace function trg_lembretes_updated_at()
returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;

drop trigger if exists trg_lembretes_updatets on lembretes;
create trigger trg_lembretes_updatets
before update on lembretes
for each row execute function trg_lembretes_updated_at();

alter table lembretes enable row level security;
do $$ begin
  create policy "coord_lembretes_all" on lembretes
    for all using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

create index if not exists idx_lembretes_data_alvo on lembretes(data_alvo);
create index if not exists idx_lembretes_concluido on lembretes(concluido);
create index if not exists idx_lembretes_tipo on lembretes(tipo);

-- =========================================================
-- FIM — Tabelas criadas:
--   auvo_os, checklist_templates, checklist_respostas,
--   compras_solicitacoes, compras_orcamentos, lembretes
--   Views: os_retrabalho, kpi_mttr, kpi_retrabalho, kpi_sla_pct, kpi_resumo
-- =========================================================
