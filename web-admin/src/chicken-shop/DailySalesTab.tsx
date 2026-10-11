// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Daily Sales & Operations Daybook
// Unified, Compact, & Intuitive Layout with All Sales Options at Hand
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  ChickenSale,
  ChickenProduct,
  FreshChickenArrival,
  ChickenPayment,
  ChickenCustomer,
} from './types';
import { formatDate } from '../utils/formatters';
import {
  History,
  Calendar,
  Scale,
  DollarSign,
  Search,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Banknote,
  Users,
  CreditCard,
  Plus,
  Clock,
  ArrowDownLeft,
  Layers,
  ArrowUpRight,
  Wallet,
  Sparkles,
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
  onNewSaleClick: (mode?: 'cash' | 'credit') => void;
  onOpenBulkWalkin?: (date?: string) => void;
  onOpenPaymentModal?: (customer?: ChickenCustomer | null) => void;
  onOpenFreshArrival?: () => void;
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
  onOpenFreshArrival,
}) => {
  // Current local today string in YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Selected date for daybook inspection
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Primary view mode:
  // 1. 'daybook': Unified transactions ledger (Naqd, Odhar, Wasooli)
  // 2. 'product_cuts_kg': Meat cuts sold breakdown & stock deduction
  // 3. 'reconciliation': Cash drawer & ledger audit
  // 4. 'history_archive': Multi-day history
  const [activeMainTab, setActiveMainTab] = useState<'daybook' | 'product_cuts_kg' | 'reconciliation' | 'history_archive'>(
    'daybook'
  );

  // Filter inside the Daybook table: 'all' | 'naqd' | 'odhar' | 'wasooli'
  const [daybookFilter, setDaybookFilter] = useState<'all' | 'naqd' | 'odhar' | 'wasooli'>('all');
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

  const isToday = selectedDate === todayStr;

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
    const totalRevenue = dateSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalWeightKg = Number(
      dateSales.reduce((sum, s) => sum + (Number(s.total_weight_kg) || 0), 0).toFixed(2)
    );
    const avgRatePerKg = totalWeightKg > 0 ? Math.round(totalRevenue / totalWeightKg) : 0;

    // 1. Naqd (Cash Sales)
    const naqdRevenue = naqdSales.reduce((sum, s) => sum + s.total_amount, 0);
    const naqdWeightKg = Number(
      naqdSales.reduce((sum, s) => sum + (Number(s.total_weight_kg) || 0), 0).toFixed(2)
    );

    // 2. Odhar (Credit Sales Given)
    const odharCreditTotal = odharSales.reduce((sum, s) => sum + s.remaining_due, 0);
    const odharBillTotal = odharSales.reduce((sum, s) => sum + s.total_amount, 0);
    const odharUpfrontPaid = odharSales.reduce((sum, s) => sum + s.received_amount, 0);
    const odharWeightKg = Number(
      odharSales.reduce((sum, s) => sum + (Number(s.total_weight_kg) || 0), 0).toFixed(2)
    );

    // 3. Wasooli (Customer Cash Recoveries collected today)
    const wasooliTotal = datePayments.reduce((sum, p) => sum + p.amount, 0);
    const wasooliCount = datePayments.length;

    // 4. Net Cash In Hand Today = Sales Cash Received + Wasooli Recoveries
    const totalCashFromSales = dateSales.reduce((sum, s) => sum + s.received_amount, 0);
    const totalCashInHand = totalCashFromSales + wasooliTotal;

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
    };
  }, [dateSales, naqdSales, odharSales, datePayments]);

  // ---------------------------------------------------------------------------
  // Unified Daybook Rows (Combined Chronological Ledger)
  // ---------------------------------------------------------------------------
  interface UnifiedRow {
    id: string;
    type: 'naqd' | 'odhar' | 'wasooli';
    code: string;
    time: string;
    customer_name: string;
    phone?: string | null;
    is_walkin: boolean;
    items_summary: string;
    weight_kg: number;
    total_amount: number;
    cash_in: number;
    credit_due: number;
    notes?: string | null;
    rawSale?: ChickenSale;
    rawPayment?: ChickenPayment;
  }

  const unifiedDaybook = useMemo(() => {
    const rows: UnifiedRow[] = [];

    // Add sales
    dateSales.forEach(s => {
      const isOdhar = s.remaining_due > 0;
      const itemsSummary = s.items
        .map(i => `${i.urdu_name || i.product_name} (${i.weight_kg}kg @ ${i.rate_per_kg})`)
        .join(' • ');

      rows.push({
        id: s.id,
        type: isOdhar ? 'odhar' : 'naqd',
        code: s.invoice_no,
        time: s.sale_time || '12:00:00',
        customer_name: s.customer_name || 'کاؤنٹر واک ان',
        phone: s.phone,
        is_walkin: !s.customer_id,
        items_summary: itemsSummary,
        weight_kg: Number(s.total_weight_kg) || 0,
        total_amount: s.total_amount,
        cash_in: s.received_amount,
        credit_due: s.remaining_due,
        notes: s.notes,
        rawSale: s,
      });
    });

    // Add payments (Wasooli)
    datePayments.forEach(p => {
      rows.push({
        id: p.id,
        type: 'wasooli',
        code: p.voucher_no,
        time: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '12:00:00',
        customer_name: p.customer_name,
        phone: null,
        is_walkin: false,
        items_summary: `سابقہ ادھار کھاتہ سے نقد وصولی (${p.payment_method === 'cash' ? 'کیش' : p.payment_method})`,
        weight_kg: 0,
        total_amount: p.amount,
        cash_in: p.amount,
        credit_due: 0,
        notes: p.notes,
        rawPayment: p,
      });
    });

    // Sort by time descending (latest on top)
    return rows.sort((a, b) => b.time.localeCompare(a.time));
  }, [dateSales, datePayments]);

  // Filtered Daybook Rows
  const filteredDaybook = useMemo(() => {
    let list = unifiedDaybook;

    if (daybookFilter === 'naqd') {
      list = list.filter(r => r.type === 'naqd');
    } else if (daybookFilter === 'odhar') {
      list = list.filter(r => r.type === 'odhar');
    } else if (daybookFilter === 'wasooli') {
      list = list.filter(r => r.type === 'wasooli');
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter(
      r =>
        r.code.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q)) ||
        r.items_summary.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [unifiedDaybook, daybookFilter, searchQuery]);

  // ---------------------------------------------------------------------------
  // Product-wise Breakdown for Selected Date: Cuts & Rates
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

    payments.forEach(p => {
      const existing = dayMap.get(p.payment_date);
      const amt = Number(p.amount) || 0;
      if (!existing) {
        dayMap.set(p.payment_date, {
          date: p.payment_date,
          billsCount: 0,
          totalWeightKg: 0,
          totalRevenue: 0,
          cashRevenue: 0,
          creditRevenue: 0,
          wasooliRevenue: amt,
        });
      } else {
        existing.wasooliRevenue += amt;
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

  return (
    <div className="space-y-4 animate-fadeIn pb-12 font-sans">
      {/* =================================================================== */}
      {/* COMPACT COMMAND BAR: ALL SALES OPTIONS & SLIM DATE SELECTOR        */}
      {/* =================================================================== */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Date Stepper */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-700 rounded-2xl shrink-0">
              <Wallet className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 font-urdu tracking-tight">
                  روزانہ نقد، ادھار و وصولی روزنامچہ
                </h2>
                <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200/70">
                  {selectedDate}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-urdu hidden sm:block">
                تمام نقد و ادھار بلز، کسٹمر وصولی، اور فروخت شدہ کٹس وزن کا براہ راست گوشوارہ
              </p>
            </div>

            {/* Slim Date Stepper Controls */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 mr-auto lg:mr-2">
              <button
                onClick={handlePrevDay}
                className="p-1 hover:bg-white text-slate-700 rounded-xl transition shadow-2xs"
                title="پچھلا دن"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold font-urdu transition ${
                  selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                کل
              </button>
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-urdu transition ${
                  isToday
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                آج
              </button>
              <button
                onClick={handleNextDay}
                disabled={isToday}
                className={`p-1 rounded-xl transition ${
                  isToday ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-white text-slate-700 shadow-2xs'
                }`}
                title="اگلا دن"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-xl border border-slate-200 text-xs font-mono ml-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <input
                  type="date"
                  max={todayStr}
                  value={selectedDate}
                  onChange={e => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer w-28 text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* ALL SALES OPTIONS: Unified Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            {/* 1. Quick Cash Sale */}
            <button
              onClick={() => onNewSaleClick('cash')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs active:scale-95 font-urdu"
              title="واک ان کاؤنٹر نقد سیل درج کریں"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>+ نقد سیل</span>
            </button>

            {/* 2. Customer Khata / Credit Bill */}
            <button
              onClick={() => onNewSaleClick('credit')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs active:scale-95 font-urdu"
              title="گاہک کے کھاتے میں ادھار بل درج کریں"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ کھاتہ بل</span>
            </button>

            {/* 3. Bulk Walk-in Sale */}
            <button
              onClick={() => onOpenBulkWalkin?.(selectedDate)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs active:scale-95 font-urdu"
              title="واک ان کاؤنٹر کی دن بھر کی مجموعی کلو نقد سیلز درج کریں"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>+ بلک واک ان</span>
            </button>

            {/* 4. Receive Payment (Wasooli) */}
            <button
              onClick={() => onOpenPaymentModal?.(null)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs active:scale-95 font-urdu"
              title="کھاتے دار گاہک سے ادھار رقم وصولی درج کریں"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ رقم وصولی</span>
            </button>

            {/* 5. Fresh Arrival Option */}
            {onOpenFreshArrival && (
              <button
                onClick={onOpenFreshArrival}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-xs active:scale-95 font-urdu"
                title="نئی زندہ چکن آمد درج کریں"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">+ چکن آمد</span>
              </button>
            )}

            {/* 6. Thermal Print Daybook Report */}
            <button
              onClick={handlePrintDailyReport}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-slate-200 active:scale-95 font-urdu"
              title="اس تاریخ کا مکمل روزنامچہ پرنٹ کریں"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>پرنٹ</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* COMPACT 4 FINANCIAL KPIS STRIP (Minimal Height, Maximum Clarity)    */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Metric 1: Cash Sales */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-emerald-500/50 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 font-urdu text-xs font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              نقد فروخت (Cash)
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
              {dateKpis.naqdCount} بلز
            </span>
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-emerald-700 font-mono">
            Rs. {dateKpis.naqdRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5 font-bold">
            وزن: {dateKpis.naqdWeightKg} KG
          </div>
        </div>

        {/* Metric 2: Credit Sales (Odhar) */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-rose-400/50 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800 font-urdu text-xs font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              ادھار فروخت (Credit)
            </span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono">
              {dateKpis.odharCount} بلز
            </span>
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-rose-700 font-mono">
            Rs. {dateKpis.odharCreditTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5 font-bold">
            وزن: {dateKpis.odharWeightKg} KG
          </div>
        </div>

        {/* Metric 3: Wasooli (Recoveries) */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-blue-400/50 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800 font-urdu text-xs font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              رقم وصولی (Wasooli)
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">
              {dateKpis.wasooliCount} وصولیاں
            </span>
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-blue-700 font-mono">
            Rs. {dateKpis.wasooliTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-urdu mt-0.5">
            پرانے کھاتے داروں سے
          </div>
        </div>

        {/* Metric 4: Net Drawer Cash in Hand */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3 sm:p-3.5 rounded-2xl border-2 border-amber-500/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-950 font-urdu text-xs font-bold">
            <span className="flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-amber-700" />
              کیش ان ہینڈ (Drawer)
            </span>
            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-urdu">
              کل دراز
            </span>
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-slate-900 font-mono">
            Rs. {dateKpis.totalCashInHand.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-900 font-urdu mt-0.5 font-bold">
            نقد سیل + کسٹمر وصولی
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MASTER SEGMENTED TABS (Organized Views, No Endless Scrolling)       */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-urdu font-black overflow-x-auto no-scrollbar max-w-full shrink-0">
          <button
            onClick={() => setActiveMainTab('daybook')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeMainTab === 'daybook'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>روزنامچہ و ٹرانزیکشنز ({unifiedDaybook.length})</span>
          </button>
          <button
            onClick={() => setActiveMainTab('product_cuts_kg')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeMainTab === 'product_cuts_kg'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>کلو کٹس و مال فروخت ({productBreakdown.length})</span>
          </button>
          <button
            onClick={() => setActiveMainTab('reconciliation')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeMainTab === 'reconciliation'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>کیش دراز آڈٹ خلاصہ</span>
          </button>
          <button
            onClick={() => setActiveMainTab('history_archive')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeMainTab === 'history_archive'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>ماضی آرکائیو ({dailyHistoryList.length} دن)</span>
          </button>
        </div>

        {/* Global Search Filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بل #، گاہک، کٹس، تفصیل..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600 font-urdu shadow-2xs"
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: UNIFIED CHRONOLOGICAL TRANSACTIONS DAYBOOK                  */}
      {/* =================================================================== */}
      {activeMainTab === 'daybook' && (
        <div className="space-y-3">
          {/* Daybook Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-urdu font-bold">
              <span className="text-slate-500 pl-1">دیکھیں:</span>
              <button
                onClick={() => setDaybookFilter('all')}
                className={`px-2.5 py-1 rounded-xl transition ${
                  daybookFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                سبھی ریکارڈز ({unifiedDaybook.length})
              </button>
              <button
                onClick={() => setDaybookFilter('naqd')}
                className={`px-2.5 py-1 rounded-xl transition flex items-center gap-1 ${
                  daybookFilter === 'naqd'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>صرف نقد سیلز ({dateKpis.naqdCount})</span>
              </button>
              <button
                onClick={() => setDaybookFilter('odhar')}
                className={`px-2.5 py-1 rounded-xl transition flex items-center gap-1 ${
                  daybookFilter === 'odhar'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>صرف ادھار کھاتہ ({dateKpis.odharCount})</span>
              </button>
              <button
                onClick={() => setDaybookFilter('wasooli')}
                className={`px-2.5 py-1 rounded-xl transition flex items-center gap-1 ${
                  daybookFilter === 'wasooli'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>صرف رقم وصولی ({dateKpis.wasooliCount})</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-urdu pr-1">
              کل اندراج: <b className="text-slate-900 font-mono">{filteredDaybook.length}</b>
            </div>
          </div>

          {/* Single Unified, Compact Daybook Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs text-right">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                  <tr>
                    <th className="py-2.5 px-3">رسید # و وقت</th>
                    <th className="py-2.5 px-3 text-center">قسم ٹرانزیکشن</th>
                    <th className="py-2.5 px-3">خریدار / گاہک</th>
                    <th className="py-2.5 px-3">تفصیل آئٹمز / کٹس</th>
                    <th className="py-2.5 px-3 text-center">کل کلو (KG)</th>
                    <th className="py-2.5 px-3 text-left">کل بل رقم</th>
                    <th className="py-2.5 px-3 text-left">کیش موصول</th>
                    <th className="py-2.5 px-3 text-left">بقایا ادھار</th>
                    <th className="py-2.5 px-3 text-center">ایکشن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredDaybook.map(row => {
                    const isNaqd = row.type === 'naqd';
                    const isOdhar = row.type === 'odhar';
                    const isWasooli = row.type === 'wasooli';

                    return (
                      <tr
                        key={row.id}
                        className={`transition hover:bg-slate-50/80 ${
                          isWasooli
                            ? 'bg-blue-50/20'
                            : isOdhar
                            ? 'bg-rose-50/20'
                            : ''
                        }`}
                      >
                        {/* Code & Time */}
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">{row.code}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{row.time}</span>
                          </div>
                        </td>

                        {/* Transaction Type Badge */}
                        <td className="py-2.5 px-3 text-center">
                          {isNaqd && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-urdu bg-emerald-100 text-emerald-800 border border-emerald-200">
                              🟢 نقد سیل
                            </span>
                          )}
                          {isOdhar && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-urdu bg-rose-100 text-rose-800 border border-rose-200">
                              🔴 ادھار کھاتہ
                            </span>
                          )}
                          {isWasooli && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-urdu bg-blue-100 text-blue-800 border border-blue-200">
                              🔵 رقم وصولی
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 font-urdu">{row.customer_name}</div>
                          {row.phone && <div className="text-[10px] text-slate-400 font-mono">{row.phone}</div>}
                        </td>

                        {/* Items / Summary */}
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="text-[11px] text-slate-700 font-urdu truncate" title={row.items_summary}>
                            {row.items_summary || row.notes || '—'}
                          </div>
                        </td>

                        {/* Weight (KG) */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 text-xs">
                          {row.weight_kg > 0 ? `${row.weight_kg} KG` : '—'}
                        </td>

                        {/* Total Amount */}
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                          Rs. {row.total_amount.toLocaleString()}
                        </td>

                        {/* Cash In */}
                        <td className="py-2.5 px-3 text-left font-mono font-black text-emerald-700">
                          {row.cash_in > 0 ? `Rs. ${row.cash_in.toLocaleString()}` : '—'}
                        </td>

                        {/* Credit Due */}
                        <td className="py-2.5 px-3 text-left font-mono font-black text-rose-700">
                          {row.credit_due > 0 ? `Rs. ${row.credit_due.toLocaleString()}` : '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {row.rawSale && (
                              <button
                                onClick={() => onOpenReceipt(row.rawSale!)}
                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition"
                                title="رسید دیکھیں یا پرنٹ کریں"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {row.rawSale && (
                              <button
                                onClick={() => onDeleteSale(row.rawSale!)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="بل حذف کریں (مال اور کھاتہ بحال ہوگا)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {row.rawPayment && onDeletePayment && (
                              <button
                                onClick={() => onDeletePayment(row.rawPayment!)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="وصولی حذف کریں"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredDaybook.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-urdu">
                        اس تاریخ ({formatDate(selectedDate)}) میں کوئی ریکارڈ موجود نہیں ہے۔ اوپر دیے گئے بٹن سے فوری سیل یا وصولی درج کریں۔
                      </td>
                    </tr>
                  )}
                </tbody>

                {filteredDaybook.length > 0 && (
                  <tfoot className="bg-slate-100 text-slate-900 font-bold border-t border-slate-300 font-sans text-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 font-urdu font-black text-slate-900">
                        مجموعی خلاصہ:
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                        {dateKpis.totalWeightKg} KG
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900">
                        Rs. {dateKpis.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-black text-emerald-800">
                        Rs. {dateKpis.totalCashInHand.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-black text-rose-700">
                        Rs. {dateKpis.odharCreditTotal.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: PRODUCT CUTS KG BREAKDOWN & STOCK DEDUCTION                 */}
      {/* =================================================================== */}
      {activeMainTab === 'product_cuts_kg' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-sm text-slate-900 font-urdu flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>کس ریٹ پر کتنا کلو مال بیچا گیا؟ (Meat Cuts Sold & Rates)</span>
              </h3>
              <p className="text-xs text-slate-500 font-urdu mt-0.5">
                آج کے تمام کٹس کی فروخت، فی کلو اوسط ریٹ اور دکان اسٹاک سے خودکار کٹوتی
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-urdu text-slate-500">فلٹر کٹ:</span>
              <select
                value={selectedProductFilter}
                onChange={e => setSelectedProductFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-urdu font-bold focus:outline-none focus:border-amber-600"
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-xs text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                <tr>
                  <th className="py-2.5 px-3">کٹ کا نام</th>
                  <th className="py-2.5 px-3 text-center">کل بیچا گیا وزن</th>
                  <th className="py-2.5 px-3 text-center">اوسط ریٹ فی کلو</th>
                  <th className="py-2.5 px-3 text-left">مجموعی حاصل رقم</th>
                  <th className="py-2.5 px-3 text-center">بلز کی تعداد</th>
                  <th className="py-2.5 px-3 text-center">موجودہ اسٹاک</th>
                  <th className="py-2.5 px-3 text-center">اسٹاک کٹوتی نوٹس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {productBreakdown.map(prod => (
                  <tr key={prod.productId} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-urdu font-bold text-slate-900">
                      {prod.urduName} <span className="text-[10px] text-slate-400 font-sans font-normal">({prod.productName})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 text-sm">
                      {prod.totalWeightKg} KG
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                      Rs. {prod.avgRate}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900">
                      Rs. {prod.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {prod.billsCount} بلز
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                      {prod.currentStockKg} KG
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-urdu bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✓ اسٹاک سے منہا
                      </span>
                    </td>
                  </tr>
                ))}

                {productBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs font-urdu">
                      اس تاریخ میں کسی بھی کٹ کی فروخت ریکارڈ نہیں ہوئی۔
                    </td>
                  </tr>
                )}
              </tbody>

              {productBreakdown.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t border-slate-300 font-sans">
                  <tr>
                    <td className="py-2.5 px-3 font-urdu font-black text-slate-900">مجموعی ٹوٹل:</td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                      {dateKpis.totalWeightKg} KG
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-800">
                      Rs. {dateKpis.avgRatePerKg}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900">
                      Rs. {dateKpis.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-800">
                      {dateKpis.billsCount} بلز
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: CASH DRAWER RECONCILIATION SUMMARY BOX                      */}
      {/* =================================================================== */}
      {activeMainTab === 'reconciliation' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="font-black text-sm text-amber-400 font-urdu flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>روزانہ کیش دراز و کھاتہ حساب کتاب خلاصہ (Daily Cash Reconciliation)</span>
              </h4>
              <p className="text-xs text-slate-400 font-urdu mt-0.5">
                تاریخ: {formatDate(selectedDate)} ({selectedDate})
              </p>
            </div>
            <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 text-left">
              <span className="text-[10px] text-slate-300 font-urdu block">کل کاؤنٹر کیش ان ہینڈ:</span>
              <span className="text-lg font-mono font-black text-emerald-400">
                Rs. {dateKpis.totalCashInHand.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-urdu">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
              <span className="text-emerald-400 font-bold block">1. نقد سیلز کیش:</span>
              <span className="font-mono text-base font-black text-white block">
                Rs. {dateKpis.naqdRevenue.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">{dateKpis.naqdWeightKg} KG فروخت</span>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
              <span className="text-blue-400 font-bold block">2. کسٹمر پرانی وصولی:</span>
              <span className="font-mono text-base font-black text-white block">
                Rs. {dateKpis.wasooliTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">{dateKpis.wasooliCount} گاہک وصولیاں</span>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
              <span className="text-rose-400 font-bold block">3. نیا دیا گیا ادھار:</span>
              <span className="font-mono text-base font-black text-white block">
                Rs. {dateKpis.odharCreditTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">{dateKpis.odharWeightKg} KG ادھار مال</span>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1">
              <span className="text-amber-400 font-bold block">4. کل کیش ان دراز:</span>
              <span className="font-mono text-base font-black text-emerald-400 block">
                Rs. {dateKpis.totalCashInHand.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">(1 + 2 کا مجموعہ)</span>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 4: MULTI-DAY HISTORY ARCHIVE                                   */}
      {/* =================================================================== */}
      {activeMainTab === 'history_archive' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="font-black text-sm text-slate-900 font-urdu flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span>ماضی کا تاریخی روزنامچہ آرکائیو (History Archive)</span>
            </h3>
            <p className="text-xs text-slate-500 font-urdu mt-0.5">
              کسی بھی تاریخ کے کارڈ پر کلک کر کے اس دن کا مکمل نقد، ادھار، اور وصولی ریکارڈ کھولیں
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                <tr>
                  <th className="py-2.5 px-3">تاریخ (Date)</th>
                  <th className="py-2.5 px-3 text-center">بلز کی تعداد</th>
                  <th className="py-2.5 px-3 text-center">کل بیچا گیا وزن</th>
                  <th className="py-2.5 px-3 text-center">اوسط ریٹ</th>
                  <th className="py-2.5 px-3 text-left text-emerald-800">نقد فروخت</th>
                  <th className="py-2.5 px-3 text-left text-rose-700">نیا ادھار</th>
                  <th className="py-2.5 px-3 text-left text-blue-700">رقم وصولی</th>
                  <th className="py-2.5 px-3 text-left font-black text-amber-900">کاؤنٹر کیش</th>
                  <th className="py-2.5 px-3 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {dailyHistoryList.map(item => (
                  <tr
                    key={item.date}
                    onClick={() => {
                      setSelectedDate(item.date);
                      setActiveMainTab('daybook');
                    }}
                    className={`hover:bg-amber-50/50 cursor-pointer transition ${
                      item.date === selectedDate ? 'bg-amber-50/80 font-bold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-slate-900">{item.date}</div>
                      <div className="text-[10px] text-slate-400 font-urdu">{formatDate(item.date)}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {item.billsCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                      {item.totalWeightKg} KG
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      Rs. {item.avgRatePerKg}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                      Rs. {item.cashRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-700">
                      Rs. {item.creditRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-blue-700">
                      Rs. {item.wasooliRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-black text-amber-900">
                      Rs. {item.totalCashInHand.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center font-urdu text-amber-700 text-xs hover:underline">
                      تفصیل کھولیں →
                    </td>
                  </tr>
                ))}

                {dailyHistoryList.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 text-xs font-urdu">
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
