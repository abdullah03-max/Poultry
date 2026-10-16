// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Simplified Daily Sales (روزنامہ سیلز)
// Clean, Fast, Calendar-Driven Interface for Daily Sales, Naqd, Odhar & Wasooli
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  ChickenSale,
  ChickenProduct,
  FreshChickenArrival,
  ChickenPayment,
  ChickenCustomer,
  ChickenExpense,
} from './types';
import { formatDate } from '../utils/formatters';
import {
  Calendar,
  Search,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Banknote,
  Wallet,
  Scale,
  Plus,
  ArrowDownLeft,
  RefreshCw,
  FileText,
  Eye,
} from 'lucide-react';

interface DailySalesTabProps {
  sales: ChickenSale[];
  payments?: ChickenPayment[];
  customers?: ChickenCustomer[];
  products: ChickenProduct[];
  freshArrivals?: FreshChickenArrival[];
  expenses?: ChickenExpense[];
  onOpenReceipt: (sale: ChickenSale) => void;
  onDeleteSale: (sale: ChickenSale) => Promise<void>;
  onDeletePayment?: (payment: ChickenPayment) => Promise<void>;
  onNewSaleClick: (mode?: 'cash' | 'credit') => void;
  onOpenBulkWalkin?: (date?: string) => void;
  onOpenPaymentModal?: (customer?: ChickenCustomer | null) => void;
  onOpenFreshArrival?: () => void;
  onOpenMushtarkaKhata?: () => void;
}

