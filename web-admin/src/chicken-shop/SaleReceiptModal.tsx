// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Sale Receipt & Printable Thermal Invoice
// =============================================================================

import React from 'react';
import { ChickenSale } from './types';
import { Printer, X, Share2, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface SaleReceiptModalProps {
  sale: ChickenSale | null;
  onClose: () => void;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8">
        <title>رسید فروخت - ${sale.invoice_no}</title>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 13px;
            color: #000;
            padding: 10px;
            width: 78mm;
            margin: 0 auto;
            direction: rtl;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #444; }
          .border-t { border-top: 1px dashed #444; }
          .py-1 { padding-top: 3px; padding-bottom: 3px; }
          .my-2 { margin-top: 6px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { text-align: right; font-size: 11px; border-bottom: 1px solid #000; padding: 4px 2px; }
          td { font-size: 11px; padding: 4px 2px; border-bottom: 1px dotted #ccc; }
          .total-row td { font-weight: bold; font-size: 13px; border-top: 1px solid #000; }
          .footer { font-size: 10px; text-align: center; margin-top: 15px; border-top: 1px dashed #888; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="margin: 0; font-size: 18px;">🐔 شان چکن شاپ و گوشت سینٹر</h2>
          <p style="margin: 2px 0; font-size: 11px;">تازہ برائلر چکن، بون لیس، تھائی و چکن کٹس</p>
          <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">فون: 0300-1234567 | ساہیوال</p>
        </div>

        <div class="border-t border-b my-2 py-1" style="font-size: 11px;">
          <div><strong>رسید نمبر:</strong> ${sale.invoice_no}</div>
          <div><strong>تاریخ و وقت:</strong> ${sale.sale_date} | ${sale.sale_time}</div>
          <div><strong>گاہک کا نام:</strong> ${sale.customer_name} ${sale.phone ? `(${sale.phone})` : ''}</div>
          <div><strong>ادائیگی طریقہ:</strong> ${sale.payment_method === 'cash' ? 'نقد (Cash)' : sale.payment_method === 'credit' ? 'ادھار کھاتہ (Credit)' : 'کچھ نقد / ادھار (Partial)'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>آئٹم</th>
              <th style="text-align: center;">وزن</th>
              <th style="text-align: center;">ریٹ</th>
              <th style="text-align: left;">رقم</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td style="text-align: center;">${item.weight_kg} kg</td>
                <td style="text-align: center;">${item.rate_per_kg}</td>
                <td style="text-align: left;">${item.line_total.toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2">کل وزن: ${sale.total_weight_kg} KG</td>
              <td style="text-align: center;">ٹوٹل:</td>
              <td style="text-align: left;">Rs. ${sale.total_amount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 8px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 2px 0;">
            <span>وصول شدہ رقم (Paid):</span>
            <strong style="color: #047857;">Rs. ${sale.received_amount.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 2px 0;">
            <span>بقایا رقم اس بل کی (Remaining):</span>
            <strong style="${sale.remaining_due > 0 ? 'color: #be123c;' : ''}">Rs. ${sale.remaining_due.toLocaleString()}</strong>
          </div>
          ${sale.customer_id ? `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 2px 0;">
              <span>سابقہ کھاتہ بقایا (Previous Khata):</span>
              <span>Rs. ${sale.previous_balance.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-weight: bold; font-size: 13px; background: #f8fafc;">
              <span>مجموعی کھاتہ بقایا (Net Balance):</span>
              <span style="color: #be123c;">Rs. ${sale.new_balance.toLocaleString()}</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p style="margin: 0;">آپ کی خریداری کا شکریہ! 🍗</p>
          <p style="margin: 2px 0;">ڈیجیٹل چکن شاپ منیجر سسٹم</p>
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
    const itemsText = sale.items
      .map(i => `• ${i.product_name}: ${i.weight_kg}kg @ Rs.${i.rate_per_kg} = Rs.${i.line_total}`)
      .join('%0A');

    const text =
      `🐔 *شان چکن شاپ و گوشت سینٹر*%0A` +
      `*رسید فروخت نمبر:* ${sale.invoice_no}%0A` +
      `*تاریخ:* ${sale.sale_date}%0A` +
      `*محترم:* ${sale.customer_name}%0A` +
      `----------------------------%0A` +
      itemsText + `%0A` +
      `----------------------------%0A` +
      `*کل وزن:* ${sale.total_weight_kg} KG%0A` +
      `*ٹوٹل بل:* Rs. ${sale.total_amount.toLocaleString()}%0A` +
      `*وصول شدہ:* Rs. ${sale.received_amount.toLocaleString()}%0A` +
      `*بقایا اس بل کا:* Rs. ${sale.remaining_due.toLocaleString()}%0A` +
      (sale.customer_id ? `*کل کھاتہ بقایا جات:* Rs. ${sale.new_balance.toLocaleString()}%0A` : '') +
      `شکریہ!`;

    const phoneClean = sale.phone ? sale.phone.replace(/[^0-9]/g, '') : '';
    const url = phoneClean ? `https://wa.me/92${phoneClean.startsWith('0') ? phoneClean.slice(1) : phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐔</span>
            <div>
              <h3 className="text-base font-bold tracking-tight">رسید فروخت (Sales Receipt)</h3>
              <p className="text-xs text-amber-100 font-mono">Invoice #{sale.invoice_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Receipt Preview */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 text-sm">
          {/* Shop info banner */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h4 className="font-extrabold text-base text-slate-900 font-urdu">شان چکن شاپ و گوشت سینٹر</h4>
            <p className="text-xs text-slate-500">تازہ چکن میٹ، بون لیس، تھائی، لیگز و ونگز</p>
            <p className="text-xs text-slate-600 font-semibold mt-1">ساہیوال • فون: 0300-1234567</p>
          </div>

          {/* Customer & Sale Metadata */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">گاہک کا نام:</span>
              <span className="font-bold text-slate-900">{sale.customer_name}</span>
            </div>
            {sale.phone && (
              <div className="flex justify-between">
                <span className="text-slate-500">رابطہ نمبر:</span>
                <span className="font-mono text-slate-800">{sale.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">تاریخ و وقت:</span>
              <span className="font-mono text-slate-800">{sale.sale_date} {sale.sale_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ادائیگی کی قسم:</span>
              <span className="font-semibold text-slate-800">
                {sale.payment_method === 'cash' ? '💵 نقد (Cash)' : sale.payment_method === 'credit' ? '📝 ادھار کھاتہ (Credit)' : '⚖️ جزوی نقد/ادھار'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-right">پروڈکٹ</th>
                  <th className="py-2 px-2 text-center">وزن</th>
                  <th className="py-2 px-2 text-center">ریٹ</th>
                  <th className="py-2 px-3 text-left">رقم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                ${sale.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.product_name}</td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-700">{item.weight_kg} kg</td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-700">Rs. {item.rate_per_kg}</td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                      Rs. {item.line_total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 pt-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">کل وزن (Total Weight):</span>
              <span className="font-mono font-bold text-slate-900">{sale.total_weight_kg} KG</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-sm">
              <span className="text-slate-800 font-bold">ٹوٹل بل رقم (Invoice Total):</span>
              <span className="font-mono font-black text-slate-900">Rs. {sale.total_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-emerald-700 font-medium">وصول شدہ رقم (Paid Amount):</span>
              <span className="font-mono font-bold text-emerald-700">Rs. {sale.received_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-rose-700 font-medium">اس بل کا بقایا (Remaining Due):</span>
              <span className="font-mono font-bold text-rose-700">Rs. {sale.remaining_due.toLocaleString()}</span>
            </div>

            {sale.customer_id && (
              <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-xl space-y-1">
                <div className="flex justify-between text-amber-900 text-[11px]">
                  <span>سابقہ کھاتہ بقایا (Old Balance):</span>
                  <span className="font-mono font-semibold">Rs. {sale.previous_balance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-950 font-bold text-xs pt-1 border-t border-amber-200">
                  <span>کل نیا بقایا کھاتہ (Net Due):</span>
                  <span className="font-mono text-rose-700">Rs. {sale.new_balance.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>پرنٹ رسید (Print)</span>
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
            title="واٹس ایپ پر بھیجیں"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-xl transition"
          >
            بند کریں
          </button>
        </div>
      </div>
    </div>
  );
};
