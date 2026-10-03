// =============================================================================
// SHAN POULTRY PROTEIN - Customer Management & 360 History Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Customer, Collection } from '../types/database';
import { formatWeight, formatCurrency, formatDate } from '../utils/formatters';
import { Search, Plus, Phone, MapPin, Edit, History, UserX, UserCheck, Scale, Loader2 } from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Customer 360 History Modal
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [customerSlips, setCustomerSlips] = useState<Collection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Add / Edit Modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers(true);
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCustomer360 = async (cust: Customer) => {
    setViewCustomer(cust);
    try {
      setLoadingHistory(true);
      const res = await api.getCollections({ customerId: cust.id, limit: 100 });
      setCustomerSlips(res.collections);
    } catch (err) {
      console.error('Error loading customer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleStatus = async (cust: Customer) => {
    const newStatus = cust.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateCustomer(cust.id, { status: newStatus });
      fetchCustomers();
    } catch (err) {
      console.error('Failed to toggle customer status:', err);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      if (editingCustomer.id) {
        await api.updateCustomer(editingCustomer.id, editingCustomer);
      } else {
        await api.createCustomer({
          customer_code: editingCustomer.customer_code || `CUST-${String(customers.length + 1).padStart(3, '0')}`,
          name: editingCustomer.name || 'New Customer',
          contact_person: editingCustomer.contact_person || null,
          phone: editingCustomer.phone || '',
          alternate_phone: editingCustomer.alternate_phone || null,
          address: editingCustomer.address || null,
          area: editingCustomer.area || 'General',
          rate_per_kg: editingCustomer.rate_per_kg || 45.0,
          category_rates: {},
          status: 'active',
          notes: editingCustomer.notes || null,
        });
      }
      setEditModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to save customer:', err);
    }
  };

  const areas = Array.from(new Set(customers.map(c => c.area))).filter(Boolean);

  const filteredCustomers = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.area.toLowerCase().includes(search.toLowerCase());
    const matchArea = selectedArea === 'all' || c.area === selectedArea;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchArea && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Poultry Customers & Shops</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage chicken centers, dressing points, and poultry wholesale partners
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCustomer({
                customer_code: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
                name: '',
                contact_person: '',
                phone: '+92 3',
                area: 'Gaggoo Mandi',
                rate_per_kg: 45.0,
                status: 'active',
              });
              setEditModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, code, phone, or area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

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

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* Customers Cards / Directory */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-xs">Loading customer directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => (
            <div
              key={cust.id}
              className={`p-5 rounded-2xl border transition-all duration-200 bg-slate-900 flex flex-col justify-between ${
                cust.status === 'active' ? 'border-slate-800 hover:border-slate-700' : 'border-rose-950/40 opacity-75'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    {cust.customer_code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      cust.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {cust.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-white">{cust.name}</h3>
                  {cust.contact_person && (
                    <p className="text-xs text-slate-400 font-medium">{cust.contact_person}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.area} — {cust.address || 'Standard Address'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <Scale className="w-3.5 h-3.5 shrink-0" />
                    <span>Rate: {cust.rate_per_kg} PKR / KG</span>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => openCustomer360(cust)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View History</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCustomer(cust);
                      setEditModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Edit Customer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(cust)}
                    className={`p-1.5 rounded-lg transition ${
                      cust.status === 'active'
                        ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                        : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                    }`}
                    title={cust.status === 'active' ? 'Deactivate Customer' : 'Activate Customer'}
                  >
                    {cust.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer 360 History Modal */}
      <Modal
        isOpen={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title={viewCustomer ? `${viewCustomer.name} (${viewCustomer.customer_code})` : 'Customer History'}
        subtitle={`Lifetime Collections Profile — ${viewCustomer?.area}`}
        maxWidth="2xl"
      >
        {viewCustomer && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Slips</p>
                <p className="text-xl font-bold text-white font-mono mt-1">{customerSlips.length}</p>
              </div>
              <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
                <p className="text-[10px] text-emerald-400 uppercase font-semibold">Total Net Weight</p>
                <p className="text-xl font-bold text-emerald-300 font-mono mt-1">
                  {formatWeight(customerSlips.reduce((acc, c) => acc + c.total_net_weight, 0))}
                </p>
              </div>
              <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/30">
                <p className="text-[10px] text-amber-400 uppercase font-semibold">Total Billed</p>
                <p className="text-xl font-bold text-amber-300 font-mono mt-1">
                  {formatCurrency(customerSlips.reduce((acc, c) => acc + c.total_amount, 0))}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-400" /> Recent Collection Slips
              </h4>

              {loadingHistory ? (
                <div className="py-12 flex justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-800/90 sticky top-0">
                      <tr className="border-b border-slate-700 text-slate-400 font-bold text-[10px] uppercase">
                        <th className="py-2.5 px-3">Receipt No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Worker</th>
                        <th className="py-2.5 px-3 text-right">Net (KG)</th>
                        <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {customerSlips.map(s => (
                        <tr key={s.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{s.receipt_no}</td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans">{formatDate(s.collection_date)}</td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans">{s.worker?.full_name}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-300 font-bold">{s.total_net_weight}</td>
                          <td className="py-2.5 px-3 text-right text-amber-400 font-bold">{s.total_amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {customerSlips.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                            No collection history for this customer.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingCustomer?.id ? 'Edit Customer' : 'Add New Poultry Customer'}
        subtitle="Manage customer details, rate per KG, and contact information"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Customer / Shop Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Al-Madina Broilers"
              value={editingCustomer?.name || ''}
              onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), name: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Customer Code *
              </label>
              <input
                type="text"
                required
                value={editingCustomer?.customer_code || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), customer_code: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Rate (PKR / KG) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={editingCustomer?.rate_per_kg ?? 45}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), rate_per_kg: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Haji Rehman"
                value={editingCustomer?.contact_person || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), contact_person: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                placeholder="+92 300 0000000"
                value={editingCustomer?.phone || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), phone: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Area / Town *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Burewala"
                value={editingCustomer?.area || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), area: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={editingCustomer?.status || 'active'}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), status: e.target.value as any }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Shop Address / Landmark
            </label>
            <input
              type="text"
              placeholder="e.g. Main Bazaar, Near Old Grain Market"
              value={editingCustomer?.address || ''}
              onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), address: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
