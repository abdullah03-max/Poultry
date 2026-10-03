-- =============================================================================
-- SHAN POULTRY PROTEIN
-- Migration: 20261003000003_storage_buckets.sql
-- Description: Provision Storage buckets and RLS storage policies
-- =============================================================================

-- Create storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('business-assets', 'business-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
    ('signatures', 'signatures', false, 2097152, ARRAY['image/png', 'image/webp']),
    ('collection-attachments', 'collection-attachments', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- STORAGE OBJECT POLICIES
-- -----------------------------------------------------------------------------

-- 1. Business Assets (Public read, admin write)
DROP POLICY IF EXISTS "Public can view business assets" ON storage.objects;
CREATE POLICY "Public can view business assets" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "Admin can upload business assets" ON storage.objects;
CREATE POLICY "Admin can upload business assets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'business-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin can update business assets" ON storage.objects;
CREATE POLICY "Admin can update business assets" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'business-assets' AND public.is_admin());

-- 2. Signatures (Authenticated upload, authorized read)
DROP POLICY IF EXISTS "Authenticated users view signatures" ON storage.objects;
CREATE POLICY "Authenticated users view signatures" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'signatures');

DROP POLICY IF EXISTS "Authenticated workers can upload signatures" ON storage.objects;
CREATE POLICY "Authenticated workers can upload signatures" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'signatures');

-- 3. Collection Attachments (Scale photos / crates)
DROP POLICY IF EXISTS "Authenticated users view attachments" ON storage.objects;
CREATE POLICY "Authenticated users view attachments" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'collection-attachments');

DROP POLICY IF EXISTS "Authenticated workers can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated workers can upload attachments" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'collection-attachments');

DROP POLICY IF EXISTS "Admin can delete attachments" ON storage.objects;
CREATE POLICY "Admin can delete attachments" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'collection-attachments' AND public.is_admin());
