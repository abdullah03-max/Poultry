// =============================================================================
// SHAN POULTRY PROTEIN - Comprehensive Reports & Analytics Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Collection, Customer, Profile, WeightCategory } from '../types/database';
import { formatDate, formatWeight, formatCurrency } from '../utils/formatters';
import { FileSpreadsheet, Download, Printer, Calendar, Scale, HardHat } from 'lucide-react';
import { exportToCSV, triggerPrint } from '../utils/exportUtils';

export const ReportsPage: React.FC = () => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(today);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<WeightCategory[]>([]);

  const fetchReportData = async () => {
    try {
      const [res, cats] = await Promise.all([
        api.getCollections({ startDate, endDate, limit: 3000 }),
        api.getWeightCategories(),
      ]);

      setCollections(res.collections);
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching report data:', err);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  // Aggregate stats
  const totalCollections = collections.length;
  const totalNetWeight = collections.reduce((acc, c) => acc + c.total_net_weight, 0);
  const totalGrossWeight = collections.reduce((acc, c) => acc + c.gross_weight, 0);
  const totalTareWeight = collections.reduce((acc, c) => acc + c.tare_weight, 0);
  const totalAmount = collections.reduce((acc, c) => acc + c.total_amount, 0);

  // Customer aggregations
  const customerSummary: Record<string, { customer: Customer; weight: number; count: number; amount: number }> = {};
  collections.forEach(c => {
    if (c.customer) {
      if (!customerSummary[c.customer_id]) {
        customerSummary[c.customer_id] = { customer: c.customer, weight: 0, count: 0, amount: 0 };
      }
      customerSummary[c.customer_id].weight += c.total_net_weight;
      customerSummary[c.customer_id].count += 1;
      customerSummary[c.customer_id].amount += c.total_amount;
    }
  });

  // Worker aggregations
  const workerSummary: Record<string, { worker: Profile; weight: number; count: number }> = {};
  collections.forEach(c => {
    if (c.worker) {
      if (!workerSummary[c.worker_id]) {
        workerSummary[c.worker_id] = { worker: c.worker, weight: 0, count: 0 };
      }
      workerSummary[c.worker_id].weight += c.total_net_weight;
      workerSummary[c.worker_id].count += 1;
    }
  });

  // Category aggregations
  const categorySummary: Record<string, number> = {};
  collections.forEach(c => {
    c.items?.forEach((it: any) => {
      categorySummary[it.category_id] = (categorySummary[it.category_id] || 0) + it.weight;
    });
  });

  const handleExportSummaryCSV = () => {
    const headers = ['Category / Item', 'Value'];
    const rows = [
      ['Report Range', `${startDate} to ${endDate}`],
      ['Total Collections', totalCollections],
      ['Total Gross Weight (KG)', totalGrossWeight],
      ['Total Tare Weight (KG)', totalTareWeight],
      ['Total Net Weight (KG)', totalNetWeight],
      ['Total Amount (PKR)', totalAmount],
      ['', ''],
      ['CUSTOMER BREAKDOWN', ''],
      ...Object.values(customerSummary).map(cs => [
        `${cs.customer.name} (${cs.customer.area})`,
        `${cs.weight} KG (Rs. ${cs.amount})`,
      ]),
    ];

    exportToCSV(`SHAN_POULTRY_REPORT_${startDate}_to_${endDate}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Custom Reports & Aggregations</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate customized weight and revenue statements across dates, customers, and categories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
            />
          </div>

          <button
            onClick={handleExportSummaryCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Print View Header */}
      <div className="hidden print-only mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase">SHAN POULTRY PROTEIN</h1>
        <p className="text-sm font-bold mt-1">Official Waste Collection Statement</p>
        <p className="text-xs text-gray-700">Period: {formatDate(startDate)} to {formatDate(endDate)}</p>
      </div>

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Net Weight</p>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{formatWeight(totalNetWeight)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Billed Revenue</p>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Collection Slips</p>
          <p className="text-2xl font-black text-white font-mono mt-1">{totalCollections}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Average Weight / Day</p>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">
            {formatWeight(totalNetWeight / Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))}
          </p>
        </div>
      </div>

      {/* Breakdown Grid: Category & Workers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" /> Weight Breakdown by Category
          </h3>
          <div className="space-y-2">
            {categories.map(cat => {
              const catW = categorySummary[cat.id] || 0;
              const pct = totalNetWeight > 0 ? (catW / totalNetWeight) * 100 : 0;
              return (
                <div key={cat.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-xs">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2 font-mono">({pct.toFixed(1)}%)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{formatWeight(catW)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Worker Performance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-400" /> Collector Performance (Slips & Weight)
          </h3>
          <div className="space-y-2">
            {Object.values(workerSummary).map(ws => (
              <div key={ws.worker.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">{ws.worker.full_name}</p>
                  <p className="text-[10px] text-slate-400">{ws.count} slips completed</p>
                </div>
                <p className="font-mono font-bold text-emerald-400 text-sm">{formatWeight(ws.weight)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Full Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-800/40">
          <h3 className="font-bold text-xs uppercase tracking-wider text-white">
            Customer Statement Breakdown ({Object.keys(customerSummary).length} Active Shops)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs print-table">
            <thead>
              <tr className="bg-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Area</th>
                <th className="py-3 px-4 text-center">Collection Slips</th>
                <th className="py-3 px-4 text-right">Net Weight (KG)</th>
                <th className="py-3 px-4 text-right">Total Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {Object.values(customerSummary).map(cs => (
                <tr key={cs.customer.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">{cs.customer.customer_code}</td>
                  <td className="py-3 px-4 font-semibold text-white">{cs.customer.name}</td>
                  <td className="py-3 px-4 text-slate-400">{cs.customer.area}</td>
                  <td className="py-3 px-4 text-center font-mono">{cs.count}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300">
                    {formatWeight(cs.weight, '')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                    {formatCurrency(cs.amount, '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
