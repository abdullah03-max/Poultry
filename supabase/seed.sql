-- =============================================================================
-- SHAN POULTRY PROTEIN
-- Development Seed Data: seed.sql
-- WARNING: FOR LOCAL / DEVELOPMENT TESTING ONLY. DO NOT USE IN PRODUCTION.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED CUSTOMERS (Realistic Poultry Shops & Vendors)
-- -----------------------------------------------------------------------------
INSERT INTO public.customers (id, customer_code, name, contact_person, phone, alternate_phone, address, area, rate_per_kg, status, notes)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'CUST-001', 'Al-Rehman Chicken Center', 'Haji Rehman', '+92 300 1112233', '+92 321 1112233', 'Main Market, Shop #12', 'Gaggoo Mandi', 45.00, 'active', 'Daily waste pickup at 8:00 AM'),
    ('c1000000-0000-0000-0000-000000000002', 'CUST-002', 'Madina Poultry & Broilers', 'Muhammad Tariq', '+92 301 2223344', NULL, 'College Road, Near Shell Pump', 'Burewala', 48.00, 'active', 'High volume fat supplier'),
    ('c1000000-0000-0000-0000-000000000003', 'CUST-003', 'Bilal Meat & Broiler Point', 'Bilal Ahmed', '+92 302 3334455', '+92 333 3334455', 'Railway Road, Stall #4', 'Vehari', 42.00, 'active', 'Evening collection preferred'),
    ('c1000000-0000-0000-0000-000000000004', 'CUST-004', 'Subhan Poultry Dressing', 'Subhan Ali', '+92 303 4445566', NULL, 'Grain Market Gate 2', 'Chichawatni', 46.50, 'active', 'Specialized in broiler offal'),
    ('c1000000-0000-0000-0000-000000000005', 'CUST-005', 'Ittehad Broiler Wholesale', 'Malik Ittehad', '+92 304 5556677', '+92 312 5556677', 'Katchery Chowk', 'Sahiwal', 50.00, 'active', 'Large slaughterhouse unit'),
    ('c1000000-0000-0000-0000-000000000006', 'CUST-006', 'Kashmir Chicken Store (Inactive)', 'Sheikh Nasir', '+92 305 6667788', NULL, 'Circular Road', 'Burewala', 40.00, 'inactive', 'Temporarily closed for renovation')
