// =============================================================================
// SHAN POULTRY PROTEIN - Main Web Admin Application Entry
// Daylight B2B Clean Corporate Dashboard (Strictly for Administrator)
// =============================================================================

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { MonthlyRegisterPage } from './pages/MonthlyRegisterPage';
import { DailyRecordPage } from './pages/DailyRecordPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CustomersPage } from './pages/CustomersPage';
import { FactoriesPage } from './pages/FactoriesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { WorkersPage } from './pages/WorkersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { useRealtimeCollections } from './hooks/useRealtimeCollections';
import { NewCollectionModal } from './components/collections/NewCollectionModal';
import { CollectionDetailModal } from './components/collections/CollectionDetailModal';
import { Modal } from './components/common/Modal';
import { Collection, BusinessSettings } from './types/database';
import { api } from './services/api';
import { CheckCircle2, Lock, KeyRound, Eye, EyeOff, ShieldAlert } from 'lucide-react';

const sectionLabels: Record<string, string> = {
  factories: 'Factories (فیکٹریاں و سپلائی ریکارڈ)',
  expenses: 'Expenses (اخراجات و کیش)',
  reports: 'Reports & P&L (رپورٹس و منافع)',
  'monthly-register': 'Monthly Register (ماہانہ رجسٹر)',
  customers: 'Customers (کسٹمرز ڈائریکٹری)',
  workers: 'Workers (ملازمین و کلیکٹرز)',
  'daily-records': 'Daily Records (روزانہ ریکارڈ)',
  collections: 'Collections (کلیکشن ریکارڈز)',
};

