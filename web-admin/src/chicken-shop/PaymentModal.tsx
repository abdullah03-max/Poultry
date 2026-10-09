// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Payment Wasooli Modal
// Record Customer Payment & Auto-Reduce Outstanding Balance
// =============================================================================

import React, { useState, useEffect } from 'react';
import { ChickenCustomer } from './types';
import { chickenShopApi } from './api';
import { X, CheckCircle2, Loader2, Wallet, Banknote, User } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomer?: ChickenCustomer | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomer,
}) => {
  const [customers, setCustomers] = useState<ChickenCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'online' | 'cheque'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      chickenShopApi.getCustomers().then(list => {
        setCustomers(list);
        if (initialCustomer) {
          setSelectedCustomerId(initialCustomer.id);
        } else if (list.length > 0) {
          setSelectedCustomerId(list[0].id);
        }
      });
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, initialCustomer]);

  if (!isOpen) return null;

  const currentCust = customers.find(c => c.id === selectedCustomerId) || initialCustomer;
  const currentBal = currentCust ? currentCust.current_balance : 0;
  const payAmt = Number(amount) || 0;
  const newBal = Math.max(0, currentBal - payAmt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('براہ کرم گاہک منتخب کریں (Please select a customer)');
      return;
    }
    if (payAmt <= 0) {
      alert('براہ کرم درست رقم درج کریں (Please enter a valid amount)');
      return;
    }

    try {
      setSaving(true);
      await chickenShopApi.recordPayment({
        customer_id: selectedCustomerId,
        amount: payAmt,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`رقم وصولی محفوظ کرنے میں مسئلہ: ${err.message || 'Error saving payment'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">رقم وصولی اندراج (Receive Payment)</h3>
              <p className="text-xs text-emerald-100 font-urdu">گاہک کے کھاتہ میں وصولی جمع کریں</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              گاہک منتخب کریں (Select Customer) *
            </label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              required
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.shop_name ? `(${c.shop_name})` : ''} — بقایا: Rs. {c.current_balance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Balance Preview Card */}
          {currentCust && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 font-medium">سابقہ بقایا:</span>
                <p className="font-mono font-bold text-rose-700 text-sm">
                  Rs. {currentBal.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-500 font-medium">وصولی کے بعد نیا بقایا:</span>
                <p className="font-mono font-black text-emerald-700 text-sm">
                  Rs. {newBal.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              وصول شدہ رقم (Received Amount in PKR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rs.
              </span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="مثال: 5000"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Quick Amount Suggestion Pills */}
          {currentBal > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAmount(String(currentBal))}
                className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
              >
                مکمل بقایا (Rs. {currentBal.toLocaleString()})
              </button>
              {currentBal > 2000 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(currentBal / 2)))}
                  className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition"
                >
                  نصف (50%)
                </button>
              )}
            </div>
          )}

          {/* Date & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ (Date)</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طریقہ ادائیگی</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
              >
                <option value="cash">نقد کیش (Cash)</option>
                <option value="online">آن لائن / JazzCash</option>
                <option value="bank">بینک اکاؤنٹ (Bank)</option>
                <option value="cheque">چیک (Cheque)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوٹس / تفصیل (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: دکان پر نقد ادائیگی وصول کی"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Submit buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>وصولی محفوظ کریں (Save Payment)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-xl transition"
            >
              منسوخ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
