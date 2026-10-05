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
  // Offline Slips
  getOfflineSlips(): OfflineCollectionItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_OFFLINE_SLIPS);
      if (!data) return [];
      const list: OfflineCollectionItem[] = JSON.parse(data);
      // Clean out any old legacy mock slips that don't belong to a real worker
      const cleaned = list.filter(
        s => s.worker_id && s.worker_id.length > 20 && s.receipt_no !== 'SPP-202610-9732' && s.receipt_no !== 'SPP-202610-8222'
      );
      if (cleaned.length !== list.length) {
        localStorage.setItem(STORAGE_KEY_OFFLINE_SLIPS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveOfflineSlip(slip: OfflineCollectionItem): void {
    const list = this.getOfflineSlips();
    list.unshift(slip);
    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_SLIPS, JSON.stringify(list));
    } catch (quotaErr) {
      console.warn('[mobileStorage] localStorage quota exceeded, pruning old photos and synced slips...', quotaErr);
      try {
        // Step 1: Strip heavy photo from older synced slips
        const trimmed = list.map((item, idx) => {
          if (idx > 0 && item.status === 'synced') {
            return { ...item, photo_base64: null };
          }
          return item;
        });
        localStorage.setItem(STORAGE_KEY_OFFLINE_SLIPS, JSON.stringify(trimmed));
      } catch {
        try {
          // Step 2: Keep only 15 slips without synced photos
          const minimal = list.slice(0, 15).map(item => item.status === 'synced' ? { ...item, photo_base64: null } : item);
          localStorage.setItem(STORAGE_KEY_OFFLINE_SLIPS, JSON.stringify(minimal));
        } catch {
          // Step 3: Keep only pending slips
          const pendingOnly = list.filter(item => item.status === 'pending_sync');
          localStorage.setItem(STORAGE_KEY_OFFLINE_SLIPS, JSON.stringify(pendingOnly));
        }
      }
    }
  },

  updateOfflineSlipStatus(client_uuid: string, status: 'synced'): void {
    const list = this.getOfflineSlips();
    const updated = list.map(item => item.client_uuid === client_uuid ? { ...item, status, photo_base64: null } : item);
    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_SLIPS, JSON.stringify(updated));
    } catch {}
  },

  updateOfflineSlip(updatedSlip: OfflineCollectionItem): void {
    const list = this.getOfflineSlips();
    const idx = list.findIndex(
      s => (s.client_uuid && s.client_uuid === updatedSlip.client_uuid) || (s.receipt_no && s.receipt_no === updatedSlip.receipt_no)
    );
    if (idx >= 0) {
      list[idx] = updatedSlip;
    } else {
      list.unshift(updatedSlip);
    }
    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_SLIPS, JSON.stringify(list));
    } catch {}
  },

  setAllOfflineSlips(slips: OfflineCollectionItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_SLIPS, JSON.stringify(slips));
    } catch {}
  },

  getPendingSyncCount(): number {
    return this.getOfflineSlips().filter(s => s.status === 'pending_sync').length;
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

  // Sync Engine: upload pending slips to Supabase
  async syncAllPending(onProgress?: (current: number, total: number) => void): Promise<{ success: number; failed: number }> {
    const slips = this.getOfflineSlips().filter(s => s.status === 'pending_sync');
    if (slips.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    for (let i = 0; i < slips.length; i++) {
      const slip = slips[i];
      try {
        // 1. Insert collection record
        const { data: colData, error: colError } = await supabase
          .from('collections')
          .insert({
            client_uuid: slip.client_uuid,
            receipt_no: slip.receipt_no,
            customer_id: slip.customer_id,
            worker_id: slip.worker_id,
            collection_date: slip.collection_date,
            collection_time: slip.collection_time,
            collection_timestamp: `${slip.collection_date}T${slip.collection_time}`,
            gross_weight: slip.gross_weight,
            tare_weight: slip.tare_weight,
            total_net_weight: slip.total_net_weight,
            rate_per_kg: slip.rate_per_kg,
            total_amount: slip.total_amount,
            notes: slip.notes,
            signature_url: slip.signature_base64 || null,
            charbi_gross: slip.charbi_gross ?? 0,
            charbi_tare: slip.charbi_tare ?? 0,
            charbi_net: slip.charbi_net ?? 0,
            charbi_rate: slip.charbi_rate ?? 55,
            charbi_total: slip.charbi_total ?? 0,
            kachara_gross: slip.kachara_gross ?? 0,
            kachara_tare: slip.kachara_tare ?? 0,
            kachara_net: slip.kachara_net ?? 0,
            kachara_rate: slip.kachara_rate ?? 45,
            kachara_total: slip.kachara_total ?? 0,
            status: 'submitted',
          })
          .select()
          .single();

        if (colError && !colError.message.includes('unique constraint') && !colError.message.includes('duplicate key')) {
          throw colError;
        }

        const collectionId = colData?.id;

        // 2. Insert items if collection ID exists
        if (collectionId && slip.items && slip.items.length > 0) {
          const itemPayload = slip.items
            .filter(item => item.category_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.category_id))
            .map(item => ({
              collection_id: collectionId,
              category_id: item.category_id,
              weight: item.weight,
              rate: item.rate,
              amount: item.amount,
            }));
          if (itemPayload.length > 0) {
            await supabase.from('collection_weight_items').insert(itemPayload);
          }
        }

        // 3. Insert scale photo attachment if present
        if (collectionId && slip.photo_base64) {
          await supabase.from('collection_attachments').insert({
            collection_id: collectionId,
            storage_bucket: 'collection-attachments',
            file_path: slip.photo_base64,
            file_name: `photo_${slip.receipt_no}.jpg`,
            file_type: 'image/jpeg',
            uploaded_by: slip.worker_id && slip.worker_id.length > 20 ? slip.worker_id : null,
          });
        }

        this.updateOfflineSlipStatus(slip.client_uuid, 'synced');
        success++;
      } catch (err) {
        console.error('Failed to sync slip:', slip.receipt_no, err);
        failed++;
      }

      if (onProgress) {
        onProgress(i + 1, slips.length);
      }
    }

    return { success, failed };
  }
};
