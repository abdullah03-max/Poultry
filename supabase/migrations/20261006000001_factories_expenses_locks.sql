-- =============================================================================
-- Migration: Factories, Factory Transactions, Expenses, and Section Locks
-- =============================================================================

-- 1. Extend business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS business_name_urdu TEXT DEFAULT 'شان پولٹری پروٹین',
ADD COLUMN IF NOT EXISTS common_collection_start_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS common_collection_end_time TIME DEFAULT '14:00:00',
ADD COLUMN IF NOT EXISTS locked_sections JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS section_lock_pin TEXT DEFAULT '1234';

-- 2. Factories Table
CREATE TABLE IF NOT EXISTS public.factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    whatsapp_no TEXT NOT NULL,
    address TEXT,
    area TEXT NOT NULL DEFAULT 'Punjab',
    rate_charbi NUMERIC(10, 2) NOT NULL DEFAULT 65.00,
    rate_kachara NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

CREATE INDEX IF NOT EXISTS idx_factories_status ON public.factories(status);

-- 3. Factory Transactions Table (Supplies & Payments)
CREATE TABLE IF NOT EXISTS public.factory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no TEXT NOT NULL UNIQUE,
    factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    charbi_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    charbi_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    charbi_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    kachara_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    kachara_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    kachara_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    received_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    vehicle_no TEXT,
    driver_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

CREATE INDEX IF NOT EXISTS idx_factory_tx_factory ON public.factory_transactions(factory_id);
CREATE INDEX IF NOT EXISTS idx_factory_tx_date ON public.factory_transactions(transaction_date DESC);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('worker', 'transportation', 'fuel', 'loading', 'maintenance', 'food', 'other')),
    category_name_urdu TEXT,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    person_name TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'online', 'bank')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Karachi', now())
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- Enable RLS
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all full access to factories" ON public.factories;
CREATE POLICY "Allow all full access to factories" ON public.factories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all full access to factory_transactions" ON public.factory_transactions;
CREATE POLICY "Allow all full access to factory_transactions" ON public.factory_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all full access to expenses" ON public.expenses;
CREATE POLICY "Allow all full access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
