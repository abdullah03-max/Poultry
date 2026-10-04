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
} from '../types/database';
import { getDaysInMonth } from '../utils/formatters';

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
    category_rates: {},
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
    category_rates: {},
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
    category_rates: {},
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
    category_rates: {},
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
    category_rates: {},
    status: 'active',
    notes: 'Large slaughterhouse unit',
    is_deleted: false,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let mockCategories: WeightCategory[] = [
  {
    id: 'wc1',
    code: 'cat_1',
    name: 'Weight Category 1',
    urdu_name: 'وزن کیٹیگری ۱',
    unit: 'KG',
    default_rate: 45.0,
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'wc2',
    code: 'cat_2',
    name: 'Weight Category 2',
    urdu_name: 'وزن کیٹیگری ۲',
    unit: 'KG',
    default_rate: 40.0,
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'wc3',
    code: 'waste',
    name: 'Waste Weight',
    urdu_name: 'فضلہ وزن',
    unit: 'KG',
    default_rate: 48.0,
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'wc4',
    code: 'fat',
    name: 'Fat Weight',
    urdu_name: 'چربی وزن',
    unit: 'KG',
    default_rate: 55.0,
    is_active: true,
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let mockSettings: BusinessSettings = {
  id: 'bs-1',
  business_name: 'SHAN POULTRY PROTEIN',
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

// Helper to generate realistic historical collections for current month
const generateMockCollections = (): Collection[] => {
  const list: Collection[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = now.getDate();

  // Create collections for the past days of this month
  for (let d = 1; d <= currentDay; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    // Day 1 to currentDay: each customer might have collection or 'X' (skip)
    mockCustomers.forEach((cust, index) => {
      // Create pattern: some days have collection, some days empty ('X')
      if ((d + index) % 3 !== 0) {
        const netWeight = 40 + ((d * 7 + index * 11) % 65);
        const grossWeight = netWeight + 3.5;
        const tareWeight = 3.5;
        const totalAmount = Math.round(netWeight * cust.rate_per_kg);
        const receiptNo = `SPP-${year}${String(month + 1).padStart(2, '0')}-${String(list.length + 1001).padStart(5, '0')}`;
        const worker = mockWorkers[index % mockWorkers.length];

        list.push({
          id: `col-${year}-${month + 1}-${d}-${cust.id}`,
          receipt_no: receiptNo,
          client_uuid: `client-uuid-${year}-${month + 1}-${d}-${cust.id}`,
          customer_id: cust.id,
          worker_id: worker.id,
          collection_date: dateStr,
          collection_time: `${String(8 + (index % 4)).padStart(2, '0')}:${String((d * 12) % 60).padStart(2, '0')}:00`,
          collection_timestamp: `${dateStr}T${String(8 + (index % 4)).padStart(2, '0')}:30:00+05:00`,
          gross_weight: grossWeight,
          tare_weight: tareWeight,
          total_net_weight: netWeight,
          rate_per_kg: cust.rate_per_kg,
          total_amount: totalAmount,
          notes: d % 2 === 0 ? 'Standard clean collection' : null,
          signature_url: 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=300&q=80',
          signature_timestamp: `${dateStr}T${String(8 + (index % 4)).padStart(2, '0')}:31:00+05:00`,
          signee_name: cust.contact_person,
          status: 'submitted',
          created_at: `${dateStr}T${String(8 + (index % 4)).padStart(2, '0')}:32:00+05:00`,
          updated_at: `${dateStr}T${String(8 + (index % 4)).padStart(2, '0')}:32:00+05:00`,
          customer: cust,
          worker: worker,
          items: [
            {
              id: `item-1-${d}-${cust.id}`,
              collection_id: `col-${year}-${month + 1}-${d}-${cust.id}`,
              category_id: mockCategories[0].id,
              weight: Math.round(netWeight * 0.65),
              rate: cust.rate_per_kg,
              amount: Math.round(netWeight * 0.65 * cust.rate_per_kg),
              created_at: `${dateStr}T08:30:00+05:00`,
              category: mockCategories[0],
            },
            {
              id: `item-2-${d}-${cust.id}`,
              collection_id: `col-${year}-${month + 1}-${d}-${cust.id}`,
              category_id: mockCategories[3].id,
              weight: Math.round(netWeight * 0.35),
              rate: cust.rate_per_kg,
              amount: Math.round(netWeight * 0.35 * cust.rate_per_kg),
              created_at: `${dateStr}T08:30:00+05:00`,
              category: mockCategories[3],
            },
          ],
        });
      }
    });
  }

  return list;
};

let mockCollections: Collection[] = generateMockCollections();

let mockAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    user_id: mockWorkers[2].id,
    action: 'SETTINGS_UPDATE',
    table_name: 'business_settings',
    record_id: 'bs-1',
    old_data: { monthly_register_empty_symbol: '-' },
    new_data: { monthly_register_empty_symbol: 'X' },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    profile: mockWorkers[2],
  },
  {
    id: 'log-2',
    user_id: mockWorkers[0].id,
    action: 'INSERT',
    table_name: 'collections',
    record_id: mockCollections[mockCollections.length - 1]?.id || 'col-new',
    old_data: null,
    new_data: { receipt_no: mockCollections[mockCollections.length - 1]?.receipt_no, total_net_weight: 75.5 },
    created_at: new Date(Date.now() - 1800000).toISOString(),
    profile: mockWorkers[0],
  },
];

// -----------------------------------------------------------------------------
// API Service Methods
// -----------------------------------------------------------------------------

export const api = {
  // Business Settings
  async getSettings(): Promise<BusinessSettings> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('business_settings').select('*').limit(1).single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not fetch settings from Supabase, using mock state:', err);
      }
    }
    return { ...mockSettings };
  },

  async updateSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('business_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('id', mockSettings.id)
          .select()
          .single();
        if (!error && data) return data;
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
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Could not fetch customers from Supabase, using mock state:', err);
      }
    }
    return mockCustomers.filter(c => includeDeleted || !c.is_deleted);
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not fetch customer by id from Supabase, using mock state:', err);
      }
    }
    return mockCustomers.find(c => c.id === id) || null;
  },

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Customer> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('customers').insert([customer]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not create customer in Supabase, saving to mock state:', err);
      }
    }
    const newCust: Customer = {
      ...customer,
      id: `c-${Date.now()}`,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockCustomers.push(newCust);
    return newCust;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Could not update customer in Supabase, updating mock state:', err);
      }
    }
    const idx = mockCustomers.findIndex(c => c.id === id);
    if (idx !== -1) {
      mockCustomers[idx] = { ...mockCustomers[idx], ...updates, updated_at: new Date().toISOString() };
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

  // Workers Management
  async getWorkers(): Promise<Profile[]> {
    const deletedIds: string[] = JSON.parse(localStorage.getItem('spp_deleted_worker_ids') || '[]');
    const customWorkers: Profile[] = JSON.parse(localStorage.getItem('spp_custom_workers') || '[]');

    let list: Profile[] = [];
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name', { ascending: true });
        if (!error && data && data.length > 0) {
          list = data as Profile[];
        }
      } catch (err) {
        console.warn('[API] Could not fetch workers from Supabase, using mock state:', err);
      }
    }

    if (list.length === 0) {
      list = [...mockWorkers];
    }

    // Merge any custom created workers
    for (const cw of customWorkers) {
      const idx = list.findIndex(w => w.id === cw.id || (w.email && cw.email && w.email.toLowerCase() === cw.email.toLowerCase()));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...cw };
      } else {
        list.push(cw);
      }
    }

    // Filter out any explicitly deleted workers
    list = list.filter(w => !deletedIds.includes(w.id));

    // Keep mockWorkers in sync for in-memory joins
    mockWorkers = [...list];

    return list;
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

    const newId = generateUUID();
    const newWorker: Profile = {
      id: newId,
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

    // 1. Remove from deleted IDs if previously deleted
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('spp_deleted_worker_ids') || '[]');
      const filteredDeleted = deletedIds.filter(id => id !== newId);
      localStorage.setItem('spp_deleted_worker_ids', JSON.stringify(filteredDeleted));
    } catch {}

    // 2. Save to persistent custom workers
    try {
      const customWorkers: Profile[] = JSON.parse(localStorage.getItem('spp_custom_workers') || '[]');
      customWorkers.unshift(newWorker);
      localStorage.setItem('spp_custom_workers', JSON.stringify(customWorkers));
    } catch {}

    // 3. Save to auth store for mobile worker app
    try {
      const authList = JSON.parse(localStorage.getItem('spp_registered_workers_auth') || '[]');
      authList.push({
        id: newWorker.id,
        full_name: newWorker.full_name,
        phone: newWorker.phone,
        email: newWorker.email,
        password: params.password,
        is_active: true,
      });
      localStorage.setItem('spp_registered_workers_auth', JSON.stringify(authList));
    } catch {}

    mockWorkers.push(newWorker);

    // 4. Save to Supabase
    if (isSupabaseConfigured()) {
      try {
        // Try direct insert with email & password
        const { error: insErr } = await supabase.from('profiles').insert({
          id: newId,
          full_name: params.full_name,
          phone: params.phone || null,
          email: params.email || null,
          password: params.password || null,
          role: 'worker',
          is_active: true,
        });

        if (insErr) {
          // If custom columns don't exist yet, try standard columns
          const { error: fallbackErr } = await supabase.from('profiles').insert({
            id: newId,
            full_name: params.full_name,
            phone: params.phone || null,
            role: 'worker',
            is_active: true,
          });
          if (fallbackErr) {
            console.warn('[API] Could not insert profile directly into Supabase (run fix_worker_permissions.sql):', fallbackErr);
          }
        }
      } catch (err) {
        console.warn('[API] Failed to insert worker to Supabase:', err);
      }
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

    // 5. Delete in Supabase (hard delete or fallback soft delete)
    if (isSupabaseConfigured()) {
      try {
        const { error: delErr } = await supabase.from('profiles').delete().eq('id', id);
        if (delErr) {
          console.warn('[API] Hard delete failed, setting is_active = false in Supabase:', delErr);
          await supabase.from('profiles').update({ is_active: false }).eq('id', id);
        }
      } catch (err) {
        console.warn('[API] Could not delete worker from Supabase:', err);
      }
    }
  },

  async setWorkerStatus(id: string, isActive: boolean): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('profiles')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('[API] Could not update worker status in Supabase:', err);
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
      try {
        await supabase
          .from('profiles')
          .update({ password: newPassword, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('[API] Could not update password in Supabase profiles:', err);
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
        if (!error && data && data.length > 0) {
          return { collections: data as Collection[], totalCount: count || data.length };
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
          client_uuid: collection.client_uuid,
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
            const weightItems = items.map(it => ({
              collection_id: colData.id,
              category_id: it.category_id,
              weight: it.weight,
              rate: it.rate,
              amount: it.amount,
            }));
            const { error: itemErr } = await supabase.from('collection_weight_items').insert(weightItems);
            if (itemErr) {
              console.warn('[API] Warning inserting collection items:', itemErr);
            }
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

        const { data, error } = await supabase
          .from('collections')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          if (items && items.length > 0) {
            await supabase.from('collection_weight_items').delete().eq('collection_id', id);
            const weightItems = items.map(it => ({
              collection_id: id,
              category_id: it.category_id,
              weight: it.weight,
              rate: it.rate,
              amount: it.amount,
            }));
            await supabase.from('collection_weight_items').insert(weightItems);
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

      return {
        customer: cust,
        dailyWeights,
        totalWeight: Number(totalWeight.toFixed(2)),
        collectionDaysCount,
        totalAmount: Number(totalAmount.toFixed(2)),
      };
    });

    const dailyTotals: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const sum = rows.reduce((acc, r) => acc + (r.dailyWeights[day] || 0), 0);
      dailyTotals.push(Number(sum.toFixed(2)));
    }

    const grandTotalWeight = rows.reduce((acc, r) => acc + r.totalWeight, 0);
    const grandTotalAmount = rows.reduce((acc, r) => acc + r.totalAmount, 0);

    return {
      rows,
      daysInMonth,
      dailyTotals,
      grandTotalWeight: Number(grandTotalWeight.toFixed(2)),
      grandTotalAmount: Number(grandTotalAmount.toFixed(2)),
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
};
