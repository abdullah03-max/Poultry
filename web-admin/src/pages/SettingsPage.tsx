// =============================================================================
// SHAN POULTRY PROTEIN - Business Settings & Category Configuration Page
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
    return <div className="p-8 text-center text-slate-400">Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6 max-w-5xl">
      {/* Top Header & Save Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Business Configuration</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure company branding, weight category terminology, billing formulas, and register display rules.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
        >
          {saving ? <Check className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Business Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Building className="w-4 h-4 text-emerald-400" /> Company Profile
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={settings.business_name}
              onChange={e => setSettings({ ...settings, business_name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Official Phone
            </label>
            <input
              type="text"
              value={settings.business_phone || ''}
              onChange={e => setSettings({ ...settings, business_phone: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Official Email
            </label>
            <input
              type="email"
              value={settings.business_email || ''}
              onChange={e => setSettings({ ...settings, business_email: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Business Address / Plant Location
            </label>
            <input
              type="text"
              value={settings.business_address || ''}
              onChange={e => setSettings({ ...settings, business_address: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Weight Categories Configurator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" /> Configurable Weight Categories
          </h3>
          <span className="text-xs text-slate-400 font-semibold">[NEEDS BUSINESS CONFIRMATION Terminology]</span>
        </div>

        <p className="text-xs text-slate-400">
          Rename category display names, adjust Urdu terminology, and modify default rates. Any changes reflect immediately in the mobile entry screen and register without schema changes.
        </p>

        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/60 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Category Code
                </label>
                <input
                  type="text"
                  disabled
                  value={cat.code}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  English Label
                </label>
                <input
                  type="text"
                  value={cat.name}
                  onChange={e => handleCategoryFieldChange(cat.id, 'name', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Urdu Label (اردو)
                </label>
                <input
                  type="text"
                  value={cat.urdu_name || ''}
                  onChange={e => handleCategoryFieldChange(cat.id, 'urdu_name', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-urdu focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Default Rate (PKR / KG)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={cat.default_rate}
                  onChange={e => handleCategoryFieldChange(cat.id, 'default_rate', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Register & System Rules */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Shield className="w-4 h-4 text-emerald-400" /> Operational & Register Rules
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Monthly Register Empty Day Symbol
            </label>
            <input
              type="text"
              maxLength={3}
              value={settings.monthly_register_empty_symbol}
              onChange={e => setSettings({ ...settings, monthly_register_empty_symbol: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono font-bold text-center text-white focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Default is "X" (no collection on that day)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Worker Edit Timeout (Hours)
            </label>
            <input
              type="number"
              min="0"
              max="48"
              value={settings.allow_worker_edit_hours}
              onChange={e => setSettings({ ...settings, allow_worker_edit_hours: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Hours before record locks for field workers</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              System Timezone
            </label>
            <input
              type="text"
              disabled
              value={settings.timezone}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-slate-400"
            />
            <p className="text-[10px] text-slate-500 mt-1">Fixed to Asia/Karachi (PKT)</p>
          </div>
        </div>
      </div>
    </form>
  );
};
