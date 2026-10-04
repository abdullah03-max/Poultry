-- =============================================================================
-- SHAN POULTRY PROTEIN - Complete Worker Management in Supabase Auth & Profiles
-- Run this in Supabase SQL Editor: https://ohwslpcuetrpkqhvvszu.supabase.co/sql
-- =============================================================================

-- 1. Enable required pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Allow collections foreign key to SET NULL on worker delete
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_worker_id_fkey;
ALTER TABLE public.collections ADD CONSTRAINT collections_worker_id_fkey 
    FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Add email and password columns to public.profiles if they do not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- 4. Enable full read/write RLS policies on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view profiles" ON public.profiles;
DROP POLICY IF EXISTS "User update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full control on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public manage profiles" ON public.profiles;

CREATE POLICY "Public manage profiles" ON public.profiles 
    FOR ALL TO authenticated, anon 
    USING (true) 
    WITH CHECK (true);

-- 5. RPC to CREATE Worker in BOTH auth.users AND public.profiles
CREATE OR REPLACE FUNCTION public.admin_create_worker(
    worker_email TEXT,
    worker_password TEXT,
    worker_name TEXT,
    worker_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    existing_user_id UUID;
    existing_profile_id UUID;
    encrypted_pw TEXT;
    clean_email TEXT := lower(trim(worker_email));
BEGIN
    encrypted_pw := crypt(worker_password, gen_salt('bf'));

    -- Check if user already exists in auth.users
    SELECT id INTO existing_user_id FROM auth.users WHERE lower(email) = clean_email LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        -- User already in auth.users -> update password & metadata
        UPDATE auth.users
        SET encrypted_password = encrypted_pw,
            raw_user_meta_data = jsonb_build_object('full_name', worker_name, 'phone', worker_phone, 'role', 'worker'),
            updated_at = now()
        WHERE id = existing_user_id;

        -- Update or insert profile
        INSERT INTO public.profiles (id, full_name, phone, email, password, role, is_active, created_at, updated_at)
        VALUES (existing_user_id, worker_name, worker_phone, clean_email, worker_password, 'worker', true, now(), now())
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            is_active = true,
            updated_at = now();

        RETURN jsonb_build_object('user_id', existing_user_id, 'success', true, 'updated', true);
    END IF;

    -- If profile already exists with this email, reuse that ID so collections stay linked
    SELECT id INTO existing_profile_id FROM public.profiles WHERE lower(email) = clean_email LIMIT 1;
    IF existing_profile_id IS NOT NULL THEN
        new_user_id := existing_profile_id;
    END IF;

    -- A. Insert directly into Supabase auth.users (Appears in Authentication > Users)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        clean_email,
        encrypted_pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', worker_name, 'phone', worker_phone, 'role', 'worker'),
        now(),
        now()
    );

    -- B. Insert into auth.identities with provider_id
    DELETE FROM auth.identities WHERE user_id = new_user_id;
    INSERT INTO auth.identities (
        id,
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id::text,
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', clean_email),
        'email',
        now(),
        now(),
        now()
    );

    -- C. Insert or update in public.profiles (Appears in Table Editor > profiles)
    INSERT INTO public.profiles (id, full_name, phone, email, password, role, is_active, created_at, updated_at)
    VALUES (new_user_id, worker_name, worker_phone, clean_email, worker_password, 'worker', true, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        is_active = true,
        updated_at = now();

    RETURN jsonb_build_object('user_id', new_user_id, 'success', true);
END;
$$;

-- 6. RPC to DELETE Worker from BOTH auth.users AND public.profiles
CREATE OR REPLACE FUNCTION public.admin_delete_worker(
    target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
    -- A. Disassociate any collection slips to prevent foreign key errors
    UPDATE public.collections 
    SET worker_id = NULL 
    WHERE worker_id = target_user_id;

    -- B. Delete from public.profiles
    DELETE FROM public.profiles WHERE id = target_user_id;

    -- C. Delete from auth.identities, sessions and auth.users (Removes from Authentication > Users)
    DELETE FROM auth.identities WHERE user_id = target_user_id;
    DELETE FROM auth.sessions WHERE user_id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. RPC to RESET Worker Password
CREATE OR REPLACE FUNCTION public.admin_reset_worker_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
    encrypted_pw TEXT;
BEGIN
    encrypted_pw := crypt(new_password, gen_salt('bf'));

    UPDATE auth.users
    SET encrypted_password = encrypted_pw,
        updated_at = now()
    WHERE id = target_user_id;

    UPDATE public.profiles
    SET password = new_password,
        updated_at = now()
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. RPC to SET Worker Status (Active / Inactive)
CREATE OR REPLACE FUNCTION public.admin_set_worker_status(
    target_user_id UUID,
    status_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
    UPDATE public.profiles
    SET is_active = status_active,
        updated_at = now()
    WHERE id = target_user_id;

    IF status_active = false THEN
        UPDATE auth.users
        SET banned_until = now() + INTERVAL '100 years'
        WHERE id = target_user_id;
    ELSE
        UPDATE auth.users
        SET banned_until = NULL
        WHERE id = target_user_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Grant Execute on RPCs to authenticated, anon, and service_role
GRANT EXECUTE ON FUNCTION public.admin_create_worker TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_worker TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_worker_password TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_worker_status TO authenticated, anon, service_role;

-- 10. AUTOMATIC MIGRATION: Sync any existing profiles (like Abdullah Aftab) directly into auth.users!
DO $$
DECLARE
    r RECORD;
    new_pw TEXT;
    pw_to_use TEXT;
    clean_email TEXT;
BEGIN
    FOR r IN SELECT * FROM public.profiles WHERE email IS NOT NULL AND trim(email) != '' LOOP
        clean_email := lower(trim(r.email));
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = r.id OR lower(email) = clean_email) THEN
            pw_to_use := COALESCE(r.password, '123456');
            new_pw := crypt(pw_to_use, gen_salt('bf'));
            
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                r.id,
                'authenticated',
                'authenticated',
                clean_email,
                new_pw,
                now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('full_name', r.full_name, 'phone', coalesce(r.phone, ''), 'role', coalesce(r.role, 'worker')),
                now(),
                now()
            );

            DELETE FROM auth.identities WHERE user_id = r.id;
            INSERT INTO auth.identities (
                id,
                provider_id,
                user_id,
                identity_data,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                r.id::text,
                r.id,
                jsonb_build_object('sub', r.id::text, 'email', clean_email),
                'email',
                now(),
                now(),
                now()
            );
        END IF;
    END LOOP;
END $$;
