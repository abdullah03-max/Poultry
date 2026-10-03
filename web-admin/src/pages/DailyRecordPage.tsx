// =============================================================================
// SHAN POULTRY PROTEIN - Daily Record Reconciliation Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Collection, WeightCategory } from '../types/database';
import { formatDate, formatTime, formatWeight, formatCurrency } from '../utils/formatters';
import { Calendar, Printer, Scale, Eye, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { CollectionDetailModal } from '../components/collections/CollectionDetailModal';
import { triggerPrint } from '../utils/exportUtils';

export const DailyRecordPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSlip, setSelectedSlip] = useState<Collection | null>(null);

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const [res, cats] = await Promise.all([
        api.getCollections({ startDate: selectedDate, endDate: selectedDate, limit: 500 }),
        api.getWeightCategories(),
      ]);
      setCollections(res.collections);
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching daily records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  const changeDateByDays = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const totalGross = collections.reduce((acc, c) => acc + c.gross_weight, 0);
  const totalTare = collections.reduce((acc, c) => acc + c.tare_weight, 0);
  const totalNet = collections.reduce((acc, c) => acc + c.total_net_weight, 0);
  const totalAmount = collections.reduce((acc, c) => acc + c.total_amount, 0);

  // Category subtotals for the day
  const categoryDaySums: Record<string, number> = {};
  collections.forEach(c => {
    c.items?.forEach((it: any) => {
      categoryDaySums[it.category_id] = (categoryDaySums[it.category_id] || 0) + it.weight;
    });
  });

  return (
    <div className="space-y-6">
      {/* Date Header & Quick Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl no-print">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Daily Weight Record Sheet
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reconciles all individual shop collections recorded on {formatDate(selectedDate)}.
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDateByDays(-1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition"
            title="Previous Day"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
          />

          <button
            onClick={() => changeDateByDays(1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition"
            title="Next Day"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-emerald-400 transition"
          >
            Today
          </button>

          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Print View Header */}
      <div className="hidden print-only mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide">SHAN POULTRY PROTEIN</h1>
        <p className="text-base font-bold mt-1">Daily Weight Collection Sheet</p>
        <p className="text-sm text-gray-700 font-medium">Date: {formatDate(selectedDate)}</p>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Net Weight</p>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{formatWeight(totalNet)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Gross: {formatWeight(totalGross)} | Tare: -{formatWeight(totalTare)}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Day Billing</p>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">{formatCurrency(totalAmount)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total revenue generated</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Completed Collections</p>
          <p className="text-2xl font-black text-white font-mono mt-1">{collections.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Unique customer slips</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Average Weight / Slip</p>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">
            {formatWeight(collections.length > 0 ? totalNet / collections.length : 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Per shop average</p>
        </div>
      </div>

      {/* Category Subtotals for the Day */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" /> Category Weight Totals For {formatDate(selectedDate)}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map(cat => {
            const catSum = categoryDaySums[cat.id] || 0;
            return (
              <div key={cat.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{cat.name}</p>
                  {cat.urdu_name && <p className="text-[10px] text-slate-400 font-urdu">{cat.urdu_name}</p>}
                </div>
                <p className="text-sm font-bold text-emerald-400 font-mono">{formatWeight(catSum)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slips Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40 no-print">
          <h3 className="font-bold text-xs uppercase tracking-wider text-white">
            Daily Collection Slips ({collections.length})
          </h3>
          <span className="text-xs text-slate-400">{formatDate(selectedDate)}</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <p className="text-xs">Loading daily records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs print-table">
              <thead>
                <tr className="bg-slate-800/80 text-[11px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">Collector</th>
                  <th className="py-3 px-4 text-right">Gross (KG)</th>
                  <th className="py-3 px-4 text-right">Tare (KG)</th>
                  <th className="py-3 px-4 text-right text-emerald-400 font-bold">Net (KG)</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right text-amber-400 font-bold">Amount (PKR)</th>
                  <th className="py-3 px-4 text-center no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {collections.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{c.receipt_no}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{formatTime(c.collection_time)}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div>{c.customer?.name}</div>
                      <div className="text-[10px] text-slate-400">{c.customer?.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{c.customer?.area}</td>
                    <td className="py-3 px-4 text-slate-300">{c.worker?.full_name}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">{c.gross_weight}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400">-{c.tare_weight}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">{c.total_net_weight}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">{c.rate_per_kg}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">{formatCurrency(c.total_amount, '')}</td>
                    <td className="py-3 px-4 text-center no-print">
                      <button
                        onClick={() => setSelectedSlip(c)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                        title="View Slip"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {collections.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      No collection slips found for {formatDate(selectedDate)}.
                    </td>
                  </tr>
                )}
              </tbody>

              {collections.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-800 font-extrabold text-white border-t border-slate-700">
                    <td colSpan={6} className="py-3 px-4 uppercase text-emerald-400">Daily Grand Total:</td>
                    <td className="py-3 px-4 text-right font-mono">{totalGross.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400">-{totalTare.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 text-sm font-black">{totalNet.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">—</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-400 text-sm font-black">{totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 no-print"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <CollectionDetailModal
        collection={selectedSlip}
        isOpen={!!selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />
    </div>
  );
};
