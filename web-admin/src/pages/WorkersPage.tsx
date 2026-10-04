// =============================================================================
// SHAN POULTRY PROTEIN - Dedicated Worker Account Management Page
// Allows Owner / Admin to create, activate/deactivate, reset passwords,
// and audit collection activities of mobile field workers
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Profile, Collection } from '../types/database';
import { formatWeight, formatDate, formatTime, formatCurrency } from '../utils/formatters';
import {
  UserCheck,
  UserPlus,
  KeyRound,
  Edit2,
  Power,
  Search,
  Scale,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Loader2,
  Check,
  AlertCircle,
  Shield,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { CollectionDetailModal } from '../components/collections/CollectionDetailModal';

export const WorkersPage: React.FC = () => {
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState<boolean>(false);
  const [isActivityOpen, setIsActivityOpen] = useState<boolean>(false);

  // Selected Worker
  const [selectedWorker, setSelectedWorker] = useState<Profile | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<Collection | null>(null);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [w, c] = await Promise.all([
        api.getWorkersWithStats(),
        api.getCollections({ limit: 2000 }),
      ]);
      setWorkers(w);
      setCollections(c.collections);
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter workers (only field workers, hide admin unless searching)
  const filteredWorkers = workers.filter(w => {
    const s = search.toLowerCase();
    const matchesSearch =
      w.full_name.toLowerCase().includes(s) ||
      (w.phone && w.phone.includes(s)) ||
      (w.email && w.email.toLowerCase().includes(s));
    return matchesSearch;
  });

  // Calculate totals
  const totalWorkers = workers.filter(w => w.role === 'worker').length;
  const activeWorkers = workers.filter(w => w.role === 'worker' && w.is_active).length;
  const totalWeightRecorded = collections.reduce((acc, c) => acc + c.total_net_weight, 0);

  // Handle Add Worker
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);

      if (formPassword.length < 6) {
        setActionError('Password must be at least 6 characters long.');
        return;
      }

      await api.createWorker({
        full_name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        password: formPassword,
      });

      setActionSuccess(`Worker account created for ${formName}. They can now log in to the Mobile App.`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setActionSuccess(null);
        setFormName('');
        setFormPhone('');
        setFormEmail('');
        setFormPassword('');
      }, 1500);

      loadData();
    } catch (err: any) {
      console.error('Failed to create worker:', err);
      setActionError(err.message || 'Failed to create worker account. Please verify input.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Status (Active / Inactive)
  const handleToggleStatus = async (worker: Profile) => {
    const nextStatus = !worker.is_active;
    const confirmMsg = nextStatus
      ? `Activate ${worker.full_name}? They will be able to log in to the mobile app.`
      : `Deactivate ${worker.full_name}? They will be blocked from accessing the mobile app.`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.setWorkerStatus(worker.id, nextStatus);
      setWorkers(prev =>
        prev.map(w => (w.id === worker.id ? { ...w, is_active: nextStatus } : w))
      );
    } catch (err) {
      console.error('Failed to update worker status:', err);
      alert('Could not update status. Please try again.');
    }
  };

  // Handle Edit Worker
  const handleOpenEdit = (worker: Profile) => {
    setSelectedWorker(worker);
    setFormName(worker.full_name);
    setFormPhone(worker.phone || '');
    setActionError(null);
    setActionSuccess(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;

    try {
      setActionLoading(true);
      setActionError(null);

      await api.updateWorker(selectedWorker.id, {
        full_name: formName.trim(),
        phone: formPhone.trim(),
      });

      setActionSuccess('Worker details updated successfully.');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setActionSuccess(null);
      }, 1200);

      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update worker information.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reset Password
  const handleOpenResetPassword = (worker: Profile) => {
    setSelectedWorker(worker);
    setNewPassword('');
    setActionError(null);
    setActionSuccess(null);
    setIsResetPasswordOpen(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;

    if (newPassword.length < 6) {
      setActionError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      await api.resetWorkerPassword(selectedWorker.id, newPassword);

      setActionSuccess(`Password successfully reset for ${selectedWorker.full_name}. Provide this new password to the worker.`);
      setTimeout(() => {
        setIsResetPasswordOpen(false);
        setActionSuccess(null);
        setNewPassword('');
      }, 2000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle View Activity
  const handleOpenActivity = (worker: Profile) => {
    setSelectedWorker(worker);
    setIsActivityOpen(true);
  };

  // Handle Delete Worker
  const handleDeleteWorker = async (worker: Profile) => {
    if (!confirm(`Are you sure you want to delete worker "${worker.full_name}"? Their account and access to the Mobile App will be permanently removed.`)) {
      return;
    }
    try {
      await api.deleteWorker(worker.id);
      loadData();
    } catch (err: any) {
      alert(`Failed to delete worker: ${err.message || 'Error'}`);
    }
  };

  const workerSpecificCollections = selectedWorker
    ? collections.filter(c => c.worker_id === selectedWorker.id)
    : [];

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-brand-700 text-xs font-semibold mb-2">
              <UserCheck className="w-3.5 h-3.5" /> Worker Accounts & Permissions
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Field Workers Management
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Create and manage mobile collector accounts. Generated worker credentials allow employees to log into the Worker Mobile App to record poultry waste collections in the field.
            </p>
          </div>

          <button
            onClick={() => {
              setFormName('');
              setFormPhone('');
              setFormEmail('');
              setFormPassword('');
              setActionError(null);
              setActionSuccess(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Worker</span>
          </button>
        </div>

        {/* 3 Metric Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Field Workers</p>
              <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalWorkers}</p>
            </div>
            <div className="p-2.5 bg-blue-100/60 text-brand-700 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Mobile Accounts</p>
              <p className="text-2xl font-black text-emerald-700 font-mono mt-0.5">{activeWorkers}</p>
            </div>
            <div className="p-2.5 bg-emerald-100/60 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Weight Collected</p>
              <p className="text-2xl font-black text-brand-800 font-mono mt-0.5">{formatWeight(totalWeightRecorded)}</p>
            </div>
            <div className="p-2.5 bg-blue-100/60 text-brand-700 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Workers Directory Table & Search */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by worker name, phone, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white transition"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredWorkers.length} staff accounts
          </span>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Worker Profile</th>
                <th className="py-3.5 px-4">Login Email / Username</th>
                <th className="py-3.5 px-4">Phone Number</th>
                <th className="py-3.5 px-4 text-center">Mobile Status</th>
                <th className="py-3.5 px-4 text-right">Total Slips</th>
                <th className="py-3.5 px-4 text-right">Net Weight (KG)</th>
                <th className="py-3.5 px-4 text-right">Account Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkers.map(w => {
                const isOwner = w.role === 'admin';

                return (
                  <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Worker Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isOwner ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-brand-700'
                        }`}>
                          {w.full_name ? w.full_name.substring(0, 2).toUpperCase() : 'W'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{w.full_name}</span>
                            {isOwner && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800">
                                Owner
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 capitalize">
                            Role: {w.role} • Joined {formatDate(w.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email / Username */}
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{w.email || `${w.full_name.toLowerCase().replace(/\s+/g, '')}@shanpoultry.com`}</span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{w.phone || '—'}</span>
                      </div>
                    </td>

                    {/* Status Pill & Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      {isOwner ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          Permanent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(w)}
                          title={`Click to ${w.is_active ? 'Deactivate' : 'Activate'}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                            w.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{w.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      )}
                    </td>

                    {/* Slips Count */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {w.total_collections || 0}
                    </td>

                    {/* Net Weight */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-brand-700">
                      {formatWeight(w.total_kg_collected || 0, '')}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenActivity(w)}
                          title="View collections by this worker"
                          className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-blue-50 rounded-lg transition"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(w)}
                          title="Edit worker information"
                          className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isOwner && (
                          <>
                            <button
                              onClick={() => handleOpenResetPassword(w)}
                              title="Reset Mobile App password"
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWorker(w)}
                              title="Delete worker account"
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredWorkers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No worker accounts found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 1. Modal: Add New Worker                                            */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Field Worker"
        subtitle="Create login credentials for a mobile field collector"
        maxWidth="md"
      >
        <form onSubmit={handleAddWorker} className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Muhammad Rashid"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number (Contact / WhatsApp) *
            </label>
            <input
              type="text"
              required
              placeholder="+92 300 1234567"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Worker Login Email / Username *
            </label>
            <input
              type="email"
              required
              placeholder="rashid@shanpoultry.com"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              This email will be used by the worker to sign in to the Worker Mobile App.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Assign Initial Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-500">Must be at least 6 characters</span>
              <button
                type="button"
                onClick={() => setFormPassword(`Worker@${Math.floor(1000 + Math.random() * 9000)}`)}
                className="text-[10px] text-brand-600 hover:underline font-semibold"
              >
                Auto-generate
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-slate-700 space-y-1">
            <span className="font-bold text-brand-800 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Security & Role Assignment
            </span>
            <p>
              The account is assigned the <strong>Worker</strong> role with restricted mobile-only permissions. Passwords are encrypted with blowfish via Supabase Auth and never stored in plain text.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Worker Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Modal: Edit Worker Details                                       */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Worker Information"
        subtitle={`Updating profile for ${selectedWorker?.full_name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {actionError}
            </div>
          )}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {actionSuccess}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Changes</span>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* 3. Modal: Reset Worker Password                                     */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        title="Reset Worker Password"
        subtitle={`Set a new mobile app login password for ${selectedWorker?.full_name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveResetPassword} className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {actionError}
            </div>
          )}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {actionSuccess}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Enter at least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-500">Provide this new password to the worker</span>
              <button
                type="button"
                onClick={() => setNewPassword(`Worker@${Math.floor(1000 + Math.random() * 9000)}`)}
                className="text-[10px] text-brand-600 hover:underline font-semibold"
              >
                Auto-generate
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResetPasswordOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || newPassword.length < 6}
              className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* 4. Modal: Worker Collections Activity                               */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        title={`Collections by ${selectedWorker?.full_name}`}
        subtitle={`Historical records submitted from the field`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Total Slips Submitted</p>
              <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                {workerSpecificCollections.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Weight Collected</p>
              <p className="text-xl font-extrabold text-brand-700 font-mono mt-0.5">
                {formatWeight(workerSpecificCollections.reduce((a, c) => a + c.total_net_weight, 0))}
              </p>
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Slip #</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Gross (KG)</th>
                  <th className="py-2.5 px-3 text-right">Net (KG)</th>
                  <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                  <th className="py-2.5 px-3 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workerSpecificCollections.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-700">{c.receipt_no}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDate(c.collection_date)} {formatTime(c.collection_time)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{c.customer?.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{c.gross_weight}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{c.total_net_weight}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                      {formatCurrency(c.total_amount, '')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedSlip(c)}
                        className="p-1 text-slate-500 hover:text-brand-700 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {workerSpecificCollections.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No collections submitted by this worker yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Slip Details Modal */}
      <CollectionDetailModal
        collection={selectedSlip}
        isOpen={!!selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />
    </div>
  );
};
