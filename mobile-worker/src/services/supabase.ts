// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Supabase Client with AsyncStorage
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In production, loaded via app.json extra or EXPO_PUBLIC_ environment variables
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo-shan-poultry.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo-placeholder';

export const isSupabaseLive = (): boolean => {
  return (
    !SUPABASE_URL.includes('demo-shan-poultry') &&
    !SUPABASE_ANON_KEY.includes('demo-placeholder')
  );
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
