import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  TableProperties,
  Scale,
  Users,
  UserCheck,
  FileSpreadsheet,
  Settings,
  LogOut,
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
  | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { logout, profile } = useAuth();

  const navItems: { id: NavigationTab; label: string; urdu: string; icon: any; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', urdu: 'ڈیش بورڈ', icon: LayoutDashboard },
    { id: 'monthly-register', label: 'Monthly Register', urdu: 'ماہانہ رجسٹر', icon: TableProperties },
    { id: 'daily-records', label: 'Daily Records', urdu: 'روزانہ ریکارڈ', icon: CalendarCheck },
    { id: 'collections', label: 'All Collections', urdu: 'کلیکشن ریکارڈز', icon: Scale },
    { id: 'customers', label: 'Customers', urdu: 'گاہک / دکانیں', icon: Users },
    { id: 'workers', label: 'Workers Management', urdu: 'ورکرز مینجمنٹ', icon: UserCheck, badge: 'Admin' },
    { id: 'reports', label: 'Reports & Export', urdu: 'رپورٹس', icon: FileSpreadsheet },
    { id: 'settings', label: 'System Settings', urdu: 'ترتیبات', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 no-print select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/30 text-white font-extrabold text-lg tracking-wider">
          SP
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm tracking-wide text-white truncate">SHAN POULTRY</h1>
          <p className="text-[10px] uppercase font-bold text-poultry-gold tracking-widest">Protein Management</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Admin Portal
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 group ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
                <span className={`text-[10px] font-urdu opacity-75 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {item.urdu}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer / Admin Profile */}
      <div className="p-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/30 text-brand-300 flex items-center justify-center font-bold text-xs shrink-0">
            {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'HS'}
          </div>
          <div className="truncate min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {profile?.full_name || 'Haji Shan'}
            </p>
            <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider truncate">
              Administrator (Owner)
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
