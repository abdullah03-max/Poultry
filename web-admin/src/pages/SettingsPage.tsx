// =============================================================================
// SHAN POULTRY PROTEIN - Business Settings & Category Configuration Page
// Daylight B2B Clean Palette Edition
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BusinessSettings } from '../types/database';
import { Settings, Save, Check, Building, Shield, Lock, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateAdminCredentials } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Admin Credentials State
  const [adminEmail, setAdminEmail] = useState<string>(user?.email || 'admin@shanpoultryprotein.com');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [credLoading, setCredLoading] = useState<boolean>(false);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);
  const [credError, setCredError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: any }) => {
          if (data?.email) {
            setAdminEmail(data.email);
          }
        });
    } else if (user?.email) {
      setAdminEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    api.getSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      await api.updateSettings(settings);

      setSuccessMsg('Business settings and security configuration saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);

    if (!adminEmail.trim()) {
      setCredError('Admin email cannot be empty.');
      return;
    }
    if (adminPassword.length < 6) {
      setCredError('New password must be at least 6 characters long.');
      return;
    }
    if (adminPassword !== confirmPassword) {
      setCredError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setCredLoading(true);
      const res = await updateAdminCredentials(adminEmail.trim(), adminPassword);
      if (res.success) {
        setCredSuccess('Admin login credentials updated successfully! Use your new credentials for future logins.');
        setAdminPassword('');
        setConfirmPassword('');
        setTimeout(() => setCredSuccess(null), 5000);
      } else {
        setCredError(res.error || 'Failed to update credentials.');
      }
    } catch (err: any) {
      setCredError(err.message || 'An unexpected error occurred.');
    } finally {
      setCredLoading(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium">Loading configuration...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6 max-w-5xl">
      {/* Top Header & Save Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Business Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure company branding, weight category terminology, billing formulas, and register display rules.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition shrink-0"
        >
          {saving ? <Check className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Business Profile Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building className="w-4 h-4 text-blue-600" /> Company Profile
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={settings.business_name}
              onChange={e => setSettings({ ...settings, business_name: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Urdu Business Name (کاروبار کا اردو نام)
            </label>
            <input
              type="text"
              value={settings.business_name_urdu || 'شان پولٹری پروٹین'}
              onChange={e => setSettings({ ...settings, business_name_urdu: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Official Phone
            </label>
            <input
              type="text"
              value={settings.business_phone || ''}
              onChange={e => setSettings({ ...settings, business_phone: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Official Email
            </label>
            <input
              type="email"
              value={settings.business_email || ''}
              onChange={e => setSettings({ ...settings, business_email: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Business Address / Plant Location
            </label>
            <input
              type="text"
              value={settings.business_address || ''}
              onChange={e => setSettings({ ...settings, business_address: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Section Lock System */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" /> Section Lock System (سیکشن لاک سسٹم)
          </h3>
          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
            Admin PIN Protection
          </span>
        </div>

        <p className="text-xs text-slate-500">
          انفرادی سیکشنز کو لاک کر کے محفوظ بنائیں۔ جب بھی کوئی صارف لاک شدہ سیکشن کھولے گا تو ایڈمن پن (PIN) کوڈ درج کرنا لازمی ہو گا۔
        </p>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-sm space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            سیکشن ان لاک پن کوڈ (Section Security PIN) *
          </label>
          <input
            type="password"
            maxLength={8}
            placeholder="e.g. 1234"
            value={settings.section_lock_pin || '1234'}
            onChange={e => setSettings({ ...settings, section_lock_pin: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:border-amber-500"
          />
          <p className="text-[10px] text-slate-400">لاک شدہ سیکشن کھولنے کے لیے یہ 4 ہندسوں والا پن استعمال ہو گا (Default: 1234)</p>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            لاک کرنے کے لیے سیکشنز منتخب کریں (Select Sections to Lock):
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'factories', name: 'Factories (فیکٹریاں و سپلائی ریکارڈ)', desc: 'Factory ledgers, sales & rates' },
              { id: 'expenses', name: 'Expenses (اخراجات و کیش)', desc: 'Staff wages, fuel, maintenance' },
              { id: 'reports', name: 'Reports & P&L (رپورٹس و منافع)', desc: 'Financial profit & loss analytics' },
              { id: 'monthly-register', name: 'Monthly Register (ماہانہ رجسٹر)', desc: 'Monthly customer statements' },
              { id: 'customers', name: 'Customers (کسٹمرز ڈائریکٹری)', desc: 'Shop directory & agreed rates' },
              { id: 'workers', name: 'Workers (ملازمین و کلیکٹرز)', desc: 'Collector staff & credentials' },
            ].map(sec => {
              const isLocked = (settings.locked_sections || []).includes(sec.id);
              return (
                <div
                  key={sec.id}
                  onClick={() => {
                    const currentLocked = settings.locked_sections || [];
                    const nextLocked = isLocked
                      ? currentLocked.filter(k => k !== sec.id)
                      : [...currentLocked, sec.id];
                    setSettings({ ...settings, locked_sections: nextLocked });
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    isLocked
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isLocked}
                    onChange={() => {}} // handled by parent div
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate">{sec.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{sec.desc}</span>
                    <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      isLocked ? 'bg-amber-200/70 text-amber-900' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isLocked ? '🔒 لاک ہے (Locked)' : '🔓 کھلا ہے (Unlocked)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Register & System Rules */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="w-4 h-4 text-blue-600" /> Operational & Register Rules
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Monthly Register Empty Day Symbol
            </label>
            <input
              type="text"
              maxLength={3}
              value={settings.monthly_register_empty_symbol}
              onChange={e => setSettings({ ...settings, monthly_register_empty_symbol: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono font-bold text-center text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Default is "X" (no collection on that day)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Worker Edit Timeout (Hours)
            </label>
            <input
              type="number"
              min="0"
              max="48"
              value={settings.allow_worker_edit_hours}
              onChange={e => setSettings({ ...settings, allow_worker_edit_hours: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Hours before record locks for field workers</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              System Timezone
            </label>
            <input
              type="text"
              disabled
              value={settings.timezone}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono text-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Fixed to Asia/Karachi (PKT)</p>
          </div>
        </div>
      </div>

      {/* 4. Administrator Login & Security Credentials */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" /> Admin Security & Login Credentials
          </h3>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Admin Only
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Update your administrator email and password used to access this Web Admin dashboard. Keep these credentials confidential.
        </p>

        {credSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{credSuccess}</span>
          </div>
        )}

        {credError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{credError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Admin Email / Username
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="admin@shanpoultryprotein.com"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showAdminPass ? 'text' : 'password'}
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 pr-10 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowAdminPass(!showAdminPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input
              type={showAdminPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row justify-end">
          <button
            type="button"
            onClick={handleUpdateAdminCredentials}
            disabled={credLoading}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
          >
            {credLoading ? <Check className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            <span>{credLoading ? 'Updating Credentials...' : 'Update Admin Credentials'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
