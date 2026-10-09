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
  Factory as FactoryIcon,
  Receipt as ReceiptIcon,
  Lock as LockIcon,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import appIcon from '../../assets/app_icon.png';

export type NavigationTab =
  | 'dashboard'
  | 'collections'
  | 'daily-records'
  | 'monthly-register'
  | 'factories'
  | 'expenses'
  | 'customers'
  | 'chicken-shop'
  | 'workers'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  lockedSections?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
  lockedSections = [],
}) => {
  const { logout, profile } = useAuth();
  const { isInstalled, triggerInstall } = usePWAInstall();

  const navItems: { id: NavigationTab; label: string; urdu: string; icon: any; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', urdu: 'ڈیش بورڈ', icon: LayoutDashboard },
    { id: 'monthly-register', label: 'Monthly Register', urdu: 'ماہانہ رجسٹر', icon: TableProperties },
    { id: 'factories', label: 'Factories (فیکٹریاں)', urdu: 'فیکٹریاں و سیلز', icon: FactoryIcon },
    { id: 'expenses', label: 'Expenses (اخراجات)', urdu: 'اخراجات و کیش', icon: ReceiptIcon },
    { id: 'daily-records', label: 'Daily Records', urdu: 'روزانہ ریکارڈ', icon: CalendarCheck },
    { id: 'collections', label: 'All Collections', urdu: 'کلیکشن ریکارڈز', icon: Scale },
    { id: 'customers', label: 'Customers', urdu: 'ویسٹ گاہک و دکانیں', icon: Users },
    { id: 'workers', label: 'Workers Management', urdu: 'ورکرز مینجمنٹ', icon: UserCheck, badge: 'Admin' },
    { id: 'reports', label: 'Reports & P&L', urdu: 'رپورٹس و منافع', icon: FileSpreadsheet },
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
        className={`w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-50 no-print select-none transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={appIcon}
              alt="Shan Poultry"
              className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-sm border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm tracking-wide text-slate-900 truncate">SHAN POULTRY</h1>
              <p className="text-[10px] uppercase font-bold text-amber-700 tracking-widest truncate">Protein Management</p>
            </div>
          </div>

          {/* Close Button for Mobile Screens */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto bg-white">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                  <span className="truncate">{item.label}</span>
                  {lockedSections.includes(item.id) && (
                    <LockIcon className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  <span className={`text-[10px] font-urdu opacity-85 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {item.urdu}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Dedicated Standalone Chicken Shop & Khata Link (Opens in New Tab) */}
          <div className="pt-2">
            <a
              href="/?page=chicken-management"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-200 text-amber-900 hover:from-amber-100 hover:to-amber-200 text-xs font-bold transition group"
              title="نئی ٹیب میں چکن شاپ و ڈیجیٹل کھاتہ کھولیں"
            >
              <div className="flex items-center gap-2 truncate">
                <Store className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="truncate">🍗 چکن شاپ و کھاتہ</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </a>
          </div>

          {/* Mobile Worker Quick Link */}
          <div className="pt-1.5">
            <a
              href="/mobile.html"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-700 hover:bg-blue-100 text-xs font-bold transition group"
            >
              <div className="flex items-center gap-2 truncate">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">Worker Web Terminal</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          {/* Install Desktop App (PWA) */}
          <div className="pt-1.5">
            <button
              onClick={triggerInstall}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition group cursor-pointer"
              title="Install as a standalone Windows Desktop Application"
            >
              <div className="flex items-center gap-2 truncate">
                <Download className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">{isInstalled ? 'Desktop App Installed' : 'Install Desktop App'}</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                {isInstalled ? 'ACTIVE' : 'DESKTOP'}
              </span>
            </button>
          </div>
        </nav>

        {/* Footer / Admin Profile */}
        <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'HS'}
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {profile?.full_name || 'Haji Shan'}
              </p>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider truncate">
                Administrator (Owner)
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
