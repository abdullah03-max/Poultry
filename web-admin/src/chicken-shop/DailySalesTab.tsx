// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Daily Sales & KG Record Tab
// Detailed Daily Sales, Product-wise KG Sold, Rates Breakdown, Stock Maal Deduction
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  ChickenSale,
  ChickenProduct,
  FreshChickenArrival,
  ChickenSaleItem,
} from './types';
import { formatDate } from '../utils/formatters';
import { FRESH_CHICKEN_PRODUCT_ID } from './api';
import {
  History,
  Calendar,
  Scale,
  DollarSign,
  TrendingUp,
  Search,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowDownRight,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface DailySalesTabProps {
  sales: ChickenSale[];
  products: ChickenProduct[];
  freshArrivals: FreshChickenArrival[];
  onOpenReceipt: (sale: ChickenSale) => void;
  onDeleteSale: (sale: ChickenSale) => Promise<void>;
  onNewSaleClick: () => void;
}

export const DailySalesTab: React.FC<DailySalesTabProps> = ({
  sales,
  products,
  freshArrivals,
  onOpenReceipt,
  onDeleteSale,
  onNewSaleClick,
}) => {
  // Current local today string in YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Selected single date for inspection (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'daily_detail' | 'history_archive'>('daily_detail');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');

  // Quick Date Navigation
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const nextStr = current.toISOString().split('T')[0];
    if (nextStr <= todayStr) {
      setSelectedDate(nextStr);
    }
  };

  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // ---------------------------------------------------------------------------
  // Calculations for Selected Date
  // ---------------------------------------------------------------------------
  const dateSales = useMemo(() => {
    return sales.filter(s => s.sale_date === selectedDate);
  }, [sales, selectedDate]);

  // Filtered by Search & Product
  const filteredDateSales = useMemo(() => {
    return dateSales.filter(sale => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        sale.invoice_no.toLowerCase().includes(q) ||
        sale.customer_name.toLowerCase().includes(q) ||
        (sale.phone && sale.phone.includes(q)) ||
        sale.items.some(
          i =>
            i.product_name.toLowerCase().includes(q) ||
            (i.urdu_name && i.urdu_name.toLowerCase().includes(q))
        );

      if (!matchSearch) return false;

      if (selectedProductFilter !== 'all') {
        return sale.items.some(i => i.product_id === selectedProductFilter);
      }

      return true;
    });
  }, [dateSales, searchQuery, selectedProductFilter]);

  // Overall KPIs for Selected Date
  const dateKpis = useMemo(() => {
    const totalRevenue = dateSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalCash = dateSales.reduce((sum, s) => sum + s.received_amount, 0);
    const totalCredit = dateSales.reduce((sum, s) => sum + s.remaining_due, 0);
    const totalWeightKg = Number(
      dateSales.reduce((sum, s) => sum + (Number(s.total_weight_kg) || 0), 0).toFixed(2)
    );
    const avgRatePerKg = totalWeightKg > 0 ? Math.round(totalRevenue / totalWeightKg) : 0;
    const billsCount = dateSales.length;

    // Total available stock across all products
    const currentTotalStock = Number(
      products.reduce((sum, p) => sum + (Number(p.stock_kg) || 0), 0).toFixed(2)
    );

    return {
      totalRevenue,
      totalCash,
      totalCredit,
      totalWeightKg,
      avgRatePerKg,
      billsCount,
      currentTotalStock,
    };
  }, [dateSales, products]);

  // ---------------------------------------------------------------------------
  // Product-wise Breakdown for Selected Date: How much KG sold at which price
  // ---------------------------------------------------------------------------
  const productBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        productName: string;
        urduName: string;
        category: string;
        totalWeightKg: number;
        totalRevenue: number;
        rates: Set<number>;
        billsCount: number;
        currentStockKg: number;
      }
    >();

    dateSales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        const pid = item.product_id || item.product_name;
        const existing = map.get(pid);

        const weight = Number(item.weight_kg) || 0;
        const rev = Number(item.line_total) || 0;
        const rate = Number(item.rate_per_kg) || 0;

        if (!existing) {
          map.set(pid, {
            productId: item.product_id,
            productName: item.product_name,
            urduName: item.urdu_name || prod?.urdu_name || item.product_name,
            category: prod?.category || 'Meat Cut',
            totalWeightKg: weight,
            totalRevenue: rev,
            rates: new Set([rate]),
            billsCount: 1,
            currentStockKg: Number(prod?.stock_kg || 0),
          });
        } else {
          existing.totalWeightKg += weight;
          existing.totalRevenue += rev;
          existing.rates.add(rate);
          existing.billsCount += 1;
        }
      });
    });

    const list = Array.from(map.values()).map(item => {
      const ratesArr = Array.from(item.rates).sort((a, b) => a - b);
      const minRate = ratesArr[0] || 0;
      const maxRate = ratesArr[ratesArr.length - 1] || 0;
      const avgRate = item.totalWeightKg > 0 ? Math.round(item.totalRevenue / item.totalWeightKg) : minRate;

      return {
        ...item,
        totalWeightKg: Number(item.totalWeightKg.toFixed(2)),
        ratesArr,
        minRate,
        maxRate,
        avgRate,
        percentOfDayWeight:
          dateKpis.totalWeightKg > 0
            ? Math.round((item.totalWeightKg / dateKpis.totalWeightKg) * 100)
            : 0,
      };
    });

    // Sort by highest weight sold
    return list.sort((a, b) => b.totalWeightKg - a.totalWeightKg);
  }, [dateSales, products, dateKpis.totalWeightKg]);

  // ---------------------------------------------------------------------------
  // Day-by-Day Historical Log (Multi-day Archive)
  // ---------------------------------------------------------------------------
  const dailyHistoryList = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        date: string;
        billsCount: number;
        totalWeightKg: number;
        totalRevenue: number;
        cashRevenue: number;
        creditRevenue: number;
      }
    >();

    sales.forEach(s => {
      const existing = dayMap.get(s.sale_date);
      const weight = Number(s.total_weight_kg) || 0;
      const rev = Number(s.total_amount) || 0;
      const cash = Number(s.received_amount) || 0;
      const credit = Number(s.remaining_due) || 0;

      if (!existing) {
        dayMap.set(s.sale_date, {
          date: s.sale_date,
          billsCount: 1,
          totalWeightKg: weight,
          totalRevenue: rev,
          cashRevenue: cash,
          creditRevenue: credit,
        });
      } else {
        existing.billsCount += 1;
        existing.totalWeightKg += weight;
        existing.totalRevenue += rev;
        existing.cashRevenue += cash;
        existing.creditRevenue += credit;
      }
    });

    return Array.from(dayMap.values())
      .map(d => ({
        ...d,
        totalWeightKg: Number(d.totalWeightKg.toFixed(2)),
        avgRatePerKg: d.totalWeightKg > 0 ? Math.round(d.totalRevenue / d.totalWeightKg) : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales]);

  // ---------------------------------------------------------------------------
  // Thermal Print Daily Summary Report
  // ---------------------------------------------------------------------------
  const handlePrintDailyReport = () => {
    const printWindow = window.open('', '_blank', 'width=500,height=750');
    if (!printWindow) return;

    const itemsRowsHtml = productBreakdown
      .map(
        p => `
      <tr>
        <td style="padding: 4px; border-bottom: 1px dotted #bbb; font-weight: bold;">${p.urduName || p.productName}</td>
        <td style="padding: 4px; border-bottom: 1px dotted #bbb; text-align: center; font-weight: bold;">${p.totalWeightKg} KG</td>
        <td style="padding: 4px; border-bottom: 1px dotted #bbb; text-align: center;">Rs. ${p.avgRate}</td>
        <td style="padding: 4px; border-bottom: 1px dotted #bbb; text-align: left; font-weight: bold;">Rs. ${p.totalRevenue.toLocaleString()}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8">
        <title>روزانہ سیلز و کلو رپورٹ - ${selectedDate}</title>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 13px;
            color: #000;
            padding: 8px;
            width: 78mm;
            margin: 0 auto;
            direction: rtl;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #333; }
          .border-t { border-top: 1px dashed #333; }
          .py-1 { padding-top: 3px; padding-bottom: 3px; }
          .my-2 { margin-top: 6px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { text-align: right; font-size: 11px; border-bottom: 1px solid #000; padding: 4px; }
          td { font-size: 11px; padding: 4px; }
          .total-box { border: 1px solid #000; padding: 6px; margin: 8px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="margin: 0; font-size: 17px;">🐔 شان چکن شاپ و گوشت سینٹر</h2>
          <p style="margin: 2px 0; font-size: 12px; font-weight: bold;">روزانہ سیلز اور کلو کٹوتی سمری</p>
          <p style="margin: 2px 0; font-size: 11px;">تاریخ: ${formatDate(selectedDate)} (${selectedDate})</p>
        </div>
        <div class="border-b my-2"></div>

        <div class="total-box">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>مجموعی فروخت شدہ وزن:</span>
            <b>${dateKpis.totalWeightKg} KG</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>مجموعی سیلز رقم:</span>
            <b>Rs. ${dateKpis.totalRevenue.toLocaleString()}</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>اوسط ریٹ فی کلو:</span>
            <b>Rs. ${dateKpis.avgRatePerKg} / KG</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>نقد وصولی:</span>
            <b>Rs. ${dateKpis.totalCash.toLocaleString()}</b>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>ادھار کھاتہ:</span>
            <b>Rs. ${dateKpis.totalCredit.toLocaleString()}</b>
          </div>
        </div>

        <h4 style="margin: 8px 0 4px 0; font-size: 12px;">کٹس کے حساب سے فروخت اور ریٹ:</h4>
        <table>
          <thead>
            <tr>
              <th>کٹ کا نام</th>
              <th style="text-align: center;">وزن</th>
              <th style="text-align: center;">ریٹ</th>
              <th style="text-align: left;">رقم</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml || '<tr><td colspan="4" style="text-align:center;">کوئی فروخت نہیں</td></tr>'}
          </tbody>
        </table>

        <div class="border-t my-2" style="margin-top: 10px;"></div>
        <p style="font-size: 10px; text-align: center; margin: 4px 0;">
          یہ تمام وزن دکان کے کل مال میں سے کاٹا جا چکا ہے۔
        </p>
        <p style="font-size: 9px; text-align: center; color: #555;">
          پرنٹ وقت: ${new Date().toLocaleTimeString()}
        </p>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const isToday = selectedDate === todayStr;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* =================================================================== */}
      {/* TOP HEADER & DATE CONTROLS BAR                                      */}
      {/* =================================================================== */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
                <History className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight flex items-center gap-2">
                  <span>روزانہ کی سیلز و کلو ریکارڈ</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-sans font-bold border border-amber-200">
                    Daily Sales & KG Log
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ہر دن کی کل سیلز، کس ریٹ پر کتنا کلو مال بیچا گیا اور کل اسٹاک مال سے کٹوتی کی تفصیل
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintDailyReport}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              title="روزانہ کی رپورٹ پرنٹ کریں"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="font-urdu">رپورٹ پرنٹ کریں</span>
            </button>
            <button
              onClick={onNewSaleClick}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="font-urdu">+ نیا کاؤنٹر بل بنائیں (POS)</span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Quick Date Stepper */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl transition shadow-2xs flex items-center gap-1 text-xs font-bold px-2.5"
              title="پچھلا دن"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline font-urdu">پچھلا دن</span>
            </button>

            <button
              onClick={handleSetYesterday}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-urdu transition ${
                selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              کل (Yesterday)
            </button>

            <button
              onClick={handleSetToday}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-urdu transition ${
                isToday
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              آج (Today)
            </button>

            <button
              onClick={handleNextDay}
              disabled={isToday}
              className={`p-1.5 rounded-xl transition flex items-center gap-1 text-xs font-bold px-2.5 ${
                isToday
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'hover:bg-white text-slate-700 hover:text-slate-900 shadow-2xs'
              }`}
              title="اگلا دن"
            >
              <span className="hidden sm:inline font-urdu">اگلا دن</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Direct Date Picker & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-slate-500 font-urdu hidden sm:inline">منتخب تاریخ:</span>
              <input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-urdu font-bold">
              <button
                onClick={() => setActiveView('daily_detail')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeView === 'daily_detail'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                اس دن کی تفصیل
              </button>
              <button
                onClick={() => setActiveView('history_archive')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeView === 'history_archive'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ماضی کا تاریخی روزنامچہ ({dailyHistoryList.length} دن)
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'daily_detail' ? (
        <>
          {/* =============================================================== */}
          {/* 4 CORE KPI METRIC CARDS FOR SELECTED DATE                       */}
          {/* =============================================================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Sales Revenue */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-amber-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 font-urdu">
                  {isToday ? 'آج کی کل سیلز رقم' : 'اس دن کی کل سیلز رقم'}
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                Rs. {dateKpis.totalRevenue.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 font-urdu">
                <span className="text-emerald-700 font-semibold font-mono">
                  نقد: Rs. {dateKpis.totalCash.toLocaleString()}
                </span>
                {dateKpis.totalCredit > 0 && (
                  <span className="text-rose-600 font-semibold font-mono">
                    • ادھار: Rs. {dateKpis.totalCredit.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Total Weight Sold */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 font-urdu">
                  کل فروخت شدہ وزن (KG)
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono tracking-tight">
                {dateKpis.totalWeightKg.toLocaleString()} <span className="text-sm font-sans font-bold text-slate-600">KG</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-urdu">
                کل کٹس فروخت: <span className="font-bold text-slate-700">{productBreakdown.length} اقسام</span> • بلز: <span className="font-bold font-mono text-slate-700">{dateKpis.billsCount}</span>
              </div>
            </div>

            {/* Card 3: Average Selling Price per KG */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 font-urdu">
                  اوسط فروخت ریٹ فی کلو
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tracking-tight">
                Rs. {dateKpis.avgRatePerKg} <span className="text-xs font-sans text-slate-500">/ KG</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-urdu">
                مجموعی رقم تقسیم مجموعی وزن
              </div>
            </div>

            {/* Card 4: Maal Stock Deduction & Current Balance */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-purple-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 font-urdu">
                  اسٹاک مال کٹوتی و بقایا
                </span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1.5">
                <span className="text-rose-600 font-black">-{dateKpis.totalWeightKg}</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-emerald-700 text-lg font-bold">{dateKpis.currentTotalStock} KG</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-urdu flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>فروخت سے مال کٹوتی • بقایا اسٹاک موجود</span>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* SECTION 1: PRODUCT & RATE BREAKDOWN (کس ریٹ پر کتنا کلو بیچا)    */}
          {/* =============================================================== */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-urdu tracking-tight flex items-center gap-2">
                  <span>کس ریٹ پر کتنا کلو مال بیچا گیا؟</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-sans font-bold border border-blue-200">
                    Product Cuts & Sold Rates Breakdown
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  منتخب تاریخ ({formatDate(selectedDate)}) میں ہر پروڈکٹ کا فروخت شدہ وزن، حاصل شدہ ریٹ، کٹوتی اور بقایا اسٹاک
                </p>
              </div>

              {/* Product quick filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-urdu hidden sm:inline">فلٹر پروڈکٹ:</span>
                <select
                  value={selectedProductFilter}
                  onChange={e => setSelectedProductFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600 font-urdu font-medium"
                >
                  <option value="all">تمام کٹس و گوشت (All Cuts)</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.urdu_name || p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                  <tr>
                    <th className="py-3 px-3">پروڈکٹ / کٹ کا نام</th>
                    <th className="py-3 px-3 text-center">کتنا کلو فروخت ہوا؟</th>
                    <th className="py-3 px-3 text-center">کس ریٹ پر بیچا؟ (ریٹ فی کلو)</th>
                    <th className="py-3 px-3 text-left">حاصل شدہ کل رقم</th>
                    <th className="py-3 px-3 text-center">کل مال سے کٹوتی</th>
                    <th className="py-3 px-3 text-center">موجودہ بقایا اسٹاک</th>
                    <th className="py-3 px-3 text-center">بلز کی تعداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {productBreakdown.map(item => (
                    <tr key={item.productId} className="hover:bg-slate-50/70 transition">
                      {/* Product Name */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-sm font-urdu">
                          {item.urduName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans font-medium">
                          {item.productName} • <span className="text-slate-500">{item.category}</span>
                        </div>
                      </td>

                      {/* Weight Sold */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-black text-slate-900 font-mono text-sm">
                          {item.totalWeightKg} KG
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {item.percentOfDayWeight}% دن کا وزن
                        </div>
                      </td>

                      {/* Selling Rates */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-black text-emerald-700 font-mono text-sm">
                          Rs. {item.avgRate} <span className="text-[10px] text-slate-400">/ KG</span>
                        </div>
                        {item.minRate !== item.maxRate ? (
                          <div className="text-[10px] text-slate-400 font-mono">
                            ریٹ رینج: Rs.{item.minRate} - Rs.{item.maxRate}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-urdu">
                            مستقل ریٹ: Rs.{item.minRate}
                          </div>
                        )}
                      </td>

                      {/* Revenue */}
                      <td className="py-3.5 px-3 text-left">
                        <div className="font-black text-slate-900 font-mono text-sm">
                          Rs. {item.totalRevenue.toLocaleString()}
                        </div>
                      </td>

                      {/* Maal Deduction */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black font-mono bg-rose-50 text-rose-700 border border-rose-200">
                          -{item.totalWeightKg} KG
                        </span>
                      </td>

                      {/* Current Remaining Stock */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            item.currentStockKg <= 10
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.currentStockKg} KG
                        </span>
                      </td>

                      {/* Bills Count */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-700">
                        {item.billsCount}
                      </td>
                    </tr>
                  ))}

                  {productBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-urdu">
                        اس تاریخ ({formatDate(selectedDate)}) میں کوئی گوشت سیل ریکارڈ موجود نہیں۔
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Table Footer Totals */}
                {productBreakdown.length > 0 && (
                  <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td className="py-3 px-3 font-urdu font-black text-slate-900">
                        مجموعی ٹوٹل (Total Daily)
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm">
                        {dateKpis.totalWeightKg} KG
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-emerald-800 text-sm">
                        اوسط Rs. {dateKpis.avgRatePerKg}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-black text-slate-900 text-sm">
                        Rs. {dateKpis.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-rose-700">
                        -{dateKpis.totalWeightKg} KG
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {dateKpis.currentTotalStock} KG
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {dateKpis.billsCount} بلز
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Informational Stock Note */}
            <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 font-urdu leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <b>خودکار اسٹاک کٹوتی کی تصدیق:</b> اوپر درج تمام وزن دکان کے کل مال (انوینٹری اسٹاک) سے کاٹا جا چکا ہے۔ اگر کوئی بل غلط درج ہو گیا ہو تو نیچے سے ڈیلیٹ کرنے پر وہ کلو وزن خودکار طور پر واپس کل مال کے اسٹاک میں جمع ہو جائے گا۔
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* SECTION 2: DETAILED INVOICES & BILLS TABLE FOR SELECTED DATE     */}
          {/* =============================================================== */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-urdu tracking-tight flex items-center gap-2">
                  <span>اس دن کے تمام بلز و انوائسز</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                    {filteredDateSales.length} Invoices
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ہر گاہک کو بیچے گئے گوشت کی تفصیلی انوائس، وزن، ریٹ اور ادائیگی
                </p>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="انوائس #، گاہک، پروڈکٹ..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600 w-full sm:w-64 font-urdu"
                />
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[780px] text-xs text-right">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                  <tr>
                    <th className="py-3 px-3">انوائس # و وقت</th>
                    <th className="py-3 px-3">گاہک کا نام</th>
                    <th className="py-3 px-3">بیچی گئی کٹس اور ریٹ (Items & Rates)</th>
                    <th className="py-3 px-3 text-center">کل وزن</th>
                    <th className="py-3 px-3 text-left">بل رقم</th>
                    <th className="py-3 px-3 text-left">وصول شدہ</th>
                    <th className="py-3 px-3 text-left">بقایا</th>
                    <th className="py-3 px-3 text-center">ادائیگی طریقہ</th>
                    <th className="py-3 px-3 text-center">ایکشنز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredDateSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                      {/* Invoice & Time */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-slate-900">
                          {sale.invoice_no}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{sale.sale_time || '12:00:00'}</span>
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 font-urdu">
                          {sale.customer_name}
                        </div>
                        {sale.phone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sale.phone}
                          </div>
                        )}
                      </td>

                      {/* Items & Rates Breakdown */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1 max-w-xs">
                          {sale.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 flex items-center justify-between gap-2"
                            >
                              <span className="font-urdu font-medium text-slate-800">
                                {it.urdu_name || it.product_name}:
                              </span>
                              <span className="font-mono font-bold text-slate-900">
                                {it.weight_kg} KG @ Rs.{it.rate_per_kg} = Rs.{it.line_total}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total Weight */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {sale.total_weight_kg} KG
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-3 text-left">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          Rs. {sale.total_amount.toLocaleString()}
                        </span>
                      </td>

                      {/* Received Amount */}
                      <td className="py-3.5 px-3 text-left font-mono font-bold text-emerald-700">
                        Rs. {sale.received_amount.toLocaleString()}
                      </td>

                      {/* Remaining Due */}
                      <td className="py-3.5 px-3 text-left font-mono font-bold text-rose-600">
                        {sale.remaining_due > 0 ? `Rs. ${sale.remaining_due.toLocaleString()}` : '—'}
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-urdu ${
                            sale.payment_method === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.payment_method === 'credit'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sale.payment_method === 'cash' ? 'نقد' : sale.payment_method === 'credit' ? 'ادھار' : 'جزوی'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenReceipt(sale)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition inline-flex items-center gap-1 font-urdu"
                            title="رسید پرنٹ کریں"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>رسید</span>
                          </button>
                          <button
                            onClick={() => onDeleteSale(sale)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition inline-flex items-center gap-1 font-urdu"
                            title="بل حذف کریں اور مال اسٹاک واپس شامل کریں"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredDateSales.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-urdu">
                        اس دن کوئی بل / انوائس نہیں ملا۔
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* =================================================================== */
        /* MULTI-DAY HISTORICAL LOG ARCHIVE (ماضی کا روزنامچہ)                */
        /* =================================================================== */
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 font-urdu tracking-tight flex items-center gap-2">
              <span>ماضی کا روزانہ سیلز تاریخی روزنامچہ</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-sans font-bold border border-amber-200">
                Daily Sales Archive
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              گزشتہ تمام دنوں کی مجموعی سیلز، فروخت شدہ کلو اور اوسط ریٹ کی فہرست۔ کسی بھی دن کی تفصیل دیکھنے کے لیے اس پر کلک کریں۔
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                <tr>
                  <th className="py-3 px-3">تاریخ (Date)</th>
                  <th className="py-3 px-3 text-center">بلز کی تعداد</th>
                  <th className="py-3 px-3 text-center">کل فروخت شدہ وزن (KG)</th>
                  <th className="py-3 px-3 text-left">مجموعی سیلز رقم</th>
                  <th className="py-3 px-3 text-center">اوسط ریٹ فی کلو</th>
                  <th className="py-3 px-3 text-left">نقد وصولی</th>
                  <th className="py-3 px-3 text-left">ادھار کھاتہ</th>
                  <th className="py-3 px-3 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {dailyHistoryList.map(item => (
                  <tr
                    key={item.date}
                    className={`hover:bg-slate-50/80 transition ${
                      item.date === selectedDate ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                      {formatDate(item.date)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({item.date})</span>
                    </td>

                    {/* Bills Count */}
                    <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-700">
                      {item.billsCount} بلز
                    </td>

                    {/* Total Weight */}
                    <td className="py-3.5 px-3 text-center font-mono font-black text-blue-700 text-sm">
                      {item.totalWeightKg} KG
                    </td>

                    {/* Revenue */}
                    <td className="py-3.5 px-3 text-left font-mono font-black text-slate-900 text-sm">
                      Rs. {item.totalRevenue.toLocaleString()}
                    </td>

                    {/* Avg Rate */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700">
                      Rs. {item.avgRatePerKg} / KG
                    </td>

                    {/* Cash */}
                    <td className="py-3.5 px-3 text-left font-mono font-semibold text-emerald-700">
                      Rs. {item.cashRevenue.toLocaleString()}
                    </td>

                    {/* Credit */}
                    <td className="py-3.5 px-3 text-left font-mono font-semibold text-rose-600">
                      {item.creditRevenue > 0 ? `Rs. ${item.creditRevenue.toLocaleString()}` : '—'}
                    </td>

                    {/* Inspect Day Action */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedDate(item.date);
                          setActiveView('daily_detail');
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition font-urdu text-[11px] shadow-2xs active:scale-95"
                      >
                        تفصیل کھولیں
                      </button>
                    </td>
                  </tr>
                ))}

                {dailyHistoryList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-urdu">
                      کوئی سابقہ سیلز ریکارڈ موجود نہیں۔
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
