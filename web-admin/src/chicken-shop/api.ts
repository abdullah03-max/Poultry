// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Dedicated API & Storage Service
// Completely Isolated from Poultry Waste Management
// =============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ChickenProduct,
  ChickenCustomer,
  ChickenSale,
  ChickenPayment,
  ChickenStockLog,
  ChickenShopLedgerEntry,
  FreshChickenArrival,
  ChickenExpense,
  FreezerProduct,
  SupplierPaymentItem,
  ChickenCategory,
  ChickenShopWorker,
} from './types';

export const FRESH_CHICKEN_PRODUCT_ID = 'prod-fresh-chicken';

export const DEFAULT_FRESH_CHICKEN_PRODUCT: ChickenProduct = {
  id: FRESH_CHICKEN_PRODUCT_ID,
  name: 'Fresh Chicken',
  urdu_name: 'تازہ مرغی (زندہ / ہول چکن)',
  category: 'Fresh Live Chicken',
  unit: 'KG',
  rate_per_kg: 450,
  stock_kg: 0,
  min_stock_alert: 25.0,
  is_active: true,
};

// Default core product (Only Fresh Live Chicken as initial base)
export const DEFAULT_CHICKEN_PRODUCTS: ChickenProduct[] = [
  DEFAULT_FRESH_CHICKEN_PRODUCT,
];

export const DEFAULT_CHICKEN_CATEGORIES: ChickenCategory[] = [
  { id: 'cat-legs', name: 'Chicken Legs', urdu_name: 'چکن لیگز', default_rate_per_kg: 450, sort_order: 1, is_active: true },
  { id: 'cat-chest', name: 'Chicken Chest', urdu_name: 'چکن چیسٹ', default_rate_per_kg: 550, sort_order: 2, is_active: true },
  { id: 'cat-wings', name: 'Chicken Wings', urdu_name: 'چکن ونگز', default_rate_per_kg: 400, sort_order: 3, is_active: true },
  { id: 'cat-tikka-boti', name: 'Tikka Boti', urdu_name: 'تکہ بوٹی', default_rate_per_kg: 600, sort_order: 4, is_active: true },
  { id: 'cat-gosht', name: 'Chicken Gosht (Meat)', urdu_name: 'چکن گوشت', default_rate_per_kg: 400, sort_order: 5, is_active: true },
  { id: 'cat-panjay', name: 'Chicken Panjay', urdu_name: 'چکن پنجے', default_rate_per_kg: 200, sort_order: 6, is_active: true },
  { id: 'cat-bongs', name: 'Chicken Bongs', urdu_name: 'چکن بونگز', default_rate_per_kg: 450, sort_order: 7, is_active: true },
  { id: 'cat-boneless', name: 'Boneless Chicken', urdu_name: 'بون لیس چکن', default_rate_per_kg: 650, sort_order: 8, is_active: true },
];

// Helper storage keys
const STORAGE_KEYS = {
  products: 'cs_portal_products',
  categories: 'cs_portal_categories',
  workers: 'cs_portal_workers',
  customers: 'cs_portal_customers',
  sales: 'cs_portal_sales',
  payments: 'cs_portal_payments',
  stockLogs: 'cs_portal_stock_logs',
  freshArrivals: 'cs_portal_fresh_arrivals',
  expenses: 'cs_portal_expenses',
  deletedSaleIds: 'cs_deleted_sale_ids',
  deletedArrivalIds: 'cs_deleted_arrival_ids',
};

const SUPPLIER_META_TAG = '__SUPPLIER_PAYMENT__';

function packArrivalNotes(entry: Partial<FreshChickenArrival>): string | null {
  const meta = {
    supplier_phone: entry.supplier_phone || null,
    payment_status: entry.payment_status || (entry.paid_amount && entry.total_cost && entry.paid_amount >= entry.total_cost ? 'paid' : (entry.paid_amount ? 'partial' : 'unpaid')),
    paid_amount: Number(entry.paid_amount || 0),
    remaining_payable: Number(entry.remaining_payable ?? Math.max(0, (entry.total_cost || 0) - (entry.paid_amount || 0))),
    payment_method: entry.payment_method || 'cash',
    payment_history: entry.payment_history || [],
  };
  const baseNote = (entry.notes || '').split(SUPPLIER_META_TAG)[0].trim();
  return `${baseNote}${baseNote ? ' ' : ''}${SUPPLIER_META_TAG}${JSON.stringify(meta)}`;
}

function unpackArrival(raw: any): FreshChickenArrival {
  let notes = raw.notes || null;
  let supplier_phone = raw.supplier_phone || null;
  let payment_status: 'unpaid' | 'partial' | 'paid' = raw.payment_status || 'unpaid';
  let paid_amount = Number(raw.paid_amount || 0);
  let remaining_payable = Number(raw.remaining_payable ?? Math.max(0, (raw.total_cost || 0) - paid_amount));
  let payment_method: 'cash' | 'bank' | 'online' | 'cheque' = raw.payment_method || 'cash';
  let payment_history: any[] = raw.payment_history || [];

  if (notes && typeof notes === 'string' && notes.includes(SUPPLIER_META_TAG)) {
    const parts = notes.split(SUPPLIER_META_TAG);
    notes = parts[0].trim() || null;
    try {
      const meta = JSON.parse(parts[1]);
      if (meta.supplier_phone !== undefined) supplier_phone = meta.supplier_phone;
      if (meta.payment_status) payment_status = meta.payment_status;
      if (meta.paid_amount !== undefined) paid_amount = Number(meta.paid_amount);
      if (meta.remaining_payable !== undefined) remaining_payable = Number(meta.remaining_payable);
      if (meta.payment_method) payment_method = meta.payment_method;
      if (Array.isArray(meta.payment_history)) payment_history = meta.payment_history;
    } catch {}
  }

  if (remaining_payable === undefined || isNaN(remaining_payable)) {
    remaining_payable = Math.max(0, (raw.total_cost || 0) - paid_amount);
  }

  return {
    ...raw,
    notes,
    supplier_phone,
    payment_status,
    paid_amount,
    remaining_payable,
    payment_method,
    payment_history,
  };
}

