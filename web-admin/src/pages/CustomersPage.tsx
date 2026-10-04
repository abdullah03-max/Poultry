// =============================================================================
// SHAN POULTRY PROTEIN - Customer Management & 360 History Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Customer, Collection } from '../types/database';
import { formatWeight, formatCurrency, formatDate } from '../utils/formatters';
import { Search, Plus, Phone, MapPin, Edit, History, UserX, UserCheck, Scale, Loader2, Trash2 } from 'lucide-react';
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

  const handleDeleteCustomer = async (cust: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${cust.name}"? This will remove this shop from the directory.`)) {
      return;
    }
    try {
      await api.deleteCustomer(cust.id);
      fetchCustomers();
    } catch (err: any) {
      alert(`Failed to delete customer: ${err.message || 'Error'}`);
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
    <div className="space-y-6 text-slate-800">
      {/* Top Controls Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Poultry Customers & Suppliers</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage chicken dressing centers, retail shops, wholesale accounts, and their agreed rate schedules
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
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, code, phone, or area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white"
            />
          </div>

          <select
            value={selectedArea}
            onChange={e => setSelectedArea(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-600 focus:bg-white"
          >
            <option value="all">All Areas ({areas.length})</option>
            {areas.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-600 focus:bg-white"
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
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-xs font-medium text-slate-500">Loading customer directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => (
            <div
              key={cust.id}
              className={`p-5 rounded-2xl border transition-all duration-200 bg-white shadow-card hover:shadow-card-hover flex flex-col justify-between ${
                cust.status === 'active' ? 'border-slate-200/90' : 'border-rose-200 bg-rose-50/20 opacity-80'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                    {cust.customer_code}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      cust.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {cust.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900">{cust.name}</h3>
                  {cust.contact_person && (
                    <p className="text-xs text-slate-500 font-medium">{cust.contact_person}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.area} — {cust.address || 'Standard Address'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-brand-700 font-semibold">
                    <Scale className="w-3.5 h-3.5 shrink-0" />
                    <span>Agreed Rate: {cust.rate_per_kg} PKR / KG</span>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => openCustomer360(cust)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition"
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
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Customer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(cust)}
                    className={`p-1.5 rounded-lg transition ${
                      cust.status === 'active'
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={cust.status === 'active' ? 'Deactivate Customer' : 'Activate Customer'}
                  >
                    {cust.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(cust)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
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
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Slips</p>
                <p className="text-xl font-bold text-slate-900 font-mono mt-1">{customerSlips.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-[10px] text-brand-700 uppercase font-bold">Total Net Weight</p>
                <p className="text-xl font-black text-brand-700 font-mono mt-1">
                  {formatWeight(customerSlips.reduce((acc, c) => acc + c.total_net_weight, 0))}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-[10px] text-amber-700 uppercase font-bold">Total Billed</p>
                <p className="text-xl font-black text-amber-700 font-mono mt-1">
                  {formatCurrency(customerSlips.reduce((acc, c) => acc + c.total_amount, 0))}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-brand-600" /> Recent Collection Slips
              </h4>

              {loadingHistory ? (
                <div className="py-12 flex justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                        <th className="py-2.5 px-3">Receipt No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Collector</th>
                        <th className="py-2.5 px-3 text-right">Net (KG)</th>
                        <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {customerSlips.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-brand-700 font-bold">{s.receipt_no}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-sans">{formatDate(s.collection_date)}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-sans">{s.worker?.full_name || 'System / Admin'}</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-bold">{s.total_net_weight}</td>
                          <td className="py-2.5 px-3 text-right text-amber-700 font-bold">{s.total_amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {customerSlips.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer / Shop Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Al-Madina Broilers"
              value={editingCustomer?.name || ''}
              onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), name: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer Code *
              </label>
              <input
                type="text"
                required
                value={editingCustomer?.customer_code || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), customer_code: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Rate (PKR / KG) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={editingCustomer?.rate_per_kg ?? 45}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), rate_per_kg: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Haji Rehman"
                value={editingCustomer?.contact_person || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), contact_person: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                placeholder="+92 300 0000000"
                value={editingCustomer?.phone || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), phone: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Area / Town *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Burewala"
                value={editingCustomer?.area || ''}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), area: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={editingCustomer?.status || 'active'}
                onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), status: e.target.value as any }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Shop Address / Landmark
            </label>
            <input
              type="text"
              placeholder="e.g. Main Bazaar, Near Old Grain Market"
              value={editingCustomer?.address || ''}
              onChange={e => setEditingCustomer(prev => ({ ...(prev || {}), address: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
