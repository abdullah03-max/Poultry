// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Customer Ledger Statement Modal
// Clean, Professional Digi Khata Chronological Financial Ledger & Statement
// =============================================================================

import React, { useState, useEffect } from 'react';
import { ChickenCustomer, ChickenShopLedgerEntry } from './types';
import { chickenShopApi } from './api';
import {
  X,
  Printer,
  Share2,
  Plus,
  Loader2,
  Calendar,
  Phone,
  Store,
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface CustomerLedgerModalProps {
  customer: ChickenCustomer | null;
  onClose: () => void;
  onRecordPayment: (customer: ChickenCustomer) => void;
  onCustomerUpdated?: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customer,
  onClose,
  onRecordPayment,
  onCustomerUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [entries, setEntries] = useState<ChickenShopLedgerEntry[]>([]);
  const [totalBilled, setTotalBilled] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);

  const fetchLedger = async () => {
    if (!customer) return;
    try {
      setLoading(true);
      const res = await chickenShopApi.getCustomerLedger(customer.id);
      setEntries(res.entries);
      setTotalBilled(res.totalBilled);
      setTotalPaid(res.totalPaid);
      setClosingBalance(res.closingBalance);
    } catch (err) {
      console.error('Failed to load customer ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [customer]);

  if (!customer) return null;

  const handlePrintStatement = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8">
        <title>کھاتہ اسٹیٹمنٹ - ${customer.name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 13px;
            color: #0f172a;
            padding: 20px;
            direction: rtl;
          }
          .header { text-align: center; border-bottom: 2px solid #d97706; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #b45309; font-size: 22px; }
          .header p { margin: 4px 0; color: #64748b; font-size: 13px; }
          .customer-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
          .summary-grid { display: flex; gap: 12px; margin-bottom: 20px; }
          .stat-box { flex: 1; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
          .stat-box .title { font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 4px; }
          .stat-box .val { font-size: 16px; font-weight: 800; color: #0f172a; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-size: 12px; }
          td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; }
          .debit { color: #b45309; font-weight: bold; font-family: monospace; }
          .credit { color: #047857; font-weight: bold; font-family: monospace; }
          .balance { font-weight: bold; font-family: monospace; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐔 شان چکن شاپ و ڈیجیٹل کھاتہ</h1>
          <p>گاہک مالیاتی کھاتہ و لین دین اسٹیٹمنٹ (Customer Financial Ledger Statement)</p>
          <p>تاریخ پرنٹ: ${new Date().toLocaleString()}</p>
        </div>

        <div class="customer-card">
          <div style="font-size: 16px; font-weight: bold; color: #0f172a;">گاہک: ${customer.name}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">
            دکان: ${customer.shop_name || '—'} | فون: ${customer.phone} | پتہ: ${customer.address || '—'}
          </div>
        </div>

        <div class="summary-grid">
          <div class="stat-box">
            <div class="title">افتتاحی بقایا</div>
            <div class="val">Rs. ${customer.opening_balance.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="title">کل گوشت خریداری</div>
            <div class="val">Rs. ${totalBilled.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="title">کل ادا شدہ رقم</div>
            <div class="val" style="color: #047857;">Rs. ${totalPaid.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="title">موجودہ باقی واجب الادا رقم</div>
            <div class="val" style="color: #be123c;">Rs. ${closingBalance.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>تاریخ</th>
              <th>تفصیل و واؤچر</th>
              <th>وزن (KG)</th>
              <th>فروخت رقم (+)</th>
              <th>وصول شدہ (-)</th>
              <th>باقی بیلنس</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e => `
              <tr>
                <td>${formatDate(e.date)}</td>
                <td><strong>${e.title}</strong><br><span style="font-size: 11px; color: #64748b;">${e.description}</span></td>
                <td>${e.weight_kg != null ? e.weight_kg + ' KG' : '—'}</td>
                <td class="debit">${e.debit > 0 ? 'Rs. ' + e.debit.toLocaleString() : '—'}</td>
                <td class="credit">${e.credit > 0 ? 'Rs. ' + e.credit.toLocaleString() : '—'}</td>
                <td class="balance" style="${e.running_balance > 0 ? 'color: #be123c;' : 'color: #047857;'}">
                  Rs. ${e.running_balance.toLocaleString()}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>ڈیجیٹل چکن شاپ مینجمنٹ سسٹم • خودکار تصدیق شدہ کھاتہ</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    const text =
      `🐔 *شان چکن شاپ و گوشت سینٹر*%0A` +
      `*محترم:* ${customer.name}%0A` +
      `آپ کے کھاتہ کی تفصیلات مندرجہ ذیل ہیں:%0A` +
      `----------------------------%0A` +
      `• کل چکن خریداری: Rs. ${totalBilled.toLocaleString()}%0A` +
      `• کل ادا شدہ رقم: Rs. ${totalPaid.toLocaleString()}%0A` +
      `• *موجودہ بقایا واجب الادا:* *Rs. ${closingBalance.toLocaleString()}*%0A` +
      `----------------------------%0A` +
      `برائے مہربانی اپنا بقایا کلیئر فرمائیں۔ شکریہ!`;

    const phoneClean = customer.phone.replace(/[^0-9]/g, '');
    const url = phoneClean ? `https://wa.me/92${phoneClean.startsWith('0') ? phoneClean.slice(1) : phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">
              📖
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                گاہک ڈیجیٹل کھاتہ لیجر ({customer.name})
              </h3>
              <p className="text-xs text-amber-100 font-urdu">
                {customer.shop_name ? customer.shop_name + ' • ' : ''}
                فون: {customer.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintStatement}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>پرنٹ اسٹیٹمنٹ</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer KPI Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">افتتاحی بیلنس</span>
            <p className="text-base font-black text-slate-800 font-mono mt-1">
              Rs. {customer.opening_balance.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">کل خریداری (Billed)</span>
            <p className="text-base font-black text-amber-700 font-mono mt-1">
              Rs. {totalBilled.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">کل ادائیگی (Paid)</span>
            <p className="text-base font-black text-emerald-700 font-mono mt-1">
              Rs. {totalPaid.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">موجودہ بقایا کھاتہ</span>
            <p className={`text-base font-black font-mono mt-1 ${closingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              Rs. {closingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            کل لین دین اندراجات: <strong className="text-slate-800">{entries.length}</strong>
          </div>
          <button
            onClick={() => onRecordPayment(customer)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>نئی رقم وصولی درج کریں (Receive Payment)</span>
          </button>
        </div>

        {/* Chronological Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <span className="text-xs">کھاتہ لوڈ ہو رہا ہے...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              کوئی لین دین کا ریکارڈ موجود نہیں۔
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">تاریخ</th>
                    <th className="py-2.5 px-3">تفصیل لین دین</th>
                    <th className="py-2.5 px-2 text-center">وزن</th>
                    <th className="py-2.5 px-3 text-left">خریداری (+)</th>
                    <th className="py-2.5 px-3 text-left">وصول شدہ (-)</th>
                    <th className="py-2.5 px-3 text-left">باقی بیلنس</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatDate(e.date)}
                        {e.time && <span className="text-[10px] text-slate-400 block">{e.time}</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{e.title}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{e.description}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-700">
                        {e.weight_kg != null ? `${e.weight_kg} kg` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-800">
                        {e.debit > 0 ? `Rs. ${e.debit.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                        {e.credit > 0 ? `Rs. ${e.credit.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-black">
                        <span className={e.running_balance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                          Rs. {e.running_balance.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-xl transition"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
