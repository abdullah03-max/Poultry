# SHAN POULTRY PROTEIN
## Poultry Waste Collection & Weight Management System
### Modern B2B Daylight Corporate Edition

A digitized, enterprise-grade poultry waste collection and weight management platform tailored for **SHAN POULTRY PROTEIN** (Pakistan — Timezone: `Asia/Karachi`, Currency: `PKR`).

This platform digitizes the physical paper workflow: customer collection receipts, daily weight sheets, and the 31-day handwritten monthly matrix register, providing **one centralized system with two streamlined interfaces**:

1. **Admin Web Dashboard (`web-admin`)**: Complete command center for desktop/laptop with real-time sync, master collections, daily/monthly registers, reports, business configuration, and dedicated worker account management.
2. **Field Worker Mobile App (`mobile-worker`)**: Simple, fast, touch-friendly mobile application built strictly for data collection in the field (login, customer selection, weight entry, signature capture, offline sync).

---

## 🎨 Fresh, Modern Daylight Corporate Design System

The system features a **high-trust daylight corporate palette**:
- **Primary Brand**: Royal Blue (`#2563EB` / `#1D4ED8`)
- **Executive Accents**: Deep Navy (`#0F172A`)
- **Poultry / Revenue Stream**: Warm Amber (`#F59E0B` / `#D97706`)
- **Success / Active**: Emerald Green (`#059669` / `#10B981`)
- **Background**: Daylight Mist (`#F8FAFC`)
- **Surfaces & Cards**: Pure White (`#FFFFFF`) with Crisp Slate Borders (`#E2E8F0`)

---

## 🏗️ System Architecture

```
d:/Poltry/
├── supabase/
│   ├── complete_setup.sql            # Master all-in-one SQL script for Supabase SQL Editor
│   └── migrations/                   # Individual SQL migrations
│
├── web-admin/                        # Web Admin Dashboard (React 18 + TypeScript + Vite + Tailwind)
│   ├── src/
│   │   ├── components/               # MonthlyMatrixTable, StatCards, Modals, Header, Sidebar
│   │   ├── context/                  # AuthContext (Role-based access & instant sign-in)
│   │   ├── pages/                    # Dashboard, Workers Management, DailyRecords, MonthlyRegister, etc.
│   │   ├── services/                 # API service layer with Supabase RPC support
│   │   ├── types/                    # PostgreSQL schema interfaces
│   │   └── utils/                    # Formatters (Asia/Karachi & PKR) and CSV/Print exporters
│   └── dist/                         # Production build bundle
│
└── mobile-worker/                    # Field Worker Mobile App (React Native / Expo / TypeScript)
    ├── src/
    │   ├── components/               # CustomerPicker, SignaturePad (touch canvas)
    │   ├── context/                  # Mobile AuthContext
    │   ├── navigation/               # AppNavigator with daylight bottom tab bar
    │   ├── screens/                  # NewCollection, Home, MyCollections, Customers, Profile
    │   ├── services/                 # Supabase client & OfflineQueue (Idempotent client UUID)
    │   └── types/                    # Mobile data models
    └── App.tsx                       # Root Expo component
```

---

## 👥 Dedicated Worker Account Management (Web Admin)

Admins can manage field collectors directly from the **Workers Management** tab in the Web Admin:
- **Add Worker**: Create account with Full Name, Phone, Email/Username, and Password. Automatically hashes password and provisions in `auth.users` and `public.profiles`.
- **Edit Details**: Update worker name, phone number, and status.
- **Reset Password**: Reset worker login credentials securely.
- **Activate / Deactivate**: 1-click status toggle that locks or unlocks worker access.
- **Activity Log**: View total collections and KG collected per worker.

---

## 🚀 Quick Start Guide

### 1. Web Admin Dashboard

```bash
cd web-admin

# Install dependencies
pnpm install

# Start local development server
pnpm run dev
# Dashboard opens on http://localhost:5173

# Production build test
pnpm run build
```

### 2. Field Worker Mobile App (Expo)

```bash
cd mobile-worker

# Start Expo development server
npx expo start
```

---

## 🗄️ Supabase All-in-One Database Setup

1. Open your Supabase Project: `https://ohwslpcuetrpkqhvvszu.supabase.co`
2. Go to **SQL Editor**.
3. Copy and run the entire contents of `supabase/complete_setup.sql`.
   This script creates:
   - All tables (`profiles`, `customers`, `weight_categories`, `collections`, `collection_weight_items`, `collection_attachments`, `business_settings`, `audit_logs`)
   - Worker Account Management RPCs (`admin_create_worker`, `admin_reset_worker_password`, `admin_set_worker_status`)
   - Auto receipt number generator trigger (`SPP-YYYYMM-XXXXX`)
   - Row Level Security (RLS) policies
   - Supabase Storage buckets (`business-assets`, `signatures`, `collection-attachments`)
   - Realtime replication configuration
   - Seed sample data for local testing
