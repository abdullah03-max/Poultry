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

  const navSections: {
    groupTitle: string;
    groupEnglish: string;
    items: { id: NavigationTab; label: string; urdu: string; icon: any; badge?: string }[];
  }[] = [
    {
      groupTitle: 'روزمرہ آپریشنز',
      groupEnglish: 'Core Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard', urdu: 'ڈیش بورڈ خلاصہ', icon: LayoutDashboard },
        { id: 'monthly-register', label: 'Monthly Register', urdu: 'ماہانہ رجسٹر گرڈ', icon: TableProperties },
        { id: 'daily-records', label: 'Daily Records', urdu: 'روزانہ ریکارڈ شیٹ', icon: CalendarCheck },
        { id: 'collections', label: 'All Collections', urdu: 'کلیکشن پرچیاں', icon: Scale },
      ],
    },
    {
      groupTitle: 'کھاتے و مینجمنٹ',
      groupEnglish: 'Accounts & Management',
      items: [
        { id: 'customers', label: 'Waste Customers', urdu: 'ویسٹ گاہک و دکانیں', icon: Users },
        { id: 'factories', label: 'Factories & Sales', urdu: 'فیکٹریاں و مال سپلائی', icon: FactoryIcon },
        { id: 'expenses', label: 'Expenses & Cash', urdu: 'اخراجات و کیش بُک', icon: ReceiptIcon },
        { id: 'workers', label: 'Field Workers', urdu: 'ورکرز مینجمنٹ', icon: UserCheck, badge: 'Admin' },
      ],
    },
    {
      groupTitle: 'رپورٹس و ترتیبات',
      groupEnglish: 'System & Reports',
      items: [
        { id: 'reports', label: 'Reports & P&L', urdu: 'رپورٹس و اسٹیٹمنٹس', icon: FileSpreadsheet },
        { id: 'settings', label: 'System Settings', urdu: 'سسٹم ترتیبات', icon: Settings },
      ],
    },
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
        className={`w-72 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-50 no-print select-none transition-transform duration-300 ease-in-out lg:translate-x-0 ${
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

        {/* Dedicated Standalone Chicken Shop & Khata Link (Prominent Top Card) */}
        <div className="px-3 pt-3">
          <a
            href="/?page=chicken-management"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 transition-all duration-200 group active:scale-98"
            title="نئی ٹیب میں چکن شاپ و ڈیجیٹل کھاتہ کھولیں"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">
              🍗
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-tight text-white truncate">چکن شاپ مینجمنٹ</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-100 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
              <p className="text-[10px] text-amber-100 font-urdu truncate mt-0.5">ڈیجیٹل کھاتہ و گوشت سیلز (New Tab ↗)</p>
            </div>
          </a>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto bg-white">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-2.5 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>{section.groupEnglish}</span>
                <span className="font-urdu text-slate-400 text-[11px] font-semibold">{section.groupTitle}</span>
              </div>

              {section.items.map(item => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-150 group cursor-pointer text-left ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold truncate ${
                            isActive ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {lockedSections.includes(item.id) && (
                          <LockIcon className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-urdu block truncate mt-0.5 ${
                          isActive ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        {item.urdu}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Quick Utility Links Divider */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            {/* Mobile Worker Quick Link */}
            <a
              href="/mobile.html"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition group"
            >
              <div className="flex items-center gap-2 truncate">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">ورکر پورٹل (Worker App)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </a>

            {/* Install Desktop App (PWA) */}
            <button
              onClick={triggerInstall}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition group cursor-pointer"
              title="Install as a standalone Windows Desktop Application"
            >
              <div className="flex items-center gap-2 truncate">
                <Download className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">{isInstalled ? 'ایپ انسٹال ہے' : 'انسٹال ڈیسک ٹاپ ایپ'}</span>
              </div>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                {isInstalled ? 'INSTALLED' : 'PWA'}
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
