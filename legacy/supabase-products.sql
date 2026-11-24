-- ============================================================
-- ENERGIZA CRM → Product Catalog Sync
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL DEFAULT '',
  "name" TEXT NOT NULL DEFAULT '',
  "ncm" TEXT DEFAULT '',
  "last_price" NUMERIC DEFAULT 0,
  "total_bought" NUMERIC DEFAULT 0,
  "supplier_name" TEXT DEFAULT '',
  "nf_number" TEXT DEFAULT '',
  "user_id" TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "user_id" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_products_code ON public.products ("code");

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_anon_select ON public.products;
DROP POLICY IF EXISTS products_anon_insert ON public.products;
DROP POLICY IF EXISTS products_anon_update ON public.products;
DROP POLICY IF EXISTS products_anon_delete ON public.products;

CREATE POLICY products_anon_select ON public.products FOR SELECT USING (true);
CREATE POLICY products_anon_insert ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY products_anon_update ON public.products FOR UPDATE USING (true);
CREATE POLICY products_anon_delete ON public.products FOR DELETE USING (true);
