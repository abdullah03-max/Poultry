import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  TableProperties,
  Scale,
  Users,
  HardHat,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'collections'
  | 'daily-records'
  | 'monthly-register'
  | 'customers'
  | 'workers'
  | 'reports'
  | 'settings'
  | 'audit-logs';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { role, logout, switchMockRole } = useAuth();

  const navItems: { id: NavigationTab; label: string; urdu: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', urdu: 'ڈیش بورڈ', icon: LayoutDashboard },
    { id: 'monthly-register', label: 'Monthly Register', urdu: 'ماہانہ رجسٹر', icon: TableProperties },
    { id: 'daily-records', label: 'Daily Record', urdu: 'روزانہ ریکارڈ', icon: CalendarCheck },
    { id: 'collections', label: 'All Collections', urdu: 'کلیکشن ریکارڈز', icon: Scale },
    { id: 'customers', label: 'Customers', urdu: 'گاہک / دکانیں', icon: Users },
    { id: 'workers', label: 'Field Workers', urdu: 'ورکرز', icon: HardHat, adminOnly: true },
    { id: 'reports', label: 'Reports & Export', urdu: 'رپورٹس', icon: FileSpreadsheet, adminOnly: true },
    { id: 'settings', label: 'Business Settings', urdu: 'ترتیبات', icon: Settings, adminOnly: true },
    { id: 'audit-logs', label: 'Audit Trail', urdu: 'آڈٹ لاگ', icon: ShieldAlert, adminOnly: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 no-print">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-xl">
          SP
        </div>
        <div>
          <h1 className="font-extrabold text-sm tracking-wide text-white">SHAN POULTRY</h1>
          <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">PROTEIN</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                <span>{item.label}</span>
              </div>
              <span className={`text-[10px] font-urdu opacity-70 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                {item.urdu}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Role Switcher (for immediate testing & previewing Worker vs Admin view) */}
      <div className="px-4 py-3 mx-4 mb-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
          <span className="flex items-center gap-1 font-semibold text-slate-300">
            <Sparkles className="w-3 h-3 text-amber-400" /> Active Role
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase text-[9px]">
            {role}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => switchMockRole('admin')}
            className={`py-1 text-xs rounded font-medium transition ${
              role === 'admin' ? 'bg-emerald-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => switchMockRole('worker')}
            className={`py-1 text-xs rounded font-medium transition ${
              role === 'worker' ? 'bg-emerald-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            Worker
          </button>
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-emerald-700/40 text-emerald-300 flex items-center justify-center font-bold text-xs">
            HS
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">Haji Shan</p>
            <p className="text-[10px] text-slate-400 truncate">Sahiwal / Gaggoo</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
