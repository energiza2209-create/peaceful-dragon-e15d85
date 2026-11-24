-- =========================================================
-- SIGEQ-Q 002 — Checklists dinâmicos de Qualidade
-- =========================================================

-- Templates: um por tipo de equipamento (monitor multiparâmetro, bomba infusão...)
create table if not exists checklist_templates (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  tipo_equipamento text not null,
  itens_entrada    jsonb not null default '[]',  -- [{label, obrigatorio, tipo}]
  itens_saida      jsonb not null default '[]',
  ativo            boolean default true,
  criado_em        timestamptz default now(),
  atualizado_em    timestamptz default now()
);

-- Respostas (preenchidas pelo Coordenador ao liberar)
create table if not exists checklist_respostas (
  id                uuid primary key default gen_random_uuid(),
  os_id             text references auvo_os(id) on delete cascade,
  template_id       uuid references checklist_templates(id),
  tipo              text not null check (tipo in ('entrada','saida')),

  respostas         jsonb not null default '{}',  -- {itemId: valor}
  aprovado          boolean default false,
  observacao        text,

  assinatura_email  text,                          -- e-mail de quem validou
  assinatura_ts     timestamptz,                   -- timestamp da assinatura
  assinatura_hash   text,                          -- hash p/ integridade

  criado_por        uuid references auth.users(id),
  criado_em         timestamptz default now()
);

-- Gatilho: quando checklist_saida é aprovado, OS vai para "liberado"
create or replace function trg_liberar_os()
returns trigger language plpgsql as $$
begin
  if new.tipo = 'saida' and new.aprovado and new.assinatura_ts is not null then
    update auvo_os
       set status = 'liberado',
           liberado_em = now(),
           checklist_saida_id = new.id,
           validado_por = new.criado_por
     where id = new.os_id;
  elsif new.tipo = 'entrada' and new.aprovado then
    update auvo_os
       set checklist_entrada_id = new.id
     where id = new.os_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_checklist_libera on checklist_respostas;
create trigger trg_checklist_libera
after insert or update on checklist_respostas
for each row execute function trg_liberar_os();

-- RLS
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
