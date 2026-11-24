-- =========================================================
-- SIGEQ-Q 011 — Coluna de observações da O.S. (Módulo Qualidade)
-- Permite edição livre de observações no modal do Kanban.
-- Idempotente (ADD COLUMN IF NOT EXISTS).
-- =========================================================

ALTER TABLE auvo_os ADD COLUMN IF NOT EXISTS observacoes text;

COMMENT ON COLUMN auvo_os.observacoes IS
  'Observações livres sobre a O.S., editáveis no modal de detalhes do Kanban de Fluxo & SLA.';
