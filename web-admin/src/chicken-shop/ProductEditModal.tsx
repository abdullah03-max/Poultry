// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Product Add / Edit Modal
// Configure Chicken Cuts, Selling Rates, and Initial Stock
// =============================================================================

import React, { useState, useEffect } from 'react';
import { ChickenProduct } from './types';
import { chickenShopApi } from './api';
import { X, CheckCircle2, Loader2, Package, Tag } from 'lucide-react';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: ChickenProduct | null;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}) => {
  const [name, setName] = useState<string>('');
  const [urduName, setUrduName] = useState<string>('');
  const [category, setCategory] = useState<string>('Chicken Cuts');
  const [ratePerKg, setRatePerKg] = useState<string>('');
  const [stockKg, setStockKg] = useState<string>('0');
  const [minStockAlert, setMinStockAlert] = useState<string>('10');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name);
        setUrduName(product.urdu_name || product.name);
        setCategory(product.category || 'Chicken Cuts');
        setRatePerKg(String(product.rate_per_kg || 0));
        setStockKg(String(product.stock_kg || 0));
        setMinStockAlert(String(product.min_stock_alert || 10));
        setIsActive(product.is_active !== false);
      } else {
        setName('');
        setUrduName('');
        setCategory('Chicken Cuts');
        setRatePerKg('');
        setStockKg('0');
        setMinStockAlert('10');
        setIsActive(true);
      }
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('پروڈکٹ کا نام درج کرنا لازمی ہے');
      return;
    }
    if (Number(ratePerKg) <= 0) {
      alert('براہ کرم درست ریٹ فی کلوگرام درج کریں');
      return;
    }

    try {
      setSaving(true);
      await chickenShopApi.saveProduct({
        id: product?.id,
        name: name.trim(),
        urdu_name: urduName.trim() || name.trim(),
        category: category.trim(),
        unit: 'KG',
        rate_per_kg: Number(ratePerKg),
        stock_kg: Number(stockKg) || 0,
        min_stock_alert: Number(minStockAlert) || 5,
        is_active: isActive,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`پروڈکٹ محفوظ کرنے میں مسئلہ: ${err.message || 'Error saving product'}`);
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
              <Tag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {product ? 'چکن پروڈکٹ ریٹ میں تبدیلی (Edit Product)' : 'نئی چکن پروڈکٹ شامل کریں (Add Product)'}
              </h3>
              <p className="text-xs text-amber-100 font-urdu">ریٹ لسٹ و اسٹاک حد بندی</p>
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
              پروڈکٹ کا نام انگریزی (English Name) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: Drumsticks یا Chicken Bongs"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اردو نام (Urdu Name)
            </label>
            <input
              type="text"
              value={urduName}
              onChange={e => setUrduName(e.target.value)}
              placeholder="مثال: ڈرم اسٹکس یا چکن بونگز"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">کیٹیگری (Category)</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
            >
              <option value="Chicken Cuts">Chicken Cuts (چکن کٹس)</option>
              <option value="Boneless Cuts">Boneless Cuts (بون لیس کٹس)</option>
              <option value="Fresh Meat">Fresh Meat (تازہ گوشت)</option>
              <option value="Special Cuts">Special Cuts (اسپیشل کٹس)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                فروخت ریٹ فی کلو (Rate / KG) *
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
                  value={ratePerKg}
                  onChange={e => setRatePerKg(e.target.value)}
                  placeholder="550"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                موجودہ اسٹاک (Stock KG)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={stockKg}
                  onChange={e => setStockKg(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  KG
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              کم سے کم اسٹاک الرٹ حد (Min Stock Alert KG)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={minStockAlert}
                onChange={e => setMinStockAlert(e.target.value)}
                placeholder="10"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                KG
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">اس حد سے کم اسٹاک ہونے پر الرٹ شو ہوگا</p>
          </div>

          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_prod"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="is_active_prod" className="text-xs font-semibold text-slate-700 select-none">
              یہ پروڈکٹ فعال ہے اور سیلز میں دکھائی جائے (Active Product)
            </label>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>پروڈکٹ محفوظ کریں</span>
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
