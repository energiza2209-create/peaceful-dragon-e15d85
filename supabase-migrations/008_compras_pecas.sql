-- =========================================================
-- SIGEQ-Q 003 — Solicitação de Peças e Orçamentos
-- Regra: exigem 3 orçamentos validados para aprovar compra.
-- =========================================================

create table if not exists compras_solicitacoes (
  id              uuid primary key default gen_random_uuid(),
  os_id           text references auvo_os(id) on delete set null,
  equipamento_id  text,
  peca_desc       text not null,
  qtd             integer not null default 1,

  -- 'orcamentos_coletando' | 'aprovada' | 'reprovada' | 'recebida'
  status          text not null default 'orcamentos_coletando',

  orcamentos_aprovados integer default 0,   -- conta quantos dos 3 já ok
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
  valor_total     numeric(12,2) generated always as (valor_unitario * (
    select qtd from compras_solicitacoes where id = solicitacao_id
  )) stored,
  prazo           date,
  anexo_url       text,                     -- storage object
  validado        boolean default false,
  observacao      text,
  criado_em       timestamptz default now()
);

-- Trigger: quando atinge 3 validados, marca pronta p/ aprovação
create or replace function trg_orcamentos_count()
returns trigger language plpgsql as $$
declare
  total integer;
  sol_status text;
begin
  select count(*) into total
    from compras_orcamentos
   where solicitacao_id = coalesce(new.solicitacao_id, old.solicitacao_id)
     and validado = true;
  update compras_solicitacoes
     set orcamentos_aprovados = total,
         atualizada_em = now()
   where id = coalesce(new.solicitacao_id, old.solicitacao_id);
  return coalesce(new, old);
end $$;

drop trigger if exists trg_orc_count on compras_orcamentos;
create trigger trg_orc_count
after insert or update or delete on compras_orcamentos
for each row execute function trg_orcamentos_count();

-- Bloqueia aprovar sem 3 orçamentos
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

-- RLS
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
