// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Offline Queue & Idempotent Sync Manager
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineQueueItem, NewCollectionPayload } from '../types';
import { supabase, isSupabaseLive } from './supabase';

const QUEUE_STORAGE_KEY = '@shan_poultry_offline_queue';

export const offlineQueue = {
  async getQueue(): Promise<OfflineQueueItem[]> {
    try {
      const json = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!json) return [];
      return JSON.parse(json);
    } catch {
      return [];
    }
  },

  async enqueue(payload: NewCollectionPayload, customerName: string, customerCode: string): Promise<OfflineQueueItem> {
    const queue = await this.getQueue();
    const item: OfflineQueueItem = {
      id: payload.client_uuid,
      payload,
      customer_name: customerName,
      customer_code: customerCode,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    queue.push(item);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    return item;
  },

  async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const updated = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
  },

  async syncItem(item: OfflineQueueItem): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseLive()) {
      // In offline/demo mode, treat as synced after simulating network delay
      await new Promise(r => setTimeout(r, 600));
      await this.removeFromQueue(item.id);
      return { success: true };
    }

    try {
      let signatureUrl: string | null = null;

      // 1. Upload signature if available
      if (item.payload.signature_base64) {
        const filePath = `${item.id}/signature_${Date.now()}.png`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('signatures')
          .upload(filePath, decodeBase64(item.payload.signature_base64), {
            contentType: 'image/png',
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          signatureUrl = filePath;
        }
      }

      // 2. Insert Collection with Idempotency Key (client_uuid)
      const { data: colData, error: colErr } = await supabase
        .from('collections')
        .insert([
          {
            client_uuid: item.payload.client_uuid,
            customer_id: item.payload.customer_id,
            worker_id: item.payload.worker_id,
            collection_date: item.payload.collection_date,
            collection_time: item.payload.collection_time,
            gross_weight: item.payload.gross_weight,
            tare_weight: item.payload.tare_weight,
            total_net_weight: item.payload.total_net_weight,
            rate_per_kg: item.payload.rate_per_kg,
            total_amount: item.payload.total_amount,
            notes: item.payload.notes,
            signature_url: signatureUrl,
            status: 'submitted',
          },
        ])
        .select()
        .single();

      if (colErr) {
        // If unique constraint violation on client_uuid, it was already submitted!
        if (colErr.code === '23505') {
          console.warn('Record already exists in Supabase. Removing duplicate from offline queue.');
          await this.removeFromQueue(item.id);
          return { success: true };
        }
        throw colErr;
      }

      // 3. Insert Category Weight Items
      if (item.payload.items && item.payload.items.length > 0) {
        const lineItems = item.payload.items.map(it => ({
          collection_id: colData.id,
          category_id: it.category_id,
          weight: it.weight,
          rate: it.rate,
          amount: it.amount,
        }));

        await supabase.from('collection_weight_items').insert(lineItems);
      }

      // 4. Remove from queue upon complete success
      await this.removeFromQueue(item.id);
      return { success: true };
    } catch (err: any) {
      console.error('Failed to sync queue item:', err);
      // Update retry count
      const queue = await this.getQueue();
      const idx = queue.findIndex(q => q.id === item.id);
      if (idx !== -1) {
        queue[idx].retry_count += 1;
        queue[idx].last_error = err.message || 'Network sync failed';
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      }
      return { success: false, error: err.message };
    }
  },

  async syncAll(): Promise<{ synced: number; failed: number }> {
    const queue = await this.getQueue();
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      const res = await this.syncItem(item);
      if (res.success) {
        synced++;
      } else {
        failed++;
      }
    }

    return { synced, failed };
  },
};

// Helper to decode Base64 string to Uint8Array for binary upload
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64.replace(/^data:image\/\w+;base64,/, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
