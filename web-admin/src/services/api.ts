// =============================================================================
// SHAN POULTRY PROTEIN - API Service Layer
// Bridges Supabase PostgreSQL queries with Realtime & Fallback Mock Store
// =============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Customer,
  Collection,
  WeightCategory,
  BusinessSettings,
  Profile,
  AuditLog,
  MonthlyRegisterCustomerRow,
  Factory,
  FactoryTransaction,
  Expense,
  ChickenShopRecord,
  CustomerAdvanceRecord,
} from '../types/database';
import { getDaysInMonth } from '../utils/formatters';
import { calculateCustomerAdvanceBalance } from '../utils/advanceUtils';

// -----------------------------------------------------------------------------
// In-Memory Seed State for Instant Demonstrability
// -----------------------------------------------------------------------------
let mockCustomers: Customer[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    customer_code: 'CUST-001',
    name: 'Al-Rehman Chicken Center',
    contact_person: 'Haji Rehman',
    phone: '+92 300 1112233',
    alternate_phone: '+92 321 1112233',
    address: 'Main Market, Shop #12',
    area: 'Gaggoo Mandi',
    rate_per_kg: 45.0,
    rate_charbi: 55.0,
    rate_kachara: 45.0,
    category_rates: { charbi: 55.0, kachara: 45.0 },
    collection_start_time: '08:00',
    collection_end_time: '11:00',
    status: 'active',
    notes: 'Daily morning collection at 8:00 AM',
    is_deleted: false,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    customer_code: 'CUST-002',
    name: 'Madina Poultry & Broilers',
    contact_person: 'Muhammad Tariq',
    phone: '+92 301 2223344',
    alternate_phone: null,
    address: 'College Road, Near Shell Pump',
    area: 'Burewala',
    rate_per_kg: 48.0,
    rate_charbi: 58.0,
    rate_kachara: 48.0,
    category_rates: { charbi: 58.0, kachara: 48.0 },
    collection_start_time: '10:00',
    collection_end_time: '13:00',
    status: 'active',
    notes: 'High volume supplier',
    is_deleted: false,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    customer_code: 'CUST-003',
    name: 'Bilal Meat & Broiler Point',
    contact_person: 'Bilal Ahmed',
    phone: '+92 302 3334455',
    alternate_phone: '+92 333 3334455',
    address: 'Railway Road, Stall #4',
    area: 'Vehari',
    rate_per_kg: 42.0,
    rate_charbi: 52.0,
    rate_kachara: 42.0,
    category_rates: { charbi: 52.0, kachara: 42.0 },
    collection_start_time: '12:00',
    collection_end_time: '15:30',
    status: 'active',
    notes: 'Evening collection preferred',
    is_deleted: false,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    customer_code: 'CUST-004',
    name: 'Subhan Poultry Dressing',
    contact_person: 'Subhan Ali',
    phone: '+92 303 4445566',
    alternate_phone: null,
    address: 'Grain Market Gate 2',
    area: 'Chichawatni',
    rate_per_kg: 46.5,
    rate_charbi: 56.5,
    rate_kachara: 46.5,
    category_rates: { charbi: 56.5, kachara: 46.5 },
    status: 'active',
    notes: 'Specialized in broiler offal',
    is_deleted: false,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    customer_code: 'CUST-005',
    name: 'Ittehad Broiler Wholesale',
    contact_person: 'Malik Ittehad',
    phone: '+92 304 5556677',
    alternate_phone: '+92 312 5556677',
    address: 'Katchery Chowk',
    area: 'Sahiwal',
    rate_per_kg: 50.0,
    rate_charbi: 60.0,
    rate_kachara: 50.0,
    category_rates: { charbi: 60.0, kachara: 50.0 },
    status: 'active',
    notes: 'Large slaughterhouse unit',
    is_deleted: false,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let mockCategories: WeightCategory[] = [
  {
    id: 'wc_charbi',
    code: 'charbi',
    name: 'Charbi Weight',
    urdu_name: 'چربی وزن',
    unit: 'KG',
    default_rate: 55.0,
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'wc_kachara',
    code: 'kachara',
    name: 'Kachara Weight',
    urdu_name: 'کچرا وزن',
    unit: 'KG',
    default_rate: 45.0,
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let mockSettings: BusinessSettings = {
  id: 'bs-1',
  business_name: 'SHAN POULTRY PROTEIN',
  business_name_urdu: 'شان پولٹری پروٹین',
  business_phone: '+92 300 1234567',
  business_email: 'info@shanpoultryprotein.com',
  business_address: 'Main Multan Road, Sahiwal / Gaggoo Mandi, Punjab, Pakistan',
  logo_url: null,
  currency_code: 'PKR',
  currency_symbol: 'Rs.',
  default_weight_unit: 'KG',
  timezone: 'Asia/Karachi',
  monthly_register_empty_symbol: 'X',
  enable_rates: true,
  allow_worker_edit_hours: 2,
  common_collection_start_time: '08:00',
  common_collection_end_time: '14:00',
  locked_sections: [],
  section_lock_pin: '1234',
  receipt_title: '🐔 SHAN POULTRY PROTEIN - رسید 🐔',
  receipt_tagline: 'Official B2B Weigh-in Collection & Factory Supply Receipt',
  receipt_footer_phone: '+92 300 1234567',
  updated_at: new Date().toISOString(),
  updated_by: null,
};

let mockWorkers: Profile[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    full_name: 'Rashid Khan (Collector)',
    phone: '+92 300 0000002',
    role: 'worker',
    is_active: true,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    full_name: 'Aslam Pervez (Collector)',
    phone: '+92 300 0000003',
    role: 'worker',
    is_active: true,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Haji Shan (Owner / Admin)',
    phone: '+92 300 0000001',
    role: 'admin',
    is_active: true,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// In-Memory Collections Store (Starts fresh, populated by real database collections or worker submissions)
const generateMockCollections = (): Collection[] => [];

let mockCollections: Collection[] = [];

let mockAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    user_id: mockWorkers[2]?.id || 'admin',
    action: 'SETTINGS_UPDATE',
    table_name: 'business_settings',
    record_id: 'bs-1',
    old_data: { monthly_register_empty_symbol: '-' },
    new_data: { monthly_register_empty_symbol: 'X' },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    profile: mockWorkers[2] || mockWorkers[0],
  },
  {
    id: 'log-2',
    user_id: mockWorkers[0]?.id || 'worker',
    action: 'INSERT',
    table_name: 'collections',
    record_id: 'col-seed-init',
    old_data: null,
    new_data: { receipt_no: 'SPP-INIT', total_net_weight: 0 },
    created_at: new Date(Date.now() - 1800000).toISOString(),
    profile: mockWorkers[0],
  },
];

let mockFactories: Factory[] = [
  {
    id: 'fac-10000000-0000-0000-0000-000000000001',
    factory_code: 'FAC-001',
    name: 'Chenab Feeds & Protein Industries',
    contact_person: 'Mian Tariq Mehmood',
    phone: '+92 300 7788991',
    whatsapp_no: '923007788991',
    address: 'Plot 45, Phase II, Industrial Estate',
    area: 'Multan',
    rate_charbi: 68.0,
    rate_kachara: 52.0,
    status: 'active',
    notes: 'Major buyer for poultry meal and oil processing',
    is_deleted: false,
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fac-10000000-0000-0000-0000-000000000002',
    factory_code: 'FAC-002',
    name: 'Al-Madina Bio-Products & Processing Plant',
    contact_person: 'Sheikh Farooq Ahmed',
    phone: '+92 301 6655443',
    whatsapp_no: '923016655443',
    address: 'Near National Highway Bypass',
    area: 'Sahiwal',
    rate_charbi: 66.0,
    rate_kachara: 50.0,
    status: 'active',
    notes: 'Weekly payment settlement after delivery weight slip',
    is_deleted: false,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fac-10000000-0000-0000-0000-000000000003',
    factory_code: 'FAC-003',
    name: 'Punjab Feather & Offal Recycling Mill',
    contact_person: 'Haji Asif Gujjar',
    phone: '+92 304 9988776',
    whatsapp_no: '923049988776',
    address: 'Chunian / Raiwind Road',
    area: 'Lahore',
    rate_charbi: 70.0,
    rate_kachara: 54.0,
    status: 'active',
    notes: 'Advance paying factory for high-fat charbi loads',
    is_deleted: false,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let mockFactoryTransactions: FactoryTransaction[] = [
  {
    id: 'tx-10000000-0000-0000-0000-000000000001',
    invoice_no: 'FAC-INV-001',
    factory_id: 'fac-10000000-0000-0000-0000-000000000001',
    transaction_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    charbi_weight: 420.0,
    charbi_rate: 68.0,
    charbi_total: 28560.0,
    kachara_weight: 850.0,
    kachara_rate: 52.0,
    kachara_total: 44200.0,
    total_weight: 1270.0,
    total_amount: 72760.0,
    advance_amount: 30000.0,
    received_amount: 72760.0,
    remaining_balance: 0.0,
    payment_status: 'paid',
    vehicle_no: 'SL-8840 (Shehzore)',
    driver_name: 'Muhammad Akram',
    notes: 'Cleared via Bank Alfalah online transfer',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'tx-10000000-0000-0000-0000-000000000002',
    invoice_no: 'FAC-INV-002',
    factory_id: 'fac-10000000-0000-0000-0000-000000000002',
    transaction_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    charbi_weight: 380.0,
    charbi_rate: 66.0,
    charbi_total: 25080.0,
    kachara_weight: 920.0,
    kachara_rate: 50.0,
    kachara_total: 46000.0,
    total_weight: 1300.0,
    total_amount: 71080.0,
    advance_amount: 25000.0,
    received_amount: 45000.0,
    remaining_balance: 26080.0,
    payment_status: 'partial',
    vehicle_no: 'MN-3214 (Mazda)',
    driver_name: 'Liaqat Ali',
    notes: 'Balance Rs. 26,080 committed for next delivery',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

let mockExpenses: Expense[] = [
  {
    id: 'exp-10000000-0000-0000-0000-000000000001',
    expense_code: 'EXP-001',
    category: 'fuel',
    category_name_urdu: 'ڈیزل و پٹرول (Fuel)',
    description: 'Vehicle Mazda MN-3214 Diesel for Gaggoo to Multan supply trip',
    amount: 6500.0,
    expense_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    person_name: 'Driver Liaqat',
    payment_method: 'cash',
    notes: 'Full tank from PSO pump',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'exp-10000000-0000-0000-0000-000000000002',
    expense_code: 'EXP-002',
    category: 'worker',
    category_name_urdu: 'ورکرز یومیہ / وظیفہ (Worker Daily)',
    description: 'Daily collection field allowances for Rashid & Aslam',
    amount: 2400.0,
    expense_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    person_name: 'Rashid Khan & Aslam',
    payment_method: 'cash',
    notes: 'Rs 1200 each daily per-diem',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'exp-10000000-0000-0000-0000-000000000003',
    expense_code: 'EXP-003',
    category: 'loading',
    category_name_urdu: 'لوڈنگ و ان لوڈنگ (Loading / Unloading)',
    description: 'Bags offloading and weighbridge loading labor at collection center',
    amount: 1800.0,
    expense_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    person_name: 'Local Labor Group',
    payment_method: 'cash',
    notes: 'Rs 5 per bag labor charges',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'exp-10000000-0000-0000-0000-000000000004',
    expense_code: 'EXP-004',
    category: 'maintenance',
    category_name_urdu: 'گاڑی / وزن کانٹا مرمت (Maintenance)',
    description: 'Electronic digital platform scale battery replacement & calibration',
    amount: 2200.0,
    expense_date: new Date().toISOString().split('T')[0],
    person_name: 'Star Weighbridge Workshop',
    payment_method: 'cash',
    notes: 'Scale tested with 50kg standard weight',
    created_at: new Date().toISOString(),
  },
];

let mockChickenShopRecords: ChickenShopRecord[] = [
  {
    id: 'cs-rec-10000000-0000-0000-0000-000000000001',
    voucher_no: 'CS-001',
    customer_name: 'الحرمین چکن شاپ',
    phone: '0301-7654321',
    dokan_khata: 'کھاتہ نمبر 14',
    customer_khata: 'حاجی ارشد صاحب',
    record_date: new Date().toISOString().split('T')[0],
    boles_weight: 45.0,
    boles_rate: 620.0,
    boles_total: 27900.0,
    thai_weight: 30.0,
    thai_rate: 480.0,
    thai_total: 14400.0,
    gosht_weight: 120.0,
    gosht_rate: 380.0,
    gosht_total: 45600.0,
    total_weight: 195.0,
    subtotal_amount: 87900.0,
    bakaya_raqam: 12000.0,
    total_raqam: 99900.0,
    received_amount: 80000.0,
    remaining_balance: 19900.0,
    payment_status: 'partial',
    notes: '80,000 نقد وصول، بقایا اگلے چالان میں شامل ہوگا',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cs-rec-10000000-0000-0000-0000-000000000002',
    voucher_no: 'CS-002',
    customer_name: 'مدینہ پولٹری و چکن پوائنٹ',
    phone: '0300-8899112',
    dokan_khata: 'کھاتہ نمبر 08',
    customer_khata: 'محمد عثمان',
    record_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    boles_weight: 25.0,
    boles_rate: 620.0,
    boles_total: 15500.0,
    thai_weight: 18.0,
    thai_rate: 480.0,
    thai_total: 8640.0,
    gosht_weight: 85.0,
    gosht_rate: 380.0,
    gosht_total: 32300.0,
    total_weight: 128.0,
    subtotal_amount: 56440.0,
    bakaya_raqam: 0.0,
    total_raqam: 56440.0,
    received_amount: 56440.0,
    remaining_balance: 0.0,
    payment_status: 'paid',
    notes: 'مکمل ادائیگی بذریعہ جیز کیش',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];


// -----------------------------------------------------------------------------
// Chicken Shop Financial & Khata Serialization Helpers
// -----------------------------------------------------------------------------
function hydrateCustomerKhata(c: any): Customer {
  if (!c) return c;
  const khata = c.category_rates?.chicken_shop_khata || c.category_rates || {};
  return {
    ...c,
    dokan_khata: c.dokan_khata ?? khata.dokan_khata ?? null,
    customer_khata: c.customer_khata ?? khata.customer_khata ?? null,
    boles_weight: c.boles_weight ?? khata.boles_weight ?? null,
    boles_rate: c.boles_rate ?? khata.boles_rate ?? null,
    boles_total: c.boles_total ?? khata.boles_total ?? (khata.boles_weight && khata.boles_rate ? Number((khata.boles_weight * khata.boles_rate).toFixed(2)) : null),
    thai_weight: c.thai_weight ?? khata.thai_weight ?? null,
    thai_rate: c.thai_rate ?? khata.thai_rate ?? null,
    thai_total: c.thai_total ?? khata.thai_total ?? (khata.thai_weight && khata.thai_rate ? Number((khata.thai_weight * khata.thai_rate).toFixed(2)) : null),
    gosht_weight: c.gosht_weight ?? khata.gosht_weight ?? null,
    gosht_rate: c.gosht_rate ?? khata.gosht_rate ?? null,
    gosht_total: c.gosht_total ?? khata.gosht_total ?? (khata.gosht_weight && khata.gosht_rate ? Number((khata.gosht_weight * khata.gosht_rate).toFixed(2)) : null),
    bakaya_raqam: c.bakaya_raqam ?? khata.bakaya_raqam ?? null,
    total_raqam: c.total_raqam ?? khata.total_raqam ?? null,
    advance_amount: c.advance_amount ?? khata.advance_amount ?? null,
    advance_date: c.advance_date ?? khata.advance_date ?? null,
    advance_notes: c.advance_notes ?? khata.advance_notes ?? null,
    advance_payment_method: c.advance_payment_method ?? khata.advance_payment_method ?? null,
    daily_record_status: c.daily_record_status ?? c.category_rates?.daily_record_status ?? null,
  };
}

function serializeCustomerKhata(c: any): any {
  if (!c) return c;
  const bolesWeight = c.boles_weight != null ? parseFloat(c.boles_weight) : null;
  const bolesRate = c.boles_rate != null ? parseFloat(c.boles_rate) : null;
  const bolesTotal = bolesWeight && bolesRate ? Number((bolesWeight * bolesRate).toFixed(2)) : (c.boles_total != null ? parseFloat(c.boles_total) : null);

  const thaiWeight = c.thai_weight != null ? parseFloat(c.thai_weight) : null;
  const thaiRate = c.thai_rate != null ? parseFloat(c.thai_rate) : null;
  const thaiTotal = thaiWeight && thaiRate ? Number((thaiWeight * thaiRate).toFixed(2)) : (c.thai_total != null ? parseFloat(c.thai_total) : null);

  const goshtWeight = c.gosht_weight != null ? parseFloat(c.gosht_weight) : null;
  const goshtRate = c.gosht_rate != null ? parseFloat(c.gosht_rate) : null;
  const goshtTotal = goshtWeight && goshtRate ? Number((goshtWeight * goshtRate).toFixed(2)) : (c.gosht_total != null ? parseFloat(c.gosht_total) : null);

  const bakayaRaqam = c.bakaya_raqam != null ? parseFloat(c.bakaya_raqam) : 0;
  const calculatedTotal = (bolesTotal || 0) + (thaiTotal || 0) + (goshtTotal || 0) + (bakayaRaqam || 0);
  const totalRaqam = c.total_raqam != null ? parseFloat(c.total_raqam) : calculatedTotal;

  const advanceAmount = c.advance_amount != null ? parseFloat(c.advance_amount) : null;
  const advanceDate = c.advance_date || null;
  const advanceNotes = c.advance_notes || null;
  const advancePaymentMethod = c.advance_payment_method || null;

  const khata = {
    dokan_khata: c.dokan_khata || null,
    customer_khata: c.customer_khata || null,
    boles_weight: bolesWeight,
    boles_rate: bolesRate,
    boles_total: bolesTotal,
    thai_weight: thaiWeight,
    thai_rate: thaiRate,
    thai_total: thaiTotal,
    gosht_weight: goshtWeight,
    gosht_rate: goshtRate,
    gosht_total: goshtTotal,
    bakaya_raqam: bakayaRaqam,
    total_raqam: totalRaqam,
    advance_amount: advanceAmount,
    advance_date: advanceDate,
    advance_notes: advanceNotes,
    advance_payment_method: advancePaymentMethod,
  };

  const existingCategoryRates = c.category_rates || {};
  return {
    ...c,
    ...khata,
    category_rates: {
      ...existingCategoryRates,
      chicken_shop_khata: khata,
      customer_advance: {
        advance_amount: advanceAmount,
        advance_date: advanceDate,
        advance_notes: advanceNotes,
        advance_payment_method: advancePaymentMethod,
      },
      ...khata,
    },
  };
}

function extractSafeCustomerPayload(p: any): any {
  if (!p) return p;

  const allowedCols = [
    'customer_code',
    'name',
    'contact_person',
    'phone',
    'alternate_phone',
    'address',
    'area',
    'rate_per_kg',
    'rate_charbi',
    'rate_kachara',
    'collection_start_time',
    'collection_end_time',
    'dokan_khata',
    'customer_khata',
    'boles_weight',
    'boles_rate',
    'boles_total',
    'thai_weight',
    'thai_rate',
    'thai_total',
    'gosht_weight',
    'gosht_rate',
    'gosht_total',
    'bakaya_raqam',
    'total_raqam',
    'category_rates',
    'status',
    'notes',
    'is_deleted',
    'created_by',
    'updated_at',
  ];

  const safe: Record<string, any> = {};
  for (const col of allowedCols) {
    if (p[col] !== undefined) {
      safe[col] = p[col];
    }
  }

  // Ensure mandatory defaults for required columns
  if (!safe.area) safe.area = 'General';
  if (!safe.status) safe.status = 'active';

  // Advance details MUST be inside category_rates JSONB column
  const categoryRates: Record<string, any> = { ...(p.category_rates || {}) };
  if (p.advance_amount != null) {
    categoryRates.advance_amount = Number(p.advance_amount);
  }
  if (p.advance_date) {
    categoryRates.advance_date = p.advance_date;
  }
  if (p.advance_notes) {
    categoryRates.advance_notes = p.advance_notes;
  }
  if (p.advance_payment_method) {
    categoryRates.advance_payment_method = p.advance_payment_method;
  }

  if (p.customer_advance) {
    categoryRates.customer_advance = {
      ...(categoryRates.customer_advance || {}),
      ...p.customer_advance,
    };
  } else if (p.advance_amount != null) {
    categoryRates.customer_advance = {
      advance_amount: Number(p.advance_amount),
      advance_date: p.advance_date || new Date().toISOString().split('T')[0],
      advance_payment_method: p.advance_payment_method || 'cash',
      advance_notes: p.advance_notes || null,
    };
  }
  safe.category_rates = categoryRates;

  return safe;
}

// -----------------------------------------------------------------------------
// API Service Methods
// -----------------------------------------------------------------------------

export const api = {
  // Business Settings
  async getSettings(): Promise<BusinessSettings> {
    const cachedReceiptTitle = localStorage.getItem('spp_receipt_title');
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('business_settings').select('*').limit(1).maybeSingle();
        if (!error && data) {
          const merged: BusinessSettings = {
            ...data,
            receipt_title: cachedReceiptTitle || data.receipt_title || '🐔 SHAN POULTRY PROTEIN - رسید 🐔',
          };
          mockSettings = merged;
          return merged;
        }
      } catch (err) {
        console.warn('[API] Could not fetch settings from Supabase, using mock state:', err);
      }
    }
    return {
      ...mockSettings,
      receipt_title: cachedReceiptTitle || mockSettings.receipt_title || '🐔 SHAN POULTRY PROTEIN - رسید 🐔',
    };
  },

  async updateSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
    if (settings.receipt_title) {
      localStorage.setItem('spp_receipt_title', settings.receipt_title);
    }
    if (isSupabaseConfigured()) {
      try {
        const { data: existing } = await supabase.from('business_settings').select('id').limit(1).maybeSingle();
        const targetId = existing?.id || mockSettings.id;

        const payload: any = { ...settings, updated_at: new Date().toISOString() };
        let { data, error } = await supabase
          .from('business_settings')
          .update(payload)
          .eq('id', targetId)
          .select()
          .single();

        // If error 42703 (receipt_title column not yet in Supabase schema), retry without non-standard cols
        if (error && (error as any).code === '42703') {
          const { receipt_title, receipt_tagline, receipt_footer_phone, ...safePayload } = payload;
          const retry = await supabase
            .from('business_settings')
            .update(safePayload)
            .eq('id', targetId)
            .select()
            .single();
          if (!retry.error && retry.data) {
            data = { ...retry.data, ...settings };
            error = null;
          }
        }

        if (!error && data) {
          mockSettings = { ...data, ...settings };
          return mockSettings;
        }
      } catch (err) {
        console.warn('[API] Could not update settings in Supabase, updating mock state:', err);
      }
    }
    mockSettings = { ...mockSettings, ...settings, updated_at: new Date().toISOString() };
    return { ...mockSettings };
  },

  // Weight Categories
  async getWeightCategories(): Promise<WeightCategory[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('weight_categories')
          .select('*')
          .order('display_order', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Could not fetch weight categories from Supabase, using mock state:', err);
      }
    }
    return [...mockCategories];
  },

  async updateWeightCategory(category: WeightCategory): Promise<WeightCategory> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('weight_categories')
          .update({
            name: category.name,
            urdu_name: category.urdu_name,
            unit: category.unit,
            default_rate: category.default_rate,
            is_active: category.is_active,
            display_order: category.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', category.id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not update category in Supabase, updating mock state:', err);
      }
    }
    const idx = mockCategories.findIndex(c => c.id === category.id);
    if (idx !== -1) mockCategories[idx] = category;
    return category;
  },

  // Customers
  async getCustomers(includeDeleted = false): Promise<Customer[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('customers').select('*').order('name', { ascending: true });
        if (!includeDeleted) query = query.eq('is_deleted', false);
        const { data, error } = await query;
        if (!error && data) return data.map(hydrateCustomerKhata);
      } catch (err) {
        console.warn('[API] Could not fetch customers from Supabase, using mock state:', err);
      }
    }
    return mockCustomers.filter(c => includeDeleted || !c.is_deleted).map(hydrateCustomerKhata);
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
        if (!error && data) return hydrateCustomerKhata(data);
      } catch (err) {
        console.warn('[API] Could not fetch customer by id from Supabase, using mock state:', err);
      }
    }
    const found = mockCustomers.find(c => c.id === id);
    return found ? hydrateCustomerKhata(found) : null;
  },

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Customer> {
    const payload = serializeCustomerKhata(customer);
    const safePayload = extractSafeCustomerPayload(payload);
    if (!safePayload.area) safePayload.area = 'General';
    if (!safePayload.customer_code) safePayload.customer_code = `CUST-${Date.now().toString().slice(-6)}`;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('customers').insert([safePayload]).select().single();
        if (error) {
          console.error('[API] Error creating customer in Supabase:', error);
          throw new Error(error.message || 'Supabase customer insert failed');
        }
        if (data) {
          const hydrated = hydrateCustomerKhata({ ...data, ...customer });
          const existingIdx = mockCustomers.findIndex(c => c.id === hydrated.id);
          if (existingIdx !== -1) mockCustomers[existingIdx] = hydrated;
          else mockCustomers.unshift(hydrated);
          return hydrated;
        }
      } catch (err: any) {
        console.error('[API] Failed to create customer in Supabase:', err);
        throw err;
      }
    }
    const newCust: Customer = hydrateCustomerKhata({
      ...payload,
      id: `c-${Date.now()}`,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockCustomers.unshift(newCust);
    return newCust;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const payload = serializeCustomerKhata(updates);
    const safePayload = extractSafeCustomerPayload({ ...payload, updated_at: new Date().toISOString() });
    // Remove undefined values
    Object.keys(safePayload).forEach(k => safePayload[k] === undefined && delete safePayload[k]);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .update(safePayload)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('[API] Error updating customer in Supabase:', error);
          throw new Error(error.message || 'Supabase customer update failed');
        }
        if (data) {
          const hydrated = hydrateCustomerKhata({ ...data, ...updates });
          const idx = mockCustomers.findIndex(c => c.id === id);
          if (idx !== -1) mockCustomers[idx] = hydrated;
          return hydrated;
        }
      } catch (err: any) {
        console.error('[API] Failed to update customer in Supabase:', err);
        throw err;
      }
    }
    const idx = mockCustomers.findIndex(c => c.id === id);
    if (idx !== -1) {
      mockCustomers[idx] = hydrateCustomerKhata({
        ...mockCustomers[idx],
        ...payload,
        updated_at: new Date().toISOString(),
      });
      return mockCustomers[idx];
    }
    throw new Error('Customer not found');
  },

  async softDeleteCustomer(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customers').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);
        return;
      } catch (err) {
        console.warn('[API] Could not soft delete customer in Supabase, updating mock state:', err);
      }
    }
    const idx = mockCustomers.findIndex(c => c.id === id);
    if (idx !== -1) mockCustomers[idx].is_deleted = true;
  },

  async deleteCustomer(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) {
          await this.softDeleteCustomer(id);
        }
      } catch (err) {
        console.warn('[API] Could not delete customer from Supabase, attempting soft delete:', err);
        await this.softDeleteCustomer(id);
      }
    }
    mockCustomers = mockCustomers.filter(c => c.id !== id);
  },

  // ---------------------------------------------------------------------------
  // Customer Advances & Ledger Management
  // ---------------------------------------------------------------------------
  async getCustomerAdvances(customerId?: string): Promise<CustomerAdvanceRecord[]> {
    try {
      const recordsMap = new Map<string, CustomerAdvanceRecord>();

      // 1. Load from localStorage
      try {
        const stored: CustomerAdvanceRecord[] = JSON.parse(localStorage.getItem('spp_customer_advances') || '[]');
        stored.forEach(r => recordsMap.set(r.id, r));
      } catch (err) {
        console.warn('[API] Could not read customer advances from localStorage:', err);
      }

      // 2. Load from Supabase customers category_rates.advance_history
      try {
        const customers = await this.getCustomers(true);
        customers.forEach(c => {
          const hist: CustomerAdvanceRecord[] = (c.category_rates as any)?.advance_history || [];
          hist.forEach(r => recordsMap.set(r.id, r));

          // If customer has base advance_amount but no history records yet, synthesize the base advance
          const baseAdv = Number(c.advance_amount || 0);
          if (baseAdv > 0 && hist.length === 0) {
            const baseId = `base-adv-${c.id}`;
            recordsMap.set(baseId, {
              id: baseId,
              customer_id: c.id,
              customer_name: c.name,
              amount: baseAdv,
              date: c.advance_date || c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              payment_method: (c.advance_payment_method as any) || 'cash',
              notes: c.advance_notes || 'ابتدائی پیشگی ایڈوانس ادائیگی (Initial Advance Given)',
              created_at: c.created_at || new Date().toISOString(),
            });
          }
        });
      } catch (supErr) {
        console.warn('[API] Could not read advance history from Supabase customers:', supErr);
      }

      const allList = Array.from(recordsMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      if (customerId) {
        return allList.filter(r => r.customer_id === customerId);
      }
      return allList;
    } catch {
      return [];
    }
  },

  async recordCustomerAdvance(data: {
    customerId: string;
    customerName: string;
    amount: number;
    date: string;
    paymentMethod: 'cash' | 'online' | 'bank';
    notes?: string;
    skipCustomerUpdate?: boolean;
  }): Promise<CustomerAdvanceRecord> {
    const advRecord: CustomerAdvanceRecord = {
      id: `adv-${Date.now()}`,
      customer_id: data.customerId,
      customer_name: data.customerName,
      amount: data.amount,
      date: data.date,
      payment_method: data.paymentMethod,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    try {
      const stored: CustomerAdvanceRecord[] = JSON.parse(localStorage.getItem('spp_customer_advances') || '[]');
      stored.unshift(advRecord);
      localStorage.setItem('spp_customer_advances', JSON.stringify(stored));
    } catch (e) {
      console.warn('Could not save customer advance to localStorage:', e);
    }

    // Update customer advance amount & history in Supabase
    if (!data.skipCustomerUpdate) {
      const cust = await this.getCustomerById(data.customerId);
      if (cust) {
        const currentAdv = Number(cust.advance_amount || 0);
        const existingRates = cust.category_rates || {};
        const existingHistory: CustomerAdvanceRecord[] = (existingRates as any)?.advance_history || [];

        // If customer had an initial advance and history was empty, include base advance
        if (currentAdv > 0 && existingHistory.length === 0) {
          existingHistory.push({
            id: `base-adv-${cust.id}`,
            customer_id: cust.id,
            customer_name: cust.name,
            amount: currentAdv,
            date: cust.advance_date || cust.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            payment_method: (cust.advance_payment_method as any) || 'cash',
            notes: cust.advance_notes || 'ابتدائی پیشگی ایڈوانس ادائیگی (Initial Advance)',
            created_at: cust.created_at || new Date().toISOString(),
          });
        }

        const newTotalAdv = currentAdv + data.amount;
        const updatedHistory = [advRecord, ...existingHistory];

        await this.updateCustomer(cust.id, {
          advance_amount: newTotalAdv,
          advance_date: data.date,
          advance_notes: data.notes,
          advance_payment_method: data.paymentMethod,
          category_rates: {
            ...existingRates,
            advance_amount: newTotalAdv,
            advance_date: data.date,
            advance_notes: data.notes,
            advance_payment_method: data.paymentMethod,
            advance_history: updatedHistory,
          },
        });
      }
    }

    // Also record expense so Cash Book / Accounts accurately reflect advance paid to customer
    try {
      await this.createExpense({
        expense_code: `ADV-${Date.now().toString().slice(-5)}`,
        category: 'other',
        category_name_urdu: 'گاہک ایڈوانس',
        description: `Customer Advance Paid: ${data.customerName}`,
        amount: data.amount,
        expense_date: data.date,
        person_name: data.customerName,
        payment_method: data.paymentMethod,
        notes: data.notes || `Advance paid to customer ${data.customerName}`,
      });
    } catch (err) {
      console.warn('Could not record expense for customer advance:', err);
    }

    return advRecord;
  },

  async deleteCustomerAdvance(id: string): Promise<void> {
    try {
      const stored: CustomerAdvanceRecord[] = JSON.parse(localStorage.getItem('spp_customer_advances') || '[]');
      const target = stored.find(r => r.id === id);
      const filtered = stored.filter(r => r.id !== id);
      localStorage.setItem('spp_customer_advances', JSON.stringify(filtered));

      if (target) {
        const cust = await this.getCustomerById(target.customer_id);
        if (cust) {
          const currentAdv = Number(cust.advance_amount || 0);
          const existingRates = cust.category_rates || {};
          const existingHistory: CustomerAdvanceRecord[] = (existingRates as any)?.advance_history || [];
          const updatedHistory = existingHistory.filter(r => r.id !== id);
          const newAdv = Math.max(0, currentAdv - target.amount);

          await this.updateCustomer(cust.id, {
            advance_amount: newAdv,
            category_rates: {
              ...existingRates,
              advance_amount: newAdv,
              advance_history: updatedHistory,
            },
          });
        }
      }
    } catch (e) {
      console.warn('Could not delete customer advance:', e);
    }
  },

  // ---------------------------------------------------------------------------
  // Factories Management
  // ---------------------------------------------------------------------------
  async getFactories(includeDeleted = false): Promise<Factory[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('factories')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data) {
          return (data as Factory[]).filter(f => includeDeleted || !f.is_deleted);
        }
      } catch (err) {
        console.warn('[API] Could not fetch factories from Supabase, using mock state:', err);
      }
    }
    return mockFactories.filter(f => includeDeleted || !f.is_deleted);
  },

  async getFactoryById(id: string): Promise<Factory | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('factories').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not fetch factory by id from Supabase:', err);
      }
    }
    return mockFactories.find(f => f.id === id) || null;
  },

  async createFactory(factory: Omit<Factory, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Factory> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('factories').insert([factory]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not create factory in Supabase, saving to mock state:', err);
      }
    }
    const newFac: Factory = {
      ...factory,
      id: `fac-${Date.now()}`,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockFactories.push(newFac);
    return newFac;
  },

  async updateFactory(id: string, updates: Partial<Factory>): Promise<Factory> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('factories')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not update factory in Supabase:', err);
      }
    }
    const idx = mockFactories.findIndex(f => f.id === id);
    if (idx !== -1) {
      mockFactories[idx] = { ...mockFactories[idx], ...updates, updated_at: new Date().toISOString() };
      return mockFactories[idx];
    }
    throw new Error('Factory not found');
  },

  async deleteFactory(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('factories').delete().eq('id', id);
      } catch (err) {
        console.warn('[API] Could not delete factory from Supabase:', err);
      }
    }
    mockFactories = mockFactories.filter(f => f.id !== id);
  },

  // ---------------------------------------------------------------------------
  // Factory Transactions (Supplies & Payments)
  // ---------------------------------------------------------------------------
  async getFactoryTransactions(factoryId?: string): Promise<FactoryTransaction[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('factory_transactions').select('*, factory:factories(*)').order('transaction_date', { ascending: false });
        if (factoryId) query = query.eq('factory_id', factoryId);
        const { data, error } = await query;
        if (!error && data) return data as FactoryTransaction[];
      } catch (err) {
        console.warn('[API] Could not fetch factory transactions from Supabase:', err);
      }
    }
    return mockFactoryTransactions
      .filter(tx => !factoryId || tx.factory_id === factoryId)
      .map(tx => ({
        ...tx,
        factory: mockFactories.find(f => f.id === tx.factory_id),
      }))
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  },

  async createFactoryTransaction(data: Partial<FactoryTransaction>): Promise<FactoryTransaction> {
    const charbi_weight = Number(data.charbi_weight || 0);
    const charbi_rate = Number(data.charbi_rate || 0);
    const charbi_total = Number((charbi_weight * charbi_rate).toFixed(2));

    const kachara_weight = Number(data.kachara_weight || 0);
    const kachara_rate = Number(data.kachara_rate || 0);
    const kachara_total = Number((kachara_weight * kachara_rate).toFixed(2));

    const total_weight = Number((charbi_weight + kachara_weight).toFixed(2));
    const total_amount = Number((charbi_total + kachara_total).toFixed(2));
    const advance_amount = Number(data.advance_amount || 0);
    const received_amount = Number(data.received_amount || 0);
    const remaining_balance = Math.max(0, Number((total_amount - (advance_amount + received_amount)).toFixed(2)));

    let payment_status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if ((advance_amount + received_amount) >= total_amount && total_amount > 0) {
      payment_status = 'paid';
    } else if ((advance_amount + received_amount) > 0) {
      payment_status = 'partial';
    }

    const txInsertPayload = {
      invoice_no: data.invoice_no || `FAC-INV-${Date.now().toString().slice(-4)}`,
      factory_id: data.factory_id || '',
      transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
      charbi_weight,
      charbi_rate,
      charbi_total,
      kachara_weight,
      kachara_rate,
      kachara_total,
      total_weight,
      total_amount,
      advance_amount,
      received_amount,
      remaining_balance,
      payment_status,
      vehicle_no: data.vehicle_no || null,
      driver_name: data.driver_name || null,
      notes: data.notes || null,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data: dbData, error } = await supabase
          .from('factory_transactions')
          .insert([txInsertPayload])
          .select('*, factory:factories(*)')
          .single();
        if (!error && dbData) return dbData as FactoryTransaction;
        if (error) {
          console.error('[API] Could not insert factory transaction in Supabase:', error);
          throw new Error(error.message || 'Database error creating transaction');
        }
      } catch (err: any) {
        console.error('[API] Insert factory transaction error:', err);
        throw err;
      }
    }

    const payload: FactoryTransaction = {
      ...txInsertPayload,
      id: `tx-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    mockFactoryTransactions.unshift(payload);
    return payload;
  },

  async updateFactoryTransaction(id: string, updates: Partial<FactoryTransaction>): Promise<FactoryTransaction> {
    if (isSupabaseConfigured()) {
      try {
        const { factory, ...dbUpdates } = updates as any;
        const { data, error } = await supabase
          .from('factory_transactions')
          .update(dbUpdates)
          .eq('id', id)
          .select('*, factory:factories(*)')
          .single();
        if (!error && data) return data as FactoryTransaction;
        if (error) throw new Error(error.message);
      } catch (err: any) {
        console.error('[API] Could not update factory transaction in Supabase:', err);
        throw err;
      }
    }
    const idx = mockFactoryTransactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      mockFactoryTransactions[idx] = { ...mockFactoryTransactions[idx], ...updates };
      return mockFactoryTransactions[idx];
    }
    throw new Error('Transaction not found');
  },

  async deleteFactoryTransaction(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('factory_transactions').delete().eq('id', id);
      } catch (err) {
        console.warn('[API] Could not delete factory transaction from Supabase:', err);
      }
    }
    mockFactoryTransactions = mockFactoryTransactions.filter(t => t.id !== id);
  },

  // ---------------------------------------------------------------------------
  // Expense Tracking & Management
  // ---------------------------------------------------------------------------
  async getExpenses(startDate?: string, endDate?: string, category?: string): Promise<Expense[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
        if (startDate) query = query.gte('expense_date', startDate);
        if (endDate) query = query.lte('expense_date', endDate);
        if (category && category !== 'all') query = query.eq('category', category);
        const { data, error } = await query;
        if (!error && data) return data as Expense[];
      } catch (err) {
        console.warn('[API] Could not fetch expenses from Supabase:', err);
      }
    }

    return mockExpenses.filter(e => {
      const matchStart = !startDate || e.expense_date >= startDate;
      const matchEnd = !endDate || e.expense_date <= endDate;
      const matchCat = !category || category === 'all' || e.category === category;
      return matchStart && matchEnd && matchCat;
    }).sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  },

  async createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const expenseData = {
      expense_code: expense.expense_code || `EXP-${Date.now().toString().slice(-4)}`,
      category: expense.category,
      category_name_urdu: expense.category_name_urdu || null,
      description: expense.description,
      amount: Number(expense.amount || 0),
      expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
      person_name: expense.person_name || null,
      payment_method: expense.payment_method || 'cash',
      notes: expense.notes || null,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('expenses').insert([expenseData]).select().single();
        if (!error && data) return data as Expense;
        if (error) {
          console.error('[API] Could not create expense in Supabase:', error);
          throw new Error(error.message);
        }
      } catch (err: any) {
        console.error('[API] Supabase expense insert failed:', err);
        throw err;
      }
    }

    const payload: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    mockExpenses.unshift(payload);
    return payload;
  },

  async recordCustomerPayment(data: {
    customerId: string;
    customerName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'online' | 'bank';
    notes?: string;
    month?: string;
    year?: number;
  }): Promise<Expense> {
    const expenseCode = `PAY-${Date.now().toString().slice(-5)}`;
    const description = `Customer Payment: ${data.customerName} (${data.month || ''} ${data.year || ''})`.trim();
    const exp = await this.createExpense({
      expense_code: expenseCode,
      category: 'other',
      category_name_urdu: 'گاہک کو ادائیگی',
      description,
      amount: data.amount,
      expense_date: data.paymentDate,
      person_name: data.customerName,
      payment_method: data.paymentMethod,
      notes: data.notes || `Monthly Register Payment for ${data.customerName}`,
    });

    // Also store local payment receipt history
    try {
      const stored = JSON.parse(localStorage.getItem('spp_customer_payments') || '[]');
      stored.unshift({
        id: exp.id,
        customerId: data.customerId,
        customerName: data.customerName,
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        month: data.month,
        year: data.year,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('spp_customer_payments', JSON.stringify(stored));
    } catch (e) {
      console.warn('Could not cache customer payment to localStorage:', e);
    }

    return exp;
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not update expense in Supabase:', err);
      }
    }
    const idx = mockExpenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockExpenses[idx] = { ...mockExpenses[idx], ...updates };
      return mockExpenses[idx];
    }
    throw new Error('Expense not found');
  },

  async deleteExpense(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('expenses').delete().eq('id', id);
      } catch (err) {
        console.warn('[API] Could not delete expense from Supabase:', err);
      }
    }
    mockExpenses = mockExpenses.filter(e => e.id !== id);
  },

  // Workers Management
  async getWorkers(): Promise<Profile[]> {
    const deletedIds: string[] = JSON.parse(localStorage.getItem('spp_deleted_worker_ids') || '[]');

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'worker')
          .order('full_name', { ascending: true });
        if (!error && data) {
          const list = (data as Profile[]).filter(w => !deletedIds.includes(w.id));
          mockWorkers = [...list];
          return list;
        }
      } catch (err) {
        console.warn('[API] Could not fetch workers from Supabase, using mock state:', err);
      }
    }

    const customWorkers: Profile[] = JSON.parse(localStorage.getItem('spp_custom_workers') || '[]');
    let list = [...mockWorkers.filter(w => w.role === 'worker')];
    for (const cw of customWorkers) {
      const idx = list.findIndex(w => w.id === cw.id || (w.email && cw.email && w.email.toLowerCase() === cw.email.toLowerCase()));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...cw };
      } else {
        list.push(cw);
      }
    }
    return list.filter(w => !deletedIds.includes(w.id));
  },

  async getWorkersWithStats(): Promise<Profile[]> {
    const workers = await this.getWorkers();
    const { collections } = await this.getCollections({ limit: 2000 });

    return workers.map(w => {
      const workerSlips = collections.filter(c => c.worker_id === w.id);
      const totalKg = workerSlips.reduce((acc, c) => acc + c.total_net_weight, 0);
      return {
        ...w,
        total_collections: workerSlips.length,
        total_kg_collected: Number(totalKg.toFixed(2)),
      };
    });
  },

  async createWorker(params: {
    full_name: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<Profile> {
    // Generate standard RFC4122 v4 UUID
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    let workerId = generateUUID();

    // 1. Save to Supabase (creates in BOTH auth.users AND public.profiles via RPC)
    if (isSupabaseConfigured()) {
      let rpcSuccess = false;
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_create_worker', {
          worker_email: params.email.trim().toLowerCase(),
          worker_password: params.password,
          worker_name: params.full_name.trim(),
          worker_phone: params.phone.trim(),
        });

        if (!rpcErr && rpcData && (rpcData as any).user_id) {
          workerId = (rpcData as any).user_id;
          rpcSuccess = true;
          console.log('[API] Worker created in Supabase auth.users & profiles:', rpcData);
        } else {
          console.warn('[API] admin_create_worker RPC not available or failed:', rpcErr);
        }
      } catch (err) {
        console.warn('[API] Could not call admin_create_worker RPC:', err);
      }

      // Fallback: direct insert to public.profiles if RPC not installed yet
      if (!rpcSuccess) {
        try {
          const { error: insErr } = await supabase.from('profiles').upsert({
            id: workerId,
            full_name: params.full_name,
            phone: params.phone || null,
            email: params.email || null,
            password: params.password || null,
            role: 'worker',
            is_active: true,
            updated_at: new Date().toISOString(),
          });
          if (insErr) {
            console.warn('[API] Fallback direct profile upsert failed:', insErr);
          }
        } catch (err) {
          console.warn('[API] Failed direct profile upsert:', err);
        }
      }
    }

    const newWorker: Profile = {
      id: workerId,
      full_name: params.full_name,
      phone: params.phone,
      email: params.email,
      role: 'worker',
      is_active: true,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_collections: 0,
      total_kg_collected: 0,
    };

    // 2. Remove from deleted IDs if previously deleted
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('spp_deleted_worker_ids') || '[]');
      const filteredDeleted = deletedIds.filter(id => id !== workerId);
      localStorage.setItem('spp_deleted_worker_ids', JSON.stringify(filteredDeleted));
    } catch {}

    // 3. Save to persistent custom workers
    try {
      const customWorkers: Profile[] = JSON.parse(localStorage.getItem('spp_custom_workers') || '[]');
      const existIdx = customWorkers.findIndex(w => w.id === workerId || (w.email && w.email.toLowerCase() === params.email.toLowerCase()));
      if (existIdx !== -1) {
        customWorkers[existIdx] = newWorker;
      } else {
        customWorkers.unshift(newWorker);
      }
      localStorage.setItem('spp_custom_workers', JSON.stringify(customWorkers));
    } catch {}

    // 4. Save to auth store for mobile worker app
    try {
      const authList = JSON.parse(localStorage.getItem('spp_registered_workers_auth') || '[]');
      const existIdx = authList.findIndex((w: any) => w.id === workerId || (w.email && w.email.toLowerCase() === params.email.toLowerCase()));
      const authRecord = {
        id: newWorker.id,
        full_name: newWorker.full_name,
        phone: newWorker.phone,
        email: newWorker.email,
        password: params.password,
        is_active: true,
      };
      if (existIdx !== -1) {
        authList[existIdx] = authRecord;
      } else {
        authList.push(authRecord);
      }
      localStorage.setItem('spp_registered_workers_auth', JSON.stringify(authList));
    } catch {}

    // 5. Update in-memory mock workers
    const mIdx = mockWorkers.findIndex(w => w.id === workerId);
    if (mIdx !== -1) {
      mockWorkers[mIdx] = newWorker;
    } else {
      mockWorkers.push(newWorker);
    }

    return newWorker;
  },

  async updateWorker(id: string, updates: Partial<Profile>): Promise<Profile> {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: updates.full_name,
            phone: updates.phone,
            is_active: updates.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } catch (err) {
        console.warn('[API] Could not update worker in Supabase:', err);
      }
    }

    // Update in persistent custom workers
    try {
      const customWorkers: Profile[] = JSON.parse(localStorage.getItem('spp_custom_workers') || '[]');
      const cIdx = customWorkers.findIndex(w => w.id === id);
      if (cIdx !== -1) {
        customWorkers[cIdx] = { ...customWorkers[cIdx], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem('spp_custom_workers', JSON.stringify(customWorkers));
      }
    } catch {}

    // Update in auth store
    try {
      const authList = JSON.parse(localStorage.getItem('spp_registered_workers_auth') || '[]');
      const aIdx = authList.findIndex((w: any) => w.id === id);
      if (aIdx !== -1) {
        authList[aIdx] = { ...authList[aIdx], ...updates };
        localStorage.setItem('spp_registered_workers_auth', JSON.stringify(authList));
      }
    } catch {}

    const idx = mockWorkers.findIndex(w => w.id === id);
    if (idx !== -1) {
      mockWorkers[idx] = { ...mockWorkers[idx], ...updates, updated_at: new Date().toISOString() };
      return mockWorkers[idx];
    }
    return { id, full_name: updates.full_name || 'Worker', role: 'worker', is_active: true, created_at: '', updated_at: '' } as Profile;
  },

  async deleteWorker(id: string): Promise<void> {
    // 1. Mark as permanently deleted in local persistent storage so it NEVER returns on refresh
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('spp_deleted_worker_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('spp_deleted_worker_ids', JSON.stringify(deletedIds));
      }
    } catch {}

    // 2. Remove from custom workers
    try {
      const customWorkers: Profile[] = JSON.parse(localStorage.getItem('spp_custom_workers') || '[]');
      const filtered = customWorkers.filter(w => w.id !== id);
      localStorage.setItem('spp_custom_workers', JSON.stringify(filtered));
    } catch {}

    // 3. Remove from auth store
    try {
      const authList = JSON.parse(localStorage.getItem('spp_registered_workers_auth') || '[]');
      const filtered = authList.filter((w: any) => w.id !== id);
      localStorage.setItem('spp_registered_workers_auth', JSON.stringify(filtered));
    } catch {}

    // 4. Remove from mock state
    mockWorkers = mockWorkers.filter(w => w.id !== id);

    // 5. Delete in Supabase (removes from auth.users, auth.identities, profiles, and unlinks collections)
    if (isSupabaseConfigured()) {
      let rpcDeleted = false;
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_worker', {
          target_user_id: id,
        });
        if (!rpcErr && rpcData && (rpcData as any).success) {
          rpcDeleted = true;
          console.log('[API] Worker deleted via admin_delete_worker RPC:', id);
        } else {
          console.warn('[API] admin_delete_worker RPC not available, using direct delete:', rpcErr);
        }
      } catch (err) {
        console.warn('[API] Could not call admin_delete_worker RPC:', err);
      }

      if (!rpcDeleted) {
        try {
          const { error: delErr } = await supabase.from('profiles').delete().eq('id', id);
          if (delErr) {
            console.warn('[API] Direct delete failed, soft deleting profile:', delErr);
            await supabase.from('profiles').update({ is_active: false }).eq('id', id);
          }
        } catch (err) {
          console.warn('[API] Could not delete worker profile:', err);
        }
      }
    }
  },

  async setWorkerStatus(id: string, isActive: boolean): Promise<void> {
    if (isSupabaseConfigured()) {
      let rpcDone = false;
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_set_worker_status', {
          target_user_id: id,
          status_active: isActive,
        });
        if (!rpcErr && rpcData) {
          rpcDone = true;
          console.log('[API] Worker status updated via RPC:', id, isActive);
        }
      } catch (err) {
        console.warn('[API] Could not call admin_set_worker_status RPC:', err);
      }

      if (!rpcDone) {
        try {
          await supabase
            .from('profiles')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', id);
        } catch (err) {
          console.warn('[API] Could not update worker status in Supabase:', err);
        }
      }
    }

    try {
      const customWorkers: Profile[] = JSON.parse(localStorage.getItem('spp_custom_workers') || '[]');
      const cIdx = customWorkers.findIndex(w => w.id === id);
      if (cIdx !== -1) {
        customWorkers[cIdx].is_active = isActive;
        localStorage.setItem('spp_custom_workers', JSON.stringify(customWorkers));
      }
    } catch {}

    try {
      const authList = JSON.parse(localStorage.getItem('spp_registered_workers_auth') || '[]');
      const aIdx = authList.findIndex((w: any) => w.id === id);
      if (aIdx !== -1) {
        authList[aIdx].is_active = isActive;
        localStorage.setItem('spp_registered_workers_auth', JSON.stringify(authList));
      }
    } catch {}

    const idx = mockWorkers.findIndex(w => w.id === id);
    if (idx !== -1) {
      mockWorkers[idx].is_active = isActive;
    }
  },

  async resetWorkerPassword(id: string, newPassword: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      let rpcDone = false;
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_reset_worker_password', {
          target_user_id: id,
          new_password: newPassword,
        });
        if (!rpcErr && rpcData) {
          rpcDone = true;
          console.log('[API] Worker password reset via RPC:', id);
        }
      } catch (err) {
        console.warn('[API] Could not call admin_reset_worker_password RPC:', err);
      }

      if (!rpcDone) {
        try {
          await supabase
            .from('profiles')
            .update({ password: newPassword, updated_at: new Date().toISOString() })
            .eq('id', id);
        } catch (err) {
          console.warn('[API] Could not update password in Supabase profiles:', err);
        }
      }
    }

    try {
      const authList = JSON.parse(localStorage.getItem('spp_registered_workers_auth') || '[]');
      const aIdx = authList.findIndex((w: any) => w.id === id);
      if (aIdx !== -1) {
        authList[aIdx].password = newPassword;
        localStorage.setItem('spp_registered_workers_auth', JSON.stringify(authList));
      }
    } catch {}

    return true;
  },

  // Collections
  async getCollections(params?: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    workerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ collections: Collection[]; totalCount: number }> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('collections')
          .select(`
            *,
            customer:customers(*),
            worker:profiles(*),
            items:collection_weight_items(*, category:weight_categories(*)),
            attachments:collection_attachments(*)
          `, { count: 'exact' });

        if (params?.startDate) query = query.gte('collection_date', params.startDate);
        if (params?.endDate) query = query.lte('collection_date', params.endDate);
        if (params?.customerId) query = query.eq('customer_id', params.customerId);
        if (params?.workerId) query = query.eq('worker_id', params.workerId);
        if (params?.search) query = query.ilike('receipt_no', `%${params.search}%`);

        query = query.order('collection_timestamp', { ascending: false });

        if (params?.limit) {
          const offset = params.offset || 0;
          query = query.range(offset, offset + params.limit - 1);
        }

        const { data, count, error } = await query;
        if (!error && data !== null) {
          return { collections: data as Collection[], totalCount: count !== null ? count : data.length };
        }
      } catch (err) {
        console.warn('[API] Supabase getCollections failed or offline, falling back to mock state:', err);
      }
    }

    // In-memory filtered query
    let filtered = [...mockCollections];
    if (params?.startDate) filtered = filtered.filter(c => c.collection_date >= params.startDate!);
    if (params?.endDate) filtered = filtered.filter(c => c.collection_date <= params.endDate!);
    if (params?.customerId) filtered = filtered.filter(c => c.customer_id === params.customerId);
    if (params?.workerId) filtered = filtered.filter(c => c.worker_id === params.workerId);
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.receipt_no.toLowerCase().includes(s) ||
          c.customer?.name.toLowerCase().includes(s) ||
          c.customer?.customer_code.toLowerCase().includes(s) ||
          c.customer?.phone.includes(s)
      );
    }

    filtered.sort((a, b) => new Date(b.collection_timestamp).getTime() - new Date(a.collection_timestamp).getTime());

    const totalCount = filtered.length;
    if (params?.limit) {
      const offset = params.offset || 0;
      filtered = filtered.slice(offset, offset + params.limit);
    }

    return { collections: filtered, totalCount };
  },

  async getCollectionStats(params?: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    workerId?: string;
    search?: string;
  }): Promise<{
    totalSlips: number;
    totalNetWeight: number;
    totalAmount: number;
    avgWeightPerSlip: number;
    uniqueCustomersCount: number;
  }> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('collections').select('id, total_net_weight, total_amount, customer_id, receipt_no');
        if (params?.startDate) query = query.gte('collection_date', params.startDate);
        if (params?.endDate) query = query.lte('collection_date', params.endDate);
        if (params?.customerId) query = query.eq('customer_id', params.customerId);
        if (params?.workerId) query = query.eq('worker_id', params.workerId);
        if (params?.search) query = query.ilike('receipt_no', `%${params.search}%`);

        const { data, error } = await query;
        if (!error && data) {
          const totalSlips = data.length;
          const totalNetWeight = data.reduce((s, r) => s + (Number(r.total_net_weight) || 0), 0);
          const totalAmount = data.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
          const uniqueCustomers = new Set(data.map(r => r.customer_id).filter(Boolean));
          return {
            totalSlips,
            totalNetWeight: Number(totalNetWeight.toFixed(2)),
            totalAmount: Math.round(totalAmount),
            avgWeightPerSlip: totalSlips > 0 ? Number((totalNetWeight / totalSlips).toFixed(2)) : 0,
            uniqueCustomersCount: uniqueCustomers.size,
          };
        }
      } catch (err) {
        console.warn('[API] Could not fetch collection stats from Supabase:', err);
      }
    }

    let filtered = [...mockCollections];
    if (params?.startDate) filtered = filtered.filter(c => c.collection_date >= params.startDate!);
    if (params?.endDate) filtered = filtered.filter(c => c.collection_date <= params.endDate!);
    if (params?.customerId) filtered = filtered.filter(c => c.customer_id === params.customerId);
    if (params?.workerId) filtered = filtered.filter(c => c.worker_id === params.workerId);
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.receipt_no.toLowerCase().includes(s) ||
          c.customer?.name.toLowerCase().includes(s) ||
          c.customer?.customer_code.toLowerCase().includes(s) ||
          c.customer?.phone.includes(s)
      );
    }
    const totalSlips = filtered.length;
    const totalNetWeight = filtered.reduce((s, r) => s + (Number(r.total_net_weight) || 0), 0);
    const totalAmount = filtered.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    const uniqueCustomers = new Set(filtered.map(r => r.customer_id).filter(Boolean));
    return {
      totalSlips,
      totalNetWeight: Number(totalNetWeight.toFixed(2)),
      totalAmount: Math.round(totalAmount),
      avgWeightPerSlip: totalSlips > 0 ? Number((totalNetWeight / totalSlips).toFixed(2)) : 0,
      uniqueCustomersCount: uniqueCustomers.size,
    };
  },

  async createCollection(collection: Partial<Collection>, items: Partial<any>[]): Promise<Collection> {
    if (isSupabaseConfigured()) {
      try {
        const payload: Record<string, any> = {
          customer_id: collection.customer_id,
          collection_date: collection.collection_date || new Date().toISOString().split('T')[0],
          collection_time: collection.collection_time || new Date().toTimeString().split(' ')[0],
          gross_weight: collection.gross_weight || 0,
          tare_weight: collection.tare_weight || 0,
          total_net_weight: collection.total_net_weight || 0,
          rate_per_kg: collection.rate_per_kg || 0,
          total_amount: collection.total_amount || 0,
          notes: collection.notes || null,
          signature_url: collection.signature_url || null,
          signee_name: collection.signee_name || null,
          client_uuid: collection.client_uuid || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          })),
          status: collection.status || 'submitted',
        };

        // Only include worker_id if it's a valid UUID
        if (collection.worker_id && collection.worker_id.length > 20) {
          payload.worker_id = collection.worker_id;
        }

        const { data: colData, error: colErr } = await supabase
          .from('collections')
          .insert([payload])
          .select()
          .single();

        if (colErr) {
          console.error('[API] Error inserting collection into Supabase:', colErr);
          throw new Error(colErr.message || 'Database rejected the collection slip');
        }

        if (colData) {
          if (items.length > 0) {
            const weightItems = items
              .filter(it => it.category_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.category_id))
              .map(it => ({
                collection_id: colData.id,
                category_id: it.category_id,
                weight: it.weight,
                rate: it.rate,
                amount: it.amount,
              }));
            if (weightItems.length > 0) {
              const { error: itemErr } = await supabase.from('collection_weight_items').insert(weightItems);
              if (itemErr) {
                console.warn('[API] Warning inserting collection items:', itemErr);
              }
            }
          }

          if (collection.attachments && collection.attachments.length > 0) {
            const attItems = collection.attachments.map(att => ({
              collection_id: colData.id,
              storage_bucket: att.storage_bucket || 'collection-attachments',
              file_path: att.file_path,
              file_name: att.file_name || `photo_${colData.receipt_no || Date.now()}.jpg`,
              file_type: att.file_type || 'image/jpeg',
              uploaded_by: colData.worker_id || null,
            }));
            await supabase.from('collection_attachments').insert(attItems);
          }

          // Fetch full joined collection record with customer, worker, and items
          const { data: fullRecord, error: fullErr } = await supabase
            .from('collections')
            .select(`
              *,
              customer:customers(*),
              worker:profiles(*),
              items:collection_weight_items(*, category:weight_categories(*)),
              attachments:collection_attachments(*)
            `)
            .eq('id', colData.id)
            .single();

          const result: Collection = (!fullErr && fullRecord) ? (fullRecord as Collection) : (colData as Collection);

          // Persist daily record completion status in customer record
          if (colData.customer_id) {
            try {
              const { data: custRow } = await supabase.from('customers').select('category_rates').eq('id', colData.customer_id).single();
              const existingRates = custRow?.category_rates || {};
              await supabase.from('customers').update({
                category_rates: {
                  ...existingRates,
                  daily_record_status: {
                    last_completed_at: colData.created_at || new Date().toISOString(),
                    last_collection_date: colData.collection_date || new Date().toISOString().split('T')[0],
                    receipt_no: colData.receipt_no,
                    status: 'completed',
                    updated_at: new Date().toISOString(),
                  },
                },
              }).eq('id', colData.customer_id);
            } catch (custDailyErr) {
              console.warn('[API] Warning persisting daily status to customer record:', custDailyErr);
            }
          }

          // Update local cache as well
          mockCollections = [result, ...mockCollections.filter(c => c.id !== result.id)];
          return result;
        }
      } catch (err: any) {
        console.error('[API] Failed to save collection to Supabase:', err);
        throw err;
      }
    }

    // In-memory mock insertion (fallback if Supabase is unconfigured)
    const cust = mockCustomers.find(c => c.id === collection.customer_id);
    const worker = mockWorkers.find(w => w.id === collection.worker_id) || mockWorkers[0];
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      receipt_no: `SPP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(mockCollections.length + 1001).padStart(5, '0')}`,
      client_uuid: collection.client_uuid || `client-${Date.now()}`,
      customer_id: collection.customer_id!,
      worker_id: worker.id,
      collection_date: collection.collection_date || new Date().toISOString().split('T')[0],
      collection_time: collection.collection_time || new Date().toTimeString().split(' ')[0],
      collection_timestamp: collection.collection_timestamp || new Date().toISOString(),
      gross_weight: collection.gross_weight || 0,
      tare_weight: collection.tare_weight || 0,
      total_net_weight: collection.total_net_weight || 0,
      rate_per_kg: collection.rate_per_kg || 0,
      total_amount: collection.total_amount || 0,
      notes: collection.notes || null,
      signature_url: collection.signature_url || null,
      signature_timestamp: collection.signature_timestamp || null,
      signee_name: collection.signee_name || null,
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer: cust,
      worker: worker,
      items: items as any,
    };

    mockCollections.unshift(newCol);
    return newCol;
  },

  async updateCollection(id: string, updates: Partial<Collection>, items?: any[]): Promise<Collection> {
    if (isSupabaseConfigured()) {
      try {
        const payload: Record<string, any> = {
          customer_id: updates.customer_id,
          collection_date: updates.collection_date,
          collection_time: updates.collection_time,
          gross_weight: updates.gross_weight,
          tare_weight: updates.tare_weight,
          total_net_weight: updates.total_net_weight,
          rate_per_kg: updates.rate_per_kg,
          total_amount: updates.total_amount,
          notes: updates.notes,
          status: updates.status || 'submitted',
          updated_at: new Date().toISOString(),
        };

        if (updates.charbi_gross !== undefined) payload.charbi_gross = updates.charbi_gross;
        if (updates.charbi_tare !== undefined) payload.charbi_tare = updates.charbi_tare;
        if (updates.charbi_net !== undefined) payload.charbi_net = updates.charbi_net;
        if (updates.charbi_rate !== undefined) payload.charbi_rate = updates.charbi_rate;
        if (updates.charbi_total !== undefined) payload.charbi_total = updates.charbi_total;

        if (updates.kachara_gross !== undefined) payload.kachara_gross = updates.kachara_gross;
        if (updates.kachara_tare !== undefined) payload.kachara_tare = updates.kachara_tare;
        if (updates.kachara_net !== undefined) payload.kachara_net = updates.kachara_net;
        if (updates.kachara_rate !== undefined) payload.kachara_rate = updates.kachara_rate;
        if (updates.kachara_total !== undefined) payload.kachara_total = updates.kachara_total;

        const { data, error } = await supabase
          .from('collections')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          if (items && items.length > 0) {
            await supabase.from('collection_weight_items').delete().eq('collection_id', id);
            const weightItems = items
              .filter(it => it.category_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.category_id))
              .map(it => ({
                collection_id: id,
                category_id: it.category_id,
                weight: it.weight,
                rate: it.rate,
                amount: it.amount,
              }));
            if (weightItems.length > 0) {
              await supabase.from('collection_weight_items').insert(weightItems);
            }
          }

          const { data: fullRecord } = await supabase
            .from('collections')
            .select(`
              *,
              customer:customers(*),
              worker:profiles(*),
              items:collection_weight_items(*, category:weight_categories(*)),
              attachments:collection_attachments(*)
            `)
            .eq('id', id)
            .single();

          if (fullRecord) {
            mockCollections = mockCollections.map(c => c.id === id ? (fullRecord as Collection) : c);
            return fullRecord as Collection;
          }
        }
      } catch (err) {
        console.warn('[API] Could not update collection in Supabase:', err);
      }
    }

    const idx = mockCollections.findIndex(c => c.id === id);
    if (idx !== -1) {
      mockCollections[idx] = {
        ...mockCollections[idx],
        ...updates,
        items: items || mockCollections[idx].items,
        updated_at: new Date().toISOString(),
      };
      return mockCollections[idx];
    }
    throw new Error('Collection not found');
  },

  async deleteCollection(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('collections').delete().eq('id', id);
        if (!error) return;
      } catch (err) {
        console.warn('[API] Could not delete collection from Supabase, removing from mock state:', err);
      }
    }
    mockCollections = mockCollections.filter(c => c.id !== id);
  },

  // Monthly Register Calculation
  async getMonthlyRegisterData(year: number, monthIndex: number): Promise<{
    rows: MonthlyRegisterCustomerRow[];
    daysInMonth: number;
    dailyTotals: number[];
    grandTotalWeight: number;
    grandTotalAmount: number;
    totalCharbiWeight: number;
    totalKacharaWeight: number;
    totalCustomersAdvance: number;
    totalRemainingAdvance: number;
    activeSuppliersCount: number;
  }> {
    const daysInMonth = getDaysInMonth(year, monthIndex);
    const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { collections } = await this.getCollections({ startDate, endDate, limit: 2000 });
    const customers = await this.getCustomers();

    const rows: MonthlyRegisterCustomerRow[] = customers.map(cust => {
      const custCollections = collections.filter(c => c.customer_id === cust.id);
      const dailyWeights: Record<number, number | null> = {};
      let totalWeight = 0;
      let totalAmount = 0;
      let collectionDaysCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const daySlips = custCollections.filter(c => c.collection_date === dayStr);

        if (daySlips.length > 0) {
          const daySum = daySlips.reduce((acc, c) => acc + c.total_net_weight, 0);
          const dayAmountSum = daySlips.reduce((acc, c) => acc + c.total_amount, 0);
          dailyWeights[day] = Number(daySum.toFixed(2));
          totalWeight += daySum;
          totalAmount += dayAmountSum;
          collectionDaysCount++;
        } else {
          dailyWeights[day] = null; // Represents 'X' (no collection)
        }
      }

      let totalCharbiWeight = 0;
      let totalKacharaWeight = 0;
      let totalCharbiAmount = 0;
      let totalKacharaAmount = 0;

      custCollections.forEach(c => {
        const cNet = Number(c.charbi_net || 0);
        const kNet = Number(c.kachara_net || (cNet === 0 ? c.total_net_weight : 0));
        totalCharbiWeight += cNet;
        totalKacharaWeight += kNet;
        totalCharbiAmount += Number(c.charbi_total || (cNet * (c.charbi_rate || cust.rate_charbi || 55)));
        totalKacharaAmount += Number(c.kachara_total || (kNet * (c.kachara_rate || cust.rate_kachara || 45)));
      });

      const charbiRate = cust.rate_charbi || 55;
      const kacharaRate = cust.rate_kachara || (cust.rate_per_kg || 45);

      return {
        customer: cust,
        dailyWeights,
        totalWeight: Number(totalWeight.toFixed(2)),
        collectionDaysCount,
        totalAmount: Number(totalAmount.toFixed(2)),
        totalCharbiWeight: Number(totalCharbiWeight.toFixed(2)),
        totalKacharaWeight: Number(totalKacharaWeight.toFixed(2)),
        charbiRate,
        kacharaRate,
        totalCharbiAmount: Number(totalCharbiAmount.toFixed(2)),
        totalKacharaAmount: Number(totalKacharaAmount.toFixed(2)),
      };
    });

    const dailyTotals: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const sum = rows.reduce((acc, r) => acc + (r.dailyWeights[day] || 0), 0);
      dailyTotals.push(Number(sum.toFixed(2)));
    }

    const grandTotalWeight = rows.reduce((acc, r) => acc + r.totalWeight, 0);
    const grandTotalAmount = rows.reduce((acc, r) => acc + r.totalAmount, 0);
    const totalCharbiWeight = rows.reduce((acc, r) => acc + (r.totalCharbiWeight || 0), 0);
    const totalKacharaWeight = rows.reduce((acc, r) => acc + (r.totalKacharaWeight || 0), 0);
    const activeSuppliersCount = rows.filter(r => r.totalWeight > 0).length;

    // Calculate accurate customer advance metrics
    let totalCustomersAdvance = 0;
    let totalRemainingAdvance = 0;
    try {
      const advRecords = await this.getCustomerAdvances();
      const { collections: allCollections } = await this.getCollections({ limit: 10000 });
      customers.forEach(cust => {
        const bal = calculateCustomerAdvanceBalance(cust, allCollections, advRecords);
        totalCustomersAdvance += bal.totalAdvance;
        totalRemainingAdvance += bal.remainingAdvance;
      });
    } catch (advErr) {
      console.warn('[API] Error calculating customer advances for register stats:', advErr);
      customers.forEach(cust => {
        const adv = Number(cust.advance_amount || 0);
        totalCustomersAdvance += adv;
        totalRemainingAdvance += adv;
      });
    }

    return {
      rows,
      daysInMonth,
      dailyTotals,
      grandTotalWeight: Number(grandTotalWeight.toFixed(2)),
      grandTotalAmount: Number(grandTotalAmount.toFixed(2)),
      totalCharbiWeight: Number(totalCharbiWeight.toFixed(2)),
      totalKacharaWeight: Number(totalKacharaWeight.toFixed(2)),
      totalCustomersAdvance: Math.round(totalCustomersAdvance),
      totalRemainingAdvance: Math.round(totalRemainingAdvance),
      activeSuppliersCount,
    };
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*, profile:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data && data.length > 0) return data as AuditLog[];
      } catch (err) {
        console.warn('[API] Could not fetch audit logs from Supabase, using mock state:', err);
      }
    }
    return [...mockAuditLogs];
  },

  // ---------------------------------------------------------------------------
  // Dedicated Chicken Shop Management & Khata Records
  // ---------------------------------------------------------------------------
  async getChickenShopRecords(): Promise<ChickenShopRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_records')
          .select('*')
          .order('record_date', { ascending: false });
        if (!error && data) {
          return data as ChickenShopRecord[];
        }
      } catch (err) {
        console.warn('[API] Could not fetch chicken_shop_records from Supabase, using local fallback:', err);
      }
    }
    try {
      const stored = localStorage.getItem('spp_chicken_shop_records');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [...mockChickenShopRecords];
  },

  async getChickenShopRecordById(id: string): Promise<ChickenShopRecord | null> {
    const records = await this.getChickenShopRecords();
    return records.find(r => r.id === id) || null;
  },

  async createChickenShopRecord(
    record: Omit<ChickenShopRecord, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ChickenShopRecord> {
    const id = `cs-rec-${Date.now()}`;
    const voucher_no = record.voucher_no || `CS-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const newRecord: ChickenShopRecord = {
      ...record,
      id,
      voucher_no,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_records')
          .insert([newRecord])
          .select()
          .single();
        if (!error && data) {
          return data as ChickenShopRecord;
        }
      } catch (err) {
        console.warn('[API] Could not insert chicken_shop_record to Supabase, saving locally:', err);
      }
    }

    try {
      const stored = localStorage.getItem('spp_chicken_shop_records');
      const list: ChickenShopRecord[] = stored ? JSON.parse(stored) : [...mockChickenShopRecords];
      list.unshift(newRecord);
      localStorage.setItem('spp_chicken_shop_records', JSON.stringify(list));
    } catch {}

    mockChickenShopRecords.unshift(newRecord);
    return newRecord;
  },

  async updateChickenShopRecord(
    id: string,
    updates: Partial<ChickenShopRecord>
  ): Promise<ChickenShopRecord> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_records')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          return data as ChickenShopRecord;
        }
      } catch (err) {
        console.warn('[API] Could not update chicken_shop_record in Supabase:', err);
      }
    }

    try {
      const stored = localStorage.getItem('spp_chicken_shop_records');
      const list: ChickenShopRecord[] = stored ? JSON.parse(stored) : [...mockChickenShopRecords];
      const idx = list.findIndex(r => r.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates, updated_at: now };
        localStorage.setItem('spp_chicken_shop_records', JSON.stringify(list));
        return list[idx];
      }
    } catch {}

    const mIdx = mockChickenShopRecords.findIndex(r => r.id === id);
    if (mIdx !== -1) {
      mockChickenShopRecords[mIdx] = { ...mockChickenShopRecords[mIdx], ...updates, updated_at: now };
      return mockChickenShopRecords[mIdx];
    }
    throw new Error('Chicken shop record not found');
  },

  async deleteChickenShopRecord(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('chicken_shop_records').delete().eq('id', id);
        if (!error) return;
      } catch (err) {
        console.warn('[API] Could not delete chicken_shop_record from Supabase:', err);
      }
    }

    try {
      const stored = localStorage.getItem('spp_chicken_shop_records');
      if (stored) {
        const list: ChickenShopRecord[] = JSON.parse(stored);
        const filtered = list.filter(r => r.id !== id);
        localStorage.setItem('spp_chicken_shop_records', JSON.stringify(filtered));
      }
    } catch {}

    mockChickenShopRecords = mockChickenShopRecords.filter(r => r.id !== id);
  },
};