function sanitizeArrivalForSupabase(arrival: FreshChickenArrival): any {
  return {
    id: arrival.id,
    date: arrival.date,
    time: arrival.time,
    weight_kg: arrival.weight_kg,
    rate_per_kg: arrival.rate_per_kg,
    total_cost: arrival.total_cost,
    selling_rate_per_kg: arrival.selling_rate_per_kg,
    category_id: arrival.category_id || null,
    category_name: arrival.category_name || null,
    supplier_name: arrival.supplier_name || 'تازہ فارم آمد',
    birds_count: arrival.birds_count || null,
    vehicle_no: arrival.vehicle_no || null,
    notes: packArrivalNotes(arrival),
    created_at: arrival.created_at,
  };
}

export const chickenShopApi = {
  // ---------------------------------------------------------------------------
  // PRODUCTS
  // ---------------------------------------------------------------------------
  async getProducts(): Promise<ChickenProduct[]> {
    const ensureFreshChicken = (list: ChickenProduct[]): ChickenProduct[] => {
      if (!list.some(p => p.id === FRESH_CHICKEN_PRODUCT_ID)) {
        list.unshift(DEFAULT_FRESH_CHICKEN_PRODUCT);
      }
      return list;
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_products')
          .select('*')
          .order('name');
        if (!error && data) {
          if (!data.some(p => p.id === FRESH_CHICKEN_PRODUCT_ID)) {
            try {
              await supabase.from('chicken_shop_products').upsert(DEFAULT_FRESH_CHICKEN_PRODUCT);
            } catch {}
          }
          const merged = ensureFreshChicken(data as ChickenProduct[]);
          localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.warn('[CS API] Supabase products read fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.products);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = ensureFreshChicken(parsed);
        return merged;
      }
    } catch {}

    const onlyFresh = [DEFAULT_FRESH_CHICKEN_PRODUCT];
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(onlyFresh));
    return onlyFresh;
  },

  async saveProduct(product: Partial<ChickenProduct> & { name: string }): Promise<ChickenProduct> {
    const products = await this.getProducts();
    let saved: ChickenProduct;

    if (product.id) {
      const idx = products.findIndex(p => p.id === product.id);
      if (idx !== -1) {
        saved = {
          ...products[idx],
          ...product,
          updated_at: new Date().toISOString(),
        } as ChickenProduct;
        products[idx] = saved;
      } else {
        saved = {
          ...product,
          id: product.id,
          urdu_name: product.urdu_name || product.name,
          category: product.category || 'Chicken Cuts',
          unit: product.unit || 'KG',
          rate_per_kg: Number(product.rate_per_kg || 0),
          stock_kg: Number(product.stock_kg || 0),
          min_stock_alert: Number(product.min_stock_alert || 5),
          is_active: product.is_active !== false,
          updated_at: new Date().toISOString(),
        } as ChickenProduct;
        products.push(saved);
      }
    } else {
      saved = {
        id: `prod-${Date.now()}`,
        name: product.name,
        urdu_name: product.urdu_name || product.name,
        category: product.category || 'Chicken Cuts',
        unit: product.unit || 'KG',
        rate_per_kg: Number(product.rate_per_kg || 0),
        stock_kg: Number(product.stock_kg || 0),
        min_stock_alert: Number(product.min_stock_alert || 5),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      products.push(saved);
    }

    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_products').upsert([saved]);
      } catch (e) {
        console.warn('[CS API] Supabase product upsert fallback:', e);
      }
    }

    return saved;
  },

  async deleteProduct(id: string): Promise<void> {
    if (id === FRESH_CHICKEN_PRODUCT_ID) {
      throw new Error('تازہ مرغی (Fresh Chicken) بنیادی آئٹم ہے اور ڈیلیٹ نہیں ہو سکتی۔');
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('chicken_shop_products').delete().eq('id', id);
        if (error) console.error('[CS API] Supabase product delete error:', error);
      } catch (e) {
        console.warn('[CS API] Supabase product delete fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.products);
      if (stored) {
        const prods = (JSON.parse(stored) as ChickenProduct[]).filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(prods));
      }
    } catch {}
  },

  async updateProductStock(productId: string, changeKg: number, reason: 'sale' | 'purchase' | 'adjustment' | 'waste_loss', notes?: string, refId?: string): Promise<ChickenProduct | null> {
    const products = await this.getProducts();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return null;

    const currentStock = Number(products[idx].stock_kg || 0);
    const newStock = Number((currentStock + changeKg).toFixed(2));
    products[idx].stock_kg = Math.max(0, newStock);
    products[idx].updated_at = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_products').update({ stock_kg: products[idx].stock_kg }).eq('id', productId);
      } catch {}
    }

    // Record stock log
    await this.recordStockLog({
      product_id: productId,
      product_name: products[idx].name,
      type: reason,
      change_kg: changeKg,
      balance_after_kg: products[idx].stock_kg,
      reference_id: refId,
      notes: notes || undefined,
      date: new Date().toISOString().split('T')[0],
    });

    return products[idx];
  },

  // ---------------------------------------------------------------------------
  // CUSTOMERS & DIGITAL KHATA
  // ---------------------------------------------------------------------------
  async getCustomers(): Promise<ChickenCustomer[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_customers')
          .select('*')
          .order('name');
        if (!error && data) {
          localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(data));
          return data as ChickenCustomer[];
        }
      } catch (e) {
        console.warn('[CS API] Supabase customers read fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.customers);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}

    return [];
  },

  async getCustomerById(id: string): Promise<ChickenCustomer | null> {
    const customers = await this.getCustomers();
    return customers.find(c => c.id === id) || null;
  },

  async createCustomer(data: {
    name: string;
    phone: string;
    address?: string | null;
    shop_name?: string | null;
    opening_balance?: number;
    notes?: string | null;
  }): Promise<ChickenCustomer> {
    const customers = await this.getCustomers();
    const openingBal = Number(data.opening_balance || 0);

    const newCustomer: ChickenCustomer = {
      id: `cust-cs-${Date.now()}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address?.trim() || null,
      shop_name: data.shop_name?.trim() || null,
      opening_balance: openingBal,
      current_balance: openingBal,
      total_purchases: 0,
      total_payments: 0,
      notes: data.notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    customers.unshift(newCustomer);
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_customers').insert([newCustomer]);
      } catch (e) {
        console.warn('[CS API] Supabase customer insert fallback:', e);
      }
    }

    return newCustomer;
  },

  async updateCustomer(id: string, updates: Partial<ChickenCustomer>): Promise<ChickenCustomer> {
    const customers = await this.getCustomers();
    const idx = customers.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Customer not found');

    const updated: ChickenCustomer = {
      ...customers[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    customers[idx] = updated;
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_customers').update(updated).eq('id', id);
      } catch (e) {
        console.warn('[CS API] Supabase customer update fallback:', e);
      }
    }

    return updated;
  },

  async deleteCustomer(id: string): Promise<void> {
    let customers = await this.getCustomers();
    customers = customers.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_customers').delete().eq('id', id);
      } catch {}
    }
  },

  // ---------------------------------------------------------------------------
  // POS SALES
  // ---------------------------------------------------------------------------
  async getSales(): Promise<ChickenSale[]> {
    let deletedIds = new Set<string>();
    try {
      deletedIds = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.deletedSaleIds) || '[]'));
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_sales')
          .select('*')
          .order('sale_date', { ascending: false });
        if (!error && data) {
          const active = (data as ChickenSale[]).filter(s => !deletedIds.has(s.id));
          localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(active));
          return active;
        }
      } catch (e) {
        console.warn('[CS API] Supabase sales read fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.sales);
      if (stored) {
        const parsed: ChickenSale[] = JSON.parse(stored);
        return parsed.filter(s => !deletedIds.has(s.id));
      }
    } catch {}

    return [];
  },

  async createSale(saleData: {
    customer_id?: string | null;
    customer_name: string;
    phone?: string | null;
    items: {
      product_id: string;
      product_name: string;
      urdu_name?: string;
      weight_kg: number;
      rate_per_kg: number;
    }[];
    payment_method: 'cash' | 'credit' | 'partial';
    received_amount: number;
    discount?: number;
    notes?: string | null;
    sale_date?: string;
    sale_time?: string;
  }): Promise<ChickenSale> {
    const now = new Date();
    const dateStr = saleData.sale_date || now.toISOString().split('T')[0];
    const timeStr = saleData.sale_time || now.toTimeString().split(' ')[0];

    // Calculate line totals
    let totalWeight = 0;
    let subtotal = 0;
    const itemsWithTotals = saleData.items.map(item => {
      const weight = Number(item.weight_kg) || 0;
      const rate = Number(item.rate_per_kg) || 0;
      const lineTotal = Math.round(weight * rate);
      totalWeight += weight;
      subtotal += lineTotal;
      return {
        ...item,
        weight_kg: Number(weight.toFixed(2)),
        rate_per_kg: rate,
        line_total: lineTotal,
      };
    });

    const discount = Number(saleData.discount || 0);
    const totalAmount = Math.max(0, subtotal - discount);
    const received = Number(saleData.received_amount || 0);
    const remainingDue = Math.max(0, totalAmount - received);

    // Fetch customer's previous balance if registered
    let prevBal = 0;
    let newBal = 0;
    if (saleData.customer_id) {
      const cust = await this.getCustomerById(saleData.customer_id);
      if (cust) {
        prevBal = cust.current_balance;
        // Remaining due is added to customer's outstanding balance
        newBal = prevBal + remainingDue;

        await this.updateCustomer(cust.id, {
          current_balance: newBal,
          total_purchases: (cust.total_purchases || 0) + totalAmount,
          total_payments: (cust.total_payments || 0) + received,
        });
      }
    }

    const invoiceNo = `CS-${Date.now().toString().slice(-5)}`;
    const newSale: ChickenSale = {
      id: `sale-${Date.now()}`,
      invoice_no: invoiceNo,
      customer_id: saleData.customer_id || null,
      customer_name: saleData.customer_name.trim(),
      phone: saleData.phone || null,
      sale_date: dateStr,
      sale_time: timeStr,
      items: itemsWithTotals,
      total_weight_kg: Number(totalWeight.toFixed(2)),
      subtotal,
      discount,
      total_amount: totalAmount,
      payment_method: saleData.payment_method,
      received_amount: received,
      remaining_due: remainingDue,
      previous_balance: prevBal,
      new_balance: newBal,
      notes: saleData.notes || null,
      created_at: now.toISOString(),
    };

    const sales = await this.getSales();
    sales.unshift(newSale);
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(sales));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_sales').insert([newSale]);
      } catch (e) {
        console.warn('[CS API] Supabase sale insert fallback:', e);
      }
    }

    // Automatically deduct stock for sold items
    for (const item of itemsWithTotals) {
      if (item.weight_kg > 0 && item.product_id) {
        try {
          await this.updateProductStock(
            item.product_id,
            -item.weight_kg,
            'sale',
            `سیل انوائس #${invoiceNo}`,
            invoiceNo
          );
        } catch (e) {
          console.warn('[CS API] Stock deduction on sale failed:', e);
        }
      }
    }

    return newSale;
  },

  async deleteSale(id: string): Promise<void> {
    const sales = await this.getSales();
    const target = sales.find(s => s.id === id);
    if (!target) return;

    // 1. Delete from Supabase permanently first
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('chicken_shop_sales').delete().eq('id', id);
      if (error) {
        console.error('[CS API] Supabase sale delete error:', error);
        throw new Error(`ڈیٹا بیس سے سیل حذف نہ ہو سکی: ${error.message}`);
      }
    }

    // 2. Record in deleted sale IDs set to prevent resurrection from any cache
    try {
      const deletedIds = new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEYS.deletedSaleIds) || '[]'));
      deletedIds.add(id);
      localStorage.setItem(STORAGE_KEYS.deletedSaleIds, JSON.stringify(Array.from(deletedIds)));
    } catch {}

    // 3. Remove from localStorage cache
    const updatedSales = sales.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(updatedSales));

    // 4. Reverse stock deduction (Restore sold weight back to product inventory)
    for (const item of target.items || []) {
      if (item.product_id && item.weight_kg > 0) {
        try {
          await this.updateProductStock(
            item.product_id,
            item.weight_kg,
            'adjustment',
            `سیل #${target.invoice_no} منسوخ - مال واپس اسٹاک میں شامل`,
            target.invoice_no
          );
        } catch (e) {
          console.warn('[CS API] Stock reversal error on deleteSale:', e);
        }
      }
    }

    // 5. Rollback customer balance if applicable
    if (target.customer_id) {
      try {
        const cust = await this.getCustomerById(target.customer_id);
        if (cust) {
          const rollbackBal = Math.max(0, (cust.current_balance || 0) - (target.remaining_due || 0));
          const rollbackPurchases = Math.max(0, (cust.total_purchases || 0) - (target.total_amount || 0));
          const rollbackPayments = Math.max(0, (cust.total_payments || 0) - (target.received_amount || 0));
          await this.updateCustomer(cust.id, {
            current_balance: rollbackBal,
            total_purchases: rollbackPurchases,
            total_payments: rollbackPayments,
          });
        }
      } catch (e) {
        console.warn('[CS API] Customer balance rollback error on deleteSale:', e);
      }
    }
  },

  // ---------------------------------------------------------------------------
  // PAYMENTS & WASOOLI
  // ---------------------------------------------------------------------------
  async getPayments(customerId?: string): Promise<ChickenPayment[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('chicken_shop_payments').select('*').order('payment_date', { ascending: false });
        if (customerId) query = query.eq('customer_id', customerId);
        const { data, error } = await query;
        if (!error && data) {
          localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(data));
          return data as ChickenPayment[];
        }
      } catch (e) {
        console.warn('[CS API] Supabase payments read fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.payments);
      if (stored) {
        const list: ChickenPayment[] = JSON.parse(stored);
        return customerId ? list.filter(p => p.customer_id === customerId) : list;
      }
    } catch {}

    return [];
  },

  async recordPayment(data: {
    customer_id: string;
    amount: number;
    payment_date?: string;
    payment_method?: 'cash' | 'bank' | 'online' | 'cheque';
    notes?: string;
  }): Promise<ChickenPayment> {
    const cust = await this.getCustomerById(data.customer_id);
    if (!cust) throw new Error('Customer not found');

    const amount = Number(data.amount || 0);
    const prevBal = cust.current_balance;
    const newBal = Math.max(0, prevBal - amount);

    // Update customer's balance
    await this.updateCustomer(cust.id, {
      current_balance: newBal,
      total_payments: (cust.total_payments || 0) + amount,
    });

    const now = new Date();
    const newPayment: ChickenPayment = {
      id: `pay-${Date.now()}`,
      voucher_no: `WAS-${Date.now().toString().slice(-5)}`,
      customer_id: cust.id,
      customer_name: cust.name,
      amount,
      payment_date: data.payment_date || now.toISOString().split('T')[0],
      payment_method: data.payment_method || 'cash',
      previous_balance: prevBal,
      new_balance: newBal,
      notes: data.notes || null,
      created_at: now.toISOString(),
    };

    const stored = localStorage.getItem(STORAGE_KEYS.payments);
    const payments: ChickenPayment[] = stored ? JSON.parse(stored) : [];
    payments.unshift(newPayment);
    localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(payments));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_payments').insert([newPayment]);
      } catch (e) {
        console.warn('[CS API] Supabase payment insert fallback:', e);
      }
    }

    return newPayment;
  },

  async deletePayment(id: string): Promise<void> {
    const payments = await this.getPayments();
    const payment = payments.find(p => p.id === id);
    if (!payment) return;

    // Restore customer balance
    try {
      const cust = await this.getCustomerById(payment.customer_id);
      if (cust) {
        const newBal = Number(((cust.current_balance || 0) + payment.amount).toFixed(2));
        const newTotalPay = Math.max(0, Number(((cust.total_payments || 0) - payment.amount).toFixed(2)));
        await this.updateCustomer(cust.id, {
          current_balance: newBal,
          total_payments: newTotalPay,
        });
      }
    } catch (e) {
      console.warn('[CS API] Failed to restore balance on payment delete:', e);
    }

    const updated = payments.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_payments').delete().eq('id', id);
      } catch (e) {
        console.warn('[CS API] Supabase payment delete fallback:', e);
      }
    }
  },

  // ---------------------------------------------------------------------------
  // CUSTOMER CHRONOLOGICAL LEDGER BUILDER
  // ---------------------------------------------------------------------------
  async getCustomerLedger(customerId: string): Promise<{
    customer: ChickenCustomer;
    entries: ChickenShopLedgerEntry[];
    totalBilled: number;
    totalPaid: number;
    closingBalance: number;
  }> {
    const cust = await this.getCustomerById(customerId);
    if (!cust) throw new Error('Customer not found');

    const [sales, payments] = await Promise.all([
      this.getSales(),
      this.getPayments(customerId),
    ]);

    const custSales = sales.filter(s => s.customer_id === customerId);
    const entries: ChickenShopLedgerEntry[] = [];

    // 1. Opening Balance entry
    if (cust.opening_balance > 0) {
      entries.push({
        id: `op-${cust.id}`,
        date: cust.created_at.split('T')[0],
        type: 'opening',
        title: 'افتتاحی بقایا (Opening Balance)',
        description: 'کھاتہ کا سابقہ بقایا جات',
        debit: cust.opening_balance,
        credit: 0,
        running_balance: cust.opening_balance,
      });
    }

    // 2. Add sales
    custSales.forEach(s => {
      const itemsDesc = s.items.map(i => `${i.product_name} (${i.weight_kg}kg @ Rs.${i.rate_per_kg})`).join(', ');
      entries.push({
        id: s.id,
        date: s.sale_date,
        time: s.sale_time,
        type: 'sale',
        title: `بل فروخت (${s.invoice_no})`,
        description: itemsDesc,
        weight_kg: s.total_weight_kg,
        debit: s.total_amount,
        credit: s.received_amount, // Any cash paid upfront at sale
        running_balance: 0, // Calculated below
        reference_id: s.invoice_no,
      });
    });

    // 3. Add payments
    payments.forEach(p => {
      entries.push({
        id: p.id,
        date: p.payment_date,
        type: 'payment',
        title: `وصولی واؤچر (${p.voucher_no})`,
        description: `${p.payment_method.toUpperCase()} وصولی ${p.notes ? '— ' + p.notes : ''}`,
        debit: 0,
        credit: p.amount,
        running_balance: 0,
        reference_id: p.voucher_no,
      });
    });

    // Sort chronologically ascending
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance
    let running = 0;
    let totalBilled = 0;
    let totalPaid = 0;

    entries.forEach(e => {
      totalBilled += e.debit;
      totalPaid += e.credit;
      running += (e.debit - e.credit);
      e.running_balance = running;
    });

    return {
      customer: cust,
      entries,
      totalBilled,
      totalPaid,
      closingBalance: running,
    };
  },

  // ---------------------------------------------------------------------------
  // STOCK LOGS & AUDIT
  // ---------------------------------------------------------------------------
  async getStockLogs(): Promise<ChickenStockLog[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_stock_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          localStorage.setItem(STORAGE_KEYS.stockLogs, JSON.stringify(data));
          return data as ChickenStockLog[];
        }
      } catch {}
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.stockLogs);
      if (stored) return JSON.parse(stored);
    } catch {}

    return [];
  },

  async recordStockLog(log: Omit<ChickenStockLog, 'id' | 'created_at'>): Promise<ChickenStockLog> {
    const newLog: ChickenStockLog = {
      ...log,
      id: `slog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    };

    const stored = localStorage.getItem(STORAGE_KEYS.stockLogs);
    const logs: ChickenStockLog[] = stored ? JSON.parse(stored) : [];
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.stockLogs, JSON.stringify(logs.slice(0, 500)));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_stock_logs').insert([newLog]);
      } catch {}
    }

    return newLog;
  },

  async resetStockLogs(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.stockLogs);
    localStorage.setItem(STORAGE_KEYS.stockLogs, JSON.stringify([]));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_stock_logs').delete().neq('id', '___all___');
      } catch (e) {
        console.warn('[CS API] Supabase reset stock logs fallback:', e);
      }
    }
  },

  // ---------------------------------------------------------------------------
  // DASHBOARD KPIS & STATS
  // ---------------------------------------------------------------------------
  async getDashboardStats(): Promise<{
    todaySalesAmount: number;
    todayCashReceived: number;
    todayCreditSales: number;
    todayTotalWeightKg: number;
    todayInvoiceCount: number;
    totalMarketOutstanding: number;
    totalProductsCount: number;
    lowStockProductsCount: number;
    totalStockKg: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const [sales, customers, products] = await Promise.all([
      this.getSales(),
      this.getCustomers(),
      this.getProducts(),
    ]);

    const todaySales = sales.filter(s => s.sale_date === today);

    const todaySalesAmount = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
    const todayCashReceived = todaySales.reduce((sum, s) => sum + s.received_amount, 0);
    const todayCreditSales = todaySales.reduce((sum, s) => sum + s.remaining_due, 0);
    const todayTotalWeightKg = todaySales.reduce((sum, s) => sum + s.total_weight_kg, 0);
    const todayInvoiceCount = todaySales.length;

    const totalMarketOutstanding = customers.reduce((sum, c) => sum + (c.current_balance || 0), 0);
    const totalProductsCount = products.length;
    const lowStockProductsCount = products.filter(p => (p.stock_kg || 0) <= (p.min_stock_alert || 0)).length;
    const totalStockKg = products.reduce((sum, p) => sum + (p.stock_kg || 0), 0);

    return {
      todaySalesAmount,
      todayCashReceived,
      todayCreditSales,
      todayTotalWeightKg: Number(todayTotalWeightKg.toFixed(2)),
      todayInvoiceCount,
      totalMarketOutstanding,
      totalProductsCount,
      lowStockProductsCount,
      totalStockKg: Number(totalStockKg.toFixed(2)),
    };
  },

  // ---------------------------------------------------------------------------
  // FRESH CHICKEN ARRIVALS & STOCK
  // ---------------------------------------------------------------------------
  async getFreshChickenArrivals(): Promise<FreshChickenArrival[]> {
    let deletedIds = new Set<string>();
    try {
      deletedIds = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.deletedArrivalIds) || '[]'));
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_fresh_arrivals')
          .select('*')
          .neq('id', 'fca-init-01')
          .order('date', { ascending: false });
        if (!error && data) {
          const cleaned = (data as any[])
            .filter(a => a.id !== 'fca-init-01' && !deletedIds.has(a.id))
            .map(a => unpackArrival(a));
          localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(cleaned));
          return cleaned;
        }
      } catch (e) {
        console.warn('[CS API] Supabase fresh arrivals fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.freshArrivals);
      if (stored) {
        const parsed = (JSON.parse(stored) as any[])
          .filter(a => a.id !== 'fca-init-01' && !deletedIds.has(a.id))
          .map(a => unpackArrival(a));
        localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(parsed));
        return parsed;
      }
    } catch {}

    return [];
  },

  async saveFreshChickenArrival(entry: Omit<FreshChickenArrival, 'id' | 'created_at'>): Promise<FreshChickenArrival> {
    const cost = Number(entry.total_cost || Math.round((entry.weight_kg || 0) * (entry.rate_per_kg || 0)));
    const paid = Number(entry.paid_amount || 0);
    const remaining = Math.max(0, cost - paid);
    const status: 'unpaid' | 'partial' | 'paid' =
      entry.payment_status || (remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid');

    const initialHistory = entry.payment_history || [];
    if (paid > 0 && initialHistory.length === 0) {
      initialHistory.push({
        id: `spay-init-${Date.now()}`,
        date: entry.date,
        amount: paid,
        payment_method: entry.payment_method || 'cash',
        notes: 'ابتدائی لاٹ آمد ادائیگی',
        created_at: new Date().toISOString(),
      });
    }

    const newArrival: FreshChickenArrival = {
      ...entry,
      total_cost: cost,
      paid_amount: paid,
      remaining_payable: remaining,
      payment_status: status,
      payment_method: entry.payment_method || 'cash',
      payment_history: initialHistory,
      id: `fca-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    const arrivals = await this.getFreshChickenArrivals();
    arrivals.unshift(newArrival);
    localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(arrivals));

    if (isSupabaseConfigured()) {
      try {
        const payload = sanitizeArrivalForSupabase(newArrival);
        const { error } = await supabase.from('chicken_shop_fresh_arrivals').insert([payload]);
        if (error) {
          console.error('[CS API] Supabase fresh arrival insert error:', error);
        }
      } catch (e) {
        console.warn('[CS API] Supabase fresh arrival insert fallback:', e);
      }
    }

    // Determine target category product (e.g. Gosht, Boles, Tikka, or Fresh Chicken)
    const targetCategoryId = entry.category_id || FRESH_CHICKEN_PRODUCT_ID;
    const products = await this.getProducts();
    let targetProd = products.find(p => p.id === targetCategoryId);

    if (!targetProd) {
      if (targetCategoryId === FRESH_CHICKEN_PRODUCT_ID) {
        targetProd = {
          ...DEFAULT_FRESH_CHICKEN_PRODUCT,
          stock_kg: entry.weight_kg,
          rate_per_kg: entry.selling_rate_per_kg || DEFAULT_FRESH_CHICKEN_PRODUCT.rate_per_kg,
        };
        await this.saveProduct(targetProd);
      } else {
        targetProd = products[0] || DEFAULT_FRESH_CHICKEN_PRODUCT;
      }
    }

    // Automatically add arrived weight to Fresh Chicken stock
    if (entry.weight_kg > 0) {
      try {
        await this.updateProductStock(
          FRESH_CHICKEN_PRODUCT_ID,
          entry.weight_kg,
          'purchase',
          `فارم تازہ مرغی آمد (${entry.supplier_name || 'Farm'})`,
          newArrival.id
        );
      } catch (e) {
        console.warn('[CS API] Stock addition on arrival failed:', e);
      }
    }

    if (entry.selling_rate_per_kg > 0) {
      try {
        const prods = await this.getProducts();
        const pIdx = prods.findIndex(p => p.id === targetProd.id);
        if (pIdx !== -1) {
          prods[pIdx].rate_per_kg = entry.selling_rate_per_kg;
          localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(prods));
          if (isSupabaseConfigured()) {
            await supabase
              .from('chicken_shop_products')
              .update({ rate_per_kg: entry.selling_rate_per_kg })
              .eq('id', targetProd.id);
          }
        }
      } catch (e) {
        console.warn('[CS API] Failed to update selling rate on fresh arrival:', e);
      }
    }

    return newArrival;
  },

  async recordSupplierPayment(
    arrivalId: string,
    payment: {
      amount: number;
      date?: string;
      payment_method?: 'cash' | 'bank' | 'online' | 'cheque';
      notes?: string;
    }
  ): Promise<FreshChickenArrival> {
    const arrivals = await this.getFreshChickenArrivals();
    const targetIdx = arrivals.findIndex(a => a.id === arrivalId);
    if (targetIdx === -1) {
      throw new Error('سپلائر لاٹ ریکارڈ نہیں ملا');
    }

    const current = arrivals[targetIdx];
    const newPaidAmount = Number((current.paid_amount || 0) + payment.amount);
    const newRemaining = Math.max(0, Number(current.total_cost - newPaidAmount));
    const newStatus: 'unpaid' | 'partial' | 'paid' =
      newRemaining === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

    const newPaymentItem: SupplierPaymentItem = {
      id: `spay-${Date.now()}`,
      date: payment.date || new Date().toISOString().split('T')[0],
      amount: payment.amount,
      payment_method: payment.payment_method || 'cash',
      notes: payment.notes || null,
      created_at: new Date().toISOString(),
    };

    const updatedArrival: FreshChickenArrival = {
      ...current,
      paid_amount: newPaidAmount,
      remaining_payable: newRemaining,
      payment_status: newStatus,
      payment_history: [...(current.payment_history || []), newPaymentItem],
    };

    arrivals[targetIdx] = updatedArrival;
    localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(arrivals));

    if (isSupabaseConfigured()) {
      try {
        const payload = sanitizeArrivalForSupabase(updatedArrival);
        const { error } = await supabase
          .from('chicken_shop_fresh_arrivals')
          .update({ notes: payload.notes })
          .eq('id', arrivalId);
        if (error) {
          console.error('[CS API] Supabase update supplier payment error:', error);
        }
      } catch (e) {
        console.warn('[CS API] Supabase supplier payment update fallback:', e);
      }
    }

    return updatedArrival;
  },

  async deleteFreshChickenArrival(id: string): Promise<void> {
    const arrivals = await this.getFreshChickenArrivals();
    const target = arrivals.find(a => a.id === id);
    if (!target) return;

    // 1. Permanently delete from Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('chicken_shop_fresh_arrivals').delete().eq('id', id);
        if (error) {
          console.error('[CS API] Supabase fresh arrival delete error:', error);
          throw new Error(`ڈیٹا بیس سے آمد لاگ حذف کرنے میں خرابی: ${error.message}`);
        }
      } catch (e: any) {
        console.warn('[CS API] Supabase fresh arrival delete fallback:', e);
        if (e.message?.includes('خرابی')) throw e;
      }
    }

    // 2. Track in deletedArrivalIds set to prevent resurrection from ANY cache or sync
    try {
      const deletedIds = new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEYS.deletedArrivalIds) || '[]'));
      deletedIds.add(id);
      localStorage.setItem(STORAGE_KEYS.deletedArrivalIds, JSON.stringify(Array.from(deletedIds)));
    } catch {}

    // 3. Update localStorage cache
    const filtered = arrivals.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(filtered));

    // 4. Reverse stock addition on fresh scale product
    if (target.weight_kg > 0) {
      try {
        await this.updateProductStock(
          FRESH_CHICKEN_PRODUCT_ID,
          -target.weight_kg,
          'adjustment',
          `آمد لاگ حذف - اسٹاک کٹوتی (${target.weight_kg} KG)`
        );
      } catch (e) {
        console.warn('[CS API] Failed to reverse arrival stock:', e);
      }
    }
  },

  async updateFreshChickenSellingRate(newRate: number): Promise<void> {
    const products = await this.getProducts();
    const fcProd = products.find(p => p.id === FRESH_CHICKEN_PRODUCT_ID);
    if (fcProd) {
      await this.saveProduct({
        ...fcProd,
        rate_per_kg: newRate,
      });
    }
  },

  // ---------------------------------------------------------------------------
  // FRESH CHICKEN STOCK MANAGEMENT (DASHBOARD)
  // ---------------------------------------------------------------------------
  async getFreshChickenStock(): Promise<number> {
    const products = await this.getProducts();
    const fresh = products.find(p => p.id === FRESH_CHICKEN_PRODUCT_ID);
    return fresh?.stock_kg || 0;
  },

  async updateFreshChickenStock(newStockKg: number): Promise<ChickenProduct | null> {
    const products = await this.getProducts();
    const fresh = products.find(p => p.id === FRESH_CHICKEN_PRODUCT_ID);
    if (!fresh) return null;
    const changeKg = Number((newStockKg - (fresh.stock_kg || 0)).toFixed(2));
    return this.updateProductStock(FRESH_CHICKEN_PRODUCT_ID, changeKg, 'adjustment', 'ڈیش بورڈ سے براہ راست اسٹاک ایڈجسٹمنٹ');
  },

  async deleteFreshChickenStock(): Promise<ChickenProduct | null> {
    const products = await this.getProducts();
    const fresh = products.find(p => p.id === FRESH_CHICKEN_PRODUCT_ID);
    if (!fresh) return null;
    const changeKg = -(fresh.stock_kg || 0);
    return this.updateProductStock(FRESH_CHICKEN_PRODUCT_ID, changeKg, 'adjustment', 'ڈیش بورڈ سے تازہ چکن اسٹاک صفر (0) ری سیٹ');
  },

  // ---------------------------------------------------------------------------
  // FREEZER STOCK & PRODUCTS (COMPLETELY SEPARATE FROM FRESH CHICKEN)
  // ---------------------------------------------------------------------------
  async getFreezerProducts(): Promise<FreezerProduct[]> {
    const products = await this.getProducts();
    return products
      .filter(p => p.category === 'Freezer Stock' || p.id.startsWith('freezer-'))
      .map(p => ({
        id: p.id,
        name: p.name,
        urdu_name: p.urdu_name || p.name,
        category: 'Freezer Stock',
        unit: 'KG',
        rate_per_kg: Number(p.rate_per_kg || 0),
        stock_kg: Number(p.stock_kg || 0),
        is_active: p.is_active !== false,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));
  },

  async saveFreezerProduct(data: {
    id?: string;
    name: string;
    urdu_name?: string;
    rate_per_kg: number;
    stock_kg: number;
    is_active?: boolean;
  }): Promise<FreezerProduct> {
    const saved = await this.saveProduct({
      id: data.id || `freezer-${Date.now()}`,
      name: data.name.trim(),
      urdu_name: data.urdu_name?.trim() || data.name.trim(),
      category: 'Freezer Stock',
      unit: 'KG',
      rate_per_kg: Number(data.rate_per_kg || 0),
      stock_kg: Number(data.stock_kg || 0),
      is_active: data.is_active !== false,
    });
    return {
      id: saved.id,
      name: saved.name,
      urdu_name: saved.urdu_name || saved.name,
      category: 'Freezer Stock',
      unit: 'KG',
      rate_per_kg: saved.rate_per_kg,
      stock_kg: saved.stock_kg || 0,
      is_active: saved.is_active,
      created_at: saved.created_at,
      updated_at: saved.updated_at,
    };
  },

  async deleteFreezerProduct(id: string): Promise<void> {
    await this.deleteProduct(id);
  },

  async updateFreezerStock(id: string, newStockKg: number): Promise<void> {
    const products = await this.getProducts();
    const target = products.find(p => p.id === id);
    if (!target) return;
    const diff = Number((newStockKg - (target.stock_kg || 0)).toFixed(2));
    await this.updateProductStock(id, diff, 'adjustment', 'فریزر اسٹاک ایڈجسٹمنٹ');
  },
  
  // ---------------------------------------------------------------------------
  // SHOP EXPENSES (FOR NET PROFIT & LOSS)
  // ---------------------------------------------------------------------------
  async getExpenses(): Promise<ChickenExpense[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_expenses')
          .select('*')
          .order('date', { ascending: false });
        if (!error && data) {
          localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(data));
          return data as ChickenExpense[];
        }
      } catch (e) {
        console.warn('[CS API] Supabase expenses read fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.expenses);
      if (stored) return JSON.parse(stored);
    } catch {}

    return [];
  },

  async saveExpense(exp: Omit<ChickenExpense, 'id' | 'created_at'>): Promise<ChickenExpense> {
    const newExp: ChickenExpense = {
      ...exp,
      id: `exp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    const expenses = await this.getExpenses();
    expenses.unshift(newExp);
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_expenses').insert([newExp]);
      } catch (e) {
        console.warn('[CS API] Supabase expense insert fallback:', e);
      }
    }

    return newExp;
  },

  async deleteExpense(id: string): Promise<void> {
    const expenses = await this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(filtered));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_expenses').delete().eq('id', id);
      } catch (e) {
        console.warn('[CS API] Supabase expense delete fallback:', e);
      }
    }
  },

  // ---------------------------------------------------------------------------
  // AUTO-MIGRATE BROWSER CACHE (LOCALSTORAGE) TO SUPABASE
  // Only syncs genuine offline transactions; never pushes dummy items
  // ---------------------------------------------------------------------------
  async syncBrowserCacheToSupabase(): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      // Sales & Fresh Arrivals auto-sync removed to prevent resurrecting deleted records

      // 3. Sync offline payments if any
      const storedPayments = localStorage.getItem(STORAGE_KEYS.payments);
      if (storedPayments) {
        try {
          const payments: ChickenPayment[] = JSON.parse(storedPayments);
          if (Array.isArray(payments) && payments.length > 0) {
            const { data: existing } = await supabase.from('chicken_shop_payments').select('id');
            const existingIds = new Set((existing || []).map((p: any) => p.id));
            const missingPayments = payments.filter(p => !existingIds.has(p.id));
            if (missingPayments.length > 0) {
              await supabase.from('chicken_shop_payments').upsert(missingPayments);
            }
          }
        } catch {}
      }
    } catch (err) {
      console.warn('[CS API] Sync cache to Supabase warning:', err);
    }
  },

  // One-time automatic purge of stale local dummy data from user's browser
  clearStaleLocalMockData(): void {
    try {
      if (!localStorage.getItem('cs_purged_clean_slate_v5')) {
        localStorage.removeItem(STORAGE_KEYS.products);
        localStorage.removeItem(STORAGE_KEYS.customers);
        localStorage.removeItem(STORAGE_KEYS.sales);
        localStorage.removeItem(STORAGE_KEYS.payments);
        localStorage.removeItem(STORAGE_KEYS.freshArrivals);
        localStorage.removeItem(STORAGE_KEYS.expenses);
        localStorage.removeItem(STORAGE_KEYS.stockLogs);
        localStorage.setItem('cs_purged_clean_slate_v5', 'true');
      }
    } catch {}
  },

  // ---------------------------------------------------------------------------
  // CHICKEN CATEGORIES (Product Types / Cuts: Legs, Chest, Wings, Tikka, etc.)
  // ---------------------------------------------------------------------------
  async getCategories(): Promise<ChickenCategory[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_categories')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(data));
          return data as ChickenCategory[];
        }
      } catch (e) {
        console.warn('[CS API] Supabase categories read fallback:', e);
      }
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.categories);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_CHICKEN_CATEGORIES;
  },

  async createCategory(cat: {
    name: string;
    urdu_name: string;
    default_rate_per_kg?: number;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<ChickenCategory> {
    const newCat: ChickenCategory = {
      id: 'cat-' + Date.now(),
      name: cat.name.trim(),
      urdu_name: cat.urdu_name.trim(),
      default_rate_per_kg: Number(cat.default_rate_per_kg || 0),
      sort_order: Number(cat.sort_order || 99),
      is_active: cat.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let categories = await this.getCategories();
    categories.push(newCat);
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_categories').upsert(newCat);
      } catch (e) {
        console.warn('[CS API] Supabase category insert failed:', e);
      }
    }

    return newCat;
  },

  async updateCategory(cat: ChickenCategory): Promise<ChickenCategory> {
    const updated = { ...cat, updated_at: new Date().toISOString() };
    let categories = await this.getCategories();
    const idx = categories.findIndex(c => c.id === cat.id);
    if (idx !== -1) categories[idx] = updated;
    else categories.push(updated);
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_categories').upsert(updated);
      } catch (e) {
        console.warn('[CS API] Supabase category update failed:', e);
      }
    }

    return updated;
  },

  async deleteCategory(id: string): Promise<void> {
    let categories = await this.getCategories();
    categories = categories.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_categories').delete().eq('id', id);
      } catch (e) {
        console.warn('[CS API] Supabase category delete failed:', e);
      }
    }
  },

  // ---------------------------------------------------------------------------
  // CHICKEN SHOP WORKERS / USER ACCOUNTS
  // ---------------------------------------------------------------------------
  async getWorkers(): Promise<ChickenShopWorker[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_workers')
          .select('*')
          .order('name');
        if (!error && data) {
          localStorage.setItem(STORAGE_KEYS.workers, JSON.stringify(data));
          return data as ChickenShopWorker[];
        }
      } catch (e) {
        console.warn('[CS API] Supabase workers read fallback:', e);
      }
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.workers);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  },

  async createWorker(worker: {
    name: string;
    phone: string;
    password: string;
    pin?: string;
    role?: 'worker' | 'manager';
    can_daily_sales?: boolean;
    can_khata?: boolean;
    can_wasooli?: boolean;
    is_active?: boolean;
  }): Promise<ChickenShopWorker> {
    const newWorker: ChickenShopWorker = {
      id: 'csw-' + Date.now(),
      name: worker.name.trim(),
      phone: worker.phone.trim(),
      password: worker.password.trim(),
      pin: worker.pin?.trim() || undefined,
      role: worker.role || 'worker',
      can_daily_sales: worker.can_daily_sales !== false,
      can_khata: worker.can_khata !== false,
      can_wasooli: worker.can_wasooli !== false,
      is_active: worker.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let workers = await this.getWorkers();
    workers.push(newWorker);
    localStorage.setItem(STORAGE_KEYS.workers, JSON.stringify(workers));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_workers').upsert(newWorker);
      } catch (e) {
        console.warn('[CS API] Supabase worker insert failed:', e);
      }
    }

    return newWorker;
  },

  async updateWorker(worker: ChickenShopWorker): Promise<ChickenShopWorker> {
    const updated = { ...worker, updated_at: new Date().toISOString() };
    let workers = await this.getWorkers();
    const idx = workers.findIndex(w => w.id === worker.id);
    if (idx !== -1) workers[idx] = updated;
    else workers.push(updated);
    localStorage.setItem(STORAGE_KEYS.workers, JSON.stringify(workers));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_workers').upsert(updated);
      } catch (e) {
        console.warn('[CS API] Supabase worker update failed:', e);
      }
    }

    return updated;
  },

  async deleteWorker(id: string): Promise<void> {
    let workers = await this.getWorkers();
    workers = workers.filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEYS.workers, JSON.stringify(workers));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_workers').delete().eq('id', id);
      } catch (e) {
        console.warn('[CS API] Supabase worker delete failed:', e);
      }
    }
  },

  async loginWorker(phone: string, pass: string): Promise<{ success: boolean; worker?: ChickenShopWorker; error?: string }> {
    const cleanPhone = phone.trim();
    const cleanPass = pass.trim();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_workers')
          .select('*')
          .eq('phone', cleanPhone)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          if (data.password === cleanPass || data.pin === cleanPass) {
            return { success: true, worker: data as ChickenShopWorker };
          }
          return { success: false, error: 'پاس ورڈ یا پن درست نہیں ہے۔ (Invalid password)' };
        }
      } catch (e) {
        console.warn('[CS API] Worker login Supabase fallback:', e);
      }
    }

    // Local fallback check
    const workers = await this.getWorkers();
    const found = workers.find(w => w.phone === cleanPhone && w.is_active);
    if (found) {
      if (found.password === cleanPass || found.pin === cleanPass) {
        return { success: true, worker: found };
      }
      return { success: false, error: 'پاس ورڈ درست نہیں ہے۔ (Invalid password)' };
    }

    return { success: false, error: 'یہ فون نمبر یا ورکر اکاؤنٹ موجود نہیں ہے۔ (Worker account not found)' };
  },

  // Completely resets any mock / temporary dummy data from Supabase and browser localStorage
  async resetAllTemporaryData(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_sales').delete().neq('id', '___none___');
        await supabase.from('chicken_shop_payments').delete().neq('id', '___none___');
        await supabase.from('chicken_shop_fresh_arrivals').delete().neq('id', '___none___');
        await supabase.from('chicken_shop_expenses').delete().neq('id', '___none___');
        await supabase.from('chicken_shop_stock_logs').delete().neq('id', '___none___');
        await supabase.from('chicken_shop_customers').delete().neq('id', '___none___');
        await supabase.from('chicken_shop_products').delete().neq('id', FRESH_CHICKEN_PRODUCT_ID);
        await supabase.from('chicken_shop_products').update({ stock_kg: 0, min_stock_alert: 0 }).eq('id', FRESH_CHICKEN_PRODUCT_ID);
      } catch (e) {
        console.warn('[CS API] Error clearing data from Supabase:', e);
      }
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.products);
      localStorage.removeItem(STORAGE_KEYS.customers);
      localStorage.removeItem(STORAGE_KEYS.sales);
      localStorage.removeItem(STORAGE_KEYS.payments);
      localStorage.removeItem(STORAGE_KEYS.freshArrivals);
      localStorage.removeItem(STORAGE_KEYS.expenses);
      localStorage.removeItem(STORAGE_KEYS.stockLogs);
      localStorage.setItem('cs_purged_clean_slate_v5', 'true');
    } catch {}
  },
};
