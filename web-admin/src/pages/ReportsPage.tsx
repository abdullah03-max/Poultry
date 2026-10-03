// =============================================================================
// SHAN POULTRY PROTEIN - Comprehensive Reports & Analytics Page
// Daylight B2B Clean Palette Edition
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
    if (c.worker && c.worker_id) {
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Custom Reports & Aggregations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate customized weight and revenue statements across dates, customers, and categories.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-600 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-600 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={handleExportSummaryCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Print View Header */}
      <div className="hidden print-only mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase text-slate-900">SHAN POULTRY PROTEIN</h1>
        <p className="text-sm font-bold mt-1 text-slate-700">Official Waste Collection Statement</p>
        <p className="text-xs text-slate-600">Period: {formatDate(startDate)} to {formatDate(endDate)}</p>
      </div>

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Net Weight</p>
          <p className="text-2xl font-black text-blue-700 font-mono mt-2">{formatWeight(totalNetWeight)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Net billed load</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Billed Revenue</p>
          <p className="text-2xl font-black text-amber-700 font-mono mt-2">{formatCurrency(totalAmount)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Calculated billing</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Collection Slips</p>
          <p className="text-2xl font-black text-slate-900 font-mono mt-2">{totalCollections}</p>
          <p className="text-[11px] text-slate-400 mt-1">Individual slips registered</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">Average Weight / Day</p>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-2">
            {formatWeight(totalNetWeight / Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Daily running average</p>
        </div>
      </div>

      {/* Breakdown Grid: Category & Workers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" /> Weight Breakdown by Category
          </h3>
          <div className="space-y-2.5">
            {categories.map(cat => {
              const catW = categorySummary[cat.id] || 0;
              const pct = totalNetWeight > 0 ? (catW / totalNetWeight) * 100 : 0;
              return (
                <div key={cat.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{cat.name}</span>
                    {cat.urdu_name && <span className="text-xs text-slate-500 font-urdu ml-2">{cat.urdu_name}</span>}
                    <span className="text-[11px] text-slate-400 ml-2 font-mono">({pct.toFixed(1)}%)</span>
                  </div>
                  <span className="font-mono font-bold text-blue-700 text-sm">{formatWeight(catW)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Worker Performance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-600" /> Collector Performance (Slips & Weight)
          </h3>
          <div className="space-y-2.5">
            {Object.values(workerSummary).map(ws => (
              <div key={ws.worker.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-xs">{ws.worker.full_name}</p>
                  <p className="text-[11px] text-slate-500">{ws.count} slips completed</p>
                </div>
                <p className="font-mono font-bold text-blue-700 text-sm">{formatWeight(ws.weight)}</p>
              </div>
            ))}
            {Object.values(workerSummary).length === 0 && (
              <p className="text-xs text-slate-400 italic py-4 text-center">No worker-assigned collections in this range.</p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Full Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Customer Statement Breakdown ({Object.keys(customerSummary).length} Active Shops)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs print-table">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Area</th>
                <th className="py-3 px-4 text-center">Collection Slips</th>
                <th className="py-3 px-4 text-right">Net Weight (KG)</th>
                <th className="py-3 px-4 text-right">Total Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.values(customerSummary).map(cs => (
                <tr key={cs.customer.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{cs.customer.customer_code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{cs.customer.name}</td>
                  <td className="py-3 px-4 text-slate-500">{cs.customer.area}</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-700">{cs.count}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                    {formatWeight(cs.weight, '')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                    {formatCurrency(cs.amount, '')}
                  </td>
                </tr>
              ))}
              {Object.keys(customerSummary).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No customer activity recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