ON CONFLICT (customer_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. INITIAL ADMIN / WORKER PROFILES EXPLANATION
-- -----------------------------------------------------------------------------
-- Note: In Supabase, users must first sign up via Supabase Auth (or created via 
-- Dashboard > Authentication > Add User).
-- Once created, you can promote any user to Admin using this simple SQL query:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = '<AUTH_USER_UUID>';
--
-- For local mock testing, sample profile placeholders:
INSERT INTO public.profiles (id, full_name, phone, role, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Admin Owner (Shan Poultry)', '+92 300 0000001', 'admin', true),
    ('b0000000-0000-0000-0000-000000000001', 'Rashid Khan (Collector)', '+92 300 0000002', 'worker', true),
    ('b0000000-0000-0000-0000-000000000002', 'Aslam Pervez (Collector)', '+92 300 0000003', 'worker', true)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. SEED SAMPLE COLLECTIONS (Current Month Register Data)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    cat1_id UUID;
    cat2_id UUID;
    waste_id UUID;
    fat_id UUID;
    col1_id UUID := 'd1000000-0000-0000-0000-000000000001';
    col2_id UUID := 'd1000000-0000-0000-0000-000000000002';
    col3_id UUID := 'd1000000-0000-0000-0000-000000000003';
    col4_id UUID := 'd1000000-0000-0000-0000-000000000004';
    col5_id UUID := 'd1000000-0000-0000-0000-000000000005';
BEGIN
    SELECT id INTO cat1_id FROM public.weight_categories WHERE code = 'cat_1';
    SELECT id INTO cat2_id FROM public.weight_categories WHERE code = 'cat_2';
    SELECT id INTO waste_id FROM public.weight_categories WHERE code = 'waste';
    SELECT id INTO fat_id FROM public.weight_categories WHERE code = 'fat';

    -- Sample 1: Today for Customer 1
    INSERT INTO public.collections (
        id, receipt_no, client_uuid, customer_id, worker_id, 
        collection_date, collection_time, gross_weight, tare_weight, total_net_weight, rate_per_kg, total_amount, status
    ) VALUES (
        col1_id, 'SPP-202610-00101', 'e1000000-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        CURRENT_DATE, '08:30:00', 82.50, 2.50, 80.00, 45.00, 3600.00, 'submitted'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.collection_weight_items (collection_id, category_id, weight, rate, amount)
    VALUES 
        (col1_id, cat1_id, 50.00, 45.00, 2250.00),
        (col1_id, fat_id, 30.00, 45.00, 1350.00)
    ON CONFLICT (collection_id, category_id) DO NOTHING;

    -- Sample 2: Today for Customer 2
    INSERT INTO public.collections (
        id, receipt_no, client_uuid, customer_id, worker_id, 
        collection_date, collection_time, gross_weight, tare_weight, total_net_weight, rate_per_kg, total_amount, status
    ) VALUES (
        col2_id, 'SPP-202610-00102', 'e1000000-0000-0000-0000-000000000002',
        'c1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
        CURRENT_DATE, '09:15:00', 125.00, 5.00, 120.00, 48.00, 5760.00, 'submitted'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.collection_weight_items (collection_id, category_id, weight, rate, amount)
    VALUES 
        (col2_id, waste_id, 70.00, 48.00, 3360.00),
        (col2_id, fat_id, 50.00, 48.00, 2400.00)
    ON CONFLICT (collection_id, category_id) DO NOTHING;

    -- Sample 3: Yesterday for Customer 1
    INSERT INTO public.collections (
        id, receipt_no, client_uuid, customer_id, worker_id, 
        collection_date, collection_time, gross_weight, tare_weight, total_net_weight, rate_per_kg, total_amount, status
    ) VALUES (
        col3_id, 'SPP-202610-00103', 'e1000000-0000-0000-0000-000000000003',
        'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '1 day', '08:45:00', 76.00, 2.00, 74.00, 45.00, 3330.00, 'submitted'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.collection_weight_items (collection_id, category_id, weight, rate, amount)
    VALUES 
        (col3_id, cat1_id, 74.00, 45.00, 3330.00)
    ON CONFLICT (collection_id, category_id) DO NOTHING;

    -- Sample 4: Yesterday for Customer 3
    INSERT INTO public.collections (
        id, receipt_no, client_uuid, customer_id, worker_id, 
        collection_date, collection_time, gross_weight, tare_weight, total_net_weight, rate_per_kg, total_amount, status
    ) VALUES (
        col4_id, 'SPP-202610-00104', 'e1000000-0000-0000-0000-000000000004',
        'c1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '1 day', '10:00:00', 95.00, 3.00, 92.00, 42.00, 3864.00, 'submitted'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.collection_weight_items (collection_id, category_id, weight, rate, amount)
    VALUES 
        (col4_id, waste_id, 60.00, 42.00, 2520.00),
        (col4_id, fat_id, 32.00, 42.00, 1344.00)
    ON CONFLICT (collection_id, category_id) DO NOTHING;

    -- Sample 5: 2 days ago for Customer 4
    INSERT INTO public.collections (
        id, receipt_no, client_uuid, customer_id, worker_id, 
        collection_date, collection_time, gross_weight, tare_weight, total_net_weight, rate_per_kg, total_amount, status
    ) VALUES (
        col5_id, 'SPP-202610-00105', 'e1000000-0000-0000-0000-000000000005',
        'c1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
        CURRENT_DATE - INTERVAL '2 days', '11:20:00', 112.00, 4.00, 108.00, 46.50, 5022.00, 'submitted'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.collection_weight_items (collection_id, category_id, weight, rate, amount)
    VALUES 
        (col5_id, cat1_id, 58.00, 46.50, 2697.00),
        (col5_id, waste_id, 50.00, 46.50, 2325.00)
    ON CONFLICT (collection_id, category_id) DO NOTHING;
END $$;
