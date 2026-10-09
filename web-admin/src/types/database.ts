// =============================================================================
// SHAN POULTRY PROTEIN - TypeScript Type Definitions
// =============================================================================

export type UserRole = 'admin' | 'worker' | 'manager';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string | null;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  // Live GPS tracking
  current_latitude?: number | null;
  current_longitude?: number | null;
  location_accuracy?: number | null;
  last_location_updated_at?: string | null;
  is_online?: boolean;
  // Computed statistics for worker management
  total_collections?: number;
  total_kg_collected?: number;
}

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  contact_person: string | null;
  phone: string;
  alternate_phone: string | null;
  address: string | null;
  area: string;
  rate_per_kg: number;
  rate_charbi?: number; // Price per KG for Charbi (چربی وزن)
  rate_kachara?: number; // Price per KG for Kachara (کچرا وزن)
  collection_start_time?: string | null; // e.g. "10:00:00"
  collection_end_time?: string | null; // e.g. "12:00:00"
  category_rates: Record<string, any>;
  status: 'active' | 'inactive';
  notes: string | null;
  is_deleted: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Chicken Shop Financial & Inventory Account Fields
  dokan_khata?: string | null;          // دکان کھاتہ (Shop Account # / Description)
  customer_khata?: string | null;       // کسٹمر کھاتہ (Customer Ledger / Account Reference)
  boles_weight?: number | null;         // بونلیس وزن (Boles Weight / Quantity in KG)
  boles_rate?: number | null;           // بونلیس ریٹ (Boles Rate per KG)
  boles_total?: number | null;          // بونلیس کل رقم (Boles Total PKR)
  thai_weight?: number | null;          // تھائی وزن (Thai Weight / Quantity in KG)
  thai_rate?: number | null;            // تھائی ریٹ (Thai Rate per KG)
  thai_total?: number | null;           // تھائی کل رقم (Thai Total PKR)
  gosht_weight?: number | null;         // گوشت وزن (Gosht Weight / Quantity in KG)
  gosht_rate?: number | null;           // گوشت ریٹ (Gosht Rate per KG)
  gosht_total?: number | null;          // گوشت کل رقم (Gosht Total PKR)
  bakaya_raqam?: number | null;         // بقایہ رقم (Previous Outstanding Balance)
  total_raqam?: number | null;          // کل رقم (Total Amount = Boles + Thai + Gosht + Bakaya)

  // Customer Advance Fields (گاہک کو دیا گیا ایڈوانس)
  advance_amount?: number | null;       // کل ایڈوانس رقم (Advance Paid to Customer in PKR)
  advance_date?: string | null;         // تاریخ ایڈوانس (Date Advance Paid)
  advance_notes?: string | null;        // ایڈوانس تفصیل (Advance Notes / Receipt #)
  advance_payment_method?: 'cash' | 'online' | 'bank' | null;

  // Daily Record Status Fields (روزانہ ریکارڈ تکمیل اسٹیٹس)
  daily_record_status?: {
    last_completed_at?: string | null;
    last_collection_date?: string | null;
    receipt_no?: string | null;
    status?: 'completed' | 'pending';
    updated_at?: string;
  } | null;
}

export interface CustomerAdvanceRecord {
  id: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  date: string;
  payment_method: 'cash' | 'online' | 'bank';
  notes?: string;
  receipt_no?: string;
  created_at: string;
}

export interface WorkerLocation {
  id: string;
  worker_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  is_online?: boolean;
  created_at: string;
  worker?: Profile;
}

export interface WeightCategory {
  id: string;
  code: string;
  name: string;
  urdu_name: string | null;
  unit: string;
  default_rate: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionWeightItem {
  id: string;
  collection_id: string;
  category_id: string;
  category_code?: string;
  gross_weight?: number;
  tare_weight?: number;
  weight: number;
  rate: number;
  amount: number;
  created_at: string;
  category?: WeightCategory;
}

export interface CollectionAttachment {
  id: string;
  collection_id: string;
  storage_bucket: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  public_url?: string;
}

export interface Collection {
  id: string;
  receipt_no: string;
  client_uuid: string;
  customer_id: string;
  worker_id: string | null;
  collection_date: string; // YYYY-MM-DD
  collection_time: string; // HH:MM:SS
  collection_timestamp: string;
  gross_weight: number;
  tare_weight: number;
  total_net_weight: number;
  rate_per_kg: number;
  total_amount: number;
  notes: string | null;
  signature_url: string | null;
  signature_timestamp: string | null;
  signee_name: string | null;
  status: 'draft' | 'submitted' | 'verified' | 'cancelled';
  created_at: string;
  updated_at: string;

  // Dedicated Charbi & Kachara Fields
  charbi_gross?: number;
  charbi_tare?: number;
  charbi_net?: number;
  charbi_rate?: number;
  charbi_total?: number;

  kachara_gross?: number;
  kachara_tare?: number;
  kachara_net?: number;
  kachara_rate?: number;
  kachara_total?: number;
  
