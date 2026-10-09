// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Offline Storage & Sync Engine
// =============================================================================

import { supabase } from '../lib/supabase';
import { Collection, Customer, WeightCategory } from '../types/database';

export interface OfflineCollectionItem {
  client_uuid: string;
  receipt_no: string;
  customer_id: string;
  customer_name: string;
  customer_area: string;
  customer_phone?: string;
  worker_id: string | null;
  worker_name: string;
  collection_date: string;
  collection_time: string;
  gross_weight: number;
  tare_weight: number;
  total_net_weight: number;
  rate_per_kg: number;
  total_amount: number;
  notes: string | null;
  signature_base64: string | null;
  photo_base64: string | null;
  items: Array<{
    category_id: string;
    category_name: string;
    category_code?: string;
    gross_weight?: number;
    tare_weight?: number;
    weight: number;
    rate: number;
    amount: number;
  }>;
  // Dedicated Charbi & Kachara Breakdown
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

  status: 'pending_sync' | 'synced';
  created_at: string;
}

const STORAGE_KEY_OFFLINE_SLIPS = 'shan_poultry_offline_slips';
const STORAGE_KEY_CUSTOMERS_CACHE = 'shan_poultry_customers_cache';
const STORAGE_KEY_CATEGORIES_CACHE = 'shan_poultry_categories_cache';
const STORAGE_KEY_LOGGED_WORKER = 'shan_poultry_logged_worker';

export const mobileStorage = {
  // Offline Slips (Cleared out - Real-Time Supabase only)
  getOfflineSlips(): OfflineCollectionItem[] {
    try {
      localStorage.removeItem(STORAGE_KEY_OFFLINE_SLIPS);
    } catch {}
    return [];
  },

  saveOfflineSlip(_slip: OfflineCollectionItem): void {
    try {
      localStorage.removeItem(STORAGE_KEY_OFFLINE_SLIPS);
    } catch {}
  },

  updateOfflineSlipStatus(_client_uuid: string, _status: 'synced'): void {
    try {
      localStorage.removeItem(STORAGE_KEY_OFFLINE_SLIPS);
    } catch {}
  },

  updateOfflineSlip(_updatedSlip: OfflineCollectionItem): void {
    try {
      localStorage.removeItem(STORAGE_KEY_OFFLINE_SLIPS);
    } catch {}
  },

  setAllOfflineSlips(_slips: OfflineCollectionItem[]): void {
    try {
      localStorage.removeItem(STORAGE_KEY_OFFLINE_SLIPS);
    } catch {}
  },

  getPendingSyncCount(): number {
    return 0;
  },

  // Customers Cache
  getCachedCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CUSTOMERS_CACHE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setCachedCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEY_CUSTOMERS_CACHE, JSON.stringify(customers));
  },

  // Categories Cache
  getCachedCategories(): WeightCategory[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CATEGORIES_CACHE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setCachedCategories(categories: WeightCategory[]): void {
    localStorage.setItem(STORAGE_KEY_CATEGORIES_CACHE, JSON.stringify(categories));
  },

  // Worker Session
  getLoggedWorker(): any {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LOGGED_WORKER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setLoggedWorker(worker: any): void {
    localStorage.setItem(STORAGE_KEY_LOGGED_WORKER, JSON.stringify(worker));
  },

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY_LOGGED_WORKER);
  },

  // Registered Workers & Assigned Credentials Management
  getRegisteredWorkers(): any[] {
    const KEY = 'spp_registered_workers_auth';
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    const defaultWorkers = [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        full_name: 'Rashid Khan (Worker)',
        email: 'rashid@shanpoultry.com',
        phone: '+92 300 0000002',
        password: 'worker123',
        is_active: true,
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        full_name: 'Tariq Mahmood (Field Collector)',
        email: 'tariq@shanpoultry.com',
        phone: '+92 301 5556677',
        password: 'worker123',
        is_active: true,
      },
    ];
    localStorage.setItem(KEY, JSON.stringify(defaultWorkers));
    return defaultWorkers;
  },

  saveRegisteredWorker(worker: any): void {
    const KEY = 'spp_registered_workers_auth';
    const list = this.getRegisteredWorkers();
    const existingIdx = list.findIndex(w => w.id === worker.id || (worker.email && w.email?.toLowerCase() === worker.email.toLowerCase()));
    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...worker };
    } else {
      list.push(worker);
    }
    localStorage.setItem(KEY, JSON.stringify(list));
  },

  verifyWorkerCredentials(identifier: string, pass: string): { success: boolean; worker?: any; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const list = this.getRegisteredWorkers();
    const found = list.find(w =>
      (w.email && w.email.toLowerCase() === cleanId) ||
      (w.phone && w.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')) ||
      (w.full_name && w.full_name.toLowerCase() === cleanId)
    );

    if (!found) {
      return {
        success: false,
        error: 'No worker account found matching this email or phone. Contact Admin Haji Shan to assign your login credentials.',
      };
    }

    if (!found.is_active) {
      return {
        success: false,
        error: 'This worker account has been deactivated by Admin. Contact Haji Shan to reactivate.',
      };
    }

    if (found.password && found.password !== pass) {
      return {
        success: false,
        error: 'Incorrect password. Contact Admin Haji Shan if you forgot your assigned password.',
      };
    }

    return {
      success: true,
      worker: {
        id: found.id,
        full_name: found.full_name,
        email: found.email,
        phone: found.phone,
        role: 'worker',
        is_active: true,
      },
    };
  },

  // Sync Engine (Retired - Real-time Supabase direct only)
  async syncAllPending(): Promise<{ success: number; failed: number }> {
    try {
      localStorage.removeItem(STORAGE_KEY_OFFLINE_SLIPS);
    } catch {}
    return { success: 0, failed: 0 };
  }
};
