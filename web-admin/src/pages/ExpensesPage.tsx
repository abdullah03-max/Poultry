// =============================================================================
// SHAN POULTRY PROTEIN - Operating Expenses & Cash Outflows Management
// Comprehensive expense tracking for fuel, salaries, maintenance, labor, and transport
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Expense, ExpenseCategory } from '../types/database';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  DollarSign,
  Fuel,
  Users,
  Wrench,
  Truck,
  Coffee,
  Zap,
  MoreHorizontal,
  Calendar,
  Loader2
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; icon: any; color: string }[] = [
  { id: 'worker', label: 'ورکر تنخواہ / ایڈوانس (Worker Salary / Advance)', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'fuel', label: 'گاڑی کا ڈیزل / فیول (Vehicle Fuel / Diesel)', icon: Fuel, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'transportation', label: 'کرایہ گاڑی / ٹرانسپورٹ (Transport & Freight)', icon: Truck, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'loading', label: 'لوڈنگ / ان لوڈنگ مزدوری (Loading & Unloading)', icon: Users, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'maintenance', label: 'گاڑی مرمت و مینٹیننس (Vehicle Repair & Maint)', icon: Wrench, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'food', label: 'کھانا پینا و چائے (Food & Refreshment)', icon: Coffee, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'other', label: 'دیگر متفرق اخراجات (Miscellaneous / Other)', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // KPIs
  const totalAmount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const fuelTotal = expenses.filter(e => e.category === 'fuel').reduce((acc, e) => acc + (e.amount || 0), 0);
  const salaryTotal = expenses.filter(e => e.category === 'worker').reduce((acc, e) => acc + (e.amount || 0), 0);
  const transportTotal = expenses.filter(e => e.category === 'transportation' || e.category === 'loading').reduce((acc, e) => acc + (e.amount || 0), 0);

  // Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense?.amount || editingExpense.amount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<Expense> = {
        ...editingExpense,
        expense_date: editingExpense.expense_date || new Date().toISOString().split('T')[0],
        category: (editingExpense.category as ExpenseCategory) || 'other',
        amount: parseFloat(String(editingExpense.amount)),
        payment_method: (editingExpense.payment_method as any) || 'cash',
        person_name: editingExpense.person_name || null,
        description: editingExpense.description || '',
        notes: editingExpense.notes || null,
      };

      if (editingExpense.id) {
        await api.updateExpense(editingExpense.id, payload);
      } else {
        await api.createExpense({
          expense_code: `EXP-${Date.now().toString().slice(-4)}`,
          expense_date: payload.expense_date!,
          category: payload.category!,
          amount: payload.amount!,
          payment_method: (payload.payment_method as any) || 'cash',
          person_name: payload.person_name || null,
          description: payload.description || '',
          notes: payload.notes || null,
        });
      }

      setModalOpen(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (err: any) {
      alert('Error saving expense: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (exp: Expense) => {
    if (!confirm(`Are you sure you want to delete this expense of ${formatCurrency(exp.amount)}?`)) return;
    try {
      await api.deleteExpense(exp.id);
      fetchExpenses();
    } catch (err: any) {
      alert('Error deleting expense: ' + (err.message || 'Error'));
    }
  };

  // Filtered List
  const filteredExpenses = expenses.filter(e => {
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    const q = search.toLowerCase();
    const matchSearch =
      (e.person_name && e.person_name.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.notes && e.notes.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Operating Expenses & Cash Outflows (اخراجات و کیش منیجمنٹ)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record day-to-day poultry procurement expenses: driver salaries, diesel fuel, vehicle maintenance, and freight.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingExpense({
              expense_date: new Date().toISOString().split('T')[0],
              category: 'fuel',
              amount: 0,
              payment_method: 'cash',
              person_name: '',
              description: '',
              notes: '',
            });
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>نیا خرچہ درج کریں (Record Expense)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">کل اخراجات (Total)</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-700 font-mono">{formatCurrency(totalAmount)}</p>
          <p className="text-[10px] text-slate-400 mt-1">تمام آپریشنل اخراجات</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">گاڑی ڈیزل / فیول</span>
            <Fuel className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700 font-mono">{formatCurrency(fuelTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-1">گاڑیوں کا ڈیزل و پیٹرول</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">ورکر تنخواہ و ایڈوانس</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-700 font-mono">{formatCurrency(salaryTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-1">ملازمین و کلیکٹرز ادائیگی</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">کرایہ و مزدوری</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-purple-700 font-mono">{formatCurrency(transportTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-1">ٹرانسپورٹ و لودنگ اخراجات</p>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, paid to..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-rose-600 focus:bg-white"
          >
            <option value="all">تمام کیٹیگریز (All Categories)</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500">
          کل ریکارڈز: <strong className="text-slate-800 font-mono">{filteredExpenses.length}</strong>
        </span>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">تاریخ</th>
                <th className="py-3 px-3">کیٹیگری (Category)</th>
                <th className="py-3 px-4">تفصیل (Description)</th>
                <th className="py-3 px-3">جسے ادا کی گئی (Paid To)</th>
                <th className="py-3 px-3">ادائیگی طریقہ</th>
                <th className="py-3 px-4 text-right">رقم (Amount)</th>
                <th className="py-3 px-3 text-center">ایکشن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map(exp => {
                const catDef = EXPENSE_CATEGORIES.find(c => c.id === exp.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
                const IconComponent = catDef.icon;

                return (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-slate-600">{formatDate(exp.expense_date)}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${catDef.color}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{catDef.label.split('(')[0].trim()}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                      {exp.description || '—'}
                      {exp.notes && <span className="text-[10px] text-slate-400 font-mono block">Ref: {exp.notes}</span>}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{exp.person_name || '—'}</td>
                    <td className="py-3 px-3 text-slate-600 uppercase font-mono text-[11px]">{exp.payment_method || 'cash'}</td>
                    <td className="py-3 px-4 text-right font-black font-mono text-rose-700 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpense(exp);
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="ایڈٹ کریں"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    کوئی خرچہ ریکارڈ نہیں ملا۔ اوپر "نیا خرچہ درج کریں" پر کلک کریں۔
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense?.id ? 'Edit Expense' : 'نیا خرچہ درج کریں (Record Expense)'}
        subtitle="Manage daily operational expenses, fuel, transport, and worker advances"
        maxWidth="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Date (تاریخ) *
              </label>
              <input
                type="date"
                required
                value={editingExpense?.expense_date || ''}
                onChange={e => setEditingExpense(prev => ({ ...(prev || {}), expense_date: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-rose-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-700 uppercase mb-1">
                Amount PKR (رقم) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="e.g. 5000"
                value={editingExpense?.amount || ''}
                onChange={e => setEditingExpense(prev => ({ ...(prev || {}), amount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-rose-50/50 border border-rose-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Expense Category (اخراجات کی قسم) *
            </label>
            <select
              required
              value={editingExpense?.category || 'fuel'}
              onChange={e => setEditingExpense(prev => ({ ...(prev || {}), category: e.target.value as any }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-600"
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Paid To (کس کو ادا کی)
              </label>
              <input
                type="text"
                placeholder="e.g. Aslam Driver / Shell Pump"
                value={editingExpense?.person_name || ''}
                onChange={e => setEditingExpense(prev => ({ ...(prev || {}), person_name: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Payment Method (طریقہ ادائیگی)
              </label>
              <select
                value={editingExpense?.payment_method || 'cash'}
                onChange={e => setEditingExpense(prev => ({ ...(prev || {}), payment_method: e.target.value as any }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-600"
              >
                <option value="cash">کیش (Cash)</option>
                <option value="online">آن لائن (Online)</option>
                <option value="bank">بینک ٹرانسفر (Bank)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Description / Detail (تفصیل / وجہ)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. گاڑی کا ڈیزل 30 لیٹر بوریوالہ روڈ"
              value={editingExpense?.description || ''}
              onChange={e => setEditingExpense(prev => ({ ...(prev || {}), description: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Ref No / Notes (ریفرنس / اضافی نوٹس)
            </label>
            <input
              type="text"
              placeholder="e.g. Slip #1234"
              value={editingExpense?.notes || ''}
              onChange={e => setEditingExpense(prev => ({ ...(prev || {}), notes: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
