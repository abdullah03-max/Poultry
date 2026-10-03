// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Authentication Context
// =============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseLive } from '../services/supabase';
import { Profile } from '../types';

interface AuthContextType {
  worker: Profile | null;
  loading: boolean;
  login: (phoneOrEmail: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const WORKER_SESSION_KEY = '@shan_poultry_worker_session';

const defaultWorkerProfile: Profile = {
  id: 'w0000000-0000-0000-0000-000000000001',
  full_name: 'Rashid Khan (Collector)',
  phone: '+92 300 0000002',
  role: 'worker',
  is_active: true,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [worker, setWorker] = useState<Profile | null>(defaultWorkerProfile);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadCachedSession();
  }, []);

  const loadCachedSession = async () => {
    try {
      const cached = await AsyncStorage.getItem(WORKER_SESSION_KEY);
      if (cached) {
        setWorker(JSON.parse(cached));
      } else {
        setWorker(defaultWorkerProfile); // Default active for immediate offline field use
      }
    } catch {
      setWorker(defaultWorkerProfile);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phoneOrEmail: string, pass: string) => {
    if (!isSupabaseLive()) {
      // Offline / Demo field login
      const dummyProfile: Profile = {
        ...defaultWorkerProfile,
        full_name: phoneOrEmail.includes('aslam') ? 'Aslam Pervez (Collector)' : 'Rashid Khan (Collector)',
      };
      setWorker(dummyProfile);
      await AsyncStorage.setItem(WORKER_SESSION_KEY, JSON.stringify(dummyProfile));
      return { success: true };
    }

    try {
      const email = phoneOrEmail.includes('@') ? phoneOrEmail : `${phoneOrEmail.replace(/\D/g, '')}@shanpoultryprotein.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) return { success: false, error: error.message };

      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const activeProfile: Profile = profileData || {
          id: data.user.id,
          full_name: 'Field Collector',
          phone: null,
          role: 'worker',
          is_active: true,
        };

        setWorker(activeProfile);
        await AsyncStorage.setItem(WORKER_SESSION_KEY, JSON.stringify(activeProfile));
        return { success: true };
      }

      return { success: false, error: 'Login failed.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    if (isSupabaseLive()) {
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem(WORKER_SESSION_KEY);
    setWorker(null);
  };

  return (
    <AuthContext.Provider value={{ worker, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
