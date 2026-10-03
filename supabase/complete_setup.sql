-- =============================================================================
-- SHAN POULTRY PROTEIN
-- MASTER SUPABASE SETUP SCRIPT (Run this entire script in Supabase SQL Editor)
-- Project: https://ohwslpcuetrpkqhvvszu.supabase.co
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Timezone setup for Pakistan
SET timezone = 'Asia/Karachi';

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked with Supabase Auth users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'worker', 'manager')) DEFAULT 'worker',
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

-- Trigger to automatically create or update profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Worker'),
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = timezone('Asia/Karachi', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security helper function to check whether active user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager') AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- 2. CUSTOMERS TABLE (Poultry shops & wholesale vendors)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    address TEXT,
    area TEXT NOT NULL,
    rate_per_kg NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (rate_per_kg >= 0),
    category_rates JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_area ON public.customers(area);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_search ON public.customers(name, phone, customer_code);

-- -----------------------------------------------------------------------------
-- 3. WEIGHT CATEGORIES TABLE (Dynamic categories for poultry waste)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weight_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    urdu_name TEXT,
    unit TEXT NOT NULL DEFAULT 'KG',
    default_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (default_rate >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

-- Seed standard poultry waste categories (Admin can rename at any time in Settings)
INSERT INTO public.weight_categories (code, name, urdu_name, unit, default_rate, display_order)
VALUES 
    ('cat_1', 'Weight Category 1', 'وزن کیٹیگری ۱', 'KG', 45.00, 1),
    ('cat_2', 'Weight Category 2', 'وزن کیٹیگری ۲', 'KG', 40.00, 2),
    ('waste', 'Waste Weight', 'فضلہ وزن', 'KG', 48.00, 3),
    ('fat', 'Fat Weight', 'چربی وزن', 'KG', 55.00, 4)
ON CONFLICT (code) DO UPDATE
SET default_rate = EXCLUDED.default_rate,
    urdu_name = EXCLUDED.urdu_name;

-- -----------------------------------------------------------------------------
-- 4. COLLECTIONS TABLE (Master collection slips)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS collection_receipt_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no TEXT UNIQUE NOT NULL,
    client_uuid UUID UNIQUE NOT NULL, -- Idempotency key from mobile client
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    worker_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    collection_time TIME NOT NULL DEFAULT CURRENT_TIME,
    collection_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now()),
    gross_weight NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (gross_weight >= 0),
    tare_weight NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tare_weight >= 0),
    total_net_weight NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_net_weight >= 0),
    rate_per_kg NUMERIC(10,2) DEFAULT 0.00 CHECK (rate_per_kg >= 0),
    total_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (total_amount >= 0),
    notes TEXT,
    signature_url TEXT,
    signature_timestamp TIMESTAMPTZ,
    signee_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'verified', 'cancelled')) DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

CREATE INDEX IF NOT EXISTS idx_collections_date ON public.collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_collections_customer ON public.collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_worker ON public.collections(worker_id);
CREATE INDEX IF NOT EXISTS idx_collections_timestamp ON public.collections(collection_timestamp DESC);

-- Automatic receipt generator trigger (e.g. SPP-202610-01001)
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
        NEW.receipt_no := 'SPP-' || TO_CHAR(NEW.collection_date, 'YYYYMM') || '-' || LPAD(nextval('collection_receipt_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_receipt_no ON public.collections;
CREATE TRIGGER trigger_generate_receipt_no
    BEFORE INSERT ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.generate_receipt_number();

-- -----------------------------------------------------------------------------
-- 5. COLLECTION WEIGHT ITEMS TABLE (Line-item breakdown per category)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collection_weight_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.weight_categories(id) ON DELETE RESTRICT,
    weight NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (weight >= 0),
    rate NUMERIC(10,2) DEFAULT 0.00 CHECK (rate >= 0),
    amount NUMERIC(12,2) DEFAULT 0.00 CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now()),
    UNIQUE(collection_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_items_collection ON public.collection_weight_items(collection_id);

-- -----------------------------------------------------------------------------
-- 6. COLLECTION ATTACHMENTS TABLE (Scale & receipt photos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collection_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    storage_bucket TEXT NOT NULL DEFAULT 'collection-attachments',
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

CREATE INDEX IF NOT EXISTS idx_attachments_collection ON public.collection_attachments(collection_id);

-- -----------------------------------------------------------------------------
-- 7. BUSINESS SETTINGS TABLE (Single row configuration)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL DEFAULT 'SHAN POULTRY PROTEIN',
    business_phone TEXT DEFAULT '+92 300 1234567',
    business_email TEXT DEFAULT 'info@shanpoultryprotein.com',
    business_address TEXT DEFAULT 'Main Multan Road, Sahiwal / Gaggoo Mandi, Punjab, Pakistan',
    logo_url TEXT,
    currency_code TEXT NOT NULL DEFAULT 'PKR',
    currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
    default_weight_unit TEXT NOT NULL DEFAULT 'KG',
    timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
    monthly_register_empty_symbol TEXT NOT NULL DEFAULT 'X',
    enable_rates BOOLEAN NOT NULL DEFAULT true,
    allow_worker_edit_hours INT NOT NULL DEFAULT 2,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now()),
    updated_by UUID REFERENCES public.profiles(id)
);

-- Seed initial business configuration
INSERT INTO public.business_settings (business_name, currency_code, default_weight_unit, timezone)
SELECT 'SHAN POULTRY PROTEIN', 'PKR', 'KG', 'Asia/Karachi'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- -----------------------------------------------------------------------------
-- 8. AUDIT LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    rec_id TEXT;
    old_val JSONB := NULL;
    new_val JSONB := NULL;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        rec_id := OLD.id::TEXT;
        old_val := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        rec_id := NEW.id::TEXT;
        old_val := to_jsonb(OLD);
        new_val := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
        rec_id := NEW.id::TEXT;
        new_val := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, rec_id, old_val, new_val);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_collections ON public.collections;