  // Joined relation fields
  customer?: Customer;
  worker?: Profile;
  items?: CollectionWeightItem[];
  attachments?: CollectionAttachment[];
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  business_name_urdu?: string; // Configurable Urdu Name, e.g. 'شان پولٹری پروٹین'
  business_phone: string;
  business_email: string;
  business_address: string;
  logo_url: string | null;
  currency_code: string;
  currency_symbol: string;
  default_weight_unit: string;
  timezone: string;
  monthly_register_empty_symbol: string; // Default: 'X'
  enable_rates: boolean;
  allow_worker_edit_hours: number;
  common_collection_start_time?: string; // e.g. '08:00'
  common_collection_end_time?: string;   // e.g. '14:00'
  locked_sections?: string[];            // e.g. ['factories', 'expenses', 'reports']
  section_lock_pin?: string;             // e.g. '1234'
  receipt_title?: string;                // Default: '🐔 SHAN POULTRY PROTEIN - رسید 🐔'
  receipt_tagline?: string;              // e.g. 'Official B2B Weigh-in Collection & Factory Supply Receipt'
  receipt_footer_phone?: string;         // Dedicated Shan contact on receipt
  updated_at: string;
  updated_by: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
  profile?: Profile;
}

// Monthly Register Grid Matrix Item
export interface MonthlyRegisterCustomerRow {
  customer: Customer;
  dailyWeights: Record<number, number | null>; // dayOfMonth -> weight (null means no collection = 'X')
  totalWeight: number;
  collectionDaysCount: number;
  totalAmount: number;
  totalCharbiWeight?: number;
  totalKacharaWeight?: number;
  charbiRate?: number;
  kacharaRate?: number;
  totalCharbiAmount?: number;
  totalKacharaAmount?: number;
}

// -----------------------------------------------------------------------------
// Factory Management & Supply Ledger
// -----------------------------------------------------------------------------
export interface Factory {
  id: string;
  factory_code: string;
  name: string;
  contact_person: string | null;
  phone: string;
  whatsapp_no: string;
  address: string | null;
  area: string;
  rate_charbi: number;
  rate_kachara: number;
  status: 'active' | 'inactive';
  notes: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FactoryTransaction {
  id: string;
  invoice_no: string;
  factory_id: string;
  transaction_date: string; // YYYY-MM-DD
  charbi_weight: number;
  charbi_rate: number;
  charbi_total: number;
  kachara_weight: number;
  kachara_rate: number;
  kachara_total: number;
  total_weight: number;
  total_amount: number;
  advance_amount: number;
  received_amount: number;
  remaining_balance: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  vehicle_no: string | null;
  driver_name: string | null;
  notes: string | null;
  created_at: string;
  factory?: Factory;
}

// -----------------------------------------------------------------------------
// Expense Tracking & Management
// -----------------------------------------------------------------------------
export type ExpenseCategory =
  | 'worker'
  | 'transportation'
  | 'fuel'
  | 'loading'
  | 'maintenance'
  | 'food'
  | 'other';

export interface Expense {
  id: string;
  expense_code: string;
  category: ExpenseCategory;
  category_name_urdu?: string | null;
  description: string;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  person_name: string | null;
  payment_method: 'cash' | 'online' | 'bank';
  notes: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Dedicated Chicken Shop Management & Khata Records
// -----------------------------------------------------------------------------
export interface ChickenShopRecord {
  id: string;
  voucher_no?: string;
  customer_name: string;                // نام دکان دار / کسٹمر
  phone?: string | null;                // رابطہ نمبر
  dokan_khata?: string | null;          // دکان کھاتہ (Shop Account # / Reference)
  customer_khata?: string | null;       // کسٹمر کھاتہ (Customer Ledger Reference)
  record_date: string;                  // YYYY-MM-DD
  transaction_type?: 'sale' | 'payment_recovery'; // نوعیت: سیلز یا کھاتہ وصولی
  payment_mode?: 'cash' | 'credit' | 'partial';   // طریقہ ادائیگی: نقد یا ادھار یا جزوی
  
  // Boles (بونلس)
  boles_weight: number;                 // وزن KG
  boles_rate: number;                   // ریٹ PKR
  boles_total: number;                  // کل رقم PKR
  
  // Thai (تھائی)
  thai_weight: number;                  // وزن KG
  thai_rate: number;                    // ریٹ PKR
  thai_total: number;                   // کل رقم PKR
  
  // Gosht (گوشت)
  gosht_weight: number;                 // وزن KG
  gosht_rate: number;                   // ریٹ PKR
  gosht_total: number;                  // کل رقم PKR
  
  // Aggregated Totals & Khata Balances
  total_weight: number;                 // کل وزن (KG)
  subtotal_amount: number;              // آج کا بل (PKR)
  bakaya_raqam: number;                 // بقایا رقم (Previous Outstanding Balance)
  total_raqam: number;                  // کل رقم (Total = subtotal + bakaya_raqam)
  received_amount: number;              // وصول شدہ رقم (Cash / Received Amount)
  remaining_balance: number;            // باقی رقم (Remaining = total_raqam - received_amount)
  payment_status: 'paid' | 'partial' | 'unpaid';
  
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

