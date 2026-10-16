// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Mushtarka Khata (مشترکہ کھاتہ) Modal
// Dedicated isolated credit ledger for retail customers purchasing small
// quantities of chicken (e.g. 1-2 KG) on credit.
// Supports Credit Sales, Wasooli, Ledger History, Print, & WhatsApp Notices.
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { MushtarkaCustomer, MushtarkaTransaction, ChickenCategory } from './types';
import { chickenShopApi, DEFAULT_CHICKEN_CATEGORIES } from './api';
import { formatDate } from '../utils/formatters';
import {
  X,
  Plus,
  Search,
  ShoppingCart,
  Banknote,
  BookOpen,
  User,
  Phone,
  Scale,
  Calendar,
  CheckCircle2,
  Trash2,
  Printer,
  MessageCircle,
  Share2,
  Users,
  Wallet,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface MushtarkaKhataModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: ChickenCategory[];
  onDataChanged?: () => void;
  initialTab?: 'sale' | 'payment' | 'ledger';
  initialCustomerId?: string;
}

export const MushtarkaKhataModal: React.FC<MushtarkaKhataModalProps> = ({
  isOpen,
  onClose,
  categories = DEFAULT_CHICKEN_CATEGORIES,
  onDataChanged,
  initialTab = 'sale',
  initialCustomerId,
}) => {
  const [activeTab, setActiveTab] = useState<'sale' | 'payment' | 'ledger'>(initialTab);
  const [customers, setCustomers] = useState<MushtarkaCustomer[]>([]);
  const [transactions, setTransactions] = useState<MushtarkaTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Selected customer for viewing ledger detail
  const [viewingCustomer, setViewingCustomer] = useState<MushtarkaCustomer | null>(null);

  // Search in ledger tab
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Sale Form State
  // ---------------------------------------------------------------------------
  const [saleCustomerId, setSaleCustomerId] = useState<string>(initialCustomerId || '');
  const [isNewCustomer, setIsNewCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [saleCategoryId, setSaleCategoryId] = useState<string>(categories[0]?.id || 'cat-gosht');
  const [saleWeight, setSaleWeight] = useState<string>('1.0');
  const [saleRate, setSaleRate] = useState<string>(String(categories[0]?.default_rate_per_kg || 400));
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [lastSaleResult, setLastSaleResult] = useState<{
    customer: MushtarkaCustomer;
    transaction: MushtarkaTransaction;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Wasooli Form State
  // ---------------------------------------------------------------------------
  const [payCustomerId, setPayCustomerId] = useState<string>(initialCustomerId || '');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'cash' | 'online' | 'bank'>('cash');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState<string>('');
  const [lastPayResult, setLastPayResult] = useState<{
    customer: MushtarkaCustomer;
    transaction: MushtarkaTransaction;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custList, txList] = await Promise.all([
        chickenShopApi.getMushtarkaCustomers(),
        chickenShopApi.getMushtarkaTransactions(),
      ]);
      setCustomers(custList);
      setTransactions(txList);

      if (initialCustomerId) {
        const found = custList.find(c => c.id === initialCustomerId);
        if (found) {
          setViewingCustomer(found);
          setSaleCustomerId(found.id);
          setPayCustomerId(found.id);
        }
      }
    } catch (err) {
      console.warn('[Mushtarka] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setActiveTab(initialTab);
      setLastSaleResult(null);
      setLastPayResult(null);
    }
  }, [isOpen, initialTab, initialCustomerId]);

  if (!isOpen) return null;

  // Selected Category Info
  const selectedCat = categories.find(c => c.id === saleCategoryId) || categories[0];

  // Sale Calculations
  const calculatedSaleTotal = Math.round((Number(saleWeight) || 0) * (Number(saleRate) || 0));
  const activeSaleCust = isNewCustomer ? null : customers.find(c => c.id === saleCustomerId);
  const salePrevBalance = activeSaleCust ? Number(activeSaleCust.current_balance || 0) : 0;
  const saleNewBalance = salePrevBalance + calculatedSaleTotal;

  // Wasooli Calculations
  const activePayCust = customers.find(c => c.id === payCustomerId);
  const payPrevBalance = activePayCust ? Number(activePayCust.current_balance || 0) : 0;
  const payEnteredAmt = Number(payAmount) || 0;
  const payNewBalance = Math.max(0, payPrevBalance - payEnteredAmt);

  // Ledger Filter
  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  // Aggregate Stats
  const totalMushtarkaUdhaar = customers.reduce((acc, c) => acc + (Number(c.current_balance) || 0), 0);
  const totalMushtarkaPurchases = customers.reduce((acc, c) => acc + (Number(c.total_purchases) || 0), 0);
  const totalMushtarkaPayments = customers.reduce((acc, c) => acc + (Number(c.total_payments) || 0), 0);

  // Format Pakistan WhatsApp Phone
  const cleanPhoneForWhatsApp = (phone?: string | null): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.substring(1);
    } else if (!cleaned.startsWith('92') && cleaned.length === 10) {
      cleaned = '92' + cleaned;
    }
    return cleaned;
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCategorySelect = (catId: string) => {
    setSaleCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat?.default_rate_per_kg) {
      setSaleRate(String(cat.default_rate_per_kg));
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedSaleTotal <= 0) {
      alert('براہ کرم درست وزن اور ریٹ درج کریں');
      return;
    }

    if (isNewCustomer && !newCustName.trim()) {
      alert('براہ کرم نئے گاہک کا نام درج کریں');
      return;
    }

    if (!isNewCustomer && !saleCustomerId) {
      alert('براہ کرم گاہک منتخب کریں یا نیا گاہک درج کریں');
      return;
    }

    try {
      setSaving(true);
      const res = await chickenShopApi.recordMushtarkaSale({
        customer_id: isNewCustomer ? undefined : saleCustomerId,
        customer_name: isNewCustomer ? newCustName.trim() : (activeSaleCust?.name || 'کسٹمر'),
        phone: isNewCustomer ? newCustPhone.trim() : (activeSaleCust?.phone || ''),
        category_name: selectedCat?.urdu_name || 'چکن گوشت',
        weight_kg: Number(saleWeight),
        rate_per_kg: Number(saleRate),
        date: saleDate,
        notes: saleNotes || undefined,
      });

      setLastSaleResult(res);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert('ادھار سیل محفوظ کرنے میں مسئلہ: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleWasooliSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomerId) {
      alert('براہ کرم گاہک منتخب کریں');
      return;
    }
    if (payEnteredAmt <= 0) {
      alert('براہ کرم درست رقم درج کریں');
      return;
    }

    try {
      setSaving(true);
      const res = await chickenShopApi.recordMushtarkaPayment({
        customer_id: payCustomerId,
        amount: payEnteredAmt,
        payment_method: payMethod,
        date: payDate,
        notes: payNotes || undefined,
      });

      setLastPayResult(res);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert('وصولی محفوظ کرنے میں مسئلہ: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (!window.confirm('کیا آپ واقعی یہ مشترکہ کھاتہ انٹری ڈیلیٹ کرنا چاہتے ہیں؟')) return;
    try {
      await chickenShopApi.deleteMushtarkaTransaction(txId);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert('انٹری ڈیلیٹ کرنے میں مسئلہ: ' + (err.message || 'Error'));
    }
  };

  // WhatsApp Helpers
  const sendSaleWhatsApp = (tx: MushtarkaTransaction, cust: MushtarkaCustomer) => {
    const phone = cleanPhoneForWhatsApp(cust.phone);
    const msg = `*شان چکن شاپ - مشترکہ کھاتہ ادھار پرچی*\n` +
      `محترم جناب *${cust.name}*!\n` +
      `آپ کے مشترکہ کھاتہ میں ادھار خریداری درج کی گئی ہے:\n\n` +
      `🍗 *آئٹم:* ${tx.category_name || 'چکن'}\n` +
      `⚖️ *وزن:* ${tx.weight_kg} KG (@ Rs. ${tx.rate_per_kg}/kg)\n` +
      `💵 *آج کا بل:* Rs. ${tx.total_amount.toLocaleString()}\n` +
      `📊 *سابقہ ادھار:* Rs. ${tx.previous_balance.toLocaleString()}\n` +
      `💰 *کل نیا بقایا کھاتہ:* Rs. ${tx.new_balance.toLocaleString()}\n` +
      `📅 *تاریخ:* ${tx.date}\n\n` +
      `شکریہ! *شان چکن شاپ*`;

    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const sendPaymentWhatsApp = (tx: MushtarkaTransaction, cust: MushtarkaCustomer) => {
    const phone = cleanPhoneForWhatsApp(cust.phone);
    const msg = `*شان چکن شاپ - مشترکہ کھاتہ وصولی رسید*\n` +
      `محترم جناب *${cust.name}*!\n` +
      `آپ کی طرف سے رقم کی وصولی موصول ہو چکی ہے:\n\n` +
      `💵 *وصول شدہ رقم:* Rs. ${tx.total_amount.toLocaleString()}\n` +
      `📊 *سابقہ ادھار:* Rs. ${tx.previous_balance.toLocaleString()}\n` +
      `💰 *باقی بقایا رقم:* Rs. ${tx.new_balance.toLocaleString()}\n` +
      `📅 *تاریخ:* ${tx.date}\n\n` +
      `شکریہ! *شان چکن شاپ*`;

    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Print Customer Ledger
  const handlePrintLedger = (cust: MushtarkaCustomer) => {
    const custTxs = transactions
      .filter(t => t.customer_id === cust.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = custTxs.map((t, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
        <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
        <td style="font-weight: bold;">${t.date} ${t.time ? `<span style="font-size: 10px; color: #64748b;">${t.time}</span>` : ''}</td>
        <td>${t.type === 'sale' ? `<span style="color: #b91c1c; font-weight: bold;">ادھار خریداری (${t.category_name || 'چکن'})</span>` : `<span style="color: #047857; font-weight: bold;">رقم وصولی (${t.payment_method || 'کیش'})</span>`}</td>
        <td style="text-align: right; font-family: monospace;">${t.weight_kg ? `${t.weight_kg} KG` : '—'}</td>
        <td style="text-align: right; font-family: monospace;">${t.rate_per_kg ? `@${t.rate_per_kg}` : '—'}</td>
        <td style="text-align: right; font-family: monospace; font-weight: bold; color: ${t.type === 'sale' ? '#b91c1c' : '#047857'};">
          ${t.type === 'sale' ? `+Rs. ${t.total_amount.toLocaleString()}` : `-Rs. ${t.total_amount.toLocaleString()}`}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #0f172a;">
          Rs. ${t.new_balance.toLocaleString()}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8" />
        <title>مشترکہ کھاتہ لیجر — ${cust.name}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 12mm; }
          body { font-family: system-ui, -apple-system, sans-serif; direction: rtl; color: #0f172a; padding: 15px; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 900; font-family: monospace; }
          .header h2 { margin: 2px 0; font-size: 15px; color: #7c3aed; }
          .cust-card { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background: #f1f5f9; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; }
          td { padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; }
          .footer { margin-top: 25px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SHAN CHICKEN MEAT</h1>
          <h2>شان چکن شاپ — مشترکہ کھاتہ لیجر رپورٹ</h2>
          <p style="font-size: 10px; color: #64748b;">پرنٹ تاریخ: ${new Date().toLocaleDateString('en-GB')}</p>
        </div>

        <div class="cust-card">
          <div>
            <div><strong>گاہک کا نام:</strong> <span style="font-size: 14px; font-weight: bold;">${cust.name}</span></div>
            <div><strong>موبائل فون:</strong> <span style="font-family: monospace;">${cust.phone || '—'}</span></div>
          </div>
          <div style="text-align: left;">
            <div><strong>کل بقایا واجب الادا:</strong> <span style="font-size: 16px; font-weight: 900; font-family: monospace; color: #b91c1c;">Rs. ${cust.current_balance.toLocaleString()}</span></div>
            <div style="font-size: 10px; color: #64748b;">کل خریداری: Rs. ${cust.total_purchases.toLocaleString()} • وصولی: Rs. ${cust.total_payments.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 90px;">تاریخ</th>
              <th>تفصیل لین دین</th>
              <th style="text-align: right; width: 60px;">وزن</th>
              <th style="text-align: right; width: 60px;">ریٹ</th>
              <th style="text-align: right; width: 95px;">رقم (PKR)</th>
              <th style="text-align: right; width: 95px;">باقی کھاتہ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>دستخط محرر / دکان دار: _________________</div>
          <div>دستخط گاہک (${cust.name}): _________________</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-4 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight font-urdu">
                  مشترکہ کھاتہ (Mushtarka Khata)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white font-urdu">
                  1-2 کلو خوردہ ادھار کسٹمرز
                </span>
              </div>
              <p className="text-[11px] text-purple-200 font-urdu mt-0.5">
                عام خریداروں کے چھوٹے ادھار، خودکار بقایا حساب، اور علیحدہ ڈیجیٹل کھاتہ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2.5 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 font-urdu text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('sale');
                setLastSaleResult(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-t-xl transition ${
                activeTab === 'sale'
                  ? 'bg-white text-purple-800 border-t-2 border-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <span>+ نیا ادھار سودا (Sale)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('payment');
                setLastPayResult(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-t-xl transition ${
                activeTab === 'payment'
                  ? 'bg-white text-purple-800 border-t-2 border-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>+ رقم وصولی (Wasooli)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ledger');
                setViewingCustomer(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-t-xl transition ${
                activeTab === 'ledger'
                  ? 'bg-white text-purple-800 border-t-2 border-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>کھاتہ دار و لیجر ({customers.length})</span>
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono py-1 px-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-urdu">کل واجب الادا:</span>
            <span className="font-black text-rose-700">Rs. {totalMushtarkaUdhaar.toLocaleString()}</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* ================================================================= */}
          {/* TAB 1: NEW CREDIT SALE (نیا ادھار سودا)                           */}
          {/* ================================================================= */}
          {activeTab === 'sale' && (
            <div className="space-y-4 max-w-xl mx-auto">
              {lastSaleResult ? (
                /* Success Card with WhatsApp Button */
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-4 animate-scaleUp">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 font-urdu">
                      مشترکہ ادھار سودا کامیابی سے محفوظ ہو گیا!
                    </h4>
                    <p className="text-xs text-slate-500 font-urdu mt-0.5">
                      گاہک کے مشترکہ کھاتہ میں ادھار شامل اور بقایا اپ ڈیٹ کر دیا گیا ہے۔
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200 text-xs text-right font-urdu space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">گاہک:</span>
                      <span className="font-bold text-slate-900">{lastSaleResult.customer.name}</span>
                    </div>
                    {lastSaleResult.customer.phone && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">فون نمبر:</span>
                        <span className="font-mono">{lastSaleResult.customer.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">آئٹم و وزن:</span>
                      <span className="font-bold text-amber-800">
                        {lastSaleResult.transaction.category_name} • {lastSaleResult.transaction.weight_kg} KG (@ {lastSaleResult.transaction.rate_per_kg})
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-slate-700 font-bold">آج کی خریداری:</span>
                      <span className="font-mono font-black text-amber-900 text-sm">
                        Rs. {lastSaleResult.transaction.total_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-slate-900 font-black">کل نیا بقایا کھاتہ:</span>
                      <span className="font-mono font-black text-rose-700 text-base">
                        Rs. {lastSaleResult.transaction.new_balance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => sendSaleWhatsApp(lastSaleResult.transaction, lastSaleResult.customer)}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 font-urdu"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>واٹس ایپ پر رسید بھیجیں (Send WhatsApp)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLastSaleResult(null)}
                      className="w-full py-2 px-4 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl transition font-urdu"
                    >
                      + ایک اور ادھار سودا درج کریں
                    </button>
                  </div>
                </div>
              ) : (
                /* Sale Form */
                <form onSubmit={handleSaleSubmit} className="space-y-4">
                  {/* Customer Selection or Add New Toggle */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 font-urdu">
                        مشترکہ کھاتہ گاہک (Customer):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCustomer(!isNewCustomer);
                          setSaleCustomerId('');
                        }}
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 font-urdu underline cursor-pointer"
                      >
                        {isNewCustomer ? '← موجودہ گاہک فہرست سے منتخب کریں' : '+ نیا گاہک درج کریں'}
                      </button>
                    </div>

                    {isNewCustomer ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fadeIn">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 font-urdu mb-1">
                            گاہک کا نام (Customer Name) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="مثلاً: خان صاحب / چوہدری اکرم"
                            value={newCustName}
                            onChange={e => setNewCustName(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-urdu focus:outline-none focus:border-purple-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 font-urdu mb-1">
                            موبائل فون (Phone Number)
                          </label>
                          <input
                            type="tel"
                            placeholder="0300-1234567"
                            value={newCustPhone}
                            onChange={e => setNewCustPhone(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-purple-600"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <select
                          value={saleCustomerId}
                          onChange={e => setSaleCustomerId(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-urdu text-slate-900 focus:outline-none focus:border-purple-600"
                        >
                          <option value="">-- گاہک منتخب کریں (Select Customer) --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : ''} — سابقہ بقایا: Rs. {c.current_balance.toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Chicken Category Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 font-urdu mb-1.5">
                      چکن کی قسم (Chicken Category):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`p-2.5 rounded-xl border text-center transition font-urdu ${
                            saleCategoryId === cat.id
                              ? 'bg-purple-50 border-purple-600 text-purple-900 font-black shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-xs">{cat.urdu_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">@{cat.default_rate_per_kg || 400}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Weight & Rate Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Weight Input with Quick Pills */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                        وزن (Weight in KG) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          required
                          value={saleWeight}
                          onChange={e => setSaleWeight(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-base font-black font-mono focus:outline-none focus:border-purple-600"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          KG
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        {['0.5', '1.0', '1.5', '2.0', '2.5'].map(kg => (
                          <button
                            key={kg}
                            type="button"
                            onClick={() => setSaleWeight(kg)}
                            className="flex-1 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-700 rounded-lg text-xs font-mono font-bold transition"
                          >
                            {kg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rate Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                        ریٹ فی کلو (Rate per KG) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          value={saleRate}
                          onChange={e => setSaleRate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-black font-mono focus:outline-none focus:border-purple-600"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-urdu">
                          روپے
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                        <span>ڈیفالٹ ریٹ: {selectedCat?.default_rate_per_kg || 400}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Balance Breakdown Card */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/90 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-urdu">سابقہ ادھار بقایا:</span>
                      <span className="font-mono font-bold text-slate-800">Rs. {salePrevBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-900 font-bold">
                      <span className="font-urdu">آج کی ادھار رقم ({saleWeight} KG @ {saleRate}):</span>
                      <span className="font-mono text-base font-black">Rs. {calculatedSaleTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-amber-200 font-black">
                      <span className="text-rose-900 font-urdu">نیا کل واجب الادا بقایا:</span>
                      <span className="font-mono text-lg text-rose-700">Rs. {saleNewBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Date & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 font-urdu mb-1">تاریخ</label>
                      <input
                        type="date"
                        value={saleDate}
                        onChange={e => setSaleDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 font-urdu mb-1">نوٹس (اختیاری)</label>
                      <input
                        type="text"
                        placeholder="مثلاً: 1 گھنٹہ بعد ادائیگی کا وعدہ"
                        value={saleNotes}
                        onChange={e => setSaleNotes(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-urdu"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 font-urdu disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                    <span>مشترکہ ادھار سیل محفوظ کریں (Save Credit Sale)</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: WASOOLI (رقم وصولی)                                       */}
          {/* ================================================================= */}
          {activeTab === 'payment' && (
            <div className="space-y-4 max-w-xl mx-auto">
              {lastPayResult ? (
                /* Wasooli Success Card */
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-4 animate-scaleUp">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 font-urdu">
                      مشترکہ کھاتہ وصولی درج ہو گئی!
                    </h4>
                    <p className="text-xs text-slate-500 font-urdu mt-0.5">
                      وصول شدہ رقم کھاتہ میں جمع اور باقی بقایا کم کر دیا گیا ہے۔
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200 text-xs text-right font-urdu space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">گاہک کا نام:</span>
                      <span className="font-bold text-slate-900">{lastPayResult.customer.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">وصول شدہ رقم:</span>
                      <span className="font-mono font-black text-emerald-700 text-base">
                        Rs. {lastPayResult.transaction.total_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-slate-900 font-black">باقی بقایا رقم:</span>
                      <span className="font-mono font-black text-rose-700 text-base">
                        Rs. {lastPayResult.transaction.new_balance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => sendPaymentWhatsApp(lastPayResult.transaction, lastPayResult.customer)}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 font-urdu"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>واٹس ایپ پر رسید بھیجیں (Send WhatsApp)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLastPayResult(null)}
                      className="w-full py-2 px-4 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl transition font-urdu"
                    >
                      + ایک اور وصولی درج کریں
                    </button>
                  </div>
                </div>
              ) : (
                /* Wasooli Form */
                <form onSubmit={handleWasooliSubmit} className="space-y-4">
                  {/* Select Customer */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                      گاہک منتخب کریں (Select Customer) *
                    </label>
                    <select
                      value={payCustomerId}
                      onChange={e => {
                        setPayCustomerId(e.target.value);
                        const c = customers.find(x => x.id === e.target.value);
                        if (c) setPayAmount(String(c.current_balance || ''));
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-urdu text-slate-900 focus:outline-none focus:border-emerald-600"
                      required
                    >
                      <option value="">-- گاہک منتخب کریں --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} — واجب الادا ادھار: Rs. {c.current_balance.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Customer Balance Snapshot */}
                  {activePayCust && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-urdu">
                      <div>
                        <span className="text-slate-500">سابقہ ادھار:</span>
                        <p className="font-mono font-bold text-rose-700 text-sm">Rs. {payPrevBalance.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500">وصولی کے بعد نیا بقایا:</span>
                        <p className="font-mono font-black text-emerald-700 text-sm">Rs. {payNewBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                      وصول شدہ رقم (Amount in PKR) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        placeholder="مثال: 500"
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-base font-black font-mono focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    {payPrevBalance > 0 && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setPayAmount(String(payPrevBalance))}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold font-urdu hover:bg-emerald-100"
                        >
                          مکمل بقایا (Rs. {payPrevBalance.toLocaleString()})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Method & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 font-urdu mb-1">طریقہ کار</label>
                      <select
                        value={payMethod}
                        onChange={e => setPayMethod(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-urdu"
                      >
                        <option value="cash">💵 نقد کیش (Cash)</option>
                        <option value="online">📱 آن لائن / EasyPaisa / JazzCash</option>
                        <option value="bank">🏦 بینک اکاؤنٹ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 font-urdu mb-1">تاریخ وصولی</label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 font-urdu mb-1">نوٹس / تفصیل</label>
                    <input
                      type="text"
                      placeholder="مثلاً: دکان پر کیش وصول ہوا"
                      value={payNotes}
                      onChange={e => setPayNotes(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-urdu"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 font-urdu disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
                    <span>مشترکہ وصولی محفوظ کریں (Save Payment)</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: LEDGER DIRECTORY (مشترکہ کھاتہ دار لسٹ و لیجر)              */}
          {/* ================================================================= */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              {viewingCustomer ? (
                /* Customer Full Ledger View */
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewingCustomer(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 font-urdu hover:bg-slate-100 transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>تمام مشترکہ گاہکوں پر واپس</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePrintLedger(viewingCustomer)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold font-urdu hover:bg-slate-700"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>پرنٹ لیجر</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Snapshot Card */}
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black text-slate-900 font-urdu">{viewingCustomer.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingCustomer.phone || 'فون نمبر درج نہیں'}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-urdu">
                      <div>
                        <span className="text-slate-500 block">کل ادھار خریداری:</span>
                        <span className="font-mono font-bold text-slate-800">Rs. {viewingCustomer.total_purchases.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">کل وصولی:</span>
                        <span className="font-mono font-bold text-emerald-700">Rs. {viewingCustomer.total_payments.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-rose-900 font-bold block">باقی واجب الادا کھاتہ:</span>
                        <span className="font-mono font-black text-rose-700 text-lg">Rs. {viewingCustomer.current_balance.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 text-[10.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 border-b border-slate-200 font-urdu">
                          <tr>
                            <th className="py-2.5 px-2.5 text-center w-8">#</th>
                            <th className="py-2.5 px-3">تاریخ و وقت</th>
                            <th className="py-2.5 px-3">قسم لین دین</th>
                            <th className="py-2.5 px-3 text-right">وزن و ریٹ</th>
                            <th className="py-2.5 px-3 text-right">رقم (PKR)</th>
                            <th className="py-2.5 px-3 text-right">باقی بیلنس</th>
                            <th className="py-2.5 px-3 text-center">ایکشن</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11.5px]">
                          {transactions
                            .filter(t => t.customer_id === viewingCustomer.id)
                            .map((t, idx) => (
                              <tr key={t.id} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-2.5 text-center text-slate-400">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                                  <span className="font-bold text-slate-900">{t.date}</span>
                                  {t.time && <span className="text-[10px] text-slate-400 block font-mono">{t.time}</span>}
                                </td>
                                <td className="py-2.5 px-3 font-urdu">
                                  {t.type === 'sale' ? (
                                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                                      <TrendingUp className="w-3.5 h-3.5" />
                                      <span>ادھار خریداری ({t.category_name || 'چکن'})</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                      <TrendingDown className="w-3.5 h-3.5" />
                                      <span>رقم وصولی ({t.payment_method || 'کیش'})</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {t.weight_kg ? (
                                    <span>
                                      {t.weight_kg} KG <span className="text-[10px] text-slate-400">(@{t.rate_per_kg})</span>
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-black ${
                                  t.type === 'sale' ? 'text-amber-800' : 'text-emerald-700'
                                }`}>
                                  {t.type === 'sale' ? `+Rs. ${t.total_amount.toLocaleString()}` : `-Rs. ${t.total_amount.toLocaleString()}`}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                  Rs. {t.new_balance.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTx(t.id)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                    title="انٹری ڈیلیٹ کریں"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Customer Directory Grid */
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="مشترکہ گاہک تلاش کریں (نام یا موبائل نمبر)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pr-9 pl-4 py-2.5 text-xs font-urdu focus:outline-none focus:border-purple-600 focus:bg-white transition"
                    />
                  </div>

                  {/* Customer Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredCustomers.map(cust => (
                      <div
                        key={cust.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-[10px] text-slate-500 font-bold">
                              {cust.phone || 'فون نمبر درج نہیں'}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-urdu ${
                              cust.current_balance > 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {cust.current_balance > 0 ? 'بقایا واجب الادا' : 'کلیئر'}
                            </span>
                          </div>

                          <h4 className="font-black text-slate-900 text-base font-urdu">
                            {cust.name}
                          </h4>

                          <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-urdu text-slate-600">باقی ادھار کھاتہ:</span>
                            <span className="text-base font-mono font-black text-rose-700">
                              Rs. {cust.current_balance.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSaleCustomerId(cust.id);
                              setIsNewCustomer(false);
                              setActiveTab('sale');
                            }}
                            className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold font-urdu transition border border-purple-200 flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ سودا</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPayCustomerId(cust.id);
                              setPayAmount(String(cust.current_balance || ''));
                              setActiveTab('payment');
                            }}
                            className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold font-urdu transition border border-emerald-200 flex items-center justify-center gap-1"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>+ وصولی</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setViewingCustomer(cust)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200"
                            title="تفصیلی لیجر دیکھیں"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredCustomers.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-xs font-urdu bg-slate-50 rounded-2xl border border-slate-200">
                      کوئی مشترکہ گاہک موجود نہیں۔ اوپر والے ٹیب سے نیا ادھار سودا درج کریں۔
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 px-5 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-urdu">
            شان چکن شاپ • خودکار رئیل ٹائم کھاتہ ہم آہنگی (Realtime Sync)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition font-urdu"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
