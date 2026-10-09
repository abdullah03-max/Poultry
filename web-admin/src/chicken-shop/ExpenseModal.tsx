// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Shop Expense Modal
// Record daily/monthly operational expenses for accurate Net Profit & Loss
// =============================================================================

import React, { useState, useEffect } from 'react';
import { chickenShopApi } from './api';
import { X, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { id: 'ice_cutting', label: 'برف و کٹنگ اوزار (Ice & Cutting)' },
  { id: 'packaging', label: 'شاپر و پیکنگ میٹریل (Packaging & Bags)' },
  { id: 'wages', label: 'مزدور دیہاڑی / تنخواہ (Worker Wages)' },
  { id: 'electricity', label: 'بجلی کا بل (Electricity Bill)' },
  { id: 'rent', label: 'دکان کرایہ (Shop Rent)' },
  { id: 'transport', label: 'ٹرانسپورٹ و پیٹرول (Transport & Fuel)' },
  { id: 'maintenance', label: 'مرمت و صفائی سامان (Maintenance & Cleaning)' },
  { id: 'other', label: 'دیگر متفرق اخراجات (Miscellaneous Expenses)' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [category, setCategory] = useState<string>('ice_cutting');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'online'>('cash');
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCategory('ice_cutting');
      setTitle('');
      setAmount('');
      setPaymentMethod('cash');
      setDateStr(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = Number(amount);
    if (!amtNum || amtNum <= 0) {
      alert('براہ کرم درست رقم درج کریں');
      return;
    }
    if (!title.trim()) {
      alert('براہ کرم خرچے کی تفصیل درج کریں');
      return;
    }

    const catObj = EXPENSE_CATEGORIES.find(c => c.id === category);

    try {
      setSaving(true);
      await chickenShopApi.saveExpense({
        date: dateStr,
        category,
        category_urdu: catObj ? catObj.label.split('(')[0].trim() : category,
        title: title.trim(),
        amount: amtNum,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`خرچہ محفوظ کرنے میں مسئلہ: ${err.message || 'Error saving expense'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold font-urdu">نیا دکان خرچہ اندراج (Add Shop Expense)</h3>
              <p className="text-xs text-rose-100 font-urdu mt-0.5">صاف نفع و نقصان کے درست حساب کے لیے</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
              خرچے کی قسم (Category) *
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-600"
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
              خرچے کی تفصیل / عنوان (Title) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: برف کے 2 بلاکس، شاپر بنڈل، روزانہ کٹنگ اجرت"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                خرچ رقم (Amount in PKR) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2.5 text-sm font-mono font-bold text-rose-700 focus:outline-none focus:border-rose-600"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  PKR
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                تاریخ خرچ (Date) *
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-rose-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
              ادائیگی کا ذریعہ (Payment Method)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'نقد (Cash)' },
                { id: 'online', label: 'آن لائن (Online)' },
                { id: 'bank', label: 'بینک (Bank)' },
              ].map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    paymentMethod === m.id
                      ? 'bg-rose-50 border-rose-600 text-rose-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
              اضافی تفصیل / نوٹس (Notes)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اختیاری نوٹس..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              منسوخ کریں
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition active:scale-95 disabled:opacity-50 font-urdu"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>محفوظ ہو رہا ہے...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>خرچہ محفوظ کریں</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
