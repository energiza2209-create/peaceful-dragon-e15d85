-- =========================================================
-- ENERGIZA CRM — Migration 003: Storage Policies
-- Execute no Supabase SQL Editor ou via CLI
-- =========================================================

-- Nota: Storage buckets devem ser criados via interface Supabase
-- ou via CLI antes de executar estas políticas.

-- ─── Bucket: product-photos ───
-- Criar bucket via interface: product-photos (public: false)

-- Políticas de storage para product-photos
CREATE POLICY "Authenticated users can view product photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-photos');

CREATE POLICY "Admin/Tecnico can upload product photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'tecnico')
    )
  );

CREATE POLICY "Admin/Tecnico can update product photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'tecnico')
    )
  );

CREATE POLICY "Admin can delete product photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Bucket: proposal-attachments ───
-- Criar bucket via interface: proposal-attachments (public: false)

CREATE POLICY "Authenticated users can view proposal attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'proposal-attachments');

CREATE POLICY "Comercial/Admin can upload proposal attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proposal-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'comercial')
    )
  );

CREATE POLICY "Comercial/Admin can delete proposal attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proposal-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'comercial')
    )
  );