const AdminApp: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isNewCollectionOpen, setIsNewCollectionOpen] = useState<boolean>(false);
  const [selectedSlipForModal, setSelectedSlipForModal] = useState<Collection | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Settings & Section Lock State
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [unlockedSections, setUnlockedSections] = useState<Set<string>>(new Set());
  const [pinModalTargetTab, setPinModalTargetTab] = useState<NavigationTab | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinInModal, setShowPinInModal] = useState<boolean>(false);

  const {
    collections,
    realtimeActive,
    latestLiveEvent,
    refreshCollections,
  } = useRealtimeCollections();

  // Load business settings (for locked sections & PIN) with local cache fallback
  useEffect(() => {
    // Read local cache immediately for instant lock protection
    const cachedLocked = localStorage.getItem('spp_locked_sections');
    const cachedPin = localStorage.getItem('spp_section_lock_pin');
    if (cachedLocked || cachedPin) {
      try {
        const parsedLocked = cachedLocked ? JSON.parse(cachedLocked) : [];
        setBusinessSettings(prev => ({
          ...(prev || ({} as BusinessSettings)),
          locked_sections: parsedLocked,
          section_lock_pin: cachedPin || prev?.section_lock_pin || '1234',
        }));
      } catch (err) {}
    }

    api.getSettings().then(s => {
      setBusinessSettings(s);
      if (s.locked_sections) {
        localStorage.setItem('spp_locked_sections', JSON.stringify(s.locked_sections));
      }
      if (s.section_lock_pin) {
        localStorage.setItem('spp_section_lock_pin', s.section_lock_pin);
      }
    }).catch(console.warn);
  }, [refreshTrigger]);

  // Reactive listener for settings updates across components & browser tabs
  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      const updated = e.detail;
      if (updated) {
        setBusinessSettings(prev => ({ ...(prev || ({} as BusinessSettings)), ...updated }));
        // Clear session unlocks so newly locked sections are locked immediately
        setUnlockedSections(new Set());
        // If current tab is now locked, trigger lock modal
        const currentLocked = updated.locked_sections || [];
        if (currentLocked.includes(activeTab) && activeTab !== 'settings' && activeTab !== 'dashboard') {
          setPinModalTargetTab(activeTab);
          setPinInput('');
          setPinError(null);
          setShowPinInModal(false);
        }
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'spp_locked_sections' || e.key === 'spp_section_lock_pin') {
        const cachedLocked = localStorage.getItem('spp_locked_sections');
        const cachedPin = localStorage.getItem('spp_section_lock_pin');
        try {
          const parsedLocked = cachedLocked ? JSON.parse(cachedLocked) : [];
          setBusinessSettings(prev => ({
            ...(prev || ({} as BusinessSettings)),
            locked_sections: parsedLocked,
            section_lock_pin: cachedPin || prev?.section_lock_pin || '1234',
          }));
          setUnlockedSections(new Set());
        } catch (err) {}
      }
    };

    window.addEventListener('spp_settings_updated', handleSettingsUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('spp_settings_updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [activeTab]);

  // Re-fetch pages whenever a realtime event arrives from Supabase
  useEffect(() => {
    if (latestLiveEvent) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [latestLiveEvent]);

  // Guard active tab if settings finish loading and indicate it should be locked
  useEffect(() => {
    const lockedList = businessSettings?.locked_sections || [];
    if (
      activeTab !== 'settings' &&
      activeTab !== 'dashboard' &&
      lockedList.includes(activeTab) &&
      !unlockedSections.has(activeTab)
    ) {
      setPinModalTargetTab(activeTab);
    }
  }, [businessSettings, activeTab, unlockedSections]);

  // Handle protected tab navigation
  const handleSelectTab = (tab: NavigationTab) => {
    if (tab === 'settings' || tab === 'dashboard') {
      setActiveTab(tab);
      return;
    }

    const lockedList =
      businessSettings?.locked_sections ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem('spp_locked_sections') || '[]');
        } catch {
          return [];
        }
      })();

    if (lockedList.includes(tab) && !unlockedSections.has(tab)) {
      setPinModalTargetTab(tab);
      setPinInput('');
      setPinError(null);
      setShowPinInModal(false);
    } else {
      setActiveTab(tab);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = (
      businessSettings?.section_lock_pin ||
      localStorage.getItem('spp_section_lock_pin') ||
      '1234'
    ).trim();

    const entered = pinInput.trim();

    // Support case-insensitive matching for alphanumeric PINs (e.g. "Abdullah" vs "abdullah")
    if (entered && (entered === correctPin || entered.toLowerCase() === correctPin.toLowerCase())) {
      if (pinModalTargetTab) {
        setUnlockedSections(prev => new Set(prev).add(pinModalTargetTab));
        setActiveTab(pinModalTargetTab);
      }
      setPinModalTargetTab(null);
      setPinInput('');
      setPinError(null);
      setShowPinInModal(false);
    } else {
      setPinError('غلط پن کوڈ درج کیا گیا ہے۔ براہ کرم درست ایڈمن پن درج کریں۔ (Incorrect PIN)');
    }
  };

  const handleCancelPinModal = () => {
    const target = pinModalTargetTab;
    setPinModalTargetTab(null);
    setPinInput('');
    setPinError(null);
    setShowPinInModal(false);
    // If the active tab was this locked tab, send user safely to dashboard
    if (target && activeTab === target && !unlockedSections.has(target)) {
      setActiveTab('dashboard');
    }
  };

  const handleLockCurrentSection = (tab: NavigationTab) => {
    setUnlockedSections(prev => {
      const next = new Set(prev);
      next.delete(tab);
      return next;
    });
    setActiveTab('dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Initializing SHAN POULTRY Operations...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const pageHeaders: Record<NavigationTab, { title: string; subtitle: string; showPrint?: boolean }> = {
    dashboard: {
      title: 'Operations Dashboard',
      subtitle: 'Realtime collections, daily weights, and regional overview',
    },
    'monthly-register': {
      title: 'Monthly Weight Register',
      subtitle: 'Customer vs. Days 1–31 grid matrix with auto-calculated totals',
      showPrint: true,
    },
    factories: {
      title: 'Factories & Industrial Buyers',
      subtitle: 'Buyer accounts, delivery ledgers, Charbi & Kachara supply records, and WhatsApp invoices',
    },
    expenses: {
      title: 'Operational Expenses',
      subtitle: 'Driver wages, vehicle fuel/diesel, freight, maintenance, and cash disbursements',
    },
    'daily-records': {
      title: 'Daily Record Sheet',
      subtitle: 'Daily customer-by-customer reconciliation and receipts',
      showPrint: true,
    },
    collections: {
      title: 'All Collection Records',
      subtitle: 'Complete searchable and filterable database of weight slips',
    },
    customers: {
      title: 'Customers Directory',
      subtitle: 'Poultry shops, wholesale dealers, and rate schedules',
    },
    workers: {
      title: 'Field Workers & Collectors',
      subtitle: 'Active mobile employees recording waste weights',
    },
    reports: {
      title: 'Reports & Statements',
      subtitle: 'Custom date range reports and CSV exports',
      showPrint: true,
    },
    settings: {
      title: 'Business & System Settings',
      subtitle: 'Dynamic weight categories, rates, and register parameters',
    },
  };

  const currentHeader = pageHeaders[activeTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Responsive Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        lockedSections={businessSettings?.locked_sections || []}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 ml-0 flex flex-col min-w-0 w-full transition-all duration-300">
        {/* Sticky Top Header */}
        <Header
          title={currentHeader.title}
          subtitle={currentHeader.subtitle}
          realtimeActive={realtimeActive}
          collections={collections}
          onOpenNewCollection={() => setIsNewCollectionOpen(true)}
          showPrint={currentHeader.showPrint}
          latestEvent={latestLiveEvent}
          onViewCollection={setSelectedSlipForModal}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Live Event Realtime Toast Notification */}
        {latestLiveEvent && (
          <div className="mx-3 sm:mx-6 lg:mx-8 mt-3 sm:mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between animate-fadeIn no-print">
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Live Realtime Update: New Collection {latestLiveEvent.collection?.receipt_no} from {latestLiveEvent.collection?.customer?.name || 'Mobile Field Worker'} ({latestLiveEvent.collection?.total_net_weight} KG)
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Just Now</span>
          </div>
        )}

        {/* Protected Section Status & Quick Re-Lock Bar */}
        {businessSettings?.locked_sections?.includes(activeTab) && unlockedSections.has(activeTab) && (
          <div className="mx-3 sm:mx-6 lg:mx-8 mt-2 px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between no-print animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                سیکشن: <strong>{sectionLabels[activeTab] || activeTab}</strong> ایڈمن پن سے محفوظ ہے۔
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleLockCurrentSection(activeTab)}
              className="text-[11px] font-bold px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white rounded-lg border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="اس سیکشن کو فوراً دوبارہ لاک کریں"
            >
              <Lock className="w-3 h-3" />
              <span>دوبارہ لاک کریں (Lock Now)</span>
            </button>
          </div>
        )}

        {/* Page Content View */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardPage
              collections={collections}
              onNavigateTab={handleSelectTab}
              onOpenNewCollection={() => setIsNewCollectionOpen(true)}
            />
          )}

          {activeTab === 'monthly-register' && (
            <MonthlyRegisterPage refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'factories' && <FactoriesPage />}

          {activeTab === 'expenses' && <ExpensesPage />}

          {activeTab === 'daily-records' && (
            <DailyRecordPage refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'collections' && (
            <CollectionsPage refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'customers' && <CustomersPage />}

          {activeTab === 'workers' && <WorkersPage />}

          {activeTab === 'reports' && <ReportsPage />}

          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Section Lock PIN Modal */}
      <Modal
        isOpen={!!pinModalTargetTab}
        onClose={handleCancelPinModal}
        title="سیکشن سیکیورٹی پن (Security PIN Required)"
        subtitle={
          pinModalTargetTab
            ? `سیکشن: ${sectionLabels[pinModalTargetTab] || String(pinModalTargetTab).toUpperCase()} لاک ہے۔ رسائی کے لیے ایڈمن پن درج کریں۔`
            : ''
        }
        maxWidth="sm"
      >
        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <strong className="text-amber-900 block font-bold">
                {pinModalTargetTab ? sectionLabels[pinModalTargetTab] || pinModalTargetTab : 'محفوظ شدہ سیکشن'}
              </strong>
              <span className="text-amber-700 text-[11px]">
                یہ سیکشن سیکیورٹی کے تحت لاک ہے۔ ڈیٹا دیکھنے اور تبدیل کرنے کے لیے ایڈمن پن کوڈ درج کریں۔
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Admin PIN / Password *
            </label>
            <div className="relative">
              <input
                type={showPinInModal ? 'text' : 'password'}
                autoFocus
                maxLength={20}
                required
                placeholder="ایڈمن پن یا پاس ورڈ درج کریں"
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-10 py-2.5 text-center text-lg font-mono font-black tracking-widest text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPinInModal(!showPinInModal)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition"
                title={showPinInModal ? 'پن چھپائیں' : 'پن دیکھیں'}
              >
                {showPinInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pinError && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 text-center flex items-center justify-center gap-1">
                <span>⚠️</span>
                <span>{pinError}</span>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelPinModal}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              منسوخ (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>ان لاک کریں (Unlock)</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Global New Collection Modal */}
      <NewCollectionModal
        isOpen={isNewCollectionOpen}
        onClose={() => setIsNewCollectionOpen(false)}
        onCreated={() => {
          refreshCollections();
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Collection Detail Modal when clicked from notification */}
      {selectedSlipForModal && (
        <CollectionDetailModal
          isOpen={true}
          collection={selectedSlipForModal}
          onClose={() => setSelectedSlipForModal(null)}
          onDelete={() => {
            setSelectedSlipForModal(null);
            refreshCollections();
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AdminApp />
    </AuthProvider>
  );
};

export default App;
