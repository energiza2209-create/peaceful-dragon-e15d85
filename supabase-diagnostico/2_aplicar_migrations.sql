-- ============================================================
-- APPLY MIGRATIONS 006-010 ( módulo Qualidade )
-- Rode SÓ SE o diagnóstico mostrou que faltam tabelas/views.
-- É idempotente — pode rodar à vontade que não duplica nada.
-- ============================================================

-- ============= 006_auvo_os.sql =============
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
  validado_por         uuid references auth.users(id),
  raw                 jsonb,
  atualizado_em        timestamptz not null default now()
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

-- ============= 007_checklists_qualidade.sql =============
create table if not exists checklist_templates (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  tipo_equipamento text,
  itens_entrada    jsonb not null default '[]',
  itens_saida      jsonb not null default '[]',
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);

create table if not exists checklist_respostas (
  id              uuid primary key default gen_random_uuid(),
  os_id           text references auvo_os(id) on delete cascade,
  tipo             text not null check (tipo in ('entrada','saida')),
  template_id     uuid references checklist_templates(id) on delete set null,
  respostas       jsonb not null default '[]',
  aprovado        boolean not null default false,
  assinatura_hash  text,
  assinatura_ts    timestamptz,
  assinado_por     uuid references auth.users(id),
  criado_em        timestamptz not null default now()
);

create or replace function trg_checklist_saida_liberar()
returns trigger language plpgsql as $$
begin
  if new.tipo = 'saida' and new.assinatura_ts is not null and new.aprovado = true then
    update auvo_os
      set status = 'liberado',
          liberado_em = now(),
          checklist_saida_id = new.id
      where id = new.os_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_checklist_saida on checklist_respostas;
create trigger trg_checklist_saida
  after insert or update on checklist_respostas
  for each row execute function trg_checklist_saida_liberar();

do $$ begin
  create policy "checklist_le_tudo" on checklist_respostas for select
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "checklist_insert" on checklist_respostas for insert
    with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "checklist_update" on checklist_respostas for update
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "templates_le" on checklist_templates for select
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "templates_manage" on checklist_templates for all
    using (auth.uid() is not null) with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- ============= 008_compras_pecas.sql =============
create table if not exists compras_solicitacoes (
  id                   uuid primary key default gen_random_uuid(),
  os_id                text references auvo_os(id) on delete set null,
  equipamento_id       text,
  peca_desc            text not null default 'Peça não especificada',
  qtd                  integer not null default 1,
  status               text not null default 'em_coleta' check (status in ('em_coleta','aprovada','reprovada','recebida')),
  orcamentos_aprovados integer not null default 0,
  valor_escolhido      numeric(12,2),
  fornecedor_escolhido text,
  criado_por           uuid references auth.users(id),
  criado_em            timestamptz not null default now(),
  atualizada_em        timestamptz not null default now()
);

create table if not exists compras_orcamentos (
  id              uuid primary key default gen_random_uuid(),
  solicitacao_id  uuid references compras_solicitacoes(id) on delete cascade,
  fornecedor      text not null default 'Fornecedor não informado',
  valor_unitario  numeric(12,2) not null default 0,
  prazo           text,
  observacoes     text,
  validado        boolean not null default false,
  criado_em       timestamptz not null default now()
);

create or replace function trg_orcamento_recompute()
returns trigger language plpgsql as $$
begin
  update compras_solicitacoes
    set orcamentos_aprovados = (
      select count(*) from compras_orcamentos
      where solicitacao_id = coalesce(new.solicitacao_id, old.solicitacao_id)
        and validado = true
    )
  where id = coalesce(new.solicitacao_id, old.solicitacao_id);
  return coalesce(new, old);
end $$;

drop trigger if exists trg_orcamentos on compras_orcamentos;
create trigger trg_orcamentos
  after insert or update or delete on compras_orcamentos
  for each row execute function trg_orcamento_recompute();

do $$ begin
  create policy "compras_le" on compras_solicitacoes for select
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "compras_insert" on compras_solicitacoes for insert
    with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "compras_update" on compras_solicitacoes for update
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "orcamentos_le" on compras_orcamentos for select
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "orcamentos_insert" on compras_orcamentos for insert
    with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "orcamentos_update" on compras_orcamentos for update
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "orcamentos_delete" on compras_orcamentos for delete
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- ============= 009_kpi_views_qualidade.sql =============
create or replace view kpi_mttr as
select
  date_trunc('week', entrado_em) as semana,
  tipo,
  count(*)                       as total_os,
  avg(
    extract(epoch from (coalesce(concluido_em, now()) - entrado_em)) / 3600
  ) as mttr_horas
from auvo_os
where concluido_em is not null
group by 1, 2;

create or replace view kpi_retrabalho as
with retrab as (
  select distinct o.id
    from auvo_os o
    join os_retrabalho r on r.id = o.id
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
  coalesce(
    round(
      count(*) filter (where sla_estado = 'no_prazo')::numeric
      / nullif(count(*),0) * 100, 1
    ), 0
  ) as sla_pct
from auvo_os
group by 1
order by 1;

create or replace view kpi_resumo as
select
  count(*) filter (where status <> 'liberado') as backlog_total,
  count(*) filter (where sla_estado = 'atrasado') as criticos_atraso,
  count(*) filter (where status = 'aguardando_peca') as aguardando_pecas,
  count(*) filter (where status = 'liberacao_qualidade') as na_minha_mesa,
  coalesce(
    (select round(
       count(*) filter (where sla_estado = 'no_prazo')::numeric
       / nullif(count(*),0) * 100, 1)
     from auvo_os), 0
  ) as sla_pct_global,
  (select round(avg(mttr_horas)::numeric, 1) from kpi_mttr) as mttr_horas_global,
  (select round(avg(taxa_retrabalho_pct)::numeric, 1) from kpi_retrabalho) as retrabalho_global
from auvo_os;

-- ============= 010_lembretes.sql =============
create table if not exists lembretes (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  tipo            text not null check (tipo in ('contrato','calibracao','auditoria','tarefa')),
  descricao       text,
  data_alvo       date not null,
  recorrente      boolean not null default false,
  recorrencia_dias integer,
  hospital        text,
  equipamento_id  text,
  concluido       boolean not null default false,
  criado_por      uuid references auth.users(id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

do $$ begin
  create policy "lembretes_le" on lembretes for select
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "lembretes_insert" on lembretes for insert
    with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "lembretes_update" on lembretes for update
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "lembretes_delete" on lembretes for delete
    using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- ============= Habilitar Realtime nas tabelas novas =============
alter publication supabase_realtime add table auvo_os;
alter publication supabase_realtime add table compras_solicitacoes;
alter publication supabase_realtime add table checklist_respostas;

-- ============================================================
-- FIM. Vá no SQL Editor e confirme que rodou tudo sem erros.
-- ============================================================
