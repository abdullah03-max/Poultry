// =============================================================================
// SHAN POULTRY PROTEIN - Customer Management & 360 History Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Customer, Collection } from '../types/database';
import { formatWeight, formatCurrency, formatDate } from '../utils/formatters';
import { Search, Plus, Phone, MapPin, Edit, History, UserX, UserCheck, Scale, Loader2, Trash2, Clock, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Customer 360 History Modal
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [customerSlips, setCustomerSlips] = useState<Collection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Add / Edit Modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  // Global / Common Collection Time Settings (Applies to all customers)
  const [commonStartTime, setCommonStartTime] = useState<string>('08:00');
  const [commonEndTime, setCommonEndTime] = useState<string>('14:00');
  const [isEditingSchedule, setIsEditingSchedule] = useState<boolean>(false);
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);
  const [todayCollectedCustomerIds, setTodayCollectedCustomerIds] = useState<Set<string>>(new Set());

  const handleSaveCommonSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSchedule(true);
      await api.updateSettings({
        common_collection_start_time: commonStartTime,
        common_collection_end_time: commonEndTime,
      });
      setIsEditingSchedule(false);
    } catch (err: any) {
      console.error('Failed to update common collection schedule:', err);
      alert('Could not save schedule: ' + (err.message || 'Error'));
    } finally {
      setSavingSchedule(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const todayPktDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
      const [data, sett, todayColRes] = await Promise.all([
        api.getCustomers(true),
        api.getSettings(),
        api.getCollections({ startDate: todayPktDateStr, endDate: todayPktDateStr, limit: 1000 }),
      ]);
      setCustomers(data);
      if (sett.common_collection_start_time) setCommonStartTime(sett.common_collection_start_time);
      if (sett.common_collection_end_time) setCommonEndTime(sett.common_collection_end_time);

      const collectedIds = new Set(todayColRes.collections.map(c => c.customer_id));
      setTodayCollectedCustomerIds(collectedIds);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCustomer360 = async (cust: Customer) => {
    setViewCustomer(cust);
    try {
      setLoadingHistory(true);
      const res = await api.getCollections({ customerId: cust.id, limit: 100 });
      setCustomerSlips(res.collections);
    } catch (err) {
      console.error('Error loading customer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleStatus = async (cust: Customer) => {
    const newStatus = cust.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateCustomer(cust.id, { status: newStatus });
      fetchCustomers();
    } catch (err) {
      console.error('Failed to toggle customer status:', err);
    }
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${cust.name}"? This will remove this shop from the directory.`)) {
      return;
    }
    try {
      await api.deleteCustomer(cust.id);
      fetchCustomers();
    } catch (err: any) {
      alert(`Failed to delete customer: ${err.message || 'Error'}`);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const charbiRate = editingCustomer.rate_charbi ?? 55.0;
      const kacharaRate = editingCustomer.rate_kachara ?? (editingCustomer.rate_per_kg ?? 45.0);

      const bolesWeight = editingCustomer.boles_weight != null && editingCustomer.boles_weight !== ('' as any)
        ? parseFloat(String(editingCustomer.boles_weight))
        : null;
      const bolesRate = editingCustomer.boles_rate != null && editingCustomer.boles_rate !== ('' as any)
        ? parseFloat(String(editingCustomer.boles_rate))
        : null;
      const bolesTotal = bolesWeight && bolesRate ? Number((bolesWeight * bolesRate).toFixed(2)) : null;

      const thaiWeight = editingCustomer.thai_weight != null && editingCustomer.thai_weight !== ('' as any)
        ? parseFloat(String(editingCustomer.thai_weight))
        : null;
      const thaiRate = editingCustomer.thai_rate != null && editingCustomer.thai_rate !== ('' as any)
        ? parseFloat(String(editingCustomer.thai_rate))
        : null;
      const thaiTotal = thaiWeight && thaiRate ? Number((thaiWeight * thaiRate).toFixed(2)) : null;

      const goshtWeight = editingCustomer.gosht_weight != null && editingCustomer.gosht_weight !== ('' as any)
        ? parseFloat(String(editingCustomer.gosht_weight))
        : null;
      const goshtRate = editingCustomer.gosht_rate != null && editingCustomer.gosht_rate !== ('' as any)
        ? parseFloat(String(editingCustomer.gosht_rate))
        : null;
      const goshtTotal = goshtWeight && goshtRate ? Number((goshtWeight * goshtRate).toFixed(2)) : null;

      const bakayaRaqam = editingCustomer.bakaya_raqam != null && editingCustomer.bakaya_raqam !== ('' as any)
        ? parseFloat(String(editingCustomer.bakaya_raqam))
        : 0;
      const calculatedTotal = (bolesTotal || 0) + (thaiTotal || 0) + (goshtTotal || 0) + (bakayaRaqam || 0);
      const totalRaqam = editingCustomer.total_raqam != null && editingCustomer.total_raqam !== ('' as any)
        ? parseFloat(String(editingCustomer.total_raqam))
        : calculatedTotal;

      const customerPayload: Partial<Customer> = {
        ...editingCustomer,
        rate_charbi: charbiRate,
        rate_kachara: kacharaRate,
        rate_per_kg: kacharaRate,
        collection_start_time: editingCustomer.collection_start_time || null,
        collection_end_time: editingCustomer.collection_end_time || null,
        dokan_khata: editingCustomer.dokan_khata || null,
        customer_khata: editingCustomer.customer_khata || null,
        boles_weight: bolesWeight,
        boles_rate: bolesRate,
        boles_total: bolesTotal,
        thai_weight: thaiWeight,
        thai_rate: thaiRate,
        thai_total: thaiTotal,
        gosht_weight: goshtWeight,
        gosht_rate: goshtRate,
        gosht_total: goshtTotal,
        bakaya_raqam: bakayaRaqam || null,
        total_raqam: totalRaqam || null,
        category_rates: {
          charbi: charbiRate,
          kachara: kacharaRate,
          ...(editingCustomer.category_rates || {}),
        },
      };

      if (editingCustomer.id) {
        await api.updateCustomer(editingCustomer.id, customerPayload);
      } else {
        await api.createCustomer({
          customer_code: editingCustomer.customer_code || `CUST-${String(customers.length + 1).padStart(3, '0')}`,
          name: editingCustomer.name || 'New Customer',
          contact_person: editingCustomer.contact_person || null,
          phone: editingCustomer.phone || '',
          alternate_phone: editingCustomer.alternate_phone || null,
          address: editingCustomer.address || null,
          area: editingCustomer.area || 'General',
          rate_per_kg: kacharaRate,
          rate_charbi: charbiRate,
          rate_kachara: kacharaRate,
          collection_start_time: editingCustomer.collection_start_time || null,
          collection_end_time: editingCustomer.collection_end_time || null,
          dokan_khata: editingCustomer.dokan_khata || null,
          customer_khata: editingCustomer.customer_khata || null,
          boles_weight: bolesWeight,
          boles_rate: bolesRate,
          boles_total: bolesTotal,
          thai_weight: thaiWeight,
          thai_rate: thaiRate,
          thai_total: thaiTotal,
          gosht_weight: goshtWeight,
          gosht_rate: goshtRate,
          gosht_total: goshtTotal,
          bakaya_raqam: bakayaRaqam || null,
          total_raqam: totalRaqam || null,
          category_rates: {
            charbi: charbiRate,
            kachara: kacharaRate,
          },
          status: 'active',
          notes: editingCustomer.notes || null,
        });
      }
      setEditModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to save customer:', err);
    }
  };

  const areas = Array.from(new Set(customers.map(c => c.area))).filter(Boolean);

  const filteredCustomers = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.area.toLowerCase().includes(search.toLowerCase());
    const matchArea = selectedArea === 'all' || c.area === selectedArea;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchArea && matchStatus;
  });

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Controls Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Poultry Customers & Suppliers</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage chicken dressing centers, retail shops, wholesale accounts, and their agreed rate schedules
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCustomer({
                customer_code: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
                name: '',
                contact_person: '',
                phone: '+92 3',
                area: 'Gaggoo Mandi',
                rate_charbi: 55.0,
                rate_kachara: 45.0,
                rate_per_kg: 45.0,
                collection_start_time: '08:00',
                collection_end_time: '12:00',
                status: 'active',
              });
              setEditModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, code, phone, or area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white"
            />
          </div>

          <select
            value={selectedArea}
            onChange={e => setSelectedArea(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-600 focus:bg-white"
          >
            <option value="all">All Areas ({areas.length})</option>
            {areas.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-600 focus:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* Global Collection Schedule Banner (Single common time for all customers) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                وقت وصولی تمام کسٹمرز کے لیے (Common Collection Schedule)
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              تمام کسٹمرز اور دکانوں کے لیے وصولی کا ایک ہی مشترکہ وقت مقرر ہے۔ مقررہ آخری وقت گزرنے کے بعد اگر کسی کسٹمر سے وصولی نہ ہو تو نوٹیفکیشن بیل میں خودکار الرٹ ظاہر ہو گا۔
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isEditingSchedule ? (
              <form onSubmit={handleSaveCommonSchedule} className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-600 text-[11px] font-semibold">شروع:</span>
                  <input
                    type="time"
                    required
                    value={commonStartTime}
                    onChange={e => setCommonStartTime(e.target.value)}
                    className="bg-white text-slate-900 font-mono text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-600 text-[11px] font-semibold">اختتام:</span>
                  <input
                    type="time"
                    required
                    value={commonEndTime}
                    onChange={e => setCommonEndTime(e.target.value)}
                    className="bg-white text-slate-900 font-mono text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {savingSchedule ? 'محفوظ...' : 'محفوظ کریں'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(false)}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition"
                >
                  منسوخ
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">مقررہ روزانہ وقت</span>
                  <span className="font-mono text-sm font-extrabold text-blue-700">
                    {commonStartTime} — {commonEndTime}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs active:scale-95"
                >
                  وقت تبدیل کریں
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick status bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-600">
              کل دکانیں: <strong className="text-slate-900 font-mono">{customers.length}</strong>
            </span>
            <span className="text-emerald-700">
              آج وصولی شدہ: <strong className="text-emerald-900 font-mono">{todayCollectedCustomerIds.size}</strong>
            </span>
            <span className="text-amber-700">
              باقی دکانیں: <strong className="text-amber-900 font-mono">{Math.max(0, customers.length - todayCollectedCustomerIds.size)}</strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            شیڈول ڈیڈ لائن: {commonEndTime}
          </span>
        </div>
      </div>

      {/* Customers Cards / Directory */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-xs font-medium text-slate-500">Loading customer directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => (
            <div
              key={cust.id}
              className={`p-5 rounded-2xl border transition-all duration-200 bg-white shadow-card hover:shadow-card-hover flex flex-col justify-between ${
                cust.status === 'active' ? 'border-slate-200/90' : 'border-rose-200 bg-rose-50/20 opacity-80'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                    {cust.customer_code}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      cust.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {cust.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900">{cust.name}</h3>
                  {cust.contact_person && (
                    <p className="text-xs text-slate-500 font-medium">{cust.contact_person}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.area} — {cust.address || 'Standard Address'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-semibold">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg">
                      چربی: {cust.rate_charbi ?? 55} PKR/KG
                    </span>
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg">
                      کچرا: {cust.rate_kachara ?? (cust.rate_per_kg ?? 45)} PKR/KG
                    </span>
                  </div>

                  {/* Chicken Shop Khata Summary */}
                  {(cust.dokan_khata || cust.customer_khata || cust.total_raqam != null || cust.bakaya_raqam != null) && (
                    <div className="p-2.5 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-1 text-[11px] mt-1.5">
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-bold flex items-center gap-1 text-slate-800">
                          <Wallet className="w-3 h-3 text-blue-600" /> دکان کھاتہ:
                        </span>
                        <span className="font-mono font-bold text-blue-700">
                          {cust.dokan_khata || cust.customer_khata || '—'}
                        </span>
                      </div>
                      {cust.total_raqam != null && (
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-600">کل رقم:</span>
                          <span className="font-mono font-extrabold text-emerald-700">
                            Rs. {Number(cust.total_raqam).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {cust.bakaya_raqam != null && Number(cust.bakaya_raqam) > 0 && (
                        <div className="flex justify-between items-center text-rose-700 font-bold">
                          <span>بقایہ رقم:</span>
                          <span className="font-mono">
                            Rs. {Number(cust.bakaya_raqam).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Common Schedule Status Badge */}
                  {todayCollectedCustomerIds.has(cust.id) ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl w-full mt-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>✅ آج وصولی مکمل (Collected Today)</span>
                    </div>
                  ) : (() => {
                    const now = new Date();
                    const nowPktStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour12: false, hour: '2-digit', minute: '2-digit' });
                    const isOverdue = nowPktStr > commonEndTime;
                    return isOverdue ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1.5 rounded-xl w-full mt-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>⚠️ آج وصولی غائب (Missing Collection)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl w-full mt-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>وقت مقرر: {commonStartTime} تا {commonEndTime}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => openCustomer360(cust)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View History</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCustomer(cust);
                      setEditModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Customer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(cust)}
                    className={`p-1.5 rounded-lg transition ${
                      cust.status === 'active'
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={cust.status === 'active' ? 'Deactivate Customer' : 'Activate Customer'}
                  >
                    {cust.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(cust)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer 360 History Modal */}
      <Modal
        isOpen={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title={viewCustomer ? `${viewCustomer.name} (${viewCustomer.customer_code})` : 'Customer History'}
        subtitle={`Lifetime Collections Profile — ${viewCustomer?.area}`}
        maxWidth="2xl"
      >
        {viewCustomer && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Slips</p>
                <p className="text-xl font-bold text-slate-900 font-mono mt-1">{customerSlips.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-[10px] text-brand-700 uppercase font-bold">Total Net Weight</p>
                <p className="text-xl font-black text-brand-700 font-mono mt-1">
                  {formatWeight(customerSlips.reduce((acc, c) => acc + c.total_net_weight, 0))}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-[10px] text-amber-700 uppercase font-bold">Total Billed</p>
                <p className="text-xl font-black text-amber-700 font-mono mt-1">
                  {formatCurrency(customerSlips.reduce((acc, c) => acc + c.total_amount, 0))}
                </p>
              </div>
            </div>

            {/* Chicken Shop Financial & Khata Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase">
                  <Wallet className="w-4 h-4 text-blue-600" /> دکان کھاتہ و کسٹمر مالیات (Shop Financial Ledger)
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {viewCustomer.dokan_khata || viewCustomer.customer_khata || 'کھاتہ ایکٹو'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">دکان کھاتہ</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{viewCustomer.dokan_khata || '—'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">کسٹمر کھاتہ</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{viewCustomer.customer_khata || '—'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-rose-200 bg-rose-50/20">
                  <span className="text-[10px] text-rose-500 block uppercase font-bold">بقایہ رقم</span>
                  <span className="font-bold text-rose-700 font-mono mt-0.5 block">
                    Rs. {Number(viewCustomer.bakaya_raqam || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/20">
                  <span className="text-[10px] text-emerald-600 block uppercase font-bold">کل رقم</span>
                  <span className="font-black text-emerald-800 font-mono mt-0.5 block">
                    Rs. {Number(viewCustomer.total_raqam || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              {(viewCustomer.boles_weight || viewCustomer.thai_weight || viewCustomer.gosht_weight) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700 block">Boles (بونلیس):</span>
                    <span className="text-slate-600 font-mono text-[10px]">
                      {viewCustomer.boles_weight ?? 0} KG @ Rs. {viewCustomer.boles_rate ?? 0} = Rs. {Number(viewCustomer.boles_total || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700 block">Thai (تھائی):</span>
                    <span className="text-slate-600 font-mono text-[10px]">
                      {viewCustomer.thai_weight ?? 0} KG @ Rs. {viewCustomer.thai_rate ?? 0} = Rs. {Number(viewCustomer.thai_total || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700 block">Gosht (گوشت):</span>
                    <span className="text-slate-600 font-mono text-[10px]">
                      {viewCustomer.gosht_weight ?? 0} KG @ Rs. {viewCustomer.gosht_rate ?? 0} = Rs. {Number(viewCustomer.gosht_total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-brand-600" /> Recent Collection Slips
              </h4>

              {loadingHistory ? (
                <div className="py-12 flex justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                        <th className="py-2.5 px-3">Receipt No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Collector</th>
                        <th className="py-2.5 px-3 text-right">Net (KG)</th>
                        <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {customerSlips.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-brand-700 font-bold">{s.receipt_no}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-sans">{formatDate(s.collection_date)}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-sans">{s.worker?.full_name || 'System / Admin'}</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-bold">{s.total_net_weight}</td>
                          <td className="py-2.5 px-3 text-right text-amber-700 font-bold">{s.total_amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {customerSlips.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                            No collection history for this customer.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingCustomer?.id ? 'Edit Customer' : 'Add New Poultry Customer'}
        subtitle="Manage customer details, rate per KG, and contact information"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer / Shop Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Al-Madina Broilers"
              value={editingCustomer?.name || ''}
              onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), name: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer Code *
              </label>
              <input
                type="text"
                required
                value={editingCustomer?.customer_code || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), customer_code: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                Charbi Rate (چربی وزن) PKR/KG *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={editingCustomer?.rate_charbi ?? 55}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setEditingCustomer(prev => ({ ...(prev || {}), rate_charbi: val }));
                }}
                className="w-full bg-emerald-50/40 border border-emerald-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
                Kachara Rate (کچرا وزن) PKR/KG *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={editingCustomer?.rate_kachara ?? (editingCustomer?.rate_per_kg ?? 45)}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setEditingCustomer(prev => ({ ...(prev || {}), rate_kachara: val, rate_per_kg: val }));
                }}
                className="w-full bg-amber-50/40 border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Haji Rehman"
                value={editingCustomer?.contact_person || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), contact_person: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                placeholder="+92 300 0000000"
                value={editingCustomer?.phone || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), phone: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Area / Town *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Burewala"
                value={editingCustomer?.area || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), area: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={editingCustomer?.status || 'active'}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), status: e.target.value as any }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Shop Address / Landmark
            </label>
            <input
              type="text"
              placeholder="e.g. Main Bazaar, Near Old Grain Market"
              value={editingCustomer?.address || ''}
              onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), address: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          {/* Chicken Shop Financial & Khata Section (دکان کھاتہ و کسٹمر مالیات) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/90 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Chicken Shop Financial & Khata (دکان کھاتہ و کسٹمر مالیات)
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    دکان کھاتہ، کسٹمر کھاتہ، گوشت کے اوزان، ریٹ اور بقایہ جات کا حساب کتاب
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
                کھاتہ لیجر
              </span>
            </div>

            {/* Khata Identification Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Dokan Khata (دکان کھاتہ)
                </label>
                <input
                  type="text"
                  placeholder="مثال: کھاتہ # 12"
                  value={editingCustomer?.dokan_khata || ''}
                  onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), dokan_khata: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-urdu focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Khata (کسٹمر کھاتہ)
                </label>
                <input
                  type="text"
                  placeholder="کسٹمر کھاتہ تفصیل یا نمبر"
                  value={editingCustomer?.customer_khata || ''}
                  onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), customer_khata: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-urdu focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Boles, Thai, Gosht Rows */}
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                گوشت کی اقسام، اوزان اور ریٹس (Meat Categories, Weights & Rates)
              </label>

              {/* Boles */}
              <div className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="col-span-12 sm:col-span-4">
                  <span className="font-bold text-xs text-slate-900 block">Boles (بونلیس)</span>
                  <span className="text-[10px] text-slate-400">Boneless Chicken Meat</span>
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Weight (وزن KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={editingCustomer?.boles_weight ?? ''}
                    onChange={e => {
                      const w = e.target.value === '' ? ('' as any) : parseFloat(e.target.value) || 0;
                      const r = typeof editingCustomer?.boles_rate === 'number' ? editingCustomer.boles_rate : 0;
                      const tot = typeof w === 'number' && r ? Number((w * r).toFixed(2)) : null;
                      setEditingCustomer(prev => ({
                        ...(prev || {}),
                        boles_weight: w,
                        boles_total: tot,
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Rate (ریٹ PKR)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={editingCustomer?.boles_rate ?? ''}
                    onChange={e => {
                      const r = e.target.value === '' ? ('' as any) : parseFloat(e.target.value) || 0;
                      const w = typeof editingCustomer?.boles_weight === 'number' ? editingCustomer.boles_weight : 0;
                      const tot = typeof r === 'number' && w ? Number((w * r).toFixed(2)) : null;
                      setEditingCustomer(prev => ({
                        ...(prev || {}),
                        boles_rate: r,
                        boles_total: tot,
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Thai */}
              <div className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="col-span-12 sm:col-span-4">
                  <span className="font-bold text-xs text-slate-900 block">Thai (تھائی)</span>
                  <span className="text-[10px] text-slate-400">Chicken Thai Portions</span>
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Weight (وزن KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={editingCustomer?.thai_weight ?? ''}
                    onChange={e => {
                      const w = e.target.value === '' ? ('' as any) : parseFloat(e.target.value) || 0;
                      const r = typeof editingCustomer?.thai_rate === 'number' ? editingCustomer.thai_rate : 0;
                      const tot = typeof w === 'number' && r ? Number((w * r).toFixed(2)) : null;
                      setEditingCustomer(prev => ({
                        ...(prev || {}),
                        thai_weight: w,
                        thai_total: tot,
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Rate (ریٹ PKR)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={editingCustomer?.thai_rate ?? ''}
                    onChange={e => {
                      const r = e.target.value === '' ? ('' as any) : parseFloat(e.target.value) || 0;
                      const w = typeof editingCustomer?.thai_weight === 'number' ? editingCustomer.thai_weight : 0;
                      const tot = typeof r === 'number' && w ? Number((w * r).toFixed(2)) : null;
                      setEditingCustomer(prev => ({
                        ...(prev || {}),
                        thai_rate: r,
                        thai_total: tot,
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Gosht */}
              <div className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="col-span-12 sm:col-span-4">
                  <span className="font-bold text-xs text-slate-900 block">Gosht (گوشت)</span>
                  <span className="text-[10px] text-slate-400">Standard Broiler Meat</span>
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Weight (وزن KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={editingCustomer?.gosht_weight ?? ''}
                    onChange={e => {
                      const w = e.target.value === '' ? ('' as any) : parseFloat(e.target.value) || 0;
                      const r = typeof editingCustomer?.gosht_rate === 'number' ? editingCustomer.gosht_rate : 0;
                      const tot = typeof w === 'number' && r ? Number((w * r).toFixed(2)) : null;
                      setEditingCustomer(prev => ({
                        ...(prev || {}),
                        gosht_weight: w,
                        gosht_total: tot,
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Rate (ریٹ PKR)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={editingCustomer?.gosht_rate ?? ''}
                    onChange={e => {
                      const r = e.target.value === '' ? ('' as any) : parseFloat(e.target.value) || 0;
                      const w = typeof editingCustomer?.gosht_weight === 'number' ? editingCustomer.gosht_weight : 0;
                      const tot = typeof r === 'number' && w ? Number((w * r).toFixed(2)) : null;
                      setEditingCustomer(prev => ({
                        ...(prev || {}),
                        gosht_rate: r,
                        gosht_total: tot,
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Bakaya Raqam & Total Raqam Auto Calculated */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-rose-800 uppercase tracking-wider mb-1">
                  Bakaya Raqam (بقایہ رقم PKR)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={editingCustomer?.bakaya_raqam ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? ('' as any) : parseFloat(e.target.value) || 0;
                    setEditingCustomer(prev => ({
                      ...(prev || {}),
                      bakaya_raqam: val,
                    }));
                  }}
                  className="w-full bg-rose-50/40 border border-rose-300 rounded-xl px-3 py-2 text-xs text-rose-900 font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                  Total Raqam (کل رقم PKR - Auto Calculated)
                </label>
                {(() => {
                  const bTot = (parseFloat(String(editingCustomer?.boles_weight || 0)) || 0) * (parseFloat(String(editingCustomer?.boles_rate || 0)) || 0);
                  const tTot = (parseFloat(String(editingCustomer?.thai_weight || 0)) || 0) * (parseFloat(String(editingCustomer?.thai_rate || 0)) || 0);
                  const gTot = (parseFloat(String(editingCustomer?.gosht_weight || 0)) || 0) * (parseFloat(String(editingCustomer?.gosht_rate || 0)) || 0);
                  const bakaya = parseFloat(String(editingCustomer?.bakaya_raqam || 0)) || 0;
                  const autoTotal = Math.round(bTot + tTot + gTot + bakaya);
                  return (
                    <input
                      type="text"
                      readOnly
                      value={autoTotal > 0 ? `Rs. ${autoTotal.toLocaleString()}` : (editingCustomer?.total_raqam ? `Rs. ${Number(editingCustomer.total_raqam).toLocaleString()}` : 'Rs. 0')}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs text-emerald-900 font-mono font-black focus:outline-none cursor-default"
                    />
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Common Schedule Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>یہ دکان عمومی روزانہ وصولی شیڈول ({commonStartTime} تا {commonEndTime}) کے مطابق چلے گی۔</span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
