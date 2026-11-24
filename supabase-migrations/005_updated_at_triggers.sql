-- =========================================================
-- ENERGIZA CRM — Migration 005: updated_at Triggers (A-07)
-- Execute no Supabase SQL Editor ou via CLI
-- =========================================================
-- A-07: Usa relogio do Postgres (server clock) como arbiter
--       de merge, eliminando conflitos de relogio do cliente.
-- =========================================================

-- A funcao handle_updated_at() ja existe (criada na migration 001).
-- Se nao existir, cria:
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- =========================================================
-- NEGOCIACOES: trigger para updated_at
-- =========================================================
DROP TRIGGER IF EXISTS on_negociacoes_updated ON public.negociacoes;
CREATE TRIGGER on_negociacoes_updated
  BEFORE UPDATE ON public.negociacoes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- CLIENTS: trigger para updated_at
-- =========================================================
DROP TRIGGER IF EXISTS on_clients_updated ON public.clients;
CREATE TRIGGER on_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- NFE_IMPORTS: trigger para updated_at
-- =========================================================
DROP TRIGGER IF EXISTS on_nfe_imports_updated ON public.nfe_imports;
CREATE TRIGGER on_nfe_imports_updated
  BEFORE UPDATE ON public.nfe_imports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- PRODUCTS: trigger para updated_at
-- =========================================================
DROP TRIGGER IF EXISTS on_products_updated ON public.products;
CREATE TRIGGER on_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
