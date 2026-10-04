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
  id: 'b0000000-0000-0000-0000-000000000001',
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

    // 1. If Supabase is configured, check admin credentials directly from Supabase profiles
    if (isSupabaseConfigured()) {
      try {
        const { data: adminProf, error: adminErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();

        if (!adminErr && adminProf) {
          const registeredEmail = (adminProf.email || '').toLowerCase().trim();
          const registeredPassword = adminProf.password;

          if (registeredEmail === trimmedEmail && registeredPassword === pass) {
            const activeProfile: Profile = {
              id: adminProf.id,
              full_name: adminProf.full_name || 'Haji Shan (Owner)',
              phone: adminProf.phone || null,
              role: 'admin',
              is_active: true,
              email: adminProf.email,
              avatar_url: adminProf.avatar_url || null,
              created_at: adminProf.created_at,
              updated_at: adminProf.updated_at,
            };
            const activeU = { email: adminProf.email, id: adminProf.id };
            setUser(activeU);
            setProfile(activeProfile);
            localStorage.setItem('spp_auth_user', JSON.stringify(activeU));
            localStorage.setItem('spp_auth_profile', JSON.stringify(activeProfile));
            return { success: true };
          } else {
            return {
              success: false,
              error: 'Invalid admin credentials. Please enter the correct email and password.',
            };
          }
        }
      } catch (err) {
        console.warn('Supabase admin login query error:', err);
      }
    }

    // 2. Custom updated admin credentials check (local fallback if completely offline)
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
        // ignore
      }
    }

    return {
      success: false,
      error: 'Invalid credentials. Please verify your email and password.',
    };
  };

  const updateAdminCredentials = async (newEmail: string, newPass: string) => {
    try {
      const cleanEmail = newEmail.trim().toLowerCase();

      // 1. Update in Supabase profiles (role = 'admin')
      if (isSupabaseConfigured()) {
        try {
          const { error: profErr } = await supabase
            .from('profiles')
            .upsert({
              id: defaultAdminProfile.id,
              full_name: profile?.full_name || 'Haji Shan (Owner)',
              role: 'admin',
              is_active: true,
              email: cleanEmail,
              password: newPass,
              updated_at: new Date().toISOString(),
            });

          if (profErr) {
            console.warn('[Auth] Could not update admin profile in Supabase:', profErr);
          } else {
            console.log('[Auth] Admin credentials updated in Supabase profiles!');
          }
        } catch (e) {
          console.warn('[Auth] Error updating Supabase admin:', e);
        }
      }

      // 2. Save locally for session persistence
      const customCreds = { email: cleanEmail, password: newPass };
      localStorage.setItem('spp_admin_custom_creds', JSON.stringify(customCreds));

      const updatedUser = { ...(user || {}), email: cleanEmail };
      const updatedProfile = { ...(profile || defaultAdminProfile), email: cleanEmail };
      setUser(updatedUser);
      setProfile(updatedProfile);
      localStorage.setItem('spp_auth_user', JSON.stringify(updatedUser));
      localStorage.setItem('spp_auth_profile', JSON.stringify(updatedProfile));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update credentials' };
    }
  };

  const loginAsDemo = (_roleToSet: UserRole) => {
    // Disabled demo bypass - strict credential verification
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
