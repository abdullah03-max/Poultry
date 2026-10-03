# SHAN POULTRY PROTEIN
## Poultry Waste Collection & Weight Management System

A digitized, enterprise-grade poultry waste collection and weight management platform tailored for **SHAN POULTRY PROTEIN** (Pakistan — Timezone: `Asia/Karachi`, Currency: `PKR`).

This platform digitizes the physical paper workflow: customer collection receipts, daily weight sheets, and the 31-day handwritten monthly matrix register.

---

## 🏗️ System Architecture

```
d:/Poltry/
├── supabase/                         # Database migrations, RLS policies, Storage, Seed data
│   ├── migrations/
│   │   ├── 20261003000001_initial_schema.sql
│   │   ├── 20261003000002_rls_policies.sql
│   │   └── 20261003000003_storage_buckets.sql
│   └── seed.sql                      # Realistic test seed data (shops, collectors, slips)
│
├── web-admin/                        # Web Admin Dashboard (React + TypeScript + Vite + Tailwind)
│   ├── src/
│   │   ├── components/               # MonthlyMatrixTable, StatCards, Modals, Header, Sidebar
│   │   ├── context/                  # AuthContext (Role-based access)
│   │   ├── hooks/                    # useRealtimeCollections (Supabase Realtime)
│   │   ├── lib/                      # Supabase client singleton & fallback store
│   │   ├── pages/                    # Dashboard, MonthlyRegister, DailyRecords, Collections, etc.
│   │   ├── services/                 # API service layer (PostgREST queries)
│   │   ├── types/                    # PostgreSQL schema interfaces
│   │   └── utils/                    # Formatters (Karachi time & PKR), CSV/Print exporters
│   └── dist/                         # Production build bundle
│
└── mobile-worker/                    # Field Worker Mobile App (React Native / Expo / TypeScript)
    ├── src/
    │   ├── components/               # CustomerPicker, SignaturePad (touch canvas), Keypad
    │   ├── context/                  # Mobile AuthContext
    │   ├── screens/                  # NewCollection, Home, MyCollections, Customers, Profile
    │   ├── services/                 # Supabase client & OfflineQueue (Idempotent client UUID)
    │   └── types/                    # Mobile data models
    └── app.json                      # Expo application manifest
```

---

## 🚀 Quick Start Guide

### 1. Web Admin Dashboard

```bash
cd web-admin

# Install dependencies (already built with zero errors)
pnpm install

# Start local development server
pnpm run dev
# Dashboard opens on http://localhost:5173

# Production build and preview
pnpm run build
pnpm run preview
```

### 2. Field Worker Mobile App (Expo)

```bash
cd mobile-worker

# Start Expo development server
npx expo start
# Scan the QR code with Expo Go on Android or iOS
```

---

## 🗄️ Supabase Backend Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Execute the SQL migration files in this order:
   - `supabase/migrations/20261003000001_initial_schema.sql` (Tables, triggers, receipt generator sequence)
   - `supabase/migrations/20261003000002_rls_policies.sql` (Row Level Security & Realtime publication)
   - `supabase/migrations/20261003000003_storage_buckets.sql` (Buckets: `signatures`, `collection-attachments`, `business-assets`)
   - `supabase/seed.sql` (Optional: Realistic sample data for Gaggoo Mandi, Burewala, Vehari, and Sahiwal shops)

### 4. Creating the First Admin Account

1. In Supabase Dashboard, go to **Authentication > Users** and click **Add User** (or use your email signup).
2. Promote the user to Admin by running:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = '<USER_UUID>';
   ```

---

## 🔑 Environment Variables

### Web Admin (`web-admin/.env`)
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_DEFAULT_TIMEZONE=Asia/Karachi
VITE_DEFAULT_CURRENCY=PKR
```

### Mobile App (`mobile-worker/.env`)
```ini
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Key Digitized Workflows

1. **Monthly Register Matrix (`/monthly-register`)**:
   - Replaces the paper matrix register.
   - Shows customers as rows, and days 1 to 31 as columns.
   - Days with no collection are marked as `'X'` (configurable in Settings).
   - Bottom row displays daily total weight across all customers.
   - Right columns display individual monthly total weight and billing amounts.
   - Print stylesheet optimized for horizontal landscape printing.
   - Direct export to Excel/CSV with register structure preserved.

2. **Daily Record Sheet (`/daily-records`)**:
   - Reconciles collections for any selected date with subtotal breakdown per weight category.

3. **Rapid Field Collection (Mobile)**:
   - Worker picks shop via fast search (code/phone/area).
   - Enters category weights or scale gross & crate tare.
   - Captures customer touch signature directly on screen.
   - Optional camera photo of scale or crate.
   - Saves slip with client-generated UUID idempotency key; auto-retries in background if network drops.
   - Form resets instantly for next shop with zero friction.
