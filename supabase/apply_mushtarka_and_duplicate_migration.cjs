const path = require('path');
const { Client } = require(path.join(__dirname, '../web-admin/node_modules/pg'));

const sql = `
-- =============================================================================
-- 1. Chicken Shop: Mushtarka Khata (مشترکہ کھاتہ) Schema
-- Dedicated tables strictly separated from regular commercial Khatadar accounts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.chicken_shop_mushtarka_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    current_balance NUMERIC DEFAULT 0,
    total_purchases NUMERIC DEFAULT 0,
    total_payments NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chicken_shop_mushtarka_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.chicken_shop_mushtarka_customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone TEXT,
    type TEXT NOT NULL CHECK (type IN ('sale', 'payment')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT DEFAULT '12:00:00',
    category_name TEXT,
    weight_kg NUMERIC DEFAULT 0,
    rate_per_kg NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    received_amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    previous_balance NUMERIC DEFAULT 0,
    new_balance NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mush_cust_name ON public.chicken_shop_mushtarka_customers(name);
CREATE INDEX IF NOT EXISTS idx_mush_cust_phone ON public.chicken_shop_mushtarka_customers(phone);
CREATE INDEX IF NOT EXISTS idx_mush_tx_customer ON public.chicken_shop_mushtarka_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_mush_tx_date ON public.chicken_shop_mushtarka_transactions(date DESC);

-- Enable RLS
ALTER TABLE public.chicken_shop_mushtarka_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_shop_mushtarka_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to mushtarka_customers" ON public.chicken_shop_mushtarka_customers;
CREATE POLICY "Allow full access to mushtarka_customers" ON public.chicken_shop_mushtarka_customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to mushtarka_transactions" ON public.chicken_shop_mushtarka_transactions;
CREATE POLICY "Allow full access to mushtarka_transactions" ON public.chicken_shop_mushtarka_transactions FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chicken_shop_mushtarka_customers;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chicken_shop_mushtarka_transactions;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. Poultry Waste: Persistent Duplicate Clearance Columns on collections table
-- =============================================================================

ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS duplicate_cleared BOOLEAN DEFAULT false;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS duplicate_cleared_at TIMESTAMPTZ;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS duplicate_cleared_by TEXT;
`;

async function main() {
  const client = new Client({
    host: 'db.ohwslpcuetrpkqhvvszu.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'U3hM8k*v@U/HBPu',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to Supabase PostgreSQL...');
  try {
    await client.connect();
    console.log('Connected! Executing schema migration...');
    await client.query(sql);
    console.log('SUCCESS: Mushtarka Khata tables and collections.duplicate_cleared created!');
  } catch (err) {
    console.error('Migration error:', err.message || err);
  } finally {
    await client.end();
  }
}

main();
