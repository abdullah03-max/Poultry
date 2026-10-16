// =============================================================================
// SHAN POULTRY PROTEIN - Customer Monthly Daily Collections Modal
// Detailed Breakdown of all Daily Weight Slips for a Customer in a given month
// Displays Date, Time, Weights, Rates, Drivers, and includes direct 1-click printing
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Collection, MonthlyRegisterCustomerRow } from '../../types/database';
import { api } from '../../services/api';
import { formatCurrency, formatDate, formatTime, formatWeight } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { 
  Printer, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Scale, 
  DollarSign, 
  FileText, 
  Loader2, 
  TrendingUp,
  Receipt
} from 'lucide-react';

interface CustomerMonthlyDailyCollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: MonthlyRegisterCustomerRow | null;
  monthIndex: number;
  monthName: string;
  year: number;
  daysInMonth: number;
}

export const CustomerMonthlyDailyCollectionsModal: React.FC<CustomerMonthlyDailyCollectionsModalProps> = ({
  isOpen,
  onClose,
  row,
  monthIndex,
  monthName,
  year,
  daysInMonth,
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !row?.customer?.id) return;

    let isMounted = true;
    const fetchCustomerDailyCollections = async () => {
      try {
        setLoading(true);
        const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const res = await api.getCollections({
          customerId: row.customer.id,
          startDate,
          endDate,
          limit: 1000,
        });

        if (!isMounted) return;

        let fetched = res.collections || [];

        // If no collection documents exist but monthly row has dailyWeights recorded in matrix,
        // synthesize daily rows so the admin can always view and print the recorded days!
        if (fetched.length === 0 && row.dailyWeights) {
          const synthesized: Collection[] = [];
          const kRate = row.kacharaRate ?? (row.customer.rate_kachara || row.customer.rate_per_kg || 45);
          const cRate = row.charbiRate ?? (row.customer.rate_charbi || 55);

          Object.entries(row.dailyWeights).forEach(([dayStr, weight]) => {
            const dNum = parseInt(dayStr, 10);
            const wNum = Number(weight);
            if (wNum > 0) {
              const dayFormatted = String(dNum).padStart(2, '0');
              const mFormatted = String(monthIndex + 1).padStart(2, '0');
              const cDate = `${year}-${mFormatted}-${dayFormatted}`;
              const defaultTime = row.customer.collection_start_time || '10:30:00';

              synthesized.push({
                id: `synth-${dayStr}`,
                receipt_no: `COL-${year}${mFormatted}${dayFormatted}-${row.customer.customer_code}`,
                client_uuid: '',
                customer_id: row.customer.id,
                worker_id: null,
                collection_date: cDate,
                collection_time: defaultTime,
                collection_timestamp: `${cDate}T${defaultTime}`,
                gross_weight: wNum,
                tare_weight: 0,
                total_net_weight: wNum,
                rate_per_kg: kRate,
                total_amount: Math.round(wNum * kRate),
                notes: 'ماہانہ رجسٹر سے روزانہ اینٹری',
                signature_url: null,
                signature_timestamp: null,
                signee_name: null,
                status: 'verified',
                created_at: `${cDate}T${defaultTime}Z`,
                updated_at: `${cDate}T${defaultTime}Z`,
                kachara_net: wNum,
                kachara_rate: kRate,
                kachara_total: Math.round(wNum * kRate),
                worker: { full_name: 'Regular Staff' } as any,
              });
            }
          });
          fetched = synthesized;
        }

        // Sort chronologically ascending (from 1st of month to end of month)
        fetched.sort((a, b) => {
          const tA = `${a.collection_date}T${a.collection_time || '00:00:00'}`;
          const tB = `${b.collection_date}T${b.collection_time || '00:00:00'}`;
          return tA.localeCompare(tB);
        });

        setCollections(fetched);
      } catch (err) {
        console.error('Error fetching customer daily collections:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCustomerDailyCollections();
    return () => {
      isMounted = false;
    };
  }, [isOpen, row?.customer?.id, monthIndex, year, daysInMonth]);

  if (!row) return null;

  const { customer } = row;
  const charbiRate = row.charbiRate ?? (customer.rate_charbi || 55);
  const kacharaRate = row.kacharaRate ?? (customer.rate_kachara || customer.rate_per_kg || 45);

  // Compute live aggregates from displayed collections
  const totalEntries = collections.length;
  const totalGross = collections.reduce((acc, c) => acc + (Number(c.gross_weight) || 0), 0);
  const totalTare = collections.reduce((acc, c) => acc + (Number(c.tare_weight) || 0), 0);

  const totalCharbiWeight = collections.reduce((acc, c) => acc + (Number(c.charbi_net) || 0), 0);
  const totalCharbiAmount = collections.reduce(
    (acc, c) => acc + (Number(c.charbi_total) || (Number(c.charbi_net || 0) * (c.charbi_rate || charbiRate))),
    0
  );

  const totalKacharaWeight = collections.reduce((acc, c) => {
    const cNet = Number(c.charbi_net || 0);
    const kNet = Number(c.kachara_net || (cNet === 0 ? c.total_net_weight : 0));
    return acc + kNet;
  }, 0);

  const totalKacharaAmount = collections.reduce((acc, c) => {
    const cNet = Number(c.charbi_net || 0);
    const kNet = Number(c.kachara_net || (cNet === 0 ? c.total_net_weight : 0));
    return acc + (Number(c.kachara_total) || (kNet * (c.kachara_rate || kacharaRate)));
  }, 0);

  const grandTotalWeight = collections.reduce((acc, c) => acc + (Number(c.total_net_weight) || 0), 0);
  const grandTotalAmount = collections.reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);

  // Print Functionality (Generates a clean, standalone printable report with Letterhead, Date/Time & Signatures)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const printDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const printTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const rowsHtml = collections.map((c, idx) => {
      const cNet = Number(c.charbi_net || 0);
      const cRate = c.charbi_rate || charbiRate;
      const cTot = Number(c.charbi_total || (cNet * cRate));

      const kNet = Number(c.kachara_net || (cNet === 0 ? c.total_net_weight : 0));
      const kRate = c.kachara_rate || kacharaRate;
      const kTot = Number(c.kachara_total || (kNet * kRate));

      const dateStr = formatDate(c.collection_date);
      const timeStr = formatTime(c.collection_time);

      return `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; font-weight: bold; color: #64748b; font-family: monospace;">${idx + 1}</td>
          <td style="font-weight: bold; white-space: nowrap; color: #0f172a;">${dateStr}</td>
          <td style="font-family: monospace; white-space: nowrap; color: #475569;">${timeStr}</td>
          <td style="font-family: monospace; font-weight: bold; color: #1e40af; white-space: nowrap;">${c.receipt_no}</td>
          <td style="color: #334155; white-space: nowrap;">${c.worker?.full_name || 'Admin'}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold; color: #065f46; white-space: nowrap;">
            ${cNet > 0 ? `${cNet.toFixed(1)} KG <span style="font-size: 10px; color: #64748b; font-weight: normal;">(@${cRate})</span>` : '—'}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: bold; color: #92400e; white-space: nowrap;">
            ${kNet > 0 ? `${kNet.toFixed(1)} KG <span style="font-size: 10px; color: #64748b; font-weight: normal;">(@${kRate})</span>` : '—'}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 900; color: #0f172a; white-space: nowrap;">
            ${Number(c.total_net_weight).toFixed(1)} KG
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 900; color: #1e3a8a; white-space: nowrap;">
            Rs. ${Number(c.total_amount).toLocaleString()}
          </td>
          <td style="font-size: 10px; color: #64748b;">${c.notes || '—'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8" />
        <title>روزانہ کلیکشن ریکارڈ — ${customer.name} (${customer.customer_code})</title>
        <style>
          @page { size: A4 portrait; margin: 8mm 10mm; }
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", Arial, sans-serif; 
            margin: 0; 
            padding: 12px; 
            color: #0f172a; 
            direction: rtl; 
            background: #fff; 
            font-size: 12px; 
            line-height: 1.4;
          }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; font-family: monospace; }
          .header h2 { margin: 2px 0; font-size: 15px; color: #1d4ed8; font-weight: bold; }
          .header p { margin: 1px 0; font-size: 11px; color: #64748b; }
          
          .customer-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 12px;
            margin-bottom: 12px;
            font-size: 11.5px;
          }
          .customer-box div { margin-bottom: 2px; }
          
          .summary-bar {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
            margin-bottom: 12px;
            text-align: center;
          }
          .summary-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 4px; }
          .summary-title { font-size: 10px; font-weight: bold; color: #64748b; margin-bottom: 2px; }
          .summary-val { font-size: 13px; font-weight: 900; font-family: monospace; color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
          th { 
            background: #e2e8f0; 
            color: #1e293b; 
            padding: 6px 8px; 
            border: 1px solid #cbd5e1; 
            font-size: 10.5px; 
            font-weight: 800; 
            text-align: right; 
          }
          td { padding: 5.5px 8px; border: 1px solid #e2e8f0; text-align: right; }
          .tfoot-row { 
            background: #f1f5f9; 
            font-weight: 900; 
            border-top: 2px solid #64748b; 
            color: #0f172a; 
          }
          
          .signatures { 
            margin-top: 24px; 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            text-align: center; 
            font-size: 11.5px; 
          }
          .sig-line { border-top: 1px dashed #475569; padding-top: 4px; font-weight: bold; color: #334155; margin-top: 30px; }
          .footer-note { 
            margin-top: 18px; 
            text-align: center; 
            font-size: 9.5px; 
            color: #94a3b8; 
            border-top: 1px dashed #e2e8f0; 
            padding-top: 6px; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SHAN POULTRY PROTEIN</h1>
          <h2>شان پولٹری پروٹین — کسٹمر روزانہ کلیکشن پرچیاں ریکارڈ</h2>
          <p>ماہانہ انفرادی ریکارڈ بمعہ تاریخ، وقت اور کل اوزان • برائے ماہ: <strong>${monthName} ${year}</strong></p>
          <p style="font-size: 10px; color: #94a3b8;">تاریخ پرنٹ: ${printDate} بوقت ${printTime}</p>
        </div>

        <div class="customer-box">
          <div>
            <div><strong>دکان / گاہک:</strong> <span style="font-size: 13px; font-weight: bold;">${customer.name}</span></div>
            <div><strong>کوڈ (Customer Code):</strong> <span style="font-family: monospace; font-weight: bold; color: #1e40af;">${customer.customer_code}</span></div>
            ${customer.contact_person ? `<div><strong>رابطہ شخص:</strong> ${customer.contact_person}</div>` : ''}
          </div>
          <div>
            <div><strong>فون نمبر:</strong> <span style="font-family: monospace;">${customer.phone || '—'}</span></div>
            <div><strong>علاقہ و پتہ:</strong> ${customer.area} — ${customer.address || ''}</div>
            <div><strong>ریٹس:</strong> چربی: Rs. ${charbiRate}/kg • کچرا: Rs. ${kacharaRate}/kg</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-card">
            <div class="summary-title">کل پرچیاں / وزٹس</div>
            <div class="summary-val">${totalEntries} دن</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">کل چربی وزن</div>
            <div class="summary-val" style="color: #065f46;">${totalCharbiWeight.toFixed(1)} KG</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">کل کچرا وزن</div>
            <div class="summary-val" style="color: #92400e;">${totalKacharaWeight.toFixed(1)} KG</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">کل خالص وزن</div>
            <div class="summary-val" style="color: #0f172a;">${grandTotalWeight.toFixed(1)} KG</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">کل رقم (بل)</div>
            <div class="summary-val" style="color: #1e3a8a;">Rs. ${grandTotalAmount.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 85px;">تاریخ (Date)</th>
              <th style="width: 75px;">وقت (Time)</th>
              <th style="width: 130px;">پرچی نمبر</th>
              <th style="width: 90px;">وصول کنندہ</th>
              <th style="text-align: right; width: 95px;">چربی (KG)</th>
              <th style="text-align: right; width: 95px;">کچرا (KG)</th>
              <th style="text-align: right; width: 85px;">کل وزن</th>
              <th style="text-align: right; width: 95px;">کل بل (PKR)</th>
              <th>تفصیل / نوٹس</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="tfoot-row">
              <td colspan="5" style="padding: 7px 8px; font-size: 11px;">
                کل میزان (Grand Totals — ${totalEntries} Records):
              </td>
              <td style="text-align: right; font-family: monospace; color: #065f46; font-size: 11px;">
                ${totalCharbiWeight.toFixed(1)} KG
              </td>
              <td style="text-align: right; font-family: monospace; color: #92400e; font-size: 11px;">
                ${totalKacharaWeight.toFixed(1)} KG
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 12px;">
                ${grandTotalWeight.toFixed(1)} KG
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 12px; color: #1e3a8a;">
                Rs. ${grandTotalAmount.toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div>
            <div class="sig-line">دستخط محرر / اکاؤنٹنٹ (Shan Poultry Accounts)</div>
          </div>
          <div>
            <div class="sig-line">دستخط و مہر گاہک / دکان دار (${customer.name})</div>
          </div>
        </div>

        <div class="footer-note">
          یہ کمپیوٹرائزڈ روزانہ کلیکشن رپورٹ ہے جو شان پولٹری پروٹین سسٹم سے خودکار طور پر تیار کی گئی ہے۔
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 350);
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
      title={`کسٹمر روزانہ کلیکشن ریکارڈ — ${customer.name}`}
      subtitle={`ماہ ${monthName} ${year} کی تمام روزانہ اینٹریز بمع تاریخ و وقت (All Daily Collections with Date & Time)`}
      maxWidth="6xl"
    >
      <div className="space-y-4">
        {/* Customer Overview Bar & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-2xl no-print">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <User className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-black">{customer.name}</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold">
                {customer.customer_code}
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.area}</span>
            </div>

            {customer.phone && (
              <div className="flex items-center gap-1 text-slate-600 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Calendar className="w-3.5 h-3.5" />
              <span>{monthName} {year}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || collections.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>پرنٹ نکالیں (Print Slip Report)</span>
            </button>
          </div>
        </div>

        {/* KPI Mini-Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 no-print">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">کل پرچیاں / وزٹس</span>
            <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
              {totalEntries} <span className="text-[10px] text-slate-400 font-sans font-normal">دن</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">کل چربی وزن</span>
            <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
              {formatWeight(totalCharbiWeight, 'KG')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">کل کچرا وزن</span>
            <span className="text-base font-black text-amber-700 font-mono mt-0.5 block">
              {formatWeight(totalKacharaWeight, 'KG')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-blue-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">کل خالص وزن</span>
            <span className="text-base font-black text-blue-800 font-mono mt-0.5 block">
              {formatWeight(grandTotalWeight, 'KG')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-300 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">کل واجب الادا بل</span>
            <span className="text-base font-black text-amber-900 font-mono mt-0.5 block">
              {formatCurrency(grandTotalAmount)}
            </span>
          </div>
        </div>

        {/* Collections Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/50 rounded-2xl border border-slate-200">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-xs font-semibold text-slate-600">
              ماہ {monthName} کے روزانہ کلیکشن ریکارڈ لوڈ ہو رہے ہیں...
            </p>
          </div>
        ) : collections.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-2">
            <Receipt className="w-9 h-9 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-700">اس گاہک کی کوئی روزانہ پرچی درج نہیں ہے</p>
            <p className="text-xs text-slate-400">
              ماہ {monthName} {year} میں اس گاہک کے لیے کوئی کلیکشن سلپ محفوظ نہیں ہوئی۔
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs print-table">
                <thead className="bg-slate-100 text-[10.5px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center w-8">#</th>
                    <th className="py-2.5 px-3">تاریخ (Date)</th>
                    <th className="py-2.5 px-3">وقت (Time)</th>
                    <th className="py-2.5 px-3">پرچی نمبر</th>
                    <th className="py-2.5 px-3">وصول کنندہ</th>
                    <th className="py-2.5 px-3 text-right">چربی وزن و ریٹ</th>
                    <th className="py-2.5 px-3 text-right">کچرا وزن و ریٹ</th>
                    <th className="py-2.5 px-3 text-right">کل وزن</th>
                    <th className="py-2.5 px-3 text-right">کل بل رقم</th>
                    <th className="py-2.5 px-3">نوٹس</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11.5px]">
                  {collections.map((c, idx) => {
                    const cNet = Number(c.charbi_net || 0);
                    const cRate = c.charbi_rate || charbiRate;
                    const cTot = Number(c.charbi_total || (cNet * cRate));

                    const kNet = Number(c.kachara_net || (cNet === 0 ? c.total_net_weight : 0));
                    const kRate = c.kachara_rate || kacharaRate;
                    const kTot = Number(c.kachara_total || (kNet * kRate));

                    return (
                      <tr key={c.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-800 whitespace-nowrap">
                          {formatDate(c.collection_date)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatTime(c.collection_time)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-700 whitespace-nowrap">
                          {c.receipt_no}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-700 whitespace-nowrap">
                          {c.worker?.full_name || 'Admin'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-800 font-bold whitespace-nowrap">
                          {cNet > 0 ? (
                            <div>
                              <span>{cNet.toFixed(1)} KG</span>
                              <span className="text-[10px] text-slate-400 block font-normal font-sans">
                                @{cRate} = Rs. {cTot.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-800 font-bold whitespace-nowrap">
                          {kNet > 0 ? (
                            <div>
                              <span>{kNet.toFixed(1)} KG</span>
                              <span className="text-[10px] text-slate-400 block font-normal font-sans">
                                @{kRate} = Rs. {kTot.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {Number(c.total_net_weight).toFixed(1)} KG
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-blue-800 whitespace-nowrap">
                          {formatCurrency(c.total_amount)}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px] truncate max-w-[140px]">
                          {c.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 font-urdu font-black text-slate-800">
                      کل میزان (Grand Totals — {totalEntries} Slips):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-black whitespace-nowrap">
                      {totalCharbiWeight.toFixed(1)} KG
                      <span className="text-[10px] text-emerald-600 block font-normal">
                        Rs. {totalCharbiAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-800 font-black whitespace-nowrap">
                      {totalKacharaWeight.toFixed(1)} KG
                      <span className="text-[10px] text-amber-600 block font-normal">
                        Rs. {totalKacharaAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-black whitespace-nowrap">
                      {grandTotalWeight.toFixed(1)} KG
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-900 font-black whitespace-nowrap">
                      {formatCurrency(grandTotalAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Footer Close Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>
    </Modal>
  );
};
