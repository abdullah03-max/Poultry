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
  X,
  Smartphone,
  ExternalLink,
  Download,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import appIcon from '../../assets/app_icon.png';

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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { logout, profile } = useAuth();
  const { isInstalled, triggerInstall } = usePWAInstall();

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

  const handleTabClick = (tabId: NavigationTab) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Responsive Sidebar Drawer */}
      <aside
        className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50 no-print select-none transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={appIcon}
              alt="Shan Poultry"
              className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-lg shadow-brand-600/30 border border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-sm tracking-wide text-white truncate">SHAN POULTRY</h1>
              <p className="text-[10px] uppercase font-bold text-poultry-gold tracking-widest truncate">Protein Management</p>
            </div>
          </div>

          {/* Close Button for Mobile Screens */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Admin Portal
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 group ${
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

          {/* Mobile Worker Quick Link */}
          <div className="pt-2">
            <a
              href="/mobile.html"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-300 hover:text-white hover:bg-blue-600/30 text-xs font-bold transition group"
            >
              <div className="flex items-center gap-2 truncate">
                <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">Worker Web Terminal</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          {/* Install Desktop App (PWA) */}
          <div className="pt-1.5">
            <button
              onClick={triggerInstall}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:text-white hover:bg-emerald-500/20 text-xs font-semibold transition group"
              title="Install as a standalone Windows Desktop Application"
            >
              <div className="flex items-center gap-2 truncate">
                <Download className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">{isInstalled ? 'Desktop App Installed' : 'Install Desktop App'}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                {isInstalled ? 'ACTIVE' : 'DESKTOP'}
              </span>
            </button>
          </div>
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
    </>
  );
};
