-- =============================================================================
-- SHAN POULTRY PROTEIN - Dedicated Chicken Shop Management & Khata Table
-- Run this script in the Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.chicken_shop_records (
    id TEXT PRIMARY KEY DEFAULT ('cs-rec-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6)),
    voucher_no TEXT,
    customer_name TEXT NOT NULL,
    phone TEXT,
    dokan_khata TEXT,
    customer_khata TEXT,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Boles (بونلس)
    boles_weight NUMERIC DEFAULT 0,
    boles_rate NUMERIC DEFAULT 0,
    boles_total NUMERIC DEFAULT 0,
    
    -- Thai (تھائی)
    thai_weight NUMERIC DEFAULT 0,
    thai_rate NUMERIC DEFAULT 0,
    thai_total NUMERIC DEFAULT 0,
    
    -- Gosht (گوشت)
    gosht_weight NUMERIC DEFAULT 0,
    gosht_rate NUMERIC DEFAULT 0,
    gosht_total NUMERIC DEFAULT 0,
    
    -- Aggregated Totals & Khata Balances
    total_weight NUMERIC DEFAULT 0,
    subtotal_amount NUMERIC DEFAULT 0,
    bakaya_raqam NUMERIC DEFAULT 0,
    total_raqam NUMERIC DEFAULT 0,
    received_amount NUMERIC DEFAULT 0,
    remaining_balance NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_chicken_shop_record_date ON public.chicken_shop_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_chicken_shop_customer_name ON public.chicken_shop_records(customer_name);

-- Enable RLS and permissive policy
ALTER TABLE public.chicken_shop_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to chicken_shop_records" ON public.chicken_shop_records;
CREATE POLICY "Allow authenticated full access to chicken_shop_records"
    ON public.chicken_shop_records
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon full access to chicken_shop_records" ON public.chicken_shop_records;
CREATE POLICY "Allow anon full access to chicken_shop_records"
    ON public.chicken_shop_records
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Ensure profiles has location tracking fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_latitude NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_longitude NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Ensure worker_locations table exists for breadcrumbs
CREATE TABLE IF NOT EXISTS public.worker_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    accuracy NUMERIC,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.worker_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to worker_locations" ON public.worker_locations;
CREATE POLICY "Allow full access to worker_locations"
    ON public.worker_locations
    FOR ALL
    USING (true)
    WITH CHECK (true);
