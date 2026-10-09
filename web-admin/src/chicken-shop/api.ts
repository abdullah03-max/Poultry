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
} from './types';

export const FRESH_CHICKEN_PRODUCT_ID = 'prod-fresh-chicken';

export const DEFAULT_FRESH_CHICKEN_PRODUCT: ChickenProduct = {
  id: FRESH_CHICKEN_PRODUCT_ID,
  name: 'Fresh Chicken',
  urdu_name: 'تازہ مرغی (زندہ / ہول چکن)',
  category: 'Fresh Live Chicken',
  unit: 'KG',
  rate_per_kg: 440,
  stock_kg: 100.0,
  min_stock_alert: 25.0,
  is_active: true,
};

// Default Chicken cuts + Fresh Chicken as explicitly requested
export const DEFAULT_CHICKEN_PRODUCTS: ChickenProduct[] = [
  DEFAULT_FRESH_CHICKEN_PRODUCT,
  {
    id: 'prod-drumsticks',
    name: 'Drumsticks',
    urdu_name: 'ڈرم اسٹکس',
    category: 'Chicken Cuts',
    unit: 'KG',
    rate_per_kg: 580,
    stock_kg: 35.0,
    min_stock_alert: 10.0,
    is_active: true,
  },
  {
    id: 'prod-chicken-bongs',
    name: 'Chicken Bongs',
    urdu_name: 'چکن بونگز',
    category: 'Chicken Cuts',
    unit: 'KG',
    rate_per_kg: 520,
    stock_kg: 25.0,
    min_stock_alert: 8.0,
    is_active: true,
  },
  {
    id: 'prod-chicken-legs',
    name: 'Chicken Legs',
    urdu_name: 'چکن لیگز',
    category: 'Chicken Cuts',
    unit: 'KG',
    rate_per_kg: 560,
    stock_kg: 40.0,
    min_stock_alert: 10.0,
    is_active: true,
  },
  {
    id: 'prod-chicken-breast',
    name: 'Chicken Breast / Chest',
    urdu_name: 'چکن چیسٹ / بریسٹ',
    category: 'Chicken Cuts',
    unit: 'KG',
    rate_per_kg: 640,
    stock_kg: 45.0,
    min_stock_alert: 12.0,
    is_active: true,
  },
  {
    id: 'prod-chicken-tikka',
    name: 'Chicken Tikka',
    urdu_name: 'چکن تکہ کٹ',
    category: 'Chicken Cuts',
    unit: 'KG',
    rate_per_kg: 600,
    stock_kg: 30.0,
    min_stock_alert: 8.0,
    is_active: true,
  },
  {
    id: 'prod-boles',
    name: 'Boles (Boneless)',
    urdu_name: 'بون لیس (Boles)',
    category: 'Boneless Cuts',
    unit: 'KG',
    rate_per_kg: 680,
    stock_kg: 60.0,
    min_stock_alert: 15.0,
    is_active: true,
  },
  {
    id: 'prod-thai',
    name: 'Thai',
    urdu_name: 'تھائی (Thai)',
    category: 'Chicken Cuts',
    unit: 'KG',
    rate_per_kg: 490,
    stock_kg: 35.0,
    min_stock_alert: 10.0,
    is_active: true,
  },
  {
    id: 'prod-gosht',
    name: 'Gosht (Chicken Meat)',
    urdu_name: 'چکن گوشت مکس (Gosht)',
    category: 'Fresh Meat',
    unit: 'KG',
    rate_per_kg: 420,
    stock_kg: 120.0,
    min_stock_alert: 25.0,
    is_active: true,
  },
];

