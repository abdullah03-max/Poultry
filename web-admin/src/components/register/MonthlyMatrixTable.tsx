// =============================================================================
// SHAN POULTRY PROTEIN - Monthly Register Matrix Table
// Complete digital replacement of the manual handwritten monthly weight register
// =============================================================================

import React, { useState } from 'react';
import { MonthlyRegisterCustomerRow } from '../../types/database';
import { formatWeight, formatCurrency } from '../../utils/formatters';
import { Search, Download, Printer, Filter } from 'lucide-react';
import { exportMonthlyRegisterToCSV, triggerPrint } from '../../utils/exportUtils';

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 no-print">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, code, or area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Areas ({areas.length})</option>
              {areas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Print Sheet Header (visible only when printing) */}
      <div className="hidden print-only mb-4 text-center">
        <h1 className="text-xl font-bold uppercase">SHAN POULTRY PROTEIN</h1>
        <p className="text-sm font-semibold">Monthly Weight Register — {monthName} {year}</p>
        <p className="text-xs text-gray-600">Generated on {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* Register Matrix Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full text-left border-collapse print-table">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-800/90 text-[11px] font-bold text-slate-300 uppercase tracking-wider sticky top-0 z-20 backdrop-blur-md">
                <th className="py-3 px-3 border-b border-r border-slate-700/80 sticky left-0 z-30 bg-slate-800 min-w-[70px]">
                  Code
                </th>
                <th className="py-3 px-4 border-b border-r border-slate-700/80 sticky left-[70px] z-30 bg-slate-800 min-w-[180px]">
                  Customer / Shop
                </th>
                <th className="py-3 px-3 border-b border-r border-slate-700/80 min-w-[110px] text-slate-400">
                  Area
                </th>

                {/* Day Columns 1..daysInMonth */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isToday = day === currentDay;
                  return (
                    <th
                      key={day}
                      className={`py-3 px-2 text-center border-b border-r border-slate-700/60 min-w-[42px] ${
                        isToday ? 'bg-emerald-500/20 text-emerald-300 font-extrabold' : ''
                      }`}
                    >
                      {day}
                    </th>
                  );
                })}

                <th className="py-3 px-4 text-right border-b border-r border-slate-700/80 min-w-[110px] bg-slate-800/90 text-emerald-400">
                  Total (KG)
                </th>
                <th className="py-3 px-3 text-center border-b border-r border-slate-700/80 min-w-[60px] text-slate-400">
                  Days
                </th>
                <th className="py-3 px-4 text-right border-b border-slate-700/80 min-w-[120px] bg-slate-800/90 text-amber-400">
                  Total (PKR)
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredRows.map((row, idx) => (
                <tr
                  key={row.customer.id}
                  className={`hover:bg-slate-800/50 transition-colors ${
                    idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/90'
                  }`}
                >
                  {/* Sticky Customer Code */}
                  <td className="py-2.5 px-3 border-r border-slate-800 sticky left-0 z-10 bg-slate-900 font-mono text-[11px] font-semibold text-emerald-400">
                    {row.customer.customer_code}
                  </td>

                  {/* Sticky Customer Name */}
                  <td className="py-2.5 px-4 border-r border-slate-800 sticky left-[70px] z-10 bg-slate-900 font-medium text-white truncate max-w-[200px]">
                    <div className="truncate">{row.customer.name}</div>
                    {row.customer.contact_person && (
                      <div className="text-[10px] text-slate-400 truncate">{row.customer.contact_person}</div>
                    )}
                  </td>

                  {/* Area */}
                  <td className="py-2.5 px-3 border-r border-slate-800 text-slate-400 truncate">
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
                        className={`py-2 px-1 text-center border-r border-slate-800 font-mono text-[11px] cursor-pointer transition select-none ${
                          isToday ? 'bg-emerald-500/5' : ''
                        } ${
                          hasWeight
                            ? 'text-emerald-300 font-bold hover:bg-emerald-500/20'
                            : 'text-slate-600 font-normal hover:bg-slate-800'
                        }`}
                        title={`Day ${day}: ${hasWeight ? `${weight} KG` : 'No Collection'}`}
                      >
                        {hasWeight ? (
                          <span>{weight}</span>
                        ) : (
                          <span className="opacity-40">{emptySymbol}</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Customer Monthly Weight Total */}
                  <td className="py-2.5 px-4 text-right border-r border-slate-800 font-mono font-bold text-emerald-400 bg-emerald-500/5">
                    {formatWeight(row.totalWeight, '')}
                  </td>

                  {/* Collection Days Count */}
                  <td className="py-2.5 px-3 text-center border-r border-slate-800 font-mono text-slate-400 text-[11px]">
                    {row.collectionDaysCount}
                  </td>

                  {/* Customer Monthly Amount */}
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-400 bg-amber-500/5">
                    {formatCurrency(row.totalAmount, '')}
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 6} className="text-center py-12 text-slate-500">
                    No customers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer Summary Row (Daily totals across all customers) */}
            <tfoot>
              <tr className="bg-slate-800 text-[11px] font-extrabold text-white border-t-2 border-slate-700 sticky bottom-0 z-20">
                <td className="py-3 px-3 border-r border-slate-700 sticky left-0 z-30 bg-slate-800">
                  TOTAL
                </td>
                <td className="py-3 px-4 border-r border-slate-700 sticky left-[70px] z-30 bg-slate-800 uppercase tracking-wider text-emerald-400">
                  Daily Total (KG)
                </td>
                <td className="py-3 px-3 border-r border-slate-700 text-slate-400">
                  —
                </td>

                {/* Daily Column Sums */}
                {dailyTotals.map((tot, i) => {
                  const day = i + 1;
                  const isToday = day === currentDay;
                  return (
                    <td
                      key={day}
                      className={`py-3 px-1 text-center border-r border-slate-700 font-mono font-extrabold text-[11px] ${
                        isToday ? 'bg-emerald-500/30 text-emerald-200' : 'text-slate-200'
                      }`}
                    >
                      {tot > 0 ? tot : '—'}
                    </td>
                  );
                })}

                {/* Grand Total Weight */}
                <td className="py-3 px-4 text-right border-r border-slate-700 font-mono text-xs font-black text-emerald-400 bg-emerald-500/20">
                  {formatWeight(grandTotalWeight, '')}
                </td>

                <td className="py-3 px-3 text-center border-r border-slate-700 font-mono text-slate-400">
                  —
                </td>

                {/* Grand Total Amount */}
                <td className="py-3 px-4 text-right font-mono text-xs font-black text-amber-400 bg-amber-500/20">
                  {formatCurrency(grandTotalAmount, '')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
