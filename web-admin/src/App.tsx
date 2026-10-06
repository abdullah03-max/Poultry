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
import { CheckCircle2, Lock, KeyRound } from 'lucide-react';

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

  const {
    collections,
    realtimeActive,
    latestLiveEvent,
    refreshCollections,
  } = useRealtimeCollections();

  // Load business settings (for locked sections & PIN)
  useEffect(() => {
    api.getSettings().then(s => setBusinessSettings(s)).catch(console.warn);
  }, [refreshTrigger]);

  // Re-fetch pages whenever a realtime event arrives from Supabase
  useEffect(() => {
    if (latestLiveEvent) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [latestLiveEvent]);

  // Handle protected tab navigation
  const handleSelectTab = (tab: NavigationTab) => {
    const lockedList = businessSettings?.locked_sections || [];
    if (lockedList.includes(tab) && !unlockedSections.has(tab)) {
      setPinModalTargetTab(tab);
      setPinInput('');
      setPinError(null);
    } else {
      setActiveTab(tab);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = businessSettings?.section_lock_pin || '1234';
    if (pinInput.trim() === correctPin.trim()) {
      if (pinModalTargetTab) {
        setUnlockedSections(prev => new Set(prev).add(pinModalTargetTab));
        setActiveTab(pinModalTargetTab);
      }
      setPinModalTargetTab(null);
      setPinInput('');
      setPinError(null);
    } else {
      setPinError('غلط پن کوڈ درج کیا گیا ہے۔ (Incorrect PIN)');
    }
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
        onClose={() => {
          setPinModalTargetTab(null);
          setPinInput('');
          setPinError(null);
        }}
        title="سیکشن سیکیورٹی پن (Security PIN Required)"
        subtitle={pinModalTargetTab ? `سیکشن (${String(pinModalTargetTab).toUpperCase()}) لاک ہے۔ رسائی کے لیے 4 ہندسوں کا پن درج کریں۔` : ''}
        maxWidth="sm"
      >
        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <strong className="text-amber-900 block font-bold">محفوظ شدہ سیکشن (Protected Section)</strong>
              <span className="text-amber-700 text-[11px]">اس سیکشن کے ڈیٹا کو دیکھنے کے لیے درست ایڈمن پن درج کریں۔</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Admin PIN Code *
            </label>
            <input
              type="password"
              autoFocus
              maxLength={8}
              required
              placeholder="••••"
              value={pinInput}
              onChange={e => {
                setPinInput(e.target.value);
                setPinError(null);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black tracking-widest text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
            {pinError && (
              <p className="text-xs text-rose-600 font-semibold mt-1 text-center">{pinError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setPinModalTargetTab(null);
                setPinInput('');
                setPinError(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              منسوخ (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
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
