// =============================================================================
// SHAN POULTRY PROTEIN - All Collections Directory Page
// Filterable, Searchable, Paginated Master Table
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Collection, Customer, Profile } from '../types/database';
import { formatDate, formatTime, formatWeight, formatCurrency } from '../utils/formatters';
import { Search, Plus, Eye, Edit2, Trash2, Download, ChevronLeft, ChevronRight, Loader2, RefreshCw, Scale, Banknote, FileCheck, TrendingUp, Store } from 'lucide-react';
import { CollectionDetailModal } from '../components/collections/CollectionDetailModal';
import { NewCollectionModal } from '../components/collections/NewCollectionModal';
import { EditCollectionModal } from '../components/collections/EditCollectionModal';
import { exportToCSV } from '../utils/exportUtils';

interface CollectionsPageProps {
  refreshTrigger?: number;
}

export const CollectionsPage: React.FC<CollectionsPageProps> = ({ refreshTrigger }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<{
    totalSlips: number;
    totalNetWeight: number;
    totalAmount: number;
    avgWeightPerSlip: number;
    uniqueCustomersCount: number;
  }>({
    totalSlips: 0,
    totalNetWeight: 0,
    totalAmount: 0,
    avgWeightPerSlip: 0,
    uniqueCustomersCount: 0,
  });

  // Filters
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Modals
  const [selectedSlip, setSelectedSlip] = useState<Collection | null>(null);
  const [editingSlip, setEditingSlip] = useState<Collection | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const [res, statsRes] = await Promise.all([
        api.getCollections({
          search: search.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          customerId: selectedCustomerId !== 'all' ? selectedCustomerId : undefined,
          workerId: selectedWorkerId !== 'all' ? selectedWorkerId : undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        api.getCollectionStats({
          search: search.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          customerId: selectedCustomerId !== 'all' ? selectedCustomerId : undefined,
          workerId: selectedWorkerId !== 'all' ? selectedWorkerId : undefined,
        }),
      ]);

      setCollections(res.collections);
      setTotalCount(res.totalCount);
      setStats(statsRes);
    } catch (err) {
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getWorkers()]).then(([c, w]) => {
      setCustomers(c);
      setWorkers(w);
    });
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [refreshTrigger, page, startDate, endDate, selectedCustomerId, selectedWorkerId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCollections();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCollection(id);
      fetchCollections();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Receipt No',
      'Date',
      'Time',
      'Customer Code',
      'Customer Name',
      'Area',
      'Worker',
      'Gross (KG)',
      'Tare (KG)',
      'Net Weight (KG)',
      'Rate (PKR)',
      'Total Amount (PKR)',
      'Status',
    ];

    const rows = collections.map(c => [
      c.receipt_no,
      c.collection_date,
      c.collection_time,
      c.customer?.customer_code || '',
      c.customer?.name || '',
      c.customer?.area || '',
      c.worker?.full_name || '',
      c.gross_weight,
      c.tare_weight,
      c.total_net_weight,
      c.rate_per_kg,
      c.total_amount,
      c.status,
    ]);

    exportToCSV(`SHAN_POULTRY_COLLECTIONS_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 no-print">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">کل ویسٹ وزن</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-mono tracking-tight">
              {stats.totalNetWeight.toLocaleString()} <span className="text-xs text-slate-500 font-sans">KG</span>
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              {(stats.totalNetWeight / 1000).toFixed(2)} ٹن کل ویسٹ
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">کل ویسٹ بلنگ</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-emerald-700 font-mono tracking-tight">
              Rs. {stats.totalAmount.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium truncate mt-0.5">مجموعی خریداری رقم</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">تصدیق شدہ سلپس</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-indigo-700 font-mono tracking-tight">
              {stats.totalSlips}
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">کل وصولی پرچیاں</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">اوسط وزن فی سلپ</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-amber-700 font-mono tracking-tight">
              {stats.avgWeightPerSlip} <span className="text-xs text-slate-500 font-sans">KG</span>
            </p>
            <p className="text-[10px] text-amber-600 font-medium truncate mt-0.5">اوسط فی پرچی وزن</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider">شامل دکانیں</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-purple-700 font-mono tracking-tight">
              {stats.uniqueCustomersCount}
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">کلیکشن والی دکانیں</p>
          </div>
        </div>
      </div>

      {/* Top Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Collection Slips Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {collections.length} of {totalCount} total verified historical records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchCollections()}
              disabled={loading}
              title="Refresh list"
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Slip</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search slip #, phone, shop..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white"
            />
          </form>

          {/* Customer filter */}
          <select
            value={selectedCustomerId}
            onChange={e => {
              setSelectedCustomerId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-600 focus:bg-white"
          >
            <option value="all">All Customers ({customers.length})</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.customer_code} - {c.name}</option>
            ))}
          </select>

          {/* Worker filter */}
          <select
            value={selectedWorkerId}
            onChange={e => {
              setSelectedWorkerId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-600 focus:bg-white"
          >
            <option value="all">All Collectors</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.full_name}</option>
            ))}
          </select>

          {/* Start date */}
          <input
            type="date"
            placeholder="From Date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-600 focus:bg-white"
          />

          {/* End date */}
          <input
            type="date"
            placeholder="To Date"
            value={endDate}
            onChange={e => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Collections Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-card">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-xs font-medium text-slate-500">Loading collection records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3.5 px-4">Slip #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Area</th>
                  <th className="py-3.5 px-4">Collector</th>
                  <th className="py-3.5 px-4 text-right">Gross (KG)</th>
                  <th className="py-3.5 px-4 text-right">Tare (KG)</th>
                  <th className="py-3.5 px-4 text-right text-brand-800 font-extrabold">Net (KG)</th>
                  <th className="py-3.5 px-4 text-right">Rate</th>
                  <th className="py-3.5 px-4 text-right text-amber-800 font-extrabold">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">{c.receipt_no}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{formatDate(c.collection_date)}</div>
                      <div className="text-[10px] text-slate-400">{formatTime(c.collection_time)}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{c.customer?.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{c.customer?.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{c.customer?.area}</td>
                    <td className="py-3 px-4 text-slate-600">{c.worker?.full_name || 'System / Admin'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{c.gross_weight}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">-{c.tare_weight}</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                      {formatWeight(c.total_net_weight, '')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{c.rate_per_kg}</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-700">
                      {formatCurrency(c.total_amount, '')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedSlip(c)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                          title="View Details & Signature"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSlip(c);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Slip"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete slip ${c.receipt_no}?`)) {
                              handleDelete(c.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
                      No collections found matching current filter parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slip Details Modal */}
      <CollectionDetailModal
        collection={selectedSlip}
        isOpen={!!selectedSlip}
        onClose={() => setSelectedSlip(null)}
        onDelete={handleDelete}
      />

      {/* Edit Slip Modal */}
      <EditCollectionModal
        collection={editingSlip}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSlip(null);
        }}
        onSaved={fetchCollections}
      />

      {/* New Slip Modal */}
      <NewCollectionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(newSlip) => {
          setCollections(prev => [newSlip, ...prev.filter(c => c.id !== newSlip.id)]);
          setTotalCount(c => c + 1);
          fetchCollections();
        }}
      />
    </div>
  );
};
