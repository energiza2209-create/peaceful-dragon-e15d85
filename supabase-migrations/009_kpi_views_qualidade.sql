-- =========================================================
-- SIGEQ-Q 004 — Views de KPI (Dashboard)
-- MTTR, Taxa de Retrabalho, SLA %, O.S. no prazo
-- =========================================================

-- MTTR (Tempo Médio de Reparo) por período
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

-- Taxa de Retrabalho por semana
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

-- SLA Compliance: % de O.S. concluídas dentro do SLA vs total
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

-- Painel resumo (instantâneo): para cards do dashboard
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
