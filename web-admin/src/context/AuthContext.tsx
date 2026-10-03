// =============================================================================
// SHAN POULTRY PROTEIN - Authentication & Authorization Context
// =============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  role: UserRole;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchMockRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial default owner profile for immediate testing
const defaultAdminProfile: Profile = {
  id: 'a0000000-0000-0000-0000-000000000001',
  full_name: 'Haji Shan (Owner)',
  phone: '+92 300 0000001',
  role: 'admin',
  is_active: true,
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>({ email: 'admin@shanpoultryprotein.com' });
  const [profile, setProfile] = useState<Profile | null>(defaultAdminProfile);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Check active Supabase Auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setProfile(data as Profile);
      } else {
        // Fallback default
        setProfile({
          id: userId,
          full_name: 'Administrator',
          phone: null,
          role: 'admin',
          is_active: true,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    if (!isSupabaseConfigured()) {
      // Demo authentication simulation
      setUser({ email });
      setProfile({
        ...defaultAdminProfile,
        full_name: email.toLowerCase().includes('worker') ? 'Rashid Khan (Worker)' : 'Haji Shan (Owner)',
        role: email.toLowerCase().includes('worker') ? 'worker' : 'admin',
      });
      return { success: true };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const switchMockRole = (role: UserRole) => {
    if (profile) {
      setProfile({
        ...profile,
        role,
        full_name: role === 'admin' ? 'Haji Shan (Owner)' : 'Rashid Khan (Worker)',
      });
    }
  };

  const role = profile?.role ?? 'admin';
  const isAdmin = role === 'admin' || role === 'manager';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        loading,
        login,
        logout,
        switchMockRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
