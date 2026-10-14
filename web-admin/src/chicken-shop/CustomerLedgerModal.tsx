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
  Trash2,
  Eye,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface CustomerLedgerModalProps {
  customer: ChickenCustomer | null;
  onClose: () => void;
  onRecordPayment: (customer: ChickenCustomer) => void;
  onNewSale?: (customer: ChickenCustomer) => void;
  onCustomerUpdated?: () => void;
  onDeleteCustomer?: (customer: ChickenCustomer) => void;
  refreshTrigger?: number;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customer,
  onClose,
  onRecordPayment,
  onNewSale,
  onCustomerUpdated,
  onDeleteCustomer,
  refreshTrigger,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [entries, setEntries] = useState<ChickenShopLedgerEntry[]>([]);
  const [totalBilled, setTotalBilled] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);
  const [selectedDetailEntry, setSelectedDetailEntry] = useState<ChickenShopLedgerEntry | null>(null);

  const handlePrintSingleEntry = (e: ChickenShopLedgerEntry) => {
    if (!customer) return;
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) return;

    const isSale = e.type === 'sale';
    const sale = e.rawSale;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8">
        <title>${e.title} - ${customer.name}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #000; direction: rtl; padding: 10px; margin: 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .mono { font-family: monospace; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 8px 0; }
          th, td { padding: 4px 2px; text-align: right; }
          .num { text-align: left; font-family: monospace; }
          .highlight { font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin: 0;">🐔 شان چکن شاپ</h2>
          <p style="margin: 2px 0; font-size: 11px;">ڈیجیٹل کاؤنٹر و کھاتہ رسید</p>
          <div class="divider"></div>
          <div class="bold">${e.title}</div>
          <div style="font-size: 10px; color: #555;">تاریخ: ${formatDate(e.date)} ${e.time || ''}</div>
        </div>

        <div class="divider"></div>
        <div><strong>گاہک:</strong> ${customer.name}</div>
        ${customer.shop_name ? `<div><strong>دکان:</strong> ${customer.shop_name}</div>` : ''}
        <div><strong>فون:</strong> ${customer.phone}</div>
        <div class="divider"></div>

        ${isSale && sale && sale.items && sale.items.length > 0 ? `
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th>آئٹم / کٹ</th>
                <th class="num">وزن</th>
                <th class="num">ریٹ</th>
                <th class="num">ٹوٹل</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(it => `
                <tr>
                  <td>${it.product_name}</td>
                  <td class="num">${it.weight_kg}kg</td>
                  <td class="num">Rs.${it.rate_per_kg}</td>
                  <td class="num">Rs.${it.line_total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <div style="display:flex; justify-content:space-between;">
            <span>کل وزن:</span>
            <span class="mono bold">${sale.total_weight_kg || e.weight_kg || 0} KG</span>
          </div>
          <div style="display:flex; justify-content:space-between;" class="highlight">
            <span>کل رقم:</span>
            <span class="mono">Rs. ${(sale.total_amount || e.debit).toLocaleString()}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>نقد ادا شدہ:</span>
            <span class="mono">Rs. ${(sale.received_amount || 0).toLocaleString()}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>کھاتہ ادھار بقایا:</span>
            <span class="mono bold">Rs. ${(sale.remaining_due || e.debit).toLocaleString()}</span>
          </div>
        ` : `
          <div style="margin: 10px 0;">
            <p><strong>تفصیل:</strong> ${e.description}</p>
            ${e.debit > 0 ? `<div class="highlight">خریداری رقم: Rs. ${e.debit.toLocaleString()}</div>` : ''}
            ${e.credit > 0 ? `<div class="highlight" style="color: green;">وصول شدہ رقم: Rs. ${e.credit.toLocaleString()}</div>` : ''}
          </div>
        `}

        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between; font-weight:bold;">
          <span>کھاتہ کا باقی بیلنس:</span>
          <span class="mono">Rs. ${e.running_balance.toLocaleString()}</span>
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; color: #666; margin-top: 10px;">
          شکریہ! آپ کے تعاون کا شکریہ۔
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  const handleShareWhatsAppSingle = (e: ChickenShopLedgerEntry) => {
    if (!customer) return;
    const isSale = e.type === 'sale';
    const sale = e.rawSale;
    let text = `*🐔 شان چکن شاپ - ${e.title}*\n`;
    text += `*گاہک:* ${customer.name} ${customer.shop_name ? `(${customer.shop_name})` : ''}\n`;
    text += `*تاریخ:* ${formatDate(e.date)} ${e.time || ''}\n`;
    text += `--------------------------\n`;

    if (isSale && sale && sale.items && sale.items.length > 0) {
      text += `*آئٹمز و چکن کٹس:*\n`;
      sale.items.forEach((it, idx) => {
        text += `${idx + 1}. ${it.product_name}: ${it.weight_kg}kg @ Rs.${it.rate_per_kg} = Rs.${it.line_total}\n`;
      });
      text += `--------------------------\n`;
      text += `*کل وزن:* ${sale.total_weight_kg || e.weight_kg} KG\n`;
      text += `*کل بل:* Rs. ${(sale.total_amount || e.debit).toLocaleString()}\n`;
      if (sale.received_amount > 0) {
        text += `*نقد موصول:* Rs. ${sale.received_amount.toLocaleString()}\n`;
      }
      text += `*کھاتے میں شامل:* Rs. ${(sale.remaining_due || e.debit).toLocaleString()}\n`;
    } else {
      text += `*تفصیل:* ${e.description}\n`;
      if (e.debit > 0) text += `*خریداری:* Rs. ${e.debit.toLocaleString()}\n`;
      if (e.credit > 0) text += `*وصول شدہ:* Rs. ${e.credit.toLocaleString()}\n`;
    }

    text += `*کھاتے کا کل بقایا بیلنس:* Rs. ${e.running_balance.toLocaleString()}\n`;
    text += `--------------------------\n`;
    text += `شان چکن شاپ و ڈیجیٹل کھاتہ`;

    const phoneClean = customer.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = phoneClean.startsWith('0') ? '92' + phoneClean.slice(1) : phoneClean;
    const url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

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
  }, [customer?.id, refreshTrigger]);

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
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0">
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
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handlePrintStatement}
              className="px-2.5 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>پرنٹ اسٹیٹمنٹ</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
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
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-slate-500 font-medium">
            کل لین دین اندراجات: <strong className="text-slate-800">{entries.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            {onNewSale && (
              <button
                onClick={() => onNewSale(customer)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ نیا سودا / ادھار بل</span>
              </button>
            )}
            <button
              onClick={() => onRecordPayment(customer)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>نئی رقم وصولی درج کریں</span>
            </button>
          </div>
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
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-xs text-right min-w-[560px]">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">تاریخ</th>
                    <th className="py-2.5 px-3">تفصیل لین دین</th>
                    <th className="py-2.5 px-2 text-center">وزن</th>
                    <th className="py-2.5 px-3 text-left">خریداری (+)</th>
                    <th className="py-2.5 px-3 text-left">وصول شدہ (-)</th>
                    <th className="py-2.5 px-3 text-left">باقی بیلنس</th>
                    <th className="py-2.5 px-2 text-center w-20">تفصیل</th>
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
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailEntry(e)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 hover:text-amber-950 font-bold text-xs rounded-xl border border-amber-200 transition font-urdu flex items-center justify-center gap-1 mx-auto active:scale-95 shadow-2xs"
                          title="مکمل تفصیلات دیکھیں (View Complete Details)"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-700" />
                          <span>تفصیل</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          {onDeleteCustomer ? (
            <button
              onClick={() => {
                if (confirm(`کیا آپ واقعی گاہک "${customer.name}" اور اس کا مکمل کھاتہ حذف (Delete) کرنا چاہتے ہیں؟\n\n(Are you sure you want to delete customer "${customer.name}" and their Khata?)`)) {
                  onDeleteCustomer(customer);
                  onClose();
                }
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1.5 font-urdu active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>کھاتہ ڈیلیٹ کریں (Delete Khata)</span>
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-xl transition"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>

      {/* Complete Transaction Detail Modal (Eye Button) */}
      {selectedDetailEntry && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className={`p-4 text-white flex items-center justify-between ${
              selectedDetailEntry.type === 'sale'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                : selectedDetailEntry.type === 'payment'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                : 'bg-gradient-to-r from-slate-700 to-slate-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                  {selectedDetailEntry.type === 'sale' ? '🍗' : selectedDetailEntry.type === 'payment' ? '💵' : '📋'}
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base font-urdu">
                    {selectedDetailEntry.title}
                  </h3>
                  <p className="text-[11px] text-white/80 font-mono">
                    {formatDate(selectedDetailEntry.date)} {selectedDetailEntry.time || ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailEntry(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Customer Info Card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-urdu text-slate-500">گاہک کا نام:</span>
                  <strong className="text-slate-900 font-urdu">{customer.name} {customer.shop_name ? `(${customer.shop_name})` : ''}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-urdu text-slate-500">موبائل فون:</span>
                  <span className="font-mono text-slate-700">{customer.phone}</span>
                </div>
                {selectedDetailEntry.reference_id && (
                  <div className="flex items-center justify-between">
                    <span className="font-urdu text-slate-500">ریفرنس / نمبر:</span>
                    <span className="font-mono font-bold text-amber-800">#{selectedDetailEntry.reference_id}</span>
                  </div>
                )}
              </div>

              {/* If Sale: Display complete list of items/cuts with zero truncation */}
              {selectedDetailEntry.type === 'sale' && selectedDetailEntry.rawSale && selectedDetailEntry.rawSale.items && selectedDetailEntry.rawSale.items.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800 font-urdu flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-amber-600" />
                      <span>خرید کردہ چکن کٹس و آئٹمز (Items Breakdown)</span>
                    </h4>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      {selectedDetailEntry.rawSale.items.length} آئٹمز
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5 text-center w-8">#</th>
                          <th className="py-2 px-2.5">آئٹم / کٹ</th>
                          <th className="py-2 px-2.5 text-center">وزن (KG)</th>
                          <th className="py-2 px-2.5 text-left">ریٹ</th>
                          <th className="py-2 px-2.5 text-left">کل رقم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {selectedDetailEntry.rawSale.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="py-2 px-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-2.5 font-urdu font-bold text-slate-900">{it.product_name}</td>
                            <td className="py-2 px-2.5 text-center font-bold text-slate-800">{it.weight_kg} KG</td>
                            <td className="py-2 px-2.5 text-left text-slate-600">Rs.{it.rate_per_kg}</td>
                            <td className="py-2 px-2.5 text-left font-black text-amber-900">Rs.{it.line_total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Summary */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 text-xs space-y-1.5 font-urdu">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">کل وزن (Total Weight):</span>
                      <strong className="font-mono text-slate-900 text-sm">{selectedDetailEntry.rawSale.total_weight_kg || selectedDetailEntry.weight_kg} KG</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">بل کی کل رقم (Total Amount):</span>
                      <strong className="font-mono text-amber-800 text-base font-black">Rs. {selectedDetailEntry.rawSale.total_amount.toLocaleString()}</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/80">
                      <span className="text-emerald-700">موقع پر نقد ادائیگی (Cash Paid):</span>
                      <strong className="font-mono text-emerald-700 text-sm">Rs. {(selectedDetailEntry.rawSale.received_amount || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-rose-700">کھاتے میں ادھار بقایا (Added to Khata):</span>
                      <strong className="font-mono text-rose-700 text-sm font-black">Rs. {(selectedDetailEntry.rawSale.remaining_due || selectedDetailEntry.debit).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              ) : selectedDetailEntry.type === 'payment' ? (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
                    <span className="text-xs font-bold text-emerald-800 font-urdu block">وصول شدہ رقم</span>
                    <div className="text-2xl font-mono font-black text-emerald-700">
                      Rs. {selectedDetailEntry.credit.toLocaleString()}
                    </div>
                    <span className="text-xs text-emerald-600 font-urdu">
                      طریقہ: {selectedDetailEntry.rawPayment?.payment_method?.toUpperCase() || 'CASH'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-urdu text-slate-500">واؤچر نمبر:</span>
                      <span className="font-mono font-bold text-slate-900">#{selectedDetailEntry.reference_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-urdu text-slate-500">تاریخ:</span>
                      <span className="font-mono text-slate-700">{formatDate(selectedDetailEntry.date)}</span>
                    </div>
                    {selectedDetailEntry.rawPayment?.notes && (
                      <div className="pt-1 border-t border-slate-200 font-urdu">
                        <span className="text-slate-500 block">تفصیل / نوٹس:</span>
                        <p className="text-slate-800 font-medium mt-0.5">{selectedDetailEntry.rawPayment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-urdu text-slate-500">تفصیل:</span>
                    <span className="font-urdu font-bold text-slate-800">{selectedDetailEntry.description}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-urdu text-slate-500">رقم:</span>
                    <strong className="font-mono text-base text-slate-900">Rs. {(selectedDetailEntry.debit || selectedDetailEntry.credit).toLocaleString()}</strong>
                  </div>
                </div>
              )}

              {/* Running Balance after this entry */}
              <div className="p-3 bg-slate-100 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-urdu text-slate-600 font-bold">اس لین دین کے بعد کھاتہ بقایا:</span>
                <span className={`font-mono text-sm font-black ${selectedDetailEntry.running_balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  Rs. {selectedDetailEntry.running_balance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSingleEntry(selectedDetailEntry)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-urdu rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>پرنٹ رسید (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShareWhatsAppSingle(selectedDetailEntry)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-urdu rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>واٹس ایپ (WhatsApp)</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailEntry(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-xl transition"
              >
                بند کریں (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
