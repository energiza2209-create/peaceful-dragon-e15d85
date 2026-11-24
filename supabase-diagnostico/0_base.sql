-- ============================================================
-- APPLY BASE -- Migrations 001-005 (CRM core: profiles, RLS, storage, permissions, triggers)
-- É idempotente. Pode rodar à vontade que não duplica nada.
-- ============================================================

-- ============= 001_profiles.sql =============
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'leitura' CHECK (role IN ('admin', 'comercial', 'tecnico', 'financeiro', 'leitura')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'leitura')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;


-- ============= 002_rls.sql =============
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles text[])
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (public.is_admin());


-- ============= 003_storage.sql =============
-- Apenas cria buckets (storage.objects policies omitidas por enquanto — buckets vazios)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('propostas', 'propostas', false)
ON CONFLICT (id) DO NOTHING;

-- Permite qualquer autenticado ler fotos (bucket público já permite, mas RLS precisa)
DROP POLICY IF EXISTS "fotos_read" ON storage.objects;
CREATE POLICY "fotos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos');

-- Permite qualquer autenticado gravar propostas PDF
DROP POLICY IF EXISTS "propostas_write" ON storage.objects;
CREATE POLICY "propostas_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'propostas' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "propostas_read" ON storage.objects;
CREATE POLICY "propostas_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'propostas' AND auth.uid() IS NOT NULL);


-- ============= 004_permissions.sql =============
-- Criamos as 4 tabelas base do CRM comercial (não importa se já existem — tudo IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS negociacoes (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS negociacoes_updated_at_idx ON negociacoes (updated_at DESC);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  "razaoSocial" TEXT DEFAULT '',
  cnpj TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  "externalCode" TEXT DEFAULT '',
  observations TEXT DEFAULT '',
  "lastSale" TEXT DEFAULT '',
  "totalSpent" NUMERIC DEFAULT 0,
  "salesHistory" JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients (cnpj);

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  ncm TEXT DEFAULT '',
  last_price NUMERIC DEFAULT 0,
  total_bought NUMERIC DEFAULT 0,
  supplier_name TEXT DEFAULT '',
  nf_number TEXT DEFAULT '',
  user_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_products_code ON products (code);

CREATE TABLE IF NOT EXISTS nfe_imports (
  "nfId" TEXT PRIMARY KEY,
  "nfNumber" TEXT NOT NULL DEFAULT '',
  serie TEXT DEFAULT '',
  date TEXT DEFAULT '',
  "supplierName" TEXT DEFAULT '',
  "supplierCnpj" TEXT DEFAULT '',
  "clientName" TEXT DEFAULT '',
  "clientCnpj" TEXT DEFAULT '',
  "productCount" NUMERIC DEFAULT 0,
  "importedAt" TIMESTAMPTZ DEFAULT now(),
  items JSONB DEFAULT '[]',
  user_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_nfe_imports_date ON nfe_imports (date);
CREATE INDEX IF NOT EXISTS idx_nfe_imports_supplier ON nfe_imports ("supplierName");

-- =========================================================
-- RLS para as 4 tabelas CRM
-- =========================================================
ALTER TABLE negociacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "negociacoes_select_own" ON negociacoes;
CREATE POLICY "negociacoes_select_own"
  ON negociacoes FOR SELECT
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "negociacoes_insert_own" ON negociacoes;
CREATE POLICY "negociacoes_insert_own"
  ON negociacoes FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "negociacoes_update_own" ON negociacoes;
CREATE POLICY "negociacoes_update_own"
  ON negociacoes FOR UPDATE
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "negociacoes_delete_own" ON negociacoes;
CREATE POLICY "negociacoes_delete_own"
  ON negociacoes FOR DELETE
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_own"
  ON clients FOR SELECT
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "clients_insert_own" ON clients;
CREATE POLICY "clients_insert_own"
  ON clients FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "clients_update_own" ON clients;
CREATE POLICY "clients_update_own"
  ON clients FOR UPDATE
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "clients_delete_own" ON clients;
CREATE POLICY "clients_delete_own"
  ON clients FOR DELETE
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "products_select_own" ON products;
CREATE POLICY "products_select_own"
  ON products FOR SELECT
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "products_insert_own" ON products;
CREATE POLICY "products_insert_own"
  ON products FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "products_update_own" ON products;
CREATE POLICY "products_update_own"
  ON products FOR UPDATE
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "products_delete_own" ON products;
CREATE POLICY "products_delete_own"
  ON products FOR DELETE
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "nfe_select_own" ON nfe_imports;
CREATE POLICY "nfe_select_own"
  ON nfe_imports FOR SELECT
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "nfe_insert_own" ON nfe_imports;
CREATE POLICY "nfe_insert_own"
  ON nfe_imports FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "nfe_update_own" ON nfe_imports;
CREATE POLICY "nfe_update_own"
  ON nfe_imports FOR UPDATE
  USING (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "nfe_delete_own" ON nfe_imports;
CREATE POLICY "nfe_delete_own"
  ON nfe_imports FOR DELETE
  USING (user_id = auth.uid()::text OR public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE negociacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE nfe_imports;


-- ============= 005_updated_at_triggers.sql =============
CREATE OR REPLACE FUNCTION public.handle_updated_at_any()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_negociacoes_updated ON negociacoes;
CREATE TRIGGER on_negociacoes_updated
  BEFORE UPDATE ON negociacoes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_any();

DROP TRIGGER IF EXISTS on_clients_updated ON clients;
CREATE TRIGGER on_clients_updated
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_any();

DROP TRIGGER IF EXISTS on_nfe_imports_updated ON nfe_imports;
CREATE TRIGGER on_nfe_imports_updated
  BEFORE UPDATE ON nfe_imports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_any();


-- ============================================================
-- FIM. Vá no SQL Editor e confirme que rodou tudo sem erros.
-- Depois rode o 2_aplicar_migrations.sql para criar o módulo Qualidade.
-- ============================================================
