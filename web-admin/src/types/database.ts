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
  category_rates: Record<string, number>;
  status: 'active' | 'inactive';
  notes: string | null;
  is_deleted: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
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
  
  // Joined relation fields
  customer?: Customer;
  worker?: Profile;
  items?: CollectionWeightItem[];
  attachments?: CollectionAttachment[];
}

export interface BusinessSettings {
  id: string;
  business_name: string;
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
}
