// =============================================================================
// SHAN POULTRY PROTEIN - Customer Monthly Bill & Statement Modal
// Printable invoice with Monthly Advance Settlement & Reminder (No Daily Breakdown)
// =============================================================================

import React, { useRef, useState, useEffect } from 'react';
import { MonthlyRegisterCustomerRow, CustomerAdvanceRecord, Collection } from '../../types/database';
import { formatCurrency, formatWeight } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { Printer, Building, Phone, MapPin, Wallet, AlertTriangle, CheckCircle2, Info, ArrowDownRight, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { calculateCustomerAdvanceBalance } from '../../utils/advanceUtils';

interface CustomerMonthlyBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: MonthlyRegisterCustomerRow | null;
  monthName: string;
  year: number;
  daysInMonth: number;
}

export const CustomerMonthlyBillModal: React.FC<CustomerMonthlyBillModalProps> = ({
  isOpen,
  onClose,
  row,
  monthName,
  year,
  daysInMonth,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [advanceRecords, setAdvanceRecords] = useState<CustomerAdvanceRecord[]>([]);
  const [customerCollections, setCustomerCollections] = useState<Collection[]>([]);
  const [loadingAdvance, setLoadingAdvance] = useState<boolean>(true);

  useEffect(() => {
    if (!row?.customer?.id || !isOpen) return;
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoadingAdvance(true);
        const [advs, colRes] = await Promise.all([
          api.getCustomerAdvances(row.customer.id),
          api.getCollections({ customerId: row.customer.id, limit: 1000 }).then(r => r.collections).catch(() => []),
        ]);
        if (isMounted) {
          setAdvanceRecords(advs);
          setCustomerCollections(colRes);
        }
      } catch (err) {
        console.warn('Error loading customer advance in bill modal:', err);
      } finally {
        if (isMounted) setLoadingAdvance(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [row?.customer?.id, isOpen]);

  if (!row) return null;

  const { customer, dailyWeights, totalWeight, totalAmount } = row;
  const charbiWeight = row.totalCharbiWeight ?? 0;
  const kacharaWeight = row.totalKacharaWeight ?? totalWeight;
  const charbiRate = row.charbiRate ?? (customer.rate_charbi || 55);
  const kacharaRate = row.kacharaRate ?? (customer.rate_kachara || customer.rate_per_kg || 45);
  const charbiAmount = row.totalCharbiAmount ?? Math.round(charbiWeight * charbiRate);
  const kacharaAmount = row.totalKacharaAmount ?? Math.round(kacharaWeight * kacharaRate);

  // Calculate real-time advance balance
  const bal = calculateCustomerAdvanceBalance(customer, customerCollections, advanceRecords);

  // Latest advance transaction details
  const latestAdv = advanceRecords[0];
  const advDate = latestAdv?.date || customer.advance_date || '—';
  const advMethod = latestAdv?.payment_method || (customer as any).advance_payment_method || 'cash';
  const advNotes = latestAdv?.notes || customer.advance_notes || 'پیشگی ایڈوانس برائے ویسٹ وصولی';

  // Filter active collection days count
  const activeDays = Object.entries(dailyWeights)
    .filter(([_, w]) => w !== null && w !== undefined && Number(w) > 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const title = (typeof window !== 'undefined' ? localStorage.getItem('spp_receipt_title') : null) || 'SHAN POULTRY PROTEIN';
    const phone = (typeof window !== 'undefined' ? localStorage.getItem('spp_business_phone') : null) || '0300-0000000';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8" />
        <title>ماہانہ بل — ${customer.name} (${customer.customer_code})</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 15px; color: #0f172a; direction: rtl; background: #fff; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { margin: 0; font-size: 22px; color: #0f172a; font-family: monospace; font-weight: 900; }
          .header h2 { margin: 4px 0; font-size: 16px; color: #1d4ed8; }
          .header p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .badge { display: inline-block; padding: 4px 12px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 6px; font-weight: bold; font-family: monospace; font-size: 13px; }
          
          .customer-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 16px; font-size: 12px; }
          .customer-box div { margin-bottom: 4px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11px; font-weight: bold; text-align: right; }
          td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px; text-align: right; }
          .num { font-family: monospace; font-weight: bold; }
          .tot-row { background: #eff6ff; font-weight: bold; border-top: 2px solid #94a3b8; }
          
          .advance-box { border: 2px solid #0284c7; border-radius: 10px; padding: 14px; margin-bottom: 16px; background: #f0f9ff; }
          .advance-box.exhausted { border-color: #e11d48; background: #fff1f2; }
          .adv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; margin-bottom: 12px; }
          .adv-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
          .adv-title { font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
          .adv-val { font-size: 16px; font-weight: 900; font-family: monospace; }
          .adv-green { color: #047857; }
          .adv-amber { color: #b45309; }
          .adv-red { color: #be123c; }
          
          .formula-bar { background: #fff; border: 1px dashed #94a3b8; border-radius: 8px; padding: 8px 12px; text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 12px; }
          
          .alert-banner { padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: bold; line-height: 1.5; }
          .alert-green { background: #dcfce7; border: 1px solid #86efac; color: #14532d; }
          .alert-red { background: #ffe4e6; border: 1px solid #fca5a5; color: #881337; }
          .alert-blue { background: #e0f2fe; border: 1px solid #7dd3fc; color: #0369a1; }
          
          .signatures { margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 12px; }
          .sig-line { border-top: 1px solid #475569; padding-top: 6px; font-weight: bold; color: #334155; }
          .footer-note { margin-top: 25px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <h2>شان پولٹری پروٹین — ماہانہ بل و کھاتہ رسید</h2>
          <p>B2B Poultry Protein Materials • رابطہ: ${phone}</p>
          <div style="margin-top: 8px;">
            <span class="badge">${monthName} ${year}</span>
            <span style="font-size: 11px; color: #64748b; margin-right: 15px;">تاریخ پرنٹ: ${new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>

        <div class="customer-box">
          <div>
            <div><strong>دکان / گاہک:</strong> ${customer.name}</div>
            <div><strong>کوڈ (Code):</strong> <span class="num">${customer.customer_code}</span></div>
            ${customer.contact_person ? `<div><strong>رابطہ شخص:</strong> ${customer.contact_person}</div>` : ''}
          </div>
          <div>
            <div><strong>فون نمبر:</strong> <span class="num">${customer.phone || '—'}</span></div>
            <div><strong>علاقہ و پتہ:</strong> ${customer.area} — ${customer.address || 'Address'}</div>
            <div><strong>وصولی کے کل دن:</strong> <strong class="num">${activeDays.length} دن</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35%;">قسم (Category)</th>
              <th style="text-align: right; width: 20%;">کل وزن (Weight)</th>
              <th style="text-align: right; width: 20%;">ریٹ فی کلو (Rate)</th>
              <th style="text-align: right; width: 25%;">کل رقم (Amount)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>چربی وزن (Charbi)</strong></td>
              <td class="num" style="text-align: right;">${charbiWeight.toFixed(2)} KG</td>
              <td class="num" style="text-align: right;">${charbiRate} PKR</td>
              <td class="num adv-green" style="text-align: right;">Rs. ${charbiAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td><strong>کچرا وزن (Kachara)</strong></td>
              <td class="num" style="text-align: right;">${kacharaWeight.toFixed(2)} KG</td>
              <td class="num" style="text-align: right;">${kacharaRate} PKR</td>
              <td class="num adv-amber" style="text-align: right;">Rs. ${kacharaAmount.toLocaleString()}</td>
            </tr>
            <tr class="tot-row">
              <td><strong>گرینڈ ٹوٹل بل (Grand Total)</strong></td>
              <td class="num" style="text-align: right; font-size: 14px; color: #1e40af;">${totalWeight.toFixed(2)} KG</td>
              <td style="text-align: right;">—</td>
              <td class="num" style="text-align: right; font-size: 15px; color: #b45309;">Rs. ${totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <!-- Monthly Advance & Settlement Section -->
        <div class="advance-box ${bal.isExhausted ? 'exhausted' : ''}">
          <div style="font-weight: 900; font-size: 14px; color: #0f172a; margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>💵 پیشگی ایڈوانس و بل کا حساب کتاب (Advance Settlement & Reminder)</span>
            <span style="font-size: 11px; font-weight: normal; color: #64748b;">طریقہ ادائیگی: ${String(advMethod).toUpperCase()} • تاریخ: ${advDate}</span>
          </div>

          <div class="adv-grid">
            <div class="adv-card">
              <div class="adv-title">کل پیشگی ایڈوانس دیا گیا</div>
              <div class="adv-val adv-green">Rs. ${bal.totalAdvance.toLocaleString()}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">کل پیشگی ادائیگی</div>
            </div>
            <div class="adv-card">
              <div class="adv-title">اس ماہ کا ویسٹ بل کٹوتی</div>
              <div class="adv-val adv-amber">Rs. ${totalAmount.toLocaleString()}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${totalWeight.toFixed(2)} KG وزن</div>
            </div>
            <div class="adv-card" style="${bal.isExhausted ? 'border-color: #f87171; background: #fff5f5;' : 'border-color: #86efac; background: #f0fdf4;'}">
              <div class="adv-title">موجودہ باقی ایڈوانس بیلنس</div>
              <div class="adv-val ${bal.isExhausted ? 'adv-red' : 'adv-green'}">
                Rs. ${bal.remainingAdvance.toLocaleString()}
              </div>
              <div style="font-size: 10px; font-weight: bold; margin-top: 2px; color: ${bal.isExhausted ? '#be123c' : '#047857'};">
                ${bal.isExhausted ? '⚠️ ایڈوانس ختم (بقایا بل واجب)' : '✓ ایڈوانس کریڈٹ فعال'}
              </div>
            </div>
          </div>

          <div class="formula-bar">
            <span>حساب: [کل ایڈوانس: Rs. ${bal.totalAdvance.toLocaleString()}]</span>
            <span style="margin: 0 8px;">منہا (-)</span>
            <span>[ماہانہ بل: Rs. ${totalAmount.toLocaleString()}]</span>
            <span style="margin: 0 8px;">=</span>
            <span style="color: ${bal.isExhausted ? '#be123c' : '#047857'};">[باقی ایڈوانس: Rs. ${bal.remainingAdvance.toLocaleString()}]</span>
          </div>

          ${bal.totalAdvance > 0 && bal.remainingAdvance > 0 ? `
            <div class="alert-banner alert-green">
              🟢 <strong>ایڈوانس ریمائنڈر (Advance Active Reminder):</strong> گاہک کا پیشگی ایڈوانس ابھی باقی ہے۔ اس ماہ کا کل بل (Rs. ${totalAmount.toLocaleString()}) پیشگی ایڈوانس سے منہا ہو چکا ہے۔ گاہک کے کھاتے میں <strong>Rs. ${bal.remainingAdvance.toLocaleString()}</strong> کا پیشگی ایڈوانس باقی محفوظ ہے جو آئندہ کی ویسٹ وصولیوں میں کٹتا رہے گا۔
            </div>
          ` : bal.totalAdvance > 0 && bal.remainingAdvance <= 0 ? `
            <div class="alert-banner alert-red">
              🔴 <strong>⚠️ اہم الرٹ: پیشگی ایڈوانس ختم ہو چکا ہے! (Advance Exhausted):</strong> گاہک کو دیا گیا پیشگی ایڈوانس مکمل ختم ہو چکا ہے۔ ایڈوانس سے زائد مال اٹھایا جا چکا ہے۔ اس ماہ کا بقیہ واجب الادا بل <strong>Rs. ${Math.abs(bal.remainingAdvance).toLocaleString()}</strong> بنتا ہے۔ برائے مہربانی نیا ایڈوانس شامل کریں یا یہ بقایا بل وصول کریں۔
            </div>
          ` : `
            <div class="alert-banner alert-blue">
              ℹ️ <strong>نوٹس:</strong> اس گاہک کا کوئی پیشگی ایڈوانس رجسٹرڈ نہیں ہے۔ یہ ماہانہ بل (Rs. ${totalAmount.toLocaleString()}) نقد / کیش پر واجب الادا ہے۔
            </div>
          `}

          ${advNotes ? `<div style="font-size: 11px; color: #64748b; margin-top: 8px;">نوٹس / حوالہ: ${advNotes}</div>` : ''}
        </div>

        <div class="signatures">
          <div>
            <div class="sig-line">دستخط / مہر گاہک (Customer Signature)</div>
            <p style="font-size: 11px; color: #64748b; margin-top: 4px;">${customer.name}</p>
          </div>
          <div>
            <div class="sig-line">دستخط شان پولٹری (Authorized Signatory)</div>
            <p style="font-size: 11px; color: #64748b; margin-top: 4px;">حاجی شان / ایڈمنسٹریٹر</p>
          </div>
        </div>

        <div class="footer-note">
          کمپیوٹرائزڈ ماہانہ بل رسید • Shan Poultry Protein Digitized Register System
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ماہانہ کسٹمر بل و اسٹیٹمنٹ (Monthly Bill)"
      subtitle={`${customer.name} (${customer.customer_code}) — ${monthName} ${year}`}
      maxWidth="2xl"
    >
      <div className="space-y-5 text-slate-800">
        {/* Printable Bill Container */}
        <div ref={printRef} className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-center sm:text-left">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight font-mono">
                {(typeof window !== 'undefined' ? localStorage.getItem('spp_receipt_title') : null) || '🐔 SHAN POULTRY PROTEIN - رسید 🐔'}
              </h2>
              <h3 className="text-sm font-bold text-blue-700 font-urdu mt-0.5">شان پولٹری پروٹین — ماہانہ بل رسید</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                B2B Poultry Protein Materials • Shan Contact: {(typeof window !== 'undefined' ? localStorage.getItem('spp_business_phone') : null) || '0300-0000000'}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg text-xs font-mono">
                {monthName} {year}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">تاریخ پرنٹ: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          {/* Customer Profile & Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>دکان / کسٹمر: {customer.name}</span>
              </div>
              <div className="text-slate-600 font-mono">کوڈ (Code): {customer.customer_code}</div>
              {customer.contact_person && (
                <div className="text-slate-600">رابطہ شخص: {customer.contact_person}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.area} — {customer.address || 'Address'}</span>
              </div>
              <div className="text-slate-600">
                وصولی کے کل دن: <strong className="text-slate-900 font-mono">{activeDays.length} دن</strong>
              </div>
            </div>
          </div>

          {/* Breakdown Rates & Totals Matrix */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-left">قسم (Category)</th>
                  <th className="py-2.5 px-3 text-right">کل وزن (Weight)</th>
                  <th className="py-2.5 px-3 text-right">ریٹ فی کلو (Rate)</th>
                  <th className="py-2.5 px-3 text-right">کل رقم (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="py-2.5 px-3 font-sans font-bold text-emerald-800">چربی وزن (Charbi)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatWeight(charbiWeight)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{charbiRate} PKR</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(charbiAmount)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-bold text-amber-800">کچرا وزن (Kachara)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatWeight(kacharaWeight)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{kacharaRate} PKR</td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-700">{formatCurrency(kacharaAmount)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-blue-50/70 border-t-2 border-slate-300 font-bold">
                <tr>
                  <td className="py-2.5 px-3 uppercase tracking-wider text-slate-900 font-sans">
                    گرینڈ ٹوٹل بل (Grand Total)
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-blue-900 font-mono text-sm">
                    {formatWeight(totalWeight)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right font-black text-amber-900 font-mono text-base">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Monthly Advance Settlement & Reminder Section (Clean & Easy Interface) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            bal.isExhausted ? 'bg-rose-50/70 border-rose-300' : 'bg-emerald-50/60 border-emerald-300'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 mb-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span>پیشگی ایڈوانس و بل کا حساب کتاب (Advance Settlement & Reminder)</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono font-medium">
                طریقہ: <strong className="text-slate-800 uppercase">{String(advMethod)}</strong> • تاریخ: {advDate}
              </div>
            </div>

            {/* 3 High-Impact Balance Snapshot Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center text-xs mb-3">
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <p className="text-[10px] text-slate-500 font-bold uppercase">کل پیشگی ایڈوانس</p>
                <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                  Rs. {bal.totalAdvance.toLocaleString()}
                </p>
                <span className="text-[9px] text-slate-400">کل پیشگی ادائیگی</span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <p className="text-[10px] text-amber-700 font-bold uppercase">اس ماہ کا ویسٹ بل</p>
                <p className="text-base font-black text-amber-700 font-mono mt-0.5">
                  Rs. {totalAmount.toLocaleString()}
                </p>
                <span className="text-[9px] text-amber-600 font-medium">{formatWeight(totalWeight)} کٹوتی</span>
              </div>

              <div className={`p-3 rounded-xl border shadow-2xs ${
                bal.isExhausted ? 'bg-rose-100/80 border-rose-300' : 'bg-emerald-100/80 border-emerald-300'
              }`}>
                <p className="text-[10px] font-black uppercase text-slate-700">موجودہ باقی ایڈوانس</p>
                <p className={`text-base font-black font-mono mt-0.5 ${
                  bal.isExhausted ? 'text-rose-700' : 'text-emerald-800'
                }`}>
                  Rs. {bal.remainingAdvance.toLocaleString()}
                </p>
                <span className={`text-[9px] font-bold ${bal.isExhausted ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {bal.isExhausted ? '⚠️ ایڈوانس ختم (بقایا بل واجب)' : '✓ ایڈوانس کریڈٹ فعال'}
                </span>
              </div>
            </div>

            {/* Math Formula Bar */}
            <div className="p-2 bg-white/90 border border-slate-200 rounded-xl text-center text-[11px] font-mono font-bold text-slate-700 mb-3 flex flex-wrap items-center justify-center gap-1.5 shadow-2xs">
              <span>[کل ایڈوانس: Rs. {bal.totalAdvance.toLocaleString()}]</span>
              <span className="text-rose-600 font-black">-</span>
              <span>[ماہانہ بل: Rs. {totalAmount.toLocaleString()}]</span>
              <span className="text-slate-400">=</span>
              <span className={bal.isExhausted ? 'text-rose-700 font-black' : 'text-emerald-700 font-black'}>
                [باقی ایڈوانس: Rs. {bal.remainingAdvance.toLocaleString()}]
              </span>
            </div>

            {/* Visual Status Reminder Box */}
            {bal.totalAdvance > 0 && bal.remainingAdvance > 0 ? (
              <div className="p-2.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold block text-emerald-900">🟢 ایڈوانس ریمائنڈر (Advance Active Reminder):</span>
                  <span>
                    گاہک کا پیشگی ایڈوانس ابھی باقی ہے۔ اس ماہ کا کل بل (Rs. {totalAmount.toLocaleString()}) پیشگی ایڈوانس سے منہا ہو چکا ہے۔ گاہک کے پاس اب بھی <strong className="font-mono text-emerald-900">Rs. {bal.remainingAdvance.toLocaleString()}</strong> کا پیشگی ایڈوانس محفوظ ہے جو آئندہ کی ویسٹ وصولیوں میں کٹتا رہے گا۔
                  </span>
                </div>
              </div>
            ) : bal.totalAdvance > 0 && bal.remainingAdvance <= 0 ? (
              <div className="p-2.5 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-950 text-xs font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold block text-rose-900">🔴 ⚠️ اہم الرٹ: پیشگی ایڈوانس ختم ہو چکا ہے! (Advance Exhausted Alert):</span>
                  <span>
                    گاہک کو دیا گیا پیشگی ایڈوانس مکمل ختم ہو چکا ہے۔ ایڈوانس سے زائد مال اٹھایا جا چکا ہے۔ اس ماہ کا بقیہ واجب الادا بل <strong className="font-mono text-rose-900 font-black">Rs. {Math.abs(bal.remainingAdvance).toLocaleString()}</strong> بنتا ہے۔ برائے مہربانی نیا ایڈوانس شامل کریں یا یہ بقایا بل وصول کریں۔
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-blue-100/90 border border-blue-300 text-blue-950 text-xs font-semibold flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold block text-blue-900">ℹ️ نقد بل نوٹس (Standard Cash Bill):</span>
                  <span>
                    اس گاہک کا کوئی پیشگی ایڈوانس رجسٹرڈ نہیں ہے۔ یہ ماہانہ بل <strong className="font-mono">Rs. {totalAmount.toLocaleString()}</strong> نقد / کیش پر واجب الادا ہے۔
                  </span>
                </div>
              </div>
            )}

            {advNotes && (
              <p className="text-[10px] text-slate-500 mt-2 font-medium">
                تفصیل / نوٹس: {advNotes}
              </p>
            )}
          </div>

          {/* Signatures & Footer Note */}
          <div className="pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1.5 font-bold text-slate-700">
                دستخط / مہر گاہک (Customer Signature)
              </div>
              <p className="text-[10px] text-slate-400">{customer.name}</p>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1.5 font-bold text-slate-700">
                دستخط شان پولٹری (Authorized Signatory)
              </div>
              <p className="text-[10px] text-slate-400">حاجی شان / ایڈمنسٹریٹر</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
          >
            بند کریں (Close)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>بل پرنٹ کریں (Print Bill)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
