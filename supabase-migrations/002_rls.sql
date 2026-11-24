-- =========================================================
-- ENERGIZA CRM — Migration 002: RLS Policies com auth.uid()
-- Execute no Supabase SQL Editor ou via CLI
-- =========================================================
-- A-02 CORRIGIDO: policies usam auth.uid() + roles reais
-- A-03 CORRIGIDO: user_id agora contém auth.uid() (não UUID local)
-- Requer: migration 001 (profiles) aplicada primeiro
-- =========================================================

-- ─── Helper: verifica se o usuário atual é admin ───
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Helper: verifica se o usuário tem uma role permitida ───
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles text[])
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================================================
-- PROFILES
-- =========================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (public.is_admin());

-- =========================================================
-- NEGOCIACOES (A-02: isolamento por user_id + admin vê tudo)
-- =========================================================
DROP POLICY IF EXISTS "negociacoes_anon_all" ON public.negociacoes;
DROP POLICY IF EXISTS "negociacoes_authenticated_select" ON public.negociacoes;
DROP POLICY IF EXISTS "negociacoes_comercial_insert" ON public.negociacoes;
DROP POLICY IF EXISTS "negociacoes_comercial_update" ON public.negociacoes;
DROP POLICY IF EXISTS "negociacoes_admin_delete" ON public.negociacoes;

CREATE POLICY "negociacoes_select"
  ON public.negociacoes FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
  );

CREATE POLICY "negociacoes_insert"
  ON public.negociacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role('admin', 'comercial')
    AND user_id = auth.uid()
  );

CREATE POLICY "negociacoes_update"
  ON public.negociacoes FOR UPDATE
  TO authenticated
  USING (
    public.has_role('admin', 'comercial')
    AND (public.is_admin() OR user_id = auth.uid())
  );

CREATE POLICY "negociacoes_delete"
  ON public.negociacoes FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =========================================================
-- CLIENTS (A-02: isolamento por user_id + admin vê tudo)
-- =========================================================
DROP POLICY IF EXISTS clients_anon_select ON public.clients;
DROP POLICY IF EXISTS clients_anon_insert ON public.clients;
DROP POLICY IF EXISTS clients_anon_update ON public.clients;
DROP POLICY IF EXISTS clients_anon_delete ON public.clients;
DROP POLICY IF EXISTS clients_authenticated_select ON public.clients;
DROP POLICY IF EXISTS clients_comercial_insert ON public.clients;
DROP POLICY IF EXISTS clients_comercial_update ON public.clients;
DROP POLICY IF EXISTS clients_admin_delete ON public.clients;

CREATE POLICY "clients_select"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
  );

CREATE POLICY "clients_insert"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role('admin', 'comercial')
    AND user_id = auth.uid()
  );

CREATE POLICY "clients_update"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.has_role('admin', 'comercial')
    AND (public.is_admin() OR user_id = auth.uid())
  );

CREATE POLICY "clients_delete"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =========================================================
-- PRODUCTS (visualização para todos autenticados, edição restrita)
-- =========================================================
DROP POLICY IF EXISTS products_anon_select ON public.products;
DROP POLICY IF EXISTS products_anon_insert ON public.products;
DROP POLICY IF EXISTS products_anon_update ON public.products;
DROP POLICY IF EXISTS products_anon_delete ON public.products;
DROP POLICY IF EXISTS products_authenticated_select ON public.products;
DROP POLICY IF EXISTS products_tecnico_insert ON public.products;
DROP POLICY IF EXISTS products_tecnico_update ON public.products;
DROP POLICY IF EXISTS products_admin_delete ON public.products;

CREATE POLICY "products_select"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role('admin', 'tecnico'));

CREATE POLICY "products_update"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_role('admin', 'tecnico'));

CREATE POLICY "products_delete"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =========================================================
-- NFE_IMPORTS (visualização para financeiro/admin, edição restrita)
-- =========================================================
DROP POLICY IF EXISTS nfe_imports_anon_select ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_anon_insert ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_anon_update ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_anon_delete ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_authenticated_select ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_financeiro_insert ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_financeiro_update ON public.nfe_imports;
DROP POLICY IF EXISTS nfe_imports_admin_delete ON public.nfe_imports;

CREATE POLICY "nfe_imports_select"
  ON public.nfe_imports FOR SELECT
  TO authenticated
  USING (public.has_role('admin', 'financeiro'));

CREATE POLICY "nfe_imports_insert"
  ON public.nfe_imports FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role('admin', 'financeiro'));

CREATE POLICY "nfe_imports_update"
  ON public.nfe_imports FOR UPDATE
  TO authenticated
  USING (public.has_role('admin', 'financeiro'));

CREATE POLICY "nfe_imports_delete"
  ON public.nfe_imports FOR DELETE
  TO authenticated
  USING (public.is_admin());
