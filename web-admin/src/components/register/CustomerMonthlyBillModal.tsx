// =============================================================================
// SHAN POULTRY PROTEIN - Customer Monthly Bill & Statement Modal
// Printable invoice & monthly ledger statement for individual poultry customers
// =============================================================================

import React, { useRef } from 'react';
import { MonthlyRegisterCustomerRow } from '../../types/database';
import { formatCurrency, formatWeight } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { Printer, Scale, Building, Phone, MapPin, Calendar, CheckCircle2 } from 'lucide-react';

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

  if (!row) return null;

  const { customer, dailyWeights, totalWeight, totalAmount } = row;
  const charbiWeight = row.totalCharbiWeight ?? 0;
  const kacharaWeight = row.totalKacharaWeight ?? totalWeight;
  const charbiRate = row.charbiRate ?? (customer.rate_charbi || 55);
  const kacharaRate = row.kacharaRate ?? (customer.rate_kachara || customer.rate_per_kg || 45);
  const charbiAmount = row.totalCharbiAmount ?? Math.round(charbiWeight * charbiRate);
  const kacharaAmount = row.totalKacharaAmount ?? Math.round(kacharaWeight * kacharaRate);

  const handlePrint = () => {
    window.print();
  };

  // Filter only days with collections for the itemized statement
  const activeDays = Object.entries(dailyWeights)
    .filter(([_, w]) => w !== null && w !== undefined && Number(w) > 0)
    .map(([day, w]) => ({
      day: Number(day),
      date: `${String(day).padStart(2, '0')}-${monthName.substring(0, 3)}-${year}`,
      weight: Number(w),
    }))
    .sort((a, b) => a.day - b.day);

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
        <div ref={printRef} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5 print:border-none print:shadow-none print:p-0">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">SHAN POULTRY PROTEIN</h2>
              <h3 className="text-sm font-bold text-blue-700 font-urdu mt-0.5">شان پولٹری پروٹین — ماہانہ بل رسید</h3>
              <p className="text-[11px] text-slate-500 mt-1">B2B Poultry Protein Materials • Burewala & Gaggoo Mandi</p>
            </div>
            <div className="text-center sm:text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg text-xs font-mono">
                {monthName} {year}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">تاریخ پرنٹ: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          {/* Customer Profile & Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>دکان / کسٹمر: {customer.name}</span>
              </div>
              <div className="text-slate-600 font-mono">کوڈ (Code): {customer.customer_code}</div>
              {customer.contact_person && (
                <div className="text-slate-600">رابطہ شخص: {customer.contact_person}</div>
              )}
            </div>
            <div className="space-y-1.5">
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
                  <td className="py-3 px-3 uppercase tracking-wider text-slate-900 font-sans">
                    گرینڈ ٹوٹل بل (Grand Total)
                  </td>
                  <td className="py-3 px-3 text-right font-black text-blue-900 font-mono text-sm">
                    {formatWeight(totalWeight)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right font-black text-amber-900 font-mono text-base">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Daily Collections Details (Compact Scrollable / Printable List) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              روزانہ وصولی تفصیل (Daily Collections Breakdown)
            </h4>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3 text-left">دن #</th>
                    <th className="py-1.5 px-3 text-left">تاریخ</th>
                    <th className="py-1.5 px-3 text-right">وصولی وزن (KG)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {activeDays.map(item => (
                    <tr key={item.day} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 font-bold text-brand-700">Day {item.day}</td>
                      <td className="py-1.5 px-3 text-slate-600 font-sans">{item.date}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">{item.weight} KG</td>
                    </tr>
                  ))}
                  {activeDays.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400 font-sans">
                        اس مہینے میں کوئی وصولی ریکارڈ نہیں ہوئی۔
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures & Footer Note */}
          <div className="pt-8 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
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
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>بل پرنٹ کریں (Print Bill)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