const DEFAULT_CUSTOMERS: ChickenCustomer[] = [
  {
    id: 'cust-cs-001',
    name: 'الحرمین تکہ شاپ',
    phone: '0301-7654321',
    address: 'مین بازار، ساہیوال',
    shop_name: 'Al-Haramain Tikka Shop',
    opening_balance: 12000,
    current_balance: 12000,
    total_purchases: 0,
    total_payments: 0,
    notes: 'ہفتہ وار ادھار کھاتہ',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cust-cs-002',
    name: 'بسم اللہ بروسٹ کارنر',
    phone: '0302-8889911',
    address: 'کالج روڈ',
    shop_name: 'Bismillah Broast',
    opening_balance: 5000,
    current_balance: 5000,
    total_purchases: 0,
    total_payments: 0,
    notes: 'ڈیلی سپلائی',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cust-cs-003',
    name: 'خان شنواری ہوٹل',
    phone: '0345-1234567',
    address: 'جی ٹی روڈ بائی پاس',
    shop_name: 'Khan Shinwari Hotel',
    opening_balance: 0,
    current_balance: 0,
    total_purchases: 0,
    total_payments: 0,
    notes: 'نقد و فوری کلیئرنگ',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper storage keys
const STORAGE_KEYS = {
  products: 'cs_portal_products',
  customers: 'cs_portal_customers',
  sales: 'cs_portal_sales',
  payments: 'cs_portal_payments',
  stockLogs: 'cs_portal_stock_logs',
  freshArrivals: 'cs_portal_fresh_arrivals',
  expenses: 'cs_portal_expenses',
};

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
        if (!error && data && data.length > 0) {
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
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(merged));
        return merged;
      }
    } catch {}

    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(DEFAULT_CHICKEN_PRODUCTS));
    return [...DEFAULT_CHICKEN_PRODUCTS];
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
        if (!error && data && data.length > 0) {
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

    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(DEFAULT_CUSTOMERS));
    return [...DEFAULT_CUSTOMERS];
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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_sales')
          .select('*')
          .order('sale_date', { ascending: false });
        if (!error && data && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(data));
          return data as ChickenSale[];
        }
      } catch (e) {
        console.warn('[CS API] Supabase sales read fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.sales);
      if (stored) return JSON.parse(stored);
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

    // Deduct stock for each sold item
    for (const item of itemsWithTotals) {
      await this.updateProductStock(
        item.product_id,
        -item.weight_kg,
        'sale',
        `Sold to ${saleData.customer_name} (Invoice ${invoiceNo})`,
        invoiceNo
      );
    }

    return newSale;
  },

  async deleteSale(id: string): Promise<void> {
    let sales = await this.getSales();
    const target = sales.find(s => s.id === id);
    if (!target) return;

    // Rollback stock
    for (const item of target.items) {
      await this.updateProductStock(
        item.product_id,
        item.weight_kg,
        'adjustment',
        `Reversed cancelled sale ${target.invoice_no}`,
        target.invoice_no
      );
    }

    // Rollback customer balance if applicable
    if (target.customer_id) {
      const cust = await this.getCustomerById(target.customer_id);
      if (cust) {
        const rollbackBal = Math.max(0, cust.current_balance - target.remaining_due);
        const rollbackPurchases = Math.max(0, cust.total_purchases - target.total_amount);
        const rollbackPayments = Math.max(0, cust.total_payments - target.received_amount);
        await this.updateCustomer(cust.id, {
          current_balance: rollbackBal,
          total_purchases: rollbackPurchases,
          total_payments: rollbackPayments,
        });
      }
    }

    sales = sales.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(sales));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_sales').delete().eq('id', id);
      } catch {}
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
        if (!error && data && data.length > 0) {
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
        if (!error && data && data.length > 0) return data as ChickenStockLog[];
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
    const lowStockProductsCount = products.filter(p => p.stock_kg <= p.min_stock_alert).length;
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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_fresh_arrivals')
          .select('*')
          .order('date', { ascending: false });
        if (!error && data && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(data));
          return data as FreshChickenArrival[];
        }
      } catch (e) {
        console.warn('[CS API] Supabase fresh arrivals fallback:', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.freshArrivals);
      if (stored) return JSON.parse(stored);
    } catch {}

    const initialArrivals: FreshChickenArrival[] = [
      {
        id: 'fca-init-01',
        date: new Date().toISOString().split('T')[0],
        time: '08:30:00',
        weight_kg: 100.0,
        rate_per_kg: 380,
        total_cost: 38000,
        selling_rate_per_kg: 440,
        supplier_name: 'پنجاب پولٹری فارم (گاڑی 4)',
        birds_count: 55,
        vehicle_no: 'FD-1892',
        notes: 'تازہ مرغی فارم آمد',
        created_at: new Date().toISOString(),
      },
    ];

    localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(initialArrivals));
    return initialArrivals;
  },

  async saveFreshChickenArrival(entry: Omit<FreshChickenArrival, 'id' | 'created_at'>): Promise<FreshChickenArrival> {
    const newArrival: FreshChickenArrival = {
      ...entry,
      id: `fca-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    const arrivals = await this.getFreshChickenArrivals();
    arrivals.unshift(newArrival);
    localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(arrivals));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_fresh_arrivals').insert([newArrival]);
      } catch (e) {
        console.warn('[CS API] Supabase fresh arrival insert fallback:', e);
      }
    }

    // Ensure Fresh Chicken product exists and increase its stock
    const products = await this.getProducts();
    let fcProd = products.find(p => p.id === FRESH_CHICKEN_PRODUCT_ID);
    if (!fcProd) {
      fcProd = {
        ...DEFAULT_FRESH_CHICKEN_PRODUCT,
        stock_kg: entry.weight_kg,
        rate_per_kg: entry.selling_rate_per_kg || DEFAULT_FRESH_CHICKEN_PRODUCT.rate_per_kg,
      };
      await this.saveProduct(fcProd);
    } else {
      const updatedProd = await this.updateProductStock(
        FRESH_CHICKEN_PRODUCT_ID,
        entry.weight_kg,
        'purchase',
        `تازہ چکن فارم آمد: ${entry.supplier_name || 'سپلائر'} (${entry.weight_kg}kg @ Rs.${entry.rate_per_kg})`,
        newArrival.id
      );
      if (entry.selling_rate_per_kg > 0 && updatedProd) {
        await this.saveProduct({
          ...updatedProd,
          rate_per_kg: entry.selling_rate_per_kg,
        });
      }
    }

    return newArrival;
  },

  async deleteFreshChickenArrival(id: string): Promise<void> {
    const arrivals = await this.getFreshChickenArrivals();
    const target = arrivals.find(a => a.id === id);
    if (!target) return;

    const filtered = arrivals.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.freshArrivals, JSON.stringify(filtered));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('chicken_shop_fresh_arrivals').delete().eq('id', id);
      } catch (e) {
        console.warn('[CS API] Supabase fresh arrival delete fallback:', e);
      }
    }

    // Rollback stock
    await this.updateProductStock(
      FRESH_CHICKEN_PRODUCT_ID,
      -target.weight_kg,
      'adjustment',
      `حذف شدہ تازہ چکن آمد رول بیک (Reversed ${target.weight_kg}kg)`,
      id
    );
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
  // SHOP EXPENSES (FOR NET PROFIT & LOSS)
  // ---------------------------------------------------------------------------
  async getExpenses(): Promise<ChickenExpense[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('chicken_shop_expenses')
          .select('*')
          .order('date', { ascending: false });
        if (!error && data && data.length > 0) {
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

    const initialExpenses: ChickenExpense[] = [
      {
        id: 'exp-01',
        date: new Date().toISOString().split('T')[0],
        category: 'ice_cutting',
        category_urdu: 'برف و کٹنگ خرچہ',
        title: 'برف اور کٹنگ ضرورت',
        amount: 800,
        payment_method: 'cash',
        notes: 'روزانہ دکان ضرورت',
        created_at: new Date().toISOString(),
      },
      {
        id: 'exp-02',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        category: 'packaging',
        category_urdu: 'شاپر و پیکنگ',
        title: 'شاپر بیگز بنڈل',
        amount: 1500,
        payment_method: 'cash',
        notes: '5kg اور 1kg بیگز',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(initialExpenses));
    return initialExpenses;
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
};
