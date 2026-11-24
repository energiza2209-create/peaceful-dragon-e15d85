-- ============================================================
-- PATCH — Corrige tabelas CRM que já existiam sem a coluna user_id
-- Rode isto DEPOIS do 0_base.sql quando ele der erro "column user_id does not exist"
-- É idempotente (pode rodar quantas vezes quiser)
-- ============================================================

-- Adiciona user_id em cada tabela se não existir
DO $$ BEGIN
  ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE nfe_imports ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Cria índices se faltarem
CREATE INDEX IF NOT EXISTS negociacoes_updated_at_idx ON negociacoes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients (cnpj);
CREATE INDEX IF NOT EXISTS idx_products_code ON products (code);
CREATE INDEX IF NOT EXISTS idx_nfe_imports_date ON nfe_imports (date);
CREATE INDEX IF NOT EXISTS idx_nfe_imports_supplier ON nfe_imports ("supplierName");

-- Habilita RLS (se já estiver, não faz nada)
ALTER TABLE negociacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_imports ENABLE ROW LEVEL SECURITY;

-- Recria policies (drop + create) — ignora se já existem
DROP POLICY IF EXISTS "negociacoes_select_own" ON negociacoes;
CREATE POLICY "negociacoes_select_own"  ON negociacoes FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "negociacoes_insert_own" ON negociacoes;
CREATE POLICY "negociacoes_insert_own" ON negociacoes FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "negociacoes_update_own" ON negociacoes;
CREATE POLICY "negociacoes_update_own" ON negociacoes FOR UPDATE USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "negociacoes_delete_own" ON negociacoes;
CREATE POLICY "negociacoes_delete_own" ON negociacoes FOR DELETE USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_own" ON clients FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "clients_insert_own" ON clients;
CREATE POLICY "clients_insert_own" ON clients FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "clients_update_own" ON clients;
CREATE POLICY "clients_update_own" ON clients FOR UPDATE USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "clients_delete_own" ON clients;
CREATE POLICY "clients_delete_own" ON clients FOR DELETE USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "products_select_own" ON products;
CREATE POLICY "products_select_own" ON products FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "products_insert_own" ON products;
CREATE POLICY "products_insert_own" ON products FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "products_update_own" ON products;
CREATE POLICY "products_update_own" ON products FOR UPDATE USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "products_delete_own" ON products;
CREATE POLICY "products_delete_own" ON products FOR DELETE USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "nfe_select_own" ON nfe_imports;
CREATE POLICY "nfe_select_own" ON nfe_imports FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "nfe_insert_own" ON nfe_imports;
CREATE POLICY "nfe_insert_own" ON nfe_imports FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "nfe_update_own" ON nfe_imports;
CREATE POLICY "nfe_update_own" ON nfe_imports FOR UPDATE USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "nfe_delete_own" ON nfe_imports;
CREATE POLICY "nfe_delete_own" ON nfe_imports FOR DELETE USING (user_id = auth.uid()::text OR public.is_admin());

-- Triggers de updated_at (caso faltem)
CREATE OR REPLACE FUNCTION public.handle_updated_at_any()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_negociacoes_updated ON negociacoes;
CREATE TRIGGER on_negociacoes_updated BEFORE UPDATE ON negociacoes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_any();

DROP TRIGGER IF EXISTS on_clients_updated ON clients;
CREATE TRIGGER on_clients_updated BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_any();

DROP TRIGGER IF EXISTS on_nfe_imports_updated ON nfe_imports;
CREATE TRIGGER on_nfe_imports_updated BEFORE UPDATE ON nfe_imports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_any();

-- Habilita Realtime (ignora erro se já estava)
ALTER PUBLICATION supabase_realtime ADD TABLE negociacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE nfe_imports;

-- ============================================================
-- FIM — volte e rode o 2_aplicar_migrations.sql
-- ============================================================