export const DailySalesTab: React.FC<DailySalesTabProps> = ({
  sales,
  payments = [],
  customers = [],
  products,
  freshArrivals = [],
  expenses = [],
  onOpenReceipt,
  onDeleteSale,
  onDeletePayment,
  onNewSaleClick,
  onOpenBulkWalkin,
  onOpenPaymentModal,
  onOpenFreshArrival,
  onOpenMushtarkaKhata,
}) => {
  // Current local date in YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Selected date for daily review
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'sales' | 'payments'>('sales');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'credit' | 'partial'>('all');
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  // Quick Date Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const nextStr = d.toISOString().split('T')[0];
    if (nextStr <= todayStr) {
      setSelectedDate(nextStr);
    }
  };

  const isToday = selectedDate === todayStr;

  // Filter sales for the selected date
  const dateSales = useMemo(() => {
    return sales.filter(s => s.sale_date === selectedDate);
  }, [sales, selectedDate]);

  // Filter payments (wasooli) for the selected date
  const datePayments = useMemo(() => {
    return payments.filter(p => p.payment_date === selectedDate);
  }, [payments, selectedDate]);

  // Filtered sales matching search query and payment method
  const filteredSales = useMemo(() => {
    return dateSales.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.invoice_no.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        s.items.some(it => it.product_name.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (paymentMethodFilter === 'cash') return s.payment_method === 'cash';
      if (paymentMethodFilter === 'credit') return s.payment_method === 'credit';
      if (paymentMethodFilter === 'partial') return s.payment_method === 'partial';

      return true;
    });
  }, [dateSales, searchQuery, paymentMethodFilter]);

  // Filtered payments matching search
  const filteredPayments = useMemo(() => {
    return datePayments.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        p.voucher_no.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    });
  }, [datePayments, searchQuery]);

  // Filter expenses for the selected date
  const dateExpenses = useMemo(() => {
    return expenses.filter(e => e.date === selectedDate);
  }, [expenses, selectedDate]);

  // Daily Summary Stats for the selected date
  const dailyStats = useMemo(() => {
    const totalSalesAmount = dateSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const totalWeightKg = dateSales.reduce((acc, s) => acc + (s.total_weight_kg || 0), 0);
    const totalCashFromSales = dateSales.reduce((acc, s) => acc + (s.received_amount || 0), 0);
    const totalCreditFromSales = dateSales.reduce((acc, s) => acc + (s.remaining_due || 0), 0);
    const totalWasooli = datePayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const netCashInHand = totalCashFromSales + totalWasooli;
    const totalExpenses = dateExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const dailyDrawerCash = netCashInHand - totalExpenses;

    return {
      totalSalesAmount,
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalCashFromSales,
      totalCreditFromSales,
      totalWasooli,
      netCashInHand,
      totalExpenses,
      dailyDrawerCash,
      billsCount: dateSales.length,
      wasooliCount: datePayments.length,
      expensesCount: dateExpenses.length,
    };
  }, [dateSales, datePayments, dateExpenses]);

  // Handle Safe Sale Deletion
  const handleDeleteSaleClick = async (sale: ChickenSale) => {
    setDeletingSaleId(sale.id);
    try {
      await onDeleteSale(sale);
    } finally {
      setDeletingSaleId(null);
    }
  };

  // Formatted display date in Urdu / English
  const formattedDisplayDate = useMemo(() => {
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      return d.toLocaleDateString('ur-PK', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return formatDate(selectedDate);
    }
  }, [selectedDate]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & DATE PICKER NAVIGATOR                                 */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title and Date Picker Navigator */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight">
                  روزانہ سیلز و لین دین روزنامچہ
                </h2>
                <p className="text-xs text-slate-500">
                  {formattedDisplayDate} {isToday && <span className="text-emerald-600 font-bold font-urdu">(آج کا دن)</span>}
                </p>
              </div>
            </div>

            {/* Date Navigator Bar */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handlePrevDay}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                title="پچھلا دن"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="font-urdu">پچھلا دن</span>
              </button>

              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  max={todayStr}
                  onChange={e => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-600 cursor-pointer shadow-2xs"
                />
              </div>

              <button
                onClick={handleNextDay}
                disabled={isToday}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                  isToday
                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="اگلا دن"
              >
                <span className="font-urdu">اگلا دن</span>
                <ChevronLeft className="w-4 h-4" />
              </button>

              {!isToday && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs font-urdu transition shadow-2xs"
                >
                  آج پر جائیں
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNewSaleClick('cash')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 font-urdu"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>+ نیا بل (POS)</span>
            </button>

            {onOpenBulkWalkin && (
              <button
                onClick={() => onOpenBulkWalkin(selectedDate)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 font-urdu"
                title="تمام واک ان گاہکوں کی سیل یکمشت درج کریں"
              >
                <Plus className="w-4 h-4" />
                <span>+ واک ان بلک سیل</span>
              </button>
            )}

            {onOpenMushtarkaKhata && (
              <button
                type="button"
                onClick={onOpenMushtarkaKhata}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 font-urdu cursor-pointer"
                title="مشترکہ کھاتہ (چھوٹا ادھار 1-2 کلو)"
              >
                <Wallet className="w-4 h-4 text-purple-200" />
                <span>+ مشترکہ کھاتہ ادھار</span>
              </button>
            )}

            {onOpenPaymentModal && (
              <button
                onClick={() => onOpenPaymentModal(null)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition active:scale-95 font-urdu"
              >
                <Banknote className="w-4 h-4" />
                <span>+ وصولی درج کریں</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="صفحہ پرنٹ کریں"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. DAILY STATS SUMMARY CARDS                                          */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-urdu">
              کل سیلز رقم
            </span>
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-amber-700 font-mono">
              Rs. {dailyStats.totalSalesAmount.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {dailyStats.billsCount} بلز ریکارڈ
            </p>
          </div>
        </div>

        {/* Total Weight Sold */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider font-urdu">
              کل فروخت وزن (KG)
            </span>
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-blue-700 font-mono">
              {dailyStats.totalWeightKg.toLocaleString()} KG
            </p>
            <p className="text-[11px] text-blue-600 mt-0.5">
              اس تاریخ پر فروخت شدہ وزن
            </p>
          </div>
        </div>

        {/* Daily Cash Drawer Net Cash */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 p-4 rounded-3xl border-2 border-emerald-300 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-[11px] font-black uppercase tracking-wider font-urdu">
              کیش دراز نقد رقم (Drawer Cash)
            </span>
            <div className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-emerald-800 font-mono">
              Rs. {dailyStats.dailyDrawerCash.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5 font-urdu font-medium">
              کل نقد آمد: Rs. {dailyStats.netCashInHand.toLocaleString()} • اخراجات: Rs. {dailyStats.totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Credit Due on Bills */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-urdu">
              بقایا ادھار (آج کے بلز)
            </span>
            <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-rose-700 font-mono">
              Rs. {dailyStats.totalCreditFromSales.toLocaleString()}
            </p>
            <p className="text-[11px] text-rose-600 mt-0.5">
              کھاتہ داروں کے نام ادھار
            </p>
          </div>
        </div>
      </div>

      {/* Daily Cash Drawer Audit Reconciliation Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-600/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-emerald-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base font-urdu">
                کیش دراز یومیہ آڈٹ (Daily Drawer Cash Reconciliation)
              </h3>
              <p className="text-[11px] text-emerald-200/80 font-urdu">
                تاریخ ({formatDate(selectedDate)}): دکان کے کیش دراز میں نقد سیلز اور وصولی منہا دکان اخراجات
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider font-urdu block">
              دراز میں کل نقد رقم (Net Cash)
            </span>
            <span className="text-2xl font-black font-mono text-emerald-300">
              Rs. {dailyStats.dailyDrawerCash.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-xs">
          <div className="bg-white/10 rounded-2xl p-2.5">
            <span className="text-emerald-200 text-[11px] font-urdu block">1. نقد کاؤنٹر سیلز (+)</span>
            <span className="text-sm font-black font-mono text-white">Rs. {dailyStats.totalCashFromSales.toLocaleString()}</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-2.5">
            <span className="text-emerald-200 text-[11px] font-urdu block">2. گاہک کھاتہ وصولی (+)</span>
            <span className="text-sm font-black font-mono text-white">Rs. {dailyStats.totalWasooli.toLocaleString()}</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-2.5">
            <span className="text-rose-200 text-[11px] font-urdu block">3. دراز سے اخراجات (-)</span>
            <span className="text-sm font-black font-mono text-rose-300">Rs. {dailyStats.totalExpenses.toLocaleString()}</span>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-2.5">
            <span className="text-emerald-300 text-[11px] font-urdu font-bold block">کیش دراز بیلنس (=)</span>
            <span className="text-base font-black font-mono text-emerald-200">Rs. {dailyStats.dailyDrawerCash.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. FILTER & SEARCH CONTROLS                                           */}
      {/* ===================================================================== */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Toggle between Sales and Wasooli (Payments) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveView('sales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black font-urdu transition ${
              activeView === 'sales'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سیلز بلز ({dateSales.length})
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black font-urdu transition ${
              activeView === 'payments'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            کھاتہ وصولیاں ({datePayments.length})
          </button>
        </div>

        {/* Search Input & Payment Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {activeView === 'sales' && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setPaymentMethodFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition font-urdu ${
                  paymentMethodFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                تمام
              </button>
              <button
                onClick={() => setPaymentMethodFilter('cash')}
                className={`px-2.5 py-1 rounded-lg font-bold transition font-urdu ${
                  paymentMethodFilter === 'cash'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                صرف نقد
              </button>
              <button
                onClick={() => setPaymentMethodFilter('credit')}
                className={`px-2.5 py-1 rounded-lg font-bold transition font-urdu ${
                  paymentMethodFilter === 'credit'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                صرف ادھار
              </button>
            </div>
          )}

          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="تلاش بل نمبر، گاہک، آئٹم..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. CLEAN DATA TABLE                                                   */}
      {/* ===================================================================== */}
      {activeView === 'sales' ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3 text-center w-24">بل نمبر</th>
                  <th className="py-3 px-4 text-right">گاہک کا نام</th>
                  <th className="py-3 px-4 text-right">آئٹمز و کٹس</th>
                  <th className="py-3 px-3 text-center">وزن (KG)</th>
                  <th className="py-3 px-3 text-center">اوسط ریٹ</th>
                  <th className="py-3 px-3 text-center">کل رقم (Total)</th>
                  <th className="py-3 px-3 text-center">موصول (Paid)</th>
                  <th className="py-3 px-3 text-center">بقایا (Due)</th>
                  <th className="py-3 px-3 text-center">طریقہ</th>
                  <th className="py-3 px-4 text-center w-28">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400 font-urdu">
                      <p className="text-sm font-bold text-slate-600">
                        اس تاریخ ({formatDate(selectedDate)}) پر کوئی سیلز بل نہیں ملا
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        نیا بل بنانے کے لیے اوپر دیے گئے بٹن (+ نیا بل) پر کلک کریں۔
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, idx) => {
                    const avgRate =
                      sale.total_weight_kg > 0
                        ? Math.round(sale.subtotal / sale.total_weight_kg)
                        : '-';
                    const isDeleting = deletingSaleId === sale.id;

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-950">
                          {sale.invoice_no}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-900 block font-urdu">
                            {sale.customer_name}
                          </span>
                          {sale.phone && (
                            <span className="text-[10px] font-mono text-slate-400">{sale.phone}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-700 line-clamp-1">
                            {sale.items.map(it => `${it.product_name} (${it.weight_kg}kg)`).join(', ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">
                          {sale.total_weight_kg} KG
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {avgRate !== '-' ? `Rs. ${avgRate}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                          Rs. {sale.total_amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                          Rs. {sale.received_amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                          {sale.remaining_due > 0 ? `Rs. ${sale.remaining_due.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-urdu ${
                              sale.payment_method === 'cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sale.payment_method === 'credit'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sale.payment_method === 'cash'
                              ? 'نقد'
                              : sale.payment_method === 'credit'
                              ? 'ادھار'
                              : 'جزوی'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onOpenReceipt(sale)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition shadow-2xs"
                              title="مکمل تفصیلات دیکھیں (View Complete Details)"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                            <button
                              onClick={() => onOpenReceipt(sale)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title="رسید دیکھیں و پرنٹ کریں"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSaleClick(sale)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition disabled:opacity-50"
                              title="سیل ڈیلیٹ کریں (اسٹاک و کھاتہ خودکار بحال ہوگا)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer Summary Row */}
              {filteredSales.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-left font-urdu">
                      مجموعی میزان ({filteredSales.length} بلز):
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-blue-700 font-black">
                      {Number(filteredSales.reduce((s, r) => s + (r.total_weight_kg || 0), 0).toFixed(2))} KG
                    </td>
                    <td className="py-3 px-3 text-center">-</td>
                    <td className="py-3 px-3 text-center font-mono text-amber-700 font-black">
                      Rs. {filteredSales.reduce((s, r) => s + (r.total_amount || 0), 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700 font-black">
                      Rs. {filteredSales.reduce((s, r) => s + (r.received_amount || 0), 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-rose-700 font-black">
                      Rs. {filteredSales.reduce((s, r) => s + (r.remaining_due || 0), 0).toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* Wasooli (Payments) Table */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3 text-center w-24">واؤچر #</th>
                  <th className="py-3 px-4 text-right">گاہک کا نام</th>
                  <th className="py-3 px-3 text-center">وصول شدہ رقم</th>
                  <th className="py-3 px-3 text-center">طریقہ</th>
                  <th className="py-3 px-4 text-right">نوٹس / تفصیل</th>
                  <th className="py-3 px-4 text-center w-20">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-urdu">
                      <p className="text-sm font-bold text-slate-600">
                        اس تاریخ ({formatDate(selectedDate)}) پر کوئی رقم وصولی درج نہیں
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay, idx) => (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-800">
                        {pay.voucher_no}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-urdu">{pay.customer_name}</td>
                      <td className="py-3 px-3 text-center font-mono font-black text-emerald-700 text-sm">
                        Rs. {pay.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {pay.payment_method === 'cash' ? 'نقد' : pay.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{pay.notes || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {onDeletePayment && (
                          <button
                            onClick={() => onDeletePayment(pay)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                            title="وصولی ڈیلیٹ کریں"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredPayments.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-left font-urdu">
                      کل وصول شدہ رقم ({filteredPayments.length} واؤچرز):
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700 font-black text-sm">
                      Rs. {filteredPayments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