CREATE TRIGGER audit_collections
    AFTER INSERT OR UPDATE OR DELETE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_customers ON public.customers;
CREATE TRIGGER audit_customers
    AFTER UPDATE OR DELETE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_weight_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public view profiles" ON public.profiles;
CREATE POLICY "Public view profiles" ON public.profiles FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "User update own profile" ON public.profiles;
CREATE POLICY "User update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Admin full control on profiles" ON public.profiles;
CREATE POLICY "Admin full control on profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

-- Customers Policies
DROP POLICY IF EXISTS "View customers" ON public.customers;
CREATE POLICY "View customers" ON public.customers FOR SELECT TO authenticated, anon USING (is_deleted = false OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage customers" ON public.customers;
CREATE POLICY "Admin manage customers" ON public.customers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Weight Categories Policies
DROP POLICY IF EXISTS "Read weight categories" ON public.weight_categories;
CREATE POLICY "Read weight categories" ON public.weight_categories FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admin manage categories" ON public.weight_categories;
CREATE POLICY "Admin manage categories" ON public.weight_categories FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Collections Policies
DROP POLICY IF EXISTS "Read collections" ON public.collections;
CREATE POLICY "Read collections" ON public.collections FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Insert collections" ON public.collections;
CREATE POLICY "Insert collections" ON public.collections FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Update collections" ON public.collections;
CREATE POLICY "Update collections" ON public.collections FOR UPDATE TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Delete collections" ON public.collections;
CREATE POLICY "Delete collections" ON public.collections FOR DELETE TO authenticated, anon USING (true);

-- Collection Weight Items Policies
DROP POLICY IF EXISTS "Read collection items" ON public.collection_weight_items;
CREATE POLICY "Read collection items" ON public.collection_weight_items FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Insert collection items" ON public.collection_weight_items;
CREATE POLICY "Insert collection items" ON public.collection_weight_items FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage collection items" ON public.collection_weight_items;
CREATE POLICY "Admin manage collection items" ON public.collection_weight_items FOR ALL TO authenticated, anon USING (true);

-- Attachments Policies
DROP POLICY IF EXISTS "Read attachments" ON public.collection_attachments;
CREATE POLICY "Read attachments" ON public.collection_attachments FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Insert attachments" ON public.collection_attachments;
CREATE POLICY "Insert attachments" ON public.collection_attachments FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Business Settings Policies
DROP POLICY IF EXISTS "Read settings" ON public.business_settings;
CREATE POLICY "Read settings" ON public.business_settings FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Update settings" ON public.business_settings;
CREATE POLICY "Update settings" ON public.business_settings FOR UPDATE TO authenticated, anon USING (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Read audit logs" ON public.audit_logs;
CREATE POLICY "Read audit logs" ON public.audit_logs FOR SELECT TO authenticated, anon USING (true);

-- -----------------------------------------------------------------------------
-- 10. REALTIME CONFIGURATION
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 11. STORAGE BUCKETS PROVISIONING
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('business-assets', 'business-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
    ('signatures', 'signatures', true, 2097152, ARRAY['image/png', 'image/webp']),
    ('collection-attachments', 'collection-attachments', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Storage object policies
DROP POLICY IF EXISTS "Public can view storage objects" ON storage.objects;
CREATE POLICY "Public can view storage objects" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Upload storage objects" ON storage.objects;
CREATE POLICY "Upload storage objects" ON storage.objects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update storage objects" ON storage.objects;
CREATE POLICY "Update storage objects" ON storage.objects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Delete storage objects" ON storage.objects;
CREATE POLICY "Delete storage objects" ON storage.objects FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- 12. SEED REALISTIC SAMPLE DATA (Shops & Collections)
-- -----------------------------------------------------------------------------
INSERT INTO public.customers (id, customer_code, name, contact_person, phone, alternate_phone, address, area, rate_per_kg, status, notes)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'CUST-001', 'Al-Rehman Chicken Center', 'Haji Rehman', '+92 300 1112233', '+92 321 1112233', 'Main Market, Shop #12', 'Gaggoo Mandi', 45.00, 'active', 'Daily waste pickup at 8:00 AM'),
    ('c1000000-0000-0000-0000-000000000002', 'CUST-002', 'Madina Poultry & Broilers', 'Muhammad Tariq', '+92 301 2223344', NULL, 'College Road, Near Shell Pump', 'Burewala', 48.00, 'active', 'High volume fat supplier'),
    ('c1000000-0000-0000-0000-000000000003', 'CUST-003', 'Bilal Meat & Broiler Point', 'Bilal Ahmed', '+92 302 3334455', '+92 333 3334455', 'Railway Road, Stall #4', 'Vehari', 42.00, 'active', 'Evening collection preferred'),
    ('c1000000-0000-0000-0000-000000000004', 'CUST-004', 'Subhan Poultry Dressing', 'Subhan Ali', '+92 303 4445566', NULL, 'Grain Market Gate 2', 'Chichawatni', 46.50, 'active', 'Specialized in broiler offal'),
    ('c1000000-0000-0000-0000-000000000005', 'CUST-005', 'Ittehad Broiler Wholesale', 'Malik Ittehad', '+92 304 5556677', '+92 312 5556677', 'Katchery Chowk', 'Sahiwal', 50.00, 'active', 'Large slaughterhouse unit')
ON CONFLICT (customer_code) DO NOTHING;

-- Seed Sample Collections for the Register
DO $$
DECLARE
    cat1_id UUID;
    waste_id UUID;
    fat_id UUID;
    col1_id UUID := 'd1000000-0000-0000-0000-000000000001';
    col2_id UUID := 'd1000000-0000-0000-0000-000000000002';
    col3_id UUID := 'd1000000-0000-0000-0000-000000000003';
BEGIN
    SELECT id INTO cat1_id FROM public.weight_categories WHERE code = 'cat_1';
    SELECT id INTO waste_id FROM public.weight_categories WHERE code = 'waste';
    SELECT id INTO fat_id FROM public.weight_categories WHERE code = 'fat';

    -- Slip 1: Today for Customer 1
    INSERT INTO public.collections (
        id, receipt_no, client_uuid, customer_id,
        collection_date, collection_time, gross_weight, tare_weight, total_net_weight, rate_per_kg, total_amount, status
    ) VALUES (
        col1_id, 'SPP-202610-00101', 'e1000000-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000001',
        CURRENT_DATE, '08:30:00', 82.50, 2.50, 80.00, 45.00, 3600.00, 'submitted'
    ) ON CONFLICT (id) DO NOTHING;

    IF cat1_id IS NOT NULL THEN
        INSERT INTO public.collection_weight_items (collection_id, category_id, weight, rate, amount)
        VALUES (col1_id, cat1_id, 80.00, 45.00, 3600.00)
        ON CONFLICT (collection_id, category_id) DO NOTHING;
    END IF;

    -- Slip 2: Today for Customer 2
    INSERT INTO public.collections (
        id, receipt_no, client_uuid, customer_id,
        collection_date, collection_time, gross_weight, tare_weight, total_net_weight, rate_per_kg, total_amount, status
    ) VALUES (
        col2_id, 'SPP-202610-00102', 'e1000000-0000-0000-0000-000000000002',
        'c1000000-0000-0000-0000-000000000002',
        CURRENT_DATE, '09:15:00', 125.00, 5.00, 120.00, 48.00, 5760.00, 'submitted'
    ) ON CONFLICT (id) DO NOTHING;

    IF waste_id IS NOT NULL AND fat_id IS NOT NULL THEN
        INSERT INTO public.collection_weight_items (collection_id, category_id, weight, rate, amount)
        VALUES 
            (col2_id, waste_id, 70.00, 48.00, 3360.00),
            (col2_id, fat_id, 50.00, 48.00, 2400.00)
        ON CONFLICT (collection_id, category_id) DO NOTHING;
    END IF;

    -- Slip 3: Yesterday for Customer 3
    INSERT INTO public.collections (
        id, receipt_no, client_uuid, customer_id,
        collection_date, collection_time, gross_weight, tare_weight, total_net_weight, rate_per_kg, total_amount, status
    ) VALUES (
        col3_id, 'SPP-202610-00103', 'e1000000-0000-0000-0000-000000000003',
        'c1000000-0000-0000-0000-000000000003',
        CURRENT_DATE - INTERVAL '1 day', '10:00:00', 95.00, 3.00, 92.00, 42.00, 3864.00, 'submitted'
    ) ON CONFLICT (id) DO NOTHING;

    IF waste_id IS NOT NULL THEN
        INSERT INTO public.collection_weight_items (collection_id, category_id, weight, rate, amount)
        VALUES (col3_id, waste_id, 92.00, 42.00, 3864.00)
        ON CONFLICT (collection_id, category_id) DO NOTHING;
    END IF;
END $$;
