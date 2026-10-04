// =============================================================================
// SHAN POULTRY PROTEIN - Admin Operations Dashboard
// Executive Command Center for live field collections, daily weights, and regional overview
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  Scale,
  CalendarCheck,
  Users,
  HardHat,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Eye,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Collection, Customer, WeightCategory } from '../types/database';
import { api } from '../services/api';
import { formatWeight, formatCurrency, formatDate, formatTime } from '../utils/formatters';
import { CollectionDetailModal } from '../components/collections/CollectionDetailModal';

interface DashboardPageProps {
  collections: Collection[];
  onNavigateTab: (tab: any) => void;
  onOpenNewCollection: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  collections,
  onNavigateTab,
  onOpenNewCollection,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getWeightCategories()]).then(([c, w]) => {
      setCustomers(c);
      setCategories(w);
    });
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCollections = collections.filter(c => c.collection_date === todayStr);

  const todayTotalWeight = todayCollections.reduce((acc, c) => acc + c.total_net_weight, 0);
  const todayTotalAmount = todayCollections.reduce((acc, c) => acc + c.total_amount, 0);

  // Month-to-date calculations
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthCollections = collections.filter(c => c.collection_date.startsWith(currentMonthPrefix));
  const monthTotalWeight = monthCollections.reduce((acc, c) => acc + c.total_net_weight, 0);
  const monthTotalAmount = monthCollections.reduce((acc, c) => acc + c.total_amount, 0);

  // Top Customers by Month Weight
  const customerWeightMap: Record<string, { customer: Customer; weight: number }> = {};
  monthCollections.forEach(c => {
    if (c.customer) {
      if (!customerWeightMap[c.customer_id]) {
        customerWeightMap[c.customer_id] = { customer: c.customer, weight: 0 };
      }
      customerWeightMap[c.customer_id].weight += c.total_net_weight;
    }
  });
  const topCustomers = Object.values(customerWeightMap)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  // Category breakdown calculation
  const categoryWeightMap: Record<string, number> = {};
  monthCollections.forEach(c => {
    c.items?.forEach(item => {
      categoryWeightMap[item.category_id] = (categoryWeightMap[item.category_id] || 0) + item.weight;
    });
  });

  return (
    <div className="space-y-6 text-slate-800">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-4 sm:p-6 md:p-8 shadow-card text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-poultry-gold" /> Operations Command Center
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              SHAN POULTRY PROTEIN
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-normal">
              Realtime Poultry Waste Collection & Weight Management Portal. Monitoring live field collections across Gaggoo Mandi, Burewala, Vehari, and Sahiwal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('monthly-register')}
              className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-600 shadow-sm transition text-center"
            >
              Monthly Register
            </button>
            <button
              onClick={onOpenNewCollection}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition active:scale-95 text-center"
            >
              + Record Collection
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Today's Net Weight"
          value={formatWeight(todayTotalWeight)}
          subtext={`${todayCollections.length} slips recorded`}
          icon={Scale}
          color="blue"
        />
        <StatCard
          title="Today's Collections"
          value={todayCollections.length}
          subtext="Field slips today"
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Active Shops"
          value={customers.filter(c => c.status === 'active').length}
          subtext="Registered clients"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Field Workers"
          value="2"
          subtext="Mobile collectors"
          icon={HardHat}
          color="amber"
        />
        <StatCard
          title="Month Net Weight"
          value={formatWeight(monthTotalWeight)}
          subtext="Current month total"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Month Total Value"
          value={formatCurrency(monthTotalAmount)}
          subtext="Calculated billing"
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Main Content Grid: Top Customers & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Suppliers by Weight */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" /> Top Suppliers (This Month)
            </h3>
            <button
              onClick={() => onNavigateTab('customers')}
              className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {topCustomers.map((tc, idx) => {
              const pct = monthTotalWeight > 0 ? (tc.weight / monthTotalWeight) * 100 : 0;
              return (
                <div key={tc.customer.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-brand-600 font-bold mr-1.5">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{tc.customer.name}</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {formatWeight(tc.weight)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {tc.customer.area}
                    </span>
                    <span className="font-medium">{pct.toFixed(1)}% of volume</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {topCustomers.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No collections recorded yet this month.</p>
            )}
          </div>
        </div>

        {/* Dynamic Category Weight Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-brand-600" /> Category Breakdown
            </h3>
            <span className="text-xs text-slate-500 font-medium">Configurable</span>
          </div>

          <div className="space-y-4">
            {categories.map(cat => {
              const catWeight = categoryWeightMap[cat.id] || 0;
              const pct = monthTotalWeight > 0 ? (catWeight / monthTotalWeight) * 100 : 0;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {cat.name}
                      {cat.urdu_name && <span className="text-[10px] text-slate-400 ml-1 font-urdu">({cat.urdu_name})</span>}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{formatWeight(catWeight)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Default Rate: {cat.default_rate} PKR/KG</span>
                    <span className="font-medium">{pct.toFixed(1)}% of total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Today's Snapshot / Quick Register Shortcut */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-poultry-amber" /> Today's Fast Sheet
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Direct access to today's active collections. Submissions sync directly to the Monthly Register in realtime.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Reconciliation Date:</span>
                <span className="font-bold text-slate-900">{formatDate(todayStr)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Total Net Weight:</span>
                <span className="font-mono font-extrabold text-brand-700">{formatWeight(todayTotalWeight)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Total Value:</span>
                <span className="font-mono font-extrabold text-amber-700">{formatCurrency(todayTotalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => onNavigateTab('daily-records')}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>View Daily Record Sheet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('monthly-register')}
              className="w-full py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl border border-brand-200 transition flex items-center justify-center gap-2"
            >
              <span>View 31-Day Matrix Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Live Collections Feed */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" /> Recent Collection Slips
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Live incoming slips from mobile collectors in the field</p>
          </div>
          <button
            onClick={() => onNavigateTab('collections')}
            className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold"
          >
            All Collections <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Slip #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Area</th>
                <th className="py-3 px-4">Worker</th>
                <th className="py-3 px-4 text-right">Net Weight</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collections.slice(0, 7).map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-brand-700">{c.receipt_no}</td>
                  <td className="py-3 px-4 text-slate-700">
                    <div>{formatDate(c.collection_date)}</div>
                    <div className="text-[10px] text-slate-400">{formatTime(c.collection_time)}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{c.customer?.name}</td>
                  <td className="py-3 px-4 text-slate-600">{c.customer?.area}</td>
                  <td className="py-3 px-4 text-slate-600">{c.worker?.full_name || 'System / Admin'}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatWeight(c.total_net_weight)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                    {formatCurrency(c.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedCollection(c)}
                      className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition"
                      title="View Slip Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Detail Modal */}
      <CollectionDetailModal
        collection={selectedCollection}
        isOpen={!!selectedCollection}
        onClose={() => setSelectedCollection(null)}
      />
    </div>
  );
};
