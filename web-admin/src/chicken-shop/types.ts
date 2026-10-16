// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Type Definitions
// Dedicated Isolated Types (Never mixed with Poultry Waste records)
// =============================================================================

export interface ChickenProduct {
  id: string;
  name: string;
  urdu_name: string;
  category: string;
  unit: string; // usually 'KG'
  rate_per_kg: number;
  stock_kg?: number;
  min_stock_alert?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChickenCustomer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  shop_name?: string | null;
  opening_balance: number;
  current_balance: number; // Positive = Customer owes money to shop (debit/udhaar); 0 = clear
  total_purchases: number;
  total_payments: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FreezerProduct {
  id: string;
  name: string;
  urdu_name: string;
  category?: string;
  unit?: string;
  rate_per_kg: number;
  stock_kg: number;
  cost_per_kg?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChickenCategory {
  id: string;
  name: string;
  urdu_name: string;
  default_rate_per_kg: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChickenShopWorker {
  id: string;
  name: string;
  phone: string;
  password?: string;
  pin?: string;
  role: 'worker' | 'manager';
  can_daily_sales: boolean;
  can_khata: boolean;
  can_wasooli: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChickenSaleItem {
  product_id?: string;
  product_name: string;
  urdu_name?: string;
  category_id?: string;
  category_name?: string;
  weight_kg: number;
  rate_per_kg: number;
  line_total: number;
  is_freezer?: boolean;
}

export interface ChickenSale {
  id: string;
  invoice_no: string;
  customer_id?: string | null; // null if walk-in
  customer_name: string;
  phone?: string | null;
  sale_date: string; // YYYY-MM-DD
  sale_time: string; // HH:mm:ss
  items: ChickenSaleItem[];
  total_weight_kg: number;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: 'cash' | 'credit' | 'partial';
  received_amount: number;
  remaining_due: number;
  previous_balance: number;
  new_balance: number;
  notes?: string | null;
  created_at: string;
}

export interface ChickenPayment {
  id: string;
  voucher_no: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank' | 'online' | 'cheque';
  previous_balance: number;
  new_balance: number;
  notes?: string | null;
  created_at: string;
}

export interface ChickenStockLog {
  id: string;
  product_id: string;
  product_name: string;
  type: 'opening' | 'purchase' | 'sale' | 'adjustment' | 'waste_loss';
  change_kg: number; // positive = added, negative = deducted
  balance_after_kg: number;
  reference_id?: string | null; // e.g. sale invoice # or supplier bill #
  notes?: string | null;
  date: string;
  created_at: string;
}

export interface ChickenShopLedgerEntry {
  id: string;
  date: string;
  time?: string;
  type: 'opening' | 'sale' | 'payment' | 'adjustment';
  title: string;
  description: string;
  weight_kg?: number | null;
  debit: number; // Amount customer owed (+)
  credit: number; // Amount customer paid (-)
  running_balance: number;
  reference_id?: string;
  rawSale?: ChickenSale;
  rawPayment?: ChickenPayment;
}

export interface SupplierPaymentItem {
  id: string;
  date: string;
  amount: number;
  payment_method: 'cash' | 'bank' | 'online' | 'cheque';
  notes?: string | null;
  created_at: string;
}

export interface FreshChickenArrival {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  weight_kg: number;
  rate_per_kg: number; // Purchase / Cost rate per kg
  total_cost: number;
  selling_rate_per_kg: number; // Current selling rate per kg
  category_id?: string | null;
  category_name?: string | null;
  supplier_name?: string | null;
  supplier_phone?: string | null;
  payment_status?: 'unpaid' | 'partial' | 'paid';
  paid_amount?: number;
  remaining_payable?: number;
  payment_method?: 'cash' | 'bank' | 'online' | 'cheque';
  payment_history?: SupplierPaymentItem[];
  birds_count?: number | null;
  vehicle_no?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ChickenExpense {
  id: string;
  date: string; // YYYY-MM-DD
  category: string; // e.g. electricity, rent, wages, ice_cutting, packaging, transport, other
  category_urdu?: string;
  title: string;
  amount: number;
  payment_method?: 'cash' | 'bank' | 'online';
  notes?: string | null;
  created_at: string;
}

// =============================================================================
// Mushtarka Khata (مشترکہ کھاتہ) Types
// Strictly isolated from commercial Khatadars for small 1-2 kg credit customers
// =============================================================================

export interface MushtarkaCustomer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  current_balance: number;
  total_purchases: number;
  total_payments: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MushtarkaTransaction {
  id: string;
  customer_id: string;
  customer_name: string;
  phone?: string | null;
  type: 'sale' | 'payment';
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm:ss
  category_name?: string;
  weight_kg?: number;
  rate_per_kg?: number;
  total_amount: number;
  received_amount?: number;
  payment_method?: 'cash' | 'online' | 'bank';
  previous_balance: number;
  new_balance: number;
  notes?: string | null;
  created_at: string;
}

