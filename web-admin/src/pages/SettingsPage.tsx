// =============================================================================
// SHAN POULTRY PROTEIN - Business Settings & Category Configuration Page
// Daylight B2B Clean Palette Edition
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BusinessSettings, WeightCategory } from '../types/database';
import { Settings, Save, Check, Scale, Building, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getSettings(), api.getWeightCategories()]).then(([s, c]) => {
      setSettings(s);
      setCategories(c);
      setLoading(false);
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      await api.updateSettings(settings);

      // Save updated categories
      for (const cat of categories) {
        await api.updateWeightCategory(cat);
      }

      setSuccessMsg('Business settings and weight categories saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryFieldChange = (id: string, field: keyof WeightCategory, val: any) => {
    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: val } : c))
    );
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
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

      {/* 2. Weight Categories Configurator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" /> Configurable Weight Categories
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold">Customizable Poultry Streams</span>
        </div>

        <p className="text-xs text-slate-500">
          Rename category display names, adjust Urdu terminology, and modify default rates. Any changes reflect immediately in the mobile entry screen and register without database schema changes.
        </p>

        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                  Category Code
                </label>
                <input
                  type="text"
                  disabled
                  value={cat.code}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                  English Label
                </label>
                <input
                  type="text"
                  value={cat.name}
                  onChange={e => handleCategoryFieldChange(cat.id, 'name', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                  Urdu Label (اردو)
                </label>
                <input
                  type="text"
                  value={cat.urdu_name || ''}
                  onChange={e => handleCategoryFieldChange(cat.id, 'urdu_name', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-urdu focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                  Default Rate (PKR / KG)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={cat.default_rate}
                  onChange={e => handleCategoryFieldChange(cat.id, 'default_rate', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-amber-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Register & System Rules */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
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
    </form>
  );
};
