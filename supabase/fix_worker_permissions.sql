-- =============================================================================
-- SHAN POULTRY PROTEIN - Worker Permissions & Persistence Fix
-- Run this in Supabase SQL Editor: https://ohwslpcuetrpkqhvvszu.supabase.co
-- =============================================================================

-- 1. Add email and password columns to public.profiles if they do not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Drop the foreign key constraint from profiles to auth.users if it exists
-- This allows Admin to add workers directly in profiles without requiring auth.users signup
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. In collections, change worker_id foreign key to ON DELETE SET NULL
-- This ensures deleting a worker will never fail due to past collection records
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_worker_id_fkey;
ALTER TABLE public.collections ADD CONSTRAINT collections_worker_id_fkey 
    FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Enable full control on profiles for anon and authenticated users
DROP POLICY IF EXISTS "Public view profiles" ON public.profiles;
DROP POLICY IF EXISTS "User update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full control on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public manage profiles" ON public.profiles;

CREATE POLICY "Public manage profiles" ON public.profiles 
    FOR ALL TO authenticated, anon 
    USING (true) 
    WITH CHECK (true);
