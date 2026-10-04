// =============================================================================
// SHAN POULTRY PROTEIN - Daily Record Reconciliation Page
// Daylight B2B Clean Palette Edition
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Collection, WeightCategory } from '../types/database';
import { formatDate, formatTime, formatWeight, formatCurrency } from '../utils/formatters';
import { Calendar, Printer, Scale, Eye, Edit2, Trash2, Loader2, ArrowLeft, ArrowRight, DollarSign, FileSpreadsheet } from 'lucide-react';
import { CollectionDetailModal } from '../components/collections/CollectionDetailModal';
import { EditCollectionModal } from '../components/collections/EditCollectionModal';
import { triggerPrint } from '../utils/exportUtils';

interface DailyRecordPageProps {
  refreshTrigger?: number;
}

export const DailyRecordPage: React.FC<DailyRecordPageProps> = ({ refreshTrigger }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSlip, setSelectedSlip] = useState<Collection | null>(null);
  const [editingSlip, setEditingSlip] = useState<Collection | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

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
  }, [selectedDate, refreshTrigger]);

  const changeDateByDays = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleDeleteCollection = async (id: string, receipt_no: string) => {
    if (!confirm(`Are you sure you want to delete collection slip ${receipt_no}? This will recalculate the daily records and register.`)) {
      return;
    }
    try {
      await api.deleteCollection(id);
      fetchDailyData();
    } catch (err: any) {
      alert(`Failed to delete collection: ${err.message || 'Error'}`);
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-card no-print">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Daily Weight Record Sheet
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Reconciles all individual shop collections recorded on {formatDate(selectedDate)}.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/80 p-1">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
              title="Previous Day"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none font-mono"
            />

            <button
              onClick={() => changeDateByDays(1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
              title="Next Day"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Today
          </button>

          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Print View Header */}
      <div className="hidden print-only mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">SHAN POULTRY PROTEIN</h1>
        <p className="text-base font-bold mt-1 text-slate-700">Daily Weight Collection Sheet</p>
        <p className="text-sm text-slate-600 font-medium">Date: {formatDate(selectedDate)}</p>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Weight</p>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 font-mono mt-2">{formatWeight(totalNet)}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Gross: {formatWeight(totalGross)} | Tare: -{formatWeight(totalTare)}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Day Billing</p>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono mt-2">{formatCurrency(totalAmount)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total revenue generated</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slips Completed</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-2">{collections.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Unique customer receipts</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average / Slip</p>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-2">
            {formatWeight(collections.length > 0 ? totalNet / collections.length : 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Per shop average</p>
        </div>
      </div>

      {/* Category Subtotals for the Day */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600" /> Category Weight Totals For {formatDate(selectedDate)}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map(cat => {
            const catSum = categoryDaySums[cat.id] || 0;
            return (
              <div key={cat.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{cat.name}</p>
                  {cat.urdu_name && <p className="text-[11px] text-slate-500 font-urdu">{cat.urdu_name}</p>}
                </div>
                <p className="text-sm font-black text-blue-700 font-mono">{formatWeight(catSum)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slips Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 no-print">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Daily Collection Slips ({collections.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">{formatDate(selectedDate)}</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs">Loading daily records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs print-table">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">Collector</th>
                  <th className="py-3 px-4 text-right">Gross (KG)</th>
                  <th className="py-3 px-4 text-right">Tare (KG)</th>
                  <th className="py-3 px-4 text-right text-blue-700 font-bold">Net (KG)</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right text-amber-700 font-bold">Amount (PKR)</th>
                  <th className="py-3 px-4 text-center no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{c.receipt_no}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{formatTime(c.collection_time)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{c.customer?.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{c.customer?.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.customer?.area}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{c.worker?.full_name || 'Admin'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{c.gross_weight}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">-{c.tare_weight}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">{c.total_net_weight}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{c.rate_per_kg}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">{formatCurrency(c.total_amount, '')}</td>
                    <td className="py-3 px-4 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedSlip(c)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                          title="View Slip"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSlip(c);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition"
                          title="Edit Slip"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCollection(c.id, c.receipt_no)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Delete Slip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {collections.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      No collection slips found for {formatDate(selectedDate)}.
                    </td>
                  </tr>
                )}
              </tbody>

              {collections.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-200">
                    <td colSpan={6} className="py-3 px-4 uppercase text-slate-700">Daily Grand Total:</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{totalGross.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">-{totalTare.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-blue-700 text-sm font-black">{totalNet.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">—</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700 text-sm font-black">{totalAmount.toLocaleString()}</td>
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

      <EditCollectionModal
        isOpen={isEditModalOpen}
        collection={editingSlip}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSlip(null);
        }}
        onSaved={fetchDailyData}
      />
    </div>
  );
};
