-- =============================================================================
-- Migration: Charbi and Kachara Pricing & Weight Categories
-- =============================================================================

-- 1. Ensure Charbi and Kachara categories exist and update names/Urdu terms
UPDATE public.weight_categories 
SET name = 'Charbi Weight', urdu_name = 'چربی وزن', is_active = true, display_order = 1
WHERE code IN ('fat', 'charbi');

UPDATE public.weight_categories 
SET name = 'Kachara Weight', urdu_name = 'کچرا وزن', is_active = true, display_order = 2
WHERE code IN ('waste', 'kachara');

-- Deactivate old generic categories if they exist
UPDATE public.weight_categories
SET is_active = false
WHERE code IN ('cat_1', 'cat_2');

-- Ensure Charbi exists
INSERT INTO public.weight_categories (code, name, urdu_name, unit, default_rate, is_active, display_order)
SELECT 'charbi', 'Charbi Weight', 'چربی وزن', 'KG', 55.00, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.weight_categories WHERE code IN ('charbi', 'fat'));

-- Ensure Kachara exists
INSERT INTO public.weight_categories (code, name, urdu_name, unit, default_rate, is_active, display_order)
SELECT 'kachara', 'Kachara Weight', 'کچرا وزن', 'KG', 45.00, true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.weight_categories WHERE code IN ('kachara', 'waste'));

-- 2. Add customer rate columns for Charbi and Kachara
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS rate_charbi NUMERIC(10,2) DEFAULT 55.00 CHECK (rate_charbi >= 0),
ADD COLUMN IF NOT EXISTS rate_kachara NUMERIC(10,2) DEFAULT 45.00 CHECK (rate_kachara >= 0);

-- Backfill existing customers
UPDATE public.customers
SET 
  rate_charbi = COALESCE((category_rates->>'charbi')::numeric, rate_charbi, 55.00),
  rate_kachara = COALESCE((category_rates->>'kachara')::numeric, (category_rates->>'waste')::numeric, rate_per_kg, rate_kachara, 45.00)
WHERE rate_charbi IS NULL OR rate_kachara IS NULL;

-- 3. Add Charbi and Kachara breakdown columns to collections
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS charbi_gross NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS charbi_tare NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS charbi_net NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS charbi_rate NUMERIC(10,2) DEFAULT 55.00,
ADD COLUMN IF NOT EXISTS charbi_total NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS kachara_gross NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS kachara_tare NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS kachara_net NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS kachara_rate NUMERIC(10,2) DEFAULT 45.00,
ADD COLUMN IF NOT EXISTS kachara_total NUMERIC(12,2) DEFAULT 0.00;

