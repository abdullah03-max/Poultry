// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Daily Sales, Naqd, Odhar & Wasooli Tab
// Dedicated Sections for Naqd (Cash), Odhar (Credit), Wasooli (Recoveries),
// Product-wise KG Sold, Rates Breakdown, and Stock Maal Deduction
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  ChickenSale,
  ChickenProduct,
  FreshChickenArrival,
  ChickenSaleItem,
  ChickenPayment,
  ChickenCustomer,
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
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Wallet,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  CreditCard,
  Receipt,
  Phone,
} from 'lucide-react';

interface DailySalesTabProps {
  sales: ChickenSale[];
  payments?: ChickenPayment[];
  customers?: ChickenCustomer[];
  products: ChickenProduct[];
  freshArrivals: FreshChickenArrival[];
  onOpenReceipt: (sale: ChickenSale) => void;
  onDeleteSale: (sale: ChickenSale) => Promise<void>;
  onDeletePayment?: (payment: ChickenPayment) => Promise<void>;
  onNewSaleClick: () => void;
  onOpenBulkWalkin?: (date?: string) => void;
  onOpenPaymentModal?: (customer?: ChickenCustomer | null) => void;
}

export const DailySalesTab: React.FC<DailySalesTabProps> = ({
  sales,
  payments = [],
  customers = [],
  products,
  freshArrivals,
  onOpenReceipt,
  onDeleteSale,
  onDeletePayment,
  onNewSaleClick,
  onOpenBulkWalkin,
  onOpenPaymentModal,
}) => {
  // Current local today string in YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Selected single date for inspection (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Primary view tabs:
  // 1. 'naqd_odhar_wasooli': Dedicated section for Daily Naqd, Odhar & Wasooli Daybook
  // 2. 'product_cuts_kg': Meat cuts breakdown & stock deduction
  // 3. 'history_archive': Multi-day history
  const [activeMainTab, setActiveMainTab] = useState<'naqd_odhar_wasooli' | 'product_cuts_kg' | 'history_archive'>(
    'naqd_odhar_wasooli'
  );

  // Sub-filter for Naqd/Odhar/Wasooli view
  const [cashbookFilter, setCashbookFilter] = useState<'all' | 'naqd' | 'odhar' | 'wasooli'>('all');
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
  // Calculations for Selected Date: Sales & Payments (Wasooli)
  // ---------------------------------------------------------------------------
  const dateSales = useMemo(() => {
    return sales.filter(s => s.sale_date === selectedDate);
  }, [sales, selectedDate]);

  const datePayments = useMemo(() => {
    return payments.filter(p => p.payment_date === selectedDate);
  }, [payments, selectedDate]);

  // Breakdown of Sales: Naqd vs Odhar
  const { naqdSales, odharSales } = useMemo(() => {
    const naqd: ChickenSale[] = [];
    const odhar: ChickenSale[] = [];

    dateSales.forEach(s => {
      if (s.remaining_due > 0) {
        odhar.push(s);
      } else {
        naqd.push(s);
      }
    });

    return { naqdSales: naqd, odharSales: odhar };
  }, [dateSales]);

  // Financial KPIs for Selected Date
  const dateKpis = useMemo(() => {
    // Total gross sales value & weight
    const totalRevenue = dateSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalWeightKg = Number(
      dateSales.reduce((sum, s) => sum + (Number(s.total_weight_kg) || 0), 0).toFixed(2)
    );
    const avgRatePerKg = totalWeightKg > 0 ? Math.round(totalRevenue / totalWeightKg) : 0;

    // 1. Naqd (Cash Sales): Upfront cash collected on sales
    const naqdRevenue = naqdSales.reduce((sum, s) => sum + s.total_amount, 0);
    const naqdWeightKg = Number(
      naqdSales.reduce((sum, s) => sum + (Number(s.total_weight_kg) || 0), 0).toFixed(2)
    );

    // 2. Odhar (Credit Sales): Credit given to Khata customers
    const odharCreditTotal = odharSales.reduce((sum, s) => sum + s.remaining_due, 0);
    const odharBillTotal = odharSales.reduce((sum, s) => sum + s.total_amount, 0);
    const odharUpfrontPaid = odharSales.reduce((sum, s) => sum + s.received_amount, 0);
    const odharWeightKg = Number(
      odharSales.reduce((sum, s) => sum + (Number(s.total_weight_kg) || 0), 0).toFixed(2)
    );

    // 3. Wasooli (Customer Payments / Recoveries collected today against old khata)
    const wasooliTotal = datePayments.reduce((sum, p) => sum + p.amount, 0);
    const wasooliCount = datePayments.length;

    // 4. Net Cash In Hand Today = Naqd Sales Cash + Partial Upfront on Odhar + Wasooli Recoveries
    const totalCashFromSales = dateSales.reduce((sum, s) => sum + s.received_amount, 0);
    const totalCashInHand = totalCashFromSales + wasooliTotal;

    // Available meat cuts stock
    const currentTotalStock = Number(
      products.reduce((sum, p) => sum + (Number(p.stock_kg) || 0), 0).toFixed(2)
    );

    return {
      totalRevenue,
      totalWeightKg,
      avgRatePerKg,
      billsCount: dateSales.length,
      naqdRevenue,
      naqdWeightKg,
      naqdCount: naqdSales.length,
      odharCreditTotal,
      odharBillTotal,
      odharUpfrontPaid,
      odharWeightKg,
      odharCount: odharSales.length,
      wasooliTotal,
      wasooliCount,
      totalCashFromSales,
      totalCashInHand,
      currentTotalStock,
    };
  }, [dateSales, naqdSales, odharSales, datePayments, products]);

  // Filtered lists by search query
  const filteredNaqdSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return naqdSales;
    return naqdSales.filter(
      s =>
        s.invoice_no.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        s.items.some(i => i.product_name.toLowerCase().includes(q) || (i.urdu_name && i.urdu_name.includes(q)))
    );
  }, [naqdSales, searchQuery]);

  const filteredOdharSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return odharSales;
    return odharSales.filter(
      s =>
        s.invoice_no.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        s.items.some(i => i.product_name.toLowerCase().includes(q) || (i.urdu_name && i.urdu_name.includes(q)))
    );
  }, [odharSales, searchQuery]);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return datePayments;
    return datePayments.filter(
      p =>
        p.voucher_no.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  }, [datePayments, searchQuery]);

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
      const avgRate = item.totalWeightKg > 0 ? Math.round(item.totalRevenue / item.totalWeightKg) : 0;
      return {
        ...item,
        totalWeightKg: Number(item.totalWeightKg.toFixed(2)),
        avgRate,
      };
    });

    if (selectedProductFilter !== 'all') {
      return list.filter(p => p.productId === selectedProductFilter);
    }

    return list.sort((a, b) => b.totalWeightKg - a.totalWeightKg);
  }, [dateSales, products, selectedProductFilter]);

  // ---------------------------------------------------------------------------
  // Multi-Day History Archive Aggregation
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
        wasooliRevenue: number;
      }
    >();

    // Aggregate sales
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
          wasooliRevenue: 0,
        });
      } else {
        existing.billsCount += 1;
        existing.totalWeightKg += weight;
        existing.totalRevenue += rev;
        existing.cashRevenue += cash;
        existing.creditRevenue += credit;
      }
    });

    // Aggregate payments
    payments.forEach(p => {
      const existing = dayMap.get(p.payment_date);
      if (existing) {
        existing.wasooliRevenue += p.amount;
      } else {
        dayMap.set(p.payment_date, {
          date: p.payment_date,
          billsCount: 0,
          totalWeightKg: 0,
          totalRevenue: 0,
          cashRevenue: 0,
          creditRevenue: 0,
          wasooliRevenue: p.amount,
        });
      }
    });

    return Array.from(dayMap.values())
      .map(d => ({
        ...d,
        totalWeightKg: Number(d.totalWeightKg.toFixed(2)),
        avgRatePerKg: d.totalWeightKg > 0 ? Math.round(d.totalRevenue / d.totalWeightKg) : 0,
        totalCashInHand: d.cashRevenue + d.wasooliRevenue,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, payments]);

  // ---------------------------------------------------------------------------
  // Thermal Print Daily Summary Report (Comprehensive Daybook)
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
        <title>روزانہ روزنامچہ نقد، ادھار و وصولی - ${selectedDate}</title>
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
          <p style="margin: 2px 0; font-size: 12px; font-weight: bold;">روزانہ نقد، ادھار و وصولی روزنامچہ</p>
          <p style="margin: 2px 0; font-size: 11px;">تاریخ: ${formatDate(selectedDate)} (${selectedDate})</p>
        </div>
        <div class="border-b my-2"></div>

        <div class="total-box">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>🟢 نقد فروخت (Cash Sales):</span>
            <b>Rs. ${dateKpis.naqdRevenue.toLocaleString()} (${dateKpis.naqdWeightKg}kg)</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>🔴 نیا ادھار (Credit Given):</span>
            <b>Rs. ${dateKpis.odharCreditTotal.toLocaleString()} (${dateKpis.odharWeightKg}kg)</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>🔵 رقم وصولی (Wasooli Recovered):</span>
            <b>Rs. ${dateKpis.wasooliTotal.toLocaleString()} (${dateKpis.wasooliCount} وصولیاں)</b>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px solid #000; margin-top: 4px;">
            <span>💰 کل کیش ان ہینڈ (Total Cash Today):</span>
            <b>Rs. ${dateKpis.totalCashInHand.toLocaleString()}</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 3px;">
            <span>کل فروخت شدہ مال:</span>
            <b>${dateKpis.totalWeightKg} KG</b>
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
              <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-2xl">
                <Wallet className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight flex items-center gap-2">
                  <span>روزانہ نقد، ادھار و وصولی روزنامچہ</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-sans font-bold border border-emerald-200">
                    Daily Naqd, Odhar & Wasooli
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-urdu">
                  ہر تاریخ کی نقد سیلز، گاہکوں کا ادھار بل، پرانی رقم وصولی اور کل کیش ان ہینڈ کا مکمل گوشوارہ
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintDailyReport}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs font-urdu active:scale-95"
              title="روزانہ کی رپورٹ پرنٹ کریں"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>رپورٹ پرنٹ کریں</span>
            </button>
            <button
              onClick={() => onOpenBulkWalkin?.(selectedDate)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 font-urdu"
              title="تمام کاؤنٹر نقد خریداروں کی دن بھر کی سیلز ایک ساتھ درج کریں"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>+ واک ان نقد سیلز (Bulk)</span>
            </button>
            <button
              onClick={onNewSaleClick}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 font-urdu"
            >
              <Plus className="w-4 h-4" />
              <span>+ گاہک ادھار بل (POS)</span>
            </button>
            <button
              onClick={() => onOpenPaymentModal?.(null)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 font-urdu"
              title="کھاتے دار سے رقم وصولی درج کریں"
            >
              <Banknote className="w-4 h-4" />
              <span>+ رقم وصولی (Wasooli)</span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation & Master Tab Switcher */}
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

          {/* Date Picker Input */}
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

          {/* Master View Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-urdu font-black">
            <button
              onClick={() => setActiveMainTab('naqd_odhar_wasooli')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeMainTab === 'naqd_odhar_wasooli'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>نقد، ادھار و وصولی روزنامچہ</span>
            </button>
            <button
              onClick={() => setActiveMainTab('product_cuts_kg')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeMainTab === 'product_cuts_kg'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>کٹس وزن و مال کٹوتی</span>
            </button>
            <button
              onClick={() => setActiveMainTab('history_archive')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeMainTab === 'history_archive'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>ماضی آرکائیو ({dailyHistoryList.length} دن)</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4 MASTER FINANCIAL KPI CARDS FOR SELECTED DATE                      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Naqd (Cash Sales) */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-emerald-500/60 shadow-2xs relative overflow-hidden group hover:border-emerald-500 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-emerald-900 font-urdu flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>نقد فروخت (Cash Sales)</span>
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 font-mono tracking-tight">
            Rs. {dateKpis.naqdRevenue.toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-emerald-950 font-urdu flex items-center justify-between border-t border-emerald-100 pt-1.5">
            <span className="font-bold">وزن: {dateKpis.naqdWeightKg} KG</span>
            <span className="font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
              {dateKpis.naqdCount} نقد بلز
            </span>
          </div>
        </div>

        {/* Card 2: Odhar (Credit Sales Given) */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-rose-400/60 shadow-2xs relative overflow-hidden group hover:border-rose-500 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-rose-900 font-urdu flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>ادھار فروخت (Credit Sales)</span>
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono tracking-tight">
            Rs. {dateKpis.odharCreditTotal.toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-rose-950 font-urdu flex items-center justify-between border-t border-rose-100 pt-1.5">
            <span className="font-bold">وزن: {dateKpis.odharWeightKg} KG</span>
            <span className="font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
              {dateKpis.odharCount} کھاتہ دار بلز
            </span>
          </div>
        </div>

        {/* Card 3: Wasooli (Cash Recovered from Credit Customers) */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-blue-400/60 shadow-2xs relative overflow-hidden group hover:border-blue-500 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-blue-900 font-urdu flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>رقم وصولی (Wasooli Recovered)</span>
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono tracking-tight">
            Rs. {dateKpis.wasooliTotal.toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-blue-950 font-urdu flex items-center justify-between border-t border-blue-100 pt-1.5">
            <span className="font-bold">پرانے کھاتے داروں سے ریکوری</span>
            <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
              {dateKpis.wasooliCount} وصولیاں
            </span>
          </div>
        </div>

        {/* Card 4: Net Cash In Hand Today (Naqd + Wasooli) */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-600/15 p-4 sm:p-5 rounded-3xl border-2 border-amber-500/80 shadow-2xs relative overflow-hidden group hover:border-amber-600 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-amber-950 font-urdu flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-700" />
              <span>کل کیش کاؤنٹر (Cash in Hand)</span>
            </span>
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            Rs. {dateKpis.totalCashInHand.toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-amber-950 font-urdu flex items-center justify-between border-t border-amber-200/80 pt-1.5">
            <span>نقد فروخت + کھاتہ وصولی</span>
            <span className="font-mono font-bold text-slate-900">
              کل مال: {dateKpis.totalWeightKg} KG
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: DEDICATED NAQD, ODHAR & WASOOLI DAYBOOK SECTION             */}
      {/* =================================================================== */}
      {activeMainTab === 'naqd_odhar_wasooli' && (
        <div className="space-y-6">
          {/* Sub-Filter Controls for Naqd / Odhar / Wasooli */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 font-urdu hidden sm:inline">سیکشن فلٹر:</span>
              <button
                onClick={() => setCashbookFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-urdu transition ${
                  cashbookFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                مکمل روزنامچہ (All Together)
              </button>
              <button
                onClick={() => setCashbookFilter('naqd')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-urdu transition flex items-center gap-1.5 ${
                  cashbookFilter === 'naqd'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>صرف نقد سیلز (Rs. {dateKpis.naqdRevenue.toLocaleString()} • {dateKpis.naqdCount})</span>
              </button>
              <button
                onClick={() => setCashbookFilter('odhar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-urdu transition flex items-center gap-1.5 ${
                  cashbookFilter === 'odhar'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/70'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>صرف ادھار سیلز (Rs. {dateKpis.odharCreditTotal.toLocaleString()} • {dateKpis.odharCount})</span>
              </button>
              <button
                onClick={() => setCashbookFilter('wasooli')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-urdu transition flex items-center gap-1.5 ${
                  cashbookFilter === 'wasooli'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/70'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>صرف رقم وصولی (Rs. {dateKpis.wasooliTotal.toLocaleString()} • {dateKpis.wasooliCount})</span>
              </button>
            </div>

            {/* Quick search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بل #، گاہک، موبائل..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600 w-full sm:w-56 font-urdu"
              />
            </div>
          </div>

          {/* =============================================================== */}
          {/* SECTION A: NAQD / CASH SALES LIST TABLE                         */}
          {/* =============================================================== */}
          {(cashbookFilter === 'all' || cashbookFilter === 'naqd') && (
            <div className="bg-white rounded-3xl border border-emerald-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 to-teal-50/60 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-emerald-950 font-urdu flex items-center gap-2">
                      <span>🟢 نقد فروخت تفصیل (Naqd / Cash Sales)</span>
                      <span className="text-xs bg-emerald-200 text-emerald-950 font-mono font-black px-2.5 py-0.5 rounded-full">
                        {filteredNaqdSales.length} پرچیاں
                      </span>
                    </h3>
                    <p className="text-[11px] text-emerald-800/80 font-urdu mt-0.5">
                      واک ان کاؤنٹر اور نقد خریداروں کے بلز جن کی رقم فوری طور پر مکمل وصول ہو چکی ہے
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[11px] text-slate-500 font-urdu block">کل نقد رقم:</span>
                  <span className="text-base font-black text-emerald-800 font-mono">
                    Rs. {dateKpis.naqdRevenue.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    ({dateKpis.naqdWeightKg} KG فروخت)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs text-right">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                    <tr>
                      <th className="py-3 px-3">بل # و وقت</th>
                      <th className="py-3 px-3">خریدار / کاؤنٹر</th>
                      <th className="py-3 px-3">کٹس و وزن (Items & Rates)</th>
                      <th className="py-3 px-3 text-center">کل وزن</th>
                      <th className="py-3 px-3 text-left">نقد وصول رقم</th>
                      <th className="py-3 px-3 text-center">پرچی / ایکشنز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredNaqdSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-emerald-50/40 transition">
                        {/* Invoice & Time */}
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-900">{sale.invoice_no}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{sale.sale_time || '12:00:00'}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-urdu flex items-center gap-1.5">
                            <span>{sale.customer_name}</span>
                            {!sale.customer_id && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-normal">
                                واک ان کاؤنٹر
                              </span>
                            )}
                          </div>
                          {sale.phone && <div className="text-[10px] text-slate-400 font-mono">{sale.phone}</div>}
                        </td>

                        {/* Items */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 max-w-xs">
                            {sale.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-slate-50 border border-slate-200/80 rounded-md px-2 py-0.5 text-[10px] font-urdu text-slate-800 ml-1 mb-1"
                              >
                                {it.urdu_name || it.product_name}: <b>{it.weight_kg}kg</b> @ Rs.{it.rate_per_kg}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Total Weight */}
                        <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-xs">
                          {sale.total_weight_kg} KG
                        </td>

                        {/* Received Cash Amount */}
                        <td className="py-3 px-3 text-left font-mono font-black text-emerald-800 text-sm">
                          Rs. {sale.total_amount.toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenReceipt(sale)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition"
                              title="رسید دیکھیں یا پرنٹ کریں"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="بل حذف کریں (مال واپس اسٹاک میں جمع ہو جائے گا)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredNaqdSales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 text-xs font-urdu">
                          اس تاریخ ({formatDate(selectedDate)}) میں کوئی نقد فروخت ریکارڈ نہیں ہے۔
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredNaqdSales.length > 0 && (
                    <tfoot className="bg-emerald-50/70 font-bold border-t border-emerald-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 font-urdu font-black text-emerald-950">
                          مجموعی نقد فروخت حاصل:
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                          {dateKpis.naqdWeightKg} KG
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-emerald-800 text-sm">
                          Rs. {dateKpis.naqdRevenue.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SECTION B: ODHAR / CREDIT SALES LIST TABLE                      */}
          {/* =============================================================== */}
          {(cashbookFilter === 'all' || cashbookFilter === 'odhar') && (
            <div className="bg-white rounded-3xl border border-rose-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-50 to-orange-50/60 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500 text-white rounded-xl shadow-xs">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-rose-950 font-urdu flex items-center gap-2">
                      <span>🔴 ادھار فروخت تفصیل (Odhar / Credit Sales)</span>
                      <span className="text-xs bg-rose-200 text-rose-950 font-mono font-black px-2.5 py-0.5 rounded-full">
                        {filteredOdharSales.length} کھاتہ بلز
                      </span>
                    </h3>
                    <p className="text-[11px] text-rose-800/80 font-urdu mt-0.5">
                      ہوٹلوں اور دکانداروں کو ادھار پر دیا گیا چکن گوشت جو ان کے کھاتے میں جمع ہو چکا ہے
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[11px] text-slate-500 font-urdu block">نیا دیا گیا ادھار:</span>
                  <span className="text-base font-black text-rose-700 font-mono">
                    Rs. {dateKpis.odharCreditTotal.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    (کل بل: Rs. {dateKpis.odharBillTotal.toLocaleString()} • {dateKpis.odharWeightKg} KG)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-xs text-right">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                    <tr>
                      <th className="py-3 px-3">بل # و وقت</th>
                      <th className="py-3 px-3">کھاتہ دار گاہک و شاپ</th>
                      <th className="py-3 px-3">کٹس و وزن (Items & Rates)</th>
                      <th className="py-3 px-3 text-center">کل وزن</th>
                      <th className="py-3 px-3 text-left">کل بل رقم</th>
                      <th className="py-3 px-3 text-left">وصول کیش</th>
                      <th className="py-3 px-3 text-left font-black text-rose-700">نیا ادھار (Due)</th>
                      <th className="py-3 px-3 text-center">پرچی / ایکشنز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredOdharSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-rose-50/40 transition">
                        {/* Invoice & Time */}
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-900">{sale.invoice_no}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{sale.sale_time || '12:00:00'}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-urdu flex items-center gap-1.5">
                            <span>{sale.customer_name}</span>
                          </div>
                          {sale.phone && <div className="text-[10px] text-slate-400 font-mono">{sale.phone}</div>}
                        </td>

                        {/* Items */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 max-w-xs">
                            {sale.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-slate-50 border border-slate-200/80 rounded-md px-2 py-0.5 text-[10px] font-urdu text-slate-800 ml-1 mb-1"
                              >
                                {it.urdu_name || it.product_name}: <b>{it.weight_kg}kg</b> @ Rs.{it.rate_per_kg}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Weight */}
                        <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-xs">
                          {sale.total_weight_kg} KG
                        </td>

                        {/* Total Bill */}
                        <td className="py-3 px-3 text-left font-mono font-bold text-slate-800">
                          Rs. {sale.total_amount.toLocaleString()}
                        </td>

                        {/* Received Cash */}
                        <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700">
                          {sale.received_amount > 0 ? `Rs. ${sale.received_amount.toLocaleString()}` : '-'}
                        </td>

                        {/* Remaining Due */}
                        <td className="py-3 px-3 text-left font-mono font-black text-rose-700 text-sm">
                          Rs. {sale.remaining_due.toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenReceipt(sale)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition"
                              title="رسید دیکھیں یا پرنٹ کریں"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="بل حذف کریں (ادھار اور اسٹاک واپس درست ہو جائے گا)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredOdharSales.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 text-xs font-urdu">
                          اس تاریخ ({formatDate(selectedDate)}) میں کوئی ادھار فروخت نہیں ہوئی۔
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredOdharSales.length > 0 && (
                    <tfoot className="bg-rose-50/70 font-bold border-t border-rose-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 font-urdu font-black text-rose-950">
                          مجموعی ادھار فروخت کل:
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                          {dateKpis.odharWeightKg} KG
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                          Rs. {dateKpis.odharBillTotal.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-800">
                          Rs. {dateKpis.odharUpfrontPaid.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-rose-700 text-sm">
                          Rs. {dateKpis.odharCreditTotal.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SECTION C: WASOOLI / PAYMENTS RECOVERED TABLE                   */}
          {/* =============================================================== */}
          {(cashbookFilter === 'all' || cashbookFilter === 'wasooli') && (
            <div className="bg-white rounded-3xl border border-blue-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-blue-950 font-urdu flex items-center gap-2">
                      <span>🔵 کسٹمر رقم وصولی تفصیل (Wasooli / Cash Recoveries)</span>
                      <span className="text-xs bg-blue-200 text-blue-950 font-mono font-black px-2.5 py-0.5 rounded-full">
                        {filteredPayments.length} وصولیاں
                      </span>
                    </h3>
                    <p className="text-[11px] text-blue-800/80 font-urdu mt-0.5">
                      کھاتے داروں کی طرف سے پرانے بقایا جات کی مد میں ادا کردہ نقد رقم (کیش ان کاؤنٹر)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span className="text-[11px] text-slate-500 font-urdu block">کل وصول شدہ رقم:</span>
                    <span className="text-base font-black text-blue-700 font-mono">
                      Rs. {dateKpis.wasooliTotal.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenPaymentModal?.(null)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ نئی وصولی</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs text-right">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                    <tr>
                      <th className="py-3 px-3">واؤچر # و تاریخ</th>
                      <th className="py-3 px-3">کھاتہ دار گاہک</th>
                      <th className="py-3 px-3 text-left">وصول شدہ رقم (Wasooli)</th>
                      <th className="py-3 px-3 text-center">طریقہ کار</th>
                      <th className="py-3 px-3 text-left">سابقہ بقایا</th>
                      <th className="py-3 px-3 text-left">نیا بقایا</th>
                      <th className="py-3 px-3">نوٹس / تفصیل</th>
                      <th className="py-3 px-3 text-center">ایکشنز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredPayments.map(payment => (
                      <tr key={payment.id} className="hover:bg-blue-50/40 transition">
                        {/* Voucher # */}
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-900">{payment.voucher_no}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{payment.payment_date}</div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-urdu">{payment.customer_name}</div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 text-left font-mono font-black text-blue-700 text-sm">
                          Rs. {payment.amount.toLocaleString()}
                        </td>

                        {/* Method */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-urdu">
                            {payment.payment_method === 'cash'
                              ? 'نقد کیش'
                              : payment.payment_method === 'bank'
                              ? 'بینک ٹرانسفر'
                              : payment.payment_method === 'online'
                              ? 'آن لائن'
                              : payment.payment_method}
                          </span>
                        </td>

                        {/* Previous Balance */}
                        <td className="py-3 px-3 text-left font-mono text-slate-500">
                          Rs. {payment.previous_balance.toLocaleString()}
                        </td>

                        {/* New Balance */}
                        <td className="py-3 px-3 text-left font-mono font-bold text-rose-700">
                          Rs. {payment.new_balance.toLocaleString()}
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-3 text-slate-600 font-urdu text-[11px]">
                          {payment.notes || '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          {onDeletePayment && (
                            <button
                              onClick={() => onDeletePayment(payment)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="وصولی حذف کریں (کھاتے میں ادھار واپس شامل ہو جائے گا)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 text-xs font-urdu">
                          اس تاریخ ({formatDate(selectedDate)}) میں کوئی رقم وصولی درج نہیں ہے۔
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredPayments.length > 0 && (
                    <tfoot className="bg-blue-50/70 font-bold border-t border-blue-200">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 font-urdu font-black text-blue-950">
                          مجموعی کل وصولی رقم:
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-blue-700 text-sm">
                          Rs. {dateKpis.wasooliTotal.toLocaleString()}
                        </td>
                        <td colSpan={5}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SECTION D: DAILY CASH & KHATA RECONCILIATION SUMMARY BOX        */}
          {/* =============================================================== */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-4 mb-4">
              <div>
                <h4 className="font-black text-base text-amber-400 font-urdu flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-400" />
                  <span>روزانہ کیش کاؤنٹر و کھاتہ حساب کتاب خلاصہ (Daily Cash Reconciliation)</span>
                </h4>
                <p className="text-xs text-slate-300 font-urdu mt-0.5">
                  تاریخ: {formatDate(selectedDate)} ({selectedDate})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-slate-300 font-urdu block">کل کاؤنٹر کیش ان ہینڈ:</span>
                  <span className="text-xl font-mono font-black text-emerald-400">
                    Rs. {dateKpis.totalCashInHand.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-urdu">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-emerald-400 font-bold block">1. نقد سیلز آمدنی:</span>
                <span className="font-mono text-base font-black text-white block">
                  Rs. {dateKpis.naqdRevenue.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">{dateKpis.naqdWeightKg} KG گوشت فروخت</span>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-blue-400 font-bold block">2. کسٹمر رقم وصولی:</span>
                <span className="font-mono text-base font-black text-white block">
                  Rs. {dateKpis.wasooliTotal.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">{dateKpis.wasooliCount} وصولیاں موصول</span>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-rose-400 font-bold block">3. نیا ادھار مال دیا:</span>
                <span className="font-mono text-base font-black text-white block">
                  Rs. {dateKpis.odharCreditTotal.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">{dateKpis.odharWeightKg} KG ادھار مال</span>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-amber-400 font-bold block">4. کل مال اسٹاک سے کٹوتی:</span>
                <span className="font-mono text-base font-black text-white block">
                  -{dateKpis.totalWeightKg} KG
                </span>
                <span className="text-[10px] text-slate-400 block">بقایا انوینٹری: {dateKpis.currentTotalStock} KG</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: PRODUCT CUTS & STOCK DEDUCTION LOG                          */}
      {/* =================================================================== */}
      {activeMainTab === 'product_cuts_kg' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-urdu tracking-tight flex items-center gap-2">
                <span>کس ریٹ پر کتنا کلو مال بیچا گیا؟</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-sans font-bold border border-blue-200">
                  Product Cuts & Sold Rates Breakdown
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-urdu">
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
                      <div className="font-bold text-slate-900 font-urdu text-sm">{item.urduName}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{item.productName}</div>
                    </td>

                    {/* Weight Sold */}
                    <td className="py-3.5 px-3 text-center font-mono font-black text-slate-900 text-sm">
                      {item.totalWeightKg} KG
                    </td>

                    {/* Rate(s) */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                        Rs. {item.avgRate}
                      </span>
                    </td>

                    {/* Total Revenue */}
                    <td className="py-3.5 px-3 text-left font-mono font-black text-slate-900 text-sm">
                      Rs. {item.totalRevenue.toLocaleString()}
                    </td>

                    {/* Maal Cut Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-rose-100 text-rose-800">
                        -{item.totalWeightKg} KG
                      </span>
                    </td>

                    {/* Remaining Stock */}
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
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: MULTI-DAY HISTORICAL LOG ARCHIVE                            */}
      {/* =================================================================== */}
      {activeMainTab === 'history_archive' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 font-urdu tracking-tight">
              گزشتہ تمام دنوں کا سیلز و مالیاتی روزنامچہ (Daily Archive)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-urdu">
              کسی بھی تاریخ کے کارڈ پر کلک کر کے اس دن کا مکمل نقد، ادھار، وصولی اور کلو گوشت ریکارڈ کھولیں
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                <tr>
                  <th className="py-3 px-3">تاریخ (Date)</th>
                  <th className="py-3 px-3 text-center">بلز کی تعداد</th>
                  <th className="py-3 px-3 text-center">کل بیچا گیا وزن</th>
                  <th className="py-3 px-3 text-center">اوسط ریٹ فی کلو</th>
                  <th className="py-3 px-3 text-left font-bold text-emerald-700">نقد فروخت (Cash)</th>
                  <th className="py-3 px-3 text-left font-bold text-rose-700">نیا ادھار (Credit)</th>
                  <th className="py-3 px-3 text-left font-bold text-blue-700">رقم وصولی (Wasooli)</th>
                  <th className="py-3 px-3 text-left font-bold text-amber-800">کاؤنٹر کیش ان ہینڈ</th>
                  <th className="py-3 px-3 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {dailyHistoryList.map(item => (
                  <tr
                    key={item.date}
                    onClick={() => {
                      setSelectedDate(item.date);
                      setActiveMainTab('naqd_odhar_wasooli');
                    }}
                    className={`hover:bg-amber-50/50 cursor-pointer transition ${
                      item.date === selectedDate ? 'bg-amber-50/80 font-bold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-mono font-bold text-slate-900">{item.date}</div>
                      <div className="text-[10px] text-slate-400 font-urdu">{formatDate(item.date)}</div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-700">
                      {item.billsCount}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-black text-slate-900">
                      {item.totalWeightKg} KG
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                      Rs. {item.avgRatePerKg}
                    </td>
                    <td className="py-3.5 px-3 text-left font-mono font-black text-emerald-700">
                      Rs. {item.cashRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-left font-mono font-black text-rose-700">
                      Rs. {item.creditRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-left font-mono font-black text-blue-700">
                      Rs. {item.wasooliRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-left font-mono font-black text-amber-900">
                      Rs. {item.totalCashInHand.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="text-xs text-amber-700 font-urdu hover:underline">
                        تفصیل کھولیں →
                      </span>
                    </td>
                  </tr>
                ))}

                {dailyHistoryList.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-urdu">
                      کوئی ریکارڈ موجود نہیں۔
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
