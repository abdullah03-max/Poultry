// =============================================================================
// SHAN POULTRY PROTEIN - Comprehensive Reports & Profit & Loss Statement Page
// Financial P&L, factory revenue vs procurement cost & operating expenses
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Collection, Customer, Profile, FactoryTransaction, Expense } from '../types/database';
import { formatDate, formatWeight, formatCurrency } from '../utils/formatters';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Scale,
  HardHat,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Fuel,
  Users,
  Truck,
  Receipt,
  PieChart,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { exportToCSV, triggerPrint } from '../utils/exportUtils';

export const ReportsPage: React.FC = () => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'pnl' | 'collections'>('pnl');
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(today);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [factoryTransactions, setFactoryTransactions] = useState<FactoryTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [colRes, facTxList, expList] = await Promise.all([
        api.getCollections({ startDate, endDate, limit: 3000 }),
        api.getFactoryTransactions(),
        api.getExpenses(),
      ]);

      setCollections(colRes.collections);
      // Filter factory tx and expenses by date range
      const filteredFacTx = facTxList.filter(t => t.transaction_date >= startDate && t.transaction_date <= endDate);
      const filteredExp = expList.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);

      setFactoryTransactions(filteredFacTx);
      setExpenses(filteredExp);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  // Quick Preset Handlers
  const handleSetPreset = (preset: 'today' | 'week' | 'month') => {
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
      setStartDate(monday);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  // 1. Collections Procurement Stats
  const totalCollections = collections.length;
  const totalNetWeight = collections.reduce((acc, c) => acc + c.total_net_weight, 0);
  const totalGrossWeight = collections.reduce((acc, c) => acc + c.gross_weight, 0);
  const totalCustomerCost = collections.reduce((acc, c) => acc + c.total_amount, 0);

  // 2. Factory Revenue Stats
  const totalFactoryRevenue = factoryTransactions.reduce((acc, t) => acc + (t.total_amount || 0), 0);
  const totalFactoryWeight = factoryTransactions.reduce((acc, t) => acc + (t.total_weight || 0), 0);
  const totalFactoryReceived = factoryTransactions.reduce((acc, t) => acc + (t.received_amount || 0), 0);

  // 3. Operating Expenses Stats
  const totalOperatingExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const fuelExpenses = expenses.filter(e => e.category === 'fuel').reduce((acc, e) => acc + (e.amount || 0), 0);
  const salaryExpenses = expenses.filter(e => e.category === 'worker').reduce((acc, e) => acc + (e.amount || 0), 0);
  const transportExpenses = expenses.filter(e => e.category === 'transportation' || e.category === 'loading').reduce((acc, e) => acc + (e.amount || 0), 0);
  const otherExpenses = totalOperatingExpenses - (fuelExpenses + salaryExpenses + transportExpenses);

  // 4. Financial Net Profit / Loss Calculation
  // Total Income = Factory Sales Revenue
  // Total Costs = Customer Procurement Cost + Operating Expenses
  const totalCosts = totalCustomerCost + totalOperatingExpenses;
  const netProfitOrLoss = totalFactoryRevenue - totalCosts;
  const isProfitable = netProfitOrLoss >= 0;
  const profitMargin = totalFactoryRevenue > 0 ? (netProfitOrLoss / totalFactoryRevenue) * 100 : 0;

  // Customer aggregations
  const customerSummary: Record<string, { customer: Customer; weight: number; count: number; amount: number }> = {};
  collections.forEach(c => {
    if (c.customer) {
      if (!customerSummary[c.customer_id]) {
        customerSummary[c.customer_id] = { customer: c.customer, weight: 0, count: 0, amount: 0 };
      }
      customerSummary[c.customer_id].weight += c.total_net_weight;
      customerSummary[c.customer_id].count += 1;
      customerSummary[c.customer_id].amount += c.total_amount;
    }
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Financial Metric', 'Amount (PKR)'];
    const rows = [
      ['Date Range', `${startDate} to ${endDate}`],
      ['Total Factory Revenue (سیلز آمدن)', totalFactoryRevenue],
      ['Customer Procurement Cost (خریداری لاگت)', totalCustomerCost],
      ['Operating Expenses (آپریشنل اخراجات)', totalOperatingExpenses],
      ['Fuel / Diesel (ڈیزل)', fuelExpenses],
      ['Salaries / Advances (تنخواہیں)', salaryExpenses],
      ['Transport & Labor (ٹرانسپورٹ و مزدوری)', transportExpenses],
      ['Other Expenses (متفرق)', otherExpenses],
      ['Net Profit / Loss (خالص نفع یا نقصان)', netProfitOrLoss],
      ['Profit Margin (%)', `${profitMargin.toFixed(1)}%`],
    ];
    exportToCSV(`SHAN_POULTRY_PNL_${startDate}_to_${endDate}`, headers, rows);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Header & Range Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-card space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Reports & Financial Profit/Loss (رپورٹس و نفع نقصان)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Analyze operational profitability: Factory Revenue vs. Customer Procurement Cost and Operating Expenses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* Date Filter & Presets */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetPreset('today')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              آج (Today)
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('week')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              اس ہفتے (This Week)
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('month')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 transition"
            >
              اس مہینے (This Month)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500 font-semibold">شروع:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500 font-semibold">اختتام:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('pnl')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-1.5 ${
            activeTab === 'pnl'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>منافع و نقصان گوشوارہ (Profit & Loss Statement)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('collections')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-1.5 ${
            activeTab === 'collections'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>کولیکشن و کسٹمرز سمری (Collections Summary)</span>
        </button>
      </div>

      {/* TAB 1: PROFIT & LOSS STATEMENT */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          {/* Main Net Profit / Loss Banner */}
          <div className={`rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isProfitable
              ? 'bg-gradient-to-r from-emerald-800 to-teal-800'
              : 'bg-gradient-to-r from-rose-800 to-red-800'
          }`}>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/90 flex items-center gap-1.5">
                {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isProfitable ? 'خالص منافع (NET PROFIT)' : 'خالص نقصان (NET LOSS)'} — {formatDate(startDate)} تا {formatDate(endDate)}
              </span>
              <h3 className="text-3xl font-black font-mono tracking-tight text-white">
                {isProfitable ? '+' : ''}{formatCurrency(netProfitOrLoss)}
              </h3>
              <p className="text-xs text-white/80 max-w-lg leading-relaxed">
                کل فیکٹری سیلز آمدن میں سے کسٹمر خریداری لاگت اور تمام آپریشنل اخراجات منہا کرنے کے بعد کی گئی خالص بچت۔
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-center shrink-0 min-w-[160px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">پرافٹ مارجن</span>
              <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                {profitMargin.toFixed(1)}%
              </span>
              <span className="text-[10px] text-white/70 block mt-0.5">
                {isProfitable ? 'مثبت کارکردگی' : 'توجہ طلب خسارہ'}
              </span>
            </div>
          </div>

          {/* Three Pillars Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Factory Revenue */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  1. کل آمدن (Factory Sales)
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  Revenue
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-700 font-mono">{formatCurrency(totalFactoryRevenue)}</p>
              <div className="text-xs text-slate-500 space-y-1 pt-1 font-mono">
                <div className="flex justify-between">
                  <span>فیکٹریوں کو سپلائی وزن:</span>
                  <strong className="text-slate-800">{formatWeight(totalFactoryWeight)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>نقد موصول رقم:</span>
                  <strong className="text-slate-800">{formatCurrency(totalFactoryReceived)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>سپلائی انوائسز تعداد:</span>
                  <strong className="text-slate-800">{factoryTransactions.length} رسیدیں</strong>
                </div>
              </div>
            </div>

            {/* 2. Customer Procurement Cost */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-600" />
                  2. خریداری لاگت (Customer Cost)
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                  Purchase
                </span>
              </div>
              <p className="text-2xl font-black text-amber-700 font-mono">{formatCurrency(totalCustomerCost)}</p>
              <div className="text-xs text-slate-500 space-y-1 pt-1 font-mono">
                <div className="flex justify-between">
                  <span>دکانوں سے کل وصول وزن:</span>
                  <strong className="text-slate-800">{formatWeight(totalNetWeight)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>کلیکشن سلپس کی تعداد:</span>
                  <strong className="text-slate-800">{totalCollections} سلپس</strong>
                </div>
                <div className="flex justify-between">
                  <span>فعال دکانیں / گاہک:</span>
                  <strong className="text-slate-800">{Object.keys(customerSummary).length} دکانیں</strong>
                </div>
              </div>
            </div>

            {/* 3. Operating Expenses */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  3. آپریشنل اخراجات (Expenses)
                </span>
                <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                  Outflows
                </span>
              </div>
              <p className="text-2xl font-black text-rose-700 font-mono">{formatCurrency(totalOperatingExpenses)}</p>
              <div className="text-xs text-slate-500 space-y-1 pt-1 font-mono">
                <div className="flex justify-between">
                  <span>گاڑی ڈیزل و فیول:</span>
                  <strong className="text-slate-800">{formatCurrency(fuelExpenses)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>ورکر تنخواہیں و ایڈوانس:</span>
                  <strong className="text-slate-800">{formatCurrency(salaryExpenses)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>کرایہ و لودنگ مزدوری:</span>
                  <strong className="text-slate-800">{formatCurrency(transportExpenses)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                مکمل مالیاتی گوشوارہ (Detailed Profit & Loss Breakdown)
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                {startDate} تا {endDate}
              </span>
            </div>

            <table className="w-full text-xs">
              <thead className="bg-slate-100/70 font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left">شعبہ (Account Head)</th>
                  <th className="py-2.5 px-4 text-right">رقم (PKR)</th>
                  <th className="py-2.5 px-4 text-left">تفصیل / وضاحتی نوٹ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="bg-emerald-50/20">
                  <td className="py-3 px-4 font-sans font-bold text-emerald-900">
                    (+) فیکٹری سیلز آمدن (Factory Deliveries Revenue)
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                    {formatCurrency(totalFactoryRevenue)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500">
                    چربی و کچرا مال فیکٹریوں کو سپلائی کر کے حاصل شدہ انوائس ویلیو
                  </td>
                </tr>

                <tr className="bg-amber-50/20">
                  <td className="py-3 px-4 font-sans font-bold text-amber-900">
                    (-) دکانوں سے خریداری مالیت (Customer Raw Purchases)
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-amber-700">
                    {formatCurrency(totalCustomerCost)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500">
                    فیلڈ کلیکٹرز کی طرف سے چکن شاپس کو کی جانے والی کل ادائیگیاں
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-700 pl-8">
                    • گاڑی کا ڈیزل و پیٹرول (Fuel / Diesel)
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-700">
                    {formatCurrency(fuelExpenses)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-400">مال اٹھانے والی گاڑیوں کا ایندھن</td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-700 pl-8">
                    • ورکر تنخواہیں و ایڈوانس (Collector Wages & Salary)
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-700">
                    {formatCurrency(salaryExpenses)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-400">فیلڈ ورکرز و اسٹاف کو ادائیگیاں</td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-700 pl-8">
                    • کرایہ گاڑی و لودنگ مزدوری (Transport & Freight)
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-700">
                    {formatCurrency(transportExpenses)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-400">ٹرانسپورٹ اور لودنگ/ان لوڈنگ</td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-700 pl-8">
                    • دیگر متفرق اخراجات (Other Operational Expenses)
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-700">
                    {formatCurrency(otherExpenses)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-400">کھانا پینا، گاڑی مرمت، اور بل بجلی</td>
                </tr>

                <tr className="bg-rose-50/20 font-bold">
                  <td className="py-3 px-4 font-sans text-rose-900">
                    (=) کل آپریشنل لاگت و اخراجات (Total Procurement & Expenses)
                  </td>
                  <td className="py-3 px-4 text-right text-rose-700 text-sm">
                    {formatCurrency(totalCosts)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500">
                    خریداری مالیت + آپریشنل اخراجات کا مجموعہ
                  </td>
                </tr>
              </tbody>
              <tfoot className={`border-t-2 ${isProfitable ? 'bg-emerald-100/70 border-emerald-300' : 'bg-rose-100/70 border-rose-300'}`}>
                <tr>
                  <td className="py-3.5 px-4 font-sans font-black text-slate-900 text-sm">
                    خالص نفع یا نقصان (NET PROFIT / LOSS)
                  </td>
                  <td className={`py-3.5 px-4 text-right font-black font-mono text-base ${isProfitable ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {isProfitable ? '+' : ''}{formatCurrency(netProfitOrLoss)}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-bold text-slate-700">
                    پرافٹ مارجن: {profitMargin.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COLLECTIONS & CUSTOMER BREAKDOWN */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-card">
              <span className="text-xs font-semibold uppercase text-slate-500">کل خالص وزن (Net KG)</span>
              <p className="text-2xl font-black text-blue-700 font-mono mt-1">{formatWeight(totalNetWeight)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-card">
              <span className="text-xs font-semibold uppercase text-slate-500">کل خریداری رقم (PKR)</span>
              <p className="text-2xl font-black text-amber-700 font-mono mt-1">{formatCurrency(totalCustomerCost)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-card">
              <span className="text-xs font-semibold uppercase text-slate-500">کل سلپس (Slips)</span>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1">{totalCollections}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-card">
              <span className="text-xs font-semibold uppercase text-slate-500">فعال دکانیں (Shops)</span>
              <p className="text-2xl font-black text-emerald-700 font-mono mt-1">{Object.keys(customerSummary).length}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                کسٹمر سمری گوشوارہ ({Object.keys(customerSummary).length} دکانیں)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">کوڈ</th>
                    <th className="py-3 px-4">کسٹمر / دکان کا نام</th>
                    <th className="py-3 px-4">علاقہ</th>
                    <th className="py-3 px-4 text-center">سلپس تعداد</th>
                    <th className="py-3 px-4 text-right">خالص وزن (KG)</th>
                    <th className="py-3 px-4 text-right">ٹوٹل رقم (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Object.values(customerSummary).map(cs => (
                    <tr key={cs.customer.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-blue-600">{cs.customer.customer_code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 font-sans">{cs.customer.name}</td>
                      <td className="py-3 px-4 text-slate-500 font-sans">{cs.customer.area}</td>
                      <td className="py-3 px-4 text-center text-slate-700">{cs.count}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">
                        {formatWeight(cs.weight, '')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-700">
                        {formatCurrency(cs.amount, '')}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(customerSummary).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                        اس منتخب کردہ تاریخ میں کوئی وصولی ریکارڈ نہیں ہوئی۔
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
