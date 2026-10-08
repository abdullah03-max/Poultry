-- =============================================================================
-- SHAN POULTRY PROTEIN - Dedicated Chicken Shop Management & GPS Tracking SQL
-- Run this script in the Supabase SQL Editor
-- =============================================================================

-- 1. Create Chicken Shop Management table
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

-- Indexes for fast searches and date filtering
CREATE INDEX IF NOT EXISTS idx_chicken_shop_record_date ON public.chicken_shop_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_chicken_shop_customer_name ON public.chicken_shop_records(customer_name);
CREATE INDEX IF NOT EXISTS idx_chicken_shop_dokan ON public.chicken_shop_records(dokan_khata);

-- Row Level Security (RLS) for Chicken Shop records
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

-- 2. Worker GPS location tracking columns on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_latitude NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_longitude NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 3. Worker location breadcrumb logs table (stores historical tracking trail)
CREATE TABLE IF NOT EXISTS public.worker_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    accuracy NUMERIC,
    speed NUMERIC,
    heading NUMERIC,
    is_online BOOLEAN DEFAULT true,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.worker_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to worker_locations" ON public.worker_locations;
CREATE POLICY "Allow full access to worker_locations"
    ON public.worker_locations
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon full access to worker_locations" ON public.worker_locations;
CREATE POLICY "Allow anon full access to worker_locations"
    ON public.worker_locations
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_worker_locations_worker ON public.worker_locations(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_locations_created ON public.worker_locations(created_at DESC);

-- 4. Compatibility View: "public.workers" (points to profiles with role = 'worker')
-- Prevents "relation public.workers does not exist" errors
CREATE OR REPLACE VIEW public.workers AS
SELECT * FROM public.profiles WHERE role = 'worker';

-- 5. Add tables to Supabase Realtime safely (ignoring if already present)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chicken_shop_records;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN others THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN others THEN NULL;
        END;
    END IF;
END $$;
