-- ============================================================
-- ENERGIZA CRM → Clientes / Parceiros
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clients (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL DEFAULT '',
  "razaoSocial" TEXT DEFAULT '',
  "cnpj" TEXT DEFAULT '',
  "email" TEXT DEFAULT '',
  "phone" TEXT DEFAULT '',
  "address" TEXT DEFAULT '',
  "externalCode" TEXT DEFAULT '',
  "observations" TEXT DEFAULT '',
  "lastSale" TEXT DEFAULT '',
  "totalSpent" NUMERIC DEFAULT 0,
  "salesHistory" JSONB DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "user_id" TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS "user_id" TEXT NOT NULL DEFAULT '';

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_anon_select ON public.clients;
DROP POLICY IF EXISTS clients_anon_insert ON public.clients;
DROP POLICY IF EXISTS clients_anon_update ON public.clients;
DROP POLICY IF EXISTS clients_anon_delete ON public.clients;

CREATE POLICY clients_anon_select ON public.clients FOR SELECT USING (true);
CREATE POLICY clients_anon_insert ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY clients_anon_update ON public.clients FOR UPDATE USING (true);
CREATE POLICY clients_anon_delete ON public.clients FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients ("name");
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients ("cnpj");
