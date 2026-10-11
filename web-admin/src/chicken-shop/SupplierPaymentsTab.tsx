// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Supplier Payments & Khata Records
// Dedicated Section for Managing Fresh Chicken Farm & Supplier Invoices & Payments
// =============================================================================

import React, { useState, useMemo } from 'react';
import { FreshChickenArrival, SupplierPaymentItem } from './types';
import { formatDate } from '../utils/formatters';
import {
  Truck,
  DollarSign,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Banknote,
  Receipt,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SupplierPaymentsTabProps {
  arrivals: FreshChickenArrival[];
  onRecordPayment: (
    arrivalId: string,
    payment: {
      amount: number;
      date?: string;
      payment_method?: 'cash' | 'bank' | 'online' | 'cheque';
      notes?: string;
    }
  ) => Promise<void>;
  onDeleteArrival?: (arrival: FreshChickenArrival) => Promise<void>;
  onOpenArrivalModal: () => void;
}

export const SupplierPaymentsTab: React.FC<SupplierPaymentsTabProps> = ({
  arrivals,
  onRecordPayment,
  onDeleteArrival,
  onOpenArrivalModal,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'partial' | 'paid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Modal State for adding payment installment
  const [payingArrival, setPayingArrival] = useState<FreshChickenArrival | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank' | 'online' | 'cheque'>('cash');
  const [payNotes, setPayNotes] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  // Expanded history rows
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Overall stats
  const stats = useMemo(() => {
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalPayable = 0;
    let dueCount = 0;

    arrivals.forEach(a => {
      const cost = Number(a.total_cost || 0);
      const paid = Number(a.paid_amount || 0);
      const rem = Number(a.remaining_payable ?? Math.max(0, cost - paid));
      totalPurchases += cost;
      totalPaid += paid;
      totalPayable += rem;
      if (rem > 0) dueCount++;
    });

    return {
      totalPurchases,
      totalPaid,
      totalPayable,
      dueCount,
      totalCount: arrivals.length,
    };
  }, [arrivals]);

  // Filtered arrivals
  const filteredArrivals = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    return arrivals.filter(a => {
      // Date filter
      if (dateFilter === 'today' && a.date !== today) return false;
      if (dateFilter === 'week' && a.date < sevenDaysAgo) return false;
      if (dateFilter === 'month' && a.date < thirtyDaysAgo) return false;

      // Status filter
      const rem = Number(a.remaining_payable ?? Math.max(0, (a.total_cost || 0) - (a.paid_amount || 0)));
      const paid = Number(a.paid_amount || 0);
      if (statusFilter === 'due' && rem <= 0) return false;
      if (statusFilter === 'partial' && (rem <= 0 || paid <= 0)) return false;
      if (statusFilter === 'paid' && rem > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sName = (a.supplier_name || '').toLowerCase();
        const sPhone = (a.supplier_phone || '').toLowerCase();
        const sNotes = (a.notes || '').toLowerCase();
        if (!sName.includes(q) && !sPhone.includes(q) && !sNotes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [arrivals, dateFilter, statusFilter, searchQuery]);

  // Open Payment Modal
  const handleOpenPayment = (arrival: FreshChickenArrival) => {
    setPayingArrival(arrival);
    const rem = Number(arrival.remaining_payable ?? Math.max(0, (arrival.total_cost || 0) - (arrival.paid_amount || 0)));
    setPayAmount(rem > 0 ? String(rem) : '');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('cash');
    setPayNotes('');
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingArrival) return;
    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      alert('براہ کرم درست ادائیگی رقم درج کریں');
      return;
    }

    try {
      setSubmittingPayment(true);
      await onRecordPayment(payingArrival.id, {
        amount: amountNum,
        date: payDate,
        payment_method: payMethod,
        notes: payNotes.trim() || undefined,
      });
      setPayingArrival(null);
    } catch (err: any) {
      alert(`ادائیگی محفوظ کرنے میں خرابی: ${err.message || 'Error recording payment'}`);
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-urdu tracking-tight">
                سپلائر و فارم ادائیگی رجسٹر (Supplier Khata)
              </h2>
              <p className="text-xs text-slate-500 font-urdu mt-0.5">
                تازہ چکن آمد، سپلائر ادائیگی، بقایا واجبات اور اقساط کا مکمل حساب
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenArrivalModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-urdu font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ نئی تازہ چکن آمد و لاٹ</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block font-urdu">
            کل سپلائر خریداری رقم
          </span>
          <span className="text-base sm:text-xl font-black font-mono text-slate-900 block mt-1">
            Rs. {stats.totalPurchases.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
            {stats.totalCount} کل لاٹس
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 block font-urdu">
            کل ادا شدہ رقم (Paid)
          </span>
          <span className="text-base sm:text-xl font-black font-mono text-emerald-700 block mt-1">
            Rs. {stats.totalPaid.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-600 font-urdu mt-0.5 block">
            فارمز کو ادائیگی مکمل
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/90 bg-rose-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 block font-urdu">
              کل بقایا واجب الادا رقم
            </span>
            {stats.dueCount > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-600 text-white rounded-md font-mono">
                {stats.dueCount} واجب
              </span>
            )}
          </div>
          <span className="text-base sm:text-xl font-black font-mono text-rose-700 block mt-1">
            Rs. {stats.totalPayable.toLocaleString()}
          </span>
          <span className="text-[10px] text-rose-600 font-urdu mt-0.5 block">
            {stats.totalPayable === 0 ? 'ماشاءاللہ تمام کھاتہ کلیئر ✓' : 'بقایا فارم ادھار'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block font-urdu">
            واجب الادا سپلائر لاٹس
          </span>
          <span className="text-base sm:text-xl font-black font-mono text-slate-800 block mt-1">
            {stats.dueCount} / {stats.totalCount}
          </span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5 block">
            {stats.dueCount === 0 ? '100% ادائیگی مکمل' : 'غیر ادا شدہ یا جزوی'}
          </span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="سپلائر نام، فون یا تفصیل سے تلاش کریں..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-600 font-urdu"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold font-urdu rounded-xl transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              تمام ({arrivals.length})
            </button>
            <button
              onClick={() => setStatusFilter('due')}
              className={`px-3 py-1.5 text-xs font-bold font-urdu rounded-xl transition ${
                statusFilter === 'due'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              واجب الادا ({stats.dueCount})
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1.5 text-xs font-bold font-urdu rounded-xl transition ${
                statusFilter === 'partial'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              جزوی ادا شدہ
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 text-xs font-bold font-urdu rounded-xl transition ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              مکمل ادا شدہ
            </button>
          </div>
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] font-urdu">
          <span className="text-slate-500 font-bold">مدت:</span>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-2 py-0.5 rounded-lg font-bold transition ${
              dateFilter === 'all' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            تمام ریکارڈ
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-2 py-0.5 rounded-lg font-bold transition ${
              dateFilter === 'today' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            آج
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-2 py-0.5 rounded-lg font-bold transition ${
              dateFilter === 'week' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            گزشتہ 7 دن
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-2 py-0.5 rounded-lg font-bold transition ${
              dateFilter === 'month' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            گزشتہ 30 دن
          </button>
        </div>
      </div>

      {/* Supplier Invoices List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 font-urdu">
            سپلائر آمد و ادائیگی فہرست ({filteredArrivals.length} لاٹس)
          </span>
        </div>

        {filteredArrivals.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-urdu">
            کوئی سپلائر ریکارڈ نہیں ملا۔
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-urdu font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">تاریخ آمد</th>
                  <th className="py-3 px-4">سپلائر تفصیلات</th>
                  <th className="py-3 px-4 text-center">وزن و خرید ریٹ</th>
                  <th className="py-3 px-4 text-center">کل لاگت رقم</th>
                  <th className="py-3 px-4 text-center">ادا شدہ رقم</th>
                  <th className="py-3 px-4 text-center">بقایا واجب الادا</th>
                  <th className="py-3 px-4 text-center">ادائیگی حالت</th>
                  <th className="py-3 px-4 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArrivals.map(a => {
                  const cost = Number(a.total_cost || 0);
                  const paid = Number(a.paid_amount || 0);
                  const remaining = Number(a.remaining_payable ?? Math.max(0, cost - paid));
                  const isExpanded = expandedRowId === a.id;
                  const history = a.payment_history || [];

                  return (
                    <React.Fragment key={a.id}>
                      <tr className="hover:bg-slate-50/80 transition group">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                          <div>{a.date}</div>
                          <div className="text-[10px] text-slate-400">{a.time || ''}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 font-urdu">
                            {a.supplier_name || 'تازہ فارم سپلائر'}
                          </div>
                          {a.supplier_phone && (
                            <div className="font-mono text-[10px] text-slate-500">
                              {a.supplier_phone}
                            </div>
                          )}
                          {a.notes && (
                            <div className="text-[10px] text-slate-400 font-urdu truncate max-w-xs">
                              {a.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="font-bold text-blue-700">{a.weight_kg} KG</span>
                          <span className="text-[10px] text-slate-400 block">
                            @ Rs. {a.rate_per_kg} / KG
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                          Rs. {cost.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                          Rs. {paid.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-black">
                          <span
                            className={
                              remaining > 0 ? 'text-rose-600' : 'text-emerald-700'
                            }
                          >
                            Rs. {remaining.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {remaining === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-urdu">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>مکمل ادا شدہ</span>
                            </span>
                          ) : paid > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-urdu">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>جزوی ادائیگی</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-urdu">
                              <AlertTriangle className="w-3 h-3 text-rose-700" />
                              <span>غیر ادا شدہ</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Pay button */}
                            {remaining > 0 && (
                              <button
                                onClick={() => handleOpenPayment(a)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-urdu font-bold text-[11px] transition shadow-2xs active:scale-95 flex items-center gap-1"
                                title="سپلائر کو رقم ادا کریں"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>ادائیگی</span>
                              </button>
                            )}

                            {/* View History toggle */}
                            {history.length > 0 && (
                              <button
                                onClick={() =>
                                  setExpandedRowId(isExpanded ? null : a.id)
                                }
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
                                title="ادائیگیوں کی تاریخ دیکھیں"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Delete button */}
                            {onDeleteArrival && (
                              <button
                                onClick={() => onDeleteArrival(a)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="آمد لاگ حذف کریں (اسٹاک خودکار ریورس ہو جائے گا)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable History Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={8} className="p-4">
                            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs max-w-2xl mx-auto">
                              <span className="text-xs font-black text-slate-800 font-urdu block mb-2">
                                📜 ادائیگیوں کی تاریخ (Payment History):
                              </span>
                              <div className="space-y-1.5">
                                {history.map((h, i) => (
                                  <div
                                    key={h.id || i}
                                    className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                                        {i + 1}
                                      </span>
                                      <span className="font-mono text-slate-600 font-medium">
                                        {h.date}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-urdu">
                                        {h.payment_method === 'cash'
                                          ? 'نقد'
                                          : h.payment_method === 'bank'
                                          ? 'بینک'
                                          : h.payment_method === 'online'
                                          ? 'آن لائن'
                                          : 'چیک'}
                                      </span>
                                      {h.notes && (
                                        <span className="text-[10px] text-slate-500 font-urdu italic">
                                          ({h.notes})
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono font-black text-emerald-700">
                                      Rs. {h.amount.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* RECORD PAYMENT MODAL                                                  */}
      {/* ===================================================================== */}
      {payingArrival && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                  💵
                </div>
                <div>
                  <h3 className="text-base font-black font-urdu">
                    سپلائر کو رقم ادائیگی (Pay Supplier)
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-urdu">
                    {payingArrival.supplier_name || 'تازہ فارم سپلائر'} — لاٹ تاریخ: {payingArrival.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayingArrival(null)}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              {/* Snapshot of invoice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-urdu">کل لاگت</span>
                  <span className="font-mono font-bold text-slate-800">
                    Rs. {payingArrival.total_cost.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-urdu">سابقہ ادا شدہ</span>
                  <span className="font-mono font-bold text-emerald-700">
                    Rs. {(payingArrival.paid_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-urdu">بقایا واجب الادا</span>
                  <span className="font-mono font-black text-rose-600">
                    Rs. {(payingArrival.remaining_payable ?? (payingArrival.total_cost - (payingArrival.paid_amount || 0))).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount to Pay */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                  ادائیگی رقم (Amount in PKR) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={payingArrival.remaining_payable ?? (payingArrival.total_cost - (payingArrival.paid_amount || 0))}
                    step="1"
                    required
                    autoFocus
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="ادائیگی رقم درج کریں"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    PKR
                  </span>
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                    تاریخ ادائیگی
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                    طریقہ ادائیگی
                  </label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="cash">💵 نقد کیش (Cash)</option>
                    <option value="bank">🏦 بینک اکاؤنٹ (Bank)</option>
                    <option value="online">📱 آن لائن (Online)</option>
                    <option value="cheque">📜 چیک (Cheque)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                  نوٹس / تفصیل (اختیاری)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="مثال: بینک ٹرانسفر رسید نمبر یا چیک تفصیل"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingArrival(null)}
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  منسوخ
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-200 active:scale-95 disabled:opacity-50 font-urdu"
                >
                  {submittingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>محفوظ ہو رہا ہے...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ادائیگی محفوظ کریں</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
