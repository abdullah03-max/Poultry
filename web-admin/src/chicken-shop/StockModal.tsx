// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Stock Inventory Management Modal
// Record Stock Additions (Purchases) and Waste / Loss Adjustments
// =============================================================================

import React, { useState, useEffect } from 'react';
import { ChickenProduct } from './types';
import { chickenShopApi } from './api';
import { X, CheckCircle2, Loader2, PackagePlus, AlertTriangle } from 'lucide-react';

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: ChickenProduct | null;
}

export const StockModal: React.FC<StockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProduct,
}) => {
  const [products, setProducts] = useState<ChickenProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [actionType, setActionType] = useState<'purchase' | 'waste_loss' | 'adjustment'>('purchase');
  const [weightKg, setWeightKg] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      chickenShopApi.getProducts().then(list => {
        setProducts(list);
        if (initialProduct) {
          setSelectedProductId(initialProduct.id);
        } else if (list.length > 0) {
          setSelectedProductId(list[0].id);
        }
      });
      setWeightKg('');
      setNotes('');
    }
  }, [isOpen, initialProduct]);

  if (!isOpen) return null;

  const currentProd = products.find(p => p.id === selectedProductId) || initialProduct;
  const currentStock = currentProd ? currentProd.stock_kg : 0;
  const inputKg = Number(weightKg) || 0;
  const stockChange = actionType === 'purchase' ? inputKg : -inputKg;
  const newStock = Math.max(0, currentStock + stockChange);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('براہ کرم پروڈکٹ منتخب کریں');
      return;
    }
    if (inputKg <= 0) {
      alert('براہ کرم درست وزن درج کریں');
      return;
    }

    try {
      setSaving(true);
      await chickenShopApi.updateProductStock(
        selectedProductId,
        stockChange,
        actionType,
        notes || (actionType === 'purchase' ? 'Stock addition from farm/supplier' : 'Cutting loss / waste adjustment')
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`اسٹاک محفوظ کرنے میں مسئلہ: ${err.message || 'Error updating stock'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-4 text-white flex items-center justify-between ${actionType === 'purchase' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-rose-600 to-rose-700'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <PackagePlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {actionType === 'purchase' ? 'نیا اسٹاک اندراج (Add Stock)' : 'اسٹاک کمی / ویسٹ کٹوتی (Loss Adjustment)'}
              </h3>
              <p className="text-xs text-blue-100 font-urdu">
                {actionType === 'purchase' ? 'سپلائر / فارم سے آنے والا چکن اسٹاک' : 'کٹنگ لوس یا ویسٹ کٹوتی'}
              </p>
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
          {/* Action Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActionType('purchase')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                actionType === 'purchase'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ➕ نیا اسٹاک آمد (Arrival)
            </button>
            <button
              type="button"
              onClick={() => setActionType('waste_loss')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                actionType === 'waste_loss'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ➖ کمی / کٹنگ لوس (Loss)
            </button>
          </div>

          {/* Product Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              چکن آئٹم / کٹ منتخب کریں *
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              required
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.urdu_name}) — موجودہ اسٹاک: {p.stock_kg} KG
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Preview */}
          {currentProd && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 font-medium">موجودہ اسٹاک:</span>
                <p className="font-mono font-bold text-slate-800 text-sm">
                  {currentStock} KG
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-500 font-medium">اندراج کے بعد متوقع اسٹاک:</span>
                <p className="font-mono font-black text-blue-700 text-sm">
                  {newStock.toFixed(2)} KG
                </p>
              </div>
            </div>
          )}

          {/* Weight KG */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              وزن کلوگرام (Weight in KG) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="0.05"
                required
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                placeholder="مثال: 50.5"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                KG
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تفصیل / سپلائر بل نمبر</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: فارم سے نئی گاڑی کی آمد"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-xl shadow-sm text-white transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 ${
                actionType === 'purchase'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>اسٹاک اپ ڈیٹ کریں</span>
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
