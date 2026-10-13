// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Calendar-Based Reports Tab
// Comprehensive Financial, Sales, Fresh Chicken Stock & Freezer Stock Reports
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  ChickenSale,
  FreshChickenArrival,
  ChickenProduct,
  FreezerProduct,
  ChickenExpense,
  ChickenCustomer,
} from './types';
import { formatDate } from '../utils/formatters';
import {
  TrendingUp,
  Calendar,
  Printer,
  Plus,
  Trash2,
  ShoppingBag,
  Truck,
  Snowflake,
  Scale,
  Banknote,
  Wallet,
  DollarSign,
  Layers,
  FileText,
  AlertCircle,
  Package,
} from 'lucide-react';

interface ProfitLossTabProps {
  sales: ChickenSale[];
  freshArrivals: FreshChickenArrival[];
  products: ChickenProduct[];
  freezerProducts?: FreezerProduct[];
  expenses: ChickenExpense[];
  customers: ChickenCustomer[];
  onAddExpense: () => void;
  onDeleteExpense: (id: string) => Promise<void>;
  onDeleteFreshArrival?: (arrival: FreshChickenArrival) => Promise<void>;
}

export const ProfitLossTab: React.FC<ProfitLossTabProps> = ({
  sales,
  freshArrivals,
  products,
  freezerProducts = [],
  expenses,
  customers,
  onAddExpense,
  onDeleteExpense,
  onDeleteFreshArrival,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Selection mode: 'single_day' | 'date_range'
  const [dateMode, setDateMode] = useState<'single_day' | 'date_range'>('single_day');
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [rangeStartDate, setRangeStartDate] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [rangeEndDate, setRangeEndDate] = useState<string>(todayStr);

  // Active view tab inside Reports:
  // 'summary' | 'fresh_stock' | 'freezer_stock' | 'daily_ledger' | 'expenses'
  const [activeReportTab, setActiveReportTab] = useState<
    'summary' | 'fresh_stock' | 'freezer_stock' | 'daily_ledger' | 'expenses'
  >('summary');

  // Quick preset helper
  const handleApplyPreset = (preset: 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'last_month' | 'all') => {
    const now = new Date();
    if (preset === 'today') {
      setDateMode('single_day');
      setSingleDate(todayStr);
    } else if (preset === 'yesterday') {
      setDateMode('single_day');
      const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      setSingleDate(y);
    } else if (preset === 'last_7_days') {
      setDateMode('date_range');
      setRangeStartDate(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
      setRangeEndDate(todayStr);
    } else if (preset === 'this_month') {
      setDateMode('date_range');
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setRangeStartDate(start);
      setRangeEndDate(todayStr);
    } else if (preset === 'last_month') {
      setDateMode('date_range');
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setRangeStartDate(start);
      setRangeEndDate(end);
    } else if (preset === 'all') {
      setDateMode('date_range');
      setRangeStartDate('2020-01-01');
      setRangeEndDate(todayStr);
    }
  };

  // Check if a date string falls inside the selected range/day
  const isDateInFilter = (dateStr: string) => {
    if (dateMode === 'single_day') {
      return dateStr === singleDate;
    }
    return dateStr >= rangeStartDate && dateStr <= rangeEndDate;
  };

  // ---------------------------------------------------------------------------
  // Filtered Datasets from Database
  // ---------------------------------------------------------------------------
  const filteredSales = useMemo(() => {
    return sales.filter(s => isDateInFilter(s.sale_date));
  }, [sales, dateMode, singleDate, rangeStartDate, rangeEndDate]);

  const filteredArrivals = useMemo(() => {
    return freshArrivals.filter(a => isDateInFilter(a.date));
  }, [freshArrivals, dateMode, singleDate, rangeStartDate, rangeEndDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => isDateInFilter(e.date));
  }, [expenses, dateMode, singleDate, rangeStartDate, rangeEndDate]);

  // Live fresh chicken product
  const freshChickenProduct = useMemo(() => {
    return (
      products.find(
        p => p.id === 'prod-fresh-chicken' || p.name.toLowerCase().includes('fresh chicken')
      ) || products[0]
    );
  }, [products]);

  // Combined freezer product list (from prop or filtered products)
  const allFreezerProducts = useMemo(() => {
    if (freezerProducts && freezerProducts.length > 0) {
      return freezerProducts;
    }
    return (products.filter(p => p.category === 'Freezer Stock') as unknown) as FreezerProduct[];
  }, [freezerProducts, products]);

  // ---------------------------------------------------------------------------
  // Financial & Sales Calculations
  // ---------------------------------------------------------------------------
  const financials = useMemo(() => {
    const totalGrossSales = filteredSales.reduce((acc, s) => acc + (s.subtotal || 0), 0);
    const totalDiscount = filteredSales.reduce((acc, s) => acc + (s.discount || 0), 0);
    const netSalesRevenue = filteredSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const totalCashReceived = filteredSales.reduce((acc, s) => acc + (s.received_amount || 0), 0);
    const totalCreditDue = filteredSales.reduce((acc, s) => acc + (s.remaining_due || 0), 0);
    const totalWeightKg = Number(
      filteredSales.reduce((acc, s) => acc + (s.total_weight_kg || 0), 0).toFixed(2)
    );
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Approximate cost of goods sold based on arrivals rate or standard ~82%
    const latestFreshArrivalRate = freshArrivals[0]?.rate_per_kg || 380;
    let totalCostOfGoods = 0;
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        const costRate =
          it.product_id === 'prod-fresh-chicken'
            ? latestFreshArrivalRate
            : Math.round(it.rate_per_kg * 0.82);
        totalCostOfGoods += Math.round((it.weight_kg || 0) * costRate);
      });
    });

    const grossProfit = Math.max(0, netSalesRevenue - totalCostOfGoods);
    const netProfit = grossProfit - totalExpenses;

    return {
      totalGrossSales,
      totalDiscount,
      netSalesRevenue,
      totalCashReceived,
      totalCreditDue,
      totalWeightKg,
      totalExpenses,
      totalCostOfGoods,
      grossProfit,
      netProfit,
      billsCount: filteredSales.length,
    };
  }, [filteredSales, filteredExpenses, freshArrivals]);

  // ---------------------------------------------------------------------------
  // Fresh Chicken Isolated Report
  // ---------------------------------------------------------------------------
  const freshReport = useMemo(() => {
    // Arrivals in period
    const receivedKg = Number(
      filteredArrivals.reduce((acc, a) => acc + (a.weight_kg || 0), 0).toFixed(2)
    );
    const totalCost = filteredArrivals.reduce((acc, a) => acc + (a.total_cost || 0), 0);
    const avgPurchaseRate = receivedKg > 0 ? Math.round(totalCost / receivedKg) : 0;

    // Sales of fresh chicken in period
    let soldKg = 0;
    let soldRevenue = 0;
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        if (
          it.product_id === 'prod-fresh-chicken' ||
          it.product_name.toLowerCase().includes('fresh chicken') ||
          (it.urdu_name && it.urdu_name.includes('تازہ مرغی'))
        ) {
          soldKg += it.weight_kg || 0;
          soldRevenue += it.line_total || 0;
        }
      });
    });
    soldKg = Number(soldKg.toFixed(2));
    const avgSellingRate = soldKg > 0 ? Math.round(soldRevenue / soldKg) : freshChickenProduct?.rate_per_kg || 0;

    // Remaining live fresh chicken stock from database
    const remainingStockKg = Number((freshChickenProduct?.stock_kg || 0).toFixed(2));

    return {
      receivedKg,
      totalCost,
      avgPurchaseRate,
      soldKg,
      soldRevenue,
      avgSellingRate,
      remainingStockKg,
      arrivalsCount: filteredArrivals.length,
    };
  }, [filteredArrivals, filteredSales, freshChickenProduct]);

  // ---------------------------------------------------------------------------
  // Freezer Stock Isolated Report
  // ---------------------------------------------------------------------------
  const freezerReport = useMemo(() => {
    const freezerProductIds = new Set(allFreezerProducts.map(p => p.id));

    // Per-product breakdown in period
    const productStatsMap = new Map<
      string,
      {
        id: string;
        name: string;
        urdu_name: string;
        rate_per_kg: number;
        current_stock_kg: number;
        sold_kg: number;
        revenue: number;
      }
    >();

    allFreezerProducts.forEach(fp => {
      productStatsMap.set(fp.id, {
        id: fp.id,
        name: fp.name,
        urdu_name: fp.urdu_name || fp.name,
        rate_per_kg: fp.rate_per_kg,
        current_stock_kg: Number((fp.stock_kg || 0).toFixed(2)),
        sold_kg: 0,
        revenue: 0,
      });
    });

    let totalFreezerSoldKg = 0;
    let totalFreezerRevenue = 0;

    filteredSales.forEach(s => {
      s.items.forEach(it => {
        const prodKey = it.product_id || it.product_name;
        const isFreezerItem =
          it.is_freezer ||
          (it.product_id ? freezerProductIds.has(it.product_id) : false) ||
          it.product_name.toLowerCase().includes('frozen') ||
          it.product_name.toLowerCase().includes('freezer');

        if (isFreezerItem) {
          totalFreezerSoldKg += it.weight_kg || 0;
          totalFreezerRevenue += it.line_total || 0;

          const existing = productStatsMap.get(prodKey);
          if (existing) {
            existing.sold_kg += it.weight_kg || 0;
            existing.revenue += it.line_total || 0;
          } else {
            productStatsMap.set(prodKey, {
              id: prodKey,
              name: it.product_name,
              urdu_name: it.urdu_name || it.product_name,
              rate_per_kg: it.rate_per_kg,
              current_stock_kg: 0,
              sold_kg: it.weight_kg || 0,
              revenue: it.line_total || 0,
            });
          }
        }
      });
    });

    totalFreezerSoldKg = Number(totalFreezerSoldKg.toFixed(2));
    const totalRemainingFreezerStock = Number(
      allFreezerProducts.reduce((acc, p) => acc + (p.stock_kg || 0), 0).toFixed(2)
    );

    const breakdown = Array.from(productStatsMap.values()).map(b => ({
      ...b,
      sold_kg: Number(b.sold_kg.toFixed(2)),
    }));

    return {
      totalFreezerSoldKg,
      totalFreezerRevenue,
      totalRemainingFreezerStock,
      breakdown,
    };
  }, [allFreezerProducts, filteredSales]);

  // ---------------------------------------------------------------------------
  // Daily Breakdown Table for the Selected Range
  // ---------------------------------------------------------------------------
  const dailyBreakdown = useMemo(() => {
    const map: Record<
      string,
      {
        date: string;
        weight_kg: number;
        sales: number;
        cash: number;
        credit: number;
        expenses: number;
        bills_count: number;
      }
    > = {};

    filteredSales.forEach(s => {
      const d = s.sale_date;
      if (!map[d]) {
        map[d] = {
          date: d,
          weight_kg: 0,
          sales: 0,
          cash: 0,
          credit: 0,
          expenses: 0,
          bills_count: 0,
        };
      }
      map[d].weight_kg = Number((map[d].weight_kg + (s.total_weight_kg || 0)).toFixed(2));
      map[d].sales += s.total_amount || 0;
      map[d].cash += s.received_amount || 0;
      map[d].credit += s.remaining_due || 0;
      map[d].bills_count += 1;
    });

    filteredExpenses.forEach(e => {
      const d = e.date;
      if (!map[d]) {
        map[d] = {
          date: d,
          weight_kg: 0,
          sales: 0,
          cash: 0,
          credit: 0,
          expenses: 0,
          bills_count: 0,
        };
      }
      map[d].expenses += e.amount || 0;
    });

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSales, filteredExpenses]);

  // Display label for current selected period
  const periodLabel = useMemo(() => {
    if (dateMode === 'single_day') {
      return formatDate(singleDate);
    }
    return `${formatDate(rangeStartDate)} تا ${formatDate(rangeEndDate)}`;
  }, [dateMode, singleDate, rangeStartDate, rangeEndDate]);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & CALENDAR DATE SELECTION CONTROLS                      */}
      {/* ===================================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl shadow-xs shrink-0">
                📊
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-xl font-black text-slate-900 font-urdu tracking-tight">
                    کیلنڈر و جامع مالیاتی رپورٹس
                  </h2>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-sans px-2.5 py-0.5 rounded-full font-bold">
                    Calendar-Based Reports
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-urdu mt-0.5">
                  منتخب مدت: <strong className="text-slate-800 font-mono">{periodLabel}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onAddExpense}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
            >
              <Plus className="w-4 h-4" />
              <span>+ نیا خرچہ درج کریں</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
            >
              <Printer className="w-4 h-4" />
              <span>رپورٹ پرنٹ کریں</span>
            </button>
          </div>
        </div>

        {/* Date Mode and Calendar Pickers */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1 text-xs font-bold font-urdu">
            <span className="text-slate-400 text-xs px-1">تیز فلٹر:</span>
            <button
              onClick={() => handleApplyPreset('today')}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              آج
            </button>
            <button
              onClick={() => handleApplyPreset('yesterday')}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              گزشتہ کل
            </button>
            <button
              onClick={() => handleApplyPreset('last_7_days')}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              گزشتہ 7 دن
            </button>
            <button
              onClick={() => handleApplyPreset('this_month')}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              موجودہ ماہ
            </button>
            <button
              onClick={() => handleApplyPreset('last_month')}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              گزشتہ ماہ
            </button>
            <button
              onClick={() => handleApplyPreset('all')}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              سب
            </button>
          </div>

          {/* Calendar Picker Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode switch */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold font-urdu">
              <button
                onClick={() => setDateMode('single_day')}
                className={`px-3 py-1 rounded-lg transition ${
                  dateMode === 'single_day'
                    ? 'bg-white text-emerald-800 shadow-2xs font-black'
                    : 'text-slate-600'
                }`}
              >
                مخصوص دن (Single Day)
              </button>
              <button
                onClick={() => setDateMode('date_range')}
                className={`px-3 py-1 rounded-lg transition ${
                  dateMode === 'date_range'
                    ? 'bg-white text-emerald-800 shadow-2xs font-black'
                    : 'text-slate-600'
                }`}
              >
                مدت (Date Range)
              </button>
            </div>

            {/* Actual Date Pickers */}
            {dateMode === 'single_day' ? (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <input
                  type="date"
                  value={singleDate}
                  max={todayStr}
                  onChange={e => e.target.value && setSingleDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500 font-urdu">شروع:</span>
                <input
                  type="date"
                  value={rangeStartDate}
                  max={rangeEndDate}
                  onChange={e => e.target.value && setRangeStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
                />
                <span className="text-slate-500 font-urdu">ختم:</span>
                <input
                  type="date"
                  value={rangeEndDate}
                  max={todayStr}
                  onChange={e => e.target.value && setRangeEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-REPORT NAVIGATION TABS                                         */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveReportTab('summary')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black font-urdu transition ${
            activeReportTab === 'summary'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>مالیاتی خلاصہ (Overview P&L)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('fresh_stock')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black font-urdu transition ${
            activeReportTab === 'fresh_stock'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scale className="w-4 h-4 text-amber-300" />
          <span>تازہ چکن اسٹاک و فروخت (Fresh Chicken)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('freezer_stock')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black font-urdu transition ${
            activeReportTab === 'freezer_stock'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Snowflake className="w-4 h-4 text-cyan-200" />
          <span>فریزر اسٹاک و فروخت (Freezer Stock)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('daily_ledger')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black font-urdu transition ${
            activeReportTab === 'daily_ledger'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>روزانہ سیلز کھاتہ فہرست (Daily Ledger)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('expenses')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black font-urdu transition ${
            activeReportTab === 'expenses'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>دکان کے اخراجات ({filteredExpenses.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 3. REPORT TAB CONTENTS                                                */}
      {/* ===================================================================== */}

      {/* VIEW 1: EXECUTIVE FINANCIAL SUMMARY */}
      {activeReportTab === 'summary' && (
        <div className="space-y-5 animate-fadeIn">
          {/* 4 Core Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Revenue */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-urdu">
                کل خالص فروخت آمدن
              </span>
              <p className="text-xl font-black text-amber-700 font-mono mt-2">
                Rs. {financials.netSalesRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {financials.billsCount} بلز • {financials.totalWeightKg} KG فروخت
              </p>
            </div>

            {/* Cash vs Credit */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-urdu">
                نقد وصولی بمقابلہ ادھار
              </span>
              <p className="text-xl font-black text-emerald-700 font-mono mt-2">
                Rs. {financials.totalCashReceived.toLocaleString()}
              </p>
              <p className="text-[10px] text-rose-600 mt-0.5 font-bold">
                بقایا ادھار: Rs. {financials.totalCreditDue.toLocaleString()}
              </p>
            </div>

            {/* Expenses */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider font-urdu">
                کل دکان اخراجات
              </span>
              <p className="text-xl font-black text-rose-700 font-mono mt-2">
                Rs. {financials.totalExpenses.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {filteredExpenses.length} اخراجات واؤچرز
              </p>
            </div>

            {/* Estimated Net Profit */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-urdu">
                تخمینی خالص منافع (Net Profit)
              </span>
              <p className={`text-xl font-black font-mono mt-2 ${financials.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                Rs. {financials.netProfit.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                فروخت آمدن منہا لاگت و اخراجات
              </p>
            </div>
          </div>

          {/* Quick Dual Cards: Fresh Chicken vs Freezer Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fresh Chicken Overview */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-3xl border border-amber-200/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐔</span>
                  <h3 className="font-extrabold text-base text-amber-950 font-urdu">
                    تازہ چکن اسٹاک و فروخت خلاصہ
                  </h3>
                </div>
                <button
                  onClick={() => setActiveReportTab('fresh_stock')}
                  className="text-xs font-bold text-amber-800 hover:underline font-urdu"
                >
                  تفصیل دیکھیں →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/80 p-3 rounded-2xl">
                  <span className="text-slate-500 block font-urdu">آمد (Received):</span>
                  <strong className="text-sm font-mono text-blue-700">{freshReport.receivedKg} KG</strong>
                </div>
                <div className="bg-white/80 p-3 rounded-2xl">
                  <span className="text-slate-500 block font-urdu">فروخت (Sold):</span>
                  <strong className="text-sm font-mono text-emerald-700">{freshReport.soldKg} KG</strong>
                </div>
                <div className="bg-white/80 p-3 rounded-2xl">
                  <span className="text-slate-500 block font-urdu">موجودہ اسٹاک:</span>
                  <strong className="text-sm font-mono text-amber-900">{freshReport.remainingStockKg} KG</strong>
                </div>
              </div>
            </div>

            {/* Freezer Stock Overview */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50/50 p-5 rounded-3xl border border-cyan-200/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">❄️</span>
                  <h3 className="font-extrabold text-base text-cyan-950 font-urdu">
                    فریزر پروڈکٹس اسٹاک و فروخت خلاصہ
                  </h3>
                </div>
                <button
                  onClick={() => setActiveReportTab('freezer_stock')}
                  className="text-xs font-bold text-cyan-800 hover:underline font-urdu"
                >
                  تفصیل دیکھیں →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/80 p-3 rounded-2xl">
                  <span className="text-slate-500 block font-urdu">کل آئٹمز:</span>
                  <strong className="text-sm font-mono text-slate-800">{allFreezerProducts.length} اقسام</strong>
                </div>
                <div className="bg-white/80 p-3 rounded-2xl">
                  <span className="text-slate-500 block font-urdu">فروخت (Sold):</span>
                  <strong className="text-sm font-mono text-emerald-700">{freezerReport.totalFreezerSoldKg} KG</strong>
                </div>
                <div className="bg-white/80 p-3 rounded-2xl">
                  <span className="text-slate-500 block font-urdu">موجودہ اسٹاک:</span>
                  <strong className="text-sm font-mono text-cyan-900">{freezerReport.totalRemainingFreezerStock} KG</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FRESH CHICKEN ISOLATED REPORT */}
      {activeReportTab === 'fresh_stock' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600 text-xl">🐔</span>
              <div>
                <h3 className="font-black text-base text-slate-900 font-urdu">
                  تازہ چکن اسٹاک رپورٹ (Fresh Chicken Stock & Sales Report)
                </h3>
                <p className="text-xs text-slate-500 font-urdu">
                  منتخب مدت میں تازہ چکن کی آمد، فروخت اور دکان میں لائیو اسکیل پر موجودہ اسٹاک کا درست ریکارڈ
                </p>
              </div>
            </div>

            {/* 3 Core Requested Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                <span className="text-xs font-bold text-amber-900 font-urdu block">
                  اس مدت میں چکن آمد (Fresh Received):
                </span>
                <p className="text-2xl font-black font-mono text-blue-700 mt-2">
                  {freshReport.receivedKg} KG
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  کل خرید لاگت: Rs. {freshReport.totalCost.toLocaleString()} • اوسط ریٹ: Rs. {freshReport.avgPurchaseRate}/KG
                </p>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 font-urdu block">
                  اس مدت میں چکن فروخت (Fresh Sold):
                </span>
                <p className="text-2xl font-black font-mono text-emerald-700 mt-2">
                  {freshReport.soldKg} KG
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  فروخت آمدن: Rs. {freshReport.soldRevenue.toLocaleString()} • اوسط ریٹ: Rs. {freshReport.avgSellingRate}/KG
                </p>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
                <span className="text-xs font-bold text-blue-900 font-urdu block">
                  دکان میں موجودہ چکن اسٹاک (Remaining Stock):
                </span>
                <p className="text-2xl font-black font-mono text-slate-900 mt-2">
                  {freshReport.remainingStockKg} KG
                </p>
                <p className="text-xs text-blue-700 font-urdu mt-1">
                  موجودہ مقررہ ریٹ: Rs. {freshChickenProduct?.rate_per_kg || 0} / KG
                </p>
              </div>
            </div>

            {/* Arrivals Log Table */}
            <div className="mt-6">
              <h4 className="font-bold text-xs text-slate-700 font-urdu mb-2">
                آمد کا تفصیلی لاگ ({filteredArrivals.length} اندراجات):
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">تاریخ</th>
                      <th className="py-2.5 px-3">سپلائر / فارم</th>
                      <th className="py-2.5 px-3 text-center">وزن (KG)</th>
                      <th className="py-2.5 px-3 text-center">خرید ریٹ فی کلو</th>
                      <th className="py-2.5 px-3 text-center">کل لاگت رقم</th>
                      <th className="py-2.5 px-3 text-center w-16">ایکشن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredArrivals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-urdu">
                          منتخب کردہ مدت میں کوئی چکن آمد درج نہیں۔
                        </td>
                      </tr>
                    ) : (
                      filteredArrivals.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-700">{formatDate(a.date)}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 font-urdu">{a.supplier_name || 'لوکل فارم'}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">{a.weight_kg} KG</td>
                          <td className="py-2 px-3 text-center font-mono">Rs. {a.rate_per_kg}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">Rs. {a.total_cost.toLocaleString()}</td>
                          <td className="py-2 px-3 text-center">
                            {onDeleteFreshArrival && (
                              <button
                                onClick={() => onDeleteFreshArrival(a)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="چکن آمد ڈیلیٹ کریں (اسٹاک خودکار کم ہوگا)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: FREEZER STOCK ISOLATED REPORT */}
      {activeReportTab === 'freezer_stock' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="p-2 rounded-xl bg-cyan-50 text-cyan-600 text-xl">❄️</span>
              <div>
                <h3 className="font-black text-base text-slate-900 font-urdu">
                  فریزر پروڈکٹس اسٹاک و فروخت رپورٹ (Freezer Stock Report)
                </h3>
                <p className="text-xs text-slate-500 font-urdu">
                  فریزر میں محفوظ اشیاء کی الگ فروخت، فی کلو قیمت اور موجودہ دستیاب اسٹاک کی تفصیل
                </p>
              </div>
            </div>

            {/* Freezer Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-cyan-50/60 p-4 rounded-2xl border border-cyan-200">
                <span className="text-xs font-bold text-cyan-900 font-urdu block">
                  اس مدت میں کل فریزر فروخت (Sold Weight):
                </span>
                <p className="text-2xl font-black font-mono text-cyan-800 mt-2">
                  {freezerReport.totalFreezerSoldKg} KG
                </p>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 font-urdu block">
                  فریزر مصنوعات سے کل آمدنی (Revenue):
                </span>
                <p className="text-2xl font-black font-mono text-emerald-700 mt-2">
                  Rs. {freezerReport.totalFreezerRevenue.toLocaleString()}
                </p>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
                <span className="text-xs font-bold text-blue-900 font-urdu block">
                  موجودہ کل فریزر اسٹاک (Remaining Stock):
                </span>
                <p className="text-2xl font-black font-mono text-blue-800 mt-2">
                  {freezerReport.totalRemainingFreezerStock} KG
                </p>
              </div>
            </div>

            {/* Product-by-product breakdown */}
            <h4 className="font-bold text-xs text-slate-700 font-urdu mb-2">
              ہر فریزر پروڈکٹ کا الگ ریکارڈ:
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">پروڈکٹ نام (Product)</th>
                    <th className="py-2.5 px-3">اردو نام</th>
                    <th className="py-2.5 px-3 text-center">فروخت ریٹ فی کلو</th>
                    <th className="py-2.5 px-3 text-center">اس مدت میں فروخت (KG)</th>
                    <th className="py-2.5 px-3 text-center">فروخت آمدن (Rs)</th>
                    <th className="py-2.5 px-3 text-center">موجودہ فریزر اسٹاک (KG)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {freezerReport.breakdown.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-urdu">
                        کوئی فریزر پروڈکٹ درج نہیں۔ فریزر اسٹاک سیکشن سے نئی پروڈکٹ شامل کریں۔
                      </td>
                    </tr>
                  ) : (
                    freezerReport.breakdown.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-4 font-bold text-slate-900">{item.name}</td>
                        <td className="py-2 px-3 font-urdu text-slate-700">{item.urdu_name}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">Rs. {item.rate_per_kg}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">{item.sold_kg} KG</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">Rs. {item.revenue.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center font-mono font-black text-cyan-800">{item.current_stock_kg} KG</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: DAILY LEDGER BREAKDOWN */}
      {activeReportTab === 'daily_ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 font-urdu">
              منتخب مدت کا روزانہ سیلز و اخراجات لیجر ({dailyBreakdown.length} ایام)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center">تاریخ</th>
                  <th className="py-3 px-3 text-center">بلز تعداد</th>
                  <th className="py-3 px-3 text-center">فروخت وزن (KG)</th>
                  <th className="py-3 px-3 text-center">کل فروخت (Sales)</th>
                  <th className="py-3 px-3 text-center">نقد موصول (Cash)</th>
                  <th className="py-3 px-3 text-center">بقایا ادھار (Credit)</th>
                  <th className="py-3 px-3 text-center">دکان اخراجات (Exp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-urdu">
                      منتخب تاریخوں میں کوئی ریکارڈ نہیں ملا۔
                    </td>
                  </tr>
                ) : (
                  dailyBreakdown.map(row => (
                    <tr key={row.date} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">{row.bills_count}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">{row.weight_kg} KG</td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-amber-700">Rs. {row.sales.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">Rs. {row.cash.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">Rs. {row.credit.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">Rs. {row.expenses.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: EXPENSES TABLE */}
      {activeReportTab === 'expenses' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 font-urdu">
              دکان اخراجات فہرست ({filteredExpenses.length} اخراجات)
            </h3>
            <button
              onClick={onAddExpense}
              className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl font-urdu"
            >
              + نیا خرچہ
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3 text-center">تاریخ</th>
                  <th className="py-2.5 px-4">کیٹیگری</th>
                  <th className="py-2.5 px-4">تفصیل (Description)</th>
                  <th className="py-2.5 px-3 text-center">رقم (Amount)</th>
                  <th className="py-2.5 px-3 text-center w-16">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-urdu">
                      اس مدت میں کوئی خرچہ درج نہیں ہے۔
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp, idx) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{formatDate(exp.date)}</td>
                      <td className="py-2 px-4 font-bold text-slate-800 font-urdu">{exp.category}</td>
                      <td className="py-2 px-4 text-slate-600">{exp.title || exp.notes || '-'}</td>
                      <td className="py-2 px-3 text-center font-mono font-black text-rose-700">
                        Rs. {exp.amount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
