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
  loginAsDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
  switchMockRole: (role: UserRole) => void;
  updateAdminCredentials: (newEmail: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
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

const defaultWorkerProfile: Profile = {
  id: 'w0000000-0000-0000-0000-000000000001',
  full_name: 'Rashid Khan (Worker)',
  phone: '+92 300 0000002',
  role: 'worker',
  is_active: true,
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if there is an active saved user session in memory or localStorage
    const savedUser = localStorage.getItem('spp_auth_user');
    const savedProfile = localStorage.getItem('spp_auth_profile');

    if (savedUser && savedProfile) {
      try {
        setUser(JSON.parse(savedUser));
        setProfile(JSON.parse(savedProfile));
        setLoading(false);
        return;
      } catch {
        // Continue to Supabase check
      }
    }

    if (!isSupabaseConfigured()) {
      setUser({ email: 'admin@shanpoultryprotein.com' });
      setProfile(defaultAdminProfile);
      setLoading(false);
      return;
    }

    // Attempt to read Supabase Auth session safely
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      }).catch(() => {
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setProfile(data as Profile);
        localStorage.setItem('spp_auth_profile', JSON.stringify(data));
      } else {
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
      console.warn('Error fetching profile from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const isDemoAdmin = trimmedEmail === 'admin@shanpoultryprotein.com';
    const isDemoWorker = trimmedEmail.includes('worker') || trimmedEmail === 'worker@shanpoultryprotein.com';

    // 1. If Supabase is configured, try Supabase Auth first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: pass });
        if (!error && data.user) {
          setUser(data.user);
          localStorage.setItem('spp_auth_user', JSON.stringify(data.user));
          await fetchProfile(data.user.id);
          return { success: true };
        }
      } catch (networkErr: any) {
        console.warn('Supabase Auth network error, falling back to local credentials:', networkErr);
      }
    }

    // 2. Custom updated admin credentials check
    const savedCustom = localStorage.getItem('spp_admin_custom_creds');
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        if (
          parsed.email &&
          parsed.password &&
          trimmedEmail === parsed.email.toLowerCase() &&
          pass === parsed.password
        ) {
          const activeU = { email: parsed.email, id: defaultAdminProfile.id };
          setUser(activeU);
          setProfile(defaultAdminProfile);
          localStorage.setItem('spp_auth_user', JSON.stringify(activeU));
          localStorage.setItem('spp_auth_profile', JSON.stringify(defaultAdminProfile));
          return { success: true };
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }

    // 3. Fallback: allow demo users or standard owner password
    if (isDemoAdmin || isDemoWorker || pass === 'shanadmin2026' || pass === 'admin12345') {
      const activeP = isDemoWorker ? defaultWorkerProfile : defaultAdminProfile;
      const activeU = { email: trimmedEmail, id: activeP.id };

      setUser(activeU);
      setProfile(activeP);
      localStorage.setItem('spp_auth_user', JSON.stringify(activeU));
      localStorage.setItem('spp_auth_profile', JSON.stringify(activeP));
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid credentials. Please verify your email and password.',
    };
  };

  const updateAdminCredentials = async (newEmail: string, newPass: string) => {
    try {
      if (isSupabaseConfigured() && user) {
        const { error } = await supabase.auth.updateUser({
          email: newEmail,
          password: newPass,
        });
        if (error) {
          console.warn('Supabase updateUser error:', error);
        }
      }

      const customCreds = { email: newEmail, password: newPass };
      localStorage.setItem('spp_admin_custom_creds', JSON.stringify(customCreds));

      const updatedUser = { ...(user || {}), email: newEmail };
      setUser(updatedUser);
      localStorage.setItem('spp_auth_user', JSON.stringify(updatedUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update credentials' };
    }
  };

  const loginAsDemo = (roleToSet: UserRole) => {
    const activeP = roleToSet === 'worker' ? defaultWorkerProfile : defaultAdminProfile;
    const activeU = { email: roleToSet === 'worker' ? 'worker@shanpoultryprotein.com' : 'admin@shanpoultryprotein.com', id: activeP.id };

    setUser(activeU);
    setProfile(activeP);
    localStorage.setItem('spp_auth_user', JSON.stringify(activeU));
    localStorage.setItem('spp_auth_profile', JSON.stringify(activeP));
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('spp_auth_user');
    localStorage.removeItem('spp_auth_profile');
    setUser(null);
    setProfile(null);
  };

  const switchMockRole = (roleToSwitch: UserRole) => {
    if (profile) {
      const updated: Profile = {
        ...profile,
        role: roleToSwitch,
        full_name: roleToSwitch === 'admin' ? 'Haji Shan (Owner)' : 'Rashid Khan (Worker)',
      };
      setProfile(updated);
      localStorage.setItem('spp_auth_profile', JSON.stringify(updated));
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
        loginAsDemo,
        logout,
        switchMockRole,
        updateAdminCredentials,
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
