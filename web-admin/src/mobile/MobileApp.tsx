// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Worker Application
// Daylight Clean B2B Corporate Edition
// Built for fast field collection, touch signature, camera & offline sync
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Customer, WeightCategory } from '../types/database';
import { mobileStorage, OfflineCollectionItem } from './mobileStorage';
import {
  Home,
  PlusCircle,
  FileText,
  Users,
  User,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Search,
  Phone,
  Camera,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  X,
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
  AlertTriangle
} from 'lucide-react';

type Tab = 'home' | 'new_collection' | 'collections' | 'customers' | 'profile';

const defaultCategories: WeightCategory[] = [
  { id: 'cat_1', code: 'cat_1', name: 'Weight Category 1', urdu_name: 'وزن کیٹیگری ۱', unit: 'KG', default_rate: 45, is_active: true, display_order: 1, created_at: '', updated_at: '' },
  { id: 'cat_2', code: 'cat_2', name: 'Weight Category 2', urdu_name: 'وزن کیٹیگری ۲', unit: 'KG', default_rate: 40, is_active: true, display_order: 2, created_at: '', updated_at: '' },
  { id: 'waste', code: 'waste', name: 'Waste Weight', urdu_name: 'فضلہ وزن', unit: 'KG', default_rate: 48, is_active: true, display_order: 3, created_at: '', updated_at: '' },
  { id: 'fat', code: 'fat', name: 'Fat Weight', urdu_name: 'چربی وزن', unit: 'KG', default_rate: 55, is_active: true, display_order: 4, created_at: '', updated_at: '' },
];

