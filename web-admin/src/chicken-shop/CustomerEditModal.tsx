// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Customer Add / Edit Modal
// Add Customer to Digital Khata (Name, Phone, Address, Shop, Opening Balance)
// =============================================================================

import React, { useState, useEffect } from 'react';
import { ChickenCustomer } from './types';
import { chickenShopApi } from './api';
import { X, CheckCircle2, Loader2, UserPlus, UserCheck } from 'lucide-react';

interface CustomerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: ChickenCustomer | null;
}

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customer,
}) => {
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setName(customer.name);
        setPhone(customer.phone || '');
        setShopName(customer.shop_name || '');
        setAddress(customer.address || '');
        setOpeningBalance(String(customer.opening_balance || 0));
        setNotes(customer.notes || '');
      } else {
        setName('');
        setPhone('');
        setShopName('');
        setAddress('');
        setOpeningBalance('0');
        setNotes('');
      }
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('گاہک کا نام درج کرنا لازمی ہے');
      return;
    }

    try {
      setSaving(true);
      if (customer) {
        await chickenShopApi.updateCustomer(customer.id, {
          name: name.trim(),
          phone: phone.trim(),
          shop_name: shopName.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await chickenShopApi.createCustomer({
          name: name.trim(),
          phone: phone.trim(),
          shop_name: shopName.trim() || null,
          address: address.trim() || null,
          opening_balance: Number(openingBalance) || 0,
          notes: notes.trim() || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`گاہک محفوظ کرنے میں مسئلہ: ${err.message || 'Error saving customer'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              {customer ? <UserCheck className="w-4 h-4 text-white" /> : <UserPlus className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {customer ? 'گاہک تفصیلات میں تبدیلی (Edit Customer)' : 'نیا گاہک / کھاتہ دار (Add Customer)'}
              </h3>
              <p className="text-xs text-amber-100 font-urdu">ڈیجیٹل کھاتہ بک ریکارڈ</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              گاہک کا نام (Customer Name) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: حاجی ارشد صاحب"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              فون نمبر (Phone Number) *
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="مثال: 0300-1234567"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              دکان / ہوٹل کا نام (Shop / Business Name)
            </label>
            <input
              type="text"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="مثال: الحرمین بروسٹ اینڈ تکہ"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              پتہ / علاقہ (Address or Location)
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="مثال: لاری اڈا، ساہیوال"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          {!customer && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                افتتاحی بقایا رقم (Opening Balance in PKR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">اگر گاہک پر پہلے سے ادھار ہے تو درج کریں، ورنہ 0 رکھیں</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اضافی نوٹس (Notes)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: ہر پیر کو ادائیگی"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{customer ? 'تبدیلیاں محفوظ کریں' : 'گاہک کھاتہ کھولیں'}</span>
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
