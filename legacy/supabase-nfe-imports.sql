-- ============================================================
-- ENERGIZA CRM → NF-e Imports (metadados das notas fiscais)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nfe_imports (
  "nfId" TEXT PRIMARY KEY,
  "nfNumber" TEXT NOT NULL DEFAULT '',
  "serie" TEXT DEFAULT '',
  "date" TEXT DEFAULT '',
  "supplierName" TEXT DEFAULT '',
  "supplierCnpj" TEXT DEFAULT '',
  "clientName" TEXT DEFAULT '',
  "clientCnpj" TEXT DEFAULT '',
  "productCount" NUMERIC DEFAULT 0,
  "importedAt" TIMESTAMPTZ DEFAULT now(),
  "items" JSONB DEFAULT '[]'::jsonb,
  "user_id" TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.nfe_imports ADD COLUMN IF NOT EXISTS "user_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE public.nfe_imports ADD COLUMN IF NOT EXISTS "items" JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_nfe_imports_date ON public.nfe_imports ("date");
CREATE INDEX IF NOT EXISTS idx_nfe_imports_supplier ON public.nfe_imports ("supplierName");

ALTER TABLE public.nfe_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nfe_imports_anon_select ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_anon_insert ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_anon_update ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_anon_delete ON public.nfe_imports;

CREATE POLICY nfe_imports_anon_select ON public.nfe_imports FOR SELECT USING (true);
CREATE POLICY nfe_imports_anon_insert ON public.nfe_imports FOR INSERT WITH CHECK (true);
CREATE POLICY nfe_imports_anon_update ON public.nfe_imports FOR UPDATE USING (true);
CREATE POLICY nfe_imports_anon_delete ON public.nfe_imports FOR DELETE USING (true);
