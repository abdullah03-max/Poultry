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
  stock_kg: number;
  min_stock_alert: number;
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

export interface ChickenSaleItem {
  product_id: string;
  product_name: string;
  urdu_name?: string;
  weight_kg: number;
  rate_per_kg: number;
  line_total: number;
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
}

export interface FreshChickenArrival {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  weight_kg: number;
  rate_per_kg: number; // Purchase / Cost rate per kg
  total_cost: number;
  selling_rate_per_kg: number; // Current selling rate per kg
  supplier_name?: string | null;
  birds_count?: number | null;
  vehicle_no?: string | null;
  notes?: string | null;
  created_at: string;
}