export const MobileApp: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // Network State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Authentication State
  const [worker, setWorker] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState<string>('worker@shanpoultry.com');
  const [loginPassword, setLoginPassword] = useState<string>('worker123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Data Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offlineSlips, setOfflineSlips] = useState<OfflineCollectionItem[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Modals
  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState<boolean>(false);
  const [receiptModalSlip, setReceiptModalSlip] = useState<OfflineCollectionItem | null>(null);

  // New Collection Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [tareWeight, setTareWeight] = useState<string>('0');
  const [categoryWeights, setCategoryWeights] = useState<Record<string, string>>({
    cat_1: '',
    cat_2: '',
    waste: '',
    fat: '',
  });
  const [showCategories, setShowCategories] = useState<boolean>(false);
  const [ratePerKg, setRatePerKg] = useState<string>('45');
  const [notes, setNotes] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [isSavingCollection, setIsSavingCollection] = useState<boolean>(false);

  // Add Customer Form State
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustContact, setNewCustContact] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustArea, setNewCustArea] = useState<string>('Gaggoo Mandi');
  const [newCustRate, setNewCustRate] = useState<string>('45');

  // Sync Progress State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Signature Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load persisted worker session
    const savedWorker = mobileStorage.getLoggedWorker();
    if (savedWorker) {
      setWorker(savedWorker);
    } else {
      // Default demo worker session for instant field usability
      const demoWorker = {
        id: 'worker-field-01',
        full_name: 'Tariq Mahmood (Field Collector)',
        phone: '+92 300 9876543',
        role: 'worker',
      };
      setWorker(demoWorker);
      mobileStorage.setLoggedWorker(demoWorker);
    }

    // Load cached customers & slips
    loadData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    // 1. Slips
    const slips = mobileStorage.getOfflineSlips();
    setOfflineSlips(slips);
    setPendingCount(slips.filter(s => s.status === 'pending_sync').length);

    // 2. Customers
    const cached = mobileStorage.getCachedCustomers();
    if (cached.length > 0) {
      setCustomers(cached);
    }

    // Try fetching live customers if online
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('status', 'active')
          .order('name');
        if (!error && data && data.length > 0) {
          setCustomers(data);
          mobileStorage.setCachedCustomers(data);
        }
      } catch (err) {
        console.warn('Could not fetch live customers, using cache:', err);
      }
    }
  };

  // Calculations for New Collection
  const grossNum = parseFloat(grossWeight) || 0;
  const tareNum = parseFloat(tareWeight) || 0;
  const scaleNet = Math.max(0, grossNum - tareNum);

  const sumCategories = Object.values(categoryWeights).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );

  const effectiveNetWeight = scaleNet > 0 ? scaleNet : sumCategories;
  const rateNum = parseFloat(ratePerKg) || (selectedCustomer?.rate_per_kg || 45);
  const totalAmount = Math.round(effectiveNetWeight * rateNum);

  // Photo Capture
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Signature Canvas Helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F172A';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureBase64(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureBase64(null);
  };

  // Submit New Collection Slip
  const handleSaveCollection = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer / shop.');
      return;
    }
    if (effectiveNetWeight <= 0) {
      alert('Please enter a valid weight greater than 0 KG.');
      return;
    }

    setIsSavingCollection(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const receiptNo = `SPP-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${randomSuffix}`;
      const clientUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      const items = defaultCategories
        .filter(c => parseFloat(categoryWeights[c.id]) > 0)
        .map(c => {
          const w = parseFloat(categoryWeights[c.id]);
          return {
            category_id: c.id,
            category_name: c.name,
            weight: w,
            rate: rateNum,
            amount: Math.round(w * rateNum),
          };
        });

      const newSlip: OfflineCollectionItem = {
        client_uuid: clientUuid,
        receipt_no: receiptNo,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_area: selectedCustomer.area,
        worker_id: worker?.id || null,
        worker_name: worker?.full_name || 'Field Collector',
        collection_date: dateStr,
        collection_time: timeStr,
        gross_weight: grossNum > 0 ? grossNum : effectiveNetWeight,
        tare_weight: tareNum,
        total_net_weight: effectiveNetWeight,
        rate_per_kg: rateNum,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        signature_base64: signatureBase64,
        photo_base64: photoBase64,
        items,
        status: 'pending_sync',
        created_at: now.toISOString(),
      };

      // If online, attempt direct save to Supabase
      let savedOnline = false;
      if (isOnline) {
        try {
          const { data: colData, error: colError } = await supabase
            .from('collections')
            .insert({
              client_uuid: clientUuid,
              receipt_no: receiptNo,
              customer_id: selectedCustomer.id,
              worker_id: worker?.id && worker.id.length > 20 ? worker.id : null,
              collection_date: dateStr,
              collection_time: timeStr,
              collection_timestamp: `${dateStr}T${timeStr}`,
              gross_weight: newSlip.gross_weight,
              tare_weight: newSlip.tare_weight,
              total_net_weight: newSlip.total_net_weight,
              rate_per_kg: newSlip.rate_per_kg,
              total_amount: newSlip.total_amount,
              notes: newSlip.notes,
              status: 'submitted',
            })
            .select()
            .single();

          if (!colError && colData) {
            savedOnline = true;
            newSlip.status = 'synced';
          }
        } catch (e) {
          console.warn('Online insert failed, saved to offline queue:', e);
        }
      }

      // Save locally
      mobileStorage.saveOfflineSlip(newSlip);
      setOfflineSlips(mobileStorage.getOfflineSlips());
      setPendingCount(mobileStorage.getPendingSyncCount());

      // Show digital receipt popup
      setReceiptModalSlip(newSlip);

      // Reset form
      setSelectedCustomer(null);
      setGrossWeight('');
      setTareWeight('0');
      setCategoryWeights({ cat_1: '', cat_2: '', waste: '', fat: '' });
      setNotes('');
      setPhotoBase64(null);
      setSignatureBase64(null);
      clearSignature();
    } catch (err: any) {
      alert(`Error saving collection: ${err.message}`);
    } finally {
      setIsSavingCollection(false);
    }
  };

  // Add Customer Quick Action
  const handleAddCustomer = async () => {
    if (!newCustName.trim()) {
      alert('Customer / Shop Name is required.');
      return;
    }

    const rate = parseFloat(newCustRate) || 45;
    const newCustomerObj: Customer = {
      id: 'cust-' + Date.now(),
      customer_code: 'CUST-' + Math.floor(100 + Math.random() * 900),
      name: newCustName.trim(),
      contact_person: newCustContact.trim() || null,
      phone: newCustPhone.trim() || '+92 300 0000000',
      alternate_phone: null,
      address: null,
      area: newCustArea.trim() || 'Gaggoo Mandi',
      rate_per_kg: rate,
      category_rates: {},
      status: 'active',
      notes: null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isOnline) {
      try {
        const { data, error } = await supabase.from('customers').insert({
          customer_code: newCustomerObj.customer_code,
          name: newCustomerObj.name,
          contact_person: newCustomerObj.contact_person,
          phone: newCustomerObj.phone,
          area: newCustomerObj.area,
          rate_per_kg: newCustomerObj.rate_per_kg,
          status: 'active',
        }).select().single();

        if (!error && data) {
          newCustomerObj.id = data.id;
        }
      } catch (e) {
        console.warn('Could not insert online, cached locally:', e);
      }
    }

    const updated = [newCustomerObj, ...customers];
    setCustomers(updated);
    mobileStorage.setCachedCustomers(updated);
    setSelectedCustomer(newCustomerObj);
    setRatePerKg(rate.toString());

    setAddCustomerModalOpen(false);
    setNewCustName('');
    setNewCustContact('');
    setNewCustPhone('');
  };

  // Sync Offline Slips
  const handleSyncAll = async () => {
    if (!isOnline) {
      alert('You are currently offline. Please check your internet connection.');
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg('Syncing collection slips with Supabase...');

    const result = await mobileStorage.syncAllPending((curr, total) => {
      setSyncStatusMsg(`Syncing ${curr} of ${total} collection slips...`);
    });

    setOfflineSlips(mobileStorage.getOfflineSlips());
    setPendingCount(mobileStorage.getPendingSyncCount());
    setIsSyncing(false);
    setSyncStatusMsg(null);
    alert(`Sync completed! ${result.success} synced successfully, ${result.failed} failed.`);
  };

  // Today's Totals
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySlips = offlineSlips.filter(s => s.collection_date === todayStr);
  const todayTotalWeight = todaySlips.reduce((acc, s) => acc + s.total_net_weight, 0);
  const todayTotalAmount = todaySlips.reduce((acc, s) => acc + s.total_amount, 0);

  // Filtered Customers for Modal
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.area.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.contact_person && c.contact_person.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 select-none overflow-hidden font-sans">
      {/* =========================================================================
          TOP STATUS & BRAND HEADER
      ========================================================================= */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20">
            S
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wide text-slate-900">SHAN POULTRY</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">FIELD</span>
            </div>
            <div className="text-xs text-slate-500 font-medium truncate max-w-[160px]">
              {worker?.full_name || 'Worker App'}
            </div>
          </div>
        </div>

        {/* Online / Offline Status Badge */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              OFFLINE
            </div>
          )}
        </div>
      </header>

      {/* =========================================================================
          MAIN SCROLLABLE CONTENT AREA
      ========================================================================= */}
      <main className="flex-1 overflow-y-auto pb-24 p-4">
        {/* TAB 1: HOME DASHBOARD */}
        {activeTab === 'home' && (
          <div className="space-y-4 max-w-lg mx-auto">
            {/* Offline Alert Banner */}
            {pendingCount > 0 && (
              <div
                onClick={() => setActiveTab('profile')}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between shadow-sm cursor-pointer active:scale-98 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900">
                      {pendingCount} Collection Slip{pendingCount > 1 ? 's' : ''} Pending Sync
                    </div>
                    <div className="text-[11px] text-amber-700">Tap here to sync with main database</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </div>
            )}

            {/* Today's KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Net Weight</span>
                <div className="text-2xl font-black text-blue-600 mt-1 font-mono tracking-tight">
                  {todayTotalWeight.toFixed(1)} <span className="text-sm font-bold text-slate-500">KG</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">{todaySlips.length} slips recorded</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Billed</span>
                <div className="text-2xl font-black text-amber-600 mt-1 font-mono tracking-tight">
                  Rs. {todayTotalAmount.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">{pendingCount} pending upload</div>
              </div>
            </div>

            {/* Big Primary Action: RECORD NEW COLLECTION */}
            <button
              onClick={() => setActiveTab('new_collection')}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-base py-4 px-5 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-between transition-all active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black tracking-wide">RECORD NEW COLLECTION</div>
                  <div className="text-xs text-blue-100 font-medium">Weigh, signature, photo & receipt</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70" />
            </button>

            {/* Quick Action Navigation Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => setActiveTab('customers')}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm active:bg-slate-50 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Customers</span>
                <span className="text-[10px] text-slate-400 font-medium">{customers.length} shops</span>
              </button>

              <button
                onClick={() => setActiveTab('collections')}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm active:bg-slate-50 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">All Slips</span>
                <span className="text-[10px] text-slate-400 font-medium">{offlineSlips.length} total</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm active:bg-slate-50 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Sync Center</span>
                <span className="text-[10px] text-slate-400 font-medium">{pendingCount} unsynced</span>
              </button>
            </div>

            {/* Today's Collections List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Today's Collections ({todaySlips.length})</span>
                <button
                  onClick={() => setActiveTab('collections')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  See All
                </button>
              </div>

              {todaySlips.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-700">No collections recorded yet today</div>
                  <div className="text-xs text-slate-400 mt-1">Tap the blue button above to record your first weigh-in.</div>
                </div>
              ) : (
                todaySlips.map(s => (
                  <div
                    key={s.client_uuid}
                    onClick={() => setReceiptModalSlip(s)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-xs text-blue-600">{s.receipt_no}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{s.collection_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm truncate">{s.customer_name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {s.customer_area}
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                      <div className="font-mono font-black text-base text-blue-600">
                        {s.total_net_weight} <span className="text-xs font-bold text-slate-500">KG</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          Rs. {s.total_amount.toLocaleString()}
                        </span>
                        {s.status === 'synced' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Synced" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Pending Sync" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: NEW COLLECTION WORKFLOW */}
        {activeTab === 'new_collection' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-black text-slate-900">Record New Collection</h2>
                <p className="text-xs text-slate-500">Field weigh-in and shop confirmation</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl active:bg-slate-100"
              >
                Cancel
              </button>
            </div>

            {/* STEP 1: CUSTOMER SELECTION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Step 1: Customer / Poultry Shop *
                </label>
                <button
                  type="button"
                  onClick={() => setAddCustomerModalOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  + Add New
                </button>
              </div>

              {selectedCustomer ? (
                <div
                  onClick={() => setCustomerModalOpen(true)}
                  className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-black text-sm text-slate-900">{selectedCustomer.name}</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {selectedCustomer.area} • Rate: <span className="font-bold text-blue-700">Rs. {selectedCustomer.rate_per_kg}/KG</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                    Change
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="w-full py-3.5 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-left flex items-center justify-between text-slate-600 active:bg-slate-100"
                >
                  <span className="text-sm font-semibold text-slate-500">Tap to select shop / dealer...</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* STEP 2: WEIGHT ENTRY */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Step 2: Weight Details (KG) *
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Gross Weight */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Gross Weight (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={grossWeight}
                    onChange={e => setGrossWeight(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  {/* Quick increment buttons */}
                  <div className="flex gap-1 mt-1.5">
                    {['+5', '+10', '+25'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          const current = parseFloat(grossWeight) || 0;
                          setGrossWeight((current + parseInt(val.replace('+', ''))).toString());
                        }}
                        className="flex-1 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold active:bg-slate-200"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tare Weight */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tare / Crates (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={tareWeight}
                    onChange={e => setTareWeight(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {['0', '2.5', '5.0'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTareWeight(val)}
                        className="flex-1 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold active:bg-slate-200"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rate per KG */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rate per KG (PKR)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="45"
                  value={ratePerKg}
                  onChange={e => setRatePerKg(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Optional Category Breakdown Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCategories(!showCategories)}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1"
                >
                  {showCategories ? '▼ Hide Category Breakdown' : '▶ Add Multi-Category Breakdown (Optional)'}
                </button>

                {showCategories && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                    {defaultCategories.map(cat => (
                      <div key={cat.id}>
                        <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                          {cat.name} ({cat.urdu_name})
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          placeholder="0.0 KG"
                          value={categoryWeights[cat.id]}
                          onChange={e => setCategoryWeights(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm font-bold text-slate-900"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Net Weight & Total Amount Summary Bar */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Calculated Net Weight</span>
                  <span className="text-xl font-black font-mono text-blue-400">{effectiveNetWeight.toFixed(1)} KG</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Billed Amount</span>
                  <span className="text-xl font-black font-mono text-amber-400">Rs. {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* STEP 3: PHOTO ATTACHMENT */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Step 3: Scale / Receipt Photo Proof (Optional)
              </label>

              {photoBase64 ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={photoBase64} alt="Scale attachment" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoBase64(null)}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg shadow-md active:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer active:bg-slate-50 transition">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Capture or Attach Photo</span>
                  <span className="text-[10px] text-slate-400">Scale indicator or printed slip</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* STEP 4: CUSTOMER SIGNATURE PAD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Step 4: Customer Touch Signature *
                </label>
                {signatureBase64 && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs font-bold text-red-600 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                  className="w-full touch-none bg-white cursor-crosshair"
                />
                {!signatureBase64 && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs font-medium text-slate-300">
                    Sign with finger here...
                  </div>
                )}
              </div>
            </div>

            {/* STEP 5: NOTES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Crate deposit, cash paid, or remarks..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="button"
              disabled={isSavingCollection || !selectedCustomer || effectiveNetWeight <= 0}
              onClick={handleSaveCollection}
              className={`w-full py-4 rounded-2xl font-black text-base tracking-wide text-white shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 ${
                isSavingCollection || !selectedCustomer || effectiveNetWeight <= 0
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }`}
            >
              {isSavingCollection ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>SAVING COLLECTION...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>SAVE & SUBMIT COLLECTION</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 3: COLLECTIONS HISTORY */}
        {activeTab === 'collections' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-black text-slate-900">Collection Slips</h2>
                <p className="text-xs text-slate-500">{offlineSlips.length} total slips on device</p>
              </div>
              {pendingCount > 0 && (
                <button
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-xl shadow-xs active:bg-blue-700"
                >
                  Sync ({pendingCount})
                </button>
              )}
            </div>

            {offlineSlips.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-700">No collection history yet</div>
                <div className="text-xs text-slate-400 mt-1">Recorded weigh-in slips will appear here.</div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {offlineSlips.map(s => (
                  <div
                    key={s.client_uuid}
                    onClick={() => setReceiptModalSlip(s)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-black text-xs text-blue-600">{s.receipt_no}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-mono">{s.collection_date}</span>
                        {s.status === 'synced' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            SYNCED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            OFFLINE
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 text-sm truncate">{s.customer_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.customer_area}</div>
                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 font-mono">
                      <span className="font-bold text-sm text-blue-600">{s.total_net_weight} KG</span>
                      <span className="font-black text-sm text-slate-900">Rs. {s.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CUSTOMERS DIRECTORY */}
        {activeTab === 'customers' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-black text-slate-900">Customers Directory</h2>
                <p className="text-xs text-slate-500">{customers.length} registered shops</p>
              </div>
              <button
                onClick={() => setAddCustomerModalOpen(true)}
                className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-xl shadow-xs active:bg-blue-700"
              >
                + Add Shop
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search shop name, owner, or mandi..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Customer Cards */}
            <div className="space-y-2.5">
              {filteredCustomers.map(c => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{c.contact_person || 'Owner'}</div>
                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {c.area}
                      </div>
                    </div>

                    <a
                      href={`tel:${c.phone}`}
                      className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 active:bg-emerald-100"
                      title="Call customer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-500">Standard Rate:</span>
                    <span className="font-mono font-bold text-blue-600">Rs. {c.rate_per_kg} / KG</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE & SYNC MANAGER */}
        {activeTab === 'profile' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h2 className="text-lg font-black text-slate-900">Worker Profile & Sync</h2>

            {/* Worker Details Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                {worker?.full_name?.charAt(0) || 'W'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-900 text-base truncate">{worker?.full_name || 'Field Collector'}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{worker?.phone || '+92 300 0000000'}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    FIELD AGENT
                  </span>
                  <span className="text-[11px] text-slate-400">• Shan Poultry</span>
                </div>
              </div>
            </div>

            {/* Offline Sync Manager Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Offline Sync Center</span>
                <span className="text-xs font-mono font-bold text-amber-600">{pendingCount} pending</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Network Connection:</span>
                  <span className={`font-bold ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isOnline ? '🟢 Connected' : '🟡 Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Offline Slips:</span>
                  <span className="font-bold font-mono text-slate-900">{pendingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Slips on Phone:</span>
                  <span className="font-bold font-mono text-slate-900">{offlineSlips.length}</span>
                </div>
              </div>

              {syncStatusMsg && (
                <div className="text-xs text-blue-600 font-bold text-center py-1">
                  {syncStatusMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleSyncAll}
                disabled={isSyncing || pendingCount === 0 || !isOnline}
                className={`w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition active:scale-98 ${
                  isSyncing || pendingCount === 0 || !isOnline
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'SYNCING IN PROGRESS...' : 'SYNC ALL PENDING SLIPS NOW'}</span>
              </button>
            </div>

            {/* App Info Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 text-xs text-slate-500">
              <div className="font-bold text-slate-700">App Information</div>
              <div className="flex justify-between">
                <span>Application:</span>
                <span className="font-medium text-slate-900">Shan Poultry Mobile Worker</span>
              </div>
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-mono text-slate-900">v1.0.0 Daylight Native</span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="font-mono text-slate-900 truncate max-w-[180px]">ohwslpcuetrpkqhvvszu.supabase.co</span>
              </div>
            </div>

            {/* Sign Out / Switch Worker */}
            <button
              onClick={() => {
                if (confirm('Switch worker session?')) {
                  mobileStorage.clearSession();
                  setWorker(null);
                }
              }}
              className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:bg-red-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Switch Worker Session</span>
            </button>
          </div>
        )}
      </main>

      {/* =========================================================================
          FIXED BOTTOM NAVIGATION BAR
      ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg z-30">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('collections')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            activeTab === 'collections' ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Slips</span>
        </button>

        {/* Center Prominent Record Button */}
        <button
          onClick={() => setActiveTab('new_collection')}
          className="w-13 h-13 -mt-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 border-4 border-slate-50 active:scale-95 transition"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            activeTab === 'customers' ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Shops</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition relative ${
            activeTab === 'profile' ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Profile</span>
          {pendingCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </nav>

      {/* =========================================================================
          MODAL 1: CUSTOMER PICKER
      ========================================================================= */}
      {customerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slideUp">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Select Customer / Shop</h3>
                <p className="text-xs text-slate-500">{filteredCustomers.length} shops available</p>
              </div>
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Type shop name or area..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setRatePerKg(c.rate_per_kg.toString());
                    setCustomerModalOpen(false);
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {c.area} • {c.contact_person || 'Owner'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-blue-600 block">Rs. {c.rate_per_kg}</span>
                    <span className="text-[10px] text-slate-400">per KG</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setCustomerModalOpen(false);
                  setAddCustomerModalOpen(true);
                }}
                className="w-full py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs active:bg-slate-100"
              >
                + Add Shop Not In List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD NEW CUSTOMER
      ========================================================================= */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">Add New Poultry Shop</h3>
              <button onClick={() => setAddCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Shop / Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Al-Madina Chicken Shop"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Haji Rashid"
                  value={newCustContact}
                  onChange={e => setNewCustContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Area / Mandi</label>
                  <input
                    type="text"
                    placeholder="Gaggoo Mandi"
                    value={newCustArea}
                    onChange={e => setNewCustArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Rate (PKR/KG)</label>
                  <input
                    type="number"
                    placeholder="45"
                    value={newCustRate}
                    onChange={e => setNewCustRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setAddCustomerModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomer}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm"
              >
                Save Shop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: DIGITAL SLIP RECEIPT
      ========================================================================= */}
      {receiptModalSlip && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-scaleUp">
            {/* Receipt Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl mx-auto mb-1.5">
                S
              </div>
              <div className="font-extrabold text-base text-slate-900 tracking-wide">SHAN POULTRY PROTEIN</div>
              <div className="text-[11px] text-slate-500 font-medium">Official Weight Collection Slip</div>
              <div className="font-mono font-black text-sm text-blue-600 mt-1">{receiptModalSlip.receipt_no}</div>
            </div>

            {/* Receipt Breakdown Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Shop / Customer:</span>
                <span className="font-bold text-slate-900 text-right">{receiptModalSlip.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Area / Mandi:</span>
                <span className="font-medium text-slate-700">{receiptModalSlip.customer_area}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-mono text-slate-700">
                  {receiptModalSlip.collection_date} {receiptModalSlip.collection_time.substring(0, 5)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Collector:</span>
                <span className="font-medium text-slate-700">{receiptModalSlip.worker_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 my-2 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Weight:</span>
                  <span>{receiptModalSlip.gross_weight} KG</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tare Deduction:</span>
                  <span>-{receiptModalSlip.tare_weight} KG</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black pt-1 border-t border-slate-200 text-sm">
                  <span>Net Weight:</span>
                  <span className="text-blue-600">{receiptModalSlip.total_net_weight} KG</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Rate:</span>
                  <span>Rs. {receiptModalSlip.rate_per_kg} / KG</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black text-base pt-1 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span className="text-amber-600">Rs. {receiptModalSlip.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Signature Display if available */}
              {receiptModalSlip.signature_base64 && (
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                    Customer Signature
                  </div>
                  <div className="h-14 border border-slate-200 rounded-lg bg-white overflow-hidden flex items-center justify-center">
                    <img src={receiptModalSlip.signature_base64} alt="Signature" className="max-h-full max-w-full" />
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Status:</span>
                {receiptModalSlip.status === 'synced' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    VERIFIED & SYNCED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    SAVED LOCALLY (OFFLINE)
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setReceiptModalSlip(null)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
