const path = require('path');
const { Client } = require(path.join(__dirname, '../web-admin/node_modules/pg'));

const sql = `
-- =============================================================================
-- SHAN CHICKEN MEAT - Categories & Worker Accounts Migration
-- Safe & Additive: Preserves all existing real customer, sales & business data
-- =============================================================================

-- 1. Chicken Categories (Product Types / Cuts: Legs, Chest, Wings, Tikka Boti, etc.)
CREATE TABLE IF NOT EXISTS public.chicken_shop_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    urdu_name TEXT NOT NULL,
    default_rate_per_kg NUMERIC DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Chicken Shop Workers (Dedicated user accounts for Chicken Shop)
CREATE TABLE IF NOT EXISTS public.chicken_shop_workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    pin TEXT,
    role TEXT DEFAULT 'worker',
    can_daily_sales BOOLEAN DEFAULT true,
    can_khata BOOLEAN DEFAULT true,
    can_wasooli BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cs_categories_active ON public.chicken_shop_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_cs_workers_phone ON public.chicken_shop_workers(phone);
CREATE INDEX IF NOT EXISTS idx_cs_workers_active ON public.chicken_shop_workers(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chicken_shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_shop_workers ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated access
DROP POLICY IF EXISTS "allow_anon_all_chicken_shop_categories" ON public.chicken_shop_categories;
CREATE POLICY "allow_anon_all_chicken_shop_categories" ON public.chicken_shop_categories FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_auth_all_chicken_shop_categories" ON public.chicken_shop_categories;
CREATE POLICY "allow_auth_all_chicken_shop_categories" ON public.chicken_shop_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_all_chicken_shop_workers" ON public.chicken_shop_workers;
CREATE POLICY "allow_anon_all_chicken_shop_workers" ON public.chicken_shop_workers FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_auth_all_chicken_shop_workers" ON public.chicken_shop_workers;
CREATE POLICY "allow_auth_all_chicken_shop_workers" ON public.chicken_shop_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime Publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chicken_shop_categories;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chicken_shop_workers;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- Populate default standard chicken categories ONLY IF table is empty
INSERT INTO public.chicken_shop_categories (id, name, urdu_name, default_rate_per_kg, sort_order, is_active)
SELECT d.id, d.name, d.urdu_name, d.default_rate_per_kg, d.sort_order, true
FROM (VALUES
    ('cat-legs', 'Chicken Legs', 'چکن لیگز', 450, 1),
    ('cat-chest', 'Chicken Chest', 'چکن چیسٹ', 550, 2),
    ('cat-wings', 'Chicken Wings', 'چکن ونگز', 400, 3),
    ('cat-tikka-boti', 'Tikka Boti', 'تکہ بوٹی', 600, 4),
    ('cat-gosht', 'Chicken Gosht (Meat)', 'چکن گوشت', 400, 5),
    ('cat-panjay', 'Chicken Panjay', 'چکن پنجے', 200, 6),
    ('cat-bongs', 'Chicken Bongs', 'چکن بونگز', 450, 7),
    ('cat-boneless', 'Boneless Chicken', 'بون لیس چکن', 650, 8)
) AS d(id, name, urdu_name, default_rate_per_kg, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.chicken_shop_categories LIMIT 1);
`;

async function main() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ohwslpcuetrpkqhvvszu',
    password: 'U3hM8k*v@U/HBPu',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to Supabase PostgreSQL...');
  try {
    await client.connect();
    console.log('Connected!');

    console.log('Running migration for Chicken Shop Categories & Workers...');
    await client.query(sql);
    console.log('Migration completed successfully!');

    // Verify categories
    const catRes = await client.query('SELECT id, name, urdu_name, default_rate_per_kg FROM public.chicken_shop_categories ORDER BY sort_order');
    console.log(`Verified ${catRes.rows.length} categories in Supabase:`);
    catRes.rows.forEach(r => console.log(` - [${r.id}] ${r.name} (${r.urdu_name}) - Rs.${r.default_rate_per_kg}`));

    // Check workers count
    const workerRes = await client.query('SELECT count(*) FROM public.chicken_shop_workers');
    console.log(`Current workers count: ${workerRes.rows[0].count}`);

  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
