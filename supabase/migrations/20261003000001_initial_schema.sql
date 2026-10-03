-- =============================================================================
-- SHAN POULTRY PROTEIN
-- Migration: 20261003000001_initial_schema.sql
-- Description: Core tables, sequences, constraints, and helper functions
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Timezone setup
SET timezone = 'Asia/Karachi';

-- -----------------------------------------------------------------------------
-- 1. PROFILES (Extends Supabase auth.users)
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

-- Security helper function to check whether user has admin privileges
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
-- 2. CUSTOMERS (Poultry shops, wholesale dealers, slaughterhouse vendors)
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
-- 3. WEIGHT CATEGORIES (Dynamic categories for poultry waste)
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

-- Seed standard poultry waste categories (Admin can rename or reorder at any time)
INSERT INTO public.weight_categories (code, name, urdu_name, unit, display_order)
VALUES 
    ('cat_1', 'Weight Category 1', 'وزن کیٹیگری ۱', 'KG', 1),
    ('cat_2', 'Weight Category 2', 'وزن کیٹیگری ۲', 'KG', 2),
    ('waste', 'Waste Weight', 'فضلہ وزن', 'KG', 3),
    ('fat', 'Fat Weight', 'چربی وزن', 'KG', 4)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. COLLECTIONS (Master Collection Slips)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS collection_receipt_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no TEXT UNIQUE NOT NULL,
    client_uuid UUID UNIQUE NOT NULL, -- Idempotency key from mobile client
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
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
-- 5. COLLECTION WEIGHT ITEMS (Line-item breakdown per category)
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
-- 6. COLLECTION ATTACHMENTS (Images from scales/receipts/crates)
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
-- 7. BUSINESS SETTINGS (Single configuration row for SHAN POULTRY PROTEIN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL DEFAULT 'SHAN POULTRY PROTEIN',
    business_phone TEXT DEFAULT '+92 300 1234567',
    business_email TEXT DEFAULT 'info@shanpoultryprotein.com',
    business_address TEXT DEFAULT 'Lahore, Punjab, Pakistan',
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

-- Seed default configuration row
INSERT INTO public.business_settings (business_name, currency_code, default_weight_unit, timezone)
SELECT 'SHAN POULTRY PROTEIN', 'PKR', 'KG', 'Asia/Karachi'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- -----------------------------------------------------------------------------
-- 8. AUDIT LOGS (Compliance & Change tracking)
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

-- Automated Audit Trigger Function
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
