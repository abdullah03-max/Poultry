// =============================================================================
// SHAN POULTRY PROTEIN - Main Web Admin Application Entry
// =============================================================================

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { MonthlyRegisterPage } from './pages/MonthlyRegisterPage';
import { DailyRecordPage } from './pages/DailyRecordPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CustomersPage } from './pages/CustomersPage';
import { WorkersPage } from './pages/WorkersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { LoginPage } from './pages/LoginPage';
import { useRealtimeCollections } from './hooks/useRealtimeCollections';
import { NewCollectionModal } from './components/collections/NewCollectionModal';
import { Sparkles, CheckCircle2 } from 'lucide-react';

const AdminApp: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isNewCollectionOpen, setIsNewCollectionOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const {
    collections,
    realtimeActive,
    latestLiveEvent,
    refreshCollections,
  } = useRealtimeCollections();

  // Re-fetch pages whenever a realtime event arrives from Supabase
  React.useEffect(() => {
    if (latestLiveEvent) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [latestLiveEvent]);

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
    'audit-logs': {
      title: 'Compliance Audit Trail',
      subtitle: 'Immutable record of modifications, additions, and deletions',
    },
  };

  const currentHeader = pageHeaders[activeTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Fixed Left Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <Header
          title={currentHeader.title}
          subtitle={currentHeader.subtitle}
          realtimeActive={realtimeActive}
          onOpenNewCollection={() => setIsNewCollectionOpen(true)}
          showPrint={currentHeader.showPrint}
        />

        {/* Live Event Realtime Toast Notification */}
        {latestLiveEvent && (
          <div className="mx-8 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between animate-fadeIn no-print">
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
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              collections={collections}
              onNavigateTab={setActiveTab}
              onOpenNewCollection={() => setIsNewCollectionOpen(true)}
            />
          )}

          {activeTab === 'monthly-register' && (
            <MonthlyRegisterPage refreshTrigger={refreshTrigger} />
          )}

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

          {activeTab === 'audit-logs' && <AuditLogsPage />}
        </main>
      </div>

      {/* Global New Collection Modal */}
      <NewCollectionModal
        isOpen={isNewCollectionOpen}
        onClose={() => setIsNewCollectionOpen(false)}
        onCreated={() => {
          refreshCollections();
          setRefreshTrigger(prev => prev + 1);
        }}
      />
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
