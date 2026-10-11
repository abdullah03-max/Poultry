const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '../web-admin/node_modules/pg'));

const sql = `
-- =============================================================================
-- SHAN CHICKEN MEAT & DIGITAL KHATA - Complete Supabase Database Schema
-- Dedicated tables for products, customers, POS sales, payments, stock logs,
-- fresh arrivals, and expenses.
-- =============================================================================

-- 1. Chicken Shop Products
CREATE TABLE IF NOT EXISTS public.chicken_shop_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    urdu_name TEXT,
    category TEXT DEFAULT 'Chicken Cuts',
    unit TEXT DEFAULT 'KG',
    rate_per_kg NUMERIC DEFAULT 0,
    stock_kg NUMERIC DEFAULT 0,
    min_stock_alert NUMERIC DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Chicken Shop Customers / Khata Ledger
CREATE TABLE IF NOT EXISTS public.chicken_shop_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    shop_name TEXT,
    opening_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    total_purchases NUMERIC DEFAULT 0,
    total_payments NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Chicken Shop POS Sales & Invoices
CREATE TABLE IF NOT EXISTS public.chicken_shop_sales (
    id TEXT PRIMARY KEY,
    invoice_no TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    phone TEXT,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sale_time TEXT DEFAULT '12:00:00',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_weight_kg NUMERIC DEFAULT 0,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    received_amount NUMERIC DEFAULT 0,
    remaining_due NUMERIC DEFAULT 0,
    previous_balance NUMERIC DEFAULT 0,
    new_balance NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Chicken Shop Payments / Wasooli
CREATE TABLE IF NOT EXISTS public.chicken_shop_payments (
    id TEXT PRIMARY KEY,
    voucher_no TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash',
    previous_balance NUMERIC DEFAULT 0,
    new_balance NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Chicken Shop Stock Movement Logs
CREATE TABLE IF NOT EXISTS public.chicken_shop_stock_logs (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL,
    change_kg NUMERIC NOT NULL,
    balance_after_kg NUMERIC NOT NULL,
    reference_id TEXT,
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Fresh Chicken Arrivals (Aamad)
CREATE TABLE IF NOT EXISTS public.chicken_shop_fresh_arrivals (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT DEFAULT '12:00:00',
    weight_kg NUMERIC NOT NULL DEFAULT 0,
    rate_per_kg NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    selling_rate_per_kg NUMERIC NOT NULL DEFAULT 0,
    category_id TEXT,
    category_name TEXT,
    supplier_name TEXT,
    birds_count NUMERIC,
    vehicle_no TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Chicken Shop Operating Expenses
CREATE TABLE IF NOT EXISTS public.chicken_shop_expenses (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    category_urdu TEXT,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cs_products_active ON public.chicken_shop_products(is_active);
CREATE INDEX IF NOT EXISTS idx_cs_customers_phone ON public.chicken_shop_customers(phone);
CREATE INDEX IF NOT EXISTS idx_cs_sales_date ON public.chicken_shop_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_cs_sales_cust ON public.chicken_shop_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_cs_payments_date ON public.chicken_shop_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_cs_stock_logs_date ON public.chicken_shop_stock_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_cs_fresh_arrivals_date ON public.chicken_shop_fresh_arrivals(date DESC);
CREATE INDEX IF NOT EXISTS idx_cs_expenses_date ON public.chicken_shop_expenses(date DESC);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.chicken_shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_shop_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_shop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_shop_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_shop_stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_shop_fresh_arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_shop_expenses ENABLE ROW LEVEL SECURITY;

-- Anonymous and Authenticated access policies
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'chicken_shop_products',
        'chicken_shop_customers',
        'chicken_shop_sales',
        'chicken_shop_payments',
        'chicken_shop_stock_logs',
        'chicken_shop_fresh_arrivals',
        'chicken_shop_expenses'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "allow_anon_all_%I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "allow_anon_all_%I" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "allow_auth_all_%I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "allow_auth_all_%I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- Enable Realtime publication for chicken shop tables
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'chicken_shop_products',
        'chicken_shop_customers',
        'chicken_shop_sales',
        'chicken_shop_payments',
        'chicken_shop_stock_logs',
        'chicken_shop_fresh_arrivals',
        'chicken_shop_expenses'
    ];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tbl IN ARRAY tables LOOP
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
            EXCEPTION
                WHEN duplicate_object THEN NULL;
                WHEN others THEN NULL;
            END;
        END LOOP;
    END IF;
END $$;
`;

async function main() {
  const client = new Client({
    host: 'db.ohwslpcuetrpkqhvvszu.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'U3hM8k*v@U/HBPu',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false,
    },
  });

  console.log('Connecting to Supabase PostgreSQL...');
  try {
    await client.connect();
    console.log('Connected successfully!');

    console.log('Creating all Chicken Shop Management tables in Supabase...');
    await client.query(sql);
    console.log('SUCCESS: All 7 Chicken Shop tables, RLS policies, and Realtime publications created in Supabase!');

    // Verify
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'chicken_shop_%'
      ORDER BY table_name;
    `);
    console.log('Verified Chicken Shop tables in Supabase:');
    res.rows.forEach(r => console.log(' - ' + r.table_name));

  } catch (err) {
    console.error('Migration error:', err.message || err);
  } finally {
    await client.end();
  }
}

main();
