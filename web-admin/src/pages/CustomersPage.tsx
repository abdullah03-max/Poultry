// =============================================================================
// SHAN POULTRY PROTEIN - Customer Management & 360 History Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { Customer, Collection, CustomerAdvanceRecord } from '../types/database';
import { formatWeight, formatCurrency, formatDate } from '../utils/formatters';
import {
  calculateCustomerAdvanceBalance,
  getExhaustedAdvanceCustomers,
  getCustomerAdvanceLedger,
} from '../utils/advanceUtils';
import { getCustomerDailyStatus, getDailyStatusSummary } from '../utils/customerDailyStatus';
import {
  Search,
  Plus,
  Phone,
  MapPin,
  Edit,
  History,
  UserX,
  UserCheck,
  Scale,
  Loader2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Wallet,
  Eye,
  FileText,
  Printer,
  Download,
  RefreshCw,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // All Collections & Advances for real-time ledger & advance subtraction
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [advanceRecords, setAdvanceRecords] = useState<CustomerAdvanceRecord[]>([]);

  // Customer 360 History Modal
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [customerSlips, setCustomerSlips] = useState<Collection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [active360Tab, setActive360Tab] = useState<'ledger' | 'slips' | 'advances' | 'profile'>('ledger');

  // Quick Add Advance Modal State
  const [advanceModalCustomer, setAdvanceModalCustomer] = useState<Customer | null>(null);
  const [newAdvanceAmount, setNewAdvanceAmount] = useState<number | ''>('');
  const [newAdvanceDate, setNewAdvanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newAdvanceMethod, setNewAdvanceMethod] = useState<'cash' | 'online' | 'bank'>('cash');
  const [newAdvanceNotes, setNewAdvanceNotes] = useState<string>('');
  const [savingAdvance, setSavingAdvance] = useState<boolean>(false);

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

  const fetchCustomers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const todayPktDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
      const [data, sett, todayColRes, allColRes, advRecords] = await Promise.all([
        api.getCustomers(true),
        api.getSettings(),
        api.getCollections({ startDate: todayPktDateStr, endDate: todayPktDateStr, limit: 1000 }),
        api.getCollections({ limit: 5000 }),
        api.getCustomerAdvances(),
      ]);
      setCustomers(data);
      setAllCollections(allColRes.collections || []);
      setAdvanceRecords(advRecords || []);
      if (sett.common_collection_start_time) setCommonStartTime(sett.common_collection_start_time);
      if (sett.common_collection_end_time) setCommonEndTime(sett.common_collection_end_time);

      const collectedIds = new Set(todayColRes.collections.map(c => c.customer_id));
      setTodayCollectedCustomerIds(collectedIds);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(true);

    // Real-Time subscription: Automatically reload collections & adjust balances when worker adds entries
    const channel = supabase
      .channel('admin-customers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        fetchCustomers(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers(false);
      })
      .subscribe();

    // 15s fallback poll
    const interval = setInterval(() => {
      fetchCustomers(false);
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const openCustomer360 = async (cust: Customer) => {
    setViewCustomer(cust);
    setActive360Tab('ledger');
    try {
      setLoadingHistory(true);
      const [res, advs] = await Promise.all([
        api.getCollections({ customerId: cust.id, limit: 1000 }),
        api.getCustomerAdvances(cust.id),
      ]);
      setCustomerSlips(res.collections || []);
      setAdvanceRecords(prev => [
        ...prev.filter(r => r.customer_id !== cust.id),
        ...(advs || []),
      ]);
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
    if (!editingCustomer.name || !editingCustomer.name.trim()) {
      alert('براہ کرم گاہک کا نام درج کریں (Please enter customer name)');
      return;
    }

    try {
      const charbiRate = editingCustomer.rate_charbi ?? 55.0;
      const kacharaRate = editingCustomer.rate_kachara ?? (editingCustomer.rate_per_kg ?? 45.0);
      const advAmt = editingCustomer.advance_amount != null ? parseFloat(String(editingCustomer.advance_amount)) : 0;

      const customerPayload: Partial<Customer> = {
        ...editingCustomer,
        name: editingCustomer.name.trim(),
        rate_charbi: charbiRate,
        rate_kachara: kacharaRate,
        rate_per_kg: kacharaRate,
        area: editingCustomer.area || 'General',
        advance_amount: advAmt > 0 ? advAmt : null,
        advance_date: editingCustomer.advance_date || new Date().toISOString().split('T')[0],
        advance_payment_method: editingCustomer.advance_payment_method || 'cash',
        advance_notes: editingCustomer.advance_notes || null,
        collection_start_time: editingCustomer.collection_start_time || null,
        collection_end_time: editingCustomer.collection_end_time || null,
        category_rates: {
          charbi: charbiRate,
          kachara: kacharaRate,
          customer_advance: {
            advance_amount: advAmt > 0 ? advAmt : null,
            advance_date: editingCustomer.advance_date || new Date().toISOString().split('T')[0],
            advance_payment_method: editingCustomer.advance_payment_method || 'cash',
            advance_notes: editingCustomer.advance_notes || null,
          },
          ...(editingCustomer.category_rates || {}),
        },
      };

      if (editingCustomer.id) {
        await api.updateCustomer(editingCustomer.id, customerPayload);
        // If advance was added on existing customer and not yet recorded in advance ledger
        if (advAmt > 0) {
          const existingAdv = advanceRecords.filter(r => r.customer_id === editingCustomer.id);
          if (existingAdv.length === 0) {
            await api.recordCustomerAdvance({
              customerId: editingCustomer.id,
              customerName: editingCustomer.name || 'Customer',
              amount: advAmt,
              date: editingCustomer.advance_date || new Date().toISOString().split('T')[0],
              paymentMethod: editingCustomer.advance_payment_method || 'cash',
              notes: editingCustomer.advance_notes || 'Advance added from customer profile edit',
              skipCustomerUpdate: true,
            });
          }
        }
      } else {
        const uniqueCode = editingCustomer.customer_code?.trim() || `CUST-${String(customers.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`;
        const created = await api.createCustomer({
          customer_code: uniqueCode,
          name: editingCustomer.name.trim(),
          contact_person: editingCustomer.contact_person || null,
          phone: editingCustomer.phone || '',
          alternate_phone: editingCustomer.alternate_phone || null,
          address: editingCustomer.address || null,
          area: editingCustomer.area || 'General',
          rate_per_kg: kacharaRate,
          rate_charbi: charbiRate,
          rate_kachara: kacharaRate,
          advance_amount: advAmt > 0 ? advAmt : null,
          advance_date: editingCustomer.advance_date || new Date().toISOString().split('T')[0],
          advance_payment_method: editingCustomer.advance_payment_method || 'cash',
          advance_notes: editingCustomer.advance_notes || null,
          collection_start_time: editingCustomer.collection_start_time || null,
          collection_end_time: editingCustomer.collection_end_time || null,
          category_rates: {
            charbi: charbiRate,
            kachara: kacharaRate,
            customer_advance: {
              advance_amount: advAmt > 0 ? advAmt : null,
              advance_date: editingCustomer.advance_date || new Date().toISOString().split('T')[0],
              advance_payment_method: editingCustomer.advance_payment_method || 'cash',
              advance_notes: editingCustomer.advance_notes || null,
            },
            ...(editingCustomer.category_rates || {}),
          },
          status: 'active',
          notes: editingCustomer.notes || null,
        });

        if (advAmt > 0) {
          await api.recordCustomerAdvance({
            customerId: created.id,
            customerName: created.name,
            amount: advAmt,
            date: editingCustomer.advance_date || new Date().toISOString().split('T')[0],
            paymentMethod: editingCustomer.advance_payment_method || 'cash',
            notes: editingCustomer.advance_notes || 'Initial advance paid to customer on onboarding',
            skipCustomerUpdate: true,
          });
        }
      }
      setEditModalOpen(false);
      setEditingCustomer(null);
      await fetchCustomers();
    } catch (err: any) {
      console.error('Failed to save customer:', err);
      alert('گاہک محفوظ کرنے میں مسئلہ پیش آیا: ' + (err?.message || 'Error saving customer'));
    }
  };

  const handleSaveNewAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceModalCustomer || !newAdvanceAmount || Number(newAdvanceAmount) <= 0) {
      alert('براہ کرم درست ایڈوانس رقم درج کریں (Enter valid advance amount)');
      return;
    }
    try {
      setSavingAdvance(true);
      await api.recordCustomerAdvance({
        customerId: advanceModalCustomer.id,
        customerName: advanceModalCustomer.name,
        amount: Number(newAdvanceAmount),
        date: newAdvanceDate,
        paymentMethod: newAdvanceMethod,
        notes: newAdvanceNotes,
      });
      setAdvanceModalCustomer(null);
      setNewAdvanceAmount('');
      setNewAdvanceNotes('');
      await fetchCustomers();
    } catch (err: any) {
      alert('ایڈوانس محفوظ کرنے میں مسئلہ: ' + (err.message || 'Error saving advance'));
    } finally {
      setSavingAdvance(false);
    }
  };

  const handleDeleteAdvance = async (advId: string) => {
    if (!confirm('کیا آپ واقعی یہ ایڈوانس اندراج ڈیلیٹ کرنا چاہتے ہیں؟ (Are you sure you want to delete this advance entry?)')) {
      return;
    }
    try {
      await api.deleteCustomerAdvance(advId);
      await fetchCustomers();
      if (viewCustomer) {
        const advs = await api.getCustomerAdvances(viewCustomer.id);
        setAdvanceRecords(prev => [
          ...prev.filter(r => r.customer_id !== viewCustomer.id),
          ...(advs || []),
        ]);
      }
    } catch (err: any) {
      alert('ایڈوانس ڈیلیٹ کرنے میں مسئلہ: ' + (err.message || 'Error'));
    }
  };

  const handlePrintCustomerStatement = (cust: Customer) => {
    const bal = calculateCustomerAdvanceBalance(cust, allCollections, advanceRecords);
    const ledger = getCustomerAdvanceLedger(cust, customerSlips, advanceRecords);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print statement.');
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8" />
        <title>Customer Ledger - ${cust.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; margin: 0; color: #1e293b; direction: rtl; }
          .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; color: #0f766e; }
          .header p { margin: 4px 0; font-size: 13px; color: #64748b; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; text-align: center; }
          .stat-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
          .stat-box .title { font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 4px; }
          .stat-box .val { font-size: 16px; font-weight: bold; color: #0f172a; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
          th { background: #f1f5f9; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; }
          td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; }
          .credit { color: #047857; font-weight: bold; font-family: monospace; }
          .debit { color: #b45309; font-weight: bold; font-family: monospace; }
          .balance { font-weight: bold; font-family: monospace; }
          .negative { color: #be123c; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>شان پولٹری پروٹین (SHAN POULTRY PROTEIN)</h1>
          <p>گاہک ایڈوانس و روزانہ ویسٹ کٹوتی کھاتہ (Customer Advance & Daily Deduction Statement)</p>
          <p style="font-weight: bold; color: #0f172a; margin-top: 6px;">
            دکان: ${cust.name} (${cust.customer_code}) • فون: ${cust.phone || '—'} • علاقہ: ${cust.area || '—'}
          </p>
          <p style="font-size: 11px;">تاریخ پرنٹ: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-grid">
          <div class="stat-box">
            <div class="title">کل ایڈوانس ادائیگی</div>
            <div class="val">Rs. ${bal.totalAdvance.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="title">کل وصول شدہ ویسٹ وزن</div>
            <div class="val">${bal.totalWasteWeight} KG</div>
          </div>
          <div class="stat-box">
            <div class="title">کل کٹوتی ویسٹ رقم</div>
            <div class="val">Rs. ${bal.totalWasteAmount.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="title">موجودہ باقی ایڈوانس بیلنس</div>
            <div class="val ${bal.remainingAdvance <= 0 ? 'negative' : ''}">Rs. ${bal.remainingAdvance.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>تاریخ (Date)</th>
              <th>تفصیل (Transaction / Slip)</th>
              <th>وزن (KG)</th>
              <th>ایڈوانس جمع (+)</th>
              <th>ویسٹ کٹوتی (-)</th>
              <th>باقی بیلنس (Running Balance)</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.map(e => `
              <tr>
                <td>${formatDate(e.date)}</td>
                <td>${e.title} - ${e.description}</td>
                <td>${e.weightKg != null ? e.weightKg + ' KG' : '—'}</td>
                <td class="credit">${e.credit ? '+Rs. ' + e.credit.toLocaleString() : '—'}</td>
                <td class="debit">${e.debit ? '-Rs. ' + e.debit.toLocaleString() : '—'}</td>
                <td class="balance ${e.runningBalance <= 0 ? 'negative' : ''}">Rs. ${e.runningBalance.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Shan Poultry Protein Management System • کمپیوٹرائزڈ لیجر اسٹیٹمنٹ</p>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
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
      {/* Advance Exhausted Alert Banner */}
      {(() => {
        const exhausted = getExhaustedAdvanceCustomers(customers, allCollections, advanceRecords);
        if (exhausted.length === 0) return null;
        return (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-rose-900 shadow-sm animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-200 text-rose-800 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h4 className="font-black text-sm text-rose-900 flex items-center gap-2">
                  <span>⚠️ ایڈوانس ختم الرٹ: {exhausted.length} گاہکوں کا ایڈوانس مکمل ختم ہو چکا ہے!</span>
                  <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    فوری توجہ
                  </span>
                </h4>
                <p className="text-xs text-rose-700 mt-1">
                  ان دکانوں سے روزانہ کچرا و چربی وصولی ان کے دیئے گئے ایڈوانس سے تجاوز کر چکی ہے۔ مزید مال اٹھانے کیلئے ان کا ایڈوانس فوری تجدید کریں۔
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {exhausted.map(ec => (
                    <button
                      key={ec.customerId}
                      type="button"
                      onClick={() => {
                        const c = customers.find(x => x.id === ec.customerId);
                        if (c) {
                          setAdvanceModalCustomer(c);
                          setNewAdvanceAmount('');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 shadow-2xs transition"
                    >
                      <span>{ec.customerName}</span>
                      <span className="font-mono text-rose-600 font-extrabold">(بقایا بل: Rs. {Math.abs(ec.remainingAdvance).toLocaleString()})</span>
                      <span className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded-lg font-black flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> نیا ایڈوانس
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Customer Section Summary KPI Stats */}
      {(() => {
        const totalCustomers = customers.length;
        const totalAdvances = customers.reduce((sum, c) => {
          const bal = calculateCustomerAdvanceBalance(c, allCollections, advanceRecords);
          return sum + bal.totalAdvance;
        }, 0);
        const totalRemaining = customers.reduce((sum, c) => {
          const bal = calculateCustomerAdvanceBalance(c, allCollections, advanceRecords);
          return sum + bal.remainingAdvance;
        }, 0);
        const exhaustedList = getExhaustedAdvanceCustomers(customers, allCollections, advanceRecords);
        const dailySummary = getDailyStatusSummary(customers, allCollections);

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 no-print">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">کل گاہک و دکانیں</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-slate-900 font-mono tracking-tight">{totalCustomers}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">رجسٹرڈ ویسٹ دکانیں</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">کل پیشگی ایڈوانس</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-emerald-700 font-mono tracking-tight">
                  Rs. {totalAdvances.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium truncate mt-0.5">تمام دکانوں کو ادا شدہ</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">باقی ایڈوانس کریڈٹ</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className={`text-xl font-black font-mono tracking-tight ${totalRemaining <= 0 ? 'text-rose-700' : 'text-indigo-700'}`}>
                  Rs. {totalRemaining.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">ویسٹ کٹوتی کے بعد باقی</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">ایڈوانس ختم دکانیں</span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className={`text-xl font-black font-mono tracking-tight ${exhaustedList.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  {exhaustedList.length}
                </p>
                <p className="text-[10px] text-rose-600 font-medium truncate mt-0.5">
                  {exhaustedList.length > 0 ? 'نیا ایڈوانس درکار ہے' : 'تمام ایڈوانس کلیئر'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">آج کی وصولی اسٹیٹس</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-slate-900 font-mono tracking-tight">
                  <span className="text-emerald-700">{dailySummary.completedCount}</span>
                  <span className="text-sm text-slate-400 font-normal"> / {totalCustomers}</span>
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  {dailySummary.pendingCount > 0 ? `🔴 ${dailySummary.pendingCount} دکانیں باقی ہیں` : '🟢 تمام وصولیاں مکمل'}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top Controls Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight font-urdu">
              ویسٹ گاہک و دکانیں ڈائریکٹری (Waste Customers & Shops)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تمام چکن شاپس، طے شدہ چربی و کچرا ریٹ، اور پیشگی ایڈوانس کھاتے کا انتظام
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
                advance_amount: null,
                advance_payment_method: 'cash',
                collection_start_time: '08:00',
                collection_end_time: '12:00',
                status: 'active',
              });
              setEditModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0 font-urdu"
          >
            <Plus className="w-4 h-4" />
            <span>+ نیا گاہک شامل کریں (Add Customer)</span>
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
        {(() => {
          const dailySummary = getDailyStatusSummary(customers, allCollections);
          return (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-600">
                  کل دکانیں: <strong className="text-slate-900 font-mono">{customers.length}</strong>
                </span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold">
                  🟢 وصولی مکمل: <strong className="text-emerald-950 font-mono">{dailySummary.completedCount}</strong>
                </span>
                <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg font-bold">
                  🔴 باقی دکانیں: <strong className="text-rose-950 font-mono">{dailySummary.pendingCount}</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                شیڈول ڈیڈ لائن: {commonEndTime}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Customers Cards / Directory */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-xs font-medium text-slate-500">Loading customer directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => {
            const dailyStatus = getCustomerDailyStatus(cust, allCollections);
            return (
              <div
                key={cust.id}
                className={`p-5 rounded-2xl border transition-all duration-200 shadow-card hover:shadow-card-hover flex flex-col justify-between ${
                  dailyStatus.isCompleted
                    ? 'bg-emerald-50/40 border-emerald-300/80 hover:border-emerald-400'
                    : cust.status === 'active'
                    ? 'bg-white border-slate-200/90 hover:border-slate-300'
                    : 'border-rose-200 bg-rose-50/20 opacity-80'
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

                  {/* Customer Advance Real-Time Balance & Reminder */}
                  {(() => {
                    const advBal = calculateCustomerAdvanceBalance(cust, allCollections, advanceRecords);
                    return (
                      <div className={`mt-2.5 p-2.5 rounded-xl border text-xs space-y-1.5 ${
                        advBal.isExhausted
                          ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                          : advBal.totalAdvance > 0
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>پیشگی ایڈوانس (Advance):</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdvanceModalCustomer(cust);
                              setNewAdvanceAmount('');
                            }}
                            className="text-[10px] font-black px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition flex items-center gap-1 active:scale-95"
                            title="گاہک کو نیا ایڈوانس دیں"
                          >
                            <Plus className="w-3 h-3" />
                            <span>ایڈوانس دیں</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-center border-t border-slate-200/60 font-semibold">
                          <div>
                            <span className="block text-slate-500 text-[9px]">کل ایڈوانس</span>
                            <span className="font-mono font-bold text-slate-900">
                              {advBal.totalAdvance > 0 ? `Rs. ${advBal.totalAdvance.toLocaleString()}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[9px]">کٹوتی ویسٹ</span>
                            <span className="font-mono font-bold text-amber-700">
                              {advBal.totalWasteAmount > 0 ? `Rs. ${advBal.totalWasteAmount.toLocaleString()}` : 'Rs. 0'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[9px]">باقی ایڈوانس</span>
                            <span className={`font-mono font-black ${
                              advBal.isExhausted ? 'text-rose-700' : advBal.totalAdvance > 0 ? 'text-emerald-700' : 'text-slate-500'
                            }`}>
                              {advBal.totalAdvance > 0 ? `Rs. ${advBal.remainingAdvance.toLocaleString()}` : '—'}
                            </span>
                          </div>
                        </div>

                        {advBal.isExhausted && (
                          <div className="pt-0.5 flex items-center justify-between text-[10px] font-black text-rose-700 animate-pulse">
                            <span>⚠️ ایڈوانس ختم ہو چکا ہے! (Advance Over)</span>
                            <span className="bg-rose-200 px-1 py-0.2 rounded text-[9px]">
                              بقایا بل: Rs. {Math.abs(advBal.remainingAdvance).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {advBal.status === 'ACTIVE' && (
                          <div className="pt-0.5 flex items-center justify-between text-[10px] font-semibold text-emerald-700">
                            <span>✓ بقایا ایڈوانس ریمائنڈر (Credit Active)</span>
                            <span>{advBal.totalWasteWeight} KG وزن کٹوتی</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Daily Completion Status Badge (24h Rolling Window & Daily Reset) */}
                  {(() => {
                    const dailyStatus = getCustomerDailyStatus(cust, allCollections);
                    return dailyStatus.isCompleted ? (
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl w-full mt-1.5 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>🟢 ریکارڈ مکمل (Completed)</span>
                        </div>
                        <span className="font-mono text-emerald-700 text-[10px]">
                          {dailyStatus.summaryText}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-300 px-3 py-1.5 rounded-xl w-full mt-1.5 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>🔴 ریکارڈ بقایہ (Pending Today)</span>
                        </div>
                        <span className="text-rose-600 text-[10px] font-semibold">
                          وقت مقرر: {commonStartTime} تا {commonEndTime}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openCustomer360(cust)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                  title="گاہک کی مکمل تفصیلات، وزن، رقم و ایڈوانس کھاتہ دیکھیں"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>تفصیلات (Details)</span>
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
                    title={cust.status === 'active' ? 'Suspend Customer' : 'Activate Customer'}
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
          );
        })}
      </div>
      )}

      {/* Complete Customer Details & 360 Financial History Modal */}
      <Modal
        isOpen={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title={viewCustomer ? `${viewCustomer.name} (${viewCustomer.customer_code})` : 'Customer Details'}
        subtitle={`مکمل کسٹمر پروفائل، روزانہ وصولی وزن، کٹوتی رقم و ایڈوانس کھاتہ — ${viewCustomer?.area || 'General'}`}
        maxWidth="4xl"
      >
        {viewCustomer && (() => {
          const bal = calculateCustomerAdvanceBalance(viewCustomer, allCollections, advanceRecords);
          const ledgerEntries = getCustomerAdvanceLedger(viewCustomer, customerSlips, advanceRecords);
          const custAdvances = advanceRecords.filter(r => r.customer_id === viewCustomer.id);

          return (
            <div className="space-y-4">
              {/* Customer Quick Header & Contact Bar */}
              <div className="p-3.5 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">{viewCustomer.customer_code}</span>
                    <h3 className="font-black text-slate-900 text-sm">{viewCustomer.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${viewCustomer.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {viewCustomer.status === 'active' ? 'فعال (ACTIVE)' : 'غیر فعال (INACTIVE)'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-[11px]">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {viewCustomer.phone || 'فون درج نہیں'}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {viewCustomer.area}</span>
                    <span>چربی ریٹ: <strong className="text-emerald-700 font-mono">Rs. {viewCustomer.rate_charbi ?? 55}</strong>/KG</span>
                    <span>کچرا ریٹ: <strong className="text-amber-700 font-mono">Rs. {viewCustomer.rate_kachara ?? (viewCustomer.rate_per_kg ?? 45)}</strong>/KG</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintCustomerStatement(viewCustomer)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95"
                    title="گاہک کا مکمل کھاتہ پرنٹ کریں"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>پرنٹ کھاتہ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdvanceModalCustomer(viewCustomer);
                      setNewAdvanceAmount('');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ نیا ایڈوانس دیں</span>
                  </button>
                </div>
              </div>

              {/* 4 Financial & Collection KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">کل دیا گیا ایڈوانس</p>
                  <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                    Rs. {bal.totalAdvance.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-slate-400">کل پیشگی رقم</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <p className="text-[10px] text-blue-700 uppercase font-bold">کل وصول شدہ وزن</p>
                  <p className="text-base font-black text-blue-700 font-mono mt-0.5">
                    {bal.totalWasteWeight} <span className="text-xs font-bold">KG</span>
                  </p>
                  <span className="text-[9px] text-blue-600">چربی + کچرا</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <p className="text-[10px] text-amber-700 uppercase font-bold">کل کٹوتی ویسٹ رقم</p>
                  <p className="text-base font-black text-amber-700 font-mono mt-0.5">
                    Rs. {bal.totalWasteAmount.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-amber-600">{customerSlips.length} پرچیاں وصول</span>
                </div>
                <div className={`p-3 rounded-2xl border shadow-2xs ${
                  bal.isExhausted ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'
                }`}>
                  <p className="text-[10px] uppercase font-black text-slate-700">موجودہ باقی ایڈوانس</p>
                  <p className={`text-base font-black font-mono mt-0.5 ${
                    bal.isExhausted ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    Rs. {bal.remainingAdvance.toLocaleString()}
                  </p>
                  <span className={`text-[9px] font-bold ${bal.isExhausted ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {bal.isExhausted ? '⚠️ ختم (بقایا بل واجب الادا)' : '✓ کریڈٹ فعال (باقی بیلنس)'}
                  </span>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActive360Tab('ledger')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      active360Tab === 'ledger'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>خودکار کٹوتی لیجر (Advance Ledger)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive360Tab('slips')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      active360Tab === 'slips'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>تمام وصولی پرچیاں ({customerSlips.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive360Tab('advances')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      active360Tab === 'advances'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>ایڈوانس ادائیگیاں ({custAdvances.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive360Tab('profile')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      active360Tab === 'profile'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>دکان معلومات و ریٹس</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Advance & Auto Deductions Ledger */}
              {active360Tab === 'ledger' && (
                <div>
                  {loadingHistory ? (
                    <div className="py-12 flex justify-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 shadow-2xs">
                          <tr className="border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                            <th className="py-2.5 px-3">تاریخ (Date)</th>
                            <th className="py-2.5 px-3">تفصیل (Transaction)</th>
                            <th className="py-2.5 px-3 text-right">وزن (KG)</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700">ایڈوانس جمع (+)</th>
                            <th className="py-2.5 px-3 text-right text-amber-800">ویسٹ کٹوتی (-)</th>
                            <th className="py-2.5 px-3 text-right">باقی بیلنس</th>
                            <th className="py-2.5 px-2 text-center">کارروائی</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {ledgerEntries.map(e => (
                            <tr key={e.id} className={`hover:bg-slate-50/80 ${e.type === 'ADVANCE_GIVEN' ? 'bg-emerald-50/30' : ''}`}>
                              <td className="py-2.5 px-3 text-slate-700 font-sans">{formatDate(e.date)}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className={`font-bold block ${e.type === 'ADVANCE_GIVEN' ? 'text-emerald-800' : 'text-slate-800'}`}>
                                  {e.title}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[240px]">{e.description}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                                {e.weightKg != null ? `${e.weightKg} KG` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-700 font-black">
                                {e.credit ? `+Rs. ${e.credit.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-800 font-black">
                                {e.debit ? `-Rs. ${e.debit.toLocaleString()}` : '—'}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-black ${
                                e.runningBalance <= 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}>
                                Rs. {e.runningBalance.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {e.type === 'ADVANCE_GIVEN' && e.id.startsWith('adv-') && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAdvance(e.id)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                    title="یہ ایڈوانس ڈیلیٹ کریں"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {ledgerEntries.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                                کوئی ایڈوانس یا وصولی ریکارڈ موجود نہیں ہے۔ ورکر جیسے ہی کلیکشن درج کرے گا، کٹوتی یہاں خود بخود ظاہر ہو جائے گی۔
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Raw Collection Slips */}
              {active360Tab === 'slips' && (
                <div>
                  {loadingHistory ? (
                    <div className="py-12 flex justify-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full min-w-[550px] text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 shadow-2xs">
                          <tr className="border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                            <th className="py-2.5 px-3">Receipt No</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Collector</th>
                            <th className="py-2.5 px-3">Breakdown</th>
                            <th className="py-2.5 px-3 text-right">Net (KG)</th>
                            <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {customerSlips.map(s => {
                            const cNet = Number(s.charbi_net || 0);
                            const kNet = Number(s.kachara_net || (cNet === 0 ? s.total_net_weight : 0));
                            return (
                              <tr key={s.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 text-brand-700 font-bold">{s.receipt_no}</td>
                                <td className="py-2.5 px-3 text-slate-700 font-sans">{formatDate(s.collection_date)}</td>
                                <td className="py-2.5 px-3 text-slate-700 font-sans">{s.worker?.full_name || 'Field Worker'}</td>
                                <td className="py-2.5 px-3 text-slate-600 font-sans text-[10px]">
                                  {cNet > 0 && <span className="text-emerald-700 font-bold mr-1">چربی: {cNet}KG</span>}
                                  {kNet > 0 && <span className="text-amber-700 font-bold">کچرا: {kNet}KG</span>}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-900 font-bold">{s.total_net_weight}</td>
                                <td className="py-2.5 px-3 text-right text-amber-700 font-bold">Rs. {s.total_amount.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                          {customerSlips.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                                اس گاہک کا کوئی وصولی ریکارڈ موجود نہیں ہے۔
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Advance Payments History */}
              {active360Tab === 'advances' && (
                <div>
                  <div className="max-h-80 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 shadow-2xs">
                        <tr className="border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                          <th className="py-2.5 px-3">تاریخ (Date)</th>
                          <th className="py-2.5 px-3">ایڈوانس رقم (Amount)</th>
                          <th className="py-2.5 px-3">طریقہ کار (Method)</th>
                          <th className="py-2.5 px-3">تفصیل / رسید نمبر</th>
                          <th className="py-2.5 px-2 text-center">کارروائی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {custAdvances.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-700 font-sans">{formatDate(a.date)}</td>
                            <td className="py-2.5 px-3 text-emerald-700 font-bold">Rs. {Number(a.amount).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-sans capitalize">{a.payment_method || 'Cash'}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-sans">{a.notes || '—'}</td>
                            <td className="py-2.5 px-2 text-center">
                              {a.id.startsWith('adv-') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdvance(a.id)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                  title="یہ ایڈوانس ڈیلیٹ کریں"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {custAdvances.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                              کوئی ایڈوانس ادائیگی درج نہیں ہے۔
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: Customer Profile & Rates */}
              {active360Tab === 'profile' && (
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-slate-400 font-semibold text-[10px]">دکان کا نام (Shop Name)</span>
                    <span className="font-bold text-slate-900 text-sm">{viewCustomer.name}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-semibold text-[10px]">کسٹمر کوڈ (Customer Code)</span>
                    <span className="font-mono font-bold text-slate-900">{viewCustomer.customer_code}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-semibold text-[10px]">رابطہ فون (Primary Phone)</span>
                    <span className="font-mono font-bold text-slate-900">{viewCustomer.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-semibold text-[10px]">متبادل فون (Alternate Phone)</span>
                    <span className="font-mono font-bold text-slate-900">{viewCustomer.alternate_phone || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-semibold text-[10px]">علاقہ و پتہ (Area / Address)</span>
                    <span className="font-bold text-slate-900">{viewCustomer.area} • {viewCustomer.address || 'Standard Address'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-semibold text-[10px]">اوقاتِ کار (Collection Hours)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {viewCustomer.collection_start_time || commonStartTime} تا {viewCustomer.collection_end_time || commonEndTime}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-semibold text-[10px]">طے شدہ چربی ریٹ (Charbi Rate)</span>
                    <span className="font-mono font-bold text-emerald-700">Rs. {viewCustomer.rate_charbi ?? 55} PKR/KG</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-semibold text-[10px]">طے شدہ کچرا ریٹ (Kachara Rate)</span>
                    <span className="font-mono font-bold text-amber-700">Rs. {viewCustomer.rate_kachara ?? (viewCustomer.rate_per_kg ?? 45)} PKR/KG</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Quick Add Advance Modal */}
      <Modal
        isOpen={!!advanceModalCustomer}
        onClose={() => {
          setAdvanceModalCustomer(null);
          setNewAdvanceAmount('');
          setNewAdvanceNotes('');
        }}
        title={`گاہک کو ایڈوانس رقم دیں — ${advanceModalCustomer?.name || ''}`}
        subtitle="پیشگی رقم ادا کریں، جیسے جیسے ویسٹ وصول ہو گا، رقم خود بخود منہا ہوتی رہے گی"
        maxWidth="md"
      >
        {advanceModalCustomer && (() => {
          const bal = calculateCustomerAdvanceBalance(advanceModalCustomer, allCollections, advanceRecords);
          const addAmt = Number(newAdvanceAmount) || 0;
          const projectedBal = bal.remainingAdvance + addAmt;

          return (
            <form onSubmit={handleSaveNewAdvance} className="space-y-4 text-xs">
              {/* Current Balance Snapshot */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-600 font-semibold">
                  <span>گاہک کوڈ و علاقہ:</span>
                  <span className="font-bold text-slate-900">{advanceModalCustomer.customer_code} • {advanceModalCustomer.area}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 font-semibold">
                  <span>پہلے کل ایڈوانس دیا گیا:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {bal.totalAdvance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-amber-800 font-semibold">
                  <span>کل وصول شدہ ویسٹ مال:</span>
                  <span className="font-mono font-bold">Rs. {bal.totalWasteAmount.toLocaleString()} ({bal.totalWasteWeight} KG)</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 font-bold">
                  <span>موجودہ باقی ایڈوانس:</span>
                  <span className={`font-mono text-sm ${bal.remainingAdvance <= 0 ? 'text-rose-700 font-black' : 'text-emerald-700'}`}>
                    {bal.remainingAdvance <= 0 ? `⚠️ ختم (بقایا بل: Rs. ${Math.abs(bal.remainingAdvance).toLocaleString()})` : `Rs. ${bal.remainingAdvance.toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Form Inputs */}
              <div>
                <label className="block font-bold text-emerald-900 uppercase tracking-wider mb-1">
                  نیا ایڈوانس رقم (New Advance Amount PKR) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="مثلاً: 70000 یا کوئی بھی رقم"
                  value={newAdvanceAmount}
                  onChange={e => setNewAdvanceAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-emerald-700 focus:outline-none focus:border-emerald-600 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    تاریخ ادائیگی (Payment Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={newAdvanceDate}
                    onChange={e => setNewAdvanceDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    طریقہ کار (Method) *
                  </label>
                  <select
                    value={newAdvanceMethod}
                    onChange={e => setNewAdvanceMethod(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-600"
                  >
                    <option value="cash">💵 کیش / نقد (Cash)</option>
                    <option value="online">📱 آن لائن / ایزی پیسہ (Online)</option>
                    <option value="bank">🏦 بینک ٹرانسفر (Bank)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  تفصیل / رسید نمبر (Notes / Receipt Ref)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: رسید نمبر #204، ایڈوانس تجدید"
                  value={newAdvanceNotes}
                  onChange={e => setNewAdvanceNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              {addAmt > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold flex justify-between items-center">
                  <span>نیا متوقع ایڈوانس بیلنس:</span>
                  <span className="font-mono text-sm font-black text-emerald-700">
                    Rs. {projectedBal.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdvanceModalCustomer(null);
                    setNewAdvanceAmount('');
                    setNewAdvanceNotes('');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={savingAdvance || !newAdvanceAmount || Number(newAdvanceAmount) <= 0}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingAdvance ? 'محفوظ ہو رہا ہے...' : 'ایڈوانس محفوظ کریں (Save Advance)'}</span>
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingCustomer?.id ? 'Edit Customer' : 'Add New Poultry Customer'}
        subtitle="Manage customer details, rate per KG, agreed advance, and contact information"
        maxWidth="md"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                Charbi Rate (چربی وزن) PKR/KG *
              </label>
              <input
                type="number"
                step="any"
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
                step="any"
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

          {/* Customer Advance Field */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                💵 گاہک کو ایڈوانس رقم (Customer Advance Payment PKR)
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                روزانہ کٹوتی
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ایڈوانس رقم (Advance Amount PKR)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="مثلاً: 50000"
                  value={editingCustomer?.advance_amount ?? ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setEditingCustomer(prev => ({ ...(prev || {}), advance_amount: val }));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  طریقہ کار (Payment Method)
                </label>
                <select
                  value={editingCustomer?.advance_payment_method || 'cash'}
                  onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), advance_payment_method: e.target.value as any }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                >
                  <option value="cash">💵 کیش / نقد (Cash)</option>
                  <option value="online">📱 آن لائن / ایزی پیسہ (Online)</option>
                  <option value="bank">🏦 بینک ٹرانسفر (Bank)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                تفصیل / رسید نمبر (Notes / Receipt Ref)
              </label>
              <input
                type="text"
                placeholder="مثلاً: ابتدائی پیشگی ادائیگی برائے ویسٹ وصولی"
                value={editingCustomer?.advance_notes || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), advance_notes: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <p className="text-[11px] text-emerald-800 leading-snug">
              ℹ️ یہ ایڈوانس گاہک کے کھاتے میں جمع ہو جائے گا۔ جیسے جیسے ورکر کچرا و چربی وصول کرے گا، روزانہ بل اس ایڈوانس سے منہا (Subtract) ہوتا رہے گا۔
            </p>
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
