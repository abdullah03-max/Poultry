// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Payment Wasooli Modal
// Record Customer Payment & Auto-Reduce Outstanding Balance
// Includes WhatsApp Confirmation sending option without auto-redirect
// =============================================================================

import React, { useState, useEffect } from 'react';
import { ChickenCustomer, ChickenPayment } from './types';
import { chickenShopApi } from './api';
import { X, CheckCircle2, Loader2, Wallet, Banknote, User, MessageCircle, Share2, Check } from 'lucide-react';

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

  // Success state holding recorded payment for optional WhatsApp sending
  const [recordedPayment, setRecordedPayment] = useState<{
    payment: ChickenPayment;
    customer: ChickenCustomer;
  } | null>(null);

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
      setRecordedPayment(null);
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
      const payment = await chickenShopApi.recordPayment({
        customer_id: selectedCustomerId,
        amount: payAmt,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes || undefined,
      });

      if (currentCust) {
        // Show success screen with WhatsApp option (NO auto-redirect!)
        setRecordedPayment({
          payment,
          customer: {
            ...currentCust,
            current_balance: payment.new_balance,
          },
        });
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      alert(`رقم وصولی محفوظ کرنے میں مسئلہ: ${err.message || 'Error saving payment'}`);
    } finally {
      setSaving(false);
    }
  };

  // Helper to format Pakistan phone number for WhatsApp
  const cleanWhatsAppNumber = (phone?: string | null): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.substring(1);
    } else if (!cleaned.startsWith('92') && cleaned.length === 10) {
      cleaned = '92' + cleaned;
    }
    return cleaned;
  };

  // WhatsApp confirmation text generator
  const handleSendWhatsApp = () => {
    if (!recordedPayment) return;
    const { payment, customer } = recordedPayment;
    const phone = cleanWhatsAppNumber(customer.phone);

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const msg = `*شان چکن شاپ - رقم وصولی رسید*\n` +
      `محترم جناب *${customer.name}* صاحب!\n` +
      `آپ کی طرف سے رقم کی وصولی کامیابی سے درج کر لی گئی ہے۔ تفصیل درج ذیل ہے:\n\n` +
      `💵 *وصول شدہ رقم:* Rs. ${payment.amount.toLocaleString()}\n` +
      `📅 *تاریخ و وقت:* ${payment.payment_date} (${timeFormatted})\n` +
      `📊 *سابقہ بقایا:* Rs. ${payment.previous_balance.toLocaleString()}\n` +
      `💰 *باقی واجب الادا کھاتہ:* Rs. ${payment.new_balance.toLocaleString()}\n` +
      `💳 *طریقہ ادائیگی:* ${payment.payment_method === 'cash' ? 'نقد کیش (Cash)' : payment.payment_method}\n` +
      `🧾 *رسید / واؤچر نمبر:* ${payment.voucher_no}\n` +
      (payment.notes ? `📝 *تفصیل:* ${payment.notes}\n` : '') +
      `\nشکریہ! *شان چکن شاپ*\nپروپرائیٹر: حاجی شان`;

    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
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
            onClick={recordedPayment ? handleFinish : onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen with WhatsApp Confirmation */}
        {recordedPayment ? (
          <div className="p-5 space-y-4 text-center animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900 font-urdu">
                رقم وصولی کامیابی سے درج ہو گئی!
              </h4>
              <p className="text-xs text-slate-500 font-urdu mt-0.5">
                کھاتہ میں وصولی جمع اور بقایا رقم اپ ڈیٹ کر دی گئی ہے۔
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2 text-right font-urdu">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">گاہک کا نام:</span>
                <span className="font-bold text-slate-900">{recordedPayment.customer.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">موبائل فون:</span>
                <span className="font-mono font-bold text-slate-700">{recordedPayment.customer.phone || '—'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-700 font-bold">وصول شدہ رقم:</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  Rs. {recordedPayment.payment.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">سابقہ بقایا:</span>
                <span className="font-mono font-bold text-slate-700">
                  Rs. {recordedPayment.payment.previous_balance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-900 font-black">باقی واجب الادا کھاتہ:</span>
                <span className="font-mono font-black text-rose-700 text-sm">
                  Rs. {recordedPayment.payment.new_balance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>واؤچر نمبر:</span>
                <span className="font-mono">{recordedPayment.payment.voucher_no}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 font-urdu"
              >
                <MessageCircle className="w-4 h-4" />
                <span>واٹس ایپ پر تصدیقی رسید بھیجیں (Send WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition font-urdu"
              >
                مکمل / بند کریں (Done)
              </button>
            </div>
          </div>
        ) : (
          /* Payment Entry Form */
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
        )}
      </div>
    </div>
  );
};
