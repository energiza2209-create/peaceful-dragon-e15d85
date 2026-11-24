-- =========================================================
-- ENERGIZA CRM — Migration 004: Permissions & Audit
-- Execute no Supabase SQL Editor ou via CLI
-- =========================================================

-- ─── Tabela de logs de auditoria ───
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  data JSONB DEFAULT '{}',
  ip TEXT,
  user_agent TEXT,
  screen JSONB DEFAULT '{}'
);

-- ─── RLS para audit_logs ───
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ─── Tabela de configuração de permissões ───
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'comercial', 'tecnico', 'financeiro', 'leitura')),
  resource TEXT NOT NULL,
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT true,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, resource)
);

-- ─── RLS para permissions ───
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Permissões padrão por perfil ───
INSERT INTO permissions (role, resource, can_create, can_read, can_update, can_delete) VALUES
  -- Admin: acesso total
  ('admin', 'negociacoes', true, true, true, true),
  ('admin', 'clients', true, true, true, true),
  ('admin', 'products', true, true, true, true),
  ('admin', 'nfe_imports', true, true, true, true),
  ('admin', 'profiles', true, true, true, true),
  ('admin', 'audit_logs', false, true, false, false),
  -- Comercial: propostas e clientes
  ('comercial', 'negociacoes', true, true, true, false),
  ('comercial', 'clients', true, true, true, false),
  ('comercial', 'products', false, true, false, false),
  ('comercial', 'nfe_imports', false, true, false, false),
  -- Técnico: catálogo e relatórios
  ('tecnico', 'negociacoes', false, true, false, false),
  ('tecnico', 'clients', false, true, false, false),
  ('tecnico', 'products', true, true, true, false),
  ('tecnico', 'nfe_imports', false, true, false, false),
  -- Financeiro: relatórios e NF-e
  ('financeiro', 'negociacoes', false, true, false, false),
  ('financeiro', 'clients', false, true, false, false),
  ('financeiro', 'products', false, true, false, false),
  ('financeiro', 'nfe_imports', true, true, true, false),
  -- Leitura: apenas visualização
  ('leitura', 'negociacoes', false, true, false, false),
  ('leitura', 'clients', false, true, false, false),
  ('leitura', 'products', false, true, false, false),
  ('leitura', 'nfe_imports', false, true, false, false)
ON CONFLICT (role, resource) DO NOTHING;
