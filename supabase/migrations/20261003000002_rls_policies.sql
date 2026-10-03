-- =============================================================================
-- SHAN POULTRY PROTEIN
-- Migration: 20261003000002_rls_policies.sql
-- Description: Complete Row Level Security (RLS) policies for all tables
-- =============================================================================

-- Enable Row Level Security on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_weight_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admin full control on profiles" ON public.profiles;
CREATE POLICY "Admin full control on profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- CUSTOMERS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users view active customers" ON public.customers;
CREATE POLICY "Authenticated users view active customers" ON public.customers
    FOR SELECT TO authenticated
    USING (is_deleted = false OR public.is_admin());

DROP POLICY IF EXISTS "Admin create and edit customers" ON public.customers;
CREATE POLICY "Admin create and edit customers" ON public.customers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- WEIGHT CATEGORIES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users read weight categories" ON public.weight_categories;
CREATE POLICY "Authenticated users read weight categories" ON public.weight_categories
    FOR SELECT TO authenticated
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage weight categories" ON public.weight_categories;
CREATE POLICY "Admin manage weight categories" ON public.weight_categories
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- COLLECTIONS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workers view own collections; Admin views all" ON public.collections;
CREATE POLICY "Workers view own collections; Admin views all" ON public.collections
    FOR SELECT TO authenticated
    USING (worker_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Workers insert own collections" ON public.collections;
CREATE POLICY "Workers insert own collections" ON public.collections
    FOR INSERT TO authenticated
    WITH CHECK (worker_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Workers update within window; Admin updates always" ON public.collections;
CREATE POLICY "Workers update within window; Admin updates always" ON public.collections
    FOR UPDATE TO authenticated
    USING (
        (worker_id = auth.uid() AND collection_timestamp > (now() - interval '2 hours')) 
        OR public.is_admin()
    )
    WITH CHECK (
        (worker_id = auth.uid() AND collection_timestamp > (now() - interval '2 hours')) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Admin delete collections" ON public.collections;
CREATE POLICY "Admin delete collections" ON public.collections
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- COLLECTION WEIGHT ITEMS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read items for readable collections" ON public.collection_weight_items;
CREATE POLICY "Read items for readable collections" ON public.collection_weight_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND (c.worker_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Insert items for accessible collections" ON public.collection_weight_items;
CREATE POLICY "Insert items for accessible collections" ON public.collection_weight_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND (c.worker_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admin manage collection weight items" ON public.collection_weight_items;
CREATE POLICY "Admin manage collection weight items" ON public.collection_weight_items
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- COLLECTION ATTACHMENTS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read attachments for accessible collections" ON public.collection_attachments;
CREATE POLICY "Read attachments for accessible collections" ON public.collection_attachments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND (c.worker_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Insert attachments for own collections" ON public.collection_attachments;
CREATE POLICY "Insert attachments for own collections" ON public.collection_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND (c.worker_id = auth.uid() OR public.is_admin())
        )
    );

-- -----------------------------------------------------------------------------
-- BUSINESS SETTINGS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.business_settings;
CREATE POLICY "Anyone authenticated can read settings" ON public.business_settings
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin update business settings" ON public.business_settings;
CREATE POLICY "Admin update business settings" ON public.business_settings
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- AUDIT LOGS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin read audit logs" ON public.audit_logs;
CREATE POLICY "Admin read audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- REALTIME CONFIGURATION
-- -----------------------------------------------------------------------------
-- Safely add tables to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'collections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'business_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.business_settings;
    END IF;
END $$;
