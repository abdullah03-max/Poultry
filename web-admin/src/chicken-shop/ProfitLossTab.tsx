// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Profit & Loss Reports Tab
// Comprehensive Financial Reports: Revenue, Cost of Goods, Gross & Net Profit,
// Operational Expenses, Product Profitability & Daily Ledger Breakdown
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  ChickenSale,
  FreshChickenArrival,
  ChickenProduct,
  ChickenExpense,
  ChickenCustomer,
} from './types';
import { formatDate } from '../utils/formatters';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Printer,
  Plus,
  Trash2,
  PieChart,
  ShoppingBag,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ProfitLossTabProps {
  sales: ChickenSale[];
  freshArrivals: FreshChickenArrival[];
  products: ChickenProduct[];
  expenses: ChickenExpense[];
  customers: ChickenCustomer[];
  onAddExpense: () => void;
  onDeleteExpense: (id: string) => Promise<void>;
}

export const ProfitLossTab: React.FC<ProfitLossTabProps> = ({
  sales,
  freshArrivals,
  products,
  expenses,
  customers,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [subReport, setSubReport] = useState<'products' | 'daily' | 'expenses' | 'statement'>('statement');

  // ---------------------------------------------------------------------------
  // Date Filtering Logic
  // ---------------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // First day of current month
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  // First and last day of last month
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const isDateInFilter = (dateStr: string) => {
    if (dateFilter === 'today') return dateStr === todayStr;
    if (dateFilter === 'yesterday') return dateStr === yesterdayStr;
    if (dateFilter === 'week') return dateStr >= sevenDaysAgo;
    if (dateFilter === 'month') return dateStr >= startOfCurrentMonth;
    if (dateFilter === 'last_month') return dateStr >= startOfLastMonth && dateStr <= endOfLastMonth;
    if (dateFilter === 'custom') return dateStr >= customStartDate && dateStr <= customEndDate;
    return true; // 'all'
  };

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => isDateInFilter(s.sale_date));
  }, [sales, dateFilter, customStartDate, customEndDate]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => isDateInFilter(e.date));
  }, [expenses, dateFilter, customStartDate, customEndDate]);

  // Filtered Fresh Arrivals
  const filteredArrivals = useMemo(() => {
    return freshArrivals.filter(a => isDateInFilter(a.date));
  }, [freshArrivals, dateFilter, customStartDate, customEndDate]);

  // ---------------------------------------------------------------------------
  // Average Cost Estimates for Products
  // ---------------------------------------------------------------------------
  // Compute benchmark baseline cost rate per product (from fresh arrivals purchase rate or ~80% of selling rate)
  const productCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    const latestFreshArrivalRate = freshArrivals[0]?.rate_per_kg || 380;

    products.forEach(p => {
      if (p.id === 'prod-fresh-chicken' || p.name.toLowerCase().includes('fresh chicken')) {
        map[p.id] = latestFreshArrivalRate;
      } else {
        // Chicken cuts have cutting/yield factor (meat cuts rate is higher, cost is derived from whole chicken + processing ~75-80%)
        map[p.id] = Math.round(p.rate_per_kg * 0.82);
      }
    });

    return map;
  }, [products, freshArrivals]);

  // ---------------------------------------------------------------------------
  // Executive Financial Calculations
  // ---------------------------------------------------------------------------
  const financials = useMemo(() => {
    let totalGrossSales = 0;
    let totalDiscount = 0;
    let totalCashReceived = 0;
    let totalCreditDue = 0;
    let totalWeightKg = 0;
    let totalCostOfGoods = 0;

    const productPerformance: Record<
      string,
      {
        id: string;
        name: string;
        urdu_name: string;
        weight_kg: number;
        revenue: number;
        cost: number;
        gross_profit: number;
        selling_rate_avg: number;
        cost_rate_avg: number;
      }
    > = {};

    filteredSales.forEach(sale => {
      totalGrossSales += sale.subtotal;
      totalDiscount += sale.discount || 0;
      totalCashReceived += sale.received_amount || 0;
      totalCreditDue += sale.remaining_due || 0;
      totalWeightKg += sale.total_weight_kg || 0;

      sale.items.forEach(item => {
        const costRate = productCostMap[item.product_id] || Math.round(item.rate_per_kg * 0.8);
        const itemCost = Math.round((item.weight_kg || 0) * costRate);
        const itemProfit = item.line_total - itemCost;
        totalCostOfGoods += itemCost;

        if (!productPerformance[item.product_id]) {
          productPerformance[item.product_id] = {
            id: item.product_id,
            name: item.product_name,
            urdu_name: item.urdu_name || item.product_name,
            weight_kg: 0,
            revenue: 0,
            cost: 0,
            gross_profit: 0,
            selling_rate_avg: item.rate_per_kg,
            cost_rate_avg: costRate,
          };
        }

        const perf = productPerformance[item.product_id];
        perf.weight_kg = Number((perf.weight_kg + item.weight_kg).toFixed(2));
        perf.revenue += item.line_total;
        perf.cost += itemCost;
        perf.gross_profit += itemProfit;
      });
    });

    const netSalesRevenue = Math.max(0, totalGrossSales - totalDiscount);
    const grossProfit = netSalesRevenue - totalCostOfGoods;
    const grossMarginPct = netSalesRevenue > 0 ? Math.round((grossProfit / netSalesRevenue) * 100) : 0;
    const grossProfitPerKg = totalWeightKg > 0 ? Math.round(grossProfit / totalWeightKg) : 0;

    // Expenses
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

    // Net Profit
    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = netSalesRevenue > 0 ? Math.round((netProfit / netSalesRevenue) * 100) : 0;

    // Daily breakdown for table
    const dailyMap: Record<
      string,
      {
        date: string;
        weight_kg: number;
        sales: number;
        cost: number;
        gross_profit: number;
        expenses: number;
        net_profit: number;
        cash: number;
        credit: number;
      }
    > = {};

    filteredSales.forEach(sale => {
      const d = sale.sale_date;
      if (!dailyMap[d]) {
        dailyMap[d] = {
          date: d,
          weight_kg: 0,
          sales: 0,
          cost: 0,
          gross_profit: 0,
          expenses: 0,
          net_profit: 0,
          cash: 0,
          credit: 0,
        };
      }

      let saleCost = 0;
      sale.items.forEach(it => {
        const costRate = productCostMap[it.product_id] || Math.round(it.rate_per_kg * 0.8);
        saleCost += Math.round((it.weight_kg || 0) * costRate);
      });

      dailyMap[d].weight_kg = Number((dailyMap[d].weight_kg + sale.total_weight_kg).toFixed(2));
      dailyMap[d].sales += sale.total_amount;
      dailyMap[d].cost += saleCost;
      dailyMap[d].cash += sale.received_amount;
      dailyMap[d].credit += sale.remaining_due;
    });

    filteredExpenses.forEach(exp => {
      const d = exp.date;
      if (!dailyMap[d]) {
        dailyMap[d] = {
          date: d,
          weight_kg: 0,
          sales: 0,
          cost: 0,
          gross_profit: 0,
          expenses: 0,
          net_profit: 0,
          cash: 0,
          credit: 0,
        };
      }
      dailyMap[d].expenses += exp.amount;
    });

    // Compute net for each day
    const dailyBreakdown = Object.values(dailyMap)
      .map(row => {
        const gp = row.sales - row.cost;
        const np = gp - row.expenses;
        return {
          ...row,
          gross_profit: gp,
          net_profit: np,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalGrossSales,
      totalDiscount,
      netSalesRevenue,
      totalCashReceived,
      totalCreditDue,
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalCostOfGoods,
      grossProfit,
      grossMarginPct,
      grossProfitPerKg,
      totalExpenses,
      netProfit,
      netMarginPct,
      productPerformance: Object.values(productPerformance).sort((a, b) => b.revenue - a.revenue),
      dailyBreakdown,
      salesCount: filteredSales.length,
    };
  }, [filteredSales, filteredExpenses, productCostMap]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & DATE RANGE FILTER BAR                                 */}
      {/* ===================================================================== */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl shadow-xs shrink-0">
              📊
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-slate-900 font-urdu tracking-tight">
                  نفع و نقصان اور مالیاتی رپورٹ
                </h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-sans px-2.5 py-0.5 rounded-full font-bold">
                  Profit & Loss Statement
                </span>
              </div>
              <p className="text-xs text-slate-500 font-urdu mt-1">
                مجموعی فروخت آمدن، لاگتِ مال، دکان اخراجات اور صاف خالص منافع کا مکمل حساب
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onAddExpense}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
          >
            <Plus className="w-4 h-4" />
            <span>نیا دکان خرچہ درج کریں</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
          >
            <Printer className="w-4 h-4" />
            <span>رپورٹ پرنٹ کریں</span>
          </button>
        </div>
      </div>

      {/* Date Filters Navigation Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold font-urdu">
          <span className="text-slate-400 text-xs px-1">مدت:</span>
          {[
            { id: 'today', label: 'آج' },
            { id: 'yesterday', label: 'گزشتہ کل' },
            { id: 'week', label: 'گزشتہ 7 دن' },
            { id: 'month', label: 'موجودہ ماہ' },
            { id: 'last_month', label: 'گزشتہ ماہ' },
            { id: 'all', label: 'تمام ریکارڈز' },
            { id: 'custom', label: 'کسٹم تاریخ' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id as any)}
              className={`px-3.5 py-1.5 rounded-xl transition text-xs font-bold font-urdu ${
                dateFilter === f.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500 font-urdu">از:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs"
            />
            <span className="text-slate-500 font-urdu">تا:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs"
            />
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. EXECUTIVE 5 KPI HIGHLIGHT CARDS                                    */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 font-urdu">
              کل فروخت آمدن
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <p dir="ltr" className="text-2xl font-black font-mono text-slate-900 tracking-tight text-right">
              Rs. {financials.netSalesRevenue.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-urdu">کل وزن:</span>
              <span dir="ltr" className="font-mono font-bold text-slate-800">{financials.totalWeightKg} KG</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-urdu">نقد / ادھار:</span>
              <span dir="ltr" className="font-mono font-bold text-slate-600">
                کیش Rs.{financials.totalCashReceived.toLocaleString()} • ادھار Rs.{financials.totalCreditDue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Cost of Goods */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 font-urdu">
              مال کی لاگت (COGS)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <p dir="ltr" className="text-2xl font-black font-mono text-amber-900 tracking-tight text-right">
              Rs. {financials.totalCostOfGoods.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-urdu">اوسط لاگت فی کلو:</span>
              <span dir="ltr" className="font-mono font-bold text-amber-800">
                {financials.totalWeightKg > 0 ? `Rs. ${Math.round(financials.totalCostOfGoods / financials.totalWeightKg)}/KG` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-urdu">لاگت بریک ڈاؤن:</span>
              <span className="font-mono text-slate-500">فارم چکن و کٹنگ لاگت</span>
            </div>
          </div>
        </div>

        {/* Card 3: Gross Profit */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 font-urdu">
              مجموعی منافع (Gross)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <p dir="ltr" className={`text-2xl font-black font-mono tracking-tight text-right ${financials.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              Rs. {financials.grossProfit.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-urdu">گراس منافع مارجن:</span>
              <span dir="ltr" className="font-mono font-black text-emerald-700">{financials.grossMarginPct}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-urdu">فی کلو گراس بچت:</span>
              <span dir="ltr" className="font-mono font-bold text-emerald-700">
                {financials.grossProfitPerKg >= 0 ? `+Rs. ${financials.grossProfitPerKg}/KG` : `-Rs. ${Math.abs(financials.grossProfitPerKg)}/KG`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Operating Expenses */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 font-urdu">
              دکان کے اخراجات
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <p dir="ltr" className="text-2xl font-black font-mono text-rose-700 tracking-tight text-right">
              Rs. {financials.totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-urdu">کل اندراجات:</span>
              <span dir="ltr" className="font-mono font-bold text-slate-800">{filteredExpenses.length} بلز</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-urdu">تفصیل:</span>
              <span className="font-urdu truncate text-slate-500">برف، شاپر، دیہاڑی، کرایہ</span>
            </div>
          </div>
        </div>

        {/* Card 5: Net Profit (صاف بچت) */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/70 p-5 rounded-3xl border border-emerald-300 shadow-2xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-950 font-urdu">
              خالص منافع (صاف بچت)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <p dir="ltr" className={`text-2xl font-black font-mono tracking-tight text-right ${financials.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
              Rs. {financials.netProfit.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1 pt-2 border-t border-emerald-200/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-emerald-900 font-urdu font-bold">خالص مارجن:</span>
              <span dir="ltr" className="font-mono font-black text-emerald-950">{financials.netMarginPct}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-800">
              <span className="font-urdu">اصل کمائی:</span>
              <span className="font-urdu font-semibold">تمام اخراجات نکال کر</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. SUB-REPORTS NAVIGATION & CONTENT                                   */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSubReport('statement')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition font-urdu ${
                subReport === 'statement'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>مالیاتی گوشوارہ (P&L Summary)</span>
            </button>

            <button
              onClick={() => setSubReport('products')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition font-urdu ${
                subReport === 'products'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>پروڈکٹ وار منافع ({financials.productPerformance.length})</span>
            </button>

            <button
              onClick={() => setSubReport('daily')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition font-urdu ${
                subReport === 'daily'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>روزنامچہ نفع و نقصان ({financials.dailyBreakdown.length} دن)</span>
            </button>

            <button
              onClick={() => setSubReport('expenses')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition font-urdu ${
                subReport === 'expenses'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <DollarSign className="w-4 h-4 text-rose-500" />
              <span>دکان اخراجات رجسٹر ({filteredExpenses.length})</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: FORMAL P&L FINANCIAL STATEMENT                                */}
        {/* ------------------------------------------------------------------- */}
        {subReport === 'statement' && (
          <div className="p-5 sm:p-7 max-w-3xl mx-auto space-y-6">
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base font-urdu">شان چکن شاپ و ڈیجیٹل کھاتہ</h3>
                  <p className="text-xs text-slate-300 font-urdu">
                    آمدن، لاگت اور منافع کی باقاعدہ فنانشل اسٹیٹمنٹ
                  </p>
                </div>
                <div className="text-left text-xs font-mono text-slate-300">
                  <span>تاریخ: {new Date().toLocaleDateString('ur-PK')}</span>
                </div>
              </div>

              <div className="p-5 divide-y divide-slate-100 text-xs">
                {/* 1. Operating Revenue */}
                <div className="pb-3 space-y-2">
                  <span className="font-black text-sm text-slate-900 font-urdu block">
                    1. مجموعی کاروباری آمدن (Operating Revenue)
                  </span>
                  <div className="flex items-center justify-between pr-4 text-slate-600">
                    <span>مجموعی چکن فروخت بلز:</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rs. {financials.totalGrossSales.toLocaleString()}
                    </span>
                  </div>
                  {financials.totalDiscount > 0 && (
                    <div className="flex items-center justify-between pr-4 text-slate-500">
                      <span>منہا: کسٹمرز کو دی گئی رعایت (Discounts):</span>
                      <span className="font-mono font-bold text-rose-600">
                        - Rs. {financials.totalDiscount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pr-4 font-bold text-slate-900 pt-1">
                    <span>خالص سیلز آمدن (Net Revenue):</span>
                    <span className="font-mono font-black text-blue-700 text-sm">
                      Rs. {financials.netSalesRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 2. Cost of Goods Sold */}
                <div className="py-3 space-y-2">
                  <span className="font-black text-sm text-slate-900 font-urdu block">
                    2. فروخت شدہ مال کی لاگت (Cost of Goods Sold)
                  </span>
                  <div className="flex items-center justify-between pr-4 text-slate-600">
                    <span>چکن خریداری و فارم لاگت ({financials.totalWeightKg} KG):</span>
                    <span className="font-mono font-bold text-amber-800">
                      Rs. {financials.totalCostOfGoods.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pr-4 font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <span className="font-urdu">مجموعی منافع (Gross Profit):</span>
                    <span className={`font-mono font-black text-sm ${financials.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      Rs. {financials.grossProfit.toLocaleString()} ({financials.grossMarginPct}%)
                    </span>
                  </div>
                </div>

                {/* 3. Operating Expenses */}
                <div className="py-3 space-y-2">
                  <span className="font-black text-sm text-slate-900 font-urdu block">
                    3. دکان کے انتظامی و روزمرہ اخراجات (Operating Expenses)
                  </span>
                  {filteredExpenses.length === 0 ? (
                    <div className="text-slate-400 pr-4 text-[11px] font-urdu">
                      اس مدت میں کوئی خرچہ ریکارڈ نہیں ہے۔
                    </div>
                  ) : (
                    <div className="space-y-1.5 pr-4">
                      {filteredExpenses.slice(0, 6).map(e => (
                        <div key={e.id} className="flex items-center justify-between text-slate-600">
                          <span>{e.title} ({e.category_urdu || e.category}):</span>
                          <span className="font-mono text-rose-600">Rs. {e.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {filteredExpenses.length > 6 && (
                        <div className="text-[10px] text-slate-400">
                          + مزید {filteredExpenses.length - 6} اخراجات...
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between pr-4 font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <span className="font-urdu">کل دکان اخراجات:</span>
                    <span className="font-mono font-black text-rose-700 text-sm">
                      - Rs. {financials.totalExpenses.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 4. Net Profit */}
                <div className="pt-3">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="font-black text-base text-emerald-950 font-urdu block">
                        صاف خالص منافع (Net Profit):
                      </span>
                      <span className="text-[10px] text-emerald-800 font-urdu">
                        تمام لاگت و اخراجات نکال کر دکان کی اصل بچت
                      </span>
                    </div>
                    <span className={`text-xl sm:text-2xl font-black font-mono ${financials.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                      Rs. {financials.netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: PRODUCT & CUTS PROFITABILITY                                  */}
        {/* ------------------------------------------------------------------- */}
        {subReport === 'products' && (
          <div className="overflow-x-auto">
            {financials.productPerformance.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                اس مدت میں کوئی فروخت ریکارڈ نہیں ہے۔
              </div>
            ) : (
              <table className="w-full min-w-[760px] text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-right">چکن کٹ / آئٹم (Product)</th>
                    <th className="py-3 px-3 text-center">فروخت شدہ وزن</th>
                    <th className="py-3 px-3 text-center">کل فروخت آمدن</th>
                    <th className="py-3 px-3 text-center">اندازاً لاگت مال</th>
                    <th className="py-3 px-3 text-center">حاصل شدہ منافع</th>
                    <th className="py-3 px-3 text-center">منافع فی کلو</th>
                    <th className="py-3 px-3 text-center">مارجن (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financials.productPerformance.map(p => {
                    const marginPerKg = p.weight_kg > 0 ? Math.round(p.gross_profit / p.weight_kg) : 0;
                    const marginPct = p.revenue > 0 ? Math.round((p.gross_profit / p.revenue) * 100) : 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <span>{p.name}</span>
                          <span className="block font-urdu text-[10px] text-slate-500 font-normal">
                            {p.urdu_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {p.weight_kg} KG
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                          Rs. {p.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          Rs. {p.cost.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-emerald-700 text-sm">
                          Rs. {p.gross_profit.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={marginPerKg >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {marginPerKg >= 0 ? `+Rs.${marginPerKg}` : `-Rs.${Math.abs(marginPerKg)}`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            marginPct >= 15 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {marginPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: DAILY PROFIT & LOSS BREAKDOWN                                 */}
        {/* ------------------------------------------------------------------- */}
        {subReport === 'daily' && (
          <div className="overflow-x-auto">
            {financials.dailyBreakdown.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                کوئی روزنامہ ریکارڈ دستیاب نہیں ہے۔
              </div>
            ) : (
              <table className="w-full min-w-[760px] text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-right">تاریخ (Date)</th>
                    <th className="py-3 px-3 text-center">فروخت وزن (KG)</th>
                    <th className="py-3 px-3 text-center">کل فروخت آمدن</th>
                    <th className="py-3 px-3 text-center">لاگتِ مال</th>
                    <th className="py-3 px-3 text-center">گراس منافع</th>
                    <th className="py-3 px-3 text-center">دکان اخراجات</th>
                    <th className="py-3 px-3 text-center">صاف منافع (Net)</th>
                    <th className="py-3 px-3 text-center">نقد وصولی</th>
                    <th className="py-3 px-4 text-center">ادھار باقی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financials.dailyBreakdown.map(row => (
                    <tr key={row.date} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {row.weight_kg} KG
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                        Rs. {row.sales.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        Rs. {row.cost.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                        Rs. {row.gross_profit.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-rose-700">
                        {row.expenses > 0 ? `Rs. ${row.expenses.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-sm">
                        <span className={row.net_profit >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
                          Rs. {row.net_profit.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-700">
                        Rs. {row.cash.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {row.credit > 0 ? (
                          <span className="text-rose-700 font-bold">Rs. {row.credit.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: SHOP EXPENSES REGISTER                                        */}
        {/* ------------------------------------------------------------------- */}
        {subReport === 'expenses' && (
          <div>
            <div className="p-3.5 bg-rose-50/70 border-b border-rose-200/60 flex items-center justify-between text-xs px-4 sm:px-5">
              <span className="font-urdu text-rose-950 font-bold">
                مجموعی دکان اخراجات ({filteredExpenses.length} اندراجات):
              </span>
              <span className="font-mono font-black text-rose-900 text-sm">
                Rs. {financials.totalExpenses.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              {filteredExpenses.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  اس مدت میں کوئی خرچہ ریکارڈ نہیں ہے۔
                  <button
                    onClick={onAddExpense}
                    className="block mx-auto mt-2 text-rose-600 font-bold font-urdu"
                  >
                    + نیا خرچہ شامل کریں
                  </button>
                </div>
              ) : (
                <table className="w-full min-w-[650px] text-xs text-right">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-right">تاریخ</th>
                      <th className="py-3 px-3 text-right">عنوان / تفصیل</th>
                      <th className="py-3 px-3 text-center">قسم خرچہ (Category)</th>
                      <th className="py-3 px-3 text-center">ادائیگی طریقہ</th>
                      <th className="py-3 px-3 text-center">رقم (PKR)</th>
                      <th className="py-3 px-3 text-right">نوٹس</th>
                      <th className="py-3 px-4 text-center">ایکشن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-slate-700">{formatDate(e.date)}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{e.title}</td>
                        <td className="py-3 px-3 text-center font-urdu">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {e.category_urdu || e.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                            {e.payment_method === 'cash' ? 'نقد' : e.payment_method === 'bank' ? 'بینک' : 'آن لائن'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-rose-700 text-sm">
                          Rs. {e.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{e.notes || '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onDeleteExpense(e.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="حذف کریں"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
