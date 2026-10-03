// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Worker Types
// =============================================================================

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'admin' | 'worker' | 'manager';
  is_active: boolean;
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
  status: 'active' | 'inactive';
  notes: string | null;
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
}

export interface CollectionItemInput {
  category_id: string;
  category_name: string;
  weight: number;
  rate: number;
  amount: number;
}

export interface NewCollectionPayload {
  client_uuid: string; // Idempotency key
  customer_id: string;
  worker_id?: string | null;
  collection_date: string;
  collection_time: string;
  gross_weight: number;
  tare_weight: number;
  total_net_weight: number;
  rate_per_kg: number;
  total_amount: number;
  notes?: string | null;
  signature_base64?: string | null;
  attachment_uri?: string | null;
  items: CollectionItemInput[];
}

export interface OfflineQueueItem {
  id: string; // client_uuid
  payload: NewCollectionPayload;
  customer_name: string;
  customer_code: string;
  created_at: string;
  retry_count: number;
  last_error?: string;
}

export interface MobileCollection {
  id: string;
  receipt_no: string;
  client_uuid: string;
  customer_id: string;
  worker_id: string;
  collection_date: string;
  collection_time: string;
  gross_weight: number;
  tare_weight: number;
  total_net_weight: number;
  rate_per_kg: number;
  total_amount: number;
  status: string;
  customer?: Customer;
}
