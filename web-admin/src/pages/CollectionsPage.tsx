// =============================================================================
// SHAN POULTRY PROTEIN - All Collections Directory Page
// Filterable, Searchable, Paginated Master Table
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Collection, Customer, Profile } from '../types/database';
import { formatDate, formatTime, formatWeight, formatCurrency } from '../utils/formatters';
import { Search, Plus, Eye, Trash2, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CollectionDetailModal } from '../components/collections/CollectionDetailModal';
import { NewCollectionModal } from '../components/collections/NewCollectionModal';
import { exportToCSV } from '../utils/exportUtils';

export const CollectionsPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await api.getCollections({
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: selectedCustomerId !== 'all' ? selectedCustomerId : undefined,
        workerId: selectedWorkerId !== 'all' ? selectedWorkerId : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      setCollections(res.collections);
      setTotalCount(res.totalCount);
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
  }, [page, startDate, endDate, selectedCustomerId, selectedWorkerId]);

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
    <div className="space-y-6">
      {/* Top Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Collection Slips Directory</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {collections.length} of {totalCount} total historical records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Slip</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search slip #, phone, shop..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </form>

          {/* Customer filter */}
          <select
            value={selectedCustomerId}
            onChange={e => {
              setSelectedCustomerId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Collections Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs">Loading collection records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                  <th className="py-3 px-4">Slip #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4 text-right">Gross (KG)</th>
                  <th className="py-3 px-4 text-right">Tare (KG)</th>
                  <th className="py-3 px-4 text-right text-emerald-400 font-bold">Net (KG)</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right text-amber-400 font-bold">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {collections.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{c.receipt_no}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{formatDate(c.collection_date)}</div>
                      <div className="text-[10px] text-slate-500">{formatTime(c.collection_time)}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      <div>{c.customer?.name}</div>
                      <div className="text-[10px] text-slate-400">{c.customer?.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{c.customer?.area}</td>
                    <td className="py-3 px-4 text-slate-300">{c.worker?.full_name}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">{c.gross_weight}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400">-{c.tare_weight}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300 text-sm">
                      {formatWeight(c.total_net_weight, '')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">{c.rate_per_kg}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                      {formatCurrency(c.total_amount, '')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedSlip(c)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                          title="View Details & Signature"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete slip ${c.receipt_no}?`)) {
                              handleDelete(c.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
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
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      No collections found matching current filter parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/60">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition"
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

      {/* New Slip Modal */}
      <NewCollectionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={() => {
          fetchCollections();
        }}
      />
    </div>
  );
};
