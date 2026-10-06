// =============================================================================
// SHAN POULTRY PROTEIN - Monthly Register Matrix Table
// Complete digital replacement of the manual handwritten monthly weight register
// =============================================================================

import React, { useState } from 'react';
import { MonthlyRegisterCustomerRow } from '../../types/database';
import { formatWeight, formatCurrency } from '../../utils/formatters';
import { Search, Download, Printer, Filter } from 'lucide-react';
import { exportMonthlyRegisterToCSV, triggerPrint } from '../../utils/exportUtils';
import { CustomerMonthlyBillModal } from './CustomerMonthlyBillModal';

interface MonthlyMatrixTableProps {
  year: number;
  monthIndex: number;
  monthName: string;
  daysInMonth: number;
  rows: MonthlyRegisterCustomerRow[];
  dailyTotals: number[];
  grandTotalWeight: number;
  grandTotalAmount: number;
  emptySymbol?: string;
  onCellClick?: (customer: any, day: number, weight: number | null) => void;
}

export const MonthlyMatrixTable: React.FC<MonthlyMatrixTableProps> = ({
  year,
  monthIndex,
  monthName,
  daysInMonth,
  rows,
  dailyTotals,
  grandTotalWeight,
  grandTotalAmount,
  emptySymbol = 'X',
  onCellClick,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedBillRow, setSelectedBillRow] = useState<MonthlyRegisterCustomerRow | null>(null);

  // Extract unique areas
  const areas = Array.from(new Set(rows.map(r => r.customer.area))).filter(Boolean);

  const filteredRows = rows.filter(r => {
    const matchSearch =
      r.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.customer_code.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.area.toLowerCase().includes(search.toLowerCase());
    const matchArea = selectedArea === 'all' || r.customer.area === selectedArea;
    return matchSearch && matchArea;
  });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
  const currentDay = isCurrentMonth ? today.getDate() : -1;

  const handleExportCSV = () => {
    exportMonthlyRegisterToCSV(monthName, year, daysInMonth, filteredRows, emptySymbol);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-card no-print">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-auto min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, code, or area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white transition"
            />
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-600 focus:bg-white"
            >
              <option value="all">All Regions ({areas.length})</option>
              {areas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Print Sheet Header (visible only when printing) */}
      <div className="hidden print-only mb-4 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wider">SHAN POULTRY PROTEIN</h1>
        <p className="text-sm font-semibold">Monthly Weight Register — {monthName} {year}</p>
        <p className="text-xs text-slate-600">Printed on {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* Register Matrix Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full text-left border-collapse print-table">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 z-20 border-b border-slate-200">
                <th className="py-3 px-3 border-b border-r border-slate-200 sticky left-0 z-30 bg-slate-100 min-w-[70px]">
                  Code
                </th>
                <th className="py-3 px-4 border-b border-r border-slate-200 sticky left-[70px] z-30 bg-slate-100 min-w-[180px]">
                  Customer / Shop
                </th>
                <th className="py-3 px-3 border-b border-r border-slate-200 min-w-[110px] text-slate-600">
                  Area
                </th>

                {/* Day Columns 1..daysInMonth */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isToday = day === currentDay;
                  return (
                    <th
                      key={day}
                      className={`py-3 px-1.5 text-center border-b border-r border-slate-200 min-w-[42px] ${
                        isToday ? 'bg-blue-100 text-brand-800 font-extrabold' : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </th>
                  );
                })}

                <th className="py-3 px-3 text-right border-b border-r border-slate-200 min-w-[90px] bg-emerald-50/90 text-emerald-800">
                  چربی (KG)
                </th>
                <th className="py-3 px-2 text-right border-b border-r border-slate-200 min-w-[70px] bg-emerald-50/90 text-emerald-800">
                  چربی ریٹ
                </th>
                <th className="py-3 px-3 text-right border-b border-r border-slate-200 min-w-[95px] bg-emerald-50/90 text-emerald-800">
                  چربی رقم
                </th>
                <th className="py-3 px-3 text-right border-b border-r border-slate-200 min-w-[90px] bg-amber-50/90 text-amber-800">
                  کچرا (KG)
                </th>
                <th className="py-3 px-2 text-right border-b border-r border-slate-200 min-w-[70px] bg-amber-50/90 text-amber-800">
                  کچرا ریٹ
                </th>
                <th className="py-3 px-3 text-right border-b border-r border-slate-200 min-w-[95px] bg-amber-50/90 text-amber-800">
                  کچرا رقم
                </th>
                <th className="py-3 px-3 text-right border-b border-r border-slate-200 min-w-[95px] bg-blue-50/80 text-brand-800 font-black">
                  کل وزن (KG)
                </th>
                <th className="py-3 px-2 text-center border-b border-r border-slate-200 min-w-[45px] text-slate-600">
                  دن
                </th>
                <th className="py-3 px-4 text-right border-b border-r border-slate-200 min-w-[110px] bg-amber-100/70 text-amber-900 font-black">
                  ٹوٹل بل (PKR)
                </th>
                <th className="py-3 px-3 text-center border-b border-slate-200 min-w-[75px] bg-slate-100 text-slate-700 no-print">
                  بل پرنٹ
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.map((row, idx) => {
                const charbiWeight = row.totalCharbiWeight ?? 0;
                const charbiRate = row.charbiRate ?? (row.customer.rate_charbi || 55);
                const charbiAmt = row.totalCharbiAmount ?? Math.round(charbiWeight * charbiRate);

                const kacharaWeight = row.totalKacharaWeight ?? row.totalWeight;
                const kacharaRate = row.kacharaRate ?? (row.customer.rate_kachara || row.customer.rate_per_kg || 45);
                const kacharaAmt = row.totalKacharaAmount ?? Math.round(kacharaWeight * kacharaRate);

                return (
                  <tr
                    key={row.customer.id}
                    className={`hover:bg-slate-50/90 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Sticky Customer Code */}
                    <td className="py-2.5 px-3 border-r border-slate-200 sticky left-0 z-10 bg-white font-mono text-[11px] font-bold text-brand-700">
                      {row.customer.customer_code}
                    </td>

                    {/* Sticky Customer Name */}
                    <td className="py-2.5 px-4 border-r border-slate-200 sticky left-[70px] z-10 bg-white font-semibold text-slate-900 truncate max-w-[200px]">
                      <div className="truncate">{row.customer.name}</div>
                      {row.customer.contact_person && (
                        <div className="text-[10px] font-normal text-slate-500 truncate">{row.customer.contact_person}</div>
                      )}
                    </td>

                    {/* Area */}
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600 truncate font-medium">
                      {row.customer.area}
                    </td>

                    {/* Daily Weights */}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const weight = row.dailyWeights[day];
                      const hasWeight = weight !== null && weight !== undefined;
                      const isToday = day === currentDay;

                      return (
                        <td
                          key={day}
                          onClick={() => onCellClick && onCellClick(row.customer, day, weight)}
                          className={`py-2 px-1 text-center border-r border-slate-200 font-mono text-[11px] cursor-pointer transition select-none ${
                            isToday ? 'bg-blue-50/50' : ''
                          } ${
                            hasWeight
                              ? 'text-slate-900 font-bold hover:bg-brand-50 hover:text-brand-700'
                              : 'text-slate-300 font-medium hover:bg-slate-100'
                          }`}
                          title={`Day ${day}: ${hasWeight ? `${weight} KG` : 'No Collection'}`}
                        >
                          {hasWeight ? (
                            <span>{weight}</span>
                          ) : (
                            <span className="opacity-60">{emptySymbol}</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Charbi Columns */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-emerald-800 bg-emerald-50/30">
                      {formatWeight(charbiWeight, '')}
                    </td>
                    <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono text-slate-600 bg-emerald-50/20 text-[11px]">
                      {charbiRate}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-emerald-900 bg-emerald-50/30">
                      {formatCurrency(charbiAmt, '')}
                    </td>

                    {/* Kachara Columns */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-amber-800 bg-amber-50/30">
                      {formatWeight(kacharaWeight, '')}
                    </td>
                    <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono text-slate-600 bg-amber-50/20 text-[11px]">
                      {kacharaRate}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-amber-900 bg-amber-50/30">
                      {formatCurrency(kacharaAmt, '')}
                    </td>

                    {/* Customer Monthly Weight Total */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-mono font-extrabold text-brand-800 bg-blue-50/40">
                      {formatWeight(row.totalWeight, '')}
                    </td>

                    {/* Collection Days Count */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-slate-600 text-[11px] font-medium">
                      {row.collectionDaysCount}
                    </td>

                    {/* Customer Monthly Amount */}
                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-amber-900 bg-amber-50/50">
                      {formatCurrency(row.totalAmount, '')}
                    </td>

                    {/* Print Customer Bill Button */}
                    <td className="py-2.5 px-2 text-center no-print border-l border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedBillRow(row)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto"
                        title="ماہانہ بل پرنٹ کریں"
                      >
                        <Printer className="w-3 h-3" />
                        <span>پرنٹ</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 13} className="text-center py-12 text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer Summary Row (Daily totals across all customers) */}
            <tfoot>
              {(() => {
                const totalCharbiW = filteredRows.reduce((acc, r) => acc + (r.totalCharbiWeight || 0), 0);
                const totalCharbiAmt = filteredRows.reduce((acc, r) => acc + (r.totalCharbiAmount || 0), 0);
                const totalKacharaW = filteredRows.reduce((acc, r) => acc + (r.totalKacharaWeight || r.totalWeight), 0);
                const totalKacharaAmt = filteredRows.reduce((acc, r) => acc + (r.totalKacharaAmount || 0), 0);

                return (
                  <tr className="bg-slate-100 text-[11px] font-extrabold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-20 shadow-sm">
                    <td className="py-3 px-3 border-r border-slate-300 sticky left-0 z-30 bg-slate-100 font-bold text-slate-800">
                      TOTAL
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 sticky left-[70px] z-30 bg-slate-100 uppercase tracking-wider text-brand-800 font-bold">
                      Daily Net (KG)
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 text-slate-500">
                      —
                    </td>

                    {/* Daily Column Sums */}
                    {dailyTotals.map((tot, i) => {
                      const day = i + 1;
                      const isToday = day === currentDay;
                      return (
                        <td
                          key={day}
                          className={`py-3 px-1 text-center border-r border-slate-200 font-mono font-extrabold text-[11px] ${
                            isToday ? 'bg-blue-100 text-brand-900' : 'text-slate-800'
                          }`}
                        >
                          {tot > 0 ? tot : '—'}
                        </td>
                      );
                    })}

                    {/* Charbi Totals */}
                    <td className="py-3 px-3 text-right border-r border-slate-300 font-mono text-xs font-black text-emerald-800 bg-emerald-100">
                      {formatWeight(totalCharbiW, '')}
                    </td>
                    <td className="py-3 px-2 text-right border-r border-slate-300 font-mono text-slate-400 bg-emerald-100">
                      —
                    </td>
                    <td className="py-3 px-3 text-right border-r border-slate-300 font-mono text-xs font-black text-emerald-900 bg-emerald-100">
                      {formatCurrency(totalCharbiAmt, '')}
                    </td>

                    {/* Kachara Totals */}
                    <td className="py-3 px-3 text-right border-r border-slate-300 font-mono text-xs font-black text-amber-800 bg-amber-100">
                      {formatWeight(totalKacharaW, '')}
                    </td>
                    <td className="py-3 px-2 text-right border-r border-slate-300 font-mono text-slate-400 bg-amber-100">
                      —
                    </td>
                    <td className="py-3 px-3 text-right border-r border-slate-300 font-mono text-xs font-black text-amber-900 bg-amber-100">
                      {formatCurrency(totalKacharaAmt, '')}
                    </td>

                    {/* Grand Total Weight */}
                    <td className="py-3 px-3 text-right border-r border-slate-300 font-mono text-xs font-black text-brand-800 bg-blue-100">
                      {formatWeight(grandTotalWeight, '')}
                    </td>

                    <td className="py-3 px-2 text-center border-r border-slate-300 font-mono text-slate-500">
                      —
                    </td>

                    {/* Grand Total Amount */}
                    <td className="py-3 px-4 text-right font-mono text-xs font-black text-amber-900 bg-amber-100 border-r border-slate-300">
                      {formatCurrency(grandTotalAmount, '')}
                    </td>

                    <td className="py-3 px-2 text-center bg-slate-100 no-print">
                      —
                    </td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Customer Monthly Bill Modal */}
      <CustomerMonthlyBillModal
        isOpen={!!selectedBillRow}
        onClose={() => setSelectedBillRow(null)}
        row={selectedBillRow}
        monthName={monthName}
        year={year}
        daysInMonth={daysInMonth}
      />
    </div>
  );
};
