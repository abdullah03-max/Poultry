-- =============================================================================
-- Migration: Live Worker GPS Tracking, Customer Collection Window & Alerts
-- =============================================================================

-- 1. Add GPS tracking columns to profiles (workers & admin)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS current_longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 2. Worker location breadcrumb logs table (stores historical tracking trail)
CREATE TABLE IF NOT EXISTS public.worker_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy NUMERIC(8, 2),
    speed NUMERIC(6, 2),
    heading NUMERIC(6, 2),
    is_online BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

CREATE INDEX IF NOT EXISTS idx_worker_locations_worker ON public.worker_locations(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_locations_created ON public.worker_locations(created_at DESC);

-- Enable RLS for worker_locations
ALTER TABLE public.worker_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated and workers to insert location" ON public.worker_locations;
CREATE POLICY "Allow authenticated and workers to insert location"
ON public.worker_locations FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all users to view worker locations" ON public.worker_locations;
CREATE POLICY "Allow all users to view worker locations"
ON public.worker_locations FOR SELECT
USING (true);

-- 3. Add scheduled collection time window to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS collection_start_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS collection_end_time TIME DEFAULT '14:00:00';

-- Backfill existing customers with standard collection windows if null
UPDATE public.customers
SET 
    collection_start_time = COALESCE(collection_start_time, '08:00:00'::time),
    collection_end_time = COALESCE(collection_end_time, '14:00:00'::time)
WHERE collection_start_time IS NULL OR collection_end_time IS NULL;
